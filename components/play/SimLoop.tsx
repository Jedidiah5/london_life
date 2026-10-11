"use client";

import { useEffect, useRef } from "react";
import { checkpointNeeds } from "@/lib/net/rpc";
import { joinWorld, leaveWorld, rememberTrack } from "@/lib/net/realtime";
import { useGame } from "@/lib/store/useGame";
import { useUi } from "@/lib/store/useUi";

export function SimLoop() {
  const simId = useGame((state) => state.simId);
  const location = useGame((state) => state.location);
  const cloud = useGame((state) => state.cloud);
  const name = useGame((state) => state.name);
  const appearance = useGame((state) => state.appearance);
  const last = useRef(0);

  useEffect(() => {
    last.current = performance.now();
    const id = window.setInterval(() => {
      const now = performance.now();
      const dt = Math.min(1, (now - last.current) / 1000);
      last.current = now;
      const notes = useGame.getState().tick(dt);
      for (const note of notes) useUi.getState().pushToast(note);
    }, 200);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (!cloud) return;
    const id = window.setInterval(() => {
      void checkpointNeeds();
    }, 30_000);
    void checkpointNeeds();
    return () => window.clearInterval(id);
  }, [cloud]);

  useEffect(() => {
    if (!cloud || !simId) return;
    const tile = useGame.getState().tile;
    const track = { simId, name, appearance, x: tile.x, y: tile.y };
    rememberTrack(track);
    const channelLocation = location === "home" ? `home-${simId}` : location;
    void joinWorld(track, channelLocation);
    return () => {
      void leaveWorld();
    };
  }, [cloud, simId, location, name, appearance]);

  return null;
}
