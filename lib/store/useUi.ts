"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Appearance, InventoryItem, TravelMode } from "@/lib/sim/types";

export type NavKey = "home" | "buy" | "map" | "phone";
export type PhoneApp = "jobs" | "bank" | "messages" | "friends" | "settings" | "callhome" | "help" | "skills";

export type SimTab = "profile" | "needs" | "goals" | "skills" | "career";

export interface GhostPlacement {
  itemId: string;
  x: number;
  y: number;
  rotation: number;
  colour: string;
}

export interface VisitState {
  simId: string;
  name: string;
  homeId: string;
  appearance: Appearance;
  items: InventoryItem[];
}

export interface PersonRef {
  kind: "local" | "player";
  id: string;
}

export interface RideState {
  destination: string;
  mode: TravelMode;
  minutes: number;
}

interface Toast {
  id: string;
  text: string;
  tone: "info" | "good" | "bad";
}

interface UiState {
  nav: NavKey;
  phoneApp: PhoneApp | null;
  yaw: number;
  pitch: number;
  zoom: number;
  /** How far the city map is zoomed in, 1 being the whole city. */
  mapZoom: number;
  /** Where the city map is centred, in world units. */
  mapPan: { x: number; z: number };
  toasts: Toast[];
  travelTo: string | null;
  selectedCatalogueId: string | null;
  movingId: string | null;
  ghost: GhostPlacement | null;
  /** A big purchase is waiting for the player to say yes. */
  confirmingBuy: boolean;
  /** Buy mode tucks the catalogue away after placing so the room can be seen. */
  catalogueHidden: boolean;
  /** A paint or floor shown on the room before paying for it. */
  tryFinish: string | null;
  simPanel: SimTab | null;
  visit: VisitState | null;
  sheet: string | null;
  person: PersonRef | null;
  eventId: string | null;
  ride: RideState | null;
  muted: boolean;
  setNav: (nav: NavKey) => void;
  openPhone: (app: PhoneApp | null) => void;
  rotateYaw: () => void;
  orbit: (yaw: number, pitch: number) => void;
  setZoom: (zoom: number) => void;
  setMapZoom: (mapZoom: number) => void;
  setMapPan: (x: number, z: number) => void;
  resetMap: () => void;
  pushToast: (text: string, tone?: Toast["tone"]) => void;
  dismissToast: (id: string) => void;
  setTravelTo: (venueId: string | null) => void;
  selectCatalogue: (itemId: string | null) => void;
  setMoving: (inventoryId: string | null) => void;
  setGhost: (ghost: GhostPlacement | null) => void;
  rotateGhost: () => void;
  setConfirmingBuy: (confirmingBuy: boolean) => void;
  setCatalogueHidden: (catalogueHidden: boolean) => void;
  setTryFinish: (tryFinish: string | null) => void;
  openSimPanel: (simPanel: SimTab | null) => void;
  cancelPlacement: () => void;
  setVisit: (visit: VisitState | null) => void;
  openSheet: (target: string | null) => void;
  openPerson: (person: PersonRef | null) => void;
  setEvent: (eventId: string | null) => void;
  setRide: (ride: RideState | null) => void;
  toggleMute: () => void;
}

let toastSeq = 0;

