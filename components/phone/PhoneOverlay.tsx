"use client";

import type { CSSProperties } from "react";
import { Flag } from "@/components/Flag";
import { nationalitiesById } from "@/lib/content";
import { useGame } from "@/lib/store/useGame";
import { useUi, type PhoneApp } from "@/lib/store/useUi";
import { useLondonTime } from "@/lib/useNow";
import { Bank } from "./apps/Bank";
import { CallHome } from "./apps/CallHome";
import { Friends } from "./apps/Friends";
import { Help } from "./apps/Help";
import { Jobs } from "./apps/Jobs";
import { Messages } from "./apps/Messages";
import { Settings } from "./apps/Settings";
import { Skills } from "./apps/Skills";

interface AppEntry {
  id: PhoneApp;
  label: string;
  emoji: string;
  colour: string;
}

const APPS: AppEntry[] = [
  { id: "jobs", label: "Jobs", emoji: "💼", colour: "from-[#f5a524] to-[#e07b00]" },
  { id: "bank", label: "Bank", emoji: "🏦", colour: "from-[#3ccf6e] to-[#1d8f47]" },
  { id: "messages", label: "Chat", emoji: "💬", colour: "from-[#4f8cff] to-[#2459c7]" },
  { id: "friends", label: "Friends", emoji: "👥", colour: "from-[#ff6b9d] to-[#c73b6b]" },
  { id: "callhome", label: "Call home", emoji: "📞", colour: "from-[#7bd88f] to-[#2f9e57]" },
  { id: "skills", label: "Skills", emoji: "📈", colour: "from-[#a78bfa] to-[#6d4fd1]" },
  { id: "help", label: "Help", emoji: "❓", colour: "from-[#94a3b8] to-[#556274]" },
  { id: "settings", label: "Settings", emoji: "⚙️", colour: "from-[#64748b] to-[#334155]" },
];

const DOCK: PhoneApp[] = ["callhome", "messages", "bank", "settings"];
const GRID = APPS.filter((entry) => !DOCK.includes(entry.id));
const DOCKED = DOCK.map((id) => APPS.find((entry) => entry.id === id)!);

/**
 * The phone is drawn to an iPhone 15's proportions (71.6 × 147.6 mm), sized to the space between the top bar and the
 * bottom nav. `--pw` is the phone's width; everything on the chrome scales from it.
 */
const FRAME: CSSProperties & Record<`--${string}`, string> = {
  "--ph": "min(700px, calc(100dvh - 250px), calc((100vw - 56px) * 2.06))",
  "--pw": "calc(var(--ph) * 0.485)",
  width: "var(--pw)",
  height: "var(--ph)",
};

function SignalIcon() {
  return (
    <svg viewBox="0 0 18 12" className="h-[0.7em] w-auto" fill="currentColor" aria-hidden="true">
      <rect x="0" y="8" width="3" height="4" rx="1" />
      <rect x="5" y="5.5" width="3" height="6.5" rx="1" />
      <rect x="10" y="3" width="3" height="9" rx="1" />
      <rect x="15" y="0" width="3" height="12" rx="1" />
    </svg>
  );
}

function WifiIcon() {
  return (
    <svg viewBox="0 0 16 12" className="h-[0.7em] w-auto" fill="currentColor" aria-hidden="true">
      <path d="M8 2.2c2.4 0 4.6.9 6.3 2.5l1.2-1.3A10.6 10.6 0 0 0 8 .4C5.2.4 2.5 1.5.5 3.4l1.2 1.3A8.9 8.9 0 0 1 8 2.2Z" />
      <path d="M8 5.6c1.5 0 2.9.6 4 1.6l1.2-1.3A7.6 7.6 0 0 0 8 3.8c-1.9 0-3.8.8-5.2 2.1L4 7.2c1.1-1 2.5-1.6 4-1.6Z" />
      <path d="M8 9c.7 0 1.3.3 1.8.7L8 11.6 6.2 9.7C6.7 9.3 7.3 9 8 9Z" />
    </svg>
  );
}

