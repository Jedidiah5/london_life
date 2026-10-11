import type { EventDef, Nationality } from "./types";

export function eventsFor(events: EventDef[], venueId: string, hasHeritage: boolean): EventDef[] {
  return events.filter(
    (event) => (event.venues.includes("*") || event.venues.includes(venueId)) && (!event.heritage || hasHeritage),
  );
}

/** `roll` is a uniform number in [0, 1). */
export function pickEvent(events: EventDef[], venueId: string, hasHeritage: boolean, roll: number): EventDef | null {
  const pool = eventsFor(events, venueId, hasHeritage);
  if (pool.length === 0) return null;
  const index = Math.min(pool.length - 1, Math.floor(Math.max(0, roll) * pool.length));
  return pool[index] ?? null;
}

export function checkChance(skillLevel: number, difficulty: number): number {
  return Math.min(0.95, Math.max(0.1, 0.55 + 0.15 * (skillLevel - difficulty)));
}

export function passesCheck(skillLevel: number, difficulty: number, roll: number): boolean {
  return roll < checkChance(skillLevel, difficulty);
}

export function fillTemplate(text: string, nation: Nationality | null): string {
  if (!nation) return text;
  return text
    .replaceAll("{demonym}", nation.demonym)
    .replaceAll("{greeting}", nation.greeting)
    .replaceAll("{dish}", nation.dish)
    .replaceAll("{country}", nation.label);
}
