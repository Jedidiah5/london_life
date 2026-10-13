"use client";

import { create } from "zustand";
import type { Appearance } from "@/lib/sim/types";

export interface RemotePlayer {
  simId: string;
  name: string;
  appearance: Appearance;
  x: number;
  y: number;
  emote: string | null;
  emoteUntil: number;
}

export interface ChatLine {
  id: string;
  from: string;
  simId: string;
  text: string;
  at: number;
}

export interface HomeInvite {
  simId: string;
  name: string;
}

interface PresenceState {
  here: RemotePlayer[];
  online: number;
  chat: ChatLine[];
  invite: HomeInvite | null;
  setHere: (players: RemotePlayer[]) => void;
  setOnline: (online: number) => void;
  upsert: (player: RemotePlayer) => void;
  pushChat: (line: ChatLine) => void;
  setInvite: (invite: HomeInvite | null) => void;
  clear: () => void;
}

export const usePresence = create<PresenceState>((set) => ({
  here: [],
  online: 1,
  chat: [],
  invite: null,
  setHere: (here) => set({ here }),
  setOnline: (online) => set({ online }),
  upsert: (player) =>
    set((state) => {
      const index = state.here.findIndex((entry) => entry.simId === player.simId);
      if (index === -1) return { here: [...state.here, player] };
      const here = state.here.slice();
      here[index] = { ...here[index], ...player };
      return { here };
    }),
  pushChat: (line) => set((state) => ({ chat: [...state.chat.slice(-40), line] })),
  setInvite: (invite) => set({ invite }),
  clear: () => set({ here: [], invite: null }),
}));
