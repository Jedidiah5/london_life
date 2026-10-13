"use client";

import { useEffect, useRef } from "react";
import type { Group, Mesh } from "three";

/** Built-in pieces with no model file. Local -z is the wall side; the front faces +z. */
export const BUILT_IN_MODELS = ["kitchenCooker", "kitchenCounter", "departuresBoard", "receiptCounter"] as const;
export type BuiltInModel = (typeof BUILT_IN_MODELS)[number];

export function isBuiltIn(model: string): model is BuiltInModel {
  return (BUILT_IN_MODELS as readonly string[]).includes(model);
}

const DEPTH = 0.62;
const BACK = -0.46;
const FRONT = BACK + DEPTH;
const BODY_HEIGHT = 0.84;
const TOP = 0.05;

function Carcass({ colour }: { colour: string }) {
  return (
    <>
      <mesh position={[0, 0.04, (BACK + FRONT) / 2 - 0.03]}>
        <boxGeometry args={[0.9, 0.08, DEPTH - 0.06]} />
        <meshStandardMaterial color="#3a3530" />
      </mesh>
      <mesh position={[0, 0.08 + (BODY_HEIGHT - 0.08) / 2, (BACK + FRONT) / 2]}>
        <boxGeometry args={[0.9, BODY_HEIGHT - 0.08, DEPTH]} />
        <meshStandardMaterial color={colour} />
      </mesh>
      <mesh position={[0, BODY_HEIGHT + TOP / 2, (BACK + FRONT) / 2 + 0.02]}>
        <boxGeometry args={[0.96, TOP, DEPTH + 0.06]} />
        <meshStandardMaterial color="#b08968" roughness={0.6} />
      </mesh>
    </>
  );
}

function Handle({ x, y, vertical = false }: { x: number; y: number; vertical?: boolean }) {
  return (
    <mesh position={[x, y, FRONT + 0.02]}>
      <boxGeometry args={vertical ? [0.025, 0.14, 0.025] : [0.16, 0.025, 0.025]} />
      <meshStandardMaterial color="#c9ccd1" metalness={0.6} roughness={0.3} />
    </mesh>
  );
}

function Counter() {
  return (
    <group>
      <Carcass colour="#e9e3d7" />
      {[-0.22, 0.22].map((x) => (
        <mesh key={x} position={[x, 0.43, FRONT + 0.004]}>
          <boxGeometry args={[0.42, 0.62, 0.01]} />
          <meshStandardMaterial color="#f3eee4" />
        </mesh>
      ))}
      <mesh position={[0, 0.8, FRONT + 0.004]}>
        <boxGeometry args={[0.86, 0.06, 0.01]} />
        <meshStandardMaterial color="#f3eee4" />
      </mesh>
      <Handle x={-0.06} y={0.62} vertical />
      <Handle x={0.06} y={0.62} vertical />
      <Handle x={0} y={0.8} />
      <group position={[-0.2, BODY_HEIGHT + TOP, -0.12]}>
        <mesh position={[0, 0.1, 0]}>
          <cylinderGeometry args={[0.07, 0.085, 0.2, 16]} />
          <meshStandardMaterial color="#c0392b" />
        </mesh>
        <mesh position={[0, 0.21, 0]}>
          <cylinderGeometry args={[0.03, 0.05, 0.03, 12]} />
          <meshStandardMaterial color="#2c2c2c" />
        </mesh>
        <mesh position={[0.09, 0.11, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.05, 0.012, 8, 16, Math.PI]} />
          <meshStandardMaterial color="#2c2c2c" />
        </mesh>
      </group>
      <mesh position={[0.18, BODY_HEIGHT + TOP + 0.012, 0]} rotation={[0, 0.3, 0]}>
        <boxGeometry args={[0.32, 0.024, 0.22]} />
        <meshStandardMaterial color="#d9b98c" />
      </mesh>
      <mesh position={[0.24, BODY_HEIGHT + TOP + 0.06, -0.2]}>
        <cylinderGeometry args={[0.045, 0.04, 0.09, 12]} />
        <meshStandardMaterial color="#f7f4ee" />
      </mesh>
    </group>
  );
}

