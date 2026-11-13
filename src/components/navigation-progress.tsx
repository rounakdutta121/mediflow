"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

/**
 * Thin top progress bar for App Router navigations.
 * Starts only after a short delay so fast transitions never flash.
 */
export function NavigationProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [visible, setVisible] = useState(false);
  const [width, setWidth] = useState(0);
  const delayRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const routeKey = `${pathname}?${searchParams?.toString() || ""}`;
  const prevRoute = useRef(routeKey);

  function clearTimers() {
    if (delayRef.current) clearTimeout(delayRef.current);
    if (tickRef.current) clearInterval(tickRef.current);
    delayRef.current = null;
    tickRef.current = null;
  }

  function finish() {
    clearTimers();
    setWidth(100);
    window.setTimeout(() => {
      setVisible(false);
      setWidth(0);
    }, 220);
  }

  function start() {
    clearTimers();
    // Avoid buggy flash on instant navigations
    delayRef.current = setTimeout(() => {
      setVisible(true);
      setWidth(12);
      tickRef.current = setInterval(() => {
        setWidth((w) => {
          if (w >= 88) return w;
          return w + Math.max(1, (90 - w) * 0.08);
        });
      }, 180);
    }, 140);
  }

  useEffect(() => {
    if (prevRoute.current !== routeKey) {
      prevRoute.current = routeKey;
      finish();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeKey]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      const target = e.target as HTMLElement | null;
      const anchor = target?.closest("a");
      if (!anchor) return;
      if (anchor.target && anchor.target !== "_self") return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:"))
        return;
      try {
        const url = new URL(href, window.location.href);
        if (url.origin !== window.location.origin) return;
        const next = `${url.pathname}?${url.searchParams.toString()}`;
        const current = `${window.location.pathname}?${window.location.search.replace(/^\?/, "")}`;
        if (next === current || next === `${window.location.pathname}?`) return;
        start();
      } catch {
        // ignore invalid hrefs
      }
    }

    document.addEventListener("click", onClick, true);
    return () => {
      document.removeEventListener("click", onClick, true);
      clearTimers();
    };
  }, []);

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-[100] h-[2.5px]"
      aria-hidden={!visible}
    >
      <div
        className="h-full origin-left bg-[var(--brand)] shadow-[0_0_12px_color-mix(in_oklab,var(--brand)_55%,transparent)] transition-[width,opacity] duration-200 ease-out motion-reduce:transition-none"
        style={{
          width: `${width}%`,
          opacity: visible ? 1 : 0,
        }}
      />
    </div>
  );
}
