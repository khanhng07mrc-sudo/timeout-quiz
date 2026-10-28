// Olympia game mode — shared types (server engine + clients)

export type RoundId = "khoiDong" | "vcnv" | "tangToc" | "veDich" | "cauHoiPhu";

/** Canonical play order. Câu hỏi phụ is always last and system-managed. */
export const ROUND_ORDER: RoundId[] = ["khoiDong", "vcnv", "tangToc", "veDich", "cauHoiPhu"];

export const ROUND_LABELS: Record<RoundId, string> = {
  khoiDong: "Khởi Động",
  vcnv: "Vượt Chướng Ngại Vật",
  tangToc: "Tăng Tốc",
  veDich: "Về Đích",
  cauHoiPhu: "Câu Hỏi Phụ",
};

export type RulesetId =
  | "O13"
  | "O14"
  | "O15"
  | "O16"
  | "O17"
  | "O18"
  | "O19"
  | "O20"
  | "O21"
  | "O22"
  | "O23"
  | "O24"
  | "O25"
  | "O26";

export type AudioSeason = "O13-15" | "O16-21" | "O22" | "O23" | "O24-25" | "O26";

export const MAX_SEATS = 8;

export const KHOI_DONG_SUBJECTS = [
  "Toán",
  "Lý",
  "Hóa",
  "Sinh",
  "Văn",
  "Sử",
  "Địa",
  "Thể thao",
  "Nghệ thuật",
  "Lĩnh vực khác",
  "Tiếng Anh",
] as const;

// ── Question set (same shape as the original app's questions/*.json) ──
export interface QA {
  q: string;
  a: string;
  /** optional subject/category label (e.g. Toán, Lý, Hóa, Sinh, Văn, Sử, Địa, Thể thao, Nghệ thuật, Lĩnh vực khác, Tiếng Anh) */
  subject?: string;
  /** optional media attached to the question (image/video url) */
  media?: string;
  mediaType?: "image" | "video";
}

export interface VeDichQuestion extends QA {
  type?: "theory" | "practice";
}

export interface TangTocQuestion {
  media?: string;
  type?: "image" | "video";
  /** optional text prompt shown with the media */
  q?: string;
  answer: string;
  duration?: number;
  /** question category (O13+: iq = Câu 1 IQ, data = Câu 2 & 4 Dữ kiện, arrange = Câu 3 Sắp xếp 6 mảnh 1..6) */
  category?: "iq" | "data" | "arrange";
}

export interface VcnvRowDef {
  hint: string;
  answer: string;
  media?: string;
  mediaType?: "image" | "video";
}

export interface OlympiaQuestionSet {
  name: string;
  khoiDong: {
    solo: Record<string, QA[]>; // "1".."4"
    shared: QA[];
  };
  vcnv: {
    mysteryImage?: string;
    answer: string;
    rows: VcnvRowDef[];
    centerQuestion?: QA;
  };
  tangToc: TangTocQuestion[];
  veDich: Record<string, VeDichQuestion[]>; // "10" | "20" | "30" | "40"
  cauHoiPhu: QA[];
}

// ── Ruleset ──
export type KdSegmentKind = "solo" | "shared" | "turn";

export interface KdSegmentDef {
  kind: KdSegmentKind;
  label: string;
  /** solo: seat index that answers */
  seat?: number;
  questions: number;
  /** per-question timer (ms). For globalMs segments this is the short answer window. */
  perQuestionMs: number;
  /** if set, whole segment is bounded by one global clock instead of a question count */
  globalMs?: number;
}

export interface OlympiaRuleset {
  id: RulesetId;
  label: string;
  /** folder under /olympia-audio/ */
  audioSeason: AudioSeason;
  note?: string;
  khoiDong: {
    correctPoints: number;
    /** penalty when a buzzing seat answers wrong in shared / turn segments */
    wrongPenalty: number;
    /** wrong answer locks that seat out of the next question instead (O22 early stages) */
    lockoutOnWrong: boolean;
    segments: (seatCount: number) => KdSegmentDef[];
  };
  vcnv: {
    rowPoints: number;
    /**
     * Points for solving the keyword:
     * - If 6 elements: index 0..4 = openedRows (0..4), index 5 = after center question (question #5) opened.
     * - If 5 elements: legacy format where 0 or 1 opened rows = index 0, 2..4 = index 1..3, after all 4/center = index 4.
     */
    cnvPoints: number[];
    rowTimerMs: number;
  };
  tangToc: {
    timers: number[]; // ms per question
    // tier points depend on the number of contestants X — see tangTocTierPoints()
  };
  veDich: {
    questionsPerSeat: number;
    selectionMode?: "presetPackages" | "customPoints";
    /** Fixed package definitions for O13–O19: e.g. { "40": [10,10,10,10], "60": [10,10,20,20], "80": [10,20,20,30] } */
    presetPackages?: Record<string, number[]>;
    pointOptions: number[];
    thinkMs: Record<string, number>; // by points
    stealMs: number;
    stealPenaltyDivisor: number;
    /** "seat_order" (O13–O20: 1 -> X) or "highest_unplayed" (O21–O26: highest current score among unplayed seats) */
    turnOrderMode?: "seat_order" | "highest_unplayed";
  };
  cauHoiPhu: { timerMs: number };
}

