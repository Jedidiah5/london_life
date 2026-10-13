"use client";

import { Flag } from "@/components/Flag";
import { useFrame, useThree } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import type { Mesh } from "three";
import {
  DEFAULT_FINISHES,
  catalogueById,
  finishesById,
  goals,
  menusById,
  nationalitiesById,
  roomLayout,
  venuesById,
} from "@/lib/content";
import { crowdFor } from "@/lib/crowd";
import { itemWorld, tileWorld, worldToTile } from "@/lib/sim/grid";
import { nextGoal } from "@/lib/sim/goals";
import type { FinishKind, InventoryItem, SimAction } from "@/lib/sim/types";
import { useGame } from "@/lib/store/useGame";
import { usePresence } from "@/lib/store/usePresence";
import { useUi } from "@/lib/store/useUi";
import { useLondonTime } from "@/lib/useNow";
import { PlacementGhost } from "@/components/buy/PlacementGhost";
import { moveGhostTo } from "@/components/buy/placementActions";
import { Character, type Seat } from "./Character";
import { FurniturePiece } from "./Furniture";
import { shadeHex } from "./colour";
import { ScreenLabel } from "./ScreenLabel";

const KITCHEN_TILE_LIGHT = "#ece8e0";
const KITCHEN_TILE_DARK = "#9fb3bf";

const SEAT_MENUS: Record<string, { anim: SimAction["anim"]; y: number }> = {
  bed: { anim: "sleep", y: 0.2 },
  sofa: { anim: "sit", y: 0.2 },
  loo: { anim: "sit", y: 0.2 },
  shower: { anim: "shower", y: 0.02 },
};

function seatFor(
  action: SimAction | null,
  layout: ReturnType<typeof roomLayout>,
  inventory: InventoryItem[],
): Seat | null {
  if (!action?.target) return null;
  const fixture = layout.fixtures.find((entry) => entry.id === action.target);
  const owned = inventory.find((item) => item.id === action.target && item.placed);
  const itemId = fixture?.itemId ?? owned?.itemId;
  const item = itemId ? catalogueById[itemId] : undefined;
  const menu = fixture?.menu ?? item?.menu ?? null;
  const spec = menu ? SEAT_MENUS[menu] : undefined;
  const origin = fixture ?? owned;
  if (!spec || !item || !origin || spec.anim !== action.anim) return null;
  const [x, , z] = itemWorld(origin.x, origin.y, item.footprint, origin.rotation, layout.width, layout.height);
  return { x, y: spec.y, z, rotation: (origin.rotation * Math.PI) / 2 };
}

