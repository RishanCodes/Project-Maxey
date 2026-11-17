"use client";
import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Check, Circle, CircleCheck, Plus, Target, Trash2 } from "lucide-react";
import { Button, Chip, ConfirmSheet, EmptyState, Field, IconButton, Input, ProgressBar, Sheet, Skeleton, Switch, TextArea, cx } from "@/components/ui";
import { useToast } from "@/components/toast";
import { usePrefs, useSnapshot, useToday } from "@/hooks/use-data";
import { getDb } from "@/lib/db";
import { addMilestone, deleteGoal, deleteMilestone, saveGoal, setMilestoneDone, updatePrefs } from "@/lib/repo";
import { daysBetween, formatDateKey } from "@/lib/dates";
import { goalProgress } from "@/lib/stats";
import { describeSchedule } from "@/lib/recurrence";
import type { Goal } from "@/lib/schema";

const AREAS = ["Training", "Academics", "Habits", "Focus", "Wellbeing", "Creative", "Other"];

export default function GoalsPage() {
  const prefs = usePrefs(); const snap = useSnapshot(); const { today } = useToday(prefs?.timezone);
  const [open, setOpen] = useState<Goal | "new" | null>(null);
  const [showDone, setShowDone] = useState(false);
  if (!prefs || !snap) return <Skeleton className="h-64" />;
  const goals = snap.goals.filter((g) => (showDone ? g.status !== "active" : g.status === "active"));
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-end justify-between"><h1 className="text-3xl font-bold tracking-tight">Goals</h1><Button variant="primary" size="sm" onClick={() => setOpen("new")}><Plus size={16} />New goal</Button></div>
      <Switch checked={showDone} onChange={setShowDone} label="Show completed and archived" />
      {goals.length === 0 ? <EmptyState icon={<Target size={28} />} title={showDone ? "Nothing here yet" : "No active goals"} body="A good goal is specific and broken into milestones you can check off. Deadlines are optional." action={!showDone ? <Button variant="primary" onClick={() => setOpen("new")}>Create a goal</Button> : undefined} /> : (
        <ul className="flex flex-col gap-3">{goals.map((g) => {
          const p = goalProgress(g, snap.milestones);
          const linked = snap.tasks.filter((t) => t.goalId === g.id && !t.archived).length;
          return (
            <li key={g.id}><button onClick={() => setOpen(g)} className="w-full rounded-[var(--radius-card)] border border-line/70 bg-graphite/60 p-5 text-left">
              <div className="flex items-start justify-between gap-3"><b className="text-lg">{g.title}</b>{g.deadline && <span className={cx("shrink-0 text-xs", daysBetween(today, g.deadline) < 0 ? "text-red" : "text-muted")}>{daysBetween(today, g.deadline) < 0 ? "Past " : "By "}{formatDateKey(g.deadline)}</span>}</div>
              <div className="mt-3 flex items-center gap-3"><ProgressBar value={(p.pct ?? 0) / 100} label={`${g.title} progress`} accent={false} /><span className="tnum shrink-0 text-sm text-muted">{p.pct === null ? "—" : `${p.pct}%`}</span></div>
              <p className="mt-2 text-xs text-muted">{p.source === "manual" ? "Manually set progress" : p.source === "milestones" ? `${p.done} of ${p.total} milestones` : "Add milestones to track progress"}{linked ? ` · ${linked} linked task${linked > 1 ? "s" : ""}` : ""}</p>
            </button></li>);
        })}</ul>)}
      <GoalSheet goal={open} onClose={() => setOpen(null)} />
    </div>
  );
}

