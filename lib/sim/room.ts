import { catalogueById, type RoomLayout } from "@/lib/content";
import { coveredTiles } from "@/lib/sim/placement";
import { tileKey } from "@/lib/sim/path";
import type { InventoryItem, Tile } from "@/lib/sim/types";

export function blockingTiles(
  layout: RoomLayout,
  inventory: InventoryItem[],
  ignoreInventoryId?: string,
): Set<string> {
  const blocked = new Set<string>();
  for (const fixture of layout.fixtures) {
    if (!fixture.blocks) continue;
    const footprint = catalogueById[fixture.itemId]?.footprint ?? ([1, 1] as [number, number]);
    for (const tile of coveredTiles({ x: fixture.x, y: fixture.y }, footprint, fixture.rotation)) {
      blocked.add(tileKey(tile));
    }
  }
  for (const owned of inventory) {
    if (!owned.placed || owned.id === ignoreInventoryId) continue;
    const item = catalogueById[owned.itemId];
    if (!item?.blocks) continue;
    for (const tile of coveredTiles({ x: owned.x, y: owned.y }, item.footprint, owned.rotation)) {
      blocked.add(tileKey(tile));
    }
  }
  return blocked;
}

export function tileInside(tile: Tile, width: number, height: number): boolean {
  return tile.x >= 0 && tile.y >= 0 && tile.x < width && tile.y < height;
}
