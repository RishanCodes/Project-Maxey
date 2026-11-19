import { beforeEach, describe, expect, it } from "vitest";
import { BlackFlashDB, getDb, setDb } from "@/lib/db";
import * as repo from "@/lib/repo";
import {
  PROGRAM_DAYS, dateOfDay, dayNumber, planDay, programStreak, readiness, scheduledKind, weekDates, weekParams, weekSlots, type PlanContext,
} from "@/lib/program/engine";
import { addDays, weekday } from "@/lib/dates";
import { parseBackup } from "@/lib/backup";
import type { Benchmark, DailyCheckin, Program, ProgramLog, ProgramProfile } from "@/lib/schema";

const START = "2026-11-16"; // a Monday
const profile = (over: Partial<ProgramProfile> = {}): ProgramProfile => ({
  goal: "", position: "guard", experience: "jv", age: "16-18", focus: ["finishing", "explosiveness", "shooting"], ratings: { finishing: 2, explosiveness: 3, shooting: 4 },
  days: [1, 2, 4, 6], minutes: 60, practiceDays: [3], hoop: true, court: true, gym: false, partner: false, injuries: [], ...over,
});
const program = (over: Partial<ProgramProfile> = {}, p: Partial<Program> = {}): Program => ({ id: "p1", startDate: START, status: "active", pauses: [], profile: profile(over), createdAt: "2026-11-16T00:00:00Z", updatedAt: "2026-11-16T00:00:00Z", ...p });
const ctx = (p: Program, extra: Partial<PlanContext> = {}): PlanContext => ({ program: p, logs: [], benchmarks: [], checkins: [], today: START, ...extra });
const log = (date: string, over: Partial<ProgramLog> = {}): ProgramLog => ({ id: `pl:p1:${date}`, programId: "p1", date, day: 1, status: "done", kind: "train", minutes: 60, skills: ["finishing"], drillsDone: 5, drillsTotal: 5, note: "", createdAt: "x".repeat(10), updatedAt: "x".repeat(10), ...over });
const checkin = (date: string, over: Partial<DailyCheckin>): DailyCheckin => ({ id: date, date, restDay: false, note: "", createdAt: "x".repeat(10), updatedAt: "x".repeat(10), ...over });
const allDays = (p: Program) => Array.from({ length: PROGRAM_DAYS }, (_, i) => dateOfDay(p, i + 1));

describe("90-day calendar", () => {
  it("counts days, and paused days don't count", () => {
    const p = program({}, { pauses: [{ from: "2026-11-20", to: "2026-11-25" }] });
    expect(dayNumber(p, START)).toBe(1);
    expect(dayNumber(p, "2026-11-19")).toBe(4);
    expect(dayNumber(p, "2026-11-22")).toBeNull();
    expect(dayNumber(p, "2026-11-25")).toBe(5);
    expect(dayNumber(p, "2026-11-15")).toBeNull();
    expect(dateOfDay(p, 5)).toBe("2026-11-25");
  });
  it("schedules tests on day one and in weeks 5, 9 and 13, light days on practice days, and rest otherwise", () => {
    const p = program({ days: [1, 2, 3, 4, 6] });
    const kinds = allDays(p).map((d) => [d, scheduledKind(p, d)] as const);
    const tests = kinds.filter(([, k]) => k === "test").map(([d]) => dayNumber(p, d)!);
    expect(tests).toHaveLength(4);
    expect(tests[0]).toBe(1);
    expect(Math.ceil(tests[1] / 7)).toBe(5); expect(Math.ceil(tests[2] / 7)).toBe(9); expect(Math.ceil(tests[3] / 7)).toBe(13);
    for (const [d, k] of kinds) {
      if (!p.profile.days.includes(weekday(d))) expect(k).toBe("rest");
      else if (k !== "test" && weekday(d) === 3) expect(k).toBe("light");
    }
  });
});

