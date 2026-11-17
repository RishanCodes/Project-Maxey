"use client";
import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, Circle, CircleCheck, Moon, Plus, Search } from "lucide-react";
import { Button, Card, Chip, EmptyState, IconButton, Input, ProgressBar, Segmented, Skeleton, Switch, cx } from "@/components/ui";
import { useToast } from "@/components/toast";
import { TaskForm } from "@/components/forms/task-form";
import { HabitForm } from "@/components/forms/habit-form";
import { RoutineForm } from "@/components/plan/routine-form";
import { SuggestSheet } from "@/components/plan/suggest-sheet";
import { useCreatedDate, usePrefs, useSnapshot, useToday } from "@/hooks/use-data";
import { getDb } from "@/lib/db";
import { completeTask, markHabit, moveTask, toggleRoutineStep, uncompleteTask, unmarkHabit, activityName } from "@/lib/repo";
import { addDays, formatDateKey, formatTime, relativeDay, weekDays, weekday } from "@/lib/dates";
import { describeSchedule, isDueToday, isScheduledDay, occurrencesOn, sortOccurrences, streak, weekCount, type TaskOccurrence } from "@/lib/recurrence";
import type { Habit, Preferences, Routine, Task } from "@/lib/schema";
import type { Snapshot } from "@/lib/stats";

type View = "day" | "week" | "habits" | "routines";

function PlanInner() {
  const params = useSearchParams();
  const router = useRouter();
  const view = (params.get("view") as View) || "day";
  const prefs = usePrefs();
  const snap = useSnapshot();
  const { today } = useToday(prefs?.timezone);
  const [date, setDate] = useState<string | null>(null);
  const sel = date ?? today;
  const setView = (v: View) => router.replace(v === "day" ? "/plan" : `/plan?view=${v}`);
  if (!prefs || !snap) return <Skeleton className="h-64" />;
  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-3xl font-bold tracking-tight">Plan</h1>
      <Segmented label="Plan view" value={view} onChange={setView} options={[{ value: "day", label: "Day" }, { value: "week", label: "Week" }, { value: "habits", label: "Habits" }, { value: "routines", label: "Routines" }]} />
      {view === "day" && <DayView prefs={prefs} snap={snap} date={sel} today={today} setDate={setDate} />}
      {view === "week" && <WeekView prefs={prefs} snap={snap} date={sel} today={today} onPick={(d) => { setDate(d); setView("day"); }} setDate={setDate} />}
      {view === "habits" && <HabitsView prefs={prefs} snap={snap} today={today} />}
      {view === "routines" && <RoutinesView today={today} />}
    </div>
  );
}

type Data = { prefs: Preferences; snap: Snapshot };
function DateNav({ prefs, date, today, setDate }: { prefs: Preferences; date: string; today: string; setDate: (d: string) => void }) {
  const days = weekDays(date, prefs.weekStart);
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <IconButton label="Previous week" onClick={() => setDate(addDays(date, -7))}><ChevronLeft size={20} /></IconButton>
        <button className="text-sm font-semibold" onClick={() => setDate(today)}>{relativeDay(date, today)}{date !== today && " · back to today"}</button>
        <IconButton label="Next week" onClick={() => setDate(addDays(date, 7))}><ChevronRight size={20} /></IconButton>
      </div>
      <div className="grid grid-cols-7 gap-1" role="tablist" aria-label="Day of week">
        {days.map((d) => (
          <button key={d} role="tab" aria-selected={d === date} onClick={() => setDate(d)} className={cx("flex min-h-14 flex-col items-center justify-center rounded-xl text-xs transition", d === date ? "bg-subtle text-ink" : "text-muted hover:bg-graphite")}>
            {formatDateKey(d, { weekday: "short" })}<b className={cx("tnum text-base", d === today && "text-flash")}>{Number(d.slice(8))}</b>
          </button>
        ))}
      </div>
    </div>
  );
}

