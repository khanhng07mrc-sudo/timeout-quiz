import type { KdSegmentDef, OlympiaRuleset, RulesetId } from "./types";

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

const THINK_DEFAULT = { "10": 15000, "20": 15000, "30": 20000, "40": 30000 };

/** O24-26 style shared defaults */
const MODERN_CNV = [60, 50, 40, 30, 20];

function make(partial: Partial<OlympiaRuleset> & Pick<OlympiaRuleset, "id" | "label" | "audioSeason">): OlympiaRuleset {
  return {
    note: undefined,
    khoiDong: {
      correctPoints: 10,
      wrongPenalty: 5,
      lockoutOnWrong: false,
      segments: (n) => [...soloSegments(n), sharedSegment(n)],
    },
    vcnv: { rowPoints: 10, cnvPoints: MODERN_CNV, rowTimerMs: 15000 },
    tangToc: { timers: [20000, 20000, 30000, 30000] },
    veDich: {
      questionsPerSeat: 3,
      pointOptions: [20, 30],
      thinkMs: THINK_DEFAULT,
      stealMs: 5000,
      stealPenaltyDivisor: 2,
    },
    cauHoiPhu: { timerMs: 15000 },
    ...partial,
  };
}

export const RULESETS: Record<RulesetId, OlympiaRuleset> = {
  O21: make({
    id: "O21",
    label: "Olympia 21",
    audioSeason: "O22",
    note: "Luật tham khảo (không có dữ liệu riêng trong app gốc): gần với O22, không phạt khóa lượt; dùng âm thanh O22.",
    khoiDong: {
      correctPoints: 10,
      wrongPenalty: 0,
      lockoutOnWrong: false,
      segments: (n) => [...soloSegments(n), { ...sharedSegment(n), questions: 12 }],
    },
    vcnv: { rowPoints: 10, cnvPoints: [80, 60, 40, 20, 10], rowTimerMs: 15000 },
    tangToc: { timers: [10000, 20000, 30000, 40000] },
    veDich: {
      questionsPerSeat: 3,
      pointOptions: [10, 20, 30],
      thinkMs: THINK_DEFAULT,
      stealMs: 5000,
      stealPenaltyDivisor: 2,
    },
  }),
  O22: make({
    id: "O22",
    label: "Olympia 22",
    audioSeason: "O22",
    note: "Khởi động: lượt chung theo đồng hồ 30/60/90 giây; sai bị khóa lượt câu sau (không trừ điểm).",
    khoiDong: {
      correctPoints: 10,
      wrongPenalty: 0,
      lockoutOnWrong: true,
      segments: (n) => [...soloSegments(n), ...turnsO22()],
    },
    vcnv: { rowPoints: 10, cnvPoints: [80, 60, 40, 20, 10], rowTimerMs: 15000 },
    tangToc: { timers: [10000, 20000, 30000, 40000] },
    veDich: {
      questionsPerSeat: 3,
      pointOptions: [10, 20, 30],
      thinkMs: THINK_DEFAULT,
      stealMs: 5000,
      stealPenaltyDivisor: 2,
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
    vcnv: { rowPoints: 10, cnvPoints: [50, 40, 30, 20, 10], rowTimerMs: 15000 },
    tangToc: { timers: [10000, 20000, 30000, 40000] },
    veDich: {
      questionsPerSeat: 3,
      pointOptions: [10, 20, 30],
      thinkMs: THINK_DEFAULT,
      stealMs: 5000,
      stealPenaltyDivisor: 2,
    },
  }),
  O24: make({
    id: "O24",
    label: "Olympia 24",
    audioSeason: "O24-25",
    note: "Khởi động riêng 6 câu + khởi động chung X×3 câu. Tăng Tốc 10/20/30/40s. CNV 60-50-40-30-20.",
    tangToc: { timers: [10000, 20000, 30000, 40000] },
  }),
  O25: make({
    id: "O25",
    label: "Olympia 25",
    audioSeason: "O24-25",
    note: "Giống O24: Tăng Tốc 10/20/30/40s, CNV 60-50-40-30-20.",
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

/** Points for solving the keyword given number of opened rows (matches original getVcnvCnvPoints). */
export function cnvPointsFor(rs: OlympiaRuleset, openedRows: number): number {
  const n = Math.max(0, Math.floor(openedRows));
  const arr = rs.vcnv.cnvPoints;
  // 0 or 1 opened rows both yield the top prize; then one tier per extra row
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