function BatteryIcon() {
  return (
    <svg viewBox="0 0 27 13" className="h-[0.78em] w-auto" aria-hidden="true">
      <rect x="0.5" y="0.5" width="23" height="12" rx="3.5" fill="none" stroke="currentColor" opacity="0.4" />
      <rect x="2" y="2" width="16" height="9" rx="2" fill="currentColor" />
      <path d="M25 4.5v4c.8-.3 1.5-1.1 1.5-2s-.7-1.7-1.5-2Z" fill="currentColor" opacity="0.4" />
    </svg>
  );
}

function AppIcon({ entry, origin, badge }: { entry: AppEntry; origin: string; badge: boolean }) {
  return (
    <span
      className={`relative grid aspect-square w-[calc(var(--pw)*0.15)] place-items-center rounded-[22.5%] bg-gradient-to-br text-[calc(var(--pw)*0.075)] shadow-md ${entry.colour}`}
    >
      {entry.id === "callhome" && nationalitiesById[origin] ? <Flag origin={origin} size="md" /> : entry.emoji}
      {badge ? (
        <span className="absolute -right-1.5 -top-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-[#ff3b30] px-1 text-[11px] font-semibold text-white">
          1
        </span>
      ) : null}
    </span>
  );
}

export function PhoneOverlay() {
  const nav = useUi((state) => state.nav);
  const app = useUi((state) => state.phoneApp);
  const gameMinutes = useGame((state) => state.gameMinutes);
  const origin = useGame((state) => state.appearance.origin);
  const lastCall = useGame((state) => state.lastCallMinute);
  const clock = useLondonTime();
  if (nav !== "phone") return null;
  const time = clock.time;
  const current = APPS.find((entry) => entry.id === app);
  const missing = gameMinutes - lastCall > 1440 * 2;
  const open = (id: PhoneApp) => useUi.getState().openPhone(id);

  return (
    <div className="pointer-events-auto relative mx-auto" style={FRAME}>
      <button
        type="button"
        aria-label="Close phone"
        className="absolute -top-10 right-0 z-10 flex items-center gap-1 rounded-full bg-white px-3 py-1.5 text-[12px] font-bold text-[#1b2838] shadow-lg ring-1 ring-black/10"
        onClick={() => useUi.getState().setNav("home")}
      >
        ✕ Close
      </button>

      {/* Action button and volume rocker on the left, side button on the right. */}
      <span className="absolute -left-[3px] top-[16%] h-[4%] w-[4px] rounded-l-sm bg-[#3a3a3c]" />
      <span className="absolute -left-[3px] top-[23%] h-[7.5%] w-[4px] rounded-l-sm bg-[#3a3a3c]" />
      <span className="absolute -left-[3px] top-[32%] h-[7.5%] w-[4px] rounded-l-sm bg-[#3a3a3c]" />
      <span className="absolute -right-[3px] top-[26%] h-[11%] w-[4px] rounded-r-sm bg-[#3a3a3c]" />

      <div className="h-full w-full rounded-[calc(var(--pw)*0.17)] bg-gradient-to-br from-[#5b5b60] via-[#2c2c2e] to-[#5b5b60] p-[2px] shadow-[0_24px_60px_-12px_rgba(0,0,0,0.55)]">
        <div className="h-full w-full rounded-[calc(var(--pw)*0.165)] bg-black p-[calc(var(--pw)*0.03)]">
          <div className="relative h-full w-full overflow-hidden rounded-[calc(var(--pw)*0.135)] bg-gradient-to-br from-[#2b3a67] via-[#7a3e6b] to-[#e07b39] text-white">
            <div
              className={`absolute inset-x-0 top-0 z-20 flex h-[calc(var(--pw)*0.125)] items-center justify-between px-[calc(var(--pw)*0.07)] text-[calc(var(--pw)*0.046)] font-semibold ${
                current ? "text-black" : "text-white"
              }`}
            >
              <span className="w-[30%] text-center tabular-nums">{time}</span>
              <span className="h-[calc(var(--pw)*0.085)] w-[calc(var(--pw)*0.3)] rounded-full bg-black" />
              <span className="flex w-[30%] items-center justify-center gap-[0.3em]">
                <SignalIcon />
                <WifiIcon />
                <BatteryIcon />
              </span>
            </div>

            {current ? (
              <div className="absolute inset-0 flex flex-col bg-[#f2f2f7] pt-[calc(var(--pw)*0.125)] text-[#1b2838]">
                <div className="grid grid-cols-[1fr_auto_1fr] items-center border-b border-black/10 bg-[#f9f9fb]/90 px-3 py-2 backdrop-blur">
                  <button
                    type="button"
                    className="justify-self-start text-[15px] text-[#007aff]"
                    onClick={() => useUi.getState().openPhone(null)}
                  >
                    ‹ Home
                  </button>
                  <span className="text-[15px] font-semibold">
                    {current.emoji} {current.label}
                  </span>
                  <span />
                </div>
                <div className="flex-1 overflow-y-auto p-3 pb-[calc(var(--pw)*0.08)]">
                  {app === "jobs" ? <Jobs /> : null}
                  {app === "bank" ? <Bank /> : null}
                  {app === "messages" ? <Messages /> : null}
                  {app === "friends" ? <Friends /> : null}
                  {app === "callhome" ? <CallHome /> : null}
                  {app === "skills" ? <Skills /> : null}
                  {app === "help" ? <Help /> : null}
                  {app === "settings" ? <Settings /> : null}
                </div>
              </div>
            ) : (
              <div className="flex h-full flex-col px-[calc(var(--pw)*0.06)] pt-[calc(var(--pw)*0.16)]">
                <div className="rounded-[calc(var(--pw)*0.07)] bg-white/15 px-4 py-3 text-center shadow-sm backdrop-blur-md">
                  <div className="text-[calc(var(--pw)*0.17)] font-thin leading-none tracking-tight tabular-nums">
                    {time}
                  </div>
                  <div className="mt-1 text-[calc(var(--pw)*0.045)] font-medium opacity-90">
                    {clock.longWeekday} · {clock.date}
                  </div>
                  <div className="mt-0.5 text-[calc(var(--pw)*0.036)] font-semibold opacity-80">📍 London</div>
                </div>
                <div className="mt-[calc(var(--pw)*0.07)] grid grid-cols-4 justify-items-center gap-y-[calc(var(--pw)*0.05)]">
                  {GRID.map((entry) => (
                    <button
                      key={entry.id}
                      type="button"
                      className="flex flex-col items-center gap-1"
                      onClick={() => open(entry.id)}
                    >
                      <AppIcon entry={entry} origin={origin} badge={false} />
                      <span className="text-[calc(var(--pw)*0.034)] font-medium drop-shadow">{entry.label}</span>
                    </button>
                  ))}
                </div>
                <div className="flex-1" />
                <div className="mx-auto mb-[calc(var(--pw)*0.035)] rounded-full bg-white/20 px-3 py-0.5 text-[calc(var(--pw)*0.034)] font-medium backdrop-blur">
                  🔍 Search
                </div>
                <div className="mb-[calc(var(--pw)*0.075)] grid grid-cols-4 justify-items-center rounded-[calc(var(--pw)*0.09)] bg-white/25 p-[calc(var(--pw)*0.035)] backdrop-blur-xl">
                  {DOCKED.map((entry) => (
                    <button key={entry.id} type="button" aria-label={entry.label} onClick={() => open(entry.id)}>
                      <AppIcon entry={entry} origin={origin} badge={entry.id === "callhome" && missing} />
                    </button>
                  ))}
                </div>
              </div>
            )}

            <button
              type="button"
              aria-label={current ? "Back to home screen" : "Close phone"}
              className="absolute bottom-[calc(var(--pw)*0.022)] left-1/2 z-20 h-[5px] w-[35%] -translate-x-1/2 rounded-full p-0"
              onClick={() => (current ? useUi.getState().openPhone(null) : useUi.getState().setNav("home"))}
            >
              <span className={`block h-full w-full rounded-full ${current ? "bg-black/80" : "bg-white/80"}`} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
