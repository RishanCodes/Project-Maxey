/**
 * All writes go through this module so that source records, XP events and achievements stay
 * consistent. XP is a ledger: each action has a stable key; at most one award is active per key,
 * and undoing the action appends a reversal of exactly what was awarded.
 */
import { getDb, type BlackFlashDB } from "./db";
import { XP } from "./config";
import { addDays, browserTimezone, dateInTz, startOfWeek, todayKey, type DateKey } from "./dates";
import { occurrenceKey, streak } from "./recurrence";
import {
  ActiveTimer, DailyCheckin, Goal, Habit, JournalEntry, MealEntry, Milestone, Preferences, Routine, Task, TrainingSession,
  type HabitCompletion, type XpEvent,
} from "./schema";
import { ACHIEVEMENTS } from "./achievements";

export const newId = (): string =>
  typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
export const nowIso = () => new Date().toISOString();

const db = (): BlackFlashDB => getDb();
/** Every write transaction spans all tables so nested helpers (XP, achievements) can always run inside it. */
function withTx<T>(fn: () => Promise<T>): Promise<T> {
  const d = db();
  return d.transaction("rw", d.tables, fn);
}

/* ---------------- preferences ---------------- */
export function defaultPrefs(timezone = browserTimezone()): Preferences {
  const t = nowIso();
  return {
    id: "prefs", name: "", appName: "BLACK FLASH", timezone, weekStart: 1, homeCard: "priority", gamification: "balanced",
    coachStyle: "balanced", weeklyReview: true, notifications: false,
    aiConsent: { goals: false, habits: false, tasks: false, training: false, wellness: false, journal: false },
    focusMinutes: 25, breakMinutes: 5, onboarding: { status: "not_started", index: 0 }, createdAt: t, updatedAt: t,
  };
}

export async function getPrefs(): Promise<Preferences> {
  const p = await db().prefs.get("prefs");
  if (p) return p;
  const fresh = defaultPrefs();
  await db().prefs.put(fresh);
  return fresh;
}

export async function updatePrefs(patch: Partial<Omit<Preferences, "id">>): Promise<Preferences> {
  const cur = await getPrefs();
  const next = Preferences.parse({ ...cur, ...patch, updatedAt: nowIso() });
  await db().prefs.put(next);
  return next;
}

export async function localToday(): Promise<DateKey> {
  const p = await getPrefs();
  return todayKey(p.timezone);
}

/* ---------------- XP ledger ---------------- */
type Source = XpEvent["sourceType"];

async function isAwardActive(key: string): Promise<boolean> {
  const events = await db().xp.where("key").equals(key).toArray();
  return events.filter((e) => e.kind === "award").length > events.filter((e) => e.kind === "reversal").length;
}

/** Awards XP once per key. Respects the daily cap. Returns the amount actually awarded (may be 0). */
export async function awardXp(sourceType: Source, sourceId: string, label: string, actionDate?: DateKey): Promise<number> {
  const key = `${sourceType}:${sourceId}`;
  if (await isAwardActive(key)) return 0;
  const date = actionDate ?? (await localToday());
  const dayEvents = await db().xp.where("date").equals(date).toArray();
  const usedToday = dayEvents.reduce((s, e) => s + e.amount, 0);
  const amount = Math.max(0, Math.min(XP[sourceType], XP.dailyCap - usedToday));
  await db().xp.add({ id: newId(), key, sourceType, sourceId, kind: "award", amount, date, at: nowIso(), label });
  return amount;
}

/** Reverses the active award for a key, if any. */
export async function reverseXp(sourceType: Source, sourceId: string): Promise<number> {
  const key = `${sourceType}:${sourceId}`;
  if (!(await isAwardActive(key))) return 0;
  const events = (await db().xp.where("key").equals(key).toArray()).sort((a, b) => a.at.localeCompare(b.at));
  const lastAward = [...events].reverse().find((e) => e.kind === "award")!;
  await db().xp.add({ id: newId(), key, sourceType, sourceId, kind: "reversal", amount: -lastAward.amount, date: lastAward.date, at: nowIso(), label: `Undone: ${lastAward.label}` });
  return lastAward.amount;
}

export function totalXp(events: XpEvent[]): number {
  return events.reduce((s, e) => s + e.amount, 0);
}

