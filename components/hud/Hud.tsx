"use client";

import { BuyMode } from "@/components/buy/BuyMode";
import { PhoneOverlay } from "@/components/phone/PhoneOverlay";
import { TravelModal } from "@/components/travel/TravelModal";
import { EventModal } from "@/components/venue/EventModal";
import { PersonCard } from "@/components/venue/PersonCard";
import { SpotPanel } from "@/components/venue/SpotPanel";
import { VenuePanel } from "@/components/venue/VenuePanel";
import { useGame } from "@/lib/store/useGame";
import { MAP_ZOOM_MAX, useUi } from "@/lib/store/useUi";
import { ActionChip } from "./ActionChip";
import { ActionSheet } from "./ActionSheet";
import { BottomNav } from "./BottomNav";
import { GoalCards } from "./GoalCards";
import { MinusIcon, PlusIcon, RecentreIcon, RotateIcon } from "./icons";
import { NeedsPanel } from "./NeedsPanel";
import { SimPanel } from "./SimPanel";
import { Toasts } from "./Toasts";
import { TopBar } from "./TopBar";

function MapControls() {
  const nav = useUi((state) => state.nav);
  const travelTo = useUi((state) => state.travelTo);
  const mapZoom = useUi((state) => state.mapZoom);
  const moved = useUi((state) => state.mapZoom !== 1 || state.mapPan.x !== 0 || state.mapPan.z !== 0);
  if (nav !== "map" || travelTo) return null;
  const button =
    "grid h-11 w-11 place-items-center text-[#1b2838] disabled:text-[#1b2838]/30 active:bg-black/5 first:rounded-t-full last:rounded-b-full";
  return (
    <div className="pointer-events-auto absolute bottom-[10.5rem] right-3 flex flex-col divide-y divide-black/10 rounded-full bg-white/95 shadow-lg">
      <button
        type="button"
        aria-label="Zoom in"
        className={button}
        disabled={mapZoom >= MAP_ZOOM_MAX}
        onClick={() => useUi.getState().setMapZoom(mapZoom * 1.5)}
      >
        <PlusIcon className="h-5 w-5" />
      </button>
      <button
        type="button"
        aria-label="Zoom out"
        className={button}
        disabled={mapZoom <= 1}
        onClick={() => useUi.getState().setMapZoom(mapZoom / 1.5)}
      >
        <MinusIcon className="h-5 w-5" />
      </button>
      <button
        type="button"
        aria-label="Show the whole city"
        className={button}
        disabled={!moved}
        onClick={() => useUi.getState().resetMap()}
      >
        <RecentreIcon className="h-5 w-5" />
      </button>
    </div>
  );
}

export function Hud() {
  const visit = useUi((state) => state.visit);
  const phoneOpen = useUi((state) => state.nav === "phone");
  return (
    <div className="pointer-events-none absolute inset-0 z-10 flex flex-col justify-between p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      <div className="space-y-2">
        <TopBar />
        <div className="flex items-start justify-between gap-2">
          <div className={phoneOpen ? "hidden" : "space-y-2"}>
            <GoalCards />
            <ActionChip />
          </div>
          <Toasts />
        </div>
        {visit ? (
          <button
            type="button"
            className="pointer-events-auto rounded-full bg-[#1b2838] px-3 py-1 text-xs text-white"
            onClick={() => {
              useUi.getState().setVisit(null);
              useGame.getState().setReadOnly(false);
            }}
          >
            Leave {visit.name}&apos;s flat
          </button>
        ) : null}
      </div>
      <div className="mx-auto w-full max-w-md space-y-2">
        <ActionSheet />
        <SpotPanel />
        <PersonCard />
        <VenuePanel />
        <TravelModal />
        <BuyMode />
        <PhoneOverlay />
        <NeedsPanel />
        <BottomNav />
      </div>
      <EventModal />
      <SimPanel />
      <MapControls />
      <button
        type="button"
        aria-label="Turn camera"
        title="Turn camera (or drag the room)"
        className="pointer-events-auto absolute bottom-28 right-3 grid h-11 w-11 place-items-center rounded-full bg-white/95 text-[#1b2838] shadow-lg"
        onClick={() => useUi.getState().rotateYaw()}
      >
        <RotateIcon className="h-5 w-5" />
      </button>
    </div>
  );
}
