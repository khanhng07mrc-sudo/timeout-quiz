// Run: npm run test:olympia   (bundles with esbuild, runs with node:assert)

import assert from "node:assert/strict";

import { OlympiaGame } from "./engine";

import { RULESETS, cnvPointsFor, tangTocTierPoints } from "./rulesets";

import { SAMPLE_QUESTION_SET, BAC_AI_QUESTION_SET } from "./sample-questions";
import { buildBalancedKhoiDongQueues } from "./ai-classifier";

import type { OlympiaConfig, RoundId, RulesetId } from "./types";



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



function game(rulesetId: RulesetId, rounds: RoundId[], players: number, extraCfg?: Partial<OlympiaConfig>) {

  const cfg: OlympiaConfig = { rulesetId, rounds, questionSet: SAMPLE_QUESTION_SET, ...extraCfg };

  const g = new OlympiaGame("TEST", cfg, 0);

  for (let i = 0; i < players; i++) g.joinSeat("P" + (i + 1), "k" + i);

  return g;

}

const act = (g: OlympiaGame, type: string, extra: Record<string, unknown> = {}, now = 0) => {

  const r = g.hostAction({ type, ...extra }, now);

  assert.ok(r.ok, `${type} failed: ${r.ok ? "" : r.error}`);

};



const scores = (g: OlympiaGame) => g.activeSeatIds.map((i) => g.state.seats[i].score);



console.log("Olympia engine");



test("max 8 seats, 9th player rejected", () => {

  const g = game("O26", ["khoiDong"], 8);

  assert.equal(g.joinSeat("X", "k99"), -1);

  assert.equal(g.activeSeatIds.length, 8);

});



test("custom seatCount and sandbox pre-populated teams", () => {

  const g3 = new OlympiaGame("SB3", {

    rulesetId: "O26",

    rounds: ["khoiDong"],

    questionSet: SAMPLE_QUESTION_SET,

    seatCount: 3,

    teams: [{ name: "Thí sinh 1" }, { name: "Thí sinh 2" }, { name: "Thí sinh 3" }],

  });

  assert.equal(g3.state.seats.length, 3);

  assert.equal(g3.activeSeatIds.length, 3);

  assert.equal(g3.state.seats[0].name, "Thí sinh 1");

  assert.equal(g3.state.seats[0].connected, true);

  assert.equal(g3.joinSeat("Thí sinh 4", "k4"), -1); // rejects 4th player

});



test("CNV points per season (O13 through O26)", () => {

  const o = (s: RulesetId) => [0, 1, 2, 3, 4].map((n) => cnvPointsFor(RULESETS[s], n, false)).concat([cnvPointsFor(RULESETS[s], 4, true)]);

  assert.deepEqual(o("O13"), [80, 80, 80, 40, 40, 20]);

  assert.deepEqual(o("O14"), [80, 80, 60, 40, 20, 10]);

  assert.deepEqual(o("O15"), [80, 80, 60, 40, 20, 10]);

  assert.deepEqual(o("O20"), [80, 80, 60, 40, 20, 10]);

  assert.deepEqual(o("O21"), [80, 80, 60, 40, 20, 10]);

  assert.deepEqual(o("O22"), [80, 80, 60, 40, 20, 10]);

  assert.deepEqual(o("O23"), [50, 50, 40, 30, 20, 10]);

  assert.deepEqual(o("O26"), [60, 60, 50, 40, 30, 20]);

});



test("O13–O19 Khởi Động: 60s personal clock, max 12 questions, manual kd:next", () => {

  const g = game("O13", ["khoiDong"], 2);

  act(g, "game:start");

  assert.equal(g.state.khoiDong!.segments.length, 2);

  assert.equal(g.state.khoiDong!.segments[0].questions, 12);

  assert.equal(g.state.khoiDong!.segments[0].globalMs, 60000);

  act(g, "kd:next");

  assert.ok(g.state.khoiDong!.current?.subject, "has subject badge");

  act(g, "kd:timer", {}, 1000);

  assert.ok(g.state.khoiDong!.globalTimer!.startedAt != null, "60s clock running");

  act(g, "kd:correct", {}, 2000);

  assert.equal(g.state.khoiDong!.phase, "result", "waits for manual kd:next");

  assert.ok(g.state.khoiDong!.globalTimer!.startedAt != null, "60s clock continues running between questions");

});



test("O20–O21 Khởi Động: 60s personal clock, unlimited questions (>12 allowed)", () => {

  const g = game("O20", ["khoiDong"], 2);

  act(g, "game:start");

  for (let i = 0; i < 15; i++) {

    act(g, "kd:next");

    assert.equal(g.state.khoiDong!.phase, "question");

    act(g, "kd:correct");

  }

  assert.equal(g.state.seats[0].score, 150);

});



test("O13–O21 Tăng Tốc uses 30s for all 4 questions", () => {

  for (const id of ["O13", "O14", "O15", "O16", "O17", "O18", "O19", "O20", "O21"] as RulesetId[]) {

    assert.deepEqual(RULESETS[id].tangToc.timers, [30000, 30000, 30000, 30000]);

  }

});



test("VCNV Question #5 (Center Question): +10 pts and post-center CNV points (20 in O13, 10 in O14)", () => {

  const g13 = game("O13", ["vcnv"], 2);

  act(g13, "game:start");

  act(g13, "vcnv:selectRow", { row: 4 }); // Center question (#5)

  act(g13, "vcnv:timer", {}, 0);

  g13.playerAnswer(0, SAMPLE_QUESTION_SET.vcnv.centerQuestion!.a, 1000);

  act(g13, "vcnv:reveal", {}, 2000);

  act(g13, "vcnv:correct");

  assert.equal(g13.state.seats[0].score, 10);

  act(g13, "vcnv:revealTile");

  assert.equal(g13.state.vcnv!.centerOpened, true);

  g13.playerBuzz(1, 2100);

  act(g13, "vcnv:correctCNV", { seat: 1 });

  assert.equal(g13.state.seats[1].score, 20, "O13 post-center CNV = 20 pts");



  const g14 = game("O14", ["vcnv"], 2);

  act(g14, "game:start");

  act(g14, "vcnv:selectRow", { row: 4 });

  act(g14, "vcnv:revealTile");

  g14.playerBuzz(1, 2100);

  act(g14, "vcnv:correctCNV", { seat: 1 });

  assert.equal(g14.state.seats[1].score, 10, "O14 post-center CNV = 10 pts");

});



test("O13–O14 vs O15–O19 Về Đích preset packages (4 questions vs 3 questions)", () => {

  const g13 = game("O13", ["veDich"], 2);

  act(g13, "game:start");

  assert.ok(!g13.hostAction({ type: "vd:choosePackage", points: [10, 20, 30] }, 0).ok, "O13 rejects 3-q package");

  act(g13, "vd:choosePackage", { points: [10, 10, 20, 20] }); // Gói 60đ (4 câu)

  assert.equal(g13.state.veDich!.packages[0].length, 4);

  act(g13, "vd:startQuestion");

  assert.equal(g13.state.veDich!.timer.totalMs, 10000, "10đ question has 10s timer in O13");



  const g15 = game("O15", ["veDich"], 2);

  act(g15, "game:start");

  act(g15, "vd:choosePackage", { points: [20, 30, 30] }); // Gói 80đ (3 câu)

  assert.equal(g15.state.veDich!.packages[0].length, 3);

});



test("O20 vs O21 Về Đích turn order: seat_order vs highest_unplayed", () => {

  const g20 = game("O20", ["khoiDong", "veDich"], 3);

  act(g20, "game:start");

  g20.state.seats[0].score = 50;

  g20.state.seats[1].score = 120;

  g20.state.seats[2].score = 90;

  act(g20, "round:next");

  assert.deepEqual(g20.state.veDich!.order, [0, 1, 2], "O20 keeps fixed seat order 1->2->3");



  const g21 = game("O21", ["khoiDong", "veDich"], 3);

  act(g21, "game:start");

  g21.state.seats[0].score = 50;

  g21.state.seats[1].score = 120;

  g21.state.seats[2].score = 90;

  act(g21, "round:next");

  assert.equal(g21.state.veDich!.order[0], 1, "O21 starts with highest scorer (seat 1: 120)");

  // During seat 1's turn, seat 0 steals points and overtakes seat 2!

  g21.state.seats[0].score = 100;

  act(g21, "vd:nextSeat");

  assert.equal(g21.state.veDich!.order[1], 0, "O21 dynamically picks seat 0 (100 > 90) for turn 2");

});



test("Tăng Tốc point tables for 2..8 contestants", () => {

  assert.deepEqual(tangTocTierPoints(2), [20, 10]);

  assert.deepEqual(tangTocTierPoints(3), [30, 20, 10]);

  assert.deepEqual(tangTocTierPoints(4), [40, 30, 20, 10]);

  assert.deepEqual(tangTocTierPoints(5), [40, 30, 20, 15, 10]);

  assert.deepEqual(tangTocTierPoints(6), [40, 30, 25, 20, 15, 10]);

  assert.deepEqual(tangTocTierPoints(7), [40, 35, 30, 25, 20, 15, 10]);

  assert.deepEqual(tangTocTierPoints(8), [40, 35, 30, 25, 20, 15, 10, 5]);

});



test("Khởi Động O23: turn question counts = X*2, X*3, X*4", () => {

  for (const x of [2, 4, 5, 8]) {

    const segs = RULESETS.O23.khoiDong.segments(x).filter((s) => s.kind === "turn");

    assert.deepEqual(segs.map((s) => s.questions), [x * 2, x * 3, x * 4]);

  }

});



test("Khởi Động O24+: shared segment = X*3", () => {

  for (const id of ["O24", "O25", "O26"] as RulesetId[]) {

    for (const x of [2, 4, 7, 8]) {

      const shared = RULESETS[id].khoiDong.segments(x).find((s) => s.kind === "shared")!;

      assert.equal(shared.questions, x * 3);

    }

  }

  assert.equal(RULESETS.O26.khoiDong.segments(8).filter((s) => s.kind === "solo").length, 8);

});



test("only selected rounds are played; CHP not played without a tie", () => {

  const g = game("O26", ["vcnv", "tangToc"], 3);

  act(g, "game:start");

  assert.equal(g.state.currentRound, "vcnv");

  g.state.seats[0].score = 50; // break any tie

  act(g, "round:next");

  assert.equal(g.state.currentRound, "tangToc");

  act(g, "round:next");

  assert.equal(g.state.stage, "finished");

  assert.equal(g.state.roundStatus.khoiDong, "pending");

  assert.equal(g.state.roundStatus.cauHoiPhu, "pending");

});



