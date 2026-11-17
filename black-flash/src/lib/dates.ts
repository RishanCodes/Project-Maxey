/**
 * Calendar-date helpers. User-facing dates are `YYYY-MM-DD` strings in the user's timezone.
 * Arithmetic is done on UTC-noon Date objects so daylight-saving changes never shift a day.
 */
export type DateKey = string;

export function browserTimezone(): string {
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"; } catch { return "UTC"; }
}

export function isValidTimezone(tz: string): boolean {
  try { new Intl.DateTimeFormat("en-US", { timeZone: tz }); return true; } catch { return false; }
}

/** Local calendar date for an instant in a timezone. */
export function dateInTz(instant: Date, timezone: string): DateKey {
  const tz = isValidTimezone(timezone) ? timezone : "UTC";
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(instant);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

/** Minutes since local midnight for an instant in a timezone. */
export function minutesInTz(instant: Date, timezone: string): number {
  const tz = isValidTimezone(timezone) ? timezone : "UTC";
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: tz, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(instant);
  const h = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
  const m = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
  return h * 60 + m;
}

export function todayKey(timezone: string, now: Date = new Date()): DateKey {
  return dateInTz(now, timezone);
}

function toUtcNoon(key: DateKey): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12));
}
function fromUtc(d: Date): DateKey {
  return d.toISOString().slice(0, 10);
}

export function addDays(key: DateKey, n: number): DateKey {
  const d = toUtcNoon(key);
  d.setUTCDate(d.getUTCDate() + n);
  return fromUtc(d);
}

/** 0 = Sunday … 6 = Saturday */
export function weekday(key: DateKey): number {
  return toUtcNoon(key).getUTCDay();
}

export function daysBetween(a: DateKey, b: DateKey): number {
  return Math.round((toUtcNoon(b).getTime() - toUtcNoon(a).getTime()) / 86_400_000);
}

/** First day of the week containing `key`. weekStart: 0 = Sunday, 1 = Monday. */
export function startOfWeek(key: DateKey, weekStart: 0 | 1): DateKey {
  const offset = (weekday(key) - weekStart + 7) % 7;
  return addDays(key, -offset);
}

export function rangeDays(from: DateKey, to: DateKey): DateKey[] {
  const out: DateKey[] = [];
  for (let k = from; k <= to; k = addDays(k, 1)) out.push(k);
  return out;
}

export function weekDays(key: DateKey, weekStart: 0 | 1): DateKey[] {
  const s = startOfWeek(key, weekStart);
  return rangeDays(s, addDays(s, 6));
}

export const DAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export const DAY_LONG = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function formatDateKey(key: DateKey, opts: Intl.DateTimeFormatOptions = { weekday: "short", month: "short", day: "numeric" }): string {
  return new Intl.DateTimeFormat("en-US", { ...opts, timeZone: "UTC" }).format(toUtcNoon(key));
}

export function relativeDay(key: DateKey, today: DateKey): string {
  const n = daysBetween(today, key);
  if (n === 0) return "Today";
  if (n === 1) return "Tomorrow";
  if (n === -1) return "Yesterday";
  return formatDateKey(key);
}

export function formatTime(hhmm: string | undefined): string {
  if (!hhmm) return "";
  const [h, m] = hhmm.split(":").map(Number);
  const ap = h >= 12 ? "PM" : "AM";
  const hh = h % 12 || 12;
  return `${hh}:${String(m).padStart(2, "0")} ${ap}`;
}

export function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

export function fromMinutes(min: number): string {
  const m = Math.max(0, Math.min(1439, Math.round(min)));
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}

export function greeting(minutes: number): string {
  if (minutes < 5 * 60) return "Good night";
  if (minutes < 12 * 60) return "Good morning";
  if (minutes < 17 * 60) return "Good afternoon";
  return "Good evening";
}

export const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;
