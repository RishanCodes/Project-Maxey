"use client";
import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { BookOpen, Lock, Plus, Search } from "lucide-react";
import { Button, ConfirmSheet, EmptyState, Field, Input, Sheet, Skeleton, TextArea } from "@/components/ui";
import { useToast } from "@/components/toast";
import { usePrefs, useToday } from "@/hooks/use-data";
import { getDb } from "@/lib/db";
import { deleteJournal, saveJournal } from "@/lib/repo";
import { relativeDay } from "@/lib/dates";
import type { JournalEntry } from "@/lib/schema";

export default function JournalPage() {
  const prefs = usePrefs(); const { today } = useToday(prefs?.timezone); const toast = useToast();
  const entries = useLiveQuery(() => getDb().journal.orderBy("date").reverse().toArray(), []);
  const [q, setQ] = useState(""); const [edit, setEdit] = useState<JournalEntry | "new" | null>(null);
  const [date, setDate] = useState(today); const [title, setTitle] = useState(""); const [body, setBody] = useState(""); const [tags, setTags] = useState(""); const [error, setError] = useState(""); const [confirm, setConfirm] = useState(false);
  const shown = useMemo(() => (entries ?? []).filter((e) => !q.trim() || `${e.title} ${e.body} ${e.tags.join(" ")}`.toLowerCase().includes(q.trim().toLowerCase())), [entries, q]);
  const open = (e: JournalEntry | "new") => { setEdit(e); const x = e === "new" ? undefined : e; setDate(x?.date ?? today); setTitle(x?.title ?? ""); setBody(x?.body ?? ""); setTags(x?.tags.join(", ") ?? ""); setError(""); };
  async function save() {
    if (!title.trim() && !body.trim()) return setError("Write something, or close without saving.");
    await saveJournal({ id: edit && edit !== "new" ? edit.id : undefined, date, title: title.trim(), body, tags: tags.split(",").map((t) => t.trim()).filter(Boolean).slice(0, 12) });
    toast("Entry saved"); setEdit(null);
  }
  if (!entries) return <Skeleton className="h-64" />;
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-end justify-between"><h1 className="text-3xl font-bold tracking-tight">Journal</h1><Button variant="primary" size="sm" onClick={() => open("new")}><Plus size={16} />New entry</Button></div>
      <p className="flex items-center gap-2 text-sm text-muted"><Lock size={14} aria-hidden="true" />Private. Stored only on this device and never sent to any AI unless you turn that on in Settings.</p>
      {entries.length > 0 && <div className="relative"><Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" aria-hidden="true" /><Input aria-label="Search journal" placeholder="Search entries and tags" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" /></div>}
      {entries.length === 0 ? <EmptyState icon={<BookOpen size={28} />} title="No entries yet" body="A few lines after practice or at the end of the week is enough. What went well? What will you change?" action={<Button variant="primary" onClick={() => open("new")}>Write the first entry</Button>} /> :
        shown.length === 0 ? <p className="text-sm text-muted">No entries match "{q}".</p> :
        <ul className="flex flex-col gap-2">{shown.map((e) => (
          <li key={e.id}><button onClick={() => open(e)} className="w-full rounded-2xl border border-line/70 bg-graphite/60 px-4 py-3 text-left">
            <span className="text-xs text-muted">{relativeDay(e.date, today)}{e.tags.length ? ` · ${e.tags.join(", ")}` : ""}</span>
            <b className="block">{e.title || "Untitled"}</b><span className="line-clamp-2 text-sm text-muted">{e.body}</span></button></li>))}</ul>}
      <Sheet open={!!edit} onOpenChange={(o) => !o && setEdit(null)} title={edit === "new" ? "New entry" : "Edit entry"} footer={<>
        {edit && edit !== "new" && <Button variant="danger" onClick={() => setConfirm(true)}>Delete</Button>}
        <Button variant="primary" className="flex-1" onClick={save}>Save</Button></>}>
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3"><Field label="Date" htmlFor="j-date"><Input id="j-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field><Field label="Tags" htmlFor="j-tags"><Input id="j-tags" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="game, school" /></Field></div>
          <Field label="Title" htmlFor="j-title"><Input id="j-title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} /></Field>
          <Field label="Entry" htmlFor="j-body" error={error}><TextArea id="j-body" value={body} onChange={(e) => setBody(e.target.value)} className="min-h-56" maxLength={20000} /></Field>
        </div>
      </Sheet>
      {edit && edit !== "new" && <ConfirmSheet open={confirm} onOpenChange={setConfirm} danger title="Delete this entry?" body="This can't be undone." confirmLabel="Delete entry" onConfirm={async () => { await deleteJournal(edit.id); setEdit(null); toast("Entry deleted"); }} />}
    </div>
  );
}
