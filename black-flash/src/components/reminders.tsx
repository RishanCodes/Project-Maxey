"use client";
import { useEffect } from "react";
import { getDb } from "@/lib/db";
import { getPrefs } from "@/lib/repo";
import { fromMinutes, minutesInTz, todayKey } from "@/lib/dates";
import { isDueToday } from "@/lib/recurrence";

/**
 * Best-effort habit reminders. Browsers only allow this while the app is open (no push server),
 * so reminders can be missed; the setting says so.
 */
export function HabitReminders() {
  useEffect(() => {
    const check = async () => {
      if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
      const prefs = await getPrefs();
      if (!prefs.notifications) return;
      const now = new Date(), today = todayKey(prefs.timezone, now), hhmm = fromMinutes(minutesInTz(now, prefs.timezone));
      const [habits, comps] = await Promise.all([getDb().habits.toArray(), getDb().habitCompletions.where("date").equals(today).toArray()]);
      for (const h of habits) {
        if (!h.reminderTime || h.reminderTime > hhmm || !isDueToday(h, today, comps, prefs.weekStart) || comps.some((c) => c.habitId === h.id)) continue;
        const key = `bf-rem:${h.id}:${today}`;
        try { if (sessionStorage.getItem(key)) continue; sessionStorage.setItem(key, "1"); } catch { /* storage blocked */ }
        new Notification(prefs.appName, { body: `Reminder: ${h.label}`, icon: "/icons/icon-192.png", tag: key });
      }
    };
    check();
    const id = setInterval(check, 60_000);
    return () => clearInterval(id);
  }, []);
  return null;
}
