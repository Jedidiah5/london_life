"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { DoubleSide, type CanvasTexture, type Group } from "three";
import { Avatar } from "@/components/canvas/Avatar";
import type { Appearance } from "@/lib/sim/types";
import { Block, Glass, Pole, riderLook, useDispose, useScroller } from "./parts";
import { advertFor, advertTexture, hashOf, ledTexture, lineMapTexture, moquetteTexture, seeded } from "./textures";

const HALF = 6;
const WALL = 0.8;
const GLASS_LOW = 0.62;
const GLASS_HIGH = 1.02;
const SPRING = 1.04;
const DOORS = [-2.9, 2.9];
const DOOR_HALF = 0.46;
const BAYS: [number, number][] = [
  [-5.9, -3.42],
  [-2.38, 2.38],
  [3.42, 5.9],
];
const SEAT = 0.32;
const SEAT_Z = 0.62;
const TUNNEL_SPAN = 36;
const TRAIN_SPEED = 22;

interface SeatSpot {
  x: number;
  side: 1 | -1;
}

const SEATS: SeatSpot[] = BAYS.flatMap(([start, end]) => {
  const count = Math.floor((end - start) / SEAT);
  const used = count * SEAT;
  const first = start + (end - start - used) / 2 + SEAT / 2;
  return Array.from({ length: count }, (_, index) => first + index * SEAT).flatMap((x) => [
    { x, side: -1 as const },
    { x, side: 1 as const },
  ]);
});

/** Your seat: centre bay, right-hand side when looking down the carriage. */
export const TUBE_PLAYER_SEAT: SeatSpot = SEATS.filter(
  (seat) => seat.side === -1 && seat.x < 2.2 && seat.x > 1.4,
)[0] ?? {
  x: 1.8,
  side: -1,
};

function Tunnel() {
  const moving = useRef<Group>(null);
  useScroller(moving, TRAIN_SPEED, TUNNEL_SPAN);
  return (
    <group>
      {[-1, 1].map((side) => (
        <group key={side}>
          <mesh position={[0, 0.8, side * 1.35]} rotation={[0, side === 1 ? Math.PI : 0, 0]}>
            <planeGeometry args={[TUNNEL_SPAN, 2]} />
            <meshStandardMaterial color="#25282d" roughness={1} />
          </mesh>
          {[0.72, 0.8, 0.88].map((y) => (
            <Block key={y} at={[0, y, side * 1.3]} size={[TUNNEL_SPAN, 0.025, 0.03]} colour="#0b0c0d" />
          ))}
        </group>
      ))}
      <group ref={moving}>
        {Array.from({ length: 24 }, (_, index) => {
          const x = -TUNNEL_SPAN / 2 + index * 1.5;
          return (
            <group key={index} position={[x, 0, 0]}>
              {[-1, 1].map((side) => (
                <group key={side}>
                  <Block at={[0, 0.8, side * 1.31]} size={[0.09, 1.9, 0.03]} colour="#3a3e44" />
                  {index % 3 === 0 ? (
                    <mesh position={[0.3, 1.0, side * 1.28]}>
                      <boxGeometry args={[0.28, 0.05, 0.02]} />
                      <meshBasicMaterial color="#ffd9a0" />
                    </mesh>
                  ) : null}
                </group>
              ))}
            </group>
          );
        })}
      </group>
    </group>
  );
}

function Seats({ fabric }: { fabric: CanvasTexture }) {
  return (
    <group>
      {BAYS.map(([start, end]) =>
        [-1, 1].map((side) => (
          <Block
            key={`${start}${side}`}
            at={[(start + end) / 2, 0.09, side * 0.64]}
            size={[end - start, 0.18, 0.28]}
            colour="#7d838a"
          />
        )),
      )}
      {SEATS.map((seat) => (
        <group key={`${seat.x}${seat.side}`} position={[seat.x, 0, seat.side * SEAT_Z]}>
          <mesh position={[0, 0.215, 0]}>
            <boxGeometry args={[SEAT - 0.025, 0.07, 0.3]} />
            <meshStandardMaterial map={fabric} roughness={0.95} />
          </mesh>
          <mesh position={[0, 0.44, seat.side * 0.145]} rotation={[seat.side * 0.08, 0, 0]}>
            <boxGeometry args={[SEAT - 0.025, 0.36, 0.05]} />
            <meshStandardMaterial map={fabric} roughness={0.95} />
          </mesh>
          <Block at={[SEAT / 2, 0.37, 0]} size={[0.025, 0.03, 0.26]} colour="#9aa1a8" metal={0.5} rough={0.4} />
        </group>
      ))}
    </group>
  );
}

