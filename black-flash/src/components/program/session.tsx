"use client";
import { useState } from "react";
import { Check, ChevronDown, Circle, CircleCheck, Info } from "lucide-react";
import { Button, Card, Chip, Field, Input, Sheet, TextArea, cx } from "@/components/ui";
import { ScaleChips } from "@/components/forms/common";
import { useToast } from "@/components/toast";
import { logProgramSession, saveBenchmark, skipProgramDay, undoProgramLog } from "@/lib/repo";
import { roundForWeek, type DayPlan, type PlanContext } from "@/lib/program/engine";
import { play } from "@/lib/sound";
import type { ProgramLog } from "@/lib/schema";

type Progress = { done: string[]; shots: Record<string, { made: string; att: string }>; tests: Record<string, string> };
const empty: Progress = { done: [], shots: {}, tests: {} };
const key = (programId: string, date: string) => `bf-prog:${programId}:${date}`;
function load(k: string): Progress {
  try { const v = localStorage.getItem(k); return v ? { ...empty, ...JSON.parse(v) } : empty; } catch { return empty; }
}
function save(k: string, v: Progress) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* per-device convenience only */ } }

const KIND_LABEL: Record<DayPlan["kind"], string> = { train: "Training", light: "Light day", recovery: "Recovery", test: "Test day", rest: "Rest" };

