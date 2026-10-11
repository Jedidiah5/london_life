"use client";

import { catalogueById } from "@/lib/content";
import { itemWorld } from "@/lib/sim/grid";
import { rotatedFootprint } from "@/lib/sim/placement";
import { FittedModel } from "./fitted";

export const MODEL_HEIGHTS: Record<string, number> = {
  bedSingle: 0.6,
  bedDouble: 0.6,
  bedBunk: 1.3,
  bathtub: 0.55,
  bathroomSink: 0.85,
  bookcaseOpen: 1.5,
  chair: 0.8,
  chairDesk: 0.9,
  chairModernCushion: 0.8,
  computerScreen: 0.4,
  desk: 0.75,
  hoodModern: 0.5,
  kitchenCoffeeMachine: 0.35,
  kitchenFridge: 1.5,
  kitchenMicrowave: 0.3,
  kitchenSink: 0.9,
  lampRoundTable: 0.45,
  lampSquareFloor: 1.4,
  lampWall: 0.4,
  laptop: 0.2,
  loungeChair: 0.75,
  loungeDesignSofa: 0.75,
  loungeSofa: 0.75,
  loungeSofaLong: 0.75,
  plantSmall1: 0.4,
  pottedPlant: 1,
  radio: 0.3,
  rugRectangle: 0.03,
  rugRound: 0.03,
  shower: 1.7,
  sideTable: 0.55,
  speaker: 0.9,
  table: 0.75,
  tableCoffee: 0.4,
  tableRound: 0.75,
  televisionModern: 0.8,
  televisionVintage: 0.7,
  toilet: 0.75,
  washer: 0.9,
};

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
  const height = MODEL_HEIGHTS[file] ?? 1.5;
  return (
    <group position={position} rotation={[0, (rotation * Math.PI) / 2, 0]}>
      <FittedModel url={`/models/furniture/${file}.glb`} targetWidth={Math.max(width, depth) * 0.92} tint={colour} maxHeight={height} />
      {onClick ? (
        <mesh
          position={[0, Math.max(0.1, height) / 2, 0]}
          onClick={(event) => {
            event.stopPropagation();
            onClick();
          }}
        >
          <boxGeometry args={[width * 0.9, Math.max(0.1, height), depth * 0.9]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
      ) : null}
    </group>
  );
}