function DayView({ prefs, snap, date, today, setDate }: Data & { date: string; today: string; setDate: (d: string) => void }) {
  const created = useCreatedDate(prefs.timezone);
  const toast = useToast();
  const [q, setQ] = useState(""); const [prio, setPrio] = useState<"all" | Task["priority"]>("all"); const [showDone, setShowDone] = useState(true);
  const [edit, setEdit] = useState<Task | undefined>(); const [adding, setAdding] = useState(false); const [editHabit, setEditHabit] = useState<Habit | undefined>();
  const [suggest, setSuggest] = useState(false);
  const { minutes: nowMin } = useToday(prefs.timezone);
  const occ = useMemo(() => sortOccurrences(occurrencesOn(snap.tasks, snap.taskCompletions, date, today, created)), [snap, date, today, created]);
  const filtered = occ.filter((o) => (showDone || !o.done) && (prio === "all" || o.task.priority === prio) && (!q.trim() || `${o.task.title} ${o.task.tags.join(" ")} ${o.task.description}`.toLowerCase().includes(q.trim().toLowerCase())));
  const habits = snap.habits.filter((h) => h.status === "active" && (isDueToday(h, date, snap.habitCompletions, prefs.weekStart) || snap.habitCompletions.some((c) => c.habitId === h.id && c.date === date)));
  const sessions = snap.training.filter((t) => t.date === date);
  const unscheduled = snap.tasks.filter((t) => !t.archived && t.repeat.type === "none" && !t.dueDate && !snap.taskCompletions.some((c) => c.taskId === t.id));
  const future = date > today;
  async function toggle(o: TaskOccurrence) {
    if (o.done) { await uncompleteTask(o.task.id, o.date); toast("Marked not done"); return; }
    const xp = await completeTask(o.task.id, o.date); toast(`Done: ${o.task.title}${xp ? ` (+${xp} XP)` : ""}`, () => uncompleteTask(o.task.id, o.date));
  }
  return (
    <div className="flex flex-col gap-5">
      <DateNav prefs={prefs} date={date} today={today} setDate={setDate} />
      <div className="flex flex-col gap-2">
        <div className="relative"><Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" aria-hidden="true" /><Input aria-label="Search tasks" placeholder="Search tasks and tags" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" /></div>
        <div className="flex flex-wrap items-center gap-1.5">{(["all", "high", "medium", "low"] as const).map((p) => <Chip key={p} selected={prio === p} onClick={() => setPrio(p)} className="capitalize">{p === "all" ? "All priorities" : p}</Chip>)}
          <label className="ml-auto flex min-h-10 items-center gap-2 text-sm text-muted"><input type="checkbox" checked={showDone} onChange={(e) => setShowDone(e.target.checked)} className="size-4 accent-[#17BCE4]" />Show completed</label></div>
      </div>
      <section aria-label="Tasks">
        <div className="mb-2 flex items-center justify-between gap-2"><h2 className="text-lg font-semibold">Tasks</h2><div className="flex gap-2">
          {date >= today && occ.some((o) => !o.done && !o.task.dueTime && o.task.repeat.type === "none") && <Button size="sm" variant="ghost" onClick={() => setSuggest(true)}>Suggest times</Button>}
          <Button size="sm" onClick={() => setAdding(true)}><Plus size={16} />Add</Button></div></div>
        {filtered.length === 0 ? <p className="rounded-2xl border border-dashed border-line px-4 py-6 text-center text-sm text-muted">{occ.length ? "No tasks match these filters." : "No tasks on this day."}</p> : (
          <ul className="flex flex-col gap-2">{filtered.map((o, i) => (
            <li key={o.task.id} className="flex items-center rounded-2xl border border-line/70 bg-graphite/60">
              <button aria-label={o.done ? `Mark ${o.task.title} not done` : `Complete ${o.task.title}`} aria-pressed={o.done} disabled={future} className="flex size-14 shrink-0 items-center justify-center disabled:opacity-40" onClick={() => toggle(o)}>
                {o.done ? <CircleCheck size={24} className="text-flash" /> : <Circle size={24} className="text-muted" />}</button>
              <button className="min-w-0 flex-1 py-3 text-left" onClick={() => setEdit(o.task)}>
                <span className={cx("block truncate font-medium", o.done && "text-muted line-through")}>{o.task.title}</span>
                <span className={cx("block text-sm", o.overdue ? "text-red" : "text-muted")}>{[o.overdue && `Overdue since ${formatDateKey(o.task.dueDate!)}`, o.task.dueTime && formatTime(o.task.dueTime), o.task.priority !== "medium" && `${o.task.priority} priority`, o.task.repeat.type !== "none" && "repeats", ...o.task.tags].filter(Boolean).join(" · ")}</span>
              </button>
              <div className="flex flex-col pr-1">
                <IconButton label={`Move ${o.task.title} up`} className="size-8" disabled={i === 0} onClick={() => moveTask(o.task.id, -1, filtered.map((x) => x.task.id))}><ArrowUp size={14} /></IconButton>
                <IconButton label={`Move ${o.task.title} down`} className="size-8" disabled={i === filtered.length - 1} onClick={() => moveTask(o.task.id, 1, filtered.map((x) => x.task.id))}><ArrowDown size={14} /></IconButton>
              </div>
            </li>))}</ul>)}
        {future && <p className="mt-2 text-xs text-muted">Future occurrences can be completed on their day.</p>}
      </section>
      {habits.length > 0 && (
        <section aria-label="Habits"><h2 className="mb-2 text-lg font-semibold">Habits</h2><ul className="flex flex-col gap-2">{habits.map((h) => {
          const c = snap.habitCompletions.find((x) => x.habitId === h.id && x.date === date);
          return (
            <li key={h.id} className="flex items-center rounded-2xl border border-line/70 bg-graphite/60">
              <button aria-label={c?.state === "done" ? `Uncheck ${h.label}` : `Complete ${h.label}`} aria-pressed={c?.state === "done"} disabled={future} className="flex size-14 shrink-0 items-center justify-center disabled:opacity-40"
                onClick={async () => { if (c) { await unmarkHabit(h.id, date); toast("Cleared"); } else { const xp = await markHabit(h.id, date, "done"); toast(`${h.label}${xp ? ` (+${xp} XP)` : ""}`, () => unmarkHabit(h.id, date)); } }}>
                {c?.state === "done" ? <CircleCheck size={24} className="text-flash" /> : c?.state === "rest" ? <Moon size={22} className="text-done" /> : <Circle size={24} className="text-muted" />}</button>
              <button className="min-w-0 flex-1 py-3 text-left" onClick={() => setEditHabit(h)}><span className="block font-medium">{h.label}</span><span className="block text-sm text-muted">{c?.state === "rest" ? "Rest day (neutral)" : describeSchedule(h)}</span></button>
              {!c && !future && <Button size="sm" variant="ghost" className="mr-2" onClick={async () => { await markHabit(h.id, date, "rest"); toast("Marked as a rest day. It won't count as missed.", () => unmarkHabit(h.id, date)); }}>Rest</Button>}
            </li>);
        })}</ul></section>
      )}
      {sessions.length > 0 && <section aria-label="Training"><h2 className="mb-2 text-lg font-semibold">Training</h2><ul className="flex flex-col gap-2">{sessions.map((s) => (
        <li key={s.id} className="rounded-2xl border border-line/70 bg-graphite/60 px-4 py-3"><b className="block">{activityName(s)}</b><span className="text-sm text-muted">{[formatTime(s.startTime), `${s.durationMin} min`, s.status].filter(Boolean).join(" · ")}</span></li>))}</ul></section>}
      {unscheduled.length > 0 && date === today && <section aria-label="Anytime"><h2 className="mb-2 text-lg font-semibold">Anytime <span className="text-sm font-normal text-muted">(no date)</span></h2><ul className="flex flex-col gap-2">{unscheduled.map((t) => (
        <li key={t.id} className="flex items-center rounded-2xl border border-line/70 bg-graphite/60">
          <button aria-label={`Complete ${t.title}`} className="flex size-14 shrink-0 items-center justify-center" onClick={async () => { const xp = await completeTask(t.id, today); toast(`Done: ${t.title}${xp ? ` (+${xp} XP)` : ""}`, () => uncompleteTask(t.id, today)); }}><Circle size={24} className="text-muted" /></button>
          <button className="min-w-0 flex-1 py-3 text-left font-medium" onClick={() => setEdit(t)}>{t.title}</button></li>))}</ul></section>}
      <TaskForm open={adding || !!edit} onOpenChange={(o) => { if (!o) { setAdding(false); setEdit(undefined); } }} task={edit} defaultDate={date} />
      <HabitForm open={!!editHabit} onOpenChange={(o) => !o && setEditHabit(undefined)} habit={editHabit} />
      <SuggestSheet open={suggest} onOpenChange={setSuggest} date={date} today={today} nowMin={nowMin} occurrences={occ} training={snap.training} />
    </div>
  );
}

