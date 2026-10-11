"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import { Group, Vector3 } from "three";
import { Avatar } from "@/components/canvas/Avatar";
import { events, venuesById } from "@/lib/content";
import { seededLook } from "@/lib/sim/appearance";
import { ARRIVAL_EVENT_CHANCE, HAIRS, SKINS, TOPS } from "@/lib/sim/constants";
import { pickEvent } from "@/lib/sim/events";
import type { Appearance, TravelMode } from "@/lib/sim/types";
import { useGame } from "@/lib/store/useGame";
import { useUi } from "@/lib/store/useUi";

type View = "chase" | "side" | "inside";

const SLOGANS: Record<TravelMode, string[]> = {
  tube: ["PLEASE MIND THE GAP", "STAND ON THE RIGHT", "SEE IT. SAY IT. SORTED."],
  bus: ["KEEP CALM AND TAP IN", "NEXT STOP: SOMEWHERE", "MOVE DOWN INSIDE PLEASE"],
  ride: ["THE KNOWLEDGE, SINCE 1865", "CASH OR CARD, GUV?", "I ONLY GO SOUTH OF THE RIVER ON TUESDAYS"],
  walk: ["IT'S ONLY SPITTING", "QUICKER TO WALK, HONESTLY", "TWENTY MINUTES, TOPS"],
};

const PALETTE = { skins: SKINS, hairs: HAIRS, tops: TOPS };

function Passengers({ count, seated }: { count: number; seated: boolean }) {
  const looks = useMemo(() => Array.from({ length: count }, (_, index) => seededLook(`rider-${index}`, PALETTE)), [count]);
  return (
    <group>
      {looks.map((look, index) => {
        const side = index % 2 === 0 ? -1 : 1;
        const x = -3 + Math.floor(index / 2) * 1.6;
        return (
          <group key={index} position={[x, seated ? 0.22 : 0, side * 0.75]} rotation={[0, side > 0 ? Math.PI : 0, 0]}>
            <Avatar look={look} anim={seated ? "sit" : "stand"} seed={index} />
          </group>
        );
      })}
    </group>
  );
}

function TubeCarriage({ look }: { look: Appearance }) {
  const lights = useRef<Group>(null);
  useFrame((_, delta) => {
    const group = lights.current;
    if (!group) return;
    for (const child of group.children) {
      child.position.x -= delta * 18;
      if (child.position.x < -12) child.position.x += 24;
    }
  });
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[10, 2.6]} />
        <meshStandardMaterial color="#5a5f66" />
      </mesh>
      <mesh position={[0, 1.6, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[10, 2.6]} />
        <meshStandardMaterial color="#e8e6e0" />
      </mesh>
      {[-1, 1].map((side) => (
        <group key={side}>
          <mesh position={[0, 0.8, side * 1.3]}>
            <boxGeometry args={[10, 1.6, 0.05]} />
            <meshStandardMaterial color="#d8d4ca" />
          </mesh>
          <mesh position={[0, 0.95, side * 1.27]}>
            <boxGeometry args={[9, 0.5, 0.02]} />
            <meshStandardMaterial color="#0e1013" emissive="#0e1013" />
          </mesh>
          <mesh position={[0, 0.16, side * 1.0]}>
            <boxGeometry args={[9.4, 0.32, 0.5]} />
            <meshStandardMaterial color="#2a4a8c" />
          </mesh>
          <mesh position={[0, 0.42, side * 1.18]}>
            <boxGeometry args={[9.4, 0.5, 0.12]} />
            <meshStandardMaterial color="#b23a48" />
          </mesh>
        </group>
      ))}
      {[-3.5, -1, 1.5, 4].map((x) => (
        <mesh key={x} position={[x, 0.8, 0]}>
          <cylinderGeometry args={[0.025, 0.025, 1.6, 8]} />
          <meshStandardMaterial color="#e8a317" metalness={0.6} roughness={0.3} />
        </mesh>
      ))}
      <group ref={lights}>
        {Array.from({ length: 8 }, (_, index) => (
          <mesh key={index} position={[-12 + index * 3, 0.95, -1.32]}>
            <boxGeometry args={[0.6, 0.06, 0.01]} />
            <meshBasicMaterial color="#ffd27a" />
          </mesh>
        ))}
      </group>
      <Passengers count={7} seated />
      <group position={[3.2, 0.22, -0.75]}>
        <Avatar look={look} anim="sit" />
      </group>
    </group>
  );
}

