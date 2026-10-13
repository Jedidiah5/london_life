"use client";

import { useEffect } from "react";
import { catalogueById } from "@/lib/content";
import { formatPence } from "@/lib/sim/money";
import { useGame } from "@/lib/store/useGame";
import { useUi } from "@/lib/store/useUi";
import { CatalogueGrid, ItemPicture } from "./CatalogueGrid";
import { PROBLEM_TEXT, confirmSell, ghostProblem, nudgeGhost, requestPlace, turnGhost } from "./placementActions";

const KEY_STEPS: Record<string, [1 | -1, 1 | -1]> = {
  ArrowUp: [1, 1],
  ArrowRight: [1, -1],
  ArrowDown: [-1, -1],
  ArrowLeft: [-1, 1],
};

function usePlacementKeys(active: boolean) {
  useEffect(() => {
    if (!active) return;
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) return;
      const step = KEY_STEPS[event.key];
      if (step) {
        event.preventDefault();
        nudgeGhost(step[0], step[1]);
      } else if (event.key === "r" || event.key === "R") {
        turnGhost();
      } else if (event.key === "Enter") {
        event.preventDefault();
        requestPlace();
      } else if (event.key === "Escape") {
        useUi.getState().cancelPlacement();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active]);
}

function MoveButton({ right, up, label, glyph }: { right: 1 | -1; up: 1 | -1; label: string; glyph: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      className="grid h-9 w-9 place-items-center rounded-xl bg-[#f1f3f6] text-base font-bold text-[#1b2838] active:bg-[#e2e6eb]"
      onClick={() => nudgeGhost(right, up)}
    >
      {glyph}
    </button>
  );
}

