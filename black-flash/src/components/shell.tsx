"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { BookOpen, ChartNoAxesColumn, Database, Dumbbell, Flame, House, CalendarDays, Menu, MessageCircle, Moon, Plus, Settings, Target, Timer, WifiOff } from "lucide-react";
import { IconButton, Sheet, cx } from "./ui";
import { Wordmark } from "./logo";
import { usePrefs } from "@/hooks/use-data";
import { QuickAdd } from "./quick-add";

const TABS = [
  { href: "/", label: "Today", icon: House },
  { href: "/plan", label: "Plan", icon: CalendarDays },
  { href: "/coach", label: "Coach", icon: MessageCircle },
  { href: "/growth", label: "Growth", icon: ChartNoAxesColumn },
];
const MORE = [
  { href: "/program", label: "90 Days", icon: Flame },
  { href: "/training", label: "Training", icon: Dumbbell },
  { href: "/wellness", label: "Recovery", icon: Moon },
  { href: "/goals", label: "Goals", icon: Target },
  { href: "/focus", label: "Focus", icon: Timer },
  { href: "/journal", label: "Journal", icon: BookOpen },
  { href: "/settings", label: "Settings", icon: Settings },
  { href: "/data", label: "Data", icon: Database },
];

function useOnline() {
  const [on, setOn] = useState(true);
  useEffect(() => {
    const u = () => setOn(navigator.onLine);
    u(); window.addEventListener("online", u); window.addEventListener("offline", u);
    return () => { window.removeEventListener("online", u); window.removeEventListener("offline", u); };
  }, []);
  return on;
}

const isActive = (path: string, href: string) => (href === "/" ? path === "/" : path.startsWith(href));

export function AppShell({ children }: { children: ReactNode }) {
  const path = usePathname() || "/";
  const prefs = usePrefs();
  const [menu, setMenu] = useState(false);
  const [add, setAdd] = useState(false);
  const online = useOnline();
  if (path.startsWith("/onboarding")) return <>{children}</>;
  const name = prefs?.appName || "BLACK FLASH";
  return (
    <div className="min-h-dvh lg:flex">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[70] focus:rounded-lg focus:bg-flash focus:px-3 focus:py-2 focus:text-obsidian">Skip to content</a>
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col gap-1 border-r border-line/70 px-4 py-6 lg:flex">
        <div className="mb-6 px-2"><Wordmark name={name} /></div>
        <nav aria-label="Main" className="flex flex-col gap-1">
          {[...TABS, ...MORE].map((t) => (
            <Link key={t.href} href={t.href} aria-current={isActive(path, t.href) ? "page" : undefined}
              className={cx("flex min-h-11 items-center gap-3 rounded-xl px-3 text-[15px] font-medium transition", isActive(path, t.href) ? "bg-graphite text-ink" : "text-muted hover:bg-graphite/60 hover:text-ink")}>
              <t.icon size={18} className={isActive(path, t.href) ? "text-flash" : ""} aria-hidden="true" />{t.label}
            </Link>
          ))}
        </nav>
        <button onClick={() => setAdd(true)} className="mt-6 flex min-h-11 items-center justify-center gap-2 rounded-xl bg-flash font-semibold text-obsidian hover:bg-flash-hi"><Plus size={18} />Quick add</button>
      </aside>

      <div className="min-w-0 flex-1">
        {/* Mobile header */}
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-line/50 bg-obsidian/90 px-4 pt-[env(safe-area-inset-top)] backdrop-blur lg:hidden">
          <div className="flex h-14 items-center"><Wordmark name={name} /></div>
          <div className="flex items-center">
            <IconButton label="Quick add" onClick={() => setAdd(true)}><Plus size={22} /></IconButton>
            <IconButton label="More sections" onClick={() => setMenu(true)}><Menu size={22} /></IconButton>
          </div>
        </header>
        {!online && <p className="flex items-center justify-center gap-2 bg-subtle px-4 py-2 text-xs text-muted"><WifiOff size={14} aria-hidden="true" /> Offline. Everything you do is saved on this device.</p>}
        <main id="main" className="mx-auto w-full max-w-2xl px-4 pb-[calc(96px+env(safe-area-inset-bottom))] pt-5 lg:max-w-3xl lg:px-8 lg:pb-12 lg:pt-10">{children}</main>
      </div>

      {/* Mobile bottom nav */}
      <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-30 border-t border-line/60 bg-obsidian/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
        <div className="mx-auto grid max-w-2xl grid-cols-4">
          {TABS.map((t) => {
            const on = isActive(path, t.href);
            return (
              <Link key={t.href} href={t.href} aria-current={on ? "page" : undefined} className={cx("relative flex min-h-16 flex-col items-center justify-center gap-1 text-[11px] font-semibold", on ? "text-flash" : "text-muted")}>
                <t.icon size={22} aria-hidden="true" />{t.label}
                {on && <span className="absolute bottom-1.5 h-0.5 w-6 rounded-full bg-flash" aria-hidden="true" />}
              </Link>
            );
          })}
        </div>
      </nav>

      <Sheet open={menu} onOpenChange={setMenu} title="More">
        <nav aria-label="More sections" className="grid grid-cols-2 gap-2">
          {MORE.map((t) => (
            <Link key={t.href} href={t.href} onClick={() => setMenu(false)} className="flex min-h-14 items-center gap-3 rounded-2xl border border-line bg-graphite/60 px-4 font-medium">
              <t.icon size={18} className="text-muted" aria-hidden="true" />{t.label}
            </Link>
          ))}
        </nav>
      </Sheet>
      <QuickAdd open={add} onOpenChange={setAdd} />
    </div>
  );
}
