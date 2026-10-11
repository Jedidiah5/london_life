"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Appearance, InventoryItem } from "@/lib/sim/types";

export type NavKey = "home" | "buy" | "map" | "phone";
export type PhoneApp = "jobs" | "bank" | "messages" | "friends" | "settings";

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

interface Toast {
  id: string;
  text: string;
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
  setNav: (nav: NavKey) => void;
  openPhone: (app: PhoneApp | null) => void;
  rotateYaw: () => void;
  setZoom: (zoom: number) => void;
  pushToast: (text: string) => void;
  dismissToast: (id: string) => void;
  setTravelTo: (venueId: string | null) => void;
  selectCatalogue: (itemId: string | null) => void;
  setMoving: (inventoryId: string | null) => void;
  setGhost: (ghost: GhostPlacement | null) => void;
  rotateGhost: () => void;
  setVisit: (visit: VisitState | null) => void;
}

let toastSeq = 0;

export const useUi = create<UiState>()(
  persist(
    (set) => ({
      nav: "home",
      phoneApp: null,
      yaw: 0,
      zoom: 46,
      toasts: [],
      travelTo: null,
      selectedCatalogueId: null,
      movingId: null,
      ghost: null,
      visit: null,
      setNav: (nav) =>
        set({
          nav,
          phoneApp: nav === "phone" ? "jobs" : null,
          travelTo: null,
        }),
      openPhone: (phoneApp) => set({ phoneApp, nav: phoneApp ? "phone" : "home" }),
      rotateYaw: () => set((state) => ({ yaw: (state.yaw + 1) % 4 })),
      setZoom: (zoom) => set({ zoom: Math.min(80, Math.max(24, zoom)) }),
      pushToast: (text) => {
        toastSeq += 1;
        const id = `toast-${toastSeq}`;
        set((state) => ({ toasts: [...state.toasts.slice(-4), { id, text }] }));
        if (typeof window !== "undefined") {
          window.setTimeout(() => {
            set((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== id) }));
          }, 3200);
        }
      },
      dismissToast: (id) => set((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== id) })),
      setTravelTo: (travelTo) => set({ travelTo }),
      selectCatalogue: (selectedCatalogueId) =>
        set({ selectedCatalogueId, movingId: null, ghost: null }),
      setMoving: (movingId) => set({ movingId, selectedCatalogueId: null, ghost: null }),
      setGhost: (ghost) => set({ ghost }),
      rotateGhost: () =>
        set((state) =>
          state.ghost ? { ghost: { ...state.ghost, rotation: (state.ghost.rotation + 1) % 4 } } : {},
        ),
      setVisit: (visit) => set({ visit, nav: "home" }),
    }),
    {
      name: "london-life-ui",
      partialize: (state) => ({ yaw: state.yaw, zoom: state.zoom }),
    },
  ),
);
