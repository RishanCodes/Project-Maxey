import { beforeEach, describe, expect, it } from "vitest";
import { addDays, dateInTz, daysBetween, startOfWeek, weekday } from "@/lib/dates";
import { consistency, isDueToday, isScheduledDay, occurrencesOn, streak } from "@/lib/recurrence";
import { levelInfo, XP } from "@/lib/config";
import { BlackFlashDB, getDb, setDb } from "@/lib/db";
import * as repo from "@/lib/repo";
import { buildAssessment, QUESTIONS, visibleQuestions } from "@/lib/onboarding";
import { approveDrafts } from "@/lib/approval";
import { exportBackup, importBackup, parseBackup } from "@/lib/backup";
import { buildInsights } from "@/lib/insights";
import { goalProgress } from "@/lib/stats";
import type { Habit, HabitCompletion, Task } from "@/lib/schema";

const habit = (over: Partial<Habit>): Habit => ({
  id: "h1", label: "Test", purpose: "", category: "x", schedule: { type: "daily" }, status: "active", pauses: [], startDate: "2026-01-01",
  createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z", ...over,
});
const done = (date: string, state: HabitCompletion["state"] = "done"): HabitCompletion => ({ id: date + state, habitId: "h1", date, state, at: "" });

beforeEach(async () => {
  setDb(new BlackFlashDB(`test-${Math.random().toString(36).slice(2)}`));
  await repo.updatePrefs({ timezone: "America/Los_Angeles", weekStart: 1 });
});

describe("dates and timezones", () => {
  it("uses the user's timezone for today, not UTC", () => {
    const instant = new Date("2026-11-17T06:30:00Z"); // 10:30pm Nov 16 in Los Angeles
    expect(dateInTz(instant, "America/Los_Angeles")).toBe("2026-11-16");
    expect(dateInTz(instant, "Asia/Tokyo")).toBe("2026-11-17");
    expect(dateInTz(instant, "Not/AZone")).toBe("2026-11-17"); // invalid zone falls back to UTC
  });
  it("adds days across daylight-saving changes without drifting", () => {
    expect(addDays("2026-03-07", 1)).toBe("2026-03-08");
    expect(addDays("2026-03-08", 1)).toBe("2026-03-09");
    expect(addDays("2026-11-01", -1)).toBe("2026-10-31");
    expect(daysBetween("2026-02-27", "2026-03-02")).toBe(3);
  });
  it("computes week start for Sunday- and Monday-start weeks", () => {
    expect(weekday("2026-11-17")).toBe(2); // Tuesday
    expect(startOfWeek("2026-11-17", 1)).toBe("2026-11-16");
    expect(startOfWeek("2026-11-17", 0)).toBe("2026-11-15");
    expect(startOfWeek("2026-11-15", 1)).toBe("2026-11-09");
  });
});

describe("habit schedules and streaks", () => {
  const mwf = habit({ schedule: { type: "weekdays", days: [1, 3, 5] } });
  it("a Mon/Wed/Fri habit is not scheduled (or missed) on Tuesday", () => {
    expect(isScheduledDay(mwf, "2026-11-17")).toBe(false);
    expect(isDueToday(mwf, "2026-11-17", [], 1)).toBe(false);
  });
  it("streak skips off-days, treats rest as neutral, and does not break on an unfinished today", () => {
    const comps = [done("2026-11-06"), done("2026-11-09"), done("2026-11-11", "rest"), done("2026-11-13"), done("2026-11-16")];
    expect(streak(mwf, comps, "2026-11-17", 1)).toEqual({ value: 4, unit: "day" });
    expect(streak(mwf, comps, "2026-11-18", 1)).toEqual({ value: 4, unit: "day" }); // Wed not done yet today
    expect(streak(mwf, comps, "2026-11-19", 1)).toEqual({ value: 0, unit: "day" }); // Wed missed
  });
  it("paused days are neutral", () => {
    const h = habit({ pauses: [{ from: "2026-11-10", to: "2026-11-12" }] });
    const comps = [done("2026-11-08"), done("2026-11-09"), done("2026-11-13")];
    expect(streak(h, comps, "2026-11-13", 1).value).toBe(3);
  });
  it("3x/week habits count weeks and stay due until the target is met", () => {
    const h = habit({ schedule: { type: "perWeek", count: 3 } });
    const comps = ["2026-11-02", "2026-11-04", "2026-11-06", "2026-11-09", "2026-11-10", "2026-11-12", "2026-11-16"].map((d) => done(d));
    expect(streak(h, comps, "2026-11-17", 1)).toEqual({ value: 2, unit: "week" }); // current week (1/3) is neutral
    expect(isDueToday(h, "2026-11-17", comps, 1)).toBe(true);
    const full = [...comps, done("2026-11-17"), done("2026-11-18")];
    expect(isDueToday(h, "2026-11-19", full, 1)).toBe(false);
    expect(streak(h, full, "2026-11-19", 1).value).toBe(3);
  });
  it("consistency counts only scheduled days and ignores an unfinished today", () => {
    const comps = [done("2026-11-09"), done("2026-11-13")];
    expect(consistency(mwf, comps, "2026-11-09", "2026-11-15", 1)).toEqual({ done: 2, expected: 3 });
    expect(consistency(habit({}), [done("2026-11-16")], "2026-11-16", "2026-11-17", 1, "2026-11-17")).toEqual({ done: 1, expected: 1 });
  });
});

