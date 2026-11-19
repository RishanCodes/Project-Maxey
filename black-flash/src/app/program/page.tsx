"use client";
import { useMemo, useState } from "react";
import { Circle, CircleCheck, CircleMinus, Flame, Pause, Play, TrendingDown, TrendingUp } from "lucide-react";
import { Button, Card, ConfirmSheet, Field, Input, ProgressBar, SectionHeader, Sheet, Skeleton, cx } from "@/components/ui";
import { useToast } from "@/components/toast";
import { usePrefs, useToday } from "@/hooks/use-data";
import { useProgram } from "@/hooks/use-program";
import { ProgramIntake } from "@/components/program/intake";
import { SessionCard } from "@/components/program/session";
import { finishProgram, pauseProgram, resumeProgram, saveBenchmark, startProgram, updateProgramProfile } from "@/lib/repo";
import {
  PROGRAM_DAYS, dayNumber, phaseOfWeek, planDay, programSummary, roundForWeek, testResults, weekDates, weekParams, type DayPlan, type PlanContext,
} from "@/lib/program/engine";
import { SKILL_LABEL, TESTS } from "@/lib/program/drills";
import { formatDateKey, relativeDay } from "@/lib/dates";
import { play } from "@/lib/sound";

export default function ProgramPage() {
  const prefs = usePrefs();
  const { today } = useToday(prefs?.timezone);
  const ctx = useProgram(prefs ? today : undefined);
  const toast = useToast();
  const [starting, setStarting] = useState(false);
  if (!prefs || ctx === undefined) return <Skeleton className="h-80" />;

  const running = ctx && (ctx.program.status === "active" || ctx.program.status === "paused");
  if (!running || starting) {
    return (
      <div className="flex flex-col gap-6">
        <header>
          <p className="text-xs font-semibold uppercase tracking-widest text-flash">90-day program</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">{ctx && !starting ? "Your last 90 days" : "Build your 90 days"}</h1>
          {!ctx || starting ? <p className="mt-2 text-muted">A plan built around your schedule, your focus and what you can use, that adapts every week to how it&apos;s going and every day to how you feel.</p> : null}
        </header>
        {ctx && !starting && <Results ctx={ctx} />}
        {ctx && !starting ? <Button variant="primary" onClick={() => setStarting(true)}>Start a new 90 days</Button> : (
          <ProgramIntake today={today} onCancel={ctx ? () => setStarting(false) : undefined} onSubmit={async (profile, start) => {
            await startProgram(profile, start); setStarting(false); play("levelUp"); toast("Your 90 days are set. Day one is a baseline test.");
          }} />
        )}
      </div>
    );
  }
  return <Active ctx={ctx} />;
}

