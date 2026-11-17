import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export const cloudConfiguredOnServer = () => !!(URL && ANON);

/** Server-only allowlist (comma-separated). Missing = nobody is allowed (fails closed). */
export function emailAllowed(email: string | undefined | null): boolean {
  const list = (process.env.ALLOWED_EMAILS ?? "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
  return !!email && list.includes(email.toLowerCase());
}

/** Supabase client acting as the signed-in user (from the auth cookies), subject to row-level security. */
export async function userClient(): Promise<SupabaseClient | null> {
  if (!cloudConfiguredOnServer()) return null;
  const store = await cookies();
  return createServerClient(URL, ANON, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => { try { list.forEach(({ name, value, options }) => store.set(name, value, options)); } catch { /* read-only context */ } },
    },
  });
}

/**
 * The verified, allow-listed user for this request, or null. `getUser()` validates the session
 * with Supabase Auth; a cookie the client made up is never trusted on its own.
 */
export async function verifiedUser(): Promise<{ id: string; email: string; client: SupabaseClient } | null> {
  const client = await userClient();
  if (!client) return null;
  const { data, error } = await client.auth.getUser();
  if (error || !data.user?.email || !emailAllowed(data.user.email)) return null;
  return { id: data.user.id, email: data.user.email, client };
}

/** Service-role client for the reminder job only. Never imported by client code. */
export function serviceClient(): SupabaseClient | null {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  if (!URL || !key) return null;
  return createClient(URL, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
