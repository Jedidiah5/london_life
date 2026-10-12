"use client";

import { useState } from "react";
import { finishes, finishesById } from "@/lib/content";
import { buyFinish } from "@/lib/net/rpc";
import { formatPence } from "@/lib/sim/money";
import type { FinishKind } from "@/lib/sim/types";
import { useGame } from "@/lib/store/useGame";
import { useUi } from "@/lib/store/useUi";

const KINDS: { kind: FinishKind; label: string; emoji: string }[] = [
  { kind: "wall", label: "Paint", emoji: "🖌️" },
  { kind: "floor", label: "Floors", emoji: "🪵" },
];

function TryOnBar() {
  const trying = useUi((state) => state.tryFinish);
  const owned = useGame((state) => state.ownedFinishes);
  const balance = useGame((state) => state.balancePence);
  const [busy, setBusy] = useState(false);
  const finish = trying ? finishesById[trying] : undefined;
  if (!finish) return null;
  const mine = owned.includes(finish.id);
  const short = !mine && finish.pricePence > balance;

  const buy = async () => {
    setBusy(true);
    const error = await buyFinish(finish.id);
    setBusy(false);
    const ui = useUi.getState();
    if (error) {
      ui.pushToast(error, "bad");
      return;
    }
    ui.setTryFinish(null);
    ui.pushToast(
      mine ? `${finish.name} is back on` : `${finish.name} is on. Lovely`,
      "good",
    );
  };

  return (
    <div className="mb-2 flex items-center gap-2 rounded-2xl bg-[#1b2838] p-2 text-white">
      <span
        className="h-8 w-8 shrink-0 rounded-xl border border-white/30"
        style={{ background: finish.colour }}
      />
      <div className="min-w-0 flex-1 text-[11px] leading-tight">
        <div className="truncate font-bold">Trying on {finish.name}…</div>
        <div className="text-white/70">
          {mine ? "You already own this" : "Nothing's paid yet"}
        </div>
      </div>
      <button
        type="button"
        className="rounded-full bg-white/15 px-3 py-1.5 text-[11px] font-semibold"
        onClick={() => useUi.getState().setTryFinish(null)}
      >
        Cancel
      </button>
      <button
        type="button"
        disabled={busy || short}
        className="rounded-full bg-[#3ccf6e] px-3 py-1.5 text-[11px] font-extrabold disabled:bg-white/20 disabled:text-white/60"
        onClick={() => void buy()}
      >
        {mine
          ? "Use it"
          : short
            ? "Can't afford"
            : `Buy · ${formatPence(finish.pricePence)}`}
      </button>
    </div>
  );
}

export function DesignGrid() {
  const [kind, setKind] = useState<FinishKind>("wall");
  const current = useGame((state) => state.finishes);
  const owned = useGame((state) => state.ownedFinishes);
  const balance = useGame((state) => state.balancePence);
  const trying = useUi((state) => state.tryFinish);
  const location = useGame((state) => state.location);
  if (location !== "home") {
    return (
      <p className="py-6 text-center text-xs text-[#5c6b7a]">
        Go home to redecorate.
      </p>
    );
  }

  return (
    <div>
      <TryOnBar />
      <div className="mb-2 flex gap-1.5">
        {KINDS.map((entry) => (
          <button
            key={entry.kind}
            type="button"
            className={`flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-semibold ${
              kind === entry.kind
                ? "bg-[#2f6fed] text-white"
                : "bg-[#eef3ff] text-[#2f6fed]"
            }`}
            onClick={() => setKind(entry.kind)}
          >
            <span>{entry.emoji}</span>
            {entry.label}
          </button>
        ))}
      </div>
      <div className="grid max-h-[26vh] grid-cols-3 gap-2 overflow-y-auto pr-1">
        {finishes
          .filter((finish) => finish.kind === kind)
          .map((finish) => {
            const on = current[finish.kind] === finish.id;
            const mine = owned.includes(finish.id);
            const affordable = mine || finish.pricePence <= balance;
            return (
              <button
                key={finish.id}
                type="button"
                className={`relative flex flex-col rounded-2xl bg-[#f6f7f9] p-1.5 text-left ${
                  trying === finish.id
                    ? "ring-2 ring-[#2f6fed]"
                    : on
                      ? "ring-2 ring-[#3ccf6e]"
                      : ""
                }`}
                onClick={() =>
                  useUi.getState().setTryFinish(on ? null : finish.id)
                }
              >
                <span
                  className={`aspect-[4/3] w-full rounded-xl border border-black/10 ${kind === "floor" ? "bg-[length:12px_12px]" : ""}`}
                  style={{
                    backgroundColor: finish.colour,
                    backgroundImage:
                      kind === "floor"
                        ? "linear-gradient(90deg, rgba(0,0,0,0.08) 1px, transparent 1px), linear-gradient(rgba(0,0,0,0.08) 1px, transparent 1px)"
                        : undefined,
                  }}
                />
                <span className="mt-1 truncate text-[11px] font-semibold text-[#1b2838]">
                  {finish.name}
                </span>
                <span
                  className={`text-[11px] font-bold ${on ? "text-[#2f6fed]" : mine ? "text-[#5c6b7a]" : affordable ? "text-[#16a34a]" : "text-[#c8102e]"}`}
                >
                  {on
                    ? "On now"
                    : mine
                      ? "Yours"
                      : finish.pricePence === 0
                        ? "Free"
                        : formatPence(finish.pricePence)}
                </span>
              </button>
            );
          })}
      </div>
    </div>
  );
}
