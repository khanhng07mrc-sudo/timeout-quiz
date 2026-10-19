/**
 * MAGIC_WHEEL (VÒNG QUAY TRI THỨC - CHIẾC NÓN KỲ DIỆU) GAME ENGINE
 * -------------------------------------------------------------
 * Mô phỏng chuẩn xác luật chơi Chiếc nón kỳ diệu (Wheel of Fortune Vietnam) phiên bản 2012 & Mở rộng:
 * - Lộ trình vòng thi:
 *     + Vòng Đoán Nhanh 1 (TOSS_UP_1): Mở chữ ngẫu nhiên 0.75s/ô, bấm chuông giải đúng nhận +500đ.
 *     + Vòng Đoán Nhanh 2 (TOSS_UP_2): Mở chữ ngẫu nhiên 0.75s/ô, bấm chuông giải đúng nhận +1.000đ & quyền đi đầu Vòng Chính 1.
 *     + Các Vòng Chính 1..N (N = max(3, số đội)): Xoay vòng đội mở màn; mỗi vòng có cơ chế phụ độc quyền:
 *         * Vòng 1: Ô Phần Thưởng (20 lá thăm bí mật)
 *         * Vòng 2: 2 Ô Bí Mật (+3.000đ vĩnh viễn hoặc Mất điểm)
 *         * Vòng 3: Đổi hay Không Đổi (4 Hộp quà vĩnh viễn vs Cấm đoán tắt ô chữ)
 *         * Vòng 4: Tàu Tốc Hành (Express 1.000đ/chữ) & Hũ Kim Cương Tích Lũy (Jackpot)
 *         * Vòng 5: Thương Vụ Chuyển Nhượng (Cướp 50% điểm vòng hoặc Hoán đổi điểm vòng với Top 1)
 *         * Vòng 6+: Chuông Tăng Tốc (Speed-Up 1.500đ/chữ khi mở >=50% bảng) & Ô Nhân Ba (x3)
 *     + Vòng Đặc Biệt (SPECIAL_FINAL): Chọn Quay thưởng trước hoặc Giải ô chữ trước, chọn K chữ cái, 30s suy nghĩ + 10s trả lời gõ liên tục.
 * - Cơ chế chữ cái không dấu thanh trên bảng: Mở chữ cái chỉ hiện chữ gốc không dấu thanh; phải Giải Ô Chữ khớp chính xác từng dấu thanh điệu.
 */

export type MagicWheelSectorType =
  | "POINTS"
  | "LOSE_TURN"
  | "BANKRUPT"
  | "DOUBLE"
  | "HALF"
  | "EXTRA_TURN"
  | "LUCKY"
  | "PRIZE"
  | "MYSTERY"
  | "EXPRESS"
  | "JACKPOT"
  | "STEAL_SWAP"
  | "TRIPLE"
  | "SPECIAL_ENVELOPE"
  | "BONUS_ENVELOPE";

export type MagicWheelRoundStage = "TOSS_UP_1" | "TOSS_UP_2" | "MAIN" | "MAIN_ROUND" | "SPECIAL_FINAL";

export type MagicWheelOperationMode = "SELF_SERVICE" | "HOST_ASSISTED";

export interface MagicWheelSector {
  id: number;
  label: string;
  type: MagicWheelSectorType;
  value?: number;
  color: string;
  textColor: string;
  isOverlay?: boolean;
  overlayType?: "PRIZE" | "MYSTERY" | "EXPRESS" | "JACKPOT" | "STEAL_SWAP" | "TRIPLE" | "SPECIAL_ENVELOPE";
  basePoints?: number;
  mysteryContent?: "PRIZE_3M" | "BANKRUPT";
  envelopePrizePoints?: number;
  envelopeTitle?: string;
}

export interface MagicWheelPuzzle {
  id: string;
  roundNumber: number; // Thứ tự tổng thể trong trận (1, 2, 3...)
  stage?: MagicWheelRoundStage; // TOSS_UP_1, TOSS_UP_2, MAIN, SPECIAL_FINAL
  mainRoundIndex?: number; // 1, 2, 3, 4... nếu là vòng MAIN
  category: string;    // "Danh nhân", "Địa danh", "Văn học", "Khoa học"
  secretPhrase: string; // "NGUYỄN TRÃI"
  clue?: string;        // "Nhà quân sự, danh nhân văn hóa..."
  revealedIndices: number[]; // Vị trí các ký tự đã được lật mở (chỉ hiện chữ gốc không dấu khi chưa giải xong)
}

