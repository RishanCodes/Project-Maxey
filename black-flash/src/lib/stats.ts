/**
 * Derived metrics. Nothing here is stored: every number is recomputed from source records for the
 * requested date range, and each result carries its denominator so the UI can explain it.
 */
import { addDays, rangeDays, startOfWeek, type DateKey } from "./dates";
import { consistency, isDueToday, isScheduledDay, occurrencesOn, sortOccurrences, type TaskOccurrence } from "./recurrence";
import type {
  DailyCheckin, FocusSession, Goal, Habit, HabitCompletion, Milestone, Task, TaskCompletion, TrainingSession, XpEvent,
} from "./schema";

export interface Snapshot {
  tasks: Task[];
  taskCompletions: TaskCompletion[];
  habits: Habit[];
  habitCompletions: HabitCompletion[];
  goals: Goal[];
  milestones: Milestone[];
  training: TrainingSession[];
  checkins: DailyCheckin[];
  focus: FocusSession[];
  xp: XpEvent[];
}

export const createdDateOf = (timezoneToDate: (iso: string) => DateKey) => (t: Task) => timezoneToDate(t.createdAt);

/* ---------- today ---------- */
export interface TodayPlan {
  occurrences: TaskOccurrence[];
  dueHabits: Habit[];
  doneHabitIds: Set<string>;
  plannedCount: number; // tasks occurrences + due habits
  doneCount: number;
}

export function todayPlan(s: Snapshot, today: DateKey, weekStart: 0 | 1, created: (t: Task) => DateKey): TodayPlan {
  const occurrences = sortOccurrences(occurrencesOn(s.tasks, s.taskCompletions, today, today, created));
  const dueHabits = s.habits.filter((h) => isDueToday(h, today, s.habitCompletions, weekStart));
  const doneHabitIds = new Set(s.habitCompletions.filter((c) => c.date === today && c.state === "done").map((c) => c.habitId));
  const plannedCount = occurrences.length + dueHabits.length;
  const doneCount = occurrences.filter((o) => o.done).length + dueHabits.filter((h) => doneHabitIds.has(h.id)).length;
  return { occurrences, dueHabits, doneHabitIds, plannedCount, doneCount };
}

/* ---------- habits ---------- */
export function habitConsistency(s: Snapshot, from: DateKey, to: DateKey, weekStart: 0 | 1, today: DateKey) {
  let done = 0, expected = 0;
  const per = s.habits.filter((h) => h.status !== "archived").map((h) => {
    const c = consistency(h, s.habitCompletions, from, to, weekStart, today);
    done += c.done; expected += c.expected;
    return { habit: h, ...c };
  });
  return { done, expected, rate: expected ? done / expected : null, per };
}

/* ---------- tasks ---------- */
/** Planned task occurrences in range (one-off tasks by due date, repeating by schedule) vs completed. */
export function taskCompletion(s: Snapshot, from: DateKey, to: DateKey, today: DateKey, created: (t: Task) => DateKey) {
  let planned = 0, done = 0;
  for (const d of rangeDays(from, to)) {
    const occ = occurrencesOn(s.tasks, s.taskCompletions, d, "0000-00-00", created);
    planned += occ.length;
    done += occ.filter((o) => o.done).length;
  }
  return { planned, done, rate: planned ? done / planned : null, today };
}

/* ---------- training ---------- */
export function trainingInRange(s: Snapshot, from: DateKey, to: DateKey) {
  const list = s.training.filter((t) => t.status === "completed" && t.date >= from && t.date <= to);
  const minutes = list.reduce((m, t) => m + t.durationMin, 0);
  const byActivity: Record<string, number> = {};
  const byFocus: Record<string, number> = {};
  for (const t of list) {
    const k = t.activity === "custom" ? (t.customActivity || "custom") : t.activity;
    byActivity[k] = (byActivity[k] || 0) + t.durationMin;
    for (const f of t.focusAreas) byFocus[f] = (byFocus[f] || 0) + 1;
  }
  const shots = list.flatMap((t) => t.shots);
  const made = shots.reduce((a, x) => a + x.made, 0), attempted = shots.reduce((a, x) => a + x.attempted, 0);
  return { sessions: list.length, minutes, byActivity, byFocus, made, attempted, shootingPct: attempted ? made / attempted : null };
}

/**
 * Practice-load summary: minutes in the last 7 days compared with the weekly average of the 21
 * days before. A prompt to consider recovery, not a diagnosis.
 */
