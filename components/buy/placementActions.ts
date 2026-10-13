"use client";

import { catalogueById, roomLayout } from "@/lib/content";
import { buyItem, placeItem, sellItem } from "@/lib/net/rpc";
import { BIG_PURCHASE_PENCE } from "@/lib/sim/constants";
import { screenStep } from "@/lib/sim/grid";
import { clampOrigin, firstFreeSpot, placementProblem, type PlacementProblem } from "@/lib/sim/placement";
import { blockingTiles } from "@/lib/sim/room";
import type { Tile } from "@/lib/sim/types";
import { useGame } from "@/lib/store/useGame";
import { useUi, type GhostPlacement } from "@/lib/store/useUi";

export const PROBLEM_TEXT: Record<PlacementProblem, string> = {
  wall: "That hangs on the back wall",
  outside: "That won't fit through the wall",
  taken: "Something's already there",
  standing: "You're standing there. Shift over first",
  boxed: "Leave a way through or you'll box yourself in",
};

function currentLayout() {
  const game = useGame.getState();
  return roomLayout(game.location, game.homeId, null);
}

/** What stops the ghost going where it is now, or null if it can go. */
export function ghostProblem(
  ghost: GhostPlacement,
  movingId: string | null,
  inventory = useGame.getState().inventory,
): PlacementProblem | null {
  const item = catalogueById[ghost.itemId];
  if (!item) return "taken";
  const game = useGame.getState();
  const layout = roomLayout(game.location, game.homeId, null);
  const blocked = blockingTiles(layout, inventory, movingId ?? undefined);
  const sim = item.blocks && game.location === "home" ? game.tile : null;
  return placementProblem(
    { x: ghost.x, y: ghost.y },
    item.footprint,
    ghost.rotation,
    blocked,
    layout.width,
    layout.height,
    sim,
  );
}

/** Nudge the ghost one tile in a screen direction, as seen from the current camera. */
export function nudgeGhost(right: 1 | -1, up: 1 | -1): void {
  const ui = useUi.getState();
  const ghost = ui.ghost;
  const item = ghost ? catalogueById[ghost.itemId] : undefined;
  if (!ghost || !item) return;
  const step = screenStep(right, up, ui.yaw);
  const layout = currentLayout();
  const next = clampOrigin(
    { x: ghost.x + step.x, y: ghost.y + step.y },
    item.footprint,
    ghost.rotation,
    layout.width,
    layout.height,
  );
  ui.setGhost({ ...ghost, ...next });
  ui.setConfirmingBuy(false);
}

/** Drop the ghost on a tapped floor tile, keeping it inside the room. */
export function moveGhostTo(tile: Tile): void {
  const ui = useUi.getState();
  const ghost = ui.ghost;
  const item = ghost ? catalogueById[ghost.itemId] : undefined;
  if (!ghost || !item) return;
  const layout = currentLayout();
  ui.setGhost({
    ...ghost,
    ...clampOrigin(tile, item.footprint, ghost.rotation, layout.width, layout.height),
  });
  ui.setConfirmingBuy(false);
}

export function turnGhost(): void {
  const ui = useUi.getState();
  const ghost = ui.ghost;
  const item = ghost ? catalogueById[ghost.itemId] : undefined;
  if (!ghost || !item) return;
  const rotation = (ghost.rotation + 1) % 4;
  const layout = currentLayout();
  const next = clampOrigin({ x: ghost.x, y: ghost.y }, item.footprint, rotation, layout.width, layout.height);
  ui.setGhost({ ...ghost, ...next, rotation });
  ui.setConfirmingBuy(false);
}

/** Start placing a catalogue item at the free spot nearest the middle of the room. */
export function startPlacing(itemId: string, colour?: string): boolean {
  const ui = useUi.getState();
  const game = useGame.getState();
  const item = catalogueById[itemId];
  if (!item) return false;
  const layout = currentLayout();
  const blocked = blockingTiles(layout, game.inventory);
  const sim = item.blocks && game.location === "home" ? game.tile : null;
  ui.selectCatalogue(item.id);
  for (const rotation of [0, 1]) {
    const spot = firstFreeSpot(item.footprint, rotation, blocked, layout.width, layout.height, sim);
    if (!spot) continue;
    ui.setGhost({ itemId: item.id, x: spot.x, y: spot.y, rotation, colour: colour ?? item.colours[0] ?? "#f4f1ea" });
    return true;
  }
  ui.pushToast("No room for that. Sell something first", "bad");
  return false;
}

/** Place the ghost. A big purchase needs a second tap to say yes. */
export function requestPlace(another = false): void {
  const ui = useUi.getState();
  const ghost = ui.ghost;
  if (!ghost) {
    ui.pushToast("Pick an item, then tap a tile");
    return;
  }
  const item = catalogueById[ghost.itemId];
  if (!item) return;
  const problem = ghostProblem(ghost, ui.movingId);
  if (problem) {
    ui.pushToast(PROBLEM_TEXT[problem], "bad");
    return;
  }
  const balance = useGame.getState().balancePence;
  const big = !ui.movingId && (item.pricePence >= BIG_PURCHASE_PENCE || item.pricePence > balance / 2);
  if (big && !ui.confirmingBuy) {
    ui.setConfirmingBuy(true);
    return;
  }
  void confirmPlace(another);
}

export async function confirmPlace(another = false): Promise<void> {
  const ui = useUi.getState();
  const game = useGame.getState();
  ui.setConfirmingBuy(false);
  const ghost = ui.ghost;
  if (!ghost) return;
  const catalogueItem = catalogueById[ghost.itemId];
  if (!catalogueItem) return;
  const problem = ghostProblem(ghost, ui.movingId);
  if (problem) {
    ui.pushToast(PROBLEM_TEXT[problem], "bad");
    return;
  }
  if (ui.movingId) {
    const owned = game.inventory.find((item) => item.id === ui.movingId);
    if (!owned) return;
    const error = await placeItem({
      ...owned,
      x: ghost.x,
      y: ghost.y,
      rotation: ghost.rotation,
      colour: ghost.colour,
    });
    ui.pushToast(error ?? "Moved", error ? "bad" : "good");
    if (error) return;
    ui.cancelPlacement();
    ui.setCatalogueHidden(true);
    return;
  }
  const bought = await buyItem(ghost.itemId, ghost.colour);
  if (typeof bought === "string") {
    ui.pushToast(bought, "bad");
    return;
  }
  const error = await placeItem({
    ...bought,
    x: ghost.x,
    y: ghost.y,
    rotation: ghost.rotation,
    colour: ghost.colour,
  });
  ui.pushToast(error ?? `Bought ${catalogueItem.name}`, error ? "bad" : "good");
  if (error) return;
  if (another && startPlacing(ghost.itemId, ghost.colour)) return;
  ui.cancelPlacement();
  ui.setCatalogueHidden(true);
}

export async function confirmSell(id: string): Promise<void> {
  const ui = useUi.getState();
  const error = await sellItem(id);
  ui.pushToast(error ?? "Sold for half", error ? "bad" : "good");
  if (!error) ui.cancelPlacement();
}
