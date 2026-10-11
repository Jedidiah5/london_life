import { rotatedFootprint } from "./placement";
import type { Tile } from "./types";

export function tileWorld(
  x: number,
  y: number,
  roomWidth: number,
  roomHeight: number,
): [number, number, number] {
  return [x - roomWidth / 2 + 0.5, 0, y - roomHeight / 2 + 0.5];
}

export function itemWorld(
  x: number,
  y: number,
  footprint: [number, number] | "wall",
  rotation: number,
  roomWidth: number,
  roomHeight: number,
): [number, number, number] {
  const [width, height] = rotatedFootprint(footprint, rotation);
  return [x + width / 2 - roomWidth / 2, 0, y + height / 2 - roomHeight / 2];
}

export function worldToTile(worldX: number, worldZ: number, roomWidth: number, roomHeight: number): Tile {
  return {
    x: Math.floor(worldX + roomWidth / 2),
    y: Math.floor(worldZ + roomHeight / 2),
  };
}
