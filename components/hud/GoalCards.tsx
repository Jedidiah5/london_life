"use client";

import { useState } from "react";
import { goals } from "@/lib/content";
import { claimGoal } from "@/lib/net/rpc";
import { LOW_NEED_GOAL, NEED_WARNING } from "@/lib/sim/constants";
import { goalReady, nextGoal } from "@/lib/sim/goals";
import { formatPence } from "@/lib/sim/money";
import { lowestNeed } from "@/lib/sim/needs";
import { useGame } from "@/lib/store/useGame";
import { useUi } from "@/lib/store/useUi";

const NEED_HINT: Record<string, { emoji: string; hint: string }> = {
  hunger: { emoji: "🍞", hint: "Tap the fridge or grab food out" },
  energy: { emoji: "😴", hint: "Tap the bed for a nap" },
  hygiene: { emoji: "🚿", hint: "Tap the shower" },
  bladder: { emoji: "🚽", hint: "Tap the loo. Quickly." },
  fun: { emoji: "🎉", hint: "Telly, music, or the pub" },
  social: { emoji: "💬", hint: "Chat at a venue or call home" },
};

export function GoalCards() {
  const goalsDone = useGame((state) => state.goalsDone);
  const stats = useGame((state) => state.stats);
  const needs = useGame((state) => state.needs);
  const heatingOn = useGame((state) => state.heatingOn);
  const sofa = useGame((state) => state.sofaSurfing);
  const shift = useGame((state) => state.shift);
  const moodlets = useGame((state) => state.moodlets);
  const [busy, setBusy] = useState(false);
  const goal = nextGoal(goals, goalsDone);
  const ready = goal ? goalReady(goal, stats) : false;
  const low = lowestNeed(needs);
  const urgent = needs[low] < NEED_WARNING + 10;
  const index = goal ? goals.findIndex((entry) => entry.id === goal.id) : goals.length;
  const required = goals.filter((entry) => !entry.optional).length;

  return (
    <div className="pointer-events-none flex w-60 flex-col items-start gap-1.5">
      {goal ? (
        <div
          className={`pointer-events-auto flex w-full items-center gap-2 rounded-2xl bg-white/95 p-2 text-[#1b2838] shadow-lg ${
            ready ? "ring-2 ring-[#3ccf6e]" : ""
          }`}
        >
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#fff4d6] text-xl">{goal.emoji}</div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1 text-[10px] font-semibold text-[#9aa5b1]">
              {goal.optional ? "BONUS" : `GOAL ${index + 1}/${required}`}
            </div>
            <div className="truncate text-[13px] font-bold">{goal.title}</div>
            <div className="truncate text-[11px] text-[#5c6b7a]">{goal.hint}</div>
          </div>
          {ready ? (
            <button
              type="button"
              disabled={busy}
              className="shrink-0 animate-pulse rounded-full bg-[#3ccf6e] px-2.5 py-1.5 text-[11px] font-bold text-white shadow"
              onClick={() => {
                setBusy(true);
                void claimGoal(goal.id).then((result) => {
                  setBusy(false);
                  if (typeof result === "string") useUi.getState().pushToast(result, "bad");
                  else useUi.getState().pushToast(`Goal done! +${formatPence(result)}`, "good");
                });
              }}
            >
              Claim {formatPence(goal.rewardPence)}
            </button>
          ) : (
            <span className="shrink-0 rounded-full bg-[#e9f9ef] px-2 py-1 text-[11px] font-bold text-[#22924f]">
              +{formatPence(goal.rewardPence)}
            </span>
          )}
        </div>
      ) : null}
      {urgent && !shift ? (
        <div className="flex w-full items-center gap-2 rounded-2xl bg-white/90 p-2 text-[#1b2838] shadow">
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-[#ffe4e4] text-lg">
            {NEED_HINT[low]?.emoji}
          </div>
          <div className="min-w-0">
            <div className="truncate text-[12px] font-bold">{LOW_NEED_GOAL[low]}</div>
            <div className="truncate text-[10px] text-[#5c6b7a]">{NEED_HINT[low]?.hint}</div>
          </div>
        </div>
      ) : null}
      <div className="flex flex-wrap gap-1">
        {shift ? <Chip tone="dark">⏱️ On shift</Chip> : null}
        {!heatingOn ? <Chip tone="dark">🥶 Heating&apos;s off</Chip> : null}
        {sofa ? <Chip tone="red">🛋️ Sofa surfing</Chip> : null}
        {moodlets.slice(0, 3).map((moodlet) => (
          <Chip key={moodlet.id + moodlet.label} tone={moodlet.value < 0 ? "red" : "green"}>
            {moodlet.emoji} {moodlet.label}
          </Chip>
        ))}
      </div>
    </div>
  );
}

function Chip({ children, tone }: { children: React.ReactNode; tone: "dark" | "red" | "green" }) {
  const colours = {
    dark: "bg-[#1b2838] text-white",
    red: "bg-[#ffe4e4] text-[#a3162b]",
    green: "bg-[#e9f9ef] text-[#22924f]",
  };
  return <div className={`rounded-full px-2.5 py-1 text-[10px] font-semibold shadow ${colours[tone]}`}>{children}</div>;
}
