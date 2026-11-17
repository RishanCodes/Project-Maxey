/**
 * Adaptive onboarding: question bank, branching rules, and a deterministic assessment.
 * Everything in the assessment is derived from the user's own answers; nothing is a psychological
 * reading. Each recommendation carries the reason that produced it.
 */
import { DAY_LONG, DAY_SHORT, fromMinutes, toMinutes } from "./dates";
import type { HabitSchedule, Repeat } from "./schema";

export type Answers = Record<string, unknown>;
type Opt = { value: string; label: string };

export type Question =
  | Base & { type: "multi"; options: Opt[] | ((a: Answers) => Opt[]); max?: number }
  | Base & { type: "single"; options: Opt[] | ((a: Answers) => Opt[]) }
  | Base & { type: "time"; placeholder?: string }
  | Base & { type: "days" }
  | Base & { type: "text"; placeholder?: string; multiline?: boolean };

interface Base {
  id: string;
  chapter: 1 | 2 | 3 | 4 | 5;
  prompt: string;
  help?: string;
  optional: boolean;
  showIf?: (a: Answers) => boolean;
}

export const CHAPTERS = ["Direction", "Schedule", "Habits", "Training & learning", "Your app"];

export const AREAS: Opt[] = [
  { value: "training", label: "Training & sport" }, { value: "academics", label: "School & studying" },
  { value: "habits", label: "Daily habits" }, { value: "focus", label: "Focus" }, { value: "confidence", label: "Confidence" },
  { value: "wellbeing", label: "Sleep & recovery" }, { value: "creativity", label: "Creative work" }, { value: "other", label: "Something else" },
];

export interface HabitTemplate { key: string; label: string; purpose: string; category: string; flexible: HabitSchedule; structured: HabitSchedule; areas: string[] }
export const HABIT_LIBRARY: HabitTemplate[] = [
  { key: "sleep", label: "Lights out on time", purpose: "Consistent sleep supports energy for school and training.", category: "Recovery", flexible: { type: "perWeek", count: 5 }, structured: { type: "daily" }, areas: ["wellbeing", "training"] },
  { key: "plan", label: "Plan tomorrow (2 min)", purpose: "A short plan makes the next day easier to start.", category: "Habits", flexible: { type: "perWeek", count: 4 }, structured: { type: "daily" }, areas: ["habits", "focus"] },
  { key: "study", label: "Focused study block", purpose: "Regular short blocks beat last-minute cramming.", category: "Academics", flexible: { type: "perWeek", count: 3 }, structured: { type: "weekdays", days: [1, 2, 3, 4] }, areas: ["academics", "focus"] },
  { key: "skill", label: "15-minute skill work", purpose: "Small independent sessions add up between practices.", category: "Training", flexible: { type: "perWeek", count: 3 }, structured: { type: "perWeek", count: 4 }, areas: ["training"] },
  { key: "mobility", label: "10-minute mobility", purpose: "Keeps you moving well around practices and games.", category: "Recovery", flexible: { type: "perWeek", count: 3 }, structured: { type: "perWeek", count: 5 }, areas: ["training", "wellbeing"] },
  { key: "reading", label: "Read 20 minutes", purpose: "A steady reading habit builds focus.", category: "Learning", flexible: { type: "perWeek", count: 3 }, structured: { type: "perWeek", count: 5 }, areas: ["academics", "creativity", "focus"] },
  { key: "reflect", label: "Evening reflection", purpose: "Two minutes noting what went well and what to change.", category: "Mindset", flexible: { type: "perWeek", count: 3 }, structured: { type: "perWeek", count: 5 }, areas: ["confidence", "habits"] },
  { key: "phone", label: "Phone away during study", purpose: "Fewer interruptions during focused work.", category: "Focus", flexible: { type: "perWeek", count: 3 }, structured: { type: "weekdays", days: [1, 2, 3, 4, 5] }, areas: ["focus", "academics"] },
  { key: "water", label: "Refill water bottle twice", purpose: "A simple hydration cue.", category: "Recovery", flexible: { type: "perWeek", count: 4 }, structured: { type: "daily" }, areas: ["wellbeing", "training"] },
  { key: "create", label: "Create something (20 min)", purpose: "Protected time for creative work.", category: "Creativity", flexible: { type: "perWeek", count: 2 }, structured: { type: "perWeek", count: 3 }, areas: ["creativity"] },
];
const habitOpts = HABIT_LIBRARY.map((h) => ({ value: h.key, label: h.label }));

