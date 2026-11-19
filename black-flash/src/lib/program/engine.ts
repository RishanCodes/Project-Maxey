/**
 * 90-day program planner. Pure and deterministic: the plan is derived from the program profile,
 * what was logged, benchmark results and check-ins. Nothing about the plan itself is stored, so
 * it can't drift out of sync with what actually happened.
 *
 * Structure (13 weeks):
 *   Foundation (weeks 1-4): technique and base volume; week 4 is lighter. Baseline tests on day one.
 *   Build      (weeks 5-8): harder drills and more volume; week 8 is lighter. Retest in week 5.
 *   Game speed (weeks 9-12): speed, reads, fatigue. Retest in week 9.
 *   Peak       (week 13):   lower volume so you test fresh. Final test at the end.
 *
 * Adaptation (applied at the start of each week, from the week before; explained to the user):
 *   - fewer than half the sessions done: shorter sessions, so they fit (consistency first)
 *   - sessions rated too easy: drills for those skills step up a tier
 *   - sessions rated too hard / very high effort: hold the tier, trim volume
 *   - after a retest: the focus skill that improved least gets more time
 *   - back from a pause of a week or more: an easier re-entry week
 * Readiness (today only, from the daily check-in): poor sleep, low energy or high soreness make
 * today lighter (no high-impact jumps); several together suggest a recovery session instead.
 */
import { addDays, daysBetween, weekday, type DateKey } from "../dates";
import type { Benchmark, DailyCheckin, Program, ProgramLog, ProgramProfile, Skill } from "../schema";
import { DRILLS, TESTS, type Need, type Phase, type ProgramDrill, type ProgramTest } from "./drills";

export const PROGRAM_DAYS = 90;
export const PROGRAM_WEEKS = 13;

export interface PlanContext {
  program: Program;
  logs: ProgramLog[];
  benchmarks: Benchmark[];
  checkins: DailyCheckin[];
  today: DateKey;
}

/* ---------------- calendar ---------------- */
export function isPausedOn(p: Program, d: DateKey): boolean {
  return p.pauses.some((x) => d >= x.from && (!x.to || d < x.to));
}

/** Program day (1-based) for a date, or null before the start / while paused. Can exceed 90. */
export function dayNumber(p: Program, d: DateKey): number | null {
  if (d < p.startDate || isPausedOn(p, d)) return null;
  let paused = 0;
  for (const x of p.pauses) {
    const end = x.to && x.to <= d ? x.to : d;
    if (x.from < end) paused += Math.max(0, daysBetween(x.from < p.startDate ? p.startDate : x.from, end));
  }
  return daysBetween(p.startDate, d) - paused + 1;
}

/** The calendar date of a program day (assuming no future pauses). */
export function dateOfDay(p: Program, n: number): DateKey {
  let d = p.startDate;
  for (let guard = 0; guard < 1000; guard++) {
    const k = dayNumber(p, d);
    if (k !== null && k >= n) return d;
    d = addDays(d, 1);
  }
  return d;
}

export const weekOfDay = (day: number) => Math.min(PROGRAM_WEEKS, Math.ceil(day / 7));
export function weekDates(p: Program, week: number): DateKey[] {
  const first = (week - 1) * 7 + 1, last = Math.min(PROGRAM_DAYS, week * 7);
  const out: DateKey[] = [];
  for (let n = first; n <= last; n++) out.push(dateOfDay(p, n));
  return out;
}

export interface PhaseInfo { key: Phase | "P"; name: string; purpose: string; weeks: string }
export const PHASES: PhaseInfo[] = [
  { key: "F", name: "Foundation", weeks: "Weeks 1–4", purpose: "Clean technique, base volume, and landing mechanics before adding speed." },
  { key: "B", name: "Build", weeks: "Weeks 5–8", purpose: "Harder drills, more reps, combo moves, and real jump training." },
  { key: "G", name: "Game speed", weeks: "Weeks 9–12", purpose: "Everything at game speed: reads, contact, and shooting tired." },
  { key: "P", name: "Peak & test", weeks: "Week 13", purpose: "Lower volume so you feel fresh, then the final test." },
];
export function phaseOfWeek(week: number): PhaseInfo {
  return week <= 4 ? PHASES[0] : week <= 8 ? PHASES[1] : week <= 12 ? PHASES[2] : PHASES[3];
}
const drillPhase = (ph: PhaseInfo): Phase => (ph.key === "P" ? "G" : ph.key);
/** Lighter weeks let the body absorb the work. */
export function weekVolume(week: number): number { return week === 4 || week === 8 ? 0.75 : week === 13 ? 0.6 : 1; }

