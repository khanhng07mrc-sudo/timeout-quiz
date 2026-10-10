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
 * ĐỒNG BỘ MA TRẬN BOM CHO TẤT CẢ CÁC CHẾ ĐỘ CHƠI
 * 1. PUSH_YOUR_LUCK: Bom Khói (50%) | Bom Hắc Ám (35%) | Bom Từ Thiện (15%)
 * 2. MEMORY_PAIRS: Bom Khói (80%) | Bom Hắc Ám (15%) | Bom Từ Thiện (5%)
 * 3. ONE_SHOT_DOORS: Bom Khói (70%) | Bom Hắc Ám (25%) | Bom Từ Thiện (5%)
 * 4. TAROT_DESTINY: Bom Khói (60%) | Bom Hắc Ám (30%) | Bom Từ Thiện (10%)
 */
export function rollBombTypeForMinigame(
  mode: MysteryMiniGameType,
  teamScore: number = 0
): "BOMB_SMOKE" | "BOMB_DARK" | "BOMB_CHARITY" {
  if (teamScore <= 0) return "BOMB_SMOKE";
  const r = Math.random();
  if (mode === "PUSH_YOUR_LUCK") {
    if (r < 0.50) return "BOMB_SMOKE";
    if (r < 0.85) return "BOMB_DARK";
    return "BOMB_CHARITY";
  }
  if (mode === "MEMORY_PAIRS") {
    if (r < 0.80) return "BOMB_SMOKE";
    if (r < 0.95) return "BOMB_DARK";
    return "BOMB_CHARITY";
  }
  if (mode === "ONE_SHOT_DOORS") {
    if (r < 0.70) return "BOMB_SMOKE";
    if (r < 0.95) return "BOMB_DARK";
    return "BOMB_CHARITY";
  }
  if (mode === "TAROT_DESTINY") {
    if (r < 0.50) return "BOMB_SMOKE";
    if (r < 0.85) return "BOMB_DARK";
    return "BOMB_CHARITY";
  }
  return "BOMB_SMOKE";
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
}: {
  bombType: "BOMB_SMOKE" | "BOMB_DARK" | "BOMB_CHARITY";
  team: MysteryTeamRef;
  allTeams?: MysteryTeamRef[];
  storyDescription?: string;
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
    let penalty = 0;
    let penaltyText = "";
    const darkBombRecipients: Array<{ teamId: string; teamName: string; points: number }> = [];

    if (otherTeams.length === 0) {
      penalty = currentScore < 5 ? currentScore : 5;
      penaltyText = `Bị trừ ${penalty} điểm từ tổng điểm.`;
    } else if (currentScore < 5 * X) {
      const sortedOthers = [...otherTeams].sort((a, b) => {
        const diff = (a.score || 0) - (b.score || 0);
        if (diff !== 0) return diff;
        return Math.random() - 0.5;
      });
      const numTeamsToReceive = Math.floor(currentScore / 5);
      for (let i = 0; i < Math.min(numTeamsToReceive, sortedOthers.length); i++) {
        darkBombRecipients.push({
          teamId: sortedOthers[i].id,
          teamName: sortedOthers[i].name,
          points: 5,
        });
      }
      penalty = darkBombRecipients.reduce((sum, r) => sum + r.points, 0);
      const recNames = darkBombRecipients.map((r) => `${r.teamName} (+5đ)`).join(", ");
      penaltyText = recNames
        ? `Bị trừ toàn bộ ${penalty} điểm! Đã phân phát cho đội thấp điểm: ${recNames}`
        : `Bị trừ toàn bộ ${penalty} điểm!`;
    } else {
      const maxM = Math.floor(currentScore / (5 * otherTeams.length));
      const m = Math.max(1, Math.min(3, Math.floor(Math.random() * maxM) + 1));
      const pointsPerOtherTeam = 5 * m;
      penalty = pointsPerOtherTeam * otherTeams.length;

      for (const other of otherTeams) {
        darkBombRecipients.push({
          teamId: other.id,
          teamName: other.name,
          points: pointsPerOtherTeam,
        });
      }
      const recNames = darkBombRecipients.map((r) => `${r.teamName} (+${pointsPerOtherTeam}đ)`).join(", ");
      penaltyText = `Bị trừ ${penalty} điểm! Chia đều cho các đội còn lại: ${recNames}`;
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

  // BOMB_CHARITY: Mất 50% số điểm (làm tròn bội số của 5), tặng cho đội có điểm cao nhất
  const rawHalf = currentScore * 0.5;
  const giftedPoints = currentScore > 0 ? Math.min(currentScore, roundToMultipleOfFive(rawHalf)) : 0;
  let recipientTeamId: string | undefined = undefined;
  let recipientTeamName: string | undefined = undefined;

  if (otherTeams.length > 0) {
    const maxScore = Math.max(...otherTeams.map((t) => t.score || 0));
    const topTeams = otherTeams.filter((t) => (t.score || 0) === maxScore);
    const chosen = topTeams[Math.floor(Math.random() * topTeams.length)];
    recipientTeamId = chosen.id;
    recipientTeamName = chosen.name;
  }

  const penaltyText = recipientTeamName
    ? `Bị trừ 50% điểm (-${giftedPoints}đ) và chuyển tặng toàn bộ cho Đội ${recipientTeamName}!`
    : `Bị trừ 50% điểm (-${giftedPoints}đ)!`;

  return {
    penalty: giftedPoints,
    penaltyText,
    giftedPoints,
    recipientTeamId,
    recipientTeamName,
    bombExploded: {
      type: "CHARITY",
      title: "Bom Từ Thiện 🎁",
      description: storyDescription || "Lòng tốt bất đắc dĩ! Bị trừ 50% số điểm của đội và chuyển tặng toàn bộ cho đội đang dẫn đầu!",
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
    pool = ["SHIELD_PROMO", "EXTRA_POT_PROMO", "PEEK_PROMO", "EXTRA_ATTEMPT_PROMO"];
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
 */
export function calculatePromoSteal5({
  activeTeamId,
  allTeams,
}: {
  activeTeamId: string;
  allTeams: MysteryTeamRef[];
}): {
  victimTeamId?: string;
  victimTeamName?: string;
  stolenPoints: number;
} {
  const opponents = (allTeams || []).filter(
    (t) => t.id !== activeTeamId && !t.isEliminated && (t.score || 0) > 0
  );
  if (opponents.length === 0) {
    return { stolenPoints: 0 };
  }

  const maxScore = Math.max(...opponents.map((t) => t.score || 0));
  const topOpponents = opponents.filter((t) => (t.score || 0) === maxScore);
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

interface RewardTemplate {
  storyTitle: string;
  storyDescription: string;
  deltaPoints: number;
  effectType: "BONUS_POINTS" | "MULTIPLY_X2" | "STEAL_POINTS";
}

const REWARD_TEMPLATES: Record<MysteryTheme, RewardTemplate[]> = {
  CASTLE: [
    { storyTitle: "💎 Đại Hồng Ân Pháp Sư", storyDescription: "Pháp Sư truyền dạy bí kíp: Thưởng nóng +30 điểm quỹ!", deltaPoints: 30, effectType: "BONUS_POINTS" },
    { storyTitle: "⭐ Phép Nhân Đôi Tinh Tú", storyDescription: "Ánh sáng tinh tú soi rọi: Nhân đôi (x2) toàn bộ điểm trong quỹ!", deltaPoints: 0, effectType: "MULTIPLY_X2" },
    { storyTitle: "🎭 Bàn Tay Đạo Tặc", storyDescription: "Áo tàng hình xuất kích: Cướp thêm 20đ vào quỹ thưởng!", deltaPoints: 20, effectType: "STEAL_POINTS" },
    { storyTitle: "🛡️ Tấm Khiên Hộ Vệ Hoàng Gia", storyDescription: "Nhặt được khiên cổ hoàng gia: Thưởng an toàn +20 điểm quỹ!", deltaPoints: 20, effectType: "BONUS_POINTS" },
    { storyTitle: "🃏 Cuộn Giấy Bí Truyền", storyDescription: "Giải mã cuộn giấy thông thái: Thưởng nóng +25 điểm quỹ!", deltaPoints: 25, effectType: "BONUS_POINTS" },
    { storyTitle: "💰 Kho Vàng Cung Đình", storyDescription: "Mở đúng căn hầm hoàng gia: +25 điểm quỹ!", deltaPoints: 25, effectType: "BONUS_POINTS" },
    { storyTitle: "✨ Viên Pha Lê Ma Thuật", storyDescription: "Năng lượng dồi dào: +20 điểm quỹ!", deltaPoints: 20, effectType: "BONUS_POINTS" },
    { storyTitle: "👑 Vương Miện Cổ", storyDescription: "Tìm thấy vương miện bảo vật: +35 điểm quỹ!", deltaPoints: 35, effectType: "BONUS_POINTS" },
  ],
  PIRATE: [
    { storyTitle: "👑 Kho Báu Của Râu Đen", storyDescription: "Hòm kim cương khổng lồ: Thưởng lớn +40 điểm quỹ!", deltaPoints: 40, effectType: "BONUS_POINTS" },
    { storyTitle: "⚓ Gió Thuận Buồm Xuôi", storyDescription: "Vận may đại dương: Nhân đôi (x2) điểm trong quỹ!", deltaPoints: 0, effectType: "MULTIPLY_X2" },
    { storyTitle: "🗡️ Đột Kích Hạm Đội", storyDescription: "Cướp bóc khoang thuyền: Cướp 25đ vào quỹ thưởng!", deltaPoints: 25, effectType: "STEAL_POINTS" },
    { storyTitle: "🦜 Chú Vẹt Thông Thái", storyDescription: "Chú vẹt chỉ đường tắt vào kho báu: Thưởng lớn +25 điểm quỹ!", deltaPoints: 25, effectType: "BONUS_POINTS" },
    { storyTitle: "🍻 Tiệc Rượu Thủy Thủ", storyDescription: "Liên hoan tưng bừng: +20 điểm quỹ!", deltaPoints: 20, effectType: "BONUS_POINTS" },
    { storyTitle: "🧭 La Bàn Định Mệnh", storyDescription: "Tìm thấy hướng gió lành: +25 điểm quỹ!", deltaPoints: 25, effectType: "BONUS_POINTS" },
    { storyTitle: "🪙 Túi Tiền Vàng Cổ", storyDescription: "Nhặt được túi vàng nguyên vẹn: +30 điểm quỹ!", deltaPoints: 30, effectType: "BONUS_POINTS" },
    { storyTitle: "🛡️ Mộc Gỗ Hải Quân", storyDescription: "Nhặt được mộc gỗ quý báu: Thưởng an toàn +20 điểm quỹ!", deltaPoints: 20, effectType: "BONUS_POINTS" },
  ],
  FOREST: [
    { storyTitle: "🌟 Đại Bảo Vật Rừng Xanh", storyDescription: "Nữ Hoàng Tiên ban tặng: Thưởng ngay +35 điểm quỹ!", deltaPoints: 35, effectType: "BONUS_POINTS" },
    { storyTitle: "🌸 Trái Cây Thần Ngàn Năm", storyDescription: "Sinh lực tràn trề: Nhân đôi (x2) điểm trong quỹ!", deltaPoints: 0, effectType: "MULTIPLY_X2" },
    { storyTitle: "🦊 Cáo Tinh Ranh", storyDescription: "Lẻn trộm túi tiền: Cướp 20đ vào quỹ thưởng!", deltaPoints: 20, effectType: "STEAL_POINTS" },
    { storyTitle: "🌿 Bùa Hộ Mệnh Của Tộc Elf", storyDescription: "Bùa chú rừng xanh hộ thể: Thưởng an toàn +20 điểm quỹ!", deltaPoints: 20, effectType: "BONUS_POINTS" },
    { storyTitle: "🏹 Cung Tên Sấm Sét", storyDescription: "Bắn trúng hồng tâm kho báu: Thưởng lớn +30 điểm quỹ!", deltaPoints: 30, effectType: "BONUS_POINTS" },
    { storyTitle: "🍯 Mật Ong Rừng Khổng Lồ", storyDescription: "Ngọt ngào năng lượng: +25 điểm quỹ!", deltaPoints: 25, effectType: "BONUS_POINTS" },
    { storyTitle: "🦋 Tinh Linh Ánh Sáng", storyDescription: "Ánh sáng dẫn lối: +20 điểm quỹ!", deltaPoints: 20, effectType: "BONUS_POINTS" },
    { storyTitle: "💎 Ngọc Lục Bảo Rừng Già", storyDescription: "Viên ngọc ngàn năm: +30 điểm quỹ!", deltaPoints: 30, effectType: "BONUS_POINTS" },
  ],
  CYBER: [
    { storyTitle: "⚡ Lõi Năng Lượng Lượng Tử", storyDescription: "Bùng nổ siêu năng lượng: Thưởng lớn +40 điểm quỹ!", deltaPoints: 40, effectType: "BONUS_POINTS" },
    { storyTitle: "🚀 Động Cơ Siêu Quang Tốc", storyDescription: "Gia tốc cực đại: Nhân đôi (x2) điểm trong quỹ!", deltaPoints: 0, effectType: "MULTIPLY_X2" },
    { storyTitle: "🛰️ Đòn Tấn Công Cyber Siphon", storyDescription: "Chuyển luồng dữ liệu: Cướp 25đ vào quỹ thưởng!", deltaPoints: 25, effectType: "STEAL_POINTS" },
    { storyTitle: "🛡️ Lá Chắn Plasma", storyDescription: "Trường lực bảo vệ công nghệ: Thưởng an toàn +20 điểm quỹ!", deltaPoints: 20, effectType: "BONUS_POINTS" },
    { storyTitle: "💾 Ổ Đĩa Dữ Liệu Tối Mật", storyDescription: "Giải mã dữ liệu tối mật: Thưởng nóng +30 điểm quỹ!", deltaPoints: 30, effectType: "BONUS_POINTS" },
    { storyTitle: "📡 Tín Hiệu Vệ Tinh", storyDescription: "Bắt trọn luồng sóng quý: +25 điểm quỹ!", deltaPoints: 25, effectType: "BONUS_POINTS" },
    { storyTitle: "🔋 Pin Nhiên Liệu Vĩnh Cửu", storyDescription: "Sạc đầy pin tàu: +20 điểm quỹ!", deltaPoints: 20, effectType: "BONUS_POINTS" },
    { storyTitle: "🤖 Siêu Chip AI Thế Hệ Mới", storyDescription: "Thuật toán xử lý thần tốc: +30 điểm quỹ!", deltaPoints: 30, effectType: "BONUS_POINTS" },
  ],
  TEMPLE: [
    { storyTitle: "👑 Vương Miện Pharaon", storyDescription: "Khai mở kho báu lăng mộ: Thưởng lớn +40 điểm quỹ!", deltaPoints: 40, effectType: "BONUS_POINTS" },
    { storyTitle: "☀️ Ánh Sáng Thần Mặt Trời", storyDescription: "Thần Mặt Trời ban phước: Nhân đôi (x2) điểm trong quỹ!", deltaPoints: 0, effectType: "MULTIPLY_X2" },
    { storyTitle: "🐍 Rắn Độc Cướp Cổ Vật", storyDescription: "Bẫy ngầm kích hoạt: Cướp 20đ vào quỹ thưởng!", deltaPoints: 20, effectType: "STEAL_POINTS" },
    { storyTitle: "🏺 Bình Cổ Hoàng Kim", storyDescription: "Cổ vật nguyên vẹn: +25 điểm quỹ!", deltaPoints: 25, effectType: "BONUS_POINTS" },
    { storyTitle: "📜 Bản Đồ Lối Thoát", storyDescription: "Sơ đồ mật đạo kim tự tháp: Thưởng lớn +30 điểm quỹ!", deltaPoints: 30, effectType: "BONUS_POINTS" },
    { storyTitle: "💎 Viên Hồng Ngọc Huyền Thoại", storyDescription: "Viên đá mắt thần: +30 điểm quỹ!", deltaPoints: 30, effectType: "BONUS_POINTS" },
    { storyTitle: "🛡️ Tấm Khiên Đồng Cổ", storyDescription: "Khiên chiến binh Ai Cập: Thưởng an toàn +20 điểm quỹ!", deltaPoints: 20, effectType: "BONUS_POINTS" },
    { storyTitle: "🗝️ Chìa Khóa Lăng Mộ", storyDescription: "Chìa khóa mở cửa thông đạo: +20 điểm quỹ!", deltaPoints: 20, effectType: "BONUS_POINTS" },
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
}

/**
 * Calculates controlled steal points with limits:
 * - Steals from top competitor (leader #1)
 * - Capped at maxCap (25-30đ)
 * - Safety capped at max 50% of victim's points so they never go negative
 */
export function calculateCappedSteal({
  activeTeamId,
  allTeams,
  targetPoints = 25,
  maxCap = 25,
}: {
  activeTeamId: string;
  allTeams: MysteryTeamRef[];
  targetPoints?: number;
  maxCap?: number;
}): StealResult {
  const otherTeams = (allTeams || []).filter((t) => t.id !== activeTeamId && !t.isEliminated);
  if (otherTeams.length === 0) {
    return { stolenPoints: Math.min(targetPoints, maxCap) };
  }
  const sorted = [...otherTeams].sort((a, b) => (b.score || 0) - (a.score || 0));
  const victim = sorted[0];
  const victimScore = victim.score || 0;

  if (victimScore <= 0) {
    return {
      victimTeamId: victim.id,
      victimTeamName: victim.name,
      stolenPoints: 0,
    };
  }

  // Cap: maximum 50% of victim's points and maximum maxCap (e.g. 25đ)
  const halfScore = Math.floor(victimScore * 0.5);
  const allowed = Math.min(targetPoints, maxCap, halfScore);
  const finalSteal = Math.max(1, allowed);

  return {
    victimTeamId: victim.id,
    victimTeamName: victim.name,
    stolenPoints: finalSteal,
  };
}

/**
 * Helper to shuffle memory pairs tiles face down and re-index.
 */
export function shuffleMemoryPairsTiles(tiles: MysteryTile[]): MysteryTile[] {
  const shuffled = [...tiles].map((t) => ({ ...t, isOpened: false })).sort(() => Math.random() - 0.5);
  return shuffled.map((item, idx) => ({
    ...item,
    id: idx + 1,
    label: `Thẻ #${idx + 1}`,
    isOpened: false,
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

  const pBonusTop = basePoints * 2; // Siêu Thưởng Nhân Đôi (+20đ / +40đ / +60đ)
  const pBonusHigh = Math.round(basePoints * 1.5); // Thưởng Lớn Kho Báu (+15đ / +30đ / +45đ)
  const pBonusMed = basePoints; // Thưởng Trung Bình Tinh Tú (+10đ / +20đ / +30đ)
  const pSteal = Math.min(25, Math.max(15, basePoints)); // Cặp Hải Tặc Đoạt Bảo (Cướp tối đa 25đ)
  const pPenalty = basePoints; // Cặp Kíp Nổ Hắc Ám (-10đ / -20đ / -30đ)

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
        storyTitle: "🗡️ CẶP HẢI TẶC ĐOẠT BẢO!",
        storyDescription: `Ghép trúng cặp hải tặc: Cướp +${pSteal}đ từ một đối thủ đủ điều kiện!`,
        effectType: "STEAL_POINTS",
        deltaPoints: pSteal,
      }
    : {
        pairKey: "PAIR_SHIELD",
        icon: "🛡️",
        type: "REWARD",
        storyTitle: "🛡️ CẶP KHIÊN VÀNG HỘ THÂN!",
        storyDescription: `Ghép trúng cặp khiên hoàng gia: Nhận an toàn +${pSteal} điểm thưởng!`,
        effectType: "BONUS_POINTS",
        deltaPoints: pSteal,
      };

  const pairs: PairDef[] = [
    {
      pairKey: "PAIR_MULTIPLY",
      icon: "🚀",
      type: "REWARD",
      storyTitle: "🚀 CẶP ĐỘNG CƠ NHÂN ĐÔI!",
      storyDescription: `Kích hoạt năng lượng đột phá: Nhận nóng +${pBonusTop} điểm thưởng cực khủng!`,
      effectType: "MULTIPLY_X2",
      deltaPoints: pBonusTop,
    },
    stealOrBonusPair,
    {
      pairKey: "PAIR_TREASURE",
      icon: "💎",
      type: "REWARD",
      storyTitle: "💎 CẶP KHO BÁU HOÀNG KIM!",
      storyDescription: `Tìm thấy cặp ngọc quý tương đồng: Nhận ngay +${pBonusHigh} điểm thưởng!`,
      effectType: "BONUS_POINTS",
      deltaPoints: pBonusHigh,
    },
    {
      pairKey: "PAIR_STAR",
      icon: "⭐",
      type: "REWARD",
      storyTitle: "⭐ CẶP TINH TÚ DIỆU KỲ!",
      storyDescription: `Tìm thấy cặp sao may mắn: Nhận an toàn +${pBonusMed} điểm thưởng!`,
      effectType: "BONUS_POINTS",
      deltaPoints: pBonusMed,
    },
    {
      pairKey: "PAIR_TRAP",
      icon: "💨",
      type: "BOMB_SMOKE",
      storyTitle: "💨 CẶP BẪY KHÓI ĐỘC!",
      storyDescription: `Kích hoạt bẫy khói độc: Mất toàn bộ điểm tích lũy của câu hỏi này (0đ)!`,
      effectType: "LOSE_POT_POINTS",
      deltaPoints: 0,
    },
    {
      pairKey: "PAIR_BOMB",
      icon: "💣",
      type: "BOMB_MAJOR",
      storyTitle: "💣 CẶP KÍP NỔ HẮC ÁM!",
      storyDescription: `Ghép trúng cặp kíp nổ liên hoàn: Kích nổ bom hắc ám hủy diệt tổng điểm!`,
      effectType: "LOSE_POINTS",
      deltaPoints: -pPenalty,
    },
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
 * Generates tiles specifically for Variant 2: ONE_SHOT_DOORS (3 doors).
 */
export function generateOneShotDoorsTiles(
  basePoints: number = 20,
  options?: {
    currentRound?: number;
    teams?: MysteryTeamRef[];
    currentTeamId?: string;
  }
): MysteryTile[] {
  interface DoorDef {
    icon: string;
    type: MysteryTileType;
    storyTitle: string;
    storyDescription: string;
    effectType: MysteryTileEffectType;
    deltaPoints: number;
  }

  const pHigh = basePoints * 2; // Cửa Hoàng Gia: 20đ với câu 10đ, 40đ với 20đ, 60đ với 30đ
  const pSteal = Math.min(25, Math.max(15, basePoints)); // Cửa Đoạt Bảo: Cướp tối đa 25đ
  const pPenalty = basePoints; // Cửa Bẫy Bom: -10đ với câu 10đ, -20đ với 20đ, -30đ với 30đ

  const currentRound = options?.currentRound ?? 1;
  const canSteal = currentRound >= 2 && Boolean(
    options?.teams &&
    options?.teams.some((t) => t.id !== options?.currentTeamId && (t.score || 0) >= pSteal)
  );

  const stealOrBonusDoor: DoorDef = canSteal
    ? {
        icon: "🗡️",
        type: "REWARD",
        storyTitle: "🗡️ CỬA ĐOẠT BẢO HẢI TẶC!",
        storyDescription: `Kích hoạt cướp bóc đoạt bảo: Cướp +${pSteal}đ từ một đối thủ đủ điều kiện!`,
        effectType: "STEAL_POINTS",
        deltaPoints: pSteal,
      }
    : {
        icon: "💎",
        type: "REWARD",
        storyTitle: "💎 CỬA KHO BÁU HOÀNG KIM!",
        storyDescription: `Mở ra kho báu hoàng kim: Nhận an toàn +${pSteal} điểm thưởng siêu cấp!`,
        effectType: "BONUS_POINTS",
        deltaPoints: pSteal,
      };

  const doors: DoorDef[] = [
    {
      icon: "👑",
      type: "REWARD",
      storyTitle: "👑 CỬA HOÀNG GIA ĐẠI THƯỞNG!",
      storyDescription: `Mở đúng cánh cửa vinh quang: Nhận ngay +${pHigh} điểm thưởng siêu cấp!`,
      effectType: "BONUS_POINTS",
      deltaPoints: pHigh,
    },
    stealOrBonusDoor,
    {
      icon: "⭐",
      type: "REWARD",
      storyTitle: "⭐ CỬA TINH TÚ MAY MẮN!",
      storyDescription: `Mở trúng cánh cửa may mắn: Nhận an toàn +${basePoints} điểm thưởng!`,
      effectType: "BONUS_POINTS",
      deltaPoints: basePoints,
    },
    {
      icon: "💥",
      type: "BOMB_MAJOR",
      storyTitle: "💥 CỬA BẪY BOM CÔNG PHÁ!",
      storyDescription: `Dính bẫy ngầm sau cánh cửa: Bom phát nổ, bị trừ ${pPenalty} điểm từ tổng điểm!`,
      effectType: "LOSE_POINTS",
      deltaPoints: -pPenalty,
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

  const pSun = basePoints * 2;
  const pEmperor = Math.round(basePoints * 1.5);
  const pFool = basePoints + 10;
  const pKnight = basePoints;
  const pDeath = basePoints;

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
        storyTitle: "🗡️ HIỆP SĨ ĐỘT KÍCH",
        storyDescription: `Thanh gươm công lý cướp phá: Cướp +${pKnight}đ từ một đối thủ đủ điều kiện!`,
        effectType: "STEAL_POINTS",
        deltaPoints: pKnight,
      }
    : {
        tarotName: "Ngôi Sao Hy Vọng (The Star)",
        icon: "⭐",
        type: "REWARD",
        storyTitle: "⭐ NGÔI SAO HY VỌNG",
        storyDescription: `Ánh sao may mắn rạng ngời: Nhận nóng +${pKnight} điểm thưởng vinh quang!`,
        effectType: "BONUS_POINTS",
        deltaPoints: pKnight,
      };

  const tarotCards: TarotDef[] = [
    {
      tarotName: "Mặt Trời (The Sun)",
      icon: "☀️",
      type: "REWARD",
      storyTitle: "☀️ MẶT TRỜI QUANG MINH",
      storyDescription: `Ánh dương thần thánh chiếu rọi: Đại hồng ân ban tặng +${pSun} điểm thưởng!`,
      effectType: "BONUS_POINTS",
      deltaPoints: pSun,
    },
    {
      tarotName: "Hoàng Đế (The Emperor)",
      icon: "👑",
      type: "REWARD",
      storyTitle: "👑 HOÀNG ĐẾ VƯƠNG QUYỀN",
      storyDescription: `Vương miện uy quyền tối thượng: Thưởng nóng +${pEmperor} điểm danh dự!`,
      effectType: "BONUS_POINTS",
      deltaPoints: pEmperor,
    },
    {
      tarotName: "Kẻ Khờ (The Fool)",
      icon: "🃏",
      type: "REWARD",
      storyTitle: "🃏 KẺ KHỜ PHI THƯỜNG",
      storyDescription: `Vận may bất ngờ của kẻ khờ: Đột phá năng lượng (+${pFool}đ)!`,
      effectType: "BONUS_POINTS",
      deltaPoints: pFool,
    },
    {
      tarotName: "Thần Chết (Death)",
      icon: "💀",
      type: "BOMB_MAJOR",
      storyTitle: "💀 THẦN CHẾT ĐOẠT MỆNH",
      storyDescription: `Lưỡi hái định mệnh buông xuống: Bị phạt trừ ${pDeath} điểm từ tổng điểm!`,
      effectType: "LOSE_POINTS",
      deltaPoints: -pDeath,
    },
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
  };
}): MysteryTile {
  // Card 1 is GUARANTEED SAFE reward card to reward player for taking the minigame challenge!
  // From Card 2 onwards, risk-reward bomb chance kicks in:
  let bombChance: number;
  if (drawIndex <= 1) {
    bombChance = 0;
  } else if (basePoints <= 10) {
    // 10đ: Higher risk
    bombChance = 0.35;
  } else if (basePoints <= 20) {
    // 20đ: Balanced
    bombChance = 0.25;
  } else {
    // 30đ: High stakes, lower bomb risk to reward hard questions
    bombChance = 0.20;
  }

  const isBomb = Math.random() < bombChance;
  const id = drawIndex;
  const label = `Lá #${drawIndex}`;

  if (isBomb) {
    // If team has 0 points (or question 1), ANY bomb downgrades to Smoke bomb:
    // They lose only current question's pot, total score never drops below 0 and no phantom gifts!
    if (teamScore <= 0) {
      return {
        id,
        label,
        icon: "💨",
        isOpened: false,
        type: "BOMB_SMOKE",
        storyTitle: "💨 BOM KHÓI NỔ TUNG!",
        storyDescription: "Khói mù bao phủ! Mất toàn bộ điểm tích lũy của câu này. Vì điểm đội hiện tại là 0 nên không bị trừ thêm!",
        effectType: "LOSE_POINTS",
        deltaPoints: 0,
      };
    }

    const bombKindRand = Math.random();
    if (bombKindRand < 0.50) {
      // LOẠI 1 (50%): Bom Khói - Mất sạch điểm của câu này
      return {
        id,
        label,
        icon: "💨",
        isOpened: false,
        type: "BOMB_SMOKE",
        storyTitle: "💨 BOM KHÓI NỔ TUNG!",
        storyDescription: "Khói mù bao phủ! Mất toàn bộ điểm tích lũy ở câu hiện tại (0 điểm nhận được). Tổng điểm giữ nguyên!",
        effectType: "LOSE_POINTS",
        deltaPoints: 0,
      };
    } else if (bombKindRand < 0.85) {
      // LOẠI 2 (35%): Bom Hắc Ám - Mất một số điểm chia đều cho các đội còn lại
      return {
        id,
        label,
        icon: "🌑",
        isOpened: false,
        type: "BOMB_DARK",
        storyTitle: "🌑 BOM HẮC ÁM PHÁT NỔ!",
        storyDescription: "Năng lượng bóng tối bùng phát! Điểm số của bạn bị rút cạn và phân chia đều cho các đội đối thủ!",
        effectType: "LOSE_POINTS",
        deltaPoints: 0,
      };
    } else {
      // LOẠI 3 (15%): Bom Từ Thiện - Mất 50% số điểm, và phải tặng nó cho đội có điểm cao nhất
      return {
        id,
        label,
        icon: "🎁",
        isOpened: false,
        type: "BOMB_CHARITY",
        storyTitle: "🎁 BOM TỪ THIỆN HIẾN TẾ!",
        storyDescription: "Lòng tốt bất đắc dĩ! Bị trừ 50% số điểm của đội và chuyển tặng toàn bộ cho đội đang dẫn đầu!",
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
    } else {
      // 30đ tier: +30đ, +35đ, +45đ, +60đ
      delta = [30, 35, 45, 60][Math.floor(Math.random() * 4)];
    }
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
        storyTitle: "💎 KHO BÁU HOÀNG KIM!",
        storyDescription: `Mở khóa kho báu hoàng kim: Nhận an toàn +${delta} điểm vào quỹ!`,
        deltaPoints: delta,
        effectType: "BONUS_POINTS",
      };
      storyDescription = template.storyDescription;
    }
  }

  if (isDoublePromo && Math.random() < 0.35) {
    effectType = "MULTIPLY_X2";
    delta = 0;
  }

  return {
    id,
    label,
    icon: effectType === "MULTIPLY_X2" ? "🚀" : effectType === "STEAL_POINTS" ? "🎭" : "💎",
    isOpened: false,
    type: "REWARD",
    storyTitle: template.storyTitle,
    storyDescription,
    effectType,
    deltaPoints: delta,
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

  const availableThemes = prevTheme ? THEME_KEYS.filter((t) => t !== prevTheme) : THEME_KEYS;
  const theme = availableThemes[Math.floor(Math.random() * availableThemes.length)];
  const themeMeta = MYSTERY_THEMES[theme];

  const currentRound = Math.floor(turnIndex / Math.max(1, teams.length)) + 1;
  const roundDefaultPoints = currentRound === 1 ? 10 : currentRound === 2 ? 20 : 30;
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
  };

  switch (miniGameType) {
    case "MEMORY_PAIRS":
      tiles = generateMemoryPairsTiles(effectiveBasePoints, roundOptions);
      if (promoPerk === "PEEK_PROMO") {
        // Chỉ 2 lá an toàn khác nhau trên 10 lá (2 lá phải là hai loại cặp khác nhau!)
        const safeTiles = tiles.filter((t) => t.type === "REWARD" && t.pairKey !== "PAIR_BOMB");
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
      tiles = generateOneShotDoorsTiles(effectiveBasePoints, roundOptions);
      // Mắt thần ở 4 cửa KHÔNG soi bom ở đầu game.
      // Thay vào đó, sau khi chọn xong 2 cửa, Mắt thần mới soi/gán nhãn ở Giai đoạn 2!
      oneShotState = {
        chosenTileId: undefined,
        selectedDoorIds: [],
        hasBombDetected: false,
        phase: "SELECTING",
        revealedSafeDoorIds: [],
        chosenFinalDoorId: undefined,
        allRevealed: false,
      };
      break;

    case "TAROT_DESTINY":
      tiles = generateTarotDestinyTiles(effectiveBasePoints, roundOptions);
      let prophecyCardId: number | undefined;
      if (promoPerk === "PEEK_PROMO") {
        // Mắt Thần Tiên Tri: Lật mở xem trước 1 lá bài bí mật ngẫu nhiên trong 5 lá
        const prophecyCard = tiles[Math.floor(Math.random() * tiles.length)];
        prophecyCard.isOpened = true;
        prophecyCardId = prophecyCard.id;
      }
      tarotState = {
        chosenCardId: undefined,
        canRedraw: promoPerk === "EXTRA_ATTEMPT_PROMO",
        hasRedrawn: false,
        prophecyCardId,
        prophecyResolved: false,
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

  // ═══════════════════════════════════════════════════════════════════════════
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
        // Cặp Kíp Nổ Hắc Ám: Kích nổ theo Ma trận bom MEMORY_PAIRS (80% Khói / 15% Hắc Ám / 5% Từ Thiện)
        const bombType = rollBombTypeForMinigame("MEMORY_PAIRS", team.score || 0);
        const outcome = resolveBombOutcome({
          bombType,
          team,
          allTeams,
          storyDescription: `${cancelPrefix}Ghép trúng Cặp Kíp Nổ Hắc Ám!`,
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

      memState.thirdFlippedTileId = tile.id;
      memState.attemptsUsed += 1;
      state.lastFlippedTile = tile;

      const card1 = state.tiles.find((t) => Number(t.id) === Number(memState.firstFlippedTileId));
      const card2 = state.tiles.find((t) => Number(t.id) === Number(memState.secondFlippedTileId));
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
          const stealAmount = winCard.deltaPoints || 25;
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
        // Kích hoạt giải cứu, mở khóa chờ lật tiếp lá thứ 3!
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
        const stealAmount = firstTile.deltaPoints || 25;
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
  // VARIANT 2: ONE_SHOT_DOORS (4 Cánh Cửa Bí Mật - 2 Giai Đoạn)
  // Giai đoạn 1: Chọn 2 trong 4 cửa để để ra riêng (vẫn úp xuống, chưa lật).
  // Giai đoạn 2: Người chơi chỉ có thể chọn giữa 1 trong 2 cánh cửa còn lại đang sáng (bất kể có bom hay không).
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

    // Giai đoạn 1: Chọn 2 trong 4 cửa để ĐỂ RA RIÊNG (vẫn úp mặt, chưa lật)
    if (osState.phase === "SELECTING" || !osState.phase) {
      const selected = osState.selectedDoorIds || [];
      if (selected.includes(tileId)) {
        // Cho phép bỏ chọn nếu mới chọn 1 cửa
        osState.selectedDoorIds = selected.filter((id) => id !== tileId);
        return { updatedState: { ...state }, isBomb: false, scorePenalty: 0 };
      }

      selected.push(tileId);
      osState.selectedDoorIds = [...selected];

      if (selected.length < 2) {
        // Đang chờ chọn cửa thứ 2 để ra riêng
        return { updatedState: { ...state }, isBomb: false, scorePenalty: 0 };
      }

      // Đã chọn đủ 2 cửa để ra riêng!
      // Cả 4 cánh cửa vẫn úp mặt (isOpened: false), chưa lật!
      // Quét xem trong 2 cánh cửa đã để ra riêng này CÓ cánh cửa trừ điểm (Bẫy bom) hay không:
      const selectedTiles = state.tiles.filter((t) => selected.includes(t.id));
      const hasBombInSelected = selectedTiles.some((t) => t.type !== "REWARD" || (t.deltaPoints && t.deltaPoints < 0));
      osState.hasBombDetected = hasBombInSelected;

      // Kích hoạt cơ chế Mắt Thần cho 4 Cửa nếu có PEEK_PROMO:
      if (getPerkType(state.promoPerk) === "PEEK_PROMO") {
        if (!hasBombInSelected) {
          // KHÔNG CÓ BOM: Hiện chức năng của 1 trong hai cửa
          const randomSafe = selectedTiles[Math.floor(Math.random() * selectedTiles.length)];
          randomSafe.isPeeked = true;
          randomSafe.peekLabel = randomSafe.storyTitle;
          randomSafe.peekIcon = randomSafe.icon;
        } else {
          // CÓ BOM: Gán nhãn cho CẢ HAI CỬA là chức năng của cửa cộng điểm!
          const rewardTile = selectedTiles.find((t) => t.type === "REWARD") || selectedTiles[0];
          selectedTiles.forEach((t) => {
            t.isPeeked = true;
            t.peekLabel = rewardTile.storyTitle;
            t.peekIcon = rewardTile.icon;
          });
        }
      }

      // Chuyển sang Giai đoạn 2: Người chơi chọn 1 trong 2 cánh cửa đã để ra riêng đang sáng!
      osState.phase = "STAGE_2_PICK";
      return { updatedState: { ...state }, isBomb: false, scorePenalty: 0 };
    }

    // Giai đoạn 2: Người chơi PHẢI CHỌN GIỮA 1 TRONG 2 CỬA ĐÃ ĐỂ RA RIÊNG!
    if (osState.phase === "STAGE_2_PICK" || osState.phase === "SCANNED") {
      const selected = osState.selectedDoorIds || [];
      // CHỈ CHO PHÉP chọn 1 trong 2 cánh cửa đã để ra riêng! (Các cánh cửa khác đã bị loại)
      if (!selected.includes(tileId)) {
        return { updatedState: state, isBomb: false, scorePenalty: 0 };
      }

      // Người chơi bấm mở 1 trong 2 cánh cửa đã để ra riêng!
      osState.chosenFinalDoorId = tileId;
      osState.phase = "RESOLVED";
      osState.allRevealed = true;

      // Lật mở toàn bộ 4 cánh cửa để hé lộ tất cả
      state.tiles.forEach((t) => {
        t.isOpened = true;
      });

      const isBomb = tile.type !== "REWARD";

      if (isBomb) {
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
            rewardText: `🛡️ KHIÊN THẦN ĐÃ HẤP THỤ BẪY BOM! Cửa bẫy nổ đã bị chặn đứng an toàn, nhận trọn vẹn +${basePoints}đ câu hỏi gốc!`,
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

        const penalty = Math.abs(tile.deltaPoints || state.baseQuestionPoints || 10);
        state.potPoints = 0;
        state.bombExploded = {
          type: "MAJOR",
          title: tile.storyTitle,
          description: tile.storyDescription,
          penaltyText: `Mở trúng Cửa Bẫy Bom! Bị trừ ${penalty} điểm từ tổng điểm.`,
        };
        state.phase = "TURN_SUMMARY";
        state.turnFinishedReason = "BOMB_HIT";

        const oldScore = team.score || 0;
        const newScore = Math.max(0, oldScore - penalty);

        state.storyResult = {
          teamId: team.id,
          teamName: team.name,
          teamColor: team.color || "#ef4444",
          rewardText: `💥 Mở trúng Cửa Bẫy Bom! Phát nổ và bị trừ ${penalty} điểm!`,
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

      // CỬA AN TOÀN / PHẦN THƯỞNG
      const hasExtraPot = getPerkType(state.promoPerk) === "EXTRA_POT_PROMO";
      const extraPotBonus = hasExtraPot ? 5 : 0;
      const multiplier = state.potMultiplier || 1;

      if (tile.effectType === "STEAL_POINTS") {
        const stealAmount = tile.deltaPoints || 20;
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

      const baseReward = tile.deltaPoints || 10;
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
        const stealAmount = tile.deltaPoints || 25;
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
        currentRound: state.currentRound,
        teams: allTeams,
        currentTeamId: team.id,
      },
    });
    state.tiles.push(tile);
  }

  tile.isOpened = true;
  state.lastFlippedTile = tile;
  state.cardsFlippedCount++;

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

    // Standard Bomb Penalties:
    let penalty = 0;
    let penaltyText = "";
    let recipientTeamId: string | undefined = undefined;
    let recipientTeamName: string | undefined = undefined;
    let giftedPoints = 0;
    let darkBombRecipients: Array<{ teamId: string; teamName: string; points: number }> | undefined = undefined;

    const currentScore = team.score || 0;
    const otherTeams = allTeams.filter((t) => t.id !== team.id && !t.isEliminated);
    const X = allTeams.length;

    if (tile.type === "BOMB_SMOKE" || tile.type === "BOMB_MINOR") {
      // 1. Bom Khói (50%): Mất sạch điểm của câu này (tổng điểm không đổi)
      penalty = 0;
      penaltyText = "Mất sạch điểm của câu này. Tổng điểm của đội không đổi.";
      state.bombExploded = {
        type: "SMOKE",
        title: "Bom Khói 💨",
        description: tile.storyDescription,
        penaltyText,
        donorTeamId: team.id,
        donorTeamName: team.name,
        deductedPoints: 0,
      };
    } else if (tile.type === "BOMB_DARK" || tile.type === "BOMB_DOOM") {
      // 2. Bom Hắc Ám (35%): Mất một số điểm ngẫu nhiên, chia đều số này cho các đội còn lại
      darkBombRecipients = [];

      if (otherTeams.length === 0) {
        // Solo mode / Sandbox 1 đội
        penalty = currentScore < 5 ? currentScore : 5;
        penaltyText = `Bị trừ ${penalty} điểm từ tổng điểm.`;
      } else if (currentScore < 5 * X) {
        const sortedOthers = [...otherTeams].sort((a, b) => {
          const diff = (a.score || 0) - (b.score || 0);
          if (diff !== 0) return diff;
          return Math.random() - 0.5;
        });
        const numTeamsToReceive = Math.floor(currentScore / 5);
        for (let i = 0; i < Math.min(numTeamsToReceive, sortedOthers.length); i++) {
          darkBombRecipients.push({
            teamId: sortedOthers[i].id,
            teamName: sortedOthers[i].name,
            points: 5,
          });
        }
        const recNames = darkBombRecipients.map((r) => `${r.teamName} (+5đ)`).join(", ");
        penaltyText = recNames
          ? `Bị trừ toàn bộ ${penalty} điểm! Đã phân phát cho đội thấp điểm: ${recNames}`
          : `Bị trừ toàn bộ ${penalty} điểm!`;
      } else {
        const maxM = Math.floor(currentScore / (5 * otherTeams.length));
        const m = Math.max(1, Math.min(3, Math.floor(Math.random() * maxM) + 1));
        const pointsPerOtherTeam = 5 * m;
        penalty = pointsPerOtherTeam * otherTeams.length;

        for (const other of otherTeams) {
          darkBombRecipients.push({
            teamId: other.id,
            teamName: other.name,
            points: pointsPerOtherTeam,
          });
        }
        const recNames = darkBombRecipients.map((r) => `${r.teamName} (+${pointsPerOtherTeam}đ)`).join(", ");
        penaltyText = `Bị trừ ${penalty} điểm! Chia đều cho các đội còn lại: ${recNames}`;
      }

      state.bombExploded = {
        type: "DARK",
        title: "Bom Hắc Ám 🌑",
        description: tile.storyDescription,
        penaltyText,
        donorTeamId: team.id,
        donorTeamName: team.name,
        deductedPoints: penalty,
        recipients: darkBombRecipients,
      };
    } else {
      // 3. Bom Từ Thiện (15%): Mất 50% số điểm (làm tròn lên bội số của 5), tặng cho đội có điểm cao nhất
      if (currentScore > 0) {
        giftedPoints = Math.min(currentScore, Math.ceil((currentScore * 0.5) / 5) * 5);
      } else {
        giftedPoints = 0;
      }
      penalty = giftedPoints;

      if (otherTeams.length > 0) {
        const maxScore = Math.max(...otherTeams.map((t) => t.score || 0));
        const topTeams = otherTeams.filter((t) => (t.score || 0) === maxScore);
        const chosen = topTeams[Math.floor(Math.random() * topTeams.length)];
        recipientTeamId = chosen.id;
        recipientTeamName = chosen.name;
      }

      penaltyText = recipientTeamName
        ? `Bị trừ 50% điểm (-${giftedPoints}đ) và chuyển tặng toàn bộ cho Đội ${recipientTeamName}!`
        : `Bị trừ 50% điểm (-${giftedPoints}đ)!`;

      state.bombExploded = {
        type: "CHARITY",
        title: "Bom Từ Thiện 🎁",
        description: tile.storyDescription,
        penaltyText,
        donorTeamId: team.id,
        donorTeamName: team.name,
        deductedPoints: penalty,
        recipientTeamId,
        recipientTeamName,
        giftedPoints,
      };
    }

    // SAFETY_NET_PROMO: Bảo lưu 50% quỹ điểm nếu có
    const hasSafetyNet = getPerkType(state.promoPerk) === "SAFETY_NET_PROMO";
    const savedPotPoints = hasSafetyNet && state.potPoints > 0 ? Math.ceil(state.potPoints * 0.5) : 0;
    const finalDelta = savedPotPoints - penalty;

    state.potPoints = 0;
    state.phase = "TURN_SUMMARY";
    state.turnFinishedReason = "BOMB_HIT";

    const oldScore = currentScore;
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
    const stealAmount = tile.deltaPoints || 20;
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

  let victimTeamId: string | undefined;
  let victimTeamName: string | undefined;
  let stolenPoints: number | undefined;

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
      });
      if (stealCalc.victimTeamId && stealCalc.stolenPoints > 0) {
        victimTeamId = stealCalc.victimTeamId;
        victimTeamName = stealCalc.victimTeamName;
        stolenPoints = stealCalc.stolenPoints;
      }
    }
  }

  // Promo Perk: STEAL_5_PROMO (Đánh cắp 5đ từ đội cao điểm nhất)
  let promoStealDetails: { victimName?: string; stolen: number } | undefined;
  if (getPerkType(state.promoPerk) === "STEAL_5_PROMO" && allTeams.length > 0) {
    const promoSteal = calculatePromoSteal5({
      activeTeamId: team.id,
      allTeams,
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

  const oldScore = team.score || 0;
  const newScore = oldScore + finalScoreDelta;

  state.phase = "TURN_SUMMARY";
  state.turnFinishedReason = "CASH_OUT";
  state.potPoints = 0; // Reset to 0 immediately upon cashing out!
  state.stolenPointsPot = 0;

  let rewardText = `💰 Bảo toàn thành công! Nhận trọn vẹn +${finalScoreDelta} điểm!`;
  if (promoStealDetails && promoStealDetails.stolen > 0) {
    rewardText = `💰 Bảo toàn thành công! Nhận trọn vẹn +${finalScoreDelta} điểm (bao gồm 🗡️ Đạo Tặc đánh cắp ${promoStealDetails.stolen}đ từ Đội ${promoStealDetails.victimName})!`;
  } else if (victimTeamName && stolenPoints) {
    rewardText = `💰 Bảo toàn thành công! Nhận trọn vẹn +${finalScoreDelta} điểm (đã cướp ${stolenPoints}đ từ Đội ${victimTeamName} có giới hạn bảo vệ)!`;
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
    const award = state.baseQuestionPoints || 10;
    state.phase = "TURN_SUMMARY";
    state.turnFinishedReason = "PAIR_MATCHED";
    state.potPoints = 0;
    memState.promptSecondChance = false;
    state.memoryPairsState = { ...memState };

    const oldScore = team.score || 0;
    const newScore = oldScore + award;

    state.storyResult = {
      teamId: team.id,
      teamName: team.name,
      teamColor: team.color || "#ef4444",
      rewardText: `💰 Bảo toàn an toàn! Nhận trọn vẹn +${award} điểm của câu hỏi!`,
      scoreDelta: award,
      oldScore,
      newScore,
    };

    return {
      updatedState: { ...state },
      finalScoreDelta: award,
    };
  } else {
    // Chơi tiếp Vòng 2: 3 lượt mới
    memState.round = 2;
    memState.attemptsUsed = 0;
    memState.promptSecondChance = false;
    memState.firstFlippedTileId = null;
    memState.secondFlippedTileId = null;
    memState.thirdFlippedTileId = null;
    memState.keptBombTileIds = [];
    memState.isBombRescueActive = false;
    memState.isMismatchResolving = false;
    // Đảm bảo tất cả các thẻ úp lại và đã được xáo trộn
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

  const stolenPoints = pending?.stolenPoints || 20;
  const victimTeamId = targetTeam?.id;
  const victimTeamName = targetTeam?.name || "Đối thủ";
  const hasExtraPot = getPerkType(state.promoPerk) === "EXTRA_POT_PROMO";
  const extraPotBonus = hasExtraPot ? 5 : 0;

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
        ? `🗡️ Đã nhắm Đội ${victimTeamName}! Nạp +${stolenPoints}đ cướp và +${extraPotBonus}đ từ Quỹ thưởng vào quỹ điểm (Tổng +${totalPotFromSteal}đ)!`
        : `🗡️ Đã nhắm Đội ${victimTeamName}! Nạp +${totalPotFromSteal} điểm cướp vào quỹ điểm!`,
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
    ? `🗡️ Cướp thành công! Đã chuyển +${stolenPoints} điểm từ Đội ${victimTeamName} và nhận thêm +${extraPotBonus}đ từ Quỹ thưởng (+${finalScoreDelta} điểm cho Đội ${state.currentTurnTeamName})!`
    : `🗡️ Cướp thành công! Đã chuyển +${stolenPoints} điểm từ Đội ${victimTeamName} sang Đội ${state.currentTurnTeamName}!`;

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
 * Handles Stage 2 decision for 4 Cánh Cửa Bí Mật (ONE_SHOT_DOORS):
 * - "SAFE_EXIT": Dừng lại & bảo toàn điểm gốc của câu hỏi (+baseQuestionPoints).
 * - "RISK_OPEN": Liều mở 1 trong 2 cửa đã chọn (50/50).
 */
export function handleOneShotDoorsDecision({
  state,
  team,
  allTeams = [],
  decision,
  chosenDoorId,
}: {
  state: MysteryQuestState;
  team: MysteryTeamRef;
  allTeams?: MysteryTeamRef[];
  decision: "SAFE_EXIT" | "RISK_OPEN";
  chosenDoorId?: number;
}): {
  updatedState: MysteryQuestState;
  finalScoreDelta: number;
  isBomb: boolean;
  scorePenalty: number;
  victimTeamId?: string;
  victimTeamName?: string;
  stolenPoints?: number;
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

  if (decision === "SAFE_EXIT") {
    // 🛡️ DỪNG LẠI & BẢO TOÀN
    osState.phase = "RESOLVED";
    osState.allRevealed = true;
    state.tiles.forEach((t) => {
      t.isOpened = true;
    });

    const finalDelta = (state.baseQuestionPoints || 10) + extraPotBonus;
    state.potPoints = 0;
    state.phase = "TURN_SUMMARY";
    state.turnFinishedReason = "DOOR_CHOSEN";

    const oldScore = team.score || 0;
    const newScore = oldScore + finalDelta;

    const rewardText = extraPotBonus > 0
      ? `🛡️ Bảo toàn xuất sắc! Tránh bẫy bom an toàn, nhận +${state.baseQuestionPoints || 10}đ câu hỏi và +${extraPotBonus}đ Quỹ thưởng (Tổng +${finalDelta} điểm)!`
      : `🛡️ Bảo toàn xuất sắc! Tránh bẫy bom an toàn, nhận trọn vẹn +${finalDelta} điểm câu hỏi!`;

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

  // 🎲 RISK_OPEN: Liều mở 1 trong 2 cửa
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

  const isBomb = chosenTile.type !== "REWARD";

  if (isBomb) {
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
        rewardText: `🛡️ KHIÊN THẦN ĐÃ HẤP THỤ BẪY BOM! Cửa bẫy nổ đã bị chặn đứng an toàn, nhận trọn vẹn +${basePoints}đ câu hỏi gốc!`,
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

    const bombType = rollBombTypeForMinigame("ONE_SHOT_DOORS", team.score || 0);
    const outcome = resolveBombOutcome({
      bombType,
      team,
      allTeams,
      storyDescription: chosenTile.storyDescription || "Mở trúng Cửa Bẫy Bom!",
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
    let victimTeamId: string | undefined;
    let victimTeamName: string | undefined;
    let stolenPoints: number | undefined;
    let finalDelta = 0;

    if (chosenTile.effectType === "STEAL_POINTS") {
      const stealAmount = chosenTile.deltaPoints || 25;
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
      finalDelta = ((chosenTile.deltaPoints || 25) * multiplier) + extraPotBonus;
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

  if (rand < 0.30) {
    // ☀️ 1. MẶT TRỜI (30%): Điềm lành. Nhận trọn vẹn điểm câu hiện tại an toàn.
    drawnCard = {
      key: "THE_SUN",
      nameVi: "Mặt Trời",
      nameEn: "The Sun",
      icon: "☀️",
      roman: "XIX",
      group: "COMMON",
      scoreDelta: basePoints,
    };
  } else if (rand < 0.60) {
    // 🃏 2. KẺ KHỜ (30%): Điềm dữ. Mất sạch điểm tích lũy câu này.
    drawnCard = {
      key: "THE_FOOL",
      nameVi: "Kẻ Khờ",
      nameEn: "The Fool",
      icon: "🃏",
      roman: "0",
      group: "COMMON",
      scoreDelta: 0,
    };
  } else if (rand < 0.75) {
    // 👑 3. HOÀNG ĐẾ (15%): Quyền lực hắc ám. Trừ điểm tổng chia đều cho các đội còn lại.
    const darkOutcome = resolveBombOutcome({
      bombType: "BOMB_DARK",
      team,
      allTeams,
      storyDescription: "Hoàng Đế uy quyền hắc ám! Rút cạn điểm số chia đều cho các đối thủ!",
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
  } else if (rand < 0.90) {
    // 🗡️ 4. HIỆP SĨ (15%): Định mệnh trừng phạt. Bị bay mất 1/2 tổng điểm hiện có (xóa sổ).
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
  } else {
    // 💀 5. THẦN CHẾT (10%): Cú lật kèo định mệnh. 50% Tặng điểm / 50% Cướp điểm
    const subRand = Math.random();
    let top1Team: MysteryTeamRef | undefined = undefined;
    if (otherTeams.length > 0) {
      const maxScore = Math.max(...otherTeams.map((t) => t.score || 0));
      const topCandidates = otherTeams.filter((t) => (t.score || 0) === maxScore);
      top1Team = topCandidates[Math.floor(Math.random() * topCandidates.length)];
    }

    if (subRand < 0.5) {
      // Kịch bản Tặng điểm (5%): Trừ 50% tổng điểm tặng Top 1
      const gifted = roundToMultipleOfFive(currentScore * 0.5);
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
      // Kịch bản Cướp điểm (5%): Cướp basePoints * 2 từ Top 1 đối thủ
      const stolen = basePoints * 2;
      const top1Score = top1Team?.score || 0;
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
    case "THE_SUN":
      finalScoreDelta = basePoints;
      rewardText = `☀️ MẶT TRỜI QUANG MINH: Điềm lành tuyệt đối! Nhận trọn vẹn +${basePoints}đ an toàn!`;
      break;

    case "THE_FOOL":
      finalScoreDelta = 0;
      rewardText = `🃏 KẺ KHỜ: Điềm dữ! Mất toàn bộ điểm câu hiện tại (0đ). Tổng điểm giữ nguyên.`;
      break;

    case "THE_EMPEROR":
      scorePenalty = Math.abs(drawnCard.scoreDelta);
      finalScoreDelta = -scorePenalty;
      const recNames = (drawnCard.darkBombRecipients || []).map((r) => `${r.teamName} (+${r.points}đ)`).join(", ");
      rewardText = `👑 HOÀNG ĐẾ: Quyền lực hắc ám trừ -${scorePenalty}đ chia đều cho đối thủ: ${recNames || "các đội khác"}!`;
      break;

    case "THE_KNIGHT":
      scorePenalty = Math.abs(drawnCard.scoreDelta);
      finalScoreDelta = -scorePenalty;
      rewardText = `🗡️ HIỆP SĨ: Định mệnh trừng phạt xóa sổ 1/2 tổng điểm hiện có (-${scorePenalty}đ)!`;
      break;

    case "THE_DEATH":
      if (drawnCard.deathSubtype === "GIFT_TOP1") {
        scorePenalty = Math.abs(drawnCard.scoreDelta);
        finalScoreDelta = -scorePenalty;
        rewardText = `💀 THẦN CHẾT (HIẾN TẾ): Bị trừ 50% tổng điểm (-${scorePenalty}đ) chuyển tặng trọn gói cho Top 1 (${drawnCard.victimTeamName || "Đối thủ"})!`;
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
 * Danh sách 20 nan quạt trên Vòng Quay Tarot Định Mệnh.
 * Tỷ lệ chuẩn xác tuyệt đối (50% - 35% - 15%):
 * - 50% Nhóm Thường (10 ô): 5 ô Mặt Trời (25%) + 5 ô Kẻ Khờ (25%)
 * - 35% Nhóm Đột Biến (7 ô): 4 ô Hoàng Đế (20%) + 3 ô Hiệp Sĩ (15%)
 * - 15% Nhóm Chí Mạng (3 ô): 2 ô Thần Chết Cướp (10%) + DUY NHẤT 1 ô Thần Chết Tặng (5%)
 */
export const TAROT_WHEEL_SEGMENTS: TarotWheelSegment[] = [
  { index: 0, key: "THE_SUN", nameVi: "Mặt Trời (The Sun)", nameEn: "The Sun", icon: "☀️", roman: "XIX", group: "COMMON", bgColor: "#78350f", borderColor: "#f59e0b", textColor: "#fef08a" },
  { index: 1, key: "THE_EMPEROR", nameVi: "Hoàng Đế (The Emperor)", nameEn: "The Emperor", icon: "👑", roman: "IV", group: "MUTATION", bgColor: "#7c2d12", borderColor: "#f97316", textColor: "#fed7aa" },
  { index: 2, key: "THE_FOOL", nameVi: "Kẻ Khờ (The Fool)", nameEn: "The Fool", icon: "🃏", roman: "0", group: "COMMON", bgColor: "#4c1d95", borderColor: "#a855f7", textColor: "#f3e8ff" },
  { index: 3, key: "THE_KNIGHT", nameVi: "Hiệp Sĩ (The Knight)", nameEn: "The Knight", icon: "🗡️", roman: "VII", group: "MUTATION", bgColor: "#1e1b4b", borderColor: "#6366f1", textColor: "#c7d2fe" },
  { index: 4, key: "THE_DEATH", nameVi: "Thần Chết (Cướp Điểm)", nameEn: "Death", icon: "💀", roman: "XIII", group: "CRITICAL", deathSubtype: "STEAL_TOP1", bgColor: "#064e3b", borderColor: "#10b981", textColor: "#a7f3d0" },
  { index: 5, key: "THE_SUN", nameVi: "Mặt Trời (The Sun)", nameEn: "The Sun", icon: "☀️", roman: "XIX", group: "COMMON", bgColor: "#78350f", borderColor: "#f59e0b", textColor: "#fef08a" },
  { index: 6, key: "THE_EMPEROR", nameVi: "Hoàng Đế (The Emperor)", nameEn: "The Emperor", icon: "👑", roman: "IV", group: "MUTATION", bgColor: "#7c2d12", borderColor: "#f97316", textColor: "#fed7aa" },
  { index: 7, key: "THE_FOOL", nameVi: "Kẻ Khờ (The Fool)", nameEn: "The Fool", icon: "🃏", roman: "0", group: "COMMON", bgColor: "#4c1d95", borderColor: "#a855f7", textColor: "#f3e8ff" },
  { index: 8, key: "THE_DEATH", nameVi: "Thần Chết (Tặng Điểm)", nameEn: "Death", icon: "💀", roman: "XIII", group: "CRITICAL", deathSubtype: "GIFT_TOP1", bgColor: "#881337", borderColor: "#f43f5e", textColor: "#fecdd3" },
  { index: 9, key: "THE_SUN", nameVi: "Mặt Trời (The Sun)", nameEn: "The Sun", icon: "☀️", roman: "XIX", group: "COMMON", bgColor: "#78350f", borderColor: "#f59e0b", textColor: "#fef08a" },
  { index: 10, key: "THE_KNIGHT", nameVi: "Hiệp Sĩ (The Knight)", nameEn: "The Knight", icon: "🗡️", roman: "VII", group: "MUTATION", bgColor: "#1e1b4b", borderColor: "#6366f1", textColor: "#c7d2fe" },
  { index: 11, key: "THE_FOOL", nameVi: "Kẻ Khờ (The Fool)", nameEn: "The Fool", icon: "🃏", roman: "0", group: "COMMON", bgColor: "#4c1d95", borderColor: "#a855f7", textColor: "#f3e8ff" },
  { index: 12, key: "THE_EMPEROR", nameVi: "Hoàng Đế (The Emperor)", nameEn: "The Emperor", icon: "👑", roman: "IV", group: "MUTATION", bgColor: "#7c2d12", borderColor: "#f97316", textColor: "#fed7aa" },
  { index: 13, key: "THE_DEATH", nameVi: "Thần Chết (Cướp Điểm)", nameEn: "Death", icon: "💀", roman: "XIII", group: "CRITICAL", deathSubtype: "STEAL_TOP1", bgColor: "#064e3b", borderColor: "#10b981", textColor: "#a7f3d0" },
  { index: 14, key: "THE_SUN", nameVi: "Mặt Trời (The Sun)", nameEn: "The Sun", icon: "☀️", roman: "XIX", group: "COMMON", bgColor: "#78350f", borderColor: "#f59e0b", textColor: "#fef08a" },
  { index: 15, key: "THE_KNIGHT", nameVi: "Hiệp Sĩ (The Knight)", nameEn: "The Knight", icon: "🗡️", roman: "VII", group: "MUTATION", bgColor: "#1e1b4b", borderColor: "#6366f1", textColor: "#c7d2fe" },
  { index: 16, key: "THE_FOOL", nameVi: "Kẻ Khờ (The Fool)", nameEn: "The Fool", icon: "🃏", roman: "0", group: "COMMON", bgColor: "#4c1d95", borderColor: "#a855f7", textColor: "#f3e8ff" },
  { index: 17, key: "THE_EMPEROR", nameVi: "Hoàng Đế (The Emperor)", nameEn: "The Emperor", icon: "👑", roman: "IV", group: "MUTATION", bgColor: "#7c2d12", borderColor: "#f97316", textColor: "#fed7aa" },
  { index: 18, key: "THE_SUN", nameVi: "Mặt Trời (The Sun)", nameEn: "The Sun", icon: "☀️", roman: "XIX", group: "COMMON", bgColor: "#78350f", borderColor: "#f59e0b", textColor: "#fef08a" },
  { index: 19, key: "THE_FOOL", nameVi: "Kẻ Khờ (The Fool)", nameEn: "The Fool", icon: "🃏", roman: "0", group: "COMMON", bgColor: "#4c1d95", borderColor: "#a855f7", textColor: "#f3e8ff" },
];

/**
 * Tính toán góc quay vật lý và ô trúng thưởng dựa trên lực nạp (Power Percent 1-100%).
 */
export function calculateTarotWheelSpin({
  powerPercent,
  currentAngle = 0,
}: {
  powerPercent: number;
  currentAngle?: number;
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
  const landedSegment = TAROT_WHEEL_SEGMENTS[landedIndex];
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
  const { targetAngle, spinDurationMs, landedSegment, landedIndex } = calculateTarotWheelSpin({
    powerPercent,
    currentAngle,
  });

  const basePoints = state.baseQuestionPoints || 10;
  const currentScore = team.score || 0;
  const otherTeams = (allTeams || []).filter((t) => t.id !== team.id && !t.isEliminated);

  let drawnCard: AncientTarotDrawnCard;

  switch (landedSegment.key) {
    case "THE_SUN":
      drawnCard = {
        key: "THE_SUN",
        nameVi: "Mặt Trời",
        nameEn: "The Sun",
        icon: "☀️",
        roman: "XIX",
        group: "COMMON",
        scoreDelta: basePoints,
      };
      break;

    case "THE_FOOL":
      drawnCard = {
        key: "THE_FOOL",
        nameVi: "Kẻ Khờ",
        nameEn: "The Fool",
        icon: "🃏",
        roman: "0",
        group: "COMMON",
        scoreDelta: 0,
      };
      break;

    case "THE_EMPEROR": {
      const minPenalty = Math.min(currentScore, 5 * Math.max(1, otherTeams.length));
      const rawPenalty = Math.max(minPenalty, roundToMultipleOfFive(basePoints * 1.5));
      const penalty = Math.min(currentScore, rawPenalty);
      const numRecipients = Math.max(1, otherTeams.length);
      const perTeamRaw = Math.floor(penalty / numRecipients / 5) * 5;
      const darkBombRecipients = otherTeams.map((ot) => ({
        teamId: ot.id,
        teamName: ot.name,
        points: perTeamRaw,
      }));
      drawnCard = {
        key: "THE_EMPEROR",
        nameVi: "Hoàng Đế",
        nameEn: "The Emperor",
        icon: "👑",
        roman: "IV",
        group: "MUTATION",
        scoreDelta: -penalty,
        darkBombRecipients,
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
        const gifted = roundToMultipleOfFive(currentScore * 0.5);
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

  if (state.hasShield && isNegative) {
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

  let finalScoreDelta = 0;
  let scorePenalty = 0;
  let rewardText = "";

  switch (drawnCard.key) {
    case "THE_SUN":
      finalScoreDelta = basePoints;
      rewardText = `☀️ MẶT TRỜI QUANG MINH: Điềm lành tuyệt đối! Nhận trọn vẹn +${basePoints}đ an toàn!`;
      break;

    case "THE_FOOL":
      finalScoreDelta = 0;
      rewardText = `🃏 KẺ KHỜ: Điềm dữ! Mất toàn bộ điểm câu hiện tại (0đ). Tổng điểm giữ nguyên.`;
      break;

    case "THE_EMPEROR":
      scorePenalty = Math.abs(drawnCard.scoreDelta);
      finalScoreDelta = -scorePenalty;
      const recNames = (drawnCard.darkBombRecipients || []).map((r) => `${r.teamName} (+${r.points}đ)`).join(", ");
      rewardText = `👑 HOÀNG ĐẾ: Quyền lực hắc ám trừ -${scorePenalty}đ chia đều cho đối thủ: ${recNames || "các đội khác"}!`;
      break;

    case "THE_KNIGHT":
      scorePenalty = Math.abs(drawnCard.scoreDelta);
      finalScoreDelta = -scorePenalty;
      rewardText = `🗡️ HIỆP SĨ: Định mệnh trừng phạt xóa sổ 1/2 tổng điểm hiện có (-${scorePenalty}đ)!`;
      break;

    case "THE_DEATH":
      if (drawnCard.deathSubtype === "GIFT_TOP1") {
        scorePenalty = Math.abs(drawnCard.scoreDelta);
        finalScoreDelta = -scorePenalty;
        rewardText = `💀 THẦN CHẾT (HIẾN TẾ): Bị trừ 50% tổng điểm (-${scorePenalty}đ) chuyển tặng trọn gói cho Top 1 (${drawnCard.victimTeamName || "Đối thủ"})!`;
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
    state.nextCardPeek = {
      icon: topCard.icon,
      storyTitle: topCard.storyTitle,
      isBomb: topCard.type !== "REWARD",
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
      // Nếu chưa lật lá nào thì generate lại bộ thẻ theo normPoints mới
      if (!state.memoryPairsState?.firstFlippedTileId && state.cardsFlippedCount === 0) {
        state.tiles = generateMemoryPairsTiles(normPoints, roundOptions);
        if (getPerkType(state.promoPerk) === "PEEK_PROMO") {
          const safeTiles = state.tiles.filter((t) => t.type === "REWARD" && t.pairKey !== "PAIR_BOMB");
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
      if (state.oneShotState?.phase === "SELECTING" && (!state.oneShotState.selectedDoorIds || state.oneShotState.selectedDoorIds.length === 0)) {
        state.tiles = generateOneShotDoorsTiles(normPoints, roundOptions);
      }
      break;
    }

    case "TAROT_DESTINY": {
      if (!state.tarotState?.chosenCardId && (!state.tarotState?.prophecyCardId || !state.tarotState?.prophecyResolved)) {
        state.tiles = generateTarotDestinyTiles(normPoints, roundOptions);
        if (getPerkType(state.promoPerk) === "PEEK_PROMO") {
          const prophecyCard = state.tiles[Math.floor(Math.random() * state.tiles.length)];
          prophecyCard.isOpened = true;
          if (state.tarotState) {
            state.tarotState.prophecyCardId = prophecyCard.id;
            state.tarotState.prophecyResolved = false;
          }
        }
      }
      break;
    }

    case "PUSH_YOUR_LUCK":
    default: {
      if (state.cardsFlippedCount === 0) {
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

