"use client";

import { useEffect, useState } from "react";
import { londonTime, type LondonTime } from "@/lib/sim/londonClock";

/** Wall-clock milliseconds, refreshed every `intervalMs`. */
export function useNow(intervalMs = 10_000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);
  return now;
}

export function useLondonTime(): LondonTime {
  return londonTime(useNow());
}
