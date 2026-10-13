"use client";

import { useGLTF } from "@react-three/drei";
import { createPortal, useFrame } from "@react-three/fiber";
import { Suspense, useEffect, useLayoutEffect, useMemo, useRef } from "react";
import {
  AnimationMixer,
  DoubleSide,
  Quaternion,
  Skeleton,
  Vector3,
  type AnimationAction,
  type Bone,
  type Group,
  type Mesh,
  type MeshStandardMaterial,
  type Object3D,
  type SkinnedMesh,
} from "three";
import { clone as cloneSkinned } from "three/examples/jsm/utils/SkeletonUtils.js";
import type { Anim, Appearance, Figure, HairStyle, TopStyle } from "@/lib/sim/types";
import { shadeHex as shade } from "./colour";

type ModelId =
  | "m_casual"
  | "m_hoodie"
  | "m_suit"
  | "m_punk"
  | "m_beach"
  | "m_adventurer"
  | "f_casual"
  | "f_formal"
  | "f_suit"
  | "f_punk"
  | "f_adventurer"
  | "f_soldier";

const modelUrl = (id: ModelId) => `/models/people/${id}.glb`;

/** The source models are 1.8m tall; this brings them to the old avatar's height. */
const MODEL_SCALE = 0.54;

const OUTFITS: Record<Figure, Record<TopStyle, ModelId>> = {
  masc: {
    tee: "m_casual",
    hoodie: "m_hoodie",
    jacket: "m_punk",
    blazer: "m_suit",
    dress: "m_casual",
    kaftan: "m_casual",
  },
  fem: {
    tee: "f_casual",
    hoodie: "f_casual",
    jacket: "f_punk",
    blazer: "f_suit",
    dress: "f_formal",
    kaftan: "f_formal",
  },
};

const HEADS: Record<Figure, Record<HairStyle, ModelId>> = {
  masc: {
    short: "m_hoodie",
    fade: "m_suit",
    buzz: "m_beach",
    bald: "m_suit",
    afro: "m_suit",
    curly: "m_hoodie",
    long: "m_casual",
    ponytail: "m_casual",
    bun: "m_casual",
    braids: "m_suit",
    locs: "m_suit",
    cornrows: "m_suit",
  },
  fem: {
    short: "f_adventurer",
    fade: "f_adventurer",
    buzz: "f_adventurer",
    bald: "f_suit",
    afro: "f_suit",
    curly: "f_formal",
    long: "f_soldier",
    ponytail: "f_casual",
    bun: "f_formal",
    braids: "f_suit",
    locs: "f_suit",
    cornrows: "f_suit",
  },
};

/** Styles the models don't have: their own hair is hidden and ours is drawn on the head bone. */
const DRAWN_HAIR: readonly HairStyle[] = ["bald", "afro", "braids", "locs", "cornrows"];

const CLIPS: Record<Anim, string> = {
  stand: "Idle",
  walk: "Walk",
  sit: "Idle",
  sleep: "Idle",
  eat: "Interact",
  shower: "Interact",
  work: "Interact",
  dance: "Wave",
};

type Part = "head" | "top" | "bottom" | "shoes";

function partOf(node: Object3D): Part | null {
  for (let current: Object3D | null = node; current; current = current.parent) {
    if (/_Head$/.test(current.name)) return "head";
    if (/_Body$/.test(current.name)) return "top";
    if (/_(Legs|Pants)$/.test(current.name)) return "bottom";
    if (/_Feet$/.test(current.name)) return "shoes";
  }
  return null;
}

function findPart(root: Object3D, suffix: string): Object3D | undefined {
  let found: Object3D | undefined;
  root.traverse((node) => {
    if (!found && node.name.endsWith(suffix) && !(node as Bone).isBone) found = node;
  });
  return found;
}

