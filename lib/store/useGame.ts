"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { actionsById, catalogueById, emptySkills, roomLayout, targetMenu } from "@/lib/content";
import { makeAction, tickAction } from "@/lib/sim/actions";
import { defaultAppearance, normaliseAppearance } from "@/lib/sim/appearance";
import { advanceClock } from "@/lib/sim/clock";
import { NEED_LABELS, OYSTER_START_PENCE, SLEEP_SPEED, STARTING_PENCE, START_GAME_MINUTES } from "@/lib/sim/constants";
import { missingHome } from "@/lib/sim/home";
import { activeMoodlets } from "@/lib/sim/mood";
import { decayNeeds, fullNeeds, warningsFor } from "@/lib/sim/needs";
import { findPath } from "@/lib/sim/path";
import { coveredTiles, nearestStand } from "@/lib/sim/placement";
import { blockingTiles, tileInside } from "@/lib/sim/room";
import type {
  ActionDef,
  ActiveShift,
  Appearance,
  Career,
  Friend,
  InventoryItem,
  LedgerEntry,
  Moodlet,
  Needs,
  SimAction,
  Speed,
  Tile,
} from "@/lib/sim/types";

export interface CreateInput {
  username: string;
  name: string;
  appearance: Appearance;
  traits: string[];
  aspiration: string;
}

export interface ServerSnapshot {
  simId: string;
  username: string;
  name: string;
  appearance: Appearance;
  traits: string[];
  aspiration: string;
  balancePence: number;
  oysterPence: number;
  homeId: string;
  location: string;
  needs: Needs;
  skills: Record<string, number>;
  gameMinutes: number;
  heatingOn: boolean;
  rentMisses: number;
  sofaSurfing: boolean;
  lastUpkeepMinute: number;
  shift: ActiveShift | null;
  career: Career | null;
  stats: Record<string, number>;
  goalsDone: string[];
  lastCallMinute: number;
  inventory: InventoryItem[];
  ledger: LedgerEntry[];
  friends: Friend[];
}

interface GameState {
  created: boolean;
  simId: string | null;
  username: string;
  name: string;
  appearance: Appearance;
  traits: string[];
  aspiration: string;
  needs: Needs;
  moodlets: Moodlet[];
  balancePence: number;
  oysterPence: number;
  homeId: string;
  location: string;
  gameMinutes: number;
  speed: Speed;
  heatingOn: boolean;
  inventory: InventoryItem[];
  tile: Tile;
  path: Tile[];
  pending: SimAction | null;
  action: SimAction | null;
  queue: SimAction[];
  rentMisses: number;
  sofaSurfing: boolean;
  lastUpkeepMinute: number;
  skills: Record<string, number>;
  shift: ActiveShift | null;
  career: Career | null;
  stats: Record<string, number>;
  goalsDone: string[];
  lastCallMinute: number;
  ledger: LedgerEntry[];
  friends: Friend[];
  readOnly: boolean;
  hydrate: (snapshot: ServerSnapshot) => void;
  tick: (realSeconds: number) => string[];
  walkTo: (tile: Tile) => string | null;
  /** Queue an action the server has already accepted. Walks to the target first. */
  queueAction: (def: ActionDef, target: string | null) => string | null;
  canQueue: () => string | null;
  arrive: () => void;
  setSpeed: (speed: Speed) => void;
  setHeatingLocal: (on: boolean) => void;
  applyCheckpoint: (patch: Partial<ServerSnapshot> & { needs: Needs; gameMinutes: number }) => void;
  applyMoney: (balancePence: number, oysterPence?: number, entry?: LedgerEntry) => void;
  upsertInventory: (item: InventoryItem) => void;
  removeInventory: (id: string) => void;
  setShift: (shift: ActiveShift | null) => void;
  setSkills: (skills: Record<string, number>) => void;
  setStats: (stats: Record<string, number>) => void;
  setCareer: (career: Career | null) => void;
  setGoalsDone: (goals: string[]) => void;
  setLastCall: (minute: number) => void;
  setNeeds: (needs: Needs) => void;
  bumpNeeds: (delta: Partial<Needs>) => void;
  setLocation: (location: string) => void;
  addMoodlet: (moodlet: Omit<Moodlet, "expiresAtGameMinute">, minutes?: number) => void;
  setFriends: (friends: Friend[]) => void;
  setReadOnly: (readOnly: boolean) => void;
  reset: () => void;
}

