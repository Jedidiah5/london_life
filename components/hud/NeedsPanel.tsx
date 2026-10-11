"use client";

import { NEED_LABELS } from "@/lib/sim/constants";
import { NEED_KEYS } from "@/lib/sim/types";
import { useGame } from "@/lib/store/useGame";

export function NeedsPanel() {
  const needs = useGame((state) => state.needs);
  const name = useGame((state) => state.name);
  const appearance = useGame((state) => state.appearance);
  const action = useGame((state) => state.action);

  return (
    <section className="pointer-events-auto w-44 rounded-2xl bg-[#f4efe6]/95 p-2 text-[#1b2838] shadow-lg">
      <div className="mb-2 flex items-center gap-2">
        <div className="h-8 w-8 rounded-full border-2" style={{ background: appearance.top, borderColor: appearance.skin }} />
        <div>
          <div className="text-xs font-semibold">{name}</div>
          <div className="text-[10px] text-[#5c6b7a]">{action ? action.label : "Idle"}</div>
        </div>
      </div>
      <div className="space-y-1">
        {NEED_KEYS.map((key) => (
          <div key={key}>
            <div className="flex justify-between text-[10px]">
              <span>{NEED_LABELS[key]}</span>
              <span>{Math.round(needs[key])}</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-[#1b2838]/10">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${needs[key]}%`,
                  background: needs[key] < 25 ? "#c8102e" : "#2f6b4f",
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
