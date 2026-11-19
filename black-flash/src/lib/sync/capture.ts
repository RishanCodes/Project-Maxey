/**
 * Change capture for cloud sync. Every write to a synced table records "this record changed at T"
 * in the outbox, in the same IndexedDB transaction when possible, so a change can't be lost if
 * the app closes. Writes applied FROM the cloud are marked and not re-recorded.
 */
import Dexie, { type Transaction } from "dexie";

export const SYNC_TABLES = [
  "prefs", "answers", "tasks", "taskCompletions", "habits", "habitCompletions", "routines", "routineCompletions",
  "goals", "milestones", "training", "checkins", "meals", "focus", "journal", "xp", "achievements", "coach",
  "programs", "programLogs", "benchmarks",
] as const;
export type SyncTable = (typeof SYNC_TABLES)[number];

export interface OutboxEntry { key: string; tbl: SyncTable; id: string; changedAt: number }
export interface SyncMetaEntry { key: string; value: unknown }

export const outboxKey = (tbl: string, id: string) => `${tbl}\u0001${id}`;

const REMOTE = "__bfRemote";
/** Marks a transaction as applying cloud changes, so capture ignores its writes. */
export function markRemote(tx: Transaction) { (tx as unknown as Record<string, boolean>)[REMOTE] = true; }
function isRemote(tx: Transaction | undefined | null): boolean {
  let t: Transaction | undefined | null = tx;
  for (let i = 0; t && i < 5; i++) { if ((t as unknown as Record<string, boolean>)[REMOTE]) return true; t = (t as unknown as { parent?: Transaction }).parent; }
  return false;
}

// Monotonic clock so two changes in the same millisecond still order correctly.
let last = 0;
export function changeClock(): number { const n = Math.max(Date.now(), last + 1); last = n; return n; }

// Changes captured outside a multi-table transaction, per database instance.
const deferred = new Map<Dexie, OutboxEntry[]>();
let flushTimer: ReturnType<typeof setTimeout> | null = null;

/** Writes changes captured outside a multi-table transaction. Sync calls this first so it never misses an edit. */
export async function flushDeferredCapture(): Promise<void> {
  if (flushTimer) { clearTimeout(flushTimer); flushTimer = null; }
  for (const [db, list] of deferred) {
    if (!list.length) continue;
    const batch = list.splice(0);
    const latest = new Map<string, OutboxEntry>(); // keep the newest change per key
    for (const e of batch) { const cur = latest.get(e.key); if (!cur || e.changedAt > cur.changedAt) latest.set(e.key, e); }
    try { await db.table("outbox").bulkPut([...latest.values()]); } catch (err) { list.push(...batch); throw err; }
  }
}

export function installChangeCapture(db: Dexie) {
  const record = (tbl: SyncTable, id: unknown, tx: Transaction) => {
    if (id === undefined || id === null || isRemote(tx)) return;
    const entry: OutboxEntry = { key: outboxKey(tbl, String(id)), tbl, id: String(id), changedAt: changeClock() };
    const scope = (tx as unknown as { storeNames?: string[] }).storeNames ?? [];
    if (scope.includes("outbox")) {
      tx.table("outbox").put(entry); // same transaction: atomic with the change
      return;
    }
    // The write's transaction doesn't include the outbox (implicit single-table write): record right after it.
    const list = deferred.get(db) ?? []; list.push(entry); deferred.set(db, list);
    if (!flushTimer) flushTimer = setTimeout(() => { flushTimer = null; flushDeferredCapture().catch(() => {}); }, 0);
  };
  for (const tbl of SYNC_TABLES) {
    const t = db.table(tbl);
    t.hook("creating", function (primKey, obj, tx) { record(tbl, primKey ?? (obj as { id?: unknown }).id, tx); });
    t.hook("updating", function (_mods, primKey, _obj, tx) { record(tbl, primKey, tx); });
    t.hook("deleting", function (primKey, _obj, tx) { record(tbl, primKey, tx); });
  }
}
