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
  | "FREE_PLAY"
  | "WILD_CARD"
  | "PRIZE"
  | "MYSTERY"
  | "EXPRESS"
  | "JACKPOT"
  | "STEAL_SWAP"
  | "TRIPLE"
  | "ONE_MILLION"
  | "ONE_MILLION_SANDWICH"
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
  overlayType?: "PRIZE" | "MYSTERY" | "EXPRESS" | "JACKPOT" | "STEAL_SWAP" | "TRIPLE" | "WILD_CARD" | "FREE_SPIN" | "ONE_MILLION" | "SPECIAL_ENVELOPE";
  isSandwich?: boolean;
  basePoints?: number;
  mysteryContent?: "PRIZE_3M" | "BANKRUPT";
  envelopePrizePoints?: number;
  envelopeTitle?: string;
}

export type MagicWheelPuzzleType = "STANDARD" | "CROSSWORD";

export interface CrosswordWordItem {
  id: string;
  word: string;                   // Từ khoá (vd: "DANTE", "TƯỢNG HỌC")
  row: number;                    // Hàng bắt đầu (0..3)
  col: number;                    // Cột bắt đầu (0..13)
  direction: "ACROSS" | "DOWN";   // Hướng: Ngang (ACROSS) hoặc Dọc (DOWN)
  clue?: string;                  // Gợi ý tuỳ chọn cho từ
}

