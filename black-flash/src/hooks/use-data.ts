"use client";
import { useLiveQuery } from "dexie-react-hooks";
import { useEffect, useMemo, useState } from "react";
import { getDb } from "@/lib/db";
import { dateInTz, minutesInTz, todayKey } from "@/lib/dates";
import type { Preferences, Task } from "@/lib/schema";
import type { Snapshot } from "@/lib/stats";

export function usePrefs(): Preferences | undefined {
  return useLiveQuery(() => getDb().prefs.get("prefs"), []);
}

/** All records the derived views need. Personal-scale data, so one live query is simplest. */
export function useSnapshot(): Snapshot | undefined {
  return useLiveQuery(async () => {
    const d = getDb();
    const [tasks, taskCompletions, habits, habitCompletions, goals, milestones, training, checkins, focus, xp] = await Promise.all([
      d.tasks.toArray(), d.taskCompletions.toArray(), d.habits.toArray(), d.habitCompletions.toArray(), d.goals.toArray(),
      d.milestones.toArray(), d.training.toArray(), d.checkins.toArray(), d.focus.toArray(), d.xp.toArray(),
    ]);
    return { tasks, taskCompletions, habits, habitCompletions, goals, milestones, training, checkins, focus, xp };
  }, []);
}

/** Today's local date in the user's timezone; updates at midnight and when the app returns to the foreground. */
export function useToday(timezone: string | undefined) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const tick = () => setNow(new Date());
    const id = setInterval(tick, 30_000);
    document.addEventListener("visibilitychange", tick);
    return () => { clearInterval(id); document.removeEventListener("visibilitychange", tick); };
  }, []);
  const tz = timezone || "UTC";
  return { today: todayKey(tz, now), minutes: minutesInTz(now, tz), now };
}

export function useCreatedDate(timezone: string | undefined) {
  return useMemo(() => (t: Task) => dateInTz(new Date(t.createdAt), timezone || "UTC"), [timezone]);
}
