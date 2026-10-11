import { localsAt, type RoomLayout } from "@/lib/content";
import { tileKey } from "@/lib/sim/path";
import { blockingTiles } from "@/lib/sim/room";
import type { Anim, LocalDef, Tile } from "@/lib/sim/types";

export interface CrowdMember {
  local: LocalDef;
  tile: Tile;
  anim: Anim;
  facing: number;
}

function hash(text: string): number {
  let value = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    value ^= text.charCodeAt(i);
    value = Math.imul(value, 16777619);
  }
  return value >>> 0;
}

/** Who is hanging out at a venue this game hour. Stable within the hour so nobody teleports. */
export function crowdFor(venueId: string, layout: RoomLayout, gameMinutes: number, max = 5): CrowdMember[] {
  if (venueId === "home") return [];
  const hour = Math.floor(gameMinutes / 60);
  const pool = localsAt(venueId)
    .map((local) => ({ local, order: hash(`${local.id}:${venueId}:${hour}`) }))
    .sort((a, b) => a.order - b.order)
    .slice(0, max);
  const blocked = blockingTiles(layout, []);
  const taken = new Set<string>(["2,2"]);
  const crowd: CrowdMember[] = [];
  for (const { local, order } of pool) {
    let tile: Tile | null = null;
    for (let attempt = 0; attempt < layout.width * layout.height; attempt += 1) {
      const index = (order + attempt * 7) % (layout.width * layout.height);
      const candidate = { x: index % layout.width, y: Math.floor(index / layout.width) };
      const key = tileKey(candidate);
      if (blocked.has(key) || taken.has(key)) continue;
      tile = candidate;
      break;
    }
    if (!tile) continue;
    taken.add(tileKey(tile));
    const food = venueId === "brixton" || venueId === "camden" || venueId === "pub";
    const anims: Anim[] = food ? ["stand", "eat", "stand", "sit"] : ["stand", "sit", "work", "stand"];
    crowd.push({
      local,
      tile,
      anim: venueId === "pub" && order % 5 === 0 ? "dance" : (anims[order % anims.length] ?? "stand"),
      facing: ((order % 8) / 8) * Math.PI * 2,
    });
  }
  return crowd;
}
