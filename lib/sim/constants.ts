import type { NeedKey } from "./types";

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

export const SKILL_MAX = 10;
export const SHIFT_XP = 0.25;
/** Each career level adds this share to base pay. */
export const LEVEL_PAY_STEP = 0.15;
export const SHIFTS_PER_LEVEL = 3;
export const ARRIVAL_EVENT_CHANCE = 0.4;
export const MISSING_HOME_DAYS = 3;
export const HOME_SPEED_MAX = 3;

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

export const SKINS = [
  "#f6dcc8",
  "#f3d2b5",
  "#e8c098",
  "#e0ac7a",
  "#d9a575",
  "#c68642",
  "#a86b45",
  "#8d5524",
  "#6b3e26",
  "#5a3420",
  "#4a2912",
  "#3a2010",
];
export const HAIRS = ["#111111", "#2b1a10", "#5c3a24", "#8b5a2b", "#c4a35a", "#c45a2a", "#8b2e3a", "#d5d5d5", "#6b8fd1", "#d16bb0"];
export const TOPS = ["#1f4b99", "#b23a48", "#2f6b4f", "#f4f1ea", "#1a1a1a", "#e8a317", "#6b2d5b", "#c5d4e8", "#3e3a34", "#d9673b"];
export const BOTTOMS = ["#243044", "#3e3a34", "#1f4b99", "#6b2d5b", "#1a1a1a", "#c4a574"];
export const SHOES = ["#1a1a1a", "#f4f1ea", "#6b3a2a", "#1f4b99", "#b23a48"];
export const HEADWEAR_COLOURS = ["#1a1a1a", "#f4f1ea", "#2f6b4f", "#6b2d5b", "#e8a317", "#1f4b99", "#b23a48", "#c4a574"];

export const HAIR_STYLES = [
  "short",
  "fade",
  "buzz",
  "bald",
  "afro",
  "curly",
  "long",
  "ponytail",
  "bun",
  "braids",
  "locs",
  "cornrows",
] as const;
export const HEADWEAR = ["none", "hijab", "turban", "headwrap", "cap", "beanie"] as const;
export const BUILDS = ["slim", "regular", "broad"] as const;
export const TOP_STYLES = ["tee", "hoodie", "jacket", "blazer", "dress", "kaftan"] as const;

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
