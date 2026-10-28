import type { KdSegmentDef, OlympiaRuleset, RulesetId } from "./types";

/** O13–O19: 60s personal clock per contestant, max 12 questions */
const solo60s12q = (seatCount: number): KdSegmentDef[] =>
  Array.from({ length: seatCount }, (_, i) => ({
    kind: "solo" as const,
    label: `Thí sinh ${i + 1} — Khởi động 60s (tối đa 12 câu)`,
    seat: i,
    questions: 12,
    perQuestionMs: 60000,
    globalMs: 60000,
  }));

/** O20–O21: 60s personal clock per contestant, unlimited questions */
const solo60sUnlimited = (seatCount: number): KdSegmentDef[] =>
  Array.from({ length: seatCount }, (_, i) => ({
    kind: "solo" as const,
    label: `Thí sinh ${i + 1} — Khởi động 60s (không giới hạn câu)`,
    seat: i,
    questions: 999,
    perQuestionMs: 60000,
    globalMs: 60000,
  }));

/** O22–O26: 6 solo questions per contestant (5s per question) */
const soloSegments = (seatCount: number): KdSegmentDef[] =>
  Array.from({ length: seatCount }, (_, i) => ({
    kind: "solo" as const,
    label: `Thí sinh ${i + 1} — Khởi động riêng`,
    seat: i,
    questions: 6,
    perQuestionMs: 5000,
  }));

const sharedSegment = (seatCount: number): KdSegmentDef => ({
  kind: "shared",
  label: "Khởi động chung",
  // O24+: X * 3 questions for X contestants
  questions: seatCount * 3,
  perQuestionMs: 3000,
});

const turnsO23 = (seatCount: number): KdSegmentDef[] =>
  [2, 3, 4].map((m) => seatCount * m).map((n, i) => ({
    kind: "turn" as const,
    label: `Lượt chung ${i + 1} (${n} câu)`,
    questions: n,
    perQuestionMs: 3000,
  }));

const turnsO22 = (): KdSegmentDef[] =>
  [30, 60, 90].map((s, i) => ({
    kind: "turn" as const,
    label: `Lượt chung ${i + 1} (${s} giây)`,
    questions: 99,
    perQuestionMs: 3000,
    globalMs: s * 1000,
  }));

/** O13–O21 think times: 10đ = 10s, 20đ = 15s, 30đ = 20s */
const THINK_CLASSIC = { "10": 10000, "20": 15000, "30": 20000, "40": 30000 };
/** O22–O26 think times: 10/20đ = 15s, 30đ = 20s */
const THINK_MODERN = { "10": 15000, "20": 15000, "30": 20000, "40": 30000 };

/** O13–O14 preset packages (4 questions per package) */
export const PRESET_PACKAGES_O13_O14: Record<string, number[]> = {
  "40": [10, 10, 10, 10],
  "60": [10, 10, 20, 20],
  "80": [10, 20, 20, 30],
};

/** O15–O19 preset packages (3 questions per package) */
export const PRESET_PACKAGES_O15_O19: Record<string, number[]> = {
  "40": [10, 10, 20],
  "60": [10, 20, 30],
  "80": [20, 30, 30],
};

/**
 * 6-element CNV arrays: [opened0, opened1, opened2, opened3, opened4, afterCenterQuestion]
 * - O13: 2 hàng đầu (0,1,2) = 80đ; 2 hàng còn lại (3,4) = 40đ; sau câu thứ 5 (ô trung tâm) = 20đ.
 * - O14–O22: hàng 1 (0,1) = 80đ; hàng 2 = 60đ; hàng 3 = 40đ; hàng 4 = 20đ; sau câu thứ 5 = 10đ.
 * - O23: 50 - 40 - 30 - 20 - 10.
 * - O24–O26: 60 - 50 - 40 - 30 - 20.
 */
