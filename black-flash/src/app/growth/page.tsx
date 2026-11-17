"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Award, ChevronDown, Lock } from "lucide-react";
import { Button, Card, Eyebrow, ProgressBar, Segmented, Skeleton, SectionHeader, cx } from "@/components/ui";
import { MinutesBars } from "@/components/charts/bars";
import { ValueLine } from "@/components/charts/lines";
import { useCreatedDate, usePrefs, useSnapshot, useToday } from "@/hooks/use-data";
import { getDb } from "@/lib/db";
import { addDays, dateInTz, formatDateKey, startOfWeek } from "@/lib/dates";
import { completionSeries, focusInRange, goalProgress, habitConsistency, pct, taskCompletion, trainingInRange, trainingSeries, wellnessSeries, xpByCategory } from "@/lib/stats";
import { levelInfo, XP } from "@/lib/config";
import { totalXp } from "@/lib/repo";
import { ACHIEVEMENTS } from "@/lib/achievements";

type Range = "7" | "30" | "90";

export default function GrowthPage() {
  const prefs = usePrefs(); const snap = useSnapshot(); const { today } = useToday(prefs?.timezone);
  const created = useCreatedDate(prefs?.timezone);
  const unlocked = useLiveQuery(() => getDb().achievements.toArray(), []);
  const [range, setRange] = useState<Range>("7");
  const [more, setMore] = useState(false); const [howXp, setHowXp] = useState(false);
  const from = addDays(today, -(Number(range) - 1));
  const data = useMemo(() => {
    if (!snap || !prefs) return null;
    const series = completionSeries(snap, from, today, prefs.weekStart, created);
    let chart: { name: string; value: number }[];
    if (range === "90") {
      const weeks: Record<string, { p: number; d: number }> = {};
      for (const x of series) { const w = startOfWeek(x.key, prefs.weekStart); weeks[w] = weeks[w] || { p: 0, d: 0 }; weeks[w].p += x.planned; weeks[w].d += x.done; }
      chart = Object.entries(weeks).map(([w, v]) => ({ name: formatDateKey(w, { month: "numeric", day: "numeric" }), value: v.p ? Math.round((v.d / v.p) * 100) : 0 }));
    } else chart = series.map((x) => ({ name: formatDateKey(x.key, range === "7" ? { weekday: "short" } : { month: "numeric", day: "numeric" }), value: x.planned ? Math.round((x.done / x.planned) * 100) : 0 }));
    return {
      chart, planned: series.reduce((a, x) => a + x.planned, 0), done: series.reduce((a, x) => a + x.done, 0),
      tasks: taskCompletion(snap, from, today, today, created), habits: habitConsistency(snap, from, today, prefs.weekStart, today),
      training: trainingInRange(snap, from, today), focus: focusInRange(snap, from, today), wellness: wellnessSeries(snap, from, today),
      tSeries: trainingSeries(snap, from, today, prefs.weekStart).map((x) => ({ name: formatDateKey(x.key, { month: "numeric", day: "numeric" }), value: x.minutes })),
      milestones: snap.milestones.filter((m) => m.doneAt && m.doneAt.slice(0, 10) >= from).length,
    };
  }, [snap, prefs, from, today, created, range]);
  if (!prefs || !snap || !data || !unlocked) return <Skeleton className="h-80" />;
  const xp = totalXp(snap.xp), L = levelInfo(xp), cats = xpByCategory(snap.xp);
  const energyLine = data.wellness.rows.filter((r) => r.energy !== undefined).map((r) => ({ name: formatDateKey(r.date, { month: "numeric", day: "numeric" }), value: r.energy ?? null }));
  const rows: [string, string, string][] = [
    ["Task follow-through", data.tasks.planned ? `${data.tasks.done}/${data.tasks.planned}` : "—", data.tasks.planned ? `${pct(data.tasks.rate)} of planned task occurrences completed` : "No tasks were planned in this range"],
    ["Habit consistency", data.habits.expected ? `${data.habits.done}/${data.habits.expected}` : "—", data.habits.expected ? `${pct(data.habits.rate)} of scheduled check-ins (rest and paused days excluded)` : "No habits were scheduled"],
    ["Training", `${data.training.sessions}`, `${data.training.minutes} min across completed sessions${data.training.attempted ? ` · shooting ${data.training.made}/${data.training.attempted} (${pct(data.training.shootingPct)})` : ""}`],
    ["Focus", `${data.focus.sessions}`, `${data.focus.minutes} min in completed sessions`],
    ["Milestones", `${data.milestones}`, "goal milestones completed"],
  ];
  return (
    <div className="flex flex-col gap-7">
      <h1 className="text-3xl font-bold tracking-tight">Growth</h1>
      <Segmented label="Date range" value={range} onChange={setRange} options={[{ value: "7", label: "Week" }, { value: "30", label: "Month" }, { value: "90", label: "90 days" }]} />
      <Card>
        <SectionHeader title="Plan completion" sub={`${formatDateKey(from)} – ${formatDateKey(today)} · ${data.done} of ${data.planned} planned items done`} />
        {data.planned ? <MinutesBars label="Percent of planned items completed" unit="%" domain={[0, 100]} data={data.chart} /> : <p className="py-8 text-center text-sm text-muted">Nothing was planned in this range yet. Tasks and habits you schedule will show here.</p>}
        <p className="mt-2 text-xs text-muted">Each bar: completed ÷ planned for that {range === "90" ? "week" : "day"} (tasks due plus habits scheduled; flexible habits count when done).</p>
      </Card>
      <section aria-label="Summary">
        <ul className="divide-y divide-line/60 rounded-[var(--radius-card)] border border-line/70">
          {rows.map(([k, v, d]) => <li key={k} className="flex items-center gap-4 px-5 py-4"><span className="min-w-0 flex-1"><b className="block">{k}</b><span className="text-sm text-muted">{d}</span></span><span className="tnum text-xl font-semibold">{v}</span></li>)}
          {(data.wellness.energy.n > 0 || data.wellness.mood.n > 0) && <li className="flex items-center gap-4 px-5 py-4"><span className="min-w-0 flex-1"><b className="block">Energy & mood</b><span className="text-sm text-muted">Average of {data.wellness.energy.n} energy and {data.wellness.mood.n} mood values you logged{data.wellness.rows.length < 7 ? " (small sample)" : ""}</span></span><span className="tnum text-xl font-semibold">{data.wellness.energy.avg?.toFixed(1) ?? "—"} / {data.wellness.mood.avg?.toFixed(1) ?? "—"}</span></li>}
        </ul>
      </section>
      <div>
        <Button variant="ghost" onClick={() => setMore(!more)} aria-expanded={more}><ChevronDown size={18} className={cx("transition", more && "rotate-180")} />{more ? "Hide" : "More"} charts</Button>
        {more && <div className="mt-3 flex flex-col gap-4">
          <Card><SectionHeader title="Training minutes" sub={range === "90" ? "per week" : "per day"} />{data.training.minutes ? <MinutesBars label="Training minutes" data={data.tSeries} /> : <p className="text-sm text-muted">No completed sessions in this range.</p>}</Card>
          <Card><SectionHeader title="Energy" sub="only days you checked in" />{energyLine.length >= 2 ? <ValueLine label="Energy check-ins" data={energyLine} domain={[1, 5]} unit="/5" /> : <p className="text-sm text-muted">Log at least two check-ins with energy to see a trend.</p>}</Card>
        </div>}
      </div>
      <Card>
        <div className="flex items-start justify-between gap-3"><div><Eyebrow>Progression</Eyebrow><p className="mt-2 text-2xl font-semibold">Level {L.level}</p><p className="tnum text-sm text-muted">{xp} XP · {L.need - L.into} to level {L.level + 1}</p></div><Award size={24} className="text-muted" aria-hidden="true" /></div>
        <div className="mt-4"><ProgressBar value={L.into / L.need} label="Progress to next level" accent={false} /></div>
        {prefs.gamification !== "subtle" && <dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-5">{Object.entries(cats).map(([k, v]) => <div key={k}><dt className="text-xs text-muted">{k}</dt><dd className="tnum font-semibold">{v} XP</dd></div>)}</dl>}
        <button className="mt-4 text-sm font-semibold text-flash" aria-expanded={howXp} onClick={() => setHowXp(!howXp)}>How XP works</button>
        {howXp && <div className="mt-2 space-y-1 text-sm text-muted">
          <p>XP tracks logged follow-through in this app. It is not a measure of ability.</p>
          <p>Task occurrence +{XP.task} · Habit check +{XP.habit} · Training session +{XP.training} · Check-in or planned rest day +{XP.checkin} · Focus session +{XP.focus} · Goal milestone +{XP.milestone}.</p>
          <p>Each action earns once. Undoing it reverses exactly what it earned. At most {XP.dailyCap} XP per day, so logging extra never pays. Rest days earn XP the same as workouts.</p>
        </div>}
      </Card>
      <section><SectionHeader title="Achievements" sub={`${unlocked.length} of ${ACHIEVEMENTS.length} unlocked`} />
        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">{ACHIEVEMENTS.map((a) => { const u = unlocked.find((x) => x.id === a.id); return (
          <li key={a.id} className={cx("flex items-start gap-3 rounded-2xl border px-4 py-3", u ? "border-line bg-graphite/60" : "border-line/50 opacity-60")}>
            {u ? <Award size={18} className="mt-0.5 text-flash" aria-hidden="true" /> : <Lock size={16} className="mt-0.5 text-muted" aria-hidden="true" />}
            <span><b className="block">{a.name}</b><span className="text-sm text-muted">{a.description}</span>{u && <span className="block text-xs text-muted">Unlocked {formatDateKey(dateInTz(new Date(u.unlockedAt), prefs.timezone))}</span>}</span></li>); })}</ul></section>
      {snap.goals.some((g) => g.status === "active") && <section><SectionHeader title="Goals" action={<Link href="/goals" className="text-sm text-muted">All goals</Link>} />
        <ul className="flex flex-col gap-3">{snap.goals.filter((g) => g.status === "active").slice(0, 4).map((g) => { const p = goalProgress(g, snap.milestones); return (
          <li key={g.id} className="rounded-2xl border border-line/70 px-4 py-3"><div className="flex justify-between gap-3"><b>{g.title}</b><span className="tnum text-sm text-muted">{p.pct === null ? "—" : `${p.pct}%`}</span></div>
            <div className="mt-2"><ProgressBar value={(p.pct ?? 0) / 100} label={`${g.title} progress`} accent={false} /></div><p className="mt-1 text-xs text-muted">{p.source === "manual" ? "Manually set" : p.source === "milestones" ? `${p.done}/${p.total} milestones` : "No milestones yet"}</p></li>); })}</ul></section>}
    </div>
  );
}