test("tie after last round auto-starts Câu hỏi phụ", () => {

  const g = game("O26", ["khoiDong"], 3);

  act(g, "game:start");

  g.state.seats[0].score = 20;

  g.state.seats[1].score = 20;

  g.state.seats[2].score = 10;

  act(g, "round:next");

  assert.equal(g.state.currentRound, "cauHoiPhu");

  assert.deepEqual(g.state.cauHoiPhu!.tied, [0, 1]);

});



test("Khởi Động solo correct gives +10 to the answering seat", () => {

  const g = game("O26", ["khoiDong"], 2);

  act(g, "game:start");

  act(g, "kd:next");

  assert.equal(g.state.khoiDong!.phase, "question");

  act(g, "kd:correct");

  assert.equal(g.state.seats[0].score, 10);

});



test("Khởi Động solo: 6/6 questions auto-transitions to 0/6 of next seat or 0/X of shared", () => {

  const g = game("O26", ["khoiDong"], 2);

  act(g, "game:start");

  assert.equal(g.state.khoiDong!.qIdx, -1);

  assert.equal(g.state.khoiDong!.phase, "intro");



  // Play questions 1..6 for seat 0

  for (let i = 0; i < 6; i++) {

    act(g, "kd:next");

    assert.equal(g.state.khoiDong!.qIdx, i);

    assert.equal(g.state.khoiDong!.phase, "question");

    act(g, "kd:correct");

  }

  assert.equal(g.state.khoiDong!.qIdx, 5);

  assert.equal(g.state.khoiDong!.phase, "result");



  // First click (Kết thúc lượt) finishes the turn, cues finish_turn and sets segmentDone

  act(g, "kd:next");

  assert.equal(g.state.khoiDong!.phase, "segmentDone");

  assert.equal(g.state.cue!.sound, "1_KhoiDong/finish_turn");



  // Second click (Câu tiếp) auto-transitions to seat 1 (Câu 0/6, phase intro)

  act(g, "kd:next");

  assert.equal(g.state.khoiDong!.segIdx, 1);

  assert.equal(g.state.khoiDong!.qIdx, -1);

  assert.equal(g.state.khoiDong!.phase, "intro");



  // Play questions 1..6 for seat 1

  for (let i = 0; i < 6; i++) {

    act(g, "kd:next");

    act(g, "kd:correct");

  }



  // First click (Kết thúc lượt) for seat 1

  act(g, "kd:next");

  assert.equal(g.state.khoiDong!.phase, "segmentDone");

  assert.equal(g.state.cue!.sound, "1_KhoiDong/finish_turn");



  // Second click (Câu tiếp) after seat 1 auto-transitions to shared round (Câu 0/6, phase intro)

  act(g, "kd:next");

  assert.equal(g.state.khoiDong!.segIdx, 2);

  assert.equal(g.state.khoiDong!.segments[2].kind, "shared");

  assert.equal(g.state.khoiDong!.qIdx, -1);

  assert.equal(g.state.khoiDong!.phase, "intro");

});



test("Khởi Động shared: O22 2s lock, O23+ 5s lock, early manual unlock, timer stops on grading", () => {

  // Test O22 (2s lock & round clock continues during kd:wrong)

  const g22 = game("O22", ["khoiDong"], 2);

  act(g22, "game:start");

  g22.state.khoiDong!.segIdx = 0;

  g22.state.khoiDong!.globalTimer = { totalMs: 30000, remainingMs: 30000, startedAt: null };

  g22.state.khoiDong!.phase = "intro";

  act(g22, "kd:next", {}, 1000);

  assert.equal(g22.state.khoiDong!.buzzOpen, false, "O22 buzzer locked initially");

  assert.equal(g22.state.khoiDong!.buzzUnlockAt, 1000 + 2000, "O22 locked for 2s");

  act(g22, "kd:timer", {}, 1000);

  assert.ok(g22.state.khoiDong!.globalTimer!.startedAt != null, "Round clock started");

  g22.tick(1000 + 2000);

  assert.equal(g22.state.khoiDong!.buzzOpen, true);

  assert.ok(g22.playerBuzz(0, 3100).ok);

  assert.equal(g22.state.khoiDong!.buzzedSeat, 0);

  act(g22, "kd:wrong", {}, 3200);

  assert.equal(g22.state.khoiDong!.phase, "result");

  assert.equal(g22.state.khoiDong!.buzzOpen, false, "Buzzer closed");

  assert.ok(g22.state.khoiDong!.globalTimer!.startedAt != null, "O22 global round timer MUST keep running on kd:wrong!");

  // Test O26 (5s lock)

  const g = game("O26", ["khoiDong"], 2);

  act(g, "game:start");

  g.state.khoiDong!.segIdx = 2;

  g.state.khoiDong!.phase = "intro";

  act(g, "kd:next", {}, 1000);

  assert.equal(g.state.khoiDong!.buzzOpen, false, "O26 buzzer locked initially");

  assert.equal(g.state.khoiDong!.buzzUnlockAt, 1000 + 5000, "O26 locked for 5s");



  // Early manual unlock by admin

  act(g, "kd:buzzer");

  assert.equal(g.state.khoiDong!.buzzOpen, true, "Admin manual unlock early");

  assert.equal(g.state.khoiDong!.buzzUnlockAt, undefined);



  // Seat 1 buzzes

  assert.ok(g.playerBuzz(1, 2000).ok);

  assert.equal(g.state.khoiDong!.buzzOpen, false);



  // Admin grades wrong -> timer stops, score deducted by 5 (clamped >= 0), phase result, buzzer does NOT re-buzz

  g.state.seats[1].score = 10;

  act(g, "kd:wrong", {}, 2500);

  assert.equal(g.state.seats[1].score, 5);

  // If score is 0, deduction clamps at 0 (no negative score)
  g.state.seats[1].score = 0;
  g.state.khoiDong!.phase = "question";
  g.state.khoiDong!.buzzedSeat = 1;
  act(g, "kd:wrong", {}, 2600);
  assert.equal(g.state.seats[1].score, 0, "Score floor clamped at 0");

  assert.equal(g.state.khoiDong!.phase, "result");

  assert.equal(g.state.khoiDong!.buzzOpen, false, "Timer stops, buzzer closes");

  assert.equal(g.state.khoiDong!.timer.startedAt, null, "Timer stopped");

});



test("Khởi Động shared: when last question completes, kd:next concludes the turn with finish_turn", () => {

  const g = game("O26", ["khoiDong"], 2);

  act(g, "game:start");

  g.state.khoiDong!.segIdx = 2;

  g.state.khoiDong!.phase = "intro";



  for (let i = 0; i < 6; i++) {

    act(g, "kd:next");

    act(g, "kd:skip");

  }

  assert.equal(g.state.khoiDong!.qIdx, 5);

  assert.equal(g.state.khoiDong!.phase, "result");



  // Pressing Kết thúc lượt (kd:next / kd:finishTurn) cues finish_turn and transitions to segmentDone

  const res = g.hostAction({ type: "kd:next" }, 1000);

  assert.equal(res.ok, true);

  assert.equal(g.state.khoiDong!.phase, "segmentDone");

  assert.equal(g.state.cue!.sound, "1_KhoiDong/finish_turn");

});



test("Tăng Tốc grading uses X-based table and unique-time tiers", () => {

  const g = game("O26", ["tangToc"], 5);

  act(g, "game:start");

  act(g, "tt:next");

  act(g, "tt:show");

  act(g, "tt:timer", {}, 0);

  const ans = SAMPLE_QUESTION_SET.tangToc[0].answer;

  g.playerAnswer(0, ans, 1000);

  g.playerAnswer(1, ans, 2000);

  g.playerAnswer(2, ans, 2000); // same time as seat 1 -> same tier

  g.playerAnswer(3, ans, 3000);

  g.playerAnswer(4, "sai", 4000);

  act(g, "tt:reveal", {}, 5000);

  act(g, "tt:grade");

  const s = scores(g);

  assert.deepEqual(s, [40, 30, 30, 20, 0]);

});



test("VCNV: row points, keyword points by opened rows, elimination on wrong CNV", () => {

  const g = game("O26", ["vcnv"], 2);

  act(g, "game:start");

  act(g, "vcnv:selectRow", { row: 0 });

  act(g, "vcnv:timer", {}, 0);

  g.playerAnswer(0, SAMPLE_QUESTION_SET.vcnv.rows[0].answer.toLowerCase(), 1000);

  g.playerAnswer(1, "sai", 1000);

  act(g, "vcnv:reveal", {}, 2000);

  act(g, "vcnv:correct");

  assert.deepEqual(scores(g), [10, 0]);

  act(g, "vcnv:revealTile");

  g.playerBuzz(1, 2100);

  act(g, "vcnv:wrongCNV", { seat: 1 });

  // Wrong CNV does not immediately eliminate seat 1 until bells are cleared
  act(g, "vcnv:clearBells");
  assert.deepEqual(g.state.vcnv!.eliminatedSeats, [1]);

  g.playerBuzz(0, 2200);

  act(g, "vcnv:correctCNV", { seat: 0 });

  assert.equal(g.state.seats[0].score, 10 + 60);

});



test("Về Đích: correct, wrong+steal, hope star", () => {

  const g = game("O26", ["veDich"], 2);

  act(g, "game:start");

  act(g, "vd:choosePackage", { points: [20, 30, 20] });

  act(g, "vd:startQuestion");

  act(g, "vd:correct");

  assert.equal(g.state.seats[0].score, 20);

  act(g, "vd:startQuestion"); // 30 pts

  act(g, "vd:hopeStar");

  act(g, "vd:wrong");

  act(g, "vd:openSteal", {}, 0); // star deducts 30 from 20, clamped at 0

  assert.equal(g.state.seats[0].score, 0);

  assert.ok(g.playerBuzz(1, 100).ok);

  act(g, "vd:correctSteal");

  assert.equal(g.state.seats[1].score, 30);

  assert.equal(g.state.seats[0].score, 0, "owner not deducted twice and clamped at 0");

  assert.ok(!g.hostAction({ type: "vd:hopeStar" }, 0).ok);

});