/* ---------------- achievements ---------------- */
export async function evaluateAchievements(): Promise<string[]> {
  const d = db();
  const prefs = await getPrefs();
  const today = todayKey(prefs.timezone);
  const [have, taskComps, training, focus, milestones, goals, journal, checkins, habits, habitComps, tasks] = await Promise.all([
    d.achievements.toArray(), d.taskCompletions.count(), d.training.where("status").equals("completed").count(), d.focus.count(),
    d.milestones.toArray(), d.goals.toArray(), d.journal.toArray(), d.checkins.toArray(), d.habits.toArray(), d.habitCompletions.toArray(), d.tasks.count(),
  ]);
  const haveIds = new Set(have.map((a) => a.id));
  const ctx = {
    tasksCreated: tasks, taskCompletions: taskComps, trainingDone: training, focusDone: focus,
    milestonesDone: milestones.filter((m) => m.doneAt).length,
    goalsDone: goals.filter((g) => {
      const ms = milestones.filter((m) => m.goalId === g.id);
      return g.status === "done" || (ms.length > 0 && ms.every((m) => m.doneAt));
    }).length,
    journalWeeks: new Set(journal.map((j) => startOfWeek(j.date, prefs.weekStart))).size,
    checkins: checkins.length,
    restDays: checkins.filter((c) => c.restDay).length,
    bestHabitStreak: Math.max(0, ...habits.map((h) => { const s = streak(h, habitComps, today, prefs.weekStart); return s.unit === "day" ? s.value : s.value * 7; })),
    planApproved: !!prefs.onboarding.approvedAt,
  };
  const unlocked: string[] = [];
  for (const a of ACHIEVEMENTS) {
    if (haveIds.has(a.id) || !a.test(ctx)) continue;
    await d.achievements.put({ id: a.id, unlockedAt: nowIso(), detail: a.description });
    unlocked.push(a.id);
  }
  return unlocked;
}

/* ---------------- tasks ---------------- */
export type TaskInput = Omit<Task, "id" | "createdAt" | "updatedAt" | "order" | "archived"> & Partial<Pick<Task, "order" | "archived">>;

export async function createTask(input: TaskInput): Promise<Task> {
  const t = nowIso();
  const max = await db().tasks.orderBy("order").last();
  const task = Task.parse({ archived: false, order: (max?.order ?? 0) + 1, ...input, id: newId(), createdAt: t, updatedAt: t });
  await db().tasks.add(task);
  await evaluateAchievements();
  return task;
}

export async function updateTask(id: string, patch: Partial<TaskInput>): Promise<Task> {
  const cur = await db().tasks.get(id);
  if (!cur) throw new Error("Task not found");
  const next = Task.parse({ ...cur, ...patch, updatedAt: nowIso() });
  await db().tasks.put(next);
  return next;
}

export async function deleteTask(id: string): Promise<void> {
  await withTx(async () => {
    const comps = await db().taskCompletions.where("taskId").equals(id).toArray();
    for (const c of comps) await reverseXp("task", `${id}:${c.date}`);
    await db().taskCompletions.where("taskId").equals(id).delete();
    await db().tasks.delete(id);
  });
}

/** Completes the occurrence of a task shown on `date`. Idempotent. */
export async function completeTask(taskId: string, date: DateKey): Promise<number> {
  return withTx(async () => {
    const task = await db().tasks.get(taskId);
    if (!task) throw new Error("Task not found");
    const occ = occurrenceKey(task, date);
    const exists = await db().taskCompletions.where("[taskId+date]").equals([taskId, occ]).first();
    if (exists) return 0;
    await db().taskCompletions.add({ id: newId(), taskId, date: occ, completedAt: nowIso() });
    const got = await awardXp("task", `${taskId}:${occ}`, `Task: ${task.title}`);
    await evaluateAchievements();
    return got;
  });
}

export async function uncompleteTask(taskId: string, date: DateKey): Promise<void> {
  await withTx(async () => {
    const task = await db().tasks.get(taskId);
    if (!task) return;
    const occ = occurrenceKey(task, date);
    await db().taskCompletions.where("[taskId+date]").equals([taskId, occ]).delete();
    await reverseXp("task", `${taskId}:${occ}`);
  });
}

export async function moveTask(id: string, direction: -1 | 1, visibleIds: string[]): Promise<void> {
  const i = visibleIds.indexOf(id), j = i + direction;
  if (i < 0 || j < 0 || j >= visibleIds.length) return;
  const [a, b] = await Promise.all([db().tasks.get(visibleIds[i]), db().tasks.get(visibleIds[j])]);
  if (!a || !b) return;
  await withTx(async () => {
    await db().tasks.update(a.id, { order: b.order, updatedAt: nowIso() });
    await db().tasks.update(b.id, { order: a.order === b.order ? a.order + direction : a.order, updatedAt: nowIso() });
  });
}