let actionSeq = 0;

function nextActionId(): string {
  actionSeq += 1;
  return `act-${Date.now().toString(36)}-${actionSeq}`;
}

const QUEUE_LIMIT = 3;

function homeItems(state: { location: string; inventory: InventoryItem[] }): InventoryItem[] {
  return state.location === "home" ? state.inventory : [];
}

function targetTiles(id: string, location: string, homeId: string, inventory: InventoryItem[]): Tile[] | null {
  const layout = roomLayout(location, homeId, null);
  const fixture = layout.fixtures.find((entry) => entry.id === id);
  if (fixture) {
    const footprint = catalogueById[fixture.itemId]?.footprint ?? [1, 1];
    return coveredTiles(fixture, footprint, fixture.rotation);
  }
  const owned = inventory.find((item) => item.id === id && item.placed);
  const item = owned ? catalogueById[owned.itemId] : undefined;
  if (!owned || !item) return null;
  return coveredTiles(owned, item.footprint, owned.rotation);
}

const blank = {
  created: false,
  simId: null,
  username: "",
  name: "",
  appearance: defaultAppearance(),
  traits: [],
  aspiration: "property_ladder",
  needs: fullNeeds(80),
  moodlets: [],
  balancePence: STARTING_PENCE,
  oysterPence: OYSTER_START_PENCE,
  homeId: "boxroom_z4",
  location: "home",
  gameMinutes: START_GAME_MINUTES,
  speed: 1 as Speed,
  heatingOn: true,
  inventory: [],
  tile: { x: 2, y: 2 },
  path: [],
  pending: null,
  action: null,
  queue: [],
  rentMisses: 0,
  sofaSurfing: false,
  lastUpkeepMinute: 0,
  skills: emptySkills(),
  shift: null,
  career: null,
  stats: {},
  goalsDone: [],
  lastCallMinute: START_GAME_MINUTES,
  ledger: [],
  friends: [],
  readOnly: false,
} satisfies Partial<GameState>;

