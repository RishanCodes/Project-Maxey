"use client";
import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Moon, Plus, Utensils } from "lucide-react";
import { Button, Card, ConfirmSheet, EmptyState, Field, Input, Segmented, Sheet, Skeleton, SectionHeader, TextArea } from "@/components/ui";
import { useToast } from "@/components/toast";
import { CheckinForm } from "@/components/forms/checkin-form";
import { usePrefs, useSnapshot, useToday } from "@/hooks/use-data";
import { getDb } from "@/lib/db";
import { deleteMeal, saveMeal } from "@/lib/repo";
import { addDays, formatTime, relativeDay } from "@/lib/dates";
import { wellnessSeries } from "@/lib/stats";
import type { MealEntry } from "@/lib/schema";

export default function WellnessPage() {
  const prefs = usePrefs(); const snap = useSnapshot(); const { today } = useToday(prefs?.timezone);
  const [tab, setTab] = useState<"checkins" | "meals">("checkins");
  const [checkinDate, setCheckinDate] = useState<string | null>(null);
  if (!prefs || !snap) return <Skeleton className="h-64" />;
  const w = wellnessSeries(snap, addDays(today, -13), today);
  const todays = snap.checkins.find((c) => c.date === today);
  const recent = [...snap.checkins].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 14);
  const fmt = (x: { avg: number | null; n: number }, d = 1) => (x.avg === null ? "—" : x.avg.toFixed(d));
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-end justify-between"><h1 className="text-3xl font-bold tracking-tight">Recovery</h1><Button variant="primary" size="sm" onClick={() => setCheckinDate(today)}>{todays ? "Edit today" : "Check in"}</Button></div>
      <Segmented label="Recovery section" value={tab} onChange={setTab} options={[{ value: "checkins", label: "Check-ins" }, { value: "meals", label: "Meal journal" }]} />
      {tab === "checkins" ? (
        <>
          {snap.checkins.length === 0 ? <EmptyState icon={<Moon size={28} />} title="No check-ins yet" body="A 20-second check-in on sleep and energy helps you notice patterns. Every field is optional, and rest days are logged here too." action={<Button variant="primary" onClick={() => setCheckinDate(today)}>Check in now</Button>} /> : (
            <>
              <Card>
                <SectionHeader title="Last 14 days" sub={`${w.rows.length} check-in${w.rows.length === 1 ? "" : "s"}`} />
                <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                  {[["Sleep", `${fmt(w.sleep)} h`, w.sleep.n], ["Energy", `${fmt(w.energy)}/5`, w.energy.n], ["Mood", `${fmt(w.mood)}/5`, w.mood.n], ["Rest days", String(w.restDays), w.rows.length]].map(([k, v, n]) => (
                    <div key={k as string}><dt className="text-xs text-muted">{k}</dt><dd className="tnum text-xl font-semibold">{v}</dd><dd className="text-xs text-muted">{n} value{n === 1 ? "" : "s"}</dd></div>))}
                </dl>
                {w.rows.length > 0 && w.rows.length < 7 && <p className="mt-3 text-xs text-muted">Small sample: averages from fewer than 7 days can move a lot.</p>}
                {w.restDays > 0 && <p className="mt-2 text-sm text-flash">Rest logged {w.restDays} time{w.restDays > 1 ? "s" : ""}. Rest counts as part of the plan.</p>}
              </Card>
              <section><SectionHeader title="Recent" /><ul className="flex flex-col gap-2">{recent.map((c) => (
                <li key={c.id}><button onClick={() => setCheckinDate(c.date)} className="flex w-full items-center justify-between gap-3 rounded-2xl border border-line/70 bg-graphite/60 px-4 py-3 text-left">
                  <span><b className="block">{relativeDay(c.date, today)}{c.restDay && <span className="ml-2 text-xs font-normal text-flash">Rest day</span>}</b>
                    <span className="block text-sm text-muted">{[c.sleepHours !== undefined && `${c.sleepHours} h sleep`, c.energy && `energy ${c.energy}/5`, c.mood && `mood ${c.mood}/5`, c.soreness && `soreness ${c.soreness}/5`].filter(Boolean).join(" · ") || "Note only"}</span></span>
                </button></li>))}</ul></section>
            </>
          )}
        </>
      ) : <Meals today={today} />}
      <CheckinForm open={!!checkinDate} onOpenChange={(o) => !o && setCheckinDate(null)} date={checkinDate ?? today} />
    </div>
  );
}

