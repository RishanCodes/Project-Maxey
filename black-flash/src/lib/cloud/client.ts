/**
 * Optional cloud mode (Supabase). Enabled only when both public settings are present at build time.
 * The anon key is designed to be public; all protection comes from row-level security plus the
 * allowlist in the database (see supabase/migrations).
 */
import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { PushRow, Remote, RemoteRow } from "../sync/engine";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
export const cloudConfigured = (): boolean => !!(URL && KEY);

let client: SupabaseClient | null = null;
export function getSupabase(): SupabaseClient | null {
  if (!cloudConfigured() || typeof window === "undefined") return null;
  if (!client) client = createBrowserClient(URL, KEY);
  return client;
}

export function supabaseRemote(sb: SupabaseClient, userId: string): Remote {
  return {
    async push(rows: PushRow[]) {
      if (!rows.length) return;
      const { error } = await sb.from("bf_records").upsert(rows.map((r) => ({ ...r, user_id: userId })), { onConflict: "user_id,tbl,id" });
      if (error) throw new Error(error.message);
    },
    async pull(since: string | null, limit: number) {
      let q = sb.from("bf_records").select("tbl,id,data,deleted,changed_at,server_updated_at").order("server_updated_at", { ascending: true }).limit(limit);
      if (since) q = q.gte("server_updated_at", since);
      const { data, error } = await q;
      if (error) throw new Error(error.message);
      return (data ?? []) as RemoteRow[];
    },
  };
}

/** Email one-time code (works inside an installed iPhone app, unlike magic links that open Safari). */
export async function sendCode(email: string) {
  const sb = getSupabase();
  if (!sb) throw new Error("Cloud mode is not configured.");
  const { error } = await sb.auth.signInWithOtp({ email: email.trim().toLowerCase(), options: { shouldCreateUser: false } });
  if (error) throw new Error(error.message.includes("Signups not allowed") ? "No account exists for that email. Create it in Supabase first (see README)." : error.message);
}

export async function verifyCode(email: string, code: string) {
  const sb = getSupabase();
  if (!sb) throw new Error("Cloud mode is not configured.");
  const { data, error } = await sb.auth.verifyOtp({ email: email.trim().toLowerCase(), token: code.trim(), type: "email" });
  if (error || !data.user) throw new Error(error?.message ?? "That code didn't work. Request a new one.");
  const allowed = await sb.rpc("bf_is_allowed");
  if (allowed.error || allowed.data !== true) {
    await sb.auth.signOut();
    throw new Error("This account isn't on the allowlist for this app. Add the email to bf_allowlist in Supabase (see README).");
  }
  return data.user;
}

export async function signOutCloud() {
  await getSupabase()?.auth.signOut();
}
