"use client";
import { useLiveQuery } from "dexie-react-hooks";
import { getDb } from "@/lib/db";
import type { PlanContext } from "@/lib/program/engine";

/** The current program (active, paused, or the most recent) with its logs, tests and check-ins. null = none yet. */
export function useProgram(today: string | undefined): PlanContext | null | undefined {
  return useLiveQuery(async () => {
    if (!today) return undefined;
    const d = getDb();
    const all = (await d.programs.toArray()).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const program = all.find((p) => p.status === "active" || p.status === "paused") ?? all[0];
    if (!program) return null;
    const [logs, benchmarks, checkins] = await Promise.all([
      d.programLogs.where("programId").equals(program.id).toArray(),
      d.benchmarks.where("programId").equals(program.id).toArray(),
      d.checkins.toArray(),
    ]);
    return { program, logs, benchmarks, checkins, today };
  }, [today]);
}
