/**
 * Cloud sync engine (storage-agnostic). The cloud is a mirror of records keyed by (table, id):
 *   push  - send outbox entries (current record, or a tombstone if deleted) with their change time
 *   pull  - fetch rows changed on the server since the cursor (with a small overlap; applying is idempotent)
 *   apply - last write wins per record: a pending local change newer than the remote one is kept
 * The database enforces the same rule, so the order of devices syncing doesn't matter.
 */
import type { z } from "zod";
import { getDb } from "../db";
import {
  AchievementUnlock, CoachMessage, DailyCheckin, FocusSession, Goal, Habit, HabitCompletion, JournalEntry, MealEntry, Milestone,
  OnboardingAnswer, Preferences, Program, ProgramLog, Benchmark, Routine, RoutineStepCompletion, Task, TaskCompletion, TrainingSession, XpEvent,
} from "../schema";
import { SYNC_TABLES, flushDeferredCapture, markRemote, outboxKey, type OutboxEntry, type SyncTable } from "./capture";
import { awardXp, reverseXp, evaluateAchievements } from "../repo";

export interface RemoteRow { tbl: string; id: string; data: unknown; deleted: boolean; changed_at: string; server_updated_at: string }
export type PushRow = Omit<RemoteRow, "server_updated_at">;
export interface Remote {
  push(rows: PushRow[]): Promise<void>;
  /** Rows with server_updated_at >= since (or all when null), ascending, at most `limit`. */
  pull(since: string | null, limit: number): Promise<RemoteRow[]>;
}

const SCHEMAS: Record<SyncTable, z.ZodTypeAny> = {
  prefs: Preferences, answers: OnboardingAnswer, tasks: Task, taskCompletions: TaskCompletion, habits: Habit, habitCompletions: HabitCompletion,
  routines: Routine, routineCompletions: RoutineStepCompletion, goals: Goal, milestones: Milestone, training: TrainingSession, checkins: DailyCheckin,
  meals: MealEntry, focus: FocusSession, journal: JournalEntry, xp: XpEvent, achievements: AchievementUnlock, coach: CoachMessage,
  programs: Program, programLogs: ProgramLog, benchmarks: Benchmark,
};
const isSyncTable = (t: string): t is SyncTable => (SYNC_TABLES as readonly string[]).includes(t);

const PUSH_BATCH = 200, PULL_PAGE = 500, OVERLAP_MS = 2 * 60_000;

async function meta<T>(key: string): Promise<T | undefined> { return (await getDb().syncMeta.get(key))?.value as T | undefined; }
async function setMeta(key: string, value: unknown) { await getDb().syncMeta.put({ key, value }); }

export interface SyncResult { pushed: number; pulled: number; applied: number; skippedLocalNewer: number; invalid: number }

/** Records written before sync existed have no outbox entries: enqueue them once with their own timestamps. */
export async function bootstrapOutbox(): Promise<number> {
  const db = getDb();
  let n = 0;
  await db.transaction("rw", db.tables, async () => {
    for (const tbl of SYNC_TABLES) {
      const rows = (await db.table(tbl).toArray()) as Array<Record<string, unknown>>;
      for (const r of rows) {
        const id = String(r.id);
        const key = outboxKey(tbl, id);
        if (await db.outbox.get(key)) continue;
        const ts = [r.updatedAt, r.at, r.completedAt, r.unlockedAt, r.createdAt].map((x) => (typeof x === "string" ? Date.parse(x) : NaN)).find((x) => !Number.isNaN(x));
        await db.outbox.put({ key, tbl, id, changedAt: ts ?? 1 });
        n++;
      }
    }
  });
  return n;
}

export async function pendingCount(): Promise<number> { return getDb().outbox.count(); }

async function push(remote: Remote): Promise<number> {
  const db = getDb();
  let total = 0;
  for (let guard = 0; guard < 1000; guard++) {
    await flushDeferredCapture();
    const batch: OutboxEntry[] = await db.outbox.orderBy("changedAt").limit(PUSH_BATCH).toArray();
    if (!batch.length) break;
    const rows: PushRow[] = [];
    for (const e of batch) {
      const rec = await db.table(e.tbl).get(e.id);
      rows.push({ tbl: e.tbl, id: e.id, data: rec ?? null, deleted: !rec, changed_at: new Date(e.changedAt).toISOString() });
    }
    await remote.push(rows);
    // Remove only entries that didn't change again while we were pushing.
    await db.transaction("rw", db.outbox, async () => {
      for (const e of batch) { const cur = await db.outbox.get(e.key); if (cur && cur.changedAt === e.changedAt) await db.outbox.delete(e.key); }
    });
    total += batch.length;
    if (batch.length < PUSH_BATCH) break;
  }
  return total;
}

