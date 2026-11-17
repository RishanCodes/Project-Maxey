"use client";
import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Check } from "lucide-react";
import { Button, Sheet, cx } from "../ui";
import { useToast } from "../toast";
import { getDb } from "@/lib/db";
import { updateTask } from "@/lib/repo";
import { formatTime, fromMinutes } from "@/lib/dates";
import { suggestTimes } from "@/lib/schedule";
import type { TaskOccurrence } from "@/lib/recurrence";
import type { TrainingSession } from "@/lib/schema";

export function SuggestSheet({ open, onOpenChange, date, today, nowMin, occurrences, training }: { open: boolean; onOpenChange: (o: boolean) => void; date: string; today: string; nowMin: number; occurrences: TaskOccurrence[]; training: TrainingSession[] }) {
  if (!open) return null;
  return <Body {...{ onOpenChange, date, today, nowMin, occurrences, training }} />;
}

function Body({ onOpenChange, date, today, nowMin, occurrences, training }: { onOpenChange: (o: boolean) => void; date: string; today: string; nowMin: number; occurrences: TaskOccurrence[]; training: TrainingSession[] }) {
  const toast = useToast();
  const answerRows = useLiveQuery(() => getDb().answers.toArray(), []);
  const answers = useMemo(() => Object.fromEntries((answerRows ?? []).map((a) => [a.id, a.value])), [answerRows]);
  const result = useMemo(() => suggestTimes({ date, today, nowMin, occurrences, training, answers }), [date, today, nowMin, occurrences, training, answers]);
  const [off, setOff] = useState<string[]>([]);
  const chosen = result.proposals.filter((p) => !off.includes(p.taskId));
  async function apply() {
    const before = await Promise.all(chosen.map((p) => getDb().tasks.get(p.taskId)));
    for (const p of chosen) await updateTask(p.taskId, { dueDate: p.date, dueTime: p.time });
    onOpenChange(false);
    toast(`Scheduled ${chosen.length} task${chosen.length === 1 ? "" : "s"}`, async () => { for (const t of before) if (t) await updateTask(t.id, { dueDate: t.dueDate, dueTime: t.dueTime }); });
  }
  return (
    <Sheet open onOpenChange={onOpenChange} title="Suggested times" description="Proposals only. Nothing changes until you apply them."
      footer={<><Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button><Button variant="primary" className="flex-1" disabled={!chosen.length} onClick={apply}>Apply {chosen.length || ""}</Button></>}>
      <div className="flex flex-col gap-4">
        {result.busy.length > 0 && <div><p className="mb-1 text-sm font-medium text-muted">Fixed on this day</p><ul className="text-sm text-muted">{result.busy.map((b, i) => <li key={i}>{formatTime(fromMinutes(b.start))}–{formatTime(fromMinutes(b.end))} · {b.label}</li>)}</ul></div>}
        {result.proposals.length === 0 ? <p className="text-sm text-muted">{answerRows === undefined ? "Loading…" : "No unscheduled one-off tasks to place, or no free time left in the day."}</p> : (
          <ul className="flex flex-col gap-2">{result.proposals.map((p) => { const on = !off.includes(p.taskId); return (
            <li key={p.taskId}><button aria-pressed={on} onClick={() => setOff(on ? [...off, p.taskId] : off.filter((x) => x !== p.taskId))} className={cx("flex w-full items-start gap-3 rounded-2xl border p-3 text-left", on ? "border-flash/60 bg-flash/5" : "border-line")}>
              <span className={cx("mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md border", on ? "border-flash bg-flash text-obsidian" : "border-line")}>{on && <Check size={14} />}</span>
              <span><b className="block">{formatTime(p.time)} · {p.title}</b><span className="text-xs text-muted">{p.durationMin} min · {p.reason}</span></span></button></li>); })}</ul>
        )}
        {result.unplaced.length > 0 && <p className="text-sm text-muted">No room today for: {result.unplaced.map((t) => t.title).join(", ")}. Try another day.</p>}
        <p className="text-xs text-muted">Uses your onboarding school/work hours and practice times, planned training with a start time, and tasks that already have a time. The end of the day keeps your protected open time free. Repeating tasks aren't moved.</p>
      </div>
    </Sheet>
  );
}
