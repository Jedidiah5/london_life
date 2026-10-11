"use client";

import { BuyMode } from "@/components/buy/BuyMode";
import { PhoneOverlay } from "@/components/phone/PhoneOverlay";
import { TravelModal } from "@/components/travel/TravelModal";
import { useGame } from "@/lib/store/useGame";
import { useUi } from "@/lib/store/useUi";
import { BottomNav } from "./BottomNav";
import { GoalCards } from "./GoalCards";
import { NeedsPanel } from "./NeedsPanel";
import { Toasts } from "./Toasts";
import { TopBar } from "./TopBar";

export function Hud() {
  const visit = useUi((state) => state.visit);
  const cloud = useGame((state) => state.cloud);
  return (
    <div className="pointer-events-none absolute inset-0 z-10 flex flex-col justify-between p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      <div className="space-y-2">
        <TopBar />
        <div className="flex items-start justify-between gap-2">
          <GoalCards />
          <Toasts />
        </div>
        {!cloud ? (
          <div className="pointer-events-none text-[11px] text-[#1b2838]">
            On this device only. Add Supabase in .env.local to save money.
          </div>
        ) : null}
        {visit ? (
          <button
            type="button"
            className="pointer-events-auto rounded-full bg-[#1b2838] px-3 py-1 text-xs text-[#f4efe6]"
            onClick={() => {
              useUi.getState().setVisit(null);
              useGame.getState().setReadOnly(false);
            }}
          >
            Leave {visit.name}&apos;s flat
          </button>
        ) : null}
      </div>
      <div className="space-y-2">
        <TravelModal />
        <BuyMode />
        <PhoneOverlay />
        <div className="flex items-end justify-between gap-2">
          <NeedsPanel />
          <div className="w-44" />
        </div>
        <BottomNav />
      </div>
    </div>
  );
}
