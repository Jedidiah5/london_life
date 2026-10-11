"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { catalogueById, emptySkills, roomLayout } from "@/lib/content";
import { makeAction, tickAction } from "@/lib/sim/actions";
import { LOW_NEED_GOAL, NEED_LABELS, STARTING_PENCE, START_GAME_MINUTES, OYSTER_START_PENCE, SKINS, HAIRS, TOPS, BOTTOMS, SHOES } from "@/lib/sim/constants";
import { advanceClock } from "@/lib/sim/clock";
import { bumpNeed, decayNeeds, fullNeeds, lowestNeed, warningsFor } from "@/lib/sim/needs";
import { activeMoodlets } from "@/lib/sim/mood";
import { findPath } from "@/lib/sim/path";
import { coveredTiles, nearestStand } from "@/lib/sim/placement";
import { blockingTiles, tileInside } from "@/lib/sim/room";
import type {
  ActionType,
  ActiveShift,
  Appearance,
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
  inventory: InventoryItem[];
  ledger: LedgerEntry[];
  friends: Friend[];
}

interface GameState {
  created: boolean;
  cloud: boolean;
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
  pendingInteract: string | null;
  action: SimAction | null;
  queue: SimAction[];
  rentMisses: number;
  sofaSurfing: boolean;
  lastUpkeepMinute: number;
  skills: Record<string, number>;
  shift: ActiveShift | null;
  ledger: LedgerEntry[];
  friends: Friend[];
  readOnly: boolean;
  weather: "rain";
  createLocal: (input: CreateInput) => void;
  hydrate: (snapshot: ServerSnapshot) => void;
  tick: (realSeconds: number) => string[];
  walkTo: (tile: Tile) => string | null;
  interact: (id: string) => string | null;
  arrive: () => void;
  setSpeed: (speed: Speed) => void;
  setHeatingLocal: (on: boolean) => void;
  applyCheckpoint: (patch: Partial<ServerSnapshot> & { needs: Needs; gameMinutes: number }) => void;
  applyMoney: (balancePence: number, oysterPence?: number, entry?: LedgerEntry) => void;
  upsertInventory: (item: InventoryItem) => void;
  removeInventory: (id: string) => void;
  setShift: (shift: ActiveShift | null) => void;
  setSkills: (skills: Record<string, number>) => void;
  setNeeds: (needs: Needs) => void;
  setLocation: (location: string, energyCost?: number) => void;
  addMoodlet: (moodlet: Moodlet) => void;
  bumpSocial: (amount: number) => void;
  setFriends: (friends: Friend[]) => void;
  setReadOnly: (readOnly: boolean) => void;
  goal: () => string;
}

const defaultAppearance = (): Appearance => ({
  body: "a",
  skin: SKINS[1] ?? "#e0ac7a",
  hair: "short",
  hairColor: HAIRS[0] ?? "#1c1c1c",
  top: TOPS[0] ?? "#1f4b99",
  bottom: BOTTOMS[0] ?? "#243044",
  shoes: SHOES[0] ?? "#1a1a1a",
  style: "casual",
});

function starterInventory(): InventoryItem[] {
  return [
    {
      id: "starter-bed",
      itemId: "mattress",
      placed: true,
      x: 0,
      y: 0,
      rotation: 0,
      colour: "#d9c7a6",
    },
    {
      id: "starter-chair",
      itemId: "plastic_chair",
      placed: true,
      x: 3,
      y: 3,
      rotation: 0,
      colour: "#d7d7d4",
    },
  ];
}

let actionSeq = 0;

function nextActionId(): string {
  actionSeq += 1;
  return `act-${actionSeq}`;
}

function targetOf(id: string, inventory: InventoryItem[]): {
  action: ActionType;
  effect: number;
  tiles: Tile[];
} | null {
  const owned = inventory.find((item) => item.id === id && item.placed);
  if (owned) {
    const catalogueItem = catalogueById[owned.itemId];
    if (!catalogueItem?.action) return null;
    return {
      action: catalogueItem.action,
      effect: catalogueItem.effect,
      tiles: coveredTiles({ x: owned.x, y: owned.y }, catalogueItem.footprint, owned.rotation),
    };
  }
  return null;
}

