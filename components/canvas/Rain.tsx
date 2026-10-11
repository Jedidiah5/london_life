"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { BufferAttribute, Points } from "three";

export function Rain({ spread = 16 }: { spread?: number }) {
  const points = useRef<Points>(null);
  const positions = useMemo(() => {
    const values = new Float32Array(500 * 3);
    for (let index = 0; index < 500; index += 1) {
      values[index * 3] = (Math.random() - 0.5) * spread;
      values[index * 3 + 1] = Math.random() * 10;
      values[index * 3 + 2] = (Math.random() - 0.5) * spread;
    }
    return values;
  }, [spread]);

  useFrame((_, delta) => {
    const attribute = points.current?.geometry.getAttribute("position");
    if (!(attribute instanceof BufferAttribute)) return;
    const array = attribute.array;
    if (!(array instanceof Float32Array)) return;
    for (let index = 1; index < array.length; index += 3) {
      const current = array[index] ?? 0;
      array[index] = current - delta * 7;
      if ((array[index] ?? 0) < 0) array[index] = 10;
    }
    attribute.needsUpdate = true;
  });

  return (
    <points ref={points}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial color="#e7f2f8" size={0.045} transparent opacity={0.55} />
    </points>
  );
}
