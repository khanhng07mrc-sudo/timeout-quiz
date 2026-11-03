import assert from "node:assert/strict";
import { test } from "node:test";
import {
  allocateQuestionsForMatch,
  getDifficultyPoolSummary,
  classifyQuestionDifficulty,
} from "./question-allocator";
import type { GameMode } from "@/types";

test("getDifficultyPoolSummary: locks any difficulty with fewer questions than team count", () => {
  const sampleQuestions = [
    // 9 Easy
    ...Array.from({ length: 9 }, (_, i) => ({ id: `e${i}`, points: 10, bloomLevel: "REMEMBER" })),
    // 5 Medium
    ...Array.from({ length: 5 }, (_, i) => ({ id: `m${i}`, points: 20, bloomLevel: "APPLY" })),
    // 2 Hard
    ...Array.from({ length: 2 }, (_, i) => ({ id: `h${i}`, points: 30, bloomLevel: "ANALYZE" })),
  ];

  const teamsCount = 4;
  const summary = getDifficultyPoolSummary(sampleQuestions, teamsCount);

  // Easy: 9 available -> floor(9/4) = 2 rounds (8 questions), allowed
  assert.equal(summary.easy.count, 9);
  assert.equal(summary.easy.maxRounds, 2);
  assert.equal(summary.easy.maxQuestions, 8);
  assert.equal(summary.easy.isAllowed, true);

  // Medium: 5 available -> floor(5/4) = 1 round (4 questions), allowed
  assert.equal(summary.medium.count, 5);
  assert.equal(summary.medium.maxRounds, 1);
  assert.equal(summary.medium.maxQuestions, 4);
  assert.equal(summary.medium.isAllowed, true);

  // Hard: 2 available -> floor(2/4) = 0 rounds, LOCKED / DISABLED!
  assert.equal(summary.hard.count, 2);
  assert.equal(summary.hard.maxRounds, 0);
  assert.equal(summary.hard.maxQuestions, 0);
  assert.equal(summary.hard.isAllowed, false);
  assert.ok(summary.hard.disabledReason?.includes("không đủ chia cho 4 đội"));
});

test("allocateQuestionsForMatch in MYSTERY_QUEST & DICE_RACE: custom difficulty distribution strictly adheres to teamsCount divisibility, round equality, and ascending order", () => {
  const sampleQuestions = [
    // 12 Easy
    ...Array.from({ length: 12 }, (_, i) => ({ id: `e${i}`, points: 10, bloomLevel: "REMEMBER" })),
    // 8 Medium
    ...Array.from({ length: 8 }, (_, i) => ({ id: `m${i}`, points: 20, bloomLevel: "APPLY" })),
    // 8 Hard
    ...Array.from({ length: 8 }, (_, i) => ({ id: `h${i}`, points: 30, bloomLevel: "ANALYZE" })),
  ];

  const teamsCount = 4;
  for (const mode of ["MYSTERY_QUEST", "DICE_RACE"] as GameMode[]) {
    // Host requests: 2 rounds of Easy (8 questions), 1 round of Medium (4 questions), 1 round of Hard (4 questions)
    const result = allocateQuestionsForMatch({
      questions: sampleQuestions,
      mode,
      teamsCount,
      options: {
        customDifficultyDistribution: {
          easyRounds: 2,
          mediumRounds: 1,
          hardRounds: 1,
        },
      },
    });

    const allocated = result.allocatedQuestions;
    // Total 4 rounds * 4 teams = 16 questions
    assert.equal(allocated.length, 16);

    // Round 1 (q 0..3): All Easy
    const round1 = allocated.slice(0, 4);
    assert.ok(round1.every((q) => q.allocatedDiff === "EASY" && q.roundIndex === 1));

    // Round 2 (q 4..7): All Easy
    const round2 = allocated.slice(4, 8);
    assert.ok(round2.every((q) => q.allocatedDiff === "EASY" && q.roundIndex === 2));

    // Round 3 (q 8..11): All Medium
    const round3 = allocated.slice(8, 12);
    assert.ok(round3.every((q) => q.allocatedDiff === "MEDIUM" && q.roundIndex === 3));

    // Round 4 (q 12..15): All Hard
    const round4 = allocated.slice(12, 16);
    assert.ok(round4.every((q) => q.allocatedDiff === "HARD" && q.roundIndex === 4));
  }
});

