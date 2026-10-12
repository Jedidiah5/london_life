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

/**
 * The one-tile grid step that looks most like a screen diagonal for a camera turned
 * `yaw` quarter turns. `right` and `up` are +1 or -1 in screen terms.
 */
export function screenStep(right: 1 | -1, up: 1 | -1, yaw: number): Tile {
  const angle = (yaw * Math.PI) / 2 + Math.PI / 4;
  const forward = { x: -Math.cos(angle), y: -Math.sin(angle) };
  const side = { x: Math.sin(angle), y: -Math.cos(angle) };
  const x = forward.x * up + side.x * right;
  const y = forward.y * up + side.y * right;
  return Math.abs(x) >= Math.abs(y)
    ? { x: Math.sign(x), y: 0 }
    : { x: 0, y: Math.sign(y) };
}

export function worldToTile(
  worldX: number,
  worldZ: number,
  roomWidth: number,
  roomHeight: number,
): Tile {
  return {
    x: Math.floor(worldX + roomWidth / 2),
    y: Math.floor(worldZ + roomHeight / 2),
  };
}
