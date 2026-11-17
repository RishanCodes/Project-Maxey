"use client";
import { Check } from "lucide-react";
import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";

type Toast = { id: number; message: string; undo?: () => void | Promise<void> };
type Show = (message: string, undo?: Toast["undo"], opts?: { after?: boolean }) => void;
const Ctx = createContext<Show>(() => {});
export const useToast = () => useContext(Ctx);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<Toast | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const current = useRef<Toast | null>(null);
  const queue = useRef<string[]>([]);
  const display = useCallback((first: Toast | null) => {
    if (timer.current) clearTimeout(timer.current);
    const showOne = (t: Toast | null) => {
      current.current = t; setToast(t);
      if (!t) return;
      timer.current = setTimeout(() => {
        const next = queue.current.shift();
        showOne(next ? { id: Date.now(), message: next } : null);
      }, t.undo ? 5000 : 2600);
    };
    showOne(first);
  }, []);
  /** `after`: wait until the toast on screen closes (so an Undo button isn't replaced). */
  const show = useCallback<Show>((message, undo, opts) => {
    if (opts?.after && current.current) { queue.current.push(message); return; }
    display({ id: Date.now(), message, undo });
  }, [display]);
  return (
    <Ctx.Provider value={show}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-[calc(84px+env(safe-area-inset-bottom))] z-[60] flex justify-center px-4 lg:bottom-6">
        {toast && (
          <div key={toast.id} className="sheet-in pointer-events-auto flex max-w-md items-center gap-3 rounded-2xl border border-line bg-subtle px-4 py-3 text-sm shadow-2xl">
            <Check size={16} className="pop text-flash" aria-hidden="true" />
            <span className="min-w-0 flex-1">{toast.message}</span>
            {toast.undo && <button className="min-h-9 rounded-lg px-2 font-semibold text-flash" onClick={async () => { const u = toast.undo; queue.current = []; display(null); await u?.(); }}>Undo</button>}
          </div>
        )}
      </div>
    </Ctx.Provider>
  );
}