export const useGame = create<GameState>()(
  persist(
    (set, get) => ({
      created: false,
      cloud: false,
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
      speed: 1,
      heatingOn: true,
      inventory: [],
      tile: { x: 2, y: 2 },
      path: [],
      pendingInteract: null,
      action: null,
      queue: [],
      rentMisses: 0,
      sofaSurfing: false,
      lastUpkeepMinute: 0,
      skills: emptySkills(),
      shift: null,
      ledger: [],
      friends: [],
      readOnly: false,
      weather: "rain",
      goal: () => LOW_NEED_GOAL[lowestNeed(get().needs)],
      createLocal: (input) =>
        set({
          created: true,
          cloud: false,
          simId: null,
          username: input.username,
          name: input.name,
          appearance: input.appearance,
          traits: input.traits,
          aspiration: input.aspiration,
          needs: fullNeeds(80),
          moodlets: [],
          balancePence: STARTING_PENCE,
          oysterPence: OYSTER_START_PENCE,
          homeId: "boxroom_z4",
          location: "home",
          gameMinutes: START_GAME_MINUTES,
          speed: 1,
          heatingOn: true,
          inventory: starterInventory(),
          tile: { x: 2, y: 2 },
          path: [],
          pendingInteract: null,
          action: null,
          queue: [],
          rentMisses: 0,
          sofaSurfing: false,
          lastUpkeepMinute: 0,
          skills: emptySkills(),
          shift: null,
          ledger: [{ id: "arrival", amountPence: STARTING_PENCE, kind: "wage", ref: "arrival", createdAt: "" }],
          friends: [],
          readOnly: false,
        }),
      hydrate: (snapshot) => {
        const current = get();
        const samePlace =
          current.created && current.simId === snapshot.simId && current.location === snapshot.location;
        set({
          created: true,
          cloud: true,
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
          gameMinutes: snapshot.gameMinutes,
          heatingOn: snapshot.heatingOn,
          rentMisses: snapshot.rentMisses,
          sofaSurfing: snapshot.sofaSurfing,
          lastUpkeepMinute: snapshot.lastUpkeepMinute,
          skills: snapshot.skills,
          shift: snapshot.shift,
          inventory: snapshot.inventory,
          ledger: snapshot.ledger,
          friends: snapshot.friends,
          tile: samePlace ? current.tile : { x: 2, y: 2 },
          path: samePlace ? current.path : [],
          readOnly: false,
        });
      },
      tick: (realSeconds) => {
        const state = get();
        if (!state.created || realSeconds <= 0) return [];
        const speed: Speed =
          state.location === "home" && !state.readOnly && !state.shift ? state.speed : 1;
        const elapsed = advanceClock(0, realSeconds, speed);
        const gameMinutes = state.gameMinutes + elapsed;
        let needs = decayNeeds(state.needs, elapsed / 60, Boolean(state.shift));
        let action = state.action;
        let queue = state.queue;
        if (action) {
          const stepped = tickAction(action, needs, elapsed);
          needs = stepped.needs;
          action = stepped.action;
          if (!action && queue.length > 0) {
            action = queue[0] ?? null;
            queue = queue.slice(1);
          }
        }
        if (needs.energy <= 0 && !action && queue.length === 0 && !state.shift) {
          action = makeAction("pass_out", 1, nextActionId());
        }
        const notes = warningsFor(state.needs, needs).map((key) => `${NEED_LABELS[key]} is getting low`);
        if (!state.action && action?.type === "pass_out") notes.push("You passed out");
        set({
          gameMinutes,
          needs,
          action,
          queue,
          moodlets: activeMoodlets(state.moodlets, gameMinutes),
        });
        return notes;
      },
      walkTo: (tile) => {
        const state = get();
        if (state.readOnly) return "You're only visiting";
        if (state.action || state.shift) return "You're busy";
        const layout = roomLayout(state.location, state.homeId, null);
        if (!tileInside(tile, layout.width, layout.height)) return null;
        const blocked = blockingTiles(layout, state.inventory);
        if (blocked.has(`${tile.x},${tile.y}`)) return null;
        const path = findPath(state.tile, tile, blocked, layout.width, layout.height);
        if (!path) return "Can't get there";
        set({ path, pendingInteract: null });
        return null;
      },
      interact: (id) => {
        const state = get();
        if (state.readOnly) return "You're only visiting";
        if (state.shift) return "You're on shift";
        const layout = roomLayout(state.location, state.homeId, null);
        const fixture = layout.fixtures.find((entry) => entry.id === id);
        const owned = targetOf(id, state.inventory);
        const actionType = fixture?.action ?? owned?.action ?? null;
        if (!actionType) return null;
        const effect = fixture ? (catalogueById[fixture.itemId]?.effect ?? 1) : (owned?.effect ?? 1);
        const footprint = fixture
          ? (catalogueById[fixture.itemId]?.footprint ?? ([1, 1] as [number, number]))
          : (catalogueById[state.inventory.find((item) => item.id === id)?.itemId ?? ""]?.footprint ??
            ([1, 1] as [number, number]));
        const origin = fixture
          ? { x: fixture.x, y: fixture.y }
          : {
              x: state.inventory.find((item) => item.id === id)?.x ?? 0,
              y: state.inventory.find((item) => item.id === id)?.y ?? 0,
            };
        const rotation = fixture?.rotation ?? state.inventory.find((item) => item.id === id)?.rotation ?? 0;
        const tiles = coveredTiles(origin, footprint, rotation);
        const blocked = blockingTiles(layout, state.inventory);
        const stand = nearestStand(tiles, state.tile, blocked, layout.width, layout.height);
        const next = makeAction(actionType, effect, nextActionId());
        if (!stand) return "No room to stand";
        const startNow = () => {
          if (state.action) {
            if (state.queue.length >= 3) return "Queue is full";
            set({ queue: [...state.queue, next], pendingInteract: null, path: [] });
            return null;
          }
          set({ action: next, path: [], pendingInteract: null });
          return null;
        };
        if (stand.x === state.tile.x && stand.y === state.tile.y) return startNow();
        const path = findPath(state.tile, stand, blocked, layout.width, layout.height);
        if (!path || path.length === 0) return startNow();
        set({ path, pendingInteract: id });
        if (fixture && (fixture.id === "loo" || fixture.id === "shower") && Math.random() < 0.35) {
          return "Flatmate's in there. You join the queue.";
        }
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
        const pending = state.pendingInteract;
        set({ tile: next, path: [] });
        if (pending) get().interact(pending);
      },
      setSpeed: (speed) => set({ speed }),
      setHeatingLocal: (heatingOn) => set({ heatingOn }),
      applyCheckpoint: (patch) =>
        set({
          needs: patch.needs,
          gameMinutes: patch.gameMinutes,
          balancePence: patch.balancePence ?? get().balancePence,
          oysterPence: patch.oysterPence ?? get().oysterPence,
          rentMisses: patch.rentMisses ?? get().rentMisses,
          sofaSurfing: patch.sofaSurfing ?? get().sofaSurfing,
          homeId: patch.homeId ?? get().homeId,
          heatingOn: patch.heatingOn ?? get().heatingOn,
          lastUpkeepMinute: patch.lastUpkeepMinute ?? get().lastUpkeepMinute,
        }),
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
      removeInventory: (id) =>
        set((state) => ({ inventory: state.inventory.filter((item) => item.id !== id) })),
      setShift: (shift) => set({ shift, path: [], pendingInteract: null, action: shift ? null : get().action }),
      setSkills: (skills) => set({ skills }),
      setNeeds: (needs) => set({ needs }),
      setLocation: (location, energyCost = 0) =>
        set((state) => ({
          location,
          tile: { x: 2, y: 2 },
          path: [],
          pendingInteract: null,
          action: null,
          queue: [],
          needs: energyCost ? bumpNeed(state.needs, "energy", -energyCost) : state.needs,
        })),
      addMoodlet: (moodlet) =>
        set((state) => ({
          moodlets: [...state.moodlets.filter((entry) => entry.id !== moodlet.id), moodlet],
        })),
      bumpSocial: (amount) => set((state) => ({ needs: bumpNeed(state.needs, "social", amount) })),
      setFriends: (friends) => set({ friends }),
      setReadOnly: (readOnly) => set({ readOnly, path: [], pendingInteract: null }),
    }),
    {
      name: "london-life-cache",
      partialize: (state) => ({
        created: state.created,
        cloud: state.cloud,
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
        ledger: state.ledger,
        friends: state.friends,
      }),
    },
  ),
);
