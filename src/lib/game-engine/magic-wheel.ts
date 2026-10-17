/**
 * MAGIC_WHEEL (VÒNG QUAY TRI THỨC - CHIẾC NÓN KỲ DIỆU) GAME ENGINE
 * -------------------------------------------------------------
 * Mô phỏng chuẩn xác luật chơi Chiếc nón kỳ diệu (Wheel of Fortune Vietnam) phiên bản 2012:
 * - 24 ô chuẩn: 18 ô điểm (100 - 2000) và 6 ô đặc biệt (Mất lượt, Mất điểm, Nhân đôi, Chia đôi, Thêm lượt, May mắn).
 * - Cơ chế ô đè (Overlay): Ô Phần Thưởng (Vòng 1), Ô Bí Mật (Vòng 2).
 * - 2 Thể thức:
 *     1. WHEEL_QUIZ: Quay nón nhận điểm/sự kiện, sau đó giải câu hỏi trắc nghiệm/tự luận.
 *     2. WORD_PUZZLE: Quay nón và đoán chữ cái trong cụm từ khóa bí ẩn theo chủ đề.
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
  | "MYSTERY";

export interface MagicWheelSector {
  id: number;
  label: string;
  type: MagicWheelSectorType;
  value?: number;
  color: string;
  textColor: string;
  isOverlay?: boolean;
  overlayType?: "PRIZE" | "MYSTERY";
}

export interface MagicWheelPuzzle {
  id: string;
  roundNumber: number; // 1, 2, 3, 4 (Chung kết)
  category: string;    // "Danh nhân", "Địa danh", "Văn học", "Khoa học"
  secretPhrase: string; // "NGUYỄN HUỆ"
  clue?: string;        // "Vị anh hùng áo vải cờ đào..."
  revealedIndices: number[]; // Vị trí các ký tự đã được lật mở
}

export interface MagicWheelState {
  subMode: "WHEEL_QUIZ" | "WORD_PUZZLE";
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
  guessedLetters: string[]; // Các chữ cái đã đoán ("A", "B", "C"...)
  wrongGuessesCount: Record<string, number>; // teamId -> số lỗi liên tiếp
  freeSpinCount: Record<string, number>; // teamId -> số lần có Thêm Lượt
  roundScores: Record<string, number>; // teamId -> điểm tích lũy trong vòng hiện tại
  disqualifiedTeamIdsInRound: string[]; // Các đội bị loại trong vòng do phạm 3 lỗi liên tiếp
  consecutiveWrongGuesses: Record<string, number>; // teamId -> số lần đoán sai liên tiếp (0, 1, 2, 3)
  pendingSpecialAction?: "NONE" | "EXTRA_TURN" | "DOUBLE" | "HALF" | "POINTS" | "LUCKY" | "MYSTERY";
  phase:
    | "SPIN_WAITING"      // Chờ đội đến lượt bấm quay
    | "SPINNING"          // Nón đang xoay
    | "SECTOR_RESULT"     // Nón đã dừng, thông báo kết quả ô quay
    | "ACTION_INPUT"      // Chờ đoán chữ cái / trả lời quiz / giải ô chữ
    | "MYSTERY_CHOICE"    // Chờ quyết định lật ô Bí Mật hay lấy 1000đ
    | "LUCKY_PICK"        // Chờ người chơi chọn ô lật miễn phí
    | "ROUND_RECAP";      // Kết thúc vòng, tổng kết điểm
  mysteryRevealedType?: "PRIZE_CASH" | "BANKRUPT";
  lastActionMessage?: string;
  lastAwardedPoints?: number;
  activeQuestionId?: string; // Dùng trong thể thức WHEEL_QUIZ
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
 * Sinh cấu hình 24 ô theo vòng chơi (kích hoạt ô Phần Thưởng ở Vòng 1, ô Bí Mật ở Vòng 2)
 */
export function generateMagicWheelSectors(round: number): MagicWheelSector[] {
  const sectors = BASE_24_SECTORS.map((s) => ({ ...s }));

  if (round === 1) {
    // Vòng 1: Ô Phần Thưởng đè lên ô 100 điểm (id 13)
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
  } else if (round === 2) {
    // Vòng 2: Ô Bí Mật đè lên 2 ô 200 điểm (id 4 và id 16)
    [4, 16].forEach((targetId) => {
      const idx = sectors.findIndex((s) => s.id === targetId);
      if (idx !== -1) {
        sectors[idx] = {
          id: targetId,
          label: "🔮 BÍ MẬT",
          type: "MYSTERY",
          color: "#8b5cf6",
          textColor: "#ffffff",
          isOverlay: true,
          overlayType: "MYSTERY",
        };
      }
    });
  }

  return sectors;
}