export interface MagicWheelState {
  subMode: "WHEEL_QUIZ" | "WORD_PUZZLE";
  operationMode?: MagicWheelOperationMode; // SELF_SERVICE (Máy tính) vs HOST_ASSISTED (MC/Admin)
  roundStage?: MagicWheelRoundStage;
  mainRoundNumber?: number; // 1..N
  totalMainRounds?: number; // N = max(3, teams.length)
  round1StarterTeamId?: string; // Đội thắng Đoán Nhanh 2 (hoặc đội đầu tiên)
  sectors: MagicWheelSector[];
  currentTurnTeamId: string;
  currentTurnTeamName: string;
  currentRound: number;
  maxRounds: number;
  puzzles: MagicWheelPuzzle[];
  currentPuzzle?: MagicWheelPuzzle;
  isSpinning: boolean;
  spinPower: number; // 0 - 100
  targetRotationDegrees: number;
  selectedSectorIndex?: number;
  selectedSector?: MagicWheelSector;
  boardStage?: "EMPTY_56" | "BLANK_PHRASE" | "READY_CLUE";
  guessedLetters: string[]; // Các chữ cái đã đoán ("A", "B", "C"...)
  wrongGuessesCount: Record<string, number>; // teamId -> số lỗi liên tiếp
  freeSpinCount: Record<string, number>; // teamId -> số lần có Thêm Lượt
  roundScores: Record<string, number>; // teamId -> điểm tích lũy trong vòng hiện tại
  disqualifiedTeamIdsInRound: string[]; // Các đội bị loại trong vòng do phạm 3 lỗi liên tiếp
  consecutiveWrongGuesses: Record<string, number>; // teamId -> số lần đoán sai liên tiếp (0, 1, 2, 3)
  pendingSpecialAction?:
    | "NONE"
    | "EXTRA_TURN"
    | "DOUBLE"
    | "TRIPLE"
    | "HALF"
    | "POINTS"
    | "LUCKY"
    | "MYSTERY"
    | "PRIZE"
    | "EXPRESS"
    | "JACKPOT"
    | "STEAL_SWAP";
  phase:
    | "TOSS_UP_READY"     // Chờ bắt đầu chạy mở chữ ngẫu nhiên 0.75s/chữ
    | "TOSS_UP_RUNNING"   // Đang mở chữ ngẫu nhiên 0.75s/chữ, chờ bấm chuông
    | "TOSS_UP_BUZZED"    // Có đội vừa bấm chuông, tạm dừng mở chữ để trả lời (5s)
    | "SPIN_WAITING"      // Chờ đội đến lượt bấm quay
    | "SPINNING"          // Nón đang xoay
    | "SECTOR_RESULT"     // Nón đã dừng, thông báo kết quả ô quay
    | "ACTION_INPUT"      // Chờ đoán chữ cái / trả lời quiz / giải ô chữ
    | "MYSTERY_CHOICE"    // V2: Chờ quyết định lật ô Bí Mật hay lấy điểm an toàn
    | "REWARD_CHOICE"     // V1: Chờ chọn 1 trong 20 lá thăm bí mật
    | "TRADE_CHOICE"      // V3: Chờ quyết định Đổi hay Không Đổi
    | "EXPRESS_CHOICE"    // V4: Chờ quyết định lên Tàu Tốc Hành (1000đ/chữ, sai = Mất điểm)
    | "STEAL_SWAP_CHOICE" // V5: Chờ chọn Cướp 50% điểm vòng hoặc Hoán đổi điểm vòng
    | "LUCKY_PICK"        // Chờ người chơi chọn ô lật miễn phí
    | "SPECIAL_FINAL_FLOW"// Vòng Đặc Biệt (Chọn thứ tự, Quay phong bì, Chọn K chữ cái, Giải 40s)
    | "ROUND_RECAP";      // Kết thúc vòng, tổng kết điểm & lật đầy đủ dấu thanh
  mysteryRevealedType?: "PRIZE_CASH" | "BANKRUPT";
  lastActionMessage?: string;
  mcCommentary?: string;
  lastAwardedPoints?: number;
  activeQuestionId?: string;
  permanentScores?: Record<string, number>;
  teamShields?: Record<string, boolean>;
  round3TradedTeams?: string[];
  round3ForbiddenSolveTeams?: string[];
  // Các đội đã Giải Ô Chữ SAI trong vòng chơi chính hiện tại -> bị loại khỏi phần còn lại của vòng đó
  roundEliminatedTeamIds?: string[];
  // Phản hồi trực quan khi có người chốt đáp án giải ô chữ (Đúng / Sai)
  lastSolveFeedback?: {
    teamId?: string;
    teamName?: string;
    guess: string;
    isCorrect: boolean;
    pointsAwarded?: number;
    correctPhrase?: string;
    eliminatedFromRound?: boolean;
    allTeamsEliminated?: boolean;
    timestamp: number;
  } | null;
  // Cơ chế mở hết chữ cái gốc (không dấu thanh) -> bắt buộc Giải Ô Chữ đúng dấu thanh
  mustSolveWithTones?: boolean;
  // Trạng thái Vòng Đoán Nhanh (Toss-Up 1 & 2)
  tossUpRevealOrder?: number[];
  tossUpStartTime?: number;
  tossUpBuzzedTeamId?: string;
  tossUpBuzzedTeamName?: string;
  tossUpAnswerEndsAt?: number;
  // Trạng thái Vòng 4, 5, 6+
  jackpotPool?: number; // Hũ Kim Cương tích lũy ở Vòng 4
  expressModeActive?: boolean; // Đang đi Tàu Tốc Hành ở Vòng 4
  speedUpBellActive?: boolean; // Chuông Tăng Tốc chung cuộc ở Vòng 6+ (1500đ/chữ không cần quay)
  // Trạng thái Vòng Đặc Biệt (Special Final Round)
  specialRoundOrder?: "SPIN_FIRST" | "SOLVE_FIRST";
  specialPhase?: "CHOOSE_ORDER" | "SPIN_ENVELOPE" | "PICK_LETTERS" | "SOLVE_40S" | "AWAIT_POST_SOLVE_SPIN" | "DONE";
  specialEnvelopePrize?: {
    label: string;
    points: number;
    revealed: boolean;
  };
  specialAllowedLettersCount?: number;
  specialPickedLetters?: string[];
  specialTimerEndsAt?: number;
  specialSolvedSuccess?: boolean;
}

