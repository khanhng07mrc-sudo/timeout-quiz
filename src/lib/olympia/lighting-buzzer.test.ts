// Unit test for Olympia 3D studio lighting and buzzer reaction system
// Run: node scratch/lighting-test.cjs

import assert from "node:assert/strict";
import {
  isSeatBuzzedIn3D,
  computeTargetLightingMode,
  calculateZoneFade,
  hermiteSmoothstep,
  STAGGER_CONFIG,
} from "../../components/olympia/studio/useOlympiaLightingState";
import type { OlympiaState } from "./types";

let passed = 0;
function test(name: string, fn: () => void) {
  try {
    fn();
    passed++;
    console.log("  ok  ", name);
  } catch (e) {
    console.error("  FAIL", name, e);
    process.exitCode = 1;
  }
}

console.log("Olympia 3D Lighting & Buzzer System Tests");

// ── 1. BUZZER REACTION CONTRACTS ──────────────────────────────────────────
test("Khởi động: buzzed seat glows red, others do not", () => {
  const dummyState: any = {
    currentRound: "khoiDong",
    khoiDong: { buzzedSeat: 2 },
  };
  assert.equal(isSeatBuzzedIn3D(2, dummyState), true);
  assert.equal(isSeatBuzzedIn3D(0, dummyState), false);
  assert.equal(isSeatBuzzedIn3D(1, dummyState), false);
  assert.equal(isSeatBuzzedIn3D(3, dummyState), false);
});

test("VCNV: strictly fastest (first) bell rings red; subsequent buzzers remain unlit", () => {
  const dummyState: any = {
    currentRound: "vcnv",
    vcnv: {
      bells: [
        { seat: 1, before: false, atMs: 1200 },
        { seat: 3, before: false, atMs: 1450 },
        { seat: 0, before: false, atMs: 1600 },
      ],
    },
  };
  // Seat 1 is first:
  assert.equal(isSeatBuzzedIn3D(1, dummyState), true, "Fastest bell must light up red");
  // Seats 3 and 0 also buzzed, but must NOT light up red:
  assert.equal(isSeatBuzzedIn3D(3, dummyState), false, "Subsequent buzzers must stay unlit");
  assert.equal(isSeatBuzzedIn3D(0, dummyState), false, "Subsequent buzzers must stay unlit");
  assert.equal(isSeatBuzzedIn3D(2, dummyState), false);
});

test("Về đích: steal buzzer seat glows red", () => {
  const dummyState: any = {
    currentRound: "veDich",
    veDich: {
      steal: { open: false, buzzedSeat: 3, timer: { remainingMs: 0 } },
    },
  };
  assert.equal(isSeatBuzzedIn3D(3, dummyState), true);
  assert.equal(isSeatBuzzedIn3D(0, dummyState), false);
  assert.equal(isSeatBuzzedIn3D(1, dummyState), false);
});

test("Câu hỏi phụ: buzzed seat glows red", () => {
  const dummyState: any = {
    currentRound: "cauHoiPhu",
    cauHoiPhu: { buzzedSeat: 0 },
  };
  assert.equal(isSeatBuzzedIn3D(0, dummyState), true);
  assert.equal(isSeatBuzzedIn3D(1, dummyState), false);
});

// ── 2. DYNAMIC LIGHTING ROUND RULES ───────────────────────────────────────
test("Non-playing or lobby state defaults to BLUE base lighting", () => {
  const lobbyState: any = { stage: "lobby", currentRound: null };
  assert.equal(computeTargetLightingMode(lobbyState), "BLUE");
});

test("Khởi động: turns RED when started, reverts to BLUE on segment finish or idle", () => {
  const runningState: any = {
    stage: "playing",
    currentRound: "khoiDong",
    khoiDong: { started: true, phase: "question" },
  };
  assert.equal(computeTargetLightingMode(runningState), "RED");

  const finishedSegmentState: any = {
    stage: "playing",
    currentRound: "khoiDong",
    khoiDong: { started: true, phase: "segmentDone" },
  };
  assert.equal(computeTargetLightingMode(finishedSegmentState), "BLUE");

  const notStartedState: any = {
    stage: "playing",
    currentRound: "khoiDong",
    khoiDong: { started: false, phase: "idle" },
  };
  assert.equal(computeTargetLightingMode(notStartedState), "BLUE");
});

