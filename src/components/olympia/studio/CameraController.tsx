"use client";

import { useRef, useEffect, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

export interface CameraPreset {
  id: number;
  label: string;
  pos: [number, number, number];
  target: [number, number, number];
}

/**
 * 10 Accurate Broadcast Camera Presets aligned with real VTV3 Studio S14 layout:
 * - CAM 1: Toàn Cảnh (Wide Studio View)
 * - CAM 2: Màn LED & Cổng Lục Giác
 * - CAM 3: Bục MC (Center Stage)
 * - CAM 4: Bục Vòng Nguyệt Quế (Tâm Phía Trước)
 * - CAM 5: Cận Cảnh TS 1 (Đỏ - Cánh Trái)
 * - CAM 6: Cận Cảnh TS 2 (Lam - Cánh Trái)
 * - CAM 7: Cận Cảnh TS 3 (Vàng - Cánh Trái)
 * - CAM 8: Cận Cảnh TS 4 (Lục - Cánh Trái)
 * - CAM 9: Cẩu Quay Toàn Cảnh (Jib Crane High-Angle)
 * - CAM 10: Vách Ký Hiệu Khoa Học
 */
export const OLYMPIA_CAM_PRESETS: Record<number, CameraPreset> = {
  1: {
    id: 1,
    label: "Toàn Cảnh",
    pos: [0.0, 2.5, 8.4],
    target: [0.0, 1.8, -2.8],
  },
  2: {
    id: 2,
    label: "Màn LED",
    pos: [0.0, 3.2, 2.5],
    target: [0.0, 3.6, -6.45],
  },
  3: {
    id: 3,
    label: "Bục MC",
    pos: [0.0, 1.6, -0.6],
    target: [0.0, 1.35, -2.8],
  },
  4: {
    id: 4,
    label: "Nguyệt Quế",
    pos: [0.0, 1.25, 4.0],
    target: [0.0, 0.9, 2.6],
  },
  5: {
    id: 5,
    label: "Cận Cảnh TS 1",
    pos: [-4.6, 1.35, -0.7],
    target: [-5.8, 0.95, -2.4],
  },
  6: {
    id: 6,
    label: "Cận Cảnh TS 2",
    pos: [-3.5, 1.35, -1.2],
    target: [-4.7, 0.95, -2.9],
  },
  7: {
    id: 7,
    label: "Cận Cảnh TS 3",
    pos: [-2.4, 1.35, -1.7],
    target: [-3.6, 0.95, -3.4],
  },
  8: {
    id: 8,
    label: "Cận Cảnh TS 4",
    pos: [-1.3, 1.35, -2.1],
    target: [-2.5, 0.95, -3.8],
  },
  9: {
    id: 9,
    label: "Cẩu Quay Jib",
    pos: [1.2, 3.2, 7.2],
    target: [-4.2, 1.4, -2.6],
  },
  10: {
    id: 10,
    label: "Vách Khoa Học",
    pos: [-3.4, 3.0, 0.5],
    target: [-5.8, 3.4, -3.6],
  },
};

interface CameraControllerProps {
  camAngle: number;
  transitionMode?: "CUT" | "MORPH";
  pushInProgress?: number;
  ptzYaw?: number;
  ptzPitch?: number;
  ptzZoom?: number;
}

export function CameraController({
  camAngle = 1,
  transitionMode = "CUT",
  pushInProgress = 0,
  ptzYaw = 0,
  ptzPitch = 0,
  ptzZoom = 1.0,
}: CameraControllerProps) {
  const { camera } = useThree();

  const currentPos = useRef(new THREE.Vector3(0, 3.2, 6.8));
  const currentTarget = useRef(new THREE.Vector3(0, 1.8, -2.8));

  const targetPreset = OLYMPIA_CAM_PRESETS[camAngle] || OLYMPIA_CAM_PRESETS[1];
  const targetPos = useMemo(() => new THREE.Vector3(...targetPreset.pos), [targetPreset]);
  const targetLookAt = useMemo(() => new THREE.Vector3(...targetPreset.target), [targetPreset]);

  // Handle instant cut on camera switch when mode is CUT
  useEffect(() => {
    if (transitionMode === "CUT") {
      currentPos.current.copy(targetPos);
      currentTarget.current.copy(targetLookAt);
    }
  }, [camAngle, transitionMode, targetPos, targetLookAt]);

  useFrame((_, delta) => {
    // 1. Calculate push-in (dolly) towards target
    const effectivePos = targetPos.clone();
    if (pushInProgress > 0) {
      const dir = targetLookAt.clone().sub(targetPos).normalize();
      effectivePos.addScaledVector(dir, pushInProgress * 1.5);
    }

    // 2. Smooth interpolation or instant positioning
    if (transitionMode === "CUT") {
      currentPos.current.copy(effectivePos);
      currentTarget.current.copy(targetLookAt);
    } else {
      // Morph transition (smooth damp)
      const lerpSpeed = Math.min(1.0, delta * 3.8);
      currentPos.current.lerp(effectivePos, lerpSpeed);
      currentTarget.current.lerp(targetLookAt, lerpSpeed);
    }

    // 3. Apply PTZ Orbit offsets
    const finalPos = currentPos.current.clone();
    if (ptzYaw !== 0 || ptzPitch !== 0 || ptzZoom !== 1.0) {
      const offset = finalPos.clone().sub(currentTarget.current);
      // Orbit around target
      offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), ptzYaw);
      const right = new THREE.Vector3(1, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), ptzYaw);
      offset.applyAxisAngle(right, ptzPitch);

      // Apply Zoom scaling (FOV zoom or distance reduction)
      offset.multiplyScalar(1.0 / ptzZoom);
      finalPos.copy(currentTarget.current).add(offset);
    }

    camera.position.copy(finalPos);
    camera.lookAt(currentTarget.current);
    camera.updateProjectionMatrix();
  });

  return null;
}
