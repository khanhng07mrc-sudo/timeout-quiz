/**
 * Pure-TS Stage Geometry, Collision-Free Routing & Entrance Choreography Helpers
 *
 * Shared across Node/Server (`engine.ts`), Audio Looping (`hooks.ts`),
 * Camera Director (`useOlympiaCamera.ts`), and 3D Studio Rendering (`Podiums.tsx`, `CameraController.tsx`).
 */

export interface ContestantArcParams {
  radius: number;
  startPhi: number;
  endPhi: number;
  span: number;
}

export interface EntranceSeatTiming {
  seatId: number;
  totalSeats: number;
  firstPhi: number;
  targetPhi: number;
  entryPhi: number;
  stairsEndSec: number;
  floorDurationSec: number;
  arrivalSec: number;
  bowEndSec: number;
  advanceMs: number;
  lastFinishMs: number;
  splitU: number;
  arcLenA: number;
  arcLenB: number;
  corridorRadius: number;
}

export const STAGE_CENTER_X = 0;
export const STAGE_CENTER_Z = -0.5;

export const PODIUM_ARC_RADIUS = 6.65;
export const PODIUM_PLINTH_WIDTH = 1.20;
export const PODIUM_PLINTH_DEPTH = 0.88;
export const PODIUM_STAND_BACK_OFFSET = 0.42;
export const DESK_STAND_RADIUS = PODIUM_ARC_RADIUS + PODIUM_STAND_BACK_OFFSET; // 7.07m

// Rear corridor sits between podium plinth backs (R = 7.09m) / seated contestants (R = 7.07m)
// and Raised Dais outer edge (R = 7.60m), well clear of Science Wall (R = 8.60m).
export const ENTRANCE_CORRIDOR_RADIUS = 7.52;
export const ENTRANCE_WING_OFFSET_RAD = 0.24;

export const ENTRANCE_STAIRS_END_SEC = 4.0;
export const ENTRANCE_TARGET_FLOOR_SPEED = 2.45; // comfortable brisk stage walk ~2.1-2.7 m/s
export const ENTRANCE_DESK_BOW_SEC = 0.5;
export const ENTRANCE_LAST_CLOSEUP_HOLD_SEC = 1.8;

/**
 * Symmetrically centered Contestant Podium Arc on Stage Left Dais ([0.50*PI, 1.28*PI], a_mid = 0.890*PI -> midPhi = +0.346 rad).
 */
export function getContestantArcParams(totalSeats: number = 4): ContestantArcParams {
  const count = Math.min(8, Math.max(1, totalSeats || 4));
  switch (count) {
    case 1:
      return { radius: PODIUM_ARC_RADIUS, startPhi: 0.346, endPhi: 0.346, span: 0.0 };
    case 2:
      return { radius: PODIUM_ARC_RADIUS, startPhi: 0.186, endPhi: 0.506, span: 0.32 };
    case 3:
      return { radius: PODIUM_ARC_RADIUS, startPhi: 0.076, endPhi: 0.616, span: 0.54 };
    case 4:
      return { radius: PODIUM_ARC_RADIUS, startPhi: -0.029, endPhi: 0.721, span: 0.75 };
    case 5:
      return { radius: PODIUM_ARC_RADIUS, startPhi: -0.134, endPhi: 0.826, span: 0.96 };
    case 6:
      return { radius: PODIUM_ARC_RADIUS, startPhi: -0.234, endPhi: 0.926, span: 1.16 };
    case 7:
      return { radius: PODIUM_ARC_RADIUS, startPhi: -0.344, endPhi: 1.036, span: 1.38 };
    case 8:
    default:
      return { radius: PODIUM_ARC_RADIUS, startPhi: -0.454, endPhi: 1.146, span: 1.6 };
  }
}

export function getSeatPolarPhi(seatId: number, totalSeats: number = 4): number {
  const count = Math.min(8, Math.max(1, totalSeats || 4));
  const clamped = Math.min(count - 1, Math.max(0, seatId));
  const { startPhi, endPhi } = getContestantArcParams(count);
  const frac = count === 1 ? 0.5 : clamped / (count - 1);
  return startPhi + frac * (endPhi - startPhi);
}

