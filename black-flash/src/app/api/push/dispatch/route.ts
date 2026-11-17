import { timingSafeEqual } from "node:crypto";
import { serviceClient } from "@/lib/server/auth";
import { pushConfigured, sendPush } from "@/lib/server/push";
import { dueReminders } from "@/lib/push/reminders";
import type { Habit, HabitCompletion, Preferences, Task, TaskCompletion } from "@/lib/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Reminder window: a reminder is sent if its time fell within the last N minutes. Run the job at least this often. */
const WINDOW_MIN = 15;

function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET ?? "";
  const got = req.headers.get("authorization") ?? "";
  const want = `Bearer ${secret}`;
  return !!secret && got.length === want.length && timingSafeEqual(Buffer.from(got), Buffer.from(want));
}

async function run(req: Request) {
  if (!authorized(req)) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const db = serviceClient();
  if (!db || !pushConfigured()) return Response.json({ error: "Push or SUPABASE_SERVICE_ROLE_KEY not configured." }, { status: 503 });
  const { data: subs, error } = await db.from("bf_push_subscriptions").select("endpoint,p256dh,auth,user_id");
  if (error) return Response.json({ error: error.message }, { status: 500 });
  const byUser = new Map<string, typeof subs>();
  for (const s of subs ?? []) byUser.set(s.user_id, [...(byUser.get(s.user_id) ?? []), s]);
  let sent = 0, removed = 0;
  for (const [userId, list] of byUser) {
    const { data: rows } = await db.from("bf_records").select("tbl,data").eq("user_id", userId).eq("deleted", false).in("tbl", ["prefs", "habits", "habitCompletions", "tasks", "taskCompletions"]);
    const pick = <T,>(t: string) => (rows ?? []).filter((r) => r.tbl === t).map((r) => r.data as T);
    const due = dueReminders({ prefs: pick<Preferences>("prefs")[0], habits: pick<Habit>("habits"), habitCompletions: pick<HabitCompletion>("habitCompletions"), tasks: pick<Task>("tasks"), taskCompletions: pick<TaskCompletion>("taskCompletions"), now: new Date(), windowMin: WINDOW_MIN });
    if (!due.length) continue;
    const { data: logged } = await db.from("bf_push_log").select("key").eq("user_id", userId).in("key", due.map((d) => d.key));
    const done = new Set((logged ?? []).map((l) => l.key));
    for (const r of due.filter((d) => !done.has(d.key))) {
      let ok = false;
      for (const s of list!) {
        const res = await sendPush(s, { title: r.title, body: r.body, url: r.url, tag: r.key });
        if (res === "ok") ok = true;
        if (res === "gone") { await db.from("bf_push_subscriptions").delete().eq("endpoint", s.endpoint); removed++; }
      }
      if (ok) { await db.from("bf_push_log").insert({ user_id: userId, key: r.key }); sent++; }
    }
  }
  return Response.json({ users: byUser.size, sent, removed });
}

export const GET = run; // Vercel Cron sends GET with "Authorization: Bearer $CRON_SECRET"
export const POST = run;
