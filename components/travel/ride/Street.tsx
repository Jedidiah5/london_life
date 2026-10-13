"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef, type ReactNode } from "react";
import type { CanvasTexture, Group } from "three";
import { Avatar } from "@/components/canvas/Avatar";
import type { Appearance, TravelMode } from "@/lib/sim/types";
import { Bus } from "./Bus";
import { Cab, Hatchback, Van } from "./Cab";
import { Block, Glass, Pole, useDispose, useScroller } from "./parts";
import { facadeTexture, pavingTexture, seeded, shade, stopSignTexture, wordTexture, type FacadeSpec } from "./textures";

export const LANE_Z = -1.15;
export const PAVEMENT_Z = -3.3;
const ROAD_HALF = 2.3;
const FRONTAGE = -4.6;
const DEPTH = 4;
const SPAN = 72;
const STOREY = 1.6;
const SLAB = 1.3;

const SHOPS = [
  { name: "PERI PALACE", colour: "#b8262f" },
  { name: "OFF LICENCE", colour: "#1f4e8c" },
  { name: "KEBAB KINGDOM", colour: "#d97a14" },
  { name: "QUIDS IN", colour: "#6a2c8c" },
  { name: "LAUNDERETTE", colour: "#2b8a8a" },
  { name: "BETTA BETS", colour: "#0f6b3a" },
  { name: "FADEZ BARBERS", colour: "#1b1b1b" },
  { name: "PHONE FIX 4 U", colour: "#c22f6b" },
  { name: "THE CAFF", colour: "#7a4a24" },
  { name: "MINI MART 24/7", colour: "#245c3a" },
];
const BRICK = ["#b39468", "#a5583b", "#8b5a43", "#c2a57a", "#9c6b4e"];
const STUCCO = ["#ece6da", "#ddd4c4", "#cbd6c6", "#e9dac6"];
const DOORS = ["#1b1b1b", "#b8262f", "#1f4e8c", "#2e6b45", "#f2c230"];

interface Building extends FacadeSpec {
  x: number;
  width: number;
  chimney: boolean;
}

const BUILDINGS: Building[] = (() => {
  const rand = seeded(42);
  const widths = Array.from({ length: 22 }, () => 2.6 + rand() * 1.6);
  const scale = SPAN / widths.reduce((sum, width) => sum + width, 0);
  let cursor = -SPAN / 2;
  return widths.map((raw, index) => {
    const width = raw * scale;
    const x = cursor + width / 2;
    cursor += width;
    const stucco = rand() < 0.3;
    const palette = stucco ? STUCCO : BRICK;
    return {
      x,
      width,
      storeys: 3 + Math.floor(rand() * 3),
      stucco,
      wall: palette[Math.floor(rand() * palette.length)] ?? "#b39468",
      bays: width > 3.3 ? 3 : 2,
      shop: rand() < 0.6 ? (SHOPS[index % SHOPS.length] ?? null) : null,
      door: DOORS[Math.floor(rand() * DOORS.length)] ?? "#1b1b1b",
      chimney: rand() < 0.75,
      seed: index * 97 + 13,
    };
  });
})();

function Terrace({ building, texture }: { building: Building; texture: CanvasTexture | undefined }) {
  const height = building.storeys * STOREY;
  const side = building.wall;
  return (
    <group>
      <mesh position={[0, height / 2, FRONTAGE - DEPTH / 2]} castShadow receiveShadow>
        <boxGeometry args={[building.width, height, DEPTH]} />
        <meshStandardMaterial attach="material-0" color={side} roughness={0.9} />
        <meshStandardMaterial attach="material-1" color={side} roughness={0.9} />
        <meshStandardMaterial attach="material-2" color="#54585d" roughness={0.9} />
        <meshStandardMaterial attach="material-3" color={side} roughness={0.9} />
        <meshStandardMaterial attach="material-4" map={texture} roughness={0.85} />
        <meshStandardMaterial attach="material-5" color={side} roughness={0.9} />
      </mesh>
      <Block
        at={[0, height + 0.06, FRONTAGE - 0.12]}
        size={[building.width + 0.02, 0.14, 0.3]}
        colour="#e3ddcf"
        shadow
      />
      {building.chimney ? (
        <group position={[building.width * 0.28, height, FRONTAGE - DEPTH * 0.55]}>
          <Block
            at={[0, 0.35, 0]}
            size={[0.42, 0.7, 0.55]}
            colour={building.stucco ? "#a5583b" : building.wall}
            shadow
          />
          {[-0.1, 0.1].map((x) => (
            <mesh key={x} position={[x, 0.8, 0]}>
              <cylinderGeometry args={[0.05, 0.06, 0.22, 10]} />
              <meshStandardMaterial color="#b4643c" roughness={0.9} />
            </mesh>
          ))}
        </group>
      ) : null}
      {building.shop ? (
        <mesh position={[0, STOREY * 0.66, FRONTAGE + 0.35]} rotation={[0.45, 0, 0]}>
          <boxGeometry args={[building.width * 0.8, 0.02, 0.75]} />
          <meshStandardMaterial color={shade(building.shop.colour, 0.15)} roughness={0.8} />
        </mesh>
      ) : null}
    </group>
  );
}

