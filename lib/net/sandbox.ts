import {
  DEFAULT_FINISHES,
  actionsById,
  catalogueById,
  finishesById,
  goals,
  homesById,
  jobsById,
  localsAt,
  venuesById,
} from "@/lib/content";
import { levelAfter, titleFor } from "@/lib/sim/career";
import { weekIndex } from "@/lib/sim/clock";
import {
  GIFT_MAX_PENCE,
  NEED_DECAY_PER_HOUR,
  OVERDRAFT_LIMIT_PENCE,
  SKILL_KEYS,
  SKILL_MAX,
  SHIFT_XP,
  LEVEL_PAY_STEP,
  OYSTER_TOP_UPS,
  STARTING_PENCE,
  OYSTER_START_PENCE,
  ASPIRATIONS,
  HOME_SPEED_MAX,
  SLEEP_SPEED,
} from "@/lib/sim/constants";
import { goalReady, nextGoal } from "@/lib/sim/goals";
import { wageMultiplier } from "@/lib/sim/mood";
import { coveredTiles } from "@/lib/sim/placement";
import { travelQuote } from "@/lib/sim/travel";
import { applyUpkeep } from "@/lib/sim/upkeep";
import {
  NEED_KEYS,
  type Finishes,
  type Needs,
  type TravelMode,
} from "@/lib/sim/types";

/**
 * Offline stand-in for the Supabase RPCs. Same names, arguments, rules and
 * JSON shapes as supabase/migrations, so the client cannot tell the difference.
 * It never syncs anywhere; it is the "server" for a single browser.
 */

type Json = Record<string, unknown>;

interface Row {
  id: string;
  item_id: string;
  placed: boolean;
  x: number;
  y: number;
  rotation: number;
  colour: string;
}

interface Txn {
  id: string;
  amount_pence: number;
  kind: string;
  ref: string | null;
  created_at: string;
}

interface Sim {
  id: string;
  name: string;
  appearance: Json;
  traits: string[];
  aspiration: string;
  balance_pence: number;
  home_id: string;
  needs: Needs;
  skills: Record<string, number>;
  location: string;
  game_time: number;
  heating_on: boolean;
  rent_misses: number;
  last_upkeep_minute: number;
  sofa_surfing: boolean;
  oyster_pence: number;
  active_shift: Json | null;
  career: { job_id: string; level: number; shifts_done: number } | null;
  stats: Record<string, number>;
  goals_done: string[];
  allowance: Partial<Needs>;
  last_call_minute: number;
  busy_until: number;
  finishes?: Finishes;
  owned_finishes?: string[];
  updated_at: number;
}

interface Db {
  username: string;
  sim: Sim | null;
  inventory: Row[];
  transactions: Txn[];
  seq: number;
}

export interface SandboxStorage {
  read: () => string | null;
  write: (value: string) => void;
}

export interface Sandbox {
  rpc: (fn: string, args: Json) => { data: unknown; error: string | null };
  reset: () => void;
}

class RpcError extends Error {}

function fail(message: string): never {
  throw new RpcError(message);
}

const emptyDb = (): Db => ({
  username: "",
  sim: null,
  inventory: [],
  transactions: [],
  seq: 0,
});

