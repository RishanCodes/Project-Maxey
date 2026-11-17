"use client";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { forwardRef, useId, useRef, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";

export const cx = (...c: Array<string | false | null | undefined>) => c.filter(Boolean).join(" ");

type Variant = "primary" | "secondary" | "ghost" | "danger";
export const Button = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: "md" | "sm" | "lg"; block?: boolean }>(
  function Button({ variant = "secondary", size = "md", block, className, ...rest }, ref) {
    return (
      <button ref={ref} {...rest} className={cx(
        "inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-[background,transform,opacity] duration-150 active:scale-[.98] disabled:opacity-40 disabled:pointer-events-none select-none",
        size === "sm" ? "min-h-9 px-3 text-sm" : size === "lg" ? "min-h-13 px-5 text-base" : "min-h-11 px-4 text-[15px]",
        variant === "primary" && "bg-flash text-obsidian hover:bg-flash-hi",
        variant === "secondary" && "bg-subtle text-ink hover:bg-line",
        variant === "ghost" && "bg-transparent text-muted hover:text-ink hover:bg-graphite",
        variant === "danger" && "bg-transparent text-red border border-red/50 hover:bg-red/10",
        block && "w-full", className)} />
    );
  });

export function IconButton({ label, children, className, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button aria-label={label} title={label} {...rest} className={cx("inline-flex size-11 shrink-0 items-center justify-center rounded-xl text-muted hover:text-ink hover:bg-graphite active:scale-95 transition", className)}>
      {children}
    </button>
  );
}

export function Card({ children, className, as: As = "section", ...rest }: { children: ReactNode; className?: string; as?: "section" | "div" | "article" } & Record<string, unknown>) {
  return <As {...rest} className={cx("rounded-[var(--radius-card)] border border-line/70 bg-graphite/60 p-5", className)}>{children}</As>;
}

export function SectionHeader({ title, action, sub }: { title: string; action?: ReactNode; sub?: ReactNode }) {
  return (
    <div className="mb-3 flex items-end justify-between gap-3">
      <div className="min-w-0"><h2 className="text-lg font-semibold tracking-tight">{title}</h2>{sub && <p className="text-sm text-muted">{sub}</p>}</div>
      {action}
    </div>
  );
}

export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cx("text-[11px] font-semibold uppercase tracking-[0.2em] text-muted", className)}>{children}</p>;
}

export function Field({ label, error, hint, children, htmlFor }: { label: string; error?: string; hint?: string; children: ReactNode; htmlFor: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-sm font-medium text-muted">{label}</label>
      {children}
      {hint && !error && <p className="text-xs text-muted">{hint}</p>}
      {error && <p role="alert" className="text-xs text-red">{error}</p>}
    </div>
  );
}

const inputCls = "w-full min-h-11 rounded-xl border border-line bg-elevated px-3.5 text-[16px] text-ink placeholder:text-muted/60 outline-none focus:border-flash transition";
export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }>(function Input({ className, invalid, ...rest }, ref) {
  return <input ref={ref} {...rest} aria-invalid={invalid || undefined} className={cx(inputCls, invalid && "border-red", className)} />;
});
export function TextArea({ className, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...rest} className={cx(inputCls, "min-h-24 py-2.5", className)} />;
}
export function Select({ className, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...rest} className={cx(inputCls, "appearance-none pr-8", className)}>{children}</select>;
}

export function Chip({ selected, children, className, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { selected?: boolean }) {
  return (
    <button type="button" aria-pressed={!!selected} {...rest} className={cx(
      "min-h-10 rounded-full border px-3.5 text-sm font-medium transition active:scale-[.97]",
      selected ? "border-flash bg-flash/12 text-ink" : "border-line bg-elevated text-muted hover:text-ink", className)}>
      {children}
    </button>
  );
}

export function Segmented<T extends string>({ value, options, onChange, label }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void; label: string }) {
  return (
    <div role="tablist" aria-label={label} className="flex gap-1 rounded-xl border border-line bg-elevated p-1">
      {options.map((o) => (
        <button key={o.value} role="tab" aria-selected={value === o.value} onClick={() => onChange(o.value)}
          className={cx("min-h-9 flex-1 rounded-lg px-3 text-sm font-semibold transition", value === o.value ? "bg-subtle text-ink" : "text-muted hover:text-ink")}>{o.label}</button>
      ))}
    </div>
  );
}