function Lamp({ z }: { z: number }) {
  const facing = z < 0 ? 1 : -1;
  return (
    <group position={[0, 0.08, z]}>
      <Pole from={[0, 0, 0]} length={2.9} radius={0.045} colour="#1f2a25" />
      <Pole from={[0, 2.85, facing > 0 ? 0 : -0.5]} length={0.5} axis="z" radius={0.025} colour="#1f2a25" />
      <Block at={[0, 2.78, 0.5 * facing]} size={[0.16, 0.08, 0.3]} colour="#1f2a25" />
      <Block at={[0, 2.72, 0.5 * facing]} size={[0.12, 0.03, 0.24]} colour="#fff3cf" emissive="#ffe7a8" />
    </group>
  );
}

function Tree({ z, seed }: { z: number; seed: number }) {
  const rand = seeded(seed);
  const blobs = Array.from({ length: 4 }, () => [
    (rand() - 0.5) * 0.9,
    2.3 + rand() * 0.8,
    (rand() - 0.5) * 0.7,
    0.55 + rand() * 0.35,
  ]);
  return (
    <group position={[0, 0.08, z]}>
      <Block at={[0, 0.005, 0]} size={[0.8, 0.01, 0.8]} colour="#4a3a2a" />
      <mesh position={[0, 1.0, 0]} castShadow>
        <cylinderGeometry args={[0.07, 0.11, 2.0, 8]} />
        <meshStandardMaterial color="#5a4632" roughness={1} />
      </mesh>
      {blobs.map(([bx = 0, by = 0, bz = 0, radius = 0.6], index) => (
        <mesh key={index} position={[bx, by, bz]} castShadow>
          <icosahedronGeometry args={[radius, 1]} />
          <meshStandardMaterial color={index % 2 === 0 ? "#4f7a3a" : "#5e8b45"} roughness={0.95} flatShading />
        </mesh>
      ))}
    </group>
  );
}

function BusStop({ sign }: { sign: ReturnType<typeof stopSignTexture> }) {
  return (
    <group position={[0, 0.08, 0]}>
      <Pole from={[0, 0, -2.6]} length={2.4} radius={0.035} colour="#2b2f33" />
      <mesh position={[0, 2.15, -2.6]}>
        <boxGeometry args={[0.02, 0.5, 0.4]} />
        <meshStandardMaterial attach="material-0" map={sign} />
        <meshStandardMaterial attach="material-1" map={sign} />
        <meshStandardMaterial attach="material-2" color="#ffffff" />
        <meshStandardMaterial attach="material-3" color="#ffffff" />
        <meshStandardMaterial attach="material-4" color="#ffffff" />
        <meshStandardMaterial attach="material-5" color="#ffffff" />
      </mesh>
      <group position={[-2.2, 0, -3.9]}>
        <Block at={[0, 1.55, 0]} size={[2.6, 0.06, 0.9]} colour="#2b2f33" shadow />
        <mesh position={[0, 0.8, -0.42]}>
          <planeGeometry args={[2.5, 1.45]} />
          <Glass opacity={0.25} tint="#9fb4c3" />
        </mesh>
        {[-1.28, 1.28].map((offset) => (
          <group key={offset}>
            <Pole from={[offset, 0, -0.42]} length={1.55} radius={0.03} colour="#2b2f33" />
            <mesh position={[offset, 0.8, -0.05]} rotation={[0, Math.PI / 2, 0]}>
              <planeGeometry args={[0.75, 1.45]} />
              <Glass opacity={0.25} tint="#9fb4c3" />
            </mesh>
          </group>
        ))}
        <Block at={[0, 0.42, -0.25]} size={[1.6, 0.05, 0.25]} colour="#8a9198" />
      </group>
    </group>
  );
}

