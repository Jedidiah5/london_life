"use client";

import { useMemo, useState } from "react";
import { menusById, nationalitiesById, roomLayout, venuesById, zoneOf } from "@/lib/content";
import { crowdFor } from "@/lib/crowd";
import { travelTo } from "@/lib/net/rpc";
import { formatPence } from "@/lib/sim/money";
import { travelQuote } from "@/lib/sim/travel";
import type { TravelMode } from "@/lib/sim/types";
import { useGame } from "@/lib/store/useGame";
import { useUi } from "@/lib/store/useUi";

const MODES: { mode: TravelMode; emoji: string; name: string }[] = [
  { mode: "tube", emoji: "🚇", name: "Tube" },
  { mode: "bus", emoji: "🚌", name: "Bus" },
  { mode: "walk", emoji: "🚶", name: "Walk" },
  { mode: "ride", emoji: "🚕", name: "Black cab" },
];

export function TravelModal() {
  const target = useUi((state) => state.travelTo);
  const location = useGame((state) => state.location);
  const homeId = useGame((state) => state.homeId);
  const oyster = useGame((state) => state.oysterPence);
  const balance = useGame((state) => state.balancePence);
  const hour = useGame((state) => Math.floor(state.gameMinutes / 60));
  const [mode, setMode] = useState<TravelMode>("tube");
  const [busy, setBusy] = useState(false);
  const venue = target ? venuesById[target] : undefined;
  const crowd = useMemo(
    () => (target && target !== "home" ? crowdFor(target, roomLayout(target, homeId, null), hour * 60) : []),
    [target, homeId, hour],
  );
  if (!target || !venue) return null;
  const fromZone = zoneOf(location, homeId);
  const toZone = target === "home" ? zoneOf("home", homeId) : venue.zone;
  const quote = travelQuote(fromZone, toZone, mode);
  const spots = venue.fixtures.filter((fixture) => fixture.menu);

  return (
    <section className="pointer-events-auto mx-auto w-full max-w-md rounded-3xl bg-white p-3 text-[#1b2838] shadow-2xl">
      <div className="flex items-start gap-3">
        <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-[#f1ede6] text-3xl">{venue.emoji}</div>
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-extrabold leading-tight">{venue.name}</h2>
          <p className="text-[11px] font-semibold text-[#9aa5b1]">{venue.district}</p>
          <p className="mt-0.5 text-[12px] text-[#5c6b7a]">{venue.blurb}</p>
        </div>
        <button
          type="button"
          className="grid h-8 w-8 place-items-center rounded-full bg-[#f1ede6]"
          onClick={() => useUi.getState().setTravelTo(null)}
        >
          ✕
        </button>
      </div>
      {spots.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-1">
          {spots.map((spot) => (
            <span key={spot.id} className="rounded-full bg-[#f1ede6] px-2 py-1 text-[11px] font-semibold">
              {spot.emoji ?? menusById[spot.menu ?? ""]?.emoji} {spot.label}
            </span>
          ))}
        </div>
      ) : null}
      {crowd.length > 0 ? (
        <div className="mt-2">
          <p className="text-[11px] font-bold text-[#5c6b7a]">Here now</p>
          <div className="mt-1 flex gap-1 overflow-x-auto">
            {crowd.map((member) => (
              <span key={member.local.id} className="flex shrink-0 items-center gap-1 rounded-full border border-[#ece7de] px-2 py-0.5 text-[11px]">
                {nationalitiesById[member.local.origin]?.flag} {member.local.name}
              </span>
            ))}
          </div>
        </div>
      ) : null}
      <div className="mt-3 grid grid-cols-4 gap-1.5">
        {MODES.map((entry) => {
          const option = travelQuote(fromZone, toZone, entry.mode);
          return (
            <button
              key={entry.mode}
              type="button"
              onClick={() => setMode(entry.mode)}
              className={`flex flex-col items-center rounded-2xl border-2 px-1 py-2 ${
                mode === entry.mode ? "border-[#1b2838] bg-[#f8f6f1]" : "border-transparent bg-[#f1ede6]"
              }`}
            >
              <span className="text-2xl">{entry.emoji}</span>
              <span className="text-[11px] font-bold">{entry.name}</span>
              <span className="text-[10px] font-semibold text-[#5c6b7a]">{option.pence === 0 ? "Free" : formatPence(option.pence)}</span>
              <span className="text-[10px] text-[#9aa5b1]">{option.minutes} min</span>
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-center text-[11px] text-[#5c6b7a]">
        {quote.paysWith === "oyster"
          ? `Oyster balance ${formatPence(oyster)}`
          : quote.paysWith === "balance"
            ? `From your account (${formatPence(balance)})`
            : `Costs ${quote.energy} energy`}
      </p>
      <button
        type="button"
        disabled={busy}
        className="mt-2 w-full rounded-full bg-[#c8102e] py-3 text-sm font-extrabold text-white shadow-lg disabled:opacity-50"
        onClick={() => {
          setBusy(true);
          void go(target, mode, quote.minutes).finally(() => setBusy(false));
        }}
      >
        Go · {quote.pence === 0 ? "Free" : formatPence(quote.pence)}
      </button>
    </section>
  );
}

async function go(target: string, mode: TravelMode, minutes: number): Promise<void> {
  const ui = useUi.getState();
  const error = await travelTo(target, mode);
  if (error) {
    ui.pushToast(error, "bad");
    return;
  }
  ui.setTravelTo(null);
  ui.setRide({ destination: target, mode, minutes });
}