function WeekView({ prefs, snap, date, today, onPick, setDate }: Data & { date: string; today: string; onPick: (d: string) => void; setDate: (d: string) => void }) {
  const created = useCreatedDate(prefs.timezone);
  const days = weekDays(date, prefs.weekStart);
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <IconButton label="Previous week" onClick={() => setDate(addDays(date, -7))}><ChevronLeft size={20} /></IconButton>
        <p className="text-sm font-semibold">{formatDateKey(days[0], { month: "short", day: "numeric" })} – {formatDateKey(days[6], { month: "short", day: "numeric" })}</p>
        <IconButton label="Next week" onClick={() => setDate(addDays(date, 7))}><ChevronRight size={20} /></IconButton>
      </div>
      <ul className="flex flex-col gap-2">{days.map((d) => {
        const occ = occurrencesOn(snap.tasks, snap.taskCompletions, d, today, created);
        const habits = snap.habits.filter((h) => h.status === "active" && h.schedule.type !== "perWeek" && isScheduledDay(h, d));
        const hd = habits.filter((h) => snap.habitCompletions.some((c) => c.habitId === h.id && c.date === d && c.state === "done")).length;
        const tr = snap.training.filter((t) => t.date === d);
        const planned = occ.length + habits.length, done = occ.filter((o) => o.done).length + hd;
        return (
          <li key={d}><button onClick={() => onPick(d)} className={cx("flex w-full items-center gap-4 rounded-2xl border px-4 py-3 text-left transition hover:border-muted/50", d === today ? "border-flash/50 bg-graphite" : "border-line/70 bg-graphite/40")}>
            <span className="w-12 shrink-0"><span className="block text-xs text-muted">{formatDateKey(d, { weekday: "short" })}</span><b className={cx("tnum text-lg", d === today && "text-flash")}>{Number(d.slice(8))}</b></span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm">{occ.length ? occ.slice(0, 2).map((o) => o.task.title).join(", ") + (occ.length > 2 ? ` +${occ.length - 2}` : "") : <span className="text-muted">No tasks</span>}</span>
              <span className="block text-xs text-muted">{[habits.length && `${habits.length} habit${habits.length > 1 ? "s" : ""}`, tr.length && `${tr.length} training`].filter(Boolean).join(" · ") || " "}</span>
              {planned > 0 && d <= today && <span className="mt-2 block"><ProgressBar value={done / planned} label={`${formatDateKey(d)} completion`} accent={false} /></span>}
            </span>
            {planned > 0 && <span className="tnum text-sm text-muted">{done}/{planned}</span>}
          </button></li>);
      })}</ul>
      <p className="text-xs text-muted">Flexible (times-per-week) habits aren't tied to a day, so they're counted in the Habits view.</p>
    </div>
  );
}

