import actionsJson from "@/data/actions.json";
import catalogueJson from "@/data/catalogue.json";
import eventsJson from "@/data/events.json";
import finishesJson from "@/data/finishes.json";
import goalsJson from "@/data/goals.json";
import homesJson from "@/data/homes.json";
import jobsJson from "@/data/jobs.json";
import localsJson from "@/data/locals.json";
import nationalitiesJson from "@/data/nationalities.json";
import venuesJson from "@/data/venues.json";
import { SKILL_KEYS } from "@/lib/sim/constants";
import { normaliseAppearance } from "@/lib/sim/appearance";
import type {
  ActionDef,
  Anim,
  CatalogueItem,
  EventDef,
  EventOutcome,
  FinishDef,
  Finishes,
  Fixture,
  GoalDef,
  HomeDef,
  InventoryItem,
  JobDef,
  LocalDef,
  MenuDef,
  Nationality,
  Needs,
  SpotPanel,
  VenueDef,
} from "@/lib/sim/types";
import { NEED_KEYS } from "@/lib/sim/types";

const ANIMS: readonly Anim[] = ["stand", "walk", "sit", "sleep", "eat", "shower", "dance", "work"];

function asAnim(value: unknown): Anim {
  return ANIMS.find((anim) => anim === value) ?? "stand";
}

function asEffects(value: Record<string, number | undefined>): Partial<Needs> {
  const effects: Partial<Needs> = {};
  for (const key of NEED_KEYS) {
    const amount = value[key];
    if (typeof amount === "number") effects[key] = amount;
  }
  return effects;
}

function asFootprint(value: number[] | string): [number, number] | "wall" {
  if (value === "wall") return "wall";
  const width = value[0];
  const height = value[1];
  if (typeof width !== "number" || typeof height !== "number") return [1, 1];
  return [width, height];
}

interface RawFixture {
  id: string;
  model: string;
  itemId: string;
  x: number;
  y: number;
  rotation: number;
  menu: string | null;
  blocks: boolean;
  label?: string;
  emoji?: string;
  panel?: string;
}

const PANELS: readonly SpotPanel[] = ["departures", "receipts", "audit"];

function asFixture(raw: RawFixture): Fixture {
  const panel = PANELS.find((known) => known === raw.panel);
  return { ...raw, menu: raw.menu ?? null, panel };
}

interface RawAction {
  label: string;
  emoji: string;
  minutes: number;
  costPence: number;
  effects: Record<string, number | undefined>;
  anim: string;
  skill?: string;
  xp?: number;
  requires?: { skill: string; level: number };
  heritage?: boolean;
  venue?: string;
  anywhere?: boolean;
  scales?: boolean;
}

const rawActions: Record<string, RawAction> = actionsJson.actions;

export const actionsById: Record<string, ActionDef> = Object.fromEntries(
  Object.entries(rawActions).map(([id, raw]) => [
    id,
    { ...raw, id, anim: asAnim(raw.anim), effects: asEffects(raw.effects) },
  ]),
);

export const menusById: Record<string, MenuDef> = Object.fromEntries(
  Object.entries(actionsJson.menus).map(([id, menu]) => [
    id,
    {
      id,
      ...menu,
      actions: menu.actions.filter((actionId) => actionId in actionsById),
    },
  ]),
);

export const catalogue: CatalogueItem[] = catalogueJson.map((item) => ({
  id: item.id,
  name: item.name,
  category: item.category,
  footprint: asFootprint(item.footprint),
  pricePence: item.pricePence,
  tier: item.tier as CatalogueItem["tier"],
  colours: item.colours,
  model: item.model,
  menu: item.menu && item.menu in menusById ? item.menu : null,
  blocks: item.blocks,
  effect: item.effect,
}));

export const catalogueById: Record<string, CatalogueItem> = Object.fromEntries(
  catalogue.map((item) => [item.id, item]),
);

export const finishes: FinishDef[] = finishesJson.map((finish) => ({
  ...finish,
  kind: finish.kind === "wall" ? "wall" : "floor",
}));

export const finishesById: Record<string, FinishDef> = Object.fromEntries(
  finishes.map((finish) => [finish.id, finish]),
);

/** Every home starts with these; they cost nothing. */
export const DEFAULT_FINISHES: Finishes = {
  wall: "magnolia",
  floor: "oak_laminate",
};

export const jobs: JobDef[] = jobsJson;

export const jobsById: Record<string, JobDef> = Object.fromEntries(jobs.map((job) => [job.id, job]));

export const homes: HomeDef[] = homesJson.map((home) => ({
  ...home,
  fixtures: home.fixtures.map((fixture) => asFixture(fixture)),
}));

export const homesById: Record<string, HomeDef> = Object.fromEntries(homes.map((home) => [home.id, home]));

export const venues: VenueDef[] = venuesJson.map((venue) => ({
  ...venue,
  wall: venue.wall ?? null,
  accent: "accent" in venue ? venue.accent : undefined,
  fixtures: venue.fixtures.map((fixture) => asFixture(fixture)),
}));

export const venuesById: Record<string, VenueDef> = Object.fromEntries(venues.map((venue) => [venue.id, venue]));

export const goals: GoalDef[] = goalsJson;

type RawOutcome = {
  text: string;
  moodlet?: EventOutcome["moodlet"];
  needs?: Record<string, number>;
};

function outcomeOf(raw: RawOutcome): EventOutcome {
  return {
    text: raw.text,
    moodlet: raw.moodlet,
    needs: raw.needs ? asEffects(raw.needs) : undefined,
  };
}

