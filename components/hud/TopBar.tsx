"use client";

import { clockParts, isNight } from "@/lib/sim/clock";
import { formatPence } from "@/lib/sim/money";
import { moodBand, moodScore } from "@/lib/sim/mood";
import type { MoodBand } from "@/lib/sim/types";
import { useGame } from "@/lib/store/useGame";
import { usePresence } from "@/lib/store/usePresence";
import { useUi } from "@/lib/store/useUi";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const MOOD_EMOJI: Record<MoodBand, string> = {
  Miserable: "😫",
  Low: "😕",
  Fine: "🙂",
  Happy: "😊",
  Buzzing: "🤩",
};

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
  const here = usePresence((state) => state.here.length);
  const muted = useUi((state) => state.muted);
  const clock = clockParts(gameMinutes);
  const day = DAYS[(clock.day - 1) % 7] ?? "Mon";
  const score = moodScore(needs, moodlets, gameMinutes, heatingOn);
  const band = moodBand(score);
  const atHome = location === "home" && !shift;
  const time = `${String(clock.hour).padStart(2, "0")}:${String(clock.minute).padStart(2, "0")}`;

  return (
    <header className="pointer-events-auto mx-auto flex w-full max-w-3xl items-center gap-1.5 overflow-x-auto rounded-full bg-white/95 px-2 py-1.5 text-[#1b2838] shadow-lg">
      <Pill>
        <span className="text-base">{isNight(clock.hour) ? "🌙" : "☀️"}</span>
        <span className="font-bold">
          {day} {time}
        </span>
        <span className="hidden text-[10px] text-[#5c6b7a] sm:inline">Week {Math.floor((clock.day - 1) / 7) + 1}</span>
      </Pill>
      <Pill title={`Mood ${Math.round(score)}`}>
        <span className="text-base">{MOOD_EMOJI[band]}</span>
        <span className="font-semibold">{band}</span>
      </Pill>
      <Pill className="hidden sm:flex">
        <span className="h-2 w-2 rounded-full bg-[#3ccf6e]" />
        <span className="font-semibold">{Math.max(online, here + 1)}</span>
        <span className="text-[10px] text-[#5c6b7a]">online</span>
      </Pill>
      {atHome ? (
        <div className="flex shrink-0 gap-0.5 rounded-full bg-[#f1ede6] p-0.5">
          {([1, 2, 3] as const).map((value) => (
            <button
              key={value}
              type="button"
              className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${speed === value ? "bg-[#1b2838] text-white" : ""}`}
              onClick={() => useGame.getState().setSpeed(value)}
            >
              {value === 1 ? "▶" : value === 2 ? "▶▶" : "▶▶▶"}
            </button>
          ))}
        </div>
      ) : null}
      <div className="flex-1" />
      <button
        type="button"
        aria-label="Turn camera"
        className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#f1ede6] text-sm"
        onClick={() => useUi.getState().rotateYaw()}
      >
        🔄
      </button>
      <button
        type="button"
        aria-label={muted ? "Unmute" : "Mute"}
        className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#f1ede6] text-sm"
        onClick={() => useUi.getState().toggleMute()}
      >
        {muted ? "🔇" : "🔊"}
      </button>
      <button
        type="button"
        onClick={() => useUi.getState().openPhone("bank")}
        className="flex shrink-0 items-center gap-1 rounded-full bg-[#f1ede6] py-0.5 pl-3 pr-0.5 text-sm font-bold"
      >
        <span className={balance < 0 ? "text-[#c8102e]" : ""}>{formatPence(balance)}</span>
        <span className="grid h-7 w-7 place-items-center rounded-full bg-[#3ccf6e] text-base font-bold text-white">+</span>
      </button>
    </header>
  );
}

function Pill({ children, className = "", title }: { children: React.ReactNode; className?: string; title?: string }) {
  return (
    <div title={title} className={`flex shrink-0 items-center gap-1.5 rounded-full bg-[#f1ede6] px-3 py-1 text-[12px] ${className}`}>
      {children}
    </div>
  );
}
