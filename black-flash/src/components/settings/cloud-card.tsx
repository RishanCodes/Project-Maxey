"use client";
import { useState } from "react";
import { Cloud, CloudOff, RefreshCw } from "lucide-react";
import { Button, Card, Field, Input, SectionHeader } from "../ui";
import { useToast } from "../toast";
import { useSync } from "../sync";
import { sendCode, signOutCloud, verifyCode } from "@/lib/cloud/client";

export function CloudCard() {
  const s = useSync(); const toast = useToast();
  const [email, setEmail] = useState(""); const [code, setCode] = useState(""); const [step, setStep] = useState<"email" | "code">("email");
  const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  if (!s.configured) return (
    <Card className="flex flex-col gap-2"><SectionHeader title="Account & sync" sub="Local First" />
      <p className="text-sm text-muted">Everything is stored on this device. Cloud sync isn't set up for this installation. To sync between devices, the owner connects a Supabase project (README → Cloud sync), then signs in here.</p>
    </Card>
  );
  if (s.user) return (
    <Card className="flex flex-col gap-3"><SectionHeader title="Account & sync" sub={`Signed in as ${s.user.email}`} />
      <p className="flex items-center gap-2 text-sm">{s.status === "error" || s.status === "signed-out" ? <CloudOff size={16} className="text-red" aria-hidden="true" /> : <Cloud size={16} className="text-flash" aria-hidden="true" />}
        {s.status === "syncing" ? "Syncing…" : s.lastSyncAt ? `Last synced ${new Date(s.lastSyncAt).toLocaleString()}` : "Not synced yet"}{s.pending ? ` · ${s.pending} change${s.pending === 1 ? "" : "s"} waiting` : ""}</p>
      {s.error && <p role="alert" className="text-sm text-red">{s.error}</p>}
      <p className="text-xs text-muted">Changes sync automatically when the app opens, every minute while it's open, and a few seconds after you change something. If two devices change the same item, the most recent change wins. Signing out keeps everything on this device.</p>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={() => s.syncNow().then(() => toast("Synced"))} disabled={s.status === "syncing"}><RefreshCw size={16} />Sync now</Button>
        <Button size="sm" variant="ghost" onClick={async () => { await signOutCloud(); toast("Signed out. Your data stays on this device."); }}>Sign out</Button>
      </div>
    </Card>
  );
  return (
    <Card className="flex flex-col gap-3"><SectionHeader title="Account & sync" sub="Sign in to back up and sync between your devices" />
      {step === "email" ? (
        <form className="flex flex-col gap-3" onSubmit={async (e) => { e.preventDefault(); setBusy(true); setError(""); try { await sendCode(email); setStep("code"); toast("Code sent. Check your email."); } catch (err) { setError((err as Error).message); } setBusy(false); }}>
          <Field label="Email" htmlFor="cl-email" error={error}><Input id="cl-email" type="email" autoComplete="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></Field>
          <Button type="submit" variant="primary" disabled={busy || !email.includes("@")}>Email me a sign-in code</Button>
        </form>
      ) : (
        <form className="flex flex-col gap-3" onSubmit={async (e) => { e.preventDefault(); setBusy(true); setError(""); try { await verifyCode(email, code); toast("Signed in. Syncing your data."); } catch (err) { setError((err as Error).message); } setBusy(false); }}>
          <Field label={`Code sent to ${email}`} htmlFor="cl-code" error={error} hint="Type the 6-digit code here. Don't open the email link on an iPhone: it would sign in Safari, not this app."><Input id="cl-code" inputMode="numeric" autoComplete="one-time-code" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 10))} required /></Field>
          <div className="flex gap-2"><Button type="submit" variant="primary" className="flex-1" disabled={busy || code.length < 6}>Sign in</Button><Button type="button" variant="ghost" onClick={() => { setStep("email"); setCode(""); setError(""); }}>Back</Button></div>
        </form>
      )}
      <p className="text-xs text-muted">On first sign-in, data already on this device is merged with your cloud copy. Nothing is deleted.</p>
    </Card>
  );
}