/** Applies remote rows. Exported for tests. */
export async function applyRemote(rows: RemoteRow[]): Promise<Omit<SyncResult, "pushed" | "pulled">> {
  await flushDeferredCapture(); // a local edit made a moment ago must count as pending
  const db = getDb();
  let applied = 0, skippedLocalNewer = 0, invalid = 0;
  await db.transaction("rw", db.tables, async (tx) => {
    markRemote(tx);
    for (const row of rows) {
      if (!isSyncTable(row.tbl)) { invalid++; continue; }
      const table = db.table(row.tbl);
      const remoteTs = Date.parse(row.changed_at);
      const key = outboxKey(row.tbl, row.id);
      const pending = await db.outbox.get(key);
      if (pending && pending.changedAt > remoteTs) { skippedLocalNewer++; continue; }
      if (row.deleted) {
        await table.delete(row.id);
      } else {
        const parsed = SCHEMAS[row.tbl].safeParse(row.data);
        if (!parsed.success || (parsed.data as { id?: unknown }).id !== row.id) { invalid++; continue; }
        const rec = parsed.data as Record<string, string>;
        // Unique per-day completions: the same completion made on another device may carry a different id.
        if (row.tbl === "taskCompletions") await db.taskCompletions.where("[taskId+date]").equals([rec.taskId, rec.date]).filter((x) => x.id !== row.id).delete();
        if (row.tbl === "habitCompletions") await db.habitCompletions.where("[habitId+date]").equals([rec.habitId, rec.date]).filter((x) => x.id !== row.id).delete();
        if (row.tbl === "routineCompletions") await db.routineCompletions.where("[routineId+stepId+date]").equals([rec.routineId, rec.stepId, rec.date]).filter((x) => x.id !== row.id).delete();
        await table.put(rec);
      }
      if (pending && pending.changedAt <= remoteTs) await db.outbox.delete(key);
      applied++;
    }
  });
  return { applied, skippedLocalNewer, invalid };
}

async function pull(remote: Remote): Promise<{ pulled: number; applied: number; skippedLocalNewer: number; invalid: number }> {
  let cursor = await meta<string>("cursor");
  let since = cursor ? new Date(Date.parse(cursor) - OVERLAP_MS).toISOString() : null;
  let pulled = 0, applied = 0, skippedLocalNewer = 0, invalid = 0;
  for (let guard = 0; guard < 1000; guard++) {
    const rows = await remote.pull(since, PULL_PAGE);
    if (!rows.length) break;
    const r = await applyRemote(rows);
    pulled += rows.length; applied += r.applied; skippedLocalNewer += r.skippedLocalNewer; invalid += r.invalid;
    const last = rows[rows.length - 1].server_updated_at;
    if (!cursor || last > cursor) cursor = last;
    if (rows.length < PULL_PAGE || last === since) break;
    since = last;
  }
  if (cursor) await setMeta("cursor", cursor);
  return { pulled, applied, skippedLocalNewer, invalid };
}

/**
 * After merging two devices, make XP agree with the records that exist: reverse awards whose
 * source is gone, and award completions that have none. Keeps "XP comes only from real records".
 */
export async function reconcileXp(): Promise<{ reversed: number; awarded: number }> {
  const db = getDb();
  const [xp, tc, hc, training, checkins, milestones, focus] = await Promise.all([
    db.xp.toArray(), db.taskCompletions.toArray(), db.habitCompletions.toArray(), db.training.toArray(), db.checkins.toArray(), db.milestones.toArray(), db.focus.toArray(),
  ]);
  const expected = new Map<string, { type: XpEvent["sourceType"]; id: string; label: string; date?: string }>();
  for (const c of tc) expected.set(`task:${c.taskId}:${c.date}`, { type: "task", id: `${c.taskId}:${c.date}`, label: "Task" });
  for (const c of hc) if (c.state === "done") expected.set(`habit:${c.habitId}:${c.date}`, { type: "habit", id: `${c.habitId}:${c.date}`, label: "Habit", date: c.date });
  for (const s of training) if (s.status === "completed") expected.set(`training:${s.id}`, { type: "training", id: s.id, label: "Training" });
  for (const c of checkins) {
    const meaningful = c.restDay || c.sleepHours !== undefined || c.sleepQuality !== undefined || c.energy !== undefined || c.mood !== undefined || c.soreness !== undefined || c.note.trim() !== "";
    if (meaningful) expected.set(`checkin:${c.date}`, { type: "checkin", id: c.date, label: "Check-in", date: c.date });
  }
  for (const m of milestones) if (m.doneAt) expected.set(`milestone:${m.id}`, { type: "milestone", id: m.id, label: "Milestone" });
  for (const f of focus) expected.set(`focus:${f.id}`, { type: "focus", id: f.id, label: "Focus", date: f.date });
  const active = new Map<string, number>();
  for (const e of xp) active.set(e.key, (active.get(e.key) ?? 0) + (e.kind === "award" ? 1 : -1));
  let reversed = 0, awarded = 0;
  for (const [key, n] of active) {
    if (n > 0 && !expected.has(key)) {
      const [type, ...rest] = key.split(":");
      await reverseXp(type as XpEvent["sourceType"], rest.join(":")); reversed++;
    }
  }
  for (const [key, src] of expected) {
    if ((active.get(key) ?? 0) <= 0) { await awardXp(src.type, src.id, `${src.label} (synced)`, src.date); awarded++; }
  }
  return { reversed, awarded };
}

/** One full sync pass for the signed-in user. */
export async function syncOnce(remote: Remote, userId: string): Promise<SyncResult> {
  await flushDeferredCapture();
  if ((await meta<string>("userId")) !== userId) {
    await getDb().syncMeta.clear();
    await setMeta("userId", userId);
  }
  if (!(await meta<boolean>("bootstrapped"))) { await bootstrapOutbox(); await setMeta("bootstrapped", true); }
  const pushed = await push(remote);
  const p = await pull(remote);
  if (p.applied) {
    const r = await reconcileXp();
    if (r.reversed || r.awarded) await push(remote); // send the XP fix-ups too
    await evaluateAchievements();
  }
  await setMeta("lastSyncAt", new Date().toISOString());
  await setMeta("lastError", null);
  return { pushed, ...p };
}

export async function syncStatusMeta() {
  return { lastSyncAt: await meta<string>("lastSyncAt"), lastError: await meta<string | null>("lastError"), userId: await meta<string>("userId") };
}
export async function recordSyncError(message: string) { await setMeta("lastError", message); }
