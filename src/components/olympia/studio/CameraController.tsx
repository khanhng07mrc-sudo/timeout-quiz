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
export function getContestantPodiumWorldPos(
  seatId: number,
  totalSeats: number = 4,
  y: number = 0.22
): [number, number, number] {
  const activeCount = Math.min(8, Math.max(1, totalSeats));
  const clampedSeat = Math.min(activeCount - 1, Math.max(0, seatId));
  const radius = 6.6;
  const startPhi = activeCount > 4 ? 0.26 : 0.38;
  const endPhi = activeCount > 4 ? 1.31 : 1.13;
  const frac = activeCount === 1 ? 0.5 : clampedSeat / (activeCount - 1);
  const phi = startPhi + frac * (endPhi - startPhi);

  const px = +(-radius * Math.cos(phi)).toFixed(3);
  const pz = +(-0.5 - radius * Math.sin(phi)).toFixed(3);
  return [px, y, pz];
}

export function getContestantCameraPreset(seatId: number, totalSeats: number = 4): CameraPreset {
  const activeCount = Math.min(8, Math.max(1, totalSeats));
  const clampedSeat = Math.min(activeCount - 1, Math.max(0, seatId));
  const radius = 6.6;
  const startPhi = activeCount > 4 ? 0.26 : 0.38;
  const endPhi = activeCount > 4 ? 1.31 : 1.13;
  const frac = activeCount === 1 ? 0.5 : clampedSeat / (activeCount - 1);
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
    id: clampedSeat < 4 ? 5 + clampedSeat : 25 + (clampedSeat - 4),
    label: `Cận Cảnh TS ${clampedSeat + 1}`,
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
    // Coaxial straight-on along desk & portal normal (rotY = -0.25 rad), framing full MC desk + both MCs + 3-tier Hexagon Portal
    pos: [2.30, 1.26, -3.94],
    target: [3.12, 1.02, -7.16],
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
    label: "Cam Cận Cảnh Trực Diện Chào Sân",
    // Broadcast eye-level Medium Close-Up (MCU) framing contestant from waist up, eliminating distracting grandstand spectator seats
    pos: [0.0, 1.85, 6.40],
    target: [0.0, 1.50, 10.20],
  },
  12: {
    id: 12,
    label: "Cam Chéo Khán Đài 3/4",
    // Dynamic 3/4 low-angle tracking shot separating contestant from grandstand spectators
    pos: [-2.60, 1.65, 6.00],
    target: [0.0, 1.25, 10.00],
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
  15: {
    id: 15,
    label: "Cận Cảnh Bục Về Đích",
    // Broadcast Medium Close-up on VeDich Center Podium & Contestant
    pos: [0.0, 1.38, 1.85],
    target: [0.0, 1.25, -0.40],
  },
  25: getContestantCameraPreset(4, 8),
  26: getContestantCameraPreset(5, 8),
  27: getContestantCameraPreset(6, 8),
  28: getContestantCameraPreset(7, 8),
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
  isIdleLobby?: boolean;
  serverNow?: () => number;
}

// Reusable scratch vectors hoisted outside useFrame to eliminate garbage collection sweeps in 60fps frame loop
const _cam1Pos = new THREE.Vector3();
const _cam1Target = new THREE.Vector3();
const _mcClosePos = new THREE.Vector3();
const _mcCloseTarget = new THREE.Vector3();
const _curPos = new THREE.Vector3();
const _curTarget = new THREE.Vector3();

// Intro Sequence Waypoints (Coaxial straight-on along rotY = -0.25 rad normal + 1:1 MC Dolly & Track)
// _mcTightPos / _mcTightTarget: Coaxial deep zoom into Hexagon Portal so empty MC desk (top Y <= 1.26m) is >54cm below frustum
export const _mcTightPos = new THREE.Vector3(2.98, 2.02, -6.65);
export const _mcTightTarget = new THREE.Vector3(3.48, 2.18, -8.59);
// _mcMediumPos / _mcMediumTarget: Coaxial wide-portal framing at t = 1.5s catching both MCs stepping outside left & right portal edges
export const _mcMediumPos = new THREE.Vector3(1.95, 1.86, -2.50);
export const _mcMediumTarget = new THREE.Vector3(3.32, 1.38, -7.90);
// _introTrackMidPos / _introTrackMidTarget: Bezier control waypoint tracking the 1:1 midpoint of both MCs walking across stage floor
export const _introTrackMidPos = new THREE.Vector3(0.95, 2.02, 1.65);
export const _introTrackMidTarget = new THREE.Vector3(1.85, 1.24, -3.80);
export const _wideStagePos = new THREE.Vector3(0.00, 4.40, 13.00);
export const _wideStageTarget = new THREE.Vector3(-0.60, 1.80, -3.80);
export const _centerStagePos = new THREE.Vector3(0.00, 1.95, 4.60);
export const _centerStageTarget = new THREE.Vector3(0.00, 1.15, -0.30);

