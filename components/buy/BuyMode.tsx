"use client";

import { catalogueById, roomLayout } from "@/lib/content";
import { buyItem, placeItem, sellItem } from "@/lib/net/rpc";
import { formatPence } from "@/lib/sim/money";
import { canPlace } from "@/lib/sim/placement";
import { blockingTiles } from "@/lib/sim/room";
import { useGame } from "@/lib/store/useGame";
import { useUi } from "@/lib/store/useUi";
import { CatalogueGrid } from "./CatalogueGrid";

export function BuyMode() {
  const nav = useUi((state) => state.nav);
  const ghost = useUi((state) => state.ghost);
  const movingId = useUi((state) => state.movingId);
  const cloud = useGame((state) => state.cloud);
  const inventory = useGame((state) => state.inventory);
  if (nav !== "buy") return null;
  const moving = inventory.find((item) => item.id === movingId);
  const item = catalogueById[ghost?.itemId ?? ""];

  return (
    <section className="pointer-events-auto max-h-[46vh] overflow-hidden rounded-2xl bg-[#f4efe6]/95 p-3 text-[#1b2838] shadow-lg">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-semibold">Buy</h2>
        <span className="text-[11px]">{cloud ? "Prices are charged by the server" : "Preview only until Supabase is connected"}</span>
      </div>
      <CatalogueGrid />
      <div className="mt-2 flex flex-wrap gap-1">
        <button type="button" className="rounded-full bg-[#1b2838] px-3 py-1 text-xs text-[#f4efe6]" onClick={() => useUi.getState().rotateGhost()}>
          Rotate
        </button>
        <button
          type="button"
          className="rounded-full bg-[#2f6b4f] px-3 py-1 text-xs text-white"
          onClick={() => void confirmPlace()}
        >
          {moving ? "Move" : item ? `Place ${formatPence(item.pricePence)}` : "Place"}
        </button>
        {moving ? (
          <button type="button" className="rounded-full bg-[#c8102e] px-3 py-1 text-xs text-white" onClick={() => void confirmSell(moving.id)}>
            Sell {item ? formatPence(Math.floor((catalogueById[moving.itemId]?.pricePence ?? 0) / 2)) : ""}
          </button>
        ) : null}
      </div>
    </section>
  );
}

async function confirmPlace(): Promise<void> {
  const ui = useUi.getState();
  const game = useGame.getState();
  const ghost = ui.ghost;
  if (!ghost) {
    ui.pushToast("Pick an item, then tap a tile");
    return;
  }
  if (!game.cloud) {
    ui.pushToast("Connect Supabase before money can move");
    return;
  }
  const catalogueItem = catalogueById[ghost.itemId];
  if (!catalogueItem) return;
  const layout = roomLayout(game.location, game.homeId, null);
  const blocked = blockingTiles(layout, game.inventory, ui.movingId ?? undefined);
  if (!canPlace({ x: ghost.x, y: ghost.y }, catalogueItem.footprint, ghost.rotation, blocked, layout.width, layout.height)) {
    ui.pushToast("That does not fit");
    return;
  }
  if (ui.movingId) {
    const owned = game.inventory.find((item) => item.id === ui.movingId);
    if (!owned) return;
    const error = await placeItem({ ...owned, x: ghost.x, y: ghost.y, rotation: ghost.rotation, colour: ghost.colour });
    ui.pushToast(error ?? "Moved");
    if (!error) ui.setGhost(null);
    return;
  }
  const bought = await buyItem(ghost.itemId, ghost.colour);
  if (typeof bought === "string") {
    ui.pushToast(bought);
    return;
  }
  const error = await placeItem({ ...bought, x: ghost.x, y: ghost.y, rotation: ghost.rotation, colour: ghost.colour });
  ui.pushToast(error ?? `Bought ${catalogueItem.name}`);
  if (!error) ui.setGhost(null);
}

async function confirmSell(id: string): Promise<void> {
  const ui = useUi.getState();
  if (!useGame.getState().cloud) {
    ui.pushToast("Connect Supabase before money can move");
    return;
  }
  const error = await sellItem(id);
  ui.pushToast(error ?? "Sold for half");
  if (!error) {
    ui.setMoving(null);
    ui.setGhost(null);
  }
}
