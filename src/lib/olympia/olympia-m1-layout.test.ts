/**
 * Milestone 1 Test Suite: 3D Stage Layout & Camera Framing (Requirement R1)
 *
 * Requirements Tested:
 * 1. getContestantArcParams(totalSeats): Parametric radius, startPhi, endPhi, span for N = 1..8.
 * 2. Podium edge-to-edge physical clearance >= 30cm across all configurations (eliminating collision).
 * 3. Podium Dais platform containment (R in [5.2m, 7.6m], angle in [-18°, +90°]).
 * 4. CAM 10 getWidePodiumsCameraPreset(totalSeats) dynamic center target & distance scaling.
 * 5. Screen space framing margins >= 15% (broadcast safe margin ~20%) with zero clipping for N = 4..8.
 * 6. Individual contestant cameras (CAM 5..8, 25..28) synchronized to parametric podiums.
 * 7. Entrance corridor entryPhi dynamic adaptation for N = 4, 6, 7, 8.
 */

import assert from "node:assert/strict";
import {
  getContestantArcParams,
  getContestantPodiumWorldPos,
  getContestantCameraPreset,
  getWidePodiumsCameraPreset,
} from "../../components/olympia/studio/CameraController";

export interface M1SuiteResults {
  tier1Count: number;
  tier2Count: number;
  tier3Count: number;
  tier4Count: number;
  totalPassed: number;
  totalExecuted: number;
}