/** Test rounds: 0 baseline (week 1), 1 (week 5), 2 (week 9), 3 final (week 13). */
export function roundForWeek(week: number): number { return week >= 13 ? 3 : week >= 9 ? 2 : week >= 5 ? 1 : 0; }
const TEST_WEEKS = [1, 5, 9, 13];

/* ---------------- schedule (no readiness) ---------------- */
export type DayKind = "train" | "light" | "recovery" | "test" | "rest";

function isTrainingDay(p: Program, d: DateKey) { return p.profile.days.includes(weekday(d)); }

/** Scheduled kind for a date from availability alone. */
export function scheduledKind(p: Program, d: DateKey): DayKind {
  const day = dayNumber(p, d);
  if (day === null || day > PROGRAM_DAYS) return "rest";
  if (day === 1) return "test"; // you start with the baseline test, whatever weekday that is
  if (!isTrainingDay(p, d)) return "rest";
  const week = weekOfDay(day);
  if (TEST_WEEKS.includes(week)) {
    const avail = weekDates(p, week).filter((x) => isTrainingDay(p, x));
    const testDate = week === 13 ? avail[avail.length - 1] : week === 1 ? undefined : avail[0];
    if (d === testDate) return "test";
  }
  return p.profile.practiceDays.includes(weekday(d)) ? "light" : "train";
}

/* ---------------- adaptation ---------------- */
export interface Note { kind: "phase" | "adjust" | "info"; text: string }
export interface WeekParams { minutesFactor: number; bonus: Partial<Record<Skill, number>>; weights: Partial<Record<Skill, number>>; notes: Note[] }

const BASE_WEIGHTS = [[1], [0.6, 0.4], [0.45, 0.33, 0.22]];
const LABEL: Record<Skill, string> = { handles: "ball handling", shooting: "shooting", finishing: "finishing", explosiveness: "explosiveness", defense: "defense", iq: "basketball IQ", conditioning: "conditioning", strength: "strength" };
const testsFor = (skill: Skill, p: ProgramProfile) => TESTS.filter((t) => t.skill === skill && hasNeeds(t.needs, p));

function hasNeeds(needs: Need[], p: ProgramProfile) {
  return needs.every((n) => (n === "hoop" ? p.hoop : n === "court" ? p.court : n === "gym" ? p.gym : p.partner));
}

/** Improvement on a test, as a fraction (+0.1 = 10% better), between two rounds. */
export function testChange(t: ProgramTest, before: number, after: number): number {
  if (before <= 0) return after > 0 ? 1 : 0;
  return t.better === "higher" ? (after - before) / before : (before - after) / before;
}

