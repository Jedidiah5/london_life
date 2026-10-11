"use client";

import { Canvas } from "@react-three/fiber";
import { Suspense } from "react";
import { venuesById } from "@/lib/content";
import { clockParts, isNight } from "@/lib/sim/clock";
import { useGame } from "@/lib/store/useGame";
import { useUi } from "@/lib/store/useUi";
import { CityScene } from "./CityScene";
import { IsoCamera } from "./IsoCamera";
import { Rain } from "./Rain";
import { RoomScene } from "./RoomScene";

export default function GameCanvas() {
  const nav = useUi((state) => state.nav);
  const map = nav === "map";

  return (
    <Canvas
      className="h-full w-full"
      orthographic
      dpr={[1, 1.6]}
      camera={{ position: [12, 10, 12], zoom: 46, near: 0.1, far: 200 }}
      gl={{ antialias: true, alpha: false }}
      onPointerMissed={() => undefined}
    >
      <color attach="background" args={[map ? "#8ea4b8" : "#7d8f80"]} />
      <SceneLights />
      <IsoCamera />
      <Suspense fallback={null}>
        {map ? <CityScene /> : <RoomScene />}
        <Rain spread={map ? 36 : 14} />
      </Suspense>
    </Canvas>
  );
}

function SceneLights() {
  const hour = clockParts(useGame((state) => state.gameMinutes)).hour;
  const location = useGame((state) => state.location);
  const nav = useUi((state) => state.nav);
  const night = isNight(hour);
  const indoorVenue = nav !== "map" && location !== "home" && Boolean(venuesById[location]?.wall);
  return (
    <>
      <ambientLight intensity={night ? (indoorVenue ? 0.55 : 0.28) : 0.72} />
      <directionalLight position={[6, 10, 4]} intensity={night ? 0.35 : 1.15} color={night ? "#9bb7d4" : "#fff4e0"} />
      {night ? <pointLight position={[0, 1.8, 0]} intensity={indoorVenue ? 8 : 4} distance={indoorVenue ? 14 : 8} color="#ffb15a" /> : null}
    </>
  );
}
