"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import { OrthographicCamera, Vector3 } from "three";
import { useUi } from "@/lib/store/useUi";

export function IsoCamera() {
  const camera = useThree((state) => state.camera);
  const gl = useThree((state) => state.gl);
  const drag = useRef<{ x: number; yaw: number } | null>(null);

  useEffect(() => {
    const element = gl.domElement;
    const down = (event: PointerEvent) => {
      drag.current = { x: event.clientX, yaw: useUi.getState().yaw };
    };
    const move = (event: PointerEvent) => {
      if (!drag.current) return;
      const dx = event.clientX - drag.current.x;
      if (Math.abs(dx) < 70) return;
      const steps = dx > 0 ? 1 : -1;
      useUi.setState({ yaw: (drag.current.yaw + steps + 4) % 4 });
      drag.current = { x: event.clientX, yaw: useUi.getState().yaw };
    };
    const up = () => {
      drag.current = null;
    };
    const wheel = (event: WheelEvent) => {
      event.preventDefault();
      const current = useUi.getState().zoom;
      useUi.getState().setZoom(current + (event.deltaY > 0 ? -3 : 3));
    };
    element.addEventListener("pointerdown", down);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    element.addEventListener("wheel", wheel, { passive: false });
    return () => {
      element.removeEventListener("pointerdown", down);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      element.removeEventListener("wheel", wheel);
    };
  }, [gl]);

  useFrame(() => {
    const { yaw, zoom, nav } = useUi.getState();
    const angle = (yaw * Math.PI) / 2 + Math.PI / 4;
    const distance = nav === "map" ? 28 : 16;
    const target = new Vector3(0, 0, 0);
    camera.position.set(Math.cos(angle) * distance, distance * 0.82, Math.sin(angle) * distance);
    camera.lookAt(target);
    if (camera instanceof OrthographicCamera) {
      camera.zoom = nav === "map" ? 18 : zoom;
      camera.updateProjectionMatrix();
    }
  });

  return null;
}
