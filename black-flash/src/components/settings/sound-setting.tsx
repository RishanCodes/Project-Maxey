"use client";
import { useState } from "react";
import { Button, Switch } from "@/components/ui";
import { play, setSoundEnabled, soundEnabled, type SoundName } from "@/lib/sound";

const PREVIEW: Array<[SoundName, string]> = [["complete", "Task"], ["habit", "Habit"], ["training", "Training"], ["milestone", "Milestone"], ["focus", "Focus"], ["unlock", "Achievement"], ["levelUp", "Level up"]];

/** Per-device sound toggle (stored on this device only), with previews. */
export function SoundSetting() {
  const [on, setOn] = useState(() => typeof window === "undefined" || soundEnabled());
  return (
    <div>
      <Switch checked={on} onChange={(v) => { setSoundEnabled(v); setOn(v); if (v) play("complete"); }} label="Sound effects"
        description="On this device only. On iPhone, the silent switch mutes them, and they won't pause your music." />
      {on && (
        <div className="flex flex-wrap gap-1.5 pt-1" aria-label="Preview sounds">
          {PREVIEW.map(([name, label]) => <Button key={name} size="sm" variant="ghost" onClick={() => play(name)}>{label}</Button>)}
        </div>
      )}
    </div>
  );
}