const SPORT_SKILLS: Opt[] = ["finishing", "shooting", "ball handling", "decision-making", "defense", "change of pace", "conditioning", "explosiveness"].map((x) => ({ value: x, label: x[0].toUpperCase() + x.slice(1) }));
const GENERAL_SKILLS: Opt[] = ["strength", "endurance", "speed", "mobility", "technique", "consistency"].map((x) => ({ value: x, label: x[0].toUpperCase() + x.slice(1) }));
const has = (a: Answers, id: string, v: string) => Array.isArray(a[id]) && (a[id] as string[]).includes(v);
const active = (a: Answers) => a.active === "yes";
/** Student-athletes get both branches; skip a few lower-value questions so the interview stays near 35. */
const bothBranches = (a: Answers) => active(a) && has(a, "areas", "academics");
const playsBall = (a: Answers) => active(a) && (has(a, "sports", "basketball") || has(a, "sports", "volleyball"));

export const QUESTIONS: Question[] = [
  // Chapter 1: Direction
  { id: "name", chapter: 1, type: "text", prompt: "What should the app call you?", optional: true, placeholder: "First name or nickname" },
  { id: "areas", chapter: 1, type: "multi", prompt: "Which areas would you like to improve?", help: "Pick everything that applies. This decides which questions come next.", optional: false, options: AREAS },
  { id: "priorities", chapter: 1, type: "multi", max: 3, prompt: "Pick up to three main priorities.", optional: true, options: (a) => AREAS.filter((o) => has(a, "areas", o.value)), showIf: (a) => Array.isArray(a.areas) && (a.areas as string[]).length > 1 },
  { id: "topPriority", chapter: 1, type: "single", prompt: "Which one matters most this month?", optional: true, options: (a) => AREAS.filter((o) => has(a, (Array.isArray(a.priorities) && (a.priorities as string[]).length ? "priorities" : "areas"), o.value)), showIf: (a) => Array.isArray(a.areas) && (a.areas as string[]).length > 1 },
  { id: "progressVision", chapter: 1, type: "text", multiline: true, prompt: "What would meaningful progress look like, in your own words?", help: "One or two sentences is plenty.", optional: true, placeholder: "For example: keep my grades up while making varsity" },
  { id: "obstacles", chapter: 1, type: "multi", prompt: "What has made progress difficult recently?", optional: true, options: [
    { value: "time", label: "Not enough time" }, { value: "inconsistency", label: "Starting strong, then stopping" }, { value: "fatigue", label: "Feeling tired" },
    { value: "unclear", label: "Unclear plan" }, { value: "distractions", label: "Distractions" }, { value: "other", label: "Something else" }] },
  { id: "coachStyle", chapter: 1, type: "single", prompt: "How should suggestions be written?", optional: true, options: [
    { value: "direct", label: "Direct: just tell me" }, { value: "balanced", label: "Balanced" }, { value: "encouraging", label: "Encouraging" }, { value: "analytical", label: "Analytical: show the numbers" }] },
  { id: "structure", chapter: 1, type: "single", prompt: "How structured do you want your days?", optional: true, options: [
    { value: "flexible", label: "Flexible" }, { value: "moderate", label: "Some structure" }, { value: "structured", label: "Very structured" }] },
  // Chapter 2: Schedule
  { id: "dayStart", chapter: 2, type: "time", prompt: "When does your school or work day usually start?", optional: true },
  { id: "dayEnd", chapter: 2, type: "time", prompt: "When does it usually end?", optional: true },
  { id: "commitmentDays", chapter: 2, type: "days", prompt: "Which days have recurring commitments after school or work?", help: "Practices, jobs, lessons, family time.", optional: true },
  { id: "freeTime", chapter: 2, type: "multi", prompt: "When do you naturally have free time?", optional: true, options: [
    { value: "morning", label: "Before school/work" }, { value: "afternoon", label: "Right after school/work" }, { value: "evening", label: "Evenings" }, { value: "weekend", label: "Weekends" }] },
  { id: "focusTime", chapter: 2, type: "single", prompt: "When do you focus best?", optional: true, options: [
    { value: "morning", label: "Morning" }, { value: "afternoon", label: "Afternoon" }, { value: "evening", label: "Evening" }] },
  { id: "protectTime", chapter: 2, type: "single", prompt: "How much open time do you want to protect each day?", help: "Time the planner should leave empty.", optional: true, options: [
    { value: "30", label: "About 30 minutes" }, { value: "60", label: "About an hour" }, { value: "120", label: "Two hours or more" }] },
  // Chapter 3: Habits
  { id: "currentHabits", chapter: 3, type: "multi", prompt: "Which of these do you already do fairly consistently?", optional: true, options: habitOpts },
  { id: "wantHabits", chapter: 3, type: "multi", prompt: "Which would you like to build?", optional: true, options: (a) => habitOpts.filter((o) => !has(a, "currentHabits", o.value)) },
  { id: "habitCount", chapter: 3, type: "single", prompt: "How many new habits feel realistic right now?", help: "Fewer usually sticks better.", optional: true, options: [{ value: "1", label: "1" }, { value: "2", label: "2" }, { value: "3", label: "3" }] },
  { id: "interruptions", chapter: 3, type: "multi", prompt: "What usually interrupts your routines?", optional: true, options: [
    { value: "late-practice", label: "Late practices or games" }, { value: "homework", label: "Homework load" }, { value: "phone", label: "Phone / screens" },
    { value: "travel", label: "Travel or weekends" }, { value: "tired", label: "Being tired" }, { value: "other", label: "Something else" }] },
  { id: "trackingStyle", chapter: 3, type: "single", prompt: "Do you prefer time-based or outcome-based tracking?", optional: true, showIf: (a) => !bothBranches(a), options: [
    { value: "time", label: "Time-based (20 minutes of…)" }, { value: "outcome", label: "Outcome-based (finished the chapter)" }] },
  { id: "reminderStyle", chapter: 3, type: "single", prompt: "Which reminder style feels helpful?", help: "Browser notifications are best-effort and may not arrive on every device.", optional: true, showIf: (a) => !bothBranches(a), options: [
    { value: "none", label: "No reminders" }, { value: "inapp", label: "Only inside the app" }, { value: "notify", label: "Browser notifications" }] },
  // Chapter 4: Training & learning (conditional)
  { id: "active", chapter: 4, type: "single", prompt: "Are you currently active in a sport or regular training?", optional: true, options: [{ value: "yes", label: "Yes" }, { value: "no", label: "Not right now" }] },
  { id: "sports", chapter: 4, type: "multi", prompt: "Which sports or training types?", optional: true, showIf: active, options: [
    { value: "basketball", label: "Basketball" }, { value: "volleyball", label: "Volleyball" }, { value: "strength", label: "Strength training" }, { value: "running", label: "Running" }, { value: "other", label: "Other" }] },
  { id: "practiceDays", chapter: 4, type: "days", prompt: "Which days do practices or games usually happen?", optional: true, showIf: active },
  { id: "practiceTime", chapter: 4, type: "time", prompt: "What time do practices usually start?", optional: true, showIf: (a) => active(a) && Array.isArray(a.practiceDays) && (a.practiceDays as number[]).length > 0 },
  { id: "skills", chapter: 4, type: "multi", max: 3, prompt: "Which skills do you most want to improve?", help: "Up to three.", optional: true, showIf: active, options: (a) => (playsBall(a) ? SPORT_SKILLS : GENERAL_SKILLS) },
  { id: "strengths", chapter: 4, type: "multi", max: 3, prompt: "What already feels like a strength?", optional: true, showIf: (a) => active(a) && !bothBranches(a), options: (a) => (playsBall(a) ? SPORT_SKILLS : GENERAL_SKILLS) },
  { id: "facilities", chapter: 4, type: "multi", prompt: "What can you realistically use?", optional: true, showIf: active, options: [
    { value: "court", label: "A court or field" }, { value: "gym", label: "A gym / weight room" }, { value: "home", label: "Space at home" }, { value: "none", label: "Nothing reliable" }] },
  { id: "sessionLength", chapter: 4, type: "single", prompt: "Short independent sessions or longer planned ones?", optional: true, showIf: active, options: [
    { value: "short", label: "Short (15–30 min)" }, { value: "long", label: "Longer (45–90 min)" }] },
  { id: "recoveryCheckins", chapter: 4, type: "single", prompt: "Include optional sleep and recovery check-ins?", optional: true, showIf: active, options: [{ value: "yes", label: "Yes" }, { value: "no", label: "No" }] },
  { id: "subjects", chapter: 4, type: "text", prompt: "Main subjects or projects right now?", optional: true, showIf: (a) => has(a, "areas", "academics"), placeholder: "Math, history essay, science project" },
  { id: "homeworkDays", chapter: 4, type: "days", prompt: "Which days do you usually do homework or study?", optional: true, showIf: (a) => has(a, "areas", "academics") },
  { id: "homeworkTime", chapter: 4, type: "time", prompt: "What time usually works for studying?", optional: true, showIf: (a) => has(a, "areas", "academics") },
  // Chapter 5: App preferences
  { id: "homeCard", chapter: 5, type: "single", prompt: "What should the main card on Today show?", optional: true, options: [
    { value: "priority", label: "Top priority task" }, { value: "workout", label: "Next workout" }, { value: "study", label: "Study / focus" }, { value: "habit", label: "Habits due" }, { value: "goal", label: "A goal I choose" }] },
  { id: "gamification", chapter: 5, type: "single", prompt: "How visible should levels and XP be?", optional: true, options: [
    { value: "subtle", label: "Subtle" }, { value: "balanced", label: "Balanced" }, { value: "deep", label: "Front and center" }] },
  { id: "weeklyReview", chapter: 5, type: "single", prompt: "Would you like a weekly review?", optional: true, options: [{ value: "yes", label: "Yes" }, { value: "no", label: "No" }] },
  { id: "aiCategories", chapter: 5, type: "multi", prompt: "If you later enable a live AI coach, which data may it see?", help: "All off unless you choose them. You can change this anytime in Settings. Journal is always off by default.", optional: true, options: [
    { value: "goals", label: "Goals" }, { value: "habits", label: "Habits" }, { value: "tasks", label: "Tasks" }, { value: "training", label: "Training" }, { value: "wellness", label: "Wellness check-ins" }] },
  { id: "draftHabits", chapter: 5, type: "single", prompt: "Should I draft starter habits and a weekly rhythm for you?", help: "You will review everything before anything is added.", optional: true, options: [{ value: "yes", label: "Yes, draft them" }, { value: "no", label: "No, I'll set things up myself" }] },
  { id: "finalNote", chapter: 5, type: "text", multiline: true, prompt: "Anything else the planner should remember?", optional: true, placeholder: "Optional" },
];

