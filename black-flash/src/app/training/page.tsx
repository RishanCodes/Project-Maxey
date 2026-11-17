"use client";
import { useMemo, useState } from "react";
import { Copy, Dumbbell, Plus } from "lucide-react";
import { Button, Card, Chip, EmptyState, IconButton, Select, Skeleton, SectionHeader } from "@/components/ui";
import { useToast } from "@/components/toast";
import { TrainingForm, TYPE_LABEL } from "@/components/forms/training-form";
import { MinutesBars } from "@/components/charts/bars";
import { usePrefs, useSnapshot, useToday } from "@/hooks/use-data";
import { activityName, copyTraining } from "@/lib/repo";
import { addDays, formatDateKey, formatTime, plural, relativeDay, startOfWeek } from "@/lib/dates";
import { trainingInRange, trainingLoad } from "@/lib/stats";
import { ACTIVITIES, type TrainingSession } from "@/lib/schema";

export default function TrainingPage() {
  const prefs = usePrefs(); const snap = useSnapshot(); const { today } = useToday(prefs?.timezone);
  const toast = useToast();
  const [form, setForm] = useState<{ session?: TrainingSession; status: TrainingSession["status"] } | null>(null);
  const [activity, setActivity] = useState<string>("all"); const [type, setType] = useState("all"); const [tag, setTag] = useState("all");
  const weeks = useMemo(() => {
    if (!snap || !prefs) return [];
    const start = startOfWeek(today, prefs.weekStart);
    return Array.from({ length: 8 }, (_, i) => addDays(start, -7 * (7 - i))).map((w) => ({ name: formatDateKey(w, { month: "numeric", day: "numeric" }), value: trainingInRange(snap, w, addDays(w, 6)).minutes }));
  }, [snap, prefs, today]);
  if (!prefs || !snap) return <Skeleton className="h-64" />;
  const load = trainingLoad(snap, today);
  const completed = snap.training.filter((t) => t.status === "completed").sort((a, b) => (b.date + (b.startTime ?? "")).localeCompare(a.date + (a.startTime ?? "")));
  const planned = snap.training.filter((t) => t.status === "planned").sort((a, b) => a.date.localeCompare(b.date));
  const tags = Array.from(new Set(completed.flatMap((t) => t.focusAreas))).sort();
  const history = completed.filter((t) => (activity === "all" || t.activity === activity) && (type === "all" || t.type === type) && (tag === "all" || t.focusAreas.includes(tag)));
  const row = (s: TrainingSession) => (
    <li key={s.id} className="flex items-center rounded-2xl border border-line/70 bg-graphite/60">
      <button className="min-w-0 flex-1 px-4 py-3 text-left" onClick={() => setForm({ session: s, status: s.status })}>
        <b className="block">{activityName(s)} <span className="text-sm font-normal text-muted">· {TYPE_LABEL[s.type]}</span></b>
        <span className="block text-sm text-muted">{[relativeDay(s.date, today), formatTime(s.startTime), `${s.durationMin} min`, s.effort && `effort ${s.effort}/10`].filter(Boolean).join(" · ")}</span>
        {(s.focusAreas.length > 0 || s.shots.length > 0) && <span className="block truncate text-xs text-muted">{[...s.focusAreas, ...s.shots.map((x) => `${x.label} ${x.made}/${x.attempted}`)].join(" · ")}</span>}
      </button>
      <IconButton label={`Copy ${activityName(s)} to today as planned`} onClick={async () => { await copyTraining(s.id, today); toast("Copied to today as a planned session"); }}><Copy size={16} /></IconButton>
    </li>);
  return (
    <div className="flex flex-col gap-7">
      <div className="flex items-end justify-between gap-3"><h1 className="text-3xl font-bold tracking-tight">Training</h1>
        <div className="flex gap-2"><Button size="sm" onClick={() => setForm({ status: "planned" })}>Plan</Button><Button size="sm" variant="primary" onClick={() => setForm({ status: "completed" })}><Plus size={16} />Log session</Button></div></div>
      {snap.training.length === 0 ? (
        <EmptyState icon={<Dumbbell size={28} />} title="No sessions yet" body="Log a practice, game, gym session or recovery work. Minutes, focus areas and shot makes build your history." action={<Button variant="primary" onClick={() => setForm({ status: "completed" })}>Log your first session</Button>} />
      ) : (
        <>
          <Card>
            <SectionHeader title="Last 7 days" sub={`${plural(load.last7Sessions, "session")} · ${load.last7Minutes} min${load.priorWeeklyAvg ? ` · prior weekly average ${load.priorWeeklyAvg} min` : ""}`} />
            <MinutesBars label="Training minutes per week, last 8 weeks" data={weeks} />
            <p className="mt-2 text-xs text-muted">Minutes of completed sessions per week (weeks start {prefs.weekStart ? "Monday" : "Sunday"}).</p>
            {load.dense && <p className="mt-3 rounded-xl border border-line bg-subtle px-3 py-2 text-sm">This week is denser than usual. Consider an easier day or a planned rest day. This is a scheduling prompt, not a medical assessment.</p>}
          </Card>
          {planned.length > 0 && <section><SectionHeader title="Planned" /><ul className="flex flex-col gap-2">{planned.map(row)}</ul></section>}
          <section>
            <SectionHeader title="History" sub={`${history.length} of ${completed.length} sessions`} />
            <div className="mb-3 flex flex-col gap-2">
              <div className="flex flex-wrap gap-1.5"><Chip selected={activity === "all"} onClick={() => setActivity("all")}>All</Chip>{ACTIVITIES.map((a) => <Chip key={a} selected={activity === a} onClick={() => setActivity(a)} className="capitalize">{a}</Chip>)}</div>
              <div className="grid grid-cols-2 gap-2">
                <Select aria-label="Filter by type" value={type} onChange={(e) => setType(e.target.value)}><option value="all">All types</option>{Object.entries(TYPE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select>
                <Select aria-label="Filter by focus area" value={tag} onChange={(e) => setTag(e.target.value)}><option value="all">All focus areas</option>{tags.map((t) => <option key={t} value={t}>{t}</option>)}</Select>
              </div>
            </div>
            {history.length ? <ul className="flex flex-col gap-2">{history.map(row)}</ul> : <p className="text-sm text-muted">No sessions match these filters.</p>}
          </section>
        </>
      )}
      <TrainingForm open={!!form} onOpenChange={(o) => !o && setForm(null)} session={form?.session} defaultDate={today} defaultStatus={form?.status ?? "completed"} />
    </div>
  );
}
