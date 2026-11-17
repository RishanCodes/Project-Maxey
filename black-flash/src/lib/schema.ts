/**
 * BLACK FLASH data model (schema version 1).
 *
 * Every stored record is described here with Zod. The same schemas validate backup imports,
 * so an exported file round-trips with its ids intact. Dates the user thinks about ("today",
 * "due Friday") are local calendar strings `YYYY-MM-DD` in the user's chosen timezone;
 * moments in time (createdAt, completedAt) are ISO UTC timestamps.
 */
import { z } from "zod";

export const SCHEMA_VERSION = 1;

export const DateKey = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use a YYYY-MM-DD date");
export const TimeKey = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use a HH:MM time");
const Id = z.string().min(1).max(200);
const Iso = z.string().min(10);
const Stamps = { createdAt: Iso, updatedAt: Iso };
const Weekdays = z.array(z.number().int().min(0).max(6)).max(7);

/* ---------- preferences & onboarding ---------- */
export const AiConsent = z.object({
  goals: z.boolean(),
  habits: z.boolean(),
  tasks: z.boolean(),
  training: z.boolean(),
  wellness: z.boolean(),
  journal: z.boolean(),
});
export type AiConsent = z.infer<typeof AiConsent>;

export const OnboardingState = z.object({
  status: z.enum(["not_started", "in_progress", "completed", "defaults"]),
  index: z.number().int().min(0),
  completedAt: Iso.optional(),
  approvedAt: Iso.optional(),
});

export const Preferences = z.object({
  id: z.literal("prefs"),
  name: z.string().max(60),
  appName: z.string().min(1).max(40),
  timezone: z.string().min(1).max(64),
  weekStart: z.union([z.literal(0), z.literal(1)]),
  homeCard: z.enum(["priority", "workout", "study", "habit", "goal"]),
  /** Goal pinned as Today's focus (when homeCard is "goal"). */
  focusGoalId: Id.optional(),
  gamification: z.enum(["subtle", "balanced", "deep"]),
  coachStyle: z.enum(["direct", "balanced", "encouraging", "analytical"]),
  weeklyReview: z.boolean(),
  notifications: z.boolean(),
  aiConsent: AiConsent,
  focusMinutes: z.number().int().min(5).max(120),
  breakMinutes: z.number().int().min(1).max(60),
  onboarding: OnboardingState,
  ...Stamps,
});
export type Preferences = z.infer<typeof Preferences>;

export const OnboardingAnswer = z.object({
  id: Id, // question id
  value: z.unknown(),
  updatedAt: Iso,
});
export type OnboardingAnswer = z.infer<typeof OnboardingAnswer>;

/* ---------- tasks ---------- */
export const Repeat = z.discriminatedUnion("type", [
  z.object({ type: z.literal("none") }),
  z.object({ type: z.literal("daily") }),
  z.object({ type: z.literal("weekly"), days: Weekdays.min(1) }),
]);
export type Repeat = z.infer<typeof Repeat>;

export const Task = z.object({
  id: Id,
  title: z.string().trim().min(1, "Give the task a title").max(140),
  description: z.string().max(2000),
  tags: z.array(z.string().max(30)).max(12),
  priority: z.enum(["high", "medium", "low"]),
  dueDate: DateKey.optional(),
  dueTime: TimeKey.optional(),
  durationMin: z.number().int().min(1).max(1440).optional(),
  repeat: Repeat,
  goalId: Id.optional(),
  order: z.number(),
  archived: z.boolean(),
  seedKey: z.string().max(80).optional(),
  ...Stamps,
});
export type Task = z.infer<typeof Task>;

/** One completion of one task occurrence. `date` is the occurrence date, or "once" for one-off tasks. */
export const TaskCompletion = z.object({
  id: Id,
  taskId: Id,
  date: z.union([DateKey, z.literal("once")]),
  completedAt: Iso,
});
export type TaskCompletion = z.infer<typeof TaskCompletion>;

/* ---------- habits ---------- */
export const HabitSchedule = z.discriminatedUnion("type", [
  z.object({ type: z.literal("daily") }),
  z.object({ type: z.literal("weekdays"), days: Weekdays.min(1) }),
  z.object({ type: z.literal("perWeek"), count: z.number().int().min(1).max(7) }),
]);
export type HabitSchedule = z.infer<typeof HabitSchedule>;

