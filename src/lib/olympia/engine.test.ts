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

function game(rulesetId: RulesetId, rounds: RoundId[], players: number) {
  const cfg: OlympiaConfig = { rulesetId, rounds, questionSet: SAMPLE_QUESTION_SET };
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

test("CNV points per season (original app values)", () => {
  const o = (s: RulesetId) => [1, 2, 3, 4, 5].map((n) => cnvPointsFor(RULESETS[s], n));
  assert.deepEqual(o("O26"), [60, 50, 40, 30, 20]);
  assert.deepEqual(o("O23"), [50, 40, 30, 20, 10]);
  assert.deepEqual(o("O22"), [80, 60, 40, 20, 10]);
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

test("Khởi Động shared: buzz, wrong gives -5 (O26), others may re-buzz", () => {
  const g = game("O26", ["khoiDong"], 2);
  act(g, "game:start");
  // finish both solo segments quickly
  for (let seg = 0; seg < 2; seg++) {
    act(g, "kd:next");
    for (let i = 0; i < 5; i++) act(g, "kd:skip"), act(g, "kd:next");
    act(g, "kd:skip");
    act(g, "kd:next"); // -> segmentDone
    act(g, "kd:next"); // -> next segment
  }
  assert.equal(g.state.khoiDong!.segments[g.state.khoiDong!.segIdx].kind, "shared");
  act(g, "kd:next");
  act(g, "kd:next");
  assert.equal(g.state.khoiDong!.segments[2].questions, 6); // 2 players * 3
  act(g, "kd:timer", {}, 1000);
  assert.ok(g.playerBuzz(1, 1100).ok);
  act(g, "kd:wrong", {}, 1200);
  assert.equal(g.state.seats[1].score, -5);
  assert.equal(g.state.khoiDong!.buzzOpen, true);
  assert.ok(!g.playerBuzz(1, 1300).ok, "locked seat cannot buzz again");
  assert.ok(g.playerBuzz(0, 1400).ok);
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
  assert.equal(j.set.vcnv.answer, "TOÁN HỌC");
});
console.log(`${passed} tests passed`);
