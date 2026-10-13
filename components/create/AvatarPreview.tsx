"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { useRef, type MutableRefObject, type PointerEvent } from "react";
import { Group } from "three";
import { Avatar } from "@/components/canvas/Avatar";
import type { Anim, Appearance } from "@/lib/sim/types";

type Drag = { active: boolean; lastX: number; velocity: number };

const DRAG_SPEED = 0.012;
const IDLE_SPIN = 0.5;

function Spinner({
  look,
  anim,
  drag,
  groupRef,
}: {
  look: Appearance;
  anim: Anim;
  drag: MutableRefObject<Drag>;
  groupRef: MutableRefObject<Group | null>;
}) {
  useFrame((_, delta) => {
    const group = groupRef.current;
    const state = drag.current;
    if (!group || state.active) return;
    // A flick coasts to a stop, then the avatar drifts back to its gentle idle spin.
    state.velocity *= 0.92;
    group.rotation.y += state.velocity + (Math.abs(state.velocity) < 0.002 ? delta * IDLE_SPIN : 0);
  });
  return (
    <group ref={groupRef} position={[0, -0.5, 0]}>
      <Avatar look={look} anim={anim} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.001, 0]}>
        <circleGeometry args={[0.32, 32]} />
        <meshStandardMaterial color="#ffffff" transparent opacity={0.5} />
      </mesh>
    </group>
  );
}

export default function AvatarPreview({ look, anim = "stand" }: { look: Appearance; anim?: Anim }) {
  const drag = useRef<Drag>({ active: false, lastX: 0, velocity: 0 });
  const group = useRef<Group | null>(null);

  function down(event: PointerEvent<HTMLDivElement>) {
    drag.current = { active: true, lastX: event.clientX, velocity: 0 };
    event.currentTarget.setPointerCapture(event.pointerId);
  }
  function move(event: PointerEvent<HTMLDivElement>) {
    const state = drag.current;
    if (!state.active) return;
    const dx = event.clientX - state.lastX;
    state.lastX = event.clientX;
    state.velocity = dx * DRAG_SPEED;
    if (group.current) group.current.rotation.y += dx * DRAG_SPEED;
  }
  function up() {
    drag.current.active = false;
  }

  return (
    <div
      className="h-full w-full cursor-grab touch-pan-y active:cursor-grabbing"
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={up}
    >
      <Canvas camera={{ position: [0, 0.2, 2.3], fov: 34 }} dpr={[1, 2]}>
        <ambientLight intensity={0.8} />
        <hemisphereLight args={["#fff8ec", "#8a7a66", 0.4]} />
        <directionalLight position={[2, 3, 2]} intensity={1.3} />
        <Spinner look={look} anim={anim} drag={drag} groupRef={group} />
      </Canvas>
    </div>
  );
}
