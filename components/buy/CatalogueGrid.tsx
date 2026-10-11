"use client";

import { useState } from "react";
import { catalogue } from "@/lib/content";
import { CATALOGUE_CATEGORIES } from "@/lib/sim/constants";
import { formatPence } from "@/lib/sim/money";
import { useUi } from "@/lib/store/useUi";

export function CatalogueGrid() {
  const [category, setCategory] = useState<(typeof CATALOGUE_CATEGORIES)[number]>("Sleep");
  const selected = useUi((state) => state.selectedCatalogueId);
  const items = catalogue.filter((item) => item.category === category);

  return (
    <div>
      <div className="flex gap-1 overflow-x-auto pb-2">
        {CATALOGUE_CATEGORIES.map((entry) => (
          <button
            key={entry}
            type="button"
            className={`shrink-0 rounded-full px-2 py-1 text-[10px] ${category === entry ? "bg-[#1b2838] text-[#f4efe6]" : "bg-[#1b2838]/10"}`}
            onClick={() => setCategory(entry)}
          >
            {entry}
          </button>
        ))}
      </div>
      <div className="grid max-h-36 grid-cols-2 gap-1 overflow-y-auto">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`rounded-xl px-2 py-1.5 text-left text-[11px] ${selected === item.id ? "bg-[#c8102e] text-white" : "bg-white"}`}
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
            <div className="font-semibold">{item.name}</div>
            <div>{formatPence(item.pricePence)}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