function Shell({ ads, lineMap, led }: { ads: CanvasTexture[]; lineMap: CanvasTexture; led: CanvasTexture }) {
  const adSpots = useMemo(
    () =>
      BAYS.flatMap(([start, end]) => {
        const count = Math.max(1, Math.floor((end - start) / 0.85));
        const step = (end - start) / count;
        return Array.from({ length: count }, (_, index) => start + step * (index + 0.5));
      }),
    [],
  );
  useFrame((_, delta) => {
    led.offset.x += Math.min(delta, 0.1) * 0.12;
  });
  return (
    <group>
      <mesh position={[0, -0.02, 0]} receiveShadow>
        <boxGeometry args={[HALF * 2, 0.04, WALL * 2]} />
        <meshStandardMaterial color="#5f656c" roughness={0.85} />
      </mesh>
      {DOORS.map((x) => (
        <mesh key={x} position={[x, 0.002, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[DOOR_HALF * 2, WALL * 2]} />
          <meshStandardMaterial color="#6e7379" roughness={0.6} />
        </mesh>
      ))}
      {[-1, 1].map((side) => (
        <group key={side}>
          <Block at={[0, GLASS_LOW / 2, side * WALL]} size={[HALF * 2, GLASS_LOW, 0.03]} colour="#d9dcdf" />
          <mesh position={[0, (GLASS_LOW + GLASS_HIGH) / 2, side * WALL]}>
            <planeGeometry args={[HALF * 2, GLASS_HIGH - GLASS_LOW]} />
            <Glass opacity={0.45} tint="#0e1418" />
          </mesh>
          {[GLASS_LOW, GLASS_HIGH].map((y) => (
            <Block key={y} at={[0, y, side * (WALL - 0.01)]} size={[HALF * 2, 0.03, 0.04]} colour="#c9cdd1" />
          ))}
          {[...BAYS.flat(), -4.66, -1.2, 0, 1.2, 4.66].map((x) => (
            <Block
              key={x}
              at={[x, (GLASS_LOW + GLASS_HIGH) / 2, side * (WALL - 0.01)]}
              size={[0.05, 0.4, 0.04]}
              colour="#c9cdd1"
            />
          ))}
          <Block at={[0, SPRING, side * (WALL - 0.01)]} size={[HALF * 2, 0.05, 0.04]} colour="#e6e8ea" />
          {adSpots.map((x, index) => (
            <mesh key={x} position={[x, 1.12, side * 0.7]} rotation={side === 1 ? [-0.55, Math.PI, 0] : [0.55, 0, 0]}>
              <planeGeometry args={[0.74, 0.2]} />
              <meshStandardMaterial map={ads[(index + (side === 1 ? 2 : 0)) % ads.length]} roughness={0.6} />
            </mesh>
          ))}
          {DOORS.map((x) => (
            <group key={x}>
              <mesh position={[x, 1.12, side * 0.7]} rotation={side === 1 ? [-0.55, Math.PI, 0] : [0.55, 0, 0]}>
                <planeGeometry args={[0.92, 0.12]} />
                <meshStandardMaterial map={lineMap} roughness={0.6} />
              </mesh>
              {[-1, 1].map((leaf) => (
                <group key={leaf} position={[x + leaf * (DOOR_HALF / 2), 0, side * (WALL - 0.02)]}>
                  <Block at={[0, 0.53, 0]} size={[DOOR_HALF - 0.01, 1.06, 0.035]} colour="#c3c8cd" />
                  <mesh position={[0, 0.74, -side * 0.02]}>
                    <planeGeometry args={[DOOR_HALF - 0.12, 0.5]} />
                    <Glass opacity={0.7} tint="#0b1014" />
                  </mesh>
                  <Block
                    at={[-leaf * (DOOR_HALF / 2 - 0.01), 0.53, -side * 0.01]}
                    size={[0.02, 1.06, 0.03]}
                    colour="#c8102e"
                  />
                </group>
              ))}
              <Block at={[x, 1.08, side * (WALL - 0.02)]} size={[DOOR_HALF * 2 + 0.06, 0.06, 0.05]} colour="#aeb3b8" />
              {[-1, 1].map((edge) => (
                <Pole key={edge} from={[x + edge * (DOOR_HALF + 0.06), 0, side * 0.46]} length={1.28} />
              ))}
            </group>
          ))}
          {BAYS.flat().map((x) => (
            <group key={x}>
              <mesh position={[x, 0.62, side * 0.63]} rotation={[0, Math.PI / 2, 0]}>
                <planeGeometry args={[0.32, 0.8]} />
                <Glass opacity={0.22} tint="#a9c0cf" />
              </mesh>
              <Pole from={[x, 1.02, side * 0.8]} length={0.34} axis="z" radius={0.014} colour="#f2b705" />
            </group>
          ))}
          {BAYS.map(([start, end]) => (
            <Pole key={start} from={[start, 1.2, side * 0.42]} length={end - start} axis="x" radius={0.014} />
          ))}
          <mesh position={[0, 1.33, side * 0.3]} rotation={[side * 0.35, 0, 0]}>
            <boxGeometry args={[HALF * 2 - 0.4, 0.015, 0.1]} />
            <meshBasicMaterial color="#fffdf4" />
          </mesh>
        </group>
      ))}
      {[-1.2, 1.2].map((x) => (
        <Pole key={x} from={[x, 0, 0]} length={1.38} />
      ))}
      <mesh position={[0, SPRING, 0]} rotation={[0, 0, Math.PI / 2]} scale={[0.45, 1, 1]}>
        <cylinderGeometry args={[WALL, WALL, HALF * 2, 32, 1, true, 0, Math.PI]} />
        <meshStandardMaterial color="#efefea" side={DoubleSide} roughness={0.7} />
      </mesh>
      {[-HALF, HALF].map((x) => (
        <group key={x}>
          <Block at={[x, 0.7, 0]} size={[0.04, 1.4, WALL * 2]} colour="#d9dcdf" />
          <mesh
            position={[x + (x < 0 ? 0.025 : -0.025), 0.82, 0]}
            rotation={[0, x < 0 ? Math.PI / 2 : -Math.PI / 2, 0]}
          >
            <planeGeometry args={[0.42, 0.62]} />
            <Glass opacity={0.8} tint="#05080a" />
          </mesh>
        </group>
      ))}
      <mesh position={[-HALF + 0.03, 1.22, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[0.9, 0.11]} />
        <meshBasicMaterial map={led} toneMapped={false} />
      </mesh>
    </group>
  );
}

export function TubeCarriage({
  look,
  line,
  destination,
  stations,
}: {
  look: Appearance;
  line: { name: string; colour: string };
  destination: string;
  stations: string[];
}) {
  const carriage = useRef<Group>(null);
  const textures = useMemo(() => {
    const seed = hashOf(destination);
    return {
      fabric: moquetteTexture("#1d2a5a", ["#c8102e", "#4fa3d9", "#f2c230"], 5),
      ads: [0, 1, 2, 3].map((index) => advertTexture(advertFor(seed + index), 256, 72)),
      lineMap: lineMapTexture(line.colour, stations),
      led: ledTexture(`This is a ${line.name} line train to ${destination}.   Next station: ${destination}.   `),
    };
  }, [destination, line, stations]);
  const disposables = useMemo(() => [textures.fabric, textures.lineMap, textures.led, ...textures.ads], [textures]);
  useDispose(disposables);

  const riders = useMemo(() => {
    const rand = seeded(hashOf(destination) + 1);
    const free = SEATS.filter(
      (seat) => !(seat.side === TUBE_PLAYER_SEAT.side && Math.abs(seat.x - TUBE_PLAYER_SEAT.x) < SEAT * 1.5),
    );
    const picked: SeatSpot[] = [];
    while (picked.length < 9 && free.length > 0) {
      const [seat] = free.splice(Math.floor(rand() * free.length), 1);
      if (seat) picked.push(seat);
    }
    return picked.map((seat, index) => ({ seat, look: riderLook(`tube-${destination}-${index}`) }));
  }, [destination]);
  const standing = useMemo(
    () => [riderLook(`stand-${destination}-a`), riderLook(`stand-${destination}-b`)],
    [destination],
  );

  useFrame(({ clock }) => {
    const group = carriage.current;
    if (!group) return;
    const t = clock.elapsedTime;
    group.rotation.x = Math.sin(t * 1.7) * 0.006 + Math.sin(t * 5.3) * 0.0015;
    group.position.y = Math.sin(t * 11) * 0.0025;
  });

  return (
    <group>
      <Tunnel />
      <group ref={carriage}>
        <Shell ads={textures.ads} lineMap={textures.lineMap} led={textures.led} />
        <Seats fabric={textures.fabric} />
        {riders.map(({ seat, look: rider }, index) => (
          <group key={index} position={[seat.x, 0, seat.side * 0.67]} rotation={[0, seat.side === 1 ? Math.PI : 0, 0]}>
            <Avatar look={rider} anim="sit" seed={index + 1} />
          </group>
        ))}
        <group position={[-2.75, 0, 0.32]} rotation={[0, -2.2, 0]}>
          <Avatar look={standing[0] ?? look} anim="stand" seed={21} />
        </group>
        <group position={[-3.05, 0, -0.3]} rotation={[0, 0.6, 0]}>
          <Avatar look={standing[1] ?? look} anim="stand" seed={34} />
        </group>
        <group position={[TUBE_PLAYER_SEAT.x, 0, TUBE_PLAYER_SEAT.side * 0.67]} rotation={[0, 0, 0]}>
          <Avatar look={look} anim="sit" />
        </group>
      </group>
    </group>
  );
}
