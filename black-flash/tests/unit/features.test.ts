import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createECDH, randomBytes } from "node:crypto";
import webpush from "web-push";
import { suggestTimes, freeSlots } from "@/lib/schedule";
import { dueReminders } from "@/lib/push/reminders";
import type { Habit, Task, TrainingSession, Preferences } from "@/lib/schema";
import type { TaskOccurrence } from "@/lib/recurrence";

const task = (over: Partial<Task>): Task => ({ id: Math.random().toString(36).slice(2), title: "t", description: "", tags: [], priority: "medium", repeat: { type: "none" }, order: 1, archived: false, createdAt: "2026-11-01T00:00:00Z", updatedAt: "", ...over });
const occ = (t: Task, extra: Partial<TaskOccurrence> = {}): TaskOccurrence => ({ task: t, date: "2026-11-17", done: false, overdue: false, ...extra });

describe("schedule suggestions", () => {
  const answers = { dayStart: "08:30", dayEnd: "15:15", practiceDays: [2], practiceTime: "16:00", protectTime: "60" };
  const toMin = (s: string) => Number(s.slice(0, 2)) * 60 + Number(s.slice(3));
  it("never overlaps school, practice, timed tasks or each other, and keeps protected time free", () => {
    const fixed = task({ title: "Call", dueTime: "18:00", durationMin: 45 });
    const ts = [task({ title: "Essay", priority: "high", durationMin: 60 }), task({ title: "Read", durationMin: 40 }), task({ title: "Email" })];
    const r = suggestTimes({ date: "2026-11-17", today: "2026-11-16", nowMin: 0, occurrences: [occ(fixed), ...ts.map((t) => occ(t))], training: [], answers });
    expect(r.proposals.map((p) => p.title)).toEqual(["Essay", "Read", "Email"]); // priority order
    const blocks = [[toMin("08:30") - 10, toMin("15:15") + 10], [toMin("16:00") - 10, toMin("17:30") + 10], [toMin("18:00") - 10, toMin("18:45") + 10]];
    const placed = r.proposals.map((p) => [toMin(p.time), toMin(p.time) + p.durationMin]);
    for (const [s, e] of placed) {
      for (const [bs, be] of blocks) expect(e <= bs || s >= be).toBe(true);
      expect(e).toBeLessThanOrEqual(22 * 60 - 60);
    }
    for (let i = 0; i < placed.length; i++) for (let j = i + 1; j < placed.length; j++) expect(placed[i][1] <= placed[j][0] || placed[j][1] <= placed[i][0]).toBe(true);
  });
  it("on today, only proposes future times; planned training replaces the usual practice block", () => {
    const training: TrainingSession[] = [{ id: "s", date: "2026-11-17", startTime: "19:00", activity: "basketball", type: "team_practice", durationMin: 60, focusAreas: [], notes: "", status: "planned", drills: [], shots: [], createdAt: "", updatedAt: "" }];
    const r = suggestTimes({ date: "2026-11-17", today: "2026-11-17", nowMin: 16 * 60 + 2, occurrences: [occ(task({ title: "A", durationMin: 30 }))], training, answers });
    expect(toMin(r.proposals[0].time)).toBeGreaterThanOrEqual(16 * 60 + 12);
    expect(r.busy.map((b) => b.label)).toContain("Training");
    expect(r.busy.map((b) => b.label)).not.toContain("Practice");
  });
  it("skips repeating and already-timed tasks; reports what doesn't fit", () => {
    const r = suggestTimes({ date: "2026-11-17", today: "2026-11-16", nowMin: 0, occurrences: [occ(task({ title: "Rep", repeat: { type: "daily" } })), occ(task({ title: "Huge", durationMin: 900 }))], training: [], answers });
    expect(r.proposals).toHaveLength(0);
    expect(r.unplaced.map((t) => t.title)).toEqual(["Huge"]);
  });
  it("free slots drop gaps under 15 minutes", () => {
    expect(freeSlots([{ start: 600, end: 650, label: "x" }, { start: 665, end: 700, label: "y" }], 540, 720)).toEqual([{ start: 540, end: 590 }]);
  });
});

describe("closed-app reminders", () => {
  const prefs = { timezone: "America/Los_Angeles", weekStart: 1, appName: "BLACK FLASH" } as Preferences;
  const habit: Habit = { id: "h", label: "Lights out", purpose: "", category: "x", schedule: { type: "weekdays", days: [1, 3, 5] }, reminderTime: "21:30", status: "active", pauses: [], startDate: "2026-11-01", createdAt: "2026-11-01T00:00:00Z", updatedAt: "" };
  const at = (iso: string) => new Date(iso);
  it("fires inside the window, in the user's timezone, only on scheduled days and only if not done", () => {
    const base = { prefs, habits: [habit], habitCompletions: [], tasks: [], taskCompletions: [], windowMin: 15 };
    expect(dueReminders({ ...base, now: at("2026-11-17T05:35:00Z") })).toHaveLength(1); // Mon 21:35 LA
    expect(dueReminders({ ...base, now: at("2026-11-17T05:20:00Z") })).toHaveLength(0); // 21:20, not yet
    expect(dueReminders({ ...base, now: at("2026-11-17T05:50:00Z") })).toHaveLength(0); // 21:50, window passed
    expect(dueReminders({ ...base, now: at("2026-11-18T05:35:00Z") })).toHaveLength(0); // Tuesday, not scheduled
    expect(dueReminders({ ...base, habitCompletions: [{ id: "c", habitId: "h", date: "2026-11-16", state: "done", at: "" }], now: at("2026-11-17T05:35:00Z") })).toHaveLength(0);
  });
  it("includes tasks due now, with stable keys for de-duplication", () => {
    const t = task({ id: "tk", title: "Submit form", dueDate: "2026-11-16", dueTime: "21:30" });
    const r = dueReminders({ prefs, habits: [], habitCompletions: [], tasks: [t], taskCompletions: [], now: at("2026-11-17T05:31:00Z"), windowMin: 15 });
    expect(r).toEqual([{ key: "task:tk:2026-11-16", title: "BLACK FLASH", body: "Due now: Submit form", url: "/plan" }]);
  });
});

