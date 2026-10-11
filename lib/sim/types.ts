export const NEED_KEYS = ["hunger", "energy", "hygiene", "bladder", "fun", "social"] as const;

export type NeedKey = (typeof NEED_KEYS)[number];

export type Needs = Record<NeedKey, number>;

export type Speed = 1 | 2 | 3;

export type MoodBand = "Miserable" | "Low" | "Fine" | "Happy" | "Buzzing";

export type Anim = "stand" | "walk" | "sit" | "sleep" | "eat" | "shower" | "dance" | "work";

export type TravelMode = "tube" | "bus" | "walk" | "ride";

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

export interface ActionDef {
  id: string;
  label: string;
  emoji: string;
  minutes: number;
  costPence: number;
  effects: Partial<Needs>;
  anim: Anim;
  skill?: string;
  xp?: number;
  requires?: { skill: string; level: number };
  heritage?: boolean;
  venue?: string;
  anywhere?: boolean;
  scales?: boolean;
}

export interface MenuDef {
  id: string;
  title: string;
  emoji: string;
  blurb: string;
  actions: string[];
}

export interface SimAction {
  id: string;
  actionId: string;
  label: string;
  emoji: string;
  anim: Anim;
  totalMinutes: number;
  remainingMinutes: number;
  /** Need change per game minute, already scaled by item quality. */
  rates: Partial<Needs>;
  target: string | null;
}

export type HairStyle =
  | "short"
  | "fade"
  | "buzz"
  | "bald"
  | "afro"
  | "curly"
  | "long"
  | "ponytail"
  | "bun"
  | "braids"
  | "locs"
  | "cornrows";

export type Headwear = "none" | "hijab" | "turban" | "headwrap" | "cap" | "beanie";

export type Build = "slim" | "regular" | "broad";

export type TopStyle = "tee" | "hoodie" | "jacket" | "blazer" | "dress" | "kaftan";

export interface Appearance {
  skin: string;
  hairStyle: HairStyle;
  hairColor: string;
  headwear: Headwear;
  headwearColor: string;
  beard: boolean;
  build: Build;
  top: string;
  topStyle: TopStyle;
  bottom: string;
  shoes: string;
  origin: string;
  londonBorn: boolean;
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
  menu: string | null;
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
  menu: string | null;
  blocks: boolean;
  label?: string;
  emoji?: string;
}

export interface JobDef {
  id: string;
  name: string;
  emoji: string;
  venue: string;
  payPerHourPence: number;
  hours: number;
  skill: string | null;
  skillRequired: number;
  energyCost: number;
  xpSkill: string;
  tips: boolean;
  ladder: string[];
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
  emoji: string;
  kind: string;
  blurb: string;
  width: number;
  height: number;
  model: string;
  floor: string;
  wall: string | null;
  flavour: string[];
  fixtures: Fixture[];
}

export interface GoalDef {
  id: string;
  title: string;
  hint: string;
  emoji: string;
  stat: string;
  count: number;
  rewardPence: number;
  highlight: string;
}

export interface EventOutcome {
  text: string;
  moodlet?: { label: string; emoji: string; value: number };
  needs?: Partial<Needs>;
}

export interface EventChoice {
  label: string;
  emoji: string;
  action?: string;
  check?: { skill: string; difficulty: number };
  success: EventOutcome;
  fail?: EventOutcome;
}

export interface EventDef {
  id: string;
  title: string;
  emoji: string;
  text: string;
  venues: string[];
  heritage?: boolean;
  choices: EventChoice[];
}

export interface Nationality {
  id: string;
  iso: string;
  label: string;
  demonym: string;
  flag: string;
  greeting: string;
  dish: string;
  dishEmoji: string;
  utcOffset: number;
  callHome: string;
}

export interface LocalDef {
  id: string;
  name: string;
  origin: string;
  venues: string[];
  look: Appearance;
  lines: string[];
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

export interface Career {
  jobId: string;
  level: number;
  shiftsDone: number;
}

export interface Friend {
  simId: string;
  username: string;
  name: string;
}