function Meals({ today }: { today: string }) {
  const meals = useLiveQuery(() => getDb().meals.orderBy("date").reverse().limit(60).toArray(), []);
  const toast = useToast();
  const [edit, setEdit] = useState<MealEntry | null | "new">(null);
  const [desc, setDesc] = useState(""); const [notes, setNotes] = useState(""); const [hydration, setHydration] = useState(""); const [time, setTime] = useState(""); const [date, setDate] = useState(today);
  const [error, setError] = useState(""); const [confirm, setConfirm] = useState(false);
  const open = (m: MealEntry | "new") => { setEdit(m); const e = m === "new" ? undefined : m; setDesc(e?.description ?? ""); setNotes(e?.notes ?? ""); setHydration(e?.hydration ?? ""); setTime(e?.time ?? ""); setDate(e?.date ?? today); setError(""); };
  async function save() {
    if (!desc.trim()) return setError("Describe the meal.");
    await saveMeal({ id: edit && edit !== "new" ? edit.id : undefined, date, time: time || undefined, description: desc.trim(), notes: notes.trim(), hydration: hydration.trim() });
    toast("Meal saved"); setEdit(null);
  }
  if (!meals) return <Skeleton className="h-40" />;
  return (
    <>
      <p className="text-sm text-muted">A simple, judgment-free food journal for noticing how fueling relates to how you feel. No calorie targets, no scores.</p>
      <Button onClick={() => open("new")} className="self-start"><Plus size={16} />Add meal</Button>
      {meals.length === 0 ? <EmptyState icon={<Utensils size={28} />} title="Nothing logged" body="Optional. Log a meal before a game or practice to see what works for you." /> :
        <ul className="flex flex-col gap-2">{meals.map((m) => (
          <li key={m.id}><button onClick={() => open(m)} className="w-full rounded-2xl border border-line/70 bg-graphite/60 px-4 py-3 text-left"><b className="block">{m.description}</b><span className="text-sm text-muted">{[relativeDay(m.date, today), formatTime(m.time), m.hydration].filter(Boolean).join(" · ")}</span></button></li>))}</ul>}
      <Sheet open={!!edit} onOpenChange={(o) => !o && setEdit(null)} title={edit === "new" ? "Add meal" : "Edit meal"} footer={<>
        {edit && edit !== "new" && <Button variant="danger" onClick={() => setConfirm(true)}>Delete</Button>}
        <Button variant="primary" className="flex-1" onClick={save}>Save</Button></>}>
        <div className="flex flex-col gap-4">
          <Field label="What did you eat?" htmlFor="m-desc" error={error}><Input id="m-desc" value={desc} onChange={(e) => setDesc(e.target.value)} maxLength={300} /></Field>
          <div className="grid grid-cols-2 gap-3"><Field label="Date" htmlFor="m-date"><Input id="m-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field><Field label="Time" htmlFor="m-time"><Input id="m-time" type="time" value={time} onChange={(e) => setTime(e.target.value)} /></Field></div>
          <Field label="Hydration (optional)" htmlFor="m-h"><Input id="m-h" value={hydration} onChange={(e) => setHydration(e.target.value)} placeholder="e.g. 1 bottle before practice" maxLength={120} /></Field>
          <Field label="How did it feel / fueling notes (optional)" htmlFor="m-n"><TextArea id="m-n" value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={500} /></Field>
        </div>
      </Sheet>
      {edit && edit !== "new" && <ConfirmSheet open={confirm} onOpenChange={setConfirm} danger title="Delete this meal entry?" body="This can't be undone." confirmLabel="Delete" onConfirm={async () => { await deleteMeal(edit.id); setEdit(null); toast("Deleted"); }} />}
    </>
  );
}