/* ---------------- habits ---------------- */
export type HabitInput = Pick<Habit, "label" | "purpose" | "category" | "schedule"> & Partial<Pick<Habit, "reminderTime" | "startDate" | "seedKey">>;

export async function createHabit(input: HabitInput): Promise<Habit> {
  const t = nowIso();
  const today = await localToday();
  const habit = Habit.parse({ status: "active", pauses: [], startDate: today, ...input, id: newId(), createdAt: t, updatedAt: t });
  await db().habits.add(habit);
  return habit;
}

export async function updateHabit(id: string, patch: Partial<HabitInput>): Promise<Habit> {
  const cur = await db().habits.get(id);
  if (!cur) throw new Error("Habit not found");
  const next = Habit.parse({ ...cur, ...patch, updatedAt: nowIso() });
  await db().habits.put(next);
  return next;
}

export async function setHabitStatus(id: string, status: Habit["status"]): Promise<void> {
  const cur = await db().habits.get(id);
  if (!cur) return;
  const today = await localToday();
  let pauses = cur.pauses;
  if (status === "paused" && cur.status !== "paused") pauses = [...pauses, { from: today }];
  if (status === "active" && cur.status === "paused") {
    pauses = pauses.map((p) => (p.to ? p : { ...p, to: addDays(today, -1) })).filter((p) => !p.to || p.to >= p.from);
  }
  await db().habits.put(Habit.parse({ ...cur, status, pauses, updatedAt: nowIso() }));
}

export async function deleteHabit(id: string): Promise<void> {
  await withTx(async () => {
    const comps = await db().habitCompletions.where("habitId").equals(id).toArray();
    for (const c of comps) await reverseXp("habit", `${id}:${c.date}`);
    await db().habitCompletions.where("habitId").equals(id).delete();
    await db().habits.delete(id);
    const goals = await db().goals.toArray();
    for (const g of goals) if (g.linkedHabitIds.includes(id)) await db().goals.update(g.id, { linkedHabitIds: g.linkedHabitIds.filter((x) => x !== id) });
  });
}

/** Marks a habit done (or a neutral rest day) on a date. Idempotent per habit and date. */
export async function markHabit(habitId: string, date: DateKey, state: HabitCompletion["state"]): Promise<number> {
  const d = db();
  return withTx(async () => {
    const habit = await d.habits.get(habitId);
    if (!habit) throw new Error("Habit not found");
    const existing = await d.habitCompletions.where("[habitId+date]").equals([habitId, date]).first();
    if (existing?.state === state) return 0;
    if (existing) { await d.habitCompletions.delete(existing.id); await reverseXp("habit", `${habitId}:${date}`); }
    await d.habitCompletions.add({ id: newId(), habitId, date, state, at: nowIso() });
    let got = 0;
    if (state === "done") got = await awardXp("habit", `${habitId}:${date}`, `Habit: ${habit.label}`);
    await evaluateAchievements();
    return got;
  });
}

export async function unmarkHabit(habitId: string, date: DateKey): Promise<void> {
  await withTx(async () => {
    await db().habitCompletions.where("[habitId+date]").equals([habitId, date]).delete();
    await reverseXp("habit", `${habitId}:${date}`);
  });
}

/* ---------------- routines ---------------- */
export async function saveRoutine(input: Omit<Routine, "createdAt" | "updatedAt" | "id"> & { id?: string }): Promise<Routine> {
  const t = nowIso();
  const cur = input.id ? await db().routines.get(input.id) : undefined;
  const r = Routine.parse({ ...input, id: cur?.id ?? newId(), createdAt: cur?.createdAt ?? t, updatedAt: t });
  await db().routines.put(r);
  return r;
}
export async function deleteRoutine(id: string) {
  await withTx(async () => {
    await db().routineCompletions.where("routineId").equals(id).delete();
    await db().routines.delete(id);
  });
}
export async function toggleRoutineStep(routineId: string, stepId: string, date: DateKey): Promise<boolean> {
  const ex = await db().routineCompletions.where("[routineId+stepId+date]").equals([routineId, stepId, date]).first();
  if (ex) { await db().routineCompletions.delete(ex.id); return false; }
  await db().routineCompletions.add({ id: newId(), routineId, stepId, date, at: nowIso() });
  return true;
}

