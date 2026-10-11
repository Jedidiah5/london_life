"use client";

import { Html } from "@react-three/drei";
import { roomLayout } from "@/lib/content";
import { purchaseVenue } from "@/lib/net/rpc";
import { tileWorld, worldToTile } from "@/lib/sim/grid";
import { useGame } from "@/lib/store/useGame";
import { usePresence } from "@/lib/store/usePresence";
import { useUi } from "@/lib/store/useUi";
import { Character } from "./Character";
import { FurniturePiece } from "./Furniture";
import { PlacementGhost } from "@/components/buy/PlacementGhost";

export function RoomScene() {
  const location = useGame((state) => state.location);
  const homeId = useGame((state) => state.homeId);
  const inventory = useGame((state) => state.inventory);
  const tile = useGame((state) => state.tile);
  const path = useGame((state) => state.path);
  const appearance = useGame((state) => state.appearance);
  const name = useGame((state) => state.name);
  const visit = useUi((state) => state.visit);
  const nav = useUi((state) => state.nav);
  const here = usePresence((state) => state.here);
  const layout = roomLayout(location, homeId, visit?.homeId ?? null);
  const pieces = visit ? visit.items : inventory.filter((item) => item.placed);
  const look = visit?.appearance ?? appearance;

  return (
    <group>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0, 0]}
        onClick={(event) => {
          event.stopPropagation();
          if (visit) return;
          const next = worldToTile(event.point.x, event.point.z, layout.width, layout.height);
          if (nav === "buy") {
            const ui = useUi.getState();
            const itemId = ui.selectedCatalogueId ?? ui.movingId;
            if (!itemId) return;
            const catalogueId = ui.selectedCatalogueId;
            const moving = ui.movingId
              ? useGame.getState().inventory.find((item) => item.id === ui.movingId)
              : null;
            const id = catalogueId ?? moving?.itemId;
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
          const note = useGame.getState().walkTo(next);
          if (note) useUi.getState().pushToast(note);
        }}
      >
        <planeGeometry args={[layout.width, layout.height]} />
        <meshStandardMaterial color="#c4a574" />
      </mesh>
      {Array.from({ length: layout.width * layout.height }, (_, index) => {
        const x = index % layout.width;
        const y = Math.floor(index / layout.width);
        const [wx, , wz] = tileWorld(x, y, layout.width, layout.height);
        return (
          <mesh key={`${x}-${y}`} position={[wx, 0.01, wz]} rotation={[-Math.PI / 2, 0, 0]} raycast={() => null}>
            <planeGeometry args={[0.96, 0.96]} />
            <meshStandardMaterial color={(x + y) % 2 === 0 ? "#d7bf8d" : "#c9ae78"} />
          </mesh>
        );
      })}
      <Walls width={layout.width} height={layout.height} />
      {layout.fixtures.map((fixture) => (
        <FurniturePiece
          key={fixture.id}
          itemId={fixture.itemId}
          model={fixture.model}
          x={fixture.x}
          y={fixture.y}
          rotation={fixture.rotation}
          roomWidth={layout.width}
          roomHeight={layout.height}
          onClick={() => {
            if (visit) return;
            void (async () => {
              if (fixture.purchase) {
                if (!useGame.getState().cloud) {
                  useUi.getState().pushToast("Connect Supabase before you can pay");
                  return;
                }
                const error = await purchaseVenue(fixture.purchase);
                if (error) {
                  useUi.getState().pushToast(error);
                  return;
                }
              }
              const note = useGame.getState().interact(fixture.id);
              if (note) useUi.getState().pushToast(note);
            })();
          }}
        />
      ))}
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
            const note = useGame.getState().interact(item.id);
            if (note) useUi.getState().pushToast(note);
          }}
        />
      ))}
      <PlacementGhost roomWidth={layout.width} roomHeight={layout.height} />
      {!visit ? (
        <Character
          look={appearance}
          tile={tile}
          path={path}
          roomWidth={layout.width}
          roomHeight={layout.height}
          walkingEnabled
        />
      ) : (
        <Character
          look={look}
          tile={{ x: 2, y: 2 }}
          path={[]}
          roomWidth={layout.width}
          roomHeight={layout.height}
          walkingEnabled={false}
        />
      )}
      <Html position={tileWorld(tile.x, tile.y + 0.2, layout.width, layout.height)} center sprite zIndexRange={[8, 0]}>
        <div className="pointer-events-none rounded-full bg-[#1b2838]/80 px-2 py-0.5 text-[10px] font-semibold text-[#f4efe6]">
          {visit ? visit.name : name}
        </div>
      </Html>
      {here.map((player) => {
        const [x, , z] = tileWorld(player.x, player.y, layout.width, layout.height);
        return (
          <group key={player.simId}>
            <Character
              look={player.appearance}
              tile={{ x: player.x, y: player.y }}
              path={[]}
              roomWidth={layout.width}
              roomHeight={layout.height}
              walkingEnabled={false}
            />
            <Html position={[x, 1.7, z]} center sprite zIndexRange={[8, 0]}>
              <div className="pointer-events-none text-center">
                <div className="rounded-full bg-[#1b2838]/80 px-2 py-0.5 text-[10px] text-[#f4efe6]">
                  {player.name}
                </div>
                {player.emote && player.emoteUntil > Date.now() ? (
                  <div className="mt-1 rounded-xl bg-white px-2 py-1 text-[10px] text-[#1b2838]">{player.emote}</div>
                ) : null}
              </div>
            </Html>
          </group>
        );
      })}
    </group>
  );
}

function Walls({ width, height }: { width: number; height: number }) {
  const halfW = width / 2;
  const halfH = height / 2;
  return (
    <group>
      <mesh position={[0, 0.55, -halfH]} raycast={() => null}>
        <boxGeometry args={[width, 1.1, 0.12]} />
        <meshStandardMaterial color="#f3efe6" />
      </mesh>
      <mesh position={[-halfW, 0.55, 0]} raycast={() => null}>
        <boxGeometry args={[0.12, 1.1, height]} />
        <meshStandardMaterial color="#e7e1d6" />
      </mesh>
      <mesh position={[halfW, 0.55, 0]} raycast={() => null}>
        <boxGeometry args={[0.12, 1.1, height]} />
        <meshStandardMaterial color="#e7e1d6" />
      </mesh>
    </group>
  );
}