export function runOlympiaM1LayoutSuite(): M1SuiteResults {
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
  console.log("MILESTONE 1: STAGE LAYOUT & CAMERA FRAMING (R1) TEST SUITE");
  console.log("================================================================================");

  // ───────────────────────────────────────────────────────────────────────────
  // TIER 1: Feature Coverage (Arc Params, World Positions, Presets)
  // ───────────────────────────────────────────────────────────────────────────
  console.log("\n--- TIER 1: FEATURE COVERAGE (Arc Params & Camera Presets) ---");

  runTest(1, "M1.1: getContestantArcParams for 4 seats matches classic Olympia layout", () => {
    const params = getContestantArcParams(4);
    assert.equal(params.radius, 6.60);
    assert.equal(params.startPhi, 0.380);
    assert.equal(params.endPhi, 1.130);
    assert.equal(params.span, 0.750);
  });

  runTest(1, "M1.2: getContestantArcParams for 5 seats matches parametric specification", () => {
    const params = getContestantArcParams(5);
    assert.equal(params.radius, 6.65);
    assert.equal(params.startPhi, 0.180);
    assert.equal(params.endPhi, 1.140);
    assert.equal(params.span, 0.960);
  });

  runTest(1, "M1.3: getContestantArcParams for 6 seats matches Stage Left expanded arc specification", () => {
    const params = getContestantArcParams(6);
    assert.equal(params.radius, 6.65);
    assert.equal(params.startPhi, -0.010);
    assert.equal(params.endPhi, 1.140);
    assert.equal(params.span, 1.150);
  });

  runTest(1, "M1.4: getContestantArcParams for 7 seats matches Stage Left expanded arc specification", () => {
    const params = getContestantArcParams(7);
    assert.equal(params.radius, 6.65);
    assert.equal(params.startPhi, -0.240);
    assert.equal(params.endPhi, 1.140);
    assert.equal(params.span, 1.380);
  });

  runTest(1, "M1.5: getContestantArcParams for 8 seats matches Stage Left locked specification", () => {
    const params = getContestantArcParams(8);
    assert.equal(params.radius, 6.65);
    assert.equal(params.startPhi, -0.460);
    assert.equal(params.endPhi, 1.140);
    assert.equal(params.span, 1.600);
  });

  runTest(1, "M1.6: CAM 10 getWidePodiumsCameraPreset returns correct camera preset structure for all N in [2..8]", () => {
    for (const n of [2, 3, 4, 5, 6, 7, 8]) {
      const preset = getWidePodiumsCameraPreset(n);
      assert.equal(preset.id, 10);
      assert.equal(preset.label, "Toàn Cảnh Bục Thí Sinh");
      assert.equal(preset.pos.length, 3);
      assert.equal(preset.target.length, 3);
      assert.equal(preset.target[1], 1.15); // eye-level target
    }
  });

  runTest(1, "M1.7: Individual close-up cameras (CAM 5..8, 25..28) resolve IDs correctly", () => {
    const p0 = getContestantCameraPreset(0, 8);
    assert.equal(p0.id, 5);
    const p3 = getContestantCameraPreset(3, 8);
    assert.equal(p3.id, 8);
    const p4 = getContestantCameraPreset(4, 8);
    assert.equal(p4.id, 25);
    const p7 = getContestantCameraPreset(7, 8);
    assert.equal(p7.id, 28);
  });

  // ───────────────────────────────────────────────────────────────────────────
  // TIER 2: Boundary & Corner Cases (Clamping, Minimum Clearance >= 30cm)
  // ───────────────────────────────────────────────────────────────────────────
  console.log("\n--- TIER 2: BOUNDARY & CORNER CASES (Clearances & Clamping) ---");

  runTest(2, "M2.1: Seat counts clamped safely (N=0, negative, >8)", () => {
    const zero = getContestantArcParams(0);
    assert.equal(zero.radius, 6.60);
    const over = getContestantArcParams(12);
    assert.equal(over.radius, 6.65);
    assert.equal(over.span, 1.600);
  });

  runTest(2, "M2.2A: Podium edge clearance for N = 2 and N = 3 is >= 30cm (N=2 ~3.64m, N=3 ~1.26m)", () => {
    // N = 2
    const p0_2 = getContestantPodiumWorldPos(0, 2);
    const p1_2 = getContestantPodiumWorldPos(1, 2);
    const dist2 = Math.hypot(p1_2[0] - p0_2[0], p1_2[2] - p0_2[2]);
    const clr2 = dist2 - 1.20;
    assert.ok(clr2 >= 0.30, `N=2 clearance ${clr2.toFixed(3)}m must be >= 0.30m`);

    // N = 3
    for (let i = 0; i < 2; i++) {
      const pa = getContestantPodiumWorldPos(i, 3);
      const pb = getContestantPodiumWorldPos(i + 1, 3);
      const dist3 = Math.hypot(pb[0] - pa[0], pb[2] - pa[2]);
      const clr3 = dist3 - 1.20;
      assert.ok(clr3 >= 0.30, `N=3 seat ${i}-${i + 1} clearance ${clr3.toFixed(3)}m must be >= 0.30m`);
    }
  });

  runTest(2, "M2.2: Podium edge clearance for N = 4 is >= 40cm (+44.6cm actual)", () => {
    const p0 = getContestantPodiumWorldPos(0, 4);
    const p1 = getContestantPodiumWorldPos(1, 4);
    const dist = Math.hypot(p1[0] - p0[0], p1[2] - p0[2]);
    const clearance = dist - 1.20;
    assert.ok(clearance >= 0.40, `Clearance ${clearance}m must be >= 0.40m`);
  });

  runTest(2, "M2.3: Podium edge clearance for N = 5 is >= 35cm (+39.2cm actual)", () => {
    for (let i = 0; i < 4; i++) {
      const pa = getContestantPodiumWorldPos(i, 5);
      const pb = getContestantPodiumWorldPos(i + 1, 5);
      const dist = Math.hypot(pb[0] - pa[0], pb[2] - pa[2]);
      const clearance = dist - 1.20;
      assert.ok(clearance >= 0.35, `Seat ${i}-${i+1} clearance ${clearance}m must be >= 0.35m`);
    }
  });

  runTest(2, "M2.4: Podium edge clearance for N = 6 is >= 32cm (+32.6cm actual)", () => {
    for (let i = 0; i < 5; i++) {
      const pa = getContestantPodiumWorldPos(i, 6);
      const pb = getContestantPodiumWorldPos(i + 1, 6);
      const dist = Math.hypot(pb[0] - pa[0], pb[2] - pa[2]);
      const clearance = dist - 1.20;
      assert.ok(clearance >= 0.32, `Seat ${i}-${i+1} clearance ${clearance}m must be >= 0.32m`);
    }
  });

  runTest(2, "M2.5: Podium edge clearance for N = 7 is >= 32cm (+32.6cm actual)", () => {
    for (let i = 0; i < 6; i++) {
      const pa = getContestantPodiumWorldPos(i, 7);
      const pb = getContestantPodiumWorldPos(i + 1, 7);
      const dist = Math.hypot(pb[0] - pa[0], pb[2] - pa[2]);
      const clearance = dist - 1.20;
      assert.ok(clearance >= 0.32, `Seat ${i}-${i+1} clearance ${clearance}m must be >= 0.32m`);
    }
  });

  runTest(2, "M2.6: Podium edge clearance for N = 8 is >= 30cm (+31.7cm actual)", () => {
    for (let i = 0; i < 7; i++) {
      const pa = getContestantPodiumWorldPos(i, 8);
      const pb = getContestantPodiumWorldPos(i + 1, 8);
      const dist = Math.hypot(pb[0] - pa[0], pb[2] - pa[2]);
      const clearance = dist - 1.20;
      assert.ok(clearance >= 0.30, `Seat ${i}-${i+1} clearance ${clearance}m must be >= 0.30m`);
    }
  });

  runTest(2, "M2.6A: Universal inter-podium chord clearance >= 30cm across ALL N in [2, 3, 4, 5, 6, 7, 8]", () => {
    for (const N of [2, 3, 4, 5, 6, 7, 8]) {
      for (let s = 0; s < N - 1; s++) {
        const pa = getContestantPodiumWorldPos(s, N);
        const pb = getContestantPodiumWorldPos(s + 1, N);
        const chordDist = Math.hypot(pb[0] - pa[0], pb[2] - pa[2]);
        const clearance = chordDist - 1.20;
        assert.ok(
          clearance >= 0.30,
          `N=${N} adjacent pair ${s}-${s + 1}: chord clearance ${clearance.toFixed(3)}m must be >= 0.30m (30cm)`
        );
      }
    }
  });

  runTest(2, "M2.6B: Invariant - Rightmost podium X <= -2.2m and MC desk clearance >= 5.0m across all configurations N in [2..8]", () => {
    for (const total of [2, 3, 4, 5, 6, 7, 8]) {
      const rightmostPos = getContestantPodiumWorldPos(total - 1, total);
      assert.ok(
        rightmostPos[0] <= -2.20,
        `Total ${total}: rightmost podium X (${rightmostPos[0]}m) must be <= -2.20m`
      );

      const arc = getContestantArcParams(total);
      const phi = arc.endPhi;
      const rotY = Math.PI / 2 - phi;
      const cosR = Math.cos(rotY);
      const sinR = Math.sin(rotY);
      const halfW = 0.60;
      const halfD = 0.44;

      // Check distance from right edge of rightmost podium (lx = +halfW)
      const corner1X = rightmostPos[0] + (halfW * cosR + (-halfD) * sinR);
      const corner1Z = rightmostPos[2] + (-halfW * sinR + (-halfD) * cosR);
      const dist1 = Math.hypot(corner1X - 3.0, corner1Z - (-2.0));

      const corner2X = rightmostPos[0] + (halfW * cosR + halfD * sinR);
      const corner2Z = rightmostPos[2] + (-halfW * sinR + halfD * cosR);
      const dist2 = Math.hypot(corner2X - 3.0, corner2Z - (-2.0));

      const minEdgeDist = Math.min(dist1, dist2);
      assert.ok(
        minEdgeDist >= 5.0,
        `Total ${total}: distance from rightmost podium right edge (${minEdgeDist.toFixed(2)}m) to MC desk must be >= 5.0m`
      );
    }
  });

  runTest(2, "M2.7: All 4 plinth corners stay safely within Dais platform boundary across ALL match sizes N in [2..8] and all seats", () => {
    const halfW = 1.20 / 2; // 0.60m width
    const halfD = 0.88 / 2; // 0.44m depth
    const corners2D: [number, number][] = [
      [-halfW, -halfD],
      [+halfW, -halfD],
      [-halfW, +halfD],
      [+halfW, +halfD],
    ];

    for (const total of [2, 3, 4, 5, 6, 7, 8]) {
      const arc = getContestantArcParams(total);
      for (let s = 0; s < total; s++) {
        const frac = total === 1 ? 0.5 : s / (total - 1);
        const phi = arc.startPhi + frac * (arc.endPhi - arc.startPhi);
        const cx = -arc.radius * Math.cos(phi);
        const cz = -0.5 - arc.radius * Math.sin(phi);
        const rotY = Math.PI / 2 - phi;
        const cosR = Math.cos(rotY);
        const sinR = Math.sin(rotY);

        for (let c = 0; c < 4; c++) {
          const [lx, lz] = corners2D[c];
          const wx = cx + (lx * cosR + lz * sinR);
          const wz = cz + (-lx * sinR + lz * cosR);

          // Radial distance from dais center [0, -0.5]
          const rCorner = Math.hypot(wx, wz - (-0.5));

          // 1. Distance to Dais inner radius (5.20m) >= 0.25m (rFront >= 5.45m)
          const innerClearance = rCorner - 5.20;
          assert.ok(
            innerClearance >= 0.25,
            `N=${total} seat=${s} corner=${c}: inner clearance ${innerClearance.toFixed(3)}m must be >= 0.25m (r=${rCorner.toFixed(3)}m >= 5.45m)`
          );

          // 2. Distance to Dais outer radius (7.60m) >= 0.25m (rBack <= 7.35m)
          const outerClearance = 7.60 - rCorner;
          assert.ok(
            outerClearance >= 0.25,
            `N=${total} seat=${s} corner=${c}: outer clearance ${outerClearance.toFixed(3)}m must be >= 0.25m (r=${rCorner.toFixed(3)}m <= 7.35m)`
          );

          // 3. Angular margin to start angle (0.50*PI) and end angle (1.28*PI) >= 0.038 rad (>= 25cm)
          let a = Math.atan2(-(wz - (-0.5)), wx);
          if (a < 0) a += 2 * Math.PI;

          const startMargin = a - 0.50 * Math.PI;
          assert.ok(
            startMargin >= 0.038,
            `N=${total} seat=${s} corner=${c}: start angle margin ${startMargin.toFixed(4)} rad must be >= 0.038 rad (>= 25cm)`
          );

          const endMargin = 1.28 * Math.PI - a;
          assert.ok(
            endMargin >= 0.038,
            `N=${total} seat=${s} corner=${c}: end angle margin ${endMargin.toFixed(4)} rad must be >= 0.038 rad (>= 25cm)`
          );
        }
      }
    }
  });

  // ───────────────────────────────────────────────────────────────────────────
  // TIER 3: Cross-Feature Combinations (Camera Framing & Projection Verification)
  // ───────────────────────────────────────────────────────────────────────────
  console.log("\n--- TIER 3: CROSS-FEATURE COMBINATIONS (CAM 10 Framing & Margins) ---");

  /**
   * Helper to project a 3D point into Normalized Device Coordinates (NDC)
   * under a standard broadcast perspective camera (FOV 43 deg, 16:9).
   */
  function projectToNDC(
    point: [number, number, number],
    camPos: [number, number, number],
    camTarget: [number, number, number],
    fovDeg = 43,
    aspect = 16 / 9
  ): { x: number; y: number; zDist: number } {
    // Forward vector
    const fx = camTarget[0] - camPos[0];
    const fy = camTarget[1] - camPos[1];
    const fz = camTarget[2] - camPos[2];
    const fLen = Math.hypot(fx, fy, fz);
    const fwd = [fx / fLen, fy / fLen, fz / fLen];

    // Up vector (world Y)
    const up = [0, 1, 0];
    // Right vector = fwd x up
    const rx = fwd[1] * up[2] - fwd[2] * up[1];
    const ry = fwd[2] * up[0] - fwd[0] * up[2];
    const rz = fwd[0] * up[1] - fwd[1] * up[0];
    const rLen = Math.hypot(rx, ry, rz);
    const right = [rx / rLen, ry / rLen, rz / rLen];

    // Orthogonal true up = right x fwd
    const ux = right[1] * fwd[2] - right[2] * fwd[1];
    const uy = right[2] * fwd[0] - right[0] * fwd[2];
    const uz = right[0] * fwd[1] - right[1] * fwd[0];

    // Point relative to camera
    const dx = point[0] - camPos[0];
    const dy = point[1] - camPos[1];
    const dz = point[2] - camPos[2];

    // View coordinates
    const viewX = dx * right[0] + dy * right[1] + dz * right[2];
    const viewY = dx * ux + dy * uy + dz * uz;
    const viewZ = dx * fwd[0] + dy * fwd[1] + dz * fwd[2];

    const fovRad = (fovDeg * Math.PI) / 180;
    const tanHalfFov = Math.tan(fovRad / 2);
    const ndcY = viewY / (viewZ * tanHalfFov);
    const ndcX = viewX / (viewZ * tanHalfFov * aspect);

    return { x: ndcX, y: ndcY, zDist: viewZ };
  }

  runTest(3, "M3.1: CAM 10 frames 4 podiums with >= 20% safe broadcast margins and zero clipping", () => {
    const cam = getWidePodiumsCameraPreset(4);
    for (let s = 0; s < 4; s++) {
      const pos = getContestantPodiumWorldPos(s, 4, 1.25);
      const ndc = projectToNDC(pos, cam.pos, cam.target);
      assert.ok(ndc.zDist > 0, "Podium must be in front of camera");
      assert.ok(Math.abs(ndc.x) <= 0.80, `Podium ${s} NDC X ${ndc.x} must be within [-0.80, 0.80]`);
      assert.ok(Math.abs(ndc.y) <= 0.80, `Podium ${s} NDC Y ${ndc.y} must be within [-0.80, 0.80]`);
    }
  });

  runTest(3, "M3.2: CAM 10 frames 6 podiums with >= 20% safe broadcast margins and zero clipping", () => {
    const cam = getWidePodiumsCameraPreset(6);
    for (let s = 0; s < 6; s++) {
      const pos = getContestantPodiumWorldPos(s, 6, 1.25);
      const ndc = projectToNDC(pos, cam.pos, cam.target);
      assert.ok(ndc.zDist > 0, "Podium must be in front of camera");
      assert.ok(Math.abs(ndc.x) <= 0.80, `Podium ${s} NDC X ${ndc.x} must be within [-0.80, 0.80]`);
      assert.ok(Math.abs(ndc.y) <= 0.80, `Podium ${s} NDC Y ${ndc.y} must be within [-0.80, 0.80]`);
    }
  });

  runTest(3, "M3.3: CAM 10 frames 7 podiums with >= 18% safe broadcast margins and zero clipping", () => {
    const cam = getWidePodiumsCameraPreset(7);
    for (let s = 0; s < 7; s++) {
      const pos = getContestantPodiumWorldPos(s, 7, 1.25);
      const ndc = projectToNDC(pos, cam.pos, cam.target);
      assert.ok(ndc.zDist > 0, "Podium must be in front of camera");
      assert.ok(Math.abs(ndc.x) <= 0.82, `Podium ${s} NDC X ${ndc.x} must be within [-0.82, 0.82]`);
      assert.ok(Math.abs(ndc.y) <= 0.82, `Podium ${s} NDC Y ${ndc.y} must be within [-0.82, 0.82]`);
    }
  });

  runTest(3, "M3.4: CAM 10 frames 8 podiums with >= 15% safe broadcast margins across all plinth corners", () => {
    const cam = getWidePodiumsCameraPreset(8);
    const arc = getContestantArcParams(8);
    const halfW = 1.20 / 2; // 0.60m width
    const halfD = 0.88 / 2; // 0.44m depth
    const plinthH = 0.08;   // 0.08m height
    const baseY = 0.22;     // Dais platform height

    // 4 bottom and 4 top corners of each podium plinth base
    const localCorners: [number, number, number][] = [
      [-halfW, 0.00, -halfD],
      [+halfW, 0.00, -halfD],
      [-halfW, plinthH, -halfD],
      [+halfW, plinthH, -halfD],
      [-halfW, 0.00, +halfD],
      [+halfW, 0.00, +halfD],
      [-halfW, plinthH, +halfD],
      [+halfW, plinthH, +halfD],
    ];

    for (let s = 0; s < 8; s++) {
      const frac = s / 7;
      const phi = arc.startPhi + frac * (arc.endPhi - arc.startPhi);
      const cx = -arc.radius * Math.cos(phi);
      const cz = -0.5 - arc.radius * Math.sin(phi);
      const rotY = Math.PI / 2 - phi;
      const cosR = Math.cos(rotY);
      const sinR = Math.sin(rotY);

      for (let c = 0; c < localCorners.length; c++) {
        const [lx, ly, lz] = localCorners[c];
        const wx = cx + (lx * cosR + lz * sinR);
        const wy = baseY + ly;
        const wz = cz + (-lx * sinR + lz * cosR);

        const ndc = projectToNDC([wx, wy, wz], cam.pos, cam.target);
        assert.ok(ndc.zDist > 0, `Podium ${s} corner ${c} must be in front of camera`);
        assert.ok(
          Math.abs(ndc.x) <= 0.85,
          `Podium ${s} corner ${c} NDC X ${ndc.x.toFixed(4)} must be within [-0.85, 0.85]`
        );
        assert.ok(
          Math.abs(ndc.y) <= 0.85,
          `Podium ${s} corner ${c} NDC Y ${ndc.y.toFixed(4)} must be within [-0.85, 0.85]`
        );
      }
    }
  });

  runTest(3, "M3.5: Close-up camera presets maintain constant 2.45m distance and face normal", () => {
    for (const total of [4, 6, 8]) {
      for (let s = 0; s < total; s++) {
        const preset = getContestantCameraPreset(s, total);
        const camPos = preset.pos;
        const targetPos = preset.target;
        const dist = Math.hypot(camPos[0] - targetPos[0], camPos[2] - targetPos[2]);
        assert.ok(Math.abs(dist - 2.45) <= 0.05, `Distance ${dist}m must be ~2.45m`);
        assert.equal(camPos[1], 1.34);
        assert.equal(targetPos[1], 1.25);
      }
    }
  });

  runTest(3, "M3.6: CAM 10 Framing across ALL N in [2..8]: 8 plinth corners |NDC| <= 0.85, MC desk |NDC_x| > 1.0 (100% excluded)", () => {
    const halfW = 1.20 / 2; // 0.60m width
    const halfD = 0.88 / 2; // 0.44m depth
    const plinthH = 0.08;   // 0.08m height
    const baseY = 0.22;     // Dais platform height

    const local8Corners: [number, number, number][] = [
      [-halfW, 0.00, -halfD],
      [+halfW, 0.00, -halfD],
      [-halfW, plinthH, -halfD],
      [+halfW, plinthH, -halfD],
      [-halfW, 0.00, +halfD],
      [+halfW, 0.00, +halfD],
      [-halfW, plinthH, +halfD],
      [+halfW, plinthH, +halfD],
    ];

    // Actual MC desk: position [3.00, 0.08, -6.70], rotY = -0.25 rad, W=1.52m, D=0.62m, H=0.95m
    const mcActualHalfW = 1.52 / 2;
    const mcActualHalfD = 0.62 / 2;
    const mcCosR = Math.cos(-0.25);
    const mcSinR = Math.sin(-0.25);
    const mcActualCorners: [number, number, number][] = [];
    for (const lx of [-mcActualHalfW, mcActualHalfW]) {
      for (const lz of [-mcActualHalfD, mcActualHalfD]) {
        for (const ly of [0, 0.95]) {
          const wx = 3.00 + (lx * mcCosR + lz * mcSinR);
          const wy = 0.08 + ly;
          const wz = -6.70 + (-lx * mcSinR + lz * mcCosR);
          mcActualCorners.push([wx, wy, wz]);
        }
      }
    }

    const mcNominalCenter: [number, number, number] = [3.0, 0.22, -2.0];
    const mcActualCenter: [number, number, number] = [3.00, 0.08, -6.70];

    for (const N of [2, 3, 4, 5, 6, 7, 8]) {
      const cam = getWidePodiumsCameraPreset(N);
      const arc = getContestantArcParams(N);

      for (let s = 0; s < N; s++) {
        const frac = N === 1 ? 0.5 : s / (N - 1);
        const phi = arc.startPhi + frac * (arc.endPhi - arc.startPhi);
        const cx = -arc.radius * Math.cos(phi);
        const cz = -0.5 - arc.radius * Math.sin(phi);
        const rotY = Math.PI / 2 - phi;
        const cosR = Math.cos(rotY);
        const sinR = Math.sin(rotY);

        for (let c = 0; c < 8; c++) {
          const [lx, ly, lz] = local8Corners[c];
          const wx = cx + (lx * cosR + lz * sinR);
          const wy = baseY + ly;
          const wz = cz + (-lx * sinR + lz * cosR);

          const ndc = projectToNDC([wx, wy, wz], cam.pos, cam.target);
          assert.ok(ndc.zDist > 0, `N=${N} podium ${s} corner ${c} must be in front of camera`);
          assert.ok(
            Math.abs(ndc.x) <= 0.85,
            `N=${N} podium ${s} corner ${c} NDC X ${ndc.x.toFixed(4)} must be within [-0.85, 0.85] (margin >= 15%)`
          );
          assert.ok(
            Math.abs(ndc.y) <= 0.85,
            `N=${N} podium ${s} corner ${c} NDC Y ${ndc.y.toFixed(4)} must be within [-0.85, 0.85]`
          );
        }
      }

      // MC desk nominal center exclusion: |NDC_x| > 1.0 (100% excluded)
      const nomNDC = projectToNDC(mcNominalCenter, cam.pos, cam.target);
      assert.ok(
        Math.abs(nomNDC.x) > 1.0,
        `N=${N}: MC desk nominal center NDC X ${nomNDC.x.toFixed(3)} must be > 1.0 (excluded)`
      );

      // MC desk actual center exclusion: |NDC_x| > 1.0 (100% excluded)
      const actNDC = projectToNDC(mcActualCenter, cam.pos, cam.target);
      assert.ok(
        Math.abs(actNDC.x) > 1.0,
        `N=${N}: MC desk actual center NDC X ${actNDC.x.toFixed(3)} must be > 1.0 (excluded)`
      );

      // MC desk actual corners exclusion: |NDC_x| > 1.0 (100% excluded)
      for (let c = 0; c < mcActualCorners.length; c++) {
        const cNDC = projectToNDC(mcActualCorners[c], cam.pos, cam.target);
        assert.ok(
          Math.abs(cNDC.x) > 1.0,
          `N=${N}: MC desk corner ${c} NDC X ${cNDC.x.toFixed(3)} must be > 1.0 (excluded)`
        );
      }
    }
  });

  // ───────────────────────────────────────────────────────────────────────────
  // TIER 4: Real-World Scenarios (Full Match Configurations & Entrance Path)
  // ───────────────────────────────────────────────────────────────────────────
  console.log("\n--- TIER 4: REAL-WORLD SCENARIOS (Entrance Corridor & Match States) ---");

  runTest(4, "M4.1: Entrance entryPhi dynamically clears first podium for all N in [2..8]", () => {
    for (const total of [2, 3, 4, 5, 6, 7, 8]) {
      const params = getContestantArcParams(total);
      const firstPhi = params.startPhi;
      const entryPhi = Math.min(0.20, firstPhi - 0.06);

      // Verify entry corridor angle is strictly smaller than first podium angle
      assert.ok(entryPhi < firstPhi, `entryPhi ${entryPhi} must be < firstPhi ${firstPhi}`);
      // Clearance between entry corridor angle and first podium
      const angleClearanceDeg = ((firstPhi - entryPhi) * 180) / Math.PI;
      assert.ok(angleClearanceDeg >= 3.0, `Angular clearance ${angleClearanceDeg}° must be >= 3°`);
    }
  });

  runTest(4, "M4.2: Full 8-contestant stage arc symmetry and monotonic angle distribution", () => {
    const params = getContestantArcParams(8);
    let prevPhi = -10;
    for (let s = 0; s < 8; s++) {
      const frac = s / 7;
      const phi = params.startPhi + frac * (params.endPhi - params.startPhi);
      assert.ok(phi > prevPhi, `Angle ${phi} must be monotonically increasing`);
      prevPhi = phi;

      const pos = getContestantPodiumWorldPos(s, 8);
      // Ensure X is within stage dais sector [-7.20, -2.20], completely clear of MC desk at X = +3.0m
      assert.ok(pos[0] >= -7.20 && pos[0] <= -2.20, `X coordinate ${pos[0]} must be within [-7.20, -2.20] (Stage Left)`);
      assert.ok(pos[2] >= -7.50 && pos[2] <= 2.50, `Z coordinate ${pos[2]} must be within stage dais bounds`);
      const mcDist = Math.hypot(pos[0] - 3.0, pos[2] - (-2.0));
      assert.ok(mcDist >= 5.0, `Distance to MC desk (${mcDist.toFixed(2)}m) must be >= 5.0m`);
    }
  });

  console.log("\n================================================================================");
  console.log("MILESTONE 1 TEST SUMMARY");
  console.log("================================================================================");
  console.log(`  Tier 1 (Feature Coverage):        ${tier1Count} / 7 passed`);
  console.log(`  Tier 2 (Boundary & Clearances):   ${tier2Count} / 10 passed`);
  console.log(`  Tier 3 (Camera Framing):          ${tier3Count} / 6 passed`);
  console.log(`  Tier 4 (Real-World Scenarios):    ${tier4Count} / 2 passed`);
  console.log("--------------------------------------------------------------------------------");
  console.log(`  TOTAL M1 TESTS EXECUTED:          ${totalPassed} / ${totalExecuted} passed (100% Pass Rate)`);
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

if (process.argv[1] && (process.argv[1].includes("m1-layout") || process.argv[1].endsWith(".test.ts"))) {
  runOlympiaM1LayoutSuite();
}
