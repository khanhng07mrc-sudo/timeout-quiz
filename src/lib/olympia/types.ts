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

export type AudioSeason = "O13-21" | "O22" | "O23" | "O24-25" | "O26";
export type AudioChannel = "both" | "left" | "right";
export type O22Quarter = 1 | 2 | 3;

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

export type KhoiDongSubject = (typeof KHOI_DONG_SUBJECTS)[number];

/** 6 phân vùng chuẩn ở vòng Khởi Động */
export type KdZoneId =
  | "MATH_IT"
  | "NATURAL_SCI"
  | "SOCIAL_SCI"
  | "ARTS_SPORTS"
  | "FOREIGN_LANG"
  | "GENERAL";

export const KD_ZONES: KdZoneId[] = [
  "MATH_IT",
  "NATURAL_SCI",
  "SOCIAL_SCI",
  "ARTS_SPORTS",
  "FOREIGN_LANG",
  "GENERAL",
];

export const KD_ZONE_LABELS: Record<KdZoneId, string> = {
  MATH_IT: "Toán - Tin",
  NATURAL_SCI: "Khoa học tự nhiên (Lý, Hóa, Sinh)",
  SOCIAL_SCI: "Khoa học xã hội (Văn, Sử, Địa)",
  ARTS_SPORTS: "Nghệ thuật - Thể thao",
  FOREIGN_LANG: "Tiếng Anh - Ngoại ngữ",
  GENERAL: "Hiểu biết chung",
};

export const KD_ZONE_SHORT_LABELS: Record<KdZoneId, string> = {
  MATH_IT: "Toán - Tin",
  NATURAL_SCI: "KHTN (Lý-Hóa-Sinh)",
  SOCIAL_SCI: "KHXH (Văn-Sử-Địa)",
  ARTS_SPORTS: "Nghệ thuật - Thể thao",
  FOREIGN_LANG: "Tiếng Anh",
  GENERAL: "Hiểu biết chung",
};

/** 3 phân vùng lớn ở vòng Về Đích */
export type VdZoneId = "KHTN" | "KHXH" | "HBC";

export const VD_ZONES: VdZoneId[] = ["KHTN", "KHXH", "HBC"];

export const VD_ZONE_LABELS: Record<VdZoneId, string> = {
  KHTN: "Khoa học tự nhiên (Toán, Lý, Hóa, Sinh)",
  KHXH: "Khoa học xã hội (Văn, Sử, Địa)",
  HBC: "Hiểu biết chung (Thể thao, Nghệ thuật, Tiếng Anh, Đời sống)",
};

export const VD_ZONE_SHORT_LABELS: Record<VdZoneId, string> = {
  KHTN: "Khoa học tự nhiên",
  KHXH: "Khoa học xã hội",
  HBC: "Hiểu biết chung",
};

// ── Question set (same shape as the original app's questions/*.json) ──
export interface QA {
  q: string;
  a: string;
  /** optional subject/category label (e.g. Toán, Lý, Hóa, Sinh, Văn, Sử, Địa, Thể thao, Nghệ thuật, Lĩnh vực khác, Tiếng Anh) */
  subject?: string;
  /** 1 of 6 Khởi Động zones */
  kdZone?: KdZoneId;
  /** 1 of 3 Về Đích macro-zones */
  vdZone?: VdZoneId;
  /** AI classification confidence (0..100) */
  aiConfidence?: number;
  /** Whether this question has already been used in a match */
  used?: boolean;
  usedAt?: string;
  /** optional media attached to the question (image/video/audio url) */
  media?: string;
  mediaType?: "image" | "video" | "audio";
}

export interface VeDichQuestion extends QA {
  type?: "theory" | "practice";
}

export interface TangTocClueImage {
  url: string;
  /** Second offset from question start when this clue image appears (e.g. 0, 5, 10, 15) */
  atSecond?: number;
  atSec?: number;
  label?: string;
}

export interface TangTocQuestion {
  media?: string;
  type?: "image" | "video" | "audio";
  /** optional text prompt shown with the media */
  q?: string;
  answer: string;
  duration?: number;
  /** question category (O13+: iq = Câu 1 IQ, data = Câu 2 & 4 Dữ kiện, arrange = Câu 3 Sắp xếp 6 mảnh 1..6) */
  category?: "iq" | "data" | "arrange";
  /** optional timed sequence of clue images for "data" (Dữ kiện mở dần) questions */
  clueImages?: TangTocClueImage[];
  /** Whether this question has already been used */
  used?: boolean;
}

