import {
  MysteryQuestState,
  MysteryTheme,
  MysteryMiniGameType,
  MysteryTile,
  MysteryTileType,
  MysteryTileEffectType,
  MysteryPromoPerk,
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
  _basePoints: number = 10,
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
  teamShields,
  currentTurnIndex = 0,
}: {
  activeTeamId: string;
  allTeams: MysteryTeamRef[];
  timesStolenInCycle?: Record<string, number>;
  teamShields?: Record<string, { activeFromTurnIndex: number; expiresAfterTurnIndex: number; sourceCard?: string }>;
  currentTurnIndex?: number;
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

  // Loại trừ các đội đã bị cướp >= 2 lần trong chu kỳ hoặc đang được Khiên Hoàng Đế bảo vệ
  const eligibleOpponents = opponents.filter((t) => {
    if ((timesStolenInCycle[t.id] ?? 0) >= 2) return false;
    const shield = teamShields?.[t.id];
    if (shield && currentTurnIndex >= shield.activeFromTurnIndex && currentTurnIndex <= shield.expiresAfterTurnIndex) {
      return false;
    }
    return true;
  });

  if (eligibleOpponents.length === 0) {
    return {
      stolenPoints: 5,
      isFromBank: true,
      protectionNote: "Các đối thủ đều đang được Khiên Hoàng Đế bảo vệ! Bạn nhận +5đ an toàn từ Hệ Thống.",
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
    faceUpPenaltyTileIds: [],
    isBombRescueActive: false,
    activePenaltyPairKey: null,
    attemptsUsed: 0,
    maxAttempts: perkType === "EXTRA_ATTEMPT_PROMO" ? 6 : 5,
    matchedPairKey: null,
    isMismatchResolving: false,
    round: 1,
    promptSecondChance: false,
    rescueFormedNegativePairs: [],
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
    { storyTitle: "🚀 Nhân Đôi x2", storyDescription: "Ánh sáng tinh tú soi rọi: Nhân đôi (x2) điểm gốc câu hỏi vào quỹ thưởng!", deltaPoints: 0, effectType: "MULTIPLY_X2" },
    { storyTitle: "🎭 Cướp +20đ", storyDescription: "Áo tàng hình xuất kích: Cướp thêm 20đ vào quỹ thưởng!", deltaPoints: 20, effectType: "STEAL_POINTS" },
    { storyTitle: "🛡️ Khiên +20đ", storyDescription: "Nhặt được khiên cổ hoàng gia: Thưởng an toàn +20 điểm quỹ!", deltaPoints: 20, effectType: "BONUS_POINTS" },
    { storyTitle: "📜 Bí Truyền +25đ", storyDescription: "Giải mã cuộn giấy thông thái: Thưởng nóng +25 điểm quỹ!", deltaPoints: 25, effectType: "BONUS_POINTS" },
    { storyTitle: "💰 Kho Vàng +25đ", storyDescription: "Mở đúng căn hầm hoàng gia: +25 điểm quỹ!", deltaPoints: 25, effectType: "BONUS_POINTS" },
    { storyTitle: "✨ Pha Lê +20đ", storyDescription: "Năng lượng dồi dào: +20 điểm quỹ!", deltaPoints: 20, effectType: "BONUS_POINTS" },
    { storyTitle: "👑 Vương Miện +35đ", storyDescription: "Tìm thấy vương miện bảo vật: +35 điểm quỹ!", deltaPoints: 35, effectType: "BONUS_POINTS" },
  ],
  PIRATE: [
    { storyTitle: "👑 Kho Báu +40đ", storyDescription: "Hòm kim cương khổng lồ: Thưởng lớn +40 điểm quỹ!", deltaPoints: 40, effectType: "BONUS_POINTS" },
    { storyTitle: "⚓ Nhân Đôi x2", storyDescription: "Vận may đại dương: Nhân đôi (x2) điểm gốc câu hỏi vào quỹ thưởng!", deltaPoints: 0, effectType: "MULTIPLY_X2" },
    { storyTitle: "🗡️ Cướp +25đ", storyDescription: "Cướp bóc khoang thuyền: Cướp 25đ vào quỹ thưởng!", deltaPoints: 25, effectType: "STEAL_POINTS" },
    { storyTitle: "🦜 Chỉ Đường +25đ", storyDescription: "Chú vẹt chỉ đường tắt vào kho báu: Thưởng lớn +25 điểm quỹ!", deltaPoints: 25, effectType: "BONUS_POINTS" },
    { storyTitle: "🍻 Thưởng +20đ", storyDescription: "Liên hoan tưng bừng: +20 điểm quỹ!", deltaPoints: 20, effectType: "BONUS_POINTS" },
    { storyTitle: "🧭 La Bàn +25đ", storyDescription: "Tìm thấy hướng gió lành: +25 điểm quỹ!", deltaPoints: 25, effectType: "BONUS_POINTS" },
    { storyTitle: "🪙 Tiền Vàng +30đ", storyDescription: "Nhặt được túi vàng nguyên vẹn: +30 điểm quỹ!", deltaPoints: 30, effectType: "BONUS_POINTS" },
    { storyTitle: "🛡️ Khiên +20đ", storyDescription: "Nhặt được mộc gỗ quý báu: Thưởng an toàn +20 điểm quỹ!", deltaPoints: 20, effectType: "BONUS_POINTS" },
  ],
  FOREST: [
    { storyTitle: "🌟 Kho Báu +35đ", storyDescription: "Nữ Hoàng Tiên ban tặng: Thưởng ngay +35 điểm quỹ!", deltaPoints: 35, effectType: "BONUS_POINTS" },
    { storyTitle: "🌸 Nhân Đôi x2", storyDescription: "Sinh lực tràn trề: Nhân đôi (x2) điểm gốc câu hỏi vào quỹ thưởng!", deltaPoints: 0, effectType: "MULTIPLY_X2" },
    { storyTitle: "🦊 Cướp +20đ", storyDescription: "Lẻn trộm túi tiền: Cướp 20đ vào quỹ thưởng!", deltaPoints: 20, effectType: "STEAL_POINTS" },
    { storyTitle: "🌿 Khiên +20đ", storyDescription: "Bùa chú rừng xanh hộ thể: Thưởng an toàn +20 điểm quỹ!", deltaPoints: 20, effectType: "BONUS_POINTS" },
    { storyTitle: "🏹 Thưởng +30đ", storyDescription: "Bắn trúng hồng tâm kho báu: Thưởng lớn +30 điểm quỹ!", deltaPoints: 30, effectType: "BONUS_POINTS" },
    { storyTitle: "🍯 Mật Ong +25đ", storyDescription: "Ngọt ngào năng lượng: +25 điểm quỹ!", deltaPoints: 25, effectType: "BONUS_POINTS" },
    { storyTitle: "🦋 Tinh Linh +20đ", storyDescription: "Ánh sáng dẫn lối: +20 điểm quỹ!", deltaPoints: 20, effectType: "BONUS_POINTS" },
    { storyTitle: "💎 Lục Bảo +30đ", storyDescription: "Viên ngọc ngàn năm: +30 điểm quỹ!", deltaPoints: 30, effectType: "BONUS_POINTS" },
  ],
  CYBER: [
    { storyTitle: "⚡ Siêu Thưởng +40đ", storyDescription: "Bùng nổ siêu năng lượng: Thưởng lớn +40 điểm quỹ!", deltaPoints: 40, effectType: "BONUS_POINTS" },
    { storyTitle: "🚀 Nhân Đôi x2", storyDescription: "Gia tốc cực đại: Nhân đôi (x2) điểm gốc câu hỏi vào quỹ thưởng!", deltaPoints: 0, effectType: "MULTIPLY_X2" },
    { storyTitle: "🛰️ Cướp +25đ", storyDescription: "Chuyển luồng dữ liệu: Cướp 25đ vào quỹ thưởng!", deltaPoints: 25, effectType: "STEAL_POINTS" },
    { storyTitle: "🛡️ Lá Chắn +20đ", storyDescription: "Trường lực bảo vệ công nghệ: Thưởng an toàn +20 điểm quỹ!", deltaPoints: 20, effectType: "BONUS_POINTS" },
    { storyTitle: "💾 Dữ Liệu +30đ", storyDescription: "Giải mã dữ liệu tối mật: Thưởng nóng +30 điểm quỹ!", deltaPoints: 30, effectType: "BONUS_POINTS" },
    { storyTitle: "📡 Vệ Tinh +25đ", storyDescription: "Bắt trọn luồng sóng quý: +25 điểm quỹ!", deltaPoints: 25, effectType: "BONUS_POINTS" },
    { storyTitle: "🔋 Năng Lượng +20đ", storyDescription: "Sạc đầy pin tàu: +20 điểm quỹ!", deltaPoints: 20, effectType: "BONUS_POINTS" },
    { storyTitle: "🤖 Siêu Chip +30đ", storyDescription: "Thuật toán xử lý thần tốc: +30 điểm quỹ!", deltaPoints: 30, effectType: "BONUS_POINTS" },
  ],
  TEMPLE: [
    { storyTitle: "👑 Kho Báu +40đ", storyDescription: "Khai mở kho báu lăng mộ: Thưởng lớn +40 điểm quỹ!", deltaPoints: 40, effectType: "BONUS_POINTS" },
    { storyTitle: "☀️ Nhân Đôi x2", storyDescription: "Thần Mặt Trời ban phước: Nhân đôi (x2) điểm gốc câu hỏi vào quỹ thưởng!", deltaPoints: 0, effectType: "MULTIPLY_X2" },
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

export interface TarotMinigameArchetype {
  key: AncientTarotCardKey;
  nameVi: string;
  nameEn: string;
  icon: string;
  type: MysteryTileType;
  effectType: MysteryTileEffectType;
  storyTitle: string;
  storyDescription: string;
  deltaMultiplier: number;
  deltaPoints: number;
  isNegative: boolean;
  isBomb?: boolean;
  bombType?: "BOMB_SMOKE" | "BOMB_DARK" | "BOMB_CHARITY";
  givesShield?: boolean;
  givesHeart?: boolean;
  isSteal?: boolean;
  stealFraction?: number;
}

export function getTarotMinigameArchetypePool(
  basePoints: number = 20,
  options?: {
    currentRound?: number;
    teams?: MysteryTeamRef[];
    currentTeamId?: string;
    riskTier?: TeamRiskTier;
  }
): {
  defaultPlus: TarotMinigameArchetype;
  defaultMinus: TarotMinigameArchetype;
  candidates: TarotMinigameArchetype[];
} {
  const riskTier = options?.riskTier ?? "NEUTRAL";
  const currentRound = options?.currentRound ?? 1;
  const pBase = basePoints;
  const pSun = basePoints * 2; // Capped strictly at 2x max ceiling
  const pMedium = Math.round(basePoints * 1.5);
  const pHalf = roundToMultipleOfFive(basePoints * 0.5);

  const canSteal = currentRound >= 2 && Boolean(
    options?.teams &&
    options?.teams.some((t) => t.id !== options?.currentTeamId && (t.score || 0) >= pHalf)
  );

  // 1. DEFAULT FIXED +1x: The Magician (Pháp Sư Khởi Nguyên)
  const defaultPlus: TarotMinigameArchetype = {
    key: "THE_MAGICIAN",
    nameVi: "Pháp Sư Khởi Nguyên",
    nameEn: "The Magician",
    icon: "🪄",
    type: "REWARD",
    effectType: "BONUS_POINTS",
    storyTitle: `🪄 Pháp Sư +${pBase}đ`,
    storyDescription: `Pháp sư ban phước: Nhận an toàn +${pBase} điểm cơ bản!`,
    deltaMultiplier: 1.0,
    deltaPoints: pBase,
    isNegative: false,
  };

  // 2. DEFAULT FIXED -1x: The Tower (Tháp Bẫy Sụp Đổ)
  const towerPenalty = riskTier === "UNDERDOG" ? 0 : pBase;
  const defaultMinus: TarotMinigameArchetype = {
    key: "THE_TOWER",
    nameVi: "Tháp Bẫy Sụp Đổ",
    nameEn: "The Tower",
    icon: "⚡",
    type: "TRAP",
    effectType: "LOSE_POINTS",
    storyTitle: `⚡ Tháp Bẫy -${towerPenalty}đ`,
    storyDescription: riskTier === "UNDERDOG"
      ? "Tháp sụp đổ nhưng đội yếu thế được thần hộ mệnh bảo hộ (0đ phạt)!"
      : `Dính bẫy tháp sụp đổ: Trừ -${towerPenalty} điểm cơ bản!`,
    deltaMultiplier: riskTier === "UNDERDOG" ? 0 : -1.0,
    deltaPoints: -towerPenalty,
    isNegative: true,
  };

  // 12 CANDIDATES IN POOL:
  const candidates: TarotMinigameArchetype[] = [
    // 1. THE_SUN: +2x Base points (Strict 2x ceiling)
    {
      key: "THE_SUN",
      nameVi: "Mặt Trời Vinh Quang",
      nameEn: "The Sun",
      icon: "☀️",
      type: "REWARD",
      effectType: "MULTIPLY_X2",
      storyTitle: `☀️ Mặt Trời +${pSun}đ`,
      storyDescription: `Ánh dương rực rỡ: Nhân đôi đại thưởng x2 điểm gốc (+${pSun}đ)!`,
      deltaMultiplier: 2.0,
      deltaPoints: pSun,
      isNegative: false,
    },
    // 2. THE_EMPEROR: Shield Protection (+1x base points)
    {
      key: "THE_EMPEROR",
      nameVi: "Hoàng Đế Quyền Uy",
      nameEn: "The Emperor",
      icon: "🛡️",
      type: "REWARD",
      effectType: "BONUS_POINTS",
      storyTitle: `🛡️ Khiên Thần +${pBase}đ`,
      storyDescription: `Uy quyền tối thượng: Trang bị 1 Khiên Thần phòng ngự và nhận trọn vẹn +${pBase}đ!`,
      deltaMultiplier: 1.0,
      deltaPoints: pBase,
      isNegative: false,
      givesShield: true,
    },
    // 3. STRENGTH: Heart Recovery (+1x base points)
    {
      key: "STRENGTH",
      nameVi: "Sức Mạnh Phục Hồi",
      nameEn: "Strength",
      icon: "❤️",
      type: "REWARD",
      effectType: "BONUS_POINTS",
      storyTitle: `❤️ Hồi 1 Tim +${pBase}đ`,
      storyDescription: `Nghị lực kiên cường: Hồi phục 1 Trái Tim phòng thủ và nhận trọn vẹn +${pBase}đ!`,
      deltaMultiplier: 1.0,
      deltaPoints: pBase,
      isNegative: false,
      givesHeart: true,
    },
    // 4. THE_CHARIOT: Steal 50% base points (or +0.5x if cannot steal)
    {
      key: "THE_CHARIOT",
      nameVi: "Cỗ Xe Đoạt Bảo",
      nameEn: "The Chariot",
      icon: "🗡️",
      type: "REWARD",
      effectType: canSteal ? "STEAL_POINTS" : "BONUS_POINTS",
      storyTitle: canSteal ? `🗡️ Cướp 50% (+${pHalf}đ)` : `🗡️ Chiến Xa +${pHalf}đ`,
      storyDescription: canSteal
        ? `Đột kích chớp nhoáng: Cướp 50% điểm cơ bản (+${pHalf}đ) từ một đối thủ!`
        : `Chiến xa viễn chinh: Nhận an toàn +${pHalf} điểm thưởng!`,
      deltaMultiplier: 0.5,
      deltaPoints: pHalf,
      isNegative: false,
      isSteal: canSteal,
      stealFraction: 0.5,
    },
    // 5. THE_DEATH: Steal 100% (or 50% if stolen) or +1x if cannot steal
    {
      key: "THE_DEATH",
      nameVi: "Thần Chết Đoạt Mệnh",
      nameEn: "The Death",
      icon: "💀",
      type: "REWARD",
      effectType: canSteal ? "STEAL_POINTS" : "BONUS_POINTS",
      storyTitle: canSteal ? `💀 Đoạt Mệnh +${pBase}đ` : `💀 Phán Xét +${pBase}đ`,
      storyDescription: canSteal
        ? `Lưỡi hái định mệnh: Đoạt lấy +${pBase} điểm cơ bản từ đối thủ Top 1!`
        : `Thần Chết chuyển hóa phước lành: Nhận an toàn +${pBase} điểm!`,
      deltaMultiplier: 1.0,
      deltaPoints: pBase,
      isNegative: false,
      isSteal: canSteal,
      stealFraction: 1.0,
    },
    // 6. THE_FOOL: ±0đ Neutral / Trap
    {
      key: "THE_FOOL",
      nameVi: "Kẻ Khờ Lãng Du",
      nameEn: "The Fool",
      icon: "🃏",
      type: "TRAP",
      effectType: "LOSE_POINTS",
      storyTitle: "🃏 Kẻ Khờ ±0đ (Bẫy Trung Lập)",
      storyDescription: "Vô ưu lãng du: Là bẫy trung lập không trừ điểm (±0đ) nhưng khiến bạn mất lượt an toàn!",
      deltaMultiplier: 0,
      deltaPoints: 0,
      isNegative: true,
    },
    // 7. WHEEL_OF_FORTUNE: +1.5x Base points
    {
      key: "WHEEL_OF_FORTUNE",
      nameVi: "Vòng Quay Định Mệnh",
      nameEn: "Wheel of Fortune",
      icon: "🎡",
      type: "REWARD",
      effectType: "BONUS_POINTS",
      storyTitle: `🎡 Định Mệnh +${pMedium}đ`,
      storyDescription: `Bánh xe luân chuyển: Thưởng may mắn +1.5x điểm cơ bản (+${pMedium}đ)!`,
      deltaMultiplier: 1.5,
      deltaPoints: pMedium,
      isNegative: false,
    },
    // 8. THE_HIGH_PRIESTESS: +1x Base points
    {
      key: "THE_HIGH_PRIESTESS",
      nameVi: "Nữ Tu Trí Tuệ",
      nameEn: "The High Priestess",
      icon: "🔮",
      type: "REWARD",
      effectType: "BONUS_POINTS",
      storyTitle: `🔮 Nữ Tu +${pBase}đ`,
      storyDescription: `Trực giác sáng suốt: Ban phước bình an nhận đủ +${pBase} điểm!`,
      deltaMultiplier: 1.0,
      deltaPoints: pBase,
      isNegative: false,
    },
    // 9. TEMPERANCE: +1.5x Base points for active team, +0.5x for all other teams (Dung hợp hài hòa)
    {
      key: "TEMPERANCE",
      nameVi: "Tiết Độ Hài Hòa",
      nameEn: "Temperance",
      icon: "⚖️",
      type: "REWARD",
      effectType: "BONUS_POINTS",
      storyTitle: `⚖️ Tiết Độ +${pMedium}đ (Các đội khác +${pHalf}đ)`,
      storyDescription: `Dung hợp hài hòa: Bạn nhận +1.5x (+${pMedium}đ), đồng thời ban phước chia sẻ +0.5x (+${pHalf}đ) cho tất cả các đối thủ!`,
      deltaMultiplier: 1.5,
      deltaPoints: pMedium,
      isNegative: false,
    },
    // 10. THE_DEVIL: Dark Bomb (Bom Hắc Ám - trừ chia đều đối thủ)
    {
      key: "THE_DEVIL",
      nameVi: "Ác Ma Hắc Ám",
      nameEn: "The Devil",
      icon: "🌑",
      type: "BOMB_DARK",
      effectType: "LOSE_POINTS",
      storyTitle: `🌑 Bom Tối -${pBase}đ`,
      storyDescription: `Năng lượng hắc ám bùng phát: Phạt trừ -${pBase}đ chia đều cho các đối thủ!`,
      deltaMultiplier: -1.0,
      deltaPoints: -pBase,
      isNegative: true,
      isBomb: true,
      bombType: "BOMB_DARK",
    },
    // 11. THE_HANGED_MAN: Charity Bomb (Bom Từ Thiện - chuyển tặng Top 1)
    {
      key: "THE_HANGED_MAN",
      nameVi: "Kẻ Treo Ngược",
      nameEn: "The Hanged Man",
      icon: "🎁",
      type: "BOMB_CHARITY",
      effectType: "LOSE_POINTS",
      storyTitle: "🎁 Bom Tặng",
      storyDescription: "Hy sinh bất đắc dĩ: Phạt trừ điểm chuyển tặng trọn vẹn cho Top 1!",
      deltaMultiplier: 0,
      deltaPoints: 0,
      isNegative: true,
      isBomb: true,
      bombType: "BOMB_CHARITY",
    },
    // 12. SMOKE_BOMB: Smoke Bomb (Bom Khói - mất sạch điểm câu này 0đ)
    {
      key: "THE_KNIGHT",
      nameVi: "Hiệp Sĩ Khói Mù",
      nameEn: "The Knight",
      icon: "💨",
      type: "BOMB_SMOKE",
      effectType: "LOSE_POT_POINTS",
      storyTitle: "💨 Bom Khói 0đ",
      storyDescription: "Khói mù bao phủ: Mất sạch điểm câu hỏi hiện tại (0đ), bảo toàn tổng điểm!",
      deltaMultiplier: 0,
      deltaPoints: 0,
      isNegative: true,
      isBomb: true,
      bombType: "BOMB_SMOKE",
    },
  ];

  return { defaultPlus, defaultMinus, candidates };
}

/**
 * Generates the 8 archetypes conforming strictly to:
 * 1. Slot 1: Default Fixed +1x (The Magician)
 * 2. Slot 2: Default Fixed -1x (The Tower; Underdog = 0đ)
 * 3. Slot 3: The Fool (±0đ) - ALWAYS 1 SLOT FOR NEUTRAL / BALANCE REGARDLESS OF CONTEXT!
 * 4. Number of negative slots is strictly 2 - 3 depending on round and situation:
 *    - Round 1 OR Underdog: Exactly 2 negative slots (The Tower + Smoke Bomb 0đ).
 *    - Round 2+ (Neutral / Dominant): Exactly 3 negative slots (The Tower + 2 Iconic Bombs).
 * 5. High Multiplier is strictly capped at 2x max ceiling.
 */
export function generateTarotQuotaArchetypes(
  basePoints: number = 20,
  options?: {
    currentRound?: number;
    teams?: MysteryTeamRef[];
    currentTeamId?: string;
    riskTier?: TeamRiskTier;
  }
): {
  defaultPlus: TarotMinigameArchetype;
  defaultMinus: TarotMinigameArchetype;
  quotaArchetypes: TarotMinigameArchetype[];
  allEightArchetypes: TarotMinigameArchetype[];
} {
  const { defaultPlus, defaultMinus, candidates } = getTarotMinigameArchetypePool(basePoints, options);
  const currentRound = options?.currentRound ?? 1;
  const riskTier = options?.riskTier ?? "NEUTRAL";

  const getCard = (key: AncientTarotCardKey): TarotMinigameArchetype => {
    return candidates.find((c) => c.key === key) || candidates[0];
  };

  // 1. ALWAYS 1 SLOT FOR NEUTRAL / BALANCE (The Fool ±0đ)
  const slotFool = getCard("THE_FOOL");

  // 2. High Multiplier (Max 1 card: The Sun 2x or Wheel 1.5x)
  const highMultPool = [getCard("THE_SUN"), getCard("WHEEL_OF_FORTUNE")];
  const slotHigh = highMultPool[Math.floor(Math.random() * highMultPool.length)];

  // 3. Support / Vitality: Hộ Thể (The Emperor Shield +1x or Strength Heart +1x)
  const supportPool = [getCard("THE_EMPEROR"), getCard("STRENGTH")];
  const slotSupport = supportPool[Math.floor(Math.random() * supportPool.length)];

  let quotaArchetypes: TarotMinigameArchetype[];

  if (currentRound <= 1 || riskTier === "UNDERDOG") {
    // ═════════════════════════════════════════════════════════════════════════
    // ROUND 1 HOẶC UNDERDOG: ĐÚNG 2 SLOT TRỪ (Tower -1x + Smoke Bomb 0đ) -> 25% rủi ro
    // ═════════════════════════════════════════════════════════════════════════
    const slotHazard2 = getCard("THE_KNIGHT"); // Smoke Bomb 0đ
    const slotSafe1 = getCard("THE_HIGH_PRIESTESS"); // +1x
    const slotSafe2 = getCard("TEMPERANCE"); // +1x
    quotaArchetypes = [slotFool, slotHazard2, slotHigh, slotSupport, slotSafe1, slotSafe2];
  } else {
    // ═════════════════════════════════════════════════════════════════════════
    // ROUND 2+ (NEUTRAL / DOMINANT): ĐÚNG 3 SLOT TRỪ (Tower + 2 Bombs) -> 37.5% rủi ro
    // ═════════════════════════════════════════════════════════════════════════
    const slotHazard2 = Math.random() < 0.5 ? getCard("THE_DEVIL") : getCard("THE_HANGED_MAN");
    const slotHazard3 = slotHazard2.key === "THE_DEVIL" ? getCard("THE_HANGED_MAN") : getCard("THE_KNIGHT");

    // Steal slot (Chariot 50% or Death 100%, fallback Priestess/Temperance +1x if cannot steal)
    const stealCard = Math.random() < 0.6 ? getCard("THE_CHARIOT") : getCard("THE_DEATH");
    const slotSteal = stealCard && stealCard.isSteal
      ? stealCard
      : Math.random() < 0.5
      ? getCard("THE_HIGH_PRIESTESS")
      : getCard("TEMPERANCE");

    quotaArchetypes = [slotFool, slotHazard2, slotHazard3, slotHigh, slotSupport, slotSteal];
  }

  const allEightArchetypes = [defaultPlus, defaultMinus, ...quotaArchetypes];

  return {
    defaultPlus,
    defaultMinus,
    quotaArchetypes,
    allEightArchetypes,
  };
}

/**
 * Generates tiles specifically for Variant 1: MEMORY_PAIRS (16 tiles = 8 pairs, 4x4 grid).
 * Rules:
 * - 8 pairs created according to the 8 Slot Quotas.
 * - Duplicated to 16 cards, filling a 4x4 grid with zero empty spaces.
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
  const { allEightArchetypes } = generateTarotQuotaArchetypes(basePoints, options);

  const tileItems: Omit<MysteryTile, "id" | "label">[] = [];
  allEightArchetypes.forEach((arch) => {
    const pairKey = `PAIR_${arch.key}`;
    // Duplicate 2 cards per pair
    for (let c = 0; c < 2; c++) {
      tileItems.push({
        icon: arch.icon,
        isOpened: false,
        type: arch.type,
        storyTitle: arch.storyTitle,
        storyDescription: arch.storyDescription,
        effectType: arch.effectType,
        deltaPoints: arch.deltaPoints,
        pairKey,
        tarotCardKey: arch.key,
        bombDoorType: arch.bombType,
        givesShield: arch.givesShield,
        givesHeart: arch.givesHeart,
        stealFraction: arch.stealFraction,
      });
    }
  });

  // Shuffle all 16 items
  const shuffled = [...tileItems].sort(() => Math.random() - 0.5);
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
/**
 * Tạo 16 thẻ (8 cặp, lưới 4x4) cho MEMORY_PAIRS trong Chế độ Sinh Tử (khi trả lời sai):
 * - 25% An toàn (2 cặp): 1 Cặp Thoát Hiểm 🕊️ + 1 Cặp Chàng Khờ 🃏
 * - 75% Bẫy/Bom (6 cặp): 2 Cặp Tòa Tháp ⚡ (-1x), 1 Cặp Bom Khói 💨 (-50%), 2 Cặp Bom Tối 🌑 (-1x), 1 Cặp Bom Từ Thiện 🎁
 * - Khớp lưới 4x4 hoàn hảo, không còn ô trống thừa thãi!
 */
export function generateSurvivalMemoryPairsTiles(
  basePoints: number = 20,
  _options?: {
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
    tarotCardKey?: AncientTarotCardKey;
  }> = [
    // 1. Cặp Thoát Hiểm An Toàn (🕊️)
    {
      pairKey: "PAIR_ESCAPE",
      icon: "🕊️",
      type: "ESCAPE_SAFE",
      storyTitle: "🕊️ Thoát Hiểm",
      storyDescription: "Kỳ tích xuất hiện! Ghép trúng cặp Thoát Hiểm, bảo toàn nguyên vẹn điểm số và tim!",
      effectType: "BONUS_POINTS",
      deltaPoints: 0,
    },
    // 2. Cặp Chàng Khờ (🃏 The Fool - Safe 0đ)
    {
      pairKey: "PAIR_THE_FOOL",
      icon: "🃏",
      type: "ESCAPE_SAFE",
      storyTitle: "0. Chàng Khờ (The Fool)",
      storyDescription: "Vô ưu vô lo! Thoát nạn bình an vô sự mà không chịu bất kỳ hình phạt nào (±0đ)!",
      effectType: "BONUS_POINTS",
      deltaPoints: 0,
      tarotCardKey: "THE_FOOL",
    },
    // 3. Cặp Tòa Tháp Sụp Đổ #1 (⚡ -1x)
    {
      pairKey: "PAIR_THE_TOWER_1",
      icon: "⚡",
      type: "TRAP",
      storyTitle: `XVI. Tòa Tháp (The Tower) -${pPenalty}đ`,
      storyDescription: `Sấm sét giáng xuống! Ghép trúng Tòa Tháp: Bị trừ ${pPenalty} điểm (100% điểm gốc câu hỏi)!`,
      effectType: "LOSE_POINTS",
      deltaPoints: -pPenalty,
      tarotCardKey: "THE_TOWER",
    },
    // 4. Cặp Tòa Tháp Sụp Đổ #2 (⚡ -1x)
    {
      pairKey: "PAIR_THE_TOWER_2",
      icon: "⚡",
      type: "TRAP",
      storyTitle: `XVI. Tòa Tháp (The Tower) -${pPenalty}đ`,
      storyDescription: `Cột trụ đổ sập! Ghép trúng Tòa Tháp: Bị trừ ${pPenalty} điểm (100% điểm gốc câu hỏi)!`,
      effectType: "LOSE_POINTS",
      deltaPoints: -pPenalty,
      tarotCardKey: "THE_TOWER",
    },
    // 5. Cặp Bom Khói (💨 -50%)
    {
      pairKey: "PAIR_BOMB_SMOKE",
      icon: "💨",
      type: "BOMB_SMOKE",
      storyTitle: `💨 Bom Khói -${pSmokePenalty}đ`,
      storyDescription: `Ghép trúng bẫy khói mù: Chế độ Sinh Tử phạt trừ 50% điểm gốc câu hỏi (-${pSmokePenalty}đ)!`,
      effectType: "LOSE_POINTS",
      deltaPoints: -pSmokePenalty,
    },
    // 6. Cặp Bom Tối #1 (🌑 -1x)
    {
      pairKey: "PAIR_BOMB_DARK_1",
      icon: "🌑",
      type: "BOMB_DARK",
      storyTitle: `🌑 Bom Tối -${pPenalty}đ`,
      storyDescription: `Ghép trúng kíp nổ hắc ám: Chế độ Sinh Tử phạt trừ ${pPenalty} điểm gốc câu hỏi!`,
      effectType: "LOSE_POINTS",
      deltaPoints: -pPenalty,
    },
    // 7. Cặp Bom Tối #2 (🌑 -1x)
    {
      pairKey: "PAIR_BOMB_DARK_2",
      icon: "🌑",
      type: "BOMB_DARK",
      storyTitle: `🌑 Bom Tối -${pPenalty}đ`,
      storyDescription: `Hố đen năng lượng! Chế độ Sinh Tử phạt trừ ${pPenalty} điểm gốc câu hỏi!`,
      effectType: "LOSE_POINTS",
      deltaPoints: -pPenalty,
    },
    // 8. Cặp Bom Từ Thiện (🎁)
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
        tarotCardKey: p.tarotCardKey,
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
 * Generates tiles specifically for Variant 2: ONE_SHOT_DOORS (8 Cánh Cửa Bí Mật).
 * Conforms strictly to the 8 Slot Quotas:
 * - Slot 1: Default Fixed +1x (The Magician)
 * - Slot 2: Default Fixed -1x (The Tower; Underdog = 0đ)
 * - Slot 3: High Multiplier (Max 1 card: The Sun 2x, Wheel 1.5x, or Temperance 1.5x)
 * - Slot 4: Support / Vitality (Max 1 card: The Emperor Shield or Strength Heart)
 * - Slot 5: Rival Interaction / Steal (Round 1: +1x Priestess; Round 2+: Chariot 50% or Death 100%)
 * - Slot 6: Neutral / Balance (The Fool ±0đ or Priestess +1x)
 * - Slot 7: Safe Common Reward (Priestess +1x, Wheel +1.5x, or Temperance +1.5x)
 * - Slot 8: Controlled Hazard (Round 1: 0 bombs -> Safe reward; Round 2+: Exactly 1 iconic bomb)
 * Total = 8 doors.
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
  const { allEightArchetypes } = generateTarotQuotaArchetypes(basePoints, options);
  const hasPeekPerk = options?.promoPerk && getPerkType(options.promoPerk) === "PEEK_PROMO";

  const shuffled = [...allEightArchetypes].sort(() => Math.random() - 0.5);

  return shuffled.map((arch, idx) => {
    const isPeekedDoor = Boolean(hasPeekPerk && arch.key === "THE_TOWER");
    return {
      id: idx + 1,
      label: `Cửa #${idx + 1}`,
      icon: arch.icon,
      isOpened: false,
      type: arch.type,
      storyTitle: arch.storyTitle,
      storyDescription: arch.storyDescription,
      effectType: arch.effectType,
      deltaPoints: arch.deltaPoints,
      tarotCardKey: arch.key,
      bombDoorType: arch.bombType,
      givesShield: arch.givesShield,
      givesHeart: arch.givesHeart,
      stealFraction: arch.stealFraction,
      isPeeked: isPeekedDoor,
      peekLabel: isPeekedDoor ? `⚡ Tháp Bẫy -${Math.abs(arch.deltaPoints)}đ` : undefined,
      peekIcon: isPeekedDoor ? "⚡" : undefined,
    };
  });
}

/**
 * Tạo 8 cánh cửa cho ONE_SHOT_DOORS trong Chế độ Sinh Tử (khi trả lời sai):
 * - 25% An toàn (2 cửa): 1 Cửa Thoát Hiểm An Toàn 🕊️ + 1 Cửa Chàng Khờ 🃏 (±0đ)
 * - 75% Bẫy/Bom (6 cửa): 2 Cửa Tòa Tháp ⚡ (-1x), 1 Cửa Bom Khói 💨 (-50%), 2 Cửa Bom Tối 🌑 (-1x), 1 Cửa Bom Từ Thiện 🎁
 * - Khớp lưới 8 cửa hoàn hảo, không còn ô trống thừa thãi!
 */
export function generateSurvivalOneShotDoorsTiles(
  basePoints: number = 20,
  _options?: {
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
    tarotCardKey?: AncientTarotCardKey;
    isBasePenalty?: boolean;
    isBombDoor?: boolean;
    bombDoorType?: "BOMB_SMOKE" | "BOMB_DARK" | "BOMB_CHARITY";
  }> = [
    // 1. Cửa Thoát Hiểm An Toàn (🕊️)
    {
      icon: "🕊️",
      type: "ESCAPE_SAFE",
      storyTitle: "🕊️ Thoát Hiểm",
      storyDescription: "May mắn tuyệt đỉnh! Bạn đã mở đúng Cửa Thoát Hiểm, bảo toàn nguyên vẹn điểm số và tim!",
      effectType: "BONUS_POINTS",
      deltaPoints: 0,
    },
    // 2. Cửa Chàng Khờ (🃏 The Fool - Safe 0đ)
    {
      icon: "🃏",
      type: "ESCAPE_SAFE",
      storyTitle: "0. Chàng Khờ (The Fool)",
      storyDescription: "Vô ưu vô lo! Mở đúng cánh cửa Kẻ Khờ, thoát nạn an toàn tuyệt đối mà không mất điểm hay tim (±0đ)!",
      effectType: "BONUS_POINTS",
      deltaPoints: 0,
      tarotCardKey: "THE_FOOL",
    },
    // 3. Cửa Tòa Tháp Sụp Đổ #1 (⚡ -1x)
    {
      icon: "⚡",
      type: "TRAP",
      storyTitle: `XVI. Tòa Tháp (The Tower) -${pPenalty}đ`,
      storyDescription: `Sấm sét giáng xuống! Dính bẫy Tòa Tháp: Bị trừ ${pPenalty} điểm (100% điểm gốc câu hỏi)!`,
      effectType: "LOSE_POINTS",
      deltaPoints: -pPenalty,
      isBasePenalty: true,
      tarotCardKey: "THE_TOWER",
    },
    // 4. Cửa Tòa Tháp Sụp Đổ #2 (⚡ -1x)
    {
      icon: "⚡",
      type: "TRAP",
      storyTitle: `XVI. Tòa Tháp (The Tower) -${pPenalty}đ`,
      storyDescription: `Cột trụ đổ sập! Dính bẫy Tòa Tháp: Bị trừ ${pPenalty} điểm (100% điểm gốc câu hỏi)!`,
      effectType: "LOSE_POINTS",
      deltaPoints: -pPenalty,
      isBasePenalty: true,
      tarotCardKey: "THE_TOWER",
    },
    // 5. Cửa Bom Khói (💨 -50%)
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
    // 6. Cửa Bom Hắc Ám #1 (🌑 -1x)
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
    // 7. Cửa Bom Hắc Ám #2 (🌑 -1x)
    {
      icon: "🌑",
      type: "BOMB_DARK",
      storyTitle: `🌑 Bom Tối -${pPenalty}đ`,
      storyDescription: `Hố đen năng lượng! Chế độ Sinh Tử phạt trừ ${pPenalty} điểm gốc câu hỏi!`,
      effectType: "LOSE_POINTS",
      deltaPoints: -pPenalty,
      isBombDoor: true,
      bombDoorType: "BOMB_DARK",
    },
    // 8. Cửa Bom Từ Thiện (🎁)
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
    tarotCardKey: d.tarotCardKey,
    isBasePenalty: d.isBasePenalty,
    isBombDoor: d.isBombDoor,
    bombDoorType: d.bombDoorType,
  }));
}

/**
 * Generates tiles specifically for Variant 4: TAROT_DESTINY (5 cards).
 */
/**
 * Generates tiles specifically for Variant 4: TAROT_DESTINY (8 ancient archetype cards).
 * Uses generateTarotQuotaArchetypes to ensure balanced archetypes (Sun, Emperor, Steal, Fool, Bombs).
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
  const { allEightArchetypes } = generateTarotQuotaArchetypes(basePoints, options);
  const shuffled = [...allEightArchetypes].sort(() => Math.random() - 0.5);
  return shuffled.map((arch, idx) => ({
    id: idx + 1,
    label: `Lá #${idx + 1}`,
    tarotName: `${arch.nameVi} (${arch.nameEn})`,
    icon: arch.icon,
    isOpened: false,
    type: arch.type,
    storyTitle: arch.storyTitle,
    storyDescription: arch.storyDescription,
    effectType: arch.effectType,
    deltaPoints: arch.deltaPoints,
    tarotCardKey: arch.key,
    bombDoorType: arch.bombType,
    givesShield: arch.givesShield,
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
  if (template.effectType === "STEAL_POINTS") {
    // Quy tắc tuyệt đối: Số điểm cướp KHÔNG BAO GIỜ được vượt quá số điểm gốc câu hỏi
    if (basePoints <= 10) {
      delta = 10;
    } else if (basePoints <= 20) {
      delta = [10, 15, 20][Math.floor(Math.random() * 3)];
    } else if (basePoints <= 30) {
      delta = [15, 20, 25, 30][Math.floor(Math.random() * 4)];
    } else {
      delta = [20, 25, 30, 40][Math.floor(Math.random() * 4)];
    }
    delta = Math.min(delta, basePoints);
  } else if (template.effectType === "BONUS_POINTS") {
    if (basePoints <= 10) {
      // 10đ tier: +10đ, +15đ, +20đ (tối đa 2x điểm gốc = 20đ, tuyệt đối không xuất hiện 25đ)
      delta = [10, 15, 20][Math.floor(Math.random() * 3)];
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
    // Ràng buộc nghiêm ngặt: điểm cộng thưởng tối đa không bao giờ vượt quá 2x điểm gốc
    delta = Math.min(delta, basePoints * 2);
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
 * - 25% An Toàn: 12.5% Lá Thoát Hiểm 🕊️ + 12.5% Chàng Khờ 🃏 (±0đ)
 * - 75% Bẫy / Bom: 25% Tòa Tháp ⚡ (-1x), 12.5% Bom Khói 💨 (-50%), 25% Bom Tối 🌑 (-1x), 12.5% Bom Từ Thiện 🎁
 * - Tuyệt đối 0% lá cộng điểm
 */
export function generateSurvivalPushYourLuckCard({
  drawIndex = 1,
  basePoints = 10,
  teamScore: _teamScore = 0,
  options: _options,
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

  // 1. 12.5% Thoát Hiểm An Toàn (🕊️)
  if (rand < 0.125) {
    return {
      id,
      label,
      icon: "🕊️",
      isOpened: false,
      type: "ESCAPE_SAFE",
      storyTitle: "🕊️ Thoát Hiểm",
      storyDescription: "Thần may mắn mỉm cười! Rút trúng lá Thoát Hiểm ngoạn mục, bảo toàn nguyên vẹn điểm số và tim!",
      effectType: "BONUS_POINTS",
      deltaPoints: 0,
    };
  }

  // 2. 12.5% Chàng Khờ (🃏 The Fool - Safe 0đ)
  if (rand < 0.25) {
    return {
      id,
      label,
      icon: "🃏",
      isOpened: false,
      type: "ESCAPE_SAFE",
      storyTitle: "0. Chàng Khờ (The Fool)",
      storyDescription: "Vô ưu vô lo! Rút trúng lá Chàng Khờ, thoát nạn an toàn tuyệt đối mà không mất điểm hay tim (±0đ)!",
      effectType: "BONUS_POINTS",
      deltaPoints: 0,
      tarotCardKey: "THE_FOOL",
    };
  }

  // 3. 25% Tòa Tháp Sụp Đổ (⚡ -1x)
  if (rand < 0.50) {
    return {
      id,
      label,
      icon: "⚡",
      isOpened: false,
      type: "TRAP",
      storyTitle: `XVI. Tòa Tháp (The Tower) -${pPenalty}đ`,
      storyDescription: `Sấm sét giáng xuống! Rút phải Tòa Tháp sụp đổ: Bị trừ ${pPenalty} điểm (100% điểm gốc câu hỏi)!`,
      effectType: "LOSE_POINTS",
      deltaPoints: -pPenalty,
      tarotCardKey: "THE_TOWER",
    };
  }

  // 4. 12.5% Bom Khói (💨 -50%)
  if (rand < 0.625) {
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
  }

  // 5. 25% Bom Tối (🌑 -1x)
  if (rand < 0.875) {
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
  }

  // 6. 12.5% Bom Từ Thiện (🎁)
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
  teamShields,
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
  teamShields?: Record<string, { activeFromTurnIndex: number; expiresAfterTurnIndex: number; sourceCard?: string }>;
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

  // CƠ CHẾ KHIÊN HOÀNG ĐẾ (THE_EMPEROR): Đánh giá khiên còn hiệu lực cho đội hiện tại
  const updatedTeamShields: Record<string, { activeFromTurnIndex: number; expiresAfterTurnIndex: number; sourceCard?: string }> = {};
  let hasActiveShield = false;
  if (teamShields) {
    for (const [tid, s] of Object.entries(teamShields)) {
      const shield = s as { activeFromTurnIndex: number; expiresAfterTurnIndex: number; sourceCard?: string };
      if (turnIndex <= shield.expiresAfterTurnIndex) {
        updatedTeamShields[tid] = shield;
        if (tid === currentTeam.id && turnIndex >= shield.activeFromTurnIndex) {
          hasActiveShield = true;
        }
      }
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
        faceUpPenaltyTileIds: [],
        isBombRescueActive: false,
        activePenaltyPairKey: null,
        attemptsUsed: 0,
        maxAttempts: getPerkType(promoPerk) === "EXTRA_ATTEMPT_PROMO" ? 6 : 5,
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
        discardedDoorIds: [],
        penaltyDoorsCount: undefined,
        hasBombDetected: false,
        phase: "SELECT_4",
        radarLight: undefined,
        radarLightStep1: undefined,
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
    hasShield: hasActiveShield || getPerkType(promoPerk) === "SHIELD_PROMO",
    teamShields: updatedTeamShields,
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
        discardedDoorIds: [],
        penaltyDoorsCount: undefined,
        hasBombDetected: false,
        radarLight: undefined,
        radarLightStep1: undefined,
        phase: "SELECT_4",
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
        faceUpPenaltyTileIds: [],
        isBombRescueActive: false,
        activePenaltyPairKey: null,
        attemptsUsed: 0,
        maxAttempts: 999, // Sudden Death: không giới hạn lượt cho tới khi ghép trúng cặp đầu tiên!
        attemptedPairs: [],
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
  temperanceBonusRecipients?: Array<{
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
    state.cardsFlippedCount = (state.cardsFlippedCount || 0) + 1;

    // ═════════════════════════════════════════════════════════════════════════
    // CHẾ ĐỘ SINH TỬ (SURVIVAL PENALTY MODE) - LẬT CẶP KHI TRẢ LỜI SAI:
    // - Sudden Death: Không giới hạn lượt, chơi cho đến khi ghép trúng CẶP ĐẦU TIÊN!
    // - Ghép trúng Cặp Thoát Hiểm 🕊️ hoặc Chàng Khờ 🃏 -> Thoát hiểm (0đ phạt, bảo toàn tim)!
    // - Ghép trúng Cặp Bẫy/Bom -> Thực thi hình phạt ngay lập tức và kết thúc lượt!
    // - Toàn bộ Perk bị vô hiệu hoá.
    // ═════════════════════════════════════════════════════════════════════════
    if (state.isPenaltySurvivalMode) {
      const isEscapeTile = (t: MysteryTile | undefined | null) =>
        Boolean(
          t &&
            (t.pairKey === "PAIR_ESCAPE" ||
              t.pairKey === "PAIR_THE_FOOL" ||
              t.tarotCardKey === "THE_FOOL" ||
              t.type === "ESCAPE_SAFE")
        );

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
          rewardText: "🕊️ Kỳ Tích Sinh Tử! Bạn đã ghép thành công cặp Thoát Hiểm, bảo toàn nguyên vẹn điểm số và tim!",
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

      const executeSurvivalPenalty = (penaltyKey: string) => {
        state.tiles.forEach((t) => { t.isOpened = true; });

        const isTower = penaltyKey?.includes("THE_TOWER") || penaltyKey === "PAIR_TRAP_BASE";
        if (isTower) {
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
            rewardText: `⚡ Ghép trúng Cặp Tòa Tháp Sụp Đổ! Chế độ Sinh Tử phạt trừ ${penalty} điểm (100% điểm gốc câu hỏi)!`,
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
        else if (penaltyKey === "PAIR_BOMB_DARK" || penaltyKey?.startsWith("PAIR_BOMB_DARK")) bombType = "BOMB_DARK";

        const outcome = resolveBombOutcome({
          bombType,
          team,
          allTeams,
          storyDescription: `Ghép trúng ${
            bombType === "BOMB_SMOKE" ? "Bom Khói" : bombType === "BOMB_CHARITY" ? "Bom Tặng" : "Bom Tối"
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
          rewardText: `💥 ${outcome.bombExploded.title}: ${outcome.penaltyText}`,
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

      // Đánh dấu mở lá hiện tại
      state.tiles = state.tiles.map((t) =>
        Number(t.id) === numTileId ? { ...t, isOpened: true } : t
      );
      state.lastFlippedTile = tile;

      // Bước 1: Lật lá thứ 1
      if (!memState.firstFlippedTileId) {
        memState.firstFlippedTileId = tile.id;
        state.memoryPairsState = { ...memState };
        return {
          updatedState: { ...state, tiles: [...state.tiles], memoryPairsState: { ...memState } },
          isBomb: false,
          scorePenalty: 0,
        };
      }

      // Bước 2: Lật lá thứ 2
      if (Number(memState.firstFlippedTileId) === numTileId) {
        return { updatedState: state, isBomb: false, scorePenalty: 0 };
      }

      memState.secondFlippedTileId = tile.id;
      const firstTile = state.tiles.find((t) => Number(t.id) === Number(memState.firstFlippedTileId));
      const secondTile = tile;

      memState.attemptsUsed += 1;
      const isMatch = Boolean(firstTile && secondTile && firstTile.pairKey === secondTile.pairKey);

      if (isMatch && firstTile) {
        // Cặp đầu tiên đã ghép trúng!
        memState.matchedPairKey = firstTile.pairKey;
        if (isEscapeTile(firstTile)) {
          return executeSurvivalEscape();
        } else {
          return executeSurvivalPenalty(firstTile.pairKey || "PAIR_BOMB_DARK");
        }
      }

      // Không trùng khớp: Reset 2 lá úp lại, người chơi tiếp tục thử lượt sau (Sudden Death)
      memState.isMismatchResolving = true;
      state.memoryPairsState = { ...memState };
      return {
        updatedState: { ...state, tiles: [...state.tiles], memoryPairsState: { ...memState } },
        isBomb: false,
        scorePenalty: 0,
        shouldResetMismatchedCards: true,
      };
    }

    const isPenaltyTile = (t: MysteryTile | undefined | null): boolean => {
      if (!t) return false;
      if (t.tarotCardKey === "THE_FOOL" || t.pairKey === "PAIR_THE_FOOL") return true;
      if (t.tarotCardKey === "THE_TOWER" || t.tarotCardKey === "THE_KNIGHT" || t.tarotCardKey === "THE_DEVIL" || t.tarotCardKey === "THE_HANGED_MAN") return true;
      if (t.pairKey?.startsWith("PAIR_BOMB") || t.pairKey?.startsWith("PAIR_TRAP")) return true;
      if (t.pairKey === "PAIR_THE_TOWER" || t.pairKey === "PAIR_THE_KNIGHT" || t.pairKey === "PAIR_THE_DEVIL" || t.pairKey === "PAIR_THE_HANGED_MAN") return true;
      if (t.type !== "REWARD" && t.type !== "ESCAPE_SAFE") return true;
      if (t.deltaPoints && t.deltaPoints < 0) return true;
      return false;
    };

    const isNeutralTile = (t: MysteryTile | undefined | null): boolean => {
      if (!t) return false;
      return (t.deltaPoints === 0 && t.type === "REWARD");
    };

    const getPenaltyKey = (t: MysteryTile | undefined | null): string | null => {
      if (!t) return null;
      if (isPenaltyTile(t)) return t.pairKey || "PAIR_BOMB";
      return null;
    };

    const hasExtraPot = getPerkType(state.promoPerk) === "EXTRA_POT_PROMO";
    const extraPotBonus = hasExtraPot ? 5 : 0;
    const previouslyKeptBombs = memState.keptBombTileIds || [];

    const executePenalty = ({
      penaltyKey,
      cancelOldKey,
    }: {
      penaltyKey: string;
      cancelOldKey?: string | null;
    }) => {
      memState.isBombRescueActive = false;
      memState.activePenaltyPairKey = null;
      memState.rescueFormedNegativePairs = [];
      state.memoryPairsState = { ...memState };

      const getPenaltyName = (k: string) => {
        if (k === "PAIR_THE_FOOL") return "BẪY KẺ KHỜ";
        if (k === "PAIR_THE_KNIGHT" || k === "PAIR_BOMB_SMOKE" || k === "PAIR_TRAP") return "BOM KHÓI";
        if (k === "PAIR_THE_TOWER" || k === "PAIR_TRAP_BASE") return "THÁP BẪY SỤP ĐỔ";
        if (k === "PAIR_THE_DEVIL" || k === "PAIR_BOMB_DARK") return "BOM HẮC ÁM";
        if (k === "PAIR_THE_HANGED_MAN" || k === "PAIR_BOMB_CHARITY") return "BOM TỪ THIỆN";
        return "BẪY PHẠT";
      };

      const cancelPrefix = cancelOldKey
        ? `⚠️ ĐÃ HỦY BỎ ${getPenaltyName(cancelOldKey)} CŨ! Thực hiện phạt theo cặp mới: `
        : "";

      // Kiểm tra khiên thần bảo vệ (chỉ có hiệu lực đúng 1 lần duy nhất trong minigame)
      if (state.hasShield) {
        state.hasShield = false;
        memState.activePenaltyPairKey = null;
        memState.isBombRescueActive = false;
        memState.rescueFormedNegativePairs = [];
        state.potPoints = 0;
        state.storyResult = {
          teamId: team.id,
          teamName: team.name,
          teamColor: team.color || "#ef4444",
          rewardText: `${cancelPrefix}🛡️ KHIÊN THẦN ĐÃ HẤP THỤ BẪY PHẠT! Cặp thẻ bẫy bị vô hiệu hóa an toàn (0đ phạt). Đội bạn được bảo toàn điểm số và tiếp tục lật các cặp thẻ còn lại!`,
          scoreDelta: 0,
          oldScore: team.score || 0,
          newScore: team.score || 0,
        };
        memState.isMismatchResolving = true;

        const isRoundOver = memState.attemptsUsed >= memState.maxAttempts;
        const currentRound = memState.round || 1;

        if (isRoundOver) {
          if (currentRound === 1) {
            memState.promptSecondChance = true;
            state.memoryPairsState = { ...memState };
            return {
              updatedState: { ...state, tiles: [...state.tiles], memoryPairsState: { ...memState } },
              isBomb: false,
              scorePenalty: 0,
              finalScoreDelta: 0,
              shouldResetMismatchedCards: true,
            };
          } else {
            return handleRound2Failure();
          }
        }

        state.memoryPairsState = { ...memState };
        return {
          updatedState: { ...state, tiles: [...state.tiles], memoryPairsState: { ...memState } },
          isBomb: false,
          scorePenalty: 0,
          finalScoreDelta: 0,
          shouldResetMismatchedCards: true,
        };
      }

      if (penaltyKey === "PAIR_THE_FOOL") {
        // Cặp Kẻ Khờ: Bẫy trung lập không trừ điểm (±0đ), nhưng kết thúc lượt chơi (Turn Over)!
        state.bombExploded = {
          type: "SMOKE",
          title: "🃏 KẺ KHỜ (THE FOOL)!",
          description: "Ghép trúng quẻ bài Kẻ Khờ trung lập. Lượt kết thúc an toàn mà không bị trừ điểm.",
          penaltyText: "Không bị trừ điểm (±0đ), kết thúc lượt thi.",
        };
        state.phase = "TURN_SUMMARY";
        state.turnFinishedReason = "BOMB_HIT";
        state.potPoints = 0;
        const oldScore = team.score || 0;
        const newScore = oldScore;

        state.storyResult = {
          teamId: team.id,
          teamName: team.name,
          teamColor: team.color || "#f59e0b",
          rewardText: `${cancelPrefix}🃏 Bẫy Kẻ Khờ kích hoạt! Bạn không bị trừ điểm (±0đ), nhưng lượt chơi đã kết thúc!`,
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
      }

      if (penaltyKey === "PAIR_THE_KNIGHT" || penaltyKey === "PAIR_BOMB_SMOKE" || penaltyKey === "PAIR_TRAP") {
        // Cặp Bom Khói: Mất điểm câu hỏi hiện tại (0đ), bảo toàn tổng điểm (delta = 0)
        state.bombExploded = {
          type: "SMOKE",
          title: "💨 BOM KHÓI PHÁT NỔ!",
          description: "Kích hoạt Bom Khói: Mất toàn bộ điểm tích lũy của câu hỏi này (0đ), bảo toàn tổng điểm!",
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
          rewardText: `${cancelPrefix}💨 Bom Khói kích hoạt! Mất toàn bộ điểm câu hỏi này (0đ), bảo toàn tổng điểm!`,
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
      } else if (penaltyKey === "PAIR_THE_TOWER" || penaltyKey === "PAIR_TRAP_BASE") {
        // Cặp The Tower / Bẫy Trừ Gốc: Trừ đúng điểm gốc câu hỏi (nếu Underdog: 0đ)
        const penalty = riskTier === "UNDERDOG" ? 0 : (state.baseQuestionPoints || 10);
        state.potPoints = 0;
        state.bombExploded = {
          type: penalty === 0 ? "SMOKE" : "MINOR",
          title: "⚡ THÁP BẪY SỤP ĐỔ (THE TOWER)!",
          description: "Ghép trúng cặp Tháp Bẫy Sụp Đổ mang năng lượng hỗn loạn và sụp đổ!",
          penaltyText: penalty === 0
            ? "Thế trận yếu thế bảo hộ né phạt an toàn, điểm số được bảo toàn."
            : `Bị phạt trừ -${penalty} điểm gốc câu hỏi từ tổng điểm.`,
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
            ? `${cancelPrefix}⚡ Ghép trúng Tháp Bẫy Sụp Đổ! Nhờ thế trận yếu thế, thần hộ mệnh bảo hộ né phạt an toàn (0đ)!`
            : `${cancelPrefix}⚡ Ghép trúng Tháp Bẫy Sụp Đổ! Bị phạt trừ -${penalty} điểm gốc câu hỏi!`,
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
      } else {
        // Cặp Bom Hắc Ám / Bom Từ Thiện / Bom khác
        let bombType: "BOMB_SMOKE" | "BOMB_DARK" | "BOMB_CHARITY" = "BOMB_DARK";
        if (penaltyKey === "PAIR_THE_DEVIL" || penaltyKey === "PAIR_BOMB_DARK") bombType = "BOMB_DARK";
        else if (penaltyKey === "PAIR_THE_HANGED_MAN" || penaltyKey === "PAIR_BOMB_CHARITY") bombType = "BOMB_CHARITY";
        else bombType = rollBombTypeForMinigame("MEMORY_PAIRS", team.score || 0, { currentRound, riskTier });

        const outcome = resolveBombOutcome({
          bombType,
          team,
          allTeams,
          storyDescription: `${cancelPrefix}Ghép trúng Cặp ${getPenaltyName(penaltyKey)}!`,
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
    // STEP 3: Lật lá bài thứ 3 (trong lượt giải cứu bom khi bốc trúng lá tiêu cực cùng cặp từ lượt trước)
    // ─────────────────────────────────────────────────────────────────────────
    if (memState.isBombRescueActive && memState.firstFlippedTileId && memState.secondFlippedTileId && !memState.thirdFlippedTileId) {
      if (Number(tile.id) === Number(memState.firstFlippedTileId) || Number(tile.id) === Number(memState.secondFlippedTileId)) {
        return { updatedState: state, isBomb: false, scorePenalty: 0 };
      }

      const card1 = state.tiles.find((t) => Number(t.id) === Number(memState.firstFlippedTileId));
      const card2 = state.tiles.find((t) => Number(t.id) === Number(memState.secondFlippedTileId));
      const card3 = tile;

      memState.thirdFlippedTileId = tile.id;
      memState.attemptsUsed += 1;
      state.lastFlippedTile = tile;

      // Đánh dấu mở cả 3 lá
      state.tiles = state.tiles.map((t) =>
        Number(t.id) === numTileId ||
        (card1 && Number(t.id) === Number(card1.id)) ||
        (card2 && Number(t.id) === Number(card2.id))
          ? { ...t, isOpened: true }
          : { ...t }
      );

      // ─────────────────────────────────────────────────────────────────────
      // ƯU TIÊN 1: CẶP BÀI TÍCH CỰC (THƯỞNG / THOÁT HIỂM / KHIÊN / TIM)
      // Nếu bất kỳ 2 lá nào trong lượt này tạo thành cặp tích cực, ưu tiên giải cứu thành công!
      // ─────────────────────────────────────────────────────────────────────
      const isPositivePair = (a: MysteryTile | undefined, b: MysteryTile | undefined) => {
        if (!a || !b) return false;
        if (!a.pairKey || a.pairKey !== b.pairKey) return false;
        return !isPenaltyTile(a);
      };

      let matchedPositiveTile: MysteryTile | null = null;
      if (isPositivePair(card2, card3)) {
        matchedPositiveTile = card2!;
      } else if (isPositivePair(card1, card3)) {
        matchedPositiveTile = card1!;
      } else if (isPositivePair(card1, card2)) {
        matchedPositiveTile = card1!;
      }

      if (matchedPositiveTile) {
        const winCard = matchedPositiveTile;
        memState.matchedPairKey = winCard.pairKey;
        memState.isBombRescueActive = false;
        memState.activePenaltyPairKey = null;
        memState.rescueFormedNegativePairs = [];
        state.memoryPairsState = { ...memState };

        if (winCard.givesShield) {
          state.hasShield = true;
          const teamsCount = Math.max(1, allTeams?.length || 2);
          const curTurn = state.currentTurnIndex || 0;
          state.teamShields = {
            ...(state.teamShields || {}),
            [team.id]: {
              activeFromTurnIndex: curTurn + 1,
              expiresAfterTurnIndex: curTurn + teamsCount,
              sourceCard: "THE_EMPEROR",
            },
          };
        }
        let winCardHeartMaxed = false;
        if (winCard.givesHeart) {
          const heartsRecord = { ...(state.teamHearts || {}) };
          const maxHearts = state.initialHeartsPerTeam ?? 3;
          const curHearts = heartsRecord[team.id] ?? state.initialHeartsPerTeam ?? 1;
          if (curHearts < maxHearts) {
            heartsRecord[team.id] = curHearts + 1;
            state.teamHearts = heartsRecord;
          } else {
            winCardHeartMaxed = true;
          }
        }

        let temperanceBonusRecipients: Array<{ teamId: string; teamName: string; points: number }> | undefined;
        if (winCard.tarotCardKey === "TEMPERANCE" || winCard.pairKey === "PAIR_TEMPERANCE") {
          const pHalf = roundToMultipleOfFive((state.baseQuestionPoints || 10) * 0.5);
          const otherTeams = (allTeams || []).filter((t) => t.id !== team.id && !t.isEliminated);
          if (otherTeams.length > 0) {
            temperanceBonusRecipients = otherTeams.map((t) => ({
              teamId: t.id,
              teamName: t.name,
              points: pHalf,
            }));
          }
        }

        let finalDelta = 0;
        let victimTeamId: string | undefined;
        let victimTeamName: string | undefined;
        let stolenPoints: number | undefined;

        if (winCard.tarotCardKey === "THE_FOOL" || winCard.pairKey === "PAIR_THE_FOOL") {
          finalDelta = 0;
        } else if (winCard.effectType === "STEAL_POINTS") {
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

        let rewardText = winCard.tarotCardKey === "THE_FOOL"
          ? `🃏 Hóa giải bẫy thành công! Ghép trúng cặp Kẻ Khờ, bảo toàn thế trận an toàn tuyệt đối (±0đ)!`
          : extraPotBonus > 0
          ? `🎉 Thoát hiểm ngoạn mục! Hóa giải bẫy phạt và ghép chính xác cặp ${winCard.storyTitle}! Nhận trọn vẹn +${baseReward}đ và +${extraPotBonus}đ từ Quỹ thưởng (Tổng +${finalDelta} điểm)!`
          : `🎉 Thoát hiểm ngoạn mục! Hóa giải bẫy phạt và ghép chính xác cặp ${winCard.storyTitle}! Nhận trọn vẹn +${finalDelta} điểm!`;

        if (stolenPoints && victimTeamName) {
          rewardText += ` (🗡️ Đạo Tặc đánh cắp +${stolenPoints}đ từ Đội ${victimTeamName}!)`;
        }
        if (winCardHeartMaxed) {
          rewardText += ` (❤️ Đã đạt tối đa ${state.initialHeartsPerTeam ?? 3} tim - không hồi thêm)`;
        }
        if (temperanceBonusRecipients && temperanceBonusRecipients.length > 0) {
          const pHalf = roundToMultipleOfFive((state.baseQuestionPoints || 10) * 0.5);
          rewardText += ` (⚖️ Tiết Độ dung hợp: Ban phước chia sẻ +${pHalf}đ cho tất cả đối thủ còn lại!)`;
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
          temperanceBonusRecipients,
        };
      }

      // ─────────────────────────────────────────────────────────────────────
      // ƯU TIÊN 2: KHÔNG CÓ CẶP TÍCH CỰC -> XÁC ĐỊNH CẶP TIÊU CỰC CUỐI CÙNG LỘ DIỆN
      // Kiểm tra xem lá thứ 3 có tạo thêm cặp tiêu cực mới nào không (với card1, card2, hoặc lá cũ)
      // ─────────────────────────────────────────────────────────────────────
      const card3PenaltyKey = getPenaltyKey(card3);
      if (card3PenaltyKey) {
        memState.keptBombTileIds = Array.from(new Set([...previouslyKeptBombs, card3.id]));
        memState.faceUpPenaltyTileIds = Array.from(new Set([...(memState.faceUpPenaltyTileIds || []), card3.id]));

        const alreadyPairedIds = (memState.rescueFormedNegativePairs || []).flatMap((p) => p.cardTileIds);

        if (card1 && card1.pairKey === card3.pairKey && isPenaltyTile(card1) && !alreadyPairedIds.includes(card1.id)) {
          memState.rescueFormedNegativePairs = [
            ...(memState.rescueFormedNegativePairs || []),
            {
              pairKey: card3PenaltyKey,
              formedAtStep: 3,
              cardTileIds: [card1.id, card3.id],
            },
          ];
        } else if (card2 && card2.pairKey === card3.pairKey && isPenaltyTile(card2) && !alreadyPairedIds.includes(card2.id)) {
          memState.rescueFormedNegativePairs = [
            ...(memState.rescueFormedNegativePairs || []),
            {
              pairKey: card3PenaltyKey,
              formedAtStep: 3,
              cardTileIds: [card2.id, card3.id],
            },
          ];
        } else {
          const matchingPriorBombForCard3 = state.tiles.find(
            (t) =>
              previouslyKeptBombs.includes(t.id) &&
              !alreadyPairedIds.includes(t.id) &&
              t.id !== card1?.id &&
              t.id !== card2?.id &&
              t.id !== card3.id &&
              getPenaltyKey(t) === card3PenaltyKey
          );
          if (matchingPriorBombForCard3) {
            memState.rescueFormedNegativePairs = [
              ...(memState.rescueFormedNegativePairs || []),
              {
                pairKey: card3PenaltyKey,
                formedAtStep: 3,
                cardTileIds: [matchingPriorBombForCard3.id, card3.id],
              },
            ];
          }
        }
      }

      // Sắp xếp các cặp tiêu cực đã xuất hiện theo thứ tự bước tạo lập giảm dần (Step 3 > Step 2 > Step 1)
      const formedNegPairs = memState.rescueFormedNegativePairs || [];
      const sortedNegPairs = [...formedNegPairs].sort((a, b) => b.formedAtStep - a.formedAtStep);
      const finalPenaltyPair = sortedNegPairs[0];

      const finalKey = finalPenaltyPair?.pairKey || memState.activePenaltyPairKey || "PAIR_BOMB";
      const previousPenaltyPair = sortedNegPairs.find((p) => p.pairKey !== finalKey)?.pairKey;

      memState.isBombRescueActive = false;
      memState.activePenaltyPairKey = null;
      memState.rescueFormedNegativePairs = [];

      return executePenalty({ penaltyKey: finalKey, cancelOldKey: previousPenaltyPair });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // STEP 1: Lật lá bài thứ 1 của lượt
    // ─────────────────────────────────────────────────────────────────────────
    if (!memState.firstFlippedTileId) {
      memState.firstFlippedTileId = tile.id;
      memState.rescueFormedNegativePairs = [];
      state.lastFlippedTile = tile;

      state.tiles = state.tiles.map((t) =>
        Number(t.id) === numTileId ? { ...t, isOpened: true } : { ...t }
      );

      const tilePenaltyKey = getPenaltyKey(tile);
      if (tilePenaltyKey) {
        memState.keptBombTileIds = Array.from(new Set([...previouslyKeptBombs, tile.id]));
        memState.faceUpPenaltyTileIds = Array.from(new Set([...(memState.faceUpPenaltyTileIds || []), tile.id]));
        // Kiểm tra xem trong previouslyKeptBombs có lá nào CÙNG LOẠI tilePenaltyKey không:
        const matchingPriorBomb = state.tiles.find(
          (t) => previouslyKeptBombs.includes(t.id) && t.id !== tile.id && getPenaltyKey(t) === tilePenaltyKey
        );
        if (matchingPriorBomb) {
          // Ngay ở lá thứ 1, người chơi đã làm lộ lá thứ 2 của cặp phạt tilePenaltyKey từ lượt trước!
          // Kích hoạt giải cứu cho cặp phạt này: lượt tăng lên 3 lá!
          memState.isBombRescueActive = true;
          memState.activePenaltyPairKey = tilePenaltyKey;
          memState.rescueFormedNegativePairs = [
            {
              pairKey: tilePenaltyKey,
              formedAtStep: 1,
              cardTileIds: [matchingPriorBomb.id, tile.id],
            },
          ];
        }
      } else if (isNeutralTile(tile)) {
        // Lá The Fool trung lập: giữ ngửa cố định trên bàn
        memState.keptBombTileIds = Array.from(new Set([...previouslyKeptBombs, tile.id]));
        memState.faceUpPenaltyTileIds = Array.from(new Set([...(memState.faceUpPenaltyTileIds || []), tile.id]));
      }

      state.memoryPairsState = { ...memState };
      return {
        updatedState: { ...state, tiles: [...state.tiles], memoryPairsState: { ...memState } },
        isBomb: false,
        scorePenalty: 0,
      };
    }

    const firstId = Number(memState.firstFlippedTileId);
    const secondId = numTileId;
    if (firstId === secondId) {
      return { updatedState: state, isBomb: false, scorePenalty: 0 };
    }
    const pairMoveKey = `${Math.min(firstId, secondId)}-${Math.max(firstId, secondId)}`;
    const attemptedPairs = memState.attemptedPairs || [];

    if (!memState.isBombRescueActive) {
      if (attemptedPairs.includes(pairMoveKey)) {
        // Đã từng lật chính xác bộ đôi ô này trong vòng! Chống lạm dụng lặp lại nước đi!
        return { updatedState: state, isBomb: false, scorePenalty: 0 };
      }
      memState.attemptedPairs = [...attemptedPairs, pairMoveKey];
    }
    memState.secondFlippedTileId = tile.id;
    state.lastFlippedTile = tile;

    const firstTile = state.tiles.find((t) => Number(t.id) === Number(memState.firstFlippedTileId));

    // Đánh dấu mở cả 2 lá trong lượt này
    state.tiles = state.tiles.map((t) =>
      Number(t.id) === numTileId || (firstTile && Number(t.id) === Number(firstTile.id))
        ? { ...t, isOpened: true }
        : { ...t }
    );

    const firstTilePenaltyKey = getPenaltyKey(firstTile);
    const secondTilePenaltyKey = getPenaltyKey(tile);

    // TH 2.1: Đang trong lượt giải cứu (Card 1 đã kích hoạt giải cứu với 1 lá đã mở trước đó)
    // -> Kiểm tra xem Card 2 có tạo thêm cặp tiêu cực mới với các lá đã mở trước đó không!
    if (memState.isBombRescueActive) {
      if (secondTilePenaltyKey) {
        memState.keptBombTileIds = Array.from(new Set([...previouslyKeptBombs, tile.id]));
        memState.faceUpPenaltyTileIds = Array.from(new Set([...(memState.faceUpPenaltyTileIds || []), tile.id]));

        const alreadyPairedIds = (memState.rescueFormedNegativePairs || []).flatMap((p) => p.cardTileIds);
        const matchingPriorBombForCard2 = state.tiles.find(
          (t) =>
            previouslyKeptBombs.includes(t.id) &&
            !alreadyPairedIds.includes(t.id) &&
            t.id !== firstTile?.id &&
            t.id !== tile.id &&
            getPenaltyKey(t) === secondTilePenaltyKey
        );
        if (matchingPriorBombForCard2) {
          memState.rescueFormedNegativePairs = [
            ...(memState.rescueFormedNegativePairs || []),
            {
              pairKey: secondTilePenaltyKey,
              formedAtStep: 2,
              cardTileIds: [matchingPriorBombForCard2.id, tile.id],
            },
          ];
          memState.activePenaltyPairKey = secondTilePenaltyKey;
        }
      }
      state.memoryPairsState = { ...memState };
      return {
        updatedState: { ...state, tiles: [...state.tiles], memoryPairsState: { ...memState } },
        isBomb: false,
        scorePenalty: 0,
      };
    }

    // Helper khi hết 5 lượt ở Vòng 2 mà không ghép được cặp bài nào -> Trừ 100% điểm gốc + Trừ 1 Tim:
    const handleRound2Failure = () => {
      const basePenalty = state.baseQuestionPoints || 10;

      // Trừ 1 Tim của đội nếu còn Tim
      const heartsRecord = { ...(state.teamHearts || {}) };
      const currentHearts = heartsRecord[team.id] ?? state.initialHeartsPerTeam ?? 1;
      if (currentHearts > 0) {
        heartsRecord[team.id] = Math.max(0, currentHearts - 1);
        state.teamHearts = heartsRecord;
      }
      const remainingHearts = state.teamHearts?.[team.id] ?? 0;

      state.phase = "TURN_SUMMARY";
      state.turnFinishedReason = "MAX_ATTEMPTS";
      state.potPoints = 0;
      const oldScore = team.score || 0;
      const newScore = Math.max(0, oldScore - basePenalty);
      state.storyResult = {
        teamId: team.id,
        teamName: team.name,
        teamColor: team.color || "#ef4444",
        rewardText: `⏱️ Hết cả 2 vòng (10 lượt) mà không ghép được cặp bài nào! Bị phạt trừ 100% điểm gốc câu hỏi (-${basePenalty}đ) và trừ 1 ❤️ Tim (Còn ${remainingHearts} ❤️)!`,
        scoreDelta: -basePenalty,
        oldScore,
        newScore,
      };
      return {
        updatedState: { ...state, tiles: [...state.tiles], memoryPairsState: { ...memState } },
        isBomb: true,
        scorePenalty: basePenalty,
        finalScoreDelta: -basePenalty,
      };
    };

    // TH 2.2: Cả 2 lá trong CÙNG LƯỢT NÀY đều là lá phạt!
    if (firstTilePenaltyKey && secondTilePenaltyKey) {
      if (firstTilePenaltyKey === secondTilePenaltyKey) {
        // Cả 2 lá TRÙNG CÙNG MỘT CẶP PHẠT trong cùng một lượt!
        // Quy tắc: Đã lật trúng cả 2 lá tiêu cực cùng cặp trong cùng một lượt -> Phạt ngay lập tức!
        memState.attemptsUsed += 1;
        return executePenalty({ penaltyKey: firstTilePenaltyKey });
      } else {
        // Hai lá phạt THUỘC 2 LOẠI KHÁC NHAU!
        // Kiểm tra xem Card 2 có ghép với một bomb cũ từ các lượt trước không:
        const matchingPriorBomb = state.tiles.find(
          (t) => previouslyKeptBombs.includes(t.id) && Number(t.id) !== Number(firstTile?.id) && t.id !== tile.id && getPenaltyKey(t) === secondTilePenaltyKey
        );
        if (matchingPriorBomb) {
          memState.keptBombTileIds = Array.from(new Set([...previouslyKeptBombs, firstTile!.id, tile.id]));
          memState.faceUpPenaltyTileIds = Array.from(new Set([...(memState.faceUpPenaltyTileIds || []), firstTile!.id, tile.id]));
          memState.isBombRescueActive = true;
          memState.activePenaltyPairKey = secondTilePenaltyKey;
          memState.rescueFormedNegativePairs = [
            {
              pairKey: secondTilePenaltyKey,
              formedAtStep: 2,
              cardTileIds: [matchingPriorBomb.id, tile.id],
            },
          ];
          state.memoryPairsState = { ...memState };
          return {
            updatedState: { ...state, tiles: [...state.tiles], memoryPairsState: { ...memState } },
            isBomb: false,
            scorePenalty: 0,
          };
        }

        // Thêm cả 2 lá vào keptBombTileIds để giữ mở ngửa trên bàn, nhưng CHƯA áp dụng phạt!
        memState.attemptsUsed += 1;
        memState.keptBombTileIds = Array.from(new Set([...previouslyKeptBombs, firstTile!.id, tile.id]));
        memState.faceUpPenaltyTileIds = Array.from(new Set([...(memState.faceUpPenaltyTileIds || []), firstTile!.id, tile.id]));
        memState.isMismatchResolving = true;

        const isRoundOver = memState.attemptsUsed >= memState.maxAttempts;
        const currentRound = memState.round || 1;

        if (isRoundOver) {
          if (currentRound === 1) {
            memState.promptSecondChance = true;
            state.memoryPairsState = { ...memState };
            return { updatedState: { ...state, tiles: [...state.tiles], memoryPairsState: { ...memState } }, isBomb: false, scorePenalty: 0, shouldResetMismatchedCards: true };
          } else {
            return handleRound2Failure();
          }
        }

        state.memoryPairsState = { ...memState };
        return { updatedState: { ...state, tiles: [...state.tiles], memoryPairsState: { ...memState } }, isBomb: false, scorePenalty: 0, shouldResetMismatchedCards: true };
      }
    }

    // ═════════════════════════════════════════════════════════════════════════
    // TH 2.3: GHÉP CẶP TRÙNG KHỚP THÀNH CÔNG (MATCH FOUND)!
    // Bất kể là Cặp Thưởng, The Fool (Chàng Khờ), hay Cặp Thoát Hiểm!
    // PHẢI KIỂM TRA TRƯỚC CÁC TRƯỜNG HỢP MISMATCH ĐƠN LẺ ĐỂ LẬT ĐÚNG LUÔN ĐƯỢC CÔNG NHẬN!
    // ═════════════════════════════════════════════════════════════════════════
    const isMatch = Boolean(firstTile && firstTile.pairKey && firstTile.pairKey === tile.pairKey);

    if (isMatch && firstTile) {
      memState.attemptsUsed += 1;
      // MATCH FOUND! (Thưởng điểm theo cặp bài)
      memState.matchedPairKey = firstTile.pairKey;
      state.memoryPairsState = { ...memState };
      state.tiles = state.tiles.map((t) =>
        t.pairKey === firstTile.pairKey || Number(t.id) === numTileId || Number(t.id) === Number(firstTile.id)
          ? { ...t, isOpened: true }
          : { ...t }
      );

      if (firstTile.givesShield) {
        state.hasShield = true;
        const teamsCount = Math.max(1, allTeams?.length || 2);
        const curTurn = state.currentTurnIndex || 0;
        state.teamShields = {
          ...(state.teamShields || {}),
          [team.id]: {
            activeFromTurnIndex: curTurn + 1,
            expiresAfterTurnIndex: curTurn + teamsCount,
            sourceCard: "THE_EMPEROR",
          },
        };
      }
      let firstTileHeartMaxed = false;
      if (firstTile.givesHeart) {
        const heartsRecord = { ...(state.teamHearts || {}) };
        const maxHearts = state.initialHeartsPerTeam ?? 3;
        const curHearts = heartsRecord[team.id] ?? state.initialHeartsPerTeam ?? 1;
        if (curHearts < maxHearts) {
          heartsRecord[team.id] = curHearts + 1;
          state.teamHearts = heartsRecord;
        } else {
          firstTileHeartMaxed = true;
        }
      }

      let temperanceBonusRecipients: Array<{ teamId: string; teamName: string; points: number }> | undefined;
      if (firstTile.tarotCardKey === "TEMPERANCE" || firstTile.pairKey === "PAIR_TEMPERANCE") {
        const pHalf = roundToMultipleOfFive((state.baseQuestionPoints || 10) * 0.5);
        const otherTeams = (allTeams || []).filter((t) => t.id !== team.id && !t.isEliminated);
        if (otherTeams.length > 0) {
          temperanceBonusRecipients = otherTeams.map((t) => ({
            teamId: t.id,
            teamName: t.name,
            points: pHalf,
          }));
        }
      }

      let victimTeamId: string | undefined;
      let victimTeamName: string | undefined;
      let stolenPoints: number | undefined;
      let finalDelta = 0;

      if (firstTile.tarotCardKey === "THE_FOOL" || firstTile.pairKey === "PAIR_THE_FOOL") {
        finalDelta = 0;
      } else if (firstTile.effectType === "STEAL_POINTS") {
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

      let rewardText = firstTile.tarotCardKey === "THE_FOOL"
        ? `🃏 Ghép trúng cặp Kẻ Khờ Lãng Du! Giữ nguyên thế trận an toàn tuyệt đối (±0đ)!`
        : extraPotBonus > 0
        ? `🎉 Ghép thành công ${firstTile.storyTitle}! Nhận trọn vẹn +${baseReward}đ và +${extraPotBonus}đ từ Quỹ thưởng (Tổng +${finalDelta} điểm)!`
        : `🎉 Ghép thành công ${firstTile.storyTitle}! Nhận trọn vẹn +${finalDelta} điểm!`;
      if (stolenPoints && victimTeamName) {
        rewardText += ` (🗡️ Đạo Tặc đánh cắp +${stolenPoints}đ từ Đội ${victimTeamName}!)`;
      }
      if (firstTileHeartMaxed) {
        rewardText += ` (❤️ Đã đạt tối đa ${state.initialHeartsPerTeam ?? 3} tim - không hồi thêm)`;
      }
      if (temperanceBonusRecipients && temperanceBonusRecipients.length > 0) {
        const pHalf = roundToMultipleOfFive((state.baseQuestionPoints || 10) * 0.5);
        rewardText += ` (⚖️ Tiết Độ dung hợp: Ban phước chia sẻ +${pHalf}đ cho tất cả đối thủ còn lại!)`;
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
        temperanceBonusRecipients,
      };
    }

    // ═════════════════════════════════════════════════════════════════════════
    // CÁC TRƯỜNG HỢP KHÔNG TRÙNG KHỚP (MISMATCH):
    // ═════════════════════════════════════════════════════════════════════════

    // TH 2.4: Card 2 trùng loại phạt với 1 lá phạt đã có từ trước trong các lượt trước (khác firstTile)!
    if (secondTilePenaltyKey) {
      memState.keptBombTileIds = Array.from(new Set([...previouslyKeptBombs, tile.id]));
      memState.faceUpPenaltyTileIds = Array.from(new Set([...(memState.faceUpPenaltyTileIds || []), tile.id]));
      const matchingPriorBomb = state.tiles.find(
        (t) => previouslyKeptBombs.includes(t.id) && Number(t.id) !== Number(firstTile?.id) && t.id !== tile.id && getPenaltyKey(t) === secondTilePenaltyKey
      );
      if (matchingPriorBomb) {
        // Card 2 hoàn tất cặp phạt với lá từ lượt trước!
        // Kích hoạt giải cứu: người chơi được tăng thêm quyền lật lá thứ 3 trong lượt!
        memState.isBombRescueActive = true;
        memState.activePenaltyPairKey = secondTilePenaltyKey;
        memState.rescueFormedNegativePairs = [
          {
            pairKey: secondTilePenaltyKey,
            formedAtStep: 2,
            cardTileIds: [matchingPriorBomb.id, tile.id],
          },
        ];
        state.memoryPairsState = { ...memState };
        return {
          updatedState: { ...state, tiles: [...state.tiles], memoryPairsState: { ...memState } },
          isBomb: false,
          scorePenalty: 0,
        };
      }
    }

    // TH 2.5: Một trong 2 lá là lá phạt đơn lẻ (chưa từng xuất hiện trước đó) hoặc lá The Fool!
    if (firstTilePenaltyKey || secondTilePenaltyKey || isNeutralTile(firstTile) || isNeutralTile(tile)) {
      memState.attemptsUsed += 1;
      const penaltyOrNeutralTile = (firstTilePenaltyKey || isNeutralTile(firstTile)) ? firstTile! : tile;
      memState.keptBombTileIds = Array.from(new Set([...previouslyKeptBombs, penaltyOrNeutralTile.id]));
      memState.faceUpPenaltyTileIds = Array.from(new Set([...(memState.faceUpPenaltyTileIds || []), penaltyOrNeutralTile.id]));
      memState.isMismatchResolving = true;

      const isRoundOver = memState.attemptsUsed >= memState.maxAttempts;
      const currentRound = memState.round || 1;

      if (isRoundOver) {
        if (currentRound === 1) {
          memState.promptSecondChance = true;
          state.memoryPairsState = { ...memState };
          return { updatedState: { ...state, tiles: [...state.tiles], memoryPairsState: { ...memState } }, isBomb: false, scorePenalty: 0, shouldResetMismatchedCards: true };
        } else {
          return handleRound2Failure();
        }
      }

      state.memoryPairsState = { ...memState };
      return { updatedState: { ...state, tiles: [...state.tiles], memoryPairsState: { ...memState } }, isBomb: false, scorePenalty: 0, shouldResetMismatchedCards: true };
    }

    // TH 2.6: Cả 2 lá đều là lá thường không trùng khớp
    memState.attemptsUsed += 1;
    memState.isMismatchResolving = true;
    const isRoundOver = memState.attemptsUsed >= memState.maxAttempts;
    const currentRound = memState.round || 1;

    if (isRoundOver) {
      if (currentRound === 1) {
        memState.promptSecondChance = true;
        state.memoryPairsState = { ...memState };
        return { updatedState: { ...state, tiles: [...state.tiles], memoryPairsState: { ...memState } }, isBomb: false, scorePenalty: 0, shouldResetMismatchedCards: true };
      } else {
        return handleRound2Failure();
      }
    }

    state.memoryPairsState = { ...memState };
    return { updatedState: { ...state, tiles: [...state.tiles], memoryPairsState: { ...memState } }, isBomb: false, scorePenalty: 0, shouldResetMismatchedCards: true };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // VARIANT 2: ONE_SHOT_DOORS (8 Cánh Cửa Bí Mật - 2 Giai Đoạn)
  // Giai đoạn 1: Chọn 4 trong 8 cửa để để ra riêng (vẫn úp xuống, chưa lật).
  // Hệ thống báo số lượng lá trừ trong 4 lá đã chọn.
  // Giai đoạn 2: Người chơi PHẢI LẤY 4 CỬA ĐÃ CHỌN để chơi tiếp vòng 2.
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
    // CHẾ ĐỘ SINH TỬ (SURVIVAL MODE) - 2 BƯỚC KỊCH TÍNH (8 CỬA):
    // Bước 1: Chọn 4 trong 8 cửa. Radar quét: 🟢 Xanh (có ít nhất 1 cửa an toàn 🕊️/🃏), 🔴 Đỏ (toàn bẫy/bom).
    // Bước 2: Chọn mở 1 trong 4 cửa đã giữ. Thoát hiểm hoặc nhận hình phạt ngay lập tức!
    // Toàn bộ Perk bị vô hiệu hoá.
    // ─────────────────────────────────────────────────────────────────────────
    if (state.isPenaltySurvivalMode) {
      if (osState.phase === "SELECT_4" || osState.phase === "SELECTING" || !osState.phase) {
        const selected = osState.selectedDoorIds || [];
        if (selected.includes(tileId)) {
          osState.selectedDoorIds = selected.filter((id) => id !== tileId);
          return { updatedState: { ...state }, isBomb: false, scorePenalty: 0 };
        }
        if (selected.length >= 4) {
          return { updatedState: { ...state }, isBomb: false, scorePenalty: 0 };
        }
        selected.push(tileId);
        osState.selectedDoorIds = [...selected];
        if (selected.length < 4) {
          return { updatedState: { ...state }, isBomb: false, scorePenalty: 0 };
        }

        // Đã chọn đủ 4 cửa! 4 cửa còn lại chuyển vào nhóm loại bỏ (discardedDoorIds):
        const discarded = state.tiles.filter((t) => !selected.includes(t.id)).map((t) => t.id);
        osState.discardedDoorIds = discarded;

        // Radar quét 4 cửa đã chọn:
        const chosenTiles = state.tiles.filter((t) => selected.includes(t.id));
        const hasSafe = chosenTiles.some(
          (t) => t.type === "ESCAPE_SAFE" || t.tarotCardKey === "THE_FOOL" || t.pairKey === "THE_FOOL"
        );
        osState.radarLight = hasSafe ? "GREEN" : "RED";
        osState.radarLightStep1 = osState.radarLight;
        osState.phase = "STAGE_2_PICK";

        return { updatedState: { ...state }, isBomb: false, scorePenalty: 0 };
      }

      if (osState.phase === "STAGE_2_PICK") {
        const selected = osState.selectedDoorIds || [];
        if (!selected.includes(tileId)) {
          return { updatedState: state, isBomb: false, scorePenalty: 0 };
        }

        osState.chosenFinalDoorId = tileId;
        osState.phase = "RESOLVED";
        osState.allRevealed = true;
        state.tiles.forEach((t) => { t.isOpened = true; });

        const isSafe = tile.type === "ESCAPE_SAFE" || tile.tarotCardKey === "THE_FOOL" || tile.pairKey === "THE_FOOL";
        if (isSafe) {
          state.potPoints = 0;
          state.phase = "TURN_SUMMARY";
          state.turnFinishedReason = "SURVIVAL_ESCAPE";
          const oldScore = team.score || 0;
          state.storyResult = {
            teamId: team.id,
            teamName: team.name,
            teamColor: team.color || "#10b981",
            rewardText: "🕊️ May mắn tuyệt đỉnh! Bạn đã mở đúng CỬA AN TOÀN, bảo toàn nguyên vẹn điểm số và tim!",
            scoreDelta: 0,
            oldScore,
            newScore: oldScore,
          };
          return { updatedState: { ...state, tiles: [...state.tiles] }, isBomb: false, scorePenalty: 0, finalScoreDelta: 0 };
        }

        // Bẫy hoặc Bom:
        const isRandomBomb = tile.type === "BOMB_MAJOR" || Boolean((tile as any).bombDoorType) || tile.type === "BOMB_SMOKE" || tile.type === "BOMB_DARK" || tile.type === "BOMB_CHARITY";
        if (isRandomBomb) {
          const bombType = (tile as any).bombDoorType || (tile.type === "BOMB_SMOKE" ? "BOMB_SMOKE" : tile.type === "BOMB_DARK" ? "BOMB_DARK" : "BOMB_CHARITY");
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
    }

    const isDoorNegative = (t: MysteryTile): boolean => {
      if (t.tarotCardKey === "THE_FOOL") return false;
      if (t.tarotCardKey === "THE_TOWER" || t.tarotCardKey === "THE_KNIGHT" || t.tarotCardKey === "THE_DEVIL" || t.tarotCardKey === "THE_HANGED_MAN") return true;
      if (t.type !== "REWARD" && t.type !== "ESCAPE_SAFE") return true;
      if (t.deltaPoints && t.deltaPoints < 0) return true;
      if (t.bombDoorType) return true;
      return false;
    };

    // ─────────────────────────────────────────────────────────────────────────
    // BƯỚC 1: Chọn 4 trong 8 cánh cửa
    // ─────────────────────────────────────────────────────────────────────────
    if (osState.phase === "SELECT_4" || osState.phase === "SELECTING" || !osState.phase) {
      if (tile.isPeeked) {
        return { updatedState: { ...state }, isBomb: false, scorePenalty: 0 };
      }

      const selected = osState.selectedDoorIds || [];
      if (selected.includes(tileId)) {
        osState.selectedDoorIds = selected.filter((id) => id !== tileId);
        return { updatedState: { ...state }, isBomb: false, scorePenalty: 0 };
      }

      selected.push(tileId);
      osState.selectedDoorIds = [...selected];

      if (selected.length < 4) {
        return { updatedState: { ...state }, isBomb: false, scorePenalty: 0 };
      }

      // Đã chọn đủ 4 cửa! 4 cửa còn lại chuyển vào nhóm loại bỏ (discardedDoorIds):
      osState.discardedDoorIds = state.tiles.filter((t) => !selected.includes(t.id)).map((t) => t.id);

      // Radar quét 4 cửa đã chọn:
      const selectedTiles = state.tiles.filter((t) => selected.includes(t.id));
      const penaltyCount = selectedTiles.filter(isDoorNegative).length;
      osState.penaltyDoorsCount = penaltyCount;
      osState.hasBombDetected = penaltyCount > 0;
      osState.radarLightStep1 = penaltyCount === 0 ? "GREEN" : penaltyCount === 1 ? "YELLOW" : "RED";

      // Chuyển sang Bước 2: Lựa chọn giữa Nhận 100% điểm gốc ngay HOẶC Tiếp tục chọn cửa:
      osState.phase = "STAGE_1_DECISION";

      return { updatedState: { ...state }, isBomb: false, scorePenalty: 0 };
    }

    // ─────────────────────────────────────────────────────────────────────────
    // BƯỚC 2: Chọn 2 trong 4 cánh cửa đã giữ
    // ─────────────────────────────────────────────────────────────────────────
    if (osState.phase === "SELECT_2") {
      const keptFourDoorIds = state.tiles
        .filter((t) => !(osState.discardedDoorIds || []).includes(t.id))
        .map((t) => t.id);

      if (!keptFourDoorIds.includes(tileId)) {
        return { updatedState: { ...state }, isBomb: false, scorePenalty: 0 };
      }

      const selected = osState.selectedDoorIds || [];
      if (selected.includes(tileId)) {
        osState.selectedDoorIds = selected.filter((id) => id !== tileId);
        return { updatedState: { ...state }, isBomb: false, scorePenalty: 0 };
      }

      selected.push(tileId);
      osState.selectedDoorIds = [...selected];

      if (selected.length < 2) {
        return { updatedState: { ...state }, isBomb: false, scorePenalty: 0 };
      }

      // Đã chọn đủ 2 cửa! 2 cửa không chọn đưa vào discardedDoorIds (tổng 6 cửa bị loại):
      const newlyDiscarded = keptFourDoorIds.filter((id) => !selected.includes(id));
      osState.discardedDoorIds = Array.from(new Set([...(osState.discardedDoorIds || []), ...newlyDiscarded]));

      // Radar quét 2 cửa đã chọn:
      const finalSelectedTiles = state.tiles.filter((t) => selected.includes(t.id));
      const penaltyCount2 = finalSelectedTiles.filter(isDoorNegative).length;
      osState.penaltyDoorsCount = penaltyCount2;
      osState.hasBombDetected = penaltyCount2 > 0;
      osState.radarLight = penaltyCount2 === 0 ? "GREEN" : penaltyCount2 === 1 ? "YELLOW" : "RED";

      // Chuyển sang Bước 3: Quyết định mở cửa hoặc rút lui an toàn:
      osState.phase = "FINAL_DECISION";

      return { updatedState: { ...state }, isBomb: false, scorePenalty: 0 };
    }

    // ─────────────────────────────────────────────────────────────────────────
    // BƯỚC 3 & 4: Mở 1 trong 2 cánh cửa đã chọn (nếu Đèn Xanh hoặc sau khi Đổi Cửa)
    // ─────────────────────────────────────────────────────────────────────────
    if (
      osState.phase === "OPEN_FINAL" ||
      osState.phase === "STAGE_2_PICK" ||
      osState.phase === "SCANNED" ||
      (osState.phase === "FINAL_DECISION" && osState.radarLight === "GREEN")
    ) {
      const selected = osState.selectedDoorIds || [];
      if (!selected.includes(tileId)) {
        return { updatedState: state, isBomb: false, scorePenalty: 0 };
      }

      // Người chơi mở cánh cửa đã chọn:
      osState.chosenFinalDoorId = tileId;
      osState.phase = "RESOLVED";
      osState.allRevealed = true;
      state.tiles.forEach((t) => { t.isOpened = true; });

      const isNegative = isDoorNegative(tile);

      if (isNegative) {
        if (state.hasShield && !state.isPenaltySurvivalMode) {
          state.hasShield = false;
          tile.isOpened = true;
          osState.chosenFinalDoorId = undefined;
          osState.phase = "OPEN_FINAL";
          osState.allRevealed = false;
          osState.selectedDoorIds = (osState.selectedDoorIds || []).filter((id) => id !== tileId);
          state.storyResult = {
            teamId: team.id,
            teamName: team.name,
            teamColor: team.color || "#ef4444",
            rewardText: `🛡️ KHIÊN THẦN ĐÃ HẤP THỤ BẪY PHẠT! Cửa bẫy #${tile.id} đã bị vô hiệu hóa an toàn (0đ phạt). Đội bạn được bảo toàn điểm số và chọn lại cánh cửa còn lại!`,
            scoreDelta: 0,
            oldScore: team.score || 0,
            newScore: team.score || 0,
          };
          return {
            updatedState: { ...state },
            isBomb: false,
            scorePenalty: 0,
            finalScoreDelta: 0,
          };
        }

        const isRandomBomb = tile.type === "BOMB_MAJOR" || Boolean((tile as any).bombDoorType) || tile.tarotCardKey === "THE_DEVIL" || tile.tarotCardKey === "THE_HANGED_MAN" || tile.tarotCardKey === "THE_KNIGHT";

        if (isRandomBomb) {
          let bombType: "BOMB_SMOKE" | "BOMB_DARK" | "BOMB_CHARITY" = "BOMB_DARK";
          if (tile.tarotCardKey === "THE_KNIGHT" || tile.type === "BOMB_SMOKE") bombType = "BOMB_SMOKE";
          else if (tile.tarotCardKey === "THE_HANGED_MAN" || tile.type === "BOMB_CHARITY") bombType = "BOMB_CHARITY";
          else if (tile.tarotCardKey === "THE_DEVIL" || tile.type === "BOMB_DARK") bombType = "BOMB_DARK";
          else bombType = (tile as any).bombDoorType || rollBombTypeForMinigame("ONE_SHOT_DOORS", team.score || 0, { currentRound, riskTier });

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
            recipientTeamId: outcome.recipientTeamId,
            recipientTeamName: outcome.recipientTeamName,
            giftedPoints: outcome.giftedPoints,
            darkBombRecipients: outcome.darkBombRecipients,
          };
        } else {
          // The Tower / Bẫy Trừ Gốc: Trừ đúng điểm gốc câu hỏi (nếu UNDERDOG thì 0đ phạt)
          const penalty = riskTier === "UNDERDOG" ? 0 : Math.abs(tile.deltaPoints || state.baseQuestionPoints || 10);
          state.potPoints = 0;
          state.bombExploded = {
            type: penalty === 0 ? "SMOKE" : "MINOR",
            title: tile.storyTitle,
            description: tile.storyDescription,
            penaltyText: penalty === 0
              ? "May mắn né phạt! Điểm số được bảo toàn nguyên vẹn."
              : `Mở trúng Cửa Bẫy Tháp! Bị trừ ${penalty} điểm từ tổng điểm.`,
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
              ? "💨 Mở trúng Cửa Tháp nhưng đội yếu thế né bẫy phạt thành công, bảo toàn tổng điểm (0đ)!"
              : `💥 Mở trúng Cửa Bẫy Tháp! Bị trừ -${penalty} điểm!`,
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
        if (tile.givesShield) {
          state.hasShield = true;
          const teamsCount = Math.max(1, allTeams?.length || 2);
          const curTurn = state.currentTurnIndex || 0;
          state.teamShields = {
            ...(state.teamShields || {}),
            [team.id]: {
              activeFromTurnIndex: curTurn + 1,
              expiresAfterTurnIndex: curTurn + teamsCount,
              sourceCard: "THE_EMPEROR",
            },
          };
        }
        let tileHeartMaxed = false;
        if (tile.givesHeart) {
          const heartsRecord = { ...(state.teamHearts || {}) };
          const maxHearts = state.initialHeartsPerTeam ?? 3;
          const curHearts = heartsRecord[team.id] ?? state.initialHeartsPerTeam ?? 1;
          if (curHearts < maxHearts) {
            heartsRecord[team.id] = curHearts + 1;
            state.teamHearts = heartsRecord;
          } else {
            tileHeartMaxed = true;
          }
        }

        let temperanceBonusRecipients: Array<{ teamId: string; teamName: string; points: number }> | undefined;
        if (tile.tarotCardKey === "TEMPERANCE") {
          const pHalf = roundToMultipleOfFive((state.baseQuestionPoints || 10) * 0.5);
          const otherTeams = (allTeams || []).filter((t) => t.id !== team.id && !t.isEliminated);
          if (otherTeams.length > 0) {
            temperanceBonusRecipients = otherTeams.map((t) => ({
              teamId: t.id,
              teamName: t.name,
              points: pHalf,
            }));
          }
        }

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

        const baseReward = tile.tarotCardKey === "THE_FOOL" ? 0 : (tile.deltaPoints || state.baseQuestionPoints || 10);
        let finalDelta = tile.tarotCardKey === "THE_FOOL" ? 0 : ((baseReward * multiplier) + extraPotBonus);
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

        let rewardText = tile.tarotCardKey === "THE_FOOL"
          ? `🃏 MỞ CỬA KẺ KHỜ! Giữ nguyên thế trận an toàn tuyệt đối (±0đ)!`
          : extraPotBonus > 0
          ? `🎉 MỞ CỬA THÀNH CÔNG! ${tile.storyTitle} Nhận +${baseReward * multiplier}đ và +${extraPotBonus}đ Quỹ thưởng (Tổng +${finalDelta} điểm)!`
          : `🎉 MỞ CỬA THÀNH CÔNG! ${tile.storyTitle} Nhận trọn vẹn +${finalDelta} điểm thưởng!`;

        if (tile.tarotCardKey === "TEMPERANCE" && temperanceBonusRecipients && temperanceBonusRecipients.length > 0) {
          const pHalf = roundToMultipleOfFive((state.baseQuestionPoints || 10) * 0.5);
          rewardText += ` (⚖️ Tiết Độ dung hợp: Ban phước chia sẻ +${pHalf}đ cho tất cả đối thủ còn lại!)`;
        }

        if (tileHeartMaxed) {
          rewardText += ` (❤️ Đã đạt tối đa ${state.initialHeartsPerTeam ?? 3} tim - không hồi thêm)`;
        }
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
          temperanceBonusRecipients,
        };
      }
    }
    return { updatedState: state, isBomb: false, scorePenalty: 0 };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // VARIANT 4: TAROT_DESTINY (Rút 1 trong 8 lá bài Tarot thần số)
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
      if (state.hasShield && !state.isPenaltySurvivalMode) {
        state.hasShield = false;
        tile.isOpened = true;
        state.storyResult = {
          teamId: team.id,
          teamName: team.name,
          teamColor: team.color || "#ef4444",
          rewardText: `🛡️ KHIÊN THẦN ĐÃ ĐẨY LÙI THẦN CHẾT! Lá bài #${tile.id} (${tile.storyTitle}) đã bị vô hiệu hóa an toàn (0đ phạt). Đội bạn được bảo toàn điểm số và chọn lại 1 lá bài khác!`,
          scoreDelta: 0,
          oldScore: team.score || 0,
          newScore: team.score || 0,
        };
        return {
          updatedState: { ...state },
          isBomb: false,
          scorePenalty: 0,
          finalScoreDelta: 0,
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
  // CHẾ ĐỘ SINH TỬ (SURVIVAL MODE): Chỉ bốc 1 lá là thực thi kết quả / hình phạt ngay lập tức!
  // Toàn bộ Perk bị vô hiệu hoá.
  // ─────────────────────────────────────────────────────────────────────────
  if (state.isPenaltySurvivalMode) {
    state.potPoints = 0;
    state.phase = "TURN_SUMMARY";
    const oldScore = team.score || 0;

    const isSafe = tile.type === "ESCAPE_SAFE" || tile.tarotCardKey === "THE_FOOL" || tile.pairKey === "THE_FOOL";
    if (isSafe) {
      state.turnFinishedReason = "SURVIVAL_ESCAPE";
      state.storyResult = {
        teamId: team.id,
        teamName: team.name,
        teamColor: team.color || "#10b981",
        rewardText: `🕊️ ${tile.storyTitle}: ${tile.storyDescription || "Thoát hiểm ngoạn mục! Bảo toàn nguyên vẹn điểm số và tim!"}`,
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

    // Bẫy hoặc Bom trong Chế độ Sinh Tử:
    const isBomb =
      tile.type === "BOMB_SMOKE" ||
      tile.type === "BOMB_DARK" ||
      tile.type === "BOMB_CHARITY" ||
      tile.type === "BOMB_MINOR" ||
      tile.type === "BOMB_MAJOR";

    if (isBomb) {
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
        isSurvivalPenalty: true,
      });

      state.bombExploded = bombOutcome.bombExploded;
      state.turnFinishedReason = "SURVIVAL_FAILED";
      const finalDelta = -bombOutcome.penalty;
      const newScore = Math.max(0, oldScore + finalDelta);

      state.storyResult = {
        teamId: team.id,
        teamName: team.name,
        teamColor: team.color || "#ef4444",
        rewardText: `💥 ${tile.storyTitle}: ${bombOutcome.penaltyText}`,
        scoreDelta: finalDelta,
        oldScore,
        newScore,
      };

      return {
        updatedState: { ...state },
        isBomb: true,
        scorePenalty: bombOutcome.penalty,
        finalScoreDelta: finalDelta,
        recipientTeamId: bombOutcome.recipientTeamId,
        giftedPoints: bombOutcome.giftedPoints,
        darkBombRecipients: bombOutcome.darkBombRecipients,
      };
    } else {
      // The Tower (-1x base points) hoặc Bẫy Trừ Gốc:
      const penalty = Math.min(team.score || 0, Math.abs(tile.deltaPoints || state.baseQuestionPoints || 10));
      state.turnFinishedReason = "SURVIVAL_FAILED";
      const finalDelta = -penalty;
      const newScore = Math.max(0, oldScore + finalDelta);

      state.storyResult = {
        teamId: team.id,
        teamName: team.name,
        teamColor: team.color || "#ef4444",
        rewardText: `⚠️ ${tile.storyTitle}: Dính bẫy phạt sinh tử (-${penalty}đ)!`,
        scoreDelta: finalDelta,
        oldScore,
        newScore,
      };

      return {
        updatedState: { ...state },
        isBomb: true,
        scorePenalty: penalty,
        finalScoreDelta: finalDelta,
      };
    }
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
      tile.isOpened = true;
      state.cardsFlippedCount = (state.cardsFlippedCount || 0) + 1;
      state.lastFlippedTile = tile;
      // Sinh lá bài tiếp theo trên đỉnh chồng bài để người chơi có thể tiếp tục lật hoặc Chốt điểm (Cash Out)
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
      state.nextCardPeek = undefined;
      state.storyResult = {
        teamId: team.id,
        teamName: team.name,
        teamColor: team.color || "#ef4444",
        rewardText: `🛡️ KHIÊN THẦN ĐÃ HẤP THỤ VỤ NỔ! Quả bom Lá #${tile.id} đã bị vô hiệu hóa an toàn! Bạn bảo toàn được quỹ ${state.potPoints}đ và có thể CHỐT ĐIỂM ngay hoặc tiếp tục lật liều!`,
        scoreDelta: 0,
        oldScore: team.score || 0,
        newScore: team.score || 0,
      };
      return {
        updatedState: { ...state },
        isBomb: false,
        scorePenalty: 0,
        finalScoreDelta: 0,
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
    // Chỉ nhân đôi điểm gốc câu hỏi, không nhân đôi điểm số trước đó đã cầm nữa để tránh mất công bằng
    const basePts = state.baseQuestionPoints || 20;
    state.potMultiplier = 2;
    state.potPoints = (basePts * 2) + extraPotBonus;
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
  allTeams = [],
  choice,
}: {
  state: MysteryQuestState;
  team: MysteryTeamRef;
  allTeams?: MysteryTeamRef[];
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
    const currentHearts = heartsRecord[team.id] ?? state.initialHeartsPerTeam ?? 1;
    if (currentHearts > 0) {
      heartsRecord[team.id] = Math.max(0, currentHearts - 1);
      state.teamHearts = heartsRecord;
    }

    const award = roundToMultipleOfFive((state.baseQuestionPoints || 10) * 0.5);
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
      rewardText: `🛡️ Dừng lại an toàn! Tiêu hao 1 ❤️ để nhận 50% điểm câu hỏi (+${award}đ, Còn ${remainingHearts} ❤️)!`,
      scoreDelta: award,
      oldScore,
      newScore,
    };

    return {
      updatedState: { ...state },
      finalScoreDelta: award,
    };
  } else {
    // Chơi tiếp Vòng 2: 5 lượt mới, reset sạch cache và randomize lại toàn bộ vị trí, icon, chức năng các cặp thẻ
    // Lưu ý đặc biệt theo yêu cầu: DÙ RESET TẤT CẢ NHƯNG TUYỆT ĐỐI KHÔNG RESET KHIÊN (giữ nguyên trạng thái khiên hiện có)
    const preservedShield = Boolean(state.hasShield);

    memState.round = 2;
    memState.maxAttempts = getPerkType(state.promoPerk) === "EXTRA_ATTEMPT_PROMO" ? 6 : 5;
    memState.attemptsUsed = 0;
    memState.promptSecondChance = false;
    memState.firstFlippedTileId = null;
    memState.secondFlippedTileId = null;
    memState.thirdFlippedTileId = null;
    memState.keptBombTileIds = [];
    memState.faceUpPenaltyTileIds = [];
    memState.attemptedPairs = [];
    memState.isBombRescueActive = false;
    memState.activePenaltyPairKey = null;
    memState.isMismatchResolving = false;
    memState.matchedPairKey = null;
    memState.rescueFormedNegativePairs = [];

    // Sinh 16 thẻ mới hoàn toàn theo Tarot Quotas Vòng 2
    const basePts = state.baseQuestionPoints || 20;
    const consecutiveBombs = state.consecutiveBombsByTeam?.[team.id] ?? 0;
    const riskTier = evaluateTeamRiskTier({
      team,
      allTeams,
      consecutiveBombs,
      currentRound: 2,
    });
    state.tiles = generateMemoryPairsTiles(basePts, {
      currentRound: 2,
      teams: allTeams,
      currentTeamId: team.id,
      riskTier,
    });

    // Giữ nguyên trạng thái khiên (không bị reset mất hoặc hồi lại vô lý)
    state.hasShield = preservedShield;
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

  // QUY TẮC BẢO VỆ CHỐNG CƯỚP LIÊN HOÀN & KHIÊN HOÀNG ĐẾ
  if (!state.timesStolenInCycle) state.timesStolenInCycle = {};
  const timesStolen = victimTeamId ? (state.timesStolenInCycle[victimTeamId] || 0) : 0;
  let stolenPoints = rawStolenPoints;
  let isHalfProtected = false;

  const curTurn = state.currentTurnIndex || 0;
  const victimShield = victimTeamId ? state.teamShields?.[victimTeamId] : undefined;
  const isEmperorShieldActive = Boolean(
    victimShield && curTurn >= victimShield.activeFromTurnIndex && curTurn <= victimShield.expiresAfterTurnIndex
  );

  if (isEmperorShieldActive && victimTeamId) {
    if (state.teamShields) {
      delete state.teamShields[victimTeamId]; // Tiêu hao khiên
    }
    stolenPoints = 0;
  } else if (victimTeamId && timesStolen === 1) {
    stolenPoints = Math.max(5, roundToMultipleOfFive(rawStolenPoints * 0.5));
    isHalfProtected = true;
  }

  if (victimTeamId) {
    state.timesStolenInCycle[victimTeamId] = timesStolen + 1;
  }

  const protectionNote = isEmperorShieldActive
    ? ` (🛡️ KHIÊN HOÀNG ĐẾ: Đội ${victimTeamName} đã kích hoạt Khiên Thần chặn đứng vụ cướp điểm, 0đ mất mát!)`
    : isHalfProtected
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
 * Handles decisions for 8 Cánh Cửa Bí Mật (ONE_SHOT_DOORS):
 * - "TAKE_100_BASE": Bước 2: Chốt nhận 100% điểm gốc câu hỏi ngay (0 tim, kết thúc lượt).
 * - "PROCEED_TO_SELECT_2": Bước 2: Tiếp tục chọn 2 trong 4 cánh cửa đã giữ.
 * - "SWAP_DOOR": Bước 3: Đổi 1 trong 2 lá đã chọn sang 1 lá khác từ 6 cửa đã loại (bắt buộc khi gặp Vàng/Đỏ).
 * - "SAFE_EXIT" / "TAKE_BASE_MINUS_HEART": Bước 3: Rút lui nhận 50% điểm câu hỏi gốc và bị trừ 1 Tim.
 * - "RISK_OPEN": Bước 3 & 4: Mở 1 trong 2 cánh cửa đã chọn để nhận kết quả.
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
  decision: "SAFE_EXIT" | "RISK_OPEN" | "SWAP_DOOR" | "TAKE_BASE_MINUS_HEART" | "TAKE_100_BASE" | "PROCEED_TO_SELECT_2";
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
  temperanceBonusRecipients?: Array<{ teamId: string; teamName: string; points: number }>;
} {
  const osState = state.oneShotState || {
    selectedDoorIds: [],
    hasBombDetected: false,
    phase: "SELECTING",
    revealedSafeDoorIds: [],
    chosenFinalDoorId: undefined,
    allRevealed: false,
    discardedDoorIds: [],
  };
  state.oneShotState = osState;

  const currentRound = state.currentRound || 1;
  const consecutiveBombs = state.consecutiveBombsByTeam?.[team.id] ?? 0;
  const riskTier = evaluateTeamRiskTier({
    team,
    allTeams,
    consecutiveBombs,
    currentRound,
  });

  const hasExtraPot = getPerkType(state.promoPerk) === "EXTRA_POT_PROMO";
  const extraPotBonus = hasExtraPot ? 5 : 0;
  const multiplier = state.potMultiplier || 1;

  // ─────────────────────────────────────────────────────────────────────────
  // BƯỚC 2 - LỰA CHỌN A: CHỐT NHẬN 100% ĐIỂM GỐC NGAY (TRỪ 1 TIM, KẾT THÚC LƯỢT)
  // ─────────────────────────────────────────────────────────────────────────
  if (decision === "TAKE_100_BASE") {
    // Trừ 1 Tim của đội nếu đội còn Tim
    const heartsRecord = { ...(state.teamHearts || {}) };
    const currentHearts = heartsRecord[team.id] ?? state.initialHeartsPerTeam ?? 1;
    if (currentHearts > 0) {
      heartsRecord[team.id] = Math.max(0, currentHearts - 1);
      state.teamHearts = heartsRecord;
    }

    osState.phase = "RESOLVED";
    osState.allRevealed = true;
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
      ? `🛡️ Chốt nhận an toàn! Tiêu hao 1 ❤️ để nhận trọn vẹn 100% điểm gốc (+${state.baseQuestionPoints || 10}đ) và +${extraPotBonus}đ Quỹ thưởng (Tổng +${finalDelta} điểm, còn ${remainingHearts} ❤️)!`
      : `🛡️ Chốt nhận an toàn! Tiêu hao 1 ❤️ để nhận trọn vẹn 100% điểm gốc câu hỏi (+${finalDelta} điểm, còn ${remainingHearts} ❤️)!`;

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
  // BƯỚC 2 - LỰA CHỌN B: TIẾP TỤC CHỌN 2 TRONG 4 CỬA ĐÃ GIỮ
  // ─────────────────────────────────────────────────────────────────────────
  if (decision === "PROCEED_TO_SELECT_2") {
    osState.phase = "SELECT_2";
    osState.selectedDoorIds = [];
    return {
      updatedState: { ...state },
      finalScoreDelta: 0,
      isBomb: false,
      scorePenalty: 0,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // BƯỚC 3 - PHƯƠNG ÁN 1: ĐỔI 1 TRONG 2 CỬA SANG 1 TRONG 6 CỬA ĐÃ LOẠI
  // ─────────────────────────────────────────────────────────────────────────
  if (decision === "SWAP_DOOR") {
    if (osState.hasSwapped) {
      // Đã đổi 1 lần rồi thì không cho đổi tiếp
      return { updatedState: state, finalScoreDelta: 0, isBomb: false, scorePenalty: 0 };
    }

    const currentSelected = [...(osState.selectedDoorIds || [])];
    const currentDiscarded = [...(osState.discardedDoorIds || [])];

    if (swapRemovedDoorId && swapAddedDoorId) {
      const newSelected = currentSelected
        .filter((id) => id !== swapRemovedDoorId)
        .concat(swapAddedDoorId);

      const newDiscarded = currentDiscarded
        .filter((id) => id !== swapAddedDoorId)
        .concat(swapRemovedDoorId);

      osState.selectedDoorIds = newSelected;
      osState.discardedDoorIds = newDiscarded;
      osState.hasSwapped = true;
      osState.swapRemovedDoorId = swapRemovedDoorId;
      osState.swapAddedDoorId = swapAddedDoorId;
      osState.penaltyDoorsCount = undefined;
      osState.hasBombDetected = false;
      osState.phase = "OPEN_FINAL";
    }

    return {
      updatedState: { ...state },
      finalScoreDelta: 0,
      isBomb: false,
      scorePenalty: 0,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // BƯỚC 3 - PHƯƠNG ÁN 2: RÚT LUI AN TOÀN NHẬN 50% ĐIỂM GỐC VÀ TRỪ 1 TIM
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

    const halfBase = roundToMultipleOfFive((state.baseQuestionPoints || 10) * 0.5);
    const finalDelta = halfBase + extraPotBonus;
    state.potPoints = 0;
    state.phase = "TURN_SUMMARY";
    state.turnFinishedReason = "TOOK_BASE_POINTS";

    const oldScore = team.score || 0;
    const newScore = oldScore + finalDelta;
    const remainingHearts = state.teamHearts?.[team.id] ?? 0;

    const rewardText = extraPotBonus > 0
      ? `🛡️ Rút lui an toàn! Chấp nhận tiêu hao 1 ❤️ để nhận 50% điểm gốc (+${halfBase}đ) và +${extraPotBonus}đ Quỹ thưởng (Tổng +${finalDelta} điểm, còn ${remainingHearts} ❤️)!`
      : `🛡️ Rút lui an toàn! Chấp nhận tiêu hao 1 ❤️ để nhận 50% điểm gốc câu hỏi (+${finalDelta} điểm, còn ${remainingHearts} ❤️)!`;

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
  // BƯỚC 3 & 4: MỞ 1 TRONG 2 CÁNH CỬA ĐÃ CHỌN
  // ─────────────────────────────────────────────────────────────────────────
  if (decision === "RISK_OPEN" && !chosenDoorId && (osState.phase === "FINAL_DECISION" || osState.phase === "PENALTY_DECISION")) {
    osState.phase = "OPEN_FINAL";
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

  const isDoorNegative = (t: MysteryTile): boolean => {
    if (t.tarotCardKey === "THE_FOOL") return false;
    if (t.tarotCardKey === "THE_TOWER" || t.tarotCardKey === "THE_KNIGHT" || t.tarotCardKey === "THE_DEVIL" || t.tarotCardKey === "THE_HANGED_MAN") return true;
    if (t.type !== "REWARD" && t.type !== "ESCAPE_SAFE") return true;
    if (t.deltaPoints && t.deltaPoints < 0) return true;
    if (t.bombDoorType) return true;
    return false;
  };

  const isNegative = isDoorNegative(chosenTile);

  if (isNegative) {
    if (state.hasShield && !state.isPenaltySurvivalMode) {
      state.hasShield = false;
      chosenTile.isOpened = true;
      if (osState.selectedDoorIds) {
        osState.selectedDoorIds = osState.selectedDoorIds.filter((id) => id !== doorIdToOpen);
      }
      osState.chosenFinalDoorId = undefined;
      osState.phase = "OPEN_FINAL";
      osState.allRevealed = false;
      state.tiles.forEach((t) => {
        if (t.id !== doorIdToOpen) t.isOpened = false;
      });
      state.storyResult = {
        teamId: team.id,
        teamName: team.name,
        teamColor: team.color || "#ef4444",
        rewardText: `🛡️ KHIÊN THẦN ĐÃ HẤP THỤ BẪY PHẠT! Cửa bẫy #${doorIdToOpen} đã bị vô hiệu hóa an toàn (0đ phạt). Đội bạn được chọn lại cánh cửa còn lại!`,
        scoreDelta: 0,
        oldScore: team.score || 0,
        newScore: team.score || 0,
      };
      return {
        updatedState: { ...state },
        isBomb: false,
        scorePenalty: 0,
        finalScoreDelta: 0,
      };
    }

    const isRandomBomb = chosenTile.type === "BOMB_MAJOR" || Boolean((chosenTile as any).bombDoorType) || chosenTile.tarotCardKey === "THE_DEVIL" || chosenTile.tarotCardKey === "THE_HANGED_MAN" || chosenTile.tarotCardKey === "THE_KNIGHT";

    if (isRandomBomb) {
      let bombType: "BOMB_SMOKE" | "BOMB_DARK" | "BOMB_CHARITY" = "BOMB_DARK";
      if (chosenTile.tarotCardKey === "THE_KNIGHT" || chosenTile.type === "BOMB_SMOKE") bombType = "BOMB_SMOKE";
      else if (chosenTile.tarotCardKey === "THE_HANGED_MAN" || chosenTile.type === "BOMB_CHARITY") bombType = "BOMB_CHARITY";
      else if (chosenTile.tarotCardKey === "THE_DEVIL" || chosenTile.type === "BOMB_DARK") bombType = "BOMB_DARK";
      else bombType = (chosenTile as any).bombDoorType || rollBombTypeForMinigame("ONE_SHOT_DOORS", team.score || 0, { currentRound, riskTier });

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
      // The Tower / Bẫy Trừ Gốc: Trừ đúng điểm gốc câu hỏi (nếu UNDERDOG thì 0đ phạt)
      const penalty = riskTier === "UNDERDOG" ? 0 : Math.abs(chosenTile.deltaPoints || state.baseQuestionPoints || 10);
      state.potPoints = 0;
      state.bombExploded = {
        type: penalty === 0 ? "SMOKE" : "MINOR",
        title: chosenTile.storyTitle,
        description: chosenTile.storyDescription,
        penaltyText: penalty === 0
          ? "May mắn né phạt! Điểm số được bảo toàn nguyên vẹn."
          : `Mở trúng Cửa Bẫy Tháp! Bị trừ ${penalty} điểm từ tổng điểm.`,
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
          ? "💨 Mở trúng Cửa Tháp nhưng đội yếu thế né bẫy phạt thành công, bảo toàn tổng điểm (0đ)!"
          : `💥 Mở trúng Cửa Bẫy Tháp! Bị trừ -${penalty} điểm!`,
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
    if (chosenTile.givesShield) {
      state.hasShield = true;
      const teamsCount = Math.max(1, allTeams?.length || 2);
      const curTurn = state.currentTurnIndex || 0;
      state.teamShields = {
        ...(state.teamShields || {}),
        [team.id]: {
          activeFromTurnIndex: curTurn + 1,
          expiresAfterTurnIndex: curTurn + teamsCount,
          sourceCard: "THE_EMPEROR",
        },
      };
    }
    let chosenTileHeartMaxed = false;
    if (chosenTile.givesHeart) {
      const heartsRecord = { ...(state.teamHearts || {}) };
      const maxHearts = state.initialHeartsPerTeam ?? 3;
      const curHearts = heartsRecord[team.id] ?? state.initialHeartsPerTeam ?? 1;
      if (curHearts < maxHearts) {
        heartsRecord[team.id] = curHearts + 1;
        state.teamHearts = heartsRecord;
      } else {
        chosenTileHeartMaxed = true;
      }
    }

    let temperanceBonusRecipients: Array<{ teamId: string; teamName: string; points: number }> | undefined;
    if (chosenTile.tarotCardKey === "TEMPERANCE") {
      const pHalf = roundToMultipleOfFive((state.baseQuestionPoints || 10) * 0.5);
      const otherTeams = (allTeams || []).filter((t) => t.id !== team.id && !t.isEliminated);
      if (otherTeams.length > 0) {
        temperanceBonusRecipients = otherTeams.map((t) => ({
          teamId: t.id,
          teamName: t.name,
          points: pHalf,
        }));
      }
    }

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
      const baseReward = chosenTile.tarotCardKey === "THE_FOOL" ? 0 : (chosenTile.deltaPoints ?? (state.baseQuestionPoints || 10));
      finalDelta = chosenTile.tarotCardKey === "THE_FOOL" ? 0 : ((baseReward * multiplier) + extraPotBonus);
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

    let rewardText = chosenTile.tarotCardKey === "THE_FOOL"
      ? `🃏 Mở trúng Cửa Kẻ Khờ (±0đ): Thế trận được bảo toàn an toàn tuyệt đối!`
      : `🎉 ĐOÁN ĐÚNG XUẤT SẮC! Mở trúng cánh cửa an toàn #${chosenTile.id}: Nhận trọn vẹn +${finalDelta} điểm!`;

    if (chosenTile.tarotCardKey === "TEMPERANCE" && temperanceBonusRecipients && temperanceBonusRecipients.length > 0) {
      const pHalf = roundToMultipleOfFive((state.baseQuestionPoints || 10) * 0.5);
      rewardText += ` (⚖️ Tiết Độ dung hợp: Ban phước chia sẻ +${pHalf}đ cho tất cả đối thủ còn lại!)`;
    }

    if (chosenTileHeartMaxed) {
      rewardText += ` (❤️ Đã đạt tối đa ${state.initialHeartsPerTeam ?? 3} tim - không hồi thêm)`;
    }
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
      temperanceBonusRecipients,
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
  const isSurvivalMode = !!state.isPenaltySurvivalMode;
  const currentRound = state.currentRound || 1;
  const riskTier = evaluateTeamRiskTier({
    team,
    allTeams,
    currentRound,
  });

  const segments = isSurvivalMode ? TAROT_SURVIVAL_WHEEL_SEGMENTS : MAJOR_ARCANA_WHEEL_SEGMENTS;
  const pickedSegment = segments[Math.floor(Math.random() * segments.length)];

  const effectResult = resolveWheelCardEffect({
    cardKey: pickedSegment.key,
    basePoints,
    team,
    allTeams,
    currentRound,
    riskTier,
    isSurvivalMode,
    timesStolenInCycle: state.timesStolenInCycle,
    currentHearts: state.teamHearts?.[team.id] ?? state.initialHeartsPerTeam ?? 1,
    maxHearts: state.initialHeartsPerTeam ?? 3,
  });

  const { drawnCard, finalScoreDelta, scorePenalty, isBomb, scoreDeltas, rewardText } = effectResult;

  // Handle Shield absorption if negative card
  const isNegative = isBomb || scorePenalty > 0 || drawnCard.scoreDelta < 0;
  if (state.hasShield && isNegative && !isSurvivalMode) {
    state.hasShield = false;
    state.potPoints = 0;
    state.phase = "PUSH_YOUR_LUCK";
    state.turnFinishedReason = undefined;
    state.tarotState = {
      ...(state.tarotState || {}),
      drawnCard,
      isDrawn: false,
      isShieldRespin: true,
      shieldTransformedCardKey: drawnCard.key,
    };
    const oldScore = currentScore;
    state.storyResult = {
      teamId: team.id,
      teamName: team.name,
      teamColor: team.color || "#ef4444",
      rewardText: `🛡️ KHIÊN THẦN ĐÃ HẤP THỤ ĐỊNH MỆNH XẤU (${drawnCard.nameVi})! Ô trừ đã bị vô hiệu hóa (0đ). Đội bạn được rút lại lá mới và loại ô này được hóa giải!`,
      scoreDelta: 0,
      oldScore,
      newScore: oldScore,
    };
    return {
      updatedState: { ...state },
      finalScoreDelta: 0,
      isBomb: false,
      scorePenalty: 0,
      drawnCard,
      scoreDeltas: [],
    };
  }

  // Ghi nhận số lần bị cướp trong chu kỳ của nạn nhân (nếu là lá Cướp điểm)
  if (!isNegative && effectResult.victimTeamId && effectResult.stolenPoints && effectResult.stolenPoints > 0) {
    if (!state.timesStolenInCycle) state.timesStolenInCycle = {};
    state.timesStolenInCycle[effectResult.victimTeamId] = (state.timesStolenInCycle[effectResult.victimTeamId] || 0) + 1;
  }

  state.potPoints = 0;
  state.phase = "TURN_SUMMARY";
  state.turnFinishedReason = isSurvivalMode ? (drawnCard.key === "THE_PEACE" ? "SURVIVAL_ESCAPE" : "SURVIVAL_FAILED") : "TAROT_DRAWN";
  state.tarotState = {
    ...(state.tarotState || {}),
    drawnCard,
    isDrawn: true,
  };

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

  return {
    updatedState: { ...state },
    finalScoreDelta,
    isBomb,
    scorePenalty,
    victimTeamId: effectResult.victimTeamId,
    victimTeamName: effectResult.victimTeamName,
    stolenPoints: effectResult.stolenPoints,
    giftedPoints: effectResult.giftedPoints,
    darkBombRecipients: effectResult.darkBombRecipients,
    drawnCard,
    scoreDeltas,
  };
}

/**
 * Danh sách 22 nan quạt Major Arcana (0 – XXI) với phân bổ cố định chuẩn cân bằng:
 * - 4 lá +1x Điểm gốc (I Magician, II High Priestess, V Hierophant, IX Hermit)
 * - 4 lá +1.5x Điểm gốc (III Empress, IV Emperor, VIII Strength, XX Judgement)
 * - 4 lá +2x Điểm gốc (VI Lovers, XIV Temperance, XIX The Sun, XXI The World)
 * - 1 lá Ngẫu nhiên x1/x1.5/x2 (X Wheel of Fortune)
 * - 2 lá Đánh cược quay thêm (XVII The Star, XVIII The Moon)
 * - 2 lá Cướp 2x Điểm gốc từ đối thủ (VII The Chariot, XIII Death)
 * - 1 lá Bom Hắc Ám (XV The Devil)
 * - 1 lá Bẫy Sập -1x Điểm gốc (XVI The Tower)
 * - 1 lá Bom Từ Thiện (XII The Hanged Man)
 * - 2 lá Kẻ Khờ ±0đ (0 The Fool, XI Justice)
 */
export const MAJOR_ARCANA_WHEEL_SEGMENTS: TarotWheelSegment[] = [
  { index: 0, key: "THE_FOOL", nameVi: "Kẻ Khờ", nameEn: "The Fool", icon: "🃏", roman: "0", group: "COMMON", bgColor: "#070510", borderColor: "#b45309", textColor: "#fde68a" },
  { index: 1, key: "THE_MAGICIAN", nameVi: "Pháp Sư", nameEn: "The Magician", icon: "🪄", roman: "I", group: "COMMON", bgColor: "#110926", borderColor: "#6d28d9", textColor: "#e0e7ff" },
  { index: 2, key: "THE_HIGH_PRIESTESS", nameVi: "Nữ Tư Tế", nameEn: "The High Priestess", icon: "🌙", roman: "II", group: "COMMON", bgColor: "#0b1124", borderColor: "#4338ca", textColor: "#f5d0fe" },
  { index: 3, key: "THE_EMPRESS", nameVi: "Nữ Hoàng", nameEn: "The Empress", icon: "🌸", roman: "III", group: "COMMON", bgColor: "#070510", borderColor: "#b45309", textColor: "#fde68a" },
  { index: 4, key: "THE_EMPEROR", nameVi: "Hoàng Đế", nameEn: "The Emperor", icon: "👑", roman: "IV", group: "COMMON", bgColor: "#110926", borderColor: "#6d28d9", textColor: "#e0e7ff" },
  { index: 5, key: "THE_HIEROPHANT", nameVi: "Giáo Hoàng", nameEn: "The Hierophant", icon: "⛪", roman: "V", group: "COMMON", bgColor: "#0b1124", borderColor: "#4338ca", textColor: "#f5d0fe" },
  { index: 6, key: "THE_LOVERS", nameVi: "Người Tình", nameEn: "The Lovers", icon: "💞", roman: "VI", group: "COMMON", bgColor: "#070510", borderColor: "#b45309", textColor: "#fde68a" },
  { index: 7, key: "THE_CHARIOT", nameVi: "Chiến Xa", nameEn: "The Chariot", icon: "🏇", roman: "VII", group: "CRITICAL", deathSubtype: "STEAL_TOP1", bgColor: "#110926", borderColor: "#6d28d9", textColor: "#e0e7ff" },
  { index: 8, key: "STRENGTH", nameVi: "Sức Mạnh", nameEn: "Strength", icon: "💪", roman: "VIII", group: "COMMON", bgColor: "#0b1124", borderColor: "#4338ca", textColor: "#f5d0fe" },
  { index: 9, key: "THE_HERMIT", nameVi: "Ẩn Sĩ", nameEn: "The Hermit", icon: "🔦", roman: "IX", group: "COMMON", bgColor: "#070510", borderColor: "#b45309", textColor: "#fde68a" },
  { index: 10, key: "WHEEL_OF_FORTUNE", nameVi: "Bánh Xe Vận Mệnh", nameEn: "Wheel of Fortune", icon: "🎡", roman: "X", group: "COMMON", bgColor: "#110926", borderColor: "#6d28d9", textColor: "#e0e7ff" },
  { index: 11, key: "JUSTICE", nameVi: "Công Lý", nameEn: "Justice", icon: "⚖️", roman: "XI", group: "COMMON", bgColor: "#0b1124", borderColor: "#4338ca", textColor: "#f5d0fe" },
  { index: 12, key: "THE_HANGED_MAN", nameVi: "Người Treo Ngược", nameEn: "The Hanged Man", icon: "🙃", roman: "XII", group: "CRITICAL", deathSubtype: "GIFT_TOP1", bgColor: "#070510", borderColor: "#b45309", textColor: "#fde68a" },
  { index: 13, key: "THE_DEATH", nameVi: "Thần Chết", nameEn: "Death", icon: "💀", roman: "XIII", group: "CRITICAL", deathSubtype: "STEAL_TOP1", bgColor: "#110926", borderColor: "#6d28d9", textColor: "#e0e7ff" },
  { index: 14, key: "TEMPERANCE", nameVi: "Điều Độ", nameEn: "Temperance", icon: "🏺", roman: "XIV", group: "COMMON", bgColor: "#0b1124", borderColor: "#4338ca", textColor: "#f5d0fe" },
  { index: 15, key: "THE_DEVIL", nameVi: "Ác Quỷ", nameEn: "The Devil", icon: "😈", roman: "XV", group: "MUTATION", bgColor: "#070510", borderColor: "#b45309", textColor: "#fde68a" },
  { index: 16, key: "THE_TOWER", nameVi: "Tháp Sét", nameEn: "The Tower", icon: "⚡", roman: "XVI", group: "MUTATION", bgColor: "#110926", borderColor: "#6d28d9", textColor: "#e0e7ff" },
  { index: 17, key: "THE_STAR", nameVi: "Ngôi Sao", nameEn: "The Star", icon: "⭐", roman: "XVII", group: "MUTATION", bgColor: "#0b1124", borderColor: "#4338ca", textColor: "#f5d0fe" },
  { index: 18, key: "THE_MOON", nameVi: "Mặt Trăng", nameEn: "The Moon", icon: "🌑", roman: "XVIII", group: "MUTATION", bgColor: "#070510", borderColor: "#b45309", textColor: "#fde68a" },
  { index: 19, key: "THE_SUN", nameVi: "Mặt Trời", nameEn: "The Sun", icon: "☀️", roman: "XIX", group: "COMMON", bgColor: "#110926", borderColor: "#6d28d9", textColor: "#fde68a" },
  { index: 20, key: "JUDGEMENT", nameVi: "Phán Quyết", nameEn: "Judgement", icon: "📯", roman: "XX", group: "COMMON", bgColor: "#0b1124", borderColor: "#4338ca", textColor: "#e0e7ff" },
  { index: 21, key: "THE_WORLD", nameVi: "Thế Giới", nameEn: "The World", icon: "🌍", roman: "XXI", group: "COMMON", bgColor: "#110926", borderColor: "#b45309", textColor: "#f5d0fe" },
];

export const TAROT_WHEEL_SEGMENTS: TarotWheelSegment[] = MAJOR_ARCANA_WHEEL_SEGMENTS;
export const TAROT_WHEEL_SEGMENTS_ROUND_1: TarotWheelSegment[] = MAJOR_ARCANA_WHEEL_SEGMENTS;
export const TAROT_WHEEL_SEGMENTS_ROUND_2: TarotWheelSegment[] = MAJOR_ARCANA_WHEEL_SEGMENTS;

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
  { index: 0, key: "THE_PEACE", nameVi: "Bình Yên Thoát Nạn", nameEn: "The Peace", icon: "🕊️", roman: "XXI", group: "COMMON", bgColor: "#070510", borderColor: "#b45309", textColor: "#fde68a" },
  { index: 1, key: "THE_KNIGHT", nameVi: "Hiệp Sĩ (The Knight)", nameEn: "The Knight", icon: "🗡️", roman: "VII", group: "MUTATION", bgColor: "#110926", borderColor: "#6d28d9", textColor: "#e0e7ff" },
  { index: 2, key: "THE_EMPEROR", nameVi: "Hoàng Đế (The Emperor)", nameEn: "The Emperor", icon: "👑", roman: "IV", group: "MUTATION", bgColor: "#0b1124", borderColor: "#4338ca", textColor: "#f5d0fe" },
  { index: 3, key: "THE_DEATH", nameVi: "Thần Chết (Tặng Điểm)", nameEn: "Death", icon: "💀", roman: "XIII", group: "CRITICAL", deathSubtype: "GIFT_TOP1", bgColor: "#070510", borderColor: "#b45309", textColor: "#fde68a" },
  { index: 4, key: "THE_FOOL", nameVi: "Kẻ Khờ (Khói Độc)", nameEn: "The Fool", icon: "🃏", roman: "0", group: "COMMON", bgColor: "#110926", borderColor: "#6d28d9", textColor: "#e0e7ff" },
  { index: 5, key: "THE_PEACE", nameVi: "Bình Yên Thoát Nạn", nameEn: "The Peace", icon: "🕊️", roman: "XXI", group: "COMMON", bgColor: "#0b1124", borderColor: "#4338ca", textColor: "#f5d0fe" },
  { index: 6, key: "THE_KNIGHT", nameVi: "Hiệp Sĩ (The Knight)", nameEn: "The Knight", icon: "🗡️", roman: "VII", group: "MUTATION", bgColor: "#070510", borderColor: "#b45309", textColor: "#fde68a" },
  { index: 7, key: "THE_EMPEROR", nameVi: "Hoàng Đế (The Emperor)", nameEn: "The Emperor", icon: "👑", roman: "IV", group: "MUTATION", bgColor: "#110926", borderColor: "#6d28d9", textColor: "#e0e7ff" },
  { index: 8, key: "THE_DEATH", nameVi: "Thần Chết (Tặng Điểm)", nameEn: "Death", icon: "💀", roman: "XIII", group: "CRITICAL", deathSubtype: "GIFT_TOP1", bgColor: "#0b1124", borderColor: "#4338ca", textColor: "#f5d0fe" },
  { index: 9, key: "THE_FOOL", nameVi: "Kẻ Khờ (Khói Độc)", nameEn: "The Fool", icon: "🃏", roman: "0", group: "COMMON", bgColor: "#070510", borderColor: "#b45309", textColor: "#fde68a" },
  { index: 10, key: "THE_PEACE", nameVi: "Bình Yên Thoát Nạn", nameEn: "The Peace", icon: "🕊️", roman: "XXI", group: "COMMON", bgColor: "#110926", borderColor: "#6d28d9", textColor: "#e0e7ff" },
  { index: 11, key: "THE_KNIGHT", nameVi: "Hiệp Sĩ (The Knight)", nameEn: "The Knight", icon: "🗡️", roman: "VII", group: "MUTATION", bgColor: "#0b1124", borderColor: "#4338ca", textColor: "#f5d0fe" },
  { index: 12, key: "THE_EMPEROR", nameVi: "Hoàng Đế (The Emperor)", nameEn: "The Emperor", icon: "👑", roman: "IV", group: "MUTATION", bgColor: "#070510", borderColor: "#b45309", textColor: "#fde68a" },
  { index: 13, key: "THE_DEATH", nameVi: "Thần Chết (Tặng Điểm)", nameEn: "Death", icon: "💀", roman: "XIII", group: "CRITICAL", deathSubtype: "GIFT_TOP1", bgColor: "#110926", borderColor: "#6d28d9", textColor: "#e0e7ff" },
  { index: 14, key: "THE_FOOL", nameVi: "Kẻ Khờ (Khói Độc)", nameEn: "The Fool", icon: "🃏", roman: "0", group: "COMMON", bgColor: "#0b1124", borderColor: "#4338ca", textColor: "#f5d0fe" },
  { index: 15, key: "THE_PEACE", nameVi: "Bình Yên Thoát Nạn", nameEn: "The Peace", icon: "🕊️", roman: "XXI", group: "COMMON", bgColor: "#070510", borderColor: "#b45309", textColor: "#fde68a" },
  { index: 16, key: "THE_KNIGHT", nameVi: "Hiệp Sĩ (The Knight)", nameEn: "The Knight", icon: "🗡️", roman: "VII", group: "MUTATION", bgColor: "#110926", borderColor: "#6d28d9", textColor: "#e0e7ff" },
  { index: 17, key: "THE_EMPEROR", nameVi: "Hoàng Đế (The Emperor)", nameEn: "The Emperor", icon: "👑", roman: "IV", group: "MUTATION", bgColor: "#0b1124", borderColor: "#4338ca", textColor: "#f5d0fe" },
  { index: 18, key: "THE_DEATH", nameVi: "Thần Chết (Tặng Điểm)", nameEn: "Death", icon: "💀", roman: "XIII", group: "CRITICAL", deathSubtype: "GIFT_TOP1", bgColor: "#070510", borderColor: "#b45309", textColor: "#fde68a" },
  { index: 19, key: "THE_FOOL", nameVi: "Kẻ Khờ (Khói Độc)", nameEn: "The Fool", icon: "🃏", roman: "0", group: "COMMON", bgColor: "#110926", borderColor: "#6d28d9", textColor: "#e0e7ff" },
];

/**
 * Trả về danh sách 22 nan quạt có áp dụng hiệu ứng Perk (SUN_MAGNET_PROMO), Chế độ Sinh Tử,
 * và cơ chế cân bằng rủi ro động theo tình hình trận đấu (UNDERDOG / DOMINANT / NEUTRAL).
 */
export function getEffectiveTarotWheelSegments(
  hasSunMagnet: boolean = false,
  isSurvivalMode: boolean = false,
  options?: {
    riskTier?: TeamRiskTier;
    currentRound?: number;
    teamScore?: number;
    shieldTransformedCardKey?: AncientTarotCardKey;
  }
): TarotWheelSegment[] {
  const riskTier = options?.riskTier ?? "NEUTRAL";
  const currentRound = options?.currentRound ?? 1;
  const teamScore = options?.teamScore ?? 0;

  let segments = (isSurvivalMode ? TAROT_SURVIVAL_WHEEL_SEGMENTS : MAJOR_ARCANA_WHEEL_SEGMENTS).map((seg) => {
    if (!isSurvivalMode) {
      // 1. Vòng 1: Phong ấn Bom Hắc Ám (15 - XV Devil) & Bom Từ Thiện (12 - XII Hanged Man) thành ±0đ (NEUTRAL)
      if (currentRound <= 1 && (seg.index === 12 || seg.index === 15)) {
        return {
          ...seg,
          maskedEffect: "NEUTRAL",
        };
      }
      // 2. Vòng 2: Mở khóa Bom Hắc Ám (15), chỉ còn Bom Từ Thiện (12) phong ấn (trừ khi đội DOMINANT thì chịu đủ 3 Bom)
      if (currentRound === 2 && seg.index === 12 && riskTier !== "DOMINANT") {
        return {
          ...seg,
          maskedEffect: "NEUTRAL",
        };
      }
      // 3. Đội yếu thế (UNDERDOG / 0đ): Giảm nhẹ Bom Hắc Ám (15) & Bom Từ Thiện (12) thành ±0đ
      if ((riskTier === "UNDERDOG" || teamScore <= 0) && (seg.index === 12 || seg.index === 15)) {
        return {
          ...seg,
          maskedEffect: "NEUTRAL",
        };
      }
      // 4. Đội đang dẫn đầu Top 1 (DOMINANT): Khi quay trúng lá Cướp (7 - Chariot, 13 - Death) chỉ nhận +1x Điểm gốc
      if (riskTier === "DOMINANT" && (seg.index === 7 || seg.index === 13)) {
        return {
          ...seg,
          maskedEffect: "SUN_SMALL",
        };
      }
    }
    return seg;
  });

  if (hasSunMagnet && !isSurvivalMode) {
    segments = segments.map((seg) => {
      if (seg.index === 19) {
        return {
          ...seg,
          nameVi: "Mặt Trời (Nam Châm)",
          nameEn: "The Sun (Magnet)",
          isMagnetized: true,
        };
      }
      return seg;
    });
  }

  // LƯỢT 2 SHIELD PROMO: Chuyển hóa loại ô đã quay vô (và tất cả các ô chung chức năng) thành ô CỘNG ĐIỂM (+1x)
  if (options?.shieldTransformedCardKey) {
    segments = segments.map((seg) => {
      if (seg.key === options.shieldTransformedCardKey) {
        const cleanName = seg.nameVi.split(" (")[0];
        return {
          ...seg,
          nameVi: `${cleanName} (Hóa Giải ✨)`,
          icon: "✨",
          bgColor: "#064e3b",
          borderColor: "#10b981",
          textColor: "#6ee7b7",
          isShieldTransformed: true,
          maskedEffect: "SUN_SMALL",
        };
      }
      return seg;
    });
  }

  return segments;
}

export interface TarotSegmentDisplayInfo {
  mainLabel: string;
  badge?: string;
  colorType: "POSITIVE" | "NEGATIVE" | "NEUTRAL" | "SPECIAL";
}

/**
 * Helper trích xuất nhãn chức năng và điểm số thực tế hiển thị trên nan quạt Vòng Quay Tarot:
 * - Thay vì số La Mã, hiển thị các nhãn trực quan: +10, +15, +20, THÊM LƯỢT, MẤT ĐIỂM, BOM HẮC ÁM, CƯỚP ĐIỂM...
 */
export function getTarotSegmentDisplayLabel(
  seg: TarotWheelSegment,
  basePointsInput: number = 10,
  isSurvivalMode: boolean = false
): TarotSegmentDisplayInfo {
  const basePoints = Math.max(5, normalizeToThreeLevels(basePointsInput || 10));

  // 1. Khiên thần hóa giải (Lượt 2)
  if (seg.isShieldTransformed) {
    return {
      mainLabel: `+${basePoints}`,
      colorType: "POSITIVE",
    };
  }

  // 2. Chế độ Sinh Tử (20 nan quạt)
  if (isSurvivalMode) {
    if (seg.key === "THE_PEACE") {
      return { mainLabel: "THOÁT NẠN", colorType: "NEUTRAL" };
    }
    if (seg.key === "THE_KNIGHT") {
      return { mainLabel: "CHIA ĐÔI", colorType: "NEGATIVE" };
    }
    if (seg.key === "THE_EMPEROR") {
      return { mainLabel: "BOM HẮC ÁM", colorType: "NEGATIVE" };
    }
    if (seg.key === "THE_DEATH") {
      return { mainLabel: "HIẾN TẾ", colorType: "NEGATIVE" };
    }
    if (seg.key === "THE_FOOL") {
      const pen = Math.max(5, Math.round(basePoints * 0.5));
      return { mainLabel: `-${pen}`, colorType: "NEGATIVE" };
    }
  }

  // 3. Chế độ Thường (22 Major Arcana)
  // Masked Effect (được phong ấn hoặc bảo hộ)
  if (seg.maskedEffect === "NEUTRAL") {
    return { mainLabel: "MẤT LƯỢT", colorType: "NEUTRAL" };
  }
  if (seg.maskedEffect === "SUN_SMALL") {
    return { mainLabel: `+${basePoints}`, colorType: "POSITIVE" };
  }

  // a) Lá +1x: I Magician, II High Priestess, V Hierophant, IX Hermit, IV Emperor, VIII Strength
  if (
    seg.key === "THE_MAGICIAN" ||
    seg.key === "THE_HIGH_PRIESTESS" ||
    seg.key === "THE_HIEROPHANT" ||
    seg.key === "THE_HERMIT" ||
    seg.key === "THE_EMPEROR" ||
    seg.key === "STRENGTH"
  ) {
    return { mainLabel: `+${basePoints}`, colorType: "POSITIVE" };
  }

  // b) Lá +1.5x: III Empress, XX Judgement
  if (
    seg.key === "THE_EMPRESS" ||
    seg.key === "JUDGEMENT"
  ) {
    const pts = roundToMultipleOfFive(basePoints * 1.5);
    return { mainLabel: `+${pts}`, colorType: "POSITIVE" };
  }

  // c) Lá XIV Temperance (Tiết Độ: +1.5x đội chính, +0.5x đối thủ):
  if (seg.key === "TEMPERANCE") {
    return { mainLabel: "SẺ CHIA", colorType: "SPECIAL" };
  }

  // d) 3 lá +2x: VI Lovers, XIX Sun, XXI World
  if (
    seg.key === "THE_LOVERS" ||
    seg.key === "THE_SUN" ||
    seg.key === "THE_WORLD"
  ) {
    const pts = basePoints * 2;
    return { mainLabel: `+${pts}`, colorType: "POSITIVE" };
  }

  // d) 2 lá Cược thêm lượt
  if (seg.key === "THE_STAR" || seg.key === "THE_MOON") {
    return { mainLabel: "THÊM LƯỢT", colorType: "SPECIAL" };
  }

  // e) 2 lá Cướp điểm (Phương án 2: VII Chiến Xa 50% nhẹ nhàng, XIII Thần Chết 100% chí mạng):
  if (seg.key === "THE_CHARIOT") {
    const stealPts = Math.max(5, roundToMultipleOfFive(basePoints * 0.5));
    return { mainLabel: `CƯỚP ${stealPts}`, colorType: "SPECIAL" };
  }
  if (seg.key === "THE_DEATH") {
    const stealPts = basePoints;
    return { mainLabel: `CƯỚP ${stealPts}`, colorType: "SPECIAL" };
  }

  // f) 1 lá Ngẫu nhiên: X Wheel of Fortune
  if (seg.key === "WHEEL_OF_FORTUNE") {
    return { mainLabel: "MAY MẮN", colorType: "SPECIAL" };
  }

  // g) 2 lá Mất lượt: 0 Fool & XI Justice
  if (seg.key === "THE_FOOL" || seg.key === "JUSTICE") {
    return { mainLabel: "MẤT LƯỢT", colorType: "NEUTRAL" };
  }

  // h) 1 lá Bẫy sập: XVI Tower (-1x điểm)
  if (seg.key === "THE_TOWER") {
    return { mainLabel: `-${basePoints}`, colorType: "NEGATIVE" };
  }

  // i) 1 lá Bom Hắc Ám: XV Devil
  if (seg.key === "THE_DEVIL") {
    return { mainLabel: "BOM HẮC ÁM", colorType: "NEGATIVE" };
  }

  // j) 1 lá Bom Từ Thiện: XII Hanged Man
  if (seg.key === "THE_HANGED_MAN") {
    return { mainLabel: "BOM TỪ THIỆN", colorType: "NEGATIVE" };
  }

  return { mainLabel: `+${basePoints}`, colorType: "POSITIVE" };
}

/**
 * Tính toán góc quay vật lý và ô trúng thưởng dựa trên lực nạp (Power Percent 1-100%).
 * Chuẩn Chiếc Nón Kỳ Diệu: Xoay từ trên 1 vòng (5% -> ~1.2 vòng = 440°) đến tối đa 3 vòng (100% -> 1080°) trong 15s – 20s.
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
    shieldTransformedCardKey?: AncientTarotCardKey;
  };
}): {
  targetAngle: number;
  spinDurationMs: number;
  landedSegment: TarotWheelSegment;
  landedIndex: number;
} {
  const clampedPower = Math.max(1, Math.min(100, Math.round(powerPercent)));
  // Lực tối thiểu ~1.15 vòng (414°), lực tối đa đúng 3.0 vòng (1080°)
  const minTurnsAngle = 1.15 * 360; // 414° (trên 1 vòng)
  const maxExtraAngle = (3.0 - 1.15) * 360; // 666° (đạt tối đa đúng 3.0 vòng = 1080°)
  const extraAngle = Math.round(((clampedPower - 1) / 99) * maxExtraAngle);
  const jitter = Math.floor(Math.random() * 7) - 3;
  let totalDelta = minTurnsAngle + extraAngle + jitter;

  const segAngle = isSurvivalMode ? 18 : 360 / 22;
  const segCount = isSurvivalMode ? 20 : 22;

  // Mô phỏng chính xác hiện tượng "Chiếc nón kỳ diệu" khi dừng ở giữa hai chốt:
  // Kim bị chốt đẩy chéo về ô bên phải (theo hướng nhìn).
  // Nếu lực quay và xung lượng còn đủ -> Bánh xe lách qua đỉnh chốt, kim bật tách sang ô bên trái!
  let pointerAngle = (360 - ((currentAngle + totalDelta) % 360)) % 360;
  const remInSeg = pointerAngle % segAngle;
  if (remInSeg < 2.4) {
    // Rơi vào vùng tiếp xúc chốt: quyết định vượt đỉnh chốt hay bật lùi
    const hasEnoughForceToPushThrough = (clampedPower * 7 + jitter * 13) % 100 > 45;
    if (hasEnoughForceToPushThrough) {
      // Đủ lực: Vượt qua đỉnh chốt sang ô tiếp theo
      totalDelta += 3.2;
    } else {
      // Không đủ lực: Lò xo kim đẩy bánh xe giật lùi nhẹ (rollback) về ô bên phải
      totalDelta -= 1.8;
    }
  } else if (remInSeg > segAngle - 2.4) {
    const hasEnoughForceToPushThrough = (clampedPower * 11 + jitter * 17) % 100 > 45;
    if (hasEnoughForceToPushThrough) {
      totalDelta += 2.2;
    } else {
      totalDelta -= 3.0;
    }
  }

  const targetAngle = currentAngle + totalDelta;
  pointerAngle = (360 - (targetAngle % 360)) % 360;
  const landedIndex = Math.floor(pointerAngle / segAngle) % segCount;
  const effectiveSegments = getEffectiveTarotWheelSegments(hasSunMagnet, isSurvivalMode, options);
  const landedSegment = effectiveSegments[landedIndex];
  // Thời gian quay từ 15.0s (15000ms) đến 20.0s (20000ms) tùy theo lực quay (1% -> 100%)
  const spinDurationMs = Math.round(15000 + ((clampedPower - 1) / 99) * 5000);

  return {
    targetAngle,
    spinDurationMs,
    landedSegment,
    landedIndex,
  };
}

/**
 * Helper tính toán hiệu ứng và điểm số của lá bài Tarot 22 Major Arcana:
 * - Phân bổ chuẩn 22 lá:
 *   + 4 lá +1x Điểm gốc (I Magician, II Priestess, V Hierophant, IX Hermit)
 *   + 4 lá +1.5x Điểm gốc (III Empress, IV Emperor, VIII Strength, XX Judgement)
 *   + 4 lá +2x Điểm gốc (VI Lovers, XIV Temperance, XIX Sun, XXI World)
 *   + 1 lá Ngẫu nhiên x1/x1.5/x2 (X Wheel of Fortune)
 *   + 2 lá Đánh cược quay thêm (XVII Star, XVIII Moon)
 *   + 2 lá Cướp 2x Điểm gốc từ đối thủ (VII Chariot, XIII Death)
 *   + 1 lá Bom Hắc Ám (XV Devil)
 *   + 1 lá Bẫy Sập -1x Điểm gốc (XVI Tower)
 *   + 1 lá Bom Từ Thiện (XII Hanged Man)
 *   + 2 lá Kẻ Khờ ±0đ (0 Fool, XI Justice)
 * - Hỗ trợ 3 tầng cân bằng động (Vòng 1/2/3+, UNDERDOG/DOMINANT) & Chống cướp liên hoàn.
 */
export function resolveWheelCardEffect({
  cardKey,
  basePoints,
  team,
  allTeams = [],
  currentRound = 1,
  riskTier = "NEUTRAL",
  isGambleSpin = false,
  isSurvivalMode = false,
  timesStolenInCycle = {},
  shieldTransformedCardKey,
  currentHearts = 1,
  maxHearts = 3,
}: {
  cardKey: AncientTarotCardKey;
  basePoints: number;
  team: MysteryTeamRef;
  allTeams?: MysteryTeamRef[];
  currentRound?: number;
  riskTier?: TeamRiskTier;
  isGambleSpin?: boolean;
  isSurvivalMode?: boolean;
  timesStolenInCycle?: Record<string, number>;
  shieldTransformedCardKey?: AncientTarotCardKey;
  currentHearts?: number;
  maxHearts?: number;
}): {
  drawnCard: AncientTarotDrawnCard;
  finalScoreDelta: number;
  scorePenalty: number;
  isBomb: boolean;
  victimTeamId?: string;
  victimTeamName?: string;
  stolenPoints?: number;
  giftedPoints?: number;
  darkBombRecipients?: Array<{ teamId: string; teamName: string; points: number }>;
  scoreDeltas: Array<{ teamId: string; delta: number }>;
  rewardText: string;
  isGambleTrigger?: boolean;
} {
  const currentScore = team.score || 0;
  const otherTeams = (allTeams || []).filter((t) => t.id !== team.id && !t.isEliminated);

  // LƯỢT 2 SHIELD PROMO: Chuyển hóa loại ô đã quay vô (và tất cả ô chung chức năng) thành ô CỘNG ĐIỂM
  if (shieldTransformedCardKey && cardKey === shieldTransformedCardKey) {
    const seg =
      (isSurvivalMode ? TAROT_SURVIVAL_WHEEL_SEGMENTS : MAJOR_ARCANA_WHEEL_SEGMENTS).find(
        (s) => s.key === cardKey
      ) || MAJOR_ARCANA_WHEEL_SEGMENTS[0];
    const cleanName = seg.nameVi.split(" (")[0];
    const scoreDelta = basePoints;
    return {
      drawnCard: {
        key: cardKey,
        nameVi: `${cleanName} (Hóa Giải Điềm Lành ✨)`,
        nameEn: `${seg.nameEn} (Blessed)`,
        icon: "✨",
        roman: seg.roman,
        group: "COMMON",
        scoreDelta,
      },
      finalScoreDelta: scoreDelta,
      scorePenalty: 0,
      isBomb: false,
      scoreDeltas: [{ teamId: team.id, delta: scoreDelta }],
      rewardText: `🛡️✨ ${cleanName} (ĐÃ HÓA GIẢI): Nhờ Khiên Thần chuyển hóa ô phạt thành điềm lành! Đội bạn nhận trọn vẹn +${scoreDelta}đ!`,
    };
  }

  if (isSurvivalMode) {
    if (cardKey === "THE_PEACE") {
      return {
        drawnCard: {
          key: "THE_PEACE",
          nameVi: "Bình Yên Thoát Nạn",
          nameEn: "The Peace",
          icon: "🕊️",
          roman: "XXI",
          group: "COMMON",
          scoreDelta: 0,
        },
        finalScoreDelta: 0,
        scorePenalty: 0,
        isBomb: false,
        scoreDeltas: [],
        rewardText: `🕊️ BÌNH YÊN THOÁT NẠN: May mắn thần kỳ! Bạn đã sống sót qua vòng quay Sinh Tử và bảo toàn nguyên vẹn số điểm!`,
      };
    }
    if (cardKey === "THE_FOOL") {
      const smokePenalty = Math.min(currentScore, roundToMultipleOfFive(basePoints * 0.5));
      return {
        drawnCard: {
          key: "THE_FOOL",
          nameVi: "Kẻ Khờ (Khói Độc Sinh Tử)",
          nameEn: "The Fool",
          icon: "🃏",
          roman: "0",
          group: "COMMON",
          scoreDelta: -smokePenalty,
        },
        finalScoreDelta: -smokePenalty,
        scorePenalty: smokePenalty,
        isBomb: true,
        scoreDeltas: smokePenalty > 0 ? [{ teamId: team.id, delta: -smokePenalty }] : [],
        rewardText: `🃏 KẺ KHỜ (KHÓI ĐỘC SINH TỬ): Chế độ Sinh Tử phạt trừ 50% điểm gốc câu hỏi (-${smokePenalty}đ)!`,
      };
    }
    if (cardKey === "THE_EMPEROR") {
      const darkOutcome = resolveBombOutcome({
        bombType: "BOMB_DARK",
        team,
        allTeams,
        storyDescription: "Hoàng Đế uy quyền hắc ám! Rút cạn điểm số chia đều cho các đối thủ!",
        baseQuestionPoints: basePoints,
        isSurvivalPenalty: true,
      });
      const scoreDeltas: Array<{ teamId: string; delta: number }> = [
        ...(darkOutcome.penalty > 0 ? [{ teamId: team.id, delta: -darkOutcome.penalty }] : []),
        ...(darkOutcome.darkBombRecipients || []).map((r) => ({ teamId: r.teamId, delta: r.points })),
      ];
      return {
        drawnCard: {
          key: "THE_EMPEROR",
          nameVi: "Hoàng Đế",
          nameEn: "The Emperor",
          icon: "👑",
          roman: "IV",
          group: "MUTATION",
          scoreDelta: -darkOutcome.penalty,
          darkBombRecipients: darkOutcome.darkBombRecipients,
        },
        finalScoreDelta: -darkOutcome.penalty,
        scorePenalty: darkOutcome.penalty,
        isBomb: true,
        darkBombRecipients: darkOutcome.darkBombRecipients,
        scoreDeltas,
        rewardText: `👑 HOÀNG ĐẾ: Năng lượng bóng tối nuốt chửng! Trừ ${darkOutcome.penalty}đ phân chia cho đối thủ!`,
      };
    }
    if (cardKey === "THE_KNIGHT") {
      const halfScore = Math.min(currentScore, roundToMultipleOfFive(currentScore * 0.5));
      return {
        drawnCard: {
          key: "THE_KNIGHT",
          nameVi: "Hiệp Sĩ",
          nameEn: "The Knight",
          icon: "🗡️",
          roman: "VII",
          group: "MUTATION",
          scoreDelta: -halfScore,
        },
        finalScoreDelta: -halfScore,
        scorePenalty: halfScore,
        isBomb: true,
        scoreDeltas: halfScore > 0 ? [{ teamId: team.id, delta: -halfScore }] : [],
        rewardText: `🗡️ HIỆP SĨ: Định mệnh trừng phạt xóa sổ 1/2 tổng điểm hiện có (-${halfScore}đ)!`,
      };
    }
    // THE_DEATH in survival: GIFT_TOP1
    let top1Team: MysteryTeamRef | undefined = undefined;
    if (otherTeams.length > 0) {
      const maxScore = Math.max(...otherTeams.map((t) => t.score || 0));
      const topCandidates = otherTeams.filter((t) => (t.score || 0) === maxScore);
      top1Team = topCandidates[Math.floor(Math.random() * topCandidates.length)];
    }
    const halfScore = roundToMultipleOfFive(currentScore * 0.5);
    const baseOneAndHalf = roundToMultipleOfFive(basePoints * 1.5);
    const targetPenalty = Math.min(halfScore, baseOneAndHalf);
    const gifted = currentScore > 0 ? Math.min(currentScore, targetPenalty) : 0;
    return {
      drawnCard: {
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
      },
      finalScoreDelta: -gifted,
      scorePenalty: gifted,
      isBomb: gifted > 0,
      victimTeamId: top1Team?.id,
      victimTeamName: top1Team?.name,
      giftedPoints: gifted,
      scoreDeltas: [
        ...(gifted > 0 ? [{ teamId: team.id, delta: -gifted }] : []),
        ...(top1Team && gifted > 0 ? [{ teamId: top1Team.id, delta: gifted }] : []),
      ],
      rewardText: `💀 THẦN CHẾT (HIẾN TẾ): Bị phạt (-${gifted}đ) chuyển tặng trọn gói cho Top 1 (${top1Team?.name || "Đối thủ"})!`,
    };
  }

  // Find card metadata in MAJOR_ARCANA_WHEEL_SEGMENTS
  const seg =
    MAJOR_ARCANA_WHEEL_SEGMENTS.find((s) => s.key === cardKey) ||
    MAJOR_ARCANA_WHEEL_SEGMENTS[0];

  // 10 nhóm hiệu ứng cố định chuẩn 22 lá Major Arcana:
  const isNeutral = cardKey === "THE_FOOL" || cardKey === "JUSTICE"; // 2 lá ±0đ
  const isSunSmall =
    cardKey === "THE_MAGICIAN" ||
    cardKey === "THE_HIGH_PRIESTESS" ||
    cardKey === "THE_HIEROPHANT" ||
    cardKey === "THE_HERMIT" ||
    cardKey === "THE_EMPEROR" ||
    cardKey === "STRENGTH"; // +1x Điểm gốc (THE_EMPEROR kèm Khiên, STRENGTH kèm Tim)
  const isSunMedium =
    cardKey === "THE_EMPRESS" ||
    cardKey === "JUDGEMENT"; // +1.5x
  const isSunTemperance = cardKey === "TEMPERANCE"; // lá Tiết Độ: +1.5x cho đội quay, +0.5x sẻ chia đối thủ
  const isSunLarge =
    cardKey === "THE_LOVERS" ||
    cardKey === "THE_SUN" ||
    cardKey === "THE_WORLD"; // 3 lá +2x
  const isSunRandom = cardKey === "WHEEL_OF_FORTUNE"; // 1 lá Ngẫu nhiên x1/x1.5/x2
  const isGamble = cardKey === "THE_STAR" || cardKey === "THE_MOON"; // 2 lá Đánh cược quay thêm
  const isSteal2x = cardKey === "THE_CHARIOT" || cardKey === "THE_DEATH" || cardKey === "DEATH"; // 2 lá Cướp 2x
  const isBombDark = cardKey === "THE_DEVIL"; // 1 lá Bom Hắc Ám
  const isBombTrap = cardKey === "THE_TOWER" || cardKey === "THE_KNIGHT"; // 1 lá Bẫy Sập -1x
  const isBombCharity = cardKey === "THE_HANGED_MAN"; // 1 lá Bom Từ Thiện

  type EffectiveTarotEffect =
    | "NEUTRAL"
    | "SUN_SMALL"
    | "SUN_MEDIUM"
    | "SUN_TEMPERANCE"
    | "SUN_LARGE"
    | "SUN_RANDOM"
    | "GAMBLE"
    | "STEAL_2X"
    | "BOMB_DARK"
    | "BOMB_TRAP"
    | "BOMB_CHARITY";

  let effectiveEffectType: EffectiveTarotEffect = "SUN_SMALL";

  if (isNeutral) {
    effectiveEffectType = "NEUTRAL";
  } else if (isSunSmall) {
    effectiveEffectType = "SUN_SMALL";
  } else if (isSunMedium) {
    effectiveEffectType = "SUN_MEDIUM";
  } else if (isSunTemperance) {
    effectiveEffectType = "SUN_TEMPERANCE";
  } else if (isSunLarge) {
    effectiveEffectType = "SUN_LARGE";
  } else if (isSunRandom) {
    effectiveEffectType = "SUN_RANDOM";
  } else if (isGamble) {
    effectiveEffectType = "GAMBLE";
  } else if (isSteal2x) {
    effectiveEffectType = "STEAL_2X";
  } else if (isBombDark) {
    effectiveEffectType = "BOMB_DARK";
  } else if (isBombTrap) {
    effectiveEffectType = "BOMB_TRAP";
  } else if (isBombCharity) {
    effectiveEffectType = "BOMB_CHARITY";
  } else {
    effectiveEffectType = "SUN_SMALL";
  }

  // ── 3 TẦNG CÂN BẰNG ĐỘNG (Round 1/2/3+ & Tình hình đội UNDERDOG/DOMINANT) ──
  // TUYỆT ĐỐI: Lá trừ không bao giờ được cộng điểm! Khi phong ấn/bảo vệ thì chỉ giảm thành ±0đ (NEUTRAL).
  let dynamicReason: "ROUND_SEALED" | "UNDERDOG_PROTECTED" | "DOMINANT_CAPPED" | null = null;

  if (!isGambleSpin) {
    // Tầng 1: Vòng 1 phong ấn Bom Hắc Ám (XV Devil) & Bom Từ Thiện (XII Hanged Man) thành ±0đ (NEUTRAL)
    if (
      currentRound <= 1 &&
      (effectiveEffectType === "BOMB_DARK" || effectiveEffectType === "BOMB_CHARITY")
    ) {
      effectiveEffectType = "NEUTRAL";
      dynamicReason = "ROUND_SEALED";
    }
    // Tầng 2: Vòng 2 mở khóa Bom Hắc Ám, giữ phong ấn Bom Từ Thiện thành ±0đ (NEUTRAL) (trừ khi đội đang DOMINANT)
    else if (
      currentRound === 2 &&
      effectiveEffectType === "BOMB_CHARITY" &&
      riskTier !== "DOMINANT"
    ) {
      effectiveEffectType = "NEUTRAL";
      dynamicReason = "ROUND_SEALED";
    }

    // Tầng 3a: Bảo hộ đội yếu thế (UNDERDOG hoặc đang 0đ) khi trúng Bom Hắc Ám / Bom Từ Thiện -> giảm nhẹ thành ±0đ
    if (
      (riskTier === "UNDERDOG" || currentScore <= 0) &&
      (effectiveEffectType === "BOMB_DARK" || effectiveEffectType === "BOMB_CHARITY")
    ) {
      effectiveEffectType = "NEUTRAL";
      dynamicReason = "UNDERDOG_PROTECTED";
    }

    // Tầng 3b: Đội đang dẫn đầu Top 1 (DOMINANT) khi quay trúng lá Cướp 2x chỉ nhận +1x Điểm gốc (không cướp của đội yếu hơn)
    if (riskTier === "DOMINANT" && effectiveEffectType === "STEAL_2X") {
      effectiveEffectType = "SUN_SMALL";
      dynamicReason = "DOMINANT_CAPPED";
    }
  }

  switch (effectiveEffectType) {
    case "NEUTRAL": {
      let rewardText = `🃏 ${seg.nameVi} (${seg.nameEn}): Điềm tĩnh giữ mình! Bảo toàn nguyên vẹn số điểm (±0đ).`;
      if (dynamicReason === "ROUND_SEALED") {
        rewardText = `🛡️ ${seg.nameVi} (${seg.nameEn}): Cán Cân Định Mệnh! Ấn phạt được phong ấn đầu trận, thoát nạn bảo toàn số điểm (±0đ)!`;
      } else if (dynamicReason === "UNDERDOG_PROTECTED") {
        rewardText = `🛡️ ${seg.nameVi} (${seg.nameEn}): Bảo Hộ Kẻ Yếu! Định mệnh nương tay, hóa giải kiếp nạn và bảo toàn số điểm (±0đ)!`;
      }

      return {
        drawnCard: {
          key: cardKey,
          nameVi: seg.nameVi,
          nameEn: seg.nameEn,
          icon: seg.icon,
          roman: seg.roman,
          group: "COMMON",
          scoreDelta: 0,
        },
        finalScoreDelta: 0,
        scorePenalty: 0,
        isBomb: false,
        scoreDeltas: [],
        rewardText,
      };
    }

    case "SUN_SMALL": {
      let rewardText = `✨ ${seg.nameVi} (${seg.nameEn}): Điềm lành soi chiếu! Nhận trọn vẹn +${basePoints}đ (x1) an toàn!`;
      if (cardKey === "THE_EMPEROR") {
        rewardText = `🛡️ ${seg.nameVi} (${seg.nameEn}): Uy quyền Hoàng Đế! Nhận trọn vẹn +${basePoints}đ (x1) và được kích hoạt Khiên Thần hộ thể!`;
      } else if (cardKey === "STRENGTH") {
        const curHearts = currentHearts;
        rewardText = curHearts >= maxHearts
          ? `❤️ ${seg.nameVi} (${seg.nameEn}): Ý chí kiên cường! Nhận trọn vẹn +${basePoints}đ (x1) (Đã đạt tối đa ❤️ ${maxHearts} - không hồi thêm)!`
          : `❤️ ${seg.nameVi} (${seg.nameEn}): Ý chí kiên cường! Nhận trọn vẹn +${basePoints}đ (x1) và hồi phục thêm 1 Trái Tim sinh mệnh!`;
      } else if (dynamicReason === "DOMINANT_CAPPED") {
        rewardText = `⚖️ ${seg.nameVi}: Cán Cân Định Mệnh! Đội đang dẫn đầu nhận thưởng an toàn +${basePoints}đ thay vì cướp điểm của đội yếu hơn!`;
      }

      return {
        drawnCard: {
          key: cardKey,
          nameVi: seg.nameVi,
          nameEn: seg.nameEn,
          icon: seg.icon,
          roman: seg.roman,
          group: "COMMON",
          scoreDelta: basePoints,
        },
        finalScoreDelta: basePoints,
        scorePenalty: 0,
        isBomb: false,
        scoreDeltas: [{ teamId: team.id, delta: basePoints }],
        rewardText,
      };
    }

    case "SUN_TEMPERANCE": {
      const scoreDelta = roundToMultipleOfFive(basePoints * 1.5);
      const pHalf = roundToMultipleOfFive(basePoints * 0.5);
      const otherRecipients = otherTeams.map((t) => ({ teamId: t.id, teamName: t.name, points: pHalf }));
      const scoreDeltas = [
        { teamId: team.id, delta: scoreDelta },
        ...otherRecipients.map((r) => ({ teamId: r.teamId, delta: r.points })),
      ];
      return {
        drawnCard: {
          key: cardKey,
          nameVi: seg.nameVi,
          nameEn: seg.nameEn,
          icon: seg.icon,
          roman: seg.roman,
          group: "COMMON",
          scoreDelta,
          temperanceBonusRecipients: otherRecipients,
        },
        finalScoreDelta: scoreDelta,
        scorePenalty: 0,
        isBomb: false,
        scoreDeltas,
        rewardText: `⚖️ ${seg.nameVi} (${seg.nameEn}): Tiết Độ dung hòa! Đội bạn nhận trọn vẹn +${scoreDelta}đ (x1.5), đồng thời sẻ chia phước lành +${pHalf}đ (x0.5) cho tất cả đối thủ!`,
      };
    }

    case "SUN_MEDIUM": {
      const scoreDelta = roundToMultipleOfFive(basePoints * 1.5);
      return {
        drawnCard: {
          key: cardKey,
          nameVi: seg.nameVi,
          nameEn: seg.nameEn,
          icon: seg.icon,
          roman: seg.roman,
          group: "COMMON",
          scoreDelta,
        },
        finalScoreDelta: scoreDelta,
        scorePenalty: 0,
        isBomb: false,
        scoreDeltas: [{ teamId: team.id, delta: scoreDelta }],
        rewardText: `🌟 ${seg.nameVi} (${seg.nameEn}): Định mệnh nâng đỡ! Nhận nóng +${scoreDelta}đ (x1.5)!`,
      };
    }

    case "SUN_LARGE": {
      const scoreDelta = basePoints * 2;
      return {
        drawnCard: {
          key: cardKey,
          nameVi: seg.nameVi,
          nameEn: seg.nameEn,
          icon: seg.icon,
          roman: seg.roman,
          group: "COMMON",
          scoreDelta,
        },
        finalScoreDelta: scoreDelta,
        scorePenalty: 0,
        isBomb: false,
        scoreDeltas: [{ teamId: team.id, delta: scoreDelta }],
        rewardText: `☀️ ${seg.nameVi} (${seg.nameEn}): Đại cát vinh quang! Bùng nổ +${scoreDelta}đ (x2)!`,
      };
    }

    case "SUN_RANDOM": {
      // 50% -> x1, 35% -> x1.5, 15% -> x2
      const rand = Math.random();
      let mult = 1;
      if (rand < 0.5) {
        mult = 1;
      } else if (rand < 0.85) {
        mult = 1.5;
      } else {
        mult = 2;
      }
      const scoreDelta = mult === 1.5 ? roundToMultipleOfFive(basePoints * 1.5) : basePoints * mult;
      return {
        drawnCard: {
          key: cardKey,
          nameVi: seg.nameVi,
          nameEn: seg.nameEn,
          icon: seg.icon,
          roman: seg.roman,
          group: "COMMON",
          scoreDelta,
        },
        finalScoreDelta: scoreDelta,
        scorePenalty: 0,
        isBomb: false,
        scoreDeltas: [{ teamId: team.id, delta: scoreDelta }],
        rewardText: `🎡 ${seg.nameVi}: Vận may xoay vần x${mult}! Nhận được +${scoreDelta}đ!`,
      };
    }

    case "STEAL_2X": {
      // 5. Định mức cướp theo lá bài (Phương án 2: VII Chiến Xa 50% nhẹ nhàng, XIII Thần Chết 100% chí mạng):
      const isChariot = cardKey === "THE_CHARIOT";
      const nominalSteal = isChariot
        ? Math.max(5, roundToMultipleOfFive(basePoints * 0.5))
        : basePoints;

      // Quy tắc Cướp Điểm Công Bằng & Chống Cướp Liên Hoàn:
      // (Số lần được tính từ lượt X của đội bị cướp đến trước lượt X + 1 của họ)
      // - Với VII Chiến Xa: Một đội đã bị cướp 1 lần trước đó (timesStolen >= 1) thì KHÔNG THỂ bị cướp bởi Chiến Xa.
      // - Với XIII Thần Chết: Bị cướp 1 lần trước đó (timesStolen = 1) VẪN CÓ THỂ bị cướp 50% bởi Thần Chết ở lần 2.
      // - Đội đã bị cướp >= 2 lần hoàn toàn miễn nhiễm với mọi loại cướp.
      const maxAllowedSteals = isChariot ? 1 : 2;

      // 1. Lọc các đối thủ đang có điểm > 0
      const opponentsWithPoints = otherTeams.filter((t) => (t.score || 0) > 0);
      // 2. Lọc đối thủ hợp lệ theo giới hạn của từng lá bài
      const eligibleOpponents = opponentsWithPoints.filter((t) => (timesStolenInCycle[t.id] ?? 0) < maxAllowedSteals);

      // 3. Nếu không có đối thủ nào hợp lệ để cướp -> thưởng an toàn từ Hệ thống (quy tắc: mọi đối thủ đều có khiên, hệ thống chỉ tính nửa số điểm gốc)
      if (eligibleOpponents.length === 0) {
        const fallbackReward = Math.max(5, roundToMultipleOfFive(basePoints * 0.5));
        const rewardReason = isChariot
          ? `Các đối thủ có điểm đều đã từng bị cướp trong vòng và được miễn nhiễm trước Chiến Xa!`
          : `Các đối thủ có điểm đều đang được Khiên Miễn Nhiễm Cướp bảo vệ!`;

        const rewardText =
          opponentsWithPoints.length > 0
            ? `🛡️ ${seg.nameVi}: ${rewardReason} Tất cả đối thủ đều có khiên, Hệ Thống chỉ trợ cấp nửa số điểm gốc (+${fallbackReward}đ)!`
            : `✨ ${seg.nameVi}: Chưa có đối thủ nào có điểm để cướp! Hệ Thống chỉ trợ cấp nửa số điểm gốc (+${fallbackReward}đ)!`;

        return {
          drawnCard: {
            key: cardKey,
            nameVi: seg.nameVi,
            nameEn: seg.nameEn,
            icon: seg.icon,
            roman: seg.roman,
            group: "COMMON",
            scoreDelta: fallbackReward,
          },
          finalScoreDelta: fallbackReward,
          scorePenalty: 0,
          isBomb: false,
          scoreDeltas: [{ teamId: team.id, delta: fallbackReward }],
          rewardText,
        };
      }

      // 4. Chọn đối thủ có điểm cao nhất trong nhóm hợp lệ
      const maxScore = Math.max(...eligibleOpponents.map((t) => t.score || 0));
      const topCandidates = eligibleOpponents.filter((t) => (t.score || 0) === maxScore);
      const victim = topCandidates[Math.floor(Math.random() * topCandidates.length)];
      const victimScore = victim.score || 0;

      // 5. Tính toán mức cướp thực tế:
      // - Với Chiến Xa: Nạn nhân chắc chắn có timesStolen = 0 -> Cướp 50% điểm gốc.
      // - Với Thần Chết: Nếu timesStolen = 0 -> Cướp 100% điểm gốc; nếu timesStolen = 1 -> Cướp 50% điểm gốc ở lần 2.
      const timesStolen = timesStolenInCycle[victim.id] ?? 0;
      let targetSteal = nominalSteal;
      let halfNote = "";

      if (!isChariot && timesStolen === 1) {
        targetSteal = Math.max(5, roundToMultipleOfFive(basePoints * 0.5));
        halfNote = ` (Đội ${victim.name} đã bị cướp 1 lần trước đó: Thần Chết cướp 50% điểm gốc ở lần 2)`;
      }

      // 6. Khóa công bằng 1:1: Đối thủ thực tế mất bao nhiêu điểm thì đội quay nhận ĐÚNG bấy nhiêu điểm
      // Tuyệt đối không bao giờ vượt quá điểm gốc câu hỏi!
      const actualStolen = Math.min(targetSteal, victimScore, nominalSteal);
      const scoreDeltas: Array<{ teamId: string; delta: number }> = [
        { teamId: team.id, delta: actualStolen },
        { teamId: victim.id, delta: -actualStolen },
      ];

      return {
        drawnCard: {
          key: cardKey,
          nameVi: seg.nameVi,
          nameEn: seg.nameEn,
          icon: seg.icon,
          roman: seg.roman,
          group: "CRITICAL",
          deathSubtype: "STEAL_TOP1",
          scoreDelta: actualStolen,
          stolenPoints: actualStolen,
          victimTeamId: victim.id,
          victimTeamName: victim.name,
        },
        finalScoreDelta: actualStolen,
        scorePenalty: 0,
        isBomb: false,
        victimTeamId: victim.id,
        victimTeamName: victim.name,
        stolenPoints: actualStolen,
        scoreDeltas,
        rewardText: `🗡️ ${seg.nameVi} (${seg.nameEn}): Đoạt mệnh công bằng! Cướp +${actualStolen}đ từ ${victim.name} (-${actualStolen}đ)${halfNote}!`,
      };
    }

    case "BOMB_DARK": {
      // XV — The Devil: Bom Hắc Ám (trừ điểm đội quay chia +5đ cho mỗi đối thủ)
      const darkOutcome = resolveBombOutcome({
        bombType: "BOMB_DARK",
        team,
        allTeams,
        storyDescription: "Ác Quỷ Hắc Ám rút điểm của đội đang quay chia đều +5đ cho các đối thủ!",
        baseQuestionPoints: basePoints,
      });
      const scoreDeltas: Array<{ teamId: string; delta: number }> = [
        ...(darkOutcome.penalty > 0 ? [{ teamId: team.id, delta: -darkOutcome.penalty }] : []),
        ...(darkOutcome.darkBombRecipients || []).map((r) => ({ teamId: r.teamId, delta: r.points })),
      ];
      return {
        drawnCard: {
          key: cardKey,
          nameVi: seg.nameVi,
          nameEn: seg.nameEn,
          icon: seg.icon,
          roman: seg.roman,
          group: "MUTATION",
          scoreDelta: -darkOutcome.penalty,
          darkBombRecipients: darkOutcome.darkBombRecipients,
        },
        finalScoreDelta: -darkOutcome.penalty,
        scorePenalty: darkOutcome.penalty,
        isBomb: true,
        darkBombRecipients: darkOutcome.darkBombRecipients,
        scoreDeltas,
        rewardText: `😈 ${seg.nameVi} (Bom Hắc Ám): ${darkOutcome.penaltyText}`,
      };
    }

    case "BOMB_TRAP": {
      // XVI — The Tower: Bẫy Sập trừ 1x Điểm gốc của đội đang quay
      const penalty = Math.min(currentScore, basePoints);
      return {
        drawnCard: {
          key: cardKey,
          nameVi: seg.nameVi,
          nameEn: seg.nameEn,
          icon: seg.icon,
          roman: seg.roman,
          group: "MUTATION",
          scoreDelta: -penalty,
        },
        finalScoreDelta: -penalty,
        scorePenalty: penalty,
        isBomb: true,
        scoreDeltas: penalty > 0 ? [{ teamId: team.id, delta: -penalty }] : [],
        rewardText:
          penalty > 0
            ? `⚡ ${seg.nameVi} (Bẫy Sập): Tòa tháp sụp đổ! Đội bạn bị phạt trừ -${penalty}đ (1x điểm gốc câu hỏi)!`
            : `⚡ ${seg.nameVi} (Bẫy Sập): Tòa tháp sụp đổ! Đội bạn đang có 0đ nên không bị trừ thêm (±0đ).`,
      };
    }

    case "BOMB_CHARITY": {
      // XII — The Hanged Man: Bom Từ Thiện (trừ min(50% điểm đội, 1.5x điểm gốc) tặng cho Top 1 đối thủ)
      const charityOutcome = resolveBombOutcome({
        bombType: "BOMB_CHARITY",
        team,
        allTeams,
        storyDescription: "Người Treo Ngược hy sinh điểm số chuyển tặng cho đối thủ dẫn đầu!",
        baseQuestionPoints: basePoints,
      });
      const gifted = charityOutcome.giftedPoints || 0;
      const scoreDeltas: Array<{ teamId: string; delta: number }> = [
        ...(charityOutcome.penalty > 0 ? [{ teamId: team.id, delta: -charityOutcome.penalty }] : []),
        ...(charityOutcome.recipientTeamId && gifted > 0
          ? [{ teamId: charityOutcome.recipientTeamId, delta: gifted }]
          : []),
      ];
      return {
        drawnCard: {
          key: cardKey,
          nameVi: seg.nameVi,
          nameEn: seg.nameEn,
          icon: seg.icon,
          roman: seg.roman,
          group: "CRITICAL",
          deathSubtype: "GIFT_TOP1",
          scoreDelta: -charityOutcome.penalty,
          giftedPoints: gifted,
          recipientTeamId: charityOutcome.recipientTeamId,
          recipientTeamName: charityOutcome.recipientTeamName,
          victimTeamId: charityOutcome.recipientTeamId,
          victimTeamName: charityOutcome.recipientTeamName,
        },
        finalScoreDelta: -charityOutcome.penalty,
        scorePenalty: charityOutcome.penalty,
        isBomb: charityOutcome.penalty > 0,
        victimTeamId: charityOutcome.recipientTeamId,
        victimTeamName: charityOutcome.recipientTeamName,
        giftedPoints: gifted,
        scoreDeltas,
        rewardText: `🙃 ${seg.nameVi} (Bom Từ Thiện): ${charityOutcome.penaltyText}`,
      };
    }

    case "GAMBLE": {
      return {
        drawnCard: {
          key: cardKey,
          nameVi: seg.nameVi,
          nameEn: seg.nameEn,
          icon: seg.icon,
          roman: seg.roman,
          group: "MUTATION",
          scoreDelta: basePoints,
        },
        finalScoreDelta: basePoints,
        scorePenalty: 0,
        isBomb: false,
        scoreDeltas: [{ teamId: team.id, delta: basePoints }],
        rewardText: `⭐ ${seg.nameVi} (${seg.nameEn}): Cánh cổng Định Mệnh mở ra! Bạn có thể Dừng Lại nhận an toàn +${basePoints}đ hoặc Đánh Cược Quay Tiếp!`,
        isGambleTrigger: true,
      };
    }
  }
}

/**
 * Xử lý toàn bộ logic quay Vòng Quay Tarot Định Mệnh:
 * - Tính góc dừng vật lý theo lực nạp (22 Major Arcana nan quạt)
 * - Xác định Thực Thể Cổ Xưa trúng thưởng
 * - Xử lý Reveal Pending & Gamble mode
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
  startAngle: number;
  targetAngle: number;
  spinDurationMs: number;
  landedSegment: TarotWheelSegment;
  landedIndex: number;
  isGambleTrigger?: boolean;
} {
  const currentAngle = state.tarotState?.targetAngle || 0;
  const isSurvivalMode = !!state.isPenaltySurvivalMode;
  const hasSunMagnet = !isSurvivalMode && getPerkType(state.promoPerk) === "SUN_MAGNET_PROMO";
  const riskTier = evaluateTeamRiskTier({
    team,
    allTeams,
    currentRound: state.currentRound || 1,
  });
  const shieldTransformedCardKey = state.tarotState?.shieldTransformedCardKey;
  const { targetAngle, spinDurationMs, landedSegment, landedIndex } = calculateTarotWheelSpin({
    powerPercent,
    currentAngle,
    hasSunMagnet,
    isSurvivalMode,
    options: {
      riskTier,
      currentRound: state.currentRound || 1,
      teamScore: team.score || 0,
      shieldTransformedCardKey,
    },
  });

  const basePoints = normalizeToThreeLevels(state.baseQuestionPoints || 10);
  const currentScore = team.score || 0;

  const effectResult = resolveWheelCardEffect({
    cardKey: landedSegment.key,
    basePoints,
    team,
    allTeams,
    currentRound: state.currentRound || 1,
    riskTier,
    isSurvivalMode,
    timesStolenInCycle: state.timesStolenInCycle,
    shieldTransformedCardKey,
    currentHearts: state.teamHearts?.[team.id] ?? state.initialHeartsPerTeam ?? 1,
    maxHearts: state.initialHeartsPerTeam ?? 3,
  });

  const { drawnCard, finalScoreDelta, scorePenalty, isBomb, scoreDeltas, rewardText, isGambleTrigger } = effectResult;

  // Handle Shield absorption if negative card
  const isNegative = isBomb || scorePenalty > 0 || drawnCard.scoreDelta < 0;

  if (state.hasShield && isNegative && !isSurvivalMode) {
    state.hasShield = false;
    state.potPoints = 0;
    // Giữ phase = "PUSH_YOUR_LUCK" trong khi chờ người chơi bấm Lật Bài Định Mệnh (isRevealPending: true)
    state.phase = "PUSH_YOUR_LUCK";
    state.turnFinishedReason = undefined;
    state.tarotState = {
      ...(state.tarotState || {}),
      isWheelSpinning: false,
      wheelPower: Math.max(1, Math.min(100, Math.round(powerPercent))),
      startAngle: currentAngle,
      targetAngle,
      spinDurationMs,
      selectedSegmentIndex: landedIndex,
      drawnCard,
      isDrawn: true,
      isRevealPending: true,
      isGambling: false,
      isShieldRespin: true,
      shieldTransformedCardKey: drawnCard.key, // LƯỢT 2: Toàn bộ ô chung loại/chức năng biến thành ô cộng điểm!
    };
    const oldScore = currentScore;
    state.storyResult = {
      teamId: team.id,
      teamName: team.name,
      teamColor: team.color || "#ef4444",
      rewardText: `🛡️ KHIÊN THẦN ĐÃ HẤP THỤ ĐỊNH MỆNH XẤU (${drawnCard.nameVi})! Ô trừ đã bị vô hiệu hóa (0đ). Đội bạn được thưởng thêm 1 lượt quay mới và toàn bộ ô loại này trên vòng quay được chuyển hóa thành ô cộng điểm!`,
      scoreDelta: 0,
      oldScore,
      newScore: oldScore,
    };
    return {
      updatedState: { ...state },
      finalScoreDelta: 0,
      isBomb: false,
      scorePenalty: 0,
      drawnCard,
      scoreDeltas: [],
      startAngle: currentAngle,
      targetAngle,
      spinDurationMs,
      landedSegment,
      landedIndex,
      isGambleTrigger: false,
    };
  }

  // Ghi nhận số lần bị cướp trong chu kỳ của nạn nhân (nếu là lá Cướp điểm)
  if (!isNegative && effectResult.victimTeamId && effectResult.stolenPoints && effectResult.stolenPoints > 0) {
    if (!state.timesStolenInCycle) state.timesStolenInCycle = {};
    state.timesStolenInCycle[effectResult.victimTeamId] = (state.timesStolenInCycle[effectResult.victimTeamId] || 0) + 1;
  }

  // EXTRA_POT_PROMO: Chỉ thưởng +5 điểm khi trúng ô cộng / thắng minigame, ô trừ thì không
  let effectiveFinalDelta = finalScoreDelta;
  let effectiveRewardText = rewardText;
  let effectiveScoreDeltas = [...scoreDeltas];

  if (!isNegative && finalScoreDelta > 0 && !isSurvivalMode && getPerkType(state.promoPerk) === "EXTRA_POT_PROMO") {
    effectiveFinalDelta += 5;
    effectiveRewardText += ` (🎁 Quỹ thưởng Promo +5đ!)`;
    const teamDeltaIdx = effectiveScoreDeltas.findIndex((d) => d.teamId === team.id);
    if (teamDeltaIdx >= 0) {
      effectiveScoreDeltas[teamDeltaIdx] = {
        ...effectiveScoreDeltas[teamDeltaIdx],
        delta: effectiveScoreDeltas[teamDeltaIdx].delta + 5,
      };
    } else {
      effectiveScoreDeltas.push({ teamId: team.id, delta: 5 });
    }
  }

  if (drawnCard.key === "THE_EMPEROR" && !isSurvivalMode) {
    state.hasShield = true;
    const teamsCount = Math.max(1, allTeams?.length || 2);
    const curTurn = state.currentTurnIndex || 0;
    state.teamShields = {
      ...(state.teamShields || {}),
      [team.id]: {
        activeFromTurnIndex: curTurn + 1,
        expiresAfterTurnIndex: curTurn + teamsCount,
        sourceCard: "THE_EMPEROR",
      },
    };
  }
  if (drawnCard.key === "STRENGTH" && !isSurvivalMode) {
    const heartsRecord = { ...(state.teamHearts || {}) };
    const maxHearts = state.initialHeartsPerTeam ?? 3;
    const curHearts = heartsRecord[team.id] ?? state.initialHeartsPerTeam ?? 1;
    if (curHearts < maxHearts) {
      heartsRecord[team.id] = curHearts + 1;
      state.teamHearts = heartsRecord;
    }
  }

  state.potPoints = 0;
  // Giữ phase = "PUSH_YOUR_LUCK" cho tới khi người chơi bấm Lật Bài Định Mệnh
  state.phase = "PUSH_YOUR_LUCK";
  if (!isGambleTrigger) {
    state.turnFinishedReason = isSurvivalMode ? (drawnCard.key === "THE_PEACE" ? "SURVIVAL_ESCAPE" : "SURVIVAL_FAILED") : "TAROT_WHEEL_SPUN";
  }

  state.tarotState = {
    ...(state.tarotState || {}),
    isWheelSpinning: false,
    wheelPower: Math.max(1, Math.min(100, Math.round(powerPercent))),
    startAngle: currentAngle,
    targetAngle,
    spinDurationMs,
    selectedSegmentIndex: landedIndex,
    drawnCard,
    isDrawn: true,
    isRevealPending: true,
    isGambling: Boolean(isGambleTrigger),
    gamblingSpinCount: 0,
    isShieldRespin: false,
    shieldTransformedCardKey: state.tarotState?.shieldTransformedCardKey,
  };

  if (isGambleTrigger) {
    state.tarotGambleState = {
      isGambling: true,
      triggerCardKey: drawnCard.key,
      spinCount: 0,
    };
  }

  const oldScore = currentScore;
  const newScore = Math.max(0, oldScore + effectiveFinalDelta);
  state.storyResult = {
    teamId: team.id,
    teamName: team.name,
    teamColor: team.color || "#ef4444",
    rewardText: effectiveRewardText,
    scoreDelta: effectiveFinalDelta,
    oldScore,
    newScore,
  };

  return {
    updatedState: { ...state },
    finalScoreDelta: effectiveFinalDelta,
    isBomb,
    scorePenalty,
    victimTeamId: effectResult.victimTeamId,
    victimTeamName: effectResult.victimTeamName,
    stolenPoints: effectResult.stolenPoints,
    giftedPoints: effectResult.giftedPoints,
    darkBombRecipients: effectResult.darkBombRecipients,
    drawnCard,
    scoreDeltas: effectiveScoreDeltas,
    startAngle: currentAngle,
    targetAngle,
    spinDurationMs,
    landedSegment,
    landedIndex,
    isGambleTrigger: Boolean(isGambleTrigger),
  };
}

/**
 * Xử lý quyết định Đánh Cược Tarot Gamble (THE_STAR / THE_MOON):
 * - Quay Thêm (spinAgain = true): Quay tiếp vòng quay với cùng bộ 22 lá.
 *   + Kết quả tốt -> nhận kết quả
 *   + Kết quả hòa (FOOL / JUSTICE) -> ±0
 *   + Trúng tiếp Gamble -> tiếp tục chuỗi gamble
 * - Dừng Lại An Toàn (spinAgain = false): Kết thúc an toàn với +1x điểm gốc câu hỏi (+basePoints).
 */
export function handleAncientTarotGambleDecision({
  state,
  team,
  allTeams = [],
  spinAgain,
  powerPercent = 50,
}: {
  state: MysteryQuestState;
  team: MysteryTeamRef;
  allTeams?: MysteryTeamRef[];
  spinAgain: boolean;
  powerPercent?: number;
}): {
  updatedState: MysteryQuestState;
  scoreDeltas: Array<{ teamId: string; delta: number }>;
  finalScoreDelta: number;
  startAngle?: number;
  targetAngle?: number;
  spinDurationMs?: number;
  landedSegment?: TarotWheelSegment;
  landedIndex?: number;
  drawnCard?: AncientTarotDrawnCard;
  isGambleAgain?: boolean;
} {
  const basePoints = normalizeToThreeLevels(state.baseQuestionPoints || 10);
  const currentScore = team.score || 0;

  if (!spinAgain) {
    const oldScore = currentScore;
    const newScore = oldScore + basePoints;
    state.phase = "TURN_SUMMARY";
    state.turnFinishedReason = "TAROT_WHEEL_SPUN";
    state.tarotGambleState = undefined;
    state.tarotState = {
      ...(state.tarotState || {}),
      drawnCard: state.tarotState?.drawnCard
        ? {
            ...state.tarotState.drawnCard,
            scoreDelta: basePoints,
          }
        : undefined,
      isGambling: false,
      isRevealPending: false,
    };
    state.storyResult = {
      teamId: team.id,
      teamName: team.name,
      teamColor: team.color || "#ef4444",
      rewardText: `🛑 Dừng lại an toàn! Quyết định nhận thưởng an toàn thành công (+${basePoints}đ - 1x điểm gốc câu hỏi).`,
      scoreDelta: basePoints,
      oldScore,
      newScore,
    };
    return {
      updatedState: { ...state },
      scoreDeltas: [{ teamId: team.id, delta: basePoints }],
      finalScoreDelta: basePoints,
      isGambleAgain: false,
    };
  }

  const currentAngle = state.tarotState?.targetAngle || 0;
  const riskTier = evaluateTeamRiskTier({
    team,
    allTeams,
    currentRound: state.currentRound || 1,
  });
  const hasSunMagnet = getPerkType(state.promoPerk) === "SUN_MAGNET_PROMO";

  const { targetAngle, spinDurationMs, landedSegment, landedIndex } = calculateTarotWheelSpin({
    powerPercent,
    currentAngle,
    hasSunMagnet,
    isSurvivalMode: false,
    options: { riskTier, currentRound: state.currentRound || 1, teamScore: currentScore },
  });

  const nextSpinCount = (state.tarotState?.gamblingSpinCount || 0) + 1;

  const effectResult = resolveWheelCardEffect({
    cardKey: landedSegment.key,
    basePoints,
    team,
    allTeams,
    currentRound: state.currentRound || 1,
    riskTier,
    isGambleSpin: true,
    isSurvivalMode: false,
    timesStolenInCycle: state.timesStolenInCycle,
    currentHearts: state.teamHearts?.[team.id] ?? state.initialHeartsPerTeam ?? 1,
    maxHearts: state.initialHeartsPerTeam ?? 3,
  });

  const { drawnCard, finalScoreDelta, isBomb, scorePenalty, scoreDeltas, rewardText, isGambleTrigger } = effectResult;
  const isGambleAgain = Boolean(isGambleTrigger);
  const isNegative = isBomb || scorePenalty > 0 || drawnCard.scoreDelta < 0;

  // Ghi nhận số lần bị cướp trong chu kỳ của nạn nhân (nếu là lá Cướp điểm)
  if (!isNegative && effectResult.victimTeamId && effectResult.stolenPoints && effectResult.stolenPoints > 0) {
    if (!state.timesStolenInCycle) state.timesStolenInCycle = {};
    state.timesStolenInCycle[effectResult.victimTeamId] = (state.timesStolenInCycle[effectResult.victimTeamId] || 0) + 1;
  }

  // Giữ phase = "PUSH_YOUR_LUCK" cho tới khi người chơi bấm Lật Bài Định Mệnh
  state.phase = "PUSH_YOUR_LUCK";
  if (!isGambleAgain) {
    state.turnFinishedReason = "TAROT_WHEEL_SPUN";
    state.tarotGambleState = undefined;
  } else {
    state.tarotGambleState = {
      isGambling: true,
      triggerCardKey: drawnCard.key,
      spinCount: nextSpinCount,
    };
  }

  state.tarotState = {
    ...(state.tarotState || {}),
    isWheelSpinning: false,
    wheelPower: Math.round(powerPercent),
    startAngle: currentAngle,
    targetAngle,
    spinDurationMs,
    selectedSegmentIndex: landedIndex,
    drawnCard,
    isDrawn: true,
    isRevealPending: true,
    isGambling: isGambleAgain,
    gamblingSpinCount: nextSpinCount,
  };

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

  return {
    updatedState: { ...state },
    scoreDeltas,
    finalScoreDelta,
    startAngle: currentAngle,
    targetAngle,
    spinDurationMs,
    landedSegment,
    landedIndex,
    drawnCard,
    isGambleAgain,
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
        pointBadge = "X2 GỐC";
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

