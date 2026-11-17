"use client";
import { play } from "@/lib/sound";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { BookOpen, ChevronRight, Circle, CircleCheck, Dumbbell, Info, Repeat, Sparkles, Target } from "lucide-react";
import { Button, Card, EmptyState, Eyebrow, ProgressBar, Skeleton, cx } from "@/components/ui";
import { useToast } from "@/components/toast";
import { TaskForm } from "@/components/forms/task-form";
import { HabitForm } from "@/components/forms/habit-form";
import { TrainingForm } from "@/components/forms/training-form";
import { useCreatedDate, usePrefs, useSnapshot, useToday } from "@/hooks/use-data";
import { completeTask, markHabit, uncompleteTask, unmarkHabit, activityName } from "@/lib/repo";
import { formatDateKey, formatTime, greeting } from "@/lib/dates";
import { goalProgress, todayPlan } from "@/lib/stats";
import { buildInsights } from "@/lib/insights";
import { MAX_TODAY_PRIORITIES } from "@/lib/config";
import type { Habit, Task, TrainingSession } from "@/lib/schema";
import type { TaskOccurrence } from "@/lib/recurrence";

type Row = { kind: "task"; occ: TaskOccurrence } | { kind: "habit"; habit: Habit; done: boolean };

export default function TodayPage() {
  const prefs = usePrefs();
  const snap = useSnapshot();
  const { today, minutes } = useToday(prefs?.timezone);
  const created = useCreatedDate(prefs?.timezone);
  const toast = useToast();
  const router = useRouter();
  const [editTask, setEditTask] = useState<Task | undefined>();
  const [editHabit, setEditHabit] = useState<Habit | undefined>();
  const [logSession, setLogSession] = useState<TrainingSession | undefined>();
  const [newTask, setNewTask] = useState(false);
  const [why, setWhy] = useState(false);

  const plan = useMemo(() => (snap && prefs ? todayPlan(snap, today, prefs.weekStart, created) : null), [snap, prefs, today, created]);
  const insight = useMemo(() => (snap && prefs ? buildInsights(snap, today, prefs.weekStart, created)[0] : undefined), [snap, prefs, today, created]);
  if (!prefs || !snap || !plan) return <div className="flex flex-col gap-4"><Skeleton className="h-6 w-40" /><Skeleton className="h-10 w-64" /><Skeleton className="h-44" /><Skeleton className="h-16" /><Skeleton className="h-16" /></div>;

  const nextTraining = snap.training.filter((t) => t.status === "planned" && t.date >= today).sort((a, b) => (a.date + (a.startTime ?? "")).localeCompare(b.date + (b.startTime ?? "")))[0];
  const openTasks = plan.occurrences.filter((o) => !o.done);
  const openHabits = plan.dueHabits.filter((h) => !plan.doneHabitIds.has(h.id));

  // Hero: the user's chosen home card, falling back to whatever exists.
  type Hero = { label: string; title: string; meta: string; cta: string; act: () => void; icon: typeof Dumbbell; taskId?: string; habitId?: string };
  const studyTask = openTasks.find((o) => o.task.tags.some((t) => /study|school|homework/i.test(t)));
  const heroFor = (card: typeof prefs.homeCard): Hero | null => {
    if (card === "workout" && nextTraining) return { label: "Next workout", title: activityName(nextTraining), meta: [nextTraining.date === today ? "Today" : formatDateKey(nextTraining.date), formatTime(nextTraining.startTime), `${nextTraining.durationMin} min`].filter(Boolean).join(" · "), cta: nextTraining.date === today ? "Log it" : "Open", act: () => setLogSession(nextTraining), icon: Dumbbell };
    if (card === "study" && studyTask) return { label: "Study focus", title: studyTask.task.title, meta: [studyTask.task.dueTime && formatTime(studyTask.task.dueTime), studyTask.task.durationMin && `${studyTask.task.durationMin} min`].filter(Boolean).join(" · ") || "Today", cta: "Start focus", act: () => router.push(`/focus?task=${studyTask.task.id}`), icon: BookOpen, taskId: studyTask.task.id };
    if (card === "habit" && openHabits.length) return { label: "Habits due", title: openHabits[0].label, meta: `${openHabits.length} habit${openHabits.length > 1 ? "s" : ""} left today`, cta: "Check off", act: () => toggleHabit(openHabits[0], false), icon: Repeat, habitId: openHabits[0].id };
    if (card === "goal") {
      const goal = snap.goals.find((g) => g.id === prefs.focusGoalId && g.status === "active") ?? snap.goals.find((g) => g.status === "active");
      if (goal) {
        const p = goalProgress(goal, snap.milestones);
        const next = snap.milestones.filter((m) => m.goalId === goal.id && !m.doneAt).sort((a, b) => a.order - b.order)[0];
        return { label: "Goal focus", title: goal.title, meta: [next ? `Next: ${next.title}` : p.total ? "All milestones done" : "Add milestones to track progress", goal.deadline && `by ${formatDateKey(goal.deadline)}`].filter(Boolean).join(" · "), cta: "Open goal", act: () => router.push("/goals"), icon: Target };
      }
    }
    if (card === "priority" && openTasks[0]) { const o = openTasks[0]; return { label: o.overdue ? "Overdue priority" : "Top priority", title: o.task.title, meta: [o.task.dueTime && formatTime(o.task.dueTime), o.task.durationMin && `${o.task.durationMin} min`, `${o.task.priority} priority`].filter(Boolean).join(" · "), cta: "Mark done", act: () => toggleTask(o), icon: CircleCheck, taskId: o.task.id }; }
    return null;
  };
  const hero = heroFor(prefs.homeCard) ?? heroFor("priority") ?? heroFor("habit") ?? heroFor("workout") ?? heroFor("study");

  const rows: Row[] = [
    ...plan.occurrences.filter((o) => o.task.id !== hero?.taskId).map((occ) => ({ kind: "task" as const, occ })),
    ...plan.dueHabits.filter((h) => h.id !== hero?.habitId).map((habit) => ({ kind: "habit" as const, habit, done: plan.doneHabitIds.has(habit.id) })),
  ].sort((a, b) => Number(a.kind === "task" ? a.occ.done : a.done) - Number(b.kind === "task" ? b.occ.done : b.done)).slice(0, MAX_TODAY_PRIORITIES);

  async function toggleTask(o: TaskOccurrence) {
    if (o.done) { await uncompleteTask(o.task.id, o.date); play("undo"); toast("Marked not done"); return; }
    const xp = await completeTask(o.task.id, o.date);
    play("complete");
    toast(`Done: ${o.task.title}${xp ? ` (+${xp} XP)` : ""}`, () => uncompleteTask(o.task.id, o.date));
  }
  async function toggleHabit(h: Habit, done: boolean) {
    if (done) { await unmarkHabit(h.id, today); play("undo"); toast("Habit unchecked"); return; }
    const xp = await markHabit(h.id, today, "done");
    play("habit");
    toast(`${h.label}${xp ? ` (+${xp} XP)` : ""}`, () => unmarkHabit(h.id, today));
  }

  const nothingYet = snap.tasks.length === 0 && snap.habits.length === 0 && snap.training.length === 0 && !snap.goals.some((g) => g.status === "active");
  const nextEvent = nextTraining ? `${activityName(nextTraining)} ${nextTraining.date === today ? formatTime(nextTraining.startTime) || "today" : formatDateKey(nextTraining.date)}` : null;

  return (
    <div className="flex flex-col gap-7">
      <header>
        <Eyebrow>{formatDateKey(today, { weekday: "long", month: "short", day: "numeric" })}</Eyebrow>
        <h1 className="mt-2 text-[34px] font-bold leading-[1.05] tracking-tight">{greeting(minutes)}{prefs.name ? `, ${prefs.name}` : ""}.</h1>
      </header>

      {nothingYet ? (
        <EmptyState icon={<Sparkles size={28} />} title="Build your first day" body="Add one task or habit, or use the plan drafted from your answers."
          action={<div className="flex flex-wrap justify-center gap-2"><Button variant="primary" onClick={() => setNewTask(true)}>Add a task</Button><Link href="/onboarding?step=results" className="inline-flex min-h-11 items-center rounded-xl bg-subtle px-4 font-semibold">Use my starter plan</Link></div>} />
      ) : (
        <Card className="relative overflow-hidden bg-graphite p-6" aria-label="Today's focus">
          <div className="speed-lines" aria-hidden="true" />
          <div className="relative flex items-start justify-between gap-4">
            <Eyebrow>{hero ? hero.label : "Today's focus"}</Eyebrow>
            {hero && <hero.icon size={22} className="text-muted" aria-hidden="true" />}
          </div>
          <span className="relative mt-4 block h-0.5 w-8 rounded-full bg-flash" aria-hidden="true" />
          <h2 className="relative mt-4 text-[26px] font-semibold leading-tight tracking-tight">{hero ? hero.title : plan.plannedCount ? "Everything planned is done" : "Nothing planned today"}</h2>
          <p className="relative mt-1 text-[15px] text-muted capitalize-first">{hero ? hero.meta : plan.plannedCount ? "Rest, review, or add something small." : "Add a task or check in on how you feel."}</p>
          {plan.plannedCount > 0 && (
            <div className="relative mt-6 flex items-center gap-3">
              <ProgressBar value={plan.doneCount / plan.plannedCount} label="Today's planned items completed" />
              <span className="tnum shrink-0 text-sm text-muted">{plan.doneCount}/{plan.plannedCount}</span>
            </div>
          )}
          {plan.plannedCount > 0 && <p className="relative mt-2 text-xs text-muted">{plan.doneCount} of {plan.plannedCount} items planned for today are done (tasks plus habits due today).</p>}
          {hero && <Button variant="primary" size="lg" className="relative mt-5" onClick={hero.act}>{hero.cta}</Button>}
        </Card>
      )}

      {rows.length > 0 && (
        <section aria-labelledby="pri-h">
          <div className="mb-3 flex items-end justify-between"><h2 id="pri-h" className="text-lg font-semibold">Your plan</h2><Link href="/plan" className="text-sm text-muted hover:text-ink">{plan.plannedCount} today</Link></div>
          <ul className="flex flex-col gap-2">
            {rows.map((r) => {
              const done = r.kind === "task" ? r.occ.done : r.done;
              const title = r.kind === "task" ? r.occ.task.title : r.habit.label;
              const meta = r.kind === "task" ? [r.occ.overdue && "Overdue", r.occ.task.dueTime && formatTime(r.occ.task.dueTime), r.occ.task.repeat.type !== "none" && "Repeats"].filter(Boolean).join(" · ") || `${r.occ.task.priority} priority` : "Habit";
              return (
                <li key={r.kind === "task" ? r.occ.task.id : r.habit.id} className="flex items-center rounded-2xl border border-line/70 bg-graphite/60">
                  <button className="flex min-h-16 min-w-0 flex-1 items-center gap-3 px-4 text-left" onClick={() => (r.kind === "task" ? setEditTask(r.occ.task) : setEditHabit(r.habit))}>
                    {r.kind === "habit" ? <Repeat size={18} className="shrink-0 text-muted" aria-hidden="true" /> : <CircleCheck size={18} className="shrink-0 text-muted" aria-hidden="true" />}
                    <span className="min-w-0"><span className={cx("block truncate font-medium", done && "text-muted line-through")}>{title}</span><span className={cx("block text-sm capitalize-first", r.kind === "task" && r.occ.overdue ? "text-red" : "text-muted")}>{meta}</span></span>
                  </button>
                  <button aria-label={done ? `Mark ${title} not done` : `Complete ${title}`} aria-pressed={done} className="flex size-14 shrink-0 items-center justify-center"
                    onClick={() => (r.kind === "task" ? toggleTask(r.occ) : toggleHabit(r.habit, r.done))}>
                    {done ? <CircleCheck size={26} className="pop text-flash" /> : <Circle size={26} className="text-muted" />}
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {!nothingYet && (
        <p className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
          <span>Tasks <b className="tnum text-ink">{plan.occurrences.filter((o) => o.done).length}/{plan.occurrences.length}</b></span>
          <span>Habits <b className="tnum text-ink">{plan.dueHabits.filter((h) => plan.doneHabitIds.has(h.id)).length}/{plan.dueHabits.length}</b></span>
          {nextEvent && <span>Next: <b className="text-ink">{nextEvent}</b></span>}
        </p>
      )}

      {insight && (
        <Card className="p-4">
          <div className="flex items-start gap-3">
            <Info size={18} className="mt-0.5 shrink-0 text-flash" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <p className="font-semibold">{insight.title}</p>
              <p className="mt-1 text-sm text-muted">{insight.action}</p>
              <button className="mt-2 inline-flex min-h-9 items-center text-sm font-semibold text-flash" aria-expanded={why} onClick={() => setWhy(!why)}>Why this suggestion?</button>
              {why && <div className="mt-1 space-y-1 text-sm text-muted"><p>{insight.shows}</p><p>{insight.limits}</p><p className="text-xs">Rule-based insight from your logs. No AI involved.</p></div>}
            </div>
            {insight.link && <Link href={insight.link} aria-label="Open related section" className="flex size-10 items-center justify-center text-muted"><ChevronRight size={18} /></Link>}
          </div>
        </Card>
      )}

      <TaskForm open={newTask || !!editTask} onOpenChange={(o) => { if (!o) { setNewTask(false); setEditTask(undefined); } }} task={editTask} defaultDate={today} />
      <HabitForm open={!!editHabit} onOpenChange={(o) => !o && setEditHabit(undefined)} habit={editHabit} />
      <TrainingForm open={!!logSession} onOpenChange={(o) => !o && setLogSession(undefined)} session={logSession ? { ...logSession, status: logSession.date <= today ? "completed" : "planned" } : undefined} defaultDate={today} />
    </div>
  );
}
