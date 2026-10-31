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
    pos: [0.5, 3.0, 9.8],
    target: [0.2, 1.8, -2.5],
  },
  2: {
    id: 2,
    label: "Màn LED Chữ Nhật",
    pos: [4.2, 3.6, 2.0],
    target: [8.2, 4.0, -1.8],
  },
  3: {
    id: 3,
    label: "Bục MC Trực Diện",
    pos: [-0.4, 1.55, 0.0],
    target: [1.4, 1.35, -2.8],
  },
  4: {
    id: 4,
    label: "Nguyệt Quế",
    pos: [2.8, 1.35, 2.4],
    target: [2.8, 0.9, 0.6],
  },
  5: {
    id: 5,
    label: "Cận Cảnh TS 1",
    pos: [-2.67, 1.55, -1.47],
    target: [-4.95, 1.35, -2.21],
  },
  6: {
    id: 6,
    label: "Cận Cảnh TS 2",
    pos: [-2.32, 1.55, -2.17],
    target: [-4.31, 1.35, -3.51],
  },
  7: {
    id: 7,
    label: "Cận Cảnh TS 3",
    pos: [-1.80, 1.55, -2.74],
    target: [-3.34, 1.35, -4.58],
  },
  8: {
    id: 8,
    label: "Cận Cảnh TS 4",
    pos: [-1.14, 1.55, -3.16],
    target: [-2.12, 1.35, -5.35],
  },
  9: {
    id: 9,
    label: "Cẩu Quay Jib",
    pos: [1.8, 4.2, 8.4],
    target: [-3.0, 1.4, -2.4],
  },
  10: {
    id: 10,
    label: "Vách Khoa Học",
    pos: [-0.6, 2.5, 2.4],
    target: [-5.4, 2.5, -3.2],
  },
};

interface CameraControllerProps {
  camAngle: number;
  transitionMode?: "CUT" | "MORPH";
  pushInProgress?: number;
  ptzYaw?: number;
  ptzPitch?: number;
  ptzZoom?: number;
  introStartedAt?: number | null;
  serverNow?: () => number;
}

export function CameraController({
  camAngle = 1,
  transitionMode = "CUT",
  pushInProgress = 0,
  ptzYaw = 0,
  ptzPitch = 0,
  ptzZoom = 1.0,
  introStartedAt = null,
  serverNow,
}: CameraControllerProps) {
  const { camera } = useThree();

  const currentPos = useRef(new THREE.Vector3(0, 2.5, 8.4));
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
    // 0. Opening Sequence Camera Director:
    // User Requirement: "khi mở đầu, zoom out từ góc quay bục MC (nơi chứa màn lục giác), lúc bắt đầu trường quay sẽ tối hẳn..."
    if (introStartedAt) {
      const now = serverNow ? serverNow() : Date.now();
      const elapsedSec = (now - introStartedAt) / 1000;
      if (elapsedSec < 20) {
        const startPos = new THREE.Vector3(-0.4, 1.55, 0.0);
        const startTarget = new THREE.Vector3(1.4, 1.35, -2.8);
        const endPos = new THREE.Vector3(0.5, 3.0, 9.8);
        const endTarget = new THREE.Vector3(0.2, 1.8, -2.5);

        // 0s -> 3.5s: Close up straight-on on MC area / starry night hexagon
        // 3.5s -> 16s: Smooth dolly zoom out to wide CAM 1
        // 16s -> 20s: Settle at CAM 1
        const t = Math.min(1.0, Math.max(0, (elapsedSec - 3.5) / 12.5));
        const smoothT = t * t * (3 - 2 * t);

        currentPos.current.lerpVectors(startPos, endPos, smoothT);
        currentTarget.current.lerpVectors(startTarget, endTarget, smoothT);

        camera.position.copy(currentPos.current);
        camera.lookAt(currentTarget.current);
        camera.updateProjectionMatrix();
        return;
      }
    }

    // 1. Calculate subtle broadcast push-in (dolly) towards target
    const effectivePos = targetPos.clone();
    if (pushInProgress > 0) {
      const dir = targetLookAt.clone().sub(targetPos).normalize();
      effectivePos.addScaledVector(dir, pushInProgress * 0.40);
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
