"use client";

import { useEffect } from "react";
import { listenForMessages, meetPlayer, refreshInbox } from "@/lib/net/messages";
import { supabaseConfigured } from "@/lib/net/supabase";
import { useGame } from "@/lib/store/useGame";
import { usePresence } from "@/lib/store/usePresence";
import { useUi } from "@/lib/store/useUi";

/** Seconds before asking the server again about a player it said was not here yet. */
const RETRY_MS = 20_000;
const attempts = new Map<string, number>();
const met = new Set<string>();

export function MessageSync() {
  const simId = useGame((state) => state.simId);
  const location = useGame((state) => state.location);
  const here = usePresence((state) => state.here);

  useEffect(() => {
    if (!simId || !supabaseConfigured()) return;
    let stop: (() => void) | null = null;
    let alive = true;
    void listenForMessages().then((unsubscribe) => {
      if (alive) stop = unsubscribe;
      else unsubscribe();
    });
    void refreshInbox();
    const poll = window.setInterval(() => void refreshInbox(), 60_000);
    return () => {
      alive = false;
      stop?.();
      window.clearInterval(poll);
    };
  }, [simId]);

  useEffect(() => {
    if (!simId || location === "home" || !supabaseConfigured()) return;
    const now = Date.now();
    for (const player of here) {
      if (met.has(player.simId) || player.simId === simId) continue;
      if (now - (attempts.get(player.simId) ?? 0) < RETRY_MS) continue;
      attempts.set(player.simId, now);
      void meetPlayer(player.simId).then((result) => {
        if (!result) return;
        met.add(player.simId);
        if (result.fresh) {
          useUi.getState().pushToast(`You met ${result.name}. Message them any time from your phone 💬`, "good");
          void refreshInbox();
        }
      });
    }
  }, [here, location, simId]);

  return null;
}
