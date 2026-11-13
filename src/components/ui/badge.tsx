import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-lg px-2 py-0.5 text-xs font-semibold capitalize",
  {
    variants: {
      variant: {
        default:
          "bg-[var(--surface-muted)] text-[var(--foreground)]",
        success:
          "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
        warning:
          "bg-amber-500/15 text-amber-800 dark:text-amber-300",
        danger: "bg-rose-500/15 text-rose-700 dark:text-rose-300",
        info: "bg-sky-500/15 text-sky-800 dark:text-sky-300",
        brand: "bg-cyan-500/15 text-cyan-800 dark:text-cyan-300",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

export function Badge({
  className,
  variant,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof badgeVariants>) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}
