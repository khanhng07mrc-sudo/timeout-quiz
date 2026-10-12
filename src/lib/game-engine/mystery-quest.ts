import {
  MysteryQuestState,
  MysteryTheme,
  MysteryMiniGameType,
  MysteryTile,
  MysteryTileType,
  MysteryTileEffectType,
  MysteryPromoPerk,
  TeamState,
  CardType,
  AncientTarotCardKey,
  AncientTarotDrawnCard,
  TarotWheelSegment,
  TeamRiskTier,
} from "@/types";
import { normalizeToThreeLevels } from "./scoring";

export interface MysteryThemeDetail {
  theme: MysteryTheme;
  nameVi: string;
  bgGradient: string;
  accentColor: string;
  emoji: string;
  taglineVi: string;
}

export const MYSTERY_THEMES: Record<MysteryTheme, MysteryThemeDetail> = {
  CASTLE: {
    theme: "CASTLE",
    nameVi: "Lâu Đài Ma Thuật",
    bgGradient: "from-indigo-950 via-purple-900 to-slate-950",
    accentColor: "#a855f7",
    emoji: "🏰",
    taglineVi: "Vượt qua thử thách phép thuật, lật bài và né bẫy nổ hắc ám",
  },
  PIRATE: {
    theme: "PIRATE",
    nameVi: "Đảo Hải Tặc & Kho Báu Vàng",
    bgGradient: "from-amber-950 via-yellow-950 to-slate-950",
    accentColor: "#f59e0b",
    emoji: "🏴‍☠️",
    taglineVi: "Săn lùng kho báu rực rỡ, đề phòng bom thuốc súng giấu kín",
  },
  FOREST: {
    theme: "FOREST",
    nameVi: "Rừng Ma Thuật & Tiên Tộc",
    bgGradient: "from-emerald-950 via-teal-950 to-slate-950",
    accentColor: "#10b981",
    emoji: "🌲",
    taglineVi: "Thu thập mật ong và quả thần, coi chừng nấm nổ độc dược",
  },
  CYBER: {
    theme: "CYBER",
    nameVi: "Trạm Vũ Trụ Tương Lai",
    bgGradient: "from-cyan-950 via-blue-950 to-slate-950",
    accentColor: "#06b6d4",
    emoji: "🚀",
    taglineVi: "Khai thác lõi năng lượng lượng tử, né tránh virus mã độc nổ tung",
  },
  TEMPLE: {
    theme: "TEMPLE",
    nameVi: "Đền Cổ Huyền Bí",
    bgGradient: "from-amber-950 via-stone-900 to-black",
    accentColor: "#eab308",
    emoji: "🏛️",
    taglineVi: "Khai quật cổ vật kim cương, cẩn thận bẫy đá sập ngàn năm",
  },
};

const THEME_KEYS: MysteryTheme[] = ["CASTLE", "PIRATE", "FOREST", "CYBER", "TEMPLE"];

export const ALL_MINIGAMES: MysteryMiniGameType[] = [
  "PUSH_YOUR_LUCK",
  "MEMORY_PAIRS",
  "ONE_SHOT_DOORS",
  "TAROT_DESTINY",
];

export const MYSTERY_MINIGAME_CYCLE: MysteryMiniGameType[] = [
  "MEMORY_PAIRS",
  "ONE_SHOT_DOORS",
  "PUSH_YOUR_LUCK",
  "TAROT_DESTINY",
];

/**
 * Normalizes miniGameType to one of the 4 core variants.
 */
export function normalizeMiniGameType(type?: MysteryMiniGameType): MysteryMiniGameType {
  if (!type) return "PUSH_YOUR_LUCK";
  if (type === "DOORS" || type === "CHESTS") return "ONE_SHOT_DOORS";
  if (type === "TAROT_CARDS") return "TAROT_DESTINY";
  if (type === "RADAR_WINDOWS") return "PUSH_YOUR_LUCK";
  return type;
}

/**
 * Chooses a completely random minigame ensuring that two consecutive turns
 * NEVER play the exact same minigame.
 */
export function getRandomMiniGame(prevMiniGame?: MysteryMiniGameType): MysteryMiniGameType {
  const normPrev = prevMiniGame ? normalizeMiniGameType(prevMiniGame) : undefined;
  const candidates = ALL_MINIGAMES.filter((m) => m !== normPrev);
  if (candidates.length === 0) return "PUSH_YOUR_LUCK";
  const chosen = candidates[Math.floor(Math.random() * candidates.length)];
  return chosen;
}

/**
 * QUY TẮC ĐỒNG BỘ ĐẦU SỐ CHIA HẾT CHO 5
 * Toàn bộ phép tính chia đôi điểm tổng (Bom Từ Thiện, Bom Hắc Ám) hoặc trừ một nửa điểm câu hỏi khi hết tim
 * bắt buộc phải chạy qua hàm làm tròn Math.round(points / 5) * 5 trước khi thực thi.
 */
export function roundToMultipleOfFive(points: number): number {
  return Math.round(points / 5) * 5;
}

/**
 * ĐÁNH GIÁ THẾ TRẬN ĐỂ CÂN BẰNG ĐỘNG RỦI RO (Dynamic Two-Way Balancing / Rubber-banding)
 * - UNDERDOG (Yếu thế / Chuỗi xui):
 *   + Đội đang bét bảng và bị Top 1 dẫn >= 25 điểm.
 *   + HOẶC vừa nổ bom ở lượt chơi trước (consecutiveBombs >= 1).
 *   + HOẶC điểm tổng <= 0 và bị Top 1 dẫn >= 20 điểm.
 * - DOMINANT (Dẫn đầu áp đảo):
 *   + Đội đang đứng Top 1 và dẫn trước Top 2 >= 25 điểm.
 * - NEUTRAL:
 *   + Các trường hợp cân bằng còn lại.
 */
export function evaluateTeamRiskTier({
  team,
  allTeams = [],
  consecutiveBombs = 0,
  currentRound = 1,
}: {
  team: MysteryTeamRef;
  allTeams?: MysteryTeamRef[];
  consecutiveBombs?: number;
  currentRound?: number;
}): TeamRiskTier {
  const activeTeams = (allTeams || []).filter((t) => !t.isEliminated);
  if (activeTeams.length <= 1) return "NEUTRAL";

  const myScore = team.score || 0;
  const sorted = [...activeTeams].sort((a, b) => (b.score || 0) - (a.score || 0));
  const top1 = sorted[0];
  const top2 = sorted[1];
  const bottom = sorted[sorted.length - 1];

  // 1. Ưu tiên kiểm tra diện Yếu Thế / Thiệt Thòi (UNDERDOG)
  if (consecutiveBombs >= 1) {
    return "UNDERDOG";
  }
  if (myScore <= 0 && (top1.score || 0) >= 20) {
    return "UNDERDOG";
  }
  if (team.id === bottom.id && ((top1.score || 0) - myScore) >= 25) {
    return "UNDERDOG";
  }

  // 2. Kiểm tra diện Dẫn Đầu Áp Đảo (DOMINANT) từ Round 2 trở đi
  if (currentRound > 1 && team.id === top1.id && top2 && (myScore - (top2.score || 0)) >= 25) {
    return "DOMINANT";
  }

  return "NEUTRAL";
}

/**
 * ĐỒNG BỘ MA TRẬN BOM CHO TẤT CẢ CÁC CHẾ ĐỘ CHƠI (TÍCH HỢP ROUND & RISK TIER)
 * - Round 1: Bom Từ Thiện = 0% tuyệt đối cho mọi đội ở mọi mode (tránh nổ bom vô nghĩa khi chưa có điểm)
 * - Đội UNDERDOG (Yếu thế / Chuỗi xui): Bom Khói 90% (0đ), Bom Tối 10%, Bom Từ Thiện 0%
 * - Đội DOMINANT (Dẫn đầu áp đảo):
 *   + Round 2: Bom Khói 40% | Bom Tối 50% | Bom Từ Thiện 10%
 *   + Round 3+: Bom Khói 30% | Bom Tối 50% | Bom Từ Thiện 20%
 * - Đội NEUTRAL (Cân bằng chuẩn):
 *   + Round 1: Khói 60% | Tối 40% | Từ Thiện 0%
 *   + Round 2: Khói 60% | Tối 35% | Từ Thiện 5%
 *   + Round 3+: Khói 55% | Tối 35% | Từ Thiện 10%
 */
export function rollBombTypeForMinigame(
  mode: MysteryMiniGameType,
  teamScore: number = 0,
  options?: {
    currentRound?: number;
    riskTier?: TeamRiskTier;
  }
): "BOMB_SMOKE" | "BOMB_DARK" | "BOMB_CHARITY" {
  if (teamScore <= 0) return "BOMB_SMOKE";

  const currentRound = options?.currentRound ?? 1;
  const riskTier = options?.riskTier ?? "NEUTRAL";

  // 1. Đội Yếu Thế (UNDERDOG): Ưu tiên tối đa Bom Khói (0đ)
  if (riskTier === "UNDERDOG") {
    const r = Math.random();
    if (r < 0.90) return "BOMB_SMOKE";
    return "BOMB_DARK";
  }

  // 2. Đầu trận (Round 1): Bom Từ Thiện = 0% tuyệt đối cho tất cả các đội
  if (currentRound <= 1) {
    const r = Math.random();
    if (mode === "MEMORY_PAIRS") {
      return r < 0.85 ? "BOMB_SMOKE" : "BOMB_DARK";
    }
    if (mode === "ONE_SHOT_DOORS") {
      return r < 0.75 ? "BOMB_SMOKE" : "BOMB_DARK";
    }
    // PUSH_YOUR_LUCK & TAROT_DESTINY
    return r < 0.60 ? "BOMB_SMOKE" : "BOMB_DARK";
  }

  // 3. Đội Dẫn Đầu Áp Đảo (DOMINANT) từ Round 2 trở đi:
  if (riskTier === "DOMINANT") {
    const r = Math.random();
    if (currentRound === 2) {
      if (r < 0.40) return "BOMB_SMOKE";
      if (r < 0.90) return "BOMB_DARK";
      return "BOMB_CHARITY";
    } else {
      // Round 3+: Tăng Bom Từ Thiện lên 20% để tạo kịch tính lật kèo
      if (r < 0.30) return "BOMB_SMOKE";
      if (r < 0.80) return "BOMB_DARK";
      return "BOMB_CHARITY";
    }
  }

  // 4. Đội Cân Bằng Chuẩn (NEUTRAL) từ Round 2 trở đi:
  const charityChance = currentRound === 2 ? 0.05 : 0.10;
  const r = Math.random();
  if (mode === "MEMORY_PAIRS") {
    if (r < 0.80) return "BOMB_SMOKE";
    if (r < 1 - charityChance) return "BOMB_DARK";
    return "BOMB_CHARITY";
  }
  if (mode === "ONE_SHOT_DOORS") {
    if (r < 0.70) return "BOMB_SMOKE";
    if (r < 1 - charityChance) return "BOMB_DARK";
    return "BOMB_CHARITY";
  }
  // PUSH_YOUR_LUCK & TAROT_DESTINY
  if (r < 0.50) return "BOMB_SMOKE";
  if (r < 1 - charityChance) return "BOMB_DARK";
  return "BOMB_CHARITY";
}

/**
 * Centralized Bomb Penalty Outcome Resolver
 * Đồng bộ cách giải quyết hiệu ứng 3 loại bom cho tất cả các minigame.
 */
export function resolveBombOutcome({
  bombType,
  team,
  allTeams = [],
  storyDescription,
  baseQuestionPoints = 20,
  isSurvivalPenalty = false,
}: {
  bombType: "BOMB_SMOKE" | "BOMB_DARK" | "BOMB_CHARITY";
  team: MysteryTeamRef;
  allTeams?: MysteryTeamRef[];
  storyDescription?: string;
  baseQuestionPoints?: number;
  isSurvivalPenalty?: boolean;
}): {
  penalty: number;
  penaltyText: string;
  bombExploded: NonNullable<MysteryQuestState["bombExploded"]>;
  giftedPoints: number;
  recipientTeamId?: string;
  recipientTeamName?: string;
  darkBombRecipients?: Array<{ teamId: string; teamName: string; points: number }>;
} {
  const currentScore = team.score || 0;
  const otherTeams = allTeams.filter((t) => t.id !== team.id && !t.isEliminated);
  const X = allTeams.length;

  if (bombType === "BOMB_SMOKE") {
    if (isSurvivalPenalty) {
      const penalty = Math.min(currentScore, roundToMultipleOfFive(baseQuestionPoints * 0.5));
      const penaltyText = `Khói mù bao phủ! Chế độ Sinh Tử phạt trừ 50% điểm gốc câu hỏi (-${penalty}đ)!`;
      return {
        penalty,
        penaltyText,
        giftedPoints: 0,
        bombExploded: {
          type: "SMOKE",
          title: "Bom Khói 💨",
          description: storyDescription || "Khói mù bao phủ! Chế độ Sinh Tử phạt trừ 50% điểm gốc câu hỏi.",
          penaltyText,
          donorTeamId: team.id,
          donorTeamName: team.name,
          deductedPoints: penalty,
        },
      };
    }

    const penaltyText = "Mất sạch điểm của câu này. Tổng điểm của đội không đổi.";
    return {
      penalty: 0,
      penaltyText,
      giftedPoints: 0,
      bombExploded: {
        type: "SMOKE",
        title: "Bom Khói 💨",
        description: storyDescription || "Khói mù bao phủ! Mất toàn bộ điểm tích lũy của câu hiện tại.",
        penaltyText,
        donorTeamId: team.id,
        donorTeamName: team.name,
        deductedPoints: 0,
      },
    };
  }

  if (bombType === "BOMB_DARK") {
    if (isSurvivalPenalty) {
      const penalty = Math.min(currentScore, baseQuestionPoints);
      const penaltyText = penalty > 0
        ? `Năng lượng bóng tối nuốt chửng! Chế độ Sinh Tử phạt trừ 100% điểm gốc câu hỏi (-${penalty}đ)!`
        : "Điểm hiện tại là 0 nên không bị trừ điểm.";
      return {
        penalty,
        penaltyText,
        giftedPoints: 0,
        bombExploded: {
          type: "DARK",
          title: "Bom Tối 🌑",
          description: storyDescription || "Năng lượng bóng tối nuốt chửng! Chế độ Sinh Tử phạt trừ điểm gốc câu hỏi.",
          penaltyText,
          donorTeamId: team.id,
          donorTeamName: team.name,
          deductedPoints: penalty,
        },
      };
    }

    let penalty = 0;
    let penaltyText = "";
    const darkBombRecipients: Array<{ teamId: string; teamName: string; points: number }> = [];

    const numOpponents = otherTeams.length;
    const threshold = 5 * numOpponents; // 5 * (số đội - 1)

    if (numOpponents === 0) {
      penalty = currentScore > 0 ? Math.min(currentScore, 5) : 0;
      penaltyText = penalty > 0 ? `Bị trừ ${penalty} điểm từ tổng điểm.` : "Điểm hiện tại là 0 nên không bị trừ điểm.";
    } else if (currentScore < threshold) {
      // Trường hợp 1: Số điểm của đội mình nhỏ hơn 5 * (số đội - 1)
      if (currentScore <= 0) {
        penalty = 0;
        penaltyText = "Điểm của bạn hiện tại là 0 nên không bị trừ điểm và không phân chia cho đối thủ.";
      } else {
        // Ưu tiên tặng cho đội có điểm thấp nhất (nếu hai đội bằng điểm thì chọn ngẫu nhiên)
        const sortedOthers = [...otherTeams].sort((a, b) => {
          const diff = (a.score || 0) - (b.score || 0);
          if (diff !== 0) return diff;
          return Math.random() - 0.5;
        });

        const numTeamsToReceive = Math.min(Math.floor(currentScore / 5), sortedOthers.length);
        for (let i = 0; i < numTeamsToReceive; i++) {
          darkBombRecipients.push({
            teamId: sortedOthers[i].id,
            teamName: sortedOthers[i].name,
            points: 5,
          });
        }
        penalty = darkBombRecipients.length * 5;
        const recNames = darkBombRecipients.map((r) => `${r.teamName} (+5đ)`).join(", ");
        penaltyText = recNames
          ? `Bị trừ ${penalty} điểm! Đã phân phát cho đội thấp điểm nhất: ${recNames}`
          : "Điểm không đủ 5đ để phân chia cho đối thủ.";
      }
    } else {
      // Trường hợp 2: Số điểm >= 5 * (số đội - 1) -> Trừ 5 * (số đội - 1) (ví dụ trừ 15đ với 4 đội), mỗi đội còn lại nhận 5đ cố định
      penalty = 5 * numOpponents;
      for (const other of otherTeams) {
        darkBombRecipients.push({
          teamId: other.id,
          teamName: other.name,
          points: 5,
        });
      }
      const recNames = darkBombRecipients.map((r) => `${r.teamName} (+5đ)`).join(", ");
      penaltyText = `Bị trừ ${penalty} điểm! Chia cho các đối thủ còn lại: ${recNames}`;
    }

    return {
      penalty,
      penaltyText,
      giftedPoints: 0,
      darkBombRecipients,
      bombExploded: {
        type: "DARK",
        title: "Bom Hắc Ám 🌑",
        description: storyDescription || "Năng lượng bóng tối bùng phát! Điểm số của bạn bị rút cạn và phân chia đều cho các đội đối thủ!",
        penaltyText,
        donorTeamId: team.id,
        donorTeamName: team.name,
        deductedPoints: penalty,
        recipients: darkBombRecipients,
      },
    };
  }

  // BOMB_CHARITY: Ưu tiên phương án trừ thấp hơn giữa:
  // 1. Trừ nửa số điểm của đội (roundToMultipleOfFive(currentScore * 0.5))
  // 2. Trao 1.5 lần điểm gốc câu hỏi (roundToMultipleOfFive(baseQuestionPoints * 1.5))
  const rawHalf = roundToMultipleOfFive(currentScore * 0.5);
  const rawBaseMultiplier = roundToMultipleOfFive(baseQuestionPoints * 1.5);
  const targetPenalty = Math.min(rawHalf, rawBaseMultiplier);
  const giftedPoints = currentScore > 0 ? Math.min(currentScore, targetPenalty) : 0;
  let recipientTeamId: string | undefined = undefined;
  let recipientTeamName: string | undefined = undefined;

  if (otherTeams.length > 0) {
    const maxScore = Math.max(...otherTeams.map((t) => t.score || 0));
    const topTeams = otherTeams.filter((t) => (t.score || 0) === maxScore);
    const chosen = topTeams[Math.floor(Math.random() * topTeams.length)];
    recipientTeamId = chosen.id;
    recipientTeamName = chosen.name;
  }

  const penaltyReason = rawHalf <= rawBaseMultiplier
    ? `50% điểm đội (-${giftedPoints}đ)`
    : `1.5 lần điểm gốc câu hỏi (-${giftedPoints}đ)`;

  const penaltyText = recipientTeamName
    ? `Bị phạt theo phương án thấp hơn: ${penaltyReason} và chuyển tặng toàn bộ cho Đội ${recipientTeamName}!`
    : `Bị phạt theo phương án thấp hơn: ${penaltyReason}!`;

  return {
    penalty: giftedPoints,
    penaltyText,
    giftedPoints,
    recipientTeamId,
    recipientTeamName,
    bombExploded: {
      type: "CHARITY",
      title: "Bom Từ Thiện 🎁",
      description: storyDescription || "Lòng tốt bất đắc dĩ! Bị trừ theo mức thấp hơn giữa 50% điểm đội và 1.5x điểm câu, chuyển tặng toàn bộ cho đội đang dẫn đầu!",
      penaltyText,
      donorTeamId: team.id,
      donorTeamName: team.name,
      deductedPoints: giftedPoints,
      recipientTeamId,
      recipientTeamName,
      giftedPoints,
    },
  };
}

/**
 * Generates dynamic promo perk based on base question points.
 * - 10đ (Riskier minigame): higher shield / extra pot chance to entice players
 * - 20đ: balanced
 * - 30đ: higher double pot chance for epic payoffs
 */
export function generateMysteryPromoPerk(
  basePoints: number = 10,
  miniGameType?: MysteryMiniGameType,
  options?: {
    teams?: MysteryTeamRef[];
    currentTeamId?: string;
  }
): MysteryPromoPerk {
  const normType = miniGameType ? normalizeMiniGameType(miniGameType) : "PUSH_YOUR_LUCK";
  const hasOpponentWithScore = Boolean(
    options?.teams &&
    options.teams.some((t) => t.id !== options.currentTeamId && (t.score || 0) > 0)
  );

  let pool: MysteryPromoPerk[] = [];

  if (normType === "MEMORY_PAIRS") {
    pool = ["SHIELD_PROMO", "EXTRA_POT_PROMO", "PEEK_PROMO", "EXTRA_ATTEMPT_PROMO"];
    if (hasOpponentWithScore) pool.push("STEAL_5_PROMO");
  } else if (normType === "ONE_SHOT_DOORS") {
    pool = ["SHIELD_PROMO", "EXTRA_POT_PROMO", "PEEK_PROMO"];
    if (hasOpponentWithScore) pool.push("STEAL_5_PROMO");
  } else if (normType === "TAROT_DESTINY") {
    pool = ["SHIELD_PROMO", "EXTRA_POT_PROMO", "SUN_MAGNET_PROMO"];
    if (hasOpponentWithScore) pool.push("STEAL_5_PROMO");
  } else {
    // PUSH_YOUR_LUCK
    pool = ["SHIELD_PROMO", "EXTRA_POT_PROMO", "PEEK_PROMO", "SAFETY_NET_PROMO"];
    if (hasOpponentWithScore) pool.push("STEAL_5_PROMO");
  }

  return pool[Math.floor(Math.random() * pool.length)];
}

/**
 * Calculates steal of 5 points from the opponent with the highest score.
 * If multiple opponents tie for highest score, randomly selects one.
 * Áp dụng quy tắc bảo vệ chống cướp liên hoàn (tối đa 2 lần trước lượt kế tiếp).
 */
export function calculatePromoSteal5({
  activeTeamId,
  allTeams,
  timesStolenInCycle = {},
}: {
  activeTeamId: string;
  allTeams: MysteryTeamRef[];
  timesStolenInCycle?: Record<string, number>;
}): {
  victimTeamId?: string;
  victimTeamName?: string;
  stolenPoints: number;
  isFromBank?: boolean;
  protectionNote?: string;
} {
  const opponents = (allTeams || []).filter(
    (t) => t.id !== activeTeamId && !t.isEliminated && (t.score || 0) > 0
  );
  if (opponents.length === 0) {
    return { stolenPoints: 5, isFromBank: true };
  }

  // Loại trừ các đội đã bị cướp >= 2 lần trong chu kỳ hiện tại (Miễn nhiễm)
  const eligibleOpponents = opponents.filter((t) => (timesStolenInCycle[t.id] ?? 0) < 2);
  if (eligibleOpponents.length === 0) {
    return {
      stolenPoints: 5,
      isFromBank: true,
      protectionNote: "Các đối thủ đều đang được Khiên Miễn Nhiễm Cướp bảo vệ! Nhận 5đ từ Quỹ Hệ Thống.",
    };
  }

  const maxScore = Math.max(...eligibleOpponents.map((t) => t.score || 0));
  const topOpponents = eligibleOpponents.filter((t) => (t.score || 0) === maxScore);
  const chosenVictim = topOpponents[Math.floor(Math.random() * topOpponents.length)];

  const stolenPoints = Math.min(5, chosenVictim.score || 0);
  return {
    victimTeamId: chosenVictim.id,
    victimTeamName: chosenVictim.name,
    stolenPoints,
  };
}

export function getPerkType(promo?: MysteryQuestState["promoPerk"]): MysteryPromoPerk | undefined {
  if (!promo) return undefined;
  return typeof promo === "string" ? promo : promo.type;
}

export function getInitialMemoryPairsState(promo?: MysteryQuestState["promoPerk"]): NonNullable<MysteryQuestState["memoryPairsState"]> {
  const perkType = getPerkType(promo);
  return {
    firstFlippedTileId: null,
    secondFlippedTileId: null,
    thirdFlippedTileId: null,
    keptBombTileIds: [],
    isBombRescueActive: false,
    activePenaltyPairKey: null,
    attemptsUsed: 0,
    maxAttempts: perkType === "EXTRA_ATTEMPT_PROMO" ? 5 : 4,
    matchedPairKey: null,
    isMismatchResolving: false,
    round: 1,
    promptSecondChance: false,
  };
}

interface RewardTemplate {
  storyTitle: string;
  storyDescription: string;
  deltaPoints: number;
  effectType: "BONUS_POINTS" | "MULTIPLY_X2" | "STEAL_POINTS";
}

const REWARD_TEMPLATES: Record<MysteryTheme, RewardTemplate[]> = {
  CASTLE: [
    { storyTitle: "💎 Kho Báu +30đ", storyDescription: "Pháp Sư truyền dạy bí kíp: Thưởng nóng +30 điểm quỹ!", deltaPoints: 30, effectType: "BONUS_POINTS" },
    { storyTitle: "🚀 Nhân Đôi x2", storyDescription: "Ánh sáng tinh tú soi rọi: Nhân đôi (x2) toàn bộ điểm trong quỹ!", deltaPoints: 0, effectType: "MULTIPLY_X2" },
    { storyTitle: "🎭 Cướp +20đ", storyDescription: "Áo tàng hình xuất kích: Cướp thêm 20đ vào quỹ thưởng!", deltaPoints: 20, effectType: "STEAL_POINTS" },
    { storyTitle: "🛡️ Khiên +20đ", storyDescription: "Nhặt được khiên cổ hoàng gia: Thưởng an toàn +20 điểm quỹ!", deltaPoints: 20, effectType: "BONUS_POINTS" },
    { storyTitle: "📜 Bí Truyền +25đ", storyDescription: "Giải mã cuộn giấy thông thái: Thưởng nóng +25 điểm quỹ!", deltaPoints: 25, effectType: "BONUS_POINTS" },
    { storyTitle: "💰 Kho Vàng +25đ", storyDescription: "Mở đúng căn hầm hoàng gia: +25 điểm quỹ!", deltaPoints: 25, effectType: "BONUS_POINTS" },
    { storyTitle: "✨ Pha Lê +20đ", storyDescription: "Năng lượng dồi dào: +20 điểm quỹ!", deltaPoints: 20, effectType: "BONUS_POINTS" },
    { storyTitle: "👑 Vương Miện +35đ", storyDescription: "Tìm thấy vương miện bảo vật: +35 điểm quỹ!", deltaPoints: 35, effectType: "BONUS_POINTS" },
  ],
  PIRATE: [
    { storyTitle: "👑 Kho Báu +40đ", storyDescription: "Hòm kim cương khổng lồ: Thưởng lớn +40 điểm quỹ!", deltaPoints: 40, effectType: "BONUS_POINTS" },
    { storyTitle: "⚓ Nhân Đôi x2", storyDescription: "Vận may đại dương: Nhân đôi (x2) điểm trong quỹ!", deltaPoints: 0, effectType: "MULTIPLY_X2" },
    { storyTitle: "🗡️ Cướp +25đ", storyDescription: "Cướp bóc khoang thuyền: Cướp 25đ vào quỹ thưởng!", deltaPoints: 25, effectType: "STEAL_POINTS" },
    { storyTitle: "🦜 Chỉ Đường +25đ", storyDescription: "Chú vẹt chỉ đường tắt vào kho báu: Thưởng lớn +25 điểm quỹ!", deltaPoints: 25, effectType: "BONUS_POINTS" },
    { storyTitle: "🍻 Thưởng +20đ", storyDescription: "Liên hoan tưng bừng: +20 điểm quỹ!", deltaPoints: 20, effectType: "BONUS_POINTS" },
    { storyTitle: "🧭 La Bàn +25đ", storyDescription: "Tìm thấy hướng gió lành: +25 điểm quỹ!", deltaPoints: 25, effectType: "BONUS_POINTS" },
    { storyTitle: "🪙 Tiền Vàng +30đ", storyDescription: "Nhặt được túi vàng nguyên vẹn: +30 điểm quỹ!", deltaPoints: 30, effectType: "BONUS_POINTS" },
    { storyTitle: "🛡️ Khiên +20đ", storyDescription: "Nhặt được mộc gỗ quý báu: Thưởng an toàn +20 điểm quỹ!", deltaPoints: 20, effectType: "BONUS_POINTS" },
  ],
  FOREST: [
    { storyTitle: "🌟 Kho Báu +35đ", storyDescription: "Nữ Hoàng Tiên ban tặng: Thưởng ngay +35 điểm quỹ!", deltaPoints: 35, effectType: "BONUS_POINTS" },
    { storyTitle: "🌸 Nhân Đôi x2", storyDescription: "Sinh lực tràn trề: Nhân đôi (x2) điểm trong quỹ!", deltaPoints: 0, effectType: "MULTIPLY_X2" },
    { storyTitle: "🦊 Cướp +20đ", storyDescription: "Lẻn trộm túi tiền: Cướp 20đ vào quỹ thưởng!", deltaPoints: 20, effectType: "STEAL_POINTS" },
    { storyTitle: "🌿 Khiên +20đ", storyDescription: "Bùa chú rừng xanh hộ thể: Thưởng an toàn +20 điểm quỹ!", deltaPoints: 20, effectType: "BONUS_POINTS" },
    { storyTitle: "🏹 Thưởng +30đ", storyDescription: "Bắn trúng hồng tâm kho báu: Thưởng lớn +30 điểm quỹ!", deltaPoints: 30, effectType: "BONUS_POINTS" },
    { storyTitle: "🍯 Mật Ong +25đ", storyDescription: "Ngọt ngào năng lượng: +25 điểm quỹ!", deltaPoints: 25, effectType: "BONUS_POINTS" },
    { storyTitle: "🦋 Tinh Linh +20đ", storyDescription: "Ánh sáng dẫn lối: +20 điểm quỹ!", deltaPoints: 20, effectType: "BONUS_POINTS" },
    { storyTitle: "💎 Lục Bảo +30đ", storyDescription: "Viên ngọc ngàn năm: +30 điểm quỹ!", deltaPoints: 30, effectType: "BONUS_POINTS" },
  ],
  CYBER: [
    { storyTitle: "⚡ Siêu Thưởng +40đ", storyDescription: "Bùng nổ siêu năng lượng: Thưởng lớn +40 điểm quỹ!", deltaPoints: 40, effectType: "BONUS_POINTS" },
    { storyTitle: "🚀 Nhân Đôi x2", storyDescription: "Gia tốc cực đại: Nhân đôi (x2) điểm trong quỹ!", deltaPoints: 0, effectType: "MULTIPLY_X2" },
    { storyTitle: "🛰️ Cướp +25đ", storyDescription: "Chuyển luồng dữ liệu: Cướp 25đ vào quỹ thưởng!", deltaPoints: 25, effectType: "STEAL_POINTS" },
    { storyTitle: "🛡️ Lá Chắn +20đ", storyDescription: "Trường lực bảo vệ công nghệ: Thưởng an toàn +20 điểm quỹ!", deltaPoints: 20, effectType: "BONUS_POINTS" },
    { storyTitle: "💾 Dữ Liệu +30đ", storyDescription: "Giải mã dữ liệu tối mật: Thưởng nóng +30 điểm quỹ!", deltaPoints: 30, effectType: "BONUS_POINTS" },
    { storyTitle: "📡 Vệ Tinh +25đ", storyDescription: "Bắt trọn luồng sóng quý: +25 điểm quỹ!", deltaPoints: 25, effectType: "BONUS_POINTS" },
    { storyTitle: "🔋 Năng Lượng +20đ", storyDescription: "Sạc đầy pin tàu: +20 điểm quỹ!", deltaPoints: 20, effectType: "BONUS_POINTS" },
    { storyTitle: "🤖 Siêu Chip +30đ", storyDescription: "Thuật toán xử lý thần tốc: +30 điểm quỹ!", deltaPoints: 30, effectType: "BONUS_POINTS" },
  ],
  TEMPLE: [
    { storyTitle: "👑 Kho Báu +40đ", storyDescription: "Khai mở kho báu lăng mộ: Thưởng lớn +40 điểm quỹ!", deltaPoints: 40, effectType: "BONUS_POINTS" },
    { storyTitle: "☀️ Nhân Đôi x2", storyDescription: "Thần Mặt Trời ban phước: Nhân đôi (x2) điểm trong quỹ!", deltaPoints: 0, effectType: "MULTIPLY_X2" },
    { storyTitle: "🐍 Cướp +20đ", storyDescription: "Bẫy ngầm kích hoạt: Cướp 20đ vào quỹ thưởng!", deltaPoints: 20, effectType: "STEAL_POINTS" },
    { storyTitle: "🏺 Cổ Vật +25đ", storyDescription: "Cổ vật nguyên vẹn: +25 điểm quỹ!", deltaPoints: 25, effectType: "BONUS_POINTS" },
    { storyTitle: "📜 Mật Đạo +30đ", storyDescription: "Sơ đồ mật đạo kim tự tháp: Thưởng lớn +30 điểm quỹ!", deltaPoints: 30, effectType: "BONUS_POINTS" },
    { storyTitle: "💎 Hồng Ngọc +30đ", storyDescription: "Viên đá mắt thần: +30 điểm quỹ!", deltaPoints: 30, effectType: "BONUS_POINTS" },
    { storyTitle: "🛡️ Khiên +20đ", storyDescription: "Khiên chiến binh Ai Cập: Thưởng an toàn +20 điểm quỹ!", deltaPoints: 20, effectType: "BONUS_POINTS" },
    { storyTitle: "🗝️ Chìa Khóa +20đ", storyDescription: "Chìa khóa mở cửa thông đạo: +20 điểm quỹ!", deltaPoints: 20, effectType: "BONUS_POINTS" },
  ],
};

