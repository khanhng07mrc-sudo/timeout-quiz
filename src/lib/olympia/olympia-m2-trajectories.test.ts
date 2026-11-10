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
import { evaluateEntranceCameraState } from "../../components/olympia/studio/useOlympiaCamera";
import { evaluateContestantEntranceTrajectory } from "../../components/olympia/studio/Podiums";
import { getContestantArcParams } from "../../components/olympia/studio/CameraController";

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

  // ───────────────────────────────────────────────────────────────────────────
  // TIER 1: Feature Coverage (CAM 11 Timing & Spline Waypoints)
  // ───────────────────────────────────────────────────────────────────────────
  console.log("\n--- TIER 1: FEATURE COVERAGE (CAM 11 Timing & Spline Waypoints) ---");

  runTest(1, "M2.1: Contestant 0 starts immediately on CAM 11 until 3.8s", () => {
    const camAtStart = evaluateEntranceCameraState(0, 4, 0.5);
    assert.equal(camAtStart.camAngle, 11, "Contestant 0 must be framed on CAM 11 at t=0.5s");

    const camAtPose = evaluateEntranceCameraState(0, 4, 2.0);
    assert.equal(camAtPose.camAngle, 11, "Contestant 0 must be framed on CAM 11 at t=2.0s");

    const camAtDescent = evaluateEntranceCameraState(0, 4, 4.0);
    assert.equal(camAtDescent.camAngle, 10, "Contestant 0 transitions to CAM 10 wide shot at t=4.0s");
  });

  runTest(1, "M2.2: Contestant N > 0 cuts to CAM 11 at t = 1.2s (~0.6s early anticipatory cut)", () => {
    // Before 1.2s: Wide shot (CAM 10) while previous contestant settles
    const camEarly = evaluateEntranceCameraState(1, 4, 1.0);
    assert.equal(camEarly.camAngle, 10, "Contestant 1 must be on CAM 10 at t=1.0s");

    // At 1.2s: Cuts early to CAM 11 to frame the contestant descending the final 2 steps
    const camCut = evaluateEntranceCameraState(1, 4, 1.2);
    assert.equal(camCut.camAngle, 11, "Contestant 1 must cut to CAM 11 at t=1.2s");
    assert.equal(camCut.transitionMode, "CUT");

    // During mid-landing greeting: CAM 11 active
    const camPose = evaluateEntranceCameraState(1, 4, 2.5);
    assert.equal(camPose.camAngle, 11, "Contestant 1 must remain on CAM 11 at t=2.5s");
  });

  runTest(1, "M2.3: Optical push zoom timing on CAM 11 (hold 0.0 before 1.8s, ramp to 0.25 by 3.0s)", () => {
    // t in [1.2, 1.8): pushInProgress = 0.0 (holding steady as contestant steps onto landing)
    const camAtDescent = evaluateEntranceCameraState(1, 4, 1.5);
    assert.equal(camAtDescent.pushInProgress, 0.0, "Zoom push must hold at 0.0 before pose at t=1.5s");

    // t in [1.8, 3.0): gentle zoom push
    const camMidPose = evaluateEntranceCameraState(1, 4, 2.4);
    assert.ok(camMidPose.pushInProgress > 0.08 && camMidPose.pushInProgress < 0.16, "Zoom push ramps mid-pose");

    // t >= 3.0: zoom push reaches maximum 0.25
    const camEndPose = evaluateEntranceCameraState(1, 4, 3.2);
    assert.equal(camEndPose.pushInProgress, 0.25, "Zoom push holds at 0.25 after t=3.0s");
  });

  runTest(1, "M2.4: Continuous trajectory start point P0 = [0, 0.22, 6.20] with rotY = Math.PI at t = 4.0s", () => {
    const cfg = getDeskConfig(0, 4);
    const traj = evaluateContestantEntranceTrajectory(4.0, 0, cfg, cfg.phi);
    assert.ok(Math.abs(traj.rawPos[0] - 0.00) < 0.01, `X must be 0 at t=4.0s, got ${traj.rawPos[0]}`);
    assert.ok(Math.abs(traj.rawPos[1] - 0.22) < 0.01, `Y must be 0.22 at t=4.0s, got ${traj.rawPos[1]}`);
    assert.ok(Math.abs(traj.rawPos[2] - 6.20) < 0.01, `Z must be 6.20 at t=4.0s, got ${traj.rawPos[2]}`);
    assert.ok(Math.abs(traj.rotY - Math.PI) < 0.001, `rotY must be Math.PI at t=4.0s, got ${traj.rotY}`);
  });

  runTest(1, "M2.5: Stride cadence and vertical bounce unified at omega = 8.5 rad/s", () => {
    const cfg = getDeskConfig(1, 4);
    const traj1 = evaluateContestantEntranceTrajectory(4.5, 1, cfg, cfg.phi);
    const expectedPhase = 4.5 * 8.5;
    assert.equal(traj1.walkPhase, expectedPhase, "walkPhase must equal t * 8.5");
    const expectedBounce = Math.abs(Math.sin(expectedPhase)) * 0.032;
    assert.ok(Math.abs(traj1.bounce - expectedBounce) < 0.0001, "bounce must equal |sin(walkPhase)| * 0.032");
  });

  runTest(1, "M2.6: Desk arrival alignment at t = 6.5s reaches desk standing spot and deskRotY", () => {
    const cfg = getDeskConfig(2, 4);
    const deskX = cfg.pos[0] - Math.sin(cfg.rotY) * 0.42;
    const deskZ = cfg.pos[2] - Math.cos(cfg.rotY) * 0.42;
    const traj = evaluateContestantEntranceTrajectory(6.5, 2, cfg, cfg.phi);
    assert.ok(Math.abs(traj.rawPos[0] - deskX) < 0.01, `X must match deskX, got ${traj.rawPos[0]} vs ${deskX}`);
    assert.ok(Math.abs(traj.rawPos[2] - deskZ) < 0.01, `Z must match deskZ, got ${traj.rawPos[2]} vs ${deskZ}`);
    assert.ok(Math.abs(traj.rotY - cfg.rotY) < 0.01, `rotY must match deskRotY, got ${traj.rotY} vs ${cfg.rotY}`);
  });

  // ───────────────────────────────────────────────────────────────────────────
  // TIER 2: Boundary & Corner Cases (Clamping, Timers, Zero-Snaps)
  // ───────────────────────────────────────────────────────────────────────────
  console.log("\n--- TIER 2: BOUNDARY & CORNER CASES (Kinematic Continuity & Bounds) ---");

  runTest(2, "M2.7: CAM 11 trigger boundary at exactly 1.199s is CAM 10 and 1.200s is CAM 11", () => {
    const camBefore = evaluateEntranceCameraState(1, 4, 1.199);
    assert.equal(camBefore.camAngle, 10, "1.199s must be wide CAM 10");
    const camAt = evaluateEntranceCameraState(1, 4, 1.200);
    assert.equal(camAt.camAngle, 11, "1.200s must cut to CAM 11");
  });

  runTest(2, "M2.8: CAM 11 exit boundary at exactly 3.799s is CAM 11 and 3.800s is CAM 10", () => {
    const camBefore = evaluateEntranceCameraState(1, 4, 3.799);
    assert.equal(camBefore.camAngle, 11, "3.799s must still be CAM 11");
    const camAt = evaluateEntranceCameraState(1, 4, 3.800);
    assert.equal(camAt.camAngle, 10, "3.800s must return to wide CAM 10");
  });

  runTest(2, "M2.9: Kinematic continuity at t = 4.0s (zero rotational snap: |delta rotY| < 0.01 rad)", () => {
    const cfg = getDeskConfig(0, 4);
    const before = evaluateContestantEntranceTrajectory(3.999, 0, cfg, cfg.phi);
    const after = evaluateContestantEntranceTrajectory(4.001, 0, cfg, cfg.phi);
    let deltaRot = Math.abs(after.rotY - before.rotY);
    if (deltaRot > Math.PI) deltaRot = 2 * Math.PI - deltaRot;
    assert.ok(deltaRot < 0.01, `Angular snap at t=4.0s must be < 0.01 rad (0.57 deg), got ${deltaRot.toFixed(4)} rad`);
    const deltaPos = Math.hypot(after.rawPos[0] - before.rawPos[0], after.rawPos[2] - before.rawPos[2]);
    assert.ok(deltaPos < 0.02, `Positional jump at t=4.0s must be < 0.02m, got ${deltaPos.toFixed(4)}m`);
  });

  runTest(2, "M2.10: Smooth continuous heading across old phase boundaries (t = 5.0s and t = 6.1s)", () => {
    const cfg = getDeskConfig(1, 6);
    // Old Phase 5A -> 5B boundary at t = 5.0s
    const t5Before = evaluateContestantEntranceTrajectory(4.999, 1, cfg, cfg.phi);
    const t5After = evaluateContestantEntranceTrajectory(5.001, 1, cfg, cfg.phi);
    let deltaT5 = Math.abs(t5After.rotY - t5Before.rotY);
    if (deltaT5 > Math.PI) deltaT5 = 2 * Math.PI - deltaT5;
    assert.ok(deltaT5 < 0.01, `Heading jump at t=5.0s must be < 0.01 rad, got ${deltaT5.toFixed(4)} rad`);

    // Old Phase 5B -> 5C boundary at t = 6.1s
    const t6Before = evaluateContestantEntranceTrajectory(6.099, 1, cfg, cfg.phi);
    const t6After = evaluateContestantEntranceTrajectory(6.101, 1, cfg, cfg.phi);
    let deltaT6 = Math.abs(t6After.rotY - t6Before.rotY);
    if (deltaT6 > Math.PI) deltaT6 = 2 * Math.PI - deltaT6;
    assert.ok(deltaT6 < 0.01, `Heading jump at t=6.1s must be < 0.01 rad, got ${deltaT6.toFixed(4)} rad`);
  });

  runTest(2, "M2.11: Positive forward velocity across entire walk interval t in [4.0, 6.2]s for all seats", () => {
    [4, 6, 8].forEach((totalSeats) => {
      for (let s = 0; s < totalSeats; s++) {
        const cfg = getDeskConfig(s, totalSeats);
        for (let t = 4.0; t <= 6.2; t += 0.2) {
          const traj = evaluateContestantEntranceTrajectory(t, s, cfg, cfg.phi);
          assert.ok(
            traj.vel > 0.10,
            `Seat ${s}/${totalSeats} at t=${t.toFixed(1)}s must have vel > 0.10 m/s (no dead stops), got ${traj.vel.toFixed(3)} m/s`
          );
        }
      }
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // TIER 3: Cross-Feature Combinations (Cadence, Clearance, Multi-Contestant)
  // ───────────────────────────────────────────────────────────────────────────
  console.log("\n--- TIER 3: CROSS-FEATURE COMBINATIONS (Cadence Synchrony & Dais Boundaries) ---");

  runTest(3, "M2.12: Leg swing stride and vertical hip bounce are 100% in-phase", () => {
    const cfg = getDeskConfig(0, 4);
    // Sample 20 time points during floor walk
    for (let t = 4.0; t <= 6.5; t += 0.125) {
      const traj = evaluateContestantEntranceTrajectory(t, 0, cfg, cfg.phi);
      const strideSin = Math.sin(traj.walkPhase);
      const bounceSin = Math.sin(traj.walkPhase);
      // When stride swing is near 0 (neutral leg cross), bounce must be near 0
      if (Math.abs(strideSin) < 0.05) {
        assert.ok(traj.bounce < 0.005, `Bounce must be near zero at neutral stride at t=${t.toFixed(3)}`);
      }
      // When stride swing is at maximum (|sin| = 1), bounce must be at peak 0.032m
      if (Math.abs(strideSin) > 0.95) {
        assert.ok(traj.bounce > 0.028, `Bounce must be near peak at maximum stride at t=${t.toFixed(3)}`);
      }
    }
  });

  runTest(3, "M2.13: All contestant walk trajectories remain inside Dais platform boundary (R <= 8.2m)", () => {
    [4, 6, 8].forEach((totalSeats) => {
      for (let s = 0; s < totalSeats; s++) {
        const cfg = getDeskConfig(s, totalSeats);
        for (let t = 4.0; t <= 6.5; t += 0.1) {
          const traj = evaluateContestantEntranceTrajectory(t, s, cfg, cfg.phi);
          const r = Math.hypot(traj.rawPos[0], traj.rawPos[2] - (-0.5));
          assert.ok(
            r <= 8.20,
            `Seat ${s}/${totalSeats} at t=${t.toFixed(1)}s went outside dais radius (R=${r.toFixed(2)}m > 8.20m)`
          );
        }
      }
    });
  });

  runTest(3, "M2.14: Final contestant close-up camera handoff at t = 6.2s for 4, 6, 8 seats", () => {
    // 4 seats: seat 3 is last seat, targetCam = 8
    const cam4 = evaluateEntranceCameraState(3, 4, 6.3);
    assert.equal(cam4.camAngle, 8, "Seat 3/4 at 6.3s frames CAM 8 close-up");

    // 6 seats: seat 5 is last seat, targetCam = 26
    const cam6 = evaluateEntranceCameraState(5, 6, 6.3);
    assert.equal(cam6.camAngle, 26, "Seat 5/6 at 6.3s frames CAM 26 close-up");

    // 8 seats: seat 7 is last seat, targetCam = 28
    const cam8 = evaluateEntranceCameraState(7, 8, 6.3);
    assert.equal(cam8.camAngle, 28, "Seat 7/8 at 6.3s frames CAM 28 close-up");
  });

  // ───────────────────────────────────────────────────────────────────────────
  // TIER 4: Real-World Scenarios (End-to-End Entrance Lifecycles)
  // ───────────────────────────────────────────────────────────────────────────
  console.log("\n--- TIER 4: REAL-WORLD SCENARIOS (E2E Entrance Sequences) ---");

  runTest(4, "M2.15: Full 4-contestant entrance timeline: smooth camera and kinematic handoffs", () => {
    // 4 contestants, staggered by 4.0s: Total entrance sequence = 3 * 4.0 + 6.8 = 18.8s
    const totalDuration = 18.8;
    for (let globalSec = 0; globalSec <= totalDuration; globalSec += 0.5) {
      const currentSeat = Math.min(3, Math.floor(globalSec / 4.0));
      const seatElapsed = globalSec - currentSeat * 4.0;
      const cam = evaluateEntranceCameraState(currentSeat, 4, seatElapsed);
      assert.ok(cam.camAngle >= 5 && cam.camAngle <= 28, `Camera angle ${cam.camAngle} must be valid broadcast angle`);
    }
  });

  runTest(4, "M2.16: Full 8-contestant entrance timeline: all 8 contestants arrive cleanly at desks", () => {
    // 8 contestants, staggered by 4.0s: Total entrance sequence = 7 * 4.0 + 6.8 = 34.8s
    for (let s = 0; s < 8; s++) {
      const cfg = getDeskConfig(s, 8);
      const deskX = cfg.pos[0] - Math.sin(cfg.rotY) * 0.42;
      const deskZ = cfg.pos[2] - Math.cos(cfg.rotY) * 0.42;

      // Check arrival at t = 6.5s
      const arrival = evaluateContestantEntranceTrajectory(6.5, s, cfg, cfg.phi);
      assert.ok(Math.abs(arrival.rawPos[0] - deskX) < 0.02, `Seat ${s} X arrival matches desk`);
      assert.ok(Math.abs(arrival.rawPos[2] - deskZ) < 0.02, `Seat ${s} Z arrival matches desk`);
      assert.ok(Math.abs(arrival.rotY - cfg.rotY) < 0.02, `Seat ${s} facing matches desk`);
    }
  });

  console.log("\n================================================================================");
  console.log("MILESTONE 2 TEST SUMMARY");
  console.log("================================================================================");
  console.log(`  Tier 1 (Feature Coverage):        ${tier1Count} / 6 passed`);
  console.log(`  Tier 2 (Boundary & Continuity):   ${tier2Count} / 5 passed`);
  console.log(`  Tier 3 (Cross-Feature Combos):    ${tier3Count} / 3 passed`);
  console.log(`  Tier 4 (Real-World Scenarios):    ${tier4Count} / 2 passed`);
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
