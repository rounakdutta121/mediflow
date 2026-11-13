"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell, CheckCheck, Trash2 } from "lucide-react";
import { formatDateTime } from "@/lib/utils";

type NotificationItem = {
  _id: string;
  title: string;
  message: string;
  type: string;
  href?: string;
  isRead: boolean;
  createdAt: string;
};

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const panelRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/notifications?limit=20");
    if (!res.ok) return;
    const data = await res.json();
    setItems(data.items || []);
    setUnreadCount(data.unreadCount || 0);
  }, []);

  useEffect(() => {
    load();
    const timer = setInterval(load, 15000);
    return () => clearInterval(timer);
  }, [load]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!panelRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  async function markRead(id: string) {
    await fetch(`/api/notifications/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
    });
    load();
  }

  async function markAllRead() {
    await fetch("/api/notifications/read-all", { method: "POST" });
    load();
  }

  async function removeNotification(id: string) {
    await fetch(`/api/notifications/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        className="relative cursor-pointer rounded-xl p-2 text-[var(--muted)] transition-colors hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)]"
        aria-label="Notifications"
        onClick={() => {
          setOpen((v) => !v);
          load();
        }}
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-semibold text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-[60] mt-2 w-[min(380px,calc(100vw-1.5rem))] overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-md)]">
          <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
            <p className="text-sm font-semibold text-[var(--foreground)]">
              Notifications
            </p>
            <button
              type="button"
              onClick={markAllRead}
              className="inline-flex cursor-pointer items-center gap-1 text-xs text-[var(--brand)] hover:underline"
            >
              <CheckCheck className="h-3.5 w-3.5" />
              Mark all read
            </button>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {items.length === 0 && (
              <p className="p-6 text-center text-sm text-[var(--muted)]">
                No notifications yet
              </p>
            )}
            {items.map((n) => (
              <div
                key={n._id}
                className={`border-b border-[var(--border)] px-4 py-3 ${
                  n.isRead
                    ? "bg-[var(--surface)]"
                    : "bg-[color-mix(in_oklab,var(--brand)_10%,transparent)]"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    {n.href ? (
                      <Link
                        href={n.href}
                        onClick={() => {
                          markRead(n._id);
                          setOpen(false);
                        }}
                        className="block"
                      >
                        <p className="text-sm font-medium text-[var(--foreground)]">
                          {n.title}
                        </p>
                        <p className="mt-0.5 text-xs text-[var(--muted)]">
                          {n.message}
                        </p>
                      </Link>
                    ) : (
                      <button
                        type="button"
                        className="block w-full cursor-pointer text-left"
                        onClick={() => markRead(n._id)}
                      >
                        <p className="text-sm font-medium text-[var(--foreground)]">
                          {n.title}
                        </p>
                        <p className="mt-0.5 text-xs text-[var(--muted)]">
                          {n.message}
                        </p>
                      </button>
                    )}
                    <p className="mt-1 text-[11px] text-[var(--muted)]">
                      {formatDateTime(n.createdAt)}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="cursor-pointer rounded-lg p-1 text-[var(--muted)] hover:bg-[var(--surface-muted)] hover:text-rose-500"
                    aria-label="Delete notification"
                    onClick={() => removeNotification(n._id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
