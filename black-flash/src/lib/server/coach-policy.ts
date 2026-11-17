import "server-only";

import { cloudConfiguredOnServer, verifiedUser } from "./auth";

/**
 * Who may use the paid AI endpoint. Live AI is allowed only when ANTHROPIC_API_KEY is set AND either:
 *   - the request comes from a verified Supabase session whose email is in ALLOWED_EMAILS (any deployment), or
 *   - local development: `next dev` + COACH_DEV_LOCALHOST=true + a localhost Host header.
 * Otherwise it refuses, so it can never act as an open proxy for the key.
 * A client-supplied flag or passcode is never treated as authorization.
 */
export interface CoachStatus { configured: boolean; allowed: boolean; reason: string; model: string; signedIn?: string }

export const DEFAULT_MODEL = "claude-opus-5-5";

export async function coachStatus(host: string | null): Promise<CoachStatus> {
  const model = process.env.ANTHROPIC_MODEL?.trim() || DEFAULT_MODEL;
  const configured = !!process.env.ANTHROPIC_API_KEY?.trim();
  if (!configured) return { configured, allowed: false, model, reason: "No ANTHROPIC_API_KEY is set on the server. Insights Mode is active." };
  const user = await verifiedUser().catch(() => null);
  if (user) return { configured, allowed: true, model, signedIn: user.email, reason: `Signed in as ${user.email}.` };
  const hostname = (host ?? "").split(":")[0].toLowerCase();
  const local = hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]";
  if (process.env.NODE_ENV === "development" && process.env.COACH_DEV_LOCALHOST === "true" && local)
    return { configured, allowed: true, model, reason: "Development mode on localhost (COACH_DEV_LOCALHOST=true)." };
  return { configured, allowed: false, model, reason: cloudConfiguredOnServer() ? "Sign in (Settings → Account & sync) with your allow-listed account to use the AI coach." : "The AI coach needs sign-in on a deployed app. Set up Supabase (see README) to enable it." };
}

/* Simple in-memory rate limit: 12 requests per rolling minute per server process. */
const hits: number[] = [];
export function rateLimited(now = Date.now()): boolean {
  while (hits.length && now - hits[0] > 60_000) hits.shift();
  if (hits.length >= 12) return true;
  hits.push(now);
  return false;
}
