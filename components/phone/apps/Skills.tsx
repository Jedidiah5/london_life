"use client";

import { capitalise } from "@/lib/sim/actions";
import { SKILL_KEYS, SKILL_MAX } from "@/lib/sim/constants";
import { useGame } from "@/lib/store/useGame";

export const SKILL_EMOJI: Record<string, string> = {
  coding: "💻",
  cooking: "🍳",
  charisma: "🗣️",
  fitness: "🏃",
  music: "🎸",
  comedy: "🎤",
  style: "🧥",
  hustle: "💼",
  photography: "📷",
};

export const SKILL_HOW: Record<string, string> = {
  coding: "Side projects at your desk, Shoreditch laptops",
  cooking: "Cook a taste of home",
  charisma: "Natter at Camden, network, give a speech",
  fitness: "Dance, dock walks, cold swims",
  music: "Dig crates in Brixton, busk along",
  comedy: "Barber banter, read, pub quiz",
  style: "Vintage rails in Camden",
  hustle: "Polish your CV, look busy at the Wharf",
  photography: "Moody photos in Hyde Park, street portraits",
};

export function Skills() {
  const skills = useGame((state) => state.skills);
  return (
    <div className="space-y-1.5 text-xs">
      <p className="text-[11px] text-[#5c6b7a]">Skills only grow by doing. They unlock better jobs.</p>
      {SKILL_KEYS.map((key) => {
        const value = skills[key] ?? 0;
        return (
          <div key={key} className="rounded-2xl bg-white p-2 shadow-sm">
            <div className="flex justify-between font-bold">
              <span>{capitalise(key)}</span>
              <span>Lv {Math.floor(value)}</span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[#ece7de]">
              <div className="h-full rounded-full bg-[#6d4fd1]" style={{ width: `${(value / SKILL_MAX) * 100}%` }} />
            </div>
            <div className="mt-0.5 text-[10px] text-[#9aa5b1]">{SKILL_HOW[key]}</div>
          </div>
        );
      })}
    </div>
  );
}
