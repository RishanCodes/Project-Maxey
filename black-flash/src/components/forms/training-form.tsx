"use client";
import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button, Chip, ConfirmSheet, Field, IconButton, Input, Select, Sheet, Switch, TextArea } from "../ui";
import { ScaleChips, numOrUndef } from "./common";
import { useToast } from "../toast";
import { getDb } from "@/lib/db";
import { activityName, deleteTraining, newId, saveTraining } from "@/lib/repo";
import { ACTIVITIES, FOCUS_AREAS, SESSION_TYPES, type Drill, type ShotRecord, type TrainingSession } from "@/lib/schema";
import { addDays } from "@/lib/dates";
import { trainingInRange } from "@/lib/stats";

const TYPE_LABEL: Record<(typeof SESSION_TYPES)[number], string> = { team_practice: "Team practice", game: "Game", independent: "Independent", gym: "Gym", recovery: "Recovery" };
export { TYPE_LABEL };

type Props = { open: boolean; onOpenChange: (o: boolean) => void; session?: TrainingSession; defaultDate: string; defaultStatus?: TrainingSession["status"] };
export function TrainingForm(props: Props) {
  if (!props.open) return null;
  return <TrainingFormBody key={`${props.session?.id ?? "new"}:${props.session?.status ?? props.defaultStatus ?? "completed"}`} {...props} />;
}

