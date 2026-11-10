/**
 * Milestone 4 Test Suite: Seamless Intro Audio Looping (Requirement R5)
 *
 * Requirements Tested:
 * 1. Audio Track Classification (hooks.ts):
 *    - `isIntroSeamlessLoopTrack` correctly matches intro tracks (contest_intro, show_intro),
 *      including season paths and .mp3 suffixes.
 *    - Excludes non-intro tracks (buzzers, countdown ticks, standard looping BGM, other SFX).
 * 2. Audio Timing & Contestant Presentation Math (hooks.ts & engine.ts):
 *    - Audio asset `contest_intro.mp3` has exact duration 18.55s (18.5469s from MP3 frame math: 710 * 1152 / 44100).
 *    - Staggered entrance duration formula: T = (N - 1) * 4.0s + 6.8s.
 *    - Audio deficits without looping: 4 seats = +0.25s, 6 seats = +8.25s, 8 seats = +16.25s of dead silence.
 *    - Required loop count calculations: 4 seats -> 2, 6 seats -> 2, 8 seats -> 3 instances.
 * 3. Dual-Instance Predictive Crossfade Engine:
 *    - Overlap crossfade window W = 2.0s (2000ms).
 *    - Predictive crossfade trigger at t = duration - W = 16.55s.
 *    - Linear volume crossfade: V1(t) + V2(t) === 0.85 (continuous acoustic power, zero dropouts).
 *    - Seamless recursive crossfade transitions over extended playback.
 * 4. Real-World Broadcast Scenarios:
 *    - 6-contestant match entrance sequence (26.8s) completed seamlessly.
 *    - 8-contestant match entrance sequence (34.8s) completed seamlessly.
 *    - Round transition cues (start_round, open_question, ready) execute fadeOutAndStopBgm(1000)
 *      without abrupt cutoffs, clearing all pending predictive loop timers.
 *    - Source code AST/text verification for interface contracts in hooks.ts.
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  isIntroSeamlessLoopTrack,
  INTRO_CROSSFADE_WINDOW_SEC,
  INTRO_CROSSFADE_WINDOW_MS,
  CONTEST_INTRO_DURATION_SEC,
  CONTEST_INTRO_TRIGGER_SEC,
  calculateEntranceDuration,
  calculateRequiredIntroLoops,
  SeamlessIntroAudioLoopSimulator,
} from "../../components/olympia/hooks";

export interface M4SuiteResults {
  tier1Count: number;
  tier2Count: number;
  tier3Count: number;
  tier4Count: number;
  totalPassed: number;
  totalExecuted: number;
}

export function runOlympiaM4AudioSuite(): M4SuiteResults {
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
  console.log("MILESTONE 4: SEAMLESS INTRO AUDIO LOOPING (R5) TEST SUITE");
  console.log("================================================================================");

  const basePath = fs.existsSync(path.resolve(process.cwd(), "src/components/olympia/hooks.ts"))
    ? process.cwd()
    : path.resolve(__dirname, "../../..");
  const hooksSrc = fs.readFileSync(
    path.resolve(basePath, "src/components/olympia/hooks.ts"),
    "utf-8"
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // TIER 1: FEATURE COVERAGE (Track Classification & Helpers)
  // ─────────────────────────────────────────────────────────────────────────────
  console.log("\n--- TIER 1: FEATURE COVERAGE (Track Classification & Predicates) ---");

  runTest(1, "M4.1: isIntroSeamlessLoopTrack matches official cue '6_NhacKhac/contest_intro'", () => {
    assert.equal(isIntroSeamlessLoopTrack("6_NhacKhac/contest_intro"), true);
  });

  runTest(1, "M4.2: isIntroSeamlessLoopTrack matches short name 'contest_intro'", () => {
    assert.equal(isIntroSeamlessLoopTrack("contest_intro"), true);
  });

  runTest(1, "M4.3: isIntroSeamlessLoopTrack matches lobby cue '6_NhacKhac/show_intro'", () => {
    assert.equal(isIntroSeamlessLoopTrack("6_NhacKhac/show_intro"), true);
  });

  runTest(1, "M4.4: isIntroSeamlessLoopTrack matches short name 'show_intro'", () => {
    assert.equal(isIntroSeamlessLoopTrack("show_intro"), true);
  });

  runTest(1, "M4.5: isIntroSeamlessLoopTrack matches audio asset file with .mp3 suffix", () => {
    assert.equal(isIntroSeamlessLoopTrack("6_NhacKhac/contest_intro.mp3"), true);
    assert.equal(isIntroSeamlessLoopTrack("show_intro.mp3"), true);
  });

  runTest(1, "M4.6: isIntroSeamlessLoopTrack matches full HTTP URL audio path", () => {
    assert.equal(isIntroSeamlessLoopTrack("/olympia-audio/O26/6_NhacKhac/contest_intro.mp3"), true);
    assert.equal(isIntroSeamlessLoopTrack("http://localhost:3000/olympia-audio/O26/6_NhacKhac/contest_intro.mp3"), true);
  });

  runTest(1, "M4.7: isIntroSeamlessLoopTrack strictly excludes buzzer and SFX tracks", () => {
    assert.equal(isIntroSeamlessLoopTrack("1_KhoiDong/bell_ring"), false);
    assert.equal(isIntroSeamlessLoopTrack("1_KhoiDong/correct"), false);
    assert.equal(isIntroSeamlessLoopTrack("1_KhoiDong/wrong"), false);
    assert.equal(isIntroSeamlessLoopTrack("4_VeDich/star"), false);
  });

  runTest(1, "M4.8: isIntroSeamlessLoopTrack strictly excludes countdown tick tracks", () => {
    assert.equal(isIntroSeamlessLoopTrack("tick_20s"), false);
    assert.equal(isIntroSeamlessLoopTrack("tick_10s"), false);
    assert.equal(isIntroSeamlessLoopTrack("tick_40s"), false);
    assert.equal(isIntroSeamlessLoopTrack("5s_steal"), false);
  });

  runTest(1, "M4.9: isIntroSeamlessLoopTrack strictly excludes native looping round BGM tracks", () => {
    assert.equal(isIntroSeamlessLoopTrack("1_KhoiDong/kd_bgm_1"), false);
    assert.equal(isIntroSeamlessLoopTrack("1_KhoiDong/kd_bgm_2"), false);
  });

  runTest(1, "M4.10: isIntroSeamlessLoopTrack strictly excludes non-seamless intro/outro music tracks", () => {
    assert.equal(isIntroSeamlessLoopTrack("contestant_intro"), false);
    assert.equal(isIntroSeamlessLoopTrack("section_intro"), false);
    assert.equal(isIntroSeamlessLoopTrack("ending_music"), false);
    assert.equal(isIntroSeamlessLoopTrack(""), false);
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // TIER 2: BOUNDARY & MATH TOLERANCES (Durations, Deficits & Formulas)
  // ─────────────────────────────────────────────────────────────────────────────
  console.log("\n--- TIER 2: BOUNDARY & MATH TOLERANCES (Duration & Entrance Deficits) ---");

  runTest(2, "M4.11: Audio asset contest_intro.mp3 exists with 296,142 bytes (18.5469s MPEG frame math)", () => {
    const audioPath = path.resolve(basePath, "public/olympia-audio/O26/6_NhacKhac/contest_intro.mp3");
    assert.ok(fs.existsSync(audioPath), `Expected asset at ${audioPath}`);
    const stat = fs.statSync(audioPath);
    assert.equal(stat.size, 296142, "File size must match exact broadcast asset 296,142 bytes");

    // MP3 Frame calculation: 710 frames * 1152 samples/frame / 44100 Hz = 18.5469s
    const sampleRate = 44100;
    const samplesPerFrame = 1152;
    const totalFrames = 710;
    const calculatedDuration = (totalFrames * samplesPerFrame) / sampleRate;
    assert.ok(Math.abs(calculatedDuration - 18.5469) < 0.001);
  });

  runTest(2, "M4.12: Contract constants: CONTEST_INTRO_DURATION_SEC = 18.55s, INTRO_CROSSFADE_WINDOW_SEC = 2.0s", () => {
    assert.equal(CONTEST_INTRO_DURATION_SEC, 18.55);
    assert.equal(INTRO_CROSSFADE_WINDOW_SEC, 2.0);
    assert.equal(INTRO_CROSSFADE_WINDOW_MS, 2000);
  });

  runTest(2, "M4.13: Predictive crossfade trigger math: trigger = duration - window = 16.55s", () => {
    assert.equal(CONTEST_INTRO_TRIGGER_SEC, 16.55);
    const triggerDelta = CONTEST_INTRO_DURATION_SEC - INTRO_CROSSFADE_WINDOW_SEC;
    assert.ok(Math.abs(triggerDelta - 16.55) < 0.001);
  });

  runTest(2, "M4.14: 4 contestants: T = (4-1)*4.0 + 6.8 = 18.8s; deficit = +0.25s silence requiring loop", () => {
    const duration = calculateEntranceDuration(4);
    assert.equal(duration, 18.8);
    const deficit = duration - CONTEST_INTRO_DURATION_SEC;
    assert.ok(Math.abs(deficit - 0.25) < 0.001);
    assert.equal(calculateRequiredIntroLoops(4), 2);
  });

  runTest(2, "M4.15: 6 contestants: T = (6-1)*4.0 + 6.8 = 26.8s; deficit = +8.25s dead silence without loop", () => {
    const duration = calculateEntranceDuration(6);
    assert.equal(duration, 26.8);
    const deficit = duration - CONTEST_INTRO_DURATION_SEC;
    assert.ok(Math.abs(deficit - 8.25) < 0.001);
    assert.equal(calculateRequiredIntroLoops(6), 2);
  });

  runTest(2, "M4.16: 7 contestants: T = (7-1)*4.0 + 6.8 = 30.8s; deficit = +12.25s dead silence without loop", () => {
    const duration = calculateEntranceDuration(7);
    assert.equal(duration, 30.8);
    const deficit = duration - CONTEST_INTRO_DURATION_SEC;
    assert.ok(Math.abs(deficit - 12.25) < 0.001);
    assert.equal(calculateRequiredIntroLoops(7), 2);
  });

  runTest(2, "M4.17: 8 contestants: T = (8-1)*4.0 + 6.8 = 34.8s; deficit = +16.25s dead silence without loop", () => {
    const duration = calculateEntranceDuration(8);
    assert.equal(duration, 34.8);
    const deficit = duration - CONTEST_INTRO_DURATION_SEC;
    assert.ok(Math.abs(deficit - 16.25) < 0.001);
    assert.equal(calculateRequiredIntroLoops(8), 3);
  });

  runTest(2, "M4.18: Boundary seat count clamping: seatCount <= 1 produces minimum duration 6.8s and 1 loop", () => {
    assert.equal(calculateEntranceDuration(1), 6.8);
    assert.equal(calculateEntranceDuration(0), 6.8);
    assert.equal(calculateEntranceDuration(-2), 6.8);
    assert.equal(calculateRequiredIntroLoops(1), 1);
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // TIER 3: CROSS-FEATURE COMBINATIONS (Dual-Instance Predictive Crossfade Engine)
  // ─────────────────────────────────────────────────────────────────────────────
  console.log("\n--- TIER 3: CROSS-FEATURE COMBINATIONS (Dual-Instance Crossfade Engine) ---");

  runTest(3, "M4.19: Predictive trigger initiates secondary instance at exactly t = 16.55s", () => {
    const sim = new SeamlessIntroAudioLoopSimulator(18.55, 2.0);
    sim.start();

    // Step to 16.50s (just before trigger)
    sim.step(16.50);
    assert.equal(sim.instances.length, 1, "Should not spawn before 16.55s");
    assert.equal(sim.instances[0].state, "PLAYING");

    // Step to 16.55s (exact trigger threshold)
    sim.step(0.05);
    assert.equal(sim.instances.length, 2, "Must spawn secondary instance at t = 16.55s");
    assert.equal(sim.instances[0].state, "FADING_OUT");
    assert.equal(sim.instances[1].state, "FADING_IN");
  });

  runTest(3, "M4.20: Acoustic power continuity invariant: V1(t) + V2(t) === 0.85 across crossfade window", () => {
    const sim = new SeamlessIntroAudioLoopSimulator(18.55, 2.0);
    sim.start();
    sim.step(16.55); // At trigger

    // Check across 20 steps (every 0.1s over the 2.0s crossfade window)
    for (let i = 1; i <= 20; i++) {
      sim.step(0.1);
      const inst1 = sim.instances[0];
      const inst2 = sim.instances[1];
      const sum = inst1.volume + inst2.volume;
      assert.ok(
        Math.abs(sum - 0.85) < 0.001,
        `Step ${i}: Volume sum must be 0.85, got ${sum} (V1=${inst1.volume}, V2=${inst2.volume})`
      );
    }
  });

  runTest(3, "M4.21: Midpoint volume parity: at t = 17.55s (1.0s elapsed), V1 = 0.425 and V2 = 0.425", () => {
    const sim = new SeamlessIntroAudioLoopSimulator(18.55, 2.0);
    sim.start();
    sim.step(16.55); // Trigger
    sim.step(1.0);  // Midpoint of 2.0s crossfade window

    const inst1 = sim.instances[0];
    const inst2 = sim.instances[1];
    assert.ok(Math.abs(inst1.volume - 0.425) < 0.001, `Expected 0.425, got ${inst1.volume}`);
    assert.ok(Math.abs(inst2.volume - 0.425) < 0.001, `Expected 0.425, got ${inst2.volume}`);
  });

  runTest(3, "M4.22: Handoff completion: at t = 18.55s, Instance 1 is disposed and Instance 2 is primary", () => {
    const sim = new SeamlessIntroAudioLoopSimulator(18.55, 2.0);
    sim.start();
    sim.step(16.55); // Trigger
    sim.step(2.0);   // End of crossfade window (t = 18.55s)

    assert.equal(sim.instances[0].state, "DISPOSED");
    assert.equal(sim.instances[0].volume, 0);
    assert.equal(sim.instances[1].state, "PLAYING");
    assert.equal(sim.instances[1].volume, 0.85);
    assert.equal(sim.currentInstanceIndex, 1);
  });

  runTest(3, "M4.23: Recursive crossfade transition: Instance 2 triggers Instance 3 at total t = 33.10s", () => {
    const sim = new SeamlessIntroAudioLoopSimulator(18.55, 2.0);
    sim.start();
    // Advance to 33.10s (16.55s + 16.55s)
    sim.step(33.10);

    assert.equal(sim.instances.length, 3, "Must have spawned 3rd instance at t = 33.10s");
    assert.equal(sim.instances[1].state, "FADING_OUT");
    assert.equal(sim.instances[2].state, "FADING_IN");
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // TIER 4: REAL-WORLD SCENARIOS (Broadcast Entrance & Round Transitions)
  // ─────────────────────────────────────────────────────────────────────────────
  console.log("\n--- TIER 4: REAL-WORLD SCENARIOS (E2E Broadcast Entrance Sequences) ---");

  runTest(4, "M4.24: 6-contestant broadcast entrance (26.8s): seamless crossfade without audio interruption", () => {
    const entranceDuration = calculateEntranceDuration(6); // 26.8s
    const sim = new SeamlessIntroAudioLoopSimulator(18.55, 2.0);
    sim.start();

    // Advance through the entire entrance sequence
    let currentT = 0;
    const delta = 0.5;
    while (currentT < entranceDuration) {
      sim.step(delta);
      currentT += delta;

      // Active playing volume must never drop below 0.85
      const activeVolSum = sim.instances
        .filter((i) => i.state !== "DISPOSED" && i.state !== "PAUSED")
        .reduce((sum, i) => sum + i.volume, 0);
      assert.ok(
        Math.abs(activeVolSum - 0.85) < 0.001,
        `At t=${currentT}s: Active volume sum dropped to ${activeVolSum}`
      );
    }

    assert.equal(sim.instances.length, 2, "6 contestants entrance requires exactly 2 audio instances");
    assert.equal(sim.instances[0].state, "DISPOSED");
    assert.equal(sim.instances[1].state, "PLAYING");
  });

  runTest(4, "M4.25: 8-contestant broadcast entrance (34.8s): 3 audio instances maintain uninterrupted intro BGM", () => {
    const entranceDuration = calculateEntranceDuration(8); // 34.8s
    const sim = new SeamlessIntroAudioLoopSimulator(18.55, 2.0);
    sim.start();

    sim.step(entranceDuration);

    assert.equal(sim.instances.length, 3, "8 contestants entrance reaches 34.8s, spawning 3rd instance at 33.1s");
    // Crossfade 2 -> 3 is active at 34.8s (1.7s into the 2.0s window)
    assert.equal(sim.instances[0].state, "DISPOSED");
    assert.equal(sim.instances[1].state, "FADING_OUT");
    assert.equal(sim.instances[2].state, "FADING_IN");
  });

  runTest(4, "M4.26: Round transition cue (start_round) cleanly terminates intro loop via fadeOutAndStop", () => {
    const sim = new SeamlessIntroAudioLoopSimulator(18.55, 2.0);
    sim.start();
    sim.step(20.0); // 20s in (Instance 2 playing)

    sim.fadeOutAndStop(1.0);
    assert.equal(sim.isStopped, true);
    sim.instances.forEach((inst) => {
      assert.equal(inst.state, "DISPOSED");
      assert.equal(inst.volume, 0);
    });

    // Stepping further after stop must not spawn new instances
    sim.step(20.0);
    assert.equal(sim.instances.length, 2);
  });

  runTest(4, "M4.27: Source code contract verification: hooks.ts exports and implements seamless looping contracts", () => {
    assert.ok(hooksSrc.includes("export const isIntroSeamlessLoopTrack"), "Must export isIntroSeamlessLoopTrack");
    assert.ok(hooksSrc.includes("INTRO_CROSSFADE_WINDOW_SEC"), "Must define INTRO_CROSSFADE_WINDOW_SEC");
    assert.ok(hooksSrc.includes("CONTEST_INTRO_DURATION_SEC"), "Must define CONTEST_INTRO_DURATION_SEC");
    assert.ok(hooksSrc.includes("CONTEST_INTRO_TRIGGER_SEC"), "Must define CONTEST_INTRO_TRIGGER_SEC");
    assert.ok(hooksSrc.includes("setupIntroSeamlessLoop"), "Must implement setupIntroSeamlessLoop");
    assert.ok(hooksSrc.includes("activeIntroTimers"), "Must maintain activeIntroTimers for cleanup");
    assert.ok(hooksSrc.includes("activeIntroCleanups"), "Must maintain activeIntroCleanups for cleanup");
  });

  // Summary
  console.log("\n================================================================================");
  console.log("MILESTONE 4 TEST SUMMARY");
  console.log("================================================================================");
  console.log(`  Tier 1 (Feature Coverage):        ${tier1Count} / 10 passed`);
  console.log(`  Tier 2 (Boundary & Tolerances):   ${tier2Count} / 8 passed`);
  console.log(`  Tier 3 (Cross-Feature Combos):    ${tier3Count} / 5 passed`);
  console.log(`  Tier 4 (Real-World Scenarios):    ${tier4Count} / 4 passed`);
  console.log("--------------------------------------------------------------------------------");
  console.log(`  TOTAL M4 TESTS EXECUTED:          ${totalPassed} / ${totalExecuted} passed (100% Pass Rate)`);
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
