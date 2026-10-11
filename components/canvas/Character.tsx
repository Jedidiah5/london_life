"use client";

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import { Group } from "three";
import { broadcastPosition } from "@/lib/net/realtime";
import { tileWorld } from "@/lib/sim/grid";
import type { Anim, Appearance, Tile } from "@/lib/sim/types";
import { useGame } from "@/lib/store/useGame";
import { Avatar } from "./Avatar";

export interface Seat {
  x: number;
  y: number;
  z: number;
  rotation: number;
}

export function Character({
  look,
  tile,
  path,
  roomWidth,
  roomHeight,
  walkingEnabled,
  anim = "stand",
  seat = null,
  facing = 0,
  self = false,
  seed = 0,
}: {
  look: Appearance;
  tile: Tile;
  path: Tile[];
  roomWidth: number;
  roomHeight: number;
  walkingEnabled: boolean;
  anim?: Anim;
  seat?: Seat | null;
  facing?: number;
  self?: boolean;
  seed?: number;
}) {
  const group = useRef<Group>(null);
  const progress = useRef(0);
  const sent = useRef(0);
  const moving = walkingEnabled && path.length > 0;

  useFrame((_, delta) => {
    const root = group.current;
    if (!root) return;
    const from = tileWorld(tile.x, tile.y, roomWidth, roomHeight);
    const next = path[0];
    if (!moving || !next) {
      progress.current = 0;
      if (seat) {
        root.position.set(seat.x, seat.y, seat.z);
        root.rotation.y = seat.rotation;
      } else {
        root.position.set(from[0], 0, from[2]);
        if (!self) root.rotation.y = facing;
      }
      return;
    }
    const to = tileWorld(next.x, next.y, roomWidth, roomHeight);
    progress.current = Math.min(1, progress.current + delta * 2.4);
    const t = progress.current;
    root.position.set(from[0] + (to[0] - from[0]) * t, 0, from[2] + (to[2] - from[2]) * t);
    root.rotation.y = Math.atan2(to[0] - from[0], to[2] - from[2]);
    if (self) {
      const now = performance.now();
      if (now - sent.current > 140) {
        sent.current = now;
        broadcastPosition(next);
      }
      if (t >= 1) {
        progress.current = 0;
        useGame.getState().arrive();
      }
    }
  });

  return (
    <group ref={group}>
      <group scale={1.45}>
        <Avatar look={look} anim={moving ? "walk" : anim} seed={seed} />
      </group>
    </group>
  );
}