export function visibleQuestions(a: Answers): Question[] {
  return QUESTIONS.filter((q) => !q.showIf || q.showIf(a));
}
export function optionsFor(q: Question, a: Answers): Opt[] {
  if (q.type !== "multi" && q.type !== "single") return [];
  return typeof q.options === "function" ? q.options(a) : q.options;
}

/* ---------------- assessment ---------------- */
export interface DraftItem {
  key: string; // seed key, stable across retakes
  kind: "habit" | "task";
  label: string;
  detail: string;
  reason: string;
  checked: boolean;
  habit?: { purpose: string; category: string; schedule: HabitSchedule };
  task?: { repeat: Repeat; dueTime?: string; durationMin?: number; tags: string[] };
}
export interface RhythmItem { time?: string; label: string; kind: "commitment" | "study" | "training" | "rest" | "review" }
export interface Assessment {
  summary: string[];
  priorities: { label: string; reason: string }[];
  drafts: DraftItem[];
  rhythm: { day: number; items: RhythmItem[] }[];
  nextAction: string;
  facts: string[]; // stated by the user
}

const label = (opts: Opt[], v: unknown) => opts.find((o) => o.value === v)?.label ?? String(v);
const arr = <T = string>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);
const str = (v: unknown) => (typeof v === "string" ? v : "");

