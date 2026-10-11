"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import { PerspectiveCamera, Vector3 } from "three";
import { roomLayout } from "@/lib/content";
import { tileWorld } from "@/lib/sim/grid";
import { useGame } from "@/lib/store/useGame";
import { useUi } from "@/lib/store/useUi";

const DEFAULT_ZOOM = 52;
/** Pixels of horizontal drag for a quarter turn. */
const DRAG_PER_QUARTER = 240;
/** Pixels of vertical drag per radian of tilt. */
const DRAG_PER_RADIAN = 320;
const TAP_SLOP = 6;
const TARGET = new Vector3();

export function IsoCamera() {
  const camera = useThree((state) => state.camera);
  const gl = useThree((state) => state.gl);
  const size = useThree((state) => state.size);
  const location = useGame((state) => state.location);
  const homeId = useGame((state) => state.homeId);
  const visit = useUi((state) => state.visit);
  const view = useRef<{ yaw: number; pitch: number; zoom: number } | null>(null);
  const layout = roomLayout(location, homeId, visit?.homeId ?? null);
  const roomSpan = Math.hypot(layout.width, layout.height) + 0.4;

  useEffect(() => {
    const element = gl.domElement;
    const pointers = new Map<number, { x: number; y: number }>();
    let drag: { x: number; y: number; yaw: number; pitch: number; moved: boolean } | null = null;
    let pinch: { distance: number; zoom: number } | null = null;
    let swallowClick = false;

    const spread = () => {
      const [a, b] = [...pointers.values()];
      return a && b ? Math.hypot(a.x - b.x, a.y - b.y) : 0;
    };
    const down = (event: PointerEvent) => {
      pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      if (pointers.size === 2) {
        pinch = { distance: spread(), zoom: useUi.getState().zoom };
        drag = null;
        return;
      }
      const { yaw, pitch } = useUi.getState();
      drag = { x: event.clientX, y: event.clientY, yaw, pitch, moved: false };
    };
    const move = (event: PointerEvent) => {
      if (event.pointerType === "mouse" && event.buttons === 0) {
        pointers.clear();
        drag = null;
        pinch = null;
        return;
      }
      if (pointers.has(event.pointerId)) pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      if (pinch && pointers.size === 2) {
        const now = spread();
        if (pinch.distance > 0) useUi.getState().setZoom(pinch.zoom * (now / pinch.distance));
        swallowClick = true;
        return;
      }
      if (!drag) return;
      const dx = event.clientX - drag.x;
      const dy = event.clientY - drag.y;
      if (!drag.moved && Math.hypot(dx, dy) < TAP_SLOP) return;
      drag.moved = true;
      swallowClick = true;
      useUi.getState().orbit(drag.yaw - dx / DRAG_PER_QUARTER, drag.pitch + dy / DRAG_PER_RADIAN);
    };
    const up = (event: PointerEvent) => {
      pointers.delete(event.pointerId);
      if (pointers.size < 2) pinch = null;
      if (pointers.size === 0) drag = null;
      if (swallowClick) window.setTimeout(() => (swallowClick = false), 0);
    };
    const click = (event: MouseEvent) => {
      if (!swallowClick) return;
      event.stopPropagation();
      event.preventDefault();
      swallowClick = false;
    };
    const wheel = (event: WheelEvent) => {
      event.preventDefault();
      const current = useUi.getState().zoom;
      useUi.getState().setZoom(current * (event.deltaY > 0 ? 0.92 : 1.08));
    };
    element.style.touchAction = "none";
    element.addEventListener("pointerdown", down);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    window.addEventListener("click", click, true);
    element.addEventListener("wheel", wheel, { passive: false });
    return () => {
      element.removeEventListener("pointerdown", down);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      window.removeEventListener("click", click, true);
      element.removeEventListener("wheel", wheel);
    };
  }, [gl]);

  useFrame((_, delta) => {
    const ui = useUi.getState();
    const current = (view.current ??= { yaw: ui.yaw, pitch: ui.pitch, zoom: ui.zoom });
    const ease = 1 - Math.exp(-delta * 12);
    current.yaw += (ui.yaw - current.yaw) * ease;
    current.pitch += (ui.pitch - current.pitch) * ease;
    current.zoom += (ui.zoom - current.zoom) * ease;
    if (!(camera instanceof PerspectiveCamera)) return;

    const map = ui.nav === "map";
    const span = map ? 34 : roomSpan;
    const pitch = map ? Math.max(current.pitch, 0.95) : current.pitch;
    const vertical = (camera.fov * Math.PI) / 180;
    const horizontal = 2 * Math.atan(Math.tan(vertical / 2) * (size.width / Math.max(size.height, 1)));
    const fitWidth = span / 2 / Math.tan(horizontal / 2) / 0.98;
    const fitHeight = ((span / 2) * Math.sin(pitch) + 0.8 * Math.cos(pitch)) / Math.tan(vertical / 2) / 0.8;
    const distance = Math.max(fitWidth, fitHeight) * (map ? 1 : DEFAULT_ZOOM / current.zoom);

    const angle = (current.yaw * Math.PI) / 2 + Math.PI / 4;
    const follow = map ? 0 : Math.min(1, Math.max(0, (current.zoom - DEFAULT_ZOOM) / 30));
    const tile = useGame.getState().tile;
    const [px, , pz] = tileWorld(tile.x, tile.y, layout.width, layout.height);
    TARGET.set(px * follow, map ? 0 : 0.35 + follow * 0.25, pz * follow);
    camera.position.set(
      Math.cos(angle) * Math.cos(pitch) * distance,
      TARGET.y + Math.sin(pitch) * distance,
      Math.sin(angle) * Math.cos(pitch) * distance,
    );
    camera.lookAt(TARGET);
    camera.near = Math.max(0.1, distance * 0.05);
    camera.far = distance * 6;
    camera.updateProjectionMatrix();
  });

  return null;
}
