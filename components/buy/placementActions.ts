"use client";

import { catalogueById, roomLayout } from "@/lib/content";
import { buyItem, placeItem, sellItem } from "@/lib/net/rpc";
import { BIG_PURCHASE_PENCE } from "@/lib/sim/constants";
import { canPlace } from "@/lib/sim/placement";
import { blockingTiles } from "@/lib/sim/room";
import { useGame } from "@/lib/store/useGame";
import { useUi } from "@/lib/store/useUi";

/** Place the ghost, asking first if it is a big purchase. */
export function requestPlace(): void {
  const ui = useUi.getState();
  const ghost = ui.ghost;
  if (!ghost) {
    ui.pushToast("Pick an item, then tap a tile");
    return;
  }
  const item = catalogueById[ghost.itemId];
  if (!item) return;
  const balance = useGame.getState().balancePence;
  const big = !ui.movingId && (item.pricePence >= BIG_PURCHASE_PENCE || item.pricePence > balance / 2);
  if (big) {
    ui.setConfirmingBuy(true);
    return;
  }
  void confirmPlace();
}

export async function confirmPlace(): Promise<void> {
  const ui = useUi.getState();
  const game = useGame.getState();
  ui.setConfirmingBuy(false);
  const ghost = ui.ghost;
  if (!ghost) return;
  const catalogueItem = catalogueById[ghost.itemId];
  if (!catalogueItem) return;
  const layout = roomLayout(game.location, game.homeId, null);
  const blocked = blockingTiles(layout, game.inventory, ui.movingId ?? undefined);
  if (!canPlace({ x: ghost.x, y: ghost.y }, catalogueItem.footprint, ghost.rotation, blocked, layout.width, layout.height)) {
    ui.pushToast("That does not fit there", "bad");
    return;
  }
  if (ui.movingId) {
    const owned = game.inventory.find((item) => item.id === ui.movingId);
    if (!owned) return;
    const error = await placeItem({ ...owned, x: ghost.x, y: ghost.y, rotation: ghost.rotation, colour: ghost.colour });
    ui.pushToast(error ?? "Moved", error ? "bad" : "good");
    if (!error) ui.cancelPlacement();
    return;
  }
  const bought = await buyItem(ghost.itemId, ghost.colour);
  if (typeof bought === "string") {
    ui.pushToast(bought, "bad");
    return;
  }
  const error = await placeItem({ ...bought, x: ghost.x, y: ghost.y, rotation: ghost.rotation, colour: ghost.colour });
  ui.pushToast(error ?? `Bought ${catalogueItem.name}`, error ? "bad" : "good");
  if (!error) ui.setGhost(null);
}

export async function confirmSell(id: string): Promise<void> {
  const ui = useUi.getState();
  const error = await sellItem(id);
  ui.pushToast(error ?? "Sold for half", error ? "bad" : "good");
  if (!error) ui.cancelPlacement();
}
