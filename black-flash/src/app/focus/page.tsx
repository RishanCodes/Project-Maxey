"use client";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { Pause, Play, Square, Timer, Trash2 } from "lucide-react";
import { Button, Card, Chip, ConfirmSheet, Eyebrow, Field, IconButton, Input, ProgressBar, Select, Skeleton } from "@/components/ui";
import { useToast } from "@/components/toast";
import { usePrefs, useToday } from "@/hooks/use-data";
import { getDb } from "@/lib/db";
import { cancelTimer, completeTimerIfDone, deleteFocusSession, pauseTimer, resumeTimer, startTimer, timerElapsedMs } from "@/lib/repo";
import { addDays, relativeDay } from "@/lib/dates";
import { ActiveTimer } from "@/lib/schema";

const fmt = (ms: number) => { const s = Math.max(0, Math.ceil(ms / 1000)); return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`; };

function FocusInner() {
  const prefs = usePrefs(); const { today } = useToday(prefs?.timezone);
  const params = useSearchParams(); const toast = useToast();
  const timerRow = useLiveQuery(async () => (await getDb().kv.get("activeTimer")) ?? null, []);
  const timer = timerRow && ActiveTimer.safeParse(timerRow.value).success ? (timerRow.value as ActiveTimer) : null;
  const tasks = useLiveQuery(() => getDb().tasks.filter((t) => !t.archived).toArray(), []) ?? [];
  const recent = useLiveQuery(() => getDb().focus.where("date").aboveOrEqual(addDays(today, -6)).reverse().sortBy("completedAt"), [today]) ?? [];
  const [now, setNow] = useState(() => Date.now());
  const [label, setLabel] = useState(""); const [taskId, setTaskId] = useState(() => params.get("task") ?? ""); const [minutes, setMinutes] = useState<number | null>(null); const [custom, setCustom] = useState("");
  const [confirmStop, setConfirmStop] = useState(false); const [error, setError] = useState("");
  const planned = minutes ?? prefs?.focusMinutes ?? 25;

  useEffect(() => {
    const tick = () => setNow(Date.now());
    const id = setInterval(tick, 1000);
    document.addEventListener("visibilitychange", tick);
    return () => { clearInterval(id); document.removeEventListener("visibilitychange", tick); };
  }, []);
  // Completion is checked from timestamps, so a backgrounded or throttled tab still records correctly once.
  useEffect(() => {
    if (!timer || timer.pausedAtMs !== null) return;
    if (timerElapsedMs(timer, now) >= timer.plannedMin * 60_000) {
      completeTimerIfDone(now).then((r) => { if (r.recorded) toast(`Focus session complete${r.xp ? ` (+${r.xp} XP)` : ""}. Take a ${prefs?.breakMinutes ?? 5}-minute break.`); });
    }
  }, [timer, now, toast, prefs?.breakMinutes]);

  if (!prefs || timerRow === undefined) return <Skeleton className="h-72" />;
  const totalMin = Math.round(recent.reduce((m, f) => m + f.actualMin, 0));

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-bold tracking-tight">Focus</h1>
      {timer ? (
        <Card className="flex flex-col items-center gap-5 bg-graphite py-10 text-center">
          <Eyebrow>{timer.pausedAtMs !== null ? "Paused" : "In focus"}</Eyebrow>
          <p className="max-w-full truncate text-lg font-semibold">{timer.label}</p>
          <p className="tnum text-6xl font-bold tracking-tight" role="timer" aria-live="off" aria-label="Time remaining">{fmt(timer.plannedMin * 60_000 - timerElapsedMs(timer, now))}</p>
          <div className="w-full max-w-xs"><ProgressBar value={timerElapsedMs(timer, now) / (timer.plannedMin * 60_000)} label="Focus progress" /></div>
          <div className="flex gap-2">
            {timer.pausedAtMs !== null ? <Button variant="primary" size="lg" onClick={() => resumeTimer()}><Play size={18} />Resume</Button> : <Button size="lg" onClick={() => pauseTimer()}><Pause size={18} />Pause</Button>}
            <Button variant="ghost" size="lg" onClick={() => setConfirmStop(true)}><Square size={16} />Stop</Button>
          </div>
          <p className="text-xs text-muted">The timer keeps running if you switch tabs or screens. Only completed sessions are recorded.</p>
        </Card>
      ) : (
        <Card className="flex flex-col gap-4">
          <Field label="What are you focusing on?" htmlFor="f-label" error={error}><Input id="f-label" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Chemistry review" maxLength={80} /></Field>
          {tasks.length > 0 && <Field label="Link a task (optional)" htmlFor="f-task"><Select id="f-task" value={taskId} onChange={(e) => setTaskId(e.target.value)}><option value="">None</option>{tasks.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}</Select></Field>}
          <fieldset><legend className="mb-1.5 text-sm font-medium text-muted">Length</legend><div className="flex flex-wrap gap-1.5">
            {[15, 25, 45, 60].map((m) => <Chip key={m} selected={planned === m && !custom} onClick={() => { setMinutes(m); setCustom(""); }}>{m} min</Chip>)}
            <Input aria-label="Custom minutes" inputMode="numeric" placeholder="Custom" value={custom} onChange={(e) => { setCustom(e.target.value); const n = Number(e.target.value); if (n >= 1 && n <= 240) setMinutes(Math.round(n)); }} className="w-28" />
          </div></fieldset>
          <Button variant="primary" size="lg" onClick={async () => {
            const linked = tasks.find((t) => t.id === taskId);
            const name = label.trim() || linked?.title || "";
            if (!name) { setError("Name the session or link a task."); return; }
            setError(""); await startTimer(name, planned, linked?.id);
          }}><Timer size={18} />Start {planned}-minute focus</Button>
          <p className="text-xs text-muted">This is a timer, not an app blocker: a website can't lock other apps on your phone.</p>
        </Card>
      )}
      <section>
        <h2 className="mb-1 text-lg font-semibold">Last 7 days</h2>
        <p className="mb-3 text-sm text-muted">{recent.length} completed session{recent.length === 1 ? "" : "s"} · {totalMin} min</p>
        {recent.length > 0 ? <ul className="flex flex-col gap-2">{recent.map((f) => (
          <li key={f.id} className="flex items-center rounded-2xl border border-line/70 bg-graphite/60 pl-4"><span className="min-w-0 flex-1 py-3"><b className="block truncate">{f.label}</b><span className="text-sm text-muted">{relativeDay(f.date, today)} · {Math.round(f.actualMin)} min</span></span>
            <IconButton label={`Delete ${f.label} session`} onClick={async () => { await deleteFocusSession(f.id); toast("Session removed"); }}><Trash2 size={16} /></IconButton></li>))}</ul>
          : <p className="text-sm text-muted">Completed sessions will appear here.</p>}
      </section>
      <ConfirmSheet open={confirmStop} onOpenChange={setConfirmStop} title="Stop this session?" body="Stopped sessions aren't recorded or counted. You can start a new one anytime." confirmLabel="Stop session" onConfirm={async () => { await cancelTimer(); toast("Session stopped"); }} />
    </div>
  );
}

export default function FocusPage() { return <Suspense fallback={<Skeleton className="h-72" />}><FocusInner /></Suspense>; }
