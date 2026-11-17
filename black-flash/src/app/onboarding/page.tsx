"use client";
import { useRouter } from "next/navigation";
import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { ArrowLeft, Check } from "lucide-react";
import { Button, Card, Eyebrow, Input, ProgressBar, TextArea, cx } from "@/components/ui";
import { DayPicker } from "@/components/forms/common";
import { FlashMark } from "@/components/logo";
import { useToast } from "@/components/toast";
import { getDb } from "@/lib/db";
import { saveAnswer, updatePrefs } from "@/lib/repo";
import { CHAPTERS, buildAssessment, optionsFor, rhythmDayName, visibleQuestions, type Answers, type DraftItem, type Question } from "@/lib/onboarding";
import { applyAnswerPreferences, approveDrafts, finishWithoutPlan } from "@/lib/approval";
import { formatTime } from "@/lib/dates";

function OnboardingInner() {
  const router = useRouter();
  const params = useSearchParams();
  const toast = useToast();
  const prefs = useLiveQuery(() => getDb().prefs.get("prefs"), []);
  const answerRows = useLiveQuery(() => getDb().answers.toArray(), []);
  const answers: Answers = useMemo(() => Object.fromEntries((answerRows ?? []).map((a) => [a.id, a.value])), [answerRows]);
  const visible = useMemo(() => visibleQuestions(answers), [answers]);
  const [stageChoice, setStage] = useState<"intro" | "questions" | "results" | null>(null);
  // Without an explicit choice: results if asked for, resume questions if an assessment is in progress, else the intro.
  const stage = stageChoice ?? (params.get("step") === "results" ? "results" : prefs?.onboarding.status === "in_progress" ? "questions" : "intro");

  if (!prefs || !answerRows) return <div className="flex min-h-dvh items-center justify-center"><FlashMark size={40} /></div>;
  const index = Math.min(prefs.onboarding.index, Math.max(0, visible.length - 1));
  const q = visible[index];
  const go = async (i: number) => {
    if (i >= visible.length) { setStage("results"); return; }
    await updatePrefs({ onboarding: { ...prefs.onboarding, status: prefs.onboarding.status === "completed" || prefs.onboarding.status === "defaults" ? prefs.onboarding.status : "in_progress", index: Math.max(0, i) } });
    setStage("questions");
  };

  if (stage === "intro") {
    return (
      <main className="mx-auto flex min-h-dvh max-w-lg flex-col justify-between px-6 pb-[calc(24px+env(safe-area-inset-bottom))] pt-[calc(48px+env(safe-area-inset-top))]">
        <div className="flex flex-col gap-6">
          <FlashMark size={44} className="pop" />
          <div><Eyebrow>Personal Performance OS</Eyebrow><h1 className="mt-3 text-4xl font-bold leading-tight tracking-tight">Let's set up your system.</h1></div>
          <p className="text-[16px] text-muted">About 30 short questions in 5 chapters, around 6 minutes. Skip anything. Answers save as you go, so you can leave and come back. At the end you review a draft plan; nothing is added until you approve it.</p>
          <ul className="flex flex-col gap-2 text-sm text-muted">{CHAPTERS.map((c, i) => <li key={c} className="flex items-center gap-3"><span className="tnum flex size-7 items-center justify-center rounded-full border border-line text-xs">{i + 1}</span>{c}</li>)}</ul>
        </div>
        <div className="mt-10 flex flex-col gap-2">
          <Button variant="primary" size="lg" block onClick={() => go(prefs.onboarding.status === "in_progress" ? index : 0)}>{prefs.onboarding.status === "in_progress" ? "Continue where I left off" : "Start"}</Button>
          <Button variant="ghost" block onClick={async () => { await updatePrefs({ onboarding: { ...prefs.onboarding, status: prefs.onboarding.status === "completed" ? "completed" : "defaults" } }); router.replace("/"); }}>Start with defaults</Button>
          <p className="text-center text-xs text-muted">Defaults skip the assessment. You can take it later in Settings.</p>
        </div>
      </main>
    );
  }

  if (stage === "results") return <Results answers={answers} onBack={() => go(Math.max(0, visible.length - 1))} onDone={() => router.replace("/")} toast={toast} />;

  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col px-6 pb-[calc(20px+env(safe-area-inset-bottom))] pt-[calc(20px+env(safe-area-inset-top))]">
      <div className="flex items-center gap-2">
        <button aria-label="Back" className="flex size-11 items-center justify-center rounded-xl text-muted hover:text-ink" onClick={() => (index === 0 ? setStage("intro") : go(index - 1))}><ArrowLeft size={20} /></button>
        <div className="flex-1"><ProgressBar value={(index + 1) / visible.length} label="Onboarding progress" /></div>
        <span className="tnum w-14 text-right text-xs text-muted">{index + 1}/{visible.length}</span>
      </div>
      <Eyebrow className="mt-8">Chapter {q.chapter} · {CHAPTERS[q.chapter - 1]}</Eyebrow>
      <h1 id="q-title" className="mt-3 text-[26px] font-semibold leading-tight tracking-tight">{q.prompt}</h1>
      {q.help && <p className="mt-2 text-[15px] text-muted">{q.help}</p>}
      <div className="mt-6 flex-1"><QuestionInput key={q.id} q={q} answers={answers} /></div>
      <div className="mt-8 flex gap-2">
        {q.optional && <Button variant="ghost" onClick={() => go(index + 1)}>Skip</Button>}
        <Button variant="primary" size="lg" className="flex-1" disabled={!q.optional && !isAnswered(answers[q.id])} onClick={() => go(index + 1)}>{index === visible.length - 1 ? "See my plan" : "Next"}</Button>
      </div>
    </main>
  );
}

