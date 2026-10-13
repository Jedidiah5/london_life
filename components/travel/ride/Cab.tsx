"use client";

import { RoundedBox } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import type { Group } from "three";
import { Avatar } from "@/components/canvas/Avatar";
import type { Appearance } from "@/lib/sim/types";
import { Block, Glass, riderLook, useDispose, Wheel } from "./parts";
import { wordTexture } from "./textures";

const BLACK = "#111214";

function Paint({ colour }: { colour: string }) {
  return (
    <meshPhysicalMaterial color={colour} metalness={0.4} roughness={0.28} clearcoat={1} clearcoatRoughness={0.15} />
  );
}

/** A London black cab. With `look` set, the player rides in the back. */
export function Cab({ look, speed, colour = BLACK }: { look?: Appearance; speed: number; colour?: string }) {
  const body = useRef<Group>(null);
  const sign = useMemo(() => wordTexture("TAXI", "#111111", "#ffcf33", 128, 40), []);
  const disposables = useMemo(() => [sign], [sign]);
  useDispose(disposables);
  const driver = useMemo(() => riderLook(`cabbie-${colour}`), [colour]);

  useFrame(({ clock }) => {
    if (body.current) body.current.position.y = Math.sin(clock.elapsedTime * 9.1) * 0.004;
  });

  return (
    <group>
      <group ref={body}>
        <RoundedBox args={[2.7, 0.5, 1.08]} radius={0.15} smoothness={4} position={[0, 0.4, 0]} castShadow>
          <Paint colour={colour} />
        </RoundedBox>
        <RoundedBox args={[1.62, 0.46, 1.02]} radius={0.13} smoothness={4} position={[-0.22, 0.84, 0]} castShadow>
          <Paint colour={colour} />
        </RoundedBox>
        <mesh position={[-0.22, 0.87, 0]}>
          <boxGeometry args={[1.5, 0.26, 1.035]} />
          <Glass opacity={0.55} tint="#141c22" />
        </mesh>
        {[-0.62, 0.1].map((x) => (
          <Block key={x} at={[x, 0.87, 0]} size={[0.05, 0.27, 1.04]} colour={colour} />
        ))}
        <mesh position={[0.6, 0.86, 0]} rotation={[0, 0, -0.5]}>
          <boxGeometry args={[0.02, 0.36, 0.92]} />
          <Glass opacity={0.5} tint="#141c22" />
        </mesh>
        <mesh position={[0.36, 1.1, 0]}>
          <boxGeometry args={[0.24, 0.07, 0.13]} />
          <meshStandardMaterial map={sign} emissive="#ffcf33" emissiveMap={sign} emissiveIntensity={0.6} />
        </mesh>
        <Block at={[1.34, 0.42, 0]} size={[0.04, 0.24, 0.44]} colour="#c9ccd0" metal={0.9} rough={0.2} />
        {[0.36, 0.42, 0.48].map((y) => (
          <Block key={y} at={[1.36, y, 0]} size={[0.01, 0.02, 0.4]} colour="#2a2a2a" />
        ))}
        {[-1, 1].map((side) => (
          <group key={side}>
            <mesh position={[1.31, 0.5, side * 0.38]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.07, 0.07, 0.06, 18]} />
              <meshStandardMaterial color="#fffbe8" emissive="#fff4cc" emissiveIntensity={1} />
            </mesh>
            <Block at={[-1.34, 0.5, side * 0.4]} size={[0.03, 0.12, 0.1]} colour="#b3000d" emissive="#ff1020" />
            <Block at={[0.45, 0.72, side * 0.56]} size={[0.06, 0.05, 0.1]} colour={colour} />
          </group>
        ))}
        <Block at={[1.38, 0.24, 0]} size={[0.05, 0.1, 1.0]} colour="#1b1b1b" />
        <Block at={[-1.38, 0.24, 0]} size={[0.05, 0.1, 1.0]} colour="#1b1b1b" />
        <Block at={[-1.4, 0.36, 0]} size={[0.01, 0.06, 0.3]} colour="#f5c400" />
        {look ? (
          <>
            <group position={[0.18, 0.22, 0.24]} rotation={[0, Math.PI / 2, 0]}>
              <Avatar look={driver} anim="sit" seed={2} />
            </group>
            <group position={[-0.72, 0.22, -0.22]} rotation={[0, Math.PI / 2, 0]}>
              <Avatar look={look} anim="sit" crown />
            </group>
          </>
        ) : null}
      </group>
      {[0.92, -0.92].map((x) =>
        [-1, 1].map((side) => (
          <Wheel key={`${x}${side}`} position={[x, 0.2, side * 0.47]} radius={0.2} width={0.15} speed={speed} />
        )),
      )}
    </group>
  );
}

export function Van({ speed, colour = "#f2f2ee" }: { speed: number; colour?: string }) {
  return (
    <group>
      <RoundedBox args={[2.1, 1.0, 1.1]} radius={0.08} smoothness={3} position={[-0.25, 0.75, 0]} castShadow>
        <Paint colour={colour} />
      </RoundedBox>
      <RoundedBox args={[0.7, 0.62, 1.08]} radius={0.12} smoothness={3} position={[1.1, 0.55, 0]} castShadow>
        <Paint colour={colour} />
      </RoundedBox>
      <mesh position={[1.2, 0.86, 0]} rotation={[0, 0, -0.45]}>
        <boxGeometry args={[0.02, 0.32, 0.98]} />
        <Glass opacity={0.6} tint="#141c22" />
      </mesh>
      <mesh position={[0.95, 0.88, 0]}>
        <boxGeometry args={[0.3, 0.22, 1.1]} />
        <Glass opacity={0.6} tint="#141c22" />
      </mesh>
      {[-1, 1].map((side) => (
        <Block key={side} at={[1.46, 0.48, side * 0.4]} size={[0.02, 0.08, 0.16]} colour="#fffbe8" emissive="#fff4cc" />
      ))}
      {[1.0, -0.85].map((x) =>
        [-1, 1].map((side) => (
          <Wheel key={`${x}${side}`} position={[x, 0.2, side * 0.48]} radius={0.2} width={0.15} speed={speed} />
        )),
      )}
    </group>
  );
}

export function Hatchback({ speed, colour }: { speed: number; colour: string }) {
  return (
    <group>
      <RoundedBox args={[2.2, 0.42, 0.98]} radius={0.14} smoothness={4} position={[0, 0.36, 0]} castShadow>
        <Paint colour={colour} />
      </RoundedBox>
      <RoundedBox args={[1.25, 0.4, 0.92]} radius={0.14} smoothness={4} position={[-0.25, 0.72, 0]} castShadow>
        <Paint colour={colour} />
      </RoundedBox>
      <mesh position={[-0.25, 0.74, 0]}>
        <boxGeometry args={[1.12, 0.22, 0.935]} />
        <Glass opacity={0.6} tint="#141c22" />
      </mesh>
      {[-1, 1].map((side) => (
        <group key={side}>
          <Block at={[1.1, 0.42, side * 0.34]} size={[0.02, 0.07, 0.18]} colour="#fffbe8" emissive="#fff4cc" />
          <Block at={[-1.1, 0.44, side * 0.36]} size={[0.02, 0.08, 0.14]} colour="#b3000d" emissive="#ff1020" />
        </group>
      ))}
      {[0.72, -0.72].map((x) =>
        [-1, 1].map((side) => (
          <Wheel key={`${x}${side}`} position={[x, 0.18, side * 0.43]} radius={0.18} width={0.14} speed={speed} />
        )),
      )}
    </group>
  );
}
