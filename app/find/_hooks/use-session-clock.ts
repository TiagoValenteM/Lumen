"use client";

import { useEffect, useState } from "react";

export function useSessionClock(active: boolean) {
  const [now, setNow] = useState<number>();
  useEffect(() => {
    if (!active) return;
    const refresh = () => setNow(Date.now());
    const first = window.setTimeout(refresh, 0);
    const interval = window.setInterval(refresh, 15_000);
    window.addEventListener("focus", refresh);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(interval);
      window.removeEventListener("focus", refresh);
    };
  }, [active]);
  return active ? now : undefined;
}
