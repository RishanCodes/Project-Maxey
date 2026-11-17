/**
 * Insights Mode: deterministic, rule-based observations from stored records. No language model.
 * Each insight states what the logs show, what that may mean, one practical action, and what the
 * data cannot tell. Rules need a minimum amount of data before they say anything.
 */
import { addDays, type DateKey } from "./dates";
import { focusInRange, goalProgress, habitConsistency, pct, taskCompletion, trainingInRange, trainingLoad, wellnessSeries, type Snapshot } from "./stats";
import type { Task } from "./schema";

export interface Insight {
  id: string;
  area: "habits" | "training" | "tasks" | "focus" | "wellness" | "goals";
  title: string;
  shows: string;
  meaning: string;
  action: string;
  limits: string;
  evidence: string[];
  weight: number; // higher = more relevant for the Today card
  link?: string;
}

export function buildInsights(s: Snapshot, today: DateKey, weekStart: 0 | 1, created: (t: Task) => DateKey): Insight[] {
  const out: Insight[] = [];
  const thisFrom = addDays(today, -6), lastFrom = addDays(today, -13), lastTo = addDays(today, -7);

  // Habits: this 7 days vs previous 7 days
  const hNow = habitConsistency(s, thisFrom, today, weekStart, today);
  const hPrev = habitConsistency(s, lastFrom, lastTo, weekStart, today);
  if (hNow.expected >= 3) {
    const weakest = hNow.per.filter((p) => p.expected >= 2).sort((a, b) => a.done / a.expected - b.done / b.expected)[0];
    const change = hPrev.expected >= 3 && hNow.rate !== null && hPrev.rate !== null ? hNow.rate - hPrev.rate : null;
    out.push({
      id: "habits-week", area: "habits", link: "/plan?view=habits",
      title: change === null ? "Habit consistency this week" : change >= 0.1 ? "Habits are trending up" : change <= -0.1 ? "Habits slipped this week" : "Habits are holding steady",
      shows: `You completed ${hNow.done} of ${hNow.expected} scheduled habit check-ins in the last 7 days (${pct(hNow.rate)}).` + (change !== null ? ` The 7 days before: ${hPrev.done} of ${hPrev.expected} (${pct(hPrev.rate)}).` : ""),
      meaning: weakest && weakest.done / weakest.expected < 0.6 ? `"${weakest.habit.label}" is the one most often missed (${weakest.done}/${weakest.expected}). It may be scheduled at a hard time or on too many days.` : "Your scheduled habits are mostly getting done.",
      action: weakest && weakest.done / weakest.expected < 0.6 ? `Consider fewer days for "${weakest.habit.label}", or attach it to something you already do.` : "Keep the current schedule. Add a habit only if this level feels easy.",
      limits: "Rest days, paused habits and days off-schedule are not counted as misses. The logs cannot tell why a habit was skipped.",
      evidence: hNow.per.filter((p) => p.expected > 0).map((p) => `${p.habit.label}: ${p.done}/${p.expected}`),
      weight: change !== null && change <= -0.1 ? 8 : 5,
    });
  }

  // Training volume and load
  const tNow = trainingInRange(s, thisFrom, today), tPrev = trainingInRange(s, lastFrom, lastTo);
  if (tNow.sessions + tPrev.sessions >= 2) {
    const diff = tNow.minutes - tPrev.minutes;
    const topFocus = Object.entries(tNow.byFocus).sort((a, b) => b[1] - a[1]).slice(0, 2).map(([k]) => k);
    out.push({
      id: "training-week", area: "training", link: "/training",
      title: "Training this week",
      shows: `${tNow.sessions} completed session${tNow.sessions === 1 ? "" : "s"}, ${tNow.minutes} minutes in the last 7 days (previous 7 days: ${tPrev.sessions} session${tPrev.sessions === 1 ? "" : "s"}, ${tPrev.minutes} minutes).` + (topFocus.length ? ` Most-tagged focus: ${topFocus.join(", ")}.` : ""),
      meaning: Math.abs(diff) < 30 ? "Your training volume is about the same as last week." : diff > 0 ? "You trained noticeably more than the week before." : "You trained noticeably less than the week before, which may be planned rest, a busy week, or a dip.",
      action: tNow.attempted > 0 ? `Your logged shooting this week: ${tNow.made}/${tNow.attempted} (${pct(tNow.shootingPct)}). Keep logging the same drill so comparisons stay fair.` : "If a skill matters most right now, tag it on each session so you can see where your time actually goes.",
      limits: "Minutes and tags describe what was logged, not how well it went. Unlogged practices are invisible here.",
      evidence: [`This week: ${tNow.minutes} min`, `Last week: ${tPrev.minutes} min`],
      weight: 4,
    });
  }
  const load = trainingLoad(s, today);
  if (load.dense) {
    out.push({
      id: "training-load", area: "training", link: "/wellness",
      title: "Dense training week",
      shows: `${load.last7Sessions} session${load.last7Sessions === 1 ? "" : "s"} and ${load.last7Minutes} minutes in the last 7 days` + (load.priorWeeklyAvg ? `, compared with about ${load.priorWeeklyAvg} minutes per week before that.` : "."),
      meaning: "A jump in load can leave you tired. It may be fine if you feel good.",
      action: "Consider an easier day or a planned rest day, and check in on sleep and energy.",
      limits: "This is a scheduling prompt, not a medical or injury assessment. If something hurts, talk to a trusted adult or a qualified professional.",
      evidence: [`Last 7 days: ${load.last7Minutes} min`, `Prior weekly average: ${load.priorWeeklyAvg} min`],
      weight: 9,
    });
  }

  // Tasks: overdue and completion rate
  const overdue = s.tasks.filter((t) => !t.archived && t.repeat.type === "none" && t.dueDate && t.dueDate < today && !s.taskCompletions.some((c) => c.taskId === t.id));
  const tc = taskCompletion(s, thisFrom, today, today, created);
  if (overdue.length >= 2 || tc.planned >= 4) {
    out.push({
      id: "tasks", area: "tasks", link: "/plan",
      title: overdue.length >= 2 ? `${overdue.length} tasks are overdue` : "Task follow-through",
      shows: `${tc.done} of ${tc.planned} planned task occurrences done in the last 7 days (${pct(tc.rate)}).` + (overdue.length ? ` Overdue: ${overdue.slice(0, 3).map((t) => t.title).join(", ")}${overdue.length > 3 ? "…" : ""}.` : ""),
      meaning: overdue.length >= 2 ? "Overdue items can make the plan feel heavier than it is." : "Most of what you plan is getting done.",
      action: overdue.length >= 2 ? "Reschedule or delete the overdue items so today's list reflects what you will really do." : "Keep today's list to three real priorities.",
      limits: "The app only knows what was planned here. It cannot judge whether a task mattered.",
      evidence: overdue.slice(0, 5).map((t) => `${t.title} (due ${t.dueDate})`),
      weight: overdue.length >= 2 ? 7 : 3,
    });
  }

  // Focus
  const f = focusInRange(s, thisFrom, today);
  if (f.sessions >= 2) {
    out.push({
      id: "focus", area: "focus", link: "/focus",
      title: "Focus time",
      shows: `${f.sessions} completed focus sessions, ${f.minutes} minutes in the last 7 days.`,
      meaning: "Completed sessions only; stopped sessions are not counted.",
      action: "Put your next session on the task you keep postponing.",
      limits: "Focus minutes measure time in the timer, not output quality.",
      evidence: [`${f.sessions} sessions`], weight: 2,
    });
  }

  // Wellness: sleep vs energy only with enough paired data
  const w = wellnessSeries(s, addDays(today, -27), today);
  const paired = w.rows.filter((r) => r.sleepHours !== undefined && r.energy !== undefined);
  if (paired.length >= 6) {
    const short = paired.filter((r) => (r.sleepHours as number) < 8), long = paired.filter((r) => (r.sleepHours as number) >= 8);
    if (short.length >= 2 && long.length >= 2) {
      const e = (rows: typeof paired) => rows.reduce((a, r) => a + (r.energy as number), 0) / rows.length;
      const gap = e(long) - e(short);
      out.push({
        id: "sleep-energy", area: "wellness", link: "/wellness",
        title: "Sleep and energy",
        shows: `On ${long.length} days with 8+ hours of sleep your average energy was ${e(long).toFixed(1)}/5; on ${short.length} days with less it was ${e(short).toFixed(1)}/5.`,
        meaning: gap >= 0.5 ? "Longer sleep has gone with better energy for you so far." : "So far there is no clear difference.",
        action: gap >= 0.5 ? "Protect bedtime before your most important days." : "Keep logging; patterns need more days.",
        limits: `Only ${paired.length} check-ins: a small sample, and correlation is not cause.`,
        evidence: [`${paired.length} check-ins with both values`], weight: gap >= 0.5 ? 4 : 1,
      });
    }
  }

  // Goals without movement
  for (const g of s.goals.filter((x) => x.status === "active")) {
    const ms = s.milestones.filter((m) => m.goalId === g.id);
    const lastMove = ms.map((m) => m.doneAt ?? "").sort().pop();
    const stale = ms.length > 0 && ms.some((m) => !m.doneAt) && (!lastMove || lastMove < addDays(today, -14));
    if (stale) {
      const p = goalProgress(g, s.milestones);
      out.push({
        id: `goal-${g.id}`, area: "goals", link: "/goals",
        title: `"${g.title}" has not moved in 2 weeks`,
        shows: `${p.done} of ${p.total} milestones done; none completed in the last 14 days.`,
        meaning: "The next milestone may be too big, or the goal may no longer be a priority.",
        action: "Split the next milestone into something you can finish this week, or archive the goal.",
        limits: "Progress outside milestones is not visible here.",
        evidence: ms.filter((m) => !m.doneAt).slice(0, 3).map((m) => `Open: ${m.title}`), weight: 3,
      });
    }
  }

  return out.sort((a, b) => b.weight - a.weight);
}

/** Weekly review: facts only, for the last 7 days. */
export function weeklyReview(s: Snapshot, today: DateKey, weekStart: 0 | 1, created: (t: Task) => DateKey) {
  const from = addDays(today, -6);
  const h = habitConsistency(s, from, today, weekStart, today);
  const t = taskCompletion(s, from, today, today, created);
  const tr = trainingInRange(s, from, today);
  const f = focusInRange(s, from, today);
  const w = wellnessSeries(s, from, today);
  const ms = s.milestones.filter((m) => m.doneAt && m.doneAt.slice(0, 10) >= from).length;
  return { from, to: today, habits: h, tasks: t, training: tr, focus: f, wellness: w, milestones: ms };
}
