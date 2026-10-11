"use client";

import { clockParts } from "@/lib/sim/clock";
import { formatPence } from "@/lib/sim/money";
import { moodBand, moodScore } from "@/lib/sim/mood";
import { useGame } from "@/lib/store/useGame";
import { usePresence } from "@/lib/store/usePresence";
import { useUi } from "@/lib/store/useUi";

export function TopBar() {
  const gameMinutes = useGame((state) => state.gameMinutes);
  const needs = useGame((state) => state.needs);
  const moodlets = useGame((state) => state.moodlets);
  const heatingOn = useGame((state) => state.heatingOn);
  const balance = useGame((state) => state.balancePence);
  const speed = useGame((state) => state.speed);
  const location = useGame((state) => state.location);
  const shift = useGame((state) => state.shift);
  const online = usePresence((state) => state.online);
  const clock = clockParts(gameMinutes);
  const score = moodScore(needs, moodlets, gameMinutes, heatingOn);
  const band = moodBand(score);
  const atHome = location === "home" && !shift;

  return (
    <header className="pointer-events-auto flex items-center justify-between gap-2 rounded-2xl bg-[#1b2838]/90 px-3 py-2 text-[#f4efe6] shadow-lg">
      <div>
        <div className="text-sm font-semibold">{clock.label}</div>
        <div className="text-[11px] text-[#d5deea]">{band}</div>
      </div>
      <div className="text-center text-[11px] text-[#d5deea]">{online} online</div>
      <div className="text-right">
        <div className="text-sm font-semibold">{formatPence(balance)}</div>
        {atHome ? (
          <div className="mt-0.5 flex justify-end gap-1">
            {([1, 2, 3] as const).map((value) => (
              <button
                key={value}
                type="button"
                className={`rounded-full px-1.5 py-0.5 text-[10px] ${speed === value ? "bg-[#c8102e]" : "bg-white/10"}`}
                onClick={() => useGame.getState().setSpeed(value)}
              >
                {value}×
              </button>
            ))}
          </div>
        ) : (
          <div className="text-[10px] text-[#d5deea]">1×</div>
        )}
      </div>
      <button
        type="button"
        className="rounded-full bg-white/10 px-2 py-1 text-[11px]"
        onClick={() => useUi.getState().rotateYaw()}
      >
        Turn
      </button>
    </header>
  );
}