test("Về Đích rejects invalid package", () => {

  const g = game("O26", ["veDich"], 2);

  act(g, "game:start");

  assert.ok(!g.hostAction({ type: "vd:choosePackage", points: [10, 10, 10] }, 0).ok);

});



test("view() hides answers from players/display", () => {

  const g = game("O26", ["khoiDong"], 2);

  act(g, "game:start");

  act(g, "kd:next");

  const host = g.view("host");

  const pl = g.view("player", 0);

  assert.ok(host.khoiDong!.current!.a);

  assert.equal(pl.khoiDong!.current!.a, undefined);

});



test("timers expire on tick", () => {

  const g = game("O26", ["khoiDong"], 2);

  act(g, "game:start");

  act(g, "kd:next");

  act(g, "kd:timer", {}, 1000);

  assert.ok(g.tick(1000 + 6000));

  assert.equal(g.state.khoiDong!.timer.remainingMs, 0);

});





import * as XLSX from "xlsx";

import { parseSheets, parseJsonSet } from "./excel-import";

import { RULESET_YEAR_BUTTONS } from "./rulesets";

import { analyzeSetInventoryAndThresholds, classifyQuestionWithAI } from "./ai-classifier";



test("RULESET_YEAR_BUTTONS merges O15–O19 into '15' and O24–O25 into '24'", () => {

  assert.deepEqual(

    RULESET_YEAR_BUTTONS.map((b) => b.numberLabel),

    ["13", "14", "15", "20", "21", "22", "23", "24", "26"]

  );

});



test("SAMPLE_QUESTION_SET has >= 75 Khởi Động and >= 24 Về Đích balanced across zones", () => {

  const inv = analyzeSetInventoryAndThresholds(SAMPLE_QUESTION_SET, 4);

  assert.ok(inv.kdTotal.total >= 75, `Expected >= 75 KD questions, got ${inv.kdTotal.total}`);

  assert.ok(inv.vdTotal.total >= 24, `Expected >= 24 VD questions, got ${inv.vdTotal.total}`);

  assert.equal(inv.overallStatus, "ok");

  const tagged = classifyQuestionWithAI("Giải phương trình bậc hai trong mặt phẳng tọa độ Oxy", "x = 2");

  assert.equal(tagged.kdZone, "MATH_IT");

  assert.equal(tagged.vdZone, "KHTN");

});



test("VCNV separate reveal buttons (vcnv:revealRowsOnly vs vcnv:revealPiecesOnly) & 2-level transcript with allAttempts", () => {

  const g = game("O26", ["vcnv", "tangToc"], 3);

  act(g, "game:start");

  act(g, "vcnv:selectRow", { row: 0 });

  act(g, "vcnv:timer", {}, 0);

  g.playerAnswer(0, "Nháp lần 1", 1000);

  g.playerAnswer(0, "Nháp áp chót", 2500);

  g.playerAnswer(0, SAMPLE_QUESTION_SET.vcnv.rows[0].answer, 4000);

  act(g, "vcnv:reveal", {}, 5000);

  act(g, "vcnv:correct", { seatIds: [0] }, 6000);



  const vcnvEntry = (g.state.transcript ?? []).find((e) => e.round === "vcnv")!;

  assert.ok(vcnvEntry, "VCNV transcript entry recorded");

  const sub0 = vcnvEntry.submissions!.find((s) => s.seat === 0)!;

  assert.equal(sub0.finalAnswer, SAMPLE_QUESTION_SET.vcnv.rows[0].answer);

  assert.equal(sub0.previousAnswer, "Nháp áp chót");

  assert.equal(sub0.allAttempts.length, 3);



  act(g, "vcnv:revealRowsOnly");

  assert.ok(g.state.vcnv!.rows.every((r) => r.opened), "all rows opened");

  assert.equal(g.state.vcnv!.piecesRevealed[1], false, "piece 2 still closed");

  act(g, "vcnv:revealPiecesOnly");

  assert.ok(g.state.vcnv!.piecesRevealed.every(Boolean), "all 5 pieces opened");

});



test("excel-import parses CauHoi_Mau.xlsx and CauHoi_Mau_O22_23.xlsx", () => {

  for (const fn of ["D:/Olympia 26/CauHoi_Mau.xlsx", "D:/Olympia 26/CauHoi_Mau_O22_23.xlsx"]) {

    const wb = XLSX.readFile(fn);

    const sheets: Record<string, Record<string, unknown>[]> = {};

    for (const n of wb.SheetNames) sheets[n] = XLSX.utils.sheet_to_json(wb.Sheets[n], { defval: "" });

    const { set } = parseSheets(sheets, fn);

    assert.ok(set.vcnv.rows.length > 0, fn + " vcnv rows");

    assert.ok(set.tangToc.length > 0, fn + " tangToc");

    assert.ok(Object.values(set.veDich).flat().length > 0, fn + " veDich");

  }

  const j = parseJsonSet(SAMPLE_QUESTION_SET);

  assert.equal(j.set?.vcnv.answer, "TIÊU LỆNH CHỮA CHÁY");

});

test("O22 Quý 1: Khởi động 30s-60s-90s, sai khóa câu sau không trừ điểm, Về đích 2 câu (20/40đ)", () => {

  const g = game("O22", ["khoiDong", "veDich"], 2, { o22Quarter: 1 });

  act(g, "game:start");

  const kd = g.state.khoiDong!;

  assert.equal(kd.segments.length, 3, "O22 has exactly 3 shared segments");

  assert.equal(kd.segments[0].globalMs, 30000, "Q1 Lượt 1 is 30s");

  assert.equal(kd.segments[1].globalMs, 60000, "Q1 Lượt 2 is 60s");

  assert.equal(kd.segments[2].globalMs, 90000, "Q1 Lượt 3 is 90s");



  // Start question 0 and test wrong answer

  act(g, "kd:next", {}, 1000);

  g.tick(1000 + 2000); // 2s lock

  assert.ok(g.playerBuzz(0, 3100).ok);

  act(g, "kd:wrong", {}, 3200);

  assert.equal(g.state.seats[0].score, 0, "No point deduction in Q1");

  assert.deepEqual(kd.nextLockedSeats, [0], "Seat 0 is locked out of next question in Q1");



  // Advance to Về Đích

  act(g, "round:force", { round: "veDich" });

  // In Q1, 2 questions [20, 40] is valid; 3 questions or [10, 20, 30] is rejected

  assert.equal(g.hostAction({ type: "vd:choosePackage", points: [10, 20, 30] }, 0).ok, false);

  assert.equal(g.hostAction({ type: "vd:choosePackage", points: [20, 40] }, 0).ok, true);

});



test("O22 Quý 2: Khởi động 60s-60s-90s, sai khóa câu sau không trừ điểm, Về đích 3 câu (20/30đ)", () => {

  const g = game("O22", ["khoiDong", "veDich"], 2, { o22Quarter: 2 });

  act(g, "game:start");

  const kd = g.state.khoiDong!;

  assert.equal(kd.segments[0].globalMs, 60000, "Q2 Lượt 1 is 60s");

  assert.equal(kd.segments[1].globalMs, 60000, "Q2 Lượt 2 is 60s");

  assert.equal(kd.segments[2].globalMs, 90000, "Q2 Lượt 3 is 90s");



  act(g, "kd:next", {}, 1000);

  g.tick(1000 + 2000);

  assert.ok(g.playerBuzz(0, 3100).ok);

  act(g, "kd:wrong", {}, 3200);

  assert.equal(g.state.seats[0].score, 0, "No point deduction in Q2");

  assert.deepEqual(kd.nextLockedSeats, [0], "Seat 0 is locked out of next question in Q2");



  // Advance to Về Đích

  act(g, "round:force", { round: "veDich" });

  assert.equal(g.hostAction({ type: "vd:choosePackage", points: [20, 40] }, 0).ok, false, "2 questions rejected in Q2");

  assert.equal(g.hostAction({ type: "vd:choosePackage", points: [20, 30, 20] }, 0).ok, true, "3 questions [20, 30] accepted in Q2");

});



test("O22 Quý 3 - CKN: Khởi động 60s-60s-90s, sai trừ 5đ không khóa câu sau, Về đích 3 câu (20/30đ)", () => {

  const g = game("O22", ["khoiDong", "veDich"], 2, { o22Quarter: 3 });

  act(g, "game:start");

  const kd = g.state.khoiDong!;

  assert.equal(kd.segments[0].globalMs, 60000, "Q3 Lượt 1 is 60s");



  act(g, "kd:next", {}, 1000);

  g.tick(1000 + 2000);

  assert.ok(g.playerBuzz(0, 3100).ok);

  g.state.seats[0].score = 15;

  act(g, "kd:wrong", {}, 3200);

  assert.equal(g.state.seats[0].score, 10, "Q3 deducts 5 points on wrong answer");

  assert.deepEqual(kd.nextLockedSeats, [], "Seat 0 is NOT locked out of next question in Q3");



  // Advance to Về Đích

  act(g, "round:force", { round: "veDich" });

  assert.equal(g.hostAction({ type: "vd:choosePackage", points: [20, 20, 30] }, 0).ok, true);

});



test("O22 dynamic quarter switch via system:setO22Quarter", () => {

  const g = game("O22", ["khoiDong"], 2, { o22Quarter: 1 });

  act(g, "game:start");

  assert.equal(g.state.khoiDong!.segments[0].globalMs, 30000);



  // Host dynamically switches to Quý 2

  act(g, "system:setO22Quarter", { quarter: 2 });

  assert.equal(g.state.o22Quarter, 2);

  assert.equal(g.state.khoiDong!.segments[0].globalMs, 60000, "Updated to 60s");

});





test("score:set manually sets candidate score directly and clamps >= 0", () => {

  const g = game("O26", ["khoiDong"], 2);

  act(g, "game:start");

  assert.equal(g.state.seats[0].score, 0);

  act(g, "score:set", { seat: 0, score: 75 });

  assert.equal(g.state.seats[0].score, 75);

  act(g, "score:set", { seat: 1, score: -20 });

  assert.equal(g.state.seats[1].score, 0, "score:set clamps negative scores at 0");

});



test("system:setKdFinishTurnPan updates stereo panning for finish_turn sound", () => {

  const g = game("O26", ["khoiDong"], 2);

  act(g, "system:setKdFinishTurnPan", { pan: "left" });

  assert.equal(g.state.kdFinishTurnPan, "left");

  act(g, "system:setKdFinishTurnPan", { pan: "right" });

  assert.equal(g.state.kdFinishTurnPan, "right");

});



