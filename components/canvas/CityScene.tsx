"use client";

import { Html } from "@react-three/drei";
import { CITY_DRESSING, venues, zoneOf } from "@/lib/content";
import { useGame } from "@/lib/store/useGame";
import { useUi } from "@/lib/store/useUi";
import { FittedModel } from "./fitted";

export function CityScene() {
  const location = useGame((state) => state.location);
  const homeId = useGame((state) => state.homeId);

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]}>
        <planeGeometry args={[42, 34]} />
        <meshStandardMaterial color="#7f8c78" />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <planeGeometry args={[42, 2.4]} />
        <meshStandardMaterial color="#3d6f8f" />
      </mesh>
      <Html position={[8.2, 0.4, 0]} center zIndexRange={[8, 0]}>
        <div className="pointer-events-none text-[10px] font-semibold tracking-[0.2em] text-[#e7f2f8]">THAMES</div>
      </Html>
      {CITY_DRESSING.map((piece, index) => (
        <group key={`${piece.model}-${index}`} position={[piece.x, 0, piece.z]} rotation={[0, piece.rotation, 0]}>
          <FittedModel
            url={`/models/city/${piece.model}.glb`}
            targetWidth={piece.model.startsWith("tree") ? 1.5 : 2.3}
          />
        </group>
      ))}
      {venues.map((venue) => {
        const here =
          (location === "home" && venue.id === "home") || (location !== "home" && location === venue.id);
        return (
          <group key={venue.id} position={[venue.x, 0, venue.z]}>
            <FittedModel url={`/models/city/${venue.model}.glb`} targetWidth={venue.kind === "park" ? 1.8 : 2.5} />
            <Html position={[0, 2.1, 0]} center zIndexRange={[8, 0]}>
              <button
                type="button"
                className={`rounded-full px-2 py-1 text-[11px] font-semibold shadow ${
                  here ? "bg-[#c8102e] text-white" : "bg-[#f4efe6] text-[#1b2838]"
                }`}
                onClick={() => {
                  if (here) {
                    useUi.getState().setNav("home");
                    return;
                  }
                  useUi.getState().setTravelTo(venue.id);
                }}
              >
                {venue.name}
              </button>
            </Html>
          </group>
        );
      })}
      <Html position={[0, 3.2, 12]} center zIndexRange={[8, 0]}>
        <div className="pointer-events-none text-xs text-[#1b2838]">
          Zone {zoneOf(location, homeId)} · tap a place
        </div>
      </Html>
    </group>
  );
}
