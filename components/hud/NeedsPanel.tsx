"use client";

import { Flag } from "@/components/Flag";
import { useState } from "react";
import { NEED_LABELS } from "@/lib/sim/constants";
import { NEED_KEYS, type NeedKey } from "@/lib/sim/types";
import { useGame } from "@/lib/store/useGame";
import { useUi } from "@/lib/store/useUi";

export const NEED_EMOJI: Record<NeedKey, string> = {
  hunger: "🍔",
  energy: "⚡",
  hygiene: "🚿",
  bladder: "🚽",
  fun: "🎉",
  social: "💬",
};

function colourFor(value: number): string {
  if (value < 25) return "#e5484d";
  if (value < 50) return "#f5a524";
  return "#3ccf6e";
}

export function NeedsPanel() {
  const needs = useGame((state) => state.needs);
  const name = useGame((state) => state.name);
  const appearance = useGame((state) => state.appearance);
  const [open, setOpen] = useState(false);

  return (
    <section className="pointer-events-auto flex items-end gap-2">
      <button
        type="button"
        onClick={() => useUi.getState().openSimPanel("needs")}
        className="relative grid h-14 w-14 shrink-0 place-items-center rounded-full border-4 border-white shadow-lg"
        style={{ background: `radial-gradient(circle at 50% 38%, ${appearance.skin} 0 38%, ${appearance.top} 39%)` }}
        aria-label="Open your Sim"
      >
        <span className="absolute -bottom-1 -right-1 flex rounded-full bg-white p-1 shadow">
          <Flag origin={appearance.origin} />
        </span>
      </button>
      <div className="rounded-2xl bg-white/95 p-1.5 text-[#1b2838] shadow-lg">
        {open ? (
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-expanded
            aria-label="Collapse feelings"
            className="block w-44 space-y-1 p-1 text-left"
          >
            <div className="flex items-center justify-between text-[11px] font-bold">
              <span>{name}</span>
              <span className="grid h-5 w-5 place-items-center rounded-full bg-[#1b2838]/10 text-[10px] leading-none">
                ▾
              </span>
            </div>
            {NEED_KEYS.map((key) => (
              <div key={key}>
                <div className="flex justify-between text-[10px]">
                  <span>
                    {NEED_EMOJI[key]} {NEED_LABELS[key]}
                  </span>
                  <span>{Math.round(needs[key])}</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-[#1b2838]/10">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${needs[key]}%`, background: colourFor(needs[key]) }}
                  />
                </div>
              </div>
            ))}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-expanded={false}
            aria-label="Expand feelings"
            className="grid grid-cols-3 gap-x-2.5 gap-y-1.5 px-1.5 py-1"
          >
            {NEED_KEYS.map((key) => (
              <div
                key={key}
                className="flex items-center gap-1"
                title={`${NEED_LABELS[key]} ${Math.round(needs[key])}`}
              >
                <span className="text-[12px] leading-none">{NEED_EMOJI[key]}</span>
                <span className="h-2 w-10 overflow-hidden rounded-full bg-[#1b2838]/10">
                  <span
                    className="block h-full rounded-full transition-[width] duration-700"
                    style={{ width: `${needs[key]}%`, background: colourFor(needs[key]) }}
                  />
                </span>
              </div>
            ))}
          </button>
        )}
      </div>
    </section>
  );
}
