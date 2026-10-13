"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import { Vector3 } from "three";
import { events, venuesById } from "@/lib/content";
import { ARRIVAL_EVENT_CHANCE } from "@/lib/sim/constants";
import { pickEvent } from "@/lib/sim/events";
import type { TravelMode } from "@/lib/sim/types";
import { useGame } from "@/lib/store/useGame";
import { useUi } from "@/lib/store/useUi";
import { BUS_PLAYER_SEAT } from "./ride/Bus";
import { LANE_Z, PAVEMENT_Z, Street } from "./ride/Street";
import { hashOf } from "./ride/textures";
import { TUBE_PLAYER_SEAT, TubeCarriage } from "./ride/Tube";

type View = "chase" | "side" | "inside";
type Vec = [number, number, number];

const LINES = [
  { name: "Northern", colour: "#1a1a1a", ink: "#1a1a1a" },
  { name: "Victoria", colour: "#0098d4", ink: "#0077a8" },
  { name: "Central", colour: "#e32017", ink: "#c41a12" },
  { name: "Jubilee", colour: "#a0a5a9", ink: "#5f666b" },
  { name: "Piccadilly", colour: "#003688", ink: "#003688" },
  { name: "District", colour: "#00782a", ink: "#00782a" },
  { name: "Bakerloo", colour: "#b36305", ink: "#9a5404" },
];
const ROUTES = ["73", "38", "12", "159", "25", "88", "149", "176", "24", "390"];
const STOPS = [
  "Oval Square",
  "Elephant & Cattle",
  "Bank Holiday",
  "Angel Delight",
  "Kings Crossing",
  "Swiss Cottage Pie",
];
const SPEED: Record<TravelMode, number> = { tube: 0, bus: 5, ride: 7, walk: 1.1 };
const VIEWS: Record<TravelMode, { view: View; label: string }[]> = {
  tube: [
    { view: "chase", label: "Carriage" },
    { view: "side", label: "Your seat" },
  ],
  bus: [
    { view: "chase", label: "Chase" },
    { view: "side", label: "Side" },
    { view: "inside", label: "Top deck" },
  ],
  ride: [
    { view: "chase", label: "Chase" },
    { view: "side", label: "Side" },
    { view: "inside", label: "Back seat" },
  ],
  walk: [
    { view: "chase", label: "Chase" },
    { view: "side", label: "Side" },
  ],
};

type Line = (typeof LINES)[number];
const FALLBACK_LINE: Line = { name: "Northern", colour: "#1a1a1a", ink: "#1a1a1a" };

export function lineFor(destination: string): Line {
  return LINES[hashOf(destination) % LINES.length] ?? FALLBACK_LINE;
}

function routeFor(destination: string): string {
  return ROUTES[hashOf(`bus-${destination}`) % ROUTES.length] ?? "73";
}

function announcements(mode: TravelMode, line: string, route: string, destination: string): string[] {
  if (mode === "tube") {
    return [
      `This is a ${line} line train to ${destination}`,
      "Please mind the gap between the train and the platform",
      "Please move right down inside the carriage",
      "See it. Say it. Sorted.",
    ];
  }
  if (mode === "bus") {
    return [
      `${route} to ${destination}`,
      `The next stop is ${destination}`,
      "Please hold on, the bus is about to move",
      "Move down inside please",
    ];
  }
  if (mode === "ride")
    return ["The Knowledge, since 1865", "Cash or card, guv?", "I don't go south of the river after six"];
  return ["It's only spitting", "Quicker to walk, honestly", "Twenty minutes, tops"];
}

function shot(mode: TravelMode, view: View): { eye: Vec; look: Vec } {
  if (mode === "tube") {
    const x = TUBE_PLAYER_SEAT.x;
    return view === "side"
      ? { eye: [x + 0.2, 0.82, 0.3], look: [x, 0.55, -0.8] }
      : { eye: [5.5, 0.95, 0.05], look: [-6, 0.55, 0] };
  }
  if (mode === "bus") {
    if (view === "side") return { eye: [0.3, 1.8, 8.5], look: [0.3, 1.35, LANE_Z] };
    if (view === "inside") {
      return { eye: [BUS_PLAYER_SEAT[0] - 0.55, 2.02, LANE_Z + 0.1], look: [10, 1.45, LANE_Z + 0.2] };
    }
    return { eye: [9.5, 4.0, 6.0], look: [0, 1.3, LANE_Z] };
  }
  if (mode === "ride") {
    if (view === "side") return { eye: [0, 1.0, 5.2], look: [0, 0.6, LANE_Z] };
    if (view === "inside") return { eye: [-0.95, 0.98, LANE_Z + 0.12], look: [6, 0.82, LANE_Z] };
    return { eye: [5.2, 2.4, 4.2], look: [0, 0.6, LANE_Z] };
  }
  if (view === "side") return { eye: [0, 1.2, 2.6], look: [0, 0.75, PAVEMENT_Z] };
  return { eye: [4.5, 2.2, 1.6], look: [0, 0.75, PAVEMENT_Z] };
}