const CNV_O13 = [80, 80, 80, 40, 40, 20];
const CNV_O14_O22 = [80, 80, 60, 40, 20, 10];
const CNV_O23 = [50, 50, 40, 30, 20, 10];
const CNV_MODERN = [60, 60, 50, 40, 30, 20];

function make(partial: Partial<OlympiaRuleset> & Pick<OlympiaRuleset, "id" | "label" | "audioSeason">): OlympiaRuleset {
  return {
    note: undefined,
    khoiDong: {
      correctPoints: 10,
      wrongPenalty: 5,
      lockoutOnWrong: false,
      segments: (n) => [...soloSegments(n), sharedSegment(n)],
    },
    vcnv: { rowPoints: 10, cnvPoints: CNV_MODERN, rowTimerMs: 15000 },
    tangToc: { timers: [20000, 20000, 30000, 30000] },
    veDich: {
      questionsPerSeat: 3,
      selectionMode: "customPoints",
      pointOptions: [20, 30],
      thinkMs: THINK_MODERN,
      stealMs: 5000,
      stealPenaltyDivisor: 2,
      turnOrderMode: "highest_unplayed",
    },
    cauHoiPhu: { timerMs: 15000 },
    ...partial,
  };
}

function makeO15ToO19(id: RulesetId, yearNum: number, audioSeason: "O13-15" | "O16-21"): OlympiaRuleset {
  return make({
    id,
    label: `Olympia ${yearNum}`,
    audioSeason,
    note: `Khởi động 60s (tối đa 12 câu). VCNV 80-60-40-20-10đ. Tăng tốc 30s×4 câu. Về đích 3 câu theo gói cố định 40 (10-10-20), 60 (10-20-30), 80 (20-30-30).`,
    khoiDong: {
      correctPoints: 10,
      wrongPenalty: 0,
      lockoutOnWrong: false,
      segments: (n) => solo60s12q(n),
    },
    vcnv: { rowPoints: 10, cnvPoints: CNV_O14_O22, rowTimerMs: 15000 },
    tangToc: { timers: [30000, 30000, 30000, 30000] },
    veDich: {
      questionsPerSeat: 3,
      selectionMode: "presetPackages",
      presetPackages: PRESET_PACKAGES_O15_O19,
      pointOptions: [10, 20, 30],
      thinkMs: THINK_CLASSIC,
      stealMs: 5000,
      stealPenaltyDivisor: 2,
      turnOrderMode: "seat_order",
    },
  });
}

