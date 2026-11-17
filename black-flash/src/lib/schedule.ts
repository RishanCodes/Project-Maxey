/**
 * Suggests times for open, unscheduled one-off tasks on a day, around fixed commitments.
 * Pure and deterministic. Nothing is changed until the user approves the proposals.
 */
import { fromMinutes, toMinutes, weekday, type DateKey } from "./dates";
import type { Task, TrainingSession } from "./schema";
import type { TaskOccurrence } from "./recurrence";

export interface Busy { start: number; end: number; label: string }
export interface Proposal { taskId: string; title: string; date: DateKey; time: string; durationMin: number; moved: boolean; reason: string }
export interface ScheduleInput {
  date: DateKey;
  today: DateKey;
  nowMin: number;
  occurrences: TaskOccurrence[]; // tasks shown on that day (incl. overdue when the day is today)
  training: TrainingSession[];
  answers: Record<string, unknown>; // onboarding answers: dayStart, dayEnd, practiceDays, practiceTime, protectTime
  dayStartMin?: number; // planning window
  dayEndMin?: number;
}

const BUFFER = 10, DEFAULT_TASK_MIN = 30;
const str = (v: unknown) => (typeof v === "string" && /^\d{2}:\d{2}$/.test(v) ? v : undefined);

export function busyBlocks(input: ScheduleInput): Busy[] {
  const out: Busy[] = [];
  const wd = weekday(input.date);
  const school = { s: str(input.answers.dayStart), e: str(input.answers.dayEnd) };
  if (school.s && school.e && wd >= 1 && wd <= 5) out.push({ start: toMinutes(school.s), end: toMinutes(school.e), label: "School / work" });
  const sessions = input.training.filter((t) => t.date === input.date && t.startTime);
  for (const t of sessions) out.push({ start: toMinutes(t.startTime!), end: toMinutes(t.startTime!) + t.durationMin, label: "Training" });
  const practiceDays = Array.isArray(input.answers.practiceDays) ? (input.answers.practiceDays as number[]) : [];
  const practiceTime = str(input.answers.practiceTime);
  if (!sessions.length && practiceTime && practiceDays.includes(wd)) out.push({ start: toMinutes(practiceTime), end: toMinutes(practiceTime) + 90, label: "Practice" });
  for (const o of input.occurrences) {
    if (o.done || !o.task.dueTime) continue;
    const s = toMinutes(o.task.dueTime);
    out.push({ start: s, end: s + (o.task.durationMin ?? DEFAULT_TASK_MIN), label: o.task.title });
  }
  return out.sort((a, b) => a.start - b.start);
}

export function freeSlots(busy: Busy[], from: number, to: number): Array<{ start: number; end: number }> {
  const slots: Array<{ start: number; end: number }> = [];
  let cur = from;
  for (const b of busy) {
    const s = b.start - BUFFER, e = b.end + BUFFER;
    if (e <= cur) continue;
    if (s > cur) slots.push({ start: cur, end: Math.min(s, to) });
    cur = Math.max(cur, e);
    if (cur >= to) break;
  }
  if (cur < to) slots.push({ start: cur, end: to });
  return slots.filter((x) => x.end - x.start >= 15);
}

const PRIORITY = { high: 0, medium: 1, low: 2 } as const;

export function suggestTimes(input: ScheduleInput): { proposals: Proposal[]; unplaced: Task[]; busy: Busy[] } {
  const protect = Number(typeof input.answers.protectTime === "string" ? input.answers.protectTime : 30) || 30;
  const windowStart = Math.max(input.dayStartMin ?? 7 * 60, input.date === input.today ? Math.ceil((input.nowMin + 10) / 5) * 5 : 0);
  const windowEnd = (input.dayEndMin ?? 22 * 60) - protect; // leave protected open time at the end of the day
  const busy = busyBlocks(input);
  let slots = freeSlots(busy, windowStart, windowEnd);
  const candidates = input.occurrences
    .filter((o) => !o.done && !o.task.dueTime && o.task.repeat.type === "none")
    .sort((a, b) => PRIORITY[a.task.priority] - PRIORITY[b.task.priority] || a.task.order - b.task.order);
  const proposals: Proposal[] = [], unplaced: Task[] = [];
  for (const o of candidates) {
    const len = o.task.durationMin ?? DEFAULT_TASK_MIN;
    const i = slots.findIndex((s) => s.end - s.start >= len);
    if (i < 0) { unplaced.push(o.task); continue; }
    const slot = slots[i];
    proposals.push({
      taskId: o.task.id, title: o.task.title, date: input.date, time: fromMinutes(slot.start), durationMin: len, moved: o.overdue,
      reason: `${o.overdue ? "Overdue, moved to this day. " : ""}First free ${len}-minute gap${busy.length ? " around your commitments" : ""}${o.task.durationMin ? "" : " (assumed 30 minutes)"}.`,
    });
    const rest = { start: slot.start + len + BUFFER, end: slot.end };
    slots = [...slots.slice(0, i), ...(rest.end - rest.start >= 15 ? [rest] : []), ...slots.slice(i + 1)];
  }
  return { proposals, unplaced, busy };
}
