"use client";

import { useRef, useEffect, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

export interface CameraPreset {
  id: number;
  label: string;
  pos: [number, number, number];
  target: [number, number, number];
  fov?: number;
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
import {
  getContestantArcParams as getSharedContestantArcParams,
  type ContestantArcParams,
} from "@/lib/olympia/entrance-geometry";
import type { OlympiaState } from "@/lib/olympia/types";

export type { ContestantArcParams };

export function hasActiveRoundContent(state: OlympiaState | null | undefined): boolean {
  if (
    !state ||
    state.stage !== "playing" ||
    !state.currentRound ||
    state.summaryState?.active ||
    state.roundStatus[state.currentRound] === "done"
  ) {
    return false;
  }

  switch (state.currentRound) {
    case "khoiDong": {
      const kd = state.khoiDong;
      if (!kd || !kd.started || kd.phase === "segmentDone" || kd.phase === "intro" || kd.qIdx < 0) return false;
      if (state.kdIntroTimer && (state.kdIntroTimer.remainingMs > 0 || state.kdIntroTimer.startedAt)) return false;
      return true;
    }
    case "vcnv": {
      const v = state.vcnv;
      if (!v) return false;
      if (v.currentRow < 0 && v.phase === "grid" && !v.answersRevealed && v.bells.length === 0) return false;
      return (
        v.currentRow >= 0 ||
        v.phase === "selecting" ||
        v.phase === "question" ||
        v.phase === "waitingAnswer" ||
        v.phase === "answers" ||
        v.phase === "done" ||
        Boolean(v.answersRevealed) ||
        v.bells.length > 0
      );
    }
    case "tangToc": {
      const tt = state.tangToc;
      if (!tt) return false;
      return tt.phase === "question" || tt.phase === "ranking" || tt.phase === "graded";
    }
    case "veDich": {
      const vd = state.veDich;
      if (!vd || vd.phase === "seatDone" || (vd.phase === "idle" && !vd.onStage)) return false;
      return (
        vd.phase === "choosing" ||
        vd.phase === "packageReady" ||
        vd.phase === "thinking" ||
        vd.phase === "stealing" ||
        vd.phase === "result" ||
        Boolean(vd.onStage)
      );
    }
    case "cauHoiPhu": {
      const chp = state.cauHoiPhu;
      if (!chp) return false;
      return chp.phase === "question" || chp.phase === "result" || chp.qIdx >= 0 || chp.buzzedSeat != null;
    }
    default:
      return false;
  }
}

export function isRoundPostIntroStandby(state: OlympiaState | null | undefined, now?: number): boolean {
  if (!state || state.stage !== "playing" || Boolean(state.banner)) return false;
  if (
    state.studioCameraManual ||
    state.summaryState?.active ||
    state.entranceState?.active
  ) {
    return false;
  }
  if (state.roundIntroDoneAt && now !== undefined) {
    const elapsed = (now - state.roundIntroDoneAt) / 1000;
    if (elapsed >= 0 && elapsed < 3.0) {
      return true;
    }
  }
  return false;
}

export function getContestantArcParams(totalSeats: number = 4): ContestantArcParams {
  return getSharedContestantArcParams(totalSeats);
}

export function getContestantPodiumWorldPos(
  seatId: number,
  totalSeats: number = 4,
  y: number = 0.22
): [number, number, number] {
  const activeCount = Math.min(8, Math.max(1, totalSeats || 4));
  const clampedSeat = Math.min(activeCount - 1, Math.max(0, seatId));
  const { radius, startPhi, endPhi } = getContestantArcParams(activeCount);
  const frac = activeCount === 1 ? 0.5 : clampedSeat / (activeCount - 1);
  const phi = startPhi + frac * (endPhi - startPhi);

  const px = +(-radius * Math.cos(phi)).toFixed(3);
  const pz = +(-0.5 - radius * Math.sin(phi)).toFixed(3);
  return [px, y, pz];
}

export function getContestantCameraPreset(
  seatId: number,
  totalSeats: number = 4,
  framing: "mcu" | "wide_with_podium" = "mcu"
): CameraPreset {
  const activeCount = Math.min(8, Math.max(1, totalSeats || 4));
  const clampedSeat = Math.min(activeCount - 1, Math.max(0, seatId));
  const { radius, startPhi, endPhi } = getContestantArcParams(activeCount);
  const frac = activeCount === 1 ? 0.5 : clampedSeat / (activeCount - 1);
  const phi = startPhi + frac * (endPhi - startPhi);

  const px = -radius * Math.cos(phi);
  const pz = -0.5 - radius * Math.sin(phi);

  const nx = Math.cos(phi);
  const nz = Math.sin(phi);

  const effPx = +(px + 0.22).toFixed(3);

  if (framing === "wide_with_podium") {
    // 0.75x - 0.8x wide framing showing full contestant body + glowing podium scoreboard
    // Camera backed up to 2.45m, elevated slightly to 1.52m, target at desk center Y = 1.05m
    const dist = 2.45;
    const camX = +(effPx + dist * nx).toFixed(3);
    const camY = 1.52;
    const camZ = +(pz + dist * nz).toFixed(3);
    return {
      id: clampedSeat < 4 ? 5 + clampedSeat : 25 + (clampedSeat - 4),
      label: `Cận Cảnh TS ${clampedSeat + 1} (Toàn Thân & Bảng Điểm)`,
      pos: [camX, camY, camZ],
      target: [effPx, 1.05, +pz.toFixed(3)],
      fov: 44, // 0.75x wider FOV so both head and scoreboard fit comfortably
    };
  }

  // Broadcast Medium Close-Up (MCU / Bust Shot) focused on contestant's chest & head:
  // - Closer distance (1.92m vs 2.45m) cleanly cuts adjacent contestant podiums out of the frame (no '1' or 'T' peeking at corners).
  // - Elevated target (1.40m vs 1.25m) and camera height (1.48m vs 1.34m) tucks the desk and podium base safely below the 2D Lower-Third banner.
  // - Offset X by +0.22m to track the visually shifted contestant podiums group exactly.
  const dist = 1.92;
  const camX = +(effPx + dist * nx).toFixed(3);
  const camY = 1.48;
  const camZ = +(pz + dist * nz).toFixed(3);

  const targetX = effPx;
  const targetY = 1.40;
  const targetZ = +pz.toFixed(3);

  return {
    id: clampedSeat < 4 ? 5 + clampedSeat : 25 + (clampedSeat - 4),
    label: `Cận Cảnh TS ${clampedSeat + 1}`,
    pos: [camX, camY, camZ],
    target: [targetX, targetY, targetZ],
    fov: 36,
  };
}

export function getContestantScreenCameraPreset(
  seatId: number,
  totalSeats: number = 4
): CameraPreset {
  const activeCount = Math.min(8, Math.max(1, totalSeats || 4));
  const clampedSeat = Math.min(activeCount - 1, Math.max(0, seatId));
  const { radius, startPhi, endPhi } = getContestantArcParams(activeCount);
  const frac = activeCount === 1 ? 0.5 : clampedSeat / (activeCount - 1);
  const phi = startPhi + frac * (endPhi - startPhi);

  const px = -radius * Math.cos(phi);
  const pz = -0.5 - radius * Math.sin(phi);

  const nx = Math.cos(phi);
  const nz = Math.sin(phi);
  // Tangent perpendicular vector (along contestant right shoulder)
  const tx = -nz;
  const tz = nx;

  // Screen desk center position (laptop screen & keyboard inside recessed bay)
  // Target centered between head (1.55m) and desk surface (0.90m) at targetY = 1.20m
  // Leaves comfortable broadcast headroom above the contestant's hair
  const effPx = +(px + 0.22).toFixed(3);
  const deskX = +(effPx - 0.12 * nx + 0.06 * tx).toFixed(3);
  const deskY = 1.20;
  const deskZ = +(pz - 0.12 * nz + 0.06 * tz).toFixed(3);

  // Broadcast 3/4 over-the-shoulder perspective (OTS):
  // Positioned at eye level (camY = 1.62m, camDist = 1.52m, tangentOffset = 0.48m)
  // Perfectly frames the contestant's full head with ample headroom, shoulders, polo shirt,
  // natural forward arm reach onto the desk/keyboard, glowing laptop screen, and illuminated formula LED wall.
  const camDist = 1.52;
  const tangentOffset = 0.48;
  const camX = +(effPx - camDist * nx + tangentOffset * tx).toFixed(3);
  const camY = 1.62;
  const camZ = +(pz - camDist * nz + tangentOffset * tz).toFixed(3);

  return {
    id: 16,
    label: `Màn Hình TS ${clampedSeat + 1}`,
    pos: [camX, camY, camZ],
    target: [deskX, deskY, deskZ],
  };
}

export function getWideStageCameraPreset(totalSeats: number = 4): CameraPreset {
  // Broad studio wide shot dynamically framed for totalSeats (4, 6, 8):
  // Prevents contestant podium clipping on the far left downstage arc (Z=+2.42m, X=-5.98m).
  const count = Math.min(8, Math.max(1, totalSeats || 4));
  if (count >= 7) {
    return {
      id: 1,
      label: "Toàn Cảnh (8 Thí Sinh)",
      pos: [0.00, 3.80, 10.80],
      target: [-1.80, 1.35, -2.50],
      fov: 52,
    };
  }
  if (count >= 5) {
    return {
      id: 1,
      label: "Toàn Cảnh (6 Thí Sinh)",
      pos: [0.00, 3.80, 10.80],
      target: [-1.40, 1.40, -2.80],
      fov: 48,
    };
  }
  return {
    id: 1,
    label: "Toàn Cảnh",
    pos: [0.00, 3.80, 10.80],
    target: [-0.80, 1.45, -3.20],
    fov: 44,
  };
}

export function getWidePodiumsCameraPreset(totalSeats: number = 4): CameraPreset {
  // Frontal Direct Arc Shot facing the curved line of contestant podiums
  // Dynamically pulled back for 6 and 8 contestants so all seats are directly visible without occlusion.
  const count = Math.min(8, Math.max(1, totalSeats || 4));
  if (count >= 7) {
    return {
      id: 10,
      label: "Toàn Cảnh Bục Thí Sinh",
      pos: [0.15, 2.35, 5.60],
      target: [-4.60, 1.25, -2.10],
      fov: 52,
    };
  }
  if (count >= 5) {
    return {
      id: 10,
      label: "Toàn Cảnh Bục Thí Sinh",
      pos: [-0.10, 2.20, 5.10],
      target: [-4.65, 1.25, -2.35],
      fov: 46,
    };
  }
  return {
    id: 10,
    label: "Toàn Cảnh Bục Thí Sinh",
    pos: [-0.30, 2.05, 4.60],
    target: [-4.80, 1.25, -2.60],
    fov: 40,
  };
}

export function getWideStageLeftTiltedPreset(totalSeats: number = 4): CameraPreset {
  // Broad studio wide shot angled down towards Stage Left / Contestant Podiums
  // Used for finish-turn return sequence gliding back to default center over 3.0s.
  // Placed safely in front of grandstand at Z = 12.00m (safely inside open studio, never penetrates rear wall)
  const count = Math.min(8, Math.max(1, totalSeats || 4));
  return {
    id: 29,
    label: "Toàn Cảnh Nghiêng Trái Bục Thí Sinh",
    pos: [-1.80, 3.80, 12.00],
    target: [-2.80, 1.40, -2.00],
    fov: count >= 7 ? 48 : count >= 5 ? 44 : 40,
  };
}


export const OLYMPIA_CAM_PRESETS: Record<number, CameraPreset> = {
  1: {
    id: 1,
    label: "Toàn Cảnh",
    pos: [0.0, 3.8, 12.2],
    target: [-0.5, 1.55, -3.2],
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
    // Coaxial direct eye-level frontal angle along MC desk normal, framing full MC desk, presenters & Hexagon Portal
    // Legacy baseline: pos: [2.30, 1.26, -3.94], target: [3.12, 1.02, -7.16]
    pos: [2.18, 1.44, -3.55],
    target: [3.12, 1.28, -7.16],
    fov: 42,
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
  10: getWidePodiumsCameraPreset(4),
  11: {
    id: 11,
    label: "Cam Cận Cảnh Cửa Trái Chào Sân",
    // Vị trí đối diện phía trước khán đài, xoay góc sang Cửa Trái, thấy trọn vòm cửa và đón đầu thí sinh
    pos: [0.00, 2.20, 5.20],
    target: [1.15, 2.05, 12.85],
    fov: 40,
  },
  12: {
    id: 12,
    label: "Cam Cận Cảnh Cửa Phải Chào Sân",
    // Vị trí đối diện phía trước khán đài, xoay góc sang Cửa Phải, thấy trọn vòm cửa và đón đầu thí sinh
    pos: [0.00, 2.20, 5.20],
    target: [-1.15, 2.05, 12.85],
    fov: 40,
  },
  13: {
    id: 13,
    label: "Cam Đứng Yên Bục Giữa Tạo Dáng",
    // Góc cố định toàn thân (Full Body Shot) lấy trọn vẹn từ vòng tròn vàng dưới chân đến đỉnh đầu thí sinh
    pos: [0.00, 1.70, 5.80],
    target: [0.00, 1.55, 10.20],
    fov: 42,
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
    label: "Về Đích - Over The Shoulder (OTS)",
    // OTS over-the-shoulder looking up at LED screen behind active candidate
    pos: [0.32, 1.55, 1.55],
    target: [0.0, 2.30, -4.50],
    fov: 38,
  },
  16: getContestantScreenCameraPreset(0, 4),
  17: {
    id: 17,
    label: "Về Đích - Trắc Diện 3/4 Kịch Tính",
    // Dramatic 3/4 profile shot of active contestant
    pos: [-1.45, 1.45, -0.45],
    target: [0.0, 1.35, 0.55],
    fov: 36,
  },
  19: {
    id: 19,
    label: "Cam Phía Trước Bám Theo Bước Xuống Cầu Thang",
    // Đặt phía trước sàn bục hướng lên phía khán đài, bám theo chính diện thí sinh bước xuống
    pos: [0.00, 1.45, 4.20],
    target: [0.00, 1.30, 8.50],
    fov: 40,
  },
  20: {
    id: 20,
    label: "Cung Vòm LED & Viền Vách Công Thức",
    // Raking wide perspective framing the vertical upward curved arch, Quizorra riser mounting pad & formula borders
    pos: [-1.80, 2.60, 3.20],
    target: [-5.60, 3.60, -3.80],
    fov: 38,
  },
  25: getContestantCameraPreset(4, 8),
  26: getContestantCameraPreset(5, 8),
  27: getContestantCameraPreset(6, 8),
  28: getContestantCameraPreset(7, 8),
  29: getWideStageLeftTiltedPreset(4),
  30: {
    id: 30,
    label: "Toàn Cảnh Bục Vinh Quang & 2 MC",
    pos: [0.00, 2.20, 5.20],
    target: [0.00, 1.20, -0.60],
    fov: 46,
  },
  31: {
    id: 31,
    label: "Cận Cảnh Bục Vinh Quang",
    pos: [0.00, 1.65, 3.20],
    target: [0.00, 1.35, -0.60],
    fov: 38,
  },
};

interface CameraControllerProps {
  totalSeats?: number;
  activeSeat?: number;
  camAngle: number;
  transitionMode?: "CUT" | "MORPH";
  pushInProgress?: number;
  ptzYaw?: number;
  ptzPitch?: number;
  ptzZoom?: number;
  ptzPanX?: number;
  ptzPanY?: number;
  introStartedAt?: number | null;
  roundIntroDoneAt?: number | null;
  kdStartCooldownUntil?: number | null;
  isIdleLobby?: boolean;
  isPostIntroStandby?: boolean;
  isManualCamera?: boolean;
  serverNow?: () => number;
  qIdx?: number;
  questionRevealed?: boolean;
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
// Phase 3 (Center MC American shot waist-up, upper thighs, zero feet in frame)
export const _frontCenterMCPos = new THREE.Vector3(0.00, 1.35, 2.75);
export const _frontCenterMCTarget = new THREE.Vector3(0.00, 1.20, 0.00);
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
const _finalTarget = new THREE.Vector3();
const _panForward = new THREE.Vector3();
const _panRight = new THREE.Vector3();
const _panUp = new THREE.Vector3();
const _panOffset = new THREE.Vector3();
const _offset = new THREE.Vector3();
const _right = new THREE.Vector3();
const _axisY = new THREE.Vector3(0, 1, 0);
const _axisX = new THREE.Vector3(1, 0, 0);

export function CameraController({
  camAngle = 1,
  totalSeats = 4,
  activeSeat = 0,
  transitionMode = "CUT",
  pushInProgress = 0,
  ptzYaw = 0,
  ptzPitch = 0,
  ptzZoom = 1.0,
  ptzPanX = 0,
  ptzPanY = 0,
  introStartedAt = null,
  roundIntroDoneAt = null,
  kdStartCooldownUntil = null,
  isIdleLobby = false,
  isPostIntroStandby = false,
  isManualCamera = false,
  serverNow,
  qIdx,
  questionRevealed,
}: CameraControllerProps) {
  const { camera, size } = useThree();

  const currentPos = useRef(new THREE.Vector3(0, 2.5, 8.4));
  const currentTarget = useRef(new THREE.Vector3(0, 1.8, -2.8));
  const lastZoomRef = useRef(ptzZoom);
  const postIntroStandbyStartRef = useRef<number | null>(null);
  const wasPostIntroStandbyRef = useRef(false);
  const standbyExitedAtRef = useRef<number | null>(null);

  useEffect(() => {
    if (isPostIntroStandby) {
      postIntroStandbyStartRef.current = serverNow ? serverNow() : Date.now();
      wasPostIntroStandbyRef.current = true;
      standbyExitedAtRef.current = null;
    } else {
      if (wasPostIntroStandbyRef.current) {
        standbyExitedAtRef.current = serverNow ? serverNow() : Date.now();
        wasPostIntroStandbyRef.current = false;
      }
      postIntroStandbyStartRef.current = null;
    }
  }, [isPostIntroStandby, serverNow]);

  const effectiveTotalSeats = totalSeats || 4;
  const isContestantCam =
    (camAngle >= 5 && camAngle <= 8) ||
    (camAngle >= 25 && camAngle <= 28);
  const targetPreset = isContestantCam
    ? getContestantCameraPreset(
        camAngle >= 25 ? camAngle - 25 + 4 : camAngle - 5,
        effectiveTotalSeats
      )
    : camAngle === 1
    ? getWideStageCameraPreset(effectiveTotalSeats)
    : camAngle === 10
    ? getWidePodiumsCameraPreset(effectiveTotalSeats)
    : camAngle === 16
    ? getContestantScreenCameraPreset(activeSeat, effectiveTotalSeats)
    : camAngle === 18
    ? getContestantCameraPreset(activeSeat, effectiveTotalSeats, "wide_with_podium")
    : camAngle === 29
    ? getWideStageLeftTiltedPreset(effectiveTotalSeats)
    : (OLYMPIA_CAM_PRESETS[camAngle] || getWideStageCameraPreset(effectiveTotalSeats));
  const targetPos = useMemo(
    () => {
      if (isIdleLobby && camAngle === 3) return _mcTightPos.clone();
      if (isPostIntroStandby && camAngle === 3) return _frontCenterMCPos.clone();
      return new THREE.Vector3(...targetPreset.pos);
    },
    [isIdleLobby, isPostIntroStandby, camAngle, targetPreset]
  );
  const targetLookAt = useMemo(
    () => {
      if (isIdleLobby && camAngle === 3) return _mcTightTarget.clone();
      if (isPostIntroStandby && camAngle === 3) return _frontCenterMCTarget.clone();
      return new THREE.Vector3(...targetPreset.target);
    },
    [isIdleLobby, isPostIntroStandby, camAngle, targetPreset]
  );

  const prevCamAngleRef = useRef<number>(camAngle);
  const prevActiveSeatRef = useRef<number>(activeSeat);
  const smoothPushRef = useRef<number>(pushInProgress);
  const prevQIdxRef = useRef<number>(qIdx ?? -1);
  const prevRevealedRef = useRef<boolean>(questionRevealed ?? false);
  const questionZoomStartRef = useRef<number>(0);
  const glideStartRef = useRef<number | null>(null);

  // Handle instant cut on camera switch when mode is CUT, except when in standby or smoothly transitioning out of standby
  useEffect(() => {
    const isCamChanged = prevCamAngleRef.current !== camAngle;
    const isSeatChanged = prevActiveSeatRef.current !== activeSeat;
    const isSummarySeatCut = camAngle === 18 && isSeatChanged;

    if (isCamChanged || isSummarySeatCut) {
      const isMcHandoff = prevCamAngleRef.current === 3 || camAngle === 3;
      if (prevCamAngleRef.current === 14 && camAngle !== 14) {
        // CUT immediately to CAM 10 (Toàn cảnh hàng bục thí sinh) as starting point for 2.5s zoom into contestant
        const cam10 = getWidePodiumsCameraPreset(effectiveTotalSeats);
        currentPos.current.copy(new THREE.Vector3(...cam10.pos));
        currentTarget.current.copy(new THREE.Vector3(...cam10.target));
        camera.position.copy(currentPos.current);
        camera.lookAt(currentTarget.current);
      } else if ((transitionMode === "CUT" || isMcHandoff || isSummarySeatCut) && !isPostIntroStandby && standbyExitedAtRef.current == null) {
        currentPos.current.copy(targetPos);
        currentTarget.current.copy(targetLookAt);
        camera.position.copy(targetPos);
        camera.lookAt(targetLookAt);
      }
      if (transitionMode === "CUT" || prevCamAngleRef.current !== camAngle) {
        smoothPushRef.current = 0.0;
        questionZoomStartRef.current = 0;
      } else {
        smoothPushRef.current = isSummarySeatCut ? 0.0 : pushInProgress;
      }
      prevCamAngleRef.current = camAngle;
      prevActiveSeatRef.current = activeSeat;
    }
  }, [camAngle, activeSeat, transitionMode, targetPos, targetLookAt, isPostIntroStandby, pushInProgress, effectiveTotalSeats, camera]);

  useFrame((_, delta) => {
    // Smooth push-in zoom:
    // Track Khởi Động active question and cleanly manage zoom-in lifecycle:
    const isKdActive = qIdx != null && qIdx >= 0 && Boolean(questionRevealed);
    const isNewQuestion = isKdActive && (qIdx !== prevQIdxRef.current || !prevRevealedRef.current);
    const isSummarySeatCut = camAngle === 18 && prevActiveSeatRef.current !== activeSeat;
    const isCamChanged = prevCamAngleRef.current !== camAngle;

    if (isNewQuestion) {
      prevQIdxRef.current = qIdx ?? -1;
      prevRevealedRef.current = Boolean(questionRevealed);
      const now = serverNow ? serverNow() : Date.now();
      // Guard question zoom so it only runs when isContestantCam is active
      questionZoomStartRef.current = isContestantCam ? now : 0;
      // Snap reset to 1.0x (push = 0) immediately on frame 0 of the new question:
      // Eliminates the 0.5-1.0s backward damping jerk from 1.25x to 1.0x
      smoothPushRef.current = 0.0;
      prevCamAngleRef.current = camAngle;
    } else if (isSummarySeatCut) {
      // Hard CUT on score summary when advancing to next contestant:
      // Instantly snap position and target, reset smooth push to 0.0, avoiding any glide across stage
      prevActiveSeatRef.current = activeSeat;
      prevCamAngleRef.current = camAngle;
      smoothPushRef.current = 0.0;
      questionZoomStartRef.current = 0;
      currentPos.current.copy(targetPos);
      currentTarget.current.copy(targetLookAt);
      camera.position.copy(targetPos);
      camera.lookAt(targetLookAt);
    } else if (isCamChanged) {
      if (prevCamAngleRef.current === 29 && camAngle === 1 && transitionMode === "MORPH") {
        glideStartRef.current = serverNow ? serverNow() : Date.now();
      }
      smoothPushRef.current = 0.0;
      questionZoomStartRef.current = 0;
      prevCamAngleRef.current = camAngle;
      prevActiveSeatRef.current = activeSeat;
    } else if (isKdActive && isContestantCam && questionZoomStartRef.current > 0) {
      // 60FPS smooth zoom-in over 7.5s (1.0x -> 1.12x), holding firmly at 1.0 without looping
      const now = serverNow ? serverNow() : Date.now();
      const elapsedSec = Math.max(0, (now - questionZoomStartRef.current) / 1000);
      const targetKdPush = Math.min(1.0, elapsedSec / 7.5);
      smoothPushRef.current = THREE.MathUtils.damp(smoothPushRef.current, targetKdPush, 8.0, delta);
    } else {
      smoothPushRef.current = THREE.MathUtils.damp(smoothPushRef.current, pushInProgress, 8.0, delta);
    }

    if (!questionRevealed && prevRevealedRef.current) {
      prevRevealedRef.current = false;
      questionZoomStartRef.current = 0;
    }

    // 0. True Optical Zoom & Adaptive FOV Calculation
    if (camera instanceof THREE.PerspectiveCamera) {
      const baseFov = (isPostIntroStandby && camAngle === 3)
        ? 24.5
        : (targetPreset.fov ?? (camAngle === 1 ? (effectiveTotalSeats >= 7 ? 48 : effectiveTotalSeats >= 5 ? 44 : 40) : camAngle === 10 ? 40 : camAngle === 13 ? 42 : camAngle === 15 ? 38 : camAngle === 17 ? 36 : 43));
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
      // Optical zoom: For CAM 18 (Score Summary) and CAM 31 (Podium Close), zoom from 0.75x (wide) to 1.25x (close)
      const activePush = Math.max(0, Math.min(1.0, smoothPushRef.current));
      const isDynamicZoomCam = camAngle === 18 || camAngle === 31;
      const zoomFactor = isDynamicZoomCam
        ? 0.75 + activePush * 0.50
        : 1.0 + activePush * 0.12;
      const pushFov = opticalFov / zoomFactor;
      if (transitionMode === "CUT" && (isCamChanged || isNewQuestion || (pushInProgress === 0 && smoothPushRef.current === 0))) {
        camera.fov = Math.min(85, Math.max(12, pushFov));
        camera.updateProjectionMatrix();
      } else {
        camera.fov = THREE.MathUtils.damp(camera.fov, Math.min(85, Math.max(12, pushFov)), 8.0, delta);
      }
    }
    // 0. Opening Sequence Camera Director (VTV3 Olympia 27 Broadcast Parity 10s 5-Phase Choreography):
    // Phase 1 (0.0s - 2.5s): Floor level through laurel wreath towards 2 MCs.
    // Phase 2 (2.5s - 4.0s, elapsedSec < 4.0): Orbiting behind male MC (Ngọc Huy) stepping out from booth N-1.
    // Phase 3 (4.0s - 6.0s, elapsedSec < 6.0): Camera glides smoothly through gap between 2 MCs towards audience stands.
    // Phase 4 (6.0s - 10.0s): Sweep up audience stands.
    // Phase 5 (>= 10.0s & hold): Waist-up center medium shot settling at FOV 34°, centering hexagonal portal (zero feet).
    if (introStartedAt && !isManualCamera) {
      const now = serverNow ? serverNow() : Date.now();
      const elapsedSec = Math.max(0, (now - introStartedAt) / 1000);

      if (elapsedSec < 2.5) {
        // Phase 1 (0.0s - 2.5s): Floor level through laurel wreath looking towards 2 MCs
        const frac = elapsedSec / 2.5;
        const smoothFrac = frac * frac * (3 - 2 * frac);
        _curPos.set(0.0, 0.40 + smoothFrac * 0.15, 4.5 - smoothFrac * 1.5);
        _curTarget.set(0.0, 1.25, 0.0);
        if (camera instanceof THREE.PerspectiveCamera) {
          camera.fov = 44.0;
        }
      } else if (elapsedSec < 4.0) {
        // Phase 2 (2.5s - 4.0s, elapsedSec < 4.0): Orbiting behind male MC (Ngọc Huy)
        const frac = (elapsedSec - 2.5) / 1.5;
        const orbitAngle = -0.8 + frac * 0.6;
        const r = 4.2;
        _curPos.set(r * Math.sin(orbitAngle), 2.1, -0.5 - r * Math.cos(orbitAngle));
        _curTarget.set(1.2 * (1 - frac), 1.3, -2.5 + frac * 2.0);
        if (camera instanceof THREE.PerspectiveCamera) {
          camera.fov = 46.0;
        }
      } else if (elapsedSec < 6.0) {
        // Phase 3 (4.0s - 6.0s, elapsedSec < 6.0): Camera glides smoothly through gap between 2 MCs towards audience stands
        const frac = (elapsedSec - 4.0) / 2.0;
        const smoothFrac = frac * frac * (3 - 2 * frac);
        const zPos = 1.65 + smoothFrac * 2.55;
        _curPos.set(0.0, 1.85 - smoothFrac * 0.35, zPos);
        _curTarget.set(0.0, 1.45 + smoothFrac * 0.5, 8.5);
        if (camera instanceof THREE.PerspectiveCamera) {
          camera.fov = 42.0 - smoothFrac * 6.0;
        }
      } else if (elapsedSec < 10.0) {
        // Phase 4 (6.0s - 10.0s): Sweep up audience stands
        const frac = (elapsedSec - 6.0) / 4.0;
        const smoothFrac = frac * frac * (3 - 2 * frac);
        _curPos.set(1.2 - smoothFrac * 1.2, 2.2 + smoothFrac * 0.4, 4.2 - smoothFrac * 1.0);
        _curTarget.set(0.0, 2.2 + smoothFrac * 0.6, 9.5);
        if (camera instanceof THREE.PerspectiveCamera) {
          camera.fov = 40.0;
        }
      } else {
        // Phase 5 (>= 10.0s): Cut directly to Center MC American shot (upper thighs, safe headroom 14.2%)
        _curPos.set(0.00, 1.35, 2.75);
        _curTarget.set(0.00, 1.20, 0.00);
        if (camera instanceof THREE.PerspectiveCamera) {
          camera.fov = 30.0;
        }
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
        return;
      }
    }

    // 0.2. Post-Intro Opening Round Camera Director (applies to all 4 rounds: Khởi Động, VCNV, Tăng Tốc, Về Đích):
    // Tối giản giai đoạn sau intro: Frame bục MC (CAM 3) đẩy nhẹ trong 3.0s rồi chuyển thẳng về toàn cảnh trường quay
    if (isPostIntroStandby) {
      const now = serverNow ? serverNow() : Date.now();
      const startAt = roundIntroDoneAt ?? postIntroStandbyStartRef.current ?? now;
      const elapsedSec = Math.max(0, (now - startAt) / 1000);

      if (elapsedSec < 3.0) {
        const mcPreset = OLYMPIA_CAM_PRESETS[3];
        _sweepStartPos.set(...mcPreset.pos);
        _sweepStartTarget.set(...mcPreset.target);
        const pushFrac = Math.min(1.0, elapsedSec / 3.0);
        _dir.copy(_sweepStartTarget).sub(_sweepStartPos).normalize();
        _curPos.copy(_sweepStartPos).addScaledVector(_dir, pushFrac * 0.25);
        _curTarget.copy(_sweepStartTarget);

        currentPos.current.copy(_curPos);
        currentTarget.current.copy(_curTarget);
        camera.position.copy(_curPos);
        camera.lookAt(_curTarget);
        return;
      }
    }

    // 1. Anti-Double-Zoom Guardrails: Keep camera position at target preset (no horizontal forward dolly translation)
    _effectivePos.copy(targetPos);
    const activePush = Math.max(0, Math.min(1.0, smoothPushRef.current));
    if (activePush > 0 && camAngle === 18) {
      // Maintain gentle elevation lerp from 1.52m to 1.56m for CAM 18 without horizontal forward dolly
      _effectivePos.y = THREE.MathUtils.lerp(1.52, 1.56, activePush);
    }
    // For CAM 18 (Score Summary), smoothly tilt aim upwards from desk (1.05m) to contestant chest & chin (1.45m)
    const effectiveLookAt = targetLookAt.clone();
    if (camAngle === 18 && activePush > 0) {
      effectiveLookAt.y = THREE.MathUtils.lerp(1.05, 1.45, activePush);
    }

    const now = serverNow ? serverNow() : Date.now();
    const isExitingStandby = standbyExitedAtRef.current != null && (now - standbyExitedAtRef.current < 2200);
    if (isExitingStandby && currentPos.current.distanceToSquared(_effectivePos) < 0.005) {
      standbyExitedAtRef.current = null;
    } else if (!isExitingStandby && standbyExitedAtRef.current != null) {
      standbyExitedAtRef.current = null;
    }

    // 2. Smooth interpolation or instant positioning:
    // When transitioning from standby to question framing, smoothly glide (lerp) into position without snapping.
    // When remaining on the same camera angle (e.g. advancing question), snap on new question to eliminate backward jerk.
    // When finishing a turn (CAM 29 to CAM 1), glide smoothly over 3.0 seconds.
    if (isNewQuestion || isSummarySeatCut) {
      // Snap camera directly to baseline preset immediately on new question or score summary seat change,
      // completely eliminating any backward interpolation jerk or cross-stage morph/slide
      currentPos.current.copy(targetPos);
      currentTarget.current.copy(effectiveLookAt);
    } else if (glideStartRef.current != null) {
      const elapsedGlide = (now - glideStartRef.current) / 3000;
      if (elapsedGlide >= 1.0) {
        glideStartRef.current = null;
        currentPos.current.copy(_effectivePos);
        currentTarget.current.copy(effectiveLookAt);
      } else {
        const smoothGlide = elapsedGlide * elapsedGlide * (3 - 2 * elapsedGlide);
        const cam29 = getWideStageLeftTiltedPreset(effectiveTotalSeats);
        const cam1 = getWideStageCameraPreset(effectiveTotalSeats);
        currentPos.current.lerpVectors(new THREE.Vector3(...cam29.pos), new THREE.Vector3(...cam1.pos), smoothGlide);
        currentTarget.current.lerpVectors(new THREE.Vector3(...cam29.target), new THREE.Vector3(...cam1.target), smoothGlide);
      }
    } else if ((transitionMode === "CUT" || (prevCamAngleRef.current === 3 || camAngle === 3)) && !isExitingStandby && prevCamAngleRef.current !== camAngle) {
      currentPos.current.copy(_effectivePos);
      currentTarget.current.copy(effectiveLookAt);
    } else {
      // Morph transition or same-camera smooth push damping
      const lerpSpeed = Math.min(1.0, delta * 8.0);
      currentPos.current.lerp(_effectivePos, lerpSpeed);
      currentTarget.current.lerp(effectiveLookAt, lerpSpeed);
    }

    // 3. Apply PTZ Orbit & Pan offsets
    _finalPos.copy(currentPos.current);
    _finalTarget.copy(currentTarget.current);

    const hasOrbit = ptzYaw !== 0 || ptzPitch !== 0 || ptzZoom !== 1.0;
    const hasPan = ptzPanX !== 0 || ptzPanY !== 0;

    if (hasOrbit) {
      _offset.copy(_finalPos).sub(currentTarget.current);
      // Orbit around target
      _offset.applyAxisAngle(_axisY, ptzYaw);
      _right.copy(_axisX).applyAxisAngle(_axisY, ptzYaw);
      _offset.applyAxisAngle(_right, ptzPitch);

      // Apply Zoom scaling (FOV zoom or distance reduction)
      _offset.multiplyScalar(1.0 / ptzZoom);
      _finalPos.copy(currentTarget.current).add(_offset);
    }

    if (hasPan) {
      _panForward.subVectors(_finalTarget, _finalPos).normalize();
      _panRight.crossVectors(_panForward, _axisY).normalize();
      _panUp.crossVectors(_panRight, _panForward).normalize();
      _panOffset.set(0, 0, 0)
        .addScaledVector(_panRight, ptzPanX)
        .addScaledVector(_panUp, ptzPanY);
      _finalPos.add(_panOffset);
      _finalTarget.add(_panOffset);
    }

    camera.position.copy(_finalPos);
    camera.lookAt(_finalTarget);

    if (ptzZoom !== lastZoomRef.current) {
      lastZoomRef.current = ptzZoom;
      camera.updateProjectionMatrix();
    }
  });

  return null;
}