export function RoomScene() {
  const location = useGame((state) => state.location);
  const homeId = useGame((state) => state.homeId);
  const inventory = useGame((state) => state.inventory);
  const tile = useGame((state) => state.tile);
  const path = useGame((state) => state.path);
  const appearance = useGame((state) => state.appearance);
  const name = useGame((state) => state.name);
  const action = useGame((state) => state.action);
  const goalsDone = useGame((state) => state.goalsDone);
  const hour = useLondonTime().hour;
  const visit = useUi((state) => state.visit);
  const nav = useUi((state) => state.nav);
  const movingId = useUi((state) => state.movingId);
  const ghostShown = useUi((state) => state.ghost !== null);
  const here = usePresence((state) => state.here);
  const layout = roomLayout(location, homeId, visit?.homeId ?? null);
  const venue = visit ? undefined : venuesById[location];
  const atHome = location === "home" || Boolean(visit);
  const pieces = visit ? visit.items : atHome ? inventory.filter((item) => item.placed) : [];
  const look = visit?.appearance ?? appearance;
  const finishes = useGame((state) => state.finishes);
  const trying = useUi((state) => (state.nav === "buy" ? state.tryFinish : null));
  const myFinish = (kind: FinishKind) => {
    const preview = trying ? finishesById[trying] : undefined;
    if (preview?.kind === kind) return preview.colour;
    return finishesById[visit ? DEFAULT_FINISHES[kind] : finishes[kind]]?.colour;
  };
  const floor = atHome ? (myFinish("floor") ?? "#c4a574") : (venue?.floor ?? "#c4a574");
  const wall = atHome ? (myFinish("wall") ?? "#efe7da") : venue?.wall;
  const crowd = useMemo(
    () => (atHome ? [] : crowdFor(location, layout, hour * 60)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [atHome, location, hour, layout.id],
  );
  const kitchenTiles = useMemo(() => {
    const tiles = new Set<string>();
    if (!atHome) return tiles;
    for (const fixture of layout.fixtures) {
      if (!fixture.model.startsWith("kitchen")) continue;
      tiles.add(`${fixture.x},${fixture.y}`);
      tiles.add(`${fixture.x},${fixture.y - 1}`);
    }
    return tiles;
  }, [atHome, layout.fixtures]);
  const goal = nextGoal(goals, goalsDone);
  const highlight = atHome && !visit ? goal?.highlight : undefined;
  const seat = seatFor(action, layout, inventory);
  const flag = appearance.origin;

  const tap = (target: string) => {
    if (visit) return;
    if (useUi.getState().nav === "buy") return;
    const blocked = useGame.getState().canQueue();
    if (blocked) {
      useUi.getState().pushToast(blocked);
      return;
    }
    useUi.getState().openSheet(target);
  };

  return (
    <group>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        onClick={(event) => {
          event.stopPropagation();
          if (visit) return;
          const next = worldToTile(event.point.x, event.point.z, layout.width, layout.height);
          if (nav === "buy") {
            moveGhostTo(next);
            return;
          }
          useUi.getState().openSheet(null);
          const note = useGame.getState().walkTo(next);
          if (note) useUi.getState().pushToast(note);
        }}
      >
        <planeGeometry args={[layout.width, layout.height]} />
        <meshStandardMaterial color={floor} />
      </mesh>
      {Array.from({ length: layout.width * layout.height }, (_, index) => {
        const x = index % layout.width;
        const y = Math.floor(index / layout.width);
        const [wx, , wz] = tileWorld(x, y, layout.width, layout.height);
        const even = (x + y) % 2 === 0;
        const colour = kitchenTiles.has(`${x},${y}`)
          ? even
            ? KITCHEN_TILE_LIGHT
            : KITCHEN_TILE_DARK
          : even
            ? shadeHex(floor, 0.05)
            : shadeHex(floor, -0.02);
        return (
          <mesh
            key={`${x}-${y}`}
            position={[wx, 0.01, wz]}
            rotation={[-Math.PI / 2, 0, 0]}
            raycast={() => null}
            receiveShadow
          >
            <planeGeometry args={[0.97, 0.97]} />
            <meshStandardMaterial color={colour} />
          </mesh>
        );
      })}
      {wall ? (
        <>
          <Walls width={layout.width} height={layout.height} colour={wall} />
          <Street width={layout.width} height={layout.height} />
        </>
      ) : (
        <ParkEdge width={layout.width} height={layout.height} />
      )}
      {layout.fixtures.map((fixture) => {
        const item = catalogueById[fixture.itemId];
        const footprint = item?.footprint ?? [1, 1];
        const [fx, , fz] = itemWorld(fixture.x, fixture.y, footprint, fixture.rotation, layout.width, layout.height);
        const menu = fixture.menu ? menusById[fixture.menu] : undefined;
        return (
          <group key={fixture.id}>
            <FurniturePiece
              itemId={fixture.itemId}
              model={fixture.model}
              x={fixture.x}
              y={fixture.y}
              rotation={fixture.rotation}
              roomWidth={layout.width}
              roomHeight={layout.height}
              onClick={menu ? () => tap(fixture.id) : undefined}
            />
            {menu ? (
              <ScreenLabel position={[fx, 1.7, fz]}>
                <button
                  type="button"
                  onClick={() => tap(fixture.id)}
                  className={`items-center gap-1 whitespace-nowrap rounded-full bg-white/95 px-2 py-1 text-[11px] font-semibold text-[#1b2838] shadow-md ${
                    highlight === fixture.id ? "animate-bounce ring-2 ring-[#e8a317]" : ""
                  } ${!atHome || highlight === fixture.id ? "flex" : "hidden"}`}
                >
                  <span className="text-sm">{fixture.emoji ?? menu.emoji}</span>
                  {atHome ? "Tap me" : (fixture.label ?? menu.title)}
                </button>
              </ScreenLabel>
            ) : null}
          </group>
        );
      })}
      {pieces
        .filter((item) => !(movingId === item.id && ghostShown))
        .map((item) => (
          <FurniturePiece
            key={item.id}
            itemId={item.itemId}
            x={item.x}
            y={item.y}
            rotation={item.rotation}
            colour={item.colour}
            roomWidth={layout.width}
            roomHeight={layout.height}
            onClick={() => {
              if (visit) return;
              if (useUi.getState().nav === "buy") {
                const ui = useUi.getState();
                ui.setMoving(item.id);
                ui.setGhost({
                  itemId: item.itemId,
                  x: item.x,
                  y: item.y,
                  rotation: item.rotation,
                  colour: item.colour,
                });
                return;
              }
              if (catalogueById[item.itemId]?.menu) tap(item.id);
            }}
          />
        ))}
      <PlacementGhost roomWidth={layout.width} roomHeight={layout.height} />
      <Character
        look={look}
        tile={visit ? { x: 2, y: 2 } : tile}
        path={visit ? [] : path}
        roomWidth={layout.width}
        roomHeight={layout.height}
        walkingEnabled={!visit}
        anim={visit ? "stand" : (action?.anim ?? "stand")}
        seat={visit ? null : seat}
        self={!visit}
      />
      <SelfTag
        x={visit ? 2 : tile.x}
        y={visit ? 2 : tile.y}
        width={layout.width}
        height={layout.height}
        name={visit ? visit.name : name}
        flag={visit ? "" : flag}
        action={visit ? null : action}
        moving={!visit && path.length > 0}
      />
      {crowd.map((member, index) => {
        const [x, , z] = tileWorld(member.tile.x, member.tile.y, layout.width, layout.height);
        return (
          <group
            key={member.local.id}
            onClick={(event) => {
              event.stopPropagation();
              useUi.getState().openPerson({ kind: "local", id: member.local.id });
            }}
          >
            <Character
              look={member.local.look}
              tile={member.tile}
              path={[]}
              roomWidth={layout.width}
              roomHeight={layout.height}
              walkingEnabled={false}
              anim={member.anim}
              facing={member.facing}
              seed={index * 1.7}
            />
            <mesh position={[x, 0.4, z]}>
              <boxGeometry args={[0.45, 0.8, 0.45]} />
              <meshBasicMaterial transparent opacity={0} depthWrite={false} />
            </mesh>
            <ScreenLabel position={[x, 1.4, z]}>
              <button
                type="button"
                onClick={() => useUi.getState().openPerson({ kind: "local", id: member.local.id })}
                className="flex items-center gap-1 whitespace-nowrap rounded-full bg-[#1b2838]/85 px-2 py-0.5 text-[10px] font-semibold text-white"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-[#9aa5b1]" />
                <Flag origin={member.local.origin} /> {member.local.name}
              </button>
            </ScreenLabel>
          </group>
        );
      })}
      {here.map((player) => {
        const [x, , z] = tileWorld(player.x, player.y, layout.width, layout.height);
        const nation = nationalitiesById[player.appearance.origin];
        return (
          <group
            key={player.simId}
            onClick={(event) => {
              event.stopPropagation();
              useUi.getState().openPerson({ kind: "player", id: player.simId });
            }}
          >
            <Character
              look={player.appearance}
              tile={{ x: player.x, y: player.y }}
              path={[]}
              roomWidth={layout.width}
              roomHeight={layout.height}
              walkingEnabled={false}
            />
            <ScreenLabel position={[x, 1.4, z]}>
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => useUi.getState().openPerson({ kind: "player", id: player.simId })}
                  className="flex items-center gap-1 whitespace-nowrap rounded-full bg-[#1b2838]/85 px-2 py-0.5 text-[10px] font-semibold text-white"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-[#3ccf6e]" />
                  {nation ? <Flag origin={nation.id} /> : null} {player.name}
                </button>
                {player.emote && player.emoteUntil > Date.now() ? (
                  <div className="mt-1 rounded-xl bg-white px-2 py-1 text-[10px] text-[#1b2838] shadow">
                    {player.emote}
                  </div>
                ) : null}
              </div>
            </ScreenLabel>
          </group>
        );
      })}
    </group>
  );
}

function SelfTag({
  x,
  y,
  width,
  height,
  name,
  flag,
  action,
  moving,
}: {
  x: number;
  y: number;
  width: number;
  height: number;
  name: string;
  flag: string;
  action: SimAction | null;
  moving: boolean;
}) {
  const [wx, , wz] = tileWorld(x, y, width, height);
  const done = action ? 1 - action.remainingMinutes / action.totalMinutes : 0;
  return (
    <ScreenLabel position={[wx, 1.45, wz]}>
      <div className={`pointer-events-none flex-col items-center gap-1 ${moving ? "hidden" : "flex"}`}>
        {action ? (
          <div className="relative flex flex-col items-center gap-1 rounded-2xl bg-white px-2.5 pb-1.5 pt-1 shadow-md">
            <span className="text-xl leading-none">{action.emoji}</span>
            <span className="h-1 w-9 overflow-hidden rounded-full bg-[#e5e1d8]">
              <span
                className="block h-full rounded-full bg-[#3ccf6e]"
                style={{ width: `${Math.round(done * 100)}%` }}
              />
            </span>
            <span className="absolute -bottom-1 left-1/2 h-2.5 w-2.5 -translate-x-1/2 rotate-45 bg-white" />
          </div>
        ) : null}
        <div className="flex items-center gap-1 whitespace-nowrap rounded-full bg-[#1b2838]/85 px-2 py-0.5 text-[10px] font-semibold text-white">
          <span className="h-1.5 w-1.5 rounded-full bg-[#3ccf6e]" />
          {flag ? <Flag origin={flag} /> : null} {name}
        </div>
      </div>
    </ScreenLabel>
  );
}

const WALL_HEIGHT = 1.6;
const WALL_LOW = 0.32;
const WALL_THICK = 0.14;

function Walls({ width, height, colour }: { width: number; height: number; colour: string }) {
  const halfW = width / 2;
  const halfH = height / 2;
  const sides = [
    {
      key: "back",
      normal: [0, -1],
      position: [0, -halfH - WALL_THICK / 2],
      size: [width + WALL_THICK * 2, WALL_THICK],
      window: true,
    },
    {
      key: "front",
      normal: [0, 1],
      position: [0, halfH + WALL_THICK / 2],
      size: [width + WALL_THICK * 2, WALL_THICK],
      window: false,
    },
    {
      key: "left",
      normal: [-1, 0],
      position: [-halfW - WALL_THICK / 2, 0],
      size: [WALL_THICK, height],
      window: false,
    },
    {
      key: "right",
      normal: [1, 0],
      position: [halfW + WALL_THICK / 2, 0],
      size: [WALL_THICK, height],
      window: true,
    },
  ] as const;
  return (
    <group>
      {sides.map((side, index) => (
        <WallSide
          key={side.key}
          normal={side.normal}
          position={side.position}
          size={side.size}
          colour={index % 2 === 0 ? colour : shadeHex(colour, -0.06)}
          window={side.window}
        />
      ))}
    </group>
  );
}

function WallSide({
  normal,
  position,
  size,
  colour,
  window: hasWindow,
}: {
  normal: readonly [number, number];
  position: readonly [number, number];
  size: readonly [number, number];
  colour: string;
  window: boolean;
}) {
  const body = useRef<Mesh>(null);
  const cap = useRef<Mesh>(null);
  const pane = useRef<Mesh>(null);
  const current = useRef(WALL_HEIGHT);
  const camera = useThree((state) => state.camera);

  useFrame((_, delta) => {
    const facing = camera.position.x * normal[0] + camera.position.z * normal[1];
    const reach = Math.hypot(camera.position.x, camera.position.z);
    const target = facing > reach * 0.25 ? WALL_LOW : WALL_HEIGHT;
    current.current += (target - current.current) * (1 - Math.exp(-delta * 10));
    const h = current.current;
    if (body.current) {
      body.current.scale.y = h;
      body.current.position.y = h / 2;
    }
    if (cap.current) cap.current.position.y = h + 0.02;
    if (pane.current) pane.current.visible = h > WALL_HEIGHT * 0.8;
  });

  const along = size[0] > size[1];
  const paneWidth = Math.min(1.6, (along ? size[0] : size[1]) * 0.3);
  return (
    <group position={[position[0], 0, position[1]]}>
      <mesh ref={body} raycast={() => null} receiveShadow>
        <boxGeometry args={[size[0], 1, size[1]]} />
        <meshStandardMaterial color={colour} />
      </mesh>
      <mesh ref={cap} raycast={() => null}>
        <boxGeometry args={[size[0] + 0.02, 0.04, size[1] + 0.02]} />
        <meshStandardMaterial color="#efe9de" />
      </mesh>
      <mesh position={[-normal[0] * 0.075, 0.06, -normal[1] * 0.075]} raycast={() => null}>
        <boxGeometry args={[along ? size[0] - 0.3 : 0.02, 0.12, along ? 0.02 : size[1]]} />
        <meshStandardMaterial color={shadeHex(colour, -0.25)} />
      </mesh>
      {hasWindow ? (
        <mesh ref={pane} position={[-normal[0] * 0.08, 0.95, -normal[1] * 0.08]} raycast={() => null}>
          <boxGeometry args={[along ? paneWidth : 0.02, 0.6, along ? 0.02 : paneWidth]} />
          <meshStandardMaterial color="#b8d4ea" emissive="#6f8fa8" emissiveIntensity={0.25} />
        </mesh>
      ) : null}
    </group>
  );
}

function Street({ width, height }: { width: number; height: number }) {
  const halfW = width / 2;
  const halfH = height / 2;
  const roadZ = halfH + 2.4;
  const lamps: [number, number][] = [
    [-halfW - 0.8, -halfH - 0.6],
    [-halfW - 2, roadZ + 1.6],
    [halfW + 3, roadZ + 1.6],
  ];
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} raycast={() => null}>
        <planeGeometry args={[width + 30, height + 30]} />
        <meshStandardMaterial color="#a9a69f" />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.015, roadZ]} raycast={() => null}>
        <planeGeometry args={[width + 30, 2.6]} />
        <meshStandardMaterial color="#4c5056" />
      </mesh>
      {Array.from({ length: 12 }, (_, index) => (
        <mesh
          key={index}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[-15 + index * 2.6, -0.01, roadZ]}
          raycast={() => null}
        >
          <planeGeometry args={[1.1, 0.1]} />
          <meshStandardMaterial color="#f2efe6" />
        </mesh>
      ))}
      <mesh position={[0, 0.06, roadZ - 1.35]} raycast={() => null}>
        <boxGeometry args={[width + 30, 0.12, 0.12]} />
        <meshStandardMaterial color="#d6d2c8" />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-halfW - 3.2, -0.012, -1]} raycast={() => null}>
        <planeGeometry args={[4, height + 6]} />
        <meshStandardMaterial color="#6f8f55" />
      </mesh>
      <mesh position={[-halfW - 1.4, 0.3, -1]} raycast={() => null}>
        <boxGeometry args={[0.5, 0.6, height + 4]} />
        <meshStandardMaterial color="#3f6b38" />
      </mesh>
      {lamps.map(([x, z]) => (
        <group key={`${x}-${z}`} position={[x, 0, z]}>
          <mesh position={[0, 1.1, 0]} raycast={() => null}>
            <cylinderGeometry args={[0.04, 0.05, 2.2, 8]} />
            <meshStandardMaterial color="#2a2f36" />
          </mesh>
          <mesh position={[0, 2.25, 0]} raycast={() => null}>
            <sphereGeometry args={[0.12, 10, 8]} />
            <meshStandardMaterial color="#ffe2a8" emissive="#ffc35a" emissiveIntensity={0.8} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function ParkEdge({ width, height }: { width: number; height: number }) {
  const trees: [number, number][] = [];
  for (let x = -1; x <= width; x += 2) trees.push([x, -1]);
  for (let y = 1; y < height; y += 2) trees.push([-1, y]);
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} raycast={() => null}>
        <planeGeometry args={[width + 6, height + 6]} />
        <meshStandardMaterial color="#4f7d40" />
      </mesh>
      {trees.map(([x, y]) => {
        const [wx, , wz] = tileWorld(x, y, width, height);
        return (
          <group key={`${x}-${y}`} position={[wx, 0, wz]}>
            <mesh position={[0, 0.3, 0]} raycast={() => null}>
              <cylinderGeometry args={[0.06, 0.08, 0.6, 8]} />
              <meshStandardMaterial color="#6b4a32" />
            </mesh>
            <mesh position={[0, 0.85, 0]} raycast={() => null}>
              <sphereGeometry args={[0.42, 12, 10]} />
              <meshStandardMaterial color="#3f7a3a" />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}
