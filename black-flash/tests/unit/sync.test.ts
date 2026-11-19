import { beforeEach, describe, expect, it } from "vitest";
import { BlackFlashDB, getDb, setDb } from "@/lib/db";
import * as repo from "@/lib/repo";
import { applyRemote, reconcileXp, syncOnce, type PushRow, type Remote, type RemoteRow } from "@/lib/sync/engine";
import { importBackup, exportBackup } from "@/lib/backup";

/** In-memory server with the same last-write-wins rule as the Postgres trigger. */
class FakeCloud implements Remote {
  rows = new Map<string, RemoteRow>();
  private tick = 0;
  private stamp() { this.tick++; return new Date(Date.UTC(2026, 10, 17, 0, 0, 0, 0) + this.tick).toISOString(); }
  async push(rows: PushRow[]) {
    for (const r of rows) {
      const k = `${r.tbl}/${r.id}`, cur = this.rows.get(k);
      if (cur && r.changed_at < cur.changed_at) continue; // stale write ignored
      this.rows.set(k, { ...r, data: r.data === null ? null : JSON.parse(JSON.stringify(r.data)), server_updated_at: this.stamp() });
    }
  }
  async pull(since: string | null, limit: number) {
    return [...this.rows.values()].filter((r) => !since || r.server_updated_at >= since).sort((a, b) => a.server_updated_at.localeCompare(b.server_updated_at)).slice(0, limit);
  }
}

const USER = "11111111-1111-1111-1111-111111111111";
let cloud: FakeCloud;
let A: BlackFlashDB, B: BlackFlashDB;
const on = async (db: BlackFlashDB) => { setDb(db); };
const sync = async (db: BlackFlashDB) => { await on(db); return syncOnce(cloud, USER); };
const xpTotal = async () => repo.totalXp(await getDb().xp.toArray());

beforeEach(async () => {
  cloud = new FakeCloud();
  A = new BlackFlashDB(`A-${Math.random()}`); B = new BlackFlashDB(`B-${Math.random()}`);
  for (const d of [A, B]) { await on(d); await repo.updatePrefs({ timezone: "America/Los_Angeles", weekStart: 1, onboarding: { status: "defaults", index: 0 } }); }
});

