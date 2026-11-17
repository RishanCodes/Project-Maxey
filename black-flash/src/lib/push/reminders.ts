/** Which reminders are due right now. Pure: used by the server's reminder job and by tests. */
import { dateInTz, minutesInTz, toMinutes } from "../dates";
import { isDueToday, occurrencesOn } from "../recurrence";
import type { Habit, HabitCompletion, Preferences, Task, TaskCompletion } from "../schema";

export interface DueReminder { key: string; title: string; body: string; url: string }

export function dueReminders(input: { prefs?: Preferences; habits: Habit[]; habitCompletions: HabitCompletion[]; tasks: Task[]; taskCompletions: TaskCompletion[]; now: Date; windowMin: number }): DueReminder[] {
  const tz = input.prefs?.timezone || "UTC";
  const weekStart = input.prefs?.weekStart ?? 1;
  const app = input.prefs?.appName || "BLACK FLASH";
  const today = dateInTz(input.now, tz);
  const nowMin = minutesInTz(input.now, tz);
  const inWindow = (hhmm: string) => { const m = toMinutes(hhmm); return m <= nowMin && m > nowMin - input.windowMin; };
  const out: DueReminder[] = [];
  for (const h of input.habits) {
    if (!h.reminderTime || !inWindow(h.reminderTime)) continue;
    if (!isDueToday(h, today, input.habitCompletions, weekStart)) continue;
    if (input.habitCompletions.some((c) => c.habitId === h.id && c.date === today)) continue;
    out.push({ key: `habit:${h.id}:${today}`, title: app, body: `Reminder: ${h.label}`, url: "/plan?view=habits" });
  }
  const created = (t: Task) => dateInTz(new Date(t.createdAt), tz);
  for (const o of occurrencesOn(input.tasks, input.taskCompletions, today, today, created)) {
    if (o.done || o.overdue || !o.task.dueTime || !inWindow(o.task.dueTime)) continue;
    out.push({ key: `task:${o.task.id}:${today}`, title: app, body: `Due now: ${o.task.title}`, url: "/plan" });
  }
  return out;
}
