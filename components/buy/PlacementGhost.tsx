"use client";

import { Html } from "@react-three/drei";
import { MODEL_HEIGHTS, FurniturePiece } from "@/components/canvas/Furniture";
import { catalogueById, roomLayout } from "@/lib/content";
import { itemWorld } from "@/lib/sim/grid";
import { canPlace, rotatedFootprint } from "@/lib/sim/placement";
import { blockingTiles } from "@/lib/sim/room";
import { useGame } from "@/lib/store/useGame";
import { useUi } from "@/lib/store/useUi";
import { requestPlace } from "./placementActions";

const OK = "#3ccf6e";
const BAD = "#e5484d";

export function PlacementGhost({ roomWidth, roomHeight }: { roomWidth: number; roomHeight: number }) {
  const ghost = useUi((state) => state.ghost);
  const movingId = useUi((state) => state.movingId);
  const location = useGame((state) => state.location);
  const homeId = useGame((state) => state.homeId);
  const inventory = useGame((state) => state.inventory);
  const item = ghost ? catalogueById[ghost.itemId] : undefined;
  const layout = roomLayout(location, homeId, null);
  const legal =
    ghost && item
      ? canPlace(
          { x: ghost.x, y: ghost.y },
          item.footprint,
          ghost.rotation,
          blockingTiles(layout, inventory, movingId ?? undefined),
          layout.width,
          layout.height,
        )
      : false;
  const position = ghost && item ? itemWorld(ghost.x, ghost.y, item.footprint, ghost.rotation, roomWidth, roomHeight) : null;
  const [w, d] = item && ghost ? rotatedFootprint(item.footprint, ghost.rotation) : [1, 1];
  const [, depth] = item ? rotatedFootprint(item.footprint, 0) : [1, 1];
  const height = item ? (MODEL_HEIGHTS[item.model] ?? 1.5) : 1;

  return (
    <group>
      {ghost && item && position ? (
        <group>
          <mesh position={[position[0], 0.025, position[2]]} rotation={[-Math.PI / 2, 0, 0]} raycast={() => null}>
            <planeGeometry args={[w * 0.98, d * 0.98]} />
            <meshBasicMaterial color={legal ? OK : BAD} transparent opacity={0.4} depthWrite={false} />
          </mesh>
          <group
            onClick={(event) => {
              event.stopPropagation();
              useUi.getState().rotateGhost();
            }}
          >
            <FurniturePiece
              itemId={ghost.itemId}
              x={ghost.x}
              y={ghost.y}
              rotation={ghost.rotation}
              colour={legal ? ghost.colour : "#ff8f8f"}
              roomWidth={roomWidth}
              roomHeight={roomHeight}
            />
          </group>
          <group position={[position[0], 0.04, position[2]]} rotation={[0, (ghost.rotation * Math.PI) / 2, 0]}>
            <mesh position={[0, 0, depth / 2 + 0.16]} rotation={[Math.PI / 2, 0, 0]} raycast={() => null}>
              <coneGeometry args={[0.13, 0.22, 3]} />
              <meshBasicMaterial color={legal ? OK : BAD} />
            </mesh>
          </group>
        </group>
      ) : null}
      <Html position={position ? [position[0], height + 0.45, position[2]] : [0, 0, 0]} center zIndexRange={[20, 0]}>
        <div className={`items-center gap-1 rounded-full bg-white/95 p-1 shadow-lg ${ghost && item ? "flex" : "hidden"}`}>
          <button
            type="button"
            aria-label="Rotate"
            className="grid h-8 w-8 place-items-center rounded-full bg-[#1b2838] text-base font-bold text-white"
            onClick={() => useUi.getState().rotateGhost()}
          >
            ↻
          </button>
          <button
            type="button"
            aria-label="Place here"
            disabled={!legal}
            className="grid h-8 w-8 place-items-center rounded-full bg-[#3ccf6e] text-base font-bold text-white disabled:bg-[#c9ced4]"
            onClick={requestPlace}
          >
            ✓
          </button>
          <button
            type="button"
            aria-label="Cancel"
            className="grid h-8 w-8 place-items-center rounded-full bg-[#f1f3f6] text-base font-bold text-[#1b2838]"
            onClick={() => useUi.getState().cancelPlacement()}
          >
            ✕
          </button>
        </div>
      </Html>
    </group>
  );
}
