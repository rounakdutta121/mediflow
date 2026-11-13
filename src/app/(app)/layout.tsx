import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { LiveSync } from "@/components/live-sync";
import type { Role } from "@/lib/permissions";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <div className="flex min-h-dvh bg-[var(--background)]">
      <LiveSync />
      <div className="no-print">
        <Sidebar role={session.user.role as Role} />
      </div>
      <div className="flex min-w-0 flex-1 flex-col app-mesh">
        <div className="no-print">
          <Topbar
            name={session.user.name}
            role={session.user.role as Role}
            email={session.user.email}
          />
        </div>
        <main className="flex-1 overflow-auto p-4 print:overflow-visible print:p-0 sm:p-6 lg:p-8">
          <div className="mx-auto w-full max-w-[1400px] print:max-w-none">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
