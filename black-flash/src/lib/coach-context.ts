import { addDays, type DateKey } from "./dates";
import { consistency, describeSchedule } from "./recurrence";
import { goalProgress, trainingInRange, wellnessSeries, type Snapshot } from "./stats";
import type { AiConsent, JournalEntry } from "./schema";

export type ContextKey = keyof AiConsent;
export const CONTEXT_LABEL: Record<ContextKey, string> = { goals: "Goals", habits: "Habits", tasks: "Tasks", training: "Training", wellness: "Wellness", journal: "Journal" };

/** Plain-text summary of only the selected categories within the date range. Shown to the user before sending. */
export function buildCoachContext(s: Snapshot, journal: JournalEntry[], keys: ContextKey[], today: DateKey, days: number, weekStart: 0 | 1): string {
  const from = addDays(today, -(days - 1));
  const parts: string[] = [`Today is ${today}. Range: ${from} to ${today}.`];
  if (keys.includes("goals")) parts.push("GOALS:\n" + (s.goals.filter((g) => g.status === "active").map((g) => { const p = goalProgress(g, s.milestones); return `- ${g.title}${g.deadline ? ` (by ${g.deadline})` : ""}: ${p.pct ?? "no"}% ${p.source === "manual" ? "(manual)" : `(${p.done}/${p.total} milestones)`}`; }).join("\n") || "none"));
  if (keys.includes("habits")) parts.push("HABITS:\n" + (s.habits.filter((h) => h.status !== "archived").map((h) => { const c = consistency(h, s.habitCompletions, from, today, weekStart, today); return `- ${h.label} [${describeSchedule(h)}${h.status === "paused" ? ", paused" : ""}]: ${c.done}/${c.expected} scheduled check-ins`; }).join("\n") || "none"));
  if (keys.includes("tasks")) {
    const open = s.tasks.filter((t) => !t.archived && t.repeat.type === "none" && !s.taskCompletions.some((c) => c.taskId === t.id));
    parts.push("OPEN TASKS:\n" + (open.slice(0, 25).map((t) => `- ${t.title} (${t.priority}${t.dueDate ? `, due ${t.dueDate}` : ""})`).join("\n") || "none"));
  }
  if (keys.includes("training")) {
    const tr = trainingInRange(s, from, today);
    const list = s.training.filter((t) => t.date >= from && t.date <= today).sort((a, b) => a.date.localeCompare(b.date));
    parts.push(`TRAINING: ${tr.sessions} completed sessions, ${tr.minutes} min.${tr.attempted ? ` Shots ${tr.made}/${tr.attempted}.` : ""}\n` + list.slice(-20).map((t) => `- ${t.date} ${t.status} ${t.activity}${t.customActivity ? `(${t.customActivity})` : ""} ${t.type} ${t.durationMin}min${t.effort ? ` effort ${t.effort}/10` : ""}${t.focusAreas.length ? ` focus: ${t.focusAreas.join(", ")}` : ""}`).join("\n"));
  }
  if (keys.includes("wellness")) {
    const w = wellnessSeries(s, from, today);
    parts.push(`WELLNESS (self-reported): ${w.rows.length} check-ins, avg sleep ${w.sleep.avg?.toFixed(1) ?? "n/a"} h, energy ${w.energy.avg?.toFixed(1) ?? "n/a"}/5, mood ${w.mood.avg?.toFixed(1) ?? "n/a"}/5, rest days ${w.restDays}.`);
  }
  if (keys.includes("journal")) parts.push("JOURNAL (user explicitly shared):\n" + (journal.filter((j) => j.date >= from).slice(0, 10).map((j) => `- ${j.date} ${j.title}: ${j.body.slice(0, 400)}`).join("\n") || "none"));
  return parts.join("\n\n");
}

export interface Proposal { type: "create_task" | "create_habit"; title?: string; label?: string; dueDate?: string; perWeek?: number }
export function extractProposals(text: string): { body: string; proposals: Proposal[] } {
  const m = text.match(/```proposals\s*([\s\S]*?)```/);
  if (!m) return { body: text, proposals: [] };
  try {
    const obj = JSON.parse(m[1]);
    const list: Proposal[] = Array.isArray(obj?.proposals) ? obj.proposals.filter((p: Proposal) => (p.type === "create_task" && p.title) || (p.type === "create_habit" && p.label)).slice(0, 5) : [];
    return { body: text.replace(m[0], "").trim(), proposals: list };
  } catch { return { body: text.replace(m[0], "").trim(), proposals: [] }; }
}
