import { NEED_DECAY_PER_HOUR, NEED_WARNING } from "./constants";
import { NEED_KEYS, type NeedKey, type Needs } from "./types";

export function clampNeed(value: number): number {
  return Math.min(100, Math.max(0, value));
}

export function fullNeeds(value = 80): Needs {
  return {
    hunger: value,
    energy: value,
    hygiene: value,
    bladder: value,
    fun: Math.min(100, value - 10),
    social: Math.min(100, value - 20),
  };
}

export function decayNeeds(needs: Needs, gameHours: number, working: boolean): Needs {
  const hours = Math.max(0, gameHours);
  const next = { ...needs };
  for (const key of NEED_KEYS) {
    let rate = NEED_DECAY_PER_HOUR[key];
    if (key === "energy" && working) rate *= 2;
    next[key] = clampNeed(needs[key] - rate * hours);
  }
  return next;
}

export function bumpNeed(needs: Needs, key: NeedKey, amount: number): Needs {
  return { ...needs, [key]: clampNeed(needs[key] + amount) };
}

export function warningsFor(prev: Needs, next: Needs): NeedKey[] {
  return NEED_KEYS.filter((key) => prev[key] >= NEED_WARNING && next[key] < NEED_WARNING);
}

export function lowestNeed(needs: Needs): NeedKey {
  return NEED_KEYS.reduce((lowest, key) => (needs[key] < needs[lowest] ? key : lowest));
}
