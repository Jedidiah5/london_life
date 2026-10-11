"use client";

import { goals } from "@/lib/content";
import { nextGoal } from "@/lib/sim/goals";
import { useGame } from "@/lib/store/useGame";
import type { NavKey } from "@/lib/store/useUi";
import { useUi } from "@/lib/store/useUi";

const ITEMS: { id: NavKey; label: string; emoji: string; goal: string }[] = [
  { id: "home", label: "Home", emoji: "🏠", goal: "" },
  { id: "buy", label: "Buy", emoji: "🛋️", goal: "buy" },
  { id: "map", label: "Map", emoji: "🗺️", goal: "map" },
  { id: "phone", label: "Phone", emoji: "📱", goal: "phone" },
];

export function BottomNav() {
  const nav = useUi((state) => state.nav);
  const goalsDone = useGame((state) => state.goalsDone);
  const location = useGame((state) => state.location);
  const highlight = nextGoal(goals, goalsDone)?.highlight;
  return (
    <nav className="pointer-events-auto mx-auto grid w-full max-w-sm grid-cols-4 gap-1 rounded-full bg-white/95 p-1 text-[#1b2838] shadow-lg">
      {ITEMS.map((item) => {
        const active = nav === item.id;
        const nudge = highlight === item.goal && !active;
        return (
          <button
            key={item.id}
            type="button"
            className={`relative flex flex-col items-center rounded-full py-1.5 text-[12px] font-bold ${
              active ? "bg-[#1b2838] text-white" : ""
            }`}
            onClick={() => {
              if (item.id === "home" && location !== "home" && nav === "home") {
                useUi.getState().setNav("map");
                useUi.getState().setTravelTo("home");
                return;
              }
              useUi.getState().setNav(item.id);
            }}
          >
            <span className="text-lg leading-tight">{item.emoji}</span>
            {item.id === "home" && location !== "home" ? "Go home" : item.label}
            {nudge ? <span className="absolute right-3 top-1 h-2.5 w-2.5 animate-ping rounded-full bg-[#e8a317]" /> : null}
          </button>
        );
      })}
    </nav>
  );
}
