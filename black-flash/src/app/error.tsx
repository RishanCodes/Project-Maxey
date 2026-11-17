"use client";
import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);
  return (
    <div className="flex flex-col items-start gap-4 py-10">
      <h1 className="text-2xl font-bold">Something went wrong on this screen</h1>
      <p className="text-muted">Your data is stored separately and has not been changed. Try again, or open another section.</p>
      <div className="flex gap-2"><Button variant="primary" onClick={reset}>Try again</Button><Link href="/data" className="inline-flex min-h-11 items-center rounded-xl bg-subtle px-4 font-semibold">Export a backup</Link></div>
    </div>
  );
}