function num(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function str(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export function createSandbox(
  storage: SandboxStorage,
  now: () => number = Date.now,
): Sandbox {
  const load = (): Db => {
    const raw = storage.read();
    if (!raw) return emptyDb();
    try {
      const parsed = JSON.parse(raw) as Db;
      return parsed && typeof parsed === "object"
        ? { ...emptyDb(), ...parsed }
        : emptyDb();
    } catch {
      return emptyDb();
    }
  };

  const nextId = (db: Db, prefix: string) => {
    db.seq += 1;
    return `${prefix}-${now().toString(36)}-${db.seq}`;
  };

  const log = (db: Db, amount: number, kind: string, ref: string | null) => {
    db.transactions.unshift({
      id: nextId(db, "txn"),
      amount_pence: Math.round(amount),
      kind,
      ref,
      created_at: new Date(now()).toISOString(),
    });
    db.transactions = db.transactions.slice(0, 60);
  };

  const mine = (db: Db): Sim => db.sim ?? fail("No sim");

  const bump = (sim: Sim, stat: string) => {
    sim.stats = { ...sim.stats, [stat]: (sim.stats[stat] ?? 0) + 1 };
  };

  const charge = (sim: Sim, pence: number, message = "Not enough money") => {
    if (sim.balance_pence - pence < -OVERDRAFT_LIMIT_PENCE) fail(message);
    sim.balance_pence -= pence;
  };

  const pack = (db: Db): Json => {
    const sim = mine(db);
    return {
      username: db.username,
      sim: { ...sim, updated_at: new Date(sim.updated_at).toISOString() },
      inventory: [...db.inventory].sort(
        (a, b) => Number(b.placed) - Number(a.placed),
      ),
      ledger: db.transactions.slice(0, 30),
      friends: [],
    };
  };

  const upkeep = (db: Db, sim: Sim, time: number) => {
    const home = homesById[sim.home_id];
    const weeks = Math.max(
      0,
      weekIndex(time) - weekIndex(sim.last_upkeep_minute),
    );
    const days = Math.floor(Math.max(time - sim.game_time, 0) / 1440);
    const result = applyUpkeep(
      sim.balance_pence,
      weeks,
      days,
      home?.rentPence ?? 0,
      sim.heating_on,
      sim.sofa_surfing,
    );
    if (result.total > 0 && result.missed) {
      sim.rent_misses += weeks;
      log(
        db,
        -Math.min(result.total, sim.balance_pence + OVERDRAFT_LIMIT_PENCE),
        "rent",
        "missed",
      );
      sim.balance_pence = -OVERDRAFT_LIMIT_PENCE;
      if (sim.rent_misses >= 2) {
        sim.sofa_surfing = true;
        sim.home_id = "sofa";
      }
    } else if (result.total > 0) {
      sim.balance_pence = result.nextBalance;
      if (weeks > 0) {
        sim.rent_misses = 0;
        bump(sim, "rent");
        log(db, -(result.total - result.interest), "rent", "weekly");
      }
      if (result.interest > 0) log(db, -result.interest, "bill", "overdraft");
    }
    sim.last_upkeep_minute = time;
    sim.game_time = time;
  };

  const handlers: Record<string, (db: Db, args: Json) => unknown> = {
    get_state: (db) => (db.sim ? pack(db) : null),

    create_sim: (db, args) => {
      const username = str(args.p_username);
      const name = str(args.p_name).trim();
      const traits = Array.isArray(args.p_traits)
        ? args.p_traits.filter((t) => typeof t === "string")
        : [];
      const aspiration = str(args.p_aspiration);
      if (!/^[A-Za-z0-9_]{3,20}$/.test(username))
        fail("Username must be 3-20 letters, numbers, or _");
      if (name.length < 1 || name.length > 24) fail("Name is too long");
      if (traits.length !== 2) fail("Pick two traits");
      if (!ASPIRATIONS.some((entry) => entry.id === aspiration))
        fail("Pick an aspiration");
      db.username = username;
      if (!db.sim) {
        db.sim = {
          id: nextId(db, "sim"),
          name,
          appearance: (args.p_appearance as Json) ?? {},
          traits,
          aspiration,
          balance_pence: STARTING_PENCE,
          home_id: "boxroom_z4",
          needs: {
            hunger: 80,
            energy: 80,
            hygiene: 80,
            bladder: 80,
            fun: 70,
            social: 60,
          },
          skills: Object.fromEntries(SKILL_KEYS.map((key) => [key, 0])),
          location: "home",
          game_time: 480,
          heating_on: true,
          rent_misses: 0,
          last_upkeep_minute: 0,
          sofa_surfing: false,
          oyster_pence: OYSTER_START_PENCE,
          active_shift: null,
          career: null,
          stats: {},
          goals_done: [],
          allowance: {},
          last_call_minute: 480,
          busy_until: 0,
          finishes: { ...DEFAULT_FINISHES },
          owned_finishes: Object.values(DEFAULT_FINISHES),
          updated_at: now(),
        };
        db.inventory = [
          {
            id: nextId(db, "inv"),
            item_id: "mattress",
            placed: true,
            x: 0,
            y: 0,
            rotation: 0,
            colour: "#d9c7a6",
          },
          {
            id: nextId(db, "inv"),
            item_id: "plastic_chair",
            placed: true,
            x: 2,
            y: 0,
            rotation: 0,
            colour: "#d7d7d4",
          },
        ];
        log(db, STARTING_PENCE, "wage", "arrival");
      }
      return pack(db);
    },

    checkpoint_needs: (db, args) => {
      const sim = mine(db);
      const wall = Math.max(0, (now() - sim.updated_at) / 1000);
      const claimed = Math.round(num(args.p_game_time));
      const trusted = Math.min(
        Math.max(claimed, sim.game_time),
        sim.game_time + Math.floor(wall * SLEEP_SPEED + 2),
      );
      const hours = Math.max(trusted - sim.game_time, 0) / 60;
      const naturalGain = Math.min(80, (Math.max(wall, 1) / 15) * 25);
      const wanted = (args.p_needs ?? {}) as Record<string, unknown>;
      const next = { ...sim.needs };
      const allowance = { ...sim.allowance };
      for (const key of NEED_KEYS) {
        const old = sim.needs[key] ?? 80;
        const value =
          typeof wanted[key] === "number" ? (wanted[key] as number) : old;
        const floor = Math.max(
          0,
          old - NEED_DECAY_PER_HOUR[key] * hours * 1.25 - 1,
        );
        const ceiling = old + naturalGain + (allowance[key] ?? 0);
        const clamped = Math.min(
          100,
          Math.max(0, Math.min(Math.max(value, floor), ceiling)),
        );
        const used = Math.max(0, clamped - old - naturalGain);
        allowance[key] = Math.max(0, (allowance[key] ?? 0) - used);
        next[key] = Math.round(clamped * 100) / 100;
      }
      sim.needs = next;
      sim.allowance = allowance;
      sim.heating_on = args.p_heating !== false;
      upkeep(db, sim, trusted);
      sim.updated_at = now();
      return {
        needs: sim.needs,
        game_time: sim.game_time,
        balance_pence: sim.balance_pence,
        oyster_pence: sim.oyster_pence,
        rent_misses: sim.rent_misses,
        sofa_surfing: sim.sofa_surfing,
        home_id: sim.home_id,
        heating_on: sim.heating_on,
        last_upkeep_minute: sim.last_upkeep_minute,
        stats: sim.stats,
      };
    },

    buy_item: (db, args) => {
      const sim = mine(db);
      const item = catalogueById[str(args.p_item)] ?? fail("Unknown item");
      charge(sim, item.pricePence, "Overdraft is maxed out");
      const row: Row = {
        id: nextId(db, "inv"),
        item_id: item.id,
        placed: false,
        x: 0,
        y: 0,
        rotation: 0,
        colour: str(args.p_colour) || "#f4f1ea",
      };
      db.inventory.push(row);
      log(db, -item.pricePence, "purchase", item.id);
      return { balance_pence: sim.balance_pence, item: row };
    },

    buy_finish: (db, args) => {
      const sim = mine(db);
      const finish =
        finishesById[str(args.p_finish)] ?? fail("Unknown paint or floor");
      const owned = new Set([
        ...Object.values(DEFAULT_FINISHES),
        ...(sim.owned_finishes ?? []),
      ]);
      if (!owned.has(finish.id)) {
        charge(sim, finish.pricePence, "Overdraft is maxed out");
        owned.add(finish.id);
        log(db, -finish.pricePence, "purchase", finish.id);
      }
      sim.owned_finishes = [...owned];
      sim.finishes = {
        ...DEFAULT_FINISHES,
        ...sim.finishes,
        [finish.kind]: finish.id,
      };
      return {
        balance_pence: sim.balance_pence,
        finishes: sim.finishes,
        owned_finishes: sim.owned_finishes,
      };
    },

    sell_item: (db, args) => {
      const sim = mine(db);
      const row =
        db.inventory.find((entry) => entry.id === str(args.p_inventory)) ??
        fail("You do not own that");
      const refund = Math.floor(
        (catalogueById[row.item_id]?.pricePence ?? 0) / 2,
      );
      db.inventory = db.inventory.filter((entry) => entry.id !== row.id);
      sim.balance_pence += refund;
      log(db, refund, "sale", row.item_id);
      return { balance_pence: sim.balance_pence, refund_pence: refund };
    },

    place_item: (db, args) => {
      const sim = mine(db);
      const rotation = num(args.p_rotation);
      if (rotation < 0 || rotation > 3) fail("Bad rotation");
      const row =
        db.inventory.find((entry) => entry.id === str(args.p_inventory)) ??
        fail("You do not own that");
      const item = catalogueById[row.item_id] ?? fail("Unknown item");
      const home = homesById[sim.home_id] ?? fail("No home");
      const x = num(args.p_x);
      const y = num(args.p_y);
      if (item.footprint === "wall" && y !== 0)
        fail("Wall lamps sit on the back wall");
      const tiles = coveredTiles({ x, y }, item.footprint, rotation);
      if (
        tiles.some(
          (tile) =>
            tile.x < 0 ||
            tile.y < 0 ||
            tile.x >= home.width ||
            tile.y >= home.height,
        )
      ) {
        fail("That does not fit");
      }
      if (item.blocks) {
        const mineTiles = new Set(tiles.map((tile) => `${tile.x},${tile.y}`));
        for (const other of db.inventory) {
          if (other.id === row.id || !other.placed) continue;
          const def = catalogueById[other.item_id];
          if (!def?.blocks) continue;
          const hit = coveredTiles(other, def.footprint, other.rotation).some(
            (t) => mineTiles.has(`${t.x},${t.y}`),
          );
          if (hit) fail("Something is already there");
        }
        for (const fixture of home.fixtures) {
          if (!fixture.blocks) continue;
          const footprint = catalogueById[fixture.itemId]?.footprint ?? [1, 1];
          const hit = coveredTiles(fixture, footprint, fixture.rotation).some(
            (t) => mineTiles.has(`${t.x},${t.y}`),
          );
          if (hit)
            fail(
              `The ${(fixture.label ?? "fixture").toLowerCase()} is already there`,
            );
        }
      }
      if (!row.placed) bump(sim, "place");
      Object.assign(row, { placed: true, x, y, rotation });
      return { ok: true, stats: sim.stats };
    },

    set_heating: (db, args) => {
      mine(db).heating_on = args.p_on === true;
      return { heating_on: args.p_on === true };
    },

    top_up_oyster: (db, args) => {
      const sim = mine(db);
      const pence = num(args.p_pence);
      if (!OYSTER_TOP_UPS.some((value) => value === pence))
        fail("Top up £5, £10, or £20");
      charge(sim, pence, "Overdraft is maxed out");
      sim.oyster_pence += pence;
      log(db, -pence, "travel", "oyster");
      return {
        balance_pence: sim.balance_pence,
        oyster_pence: sim.oyster_pence,
      };
    },

    perform_action: (db, args) => {
      const sim = mine(db);
      const def = actionsById[str(args.p_action)] ?? fail("Not on the menu");
      if (sim.active_shift) fail("You are on shift");
      if (def.venue && sim.location !== def.venue) fail("Go there first");
      if (!def.venue && !def.anywhere && sim.location !== "home")
        fail("Only at home");
      if (
        def.requires &&
        (sim.skills[def.requires.skill] ?? 0) < def.requires.level
      )
        fail("Skill too low");
      const clock = now();
      if (sim.busy_until > clock + 180_000) fail("Queue is full");
      charge(sim, def.costPence);
      if (def.costPence > 0) log(db, -def.costPence, "purchase", def.id);
      if (def.skill && def.xp) {
        sim.skills = {
          ...sim.skills,
          [def.skill]: Math.min(
            SKILL_MAX,
            Math.round(((sim.skills[def.skill] ?? 0) + def.xp) * 100) / 100,
          ),
        };
      }
      const allowance = { ...sim.allowance };
      for (const key of NEED_KEYS) {
        const gain = def.effects[key] ?? 0;
        if (gain > 0)
          allowance[key] = Math.min(
            200,
            (allowance[key] ?? 0) + gain * (def.scales ? 1.6 : 1),
          );
      }
      sim.allowance = allowance;
      if ((def.effects.hunger ?? 0) > 0) bump(sim, "eat");
      if ((def.effects.hygiene ?? 0) > 0) bump(sim, "shower");
      if (def.heritage) bump(sim, "heritage");
      if (def.id === "call_home") {
        bump(sim, "call");
        sim.last_call_minute = sim.game_time;
      }
      sim.busy_until =
        Math.max(sim.busy_until, clock) + (def.minutes * 1000) / HOME_SPEED_MAX;
      return {
        balance_pence: sim.balance_pence,
        skills: sim.skills,
        stats: sim.stats,
        last_call_minute: sim.last_call_minute,
      };
    },

    claim_goal: (db, args) => {
      const sim = mine(db);
      const goal = nextGoal(goals, sim.goals_done) ?? fail("All goals done");
      if (goal.id !== str(args.p_goal)) fail("Do the goals in order");
      if (!goalReady(goal, sim.stats)) fail("Not done yet");
      sim.goals_done = [...sim.goals_done, goal.id];
      sim.balance_pence += goal.rewardPence;
      log(db, goal.rewardPence, "goal", goal.id);
      return {
        balance_pence: sim.balance_pence,
        goals_done: sim.goals_done,
        reward_pence: goal.rewardPence,
      };
    },

    apply_job: (db, args) => {
      const sim = mine(db);
      const job = jobsById[str(args.p_job)] ?? fail("Unknown job");
      if (sim.active_shift) fail("Finish your shift first");
      if (sim.career?.job_id === job.id) fail("You already work there");
      if (job.skill && (sim.skills[job.skill] ?? 0) < job.skillRequired)
        fail("Skill too low");
      sim.career = { job_id: job.id, level: 0, shifts_done: 0 };
      bump(sim, "job");
      return { career: sim.career, stats: sim.stats };
    },

    start_shift: (db, args) => {
      const sim = mine(db);
      if (sim.active_shift) fail("You are already on shift");
      const job = jobsById[str(args.p_job)] ?? fail("Unknown job");
      if (sim.career?.job_id !== job.id) fail("Apply for this job first");
      if (sim.location !== job.venue) fail("Go there first");
      const average =
        NEED_KEYS.reduce((sum, key) => sum + (sim.needs[key] ?? 0), 0) /
        NEED_KEYS.length;
      const mood = Math.min(
        100,
        Math.max(0, average + (sim.heating_on ? 0 : -15)),
      );
      sim.active_shift = {
        jobId: job.id,
        startedAt: new Date(now()).toISOString(),
        expectedSeconds: job.hours * 60,
        moodScore: Math.round(mood * 100) / 100,
      };
      return { shift: sim.active_shift };
    },

    finish_shift: (db) => {
      const sim = mine(db);
      const shift = sim.active_shift ?? fail("You are not on shift");
      const job = jobsById[str(shift.jobId)] ?? fail("Unknown job");
      const elapsed = (now() - Date.parse(str(shift.startedAt))) / 1000;
      const expected = num(shift.expectedSeconds) || job.hours * 60;
      if (elapsed < expected * 0.9) fail("Shift is not finished");
      const career = sim.career ?? { job_id: job.id, level: 0, shifts_done: 0 };
      const levelBoost = 1 + LEVEL_PAY_STEP * career.level;
      let wage: number;
      if (job.tips) wage = 300 + Math.floor(Math.random() * 1701);
      else if (job.id === "delivery_rider")
        wage = (1000 + Math.floor(Math.random() * 601)) * job.hours;
      else
        wage =
          job.payPerHourPence *
          job.hours *
          wageMultiplier(num(shift.moodScore) || 50);
      wage = Math.round(wage * levelBoost);
      sim.skills = {
        ...sim.skills,
        [job.xpSkill]: Math.min(
          SKILL_MAX,
          (sim.skills[job.xpSkill] ?? 0) + SHIFT_XP,
        ),
      };
      sim.needs = {
        ...sim.needs,
        energy: Math.max(0, sim.needs.energy - job.energyCost),
      };
      const shiftsDone = career.shifts_done + 1;
      const level = levelAfter(job, shiftsDone);
      const promoted = level > career.level;
      sim.career = { job_id: job.id, level, shifts_done: shiftsDone };
      sim.active_shift = null;
      sim.balance_pence += wage;
      bump(sim, "shift");
      log(db, wage, "wage", job.id);
      return {
        balance_pence: sim.balance_pence,
        wage_pence: wage,
        skills: sim.skills,
        needs: sim.needs,
        job_id: job.id,
        career: sim.career,
        promoted,
        title: titleFor(job, level),
        stats: sim.stats,
      };
    },

    travel: (db, args) => {
      const sim = mine(db);
      const mode = str(args.p_mode) as TravelMode;
      if (!["tube", "bus", "walk", "ride"].includes(mode))
        fail("Unknown way to travel");
      const destination = str(args.p_destination);
      const toZone =
        destination === "home"
          ? homesById[sim.home_id]?.zone
          : venuesById[destination]?.zone;
      if (toZone === undefined || destination === "") fail("Unknown place");
      if (sim.location === destination)
        fail(
          destination === "home"
            ? "You are already home"
            : "You are already there",
        );
      if (sim.active_shift) fail("Finish your shift first");
      const fromZone =
        sim.location === "home"
          ? (homesById[sim.home_id]?.zone ?? 4)
          : (venuesById[sim.location]?.zone ?? 1);
      const quote = travelQuote(fromZone, toZone, mode);
      if (quote.paysWith === "oyster") {
        if (sim.oyster_pence < quote.pence) fail("Top up your Oyster");
        sim.oyster_pence -= quote.pence;
      } else if (quote.pence > 0) {
        charge(sim, quote.pence);
        log(db, -quote.pence, "travel", mode);
      }
      sim.location = destination;
      sim.needs = {
        ...sim.needs,
        energy: Math.max(0, sim.needs.energy - quote.energy),
      };
      if (destination !== "home") bump(sim, "travel");
      return {
        balance_pence: sim.balance_pence,
        oyster_pence: sim.oyster_pence,
        location: sim.location,
        needs_energy: sim.needs.energy,
        stats: sim.stats,
      };
    },

    greet: (db, args) => {
      const sim = mine(db);
      const target = str(args.p_target);
      const local = localsAt(sim.location).find((entry) => entry.id === target);
      if (!local) fail("They're not here");
      bump(sim, "hello");
      return { stats: sim.stats };
    },

    send_gift: (_db, args) => {
      const pence = num(args.p_pence);
      if (pence < 100 || pence > GIFT_MAX_PENCE) fail("Gifts are £1 to £20");
      return fail("Gifts need the online city");
    },
    add_friend: () => fail("Friends need the online city"),
    get_home: () => fail("Visiting needs the online city"),
  };

  return {
    rpc: (fn, args) => {
      const handler = handlers[fn];
      if (!handler) return { data: null, error: `Unknown function ${fn}` };
      const db = load();
      try {
        const data = handler(db, args);
        storage.write(JSON.stringify(db));
        return {
          data: data === undefined ? null : JSON.parse(JSON.stringify(data)),
          error: null,
        };
      } catch (error) {
        if (error instanceof RpcError)
          return { data: null, error: error.message };
        throw error;
      }
    },
    reset: () => storage.write(JSON.stringify(emptyDb())),
  };
}

const SANDBOX_KEY = "london-life-sandbox";

let browserSandbox: Sandbox | null = null;

export function getSandbox(): Sandbox {
  if (!browserSandbox) {
    browserSandbox = createSandbox({
      read: () =>
        typeof window === "undefined"
          ? null
          : window.localStorage.getItem(SANDBOX_KEY),
      write: (value) => {
        if (typeof window !== "undefined")
          window.localStorage.setItem(SANDBOX_KEY, value);
      },
    });
  }
  return browserSandbox;
}
