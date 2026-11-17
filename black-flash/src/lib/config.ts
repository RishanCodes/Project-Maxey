/**
 * Progression defaults. Edit these values to change how XP works; the Growth screen explains them.
 * XP measures logged follow-through in this app. It is not a rating of ability.
 */
export const XP = {
  task: 10, // completed task occurrence
  habit: 10, // completed habit on a scheduled day
  training: 15, // logged (completed) training session
  checkin: 10, // daily check-in or planned rest day
  milestone: 30, // completed goal milestone
  focus: 10, // completed focus session
  dailyCap: 120, // anti-farming: total XP earnable per calendar day
} as const;

/** Cumulative XP needed to reach a level: 0, 100, 300, 600, 1000, ... */
export function xpForLevel(level: number): number {
  return 50 * level * (level - 1);
}

export function levelInfo(total: number) {
  let level = 1;
  while (xpForLevel(level + 1) <= total) level++;
  const base = xpForLevel(level);
  const next = xpForLevel(level + 1);
  return { level, base, next, into: total - base, need: next - base };
}

export const DEFAULT_APP_NAME = "BLACK FLASH";
export const MAX_TODAY_PRIORITIES = 3;