export interface MysteryTeamRef {
  id: string;
  name: string;
  color?: string;
  score?: number;
  isEliminated?: boolean;
}

export interface StealResult {
  victimTeamId?: string;
  victimTeamName?: string;
  stolenPoints: number;
  isHalfProtection?: boolean;
  isFromBank?: boolean;
  protectionNote?: string;
}

/**
 * Calculates controlled steal points with limits:
 * - Steals from top competitor (leader #1)
 * - Capped at maxCap (25-30đ)
 * - Safety capped at max 50% of victim's points so they never go negative
 * - CHỐNG CƯỚP LIÊN HOÀN (Anti-Chain-Steal):
 *   + Trước lượt kế tiếp của mình, một đội chỉ có thể bị cướp tối đa 2 lần.
 *   + Lần 1: Chịu 100% số điểm cướp.
 *   + Lần 2: Giảm còn 50% số điểm cướp (làm tròn bội số của 5).
 *   + Lần 3+: Hoàn toàn Miễn Nhiễm Cướp (nhận điểm từ Quỹ Hệ Thống).
 */
export function calculateCappedSteal({
  activeTeamId,
  allTeams,
  targetPoints = 20,
  maxCap,
  timesStolenInCycle = {},
}: {
  activeTeamId: string;
  allTeams: MysteryTeamRef[];
  targetPoints?: number;
  maxCap?: number;
  timesStolenInCycle?: Record<string, number>;
}): StealResult {
  const effectiveCap = maxCap ?? Math.max(targetPoints, 50);
  const otherTeams = (allTeams || []).filter((t) => t.id !== activeTeamId && !t.isEliminated);
  if (otherTeams.length === 0) {
    return { stolenPoints: Math.min(targetPoints, effectiveCap), isFromBank: true };
  }

  // 1. Loại trừ các đối thủ đã bị cướp >= 2 lần trong chu kỳ trước lượt của họ
  const eligibleVictims = otherTeams.filter((t) => (timesStolenInCycle[t.id] ?? 0) < 2);

  // Nếu tất cả đối thủ đều đã bị cướp đủ 2 lần -> Miễn nhiễm cướp! Nhận điểm từ Quỹ Hệ Thống
  if (eligibleVictims.length === 0) {
    const finalSteal = Math.min(targetPoints, effectiveCap);
    return {
      stolenPoints: finalSteal,
      isFromBank: true,
      protectionNote: "Tất cả đối thủ đều đang được Khiên Miễn Nhiễm Cướp bảo vệ! Nhận điểm an toàn từ Quỹ Hệ Thống.",
    };
  }

  // 2. Chọn nạn nhân có điểm số cao nhất trong các đội hợp lệ
  const sorted = [...eligibleVictims].sort((a, b) => (b.score || 0) - (a.score || 0));
  const victim = sorted[0];
  const victimScore = victim.score || 0;

  if (victimScore <= 0) {
    return {
      victimTeamId: victim.id,
      victimTeamName: victim.name,
      stolenPoints: 0,
    };
  }

  // 3. Tính điểm cướp cho phép cơ bản (tối đa 50% điểm của nạn nhân và trong trần effectiveCap)
  const halfScore = Math.floor(victimScore * 0.5);
  const allowed = Math.min(targetPoints, effectiveCap, halfScore);
  const baseSteal = Math.max(1, allowed);

  // 4. Áp dụng quy tắc bảo vệ: Lần 1 = 100%, Lần 2 = 50%
  const timesStolen = timesStolenInCycle[victim.id] ?? 0;
  if (timesStolen === 1) {
    const halfSteal = Math.max(5, roundToMultipleOfFive(baseSteal * 0.5));
    const finalSteal = Math.min(baseSteal, halfSteal);
    return {
      victimTeamId: victim.id,
      victimTeamName: victim.name,
      stolenPoints: finalSteal,
      isHalfProtection: true,
      protectionNote: `Khiên Chống Vắt Kiệt: Đội ${victim.name} đã bị cướp lần 2 trong vòng, chỉ bị trừ 50% (-${finalSteal}đ)!`,
    };
  }

  return {
    victimTeamId: victim.id,
    victimTeamName: victim.name,
    stolenPoints: baseSteal,
  };
}

/**
 * Helper to shuffle memory pairs tiles face down and re-index.
 */
export function shuffleMemoryPairsTiles(tiles: MysteryTile[]): MysteryTile[] {
  const cloned = tiles.map((t) => ({
    ...t,
    isOpened: false,
    isMatched: false,
  }));
  // Fisher-Yates shuffle algorithm: True unbiased randomization
  for (let i = cloned.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cloned[i], cloned[j]] = [cloned[j], cloned[i]];
  }
  return cloned.map((item, idx) => ({
    ...item,
    id: idx + 1,
    label: `Thẻ #${idx + 1}`,
    isOpened: false,
    isMatched: false,
  }));
}

/**
 * Generates tiles specifically for Variant 1: MEMORY_PAIRS (10 tiles = 5 pairs).
 */
export function generateMemoryPairsTiles(
  basePoints: number = 20,
  options?: {
    currentRound?: number;
    teams?: MysteryTeamRef[];
    currentTeamId?: string;
    riskTier?: TeamRiskTier;
  }
): MysteryTile[] {
  interface PairDef {
    pairKey: string;
    icon: string;
    type: MysteryTileType;
    storyTitle: string;
    storyDescription: string;
    effectType: MysteryTileEffectType;
    deltaPoints: number;
  }

  const riskTier = options?.riskTier ?? "NEUTRAL";
  const pBonusTop = basePoints * 2; // Siêu Thưởng Nhân Đôi (+20đ / +40đ / +60đ)
  const pBonusHigh = riskTier === "UNDERDOG" ? basePoints * 2 : Math.round(basePoints * 1.5); // Đội yếu thế nhận kho báu lớn hơn
  const pBonusMed = basePoints; // Thưởng Trung Bình Tinh Tú (+10đ / +20đ / +30đ)
  const pSteal = basePoints; // Cặp Hải Tặc Đoạt Bảo (Cướp đúng điểm gốc câu hỏi)
  const pPenalty = riskTier === "UNDERDOG" ? 0 : basePoints; // Cặp Kíp Nổ Hắc Ám: Đội yếu thế không bị trừ âm tổng điểm

  const currentRound = options?.currentRound ?? 1;
  const canSteal = currentRound >= 2 && Boolean(
    options?.teams &&
    options?.teams.some((t) => t.id !== options?.currentTeamId && (t.score || 0) >= pSteal)
  );

  const stealOrBonusPair: PairDef = canSteal
    ? {
        pairKey: "PAIR_STEAL",
        icon: "🗡️",
        type: "REWARD",
        storyTitle: `🗡️ Cướp +${pSteal}đ`,
        storyDescription: `Ghép trúng cặp cướp: Cướp +${pSteal}đ từ một đối thủ đủ điều kiện!`,
        effectType: "STEAL_POINTS",
        deltaPoints: pSteal,
      }
    : {
        pairKey: "PAIR_SHIELD",
        icon: "🛡️",
        type: "REWARD",
        storyTitle: `🛡️ Khiên +${pSteal}đ`,
        storyDescription: `Ghép trúng cặp khiên: Nhận an toàn +${pSteal} điểm thưởng!`,
        effectType: "BONUS_POINTS",
        deltaPoints: pSteal,
      };

  // Cặp Kíp Nổ / Bom: Tinh chỉnh theo bối cảnh đội (UNDERDOG / DOMINANT / NEUTRAL)
  const bombPairDef: PairDef = riskTier === "UNDERDOG"
    ? {
        pairKey: "PAIR_BOMB",
        icon: "💨",
        type: "BOMB_SMOKE",
        storyTitle: "💨 Kíp Nổ Khói 0đ",
        storyDescription: "May mắn thoát hiểm! Kíp nổ chỉ giải phóng khói mù (0đ phạt tổng điểm)!",
        effectType: "LOSE_POT_POINTS",
        deltaPoints: 0,
      }
    : riskTier === "DOMINANT"
    ? {
        pairKey: "PAIR_BOMB",
        icon: "🌑",
        type: "BOMB_DARK",
        storyTitle: `🌑 Kíp Nổ Hắc Ám -${pPenalty}đ`,
        storyDescription: "Ghép trúng cặp kíp nổ hắc ám: Rút điểm chia đều cho các đối thủ!",
        effectType: "LOSE_POINTS",
        deltaPoints: -pPenalty,
      }
    : {
        pairKey: "PAIR_BOMB",
        icon: "💣",
        type: "BOMB_MAJOR",
        storyTitle: `💣 Kíp Nổ -${pPenalty}đ`,
        storyDescription: "Ghép trúng cặp kíp nổ: Kích nổ bom hắc ám hủy diệt tổng điểm!",
        effectType: "LOSE_POINTS",
        deltaPoints: -pPenalty,
      };

  // Cặp Ngọc May Mắn (Thưởng tích cực dùng ở Round 1 để thay thế 1 cặp tiêu cực, bảo đảm tiêu cực < 20%)
  const luckyGemPair: PairDef = {
    pairKey: "PAIR_LUCKY_GEM",
    icon: "🔮",
    type: "REWARD",
    storyTitle: `🔮 Ngọc Thần +${pBonusMed}đ`,
    storyDescription: `Tìm thấy cặp ngọc thần phước lành: Nhận an toàn +${pBonusMed} điểm thưởng!`,
    effectType: "BONUS_POINTS",
    deltaPoints: pBonusMed,
  };

  // Danh sách 6 cặp thẻ (12 lá):
  // - Round 1: 5 cặp tích cực + 1 cặp tiêu cực = 10 lá tích cực / 2 lá tiêu cực (2/12 = 16.7% < 20% tiêu cực!)
  // - Round 2+: 4 cặp tích cực + 2 cặp tiêu cực = 8 lá tích cực / 4 lá tiêu cực (4/12 = 33.3% mức gốc, kèm tinh chỉnh loại bom)
  const pairs: PairDef[] = currentRound <= 1
    ? [
        {
          pairKey: "PAIR_MULTIPLY",
          icon: "🚀",
          type: "REWARD",
          storyTitle: `🚀 Nhân Đôi +${pBonusTop}đ`,
          storyDescription: `Kích hoạt nhân đôi: Nhận nóng +${pBonusTop} điểm thưởng!`,
          effectType: "MULTIPLY_X2",
          deltaPoints: pBonusTop,
        },
        stealOrBonusPair,
        {
          pairKey: "PAIR_TREASURE",
          icon: "💎",
          type: "REWARD",
          storyTitle: `💎 Kho Báu +${pBonusHigh}đ`,
          storyDescription: `Tìm thấy cặp ngọc quý: Nhận ngay +${pBonusHigh} điểm thưởng!`,
          effectType: "BONUS_POINTS",
          deltaPoints: pBonusHigh,
        },
        {
          pairKey: "PAIR_STAR",
          icon: "⭐",
          type: "REWARD",
          storyTitle: `⭐ May Mắn +${pBonusMed}đ`,
          storyDescription: `Tìm thấy cặp sao may mắn: Nhận an toàn +${pBonusMed} điểm thưởng!`,
          effectType: "BONUS_POINTS",
          deltaPoints: pBonusMed,
        },
        luckyGemPair,
        // Cặp tiêu cực duy nhất ở Round 1 (2/12 lá)
        riskTier === "UNDERDOG"
          ? {
              pairKey: "PAIR_TRAP",
              icon: "💨",
              type: "BOMB_SMOKE",
              storyTitle: "💨 Bẫy Khói 0đ",
              storyDescription: "Kích hoạt bẫy khói: Mất điểm tích lũy câu này (0đ), bảo toàn tổng điểm!",
              effectType: "LOSE_POT_POINTS",
              deltaPoints: 0,
            }
          : bombPairDef,
      ]
    : [
        {
          pairKey: "PAIR_MULTIPLY",
          icon: "🚀",
          type: "REWARD",
          storyTitle: `🚀 Nhân Đôi +${pBonusTop}đ`,
          storyDescription: `Kích hoạt nhân đôi: Nhận nóng +${pBonusTop} điểm thưởng!`,
          effectType: "MULTIPLY_X2",
          deltaPoints: pBonusTop,
        },
        stealOrBonusPair,
        {
          pairKey: "PAIR_TREASURE",
          icon: "💎",
          type: "REWARD",
          storyTitle: `💎 Kho Báu +${pBonusHigh}đ`,
          storyDescription: `Tìm thấy cặp ngọc quý: Nhận ngay +${pBonusHigh} điểm thưởng!`,
          effectType: "BONUS_POINTS",
          deltaPoints: pBonusHigh,
        },
        {
          pairKey: "PAIR_STAR",
          icon: "⭐",
          type: "REWARD",
          storyTitle: `⭐ May Mắn +${pBonusMed}đ`,
          storyDescription: `Tìm thấy cặp sao may mắn: Nhận an toàn +${pBonusMed} điểm thưởng!`,
          effectType: "BONUS_POINTS",
          deltaPoints: pBonusMed,
        },
        {
          pairKey: "PAIR_TRAP",
          icon: "💨",
          type: "BOMB_SMOKE",
          storyTitle: "💨 Bẫy Khói 0đ",
          storyDescription: `Kích hoạt bẫy khói độc: Mất toàn bộ điểm tích lũy của câu hỏi này (0đ)!`,
          effectType: "LOSE_POT_POINTS",
          deltaPoints: 0,
        },
        bombPairDef,
      ];

  const tileItems: Omit<MysteryTile, "id" | "label">[] = [];
  pairs.forEach((p) => {
    // Add 2 copies for each pair (total 12 cards)
    for (let c = 0; c < 2; c++) {
      tileItems.push({
        icon: p.icon,
        isOpened: false,
        type: p.type,
        storyTitle: p.storyTitle,
        storyDescription: p.storyDescription,
        effectType: p.effectType,
        deltaPoints: p.deltaPoints,
        pairKey: p.pairKey,
      });
    }
  });

  // Shuffle items
  const shuffled = tileItems.sort(() => Math.random() - 0.5);
  return shuffled.map((item, idx) => ({
    ...item,
    id: idx + 1,
    label: `Thẻ #${idx + 1}`,
  }));
}

/**
 * Tạo 10 thẻ (5 cặp) cho MEMORY_PAIRS trong Chế độ Sinh Tử (khi trả lời sai):
 * - Chính xác 20% = 1 cặp Thoát Hiểm An Toàn 🕊️ (2 lá)
 * - Chính xác 80% = 4 cặp Bẫy / Bom 💀 (8 lá: Bẫy trừ gốc, Bom Khói, Bom Hắc Ám, Bom Từ Thiện)
 * - Tuyệt đối 0% cặp cộng điểm
 */
export function generateSurvivalMemoryPairsTiles(
  basePoints: number = 20,
  options?: {
    teams?: MysteryTeamRef[];
    currentTeamId?: string;
  }
): MysteryTile[] {
  const pPenalty = basePoints;
  const pSmokePenalty = roundToMultipleOfFive(basePoints * 0.5);

  const pairs: Array<{
    pairKey: string;
    icon: string;
    type: MysteryTileType;
    storyTitle: string;
    storyDescription: string;
    effectType: MysteryTileEffectType;
    deltaPoints: number;
  }> = [
    // 1. Cặp Thoát Hiểm (20% - 1 cặp)
    {
      pairKey: "PAIR_ESCAPE",
      icon: "🕊️",
      type: "ESCAPE_SAFE",
      storyTitle: "🕊️ Thoát Hiểm",
      storyDescription: "Kỳ tích xuất hiện! Ghép trúng cặp Thoát Hiểm, bảo toàn nguyên vẹn điểm số và tim!",
      effectType: "BONUS_POINTS",
      deltaPoints: 0,
    },
    // 2. Cặp Bẫy Trừ Gốc
    {
      pairKey: "PAIR_TRAP_BASE",
      icon: "⚠️",
      type: "BOMB_MINOR",
      storyTitle: `⚠️ Bẫy Trừ -${pPenalty}đ`,
      storyDescription: `Ghép trúng bẫy tử thần: Bị trừ ${pPenalty} điểm gốc câu hỏi!`,
      effectType: "LOSE_POINTS",
      deltaPoints: -pPenalty,
    },
    // 3. Cặp Bom Khói (Trừ 50% điểm gốc)
    {
      pairKey: "PAIR_BOMB_SMOKE",
      icon: "💨",
      type: "BOMB_SMOKE",
      storyTitle: `💨 Bom Khói -${pSmokePenalty}đ`,
      storyDescription: `Ghép trúng bẫy khói: Chế độ Sinh Tử phạt trừ 50% điểm gốc câu hỏi (-${pSmokePenalty}đ)!`,
      effectType: "LOSE_POINTS",
      deltaPoints: -pSmokePenalty,
    },
    // 4. Cặp Bom Hắc Ám (Bom Tối - trừ điểm gốc câu hỏi)
    {
      pairKey: "PAIR_BOMB_DARK",
      icon: "🌑",
      type: "BOMB_DARK",
      storyTitle: `🌑 Bom Tối -${pPenalty}đ`,
      storyDescription: `Ghép trúng kíp nổ hắc ám: Chế độ Sinh Tử phạt trừ ${pPenalty} điểm gốc câu hỏi!`,
      effectType: "LOSE_POINTS",
      deltaPoints: -pPenalty,
    },
    // 5. Cặp Bom Từ Thiện
    {
      pairKey: "PAIR_BOMB_CHARITY",
      icon: "🎁",
      type: "BOMB_CHARITY",
      storyTitle: "🎁 Bom Tặng",
      storyDescription: "Ghép trúng bom từ thiện: Phạt theo mức thấp hơn giữa 50% điểm đội và 1.5x điểm câu, chuyển tặng cho Top 1!",
      effectType: "LOSE_POINTS",
      deltaPoints: 0,
    },
  ];

  const tileItems: Omit<MysteryTile, "id" | "label">[] = [];
  pairs.forEach((p) => {
    for (let c = 0; c < 2; c++) {
      tileItems.push({
        icon: p.icon,
        isOpened: false,
        type: p.type,
        storyTitle: p.storyTitle,
        storyDescription: p.storyDescription,
        effectType: p.effectType,
        deltaPoints: p.deltaPoints,
        pairKey: p.pairKey,
        isPeeked: false,
      });
    }
  });

  const shuffled = tileItems.sort(() => Math.random() - 0.5);
  return shuffled.map((item, idx) => ({
    ...item,
    id: idx + 1,
    label: `Thẻ #${idx + 1}`,
    isOpened: false,
  }));
}

/**
 * Generates tiles specifically for Variant 2: ONE_SHOT_DOORS (3 doors).
 */
/**
 * Generates tiles specifically for Variant 2: ONE_SHOT_DOORS (5 Cánh Cửa Bí Mật).
 * - 3 Cửa Thưởng: Hoàng Gia (+2x), Đoạt Bảo (+1x) / Kho Báu (+1.5x), Tinh Tú (+1x)
 * - 2 Cửa Trừ: Cửa Trừ Điểm Gốc (-1x) & Cửa Bom Ngẫu Nhiên (Khói / Hắc Ám / Từ Thiện)
 * - Mắt Thần (PEEK_PROMO): Tự động phát hiện vị trí Cửa Trừ Điểm Gốc và khóa không cho chọn.
 */
export function generateOneShotDoorsTiles(
  basePoints: number = 20,
  options?: {
    currentRound?: number;
    teams?: MysteryTeamRef[];
    currentTeamId?: string;
    promoPerk?: any;
    riskTier?: TeamRiskTier;
  }
): MysteryTile[] {
  interface DoorDef {
    icon: string;
    type: MysteryTileType;
    storyTitle: string;
    storyDescription: string;
    effectType: MysteryTileEffectType;
    deltaPoints: number;
    isBasePenalty?: boolean;
    isBombDoor?: boolean;
    bombDoorType?: "BOMB_SMOKE" | "BOMB_DARK" | "BOMB_CHARITY";
  }

  const riskTier = options?.riskTier ?? "NEUTRAL";
  const currentRound = options?.currentRound ?? 1;
  const currentTeam = options?.teams?.find((t) => t.id === options?.currentTeamId);
  const currentTeamScore = currentTeam?.score || 0;

  const pHigh = basePoints * 2; // Cửa Hoàng Gia: 20đ với câu 10đ, 40đ với 20đ, 60đ với 30đ
  const pSteal = basePoints; // Cửa Đoạt Bảo: Cướp đúng điểm gốc câu hỏi (10đ/20đ/30đ)
  const pTreasure = riskTier === "UNDERDOG" ? basePoints * 2 : Math.round(basePoints * 1.5); // Kho Báu thay thế nếu không có đối thủ đủ điểm cướp
  const pNormal = basePoints; // Cửa Tinh Tú: +10đ/+20đ/+30đ
  const pPenalty = riskTier === "UNDERDOG" ? 0 : basePoints; // Cửa Trừ Gốc: Đội yếu thế không bị trừ âm tổng điểm

  const canSteal = currentRound >= 2 && Boolean(
    options?.teams &&
    options?.teams.some((t) => t.id !== options?.currentTeamId && (t.score || 0) >= pSteal)
  );

  const stealOrBonusDoor: DoorDef = canSteal
    ? {
        icon: "🗡️",
        type: "REWARD",
        storyTitle: `🗡️ Cướp +${pSteal}đ`,
        storyDescription: `Kích hoạt cướp: Cướp +${pSteal}đ từ một đối thủ đủ điều kiện!`,
        effectType: "STEAL_POINTS",
        deltaPoints: pSteal,
      }
    : {
        icon: "💎",
        type: "REWARD",
        storyTitle: `💎 Kho Báu +${pTreasure}đ`,
        storyDescription: `Mở ra kho báu: Nhận an toàn +${pTreasure} điểm thưởng!`,
        effectType: "BONUS_POINTS",
        deltaPoints: pTreasure,
      };

  // Cửa Bom Ngẫu Nhiên: Tích hợp cân bằng động theo Round & Thế trận
  const selectedBombType = rollBombTypeForMinigame("ONE_SHOT_DOORS", currentTeamScore, {
    currentRound,
    riskTier,
  });

  // Cửa Khiên Thần May Mắn: Thưởng an toàn thay thế Cửa Bẫy ở Round 1 để bảo đảm chỉ 1/5 cửa tiêu cực (20%)
  const luckyShieldDoor: DoorDef = {
    icon: "🛡️",
    type: "REWARD",
    storyTitle: `🛡️ Khiên Thần +${pNormal}đ`,
    storyDescription: `Mở trúng cánh cửa phước lành: Nhận an toàn +${pNormal} điểm thưởng!`,
    effectType: "BONUS_POINTS",
    deltaPoints: pNormal,
  };

  // Cửa Bẫy Trừ Gốc: Ở Round 2+, đội Yếu Thế (UNDERDOG) được bảo toàn điểm số (0đ phạt)
  const baseTrapDoor: DoorDef = riskTier === "UNDERDOG"
    ? {
        icon: "💨",
        type: "BOMB_SMOKE",
        storyTitle: "💨 Cửa Khói Thoát Hiểm 0đ",
        storyDescription: "May mắn thoát hiểm! Cửa bẫy chỉ giải phóng khói mù (0đ phạt tổng điểm)!",
        effectType: "LOSE_POT_POINTS",
        deltaPoints: 0,
        isBasePenalty: true,
      }
    : {
        icon: "⚠️",
        type: "BOMB_MINOR",
        storyTitle: `⚠️ Cửa Bẫy -${pPenalty}đ`,
        storyDescription: `Dính bẫy phạt: Trừ ${pPenalty} điểm (đúng bằng điểm gốc câu hỏi)!`,
        effectType: "LOSE_POINTS",
        deltaPoints: -pPenalty,
        isBasePenalty: true,
      };

  // Cửa Bom Duy Nhất / Ngẫu Nhiên: Đội UNDERDOG luôn được hưởng Bom Khói 0đ
  const bombDoorDef: DoorDef = {
    icon: "💣",
    type: "BOMB_MAJOR",
    storyTitle: "💣 Cửa Bom",
    storyDescription: "Dính bẫy ngầm ma thuật: Kích nổ bom bất ngờ mang hiệu ứng đặc biệt!",
    effectType: "LOSE_POINTS",
    deltaPoints: riskTier === "UNDERDOG" ? 0 : -pPenalty,
    isBombDoor: true,
    bombDoorType: selectedBombType,
  };

  // Danh sách 5 cánh cửa:
  // - Round 1: 4 cửa tích cực + 1 cửa tiêu cực = 1/5 = 20% tiêu cực (đúng quy chuẩn < 20%)
  // - Round 2+: 3 cửa tích cực + 2 cửa tiêu cực = 2/5 = 40% tiêu cực (mức gốc, kèm tinh chỉnh thế trận)
  const doors: DoorDef[] = currentRound <= 1
    ? [
        // 1. Cửa Hoàng Gia (+2x basePoints)
        {
          icon: "👑",
          type: "REWARD",
          storyTitle: `👑 Đại Thưởng +${pHigh}đ`,
          storyDescription: `Mở đúng cánh cửa vinh quang: Nhận ngay +${pHigh} điểm thưởng siêu cấp!`,
          effectType: "BONUS_POINTS",
          deltaPoints: pHigh,
        },
        // 2. Cửa Đoạt Bảo / Kho Báu (+1x steal hoặc +1.5x)
        stealOrBonusDoor,
        // 3. Cửa Tinh Tú (+1x basePoints)
        {
          icon: "⭐",
          type: "REWARD",
          storyTitle: `⭐ May Mắn +${pNormal}đ`,
          storyDescription: `Mở trúng cánh cửa may mắn: Nhận an toàn +${pNormal} điểm thưởng!`,
          effectType: "BONUS_POINTS",
          deltaPoints: pNormal,
        },
        // 4. Cửa Khiên Thần May Mắn (Tích cực ở Round 1)
        luckyShieldDoor,
        // 5. Cửa Tiêu Cực duy nhất ở Round 1 (1/5 cửa = 20%)
        bombDoorDef,
      ]
    : [
        // 1. Cửa Hoàng Gia (+2x basePoints)
        {
          icon: "👑",
          type: "REWARD",
          storyTitle: `👑 Đại Thưởng +${pHigh}đ`,
          storyDescription: `Mở đúng cánh cửa vinh quang: Nhận ngay +${pHigh} điểm thưởng siêu cấp!`,
          effectType: "BONUS_POINTS",
          deltaPoints: pHigh,
        },
        // 2. Cửa Đoạt Bảo / Kho Báu (+1x steal hoặc +1.5x)
        stealOrBonusDoor,
        // 3. Cửa Tinh Tú (+1x basePoints)
        {
          icon: "⭐",
          type: "REWARD",
          storyTitle: `⭐ May Mắn +${pNormal}đ`,
          storyDescription: `Mở trúng cánh cửa may mắn: Nhận an toàn +${pNormal} điểm thưởng!`,
          effectType: "BONUS_POINTS",
          deltaPoints: pNormal,
        },
        // 4. Cửa Bẫy Trừ Điểm Gốc (-1x basePoints hoặc Thoát hiểm nếu UNDERDOG)
        baseTrapDoor,
        // 5. Cửa Bẫy Bom Ngẫu Nhiên
        bombDoorDef,
      ];

  const shuffled = [...doors].sort(() => Math.random() - 0.5);
  const hasPeekPerk = options?.promoPerk && getPerkType(options.promoPerk) === "PEEK_PROMO";

  return shuffled.map((d, idx) => {
    const isPeekedDoor = Boolean(hasPeekPerk && d.isBasePenalty);
    return {
      id: idx + 1,
      label: `Cửa #${idx + 1}`,
      icon: d.icon,
      isOpened: false,
      type: d.type,
      storyTitle: d.storyTitle,
      storyDescription: d.storyDescription,
      effectType: d.effectType,
      deltaPoints: d.deltaPoints,
      isPeeked: isPeekedDoor,
      peekLabel: isPeekedDoor ? `⚠️ Cửa Bẫy -${pPenalty}đ` : undefined,
      peekIcon: isPeekedDoor ? "⚠️" : undefined,
      bombDoorType: d.bombDoorType,
    };
  });
}

/**
 * Tạo 5 cánh cửa cho Chế độ Sinh Tử (khi trả lời sai):
 * - Chính xác 20% = 1 Cửa Thoát Hiểm An Toàn (Giữ điểm, bảo toàn tim)
 * - Chính xác 80% = 4 Cửa Bẫy / Bom (Bẫy trừ điểm gốc, Bom Khói -50% gốc, Bom Hắc Ám, Bom Từ Thiện)
 * - Tuyệt đối 0% cửa cộng điểm
 */
export function generateSurvivalOneShotDoorsTiles(
  basePoints: number = 20,
  options?: {
    teams?: MysteryTeamRef[];
    currentTeamId?: string;
  }
): MysteryTile[] {
  const pPenalty = basePoints;
  const pSmokePenalty = roundToMultipleOfFive(basePoints * 0.5);

  const doors: Array<{
    icon: string;
    type: MysteryTileType;
    storyTitle: string;
    storyDescription: string;
    effectType: MysteryTileEffectType;
    deltaPoints: number;
    isBasePenalty?: boolean;
    isBombDoor?: boolean;
    bombDoorType?: "BOMB_SMOKE" | "BOMB_DARK" | "BOMB_CHARITY";
  }> = [
    // 1. Cửa Thoát Hiểm An Toàn (20% - 1 cửa duy nhất)
    {
      icon: "🕊️",
      type: "ESCAPE_SAFE",
      storyTitle: "🕊️ Thoát Hiểm",
      storyDescription: "May mắn tuyệt đỉnh! Bạn đã mở đúng Cửa Thoát Hiểm, bảo toàn nguyên vẹn điểm số và tim!",
      effectType: "BONUS_POINTS",
      deltaPoints: 0,
    },
    // 2. Cửa Bẫy Trừ Điểm Gốc
    {
      icon: "⚠️",
      type: "BOMB_MINOR",
      storyTitle: `⚠️ Cửa Bẫy -${pPenalty}đ`,
      storyDescription: `Dính bẫy phạt sinh tử: Bị trừ ${pPenalty} điểm (đúng bằng điểm gốc câu hỏi)!`,
      effectType: "LOSE_POINTS",
      deltaPoints: -pPenalty,
      isBasePenalty: true,
    },
    // 3. Cửa Bom Khói (Trừ 50% điểm gốc)
    {
      icon: "💨",
      type: "BOMB_SMOKE",
      storyTitle: `💨 Bom Khói -${pSmokePenalty}đ`,
      storyDescription: `Khói mù bao phủ: Chế độ Sinh Tử phạt trừ 50% điểm gốc câu hỏi (-${pSmokePenalty}đ)!`,
      effectType: "LOSE_POINTS",
      deltaPoints: -pSmokePenalty,
      isBombDoor: true,
      bombDoorType: "BOMB_SMOKE",
    },
    // 4. Cửa Bom Hắc Ám (Bom Tối - trừ điểm gốc câu hỏi)
    {
      icon: "🌑",
      type: "BOMB_DARK",
      storyTitle: `🌑 Bom Tối -${pPenalty}đ`,
      storyDescription: `Năng lượng bóng tối bùng phát! Chế độ Sinh Tử phạt trừ ${pPenalty} điểm gốc câu hỏi!`,
      effectType: "LOSE_POINTS",
      deltaPoints: -pPenalty,
      isBombDoor: true,
      bombDoorType: "BOMB_DARK",
    },
    // 5. Cửa Bom Từ Thiện (Tặng Top 1)
    {
      icon: "🎁",
      type: "BOMB_CHARITY",
      storyTitle: "🎁 Bom Tặng",
      storyDescription: "Lòng tốt bất đắc dĩ: Phạt theo mức thấp hơn giữa 50% điểm đội và 1.5x điểm câu, chuyển tặng cho Top 1!",
      effectType: "LOSE_POINTS",
      deltaPoints: 0,
      isBombDoor: true,
      bombDoorType: "BOMB_CHARITY",
    },
  ];

  const shuffled = [...doors].sort(() => Math.random() - 0.5);

  return shuffled.map((d, idx) => ({
    id: idx + 1,
    label: `Cửa #${idx + 1}`,
    icon: d.icon,
    isOpened: false,
    type: d.type,
    storyTitle: d.storyTitle,
    storyDescription: d.storyDescription,
    effectType: d.effectType,
    deltaPoints: d.deltaPoints,
    isPeeked: false,
    bombDoorType: d.bombDoorType,
  }));
}

/**
 * Generates tiles specifically for Variant 4: TAROT_DESTINY (5 cards).
 */
