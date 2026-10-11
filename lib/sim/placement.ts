import { findPath, tileKey } from "./path";
import type { Tile } from "./types";

export function rotatedFootprint(
  footprint: [number, number] | "wall",
  rotation: number,
): [number, number] {
  if (footprint === "wall") return [1, 1];
  const turns = ((rotation % 4) + 4) % 4;
  if (turns % 2 === 1) return [footprint[1], footprint[0]];
  return [footprint[0], footprint[1]];
}

export function coveredTiles(
  origin: Tile,
  footprint: [number, number] | "wall",
  rotation: number,
): Tile[] {
  const [width, height] = rotatedFootprint(footprint, rotation);
  const tiles: Tile[] = [];
  for (let x = 0; x < width; x += 1) {
    for (let y = 0; y < height; y += 1) {
      tiles.push({ x: origin.x + x, y: origin.y + y });
    }
  }
  return tiles;
}

export function tilesInRoom(tiles: Tile[], width: number, height: number): boolean {
  return tiles.every((tile) => tile.x >= 0 && tile.y >= 0 && tile.x < width && tile.y < height);
}

export function canPlace(
  origin: Tile,
  footprint: [number, number] | "wall",
  rotation: number,
  blocked: Set<string>,
  width: number,
  height: number,
): boolean {
  if (footprint === "wall" && origin.y !== 0) return false;
  const tiles = coveredTiles(origin, footprint, rotation);
  if (!tilesInRoom(tiles, width, height)) return false;
  return tiles.every((tile) => !blocked.has(tileKey(tile)));
}

export function nearestStand(
  targets: Tile[],
  from: Tile,
  blocked: Set<string>,
  width: number,
  height: number,
): Tile | null {
  const options: Tile[] = [];
  for (const target of targets) {
    for (const dir of [
      { x: 1, y: 0 },
      { x: -1, y: 0 },
      { x: 0, y: 1 },
      { x: 0, y: -1 },
    ]) {
      const tile = { x: target.x + dir.x, y: target.y + dir.y };
      if (tile.x < 0 || tile.y < 0 || tile.x >= width || tile.y >= height) continue;
      if (blocked.has(tileKey(tile))) continue;
      options.push(tile);
    }
  }
  const alreadyThere = options.find((option) => option.x === from.x && option.y === from.y);
  if (alreadyThere) return alreadyThere;
  options.sort((a, b) => {
    const ad = Math.abs(a.x - from.x) + Math.abs(a.y - from.y);
    const bd = Math.abs(b.x - from.x) + Math.abs(b.y - from.y);
    return ad - bd;
  });
  for (const option of options) {
    const path = findPath(from, option, blocked, width, height);
    if (path) return option;
  }
  return null;
}