function PhoneBox() {
  return (
    <group position={[0, 0.08, -3.95]}>
      <Block at={[0, 1.15, 0]} size={[0.6, 2.3, 0.6]} colour="#c8102e" shadow rough={0.45} />
      <Block at={[0, 2.38, 0]} size={[0.66, 0.16, 0.66]} colour="#c8102e" rough={0.45} />
      <mesh position={[0, 0.95, 0.302]}>
        <planeGeometry args={[0.42, 1.4]} />
        <meshStandardMaterial color="#2c3b4a" roughness={0.2} metalness={0.3} />
      </mesh>
      {[0.6, 0.95, 1.3].map((y) => (
        <Block key={y} at={[0, y, 0.305]} size={[0.44, 0.03, 0.01]} colour="#c8102e" />
      ))}
      <Block at={[0, 2.1, 0.305]} size={[0.44, 0.12, 0.01]} colour="#f4f1ea" emissive="#f4f1ea" />
    </group>
  );
}

function Furniture({ sign }: { sign: ReturnType<typeof stopSignTexture> }) {
  const items: { key: string; x: number; node: ReactNode }[] = [];
  for (let k = 0; k < 8; k += 1) {
    items.push({ key: `lamp-n-${k}`, x: -SPAN / 2 + 4 + k * 9, node: <Lamp z={-2.65} /> });
  }
  for (let k = 0; k < 6; k += 1) {
    const x = -SPAN / 2 + 8.5 + k * 12;
    if (Math.abs(x - 3) < 3) continue;
    items.push({ key: `tree-${k}`, x, node: <Tree z={-2.85} seed={k + 3} /> });
  }
  for (let k = 0; k < 6; k += 1) {
    items.push({ key: `lamp-f-${k}`, x: -SPAN / 2 + 2 + k * 12, node: <Lamp z={2.7} /> });
  }
  items.push({ key: "stop", x: 3, node: <BusStop sign={sign} /> });
  items.push({ key: "phone", x: -12, node: <PhoneBox /> });
  for (const x of [-25, 15, 28]) {
    items.push({
      key: `bin-${x}`,
      x,
      node: (
        <mesh position={[0, 0.5, -2.7]} castShadow>
          <cylinderGeometry args={[0.2, 0.18, 0.84, 14]} />
          <meshStandardMaterial color="#1c1f22" roughness={0.6} />
        </mesh>
      ),
    });
  }
  return (
    <>
      {items.map((item) => (
        <group key={item.key} position={[item.x, 0, 0]}>
          {item.node}
        </group>
      ))}
    </>
  );
}