function Street({ mode, look }: { mode: TravelMode; look: Appearance }) {
  const scroll = useRef<Group>(null);
  const buildings = useMemo(
    () =>
      Array.from({ length: 16 }, (_, index) => ({
        x: -24 + index * 3.2,
        h: 2 + ((index * 37) % 5),
        colour: ["#b5523b", "#c9b49a", "#8a7b6a", "#d9cfc0", "#6b4a32", "#5c6b7a"][index % 6] ?? "#c9b49a",
      })),
    [],
  );
  const speed = mode === "walk" ? 2.2 : mode === "ride" ? 10 : 7;
  useFrame((_, delta) => {
    const group = scroll.current;
    if (!group) return;
    for (const child of group.children) {
      child.position.x -= delta * speed;
      if (child.position.x < -26) child.position.x += 51.2;
    }
  });
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}>
        <planeGeometry args={[60, 30]} />
        <meshStandardMaterial color="#4a4d52" />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, -3.2]}>
        <planeGeometry args={[60, 2]} />
        <meshStandardMaterial color="#a9a69f" />
      </mesh>
      <group ref={scroll}>
        {buildings.map((building, index) => (
          <group key={index} position={[building.x, 0, -5.5]}>
            <mesh position={[0, building.h / 2, 0]}>
              <boxGeometry args={[2.8, building.h, 2]} />
              <meshStandardMaterial color={building.colour} />
            </mesh>
            {Array.from({ length: Math.floor(building.h) }, (_, row) => (
              <mesh key={row} position={[0, 0.8 + row, 1.01]}>
                <planeGeometry args={[2, 0.4]} />
                <meshStandardMaterial color="#b8d4ea" emissive="#6f8fa8" emissiveIntensity={0.3} />
              </mesh>
            ))}
          </group>
        ))}
        {Array.from({ length: 12 }, (_, index) => (
          <mesh key={`dash-${index}`} position={[-24 + index * 4.27, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[1.4, 0.12]} />
            <meshBasicMaterial color="#f4f1ea" />
          </mesh>
        ))}
      </group>
      {mode === "bus" ? <Bus look={look} /> : null}
      {mode === "ride" ? <Cab look={look} /> : null}
      {mode === "walk" ? (
        <group position={[0, 0, -3]} rotation={[0, Math.PI / 2, 0]}>
          <Avatar look={look} anim="walk" />
        </group>
      ) : null}
    </group>
  );
}

function Bus({ look }: { look: Appearance }) {
  return (
    <group position={[0, 0, 0.6]}>
      <mesh position={[0, 1.25, 0]}>
        <boxGeometry args={[4.6, 2.2, 1.3]} />
        <meshStandardMaterial color="#c8102e" />
      </mesh>
      {[0.75, 1.75].map((y) => (
        <mesh key={y} position={[0, y, -0.66]}>
          <boxGeometry args={[4.2, 0.45, 0.02]} />
          <meshStandardMaterial color="#1a2430" emissive="#1a2430" />
        </mesh>
      ))}
      <mesh position={[0, 1.25, -0.67]}>
        <boxGeometry args={[4.4, 0.18, 0.02]} />
        <meshStandardMaterial color="#f4f1ea" />
      </mesh>
      {[-1.5, 1.5].map((x) => (
        <mesh key={x} position={[x, 0.2, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.28, 0.28, 1.36, 16]} />
          <meshStandardMaterial color="#1a1a1a" />
        </mesh>
      ))}
      <group position={[0.8, 1.42, -0.2]} rotation={[0, 0, 0]} scale={0.9}>
        <Avatar look={look} anim="sit" />
      </group>
    </group>
  );
}

function Cab({ look }: { look: Appearance }) {
  return (
    <group position={[0, 0, 0.6]}>
      <mesh position={[0, 0.55, 0]}>
        <boxGeometry args={[2.4, 0.7, 1.1]} />
        <meshStandardMaterial color="#141414" metalness={0.3} roughness={0.4} />
      </mesh>
      <mesh position={[0, 1.05, 0]}>
        <boxGeometry args={[1.6, 0.5, 1.0]} />
        <meshStandardMaterial color="#141414" metalness={0.3} roughness={0.4} />
      </mesh>
      <mesh position={[0, 1.05, -0.51]}>
        <boxGeometry args={[1.4, 0.35, 0.01]} />
        <meshStandardMaterial color="#1a2430" emissive="#1a2430" />
      </mesh>
      <mesh position={[0.2, 1.34, 0]}>
        <boxGeometry args={[0.35, 0.1, 0.2]} />
        <meshStandardMaterial color="#e8a317" emissive="#e8a317" emissiveIntensity={0.6} />
      </mesh>
      {[-0.8, 0.8].map((x) => (
        <mesh key={x} position={[x, 0.2, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.22, 0.22, 1.14, 16]} />
          <meshStandardMaterial color="#2a2a2a" />
        </mesh>
      ))}
      <group position={[-0.1, 0.6, 0]} scale={0.8}>
        <Avatar look={look} anim="sit" />
      </group>
    </group>
  );
}

function Rig({ view, mode }: { view: View; mode: TravelMode }) {
  const { camera } = useThree();
  const target = useMemo(() => new Vector3(), []);
  useFrame(() => {
    if (mode === "tube") {
      camera.position.lerp(target.set(view === "side" ? 0 : 4.6, 1.15, view === "side" ? 0.9 : 0.6), 0.08);
      camera.lookAt(view === "side" ? 0 : -3, 0.7, view === "side" ? -1 : 0);
      return;
    }
    if (view === "side") camera.position.lerp(target.set(0, 2.2, 9), 0.08);
    else if (view === "inside") camera.position.lerp(target.set(1.2, mode === "bus" ? 1.9 : 1.2, 0.7), 0.08);
    else camera.position.lerp(target.set(6.5, 3.6, 6), 0.08);
    camera.lookAt(view === "inside" ? -6 : 0, 1, view === "inside" ? 0.5 : 0);
  });
  return null;
}

