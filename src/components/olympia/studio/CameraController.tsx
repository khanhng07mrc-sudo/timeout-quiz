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
export function getContestantCameraPreset(seatId: number, totalSeats: number = 4): CameraPreset {
  const activeCount = Math.min(8, Math.max(1, totalSeats));
  const radius = 6.6;
  const startPhi = activeCount > 4 ? 0.26 : 0.38;
  const endPhi = activeCount > 4 ? 1.31 : 1.13;
  const frac = activeCount === 1 ? 0.5 : seatId / (activeCount - 1);
  const phi = startPhi + frac * (endPhi - startPhi);

  const px = -radius * Math.cos(phi);
  const pz = -0.5 - radius * Math.sin(phi);

  const nx = Math.cos(phi);
  const nz = Math.sin(phi);

  // Distance from camera to podium (2.45m for direct medium close-up, perfectly centered on podium & contestant)
  const dist = 2.45;
  const camX = +(px + dist * nx).toFixed(3);
  const camY = 1.34;
  const camZ = +(pz + dist * nz).toFixed(3);

  const targetX = +px.toFixed(3);
  const targetY = 1.25;
  const targetZ = +pz.toFixed(3);

  return {
    id: 5 + seatId,
    label: `Cận Cảnh TS ${seatId + 1}`,
    pos: [camX, camY, camZ],
    target: [targetX, targetY, targetZ],
  };
}

export const OLYMPIA_CAM_PRESETS: Record<number, CameraPreset> = {
  1: {
    id: 1,
    label: "Toàn Cảnh",
    pos: [0.0, 4.4, 13.0],
    target: [-0.6, 1.8, -3.8],
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
    // Coaxial Medium Close-Up: Perfectly frames MC Desk (laptop + 16:9 screen) & MCs (Khánh Vy & Ngọc Huy)
    pos: [2.50, 1.30, -4.50],
    target: [3.00, 1.15, -6.70],
  },
  4: {
    id: 4,
    label: "Bục Vòng Nguyệt Quế",
    pos: [0.2, 1.65, 5.6],
    target: [1.8, 0.75, 2.6],
  },
  5: getContestantCameraPreset(0, 4),
  6: getContestantCameraPreset(1, 4),
  7: getContestantCameraPreset(2, 4),
  8: getContestantCameraPreset(3, 4),
  9: {
    id: 9,
    label: "Cẩu Quay Jib",
    pos: [-1.4, 5.5, -0.6],
    target: [0.8, 1.8, -3.2],
  },
  10: {
    id: 10,
    label: "Toàn Cảnh Bục Thí Sinh",
    // Expanded distance & elevated framing so all podiums (4 or 5) have generous margins without edge clipping
    pos: [0.85, 2.45, 0.45],
    target: [-4.40, 1.25, -4.60],
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
    // Floor level left of Laurel Vitrine, tilting up across stage
    pos: [-0.95, 0.40, 4.20],
    target: [-1.10, 1.65, -3.20],
  },
};

interface CameraControllerProps {
  totalSeats?: number;
  camAngle: number;
  transitionMode?: "CUT" | "MORPH";
  pushInProgress?: number;
  ptzYaw?: number;
  ptzPitch?: number;
  ptzZoom?: number;
  introStartedAt?: number | null;
  kdStartCooldownUntil?: number | null;
  serverNow?: () => number;
}

