"use client";

import { goals } from "@/lib/content";
import { nextGoal } from "@/lib/sim/goals";
import { useGame } from "@/lib/store/useGame";
import { unreadTotal, useMessages } from "@/lib/store/useMessages";
import type { NavKey } from "@/lib/store/useUi";
import { useUi } from "@/lib/store/useUi";
import { HomeIcon, MapIcon, PhoneIcon, SofaIcon } from "./icons";

const ITEMS: { id: NavKey; label: string; Icon: (props: { className?: string }) => React.ReactNode; goal: string }[] = [
  { id: "home", label: "Home", Icon: HomeIcon, goal: "" },
  { id: "buy", label: "Buy", Icon: SofaIcon, goal: "buy" },
  { id: "map", label: "Map", Icon: MapIcon, goal: "map" },
  { id: "phone", label: "Phone", Icon: PhoneIcon, goal: "phone" },
];

export function BottomNav() {
  const nav = useUi((state) => state.nav);
  const goalsDone = useGame((state) => state.goalsDone);
  const location = useGame((state) => state.location);
  const unread = useMessages((state) => unreadTotal(state.conversations));
  const highlight = nextGoal(goals, goalsDone)?.highlight;
  return (
    <nav className="pointer-events-auto mx-auto grid w-full max-w-md grid-cols-4 gap-1 rounded-full bg-white/95 p-1.5 text-[#1b2838] shadow-lg">
      {ITEMS.map((item) => {
        const active = nav === item.id;
        const nudge = highlight === item.goal && !active;
        return (
          <button
            key={item.id}
            type="button"
            className={`relative flex flex-col items-center rounded-full py-2 text-[12px] font-semibold ${
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
            <item.Icon className="mb-0.5 h-5 w-5" />
            {item.id === "home" && location !== "home" ? "Go home" : item.label}
            {nudge ? (
              <span className="absolute right-3 top-1 h-2.5 w-2.5 animate-ping rounded-full bg-[#e8a317]" />
            ) : null}
            {item.id === "phone" && unread > 0 && !active ? (
              <span className="absolute right-[22%] top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-[#ff3b30] px-1 text-[10px] font-bold text-white">
                {unread > 9 ? "9+" : unread}
              </span>
            ) : null}
          </button>
        );
      })}
    </nav>
  );
}
