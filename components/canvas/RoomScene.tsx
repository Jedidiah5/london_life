"use client";

import { Flag } from "@/components/Flag";
import { Html } from "@react-three/drei";
import { useMemo } from "react";
import { catalogueById, goals, menusById, nationalitiesById, roomLayout, venuesById } from "@/lib/content";
import { crowdFor } from "@/lib/crowd";
import { itemWorld, tileWorld, worldToTile } from "@/lib/sim/grid";
import { nextGoal } from "@/lib/sim/goals";
import type { InventoryItem, SimAction } from "@/lib/sim/types";
import { useGame } from "@/lib/store/useGame";
import { usePresence } from "@/lib/store/usePresence";
import { useUi } from "@/lib/store/useUi";
import { PlacementGhost } from "@/components/buy/PlacementGhost";
import { Character, type Seat } from "./Character";
import { FurniturePiece } from "./Furniture";
import { shadeHex } from "./colour";

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
  const hour = useGame((state) => Math.floor(state.gameMinutes / 60));
  const visit = useUi((state) => state.visit);
  const nav = useUi((state) => state.nav);
  const here = usePresence((state) => state.here);
  const layout = roomLayout(location, homeId, visit?.homeId ?? null);
  const venue = visit ? undefined : venuesById[location];
  const atHome = location === "home" || Boolean(visit);
  const pieces = visit ? visit.items : inventory.filter((item) => item.placed);
  const look = visit?.appearance ?? appearance;
  const floor = atHome ? "#c4a574" : (venue?.floor ?? "#c4a574");
  const wall = atHome ? "#efe7da" : venue?.wall;
  const crowd = useMemo(
    () => (atHome ? [] : crowdFor(location, layout, hour * 60)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [atHome, location, hour, layout.id],
  );
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
            const ui = useUi.getState();
            const moving = ui.movingId ? useGame.getState().inventory.find((item) => item.id === ui.movingId) : null;
            const id = ui.selectedCatalogueId ?? moving?.itemId;
            if (!id) return;
            ui.setGhost({
              itemId: id,
              x: next.x,
              y: next.y,
              rotation: ui.ghost?.rotation ?? 0,
              colour: ui.ghost?.colour ?? moving?.colour ?? "#f4f1ea",
            });
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
        return (
          <mesh key={`${x}-${y}`} position={[wx, 0.01, wz]} rotation={[-Math.PI / 2, 0, 0]} raycast={() => null}>
            <planeGeometry args={[0.97, 0.97]} />
            <meshStandardMaterial color={(x + y) % 2 === 0 ? shadeHex(floor, 0.05) : shadeHex(floor, -0.02)} />
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
            {menu && (!atHome || highlight === fixture.id) ? (
              <Html position={[fx, 1.15, fz]} center zIndexRange={[8, 0]}>
                <button
                  type="button"
                  onClick={() => tap(fixture.id)}
                  className={`flex items-center gap-1 whitespace-nowrap rounded-full bg-white/95 px-2 py-1 text-[11px] font-semibold text-[#1b2838] shadow-md ${
                    highlight === fixture.id ? "animate-bounce ring-2 ring-[#e8a317]" : ""
                  }`}
                >
                  <span className="text-sm">{fixture.emoji ?? menu.emoji}</span>
                  {atHome ? "Tap me" : (fixture.label ?? menu.title)}
                </button>
              </Html>
            ) : null}
          </group>
        );
      })}
      {pieces.map((item) => (
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
              useUi.getState().setMoving(item.id);
              useUi.getState().pushToast("Tap a tile to move it, or sell it");
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
        const nation = nationalitiesById[member.local.origin];
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
            <Html position={[x, 1.05, z]} center zIndexRange={[8, 0]}>
              <button
                type="button"
                onClick={() => useUi.getState().openPerson({ kind: "local", id: member.local.id })}
                className="flex items-center gap-1 whitespace-nowrap rounded-full bg-[#1b2838]/85 px-2 py-0.5 text-[10px] font-semibold text-white"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-[#9aa5b1]" />
                <Flag origin={member.local.origin} /> {member.local.name}
              </button>
            </Html>
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
            <Html position={[x, 1.05, z]} center zIndexRange={[8, 0]}>
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
                  <div className="mt-1 rounded-xl bg-white px-2 py-1 text-[10px] text-[#1b2838] shadow">{player.emote}</div>
                ) : null}
              </div>
            </Html>
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
  if (moving) return null;
  return (
    <Html position={[wx, 1.1, wz]} center zIndexRange={[8, 0]}>
      <div className="pointer-events-none flex flex-col items-center gap-1">
        {action ? (
          <div className="flex items-center gap-1.5 rounded-full bg-white px-2 py-1 text-[11px] font-semibold text-[#1b2838] shadow-md">
            <span className="text-sm">{action.emoji}</span>
            <span className="h-1.5 w-12 overflow-hidden rounded-full bg-[#e5e1d8]">
              <span className="block h-full rounded-full bg-[#3ccf6e]" style={{ width: `${Math.round(done * 100)}%` }} />
            </span>
          </div>
        ) : null}
        <div className="flex items-center gap-1 whitespace-nowrap rounded-full bg-[#1b2838]/85 px-2 py-0.5 text-[10px] font-semibold text-white">
          <span className="h-1.5 w-1.5 rounded-full bg-[#3ccf6e]" />
          {flag ? <Flag origin={flag} /> : null} {name}
        </div>
      </div>
    </Html>
  );
}

function Walls({ width, height, colour }: { width: number; height: number; colour: string }) {
  const halfW = width / 2;
  const halfH = height / 2;
  return (
    <group>
      <mesh position={[0, 0.7, -halfH - 0.06]} raycast={() => null}>
        <boxGeometry args={[width + 0.12, 1.4, 0.12]} />
        <meshStandardMaterial color={colour} />
      </mesh>
      <mesh position={[-halfW - 0.06, 0.7, 0]} raycast={() => null}>
        <boxGeometry args={[0.12, 1.4, height]} />
        <meshStandardMaterial color={shadeHex(colour, -0.05)} />
      </mesh>
      <mesh position={[0, 0.05, -halfH + 0.01]} raycast={() => null}>
        <boxGeometry args={[width, 0.1, 0.04]} />
        <meshStandardMaterial color={shadeHex(colour, -0.2)} />
      </mesh>
      <mesh position={[-halfW + 0.01, 0.05, 0]} raycast={() => null}>
        <boxGeometry args={[0.04, 0.1, height]} />
        <meshStandardMaterial color={shadeHex(colour, -0.2)} />
      </mesh>
      <mesh position={[halfW * 0.3, 0.85, -halfH + 0.01]} raycast={() => null}>
        <boxGeometry args={[Math.min(1.6, width * 0.3), 0.6, 0.02]} />
        <meshStandardMaterial color="#b8d4ea" emissive="#6f8fa8" emissiveIntensity={0.25} />
      </mesh>
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