export function weekParams(ctx: PlanContext, week: number): WeekParams {
  const p = ctx.program, prof = p.profile;
  const w0 = BASE_WEIGHTS[prof.focus.length - 1];
  const weights: Partial<Record<Skill, number>> = Object.fromEntries(prof.focus.map((s, i) => [s, w0[i]]));
  const bonus: Partial<Record<Skill, number>> = {};
  let minutesFactor = 1;
  let notes: Note[] = [];
  for (let k = 2; k <= week; k++) {
    notes = [];
    const ph = phaseOfWeek(k);
    if (phaseOfWeek(k - 1).key !== ph.key) notes.push({ kind: "phase", text: `${ph.name} phase: ${ph.purpose}` });
    if (k === 4 || k === 8) notes.push({ kind: "info", text: "Lighter week (about 25% less). Your body gets stronger while it recovers from the last few weeks." });
    const start = weekDates(p, k)[0];
    if (start > ctx.today) continue; // the future adapts once it gets here
    const prev = weekDates(p, k - 1);
    const sched = prev.filter((d) => scheduledKind(p, d) !== "rest" && d < ctx.today);
    const logs = ctx.logs.filter((l) => prev.includes(l.date));
    const done = logs.filter((l) => l.status !== "skipped");
    const hurt = logs.filter((l) => l.status === "skipped" && (l.skipReason === "sore" || l.skipReason === "sick")).length;
    // Back from a pause of a week or more.
    const pauseLen = p.pauses.filter((x) => x.to && x.to <= start && x.to > prev[0]).reduce((n, x) => n + daysBetween(x.from, x.to!), 0);
    if (pauseLen >= 7) { minutesFactor = Math.min(minutesFactor, 0.8); notes.push({ kind: "adjust", text: `Welcome back. After ${pauseLen} days off, this week eases you back in with shorter sessions.` }); continue; }
    if (sched.length >= 2) {
      const rate = done.length / sched.length;
      if (rate < 0.5 && hurt < sched.length - done.length) {
        minutesFactor = Math.max(0.6, +(minutesFactor * 0.85).toFixed(2));
        notes.push({ kind: "adjust", text: `Last week you got ${done.length} of ${sched.length} sessions in, so this week's sessions are shorter (${Math.round(minutesFactor * 100)}% length) to fit your life. Showing up beats long sessions.` });
      } else if (rate >= 0.8 && minutesFactor < 1) {
        minutesFactor = Math.min(1, +(minutesFactor + 0.15).toFixed(2));
        notes.push({ kind: "adjust", text: `${done.length} of ${sched.length} sessions done last week. Session length is going back up.` });
      }
      if (hurt >= 2) { minutesFactor = Math.min(minutesFactor, 0.8); notes.push({ kind: "adjust", text: "You skipped sessions for soreness or illness last week, so this week is lighter. If pain continues, talk to a trusted adult or a professional." }); }
    }
    const rated = done.filter((l) => l.feel);
    const easy = rated.filter((l) => l.feel === "easy").length, hard = rated.filter((l) => l.feel === "hard").length;
    const efforts = done.map((l) => l.effort).filter((x): x is number => typeof x === "number");
    const avgEffort = efforts.length ? efforts.reduce((a, b) => a + b, 0) / efforts.length : undefined;
    const trained = Array.from(new Set(done.flatMap((l) => l.skills))).filter((s) => prof.focus.includes(s));
    if (easy >= 2 && easy > hard && (avgEffort === undefined || avgEffort <= 6.5)) {
      const up = trained.filter((s) => (bonus[s] ?? 0) < 2);
      for (const s of up) bonus[s] = (bonus[s] ?? 0) + 1;
      if (up.length) notes.push({ kind: "adjust", text: `You rated sessions as too easy, so ${up.map((s) => LABEL[s]).join(" and ")} drills step up a level.` });
    } else if ((hard >= 2 && hard > easy) || (avgEffort !== undefined && avgEffort >= 8.5)) {
      for (const s of trained) bonus[s] = Math.max(-1, (bonus[s] ?? 0) - 1);
      minutesFactor = Math.max(0.6, +(minutesFactor * 0.9).toFixed(2));
      notes.push({ kind: "adjust", text: "Sessions felt very hard last week, so drill levels hold and volume drops about 10%. Hard is good, but too hard for too long stalls progress." });
    }
    // Rebalance focus after a retest (weeks 6 and 10 use the week-5 and week-9 results).
    if ((k === 6 || k === 10) && prof.focus.length > 1) {
      const round = k === 6 ? 1 : 2;
      const gains = prof.focus.map((s) => {
        const ch = testsFor(s, prof).map((t) => {
          const b = ctx.benchmarks.find((x) => x.testId === t.id && x.round === 0), a = ctx.benchmarks.find((x) => x.testId === t.id && x.round === round);
          return b && a ? testChange(t, b.value, a.value) : undefined;
        }).filter((x): x is number => x !== undefined);
        return { s, g: ch.length ? ch.reduce((x, y) => x + y, 0) / ch.length : undefined };
      }).filter((x): x is { s: Skill; g: number } => x.g !== undefined);
      if (gains.length >= 2) {
        gains.sort((a, b) => a.g - b.g);
        const lo = gains[0], hi = gains[gains.length - 1];
        if (hi.g - lo.g >= 0.05) {
          const move = Math.min(0.12, (weights[hi.s] ?? 0) - 0.15);
          if (move > 0) {
            weights[hi.s] = +((weights[hi.s] ?? 0) - move).toFixed(2); weights[lo.s] = +((weights[lo.s] ?? 0) + move).toFixed(2);
            notes.push({ kind: "adjust", text: `Retest results: ${LABEL[lo.s]} improved least (${pct(lo.g)}) and ${LABEL[hi.s]} most (${pct(hi.g)}), so ${LABEL[lo.s]} gets more time this block.` });
          }
        }
      }
    }
  }
  if (week === 1) notes.push({ kind: "phase", text: `${PHASES[0].name} phase: ${PHASES[0].purpose}` });
  return { minutesFactor, bonus, weights, notes };
}
const pct = (x: number) => `${x >= 0 ? "+" : ""}${Math.round(x * 100)}%`;

