// Run: npm run test:olympia   (bundles with esbuild, runs with node:assert)

import assert from "node:assert/strict";

import { OlympiaGame } from "./engine";

import { RULESETS, cnvPointsFor, tangTocTierPoints } from "./rulesets";

import { SAMPLE_QUESTION_SET } from "./sample-questions";

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

  act(g13, "vcnv:correctCNV", { seat: 1 });

  assert.equal(g13.state.seats[1].score, 20, "O13 post-center CNV = 20 pts");



  const g14 = game("O14", ["vcnv"], 2);

  act(g14, "game:start");

  act(g14, "vcnv:selectRow", { row: 4 });

  act(g14, "vcnv:revealTile");

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



  // Admin grades wrong -> timer stops, score -5, phase result, buzzer does NOT re-buzz

  act(g, "kd:wrong", {}, 2500);

  assert.equal(g.state.seats[1].score, -5);

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

  act(g, "vcnv:wrongCNV", { seat: 1 });

  assert.deepEqual(g.state.vcnv!.eliminatedSeats, [1]);

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

  act(g, "vd:openSteal", {}, 0); // star deducts 30

  assert.equal(g.state.seats[0].score, -10);

  assert.ok(g.playerBuzz(1, 100).ok);

  act(g, "vd:correctSteal");

  assert.equal(g.state.seats[1].score, 30);

  assert.equal(g.state.seats[0].score, -10, "owner not deducted twice");

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

  act(g, "kd:wrong", {}, 3200);

  assert.equal(g.state.seats[0].score, -5, "Q3 deducts 5 points on wrong answer");

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





test("score:set manually sets candidate score directly", () => {

  const g = game("O26", ["khoiDong"], 2);

  act(g, "game:start");

  assert.equal(g.state.seats[0].score, 0);

  act(g, "score:set", { seat: 0, score: 75 });

  assert.equal(g.state.seats[0].score, 75);

  act(g, "score:set", { seat: 1, score: -20 });

  assert.equal(g.state.seats[1].score, -20);

});



test("system:setKdFinishTurnPan updates stereo panning for finish_turn sound", () => {

  const g = game("O26", ["khoiDong"], 2);

  act(g, "system:setKdFinishTurnPan", { pan: "left" });

  assert.equal(g.state.kdFinishTurnPan, "left");

  act(g, "system:setKdFinishTurnPan", { pan: "right" });

  assert.equal(g.state.kdFinishTurnPan, "right");

});



test("kd:start plays ready, sets 3.5s cooldown, and kd:next respects cooldown", () => {

  const g = game("O26", ["khoiDong"], 2);

  act(g, "game:start");

  act(g, "kd:start", {}, 1000);

  assert.equal(g.state.khoiDong!.started, true);

  assert.equal(g.state.khoiDong!.startCooldownUntil, 1000 + 3500);

  assert.equal(g.state.cue!.sound, "1_KhoiDong/ready");



  // Attempting kd:next during 3.5s cooldown should fail

  const rejected = g.hostAction({ type: "kd:next" }, 2000);

  assert.equal(rejected.ok, false);

  assert.ok(rejected.error && rejected.error.includes("3.5s"));



  // After 3.5s cooldown expires, tick opens graphics and plays open_question (BGM not yet!)

  g.tick(1000 + 3500);

  assert.equal(g.state.khoiDong!.phase, "question");

  assert.equal(g.state.cue!.sound, "1_KhoiDong/open_question");



  // When host clicks kd:next for the first time (transitioning from empty/question 0 to question 1):

  // questionRevealed becomes true AND kd_bgm_1 starts playing!

  const accepted = g.hostAction({ type: "kd:next" }, 5000);

  assert.equal(accepted.ok, true);

  assert.equal(g.state.khoiDong!.questionRevealed, true);

  assert.equal(g.state.cue!.sound, "1_KhoiDong/kd_bgm_1");

  assert.equal(g.state.cue!.kind, "bgm");

  assert.equal(g.state.khoiDong!.timer.startedAt, null, "5s timer not started automatically on next");

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
  assert.equal(g.state.introTimer!.totalMs, 86400000, "introTimer is 24h (effectively infinite)");
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

console.log(`${passed} tests passed`);