export function SessionCard({ ctx, plan, full, setFull }: { ctx: PlanContext; plan: DayPlan; full: boolean; setFull: (v: boolean) => void }) {
  const toast = useToast();
  const k = key(ctx.program.id, plan.date);
  const [prog, setProg] = useState<Progress>(() => (typeof window === "undefined" ? empty : load(k)));
  const [finish, setFinish] = useState(false);
  const [skip, setSkip] = useState(false);
  const update = (fn: (p: Progress) => Progress) => setProg((p) => { const n = fn(p); save(k, n); return n; });
  const log = ctx.logs.find((l) => l.date === plan.date);
  const items = plan.blocks.flatMap((b) => b.items.map((i, n) => ({ id: `${b.label}:${i.drill.id}:${n}`, ...i })));
  const doneCount = items.filter((i) => prog.done.includes(i.id)).length;
  const paused = ctx.program.status === "paused";

  if (log) return <LoggedCard ctx={ctx} plan={plan} log={log} />;
  if (plan.kind === "rest") {
    return (
      <Card className="flex flex-col gap-2">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted">{paused ? "Paused" : "Rest day"}</p>
        <h2 className="text-xl font-bold">{paused ? "Program paused" : "Recover today"}</h2>
        <p className="text-sm text-muted">{paused ? "Paused days don't count toward your 90. Resume whenever you're ready." : plan.why[0]}</p>
      </Card>
    );
  }
  return (
    <Card className="flex flex-col gap-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-flash">{KIND_LABEL[plan.kind]} · Day {plan.day} · {plan.minutes} min</p>
        <h2 className="mt-1 text-2xl font-bold tracking-tight">{plan.title}</h2>
      </div>
      {plan.readiness && plan.readiness.level !== "normal" && plan.scheduled !== "test" && (
        <div className="rounded-xl border border-line bg-subtle px-3 py-2 text-sm">
          {full ? <>Full session restored, even though {plan.readiness.reasons.join(" and ")}. Listen to your body.</> : plan.kind === "recovery" ? <>Recovery today because {plan.readiness.reasons.join(" and ")}.</> : <>Lighter today because {plan.readiness.reasons.join(" and ")}.</>}
          <button className="ml-1 font-semibold text-flash underline-offset-2 hover:underline" onClick={() => setFull(!full)}>{full ? "Use the adjusted session" : "Use the full session"}</button>
        </div>
      )}
      {plan.why.length > 0 && (
        <details className="group rounded-xl border border-line/70 px-3 py-2 text-sm">
          <summary className="flex cursor-pointer list-none items-center gap-2 font-medium"><Info size={15} className="text-flash" aria-hidden="true" />Why this session<ChevronDown size={15} className="ml-auto transition group-open:rotate-180" aria-hidden="true" /></summary>
          <ul className="mt-2 flex list-disc flex-col gap-1 pl-5 text-muted">{plan.why.map((w) => <li key={w}>{w}</li>)}</ul>
        </details>
      )}

      {plan.kind === "test" && (
        <section className="flex flex-col gap-3" aria-label="Tests">
          <h3 className="font-semibold">Tests (round {roundForWeek(plan.week) + 1} of 4)</h3>
          {plan.tests.map((t) => {
            const prev = ctx.benchmarks.find((b) => b.testId === t.id && b.round === roundForWeek(plan.week));
            return (
              <Field key={t.id} label={t.name} htmlFor={`test-${t.id}`} hint={t.how}>
                <Input id={`test-${t.id}`} inputMode="decimal" value={prog.tests[t.id] ?? (prev ? String(prev.value) : "")} placeholder={t.unit}
                  onChange={(e) => update((p) => ({ ...p, tests: { ...p.tests, [t.id]: e.target.value } }))} />
              </Field>
            );
          })}
          <p className="text-xs text-muted">Skip any test you can&apos;t do today. You can add results later under Tests.</p>
        </section>
      )}

      {plan.blocks.map((b) => (
        <section key={b.label} aria-label={b.label}>
          <h3 className="mb-1 text-sm font-semibold uppercase tracking-wider text-muted">{b.label}</h3>
          <ul className="flex flex-col">
            {b.items.map((it, n) => {
              const id = `${b.label}:${it.drill.id}:${n}`, on = prog.done.includes(id);
              const extra = it.minutes > it.drill.minutes + 1;
              const sh = prog.shots[id];
              return (
                <li key={id} className="border-b border-line/50 py-2 last:border-0">
                  <div className="flex items-start gap-2">
                    <button aria-pressed={on} aria-label={on ? `Mark ${it.drill.name} not done` : `Mark ${it.drill.name} done`} className="flex size-11 shrink-0 items-center justify-center"
                      onClick={() => { update((p) => ({ ...p, done: on ? p.done.filter((x) => x !== id) : [...p.done, id] })); play(on ? "undo" : "tick"); }}>
                      {on ? <CircleCheck size={24} className="text-flash" /> : <Circle size={24} className="text-muted" />}
                    </button>
                    <details className="group min-w-0 flex-1 pt-2">
                      <summary className="cursor-pointer list-none">
                        <span className={cx("font-medium", on && "text-muted line-through")}>{it.drill.name}</span>
                        <span className="block text-sm text-muted">{it.drill.dose} · {it.minutes} min{extra ? " (repeat the set to fill the time)" : ""}</span>
                      </summary>
                      <p className="mt-2 text-sm">{it.drill.how}</p>
                      <ul className="mt-1 flex flex-col gap-0.5 text-sm text-muted">{it.drill.cues.map((c) => <li key={c}>• {c}</li>)}</ul>
                    </details>
                  </div>
                  {it.drill.track && (
                    <div className="ml-13 mt-1 grid max-w-xs grid-cols-2 gap-2">
                      <Input aria-label={`${it.drill.name} makes`} inputMode="numeric" placeholder="Makes" value={sh?.made ?? ""} onChange={(e) => update((p) => ({ ...p, shots: { ...p.shots, [id]: { made: e.target.value, att: p.shots[id]?.att ?? "" } } }))} />
                      <Input aria-label={`${it.drill.name} attempts`} inputMode="numeric" placeholder={`of ${it.drill.track.attempts}`} value={sh?.att ?? ""} onChange={(e) => update((p) => ({ ...p, shots: { ...p.shots, [id]: { made: p.shots[id]?.made ?? "", att: e.target.value } } }))} />
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      ))}

      <div className="flex flex-col gap-2 sm:flex-row">
        <Button variant="primary" block onClick={() => setFinish(true)} disabled={paused}><Check size={18} />Finish session{items.length ? ` (${doneCount}/${items.length})` : ""}</Button>
        <Button variant="ghost" onClick={() => setSkip(true)} disabled={paused}>Skip today</Button>
      </div>
      {finish && <FinishSheet open={finish} onOpenChange={setFinish} ctx={ctx} plan={plan} prog={prog} items={items}
        onDone={(xp) => { save(k, empty); play(plan.kind === "test" ? "milestone" : "training"); toast(`Day ${plan.day} done${xp ? ` (+${xp} XP)` : ""}. ${encouragement(plan)}`); }} />}
      <SkipSheet open={skip} onOpenChange={setSkip} ctx={ctx} plan={plan} onDone={(msg) => toast(msg)} />
    </Card>
  );
}

function encouragement(plan: DayPlan): string {
  const left = 90 - (plan.day ?? 0);
  return left <= 0 ? "That's all 90." : left <= 7 ? `${left} days left. Finish strong.` : plan.week % 4 === 0 ? "Lighter week. Let it sink in." : `${left} days to go.`;
}

function FinishSheet({ open, onOpenChange, ctx, plan, prog, items, onDone }: {
  open: boolean; onOpenChange: (o: boolean) => void; ctx: PlanContext; plan: DayPlan; prog: Progress;
  items: Array<{ id: string; drill: DayPlan["blocks"][number]["items"][number]["drill"]; minutes: number }>; onDone: (xp: number) => void;
}) {
  const doneItems = items.filter((i) => prog.done.includes(i.id));
  const planned = doneItems.length ? doneItems.reduce((a, i) => a + i.minutes, 0) : plan.minutes;
  const [minutes, setMinutes] = useState(String(planned));
  const [effort, setEffort] = useState<number | undefined>();
  const [feel, setFeel] = useState<ProgramLog["feel"]>();
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  async function submit() {
    const m = Number(minutes);
    if (!Number.isFinite(m) || m < 1 || m > 600) return setError("Enter the minutes you trained (1–600).");
    const round = roundForWeek(plan.week);
    for (const t of plan.tests) {
      const v = prog.tests[t.id];
      if (v !== undefined && v.trim() !== "" && Number.isFinite(Number(v))) await saveBenchmark(ctx.program.id, t.id, round, Math.min(t.max * 10, Math.max(0, Number(v))), plan.date);
    }
    const shots = items.filter((i) => i.drill.track && prog.shots[i.id]).map((i) => {
      const s = prog.shots[i.id], made = Math.max(0, Math.round(Number(s.made) || 0)), att = Math.max(made, Math.round(Number(s.att) || i.drill.track!.attempts));
      return { label: i.drill.name.slice(0, 40), made, attempted: att };
    }).filter((s) => s.made > 0);
    const status = items.length && doneItems.length / items.length < 0.6 ? "partial" : "done";
    const { xp } = await logProgramSession(ctx.program, {
      date: plan.date, day: plan.day ?? 1, kind: plan.kind === "rest" ? "train" : plan.kind, title: plan.title, skills: plan.skills,
      status, minutes: Math.round(m), effort, feel, note: note.trim(), shots,
      drills: items.map((i) => ({ name: i.drill.name, minutes: i.minutes, done: prog.done.includes(i.id) })),
    });
    onOpenChange(false);
    onDone(xp);
  }
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title="Finish session" description="How it felt decides how next week adapts." footer={<Button variant="primary" block onClick={submit}>Save session</Button>}>
      <form className="flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); submit(); }}>
        <Field label="Minutes trained" htmlFor="pf-min" error={error}><Input id="pf-min" inputMode="numeric" value={minutes} onChange={(e) => setMinutes(e.target.value)} invalid={!!error} /></Field>
        <fieldset><legend className="mb-1.5 text-sm font-medium text-muted">How did it feel?</legend>
          <div className="flex flex-wrap gap-1.5">{([["easy", "Too easy"], ["right", "About right"], ["hard", "Too hard"]] as const).map(([v, l]) => <Chip key={v} selected={feel === v} onClick={() => setFeel(feel === v ? undefined : v)}>{l}</Chip>)}</div></fieldset>
        <ScaleChips label="Effort" max={10} value={effort} onChange={setEffort} lowLabel="Easy" highLabel="All out" />
        <Field label="Note" htmlFor="pf-note" hint="What worked? What didn't?"><TextArea id="pf-note" value={note} maxLength={1000} onChange={(e) => setNote(e.target.value)} /></Field>
        {items.length > 0 && doneItems.length / items.length < 0.6 && <p className="text-sm text-muted">You checked off {doneItems.length} of {items.length} drills, so this counts as a partial session. Partial still counts for your streak.</p>}
        <button type="submit" hidden />
      </form>
    </Sheet>
  );
}

const SKIPS = [["busy", "No time"], ["sore", "Sore or hurt"], ["sick", "Sick"], ["no_access", "No gym or hoop"], ["other", "Other"]] as const;
function SkipSheet({ open, onOpenChange, ctx, plan, onDone }: { open: boolean; onOpenChange: (o: boolean) => void; ctx: PlanContext; plan: DayPlan; onDone: (msg: string) => void }) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title="Skip today" description="Missed sessions don't pile up. Tomorrow's plan stays the same size.">
      <div className="flex flex-col gap-2">
        {SKIPS.map(([v, l]) => (
          <Button key={v} block onClick={async () => {
            await skipProgramDay(ctx.program, plan.date, plan.day ?? 1, plan.kind === "rest" ? "train" : plan.kind, v);
            onOpenChange(false);
            onDone(v === "sore" || v === "sick" ? "Rest up. Being sore or sick won't break your streak. If pain lasts, talk to a trusted adult or a professional." : "Skipped. Pick it back up next session.");
          }}>{l}</Button>
        ))}
      </div>
    </Sheet>
  );
}

function LoggedCard({ ctx, plan, log }: { ctx: PlanContext; plan: DayPlan; log: ProgramLog }) {
  const toast = useToast();
  return (
    <Card className="flex flex-col gap-2">
      <p className="text-xs font-semibold uppercase tracking-widest text-flash">Day {log.day} · {log.status === "skipped" ? "Skipped" : log.status === "partial" ? "Partial" : "Done"}</p>
      <h2 className="text-xl font-bold">{log.status === "skipped" ? "Skipped today" : plan.title || "Session logged"}</h2>
      {log.status !== "skipped" && <p className="text-sm text-muted">{[`${log.minutes} min`, log.effort && `effort ${log.effort}/10`, log.feel && { easy: "felt too easy", right: "felt about right", hard: "felt too hard" }[log.feel], `${log.drillsDone}/${log.drillsTotal} drills`].filter(Boolean).join(" · ")}</p>}
      <div><Button size="sm" variant="ghost" onClick={async () => { await undoProgramLog(ctx.program.id, log.date); play("undo"); toast("Session log removed"); }}>Undo</Button></div>
    </Card>
  );
}