// ── Bảng 24 ô chuẩn phiên bản 2012 của Chiếc Nón Kỳ Diệu ────────────────────
export const BASE_24_SECTORS: MagicWheelSector[] = [
  { id: 0, label: "500", type: "POINTS", value: 500, color: "#e11d48", textColor: "#ffffff" },
  { id: 1, label: "300", type: "POINTS", value: 300, color: "#2563eb", textColor: "#ffffff" },
  { id: 2, label: "MẤT LƯỢT", type: "LOSE_TURN", color: "#475569", textColor: "#f8fafc" },
  { id: 3, label: "700", type: "POINTS", value: 700, color: "#d97706", textColor: "#ffffff" },
  { id: 4, label: "200", type: "POINTS", value: 200, color: "#059669", textColor: "#ffffff" },
  { id: 5, label: "THÊM LƯỢT", type: "EXTRA_TURN", color: "#0284c7", textColor: "#ffffff" },
  { id: 6, label: "400", type: "POINTS", value: 400, color: "#7c3aed", textColor: "#ffffff" },
  { id: 7, label: "900", type: "POINTS", value: 900, color: "#ea580c", textColor: "#ffffff" },
  { id: 8, label: "MẤT ĐIỂM", type: "BANKRUPT", color: "#000000", textColor: "#ef4444" },
  { id: 9, label: "300", type: "POINTS", value: 300, color: "#0d9488", textColor: "#ffffff" },
  { id: 10, label: "1000", type: "POINTS", value: 1000, color: "#f59e0b", textColor: "#000000" },
  { id: 11, label: "CHIA ĐÔI", type: "HALF", color: "#64748b", textColor: "#f8fafc" },
  { id: 12, label: "600", type: "POINTS", value: 600, color: "#4f46e5", textColor: "#ffffff" },
  { id: 13, label: "100", type: "POINTS", value: 100, color: "#16a34a", textColor: "#ffffff" },
  { id: 14, label: "MAY MẮN", type: "LUCKY", color: "#ec4899", textColor: "#ffffff" },
  { id: 15, label: "800", type: "POINTS", value: 800, color: "#c026d3", textColor: "#ffffff" },
  { id: 16, label: "200", type: "POINTS", value: 200, color: "#0891b2", textColor: "#ffffff" },
  { id: 17, label: "NHÂN ĐÔI", type: "DOUBLE", color: "#10b981", textColor: "#ffffff" },
  { id: 18, label: "300", type: "POINTS", value: 300, color: "#3b82f6", textColor: "#ffffff" },
  { id: 19, label: "700", type: "POINTS", value: 700, color: "#eab308", textColor: "#000000" },
  { id: 20, label: "400", type: "POINTS", value: 400, color: "#9333ea", textColor: "#ffffff" },
  { id: 21, label: "900", type: "POINTS", value: 900, color: "#f97316", textColor: "#ffffff" },
  { id: 22, label: "1000", type: "POINTS", value: 1000, color: "#e11d48", textColor: "#ffffff" },
  { id: 23, label: "2000", type: "POINTS", value: 2000, color: "#ffd700", textColor: "#000000" },
];

/**
 * Sinh cấu hình 24 ô theo từng vòng chơi:
 * - Vòng Chính 1: Ô Phần Thưởng (20 lá thăm)
 * - Vòng Chính 2: 2 Ô Bí Mật
 * - Vòng Chính 3: Vòng Đổi hay Không Đổi (bàn xoay chuẩn 24 ô)
 * - Vòng Chính 4: Ô Tốc Độ ⚡ (Express 1000đ/chữ) + Ô Kim Cương 💎 (Jackpot tích lũy)
 * - Vòng Chính 5: 2 Ô Chuyển Nhượng ⚔️ (Cướp 50% điểm vòng hoặc Hoán đổi điểm vòng)
 * - Vòng Chính 6+: Nhân đôi điểm cơ bản + Ô Nhân Ba 🔥 (x3)
 * - Vòng Đặc Biệt (round = 99 / stage = SPECIAL_FINAL): 24 Phong bì Giải thưởng Đặc Biệt
 */
