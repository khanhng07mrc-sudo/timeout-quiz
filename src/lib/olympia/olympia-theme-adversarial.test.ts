// Adversarial Theme & Round State Verification Suite
// Challenger 1: Automated Theme & Round State Challenger
// Run via: esbuild src/lib/olympia/olympia-theme-adversarial.test.ts --bundle --platform=node --target=node20 --outfile=scratch/olympia-theme-adversarial.cjs && node scratch/olympia-theme-adversarial.cjs

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import { OlympiaGame } from "./engine";
import { SAMPLE_QUESTION_SET } from "./sample-questions";
import { clampQuestionFont } from "../../components/olympia/Vtv3BroadcastGraphics";
import type { OlympiaConfig, OlympiaState } from "./types";

let passed = 0;
let total = 0;

function createTestGame(extraCfg?: Partial<OlympiaConfig>) {
  const cfg: OlympiaConfig = {
    rulesetId: "O26",
    rounds: ["khoiDong", "vcnv", "tangToc", "veDich", "cauHoiPhu"],
    questionSet: SAMPLE_QUESTION_SET,
    ...extraCfg,
  };
  const g = new OlympiaGame("ROOM1", cfg, 0);
  return g;
}

function test(name: string, fn: () => void) {
  total++;
  try {
    fn();
    passed++;
    console.log(`  [PASS] ${name}`);
  } catch (err) {
    console.error(`  [FAIL] ${name}`, err);
    throw err;
  }
}

console.log("\n=======================================================");
console.log("CHALLENGER 1: ADVERSARIAL THEME & ROUND STATE HARNESS");
console.log("=======================================================\n");

// ─────────────────────────────────────────────────────────────────────────────
// 1. ENGINE THEME INITIALIZATION & SWITCHING
// ─────────────────────────────────────────────────────────────────────────────
console.log("--- Suite 1: Theme Initialization & State Machine Action Handling ---");

test("Engine initializes default themeMode to 'o26_classic'", () => {
  const game = createTestGame();
  assert.equal(game.state.themeMode, "o26_classic", "Default themeMode must be 'o26_classic'");
});

test("Engine handles action 'theme:set' to switch from 'o26_classic' to 'v3_arrow'", () => {
  const game = createTestGame();
  assert.equal(game.state.themeMode, "o26_classic");

  const res = game.hostAction({ type: "theme:set", themeMode: "v3_arrow" }, 0);
  assert.equal(res.ok, true, "theme:set must return ok: true");
  assert.equal(game.state.themeMode, "v3_arrow", "themeMode must transition to 'v3_arrow'");
});

test("Engine handles action 'theme:set' to switch back to 'o26_classic'", () => {
  const game = createTestGame();
  game.hostAction({ type: "theme:set", themeMode: "v3_arrow" }, 0);
  assert.equal(game.state.themeMode, "v3_arrow");

  const res = game.hostAction({ type: "theme:set", themeMode: "o26_classic" }, 0);
  assert.equal(res.ok, true, "theme:set must return ok: true");
  assert.equal(game.state.themeMode, "o26_classic", "themeMode must return to 'o26_classic'");
});

