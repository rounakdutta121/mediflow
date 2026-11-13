import { Spinner } from "@/components/ui/spinner";

export function PageLoader({ label = "Loading…" }: { label?: string }) {
  return (
    <div
      className="flex min-h-[42vh] flex-col items-center justify-center gap-3 text-[var(--muted)]"
      role="status"
      aria-live="polite"
    >
      <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-sm)]">
        <Spinner className="text-[var(--brand)]" size="md" />
      </div>
      <p className="text-sm font-medium tracking-wide">{label}</p>
      <div className="mt-2 h-1 w-40 overflow-hidden rounded-full bg-[var(--surface-muted)]">
        <div className="mf-shimmer h-full w-full rounded-full" />
      </div>
    </div>
  );
}
