"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useRef, type RefObject } from "react";
import { DoubleSide, type Group } from "three";
import { seededLook } from "@/lib/sim/appearance";
import { HAIRS, SKINS, TOPS } from "@/lib/sim/constants";
import type { Appearance } from "@/lib/sim/types";

const PALETTE = { skins: SKINS, hairs: HAIRS, tops: TOPS };

export function riderLook(seed: string): Appearance {
  return seededLook(seed, PALETTE);
}

export function useDispose(items: { dispose(): void }[]): void {
  useEffect(() => () => items.forEach((item) => item.dispose()), [items]);
}

/** Slides every child of the group towards -x and wraps it round a loop of the given length. */
export function useScroller(ref: RefObject<Group | null>, speed: number, span: number): void {
  useFrame((_, delta) => {
    const group = ref.current;
    if (!group) return;
    const step = Math.min(delta, 0.1) * speed;
    for (const child of group.children) {
      child.position.x -= step;
      if (child.position.x < -span / 2) child.position.x += span;
    }
  });
}

export function Glass({ opacity = 0.4, tint = "#1d2b36" }: { opacity?: number; tint?: string }) {
  return (
    <meshPhysicalMaterial
      color={tint}
      transparent
      opacity={opacity}
      roughness={0.05}
      metalness={0.2}
      clearcoat={1}
      depthWrite={false}
      side={DoubleSide}
    />
  );
}

/** A tyre with a hub and lug bar so the spin reads. `speed` is ground speed along the vehicle's +x. */
export function Wheel({
  position,
  radius,
  width,
  speed,
  hub = "#a3a8ae",
}: {
  position: [number, number, number];
  radius: number;
  width: number;
  speed: number;
  hub?: string;
}) {
  const spin = useRef<Group>(null);
  useFrame((_, delta) => {
    if (spin.current) spin.current.rotation.z -= (Math.min(delta, 0.1) * speed) / radius;
  });
  return (
    <group position={position}>
      <group ref={spin}>
        <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[radius, radius, width, 28]} />
          <meshStandardMaterial color="#141414" roughness={0.92} />
        </mesh>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[radius * 0.58, radius * 0.58, width + 0.012, 20]} />
          <meshStandardMaterial color={hub} metalness={0.7} roughness={0.3} />
        </mesh>
        {[0, Math.PI / 3, (2 * Math.PI) / 3].map((angle) => (
          <mesh key={angle} rotation={[0, 0, angle]}>
            <boxGeometry args={[radius * 1.05, radius * 0.12, width + 0.024]} />
            <meshStandardMaterial color="#4c5157" metalness={0.5} roughness={0.4} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

/** A plain box mesh, positioned by its centre. */
export function Block({
  at,
  size,
  colour,
  shadow = false,
  emissive,
  metal = 0,
  rough = 0.7,
}: {
  at: [number, number, number];
  size: [number, number, number];
  colour: string;
  shadow?: boolean;
  emissive?: string;
  metal?: number;
  rough?: number;
}) {
  return (
    <mesh position={at} castShadow={shadow} receiveShadow={shadow}>
      <boxGeometry args={size} />
      <meshStandardMaterial
        color={colour}
        metalness={metal}
        roughness={rough}
        emissive={emissive ?? "#000000"}
        emissiveIntensity={emissive ? 1.2 : 0}
      />
    </mesh>
  );
}

export function Pole({
  from,
  length,
  axis = "y",
  radius = 0.016,
  colour = "#f2b705",
}: {
  from: [number, number, number];
  length: number;
  axis?: "x" | "y" | "z";
  radius?: number;
  colour?: string;
}) {
  const rotation: [number, number, number] =
    axis === "x" ? [0, 0, Math.PI / 2] : axis === "z" ? [Math.PI / 2, 0, 0] : [0, 0, 0];
  const centre: [number, number, number] = [
    from[0] + (axis === "x" ? length / 2 : 0),
    from[1] + (axis === "y" ? length / 2 : 0),
    from[2] + (axis === "z" ? length / 2 : 0),
  ];
  return (
    <mesh position={centre} rotation={rotation}>
      <cylinderGeometry args={[radius, radius, length, 10]} />
      <meshStandardMaterial color={colour} metalness={0.55} roughness={0.3} />
    </mesh>
  );
}