function HabitsView({ prefs, snap, today }: Data & { today: string }) {
  const [edit, setEdit] = useState<Habit | undefined>(); const [adding, setAdding] = useState(false); const [archived, setArchived] = useState(false);
  const list = snap.habits.filter((h) => (archived ? h.status === "archived" : h.status !== "archived"));
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between"><Switch checked={archived} onChange={setArchived} label="Show archived" /><Button size="sm" variant="primary" onClick={() => setAdding(true)}><Plus size={16} />New habit</Button></div>
      {list.length === 0 ? <EmptyState title={archived ? "No archived habits" : "No habits yet"} body="Start with one habit you can do even on your busiest day." action={!archived ? <Button variant="primary" onClick={() => setAdding(true)}>Add a habit</Button> : undefined} /> : (
        <ul className="flex flex-col gap-2">{list.map((h) => {
          const s = streak(h, snap.habitCompletions, today, prefs.weekStart);
          const wk = weekCount(h, today, snap.habitCompletions, prefs.weekStart);
          const target = h.schedule.type === "perWeek" ? h.schedule.count : h.schedule.type === "daily" ? 7 : h.schedule.days.length;
          return (
            <li key={h.id}><button onClick={() => setEdit(h)} className="flex w-full items-center gap-4 rounded-2xl border border-line/70 bg-graphite/60 px-4 py-4 text-left">
              <span className="min-w-0 flex-1"><b className="block">{h.label}</b><span className="block text-sm text-muted">{describeSchedule(h)}{h.status === "paused" && " · paused"}</span>
                <span className="mt-2 block"><ProgressBar value={target ? Math.min(1, wk / target) : 0} label={`${h.label} this week`} accent={false} /></span>
                <span className="tnum mt-1 block text-xs text-muted">This week {wk}/{target}</span></span>
              <span className="text-right"><b className="tnum block text-xl">{s.value}</b><span className="text-xs text-muted">{s.unit === "day" ? "day" : "week"} streak</span></span>
            </button></li>);
        })}</ul>)}
      <p className="text-xs text-muted">Streaks are flexible: off-schedule days, paused days and rest days never break them.</p>
      <HabitForm open={adding || !!edit} onOpenChange={(o) => { if (!o) { setAdding(false); setEdit(undefined); } }} habit={edit} />
    </div>
  );
}

