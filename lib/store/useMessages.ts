"use client";

import { create } from "zustand";
import type { Appearance } from "@/lib/sim/types";

export interface Conversation {
  simId: string;
  name: string;
  username: string;
  appearance: Appearance;
  metWhere: string | null;
  friend: boolean;
  /** Out in the city in the last ten minutes. */
  outNow: boolean;
  lastBody: string | null;
  lastFromMe: boolean;
  lastAt: string | null;
  unread: number;
}

export interface DirectMessage {
  id: number;
  fromMe: boolean;
  body: string;
  createdAt: string;
}

interface MessagesState {
  conversations: Conversation[];
  /** Whose thread is open in the Chat app, if any. */
  threadWith: string | null;
  thread: DirectMessage[];
  /** False until the open thread's history has come back from the server. */
  threadLoaded: boolean;
  setConversations: (conversations: Conversation[]) => void;
  setThreadWith: (simId: string | null) => void;
  setThread: (thread: DirectMessage[]) => void;
  appendToThread: (message: DirectMessage) => void;
}

export const useMessages = create<MessagesState>((set) => ({
  conversations: [],
  threadWith: null,
  thread: [],
  threadLoaded: false,
  setConversations: (conversations) => set({ conversations }),
  setThreadWith: (threadWith) => set({ threadWith, thread: [], threadLoaded: false }),
  setThread: (thread) => set({ thread, threadLoaded: true }),
  appendToThread: (message) =>
    set((state) =>
      state.thread.some((entry) => entry.id === message.id) ? {} : { thread: [...state.thread, message] },
    ),
}));

export function unreadTotal(conversations: Conversation[]): number {
  return conversations.reduce((sum, conversation) => sum + conversation.unread, 0);
}
