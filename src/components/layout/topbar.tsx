"use client";

import { signOut } from "next-auth/react";
import { LogOut, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NotificationBell } from "@/components/layout/notification-bell";
import { ThemeToggle } from "@/components/theme-toggle";
import type { Role } from "@/lib/permissions";

export function Topbar({
  name,
  role,
  email,
}: {
  name: string;
  role: Role;
  email: string;
}) {
  return (
    <header className="sticky top-0 z-40 flex h-14 items-center justify-between gap-3 border-b border-[var(--border)] bg-[color-mix(in_oklab,var(--surface)_86%,transparent)] px-4 backdrop-blur-xl sm:px-6 lg:pl-6">
      <div className="ml-12 flex min-w-0 max-w-xl flex-1 items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-2 text-sm text-[var(--muted)] lg:ml-0">
        <Search className="h-4 w-4 shrink-0" />
        <span className="truncate">Search patients, appointments, invoices…</span>
      </div>

      <div className="flex shrink-0 items-center gap-1.5 sm:gap-3">
        <ThemeToggle />
        <NotificationBell />
        <div className="hidden text-right sm:block">
          <p className="text-sm font-semibold text-[var(--foreground)]">{name}</p>
          <p className="max-w-[14rem] truncate text-[11px] text-[var(--muted)]">
            {role.replaceAll("_", " ")} · {email}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="hidden sm:inline-flex"
          onClick={() => signOut({ callbackUrl: "/login" })}
        >
          <LogOut className="h-3.5 w-3.5" />
          Sign out
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="sm:hidden"
          aria-label="Sign out"
          onClick={() => signOut({ callbackUrl: "/login" })}
        >
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}
