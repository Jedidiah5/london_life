"use client";

import { useEffect, useState } from "react";
import { londonTime, type LondonTime } from "@/lib/sim/londonClock";

/** Live London wall-clock. Renders a placeholder until mounted to avoid hydration mismatch. */
export function LiveClock({ className = "" }: { className?: string }) {
  const [time, setTime] = useState<LondonTime | null>(null);

  useEffect(() => {
    const tick = () => setTime(londonTime(Date.now()));
    tick();
    const id = window.setInterval(tick, 10_000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <span className={`tabular-nums ${className}`} suppressHydrationWarning>
      {time ? `${time.weekday} ${time.time}` : "London"}
    </span>
  );
}
