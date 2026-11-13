import { cn } from "@/lib/utils";

export function BrandLogo({
  size = 36,
  withWordmark = true,
  className,
  inverted = false,
}: {
  size?: number;
  withWordmark?: boolean;
  className?: string;
  inverted?: boolean;
}) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/brand/logo.svg"
        alt="MediFlow"
        width={size}
        height={size}
        className="shrink-0 rounded-xl shadow-sm"
      />
      {withWordmark && (
        <div className="min-w-0 leading-tight">
          <p
            className={cn(
              "font-display text-sm font-semibold tracking-wide",
              inverted ? "text-white" : "text-foreground"
            )}
          >
            MediFlow
          </p>
          <p
            className={cn(
              "text-[10px] font-medium uppercase tracking-[0.14em]",
              inverted ? "text-white/55" : "text-muted"
            )}
          >
            Hospital CRM
          </p>
        </div>
      )}
    </div>
  );
}