/* ---------------- goals & milestones ---------------- */
export async function saveGoal(input: Omit<Goal, "createdAt" | "updatedAt" | "id"> & { id?: string }): Promise<Goal> {
  const t = nowIso();
  const cur = input.id ? await db().goals.get(input.id) : undefined;
  const g = Goal.parse({ ...input, id: cur?.id ?? newId(), createdAt: cur?.createdAt ?? t, updatedAt: t });
  await db().goals.put(g);
  await evaluateAchievements();
  return g;
}
export async function deleteGoal(id: string) {
  await withTx(async () => {
    const ms = await db().milestones.where("goalId").equals(id).toArray();
    for (const m of ms) await reverseXp("milestone", m.id);
    await db().milestones.where("goalId").equals(id).delete();
    await db().goals.delete(id);
    const linked = await db().tasks.where("goalId").equals(id).toArray();
    for (const t of linked) await db().tasks.update(t.id, { goalId: undefined });
  });
}
export async function addMilestone(goalId: string, title: string): Promise<Milestone> {
  const t = nowIso();
  const last = (await db().milestones.where("goalId").equals(goalId).toArray()).reduce((m, x) => Math.max(m, x.order), 0);
  const m = Milestone.parse({ id: newId(), goalId, title, order: last + 1, createdAt: t, updatedAt: t });
  await db().milestones.add(m);
  return m;
}
export async function renameMilestone(id: string, title: string) {
  const cur = await db().milestones.get(id);
  if (cur) await db().milestones.put(Milestone.parse({ ...cur, title, updatedAt: nowIso() }));
}
export async function deleteMilestone(id: string) {
  await reverseXp("milestone", id);
  await db().milestones.delete(id);
}
export async function setMilestoneDone(id: string, done: boolean): Promise<number> {
  const m = await db().milestones.get(id);
  if (!m) return 0;
  if (done === !!m.doneAt) return 0;
  await db().milestones.put({ ...m, doneAt: done ? nowIso() : undefined, updatedAt: nowIso() });
  if (!done) { await reverseXp("milestone", id); return 0; }
  const got = await awardXp("milestone", id, `Milestone: ${m.title}`);
  await evaluateAchievements();
  return got;
}

/* ---------------- training ---------------- */
export type TrainingInput = Omit<TrainingSession, "id" | "createdAt" | "updatedAt"> & { id?: string };

export async function saveTraining(input: TrainingInput): Promise<{ session: TrainingSession; xp: number }> {
  const t = nowIso();
  const cur = input.id ? await db().training.get(input.id) : undefined;
  const s = TrainingSession.parse({ ...input, id: cur?.id ?? newId(), createdAt: cur?.createdAt ?? t, updatedAt: t });
  await db().training.put(s);
  let got = 0;
  if (s.status === "completed") got = await awardXp("training", s.id, `Training: ${activityName(s)}`);
  else await reverseXp("training", s.id);
  await evaluateAchievements();
  return { session: s, xp: got };
}
export async function deleteTraining(id: string) {
  await reverseXp("training", id);
  await db().training.delete(id);
}
export async function copyTraining(id: string, date: DateKey): Promise<TrainingSession> {
  const cur = await db().training.get(id);
  if (!cur) throw new Error("Session not found");
  const { session } = await saveTraining({ ...cur, id: undefined, date, status: "planned", notes: cur.notes, drills: cur.drills.map((x) => ({ ...x, id: newId(), done: false })), shots: [] });
  return session;
}
export function activityName(s: Pick<TrainingSession, "activity" | "customActivity">): string {
  if (s.activity === "custom") return s.customActivity?.trim() || "Custom activity";
  return s.activity[0].toUpperCase() + s.activity.slice(1);
}

/* ---------------- wellness ---------------- */
export type CheckinInput = Omit<DailyCheckin, "id" | "createdAt" | "updatedAt">;
export async function saveCheckin(input: CheckinInput): Promise<number> {
  const t = nowIso();
  const cur = await db().checkins.get(input.date);
  const c = DailyCheckin.parse({ ...input, id: input.date, createdAt: cur?.createdAt ?? t, updatedAt: t });
  await db().checkins.put(c);
  const meaningful = c.restDay || c.sleepHours !== undefined || c.sleepQuality !== undefined || c.energy !== undefined || c.mood !== undefined || c.soreness !== undefined || c.note.trim() !== "";
  let got = 0;
  if (meaningful) got = await awardXp("checkin", c.date, c.restDay ? "Planned rest day" : "Daily check-in", c.date);
  else await reverseXp("checkin", c.date);
  await evaluateAchievements();
  return got;
}
export async function deleteCheckin(date: DateKey) {
  await reverseXp("checkin", date);
  await db().checkins.delete(date);
}
export async function saveMeal(input: Omit<MealEntry, "id" | "createdAt" | "updatedAt"> & { id?: string }) {
  const t = nowIso();
  const cur = input.id ? await db().meals.get(input.id) : undefined;
  const m = MealEntry.parse({ ...input, id: cur?.id ?? newId(), createdAt: cur?.createdAt ?? t, updatedAt: t });
  await db().meals.put(m);
  return m;
}
export async function deleteMeal(id: string) { await db().meals.delete(id); }