export const Habit = z.object({
  id: Id,
  label: z.string().trim().min(1, "Name the habit").max(80),
  purpose: z.string().max(300),
  category: z.string().max(30),
  schedule: HabitSchedule,
  reminderTime: TimeKey.optional(),
  status: z.enum(["active", "paused", "archived"]),
  pauses: z.array(z.object({ from: DateKey, to: DateKey.optional() })),
  startDate: DateKey,
  seedKey: z.string().max(80).optional(),
  ...Stamps,
});
export type Habit = z.infer<typeof Habit>;

export const HabitCompletion = z.object({
  id: Id,
  habitId: Id,
  date: DateKey,
  state: z.enum(["done", "rest"]),
  at: Iso,
});
export type HabitCompletion = z.infer<typeof HabitCompletion>;

/* ---------- routines ---------- */
export const Routine = z.object({
  id: Id,
  name: z.string().trim().min(1, "Name the routine").max(60),
  days: Weekdays,
  steps: z.array(z.object({ id: Id, label: z.string().trim().min(1).max(80) })).max(30),
  active: z.boolean(),
  ...Stamps,
});
export type Routine = z.infer<typeof Routine>;

export const RoutineStepCompletion = z.object({
  id: Id,
  routineId: Id,
  stepId: Id,
  date: DateKey,
  at: Iso,
});
export type RoutineStepCompletion = z.infer<typeof RoutineStepCompletion>;

/* ---------- goals ---------- */
export const Goal = z.object({
  id: Id,
  title: z.string().trim().min(1, "Describe the goal").max(120),
  why: z.string().max(600),
  area: z.string().max(30),
  deadline: DateKey.optional(),
  status: z.enum(["active", "done", "archived"]),
  /** Manually set progress 0-100. Shown labeled as manual; overrides milestone math when set. */
  manualProgress: z.number().min(0).max(100).nullable(),
  linkedHabitIds: z.array(Id),
  seedKey: z.string().max(80).optional(),
  ...Stamps,
});
export type Goal = z.infer<typeof Goal>;

export const Milestone = z.object({
  id: Id,
  goalId: Id,
  title: z.string().trim().min(1, "Name the milestone").max(120),
  order: z.number(),
  doneAt: Iso.optional(),
  ...Stamps,
});
export type Milestone = z.infer<typeof Milestone>;

/* ---------- training ---------- */
export const ACTIVITIES = ["basketball", "volleyball", "strength", "mobility", "walking", "custom"] as const;
export const SESSION_TYPES = ["team_practice", "game", "independent", "gym", "recovery"] as const;
export const FOCUS_AREAS = ["finishing", "shooting", "ball handling", "decision-making", "defense", "change of pace", "conditioning", "explosiveness"] as const;

export const Drill = z.object({
  id: Id,
  name: z.string().trim().min(1).max(80),
  sets: z.number().int().min(0).max(50).optional(),
  reps: z.number().int().min(0).max(500).optional(),
  durationMin: z.number().min(0).max(300).optional(),
  notes: z.string().max(300).optional(),
  done: z.boolean(),
});
export type Drill = z.infer<typeof Drill>;

export const ShotRecord = z.object({
  id: Id,
  label: z.string().trim().min(1).max(40),
  made: z.number().int().min(0).max(5000),
  attempted: z.number().int().min(0).max(5000),
}).refine((s) => s.made <= s.attempted, { message: "Makes cannot exceed attempts", path: ["made"] });
export type ShotRecord = z.infer<typeof ShotRecord>;

export const TrainingSession = z.object({
  id: Id,
  date: DateKey,
  startTime: TimeKey.optional(),
  activity: z.enum(ACTIVITIES),
  customActivity: z.string().max(40).optional(),
  type: z.enum(SESSION_TYPES),
  durationMin: z.number().int().min(1, "Duration must be at least 1 minute").max(600),
  effort: z.number().int().min(1).max(10).optional(),
  energy: z.number().int().min(1).max(5).optional(),
  soreness: z.number().int().min(1).max(5).optional(),
  focusAreas: z.array(z.string().max(30)).max(12),
  notes: z.string().max(2000),
  status: z.enum(["planned", "completed"]),
  drills: z.array(Drill).max(40),
  shots: z.array(ShotRecord).max(20),
  ...Stamps,
});
export type TrainingSession = z.infer<typeof TrainingSession>;

/* ---------- wellness ---------- */
export const DailyCheckin = z.object({
  id: DateKey, // one per local date
  date: DateKey,
  sleepHours: z.number().min(0).max(16).optional(),
  sleepQuality: z.number().int().min(1).max(5).optional(),
  energy: z.number().int().min(1).max(5).optional(),
  mood: z.number().int().min(1).max(5).optional(),
  soreness: z.number().int().min(1).max(5).optional(),
  restDay: z.boolean(),
  note: z.string().max(1000),
  ...Stamps,
});
export type DailyCheckin = z.infer<typeof DailyCheckin>;