function isAnswered(v: unknown) { return Array.isArray(v) ? v.length > 0 : v !== undefined && v !== null && v !== ""; }

function QuestionInput({ q, answers }: { q: Question; answers: Answers }) {
  const v = answers[q.id];
  const [text, setText] = useState(typeof v === "string" ? v : "");
  if (q.type === "single" || q.type === "multi") {
    const opts = optionsFor(q, answers);
    const sel: string[] = q.type === "multi" ? (Array.isArray(v) ? (v as string[]) : []) : typeof v === "string" ? [v] : [];
    return (
      <div role="group" aria-labelledby="q-title" className="flex flex-col gap-2">
        {q.type === "multi" && q.max && <p className="text-xs text-muted">{sel.length}/{q.max} selected</p>}
        {opts.map((o) => {
          const on = sel.includes(o.value);
          return (
            <button key={o.value} aria-pressed={on} onClick={() => {
              if (q.type === "single") saveAnswer(q.id, on ? undefined : o.value);
              else { const next = on ? sel.filter((x) => x !== o.value) : q.max && sel.length >= q.max ? sel : [...sel, o.value]; saveAnswer(q.id, next); }
            }} className={cx("flex min-h-14 items-center justify-between rounded-2xl border px-4 text-left text-[16px] font-medium transition active:scale-[.99]", on ? "border-flash bg-flash/10" : "border-line bg-graphite/60 hover:border-muted/60")}>
              {o.label}{on && <Check size={18} className="text-flash" aria-hidden="true" />}
            </button>
          );
        })}
        {!opts.length && <p className="text-sm text-muted">Nothing to choose from yet. Go back and pick some areas, or skip.</p>}
      </div>
    );
  }
  if (q.type === "days") return <DayPicker label="Days" value={Array.isArray(v) ? (v as number[]) : []} onChange={(d) => saveAnswer(q.id, d)} />;
  if (q.type === "time") return <Input aria-labelledby="q-title" type="time" value={typeof v === "string" ? v : ""} onChange={(e) => saveAnswer(q.id, e.target.value || undefined)} className="max-w-48" />;
  return q.multiline
    ? <TextArea aria-labelledby="q-title" value={text} placeholder={q.placeholder} maxLength={500} onChange={(e) => { setText(e.target.value); saveAnswer(q.id, e.target.value); }} />
    : <Input aria-labelledby="q-title" value={text} placeholder={q.placeholder} maxLength={120} onChange={(e) => { setText(e.target.value); saveAnswer(q.id, e.target.value); }} />;
}