test("allocateQuestionsForMatch: clamping when Host requests more than available in bank", () => {
  const sampleQuestions = [
    // Only 4 Easy (exactly 1 round for 4 teams)
    ...Array.from({ length: 4 }, (_, i) => ({ id: `e${i}`, points: 10, bloomLevel: "REMEMBER" })),
    // Only 4 Medium (exactly 1 round for 4 teams)
    ...Array.from({ length: 4 }, (_, i) => ({ id: `m${i}`, points: 20, bloomLevel: "APPLY" })),
    // 0 Hard
  ];

  const result = allocateQuestionsForMatch({
    questions: sampleQuestions,
    mode: "MYSTERY_QUEST",
    teamsCount: 4,
    options: {
      customDifficultyDistribution: {
        easyRounds: 5, // requests 5 rounds, but bank only has 1
        mediumRounds: 2, // requests 2 rounds, bank only has 1
        hardRounds: 1, // requests 1 round, bank has 0 -> clamped to 0
      },
    },
  });

  const allocated = result.allocatedQuestions;
  // Should clamp to 1 Easy round (4 q) + 1 Medium round (4 q) = 8 questions
  assert.equal(allocated.length, 8);
  assert.equal(allocated.filter((q) => q.allocatedDiff === "EASY").length, 4);
  assert.equal(allocated.filter((q) => q.allocatedDiff === "MEDIUM").length, 4);
  assert.equal(allocated.filter((q) => q.allocatedDiff === "HARD").length, 0);
});

test("allocateQuestionsForMatch in SHUFFLE_RANDOM: distributes rounds evenly across all available difficulty pools without omitting any available level", () => {
  const sampleQuestions = [
    // 12 Easy
    ...Array.from({ length: 12 }, (_, i) => ({ id: `e${i}`, points: 10, bloomLevel: "REMEMBER" })),
    // 8 Medium
    ...Array.from({ length: 8 }, (_, i) => ({ id: `m${i}`, points: 20, bloomLevel: "APPLY" })),
    // 8 Hard
    ...Array.from({ length: 8 }, (_, i) => ({ id: `h${i}`, points: 30, bloomLevel: "ANALYZE" })),
  ];

  const teamsCount = 4;
  // Request 12 questions (3 rounds for 4 teams).
  // Available pools: Easy (max 3), Medium (max 2), Hard (max 2).
  // SHUFFLE_RANDOM must give at least 1 round to Easy, 1 round to Medium, 1 round to Hard!
  // None of the 3 available pools should be omitted!
  const result = allocateQuestionsForMatch({
    questions: sampleQuestions,
    mode: "MYSTERY_QUEST",
    teamsCount,
    targetCount: 12,
    allocationStrategy: "SHUFFLE_RANDOM",
  });

  const allocated = result.allocatedQuestions;
  assert.equal(allocated.length, 12);

  const easyCount = allocated.filter((q) => q.allocatedDiff === "EASY").length;
  const medCount = allocated.filter((q) => q.allocatedDiff === "MEDIUM").length;
  const hardCount = allocated.filter((q) => q.allocatedDiff === "HARD").length;

  // Each pool gets 1 round of 4 questions
  assert.equal(easyCount, 4);
  assert.equal(medCount, 4);
  assert.equal(hardCount, 4);
});

test("allocateQuestionsForMatch in GRID_CARO: strictly divisible by teamsCount so all teams answer equal number of questions", () => {
  const sampleQuestions = [
    ...Array.from({ length: 25 }, (_, i) => ({ id: `q${i}`, points: 10 + (i % 3) * 10, bloomLevel: "REMEMBER" })),
  ];

  for (const teamsCount of [3, 4, 5]) {
    const result = allocateQuestionsForMatch({
      questions: sampleQuestions,
      mode: "GRID_CARO",
      teamsCount,
      targetCount: 20,
    });

    const allocated = result.allocatedQuestions;
    // Total questions must be a strict multiple of teamsCount
    assert.equal(allocated.length % teamsCount, 0);
    assert.ok(allocated.length <= 20);
    assert.ok(allocated.length > 0);
  }
});
