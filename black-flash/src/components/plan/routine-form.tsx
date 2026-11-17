"use client";
import { useState } from "react";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { Button, ConfirmSheet, Field, IconButton, Input, Sheet } from "../ui";
import { DayPicker } from "../forms/common";
import { useToast } from "../toast";
import { deleteRoutine, newId, saveRoutine } from "@/lib/repo";
import type { Routine } from "@/lib/schema";

type Props = { open: boolean; onOpenChange: (o: boolean) => void; routine?: Routine };
export function RoutineForm(props: Props) {
  if (!props.open) return null;
  return <RoutineFormBody key={props.routine?.id ?? "new"} {...props} />;
}

function RoutineFormBody({ open, onOpenChange, routine }: Props) {
  const toast = useToast();
  const [name, setName] = useState(routine?.name ?? ""); const [days, setDays] = useState<number[]>(routine?.days ?? [1, 2, 3, 4, 5]);
  const [steps, setSteps] = useState<{ id: string; label: string }[]>(() => routine?.steps ?? [{ id: newId(), label: "" }]); const [error, setError] = useState(""); const [confirm, setConfirm] = useState(false);
  const move = (i: number, d: number) => setSteps((s) => { const n = [...s]; const j = i + d; if (j < 0 || j >= n.length) return s; [n[i], n[j]] = [n[j], n[i]]; return n; });
  async function save() {
    const clean = steps.map((s) => ({ ...s, label: s.label.trim() })).filter((s) => s.label);
    if (!name.trim()) return setError("Name the routine.");
    if (!clean.length) return setError("Add at least one step.");
    await saveRoutine({ id: routine?.id, name: name.trim(), days, steps: clean, active: routine?.active ?? true });
    toast(routine ? "Routine saved" : "Routine added"); onOpenChange(false);
  }
  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange} title={routine ? "Edit routine" : "New routine"} footer={<>
        {routine && <Button variant="danger" onClick={() => setConfirm(true)}>Delete</Button>}
        <Button variant="primary" className="flex-1" onClick={save}>Save routine</Button></>}>
        <div className="flex flex-col gap-4">
          <Field label="Name" htmlFor="rt-name" error={error}><Input id="rt-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Morning, pre-game, wind-down" maxLength={60} /></Field>
          <DayPicker label="Days" value={days} onChange={setDays} />
          <div><p className="mb-2 text-sm font-medium text-muted">Steps, in order</p>
            <ol className="flex flex-col gap-2">{steps.map((s, i) => (
              <li key={s.id} className="flex items-center gap-1">
                <span className="tnum w-6 text-center text-sm text-muted">{i + 1}</span>
                <Input aria-label={`Step ${i + 1}`} value={s.label} onChange={(e) => setSteps(steps.map((x) => (x.id === s.id ? { ...x, label: e.target.value } : x)))} maxLength={80} />
                <IconButton label="Move step up" onClick={() => move(i, -1)} disabled={i === 0}><ArrowUp size={16} /></IconButton>
                <IconButton label="Move step down" onClick={() => move(i, 1)} disabled={i === steps.length - 1}><ArrowDown size={16} /></IconButton>
                <IconButton label="Remove step" onClick={() => setSteps(steps.filter((x) => x.id !== s.id))}><Trash2 size={16} /></IconButton>
              </li>))}</ol>
            <Button size="sm" className="mt-2" onClick={() => setSteps([...steps, { id: newId(), label: "" }])}><Plus size={16} />Add step</Button></div>
        </div>
      </Sheet>
      {routine && <ConfirmSheet open={confirm} onOpenChange={setConfirm} danger title="Delete this routine?" body="Its step history is removed." confirmLabel="Delete routine" onConfirm={async () => { await deleteRoutine(routine.id); onOpenChange(false); toast("Routine deleted"); }} />}
    </>
  );
}