/* ---------------- readiness ---------------- */
export interface Readiness { level: "normal" | "light" | "recover"; reasons: string[] }
export function readiness(c: DailyCheckin | undefined, yesterday: ProgramLog | undefined): Readiness {
  const reasons: string[] = [];
  if (c?.restDay) return { level: "recover", reasons: ["you marked today as a rest day"] };
  if (c?.sleepHours !== undefined && c.sleepHours < 6) reasons.push(`you slept ${c.sleepHours} h`);
  if (c?.energy !== undefined && c.energy <= 2) reasons.push(`energy is ${c.energy}/5`);
  if (c?.soreness !== undefined && c.soreness >= 4) reasons.push(`soreness is ${c.soreness}/5`);
  if (yesterday && yesterday.status !== "skipped" && (yesterday.effort ?? 0) >= 9 && yesterday.feel === "hard") reasons.push("yesterday was a very hard session");
  const level = reasons.length >= 2 || (c?.soreness ?? 0) >= 5 ? "recover" : reasons.length === 1 ? "light" : "normal";
  return { level, reasons };
}

/* ---------------- session building ---------------- */
/** minutes can be above the drill's base time: more rounds of the same dose. */
export interface PlanItem { drill: ProgramDrill; minutes: number }
export interface PlanBlock { label: string; skill?: Skill; items: PlanItem[] }
export interface DayPlan {
  date: DateKey; day: number | null; week: number; phase: PhaseInfo; kind: DayKind; scheduled: DayKind;
  title: string; minutes: number; blocks: PlanBlock[]; skills: Skill[]; why: string[]; tests: ProgramTest[];
  readiness?: Readiness;
}

const PARTNER_SKILL: Record<Skill, Skill> = { shooting: "finishing", finishing: "handles", handles: "finishing", explosiveness: "finishing", defense: "conditioning", iq: "handles", conditioning: "defense", strength: "explosiveness" };

function tierFor(s: Skill, prof: ProgramProfile, ph: PhaseInfo, wp: WeekParams): 1 | 2 | 3 {
  const base = (prof.ratings[s] ?? 2) >= 4 ? 2 : 1;
  let t = base + (ph.key === "F" ? 0 : 1) + (wp.bonus[s] ?? 0);
  if (prof.experience === "beginner" && ph.key !== "G" && ph.key !== "P") t = Math.min(t, 2);
  if (prof.age === "u13") t = Math.min(t, 2);
  return Math.max(1, Math.min(3, t)) as 1 | 2 | 3;
}

const AGE_ORDER = ["u13", "13-15", "16-18", "18+"];
function eligible(d: ProgramDrill, prof: ProgramProfile, ph: Phase, maxImpact: number): boolean {
  if (!hasNeeds(d.needs, prof)) return false;
  if (d.noHoopOnly && prof.hoop) return false;
  if (d.impact > maxImpact) return false;
  if (d.minAge && AGE_ORDER.indexOf(prof.age) < AGE_ORDER.indexOf(d.minAge)) return false;
  if (d.impact === 2 && (prof.injuries.includes("knees") || prof.injuries.includes("ankles"))) return false;
  if (d.id === "st-gym" && prof.injuries.includes("back")) return false;
  return d.phases.includes(ph);
}