export interface MagicWheelPuzzle {
  id: string;
  roundNumber: number; // Thứ tự tổng thể trong trận (1, 2, 3...)
  stage?: MagicWheelRoundStage; // TOSS_UP_1, TOSS_UP_2, MAIN, SPECIAL_FINAL
  mainRoundIndex?: number; // 1, 2, 3, 4... nếu là vòng MAIN
  category: string;    // "Danh nhân", "Địa danh", "Văn học", "Khoa học"
  secretPhrase: string; // "NGUYỄN TRÃI"
  clue?: string;        // "Nhà quân sự, danh nhân văn hóa..."
  clueDisplayMode?: "CATEGORY" | "CLUE"; // Chế độ hiển thị: Chủ đề hay Gợi ý
  revealedIndices: number[]; // Vị trí các ký tự đã được lật mở (chỉ hiện chữ gốc không dấu khi chưa giải xong)
  puzzleType?: MagicWheelPuzzleType; // "STANDARD" | "CROSSWORD"
  crosswordWords?: CrosswordWordItem[]; // Danh sách các từ đan xen trong Ô Chữ Liên Kết
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
    | "FREE_PLAY"
    | "MYSTERY"
    | "PRIZE"
    | "EXPRESS"
    | "JACKPOT"
    | "STEAL_SWAP"
    | "ONE_MILLION_SANDWICH";
  phase:
    | "TOSS_UP_READY"     // Chờ bắt đầu chạy mở chữ ngẫu nhiên 0.75s/chữ
    | "TOSS_UP_RUNNING"   // Đang mở chữ ngẫu nhiên 0.75s/chữ, chờ bấm chuông
    | "TOSS_UP_BUZZED"    // Có đội vừa bấm chuông, tạm dừng mở chữ để trả lời (5s)
    | "SPIN_WAITING"      // Chờ đội đến lượt bấm quay
    | "SPINNING"          // Nón đang xoay
    | "SECTOR_RESULT"     // Nón đã dừng, thông báo kết quả ô quay
    | "ACTION_INPUT"      // Chờ đoán chữ cái / trả lời quiz / giải ô chữ
    | "VOWEL_BUY"         // Bản Anh: Chờ chọn 1 trong 5 nguyên âm (A, E, I, O, U) với 250đ
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
  prizeCash?: Record<string, number>; // Tiền thưởng vĩnh viễn (V2 3M, V3 quà tiền) - không tính vào kết quả xét đội vào vòng đặc biệt
  physicalPrizes?: Record<string, string[]>; // Quà tặng vật chất (Vòng 3: Nồi chiên không dầu, Bộ nồi Inox 5 đáy & Máy xay)
  tieBreakerPending?: boolean; // Cờ chờ Ô Chữ Phụ khi có hòa điểm xét vào Vòng Đặc Biệt
  tiedTeamIds?: string[]; // Danh sách các đội hòa điểm cao nhất cần đấu Ô Chữ Phụ
  teamShields?: Record<string, boolean>;
  round3TradedTeams?: string[];
  round3ForbiddenSolveTeams?: string[];
  round3FirstTurnAttempted?: Record<string, boolean>; // V3: Đội đã thử lượt quay đầu tiên hợp lệ hay chưa
  isFreePlayActive?: boolean; // Bản Anh: Đang ở lượt quay Free Play (gọi nguyên âm 0đ, sai không mất lượt)
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
  millionTokenTeamId?: string; // V5: Đội đang nắm giữ Thẻ 1 Triệu Đồng (bảo toàn tới Chung Kết đổi giải 1 Tỷ)
  held25kBonusTeams?: Record<string, number>; // V5: Số lần đội đang giữ 25.000 điểm thưởng nóng từ ô kẹp Mất Điểm (mỗi lần dính Mất Điểm sẽ bị thu hồi 1 lần 25.000đ)
  hasMillionPrizeInSpecial?: boolean; // Cờ kích hoạt giải thưởng 1 TỶ ĐỒNG ở Vòng Đặc Biệt
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
  edition?: "VIETNAMESE" | "ENGLISH"; // Phiên bản Việt (VTV3) hoặc Anh (Wheel of Fortune)
  blackoutGuessedLetters?: boolean;   // Admin setting: Có bôi đen/làm mờ chữ cái đã đoán hay không (mặc định: true)
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
 * Bảng 24 ô chuẩn Mỹ (US Wheel of Fortune):
 * - Hoàn toàn không có ô Nhân đôi và Chia đôi!
 * - 2 ô BANKRUPT (Hazard 1 ở #8, Hazard 2 ở #11 thay thế cho Chia đôi).
 * - 1 ô LOSE A TURN ở #2.
 * - 1 ô FREE PLAY ở #14 (thay thế cho May Mắn).
 * - 1 ô WILD CARD ở #17 (thay thế cho Nhân đôi).
 * - 1 ô TOP DOLLAR ở #23 ($2,500 V1, $3,500 V2-3, $5,000 V4+).
 * - Các ô tiền mặt: $500, $600, $650, $700, $800, $900, $1,000.
 */
export const US_BASE_24_SECTORS: MagicWheelSector[] = [
  { id: 0, label: "$500", type: "POINTS", value: 500, color: "#e11d48", textColor: "#ffffff" },
  { id: 1, label: "$600", type: "POINTS", value: 600, color: "#2563eb", textColor: "#ffffff" },
  { id: 2, label: "LOSE A TURN", type: "LOSE_TURN", color: "#475569", textColor: "#f8fafc" },
  { id: 3, label: "$700", type: "POINTS", value: 700, color: "#d97706", textColor: "#ffffff" },
  { id: 4, label: "$500", type: "POINTS", value: 500, color: "#059669", textColor: "#ffffff" },
  { id: 5, label: "$500", type: "POINTS", value: 500, color: "#0284c7", textColor: "#ffffff", overlayType: "FREE_SPIN" },
  { id: 6, label: "$650", type: "POINTS", value: 650, color: "#7c3aed", textColor: "#ffffff" },
  { id: 7, label: "$900", type: "POINTS", value: 900, color: "#ea580c", textColor: "#ffffff" },
  { id: 8, label: "BANKRUPT", type: "BANKRUPT", color: "#000000", textColor: "#ef4444" },
  { id: 9, label: "$500", type: "POINTS", value: 500, color: "#0d9488", textColor: "#ffffff" },
  { id: 10, label: "$1000", type: "POINTS", value: 1000, color: "#f59e0b", textColor: "#000000" },
  { id: 11, label: "BANKRUPT", type: "BANKRUPT", color: "#000000", textColor: "#ef4444" },
  { id: 12, label: "$600", type: "POINTS", value: 600, color: "#4f46e5", textColor: "#ffffff" },
  { id: 13, label: "$500", type: "POINTS", value: 500, color: "#16a34a", textColor: "#ffffff" },
  { id: 14, label: "FREE PLAY", type: "FREE_PLAY", color: "#10b981", textColor: "#ffffff" },
  { id: 15, label: "$800", type: "POINTS", value: 800, color: "#c026d3", textColor: "#ffffff" },
  { id: 16, label: "$650", type: "POINTS", value: 650, color: "#0891b2", textColor: "#ffffff" },
  { id: 17, label: "WILD CARD", type: "WILD_CARD", color: "#06b6d4", textColor: "#ffffff" },
  { id: 18, label: "$500", type: "POINTS", value: 500, color: "#3b82f6", textColor: "#ffffff" },
  { id: 19, label: "$700", type: "POINTS", value: 700, color: "#eab308", textColor: "#000000" },
  { id: 20, label: "$600", type: "POINTS", value: 600, color: "#9333ea", textColor: "#ffffff" },
  { id: 21, label: "$900", type: "POINTS", value: 900, color: "#f97316", textColor: "#ffffff" },
  { id: 22, label: "$1000", type: "POINTS", value: 1000, color: "#e11d48", textColor: "#ffffff" },
  { id: 23, label: "$2500", type: "POINTS", value: 2500, color: "#ffd700", textColor: "#000000" },
];

/**
 * Chuyển đổi nhãn và loại ô theo phiên bản Việt Nam (VTV3) hoặc Mỹ (Wheel of Fortune)
 */
export function localizeSectorsForEdition(
  sectors: MagicWheelSector[],
  edition: "VIETNAMESE" | "ENGLISH" = "VIETNAMESE"
): MagicWheelSector[] {
  if (edition !== "ENGLISH") return sectors;

  return sectors.map((s) => {
    let label = s.label;
    let type = s.type;
    let color = s.color;

    if (type === "LOSE_TURN") {
      label = "LOSE A TURN";
    } else if (type === "BANKRUPT") {
      label = "BANKRUPT";
    } else if (type === "EXTRA_TURN") {
      label = "FREE SPIN";
    } else if (type === "HALF") {
      label = "HALF";
    } else if (type === "DOUBLE") {
      label = "DOUBLE";
    } else if (type === "LUCKY" || type === "FREE_PLAY") {
      label = "FREE PLAY";
      type = "FREE_PLAY";
      color = "#10b981"; // Emerald green cho Free Play
    } else if (s.isOverlay && s.overlayType === "PRIZE") {
      label = "PRIZE";
    } else if (s.isOverlay && s.overlayType === "MYSTERY") {
      label = "MYSTERY";
    } else if (s.isOverlay && s.overlayType === "EXPRESS") {
      label = "EXPRESS";
    } else if (s.isOverlay && s.overlayType === "JACKPOT") {
      label = "JACKPOT";
    } else if (s.isOverlay && s.overlayType === "TRIPLE") {
      label = "TRIPLE";
    } else if (type === "STEAL_SWAP") {
      label = "STEAL/SWAP";
    } else if (type === "WILD_CARD") {
      label = "WILD CARD";
    } else if (type === "SPECIAL_ENVELOPE") {
      label = "SPECIAL ENV.";
    } else if (type === "BONUS_ENVELOPE") {
      label = "BONUS ENV.";
    } else if (type === "POINTS" && s.value) {
      label = `$${s.value}`;
    }

    return {
      ...s,
      label,
      type,
      color,
    };
  });
}

/**
 * Sinh cấu hình 24 ô theo từng vòng chơi:
 * - Vòng Chính 1: Ô Phần Thưởng (20 lá thăm) / Prize
 * - Vòng Chính 2: 2 Ô Bí Mật / Mystery
 * - Vòng Chính 3: Vòng Đổi hay Không Đổi (bàn xoay chuẩn 24 ô)
 * - Vòng Chính 4: Ô Tốc Độ ⚡ (Express 1000đ/chữ) + Ô Kim Cương 💎 (Jackpot tích lũy)
 * - Vòng Chính 5: Ô Siêu Điểm Thưởng cá nhân (2000, 3000)
 * - Vòng Chính 6+: Nhân đôi điểm cơ bản + Ô Nhân Ba 🔥 (x3 / Triple)
 * - Vòng Đặc Biệt (round = 99 / stage = SPECIAL_FINAL): 24 Phong bì Giải thưởng Đặc Biệt
 */
export function generateMagicWheelSectors(
  mainRoundOrStage: number,
  stage?: MagicWheelRoundStage,
  edition: "VIETNAMESE" | "ENGLISH" = "VIETNAMESE",
  hasMillionPrize: boolean = false
): MagicWheelSector[] {
  if (stage === "SPECIAL_FINAL" || mainRoundOrStage === 99) {
    const specialPalette = [
      { pts: 2000, labelVi: "PHONG BÌ 2000", labelEn: "ENVELOPE $2000", color: "#2563eb", textColor: "#ffffff" },
      { pts: 3000, labelVi: "PHONG BÌ 3000", labelEn: "ENVELOPE $3000", color: "#7c3aed", textColor: "#ffffff" },
      { pts: 4000, labelVi: "PHONG BÌ 4000", labelEn: "ENVELOPE $4000", color: "#059669", textColor: "#ffffff" },
      { pts: 5000, labelVi: "PHONG BÌ 5000", labelEn: "ENVELOPE $5000", color: "#e11d48", textColor: "#ffffff" },
      { pts: 8000, labelVi: "PHONG BÌ 8000", labelEn: "ENVELOPE $8000", color: "#ea580c", textColor: "#ffffff" },
      { pts: 25000, labelVi: "ĐẶC BIỆT 25000", labelEn: "SPECIAL $25000", color: "#ffd700", textColor: "#78350f" },
    ];
    return Array.from({ length: 24 }, (_, idx) => {
      const item = specialPalette[idx % specialPalette.length];
      const isEn = edition === "ENGLISH";
      return {
        id: idx,
        label: isEn ? `$${item.pts}` : `${item.pts}`,
        type: "SPECIAL_ENVELOPE" as const,
        value: item.pts,
        color: item.color,
        textColor: item.textColor,
        isOverlay: true,
        overlayType: "SPECIAL_ENVELOPE" as const,
        envelopePrizePoints: item.pts,
        envelopeTitle: isEn ? item.labelEn : item.labelVi,
      };
    });
  }

  if (edition === "ENGLISH") {
    const sectors = US_BASE_24_SECTORS.map((s) => ({ ...s }));

    // Top Dollar Wedge on Sector #23 (Chuẩn US Wheel of Fortune)
    const topVal = mainRoundOrStage === 1 ? 2500 : (mainRoundOrStage <= 3 ? 3500 : 5000);
    sectors[23] = {
      id: 23,
      label: `$${topVal}`,
      type: "POINTS",
      value: topVal,
      color: "#ffd700",
      textColor: "#000000",
    };

    if (mainRoundOrStage === 1) {
      // Vòng 1: Gift Tag / Prize wedge ($1,000) trên Sector #13
      const targetIdx = sectors.findIndex((s) => s.id === 13);
      if (targetIdx !== -1) {
        sectors[targetIdx] = {
          id: 13,
          label: "PRIZE",
          type: "PRIZE",
          value: 1000,
          color: "#fbbf24",
          textColor: "#78350f",
          isOverlay: true,
          overlayType: "PRIZE",
        };
      }
    } else if (mainRoundOrStage === 2) {
      // Vòng 2: Hai ô Mystery Wedges ($1,000) trên #13 và #4
      const isFirst3M = Math.random() >= 0.5;
      const contents: ("PRIZE_3M" | "BANKRUPT")[] = isFirst3M
        ? ["PRIZE_3M", "BANKRUPT"]
        : ["BANKRUPT", "PRIZE_3M"];
      [13, 4].forEach((targetId, i) => {
        const idx = sectors.findIndex((s) => s.id === targetId);
        if (idx !== -1) {
          sectors[idx] = {
            id: targetId,
            label: "MYSTERY",
            type: "MYSTERY",
            color: "#8b5cf6",
            textColor: "#ffffff",
            isOverlay: true,
            overlayType: "MYSTERY",
            basePoints: 1000,
            mysteryContent: contents[i],
          };
        }
      });
    } else if (mainRoundOrStage === 3) {
      // Vòng 3: Express Wedge ($1,000) trên Sector #13
      const expIdx = sectors.findIndex((s) => s.id === 13);
      if (expIdx !== -1) {
        sectors[expIdx] = {
          id: 13,
          label: "EXPRESS",
          type: "EXPRESS",
          value: 1000,
          color: "#06b6d4",
          textColor: "#ffffff",
          isOverlay: true,
          overlayType: "EXPRESS",
        };
      }
    } else if (mainRoundOrStage === 4) {
      // Vòng 4: Diamond Jackpot ($1,500) trên Sector #4
      const jpIdx = sectors.findIndex((s) => s.id === 4);
      if (jpIdx !== -1) {
        sectors[jpIdx] = {
          id: 4,
          label: "JACKPOT",
          type: "JACKPOT",
          value: 1500,
          color: "#ec4899",
          textColor: "#ffffff",
          isOverlay: true,
          overlayType: "JACKPOT",
        };
      }
    } else if (mainRoundOrStage === 5) {
      // Vòng 5: Ô 25.000 điểm áp dụng cho mọi phiên bản
      const idx13 = sectors.findIndex((s) => s.id === 13);
      if (idx13 !== -1) {
        sectors[idx13] = {
          id: 13,
          label: "25000",
          type: "ONE_MILLION_SANDWICH",
          value: 25000,
          color: "#059669",
          textColor: "#ffffff",
          isOverlay: true,
          overlayType: "ONE_MILLION",
          isSandwich: true,
        };
      }
    }

    return sectors;
  }

  const sectors = BASE_24_SECTORS.map((s) => ({ ...s }));

  if (mainRoundOrStage === 1) {
    const targetIdx = sectors.findIndex((s) => s.id === 13);
    if (targetIdx !== -1) {
      sectors[targetIdx] = {
        id: 13,
        label: "PHẦN THƯỞNG",
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
          label: "BÍ MẬT",
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
    // Vòng 4: Ô Tốc Độ (id 13) và Ô Kim Cương Jackpot (id 4)
    const expIdx = sectors.findIndex((s) => s.id === 13);
    if (expIdx !== -1) {
      sectors[expIdx] = {
        id: 13,
        label: "TỐC ĐỘ",
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
        label: "KIM CƯƠNG",
        type: "JACKPOT",
        value: 1500,
        color: "#ec4899",
        textColor: "#ffffff",
        isOverlay: true,
        overlayType: "JACKPOT",
      };
    }
  } else if (mainRoundOrStage === 5) {
    const idx13 = sectors.findIndex((s) => s.id === 13);
    if (idx13 !== -1) {
      sectors[idx13] = {
        id: 13,
        label: "25000",
        type: "ONE_MILLION_SANDWICH",
        value: 25000,
        color: "#059669",
        textColor: "#ffffff",
        isOverlay: true,
        overlayType: "ONE_MILLION",
        isSandwich: true,
      };
    }
    const idx16 = sectors.findIndex((s) => s.id === 16);
    if (idx16 !== -1) {
      sectors[idx16] = {
        id: 16,
        label: "3000",
        type: "POINTS",
        value: 3000,
        color: "#f59e0b",
        textColor: "#ffffff",
      };
    }
  } else if (mainRoundOrStage >= 6) {
    // Vòng 6+: Nhân đôi toàn bộ điểm cơ bản + Ô Nhân Ba (id 17)
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
      const baseTripleValue = sectors[tripleIdx].value ?? 3000;
      sectors[tripleIdx] = {
        id: 17,
        label: "NHÂN BA",
        type: "TRIPLE",
        value: baseTripleValue,
        color: "#f97316",
        textColor: "#ffffff",
        isOverlay: true,
        overlayType: "TRIPLE",
      };
    }
  }

  return localizeSectorsForEdition(sectors, edition);
}

export function generateSpecialRoundWheelSectors(edition: "VIETNAMESE" | "ENGLISH" = "VIETNAMESE"): MagicWheelSector[] {
  return generateMagicWheelSectors(99, "SPECIAL_FINAL", edition);
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
 * Kiểm tra xem một ký tự có phải là chữ cái tiếng Việt / Latinh hay không (A-Z, Ă, Â, Đ, Ê, Ô, Ơ, Ư...)
 * Không tính các chữ số (0-9), dấu câu, ký tự đặc biệt hay khoảng trắng.
 */
export function isVietnameseAlphabetLetter(char: string): boolean {
  if (!char || char.length !== 1) return false;
  return /^[A-ZÀ-Ỹa-zà-ỹ]$/.test(char);
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

export const stripVietnameseToneKeepBase = normalizeVietnameseBaseLetter;

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
export function isPuzzleFullyRevealed(
  phraseOrPuzzle: string | MagicWheelPuzzle,
  revealedIndices: number[]
): boolean {
  if (typeof phraseOrPuzzle === "object" && phraseOrPuzzle !== null) {
    if (phraseOrPuzzle.puzzleType === "CROSSWORD" && phraseOrPuzzle.crosswordWords && phraseOrPuzzle.crosswordWords.length > 0) {
      const layout = validateCrosswordLayout(phraseOrPuzzle.crosswordWords);
      for (const [gridKey, cellInfo] of layout.cellMap.entries()) {
        if (cellInfo.isLetter && !revealedIndices.includes(gridKey)) {
          return false;
        }
      }
      return true;
    }
    return isPuzzleFullyRevealed(phraseOrPuzzle.secretPhrase || "", revealedIndices);
  }

  const phrase = phraseOrPuzzle;
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
 * Kiểm tra xem ô chữ còn phụ âm nào chưa lật hay không (dành cho Bản Anh & Luật Vòng 3)
 */
export function hasRemainingConsonants(phraseOrPuzzle: string | MagicWheelPuzzle, revealedIndices: number[]): boolean {
  if (!phraseOrPuzzle) return false;
  const vowels = ["A", "E", "I", "O", "U"];
  if (typeof phraseOrPuzzle === "object" && phraseOrPuzzle !== null) {
    if (phraseOrPuzzle.puzzleType === "CROSSWORD" && phraseOrPuzzle.crosswordWords && phraseOrPuzzle.crosswordWords.length > 0) {
      const layout = validateCrosswordLayout(phraseOrPuzzle.crosswordWords);
      for (const [gridKey, cellInfo] of layout.cellMap.entries()) {
        if (cellInfo.isLetter && !revealedIndices.includes(gridKey)) {
          if (!vowels.includes(cellInfo.baseChar)) {
            return true;
          }
        }
      }
      return false;
    }
    return hasRemainingConsonants(phraseOrPuzzle.secretPhrase || "", revealedIndices);
  }

  const phrase = phraseOrPuzzle;
  const upper = phrase.toUpperCase();
  for (let i = 0; i < upper.length; i++) {
    const ch = upper[i];
    if (/[A-Z]/.test(ch) && !revealedIndices.includes(i)) {
      if (!vowels.includes(ch)) {
        return true; // Vẫn còn ít nhất 1 phụ âm chưa đoán!
      }
    }
  }
  return false;
}

/**
 * Kiểm tra xem ô chữ còn nguyên âm nào chưa lật hay không (dành cho Bản Anh)
 */
export function hasRemainingVowels(phraseOrPuzzle: string | MagicWheelPuzzle, revealedIndices: number[]): boolean {
  if (!phraseOrPuzzle) return false;
  const vowels = ["A", "E", "I", "O", "U"];
  if (typeof phraseOrPuzzle === "object" && phraseOrPuzzle !== null) {
    if (phraseOrPuzzle.puzzleType === "CROSSWORD" && phraseOrPuzzle.crosswordWords && phraseOrPuzzle.crosswordWords.length > 0) {
      const layout = validateCrosswordLayout(phraseOrPuzzle.crosswordWords);
      for (const [gridKey, cellInfo] of layout.cellMap.entries()) {
        if (cellInfo.isLetter && !revealedIndices.includes(gridKey)) {
          if (vowels.includes(cellInfo.baseChar)) {
            return true;
          }
        }
      }
      return false;
    }
    return hasRemainingVowels(phraseOrPuzzle.secretPhrase || "", revealedIndices);
  }

  const phrase = phraseOrPuzzle;
  const upper = phrase.toUpperCase();
  for (let i = 0; i < upper.length; i++) {
    const ch = upper[i];
    if (vowels.includes(ch) && !revealedIndices.includes(i)) {
      return true; // Vẫn còn ít nhất 1 nguyên âm chưa lật!
    }
  }
  return false;
}

/**
 * Kiểm tra trạng thái "NO MORE CONSONANTS" (Hết phụ âm, tất cả ô còn lại đều là nguyên âm)
 */
export function checkNoMoreConsonants(
  phraseOrPuzzle: string | MagicWheelPuzzle,
  revealedIndices: number[],
  edition: "VIETNAMESE" | "ENGLISH" = "VIETNAMESE"
): boolean {
  if (edition !== "ENGLISH") return false;
  // Đã hết phụ âm, và vẫn còn nguyên âm chưa lật
  return !hasRemainingConsonants(phraseOrPuzzle, revealedIndices) && hasRemainingVowels(phraseOrPuzzle, revealedIndices);
}

export interface SameLetterValidationResult {
  valid: boolean;
  sameLetter?: string;
  error?: string;
}

/**
 * Kiểm tra tính hợp lệ của câu hỏi thuộc chủ đề SAME LETTER (bản tiếng Anh Wheel of Fortune).
 * Luật chơi:
 * - Tất cả các từ thực tế phải bắt đầu bằng cùng một chữ cái.
 * - Chữ cái bắt đầu BẮT BUỘC là PHỤ ÂM (Consonant); nguyên âm A, E, I, O, U không được phép.
 * - Ngoại lệ duy nhất: Các dấu/ký tự kết nối đứng xen giữa độc lập (chẳng hạn dấu "-", "&", "+", "/", v.v.)
 *   sẽ không vi phạm nếu tất cả các từ còn lại đều bắt đầu bằng chữ cái đó.
 * - Cụm từ phải có ít nhất 2 từ thực tế.
 */
export function validateSameLetterPhrase(phrase: string): SameLetterValidationResult {
  if (!phrase || typeof phrase !== "string") {
    return { valid: false, error: "Cụm từ bí mật không được để trống." };
  }

  const tokens = phrase.trim().split(/\s+/).filter(Boolean);
  // Lọc ra các từ thực tế có chứa chữ cái (bỏ qua dấu/ký tự độc lập như '-', '&', '+', '/', '—')
  const wordTokens = tokens.filter((tok) => /[A-Za-zÀ-ỹ]/.test(tok));

  if (wordTokens.length < 2) {
    return {
      valid: false,
      error: "Chủ đề SAME LETTER yêu cầu cụm từ phải có ít nhất 2 từ (các ký tự nối độc lập như & hay - được bỏ qua).",
    };
  }

  const firstLetters: string[] = [];
  for (const tok of wordTokens) {
    const m = tok.match(/[A-Za-zÀ-ỹ]/);
    if (m) {
      firstLetters.push(normalizeVietnameseBaseLetter(m[0]).toUpperCase());
    }
  }

  if (firstLetters.length === 0) {
    return { valid: false, error: "Không tìm thấy chữ cái nào trong cụm từ." };
  }

  const commonLetter = firstLetters[0];
  const VOWELS = new Set(["A", "E", "I", "O", "U"]);

  // Chữ cái bắt đầu phải là PHỤ ÂM, nguyên âm A, E, I, O, U bị cấm
  if (VOWELS.has(commonLetter)) {
    return {
      valid: false,
      error: `Chủ đề SAME LETTER chỉ cho phép chữ cái bắt đầu là PHỤ ÂM. Chữ "${commonLetter}" là nguyên âm, không được phép (A, E, I, O, U không được phép).`,
    };
  }

  if (!/^[B-DF-HJ-NP-TV-Z]$/.test(commonLetter)) {
    return {
      valid: false,
      error: `Chữ cái bắt đầu "${commonLetter}" không phải là một phụ âm tiếng Anh hợp lệ.`,
    };
  }

  for (let i = 0; i < wordTokens.length; i++) {
    const char = firstLetters[i];
    if (char !== commonLetter) {
      return {
        valid: false,
        error: `Chủ đề SAME LETTER yêu cầu tất cả các từ phải bắt đầu bằng cùng một phụ âm. Từ "${wordTokens[i]}" bắt đầu bằng chữ "${char}", khác với chữ cái chung "${commonLetter}".`,
      };
    }
  }

  return { valid: true, sameLetter: commonLetter };
}

/**
 * Các chữ cái mặc định luôn được mở sẵn ở Vòng Đặc Biệt (Bonus Round) phiên bản Anh (Wheel of Fortune):
 * R, S, T, L, N, E
 */
export const ENGLISH_BONUS_ROUND_GIVEN_LETTERS = ["R", "S", "T", "L", "N", "E"] as const;

/**
 * Danh sách phụ âm người chơi được phép chọn ở Vòng Đặc Biệt phiên bản Anh (loại trừ R, S, T, L, N):
 */
export const ENGLISH_BONUS_ROUND_PICKABLE_CONSONANTS = [
  "B", "C", "D", "F", "G", "H", "J", "K", "M", "P", "Q", "V", "W", "X", "Y", "Z"
] as const;

/**
 * Danh sách nguyên âm người chơi được phép chọn ở Vòng Đặc Biệt phiên bản Anh (loại trừ E):
 */
export const ENGLISH_BONUS_ROUND_PICKABLE_VOWELS = ["A", "I", "O", "U"] as const;

/**
 * Mở tất cả các vị trí xuất hiện của 6 chữ cái R, S, T, L, N, E trong ô chữ ở Vòng Đặc Biệt Bản Anh
 */
export function applyBonusRoundGivenLetters(
  secretPhrase: string,
  alreadyRevealedIndices: number[]
): { revealedIndices: number[]; count: number } {
  const given = ["R", "S", "T", "L", "N", "E"];
  const upper = secretPhrase.toUpperCase();
  const newlyFound: number[] = [];
  for (let i = 0; i < upper.length; i++) {
    if (given.includes(upper[i]) && !alreadyRevealedIndices.includes(i)) {
      newlyFound.push(i);
    }
  }
  return {
    revealedIndices: [...alreadyRevealedIndices, ...newlyFound],
    count: newlyFound.length,
  };
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

// ─── Ô CHỮ LIÊN KẾT (CROSSWORD PUZZLE ENGINE) ─────────────────────────────────

export interface CrosswordCellInfo {
  row: number; // 0..3
  col: number; // 0..13
  char: string;
  baseChar: string;
  isLetter: boolean;
  wordIds: string[];
}

/**
 * Kiểm tra tính hợp lệ của bố cục Ô Chữ Liên Kết:
 * - Không tràn bảng (Row 0..3, Col 0..13)
 * - Từ dọc (DOWN) có độ dài tối đa 4 (do bảng có 4 hàng)
 * - Từ ngang (ACROSS) có độ dài tối đa 14
 * - Mọi điểm giao nhau giữa các từ phải trùng khớp ký tự
 */
export function validateCrosswordLayout(words: CrosswordWordItem[]): {
  isValid: boolean;
  errors: string[];
  intersections: Array<{ row: number; col: number; char: string; wordIds: string[] }>;
  cellMap: Map<number, CrosswordCellInfo>; // key: row * 14 + col
} {
  const errors: string[] = [];
  const intersections: Array<{ row: number; col: number; char: string; wordIds: string[] }> = [];
  const cellMap = new Map<number, CrosswordCellInfo>();

  if (!words || words.length === 0) {
    return { isValid: false, errors: ["Chưa có từ khoá nào trong ô chữ!"], intersections: [], cellMap };
  }

  for (let wIdx = 0; wIdx < words.length; wIdx++) {
    const item = words[wIdx];
    const cleanWord = (item.word || "").trim().toUpperCase().replace(/\s+/g, " ");
    if (!cleanWord) {
      errors.push(`Từ khoá thứ #${wIdx + 1} đang bị để trống.`);
      continue;
    }

    const len = cleanWord.length;
    if (item.direction === "ACROSS") {
      if (item.row < 0 || item.row > 3) {
        errors.push(`Từ "${cleanWord}" có chỉ số hàng (${item.row}) nằm ngoài bảng [0..3].`);
      }
      if (item.col < 0 || item.col + len > 14) {
        errors.push(`Từ "${cleanWord}" (dài ${len} ký tự) ở cột ${item.col} vượt quá chiều ngang 14 cột.`);
      }
    } else {
      // DOWN
      if (item.col < 0 || item.col > 13) {
        errors.push(`Từ "${cleanWord}" có chỉ số cột (${item.col}) nằm ngoài bảng [0..13].`);
      }
      if (item.row < 0 || item.row + len > 4) {
        errors.push(`Từ "${cleanWord}" (dài ${len} ký tự) ở hàng ${item.row} vượt quá chiều dọc 4 hàng.`);
      }
    }

    // Duyệt qua từng ký tự của từ
    for (let i = 0; i < len; i++) {
      const r = item.direction === "ACROSS" ? item.row : item.row + i;
      const c = item.direction === "ACROSS" ? item.col + i : item.col;
      if (r < 0 || r > 3 || c < 0 || c > 13) continue;

      const char = cleanWord[i];
      const baseChar = normalizeVietnameseBaseLetter(char);
      const isLetter = /[A-ZÀ-Ỹ]/i.test(char);
      const key = r * 14 + c;

      if (cellMap.has(key)) {
        const existing = cellMap.get(key)!;
        // Điểm giao nhau: kiểm tra xem chữ cái có khớp nhau không
        if (normalizeVietnameseBaseLetter(existing.char) !== baseChar) {
          errors.push(
            `Xung đột ký tự tại Hàng ${r + 1}, Cột ${c + 1}: Từ "${cleanWord}" có chữ '${char}' nhưng ô đã bị chiếm bởi chữ '${existing.char}' từ từ trước!`
          );
        } else {
          // Khớp điểm giao
          if (!existing.wordIds.includes(item.id)) {
            existing.wordIds.push(item.id);
          }
          if (!intersections.some((x) => x.row === r && x.col === c)) {
            intersections.push({ row: r, col: c, char: existing.char, wordIds: existing.wordIds });
          }
        }
      } else {
        cellMap.set(key, {
          row: r,
          col: c,
          char,
          baseChar,
          isLetter,
          wordIds: [item.id],
        });
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    intersections,
    cellMap,
  };
}

/**
 * Thuật toán tự động xếp Ô Chữ Liên Kết từ danh sách từ khoá:
 * - Tìm giao điểm các ký tự chung giữa từ hàng ngang và từ cột dọc
 * - Đảm bảo vừa vặn lưới 4x14 và căn chỉnh hài hoà
 */
export function generateAutoCrosswordLayout(words: string[]): CrosswordWordItem[] {
  const cleanWords = words
    .map((w) => w.trim().toUpperCase())
    .filter((w) => w.length > 0 && w.length <= 14);

  if (cleanWords.length === 0) return [];

  // Sắp xếp: từ dài nhất xếp trước
  const sorted = [...cleanWords].sort((a, b) => b.length - a.length);
  const items: CrosswordWordItem[] = [];

  // Từ đầu tiên (dài nhất) đặt nằm ngang ở Hàng 1 (hoặc Hàng 2) căn giữa
  const w1 = sorted[0];
  const startCol1 = Math.max(0, Math.floor((14 - w1.length) / 2));
  items.push({
    id: "cw_word_1",
    word: w1,
    row: 1,
    col: startCol1,
    direction: "ACROSS",
  });

  // Với các từ tiếp theo, thử xếp giao cắt với từ đã có
  for (let idx = 1; idx < sorted.length; idx++) {
    const curWord = sorted[idx];
    let placed = false;

    // Ưu tiên 1: Thử xếp DOWN nếu từ có độ dài <= 4
    if (curWord.length <= 4) {
      for (const placedItem of items) {
        if (placedItem.direction !== "ACROSS") continue;
        for (let iPlaced = 0; iPlaced < placedItem.word.length; iPlaced++) {
          const charP = normalizeVietnameseBaseLetter(placedItem.word[iPlaced]);
          for (let iCur = 0; iCur < curWord.length; iCur++) {
            const charC = normalizeVietnameseBaseLetter(curWord[iCur]);
            if (charP === charC) {
              const testRow = placedItem.row - iCur;
              const testCol = placedItem.col + iPlaced;
              if (testRow >= 0 && testRow + curWord.length <= 4 && testCol >= 0 && testCol <= 13) {
                // Thử thêm và kiểm tra không xung đột
                const candidate: CrosswordWordItem = {
                  id: `cw_word_${idx + 1}`,
                  word: curWord,
                  row: testRow,
                  col: testCol,
                  direction: "DOWN",
                };
                const val = validateCrosswordLayout([...items, candidate]);
                if (val.isValid) {
                  items.push(candidate);
                  placed = true;
                  break;
                }
              }
            }
          }
          if (placed) break;
        }
        if (placed) break;
      }
    }

    // Ưu tiên 2: Nếu chưa xếp được và từ có giao điểm với từ dọc đã có
    if (!placed) {
      for (const placedItem of items) {
        if (placedItem.direction !== "DOWN") continue;
        for (let iPlaced = 0; iPlaced < placedItem.word.length; iPlaced++) {
          const charP = normalizeVietnameseBaseLetter(placedItem.word[iPlaced]);
          for (let iCur = 0; iCur < curWord.length; iCur++) {
            const charC = normalizeVietnameseBaseLetter(curWord[iCur]);
            if (charP === charC) {
              const testRow = placedItem.row + iPlaced;
              const testCol = placedItem.col - iCur;
              if (testCol >= 0 && testCol + curWord.length <= 14 && testRow >= 0 && testRow <= 3) {
                const candidate: CrosswordWordItem = {
                  id: `cw_word_${idx + 1}`,
                  word: curWord,
                  row: testRow,
                  col: testCol,
                  direction: "ACROSS",
                };
                const val = validateCrosswordLayout([...items, candidate]);
                if (val.isValid) {
                  items.push(candidate);
                  placed = true;
                  break;
                }
              }
            }
          }
          if (placed) break;
        }
        if (placed) break;
      }
    }

    // Fallback: Nếu không tìm thấy giao điểm hợp lệ, đặt trên các hàng trống khác
    if (!placed) {
      const usedRows = new Set(items.filter((it) => it.direction === "ACROSS").map((it) => it.row));
      let targetRow = 2;
      if (usedRows.has(targetRow)) targetRow = 0;
      if (usedRows.has(targetRow)) targetRow = 3;
      const startCol = Math.max(0, Math.floor((14 - curWord.length) / 2));
      items.push({
        id: `cw_word_${idx + 1}`,
        word: curWord,
        row: targetRow,
        col: startCol,
        direction: "ACROSS",
      });
    }
  }

  return items;
}

/**
 * Kiểm tra chữ cái được gọi trong Ô Chữ Liên Kết:
 * Mỗi ô trùng chữ trên bảng chỉ được tính 1 lần (điểm giao nhau không nhân đôi).
 */
export function checkLetterInCrossword(
  words: CrosswordWordItem[],
  letter: string,
  alreadyRevealedIndices: number[]
): {
  found: boolean;
  count: number;
  newRevealedIndices: number[];
  newlyOpenedIndices: number[];
} {
  const targetLetter = normalizeVietnameseBaseLetter(letter);
  const layout = validateCrosswordLayout(words);
  const newlyOpenedIndices: number[] = [];

  layout.cellMap.forEach((cellInfo, gridKey) => {
    if (cellInfo.isLetter && cellInfo.baseChar === targetLetter) {
      if (!alreadyRevealedIndices.includes(gridKey)) {
        newlyOpenedIndices.push(gridKey);
      }
    }
  });

  return {
    found: newlyOpenedIndices.length > 0,
    count: newlyOpenedIndices.length,
    newRevealedIndices: [...alreadyRevealedIndices, ...newlyOpenedIndices],
    newlyOpenedIndices,
  };
}

/**
 * Xác thực giải ô chữ liên kết:
 * LUẬT NGHIÊM NGẶT (Strict WOF Rules):
 * 1. Phải nhập tất cả các từ trong ô chữ (hoặc phân tách bằng dấu phẩy ',').
 * 2. CẤM TUYỆT ĐỐI dùng từ nối ngoài bảng ("VÀ", "AND", "VỚI", "CÙNG", "KÈM", "&", "+").
 * 3. Thứ tự các từ tự do, không bắt buộc đọc theo thứ tự trên bảng.
 */
export function validateCrosswordSolve(
  puzzle: MagicWheelPuzzle,
  rawGuess: string
): {
  isCorrect: boolean;
  reason?: string;
  matchedWordsCount: number;
  totalWordsCount: number;
} {
  const words = puzzle.crosswordWords || [];
  if (words.length === 0) {
    // Fallback về giải ô chữ thường nếu không có crosswordWords
    const isOk = matchWholeSecretPhrase(puzzle.secretPhrase || "", rawGuess);
    return {
      isCorrect: isOk,
      matchedWordsCount: isOk ? 1 : 0,
      totalWordsCount: 1,
    };
  }

  const expectedWords = words.map((w) =>
    w.word
      .trim()
      .toUpperCase()
      .normalize("NFC")
      .replace(/[^A-ZÀ-Ỹ0-9\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim()
  );

  const cleanInput = (rawGuess || "").trim().toUpperCase().normalize("NFC");

  // Kiểm tra từ cấm ngoài bảng (Filler/conjunction words)
  // Dùng Unicode boundary an toàn (không dùng \b vì \b không hỗ trợ ký tự có dấu như 'À')
  const forbiddenRegex = /(^|[^A-ZÀ-Ỹ0-9])(VÀ|AND|VỚI|CÙNG|KÈM|[&+])([^A-ZÀ-Ỹ0-9]|$)/i;
  if (forbiddenRegex.test(cleanInput)) {
    return {
      isCorrect: false,
      reason:
        "Quy tắc nghiêm ngặt: Không được dùng các từ nối ngoài bảng (như 'VÀ', 'AND', 'VỚI', '&'). Bạn chỉ được dùng dấu phẩy ',' để phân tách các từ khoá!",
      matchedWordsCount: 0,
      totalWordsCount: expectedWords.length,
    };
  }

  // Tách các từ khoá nhập vào theo dấu phẩy
  let inputTokens = cleanInput
    .split(",")
    .map((s) => s.replace(/[^A-ZÀ-Ỹ0-9\s]/g, " ").replace(/\s+/g, " ").trim())
    .filter(Boolean);

  // Nếu người chơi gõ liền các từ mà không có dấu phẩy (vd: người chơi điền từ giao diện chữ cái),
  // thử kiểm tra chuỗi có chứa tất cả các từ hay không
  if (inputTokens.length === 1 && expectedWords.length > 1) {
    const singleStr = inputTokens[0];
    let allFound = true;
    for (const exp of expectedWords) {
      if (!singleStr.includes(exp)) {
        allFound = false;
        break;
      }
    }
    if (allFound) {
      return {
        isCorrect: true,
        matchedWordsCount: expectedWords.length,
        totalWordsCount: expectedWords.length,
      };
    }
  }

  // Kiểm tra đối chiếu từng từ (thứ tự tự do)
  const unmatchedExpected = [...expectedWords];
  let matchedCount = 0;

  for (const token of inputTokens) {
    const matchIdx = unmatchedExpected.findIndex((exp) => matchWholeSecretPhrase(exp, token));
    if (matchIdx !== -1) {
      matchedCount++;
      unmatchedExpected.splice(matchIdx, 1);
    }
  }

  const isAllMatched = matchedCount === expectedWords.length && inputTokens.length === expectedWords.length;

  return {
    isCorrect: isAllMatched,
    reason: isAllMatched
      ? undefined
      : unmatchedExpected.length > 0
      ? `Còn thiếu hoặc chưa khớp các từ khoá: ${unmatchedExpected.join(", ")}.`
      : "Số lượng từ nhập vào không khớp với các từ khoá trên bảng.",
    matchedWordsCount: matchedCount,
    totalWordsCount: expectedWords.length,
  };
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
  // Vòng quay sân khấu cực nặng (VTV3 Chiếc Nón Kỳ Diệu) - mô men quán tính lớn
  // Tổng cộng quay khoảng 2.0 đến 3.2 vòng trong 18s - 22s
  const minFullSpins = 2;
  const additionalSpins = Math.floor(powerFactor * 1.2);
  const totalFullSpins = minFullSpins + additionalSpins;

  // Determine current sector at 12 o'clock
  const currentAngle = (360 - (currentDegrees % 360)) % 360;
  const currentSector = Math.floor(currentAngle / sectorAngle) % totalSectors;

  // Travel a deterministic distance based on spin power + natural variation
  const travelSectors = Math.floor(powerFactor * totalSectors * 2) + Math.floor(Math.random() * totalSectors);
  const landingSectorIndex = (currentSector + travelSectors + 1) % totalSectors;

  // Crucial physical detent ratchet behavior:
  // Wheel NEVER stops perched on a peg! Settle securely within the central body of the sector (safe margin >= 6.3 deg from any peg)
  const safeJitter = (Math.random() - 0.5) * 2.4; // [-1.2 deg, +1.2 deg]
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
 * Mô phỏng vật lý nón sân khấu cực nặng (Gameshow Chiếc Nón Kỳ Diệu VTV3):
 * - Toàn bộ lượt quay diễn ra trong 18 - 22 giây (chuẩn 20 giây).
 * - 0s đến 1.6s: Thí sinh nhoài người bám chốt đẩy nón, nón tăng tốc dần từ 0 lên đỉnh tốc V_max.
 * - 1.6s đến 20s: Nón tự trôi trơn tru theo quán tính bánh đà cực nặng, giảm tốc mượt mà bậc 3.6 (Deceleration p = 3.6) về 0.
 * Giai đoạn những giây cuối trôi cà rà chậm rãi qua từng chốt kim loại tạo độ căng thẳng, hồi hộp.
 */
export function evaluateThreePhaseWheelProgress(elapsedMs: number, totalDurationMs: number = 20000): number {
  if (elapsedMs <= 0) return 0;
  if (elapsedMs >= totalDurationMs) return 1;

  const t = elapsedMs / 1000;
  const T = Math.max(16, totalDurationMs / 1000);
  const t1 = 1.6; // Giai đoạn người chơi đẩy nón (0s - 1.6s)
  const p = 3.6;  // Độ dốc giảm tốc quán tính nặng bánh đà VTV3

  const D1 = 0.5 * t1;
  const D2 = (T - t1) / (p + 1);
  const D_total = D1 + D2;

  if (t < t1) {
    // Tăng tốc hình sin mượt mà do lực đẩy tay của người chơi
    const d = 0.5 * (t - (t1 / Math.PI) * Math.sin((Math.PI * t) / t1));
    return Math.max(0, Math.min(1, d / D_total));
  } else {
    // Giảm tốc quán tính bánh đà trôi êm tự nhiên về 0 tại T
    const u = (t - t1) / (T - t1);
    const uClamped = Math.max(0, Math.min(1, u));
    const dDecel = ((T - t1) / (p + 1)) * (1 - Math.pow(1 - uClamped, p + 1));
    const d = D1 + dDecel;
    return Math.max(0, Math.min(1, d / D_total));
  }
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
    clueDisplayMode: "CLUE",
    revealedIndices: [],
  },
  {
    id: "puzzle-tossup-2",
    roundNumber: 2,
    stage: "TOSS_UP_2",
    category: "ĐOÁN NHANH 2: VĂN HÓA ẨM THỰC",
    secretPhrase: "BÁNH CHƯNG - BÁNH GIẦY",
    clue: "Hai thức bánh tượng trưng trời tròn đất vuông gắn với truyền thuyết hoàng tử Lang Liêu đời vua Hùng.",
    clueDisplayMode: "CLUE",
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
    clueDisplayMode: "CLUE",
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
    clueDisplayMode: "CLUE",
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
    clueDisplayMode: "CLUE",
    revealedIndices: [],
  },
  {
    id: "puzzle-r4",
    roundNumber: 6,
    stage: "MAIN",
    mainRoundIndex: 4,
    category: "VÒNG 4: 🔀 VĂN HÓA THỦ ĐÔ",
    secretPhrase: "VĂN HỌC, NHO, HÀ NỘI",
    clue: "Các từ khoá về Văn hóa và Thủ đô ngàn năm văn hiến đan xen nhau trên bàn ô chữ.",
    clueDisplayMode: "CATEGORY",
    puzzleType: "CROSSWORD",
    crosswordWords: [
      { id: "cw_1", word: "VĂN HỌC", row: 1, col: 3, direction: "ACROSS" },
      { id: "cw_2", word: "NHO", row: 1, col: 5, direction: "DOWN" },
      { id: "cw_3", word: "HÀ NỘI", row: 2, col: 5, direction: "ACROSS" },
    ],
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
    clueDisplayMode: "CLUE",
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
    clueDisplayMode: "CLUE",
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
    clueDisplayMode: "CLUE",
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
    clueDisplayMode: "CLUE",
    revealedIndices: [],
  },
  {
    id: "puzzle-final",
    roundNumber: 11,
    stage: "SPECIAL_FINAL",
    category: "VÒNG ĐẶC BIỆT: KIỆT TÁC THI CA",
    secretPhrase: "TRUYỆN KIỀU NGUYỄN DU",
    clue: "Kiệt tác thơ Nôm lục bát bất hủ được xem là đỉnh cao của nền văn học trung đại Việt Nam.",
    clueDisplayMode: "CLUE",
    revealedIndices: [],
  },
];

// ── Bảng chữ cái tiếng Anh & Nguyên âm / Phụ âm chuẩn Wheel of Fortune ──
export const ENGLISH_ALPHABET = [
  "A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M",
  "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z"
];
export const ENGLISH_VOWELS = ["A", "E", "I", "O", "U"];
export const ENGLISH_CONSONANTS = [
  "B", "C", "D", "F", "G", "H", "J", "K", "L", "M", "N", "P", "Q", "R", "S", "T", "V", "W", "X", "Y", "Z"
];

export function isEnglishVowel(char: string): boolean {
  return ENGLISH_VOWELS.includes(char.toUpperCase());
}

export type EnglishPuzzleSetPreset = "RANDOM_MIX" | "SET_1" | "SET_2" | "SET_3";

// ── BỘ 1: "Vietnam Heritage & Flavors" (Văn hoá, ẩm thực, danh thắng VN bằng tiếng Anh) ──
export const ENGLISH_PUZZLE_SET_1_VIETNAM_HERITAGE: MagicWheelPuzzle[] = [
  {
    id: "en-set1-tossup-1",
    roundNumber: 1,
    stage: "TOSS_UP_1",
    category: "FOOD & DRINK",
    secretPhrase: "PHO NOODLE SOUP",
    clue: "Iconic Vietnamese aromatic broth served with fresh herbs and rice noodles.",
    revealedIndices: [],
  },
  {
    id: "en-set1-tossup-2",
    roundNumber: 2,
    stage: "TOSS_UP_2",
    category: "LANDMARK(S)",
    secretPhrase: "HA LONG BAY",
    clue: "UNESCO World Heritage site famous for emerald waters and thousands of towering limestone islands.",
    revealedIndices: [],
  },
  {
    id: "en-set1-r1",
    roundNumber: 3,
    stage: "MAIN",
    mainRoundIndex: 1,
    category: "WHAT ARE YOU WEARING?",
    secretPhrase: "AO DAI TRADITIONAL DRESS",
    clue: "Elegant Vietnamese national garment featuring a graceful tunic worn over silk trousers.",
    revealedIndices: [],
  },
  {
    id: "en-set1-r2",
    roundNumber: 4,
    stage: "MAIN",
    mainRoundIndex: 2,
    category: "LANDMARK(S)",
    secretPhrase: "GOLDEN BRIDGE DA NANG",
    clue: "Spectacular pedestrian walkway held aloft by two gigantic weathered stone hands.",
    revealedIndices: [],
  },
  {
    id: "en-set1-r3",
    roundNumber: 5,
    stage: "MAIN",
    mainRoundIndex: 3,
    category: "SHOW BIZ",
    secretPhrase: "WATER PUPPET THEATRE",
    clue: "Centuries-old folk art performed on a waist-deep pool in the Red River Delta.",
    revealedIndices: [],
  },
  {
    id: "en-set1-r4",
    roundNumber: 6,
    stage: "MAIN",
    mainRoundIndex: 4,
    category: "FOOD & DRINK",
    secretPhrase: "CRISPY BANH MI SANDWICH",
    clue: "World-famous fusion baguette stuffed with savory fillings, pate, cilantro, and pickled veggies.",
    revealedIndices: [],
  },
  {
    id: "en-set1-r5",
    roundNumber: 7,
    stage: "MAIN",
    mainRoundIndex: 5,
    category: "PLACE(S)",
    secretPhrase: "ANCIENT TOWN OF HOI AN",
    clue: "Charming historic trading port renowned for glowing silk lanterns and timber architecture.",
    revealedIndices: [],
  },
  {
    id: "en-set1-r6",
    roundNumber: 8,
    stage: "MAIN",
    mainRoundIndex: 6,
    category: "LIVING THING(S)",
    secretPhrase: "PINK LOTUS BLOSSOM",
    clue: "Sacred national flower of Vietnam symbolizing serenity, purity, and spiritual grace.",
    revealedIndices: [],
  },
  {
    id: "en-set1-r7",
    roundNumber: 9,
    stage: "MAIN",
    mainRoundIndex: 7,
    category: "FOOD & DRINK",
    secretPhrase: "TRADITIONAL EGG COFFEE",
    clue: "Rich and creamy specialty beverage originating in Hanoi made from robusta beans and whipped egg yolks.",
    revealedIndices: [],
  },
  {
    id: "en-set1-r8",
    roundNumber: 10,
    stage: "MAIN",
    mainRoundIndex: 8,
    category: "PLACE(S)",
    secretPhrase: "TERRACED RICE FIELDS SAPA",
    clue: "Breathtaking cascading emerald terraces sculpted across mountain slopes in northwestern Vietnam.",
    revealedIndices: [],
  },
  {
    id: "en-set1-special",
    roundNumber: 11,
    stage: "SPECIAL_FINAL",
    category: "LANDMARK(S)",
    secretPhrase: "SON DOONG CAVE",
    clue: "The largest natural cave in the world nestled in the karst heart of Phong Nha.",
    revealedIndices: [],
  },
];

// ── BỘ 2: "Global Wonders & Pop Culture" (Điện ảnh, âm nhạc, nghệ thuật & kỳ quan thế giới) ──
export const ENGLISH_PUZZLE_SET_2_GLOBAL_WONDERS: MagicWheelPuzzle[] = [
  {
    id: "en-set2-tossup-1",
    roundNumber: 1,
    stage: "TOSS_UP_1",
    category: "SHOW BIZ",
    secretPhrase: "BROADWAY MUSICAL",
    clue: "The pinnacle of American theatrical stagecraft and spectacular showtunes in NYC.",
    revealedIndices: [],
  },
  {
    id: "en-set2-tossup-2",
    roundNumber: 2,
    stage: "TOSS_UP_2",
    category: "LANDMARK(S)",
    secretPhrase: "STATUE OF LIBERTY",
    clue: "Colossal copper neoclassical monument welcoming voyagers to New York Harbor.",
    revealedIndices: [],
  },
  {
    id: "en-set2-r1",
    roundNumber: 3,
    stage: "MAIN",
    mainRoundIndex: 1,
    category: "SHOW BIZ",
    secretPhrase: "ACADEMY AWARD WINNER",
    clue: "Prestigious golden statuette honoring outstanding artistic and technical merit in cinema.",
    revealedIndices: [],
  },
  {
    id: "en-set2-r2",
    roundNumber: 4,
    stage: "MAIN",
    mainRoundIndex: 2,
    category: "LANDMARK(S)",
    secretPhrase: "EIFFEL TOWER PARIS",
    clue: "Gustave Eiffel's wrought-iron lattice masterpiece overlooking the Champ de Mars.",
    revealedIndices: [],
  },
  {
    id: "en-set2-r3",
    roundNumber: 5,
    stage: "MAIN",
    mainRoundIndex: 3,
    category: "ON MY PLAYLIST",
    secretPhrase: "JAZZ AND BLUES FESTIVAL",
    clue: "Soulful syncopated brass improvisation originating in New Orleans.",
    revealedIndices: [],
  },
  {
    id: "en-set2-r4",
    roundNumber: 6,
    stage: "MAIN",
    mainRoundIndex: 4,
    category: "SAME LETTER",
    secretPhrase: "SWEET & SOUR",
    clue: "A tantalizing classic culinary flavor profile where all key words share the same initial consonant.",
    revealedIndices: [],
  },
  {
    id: "en-set2-r5",
    roundNumber: 7,
    stage: "MAIN",
    mainRoundIndex: 5,
    category: "TITLE(S)",
    secretPhrase: "THE LION KING",
    clue: "Beloved animated classic celebrating the circle of life on the African savanna.",
    revealedIndices: [],
  },
  {
    id: "en-set2-r6",
    roundNumber: 8,
    stage: "MAIN",
    mainRoundIndex: 6,
    category: "LANDMARK(S)",
    secretPhrase: "TAJ MAHAL PALACE",
    clue: "Ivory-white marble mausoleum on the Yamuna river bank built by Shah Jahan.",
    revealedIndices: [],
  },
  {
    id: "en-set2-r7",
    roundNumber: 9,
    stage: "MAIN",
    mainRoundIndex: 7,
    category: "LANDMARK(S)",
    secretPhrase: "MACHU PICCHU INCA CITADEL",
    clue: "Mystical 15th-century Inca sanctuary perched high in the Andes mountains of Peru.",
    revealedIndices: [],
  },
  {
    id: "en-set2-r8",
    roundNumber: 10,
    stage: "MAIN",
    mainRoundIndex: 8,
    category: "SHOW BIZ",
    secretPhrase: "HOLLYWOOD WALK OF FAME",
    clue: "World-famous sidewalk embedded with brass stars honoring entertainment icons.",
    revealedIndices: [],
  },
  {
    id: "en-set2-special",
    roundNumber: 11,
    stage: "SPECIAL_FINAL",
    category: "LANDMARK(S)",
    secretPhrase: "GREAT WALL OF CHINA",
    clue: "Ancient monumental fortification snaking thousands of miles across northern frontiers.",
    revealedIndices: [],
  },
];

// ── BỘ 3: "Classic Idioms & Wheel Phrases" (Thành ngữ và cụm từ kinh điển phong cách Wheel of Fortune) ──
export const ENGLISH_PUZZLE_SET_3_CLASSIC_IDIOMS: MagicWheelPuzzle[] = [
  {
    id: "en-set3-tossup-1",
    roundNumber: 1,
    stage: "TOSS_UP_1",
    category: "PHRASE(S)",
    secretPhrase: "PIECE OF CAKE",
    clue: "An informal expression describing a task that is exceptionally easy to accomplish.",
    revealedIndices: [],
  },
  {
    id: "en-set3-tossup-2",
    roundNumber: 2,
    stage: "TOSS_UP_2",
    category: "WHAT ARE YOU DOING?",
    secretPhrase: "BREAKING THE ICE",
    clue: "Starting a conversation to ease social tension and make people feel comfortable.",
    revealedIndices: [],
  },
  {
    id: "en-set3-r1",
    roundNumber: 3,
    stage: "MAIN",
    mainRoundIndex: 1,
    category: "PHRASE(S)",
    secretPhrase: "BETTER LATE THAN NEVER",
    clue: "Timeless wisdom that doing something overdue is still preferable to not doing it at all.",
    revealedIndices: [],
  },
  {
    id: "en-set3-r2",
    roundNumber: 4,
    stage: "MAIN",
    mainRoundIndex: 2,
    category: "PHRASE(S)",
    secretPhrase: "ON CLOUD NINE",
    clue: "A whimsical state of euphoria, sheer elation, and supreme contentment.",
    revealedIndices: [],
  },
  {
    id: "en-set3-r3",
    roundNumber: 5,
    stage: "MAIN",
    mainRoundIndex: 3,
    category: "BEFORE & AFTER",
    secretPhrase: "WHEEL OF FORTUNE COOKIE",
    clue: "Hilarious mashup between America's favorite game show and a crispy dessert with a lucky slip.",
    revealedIndices: [],
  },
  {
    id: "en-set3-r4",
    roundNumber: 6,
    stage: "MAIN",
    mainRoundIndex: 4,
    category: "CROSSWORD: CELESTIAL",
    secretPhrase: "PLANET, STAR, AIR",
    clue: "Three celestial words interlocking across the board.",
    clueDisplayMode: "CATEGORY",
    puzzleType: "CROSSWORD",
    crosswordWords: [
      { id: "cw_en1", word: "PLANET", row: 1, col: 2, direction: "ACROSS" },
      { id: "cw_en2", word: "STAR", row: 0, col: 4, direction: "DOWN" },
      { id: "cw_en3", word: "AIR", row: 2, col: 4, direction: "ACROSS" },
    ],
    revealedIndices: [],
  },
  {
    id: "en-set3-r5",
    roundNumber: 7,
    stage: "MAIN",
    mainRoundIndex: 5,
    category: "SAME NAME",
    secretPhrase: "SEWING AND SLOT MACHINE",
    clue: "Two mechanical devices sharing the exact same concluding noun.",
    revealedIndices: [],
  },
  {
    id: "en-set3-r6",
    roundNumber: 8,
    stage: "MAIN",
    mainRoundIndex: 6,
    category: "RHYME TIME",
    secretPhrase: "WINE AND DINE",
    clue: "To entertain someone lavishly with fine vintage and sumptuous fare.",
    revealedIndices: [],
  },
  {
    id: "en-set3-r7",
    roundNumber: 9,
    stage: "MAIN",
    mainRoundIndex: 7,
    category: "PHRASE(S)",
    secretPhrase: "BURNING THE MIDNIGHT OIL",
    clue: "Working or studying late into the night with steadfast diligence and focus.",
    revealedIndices: [],
  },
  {
    id: "en-set3-r8",
    roundNumber: 10,
    stage: "MAIN",
    mainRoundIndex: 8,
    category: "BEFORE & AFTER",
    secretPhrase: "SAVE FOR A RAINY DAY BED",
    clue: "Fun wordplay combining financial prudence and a comfortable piece of convertible furniture.",
    revealedIndices: [],
  },
  {
    id: "en-set3-special",
    roundNumber: 11,
    stage: "SPECIAL_FINAL",
    category: "PHRASE(S)",
    secretPhrase: "A BLESSING IN DISGUISE",
    clue: "An unexpected stroke of good fortune disguised initially as misfortune.",
    revealedIndices: [],
  },
];

export const DEFAULT_ENGLISH_MAGIC_WHEEL_PUZZLES: MagicWheelPuzzle[] = [
  ...ENGLISH_PUZZLE_SET_1_VIETNAM_HERITAGE,
];

/**
 * Xây dựng danh sách các vòng chơi tự động mở rộng theo số đội (N = min(8, max(3, teamsCount))):
 * [Đoán nhanh 1] -> [Đoán nhanh 2] -> [Vòng chính 1 .. Vòng chính N] -> [Vòng Đặc Biệt]
 */
export function buildMagicWheelMatchPuzzles(
  firstArg?: number | Array<{ roundNumber?: number; stage?: MagicWheelRoundStage; category: string; secretPhrase: string; clue?: string; clueDisplayMode?: "CATEGORY" | "CLUE"; puzzleType?: MagicWheelPuzzleType; crosswordWords?: CrosswordWordItem[] }>,
  secondArg?: number | Array<{ roundNumber?: number; stage?: MagicWheelRoundStage; category: string; secretPhrase: string; clue?: string; clueDisplayMode?: "CATEGORY" | "CLUE"; puzzleType?: MagicWheelPuzzleType; crosswordWords?: CrosswordWordItem[] }>,
  edition: "VIETNAMESE" | "ENGLISH" = "VIETNAMESE",
  englishPreset: EnglishPuzzleSetPreset = "RANDOM_MIX"
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
  let pool = DEFAULT_MAGIC_WHEEL_PUZZLES;

  if (customPuzzles && customPuzzles.length >= 4) {
    pool = customPuzzles.map((p, idx) => ({
      id: `puzzle-custom-${idx + 1}`,
      roundNumber: idx + 1,
      category: p.category,
      secretPhrase: p.secretPhrase,
      clue: p.clue,
      clueDisplayMode: p.clueDisplayMode || (p.puzzleType === "CROSSWORD" ? "CATEGORY" : (edition === "ENGLISH" ? "CATEGORY" : "CLUE")),
      revealedIndices: [],
      puzzleType: p.puzzleType || "STANDARD",
      crosswordWords: p.crosswordWords,
    }));
  } else if (edition === "ENGLISH") {
    if (englishPreset === "SET_1") {
      pool = ENGLISH_PUZZLE_SET_1_VIETNAM_HERITAGE;
    } else if (englishPreset === "SET_2") {
      pool = ENGLISH_PUZZLE_SET_2_GLOBAL_WONDERS;
    } else if (englishPreset === "SET_3") {
      pool = ENGLISH_PUZZLE_SET_3_CLASSIC_IDIOMS;
    } else {
      // RANDOM_MIX: Lấy ngẫu nhiên từ cả 3 bộ
      const t1Pool = [
        ENGLISH_PUZZLE_SET_1_VIETNAM_HERITAGE[0],
        ENGLISH_PUZZLE_SET_2_GLOBAL_WONDERS[0],
        ENGLISH_PUZZLE_SET_3_CLASSIC_IDIOMS[0],
      ];
      const t2Pool = [
        ENGLISH_PUZZLE_SET_1_VIETNAM_HERITAGE[1],
        ENGLISH_PUZZLE_SET_2_GLOBAL_WONDERS[1],
        ENGLISH_PUZZLE_SET_3_CLASSIC_IDIOMS[1],
      ];
      const spPool = [
        ENGLISH_PUZZLE_SET_1_VIETNAM_HERITAGE[10],
        ENGLISH_PUZZLE_SET_2_GLOBAL_WONDERS[10],
        ENGLISH_PUZZLE_SET_3_CLASSIC_IDIOMS[10],
      ];
      const mainPuzzles = [
        ...ENGLISH_PUZZLE_SET_1_VIETNAM_HERITAGE.slice(2, 10),
        ...ENGLISH_PUZZLE_SET_2_GLOBAL_WONDERS.slice(2, 10),
        ...ENGLISH_PUZZLE_SET_3_CLASSIC_IDIOMS.slice(2, 10),
      ].sort(() => Math.random() - 0.5);

      pool = [
        t1Pool[Math.floor(Math.random() * t1Pool.length)],
        t2Pool[Math.floor(Math.random() * t2Pool.length)],
        ...mainPuzzles,
        spPool[Math.floor(Math.random() * spPool.length)],
      ];
    }
  }

  const defaultPool = edition === "ENGLISH" ? DEFAULT_ENGLISH_MAGIC_WHEEL_PUZZLES : DEFAULT_MAGIC_WHEEL_PUZZLES;
  const defaultTossUp1 = defaultPool[0];
  const defaultTossUp2 = defaultPool[1];
  const defaultMainPool = defaultPool.filter((p) => p.stage === "MAIN");
  const defaultSpecial = defaultPool[defaultPool.length - 1];

  const schedule: MagicWheelPuzzle[] = [];

  // 1. Đoán nhanh 1
  const tu1Source = pool[0] || defaultTossUp1;
  schedule.push({
    ...tu1Source,
    id: "mw-tossup-1",
    roundNumber: 1,
    stage: "TOSS_UP_1",
    category: tu1Source.category.includes("ĐOÁN NHANH") ? tu1Source.category : `ĐOÁN NHANH 1: ${tu1Source.category}`,
    clueDisplayMode: tu1Source.clueDisplayMode || (edition === "ENGLISH" ? "CATEGORY" : "CLUE"),
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
    clueDisplayMode: tu2Source.clueDisplayMode || (edition === "ENGLISH" ? "CATEGORY" : "CLUE"),
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
      clueDisplayMode: src.clueDisplayMode || (edition === "ENGLISH" ? "CATEGORY" : "CLUE"),
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
    clueDisplayMode: specialSource.clueDisplayMode || (edition === "ENGLISH" ? "CATEGORY" : "CLUE"),
    revealedIndices: [],
  });

  return schedule;
}

/**
 * Tự động nhận diện ngôn ngữ của bộ đề (VIETNAMESE hoặc ENGLISH):
 * - Phân tích sự hiện diện của dấu thanh Tiếng Việt (à, á, ả, ã, ạ, ă, â, đ, ê, ô, ơ, ư,...) trong câu hỏi, đáp án, gợi ý và tiêu đề.
 * - Nhận diện từ khóa tiếng Anh trong tiêu đề/metadata (English, Wheel of Fortune, Set 1/2/3,...)
 */
export function detectQuizBankLanguage(bank: {
  id?: string | null;
  title?: string | null;
  description?: string | null;
  language?: "VIETNAMESE" | "ENGLISH" | string | null;
  questions?: Array<{ content?: string | null; answer?: string | null; hint?: string | null; options?: any }>;
}): "VIETNAMESE" | "ENGLISH" {
  if (!bank) return "VIETNAMESE";

  if (bank.language === "ENGLISH" || bank.language === "VIETNAMESE") {
    return bank.language;
  }

  const bankId = bank.id || "";
  const title = (bank.title || "").toLowerCase();
  const desc = (bank.description || "").toLowerCase();

  if (bankId.includes("_en_") || bankId.endsWith("_en") || /wheel of fortune|tiếng anh|english|\(en\)/i.test(title)) {
    return "ENGLISH";
  }

  // Regex phát hiện ký tự có dấu thanh đặc trưng tiếng Việt
  const vietnameseDiacriticsRegex = /[àáảãạăắằẵặâấầẩẫậèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵđÀÁẢÃẠĂẮẰẴẶÂẤẦẨẪẬÈÉẺẼẸÊẾỀỂỄỆÌÍỈĨỊÒÓỎÕỌÔỐỒỔỖỘƠỚỜỞỠỢÙÚỦŨỤƯỨỪỬỮỰỲÝỶỸỴĐ]/;

  let sampleText = `${title} ${desc} `;
  const questions = bank.questions || [];
  for (const q of questions.slice(0, 15)) {
    sampleText += ` ${q.content || ""} ${q.answer || ""} ${q.hint || ""}`;
  }

  if (vietnameseDiacriticsRegex.test(sampleText)) {
    return "VIETNAMESE";
  }

  // Nếu không chứa bất kỳ dấu tiếng Việt nào và có từ khóa hoặc thuần English
  if (/set\s*\d|idioms|heritage|wonders|english/i.test(sampleText)) {
    return "ENGLISH";
  }

  return "VIETNAMESE";
}