function GoalSheet({ goal, onClose }: { goal: Goal | "new" | null; onClose: () => void }) {
  const toast = useToast();
  const isNew = goal === "new";
  const g = goal && goal !== "new" ? goal : undefined;
  const milestones = useLiveQuery(async () => (g ? await getDb().milestones.where("goalId").equals(g.id).sortBy("order") : []), [g?.id]) ?? [];
  const habits = useLiveQuery(() => getDb().habits.filter((h) => h.status !== "archived").toArray(), []) ?? [];
  const live = useLiveQuery(async () => (g ? await getDb().goals.get(g.id) : undefined), [g?.id]);
  const cur = live ?? g;
  const [title, setTitle] = useState(""); const [why, setWhy] = useState(""); const [area, setArea] = useState("Training"); const [deadline, setDeadline] = useState("");
  const [manual, setManual] = useState<number | null>(null); const [linked, setLinked] = useState<string[]>([]); const [ms, setMs] = useState(""); const [error, setError] = useState("");
  const [confirm, setConfirm] = useState(false); const [loadedFor, setLoadedFor] = useState<string | null>(null);
  const key = isNew ? "new" : g?.id ?? null;
  if (key !== loadedFor) {
    setLoadedFor(key);
    setTitle(g?.title ?? ""); setWhy(g?.why ?? ""); setArea(g?.area ?? "Training"); setDeadline(g?.deadline ?? ""); setManual(g?.manualProgress ?? null); setLinked(g?.linkedHabitIds ?? []); setError(""); setMs("");
  }
  async function save(close = true) {
    if (!title.trim()) { setError("Describe the goal."); return undefined; }
    const saved = await saveGoal({ id: g?.id, title: title.trim(), why: why.trim(), area, deadline: deadline || undefined, status: cur?.status ?? "active", manualProgress: manual, linkedHabitIds: linked });
    if (close) { toast(isNew ? "Goal created" : "Goal saved"); onClose(); }
    return saved;
  }
  const p = cur ? goalProgress({ ...cur, manualProgress: manual }, milestones) : null;
  return (
    <>
      <Sheet open={!!goal} onOpenChange={(o) => !o && onClose()} title={isNew ? "New goal" : "Goal"} footer={<>
        {g && <Button variant="danger" onClick={() => setConfirm(true)}>Delete</Button>}
        {g && cur?.status === "active" && <Button onClick={async () => { await saveGoal({ ...cur, status: "done" }); toast("Goal marked complete. Well earned."); onClose(); }}>Complete</Button>}
        {g && cur?.status === "active" && <Button variant="ghost" onClick={async () => { await updatePrefs({ homeCard: "goal", focusGoalId: g.id }); toast("Pinned as Today's focus"); }}>Pin to Today</Button>}
        {g && cur?.status !== "active" && <Button onClick={async () => { await saveGoal({ ...cur!, status: "active" }); toast("Goal reopened"); }}>Reopen</Button>}
        <Button variant="primary" className="flex-1" onClick={() => save()}>Save</Button></>}>
        <div className="flex flex-col gap-4">
          <Field label="Goal" htmlFor="g-title" error={error}><Input id="g-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Make the varsity rotation" maxLength={120} invalid={!!error} /></Field>
          <Field label="Why it matters (optional)" htmlFor="g-why"><TextArea id="g-why" value={why} onChange={(e) => setWhy(e.target.value)} maxLength={600} className="min-h-16" /></Field>
          <fieldset><legend className="mb-1.5 text-sm font-medium text-muted">Area</legend><div className="flex flex-wrap gap-1.5">{AREAS.map((a) => <Chip key={a} selected={area === a} onClick={() => setArea(a)}>{a}</Chip>)}</div></fieldset>
          <Field label="Deadline (optional)" htmlFor="g-dl"><Input id="g-dl" type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} /></Field>
          {g && (
            <section><p className="mb-2 text-sm font-medium text-muted">Milestones {p && p.total > 0 && `· ${p.done}/${p.total}`}</p>
              <ul className="flex flex-col">{milestones.map((m) => (
                <li key={m.id} className="flex items-center">
                  <button aria-pressed={!!m.doneAt} aria-label={m.doneAt ? `Reopen ${m.title}` : `Complete ${m.title}`} className="flex size-12 items-center justify-center" onClick={async () => { const xp = await setMilestoneDone(m.id, !m.doneAt); if (!m.doneAt) toast(`Milestone reached${xp ? ` (+${xp} XP)` : ""}`, () => { setMilestoneDone(m.id, false); }); }}>
                    {m.doneAt ? <CircleCheck size={22} className="pop text-flash" /> : <Circle size={22} className="text-muted" />}</button>
                  <span className={cx("flex-1", m.doneAt && "text-muted line-through")}>{m.title}</span>
                  <IconButton label={`Delete ${m.title}`} onClick={() => deleteMilestone(m.id)}><Trash2 size={16} /></IconButton>
                </li>))}</ul>
              <form className="mt-2 flex gap-2" onSubmit={async (e) => { e.preventDefault(); if (!ms.trim()) return; await addMilestone(g.id, ms.trim()); setMs(""); }}>
                <Input aria-label="New milestone" placeholder="Add a milestone" value={ms} onChange={(e) => setMs(e.target.value)} maxLength={120} /><Button type="submit" size="sm"><Plus size={16} />Add</Button></form>
            </section>
          )}
          {isNew && <p className="text-xs text-muted">Save the goal, then add milestones.</p>}
          <fieldset><legend className="mb-1 text-sm font-medium text-muted">Progress</legend>
            <Switch checked={manual !== null} onChange={(on) => setManual(on ? p?.pct ?? 0 : null)} label="Set progress manually" description="Shown labeled as manual. Off: progress comes from milestones." />
            {manual !== null && <div className="flex items-center gap-3"><input aria-label="Manual progress percent" type="range" min={0} max={100} step={5} value={manual} onChange={(e) => setManual(Number(e.target.value))} className="flex-1 accent-[#17BCE4]" /><span className="tnum w-12 text-right">{manual}%</span></div>}
          </fieldset>
          {habits.length > 0 && <fieldset><legend className="mb-1.5 text-sm font-medium text-muted">Supporting habits</legend><div className="flex flex-col gap-1">{habits.map((h) => (
            <button key={h.id} aria-pressed={linked.includes(h.id)} onClick={() => setLinked(linked.includes(h.id) ? linked.filter((x) => x !== h.id) : [...linked, h.id])} className="flex min-h-11 items-center gap-3 text-left">
              <span className={cx("flex size-5 items-center justify-center rounded-md border", linked.includes(h.id) ? "border-flash bg-flash text-obsidian" : "border-line")}>{linked.includes(h.id) && <Check size={14} />}</span>{h.label}<span className="text-xs text-muted">{describeSchedule(h)}</span></button>))}</div></fieldset>}
          {g && <p className="text-xs text-muted">Link tasks to this goal from the task editor.</p>}
        </div>
      </Sheet>
      {g && <ConfirmSheet open={confirm} onOpenChange={setConfirm} danger title="Delete this goal?" body="Its milestones and their XP are removed. Linked tasks are kept and unlinked." confirmLabel="Delete goal" onConfirm={async () => { await deleteGoal(g.id); onClose(); toast("Goal deleted"); }} />}
    </>
  );
}

