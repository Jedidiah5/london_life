import type { Tile } from "./types";

export function tileKey(tile: Tile): string {
  return `${tile.x},${tile.y}`;
}

const DIRS: Tile[] = [
  { x: 1, y: 0 },
  { x: -1, y: 0 },
  { x: 0, y: 1 },
  { x: 0, y: -1 },
];

function heuristic(a: Tile, b: Tile): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

function reconstruct(came: Map<string, string | null>, goal: Tile): Tile[] {
  const out: Tile[] = [];
  let current: string | null = tileKey(goal);
  while (current) {
    const [x, y] = current.split(",").map(Number);
    out.push({ x: x ?? 0, y: y ?? 0 });
    const prev: string | null = came.get(current) ?? null;
    if (prev == null) break;
    current = prev;
  }
  out.reverse();
  out.shift();
  return out;
}

export function findPath(
  start: Tile,
  goal: Tile,
  blocked: Set<string>,
  width: number,
  height: number,
): Tile[] | null {
  if (start.x === goal.x && start.y === goal.y) return [];
  if (goal.x < 0 || goal.y < 0 || goal.x >= width || goal.y >= height) return null;
  if (blocked.has(tileKey(goal))) return null;

  const open: Tile[] = [start];
  const came = new Map<string, string | null>();
  const cost = new Map<string, number>();
  came.set(tileKey(start), null);
  cost.set(tileKey(start), 0);

  while (open.length > 0) {
    open.sort((a, b) => {
      const af = (cost.get(tileKey(a)) ?? 0) + heuristic(a, goal);
      const bf = (cost.get(tileKey(b)) ?? 0) + heuristic(b, goal);
      return af - bf;
    });
    const current = open.shift();
    if (!current) break;
    if (current.x === goal.x && current.y === goal.y) return reconstruct(came, current);

    for (const dir of DIRS) {
      const next = { x: current.x + dir.x, y: current.y + dir.y };
      if (next.x < 0 || next.y < 0 || next.x >= width || next.y >= height) continue;
      const nextKey = tileKey(next);
      if (blocked.has(nextKey)) continue;
      const nextCost = (cost.get(tileKey(current)) ?? 0) + 1;
      if (nextCost < (cost.get(nextKey) ?? Infinity)) {
        cost.set(nextKey, nextCost);
        came.set(nextKey, tileKey(current));
        if (!open.some((tile) => tile.x === next.x && tile.y === next.y)) open.push(next);
      }
    }
  }

  return null;
}
