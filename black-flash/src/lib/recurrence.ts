import { addDays, daysBetween, startOfWeek, weekday, type DateKey } from "./dates";
import type { Habit, HabitCompletion, Task, TaskCompletion } from "./schema";

/* ---------------- tasks ---------------- */

/** Start date for a repeating task: its due date, or the day it was created. */
export function taskStart(task: Task, createdDate: DateKey): DateKey {
  return task.dueDate ?? createdDate;
}

/** Does this repeating task have an occurrence on `date`? One-off tasks return false here. */
export function repeatsOn(task: Task, date: DateKey, createdDate: DateKey): boolean {
  if (task.repeat.type === "none") return false;
  if (date < taskStart(task, createdDate)) return false;
  if (task.repeat.type === "daily") return true;
  return task.repeat.days.includes(weekday(date));
}

/** Completion key for an occurrence: the date for repeating tasks, "once" for one-off tasks. */
export function occurrenceKey(task: Task, date: DateKey): DateKey | "once" {
  return task.repeat.type === "none" ? "once" : date;
}

export function isTaskDone(task: Task, date: DateKey, completions: TaskCompletion[]): boolean {
  const key = occurrenceKey(task, date);
  return completions.some((c) => c.taskId === task.id && c.date === key);
}

export interface TaskOccurrence {
  task: Task;
  date: DateKey; // the day this occurrence is shown for
  done: boolean;
  overdue: boolean;
}

/**
 * Tasks to show on a day: repeating occurrences on that day, one-off tasks due that day, and
 * (only when the day is today) open one-off tasks that are overdue. Completed one-off tasks stay
 * visible on the day they were due so completion can be undone.
 */
export function occurrencesOn(tasks: Task[], completions: TaskCompletion[], date: DateKey, today: DateKey, createdDate: (t: Task) => DateKey): TaskOccurrence[] {
  const out: TaskOccurrence[] = [];
  for (const t of tasks) {
    if (t.archived) continue;
    if (t.repeat.type !== "none") {
      if (repeatsOn(t, date, createdDate(t))) out.push({ task: t, date, done: isTaskDone(t, date, completions), overdue: false });
      continue;
    }
    const done = isTaskDone(t, date, completions);
    if (t.dueDate === date) out.push({ task: t, date, done, overdue: false });
    else if (date === today && t.dueDate && t.dueDate < today && !done) out.push({ task: t, date, done, overdue: true });
  }
  return out;
}

const PRIORITY_RANK = { high: 0, medium: 1, low: 2 } as const;
export function sortOccurrences(list: TaskOccurrence[]): TaskOccurrence[] {
  return [...list].sort((a, b) =>
    Number(a.done) - Number(b.done) ||
    Number(b.overdue) - Number(a.overdue) ||
    PRIORITY_RANK[a.task.priority] - PRIORITY_RANK[b.task.priority] ||
    (a.task.dueTime ?? "99:99").localeCompare(b.task.dueTime ?? "99:99") ||
    a.task.order - b.task.order);
}

/* ---------------- habits ---------------- */

export function isPaused(habit: Habit, date: DateKey): boolean {
  return habit.pauses.some((p) => date >= p.from && (!p.to || date <= p.to));
}

/** Is the habit expected on this specific day? perWeek habits are flexible: any day counts. */
export function isScheduledDay(habit: Habit, date: DateKey): boolean {
  if (habit.status === "archived") return false;
  if (date < habit.startDate) return false;
  if (isPaused(habit, date)) return false;
  if (habit.schedule.type === "daily") return true;
  if (habit.schedule.type === "weekdays") return habit.schedule.days.includes(weekday(date));
  return true;
}

function doneOn(habitId: string, date: DateKey, comps: HabitCompletion[]) {
  return comps.find((c) => c.habitId === habitId && c.date === date);
}

export function weekCount(habit: Habit, date: DateKey, comps: HabitCompletion[], weekStart: 0 | 1): number {
  const s = startOfWeek(date, weekStart);
  let n = 0;
  for (let i = 0; i < 7; i++) if (doneOn(habit.id, addDays(s, i), comps)?.state === "done") n++;
  return n;
}