describe("sessions", () => {
  it("fit the time available, never repeat a drill in a session, and respect equipment", () => {
    for (const minutes of [30, 45, 60, 90]) {
      for (const over of [{}, { hoop: false, court: false }, { focus: ["handles", "defense"] as ProgramProfile["focus"] }]) {
        const p = program({ minutes, ...over });
        for (const d of allDays(p)) {
          const plan = planDay(ctx(p), d);
          if (plan.kind !== "train") continue;
          const ids = plan.blocks.flatMap((b) => b.items.map((i) => i.drill.id));
          expect(new Set(ids).size).toBe(ids.length);
          const lighter = plan.week === 4 || plan.week === 8 || plan.week === 13 ? (plan.week === 13 ? 0.6 : 0.75) : 1;
          expect(plan.minutes).toBeGreaterThanOrEqual(Math.floor(minutes * lighter * 0.75));
          expect(plan.minutes).toBeLessThanOrEqual(Math.ceil(minutes * lighter * 1.25) + 5);
          if (!p.profile.hoop) expect(plan.blocks.flatMap((b) => b.items).some((i) => i.drill.needs.includes("hoop"))).toBe(false);
          if (p.profile.hoop) expect(ids).not.toContain("s-wall");
        }
      }
    }
  });
  it("gets harder through the phases", () => {
    const p = program();
    const tierAvg = (week: number) => {
      const plans = weekDates(p, week).map((d) => planDay(ctx(p), d)).filter((x) => x.kind === "train");
      const t = plans.flatMap((x) => x.blocks.filter((b) => b.skill).flatMap((b) => b.items.map((i) => i.drill.tier)));
      return t.reduce((a, b) => a + b, 0) / t.length;
    };
    expect(tierAvg(6)).toBeGreaterThan(tierAvg(2));
    expect(tierAvg(10)).toBeGreaterThanOrEqual(tierAvg(6));
  });
  it("keeps jump days apart, off practice days, and drops max-effort jumps for knee or ankle issues and young players", () => {
    const p = program({ focus: ["explosiveness"], days: [1, 2, 3, 4, 5, 6], practiceDays: [3] });
    for (let w = 1; w <= 13; w++) {
      const slots = weekSlots(ctx(p), w, weekParams(ctx(p), w));
      for (const [d, s] of slots) {
        if (s !== "explosiveness") continue;
        expect(slots.get(addDays(d, -1))).not.toBe("explosiveness");
        expect(weekday(d)).not.toBe(3);
      }
      expect([...slots.values()].filter((s) => s === "explosiveness").length).toBeLessThanOrEqual(2);
    }
    for (const over of [{ injuries: ["knees"] as ProgramProfile["injuries"] }, { age: "u13" as const }]) {
      const q = program({ focus: ["explosiveness"], ...over });
      const drills = allDays(q).flatMap((d) => planDay(ctx(q), d).blocks.flatMap((b) => b.items.map((i) => i.drill)));
      if (over.injuries) expect(drills.some((d) => d.impact === 2)).toBe(false);
      else expect(drills.some((d) => d.tier === 3 || d.id === "st-gym" || d.id === "x-depth")).toBe(false);
    }
  });
});

