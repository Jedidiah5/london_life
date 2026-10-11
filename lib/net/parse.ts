import { emptySkills } from "@/lib/content";
import { SKILL_KEYS } from "@/lib/sim/constants";
import { fullNeeds } from "@/lib/sim/needs";
import type { ServerSnapshot } from "@/lib/store/useGame";
import type {
  ActiveShift,
  Appearance,
  Friend,
  InventoryItem,
  LedgerEntry,
  Needs,
} from "@/lib/sim/types";
import { NEED_KEYS } from "@/lib/sim/types";

function record(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === "object" && !Array.isArray(value)) return value as Record<string, unknown>;
  return null;
}

function num(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function str(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function appearanceOf(value: unknown): Appearance {
  const row = record(value);
  return {
    body: row?.body === "b" ? "b" : "a",
    skin: str(row?.skin, "#e0ac7a"),
    hair: str(row?.hair, "short"),
    hairColor: str(row?.hairColor, "#1c1c1c"),
    top: str(row?.top, "#1f4b99"),
    bottom: str(row?.bottom, "#243044"),
    shoes: str(row?.shoes, "#1a1a1a"),
    style: str(row?.style, "casual"),
  };
}

function needsOf(value: unknown): Needs {
  const row = record(value);
  const base = fullNeeds(80);
  if (!row) return base;
  for (const key of NEED_KEYS) base[key] = num(row[key], base[key]);
  return base;
}

function skillsOf(value: unknown): Record<string, number> {
  const row = record(value);
  const skills = emptySkills();
  if (!row) return skills;
  for (const key of SKILL_KEYS) skills[key] = num(row[key], 0);
  return skills;
}

function inventoryOf(value: unknown): InventoryItem[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    const row = record(entry);
    if (!row) return [];
    const id = str(row.id);
    const itemId = str(row.item_id ?? row.itemId);
    if (!id || !itemId) return [];
    return [
      {
        id,
        itemId,
        placed: row.placed === true,
        x: num(row.x),
        y: num(row.y),
        rotation: num(row.rotation),
        colour: str(row.colour, "#f4f1ea"),
      },
    ];
  });
}

function ledgerOf(value: unknown): LedgerEntry[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    const row = record(entry);
    if (!row) return [];
    return [
      {
        id: str(row.id, String(num(row.id))),
        amountPence: num(row.amount_pence ?? row.amountPence),
        kind: str(row.kind, "purchase"),
        ref: typeof row.ref === "string" ? row.ref : null,
        createdAt: str(row.created_at ?? row.createdAt),
      },
    ];
  });
}

function friendsOf(value: unknown): Friend[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    const row = record(entry);
    if (!row) return [];
    const simId = str(row.simId ?? row.sim_id);
    if (!simId) return [];
    return [{ simId, username: str(row.username), name: str(row.name, "Londoner") }];
  });
}

function shiftOf(value: unknown): ActiveShift | null {
  const row = record(value);
  if (!row) return null;
  const jobId = str(row.jobId ?? row.job_id);
  const startedAt = str(row.startedAt ?? row.started_at);
  if (!jobId || !startedAt) return null;
  return {
    jobId,
    startedAt,
    expectedSeconds: num(row.expectedSeconds ?? row.expected_seconds, 60),
    moodScore: num(row.moodScore ?? row.mood_score, 50),
  };
}

export function parseState(value: unknown): ServerSnapshot | null {
  const root = record(value);
  const sim = record(root?.sim);
  if (!root || !sim) return null;
  const simId = str(sim.id);
  if (!simId) return null;
  return {
    simId,
    username: str(root.username),
    name: str(sim.name, "Londoner"),
    appearance: appearanceOf(sim.appearance),
    traits: Array.isArray(sim.traits) ? sim.traits.filter((trait) => typeof trait === "string") : [],
    aspiration: str(sim.aspiration, "property_ladder"),
    balancePence: num(sim.balance_pence),
    oysterPence: num(sim.oyster_pence),
    homeId: str(sim.home_id, "boxroom_z4"),
    location: str(sim.location, "home"),
    needs: needsOf(sim.needs),
    skills: skillsOf(sim.skills),
    gameMinutes: num(sim.game_time, 480),
    heatingOn: sim.heating_on !== false,
    rentMisses: num(sim.rent_misses),
    sofaSurfing: sim.sofa_surfing === true,
    lastUpkeepMinute: num(sim.last_upkeep_minute),
    shift: shiftOf(sim.active_shift),
    inventory: inventoryOf(root.inventory),
    ledger: ledgerOf(root.ledger),
    friends: friendsOf(root.friends),
  };
}

export function parseCheckpoint(value: unknown): Partial<ServerSnapshot> & { needs: Needs; gameMinutes: number } | null {
  const row = record(value);
  if (!row) return null;
  return {
    needs: needsOf(row.needs),
    gameMinutes: num(row.game_time, 480),
    balancePence: num(row.balance_pence),
    oysterPence: num(row.oyster_pence),
    rentMisses: num(row.rent_misses),
    sofaSurfing: row.sofa_surfing === true,
    homeId: str(row.home_id, "boxroom_z4"),
    heatingOn: row.heating_on !== false,
    lastUpkeepMinute: num(row.last_upkeep_minute),
  };
}