test("kd:start opens frame with 0/6 unrevealed and plays only ready; first kd:next reveals Q1 and cues open_question + bgm_1", () => {
  const g = game("O26", ["khoiDong"], 2);
  act(g, "game:start");
  act(g, "kd:start", {}, 1000);

  // 1. At kd:start:
  assert.equal(g.state.khoiDong!.started, true);
  assert.equal(g.state.khoiDong!.questionRevealed, false, "Question 1 remains hidden at kd:start");
  assert.equal(g.state.khoiDong!.qIdx, -1, "Counter stays at -1 (0/6) at kd:start");
  assert.equal(g.state.khoiDong!.current, null, "Question 1 content not loaded at kd:start");
  assert.equal(g.state.cue!.sound, "1_KhoiDong/ready", "Plays only ready");
  assert.notEqual(g.state.cue!.sound, "1_KhoiDong/open_question", "Strictly not open_question");
  assert.notEqual(g.state.cue!.sound, "1_KhoiDong/kd_bgm_1", "Strictly not kd_bgm_1");
  assert.equal(g.state.khoiDong!.startCooldownUntil, 1000 + 3500);
  assert.equal(Boolean(g.state.kdIntroTimer), true, "kdIntroTimer running for 3500ms");

  // 2. Reject kd:next during safety cooldown:
  const rejected = g.hostAction({ type: "kd:next" }, 2500);
  assert.equal(rejected.ok, false);
  assert.ok(rejected.error && rejected.error.includes("đồ hoạ mở xong"));

  // 3. At t = 4500ms, kdIntroTimer expires, cues open_question and unrolls lower-third (still at 0/6):
  g.tick(4500);
  assert.equal(g.state.kdIntroTimer, null, "kdIntroTimer expired");
  assert.equal(g.state.cue!.sound, "1_KhoiDong/open_question", "open_question cued at t=3.5s when lower third opens");
  assert.equal(g.state.khoiDong!.qIdx, -1, "still at 0/6");
  assert.equal(g.state.khoiDong!.questionRevealed, false, "still not revealed");

  // 4. First kd:next after cooldown reveals Q1 and starts BGM:
  const accepted = g.hostAction({ type: "kd:next" }, 4600);
  assert.equal(accepted.ok, true);
  assert.equal(g.state.khoiDong!.questionRevealed, true, "Q1 revealed");
  assert.equal(g.state.khoiDong!.qIdx, 0, "Counter advances to 0 (1/6)");
  assert.ok((g.state.khoiDong!.current as any)?.q, "Q1 content loaded");
  assert.equal(g.state.khoiDong!.currentBgmTrack, "kd_bgm_1");
  assert.equal(g.state.cue!.sound, "1_KhoiDong/kd_bgm_1", "BGM kd_bgm_1 started without duplicate open_question");
  assert.equal(g.state.cue!.kind, "bgm");
  assert.equal(g.state.khoiDong!.timer.startedAt, null, "Timer does not auto-start");

  // 4. Second kd:next moves to Question 2:
  const nextQ = g.hostAction({ type: "kd:next" }, 8000);
  assert.equal(nextQ.ok, true);
  assert.equal(g.state.khoiDong!.qIdx, 1, "Counter advances to 1 (2/6)");
});

test("Khởi động BGM formula (kd_bgm_1, kd_bgm_2, kd_bgm_3) exact transition across solo and shared turns", () => {
  // Test 1: N = 6 questions (Solo turn) -> halfCeil = 3, bgm1EndQ = 2.
  // Questions 1-2: bgm_1; Questions 3-5: bgm_2; Question 6: bgm_3.
  const g6 = game("O26", ["khoiDong"], 4);
  act(g6, "game:start");
  act(g6, "kd:start", {}, 1000);
  g6.tick(4500);
  // Reveal Q1 via first kd:next after 3.5s cooldown
  act(g6, "kd:next", {}, 4600);
  assert.equal(g6.state.khoiDong!.currentBgmTrack, "kd_bgm_1", "Q1 plays bgm_1");

  // Q2 (qIdx 1)
  act(g6, "kd:next", {}, 5000);
  assert.equal(g6.state.khoiDong!.qIdx, 1);
  assert.equal(g6.state.khoiDong!.currentBgmTrack, "kd_bgm_1", "Q2 still bgm_1");

  // Q3 (qIdx 2): transition to bgm_2
  act(g6, "kd:next", {}, 6000);
  assert.equal(g6.state.khoiDong!.qIdx, 2);
  assert.equal(g6.state.khoiDong!.currentBgmTrack, "kd_bgm_2", "Q3 transitions to bgm_2");

  // Q4 (qIdx 3)
  act(g6, "kd:next", {}, 7000);
  assert.equal(g6.state.khoiDong!.currentBgmTrack, "kd_bgm_2", "Q4 still bgm_2");

  // Q5 (qIdx 4 - áp chót)
  act(g6, "kd:next", {}, 8000);
  assert.equal(g6.state.khoiDong!.currentBgmTrack, "kd_bgm_2", "Q5 (áp chót) still bgm_2");

  // Q6 (qIdx 5 - cuối cùng): transition to bgm_3
  act(g6, "kd:next", {}, 9000);
  assert.equal(g6.state.khoiDong!.qIdx, 5);
  assert.equal(g6.state.khoiDong!.currentBgmTrack, "kd_bgm_3", "Q6 (cuối cùng) transitions to bgm_3");

  // Test 2: N = 15 questions (Shared turn with 5 seats: 5 * 3 = 15)
  // halfCeil = ceil(15 / 2) = 8, bgm1EndQ = 7.
  // Questions 1-7: bgm_1; Questions 8-14: bgm_2; Question 15: bgm_3.
  const g15 = game("O26", ["khoiDong"], 5);
  act(g15, "game:start");
  // Select shared segment (index 5 for 5 solo seats)
  act(g15, "kd:selectSegment", { kind: "shared" }, 1000);
  assert.equal(g15.state.khoiDong!.segments[g15.state.khoiDong!.segIdx].questions, 15);
  act(g15, "kd:start", {}, 2000);
  g15.tick(5500);
  // Reveal Q1 via first kd:next after 3.5s cooldown
  act(g15, "kd:next", {}, 6000);
  assert.equal(g15.state.khoiDong!.currentBgmTrack, "kd_bgm_1");

  // Advance to Q7 (qIdx 6): must still be bgm_1
  for (let q = 2; q <= 7; q++) {
    act(g15, "kd:next", {}, 6000 + q * 1000);
  }
  assert.equal(g15.state.khoiDong!.qIdx, 6, "At Question 7");
  assert.equal(g15.state.khoiDong!.currentBgmTrack, "kd_bgm_1", "Q7 is still bgm_1");

  // Q8 (qIdx 7): transitions to bgm_2
  act(g15, "kd:next", {}, 15000);
  assert.equal(g15.state.khoiDong!.qIdx, 7, "At Question 8");
  assert.equal(g15.state.khoiDong!.currentBgmTrack, "kd_bgm_2", "Q8 transitions to bgm_2");

  // Advance to Q14 (qIdx 13 - áp chót): must still be bgm_2
  for (let q = 9; q <= 14; q++) {
    act(g15, "kd:next", {}, 15000 + q * 1000);
  }
  assert.equal(g15.state.khoiDong!.qIdx, 13, "At Question 14");
  assert.equal(g15.state.khoiDong!.currentBgmTrack, "kd_bgm_2", "Q14 (áp chót) is still bgm_2");

  // Q15 (qIdx 14 - câu cuối cùng): transitions to bgm_3
  act(g15, "kd:next", {}, 32000);
  assert.equal(g15.state.khoiDong!.qIdx, 14, "At Question 15");
  assert.equal(g15.state.khoiDong!.currentBgmTrack, "kd_bgm_3", "Q15 (câu cuối cùng) transitions to bgm_3");
});



test("O13-O22: kd:next first click auto-starts 60s global clock and plays 60s bgm", () => {

  const g = game("O15", ["khoiDong"], 2);

  act(g, "game:start");

  act(g, "kd:start", {}, 1000);

  assert.equal(g.state.khoiDong!.started, true);

  assert.equal(g.state.cue!.sound, "1_KhoiDong/ready");



  // After 3.5s cooldown expires: only open_question plays, globalTimer NOT running yet

  g.tick(1000 + 3500);

  assert.equal(g.state.khoiDong!.phase, "question");

  assert.equal(g.state.cue!.sound, "1_KhoiDong/open_question");

  assert.equal(g.state.khoiDong!.globalTimer!.startedAt, null, "globalTimer must wait for first kd:next");



  // First kd:next click reveals question 1, AUTO-STARTS 60s timer and cues 60s audio!

  const accepted = g.hostAction({ type: "kd:next" }, 5000);

  assert.equal(accepted.ok, true);

  assert.equal(g.state.khoiDong!.questionRevealed, true);

  assert.equal(g.state.khoiDong!.globalTimer!.startedAt, 5000, "60s globalTimer auto-started");

  assert.equal(g.state.cue!.sound, "1_KhoiDong/60s");

  assert.equal(g.state.cue!.kind, "bgm");



  // Subsequent kd:next (question 2): globalTimer continues running uninterrupted

  act(g, "kd:correct", {}, 8000);

  act(g, "kd:next", {}, 9000);

  assert.equal(g.state.khoiDong!.qIdx, 1, "Moved to question 2");

  assert.equal(g.state.khoiDong!.globalTimer!.startedAt, 5000, "globalTimer continues running uninterrupted");

});




