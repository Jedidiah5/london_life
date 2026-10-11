"use client";

import { useAnimations } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { Color, Group, LoopRepeat, Mesh, MeshBasicMaterial, MeshStandardMaterial } from "three";
import { tileWorld } from "@/lib/sim/grid";
import type { Appearance, Tile } from "@/lib/sim/types";
import { useGame } from "@/lib/store/useGame";
import { broadcastPosition } from "@/lib/net/realtime";
import { fitObject } from "./fitted";
import { useGLTF } from "@react-three/drei";

function paint(name: string, look: Appearance): string {
  const label = name.toLowerCase();
  if (label.includes("head")) return look.skin;
  if (label.includes("torso") || label.includes("arm")) return look.top;
  if (label.includes("leg")) return look.bottom;
  return look.shoes;
}

export function Character({
  look,
  tile,
  path,
  roomWidth,
  roomHeight,
  walkingEnabled,
}: {
  look: Appearance;
  tile: Tile;
  path: Tile[];
  roomWidth: number;
  roomHeight: number;
  walkingEnabled: boolean;
}) {
  const url = `/models/chars/character-${look.body}.glb`;
  const gltf = useGLTF(url);
  const group = useRef<Group>(null);
  const progress = useRef(0);
  const sent = useRef(0);
  const cloned = useMemo(() => {
    const fitted = fitObject(gltf.scene, 0.72);
    fitted.traverse((node) => {
      const mesh = node as Mesh;
      if (!mesh.isMesh) return;
      const source = mesh.material;
      if (Array.isArray(source)) return;
      if (!(source instanceof MeshBasicMaterial) && !(source instanceof MeshStandardMaterial)) return;
      const material = source.clone();
      material.map = null;
      material.color = new Color(paint(mesh.name || mesh.parent?.name || "", look));
      if (material instanceof MeshStandardMaterial) material.roughness = 0.65;
      mesh.material = material;
    });
    return fitted;
  }, [gltf.scene, look]);
  const { actions } = useAnimations(gltf.animations, cloned);
  const moving = walkingEnabled && path.length > 0;

  useEffect(() => {
    const idle = actions.idle ?? actions.Idle;
    const walk = actions.walk ?? actions.Walk;
    const clip = moving ? (walk ?? idle) : idle;
    if (!clip) return;
    clip.reset().setLoop(LoopRepeat, Infinity).fadeIn(0.12).play();
    return () => {
      clip.fadeOut(0.12);
    };
  }, [actions, moving]);

  useFrame((_, delta) => {
    const root = group.current;
    if (!root) return;
    const from = tileWorld(tile.x, tile.y, roomWidth, roomHeight);
    const next = path[0];
    if (!moving || !next) {
      progress.current = 0;
      root.position.set(from[0], 0, from[2]);
      return;
    }
    const to = tileWorld(next.x, next.y, roomWidth, roomHeight);
    progress.current = Math.min(1, progress.current + delta * 2.1);
    const t = progress.current;
    root.position.set(from[0] + (to[0] - from[0]) * t, 0, from[2] + (to[2] - from[2]) * t);
    root.rotation.y = Math.atan2(to[0] - from[0], to[2] - from[2]);
    const now = performance.now();
    if (now - sent.current > 140) {
      sent.current = now;
      broadcastPosition(next);
    }
    if (t >= 1) {
      progress.current = 0;
      useGame.getState().arrive();
    }
  });

  return (
    <group ref={group}>
      <primitive object={cloned} />
      <mesh position={[0, 1.42, 0]}>
        <sphereGeometry args={[0.16, 12, 10]} />
        <meshStandardMaterial color={look.hairColor} roughness={0.7} />
      </mesh>
    </group>
  );
}

useGLTF.preload("/models/chars/character-a.glb");
useGLTF.preload("/models/chars/character-b.glb");