export function generateMagicWheelSectors(
  mainRoundOrStage: number,
  stage?: MagicWheelRoundStage
): MagicWheelSector[] {
  if (stage === "SPECIAL_FINAL" || mainRoundOrStage === 99) {
    const specialPalette = [
      { pts: 2000, label: "PHONG BÌ 2000", color: "#2563eb", textColor: "#ffffff" },
      { pts: 3000, label: "PHONG BÌ 3000", color: "#7c3aed", textColor: "#ffffff" },
      { pts: 4000, label: "PHONG BÌ 4000", color: "#059669", textColor: "#ffffff" },
      { pts: 5000, label: "PHONG BÌ 5000", color: "#e11d48", textColor: "#ffffff" },
      { pts: 8000, label: "PHONG BÌ 8000", color: "#ea580c", textColor: "#ffffff" },
      { pts: 10000, label: "ĐẶC BIỆT 10000", color: "#ffd700", textColor: "#78350f" },
    ];
    return Array.from({ length: 24 }, (_, idx) => {
      const item = specialPalette[idx % specialPalette.length];
      return {
        id: idx,
        label: item.pts === 10000 ? "👑 10000" : `✉️ ${item.pts}`,
        type: "SPECIAL_ENVELOPE" as const,
        value: item.pts,
        color: item.color,
        textColor: item.textColor,
        isOverlay: true,
        overlayType: "SPECIAL_ENVELOPE" as const,
        envelopePrizePoints: item.pts,
        envelopeTitle: item.label,
      };
    });
  }

  const sectors = BASE_24_SECTORS.map((s) => ({ ...s }));

  if (mainRoundOrStage === 1) {
    const targetIdx = sectors.findIndex((s) => s.id === 13);
    if (targetIdx !== -1) {
      sectors[targetIdx] = {
        id: 13,
        label: "🎁 PHẦN THƯỞNG",
        type: "PRIZE",
        value: 500,
        color: "#fbbf24",
        textColor: "#78350f",
        isOverlay: true,
        overlayType: "PRIZE",
      };
    }
  } else if (mainRoundOrStage === 2) {
    const isFirst3M = Math.random() >= 0.5;
    const contents: ("PRIZE_3M" | "BANKRUPT")[] = isFirst3M
      ? ["PRIZE_3M", "BANKRUPT"]
      : ["BANKRUPT", "PRIZE_3M"];
    const targets = [
      { id: 13, basePoints: 100 },
      { id: 4, basePoints: 200 },
    ];

    targets.forEach((target, i) => {
      const idx = sectors.findIndex((s) => s.id === target.id);
      if (idx !== -1) {
        sectors[idx] = {
          id: target.id,
          label: "🔮 BÍ MẬT",
          type: "MYSTERY",
          color: "#8b5cf6",
          textColor: "#ffffff",
          isOverlay: true,
          overlayType: "MYSTERY",
          basePoints: target.basePoints,
          mysteryContent: contents[i],
        };
      }
    });
  } else if (mainRoundOrStage === 4) {
    // Vòng 4: Ô Tốc Độ ⚡ (id 13) và Ô Kim Cương 💎 Jackpot (id 4)
    const expIdx = sectors.findIndex((s) => s.id === 13);
    if (expIdx !== -1) {
      sectors[expIdx] = {
        id: 13,
        label: "⚡ TỐC ĐỘ",
        type: "EXPRESS",
        value: 1000,
        color: "#06b6d4",
        textColor: "#ffffff",
        isOverlay: true,
        overlayType: "EXPRESS",
      };
    }
    const jpIdx = sectors.findIndex((s) => s.id === 4);
    if (jpIdx !== -1) {
      sectors[jpIdx] = {
        id: 4,
        label: "💎 KIM CƯƠNG",
        type: "JACKPOT",
        value: 1500,
        color: "#ec4899",
        textColor: "#ffffff",
        isOverlay: true,
        overlayType: "JACKPOT",
      };
    }
  } else if (mainRoundOrStage === 5) {
    // Vòng 5: 2 Ô Chuyển Nhượng ⚔️ (Cướp 50% điểm vòng hoặc Hoán đổi điểm vòng) tại id 13 và id 16
    [13, 16].forEach((targetId) => {
      const idx = sectors.findIndex((s) => s.id === targetId);
      if (idx !== -1) {
        sectors[idx] = {
          id: targetId,
          label: "⚔️ ĐỐI ĐẦU",
          type: "STEAL_SWAP",
          value: 500,
          color: "#dc2626",
          textColor: "#fef08a",
          isOverlay: true,
          overlayType: "STEAL_SWAP",
        };
      }
    });
  } else if (mainRoundOrStage >= 6) {
    // Vòng 6+: Nhân đôi toàn bộ điểm cơ bản + Ô Nhân Ba 🔥 (id 17)
    sectors.forEach((s, i) => {
      if (s.type === "POINTS" && s.value) {
        const doubled = s.value * 2;
        sectors[i] = {
          ...s,
          value: doubled,
          label: String(doubled),
        };
      }
    });
    const tripleIdx = sectors.findIndex((s) => s.id === 17);
    if (tripleIdx !== -1) {
      sectors[tripleIdx] = {
        id: 17,
        label: "🔥 NHÂN BA",
        type: "TRIPLE",
        color: "#f97316",
        textColor: "#ffffff",
        isOverlay: true,
        overlayType: "TRIPLE",
      };
    }
  }

  return sectors;
}

export function generateSpecialRoundWheelSectors(): MagicWheelSector[] {
  return generateMagicWheelSectors(99, "SPECIAL_FINAL");
}

// ── Bảng chữ cái tiếng Việt dùng cho Bàn phím lật chữ ────────────────────────
export const VIETNAMESE_ALPHABET = [
  "A", "Ă", "Â", "B", "C", "D", "Đ", "E", "Ê", "G", "H", "I", "K", "L", "M",
  "N", "O", "Ô", "Ơ", "P", "Q", "R", "S", "T", "U", "Ư", "V", "X", "Y",
];

export const VIETNAMESE_BASE_VOWELS = [
  "A", "Ă", "Â", "E", "Ê", "I", "O", "Ô", "Ơ", "U", "Ư", "Y",
];

export type VietnameseToneKey = "NONE" | "SAC" | "HUYEN" | "HOI" | "NGA" | "NANG";
export type VietnameseToneMark = VietnameseToneKey;

export const VIETNAMESE_TONE_LABELS: Array<{ key: VietnameseToneKey; label: string; symbol: string; shortcut: string }> = [
  { key: "NONE", label: "Ngang", symbol: "—", shortcut: "Z/0" },
  { key: "SAC", label: "Sắc", symbol: "´", shortcut: "S/1" },
  { key: "HUYEN", label: "Huyền", symbol: "`", shortcut: "F/2" },
  { key: "HOI", label: "Hỏi", symbol: "ˀ", shortcut: "R/3" },
  { key: "NGA", label: "Ngã", symbol: "~", shortcut: "X/4" },
  { key: "NANG", label: "Nặng", symbol: ".", shortcut: "J/5" },
];