test("O13-O22: when 60s expires, current question is preserved, finish_turn is NOT played until manual Kết thúc lượt", () => {
  const g = game("O15", ["khoiDong"], 2);
  act(g, "game:start");
  act(g, "kd:start", {}, 1000);
  g.tick(4500);
  act(g, "kd:next", {}, 5000);

  assert.equal(g.state.khoiDong!.qIdx, 0);
  const qText = g.state.khoiDong!.current!.q;

  // Clock runs out at t = 65000
  g.tick(65000);
  assert.equal(g.state.khoiDong!.globalTimer!.remainingMs, 0);
  assert.equal(g.state.khoiDong!.globalTimer!.startedAt, null);
  // Current question and phase MUST be preserved:
  assert.equal(g.state.khoiDong!.phase, "question");
  assert.equal(g.state.khoiDong!.current!.q, qText);
  // finish_turn must NOT be cued yet:
  assert.notEqual(g.state.cue?.sound, "1_KhoiDong/finish_turn");

  // Host evaluates answer while timer is expired:
  act(g, "kd:correct", {}, 66000);
  assert.equal(g.state.seats[0].score, 10);
  assert.equal(g.state.khoiDong!.current!.q, qText);

  // Host clicks Kết thúc lượt (kd:finishTurn or kd:next):
  act(g, "kd:finishTurn", {}, 67000);
  assert.equal(g.state.cue!.sound, "1_KhoiDong/finish_turn");
  assert.equal(g.state.khoiDong!.segIdx, 1, "Immediately moves to next candidate");
  assert.equal(g.state.khoiDong!.phase, "intro");
  assert.equal(g.state.khoiDong!.started, false);
  assert.equal(g.state.khoiDong!.current, null);
});


test("OlympiaGame defaults to playing show_intro on room creation when playIntroOnCreate is true", () => {
  const gDefault = game("O26", ["khoiDong"], 4);
  assert.equal(gDefault.state.stage, "lobby");
  assert.equal(gDefault.state.cue?.sound, "6_NhacKhac/show_intro");
  assert.equal(gDefault.state.cue?.kind, "sound");

  const gDisabled = game("O26", ["khoiDong"], 4, { playIntroOnCreate: false });
  assert.equal(gDisabled.state.cue, null);
});

test("game:start cues 6_NhacKhac/contest_intro instead of show_intro", () => {
  const g = game("O21", ["khoiDong"], 4);
  g.joinSeat("TS1", "k1");
  const res = g.hostAction({ type: "game:start" }, 1000);
  assert.equal(res.ok, true);
  assert.equal(g.state.stage, "playing");
  assert.equal(g.state.cue?.sound, "6_NhacKhac/contest_intro");
  assert.equal(g.state.banner, null, "banner is null during intro canvas");
  assert.ok(g.state.introTimer != null, "introTimer active as canvas flag");
  assert.ok(g.state.introTimer!.totalMs >= 60_000, "intro stays until host manually starts a round (no auto-jump)");
  g.tick(1000 + 60_000);
  assert.ok(g.state.introTimer != null, "intro does NOT auto-expire into Khởi Động");
  assert.equal(g.state.banner, null, "no auto banner after waiting");
  act(g, "round:force", { round: "khoiDong" }, 70_000);
  assert.equal(g.state.introTimer, null, "intro cleared only when host starts the round");
  assert.equal(g.state.cue?.sound, "1_KhoiDong/start_round", "start_round cue fires so client crossfades intro music out");
});

test("KhoiDong TS2 timer and audio runs properly when question 1 is opened", () => {
  const g = game("O21", ["khoiDong"], 4);
  g.joinSeat("TS1", "k1");
  g.joinSeat("TS2", "k2");
  g.hostAction({ type: "game:start" }, 1000);
  g.hostAction({ type: "intro:skip" }, 2000); // vào khoiDong TS1
  
  // TS1 lượt thi chạy và kết thúc lượt
  g.hostAction({ type: "kd:start" }, 3000);
  g.hostAction({ type: "kd:next" }, 7000);
  assert.equal(g.state.khoiDong!.segIdx, 0);
  
  // Chuyển sang TS2
  g.hostAction({ type: "kd:selectSegment", seatId: 1 }, 8000);
  assert.equal(g.state.khoiDong!.segIdx, 1);
  assert.equal(g.state.khoiDong!.started, false);
  assert.equal(g.state.khoiDong!.globalTimer?.startedAt, null);
  
  // Bấm Bắt đầu ở TS2 -> started = true, cue ready
  g.hostAction({ type: "kd:start" }, 8500);
  assert.equal(g.state.khoiDong!.started, true);
  assert.equal(g.state.cue?.sound, "1_KhoiDong/ready");

  // Hết cooldown 3.5s -> bấm câu tiếp ở TS2 -> kích hoạt timer 60s và audio cue 60s!
  g.hostAction({ type: "kd:next" }, 12500);
  assert.equal(g.state.khoiDong!.questionRevealed, true);
  assert.equal(g.state.khoiDong!.globalTimer?.startedAt, 12500);
  assert.equal(g.state.cue?.sound, "1_KhoiDong/60s");
});


test("seat:setSchool assigns school name to seat", () => {
  const g = game("O21", ["khoiDong"], 4);
  g.joinSeat("Nguyễn An", "k1");
  const res = g.hostAction({ type: "seat:setSchool", seat: 0, school: "THPT Chuyên Hà Nội - Amsterdam" }, 1000);
  assert.equal(res.ok, true);
  assert.equal(g.state.seats[0].school, "THPT Chuyên Hà Nội - Amsterdam");
});

test("sequential contestant entrance: start, manual next, gesture assignment, and completion", () => {
  const g = game("O21", ["khoiDong"], 4, { seatCount: 4 });
  g.joinSeat("TS1", "k1");
  g.joinSeat("TS2", "k2");
  g.joinSeat("TS3", "k3");
  g.joinSeat("TS4", "k4");

  const resStart = g.hostAction({ type: "entrance:start" }, 1000);
  assert.equal(resStart.ok, true);
  assert.ok(g.state.entranceState != null);
  assert.equal(g.state.entranceState!.active, true);
  assert.equal(g.state.entranceState!.currentSeatIdx, 0);
  assert.equal(g.state.entranceState!.seatStartedAt, 1000);
  assert.equal(g.state.entranceState!.seatGestures?.length, 4);
  assert.equal(g.state.cue?.sound, "6_NhacKhac/contestant_intro");
  assert.equal(g.state.cue?.kind, "sound");

  const resNext1 = g.hostAction({ type: "entrance:next" }, 2500);
  assert.equal(resNext1.ok, true);
  assert.equal(g.state.entranceState!.currentSeatIdx, 1);
  assert.equal(g.state.entranceState!.seatStartedAt, 2500);

  g.hostAction({ type: "entrance:next" }, 3000);
  assert.equal(g.state.entranceState!.currentSeatIdx, 2);
  g.hostAction({ type: "entrance:next" }, 3500);
  assert.equal(g.state.entranceState!.currentSeatIdx, 3);

  const resFinish = g.hostAction({ type: "entrance:next" }, 4000);
  assert.equal(resFinish.ok, true);
  assert.equal(g.state.entranceState, null);
  assert.equal(g.state.cue?.kind, "stop");
});

test("sequential contestant entrance: auto-advances at 11500ms per contestant (1s pause + 9.5s walk/gesture + 1s spotlight)", () => {
  const g = game("O21", ["khoiDong"], 4, { seatCount: 4 });
  g.joinSeat("TS1", "k1");
  g.joinSeat("TS2", "k2");
  g.joinSeat("TS3", "k3");
  g.joinSeat("TS4", "k4");

  g.hostAction({ type: "entrance:start" }, 10000);
  assert.equal(g.state.entranceState!.currentSeatIdx, 0);

  g.tick(21499);
  assert.equal(g.state.entranceState!.currentSeatIdx, 0);

  g.tick(21500);
  assert.equal(g.state.entranceState!.currentSeatIdx, 1);
  assert.equal(g.state.entranceState!.seatStartedAt, 21500);

  g.tick(33000);
  assert.equal(g.state.entranceState!.currentSeatIdx, 2);

  g.tick(44500);
  assert.equal(g.state.entranceState!.currentSeatIdx, 3);

  g.tick(56000);
  assert.equal(g.state.entranceState, null);
  assert.equal(g.state.cue?.sound, "6_NhacKhac/contest_intro");
  assert.equal(g.state.cue?.kind, "stop");
});

test("sequential contestant entrance: skip immediately stops and clears entrance state", () => {
  const g = game("O21", ["khoiDong"], 4);
  g.joinSeat("TS1", "k1");
  g.hostAction({ type: "entrance:start" }, 5000);
  assert.ok(g.state.entranceState != null);

  const resSkip = g.hostAction({ type: "entrance:skip" }, 6000);
  assert.equal(resSkip.ok, true);
  assert.equal(g.state.entranceState, null);
  assert.equal(g.state.cue?.kind, "stop");
});


