"use client";

import { Flag } from "@/components/Flag";
import { useState } from "react";
import { nationalitiesById } from "@/lib/content";
import { performAction } from "@/lib/net/rpc";
import { isAwakeHour, timeBackHome } from "@/lib/sim/home";
import { useGame } from "@/lib/store/useGame";
import { useUi } from "@/lib/store/useUi";

export function CallHome() {
  const origin = useGame((state) => state.appearance.origin);
  const londonBorn = useGame((state) => state.appearance.londonBorn);
  const gameMinutes = useGame((state) => state.gameMinutes);
  const lastCall = useGame((state) => state.lastCallMinute);
  const [line, setLine] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const nation = nationalitiesById[origin];
  if (!nation) return null;
  const there = timeBackHome(gameMinutes, nation.utcOffset);
  const awake = isAwakeHour(there.hour);
  const days = Math.floor((gameMinutes - lastCall) / 1440);
  const who = londonBorn && nation.id !== "england" ? "Mum" : "Home";

  return (
    <div className="flex h-full flex-col items-center gap-3 pt-2 text-center">
      <Flag origin={nation.id} size="lg" className="rounded-md" />
      <div>
        <p className="text-lg font-extrabold">
          {who} · {nation.label}
        </p>
        <p className="text-[12px] text-[#5c6b7a]">
          It&apos;s {there.label} there{there.dayDelta > 0 ? " (tomorrow)" : there.dayDelta < 0 ? " (yesterday)" : ""}
          {awake ? "" : " · they're probably asleep"}
        </p>
        <p className="mt-1 text-[11px] text-[#9aa5b1]">
          {days === 0 ? "You called today" : `Last call ${days} day${days === 1 ? "" : "s"} ago`}
        </p>
      </div>
      {line ? <p className="rounded-2xl bg-white p-3 text-[13px] shadow-sm">“{line}”</p> : null}
      <button
        type="button"
        disabled={busy}
        className="mt-auto grid h-16 w-16 place-items-center rounded-full bg-[#3ccf6e] text-3xl shadow-lg disabled:opacity-50"
        onClick={() => {
          setBusy(true);
          void performAction("call_home", null).then((error) => {
            setBusy(false);
            if (error) {
              useUi.getState().pushToast(error, "bad");
              return;
            }
            setLine(awake ? nation.callHome : `${nation.greeting}… it's ${there.label} here! But it's good to hear you.`);
            useGame.getState().addMoodlet({ id: "called_home", label: "Spoke to home", emoji: "📞", value: 8 }, 720);
            useUi.getState().pushToast("+Social · You feel less far away", "good");
          });
        }}
        aria-label="Call"
      >
        📞
      </button>
      <p className="pb-2 text-[10px] text-[#9aa5b1]">Go three days without calling and you&apos;ll start missing home.</p>
    </div>
  );
}
