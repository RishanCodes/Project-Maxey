import Dexie, { type EntityTable } from "dexie";
import type {
  AchievementUnlock, CoachMessage, DailyCheckin, FocusSession, Goal, Habit, HabitCompletion, JournalEntry, KvEntry,
  MealEntry, Milestone, OnboardingAnswer, Preferences, Routine, RoutineStepCompletion, Task, TaskCompletion, TrainingSession, XpEvent,
} from "./schema";

/**
 * Local-first storage in IndexedDB. Data persists in this browser profile until the user clears
 * site data. Schema changes must add a new `version(n)` with an upgrade function; never edit an
 * existing version in place.
 */
export class BlackFlashDB extends Dexie {
  prefs!: EntityTable<Preferences, "id">;
  answers!: EntityTable<OnboardingAnswer, "id">;
  tasks!: EntityTable<Task, "id">;
  taskCompletions!: EntityTable<TaskCompletion, "id">;
  habits!: EntityTable<Habit, "id">;
  habitCompletions!: EntityTable<HabitCompletion, "id">;
  routines!: EntityTable<Routine, "id">;
  routineCompletions!: EntityTable<RoutineStepCompletion, "id">;
  goals!: EntityTable<Goal, "id">;
  milestones!: EntityTable<Milestone, "id">;
  training!: EntityTable<TrainingSession, "id">;
  checkins!: EntityTable<DailyCheckin, "id">;
  meals!: EntityTable<MealEntry, "id">;
  focus!: EntityTable<FocusSession, "id">;
  journal!: EntityTable<JournalEntry, "id">;
  xp!: EntityTable<XpEvent, "id">;
  achievements!: EntityTable<AchievementUnlock, "id">;
  coach!: EntityTable<CoachMessage, "id">;
  kv!: EntityTable<KvEntry, "key">;

  constructor(name = "black-flash") {
    super(name);
    this.version(1).stores({
      prefs: "id",
      answers: "id",
      tasks: "id, dueDate, goalId, archived, seedKey, order",
      taskCompletions: "id, taskId, date, &[taskId+date]",
      habits: "id, status, seedKey",
      habitCompletions: "id, habitId, date, &[habitId+date]",
      routines: "id",
      routineCompletions: "id, routineId, date, &[routineId+stepId+date]",
      goals: "id, status, seedKey",
      milestones: "id, goalId, order",
      training: "id, date, status",
      checkins: "id, date",
      meals: "id, date",
      focus: "id, date",
      journal: "id, date",
      xp: "id, key, date, sourceType",
      achievements: "id",
      coach: "id, at",
      kv: "key",
    });
  }
}

let instance: BlackFlashDB | null = null;
export function getDb(): BlackFlashDB {
  if (!instance) instance = new BlackFlashDB();
  return instance;
}
/** Tests use a separate database per case. */
export function setDb(db: BlackFlashDB) { instance = db; }

export const ALL_TABLES = [
  "prefs", "answers", "tasks", "taskCompletions", "habits", "habitCompletions", "routines", "routineCompletions",
  "goals", "milestones", "training", "checkins", "meals", "focus", "journal", "xp", "achievements", "coach",
] as const;