export function RideScene() {
  const ride = useUi((state) => state.ride);
  const look = useGame((state) => state.appearance);
  const [view, setView] = useState<View>("chase");
  const [elapsed, setElapsed] = useState(0);
  const duration = ride ? Math.min(12, Math.max(4, ride.minutes)) : 0;
  const slogan = useMemo(() => {
    if (!ride) return "";
    const options = SLOGANS[ride.mode];
    return options[Math.floor(Math.random() * options.length)] ?? "";
  }, [ride]);

  useEffect(() => {
    if (!ride) return;
    setElapsed(0);
    const started = performance.now();
    const id = window.setInterval(() => {
      const seconds = (performance.now() - started) / 1000;
      setElapsed(seconds);
      if (seconds >= duration) arrive();
    }, 200);
    return () => window.clearInterval(id);
  }, [ride, duration]);

  if (!ride) return null;
  const venue = venuesById[ride.destination];
  const modeName = ride.mode === "tube" ? "Tube" : ride.mode === "bus" ? "Bus" : ride.mode === "ride" ? "Black cab" : "Walking";

  return (
    <div className="absolute inset-0 z-20 bg-[#0b1520]">
      <Canvas camera={{ position: [6, 3, 6], fov: 50 }} dpr={[1, 1.6]}>
        <color attach="background" args={[ride.mode === "tube" ? "#0b0d10" : "#9aafc2"]} />
        <ambientLight intensity={0.8} />
        <directionalLight position={[4, 8, 6]} intensity={1.1} />
        {ride.mode === "tube" ? <TubeCarriage look={look} /> : <Street mode={ride.mode} look={look} />}
        <Rig view={view} mode={ride.mode} />
      </Canvas>
      <div className="pointer-events-none absolute inset-x-0 top-16 flex justify-center">
        <div className="rounded-2xl bg-[#c8102e] px-4 py-2 text-center text-white shadow-xl">
          <p className="text-[10px] font-bold tracking-[0.2em] opacity-80">{modeName.toUpperCase()} TO</p>
          <p className="text-lg font-extrabold">
            {venue?.emoji} {venue?.name}
          </p>
        </div>
      </div>
      <div className="pointer-events-none absolute inset-x-0 top-36 flex justify-center">
        <p className="rounded-full bg-white/90 px-3 py-1 text-[11px] font-extrabold tracking-wider text-[#1b2838]">“{slogan}”</p>
      </div>
      <div className="absolute inset-x-3 bottom-4 mx-auto max-w-md rounded-3xl bg-white/95 p-3 text-[#1b2838] shadow-2xl">
        <div className="h-2 overflow-hidden rounded-full bg-[#ece7de]">
          <div className="h-full rounded-full bg-[#3ccf6e] transition-all" style={{ width: `${Math.min(100, (elapsed / duration) * 100)}%` }} />
        </div>
        <div className="mt-2 flex items-center gap-1.5">
          {(ride.mode === "tube" ? (["chase", "side"] as const) : (["chase", "side", "inside"] as const)).map((entry) => (
            <button
              key={entry}
              type="button"
              onClick={() => setView(entry)}
              className={`rounded-full px-3 py-1.5 text-[12px] font-bold ${view === entry ? "bg-[#1b2838] text-white" : "bg-[#f1ede6]"}`}
            >
              {entry === "chase" ? "Chase" : entry === "side" ? "Side" : "Inside"}
            </button>
          ))}
          <div className="flex-1" />
          <button type="button" onClick={arrive} className="rounded-full bg-[#c8102e] px-4 py-1.5 text-[12px] font-extrabold text-white">
            Skip ⏭
          </button>
        </div>
      </div>
    </div>
  );
}

function arrive(): void {
  const ui = useUi.getState();
  const ride = ui.ride;
  if (!ride) return;
  ui.setRide(null);
  ui.setNav("home");
  const game = useGame.getState();
  if (ride.mode === "walk") {
    game.addMoodlet({ id: "rain", label: "Got rained on", emoji: "🌧️", value: -10 }, 90);
  }
  if (ride.mode === "tube" && Math.random() < 0.3) ui.pushToast("Minor delays on the Jubilee line. Classic.");
  if (ride.destination === "home") {
    ui.pushToast("Home sweet box room", "good");
    return;
  }
  if (Math.random() < ARRIVAL_EVENT_CHANCE) {
    const event = pickEvent(events, ride.destination, game.appearance.origin !== "england", Math.random());
    if (event) {
      ui.setEvent(event.id);
      return;
    }
  }
  ui.pushToast(`Welcome to ${venuesById[ride.destination]?.name ?? "town"}`, "good");
}