function TrainingFormBody({ open, onOpenChange, session, defaultDate, defaultStatus = "completed" }: Props) {
  const toast = useToast();
  const [date, setDate] = useState(session?.date ?? defaultDate); const [time, setTime] = useState(session?.startTime ?? "");
  const [activity, setActivity] = useState<TrainingSession["activity"]>(session?.activity ?? "basketball"); const [custom, setCustom] = useState(session?.customActivity ?? "");
  const [type, setType] = useState<TrainingSession["type"]>(session?.type ?? "independent"); const [duration, setDuration] = useState(String(session?.durationMin ?? 45));
  const [completed, setCompleted] = useState((session?.status ?? defaultStatus) === "completed");
  const [effort, setEffort] = useState<number | undefined>(session?.effort); const [energy, setEnergy] = useState<number | undefined>(session?.energy); const [soreness, setSoreness] = useState<number | undefined>(session?.soreness);
  const [focus, setFocus] = useState<string[]>(session?.focusAreas ?? []); const [customFocus, setCustomFocus] = useState("");
  const [notes, setNotes] = useState(session?.notes ?? ""); const [drills, setDrills] = useState<Drill[]>(session?.drills ?? []); const [shots, setShots] = useState<ShotRecord[]>(session?.shots ?? []);
  const [errors, setErrors] = useState<Record<string, string>>({}); const [confirm, setConfirm] = useState(false);

  async function save() {
    const e: Record<string, string> = {};
    const dur = numOrUndef(duration);
    if (!dur || dur < 1 || dur > 600) e.duration = "Enter minutes between 1 and 600.";
    if (!date) e.date = "Pick a date.";
    if (activity === "custom" && !custom.trim()) e.custom = "Name the activity.";
    shots.forEach((s, i) => { if (s.made > s.attempted) e[`shot${i}`] = "Makes cannot exceed attempts."; });
    setErrors(e);
    if (Object.keys(e).length) return;
    const { session: s, xp } = await saveTraining({
      id: session?.id, date, startTime: time || undefined, activity, customActivity: activity === "custom" ? custom.trim() : undefined, type, durationMin: dur!,
      effort, energy, soreness, focusAreas: focus, notes: notes.trim(), status: completed ? "completed" : "planned",
      drills: drills.filter((d) => d.name.trim()), shots: shots.filter((x) => x.label.trim()),
    });
    if (s.status === "completed") {
      const all = await getDb().training.toArray();
      const snap = { tasks: [], taskCompletions: [], habits: [], habitCompletions: [], goals: [], milestones: [], training: all, checkins: [], focus: [], xp: [] };
      const wk = trainingInRange(snap, addDays(s.date, -6), s.date);
      const shotsTxt = s.shots.length ? ` Shooting: ${s.shots.reduce((a, x) => a + x.made, 0)}/${s.shots.reduce((a, x) => a + x.attempted, 0)}.` : "";
      toast(`Logged ${s.durationMin} min ${activityName(s).toLowerCase()}${xp ? ` (+${xp} XP)` : ""}. Last 7 days: ${wk.sessions} sessions, ${wk.minutes} min.${shotsTxt}`);
    } else toast("Session planned");
    onOpenChange(false);
  }

  const updDrill = (id: string, patch: Partial<Drill>) => setDrills((ds) => ds.map((d) => (d.id === id ? { ...d, ...patch } : d)));
  const updShot = (id: string, patch: Partial<ShotRecord>) => setShots((ss) => ss.map((s) => (s.id === id ? { ...s, ...patch } : s)));

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange} title={session ? "Edit session" : completed ? "Log training" : "Plan training"} footer={<>
        {session && <Button variant="danger" onClick={() => setConfirm(true)}>Delete</Button>}
        <Button variant="primary" className="flex-1" onClick={save}>{completed ? "Save session" : "Save plan"}</Button>
      </>}>
        <form className="flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); save(); }}>
          <Switch checked={completed} onChange={setCompleted} label="Completed" description={completed ? "Counts toward history, charts and XP." : "Planned only. Mark it completed after you train."} />
          <fieldset><legend className="mb-1.5 text-sm font-medium text-muted">Activity</legend><div className="flex flex-wrap gap-1.5">
            {ACTIVITIES.map((a) => <Chip key={a} selected={activity === a} onClick={() => setActivity(a)} className="capitalize">{a}</Chip>)}
          </div></fieldset>
          {activity === "custom" && <Field label="Activity name" htmlFor="tr-custom" error={errors.custom}><Input id="tr-custom" value={custom} onChange={(e) => setCustom(e.target.value)} invalid={!!errors.custom} maxLength={40} /></Field>}
          <Field label="Type" htmlFor="tr-type"><Select id="tr-type" value={type} onChange={(e) => setType(e.target.value as TrainingSession["type"])}>{SESSION_TYPES.map((t) => <option key={t} value={t}>{TYPE_LABEL[t]}</option>)}</Select></Field>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Date" htmlFor="tr-date" error={errors.date}><Input id="tr-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
            <Field label="Start" htmlFor="tr-time"><Input id="tr-time" type="time" value={time} onChange={(e) => setTime(e.target.value)} /></Field>
            <Field label="Minutes" htmlFor="tr-dur" error={errors.duration}><Input id="tr-dur" inputMode="numeric" value={duration} onChange={(e) => setDuration(e.target.value)} invalid={!!errors.duration} /></Field>
          </div>
          <fieldset><legend className="mb-1.5 text-sm font-medium text-muted">Focus areas</legend><div className="flex flex-wrap gap-1.5">
            {[...FOCUS_AREAS, ...focus.filter((f) => !(FOCUS_AREAS as readonly string[]).includes(f))].map((f) => <Chip key={f} selected={focus.includes(f)} onClick={() => setFocus(focus.includes(f) ? focus.filter((x) => x !== f) : [...focus, f])}>{f}</Chip>)}
          </div>
            <div className="mt-2 flex gap-2"><Input aria-label="Add a custom focus area" placeholder="Add your own" value={customFocus} onChange={(e) => setCustomFocus(e.target.value)} maxLength={30} />
              <Button type="button" size="sm" onClick={() => { const v = customFocus.trim().toLowerCase(); if (v && !focus.includes(v)) setFocus([...focus, v]); setCustomFocus(""); }}>Add</Button></div>
          </fieldset>
          {completed && <>
            <ScaleChips label="Effort" max={10} value={effort} onChange={setEffort} lowLabel="Easy" highLabel="All-out" />
            <ScaleChips label="Energy" max={5} value={energy} onChange={setEnergy} lowLabel="Drained" highLabel="Fresh" />
            <ScaleChips label="Soreness" max={5} value={soreness} onChange={setSoreness} lowLabel="None" highLabel="A lot" />
            <p className="text-xs text-muted">These are your own ratings, not a medical readiness score.</p>
          </>}
          <div>
            <div className="mb-2 flex items-center justify-between"><p className="text-sm font-medium text-muted">Workout / drills</p><Button type="button" size="sm" onClick={() => setDrills([...drills, { id: newId(), name: "", done: completed }])}><Plus size={16} />Add</Button></div>
            <div className="flex flex-col gap-2">
              {drills.map((d, i) => (
                <div key={d.id} className="rounded-2xl border border-line p-3">
                  <div className="flex items-center gap-2">
                    <input type="checkbox" aria-label={`Drill ${i + 1} done`} checked={d.done} onChange={(e) => updDrill(d.id, { done: e.target.checked })} className="size-5 accent-[#17BCE4]" />
                    <Input aria-label={`Drill ${i + 1} name`} placeholder="Drill or exercise" value={d.name} onChange={(e) => updDrill(d.id, { name: e.target.value })} maxLength={80} />
                    <IconButton type="button" label="Remove drill" onClick={() => setDrills(drills.filter((x) => x.id !== d.id))}><Trash2 size={16} /></IconButton>
                  </div>
                  <div className="mt-2 grid grid-cols-3 gap-2">
                    <Input aria-label="Sets" placeholder="Sets" inputMode="numeric" value={d.sets ?? ""} onChange={(e) => updDrill(d.id, { sets: numOrUndef(e.target.value) })} />
                    <Input aria-label="Reps" placeholder="Reps" inputMode="numeric" value={d.reps ?? ""} onChange={(e) => updDrill(d.id, { reps: numOrUndef(e.target.value) })} />
                    <Input aria-label="Minutes" placeholder="Min" inputMode="numeric" value={d.durationMin ?? ""} onChange={(e) => updDrill(d.id, { durationMin: numOrUndef(e.target.value) })} />
                  </div>
                </div>
              ))}
            </div>
          </div>
          {completed && (
            <div>
              <div className="mb-2 flex items-center justify-between"><p className="text-sm font-medium text-muted">Shot log (optional)</p><Button type="button" size="sm" onClick={() => setShots([...shots, { id: newId(), label: "Shots", made: 0, attempted: 0 }])}><Plus size={16} />Add</Button></div>
              <div className="flex flex-col gap-2">
                {shots.map((s, i) => (
                  <div key={s.id} className="rounded-2xl border border-line p-3">
                    <div className="flex items-center gap-2">
                      <Input aria-label={`Shot type ${i + 1}`} value={s.label} onChange={(e) => updShot(s.id, { label: e.target.value })} maxLength={40} />
                      <IconButton type="button" label="Remove shot record" onClick={() => setShots(shots.filter((x) => x.id !== s.id))}><Trash2 size={16} /></IconButton>
                    </div>
                    <div className="mt-2 grid grid-cols-3 items-center gap-2">
                      <Input aria-label="Made" inputMode="numeric" value={s.made} onChange={(e) => updShot(s.id, { made: Math.max(0, Math.round(numOrUndef(e.target.value) ?? 0)) })} />
                      <Input aria-label="Attempted" inputMode="numeric" value={s.attempted} onChange={(e) => updShot(s.id, { attempted: Math.max(0, Math.round(numOrUndef(e.target.value) ?? 0)) })} />
                      <p className="tnum text-center text-sm text-muted">{s.attempted ? `${Math.round((s.made / s.attempted) * 100)}%` : "—"}</p>
                    </div>
                    {errors[`shot${i}`] && <p role="alert" className="mt-1 text-xs text-red">{errors[`shot${i}`]}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}
          <Field label="Notes" htmlFor="tr-notes"><TextArea id="tr-notes" value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={2000} /></Field>
          <button type="submit" hidden />
        </form>
      </Sheet>
      {session && <ConfirmSheet open={confirm} onOpenChange={setConfirm} danger title="Delete this session?" body="It is removed from history and charts, and its XP is reversed." confirmLabel="Delete session"
        onConfirm={async () => { await deleteTraining(session.id); onOpenChange(false); toast("Session deleted"); }} />}
    </>
  );
}
