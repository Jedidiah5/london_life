"use client";

import {
  ACESFilmicToneMapping,
  AmbientLight,
  Box3,
  DirectionalLight,
  PerspectiveCamera,
  Scene,
  SRGBColorSpace,
  Sphere,
  Vector3,
  WebGLRenderer,
  type Mesh,
  type Object3D,
} from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { fitObject } from "@/components/canvas/fitted";
import { MODEL_HEIGHTS } from "@/components/canvas/Furniture";

const SIZE = 192;
const FOV = 26;

let renderer: WebGLRenderer | null = null;
let scene: Scene | null = null;
let camera: PerspectiveCamera | null = null;
const loader = new GLTFLoader();
const models = new Map<string, Promise<Object3D>>();
const done = new Map<string, string>();
const pending = new Map<string, Promise<string>>();
let queue: Promise<unknown> = Promise.resolve();

function stage(): { renderer: WebGLRenderer; scene: Scene; camera: PerspectiveCamera } {
  if (!renderer || !scene || !camera) {
    renderer = new WebGLRenderer({ alpha: true, antialias: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(1);
    renderer.setSize(SIZE, SIZE, false);
    renderer.outputColorSpace = SRGBColorSpace;
    renderer.toneMapping = ACESFilmicToneMapping;
    renderer.setClearColor(0x000000, 0);
    scene = new Scene();
    scene.add(new AmbientLight("#ffffff", 1.4));
    const key = new DirectionalLight("#fff4e0", 2.4);
    key.position.set(3, 6, 4);
    scene.add(key);
    const rim = new DirectionalLight("#cfe0ff", 0.8);
    rim.position.set(-4, 3, -2);
    scene.add(rim);
    camera = new PerspectiveCamera(FOV, 1, 0.01, 50);
  }
  return { renderer, scene, camera };
}

function loadModel(file: string): Promise<Object3D> {
  let found = models.get(file);
  if (!found) {
    found = loader.loadAsync(`/models/furniture/${file}.glb`).then((gltf) => gltf.scene);
    models.set(file, found);
  }
  return found;
}

export function cachedThumbnail(file: string, tint: string): string | null {
  return done.get(`${file}|${tint}`) ?? null;
}

/** Renders a furniture model to a PNG data URL, one at a time, cached per model and colour. */
export function thumbnail(file: string, tint: string, footprint: number): Promise<string> {
  const key = `${file}|${tint}`;
  const ready = done.get(key);
  if (ready) return Promise.resolve(ready);
  const inFlight = pending.get(key);
  if (inFlight) return inFlight;
  const job = queue.then(async () => {
    const source = await loadModel(file);
    const { renderer: gl, scene: stageScene, camera: lens } = stage();
    const object = fitObject(source, footprint * 0.92, tint, MODEL_HEIGHTS[file] ?? 1.5);
    stageScene.add(object);
    const bounds = new Box3().setFromObject(object).getBoundingSphere(new Sphere());
    const distance = bounds.radius / Math.sin(((FOV / 2) * Math.PI) / 180);
    const direction = new Vector3(1, 0.85, 1.25).normalize();
    lens.position.copy(bounds.center).addScaledVector(direction, distance * 1.02);
    lens.lookAt(bounds.center);
    lens.updateProjectionMatrix();
    gl.render(stageScene, lens);
    const url = gl.domElement.toDataURL("image/png");
    stageScene.remove(object);
    object.traverse((node) => {
      const mesh = node as Mesh;
      if (mesh.isMesh && !Array.isArray(mesh.material)) mesh.material.dispose();
    });
    done.set(key, url);
    pending.delete(key);
    return url;
  });
  queue = job.catch(() => pending.delete(key));
  pending.set(key, job);
  return job;
}
