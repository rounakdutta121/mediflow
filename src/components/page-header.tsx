import Link from "next/link";
import { Button } from "@/components/ui/button";

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: { href: string; label: string };
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="font-display text-2xl font-semibold tracking-tight text-[var(--foreground)] sm:text-[1.75rem]">
          {title}
        </h1>
        {description && (
          <p className="mt-1.5 max-w-2xl text-sm text-[var(--muted)]">
            {description}
          </p>
        )}
      </div>
      {action && (
        <Button asChild className="w-full shrink-0 sm:w-auto">
          <Link href={action.href}>{action.label}</Link>
        </Button>
      )}
    </div>
  );
}
