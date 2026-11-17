"use client";
import type { User } from "@supabase/supabase-js";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { getDb } from "@/lib/db";
import { cloudConfigured, getSupabase, supabaseRemote } from "@/lib/cloud/client";
import { recordSyncError, syncOnce, syncStatusMeta } from "@/lib/sync/engine";

type Status = "off" | "signed-out" | "idle" | "syncing" | "error";
interface SyncState { configured: boolean; user: User | null; status: Status; lastSyncAt?: string; error?: string | null; pending: number; syncNow: () => Promise<void> }
const Ctx = createContext<SyncState>({ configured: false, user: null, status: "off", pending: 0, syncNow: async () => {} });
export const useSync = () => useContext(Ctx);

export function SyncProvider({ children }: { children: ReactNode }) {
  const configured = cloudConfigured();
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<Status>(configured ? "signed-out" : "off");
  const [error, setError] = useState<string | null>(null);
  const pending = useLiveQuery(() => getDb().outbox.count(), []) ?? 0;
  const meta = useLiveQuery(() => syncStatusMeta(), []);
  const running = useRef(false);
  const again = useRef(false);

  useEffect(() => {
    const sb = getSupabase();
    if (!sb) return;
    sb.auth.getUser().then(({ data }) => { setUser(data.user ?? null); setStatus(data.user ? "idle" : "signed-out"); });
    const { data: sub } = sb.auth.onAuthStateChange((_e, session) => { setUser(session?.user ?? null); setStatus(session?.user ? "idle" : "signed-out"); });
    return () => sub.subscription.unsubscribe();
  }, []);

  const syncNow = useCallback(async () => {
    const sb = getSupabase();
    if (!sb || !user) return;
    if (running.current) { again.current = true; return; }
    if (typeof navigator !== "undefined" && !navigator.onLine) return;
    running.current = true; setStatus("syncing");
    try {
      do { again.current = false; await syncOnce(supabaseRemote(sb, user.id), user.id); } while (again.current);
      setError(null); setStatus("idle");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Sync failed";
      const authProblem = /jwt|token|auth|session/i.test(msg);
      setError(authProblem ? "Your session expired. Sign in again to resume syncing. Nothing on this device was lost." : `Sync failed: ${msg}. Your changes are kept and will retry.`);
      setStatus(authProblem ? "signed-out" : "error");
      await recordSyncError(msg).catch(() => {});
    } finally { running.current = false; }
  }, [user]);

  // When to sync: on sign-in, when the app returns to the foreground or comes online, every minute while open,
  // and a few seconds after local changes.
  useEffect(() => {
    if (!user) return;
    const first = setTimeout(syncNow, 0);
    const onVis = () => { if (document.visibilityState === "visible") syncNow(); };
    window.addEventListener("online", syncNow); document.addEventListener("visibilitychange", onVis);
    const id = setInterval(() => { if (document.visibilityState === "visible") syncNow(); }, 60_000);
    return () => { clearTimeout(first); window.removeEventListener("online", syncNow); document.removeEventListener("visibilitychange", onVis); clearInterval(id); };
  }, [user, syncNow]);
  useEffect(() => {
    if (!user || !pending) return;
    const t = setTimeout(syncNow, 3000);
    return () => clearTimeout(t);
  }, [pending, user, syncNow]);

  return <Ctx.Provider value={{ configured, user, status, lastSyncAt: meta?.lastSyncAt, error: error ?? meta?.lastError ?? null, pending, syncNow }}>{children}</Ctx.Provider>;
}