// ── Runtime state ──
export interface TimerState {
  totalMs: number;
  remainingMs: number;
  /** server epoch ms when running began; null if paused */
  startedAt: number | null;
}

export interface Seat {
  id: number; // 0..7
  name: string;
  playerKey: string | null; // reconnect token owner
  connected: boolean;
  score: number;
}

export interface Cue {
  id: number;
  /** relative sound id, e.g. "khoidong/correct" — client resolves with season */
  sound: string;
  kind: "sound" | "bgm" | "stop";
}

export interface OlympiaConfig {
  rulesetId: RulesetId;
  /** user-selected rounds (without cauHoiPhu) */
  rounds: RoundId[];
  questionSet: OlympiaQuestionSet;
}

export type RoundStatus = "pending" | "active" | "done";

export interface KhoiDongState {
  segments: KdSegmentDef[];
  segIdx: number;
  qIdx: number; // -1 = not opened yet
  phase: "intro" | "idle" | "question" | "result" | "segmentDone";
  timer: TimerState; // per-question
  globalTimer: TimerState | null;
  buzzedSeat: number | null;
  buzzOpen: boolean;
  lockedSeats: number[]; // locked out for next question (O22 lockout) or this question after wrong
  nextLockedSeats: number[];
  poolCursor: number;
  current: { q: string; a: string; subject?: string; media?: string; mediaType?: string } | null;
  lastVerdict: "correct" | "wrong" | null;
}

export interface VcnvRowState extends VcnvRowDef {
  opened: boolean;
  wrong: boolean;
}

export interface VcnvState {
  rows: VcnvRowState[];
  keyword: string;
  mysteryImage?: string;
  centerQuestion?: QA;
  centerOpened?: boolean;
  centerWrong?: boolean;
  currentRow: number; // -1 none, 0..3 row, 4 = center question (#5)
  phase: "grid" | "question" | "answers" | "done";
  timer: TimerState;
  answers: Record<number, { text: string; at: number }>;
  answersRevealed: boolean;
  /** seats that rang the keyword bell, in order */
  bells: { seat: number; before: boolean }[];
  eliminatedSeats: number[];
  openedCount: number;
  piecesRevealed: boolean[];
  solvedBy: number | null;
  rowResults: Record<number, number[]>; // rowIdx (0..4) -> seats awarded
}

export interface TangTocState {
  qIdx: number; // -1 none
  phase: "idle" | "question" | "ranking" | "graded";
  timer: TimerState;
  submissions: Record<number, { answer: string; ms: number }>;
  ranking: { seat: number; answer: string; ms: number; noAnswer: boolean; wrong?: boolean; points?: number }[];
  questions: TangTocQuestion[];
  correctAnswer?: string;
}

export interface VeDichState {
  order: number[]; // seat order
  turnIdx: number;
  playedSeats?: number[];
  phase: "idle" | "choosing" | "packageReady" | "thinking" | "stealing" | "result" | "seatDone";
  packages: Record<number, { points: number; q: VeDichQuestion }[]>;
  qIdx: number;
  current: { points: number; q: VeDichQuestion } | null;
  timer: TimerState;
  steal: { timer: TimerState; open: boolean; buzzedSeat: number | null } | null;
  hopeStarUsed: number[];
  hopeStarActive: boolean;
  deductedOnSteal: boolean;
  pointers: Record<string, number>;
  lastVerdict: "correct" | "wrong" | "stealCorrect" | "stealWrong" | "noSteal" | null;
}

export interface CauHoiPhuState {
  tied: number[];
  qIdx: number; // -1 none
  phase: "idle" | "question" | "result" | "done";
  timer: TimerState;
  buzzOpen: boolean;
  buzzedSeat: number | null;
  buzzedThisQuestion: number[];
  winner: number | null;
  questions: QA[];
}

export type LobbyPhase = "lobby" | "playing" | "finished";

export interface OlympiaState {
  code: string;
  rulesetId: RulesetId;
  rounds: RoundId[]; // selected rounds in canonical order (excl. CHP)
  stage: LobbyPhase;
  seats: Seat[];
  /** index into `roundsPlan` */
  roundIdx: number;
  roundsPlan: RoundId[]; // rounds + cauHoiPhu at the end (played only on tie or when forced)
  currentRound: RoundId | null;
  roundStatus: Record<RoundId, RoundStatus>;
  banner: string | null; // section title screen
  khoiDong: KhoiDongState | null;
  vcnv: VcnvState | null;
  tangToc: TangTocState | null;
  veDich: VeDichState | null;
  cauHoiPhu: CauHoiPhuState | null;
  cue: Cue | null;
  cueSeq: number;
  version: number;
  /** server clock at serialization — clients compute offset */
  now: number;
  log: string[];
}

export type HostAction = { type: string; [k: string]: unknown };
