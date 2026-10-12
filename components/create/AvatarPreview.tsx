"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { useRef } from "react";
import { Group } from "three";
import { Avatar } from "@/components/canvas/Avatar";
import type { Anim, Appearance } from "@/lib/sim/types";

function Spinner({ look, anim }: { look: Appearance; anim: Anim }) {
  const group = useRef<Group>(null);
  useFrame((_, delta) => {
    if (group.current) group.current.rotation.y += delta * 0.5;
  });
  return (
    <group ref={group} position={[0, -0.5, 0]}>
      <Avatar look={look} anim={anim} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.001, 0]}>
        <circleGeometry args={[0.32, 32]} />
        <meshStandardMaterial color="#ffffff" transparent opacity={0.5} />
      </mesh>
    </group>
  );
}

export default function AvatarPreview({ look, anim = "stand" }: { look: Appearance; anim?: Anim }) {
  return (
    <Canvas camera={{ position: [0, 0.2, 1.9], fov: 34 }} dpr={[1, 2]}>
      <ambientLight intensity={0.8} />
      <hemisphereLight args={["#fff8ec", "#8a7a66", 0.4]} />
      <directionalLight position={[2, 3, 2]} intensity={1.3} />
      <Spinner look={look} anim={anim} />
    </Canvas>
  );
}
