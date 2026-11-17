import { getDb } from "./db";
import { createHabit, createTask, evaluateAchievements, getPrefs, nowIso, updateHabit, updatePrefs, updateTask } from "./repo";
import { buildAssessment, type Answers, type DraftItem } from "./onboarding";
import type { AiConsent, Preferences } from "./schema";

/** Applies preference answers (coach style, home card, gamification, review, AI consent, name). */
export async function applyAnswerPreferences(a: Answers): Promise<Preferences> {
  const cur = await getPrefs();
  const ai = Array.isArray(a.aiCategories) ? (a.aiCategories as string[]) : [];
  const consent: AiConsent = { ...cur.aiConsent, goals: ai.includes("goals"), habits: ai.includes("habits"), tasks: ai.includes("tasks"), training: ai.includes("training"), wellness: ai.includes("wellness"), journal: false };
  const pick = <T extends string>(v: unknown, allowed: readonly T[], fallback: T): T => (allowed.includes(v as T) ? (v as T) : fallback);
  return updatePrefs({
    name: typeof a.name === "string" ? a.name.trim().slice(0, 60) : cur.name,
    coachStyle: pick(a.coachStyle, ["direct", "balanced", "encouraging", "analytical"] as const, cur.coachStyle),
    homeCard: pick(a.homeCard, ["priority", "workout", "study", "habit"] as const, cur.homeCard),
    gamification: pick(a.gamification, ["subtle", "balanced", "deep"] as const, cur.gamification),
    weeklyReview: a.weeklyReview === undefined ? cur.weeklyReview : a.weeklyReview === "yes",
    notifications: a.reminderStyle === "notify",
    aiConsent: consent,
  });
}

/**
 * Creates (or updates) only the items the user approved. Each item has a stable seed key, so
 * approving again after a retake updates the same habit/task instead of creating a duplicate.
 */
export async function approveDrafts(items: DraftItem[]): Promise<{ created: number; updated: number }> {
  const db = getDb();
  let created = 0, updated = 0;
  for (const it of items) {
    if (!it.checked) continue;
    if (it.kind === "habit" && it.habit) {
      const ex = await db.habits.where("seedKey").equals(it.key).first();
      if (ex) { await updateHabit(ex.id, { label: it.label, purpose: it.habit.purpose, category: it.habit.category, schedule: it.habit.schedule }); updated++; }
      else { await createHabit({ label: it.label, purpose: it.habit.purpose, category: it.habit.category, schedule: it.habit.schedule, seedKey: it.key }); created++; }
    } else if (it.kind === "task" && it.task) {
      const ex = await db.tasks.where("seedKey").equals(it.key).first();
      const body = { title: it.label, description: it.reason, tags: it.task.tags, priority: "medium" as const, repeat: it.task.repeat, dueTime: it.task.dueTime, durationMin: it.task.durationMin, seedKey: it.key };
      if (ex) { await updateTask(ex.id, body); updated++; }
      else { await createTask(body); created++; }
    }
  }
  const p = await getPrefs();
  await updatePrefs({ onboarding: { ...p.onboarding, status: "completed", completedAt: p.onboarding.completedAt ?? nowIso(), approvedAt: nowIso() } });
  await evaluateAchievements();
  return { created, updated };
}

export async function finishWithoutPlan(): Promise<void> {
  const p = await getPrefs();
  await updatePrefs({ onboarding: { ...p.onboarding, status: "completed", completedAt: nowIso() } });
}

export { buildAssessment };