describe("task occurrences", () => {
  const base = (over: Partial<Task>): Task => ({ id: "t", title: "x", description: "", tags: [], priority: "medium", repeat: { type: "none" }, order: 1, archived: false, createdAt: "2026-11-01T00:00:00Z", updatedAt: "", ...over });
  const created = () => "2026-11-01";
  it("weekly repeating tasks appear only on their days, from their start", () => {
    const t = base({ repeat: { type: "weekly", days: [2, 4] }, dueDate: "2026-11-10" });
    expect(occurrencesOn([t], [], "2026-11-17", "2026-11-17", created)).toHaveLength(1);
    expect(occurrencesOn([t], [], "2026-11-18", "2026-11-17", created)).toHaveLength(0);
    expect(occurrencesOn([t], [], "2026-11-03", "2026-11-17", created)).toHaveLength(0);
  });
  it("overdue one-off tasks show on today only", () => {
    const t = base({ dueDate: "2026-11-12" });
    expect(occurrencesOn([t], [], "2026-11-17", "2026-11-17", created)[0].overdue).toBe(true);
    expect(occurrencesOn([t], [], "2026-11-18", "2026-11-17", created)).toHaveLength(0);
  });
});

describe("XP ledger", () => {
  it("awards once per action, reverses on undo, and re-awards on redo", async () => {
    const today = await repo.localToday();
    const t = await repo.createTask({ title: "Read", description: "", tags: [], priority: "high", repeat: { type: "none" }, dueDate: today });
    expect(await repo.completeTask(t.id, today)).toBe(XP.task);
    expect(await repo.completeTask(t.id, today)).toBe(0); // double tap
    expect(repo.totalXp(await getDb().xp.toArray())).toBe(10);
    await repo.uncompleteTask(t.id, today);
    expect(repo.totalXp(await getDb().xp.toArray())).toBe(0);
    await repo.uncompleteTask(t.id, today); // double undo is harmless
    expect(repo.totalXp(await getDb().xp.toArray())).toBe(0);
    await repo.completeTask(t.id, today);
    expect(repo.totalXp(await getDb().xp.toArray())).toBe(10);
    await repo.deleteTask(t.id);
    expect(repo.totalXp(await getDb().xp.toArray())).toBe(0);
  });
  it("repeating task occurrences earn separately per date", async () => {
    const t = await repo.createTask({ title: "Shots", description: "", tags: [], priority: "medium", repeat: { type: "daily" }, dueDate: "2026-11-01" });
    await repo.completeTask(t.id, "2026-11-10");
    await repo.completeTask(t.id, "2026-11-11");
    expect(await getDb().taskCompletions.count()).toBe(2);
  });
  it("enforces the daily cap and reverses exactly what was awarded", async () => {
    const today = await repo.localToday();
    const ids: string[] = [];
    for (let i = 0; i < 15; i++) { const t = await repo.createTask({ title: `T${i}`, description: "", tags: [], priority: "low", repeat: { type: "none" }, dueDate: today }); ids.push(t.id); await repo.completeTask(t.id, today); }
    expect(repo.totalXp(await getDb().xp.toArray())).toBe(XP.dailyCap);
    await repo.uncompleteTask(ids[14], today); // this one was awarded 0
    expect(repo.totalXp(await getDb().xp.toArray())).toBe(XP.dailyCap);
    await repo.uncompleteTask(ids[0], today);
    expect(repo.totalXp(await getDb().xp.toArray())).toBe(XP.dailyCap - 10);
  });
  it("training XP is awarded once, reversed when set back to planned or deleted", async () => {
    const base = { date: "2026-11-16", activity: "basketball" as const, type: "independent" as const, durationMin: 45, focusAreas: [], notes: "", drills: [], shots: [] };
    const { session } = await repo.saveTraining({ ...base, status: "completed" });
    await repo.saveTraining({ ...session, notes: "edited" });
    expect(repo.totalXp(await getDb().xp.toArray())).toBe(XP.training);
    await repo.saveTraining({ ...session, status: "planned" });
    expect(repo.totalXp(await getDb().xp.toArray())).toBe(0);
    await repo.saveTraining({ ...session, status: "completed" });
    await repo.deleteTraining(session.id);
    expect(repo.totalXp(await getDb().xp.toArray())).toBe(0);
  });
  it("level thresholds", () => {
    expect(levelInfo(0).level).toBe(1);
    expect(levelInfo(99).level).toBe(1);
    expect(levelInfo(100).level).toBe(2);
    expect(levelInfo(300).level).toBe(3);
  });
});