export function generateTarotDestinyTiles(
  basePoints: number = 20,
  options?: {
    currentRound?: number;
    teams?: MysteryTeamRef[];
    currentTeamId?: string;
    riskTier?: TeamRiskTier;
  }
): MysteryTile[] {
  interface TarotDef {
    tarotName: string;
    icon: string;
    type: MysteryTileType;
    storyTitle: string;
    storyDescription: string;
    effectType: MysteryTileEffectType;
    deltaPoints: number;
  }

  const riskTier = options?.riskTier ?? "NEUTRAL";
  const pSun = riskTier === "UNDERDOG" ? Math.round(basePoints * 2.5) : basePoints * 2;
  const pEmperor = Math.round(basePoints * 1.5);
  const pFool = basePoints + 10;
  const pKnight = basePoints;
  const pDeath = riskTier === "UNDERDOG" ? 0 : basePoints;

  const currentRound = options?.currentRound ?? 1;
  const canSteal = currentRound >= 2 && Boolean(
    options?.teams &&
    options?.teams.some((t) => t.id !== options?.currentTeamId && (t.score || 0) >= pKnight)
  );

  const fifthCard: TarotDef = canSteal
    ? {
        tarotName: "Hiệp Sĩ Đạo Tặc (The Knight)",
        icon: "🗡️",
        type: "REWARD",
        storyTitle: `🗡️ Cướp +${pKnight}đ`,
        storyDescription: `Thanh gươm công lý: Cướp +${pKnight}đ từ một đối thủ đủ điều kiện!`,
        effectType: "STEAL_POINTS",
        deltaPoints: pKnight,
      }
    : {
        tarotName: "Ngôi Sao Hy Vọng (The Star)",
        icon: "⭐",
        type: "REWARD",
        storyTitle: `⭐ Ngôi Sao +${pKnight}đ`,
        storyDescription: `Ánh sao may mắn: Nhận nóng +${pKnight} điểm thưởng!`,
        effectType: "BONUS_POINTS",
        deltaPoints: pKnight,
      };

  const deathCard: TarotDef = riskTier === "UNDERDOG"
    ? {
        tarotName: "Thần Chết (Death)",
        icon: "💀",
        type: "BOMB_SMOKE",
        storyTitle: "💀 Thần Chết Thử Thách 0đ",
        storyDescription: "Lưỡi hái định mệnh tha thứ cho đội yếu thế: Chỉ mất điểm tích lũy câu hiện tại, tổng điểm không đổi!",
        effectType: "LOSE_POT_POINTS",
        deltaPoints: 0,
      }
    : {
        tarotName: "Thần Chết (Death)",
        icon: "💀",
        type: "BOMB_MAJOR",
        storyTitle: `💀 Thần Chết -${pDeath}đ`,
        storyDescription: `Lưỡi hái định mệnh: Bị phạt trừ ${pDeath} điểm từ tổng điểm!`,
        effectType: "LOSE_POINTS",
        deltaPoints: -pDeath,
      };

  const tarotCards: TarotDef[] = [
    {
      tarotName: "Mặt Trời (The Sun)",
      icon: "☀️",
      type: "REWARD",
      storyTitle: `☀️ Mặt Trời +${pSun}đ`,
      storyDescription: `Ánh dương soi rọi: Ban tặng +${pSun} điểm thưởng!`,
      effectType: "BONUS_POINTS",
      deltaPoints: pSun,
    },
    {
      tarotName: "Hoàng Đế (The Emperor)",
      icon: "👑",
      type: "REWARD",
      storyTitle: `👑 Hoàng Đế +${pEmperor}đ`,
      storyDescription: `Vương miện uy quyền: Thưởng nóng +${pEmperor} điểm danh dự!`,
      effectType: "BONUS_POINTS",
      deltaPoints: pEmperor,
    },
    {
      tarotName: "Kẻ Khờ (The Fool)",
      icon: "🃏",
      type: "REWARD",
      storyTitle: `🃏 Kẻ Khờ +${pFool}đ`,
      storyDescription: `Vận may bất ngờ: Đột phá năng lượng (+${pFool}đ)!`,
      effectType: "BONUS_POINTS",
      deltaPoints: pFool,
    },
    deathCard,
    fifthCard,
  ];

  const shuffled = [...tarotCards].sort(() => Math.random() - 0.5);
  return shuffled.map((card, idx) => ({
    id: idx + 1,
    label: `Lá #${idx + 1}`,
    tarotName: card.tarotName,
    icon: card.icon,
    isOpened: false,
    type: card.type,
    storyTitle: card.storyTitle,
    storyDescription: card.storyDescription,
    effectType: card.effectType,
    deltaPoints: card.deltaPoints,
  }));
}

/**
 * Generates the next card in the endless draw stack for Variant 3: PUSH_YOUR_LUCK.
 * Bomb chance scales with base question points:
 * - 10đ (Easy question): 35% bomb chance (higher risk to counter easy questions)
 * - 20đ (Medium question): 25% bomb chance (balanced)
 * - 30đ (Hard question): 20% bomb chance (lower risk reward for hard question mastery)
 * Special rules:
 * - If teamScore <= 0: Doom/Charity bombs downgrade to Smoke Bomb (no negative total score, no phantom gifting)
 * - Traps (Hố sâu -5đ/-10đ, Khóa két an toàn Force Stop)
 */
export function generateNextPushYourLuckCard({
  theme,
  drawIndex,
  basePoints = 10,
  teamScore = 0,
  isDoublePromo = false,
  options,
}: {
  theme: MysteryTheme;
  drawIndex: number;
  basePoints?: number;
  teamScore?: number;
  isDoublePromo?: boolean;
  options?: {
    currentRound?: number;
    teams?: MysteryTeamRef[];
    currentTeamId?: string;
    riskTier?: TeamRiskTier;
  };
}): MysteryTile {
  const riskTier = options?.riskTier ?? "NEUTRAL";
  const currentRound = options?.currentRound ?? 1;

  // LẬT LIỀU: 5 LƯỢT BỐC ĐẦU TIÊN CÓ TỶ LỆ TRÚNG BÀI CỘNG VƯỢT TRỘI, TỶ LỆ BOM < 20%
  // - Lá 1: An toàn tuyệt đối 100% (0% bom)
  // - Lá 2 -> 5: Bom khống chế dưới 20% (Underdog: 5%, Neutral: 10%, Dominant: 15%)
  // - Từ Lá 6 trở đi: Về mức gốc và lũy tiến rủi ro theo bối cảnh thế trận
  let bombChance: number;
  if (drawIndex <= 1) {
    bombChance = 0;
  } else if (drawIndex <= 5) {
    // 5 lượt bốc đầu tiên: Tỷ lệ bom thấp nghiêm ngặt (< 20%)
    if (riskTier === "UNDERDOG") {
      bombChance = 0.05;
    } else if (riskTier === "DOMINANT") {
      bombChance = 0.15;
    } else {
      bombChance = 0.10;
    }
  } else {
    // Từ lá thứ 6 trở đi: Trở về tỷ lệ gốc và lũy tiến rủi ro (+3% đến +6% mỗi lá)
    const extraDraws = drawIndex - 5;
    if (riskTier === "UNDERDOG") {
      bombChance = Math.min(0.30, 0.15 + extraDraws * 0.03);
    } else if (riskTier === "DOMINANT") {
      bombChance = Math.min(0.65, 0.35 + extraDraws * 0.06);
    } else if (basePoints <= 10) {
      bombChance = Math.min(0.55, 0.30 + extraDraws * 0.05);
    } else if (basePoints <= 20) {
      bombChance = Math.min(0.50, 0.25 + extraDraws * 0.05);
    } else {
      bombChance = Math.min(0.45, 0.20 + extraDraws * 0.04);
    }
  }

  const isBomb = Math.random() < bombChance;
  const id = drawIndex;
  const label = `Lá #${drawIndex}`;

  if (isBomb) {
    // Nếu ở 5 lá đầu lỡ trúng bom hoặc team có 0đ -> Luôn hạ xuống Bom Khói 0đ (không trừ điểm tổng)
    if (drawIndex <= 5 || teamScore <= 0) {
      return {
        id,
        label,
        icon: "💨",
        isOpened: false,
        type: "BOMB_SMOKE",
        storyTitle: "💨 Bom Khói 0đ",
        storyDescription: "Khói mù bao phủ! Mất toàn bộ điểm tích lũy của câu này. Tổng điểm tài khoản được bảo toàn!",
        effectType: "LOSE_POINTS",
        deltaPoints: 0,
      };
    }

    const bombType = rollBombTypeForMinigame("PUSH_YOUR_LUCK", teamScore, {
      currentRound,
      riskTier,
    });

    if (bombType === "BOMB_SMOKE") {
      return {
        id,
        label,
        icon: "💨",
        isOpened: false,
        type: "BOMB_SMOKE",
        storyTitle: "💨 Bom Khói 0đ",
        storyDescription: "Khói mù bao phủ! Mất toàn bộ điểm tích lũy ở câu hiện tại (0 điểm nhận được). Tổng điểm giữ nguyên!",
        effectType: "LOSE_POINTS",
        deltaPoints: 0,
      };
    } else if (bombType === "BOMB_DARK") {
      return {
        id,
        label,
        icon: "🌑",
        isOpened: false,
        type: "BOMB_DARK",
        storyTitle: "🌑 Bom Tối",
        storyDescription: "Năng lượng bóng tối bùng phát! Điểm số của bạn bị rút cạn và phân chia đều cho các đội đối thủ!",
        effectType: "LOSE_POINTS",
        deltaPoints: 0,
      };
    } else {
      return {
        id,
        label,
        icon: "🎁",
        isOpened: false,
        type: "BOMB_CHARITY",
        storyTitle: "🎁 Bom Tặng",
        storyDescription: "Lòng tốt bất đắc dĩ! Bị trừ theo mức thấp hơn giữa 50% điểm đội và 1.5x điểm câu, chuyển tặng toàn bộ cho đội đang dẫn đầu!",
        effectType: "GIFT_POINTS",
        deltaPoints: 0,
      };
    }
  }

  // Safe Reward Card from Theme scaled to question tier (all non-bomb cards are rewards)
  const themeRewards = REWARD_TEMPLATES[theme] || REWARD_TEMPLATES.CASTLE;
  let template = themeRewards[Math.floor(Math.random() * themeRewards.length)];

  // Scale reward deltaPoints according to basePoints (guarantee rewards are >= basePoints)
  let delta = template.deltaPoints;
  if (template.effectType === "BONUS_POINTS" || template.effectType === "STEAL_POINTS") {
    if (basePoints <= 10) {
      // 10đ tier: +10đ, +15đ, +20đ, +25đ
      delta = [10, 15, 20, 25][Math.floor(Math.random() * 4)];
    } else if (basePoints <= 20) {
      // 20đ tier: +20đ, +25đ, +30đ, +40đ
      delta = [20, 25, 30, 40][Math.floor(Math.random() * 4)];
    } else if (basePoints <= 30) {
      // 30đ tier: +30đ, +35đ, +45đ, +60đ
      delta = [30, 35, 45, 60][Math.floor(Math.random() * 4)];
    } else {
      // 40đ tier: +40đ, +50đ, +60đ, +80đ
      delta = [40, 50, 60, 80][Math.floor(Math.random() * 4)];
    }
  }

  let storyTitle = template.storyTitle;
  if (template.effectType === "BONUS_POINTS" || template.effectType === "STEAL_POINTS") {
    storyTitle = storyTitle.replace(/\+\d+đ/g, `+${delta}đ`);
  }

  let storyDescription = template.storyDescription;
  if (template.effectType === "BONUS_POINTS") {
    storyDescription = storyDescription.replace(/\+\d+\s*(điểm|đ)/g, `+${delta} $1`);
  } else if (template.effectType === "STEAL_POINTS") {
    storyDescription = storyDescription.replace(/\b\d+\s*(điểm|đ)/g, `${delta} $1`);
  }

  let effectType = template.effectType;
  if (effectType === "STEAL_POINTS") {
    const currentRound = options?.currentRound ?? 1;
    const canSteal = currentRound >= 2 && Boolean(
      options?.teams &&
      options?.teams.some((t) => t.id !== options?.currentTeamId && (t.score || 0) >= delta)
    );
    if (!canSteal) {
      effectType = "BONUS_POINTS";
      template = {
        storyTitle: `💎 Kho Báu +${delta}đ`,
        storyDescription: `Mở khóa kho báu hoàng kim: Nhận an toàn +${delta} điểm vào quỹ!`,
        deltaPoints: delta,
        effectType: "BONUS_POINTS",
      };
      storyTitle = template.storyTitle;
      storyDescription = template.storyDescription;
    }
  }

  if (isDoublePromo && Math.random() < 0.35) {
    effectType = "MULTIPLY_X2";
    delta = 0;
    storyTitle = "🚀 Nhân Đôi x2";
  }

  return {
    id,
    label,
    icon: effectType === "MULTIPLY_X2" ? "🚀" : effectType === "STEAL_POINTS" ? "🎭" : "💎",
    isOpened: false,
    type: "REWARD",
    storyTitle,
    storyDescription,
    effectType,
    deltaPoints: delta,
  };
}

/**
 * Tạo lá bài cho PUSH_YOUR_LUCK trong Chế độ Sinh Tử (khi trả lời sai):
 * - Chính xác 20% = Lá Thoát Hiểm An Toàn 🕊️ (Giữ điểm, bảo toàn tim)
 * - Chính xác 80% = Lá Bẫy / Bom 💀 (Bẫy trừ gốc, Bom Khói, Bom Hắc Ám, Bom Từ Thiện)
 * - Tuyệt đối 0% lá cộng điểm
 */
export function generateSurvivalPushYourLuckCard({
  drawIndex = 1,
  basePoints = 10,
  teamScore = 0,
  options,
}: {
  drawIndex?: number;
  basePoints?: number;
  teamScore?: number;
  options?: {
    teams?: MysteryTeamRef[];
    currentTeamId?: string;
  };
}): MysteryTile {
  const id = drawIndex;
  const label = `Lá Sinh Tử #${drawIndex}`;
  const pPenalty = basePoints;
  const pSmokePenalty = roundToMultipleOfFive(basePoints * 0.5);
  const rand = Math.random();

  // 20% Thoát Hiểm An Toàn
  if (rand < 0.20) {
    return {
      id,
      label,
      icon: "🕊️",
      isOpened: false,
      type: "ESCAPE_SAFE",
      storyTitle: "🕊️ Thoát Hiểm",
      storyDescription: "Thần may mắn mỉm cười! Lật trúng lá Thoát Hiểm ngoạn mục, bảo toàn nguyên vẹn điểm số và tim!",
      effectType: "BONUS_POINTS",
      deltaPoints: 0,
    };
  }

  // 80% Bẫy / Bom (chia 4 loại đều nhau: 20% mỗi loại)
  if (rand < 0.40) {
    // Bẫy Trừ Gốc
    return {
      id,
      label,
      icon: "⚠️",
      isOpened: false,
      type: "TRAP",
      storyTitle: `⚠️ Bẫy Trừ -${pPenalty}đ`,
      storyDescription: `Dính phải bẫy tử thần: Bị trừ ${pPenalty} điểm (đúng bằng điểm gốc câu hỏi)!`,
      effectType: "LOSE_POINTS",
      deltaPoints: -pPenalty,
    };
  } else if (rand < 0.60) {
    // Bom Khói (trừ 50% điểm gốc)
    return {
      id,
      label,
      icon: "💨",
      isOpened: false,
      type: "BOMB_SMOKE",
      storyTitle: `💨 Bom Khói -${pSmokePenalty}đ`,
      storyDescription: `Khói mù bao phủ: Chế độ Sinh Tử phạt trừ 50% điểm gốc câu hỏi (-${pSmokePenalty}đ)!`,
      effectType: "LOSE_POINTS",
      deltaPoints: -pSmokePenalty,
    };
  } else if (rand < 0.80) {
    // Bom Hắc Ám (Bom Tối - trừ điểm gốc câu hỏi)
    return {
      id,
      label,
      icon: "🌑",
      isOpened: false,
      type: "BOMB_DARK",
      storyTitle: `🌑 Bom Tối -${pPenalty}đ`,
      storyDescription: `Năng lượng bóng tối nuốt chửng! Chế độ Sinh Tử phạt trừ ${pPenalty} điểm gốc câu hỏi!`,
      effectType: "LOSE_POINTS",
      deltaPoints: -pPenalty,
    };
  } else {
    // Bom Từ Thiện
    return {
      id,
      label,
      icon: "🎁",
      isOpened: false,
      type: "BOMB_CHARITY",
      storyTitle: "🎁 Bom Tặng",
      storyDescription: "Lòng tốt bất đắc dĩ: Phạt theo mức thấp hơn giữa 50% điểm đội và 1.5x điểm câu, chuyển tặng cho Top 1!",
      effectType: "LOSE_POINTS",
      deltaPoints: 0,
    };
  }
}

/**
 * Generates initial tiles for Variant 3: PUSH_YOUR_LUCK (Endless Stacked Deck).
 * Starts with Card #1 face-down on top of the deck!
 */
function generatePushYourLuckTiles(
  theme: MysteryTheme,
  basePoints: number = 10,
  teamScore: number = 0,
  isDoublePromo: boolean = false,
  options?: {
    currentRound?: number;
    teams?: MysteryTeamRef[];
    currentTeamId?: string;
  }
): MysteryTile[] {
  const firstCard = generateNextPushYourLuckCard({
    theme,
    drawIndex: 1,
    basePoints,
    teamScore,
    isDoublePromo,
    options,
  });
  return [firstCard];
}

/**
 * Generates a full Mystery Quest turn state for the active team.
 */
export function generateMysteryStageForTurn({
  turnIndex,
  currentTeam,
  teams,
  turnsPerTeam = 2,
  prevTheme,
  prevMiniGameType,
  forcedMiniGameType,
  baseQuestionPoints,
  initialHeartsPerTeam,
  teamHearts,
  timesStolenInCycle,
  consecutiveBombsByTeam,
}: {
  turnIndex: number;
  currentTeam: MysteryTeamRef;
  teams: MysteryTeamRef[];
  turnsPerTeam?: number;
  prevTheme?: MysteryTheme;
  prevMiniGameType?: MysteryMiniGameType;
  forcedMiniGameType?: MysteryMiniGameType;
  baseQuestionPoints?: number;
  initialHeartsPerTeam?: number;
  teamHearts?: Record<string, number>;
  timesStolenInCycle?: Record<string, number>;
  consecutiveBombsByTeam?: Record<string, number>;
}): MysteryQuestState {
  const computedInitialHearts = initialHeartsPerTeam !== undefined ? initialHeartsPerTeam : Math.round(turnsPerTeam / 3);
  let resolvedTeamHearts: Record<string, number> = {};
  if (teamHearts) {
    resolvedTeamHearts = { ...teamHearts };
  } else {
    for (const t of teams) {
      resolvedTeamHearts[t.id] = computedInitialHearts;
    }
  }

  // CƠ CHẾ CHỐNG CƯỚP LIÊN HOÀN: Đến lượt chơi của đội mình, reset số lần bị cướp trong chu kỳ về 0
  const updatedTimesStolen = { ...(timesStolenInCycle || {}) };
  updatedTimesStolen[currentTeam.id] = 0;

  // CƠ CHẾ CÂN BẰNG ĐỘNG RỦI RO: Đánh giá thế trận (UNDERDOG / NEUTRAL / DOMINANT)
  const consecutiveBombs = consecutiveBombsByTeam?.[currentTeam.id] ?? 0;
  const currentTeamRiskTier = evaluateTeamRiskTier({
    team: currentTeam,
    allTeams: teams,
    consecutiveBombs,
  });

  const availableThemes = prevTheme ? THEME_KEYS.filter((t) => t !== prevTheme) : THEME_KEYS;
  const theme = availableThemes[Math.floor(Math.random() * availableThemes.length)];
  const themeMeta = MYSTERY_THEMES[theme];

  const currentRound = Math.floor(turnIndex / Math.max(1, teams.length)) + 1;
  const roundDefaultPoints = currentRound === 1 ? 10 : currentRound === 2 ? 20 : currentRound === 3 ? 30 : 40;
  const effectiveBasePoints = normalizeToThreeLevels(baseQuestionPoints ?? roundDefaultPoints);

  const miniGameType = forcedMiniGameType
    ? normalizeMiniGameType(forcedMiniGameType)
    : getRandomMiniGame(prevMiniGameType);

  const promoPerk = generateMysteryPromoPerk(effectiveBasePoints, miniGameType, {
    teams,
    currentTeamId: currentTeam.id,
  });

  const totalTurns = teams.length * turnsPerTeam;

  let tiles: MysteryTile[] = [];
  let memoryPairsState: MysteryQuestState["memoryPairsState"] = undefined;
  let oneShotState: MysteryQuestState["oneShotState"] = undefined;
  let tarotState: MysteryQuestState["tarotState"] = undefined;

  const roundOptions = {
    currentRound,
    teams,
    currentTeamId: currentTeam.id,
    riskTier: currentTeamRiskTier,
  };

  switch (miniGameType) {
    case "MEMORY_PAIRS":
      tiles = generateMemoryPairsTiles(effectiveBasePoints, roundOptions);
      if (getPerkType(promoPerk) === "PEEK_PROMO") {
        // Mắt Thần Soi Bài: Soi sáng 2 lá an toàn thuộc 2 cặp khác nhau (giúp né bom, không kiến tạo chiến thắng chắc chắn)
        const safeTiles = tiles.filter((t) => t.type === "REWARD" && t.pairKey !== "PAIR_BOMB" && t.pairKey !== "PAIR_TRAP");
        const shuffledSafe = [...safeTiles].sort(() => Math.random() - 0.5);
        if (shuffledSafe.length >= 2) {
          const first = shuffledSafe[0];
          const second = shuffledSafe.find((t) => t.pairKey !== first.pairKey) || shuffledSafe[1];
          first.isPeeked = true;
          first.peekLabel = "AN TOÀN";
          first.peekIcon = "✨";
          second.isPeeked = true;
          second.peekLabel = "AN TOÀN";
          second.peekIcon = "✨";
        }
      }
      memoryPairsState = {
        firstFlippedTileId: null,
        secondFlippedTileId: null,
        thirdFlippedTileId: null,
        keptBombTileIds: [],
        isBombRescueActive: false,
        activePenaltyPairKey: null,
        attemptsUsed: 0,
        maxAttempts: promoPerk === "EXTRA_ATTEMPT_PROMO" ? 5 : 4,
        matchedPairKey: null,
        isMismatchResolving: false,
        round: 1,
        promptSecondChance: false,
      };
      break;

    case "ONE_SHOT_DOORS":
      tiles = generateOneShotDoorsTiles(effectiveBasePoints, { ...roundOptions, promoPerk });
      oneShotState = {
        chosenTileId: undefined,
        selectedDoorIds: [],
        penaltyDoorsCount: undefined,
        hasBombDetected: false,
        phase: "SELECTING",
        revealedSafeDoorIds: [],
        chosenFinalDoorId: undefined,
        allRevealed: false,
        peekAvailable: getPerkType(promoPerk) === "PEEK_PROMO",
        peekActivated: getPerkType(promoPerk) === "PEEK_PROMO",
        hasSwapped: false,
      };
      break;

    case "TAROT_DESTINY":
      tiles = generateTarotDestinyTiles(effectiveBasePoints, roundOptions);
      tarotState = {
        isWheelSpinning: false,
        isDrawn: false,
        targetAngle: 0,
      };
      break;

    case "PUSH_YOUR_LUCK":
    default:
      tiles = generatePushYourLuckTiles(
        theme,
        effectiveBasePoints,
        currentTeam.score || 0,
        false,
        roundOptions
      );
      break;
  }

  const peekUsesRemaining =
    promoPerk === "PEEK_PROMO" && miniGameType === "PUSH_YOUR_LUCK" ? 1 : 0;

  return {
    currentTurnTeamId: currentTeam.id,
    currentTurnTeamName: currentTeam.name,
    currentTurnTeamColor: currentTeam.color || "#ef4444",
    currentTurnIndex: turnIndex,
    totalTurns,
    turnsPerTeam,
    currentRound,
    theme,
    miniGameType,
    themeNameVi: themeMeta.nameVi,
    themeBgGradient: themeMeta.bgGradient,
    tiles,
    phase: "QUESTION_ACTIVE",
    baseQuestionPoints: effectiveBasePoints,
    promoPerk,
    hasShield: getPerkType(promoPerk) === "SHIELD_PROMO",
    currentTeamRiskTier,
    timesStolenInCycle: updatedTimesStolen,
    consecutiveBombsByTeam: consecutiveBombsByTeam ? { ...consecutiveBombsByTeam } : {},
    potPoints: 0,
    potMultiplier: 1,
    cardsFlippedCount: 0,
    memoryPairsState,
    oneShotState,
    tarotState,
    peekUsesRemaining,
    nextCardPeek: undefined,
    initialHeartsPerTeam: computedInitialHearts,
    teamHearts: resolvedTeamHearts,
  };
}

/**
 * Khởi tạo bàn Minigame Sinh Tử (Survival Mode) khi đội trả lời SAI:
 * - 80% Bẫy/Bom, 20% Thoát Hiểm, 0% Thưởng điểm
 * - Toàn bộ Perk bị phong ấn / vô hiệu hóa
 * - One-shot Survival (1 lượt mở quyết định)
 */
export function startSurvivalPenaltyMinigame({
  state,
  team,
  allTeams = [],
}: {
  state: MysteryQuestState;
  team: MysteryTeamRef;
  allTeams?: MysteryTeamRef[];
}): void {
  const normType = normalizeMiniGameType(state.miniGameType);
  const basePoints = state.baseQuestionPoints || 10;
  const currentScore = team.score || 0;

  state.isPenaltySurvivalMode = true;
  state.survivalDilemmaPending = false;
  state.phase = "PUSH_YOUR_LUCK";
  state.potPoints = 0;
  state.potMultiplier = 1;
  state.promoPerk = undefined; // Vô hiệu hóa perks (A3)
  state.hasShield = false;
  state.cardsFlippedCount = 0;
  state.lastFlippedTile = undefined;
  state.bombExploded = undefined;
  state.turnFinishedReason = undefined;
  state.storyResult = undefined;

  switch (normType) {
    case "ONE_SHOT_DOORS": {
      state.tiles = generateSurvivalOneShotDoorsTiles(basePoints, {
        teams: allTeams,
        currentTeamId: team.id,
      });
      state.oneShotState = {
        chosenTileId: undefined,
        selectedDoorIds: [],
        penaltyDoorsCount: undefined,
        hasBombDetected: false,
        phase: "SELECTING",
        revealedSafeDoorIds: [],
        chosenFinalDoorId: undefined,
        allRevealed: false,
        peekAvailable: false,
        peekActivated: false,
        hasSwapped: false,
      };
      break;
    }
    case "PUSH_YOUR_LUCK": {
      state.tiles = [
        generateSurvivalPushYourLuckCard({
          drawIndex: 1,
          basePoints,
          teamScore: currentScore,
          options: { teams: allTeams, currentTeamId: team.id },
        }),
      ];
      break;
    }
    case "MEMORY_PAIRS": {
      state.tiles = generateSurvivalMemoryPairsTiles(basePoints, {
        teams: allTeams,
        currentTeamId: team.id,
      });
      state.memoryPairsState = {
        firstFlippedTileId: null,
        secondFlippedTileId: null,
        thirdFlippedTileId: null,
        keptBombTileIds: [],
        isBombRescueActive: false,
        activePenaltyPairKey: null,
        attemptsUsed: 0,
        maxAttempts: 4,
        matchedPairKey: null,
        isMismatchResolving: false,
        round: 1,
        promptSecondChance: false,
      };
      break;
    }
    case "TAROT_DESTINY": {
      state.tiles = [];
      state.tarotState = {
        isWheelSpinning: false,
        isDrawn: false,
      };
      break;
    }
  }
}

/**
 * Handles flipping/choosing a tile across all 4 minigame variants.
 */
