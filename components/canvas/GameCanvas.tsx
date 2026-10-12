"use client";

import { Canvas } from "@react-three/fiber";
import { Suspense } from "react";
import { venuesById } from "@/lib/content";
import { isNight } from "@/lib/sim/clock";
import { useGame } from "@/lib/store/useGame";
import { useUi } from "@/lib/store/useUi";
import { useLondonTime } from "@/lib/useNow";
import { CityScene } from "./CityScene";
import { IsoCamera } from "./IsoCamera";
import { Rain } from "./Rain";
import { RoomScene } from "./RoomScene";

export default function GameCanvas() {
  return (
    <Canvas
      className="h-full w-full"
      shadows
      dpr={[1, 1.6]}
      camera={{ position: [12, 10, 12], fov: 30, near: 0.1, far: 300 }}
      gl={{ antialias: true, alpha: false }}
      onPointerMissed={() => undefined}
    >
      <SceneLights />
      <IsoCamera />
      <Suspense fallback={null}>
        <SceneSwitch />
      </Suspense>
    </Canvas>
  );
}

/** Subscribes inside the canvas so switching scenes never re-renders the Canvas from the DOM side. */
function SceneSwitch() {
  const map = useUi((state) => state.nav === "map");
  return (
    <>
      <color attach="background" args={[map ? "#8ea4b8" : "#7d8f80"]} />
      {map ? <CityScene /> : <RoomScene />}
      <Rain spread={map ? 36 : 14} />
    </>
  );
}

function SceneLights() {
  const hour = useLondonTime().hour;
  const location = useGame((state) => state.location);
  const nav = useUi((state) => state.nav);
  const night = isNight(hour);
  const indoorVenue = nav !== "map" && location !== "home" && Boolean(venuesById[location]?.wall);
  return (
    <>
      <ambientLight intensity={night ? (indoorVenue ? 0.55 : 0.28) : 0.72} />
      <hemisphereLight args={["#fff8ec", "#8a7a66", night ? 0.15 : 0.35]} />
      <directionalLight
        position={[6, 12, 4]}
        intensity={night ? 0.35 : 1.25}
        color={night ? "#9bb7d4" : "#fff4e0"}
        castShadow={nav !== "map"}
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.03}
        shadow-camera-left={-10}
        shadow-camera-right={10}
        shadow-camera-top={10}
        shadow-camera-bottom={-10}
        shadow-camera-near={1}
        shadow-camera-far={40}
      />
      {night ? <pointLight position={[0, 1.8, 0]} intensity={indoorVenue ? 8 : 4} distance={indoorVenue ? 14 : 8} color="#ffb15a" /> : null}
    </>
  );
}