export function CameraController({
  camAngle = 1,
  totalSeats = 4,
  transitionMode = "CUT",
  pushInProgress = 0,
  ptzYaw = 0,
  ptzPitch = 0,
  ptzZoom = 1.0,
  introStartedAt = null,
  kdStartCooldownUntil = null,
  serverNow,
}: CameraControllerProps) {
  const { camera, size } = useThree();

  const currentPos = useRef(new THREE.Vector3(0, 2.5, 8.4));
  const currentTarget = useRef(new THREE.Vector3(0, 1.8, -2.8));

  const effectiveTotalSeats = totalSeats || 4;
  const isContestantCam =
    (camAngle >= 5 && camAngle <= 8 && camAngle - 5 < effectiveTotalSeats) ||
    (effectiveTotalSeats > 4 && camAngle >= 11 && camAngle < 11 + (effectiveTotalSeats - 4));
  const targetPreset = isContestantCam
    ? getContestantCameraPreset(
        camAngle >= 11 ? camAngle - 11 + 4 : camAngle - 5,
        effectiveTotalSeats
      )
    : (OLYMPIA_CAM_PRESETS[camAngle] || OLYMPIA_CAM_PRESETS[1]);
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
      const baseFov = 43;
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
      // Zoom smooth 100% -> 115% based on pushInProgress (0.0 to 1.0)
      const zoomFactor = 1.0 + Math.max(0, Math.min(1.0, pushInProgress)) * 0.15;
      const pushFov = opticalFov / zoomFactor;
      camera.fov = THREE.MathUtils.damp(camera.fov, Math.min(85, Math.max(12, pushFov)), 6.0, delta);
    }
    // 0. Opening Sequence Camera Director:
    // Starts from WIDE far away in darkness, then smoothly DOLLIES IN towards the MC lectern as lights rise and MCs step out
    if (introStartedAt) {
      const now = serverNow ? serverNow() : Date.now();
      const elapsedSec = (now - introStartedAt) / 1000;

      const cam1Pos = new THREE.Vector3(...OLYMPIA_CAM_PRESETS[1].pos);
      const cam1Target = new THREE.Vector3(...OLYMPIA_CAM_PRESETS[1].target);
      const mcClosePos = new THREE.Vector3(...OLYMPIA_CAM_PRESETS[3].pos);
      const mcCloseTarget = new THREE.Vector3(...OLYMPIA_CAM_PRESETS[3].target);

      let curPos: THREE.Vector3;
      let curTarget: THREE.Vector3;

      if (elapsedSec < 3.0) {
        // Phase 1 (0.0s - 3.0s): Atmospheric wide view from distance in dramatic darkness
        curPos = cam1Pos.clone();
        curTarget = cam1Target.clone();
      } else if (elapsedSec < 11.0) {
        // Phase 2 (3.0s - 11.0s): Continuous, majestic one-directional DOLLY IN towards MC Lectern as MCs step in from behind arch posts
        const t = (elapsedSec - 3.0) / 8.0;
        const smoothT = t * t * (3 - 2 * t);
        curPos = new THREE.Vector3().lerpVectors(cam1Pos, mcClosePos, smoothT);
        curTarget = new THREE.Vector3().lerpVectors(cam1Target, mcCloseTarget, smoothT);
      } else {
        // Phase 3 (11.0s onwards): Steadily hold at MC podium close-up until intro finishes or transition to round begins
        const holdElapsed = elapsedSec - 11.0;
        const breatheY = Math.sin(holdElapsed * 0.75) * 0.012;
        const breatheX = Math.cos(holdElapsed * 0.45) * 0.008;
        curPos = new THREE.Vector3(mcClosePos.x + breatheX, mcClosePos.y + breatheY, mcClosePos.z);
        curTarget = mcCloseTarget.clone();
      }

      currentPos.current.copy(curPos);
      currentTarget.current.copy(curTarget);

      camera.position.copy(curPos);
      camera.lookAt(curTarget);
      camera.updateProjectionMatrix();
      return;
    }

    // 0.1. Khởi Động Turn Start Smooth Sweep Director:
    // Starts low from floor level bottom-left of Laurel Vitrine, gently elevating & sweeping up towards stage/contestant
    if (kdStartCooldownUntil) {
      const now = serverNow ? serverNow() : Date.now();
      if (now < kdStartCooldownUntil) {
        const sweepStartPos = new THREE.Vector3(...OLYMPIA_CAM_PRESETS[14].pos);
        const sweepStartTarget = new THREE.Vector3(...OLYMPIA_CAM_PRESETS[14].target);
        const sweepEndPos = new THREE.Vector3(0.00, 3.80, 11.80);
        const sweepEndTarget = new THREE.Vector3(-0.60, 1.80, -3.80);

        const duration = 3500;
        const elapsed = Math.max(0, duration - (kdStartCooldownUntil - now));
        const t = Math.min(1.0, elapsed / duration);
        const smoothT = t * t * (3 - 2 * t);

        const curPos = new THREE.Vector3().lerpVectors(sweepStartPos, sweepEndPos, smoothT);
        const curTarget = new THREE.Vector3().lerpVectors(sweepStartTarget, sweepEndTarget, smoothT);

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
