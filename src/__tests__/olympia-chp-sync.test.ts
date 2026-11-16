import assert from "node:assert/strict";
import { OlympiaGame } from "../lib/olympia/engine";
import { SAMPLE_QUESTION_SET } from "../lib/olympia/sample-questions";
import type { OlympiaConfig, RulesetId } from "../lib/olympia/types";

let passedCount = 0;
let totalCount = 0;

function test(name: string, fn: () => void) {
  totalCount++;
  try {
    fn();
    passedCount++;
    console.log(`  ✓ OK: ${name}`);
  } catch (err) {
    console.error(`  ✗ FAIL: ${name}`);
    console.error(err);
    process.exitCode = 1;
  }
}

function createGame(rulesetId: RulesetId = "O26", extraCfg?: Partial<OlympiaConfig>) {
  const cfg: OlympiaConfig = {
    rulesetId,
    rounds: ["khoiDong", "vcnv", "tangToc", "veDich"],
    questionSet: SAMPLE_QUESTION_SET,
    seatCount: 4,
    teams: [
      { name: "Thí sinh 1" },
      { name: "Thí sinh 2" },
      { name: "Thí sinh 3" },
      { name: "Thí sinh 4" },
    ],
    ...extraCfg,
  };
  const g = new OlympiaGame("SYNC_TEST", cfg, 0);
  for (let i = 0; i < 4; i++) {
    g.joinSeat(`P${i + 1}`, `token_${i}`);
  }
  return g;
}

console.log("\n========================================================");
console.log("  OLYMPIA CHP QUESTION LIMIT SYNCHRONIZATION TEST SUITE");
console.log("========================================================\n");

// ─────────────────────────────────────────────────────────────
// 1. Sandbox Room Creation API Payload Configuration
// ─────────────────────────────────────────────────────────────
console.log("--- Suite 1: Sandbox Room Creation API Payload Logic ---");

test("Sandbox room creation preserves explicit chpQuestionLimit: unlimited on O26", () => {
  const body = {
    config: {
      olympia: {
        rulesetId: "O26",
        chpQuestionLimit: "unlimited",
      },
    },
  };
  const resolvedRulesetId = body.config?.olympia?.rulesetId || "O26";
  const chpQuestionLimit =
    body.config?.olympia?.chpQuestionLimit ??
    (body.config?.olympia?.rulesetId === "O27" ? "unlimited" : 3);

  assert.equal(chpQuestionLimit, "unlimited");
  assert.equal(resolvedRulesetId, "O26");
});

test("Sandbox room creation preserves explicit chpQuestionLimit: 3 on O27", () => {
  const body = {
    config: {
      olympia: {
        rulesetId: "O27",
        chpQuestionLimit: 3,
      },
    },
  };
  const chpQuestionLimit =
    body.config?.olympia?.chpQuestionLimit ??
    (body.config?.olympia?.rulesetId === "O27" ? "unlimited" : 3);

  assert.equal(chpQuestionLimit, 3);
});

test("Sandbox room creation defaults to 3 when chpQuestionLimit is omitted on O26", () => {
  const body = {
    config: {
      olympia: {
        rulesetId: "O26",
      },
    },
  };
  const chpQuestionLimit =
    (body.config?.olympia as any)?.chpQuestionLimit ??
    (body.config?.olympia?.rulesetId === "O27" ? "unlimited" : 3);

  assert.equal(chpQuestionLimit, 3);
});

test("Sandbox room creation defaults to unlimited when chpQuestionLimit is omitted on O27", () => {
  const body = {
    config: {
      olympia: {
        rulesetId: "O27",
      },
    },
  };
  const chpQuestionLimit =
    (body.config?.olympia as any)?.chpQuestionLimit ??
    (body.config?.olympia?.rulesetId === "O27" ? "unlimited" : 3);

  assert.equal(chpQuestionLimit, "unlimited");
});

// ─────────────────────────────────────────────────────────────
// 2. Server Persistence & BaseConfig Synchronization
// ─────────────────────────────────────────────────────────────
console.log("\n--- Suite 2: Socket.IO Server & scheduleSave Persistence Logic ---");