/* ---------------- focus timer ---------------- */
const TIMER_KEY = "activeTimer";
export async function getTimer(): Promise<ActiveTimer | null> {
  const e = await db().kv.get(TIMER_KEY);
  const parsed = ActiveTimer.safeParse(e?.value);
  return parsed.success ? parsed.data : null;
}
export async function startTimer(label: string, plannedMin: number, taskId?: string, nowMs = Date.now()): Promise<ActiveTimer> {
  const t: ActiveTimer = ActiveTimer.parse({ id: newId(), label: label.trim() || "Focus", plannedMin, startedAtMs: nowMs, pausedAtMs: null, pausedTotalMs: 0, taskId });
  await db().kv.put({ key: TIMER_KEY, value: t });
  return t;
}
export async function pauseTimer(nowMs = Date.now()) {
  const t = await getTimer();
  if (t && t.pausedAtMs === null) await db().kv.put({ key: TIMER_KEY, value: { ...t, pausedAtMs: nowMs } });
}
export async function resumeTimer(nowMs = Date.now()) {
  const t = await getTimer();
  if (t && t.pausedAtMs !== null) await db().kv.put({ key: TIMER_KEY, value: { ...t, pausedTotalMs: t.pausedTotalMs + (nowMs - t.pausedAtMs), pausedAtMs: null } });
}
/** Stops without recording: abandoned sessions are not counted. */
export async function cancelTimer() { await db().kv.delete(TIMER_KEY); }

export function timerElapsedMs(t: ActiveTimer, nowMs = Date.now()): number {
  const end = t.pausedAtMs ?? nowMs;
  return Math.max(0, end - t.startedAtMs - t.pausedTotalMs);
}

/** Records the session once (keyed by the timer id) when the planned time has elapsed. */
export async function completeTimerIfDone(nowMs = Date.now()): Promise<{ recorded: boolean; xp: number }> {
  const d = db();
  return withTx(async () => {
    const t = await getTimer();
    if (!t) return { recorded: false, xp: 0 };
    const elapsed = timerElapsedMs(t, nowMs);
    if (elapsed < t.plannedMin * 60_000) return { recorded: false, xp: 0 };
    const prefs = await getPrefs();
    if (!(await d.focus.get(t.id))) {
      const completedAtMs = t.startedAtMs + t.pausedTotalMs + t.plannedMin * 60_000;
      await d.focus.add({ id: t.id, label: t.label, plannedMin: t.plannedMin, actualMin: t.plannedMin, startedAt: new Date(t.startedAtMs).toISOString(), completedAt: new Date(Math.min(completedAtMs, nowMs)).toISOString(), date: dateInTz(new Date(t.startedAtMs), prefs.timezone), taskId: t.taskId });
    }
    await d.kv.delete(TIMER_KEY);
    const got = await awardXp("focus", t.id, `Focus: ${t.label}`);
    await evaluateAchievements();
    return { recorded: true, xp: got };
  });
}
export async function deleteFocusSession(id: string) {
  await reverseXp("focus", id);
  await db().focus.delete(id);
}

/* ---------------- journal ---------------- */
export async function saveJournal(input: Omit<JournalEntry, "id" | "createdAt" | "updatedAt"> & { id?: string }) {
  const t = nowIso();
  const cur = input.id ? await db().journal.get(input.id) : undefined;
  const j = JournalEntry.parse({ ...input, id: cur?.id ?? newId(), createdAt: cur?.createdAt ?? t, updatedAt: t });
  await db().journal.put(j);
  await evaluateAchievements();
  return j;
}
export async function deleteJournal(id: string) { await db().journal.delete(id); }

/* ---------------- onboarding ---------------- */
export async function saveAnswer(id: string, value: unknown) {
  await db().answers.put({ id, value, updatedAt: nowIso() });
}
export async function getAnswers(): Promise<Record<string, unknown>> {
  const all = await db().answers.toArray();
  return Object.fromEntries(all.map((a) => [a.id, a.value]));
}

/* ---------------- danger zone ---------------- */
export async function deleteAllData() {
  const d = db();
  await withTx(async () => { for (const t of d.tables) await t.clear(); });
}
