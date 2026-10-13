"use client";

import { RoundedBox } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { DoubleSide, type Group } from "three";
import { Avatar } from "@/components/canvas/Avatar";
import type { Appearance } from "@/lib/sim/types";
import { Block, Glass, Pole, riderLook, useDispose, Wheel } from "./parts";
import { advertFor, advertTexture, blindTexture, moquetteTexture } from "./textures";

const LENGTH = 6.4;
const WIDTH = 1.5;
const HALF_L = LENGTH / 2;
const HALF_W = WIDTH / 2;
const BASE = 0.14;
const LOWER_GLASS = 0.72;
const BAND = 1.2;
const UPPER_GLASS = 1.6;
const ROOF_BAND = 2.17;
const ROOF = 2.42;
const LOWER_FLOOR = 0.26;
const UPPER_FLOOR = 1.28;
const RED = "#cf1820";
const WHEEL_R = 0.29;
const ARCH = 0.36;
const AXLES = [1.85, -1.55];
const PILLARS = [-3.12, -2.3, -1.45, -0.6, 0.25, 1.1, 1.95, 2.7, 3.12];
const UPPER_ROWS = [2.62, 2.07, 1.52, 0.97, 0.42, -0.13, -0.68, -1.23, -1.78, -2.33, -2.88];
const LOWER_ROWS = [-0.95, -1.5, -2.05, -2.6];
/** Front row of the top deck, offside: the best seat on any London bus. */
export const BUS_PLAYER_SEAT: [number, number, number] = [UPPER_ROWS[0] ?? 2.62, UPPER_FLOOR, 0.42];

interface Rider {
  at: [number, number, number];
  look: Appearance;
}

function Seat({
  x,
  floor,
  z,
  fabric,
}: {
  x: number;
  floor: number;
  z: number;
  fabric: ReturnType<typeof moquetteTexture>;
}) {
  return (
    <group position={[x, floor, z]}>
      <mesh position={[-0.02, 0.21, 0]}>
        <boxGeometry args={[0.26, 0.07, 0.6]} />
        <meshStandardMaterial map={fabric} roughness={0.95} />
      </mesh>
      <mesh position={[-0.17, 0.42, 0]} rotation={[0, 0, 0.08]}>
        <boxGeometry args={[0.05, 0.38, 0.6]} />
        <meshStandardMaterial map={fabric} roughness={0.95} />
      </mesh>
      <mesh position={[-0.15, 0.62, 0]}>
        <boxGeometry args={[0.07, 0.04, 0.6]} />
        <meshStandardMaterial color="#d8d8d4" roughness={0.6} />
      </mesh>
    </group>
  );
}