/** Picks drills for a block, preferring the current tier, rotating every two weeks so drills repeat long enough to learn. */
function fill(slot: ProgramDrill["slot"], minutes: number, tier: number, ph: Phase, prof: ProgramProfile, maxImpact: number, rot: number, used: Set<string>): PlanItem[] {
  const pick = (phase: Phase | null) => DRILLS.filter((d) => d.slot === slot && d.tier <= tier && !used.has(d.id) && eligible(d, prof, phase ?? d.phases[0], maxImpact));
  // Nothing for this phase with your equipment (e.g. no hoop late in the program): reuse earlier-phase drills.
  let pool = pick(ph);
  if (!pool.length) pool = pick(null);
  pool.sort((a, b) => b.tier - a.tier || a.id.localeCompare(b.id));
  if (!pool.length) return [];
  const atTier = pool.filter((d) => d.tier === Math.max(...pool.map((x) => x.tier)));
  const rest = pool.filter((d) => !atTier.includes(d));
  const r = (arr: ProgramDrill[]) => arr.map((_, i) => arr[(i + rot) % arr.length]);
  const order = [...r(atTier), ...r(rest)];
  const out: PlanItem[] = [];
  let sum = 0;
  for (const d of order) {
    if (sum + d.minutes > minutes + 2) continue;
    out.push({ drill: d, minutes: d.minutes }); used.add(d.id); sum += d.minutes;
    if (sum >= minutes - 2) break;
  }
  if (!out.length) { const d = [...order].sort((a, b) => a.minutes - b.minutes)[0]; out.push({ drill: d, minutes: d.minutes }); used.add(d.id); sum = d.minutes; }
  // Not enough different drills at this level: do more rounds rather than add harder ones.
  if (sum < minutes * 0.8) { const k = Math.min(1.6, minutes / sum); for (const it of out) it.minutes = Math.round(it.drill.minutes * k); }
  return out;
}

/** Primary skill for each training date of a week: by weight, spread out, explosive days never back to back or on practice days. */
export function weekSlots(ctx: PlanContext, week: number, wp: WeekParams): Map<DateKey, Skill> {
  const p = ctx.program, prof = p.profile;
  const dates = weekDates(p, week).filter((d) => ["train", "light"].includes(scheduledKind(p, d)));
  const trainDates = dates.filter((d) => scheduledKind(p, d) === "train");
  const n = trainDates.length;
  const focus = prof.focus;
  const total = focus.reduce((a, s) => a + (wp.weights[s] ?? 0), 0) || 1;
  const raw = focus.map((s) => ({ s, x: ((wp.weights[s] ?? 0) / total) * n }));
  const counts = new Map(raw.map((r) => [r.s, Math.floor(r.x)]));
  let left = n - [...counts.values()].reduce((a, b) => a + b, 0);
  for (const r of [...raw].sort((a, b) => (b.x % 1) - (a.x % 1))) { if (left <= 0) break; counts.set(r.s, (counts.get(r.s) ?? 0) + 1); left--; }
  // Explosiveness: at most 2 sessions a week (1 in lighter weeks).
  const xMax = weekVolume(week) < 1 ? 1 : 2;
  if ((counts.get("explosiveness") ?? 0) > xMax) {
    const extra = counts.get("explosiveness")! - xMax; counts.set("explosiveness", xMax);
    const other = focus.find((s) => s !== "explosiveness") ?? "finishing";
    counts.set(other, (counts.get(other) ?? 0) + extra);
  }
  const queue: Skill[] = [];
  const pool = new Map(counts);
  while (queue.length < n) {
    const next = [...pool.entries()].filter(([, c]) => c > 0).sort((a, b) => b[1] - a[1] || focus.indexOf(a[0]) - focus.indexOf(b[0]));
    if (!next.length) break;
    const pick = next.find(([s]) => s !== queue[queue.length - 1]) ?? next[0];
    queue.push(pick[0]); pool.set(pick[0], pick[1] - 1);
  }
  const out = new Map<DateKey, Skill>();
  const remaining = [...queue];
  for (const d of trainDates) {
    const bad = (s: Skill) => s === "explosiveness" && (out.get(addDays(d, -1)) === "explosiveness" || prof.practiceDays.includes(weekday(d)));
    const i = remaining.findIndex((s) => !bad(s));
    const s = remaining.splice(i >= 0 ? i : 0, 1)[0] ?? focus[0];
    out.set(d, s);
  }
  return out;
}

