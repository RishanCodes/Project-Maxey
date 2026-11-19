"use client";
import { useEffect, useState } from "react";
import { Button, Card, Chip, Field, Input, SectionHeader, Switch, TextArea } from "@/components/ui";
import { DayPicker } from "@/components/forms/common";
import { getAnswers } from "@/lib/repo";
import { SKILL_LABEL } from "@/lib/program/drills";
import { PHASES } from "@/lib/program/engine";
import { SKILLS, type ProgramProfile, type Skill } from "@/lib/schema";
import { formatDateKey, type DateKey } from "@/lib/dates";

const FROM_ONBOARDING: Record<string, Skill> = {
  finishing: "finishing", shooting: "shooting", "ball handling": "handles", "decision-making": "iq", defense: "defense",
  "change of pace": "handles", conditioning: "conditioning", explosiveness: "explosiveness",
};
const RATING = ["Just starting", "Below average", "Solid", "Good", "A real strength"];

export function defaultProfile(): ProgramProfile {
  return { goal: "", position: "unsure", experience: "jv", age: "13-15", focus: [], ratings: {}, days: [1, 2, 4, 6], minutes: 45, practiceDays: [], hoop: true, court: true, gym: false, partner: false, injuries: [] };
}

/** Program setup (also used to edit the schedule later, with `editing`). */
export function ProgramIntake({ initial, today, editing, onSubmit, onCancel }: {
  initial?: ProgramProfile; today: DateKey; editing?: boolean; onSubmit: (p: ProgramProfile, startDate: DateKey) => Promise<void>; onCancel?: () => void;
}) {
  const [p, setP] = useState<ProgramProfile>(initial ?? defaultProfile());
  const [start, setStart] = useState<DateKey>(today);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (patch: Partial<ProgramProfile>) => setP((x) => ({ ...x, ...patch }));

  // Pre-fill from onboarding answers the first time.
  useEffect(() => {
    if (initial) return;
    getAnswers().then((a) => {
      const skills = (Array.isArray(a.skills) ? (a.skills as string[]) : []).map((s) => FROM_ONBOARDING[s]).filter(Boolean);
      const strengths = (Array.isArray(a.strengths) ? (a.strengths as string[]) : []).map((s) => FROM_ONBOARDING[s]).filter(Boolean);
      const fac = Array.isArray(a.facilities) ? (a.facilities as string[]) : [];
      const practice = Array.isArray(a.practiceDays) ? (a.practiceDays as number[]) : [];
      setP((x) => ({
        ...x,
        focus: Array.from(new Set(skills)).slice(0, 3),
        ratings: Object.fromEntries(strengths.map((s) => [s, 4])),
        practiceDays: practice,
        days: practice.length ? [1, 2, 3, 4, 5, 6, 0].filter((d) => !practice.includes(d)).slice(0, 4) : x.days,
        minutes: a.sessionLength === "short" ? 30 : a.sessionLength === "long" ? 60 : x.minutes,
        court: fac.length ? fac.includes("court") : x.court, hoop: fac.length ? fac.includes("court") : x.hoop, gym: fac.includes("gym"),
        goal: typeof a.progressVision === "string" ? a.progressVision.slice(0, 300) : x.goal,
      }));
    }).catch(() => {});
  }, [initial]);

  const toggleFocus = (s: Skill) => set({ focus: p.focus.includes(s) ? p.focus.filter((x) => x !== s) : p.focus.length >= 3 ? p.focus : [...p.focus, s] });
  async function submit() {
    if (!p.focus.length) return setError("Pick at least one skill to focus on.");
    if (p.days.length < 2) return setError("Pick at least two training days.");
    setError(""); setBusy(true);
    try { await onSubmit(p, start); } finally { setBusy(false); }
  }
  const sessions = p.days.length;
  return (
    <div className="flex flex-col gap-5">
      {!editing && (
        <Card className="flex flex-col gap-3">
          <SectionHeader title="Your goal" sub="What should be different in 90 days?" />
          <Field label="In 90 days I want to…" htmlFor="pg-goal"><TextArea id="pg-goal" value={p.goal} maxLength={300} onChange={(e) => set({ goal: e.target.value })} placeholder="For example: finish through contact and make varsity" /></Field>
          <fieldset><legend className="mb-1.5 text-sm font-medium text-muted">Position</legend><div className="flex flex-wrap gap-1.5">{(["guard", "wing", "big", "unsure"] as const).map((v) => <Chip key={v} selected={p.position === v} onClick={() => set({ position: v })} className="capitalize">{v === "unsure" ? "Not sure" : v}</Chip>)}</div></fieldset>
          <fieldset><legend className="mb-1.5 text-sm font-medium text-muted">Level</legend><div className="flex flex-wrap gap-1.5">{([["beginner", "Beginner"], ["jv", "JV / club"], ["varsity", "Varsity"], ["advanced", "Advanced"]] as const).map(([v, l]) => <Chip key={v} selected={p.experience === v} onClick={() => set({ experience: v })}>{l}</Chip>)}</div></fieldset>
          <fieldset><legend className="mb-1.5 text-sm font-medium text-muted">Age</legend><div className="flex flex-wrap gap-1.5">{([["u13", "Under 13"], ["13-15", "13–15"], ["16-18", "16–18"], ["18+", "18+"]] as const).map(([v, l]) => <Chip key={v} selected={p.age === v} onClick={() => set({ age: v })}>{l}</Chip>)}</div>
            <p className="mt-1 text-xs text-muted">Used to keep jump and weight training age-appropriate.</p></fieldset>
        </Card>
      )}

      {!editing && (
        <Card className="flex flex-col gap-3">
          <SectionHeader title="Focus" sub="Up to three, in order of priority. The first gets the most time." />
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Focus skills">
            {SKILLS.map((s) => { const i = p.focus.indexOf(s); return <Chip key={s} selected={i >= 0} onClick={() => toggleFocus(s)}>{i >= 0 ? `${i + 1}. ` : ""}{SKILL_LABEL[s]}</Chip>; })}
          </div>
          {p.focus.map((s) => (
            <fieldset key={s}><legend className="mb-1.5 text-sm font-medium text-muted">{SKILL_LABEL[s]}: where are you now?</legend>
              <div className="flex flex-wrap gap-1.5">{RATING.map((l, i) => <Chip key={l} selected={(p.ratings[s] ?? 2) === i + 1} onClick={() => set({ ratings: { ...p.ratings, [s]: i + 1 } })} aria-label={`${SKILL_LABEL[s]}: ${l}`}>{l}</Chip>)}</div>
            </fieldset>
          ))}
          <p className="text-xs text-muted">Your rating sets the starting drill level. The baseline test on day one and your feedback adjust it from there.</p>
        </Card>
      )}

      <Card className="flex flex-col gap-3">
        <SectionHeader title="Schedule" sub={`${sessions} sessions a week, about ${p.minutes} minutes each`} />
        <DayPicker label="Training days" value={p.days} onChange={(days) => set({ days })} />
        <fieldset><legend className="mb-1.5 text-sm font-medium text-muted">Minutes per session</legend><div className="flex flex-wrap gap-1.5">{[20, 30, 45, 60, 75, 90].map((m) => <Chip key={m} selected={p.minutes === m} onClick={() => set({ minutes: m })}>{m}</Chip>)}</div></fieldset>
        <DayPicker label="Team practice or game days (training on these days stays light)" value={p.practiceDays} onChange={(practiceDays) => set({ practiceDays })} />
        {!editing && <Field label="Start date" htmlFor="pg-start" hint={formatDateKey(start)}><Input id="pg-start" type="date" value={start} min={today} onChange={(e) => e.target.value && setStart(e.target.value)} /></Field>}
      </Card>

      <Card className="flex flex-col gap-1">
        <SectionHeader title="What you can use" />
        <Switch checked={p.hoop} onChange={(hoop) => set({ hoop })} label="A hoop" description="Without one, shooting and finishing use form and footwork drills." />
        <Switch checked={p.court} onChange={(court) => set({ court })} label="Room to run (court, driveway, field)" />
        <Switch checked={p.gym} onChange={(gym) => set({ gym })} label="A gym or weights" />
        <Switch checked={p.partner} onChange={(partner) => set({ partner })} label="Sometimes a partner" />
        <fieldset className="pt-2"><legend className="mb-1.5 text-sm font-medium text-muted">Anything to be careful with?</legend>
          <div className="flex flex-wrap gap-1.5">{(["knees", "ankles", "back", "shoulder"] as const).map((v) => <Chip key={v} selected={p.injuries.includes(v)} onClick={() => set({ injuries: p.injuries.includes(v) ? p.injuries.filter((x) => x !== v) : [...p.injuries, v] })} className="capitalize">{v}</Chip>)}</div>
          <p className="mt-1 text-xs text-muted">Flagged areas skip high-impact work. This isn&apos;t medical advice: if something hurts, stop and talk to a trusted adult or a professional.</p></fieldset>
      </Card>

      {!editing && (
        <Card className="flex flex-col gap-2">
          <SectionHeader title="How the 90 days work" />
          <ol className="flex flex-col gap-2 text-sm">{PHASES.map((ph) => <li key={ph.key}><b>{ph.name}</b> <span className="text-muted">({ph.weeks})</span>: {ph.purpose}</li>)}</ol>
          <p className="text-sm text-muted">Tests on day one and in weeks 5, 9 and 13 show your growth in real numbers. Each week adapts to what you did and how it felt, and each day adapts to your check-in.</p>
        </Card>
      )}

      {error && <p role="alert" className="text-sm text-red">{error}</p>}
      <div className="flex gap-2">
        {onCancel && <Button onClick={onCancel}>Cancel</Button>}
        <Button variant="primary" block onClick={submit} disabled={busy}>{editing ? "Save schedule" : "Start my 90 days"}</Button>
      </div>
    </div>
  );
}