/** Clones an outfit and, if asked, swaps in the head (and hair) from another model on the same rig. */
function assemble(body: Object3D, head: Object3D | null): Object3D {
  const root = cloneSkinned(body);
  const source = head ? findPart(head, "_Head") : undefined;
  if (source) {
    findPart(root, "_Head")?.removeFromParent();
    const bones = new Map<string, Bone>();
    root.traverse((node) => {
      if ((node as Bone).isBone) bones.set(node.name, node as Bone);
    });
    const copy = source.clone();
    copy.traverse((node) => {
      const mesh = node as SkinnedMesh;
      if (!mesh.isSkinnedMesh) return;
      const skeleton = new Skeleton(
        mesh.skeleton.bones.map((bone) => bones.get(bone.name) ?? bone),
        mesh.skeleton.boneInverses,
      );
      mesh.bind(skeleton, mesh.bindMatrix);
    });
    (root.getObjectByName(source.parent?.name ?? "") ?? root).add(copy);
  }
  root.traverse((node) => {
    const mesh = node as Mesh;
    if (!mesh.isMesh) return;
    mesh.material = (mesh.material as MeshStandardMaterial).clone();
    mesh.castShadow = true;
    mesh.frustumCulled = false;
  });
  return root;
}

const NOT_CLOTHES = /^(Skin|Skin_Darker|Hair.*|Eyebrows|Moustache|Eye|Earrings)$/;

function recolour(root: Object3D, look: Appearance, hideHair: boolean) {
  const meshes: { mesh: Mesh; part: Part | null; name: string }[] = [];
  root.traverse((node) => {
    const mesh = node as Mesh;
    if (mesh.isMesh) meshes.push({ mesh, part: partOf(mesh), name: (mesh.material as MeshStandardMaterial).name });
  });
  const main = new Map<Part, Mesh>();
  for (const entry of meshes) {
    if (!entry.part || entry.part === "head" || NOT_CLOTHES.test(entry.name)) continue;
    const current = main.get(entry.part);
    const count = entry.mesh.geometry.attributes.position?.count ?? 0;
    if (!current || count > (current.geometry.attributes.position?.count ?? 0)) main.set(entry.part, entry.mesh);
  }
  const dressed = look.topStyle === "dress" || look.topStyle === "kaftan";
  for (const { mesh, part, name } of meshes) {
    const material = mesh.material as MeshStandardMaterial;
    material.roughness = 0.8;
    mesh.visible = true;
    if (name === "Skin") material.color.set(look.skin);
    else if (name === "Skin_Darker") material.color.set(shade(look.skin, -0.06));
    else if (/^Hair/.test(name) || (part === "head" && (name === "Red" || name === "Pink"))) {
      material.color.set(name === "Hair_Blond" ? shade(look.hairColor, 0.06) : look.hairColor);
      if (hideHair) mesh.visible = false;
    } else if (name === "Eyebrows" || name === "Moustache") material.color.set(shade(look.hairColor, -0.04));
    else if (part && main.get(part) === mesh) {
      const colour =
        part === "top" || (part === "bottom" && dressed) ? look.top : part === "bottom" ? look.bottom : look.shoes;
      material.color.set(colour);
    }
  }
}

function Mat({ color }: { color: string }) {
  return <meshStandardMaterial color={color} roughness={0.85} />;
}

const HALF_SPHERE = [24, 12, 0, Math.PI * 2, 0, Math.PI / 2] as const;