export function planDay(ctx: PlanContext, date: DateKey, opts: { full?: boolean } = {}): DayPlan {
  const p = ctx.program, prof = p.profile;
  const day = dayNumber(p, date);
  const week = day ? weekOfDay(day) : 1;
  const ph = phaseOfWeek(week);
  const scheduled = scheduledKind(p, date);
  const base: DayPlan = { date, day, week, phase: ph, kind: scheduled, scheduled, title: "", minutes: 0, blocks: [], skills: [], why: [], tests: [] };
  if (day === null || day > PROGRAM_DAYS) return { ...base, kind: "rest", title: isPausedOn(p, date) ? "Paused" : "Outside the program" };
  if (scheduled === "rest") return { ...base, title: "Rest day", why: ["Rest days are when your body adapts to the training. Sleep, eat well, and move easy if you feel like it."] };
  const wp = weekParams(ctx, week);
  const dp = drillPhase(ph);
  const used = new Set<string>();
  const why: string[] = [];
  const isToday = date === ctx.today;
  const ready = isToday ? readiness(ctx.checkins.find((c) => c.date === date), ctx.logs.find((l) => l.date === addDays(date, -1))) : undefined;
  let kind: DayKind = scheduled;
  let factor = weekVolume(week) * wp.minutesFactor;
  let maxImpact = 2;
  if (ready && ready.level !== "normal" && !opts.full && scheduled !== "test") {
    if (ready.level === "recover") kind = "recovery";
    else { factor *= 0.6; maxImpact = 1; why.push(`Lighter today because ${ready.reasons.join(" and ")}: about 40% less volume and no max-effort jumps.`); }
  }
  const rot = Math.floor((week - 1) / 2);
  const warm = (impact: boolean): PlanBlock => ({ label: "Warm-up", items: ["w-dynamic", "w-ball", ...(impact ? ["w-landing"] : [])].map((id) => { const drill = DRILLS.find((d) => d.id === id)!; return { drill, minutes: drill.minutes }; }) });
  const cool = (): PlanBlock => ({ label: "Cool-down", items: [DRILLS.find((d) => d.id === (prof.hoop ? "c-ft" : "c-stretch"))!].map((drill) => ({ drill, minutes: drill.minutes })) });

  if (kind === "recovery") {
    const blocks: PlanBlock[] = [{ label: "Recovery", items: ["r-mobility", "r-easy"].map((id) => { const drill = DRILLS.find((d) => d.id === id)!; return { drill, minutes: drill.minutes }; }) }];
    return { ...base, kind, title: "Recovery session", minutes: 20, blocks, readiness: ready, skills: [],
      why: [`Recovery instead of training because ${ready!.reasons.join(" and ")}. Training hard on a bad day costs more than it gives. Prefer the full session? You can switch it back.`] };
  }

  if (kind === "test") {
    const round = roundForWeek(week);
    const tests = Array.from(new Set([...prof.focus, ...(prof.hoop ? ["shooting" as Skill] : [])])).flatMap((s) => testsFor(s, prof).slice(0, 2));
    const blocks = [warm(prof.focus.includes("explosiveness")), { label: "Light shooting", items: fill("shooting", 6, 1, dp, prof, 0, 0, used) }];
    return { ...base, kind, title: round === 0 ? "Baseline test day" : round === 3 ? "Final test day" : "Retest day", minutes: 30, blocks, tests, readiness: ready,
      why: [round === 0 ? "Day one: measure where you're starting. These numbers are how you'll see your growth, so be honest, not impressive." : round === 3 ? "The final test. Compare with day one to see 90 days of work." : "Retest: the plan uses these results to put more time where you improved least."] };
  }

  if (kind === "light") {
    const m = Math.max(15, Math.round(Math.min(prof.minutes, 30) * factor / 5) * 5);
    const skill: Skill = prof.focus.includes("shooting") || !prof.focus.includes("handles") ? "shooting" : "handles";
    const blocks = [warm(false), { label: "Skill touch", skill, items: fill(skill, m - 12, 1, dp, prof, 0, rot, used) }, { label: "Durability", skill: "strength" as Skill, items: fill("strength", 5, 1, dp, prof, 0, 0, used) }];
    return { ...base, kind, title: `Light day: ${LABEL[skill]} touch`, minutes: m, blocks, readiness: ready, skills: [skill, "strength"],
      why: ["You have team practice today, so this is a short skill touch, not a hard workout. You'll be fresh for practice.", ...why] };
  }

  // Training day.
  const slots = weekSlots(ctx, week, wp);
  const primary = slots.get(date) ?? prof.focus[0];
  const others = prof.focus.filter((s) => s !== primary);
  const idx = [...slots.keys()].indexOf(date);
  const secondary = others.length ? others[idx % others.length] : PARTNER_SKILL[primary];
  const M = Math.max(15, Math.round(prof.minutes * factor / 5) * 5);
  const explosive = primary === "explosiveness" && maxImpact >= 1;
  const warmB = warm(explosive || secondary === "explosiveness");
  const coolB = cool();
  const mins = (b: PlanBlock) => b.items.reduce((a, i) => a + i.minutes, 0);
  let body = M - mins(warmB) - mins(coolB);
  const blocks: PlanBlock[] = [warmB];
  const skills: Skill[] = [];
  const addBlock = (label: string, s: Skill, m: number, impact = maxImpact) => {
    const items = fill(s, m, tierFor(s, prof, ph, wp), dp, prof, impact, rot + idx, used);
    if (items.length) { blocks.push({ label, skill: s, items }); skills.push(s); body -= items.reduce((a, i) => a + i.minutes, 0); }
  };
  // Explosive work goes first, while you're fresh. Quality over quantity: capped at 12 minutes.
  if (primary === "explosiveness") addBlock("Explosiveness", "explosiveness", Math.min(12, Math.round(body * 0.4)));
  const strengthDay = M >= 40 && idx % 2 === 1;
  const strengthMin = strengthDay ? (prof.gym && M >= 60 && ph.key !== "G" ? 15 : 6) : 0;
  const gameSpeed = (ph.key === "G" || ph.key === "P") && M >= 45;
  const main = body - strengthMin - (gameSpeed ? 6 : 0);
  // Main work: 60/40 between two skills. On jump days the jumps already ran, so the two skills are the next focuses.
  const [m1, m2] = primary === "explosiveness" ? [secondary, others.find((x) => x !== secondary) ?? PARTNER_SKILL[secondary]] : [primary, secondary];
  const impactFor = (x: Skill) => (x === "explosiveness" ? Math.min(maxImpact, 1) : maxImpact); // a second jump block stays low-impact
  addBlock(LABEL_TITLE[m1], m1, Math.round(main * 0.6), impactFor(m1));
  addBlock(LABEL_TITLE[m2], m2, Math.round(main * 0.4), impactFor(m2));
  if (gameSpeed) {
    const gs = DRILLS.filter((d) => d.tier >= 2 && (d.slot === primary || d.slot === secondary) && d.tier <= tierFor(d.slot as Skill, prof, ph, wp) && !used.has(d.id) && eligible(d, prof, "G", Math.min(maxImpact, 1)));
    if (gs.length) { const g = gs[rot % gs.length]; blocks.push({ label: "Game-speed finisher", skill: g.slot as Skill, items: [{ drill: g, minutes: g.minutes }] }); skills.push(g.slot as Skill); body -= g.minutes; used.add(gs[rot % gs.length].id); }
  }
  if (strengthMin) addBlock("Strength & durability", "strength", strengthMin, 0);
  // Still short of the time you have: add your next focus (or shooting reps).
  // Without a hoop or court some skills run out of drills, so keep adding skills that work anywhere.
  const fillers: Skill[] = [...prof.focus, ...(prof.hoop ? ["shooting" as Skill] : []), PARTNER_SKILL[primary], "handles", "strength", "defense", "conditioning", "iq"];
  for (const x of fillers) {
    if (body < 6) break;
    if (skills.includes(x) || x === "explosiveness") continue;
    addBlock(LABEL_TITLE[x], x, body);
  }
  blocks.push(coolB);
  const minutes = blocks.reduce((a, b) => a + mins(b), 0);
  if (primary === "explosiveness") why.push("Jumps come right after the warm-up, while you're fresh. Tired jumping teaches slow jumping.");
  if (prof.injuries.some((x) => x === "knees" || x === "ankles") && skills.includes("explosiveness")) why.push("Max-effort jumps are left out because you flagged knee or ankle issues.");
  if (strengthDay) why.push("Strength and durability work twice a week helps keep ankles and knees healthy through 90 days of training.");
  const tier = tierFor(primary, prof, ph, wp);
  why.push(`${LABEL_TITLE[primary]} is at level ${tier} of 3 this week.`);
  return { ...base, kind, title: `${LABEL_TITLE[primary]} + ${LABEL_TITLE[secondary]}`, minutes, blocks, readiness: ready, skills: Array.from(new Set(skills)), why };
}

