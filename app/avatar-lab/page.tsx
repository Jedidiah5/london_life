"use client";

import dynamic from "next/dynamic";
import { defaultAppearance } from "@/lib/sim/appearance";
import type { Appearance } from "@/lib/sim/types";

const AvatarPreview = dynamic(() => import("@/components/create/AvatarPreview"), { ssr: false });

const base = defaultAppearance();
const looks: Appearance[] = [
  base,
  { ...base, skin: "#5a3420", hairStyle: "locs", topStyle: "kaftan", top: "#d9673b", build: "broad", beard: true },
  { ...base, skin: "#e8c098", headwear: "hijab", headwearColor: "#2f6b4f", topStyle: "dress", top: "#6b2d5b", build: "slim" },
  { ...base, skin: "#a86b45", headwear: "turban", headwearColor: "#e8a317", topStyle: "blazer", top: "#1a1a1a", beard: true },
  { ...base, skin: "#f6dcc8", hairStyle: "ponytail", hairColor: "#c45a2a", topStyle: "tee", top: "#f4f1ea" },
  { ...base, skin: "#3a2010", hairStyle: "afro", topStyle: "jacket", top: "#2f6b4f" },
];

export default function AvatarLab() {
  return (
    <div className="grid h-screen grid-cols-3 gap-2 bg-[#dfe6ea] p-2">
      {looks.map((look, index) => (
        <div key={index} className="rounded-2xl bg-white">
          <AvatarPreview look={look} />
        </div>
      ))}
    </div>
  );
}
