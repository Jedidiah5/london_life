"use client";

import type { NavKey } from "@/lib/store/useUi";
import { useUi } from "@/lib/store/useUi";

const ITEMS: { id: NavKey; label: string }[] = [
  { id: "home", label: "Home" },
  { id: "buy", label: "Buy" },
  { id: "map", label: "Map" },
  { id: "phone", label: "Phone" },
];

export function BottomNav() {
  const nav = useUi((state) => state.nav);
  return (
    <nav className="pointer-events-auto grid grid-cols-4 gap-1 rounded-2xl bg-[#1b2838]/92 p-1 text-[#f4efe6] shadow-lg">
      {ITEMS.map((item) => (
        <button
          key={item.id}
          type="button"
          className={`rounded-xl py-2 text-xs font-semibold ${nav === item.id ? "bg-[#c8102e]" : ""}`}
          onClick={() => useUi.getState().setNav(item.id)}
        >
          {item.label}
        </button>
      ))}
    </nav>
  );
}