describe("focus timer", () => {
  it("uses timestamps, survives pauses, and records a completed session exactly once", async () => {
    const t0 = 1_000_000;
    await repo.startTimer("Math", 25, undefined, t0);
    await repo.pauseTimer(t0 + 10 * 60_000);
    await repo.resumeTimer(t0 + 15 * 60_000);
    const timer = (await repo.getTimer())!;
    expect(repo.timerElapsedMs(timer, t0 + 20 * 60_000)).toBe(15 * 60_000);
    expect((await repo.completeTimerIfDone(t0 + 20 * 60_000)).recorded).toBe(false);
    expect((await repo.completeTimerIfDone(t0 + 31 * 60_000)).recorded).toBe(true);
    expect((await repo.completeTimerIfDone(t0 + 32 * 60_000)).recorded).toBe(false);
    expect(await getDb().focus.count()).toBe(1);
  });
  it("cancelled timers are not recorded", async () => {
    await repo.startTimer("x", 5, undefined, 0);
    await repo.cancelTimer();
    expect(await getDb().focus.count()).toBe(0);
  });
});

describe("goals", () => {
  it("progress comes from milestones unless manually set (and labeled)", async () => {
    const g = await repo.saveGoal({ title: "Make varsity", why: "", area: "training", status: "active", manualProgress: null, linkedHabitIds: [] });
    const m1 = await repo.addMilestone(g.id, "A"); await repo.addMilestone(g.id, "B");
    expect(await repo.setMilestoneDone(m1.id, true)).toBe(XP.milestone);
    expect(await repo.setMilestoneDone(m1.id, true)).toBe(0);
    const ms = await getDb().milestones.toArray();
    expect(goalProgress(g, ms)).toMatchObject({ pct: 50, source: "milestones" });
    expect(goalProgress({ ...g, manualProgress: 80 }, ms)).toMatchObject({ pct: 80, source: "manual" });
  });
});

