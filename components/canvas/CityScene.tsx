"use client";

import { CITY_DRESSING, venues } from "@/lib/content";
import { useGame } from "@/lib/store/useGame";
import { useUi } from "@/lib/store/useUi";
import { FittedModel } from "./fitted";
import { ScreenLabel } from "./ScreenLabel";

const ROADS_X = [-14, -8.5, -3, 3.5, 9.5, 14.5];
const ROADS_Z = [-10, -4.5, 5.5, 9.5];

export function CityScene() {
  const location = useGame((state) => state.location);
  const travelTo = useUi((state) => state.travelTo);

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]}>
        <planeGeometry args={[44, 36]} />
        <meshStandardMaterial color="#8d9a84" />
      </mesh>
      {ROADS_X.map((x) => (
        <mesh key={`rx${x}`} rotation={[-Math.PI / 2, 0, 0]} position={[x, -0.02, 0]} raycast={() => null}>
          <planeGeometry args={[0.9, 34]} />
          <meshStandardMaterial color="#5d6066" />
        </mesh>
      ))}
      {ROADS_Z.map((z) => (
        <mesh key={`rz${z}`} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.019, z]} raycast={() => null}>
          <planeGeometry args={[42, 0.9]} />
          <meshStandardMaterial color="#5d6066" />
        </mesh>
      ))}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-11, -0.015, 1]} raycast={() => null}>
        <planeGeometry args={[6, 4.5]} />
        <meshStandardMaterial color="#5f8f4e" />
      </mesh>
      {[
        [-18, 2.2, 0.2],
        [-9, 0.6, -0.15],
        [0, -0.4, 0],
        [9, 0.6, 0.2],
        [18, -0.6, -0.1],
      ].map(([x, z, r], index) => (
        <mesh
          key={index}
          rotation={[-Math.PI / 2, 0, r ?? 0]}
          position={[x ?? 0, 0, (z ?? 0) - 1]}
          raycast={() => null}
        >
          <planeGeometry args={[9.6, 2.6]} />
          <meshStandardMaterial color="#3d6f8f" />
        </mesh>
      ))}
      <ScreenLabel position={[6, 0.3, -1]}>
        <div className="pointer-events-none text-[10px] font-bold tracking-[0.3em] text-[#e7f2f8]">RIVER THAMES</div>
      </ScreenLabel>
      {CITY_DRESSING.map((piece, index) => (
        <group key={`${piece.model}-${index}`} position={[piece.x, 0, piece.z]} rotation={[0, piece.rotation, 0]}>
          <FittedModel
            url={`/models/city/${piece.model}.glb`}
            targetWidth={piece.model.startsWith("tree") ? 1.4 : 2.2}
          />
        </group>
      ))}
      {venues.map((venue) => {
        const here = location === venue.id;
        const selected = travelTo === venue.id;
        return (
          <group key={venue.id} position={[venue.x, 0, venue.z]}>
            <FittedModel url={`/models/city/${venue.model}.glb`} targetWidth={venue.kind === "park" ? 1.8 : 2.5} />
            <ScreenLabel position={[0, 2.4, 0]}>
              <button
                type="button"
                className="flex flex-col items-center"
                onClick={() => {
                  if (here) {
                    useUi.getState().setNav("home");
                    return;
                  }
                  useUi.getState().setTravelTo(venue.id);
                }}
              >
                <span
                  className={`grid h-11 w-11 place-items-center rounded-full border-[3px] text-xl shadow-lg transition ${
                    here
                      ? "border-[#3ccf6e] bg-white"
                      : selected
                        ? "scale-110 border-[#c8102e] bg-white"
                        : "border-white bg-white"
                  }`}
                >
                  {venue.emoji}
                </span>
                <span className="mt-0.5 whitespace-nowrap rounded-full bg-[#1b2838]/85 px-2 py-0.5 text-[10px] font-bold text-white">
                  {here ? "📍 You're here" : venue.name}
                </span>
              </button>
            </ScreenLabel>
          </group>
        );
      })}
    </group>
  );
}
