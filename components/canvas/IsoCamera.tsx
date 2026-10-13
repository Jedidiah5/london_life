"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import { PerspectiveCamera, Vector3 } from "three";
import { roomLayout } from "@/lib/content";
import { useGame } from "@/lib/store/useGame";
import { useUi } from "@/lib/store/useUi";

const DEFAULT_ZOOM = 52;
/** Pixels of horizontal drag for a quarter turn. */
const DRAG_PER_QUARTER = 240;
/** Pixels of vertical drag per radian of tilt. */
const DRAG_PER_RADIAN = 320;
/** Pixels a press may wander and still count as a tap rather than a drag. */
const TAP_SLOP = 12;
/** How far, as a share of the room size, the view slides in buy mode so the catalogue does not cover the room. */
const BUY_LIFT = 0.38;
const TARGET = new Vector3();

export function IsoCamera() {
  const camera = useThree((state) => state.camera);
  const gl = useThree((state) => state.gl);
  const size = useThree((state) => state.size);
  const location = useGame((state) => state.location);
  const homeId = useGame((state) => state.homeId);
  const visit = useUi((state) => state.visit);
  const view = useRef<{
    yaw: number;
    pitch: number;
    zoom: number;
    lift: number;
    mapZoom: number;
    panX: number;
    panZ: number;
  } | null>(null);
  /** World units per screen pixel at the look-at point, and the tilt, from the last frame. */
  const scale = useRef({ perPixel: 0.05, pitch: 1 });
  const layout = roomLayout(location, homeId, visit?.homeId ?? null);
  const roomSpan = Math.hypot(layout.width, layout.height) + 0.4;

  useEffect(() => {
    const element = gl.domElement;
    const pointers = new Map<number, { x: number; y: number }>();
    let drag: {
      x: number;
      y: number;
      yaw: number;
      pitch: number;
      panX: number;
      panZ: number;
      moved: boolean;
    } | null = null;
    let pinch: { distance: number; zoom: number } | null = null;
    let swallowClick = false;

    const onMap = () => useUi.getState().nav === "map";
    const spread = () => {
      const [a, b] = [...pointers.values()];
      return a && b ? Math.hypot(a.x - b.x, a.y - b.y) : 0;
    };
    const down = (event: PointerEvent) => {
      pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      const ui = useUi.getState();
      if (pointers.size === 2) {
        pinch = { distance: spread(), zoom: onMap() ? ui.mapZoom : ui.zoom };
        drag = null;
        return;
      }
      drag = {
        x: event.clientX,
        y: event.clientY,
        yaw: ui.yaw,
        pitch: ui.pitch,
        panX: ui.mapPan.x,
        panZ: ui.mapPan.z,
        moved: false,
      };
    };
    const pan = (dx: number, dy: number, from: { panX: number; panZ: number; yaw: number }) => {
      const angle = (from.yaw * Math.PI) / 2 + Math.PI / 4;
      const { perPixel, pitch } = scale.current;
      const across = dx * perPixel;
      const along = (dy * perPixel) / Math.max(Math.sin(pitch), 0.3);
      useUi
        .getState()
        .setMapPan(
          from.panX - Math.sin(angle) * across - Math.cos(angle) * along,
          from.panZ + Math.cos(angle) * across - Math.sin(angle) * along,
        );
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
        if (pinch.distance > 0) {
          const zoom = pinch.zoom * (now / pinch.distance);
          if (onMap()) useUi.getState().setMapZoom(zoom);
          else useUi.getState().setZoom(zoom);
        }
        swallowClick = true;
        return;
      }
      if (!drag) return;
      const dx = event.clientX - drag.x;
      const dy = event.clientY - drag.y;
      if (!drag.moved && Math.hypot(dx, dy) < TAP_SLOP) return;
      drag.moved = true;
      swallowClick = true;
      if (onMap()) pan(dx, dy, drag);
      else useUi.getState().orbit(drag.yaw + dx / DRAG_PER_QUARTER, drag.pitch + dy / DRAG_PER_RADIAN);
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
      const ui = useUi.getState();
      const factor = event.deltaY > 0 ? 0.92 : 1.08;
      if (onMap()) ui.setMapZoom(ui.mapZoom * factor);
      else ui.setZoom(ui.zoom * factor);
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
    const current = (view.current ??= {
      yaw: ui.yaw,
      pitch: ui.pitch,
      zoom: ui.zoom,
      lift: 0,
      mapZoom: ui.mapZoom,
      panX: ui.mapPan.x,
      panZ: ui.mapPan.z,
    });
    const ease = 1 - Math.exp(-delta * 12);
    current.yaw += (ui.yaw - current.yaw) * ease;
    current.pitch += (ui.pitch - current.pitch) * ease;
    current.zoom += (ui.zoom - current.zoom) * ease;
    current.mapZoom += (ui.mapZoom - current.mapZoom) * ease;
    current.panX += (ui.mapPan.x - current.panX) * ease;
    current.panZ += (ui.mapPan.z - current.panZ) * ease;
    if (!(camera instanceof PerspectiveCamera)) return;

    const map = ui.nav === "map";
    const buying = ui.nav === "buy";
    current.lift += ((buying ? BUY_LIFT : 0) - current.lift) * ease;
    const span = map ? 34 : roomSpan;
    const pitch = map ? Math.max(current.pitch, 0.95) : buying ? Math.max(current.pitch, 1.05) : current.pitch;
    const vertical = (camera.fov * Math.PI) / 180;
    const horizontal = 2 * Math.atan(Math.tan(vertical / 2) * (size.width / Math.max(size.height, 1)));
    const fitWidth = span / 2 / Math.tan(horizontal / 2) / 0.98;
    const fitHeight = ((span / 2) * Math.sin(pitch) + 0.8 * Math.cos(pitch)) / Math.tan(vertical / 2) / 0.8;
    const distance =
      Math.max(fitWidth, fitHeight) * (map ? 1 / current.mapZoom : buying ? 1.3 : DEFAULT_ZOOM / current.zoom);
    scale.current.perPixel = (2 * distance * Math.tan(vertical / 2)) / Math.max(size.height, 1);
    scale.current.pitch = pitch;

    const angle = (current.yaw * Math.PI) / 2 + Math.PI / 4;
    const slide = current.lift * span;
    if (map) TARGET.set(current.panX, 0, current.panZ);
    else TARGET.set(Math.cos(angle) * slide, 0.35, Math.sin(angle) * slide);
    camera.position.set(
      TARGET.x + Math.cos(angle) * Math.cos(pitch) * distance,
      TARGET.y + Math.sin(pitch) * distance,
      TARGET.z + Math.sin(angle) * Math.cos(pitch) * distance,
    );
    camera.lookAt(TARGET);
    camera.near = Math.max(0.1, distance * 0.05);
    camera.far = distance * 6;
    camera.updateProjectionMatrix();
  });

  return null;
}
