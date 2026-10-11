import type { ActionType, NeedKey } from "./types";

export const NEED_DECAY_PER_HOUR: Record<NeedKey, number> = {
  hunger: 4,
  energy: 3,
  hygiene: 2.5,
  bladder: 5,
  fun: 3,
  social: 2,
};

export const NEED_WARNING = 25;

export const STARTING_PENCE = 40_000;
export const OVERDRAFT_LIMIT_PENCE = 20_000;
export const OVERDRAFT_DAILY_RATE = 0.02;
export const SELL_RATIO = 0.5;

export const MINUTES_PER_DAY = 1440;
export const MINUTES_PER_WEEK = 1440 * 7;
/** Game epoch is Monday 00:00, so the first Sunday 00:00 is six days in. */
export const SUNDAY_OFFSET = 1440 * 6;
export const START_GAME_MINUTES = 8 * 60;

export const RENT_MISS_LIMIT = 2;
export const BILL_HEATING_ON_PENCE = 1_200;
export const BILL_HEATING_OFF_PENCE = 400;
export const BILL_COUNCIL_PENCE = 800;
export const BILL_PHONE_PENCE = 500;

export const MEAL_DEAL_PENCE = 385;
export const COFFEE_PENCE = 280;
export const PINT_PENCE = 550;
export const ROAST_PENCE = 900;

export const BUS_PENCE = 175;
export const TUBE_MIN_PENCE = 280;
export const TUBE_PER_ZONE_PENCE = 160;
export const RIDE_BASE_PENCE = 650;
export const RIDE_PER_ZONE_PENCE = 200;
export const OYSTER_START_PENCE = 2_000;
export const OYSTER_TOP_UPS = [500, 1_000, 2_000] as const;

export const SHARD_SIZE = 50;
export const GIFT_MIN_PENCE = 100;
export const GIFT_MAX_PENCE = 2_000;

export const ACTION_DEFS: Record<
  ActionType,
  { need: NeedKey; perMinute: number; minutes: number; label: string }
> = {
  sleep: { need: "energy", perMinute: 1.2, minutes: 60, label: "Sleeping" },
  eat: { need: "hunger", perMinute: 2.4, minutes: 20, label: "Eating" },
  shower: { need: "hygiene", perMinute: 3.2, minutes: 15, label: "Showering" },
  toilet: { need: "bladder", perMinute: 16, minutes: 5, label: "Using the loo" },
  watch_tv: { need: "fun", perMinute: 1.1, minutes: 30, label: "Watching telly" },
  coffee: { need: "energy", perMinute: 2, minutes: 10, label: "Coffee" },
  socialise: { need: "social", perMinute: 1.4, minutes: 20, label: "Having a chat" },
  pass_out: { need: "energy", perMinute: 0.6, minutes: 40, label: "Passed out" },
};

export const NEED_LABELS: Record<NeedKey, string> = {
  hunger: "Hunger",
  energy: "Energy",
  hygiene: "Hygiene",
  bladder: "Bladder",
  fun: "Fun",
  social: "Social",
};

export const LOW_NEED_GOAL: Record<NeedKey, string> = {
  hunger: "Eat something",
  energy: "Get some sleep",
  hygiene: "Have a shower",
  bladder: "Use the loo",
  fun: "Do something fun",
  social: "Talk to someone",
};

export const TRAITS = [
  "Night owl",
  "Early bird",
  "Foodie",
  "Chatty",
  "Frugal",
  "Dramatic",
  "Handy",
  "Bookish",
] as const;

export const ASPIRATIONS = [
  { id: "tech_founder", label: "Tech founder" },
  { id: "influencer", label: "Influencer" },
  { id: "property_ladder", label: "Property ladder" },
  { id: "party_animal", label: "Party animal" },
  { id: "artist", label: "Artist" },
] as const;

export const SKILL_KEYS = [
  "coding",
  "cooking",
  "charisma",
  "fitness",
  "music",
  "comedy",
  "style",
  "hustle",
  "photography",
] as const;

export const SKINS = ["#f3d2b5", "#e0ac7a", "#c68642", "#8d5524", "#4a2912"];
export const HAIRS = ["#1c1c1c", "#5c3a24", "#c4a35a", "#8b2e3a", "#d5d5d5"];
export const TOPS = ["#1f4b99", "#b23a48", "#2f6b4f", "#f4f1ea", "#1a1a1a", "#e8a317"];
export const BOTTOMS = ["#243044", "#3e3a34", "#1f4b99", "#6b2d5b"];
export const SHOES = ["#1a1a1a", "#f4f1ea", "#6b3a2a", "#1f4b99"];

export const CATALOGUE_CATEGORIES = [
  "Sleep",
  "Kitchen",
  "Bath",
  "Comfort",
  "Fun",
  "Skills",
  "Light",
  "Decor",
  "Plants",
  "Tech",
  "Luxury",
] as const;