function PlacementPanel() {
  const ghost = useUi((state) => state.ghost);
  const movingId = useUi((state) => state.movingId);
  const confirming = useUi((state) => state.confirmingBuy);
  const inventory = useGame((state) => state.inventory);
  useGame((state) => state.tile);
  const balance = useGame((state) => state.balancePence);
  const item = catalogueById[ghost?.itemId ?? ""];
  if (!ghost || !item) return null;
  const moving = inventory.find((owned) => owned.id === movingId);
  const problem = ghostProblem(ghost, movingId, inventory);

  return (
    <div>
      <div className="flex items-center gap-2">
        <ItemPicture item={item} colour={ghost.colour} className="h-12 w-12 shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="truncate text-[13px] font-extrabold">{item.name}</div>
          <div className="text-[11px] font-bold text-[#16a34a]">
            {moving ? "Yours · moving" : formatPence(item.pricePence)}
          </div>
        </div>
        {item.colours.length > 1 ? (
          <div className="flex max-w-[40%] flex-wrap justify-end gap-1">
            {item.colours.map((colour) => (
              <button
                key={colour}
                type="button"
                aria-label={`Colour ${colour}`}
                className={`h-5 w-5 rounded-full border ${ghost.colour === colour ? "ring-2 ring-[#1b2838] ring-offset-1" : "border-black/10"}`}
                style={{ background: colour }}
                onClick={() => useUi.getState().setGhost({ ...ghost, colour })}
              />
            ))}
          </div>
        ) : null}
      </div>

      <div
        className={`mt-2 rounded-xl px-2 py-1.5 text-[11px] ${problem ? "bg-[#fdecec] font-bold text-[#c8102e]" : confirming ? "bg-[#fff4d6] text-[#1b2838]" : "bg-[#f6f7f9] text-[#5c6b7a]"}`}
      >
        {problem
          ? PROBLEM_TEXT[problem]
          : confirming
            ? `Spend ${formatPence(item.pricePence)}? You'll have ${formatPence(balance - item.pricePence)} left. Tap Buy to say yes.`
            : "Arrows or drag the floor to move · R turns · Enter places · Esc cancels"}
      </div>

      <div className="mt-2 flex items-center gap-3">
        <div className="grid grid-cols-3 gap-1">
          <MoveButton right={-1} up={1} label="Move up-left" glyph="↖" />
          <span />
          <MoveButton right={1} up={1} label="Move up-right" glyph="↗" />
          <span />
          <button
            type="button"
            aria-label="Rotate"
            className="grid h-9 w-9 place-items-center rounded-full bg-[#2f6fed] text-lg font-bold text-white shadow"
            onClick={turnGhost}
          >
            ↻
          </button>
          <span />
          <MoveButton right={-1} up={-1} label="Move down-left" glyph="↙" />
          <span />
          <MoveButton right={1} up={-1} label="Move down-right" glyph="↘" />
        </div>
        <div className="flex flex-1 flex-col gap-1.5">
          <button
            type="button"
            disabled={Boolean(problem)}
            className="rounded-full bg-[#3ccf6e] px-3 py-2 text-[13px] font-extrabold text-white shadow disabled:bg-[#c9ced4]"
            onClick={() => requestPlace()}
          >
            {moving
              ? "Move here"
              : confirming
                ? `Buy · ${formatPence(item.pricePence)}`
                : `Place · ${formatPence(item.pricePence)}`}
          </button>
          {moving ? (
            <button
              type="button"
              className="rounded-full bg-[#fdecec] px-3 py-1.5 text-xs font-bold text-[#c8102e]"
              onClick={() => void confirmSell(moving.id)}
            >
              Sell for {formatPence(Math.floor(item.pricePence / 2))}
            </button>
          ) : (
            <button
              type="button"
              disabled={Boolean(problem) || confirming}
              className="rounded-full border border-[#3ccf6e] px-3 py-1.5 text-xs font-bold text-[#16a34a] disabled:border-[#c9ced4] disabled:text-[#9aa5b1]"
              onClick={() => requestPlace(true)}
            >
              Place + 1 more
            </button>
          )}
          <button
            type="button"
            className="rounded-full bg-[#f1f3f6] px-3 py-1.5 text-xs font-semibold"
            onClick={() => useUi.getState().cancelPlacement()}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export function BuyMode() {
  const nav = useUi((state) => state.nav);
  const placing = useUi((state) => state.ghost !== null);
  const hidden = useUi((state) => state.catalogueHidden);
  const balance = useGame((state) => state.balancePence);
  usePlacementKeys(nav === "buy" && placing);
  if (nav !== "buy") return null;

  if (!placing && hidden) {
    return (
      <div className="pointer-events-auto flex justify-center gap-2">
        <button
          type="button"
          className="rounded-full bg-[#3ccf6e] px-5 py-2.5 text-sm font-extrabold text-white shadow-lg"
          onClick={() => useUi.getState().setCatalogueHidden(false)}
        >
          🛒 Catalogue
        </button>
        <button
          type="button"
          className="rounded-full bg-white px-4 py-2.5 text-sm font-bold text-[#1b2838] shadow-lg"
          onClick={() => useUi.getState().setNav("home")}
        >
          Done
        </button>
      </div>
    );
  }

  return (
    <section className="pointer-events-auto overflow-hidden rounded-3xl bg-white p-3 text-[#1b2838] shadow-xl">
      {placing ? (
        <PlacementPanel />
      ) : (
        <>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-base font-extrabold">Catalogue</h2>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold text-[#5c6b7a]">{formatPence(balance)}</span>
              <button
                type="button"
                className="rounded-full bg-[#f1f3f6] px-3 py-1 text-[11px] font-semibold"
                onClick={() => useUi.getState().setCatalogueHidden(true)}
              >
                Hide
              </button>
              <button
                type="button"
                className="rounded-full bg-[#1b2838] px-3 py-1 text-[11px] font-semibold text-white"
                onClick={() => useUi.getState().setNav("home")}
              >
                Done
              </button>
            </div>
          </div>
          <CatalogueGrid />
          <p className="mt-2 text-center text-[10px] text-[#5c6b7a]">Tap something in your room to move or sell it</p>
        </>
      )}
    </section>
  );
}