const VOWEL_TONE_TABLE: Record<string, Record<VietnameseToneKey, string>> = {
  A: { NONE: "A", SAC: "Á", HUYEN: "À", HOI: "Ả", NGA: "Ã", NANG: "Ạ" },
  Ă: { NONE: "Ă", SAC: "Ắ", HUYEN: "Ằ", HOI: "Ẳ", NGA: "Ẵ", NANG: "Ặ" },
  Â: { NONE: "Â", SAC: "Ấ", HUYEN: "Ầ", HOI: "Ẩ", NGA: "Ẫ", NANG: "Ậ" },
  E: { NONE: "E", SAC: "É", HUYEN: "È", HOI: "Ẻ", NGA: "Ẽ", NANG: "Ẹ" },
  Ê: { NONE: "Ê", SAC: "Ế", HUYEN: "Ề", HOI: "Ể", NGA: "Ễ", NANG: "Ệ" },
  I: { NONE: "I", SAC: "Í", HUYEN: "Ì", HOI: "Ỉ", NGA: "Ĩ", NANG: "Ị" },
  O: { NONE: "O", SAC: "Ó", HUYEN: "Ò", HOI: "Ỏ", NGA: "Õ", NANG: "Ọ" },
  Ô: { NONE: "Ô", SAC: "Ố", HUYEN: "Ồ", HOI: "Ổ", NGA: "Ỗ", NANG: "Ộ" },
  Ơ: { NONE: "Ơ", SAC: "Ớ", HUYEN: "Ờ", HOI: "Ở", NGA: "Ỡ", NANG: "Ợ" },
  U: { NONE: "U", SAC: "Ú", HUYEN: "Ù", HOI: "Ủ", NGA: "Ũ", NANG: "Ụ" },
  Ư: { NONE: "Ư", SAC: "Ứ", HUYEN: "Ừ", HOI: "Ử", NGA: "Ữ", NANG: "Ự" },
  Y: { NONE: "Y", SAC: "Ý", HUYEN: "Ỳ", HOI: "Ỷ", NGA: "Ỹ", NANG: "Ỵ" },
};

/**
 * Kiểm tra xem chữ cái gốc có phải nguyên âm tiếng Việt không
 */
export function isVietnameseVowel(char: string): boolean {
  const base = normalizeVietnameseBaseLetter(char);
  return VIETNAMESE_BASE_VOWELS.includes(base);
}

/**
 * Tách dấu thanh điệu từ một ký tự tiếng Việt
 */
export function extractToneFromVietnameseChar(char: string): VietnameseToneKey {
  const nfd = char.toUpperCase().normalize("NFD");
  if (nfd.includes("\u0301")) return "SAC";
  if (nfd.includes("\u0300")) return "HUYEN";
  if (nfd.includes("\u0309")) return "HOI";
  if (nfd.includes("\u0303")) return "NGA";
  if (nfd.includes("\u0323")) return "NANG";
  return "NONE";
}

/**
 * Gắn dấu thanh điệu vào nguyên âm gốc tiếng Việt
 */
export function applyToneToVietnameseVowel(baseChar: string, tone: VietnameseToneKey): string {
  const base = normalizeVietnameseBaseLetter(baseChar);
  const map = VOWEL_TONE_TABLE[base];
  if (!map) return base;
  return map[tone] || base;
}

/**
 * Chuẩn hóa ký tự tiếng Việt (bỏ dấu thanh điệu: sắc, huyền, hỏi, ngã, nặng)
 * Giữ nguyên chữ gốc có nón/móc như Ă, Â, Đ, Ê, Ô, Ơ, Ư
 */
export function normalizeVietnameseBaseLetter(char: string): string {
  const upper = char.toUpperCase();
  return upper
    .normalize("NFD")
    .replace(/[\u0300\u0301\u0303\u0309\u0323]/g, "") // Xóa 5 dấu thanh điệu
    .normalize("NFC");
}

/**
 * Tính số lượng chữ cái K được phép đoán trước ở Vòng Đặc Biệt
 * dựa vào độ dài từ khóa và tần suất xuất hiện của các chữ cái
 */
export function calculateSpecialRoundAllowedLetters(secretPhrase: string): number {
  const freq: Record<string, number> = {};
  for (const ch of secretPhrase) {
    if (/[a-zA-Zà-ỹÀ-Ỹ]/.test(ch)) {
      const base = normalizeVietnameseBaseLetter(ch);
      freq[base] = (freq[base] || 0) + 1;
    }
  }
  const uniqueLetters = Object.keys(freq);
  const uniqueCount = uniqueLetters.length;
  if (uniqueCount <= 3) return 2;

  const maxFreq = Math.max(0, ...Object.values(freq));
  let k = Math.round(uniqueCount * 0.35);
  if (maxFreq >= 4) k -= 1;
  return Math.max(2, Math.min(6, k));
}

/**
 * Kiểm tra xem một ký tự có trong từ khóa bí mật hay không
 */
export function checkLetterInSecretPhrase(
  phrase: string,
  letter: string,
  alreadyRevealedIndices: number[]
): {
  found: boolean;
  count: number;
  newRevealedIndices: number[];
  newlyOpenedIndices: number[];
} {
  const targetLetter = normalizeVietnameseBaseLetter(letter);
  const normalizedPhrase = phrase.split("").map((c) => normalizeVietnameseBaseLetter(c));

  const newIndices: number[] = [];
  normalizedPhrase.forEach((char, idx) => {
    if (char === targetLetter && !alreadyRevealedIndices.includes(idx)) {
      newIndices.push(idx);
    }
  });

  return {
    found: newIndices.length > 0,
    count: newIndices.length,
    newRevealedIndices: [...alreadyRevealedIndices, ...newIndices],
    newlyOpenedIndices: newIndices,
  };
}

/**
 * Kiểm tra xem toàn bộ các chữ cái gốc trong cụm từ đã được lật mở hết chưa
 */
export function isPuzzleFullyRevealed(phrase: string, revealedIndices: number[]): boolean {
  for (let i = 0; i < phrase.length; i++) {
    const char = phrase[i];
    if (/[A-ZÀ-Ỹa-zà-ỹ0-9]/.test(char)) {
      if (!revealedIndices.includes(i)) {
        return false;
      }
    }
  }
  return true;
}

/**
 * Đếm tỷ lệ chữ cái đã mở trên bảng (phục vụ Chuông Tăng Tốc ở Vòng 6+)
 */