const LABEL_TITLE: Record<Skill, string> = { handles: "Ball handling", shooting: "Shooting", finishing: "Finishing", explosiveness: "Explosiveness", defense: "Defense", iq: "Basketball IQ", conditioning: "Conditioning", strength: "Strength" };

/* ---------------- progress ---------------- */
/** Consecutive scheduled sessions done. Rest days, today (until done) and sick/sore skips don't break it. */
export function programStreak(ctx: PlanContext): number {
  let n = 0;
  for (let i = 0; i < 400; i++) {
    const d = addDays(ctx.today, -i);
    if (d < ctx.program.startDate) break;
    if (scheduledKind(ctx.program, d) === "rest") continue;
    const log = ctx.logs.find((l) => l.date === d);
    if (log && log.status !== "skipped") n++;
    else if (log && (log.skipReason === "sore" || log.skipReason === "sick")) continue;
    else if (d === ctx.today) continue;
    else break;
  }
  return n;
}

export interface TestResult { test: ProgramTest; baseline?: number; latest?: number; latestRound?: number; change?: number }
export function testResults(ctx: PlanContext): TestResult[] {
  const ids = Array.from(new Set(ctx.benchmarks.map((b) => b.testId)));
  return TESTS.filter((t) => ids.includes(t.id)).map((t) => {
    const rows = ctx.benchmarks.filter((b) => b.testId === t.id).sort((a, b) => a.round - b.round);
    const b0 = rows.find((r) => r.round === 0), last = rows[rows.length - 1];
    return { test: t, baseline: b0?.value, latest: last && last.round > 0 ? last.value : undefined, latestRound: last?.round, change: b0 && last && last.round > 0 ? testChange(t, b0.value, last.value) : undefined };
  });
}