export const RULESETS: Record<RulesetId, OlympiaRuleset> = {
  O13: make({
    id: "O13",
    label: "Olympia 13",
    audioSeason: "O13-15",
    note: "Khởi động 60s (tối đa 12 câu). VCNV: 2 hàng đầu 80đ, 2 hàng sau 40đ, sau câu thứ 5 (ô trung tâm) 20đ. Tăng tốc 30s×4. Về đích gói 4 câu: 40 (10×4), 60 (10×2, 20×2), 80 (10, 20×2, 30).",
    khoiDong: {
      correctPoints: 10,
      wrongPenalty: 0,
      lockoutOnWrong: false,
      segments: (n) => solo60s12q(n),
    },
    vcnv: { rowPoints: 10, cnvPoints: CNV_O13, rowTimerMs: 15000 },
    tangToc: { timers: [30000, 30000, 30000, 30000] },
    veDich: {
      questionsPerSeat: 4,
      selectionMode: "presetPackages",
      presetPackages: PRESET_PACKAGES_O13_O14,
      pointOptions: [10, 20, 30],
      thinkMs: THINK_CLASSIC,
      stealMs: 5000,
      stealPenaltyDivisor: 2,
      turnOrderMode: "seat_order",
    },
  }),
  O14: make({
    id: "O14",
    label: "Olympia 14",
    audioSeason: "O13-15",
    note: "Tương tự O13, thay đổi điểm VCNV: hàng 1: 80đ, hàng 2: 60đ, hàng 3: 40đ, hàng 4: 20đ, sau câu thứ 5 (ô trung tâm): 10đ. Về đích gói 4 câu (40/60/80đ).",
    khoiDong: {
      correctPoints: 10,
      wrongPenalty: 0,
      lockoutOnWrong: false,
      segments: (n) => solo60s12q(n),
    },
    vcnv: { rowPoints: 10, cnvPoints: CNV_O14_O22, rowTimerMs: 15000 },
    tangToc: { timers: [30000, 30000, 30000, 30000] },
    veDich: {
      questionsPerSeat: 4,
      selectionMode: "presetPackages",
      presetPackages: PRESET_PACKAGES_O13_O14,
      pointOptions: [10, 20, 30],
      thinkMs: THINK_CLASSIC,
      stealMs: 5000,
      stealPenaltyDivisor: 2,
      turnOrderMode: "seat_order",
    },
  }),
  O15: makeO15ToO19("O15", 15, "O13-15"),
  O16: makeO15ToO19("O16", 16, "O16-21"),
  O17: makeO15ToO19("O17", 17, "O16-21"),
  O18: makeO15ToO19("O18", 18, "O16-21"),
  O19: makeO15ToO19("O19", 19, "O16-21"),
  O20: make({
    id: "O20",
    label: "Olympia 20",
    audioSeason: "O16-21",
    note: "Khởi động 60s không giới hạn số câu hỏi. VCNV 80-60-40-20-10đ. Tăng tốc 30s×4. Về đích tự chọn 3 câu ở 3 mức điểm bất kỳ (10, 20, 30) theo thứ tự vị trí 1→X.",
    khoiDong: {
      correctPoints: 10,
      wrongPenalty: 0,
      lockoutOnWrong: false,
      segments: (n) => solo60sUnlimited(n),
    },
    vcnv: { rowPoints: 10, cnvPoints: CNV_O14_O22, rowTimerMs: 15000 },
    tangToc: { timers: [30000, 30000, 30000, 30000] },
    veDich: {
      questionsPerSeat: 3,
      selectionMode: "customPoints",
      pointOptions: [10, 20, 30],
      thinkMs: THINK_CLASSIC,
      stealMs: 5000,
      stealPenaltyDivisor: 2,
      turnOrderMode: "seat_order",
    },
  }),
  O21: make({
    id: "O21",
    label: "Olympia 21",
    audioSeason: "O16-21",
    note: "Tương tự O20 (Khởi động 60s không giới hạn câu, Về đích chọn 3 câu 10/20/30đ); riêng Về đích thí sinh có điểm cao nhất qua mỗi lượt mà chưa thi sẽ lên thi ở lượt đó.",
    khoiDong: {
      correctPoints: 10,
      wrongPenalty: 0,
      lockoutOnWrong: false,
      segments: (n) => solo60sUnlimited(n),
    },
    vcnv: { rowPoints: 10, cnvPoints: CNV_O14_O22, rowTimerMs: 15000 },
    tangToc: { timers: [30000, 30000, 30000, 30000] },
    veDich: {
      questionsPerSeat: 3,
      selectionMode: "customPoints",
      pointOptions: [10, 20, 30],
      thinkMs: THINK_CLASSIC,
      stealMs: 5000,
      stealPenaltyDivisor: 2,
      turnOrderMode: "highest_unplayed",
    },
  }),
  O22: make({
    id: "O22",
    label: "Olympia 22",
    audioSeason: "O22",
    note: "Khởi động: lượt chung theo đồng hồ 30/60/90 giây; sai bị khóa lượt câu sau (không trừ điểm). Tăng tốc 10/20/30/40s.",
    khoiDong: {
      correctPoints: 10,
      wrongPenalty: 0,
      lockoutOnWrong: true,
      segments: (n) => [...soloSegments(n), ...turnsO22()],
    },
    vcnv: { rowPoints: 10, cnvPoints: CNV_O14_O22, rowTimerMs: 15000 },
    tangToc: { timers: [10000, 20000, 30000, 40000] },
    veDich: {
      questionsPerSeat: 3,
      selectionMode: "customPoints",
      pointOptions: [10, 20, 30],
      thinkMs: THINK_MODERN,
      stealMs: 5000,
      stealPenaltyDivisor: 2,
      turnOrderMode: "highest_unplayed",
    },
  }),
  O23: make({
    id: "O23",
    label: "Olympia 23",
    audioSeason: "O23",
    note: "Khởi động: 3 lượt chung X×2 / X×3 / X×4 câu (X = số thí sinh), sai trừ 5 điểm. CNV 50-40-30-20-10.",
    khoiDong: {
      correctPoints: 10,
      wrongPenalty: 5,
      lockoutOnWrong: false,
      segments: (n) => [...soloSegments(n), ...turnsO23(n)],
    },
    vcnv: { rowPoints: 10, cnvPoints: CNV_O23, rowTimerMs: 15000 },
    tangToc: { timers: [10000, 20000, 30000, 40000] },
    veDich: {
      questionsPerSeat: 3,
      selectionMode: "customPoints",
      pointOptions: [10, 20, 30],
      thinkMs: THINK_MODERN,
      stealMs: 5000,
      stealPenaltyDivisor: 2,
      turnOrderMode: "highest_unplayed",
    },
  }),
  O24: make({
    id: "O24",
    label: "Olympia 24",
    audioSeason: "O24-25",
    note: "Khởi động riêng 6 câu + khởi động chung X×3 câu. Tăng Tốc 10/20/30/40s. CNV 60-50-40-30-20. Về đích chọn 3 câu 20/30đ.",
    tangToc: { timers: [10000, 20000, 30000, 40000] },
  }),
  O25: make({
    id: "O25",
    label: "Olympia 25",
    audioSeason: "O24-25",
    note: "Giống O24: Khởi động riêng 6 câu + chung X×3 câu, Tăng Tốc 10/20/30/40s, CNV 60-50-40-30-20, Về đích 20/30đ.",
    tangToc: { timers: [10000, 20000, 30000, 40000] },
  }),
  O26: make({
    id: "O26",
    label: "Olympia 26",
    audioSeason: "O26",
    note: "Tăng Tốc 20/20/30/30s, CNV 60-50-40-30-20, Về Đích gói 20/30 điểm.",
  }),
};

