import { NEED_KEYS, type MoodBand, type Moodlet, type Needs } from "./types";

export function activeMoodlets(moodlets: Moodlet[], gameMinute: number): Moodlet[] {
  return moodlets.filter((moodlet) => moodlet.expiresAtGameMinute > gameMinute);
}

export function moodScore(
  needs: Needs,
  moodlets: Moodlet[],
  gameMinute: number,
  heatingOn: boolean,
): number {
  const average = NEED_KEYS.reduce((sum, key) => sum + needs[key], 0) / NEED_KEYS.length;
  const bonus = activeMoodlets(moodlets, gameMinute).reduce((sum, moodlet) => sum + moodlet.value, 0);
  const heating = heatingOn ? 0 : -15;
  return Math.min(100, Math.max(0, average + bonus + heating));
}

export function moodBand(score: number): MoodBand {
  if (score < 20) return "Miserable";
  if (score < 40) return "Low";
  if (score < 60) return "Fine";
  if (score < 80) return "Happy";
  return "Buzzing";
}

/** Server uses the same curve. 0 → 0.7×, 100 → 1.3×. */
export function wageMultiplier(score: number): number {
  const clamped = Math.min(100, Math.max(0, score));
  return 0.7 + (clamped / 100) * 0.6;
}
