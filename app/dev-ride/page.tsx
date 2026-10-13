"use client";

import { useEffect } from "react";
import { RideScene } from "@/components/travel/RideScene";
import { useUi } from "@/lib/store/useUi";
import type { TravelMode } from "@/lib/sim/types";

export default function DevRide() {
  useEffect(() => {
    const mode = (new URLSearchParams(window.location.search).get("mode") ?? "tube") as TravelMode;
    const start = () => useUi.getState().setRide({ destination: "camden", mode, minutes: 600 });
    start();
    return useUi.subscribe((state) => {
      if (!state.ride) window.setTimeout(start, 50);
    });
  }, []);
  return (
    <div className="relative h-screen w-screen">
      <RideScene />
    </div>
  );
}
