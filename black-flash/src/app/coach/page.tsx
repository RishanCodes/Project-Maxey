"use client";
import { useEffect, useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Lightbulb, RotateCcw, Send, Trash2 } from "lucide-react";
import { Button, Card, Chip, ConfirmSheet, EmptyState, Eyebrow, IconButton, Segmented, Sheet, Skeleton, TextArea, cx } from "@/components/ui";
import { useToast } from "@/components/toast";
import { useCreatedDate, usePrefs, useSnapshot, useToday } from "@/hooks/use-data";
import { getDb } from "@/lib/db";
import { buildInsights, weeklyReview, type Insight } from "@/lib/insights";
import { addDays, formatDateKey, formatTime, fromMinutes, plural, toMinutes } from "@/lib/dates";
import { pct, trainingInRange } from "@/lib/stats";
import { createHabit, createTask, getAnswers, newId, nowIso } from "@/lib/repo";
import { useProgram } from "@/hooks/use-program";
import { programCoachText } from "@/lib/program/engine";
import { buildCoachContext, CONTEXT_LABEL, extractProposals, type ContextKey, type Proposal } from "@/lib/coach-context";
import type { CoachMessage, Preferences } from "@/lib/schema";
import type { Snapshot } from "@/lib/stats";

type Status = { configured: boolean; allowed: boolean; reason: string; model: string };
type Answer = { shows: string; meaning: string; action: string; limits: string };

function FourPart({ a }: { a: Answer }) {
  return (
    <dl className="flex flex-col gap-3 text-[15px]">
      {([["What your logs show", a.shows], ["What that may mean", a.meaning], ["Practical next action", a.action], ["What I can't tell from this data", a.limits]] as const).map(([k, v]) => (
        <div key={k}><dt className="text-xs font-semibold uppercase tracking-wider text-muted">{k}</dt><dd className="mt-0.5">{v}</dd></div>))}
    </dl>
  );
}

