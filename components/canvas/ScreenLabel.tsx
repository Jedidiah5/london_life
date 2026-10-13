"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useLayoutEffect, useRef, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { Vector3, type Group } from "three";

type Props = {
  position: [number, number, number];
  zIndexRange?: [number, number];
  children: ReactNode;
};

const point = new Vector3();

// drei's <Html> unmounts its DOM root synchronously while the R3F tree is committing, which React warns about.
// This keeps the same API but defers the unmount until React has finished.
export function ScreenLabel({ position, zIndexRange = [8, 0], children }: Props) {
  const group = useRef<Group>(null);
  const holder = useRef<{ el: HTMLDivElement; root: Root } | null>(null);
  const { gl, camera, size, events } = useThree();
  const target = (events.connected as HTMLElement | null | undefined) ?? gl.domElement.parentElement;

  useLayoutEffect(() => {
    if (!target) return;
    const el = document.createElement("div");
    el.style.cssText = "position:absolute;top:0;left:0;";
    target.appendChild(el);
    const root = createRoot(el);
    holder.current = { el, root };
    return () => {
      holder.current = null;
      el.remove();
      setTimeout(() => root.unmount(), 0);
    };
  }, [target]);

  useLayoutEffect(() => {
    holder.current?.root.render(
      <div style={{ position: "absolute", transform: "translate3d(-50%,-50%,0)" }}>{children}</div>,
    );
  });

  useFrame(() => {
    const el = holder.current?.el;
    if (!el || !group.current) return;
    point.setFromMatrixPosition(group.current.matrixWorld).project(camera);
    const behind = point.z > 1 || point.z < -1;
    el.style.display = behind ? "none" : "";
    el.style.transform = `translate3d(${((point.x + 1) / 2) * size.width}px,${((1 - point.y) / 2) * size.height}px,0)`;
    const [front, back] = zIndexRange;
    el.style.zIndex = String(Math.round(back + (front - back) * (1 - (point.z + 1) / 2)));
  });

  return <group ref={group} position={position} />;
}