export function handleFlipCard({
  state,
  tileId,
  team,
  allTeams,
}: {
  state: MysteryQuestState;
  tileId: number;
  team: MysteryTeamRef;
  allTeams: MysteryTeamRef[];
}): {
  updatedState: MysteryQuestState;
  isBomb: boolean;
  scorePenalty: number;
  rewardCard?: CardType;
  finalScoreDelta?: number;
  shouldResetMismatchedCards?: boolean;
  recipientTeamId?: string;
  recipientTeamName?: string;
  giftedPoints?: number;
  darkBombRecipients?: Array<{
    teamId: string;
    teamName: string;
    points: number;
  }>;
  victimTeamId?: string;
  victimTeamName?: string;
  stolenPoints?: number;
} {
  const normType = normalizeMiniGameType(state.miniGameType);
  const currentRound = state.currentRound || 1;
  const consecutiveBombs = state.consecutiveBombsByTeam?.[team.id] ?? 0;
  const riskTier = evaluateTeamRiskTier({
    team,
    allTeams,
    consecutiveBombs,
    currentRound,
  });
  // VARIANT 1: MEMORY_PAIRS (Lật cặp trùng nhau)
  // ═══════════════════════════════════════════════════════════════════════════
  if (normType === "MEMORY_PAIRS") {
    const memState = state.memoryPairsState || {
      firstFlippedTileId: null,
      secondFlippedTileId: null,
      thirdFlippedTileId: null,
      keptBombTileIds: [],
      isBombRescueActive: false,
      activePenaltyPairKey: null,
      attemptsUsed: 0,
      maxAttempts: getPerkType(state.promoPerk) === "EXTRA_ATTEMPT_PROMO" ? 5 : 4,
      matchedPairKey: null,
      isMismatchResolving: false,
      round: 1,
      promptSecondChance: false,
    };

    if (
      memState.isMismatchResolving ||
      memState.promptSecondChance ||
      memState.matchedPairKey ||
      state.phase === "TURN_SUMMARY" ||
      ((memState.attemptsUsed >= memState.maxAttempts) && !memState.isBombRescueActive)
    ) {
      return { updatedState: state, isBomb: false, scorePenalty: 0 };
    }

    const numTileId = Number(tileId);
    const tile = state.tiles.find((t) => Number(t.id) === numTileId);
    if (!tile || tile.isOpened) {
      return { updatedState: state, isBomb: false, scorePenalty: 0 };
    }

    // ═════════════════════════════════════════════════════════════════════════
    // CHẾ ĐỘ SINH TỬ (SURVIVAL PENALTY MODE) - LẬT CẶP KHI TRẢ LỜI SAI:
    // - 1 lần chơi duy nhất (Vòng 1, tối đa 4 lượt, không có second chance)
    // - Tất cả lá khi lật lên đều luôn để ngửa trên bàn (isOpened = true)
    // - Ghép trúng cặp Thoát Hiểm (PAIR_ESCAPE) -> Thoát hiểm (0đ, không trừ gì cả)
    // - Gom trúng 2 lá tiêu cực cùng loại -> Kích hoạt lượt giải cứu để chọn 2 lá
    //   đổi sang hình phạt mới (nếu ghép được 2 lá giống nhau), nếu không sẽ giữ hình phạt cũ!
    // ═════════════════════════════════════════════════════════════════════════
    if (state.isPenaltySurvivalMode) {
      const isEscapeTile = (t: MysteryTile | undefined | null) =>
        Boolean(t && (t.pairKey === "PAIR_ESCAPE" || t.type === "ESCAPE_SAFE"));

      const executeSurvivalEscape = () => {
        state.tiles.forEach((t) => { t.isOpened = true; });
        state.potPoints = 0;
        state.phase = "TURN_SUMMARY";
        state.turnFinishedReason = "SURVIVAL_ESCAPE";
        const oldScore = team.score || 0;
        state.storyResult = {
          teamId: team.id,
          teamName: team.name,
          teamColor: team.color || "#10b981",
          rewardText: "🕊️ Thoát Hiểm Thành Công! Mở trúng cặp Thoát Hiểm An Toàn, bảo toàn nguyên vẹn điểm số và tim (0đ)!",
          scoreDelta: 0,
          oldScore,
          newScore: oldScore,
        };
        return {
          updatedState: { ...state, tiles: [...state.tiles], memoryPairsState: { ...memState } },
          isBomb: false,
          scorePenalty: 0,
          finalScoreDelta: 0,
        };
      };

      const executeSurvivalPenalty = (penaltyKey: string, cancelOldKey?: string | null) => {
        state.tiles.forEach((t) => { t.isOpened = true; });

        const getCancelName = (k: string) => {
          if (k === "PAIR_BOMB_DARK") return "Bom Tối";
          if (k === "PAIR_BOMB_SMOKE") return "Bom Khói";
          if (k === "PAIR_BOMB_CHARITY") return "Bom Tặng";
          if (k === "PAIR_TRAP_BASE") return "Bẫy Trừ Gốc";
          return "Hình Phạt";
        };

        const cancelPrefix = cancelOldKey
          ? `⚠️ ĐÃ HỦY BỎ ${getCancelName(cancelOldKey).toUpperCase()} CŨ! Thực hiện phạt theo cặp mới: `
          : "";

        if (penaltyKey === "PAIR_TRAP_BASE") {
          const basePts = state.baseQuestionPoints || 10;
          const penalty = Math.min(team.score || 0, basePts);
          state.potPoints = 0;
          state.phase = "TURN_SUMMARY";
          state.turnFinishedReason = "SURVIVAL_FAILED";
          const oldScore = team.score || 0;
          const newScore = Math.max(0, oldScore - penalty);
          state.storyResult = {
            teamId: team.id,
            teamName: team.name,
            teamColor: team.color || "#ef4444",
            rewardText: `${cancelPrefix}💀 Ghép trúng Bẫy Trừ Gốc! Bị phạt trừ -${penalty} điểm gốc câu hỏi!`,
            scoreDelta: -penalty,
            oldScore,
            newScore,
          };
          return {
            updatedState: { ...state, tiles: [...state.tiles], memoryPairsState: { ...memState } },
            isBomb: true,
            scorePenalty: penalty,
            finalScoreDelta: -penalty,
          };
        }

        let bombType: "BOMB_SMOKE" | "BOMB_DARK" | "BOMB_CHARITY" = "BOMB_DARK";
        if (penaltyKey === "PAIR_BOMB_SMOKE") bombType = "BOMB_SMOKE";
        else if (penaltyKey === "PAIR_BOMB_CHARITY") bombType = "BOMB_CHARITY";
        else if (penaltyKey === "PAIR_BOMB_DARK") bombType = "BOMB_DARK";

        const outcome = resolveBombOutcome({
          bombType,
          team,
          allTeams,
          storyDescription: `${cancelPrefix}Ghép trúng ${
            penaltyKey === "PAIR_BOMB_SMOKE" ? "Bom Khói" : penaltyKey === "PAIR_BOMB_CHARITY" ? "Bom Tặng" : "Bom Tối"
          }!`,
          baseQuestionPoints: state.baseQuestionPoints,
          isSurvivalPenalty: true,
        });

        state.bombExploded = outcome.bombExploded;
        state.phase = "TURN_SUMMARY";
        state.turnFinishedReason = "SURVIVAL_FAILED";
        state.potPoints = 0;
        const oldScore = team.score || 0;
        const newScore = Math.max(0, oldScore - outcome.penalty);
        state.storyResult = {
          teamId: team.id,
          teamName: team.name,
          teamColor: team.color || "#ef4444",
          rewardText: `${cancelPrefix}💥 ${outcome.bombExploded.title}: ${outcome.penaltyText}`,
          scoreDelta: -outcome.penalty,
          oldScore,
          newScore,
        };
        return {
          updatedState: { ...state, tiles: [...state.tiles], memoryPairsState: { ...memState } },
          isBomb: true,
          scorePenalty: outcome.penalty,
          finalScoreDelta: -outcome.penalty,
          giftedPoints: outcome.giftedPoints,
          recipientTeamId: outcome.recipientTeamId,
          recipientTeamName: outcome.recipientTeamName,
          darkBombRecipients: outcome.darkBombRecipients,
        };
      };

      // Đánh dấu mở lá hiện tại và luôn giữ ngửa
      state.tiles = state.tiles.map((t) =>
        Number(t.id) === numTileId ? { ...t, isOpened: true } : t
      );
      memState.keptBombTileIds = Array.from(new Set([...(memState.keptBombTileIds || []), tile.id]));
      state.lastFlippedTile = tile;

      // ── GIAI ĐOẠN 1: ĐANG TRONG LƯỢT GIẢI CỨU (isBombRescueActive) ──
      // Người chơi đã dính 1 cặp tiêu cực (activePenaltyPairKey).
      // Bây giờ người chơi phải chọn 2 lá: nếu 2 lá giống nhau -> thay hình phạt mới (hoặc Thoát Hiểm 0đ), nếu không -> giữ hình phạt cũ!
      if (memState.isBombRescueActive) {
        if (!memState.firstFlippedTileId) {
          // Lật lá thứ 1 của lượt giải cứu
          memState.firstFlippedTileId = tile.id;
          state.memoryPairsState = { ...memState };
          return {
            updatedState: { ...state, tiles: [...state.tiles], memoryPairsState: { ...memState } },
            isBomb: false,
            scorePenalty: 0,
          };
        }

        if (Number(memState.firstFlippedTileId) === numTileId) {
          return { updatedState: state, isBomb: false, scorePenalty: 0 };
        }

        // Lật lá thứ 2 của lượt giải cứu
        memState.secondFlippedTileId = tile.id;
        const rescueCard1 = state.tiles.find((t) => Number(t.id) === Number(memState.firstFlippedTileId));
        const rescueCard2 = tile;

        memState.firstFlippedTileId = null;
        memState.secondFlippedTileId = null;
        memState.isBombRescueActive = false;

        const isMatch = Boolean(rescueCard1 && rescueCard2 && rescueCard1.pairKey === rescueCard2.pairKey);
        const oldPenaltyKey = memState.activePenaltyPairKey || "PAIR_BOMB_DARK";

        if (isMatch && rescueCard1) {
          if (isEscapeTile(rescueCard1)) {
            // Trùng 2 lá Thoát Hiểm!
            return executeSurvivalEscape();
          } else {
            // Trùng 2 lá tiêu cực mới -> Thay sang hình phạt mới, hủy hình phạt cũ!
            return executeSurvivalPenalty(rescueCard1.pairKey!, oldPenaltyKey);
          }
        } else {
          // Không chọn được 2 lá giống nhau -> Giữ nguyên hình phạt cũ!
          return executeSurvivalPenalty(oldPenaltyKey);
        }
      }

      // ── GIAI ĐOẠN 2: LƯỢT CHƠI BÌNH THƯỜNG TRONG SINH TỬ ──
      // Bước 2.1: Lật lá thứ 1 của lượt
      if (!memState.firstFlippedTileId) {
        // Kiểm tra xem lá thứ 1 này có trùng pairKey với một lá NÀO ĐÓ ĐÃ MỞ TỪ TRƯỚC không:
        const matchingPriorTile = state.tiles.find(
          (t) => Number(t.id) !== numTileId && t.isOpened && t.pairKey === tile.pairKey
        );

        if (matchingPriorTile) {
          // Trùng với một lá đã mở trước đó!
          if (isEscapeTile(tile)) {
            // Đã tìm thấy đủ 2 lá Thoát Hiểm!
            return executeSurvivalEscape();
          } else {
            // Gom đủ 2 lá tiêu cực cùng loại!
            // Kích hoạt giải cứu, người chơi sẽ chọn 2 lá ở lượt sau để đổi hình phạt!
            memState.activePenaltyPairKey = tile.pairKey;
            memState.isBombRescueActive = true;
            memState.firstFlippedTileId = null;
            memState.secondFlippedTileId = null;
            state.memoryPairsState = { ...memState };
            return {
              updatedState: { ...state, tiles: [...state.tiles], memoryPairsState: { ...memState } },
              isBomb: false,
              scorePenalty: 0,
            };
          }
        }

        // Chưa trùng với lá nào đã mở, lưu lại và chờ lá thứ 2
        memState.firstFlippedTileId = tile.id;
        state.memoryPairsState = { ...memState };
        return {
          updatedState: { ...state, tiles: [...state.tiles], memoryPairsState: { ...memState } },
          isBomb: false,
          scorePenalty: 0,
        };
      }

      // Bước 2.2: Lật lá thứ 2 của lượt
      if (Number(memState.firstFlippedTileId) === numTileId) {
        return { updatedState: state, isBomb: false, scorePenalty: 0 };
      }

      memState.secondFlippedTileId = tile.id;
      const firstTile = state.tiles.find((t) => Number(t.id) === Number(memState.firstFlippedTileId));
      const secondTile = tile;

      // Reset ID để chuẩn bị cho lượt tiếp theo
      memState.firstFlippedTileId = null;
      memState.secondFlippedTileId = null;

      // Kiểm tra TH1: 2 lá vừa lật TRÙNG NHAU (firstTile & secondTile)
      if (firstTile && firstTile.pairKey === secondTile.pairKey) {
        if (isEscapeTile(firstTile)) {
          // Ghép trúng cặp Thoát Hiểm!
          return executeSurvivalEscape();
        } else {
          // Ghép trúng 2 lá tiêu cực cùng loại!
          // Kích hoạt giải cứu để lượt sau lật 2 lá đổi hình phạt!
          memState.activePenaltyPairKey = firstTile.pairKey;
          memState.isBombRescueActive = true;
          state.memoryPairsState = { ...memState };
          return {
            updatedState: { ...state, tiles: [...state.tiles], memoryPairsState: { ...memState } },
            isBomb: false,
            scorePenalty: 0,
          };
        }
      }

      // Kiểm tra TH2: secondTile trùng với một lá ĐÃ MỞ TỪ CÁC LƯỢT TRƯỚC ĐÓ (khác firstTile)
      const priorMatchingSecond = state.tiles.find(
        (t) => Number(t.id) !== numTileId && Number(t.id) !== Number(firstTile?.id) && t.isOpened && t.pairKey === secondTile.pairKey
      );
      if (priorMatchingSecond) {
        if (isEscapeTile(secondTile)) {
          return executeSurvivalEscape();
        } else {
          memState.activePenaltyPairKey = secondTile.pairKey;
          memState.isBombRescueActive = true;
          state.memoryPairsState = { ...memState };
          return {
            updatedState: { ...state, tiles: [...state.tiles], memoryPairsState: { ...memState } },
            isBomb: false,
            scorePenalty: 0,
          };
        }
      }

      // TH3: Không tạo thành cặp trùng nào trong lượt này
      memState.attemptsUsed += 1;
      state.memoryPairsState = { ...memState };

      if (memState.attemptsUsed >= memState.maxAttempts) {
        // Hết 4 lượt mà không ghép được cặp nào -> Phạt Bom Tối (trừ điểm gốc câu hỏi)
        return executeSurvivalPenalty(memState.activePenaltyPairKey || "PAIR_BOMB_DARK");
      }

      // Vẫn còn lượt: Cả 2 lá giữ nguyên ngửa trên bàn, tiếp tục lượt sau
      return {
        updatedState: { ...state, tiles: [...state.tiles], memoryPairsState: { ...memState } },
        isBomb: false,
        scorePenalty: 0,
        shouldResetMismatchedCards: false,
      };
    }

    const isTrapTile = (t: MysteryTile | undefined | null) => Boolean(t && t.pairKey === "PAIR_TRAP");
    const isBombTile = (t: MysteryTile | undefined | null) =>
      Boolean(t && (t.pairKey === "PAIR_BOMB" || (t.type !== "REWARD" && t.pairKey !== "PAIR_TRAP")));
    const isPenaltyTile = (t: MysteryTile | undefined | null) => isTrapTile(t) || isBombTile(t);
    const getPenaltyKey = (t: MysteryTile | undefined | null): "PAIR_TRAP" | "PAIR_BOMB" | null => {
      if (!t) return null;
      if (t.pairKey === "PAIR_TRAP") return "PAIR_TRAP";
      if (t.pairKey === "PAIR_BOMB" || t.type !== "REWARD") return "PAIR_BOMB";
      return null;
    };

    const hasExtraPot = getPerkType(state.promoPerk) === "EXTRA_POT_PROMO";
    const extraPotBonus = hasExtraPot ? 5 : 0;
    const previouslyKeptBombs = memState.keptBombTileIds || [];

    const executePenalty = ({
      penaltyKey,
      cancelOldKey,
    }: {
      penaltyKey: "PAIR_TRAP" | "PAIR_BOMB";
      cancelOldKey?: "PAIR_TRAP" | "PAIR_BOMB" | null;
    }) => {
      memState.isBombRescueActive = false;
      state.memoryPairsState = { ...memState };

      const cancelPrefix = cancelOldKey
        ? `⚠️ ĐÃ HỦY BỎ CẶP ${cancelOldKey === "PAIR_TRAP" ? "BẪY KHÓI" : "KÍP NỔ"} CŨ! Thực hiện phạt theo cặp mới: `
        : "";

      // Kiểm tra khiên thần bảo vệ
      if (state.hasShield) {
        state.hasShield = false;
        state.phase = "TURN_SUMMARY";
        state.turnFinishedReason = "PAIR_MATCHED";
        state.potPoints = 0;
        const basePoints = state.baseQuestionPoints || 10;
        const oldScore = team.score || 0;
        const newScore = oldScore + basePoints;
        state.storyResult = {
          teamId: team.id,
          teamName: team.name,
          teamColor: team.color || "#ef4444",
          rewardText: `${cancelPrefix}🛡️ KHIÊN THẦN ĐÃ HẤP THỤ VỤ PHẠT! Nhận an toàn +${basePoints}đ câu hỏi gốc!`,
          scoreDelta: basePoints,
          oldScore,
          newScore,
        };
        return {
          updatedState: { ...state, tiles: [...state.tiles], memoryPairsState: { ...memState } },
          isBomb: false,
          scorePenalty: 0,
          finalScoreDelta: basePoints,
        };
      }

      if (penaltyKey === "PAIR_TRAP") {
        // Cặp Bẫy Khói: Mất điểm câu hỏi hiện tại, bảo toàn tổng điểm (delta = 0)
        state.bombExploded = {
          type: "SMOKE",
          title: "💨 CẶP BẪY KHÓI ĐỘC PHÁT NỔ!",
          description: "Kích hoạt bẫy khói độc: Toàn bộ điểm tích lũy của câu hỏi này bị xóa sạch (0đ)!",
          penaltyText: "Mất điểm câu hiện tại, tổng điểm được bảo toàn.",
        };
        state.phase = "TURN_SUMMARY";
        state.turnFinishedReason = "BOMB_HIT";
        state.potPoints = 0;
        const oldScore = team.score || 0;
        const newScore = oldScore;

        state.storyResult = {
          teamId: team.id,
          teamName: team.name,
          teamColor: team.color || "#ef4444",
          rewardText: `${cancelPrefix}💨 Cặp Bẫy Khói Độc kích hoạt! Mất toàn bộ điểm câu hỏi này (0đ), bảo toàn tổng điểm!`,
          scoreDelta: 0,
          oldScore,
          newScore,
        };

        return {
          updatedState: { ...state, tiles: [...state.tiles], memoryPairsState: { ...memState } },
          isBomb: true,
          scorePenalty: 0,
          finalScoreDelta: 0,
        };
      } else {
        // Cặp Kíp Nổ / Bom: Tinh chỉnh loại bom phù hợp theo Round & Bối cảnh từng đội (UNDERDOG / DOMINANT / NEUTRAL)
        const bombType = rollBombTypeForMinigame("MEMORY_PAIRS", team.score || 0, {
          currentRound,
          riskTier,
        });
        const outcome = resolveBombOutcome({
          bombType,
          team,
          allTeams,
          storyDescription: `${cancelPrefix}Ghép trúng Cặp Kíp Nổ!`,
          baseQuestionPoints: state.baseQuestionPoints,
          isSurvivalPenalty: false,
        });
        state.bombExploded = outcome.bombExploded;
        state.phase = "TURN_SUMMARY";
        state.turnFinishedReason = "BOMB_HIT";
        state.potPoints = 0;

        const oldScore = team.score || 0;
        const newScore = Math.max(0, oldScore - outcome.penalty);
        state.storyResult = {
          teamId: team.id,
          teamName: team.name,
          teamColor: team.color || "#ef4444",
          rewardText: `${cancelPrefix}💥 ${outcome.bombExploded.title}: ${outcome.penaltyText}`,
          scoreDelta: -outcome.penalty,
          oldScore,
          newScore,
        };

        return {
          updatedState: { ...state, tiles: [...state.tiles], memoryPairsState: { ...memState } },
          isBomb: true,
          scorePenalty: outcome.penalty,
          finalScoreDelta: -outcome.penalty,
          giftedPoints: outcome.giftedPoints,
          recipientTeamId: outcome.recipientTeamId,
          recipientTeamName: outcome.recipientTeamName,
          darkBombRecipients: outcome.darkBombRecipients,
        };
      }
    };

    // ─────────────────────────────────────────────────────────────────────────
    // STEP 3: Lật lá bài thứ 3 (trong lượt giải cứu bom)
    // ─────────────────────────────────────────────────────────────────────────
    if (memState.isBombRescueActive && memState.firstFlippedTileId && memState.secondFlippedTileId && !memState.thirdFlippedTileId) {
      if (Number(tile.id) === Number(memState.firstFlippedTileId) || Number(tile.id) === Number(memState.secondFlippedTileId)) {
        return { updatedState: state, isBomb: false, scorePenalty: 0 };
      }

      const card1 = state.tiles.find((t) => Number(t.id) === Number(memState.firstFlippedTileId));
      const card2 = state.tiles.find((t) => Number(t.id) === Number(memState.secondFlippedTileId));

      // SANITY CHECK BẢO VỆ PHÒNG THỦ:
      // Xác minh xem card1 và card2 có thực sự tạo thành cặp phạt hợp lệ kích hoạt giải cứu bom hay không!
      const k1 = getPenaltyKey(card1);
      const k2 = getPenaltyKey(card2);
      const hasPriorMatch1 = Boolean(k1 && previouslyKeptBombs.some((id) => Number(id) !== Number(card1?.id) && getPenaltyKey(state.tiles.find((t) => Number(t.id) === Number(id))) === k1));
      const hasPriorMatch2 = Boolean(k2 && previouslyKeptBombs.some((id) => Number(id) !== Number(card2?.id) && getPenaltyKey(state.tiles.find((t) => Number(t.id) === Number(id))) === k2));
      const isValidRescueContext = Boolean(
        card1 && card2 && (
          (k1 && k2 && k1 === k2) ||
          hasPriorMatch1 ||
          hasPriorMatch2
        )
      );

      if (!isValidRescueContext) {
        // State bị desync / rác từ ván trước hoặc hai lá phạt khác loại: HỦY NGAY RESCUE ĐỂ TRÁNH NỔ BOM OAN!
        memState.isBombRescueActive = false;
        memState.activePenaltyPairKey = null;
        memState.firstFlippedTileId = null;
        memState.secondFlippedTileId = null;
        memState.thirdFlippedTileId = null;
        state.memoryPairsState = { ...memState };
      } else {
        memState.thirdFlippedTileId = tile.id;
        memState.attemptsUsed += 1;
        state.lastFlippedTile = tile;

        const card3 = tile;

        // Đánh dấu mở cả 3 lá
        state.tiles = state.tiles.map((t) =>
          Number(t.id) === numTileId ||
          (card1 && Number(t.id) === Number(card1.id)) ||
          (card2 && Number(t.id) === Number(card2.id))
            ? { ...t, isOpened: true }
            : { ...t }
        );

      const oldPenaltyKey = (memState.activePenaltyPairKey || "PAIR_BOMB") as "PAIR_TRAP" | "PAIR_BOMB";
      const otherPenaltyKey: "PAIR_TRAP" | "PAIR_BOMB" = oldPenaltyKey === "PAIR_TRAP" ? "PAIR_BOMB" : "PAIR_TRAP";

      // ───────────────────────────────────────────────────────────────────────
      // KIỂM TRA ĐẶC BIỆT THEO YÊU CẦU:
      // "trường hợp cặp bài trùng lại là cặp bài phạt còn lại, lúc này, hệ thống thực hiện phạt theo cặp mới, cặp cũ bị huỷ bỏ"
      // ───────────────────────────────────────────────────────────────────────
      const isCard3OtherPenalty = getPenaltyKey(card3) === otherPenaltyKey;
      let matchedOtherPenalty = false;

      if (isCard3OtherPenalty) {
        // Tìm xem có lá nào khác cũng là otherPenaltyKey đã mở trên bàn không (trong previouslyKeptBombs, hoặc card1, card2)
        const priorOtherBombTile = state.tiles.find(
          (t) =>
            Number(t.id) !== Number(card3.id) &&
            getPenaltyKey(t) === otherPenaltyKey &&
            (previouslyKeptBombs.includes(t.id) ||
              (card1 && Number(t.id) === Number(card1.id)) ||
              (card2 && Number(t.id) === Number(card2.id)))
        );
        if (priorOtherBombTile) {
          matchedOtherPenalty = true;
        }
      }

      if (matchedOtherPenalty) {
        // TRÙNG CẶP BÀI PHẠT CÒN LẠI!
        // Cặp cũ bị hủy bỏ, thực hiện phạt theo cặp mới (otherPenaltyKey)!
        return executePenalty({ penaltyKey: otherPenaltyKey, cancelOldKey: oldPenaltyKey });
      }

      // ───────────────────────────────────────────────────────────────────────
      // KIỂM TRA GIẢI CỨU THÀNH CÔNG: Ghép trúng cặp bài thưởng
      // ───────────────────────────────────────────────────────────────────────
      const cardsInTurn = [card1, card2, card3].filter(Boolean) as MysteryTile[];
      const rewardCards = cardsInTurn.filter((c) => !isPenaltyTile(c));
      const isRescueSuccess = rewardCards.length === 2 && rewardCards[0].pairKey === rewardCards[1].pairKey;

      if (isRescueSuccess) {
        const winCard = rewardCards[0];
        memState.matchedPairKey = winCard.pairKey;
        memState.isBombRescueActive = false;
        state.memoryPairsState = { ...memState };
        state.tiles = state.tiles.map((t) =>
          t.pairKey === winCard.pairKey ? { ...t, isOpened: true } : { ...t }
        );

        let finalDelta = 0;
        let victimTeamId: string | undefined;
        let victimTeamName: string | undefined;
        let stolenPoints: number | undefined;

        if (winCard.effectType === "STEAL_POINTS") {
          const stealAmount = winCard.deltaPoints || state.baseQuestionPoints || 10;
          const eligibleTeams = (allTeams || []).filter(
            (t) => t.id !== team.id && !t.isEliminated && (t.score || 0) >= stealAmount
          );
          if (eligibleTeams.length > 0) {
            state.phase = "STEAL_TARGET_SELECT";
            state.pendingSteal = {
              stolenPoints: stealAmount,
              eligibleTeamIds: eligibleTeams.map((t) => t.id),
              tileTitle: winCard.storyTitle,
              tileIcon: winCard.icon,
            };
            return {
              updatedState: { ...state, tiles: [...state.tiles], memoryPairsState: { ...memState } },
              isBomb: false,
              scorePenalty: 0,
              finalScoreDelta: 0,
            };
          } else {
            finalDelta = stealAmount + extraPotBonus;
          }
        } else {
          finalDelta = (winCard.deltaPoints || (state.baseQuestionPoints ? state.baseQuestionPoints * 2 : 20)) + extraPotBonus;
        }

        if (getPerkType(state.promoPerk) === "STEAL_5_PROMO" && allTeams && allTeams.length > 0) {
          const promoSteal = calculatePromoSteal5({
            activeTeamId: team.id,
            allTeams,
          });
          if (promoSteal.victimTeamId && promoSteal.stolenPoints > 0) {
            victimTeamId = promoSteal.victimTeamId;
            victimTeamName = promoSteal.victimTeamName;
            stolenPoints = (stolenPoints || 0) + promoSteal.stolenPoints;
            finalDelta += promoSteal.stolenPoints;
          }
        }

        state.phase = "TURN_SUMMARY";
        state.turnFinishedReason = "PAIR_MATCHED";
        state.potPoints = 0;

        const oldScore = team.score || 0;
        const newScore = oldScore + finalDelta;
        const baseReward = finalDelta - extraPotBonus - (stolenPoints || 0);

        let rewardText = extraPotBonus > 0
          ? `🎉 Thoát hiểm ngoạn mục! Hóa giải cặp phạt và ghép chính xác cặp ${winCard.storyTitle}! Nhận trọn vẹn +${baseReward}đ và +${extraPotBonus}đ từ Quỹ thưởng (Tổng +${finalDelta} điểm)!`
          : `🎉 Thoát hiểm ngoạn mục! Hóa giải cặp phạt và ghép chính xác cặp ${winCard.storyTitle}! Nhận trọn vẹn +${finalDelta} điểm!`;
        if (stolenPoints && victimTeamName) {
          rewardText += ` (🗡️ Đạo Tặc đánh cắp +${stolenPoints}đ từ Đội ${victimTeamName}!)`;
        }

        state.storyResult = {
          teamId: team.id,
          teamName: team.name,
          teamColor: team.color || "#ef4444",
          rewardText,
          scoreDelta: finalDelta,
          oldScore,
          newScore,
        };

        return {
          updatedState: { ...state, tiles: [...state.tiles], memoryPairsState: { ...memState } },
          isBomb: false,
          scorePenalty: 0,
          finalScoreDelta: finalDelta,
          victimTeamId,
          victimTeamName,
          stolenPoints,
        };
      } else {
        // Giải cứu thất bại: phạt theo cặp phạt ban đầu (oldPenaltyKey)
        return executePenalty({ penaltyKey: oldPenaltyKey });
      }
    }
  }

    // ─────────────────────────────────────────────────────────────────────────
    // STEP 1: Lật lá bài thứ 1 của lượt
    // ─────────────────────────────────────────────────────────────────────────
    if (!memState.firstFlippedTileId) {
      memState.firstFlippedTileId = tile.id;
      state.lastFlippedTile = tile;

      state.tiles = state.tiles.map((t) =>
        Number(t.id) === numTileId ? { ...t, isOpened: true } : { ...t }
      );

      const tilePenaltyKey = getPenaltyKey(tile);
      if (tilePenaltyKey) {
        memState.keptBombTileIds = Array.from(new Set([...previouslyKeptBombs, tile.id]));
        // Kiểm tra xem trong previouslyKeptBombs có lá nào CÙNG LOẠI tilePenaltyKey không:
        const matchingPriorBomb = state.tiles.find(
          (t) => previouslyKeptBombs.includes(t.id) && getPenaltyKey(t) === tilePenaltyKey
        );
        if (matchingPriorBomb) {
          // Ngay ở lá thứ 1, người chơi đã làm lộ lá thứ 2 của cặp phạt tilePenaltyKey!
          // Kích hoạt giải cứu cho cặp phạt này!
          memState.isBombRescueActive = true;
          memState.activePenaltyPairKey = tilePenaltyKey;
        }
      }

      state.memoryPairsState = { ...memState };
      return {
        updatedState: { ...state, tiles: [...state.tiles], memoryPairsState: { ...memState } },
        isBomb: false,
        scorePenalty: 0,
      };
    }

    // ─────────────────────────────────────────────────────────────────────────
    // STEP 2: Lật lá bài thứ 2 của lượt
    // ─────────────────────────────────────────────────────────────────────────
    if (Number(memState.firstFlippedTileId) === numTileId) {
      return { updatedState: state, isBomb: false, scorePenalty: 0 };
    }

    memState.secondFlippedTileId = tile.id;
    state.lastFlippedTile = tile;

    const firstTile = state.tiles.find((t) => Number(t.id) === Number(memState.firstFlippedTileId));

    // Đánh dấu mở cả 2 lá trong lượt này một cách bất biến
    state.tiles = state.tiles.map((t) =>
      Number(t.id) === numTileId || (firstTile && Number(t.id) === Number(firstTile.id))
        ? { ...t, isOpened: true }
        : { ...t }
    );



    // TH 2.1: Đang trong lượt giải cứu (Card 1 đã kích hoạt giải cứu với 1 lá đã mở trước đó)
    // -> Giữ nguyên, mở khóa chờ lật tiếp lá thứ 3!
    if (memState.isBombRescueActive) {
      state.memoryPairsState = { ...memState };
      return {
        updatedState: { ...state, tiles: [...state.tiles], memoryPairsState: { ...memState } },
        isBomb: false,
        scorePenalty: 0,
      };
    }

    // TH 2.2: Card 2 (tile) trùng loại phạt với 1 lá phạt đã có từ trước trong previouslyKeptBombs!
    const secondTilePenaltyKey = getPenaltyKey(tile);
    if (secondTilePenaltyKey) {
      memState.keptBombTileIds = Array.from(new Set([...previouslyKeptBombs, tile.id]));
      const matchingPriorBomb = state.tiles.find(
        (t) => previouslyKeptBombs.includes(t.id) && getPenaltyKey(t) === secondTilePenaltyKey
      );
      if (matchingPriorBomb) {
        // Đã trùng cặp phạt secondTilePenaltyKey!
        // Kích hoạt giải cứu, mở khóa chờ lật tiếp lá thứ 3!
        memState.isBombRescueActive = true;
        memState.activePenaltyPairKey = secondTilePenaltyKey;
        state.memoryPairsState = { ...memState };
        return {
          updatedState: { ...state, tiles: [...state.tiles], memoryPairsState: { ...memState } },
          isBomb: false,
          scorePenalty: 0,
        };
      }
    }

    // TH 2.3: Cả 2 lá trong cùng lượt này đều là lá phạt!
    const firstTilePenaltyKey = getPenaltyKey(firstTile);
    if (firstTilePenaltyKey && secondTilePenaltyKey) {
      if (firstTilePenaltyKey === secondTilePenaltyKey) {
        // Cả 2 lá TRÙNG CÙNG MỘT CẶP PHẠT trong cùng lượt!
        // Kích hoạt giải cứu, giữ mở cả 2 lá phạt và mở khóa chờ lật tiếp lá thứ 3!
        memState.keptBombTileIds = Array.from(new Set([...previouslyKeptBombs, firstTile!.id, tile.id]));
        memState.isBombRescueActive = true;
        memState.activePenaltyPairKey = firstTilePenaltyKey;
        state.memoryPairsState = { ...memState };
        return {
          updatedState: { ...state, tiles: [...state.tiles], memoryPairsState: { ...memState } },
          isBomb: false,
          scorePenalty: 0,
        };
      } else {
        // Hai lá phạt THUỘC 2 LOẠI KHÁC NHAU (1 Bẫy Khói + 1 Kíp Nổ Hắc Ám)!
        // Theo luật: "lá bom/bẫy thứ hai phải trùng khớp lá đã lật trước đó thì mới kích hoạt cơ chế, còn nếu nó là hai lá thuộc loại phạt khác nhau, thì chưa áp dụng"
        // Thêm cả 2 lá vào keptBombTileIds để giữ mở trên bàn, nhưng CHƯA áp dụng phạt hay giải cứu!
        memState.attemptsUsed += 1;
        memState.keptBombTileIds = Array.from(new Set([...previouslyKeptBombs, firstTile!.id, tile.id]));
        memState.isMismatchResolving = true;

        const isRoundOver = memState.attemptsUsed >= memState.maxAttempts;
        const currentRound = memState.round || 1;

        if (isRoundOver) {
          if (currentRound === 1) {
            memState.promptSecondChance = true;
            state.memoryPairsState = { ...memState };
            return { updatedState: { ...state, tiles: [...state.tiles], memoryPairsState: { ...memState } }, isBomb: false, scorePenalty: 0, shouldResetMismatchedCards: true };
          } else {
            return executePenalty({ penaltyKey: "PAIR_BOMB" });
          }
        }

        state.memoryPairsState = { ...memState };
        return { updatedState: { ...state, tiles: [...state.tiles], memoryPairsState: { ...memState } }, isBomb: false, scorePenalty: 0, shouldResetMismatchedCards: true };
      }
    }

    // TH 2.4: Một trong 2 lá là lá phạt đơn lẻ (chưa từng xuất hiện trước đó), lá còn lại là lá thường!
    if (firstTilePenaltyKey || secondTilePenaltyKey) {
      memState.attemptsUsed += 1;
      const penaltyTile = firstTilePenaltyKey ? firstTile! : tile;
      memState.keptBombTileIds = Array.from(new Set([...previouslyKeptBombs, penaltyTile.id]));
      memState.isMismatchResolving = true;

      const isRoundOver = memState.attemptsUsed >= memState.maxAttempts;
      const currentRound = memState.round || 1;

      if (isRoundOver) {
        if (currentRound === 1) {
          memState.promptSecondChance = true;
          state.memoryPairsState = { ...memState };
          return { updatedState: { ...state, tiles: [...state.tiles], memoryPairsState: { ...memState } }, isBomb: false, scorePenalty: 0, shouldResetMismatchedCards: true };
        } else {
          return executePenalty({ penaltyKey: "PAIR_BOMB" });
        }
      }

      state.memoryPairsState = { ...memState };
      return { updatedState: { ...state, tiles: [...state.tiles], memoryPairsState: { ...memState } }, isBomb: false, scorePenalty: 0, shouldResetMismatchedCards: true };
    }

    // TH 2.5: Cả 2 lá đều là lá thường (không dính phạt)
    memState.attemptsUsed += 1;
    const isMatch = Boolean(firstTile && firstTile.pairKey && firstTile.pairKey === tile.pairKey);

    if (isMatch && firstTile) {
      // MATCH FOUND! (Thưởng điểm theo cặp bài)
      memState.matchedPairKey = firstTile.pairKey;
      state.memoryPairsState = { ...memState };
      state.tiles = state.tiles.map((t) =>
        t.pairKey === firstTile.pairKey || Number(t.id) === numTileId || Number(t.id) === Number(firstTile.id)
          ? { ...t, isOpened: true }
          : { ...t }
      );

      let victimTeamId: string | undefined;
      let victimTeamName: string | undefined;
      let stolenPoints: number | undefined;
      let finalDelta = 0;

      if (firstTile.effectType === "STEAL_POINTS") {
        const stealAmount = firstTile.deltaPoints || state.baseQuestionPoints || 10;
        const eligibleTeams = (allTeams || []).filter(
          (t) => t.id !== team.id && !t.isEliminated && (t.score || 0) >= stealAmount
        );
        if (eligibleTeams.length > 0) {
          state.phase = "STEAL_TARGET_SELECT";
          state.pendingSteal = {
            stolenPoints: stealAmount,
            eligibleTeamIds: eligibleTeams.map((t) => t.id),
            tileTitle: firstTile.storyTitle,
            tileIcon: firstTile.icon,
          };
          return {
            updatedState: { ...state, tiles: [...state.tiles], memoryPairsState: { ...memState } },
            isBomb: false,
            scorePenalty: 0,
            finalScoreDelta: 0,
          };
        } else {
          finalDelta = stealAmount + extraPotBonus;
        }
      } else {
        finalDelta = (firstTile.deltaPoints || (state.baseQuestionPoints ? state.baseQuestionPoints * 2 : 20)) + extraPotBonus;
      }

      if (getPerkType(state.promoPerk) === "STEAL_5_PROMO" && allTeams && allTeams.length > 0) {
        const promoSteal = calculatePromoSteal5({
          activeTeamId: team.id,
          allTeams,
        });
        if (promoSteal.victimTeamId && promoSteal.stolenPoints > 0) {
          victimTeamId = promoSteal.victimTeamId;
          victimTeamName = promoSteal.victimTeamName;
          stolenPoints = (stolenPoints || 0) + promoSteal.stolenPoints;
          finalDelta += promoSteal.stolenPoints;
        }
      }

      state.phase = "TURN_SUMMARY";
      state.turnFinishedReason = "PAIR_MATCHED";
      state.potPoints = 0;

      const oldScore = team.score || 0;
      const newScore = oldScore + finalDelta;
      const baseReward = finalDelta - extraPotBonus - (stolenPoints || 0);

      let rewardText = extraPotBonus > 0
        ? `🎉 Ghép thành công ${firstTile.storyTitle}! Nhận trọn vẹn +${baseReward}đ và +${extraPotBonus}đ từ Quỹ thưởng (Tổng +${finalDelta} điểm)!`
        : `🎉 Ghép thành công ${firstTile.storyTitle}! Nhận trọn vẹn +${finalDelta} điểm!`;
      if (stolenPoints && victimTeamName) {
        rewardText += ` (🗡️ Đạo Tặc đánh cắp +${stolenPoints}đ từ Đội ${victimTeamName}!)`;
      }

      state.storyResult = {
        teamId: team.id,
        teamName: team.name,
        teamColor: team.color || "#ef4444",
        rewardText,
        scoreDelta: finalDelta,
        oldScore,
        newScore,
      };

      return {
        updatedState: { ...state, tiles: [...state.tiles], memoryPairsState: { ...memState } },
        isBomb: false,
        scorePenalty: 0,
        finalScoreDelta: finalDelta,
        victimTeamId,
        victimTeamName,
        stolenPoints,
      };
    } else {
      // Mismatch giữa 2 lá thường!
      memState.isMismatchResolving = true;
      const isRoundOver = memState.attemptsUsed >= memState.maxAttempts;
      const currentRound = memState.round || 1;

      if (isRoundOver) {
        if (currentRound === 1) {
          memState.promptSecondChance = true;
          state.memoryPairsState = { ...memState };
          return { updatedState: { ...state, tiles: [...state.tiles], memoryPairsState: { ...memState } }, isBomb: false, scorePenalty: 0, shouldResetMismatchedCards: true };
        } else {
          return executePenalty({ penaltyKey: "PAIR_BOMB" });
        }
      }

      state.memoryPairsState = { ...memState };
      return { updatedState: { ...state, tiles: [...state.tiles], memoryPairsState: { ...memState } }, isBomb: false, scorePenalty: 0, shouldResetMismatchedCards: true };
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // VARIANT 2: ONE_SHOT_DOORS (5 Cánh Cửa Bí Mật - 2 Giai Đoạn)
  // Giai đoạn 1: Chọn 3 trong 5 cửa để để ra riêng (vẫn úp xuống, chưa lật).
  // Hệ thống báo số lượng lá trừ trong 3 lá đã chọn.
  // Giai đoạn 2: Người chơi PHẢI LẤY 3 CỬA ĐÃ CHỌN để chơi tiếp vòng 2, không dùng 2 cửa còn lại.
  // ═══════════════════════════════════════════════════════════════════════════
  if (normType === "ONE_SHOT_DOORS") {
    const osState = state.oneShotState || {
      selectedDoorIds: [],
      hasBombDetected: false,
      phase: "SELECTING",
      revealedSafeDoorIds: [],
      chosenFinalDoorId: undefined,
      allRevealed: false,
    };
    state.oneShotState = osState;

    if (osState.phase === "RESOLVED") {
      return { updatedState: state, isBomb: false, scorePenalty: 0 };
    }

    const tile = state.tiles.find((t) => t.id === tileId);
    if (!tile) {
      return { updatedState: state, isBomb: false, scorePenalty: 0 };
    }

    // ─────────────────────────────────────────────────────────────────────────
    // CHẾ ĐỘ SINH TỬ (SURVIVAL MODE) - ONE-SHOT SURVIVAL: Chọn 1 cửa duy nhất
    // ─────────────────────────────────────────────────────────────────────────
    if (state.isPenaltySurvivalMode) {
      osState.chosenFinalDoorId = tileId;
      osState.phase = "RESOLVED";
      osState.allRevealed = true;
      state.tiles.forEach((t) => { t.isOpened = true; });

      if (tile.type === "ESCAPE_SAFE") {
        state.potPoints = 0;
        state.phase = "TURN_SUMMARY";
        state.turnFinishedReason = "SURVIVAL_ESCAPE";
        const oldScore = team.score || 0;
        state.storyResult = {
          teamId: team.id,
          teamName: team.name,
          teamColor: team.color || "#10b981",
          rewardText: "🕊️ May mắn tuyệt đỉnh! Bạn đã chọn trúng CỬA THOÁT HIỂM AN TOÀN, bảo toàn nguyên vẹn điểm số và tim!",
          scoreDelta: 0,
          oldScore,
          newScore: oldScore,
        };
        return { updatedState: { ...state, tiles: [...state.tiles] }, isBomb: false, scorePenalty: 0, finalScoreDelta: 0 };
      }

      const isRandomBomb = tile.type === "BOMB_MAJOR" || Boolean((tile as any).bombDoorType) || tile.type === "BOMB_SMOKE" || tile.type === "BOMB_DARK" || tile.type === "BOMB_CHARITY";
      if (isRandomBomb) {
        const bombType = (tile as any).bombDoorType || (tile.type === "BOMB_SMOKE" ? "BOMB_SMOKE" : tile.type === "BOMB_DARK" ? "BOMB_DARK" : tile.type === "BOMB_CHARITY" ? "BOMB_CHARITY" : "BOMB_CHARITY");
        const outcome = resolveBombOutcome({
          bombType,
          team,
          allTeams,
          storyDescription: tile.storyDescription || "Mở trúng Cửa Bẫy Bom Sinh Tử!",
          baseQuestionPoints: state.baseQuestionPoints,
          isSurvivalPenalty: true,
        });
        state.potPoints = 0;
        state.bombExploded = outcome.bombExploded;
        state.phase = "TURN_SUMMARY";
        state.turnFinishedReason = "SURVIVAL_FAILED";
        const oldScore = team.score || 0;
        const newScore = Math.max(0, oldScore - outcome.penalty);
        state.storyResult = {
          teamId: team.id,
          teamName: team.name,
          teamColor: team.color || "#ef4444",
          rewardText: `💥 ${outcome.bombExploded.title}: ${outcome.penaltyText}`,
          scoreDelta: -outcome.penalty,
          oldScore,
          newScore,
        };
        return {
          updatedState: { ...state, tiles: [...state.tiles] },
          isBomb: true,
          scorePenalty: outcome.penalty,
          finalScoreDelta: -outcome.penalty,
          giftedPoints: outcome.giftedPoints,
          recipientTeamId: outcome.recipientTeamId,
          recipientTeamName: outcome.recipientTeamName,
          darkBombRecipients: outcome.darkBombRecipients,
        };
      } else {
        const penalty = Math.min(team.score || 0, Math.abs(tile.deltaPoints || state.baseQuestionPoints || 10));
        state.potPoints = 0;
        state.phase = "TURN_SUMMARY";
        state.turnFinishedReason = "SURVIVAL_FAILED";
        const oldScore = team.score || 0;
        const newScore = Math.max(0, oldScore - penalty);
        state.storyResult = {
          teamId: team.id,
          teamName: team.name,
          teamColor: team.color || "#ef4444",
          rewardText: `⚠️ Dính Cửa Bẫy Trừ Điểm Gốc Sinh Tử! Bị trừ -${penalty} điểm!`,
          scoreDelta: -penalty,
          oldScore,
          newScore,
        };
        return {
          updatedState: { ...state, tiles: [...state.tiles] },
          isBomb: true,
          scorePenalty: penalty,
          finalScoreDelta: -penalty,
        };
      }
    }

    // Giai đoạn 1: Chọn 3 trong 5 cửa để ĐỂ RA RIÊNG (vẫn úp mặt, chưa lật)
    if (osState.phase === "SELECTING" || !osState.phase) {
      // Cửa bị Mắt Thần khóa (Cửa bẫy trừ gốc) tuyệt đối không cho chọn!
      if (tile.isPeeked) {
        return { updatedState: { ...state }, isBomb: false, scorePenalty: 0 };
      }

      const selected = osState.selectedDoorIds || [];
      if (selected.includes(tileId)) {
        // Cho phép bỏ chọn nếu đang chọn dở
        osState.selectedDoorIds = selected.filter((id) => id !== tileId);
        return { updatedState: { ...state }, isBomb: false, scorePenalty: 0 };
      }

      selected.push(tileId);
      osState.selectedDoorIds = [...selected];

      if (selected.length < 3) {
        // Đang chờ chọn đủ 3 cửa để ra riêng
        return { updatedState: { ...state }, isBomb: false, scorePenalty: 0 };
      }

      // Đã chọn đủ 3 cửa để ra riêng!
      // Cả 5 cánh cửa vẫn úp mặt (isOpened: false), chưa lật!
      // Radar quét xem trong 3 cánh cửa đã chọn có bao nhiêu cánh cửa trừ điểm (Bẫy bom hoặc Bẫy trừ gốc):
      const selectedTiles = state.tiles.filter((t) => selected.includes(t.id));
      const penaltyCount = selectedTiles.filter((t) => t.type !== "REWARD" || (t.deltaPoints && t.deltaPoints < 0)).length;
      osState.penaltyDoorsCount = penaltyCount;
      osState.hasBombDetected = penaltyCount > 0;

      if (penaltyCount === 0) {
        // 0 lá trừ: Chuyển thẳng sang Giai đoạn 2 (Mở 1 trong 3 lá)
        osState.phase = "STAGE_2_PICK";
      } else {
        // Có lá trừ (> 0): Chuyển sang lựa chọn: Đổi 1 lá HOẶC Lấy điểm gốc (-1 Tim)
        osState.phase = "PENALTY_DECISION";
      }

      return { updatedState: { ...state }, isBomb: false, scorePenalty: 0 };
    }

    // Giai đoạn 2: Người chơi PHẢI CHỌN GIỮA 1 TRONG 3 CỬA ĐÃ ĐỂ RA RIÊNG! (2 cửa còn lại bị loại bỏ)
    if (osState.phase === "STAGE_2_PICK" || osState.phase === "SCANNED") {
      const selected = osState.selectedDoorIds || [];
      // CHỈ CHO PHÉP chọn 1 trong 3 cánh cửa đã để ra riêng! (2 cánh cửa còn lại đã bị loại bỏ)
      if (!selected.includes(tileId)) {
        return { updatedState: state, isBomb: false, scorePenalty: 0 };
      }

      // Người chơi bấm mở 1 trong 3 cánh cửa đã để ra riêng!
      osState.chosenFinalDoorId = tileId;
      osState.phase = "RESOLVED";
      osState.allRevealed = true;

      // Lật mở toàn bộ 5 cánh cửa để hé lộ tất cả
      state.tiles.forEach((t) => {
        t.isOpened = true;
      });

      const isNegative = tile.type !== "REWARD" || (tile.deltaPoints && tile.deltaPoints < 0);

      if (isNegative) {
        if (state.hasShield) {
          state.hasShield = false;
          state.potPoints = 0;
          state.phase = "TURN_SUMMARY";
          state.turnFinishedReason = "DOOR_CHOSEN";
          const basePoints = state.baseQuestionPoints || 10;
          const oldScore = team.score || 0;
          const newScore = oldScore + basePoints;
          state.storyResult = {
            teamId: team.id,
            teamName: team.name,
            teamColor: team.color || "#ef4444",
            rewardText: `🛡️ KHIÊN THẦN ĐÃ HẤP THỤ BẪY PHẠT! Cửa phạt đã bị chặn đứng an toàn, nhận trọn vẹn +${basePoints}đ câu hỏi gốc!`,
            scoreDelta: basePoints,
            oldScore,
            newScore,
          };
          return {
            updatedState: { ...state },
            isBomb: false,
            scorePenalty: 0,
            finalScoreDelta: basePoints,
          };
        }

        // Kiểm tra loại cửa phạt: Cửa Trừ Gốc hay Cửa Bom Ngẫu Nhiên
        const isRandomBomb = tile.type === "BOMB_MAJOR" || Boolean((tile as any).bombDoorType);

        if (isRandomBomb) {
          const bombType = (tile as any).bombDoorType || rollBombTypeForMinigame("ONE_SHOT_DOORS", team.score || 0, {
            currentRound,
            riskTier,
          });
          const outcome = resolveBombOutcome({
            bombType,
            team,
            allTeams,
            storyDescription: tile.storyDescription || "Mở trúng Cửa Bẫy Bom!",
            baseQuestionPoints: state.baseQuestionPoints,
            isSurvivalPenalty: state.isPenaltySurvivalMode,
          });
          state.potPoints = 0;
          state.bombExploded = outcome.bombExploded;
          state.phase = "TURN_SUMMARY";
          state.turnFinishedReason = "BOMB_HIT";

          const oldScore = team.score || 0;
          const newScore = Math.max(0, oldScore - outcome.penalty);

          state.storyResult = {
            teamId: team.id,
            teamName: team.name,
            teamColor: team.color || "#ef4444",
            rewardText: `💥 Rủi ro bất thành! ${outcome.bombExploded.title}: ${outcome.penaltyText}`,
            scoreDelta: -outcome.penalty,
            oldScore,
            newScore,
          };

          return {
            updatedState: { ...state },
            isBomb: true,
            scorePenalty: outcome.penalty,
            finalScoreDelta: -outcome.penalty,
            victimTeamId: outcome.recipientTeamId,
            victimTeamName: outcome.recipientTeamName,
            stolenPoints: outcome.giftedPoints,
          };
        } else {
          // Cửa Trừ Gốc: Trừ đúng điểm gốc câu hỏi (nếu UNDERDOG thì 0đ phạt)
          const penalty = tile.deltaPoints !== undefined
            ? Math.abs(tile.deltaPoints)
            : (riskTier === "UNDERDOG" ? 0 : (state.baseQuestionPoints || 10));
          state.potPoints = 0;
          state.bombExploded = {
            type: penalty === 0 ? "SMOKE" : "MINOR",
            title: tile.storyTitle,
            description: tile.storyDescription,
            penaltyText: penalty === 0
              ? "May mắn né phạt! Điểm số được bảo toàn nguyên vẹn."
              : `Mở trúng Cửa Bẫy Trừ Gốc! Bị trừ ${penalty} điểm từ tổng điểm.`,
          };
          state.phase = "TURN_SUMMARY";
          state.turnFinishedReason = "BOMB_HIT";

          const oldScore = team.score || 0;
          const newScore = Math.max(0, oldScore - penalty);

          state.storyResult = {
            teamId: team.id,
            teamName: team.name,
            teamColor: team.color || "#ef4444",
            rewardText: penalty === 0
              ? "💨 Mở trúng Cửa Khói! May mắn né bẫy phạt, bảo toàn tổng điểm (0đ)!"
              : `💥 Mở trúng Cửa Bẫy Trừ Gốc! Bị trừ ${penalty} điểm!`,
            scoreDelta: -penalty,
            oldScore,
            newScore,
          };

          return {
            updatedState: { ...state },
            isBomb: true,
            scorePenalty: penalty,
            finalScoreDelta: -penalty,
          };
        }
      } else {
        // CỬA AN TOÀN / PHẦN THƯỞNG
      const hasExtraPot = getPerkType(state.promoPerk) === "EXTRA_POT_PROMO";
      const extraPotBonus = hasExtraPot ? 5 : 0;
      const multiplier = state.potMultiplier || 1;

      if (tile.effectType === "STEAL_POINTS") {
        const stealAmount = tile.deltaPoints || state.baseQuestionPoints || 10;
        const eligibleTeams = (allTeams || []).filter(
          (t) => t.id !== team.id && !t.isEliminated && (t.score || 0) >= stealAmount
        );
        if (eligibleTeams.length > 0) {
          state.phase = "STEAL_TARGET_SELECT";
          state.pendingSteal = {
            stolenPoints: stealAmount,
            eligibleTeamIds: eligibleTeams.map((t) => t.id),
            tileTitle: tile.storyTitle,
            tileIcon: tile.icon,
          };
          return {
            updatedState: { ...state },
            isBomb: false,
            scorePenalty: 0,
            finalScoreDelta: extraPotBonus,
          };
        }
      }

      const baseReward = tile.deltaPoints || state.baseQuestionPoints || 10;
      let finalDelta = (baseReward * multiplier) + extraPotBonus;
      let victimTeamId: string | undefined;
      let victimTeamName: string | undefined;
      let stolenPoints: number | undefined;

      if (getPerkType(state.promoPerk) === "STEAL_5_PROMO" && allTeams && allTeams.length > 0) {
        const promoSteal = calculatePromoSteal5({
          activeTeamId: team.id,
          allTeams,
        });
        if (promoSteal.victimTeamId && promoSteal.stolenPoints > 0) {
          victimTeamId = promoSteal.victimTeamId;
          victimTeamName = promoSteal.victimTeamName;
          stolenPoints = promoSteal.stolenPoints;
          finalDelta += promoSteal.stolenPoints;
        }
      }

      state.potPoints = 0;
      state.phase = "TURN_SUMMARY";
      state.turnFinishedReason = "DOOR_CHOSEN";

      const oldScore = team.score || 0;
      const newScore = oldScore + finalDelta;

      let rewardText = extraPotBonus > 0
        ? `🎉 MỞ CỬA THÀNH CÔNG! ${tile.storyTitle} Nhận +${baseReward * multiplier}đ và +${extraPotBonus}đ Quỹ thưởng (Tổng +${finalDelta} điểm)!`
        : `🎉 MỞ CỬA THÀNH CÔNG! ${tile.storyTitle} Nhận trọn vẹn +${finalDelta} điểm thưởng!`;
      if (stolenPoints && victimTeamName) {
        rewardText += ` (🗡️ Đạo Tặc đánh cắp +${stolenPoints}đ từ Đội ${victimTeamName}!)`;
      }

      state.storyResult = {
        teamId: team.id,
        teamName: team.name,
        teamColor: team.color || "#ef4444",
        rewardText,
        scoreDelta: finalDelta,
        oldScore,
        newScore,
      };

      return {
        updatedState: { ...state },
        isBomb: false,
        scorePenalty: 0,
        finalScoreDelta: finalDelta,
        victimTeamId,
        victimTeamName,
        stolenPoints,
      };
    }
  }
    return { updatedState: state, isBomb: false, scorePenalty: 0 };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // VARIANT 4: TAROT_DESTINY (Rút 1 trong 5 lá bài Tarot thần số)
  // ═══════════════════════════════════════════════════════════════════════════
  if (normType === "TAROT_DESTINY") {
    const tState = state.tarotState || {};
    state.tarotState = tState;

    const tile = state.tiles.find((t) => t.id === tileId);
    if (!tile || tile.isOpened || tileId === tState?.discardedCardId || (tState?.prophecyCardId && !tState?.prophecyResolved)) {
      return { updatedState: state, isBomb: false, scorePenalty: 0 };
    }

    // Check if player has redraw option available (EXTRA_ATTEMPT_PROMO) and hasn't redrawn yet
    const canRedraw = Boolean(tState.canRedraw && !tState.hasRedrawn);

    if (canRedraw) {
      // First draw with redraw perk: reveal ONLY this card and let the player decide
      tile.isOpened = true;
      tState.chosenCardId = tileId;
      state.lastFlippedTile = tile;
      return { updatedState: { ...state }, isBomb: false, scorePenalty: 0 };
    }

    // Normal draw or final draw after redraw: reveal this card and all remaining cards
    tile.isOpened = true;
    state.tiles.forEach((t) => {
      t.isOpened = true;
    });

    tState.chosenCardId = tileId;
    state.lastFlippedTile = tile;

    const isBomb = tile.type !== "REWARD";
    let penalty = 0;
    let finalDelta = 0;

    if (isBomb) {
      // Shield Protection Check:
      if (state.hasShield) {
        state.hasShield = false;
        state.potPoints = 0;
        state.phase = "TURN_SUMMARY";
        state.turnFinishedReason = "TAROT_DRAWN";
        const basePoints = state.baseQuestionPoints || 20;
        const oldScore = team.score || 0;
        const newScore = oldScore + basePoints;
        state.storyResult = {
          teamId: team.id,
          teamName: team.name,
          teamColor: team.color || "#ef4444",
          rewardText: `🛡️ KHIÊN THẦN ĐẨY LÙI THẦN CHẾT! Bạn an toàn thoát hiểm và nhận trọn vẹn +${basePoints}đ câu hỏi gốc!`,
          scoreDelta: basePoints,
          oldScore,
          newScore,
        };
        return {
          updatedState: { ...state },
          isBomb: false,
          scorePenalty: 0,
          finalScoreDelta: basePoints,
        };
      }

      penalty = Math.abs(tile.deltaPoints || 20);
      state.potPoints = 0;
      state.bombExploded = {
        type: "MAJOR",
        title: tile.storyTitle,
        description: tile.storyDescription,
        penaltyText: `Quẻ bài Thần Chết! Bị phạt trừ ${penalty} điểm từ tổng điểm.`,
      };
      state.phase = "TURN_SUMMARY";
      state.turnFinishedReason = "BOMB_HIT";

      const oldScore = team.score || 0;
      const newScore = Math.max(0, oldScore - penalty);

      state.storyResult = {
        teamId: team.id,
        teamName: team.name,
        teamColor: team.color || "#ef4444",
        rewardText: `💀 Quẻ bài Thần Chết xuất hiện! Bị phạt trừ ${penalty} điểm!`,
        scoreDelta: -penalty,
        oldScore,
        newScore,
      };

      return {
        updatedState: { ...state },
        isBomb: true,
        scorePenalty: penalty,
        finalScoreDelta: -penalty,
      };
    } else {
      let victimTeamId: string | undefined;
      let victimTeamName: string | undefined;
      let stolenPoints: number | undefined;

      const hasExtraPot = getPerkType(state.promoPerk) === "EXTRA_POT_PROMO";
      const extraPotBonus = hasExtraPot ? 5 : 0;
      const multiplier = state.potMultiplier || 1;

      if (tile.effectType === "STEAL_POINTS") {
        const stealAmount = tile.deltaPoints || state.baseQuestionPoints || 10;
        const eligibleTeams = (allTeams || []).filter(
          (t) => t.id !== team.id && !t.isEliminated && (t.score || 0) >= stealAmount
        );
        if (eligibleTeams.length > 0) {
          state.phase = "STEAL_TARGET_SELECT";
          state.pendingSteal = {
            stolenPoints: stealAmount,
            eligibleTeamIds: eligibleTeams.map((t) => t.id),
            tileTitle: tile.storyTitle,
            tileIcon: tile.icon,
          };
          return {
            updatedState: { ...state },
            isBomb: false,
            scorePenalty: 0,
            finalScoreDelta: 0,
          };
        } else {
          finalDelta = (stealAmount * multiplier) + extraPotBonus;
        }
      } else {
        finalDelta = ((tile.deltaPoints || 35) * multiplier) + extraPotBonus;
      }

      if (getPerkType(state.promoPerk) === "STEAL_5_PROMO" && allTeams && allTeams.length > 0) {
        const promoSteal = calculatePromoSteal5({
          activeTeamId: team.id,
          allTeams,
        });
        if (promoSteal.victimTeamId && promoSteal.stolenPoints > 0) {
          victimTeamId = promoSteal.victimTeamId;
          victimTeamName = promoSteal.victimTeamName;
          stolenPoints = (stolenPoints || 0) + promoSteal.stolenPoints;
          finalDelta += promoSteal.stolenPoints;
        }
      }

      state.potPoints = 0;
      state.phase = "TURN_SUMMARY";
      state.turnFinishedReason = "TAROT_DRAWN";

      const oldScore = team.score || 0;
      const newScore = oldScore + finalDelta;
      const baseReward = finalDelta - extraPotBonus - (stolenPoints || 0);

      let rewardText = extraPotBonus > 0
        ? `🔮 ${tile.storyTitle}! Nhận trọn vẹn +${baseReward}đ và +${extraPotBonus}đ từ Quỹ thưởng (Tổng +${finalDelta} điểm)!`
        : `🔮 ${tile.storyTitle}! Nhận trọn vẹn +${finalDelta} điểm!`;
      if (stolenPoints && victimTeamName) {
        rewardText += ` (🗡️ Đạo Tặc đánh cắp +${stolenPoints}đ từ Đội ${victimTeamName}!)`;
      }

      state.storyResult = {
        teamId: team.id,
        teamName: team.name,
        teamColor: team.color || "#ef4444",
        rewardText,
        scoreDelta: finalDelta,
        oldScore,
        newScore,
      };

      return {
        updatedState: { ...state },
        isBomb: false,
        scorePenalty: 0,
        finalScoreDelta: finalDelta,
        victimTeamId,
        victimTeamName,
        stolenPoints,
      };
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // VARIANT 3: PUSH_YOUR_LUCK (Lật liều tích lũy né Bom - Chồng bài vô hạn)
  // ═══════════════════════════════════════════════════════════════════════════
  let tile = state.tiles.find((t) => t.id === tileId && !t.isOpened);
  if (!tile) {
    tile = state.tiles.find((t) => !t.isOpened);
  }
  if (!tile) {
    tile = generateNextPushYourLuckCard({
      theme: state.theme,
      drawIndex: state.cardsFlippedCount + 1,
      basePoints: state.baseQuestionPoints || 10,
      teamScore: team.score || 0,
      isDoublePromo: false,
      options: {
        currentRound,
        teams: allTeams,
        currentTeamId: team.id,
        riskTier,
      },
    });
    state.tiles.push(tile);
  }

  tile.isOpened = true;
  state.lastFlippedTile = tile;
  state.cardsFlippedCount++;

  // ─────────────────────────────────────────────────────────────────────────
  // CHẾ ĐỘ SINH TỬ (SURVIVAL MODE): Lá Thoát Hiểm hoặc Bẫy Phạt
  // ─────────────────────────────────────────────────────────────────────────
  if (tile.type === "ESCAPE_SAFE") {
    state.potPoints = 0;
    state.phase = "TURN_SUMMARY";
    state.turnFinishedReason = "SURVIVAL_ESCAPE";
    const oldScore = team.score || 0;
    state.storyResult = {
      teamId: team.id,
      teamName: team.name,
      teamColor: team.color || "#10b981",
      rewardText: `🕊️ ${tile.storyTitle}: ${tile.storyDescription}`,
      scoreDelta: 0,
      oldScore,
      newScore: oldScore,
    };
    return {
      updatedState: { ...state },
      isBomb: false,
      scorePenalty: 0,
      finalScoreDelta: 0,
    };
  }

  if (state.isPenaltySurvivalMode && (tile.type === "TRAP" || tile.effectType === "LOSE_POINTS")) {
    const penalty = Math.min(team.score || 0, Math.abs(tile.deltaPoints || state.baseQuestionPoints || 10));
    state.potPoints = 0;
    state.phase = "TURN_SUMMARY";
    state.turnFinishedReason = "SURVIVAL_FAILED";
    const oldScore = team.score || 0;
    state.storyResult = {
      teamId: team.id,
      teamName: team.name,
      teamColor: team.color || "#ef4444",
      rewardText: `⚠️ ${tile.storyTitle}: Dính bẫy phạt sinh tử (-${penalty}đ)!`,
      scoreDelta: -penalty,
      oldScore,
      newScore: Math.max(0, oldScore - penalty),
    };
    return {
      updatedState: { ...state },
      isBomb: true,
      scorePenalty: penalty,
      finalScoreDelta: -penalty,
    };
  }

  // Handle Bombs
  const isBombCard =
    tile.type === "BOMB_SMOKE" ||
    tile.type === "BOMB_DARK" ||
    tile.type === "BOMB_CHARITY" ||
    tile.type === "BOMB_MINOR" ||
    tile.type === "BOMB_MAJOR" ||
    tile.type === "BOMB_DOOM";

  if (isBombCard) {
    if (state.hasShield) {
      state.hasShield = false;
      const basePoints = state.baseQuestionPoints || 10;
      state.potPoints = 0;
      state.phase = "TURN_SUMMARY";
      state.turnFinishedReason = "BOMB_HIT";
      const oldScore = team.score || 0;
      const newScore = oldScore + basePoints;
      state.storyResult = {
        teamId: team.id,
        teamName: team.name,
        teamColor: team.color || "#ef4444",
        rewardText: `🛡️ KHIÊN THẦN ĐÃ HẤP THỤ VỤ NỔ! Vô hiệu hóa bẫy bom an toàn, nhận trọn vẹn +${basePoints}đ câu hỏi gốc!`,
        scoreDelta: basePoints,
        oldScore,
        newScore,
      };
      return {
        updatedState: { ...state },
        isBomb: false,
        scorePenalty: 0,
        finalScoreDelta: basePoints,
      };
    }

    // Dính bom: Mất quyền lật ngay lập tức và chịu tác động của loại bom dính phải
    const bombTypeMapped: "BOMB_SMOKE" | "BOMB_DARK" | "BOMB_CHARITY" =
      tile.type === "BOMB_SMOKE" || tile.type === "BOMB_MINOR"
        ? "BOMB_SMOKE"
        : tile.type === "BOMB_DARK" || tile.type === "BOMB_DOOM"
        ? "BOMB_DARK"
        : "BOMB_CHARITY";

    const bombOutcome = resolveBombOutcome({
      bombType: bombTypeMapped,
      team,
      allTeams,
      storyDescription: tile.storyDescription,
      baseQuestionPoints: state.baseQuestionPoints,
      isSurvivalPenalty: state.isPenaltySurvivalMode,
    });

    const penalty = bombOutcome.penalty;
    const penaltyText = bombOutcome.penaltyText;
    const recipientTeamId = bombOutcome.recipientTeamId;
    const recipientTeamName = bombOutcome.recipientTeamName;
    const giftedPoints = bombOutcome.giftedPoints;
    const darkBombRecipients = bombOutcome.darkBombRecipients;
    state.bombExploded = bombOutcome.bombExploded;

    // SAFETY_NET_PROMO: Bảo lưu 50% quỹ điểm nếu có
    const hasSafetyNet = getPerkType(state.promoPerk) === "SAFETY_NET_PROMO";
    const savedPotPoints = hasSafetyNet && state.potPoints > 0 ? Math.ceil(state.potPoints * 0.5) : 0;
    const finalDelta = savedPotPoints - penalty;

    state.potPoints = 0;
    state.phase = "TURN_SUMMARY";
    state.turnFinishedReason = state.isPenaltySurvivalMode ? "SURVIVAL_FAILED" : "BOMB_HIT";

    if (!state.consecutiveBombsByTeam) state.consecutiveBombsByTeam = {};
    state.consecutiveBombsByTeam[team.id] = (state.consecutiveBombsByTeam[team.id] || 0) + 1;

    const oldScore = team.score || 0;
    const newScore = Math.max(0, oldScore + finalDelta);

    const safetyNetMsg = savedPotPoints > 0
      ? ` 🧲 Két Sắt Bảo Lưu đã giải cứu: Bảo lưu an toàn +${savedPotPoints}đ từ Quỹ thưởng!`
      : "";

    state.storyResult = {
      teamId: team.id,
      teamName: team.name,
      teamColor: team.color || "#ef4444",
      rewardText: `💥 ${tile.storyTitle} ${penaltyText}${safetyNetMsg}`,
      scoreDelta: finalDelta,
      oldScore,
      newScore,
    };

    return {
      updatedState: { ...state },
      isBomb: true,
      scorePenalty: penalty,
      finalScoreDelta: finalDelta,
      recipientTeamId,
      giftedPoints,
      darkBombRecipients,
    };
  }

  const hasExtraPot = getPerkType(state.promoPerk) === "EXTRA_POT_PROMO";
  const extraPotBonus = hasExtraPot ? 5 : 0;

  // Safe Reward Card
  if (tile.effectType === "MULTIPLY_X2") {
    state.potMultiplier *= 2;
    state.potPoints = state.potPoints > 0 ? state.potPoints * 2 : (20 + extraPotBonus) * state.potMultiplier;
  } else if (tile.effectType === "STEAL_POINTS") {
    const stealAmount = tile.deltaPoints || state.baseQuestionPoints || 10;
    const eligibleTeams = (allTeams || []).filter(
      (t) => t.id !== team.id && !t.isEliminated && (t.score || 0) >= stealAmount
    );
    if (eligibleTeams.length > 0) {
      state.phase = "STEAL_TARGET_SELECT";
      state.pendingSteal = {
        stolenPoints: stealAmount,
        eligibleTeamIds: eligibleTeams.map((t) => t.id),
        tileTitle: tile.storyTitle,
        tileIcon: tile.icon,
      };
      return {
        updatedState: { ...state },
        isBomb: false,
        scorePenalty: 0,
        finalScoreDelta: 0,
      };
    } else {
      // Về nguyên tắc: chỉ tính phần thưởng ở thẻ rút cuối, không cộng dồn!
      state.potPoints = (stealAmount + extraPotBonus) * state.potMultiplier;
    }
  } else {
    // Về nguyên tắc: chỉ tính phần thưởng ở thẻ rút cuối, không cộng dồn!
    state.potPoints = ((tile.deltaPoints || state.baseQuestionPoints || 10) + extraPotBonus) * state.potMultiplier;
  }

  // Chồng bài vô hạn: Tự động sinh lá bài tiếp theo úp mặt trên đỉnh chồng bài sẵn sàng rút tiếp!
  const nextTopCard = generateNextPushYourLuckCard({
    theme: state.theme,
    drawIndex: state.cardsFlippedCount + 1,
    basePoints: state.baseQuestionPoints || 10,
    teamScore: team.score || 0,
    isDoublePromo: false,
    options: {
      currentRound: state.currentRound,
      teams: allTeams,
      currentTeamId: team.id,
    },
  });
  state.tiles.push(nextTopCard);

  // Rút xong thì lá bài tiếp theo úp lại bí mật (trừ khi người chơi chủ động bấm nút soi)
  state.nextCardPeek = undefined;

  return {
    updatedState: { ...state },
    isBomb: false,
    scorePenalty: 0,
  };
}

/**
 * Handles cashing out (Dừng lại & Bảo toàn điểm trong PUSH_YOUR_LUCK).
 * Explicitly clears state.potPoints to 0 so no (+Xđ) remains on UI!
 */
export function handleCashOut({
  state,
  team,
  allTeams = [],
}: {
  state: MysteryQuestState;
  team: MysteryTeamRef;
  allTeams?: MysteryTeamRef[];
}): {
  updatedState: MysteryQuestState;
  finalScoreDelta: number;
  victimTeamId?: string;
  victimTeamName?: string;
  stolenPoints?: number;
} {
  let finalScoreDelta = state.potPoints;

  // Reset chuỗi nổ bom của đội hiện tại vì đã Cash Out thành công
  if (!state.consecutiveBombsByTeam) state.consecutiveBombsByTeam = {};
  state.consecutiveBombsByTeam[team.id] = 0;

  let victimTeamId: string | undefined;
  let victimTeamName: string | undefined;
  let stolenPoints: number | undefined;
  let stealProtectionNote: string | undefined;

  if (state.stolenPointsPot && state.stolenPointsPot > 0 && allTeams.length > 0) {
    if (state.pendingStealVictimId) {
      const chosenVictim = allTeams.find((t) => t.id === state.pendingStealVictimId);
      if (chosenVictim && (chosenVictim.score || 0) > 0) {
        victimTeamId = chosenVictim.id;
        victimTeamName = chosenVictim.name;
        stolenPoints = Math.min(state.stolenPointsPot, chosenVictim.score || 0);
      }
    }
    if (!victimTeamId) {
      const stealCalc = calculateCappedSteal({
        activeTeamId: team.id,
        allTeams,
        targetPoints: state.stolenPointsPot,
        maxCap: 25,
        timesStolenInCycle: state.timesStolenInCycle,
      });
      if (stealCalc.victimTeamId && stealCalc.stolenPoints > 0) {
        victimTeamId = stealCalc.victimTeamId;
        victimTeamName = stealCalc.victimTeamName;
        stolenPoints = stealCalc.stolenPoints;
        stealProtectionNote = stealCalc.protectionNote;
      }
    }
  }

  // Promo Perk: STEAL_5_PROMO (Đánh cắp 5đ từ đội cao điểm nhất)
  let promoStealDetails: { victimName?: string; stolen: number } | undefined;
  if (getPerkType(state.promoPerk) === "STEAL_5_PROMO" && allTeams.length > 0) {
    const promoSteal = calculatePromoSteal5({
      activeTeamId: team.id,
      allTeams,
      timesStolenInCycle: state.timesStolenInCycle,
    });
    if (promoSteal.victimTeamId && promoSteal.stolenPoints > 0) {
      promoStealDetails = { victimName: promoSteal.victimTeamName, stolen: promoSteal.stolenPoints };
      finalScoreDelta += promoSteal.stolenPoints;
      if (victimTeamId && victimTeamId === promoSteal.victimTeamId) {
        stolenPoints = (stolenPoints || 0) + promoSteal.stolenPoints;
      } else if (!victimTeamId) {
        victimTeamId = promoSteal.victimTeamId;
        victimTeamName = promoSteal.victimTeamName;
        stolenPoints = promoSteal.stolenPoints;
      }
    }
  }

  // Ghi nhận số lần bị cướp trong chu kỳ của nạn nhân
  if (victimTeamId) {
    if (!state.timesStolenInCycle) state.timesStolenInCycle = {};
    state.timesStolenInCycle[victimTeamId] = (state.timesStolenInCycle[victimTeamId] || 0) + 1;
  }

  const oldScore = team.score || 0;
  const newScore = oldScore + finalScoreDelta;

  state.phase = "TURN_SUMMARY";
  state.turnFinishedReason = "CASH_OUT";
  state.potPoints = 0; // Reset to 0 immediately upon cashing out!
  state.stolenPointsPot = 0;

  let rewardText = `💰 Bảo toàn thành công! Nhận trọn vẹn +${finalScoreDelta} điểm!`;
  if (stealProtectionNote) {
    rewardText = `💰 Bảo toàn thành công! Nhận +${finalScoreDelta} điểm (${stealProtectionNote})!`;
  } else if (promoStealDetails && promoStealDetails.stolen > 0) {
    rewardText = `💰 Bảo toàn thành công! Nhận trọn vẹn +${finalScoreDelta} điểm (bao gồm 🗡️ Đạo Tặc đánh cắp ${promoStealDetails.stolen}đ từ Đội ${promoStealDetails.victimName})!`;
  } else if (victimTeamName && stolenPoints) {
    rewardText = `💰 Bảo toàn thành công! Nhận trọn vẹn +${finalScoreDelta} điểm (đã cướp ${stolenPoints}đ từ Đội ${victimTeamName})!`;
  }

  state.storyResult = {
    teamId: team.id,
    teamName: team.name,
    teamColor: team.color || "#ef4444",
    rewardText,
    scoreDelta: finalScoreDelta,
    oldScore,
    newScore,
  };

  return {
    updatedState: { ...state },
    finalScoreDelta,
    victimTeamId,
    victimTeamName,
    stolenPoints,
  };
}

/**
 * Handles decision after exhausting 3 attempts in Memory Pairs Round 1:
 * - "CASH_OUT": safely end turn and award baseQuestionPoints
 * - "PLAY_ROUND_2": start round 2 with 3 new attempts, failing which will trigger a bomb!
 */
export function handleMemoryPairsSecondChanceDecision({
  state,
  team,
  choice,
}: {
  state: MysteryQuestState;
  team: MysteryTeamRef;
  choice: "CASH_OUT" | "PLAY_ROUND_2";
}): {
  updatedState: MysteryQuestState;
  finalScoreDelta: number;
} {
  const memState = state.memoryPairsState;
  if (!memState || !memState.promptSecondChance) {
    return { updatedState: state, finalScoreDelta: 0 };
  }

  if (choice === "CASH_OUT") {
    // Trừ 1 Tim của đội khi chọn dừng lại nhận điểm câu hỏi sau vòng 1 thất bại
    const heartsRecord = { ...(state.teamHearts || {}) };
    const currentHearts = heartsRecord[team.id] ?? state.initialHeartsPerTeam ?? 2;
    if (currentHearts > 0) {
      heartsRecord[team.id] = Math.max(0, currentHearts - 1);
      state.teamHearts = heartsRecord;
    }

    const award = state.baseQuestionPoints || 10;
    state.phase = "TURN_SUMMARY";
    state.turnFinishedReason = "PAIR_MATCHED";
    state.potPoints = 0;
    memState.promptSecondChance = false;
    state.memoryPairsState = { ...memState };

    const oldScore = team.score || 0;
    const newScore = oldScore + award;
    const remainingHearts = state.teamHearts?.[team.id] ?? 0;

    state.storyResult = {
      teamId: team.id,
      teamName: team.name,
      teamColor: team.color || "#ef4444",
      rewardText: `🛡️ Dừng lại bảo toàn! Tiêu hao 1 ❤️ để nhận trọn vẹn +${award} điểm câu hỏi (Còn ${remainingHearts} ❤️)!`,
      scoreDelta: award,
      oldScore,
      newScore,
    };

    return {
      updatedState: { ...state },
      finalScoreDelta: award,
    };
  } else {
    // Chơi tiếp Vòng 2: 4 lượt mới, reset sạch cache và randomize lại toàn bộ bàn cờ từ đầu
    memState.round = 2;
    memState.maxAttempts = 4;
    memState.attemptsUsed = 0;
    memState.promptSecondChance = false;
    memState.firstFlippedTileId = null;
    memState.secondFlippedTileId = null;
    memState.thirdFlippedTileId = null;
    memState.keptBombTileIds = []; // Xóa sạch lá phạt của Vòng 1 để không bị dính cache sang Vòng 2
    memState.isBombRescueActive = false;
    memState.activePenaltyPairKey = null;
    memState.isMismatchResolving = false;
    memState.matchedPairKey = null;

    // Đảm bảo tất cả các thẻ úp lại và đã được xáo trộn ngẫu nhiên hoàn toàn
    state.tiles = shuffleMemoryPairsTiles(state.tiles);
    state.memoryPairsState = { ...memState };

    return {
      updatedState: { ...state },
      finalScoreDelta: 0,
    };
  }
}

/**
 * Handles target team selection when a steal card is flipped.
 */
export function handleChooseStealTarget({
  state,
  targetTeamId,
  allTeams = [],
}: {
  state: MysteryQuestState;
  targetTeamId: string;
  allTeams?: MysteryTeamRef[];
}): {
  updatedState: MysteryQuestState;
  victimTeamId?: string;
  victimTeamName?: string;
  stolenPoints: number;
  finalScoreDelta: number;
} {
  const pending = state.pendingSteal;
  const targetTeam = (allTeams || []).find((t) => t.id === targetTeamId);
  const activeTeam = (allTeams || []).find((t) => t.id === state.currentTurnTeamId);

  const rawStolenPoints = pending?.stolenPoints || 20;
  const victimTeamId = targetTeam?.id;
  const victimTeamName = targetTeam?.name || "Đối thủ";
  const hasExtraPot = getPerkType(state.promoPerk) === "EXTRA_POT_PROMO";
  const extraPotBonus = hasExtraPot ? 5 : 0;

  // QUY TẮC BẢO VỆ CHỐNG CƯỚP LIÊN HOÀN
  if (!state.timesStolenInCycle) state.timesStolenInCycle = {};
  const timesStolen = victimTeamId ? (state.timesStolenInCycle[victimTeamId] || 0) : 0;
  let stolenPoints = rawStolenPoints;
  let isHalfProtected = false;

  if (victimTeamId && timesStolen === 1) {
    stolenPoints = Math.max(5, roundToMultipleOfFive(rawStolenPoints * 0.5));
    isHalfProtected = true;
  }
  if (victimTeamId) {
    state.timesStolenInCycle[victimTeamId] = timesStolen + 1;
  }

  const protectionNote = isHalfProtected
    ? ` (Khiên Chống Vắt Kiệt: Đội ${victimTeamName} đã bị cướp lần 2 trong vòng, chỉ bị trừ 50%!)`
    : "";

  if (state.miniGameType === "PUSH_YOUR_LUCK") {
    // Trong Push-your-luck, cướp điểm nạp vào quỹ pot và tiếp tục chơi
    const totalPotFromSteal = (stolenPoints + extraPotBonus) * state.potMultiplier;
    state.phase = "PUSH_YOUR_LUCK";
    state.pendingSteal = undefined;
    state.potPoints = totalPotFromSteal;
    state.stolenPointsPot = stolenPoints * state.potMultiplier;
    state.pendingStealVictimId = victimTeamId;
    state.pendingStealVictimName = victimTeamName;

    state.storyResult = {
      teamId: state.currentTurnTeamId,
      teamName: state.currentTurnTeamName,
      teamColor: state.currentTurnTeamColor,
      rewardText: extraPotBonus > 0
        ? `🗡️ Đã nhắm Đội ${victimTeamName}! Nạp +${stolenPoints}đ cướp${protectionNote} và +${extraPotBonus}đ từ Quỹ thưởng vào quỹ điểm (Tổng +${totalPotFromSteal}đ)!`
        : `🗡️ Đã nhắm Đội ${victimTeamName}! Nạp +${totalPotFromSteal} điểm cướp${protectionNote} vào quỹ điểm!`,
      scoreDelta: 0,
      oldScore: activeTeam?.score || 0,
      newScore: activeTeam?.score || 0,
    };

    return {
      updatedState: { ...state },
      victimTeamId,
      victimTeamName,
      stolenPoints,
      finalScoreDelta: 0,
    };
  }

  // Đối với các chế độ kết thúc lượt ngay (TAROT_DESTINY, ONE_SHOT_DOORS, MEMORY_PAIRS)
  state.phase = "TURN_SUMMARY";
  state.turnFinishedReason =
    state.miniGameType === "TAROT_DESTINY"
      ? "TAROT_DRAWN"
      : state.miniGameType === "ONE_SHOT_DOORS"
      ? "DOOR_CHOSEN"
      : "PAIR_MATCHED";
  state.pendingSteal = undefined;
  state.potPoints = 0;

  const finalScoreDelta = stolenPoints + extraPotBonus;
  const oldScore = activeTeam?.score || 0;
  const newScore = oldScore + finalScoreDelta;

  const rewardText = extraPotBonus > 0
    ? `🗡️ Cướp thành công! Đã chuyển +${stolenPoints} điểm từ Đội ${victimTeamName}${protectionNote} và nhận thêm +${extraPotBonus}đ từ Quỹ thưởng (+${finalScoreDelta} điểm cho Đội ${state.currentTurnTeamName})!`
    : `🗡️ Cướp thành công! Đã chuyển +${stolenPoints} điểm từ Đội ${victimTeamName}${protectionNote} sang Đội ${state.currentTurnTeamName}!`;

  state.storyResult = {
    teamId: state.currentTurnTeamId,
    teamName: state.currentTurnTeamName,
    teamColor: state.currentTurnTeamColor,
    rewardText,
    scoreDelta: finalScoreDelta,
    oldScore,
    newScore,
  };

  return {
    updatedState: { ...state },
    victimTeamId,
    victimTeamName,
    stolenPoints,
    finalScoreDelta,
  };
}

/**
 * Handles decisions for 5 Cánh Cửa Bí Mật (ONE_SHOT_DOORS):
 * - "SWAP_DOOR": Đổi 1 trong 3 lá đã chọn sang 1 lá khác (chỉ 1 lần duy nhất, không quét lại số lá trừ).
 * - "TAKE_BASE_MINUS_HEART" / "SAFE_EXIT": Rút lui nhận điểm câu hỏi gốc và bị trừ 1 Tim.
 * - "RISK_OPEN": Mở 1 trong 3 cánh cửa đã chọn để nhận kết quả.
 */
export function handleOneShotDoorsDecision({
  state,
  team,
  allTeams = [],
  decision,
  chosenDoorId,
  swapRemovedDoorId,
  swapAddedDoorId,
}: {
  state: MysteryQuestState;
  team: MysteryTeamRef;
  allTeams?: MysteryTeamRef[];
  decision: "SAFE_EXIT" | "RISK_OPEN" | "SWAP_DOOR" | "TAKE_BASE_MINUS_HEART";
  chosenDoorId?: number;
  swapRemovedDoorId?: number;
  swapAddedDoorId?: number;
}): {
  updatedState: MysteryQuestState;
  finalScoreDelta: number;
  isBomb: boolean;
  scorePenalty: number;
  victimTeamId?: string;
  victimTeamName?: string;
  stolenPoints?: number;
  recipientTeamId?: string;
  recipientTeamName?: string;
  giftedPoints?: number;
  darkBombRecipients?: Array<{ teamId: string; teamName: string; points: number }>;
} {
  const osState = state.oneShotState || {
    selectedDoorIds: [],
    hasBombDetected: false,
    phase: "SELECTING",
    revealedSafeDoorIds: [],
    chosenFinalDoorId: undefined,
    allRevealed: false,
  };
  state.oneShotState = osState;

  const hasExtraPot = getPerkType(state.promoPerk) === "EXTRA_POT_PROMO";
  const extraPotBonus = hasExtraPot ? 5 : 0;
  const multiplier = state.potMultiplier || 1;

  // ─────────────────────────────────────────────────────────────────────────
  // PHƯƠNG ÁN 1: ĐỔI 1 TRONG 3 LÁ ĐÃ CHỌN SANG 1 LÁ KHÁC (1 LẦN DUY NHẤT)
  // ĐẶC BIỆT: HỆ THỐNG KHÔNG BÁO LẠI SỐ LÁ TRỪ MỚI (để tránh người chơi né)!
  // ─────────────────────────────────────────────────────────────────────────
  if (decision === "SWAP_DOOR") {
    if (osState.hasSwapped) {
      // Đã đổi 1 lần rồi thì không cho đổi tiếp
      return { updatedState: state, finalScoreDelta: 0, isBomb: false, scorePenalty: 0 };
    }

    const currentSelected = [...(osState.selectedDoorIds || [])];
    if (swapRemovedDoorId && swapAddedDoorId) {
      // Thay thế lá cũ bằng lá mới
      const newSelected = currentSelected
        .filter((id) => id !== swapRemovedDoorId)
        .concat(swapAddedDoorId);

      osState.selectedDoorIds = newSelected;
      osState.hasSwapped = true;
      osState.swapRemovedDoorId = swapRemovedDoorId;
      osState.swapAddedDoorId = swapAddedDoorId;
      // Tuyệt đối không báo lại số lá trừ mới theo yêu cầu:
      osState.penaltyDoorsCount = undefined;
      osState.hasBombDetected = false;
      osState.phase = "STAGE_2_PICK";
    }

    return {
      updatedState: { ...state },
      finalScoreDelta: 0,
      isBomb: false,
      scorePenalty: 0,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PHƯƠNG ÁN 2: LẤY ĐIỂM GỐC NHƯNG BỊ TRỪ 1 TIM (RÚT LUI AN TOÀN)
  // ─────────────────────────────────────────────────────────────────────────
  if (decision === "TAKE_BASE_MINUS_HEART" || decision === "SAFE_EXIT") {
    // Trừ 1 Tim của đội nếu đội còn Tim
    const heartsRecord = { ...(state.teamHearts || {}) };
    const currentHearts = heartsRecord[team.id] ?? state.initialHeartsPerTeam ?? 1;
    if (currentHearts > 0) {
      heartsRecord[team.id] = Math.max(0, currentHearts - 1);
      state.teamHearts = heartsRecord;
    }

    osState.phase = "RESOLVED";
    osState.allRevealed = true;
    osState.isBasePointsWithMinusHeart = true;
    state.tiles.forEach((t) => {
      t.isOpened = true;
    });

    const finalDelta = (state.baseQuestionPoints || 10) + extraPotBonus;
    state.potPoints = 0;
    state.phase = "TURN_SUMMARY";
    state.turnFinishedReason = "TOOK_BASE_POINTS";

    const oldScore = team.score || 0;
    const newScore = oldScore + finalDelta;
    const remainingHearts = state.teamHearts?.[team.id] ?? 0;

    const rewardText = extraPotBonus > 0
      ? `🛡️ Rút lui bảo toàn! Chấp nhận tiêu hao 1 ❤️ để nhận an toàn +${state.baseQuestionPoints || 10}đ câu hỏi và +${extraPotBonus}đ Quỹ thưởng (Tổng +${finalDelta} điểm, còn ${remainingHearts} ❤️)!`
      : `🛡️ Rút lui bảo toàn! Chấp nhận tiêu hao 1 ❤️ để nhận an toàn trọn vẹn +${finalDelta} điểm câu hỏi (Còn ${remainingHearts} ❤️)!`;

    state.storyResult = {
      teamId: team.id,
      teamName: team.name,
      teamColor: team.color || "#ef4444",
      rewardText,
      scoreDelta: finalDelta,
      oldScore,
      newScore,
    };

    return {
      updatedState: { ...state },
      finalScoreDelta: finalDelta,
      isBomb: false,
      scorePenalty: 0,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // MỞ 1 TRONG 3 CÁNH CỬA ĐÃ CHỌN (GIAI ĐOẠN 2)
  // ─────────────────────────────────────────────────────────────────────────
  if (decision === "RISK_OPEN" && !chosenDoorId && osState.phase === "PENALTY_DECISION") {
    osState.phase = "STAGE_2_PICK";
    return {
      updatedState: { ...state },
      finalScoreDelta: 0,
      isBomb: false,
      scorePenalty: 0,
    };
  }

  const doorIdToOpen = chosenDoorId ?? (osState.selectedDoorIds && osState.selectedDoorIds[0]);
  const chosenTile = state.tiles.find((t) => t.id === doorIdToOpen);
  if (!chosenTile) {
    return { updatedState: state, finalScoreDelta: 0, isBomb: false, scorePenalty: 0 };
  }

  osState.phase = "RESOLVED";
  osState.allRevealed = true;
  osState.chosenFinalDoorId = doorIdToOpen;
  state.tiles.forEach((t) => {
    t.isOpened = true;
  });

  const isNegative = chosenTile.type !== "REWARD" || (chosenTile.deltaPoints && chosenTile.deltaPoints < 0);

  if (isNegative) {
    if (state.hasShield) {
      state.hasShield = false;
      state.potPoints = 0;
      state.phase = "TURN_SUMMARY";
      state.turnFinishedReason = "DOOR_CHOSEN";
      const basePoints = state.baseQuestionPoints || 10;
      const oldScore = team.score || 0;
      const newScore = oldScore + basePoints;
      state.storyResult = {
        teamId: team.id,
        teamName: team.name,
        teamColor: team.color || "#ef4444",
        rewardText: `🛡️ KHIÊN THẦN ĐÃ HẤP THỤ BẪY PHẠT! Cửa phạt đã bị chặn đứng an toàn, nhận trọn vẹn +${basePoints}đ câu hỏi gốc!`,
        scoreDelta: basePoints,
        oldScore,
        newScore,
      };
      return {
        updatedState: { ...state },
        isBomb: false,
        scorePenalty: 0,
        finalScoreDelta: basePoints,
      };
    }

    const isRandomBomb = chosenTile.type === "BOMB_MAJOR" || Boolean((chosenTile as any).bombDoorType);

    if (isRandomBomb) {
      const bombType = (chosenTile as any).bombDoorType || rollBombTypeForMinigame("ONE_SHOT_DOORS", team.score || 0);
      const outcome = resolveBombOutcome({
        bombType,
        team,
        allTeams,
        storyDescription: chosenTile.storyDescription || "Mở trúng Cửa Bẫy Bom!",
        baseQuestionPoints: state.baseQuestionPoints,
        isSurvivalPenalty: state.isPenaltySurvivalMode,
      });
      state.potPoints = 0;
      state.bombExploded = outcome.bombExploded;
      state.phase = "TURN_SUMMARY";
      state.turnFinishedReason = state.isPenaltySurvivalMode ? "SURVIVAL_FAILED" : "BOMB_HIT";

      const oldScore = team.score || 0;
      const newScore = Math.max(0, oldScore - outcome.penalty);

      state.storyResult = {
        teamId: team.id,
        teamName: team.name,
        teamColor: team.color || "#ef4444",
        rewardText: `💥 Rủi ro bất thành! ${outcome.bombExploded.title}: ${outcome.penaltyText}`,
        scoreDelta: -outcome.penalty,
        oldScore,
        newScore,
      };

      return {
        updatedState: { ...state },
        isBomb: true,
        scorePenalty: outcome.penalty,
        finalScoreDelta: -outcome.penalty,
        recipientTeamId: outcome.recipientTeamId,
        recipientTeamName: outcome.recipientTeamName,
        giftedPoints: outcome.giftedPoints,
        darkBombRecipients: outcome.darkBombRecipients,
      };
    } else {
      // Cửa Trừ Gốc: Trừ đúng điểm gốc câu hỏi
      const penalty = Math.abs(chosenTile.deltaPoints || state.baseQuestionPoints || 10);
      state.potPoints = 0;
      state.bombExploded = {
        type: "MINOR",
        title: chosenTile.storyTitle,
        description: chosenTile.storyDescription,
        penaltyText: `Mở trúng Cửa Bẫy Trừ Gốc! Bị trừ ${penalty} điểm từ tổng điểm.`,
      };
      state.phase = "TURN_SUMMARY";
      state.turnFinishedReason = "BOMB_HIT";

      const oldScore = team.score || 0;
      const newScore = Math.max(0, oldScore - penalty);

      state.storyResult = {
        teamId: team.id,
        teamName: team.name,
        teamColor: team.color || "#ef4444",
        rewardText: `💥 Mở trúng Cửa Bẫy Trừ Gốc! Bị trừ ${penalty} điểm!`,
        scoreDelta: -penalty,
        oldScore,
        newScore,
      };

      return {
        updatedState: { ...state },
        isBomb: true,
        scorePenalty: penalty,
        finalScoreDelta: -penalty,
      };
    }
  } else {
    let victimTeamId: string | undefined;
    let victimTeamName: string | undefined;
    let stolenPoints: number | undefined;
    let finalDelta = 0;

    if (chosenTile.effectType === "STEAL_POINTS") {
      const stealAmount = chosenTile.deltaPoints || state.baseQuestionPoints || 10;
      const eligibleTeams = (allTeams || []).filter(
        (t) => t.id !== team.id && !t.isEliminated && (t.score || 0) >= stealAmount
      );
      if (eligibleTeams.length > 0) {
        state.phase = "STEAL_TARGET_SELECT";
        state.pendingSteal = {
          stolenPoints: stealAmount,
          eligibleTeamIds: eligibleTeams.map((t) => t.id),
          tileTitle: chosenTile.storyTitle,
          tileIcon: chosenTile.icon,
        };
        return {
          updatedState: { ...state },
          isBomb: false,
          scorePenalty: 0,
          finalScoreDelta: 0,
        };
      } else {
        finalDelta = (stealAmount * multiplier) + extraPotBonus;
      }
    } else {
      finalDelta = ((chosenTile.deltaPoints ?? (state.baseQuestionPoints || 10)) * multiplier) + extraPotBonus;
    }

    if (getPerkType(state.promoPerk) === "STEAL_5_PROMO" && allTeams && allTeams.length > 0) {
      const promoSteal = calculatePromoSteal5({
        activeTeamId: team.id,
        allTeams,
      });
      if (promoSteal.victimTeamId && promoSteal.stolenPoints > 0) {
        victimTeamId = promoSteal.victimTeamId;
        victimTeamName = promoSteal.victimTeamName;
        stolenPoints = (stolenPoints || 0) + promoSteal.stolenPoints;
        finalDelta += promoSteal.stolenPoints;
      }
    }

    state.potPoints = 0;
    state.phase = "TURN_SUMMARY";
    state.turnFinishedReason = "DOOR_CHOSEN";

    const oldScore = team.score || 0;
    const newScore = oldScore + finalDelta;

    let rewardText = `🎉 ĐOÁN ĐÚNG XUẤT SẮC! Mở trúng cánh cửa an toàn #${chosenTile.id}: Nhận trọn vẹn +${finalDelta} điểm!`;
    if (stolenPoints && victimTeamName) {
      rewardText += ` (🗡️ Đạo Tặc đánh cắp +${stolenPoints}đ từ Đội ${victimTeamName}!)`;
    }

    state.storyResult = {
      teamId: team.id,
      teamName: team.name,
      teamColor: team.color || "#ef4444",
      rewardText,
      scoreDelta: finalDelta,
      oldScore,
      newScore,
    };

    return {
      updatedState: { ...state },
      isBomb: false,
      scorePenalty: 0,
      finalScoreDelta: finalDelta,
      victimTeamId,
      victimTeamName,
      stolenPoints,
    };
  }
}

/**
 * THỂ THỨC MỚI: BÀI TAROT (TAROT_DESTINY)
 * Vận hành theo "Định Mệnh Chọn Lá" gán chặt vào 5 thực thể cổ xưa theo tỷ lệ [60% - 30% - 10%]:
 * - NHÓM ĐỊNH MỆNH THƯỜNG (60%):
 *   * Mặt Trời (The Sun - 30%): Điềm lành (+basePoints an toàn).
 *   * Kẻ Khờ (The Fool - 30%): Điềm dữ (mất sạch điểm câu này, 0đ).
 * - NHÓM ĐỊNH MỆNH ĐỘT BIẾN (30%):
 *   * Hoàng Đế (The Emperor - 15%): Quyền lực hắc ám (trừ điểm tổng chia đều các đối thủ block 5đ).
 *   * Hiệp Sĩ (The Knight - 15%): Định mệnh trừng phạt (bay mất 1/2 tổng điểm hiện có, xóa sổ).
 * - NHÓM ĐỊNH MỆNH CHÍ MẠNG (10%):
 *   * Thần Chết (Death - 10%):
 *     + Kịch bản Tặng điểm (5%): Trừ 50% tổng điểm tặng Top 1 đối thủ.
 *     + Kịch bản Cướp điểm (5%): Cướp basePoints * 2 từ Top 1 đối thủ (Top 1 trừ tối đa về 0đ, đội rút nhận đủ).
 */
export function handleAncientTarotDraw({
  state,
  team,
  allTeams = [],
}: {
  state: MysteryQuestState;
  team: MysteryTeamRef;
  allTeams?: MysteryTeamRef[];
}): {
  updatedState: MysteryQuestState;
  finalScoreDelta: number;
  isBomb: boolean;
  scorePenalty: number;
  victimTeamId?: string;
  victimTeamName?: string;
  stolenPoints?: number;
  giftedPoints?: number;
  darkBombRecipients?: Array<{ teamId: string; teamName: string; points: number }>;
  drawnCard: AncientTarotDrawnCard;
  scoreDeltas: Array<{ teamId: string; delta: number }>;
} {
  const basePoints = normalizeToThreeLevels(state.baseQuestionPoints || 10);
  const currentScore = team.score || 0;
  const otherTeams = allTeams.filter((t) => t.id !== team.id && !t.isEliminated);
  const rand = Math.random();

  let drawnCard: AncientTarotDrawnCard;

  if (state.isPenaltySurvivalMode) {
    // ─────────────────────────────────────────────────────────────────────────
    // CHẾ ĐỘ SINH TỬ (SURVIVAL MODE): 20% Thoát hiểm (THE_PEACE), 80% Bẫy/Phạt
    // ─────────────────────────────────────────────────────────────────────────
    if (rand < 0.20) {
      // 🕊️ THOÁT HIỂM AN TOÀN (20%)
      drawnCard = {
        key: "THE_PEACE",
        nameVi: "Bình Yên Thoát Nạn",
        nameEn: "The Peace",
        icon: "🕊️",
        roman: "XXI",
        group: "COMMON",
        scoreDelta: 0,
      };
    } else if (rand < 0.40) {
      // 🗡️ HIỆP SĨ (20%): -50% tổng điểm
      const penalty = roundToMultipleOfFive(currentScore * 0.5);
      drawnCard = {
        key: "THE_KNIGHT",
        nameVi: "Hiệp Sĩ",
        nameEn: "The Knight",
        icon: "🗡️",
        roman: "XII",
        group: "MUTATION",
        scoreDelta: -penalty,
      };
    } else if (rand < 0.60) {
      // 👑 HOÀNG ĐẾ (20%): Bom Hắc Ám
      const darkOutcome = resolveBombOutcome({
        bombType: "BOMB_DARK",
        team,
        allTeams,
        storyDescription: "Hoàng Đế uy quyền hắc ám! Rút cạn điểm số chia đều cho các đối thủ!",
        baseQuestionPoints: basePoints,
        isSurvivalPenalty: true,
      });
      drawnCard = {
        key: "THE_EMPEROR",
        nameVi: "Hoàng Đế",
        nameEn: "The Emperor",
        icon: "👑",
        roman: "IV",
        group: "MUTATION",
        scoreDelta: -darkOutcome.penalty,
        darkBombRecipients: darkOutcome.darkBombRecipients,
      };
    } else if (rand < 0.80) {
      // 💀 THẦN CHẾT (20%): Bom Từ Thiện (Tặng Top 1)
      const rawHalf = roundToMultipleOfFive(currentScore * 0.5);
      const rawBaseMultiplier = roundToMultipleOfFive(basePoints * 1.5);
      const targetPenalty = Math.min(rawHalf, rawBaseMultiplier);
      const gifted = currentScore > 0 ? Math.min(currentScore, targetPenalty) : 0;
      let top1Team: MysteryTeamRef | undefined = undefined;
      if (otherTeams.length > 0) {
        const maxScore = Math.max(...otherTeams.map((t) => t.score || 0));
        const topCandidates = otherTeams.filter((t) => (t.score || 0) === maxScore);
        top1Team = topCandidates[Math.floor(Math.random() * topCandidates.length)];
      }
      drawnCard = {
        key: "THE_DEATH",
        nameVi: "Thần Chết (Tặng Điểm)",
        nameEn: "Death",
        icon: "💀",
        roman: "XIII",
        group: "CRITICAL",
        deathSubtype: "GIFT_TOP1",
        scoreDelta: -gifted,
        giftedPoints: gifted,
        victimTeamId: top1Team?.id,
        victimTeamName: top1Team?.name,
      };
    } else {
      // 🃏 KẺ KHỜ SINH TỬ (20%): Trừ 50% điểm gốc câu hỏi
      const penalty = Math.min(currentScore, roundToMultipleOfFive(basePoints * 0.5));
      drawnCard = {
        key: "THE_FOOL",
        nameVi: "Kẻ Khờ (Khói Độc Sinh Tử)",
        nameEn: "The Fool",
        icon: "🃏",
        roman: "0",
        group: "COMMON",
        scoreDelta: -penalty,
      };
    }
  } else {
    // ─────────────────────────────────────────────────────────────────────────
    // CHẾ ĐỘ THƯỜNG: Tỷ lệ lũy tiến theo Round & Thích ứng theo thế trận
    // - Round 1: 85% Tích cực (55% Sun, 30% Death Steal), 15% Rủi ro (10% Fool, 5% Emperor, 0% Knight)
    // - Round 2: 70% Tích cực (45% Sun, 25% Death Steal), 30% Rủi ro (15% Fool, 10% Emperor, 5% Knight)
    // - Round 3+: 60% Tích cực (35% Sun, 25% Death Steal), 40% Rủi ro (15% Fool, 15% Emperor, 10% Knight)
    // - UNDERDOG: Tích cực +10% (Sun +5%, Death +5%), Knight = 0%
    // - DOMINANT: Tích cực -10% (Sun -5%, Death -5%), Emperor +5%, Knight +5%
    // ─────────────────────────────────────────────────────────────────────────
    const currentRound = state.currentRound || 1;
    const riskTier = evaluateTeamRiskTier({
      team,
      allTeams,
      currentRound,
    });
    const hasSunMagnet = getPerkType(state.promoPerk) === "SUN_MAGNET_PROMO";

    let probSun = currentRound <= 1 ? 0.55 : currentRound === 2 ? 0.45 : 0.35;
    let probDeath = currentRound <= 1 ? 0.30 : 0.25;
    let probFool = currentRound <= 1 ? 0.10 : 0.15;
    let probEmperor = currentRound <= 1 ? 0.05 : currentRound === 2 ? 0.10 : 0.15;
    let probKnight = currentRound <= 1 ? 0.00 : currentRound === 2 ? 0.05 : 0.10;

    if (riskTier === "UNDERDOG") {
      probSun += 0.05;
      probDeath += 0.05;
      probKnight = 0; // Đội yếu thế không bao giờ dính lá xóa 1/2 điểm
      probEmperor = Math.max(0.02, probEmperor - 0.05);
      probFool = Math.max(0.05, 1 - (probSun + probDeath + probEmperor));
    } else if (riskTier === "DOMINANT") {
      probSun = Math.max(0.15, probSun - 0.05);
      probDeath = Math.max(0.10, probDeath - 0.05);
      probEmperor += 0.05;
      probKnight += 0.05;
    }

    if (hasSunMagnet) {
      probSun += 0.05;
      probEmperor = Math.max(0, probEmperor - 0.05);
    }

    const tSun = probSun;
    const tDeath = tSun + probDeath;
    const tFool = tDeath + probFool;
    const tEmperor = tFool + probEmperor;

    if (rand < tSun) {
      // ☀️ 1. MẶT TRỜI: Điềm lành. Nhận trọn vẹn điểm câu hiện tại an toàn.
      drawnCard = {
        key: "THE_SUN",
        nameVi: hasSunMagnet ? "Mặt Trời (Nam Châm)" : (riskTier === "UNDERDOG" ? "Mặt Trời (Trợ Lực)" : "Mặt Trời"),
        nameEn: "The Sun",
        icon: "☀️",
        roman: "XIX",
        group: "COMMON",
        scoreDelta: basePoints,
      };
    } else if (rand < tDeath) {
      // 💀 2. THẦN CHẾT CƯỚP ĐIỂM: Cướp basePoints * 2 từ Top 1 đối thủ
      let top1Team: MysteryTeamRef | undefined = undefined;
      if (otherTeams.length > 0) {
        const maxScore = Math.max(...otherTeams.map((t) => t.score || 0));
        const topCandidates = otherTeams.filter((t) => (t.score || 0) === maxScore);
        top1Team = topCandidates[Math.floor(Math.random() * topCandidates.length)];
      }
      const stolen = basePoints * 2;
      drawnCard = {
        key: "THE_DEATH",
        nameVi: riskTier === "UNDERDOG" ? "Thần Chết (Lật Kèo)" : "Thần Chết (Cướp Điểm)",
        nameEn: "Death",
        icon: "💀",
        roman: "XIII",
        group: "CRITICAL",
        deathSubtype: "STEAL_TOP1",
        scoreDelta: stolen,
        stolenPoints: stolen,
        victimTeamId: top1Team?.id,
        victimTeamName: top1Team?.name,
      };
    } else if (rand < tFool) {
      // 🃏 3. KẺ KHỜ: Điềm dữ. Mất sạch điểm tích lũy câu này.
      drawnCard = {
        key: "THE_FOOL",
        nameVi: "Kẻ Khờ",
        nameEn: "The Fool",
        icon: "🃏",
        roman: "0",
        group: "COMMON",
        scoreDelta: 0,
      };
    } else if (rand < tEmperor) {
      // 👑 4. HOÀNG ĐẾ: Quyền lực hắc ám. Trừ điểm tổng chia đều cho các đội còn lại.
      const darkOutcome = resolveBombOutcome({
        bombType: "BOMB_DARK",
        team,
        allTeams,
        storyDescription: "Hoàng Đế uy quyền hắc ám! Rút cạn điểm số phân chia cho các đối thủ!",
        baseQuestionPoints: basePoints,
        isSurvivalPenalty: false,
      });
      drawnCard = {
        key: "THE_EMPEROR",
        nameVi: riskTier === "DOMINANT" ? "Hoàng Đế (Chia Điểm)" : "Hoàng Đế",
        nameEn: "The Emperor",
        icon: "👑",
        roman: "IV",
        group: "MUTATION",
        scoreDelta: -darkOutcome.penalty,
        darkBombRecipients: darkOutcome.darkBombRecipients,
      };
    } else {
      // 🗡️ 5. HIỆP SĨ: Định mệnh trừng phạt. Bị bay mất 1/2 tổng điểm hiện có (xóa sổ).
      const penalty = roundToMultipleOfFive(currentScore * 0.5);
      drawnCard = {
        key: "THE_KNIGHT",
        nameVi: "Hiệp Sĩ",
        nameEn: "The Knight",
        icon: "🗡️",
        roman: "VII",
        group: "MUTATION",
        scoreDelta: -penalty,
      };
    }
  }

  // Handle Shield absorption if negative card
  const isNegative =
    drawnCard.key === "THE_FOOL" ||
    drawnCard.key === "THE_EMPEROR" ||
    drawnCard.key === "THE_KNIGHT" ||
    (drawnCard.key === "THE_DEATH" && drawnCard.deathSubtype === "GIFT_TOP1");

  if (state.hasShield && isNegative) {
    state.hasShield = false;
    state.potPoints = 0;
    state.phase = "TURN_SUMMARY";
    state.turnFinishedReason = "TAROT_DRAWN";
    state.tarotState = {
      ...(state.tarotState || {}),
      drawnCard,
      isDrawn: true,
    };
    const oldScore = currentScore;
    const newScore = oldScore + basePoints;
    state.storyResult = {
      teamId: team.id,
      teamName: team.name,
      teamColor: team.color || "#ef4444",
      rewardText: `🛡️ KHIÊN THẦN ĐÃ HẤP THỤ ĐỊNH MỆNH XẤU (${drawnCard.nameVi})! Nhận trọn vẹn +${basePoints}đ câu hỏi gốc!`,
      scoreDelta: basePoints,
      oldScore,
      newScore,
    };
    const scoreDeltas = [{ teamId: team.id, delta: basePoints }];
    return {
      updatedState: { ...state },
      finalScoreDelta: basePoints,
      isBomb: false,
      scorePenalty: 0,
      drawnCard,
      scoreDeltas,
    };
  }

  // Resolve score changes for the drawing team
  state.potPoints = 0;
  state.phase = "TURN_SUMMARY";
  state.turnFinishedReason = "TAROT_DRAWN";
  state.tarotState = {
    ...(state.tarotState || {}),
    drawnCard,
    isDrawn: true,
  };

  let finalScoreDelta = 0;
  let scorePenalty = 0;
  let rewardText = "";

  switch (drawnCard.key) {
    case "THE_PEACE":
      finalScoreDelta = 0;
      state.turnFinishedReason = "SURVIVAL_ESCAPE";
      rewardText = "🕊️ BÌNH YÊN THOÁT NẠN: Thoát hiểm ngoạn mục! Bảo toàn nguyên vẹn điểm số và tim!";
      break;

    case "THE_SUN":
      finalScoreDelta = basePoints;
      rewardText = `☀️ MẶT TRỜI QUANG MINH: Điềm lành tuyệt đối! Nhận trọn vẹn +${basePoints}đ an toàn!`;
      break;

    case "THE_FOOL":
      if (state.isPenaltySurvivalMode) {
        scorePenalty = Math.abs(drawnCard.scoreDelta);
        finalScoreDelta = -scorePenalty;
        state.turnFinishedReason = "SURVIVAL_FAILED";
        rewardText = `🃏 KẺ KHỜ (KHÓI ĐỘC SINH TỬ): Chế độ Sinh Tử phạt trừ 50% điểm gốc câu hỏi (-${scorePenalty}đ)!`;
      } else {
        finalScoreDelta = 0;
        rewardText = `🃏 KẺ KHỜ: Điềm dữ! Mất toàn bộ điểm câu hiện tại (0đ). Tổng điểm giữ nguyên.`;
      }
      break;

    case "THE_EMPEROR": {
      scorePenalty = Math.abs(drawnCard.scoreDelta);
      finalScoreDelta = -scorePenalty;
      const recNames = (drawnCard.darkBombRecipients || []).map((r) => `${r.teamName} (+${r.points}đ)`).join(", ");
      if (scorePenalty > 0 && recNames) {
        rewardText = `👑 HOÀNG ĐẾ: Quyền lực hắc ám trừ ${scorePenalty}đ phân chia cho đối thủ: ${recNames}!`;
      } else if (scorePenalty > 0) {
        rewardText = `👑 HOÀNG ĐẾ: Quyền lực hắc ám trừ ${scorePenalty}đ!`;
      } else {
        rewardText = `👑 HOÀNG ĐẾ: Điểm số hiện tại là 0đ nên không bị trừ điểm và không phân chia cho đối thủ!`;
      }
      break;
    }

    case "THE_KNIGHT":
      scorePenalty = Math.abs(drawnCard.scoreDelta);
      finalScoreDelta = -scorePenalty;
      rewardText = `🗡️ HIỆP SĨ: Định mệnh trừng phạt xóa sổ 1/2 tổng điểm hiện có (-${scorePenalty}đ)!`;
      break;

    case "THE_DEATH":
      if (drawnCard.deathSubtype === "GIFT_TOP1") {
        scorePenalty = Math.abs(drawnCard.scoreDelta);
        finalScoreDelta = -scorePenalty;
        rewardText = `💀 THẦN CHẾT (HIẾN TẾ): Bị phạt theo phương án thấp hơn (-${scorePenalty}đ) chuyển tặng trọn gói cho Top 1 (${drawnCard.victimTeamName || "Đối thủ"})!`;
      } else {
        finalScoreDelta = drawnCard.stolenPoints || (basePoints * 2);
        rewardText = `💀 THẦN CHẾT (ĐOẠT MỆNH): Hút sạch +${finalScoreDelta}đ từ Top 1 (${drawnCard.victimTeamName || "Đối thủ"}) cộng thẳng vào điểm của bạn!`;
      }
      break;
  }

  const oldScore = currentScore;
  const newScore = Math.max(0, oldScore + finalScoreDelta);
  state.storyResult = {
    teamId: team.id,
    teamName: team.name,
    teamColor: team.color || "#ef4444",
    rewardText,
    scoreDelta: finalScoreDelta,
    oldScore,
    newScore,
  };

  const scoreDeltas: Array<{ teamId: string; delta: number }> = [];
  if (finalScoreDelta !== 0) {
    scoreDeltas.push({ teamId: team.id, delta: finalScoreDelta });
  }
  if (drawnCard.victimTeamId) {
    if (drawnCard.stolenPoints && drawnCard.stolenPoints > 0) {
      scoreDeltas.push({ teamId: drawnCard.victimTeamId, delta: -drawnCard.stolenPoints });
    } else if (drawnCard.giftedPoints && drawnCard.giftedPoints > 0) {
      scoreDeltas.push({ teamId: drawnCard.victimTeamId, delta: drawnCard.giftedPoints });
    }
  }
  if (drawnCard.darkBombRecipients) {
    for (const rec of drawnCard.darkBombRecipients) {
      if (rec.points > 0) {
        scoreDeltas.push({ teamId: rec.teamId, delta: rec.points });
      }
    }
  }

  return {
    updatedState: { ...state },
    finalScoreDelta,
    isBomb: scorePenalty > 0,
    scorePenalty,
    victimTeamId: drawnCard.victimTeamId,
    victimTeamName: drawnCard.victimTeamName,
    stolenPoints: drawnCard.stolenPoints,
    giftedPoints: drawnCard.giftedPoints,
    darkBombRecipients: drawnCard.darkBombRecipients,
    drawnCard,
    scoreDeltas,
  };
}

/**
 * Danh sách 20 nan quạt Round 1 (85% Tích cực, 15% Rủi ro):
 * - ☀️ Mặt Trời (Sun): 11 ô (55%)
 * - 💀 Thần Chết Cướp Điểm (Death - Steal): 6 ô (30%)
 * - 🃏 Kẻ Khờ (Fool): 2 ô (10%)
 * - 👑 Hoàng Đế (Emperor): 1 ô (5%)
 * - 🗡️ Hiệp Sĩ (Knight): 0 ô (0%)
 */
export const TAROT_WHEEL_SEGMENTS_ROUND_1: TarotWheelSegment[] = [
  { index: 0, key: "THE_SUN", nameVi: "Mặt Trời (The Sun)", nameEn: "The Sun", icon: "☀️", roman: "XIX", group: "COMMON", bgColor: "#78350f", borderColor: "#f59e0b", textColor: "#fef08a" },
  { index: 1, key: "THE_EMPEROR", nameVi: "Hoàng Đế (The Emperor)", nameEn: "The Emperor", icon: "👑", roman: "IV", group: "MUTATION", bgColor: "#7c2d12", borderColor: "#f97316", textColor: "#fed7aa" },
  { index: 2, key: "THE_SUN", nameVi: "Mặt Trời (The Sun)", nameEn: "The Sun", icon: "☀️", roman: "XIX", group: "COMMON", bgColor: "#78350f", borderColor: "#f59e0b", textColor: "#fef08a" },
  { index: 3, key: "THE_DEATH", nameVi: "Thần Chết (Cướp Điểm)", nameEn: "Death", icon: "💀", roman: "XIII", group: "CRITICAL", deathSubtype: "STEAL_TOP1", bgColor: "#064e3b", borderColor: "#10b981", textColor: "#a7f3d0" },
  { index: 4, key: "THE_SUN", nameVi: "Mặt Trời (The Sun)", nameEn: "The Sun", icon: "☀️", roman: "XIX", group: "COMMON", bgColor: "#78350f", borderColor: "#f59e0b", textColor: "#fef08a" },
  { index: 5, key: "THE_FOOL", nameVi: "Kẻ Khờ (The Fool)", nameEn: "The Fool", icon: "🃏", roman: "0", group: "COMMON", bgColor: "#4c1d95", borderColor: "#a855f7", textColor: "#f3e8ff" },
  { index: 6, key: "THE_SUN", nameVi: "Mặt Trời (The Sun)", nameEn: "The Sun", icon: "☀️", roman: "XIX", group: "COMMON", bgColor: "#78350f", borderColor: "#f59e0b", textColor: "#fef08a" },
  { index: 7, key: "THE_DEATH", nameVi: "Thần Chết (Cướp Điểm)", nameEn: "Death", icon: "💀", roman: "XIII", group: "CRITICAL", deathSubtype: "STEAL_TOP1", bgColor: "#064e3b", borderColor: "#10b981", textColor: "#a7f3d0" },
  { index: 8, key: "THE_SUN", nameVi: "Mặt Trời (The Sun)", nameEn: "The Sun", icon: "☀️", roman: "XIX", group: "COMMON", bgColor: "#78350f", borderColor: "#f59e0b", textColor: "#fef08a" },
  { index: 9, key: "THE_DEATH", nameVi: "Thần Chết (Cướp Điểm)", nameEn: "Death", icon: "💀", roman: "XIII", group: "CRITICAL", deathSubtype: "STEAL_TOP1", bgColor: "#064e3b", borderColor: "#10b981", textColor: "#a7f3d0" },
  { index: 10, key: "THE_SUN", nameVi: "Mặt Trời (The Sun)", nameEn: "The Sun", icon: "☀️", roman: "XIX", group: "COMMON", bgColor: "#78350f", borderColor: "#f59e0b", textColor: "#fef08a" },
  { index: 11, key: "THE_DEATH", nameVi: "Thần Chết (Cướp Điểm)", nameEn: "Death", icon: "💀", roman: "XIII", group: "CRITICAL", deathSubtype: "STEAL_TOP1", bgColor: "#064e3b", borderColor: "#10b981", textColor: "#a7f3d0" },
  { index: 12, key: "THE_SUN", nameVi: "Mặt Trời (The Sun)", nameEn: "The Sun", icon: "☀️", roman: "XIX", group: "COMMON", bgColor: "#78350f", borderColor: "#f59e0b", textColor: "#fef08a" },
  { index: 13, key: "THE_FOOL", nameVi: "Kẻ Khờ (The Fool)", nameEn: "The Fool", icon: "🃏", roman: "0", group: "COMMON", bgColor: "#4c1d95", borderColor: "#a855f7", textColor: "#f3e8ff" },
  { index: 14, key: "THE_SUN", nameVi: "Mặt Trời (The Sun)", nameEn: "The Sun", icon: "☀️", roman: "XIX", group: "COMMON", bgColor: "#78350f", borderColor: "#f59e0b", textColor: "#fef08a" },
  { index: 15, key: "THE_DEATH", nameVi: "Thần Chết (Cướp Điểm)", nameEn: "Death", icon: "💀", roman: "XIII", group: "CRITICAL", deathSubtype: "STEAL_TOP1", bgColor: "#064e3b", borderColor: "#10b981", textColor: "#a7f3d0" },
  { index: 16, key: "THE_SUN", nameVi: "Mặt Trời (The Sun)", nameEn: "The Sun", icon: "☀️", roman: "XIX", group: "COMMON", bgColor: "#78350f", borderColor: "#f59e0b", textColor: "#fef08a" },
  { index: 17, key: "THE_DEATH", nameVi: "Thần Chết (Cướp Điểm)", nameEn: "Death", icon: "💀", roman: "XIII", group: "CRITICAL", deathSubtype: "STEAL_TOP1", bgColor: "#064e3b", borderColor: "#10b981", textColor: "#a7f3d0" },
  { index: 18, key: "THE_SUN", nameVi: "Mặt Trời (The Sun)", nameEn: "The Sun", icon: "☀️", roman: "XIX", group: "COMMON", bgColor: "#78350f", borderColor: "#f59e0b", textColor: "#fef08a" },
  { index: 19, key: "THE_SUN", nameVi: "Mặt Trời (The Sun)", nameEn: "The Sun", icon: "☀️", roman: "XIX", group: "COMMON", bgColor: "#78350f", borderColor: "#f59e0b", textColor: "#fef08a" },
];

/**
 * Danh sách 20 nan quạt Round 2 (70% Tích cực, 30% Rủi ro):
 * - ☀️ Mặt Trời (Sun): 9 ô (45%)
 * - 💀 Thần Chết Cướp Điểm (Death - Steal): 5 ô (25%)
 * - 🃏 Kẻ Khờ (Fool): 3 ô (15%)
 * - 👑 Hoàng Đế (Emperor): 2 ô (10%)
 * - 🗡️ Hiệp Sĩ (Knight): 1 ô (5%)
 */
export const TAROT_WHEEL_SEGMENTS_ROUND_2: TarotWheelSegment[] = [
  { index: 0, key: "THE_SUN", nameVi: "Mặt Trời (The Sun)", nameEn: "The Sun", icon: "☀️", roman: "XIX", group: "COMMON", bgColor: "#78350f", borderColor: "#f59e0b", textColor: "#fef08a" },
  { index: 1, key: "THE_EMPEROR", nameVi: "Hoàng Đế (The Emperor)", nameEn: "The Emperor", icon: "👑", roman: "IV", group: "MUTATION", bgColor: "#7c2d12", borderColor: "#f97316", textColor: "#fed7aa" },
  { index: 2, key: "THE_SUN", nameVi: "Mặt Trời (The Sun)", nameEn: "The Sun", icon: "☀️", roman: "XIX", group: "COMMON", bgColor: "#78350f", borderColor: "#f59e0b", textColor: "#fef08a" },
  { index: 3, key: "THE_FOOL", nameVi: "Kẻ Khờ (The Fool)", nameEn: "The Fool", icon: "🃏", roman: "0", group: "COMMON", bgColor: "#4c1d95", borderColor: "#a855f7", textColor: "#f3e8ff" },
  { index: 4, key: "THE_SUN", nameVi: "Mặt Trời (The Sun)", nameEn: "The Sun", icon: "☀️", roman: "XIX", group: "COMMON", bgColor: "#78350f", borderColor: "#f59e0b", textColor: "#fef08a" },
  { index: 5, key: "THE_DEATH", nameVi: "Thần Chết (Cướp Điểm)", nameEn: "Death", icon: "💀", roman: "XIII", group: "CRITICAL", deathSubtype: "STEAL_TOP1", bgColor: "#064e3b", borderColor: "#10b981", textColor: "#a7f3d0" },
  { index: 6, key: "THE_SUN", nameVi: "Mặt Trời (The Sun)", nameEn: "The Sun", icon: "☀️", roman: "XIX", group: "COMMON", bgColor: "#78350f", borderColor: "#f59e0b", textColor: "#fef08a" },
  { index: 7, key: "THE_KNIGHT", nameVi: "Hiệp Sĩ (The Knight)", nameEn: "The Knight", icon: "🗡️", roman: "VII", group: "MUTATION", bgColor: "#1e1b4b", borderColor: "#6366f1", textColor: "#c7d2fe" },
  { index: 8, key: "THE_SUN", nameVi: "Mặt Trời (The Sun)", nameEn: "The Sun", icon: "☀️", roman: "XIX", group: "COMMON", bgColor: "#78350f", borderColor: "#f59e0b", textColor: "#fef08a" },
  { index: 9, key: "THE_DEATH", nameVi: "Thần Chết (Cướp Điểm)", nameEn: "Death", icon: "💀", roman: "XIII", group: "CRITICAL", deathSubtype: "STEAL_TOP1", bgColor: "#064e3b", borderColor: "#10b981", textColor: "#a7f3d0" },
  { index: 10, key: "THE_SUN", nameVi: "Mặt Trời (The Sun)", nameEn: "The Sun", icon: "☀️", roman: "XIX", group: "COMMON", bgColor: "#78350f", borderColor: "#f59e0b", textColor: "#fef08a" },
  { index: 11, key: "THE_FOOL", nameVi: "Kẻ Khờ (The Fool)", nameEn: "The Fool", icon: "🃏", roman: "0", group: "COMMON", bgColor: "#4c1d95", borderColor: "#a855f7", textColor: "#f3e8ff" },
  { index: 12, key: "THE_SUN", nameVi: "Mặt Trời (The Sun)", nameEn: "The Sun", icon: "☀️", roman: "XIX", group: "COMMON", bgColor: "#78350f", borderColor: "#f59e0b", textColor: "#fef08a" },
  { index: 13, key: "THE_DEATH", nameVi: "Thần Chết (Cướp Điểm)", nameEn: "Death", icon: "💀", roman: "XIII", group: "CRITICAL", deathSubtype: "STEAL_TOP1", bgColor: "#064e3b", borderColor: "#10b981", textColor: "#a7f3d0" },
  { index: 14, key: "THE_SUN", nameVi: "Mặt Trời (The Sun)", nameEn: "The Sun", icon: "☀️", roman: "XIX", group: "COMMON", bgColor: "#78350f", borderColor: "#f59e0b", textColor: "#fef08a" },
  { index: 15, key: "THE_EMPEROR", nameVi: "Hoàng Đế (The Emperor)", nameEn: "The Emperor", icon: "👑", roman: "IV", group: "MUTATION", bgColor: "#7c2d12", borderColor: "#f97316", textColor: "#fed7aa" },
  { index: 16, key: "THE_SUN", nameVi: "Mặt Trời (The Sun)", nameEn: "The Sun", icon: "☀️", roman: "XIX", group: "COMMON", bgColor: "#78350f", borderColor: "#f59e0b", textColor: "#fef08a" },
  { index: 17, key: "THE_FOOL", nameVi: "Kẻ Khờ (The Fool)", nameEn: "The Fool", icon: "🃏", roman: "0", group: "COMMON", bgColor: "#4c1d95", borderColor: "#a855f7", textColor: "#f3e8ff" },
  { index: 18, key: "THE_DEATH", nameVi: "Thần Chết (Cướp Điểm)", nameEn: "Death", icon: "💀", roman: "XIII", group: "CRITICAL", deathSubtype: "STEAL_TOP1", bgColor: "#064e3b", borderColor: "#10b981", textColor: "#a7f3d0" },
  { index: 19, key: "THE_DEATH", nameVi: "Thần Chết (Cướp Điểm)", nameEn: "Death", icon: "💀", roman: "XIII", group: "CRITICAL", deathSubtype: "STEAL_TOP1", bgColor: "#064e3b", borderColor: "#10b981", textColor: "#a7f3d0" },
];

/**
 * Danh sách 20 nan quạt trên Vòng Quay Tarot Định Mệnh (Mức gốc Round 3+):
 * - ☀️ Mặt Trời (Sun): 7 ô (35%)
 * - 💀 Thần Chết Cướp Điểm (Death - Steal): 5 ô (25%)
 * - 🃏 Kẻ Khờ (Fool): 3 ô (15%)
 * - 👑 Hoàng Đế (Emperor): 3 ô (15%)
 * - 🗡️ Hiệp Sĩ (Knight): 2 ô (10%)
 * Tổng cộng: 20 ô (100%), 60% Tích cực, 40% Rủi ro.
 */
export const TAROT_WHEEL_SEGMENTS: TarotWheelSegment[] = [
  { index: 0, key: "THE_SUN", nameVi: "Mặt Trời (The Sun)", nameEn: "The Sun", icon: "☀️", roman: "XIX", group: "COMMON", bgColor: "#78350f", borderColor: "#f59e0b", textColor: "#fef08a" },
  { index: 1, key: "THE_EMPEROR", nameVi: "Hoàng Đế (The Emperor)", nameEn: "The Emperor", icon: "👑", roman: "IV", group: "MUTATION", bgColor: "#7c2d12", borderColor: "#f97316", textColor: "#fed7aa" },
  { index: 2, key: "THE_FOOL", nameVi: "Kẻ Khờ (The Fool)", nameEn: "The Fool", icon: "🃏", roman: "0", group: "COMMON", bgColor: "#4c1d95", borderColor: "#a855f7", textColor: "#f3e8ff" },
  { index: 3, key: "THE_KNIGHT", nameVi: "Hiệp Sĩ (The Knight)", nameEn: "The Knight", icon: "🗡️", roman: "VII", group: "MUTATION", bgColor: "#1e1b4b", borderColor: "#6366f1", textColor: "#c7d2fe" },
  { index: 4, key: "THE_SUN", nameVi: "Mặt Trời (The Sun)", nameEn: "The Sun", icon: "☀️", roman: "XIX", group: "COMMON", bgColor: "#78350f", borderColor: "#f59e0b", textColor: "#fef08a" },
  { index: 5, key: "THE_DEATH", nameVi: "Thần Chết (Cướp Điểm)", nameEn: "Death", icon: "💀", roman: "XIII", group: "CRITICAL", deathSubtype: "STEAL_TOP1", bgColor: "#064e3b", borderColor: "#10b981", textColor: "#a7f3d0" },
  { index: 6, key: "THE_EMPEROR", nameVi: "Hoàng Đế (The Emperor)", nameEn: "The Emperor", icon: "👑", roman: "IV", group: "MUTATION", bgColor: "#7c2d12", borderColor: "#f97316", textColor: "#fed7aa" },
  { index: 7, key: "THE_SUN", nameVi: "Mặt Trời (The Sun)", nameEn: "The Sun", icon: "☀️", roman: "XIX", group: "COMMON", bgColor: "#78350f", borderColor: "#f59e0b", textColor: "#fef08a" },
  { index: 8, key: "THE_DEATH", nameVi: "Thần Chết (Cướp Điểm)", nameEn: "Death", icon: "💀", roman: "XIII", group: "CRITICAL", deathSubtype: "STEAL_TOP1", bgColor: "#064e3b", borderColor: "#10b981", textColor: "#a7f3d0" },
  { index: 9, key: "THE_FOOL", nameVi: "Kẻ Khờ (The Fool)", nameEn: "The Fool", icon: "🃏", roman: "0", group: "COMMON", bgColor: "#4c1d95", borderColor: "#a855f7", textColor: "#f3e8ff" },
  { index: 10, key: "THE_EMPEROR", nameVi: "Hoàng Đế (The Emperor)", nameEn: "The Emperor", icon: "👑", roman: "IV", group: "MUTATION", bgColor: "#7c2d12", borderColor: "#f97316", textColor: "#fed7aa" },
  { index: 11, key: "THE_KNIGHT", nameVi: "Hiệp Sĩ (The Knight)", nameEn: "The Knight", icon: "🗡️", roman: "VII", group: "MUTATION", bgColor: "#1e1b4b", borderColor: "#6366f1", textColor: "#c7d2fe" },
  { index: 12, key: "THE_SUN", nameVi: "Mặt Trời (The Sun)", nameEn: "The Sun", icon: "☀️", roman: "XIX", group: "COMMON", bgColor: "#78350f", borderColor: "#f59e0b", textColor: "#fef08a" },
  { index: 13, key: "THE_DEATH", nameVi: "Thần Chết (Cướp Điểm)", nameEn: "Death", icon: "💀", roman: "XIII", group: "CRITICAL", deathSubtype: "STEAL_TOP1", bgColor: "#064e3b", borderColor: "#10b981", textColor: "#a7f3d0" },
  { index: 14, key: "THE_SUN", nameVi: "Mặt Trời (The Sun)", nameEn: "The Sun", icon: "☀️", roman: "XIX", group: "COMMON", bgColor: "#78350f", borderColor: "#f59e0b", textColor: "#fef08a" },
  { index: 15, key: "THE_SUN", nameVi: "Mặt Trời (The Sun)", nameEn: "The Sun", icon: "☀️", roman: "XIX", group: "COMMON", bgColor: "#78350f", borderColor: "#f59e0b", textColor: "#fef08a" },
  { index: 16, key: "THE_DEATH", nameVi: "Thần Chết (Cướp Điểm)", nameEn: "Death", icon: "💀", roman: "XIII", group: "CRITICAL", deathSubtype: "STEAL_TOP1", bgColor: "#064e3b", borderColor: "#10b981", textColor: "#a7f3d0" },
  { index: 17, key: "THE_FOOL", nameVi: "Kẻ Khờ (The Fool)", nameEn: "The Fool", icon: "🃏", roman: "0", group: "COMMON", bgColor: "#4c1d95", borderColor: "#a855f7", textColor: "#f3e8ff" },
  { index: 18, key: "THE_SUN", nameVi: "Mặt Trời (The Sun)", nameEn: "The Sun", icon: "☀️", roman: "XIX", group: "COMMON", bgColor: "#78350f", borderColor: "#f59e0b", textColor: "#fef08a" },
  { index: 19, key: "THE_DEATH", nameVi: "Thần Chết (Cướp Điểm)", nameEn: "Death", icon: "💀", roman: "XIII", group: "CRITICAL", deathSubtype: "STEAL_TOP1", bgColor: "#064e3b", borderColor: "#10b981", textColor: "#a7f3d0" },
];

/**
 * Danh sách 20 nan quạt trên Vòng Quay Tarot Chế Độ Sinh Tử:
 * - Chính xác 20% = 4 ô Bình Yên Thoát Nạn 🕊️ (index 0, 5, 10, 15)
 * - Chính xác 80% = 16 ô Bẫy / Phạt:
 *   * 4 ô Hiệp Sĩ (20% - index 1, 6, 11, 16): -50% tổng điểm
 *   * 4 ô Hoàng Đế (20% - index 2, 7, 12, 17): Bom Hắc Ám
 *   * 4 ô Thần Chết Tặng (20% - index 3, 8, 13, 18): Bom Từ Thiện
 *   * 4 ô Kẻ Khờ Sinh Tử (20% - index 4, 9, 14, 19): -50% điểm gốc câu hỏi
 * - Tuyệt đối 0% ô cộng điểm (không có Mặt Trời, không có Thần Chết Cướp Điểm)
 */
export const TAROT_SURVIVAL_WHEEL_SEGMENTS: TarotWheelSegment[] = [
  { index: 0, key: "THE_PEACE", nameVi: "Bình Yên Thoát Nạn", nameEn: "The Peace", icon: "🕊️", roman: "XXI", group: "COMMON", bgColor: "#064e3b", borderColor: "#10b981", textColor: "#a7f3d0" },
  { index: 1, key: "THE_KNIGHT", nameVi: "Hiệp Sĩ (The Knight)", nameEn: "The Knight", icon: "🗡️", roman: "VII", group: "MUTATION", bgColor: "#1e1b4b", borderColor: "#6366f1", textColor: "#c7d2fe" },
  { index: 2, key: "THE_EMPEROR", nameVi: "Hoàng Đế (The Emperor)", nameEn: "The Emperor", icon: "👑", roman: "IV", group: "MUTATION", bgColor: "#7c2d12", borderColor: "#f97316", textColor: "#fed7aa" },
  { index: 3, key: "THE_DEATH", nameVi: "Thần Chết (Tặng Điểm)", nameEn: "Death", icon: "💀", roman: "XIII", group: "CRITICAL", deathSubtype: "GIFT_TOP1", bgColor: "#881337", borderColor: "#f43f5e", textColor: "#fecdd3" },
  { index: 4, key: "THE_FOOL", nameVi: "Kẻ Khờ (Khói Độc)", nameEn: "The Fool", icon: "🃏", roman: "0", group: "COMMON", bgColor: "#4c1d95", borderColor: "#a855f7", textColor: "#f3e8ff" },
  { index: 5, key: "THE_PEACE", nameVi: "Bình Yên Thoát Nạn", nameEn: "The Peace", icon: "🕊️", roman: "XXI", group: "COMMON", bgColor: "#064e3b", borderColor: "#10b981", textColor: "#a7f3d0" },
  { index: 6, key: "THE_KNIGHT", nameVi: "Hiệp Sĩ (The Knight)", nameEn: "The Knight", icon: "🗡️", roman: "VII", group: "MUTATION", bgColor: "#1e1b4b", borderColor: "#6366f1", textColor: "#c7d2fe" },
  { index: 7, key: "THE_EMPEROR", nameVi: "Hoàng Đế (The Emperor)", nameEn: "The Emperor", icon: "👑", roman: "IV", group: "MUTATION", bgColor: "#7c2d12", borderColor: "#f97316", textColor: "#fed7aa" },
  { index: 8, key: "THE_DEATH", nameVi: "Thần Chết (Tặng Điểm)", nameEn: "Death", icon: "💀", roman: "XIII", group: "CRITICAL", deathSubtype: "GIFT_TOP1", bgColor: "#881337", borderColor: "#f43f5e", textColor: "#fecdd3" },
  { index: 9, key: "THE_FOOL", nameVi: "Kẻ Khờ (Khói Độc)", nameEn: "The Fool", icon: "🃏", roman: "0", group: "COMMON", bgColor: "#4c1d95", borderColor: "#a855f7", textColor: "#f3e8ff" },
  { index: 10, key: "THE_PEACE", nameVi: "Bình Yên Thoát Nạn", nameEn: "The Peace", icon: "🕊️", roman: "XXI", group: "COMMON", bgColor: "#064e3b", borderColor: "#10b981", textColor: "#a7f3d0" },
  { index: 11, key: "THE_KNIGHT", nameVi: "Hiệp Sĩ (The Knight)", nameEn: "The Knight", icon: "🗡️", roman: "VII", group: "MUTATION", bgColor: "#1e1b4b", borderColor: "#6366f1", textColor: "#c7d2fe" },
  { index: 12, key: "THE_EMPEROR", nameVi: "Hoàng Đế (The Emperor)", nameEn: "The Emperor", icon: "👑", roman: "IV", group: "MUTATION", bgColor: "#7c2d12", borderColor: "#f97316", textColor: "#fed7aa" },
  { index: 13, key: "THE_DEATH", nameVi: "Thần Chết (Tặng Điểm)", nameEn: "Death", icon: "💀", roman: "XIII", group: "CRITICAL", deathSubtype: "GIFT_TOP1", bgColor: "#881337", borderColor: "#f43f5e", textColor: "#fecdd3" },
  { index: 14, key: "THE_FOOL", nameVi: "Kẻ Khờ (Khói Độc)", nameEn: "The Fool", icon: "🃏", roman: "0", group: "COMMON", bgColor: "#4c1d95", borderColor: "#a855f7", textColor: "#f3e8ff" },
  { index: 15, key: "THE_PEACE", nameVi: "Bình Yên Thoát Nạn", nameEn: "The Peace", icon: "🕊️", roman: "XXI", group: "COMMON", bgColor: "#064e3b", borderColor: "#10b981", textColor: "#a7f3d0" },
  { index: 16, key: "THE_KNIGHT", nameVi: "Hiệp Sĩ (The Knight)", nameEn: "The Knight", icon: "🗡️", roman: "VII", group: "MUTATION", bgColor: "#1e1b4b", borderColor: "#6366f1", textColor: "#c7d2fe" },
  { index: 17, key: "THE_EMPEROR", nameVi: "Hoàng Đế (The Emperor)", nameEn: "The Emperor", icon: "👑", roman: "IV", group: "MUTATION", bgColor: "#7c2d12", borderColor: "#f97316", textColor: "#fed7aa" },
  { index: 18, key: "THE_DEATH", nameVi: "Thần Chết (Tặng Điểm)", nameEn: "Death", icon: "💀", roman: "XIII", group: "CRITICAL", deathSubtype: "GIFT_TOP1", bgColor: "#881337", borderColor: "#f43f5e", textColor: "#fecdd3" },
  { index: 19, key: "THE_FOOL", nameVi: "Kẻ Khờ (Khói Độc)", nameEn: "The Fool", icon: "🃏", roman: "0", group: "COMMON", bgColor: "#4c1d95", borderColor: "#a855f7", textColor: "#f3e8ff" },
];

/**
 * Trả về danh sách 20 nan quạt có áp dụng hiệu ứng Perk (SUN_MAGNET_PROMO), Chế độ Sinh Tử,
 * và cơ chế cân bằng rủi ro động theo tình hình trận đấu (UNDERDOG / DOMINANT / NEUTRAL).
 */
export function getEffectiveTarotWheelSegments(
  hasSunMagnet: boolean = false,
  isSurvivalMode: boolean = false,
  options?: {
    riskTier?: TeamRiskTier;
    currentRound?: number;
    teamScore?: number;
  }
): TarotWheelSegment[] {
  if (isSurvivalMode) return TAROT_SURVIVAL_WHEEL_SEGMENTS;

  const riskTier = options?.riskTier ?? "NEUTRAL";
  const currentRound = options?.currentRound ?? 1;
  const baseSegments =
    currentRound <= 1
      ? TAROT_WHEEL_SEGMENTS_ROUND_1
      : currentRound === 2
      ? TAROT_WHEEL_SEGMENTS_ROUND_2
      : TAROT_WHEEL_SEGMENTS;
  let segments = [...baseSegments];

  // 1. Áp dụng Perk Nam Châm Mặt Trời (SUN_MAGNET_PROMO): Ô index 1 (Hoàng Đế) -> Mặt Trời Nam Châm (+5% Mặt Trời)
  if (hasSunMagnet) {
    segments = segments.map((seg) => {
      if (seg.index === 1) {
        return {
          ...seg,
          key: "THE_SUN" as const,
          nameVi: "Mặt Trời (Nam Châm)",
          nameEn: "The Sun (Magnet)",
          icon: "☀️",
          roman: "XIX",
          group: "COMMON" as const,
          bgColor: "#92400e",
          borderColor: "#fde047",
          textColor: "#ffffff",
          isMagnetized: true,
        };
      }
      return seg;
    });
  }

  // 2. Cơ chế cân bằng động (Dynamic Balancing) theo thế trận:
  // - Đội Yếu Thế (UNDERDOG): Đang bị dẫn điểm / chuỗi xui -> Tăng cơ hội gỡ điểm, giảm nguy cơ sập hầm:
  //   + Ô index 6 (Hoàng Đế) -> Mặt Trời (Trợ Lực) ☀️ (+5% Mặt Trời)
  //   + Ô index 11 (Hiệp Sĩ) -> Thần Chết (Lật Kèo) 💀 (+5% Cướp Điểm)
  if (riskTier === "UNDERDOG") {
    segments = segments.map((seg) => {
      if (seg.index === 6) {
        return {
          ...seg,
          key: "THE_SUN" as const,
          nameVi: "Mặt Trời (Trợ Lực)",
          nameEn: "The Sun (Aid)",
          icon: "☀️",
          roman: "XIX",
          group: "COMMON" as const,
          bgColor: "#78350f",
          borderColor: "#f59e0b",
          textColor: "#fef08a",
        };
      }
      if (seg.index === 11) {
        return {
          ...seg,
          key: "THE_DEATH" as const,
          nameVi: "Thần Chết (Lật Kèo)",
          nameEn: "Death (Reversal)",
          icon: "💀",
          roman: "XIII",
          group: "CRITICAL" as const,
          deathSubtype: "STEAL_TOP1" as const,
          bgColor: "#064e3b",
          borderColor: "#10b981",
          textColor: "#a7f3d0",
        };
      }
      return seg;
    });
  } else if (riskTier === "DOMINANT") {
    // - Đội Dẫn Đầu Áp Đảo (DOMINANT): Điểm số vượt trội -> Tăng kịch tính chia sẻ điểm số cho các đội sau:
    //   + Ô index 9 (Kẻ Khờ) -> Hoàng Đế (Chia Điểm) 👑 (+5% Hoàng Đế)
    segments = segments.map((seg) => {
      if (seg.index === 9) {
        return {
          ...seg,
          key: "THE_EMPEROR" as const,
          nameVi: "Hoàng Đế (Chia Điểm)",
          nameEn: "The Emperor (Share)",
          icon: "👑",
          roman: "IV",
          group: "MUTATION" as const,
          bgColor: "#7c2d12",
          borderColor: "#f97316",
          textColor: "#fed7aa",
        };
      }
      return seg;
    });
  }

  return segments;
}

/**
 * Tính toán góc quay vật lý và ô trúng thưởng dựa trên lực nạp (Power Percent 1-100%).
 */
export function calculateTarotWheelSpin({
  powerPercent,
  currentAngle = 0,
  hasSunMagnet = false,
  isSurvivalMode = false,
  options,
}: {
  powerPercent: number;
  currentAngle?: number;
  hasSunMagnet?: boolean;
  isSurvivalMode?: boolean;
  options?: {
    riskTier?: TeamRiskTier;
    currentRound?: number;
    teamScore?: number;
  };
}): {
  targetAngle: number;
  spinDurationMs: number;
  landedSegment: TarotWheelSegment;
  landedIndex: number;
} {
  const clampedPower = Math.max(1, Math.min(100, Math.round(powerPercent)));
  const baseTurns = 6;
  const extraAngle = Math.round((clampedPower / 100) * 1440);
  const jitter = Math.floor(Math.random() * 7) - 3;
  let totalDelta = baseTurns * 360 + extraAngle + jitter;

  let pointerAngle = (360 - ((currentAngle + totalDelta) % 360)) % 360;
  const remInSeg = pointerAngle % 18;
  if (remInSeg < 2) {
    totalDelta += 3;
  } else if (remInSeg > 16) {
    totalDelta -= 3;
  }

  const targetAngle = currentAngle + totalDelta;
  pointerAngle = (360 - (targetAngle % 360)) % 360;
  const landedIndex = Math.floor(pointerAngle / 18) % 20;
  const effectiveSegments = getEffectiveTarotWheelSegments(hasSunMagnet, isSurvivalMode, options);
  const landedSegment = effectiveSegments[landedIndex];
  const spinDurationMs = 4500 + Math.round((clampedPower / 100) * 1500);

  return {
    targetAngle,
    spinDurationMs,
    landedSegment,
    landedIndex,
  };
}

/**
 * Xử lý toàn bộ logic quay Vòng Quay Tarot Định Mệnh:
 * - Tính góc dừng vật lý theo lực nạp
 * - Xác định Thực Thể Cổ Xưa trúng thưởng
 * - Xử lý Khiên Thần, trừ/cộng điểm, cướp/tặng điểm Top 1, chia điểm Bom Hắc Ám
 */
export function handleAncientTarotSpinWheel({
  state,
  team,
  allTeams = [],
  powerPercent,
}: {
  state: MysteryQuestState;
  team: MysteryTeamRef;
  allTeams?: MysteryTeamRef[];
  powerPercent: number;
}): {
  updatedState: MysteryQuestState;
  finalScoreDelta: number;
  isBomb: boolean;
  scorePenalty: number;
  victimTeamId?: string;
  victimTeamName?: string;
  stolenPoints?: number;
  giftedPoints?: number;
  darkBombRecipients?: Array<{ teamId: string; teamName: string; points: number }>;
  drawnCard: AncientTarotDrawnCard;
  scoreDeltas: Array<{ teamId: string; delta: number }>;
  targetAngle: number;
  spinDurationMs: number;
  landedSegment: TarotWheelSegment;
  landedIndex: number;
} {
  const currentAngle = state.tarotState?.targetAngle || 0;
  const isSurvivalMode = !!state.isPenaltySurvivalMode;
  const hasSunMagnet = !isSurvivalMode && getPerkType(state.promoPerk) === "SUN_MAGNET_PROMO";
  const riskTier = evaluateTeamRiskTier({
    team,
    allTeams,
    currentRound: state.currentRound || 1,
  });
  const { targetAngle, spinDurationMs, landedSegment, landedIndex } = calculateTarotWheelSpin({
    powerPercent,
    currentAngle,
    hasSunMagnet,
    isSurvivalMode,
    options: { riskTier, currentRound: state.currentRound || 1, teamScore: team.score || 0 },
  });

  const basePoints = state.baseQuestionPoints || 10;
  const currentScore = team.score || 0;
  const otherTeams = (allTeams || []).filter((t) => t.id !== team.id && !t.isEliminated);

  let drawnCard: AncientTarotDrawnCard;

  switch (landedSegment.key) {
    case "THE_PEACE":
      drawnCard = {
        key: "THE_PEACE",
        nameVi: "Bình Yên Thoát Nạn",
        nameEn: "The Peace",
        icon: "🕊️",
        roman: "XXI",
        group: "COMMON",
        scoreDelta: 0,
      };
      break;

    case "THE_SUN":
      drawnCard = {
        key: "THE_SUN",
        nameVi: landedSegment.isMagnetized ? "Mặt Trời (Nam Châm)" : "Mặt Trời",
        nameEn: "The Sun",
        icon: "☀️",
        roman: "XIX",
        group: "COMMON",
        scoreDelta: basePoints,
      };
      break;

    case "THE_FOOL":
      if (isSurvivalMode) {
        const smokePenalty = roundToMultipleOfFive(basePoints * 0.5);
        drawnCard = {
          key: "THE_FOOL",
          nameVi: "Kẻ Khờ (Khói Độc Sinh Tử)",
          nameEn: "The Fool",
          icon: "🃏",
          roman: "0",
          group: "COMMON",
          scoreDelta: -smokePenalty,
        };
      } else {
        drawnCard = {
          key: "THE_FOOL",
          nameVi: "Kẻ Khờ",
          nameEn: "The Fool",
          icon: "🃏",
          roman: "0",
          group: "COMMON",
          scoreDelta: 0,
        };
      }
      break;

    case "THE_EMPEROR": {
      const darkOutcome = resolveBombOutcome({
        bombType: "BOMB_DARK",
        team,
        allTeams,
        storyDescription: "Hoàng Đế uy quyền hắc ám! Rút cạn điểm số phân chia cho các đối thủ!",
        baseQuestionPoints: basePoints,
        isSurvivalPenalty: false,
      });
      drawnCard = {
        key: "THE_EMPEROR",
        nameVi: "Hoàng Đế",
        nameEn: "The Emperor",
        icon: "👑",
        roman: "IV",
        group: "MUTATION",
        scoreDelta: -darkOutcome.penalty,
        darkBombRecipients: darkOutcome.darkBombRecipients,
      };
      break;
    }

    case "THE_KNIGHT": {
      const halfScore = roundToMultipleOfFive(currentScore * 0.5);
      drawnCard = {
        key: "THE_KNIGHT",
        nameVi: "Hiệp Sĩ",
        nameEn: "The Knight",
        icon: "🗡️",
        roman: "VII",
        group: "MUTATION",
        scoreDelta: -halfScore,
      };
      break;
    }

    case "THE_DEATH":
    default: {
      let top1Team: MysteryTeamRef | undefined = undefined;
      if (otherTeams.length > 0) {
        const maxScore = Math.max(...otherTeams.map((t) => t.score || 0));
        const topCandidates = otherTeams.filter((t) => (t.score || 0) === maxScore);
        top1Team = topCandidates[Math.floor(Math.random() * topCandidates.length)];
      }

      if (landedSegment.deathSubtype === "GIFT_TOP1") {
        const halfScore = roundToMultipleOfFive(currentScore * 0.5);
        const baseOneAndHalf = roundToMultipleOfFive(basePoints * 1.5);
        const targetPenalty = Math.min(halfScore, baseOneAndHalf);
        const gifted = currentScore > 0 ? Math.min(currentScore, targetPenalty) : 0;
        drawnCard = {
          key: "THE_DEATH",
          nameVi: "Thần Chết (Tặng Điểm)",
          nameEn: "Death",
          icon: "💀",
          roman: "XIII",
          group: "CRITICAL",
          deathSubtype: "GIFT_TOP1",
          scoreDelta: -gifted,
          giftedPoints: gifted,
          victimTeamId: top1Team?.id,
          victimTeamName: top1Team?.name,
        };
      } else {
        const stolen = basePoints * 2;
        drawnCard = {
          key: "THE_DEATH",
          nameVi: "Thần Chết (Cướp Điểm)",
          nameEn: "Death",
          icon: "💀",
          roman: "XIII",
          group: "CRITICAL",
          deathSubtype: "STEAL_TOP1",
          scoreDelta: stolen,
          stolenPoints: stolen,
          victimTeamId: top1Team?.id,
          victimTeamName: top1Team?.name,
        };
      }
      break;
    }
  }

  // Handle Shield absorption if negative card
  const isNegative =
    drawnCard.key === "THE_FOOL" ||
    drawnCard.key === "THE_EMPEROR" ||
    drawnCard.key === "THE_KNIGHT" ||
    (drawnCard.key === "THE_DEATH" && drawnCard.deathSubtype === "GIFT_TOP1");

  if (state.hasShield && isNegative && !isSurvivalMode) {
    state.hasShield = false;
    state.potPoints = 0;
    state.phase = "TURN_SUMMARY";
    state.turnFinishedReason = "TAROT_WHEEL_SPUN";
    state.tarotState = {
      ...(state.tarotState || {}),
      isWheelSpinning: false,
      wheelPower: Math.max(1, Math.min(100, Math.round(powerPercent))),
      targetAngle,
      spinDurationMs,
      selectedSegmentIndex: landedIndex,
      drawnCard,
      isDrawn: true,
    };
    const oldScore = currentScore;
    const newScore = oldScore + basePoints;
    state.storyResult = {
      teamId: team.id,
      teamName: team.name,
      teamColor: team.color || "#ef4444",
      rewardText: `🛡️ KHIÊN THẦN ĐÃ HẤP THỤ ĐỊNH MỆNH XẤU (${drawnCard.nameVi})! Nhận trọn vẹn +${basePoints}đ câu hỏi gốc!`,
      scoreDelta: basePoints,
      oldScore,
      newScore,
    };
    const scoreDeltas = [{ teamId: team.id, delta: basePoints }];
    return {
      updatedState: { ...state },
      finalScoreDelta: basePoints,
      isBomb: false,
      scorePenalty: 0,
      drawnCard,
      scoreDeltas,
      targetAngle,
      spinDurationMs,
      landedSegment,
      landedIndex,
    };
  }

  state.potPoints = 0;
  state.phase = "TURN_SUMMARY";
  state.turnFinishedReason = isSurvivalMode ? "SURVIVAL_FAILED" : "TAROT_WHEEL_SPUN";
  state.tarotState = {
    ...(state.tarotState || {}),
    isWheelSpinning: false,
    wheelPower: Math.max(1, Math.min(100, Math.round(powerPercent))),
    targetAngle,
    spinDurationMs,
    selectedSegmentIndex: landedIndex,
    drawnCard,
    isDrawn: true,
  };

  let finalScoreDelta = 0;
  let scorePenalty = 0;
  let rewardText = "";

  switch (drawnCard.key) {
    case "THE_PEACE":
      finalScoreDelta = 0;
      state.turnFinishedReason = "SURVIVAL_ESCAPE";
      rewardText = `🕊️ BÌNH YÊN THOÁT NẠN: May mắn thần kỳ! Bạn đã sống sót qua vòng quay Sinh Tử và bảo toàn nguyên vẹn số điểm!`;
      break;

    case "THE_SUN":
      finalScoreDelta = basePoints;
      rewardText = `☀️ MẶT TRỜI QUANG MINH: Điềm lành tuyệt đối! Nhận trọn vẹn +${basePoints}đ an toàn!`;
      break;

    case "THE_FOOL":
      if (isSurvivalMode) {
        scorePenalty = Math.abs(drawnCard.scoreDelta);
        finalScoreDelta = -scorePenalty;
        state.turnFinishedReason = "SURVIVAL_FAILED";
        rewardText = `🃏 KẺ KHỜ (KHÓI ĐỘC SINH TỬ): Chế độ Sinh Tử phạt trừ 50% điểm gốc câu hỏi (-${scorePenalty}đ)!`;
      } else {
        finalScoreDelta = 0;
        rewardText = `🃏 KẺ KHỜ: Điềm dữ! Mất toàn bộ điểm câu hiện tại (0đ). Tổng điểm giữ nguyên.`;
      }
      break;

    case "THE_EMPEROR": {
      scorePenalty = Math.abs(drawnCard.scoreDelta);
      finalScoreDelta = -scorePenalty;
      if (isSurvivalMode) state.turnFinishedReason = "SURVIVAL_FAILED";
      const recNames = (drawnCard.darkBombRecipients || []).map((r) => `${r.teamName} (+${r.points}đ)`).join(", ");
      if (scorePenalty > 0 && recNames) {
        rewardText = `👑 HOÀNG ĐẾ: Quyền lực hắc ám trừ ${scorePenalty}đ phân chia cho đối thủ: ${recNames}!`;
      } else if (scorePenalty > 0) {
        rewardText = `👑 HOÀNG ĐẾ: Quyền lực hắc ám trừ ${scorePenalty}đ!`;
      } else {
        rewardText = `👑 HOÀNG ĐẾ: Điểm số hiện tại là 0đ nên không bị trừ điểm và không phân chia cho đối thủ!`;
      }
      break;
    }

    case "THE_KNIGHT":
      scorePenalty = Math.abs(drawnCard.scoreDelta);
      finalScoreDelta = -scorePenalty;
      if (isSurvivalMode) state.turnFinishedReason = "SURVIVAL_FAILED";
      rewardText = `🗡️ HIỆP SĨ: Định mệnh trừng phạt xóa sổ 1/2 tổng điểm hiện có (-${scorePenalty}đ)!`;
      break;

    case "THE_DEATH":
      if (isSurvivalMode) state.turnFinishedReason = "SURVIVAL_FAILED";
      if (drawnCard.deathSubtype === "GIFT_TOP1") {
        scorePenalty = Math.abs(drawnCard.scoreDelta);
        finalScoreDelta = -scorePenalty;
        rewardText = `💀 THẦN CHẾT (HIẾN TẾ): Bị phạt theo phương án thấp hơn (-${scorePenalty}đ) chuyển tặng trọn gói cho Top 1 (${drawnCard.victimTeamName || "Đối thủ"})!`;
      } else {
        finalScoreDelta = drawnCard.stolenPoints || (basePoints * 2);
        rewardText = `💀 THẦN CHẾT (ĐOẠT MỆNH): Hút sạch +${finalScoreDelta}đ từ Top 1 (${drawnCard.victimTeamName || "Đối thủ"}) cộng thẳng vào điểm của bạn!`;
      }
      break;
  }

  const oldScore = currentScore;
  const newScore = Math.max(0, oldScore + finalScoreDelta);
  state.storyResult = {
    teamId: team.id,
    teamName: team.name,
    teamColor: team.color || "#ef4444",
    rewardText,
    scoreDelta: finalScoreDelta,
    oldScore,
    newScore,
  };

  const scoreDeltas: Array<{ teamId: string; delta: number }> = [];
  if (finalScoreDelta !== 0) {
    scoreDeltas.push({ teamId: team.id, delta: finalScoreDelta });
  }
  if (drawnCard.victimTeamId) {
    if (drawnCard.stolenPoints && drawnCard.stolenPoints > 0) {
      scoreDeltas.push({ teamId: drawnCard.victimTeamId, delta: -drawnCard.stolenPoints });
    } else if (drawnCard.giftedPoints && drawnCard.giftedPoints > 0) {
      scoreDeltas.push({ teamId: drawnCard.victimTeamId, delta: drawnCard.giftedPoints });
    }
  }
  if (drawnCard.darkBombRecipients) {
    for (const rec of drawnCard.darkBombRecipients) {
      if (rec.points > 0) {
        scoreDeltas.push({ teamId: rec.teamId, delta: rec.points });
      }
    }
  }

  return {
    updatedState: { ...state },
    finalScoreDelta,
    isBomb: scorePenalty > 0,
    scorePenalty,
    victimTeamId: drawnCard.victimTeamId,
    victimTeamName: drawnCard.victimTeamName,
    stolenPoints: drawnCard.stolenPoints,
    giftedPoints: drawnCard.giftedPoints,
    darkBombRecipients: drawnCard.darkBombRecipients,
    drawnCard,
    scoreDeltas,
    targetAngle,
    spinDurationMs,
    landedSegment,
    landedIndex,
  };
}

/**
 * Handles Redraw in Tarot of Destiny (when EXTRA_ATTEMPT_PROMO is active).
 */
export function handleTarotRedraw({
  state,
}: {
  state: MysteryQuestState;
}): {
  updatedState: MysteryQuestState;
} {
  if (!state.tarotState) return { updatedState: state };
  state.tarotState.hasRedrawn = true;
  state.tarotState.canRedraw = false;
  state.tarotState.chosenCardId = undefined;
  return { updatedState: { ...state } };
}

/**
 * Handles Confirming the drawn card in Tarot of Destiny without redrawing.
 */
export function handleTarotConfirmKeep({
  state,
  team,
  allTeams = [],
}: {
  state: MysteryQuestState;
  team: MysteryTeamRef;
  allTeams?: MysteryTeamRef[];
}): {
  updatedState: MysteryQuestState;
  finalScoreDelta?: number;
  isBomb?: boolean;
  scorePenalty?: number;
  victimTeamId?: string;
  victimTeamName?: string;
  stolenPoints?: number;
} {
  const chosenId = state.tarotState?.chosenCardId;
  if (!chosenId) return { updatedState: state, finalScoreDelta: 0 };
  if (state.tarotState) {
    state.tarotState.canRedraw = false;
  }
  const tile = state.tiles.find((t) => t.id === chosenId);
  if (tile) tile.isOpened = false;
  return handleFlipCard({
    state,
    tileId: chosenId,
    team,
    allTeams,
  });
}

/**
 * Kích hoạt Mắt Thần soi đỉnh bài 1 lần duy nhất trong PUSH_YOUR_LUCK.
 */
export function handlePushYourLuckUsePeek({
  state,
}: {
  state: MysteryQuestState;
}): { updatedState: MysteryQuestState } {
  if (!state.peekUsesRemaining || state.peekUsesRemaining <= 0) {
    return { updatedState: state };
  }
  state.peekUsesRemaining -= 1;
  const topCard = state.tiles.find((t) => !t.isOpened);
  if (topCard) {
    // 1. Làm sạch tên lá bài: Loại bỏ icon bị lặp ở đầu (tránh 💎 💎 ...)
    let cleanTitle = (topCard.storyTitle || "").trim();
    if (topCard.icon && cleanTitle.startsWith(topCard.icon)) {
      cleanTitle = cleanTitle.slice(topCard.icon.length).trim();
    }
    cleanTitle = cleanTitle.replace(/^[\p{Extended_Pictographic}\p{Emoji}\uFE0F\u200D\s]+/u, "").trim() || topCard.storyTitle;

    // 2. Tính toán badge điểm số và hiệu ứng hiển thị rõ ràng:
    let pointBadge = "";
    const isBomb = topCard.type !== "REWARD" && topCard.type !== "ESCAPE_SAFE";

    if (topCard.type === "REWARD") {
      if (topCard.effectType === "MULTIPLY_X2") {
        pointBadge = "X2 HŨ";
      } else if (topCard.effectType === "STEAL_POINTS") {
        pointBadge = topCard.deltaPoints ? `CƯỚP +${topCard.deltaPoints}đ` : "CƯỚP ĐIỂM";
      } else if (typeof topCard.deltaPoints === "number" && topCard.deltaPoints > 0) {
        pointBadge = `+${topCard.deltaPoints}đ`;
      } else {
        pointBadge = "AN TOÀN";
      }
    } else if (topCard.type === "ESCAPE_SAFE") {
      pointBadge = "THOÁT HIỂM";
    } else if (topCard.type === "BOMB_SMOKE") {
      pointBadge = "0đ (MẤT HŨ)";
    } else if (topCard.type === "BOMB_DARK") {
      pointBadge = "CHIA ĐỐI THỦ";
    } else if (topCard.type === "BOMB_CHARITY") {
      pointBadge = "TẶNG TOP 1";
    } else if (topCard.type === "TRAP") {
      pointBadge = typeof topCard.deltaPoints === "number" && topCard.deltaPoints < 0
        ? `-${Math.abs(topCard.deltaPoints)}đ`
        : "BẪY PHẠT";
    } else {
      pointBadge = typeof topCard.deltaPoints === "number" && topCard.deltaPoints < 0
        ? `-${Math.abs(topCard.deltaPoints)}đ`
        : "BẪY BOM";
    }

    state.nextCardPeek = {
      icon: topCard.icon,
      storyTitle: cleanTitle,
      cleanTitle,
      isBomb,
      deltaPoints: topCard.deltaPoints,
      effectType: topCard.effectType,
      type: topCard.type,
      pointBadge,
      storyDescription: topCard.storyDescription,
    };
  }
  return { updatedState: { ...state } };
}

/**
 * Xử lý quyết định Mắt Thần Tiên Tri trong TAROT_DESTINY:
 * - "KEEP": Người chơi chọn luôn lá được tiên tri hé lộ.
 * - "DISCARD": Người chơi bỏ qua lá được tiên tri, khóa lá đó lại và được rút 1 trong 4 lá còn lại.
 */
export function handleTarotProphecyDecision({
  state,
  team,
  allTeams = [],
  choice,
}: {
  state: MysteryQuestState;
  team: MysteryTeamRef;
  allTeams?: MysteryTeamRef[];
  choice: "KEEP" | "DISCARD";
}): {
  updatedState: MysteryQuestState;
  finalScoreDelta?: number;
  isBomb?: boolean;
  scorePenalty?: number;
  victimTeamId?: string;
  victimTeamName?: string;
  stolenPoints?: number;
} {
  const tState = state.tarotState || {};
  state.tarotState = tState;

  if (choice === "KEEP") {
    const targetTileId = tState.prophecyCardId;
    tState.prophecyResolved = true;
    if (targetTileId) {
      const targetTile = state.tiles.find((t) => t.id === targetTileId);
      if (targetTile) targetTile.isOpened = false;
      return handleFlipCard({
        state,
        tileId: targetTileId,
        team,
        allTeams,
      });
    }
    return { updatedState: state, finalScoreDelta: 0, isBomb: false, scorePenalty: 0 };
  } else {
    // DISCARD: Khóa lá bài tiên tri, cho phép rút 4 lá còn lại
    tState.prophecyResolved = true;
    tState.discardedCardId = tState.prophecyCardId;
    return { updatedState: { ...state }, finalScoreDelta: 0, isBomb: false, scorePenalty: 0 };
  }
}

/**
 * Tái đồng bộ số điểm câu hỏi và thang điểm minigame (tiles, potPoints, penalty...)
 * đảm bảo 100% khi câu 30đ thì minigame chạy theo thang 30đ, câu 20đ theo thang 20đ, câu 10đ theo thang 10đ.
 */
export function synchronizeMysteryStageWithQuestionPoints({
  state,
  questionPoints,
  theme,
  teams = [],
}: {
  state: MysteryQuestState;
  questionPoints: number;
  theme?: MysteryTheme;
  teams?: MysteryTeamRef[];
}): MysteryQuestState {
  const normPoints = normalizeToThreeLevels(questionPoints);
  const currentTeam = teams.find((t) => t.id === state.currentTurnTeamId) || {
    id: state.currentTurnTeamId,
    name: state.currentTurnTeamName,
    color: state.currentTurnTeamColor,
    score: 0,
  };

  state.baseQuestionPoints = normPoints;
  // Cập nhật potPoints ban đầu khớp điểm câu hỏi nếu đang ở giai đoạn quyết định hoặc chưa lật bài
  if (state.phase === "DECISION_CHOICE" || (state.phase === "PUSH_YOUR_LUCK" && state.cardsFlippedCount === 0)) {
    const extraPot = getPerkType(state.promoPerk) === "EXTRA_POT_PROMO" ? 5 : 0;
    state.potPoints = normPoints + extraPot;
  }

  const normType = normalizeMiniGameType(state.miniGameType);
  const roundOptions = {
    currentRound: state.currentRound || 1,
    teams,
    currentTeamId: currentTeam.id,
  };

  switch (normType) {
    case "MEMORY_PAIRS": {
      // Khi đang chuẩn bị câu hỏi hoặc chưa lật lá nào thì generate lại bộ thẻ theo normPoints mới và reset memoryPairsState
      if (state.phase === "QUESTION_ACTIVE" || (!state.memoryPairsState?.firstFlippedTileId && state.cardsFlippedCount === 0)) {
        state.tiles = generateMemoryPairsTiles(normPoints, roundOptions);
        state.memoryPairsState = getInitialMemoryPairsState(state.promoPerk);
        if (getPerkType(state.promoPerk) === "PEEK_PROMO") {
          // Mắt Thần Soi Bài: Soi sáng 2 lá an toàn thuộc 2 cặp khác nhau (giúp né bom, không kiến tạo chiến thắng chắc chắn)
          const safeTiles = state.tiles.filter(
            (t) => t.type === "REWARD" && t.pairKey !== "PAIR_BOMB" && t.pairKey !== "PAIR_TRAP"
          );
          const shuffledSafe = [...safeTiles].sort(() => Math.random() - 0.5);
          if (shuffledSafe.length >= 2) {
            const first = shuffledSafe[0];
            const second = shuffledSafe.find((t) => t.pairKey !== first.pairKey) || shuffledSafe[1];
            first.isPeeked = true;
            first.peekLabel = "AN TOÀN";
            first.peekIcon = "✨";
            second.isPeeked = true;
            second.peekLabel = "AN TOÀN";
            second.peekIcon = "✨";
          }
        }
      }
      break;
    }

    case "ONE_SHOT_DOORS": {
      if (state.phase === "QUESTION_ACTIVE" || (state.oneShotState?.phase === "SELECTING" && (!state.oneShotState.selectedDoorIds || state.oneShotState.selectedDoorIds.length === 0))) {
        state.tiles = generateOneShotDoorsTiles(normPoints, { ...roundOptions, promoPerk: state.promoPerk });
        state.oneShotState = {
          chosenTileId: undefined,
          selectedDoorIds: [],
          penaltyDoorsCount: undefined,
          hasBombDetected: false,
          phase: "SELECTING",
          revealedSafeDoorIds: [],
          chosenFinalDoorId: undefined,
          allRevealed: false,
          peekAvailable: getPerkType(state.promoPerk) === "PEEK_PROMO",
          peekActivated: getPerkType(state.promoPerk) === "PEEK_PROMO",
          hasSwapped: false,
        };
      }
      break;
    }

    case "TAROT_DESTINY": {
      state.tiles = [];
      if (state.phase === "QUESTION_ACTIVE") {
        state.tarotState = {
          isWheelSpinning: false,
          isDrawn: false,
          targetAngle: 0,
        };
      }
      break;
    }

    case "PUSH_YOUR_LUCK":
    default: {
      if (state.phase === "QUESTION_ACTIVE" || state.cardsFlippedCount === 0) {
        state.tiles = generatePushYourLuckTiles(
          theme || state.theme || "PIRATE",
          normPoints,
          currentTeam.score || 0,
          false,
          roundOptions
        );
      }
      break;
    }
  }

  return { ...state };
}

