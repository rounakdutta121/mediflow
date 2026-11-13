"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  BedDouble,
  ClipboardList,
  FileText,
  FlaskConical,
  LayoutDashboard,
  Pill,
  Receipt,
  Settings,
  Shield,
  Stethoscope,
  Users,
  CalendarDays,
  ListOrdered,
  Building2,
  UserCog,
  BarChart3,
  CircleHelp,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { hasPermission, type Role } from "@/lib/permissions";
import { useEffect, useState } from "react";
import { BrandLogo } from "@/components/brand-logo";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  permission?: Parameters<typeof hasPermission>[1];
  comingSoon?: boolean;
};

const mainNav: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, permission: "dashboard:view" },
  { href: "/patients", label: "Patients", icon: Users, permission: "patients:read" },
  { href: "/appointments", label: "Appointments", icon: CalendarDays, permission: "appointments:read" },
  { href: "/queue", label: "Queue", icon: ListOrdered, permission: "queue:manage" },
  { href: "/clinical", label: "Clinical / EMR", icon: Stethoscope, permission: "clinical:read" },
  { href: "/billing", label: "Billing", icon: Receipt, permission: "billing:read" },
  { href: "/staff", label: "Doctors & Staff", icon: UserCog, permission: "staff:read" },
  { href: "/departments", label: "Departments", icon: Building2, permission: "departments:read" },
  { href: "/reports", label: "Reports", icon: BarChart3, permission: "reports:view" },
  { href: "/audit", label: "Audit", icon: Shield, permission: "audit:view" },
  { href: "/settings", label: "Settings", icon: Settings, permission: "settings:manage" },
  { href: "/help", label: "Help", icon: CircleHelp, permission: "dashboard:view" },
];

const laterNav: NavItem[] = [
  { href: "/coming-soon/admission", label: "Admission & Beds", icon: BedDouble, comingSoon: true },
  { href: "/coming-soon/laboratory", label: "Laboratory", icon: FlaskConical, comingSoon: true },
  { href: "/coming-soon/pharmacy", label: "Pharmacy", icon: Pill, comingSoon: true },
  { href: "/coming-soon/insurance", label: "Insurance", icon: FileText, comingSoon: true },
  { href: "/coming-soon/nursing", label: "Nursing", icon: ClipboardList, comingSoon: true },
];

function NavLinks({
  role,
  collapsed,
  onNavigate,
}: {
  role: Role;
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const visible = mainNav.filter(
    (item) => !item.permission || hasPermission(role, item.permission)
  );

  return (
    <nav className="flex-1 space-y-1 overflow-y-auto p-3">
      {visible.map((item) => {
        const active =
          pathname === item.href || pathname.startsWith(`${item.href}/`);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all duration-200",
              active
                ? "bg-[var(--sidebar-active)] text-white shadow-[inset_0_0_0_1px_rgba(34,211,238,0.25)]"
                : "text-[var(--sidebar-muted)] hover:bg-white/5 hover:text-white"
            )}
            title={item.label}
          >
            {active && (
              <span className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-cyan-400" />
            )}
            <Icon className={cn("h-4 w-4 shrink-0", active && "text-cyan-300")} />
            {!collapsed && <span className="truncate">{item.label}</span>}
          </Link>
        );
      })}

      {!collapsed && (
        <p className="px-3 pt-5 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/35">
          Later phases
        </p>
      )}
      {laterNav.map((item) => {
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-white/35 transition-colors hover:bg-white/5 hover:text-white/60"
            title={`${item.label} (coming soon)`}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {!collapsed && <span className="truncate">{item.label}</span>}
          </Link>
        );
      })}
    </nav>
  );
}

export function Sidebar({ role }: { role: Role }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const reduce = useReducedMotion();

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  return (
    <>
      <button
        type="button"
        className="fixed left-3 top-3 z-50 flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-md)] lg:hidden"
        aria-label="Open menu"
        onClick={() => setMobileOpen(true)}
      >
        <Menu className="h-5 w-5" />
      </button>

      <aside
        className={cn(
          "sticky top-0 z-30 hidden h-dvh shrink-0 flex-col border-r border-white/10 bg-[var(--sidebar)] text-[var(--sidebar-fg)] transition-[width] duration-300 lg:flex",
          collapsed ? "w-[76px]" : "w-64"
        )}
      >
        <div className="flex items-center gap-3 border-b border-white/10 px-4 py-4">
          {collapsed ? (
            <BrandLogo size={36} withWordmark={false} />
          ) : (
            <BrandLogo size={36} inverted />
          )}
        </div>
        <NavLinks role={role} collapsed={collapsed} />
        <button
          type="button"
          onClick={() => setCollapsed((v) => !v)}
          className="flex cursor-pointer items-center justify-center gap-2 border-t border-white/10 px-3 py-3 text-xs text-white/55 transition-colors hover:bg-white/5"
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
          {!collapsed && "Collapse"}
        </button>
      </aside>

      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.button
              type="button"
              aria-label="Close menu overlay"
              className="fixed inset-0 z-50 bg-black/55 backdrop-blur-sm lg:hidden"
              initial={reduce ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              className="fixed inset-y-0 left-0 z-50 flex w-[min(20rem,88vw)] flex-col bg-[var(--sidebar)] text-[var(--sidebar-fg)] shadow-2xl lg:hidden"
              initial={reduce ? false : { x: -28, opacity: 0.8 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -24, opacity: 0 }}
              transition={{ type: "spring", stiffness: 380, damping: 34 }}
            >
              <div className="flex items-center justify-between border-b border-white/10 px-4 py-4">
                <BrandLogo size={36} inverted />
                <button
                  type="button"
                  className="rounded-lg p-2 text-white/70 hover:bg-white/10"
                  aria-label="Close menu"
                  onClick={() => setMobileOpen(false)}
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <NavLinks
                role={role}
                collapsed={false}
                onNavigate={() => setMobileOpen(false)}
              />
              <div className="border-t border-white/10 p-4 text-xs text-white/40">
                <Activity className="mb-1 inline h-3.5 w-3.5" /> MediFlow Phase 1
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