/** Modelled in metres around the head bone, which sits at the base of the skull. */
function HeadExtras({ look }: { look: Appearance }) {
  const hair = look.hairColor;
  const wear = look.headwearColor;
  const covered = look.headwear !== "none";
  return (
    <group>
      {!covered && look.hairStyle === "afro" ? (
        <mesh position={[0, 0.16, -0.03]} scale={[1.05, 0.95, 1]}>
          <sphereGeometry args={[0.18, 20, 16]} />
          <Mat color={hair} />
        </mesh>
      ) : null}
      {!covered && (look.hairStyle === "locs" || look.hairStyle === "braids") ? (
        <group>
          <mesh position={[0, 0.115, -0.01]} rotation={[-0.25, 0, 0]} scale={[1, 0.85, 1.05]}>
            <sphereGeometry args={[0.133, ...HALF_SPHERE]} />
            <Mat color={hair} />
          </mesh>
          {[-1.9, -1.45, -1, -0.5, 0, 0.5, 1, 1.45, 1.9].map((angle) => (
            <mesh
              key={angle}
              position={[Math.sin(angle) * 0.12, 0.0, -Math.cos(angle) * 0.11]}
              rotation={[-0.12, 0, 0]}
            >
              <capsuleGeometry args={[look.hairStyle === "locs" ? 0.022 : 0.015, 0.22, 4, 8]} />
              <Mat color={hair} />
            </mesh>
          ))}
        </group>
      ) : null}
      {!covered && look.hairStyle === "cornrows" ? (
        <group>
          <mesh position={[0, 0.11, -0.005]} scale={[1, 0.8, 1.05]}>
            <sphereGeometry args={[0.13, ...HALF_SPHERE]} />
            <Mat color={hair} />
          </mesh>
          {[-0.06, -0.02, 0.02, 0.06].map((x) => (
            <mesh key={x} position={[x, 0.21, -0.01]} rotation={[0.1, 0, 0]}>
              <boxGeometry args={[0.018, 0.02, 0.22]} />
              <Mat color={shade(hair, -0.08)} />
            </mesh>
          ))}
        </group>
      ) : null}
      {look.headwear === "hijab" ? (
        <group>
          <mesh position={[0, 0.105, -0.005]}>
            <sphereGeometry args={[0.152, 24, 16, (5 * Math.PI) / 6, (4 * Math.PI) / 3]} />
            <meshStandardMaterial color={wear} roughness={0.85} side={DoubleSide} />
          </mesh>
          <mesh position={[0, -0.09, -0.01]}>
            <cylinderGeometry args={[0.13, 0.22, 0.16, 20]} />
            <Mat color={wear} />
          </mesh>
        </group>
      ) : null}
      {look.headwear === "turban" ? (
        <group rotation={[-0.22, 0, 0]}>
          <mesh position={[0, 0.115, -0.01]} scale={[1, 1.15, 1.12]}>
            <sphereGeometry args={[0.135, ...HALF_SPHERE]} />
            <Mat color={wear} />
          </mesh>
          <mesh position={[0, 0.125, -0.01]} rotation={[Math.PI / 2, 0, 0]} scale={[1, 1.12, 1]}>
            <torusGeometry args={[0.132, 0.03, 8, 24]} />
            <Mat color={shade(wear, -0.06)} />
          </mesh>
          <mesh position={[0, 0.2, 0.1]} rotation={[0.5, 0, Math.PI / 4]}>
            <boxGeometry args={[0.07, 0.07, 0.03]} />
            <Mat color={shade(wear, -0.1)} />
          </mesh>
        </group>
      ) : null}
      {look.headwear === "headwrap" ? (
        <group>
          <mesh position={[0, 0.17, -0.03]} rotation={[-0.35, 0, 0]} scale={[1, 1, 1.1]}>
            <cylinderGeometry args={[0.17, 0.14, 0.17, 18]} />
            <Mat color={wear} />
          </mesh>
          <mesh position={[0.07, 0.27, -0.08]} rotation={[0, 0, 0.6]} scale={[1.4, 0.7, 1]}>
            <sphereGeometry args={[0.07, 12, 10]} />
            <Mat color={shade(wear, 0.06)} />
          </mesh>
        </group>
      ) : null}
      {look.headwear === "cap" ? (
        <group>
          <mesh position={[0, 0.13, 0]} scale={[1, 0.85, 1.05]}>
            <sphereGeometry args={[0.14, ...HALF_SPHERE]} />
            <Mat color={wear} />
          </mesh>
          <mesh position={[0, 0.14, 0.16]} rotation={[0.08, 0, 0]}>
            <boxGeometry args={[0.2, 0.015, 0.13]} />
            <Mat color={shade(wear, -0.08)} />
          </mesh>
        </group>
      ) : null}
      {look.headwear === "beanie" ? (
        <group>
          <mesh position={[0, 0.12, 0]} scale={[1, 1.2, 1.05]}>
            <sphereGeometry args={[0.142, ...HALF_SPHERE]} />
            <Mat color={wear} />
          </mesh>
          <mesh position={[0, 0.125, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[1, 1.05, 1]}>
            <torusGeometry args={[0.14, 0.024, 8, 24]} />
            <Mat color={shade(wear, -0.08)} />
          </mesh>
        </group>
      ) : null}
    </group>
  );
}

const turn = new Quaternion();
const parentTurn = new Quaternion();
const rootTurn = new Quaternion();
const axis = new Vector3();

/** Rotates a bone about the body's own left-right axis, on top of whatever the clip set. */
function bend(bone: Object3D | undefined, angle: number) {
  if (!bone?.parent) return;
  bone.parent.getWorldQuaternion(parentTurn).invert();
  axis.set(1, 0, 0).applyQuaternion(rootTurn).applyQuaternion(parentTurn);
  bone.quaternion.premultiply(turn.setFromAxisAngle(axis, angle));
}

const spot = new Vector3();

/** The rig's feet hang off the root, not the shins, so they have to be moved to wherever the shin now ends. */
function plant(shinEnd: Object3D | undefined, foot: Object3D | undefined) {
  if (!shinEnd || !foot?.parent) return;
  shinEnd.getWorldPosition(spot);
  foot.parent.updateWorldMatrix(true, false);
  foot.position.copy(foot.parent.worldToLocal(spot));
}

function Person({ look, anim, seed }: { look: Appearance; anim: Anim; seed: number }) {
  const bodyId = OUTFITS[look.figure][look.topStyle];
  const headId: ModelId = look.figure === "masc" && look.beard ? "m_adventurer" : HEADS[look.figure][look.hairStyle];
  const body = useGLTF(modelUrl(bodyId));
  const head = useGLTF(modelUrl(headId));
  const root = useMemo(
    () => assemble(body.scene, headId === bodyId ? null : head.scene),
    [body.scene, head.scene, headId, bodyId],
  );
  const headBone = useMemo(() => root.getObjectByName("Head"), [root]);
  const legs = useMemo(
    () =>
      ["UpperLegL", "UpperLegR", "LowerLegL", "LowerLegR", "LowerLegL_end", "LowerLegR_end", "FootL", "FootR"].map(
        (name) => root.getObjectByName(name),
      ),
    [root],
  );
  const pose = useRef<Group>(null);
  const mixer = useMemo(() => new AnimationMixer(root), [root]);
  const current = useRef<AnimationAction | null>(null);
  const hideHair = look.headwear !== "none" || DRAWN_HAIR.includes(look.hairStyle);

  useLayoutEffect(() => recolour(root, look, hideHair), [root, look, hideHair]);

  useEffect(
    () => () => {
      mixer.stopAllAction();
      mixer.uncacheRoot(root);
    },
    [mixer, root],
  );

  useEffect(() => {
    const clip = body.animations.find((entry) => entry.name === CLIPS[anim]) ?? body.animations[0];
    if (!clip) return;
    const next = mixer.clipAction(clip);
    next.timeScale = anim === "walk" ? 1.5 : 1;
    if (current.current === next) return;
    next.reset();
    next.time = (seed * 0.731) % clip.duration;
    next.play();
    if (current.current) next.crossFadeFrom(current.current, 0.2, false);
    current.current = next;
  }, [anim, body.animations, mixer, seed]);

  useFrame(({ clock }, delta) => {
    mixer.update(Math.min(delta, 0.1));
    const group = pose.current;
    if (!group) return;
    const t = clock.elapsedTime + seed;
    group.position.set(0, 0, 0);
    group.rotation.set(0, 0, 0);
    if (anim === "sit") {
      group.position.y = -0.24;
      group.getWorldQuaternion(rootTurn);
      bend(legs[0], -Math.PI / 2);
      bend(legs[1], -Math.PI / 2);
      bend(legs[2], Math.PI / 2);
      bend(legs[3], Math.PI / 2);
      plant(legs[4], legs[6]);
      plant(legs[5], legs[7]);
    } else if (anim === "sleep") {
      group.rotation.x = -Math.PI / 2;
      group.position.set(0, 0.2, 0.45);
    } else if (anim === "dance") {
      group.position.y = Math.abs(Math.sin(t * 6)) * 0.03;
      group.rotation.y = Math.sin(t * 3) * 0.5;
    }
  });

  const width = look.build === "slim" ? 0.93 : look.build === "broad" ? 1.1 : 1;
  return (
    <group ref={pose}>
      <group scale={[MODEL_SCALE * width, MODEL_SCALE, MODEL_SCALE * width]}>
        <primitive object={root} />
      </group>
      {headBone
        ? createPortal(
            <group scale={0.01}>
              <HeadExtras look={look} />
            </group>,
            headBone,
          )
        : null}
    </group>
  );
}

export function Avatar({ look, anim, seed = 0 }: { look: Appearance; anim: Anim; seed?: number }) {
  return (
    <Suspense fallback={null}>
      <Person look={look} anim={anim} seed={seed} />
    </Suspense>
  );
}