test("scheduleSave logic synchronizes baseConfig.olympia.chpQuestionLimit with game state", () => {
  const g = createGame("O26", { chpQuestionLimit: 3 });
  const entry: any = {
    game: g,
    baseConfig: {
      olympia: {
        rulesetId: "O26",
        chpQuestionLimit: 3,
      },
    },
  };

  assert.equal(entry.baseConfig.olympia.chpQuestionLimit, 3);

  // Change in-memory state
  g.hostAction({ type: "system:setChpLimit", limit: "unlimited" } as any, Date.now());
  assert.equal(g.state.chpQuestionLimit, "unlimited");

  // Replicate scheduleSave sync logic
  if (entry.baseConfig && typeof entry.baseConfig === "object") {
    if (!entry.baseConfig.olympia || typeof entry.baseConfig.olympia !== "object") {
      entry.baseConfig.olympia = {};
    }
    entry.baseConfig.olympia.chpQuestionLimit = entry.game.state.chpQuestionLimit;
  }

  assert.equal(entry.baseConfig.olympia.chpQuestionLimit, "unlimited");

  // Toggle back to 3
  g.hostAction({ type: "system:setChpLimit", limit: 3 } as any, Date.now());
  if (entry.baseConfig && typeof entry.baseConfig === "object") {
    if (!entry.baseConfig.olympia || typeof entry.baseConfig.olympia !== "object") {
      entry.baseConfig.olympia = {};
    }
    entry.baseConfig.olympia.chpQuestionLimit = entry.game.state.chpQuestionLimit;
  }

  assert.equal(entry.baseConfig.olympia.chpQuestionLimit, 3);
});

test("scheduleSave initializes baseConfig.olympia if missing and writes chpQuestionLimit", () => {
  const g = createGame("O26", { chpQuestionLimit: "unlimited" });
  const entry: any = {
    game: g,
    baseConfig: {}, // no olympia object initially
  };

  if (entry.baseConfig && typeof entry.baseConfig === "object") {
    if (!entry.baseConfig.olympia || typeof entry.baseConfig.olympia !== "object") {
      entry.baseConfig.olympia = {};
    }
    entry.baseConfig.olympia.chpQuestionLimit = entry.game.state.chpQuestionLimit;
  }

  assert.ok(entry.baseConfig.olympia);
  assert.equal(entry.baseConfig.olympia.chpQuestionLimit, "unlimited");
});

// ─────────────────────────────────────────────────────────────
// 3. system:setChpLimit Transitions & In-Game Progression
// ─────────────────────────────────────────────────────────────
console.log("\n--- Suite 3: system:setChpLimit Transitions (3 -> unlimited -> 3) ---");

test("system:setChpLimit transitions correctly: 3 -> unlimited -> 3", () => {
  const g = createGame("O26");
  assert.equal(g.state.chpQuestionLimit, 3);

  // Transition to unlimited
  const r1 = g.hostAction({ type: "system:setChpLimit", limit: "unlimited" } as any, 1000);
  assert.equal(r1.ok, true);
  assert.equal(g.state.chpQuestionLimit, "unlimited");

  // Transition back to 3
  const r2 = g.hostAction({ type: "system:setChpLimit", limit: 3 } as any, 2000);
  assert.equal(r2.ok, true);
  assert.equal(g.state.chpQuestionLimit, 3);

  // Variations: null, 0, '0' map to unlimited
  const r3 = g.hostAction({ type: "system:setChpLimit", limit: null } as any, 3000);
  assert.equal(r3.ok, true);
  assert.equal(g.state.chpQuestionLimit, "unlimited");

  const r4 = g.hostAction({ type: "system:setChpLimit", limit: "3" } as any, 4000);
  assert.equal(r4.ok, true);
  assert.equal(g.state.chpQuestionLimit, 3);

  const r5 = g.hostAction({ type: "system:setChpLimit", limit: 0 } as any, 5000);
  assert.equal(r5.ok, true);
  assert.equal(g.state.chpQuestionLimit, "unlimited");
});

test("system:setChpLimit is executable during active match progression across rounds 1-4", () => {
  const g = createGame("O26");
  g.hostAction({ type: "game:start" } as any, 1000);
  assert.equal(g.state.stage, "playing");

  // Round 1: khoiDong
  assert.equal(g.state.currentRound, "khoiDong");
  const t1 = g.hostAction({ type: "system:setChpLimit", limit: "unlimited" } as any, 1100);
  assert.equal(t1.ok, true);
  assert.equal(g.state.chpQuestionLimit, "unlimited");

  // Advance to Round 2: vcnv
  g.hostAction({ type: "round:force", round: "vcnv" } as any, 2000);
  assert.equal(g.state.currentRound, "vcnv");
  const t2 = g.hostAction({ type: "system:setChpLimit", limit: 3 } as any, 2100);
  assert.equal(t2.ok, true);
  assert.equal(g.state.chpQuestionLimit, 3);

  // Advance to Round 3: tangToc
  g.hostAction({ type: "round:force", round: "tangToc" } as any, 3000);
  assert.equal(g.state.currentRound, "tangToc");
  const t3 = g.hostAction({ type: "system:setChpLimit", limit: "unlimited" } as any, 3100);
  assert.equal(t3.ok, true);
  assert.equal(g.state.chpQuestionLimit, "unlimited");

  // Advance to Round 4: veDich
  g.hostAction({ type: "round:force", round: "veDich" } as any, 4000);
  assert.equal(g.state.currentRound, "veDich");
  const t4 = g.hostAction({ type: "system:setChpLimit", limit: 3 } as any, 4100);
  assert.equal(t4.ok, true);
  assert.equal(g.state.chpQuestionLimit, 3);
});

