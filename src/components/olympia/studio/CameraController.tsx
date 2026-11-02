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
    pos: [0.0, 4.4, 12.8],
    target: [0.2, 1.8, -3.5],
  },
  2: {
    id: 2,
    label: "Màn LED Chữ Nhật",
    pos: [1.8, 2.6, 0.8],
    target: [5.8, 3.2, -2.2],
  },
  3: {
    id: 3,
    label: "Bục MC & Cổng Lục Giác",
    // 100% Coaxial Direct Angle into MC Desk & Grounded Hexagon Arch (Perfect Centering)
    pos: [2.10, 1.45, -3.16],
    target: [3.00, 1.45, -6.70],
  },
  4: {
    id: 4,
    label: "Bục Vòng Nguyệt Quế",
    pos: [0.2, 1.65, 5.6],
    target: [1.8, 0.75, 2.6],
  },
  5: {
    id: 5,
    label: "Cận Cảnh TS 1",
    pos: [-4.2, 1.55, -1.75],
    target: [-6.30, 1.50, -2.40],
  },
  6: {
    id: 6,
    label: "Cận Cảnh TS 2",
    pos: [-3.8, 1.55, -2.45],
    target: [-6.00, 1.50, -3.35],
  },
  7: {
    id: 7,
    label: "Cận Cảnh TS 3",
    pos: [-3.3, 1.55, -3.20],
    target: [-5.55, 1.50, -4.20],
  },
  8: {
    id: 8,
    label: "Cận Cảnh TS 4",
    pos: [-2.7, 1.55, -3.85],
    target: [-4.98, 1.50, -4.95],
  },
  9: {
    id: 9,
    label: "Cẩu Quay Jib",
    pos: [-1.4, 5.5, -0.6],
    target: [0.8, 1.8, -3.2],
  },
  10: {
    id: 10,
    label: "Vách Khoa Học",
    pos: [0.4, 2.5, 2.2],
    target: [-5.8, 2.5, -3.2],
  },
  11: {
    id: 11,
    label: "Khán Đài Khán Giả",
    pos: [0.0, 2.10, 3.60],
    target: [0.0, 2.70, 12.30],
  },
  12: {
    id: 12,
    label: "Khán Đài Góc Cao",
    pos: [-1.8, 4.6, 3.8],
    target: [0.0, 2.50, 12.1],
  },
  13: {
    id: 13,
    label: "Cổng Vòm & Đỉnh Núi",
    pos: [0.0, 3.35, 6.20],
    target: [0.0, 3.90, 13.55],
  },
  14: {
    id: 14,
    label: "Góc Thấp Khởi Động",
    // Iconic Low-Angle Hero Shot per Image 4 (Floor level behind & left of Laurel Vitrine, tilting up across stage)
    pos: [0.90, 0.42, 4.20],
    target: [1.60, 1.80, -3.20],
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
  const { camera, size } = useThree();

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
    // 0. True Optical Zoom & Adaptive FOV Calculation
    if (camera instanceof THREE.PerspectiveCamera) {
      const baseFov = 46;
      const aspect = size.width / Math.max(1, size.height);
      const targetAspect = 16 / 9;
      let calculatedFov = baseFov;

      // Adaptive horizontal FOV for mobile/portrait screens
      if (aspect < targetAspect) {
        const radBaseFov = (baseFov * Math.PI) / 360;
        const radAdaptedFov = 2 * Math.atan(Math.tan(radBaseFov) * (targetAspect / Math.max(0.48, aspect)));
        calculatedFov = Math.min(72, Math.max(baseFov, (radAdaptedFov * 180) / Math.PI));
      }

      // True Optical Zoom: Narrow/widen field of view (focal length change)
      const opticalFov = calculatedFov / Math.max(0.25, ptzZoom);
      const pushFov = pushInProgress > 0 ? opticalFov * (1.0 - pushInProgress * 0.12) : opticalFov;
      camera.fov = THREE.MathUtils.damp(camera.fov, Math.min(85, Math.max(12, pushFov)), 6.0, delta);
    }
    // 0. Opening Sequence Camera Director:
    // User Requirement: "không chỉ có animation, mà phải có hiệu ứng zoom lên từng lượt nữa (hiệu ứng này chỉ có khi mở đầu)"
    // 3-Wave Zoom Waves directed straight through the standing hexagonal portal, then cinematic dolly pull-out to CAM 1 (Wide Master Shot)
    if (introStartedAt) {
      const now = serverNow ? serverNow() : Date.now();
      const elapsedSec = (now - introStartedAt) / 1000;
      if (elapsedSec < 15) {
        const portalTarget = new THREE.Vector3(3.48, 2.3, -8.59);
        const cam1Pos = new THREE.Vector3(0.0, 4.4, 12.8);
        const cam1Target = new THREE.Vector3(0.2, 1.8, -3.5);

        let curPos: THREE.Vector3;
        let curTarget: THREE.Vector3;

        if (elapsedSec < 2.5) {
          // Wave 1 (0.0s - 2.5s): Quick surge from mid-distance towards hexagonal arch
          const t = elapsedSec / 2.5;
          const surge = Math.sin(t * Math.PI);
          const pStart = new THREE.Vector3(2.1, 2.8, 1.5);
          const pDeep = new THREE.Vector3(2.7, 1.9, -4.2);
          curPos = new THREE.Vector3().lerpVectors(pStart, pDeep, surge);
          curTarget = portalTarget.clone();
        } else if (elapsedSec < 5.5) {
          // Wave 2 (2.5s - 5.5s): Second surge penetrating deeper past the MC lectern
          const t = (elapsedSec - 2.5) / 3.0;
          const surge = Math.sin(t * Math.PI);
          const pStart = new THREE.Vector3(2.4, 2.2, -2.5);
          const pDeep = new THREE.Vector3(3.1, 1.7, -6.6);
          curPos = new THREE.Vector3().lerpVectors(pStart, pDeep, surge);
          curTarget = portalTarget.clone();
        } else if (elapsedSec < 8.5) {
          // Wave 3 (5.5s - 8.5s): Climax surge punching right into the inner portal & golden Olympia logo
          const t = (elapsedSec - 5.5) / 3.0;
          const surge = Math.sin(t * Math.PI * 0.5);
          const pStart = new THREE.Vector3(2.8, 1.9, -4.8);
          const pDeep = new THREE.Vector3(3.38, 2.1, -7.8);
          curPos = new THREE.Vector3().lerpVectors(pStart, pDeep, surge);
          curTarget = portalTarget.clone();
        } else {
          // Grand Reveal Pull-back (8.5s - 14.5s): Cinematic pull-back from deep portal out to CAM 1
          const t = Math.min(1.0, (elapsedSec - 8.5) / 5.5);
          const smoothT = t * t * (3 - 2 * t);
          const pStart = new THREE.Vector3(3.38, 2.1, -7.8);
          curPos = new THREE.Vector3().lerpVectors(pStart, cam1Pos, smoothT);
          curTarget = new THREE.Vector3().lerpVectors(portalTarget, cam1Target, smoothT);
        }

        currentPos.current.copy(curPos);
        currentTarget.current.copy(curTarget);

        camera.position.copy(curPos);
        camera.lookAt(curTarget);
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
