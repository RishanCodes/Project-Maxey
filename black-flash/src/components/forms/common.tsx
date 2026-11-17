"use client";
import { Chip } from "../ui";
import { DAY_SHORT } from "@/lib/dates";

export function ScaleChips({ value, onChange, max, label, lowLabel, highLabel }: { value: number | undefined; onChange: (v: number | undefined) => void; max: number; label: string; lowLabel?: string; highLabel?: string }) {
  return (
    <fieldset className="flex flex-col gap-1.5">
      <legend className="mb-1.5 text-sm font-medium text-muted">{label} <span className="font-normal">(optional)</span></legend>
      <div className="flex flex-wrap gap-1.5">
        {Array.from({ length: max }, (_, i) => i + 1).map((n) => (
          <Chip key={n} selected={value === n} onClick={() => onChange(value === n ? undefined : n)} className="min-w-10 px-0" aria-label={`${label} ${n} of ${max}`}>{n}</Chip>
        ))}
      </div>
      {(lowLabel || highLabel) && <div className="flex justify-between text-xs text-muted"><span>{lowLabel}</span><span>{highLabel}</span></div>}
    </fieldset>
  );
}

export function DayPicker({ value, onChange, label }: { value: number[]; onChange: (v: number[]) => void; label: string }) {
  return (
    <fieldset>
      <legend className="mb-1.5 text-sm font-medium text-muted">{label}</legend>
      <div className="flex flex-wrap gap-1.5">
        {[1, 2, 3, 4, 5, 6, 0].map((d) => (
          <Chip key={d} selected={value.includes(d)} onClick={() => onChange(value.includes(d) ? value.filter((x) => x !== d) : [...value, d])} className="min-w-12 px-2">{DAY_SHORT[d]}</Chip>
        ))}
      </div>
    </fieldset>
  );
}

export const numOrUndef = (s: string) => (s.trim() === "" || Number.isNaN(Number(s)) ? undefined : Number(s));
