import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex flex-col items-start gap-4 py-10">
      <h1 className="text-2xl font-bold">Page not found</h1>
      <Link href="/" className="inline-flex min-h-11 items-center rounded-xl bg-flash px-4 font-semibold text-obsidian">Back to Today</Link>
    </div>
  );
}