function Side({ side, advert }: { side: 1 | -1; advert: ReturnType<typeof advertTexture> }) {
  const z = side * (HALF_W - 0.02);
  const skirtTop = WHEEL_R + ARCH;
  const gaps = AXLES.map((axle) => [axle - ARCH, axle + ARCH] as const).sort((a, b) => a[0] - b[0]);
  const skirts: [number, number][] = [];
  let cursor = -HALF_L;
  for (const [start, end] of gaps) {
    skirts.push([cursor, start]);
    cursor = end;
  }
  skirts.push([cursor, HALF_L]);
  const kerbSide = side === -1;
  return (
    <group>
      {skirts.map(([start, end]) => (
        <Block
          key={start}
          at={[(start + end) / 2, (BASE + LOWER_GLASS) / 2, z]}
          size={[end - start, LOWER_GLASS - BASE, 0.04]}
          colour={RED}
          shadow
        />
      ))}
      {gaps.map(([start, end]) => (
        <Block
          key={start}
          at={[(start + end) / 2, (skirtTop + LOWER_GLASS) / 2, z]}
          size={[end - start, LOWER_GLASS - skirtTop, 0.04]}
          colour={RED}
        />
      ))}
      <Block at={[0, BASE + 0.03, z + side * 0.012]} size={[LENGTH - 0.1, 0.06, 0.02]} colour="#1f1f1f" />
      {[LOWER_GLASS, UPPER_GLASS].map((bottom) => {
        const top = bottom === LOWER_GLASS ? BAND : ROOF_BAND;
        return (
          <group key={bottom}>
            <mesh position={[0, (bottom + top) / 2, z]}>
              <planeGeometry args={[LENGTH - 0.12, top - bottom]} />
              <Glass opacity={0.32} />
            </mesh>
            {PILLARS.map((x) => (
              <Block key={x} at={[x, (bottom + top) / 2, z]} size={[0.07, top - bottom, 0.05]} colour={RED} />
            ))}
          </group>
        );
      })}
      <Block at={[0, (BAND + UPPER_GLASS) / 2, z]} size={[LENGTH, UPPER_GLASS - BAND, 0.04]} colour={RED} shadow />
      <Block at={[0, (ROOF_BAND + ROOF) / 2, z]} size={[LENGTH, ROOF - ROOF_BAND, 0.04]} colour={RED} />
      <mesh
        position={[-0.75, (BAND + UPPER_GLASS) / 2, side * (HALF_W + 0.002)]}
        rotation={[0, side === 1 ? 0 : Math.PI, 0]}
      >
        <planeGeometry args={[3.2, 0.3]} />
        <meshStandardMaterial map={advert} roughness={0.6} />
      </mesh>
      {kerbSide
        ? [2.62, 0.25].map((centre) => (
            <group key={centre} position={[centre, 0, side * (HALF_W + 0.004)]}>
              {[-0.19, 0.19].map((offset) => (
                <group key={offset} position={[offset, 0, 0]}>
                  <Block at={[0, 0.7, 0]} size={[0.36, 0.98, 0.02]} colour="#2a3138" />
                  <mesh position={[0, 0.74, side * 0.012]}>
                    <planeGeometry args={[0.28, 0.86]} />
                    <Glass opacity={0.55} tint="#3b5466" />
                  </mesh>
                </group>
              ))}
              <Block at={[0, 0.7, side * 0.014]} size={[0.02, 0.98, 0.01]} colour="#0d0d0d" />
            </group>
          ))
        : null}
    </group>
  );
}

