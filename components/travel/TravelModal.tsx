"use client";

import { venuesById, zoneOf } from "@/lib/content";
import { travelTo } from "@/lib/net/rpc";
import { formatPence } from "@/lib/sim/money";
import { travelQuote } from "@/lib/sim/travel";
import type { TravelMode } from "@/lib/sim/types";
import { useGame } from "@/lib/store/useGame";
import { useUi } from "@/lib/store/useUi";

const MODES: TravelMode[] = ["tube", "bus", "walk", "ride"];

export function TravelModal() {
  const target = useUi((state) => state.travelTo);
  const location = useGame((state) => state.location);
  const homeId = useGame((state) => state.homeId);
  const cloud = useGame((state) => state.cloud);
  if (!target) return null;
  const venue = venuesById[target];
  if (!venue) return null;
  const fromZone = zoneOf(location, homeId);
  const toZone = target === "home" ? zoneOf("home", homeId) : venue.zone;

  return (
    <section className="pointer-events-auto rounded-2xl bg-[#f4efe6] p-3 text-[#1b2838] shadow-lg">
      <div className="mb-1 flex items-start justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold">{venue.name}</h2>
          <p className="text-[11px] text-[#5c6b7a]">{venue.blurb}</p>
        </div>
        <button type="button" className="text-xs" onClick={() => useUi.getState().setTravelTo(null)}>
          Close
        </button>
      </div>
      <div className="grid grid-cols-2 gap-1">
        {MODES.map((mode) => {
          const quote = travelQuote(fromZone, toZone, mode);
          return (
            <button
              key={mode}
              type="button"
              className="rounded-xl bg-white px-2 py-2 text-left text-xs"
              onClick={() => void go(target, mode, quote.energy, quote.minutes)}
            >
              <div className="font-semibold">{quote.label}</div>
              <div>{quote.pence === 0 ? "Free" : formatPence(quote.pence)}</div>
              <div className="text-[10px] text-[#5c6b7a]">{quote.minutes} min · {cloud ? "" : "this device"}</div>
            </button>
          );
        })}
      </div>
    </section>
  );
}

async function go(target: string, mode: TravelMode, energy: number, minutes: number): Promise<void> {
  const ui = useUi.getState();
  const game = useGame.getState();
  const destination = target === "home" ? "home" : target;
  if (!game.cloud) {
    game.setLocation(destination, energy);
    soaked(mode, minutes);
    ui.setTravelTo(null);
    ui.setNav("home");
    return;
  }
  const error = await travelTo(destination, mode);
  if (error) {
    ui.pushToast(error);
    return;
  }
  soaked(mode, minutes);
  ui.setTravelTo(null);
  ui.setNav("home");
}

function soaked(mode: TravelMode, minutes: number): void {
  const game = useGame.getState();
  if (mode === "tube" && Math.random() < 0.45) {
    useUi.getState().pushToast("Minor delays on the Central line");
  }
  if (mode !== "ride") {
    game.addMoodlet({
      id: "rain",
      label: "Got rained on",
      emoji: "🌧️",
      value: -10,
      expiresAtGameMinute: game.gameMinutes + Math.max(30, minutes),
    });
  }
  useUi.getState().pushToast(mode === "walk" ? "You walk it" : "Mind the gap");
}