// Opening Central Floor Focused & Crane Up Waypoints (0.0s - 7.0s, VTV3 Olympia 27 Broadcast Parity):
// Phase 1 (0.0s - 2.5s): Pitched downwards (~18-20°) focused precisely on central stage floor disc and laurel wreath / fire burst (Images 1-3)
export const _introFloorFocusPos = new THREE.Vector3(-1.75, 1.45, 3.10);
export const _introFloorFocusTarget = new THREE.Vector3(0.00, 0.188, -0.50);
// Phase 2 (2.5s - 7.0s): Crane elevates and smoothly tilts up as cyan bloom opens, revealing both MCs at center background (Image 4)
export const _introCraneUpPos = new THREE.Vector3(-1.20, 1.65, 4.20);
export const _introCraneUpTarget = new THREE.Vector3(0.00, 1.25, 0.00);
// Phase 3 (7.0s onwards): Instant Hard Cut directly to Frontal Center MC medium shot (Image 5)
export const _frontCenterMCPos = new THREE.Vector3(0.00, 1.35, 3.65);
export const _frontCenterMCTarget = new THREE.Vector3(0.00, 1.25, 0.00);
// Aliases for backwards compatibility with existing references
export const _introLowGroundPos = _introFloorFocusPos;
export const _introLowGroundTarget = _introFloorFocusTarget;
export const _introMidGroundPos = _introCraneUpPos;
export const _introMidGroundTarget = _introCraneUpTarget;

