"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button, Card, Chip, Field, Input, Select, Skeleton, SectionHeader, Switch } from "@/components/ui";
import { useToast } from "@/components/toast";
import { usePrefs } from "@/hooks/use-data";
import { updatePrefs } from "@/lib/repo";
import { browserTimezone, isValidTimezone } from "@/lib/dates";
import { CONTEXT_LABEL, type ContextKey } from "@/lib/coach-context";
import type { Preferences } from "@/lib/schema";
import { CloudCard } from "@/components/settings/cloud-card";
import { PushCard } from "@/components/settings/push-card";
import { SoundSetting } from "@/components/settings/sound-setting";

const ZONES = ["America/Los_Angeles", "America/Denver", "America/Chicago", "America/New_York", "America/Toronto", "Europe/London", "Europe/Berlin", "Asia/Tokyo", "Australia/Sydney", "UTC"];

export default function SettingsPage() {
  const prefs = usePrefs(); const toast = useToast(); const router = useRouter();
  const [status, setStatus] = useState<{ allowed: boolean; configured: boolean; reason: string } | null>(null);
  useEffect(() => { fetch("/api/coach").then((r) => r.json()).then(setStatus).catch(() => setStatus(null)); }, []);
  if (!prefs) return <Skeleton className="h-80" />;
  const set = async (patch: Partial<Preferences>, msg = "Saved") => { await updatePrefs(patch); toast(msg); };
  const zones = Array.from(new Set([prefs.timezone, browserTimezone(), ...ZONES]));
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
      <ProfileCard key={`${prefs.name}|${prefs.appName}`} prefs={prefs} save={set} />
      <Card className="flex flex-col gap-4"><SectionHeader title="Preferences" />
        <Field label="Timezone" htmlFor="s-tz" hint={`Decides what "today" means. Detected on this device: ${browserTimezone()}`}><Select id="s-tz" value={prefs.timezone} onChange={(e) => isValidTimezone(e.target.value) && set({ timezone: e.target.value }, "Timezone updated")}>{zones.map((z) => <option key={z} value={z}>{z}</option>)}</Select></Field>
        <fieldset><legend className="mb-1.5 text-sm font-medium text-muted">Week starts on</legend><div className="flex gap-1.5"><Chip selected={prefs.weekStart === 1} onClick={() => set({ weekStart: 1 })}>Monday</Chip><Chip selected={prefs.weekStart === 0} onClick={() => set({ weekStart: 0 })}>Sunday</Chip></div></fieldset>
        <fieldset><legend className="mb-1.5 text-sm font-medium text-muted">Main card on Today</legend><div className="flex flex-wrap gap-1.5">{([["priority", "Top priority"], ["workout", "Next workout"], ["study", "Study / focus"], ["habit", "Habits due"], ["goal", "A goal"]] as const).map(([v, l]) => <Chip key={v} selected={prefs.homeCard === v} onClick={() => set({ homeCard: v })}>{l}</Chip>)}</div></fieldset>
        <fieldset><legend className="mb-1.5 text-sm font-medium text-muted">Levels and XP</legend><div className="flex flex-wrap gap-1.5">{(["subtle", "balanced", "deep"] as const).map((v) => <Chip key={v} selected={prefs.gamification === v} onClick={() => set({ gamification: v })} className="capitalize">{v}</Chip>)}</div></fieldset>
        <fieldset><legend className="mb-1.5 text-sm font-medium text-muted">Coaching tone</legend><div className="flex flex-wrap gap-1.5">{(["direct", "balanced", "encouraging", "analytical"] as const).map((v) => <Chip key={v} selected={prefs.coachStyle === v} onClick={() => set({ coachStyle: v })} className="capitalize">{v}</Chip>)}</div></fieldset>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Focus length (min)" htmlFor="s-focus"><Select id="s-focus" value={prefs.focusMinutes} onChange={(e) => set({ focusMinutes: Number(e.target.value) })}>{[15, 20, 25, 30, 45, 50, 60, 90].map((m) => <option key={m} value={m}>{m}</option>)}</Select></Field>
          <Field label="Break (min)" htmlFor="s-break"><Select id="s-break" value={prefs.breakMinutes} onChange={(e) => set({ breakMinutes: Number(e.target.value) })}>{[3, 5, 10, 15].map((m) => <option key={m} value={m}>{m}</option>)}</Select></Field>
        </div>
        <Switch checked={prefs.weeklyReview} onChange={(v) => set({ weeklyReview: v })} label="Weekly review" description="A facts-only summary on the Coach screen." />
        <Switch checked={prefs.notifications} onChange={async (v) => {
          if (v && typeof Notification !== "undefined") { const p = await Notification.requestPermission(); if (p !== "granted") { toast("Notifications were not allowed by the browser."); return; } }
          set({ notifications: v });
        }} label="In-app habit reminders" description="Shown while the app is open. For reminders when it's closed, see below." />
        <SoundSetting />
      </Card>
      <Card className="flex flex-col gap-3"><SectionHeader title="Onboarding" sub={prefs.onboarding.status === "defaults" ? "Started with defaults" : prefs.onboarding.completedAt ? "Completed" : "Not completed"} />
        <p className="text-sm text-muted">Retake or edit your answers. Your data stays; approving the plan again updates the same items instead of duplicating them.</p>
        <div className="flex flex-wrap gap-2"><Button onClick={async () => { await updatePrefs({ onboarding: { ...prefs.onboarding, index: 0 } }); router.push("/onboarding"); }}>Retake assessment</Button><Link className="inline-flex min-h-11 items-center rounded-xl px-4 font-semibold text-muted hover:text-ink" href="/onboarding?step=results">View my plan draft</Link></div>
      </Card>
      <Card className="flex flex-col gap-3"><SectionHeader title="AI coach" sub={status ? (status.allowed ? "Live AI enabled (local development)" : status.configured ? "Configured but disabled" : "Not configured") : "Status unavailable offline"} />
        {status && <p className="text-sm text-muted">{status.reason}</p>}
        <p className="text-sm text-muted">Which data a live AI coach may use. All off by default; you still choose per conversation, and you can preview the exact text before it's sent.</p>
        {(Object.keys(CONTEXT_LABEL) as ContextKey[]).map((k) => (
          <Switch key={k} checked={prefs.aiConsent[k]} onChange={(v) => set({ aiConsent: { ...prefs.aiConsent, [k]: v } }, v ? `${CONTEXT_LABEL[k]} may be shared` : `${CONTEXT_LABEL[k]} will not be shared`)} label={CONTEXT_LABEL[k]} description={k === "journal" ? "Private writing. Only enable if you're comfortable sending entries to the AI provider." : k === "wellness" ? "Sleep, energy, mood and soreness check-ins." : undefined} />))}
      </Card>
      <CloudCard />
      <PushCard />
      <p className="text-xs text-muted">Backups: <Link href="/data" className="font-semibold text-flash">Data</Link> exports everything to a file, with or without cloud sync.</p>
    </div>
  );
}

function ProfileCard({ prefs, save }: { prefs: Preferences; save: (p: Partial<Preferences>) => Promise<void> }) {
  const [name, setName] = useState(prefs.name); const [appName, setAppName] = useState(prefs.appName);
  return (
    <Card className="flex flex-col gap-4"><SectionHeader title="Profile" />
      <Field label="Your name" htmlFor="s-name"><Input id="s-name" value={name} maxLength={60} onChange={(e) => setName(e.target.value)} onBlur={() => name !== prefs.name && save({ name: name.trim() })} /></Field>
      <Field label="App name" htmlFor="s-app" hint="Shown in the header."><Input id="s-app" value={appName} maxLength={40} onChange={(e) => setAppName(e.target.value)} onBlur={() => appName.trim() && appName !== prefs.appName && save({ appName: appName.trim() })} /></Field>
    </Card>
  );
}