describe("cloud sync", () => {
  it("copies records, completions and XP to a second device", async () => {
    await on(A);
    const today = await repo.localToday();
    const t = await repo.createTask({ title: "Film study", description: "", tags: [], priority: "high", repeat: { type: "none" }, dueDate: today });
    await repo.completeTask(t.id, today);
    await sync(A); await sync(B);
    expect((await B.tasks.get(t.id))?.title).toBe("Film study");
    expect(await B.taskCompletions.count()).toBe(1);
    expect(await xpTotal()).toBe(10);
  });

  it("the same completion made offline on both devices merges into one, with XP counted once", async () => {
    await on(A);
    const today = await repo.localToday();
    const h = await repo.createHabit({ label: "Form shots", purpose: "", category: "Training", schedule: { type: "daily" } });
    await sync(A); await sync(B);
    await on(A); await repo.markHabit(h.id, today, "done");
    await on(B); await repo.markHabit(h.id, today, "done");
    await sync(A); await sync(B); await sync(A);
    for (const d of [A, B]) { await on(d); expect(await d.habitCompletions.count()).toBe(1); expect(await xpTotal()).toBe(10); }
  });

  it("last write wins for concurrent edits, on both devices", async () => {
    await on(A);
    const t = await repo.createTask({ title: "v1", description: "", tags: [], priority: "low", repeat: { type: "none" } });
    await sync(A); await sync(B);
    await on(A); await repo.updateTask(t.id, { title: "from A" });
    await new Promise((r) => setTimeout(r, 5));
    await on(B); await repo.updateTask(t.id, { title: "from B (newer)" });
    await sync(B); await sync(A); await sync(B);
    expect((await A.tasks.get(t.id))?.title).toBe("from B (newer)");
    expect((await B.tasks.get(t.id))?.title).toBe("from B (newer)");
  });

  it("deletions propagate and undoing a completion reverses XP on the other device", async () => {
    await on(A);
    const today = await repo.localToday();
    const t = await repo.createTask({ title: "x", description: "", tags: [], priority: "low", repeat: { type: "none" }, dueDate: today });
    await repo.completeTask(t.id, today);
    await sync(A); await sync(B);
    await on(A); await repo.uncompleteTask(t.id, today);
    await sync(A); await sync(B);
    expect(await B.taskCompletions.count()).toBe(0);
    await on(B); expect(await xpTotal()).toBe(0);
    await on(A); await repo.deleteTask(t.id);
    await sync(A); await sync(B);
    expect(await B.tasks.get(t.id)).toBeUndefined();
  });

  it("data created before signing in is uploaded on first sync", async () => {
    await on(A);
    await A.syncMeta.clear(); await A.outbox.clear(); // simulate data from before sync existed
    await repo.saveJournal({ date: "2026-11-01", title: "Before cloud", body: "hi", tags: [] });
    await A.outbox.clear();
    const r = await sync(A);
    expect(r.pushed).toBeGreaterThan(0);
    await sync(B);
    expect((await B.journal.toArray()).map((j) => j.title)).toContain("Before cloud");
  });

  it("delete everywhere removes the cloud copy; delete on this device does not", async () => {
    await on(A);
    await repo.saveJournal({ date: "2026-11-01", title: "keep?", body: "", tags: [] });
    await sync(A); await sync(B);
    await on(B); await repo.deleteAllData("device");
    await sync(B); // B is "signed out"-style fresh: bootstraps and pulls again
    expect(await B.journal.count()).toBe(1);
    await on(A); await repo.deleteAllData("everywhere");
    await sync(A); await sync(B);
    expect(await B.journal.count()).toBe(0);
  });

  it("replace-import deletes records that aren't in the backup, everywhere", async () => {
    await on(A);
    await repo.saveJournal({ date: "2026-11-01", title: "old", body: "", tags: [] });
    const file = await exportBackup();
    await repo.saveJournal({ date: "2026-11-02", title: "newer", body: "", tags: [] });
    await sync(A); await sync(B);
    expect(await B.journal.count()).toBe(2);
    await on(A); await importBackup(file, "replace");
    await sync(A); await sync(B);
    expect((await B.journal.toArray()).map((j) => j.title)).toEqual(["old"]);
  });

  it("ignores malformed rows and unknown tables from the server", async () => {
    await on(A);
    const r = await applyRemote([
      { tbl: "tasks", id: "t-bad", data: { id: "t-bad", title: "" }, deleted: false, changed_at: "2026-11-17T00:00:00Z", server_updated_at: "2026-11-17T00:00:00Z" },
      { tbl: "evil", id: "x", data: {}, deleted: false, changed_at: "2026-11-17T00:00:00Z", server_updated_at: "2026-11-17T00:00:00Z" },
      { tbl: "tasks", id: "t-mismatch", data: { id: "other" }, deleted: false, changed_at: "2026-11-17T00:00:00Z", server_updated_at: "2026-11-17T00:00:00Z" },
    ]);
    expect(r).toMatchObject({ applied: 0, invalid: 3 });
    expect(await A.tasks.count()).toBe(0);
  });

  it("reconcile reverses XP whose source record no longer exists", async () => {
    await on(A);
    await repo.awardXp("training", "ghost-session", "Training");
    expect(await xpTotal()).toBe(15);
    const r = await reconcileXp();
    expect(r.reversed).toBe(1);
    expect(await xpTotal()).toBe(0);
  });

  it("the 90-day program, its logs and test results sync, with session XP counted once", async () => {
    await on(A);
    const today = await repo.localToday();
    const prof = { goal: "", position: "guard" as const, experience: "jv" as const, age: "16-18" as const, focus: ["shooting" as const], ratings: {}, days: [1, 3, 5], minutes: 45, practiceDays: [], hoop: true, court: true, gym: false, partner: false, injuries: [] };
    const p = await repo.startProgram(prof, today);
    await repo.logProgramSession(p, { date: today, day: 1, kind: "test", title: "Baseline", skills: ["shooting"], status: "done", minutes: 30, note: "", drills: [], shots: [] });
    await repo.saveBenchmark(p.id, "t-ft", 0, 12, today);
    await sync(A); await sync(B);
    expect((await B.programs.get(p.id))?.status).toBe("active");
    expect(await B.programLogs.count()).toBe(1);
    expect((await B.benchmarks.toArray())[0].value).toBe(12);
    expect(await xpTotal()).toBe(15);
  });

  it("writes applied from the cloud are not echoed back as local changes", async () => {
    await on(A);
    await repo.createTask({ title: "echo?", description: "", tags: [], priority: "low", repeat: { type: "none" } });
    await sync(A);
    await on(B); await B.outbox.clear(); await B.syncMeta.put({ key: "bootstrapped", value: true }); await B.syncMeta.put({ key: "userId", value: USER });
    await sync(B);
    expect(await B.tasks.count()).toBe(1);
    expect(await B.outbox.count()).toBe(0);
  });
});