export function programSummary(ctx: PlanContext) {
  const p = ctx.program;
  const todayDay = dayNumber(p, ctx.today);
  const elapsed = Math.min(PROGRAM_DAYS, todayDay ?? Math.max(0, ...ctx.logs.map((l) => l.day)));
  const past: DateKey[] = [];
  for (let n = 1; n <= elapsed; n++) { const d = dateOfDay(p, n); if (d < ctx.today && scheduledKind(p, d) !== "rest") past.push(d); }
  const done = ctx.logs.filter((l) => l.status !== "skipped");
  return {
    day: todayDay, elapsed, week: todayDay ? weekOfDay(Math.min(todayDay, PROGRAM_DAYS)) : 1,
    sessionsDone: done.length, scheduledSoFar: past.length + (ctx.logs.some((l) => l.date === ctx.today) ? 1 : 0),
    minutes: done.reduce((a, l) => a + l.minutes, 0), streak: programStreak(ctx), finished: (todayDay ?? 0) > PROGRAM_DAYS,
  };
}

/** Plain-text summary for the AI coach (training consent). */
export function programCoachText(ctx: PlanContext): string {
  const s = programSummary(ctx);
  const prof = ctx.program.profile;
  const res = testResults(ctx).map((r) => `${r.test.name}: ${r.baseline ?? "?"}${r.latest !== undefined ? ` → ${r.latest} (${pct(r.change ?? 0)})` : ""}`).join("; ");
  return `90-DAY PROGRAM: day ${s.day ?? "-"} of 90, ${phaseOfWeek(s.week).name} phase, ${s.sessionsDone} sessions done of ${s.scheduledSoFar} scheduled, streak ${s.streak}. Focus: ${prof.focus.map((f) => LABEL[f]).join(", ")}. Goal: ${prof.goal || "not stated"}.${res ? ` Tests: ${res}.` : ""}`;
}