export const RULESET_LIST: OlympiaRuleset[] = Object.values(RULESETS);

/**
 * Points for solving the keyword given number of opened horizontal rows (0..4)
 * and whether the 5th center question has been opened (`centerOpened`).
 */
export function cnvPointsFor(rs: OlympiaRuleset, openedRows: number, centerOpened = false): number {
  const n = Math.max(0, Math.floor(openedRows));
  const arr = rs.vcnv.cnvPoints;
  if (arr.length >= 6) {
    if (centerOpened || n >= 5) return arr[5];
    return arr[Math.min(4, n)];
  }
  // Legacy 5-element array fallback
  if (centerOpened || n >= 5) return arr[arr.length - 1];
  const idx = Math.min(n <= 1 ? 0 : n - 1, arr.length - 1);
  return arr[idx];
}

/**
 * Tăng Tốc points by finishing order (unique-time tiers) for X contestants (2..8).
 * Applies to every season.
 */
const TANG_TOC_TABLE: Record<number, number[]> = {
  1: [40],
  2: [20, 10],
  3: [30, 20, 10],
  4: [40, 30, 20, 10],
  5: [40, 30, 20, 15, 10],
  6: [40, 30, 25, 20, 15, 10],
  7: [40, 35, 30, 25, 20, 15, 10],
  8: [40, 35, 30, 25, 20, 15, 10, 5],
};

export function tangTocTierPoints(contestants: number): number[] {
  const n = Math.min(8, Math.max(1, Math.floor(contestants) || 1));
  return TANG_TOC_TABLE[n];
}
