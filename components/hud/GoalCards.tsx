"use client";

import { useGame } from "@/lib/store/useGame";

export function GoalCards() {
  const goal = useGame((state) => state.goal());
  const heatingOn = useGame((state) => state.heatingOn);
  const sofa = useGame((state) => state.sofaSurfing);
  return (
    <div className="pointer-events-none flex flex-col items-start gap-1">
      <div className="rounded-full bg-[#f4efe6] px-3 py-1 text-xs font-semibold text-[#1b2838] shadow">{goal}</div>
      {!heatingOn ? (
        <div className="rounded-full bg-[#1b2838] px-3 py-1 text-[11px] text-[#f4efe6]">Heating&apos;s off</div>
      ) : null}
      {sofa ? (
        <div className="rounded-full bg-[#c8102e] px-3 py-1 text-[11px] text-white">Sofa surfing</div>
      ) : null}
    </div>
  );
}
