"use client";

import { catalogueById } from "@/lib/content";
import { itemWorld } from "@/lib/sim/grid";
import { canPlace } from "@/lib/sim/placement";
import { blockingTiles } from "@/lib/sim/room";
import { roomLayout } from "@/lib/content";
import { useGame } from "@/lib/store/useGame";
import { useUi } from "@/lib/store/useUi";

export function PlacementGhost({ roomWidth, roomHeight }: { roomWidth: number; roomHeight: number }) {
  const ghost = useUi((state) => state.ghost);
  const movingId = useUi((state) => state.movingId);
  const location = useGame((state) => state.location);
  const homeId = useGame((state) => state.homeId);
  const inventory = useGame((state) => state.inventory);
  if (!ghost) return null;
  const item = catalogueById[ghost.itemId];
  if (!item) return null;
  const layout = roomLayout(location, homeId, null);
  const blocked = blockingTiles(layout, inventory, movingId ?? undefined);
  const legal = canPlace(
    { x: ghost.x, y: ghost.y },
    item.footprint,
    ghost.rotation,
    blocked,
    layout.width,
    layout.height,
  );
  const position = itemWorld(ghost.x, ghost.y, item.footprint, ghost.rotation, roomWidth, roomHeight);
  const [w, h] = item.footprint === "wall" ? [1, 1] : item.footprint;
  return (
    <mesh position={[position[0], 0.08, position[2]]}>
      <boxGeometry args={[item.footprint === "wall" ? 1 : ghost.rotation % 2 === 1 ? h : w, 0.08, item.footprint === "wall" ? 1 : ghost.rotation % 2 === 1 ? w : h]} />
      <meshStandardMaterial color={legal ? "#2f6b4f" : "#c8102e"} transparent opacity={0.45} />
    </mesh>
  );
}