test("SAMPLE_QUESTION_SET & BAC_AI_QUESTION_SET: zero duplicate questions across all rounds", () => {
  const norm = (s?: string) => (s ?? "").toLowerCase().replace(/[\s.,?!'"():;—–-]+/g, "").trim();

  for (const [setName, qSet] of [["SAMPLE", SAMPLE_QUESTION_SET], ["BAC_AI", BAC_AI_QUESTION_SET]] as const) {
    const seenQs = new Map<string, string>();
    const allList: { round: string; q: string }[] = [];

    for (const [s, qList] of Object.entries(qSet.khoiDong.solo ?? {})) {
      for (const item of qList) allList.push({ round: `KD_solo_${s}`, q: item.q });
    }
    for (const item of qSet.khoiDong.shared ?? []) {
      allList.push({ round: "KD_shared", q: item.q });
    }
    for (const row of qSet.vcnv.rows ?? []) {
      allList.push({ round: "VCNV", q: row.hint ?? "" });
    }
    if (qSet.vcnv.centerQuestion) {
      allList.push({ round: "VCNV_center", q: qSet.vcnv.centerQuestion.q ?? "" });
    }
    for (const t of qSet.tangToc ?? []) {
      allList.push({ round: "TangToc", q: t.q ?? "" });
    }
    for (const [tier, qList] of Object.entries(qSet.veDich ?? {})) {
      for (const item of qList) allList.push({ round: `VeDich_${tier}`, q: item.q });
    }
    for (const item of qSet.cauHoiPhu ?? []) {
      allList.push({ round: "CauHoiPhu", q: item.q });
    }

    for (const item of allList) {
      const k = norm(item.q);
      if (!k) continue;
      if (seenQs.has(k)) {
        assert.fail(`[${setName}] Duplicate question found in ${item.round}: "${item.q}" (previously seen in ${seenQs.get(k)})`);
      }
      seenQs.set(k, item.round);
    }
  }
});

test("SAMPLE_QUESTION_SET & BAC_AI_QUESTION_SET: strictly zero repeated answers across all rounds", () => {
  const norm = (s?: string) => (s ?? "").toLowerCase().replace(/[\s.,?!'"():;—–-]+/g, "").trim();

  for (const [setName, qSet] of [["SAMPLE", SAMPLE_QUESTION_SET], ["BAC_AI", BAC_AI_QUESTION_SET]] as const) {
    const seenAns = new Map<string, { round: string; q: string; a: string }>();

    const check = (round: string, q: string, a?: string) => {
      const k = norm(a);
      if (!k) return;
      if (seenAns.has(k)) {
        const prev = seenAns.get(k)!;
        assert.fail(`[${setName}] Repeated answer "${a}" in ${round} ("${q}") - previously used in ${prev.round} ("${prev.q}")`);
      }
      seenAns.set(k, { round, q, a: a! });
    };

    for (const [s, qList] of Object.entries(qSet.khoiDong.solo ?? {})) {
      for (const item of qList) check(`KD_solo_${s}`, item.q, item.a);
    }
    for (const item of qSet.khoiDong.shared ?? []) {
      check("KD_shared", item.q, item.a);
    }
    for (const row of qSet.vcnv.rows ?? []) {
      check("VCNV", row.hint ?? "", row.answer);
    }
    if (qSet.vcnv.centerQuestion) {
      check("VCNV_center", qSet.vcnv.centerQuestion.q ?? "", qSet.vcnv.centerQuestion.a);
    }
    for (const t of qSet.tangToc ?? []) {
      check("TangToc", t.q ?? "", t.answer || (t as any).a);
    }
    for (const [tier, qList] of Object.entries(qSet.veDich ?? {})) {
      for (const item of qList) check(`VeDich_${tier}`, item.q, item.a);
    }
    for (const item of qSet.cauHoiPhu ?? []) {
      check("CauHoiPhu", item.q, item.a);
    }
  }
});

test("buildBalancedKhoiDongQueues: zero duplicate questions between contestants and shared queue", () => {
  const norm = (s?: string) => (s ?? "").toLowerCase().replace(/[\s.,?!'"():;—–-]+/g, "").trim();
  const seats = [0, 1, 2, 3];
  const balanced = buildBalancedKhoiDongQueues(SAMPLE_QUESTION_SET.khoiDong, seats, 10);

  const seatSeen = new Map<string, number>();
  for (const seatId of seats) {
    const queue = balanced.seatQueues[seatId] ?? [];
    for (const q of queue) {
      const k = norm(q.q);
      if (seatSeen.has(k)) {
        assert.fail(`Question "${q.q}" assigned to seat ${seatId} was already assigned to seat ${seatSeen.get(k)}`);
      }
      seatSeen.set(k, seatId);
    }
  }

  // Ensure sharedQueue does NOT contain any question from the solo seats
  for (const q of balanced.sharedQueue ?? []) {
    const k = norm(q.q);
    if (seatSeen.has(k)) {
      assert.fail(`Shared question "${q.q}" was already asked in solo seat ${seatSeen.get(k)}`);
    }
  }
});

test("Olympia match simulation: Về Đích packages never duplicate questions from earlier rounds", () => {
  const norm = (s?: string) => (s ?? "").toLowerCase().replace(/[\s.,?!'"():;—–-]+/g, "").trim();
  const g = game("O26", ["khoiDong", "vcnv", "tangToc", "veDich"], 4, {
    questionSet: SAMPLE_QUESTION_SET,
    balancedRandom: true,
  });

  g.joinSeat("TS1", "k1");
  g.joinSeat("TS2", "k2");
  g.joinSeat("TS3", "k3");
  g.joinSeat("TS4", "k4");

  // Start game and advance to Về Đích
  act(g, "game:start");
  act(g, "round:force", { round: "veDich" });
  const st = g.state;
  assert.equal(st.currentRound, "veDich");

  // Contestant 1 picks [20, 20, 30]
  act(g, "vd:choosePackage", { points: [20, 20, 30] });
  const pkg1 = st.veDich!.packages[0] ?? [];
  assert.equal(pkg1.length, 3);

  // Contestant 2 picks [20, 30, 30]
  st.veDich!.turnIdx = 1;
  st.veDich!.phase = "choosing";
  act(g, "vd:choosePackage", { points: [20, 30, 30] });
  const pkg2 = st.veDich!.packages[1] ?? [];
  assert.equal(pkg2.length, 3);

  // Collect all questions from earlier rounds
  const earlierQuestions = new Set<string>();
  for (const qList of Object.values(st.khoiDong?.seatQueues ?? {})) {
    for (const item of qList) if (item?.q) earlierQuestions.add(norm(item.q));
  }
  for (const item of st.khoiDong?.sharedQueue ?? []) {
    if (item?.q) earlierQuestions.add(norm(item.q));
  }
  for (const r of SAMPLE_QUESTION_SET.vcnv.rows ?? []) {
    if (r.hint) earlierQuestions.add(norm(r.hint));
  }
  for (const t of SAMPLE_QUESTION_SET.tangToc ?? []) {
    if (t.q) earlierQuestions.add(norm(t.q));
  }

  // Assert no package question duplicates earlier questions or each other
  const chosenInVd = new Set<string>();
  for (const item of [...pkg1, ...pkg2]) {
    const k = norm(item.q.q);
    assert.ok(!earlierQuestions.has(k), `Về Đích question "${item.q.q}" duplicated an earlier round question!`);
    assert.ok(!chosenInVd.has(k), `Về Đích question "${item.q.q}" duplicated across contestant packages!`);
    chosenInVd.add(k);
  }
});

console.log(`${passed} tests passed`);



test("VCNV: only accepts alternate answer if it is a valid synonym AND matches exact character length of primary keyword", () => {
  const g = game("O26", ["vcnv"], 4);
  g.joinSeat("TS1", "k1");
  g.joinSeat("TS2", "k2");
  g.joinSeat("TS3", "k3");
  g.joinSeat("TS4", "k4");
  g.hostAction({ type: "game:start" }, 1000);
  g.hostAction({ type: "round:force", round: "vcnv" }, 2000);

  // Set row 0 answer to "NẠP XẢ" with alternates "SẠC XẢ" (5 chars) and "TÍCH XẢ" (6 chars)
  // "NẠP XẢ" has 5 characters (excluding space).
  g.state.vcnv!.rows[0].answer = "NẠP XẢ";
  g.state.vcnv!.rows[0].acceptedAnswers = ["SẠC XẢ", "TÍCH XẢ"];

  g.hostAction({ type: "vcnv:selectRow", row: 0 }, 3000);
  g.hostAction({ type: "vcnv:openQuestion" }, 4000);
  g.hostAction({ type: "vcnv:timer" }, 4500);

  // Seat 0 submits primary answer "Nạp xả" (5 chars) -> CORRECT
  g.playerAnswer(0, "Nạp xả", 5000);
  // Seat 1 submits synonym "Sạc xả" (5 chars, exact length match) -> CORRECT
  g.playerAnswer(1, "Sạc xả", 5100);
  // Seat 2 submits alternate "Tích xả" (6 chars, length mismatch 6 != 5) -> WRONG
  g.playerAnswer(2, "Tích xả", 5200);
  // Seat 3 submits random word "Xả" (2 chars) -> WRONG
  g.playerAnswer(3, "Xả", 5300);

  const initialScoreTS1 = g.state.seats[0].score;
  const initialScoreTS2 = g.state.seats[1].score;
  const initialScoreTS3 = g.state.seats[2].score;
  const initialScoreTS4 = g.state.seats[3].score;

  // Reveal answers & grade the question
  g.hostAction({ type: "vcnv:reveal" }, 5500);
  const res = g.hostAction({ type: "vcnv:correct" }, 6000);
  assert.equal(res.ok, true);

  // TS1 and TS2 should get +10 points (rowPoints)
  assert.equal(g.state.seats[0].score, initialScoreTS1 + 10);
  assert.equal(g.state.seats[1].score, initialScoreTS2 + 10);
  // TS3 and TS4 should get 0 points
  assert.equal(g.state.seats[2].score, initialScoreTS3);
  assert.equal(g.state.seats[3].score, initialScoreTS4);

  // Verify row results contains exactly TS1 and TS2 (ids 0 and 1)
  assert.deepEqual(g.state.vcnv!.rowResults[0], [0, 1]);
});

test("VCNV selecting, openQuestion, blank, auto-grid on correct/wrong & Summary lifecycle", () => {
  const g = game("O26", ["vcnv"], 4);
  act(g, "game:start");

  // 1. Select row -> phase is selecting, hint is hidden from display & player
  act(g, "vcnv:selectRow", { row: 1 });
  assert.equal(g.state.vcnv!.phase, "selecting");
  assert.equal(g.view("display").vcnv!.rows[1].hint, "");
  assert.equal(g.view("player", 0).vcnv!.rows[1].hint, "");
  assert.ok(g.view("host").vcnv!.rows[1].hint.length > 0, "host can read hint");

  // 2. Open question -> phase is question, hint is revealed
  act(g, "vcnv:openQuestion");
  assert.equal(g.state.vcnv!.phase, "question");
  assert.ok(g.view("display").vcnv!.rows[1].hint.length > 0);
  assert.ok(g.view("player", 0).vcnv!.rows[1].hint.length > 0);

  // 3. Blank -> sets waitingAnswer camera to 10
  act(g, "vcnv:blank");
  assert.equal(g.state.vcnv!.phase, "waitingAnswer");
  assert.equal(g.state.studioCamera, 10);

  // 4. Timer starts -> phase is question
  act(g, "vcnv:timer", {}, 1000);
  assert.equal(g.state.vcnv!.phase, "question");

  // Player answers: verify display role gets redacted answer text ('•') but preserves presence for answer badges
  g.playerAnswer(0, SAMPLE_QUESTION_SET.vcnv.rows[1].answer, 2000);
  const dispBeforeReveal = g.view("display");
  assert.ok(dispBeforeReveal.vcnv!.answers[0]);
  assert.equal(dispBeforeReveal.vcnv!.answers[0].text, "•"); // redacted from screen viewers before reveal
  assert.equal(dispBeforeReveal.vcnv!.answers[0].at, 2000); // timestamp preserved for chronological ordering

  act(g, "vcnv:reveal", {}, 3000);
  act(g, "vcnv:correct", {}, 4000);
  assert.equal(g.state.vcnv!.phase, "grid");
  assert.equal(g.state.vcnv!.rows[1].opened, true);
  // Piece is NOT revealed on row points (user requirement: "khi nhấn cộng điểm hàng ngang, miếng ghép cũng không được mở ngay")
  assert.equal(g.state.vcnv!.piecesRevealed[1], false);

  // MC clicks revealTile -> piece is revealed
  act(g, "vcnv:revealTile", { row: 1 });
  assert.equal(g.state.vcnv!.piecesRevealed[1], true);
  assert.equal(g.state.cue?.sound, "2_VuotChuongNgaiVat/reveal_puzzle_piece");

  // Mở Toàn Bộ CNV -> all pieces and rows opened, sound played
  act(g, "vcnv:revealAll");
  assert.equal(g.state.vcnv!.phase, "done");
  assert.deepEqual(g.state.vcnv!.piecesRevealed, [true, true, true, true, true]);
  assert.equal(g.state.cue?.sound, "2_VuotChuongNgaiVat/cnv_correct");

  // 5. Test setQuestionSet with BAC_AI_QUESTION_SET
  g.setQuestionSet(BAC_AI_QUESTION_SET);
  assert.equal(g.state.vcnv!.keyword, "ẮC QUY NƯỚC");

  // 6. Test Summary Lifecycle
  // Setup scores: TS1: 50, TS2: 20, TS3: 80, TS4: 20
  g.state.seats[0].score = 50;
  g.state.seats[1].score = 20;
  g.state.seats[2].score = 80;
  g.state.seats[3].score = 20;

  act(g, "summary:start", { isAuto: true }, 10000);
  const sm = g.state.summaryState!;
  assert.ok(sm.active);
  // Lowest to highest, tie-break by seatId: TS2 (id 1, 20đ), TS4 (id 3, 20đ), TS1 (id 0, 50đ), TS3 (id 2, 80đ)
  assert.deepEqual(sm.orderedSeats, [1, 3, 0, 2]);
  assert.equal(sm.currentIndex, 0);
  assert.equal(g.state.studioCamera, 5 + 1); // CAM 6 for TS2

  // Advance 3.5s on tick -> TS4
  g.tick(13500);
  assert.equal(g.state.summaryState!.currentIndex, 1);
  assert.equal(g.state.studioCamera, 5 + 3); // CAM 8 for TS4

  // Advance 3.5s on tick -> TS1
  g.tick(17000);
  assert.equal(g.state.summaryState!.currentIndex, 2);
  assert.equal(g.state.studioCamera, 5 + 0); // CAM 5 for TS1

  // Advance 3.5s on tick -> TS3 (leader)
  g.tick(20500);
  assert.equal(g.state.summaryState!.currentIndex, 3);
  assert.equal(g.state.studioCamera, 5 + 2); // CAM 7 for TS3

  // Advance 3.5s on tick -> Concludes summary, returns to CAM 10 and stops BGM
  g.tick(24000);
  assert.equal(g.state.summaryState?.active, false);
  assert.equal(g.state.studioCamera, 10);
  assert.equal(g.state.cue?.sound, "");

  // 7. Test Tang Toc blank, redaction, and grading
  const gTT = game("O26", ["tangToc"], 4);
  act(gTT, "game:start");
  act(gTT, "tt:selectQuestion", { qIdx: 0 });
  act(gTT, "tt:show");
  assert.equal(gTT.state.tangToc!.phase, "question");
  act(gTT, "tt:timer", {}, 1000);
  gTT.playerAnswer(0, "HÀ NỘI", 2000);

  // Display view during question has redacted answer
  const ttDisp = gTT.view("display");
  assert.ok(ttDisp.tangToc!.submissions[0]);
  assert.equal(ttDisp.tangToc!.submissions[0].answer, "•");

  // tt:blank sets waitingAnswer without playing blank_space
  act(gTT, "tt:blank");
  assert.equal(gTT.state.tangToc!.phase, "waitingAnswer");
  assert.equal(gTT.state.studioCamera, 10);

  // Reveal ranking
  act(gTT, "tt:reveal");
  assert.equal(gTT.state.tangToc!.phase, "ranking");

  // Grade: awards points and sets phase to graded
  act(gTT, "tt:grade");
  assert.equal(gTT.state.tangToc!.phase, "graded");
});

test("VCNV immediate self-lock on bell press, manual per-seat unlock, letterCount preservation & bellTestMode", () => {
  const g = game("O26", ["vcnv"], 4);
  act(g, "game:start");

  // 1. Verify exact letterCount and keywordLength are preserved in display view even when answers are hidden
  const disp = g.view("display");
  assert.equal(disp.vcnv!.keywordLength, SAMPLE_QUESTION_SET.vcnv.answer.replace(/\s+/g, "").length);
  SAMPLE_QUESTION_SET.vcnv.rows.forEach((r, idx) => {
    assert.equal(disp.vcnv!.rows[idx].letterCount, r.answer.replace(/\s+/g, "").length);
    assert.equal(disp.vcnv!.rows[idx].answer, "");
  });

  // 2. Test bellTestMode: buzzing in test mode records test logs without locking VCNV seat
  act(g, "bell:toggleTest");
  assert.equal(g.state.bellTestMode, true);
  assert.ok(g.playerBuzz(2, 1000).ok);
  assert.equal(g.state.bellTestLogs?.length, 1);
  assert.equal(g.state.bellTestLogs![0].seat, 2);
  assert.deepEqual(g.state.vcnv!.eliminatedSeats, [], "Test buzz does NOT lock contestant in VCNV");
  act(g, "bell:clearTest");
  assert.equal(g.state.bellTestLogs?.length, 0);
  act(g, "bell:toggleTest");
  assert.equal(g.state.bellTestMode, false);

  // 3. Real VCNV bell press places contestant into v.bells (locking buzzer and row typing)
  assert.ok(g.playerBuzz(1, 2000).ok);
  assert.equal(g.state.vcnv!.bells[0].seat, 1);
  // Seat 1 cannot submit row answers while having buzzed
  act(g, "vcnv:selectRow", { row: 0 });
  act(g, "vcnv:timer", {}, 2500);
  assert.equal(g.playerAnswer(1, "ABC", 3000).ok, false, "Seat with bell cannot submit row answers");

  // 4. Wrong CNV plays wrong sound, keeps bell in v.bells with judgedWrong flag
  act(g, "vcnv:wrongCNV", {}, 3500);
  assert.equal(g.state.cue?.sound, "2_VuotChuongNgaiVat/cnv_wrong");
  assert.equal(g.state.vcnv!.bells.length, 1);
  assert.equal((g.state.vcnv!.bells[0] as any).judgedWrong, true);
  assert.deepEqual(g.state.vcnv!.eliminatedSeats, [], "Not eliminated until bells are cleared");

  // 5. Host clears bells: now seat 1 is officially eliminated
  // Safety verification: cannot clear if unjudged, but succeeds once judged wrong
  assert.equal((g.state.vcnv!.bells[0] as any).judgedWrong, true);
  act(g, "vcnv:clearBells");
  assert.equal(g.state.vcnv!.bells.length, 0);
  assert.deepEqual(g.state.vcnv!.eliminatedSeats, [1], "Seat 1 eliminated upon clearBells");

  // Verify unjudged clear fails on fresh game
  const gUnjudged = game("O26", ["vcnv"], 4);
  act(gUnjudged, "game:start");
  gUnjudged.playerBuzz(0, 1000);
  assert.equal(gUnjudged.hostAction({ type: "vcnv:clearBells" }, 1000).ok, false, "Cannot clear bells before judging");
  act(gUnjudged, "vcnv:clearBells", { force: true });

  // 6. MC manually unlocks seat 1 via vcnv:toggleLockSeat
  act(g, "vcnv:toggleLockSeat", { seat: 1 }, 3600);
  assert.deepEqual(g.state.vcnv!.eliminatedSeats, [], "Seat 1 unlocked manually by MC");
  assert.equal(g.playerAnswer(1, "ABC", 3700).ok, true, "Unlocked seat 1 can now submit row answers again");
});

test("Khởi động end-of-segment and end-of-round immediately turns off question graphic (started=false, questionRevealed=false)", () => {
  const g = game("O26", ["khoiDong"], 2);
  act(g, "game:start");
  // Jump to Shared segment (index 2 for 2 seats)
  act(g, "kd:selectSegment", { kind: "shared" }, 1000);
  act(g, "kd:start", {}, 1000);
  g.tick(5000);
  act(g, "kd:next", {}, 5100);
  assert.equal(g.state.khoiDong!.started, true);
  assert.equal(g.state.khoiDong!.questionRevealed, true);

  // Finish the shared turn (last segment of Khởi Động)
  act(g, "kd:finishTurn", {}, 6000);
  assert.equal(g.state.khoiDong!.phase, "segmentDone");
  assert.equal(g.state.khoiDong!.started, false, "kd.started must be false when round/segment finishes");
  assert.equal(g.state.khoiDong!.questionRevealed, false, "kd.questionRevealed must be false when round/segment finishes");
  assert.equal(g.state.khoiDong!.current, null);
  assert.equal(g.state.khoiDong!.buzzedSeat, null, "kd.buzzedSeat must be cleared when turn finishes");
  assert.equal(g.state.roundStatus.khoiDong, "done");
});

test("VCNV CNV grading strictly requires active bell signal and rejects cleared bells", () => {
  const g = game("O26", ["vcnv"], 4);
  act(g, "game:start");

  // Seat 2 has NOT buzzed -> cannot be graded for CNV
  const noBellRes = g.hostAction({ type: "vcnv:correctCNV", seat: 2 }, 1000);
  assert.equal(noBellRes.ok, false, "Seat without bell cannot be graded for CNV");

  // Seat 0 and Seat 1 buzz for CNV
  assert.ok(g.playerBuzz(0, 1500).ok);
  assert.ok(g.playerBuzz(1, 1600).ok);
  assert.equal(g.state.vcnv!.bells.length, 2);

  // Host marks seat 0 as wrong first (so bell is judged)
  act(g, "vcnv:wrongCNV", { seat: 0 }, 1650);

  // Host clears all CNV bells via vcnv:clearBells
  act(g, "vcnv:clearBells", {}, 1700);
  assert.equal(g.state.vcnv!.bells.length, 0, "vcnv:clearBells clears ALL bells at once");

  // Seat 0 had bell cleared -> cannot be graded for CNV anymore
  const clearedRes = g.hostAction({ type: "vcnv:correctCNV", seat: 0 }, 1800);
  assert.equal(clearedRes.ok, false, "Seat whose bell was cleared cannot receive CNV points");
});

test("Khởi động: không bao giờ lặp câu hỏi khi vượt quá hàng đợi riêng (câu 13, 14, 15... )", () => {
  const g = game("O20", ["khoiDong"], 2);
  act(g, "game:start");
  const seen = new Set<string>();
  const norm = (s: string) => s.toLowerCase().replace(/[\s.,?!'"():;—–-]+/g, "");
  for (let i = 0; i < 30; i++) {
    act(g, "kd:next");
    const cur = g.state.khoiDong!.current;
    assert.ok(cur, `question ${i + 1} exists`);
    const key = norm(cur!.q);
    assert.ok(!seen.has(key), `câu ${i + 1} bị trùng: ${cur!.q}`);
    seen.add(key);
    act(g, "kd:correct");
  }
});

test("Câu hỏi phụ: ưu tiên câu chưa mở ở các vòng trước, không lặp câu Khởi Động / Về Đích đã mở", () => {
  const g = game("O26", ["khoiDong", "veDich"], 2);
  act(g, "game:start");
  const kdQ = g.state.khoiDong!;
  act(g, "kd:next", {}, 1000);
  const openedText = kdQ.current!.q;
  // Ép một câu CHP trùng nội dung với câu KD đã mở và kiểm tra nó bị đẩy xuống cuối
  const chpPool = g.config.questionSet.cauHoiPhu;
  const dup = { q: openedText, a: kdQ.current!.a };
  const backup = [...chpPool];
  chpPool.unshift(dup as any);
  try {
    g.state.seats[0].score = 50;
    g.state.seats[1].score = 50;
    act(g, "round:force", { round: "cauHoiPhu" }, 2000);
    const first = g.state.cauHoiPhu!.questions[0];
    assert.notEqual(first.q, openedText, "CHP không mở đầu bằng câu đã hỏi ở vòng Khởi Động");
  } finally {
    chpPool.splice(0, chpPool.length, ...backup);
  }
});

test("Tính chính danh: requestSeat, seat:approve, seat:reject và seat:swap", () => {
  const cfg: OlympiaConfig = { rulesetId: "O26", rounds: ["khoiDong"], questionSet: SAMPLE_QUESTION_SET, seatCount: 4 };
  const g = new OlympiaGame("AUTH_TEST", cfg, 0);

  // 1. Thí sinh đăng ký Vị trí 2 (idx = 1)
  const req1 = g.requestSeat("Nguyễn Văn A", 1, "token_a", "THPT Chuyên");
  assert.equal(req1.ok, true);
  assert.equal(req1.status, "pending");
  assert.equal(g.state.seats[1].name, "Nguyễn Văn A");
  assert.equal(g.state.seats[1].approved, false);
  assert.equal(g.state.joinRequests?.length, 1);

  // 2. Host phê duyệt Thí sinh A
  const apr1 = g.hostAction({ type: "seat:approve", seatId: 1 }, 100);
  assert.equal(apr1.ok, true);
  assert.equal(g.state.seats[1].approved, true);
  assert.equal(g.state.joinRequests?.length, 0);

  // 3. Thí sinh B đăng ký Vị trí 3 (idx = 2) rồi bị từ chối
  const req2 = g.requestSeat("Trần Thị B", 2, "token_b");
  assert.equal(req2.ok, true);
  assert.equal(g.state.seats[2].approved, false);
  const rej = g.hostAction({ type: "seat:reject", seatId: 2 }, 200);
  assert.equal(rej.ok, true);
  assert.equal(g.state.seats[2].name, "");
  assert.equal(g.state.seats[2].playerKey, null);

  // 4. Thí sinh C đăng ký và được duyệt vào Vị trí 1 (idx = 0)
  g.requestSeat("Lê Văn C", 0, "token_c");
  g.hostAction({ type: "seat:approve", seatId: 0 }, 300);
  assert.equal(g.state.seats[0].name, "Lê Văn C");
  assert.equal(g.state.seats[0].approved, true);

  // 5. Host hoán đổi vị trí giữa Ghế 0 và Ghế 1
  g.state.seats[0].score = 10;
  g.state.seats[1].score = 50;
  const swp = g.hostAction({ type: "seat:swap", seatA: 0, seatB: 1 }, 400);
  assert.equal(swp.ok, true);
  assert.equal(g.state.seats[0].name, "Nguyễn Văn A");
  assert.equal(g.state.seats[0].score, 50);
  assert.equal(g.state.seats[1].name, "Lê Văn C");
  assert.equal(g.state.seats[1].score, 10);
});

test("Bắt đầu trận đấu: Chặn khi <= 1 thí sinh, cho phép khi >= 2 thí sinh", () => {
  const cfg: OlympiaConfig = { rulesetId: "O26", rounds: ["khoiDong"], questionSet: SAMPLE_QUESTION_SET, seatCount: 4 };
  const g = new OlympiaGame("START_TEST", cfg, 0);

  // Chưa có ai duyệt
  const r0 = g.hostAction({ type: "game:start" }, 0);
  assert.equal(r0.ok, false);
  assert.ok(r0.error?.includes("tối thiểu 2 thí sinh"));

  // Chỉ 1 người được duyệt
  g.requestSeat("Thí sinh 1", 0, "token_1");
  g.hostAction({ type: "seat:approve", seatId: 0 }, 100);
  const r1 = g.hostAction({ type: "game:start" }, 200);
  assert.equal(r1.ok, false);
  assert.ok(r1.error?.includes("tối thiểu 2 thí sinh"));

  // Người thứ 2 được duyệt -> Đủ điều kiện bắt đầu (>= 2)
  g.requestSeat("Thí sinh 2", 1, "token_2");
  g.hostAction({ type: "seat:approve", seatId: 1 }, 300);
  const r2 = g.hostAction({ type: "game:start" }, 400);
  assert.equal(r2.ok, true);
  assert.equal(g.state.stage, "playing");
});

test("Thí sinh reconnect khi trận đấu đang diễn ra: Không bị out hay báo lỗi 'Trận đấu đã bắt đầu'", () => {
  const cfg: OlympiaConfig = { rulesetId: "O26", rounds: ["khoiDong"], questionSet: SAMPLE_QUESTION_SET, seatCount: 4 };
  const g = new OlympiaGame("RECONNECT_TEST", cfg, 0);

  g.requestSeat("Nguyễn An", 0, "token_an");
  g.hostAction({ type: "seat:approve", seatId: 0 }, 100);
  g.requestSeat("Trần Bình", 1, "token_binh");
  g.hostAction({ type: "seat:approve", seatId: 1 }, 200);

  // Bắt đầu trận đấu
  const startRes = g.hostAction({ type: "game:start" }, 300);
  assert.equal(startRes.ok, true);
  assert.equal(g.state.stage, "playing");

  // Giả lập Nguyễn An rớt mạng chớp nhoáng và socket kết nối lại với cùng token
  const reconnectRes = g.requestSeat("Nguyễn An", 0, "token_an");
  assert.equal(reconnectRes.ok, true, "Reconnect với token cũ phải thành công khi đang đấu");
  assert.equal(reconnectRes.status, "approved");
  assert.equal(g.state.seats[0].connected, true);

  // Giả lập bot sandbox reconnect
  const sbPrefix = `sandbox_${g.state.code}_seat_2`;
  const sandboxRes = g.requestSeat("Bot Sandbox", 2, sbPrefix);
  assert.equal(sandboxRes.ok, true, "Sandbox reconnect phải thành công khi đang đấu");

  // Thí sinh lạ cố đăng ký vị trí mới khi trận đấu đã bắt đầu -> Phải bị chặn
  const strangerRes = g.requestSeat("Người Lạ", 3, "token_stranger");
  assert.equal(strangerRes.ok, false);
  assert.ok(strangerRes.error?.includes("Trận đấu đã bắt đầu"));
});

test("Audio lifecycle invariants: pending cue nullification on stop and protected pause state", () => {
  // Simulate AudioContext and pendingCue lifecycle
  let pendingCue: (() => void) | null = null;
  let isAudioUnlocked = false;
  let isBgmPausedExplicitly = false;
  let bgmPaused = false;
  let bgmVolume = 0;
  let bgmPlayCount = 0;

  const mockBgm = {
    play: () => {
      bgmPlayCount++;
      bgmPaused = false;
      return Promise.resolve();
    },
    pause: () => {
      bgmPaused = true;
    },
    volume: 0,
  };

  const pauseBgm = () => {
    isBgmPausedExplicitly = true;
    mockBgm.pause();
  };

  const resumeBgm = () => {
    isBgmPausedExplicitly = false;
    mockBgm.play();
  };

  const killAllBgm = () => {
    pendingCue = null;
    isBgmPausedExplicitly = false;
    mockBgm.pause();
  };

  const unlockAudio = () => {
    if (!isAudioUnlocked) {
      isAudioUnlocked = true;
      if (bgmPaused && !isBgmPausedExplicitly) {
        if (mockBgm.volume === 0) mockBgm.volume = 0.85;
        mockBgm.play();
      }
    }
    if (pendingCue) {
      const p = pendingCue;
      pendingCue = null;
      p();
    }
  };

  // 1. Initial cue blocked by autoplay
  let sfxPlayed = false;
  pendingCue = () => { sfxPlayed = true; };
  bgmPaused = true;

  // 2. Stop cue arrives BEFORE user interacts
  killAllBgm();
  assert.equal(pendingCue, null, "killAllBgm must clear pendingCue so canceled cue doesn't fire");

  // 3. User interacts later
  unlockAudio();
  assert.equal(isAudioUnlocked, true);
  assert.equal(sfxPlayed, false, "Canceled SFX must NOT play upon user interaction");

  // 4. Test explicit pause protection: bell ring pauses BGM
  mockBgm.play();
  assert.equal(bgmPaused, false);
  pauseBgm();
  assert.equal(bgmPaused, true);
  assert.equal(isBgmPausedExplicitly, true);

  // User clicks on page (e.g. host clicks buzzer or button) -> unlockAudio fires
  unlockAudio();
  assert.equal(bgmPaused, true, "unlockAudio must NOT unpause explicitly paused BGM");

  // Host resumes BGM
  resumeBgm();
  assert.equal(bgmPaused, false);
  assert.equal(isBgmPausedExplicitly, false);
});