function Front({ blind }: { blind: ReturnType<typeof blindTexture> }) {
  const x = HALF_L - 0.02;
  return (
    <group>
      <Block at={[x, (BASE + 0.62) / 2, 0]} size={[0.04, 0.62 - BASE, WIDTH]} colour={RED} shadow />
      <mesh position={[x + 0.005, 0.93, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[WIDTH - 0.08, 0.62]} />
        <Glass opacity={0.3} />
      </mesh>
      <Block at={[x, (1.24 + UPPER_GLASS) / 2, 0]} size={[0.04, UPPER_GLASS - 1.24, WIDTH]} colour={RED} />
      <Block at={[x + 0.022, 1.42, 0]} size={[0.01, 0.24, 1.18]} colour="#0a0a0a" />
      <mesh position={[x + 0.028, 1.42, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[1.12, 0.21]} />
        <meshBasicMaterial map={blind} toneMapped={false} />
      </mesh>
      <mesh position={[x + 0.005, (UPPER_GLASS + ROOF_BAND) / 2, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[WIDTH - 0.08, ROOF_BAND - UPPER_GLASS]} />
        <Glass opacity={0.3} />
      </mesh>
      <Block at={[x, (ROOF_BAND + ROOF) / 2, 0]} size={[0.04, ROOF - ROOF_BAND, WIDTH]} colour={RED} />
      {[-1, 1].map((side) => (
        <group key={side}>
          <Block at={[x, (BASE + ROOF) / 2, side * (HALF_W - 0.04)]} size={[0.06, ROOF - BASE, 0.08]} colour={RED} />
          <Block at={[x + 0.02, 0.42, side * 0.5]} size={[0.03, 0.08, 0.2]} colour="#fffbe8" emissive="#fff4cc" />
          <Block at={[x + 0.02, 0.42, side * 0.66]} size={[0.03, 0.07, 0.07]} colour="#ffa024" emissive="#ff8a00" />
          <Block at={[x + 0.1, 1.12, side * (HALF_W + 0.04)]} size={[0.22, 0.03, 0.03]} colour="#1a1a1a" />
          <Block at={[x + 0.2, 0.98, side * (HALF_W + 0.09)]} size={[0.05, 0.26, 0.12]} colour="#1a1a1a" />
        </group>
      ))}
      <Block at={[x + 0.03, 0.22, 0]} size={[0.08, 0.16, WIDTH + 0.02]} colour="#1b1b1b" />
      <Block at={[x + 0.075, 0.24, 0]} size={[0.01, 0.07, 0.34]} colour="#f4f4f0" />
    </group>
  );
}

function Rear() {
  const x = -HALF_L + 0.02;
  return (
    <group>
      <Block at={[x, (BASE + ROOF) / 2, 0]} size={[0.04, ROOF - BASE, WIDTH]} colour={RED} shadow />
      <mesh position={[x - 0.025, 1.9, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[1.0, 0.36]} />
        <Glass opacity={0.6} />
      </mesh>
      <Block at={[x - 0.03, 0.22, 0]} size={[0.08, 0.16, WIDTH + 0.02]} colour="#1b1b1b" />
      <Block at={[x - 0.075, 0.24, 0]} size={[0.01, 0.07, 0.34]} colour="#f5c400" />
      <Block at={[x - 0.025, 0.6, 0]} size={[0.01, 0.22, 0.7]} colour="#262626" />
      {[-1, 1].map((side) => (
        <group key={side}>
          <Block at={[x - 0.025, 0.46, side * 0.62]} size={[0.02, 0.16, 0.12]} colour="#b3000d" emissive="#ff1020" />
          <Block at={[x - 0.025, 2.0, side * 0.66]} size={[0.02, 0.08, 0.06]} colour="#b3000d" emissive="#ff1020" />
        </group>
      ))}
    </group>
  );
}

export function Bus({
  look,
  speed,
  route,
  destination,
}: {
  look: Appearance;
  speed: number;
  route: string;
  destination: string;
}) {
  const body = useRef<Group>(null);
  const textures = useMemo(() => {
    return {
      blind: blindTexture(route, destination),
      advert: advertTexture(advertFor(destination)),
      fabric: moquetteTexture("#5b1530", ["#d8a531", "#2c6fb5", "#b8323f"], 11),
    };
  }, [route, destination]);
  const disposables = useMemo(() => Object.values(textures), [textures]);
  useDispose(disposables);

  const riders = useMemo<Rider[]>(() => {
    const seats: [number, number, number][] = [
      [UPPER_ROWS[2] ?? 1.52, UPPER_FLOOR, -0.42],
      [UPPER_ROWS[4] ?? 0.42, UPPER_FLOOR, 0.42],
      [UPPER_ROWS[6] ?? -0.68, UPPER_FLOOR, -0.42],
      [UPPER_ROWS[8] ?? -1.78, UPPER_FLOOR, 0.42],
      [LOWER_ROWS[0] ?? -0.95, LOWER_FLOOR, -0.42],
      [LOWER_ROWS[2] ?? -2.05, LOWER_FLOOR, 0.42],
    ];
    return seats.map((at, index) => ({ at, look: riderLook(`bus-${destination}-${index}`) }));
  }, [destination]);
  const driver = useMemo(() => riderLook(`driver-${route}`), [route]);

  useFrame(({ clock }) => {
    const group = body.current;
    if (!group) return;
    const t = clock.elapsedTime;
    group.position.y = Math.sin(t * 7.3) * 0.004 + Math.sin(t * 2.1) * 0.006;
    group.rotation.x = Math.sin(t * 1.3) * 0.004;
  });

  return (
    <group>
      <group ref={body}>
        <Side side={1} advert={textures.advert} />
        <Side side={-1} advert={textures.advert} />
        <Front blind={textures.blind} />
        <Rear />
        <RoundedBox args={[LENGTH, 0.16, WIDTH]} radius={0.06} smoothness={3} position={[0, ROOF + 0.02, 0]} castShadow>
          <meshStandardMaterial color={RED} roughness={0.45} />
        </RoundedBox>

        <Block at={[0, LOWER_FLOOR - 0.02, 0]} size={[LENGTH - 0.08, 0.04, WIDTH - 0.06]} colour="#4b5058" />
        <Block at={[0, UPPER_FLOOR - 0.04, 0]} size={[LENGTH - 0.08, 0.08, WIDTH - 0.06]} colour="#565d66" />
        {[BAND - 0.001, ROOF - 0.08].map((y) => (
          <mesh key={y} position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <planeGeometry args={[LENGTH - 0.1, WIDTH - 0.08]} />
            <meshStandardMaterial color="#eeede8" emissive="#c9c6bd" emissiveIntensity={0.45} side={DoubleSide} />
          </mesh>
        ))}
        {[BAND - 0.01, ROOF - 0.09].map((y) =>
          [-1, 1].map((side) => (
            <mesh key={`${y}-${side}`} position={[0, y, side * 0.46]}>
              <boxGeometry args={[LENGTH - 0.7, 0.012, 0.08]} />
              <meshBasicMaterial color="#fff7df" />
            </mesh>
          )),
        )}

        {UPPER_ROWS.map((x) =>
          [-0.42, 0.42].map((z) => <Seat key={`u${x}${z}`} x={x} floor={UPPER_FLOOR} z={z} fabric={textures.fabric} />),
        )}
        {LOWER_ROWS.map((x) =>
          [-0.42, 0.42].map((z) => <Seat key={`l${x}${z}`} x={x} floor={LOWER_FLOOR} z={z} fabric={textures.fabric} />),
        )}
        <Pole from={[2.98, UPPER_FLOOR + 0.5, -HALF_W + 0.1]} length={WIDTH - 0.2} axis="z" />
        {[0.75, 2.2].map((x) => (
          <Pole key={x} from={[x, LOWER_FLOOR, -0.12]} length={BAND - LOWER_FLOOR} />
        ))}
        <Pole from={[-2.9, LOWER_FLOOR, 0]} length={BAND - LOWER_FLOOR} />

        <Block at={[2.28, 0.7, 0.4]} size={[0.03, 0.88, 0.66]} colour="#7c858f" />
        <mesh position={[2.98, 0.8, 0.4]} rotation={[0, Math.PI / 2, 0.5]}>
          <torusGeometry args={[0.13, 0.015, 8, 24]} />
          <meshStandardMaterial color="#1a1a1a" />
        </mesh>
        <group position={[2.66, LOWER_FLOOR, 0.4]} rotation={[0, Math.PI / 2, 0]}>
          <Avatar look={driver} anim="sit" seed={3} />
        </group>

        {riders.map((rider, index) => (
          <group key={index} position={[rider.at[0] + 0.03, rider.at[1], rider.at[2]]} rotation={[0, Math.PI / 2, 0]}>
            <Avatar look={rider.look} anim="sit" seed={index + 5} />
          </group>
        ))}
        <group
          position={[BUS_PLAYER_SEAT[0] + 0.03, BUS_PLAYER_SEAT[1], BUS_PLAYER_SEAT[2]]}
          rotation={[0, Math.PI / 2, 0]}
        >
          <Avatar look={look} anim="sit" crown />
        </group>
      </group>

      {AXLES.map((x) =>
        [-1, 1].map((side) => (
          <group key={`${x}${side}`}>
            <Wheel position={[x, WHEEL_R, side * (HALF_W - 0.13)]} radius={WHEEL_R} width={0.24} speed={speed} />
            <mesh position={[x, WHEEL_R, side * (HALF_W - 0.16)]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[ARCH, ARCH, 0.3, 20, 1, true, Math.PI / 2, Math.PI]} />
              <meshStandardMaterial color="#111111" side={DoubleSide} />
            </mesh>
          </group>
        )),
      )}
    </group>
  );
}
