import "server-only";

/**
 * Who may use the paid AI endpoint. This build has no user authentication, so live AI is allowed
 * only when ALL of these hold:
 *   - ANTHROPIC_API_KEY is set on the server,
 *   - the server runs in development (`next dev`),
 *   - COACH_DEV_LOCALHOST=true, and
 *   - the request's Host is localhost / 127.0.0.1.
 * On any deployment the endpoint refuses, so it can never act as an open proxy for the key.
 * A client-supplied flag or passcode is never treated as authorization.
 */
export interface CoachStatus { configured: boolean; allowed: boolean; reason: string; model: string }

export const DEFAULT_MODEL = "claude-opus-5-5";

export function coachStatus(host: string | null): CoachStatus {
  const model = process.env.ANTHROPIC_MODEL?.trim() || DEFAULT_MODEL;
  const configured = !!process.env.ANTHROPIC_API_KEY?.trim();
  if (!configured) return { configured, allowed: false, model, reason: "No ANTHROPIC_API_KEY is set on the server. Insights Mode is active." };
  const hostname = (host ?? "").split(":")[0].toLowerCase();
  const local = hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]";
  if (process.env.NODE_ENV !== "development" || process.env.COACH_DEV_LOCALHOST !== "true" || !local)
    return { configured, allowed: false, model, reason: "Live AI is disabled outside local development because this build has no sign-in to protect the API key. See README → Optional AI coach." };
  return { configured, allowed: true, model, reason: "Development mode on localhost (COACH_DEV_LOCALHOST=true)." };
}

/* Simple in-memory rate limit: 12 requests per rolling minute per server process. */
const hits: number[] = [];
export function rateLimited(now = Date.now()): boolean {
  while (hits.length && now - hits[0] > 60_000) hits.shift();
  if (hits.length >= 12) return true;
  hits.push(now);
  return false;
}
