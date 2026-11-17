"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Download, HardDrive, Upload } from "lucide-react";
import { Button, Card, ConfirmSheet, Field, Input, Segmented, SectionHeader } from "@/components/ui";
import { useToast } from "@/components/toast";
import { exportBackup, importBackup, parseBackup, type ParseResult } from "@/lib/backup";
import { deleteAllData, getPrefs } from "@/lib/repo";

export default function DataPage() {
  const toast = useToast();
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [parsed, setParsed] = useState<ParseResult | null>(null); const [mode, setMode] = useState<"merge" | "replace">("merge");
  const [confirmImport, setConfirmImport] = useState(false); const [confirmDelete, setConfirmDelete] = useState(false); const [typed, setTyped] = useState("");
  const [persisted, setPersisted] = useState<boolean | null>(null); const [usage, setUsage] = useState<string>("");
  useEffect(() => {
    navigator.storage?.persisted?.().then(setPersisted).catch(() => {});
    navigator.storage?.estimate?.().then((e) => e.usage !== undefined && setUsage(`${(e.usage / 1024).toFixed(0)} KB used`)).catch(() => {});
  }, []);
  async function download() {
    const file = await exportBackup();
    const blob = new Blob([JSON.stringify(file, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `black-flash-backup-${file.exportedAt.slice(0, 10)}.json`; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast("Backup downloaded");
  }
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-bold tracking-tight">Data</h1>
      <Card className="flex flex-col gap-3"><SectionHeader title="Where your data lives" />
        <p className="text-sm text-muted">Everything is stored in this browser's local database (IndexedDB) on this device. It survives refreshes and offline use, but not clearing site data, uninstalling the browser, or switching devices. Export a backup regularly.</p>
        <p className="flex items-center gap-2 text-sm"><HardDrive size={16} className="text-muted" aria-hidden="true" />{persisted ? "The browser has marked storage as persistent." : "Storage may be cleared by the browser under pressure."} {usage && <span className="text-muted">· {usage}</span>}</p>
        {!persisted && <Button size="sm" className="self-start" onClick={async () => { const ok = await navigator.storage?.persist?.(); setPersisted(!!ok); toast(ok ? "Storage marked persistent" : "The browser declined. Install the app to the home screen to improve this."); }}>Ask the browser to keep my data</Button>}
      </Card>
      <Card className="flex flex-col gap-3"><SectionHeader title="Export" sub="A versioned JSON file with every record and its id." />
        <Button variant="primary" className="self-start" onClick={download}><Download size={18} />Download backup</Button>
      </Card>
      <Card className="flex flex-col gap-3"><SectionHeader title="Import" sub="Files are validated before anything changes." />
        <input ref={fileRef} type="file" accept="application/json,.json" className="sr-only" aria-label="Choose backup file" onChange={async (e) => { const f = e.target.files?.[0]; if (!f) return; setParsed(parseBackup(await f.text())); e.target.value = ""; }} />
        <Button className="self-start" onClick={() => fileRef.current?.click()}><Upload size={18} />Choose backup file</Button>
        {parsed && !parsed.ok && <p role="alert" className="text-sm text-red">{parsed.error}</p>}
        {parsed?.ok && <>
          <p className="text-sm">Valid backup from {new Date(parsed.file.exportedAt).toLocaleString()}: {Object.entries(parsed.counts).filter(([, n]) => n).map(([k, n]) => `${n} ${k}`).join(", ") || "empty"}.</p>
          <Segmented label="Import mode" value={mode} onChange={setMode} options={[{ value: "merge", label: "Merge" }, { value: "replace", label: "Replace everything" }]} />
          <p className="text-xs text-muted">{mode === "merge" ? "Adds records that aren't here yet and keeps everything you have. Running it twice never duplicates." : "Deletes everything on this device first, then restores the backup exactly."}</p>
          <Button variant={mode === "replace" ? "danger" : "primary"} className="self-start" onClick={() => setConfirmImport(true)}>{mode === "merge" ? "Merge backup" : "Replace with backup"}</Button>
        </>}
      </Card>
      <Card className="flex flex-col gap-3 border-red/30"><SectionHeader title="Delete all data" />
        <p className="text-sm text-muted">Permanently erases everything stored by this app on this device. Export first if you might want it back.</p>
        <Field label='Type "delete" to enable' htmlFor="d-type"><Input id="d-type" value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" /></Field>
        <Button variant="danger" className="self-start" disabled={typed.trim().toLowerCase() !== "delete"} onClick={() => setConfirmDelete(true)}>Delete all data</Button>
      </Card>
      <ConfirmSheet open={confirmImport} onOpenChange={setConfirmImport} danger={mode === "replace"} title={mode === "replace" ? "Replace all data?" : "Merge this backup?"}
        body={mode === "replace" ? "Everything currently on this device is deleted and replaced by the backup. This can't be undone." : "New records from the backup are added. Existing records are kept unchanged."} confirmLabel={mode === "replace" ? "Replace" : "Merge"}
        onConfirm={async () => { if (!parsed?.ok) return; const r = await importBackup(parsed.file, mode); await getPrefs(); setParsed(null); toast(`Import done: ${r.added} added${r.skipped ? `, ${r.skipped} already here` : ""}`); }} />
      <ConfirmSheet open={confirmDelete} onOpenChange={setConfirmDelete} danger title="Delete everything?" body="All tasks, habits, training, check-ins, journal entries, goals and XP on this device are erased." confirmLabel="Delete everything"
        onConfirm={async () => { await deleteAllData(); await getPrefs(); setTyped(""); toast("All data deleted"); router.replace("/onboarding"); }} />
    </div>
  );
}
