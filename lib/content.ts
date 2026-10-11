import catalogueJson from "@/data/catalogue.json";
import homesJson from "@/data/homes.json";
import jobsJson from "@/data/jobs.json";
import venuesJson from "@/data/venues.json";
import { SKILL_KEYS } from "@/lib/sim/constants";
import type {
  ActionType,
  CatalogueItem,
  Fixture,
  HomeDef,
  JobDef,
  PurchaseKind,
  VenueDef,
} from "@/lib/sim/types";

const ACTION_TYPES: readonly ActionType[] = [
  "sleep",
  "eat",
  "shower",
  "toilet",
  "watch_tv",
  "coffee",
  "socialise",
  "pass_out",
];

const PURCHASES: readonly PurchaseKind[] = ["meal_deal", "coffee", "pint", "roast"];

function isAction(value: unknown): value is ActionType {
  return typeof value === "string" && ACTION_TYPES.some((action) => action === value);
}

function isPurchase(value: unknown): value is PurchaseKind {
  return typeof value === "string" && PURCHASES.some((kind) => kind === value);
}

function asFootprint(value: number[] | string): [number, number] | "wall" {
  if (value === "wall") return "wall";
  const width = value[0];
  const height = value[1];
  if (typeof width !== "number" || typeof height !== "number") return [1, 1];
  return [width, height];
}

function asFixture(raw: {
  id: string;
  model: string;
  itemId: string;
  x: number;
  y: number;
  rotation: number;
  action: string | null;
  blocks: boolean;
  label?: string;
  purchase?: string;
}): Fixture {
  return {
    id: raw.id,
    model: raw.model,
    itemId: raw.itemId,
    x: raw.x,
    y: raw.y,
    rotation: raw.rotation,
    action: isAction(raw.action) ? raw.action : null,
    blocks: raw.blocks,
    label: raw.label,
    purchase: isPurchase(raw.purchase) ? raw.purchase : undefined,
  };
}

export const catalogue: CatalogueItem[] = catalogueJson.map((item) => ({
  id: item.id,
  name: item.name,
  category: item.category,
  footprint: asFootprint(item.footprint),
  pricePence: item.pricePence,
  tier: item.tier as CatalogueItem["tier"],
  colours: item.colours,
  model: item.model,
  action: isAction(item.action) ? item.action : null,
  blocks: item.blocks,
  effect: item.effect,
}));

export const catalogueById: Record<string, CatalogueItem> = Object.fromEntries(
  catalogue.map((item) => [item.id, item]),
);

export const jobs: JobDef[] = jobsJson.map((job) => ({
  ...job,
  skill: job.skill,
  tips: job.tips,
}));

export const jobsById: Record<string, JobDef> = Object.fromEntries(jobs.map((job) => [job.id, job]));

export const homes: HomeDef[] = homesJson.map((home) => ({
  ...home,
  fixtures: home.fixtures.map((fixture) => asFixture(fixture)),
}));

export const homesById: Record<string, HomeDef> = Object.fromEntries(homes.map((home) => [home.id, home]));

export const venues: VenueDef[] = venuesJson.map((venue) => ({
  ...venue,
  fixtures: venue.fixtures.map((fixture) => asFixture(fixture)),
}));

export const venuesById: Record<string, VenueDef> = Object.fromEntries(
  venues.map((venue) => [venue.id, venue]),
);

export function emptySkills(): Record<string, number> {
  return Object.fromEntries(SKILL_KEYS.map((skill) => [skill, 0]));
}

export function zoneOf(location: string, homeId: string): number {
  if (location === "home") return homesById[homeId]?.zone ?? 4;
  return venuesById[location]?.zone ?? 1;
}

export interface RoomLayout {
  id: string;
  width: number;
  height: number;
  fixtures: Fixture[];
}

export function roomLayout(location: string, homeId: string, visitHomeId: string | null): RoomLayout {
  if (visitHomeId) {
    const home = homesById[visitHomeId] ?? homesById.boxroom_z4;
    return home
      ? { id: home.id, width: home.width, height: home.height, fixtures: home.fixtures }
      : { id: "boxroom_z4", width: 5, height: 5, fixtures: [] };
  }
  if (location === "home") {
    const home = homesById[homeId] ?? homesById.boxroom_z4;
    return home
      ? { id: home.id, width: home.width, height: home.height, fixtures: home.fixtures }
      : { id: "boxroom_z4", width: 5, height: 5, fixtures: [] };
  }
  const venue = venuesById[location];
  if (!venue) return { id: "boxroom_z4", width: 5, height: 5, fixtures: [] };
  return { id: venue.id, width: venue.width, height: venue.height, fixtures: venue.fixtures };
}

export const CITY_DRESSING: { model: string; x: number; z: number; rotation: number }[] = [
  { model: "building-b", x: -16, z: 10, rotation: 0 },
  { model: "building-c", x: -16, z: 4, rotation: 1 },
  { model: "building-e", x: 16, z: 10, rotation: 0 },
  { model: "building-f", x: 16, z: -2, rotation: 2 },
  { model: "building-g", x: 4, z: 12, rotation: 1 },
  { model: "low-detail-building-a", x: -2, z: 12, rotation: 0 },
  { model: "low-detail-building-b", x: 10, z: -6, rotation: 1 },
  { model: "building-skyscraper-b", x: 14, z: 9, rotation: 0 },
  { model: "building-type-a", x: -14, z: -6, rotation: 0 },
  { model: "building-type-b", x: 6, z: -11, rotation: 1 },
  { model: "tree-small", x: -8, z: 2, rotation: 0 },
  { model: "tree-large", x: -13, z: -1, rotation: 0 },
  { model: "tree_oak", x: -9, z: 4, rotation: 0 },
  { model: "tree_default", x: -14, z: 3, rotation: 0 },
  { model: "tree-small", x: 3, z: 6, rotation: 0 },
  { model: "path-long", x: 0, z: 0, rotation: 0 },
];