/** Should the habit show as due today (actionable)? perWeek: until the weekly target is met, or if already done today. */
export function isDueToday(habit: Habit, date: DateKey, comps: HabitCompletion[], weekStart: 0 | 1): boolean {
  if (habit.status !== "active") return false;
  if (!isScheduledDay(habit, date)) return false;
  if (habit.schedule.type !== "perWeek") return true;
  if (doneOn(habit.id, date, comps)) return true;
  return weekCount(habit, date, comps, weekStart) < habit.schedule.count;
}

export interface Streak { value: number; unit: "day" | "week" }

/**
 * Flexible streaks.
 * - daily / weekdays: consecutive scheduled days completed. Off-schedule days, paused days and
 *   "rest" marks are neutral (they neither add nor break). Today not done yet does not break it.
 * - perWeek: consecutive weeks meeting the target. The current week counts once met and is
 *   otherwise neutral.
 */
export function streak(habit: Habit, comps: HabitCompletion[], today: DateKey, weekStart: 0 | 1): Streak {
  if (habit.schedule.type === "perWeek") {
    let n = 0;
    let wk = startOfWeek(today, weekStart);
    const target = habit.schedule.count;
    const met = (w: DateKey) => weekCount(habit, w, comps, weekStart) >= target;
    if (met(wk)) n++;
    wk = addDays(wk, -7);
    for (let i = 0; i < 260; i++) {
      if (addDays(wk, 6) < habit.startDate) break;
      const allPaused = [0, 1, 2, 3, 4, 5, 6].every((d) => isPaused(habit, addDays(wk, d)));
      if (!allPaused) { if (met(wk)) n++; else break; }
      wk = addDays(wk, -7);
    }
    return { value: n, unit: "week" };
  }
  let n = 0;
  for (let i = 0; i < 2000; i++) {
    const d = addDays(today, -i);
    if (d < habit.startDate) break;
    if (!isScheduledDay(habit, d)) continue;
    const c = doneOn(habit.id, d, comps);
    if (c?.state === "done") n++;
    else if (c?.state === "rest") continue;
    else if (d === today) continue;
    else break;
  }
  return { value: n, unit: "day" };
}

/**
 * Consistency over a date range: completions on scheduled days / scheduled days.
 * perWeek habits use weekly targets for full weeks inside the range.
 */
export function consistency(habit: Habit, comps: HabitCompletion[], from: DateKey, to: DateKey, weekStart: 0 | 1, today?: DateKey): { done: number; expected: number } {
  let done = 0, expected = 0;
  if (habit.schedule.type === "perWeek") {
    for (let w = startOfWeek(from, weekStart); w <= to; w = addDays(w, 7)) {
      const days = [0, 1, 2, 3, 4, 5, 6].map((i) => addDays(w, i)).filter((d) => d >= from && d <= to && isScheduledDay(habit, d));
      if (!days.length) continue;
      const target = Math.round(habit.schedule.count * (days.length / 7));
      if (target <= 0) continue;
      const got = days.filter((d) => doneOn(habit.id, d, comps)?.state === "done").length;
      const inProgress = today !== undefined && w <= today && addDays(w, 6) >= today;
      if (inProgress && got < target) continue; // current week is neutral until it is met
      expected += target;
      done += Math.min(got, target);
    }
    return { done, expected };
  }
  for (let d = from; d <= to; d = addDays(d, 1)) {
    if (!isScheduledDay(habit, d)) continue;
    const c = doneOn(habit.id, d, comps);
    if (c?.state === "rest") continue;
    if (d === today && !c) continue; // today is still in progress
    expected++;
    if (c?.state === "done") done++;
  }
  return { done, expected };
}

export function describeSchedule(h: Habit): string {
  const s = h.schedule;
  if (s.type === "daily") return "Every day";
  if (s.type === "perWeek") return `${s.count}× per week`;
  const names = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return s.days.slice().sort((a, b) => a - b).map((d) => names[d]).join(", ");
}

export { daysBetween };
