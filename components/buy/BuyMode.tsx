"use client";

import { useState } from "react";
import { catalogueById, roomLayout } from "@/lib/content";
import { buyItem, placeItem, sellItem } from "@/lib/net/rpc";
import { BIG_PURCHASE_PENCE } from "@/lib/sim/constants";
import { formatPence } from "@/lib/sim/money";
import { canPlace } from "@/lib/sim/placement";
import { blockingTiles } from "@/lib/sim/room";
import { useGame } from "@/lib/store/useGame";
import { useUi } from "@/lib/store/useUi";
import { CatalogueGrid, ItemPicture } from "./CatalogueGrid";

export function BuyMode() {
  const nav = useUi((state) => state.nav);
  const ghost = useUi((state) => state.ghost);
  const movingId = useUi((state) => state.movingId);
  const inventory = useGame((state) => state.inventory);
  const balance = useGame((state) => state.balancePence);
  const [confirming, setConfirming] = useState(false);
  if (nav !== "buy") return null;
  const moving = inventory.find((item) => item.id === movingId);
  const item = catalogueById[ghost?.itemId ?? ""];
  const big = !moving && item ? item.pricePence >= BIG_PURCHASE_PENCE || item.pricePence > balance / 2 : false;

  return (
    <section className="pointer-events-auto overflow-hidden rounded-3xl bg-white p-3 text-[#1b2838] shadow-xl">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-base font-extrabold">{moving ? "Move or sell" : "Catalogue"}</h2>
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold text-[#5c6b7a]">{formatPence(balance)}</span>
          <button
            type="button"
            className="rounded-full bg-[#f1f3f6] px-3 py-1 text-[11px] font-semibold"
            onClick={() => useUi.getState().setNav("home")}
          >
            Done
          </button>
        </div>
      </div>
      {moving ? null : <CatalogueGrid />}
      {ghost && item ? (
        <div className="mt-2 flex items-center gap-2 rounded-2xl bg-[#f6f7f9] p-2">
          <ItemPicture item={item} colour={ghost.colour} className="h-12 w-12 shrink-0" />
          <div className="min-w-0 flex-1">
            <div className="truncate text-[12px] font-bold">{item.name}</div>
            <div className="text-[10px] text-[#5c6b7a]">Tap a floor tile to move it, then place.</div>
            {item.colours.length > 1 ? (
              <div className="mt-1 flex gap-1">
                {item.colours.map((colour) => (
                  <button
                    key={colour}
                    type="button"
                    aria-label={`Colour ${colour}`}
                    className={`h-4 w-4 rounded-full border ${ghost.colour === colour ? "ring-2 ring-[#1b2838] ring-offset-1" : "border-black/10"}`}
                    style={{ background: colour }}
                    onClick={() => useUi.getState().setGhost({ ...ghost, colour })}
                  />
                ))}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
      {confirming && item ? (
        <div className="mt-2 flex items-center gap-2 rounded-2xl bg-[#fff4d6] p-2 text-xs">
          <span className="flex-1">
            Spend <b>{formatPence(item.pricePence)}</b> on {item.name}? You&apos;ll have {formatPence(balance - item.pricePence)} left.
          </span>
          <button
            type="button"
            className="rounded-full bg-[#3ccf6e] px-3 py-1 font-bold text-white"
            onClick={() => {
              setConfirming(false);
              void confirmPlace();
            }}
          >
            Buy
          </button>
          <button type="button" className="rounded-full bg-white px-3 py-1 font-semibold" onClick={() => setConfirming(false)}>
            No
          </button>
        </div>
      ) : (
        <div className="mt-2 flex flex-wrap gap-1">
          <button type="button" className="rounded-full bg-[#1b2838] px-3 py-1.5 text-xs font-bold text-white" onClick={() => useUi.getState().rotateGhost()}>
            ↻ Rotate
          </button>
          <button
            type="button"
            className="rounded-full bg-[#3ccf6e] px-3 py-1.5 text-xs font-bold text-white"
            onClick={() => {
              if (big) setConfirming(true);
              else void confirmPlace();
            }}
          >
            {moving ? "Move here" : item ? `Place · ${formatPence(item.pricePence)}` : "Place"}
          </button>
          {moving ? (
            <button type="button" className="rounded-full bg-[#e5484d] px-3 py-1.5 text-xs font-bold text-white" onClick={() => void confirmSell(moving.id)}>
              Sell {formatPence(Math.floor((catalogueById[moving.itemId]?.pricePence ?? 0) / 2))}
            </button>
          ) : null}
        </div>
      )}
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
    if (!error) ui.setGhost(null);
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

async function confirmSell(id: string): Promise<void> {
  const ui = useUi.getState();
  const error = await sellItem(id);
  ui.pushToast(error ?? "Sold for half", error ? "bad" : "good");
  if (!error) {
    ui.setMoving(null);
    ui.setGhost(null);
  }
}
