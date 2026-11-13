"use client";

import { useEffect } from "react";
import { LIVE_EVENT } from "@/lib/live-events";

/** Re-run a callback whenever hospital live sync detects a data change. */
export function useLiveReload(onLive: () => void) {
  useEffect(() => {
    function handler() {
      onLive();
    }
    window.addEventListener(LIVE_EVENT, handler);
    return () => window.removeEventListener(LIVE_EVENT, handler);
  }, [onLive]);
}
