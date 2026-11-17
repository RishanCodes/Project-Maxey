"use client";
import { useLiveQuery } from "dexie-react-hooks";
import { useEffect, useRef } from "react";
import { getDb } from "@/lib/db";
import { levelInfo } from "@/lib/config";
import { ACHIEVEMENTS } from "@/lib/achievements";
import { totalXp } from "@/lib/repo";
import { installSoundUnlock, play } from "@/lib/sound";
import { useToast } from "./toast";

const FRESH_MS = 15_000;
const fresh = (iso: string | undefined) => !!iso && Date.now() - Date.parse(iso) < FRESH_MS;

/**
 * Plays the level-up and achievement sounds and shows a toast. Only reacts to changes that
 * happened just now on this device, not to the initial load or XP pulled in from another device.
 */
export function Celebrations() {
  const toast = useToast();
  const xp = useLiveQuery(() => getDb().xp.toArray(), []);
  const unlocked = useLiveQuery(() => getDb().achievements.toArray(), []);
  const prevLevel = useRef<number | null>(null);
  const prevUnlocked = useRef<Set<string> | null>(null);

  useEffect(() => installSoundUnlock(), []);

  useEffect(() => {
    if (!xp) return;
    const level = levelInfo(totalXp(xp)).level;
    const before = prevLevel.current;
    prevLevel.current = level;
    if (before === null || level <= before) return;
    const latest = xp.filter((e) => e.kind === "award").sort((a, b) => b.at.localeCompare(a.at))[0];
    if (!latest || !fresh(latest.at) || latest.label.endsWith("(synced)")) return;
    // Delayed so the completion sound finishes first. Not cancelled on re-render: it fires once.
    setTimeout(() => { play("levelUp"); toast(`Level ${level} reached`, undefined, { after: true }); }, 450);
  }, [xp, toast]);

  useEffect(() => {
    if (!unlocked) return;
    const ids = new Set(unlocked.map((a) => a.id));
    const before = prevUnlocked.current;
    prevUnlocked.current = ids;
    if (!before) return;
    const added = unlocked.filter((a) => !before.has(a.id) && fresh(a.unlockedAt));
    if (!added.length) return;
    const name = ACHIEVEMENTS.find((a) => a.id === added[0].id)?.name ?? "Achievement";
    setTimeout(() => { play("unlock"); toast(`Achievement unlocked: ${name}${added.length > 1 ? ` (+${added.length - 1} more)` : ""}`, undefined, { after: true }); }, 900);
  }, [unlocked, toast]);

  return null;
}