export const events: EventDef[] = eventsJson.map((event) => ({
  ...event,
  choices: event.choices.map((choice) => ({
    ...choice,
    success: outcomeOf(choice.success),
    fail: choice.fail ? outcomeOf(choice.fail) : undefined,
  })),
}));

export const nationalities: Nationality[] = nationalitiesJson;

export const nationalitiesById: Record<string, Nationality> = Object.fromEntries(
  nationalities.map((nation) => [nation.id, nation]),
);

export const locals: LocalDef[] = localsJson.map((local) => ({
  ...local,
  look: normaliseAppearance({
    ...local.look,
    origin: local.origin,
    londonBorn: false,
  }),
}));

export function localsAt(venueId: string): LocalDef[] {
  return locals.filter((local) => local.venues.includes(venueId));
}

const TRAVEL_LABELS: Record<string, string> = {
  tube: "Tube fare",
  bus: "Bus fare",
  ride: "Black cab",
  walk: "Walk",
  oyster: "Oyster top-up",
};

function humanise(text: string): string {
  const spaced = text.replaceAll("_", " ");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

/** A ledger row in words: "Oat latte", "Barista wages", "Tube fare". Gift refs are sim ids, so never shown. */
export function ledgerLabel(kind: string, ref: string | null): string {
  if (kind === "gift") return "Gift";
  if (!ref) return humanise(kind);
  if (kind === "travel") return TRAVEL_LABELS[ref] ?? humanise(ref);
  if (kind === "wage") return ref === "arrival" ? "Arrival money" : `${jobsById[ref]?.name ?? humanise(ref)} wages`;
  if (kind === "goal") return `Goal: ${goals.find((goal) => goal.id === ref)?.title ?? humanise(ref)}`;
  if (kind === "rent") return ref === "missed" ? "Missed rent" : "Rent and bills";
  if (kind === "bill") return ref === "overdraft" ? "Overdraft interest" : humanise(ref);
  const name = actionsById[ref]?.label ?? catalogueById[ref]?.name ?? finishesById[ref]?.name ?? humanise(ref);
  return kind === "sale" ? `Sold ${name.toLowerCase()}` : name;
}

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

const FALLBACK_LAYOUT: RoomLayout = {
  id: "boxroom_z4",
  width: 5,
  height: 5,
  fixtures: [],
};

function homeLayout(homeId: string): RoomLayout {
  const home = homesById[homeId] ?? homesById.boxroom_z4;
  return home
    ? {
        id: home.id,
        width: home.width,
        height: home.height,
        fixtures: home.fixtures,
      }
    : FALLBACK_LAYOUT;
}

export function roomLayout(location: string, homeId: string, visitHomeId: string | null): RoomLayout {
  if (visitHomeId) return homeLayout(visitHomeId);
  if (location === "home") return homeLayout(homeId);
  const venue = venuesById[location];
  if (!venue) return FALLBACK_LAYOUT;
  return {
    id: venue.id,
    width: venue.width,
    height: venue.height,
    fixtures: venue.fixtures,
  };
}

/** Which menu a tapped target opens: a fixture id or an owned inventory id. */
export function targetMenu(
  targetId: string,
  layout: RoomLayout,
  inventory: InventoryItem[],
): { menu: MenuDef; quality: number; label: string } | null {
  const fixture = layout.fixtures.find((entry) => entry.id === targetId);
  if (fixture) {
    const menu = fixture.menu ? menusById[fixture.menu] : undefined;
    if (!menu) return null;
    return {
      menu,
      quality: catalogueById[fixture.itemId]?.effect ?? 1,
      label: fixture.label ?? menu.title,
    };
  }
  const owned = inventory.find((item) => item.id === targetId && item.placed);
  const item = owned ? catalogueById[owned.itemId] : undefined;
  const menu = item?.menu ? menusById[item.menu] : undefined;
  if (!item || !menu) return null;
  return { menu, quality: item.effect, label: item.name };
}

export const CITY_DRESSING: {
  model: string;
  x: number;
  z: number;
  rotation: number;
}[] = [
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
  { model: "building-c", x: -9, z: -12, rotation: 3 },
  { model: "building-e", x: 9, z: -12, rotation: 0 },
  { model: "building-a", x: 5, z: 2, rotation: 1 },
  { model: "building-g", x: -3, z: -3, rotation: 2 },
  { model: "low-detail-building-a", x: 12, z: -10, rotation: 1 },
  { model: "low-detail-building-b", x: -16, z: -10, rotation: 0 },
  { model: "building-skyscraper-a", x: 15, z: 1, rotation: 1 },
  { model: "building-type-c", x: -8, z: 7, rotation: 2 },
  { model: "building-type-d", x: 8, z: 11, rotation: 3 },
  { model: "tree-small", x: -8, z: 2, rotation: 0 },
  { model: "tree-large", x: -13, z: -1, rotation: 0 },
  { model: "tree_oak", x: -9, z: 4, rotation: 0 },
  { model: "tree_default", x: -14, z: 3, rotation: 0 },
  { model: "tree-small", x: 3, z: 6, rotation: 0 },
  { model: "tree-large", x: -12, z: -3, rotation: 0 },
  { model: "tree-small", x: -1, z: -9, rotation: 0 },
  { model: "tree_default", x: 10, z: 1, rotation: 0 },
  { model: "path-long", x: 0, z: 0, rotation: 0 },
];