export interface VcnvRowDef {
  hint: string;
  answer: string;
  media?: string;
  mediaType?: "image" | "video" | "audio";
  used?: boolean;
}

export interface OlympiaQuestionSet {
  id?: string;
  name: string;
  description?: string;
  targetRuleset?: RulesetId;
  /** Whether to draw questions using Stratified Fair Draw across subject zones (default true) */
  balancedRandom?: boolean;
  updatedAt?: string;
  khoiDong: {
    solo: Record<string, QA[]>; // "1".."8"
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

export type QuestionSet = OlympiaQuestionSet;

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
  kind: "sound" | "bgm" | "stop" | "pause_bgm" | "resume_bgm";
  pan?: "both" | "left" | "right";
}

export interface OlympiaConfig {
  rulesetId: RulesetId;
  /** user-selected rounds (without cauHoiPhu) */
  rounds: RoundId[];
  questionSet: OlympiaQuestionSet;
  /** When true (default), draw questions randomly while balancing across 6 KD zones & 3 VD zones */
  balancedRandom?: boolean;
  /** Number of contestants / seats (2..8). Defaults to 8 if not specified. */
  seatCount?: number;
  /** Pre-configured teams / contestants (for Sandbox or preset matches) */
  teams?: Array<{ name: string; color?: string }>;
  /** Olympia 22 Quarter selection (1 = Quý 1, 2 = Quý 2, 3 = Quý 3 - CKN) */
  o22Quarter?: O22Quarter;
  /** When true (default), play show_intro opening sound on room creation */
  playIntroOnCreate?: boolean;
}

export type RoundStatus = "pending" | "active" | "done";

export interface KhoiDongState {
  started?: boolean;
  startCooldownUntil?: number;
  segments: KdSegmentDef[];
  segIdx: number;
  qIdx: number; // -1 = not opened yet
  phase: "intro" | "idle" | "question" | "result" | "segmentDone";
  timer: TimerState; // per-question
  globalTimer: TimerState | null;
  buzzedSeat: number | null;
  buzzOpen: boolean;
  buzzUnlockAt?: number;
  lockedSeats: number[]; // locked out for next question (O22 lockout) or this question after wrong
  nextLockedSeats: number[];
  poolCursor: number;
  /** Pre-balanced per-seat question queues when balancedRandom is enabled */
  seatQueues?: Record<number, QA[]>;
  /** Pre-balanced shared question queue when balancedRandom is enabled */
  sharedQueue?: QA[];
  current: {
    q: string;
    a: string;
    subject?: string;
    kdZone?: KdZoneId;
    vdZone?: VdZoneId;
    media?: string;
    mediaType?: string;
  } | null;
  lastVerdict: "correct" | "wrong" | null;
  /** Whether the question content has been revealed to viewers/players (false during ready/open_question prelude until first "Câu tiếp" click) */
  questionRevealed?: boolean;
  bgmMode?: "auto" | "manual";
  currentBgmTrack?: "kd_bgm_1" | "kd_bgm_2" | "kd_bgm_3";
}

export interface AnswerAttempt {
  text?: string;
  answer?: string;
  /** Elapsed milliseconds from question timer start */
  ms: number;
  /** Server timestamp */
  at?: number;
}

export interface VcnvAnswerRecord {
  text: string;
  at: number;
  ms?: number;
  /** Penultimate (2nd-to-last) answer text if player submitted >= 2 times */
  previousText?: string;
  previousMs?: number;
  /** Full chronological list of all submitted answers in this question (for Detailed Transcript) */
  history?: AnswerAttempt[];
}

export interface TangTocSubmissionRecord {
  answer: string;
  ms: number;
  /** Penultimate (2nd-to-last) answer text if player submitted >= 2 times */
  previousAnswer?: string;
  previousMs?: number;
  /** Full chronological list of all submitted answers in this question (for Detailed Transcript) */
  history?: AnswerAttempt[];
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
  answers: Record<number, VcnvAnswerRecord>;
  answersRevealed: boolean;
  /** seats that rang the keyword bell, in order */
  bells: { seat: number; before: boolean; atMs?: number }[];
  eliminatedSeats: number[];
  openedCount: number;
  piecesRevealed: boolean[];
  solvedBy: number | null;
  rowResults: Record<number, number[]>; // rowIdx (0..4) -> seats awarded
}

export interface TangTocRankingItem {
  seat: number;
  answer: string;
  ms: number;
  noAnswer: boolean;
  wrong?: boolean;
  points?: number;
  previousAnswer?: string;
  previousMs?: number;
  history?: AnswerAttempt[];
}

export interface TangTocState {
  qIdx: number; // -1 none
  phase: "idle" | "question" | "ranking" | "graded";
  timer: TimerState;
  submissions: Record<number, TangTocSubmissionRecord>;
  ranking: TangTocRankingItem[];
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
  /** Keys of VeDich questions already drawn in this match */
  usedKeys?: string[];
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

export interface TranscriptBuzzerItem {
  order: number;
  seat: number;
  name: string;
  ms?: number;
  beforeReveal?: boolean;
  note?: string;
  verdict?: "correct" | "wrong";
}

export interface TranscriptSubmissionItem {
  rank: number;
  seat: number;
  name: string;
  finalAnswer: string;
  finalMs?: number;
  previousAnswer?: string;
  previousMs?: number;
  /** All attempts from 1st to last (shown in "Chi tiết" transcript mode) */
  allAttempts: AnswerAttempt[];
  isCorrect?: boolean;
  correct?: boolean;
  pointsAwarded?: number;
  noAnswer?: boolean;
}

export interface OlympiaTranscriptEntry {
  seq: number;
  at: number;
  round: RoundId | "system";
  roundLabel: string;
  segmentLabel: string;
  /** "question" | "package" | "package_select" | "cnv_bell" | "score_adjust" */
  entryKind: "question" | "package" | "package_select" | "cnv_bell" | "score_adjust";
  questionNumber?: number;
  questionText?: string;
  correctAnswer?: string;
  subject?: string;
  kdZone?: KdZoneId;
  vdZone?: VdZoneId;
  mediaUrl?: string;
  media?: string;
  /** Active contestant seat (for solo KD or VeDich owner) */
  actorSeat?: number;
  actorName?: string;
  /** Main buzzer / responder seat & name */
  buzzedSeat?: number;
  buzzedName?: string;
  /** VeDich chosen package point array (e.g. [20, 30, 20] or [10, 10, 20, 20]) */
  packageChoices?: number[];
  packagePoints?: number[];
  packageLabel?: string;
  /** Point value of the question in VeDich/KD/VCNV */
  selectedPoints?: number;
  questionPoints?: number;
  hopeStar?: boolean;
  /** Buzzer sequence for shared KD, VCNV CNV bell, VeDich steal, CauHoiPhu */
  buzzerEvents?: TranscriptBuzzerItem[];
  /** Ranked submissions for VCNV & TangToc (contains finalAnswer, previousAnswer, and allAttempts[]) */
  submissions?: TranscriptSubmissionItem[];
  verdict?:
    | "correct"
    | "wrong"
    | "stealCorrect"
    | "steal_correct"
    | "stealWrong"
    | "steal_wrong"
    | "noSteal"
    | "skipped"
    | "skip"
    | "graded"
    | "info";
  scoreChanges?: Record<number, number>;
  scoresAfter?: Record<number, number>;
  scoresSnapshot?: Record<number, number>;
  note?: string;
}

export type LobbyPhase = "lobby" | "playing" | "finished";

export interface OlympiaState {
  code: string;
  name?: string;
  rulesetId: RulesetId;
  o22Quarter?: O22Quarter;
  rounds: RoundId[]; // selected rounds in canonical order (excl. CHP)
  stage: LobbyPhase;
  seatCount?: number;
  seats: Seat[];
  /** index into `roundsPlan` */
  roundIdx: number;
  roundsPlan: RoundId[]; // rounds + cauHoiPhu at the end (played only on tie or when forced)
  currentRound: RoundId | null;
  roundStatus: Record<RoundId, RoundStatus>;
  banner: string | null; // section title screen
  introTimer?: TimerState | null; // opening show intro countdown timer (5s)
  showScoreboard?: boolean; // toggle full scoreboard overlay on DisplayScreen
  waitingBgm?: boolean; // whether waiting BGM is active
  kdIntroTimer?: TimerState | null; // prelude timer (3.5s) for KhoiDong
  vdPackageTimer?: TimerState | null; // delay timer (~1.8s) after package confirmation
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
  /** Normalized question strings opened during the match so the bank can mark them as used */
  openedQuestionKeys?: string[];
  kdFinishTurnPan?: "both" | "left" | "right";
  /** Structured match transcript supporting both "Rút gọn" and "Chi tiết" modes */
  transcript?: OlympiaTranscriptEntry[];
  /** Host-controlled stage graphics overlay (hexagonal LED animation) on DisplayScreen */
  showStageGraphics?: boolean;
}

export type HostAction = { type: string; [k: string]: unknown };
