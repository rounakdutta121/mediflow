"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { LIVE_EVENT } from "@/lib/live-events";

const POLL_MS = 1500;
const POLL_HIDDEN_MS = 10000;

type LiveSnapshot = {
  revision: number;
  at: string | null;
  currency: string;
};

/**
 * Polls hospital liveRevision and refreshes RSC trees for every signed-in user
 * whenever patients, queue, clinical, billing, prices, or settings change.
 */
export function LiveSync() {
  const router = useRouter();
  const revisionRef = useRef<number | null>(null);
  const currencyRef = useRef<string | null>(null);
  const inFlight = useRef(false);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    function publish(data: LiveSnapshot) {
      revisionRef.current = data.revision;
      currencyRef.current = data.currency;
      router.refresh();
      window.dispatchEvent(
        new CustomEvent(LIVE_EVENT, {
          detail: {
            revision: data.revision,
            at: data.at,
            currency: data.currency,
          },
        })
      );
    }

    async function tick() {
      if (cancelled || inFlight.current) {
        schedule();
        return;
      }
      inFlight.current = true;
      try {
        const res = await fetch(`/api/live?t=${Date.now()}`, {
          cache: "no-store",
          credentials: "same-origin",
          headers: { Pragma: "no-cache", "Cache-Control": "no-cache" },
        });
        if (res.ok) {
          const data = (await res.json()) as LiveSnapshot;
          const prev = revisionRef.current;
          const prevCurrency = currencyRef.current;

          if (prev === null) {
            revisionRef.current = data.revision;
            currencyRef.current = data.currency;
          } else if (
            data.revision !== prev ||
            (data.currency && data.currency !== prevCurrency)
          ) {
            publish(data);
          }
        }
      } catch {
        // Ignore transient network errors; next poll retries.
      } finally {
        inFlight.current = false;
        schedule();
      }
    }

    function schedule() {
      if (cancelled) return;
      if (timer) clearTimeout(timer);
      const delay =
        document.visibilityState === "visible" ? POLL_MS : POLL_HIDDEN_MS;
      timer = setTimeout(tick, delay);
    }

    function onVisible() {
      if (document.visibilityState === "visible") {
        if (timer) clearTimeout(timer);
        void tick();
      }
    }

    void tick();
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [router]);

  return null;
}
