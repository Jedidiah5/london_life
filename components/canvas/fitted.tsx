"use client";

import { useGLTF } from "@react-three/drei";
import { Suspense, useMemo } from "react";
import { Box3, Color, Mesh, MeshStandardMaterial, Vector3, type Object3D } from "three";

export function fitObject(source: Object3D, targetWidth: number, tint?: string, maxHeight = Infinity): Object3D {
  const clone = source.clone(true);
  clone.traverse((node) => {
    const mesh = node as Mesh;
    if (!mesh.isMesh) return;
    const sourceMaterial = mesh.material;
    if (Array.isArray(sourceMaterial)) return;
    const material = sourceMaterial.clone();
    if (tint && material instanceof MeshStandardMaterial) {
      material.color.multiply(new Color(tint));
    }
    mesh.material = material;
  });
  clone.updateMatrixWorld(true);
  const measured = new Box3().setFromObject(clone);
  const size = measured.getSize(new Vector3());
  const scale = Math.min(targetWidth / Math.max(size.x, size.z, 0.001), maxHeight / Math.max(size.y, 0.001));
  clone.scale.multiplyScalar(scale);
  clone.updateMatrixWorld(true);
  const fitted = new Box3().setFromObject(clone);
  const center = fitted.getCenter(new Vector3());
  clone.position.x -= center.x;
  clone.position.z -= center.z;
  clone.position.y -= fitted.min.y;
  return clone;
}

type FittedProps = {
  url: string;
  targetWidth: number;
  tint?: string;
  maxHeight?: number;
};

export function FittedModel(props: FittedProps) {
  return (
    <Suspense fallback={null}>
      <LoadedModel {...props} />
    </Suspense>
  );
}

function LoadedModel({ url, targetWidth, tint, maxHeight }: FittedProps) {
  const gltf = useGLTF(url);
  const object = useMemo(
    () => fitObject(gltf.scene, targetWidth, tint, maxHeight),
    [gltf.scene, targetWidth, tint, maxHeight],
  );
  return <primitive object={object} />;
}
