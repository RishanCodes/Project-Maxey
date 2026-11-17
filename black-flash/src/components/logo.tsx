/** Original angular flash mark (not derived from any brand logo). */
export function FlashMark({ size = 28, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" className={className}>
      <path d="M6 22 L19 7 L16.5 15 L26 11 L12 26 L15 18.5 Z" fill="#F6F7F9" />
      <path d="M15 18.5 L26 11 L12 26 Z" fill="#EC4553" opacity="0.95" />
    </svg>
  );
}

export function Wordmark({ name }: { name: string }) {
  return (
    <span className="flex items-center gap-3">
      <FlashMark />
      <span className="h-5 w-px bg-line" aria-hidden="true" />
      <span className="text-[13px] font-semibold tracking-[0.32em] uppercase">{name}</span>
    </span>
  );
}
