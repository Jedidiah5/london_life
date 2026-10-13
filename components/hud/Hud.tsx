"use client";

import { BuyMode } from "@/components/buy/BuyMode";
import { PhoneOverlay } from "@/components/phone/PhoneOverlay";
import { TravelModal } from "@/components/travel/TravelModal";
import { EventModal } from "@/components/venue/EventModal";
import { PersonCard } from "@/components/venue/PersonCard";
import { SpotPanel } from "@/components/venue/SpotPanel";
import { VenuePanel } from "@/components/venue/VenuePanel";
import { useGame } from "@/lib/store/useGame";
import { useUi } from "@/lib/store/useUi";
import { ActionChip } from "./ActionChip";
import { ActionSheet } from "./ActionSheet";
import { BottomNav } from "./BottomNav";
import { GoalCards } from "./GoalCards";
import { RotateIcon } from "./icons";
import { NeedsPanel } from "./NeedsPanel";
import { SimPanel } from "./SimPanel";
import { Toasts } from "./Toasts";
import { TopBar } from "./TopBar";

export function Hud() {
  const visit = useUi((state) => state.visit);
  return (
    <div className="pointer-events-none absolute inset-0 z-10 flex flex-col justify-between p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      <div className="space-y-2">
        <TopBar />
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-2">
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