test("VCNV & Tăng tốc: starts BLUE, turns RED after 2.5s timer running delay, reverts to BLUE on finish", () => {
  const now = 10000;
  // VCNV started 1.5s ago (< 2.5s) -> BLUE
  const vcnvEarly: any = {
    stage: "playing",
    currentRound: "vcnv",
    vcnv: { phase: "question", timer: { startedAt: now - 1500 } },
  };
  assert.equal(computeTargetLightingMode(vcnvEarly, now), "BLUE");

  // VCNV started 3.0s ago (>= 2.5s) -> RED
  const vcnvActive: any = {
    stage: "playing",
    currentRound: "vcnv",
    vcnv: { phase: "question", timer: { startedAt: now - 3000 } },
  };
  assert.equal(computeTargetLightingMode(vcnvActive, now), "RED");

  // VCNV grid or answers reveal -> reverts to BLUE
  const vcnvAnswers: any = {
    stage: "playing",
    currentRound: "vcnv",
    vcnv: { phase: "answers", timer: { startedAt: now - 3000 } },
  };
  assert.equal(computeTargetLightingMode(vcnvAnswers, now), "BLUE");

  // Tăng tốc started 1.0s ago (< 2.5s) -> BLUE
  const ttEarly: any = {
    stage: "playing",
    currentRound: "tangToc",
    tangToc: { phase: "question", timer: { startedAt: now - 1000 } },
  };
  assert.equal(computeTargetLightingMode(ttEarly, now), "BLUE");

  // Tăng tốc started 2.8s ago (>= 2.5s) -> RED
  const ttActive: any = {
    stage: "playing",
    currentRound: "tangToc",
    tangToc: { phase: "question", timer: { startedAt: now - 2800 } },
  };
  assert.equal(computeTargetLightingMode(ttActive, now), "RED");

  // Tăng tốc ranking -> reverts to BLUE
  const ttRanking: any = {
    stage: "playing",
    currentRound: "tangToc",
    tangToc: { phase: "ranking", timer: { startedAt: now - 2800 } },
  };
  assert.equal(computeTargetLightingMode(ttRanking, now), "BLUE");
});

test("Về đích: turns RED on package selection through turn finish; reverts to BLUE on finish", () => {
  const vdChoosing: any = {
    stage: "playing",
    currentRound: "veDich",
    veDich: { phase: "choosing" },
  };
  assert.equal(computeTargetLightingMode(vdChoosing), "RED");

  const vdThinking: any = {
    stage: "playing",
    currentRound: "veDich",
    veDich: { phase: "thinking" },
  };
  assert.equal(computeTargetLightingMode(vdThinking), "RED");

  const vdDone: any = {
    stage: "playing",
    currentRound: "veDich",
    veDich: { phase: "seatDone" },
  };
  assert.equal(computeTargetLightingMode(vdDone), "BLUE");

  const vdIdle: any = {
    stage: "playing",
    currentRound: "veDich",
    veDich: { phase: "idle" },
  };
  assert.equal(computeTargetLightingMode(vdIdle), "BLUE");
});

// ── 3. STAGGERED MULTI-ZONE FADE ENGINE ──────────────────────────────────
test("Staggered fade sequence: screen first (t=0), stage middle (t=0.5), audience last (t=0.7)", () => {
  // Screen: delay 0.0s, duration 0.9s
  // Stage: delay 0.5s, duration 1.2s
  // Audience: delay 0.7s, duration 1.2s

  // At elapsed = 0.2s:
  const screenAt02 = calculateZoneFade(0, 1, 0.2, STAGGER_CONFIG.screen.delay, STAGGER_CONFIG.screen.duration);
  const stageAt02 = calculateZoneFade(0, 1, 0.2, STAGGER_CONFIG.stage.delay, STAGGER_CONFIG.stage.duration);
  const audAt02 = calculateZoneFade(0, 1, 0.2, STAGGER_CONFIG.audience.delay, STAGGER_CONFIG.audience.duration);
  assert.ok(screenAt02 > 0, "Screen zone should start fading immediately");
  assert.equal(stageAt02, 0, "Stage zone should remain un-faded at t=0.2s");
  assert.equal(audAt02, 0, "Audience zone should remain un-faded at t=0.2s");

  // At elapsed = 0.6s:
  const screenAt06 = calculateZoneFade(0, 1, 0.6, STAGGER_CONFIG.screen.delay, STAGGER_CONFIG.screen.duration);
  const stageAt06 = calculateZoneFade(0, 1, 0.6, STAGGER_CONFIG.stage.delay, STAGGER_CONFIG.stage.duration);
  const audAt06 = calculateZoneFade(0, 1, 0.6, STAGGER_CONFIG.audience.delay, STAGGER_CONFIG.audience.duration);
  assert.ok(screenAt06 > 0.6, "Screen zone should be significantly faded");
  assert.ok(stageAt06 > 0 && stageAt06 < 0.3, "Stage zone just started fading");
  assert.equal(audAt06, 0, "Audience zone should still be at 0 at t=0.6s");

  // At elapsed = 2.0s:
  const screenAt20 = calculateZoneFade(0, 1, 2.0, STAGGER_CONFIG.screen.delay, STAGGER_CONFIG.screen.duration);
  const stageAt20 = calculateZoneFade(0, 1, 2.0, STAGGER_CONFIG.stage.delay, STAGGER_CONFIG.stage.duration);
  const audAt20 = calculateZoneFade(0, 1, 2.0, STAGGER_CONFIG.audience.delay, STAGGER_CONFIG.audience.duration);
  assert.equal(screenAt20, 1, "Screen zone should reach 1.0");
  assert.equal(stageAt20, 1, "Stage zone should reach 1.0");
  assert.ok(audAt20 > 0.95, "Audience zone should be almost or fully 1.0");
});

test("Hermite cubic smoothstep boundary and midpoint", () => {
  assert.equal(hermiteSmoothstep(0), 0);
  assert.equal(hermiteSmoothstep(1), 1);
  assert.equal(hermiteSmoothstep(0.5), 0.5);
  // Monotonic
  assert.ok(hermiteSmoothstep(0.25) < hermiteSmoothstep(0.5));
  assert.ok(hermiteSmoothstep(0.5) < hermiteSmoothstep(0.75));
});

console.log(`${passed} lighting-buzzer tests passed`);
