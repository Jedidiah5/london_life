"use client";

import { useState } from "react";
import { actionsById, nationalitiesById, roomLayout, targetMenu } from "@/lib/content";
import { performAction } from "@/lib/net/rpc";
import { actionBlocker, effectChips } from "@/lib/sim/actions";
import { NEED_LABELS } from "@/lib/sim/constants";
import { formatPence } from "@/lib/sim/money";
import type { ActionDef, NeedKey, Nationality } from "@/lib/sim/types";
import { useGame } from "@/lib/store/useGame";
import { useUi } from "@/lib/store/useUi";
import { NEED_EMOJI } from "./NeedsPanel";

export function heritageLabel(def: ActionDef, nation: Nationality | undefined): { label: string; emoji: string } {
  if (!def.heritage || !nation) return { label: def.label, emoji: def.emoji };
  if (def.id === "taste_of_home") return { label: `Cook ${nation.dish}`, emoji: nation.dishEmoji };
  return { label: `${nation.demonym} stall: ${nation.dish}`, emoji: nation.dishEmoji };
}

export function ActionSheet() {
  const target = useUi((state) => state.sheet);
  const location = useGame((state) => state.location);
  const homeId = useGame((state) => state.homeId);
  const inventory = useGame((state) => state.inventory);
  const balance = useGame((state) => state.balancePence);
  const skills = useGame((state) => state.skills);
  const origin = useGame((state) => state.appearance.origin);
  const [busy, setBusy] = useState<string | null>(null);
  if (!target) return null;
  const found = targetMenu(target, roomLayout(location, homeId, null), inventory);
  if (!found) return null;
  const nation = nationalitiesById[origin];
  const ctx = { balancePence: balance, skills, location };

  return (
    <section className="pointer-events-auto mx-auto w-full max-w-md rounded-3xl bg-white p-3 text-[#1b2838] shadow-2xl">
      <div className="mb-2 flex items-start gap-3">
        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[#f1ede6] text-2xl">{found.menu.emoji}</div>
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-bold leading-tight">{found.label}</h2>
          <p className="text-[12px] text-[#5c6b7a]">{found.menu.blurb}</p>
        </div>
        <button
          type="button"
          aria-label="Close"
          className="grid h-8 w-8 place-items-center rounded-full bg-[#f1ede6] text-sm"
          onClick={() => useUi.getState().openSheet(null)}
        >
          ✕
        </button>
      </div>
      <div className="grid max-h-[38vh] grid-cols-1 gap-1.5 overflow-y-auto sm:grid-cols-2">
        {found.menu.actions.map((actionId) => {
          const def = actionsById[actionId];
          if (!def) return null;
          const blocked = actionBlocker(def, ctx);
          const shown = heritageLabel(def, nation);
          return (
            <button
              key={actionId}
              type="button"
              disabled={Boolean(blocked) || busy !== null}
              className={`flex items-center gap-2 rounded-2xl border p-2 text-left transition ${
                blocked ? "border-[#f0e9e9] bg-[#faf8f8] opacity-70" : "border-[#ece7de] bg-[#fbfaf7] active:scale-[0.98]"
              } ${def.heritage ? "ring-1 ring-[#e8a317]" : ""}`}
              onClick={() => {
                setBusy(actionId);
                void performAction(actionId, target).then((error) => {
                  setBusy(null);
                  if (error) {
                    useUi.getState().pushToast(error, "bad");
                    return;
                  }
                  useUi.getState().openSheet(null);
                  if (def.costPence > 0) useUi.getState().pushToast(`${shown.label} · −${formatPence(def.costPence)}`);
                });
              }}
            >
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white text-xl shadow-sm">{shown.emoji}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-semibold">{busy === actionId ? "…" : shown.label}</span>
                <span className="mt-0.5 flex flex-wrap items-center gap-1">
                  <span className="rounded-full bg-[#f1ede6] px-1.5 py-0.5 text-[10px] font-semibold">⏱ {def.minutes}m</span>
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                      def.costPence === 0 ? "bg-[#e9f9ef] text-[#22924f]" : "bg-[#fff4d6] text-[#8a5a00]"
                    }`}
                  >
                    {def.costPence === 0 ? "Free" : formatPence(def.costPence)}
                  </span>
                  {effectChips(def).map((chip) => (
                    <span
                      key={chip.key}
                      className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                        chip.amount > 0 ? "bg-[#e7f0ff] text-[#1f4b99]" : "bg-[#ffe4e4] text-[#a3162b]"
                      }`}
                    >
                      {chip.amount > 0 ? "+" : "−"}
                      {NEED_EMOJI[chip.key as NeedKey]} {NEED_LABELS[chip.key as NeedKey]}
                    </span>
                  ))}
                  {def.skill && def.xp ? (
                    <span className="rounded-full bg-[#f3e8ff] px-1.5 py-0.5 text-[10px] font-semibold text-[#6b2d9b]">
                      +{def.skill}
                    </span>
                  ) : null}
                </span>
                {blocked ? <span className="mt-0.5 block text-[10px] font-bold text-[#e5484d]">🔒 {blocked}</span> : null}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