describe("readiness and adaptation", () => {
  const p = program();
  const trainDay = allDays(p).find((d) => scheduledKind(p, d) === "train" && dayNumber(p, d)! > 7)!;
  it("makes today lighter on a bad check-in, recovery when several things are off, and can be overridden", () => {
    const normal = planDay(ctx(p, { today: trainDay }), trainDay);
    const light = planDay(ctx(p, { today: trainDay, checkins: [checkin(trainDay, { soreness: 4 })] }), trainDay);
    expect(light.minutes).toBeLessThan(normal.minutes);
    expect(light.blocks.flatMap((b) => b.items).some((i) => i.drill.impact === 2)).toBe(false);
    expect(light.why.join(" ")).toMatch(/soreness is 4\/5/);
    const rec = planDay(ctx(p, { today: trainDay, checkins: [checkin(trainDay, { sleepHours: 5, energy: 2 })] }), trainDay);
    expect(rec.kind).toBe("recovery");
    expect(planDay(ctx(p, { today: trainDay, checkins: [checkin(trainDay, { sleepHours: 5, energy: 2 })] }), trainDay, { full: true }).kind).toBe("train");
    expect(readiness(undefined, undefined).level).toBe("normal");
  });
  it("shortens sessions after a low-completion week and restores them after a good one", () => {
    const w1 = weekDates(p, 1).filter((d) => scheduledKind(p, d) !== "rest");
    const w2 = weekDates(p, 2).filter((d) => scheduledKind(p, d) !== "rest");
    const today = weekDates(p, 3)[0];
    const lowCtx = ctx(p, { today, logs: [log(w1[0])] });
    const wp2 = weekParams(lowCtx, 2);
    expect(wp2.minutesFactor).toBeLessThan(1);
    expect(wp2.notes.some((n) => /1 of \d sessions/.test(n.text))).toBe(true);
    const goodCtx = ctx(p, { today, logs: [log(w1[0]), ...w2.map((d) => log(d))] });
    expect(weekParams(goodCtx, 3).minutesFactor).toBeGreaterThan(wp2.minutesFactor);
  });
  it("steps drills up when sessions feel easy, and holds when they feel too hard", () => {
    const w1 = weekDates(p, 1).filter((d) => scheduledKind(p, d) !== "rest");
    const today = weekDates(p, 2)[0];
    const easy = weekParams(ctx(p, { today, logs: w1.map((d) => log(d, { feel: "easy", effort: 5, skills: ["finishing"] })) }), 2);
    expect(easy.bonus.finishing).toBe(1);
    const hard = weekParams(ctx(p, { today, logs: w1.map((d) => log(d, { feel: "hard", effort: 9, skills: ["finishing"] })) }), 2);
    expect(hard.bonus.finishing).toBe(-1);
    expect(hard.minutesFactor).toBeLessThan(1);
  });
  it("after the week-5 retest, gives more time to the focus that improved least", () => {
    const bm = (testId: string, round: number, value: number): Benchmark => ({ id: `bm:p1:${testId}:${round}`, programId: "p1", testId, round, value, date: START, createdAt: "x".repeat(10), updatedAt: "x".repeat(10) });
    const benchmarks = [bm("t-mikan", 0, 20), bm("t-mikan", 1, 21), bm("t-ft", 0, 10), bm("t-ft", 1, 14)];
    const today = weekDates(p, 6)[0];
    const wp = weekParams(ctx(p, { today, benchmarks }), 6);
    expect(wp.weights.finishing).toBeGreaterThan(0.45);
    expect(wp.notes.some((n) => /finishing improved least/.test(n.text))).toBe(true);
  });
  it("streak: sore/sick skips and rest days don't break it, a plain miss does", () => {
    const days = allDays(p).filter((d) => scheduledKind(p, d) !== "rest").slice(0, 5);
    const today = days[4];
    expect(programStreak(ctx(p, { today, logs: [log(days[1]), log(days[2], { status: "skipped", skipReason: "sore" }), log(days[3])] }))).toBe(2);
    expect(programStreak(ctx(p, { today, logs: [log(days[0]), log(days[1]), log(days[3])] }))).toBe(1);
  });
});

describe("program storage", () => {
  beforeEach(async () => {
    setDb(new BlackFlashDB(`prog-${Math.random()}`));
    await repo.updatePrefs({ timezone: "America/Los_Angeles", weekStart: 1, onboarding: { status: "defaults", index: 0 } });
  });
  it("logging a session saves a training session with XP; undo removes both; one running program at a time", async () => {
    const a = await repo.startProgram(profile(), START);
    const { xp } = await repo.logProgramSession(a, { date: START, day: 1, kind: "train", title: "Finishing + Shooting", skills: ["finishing", "shooting"], status: "done", minutes: 55, effort: 7, feel: "right", note: "", drills: [{ name: "Mikan drill", minutes: 4, done: true }], shots: [{ label: "Mikan drill", made: 18, attempted: 25 }] });
    expect(xp).toBe(15);
    const t = (await getDb().training.toArray())[0];
    expect(t.status).toBe("completed"); expect(t.shots[0].made).toBe(18); expect(t.focusAreas).toContain("finishing");
    expect((await getDb().achievements.toArray()).map((x) => x.id)).toContain("program-first");
    await repo.undoProgramLog(a.id, START);
    expect(await getDb().training.count()).toBe(0);
    expect(repo.totalXp(await getDb().xp.toArray())).toBe(0);
    const b = await repo.startProgram(profile(), START);
    expect((await getDb().programs.get(a.id))?.status).toBe("ended");
    expect((await repo.currentProgram())?.id).toBe(b.id);
  });
  it("pause and resume skip the paused days", async () => {
    const a = await repo.startProgram(profile(), START);
    await repo.pauseProgram(a.id, "2026-11-20");
    await repo.resumeProgram(a.id, "2026-11-27");
    const p = (await getDb().programs.get(a.id))!;
    expect(p.status).toBe("active");
    expect(dayNumber(p, "2026-11-27")).toBe(5);
  });
  it("older backups without program data still import", () => {
    const old = { app: "black-flash", schemaVersion: 1, exportedAt: "2026-11-01T00:00:00Z", data: Object.fromEntries(["prefs", "answers", "tasks", "taskCompletions", "habits", "habitCompletions", "routines", "routineCompletions", "goals", "milestones", "training", "checkins", "meals", "focus", "journal", "xp", "achievements", "coach"].map((k) => [k, []])) };
    const r = parseBackup(JSON.stringify(old));
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.file.data.programs).toEqual([]);
  });
});
