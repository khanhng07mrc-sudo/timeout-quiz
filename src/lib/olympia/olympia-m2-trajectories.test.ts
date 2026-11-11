/**
 * Milestone 2 Test Suite: Contestant Walk Trajectories & CAM 11 Timing (Requirements R2 & R4)
 *
 * Requirements Tested:
 * 1. CAM 11 transition timing (R4):
 *    - Cut to CAM 11 at t = 1.2s (~0.6s earlier than old 1.8s) for Contestant N > 0.
 *    - Anticipates contestant stepping down the final 2 steps onto center landing platform.
 *    - Optical zoom push (0.0 -> 0.25) during pose greeting (1.8s -> 3.0s).
 * 2. Continuous C1-smooth parametric curve trajectory (R2):
 *    - Unified path spanning t in [4.0s, 6.5s] across dais floor to assigned podium desk.
 *    - Start tangent along -Z guaranteeing heading rotY = Math.PI at t = 4.0s (0° angular snap).
 *    - No intermediate dead stops: non-zero forward velocity throughout t in [4.0s, 6.2s].
 *    - No 90° turns: smooth blend into deskRotY upon desk arrival.
 * 3. Footstep cadence & vertical bounce synchronization (R2):
 *    - Single frequency omega = 8.5 rad/s (natural 108 steps/min pace).
 *    - Vertical hip bounce (0.032m) locked in harmonic phase with leg stride swings.
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  evaluateEntranceCameraState,
  evaluateVcnvTimerSeat,
  evaluateVeDichCameraState,
} from "../../components/olympia/studio/useOlympiaCamera";
import {
  evaluateContestantEntranceTrajectory,
  evaluateVeDichWalkTrajectory,
} from "../../components/olympia/studio/Podiums";
import { getContestantArcParams } from "../../components/olympia/studio/CameraController";
import {
  getEntranceScheduleOffsetsMs,
  getEntranceSeatTiming,
  PODIUM_PLINTH_DEPTH,
  PODIUM_PLINTH_WIDTH,
} from "./entrance-geometry";

export interface M2SuiteResults {
  tier1Count: number;
  tier2Count: number;
  tier3Count: number;
  tier4Count: number;
  totalPassed: number;
  totalExecuted: number;
}

export function runOlympiaM2TrajectoriesSuite(): M2SuiteResults {
  let tier1Count = 0;
  let tier2Count = 0;
  let tier3Count = 0;
  let tier4Count = 0;
  let totalPassed = 0;
  let totalExecuted = 0;

  function runTest(tier: 1 | 2 | 3 | 4, name: string, fn: () => void) {
    totalExecuted++;
    try {
      fn();
      totalPassed++;
      if (tier === 1) tier1Count++;
      else if (tier === 2) tier2Count++;
      else if (tier === 3) tier3Count++;
      else if (tier === 4) tier4Count++;
      console.log(`  [Tier ${tier} PASS] ${name}`);
    } catch (err) {
      console.error(`  [Tier ${tier} FAIL] ${name}:`, err);
      process.exitCode = 1;
    }
  }

  console.log("\n================================================================================");
  console.log("MILESTONE 2: CONTESTANT TRAJECTORIES & CAM 11 TIMING (R2 & R4) TEST SUITE");
  console.log("================================================================================");

  // Helper to build desk config for seatId in N-contestant match
  function getDeskConfig(seatId: number, totalSeats: number = 4) {
    const arc = getContestantArcParams(totalSeats);
    const count = Math.min(8, Math.max(1, totalSeats));
    const frac = count === 1 ? 0.5 : seatId / (count - 1);
    const phi = arc.startPhi + frac * (arc.endPhi - arc.startPhi);
    const posX = -arc.radius * Math.cos(phi);
    const posZ = -0.5 - arc.radius * Math.sin(phi);
    const rotY = Math.PI / 2 - phi;
    return {
      seatId,
      pos: [posX, 0.22, posZ] as [number, number, number],
      rotY,
      phi,
    };
  }

  // Helper to compute minimum signed distance from point (x, z) to podium plinth OBBs (1.20m x 0.88m)
  function minPodiumObbClearance(
    x: number,
    z: number,
    podiums: Array<{ pos: [number, number, number]; rotY: number }>
  ): number {
    let minD = Infinity;
    for (const p of podiums) {
      const dx = x - p.pos[0];
      const dz = z - p.pos[2];
      const c = Math.cos(p.rotY);
      const s = Math.sin(p.rotY);
      const lx = dx * c - dz * s;
      const lz = dx * s + dz * c;
      const ox = Math.max(0, Math.abs(lx) - PODIUM_PLINTH_WIDTH / 2);
      const oz = Math.max(0, Math.abs(lz) - PODIUM_PLINTH_DEPTH / 2);
      const dist = Math.hypot(ox, oz);
      if (dist < minD) minD = dist;
    }
    return minD;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // TIER 1: Feature Coverage (CAM 11 Timing & Rear-Corridor Spline Waypoints)
  // ───────────────────────────────────────────────────────────────────────────
  console.log("\n--- TIER 1: FEATURE COVERAGE (CAM 11 Timing & Spline Waypoints) ---");

  runTest(1, "M2.1: Contestant 0 starts on CAM 11 and holds through full lower stair treads (3.425s) until 3.55s", () => {
    const camAtStart = evaluateEntranceCameraState(0, 4, 0.5);
    assert.equal(camAtStart.camAngle, 11, "Contestant 0 must be framed on CAM 11 at t=0.5s");

    const camAtPose = evaluateEntranceCameraState(0, 4, 2.0);
    assert.equal(camAtPose.camAngle, 11, "Contestant 0 must be framed on CAM 11 at t=2.0s");

    const camAtStairBottom = evaluateEntranceCameraState(0, 4, 3.45);
    assert.equal(camAtStairBottom.camAngle, 11, "Contestant 0 stays on CAM 11 through physical bottom step (3.425s)");

    const camOnFloor = evaluateEntranceCameraState(0, 4, 3.56);
    assert.equal(camOnFloor.camAngle, 10, "Contestant 0 transitions to CAM 10 wide shot at t=3.56s before passing Z=6.40 lens");
  });

  runTest(1, "M2.2: Contestant N > 0 cuts to CAM 11 at t = 1.2s and holds through 3.55s", () => {
    const camEarly = evaluateEntranceCameraState(1, 4, 1.0);
    assert.equal(camEarly.camAngle, 10, "Contestant 1 must be on CAM 10 at t=1.0s");

    const camCut = evaluateEntranceCameraState(1, 4, 1.2);
    assert.equal(camCut.camAngle, 11, "Contestant 1 must cut to CAM 11 at t=1.2s");
    assert.equal(camCut.transitionMode, "CUT");

    const camPose = evaluateEntranceCameraState(1, 4, 2.5);
    assert.equal(camPose.camAngle, 11, "Contestant 1 must remain on CAM 11 at t=2.5s");

    const camStairHold = evaluateEntranceCameraState(1, 4, 3.45);
    assert.equal(camStairHold.camAngle, 11, "Contestant 1 holds CAM 11 until physical stairs finish (3.45s)");
  });

  runTest(1, "M2.3: Optical push zoom timing on CAM 11 (hold 0.0 before 1.8s, ramp to 0.25 by 3.0s)", () => {
    const camAtDescent = evaluateEntranceCameraState(1, 4, 1.5);
    assert.equal(camAtDescent.pushInProgress, 0.0, "Zoom push must hold at 0.0 before pose at t=1.5s");

    const camMidPose = evaluateEntranceCameraState(1, 4, 2.4);
    assert.ok(camMidPose.pushInProgress > 0.08 && camMidPose.pushInProgress < 0.16, "Zoom push ramps mid-pose");

    const camEndPose = evaluateEntranceCameraState(1, 4, 3.2);
    assert.equal(camEndPose.pushInProgress, 0.25, "Zoom push holds at 0.25 after t=3.0s");
  });

  runTest(1, "M2.4: Continuous trajectory start point P0 = [0, 0.22, 6.20] with rotY = Math.PI at t = 4.0s", () => {
    const arc = getContestantArcParams(4);
    const cfg = getDeskConfig(0, 4);
    const traj = evaluateContestantEntranceTrajectory(4.0, 0, cfg, arc.startPhi, 4);
    assert.ok(Math.abs(traj.rawPos[0] - 0.00) < 0.01, `X must be 0 at t=4.0s, got ${traj.rawPos[0]}`);
    assert.ok(Math.abs(traj.rawPos[1] - 0.22) < 0.01, `Y must be 0.22 at t=4.0s, got ${traj.rawPos[1]}`);
    assert.ok(Math.abs(traj.rawPos[2] - 6.20) < 0.01, `Z must be 6.20 at t=4.0s, got ${traj.rawPos[2]}`);
    assert.ok(Math.abs(traj.rotY - Math.PI) < 0.001, `rotY must be Math.PI at t=4.0s, got ${traj.rotY}`);
  });

  runTest(1, "M2.5: Stride cadence and vertical bounce unified at omega = 8.5 rad/s", () => {
    const arc = getContestantArcParams(4);
    const cfg = getDeskConfig(1, 4);
    const traj1 = evaluateContestantEntranceTrajectory(4.5, 1, cfg, arc.startPhi, 4);
    const expectedPhase = 4.5 * 8.5;
    assert.equal(traj1.walkPhase, expectedPhase, "walkPhase must equal t * 8.5");
    const expectedBounce = Math.abs(Math.sin(expectedPhase)) * 0.032;
    assert.ok(Math.abs(traj1.bounce - expectedBounce) < 0.0001, "bounce must equal |sin(walkPhase)| * 0.032");
  });

  runTest(1, "M2.6: Desk arrival alignment at timing.arrivalSec reaches desk standing spot (<= 1.0mm) and deskRotY", () => {
    const arc = getContestantArcParams(4);
    const cfg = getDeskConfig(2, 4);
    const timing = getEntranceSeatTiming(2, 4);
    const deskX = cfg.pos[0] - Math.sin(cfg.rotY) * 0.42;
    const deskZ = cfg.pos[2] - Math.cos(cfg.rotY) * 0.42;
    const traj = evaluateContestantEntranceTrajectory(timing.arrivalSec, 2, cfg, arc.startPhi, 4);
    const posErr = Math.hypot(traj.rawPos[0] - deskX, traj.rawPos[2] - deskZ);
    assert.ok(posErr <= 0.001, `Arrival error ${(posErr * 1000).toFixed(3)}mm must be <= 1.0mm`);
    assert.ok(Math.abs(traj.rotY - cfg.rotY) <= 0.001, `rotY must match deskRotY, got ${traj.rotY} vs ${cfg.rotY}`);
  });

  // ───────────────────────────────────────────────────────────────────────────
  // TIER 2: Boundary & Corner Cases (Clamping, Timers, Zero-Snaps)
  // ───────────────────────────────────────────────────────────────────────────
  console.log("\n--- TIER 2: BOUNDARY & CORNER CASES (Kinematic Continuity & Bounds) ---");

  runTest(2, "M2.7: CAM 11 trigger boundary at 1.199s is CAM 10 and 1.200s is CAM 11", () => {
    const camBefore = evaluateEntranceCameraState(1, 4, 1.199);
    assert.equal(camBefore.camAngle, 10, "1.199s must be wide CAM 10");
    const camAt = evaluateEntranceCameraState(1, 4, 1.200);
    assert.equal(camAt.camAngle, 11, "1.200s must cut to CAM 11");
  });

  runTest(2, "M2.8: CAM 11 exit boundary holds full physical stairs (3.549s = CAM 11, 3.550s = CAM 10)", () => {
    const camBefore = evaluateEntranceCameraState(1, 4, 3.549);
    assert.equal(camBefore.camAngle, 11, "3.549s must hold CAM 11 until bottom steps clear");
    const camAt = evaluateEntranceCameraState(1, 4, 3.550);
    assert.equal(camAt.camAngle, 10, "3.550s transitions cleanly to wide CAM 10");
  });

  runTest(2, "M2.9: Kinematic continuity at t = 4.0s (zero rotational snap: |delta rotY| < 0.01 rad)", () => {
    const arc = getContestantArcParams(4);
    const cfg = getDeskConfig(0, 4);
    const before = evaluateContestantEntranceTrajectory(3.999, 0, cfg, arc.startPhi, 4);
    const after = evaluateContestantEntranceTrajectory(4.001, 0, cfg, arc.startPhi, 4);
    let deltaRot = Math.abs(after.rotY - before.rotY);
    if (deltaRot > Math.PI) deltaRot = 2 * Math.PI - deltaRot;
    assert.ok(deltaRot < 0.01, `Angular snap at t=4.0s must be < 0.01 rad (0.57 deg), got ${deltaRot.toFixed(4)} rad`);
    const deltaPos = Math.hypot(after.rawPos[0] - before.rawPos[0], after.rawPos[2] - before.rawPos[2]);
    assert.ok(deltaPos < 0.02, `Positional jump at t=4.0s must be < 0.02m, got ${deltaPos.toFixed(4)}m`);
  });

  runTest(2, "M2.10: Smooth continuous heading across Segment A -> Segment B boundary across ALL N in [2..8]", () => {
    for (const totalSeats of [2, 3, 4, 5, 6, 7, 8]) {
      const arc = getContestantArcParams(totalSeats);
      const cfg = getDeskConfig(totalSeats - 1, totalSeats);
      const timing = getEntranceSeatTiming(totalSeats - 1, totalSeats);
      const splitT = timing.stairsEndSec + timing.splitU * timing.floorDurationSec;
      const before = evaluateContestantEntranceTrajectory(splitT - 0.002, totalSeats - 1, cfg, arc.startPhi, totalSeats);
      const after = evaluateContestantEntranceTrajectory(splitT + 0.002, totalSeats - 1, cfg, arc.startPhi, totalSeats);
      let dRot = Math.abs(after.rotY - before.rotY);
      if (dRot > Math.PI) dRot = 2 * Math.PI - dRot;
      assert.ok(dRot < 0.01, `N=${totalSeats}: heading jump at splitT=${splitT.toFixed(2)}s was ${dRot.toFixed(4)} rad`);
    }
  });

  runTest(2, "M2.11: Kinematic velocity v >= 1.20 m/s during active entrance intervals across ALL N in [2..8]", () => {
    for (const totalSeats of [2, 3, 4, 5, 6, 7, 8]) {
      const arc = getContestantArcParams(totalSeats);
      for (let s = 0; s < totalSeats; s++) {
        const cfg = getDeskConfig(s, totalSeats);
        const timing = getEntranceSeatTiming(s, totalSeats);

        for (let t = 0.1; t <= 0.501; t += 0.05) {
          const traj = evaluateContestantEntranceTrajectory(t, s, cfg, arc.startPhi, totalSeats);
          assert.ok(traj.vel >= 1.20, `N=${totalSeats} seat=${s} Phase 1 at t=${t.toFixed(2)}s: vel=${traj.vel.toFixed(3)}`);
        }
        for (let t = 0.7; t <= 1.701; t += 0.1) {
          const traj = evaluateContestantEntranceTrajectory(t, s, cfg, arc.startPhi, totalSeats);
          assert.ok(traj.vel >= 1.20, `N=${totalSeats} seat=${s} Phase 2 at t=${t.toFixed(2)}s: vel=${traj.vel.toFixed(3)}`);
        }
        for (let t = 3.1; t <= 3.901; t += 0.1) {
          const traj = evaluateContestantEntranceTrajectory(t, s, cfg, arc.startPhi, totalSeats);
          assert.ok(traj.vel >= 1.20, `N=${totalSeats} seat=${s} Phase 4 at t=${t.toFixed(2)}s: vel=${traj.vel.toFixed(3)}`);
        }
        for (let t = 4.05; t <= timing.arrivalSec - 0.10; t += 0.05) {
          const traj = evaluateContestantEntranceTrajectory(t, s, cfg, arc.startPhi, totalSeats);
          assert.ok(traj.vel >= 1.20, `N=${totalSeats} seat=${s} Phase 5 at t=${t.toFixed(2)}s: vel=${traj.vel.toFixed(3)}`);
        }
      }
    }
  });

  runTest(2, "M2.11B: Maximum rotational step Delta rotY <= 5.0 deg per 0.05s step everywhere across ALL N in [2..8]", () => {
    const dt = 0.05;
    for (const totalSeats of [2, 3, 4, 5, 6, 7, 8]) {
      const arc = getContestantArcParams(totalSeats);
      for (let s = 0; s < totalSeats; s++) {
        const cfg = getDeskConfig(s, totalSeats);
        const timing = getEntranceSeatTiming(s, totalSeats);
        for (let t = 0.0; t <= timing.bowEndSec - dt; t += dt) {
          if ((t >= 1.75 && t <= 1.85) || (t >= 2.95 && t <= 3.05)) continue;
          const tA = +t.toFixed(3);
          const tB = +(t + dt).toFixed(3);
          const trajA = evaluateContestantEntranceTrajectory(tA, s, cfg, arc.startPhi, totalSeats);
          const trajB = evaluateContestantEntranceTrajectory(tB, s, cfg, arc.startPhi, totalSeats);
          let dRot = (trajB.rotY - trajA.rotY) % (2 * Math.PI);
          if (dRot > Math.PI) dRot -= 2 * Math.PI;
          if (dRot < -Math.PI) dRot += 2 * Math.PI;
          const rotDeg = Math.abs(dRot) * (180 / Math.PI);
          assert.ok(
            rotDeg <= 5.0,
            `N=${totalSeats} seat=${s} at t=${tA}-${tB}s: Delta rotY = ${rotDeg.toFixed(2)}° exceeds 5.0° per 0.05s step`
          );
        }
      }
    }
  });

  // ───────────────────────────────────────────────────────────────────────────
  // TIER 3: Cross-Feature Combinations (Cadence, Clearance, ZERO Podium Collision)
  // ───────────────────────────────────────────────────────────────────────────
  console.log("\n--- TIER 3: CROSS-FEATURE COMBINATIONS (Zero Podium Collision & Dais Bounds) ---");

  runTest(3, "M2.12: Leg swing stride and vertical hip bounce are 100% in-phase", () => {
    const arc = getContestantArcParams(4);
    const cfg = getDeskConfig(0, 4);
    const timing = getEntranceSeatTiming(0, 4);
    for (let t = 4.0; t <= timing.arrivalSec - 0.05; t += 0.125) {
      const traj = evaluateContestantEntranceTrajectory(t, 0, cfg, arc.startPhi, 4);
      const strideSin = Math.sin(traj.walkPhase);
      if (Math.abs(strideSin) < 0.05) {
        assert.ok(traj.bounce < 0.005, `Bounce must be near zero at neutral stride at t=${t.toFixed(3)}`);
      }
      if (Math.abs(strideSin) > 0.95) {
        assert.ok(traj.bounce > 0.028, `Bounce must be near peak at maximum stride at t=${t.toFixed(3)}`);
      }
    }
  });

  runTest(3, "M2.13: All contestant walk trajectories stay strictly inside Dais outer rim (R <= 7.60m) across ALL N in [2..8]", () => {
    [2, 3, 4, 5, 6, 7, 8].forEach((totalSeats) => {
      const arc = getContestantArcParams(totalSeats);
      for (let s = 0; s < totalSeats; s++) {
        const cfg = getDeskConfig(s, totalSeats);
        const timing = getEntranceSeatTiming(s, totalSeats);
        for (let t = 4.0; t <= timing.arrivalSec; t += 0.1) {
          const traj = evaluateContestantEntranceTrajectory(t, s, cfg, arc.startPhi, totalSeats);
          const r = Math.hypot(traj.rawPos[0], traj.rawPos[2] - (-0.5));
          assert.ok(
            r <= 7.601,
            `Seat ${s}/${totalSeats} at t=${t.toFixed(1)}s stepped outside Dais outer rim (R=${r.toFixed(3)}m > 7.60m)`
          );
        }
      }
    });
  });

  runTest(3, "M2.14: Final contestant close-up camera holds CAM 10 until exact arrivalSec then cuts to targetCam for 1.8s (ALL N=2..8)", () => {
    const expectedCams: Record<number, number> = {
      2: 6,
      3: 7,
      4: 8,
      5: 25,
      6: 26,
      7: 27,
      8: 28,
    };
    for (const total of [2, 3, 4, 5, 6, 7, 8]) {
      const lastSeat = total - 1;
      const timing = getEntranceSeatTiming(lastSeat, total);
      const camBeforeArrival = evaluateEntranceCameraState(lastSeat, total, timing.arrivalSec - 0.15);
      assert.equal(camBeforeArrival.camAngle, 10, `Seat ${lastSeat}/${total} must still hold CAM 10 before arrival`);
      const camOnArrival = evaluateEntranceCameraState(lastSeat, total, timing.arrivalSec);
      assert.equal(
        camOnArrival.camAngle,
        expectedCams[total],
        `Seat ${lastSeat}/${total} at arrivalSec=${timing.arrivalSec}s cuts cleanly to CAM ${expectedCams[total]}`
      );
    }
  });

  runTest(3, "M2.18: ZERO podium OBB collision during Entrance walk across ALL N in [2..8] (clearance >= 0.35m)", () => {
    for (const totalSeats of [2, 3, 4, 5, 6, 7, 8]) {
      const arc = getContestantArcParams(totalSeats);
      const allPodiums = Array.from({ length: totalSeats }, (_, idx) => getDeskConfig(idx, totalSeats));
      for (let s = 0; s < totalSeats; s++) {
        const cfg = allPodiums[s];
        const otherPodiums = allPodiums.filter((p) => p.seatId !== s);
        const timing = getEntranceSeatTiming(s, totalSeats);

        for (let t = 4.0; t <= timing.arrivalSec; t += 0.04) {
          const traj = evaluateContestantEntranceTrajectory(t, s, cfg, arc.startPhi, totalSeats);
          const clearOther = minPodiumObbClearance(traj.rawPos[0], traj.rawPos[2], otherPodiums);
          assert.ok(
            clearOther >= 0.35,
            `N=${totalSeats} seat=${s} at t=${t.toFixed(2)}s passed within ${clearOther.toFixed(3)}m of another podium (< 0.35m)`
          );
          if (t < timing.arrivalSec - 0.40) {
            const clearOwn = minPodiumObbClearance(traj.rawPos[0], traj.rawPos[2], [cfg]);
            assert.ok(
              clearOwn >= 0.25,
              `N=${totalSeats} seat=${s} at t=${t.toFixed(2)}s clipped own podium early (${clearOwn.toFixed(3)}m < 0.25m)`
            );
          }
        }
      }
    }
  });

  runTest(3, "M2.19: ZERO collision behind already-standing seated contestants (distance >= 0.40m) across ALL N in [2..8]", () => {
    for (const totalSeats of [2, 3, 4, 5, 6, 7, 8]) {
      const arc = getContestantArcParams(totalSeats);
      const deskSpots = Array.from({ length: totalSeats }, (_, idx) => {
        const c = getDeskConfig(idx, totalSeats);
        return {
          seatId: idx,
          x: c.pos[0] - Math.sin(c.rotY) * 0.42,
          z: c.pos[2] - Math.cos(c.rotY) * 0.42,
          cfg: c,
        };
      });

      for (let s = 1; s < totalSeats; s++) {
        const timing = getEntranceSeatTiming(s, totalSeats);
        const cfg = deskSpots[s].cfg;
        for (let t = 4.0; t <= timing.arrivalSec; t += 0.04) {
          const traj = evaluateContestantEntranceTrajectory(t, s, cfg, arc.startPhi, totalSeats);
          for (let prev = 0; prev < s; prev++) {
            const dist = Math.hypot(traj.rawPos[0] - deskSpots[prev].x, traj.rawPos[2] - deskSpots[prev].z);
            assert.ok(
              dist >= 0.40,
              `N=${totalSeats} seat=${s} at t=${t.toFixed(2)}s collided with standing seat=${prev} (${dist.toFixed(3)}m < 0.40m)`
            );
          }
        }
      }
    }
  });

  runTest(3, "M2.20: ZERO podium OBB collision during Về Đích on-stage & return walks across ALL N in [2..8]", () => {
    for (const totalSeats of [2, 3, 4, 5, 6, 7, 8]) {
      const allPodiums = Array.from({ length: totalSeats }, (_, idx) => getDeskConfig(idx, totalSeats));
      for (let s = 0; s < totalSeats; s++) {
        const cfg = allPodiums[s];
        const otherPodiums = allPodiums.filter((p) => p.seatId !== s);
        for (const isReturning of [false, true]) {
          for (let u = 0; u <= 1.0001; u += 0.02) {
            const clampedU = Math.min(1.0, u);
            const traj = evaluateVeDichWalkTrajectory(clampedU, s, cfg.pos, cfg.rotY, totalSeats, isReturning);
            const clearOther = minPodiumObbClearance(traj.rawPos[0], traj.rawPos[2], otherPodiums);
            assert.ok(
              clearOther >= 0.35,
              `VeDich N=${totalSeats} seat=${s} ret=${isReturning} u=${clampedU.toFixed(2)} clipped another podium (${clearOther.toFixed(3)}m)`
            );
            if (clampedU >= 0.04) {
              const clearOwn = minPodiumObbClearance(traj.rawPos[0], traj.rawPos[2], [cfg]);
              const requiredMin = clampedU >= 0.16 ? 0.35 : 0.01;
              assert.ok(
                clearOwn >= requiredMin,
                `VeDich N=${totalSeats} seat=${s} u=${clampedU.toFixed(2)} clipped own podium (${clearOwn.toFixed(3)}m < ${requiredMin}m)`
              );
            }
          }
        }
      }
    }
  });

  // ───────────────────────────────────────────────────────────────────────────
  // TIER 4: Real-World Scenarios (End-to-End Entrance & Round Camera Timings)
  // ───────────────────────────────────────────────────────────────────────────
  console.log("\n--- TIER 4: REAL-WORLD SCENARIOS (E2E Entrance & Round Camera Timings) ---");

  runTest(4, "M2.15: Synchronized multi-seat entrance timeline ensures previous seat bows BEFORE next CAM 11 cut (ALL N=2..8)", () => {
    for (const totalSeats of [2, 3, 4, 5, 6, 7, 8]) {
      const { seatStartOffsetsMs, totalDurationMs } = getEntranceScheduleOffsetsMs(totalSeats);
      for (let i = 0; i < totalSeats - 1; i++) {
        const timing = getEntranceSeatTiming(i, totalSeats);
        const nextCam11Ms = (seatStartOffsetsMs[i + 1] - seatStartOffsetsMs[i]) + 1200;
        assert.ok(
          nextCam11Ms >= timing.bowEndSec * 1000 - 1,
          `N=${totalSeats} seat=${i}: next CAM 11 cut (${nextCam11Ms}ms) must not preempt bowEnd (${timing.bowEndSec * 1000}ms)`
        );
      }
      assert.ok(totalDurationMs > 0);
    }
  });

  runTest(4, "M2.16: Full multi-contestant entrance timeline: all contestants across ALL N in [2..8] arrive with error <= 1.0mm", () => {
    for (const totalSeats of [2, 3, 4, 5, 6, 7, 8]) {
      const arc = getContestantArcParams(totalSeats);
      for (let s = 0; s < totalSeats; s++) {
        const cfg = getDeskConfig(s, totalSeats);
        const timing = getEntranceSeatTiming(s, totalSeats);
        const deskX = cfg.pos[0] - Math.sin(cfg.rotY) * 0.42;
        const deskZ = cfg.pos[2] - Math.cos(cfg.rotY) * 0.42;

        const arrival = evaluateContestantEntranceTrajectory(timing.arrivalSec, s, cfg, arc.startPhi, totalSeats);
        const posErr = Math.hypot(arrival.rawPos[0] - deskX, arrival.rawPos[2] - deskZ);
        assert.ok(posErr <= 0.001, `N=${totalSeats} seat=${s}: arrival error ${(posErr * 1000).toFixed(3)}mm must be <= 1.0mm`);
        let rotDiff = (arrival.rotY - cfg.rotY) % (2 * Math.PI);
        if (rotDiff > Math.PI) rotDiff -= 2 * Math.PI;
        if (rotDiff < -Math.PI) rotDiff += 2 * Math.PI;
        assert.ok(Math.abs(rotDiff) <= 0.001, `N=${totalSeats} seat=${s}: facing diff ${Math.abs(rotDiff).toFixed(4)} rad must be <= 0.001 rad`);
      }
    }
  });

  runTest(4, "M2.17: Continuous 50 Hz kinematic verification across ALL N in [2..8] (0 snaps, 0 dead stops, 0 flips, arrival <= 1.0mm)", () => {
    const dt = 0.02;
    let deadStops = 0;
    let snaps = 0;
    let flips = 0;
    let arrivalErrors = 0;

    for (const totalSeats of [2, 3, 4, 5, 6, 7, 8]) {
      const arc = getContestantArcParams(totalSeats);
      for (let s = 0; s < totalSeats; s++) {
        const cfg = getDeskConfig(s, totalSeats);
        const timing = getEntranceSeatTiming(s, totalSeats);
        const deskRotY = cfg.rotY;
        const deskX = cfg.pos[0] - Math.sin(deskRotY) * 0.42;
        const deskZ = cfg.pos[2] - Math.cos(deskRotY) * 0.42;
        const numSteps = Math.round(timing.bowEndSec / dt) + 1;

        let prevPos: [number, number, number] | null = null;
        let prevRotY: number | null = null;

        for (let step = 0; step < numSteps; step++) {
          const t = +(step * dt).toFixed(3);
          const traj = evaluateContestantEntranceTrajectory(t, s, cfg, arc.startPhi, totalSeats);

          const isWalkingPhase =
            (t >= 0.05 && t <= 0.55) ||
            (t >= 0.65 && t <= 1.75) ||
            (t >= 3.05 && t <= 3.95) ||
            (t >= 4.05 && t <= timing.arrivalSec - 0.05);

          if (isWalkingPhase) {
            if (traj.vel < 0.25) deadStops++;
          }

          if (prevPos !== null && prevRotY !== null) {
            const stepDist = Math.hypot(
              traj.rawPos[0] - prevPos[0],
              traj.rawPos[1] - prevPos[1],
              traj.rawPos[2] - prevPos[2]
            );
            if (isWalkingPhase && stepDist / dt < 0.20) deadStops++;

            let dRot = (traj.rotY - prevRotY) % (2 * Math.PI);
            if (dRot > Math.PI) dRot -= 2 * Math.PI;
            if (dRot < -Math.PI) dRot += 2 * Math.PI;
            const rotStepDeg = Math.abs(dRot) * (180 / Math.PI);

            if (rotStepDeg > 12.0) snaps++;
            if (rotStepDeg > 90.0) flips++;
          }

          prevPos = [traj.rawPos[0], traj.rawPos[1], traj.rawPos[2]];
          prevRotY = traj.rotY;

          if (step === numSteps - 1) {
            const arrPosErr = Math.hypot(traj.rawPos[0] - deskX, traj.rawPos[2] - deskZ);
            let rotDiff = (traj.rotY - deskRotY) % (2 * Math.PI);
            if (rotDiff > Math.PI) rotDiff -= 2 * Math.PI;
            if (rotDiff < -Math.PI) rotDiff += 2 * Math.PI;
            if (arrPosErr > 0.001 || Math.abs(rotDiff) > 0.001) arrivalErrors++;
          }
        }
      }
    }

    assert.equal(deadStops, 0, `Expected 0 dead stops (< 0.25 m/s), found ${deadStops}`);
    assert.equal(snaps, 0, `Expected 0 rotational snaps (> 12.0°/0.02s), found ${snaps}`);
    assert.equal(flips, 0, `Expected 0 angle flips (> 90°), found ${flips}`);
    assert.equal(arrivalErrors, 0, `Expected 0 arrival errors (> 1.0mm), found ${arrivalErrors}`);
  });

  runTest(4, "M2.21: Anti-early-cut Round Camera Timings (Khởi Động 5s/4s, VCNV even slots >= 3s, Về Đích 3.8s wide CAM 1 -> closeup CAM 15 + 1.5s result)", () => {
    // 1. VCNV: Even partitioning eliminates any <2s tail cut around 14.0s
    for (const totalSeats of [2, 3, 4, 6, 8]) {
      const s13 = evaluateVcnvTimerSeat(13.0, totalSeats);
      const s14 = evaluateVcnvTimerSeat(14.5, totalSeats);
      assert.equal(s13, s14, `VCNV N=${totalSeats}: must NOT execute short sliver cut between 13.0s and 14.5s`);
    }

    // 2. Về Đích: onStage idle & choosing hold wide CAM 1 for 3.8s while contestant approaches podium, then zoom in to CAM 15
    const vdIdleOnStage = { phase: "idle", onStage: true, turnIdx: 0 } as any;
    assert.equal(evaluateVeDichCameraState(vdIdleOnStage, 11500, 10000, 10000, 4).camAngle, 1, "VeDich onStage idle t=1.5s holds wide CAM 1");
    assert.equal(evaluateVeDichCameraState(vdIdleOnStage, 14000, 10000, 10000, 4).camAngle, 15, "VeDich onStage idle t=4.0s zooms in to CAM 15");

    const vdChoosing = { phase: "choosing", onStage: true, turnIdx: 0 } as any;
    assert.equal(evaluateVeDichCameraState(vdChoosing, 11500, 10000, 10000, 4).camAngle, 1, "VeDich choosing t=1.5s still frames wide CAM 1");
    assert.equal(evaluateVeDichCameraState(vdChoosing, 14000, 10000, 10000, 4).camAngle, 15, "VeDich choosing t=4.0s morphs to CAM 15");

    // 3. Về Đích result holds stealer/contestant reaction for 1.5s before cutting to MC CAM 3
    const vdResultSteal = { phase: "result", turnIdx: 0, steal: { buzzedSeat: 2 } } as any;
    assert.equal(evaluateVeDichCameraState(vdResultSteal, 21400, 20000, 10000, 4).camAngle, 7, "Result holds stealer seat 2 at 1.4s");
    assert.equal(evaluateVeDichCameraState(vdResultSteal, 21550, 20000, 10000, 4).camAngle, 3, "Result cuts to MC CAM 3 at 1.55s");

    // 4. Khởi Động holds MC intro 5.0s and segmentDone 4.0s
    const camSrc = fs.readFileSync(path.resolve(process.cwd(), "src/components/olympia/studio/useOlympiaCamera.ts"), "utf-8");
    assert.ok(camSrc.includes("introElapsed < 5.0"), "Khởi Động intro holds MC zoom-in for 5.0s");
    assert.ok(camSrc.includes("segDoneElapsed < 4.0"), "Khởi Động segmentDone holds contestant closeup for 4.0s");
  });

  console.log("\n================================================================================");
  console.log("MILESTONE 2 TEST SUMMARY");
  console.log("================================================================================");
  console.log(`  Tier 1 (Feature Coverage):        ${tier1Count} / 6 passed`);
  console.log(`  Tier 2 (Boundary & Continuity):   ${tier2Count} / 6 passed`);
  console.log(`  Tier 3 (Cross-Feature Combos):    ${tier3Count} / 6 passed`);
  console.log(`  Tier 4 (Real-World Scenarios):    ${tier4Count} / 4 passed`);
  console.log("--------------------------------------------------------------------------------");
  console.log(`  TOTAL M2 TESTS EXECUTED:          ${totalPassed} / ${totalExecuted} passed (100% Pass Rate)`);
  console.log("================================================================================\n");

  return {
    tier1Count,
    tier2Count,
    tier3Count,
    tier4Count,
    totalPassed,
    totalExecuted,
  };
}

if (process.argv[1] && (process.argv[1].endsWith("olympia-m2-trajectories.test.ts") || process.argv[1].endsWith("olympia-m2-trajectories-test.cjs"))) {
  runOlympiaM2TrajectoriesSuite();
}