export function getPuzzleRevealedRatio(phrase: string, revealedIndices: number[]): number {
  let totalLetters = 0;
  let openedLetters = 0;
  for (let i = 0; i < phrase.length; i++) {
    const char = phrase[i];
    if (/[a-zA-Zà-ỹÀ-Ỹ]/.test(char)) {
      totalLetters++;
      if (revealedIndices.includes(i)) openedLetters++;
    }
  }
  return totalLetters > 0 ? openedLetters / totalLetters : 0;
}

/**
 * So khớp toàn bộ đáp án giải ô chữ của người chơi với từ khóa gốc:
 * BẮT BUỘC KHỚP CHÍNH XÁC TỪNG DẤU THANH ĐIỆU VÀ CHỮ CÁI TIẾNG VIỆT (NFC).
 */
export function matchWholeSecretPhrase(phrase: string, guess: string): boolean {
  const cleanPhrase = phrase
    .trim()
    .toUpperCase()
    .normalize("NFC")
    .replace(/[^A-ZÀ-Ỹ0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const cleanGuess = guess
    .trim()
    .toUpperCase()
    .normalize("NFC")
    .replace(/[^A-ZÀ-Ỹ0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return cleanPhrase.length > 0 && cleanPhrase === cleanGuess;
}

/**
 * Sinh lời thoại MC ảo mềm dẻo, tự nhiên theo ngữ cảnh trận đấu
 */
export function generateFlexibleMCCommentary(
  eventOrParams:
    | string
    | {
        event: string;
        teamName?: string;
        nextTeamName?: string;
        letter?: string;
        count?: number;
        points?: number;
        earnedPoints?: number;
        sectorValue?: number;
        strikes?: number;
        category?: string;
        roundLabel?: string;
        round?: number;
      },
  extraParams?: {
    teamName?: string;
    nextTeamName?: string;
    letter?: string;
    count?: number;
    points?: number;
    earnedPoints?: number;
    sectorValue?: number;
    strikes?: number;
    category?: string;
    roundLabel?: string;
    round?: number;
  }
): string {
  const merged =
    typeof eventOrParams === "string"
      ? { event: eventOrParams, ...(extraParams || {}) }
      : { ...eventOrParams, ...(extraParams || {}) };

  const {
    event,
    teamName = "bạn",
    nextTeamName = "đội kế tiếp",
    letter = "",
    count = 0,
    points = merged.earnedPoints ?? merged.sectorValue ?? 0,
    strikes = 1,
    category = "",
    roundLabel = merged.round ? `Vòng ${merged.round}` : "vòng này",
  } = merged;
  const pick = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)];

  switch (event) {
    case "TOSS_UP_START":
      return `Bắt đầu ${roundLabel || "Vòng Đoán Nhanh"}! Nhanh tay bấm chuông khi đoán ra ô chữ!`;
    case "ROUND_START":
      return `${roundLabel}${category ? ` · Chủ đề: "${category}"` : ""}. Mời ${teamName} quay ô chữ!`;
    case "SPIN_HIGH":
      return `Ô điểm cao: ${points}đ! Mời ${teamName} đoán chữ cái.`;
    case "SPIN_NORMAL":
    case "SPIN_POINTS":
      return `Dừng ở ô ${points}đ. Mời ${teamName} đoán chữ cái!`;
    case "LOSE_TURN":
      return `Mất lượt! Quyền chơi chuyển sang ${nextTeamName}.`;
    case "BANKRUPT":
      return `Mất điểm! Điểm vòng về 0, chuyển lượt sang ${nextTeamName}.`;
    case "LETTER_HIT":
    case "LETTER_HIT_SINGLE":
    case "LETTER_HIT_MULTI":
      return count <= 1
        ? `Chính xác! Có 1 chữ "${letter}" (+${points}đ). Mời ${teamName} tiếp tục!`
        : `Chính xác! Có ${count} chữ "${letter}" (+${points}đ). Mời ${teamName} tiếp tục!`;
    case "LETTER_MISS":
      return `Không có chữ "${letter}" (${strikes}/3 X). Chuyển lượt sang ${nextTeamName}!`;
    case "ALL_BASE_REVEALED":
    case "ALL_LETTERS_OPEN_NEED_TONES":
      return `Đã lộ hết chữ cái gốc! Mời ${teamName} bấm GIẢI Ô CHỮ với đầy đủ dấu thanh!`;
    case "SOLVE_SUCCESS":
    case "SOLVE_WIN":
      return `Chính xác! Chúc mừng ${teamName} giải mã thành công (+${points}đ)!`;
    case "SOLVE_WRONG_TONE":
    case "SOLVE_FAIL":
      return `Đáp án chưa chính xác (${strikes}/3 X)! Chuyển lượt sang ${nextTeamName}.`;
    case "SPECIAL_START":
    case "SPECIAL_INTRO":
      return `Vòng Đặc Biệt: Mời ${teamName} chọn phần thi trước!`;
    default:
      return `Mời ${teamName} tiếp tục phần thi!`;
  }
}

/**
 * Tính toán góc dừng của vòng quay dựa trên lực quay và số sector
 */
export function calculateSpinDestination(
  currentDegrees: number,
  powerPercent: number, // 0 to 100
  totalSectors: number = 24
): {
  targetDegrees: number;
  landingSectorIndex: number;
} {
  const sectorAngle = 360 / totalSectors;
  const powerFactor = Math.max(0.1, Math.min(1.0, powerPercent / 100));
  const minFullSpins = 4;
  const additionalSpins = Math.floor(powerFactor * 3);
  const totalFullSpins = minFullSpins + additionalSpins;

  // Determine current sector at 12 o'clock
  const currentAngle = (360 - (currentDegrees % 360)) % 360;
  const currentSector = Math.floor(currentAngle / sectorAngle) % totalSectors;

  // Travel a deterministic distance based on spin power + natural variation
  const travelSectors = Math.floor(powerFactor * totalSectors * 2) + Math.floor(Math.random() * totalSectors);
  const landingSectorIndex = (currentSector + travelSectors + 1) % totalSectors;

  // Crucial physical detent ratchet behavior:
  // Wheel NEVER stops perched on a peg! Settle securely within the central 50% body of the sector (safe margin >= 3.75 deg from any peg)
  const safeJitter = (Math.random() - 0.5) * (sectorAngle * 0.5); // [-0.25*sectorAngle, +0.25*sectorAngle]
  const thetaTarget = (landingSectorIndex + 0.5) * sectorAngle + safeJitter;

  // Calculate rotation degrees needed to align thetaTarget with 12 o'clock (0 deg)
  const neededMod360 = (360 - (thetaTarget % 360)) % 360;
  const currentMod360 = currentDegrees % 360;
  let deltaMod = neededMod360 - currentMod360;
  if (deltaMod <= 0) deltaMod += 360;

  const targetDegrees = Math.round(currentDegrees + totalFullSpins * 360 + deltaMod);

  return {
    targetDegrees,
    landingSectorIndex,
  };
}

/**
 * Kho câu đố ô chữ chuẩn Gameshow Chiếc Nón Kỳ Diệu
 * Cấu trúc chuẩn: 2 Vòng Đoán Nhanh + 8 Vòng Chơi Chính tối đa (tương ứng tối đa 8 đội) + 1 Vòng Đặc Biệt = 11 Vòng
 */
export const DEFAULT_MAGIC_WHEEL_PUZZLES: MagicWheelPuzzle[] = [
  {
    id: "puzzle-tossup-1",
    roundNumber: 1,
    stage: "TOSS_UP_1",
    category: "ĐOÁN NHANH 1: DI SẢN LỊCH SỬ",
    secretPhrase: "HOÀNG THÀNH THĂNG LONG",
    clue: "Quần thể di tích lịch sử cố đô ngàn năm văn hiến được UNESCO vinh danh là Di sản Thế giới.",
    revealedIndices: [],
  },
  {
    id: "puzzle-tossup-2",
    roundNumber: 2,
    stage: "TOSS_UP_2",
    category: "ĐOÁN NHANH 2: VĂN HÓA ẨM THỰC",
    secretPhrase: "BÁNH CHƯNG - BÁNH GIẦY",
    clue: "Hai thức bánh tượng trưng trời tròn đất vuông gắn với truyền thuyết hoàng tử Lang Liêu đời vua Hùng.",
    revealedIndices: [],
  },
  {
    id: "puzzle-r1",
    roundNumber: 3,
    stage: "MAIN",
    mainRoundIndex: 1,
    category: "VÒNG 1: DANH NHÂN LỊCH SỬ",
    secretPhrase: "NGUYỄN TRÃI",
    clue: "Nhà quân sự, danh nhân văn hóa lỗi lạc thế giới của Việt Nam thời Hậu Lê.",
    revealedIndices: [],
  },
  {
    id: "puzzle-r2",
    roundNumber: 4,
    stage: "MAIN",
    mainRoundIndex: 2,
    category: "VÒNG 2: DI SẢN THIÊN NHIÊN",
    secretPhrase: "VỊNH HẠ LONG",
    clue: "Kỳ quan thiên nhiên thế giới với hàng nghìn đảo đá vôi kỳ vĩ tại Quảng Ninh.",
    revealedIndices: [],
  },
  {
    id: "puzzle-r3",
    roundNumber: 5,
    stage: "MAIN",
    mainRoundIndex: 3,
    category: "VÒNG 3: THÀNH NGỮ TỤC NGỮ",
    secretPhrase: "UỐNG NƯỚC NHỚ NGUỒN",
    clue: "Truyền thống đạo lý tri ân sâu sắc các thế hệ đi trước của dân tộc Việt Nam.",
    revealedIndices: [],
  },
  {
    id: "puzzle-r4",
    roundNumber: 6,
    stage: "MAIN",
    mainRoundIndex: 4,
    category: "VÒNG 4: VĂN HỌC VIỆT NAM",
    secretPhrase: "DẾ MÈN PHIÊU LƯU KÝ",
    clue: "Tác phẩm văn học thiếu nhi kinh điển nổi tiếng nhất của nhà văn Tô Hoài.",
    revealedIndices: [],
  },
  {
    id: "puzzle-r5",
    roundNumber: 7,
    stage: "MAIN",
    mainRoundIndex: 5,
    category: "VÒNG 5: LÀNG NGHỀ TRUYỀN THỐNG",
    secretPhrase: "GỐM SỨ BÁT TRÀNG",
    clue: "Làng nghề làm gốm lâu đời nằm bên bờ sông Hồng thuộc huyện Gia Lâm, Hà Nội.",
    revealedIndices: [],
  },
  {
    id: "puzzle-r6",
    roundNumber: 8,
    stage: "MAIN",
    mainRoundIndex: 6,
    category: "VÒNG 6: ÂM NHẠC DÂN TỘC",
    secretPhrase: "NHÃ NHẠC CUNG ĐÌNH HUẾ",
    clue: "Loại hình âm nhạc bác học đầu tiên của Việt Nam được UNESCO vinh danh.",
    revealedIndices: [],
  },
  {
    id: "puzzle-r7",
    roundNumber: 9,
    stage: "MAIN",
    mainRoundIndex: 7,
    category: "VÒNG 7: KỲ QUAN HANG ĐỘNG",
    secretPhrase: "HANG SƠN ĐOÒNG",
    clue: "Hang động tự nhiên lớn nhất thế giới nằm trong quần thể Phong Nha - Kẻ Bàng.",
    revealedIndices: [],
  },
  {
    id: "puzzle-r8",
    roundNumber: 10,
    stage: "MAIN",
    mainRoundIndex: 8,
    category: "VÒNG 8: KHOA HỌC CÔNG NGHỆ",
    secretPhrase: "TRÍ TUỆ NHÂN TẠO",
    clue: "Lĩnh vực công nghệ đột phá mô phỏng tư duy và khả năng học hỏi của con người.",
    revealedIndices: [],
  },
  {
    id: "puzzle-final",
    roundNumber: 11,
    stage: "SPECIAL_FINAL",
    category: "VÒNG ĐẶC BIỆT: KIỆT TÁC THI CA",
    secretPhrase: "TRUYỆN KIỀU NGUYỄN DU",
    clue: "Kiệt tác thơ Nôm lục bát bất hủ được xem là đỉnh cao của nền văn học trung đại Việt Nam.",
    revealedIndices: [],
  },
];

/**
 * Xây dựng danh sách các vòng chơi tự động mở rộng theo số đội (N = min(8, max(3, teamsCount))):
 * [Đoán nhanh 1] -> [Đoán nhanh 2] -> [Vòng chính 1 .. Vòng chính N] -> [Vòng Đặc Biệt]
 */
export function buildMagicWheelMatchPuzzles(
  firstArg?: number | Array<{ roundNumber?: number; stage?: MagicWheelRoundStage; category: string; secretPhrase: string; clue?: string }>,
  secondArg?: number | Array<{ roundNumber?: number; stage?: MagicWheelRoundStage; category: string; secretPhrase: string; clue?: string }>
): MagicWheelPuzzle[] {
  const teamsCount =
    typeof firstArg === "number"
      ? firstArg
      : typeof secondArg === "number"
      ? secondArg
      : 3;
  const customPuzzles = Array.isArray(firstArg)
    ? firstArg
    : Array.isArray(secondArg)
    ? secondArg
    : undefined;

  const totalMainRounds = Math.min(8, Math.max(3, teamsCount || 3));
  const pool = customPuzzles && customPuzzles.length >= 4
    ? customPuzzles.map((p, idx) => ({
        id: `custom-puzzle-${idx + 1}`,
        roundNumber: idx + 1,
        stage: p.stage,
        category: p.category || "TỔNG HỢP",
        secretPhrase: (p.secretPhrase || "VIỆT NAM").toUpperCase().normalize("NFC"),
        clue: p.clue || "Lắng nghe gợi ý từ người dẫn chương trình và giải ô chữ!",
        revealedIndices: [] as number[],
      }))
    : [];

  const defaultTossUp1 = DEFAULT_MAGIC_WHEEL_PUZZLES[0];
  const defaultTossUp2 = DEFAULT_MAGIC_WHEEL_PUZZLES[1];
  const defaultMainPool = DEFAULT_MAGIC_WHEEL_PUZZLES.filter((p) => p.stage === "MAIN");
  const defaultSpecial = DEFAULT_MAGIC_WHEEL_PUZZLES[DEFAULT_MAGIC_WHEEL_PUZZLES.length - 1];

  const schedule: MagicWheelPuzzle[] = [];

  // 1. Đoán nhanh 1
  const tu1Source = pool[0] || defaultTossUp1;
  schedule.push({
    ...tu1Source,
    id: "mw-tossup-1",
    roundNumber: 1,
    stage: "TOSS_UP_1",
    category: tu1Source.category.includes("ĐOÁN NHANH") ? tu1Source.category : `ĐOÁN NHANH 1: ${tu1Source.category}`,
    revealedIndices: [],
  });

  // 2. Đoán nhanh 2
  const tu2Source = pool[1] || defaultTossUp2;
  schedule.push({
    ...tu2Source,
    id: "mw-tossup-2",
    roundNumber: 2,
    stage: "TOSS_UP_2",
    category: tu2Source.category.includes("ĐOÁN NHANH") ? tu2Source.category : `ĐOÁN NHANH 2: ${tu2Source.category}`,
    revealedIndices: [],
  });

  // 3. Các Vòng Chính 1..N (lấy từ phần giữa của pool câu hỏi: từ index 2 đến trước phần tử cuối cùng)
  const customMainSlice = pool.length >= 4 ? pool.slice(2, pool.length - 1) : [];
  for (let m = 1; m <= totalMainRounds; m++) {
    const customMain = customMainSlice[m - 1];
    const fallbackMain = defaultMainPool[(m - 1) % defaultMainPool.length];
    const src = customMain || fallbackMain;
    const cleanCat = src.category.replace(/^(VÒNG \d+|ĐOÁN NHANH \d+|VÒNG ĐẶC BIỆT):\s*/i, "");
    schedule.push({
      ...src,
      id: `mw-main-${m}`,
      roundNumber: 2 + m,
      stage: "MAIN",
      mainRoundIndex: m,
      category: `VÒNG ${m}: ${cleanCat}`,
      revealedIndices: [],
    });
  }

  // 4. Vòng Đặc Biệt (luôn ưu tiên lấy câu cuối cùng trong bộ đề mẫu/custom)
  const specialSource = pool.length >= 4 ? pool[pool.length - 1] : defaultSpecial;
  const cleanSpecialCat = specialSource.category.replace(/^(VÒNG \d+|ĐOÁN NHANH \d+|VÒNG ĐẶC BIỆT):\s*/i, "");
  schedule.push({
    ...specialSource,
    id: "mw-special-final",
    roundNumber: 2 + totalMainRounds + 1,
    stage: "SPECIAL_FINAL",
    category: `VÒNG ĐẶC BIỆT: ${cleanSpecialCat}`,
    revealedIndices: [],
  });

  return schedule;
}