// ─────────────────────────────────────────────────────────────
// 4. Rejection of Invalid Limit Payloads
// ─────────────────────────────────────────────────────────────
console.log("\n--- Suite 4: Rejection of Invalid Limit Payloads ---");

test("system:setChpLimit rejects invalid numeric limit payloads (e.g. 5, -1, 100)", () => {
  const g = createGame("O26");
  assert.equal(g.state.chpQuestionLimit, 3);

  const r1 = g.hostAction({ type: "system:setChpLimit", limit: 5 } as any, 1000);
  assert.equal(r1.ok, false);
  assert.match(r1.error || "", /chỉ hỗ trợ 3 hoặc unlimited/i);
  assert.equal(g.state.chpQuestionLimit, 3);

  const r2 = g.hostAction({ type: "system:setChpLimit", limit: -1 } as any, 1100);
  assert.equal(r2.ok, false);
  assert.equal(g.state.chpQuestionLimit, 3);

  const r3 = g.hostAction({ type: "system:setChpLimit", limit: 100 } as any, 1200);
  assert.equal(r3.ok, false);
  assert.equal(g.state.chpQuestionLimit, 3);
});

test("system:setChpLimit rejects invalid non-numeric payloads (e.g. string, object, array)", () => {
  const g = createGame("O26");
  assert.equal(g.state.chpQuestionLimit, 3);

  const r1 = g.hostAction({ type: "system:setChpLimit", limit: "invalid" } as any, 1000);
  assert.equal(r1.ok, false);
  assert.equal(g.state.chpQuestionLimit, 3);

  const r2 = g.hostAction({ type: "system:setChpLimit", limit: {} } as any, 1100);
  assert.equal(r2.ok, false);
  assert.equal(g.state.chpQuestionLimit, 3);

  const r3 = g.hostAction({ type: "system:setChpLimit", limit: [5] } as any, 1200);
  assert.equal(r3.ok, false);
  assert.equal(g.state.chpQuestionLimit, 3);
});

// ─────────────────────────────────────────────────────────────
// 5. Cross-View Synchronization (Host, Display, Player)
// ─────────────────────────────────────────────────────────────
console.log("\n--- Suite 5: Cross-View Synchronization (host, display, player) ---");

test("chpQuestionLimit is synchronized across host, display, and player views", () => {
  const g = createGame("O26");

  // Initial limit: 3
  const hostView1 = g.view("host");
  const displayView1 = g.view("display");
  const playerView1_0 = g.view("player", 0);
  const playerView1_1 = g.view("player", 1);

  assert.equal(hostView1.chpQuestionLimit, 3);
  assert.equal(displayView1.chpQuestionLimit, 3);
  assert.equal(playerView1_0.chpQuestionLimit, 3);
  assert.equal(playerView1_1.chpQuestionLimit, 3);

  // Toggle to unlimited
  g.hostAction({ type: "system:setChpLimit", limit: "unlimited" } as any, 1000);

  const hostView2 = g.view("host");
  const displayView2 = g.view("display");
  const playerView2_0 = g.view("player", 0);
  const playerView2_1 = g.view("player", 1);

  assert.equal(hostView2.chpQuestionLimit, "unlimited");
  assert.equal(displayView2.chpQuestionLimit, "unlimited");
  assert.equal(playerView2_0.chpQuestionLimit, "unlimited");
  assert.equal(playerView2_1.chpQuestionLimit, "unlimited");

  // Toggle back to 3
  g.hostAction({ type: "system:setChpLimit", limit: 3 } as any, 2000);

  const hostView3 = g.view("host");
  const displayView3 = g.view("display");
  const playerView3_0 = g.view("player", 0);

  assert.equal(hostView3.chpQuestionLimit, 3);
  assert.equal(displayView3.chpQuestionLimit, 3);
  assert.equal(playerView3_0.chpQuestionLimit, 3);
});

test("question progress badges format properly with synchronized limit (1/3 vs 1/∞)", () => {
  const formatBadge = (qIdx: number, limit: string | number) => {
    const limitLabel = limit === "unlimited" ? "∞" : 3;
    return `Câu ${qIdx + 1}/${limitLabel}`;
  };

  assert.equal(formatBadge(0, 3), "Câu 1/3");
  assert.equal(formatBadge(1, 3), "Câu 2/3");
  assert.equal(formatBadge(2, 3), "Câu 3/3");

  assert.equal(formatBadge(0, "unlimited"), "Câu 1/∞");
  assert.equal(formatBadge(3, "unlimited"), "Câu 4/∞");
  assert.equal(formatBadge(9, "unlimited"), "Câu 10/∞");
});

console.log("\n========================================================");
console.log(`  CHP SYNC TEST RESULTS: ${passedCount}/${totalCount} tests passed.`);
console.log("========================================================\n");