export function Switch({ checked, onChange, label, description }: { checked: boolean; onChange: (v: boolean) => void; label: string; description?: string }) {
  const id = useId();
  return (
    <div className="flex items-center justify-between gap-4 py-2">
      <div className="min-w-0"><p id={id} className="text-[15px] font-medium">{label}</p>{description && <p className="text-sm text-muted">{description}</p>}</div>
      <button role="switch" aria-checked={checked} aria-labelledby={id} onClick={() => onChange(!checked)}
        className={cx("relative h-7 w-12 shrink-0 rounded-full border transition", checked ? "border-flash bg-flash" : "border-line bg-subtle")}>
        <span className={cx("absolute top-0.5 size-5.5 rounded-full transition-transform", checked ? "translate-x-5.5 bg-obsidian" : "translate-x-0.5 bg-muted")} />
      </button>
    </div>
  );
}

export function ProgressBar({ value, label, accent = true }: { value: number; label: string; accent?: boolean }) {
  const v = Math.max(0, Math.min(1, value));
  return (
    <div role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(v * 100)} className="h-1.5 w-full overflow-hidden rounded-full bg-subtle">
      <div className={cx("h-full rounded-full transition-[width] duration-500", accent ? "bg-flash" : "bg-done")} style={{ width: `${v * 100}%` }} />
    </div>
  );
}

export function EmptyState({ icon, title, body, action }: { icon?: ReactNode; title: string; body: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-[var(--radius-card)] border border-dashed border-line px-6 py-10 text-center">
      {icon && <div className="text-muted">{icon}</div>}
      <p className="text-base font-semibold">{title}</p>
      <p className="max-w-sm text-sm text-muted">{body}</p>
      {action}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) { return <div aria-hidden="true" className={cx("skeleton rounded-xl", className)} />; }

/** Accessible sheet: bottom sheet on phones, centered dialog on larger screens. Focus is trapped and restored. */
export function Sheet({ open, onOpenChange, title, description, children, footer }: { open: boolean; onOpenChange: (o: boolean) => void; title: string; description?: string; children: ReactNode; footer?: ReactNode }) {
  // Sheets are opened programmatically (not via Dialog.Trigger), so remember the opener and return focus to it.
  const opener = useRef<HTMLElement | null>(null);
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fade-in fixed inset-0 z-40 bg-black/70" />
        <Dialog.Content
          onOpenAutoFocus={() => { opener.current = document.activeElement instanceof HTMLElement && document.activeElement !== document.body ? document.activeElement : null; }}
          onCloseAutoFocus={(e) => { if (opener.current?.isConnected) { e.preventDefault(); opener.current.focus(); } }}
          className="sheet-in fixed inset-x-0 bottom-0 z-50 flex max-h-[92dvh] flex-col rounded-t-3xl border border-line bg-elevated pb-[env(safe-area-inset-bottom)] outline-none sm:inset-auto sm:left-1/2 sm:top-1/2 sm:w-[560px] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-3xl sm:pb-0">
          <div className="flex items-start gap-3 px-5 pt-5 pb-3">
            <div className="min-w-0 flex-1">
              <Dialog.Title className="text-lg font-semibold tracking-tight">{title}</Dialog.Title>
              {description ? <Dialog.Description className="text-sm text-muted">{description}</Dialog.Description> : <Dialog.Description className="sr-only">{title}</Dialog.Description>}
            </div>
            <Dialog.Close asChild><IconButton label="Close"><X size={20} /></IconButton></Dialog.Close>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-5">{children}</div>
          {footer && <div className="flex gap-2 border-t border-line px-5 py-3">{footer}</div>}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export function ConfirmSheet({ open, onOpenChange, title, body, confirmLabel, onConfirm, danger }: { open: boolean; onOpenChange: (o: boolean) => void; title: string; body: string; confirmLabel: string; onConfirm: () => void; danger?: boolean }) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title={title} footer={<>
      <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
      <Button variant={danger ? "danger" : "primary"} className="flex-1" onClick={() => { onConfirm(); onOpenChange(false); }}>{confirmLabel}</Button>
    </>}>
      <p className="text-[15px] text-muted">{body}</p>
    </Sheet>
  );
}
