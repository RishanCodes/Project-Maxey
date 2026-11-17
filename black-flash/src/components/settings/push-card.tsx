"use client";
import { useEffect, useState } from "react";
import { BellRing } from "lucide-react";
import { Button, Card, SectionHeader } from "../ui";
import { useToast } from "../toast";
import { useSync } from "../sync";
import { VAPID_PUBLIC_KEY, currentSubscription, disablePush, enablePush, pushEnvironment } from "@/lib/push/client";

export function PushCard() {
  const s = useSync(); const toast = useToast();
  const [env] = useState(() => pushEnvironment()); // rendered client-side only (behind the boot gate)
  const [on, setOn] = useState<boolean | null>(null); const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  useEffect(() => { currentSubscription().then((x) => setOn(!!x)).catch(() => setOn(false)); }, []);
  const why = !VAPID_PUBLIC_KEY ? "Push isn't set up for this installation (README → Reminders when closed)."
    : !s.configured ? "Needs cloud sync, so the server knows your reminder times."
    : !s.user ? "Sign in above first, so the server knows your reminder times."
    : env.ios && !env.standalone ? "On iPhone, open BLACK FLASH from its Home Screen icon (not Safari) to turn this on."
    : !env.supported ? "This browser doesn't support push notifications." : "";
  return (
    <Card className="flex flex-col gap-3"><SectionHeader title="Reminders when the app is closed" sub={on ? "On for this device" : "Off for this device"} />
      <p className="text-sm text-muted">Habit reminder times and task due times arrive as notifications even when the app is closed. Times sync to the server; delivery depends on your phone and can be a few minutes late.</p>
      {why ? <p className="text-sm">{why}</p> : (
        <div className="flex flex-wrap gap-2">
          {!on ? <Button variant="primary" size="sm" disabled={busy} onClick={async () => { setBusy(true); setError(""); try { await enablePush(); setOn(true); toast("Reminders are on for this device"); } catch (e) { setError((e as Error).message); } setBusy(false); }}><BellRing size={16} />Turn on</Button>
            : <Button size="sm" disabled={busy} onClick={async () => { setBusy(true); await disablePush(); setOn(false); setBusy(false); toast("Reminders are off for this device"); }}>Turn off</Button>}
          {on && <Button size="sm" variant="ghost" onClick={async () => { const r = await fetch("/api/push/test", { method: "POST" }); const j = await r.json().catch(() => ({})); toast(r.ok ? `Test sent to ${j.sent} device${j.sent === 1 ? "" : "s"}` : j.error ?? "Test failed"); }}>Send a test</Button>}
        </div>
      )}
      {error && <p role="alert" className="text-sm text-red">{error}</p>}
    </Card>
  );
}
