import { getDb, ALL_TABLES } from "./db";
import { BackupFile, SCHEMA_VERSION, type BackupData } from "./schema";

export async function exportBackup(): Promise<BackupFile> {
  const db = getDb();
  const data = {} as Record<string, unknown[]>;
  for (const t of ALL_TABLES) data[t] = await db.table(t).toArray();
  return { app: "black-flash", schemaVersion: SCHEMA_VERSION, exportedAt: new Date().toISOString(), data: data as BackupData };
}

export type ParseResult = { ok: true; file: BackupFile; counts: Record<string, number> } | { ok: false; error: string };

/** Validates a backup against the current schema. Older schema versions would be migrated here. */
export function parseBackup(text: string): ParseResult {
  let raw: unknown;
  try { raw = JSON.parse(text); } catch { return { ok: false, error: "This file is not valid JSON." }; }
  if (!raw || typeof raw !== "object" || (raw as { app?: unknown }).app !== "black-flash") return { ok: false, error: "This is not a BLACK FLASH backup file." };
  const version = (raw as { schemaVersion?: unknown }).schemaVersion;
  if (typeof version === "number" && version > SCHEMA_VERSION) return { ok: false, error: `This backup was made by a newer version (schema ${version}). Update the app first.` };
  const parsed = BackupFile.safeParse(raw);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { ok: false, error: `The backup failed validation at ${issue.path.join(".") || "root"}: ${issue.message}` };
  }
  const counts = Object.fromEntries(ALL_TABLES.map((t) => [t, parsed.data.data[t].length]));
  return { ok: true, file: parsed.data, counts };
}

/**
 * replace: clears every table, then writes the backup (ids preserved).
 * merge: adds records whose ids are new and keeps existing ones untouched. Unique completion
 * constraints are respected, so merging the same backup twice never duplicates completions.
 */
export async function importBackup(file: BackupFile, mode: "replace" | "merge"): Promise<{ added: number; skipped: number }> {
  const db = getDb();
  let added = 0, skipped = 0;
  await db.transaction("rw", db.tables, async () => {
    if (mode === "replace") for (const t of db.tables) await t.clear();
    for (const t of ALL_TABLES) {
      const rows = file.data[t] as Array<Record<string, unknown>>;
      const table = db.table(t);
      for (const row of rows) {
        const key = row.id as string;
        if (mode === "merge" && (await table.get(key))) { skipped++; continue; }
        if (mode === "merge" && t === "taskCompletions" && (await db.taskCompletions.where("[taskId+date]").equals([row.taskId as string, row.date as string]).first())) { skipped++; continue; }
        if (mode === "merge" && t === "habitCompletions" && (await db.habitCompletions.where("[habitId+date]").equals([row.habitId as string, row.date as string]).first())) { skipped++; continue; }
        if (mode === "merge" && t === "routineCompletions" && (await db.routineCompletions.where("[routineId+stepId+date]").equals([row.routineId as string, row.stepId as string, row.date as string]).first())) { skipped++; continue; }
        await table.put(row);
        added++;
      }
    }
  });
  return { added, skipped };
}
