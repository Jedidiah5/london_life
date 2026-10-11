"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { DoubleSide, Group } from "three";
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
    <mesh position={[0, HEAD_Y + 0.015, -0.005]} scale={[scale, squash * scale + 0.38, scale]}>
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
        <mesh position={[0, HEAD_Y + 0.06, -0.02]}>
          <sphereGeometry args={[0.19, 18, 14]} />
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

function Outfit({ look, width }: { look: Appearance; width: number }) {
  const top = look.top;
  switch (look.topStyle) {
    case "dress":
      return (
        <mesh position={[0, 0.28, 0]}>
          <cylinderGeometry args={[width * 0.42, width * 0.75, 0.3, 16]} />
          <Mat color={top} />
        </mesh>
      );
    case "kaftan":
      return (
        <mesh position={[0, 0.25, 0]}>
          <boxGeometry args={[width + 0.02, 0.2, 0.17]} />
          <Mat color={top} />
        </mesh>
      );
    case "hoodie":
      return (
        <group>
          <mesh position={[0, HEAD_Y - 0.1, -0.08]}>
            <sphereGeometry args={[0.09, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <Mat color={shade(top, -0.05)} />
          </mesh>
          <mesh position={[0, 0.34, 0.085]}>
            <boxGeometry args={[width * 0.5, 0.06, 0.01]} />
            <Mat color={shade(top, -0.08)} />
          </mesh>
        </group>
      );
    case "jacket":
    case "blazer":
      return (
        <group>
          <mesh position={[0, 0.43, 0.082]}>
            <boxGeometry args={[0.06, 0.25, 0.005]} />
            <Mat color={look.topStyle === "blazer" ? "#f4f1ea" : shade(top, 0.25)} />
          </mesh>
          {look.topStyle === "blazer" ? (
            <mesh position={[0, 0.48, 0.086]}>
              <boxGeometry args={[0.02, 0.12, 0.005]} />
              <Mat color="#8b2e3a" />
            </mesh>
          ) : null}
        </group>
      );
    default:
      return null;
  }
}

export function Avatar({ look, anim, seed = 0 }: { look: Appearance; anim: Anim; seed?: number }) {
  const body = useRef<Group>(null);
  const leftArm = useRef<Group>(null);
  const rightArm = useRef<Group>(null);
  const leftLeg = useRef<Group>(null);
  const rightLeg = useRef<Group>(null);
  const width = look.build === "slim" ? 0.22 : look.build === "broad" ? 0.31 : 0.26;
  const legGap = width * 0.25;
  const longTop = look.topStyle === "dress" || look.topStyle === "kaftan";
  const skinDark = useMemo(() => shade(look.skin, -0.06), [look.skin]);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime + seed;
    const root = body.current;
    const la = leftArm.current;
    const ra = rightArm.current;
    const ll = leftLeg.current;
    const rl = rightLeg.current;
    if (!root || !la || !ra || !ll || !rl) return;
    root.position.set(0, 0, 0);
    root.rotation.set(0, 0, 0);
    la.rotation.set(0, 0, 0.08);
    ra.rotation.set(0, 0, -0.08);
    ll.rotation.set(0, 0, 0);
    rl.rotation.set(0, 0, 0);
    switch (anim) {
      case "walk": {
        const swing = Math.sin(t * 11) * 0.65;
        ll.rotation.x = swing;
        rl.rotation.x = -swing;
        la.rotation.x = -swing * 0.8;
        ra.rotation.x = swing * 0.8;
        root.position.y = Math.abs(Math.cos(t * 11)) * 0.02;
        break;
      }
      case "sit":
        root.position.y = -0.12;
        ll.rotation.x = -Math.PI / 2;
        rl.rotation.x = -Math.PI / 2;
        la.rotation.x = -0.35;
        ra.rotation.x = -0.35;
        break;
      case "sleep":
        root.rotation.x = -Math.PI / 2;
        root.position.set(0, 0.12, 0.25);
        la.rotation.z = 0.15 + Math.sin(t * 1.4) * 0.02;
        break;
      case "eat": {
        const lift = (Math.sin(t * 3) + 1) / 2;
        ra.rotation.x = -1.6 - lift * 0.7;
        ra.rotation.z = 0.35;
        la.rotation.x = -0.5;
        break;
      }
      case "shower":
        la.rotation.set(-2.6 + Math.sin(t * 8) * 0.25, 0, 0.3);
        ra.rotation.set(-2.6 + Math.cos(t * 8) * 0.25, 0, -0.3);
        root.position.y = Math.abs(Math.sin(t * 4)) * 0.015;
        break;
      case "dance": {
        root.position.y = Math.abs(Math.sin(t * 6)) * 0.07;
        root.rotation.y = Math.sin(t * 3) * 0.5;
        la.rotation.set(-2.4 + Math.sin(t * 6) * 0.5, 0, 0.4);
        ra.rotation.set(-0.5 - Math.cos(t * 6) * 0.6, 0, -0.4);
        ll.rotation.x = Math.sin(t * 6) * 0.3;
        rl.rotation.x = -Math.sin(t * 6) * 0.3;
        break;
      }
      case "work":
        la.rotation.x = -1.25 + Math.sin(t * 18) * 0.06;
        ra.rotation.x = -1.25 + Math.cos(t * 18) * 0.06;
        break;
      default:
        root.scale.y = 1 + Math.sin(t * 2) * 0.012;
        la.rotation.z = 0.08 + Math.sin(t * 2) * 0.03;
        ra.rotation.z = -0.08 - Math.sin(t * 2) * 0.03;
    }
  });

  const armX = width / 2 + 0.035;

  return (
    <group ref={body}>
      <group ref={leftLeg} position={[-legGap, 0.3, 0]}>
        <mesh position={[0, -0.13, 0]}>
          <capsuleGeometry args={[0.045, 0.18, 4, 8]} />
          <Mat color={look.bottom} />
        </mesh>
        <mesh position={[0, -0.27, 0.025]}>
          <boxGeometry args={[0.08, 0.05, 0.13]} />
          <Mat color={look.shoes} rough={0.5} />
        </mesh>
      </group>
      <group ref={rightLeg} position={[legGap, 0.3, 0]}>
        <mesh position={[0, -0.13, 0]}>
          <capsuleGeometry args={[0.045, 0.18, 4, 8]} />
          <Mat color={look.bottom} />
        </mesh>
        <mesh position={[0, -0.27, 0.025]}>
          <boxGeometry args={[0.08, 0.05, 0.13]} />
          <Mat color={look.shoes} rough={0.5} />
        </mesh>
      </group>
      <mesh position={[0, 0.43, 0]}>
        <boxGeometry args={[width, longTop ? 0.3 : 0.27, 0.16]} />
        <Mat color={look.top} />
      </mesh>
      <mesh position={[0, 0.31, 0]}>
        <boxGeometry args={[width * 0.94, 0.05, 0.15]} />
        <Mat color={longTop ? look.top : look.bottom} />
      </mesh>
      <Outfit look={look} width={width} />
      <group ref={leftArm} position={[-armX, 0.54, 0]}>
        <mesh position={[0, -0.11, 0]}>
          <capsuleGeometry args={[0.035, 0.16, 4, 8]} />
          <Mat color={look.topStyle === "dress" ? look.skin : look.top} />
        </mesh>
        <mesh position={[0, -0.23, 0]}>
          <sphereGeometry args={[0.035, 8, 8]} />
          <Mat color={look.skin} />
        </mesh>
      </group>
      <group ref={rightArm} position={[armX, 0.54, 0]}>
        <mesh position={[0, -0.11, 0]}>
          <capsuleGeometry args={[0.035, 0.16, 4, 8]} />
          <Mat color={look.topStyle === "dress" ? look.skin : look.top} />
        </mesh>
        <mesh position={[0, -0.23, 0]}>
          <sphereGeometry args={[0.035, 8, 8]} />
          <Mat color={look.skin} />
        </mesh>
      </group>
      <mesh position={[0, 0.58, 0]}>
        <cylinderGeometry args={[0.04, 0.045, 0.05, 10]} />
        <Mat color={skinDark} />
      </mesh>
      <mesh position={[0, HEAD_Y, 0]}>
        <sphereGeometry args={[HEAD_R, 20, 16]} />
        <Mat color={look.skin} rough={0.6} />
      </mesh>
      <mesh position={[-0.042, HEAD_Y + 0.01, HEAD_R - 0.012]}>
        <sphereGeometry args={[0.016, 8, 8]} />
        <meshStandardMaterial color="#141414" roughness={0.3} />
      </mesh>
      <mesh position={[0.042, HEAD_Y + 0.01, HEAD_R - 0.012]}>
        <sphereGeometry args={[0.016, 8, 8]} />
        <meshStandardMaterial color="#141414" roughness={0.3} />
      </mesh>
      <mesh position={[0, HEAD_Y - 0.045, HEAD_R - 0.01]} rotation={[0, 0, Math.PI / 2]}>
        <capsuleGeometry args={[0.006, 0.03, 2, 6]} />
        <meshStandardMaterial color={shade(look.skin, -0.25)} />
      </mesh>
      {look.beard ? (
        <mesh position={[0, HEAD_Y - 0.06, 0.035]} scale={[1, 0.75, 0.9]}>
          <sphereGeometry args={[0.1, 14, 10, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2]} />
          <Mat color={look.hairColor} rough={0.95} />
        </mesh>
      ) : null}
      <Hair look={look} />
      <Headwear look={look} />
    </group>
  );
}