function Results({ answers, onBack, onDone, toast }: { answers: Answers; onBack: () => void; onDone: () => void; toast: (m: string) => void }) {
  const a = useMemo(() => buildAssessment(answers), [answers]);
  const [items, setItems] = useState<DraftItem[]>(a.drafts);
  const [busy, setBusy] = useState(false);
  const toggle = (k: string) => setItems((xs) => xs.map((x) => (x.key === k ? { ...x, checked: !x.checked } : x)));
  async function approve() {
    setBusy(true);
    await applyAnswerPreferences(answers);
    const r = await approveDrafts(items);
    toast(r.created + r.updated ? `Plan saved: ${r.created} added${r.updated ? `, ${r.updated} updated` : ""}` : "Preferences saved");
    onDone();
  }
  const chosen = items.filter((i) => i.checked).length;
  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col gap-6 px-6 pb-[calc(24px+env(safe-area-inset-bottom))] pt-[calc(28px+env(safe-area-inset-top))]">
      <div><Eyebrow>Your assessment</Eyebrow><h1 className="mt-2 text-3xl font-bold tracking-tight">Here's your starting point.</h1></div>
      <Card><ul className="flex flex-col gap-2 text-[15px]">{a.summary.map((s) => <li key={s}>{s}</li>)}</ul>
        {a.facts.length > 0 && <p className="mt-3 text-xs text-muted">Based on what you told me: {a.facts.join(" · ")}. Nothing here is a test result or a personality reading.</p>}</Card>
      <section><h2 className="mb-2 text-lg font-semibold">Priority areas</h2><ol className="flex flex-col gap-2">{a.priorities.map((p, i) => (
        <li key={p.label} className="flex gap-3 rounded-2xl border border-line/70 bg-graphite/60 p-4"><span className="tnum text-flash">{i + 1}</span><span><b className="block">{p.label}</b><span className="text-sm text-muted">{p.reason}</span></span></li>))}</ol></section>
      {items.length > 0 ? (
        <section><h2 className="mb-1 text-lg font-semibold">Drafted for you</h2><p className="mb-3 text-sm text-muted">Untick anything you don't want. Approving again later updates these instead of duplicating them.</p>
          <ul className="flex flex-col gap-2">{items.map((it) => (
            <li key={it.key}><button aria-pressed={it.checked} onClick={() => toggle(it.key)} className={cx("flex w-full items-start gap-3 rounded-2xl border p-4 text-left transition", it.checked ? "border-flash/70 bg-flash/5" : "border-line bg-graphite/40")}>
              <span className={cx("mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md border", it.checked ? "border-flash bg-flash text-obsidian" : "border-line")}>{it.checked && <Check size={14} />}</span>
              <span className="min-w-0"><span className="block font-semibold">{it.label} <span className="text-xs font-normal text-muted">{it.kind === "habit" ? "Habit" : "Repeating task"}</span></span><span className="block text-sm text-ink/80">{it.detail}</span><span className="mt-1 block text-xs text-muted">Why: {it.reason}</span></span>
            </button></li>))}</ul></section>
      ) : <p className="text-sm text-muted">You chose not to draft habits. You can add your own anytime.</p>}
      {a.rhythm.some((d) => d.items.length) && (
        <section><h2 className="mb-1 text-lg font-semibold">Draft weekly rhythm</h2><p className="mb-3 text-sm text-muted">A shape for the week built around the commitments you entered. It is a suggestion, not a schedule that gets created.</p>
          <ul className="flex flex-col divide-y divide-line/60 rounded-2xl border border-line/70">{[1, 2, 3, 4, 5, 6, 0].map((d) => {
            const day = a.rhythm[d]; if (!day.items.length) return null;
            return <li key={d} className="flex gap-4 px-4 py-3 text-sm"><b className="w-24 shrink-0">{rhythmDayName(d)}</b><span className="flex flex-col gap-0.5">{day.items.map((x, i) => <span key={i} className={x.kind === "rest" ? "text-flash" : ""}>{x.time ? `${formatTime(x.time)} · ` : ""}{x.label}</span>)}</span></li>;
          })}</ul></section>
      )}
      <Card className="border-flash/40"><Eyebrow>Next action</Eyebrow><p className="mt-2 font-semibold">{a.nextAction}</p></Card>
      <div className="flex flex-col gap-2">
        <Button variant="primary" size="lg" block disabled={busy} onClick={approve}>{chosen ? `Approve ${chosen} item${chosen > 1 ? "s" : ""} and start` : "Save preferences and start"}</Button>
        <Button variant="ghost" block onClick={async () => { await applyAnswerPreferences(answers); await finishWithoutPlan(); onDone(); }}>Start without adding anything</Button>
        <Button variant="ghost" block onClick={onBack}>Back to questions</Button>
      </div>
    </main>
  );
}

export default function OnboardingPage() {
  return <Suspense fallback={null}><OnboardingInner /></Suspense>;
}

