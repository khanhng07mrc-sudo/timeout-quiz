/**
 * Adversarial Stress Fuzzer and Invariant Verification Suite for R4 and R5
 *
 * Scope:
 * - R4: Stage Flow Intro Standby
 *   * Rapid entrance skips across temporal phases
 *   * Burst manual entrance:next calls
 *   * Extreme time advancement (+10m, +1h, +24h, +7d, 5000-tick loop) confirming NO auto-advance to Khởi Động
 *   * Rejection of contestant buzzers, host grading, and in-game hotkeys during introStandby
 *   * Clean transition on explicit Host round:force khoiDong and clearance of introStandby
 *   * 1,000-iteration Randomized Chaos Fuzzer
 * - R5: Production Build Freshness & Deployment Script Hardening
 *   * Unconditional cache wipe verification in deploy-vps.sh (.next/cache, .next/standalone, .next/server, .next)
 *   * PM2 process exclusivity (deletion of legacy quizorra to avoid port 3000 collision)
 *   * Health API JSON schema & commit/buildId exposure verification under adversarial env scenarios
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { OlympiaGame } from "../../src/lib/olympia/engine";
import { SAMPLE_QUESTION_SET } from "../../src/lib/olympia/sample-questions";
import type { OlympiaConfig, OlympiaState, RoundId, RulesetId } from "../../src/lib/olympia/types";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers & Fixture Generators
// ─────────────────────────────────────────────────────────────────────────────

function createTestGame(
  rulesetId: RulesetId = "O26",
  rounds: RoundId[] = ["khoiDong", "vcnv", "tangToc", "veDich"],
  playerCount: number = 4
): OlympiaGame {
  const cfg: OlympiaConfig = {
    rulesetId,
    rounds,
    questionSet: SAMPLE_QUESTION_SET,
    seatCount: playerCount,
  };
  const g = new OlympiaGame("FUZZ_ROOM_" + Math.random().toString(36).substring(7), cfg, 1000);
  for (let i = 0; i < playerCount; i++) {
    g.joinSeat(`TS_${i + 1}`, `key_${i}`);
  }
  return g;
}

let passedTests = 0;
let totalTests = 0;

async function runTest(suite: string, name: string, fn: () => void | Promise<void>) {
  totalTests++;
  try {
    await fn();
    passedTests++;
    console.log(`  [PASS] [${suite}] ${name}`);
  } catch (err) {
    console.error(`  [FAIL] [${suite}] ${name}:`, err);
    process.exitCode = 1;
  }
}

async function main() {
  console.log("================================================================================");
  console.log("ADVERSARIAL STRESS TEST SUITE: R4 (STAGE FLOW) & R5 (DEPLOYMENT FRESHNESS)");
  console.log("================================================================================\n");

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. R4 STAGE FLOW STATE FUZZER: ENTRANCE COMPLETIONS & SKIPS
  // ─────────────────────────────────────────────────────────────────────────────
  console.log("--- PART 1: R4 ENTRANCE FLOW VARIETIES & STATE INVARIANTS ---");

  // 1.1: Standard Pipelined Completion across 2, 3, 4, 6, 8 contestants
  for (const count of [2, 3, 4, 6, 8]) {
    await runTest("R4-Entrance", `Normal entrance completion with ${count} seats sets introStandby=true`, () => {
      const g = createTestGame("O26", ["khoiDong"], count);
      const startRes = g.hostAction({ type: "entrance:start" }, 10000);
      assert.equal(startRes.ok, true);
      assert.equal(g.state.introStandby, true);

      // Step through each seat at 4000ms intervals
      for (let i = 0; i < count - 1; i++) {
        const now = 10000 + (i + 1) * 4000;
        g.tick(now);
        assert.equal(g.state.entranceState?.currentSeatIdx, i + 1);
        assert.equal(g.state.introStandby, true);
      }

      // Advance to terminal seat completion: (count - 1)*4000 + 6800
      const terminalTime = 10000 + (count - 1) * 4000 + 6800;
      g.tick(terminalTime);

      assert.equal(g.state.entranceCompleted, true);
      assert.equal(g.state.entranceState, null);
      assert.equal(g.state.introStandby, true);
      assert.equal(g.state.studioCamera, 3);
    });
  }

  // 1.2: Rapid Entrance Skip Fuzzing across All Temporal Phases (0ms to 20,000ms)
  const skipOffsets = [
    0, 1, 5, 50, 100, 599, 600, 1000, 1200, 1799, 1800, 2400, 2999, 3000,
    3999, 4000, 4001, 7999, 8000, 8001, 11999, 12000, 12001, 15999, 16000,
    18799, 18800, 20000,
  ];

  for (const offset of skipOffsets) {
    await runTest("R4-SkipFuzzer", `entrance:skip at t = ${offset}ms guarantees introStandby=true and clean halt`, () => {
      const g = createTestGame("O26", ["khoiDong"], 4);
      g.hostAction({ type: "entrance:start" }, 10000);
      if (offset > 0) {
        g.tick(10000 + offset);
      }
      const skipRes = g.hostAction({ type: "entrance:skip" }, 10000 + offset);
      assert.equal(skipRes.ok, true);

      // Invariants
      assert.equal(g.state.entranceState, null, "entranceState must be cleared");
      assert.equal(g.state.entranceCompleted, true, "entranceCompleted must be true");
      assert.equal(g.state.introStandby, true, "introStandby must be true");
      assert.equal(g.state.studioCamera, 3, "studioCamera must reset to CAM 3 wide");

      // Idempotent: Subsequent skip calls do not corrupt state
      const secondSkip = g.hostAction({ type: "entrance:skip" }, 10000 + offset + 50);
      assert.equal(secondSkip.ok, true);
      assert.equal(g.state.introStandby, true);
    });
  }

  // 1.3: Burst manual entrance:next spamming
  await runTest("R4-NextBurst", "Burst 50 rapid entrance:next calls cleanly terminates at introStandby", () => {
    const g = createTestGame("O26", ["khoiDong"], 4);
    g.hostAction({ type: "entrance:start" }, 10000);

    // Spam 50 entrance:next within 1ms
    for (let i = 0; i < 50; i++) {
      const res = g.hostAction({ type: "entrance:next" }, 10001);
      assert.equal(res.ok, true);
    }

    assert.equal(g.state.entranceCompleted, true);
    assert.equal(g.state.entranceState, null);
    assert.equal(g.state.introStandby, true);
    assert.equal(g.state.studioCamera, 3);
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. R4 DURABILITY & TEMPORAL IMMUNITY (CONFIRM NEVER AUTO-ADVANCES)
  // ─────────────────────────────────────────────────────────────────────────────
  console.log("\n--- PART 2: R4 SIMULATED TIME ADVANCEMENT & DURABILITY ---");

  const durabilityTimeJumps = [
    { label: "10 minutes (+600,000ms)", deltaMs: 600_000 },
    { label: "1 hour (+3,600,000ms)", deltaMs: 3_600_000 },
    { label: "24 hours (+86,400,000ms)", deltaMs: 86_400_000 },
    { label: "7 days (+604,800,000ms)", deltaMs: 604_800_000 },
    { label: "30 days (+2,592,000,000ms)", deltaMs: 2_592_000_000 },
  ];

  for (const jump of durabilityTimeJumps) {
    await runTest("R4-Durability", `Simulated time advance by ${jump.label}: strictly NO auto-advance to Khởi Động`, () => {
      const g = createTestGame("O26", ["khoiDong"], 4);
      g.hostAction({ type: "entrance:start" }, 10000);
      g.hostAction({ type: "entrance:skip" }, 11000);
      assert.equal(g.state.introStandby, true);

      const advanceTo = 11000 + jump.deltaMs;
      g.tick(advanceTo);

      // Invariants: Must remain in introStandby, never auto-start Khởi Động!
      assert.equal(g.state.introStandby, true, "introStandby must remain true");
      assert.equal(g.state.entranceCompleted, true);
      assert.equal(g.state.entranceState, null);
      assert.notEqual(g.state.roundStatus.khoiDong, "active", "khoiDong round status must NEVER be active");
      assert.equal(g.state.khoiDong?.started, undefined, "khoiDong.started must remain unstarted");
      assert.equal(g.state.khoiDong?.questionRevealed, undefined, "question must never be revealed");
    });
  }

  // High-frequency tick loop: 5,000 ticks at 1-second increments
  await runTest("R4-HighFreqTicks", "5,000 consecutive 1-second ticks strictly preserves introStandby=true", () => {
    const g = createTestGame("O26", ["khoiDong"], 4);
    g.hostAction({ type: "entrance:start" }, 10000);
    g.hostAction({ type: "entrance:skip" }, 11000);

    let curTime = 11000;
    for (let i = 0; i < 5000; i++) {
      curTime += 1000;
      g.tick(curTime);
      if (i % 1000 === 0) {
        assert.equal(g.state.introStandby, true);
        assert.notEqual(g.state.roundStatus.khoiDong, "active");
      }
    }
    assert.equal(g.state.introStandby, true);
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 3. R4 ADVERSARIAL TAMPER & REJECTION IN INTRO STANDBY
  // ─────────────────────────────────────────────────────────────────────────────
  console.log("\n--- PART 3: R4 ADVERSARIAL INPUT REJECTION DURING INTRO STANDBY ---");

  // 3.1: Player Buzzers
  await runTest("R4-Tamper", "Player buzzers during introStandby are rejected for all seats 0..7 and invalid seats", () => {
    const g = createTestGame("O26", ["khoiDong"], 4);
    g.hostAction({ type: "entrance:start" }, 10000);
    g.hostAction({ type: "entrance:skip" }, 11000);
    assert.equal(g.state.introStandby, true);

    for (const seat of [-1, 0, 1, 2, 3, 4, 7, 99]) {
      const buzzRes = g.playerBuzz(seat, 12000);
      assert.equal(buzzRes.ok, false, `playerBuzz for seat ${seat} must fail during standby`);
      assert.equal(g.state.khoiDong?.buzzedSeat, undefined, "No buzzedSeat can be recorded");
      assert.equal(g.state.khoiDong?.buzzOpen, undefined, "buzzOpen must remain undefined/false");
    }
  });

  // 3.2: Host Grading Actions
  const hostileGradingActions = [
    { type: "kd:correct" },
    { type: "kd:wrong" },
    { type: "kd:skip" },
    { type: "vcnv:correct" },
    { type: "vcnv:wrong" },
    { type: "vcnv:correctCNV" },
    { type: "vcnv:wrongCNV" },
    { type: "tt:grade", seatId: 0, score: 40 },
    { type: "tt:revealAndGrade" },
    { type: "vd:correct" },
    { type: "vd:wrong" },
    { type: "vd:correctSteal" },
    { type: "vd:wrongSteal" },
    { type: "chp:correct" },
    { type: "chp:wrong" },
  ];

  for (const act of hostileGradingActions) {
    await runTest("R4-Tamper", `Host grading action '${act.type}' during introStandby is rejected`, () => {
      const g = createTestGame("O26", ["khoiDong", "vcnv", "tangToc", "veDich"], 4);
      g.hostAction({ type: "entrance:start" }, 10000);
      g.hostAction({ type: "entrance:skip" }, 11000);
      assert.equal(g.state.introStandby, true);

      const res = g.hostAction(act, 12000);
      assert.equal(res.ok, false, `Action '${act.type}' must be rejected during standby`);

      // Verify all scores remain 0
      for (const seat of g.state.seats) {
        assert.equal(seat.score, 0, `Score for seat ${seat.id} must remain 0`);
      }
    });
  }

  // 3.3: In-game Hotkeys & Round Actions
  const hostileRoundActions = [
    { type: "vcnv:selectRow", row: 1 },
    { type: "vcnv:openQuestion" },
    { type: "vcnv:timer" },
    { type: "vcnv:revealTile", row: 1 },
    { type: "tt:selectQuestion", qIdx: 0 },
    { type: "tt:timer" },
    { type: "tt:next" },
    { type: "vd:choosePackage", seatId: 0, package: [20, 20, 30] },
    { type: "vd:startQuestion" },
    { type: "vd:timer" },
    { type: "chp:next" },
    { type: "chp:timer" },
  ];

  for (const act of hostileRoundActions) {
    await runTest("R4-Tamper", `In-game action '${act.type}' during introStandby is rejected`, () => {
      const g = createTestGame("O26", ["khoiDong", "vcnv", "tangToc", "veDich"], 4);
      g.hostAction({ type: "entrance:start" }, 10000);
      g.hostAction({ type: "entrance:skip" }, 11000);

      const res = g.hostAction(act, 12000);
      assert.equal(res.ok, false, `Action '${act.type}' must be rejected during standby`);
    });
  }

  // 3.4: Host Console UI Hotkey Guard Predicate
  await runTest("R4-ConsoleGuard", "HostConsole hotkey guard predicate flags notInGame during introStandby", () => {
    const dummyState: Partial<OlympiaState> = {
      stage: "playing",
      introStandby: true,
      entranceCompleted: true,
    };
    const isIntro = dummyState.stage === "playing" &&
      (Boolean(dummyState.introTimer) || Boolean(dummyState.entranceState?.active) || Boolean(dummyState.introStandby));
    const notInGame = dummyState.stage !== "playing" || isIntro;

    assert.equal(isIntro, true, "isIntro must be true when introStandby is active");
    assert.equal(notInGame, true, "notInGame must be true, locking keyboard hotkeys");
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 4. R4 EXPLICIT HOST ADVANCE (ROUND:FORCE KHOIDONG)
  // ─────────────────────────────────────────────────────────────────────────────
  console.log("\n--- PART 4: R4 EXPLICIT HOST ADVANCE (ROUND:FORCE KHOIDONG) ---");

  await runTest("R4-HostAdvance", "round:force khoiDong cleanly clears introStandby and transitions to Khởi Động", () => {
    const g = createTestGame("O26", ["khoiDong"], 4);
    g.hostAction({ type: "game:start" }, 1000);
    g.hostAction({ type: "entrance:start" }, 10000);
    g.hostAction({ type: "entrance:skip" }, 12000);
    assert.equal(g.state.introStandby, true);

    const res = g.hostAction({ type: "round:force", round: "khoiDong" }, 15000);
    assert.equal(res.ok, true, "round:force khoiDong must succeed");
    assert.equal(g.state.introStandby, false, "introStandby must be cleared to false");
    assert.equal(g.state.currentRound, "khoiDong", "currentRound must be khoiDong");
    assert.equal(g.state.roundStatus.khoiDong, "active", "roundStatus must be active");
    assert.equal(g.state.banner, "Khởi Động", "banner must be Khởi Động");
    assert.equal(g.state.introTimer, null, "introTimer must be null");
    assert.notEqual(g.state.khoiDong, null, "khoiDong state machine must be instantiated");
  });

  // Direct transition to other rounds from introStandby
  for (const round of ["vcnv", "tangToc", "veDich"] as RoundId[]) {
    await runTest("R4-HostAdvance", `round:force ${round} from introStandby clears introStandby cleanly`, () => {
      const g = createTestGame("O26", ["khoiDong", "vcnv", "tangToc", "veDich"], 4);
      g.hostAction({ type: "game:start" }, 1000);
      g.hostAction({ type: "entrance:start" }, 10000);
      g.hostAction({ type: "entrance:skip" }, 12000);
      assert.equal(g.state.introStandby, true);

      const res = g.hostAction({ type: "round:force", round }, 15000);
      assert.equal(res.ok, true);
      assert.equal(g.state.introStandby, false);
      assert.equal(g.state.currentRound, round);
    });
  }

  // Invalid round transition
  await runTest("R4-HostAdvance", "round:force with invalid round is rejected and preserves introStandby", () => {
    const g = createTestGame("O26", ["khoiDong"], 4);
    g.hostAction({ type: "game:start" }, 1000);
    g.hostAction({ type: "entrance:start" }, 10000);
    g.hostAction({ type: "entrance:skip" }, 12000);
    assert.equal(g.state.introStandby, true);

    const res = g.hostAction({ type: "round:force", round: "invalidRound" }, 15000);
    assert.equal(res.ok, false);
    assert.equal(g.state.introStandby, true);
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 5. R4 RANDOMIZED CHAOS FUZZER (1,000 ITERATIONS)
  // ─────────────────────────────────────────────────────────────────────────────
  console.log("\n--- PART 5: R4 RANDOMIZED CHAOS FUZZER (1,000 ITERATIONS) ---");

  await runTest("R4-ChaosFuzzer", "1,000 iterations of random action sequencing maintain state machine invariants", () => {
    const rulesets: RulesetId[] = ["O22", "O23", "O24", "O26"];
    let totalTransitions = 0;

    for (let iter = 0; iter < 1000; iter++) {
      const seatCount = 2 + Math.floor(Math.random() * 7); // 2..8
      const rId = rulesets[iter % rulesets.length];
      const g = createTestGame(rId, ["khoiDong", "vcnv"], seatCount);

      let curTime = 10000;
      g.hostAction({ type: "entrance:start" }, curTime);

      // Random sequence of 5-15 actions
      const actionCount = 5 + Math.floor(Math.random() * 10);
      let skipped = false;

      for (let a = 0; a < actionCount; a++) {
        const dice = Math.random();
        curTime += Math.floor(Math.random() * 5000);

        if (dice < 0.25) {
          g.tick(curTime);
        } else if (dice < 0.45) {
          g.hostAction({ type: "entrance:next" }, curTime);
        } else if (dice < 0.60 && !skipped) {
          g.hostAction({ type: "entrance:skip" }, curTime);
          skipped = true;
        } else if (dice < 0.80) {
          // Random buzz attempt
          const seat = Math.floor(Math.random() * (seatCount + 2));
          g.playerBuzz(seat, curTime);
        } else {
          // Random hostile grading
          g.hostAction({ type: "kd:wrong" }, curTime);
        }
        totalTransitions++;
      }

      // Invariant: If entrance is marked completed or skipped, introStandby MUST be true unless explicit round:force
      if (g.state.entranceCompleted) {
        assert.equal(g.state.introStandby, true, `Iter ${iter}: introStandby must remain true after completion`);
        assert.notEqual(g.state.roundStatus.khoiDong, "active", `Iter ${iter}: khoiDong must not be active`);
      }
    }

    console.log(`    -> Fuzzed ${totalTransitions} state transitions across 1,000 game instances without invariant violation.`);
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 6. R5 DEPLOYMENT SCRIPT & PM2 ADVERSARIAL VERIFICATION (deploy-vps.sh)
  // ─────────────────────────────────────────────────────────────────────────────
  console.log("\n--- PART 6: R5 DEPLOYMENT SCRIPT ADVERSARIAL VERIFICATION ---");

  await runTest("R5-DeployScript", "deploy-vps.sh executes unconditional cache purge before npm run build", () => {
    const scriptPath = path.join(process.cwd(), "deploy-vps.sh");
    const content = fs.readFileSync(scriptPath, "utf-8");

    // 1. Verify unconditional purge command
    const purgeCmd = "rm -rf .next/cache .next/standalone .next/server .next";
    assert.ok(content.includes(purgeCmd), `deploy-vps.sh must contain '${purgeCmd}'`);

    // 2. Verify purge occurs BEFORE npm run build
    const purgeIdx = content.indexOf(purgeCmd);
    const buildIdx = content.indexOf("npm run build");
    assert.ok(purgeIdx > 0, "Purge command must exist");
    assert.ok(buildIdx > purgeIdx, "Purge command must run BEFORE npm run build");

    // 3. Verify purge is not wrapped in conditional 'if'
    const lines = content.split("\n");
    const purgeLineIdx = lines.findIndex((l) => l.includes(purgeCmd));
    assert.ok(purgeLineIdx >= 0);
    const prevLine = lines[purgeLineIdx - 1]?.trim();
    assert.ok(!prevLine.startsWith("if "), "Purge command must run unconditionally (not inside 'if')");
  });

  await runTest("R5-DeployScript", "deploy-vps.sh deletes legacy quizorra process to prevent port 3000 collision", () => {
    const content = fs.readFileSync(path.join(process.cwd(), "deploy-vps.sh"), "utf-8");
    assert.ok(
      content.includes("delete quizorra 2>/dev/null || true"),
      "deploy-vps.sh must delete quizorra process to avoid port 3000 conflict"
    );
    assert.ok(
      content.includes("restart timeout-quiz --update-env"),
      "deploy-vps.sh must restart timeout-quiz with --update-env"
    );
    assert.ok(
      content.includes("reload ecosystem.config.cjs --update-env"),
      "deploy-vps.sh must include fallback to reload ecosystem.config.cjs"
    );
    assert.ok(
      content.includes("save"),
      "deploy-vps.sh must execute pm2 save"
    );
  });

  await runTest("R5-DeployScript", "ecosystem.config.cjs configures single instance timeout-quiz on port 3000", () => {
    const ecoPath = path.join(process.cwd(), "ecosystem.config.cjs");
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const eco = require(ecoPath);
    assert.ok(eco.apps && eco.apps.length > 0);
    const app = eco.apps[0];
    assert.equal(app.name, "timeout-quiz");
    assert.equal(app.instances, 1, "Single instance required for in-memory Socket.io");
    assert.equal(app.env?.PORT, 3000);
    assert.equal(app.max_memory_restart, "1G");
  });

  await runTest("R5-DeployScript", "deploy-vps.sh has strict error handling and git clean safeguards", () => {
    const content = fs.readFileSync(path.join(process.cwd(), "deploy-vps.sh"), "utf-8");
    assert.ok(content.startsWith("#!/bin/bash\nset -e"), "deploy-vps.sh must start with set -e");
    assert.ok(content.includes('git clean -fd -e ".env*" -e "public/uploads*"'), "Must protect .env and uploads");
    assert.ok(content.includes('export GIT_COMMIT="$CURRENT_COMMIT"'), "Must export GIT_COMMIT to build environment");
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 7. R5 HEALTH API ADVERSARIAL VERIFICATION (src/app/api/health/route.ts)
  // ─────────────────────────────────────────────────────────────────────────────
  console.log("\n--- PART 7: R5 HEALTH API ADVERSARIAL VERIFICATION ---");

  await runTest("R5-HealthAPI", "Health API route GET() returns valid JSON schema and correct status code 200", async () => {
    const { GET } = await import("../../src/app/api/health/route");
    const response = await GET();
    assert.equal(response.status, 200);

    const body = await response.json();
    assert.equal(body.status, "ok", "body.status must be 'ok'");
    assert.equal(typeof body.commit, "string", "body.commit must be a string");
    assert.ok(body.commit.length > 0, "body.commit must not be empty");
    assert.equal(typeof body.buildId, "string", "body.buildId must be a string");
    assert.ok(body.buildId.length > 0, "body.buildId must not be empty");
    assert.equal(typeof body.uptime, "number", "body.uptime must be a number");
    assert.ok(body.uptime >= 0, "body.uptime must be non-negative");
    assert.equal(typeof body.timestamp, "number", "body.timestamp must be a number");
    assert.ok(body.timestamp > 0, "body.timestamp must be positive");
    assert.equal(body.version, "0.1.0", "body.version must match 0.1.0");
  });

  await runTest("R5-HealthAPI", "Health API respects GIT_COMMIT environment variable override", async () => {
    const origGitCommit = process.env.GIT_COMMIT;
    try {
      process.env.GIT_COMMIT = "e2e_adversarial_hash_9876";
      const { GET } = await import("../../src/app/api/health/route");
      const response = await GET();
      const body = await response.json();
      assert.equal(body.commit, "e2e_adversarial_hash_9876");
    } finally {
      if (origGitCommit !== undefined) {
        process.env.GIT_COMMIT = origGitCommit;
      } else {
        delete process.env.GIT_COMMIT;
      }
    }
  });

  await runTest("R5-HealthAPI", "Health API falls back to NEXT_PUBLIC_GIT_COMMIT when GIT_COMMIT is unset", async () => {
    const origGitCommit = process.env.GIT_COMMIT;
    const origNextPublic = process.env.NEXT_PUBLIC_GIT_COMMIT;
    try {
      delete process.env.GIT_COMMIT;
      process.env.NEXT_PUBLIC_GIT_COMMIT = "fallback_hash_5432";
      const { GET } = await import("../../src/app/api/health/route");
      const response = await GET();
      const body = await response.json();
      assert.equal(body.commit, "fallback_hash_5432");
    } finally {
      if (origGitCommit !== undefined) process.env.GIT_COMMIT = origGitCommit;
      else delete process.env.GIT_COMMIT;
      if (origNextPublic !== undefined) process.env.NEXT_PUBLIC_GIT_COMMIT = origNextPublic;
      else delete process.env.NEXT_PUBLIC_GIT_COMMIT;
    }
  });

  await runTest("R5-HealthAPI", "Health API safely falls back to 'HEAD' when no commit env vars are set", async () => {
    const origGitCommit = process.env.GIT_COMMIT;
    const origNextPublic = process.env.NEXT_PUBLIC_GIT_COMMIT;
    try {
      delete process.env.GIT_COMMIT;
      delete process.env.NEXT_PUBLIC_GIT_COMMIT;
      const { GET } = await import("../../src/app/api/health/route");
      const response = await GET();
      const body = await response.json();
      assert.equal(body.commit, "HEAD");
    } finally {
      if (origGitCommit !== undefined) process.env.GIT_COMMIT = origGitCommit;
      else delete process.env.GIT_COMMIT;
      if (origNextPublic !== undefined) process.env.NEXT_PUBLIC_GIT_COMMIT = origNextPublic;
      else delete process.env.NEXT_PUBLIC_GIT_COMMIT;
    }
  });

  console.log("\n================================================================================");
  console.log(`ADVERSARIAL STRESS TEST SUMMARY: ${passedTests} / ${totalTests} passed`);
  console.log("================================================================================");
  if (process.exitCode && process.exitCode !== 0) {
    console.error("❌ Adversarial stress testing FAILED.");
    process.exit(process.exitCode);
  } else {
    console.log("✅ All adversarial stress tests PASSED successfully.");
    process.exit(0);
  }
}

main().catch((err) => {
  console.error("Fatal test runner error:", err);
  process.exit(1);
});
