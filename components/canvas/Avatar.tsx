"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { DoubleSide, Vector2, type Group, type Mesh } from "three";
import type { Anim, Appearance } from "@/lib/sim/types";
import { shadeHex as shade } from "./colour";

const HEAD_Y = 0.66;
const HEAD_R = 0.12;

function Mat({ color, rough = 0.75 }: { color: string; rough?: number }) {
  return <meshStandardMaterial color={color} roughness={rough} />;
}

function Hair({ look }: { look: Appearance }) {
  const c = look.hairColor;
  const covered = look.headwear === "hijab" || look.headwear === "turban" || look.headwear === "headwrap";
  if (covered || look.hairStyle === "bald") return null;
  const cap = (scale = 1.06, squash = 0.62) => (
    <mesh position={[0, HEAD_Y + 0.012, -0.012]} rotation={[-0.38, 0, 0]} scale={[scale, squash * scale + 0.38, scale]}>
      <sphereGeometry args={[HEAD_R, 18, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
      <Mat color={c} />
    </mesh>
  );
  switch (look.hairStyle) {
    case "buzz":
      return cap(1.02, 0.55);
    case "fade":
      return cap(1.04, 0.7);
    case "short":
      return cap(1.08, 0.75);
    case "afro":
      return (
        <mesh position={[0, HEAD_Y + 0.055, -0.045]} scale={[1.05, 0.95, 0.9]}>
          <sphereGeometry args={[0.155, 20, 16]} />
          <Mat color={c} rough={0.95} />
        </mesh>
      );
    case "curly":
      return (
        <group>
          {cap(1.08, 0.8)}
          {[
            [-0.08, 0.1, 0.02],
            [0.08, 0.1, 0.02],
            [0, 0.13, -0.02],
            [-0.1, 0.05, -0.06],
            [0.1, 0.05, -0.06],
            [0, 0.08, -0.1],
          ].map(([x, y, z], index) => (
            <mesh key={index} position={[x ?? 0, HEAD_Y + (y ?? 0), z ?? 0]}>
              <sphereGeometry args={[0.055, 10, 8]} />
              <Mat color={c} rough={0.95} />
            </mesh>
          ))}
        </group>
      );
    case "long":
      return (
        <group>
          {cap(1.1, 0.8)}
          <mesh position={[0, HEAD_Y - 0.1, -0.07]}>
            <boxGeometry args={[0.25, 0.26, 0.09]} />
            <Mat color={c} />
          </mesh>
        </group>
      );
    case "ponytail":
      return (
        <group>
          {cap(1.08, 0.78)}
          <mesh position={[0, HEAD_Y - 0.02, -0.15]} rotation={[0.5, 0, 0]}>
            <capsuleGeometry args={[0.035, 0.14, 4, 8]} />
            <Mat color={c} />
          </mesh>
        </group>
      );
    case "bun":
      return (
        <group>
          {cap(1.07, 0.78)}
          <mesh position={[0, HEAD_Y + 0.13, -0.06]}>
            <sphereGeometry args={[0.06, 12, 10]} />
            <Mat color={c} />
          </mesh>
        </group>
      );
    case "braids":
    case "locs": {
      const thick = look.hairStyle === "locs" ? 0.026 : 0.018;
      const angles = [-1.9, -1.4, -0.9, -0.45, 0, 0.45, 0.9, 1.4, 1.9];
      return (
        <group>
          {cap(1.08, 0.78)}
          {angles.map((angle, index) => (
            <mesh
              key={index}
              position={[Math.sin(angle) * 0.115, HEAD_Y - 0.09, -Math.cos(angle) * 0.1]}
            >
              <capsuleGeometry args={[thick, 0.2, 4, 6]} />
              <Mat color={c} rough={0.9} />
            </mesh>
          ))}
        </group>
      );
    }
    case "cornrows":
      return (
        <group>
          {cap(1.03, 0.62)}
          {[-0.05, 0, 0.05].map((x) => (
            <mesh key={x} position={[x, HEAD_Y + 0.095, -0.01]} rotation={[0, 0, 0]}>
              <boxGeometry args={[0.018, 0.02, 0.2]} />
              <Mat color={shade(c, -0.08)} />
            </mesh>
          ))}
        </group>
      );
    default:
      return cap();
  }
}

function Headwear({ look }: { look: Appearance }) {
  const c = look.headwearColor;
  switch (look.headwear) {
    case "hijab":
      return (
        <group>
          <mesh position={[0, HEAD_Y + 0.005, -0.01]}>
            <sphereGeometry args={[HEAD_R * 1.18, 20, 14, (5 * Math.PI) / 6, (4 * Math.PI) / 3]} />
            <meshStandardMaterial color={c} roughness={0.8} side={DoubleSide} />
          </mesh>
          <mesh position={[0, HEAD_Y - 0.13, -0.005]}>
            <cylinderGeometry args={[0.1, 0.17, 0.12, 16]} />
            <Mat color={c} rough={0.8} />
          </mesh>
        </group>
      );
    case "turban":
      return (
        <group>
          <mesh position={[0, HEAD_Y + 0.07, -0.01]} scale={[1, 0.8, 1.05]}>
            <sphereGeometry args={[HEAD_R * 1.15, 18, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <Mat color={c} rough={0.8} />
          </mesh>
          <mesh position={[0, HEAD_Y + 0.06, -0.01]} rotation={[0.25, 0, 0]}>
            <torusGeometry args={[HEAD_R * 1.02, 0.03, 8, 20]} />
            <Mat color={shade(c, -0.06)} rough={0.8} />
          </mesh>
        </group>
      );
    case "headwrap":
      return (
        <group>
          <mesh position={[0, HEAD_Y + 0.09, -0.03]} rotation={[-0.35, 0, 0]}>
            <cylinderGeometry args={[0.11, 0.13, 0.17, 16]} />
            <Mat color={c} rough={0.8} />
          </mesh>
          <mesh position={[0.05, HEAD_Y + 0.19, -0.05]}>
            <sphereGeometry args={[0.06, 10, 8]} />
            <Mat color={shade(c, 0.06)} rough={0.8} />
          </mesh>
        </group>
      );
    case "cap":
      return (
        <group>
          <mesh position={[0, HEAD_Y + 0.03, 0]}>
            <sphereGeometry args={[HEAD_R * 1.1, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <Mat color={c} />
          </mesh>
          <mesh position={[0, HEAD_Y + 0.035, 0.14]}>
            <boxGeometry args={[0.18, 0.015, 0.11]} />
            <Mat color={shade(c, -0.08)} />
          </mesh>
        </group>
      );
    case "beanie":
      return (
        <group>
          <mesh position={[0, HEAD_Y + 0.035, 0]} scale={[1, 1.15, 1]}>
            <sphereGeometry args={[HEAD_R * 1.12, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <Mat color={c} rough={0.95} />
          </mesh>
          <mesh position={[0, HEAD_Y + 0.03, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[HEAD_R * 1.1, 0.022, 8, 20]} />
            <Mat color={shade(c, -0.08)} rough={0.95} />
          </mesh>
        </group>
      );
    default:
      return null;
  }
}

/** Head parts above are modelled around HEAD_Y/HEAD_R; this places and scales them on the body. */
const HEAD_CENTRE = 0.875;
const HEAD_SCALE = 0.86;
const HIP_Y = 0.46;
const SHOULDER_Y = 0.715;

function Face({ look }: { look: Appearance }) {
  const brow = look.hairStyle === "bald" ? shade(look.skin, -0.3) : look.hairColor;
  const z = HEAD_R * 0.93;
  return (
    <group>
      {[-1, 1].map((side) => (
        <group key={side}>
          <mesh position={[side * 0.04, HEAD_Y + 0.012, z]} scale={[1, 1.1, 0.5]}>
            <sphereGeometry args={[0.011, 10, 8]} />
            <meshStandardMaterial color="#1a1412" roughness={0.25} />
          </mesh>
          <mesh position={[side * 0.042, HEAD_Y + 0.04, z - 0.006]} rotation={[0, 0, Math.PI / 2 + side * 0.15]}>
            <capsuleGeometry args={[0.005, 0.026, 2, 6]} />
            <Mat color={brow} />
          </mesh>
          <mesh position={[side * HEAD_R * 0.93, HEAD_Y, -0.005]} scale={[0.45, 1, 0.75]}>
            <sphereGeometry args={[0.03, 10, 8]} />
            <Mat color={shade(look.skin, -0.04)} rough={0.6} />
          </mesh>
        </group>
      ))}
      <mesh position={[0, HEAD_Y - 0.012, z + 0.008]} scale={[0.8, 1, 1]}>
        <sphereGeometry args={[0.018, 10, 8]} />
        <Mat color={shade(look.skin, -0.05)} rough={0.6} />
      </mesh>
      <mesh position={[0, HEAD_Y - 0.052, z - 0.006]} rotation={[0, 0, Math.PI / 2]}>
        <capsuleGeometry args={[0.006, 0.028, 2, 6]} />
        <meshStandardMaterial color={shade(look.skin, -0.32)} roughness={0.5} />
      </mesh>
    </group>
  );
}

function Outfit({ look, width }: { look: Appearance; width: number }) {
  const top = look.top;
  const front = 0.058;
  switch (look.topStyle) {
    case "dress":
      return (
        <mesh position={[0, 0.37, 0]} castShadow>
          <cylinderGeometry args={[width * 0.48, width * 0.82, 0.26, 20]} />
          <Mat color={top} />
        </mesh>
      );
    case "kaftan":
      return (
        <group>
          <mesh position={[0, 0.36, 0]} castShadow>
            <cylinderGeometry args={[width * 0.52, width * 0.66, 0.3, 20]} />
            <Mat color={top} />
          </mesh>
          <mesh position={[0, 0.66, front]}>
            <boxGeometry args={[0.03, 0.12, 0.01]} />
            <Mat color="#e8c25a" rough={0.4} />
          </mesh>
        </group>
      );
    case "hoodie":
      return (
        <group>
          <mesh position={[0, 0.75, -0.05]} scale={[1.2, 0.7, 1]}>
            <sphereGeometry args={[0.06, 12, 8]} />
            <Mat color={shade(top, -0.06)} />
          </mesh>
          <mesh position={[0, 0.54, front - 0.007]}>
            <boxGeometry args={[width * 0.5, 0.065, 0.012]} />
            <Mat color={shade(top, -0.08)} />
          </mesh>
          {[-0.02, 0.02].map((x) => (
            <mesh key={x} position={[x, 0.68, front + 0.004]}>
              <capsuleGeometry args={[0.003, 0.05, 2, 4]} />
              <Mat color="#f4f1ea" />
            </mesh>
          ))}
        </group>
      );
    case "jacket":
    case "blazer": {
      const shirt = look.topStyle === "blazer" ? "#f4f1ea" : shade(top, 0.3);
      return (
        <group>
          <mesh position={[0, 0.63, front]}>
            <boxGeometry args={[0.05, 0.2, 0.01]} />
            <Mat color={shirt} />
          </mesh>
          {[-1, 1].map((side) => (
            <mesh key={side} position={[side * 0.034, 0.67, front + 0.004]} rotation={[0, 0, side * 0.35]}>
              <boxGeometry args={[0.02, 0.1, 0.008]} />
              <Mat color={shade(top, -0.12)} />
            </mesh>
          ))}
          {look.topStyle === "blazer" ? (
            <mesh position={[0, 0.64, front + 0.008]}>
              <boxGeometry args={[0.016, 0.13, 0.006]} />
              <Mat color="#8b2e3a" />
            </mesh>
          ) : null}
        </group>
      );
    }
    default:
      return (
        <mesh position={[0, 0.735, 0.02]} rotation={[Math.PI / 2, 0, 0]} scale={[1, 0.7, 1]}>
          <torusGeometry args={[0.036, 0.008, 6, 16]} />
          <Mat color={shade(top, -0.1)} />
        </mesh>
      );
  }
}

/** A tapered limb hanging down from its joint, with a rounded end so the next segment blends in. */
function Limb({ top, bottom, length, color }: { top: number; bottom: number; length: number; color: string }) {
  return (
    <group>
      <mesh position={[0, -length / 2, 0]}>
        <cylinderGeometry args={[top, bottom, length, 14, 1, true]} />
        <Mat color={color} rough={0.7} />
      </mesh>
      <mesh position={[0, -length, 0]}>
        <sphereGeometry args={[bottom, 14, 10]} />
        <Mat color={color} rough={0.7} />
      </mesh>
    </group>
  );
}

/** Radius-by-height profiles, turned on a lathe and flattened front to back. */
const TORSO_PROFILE: [number, number][] = [
  [0.07, 0.49],
  [0.074, 0.53],
  [0.07, 0.57],
  [0.078, 0.63],
  [0.088, 0.68],
  [0.09, 0.71],
  [0.078, 0.74],
  [0.05, 0.765],
  [0.032, 0.775],
  [0.001, 0.778],
];
const PELVIS_PROFILE: [number, number][] = [
  [0.001, 0.4],
  [0.05, 0.405],
  [0.075, 0.43],
  [0.08, 0.46],
  [0.074, 0.5],
  [0.07, 0.52],
];

function Lathe({ profile, color, width, depth = 0.68 }: { profile: [number, number][]; color: string; width: number; depth?: number }) {
  const points = useMemo(() => profile.map(([r, y]) => new Vector2(r, y)), [profile]);
  return (
    <mesh scale={[width / 0.18, 1, depth]}>
      <latheGeometry args={[points, 24]} />
      <Mat color={color} rough={0.75} />
    </mesh>
  );
}

export function Avatar({ look, anim, seed = 0 }: { look: Appearance; anim: Anim; seed?: number }) {
  const body = useRef<Group>(null);
  const chest = useRef<Group>(null);
  const leftArm = useRef<Group>(null);
  const rightArm = useRef<Group>(null);
  const leftElbow = useRef<Group>(null);
  const rightElbow = useRef<Group>(null);
  const leftLeg = useRef<Group>(null);
  const rightLeg = useRef<Group>(null);
  const leftKnee = useRef<Group>(null);
  const rightKnee = useRef<Group>(null);
  const width = look.build === "slim" ? 0.19 : look.build === "broad" ? 0.26 : 0.22;
  const legGap = width * 0.22;
  const armX = width / 2 + 0.006;
  const style = look.topStyle;
  const upperArm = style === "dress" ? look.skin : look.top;
  const foreArm = style === "dress" || style === "tee" ? look.skin : look.top;
  const shin = style === "dress" ? look.skin : look.bottom;
  const hips = style === "dress" || style === "kaftan" ? look.top : look.bottom;
  const skinDark = useMemo(() => shade(look.skin, -0.06), [look.skin]);

  useEffect(() => {
    body.current?.traverse((node) => {
      if ((node as Mesh).isMesh) node.castShadow = true;
    });
  }, [look]);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime + seed;
    const root = body.current;
    const torso = chest.current;
    const la = leftArm.current;
    const ra = rightArm.current;
    const le = leftElbow.current;
    const re = rightElbow.current;
    const ll = leftLeg.current;
    const rl = rightLeg.current;
    const lk = leftKnee.current;
    const rk = rightKnee.current;
    if (!root || !torso || !la || !ra || !le || !re || !ll || !rl || !lk || !rk) return;
    root.position.set(0, 0, 0);
    root.rotation.set(0, 0, 0);
    torso.rotation.set(0, 0, 0);
    torso.scale.set(1, 1, 1);
    la.rotation.set(0, 0, -0.13);
    ra.rotation.set(0, 0, 0.13);
    le.rotation.set(-0.15, 0, 0);
    re.rotation.set(-0.15, 0, 0);
    ll.rotation.set(0, 0, 0);
    rl.rotation.set(0, 0, 0);
    lk.rotation.set(0, 0, 0);
    rk.rotation.set(0, 0, 0);
    switch (anim) {
      case "walk": {
        const phase = t * 9;
        const swing = Math.sin(phase) * 0.5;
        ll.rotation.x = swing;
        rl.rotation.x = -swing;
        lk.rotation.x = 0.1 + Math.max(0, Math.sin(phase + 1.4)) * 0.7;
        rk.rotation.x = 0.1 + Math.max(0, Math.sin(phase + 1.4 + Math.PI)) * 0.7;
        la.rotation.x = -swing * 0.75;
        ra.rotation.x = swing * 0.75;
        le.rotation.x = -0.35;
        re.rotation.x = -0.35;
        root.position.y = Math.abs(Math.cos(phase)) * 0.012;
        torso.rotation.y = Math.sin(phase) * 0.06;
        break;
      }
      case "sit":
        root.position.y = -0.28;
        ll.rotation.x = -Math.PI / 2;
        rl.rotation.x = -Math.PI / 2;
        lk.rotation.x = Math.PI / 2;
        rk.rotation.x = Math.PI / 2;
        la.rotation.x = -0.35;
        ra.rotation.x = -0.35;
        le.rotation.x = -0.7;
        re.rotation.x = -0.7;
        torso.scale.y = 1 + Math.sin(t * 2) * 0.01;
        break;
      case "sleep":
        root.rotation.x = -Math.PI / 2;
        root.position.set(0, 0.2, 0.45);
        torso.scale.y = 1 + Math.sin(t * 1.3) * 0.02;
        lk.rotation.x = 0.08;
        rk.rotation.x = 0.08;
        break;
      case "eat": {
        const lift = (Math.sin(t * 3) + 1) / 2;
        ra.rotation.x = -0.45 - lift * 0.35;
        re.rotation.x = -1.5 - lift * 0.4;
        la.rotation.x = -0.3;
        le.rotation.x = -1.1;
        break;
      }
      case "shower":
        la.rotation.set(-2.7 + Math.sin(t * 8) * 0.2, 0, -0.25);
        ra.rotation.set(-2.7 + Math.cos(t * 8) * 0.2, 0, 0.25);
        le.rotation.x = -0.9;
        re.rotation.x = -0.9;
        root.position.y = Math.abs(Math.sin(t * 4)) * 0.01;
        break;
      case "dance": {
        const beat = t * 6;
        root.position.y = Math.abs(Math.sin(beat)) * 0.04;
        root.rotation.y = Math.sin(t * 3) * 0.5;
        la.rotation.set(-2.3 + Math.sin(beat) * 0.5, 0, -0.35);
        ra.rotation.set(-0.6 - Math.cos(beat) * 0.6, 0, 0.35);
        le.rotation.x = -0.6;
        re.rotation.x = -0.9;
        ll.rotation.x = Math.sin(beat) * 0.25;
        rl.rotation.x = -Math.sin(beat) * 0.25;
        lk.rotation.x = 0.2 + Math.max(0, Math.sin(beat)) * 0.4;
        rk.rotation.x = 0.2 + Math.max(0, -Math.sin(beat)) * 0.4;
        break;
      }
      case "work":
        la.rotation.x = -0.5;
        ra.rotation.x = -0.5;
        le.rotation.x = -1 + Math.sin(t * 16) * 0.06;
        re.rotation.x = -1 + Math.cos(t * 16) * 0.06;
        break;
      default:
        torso.scale.y = 1 + Math.sin(t * 2) * 0.008;
        la.rotation.z = -0.13 - Math.sin(t * 2) * 0.02;
        ra.rotation.z = 0.13 + Math.sin(t * 2) * 0.02;
    }
  });

  const leg = (side: number, legRef: React.RefObject<Group | null>, kneeRef: React.RefObject<Group | null>) => (
    <group ref={legRef} position={[side * legGap, HIP_Y, 0]}>
      <Limb top={0.05} bottom={0.04} length={0.225} color={style === "dress" ? look.skin : look.bottom} />
      <group ref={kneeRef} position={[0, -0.225, 0]}>
        <Limb top={0.04} bottom={0.03} length={0.2} color={shin} />
        <mesh position={[0, -0.212, 0.032]} scale={[0.95, 0.5, 1.9]}>
          <sphereGeometry args={[0.045, 16, 10]} />
          <Mat color={look.shoes} rough={0.45} />
        </mesh>
      </group>
    </group>
  );

  const arm = (side: number, armRef: React.RefObject<Group | null>, elbowRef: React.RefObject<Group | null>) => (
    <group ref={armRef} position={[side * armX, SHOULDER_Y, 0]}>
      <mesh>
        <sphereGeometry args={[0.036, 14, 10]} />
        <Mat color={upperArm} />
      </mesh>
      <Limb top={0.036} bottom={0.029} length={0.175} color={upperArm} />
      <group ref={elbowRef} position={[0, -0.175, 0]}>
        <Limb top={0.029} bottom={0.023} length={0.15} color={foreArm} />
        <mesh position={[0, -0.172, 0.004]} scale={[0.72, 1.15, 0.55]}>
          <sphereGeometry args={[0.032, 12, 10]} />
          <Mat color={look.skin} rough={0.6} />
        </mesh>
      </group>
    </group>
  );

  return (
    <group ref={body}>
      {leg(-1, leftLeg, leftKnee)}
      {leg(1, rightLeg, rightKnee)}
      <group ref={chest}>
        <Lathe profile={PELVIS_PROFILE} color={hips} width={width * 0.95} />
        <Lathe profile={TORSO_PROFILE} color={look.top} width={width} />
        <Outfit look={look} width={width} />
        {arm(-1, leftArm, leftElbow)}
        {arm(1, rightArm, rightElbow)}
        <mesh position={[0, 0.77, 0]}>
          <cylinderGeometry args={[0.03, 0.035, 0.07, 12]} />
          <Mat color={skinDark} />
        </mesh>
        <group position={[0, HEAD_CENTRE - HEAD_Y * HEAD_SCALE, 0]} scale={HEAD_SCALE}>
          <mesh position={[0, HEAD_Y, 0]} scale={[0.93, 1.07, 0.98]}>
            <sphereGeometry args={[HEAD_R, 24, 18]} />
            <Mat color={look.skin} rough={0.55} />
          </mesh>
          <Face look={look} />
          {look.beard ? (
            <mesh position={[0, HEAD_Y - 0.06, 0.022]} scale={[0.92, 0.6, 0.85]}>
              <sphereGeometry args={[0.1, 16, 10, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2]} />
              <Mat color={look.hairColor} rough={0.95} />
            </mesh>
          ) : null}
          <Hair look={look} />
          <Headwear look={look} />
        </group>
      </group>
    </group>
  );
}
