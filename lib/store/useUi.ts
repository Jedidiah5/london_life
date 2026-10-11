"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Appearance, InventoryItem, TravelMode } from "@/lib/sim/types";

export type NavKey = "home" | "buy" | "map" | "phone";
export type PhoneApp = "jobs" | "bank" | "messages" | "friends" | "settings" | "callhome" | "help" | "skills";

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
  zoom: number;
  toasts: Toast[];
  travelTo: string | null;
  selectedCatalogueId: string | null;
  movingId: string | null;
  ghost: GhostPlacement | null;
  visit: VisitState | null;
  sheet: string | null;
  person: PersonRef | null;
  eventId: string | null;
  ride: RideState | null;
  muted: boolean;
  setNav: (nav: NavKey) => void;
  openPhone: (app: PhoneApp | null) => void;
  rotateYaw: () => void;
  setZoom: (zoom: number) => void;
  pushToast: (text: string, tone?: Toast["tone"]) => void;
  dismissToast: (id: string) => void;
  setTravelTo: (venueId: string | null) => void;
  selectCatalogue: (itemId: string | null) => void;
  setMoving: (inventoryId: string | null) => void;
  setGhost: (ghost: GhostPlacement | null) => void;
  rotateGhost: () => void;
  setVisit: (visit: VisitState | null) => void;
  openSheet: (target: string | null) => void;
  openPerson: (person: PersonRef | null) => void;
  setEvent: (eventId: string | null) => void;
  setRide: (ride: RideState | null) => void;
  toggleMute: () => void;
}

let toastSeq = 0;

export const useUi = create<UiState>()(
  persist(
    (set) => ({
      nav: "home",
      phoneApp: null,
      yaw: 0,
      zoom: 52,
      toasts: [],
      travelTo: null,
      selectedCatalogueId: null,
      movingId: null,
      ghost: null,
      visit: null,
      sheet: null,
      person: null,
      eventId: null,
      ride: null,
      muted: false,
      setNav: (nav) =>
        set({ nav, phoneApp: null, travelTo: null, sheet: null, person: null, selectedCatalogueId: null, movingId: null, ghost: null }),
      openPhone: (phoneApp) => set({ phoneApp, nav: "phone", sheet: null, person: null }),
      rotateYaw: () => set((state) => ({ yaw: (state.yaw + 1) % 4 })),
      setZoom: (zoom) => set({ zoom: Math.min(90, Math.max(24, zoom)) }),
      pushToast: (text, tone = "info") => {
        toastSeq += 1;
        const id = `toast-${toastSeq}`;
        set((state) => ({ toasts: [...state.toasts.slice(-3), { id, text, tone }] }));
        if (typeof window !== "undefined") {
          window.setTimeout(() => {
            set((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== id) }));
          }, 3400);
        }
      },
      dismissToast: (id) => set((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== id) })),
      setTravelTo: (travelTo) => set({ travelTo }),
      selectCatalogue: (selectedCatalogueId) => set({ selectedCatalogueId, movingId: null, ghost: null }),
      setMoving: (movingId) => set({ movingId, selectedCatalogueId: null, ghost: null }),
      setGhost: (ghost) => set({ ghost }),
      rotateGhost: () =>
        set((state) => (state.ghost ? { ghost: { ...state.ghost, rotation: (state.ghost.rotation + 1) % 4 } } : {})),
      setVisit: (visit) => set({ visit, nav: "home" }),
      openSheet: (sheet) => set({ sheet, person: null }),
      openPerson: (person) => set({ person, sheet: null }),
      setEvent: (eventId) => set({ eventId }),
      setRide: (ride) => set({ ride }),
      toggleMute: () => set((state) => ({ muted: !state.muted })),
    }),
    {
      name: "london-life-ui",
      partialize: (state) => ({ yaw: state.yaw, zoom: state.zoom, muted: state.muted }),
    },
  ),
);