describe("onboarding", () => {
  it("adapts its length to the answers (25 to 36 questions)", () => {
    const minimal = visibleQuestions({ areas: ["habits"], active: "no" }).length;
    const sport = visibleQuestions({ areas: ["training", "habits"], active: "yes", practiceDays: [2, 4] }).length;
    const both = visibleQuestions({ areas: ["training", "academics"], active: "yes", practiceDays: [2] }).length;
    expect(minimal).toBeGreaterThanOrEqual(25);
    expect(both).toBeLessThanOrEqual(QUESTIONS.length);
    expect(both).toBeLessThanOrEqual(36);
    expect(sport).toBeGreaterThan(minimal);
  });
  it("moves study blocks after practice on practice days and keeps independent work off practice days", () => {
    const a = buildAssessment({ areas: ["academics", "training"], topPriority: "academics", homeworkDays: [1, 2], homeworkTime: "16:00", active: "yes", practiceDays: [2, 4], practiceTime: "16:00", skills: ["shooting"] });
    const study = a.drafts.find((d) => d.key === "onb:task:study")!;
    expect(study.reason).toMatch(/after practice/);
    const tue = a.rhythm[2].items.find((i) => i.kind === "study")!;
    expect(tue.time! >= "18:00").toBe(true);
    const ind = a.drafts.find((d) => d.key === "onb:task:independent")!;
    if (ind.task?.repeat.type === "weekly") for (const d of ind.task.repeat.days) expect([2, 4]).not.toContain(d);
  });
  it("approving the plan twice (retake) does not duplicate habits or tasks", async () => {
    const a = buildAssessment({ areas: ["habits", "academics"], wantHabits: ["plan"], habitCount: "1", weeklyReview: "yes" });
    await approveDrafts(a.drafts);
    const h1 = await getDb().habits.count(), t1 = await getDb().tasks.count();
    await approveDrafts(buildAssessment({ areas: ["habits", "academics"], wantHabits: ["plan"], habitCount: "1", weeklyReview: "yes" }).drafts);
    expect(await getDb().habits.count()).toBe(h1);
    expect(await getDb().tasks.count()).toBe(t1);
    expect(h1).toBe(1);
  });
  it("unchecked drafts are not created", async () => {
    const a = buildAssessment({ areas: ["habits"], wantHabits: ["plan"], weeklyReview: "yes" });
    await approveDrafts(a.drafts.map((d) => ({ ...d, checked: false })));
    expect(await getDb().habits.count()).toBe(0);
    expect(await getDb().tasks.count()).toBe(0);
  });
});

describe("backup", () => {
  it("round-trips with ids intact and merge never duplicates completions", async () => {
    const today = await repo.localToday();
    const t = await repo.createTask({ title: "A", description: "", tags: [], priority: "high", repeat: { type: "none" }, dueDate: today });
    await repo.completeTask(t.id, today);
    const h = await repo.createHabit({ label: "Sleep", purpose: "", category: "r", schedule: { type: "daily" } });
    await repo.markHabit(h.id, today, "done");
    const file = await exportBackup();
    const parsed = parseBackup(JSON.stringify(file));
    expect(parsed.ok).toBe(true);
    await repo.deleteAllData();
    if (!parsed.ok) return;
    await importBackup(parsed.file, "replace");
    expect((await getDb().tasks.get(t.id))?.title).toBe("A");
    expect(await getDb().habitCompletions.count()).toBe(1);
    const r = await importBackup(parsed.file, "merge");
    expect(r.added).toBe(0);
    expect(await getDb().habitCompletions.count()).toBe(1);
    expect(repo.totalXp(await getDb().xp.toArray())).toBe(20);
  });
  it("rejects malformed and foreign files with a clear message", () => {
    expect(parseBackup("{nope").ok).toBe(false);
    expect(parseBackup(JSON.stringify({ app: "other" }))).toMatchObject({ ok: false });
    const bad = parseBackup(JSON.stringify({ app: "black-flash", schemaVersion: 1, exportedAt: "2026-01-01T00:00:00Z", data: { tasks: [{}] } }));
    expect(bad.ok).toBe(false);
  });
});

describe("insights", () => {
  it("say nothing without data", () => {
    const empty = { tasks: [], taskCompletions: [], habits: [], habitCompletions: [], goals: [], milestones: [], training: [], checkins: [], focus: [], xp: [] };
    expect(buildInsights(empty, "2026-11-17", 1, () => "2026-11-01")).toEqual([]);
  });
  it("report real habit numbers with their denominator", () => {
    const h = habit({});
    const comps = ["2026-11-11", "2026-11-12", "2026-11-14", "2026-11-16"].map((d) => done(d));
    const s = { tasks: [], taskCompletions: [], habits: [h], habitCompletions: comps, goals: [], milestones: [], training: [], checkins: [], focus: [], xp: [] };
    const ins = buildInsights(s, "2026-11-17", 1, () => "2026-11-01");
    expect(ins[0].id).toBe("habits-week");
    expect(ins[0].shows).toContain("4 of 6"); // today (17th) not done yet is neutral
  });
});