export const useGame = create<GameState>()(
  persist(
    (set, get) => ({
      ...blank,
      hydrate: (snapshot) => {
        const current = get();
        const samePlace =
          current.created && current.simId === snapshot.simId && current.location === snapshot.location;
        set({
          created: true,
          simId: snapshot.simId,
          username: snapshot.username,
          name: snapshot.name,
          appearance: snapshot.appearance,
          traits: snapshot.traits,
          aspiration: snapshot.aspiration,
          needs: snapshot.needs,
          balancePence: snapshot.balancePence,
          oysterPence: snapshot.oysterPence,
          homeId: snapshot.homeId,
          location: snapshot.location,
          gameMinutes: Math.max(snapshot.gameMinutes, samePlace ? current.gameMinutes : 0),
          heatingOn: snapshot.heatingOn,
          rentMisses: snapshot.rentMisses,
          sofaSurfing: snapshot.sofaSurfing,
          lastUpkeepMinute: snapshot.lastUpkeepMinute,
          skills: snapshot.skills,
          shift: snapshot.shift,
          career: snapshot.career,
          stats: snapshot.stats,
          goalsDone: snapshot.goalsDone,
          lastCallMinute: snapshot.lastCallMinute,
          inventory: snapshot.inventory,
          ledger: snapshot.ledger,
          friends: snapshot.friends,
          tile: samePlace ? current.tile : { x: 2, y: 2 },
          path: samePlace ? current.path : [],
          action: samePlace ? current.action : null,
          queue: samePlace ? current.queue : [],
          pending: samePlace ? current.pending : null,
          readOnly: false,
        });
      },
      tick: (realSeconds) => {
        const state = get();
        if (!state.created || realSeconds <= 0) return [];
        const sleeping = !state.shift && !state.readOnly && state.action?.anim === "sleep";
        const homeSpeed = state.location === "home" && !state.readOnly && !state.shift ? state.speed : 1;
        const elapsed = advanceClock(0, realSeconds, sleeping ? SLEEP_SPEED : homeSpeed);
        const gameMinutes = state.gameMinutes + elapsed;
        let needs = decayNeeds(state.needs, elapsed / 60, Boolean(state.shift), sleeping);
        let action = state.action;
        let queue = state.queue;
        if (action) {
          const stepped = tickAction(action, needs, elapsed);
          needs = stepped.needs;
          action = stepped.action;
        }
        if (!action && queue.length > 0 && state.path.length === 0 && !state.pending) {
          action = queue[0] ?? null;
          queue = queue.slice(1);
        }
        const notes = warningsFor(state.needs, needs).map((key) => `${NEED_LABELS[key]} is getting low`);
        const passOut = actionsById.pass_out;
        if (needs.energy <= 0 && !action && queue.length === 0 && !state.shift && passOut) {
          action = makeAction(passOut, 1, nextActionId());
          notes.push("You passed out");
        }
        let moodlets = activeMoodlets(state.moodlets, gameMinutes);
        if (missingHome(state.lastCallMinute, gameMinutes) && !moodlets.some((m) => m.id === "missing_home")) {
          moodlets = [
            ...moodlets,
            { id: "missing_home", label: "Missing home", emoji: "🥺", value: -8, expiresAtGameMinute: gameMinutes + 60 },
          ];
          notes.push("You're missing home. Give them a call.");
        }
        set({ gameMinutes, needs, action, queue, moodlets });
        return notes;
      },
      walkTo: (tile) => {
        const state = get();
        if (state.readOnly) return "You're only visiting";
        if (state.action || state.shift) return "You're busy";
        const layout = roomLayout(state.location, state.homeId, null);
        if (!tileInside(tile, layout.width, layout.height)) return null;
        const blocked = blockingTiles(layout, homeItems(state));
        if (blocked.has(`${tile.x},${tile.y}`)) return null;
        const path = findPath(state.tile, tile, blocked, layout.width, layout.height);
        if (!path) return "Can't get there";
        set({ path, pending: null, queue: [] });
        return null;
      },
      canQueue: () => {
        const state = get();
        if (state.readOnly) return "You're only visiting";
        if (state.shift) return "You're on shift";
        const busy = (state.action ? 1 : 0) + state.queue.length + (state.pending ? 1 : 0);
        if (busy >= QUEUE_LIMIT + 1) return "Queue is full";
        return null;
      },
      queueAction: (def, target) => {
        const blocked = get().canQueue();
        if (blocked) return blocked;
        const state = get();
        const quality = target
          ? (targetMenu(target, roomLayout(state.location, state.homeId, null), homeItems(state))?.quality ?? 1)
          : 1;
        const next = makeAction(def, quality, nextActionId(), target);
        const busy = Boolean(state.action || state.pending || state.queue.length > 0 || state.path.length > 0);
        if (busy || !target) {
          if (!busy) set({ action: next });
          else set({ queue: [...state.queue, next] });
          return null;
        }
        const tiles = targetTiles(target, state.location, state.homeId, homeItems(state));
        if (!tiles) {
          set({ action: next });
          return null;
        }
        const layout = roomLayout(state.location, state.homeId, null);
        const blockedTiles = blockingTiles(layout, homeItems(state));
        const stand = nearestStand(tiles, state.tile, blockedTiles, layout.width, layout.height);
        if (!stand || (stand.x === state.tile.x && stand.y === state.tile.y)) {
          set({ action: next, path: [] });
          return null;
        }
        const path = findPath(state.tile, stand, blockedTiles, layout.width, layout.height);
        if (!path || path.length === 0) {
          set({ action: next, path: [] });
          return null;
        }
        set({ path, pending: next });
        return null;
      },
      arrive: () => {
        const state = get();
        if (state.path.length === 0) return;
        const [next, ...rest] = state.path;
        if (!next) return;
        if (rest.length > 0) {
          set({ tile: next, path: rest });
          return;
        }
        set({ tile: next, path: [], action: state.action ?? state.pending, pending: null });
      },
      setSpeed: (speed) => set({ speed }),
      setHeatingLocal: (heatingOn) => set({ heatingOn }),
      applyCheckpoint: (patch) =>
        set((state) => ({
          needs: patch.needs,
          gameMinutes: Math.max(state.gameMinutes - 5, patch.gameMinutes),
          balancePence: patch.balancePence ?? state.balancePence,
          oysterPence: patch.oysterPence ?? state.oysterPence,
          rentMisses: patch.rentMisses ?? state.rentMisses,
          sofaSurfing: patch.sofaSurfing ?? state.sofaSurfing,
          homeId: patch.homeId ?? state.homeId,
          heatingOn: patch.heatingOn ?? state.heatingOn,
          lastUpkeepMinute: patch.lastUpkeepMinute ?? state.lastUpkeepMinute,
          stats: patch.stats ?? state.stats,
        })),
      applyMoney: (balancePence, oysterPence, entry) =>
        set((state) => ({
          balancePence,
          oysterPence: oysterPence ?? state.oysterPence,
          ledger: entry ? [entry, ...state.ledger].slice(0, 30) : state.ledger,
        })),
      upsertInventory: (item) =>
        set((state) => {
          const index = state.inventory.findIndex((owned) => owned.id === item.id);
          if (index === -1) return { inventory: [...state.inventory, item] };
          const inventory = state.inventory.slice();
          inventory[index] = item;
          return { inventory };
        }),
      removeInventory: (id) => set((state) => ({ inventory: state.inventory.filter((item) => item.id !== id) })),
      setShift: (shift) =>
        set((state) => ({
          shift,
          path: [],
          pending: null,
          action: shift ? null : state.action,
          queue: shift ? [] : state.queue,
        })),
      setSkills: (skills) => set({ skills }),
      setStats: (stats) => set({ stats }),
      setCareer: (career) => set({ career }),
      setGoalsDone: (goalsDone) => set({ goalsDone }),
      setLastCall: (lastCallMinute) =>
        set((state) => ({
          lastCallMinute,
          moodlets: state.moodlets.filter((moodlet) => moodlet.id !== "missing_home"),
        })),
      setNeeds: (needs) => set({ needs }),
      bumpNeeds: (delta) =>
        set((state) => {
          const needs = { ...state.needs };
          for (const [key, amount] of Object.entries(delta)) {
            const need = key as keyof Needs;
            if (typeof amount === "number") needs[need] = Math.min(100, Math.max(0, needs[need] + amount));
          }
          return { needs };
        }),
      setLocation: (location) =>
        set({ location, tile: { x: 2, y: 2 }, path: [], pending: null, action: null, queue: [] }),
      addMoodlet: (moodlet, minutes = 180) =>
        set((state) => ({
          moodlets: [
            ...state.moodlets.filter((entry) => entry.label !== moodlet.label),
            { ...moodlet, expiresAtGameMinute: state.gameMinutes + minutes },
          ],
        })),
      setFriends: (friends) => set({ friends }),
      setReadOnly: (readOnly) => set({ readOnly, path: [], pending: null }),
      reset: () => set({ ...blank }),
    }),
    {
      name: "london-life-cache",
      version: 2,
      migrate: (persisted) => {
        const old = (persisted ?? {}) as Record<string, unknown>;
        return { ...old, created: false, appearance: normaliseAppearance(old.appearance) } as unknown as GameState;
      },
      partialize: (state) => ({
        created: state.created,
        simId: state.simId,
        username: state.username,
        name: state.name,
        appearance: state.appearance,
        traits: state.traits,
        aspiration: state.aspiration,
        needs: state.needs,
        moodlets: state.moodlets,
        balancePence: state.balancePence,
        oysterPence: state.oysterPence,
        homeId: state.homeId,
        location: state.location,
        gameMinutes: state.gameMinutes,
        speed: state.speed,
        heatingOn: state.heatingOn,
        inventory: state.inventory,
        tile: state.tile,
        rentMisses: state.rentMisses,
        sofaSurfing: state.sofaSurfing,
        lastUpkeepMinute: state.lastUpkeepMinute,
        skills: state.skills,
        shift: state.shift,
        career: state.career,
        stats: state.stats,
        goalsDone: state.goalsDone,
        lastCallMinute: state.lastCallMinute,
        ledger: state.ledger,
        friends: state.friends,
      }),
    },
  ),
);
