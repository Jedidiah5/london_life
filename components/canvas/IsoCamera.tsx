"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import { OrthographicCamera, Vector3 } from "three";
import { roomLayout } from "@/lib/content";
import { useGame } from "@/lib/store/useGame";
import { useUi } from "@/lib/store/useUi";

const DEFAULT_ZOOM = 52;
const ORIGIN = new Vector3(0, 0, 0);

export function IsoCamera() {
  const camera = useThree((state) => state.camera);
  const gl = useThree((state) => state.gl);
  const size = useThree((state) => state.size);
  const location = useGame((state) => state.location);
  const homeId = useGame((state) => state.homeId);
  const visit = useUi((state) => state.visit);
  const drag = useRef<{ x: number; yaw: number } | null>(null);
  const layout = roomLayout(location, homeId, visit?.homeId ?? null);
  const span = (layout.width + layout.height) * 0.707;
  const fit = Math.min((size.width * 0.82) / span, (size.height * 0.5) / (span * 0.5 + 1.6));

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
    camera.position.set(Math.cos(angle) * distance, distance * 0.82, Math.sin(angle) * distance);
    camera.lookAt(ORIGIN);
    if (camera instanceof OrthographicCamera) {
      camera.zoom = nav === "map" ? Math.min(size.width / 34, size.height / 22) : fit * (zoom / DEFAULT_ZOOM);
      camera.updateProjectionMatrix();
    }
  });

  return null;
}
