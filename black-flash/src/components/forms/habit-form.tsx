"use client";
import { useState } from "react";
import { Button, Chip, ConfirmSheet, Field, Input } from "../ui";
import { Sheet } from "../ui";
import { DayPicker } from "./common";
import { useToast } from "../toast";
import { createHabit, deleteHabit, setHabitStatus, updateHabit } from "@/lib/repo";
import type { Habit, HabitSchedule } from "@/lib/schema";

const CATEGORIES = ["Training", "Recovery", "Academics", "Focus", "Mindset", "Habits"];

type Props = { open: boolean; onOpenChange: (o: boolean) => void; habit?: Habit };
export function HabitForm(props: Props) {
  if (!props.open) return null;
  return <HabitFormBody key={props.habit?.id ?? "new"} {...props} />;
}

function HabitFormBody({ open, onOpenChange, habit }: Props) {
  const toast = useToast();
  const [label, setLabel] = useState(habit?.label ?? ""); const [purpose, setPurpose] = useState(habit?.purpose ?? ""); const [category, setCategory] = useState(habit?.category ?? "Habits");
  const [type, setType] = useState<HabitSchedule["type"]>(habit?.schedule.type ?? "daily"); const [days, setDays] = useState<number[]>(habit?.schedule.type === "weekdays" ? habit.schedule.days : [1, 3, 5]); const [count, setCount] = useState(habit?.schedule.type === "perWeek" ? habit.schedule.count : 3);
  const [reminder, setReminder] = useState(habit?.reminderTime ?? ""); const [error, setError] = useState(""); const [confirm, setConfirm] = useState(false);
  async function save() {
    if (!label.trim()) return setError("Name the habit.");
    if (type === "weekdays" && !days.length) return setError("Pick at least one day.");
    const schedule: HabitSchedule = type === "daily" ? { type } : type === "weekdays" ? { type, days } : { type, count };
    const body = { label: label.trim(), purpose: purpose.trim(), category, schedule, reminderTime: reminder || undefined };
    if (habit) { await updateHabit(habit.id, body); toast("Habit updated"); } else { await createHabit(body); toast("Habit added"); }
    onOpenChange(false);
  }
  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange} title={habit ? "Edit habit" : "New habit"} footer={<>
        {habit && <Button variant="danger" onClick={() => setConfirm(true)}>Delete</Button>}
        <Button variant="primary" className="flex-1" onClick={save}>{habit ? "Save" : "Add habit"}</Button>
      </>}>
        <form className="flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); save(); }}>
          <Field label="Habit" htmlFor="habit-label" error={error}><Input id="habit-label" value={label} onChange={(e) => setLabel(e.target.value)} invalid={!!error} autoFocus placeholder="Lights out by 10:30" maxLength={80} /></Field>
          <Field label="Why it matters (optional)" htmlFor="habit-purpose"><Input id="habit-purpose" value={purpose} onChange={(e) => setPurpose(e.target.value)} maxLength={300} /></Field>
          <fieldset><legend className="mb-1.5 text-sm font-medium text-muted">Category</legend><div className="flex flex-wrap gap-1.5">{CATEGORIES.map((c) => <Chip key={c} selected={category === c} onClick={() => setCategory(c)}>{c}</Chip>)}</div></fieldset>
          <fieldset><legend className="mb-1.5 text-sm font-medium text-muted">Schedule</legend><div className="flex flex-wrap gap-1.5">
            {([["daily", "Every day"], ["weekdays", "Specific days"], ["perWeek", "Times per week"]] as const).map(([v, l]) => <Chip key={v} selected={type === v} onClick={() => setType(v)}>{l}</Chip>)}
          </div></fieldset>
          {type === "weekdays" && <DayPicker label="Days" value={days} onChange={setDays} />}
          {type === "perWeek" && <fieldset><legend className="mb-1.5 text-sm font-medium text-muted">Times per week (any days)</legend><div className="flex flex-wrap gap-1.5">{[1, 2, 3, 4, 5, 6].map((n) => <Chip key={n} selected={count === n} onClick={() => setCount(n)} className="min-w-11">{n}</Chip>)}</div></fieldset>}
          <Field label="Reminder time (optional)" htmlFor="habit-rem" hint="Best effort: shows a browser notification only while the app is open and notifications are allowed."><Input id="habit-rem" type="time" value={reminder} onChange={(e) => setReminder(e.target.value)} /></Field>
          {habit && (
            <div className="flex gap-2">
              {habit.status === "active" && <Button size="sm" onClick={async () => { await setHabitStatus(habit.id, "paused"); toast("Paused. Paused days never count as missed."); onOpenChange(false); }}>Pause</Button>}
              {habit.status === "paused" && <Button size="sm" onClick={async () => { await setHabitStatus(habit.id, "active"); toast("Resumed"); onOpenChange(false); }}>Resume</Button>}
              {habit.status !== "archived" ? <Button size="sm" variant="ghost" onClick={async () => { await setHabitStatus(habit.id, "archived"); toast("Archived. History is kept."); onOpenChange(false); }}>Archive</Button>
                : <Button size="sm" onClick={async () => { await setHabitStatus(habit.id, "active"); toast("Restored"); onOpenChange(false); }}>Restore</Button>}
            </div>
          )}
          <button type="submit" hidden />
        </form>
      </Sheet>
      {habit && <ConfirmSheet open={confirm} onOpenChange={setConfirm} danger title="Delete this habit?" body="All of its check-ins and the XP they earned are removed. Archive instead to keep the history." confirmLabel="Delete habit"
        onConfirm={async () => { await deleteHabit(habit.id); onOpenChange(false); toast("Habit deleted"); }} />}
    </>
  );
}
