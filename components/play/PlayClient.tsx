"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { CharacterCreator } from "@/components/create/CharacterCreator";
import { Hud } from "@/components/hud/Hud";
import { refreshState } from "@/lib/net/rpc";
import { useGame } from "@/lib/store/useGame";
import { useUi } from "@/lib/store/useUi";
import { SimLoop } from "./SimLoop";

const GameCanvas = dynamic(() => import("@/components/canvas/GameCanvas"), { ssr: false });
const RideScene = dynamic(() => import("@/components/travel/RideScene").then((mod) => mod.RideScene), { ssr: false });

export function PlayClient() {
  const [ready, setReady] = useState(false);
  const created = useGame((state) => state.created);

  useEffect(() => {
    let alive = true;
    void (async () => {
      if (useGame.persist.hasHydrated()) {
        /* cache already available */
      } else {
        await useGame.persist.rehydrate();
      }
      const error = await refreshState();
      if (error) useUi.getState().pushToast(error, "bad");
      if (alive) setReady(true);
    })();
    return () => {
      alive = false;
    };
  }, []);

  if (!ready) {
    return (
      <div className="grid h-dvh place-items-center bg-[#1b2838] text-[#f4efe6]">
        <p className="text-sm tracking-[0.2em]">LONDON LIFE</p>
      </div>
    );
  }

  if (!created) return <CharacterCreator />;

  return (
    <div className="relative h-dvh w-full overflow-hidden bg-[#8ea4b8]">
      <GameCanvas />
      <Hud />
      <RideScene />
      <SimLoop />
    </div>
  );
}
