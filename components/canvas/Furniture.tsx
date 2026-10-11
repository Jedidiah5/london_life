"use client";

import { catalogueById } from "@/lib/content";
import { itemWorld } from "@/lib/sim/grid";
import { rotatedFootprint } from "@/lib/sim/placement";
import { FittedModel } from "./fitted";

export function FurniturePiece({
  itemId,
  model,
  x,
  y,
  rotation,
  colour,
  roomWidth,
  roomHeight,
  onClick,
}: {
  itemId: string;
  model?: string;
  x: number;
  y: number;
  rotation: number;
  colour?: string;
  roomWidth: number;
  roomHeight: number;
  onClick?: () => void;
}) {
  const item = catalogueById[itemId];
  const footprint = item?.footprint ?? ([1, 1] as [number, number]);
  const [width, depth] = rotatedFootprint(footprint, rotation);
  const position = itemWorld(x, y, footprint, rotation, roomWidth, roomHeight);
  const file = model ?? item?.model ?? "chair";
  return (
    <group position={position} rotation={[0, (rotation * Math.PI) / 2, 0]}>
      <FittedModel url={`/models/furniture/${file}.glb`} targetWidth={Math.max(width, depth) * 0.92} tint={colour} />
      {onClick ? (
        <mesh
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, 0.05, 0]}
          onClick={(event) => {
            event.stopPropagation();
            onClick();
          }}
        >
          <planeGeometry args={[width * 0.9, depth * 0.9]} />
          <meshBasicMaterial transparent opacity={0} />
        </mesh>
      ) : null}
    </group>
  );
}
