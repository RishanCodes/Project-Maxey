"use client";
import { useLiveQuery } from "dexie-react-hooks";
import { useState } from "react";
import { Button, Chip, ConfirmSheet, Field, Input, Select, Sheet, TextArea } from "../ui";
import { DayPicker, numOrUndef } from "./common";
import { useToast } from "../toast";
import { getDb } from "@/lib/db";
import { createTask, deleteTask, updateTask } from "@/lib/repo";
import type { Repeat, Task } from "@/lib/schema";

type Props = { open: boolean; onOpenChange: (o: boolean) => void; task?: Task; defaultDate?: string };
/** Mounted only while open and keyed by the task, so fields initialise from props without effects. */
export function TaskForm(props: Props) {
  if (!props.open) return null;
  return <TaskFormBody key={props.task?.id ?? "new"} {...props} />;
}

function TaskFormBody({ open, onOpenChange, task, defaultDate }: Props) {
  const toast = useToast();
  const goals = useLiveQuery(() => getDb().goals.where("status").equals("active").toArray(), []) ?? [];
  const [title, setTitle] = useState(task?.title ?? ""); const [description, setDescription] = useState(task?.description ?? "");
  const [priority, setPriority] = useState<Task["priority"]>(task?.priority ?? "medium");
  const [dueDate, setDueDate] = useState(task?.dueDate ?? defaultDate ?? ""); const [dueTime, setDueTime] = useState(task?.dueTime ?? ""); const [duration, setDuration] = useState(task?.durationMin ? String(task.durationMin) : "");
  const [repeat, setRepeat] = useState<Repeat["type"]>(task?.repeat.type ?? "none"); const [days, setDays] = useState<number[]>(task?.repeat.type === "weekly" ? task.repeat.days : []);
  const [tags, setTags] = useState(task?.tags.join(", ") ?? ""); const [goalId, setGoalId] = useState(task?.goalId ?? "");
  const [error, setError] = useState<Record<string, string>>({}); const [confirm, setConfirm] = useState(false);

  async function save() {
    const e: Record<string, string> = {};
    if (!title.trim()) e.title = "Give the task a title.";
    if (repeat === "weekly" && !days.length) e.days = "Pick at least one day.";
    const dur = numOrUndef(duration);
    if (duration && (!dur || dur < 1 || dur > 1440)) e.duration = "Use a number of minutes between 1 and 1440.";
    setError(e);
    if (Object.keys(e).length) return;
    const body = {
      title: title.trim(), description: description.trim(), priority, dueDate: dueDate || undefined, dueTime: dueTime || undefined, durationMin: dur,
      repeat: (repeat === "weekly" ? { type: "weekly", days } : { type: repeat }) as Repeat,
      tags: tags.split(",").map((t) => t.trim()).filter(Boolean).slice(0, 12), goalId: goalId || undefined,
    };
    if (task) { await updateTask(task.id, body); toast("Task updated"); }
    else { await createTask(body); toast("Task added"); }
    onOpenChange(false);
  }

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange} title={task ? "Edit task" : "New task"} footer={<>
        {task && <Button variant="danger" onClick={() => setConfirm(true)}>Delete</Button>}
        <Button variant="primary" className="flex-1" onClick={save}>{task ? "Save" : "Add task"}</Button>
      </>}>
        <form className="flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); save(); }}>
          <Field label="Title" htmlFor="task-title" error={error.title}><Input id="task-title" value={title} onChange={(e) => setTitle(e.target.value)} invalid={!!error.title} autoFocus placeholder="What needs doing?" maxLength={140} /></Field>
          <fieldset><legend className="mb-1.5 text-sm font-medium text-muted">Priority</legend><div className="flex gap-1.5">
            {(["high", "medium", "low"] as const).map((p) => <Chip key={p} selected={priority === p} onClick={() => setPriority(p)} className="capitalize">{p}</Chip>)}
          </div></fieldset>
          <div className="grid grid-cols-2 gap-3">
            <Field label={repeat === "none" ? "Due date" : "Starts"} htmlFor="task-date"><Input id="task-date" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} /></Field>
            <Field label="Time" htmlFor="task-time"><Input id="task-time" type="time" value={dueTime} onChange={(e) => setDueTime(e.target.value)} /></Field>
          </div>
          <fieldset><legend className="mb-1.5 text-sm font-medium text-muted">Repeat</legend><div className="flex gap-1.5">
            {([["none", "Once"], ["daily", "Daily"], ["weekly", "Weekly"]] as const).map(([v, l]) => <Chip key={v} selected={repeat === v} onClick={() => setRepeat(v)}>{l}</Chip>)}
          </div></fieldset>
          {repeat === "weekly" && <><DayPicker label="On" value={days} onChange={setDays} />{error.days && <p role="alert" className="text-xs text-red">{error.days}</p>}</>}
          <Field label="Duration in minutes (optional)" htmlFor="task-dur" error={error.duration}><Input id="task-dur" inputMode="numeric" value={duration} onChange={(e) => setDuration(e.target.value)} invalid={!!error.duration} /></Field>
          {goals.length > 0 && <Field label="Linked goal (optional)" htmlFor="task-goal"><Select id="task-goal" value={goalId} onChange={(e) => setGoalId(e.target.value)}><option value="">None</option>{goals.map((g) => <option key={g.id} value={g.id}>{g.title}</option>)}</Select></Field>}
          <Field label="Tags (comma separated)" htmlFor="task-tags"><Input id="task-tags" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="school, training" /></Field>
          <Field label="Notes" htmlFor="task-desc"><TextArea id="task-desc" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={2000} /></Field>
          <button type="submit" hidden />
        </form>
      </Sheet>
      {task && <ConfirmSheet open={confirm} onOpenChange={setConfirm} danger title="Delete this task?" body="Its completion history and the XP it earned are removed too." confirmLabel="Delete task"
        onConfirm={async () => { await deleteTask(task.id); onOpenChange(false); toast("Task deleted"); }} />}
    </>
  );
}
