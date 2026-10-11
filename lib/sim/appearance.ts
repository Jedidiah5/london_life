import { BUILDS, HAIR_STYLES, HEADWEAR, TOP_STYLES } from "./constants";
import type { Appearance, Build, HairStyle, Headwear, TopStyle } from "./types";

export function defaultAppearance(): Appearance {
  return {
    skin: "#c68642",
    hairStyle: "short",
    hairColor: "#111111",
    headwear: "none",
    headwearColor: "#1a1a1a",
    beard: false,
    build: "regular",
    top: "#1f4b99",
    topStyle: "hoodie",
    bottom: "#243044",
    shoes: "#f4f1ea",
    origin: "england",
    londonBorn: true,
  };
}

function pick<T extends string>(options: readonly T[], value: unknown, fallback: T): T {
  return options.find((option) => option === value) ?? fallback;
}

function colour(value: unknown, fallback: string): string {
  return typeof value === "string" && /^#[0-9a-fA-F]{6}$/.test(value) ? value : fallback;
}

/** Accepts old v1 saves (`hair`, `body`) and anything partial. */
export function normaliseAppearance(raw: unknown): Appearance {
  const base = defaultAppearance();
  if (!raw || typeof raw !== "object") return base;
  const row = raw as Record<string, unknown>;
  return {
    skin: colour(row.skin, base.skin),
    hairStyle: pick<HairStyle>(HAIR_STYLES, row.hairStyle ?? row.hair, base.hairStyle),
    hairColor: colour(row.hairColor, base.hairColor),
    headwear: pick<Headwear>(HEADWEAR, row.headwear, base.headwear),
    headwearColor: colour(row.headwearColor, base.headwearColor),
    beard: row.beard === true,
    build: pick<Build>(BUILDS, row.build, row.body === "b" ? "slim" : base.build),
    top: colour(row.top, base.top),
    topStyle: pick<TopStyle>(TOP_STYLES, row.topStyle, base.topStyle),
    bottom: colour(row.bottom, base.bottom),
    shoes: colour(row.shoes, base.shoes),
    origin: typeof row.origin === "string" && row.origin ? row.origin : base.origin,
    londonBorn: row.londonBorn !== false,
  };
}

/** Deterministic random look for crowd extras, seeded by a string. */
export function seededLook(seed: string, palette: { skins: string[]; hairs: string[]; tops: string[] }): Appearance {
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  const next = () => {
    hash = Math.imul(hash ^ (hash >>> 15), 2246822507) >>> 0;
    return hash / 4294967296;
  };
  const choose = <T,>(list: readonly T[], fallback: T): T => list[Math.floor(next() * list.length)] ?? fallback;
  const base = defaultAppearance();
  return {
    ...base,
    skin: choose(palette.skins, base.skin),
    hairStyle: choose(HAIR_STYLES, base.hairStyle),
    hairColor: choose(palette.hairs, base.hairColor),
    headwear: next() < 0.15 ? choose(HEADWEAR, "none") : "none",
    headwearColor: choose(palette.tops, base.headwearColor),
    beard: next() < 0.3,
    build: choose(BUILDS, base.build),
    top: choose(palette.tops, base.top),
    topStyle: choose(TOP_STYLES, base.topStyle),
    bottom: choose(palette.tops, base.bottom),
  };
}
