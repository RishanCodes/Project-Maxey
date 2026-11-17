"use client";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { ToastProvider } from "./toast";
import { FlashMark } from "./logo";
import { getPrefs } from "@/lib/repo";
import { usePrefs } from "@/hooks/use-data";
import { HabitReminders } from "./reminders";

function Splash({ message }: { message?: string }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
      <FlashMark size={44} className="pop" />
      <p className="text-[13px] font-semibold uppercase tracking-[0.32em] text-muted">Black Flash</p>
      {message && <p className="max-w-sm text-sm text-muted">{message}</p>}
    </div>
  );
}

/** Opens local storage, then routes first-time users to onboarding. */
function BootGate({ children }: { children: ReactNode }) {
  const [state, setState] = useState<"booting" | "ready" | "error">("booting");
  const prefs = usePrefs();
  const path = usePathname();
  const router = useRouter();
  useEffect(() => {
    getPrefs().then(() => setState("ready")).catch(() => setState("error"));
  }, []);
  const needsOnboarding = prefs && (prefs.onboarding.status === "not_started" || prefs.onboarding.status === "in_progress");
  const onOnboarding = path?.startsWith("/onboarding");
  const allowed = path?.startsWith("/settings") || path?.startsWith("/data");
  useEffect(() => {
    if (state === "ready" && needsOnboarding && !onOnboarding && !allowed) router.replace("/onboarding");
  }, [state, needsOnboarding, onOnboarding, allowed, router]);
  if (state === "error") return <Splash message="This browser blocked local storage (private browsing can do this). BLACK FLASH stores everything on this device, so it needs IndexedDB to run." />;
  if (state === "booting" || !prefs || (needsOnboarding && !onOnboarding && !allowed)) return <Splash />;
  return <>{children}</>;
}

function ServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);
  return null;
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      <ServiceWorker />
      <HabitReminders />
      <BootGate>{children}</BootGate>
    </ToastProvider>
  );
}