// ── Bảng chữ cái tiếng Việt dùng cho Bàn phím lật chữ ────────────────────────
export const VIETNAMESE_ALPHABET = [
  "A", "Ă", "Â", "B", "C", "D", "Đ", "E", "Ê", "G", "H", "I", "K", "L", "M",
  "N", "O", "Ô", "Ơ", "P", "Q", "R", "S", "T", "U", "Ư", "V", "X", "Y",
];

/**
 * Chuẩn hóa ký tự tiếng Việt (bỏ dấu thanh điệu: sắc, huyền, hỏi, ngã, nặng)
 * Giữ nguyên chữ gốc có nón/móc như Ă, Â, Đ, Ê, Ô, Ơ, Ư
 */
export function normalizeVietnameseBaseLetter(char: string): string {
  const upper = char.toUpperCase();
  return upper
    .normalize("NFD")
    .replace(/[\u0300\u0301\u0303\u0309\u0323]/g, "") // Xóa dấu thanh điệu
    .normalize("NFC");
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
  };
}

/**
 * Kiểm tra xem toàn bộ các chữ cái trong cụm từ đã được lật mở hết chưa
 */
export function isPuzzleFullyRevealed(phrase: string, revealedIndices: number[]): boolean {
  for (let i = 0; i < phrase.length; i++) {
    const char = phrase[i];
    if (char !== " " && char !== "-" && char !== "," && char !== "." && char !== "!" && char !== "?") {
      if (!revealedIndices.includes(i)) {
        return false;
      }
    }
  }
  return true;
}

/**
 * So khớp toàn bộ đáp án giải ô chữ của người chơi với từ khóa gốc
 */
export function matchWholeSecretPhrase(phrase: string, guess: string): boolean {
  const cleanPhrase = phrase
    .trim()
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");

  const cleanGuess = guess
    .trim()
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");

  return cleanPhrase === cleanGuess;
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
  // Sector arc size in degrees (360 / 24 = 15 độ)
  const sectorAngle = 360 / totalSectors;

  // Lực quay quyết định số vòng xoay tối thiểu (3 đến 7 vòng) + góc lệch phụ thuộc lực
  const minRotations = 4;
  const powerFactor = Math.max(0.1, Math.min(1.0, powerPercent / 100));
  const additionalSpins = Math.floor(powerFactor * 4); // 0 đến 4 vòng thêm

  // Thêm độ ngẫu nhiên tự nhiên để không bị đoán trước 100%
  const randomJitter = (Math.random() * 0.8 + 0.1) * sectorAngle;
  const totalTravel = (minRotations + additionalSpins) * 360 + powerFactor * 360 + randomJitter;

  const targetDegrees = Math.round(currentDegrees + totalTravel);

  // Kim chỉ đặt tại đỉnh (top: 270 độ hoặc 90 độ tùy canvas SVG)
  // Với SVG vẽ sector 0 tại góc 0, kim ở đỉnh (270 độ):
  const normalizedAngle = (360 - (targetDegrees % 360)) % 360;
  const landingSectorIndex = Math.floor(normalizedAngle / sectorAngle) % totalSectors;

  return {
    targetDegrees,
    landingSectorIndex,
  };
}

/**
 * Bộ câu đố ô chữ mẫu chuẩn Gameshow Chiếc Nón Kỳ Diệu phục vụ khởi tạo phòng
 */
export const DEFAULT_MAGIC_WHEEL_PUZZLES: MagicWheelPuzzle[] = [
  {
    id: "puzzle-r1",
    roundNumber: 1,
    category: "DANH NHÂN LỊCH SỬ",
    secretPhrase: "NGUYỄN TRÃI",
    clue: "Nhà quân sự, danh nhân văn hóa lỗi lạc thế giới của Việt Nam thời Hậu Lê.",
    revealedIndices: [],
  },
  {
    id: "puzzle-r2",
    roundNumber: 2,
    category: "ĐỊA DANH VIỆT NAM",
    secretPhrase: "VỊNH HẠ LONG",
    clue: "Di sản thiên nhiên thế giới kỳ vĩ được UNESCO công nhận tại Quảng Ninh.",
    revealedIndices: [],
  },
  {
    id: "puzzle-r3",
    roundNumber: 3,
    category: "THÀNH NGỮ TỤC NGỮ",
    secretPhrase: "HỌC THẦY KHÔNG TÀY HỌC BẠN",
    clue: "Khuyên nhủ việc học hỏi kinh nghiệm lẫn nhau giữa bạn bè đồng trang lứa.",
    revealedIndices: [],
  },
  {
    id: "puzzle-final",
    roundNumber: 4,
    category: "CHỦ ĐỀ ĐẶC BIỆT: THƠ CA",
    secretPhrase: "TRUYỆN KIỀU NGUYỄN DU",
    clue: "Kiệt tác bất hủ được xem là đỉnh cao của nền văn học trung đại Việt Nam.",
    revealedIndices: [],
  },
];