describe("Web Push delivery", () => {
  beforeEach(() => {
    const keys = webpush.generateVAPIDKeys();
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = keys.publicKey; process.env.VAPID_PRIVATE_KEY = keys.privateKey; process.env.VAPID_SUBJECT = "mailto:test@example.com";
  });
  afterEach(() => { vi.restoreAllMocks(); });
  const sub = () => { const ecdh = createECDH("prime256v1"); ecdh.generateKeys(); return { endpoint: "https://push.example.com/abc", p256dh: ecdh.getPublicKey().toString("base64url"), auth: randomBytes(16).toString("base64url") }; };
  it("builds an encrypted, VAPID-signed request for a real P-256 subscription", () => {
    const s = sub();
    const req = webpush.generateRequestDetails({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify({ title: "t", body: "secret body" }), {
      vapidDetails: { subject: process.env.VAPID_SUBJECT!, publicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!, privateKey: process.env.VAPID_PRIVATE_KEY! }, TTL: 3600 });
    expect(req.headers["Content-Encoding"]).toBe("aes128gcm");
    expect(String(req.headers.Authorization)).toMatch(/^vapid t=.+, k=.+/);
    expect(Buffer.from(req.body as Buffer).toString("utf8")).not.toContain("secret body"); // payload is encrypted
  });
  it("maps delivery results: ok, gone (404/410: subscription expired) and error", async () => {
    const { sendPush, pushConfigured } = await import("@/lib/server/push");
    expect(pushConfigured()).toBe(true);
    const spy = vi.spyOn(webpush, "sendNotification");
    spy.mockResolvedValueOnce({ statusCode: 201, body: "", headers: {} });
    expect(await sendPush(sub(), { title: "t", body: "b", url: "/", tag: "x" })).toBe("ok");
    spy.mockRejectedValueOnce(Object.assign(new Error("gone"), { statusCode: 410 }));
    expect(await sendPush(sub(), { title: "t", body: "b", url: "/", tag: "x" })).toBe("gone");
    spy.mockRejectedValueOnce(Object.assign(new Error("server"), { statusCode: 500 }));
    expect(await sendPush(sub(), { title: "t", body: "b", url: "/", tag: "x" })).toBe("error");
  });
});

describe("AI coach access policy", () => {
  const save = { ...process.env };
  afterEach(() => { process.env = { ...save }; vi.resetModules(); vi.doUnmock("@/lib/server/auth"); });
  async function load(user: { id: string; email: string } | null, cloud = true) {
    vi.resetModules();
    vi.doMock("@/lib/server/auth", () => ({ verifiedUser: async () => user, cloudConfiguredOnServer: () => cloud }));
    return (await import("@/lib/server/coach-policy")).coachStatus;
  }
  it("is off without an API key, even when signed in", async () => {
    delete process.env.ANTHROPIC_API_KEY;
    const s = await (await load({ id: "u", email: "me@example.com" }))("example.app");
    expect(s.allowed).toBe(false);
  });
  it("is allowed for a verified, allow-listed session on a deployment", async () => {
    process.env.ANTHROPIC_API_KEY = "x";
    const s = await (await load({ id: "u", email: "me@example.com" }))("blackflash.example.app");
    expect(s).toMatchObject({ allowed: true, signedIn: "me@example.com" });
  });
  it("refuses anonymous requests on a deployment, and explains how to enable it", async () => {
    process.env.ANTHROPIC_API_KEY = "x";
    const s = await (await load(null))("blackflash.example.app");
    expect(s.allowed).toBe(false);
    expect(s.reason).toMatch(/Sign in/);
  });
  it("allows local development only with the explicit opt-in on localhost", async () => {
    process.env.ANTHROPIC_API_KEY = "x";
    vi.stubEnv("NODE_ENV", "development"); process.env.COACH_DEV_LOCALHOST = "true";
    expect((await (await load(null, false))("localhost:3000")).allowed).toBe(true);
    expect((await (await load(null, false))("192.168.1.5:3000")).allowed).toBe(false);
    vi.unstubAllEnvs();
  });
});

describe("server allowlist", () => {
  afterEach(() => { delete process.env.ALLOWED_EMAILS; });
  it("fails closed and matches case-insensitively", async () => {
    const { emailAllowed } = await import("@/lib/server/auth");
    expect(emailAllowed("me@example.com")).toBe(false);
    process.env.ALLOWED_EMAILS = " Me@Example.com , other@x.io";
    expect(emailAllowed("me@example.com")).toBe(true);
    expect(emailAllowed("stranger@example.com")).toBe(false);
  });
});