export default function CoachPage() {
  const prefs = usePrefs(); const snap = useSnapshot(); const { today } = useToday(prefs?.timezone); const created = useCreatedDate(prefs?.timezone);
  const [status, setStatus] = useState<Status | null>(null);
  const [ask, setAsk] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  useEffect(() => { fetch("/api/coach").then((r) => r.json()).then(setStatus).catch(() => setStatus({ configured: false, allowed: false, reason: "Offline: the AI status could not be checked. Insights Mode works offline.", model: "" })); getAnswers().then(setAnswers); }, []);
  const insights = useMemo(() => (snap && prefs ? buildInsights(snap, today, prefs.weekStart, created) : []), [snap, prefs, today, created]);
  if (!prefs || !snap) return <Skeleton className="h-80" />;
  const review = weeklyReview(snap, today, prefs.weekStart, created);

  const smart: Record<string, () => Answer> = {
    habits: () => {
      const i = insights.find((x) => x.id === "habits-week");
      return i ?? { shows: "No habits were scheduled in the last 7 days.", meaning: "There is nothing to compare yet.", action: "Add one habit you can do even on your busiest day.", limits: "Without logged habits there is no trend." };
    },
    training: () => {
      const now = trainingInRange(snap, addDays(today, -29), today), prev = trainingInRange(snap, addDays(today, -59), addDays(today, -30));
      if (!now.sessions && !prev.sessions) return { shows: "No completed training sessions in the last 60 days.", meaning: "There is nothing to compare yet.", action: "Log your next practice or workout, with focus areas.", limits: "Practices you don't log are invisible here." };
      const focusNow = Object.entries(now.byFocus).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k, v]) => `${k} (${v})`).join(", ");
      return {
        shows: `Last 30 days: ${plural(now.sessions, "session")}, ${now.minutes} min${focusNow ? `, most-tagged focus ${focusNow}` : ""}${now.attempted ? `, shooting ${now.made}/${now.attempted} (${pct(now.shootingPct)})` : ""}. The 30 days before: ${plural(prev.sessions, "session")}, ${prev.minutes} min${prev.attempted ? `, shooting ${prev.made}/${prev.attempted} (${pct(prev.shootingPct)})` : ""}.`,
        meaning: now.minutes > prev.minutes * 1.2 ? "Your training volume went up." : now.minutes < prev.minutes * 0.8 ? "Your training volume went down, which may be planned rest or a busy stretch." : "Your volume is about the same.",
        action: now.attempted && prev.attempted ? "Keep logging the same shooting drill so the percentages stay comparable." : "Tag the skill you're working on in each session so you can see where time goes.",
        limits: "Minutes and tags describe what was logged, not quality. Shooting percentages from different drills aren't directly comparable.",
      };
    },
    day: () => {
      const end = typeof answers.dayEnd === "string" ? answers.dayEnd : "15:30";
      const practice = typeof answers.practiceTime === "string" ? answers.practiceTime : null;
      const studyAt = practice ? fromMinutes(toMinutes(practice) + 150) : fromMinutes(toMinutes(end) + 60);
      return {
        shows: `From your onboarding answers: school or work ends around ${formatTime(end)}${practice ? `, practice starts around ${formatTime(practice)}` : ""}.`,
        meaning: practice ? "On practice days the open time is split: a short window before practice and an evening window after you've eaten." : "Your afternoon is the main open block.",
        action: practice ? `Use the gap before practice for a 20-minute easy task, then a 40-minute study block around ${formatTime(studyAt)}, and leave 30 minutes of protected downtime before bed.` : `Take a short break after ${formatTime(end)}, then a 40-minute study block around ${formatTime(studyAt)}, plus one independent training or habit block.`,
        limits: "This uses your stated typical times, not your actual calendar. Nothing was added to your plan. Add any of it as a task if it helps.",
      };
    },
  };

  return (
    <div className="flex flex-col gap-7">
      <div className="flex items-end justify-between gap-3"><h1 className="text-3xl font-bold tracking-tight">Coach</h1>
        <span className={cx("rounded-full border px-3 py-1 text-xs font-semibold", status?.allowed ? "border-flash text-flash" : "border-line text-muted")}>{status?.allowed ? "AI Coach" : "Insights Mode"}</span></div>
      {!status?.allowed && <p className="text-sm text-muted">Rule-based insights from your own logs. No AI is involved, and nothing leaves this device. {status && <span className="block text-xs">{status.reason}</span>}</p>}

      <section aria-label="Ask"><Eyebrow className="mb-2">Ask from your data</Eyebrow>
        <div className="flex flex-wrap gap-2">
          <Chip selected={ask === "habits"} onClick={() => setAsk(ask === "habits" ? null : "habits")}>How did my habits go this week?</Chip>
          <Chip selected={ask === "training"} onClick={() => setAsk(ask === "training" ? null : "training")}>What changed in my training this month?</Chip>
          <Chip selected={ask === "day"} onClick={() => setAsk(ask === "day" ? null : "day")}>Help me plan a balanced school and practice day</Chip>
        </div>
        {ask && <Card className="mt-3"><FourPart a={smart[ask]()} /></Card>}
      </section>

      {status?.allowed && <LiveCoach status={status} prefs={prefs} snap={snap} />}

      <section aria-label="Insights"><Eyebrow className="mb-2">Insights</Eyebrow>
        {insights.length === 0 ? <EmptyState icon={<Lightbulb size={26} />} title="Not enough data yet" body="Insights appear once you've logged a few days of habits, tasks or training. They only say something when your data supports it." /> :
          <div className="flex flex-col gap-3">{insights.map((i) => <InsightCard key={i.id} i={i} />)}</div>}
      </section>

      {prefs.weeklyReview && (
        <Card><Eyebrow>Weekly review · {formatDateKey(review.from)} – {formatDateKey(review.to)}</Eyebrow>
          <ul className="mt-3 flex flex-col gap-1.5 text-[15px]">
            <li>Tasks: <b className="tnum">{review.tasks.done}/{review.tasks.planned}</b> planned occurrences done</li>
            <li>Habits: <b className="tnum">{review.habits.done}/{review.habits.expected}</b> scheduled check-ins</li>
            <li>Training: <b className="tnum">{review.training.sessions}</b> {review.training.sessions === 1 ? "session" : "sessions"}, <b className="tnum">{review.training.minutes}</b> min</li>
            <li>Focus: <b className="tnum">{review.focus.sessions}</b> {review.focus.sessions === 1 ? "session" : "sessions"}, <b className="tnum">{review.focus.minutes}</b> min</li>
            <li>Milestones completed: <b className="tnum">{review.milestones}</b></li>
            {review.wellness.rows.length > 0 && <li>Check-ins: <b className="tnum">{review.wellness.rows.length}</b>, rest days <b className="tnum">{review.wellness.restDays}</b></li>}
          </ul>
          <p className="mt-3 text-xs text-muted">Facts only. Write your reflection in the Journal if you like.</p>
        </Card>
      )}
    </div>
  );
}