export const MealEntry = z.object({
  id: Id,
  date: DateKey,
  time: TimeKey.optional(),
  description: z.string().trim().min(1, "Describe the meal").max(300),
  notes: z.string().max(500),
  hydration: z.string().max(120),
  ...Stamps,
});
export type MealEntry = z.infer<typeof MealEntry>;

/* ---------- focus & journal ---------- */
export const FocusSession = z.object({
  id: Id,
  label: z.string().max(80),
  plannedMin: z.number().int().min(1).max(240),
  actualMin: z.number().min(0).max(1440),
  startedAt: Iso,
  completedAt: Iso,
  date: DateKey,
  taskId: Id.optional(),
});
export type FocusSession = z.infer<typeof FocusSession>;

export const JournalEntry = z.object({
  id: Id,
  date: DateKey,
  title: z.string().max(120),
  body: z.string().max(20000),
  tags: z.array(z.string().max(30)).max(12),
  ...Stamps,
});
export type JournalEntry = z.infer<typeof JournalEntry>;

/* ---------- progression ---------- */
export const XP_SOURCES = ["task", "habit", "training", "checkin", "milestone", "focus"] as const;
export const XpEvent = z.object({
  id: Id,
  /** Stable source key, e.g. "task:<taskId>:<date>". One active award per key. */
  key: z.string().min(1).max(160),
  sourceType: z.enum(XP_SOURCES),
  sourceId: z.string().max(140),
  kind: z.enum(["award", "reversal"]),
  amount: z.number().int(),
  /** Local date the action happened on (used for the daily cap). */
  date: DateKey,
  at: Iso,
  label: z.string().max(160),
});
export type XpEvent = z.infer<typeof XpEvent>;

export const AchievementUnlock = z.object({
  id: Id, // achievement id
  unlockedAt: Iso,
  detail: z.string().max(200),
});
export type AchievementUnlock = z.infer<typeof AchievementUnlock>;

/* ---------- coach (live AI only) ---------- */
export const CoachMessage = z.object({
  id: Id,
  role: z.enum(["user", "assistant"]),
  content: z.string().max(20000),
  at: Iso,
  context: z.array(z.string().max(30)).max(10),
});
export type CoachMessage = z.infer<typeof CoachMessage>;

/* ---------- small key-value store (active timer, misc) ---------- */
export const KvEntry = z.object({ key: z.string().min(1).max(60), value: z.unknown() });
export type KvEntry = z.infer<typeof KvEntry>;

export const ActiveTimer = z.object({
  id: Id,
  label: z.string().max(80),
  plannedMin: z.number().int().min(1).max(240),
  startedAtMs: z.number(),
  pausedAtMs: z.number().nullable(),
  pausedTotalMs: z.number().min(0),
  taskId: Id.optional(),
});
export type ActiveTimer = z.infer<typeof ActiveTimer>;

/* ---------- backup file ---------- */
export const TABLES = [
  "prefs", "answers", "tasks", "taskCompletions", "habits", "habitCompletions", "routines", "routineCompletions",
  "goals", "milestones", "training", "checkins", "meals", "focus", "journal", "xp", "achievements", "coach",
] as const;
export type TableName = (typeof TABLES)[number];

export const BackupData = z.object({
  prefs: z.array(Preferences).max(1),
  answers: z.array(OnboardingAnswer),
  tasks: z.array(Task),
  taskCompletions: z.array(TaskCompletion),
  habits: z.array(Habit),
  habitCompletions: z.array(HabitCompletion),
  routines: z.array(Routine),
  routineCompletions: z.array(RoutineStepCompletion),
  goals: z.array(Goal),
  milestones: z.array(Milestone),
  training: z.array(TrainingSession),
  checkins: z.array(DailyCheckin),
  meals: z.array(MealEntry),
  focus: z.array(FocusSession),
  journal: z.array(JournalEntry),
  xp: z.array(XpEvent),
  achievements: z.array(AchievementUnlock),
  coach: z.array(CoachMessage),
});
export type BackupData = z.infer<typeof BackupData>;

export const BackupFile = z.object({
  app: z.literal("black-flash"),
  schemaVersion: z.number().int().min(1),
  exportedAt: Iso,
  data: BackupData,
});
export type BackupFile = z.infer<typeof BackupFile>;
