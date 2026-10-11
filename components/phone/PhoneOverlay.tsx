"use client";

import { Flag } from "@/components/Flag";
import { nationalitiesById } from "@/lib/content";
import { clockParts } from "@/lib/sim/clock";
import { useGame } from "@/lib/store/useGame";
import { useUi, type PhoneApp } from "@/lib/store/useUi";
import { Bank } from "./apps/Bank";
import { CallHome } from "./apps/CallHome";
import { Friends } from "./apps/Friends";
import { Help } from "./apps/Help";
import { Jobs } from "./apps/Jobs";
import { Messages } from "./apps/Messages";
import { Settings } from "./apps/Settings";
import { Skills } from "./apps/Skills";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const APPS: { id: PhoneApp; label: string; emoji: string; colour: string }[] = [
  { id: "jobs", label: "Jobs", emoji: "💼", colour: "from-[#f5a524] to-[#e07b00]" },
  { id: "bank", label: "Bank", emoji: "🏦", colour: "from-[#3ccf6e] to-[#1d8f47]" },
  { id: "messages", label: "Chat", emoji: "💬", colour: "from-[#4f8cff] to-[#2459c7]" },
  { id: "friends", label: "Friends", emoji: "👥", colour: "from-[#ff6b9d] to-[#c73b6b]" },
  { id: "callhome", label: "Call home", emoji: "📞", colour: "from-[#7bd88f] to-[#2f9e57]" },
  { id: "skills", label: "Skills", emoji: "📈", colour: "from-[#a78bfa] to-[#6d4fd1]" },
  { id: "help", label: "Help", emoji: "❓", colour: "from-[#94a3b8] to-[#556274]" },
  { id: "settings", label: "Settings", emoji: "⚙️", colour: "from-[#64748b] to-[#334155]" },
];

export function PhoneOverlay() {
  const nav = useUi((state) => state.nav);
  const app = useUi((state) => state.phoneApp);
  const gameMinutes = useGame((state) => state.gameMinutes);
  const origin = useGame((state) => state.appearance.origin);
  const lastCall = useGame((state) => state.lastCallMinute);
  if (nav !== "phone") return null;
  const clock = clockParts(gameMinutes);
  const time = `${String(clock.hour).padStart(2, "0")}:${String(clock.minute).padStart(2, "0")}`;
  const current = APPS.find((entry) => entry.id === app);
  const missing = gameMinutes - lastCall > 1440 * 2;

  return (
    <div className="pointer-events-auto mx-auto w-full max-w-[320px]">
      <div className="rounded-[42px] bg-[#111] p-2.5 shadow-2xl">
        <div className="relative h-[min(560px,62vh)] overflow-hidden rounded-[34px] bg-gradient-to-br from-[#2b3a67] via-[#7a3e6b] to-[#e07b39] text-white">
          <div className="flex items-center justify-between px-5 pt-2 text-[11px] font-semibold">
            <span>{time}</span>
            <span className="h-5 w-20 rounded-full bg-black" />
            <span>📶 🔋</span>
          </div>
          {current ? (
            <div className="absolute inset-x-0 bottom-0 top-8 flex flex-col bg-[#f6f4ef] text-[#1b2838]">
              <div className="flex items-center gap-2 border-b border-[#ece7de] px-3 py-2">
                <button type="button" className="text-sm font-bold text-[#2459c7]" onClick={() => useUi.getState().openPhone(null)}>
                  ‹ Home
                </button>
                <span className="flex-1 text-center text-sm font-bold">
                  {current.emoji} {current.label}
                </span>
                <span className="w-12" />
              </div>
              <div className="flex-1 overflow-y-auto p-3">
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
            <div className="flex h-full flex-col px-5 pb-6 pt-6">
              <div className="text-center">
                <div className="text-6xl font-thin tracking-tight">{time}</div>
                <div className="text-sm font-medium opacity-90">
                  {DAYS[(clock.day - 1) % 7]} · Day {clock.day}
                </div>
                <div className="mt-1 text-[11px] opacity-80">🌧️ 11°C · London</div>
              </div>
              <div className="mt-8 grid grid-cols-4 gap-x-2 gap-y-4">
                {APPS.map((entry) => (
                  <button
                    key={entry.id}
                    type="button"
                    className="relative flex flex-col items-center gap-1"
                    onClick={() => useUi.getState().openPhone(entry.id)}
                  >
                    <span className={`grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br text-2xl shadow-lg ${entry.colour}`}>
                      {entry.id === "callhome" && nationalitiesById[origin] ? <Flag origin={origin} size="md" /> : entry.emoji}
                    </span>
                    <span className="text-[10px] font-semibold drop-shadow">{entry.label}</span>
                    {entry.id === "callhome" && missing ? (
                      <span className="absolute -right-0.5 -top-1 grid h-5 w-5 place-items-center rounded-full bg-[#e5484d] text-[10px] font-bold">
                        1
                      </span>
                    ) : null}
                  </button>
                ))}
              </div>
              <div className="flex-1" />
              <button
                type="button"
                className="mx-auto h-1.5 w-28 rounded-full bg-white/70"
                aria-label="Close phone"
                onClick={() => useUi.getState().setNav("home")}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