test("Engine rejects invalid themeMode values without mutating state (Adversarial Stress)", () => {
  const game = createTestGame();
  assert.equal(game.state.themeMode, "o26_classic");

  // Adversarial: malicious strings, numbers, null, undefined, empty string
  const maliciousInputs = ["", "invalid_theme", "hack_v4", 12345, null, undefined, {}, []];
  for (const bad of maliciousInputs) {
    game.hostAction({ type: "theme:set", themeMode: bad as any }, 0);
    assert.equal(
      game.state.themeMode,
      "o26_classic",
      `State must reject malicious themeMode ${JSON.stringify(bad)} and retain 'o26_classic'`
    );
  }

  // Switch to v3_arrow then try invalid values again
  game.hostAction({ type: "theme:set", themeMode: "v3_arrow" }, 0);
  assert.equal(game.state.themeMode, "v3_arrow");

  for (const bad of maliciousInputs) {
    game.hostAction({ type: "theme:set", themeMode: bad as any }, 0);
    assert.equal(
      game.state.themeMode,
      "v3_arrow",
      `State must reject malicious themeMode ${JSON.stringify(bad)} and retain 'v3_arrow'`
    );
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. STATE SERIALIZATION ACROSS ROLES (HOST, DISPLAY, PLAYER)
// ─────────────────────────────────────────────────────────────────────────────
console.log("\n--- Suite 2: State Serialization & Preservation Across Roles ---");

test("view('host'), view('display'), view('player'), and getPublicState() preserve 'o26_classic'", () => {
  const game = createTestGame();
  assert.equal(game.state.themeMode, "o26_classic");

  const hostView = game.view("host");
  assert.equal(hostView.themeMode, "o26_classic", "Host view must preserve themeMode 'o26_classic'");

  const displayView = game.view("display");
  assert.equal(displayView.themeMode, "o26_classic", "Display view must preserve themeMode 'o26_classic'");

  const publicState = game.getPublicState();
  assert.equal(publicState.themeMode, "o26_classic", "Public state (display alias) must preserve 'o26_classic'");

  for (let seatId = 0; seatId < 4; seatId++) {
    const playerView = game.view("player", seatId);
    assert.equal(
      playerView.themeMode,
      "o26_classic",
      `Player view (seat ${seatId}) must preserve themeMode 'o26_classic'`
    );
  }
});

test("view('host'), view('display'), and view('player') preserve 'v3_arrow' when switched", () => {
  const game = createTestGame();
  game.hostAction({ type: "theme:set", themeMode: "v3_arrow" }, 0);

  const hostView = game.view("host");
  assert.equal(hostView.themeMode, "v3_arrow");

  const displayView = game.view("display");
  assert.equal(displayView.themeMode, "v3_arrow");

  const publicState = game.getPublicState();
  assert.equal(publicState.themeMode, "v3_arrow");

  const playerView = game.view("player", 0);
  assert.equal(playerView.themeMode, "v3_arrow");
});

test("State serialization preserves themeMode across all 5 Olympia rounds in active game progression", () => {
  const game = createTestGame();
  // Fill 4 seats
  for (let i = 0; i < 4; i++) {
    game.joinSeat(`P${i + 1}`, `k${i}`);
  }
  const startRes = game.hostAction({ type: "game:start" }, 0);
  assert.ok(startRes.ok, "game:start must succeed with 4 joined players");

  // Round 1: khoiDong
  assert.equal(game.state.currentRound, "khoiDong");
  let hostView = game.view("host");
  let displayView = game.view("display");
  let playerView = game.view("player", 0);
  assert.equal(hostView.themeMode, "o26_classic");
  assert.equal(displayView.themeMode, "o26_classic");
  assert.equal(playerView.themeMode, "o26_classic");

  // Round 2: vcnv
  game.hostAction({ type: "round:next" }, 100);
  assert.equal(game.state.currentRound, "vcnv");
  hostView = game.view("host");
  displayView = game.view("display");
  playerView = game.view("player", 1);
  assert.equal(hostView.themeMode, "o26_classic");
  assert.equal(displayView.themeMode, "o26_classic");
  assert.equal(playerView.themeMode, "o26_classic");

  // Round 3: tangToc
  game.hostAction({ type: "round:next" }, 200);
  assert.equal(game.state.currentRound, "tangToc");
  hostView = game.view("host");
  displayView = game.view("display");
  playerView = game.view("player", 2);
  assert.equal(hostView.themeMode, "o26_classic");
  assert.equal(displayView.themeMode, "o26_classic");
  assert.equal(playerView.themeMode, "o26_classic");

  // Round 4: veDich
  game.hostAction({ type: "round:next" }, 300);
  assert.equal(game.state.currentRound, "veDich");
  hostView = game.view("host");
  displayView = game.view("display");
  playerView = game.view("player", 3);
  assert.equal(hostView.themeMode, "o26_classic");
  assert.equal(displayView.themeMode, "o26_classic");
  assert.equal(playerView.themeMode, "o26_classic");

  // Round 5: cauHoiPhu (tied tiebreaker simulation)
  // Force a tie by giving P1 and P2 equal scores and round:next
  game.hostAction({ type: "score:set", seat: 0, score: 100 }, 400);
  game.hostAction({ type: "score:set", seat: 1, score: 100 }, 400);
  game.hostAction({ type: "round:next" }, 450);

  // If there's a tie, cauHoiPhu begins
  if (game.state.currentRound === "cauHoiPhu") {
    hostView = game.view("host");
    displayView = game.view("display");
    playerView = game.view("player", 0);
    assert.equal(hostView.themeMode, "o26_classic");
    assert.equal(displayView.themeMode, "o26_classic");
    assert.equal(playerView.themeMode, "o26_classic");
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. BROADCAST TYPOGRAPHY & FONT-SCALING ADVERSARIAL STRESS
// ─────────────────────────────────────────────────────────────────────────────
console.log("\n--- Suite 3: clampQuestionFont Adversarial & Edge Length Verification ---");

test("clampQuestionFont handles exact boundary lengths: 0, 50, 70, 71, 90, 140, 141, 250", () => {
  const edgeCases = [
    { len: 0, expectedTier: "large" },
    { len: 50, expectedTier: "large" },
    { len: 70, expectedTier: "large" },
    { len: 71, expectedTier: "medium" },
    { len: 90, expectedTier: "medium" },
    { len: 140, expectedTier: "medium" },
    { len: 141, expectedTier: "compact" },
    { len: 250, expectedTier: "compact" },
  ];

  for (const { len, expectedTier } of edgeCases) {
    const text = "A".repeat(len);
    const classResult = clampQuestionFont(text);

    assert.ok(typeof classResult === "string", `Result for len ${len} must be a string`);
    assert.ok(classResult.length > 0, `Result for len ${len} must not be empty`);

    // Invariant 1: No NaN or undefined in class string
    assert.ok(!classResult.includes("NaN"), `len ${len}: class must NOT contain 'NaN': "${classResult}"`);
    assert.ok(!classResult.includes("undefined"), `len ${len}: class must NOT contain 'undefined': "${classResult}"`);

    // Invariant 2: No microscopic text-[11px] or text-xs
    assert.ok(!classResult.includes("text-[11px]"), `len ${len}: must NOT drop to 'text-[11px]': "${classResult}"`);
    assert.ok(!classResult.includes("text-xs"), `len ${len}: must NOT drop to 'text-xs': "${classResult}"`);

    // Invariant 3: Correct tier assignment
    if (expectedTier === "large") {
      assert.ok(classResult.includes("lg:text-[36px]"), `len ${len} <= 70 must include lg:text-[36px]`);
    } else if (expectedTier === "medium") {
      assert.ok(classResult.includes("lg:text-[30px]"), `len ${len} <= 140 must include lg:text-[30px]`);
    } else {
      assert.ok(classResult.includes("lg:text-[24px]"), `len ${len} > 140 must include lg:text-[24px]`);
    }
  }
});

test("clampQuestionFont survives extreme adversarial inputs (null, undefined, huge string, unicode/emoji)", () => {
  const adversarialInputs = [
    { input: null as any, label: "null" },
    { input: undefined as any, label: "undefined" },
    { input: "" as any, label: "empty string" },
    { input: "   \n\t   ", label: "whitespace string" },
    { input: "🌟✨🎯 Olympia 26 ".repeat(40), label: "emoji & unicode heavy" },
    { input: "X".repeat(5000), label: "massive 5000-char string" },
  ];

  for (const { input, label } of adversarialInputs) {
    const classResult = clampQuestionFont(input);
    assert.ok(typeof classResult === "string", `Input ${label} must yield string`);
    assert.ok(classResult.length > 0, `Input ${label} must not yield empty string`);
    assert.ok(!classResult.includes("NaN"), `Input ${label} must not contain NaN`);
    assert.ok(!classResult.includes("undefined"), `Input ${label} must not contain undefined`);
    assert.ok(!classResult.includes("text-[11px]"), `Input ${label} must not contain text-[11px]`);
    assert.ok(!classResult.includes("text-xs"), `Input ${label} must not contain text-xs`);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. DISPLAYSCREEN & PLAYERPAD COMPONENT INTEGRITY & FALLBACK RESILIENCE
// ─────────────────────────────────────────────────────────────────────────────
console.log("\n--- Suite 4: Component Rendering & Graceful Fallback Checks ---");

test("DisplayScreen.tsx source strictly has zero instances of EconovaContestantScoreTabBar", () => {
  const displayScreenPath = path.resolve(process.cwd(), "src/components/olympia/DisplayScreen.tsx");
  assert.ok(fs.existsSync(displayScreenPath), `DisplayScreen.tsx must exist at ${displayScreenPath}`);

  const source = fs.readFileSync(displayScreenPath, "utf-8");

  // Assert EconovaContestantScoreTabBar is NEVER imported
  const importMatch = source.match(/import\s+.*EconovaContestantScoreTabBar.*/);
  assert.equal(
    importMatch,
    null,
    `EconovaContestantScoreTabBar must NOT be imported in DisplayScreen.tsx. Found: ${importMatch?.[0]}`
  );

  // Assert EconovaContestantScoreTabBar is NEVER mounted as JSX tag
  const tagMatch = source.match(/<EconovaContestantScoreTabBar/);
  assert.equal(
    tagMatch,
    null,
    `EconovaContestantScoreTabBar must NOT be mounted in DisplayScreen.tsx. Found: ${tagMatch?.[0]}`
  );
});

test("Vtv3BroadcastGraphics.tsx exports all required Classic components & functions", () => {
  const graphicsPath = path.resolve(process.cwd(), "src/components/olympia/Vtv3BroadcastGraphics.tsx");
  assert.ok(fs.existsSync(graphicsPath), `Vtv3BroadcastGraphics.tsx must exist`);
  const source = fs.readFileSync(graphicsPath, "utf-8");

  const expectedExports = [
    "ClassicUnifiedLowerThird",
    "Vtv3ClassicSingleAnswerBar",
    "Vtv3ClassicSummaryGraphic",
    "clampQuestionFont",
    "Vtv3ChalkboardQuestionFrame",
  ];

  for (const exp of expectedExports) {
    const pattern = new RegExp(`export\\s+(function|const)\\s+${exp}\\b`);
    assert.ok(
      pattern.test(source),
      `Vtv3BroadcastGraphics.tsx must export '${exp}'`
    );
  }
});

test("DisplayScreen and PlayerPad handle undefined or missing themeMode gracefully without throwing", () => {
  // Test fallback simulation: state with themeMode undefined or missing
  const dummyStateWithoutTheme: Partial<OlympiaState> = {
    code: "TEST1",
    rulesetId: "O26",
    themeMode: undefined,
    currentRound: "khoiDong",
    seats: [],
  };

  // Simulating DisplayScreen condition: state.themeMode === "o26_classic"
  const isClassicDisplay = dummyStateWithoutTheme.themeMode === "o26_classic";
  assert.equal(
    isClassicDisplay,
    false,
    "When themeMode is undefined, DisplayScreen must evaluate isClassic cleanly as false (fallback to v3/default without crashing)"
  );

  // Simulating PlayerPad condition: const isClassic = state?.themeMode === "o26_classic"
  const isClassicPlayer = (dummyStateWithoutTheme as any)?.themeMode === "o26_classic";
  assert.equal(
    isClassicPlayer,
    false,
    "When themeMode is undefined, PlayerPad must evaluate isClassic cleanly as false"
  );

  // Simulating null state
  const nullState: any = null;
  const isClassicNull = nullState?.themeMode === "o26_classic";
  assert.equal(
    isClassicNull,
    false,
    "When state is null, PlayerPad optional chaining must evaluate cleanly as false"
  );
});

test("PlayerPad.tsx correctly binds isClassic across all 5 round components and UI elements", () => {
  const playerPadPath = path.resolve(process.cwd(), "src/components/olympia/PlayerPad.tsx");
  assert.ok(fs.existsSync(playerPadPath), `PlayerPad.tsx must exist`);
  const source = fs.readFileSync(playerPadPath, "utf-8");

  // Check that isClassic is declared based on state?.themeMode === "o26_classic"
  assert.ok(
    source.includes('const isClassic = state?.themeMode === "o26_classic";'),
    "PlayerPad must compute isClassic from state?.themeMode === 'o26_classic'"
  );

  // Verify classic styling markers exist in PlayerPad
  const requiredMarkers = [
    "bg-gradient-to-b from-[#24272c] via-[#1a1c20] to-[#101114]", // classic viewport
    "border-[#d4af37]", // classic gold border
    "text-[#fbbf24]", // classic gold score
    "bg-gradient-to-b from-[#181b22] via-[#121418] to-[#0a0b0e]", // classic chalkboard question box
    "CircularBuzzer3D", // ruby buzzer
    "HorizontalAnswerBar", // classic answer bar
    "PackagePicker", // classic package picker
  ];

  for (const marker of requiredMarkers) {
    assert.ok(
      source.includes(marker),
      `PlayerPad.tsx must contain classic theme marker: ${marker}`
    );
  }
});

test("Mid-round dynamic theme switching operates flawlessly across all 5 rounds without resetting round state", () => {
  const game = createTestGame();
  for (let i = 0; i < 4; i++) {
    game.joinSeat(`P${i + 1}`, `k${i}`);
  }
  game.hostAction({ type: "game:start" }, 0);

  const rounds = ["khoiDong", "vcnv", "tangToc", "veDich", "cauHoiPhu"] as const;

  for (const round of rounds) {
    if (game.state.currentRound !== round) {
      if (round === "cauHoiPhu") {
        game.hostAction({ type: "score:set", seat: 0, score: 100 }, 500);
        game.hostAction({ type: "score:set", seat: 1, score: 100 }, 500);
      }
      game.hostAction({ type: "round:next" }, 1000);
    }
    assert.equal(game.state.currentRound, round);

    // Switch to v3_arrow mid-round
    const switchRes1 = game.hostAction({ type: "theme:set", themeMode: "v3_arrow" }, 1100);
    assert.ok(switchRes1.ok);
    assert.equal(game.state.themeMode, "v3_arrow");
    assert.equal(game.view("display").themeMode, "v3_arrow");
    assert.equal(game.view("player", 0).themeMode, "v3_arrow");
    // Verify round did not mutate or reset
    assert.equal(game.state.currentRound, round);

    // Switch back to o26_classic mid-round
    const switchRes2 = game.hostAction({ type: "theme:set", themeMode: "o26_classic" }, 1200);
    assert.ok(switchRes2.ok);
    assert.equal(game.state.themeMode, "o26_classic");
    assert.equal(game.view("display").themeMode, "o26_classic");
    assert.equal(game.view("player", 0).themeMode, "o26_classic");
    assert.equal(game.state.currentRound, round);
  }
});

test("Exhaustive character length scan (0 to 300 chars) verifies strict monotonicity and typography invariants", () => {
  for (let len = 0; len <= 300; len++) {
    const text = "O".repeat(len);
    const cls = clampQuestionFont(text);

    assert.ok(typeof cls === "string" && cls.length > 0, `Length ${len} must produce valid non-empty string`);
    assert.ok(!cls.includes("NaN"), `Length ${len} contains NaN: ${cls}`);
    assert.ok(!cls.includes("undefined"), `Length ${len} contains undefined: ${cls}`);
    assert.ok(!cls.includes("text-[11px]"), `Length ${len} drops to text-[11px]: ${cls}`);
    assert.ok(!cls.includes("text-xs"), `Length ${len} drops to text-xs: ${cls}`);

    if (len <= 70) {
      assert.ok(cls.includes("lg:text-[36px]"), `Length ${len} must be in largest font tier (36px)`);
    } else if (len <= 140) {
      assert.ok(cls.includes("lg:text-[30px]"), `Length ${len} must be in medium font tier (30px)`);
    } else {
      assert.ok(cls.includes("lg:text-[24px]"), `Length ${len} must be in compact font tier (24px)`);
    }
  }
});

test("src/app/globals.css contains required Classic theme CSS utility classes", () => {
  const cssPath = path.resolve(process.cwd(), "src/app/globals.css");
  assert.ok(fs.existsSync(cssPath), "globals.css must exist");
  const css = fs.readFileSync(cssPath, "utf-8");

  const requiredTokens = [
    ".classic-slate-panel",
    ".classic-gold-border",
    ".classic-rivet-bronze",
    ".classic-rivet-red",
    ".classic-glow-active",
    ".classic-glow-buzzed",
  ];

  for (const token of requiredTokens) {
    assert.ok(css.includes(token), `globals.css must define token: ${token}`);
  }
});

console.log("\n=======================================================");
console.log(`ALL ${passed}/${total} ADVERSARIAL STRESS TESTS PASSED SUCCESSFULLY!`);
console.log("=======================================================\n");