function Active({ ctx }: { ctx: PlanContext }) {
  const toast = useToast();
  const [full, setFull] = useState(false);
  const [edit, setEdit] = useState(false);
  const [end, setEnd] = useState(false);
  const [preview, setPreview] = useState<DayPlan | null>(null);
  const p = ctx.program;
  const s = programSummary(ctx);
  const plan = useMemo(() => planDay(ctx, ctx.today, { full }), [ctx, full]);
  const before = s.day === null && ctx.today < p.startDate;
  const week = before ? 1 : s.week;
  const ph = phaseOfWeek(week);
  const wp = useMemo(() => weekParams(ctx, week), [ctx, week]);
  const days = useMemo(() => weekDates(p, week).map((d) => planDay(ctx, d)), [ctx, p, week]);
  const paused = p.status === "paused";
  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-3">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-flash">{ph.name} · Week {week} of 13</p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight">{before ? `Starts ${relativeDay(p.startDate, ctx.today).toLowerCase()}` : s.finished ? "90 days complete" : `Day ${s.day ?? s.elapsed} of ${PROGRAM_DAYS}`}</h1>
          </div>
          <div className="text-right"><span className="inline-flex items-center gap-1 text-xl font-bold tnum"><Flame size={18} className="text-flash" aria-hidden="true" />{s.streak}</span><span className="block text-xs text-muted">session streak</span></div>
        </div>
        <ProgressBar value={Math.min(1, s.elapsed / PROGRAM_DAYS)} label={`${s.elapsed} of ${PROGRAM_DAYS} days`} />
        <p className="text-sm text-muted">{s.sessionsDone} sessions · {s.minutes} min trained{p.profile.goal ? ` · Goal: ${p.profile.goal}` : ""}</p>
      </header>

      {s.finished ? (
        <Card className="flex flex-col gap-3"><SectionHeader title="You did the 90" sub="Compare your final test with day one below." />
          <Button variant="primary" onClick={async () => { await finishProgram(p.id, "completed"); play("levelUp"); toast("Program complete."); }}>Finish program</Button></Card>
      ) : before ? (
        <Card><p className="text-sm text-muted">Your program starts on {formatDateKey(p.startDate)}. Day one is a baseline test.</p></Card>
      ) : (
        <SessionCard key={`${plan.date}:${full}`} ctx={ctx} plan={plan} full={full} setFull={setFull} />
      )}

      <section>
        <SectionHeader title="This week" sub={ph.purpose} />
        <ul className="flex flex-col gap-1.5">
          {days.map((d) => {
            const log = ctx.logs.find((l) => l.date === d.date);
            const icon = log ? (log.status === "skipped" ? <CircleMinus size={20} className="text-muted" /> : <CircleCheck size={20} className="text-flash" />) : <Circle size={20} className={d.kind === "rest" ? "text-line" : "text-muted"} />;
            return (
              <li key={d.date}>
                <button className={cx("flex w-full items-center gap-3 rounded-xl border border-line/60 px-3 py-2.5 text-left", d.date === ctx.today && "border-flash/60")} onClick={() => d.kind !== "rest" && setPreview(d)} disabled={d.kind === "rest"}>
                  {icon}
                  <span className="min-w-0 flex-1"><b className="block text-[15px]">{relativeDay(d.date, ctx.today)}</b><span className="block truncate text-sm text-muted">{d.kind === "rest" ? d.title : `${d.title} · ${d.minutes} min`}</span></span>
                  <span className="text-xs text-muted">Day {d.day}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      {wp.notes.length > 0 && (
        <Card className="flex flex-col gap-2"><SectionHeader title="How your plan adapted" />
          <ul className="flex flex-col gap-2 text-sm">{wp.notes.map((n) => <li key={n.text} className={cx(n.kind === "adjust" && "border-l-2 border-flash pl-3")}>{n.text}</li>)}</ul>
        </Card>
      )}

      <Results ctx={ctx} canAdd />

      <Card className="flex flex-col gap-2"><SectionHeader title="Manage" sub={`${p.profile.days.length} days a week · ${p.profile.minutes} min · focus: ${p.profile.focus.map((f) => SKILL_LABEL[f]).join(", ")}`} />
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={() => setEdit(true)}>Change schedule</Button>
          {paused ? <Button size="sm" onClick={async () => { await resumeProgram(p.id, ctx.today); toast("Welcome back. Picking up where you left off."); }}><Play size={15} />Resume</Button>
            : <Button size="sm" onClick={async () => { await pauseProgram(p.id, ctx.today); toast("Paused. Paused days don't count toward your 90."); }}><Pause size={15} />Pause (injury, trip, season)</Button>}
          <Button size="sm" variant="danger" onClick={() => setEnd(true)}>End program</Button>
        </div>
      </Card>

      <Sheet open={edit} onOpenChange={setEdit} title="Change schedule" description="Future sessions are rebuilt. What you've already logged stays.">
        {edit && <ProgramIntake editing initial={p.profile} today={ctx.today} onCancel={() => setEdit(false)} onSubmit={async (prof) => { await updateProgramProfile(p.id, prof); setEdit(false); toast("Schedule updated"); }} />}
      </Sheet>
      <ConfirmSheet open={end} onOpenChange={setEnd} title="End this program?" body="Your logs, tests and XP are kept. You can start a new 90 days any time." confirmLabel="End program" danger onConfirm={async () => { await finishProgram(p.id, "ended"); toast("Program ended"); }} />
      <Sheet open={!!preview} onOpenChange={(o) => !o && setPreview(null)} title={preview ? `${relativeDay(preview.date, ctx.today)}: ${preview.title}` : ""} description={preview ? `Day ${preview.day} · ${preview.minutes} min · may adjust to your check-in on the day` : undefined}>
        {preview && <div className="flex flex-col gap-3">{preview.blocks.map((b) => <div key={b.label}><h3 className="text-sm font-semibold uppercase tracking-wider text-muted">{b.label}</h3><ul className="text-sm">{b.items.map((i) => <li key={i.drill.id} className="py-1">{i.drill.name} <span className="text-muted">· {i.drill.dose}</span></li>)}</ul></div>)}
          {preview.tests.length > 0 && <p className="text-sm">Tests: {preview.tests.map((t) => t.name).join(", ")}</p>}</div>}
      </Sheet>
    </div>
  );
}

function Results({ ctx, canAdd }: { ctx: PlanContext; canAdd?: boolean }) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const rows = testResults(ctx);
  const day = dayNumber(ctx.program, ctx.today);
  const round = roundForWeek(day ? Math.ceil(Math.min(day, 90) / 7) : 1);
  const prof = ctx.program.profile;
  const tests = TESTS.filter((t) => (prof.focus.includes(t.skill) || (t.skill === "shooting" && prof.hoop)) && t.needs.every((n) => (n === "hoop" ? prof.hoop : n === "court" ? prof.court : n === "gym" ? prof.gym : prof.partner)));
  const [vals, setVals] = useState<Record<string, string>>({});
  return (
    <Card className="flex flex-col gap-3">
      <SectionHeader title="Tests" sub="Baseline vs. latest. Retests in weeks 5, 9 and 13." action={canAdd ? <Button size="sm" onClick={() => setOpen(true)}>Add results</Button> : undefined} />
      {rows.length === 0 ? <p className="text-sm text-muted">No results yet. Your baseline test is the first session.</p> : (
        <ul className="flex flex-col divide-y divide-line/50">
          {rows.map((r) => (
            <li key={r.test.id} className="flex items-center gap-3 py-2">
              <span className="min-w-0 flex-1"><b className="block text-[15px]">{r.test.name}</b><span className="text-xs text-muted">{SKILL_LABEL[r.test.skill]}</span></span>
              <span className="tnum text-right text-sm">{r.baseline ?? "–"} → <b>{r.latest ?? "–"}</b></span>
              {r.change !== undefined && <span className={cx("inline-flex w-16 items-center justify-end gap-1 text-sm tnum", r.change > 0 ? "text-flash" : r.change < 0 ? "text-red" : "text-muted")}>{r.change >= 0 ? <TrendingUp size={14} aria-hidden="true" /> : <TrendingDown size={14} aria-hidden="true" />}{`${r.change >= 0 ? "+" : ""}${Math.round(r.change * 100)}%`}</span>}
            </li>
          ))}
        </ul>
      )}
      <Sheet open={open} onOpenChange={setOpen} title={`Test results: round ${round + 1} of 4`} description={["Baseline (week 1)", "Retest (week 5)", "Retest (week 9)", "Final (week 13)"][round]}
        footer={<Button variant="primary" block onClick={async () => {
          let n = 0;
          for (const t of tests) { const v = vals[t.id]; if (v && v.trim() !== "" && Number.isFinite(Number(v))) { await saveBenchmark(ctx.program.id, t.id, round, Math.max(0, Number(v)), ctx.today); n++; } }
          setOpen(false); setVals({}); if (n) { play("save"); toast(`Saved ${n} result${n > 1 ? "s" : ""}`); }
        }}>Save results</Button>}>
        <div className="flex flex-col gap-3">{tests.map((t) => <Field key={t.id} label={t.name} htmlFor={`r-${t.id}`} hint={t.how}><Input id={`r-${t.id}`} inputMode="decimal" placeholder={t.unit} value={vals[t.id] ?? ""} onChange={(e) => setVals((v) => ({ ...v, [t.id]: e.target.value }))} /></Field>)}</div>
      </Sheet>
    </Card>
  );
}
