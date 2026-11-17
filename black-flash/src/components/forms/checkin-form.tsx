"use client";
import { play } from "@/lib/sound";
import { useEffect, useState } from "react";
import { Button, Field, Input, Sheet, Switch, TextArea } from "../ui";
import { ScaleChips, numOrUndef } from "./common";
import { useToast } from "../toast";
import { getDb } from "@/lib/db";
import { saveCheckin } from "@/lib/repo";

export function CheckinForm({ open, onOpenChange, date }: { open: boolean; onOpenChange: (o: boolean) => void; date: string }) {
  const toast = useToast();
  const [sleep, setSleep] = useState(""); const [quality, setQuality] = useState<number>(); const [energy, setEnergy] = useState<number>();
  const [mood, setMood] = useState<number>(); const [soreness, setSoreness] = useState<number>(); const [rest, setRest] = useState(false); const [note, setNote] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    if (!open) return;
    getDb().checkins.get(date).then((c) => {
      setSleep(c?.sleepHours !== undefined ? String(c.sleepHours) : ""); setQuality(c?.sleepQuality); setEnergy(c?.energy); setMood(c?.mood);
      setSoreness(c?.soreness); setRest(c?.restDay ?? false); setNote(c?.note ?? ""); setError("");
    });
  }, [open, date]);
  async function save() {
    const h = numOrUndef(sleep);
    if (sleep && (h === undefined || h < 0 || h > 16)) return setError("Sleep hours should be between 0 and 16.");
    const xp = await saveCheckin({ date, sleepHours: h, sleepQuality: quality, energy, mood, soreness, restDay: rest, note: note.trim() });
    play("save");
    toast(rest ? `Rest day logged${xp ? ` (+${xp} XP)` : ""}. Recovery counts.` : `Check-in saved${xp ? ` (+${xp} XP)` : ""}`);
    onOpenChange(false);
  }
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title="Daily check-in" description="Every field is optional. Skip anything you don't want to track." footer={<Button variant="primary" block onClick={save}>Save check-in</Button>}>
      <form className="flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); save(); }}>
        <Switch checked={rest} onChange={setRest} label="Planned rest day" description="Rest is part of training and is never counted as a miss." />
        <Field label="Hours of sleep" htmlFor="ci-sleep" error={error}><Input id="ci-sleep" inputMode="decimal" value={sleep} onChange={(e) => setSleep(e.target.value)} placeholder="e.g. 8.5" invalid={!!error} /></Field>
        <ScaleChips label="Sleep quality" max={5} value={quality} onChange={setQuality} lowLabel="Poor" highLabel="Great" />
        <ScaleChips label="Energy" max={5} value={energy} onChange={setEnergy} lowLabel="Low" highLabel="High" />
        <ScaleChips label="Mood" max={5} value={mood} onChange={setMood} lowLabel="Low" highLabel="Good" />
        <ScaleChips label="Soreness" max={5} value={soreness} onChange={setSoreness} lowLabel="None" highLabel="A lot" />
        <Field label="Note" htmlFor="ci-note"><TextArea id="ci-note" value={note} onChange={(e) => setNote(e.target.value)} maxLength={1000} /></Field>
        <p className="text-xs text-muted">Not a medical assessment. If something hurts or feels wrong, talk to a trusted adult or a qualified professional.</p>
        <button type="submit" hidden />
      </form>
    </Sheet>
  );
}
