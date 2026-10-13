"use client";

import { FurniturePiece } from "@/components/canvas/Furniture";
import { catalogueById } from "@/lib/content";
import { itemWorld } from "@/lib/sim/grid";
import { rotatedFootprint } from "@/lib/sim/placement";
import { useGame } from "@/lib/store/useGame";
import { useUi } from "@/lib/store/useUi";
import { ghostProblem, turnGhost } from "./placementActions";

const OK = "#3ccf6e";
const BAD = "#e5484d";

export function PlacementGhost({ roomWidth, roomHeight }: { roomWidth: number; roomHeight: number }) {
  const ghost = useUi((state) => state.ghost);
  const movingId = useUi((state) => state.movingId);
  const inventory = useGame((state) => state.inventory);
  useGame((state) => state.tile);
  const item = ghost ? catalogueById[ghost.itemId] : undefined;
  if (!ghost || !item) return null;
  const legal = ghostProblem(ghost, movingId, inventory) === null;
  const position = itemWorld(ghost.x, ghost.y, item.footprint, ghost.rotation, roomWidth, roomHeight);
  const [w, d] = rotatedFootprint(item.footprint, ghost.rotation);
  const [, depth] = rotatedFootprint(item.footprint, 0);

  return (
    <group>
      <mesh position={[position[0], 0.025, position[2]]} rotation={[-Math.PI / 2, 0, 0]} raycast={() => null}>
        <planeGeometry args={[w * 0.98, d * 0.98]} />
        <meshBasicMaterial color={legal ? OK : BAD} transparent opacity={0.45} depthWrite={false} />
      </mesh>
      <group
        onClick={(event) => {
          event.stopPropagation();
          turnGhost();
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
  );
}