export function buildAssessment(a: Answers): Assessment {
  const areas = arr(a.areas);
  const pri = arr(a.priorities).length ? arr(a.priorities) : areas;
  const top = str(a.topPriority) || pri[0] || "habits";
  const structure = str(a.structure) || "moderate";
  const interrupts = arr(a.interruptions);
  const flexible = structure === "flexible" || interrupts.includes("late-practice") || interrupts.includes("travel");
  const practiceDays = arr<number>(a.practiceDays);
  const commitmentDays = arr<number>(a.commitmentDays);
  const busyDays = new Set([...practiceDays, ...commitmentDays]);
  const facts: string[] = [];
  if (areas.length) facts.push(`Areas: ${areas.map((x) => label(AREAS, x)).join(", ")}`);
  if (a.dayStart && a.dayEnd) facts.push(`Day runs ${a.dayStart}–${a.dayEnd}`);
  if (practiceDays.length) facts.push(`Practices: ${practiceDays.map((d) => DAY_SHORT[d]).join(", ")}${a.practiceTime ? ` at ${a.practiceTime}` : ""}`);
  if (arr(a.skills).length) facts.push(`Wants to improve: ${arr(a.skills).join(", ")}`);
  if (arr(a.strengths).length) facts.push(`Strengths (self-rated): ${arr(a.strengths).join(", ")}`);

  const summary: string[] = [];
  summary.push(`Your main focus this month is ${label(AREAS, top).toLowerCase()}${pri.length > 1 ? `, alongside ${pri.filter((p) => p !== top).map((p) => label(AREAS, p).toLowerCase()).join(" and ")}` : ""}.`);
  summary.push(`You asked for ${structure === "structured" ? "a structured" : structure === "flexible" ? "a flexible" : "a moderately structured"} plan${a.coachStyle ? ` written in a ${a.coachStyle} style` : ""}.`);
  if (arr(a.obstacles).length) summary.push(`Recent obstacles you named: ${arr(a.obstacles).map((o) => ({ time: "time", inconsistency: "keeping momentum", fatigue: "fatigue", unclear: "an unclear plan", distractions: "distractions", other: "other" } as Record<string, string>)[o] ?? o).join(", ")}.`);
  if (practiceDays.length) summary.push(`Practice ${practiceDays.length} day${practiceDays.length > 1 ? "s" : ""} a week already counts as training load, so extra work stays light on those days.`);

  const priorities = [top, ...pri.filter((p) => p !== top)].slice(0, 3).map((p, i) => ({
    label: label(AREAS, p),
    reason: i === 0 ? "You chose this as what matters most this month." : "You listed this as a priority.",
  }));

  // Starter habits: user's wishes first, then area-based suggestions; capped by the realistic count.
  const count = Number(str(a.habitCount) || 2);
  const current = new Set(arr(a.currentHabits));
  const wanted = arr(a.wantHabits).filter((k) => !current.has(k));
  const suggested = HABIT_LIBRARY.filter((h) => !current.has(h.key) && !wanted.includes(h.key) && h.areas.some((x) => pri.includes(x)))
    .sort((x, y) => Number(y.areas.includes(top)) - Number(x.areas.includes(top)));
  const picks = [...wanted.map((k) => HABIT_LIBRARY.find((h) => h.key === k)!).filter(Boolean), ...suggested].slice(0, Math.max(1, Math.min(3, count)));
  const drafts: DraftItem[] = [];
  if (str(a.draftHabits) !== "no") {
    for (const h of picks) {
      let schedule = flexible ? h.flexible : h.structured;
      if (h.key === "study" && arr<number>(a.homeworkDays).length) schedule = { type: "weekdays", days: arr<number>(a.homeworkDays) };
      if (h.key === "skill" && practiceDays.length >= 4) schedule = { type: "perWeek", count: 2 };
      drafts.push({
        key: `onb:habit:${h.key}`, kind: "habit", label: h.label, checked: true,
        detail: schedule.type === "daily" ? "Every day" : schedule.type === "perWeek" ? `${schedule.count}× per week, any days` : schedule.days.map((d) => DAY_SHORT[d]).join(", "),
        reason: wanted.includes(h.key) ? "You said you want to build this." : `Supports ${h.areas.filter((x) => pri.includes(x)).map((x) => label(AREAS, x).toLowerCase()).join(" and ")}.` + (flexible ? (structure === "flexible" ? " Flexible days because you prefer flexibility." : " Flexible days because late practices or travel often interrupt your routines.") : ""),
        habit: { purpose: h.purpose, category: h.category, schedule },
      });
    }
  }

  // Weekly rhythm, avoiding stated commitments.
  const rhythm = [0, 1, 2, 3, 4, 5, 6].map((day) => ({ day, items: [] as RhythmItem[] }));
  if (practiceDays.length) {
    for (const d of practiceDays) rhythm[d].items.push({ time: str(a.practiceTime) || undefined, label: "Practice / game", kind: "commitment" });
    drafts.push({ key: "onb:task:practice", kind: "task", label: "Team practice", checked: false, detail: `${practiceDays.map((d) => DAY_SHORT[d]).join(", ")}${a.practiceTime ? ` · ${a.practiceTime}` : ""}`,
      reason: "Optional: adds your practices as a repeating item so they appear on Today. Log the actual session in Training.",
      task: { repeat: { type: "weekly", days: practiceDays }, dueTime: str(a.practiceTime) || undefined, durationMin: 90, tags: ["training"] } });
  }
  if (areas.includes("academics")) {
    const days = arr<number>(a.homeworkDays).length ? arr<number>(a.homeworkDays) : [1, 2, 3, 4];
    const pref = str(a.homeworkTime) || (a.focusTime === "morning" ? "07:00" : a.focusTime === "afternoon" ? "16:00" : "19:00");
    const len = flexible ? 25 : 40;
    let time = pref;
    if (a.practiceTime && toMinutes(pref) < toMinutes(str(a.practiceTime)) + 120 && toMinutes(pref) + len > toMinutes(str(a.practiceTime)) - 15) {
      time = fromMinutes(toMinutes(str(a.practiceTime)) + 150); // after practice plus travel and food
    }
    const conflictDays = days.filter((d) => practiceDays.includes(d));
    for (const d of days) rhythm[d].items.push({ time: practiceDays.includes(d) ? time : pref, label: `Study block (${len} min)`, kind: "study" });
    drafts.push({ key: "onb:task:study", kind: "task", label: `Study block${str(a.subjects) ? `: ${str(a.subjects).split(",")[0].trim()}` : ""}`, checked: true,
      detail: `${days.map((d) => DAY_SHORT[d]).join(", ")} · ${pref} · ${len} min`,
      reason: `You study on these days${a.focusTime ? ` and focus best in the ${a.focusTime}` : ""}. ${flexible ? "Shorter blocks because you prefer flexibility." : "A fixed block because you asked for structure."}` + (conflictDays.length ? ` On practice days (${conflictDays.map((d) => DAY_SHORT[d]).join(", ")}) plan it for after practice (around ${time}).` : ""),
      task: { repeat: { type: "weekly", days }, dueTime: pref, durationMin: len, tags: ["study"] } });
  }
  if (active(a)) {
    const free = [1, 3, 6, 0, 2, 4, 5].filter((d) => !busyDays.has(d));
    const n = practiceDays.length >= 4 ? 1 : 2;
    const days = free.slice(0, n);
    const len = str(a.sessionLength) === "long" ? 45 : 20;
    const focus = arr(a.skills).slice(0, 2).join(" & ") || "skill work";
    for (const d of days) rhythm[d].items.push({ label: `Independent session: ${focus} (${len} min)`, kind: "training" });
    if (days.length) drafts.push({ key: "onb:task:independent", kind: "task", label: `Independent session: ${focus}`, checked: true,
      detail: `${days.map((d) => DAY_SHORT[d]).join(", ")} · ${len} min`,
      reason: `Placed on days without practice so your total load stays reasonable${arr(a.facilities).includes("none") ? "; choose drills that need no facility" : ""}.`,
      task: { repeat: { type: "weekly", days }, durationMin: len, tags: ["training"] } });
    const restDay = [0, 6, 5, 3].find((d) => !busyDays.has(d) && !days.includes(d)) ?? 0;
    rhythm[restDay].items.push({ label: "Recovery day", kind: "rest" });
  }
  if (str(a.weeklyReview) !== "no") {
    rhythm[0].items.push({ time: "19:00", label: "Weekly review (10 min)", kind: "review" });
    drafts.push({ key: "onb:task:review", kind: "task", label: "Weekly review", checked: true, detail: "Sundays · 7:00 PM · 10 min",
      reason: "You asked for a weekly review. It reads your real logs in Coach.", task: { repeat: { type: "weekly", days: [0] }, dueTime: "19:00", durationMin: 10, tags: ["review"] } });
  }

  const firstHabit = drafts.find((d) => d.kind === "habit");
  const nextAction = top === "academics" ? "Start a 25-minute focus block on your most important subject." :
    top === "training" && active(a) ? `Log your next session, tagged with ${arr(a.skills)[0] || "the skill you're working on"}.` :
    firstHabit ? `Do "${firstHabit.label}" today and check it off.` : "Add the one task that would make today a good day.";

  return { summary, priorities, drafts, rhythm, nextAction, facts };
}

export function rhythmDayName(d: number) { return DAY_LONG[d]; }
