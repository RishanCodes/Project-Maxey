import { z } from "zod";
import { verifiedUser } from "@/lib/server/auth";
import { pushConfigured } from "@/lib/server/push";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Sub = z.object({ endpoint: z.string().url().max(1000), keys: z.object({ p256dh: z.string().min(1).max(300), auth: z.string().min(1).max(100) }) });

export async function POST(req: Request) {
  if (!pushConfigured()) return Response.json({ error: "Push isn't configured on the server." }, { status: 503 });
  const user = await verifiedUser();
  if (!user) return Response.json({ error: "Sign in first." }, { status: 401 });
  const parsed = Sub.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid subscription." }, { status: 400 });
  const { endpoint, keys } = parsed.data;
  const { error } = await user.client.from("bf_push_subscriptions").upsert({ endpoint, p256dh: keys.p256dh, auth: keys.auth, user_id: user.id, user_agent: req.headers.get("user-agent")?.slice(0, 300) ?? null }, { onConflict: "endpoint" });
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}

export async function DELETE(req: Request) {
  const user = await verifiedUser();
  if (!user) return Response.json({ error: "Sign in first." }, { status: 401 });
  const body = await req.json().catch(() => null) as { endpoint?: string } | null;
  if (!body?.endpoint) return Response.json({ error: "Missing endpoint." }, { status: 400 });
  await user.client.from("bf_push_subscriptions").delete().eq("endpoint", body.endpoint);
  return Response.json({ ok: true });
}
