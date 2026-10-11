"use client";

import { useEffect, useState } from "react";
import { catalogue } from "@/lib/content";
import { CATALOGUE_CATEGORIES } from "@/lib/sim/constants";
import { formatPence } from "@/lib/sim/money";
import type { CatalogueItem } from "@/lib/sim/types";
import { useGame } from "@/lib/store/useGame";
import { useUi } from "@/lib/store/useUi";
import { cachedThumbnail, thumbnail } from "@/lib/thumbnails";

type Category = (typeof CATALOGUE_CATEGORIES)[number];

const CATEGORY_EMOJI: Record<Category, string> = {
  Sleep: "🛏️",
  Kitchen: "🍳",
  Bath: "🛁",
  Comfort: "🛋️",
  Fun: "📺",
  Skills: "🎸",
  Light: "💡",
  Decor: "🖼️",
  Plants: "🪴",
  Tech: "💻",
  Luxury: "💎",
};

function footprintOf(item: CatalogueItem): [number, number] {
  return Array.isArray(item.footprint) ? item.footprint : [1, 1];
}

export function ItemPicture({ item, colour, className = "" }: { item: CatalogueItem; colour?: string; className?: string }) {
  const tint = colour ?? item.colours[0] ?? "#ffffff";
  const [src, setSrc] = useState<string | null>(() => cachedThumbnail(item.model, tint));
  useEffect(() => {
    let live = true;
    const [w, d] = footprintOf(item);
    thumbnail(item.model, tint, Math.max(w, d))
      .then((url) => {
        if (live) setSrc(url);
      })
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [item, tint]);
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={item.name} draggable={false} className={`object-contain ${className}`} />
  ) : (
    <div className={`animate-pulse rounded-2xl bg-[#e9edf2] ${className}`} />
  );
}

export function CatalogueGrid() {
  const [category, setCategory] = useState<Category>("Sleep");
  const selected = useUi((state) => state.selectedCatalogueId);
  const balance = useGame((state) => state.balancePence);
  const items = catalogue.filter((item) => item.category === category);

  return (
    <div>
      <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-2">
        {CATALOGUE_CATEGORIES.map((entry) => (
          <button
            key={entry}
            type="button"
            className={`flex shrink-0 items-center gap-1 rounded-full px-3 py-1.5 text-[12px] font-semibold ${
              category === entry ? "bg-[#1b2838] text-white" : "bg-[#f1f3f6] text-[#1b2838]"
            }`}
            onClick={() => setCategory(entry)}
          >
            <span>{CATEGORY_EMOJI[entry]}</span>
            {entry}
          </button>
        ))}
      </div>
      <div className="grid max-h-[30vh] grid-cols-3 gap-2 overflow-y-auto pr-1">
        {items.map((item) => {
          const [w, d] = footprintOf(item);
          const active = selected === item.id;
          const affordable = item.pricePence <= balance;
          return (
            <button
              key={item.id}
              type="button"
              className={`relative flex flex-col rounded-2xl bg-[#f6f7f9] p-1.5 text-left transition ${
                active ? "ring-2 ring-[#3ccf6e]" : "hover:bg-[#eef1f4]"
              }`}
              onClick={() => {
                useUi.getState().selectCatalogue(item.id);
                useUi.getState().setGhost({
                  itemId: item.id,
                  x: 1,
                  y: 2,
                  rotation: 0,
                  colour: item.colours[0] ?? "#f4f1ea",
                });
              }}
            >
              <span className="absolute left-2 top-1.5 text-[9px] font-semibold text-[#5c6b7a]">
                {item.footprint === "wall" ? "wall" : `${w}×${d}`}
              </span>
              {item.tier > 1 ? (
                <span className="absolute right-2 top-1 text-[9px] text-[#e8a317]">{"★".repeat(item.tier - 1)}</span>
              ) : null}
              <ItemPicture item={item} className="mx-auto mt-3 aspect-square w-full" />
              <span className="mt-1 truncate text-[11px] font-semibold text-[#1b2838]">{item.name}</span>
              <span className={`text-[12px] font-bold ${affordable ? "text-[#16a34a]" : "text-[#c8102e]"}`}>
                {formatPence(item.pricePence)}
              </span>
              {item.colours.length > 1 ? (
                <span className="absolute bottom-1.5 right-2 rounded-full bg-white px-1.5 text-[9px] font-semibold text-[#5c6b7a] shadow-sm">
                  🎨 {item.colours.length}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
