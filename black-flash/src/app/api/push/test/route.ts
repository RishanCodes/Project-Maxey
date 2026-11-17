import { verifiedUser } from "@/lib/server/auth";
import { pushConfigured, sendPush } from "@/lib/server/push";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Sends a test notification to the signed-in user's devices. */
export async function POST() {
  if (!pushConfigured()) return Response.json({ error: "Push isn't configured on the server." }, { status: 503 });
  const user = await verifiedUser();
  if (!user) return Response.json({ error: "Sign in first." }, { status: 401 });
  const { data, error } = await user.client.from("bf_push_subscriptions").select("endpoint,p256dh,auth");
  if (error) return Response.json({ error: error.message }, { status: 500 });
  let sent = 0;
  for (const s of data ?? []) {
    const r = await sendPush(s, { title: "BLACK FLASH", body: "Test notification: reminders are working.", url: "/settings", tag: "bf-test" });
    if (r === "ok") sent++;
    if (r === "gone") await user.client.from("bf_push_subscriptions").delete().eq("endpoint", s.endpoint);
  }
  return Response.json({ sent, devices: data?.length ?? 0 });
}