function RoutinesView({ today }: { today: string }) {
  const routines = useLiveQuery(() => getDb().routines.toArray(), []);
  const comps = useLiveQuery(() => getDb().routineCompletions.where("date").equals(today).toArray(), [today]);
  const [edit, setEdit] = useState<Routine | undefined>(); const [adding, setAdding] = useState(false);
  if (!routines || !comps) return <Skeleton className="h-40" />;
  const todays = routines.filter((r) => r.active && r.days.includes(weekday(today)));
  const others = routines.filter((r) => !todays.includes(r));
  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end"><Button size="sm" variant="primary" onClick={() => setAdding(true)}><Plus size={16} />New routine</Button></div>
      {routines.length === 0 && <EmptyState title="No routines yet" body="A routine is a short sequence you run the same way, like a pre-game warm-up or a wind-down." action={<Button variant="primary" onClick={() => setAdding(true)}>Create a routine</Button>} />}
      {todays.map((r) => {
        const done = r.steps.filter((s) => comps.some((c) => c.routineId === r.id && c.stepId === s.id)).length;
        return (
          <Card key={r.id} className="p-4">
            <div className="mb-2 flex items-center justify-between"><button className="text-left" onClick={() => setEdit(r)}><b>{r.name}</b><span className="block text-xs text-muted">Today · {done}/{r.steps.length} steps</span></button></div>
            <ol className="flex flex-col">{r.steps.map((s, i) => {
              const on = comps.some((c) => c.routineId === r.id && c.stepId === s.id);
              return <li key={s.id}><button aria-pressed={on} onClick={() => toggleRoutineStep(r.id, s.id, today)} className="flex min-h-12 w-full items-center gap-3 text-left">
                {on ? <CircleCheck size={22} className="text-flash" /> : <Circle size={22} className="text-muted" />}<span className={cx(on && "text-muted line-through")}><span className="tnum mr-2 text-muted">{i + 1}.</span>{s.label}</span></button></li>;
            })}</ol>
          </Card>);
      })}
      {others.length > 0 && <section><h2 className="mb-2 text-sm font-semibold text-muted">Not scheduled today</h2><ul className="flex flex-col gap-2">{others.map((r) => (
        <li key={r.id}><button onClick={() => setEdit(r)} className="flex w-full justify-between rounded-2xl border border-line/70 bg-graphite/40 px-4 py-3 text-left"><span>{r.name}</span><span className="text-sm text-muted">{r.steps.length} steps</span></button></li>))}</ul></section>}
      <RoutineForm open={adding || !!edit} onOpenChange={(o) => { if (!o) { setAdding(false); setEdit(undefined); } }} routine={edit} />
    </div>
  );
}

export default function PlanPage() {
  return <Suspense fallback={<Skeleton className="h-64" />}><PlanInner /></Suspense>;
}