/**
 * Computes exact collision-free rear-corridor entrance timing & spline parameters for seatId in [0..totalSeats-1].
 */
export function getEntranceSeatTiming(seatId: number, totalSeats: number = 4): EntranceSeatTiming {
  const count = Math.min(8, Math.max(1, totalSeats || 4));
  const clampedSeat = Math.min(count - 1, Math.max(0, seatId));
  const arc = getContestantArcParams(count);
  const firstPhi = arc.startPhi;
  const targetPhi = getSeatPolarPhi(clampedSeat, count);

  const entryPhi = firstPhi - ENTRANCE_WING_OFFSET_RAD;
  const corridorRadius = ENTRANCE_CORRIDOR_RADIUS;

  const entryX = -corridorRadius * Math.cos(entryPhi);
  const entryZ = STAGE_CENTER_Z - corridorRadius * Math.sin(entryPhi);

  // Segment A: Stairs bottom [0, 6.20] -> Rear corridor entry P_entry
  const chordA = Math.hypot(entryX - 0.0, entryZ - 6.2);
  const arcLenA = chordA * 1.12;

  // Segment B: Rear corridor arc entryPhi -> targetPhi with gentle inward tuck to desk
  const deltaPhi = Math.max(0.05, targetPhi - entryPhi);
  const arcLenB = corridorRadius * deltaPhi;

  // Split parameter u such that Segment A exit tangent magnitude (m1 = arcLenA)
  // equals Segment B corridor entry speed cleanly (exact C1 velocity match at splitU).
  const splitU = Math.min(0.88, Math.max(0.18, arcLenA / (arcLenA + arcLenB)));
  const totalDist = arcLenA + arcLenB;

  const floorDurationSec = +Math.min(8.4, Math.max(3.6, totalDist / ENTRANCE_TARGET_FLOOR_SPEED)).toFixed(2);
  const arrivalSec = +(ENTRANCE_STAIRS_END_SEC + floorDurationSec).toFixed(2);
  const bowEndSec = +(arrivalSec + ENTRANCE_DESK_BOW_SEC).toFixed(2);

  // For seatId < N-1: next contestant spawns 0.5s before current arrives, so next contestant's CAM 11 cut
  // at +1.2s happens at arrivalSec + 0.7s (strictly AFTER current contestant has finished bowing at desk!).
  const advanceMs = Math.round((arrivalSec - 0.5) * 1000);
  // Last contestant holds desk close-up targetCam cleanly for 1.8s after arriving before ending to MC CAM 3.
  const lastFinishMs = Math.round((arrivalSec + ENTRANCE_LAST_CLOSEUP_HOLD_SEC) * 1000);

  return {
    seatId: clampedSeat,
    totalSeats: count,
    firstPhi,
    targetPhi,
    entryPhi,
    stairsEndSec: ENTRANCE_STAIRS_END_SEC,
    floorDurationSec,
    arrivalSec,
    bowEndSec,
    advanceMs,
    lastFinishMs,
    splitU,
    arcLenA,
    arcLenB,
    corridorRadius,
  };
}

/**
 * Returns the cumulative entrance start timestamp offsets (in ms) for all seats [0..N-1]
 * and total entrance sequence duration (in seconds).
 */
export function getEntranceScheduleOffsetsMs(totalSeats: number = 4): {
  seatStartOffsetsMs: number[];
  totalDurationMs: number;
  totalDurationSec: number;
} {
  const count = Math.min(8, Math.max(1, Math.floor(totalSeats || 4)));
  const offsets: number[] = [];
  let cursorMs = 0;

  for (let i = 0; i < count; i++) {
    offsets.push(cursorMs);
    const timing = getEntranceSeatTiming(i, count);
    if (i < count - 1) {
      cursorMs += timing.advanceMs;
    } else {
      cursorMs += timing.lastFinishMs;
    }
  }

  return {
    seatStartOffsetsMs: offsets,
    totalDurationMs: cursorMs,
    totalDurationSec: +(cursorMs / 1000).toFixed(2),
  };
}

export function getEntranceStepThresholdMs(seatId: number, totalSeats: number = 4): number {
  const timing = getEntranceSeatTiming(seatId, totalSeats);
  return seatId >= timing.totalSeats - 1 ? timing.lastFinishMs : timing.advanceMs;
}