const _sweepStartPos = new THREE.Vector3();
const _sweepStartTarget = new THREE.Vector3();
const _sweepEndPos = new THREE.Vector3(0.00, 3.80, 11.80);
const _sweepEndTarget = new THREE.Vector3(-0.60, 1.80, -3.80);
const _effectivePos = new THREE.Vector3();
const _dir = new THREE.Vector3();
const _finalPos = new THREE.Vector3();
const _offset = new THREE.Vector3();
const _right = new THREE.Vector3();
const _axisY = new THREE.Vector3(0, 1, 0);
const _axisX = new THREE.Vector3(1, 0, 0);

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
  isIdleLobby = false,
  serverNow,
}: CameraControllerProps) {
  const { camera, size } = useThree();

  const currentPos = useRef(new THREE.Vector3(0, 2.5, 8.4));
  const currentTarget = useRef(new THREE.Vector3(0, 1.8, -2.8));

  const effectiveTotalSeats = totalSeats || 4;
  const isContestantCam =
    (camAngle >= 5 && camAngle <= 8) ||
    (camAngle >= 25 && camAngle <= 28);
  const targetPreset = isContestantCam
    ? getContestantCameraPreset(
        camAngle >= 25 ? camAngle - 25 + 4 : camAngle - 5,
        effectiveTotalSeats
      )
    : (OLYMPIA_CAM_PRESETS[camAngle] || OLYMPIA_CAM_PRESETS[1]);
  const targetPos = useMemo(
    () => (isIdleLobby && camAngle === 3 ? _mcTightPos.clone() : new THREE.Vector3(...targetPreset.pos)),
    [isIdleLobby, camAngle, targetPreset]
  );
  const targetLookAt = useMemo(
    () => (isIdleLobby && camAngle === 3 ? _mcTightTarget.clone() : new THREE.Vector3(...targetPreset.target)),
    [isIdleLobby, camAngle, targetPreset]
  );

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
      if (transitionMode === "CUT") {
        camera.fov = Math.min(85, Math.max(12, pushFov));
      } else {
        camera.fov = THREE.MathUtils.damp(camera.fov, Math.min(85, Math.max(12, pushFov)), 6.0, delta);
      }
    }
    // 0. Opening Sequence Camera Director (VTV3 Olympia 27 Broadcast Parity):
    // Phase 1 (0.0s - 2.5s): Camera stays pitched downwards (~18-20°) focused precisely on central floor dais [0, 0.188, -0.5],
    //                       capturing the golden laurel wreath and radiant fire burst (Images 1-3).
    // Phase 2 (2.5s - 7.0s): Crane elevates and smoothly tilts up to reveal 2 MCs as floor blooms into electric cyan (Image 4).
    //                       (Preserves timeline references: elapsedSec < 4.0 and elapsedSec < 6.0)
    // Phase 3 (7.0s onwards): Instant hard cut (0s transition) directly to Frontal Center MC medium shot (Image 5)
    //                       with subtle broadcast breathing (Math.sin(holdElapsed * 0.45)).
    if (introStartedAt) {
      const now = serverNow ? serverNow() : Date.now();
      const elapsedSec = Math.max(0, (now - introStartedAt) / 1000);

      if (elapsedSec < 2.5) {
        // Phase 1 (0.0s - 2.5s): Chĩa chính xác vào tâm mặt sàn trung tâm [0, 0.188, -0.5] (dốc xuống ~20°)
        const p = elapsedSec / 2.5;
        const driftX = Math.sin(p * Math.PI * 0.5) * 0.05;
        const driftY = Math.sin(p * Math.PI * 0.5) * 0.03;
        _curPos.set(
          _introFloorFocusPos.x + driftX,
          _introFloorFocusPos.y + driftY,
          _introFloorFocusPos.z
        );
        _curTarget.copy(_introFloorFocusTarget);
      } else if (elapsedSec < 7.0) {
        // Phase 2 (2.5s - 7.0s): Cẩu lướt nâng cao kết hợp ngửa dần lên ngực 2 MC
        const t = (elapsedSec - 2.5) / 4.5;
        const smoothT = t * t * (3 - 2 * t);
        _curPos.lerpVectors(_introFloorFocusPos, _introCraneUpPos, smoothT);
        _curTarget.lerpVectors(_introFloorFocusTarget, _introCraneUpTarget, smoothT);
      } else {
        // Phase 3 (7.0s onwards): Instant hard cut (0s transition) to Frontal Center MC Medium Shot
        const holdElapsed = elapsedSec - 7.0;
        const breatheY = Math.sin(holdElapsed * 0.75) * 0.010;
        const breatheX = Math.sin(holdElapsed * 0.45) * 0.008;
        _curPos.set(_frontCenterMCPos.x + breatheX, _frontCenterMCPos.y + breatheY, _frontCenterMCPos.z);
        _curTarget.set(_frontCenterMCTarget.x, _frontCenterMCTarget.y + breatheY * 0.5, _frontCenterMCTarget.z);
      }

      currentPos.current.copy(_curPos);
      currentTarget.current.copy(_curTarget);

      camera.position.copy(_curPos);
      camera.lookAt(_curTarget);
      camera.updateProjectionMatrix();
      return;
    }

    // 0.1. Khởi Động Turn Start Smooth Sweep Director:
    // Starts low from floor level bottom-left of Laurel Vitrine, gently elevating & sweeping up towards stage/contestant
    if (kdStartCooldownUntil) {
      const now = serverNow ? serverNow() : Date.now();
      if (now < kdStartCooldownUntil) {
        _sweepStartPos.set(...OLYMPIA_CAM_PRESETS[14].pos);
        _sweepStartTarget.set(...OLYMPIA_CAM_PRESETS[14].target);

        const duration = 3500;
        const elapsed = Math.max(0, duration - (kdStartCooldownUntil - now));
        const t = Math.min(1.0, elapsed / duration);
        const smoothT = t * t * (3 - 2 * t);

        _curPos.lerpVectors(_sweepStartPos, _sweepEndPos, smoothT);
        _curTarget.lerpVectors(_sweepStartTarget, _sweepEndTarget, smoothT);

        currentPos.current.copy(_curPos);
        currentTarget.current.copy(_curTarget);

        camera.position.copy(_curPos);
        camera.lookAt(_curTarget);
        camera.updateProjectionMatrix();
        return;
      }
    }

    // 1. Calculate subtle broadcast push-in (dolly) towards target
    _effectivePos.copy(targetPos);
    if (pushInProgress > 0) {
      _dir.copy(targetLookAt).sub(targetPos).normalize();
      _effectivePos.addScaledVector(_dir, pushInProgress * 0.40);
    }

    // 2. Smooth interpolation or instant positioning
    if (transitionMode === "CUT") {
      currentPos.current.copy(_effectivePos);
      currentTarget.current.copy(targetLookAt);
    } else {
      // Morph transition (smooth damp)
      const lerpSpeed = Math.min(1.0, delta * 3.8);
      currentPos.current.lerp(_effectivePos, lerpSpeed);
      currentTarget.current.lerp(targetLookAt, lerpSpeed);
    }

    // 3. Apply PTZ Orbit offsets
    _finalPos.copy(currentPos.current);
    if (ptzYaw !== 0 || ptzPitch !== 0 || ptzZoom !== 1.0) {
      _offset.copy(_finalPos).sub(currentTarget.current);
      // Orbit around target
      _offset.applyAxisAngle(_axisY, ptzYaw);
      _right.copy(_axisX).applyAxisAngle(_axisY, ptzYaw);
      _offset.applyAxisAngle(_right, ptzPitch);

      // Apply Zoom scaling (FOV zoom or distance reduction)
      _offset.multiplyScalar(1.0 / ptzZoom);
      _finalPos.copy(currentTarget.current).add(_offset);
    }

    camera.position.copy(_finalPos);
    camera.lookAt(currentTarget.current);
    camera.updateProjectionMatrix();
  });

  return null;
}