export function trainingLoad(s: Snapshot, today: DateKey) {
  const last7 = trainingInRange(s, addDays(today, -6), today);
  const prior = trainingInRange(s, addDays(today, -27), addDays(today, -7));
  const priorWeekly = prior.minutes / 3;
  const dense = (priorWeekly > 0 && last7.minutes >= priorWeekly * 1.5 && last7.minutes >= 240) || last7.sessions >= 9;
  return { last7Minutes: last7.minutes, last7Sessions: last7.sessions, priorWeeklyAvg: Math.round(priorWeekly), dense, priorSessions: prior.sessions };
}

/** Minutes per day (or per week for long ranges) for charting. */
export function trainingSeries(s: Snapshot, from: DateKey, to: DateKey, weekStart: 0 | 1) {
  const days = rangeDays(from, to);
  if (days.length <= 31) return days.map((d) => ({ key: d, minutes: trainingInRange(s, d, d).minutes }));
  const out: { key: DateKey; minutes: number }[] = [];
  for (let w = startOfWeek(from, weekStart); w <= to; w = addDays(w, 7)) out.push({ key: w, minutes: trainingInRange(s, w < from ? from : w, addDays(w, 6) > to ? to : addDays(w, 6)).minutes });
  return out;
}

/* ---------- daily completion series (core overview chart) ---------- */
export function completionSeries(s: Snapshot, from: DateKey, to: DateKey, weekStart: 0 | 1, created: (t: Task) => DateKey) {
  return rangeDays(from, to).map((d) => {
    const occ = occurrencesOn(s.tasks, s.taskCompletions, d, "0000-00-00", created);
    const habits = s.habits.filter((h) => h.status !== "archived" && h.schedule.type !== "perWeek" && isScheduledDay(h, d));
    const hd = habits.filter((h) => s.habitCompletions.some((c) => c.habitId === h.id && c.date === d && c.state === "done")).length;
    const flexDone = s.habitCompletions.filter((c) => c.date === d && c.state === "done" && s.habits.find((h) => h.id === c.habitId)?.schedule.type === "perWeek").length;
    return { key: d, planned: occ.length + habits.length + flexDone, done: occ.filter((o) => o.done).length + hd + flexDone, weekStart };
  });
}

/* ---------- goals ---------- */
export function goalProgress(goal: Goal, milestones: Milestone[]): { pct: number | null; source: "manual" | "milestones" | "none"; done: number; total: number } {
  const ms = milestones.filter((m) => m.goalId === goal.id);
  const done = ms.filter((m) => m.doneAt).length;
  if (goal.manualProgress !== null) return { pct: goal.manualProgress, source: "manual", done, total: ms.length };
  if (!ms.length) return { pct: null, source: "none", done, total: 0 };
  return { pct: Math.round((done / ms.length) * 100), source: "milestones", done, total: ms.length };
}

/* ---------- focus ---------- */
export function focusInRange(s: Snapshot, from: DateKey, to: DateKey) {
  const list = s.focus.filter((f) => f.date >= from && f.date <= to);
  return { sessions: list.length, minutes: Math.round(list.reduce((m, f) => m + f.actualMin, 0)) };
}

/* ---------- wellness ---------- */
export function wellnessSeries(s: Snapshot, from: DateKey, to: DateKey) {
  const rows = s.checkins.filter((c) => c.date >= from && c.date <= to).sort((a, b) => a.date.localeCompare(b.date));
  const avg = (k: "energy" | "mood" | "sleepHours" | "soreness") => {
    const v = rows.map((r) => r[k]).filter((x): x is number => typeof x === "number");
    return v.length ? { avg: v.reduce((a, b) => a + b, 0) / v.length, n: v.length } : { avg: null, n: 0 };
  };
  return { rows, energy: avg("energy"), mood: avg("mood"), sleep: avg("sleepHours"), soreness: avg("soreness"), restDays: rows.filter((r) => r.restDay).length };
}

/* ---------- XP categories ---------- */
export function xpByCategory(events: XpEvent[]) {
  const cat = { Training: 0, Consistency: 0, Focus: 0, Recovery: 0, Goals: 0 };
  for (const e of events) {
    if (e.sourceType === "training") cat.Training += e.amount;
    else if (e.sourceType === "task" || e.sourceType === "habit") cat.Consistency += e.amount;
    else if (e.sourceType === "focus") cat.Focus += e.amount;
    else if (e.sourceType === "checkin") cat.Recovery += e.amount;
    else cat.Goals += e.amount;
  }
  return cat;
}

export function pct(x: number | null | undefined): string {
  return x === null || x === undefined ? "—" : `${Math.round(x * 100)}%`;
}