function Cooker() {
  return (
    <group>
      <Carcass colour="#d9dde2" />
      <mesh position={[0, 0.4, FRONT + 0.004]}>
        <boxGeometry args={[0.8, 0.5, 0.01]} />
        <meshStandardMaterial color="#c3c8ce" metalness={0.3} roughness={0.4} />
      </mesh>
      <mesh position={[0, 0.38, FRONT + 0.011]}>
        <boxGeometry args={[0.58, 0.3, 0.005]} />
        <meshStandardMaterial color="#1d2126" roughness={0.2} />
      </mesh>
      <Handle x={0} y={0.6} />
      <mesh position={[0, 0.6, FRONT + 0.02]}>
        <boxGeometry args={[0.5, 0.025, 0.025]} />
        <meshStandardMaterial color="#c9ccd1" metalness={0.6} roughness={0.3} />
      </mesh>
      {[-0.27, -0.09, 0.09, 0.27].map((x) => (
        <mesh key={x} position={[x, 0.76, FRONT + 0.02]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.03, 0.03, 0.03, 12]} />
          <meshStandardMaterial color="#2c2f34" />
        </mesh>
      ))}
      <mesh position={[0, BODY_HEIGHT + TOP + 0.005, (BACK + FRONT) / 2 + 0.02]}>
        <boxGeometry args={[0.84, 0.012, DEPTH - 0.04]} />
        <meshStandardMaterial color="#22262b" roughness={0.25} />
      </mesh>
      {[
        [-0.2, -0.3],
        [0.2, -0.3],
        [-0.2, 0.0],
        [0.2, 0.0],
      ].map(([x, z]) => (
        <mesh key={`${x}-${z}`} position={[x, BODY_HEIGHT + TOP + 0.016, z]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.08, 0.012, 8, 24]} />
          <meshStandardMaterial color="#5b6168" />
        </mesh>
      ))}
      <group position={[0.2, BODY_HEIGHT + TOP + 0.02, 0]}>
        <mesh position={[0, 0.03, 0]}>
          <cylinderGeometry args={[0.1, 0.09, 0.05, 20]} />
          <meshStandardMaterial color="#3a3f45" metalness={0.4} roughness={0.4} />
        </mesh>
        <mesh position={[0.17, 0.045, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.012, 0.012, 0.16, 8]} />
          <meshStandardMaterial color="#1d2126" />
        </mesh>
      </group>
    </group>
  );
}

const BOARD_ROWS = [0.92, 0.7, 0.85, 0.6, 0.78];

/** A three-tile station-style board on two posts, amber rows under a purple header. */
function DeparturesBoard() {
  const panelZ = BACK + 0.08;
  return (
    <group>
      {[-1.25, 1.25].map((x) => (
        <mesh key={x} position={[x, 0.55, panelZ]}>
          <boxGeometry args={[0.07, 1.1, 0.07]} />
          <meshStandardMaterial color="#2a2733" />
        </mesh>
      ))}
      <mesh position={[0, 1.2, panelZ]}>
        <boxGeometry args={[2.7, 1.0, 0.08]} />
        <meshStandardMaterial color="#836ef9" />
      </mesh>
      <mesh position={[0, 1.18, panelZ + 0.045]}>
        <boxGeometry args={[2.56, 0.86, 0.01]} />
        <meshStandardMaterial color="#121019" roughness={0.3} />
      </mesh>
      <mesh position={[0, 1.53, panelZ + 0.052]}>
        <boxGeometry args={[2.4, 0.08, 0.005]} />
        <meshStandardMaterial color="#c9bdff" emissive="#836ef9" emissiveIntensity={0.9} />
      </mesh>
      {BOARD_ROWS.map((width, index) => (
        <mesh key={index} position={[-1.2 + (2.4 * width) / 2, 1.38 - index * 0.13, panelZ + 0.052]}>
          <boxGeometry args={[2.4 * width, 0.05, 0.005]} />
          <meshStandardMaterial color="#ffb000" emissive="#ffb000" emissiveIntensity={0.8} />
        </mesh>
      ))}
    </group>
  );
}

/** A plain counter with a little till printer and a curl of paper. */
function ReceiptCounter() {
  const top = BODY_HEIGHT + TOP;
  return (
    <group>
      <Carcass colour="#3b3550" />
      <mesh position={[0, 0.8, FRONT + 0.004]}>
        <boxGeometry args={[0.86, 0.05, 0.01]} />
        <meshStandardMaterial color="#836ef9" emissive="#836ef9" emissiveIntensity={0.4} />
      </mesh>
      <group position={[0, top, -0.08]}>
        <mesh position={[0, 0.07, 0]}>
          <boxGeometry args={[0.3, 0.14, 0.26]} />
          <meshStandardMaterial color="#e9e6f2" />
        </mesh>
        <mesh position={[0, 0.145, -0.04]}>
          <boxGeometry args={[0.2, 0.012, 0.02]} />
          <meshStandardMaterial color="#1d2126" />
        </mesh>
        <mesh position={[0, 0.2, -0.03]} rotation={[-0.25, 0, 0]}>
          <boxGeometry args={[0.16, 0.13, 0.004]} />
          <meshStandardMaterial color="#fffdf6" />
        </mesh>
        <mesh position={[0.1, 0.142, 0.08]}>
          <boxGeometry args={[0.05, 0.01, 0.05]} />
          <meshStandardMaterial color="#3ccf6e" emissive="#3ccf6e" emissiveIntensity={0.8} />
        </mesh>
      </group>
    </group>
  );
}

const PIECES: Record<BuiltInModel, () => React.JSX.Element> = {
  kitchenCooker: Cooker,
  kitchenCounter: Counter,
  departuresBoard: DeparturesBoard,
  receiptCounter: ReceiptCounter,
};

export function BuiltInPiece({ model }: { model: BuiltInModel }) {
  const root = useRef<Group>(null);
  useEffect(() => {
    root.current?.traverse((node) => {
      const mesh = node as Mesh;
      if (!mesh.isMesh) return;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
    });
  }, [model]);
  const Piece = PIECES[model];
  return (
    <group ref={root}>
      <Piece />
    </group>
  );
}