function Rig({ view, mode }: { view: View; mode: TravelMode }) {
  const camera = useThree((state) => state.camera);
  const eye = useMemo(() => new Vector3(), []);
  const focus = useMemo(() => new Vector3(), []);
  const looking = useRef<Vector3 | null>(null);
  useFrame((_, delta) => {
    const target = shot(mode, view);
    eye.set(...target.eye);
    focus.set(...target.look);
    if (!looking.current) {
      camera.position.copy(eye);
      looking.current = focus.clone();
    }
    const ease = 1 - Math.exp(-Math.min(delta, 0.1) * 5);
    camera.position.lerp(eye, ease);
    looking.current.lerp(focus, ease);
    camera.lookAt(looking.current);
  });
  return null;
}

function Lights({ mode }: { mode: TravelMode }) {
  if (mode === "tube") {
    return (
      <>
        <color attach="background" args={["#050607"]} />
        <ambientLight intensity={0.35} />
        <hemisphereLight args={["#fffaf0", "#3a3d42", 1.1]} />
        {[-4, 0, 4].map((x) => (
          <pointLight key={x} position={[x, 1.25, 0]} intensity={1.6} distance={5} decay={1.5} color="#fff6e6" />
        ))}
      </>
    );
  }
  return (
    <>
      <color attach="background" args={["#c5d0d9"]} />
      <fog attach="fog" args={["#c5d0d9", 22, 50]} />
      <hemisphereLight args={["#e6edf3", "#5a5650", 0.95]} />
      <ambientLight intensity={0.2} />
      <directionalLight
        position={[8, 14, 10]}
        intensity={1.5}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-20}
        shadow-camera-right={20}
        shadow-camera-top={14}
        shadow-camera-bottom={-14}
        shadow-camera-near={1}
        shadow-camera-far={50}
        shadow-bias={-0.0005}
      />
    </>
  );
}

function Header({ mode, name, emoji }: { mode: TravelMode; name: string; emoji: string }) {
  if (mode === "tube") {
    const line = lineFor(name);
    return (
      <div className="overflow-hidden rounded-xl bg-white text-center shadow-xl">
        <div className="h-2" style={{ background: line.colour }} />
        <div className="px-5 py-2">
          <p className="text-[10px] font-extrabold tracking-[0.2em]" style={{ color: line.ink }}>
            {line.name.toUpperCase()} LINE
          </p>
          <p className="text-lg font-extrabold text-[#1b2838]">towards {name}</p>
        </div>
      </div>
    );
  }
  if (mode === "bus") {
    return (
      <div className="flex items-center gap-3 rounded-xl bg-[#0a0a0a] px-4 py-2 font-mono text-[#ffb21a] shadow-xl ring-4 ring-[#cf1820]">
        <span className="text-3xl font-black leading-none">{routeFor(name)}</span>
        <span className="text-lg font-bold leading-tight">{name}</span>
      </div>
    );
  }
  if (mode === "ride") {
    return (
      <div className="flex items-center gap-3 rounded-xl bg-[#111214] px-4 py-2 text-white shadow-xl">
        <span className="rounded bg-[#ffcf33] px-1.5 py-0.5 text-[11px] font-black text-[#111]">TAXI</span>
        <span className="text-lg font-extrabold">
          {emoji} {name}
        </span>
      </div>
    );
  }
  return (
    <div className="rounded-xl bg-white px-4 py-2 text-center text-[#1b2838] shadow-xl">
      <p className="text-[10px] font-bold tracking-[0.2em] opacity-60">WALKING TO</p>
      <p className="text-lg font-extrabold">
        {emoji} {name}
      </p>
    </div>
  );
}

