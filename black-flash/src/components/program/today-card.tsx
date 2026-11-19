"use client";
import Link from "next/link";
import { ChevronRight, CircleCheck, Flame } from "lucide-react";
import { useProgram } from "@/hooks/use-program";
import { PROGRAM_DAYS, planDay, programSummary } from "@/lib/program/engine";

/** Today's 90-day program session, on the Today screen. Hidden when there's no running program. */
export function ProgramTodayCard({ today }: { today: string }) {
  const ctx = useProgram(today);
  if (!ctx || (ctx.program.status !== "active" && ctx.program.status !== "paused")) return null;
  const s = programSummary(ctx);
  const plan = planDay(ctx, today);
  const log = ctx.logs.find((l) => l.date === today);
  const line = ctx.program.status === "paused" ? "Paused" : s.day === null ? "Starts soon" : s.finished ? "All 90 days done. See your results" : log ? (log.status === "skipped" ? "Skipped today" : "Today's session is done")
    : plan.kind === "rest" ? "Rest day" : `${plan.title} · ${plan.minutes} min`;
  return (
    <Link href="/program" className="flex items-center gap-3 rounded-2xl border border-line/70 bg-graphite/60 px-4 py-3" aria-label={`90-day program: ${line}`}>
      {log && log.status !== "skipped" ? <CircleCheck size={22} className="shrink-0 text-flash" aria-hidden="true" /> : <Flame size={22} className="shrink-0 text-flash" aria-hidden="true" />}
      <span className="min-w-0 flex-1">
        <span className="block text-xs font-semibold uppercase tracking-widest text-muted">90 days{s.day ? ` · Day ${Math.min(s.day, PROGRAM_DAYS)}` : ""}{s.streak ? ` · ${s.streak} streak` : ""}</span>
        <span className="block truncate font-semibold">{line}</span>
      </span>
      <ChevronRight size={18} className="text-muted" aria-hidden="true" />
    </Link>
  );
}
