export const NEED_KEYS = ["hunger", "energy", "hygiene", "bladder", "fun", "social"] as const;

export type NeedKey = (typeof NEED_KEYS)[number];

export type Needs = Record<NeedKey, number>;

export type Speed = 1 | 2 | 3;

export type MoodBand = "Miserable" | "Low" | "Fine" | "Happy" | "Buzzing";

export type ActionType =
  | "sleep"
  | "eat"
  | "shower"
  | "toilet"
  | "watch_tv"
  | "coffee"
  | "socialise"
  | "pass_out";

export type TravelMode = "tube" | "bus" | "walk" | "ride";

export type PurchaseKind = "meal_deal" | "coffee" | "pint" | "roast";

export interface Moodlet {
  id: string;
  label: string;
  emoji: string;
  value: number;
  expiresAtGameMinute: number;
}

export interface Tile {
  x: number;
  y: number;
}

export interface SimAction {
  id: string;
  type: ActionType;
  totalMinutes: number;
  remainingMinutes: number;
  effect: number;
  label: string;
}

export interface Appearance {
  body: "a" | "b";
  skin: string;
  hair: string;
  hairColor: string;
  top: string;
  bottom: string;
  shoes: string;
  style: string;
}

export interface CatalogueItem {
  id: string;
  name: string;
  category: string;
  footprint: [number, number] | "wall";
  pricePence: number;
  tier: 1 | 2 | 3 | 4;
  colours: string[];
  model: string;
  action: ActionType | null;
  blocks: boolean;
  effect: number;
}

export interface InventoryItem {
  id: string;
  itemId: string;
  placed: boolean;
  x: number;
  y: number;
  rotation: number;
  colour: string;
}

export interface Fixture {
  id: string;
  model: string;
  itemId: string;
  x: number;
  y: number;
  rotation: number;
  action: ActionType | null;
  blocks: boolean;
  label?: string;
  purchase?: PurchaseKind;
}

export interface JobDef {
  id: string;
  name: string;
  venue: string;
  payPerHourPence: number;
  hours: number;
  skill: string | null;
  skillRequired: number;
  energyCost: number;
  xpSkill: string;
  tips: boolean;
}

export interface HomeDef {
  id: string;
  name: string;
  zone: number;
  width: number;
  height: number;
  rentPence: number;
  buyPence: number | null;
  fixtures: Fixture[];
}

export interface VenueDef {
  id: string;
  name: string;
  district: string;
  zone: number;
  x: number;
  z: number;
  kind: string;
  blurb: string;
  width: number;
  height: number;
  model: string;
  fixtures: Fixture[];
}

export interface LedgerEntry {
  id: string;
  amountPence: number;
  kind: string;
  ref: string | null;
  createdAt: string;
}

export interface ActiveShift {
  jobId: string;
  startedAt: string;
  expectedSeconds: number;
  moodScore: number;
}

export interface Friend {
  simId: string;
  username: string;
  name: string;
}