export function RideScene() {
  const ride = useUi((state) => state.ride);
  const look = useGame((state) => state.appearance);
  const [view, setView] = useState<View>("chase");
  const [elapsed, setElapsed] = useState(0);
  const duration = ride ? Math.min(12, Math.max(4, ride.minutes)) : 0;
  const venue = ride ? venuesById[ride.destination] : undefined;
  const name = venue?.name ?? "Home";
  const line = lineFor(name);
  const route = routeFor(name);
  const stations = useMemo(() => {
    const start = hashOf(name) % STOPS.length;
    return [...Array.from({ length: 5 }, (_, index) => STOPS[(start + index) % STOPS.length] ?? ""), name];
  }, [name]);
  const announcement = useMemo(() => {
    if (!ride) return "";
    const options = announcements(ride.mode, line.name, route, name);
    return options[Math.floor(Math.random() * options.length)] ?? "";
  }, [ride, line.name, route, name]);

  useEffect(() => {
    if (!ride) return;
    setElapsed(0);
    setView("chase");
    const started = performance.now();
    const id = window.setInterval(() => {
      const seconds = (performance.now() - started) / 1000;
      setElapsed(seconds);
      if (seconds >= duration) arrive();
    }, 200);
    return () => window.clearInterval(id);
  }, [ride, duration]);

  if (!ride) return null;
  const progress = Math.min(1, elapsed / duration);
  const remaining = Math.max(1, Math.ceil(ride.minutes * (1 - progress)));
  const accent =
    ride.mode === "tube" ? line.colour : ride.mode === "bus" ? "#cf1820" : ride.mode === "ride" ? "#111214" : "#3ccf6e";
  const nextLabel = ride.mode === "tube" ? "Next station" : ride.mode === "bus" ? "Next stop" : "Heading to";

  return (
    <div className="absolute inset-0 z-20 bg-[#0b1520]">
      <Canvas shadows={ride.mode !== "tube"} camera={{ position: [6, 3, 6], fov: 50, near: 0.05 }} dpr={[1, 1.6]}>
        <Lights mode={ride.mode} />
        {ride.mode === "tube" ? (
          <TubeCarriage look={look} line={line} destination={name} stations={stations} />
        ) : (
          <Street mode={ride.mode} look={look} speed={SPEED[ride.mode]} route={route} destination={name} />
        )}
        <Rig view={view} mode={ride.mode} />
      </Canvas>
      <div className="pointer-events-none absolute inset-x-0 top-16 flex justify-center">
        <Header mode={ride.mode} name={name} emoji={venue?.emoji ?? "🏠"} />
      </div>
      <div className="pointer-events-none absolute inset-x-0 top-[8.5rem] flex justify-center px-6">
        <p className="rounded-full bg-white/90 px-3 py-1 text-center text-[11px] font-bold text-[#1b2838] shadow">
          🔊 {announcement}
        </p>
      </div>
      <div className="absolute inset-x-3 bottom-4 mx-auto max-w-md rounded-3xl bg-white/95 p-3 text-[#1b2838] shadow-2xl">
        <div className="flex items-baseline justify-between text-[11px]">
          <span className="font-semibold text-[#5c6b7a]">
            {nextLabel}: <span className="font-extrabold text-[#1b2838]">{name}</span>
          </span>
          <span className="font-bold text-[#5c6b7a]">{remaining} min</span>
        </div>
        <div className="relative mt-2 h-3">
          <div className="absolute inset-x-1 top-[3px] h-1.5 rounded-full bg-[#ece7de]" />
          <div
            className="absolute left-1 top-[3px] h-1.5 rounded-full transition-all"
            style={{ width: `calc(${progress * 100}% - 0.5rem)`, background: accent }}
          />
          {[0, 1 / 3, 2 / 3, 1].map((stop) => (
            <span
              key={stop}
              className="absolute top-0 h-3 w-3 -translate-x-1/2 rounded-full border-2 bg-white"
              style={{
                left: `calc(0.25rem + ${stop} * (100% - 0.5rem))`,
                borderColor: progress >= stop ? accent : "#d5cfc4",
              }}
            />
          ))}
        </div>
        <div className="mt-2 flex items-center gap-1.5">
          {VIEWS[ride.mode].map((entry) => (
            <button
              key={entry.view}
              type="button"
              onClick={() => setView(entry.view)}
              className={`rounded-full px-3 py-1.5 text-[12px] font-bold ${view === entry.view ? "bg-[#1b2838] text-white" : "bg-[#f1ede6]"}`}
            >
              {entry.label}
            </button>
          ))}
          <div className="flex-1" />
          <button
            type="button"
            onClick={arrive}
            className="rounded-full bg-[#c8102e] px-4 py-1.5 text-[12px] font-extrabold text-white"
          >
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
  if (ride.mode === "tube" && Math.random() < 0.3) {
    const name = venuesById[ride.destination]?.name ?? "Home";
    ui.pushToast(`Minor delays on the ${lineFor(name).name} line. Classic.`);
  }
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