export const DEFAULT_PITCH = 0.86;
export const PITCH_MIN = 0.45;
export const PITCH_MAX = 1.35;
export const MAP_ZOOM_MAX = 4;
/** Half the width of the city, in world units; the map cannot be dragged past it. */
export const MAP_REACH = 17;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export const useUi = create<UiState>()(
  persist(
    (set) => ({
      nav: "home",
      phoneApp: null,
      yaw: 0,
      pitch: DEFAULT_PITCH,
      zoom: 52,
      mapZoom: 1,
      mapPan: { x: 0, z: 0 },
      toasts: [],
      travelTo: null,
      selectedCatalogueId: null,
      movingId: null,
      ghost: null,
      confirmingBuy: false,
      catalogueHidden: false,
      tryFinish: null,
      simPanel: null,
      visit: null,
      sheet: null,
      person: null,
      eventId: null,
      ride: null,
      muted: false,
      setNav: (nav) =>
        set({
          nav,
          phoneApp: null,
          travelTo: null,
          sheet: null,
          person: null,
          selectedCatalogueId: null,
          movingId: null,
          ghost: null,
          confirmingBuy: false,
          catalogueHidden: false,
          tryFinish: null,
          ...(nav === "map" ? { mapZoom: 1, mapPan: { x: 0, z: 0 } } : {}),
        }),
      openPhone: (phoneApp) => set({ phoneApp, nav: "phone", sheet: null, person: null }),
      rotateYaw: () => set((state) => ({ yaw: Math.round(state.yaw) + 1 })),
      orbit: (yaw, pitch) => set({ yaw, pitch: Math.min(PITCH_MAX, Math.max(PITCH_MIN, pitch)) }),
      setZoom: (zoom) => set({ zoom: Math.min(90, Math.max(24, zoom)) }),
      setMapZoom: (mapZoom) => set({ mapZoom: clamp(mapZoom, 1, MAP_ZOOM_MAX) }),
      setMapPan: (x, z) => set({ mapPan: { x: clamp(x, -MAP_REACH, MAP_REACH), z: clamp(z, -MAP_REACH, MAP_REACH) } }),
      resetMap: () => set({ mapZoom: 1, mapPan: { x: 0, z: 0 } }),
      pushToast: (text, tone = "info") => {
        toastSeq += 1;
        const id = `toast-${toastSeq}`;
        set((state) => ({
          toasts: [...state.toasts.slice(-3), { id, text, tone }],
        }));
        if (typeof window !== "undefined") {
          window.setTimeout(() => {
            set((state) => ({
              toasts: state.toasts.filter((toast) => toast.id !== id),
            }));
          }, 3400);
        }
      },
      dismissToast: (id) =>
        set((state) => ({
          toasts: state.toasts.filter((toast) => toast.id !== id),
        })),
      setTravelTo: (travelTo) => set({ travelTo }),
      selectCatalogue: (selectedCatalogueId) =>
        set({
          selectedCatalogueId,
          movingId: null,
          ghost: null,
          confirmingBuy: false,
        }),
      setMoving: (movingId) =>
        set({
          movingId,
          selectedCatalogueId: null,
          ghost: null,
          confirmingBuy: false,
        }),
      setGhost: (ghost) => set({ ghost }),
      rotateGhost: () =>
        set((state) =>
          state.ghost
            ? {
                ghost: {
                  ...state.ghost,
                  rotation: (state.ghost.rotation + 1) % 4,
                },
              }
            : {},
        ),
      setConfirmingBuy: (confirmingBuy) => set({ confirmingBuy }),
      setCatalogueHidden: (catalogueHidden) =>
        set(catalogueHidden ? { catalogueHidden, tryFinish: null } : { catalogueHidden }),
      setTryFinish: (tryFinish) => set({ tryFinish }),
      openSimPanel: (simPanel) => set({ simPanel, sheet: null, person: null }),
      cancelPlacement: () =>
        set({
          ghost: null,
          selectedCatalogueId: null,
          movingId: null,
          confirmingBuy: false,
        }),
      setVisit: (visit) => set({ visit, nav: "home" }),
      openSheet: (sheet) => set({ sheet, person: null }),
      openPerson: (person) => set({ person, sheet: null }),
      setEvent: (eventId) => set({ eventId }),
      setRide: (ride) => set({ ride }),
      toggleMute: () => set((state) => ({ muted: !state.muted })),
    }),
    {
      name: "london-life-ui",
      partialize: (state) => ({
        yaw: state.yaw,
        pitch: state.pitch,
        zoom: state.zoom,
        muted: state.muted,
      }),
    },
  ),
);