export function Street({
  mode,
  look,
  speed,
  route,
  destination,
}: {
  mode: TravelMode;
  look: Appearance;
  speed: number;
  route: string;
  destination: string;
}) {
  const scroll = useRef<Group>(null);
  const traffic = useRef<Group>(null);
  const facades = useMemo(() => BUILDINGS.map((building) => facadeTexture(building)), []);
  const paving = useMemo(() => {
    const texture = pavingTexture();
    texture.repeat.set(SPAN / SLAB, ROAD_HALF / SLAB);
    return texture;
  }, []);
  const extras = useMemo(
    () => ({ sign: stopSignTexture(`${route} 38 N29`), lane: wordTexture("BUS LANE", "#f4f1ea", null, 512, 96) }),
    [route],
  );
  const disposables = useMemo(() => [...facades, paving, extras.sign, extras.lane], [facades, paving, extras]);
  useDispose(disposables);
  useScroller(scroll, speed, SPAN);
  const oncoming = 6;
  useScroller(traffic, speed + oncoming, SPAN);
  useFrame((_, delta) => {
    paving.offset.x += (Math.min(delta, 0.1) * speed) / SLAB;
  });

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.005, 0]} receiveShadow>
        <planeGeometry args={[SPAN + 40, 60]} />
        <meshStandardMaterial color="#3b3e43" roughness={0.95} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.0, 12]} receiveShadow>
        <planeGeometry args={[SPAN + 40, 15]} />
        <meshStandardMaterial color="#6a8d52" roughness={1} />
      </mesh>
      {mode === "bus" ? (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.002, -1.2]} receiveShadow>
          <planeGeometry args={[SPAN + 40, 2.2]} />
          <meshStandardMaterial color="#7a2f2a" roughness={0.95} />
        </mesh>
      ) : null}
      {[-1, 1].map((side) => (
        <group key={side}>
          <Block at={[0, 0.04, side * (ROAD_HALF + 0.06)]} size={[SPAN + 40, 0.08, 0.14]} colour="#a19e97" shadow />
          <mesh position={[0, 0.04, side * (ROAD_HALF + 0.13 + ROAD_HALF / 2)]} receiveShadow>
            <boxGeometry args={[SPAN + 40, 0.08, ROAD_HALF]} />
            <meshStandardMaterial attach="material-0" color="#b9b6ae" />
            <meshStandardMaterial attach="material-1" color="#b9b6ae" />
            <meshStandardMaterial attach="material-2" map={paving} roughness={0.95} />
            <meshStandardMaterial attach="material-3" color="#b9b6ae" />
            <meshStandardMaterial attach="material-4" color="#b9b6ae" />
            <meshStandardMaterial attach="material-5" color="#b9b6ae" />
          </mesh>
          {[0.1, 0.22].map((offset) => (
            <mesh key={offset} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.004, side * (ROAD_HALF - offset)]}>
              <planeGeometry args={[SPAN + 40, 0.06]} />
              <meshBasicMaterial color="#e8b923" />
            </mesh>
          ))}
        </group>
      ))}

      <group ref={scroll}>
        {BUILDINGS.map((building, index) => (
          <group key={index} position={[building.x, 0, 0]}>
            <Terrace building={building} texture={facades[index]} />
          </group>
        ))}
        {Array.from({ length: 24 }, (_, index) => (
          <mesh key={`dash-${index}`} position={[-SPAN / 2 + index * 3, 0.004, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[1.6, 0.1]} />
            <meshBasicMaterial color="#efece4" />
          </mesh>
        ))}
        {mode === "bus"
          ? [-30, -6, 18].map((x) => (
              <group key={`lane-${x}`} position={[x, 0.006, LANE_Z]} rotation={[0, -Math.PI / 2, 0]}>
                <mesh rotation={[-Math.PI / 2, 0, 0]}>
                  <planeGeometry args={[1.6, 0.6]} />
                  <meshBasicMaterial map={extras.lane} transparent />
                </mesh>
              </group>
            ))
          : null}
        <Furniture sign={extras.sign} />
      </group>

      <group ref={traffic}>
        <group position={[-20, 0, -LANE_Z]} rotation={[0, Math.PI, 0]}>
          <Cab speed={oncoming} />
        </group>
        <group position={[4, 0, -LANE_Z]} rotation={[0, Math.PI, 0]}>
          <Van speed={oncoming} />
        </group>
        <group position={[26, 0, -LANE_Z]} rotation={[0, Math.PI, 0]}>
          <Hatchback speed={oncoming} colour="#3d6fb5" />
        </group>
      </group>

      {mode === "bus" ? (
        <group position={[0, 0, LANE_Z]}>
          <Bus look={look} speed={speed} route={route} destination={destination} />
        </group>
      ) : null}
      {mode === "ride" ? (
        <group position={[0, 0, LANE_Z]}>
          <Cab look={look} speed={speed} />
        </group>
      ) : null}
      {mode === "walk" ? (
        <group position={[0, 0.08, PAVEMENT_Z]} rotation={[0, Math.PI / 2, 0]}>
          <Avatar look={look} anim="walk" />
        </group>
      ) : null}
    </group>
  );
}