function InsightCard({ i }: { i: Insight }) {
  const [open, setOpen] = useState(false);
  return (
    <Card className="p-4">
      <b className="block">{i.title}</b>
      <div className="mt-3"><FourPart a={i} /></div>
      {i.evidence.length > 0 && <><button className="mt-3 text-sm font-semibold text-flash" aria-expanded={open} onClick={() => setOpen(!open)}>Why this suggestion?</button>
        {open && <ul className="mt-1 list-disc pl-5 text-sm text-muted">{i.evidence.map((e) => <li key={e}>{e}</li>)}</ul>}</>}
    </Card>
  );
}

function LiveCoach({ status, prefs, snap }: { status: Status; prefs: Preferences; snap: Snapshot }) {
  const { today } = useToday(prefs.timezone); const toast = useToast();
  const history = useLiveQuery(() => getDb().coach.orderBy("at").toArray(), []) ?? [];
  const journal = useLiveQuery(() => getDb().journal.toArray(), []) ?? [];
  const allowedKeys = (Object.keys(prefs.aiConsent) as ContextKey[]).filter((k) => prefs.aiConsent[k]);
  const [keys, setKeys] = useState<ContextKey[]>([]);
  const [range, setRange] = useState<"7" | "30">("7");
  const [input, setInput] = useState(""); const [busy, setBusy] = useState(false); const [streaming, setStreaming] = useState(""); const [error, setError] = useState("");
  const [preview, setPreview] = useState(false); const [proposal, setProposal] = useState<Proposal | null>(null); const [clear, setClear] = useState(false);
  const programCtx = useProgram(today);
  const programText = programCtx && (programCtx.program.status === "active" || programCtx.program.status === "paused") ? programCoachText(programCtx) : undefined;
  const context = buildCoachContext(snap, journal, keys.filter((k) => allowedKeys.includes(k)), today, Number(range), prefs.weekStart, programText);

  async function send(text: string, prior: CoachMessage[]) {
    setBusy(true); setError(""); setStreaming("");
    const userMsg: CoachMessage = { id: newId(), role: "user", content: text, at: nowIso(), context: keys };
    await getDb().coach.add(userMsg);
    try {
      const res = await fetch("/api/coach", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages: [...prior.slice(-10), userMsg].map((m) => ({ role: m.role, content: m.content })), context, style: prefs.coachStyle }) });
      if (!res.ok || !res.body) { const j = await res.json().catch(() => ({})); throw new Error(j.error || `Request failed (${res.status})`); }
      const reader = res.body.getReader(); const dec = new TextDecoder(); let full = "";
      for (;;) { const { done, value } = await reader.read(); if (done) break; full += dec.decode(value, { stream: true }); setStreaming(full); }
      await getDb().coach.add({ id: newId(), role: "assistant", content: full, at: nowIso(), context: keys });
      setStreaming("");
    } catch (e) { setError(e instanceof Error ? e.message : "Request failed"); }
    setBusy(false);
  }
  return (
    <section aria-label="AI coach" className="flex flex-col gap-3">
      <Eyebrow>AI Coach · {status.model}</Eyebrow>
      <Card className="flex flex-col gap-3 p-4">
        <p className="text-sm text-muted">Choose what this conversation may see. Only categories you allowed in Settings are available; journal is off unless you enable it there.</p>
        <div className="flex flex-wrap gap-1.5">{(Object.keys(CONTEXT_LABEL) as ContextKey[]).map((k) => (
          <Chip key={k} disabled={!allowedKeys.includes(k)} selected={keys.includes(k)} onClick={() => setKeys(keys.includes(k) ? keys.filter((x) => x !== k) : [...keys, k])} className="disabled:opacity-40">{CONTEXT_LABEL[k]}</Chip>))}</div>
        <div className="flex items-center gap-3"><div className="w-48"><Segmented label="Context range" value={range} onChange={setRange} options={[{ value: "7", label: "7 days" }, { value: "30", label: "30 days" }]} /></div>
          <button className="text-sm font-semibold text-flash" onClick={() => setPreview(true)}>Preview data sent</button></div>
      </Card>
      {history.length > 0 && <div className="flex justify-end"><Button size="sm" variant="ghost" onClick={() => setClear(true)}><Trash2 size={14} />Clear history</Button></div>}
      <ul className="flex flex-col gap-3">
        {history.map((m) => { const { body, proposals } = m.role === "assistant" ? extractProposals(m.content) : { body: m.content, proposals: [] }; return (
          <li key={m.id} className={cx("rounded-2xl px-4 py-3 text-[15px] whitespace-pre-wrap", m.role === "user" ? "ml-8 bg-subtle" : "mr-4 border border-line/70 bg-graphite/60")}>
            {body}
            {proposals.length > 0 && <div className="mt-3 flex flex-wrap gap-2">{proposals.map((p, i) => <Button key={i} size="sm" onClick={() => setProposal(p)}>{p.type === "create_task" ? `Add task: ${p.title}` : `Add habit: ${p.label}`}</Button>)}</div>}
            <div className="mt-1 flex justify-end"><IconButton label="Delete message" className="size-8" onClick={() => getDb().coach.delete(m.id)}><Trash2 size={14} /></IconButton></div>
          </li>); })}
        {streaming && <li className="mr-4 whitespace-pre-wrap rounded-2xl border border-line/70 bg-graphite/60 px-4 py-3 text-[15px]">{streaming}</li>}
      </ul>
      {error && <div role="alert" className="flex items-center justify-between gap-3 rounded-xl border border-red/50 px-3 py-2 text-sm"><span>{error}</span>
        <Button size="sm" onClick={() => { const last = [...history].reverse().find((m) => m.role === "user"); if (last) { getDb().coach.delete(last.id).then(() => send(last.content, history.filter((h) => h.id !== last.id))); } }}><RotateCcw size={14} />Retry</Button></div>}
      <form className="flex items-end gap-2" onSubmit={(e) => { e.preventDefault(); if (!input.trim() || busy) return; const t = input.trim(); setInput(""); send(t, history); }}>
        <TextArea aria-label="Message the coach" value={input} onChange={(e) => setInput(e.target.value)} maxLength={4000} className="min-h-12" placeholder="Ask about your week, a plan, or a goal" />
        <Button type="submit" variant="primary" disabled={busy || !input.trim()} aria-label="Send"><Send size={18} /></Button>
      </form>
      <Sheet open={preview} onOpenChange={setPreview} title="Data that will be sent" description="Exactly this text is added to your next message. Nothing else from the app is sent.">
        <pre className="whitespace-pre-wrap rounded-xl bg-obsidian p-3 text-xs text-muted">{context}</pre>
      </Sheet>
      <ConfirmSheet open={!!proposal} onOpenChange={(o) => !o && setProposal(null)} title="Apply this suggestion?" confirmLabel={proposal?.type === "create_task" ? "Add task" : "Add habit"}
        body={proposal?.type === "create_task" ? `Creates a task "${proposal.title}"${proposal.dueDate ? ` due ${proposal.dueDate}` : ""}.` : `Creates a habit "${proposal?.label}" ${proposal?.perWeek ? `${proposal.perWeek}× per week` : "every day"}.`}
        onConfirm={async () => {
          if (!proposal) return;
          if (proposal.type === "create_task") await createTask({ title: proposal.title!.slice(0, 140), description: "Suggested by AI coach", tags: ["coach"], priority: "medium", repeat: { type: "none" }, dueDate: /^\d{4}-\d{2}-\d{2}$/.test(proposal.dueDate ?? "") ? proposal.dueDate : undefined });
          else await createHabit({ label: proposal.label!.slice(0, 80), purpose: "Suggested by AI coach", category: "Habits", schedule: proposal.perWeek && proposal.perWeek >= 1 && proposal.perWeek <= 7 ? { type: "perWeek", count: Math.round(proposal.perWeek) } : { type: "daily" } });
          toast("Added");
        }} />
      <ConfirmSheet open={clear} onOpenChange={setClear} danger title="Clear coach history?" body="Deletes all saved coach messages on this device." confirmLabel="Clear" onConfirm={async () => { await getDb().coach.clear(); toast("History cleared"); }} />
    </section>
  );
}
