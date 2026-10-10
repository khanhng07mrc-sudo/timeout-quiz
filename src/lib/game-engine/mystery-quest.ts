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
} from "@/types";

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
 * Generates dynamic promo perk based on base question points.
 * - 10đ (Riskier minigame): higher shield / extra pot chance to entice players
 * - 20đ: balanced
 * - 30đ: higher double pot chance for epic payoffs
 */
export function generateMysteryPromoPerk(
  basePoints: number = 10,
  miniGameType?: MysteryMiniGameType
): MysteryPromoPerk {
  const normType = miniGameType ? normalizeMiniGameType(miniGameType) : "PUSH_YOUR_LUCK";
  let pool: MysteryPromoPerk[] = [];

  if (normType === "MEMORY_PAIRS") {
    pool = ["SHIELD_PROMO", "EXTRA_POT_PROMO", "DOUBLE_PROMO", "PEEK_PROMO", "EXTRA_ATTEMPT_PROMO"];
  } else if (normType === "ONE_SHOT_DOORS") {
    pool = ["SHIELD_PROMO", "EXTRA_POT_PROMO", "DOUBLE_PROMO", "PEEK_PROMO"];
  } else if (normType === "TAROT_DESTINY") {
    pool = ["SHIELD_PROMO", "EXTRA_POT_PROMO", "DOUBLE_PROMO", "PEEK_PROMO", "EXTRA_ATTEMPT_PROMO"];
  } else {
    // PUSH_YOUR_LUCK
    pool = ["SHIELD_PROMO", "EXTRA_POT_PROMO", "DOUBLE_PROMO", "PEEK_PROMO", "SAFETY_NET_PROMO"];
  }

  return pool[Math.floor(Math.random() * pool.length)];
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
      pairKey: "PAIR_BOMB",
      icon: "💣",
      type: "BOMB_MAJOR",
      storyTitle: "💣 CẶP KÍP NỔ HẮC ÁM!",
      storyDescription: `Ghép trúng cặp kíp nổ liên hoàn: Kích nổ bom hắc ám, bị phạt trừ ${pPenalty} điểm!`,
      effectType: "LOSE_POINTS",
      deltaPoints: -pPenalty,
    },
  ];

  const tileItems: Omit<MysteryTile, "id" | "label">[] = [];
  pairs.forEach((p) => {
    // Add 2 copies for each pair (total 10 cards)
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
  baseQuestionPoints = 10,
}: {
  turnIndex: number;
  currentTeam: MysteryTeamRef;
  teams: MysteryTeamRef[];
  turnsPerTeam?: number;
  prevTheme?: MysteryTheme;
  prevMiniGameType?: MysteryMiniGameType;
  forcedMiniGameType?: MysteryMiniGameType;
  baseQuestionPoints?: number;
}): MysteryQuestState {
  const availableThemes = prevTheme ? THEME_KEYS.filter((t) => t !== prevTheme) : THEME_KEYS;
  const theme = availableThemes[Math.floor(Math.random() * availableThemes.length)];
  const themeMeta = MYSTERY_THEMES[theme];

  const miniGameType = forcedMiniGameType
    ? normalizeMiniGameType(forcedMiniGameType)
    : getRandomMiniGame(prevMiniGameType);

  const promoPerk = generateMysteryPromoPerk(baseQuestionPoints, miniGameType);

  const currentRound = Math.floor(turnIndex / teams.length) + 1;
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
      tiles = generateMemoryPairsTiles(baseQuestionPoints, roundOptions);
      if (promoPerk === "PEEK_PROMO") {
        const firstBomb = tiles.find((t) => t.type !== "REWARD" || t.pairKey === "PAIR_BOMB");
        if (firstBomb) firstBomb.isPeeked = true;
      }
      memoryPairsState = {
        firstFlippedTileId: null,
        secondFlippedTileId: null,
        thirdFlippedTileId: null,
        keptBombTileIds: [],
        isBombRescueActive: false,
        attemptsUsed: 0,
        maxAttempts: promoPerk === "EXTRA_ATTEMPT_PROMO" ? 4 : 3,
        matchedPairKey: null,
        isMismatchResolving: false,
        round: 1,
        promptSecondChance: false,
      };
      break;

    case "ONE_SHOT_DOORS":
      tiles = generateOneShotDoorsTiles(baseQuestionPoints, roundOptions);
      if (promoPerk === "PEEK_PROMO") {
        const bombDoor = tiles.find((t) => t.type !== "REWARD");
        if (bombDoor) bombDoor.isPeeked = true;
      }
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
      tiles = generateTarotDestinyTiles(baseQuestionPoints, roundOptions);
      if (promoPerk === "PEEK_PROMO") {
        const deathCard = tiles.find((t) => t.type !== "REWARD");
        if (deathCard) deathCard.isPeeked = true;
      }
      tarotState = {
        chosenCardId: undefined,
        canRedraw: promoPerk === "EXTRA_ATTEMPT_PROMO",
        hasRedrawn: false,
      };
      break;

    case "PUSH_YOUR_LUCK":
    default:
      tiles = generatePushYourLuckTiles(
        theme,
        baseQuestionPoints,
        currentTeam.score || 0,
        promoPerk === "DOUBLE_PROMO",
        roundOptions
      );
      break;
  }

  const nextCardPeek =
    promoPerk === "PEEK_PROMO" && miniGameType === "PUSH_YOUR_LUCK" && tiles[0]
      ? {
          icon: tiles[0].icon,
          storyTitle: tiles[0].storyTitle,
          isBomb: tiles[0].type !== "REWARD",
        }
      : undefined;

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
    baseQuestionPoints,
    promoPerk,
    hasShield: getPerkType(promoPerk) === "SHIELD_PROMO",
    potPoints: 0,
    potMultiplier: promoPerk === "DOUBLE_PROMO" ? 2 : 1,
    cardsFlippedCount: 0,
    memoryPairsState,
    oneShotState,
    tarotState,
    nextCardPeek,
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
      attemptsUsed: 0,
      maxAttempts: 3,
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

    const isBombTile = (t: MysteryTile | undefined) => Boolean(t && (t.type !== "REWARD" || t.pairKey === "PAIR_BOMB"));
    const hasExtraPot = getPerkType(state.promoPerk) === "EXTRA_POT_PROMO";
    const extraPotBonus = hasExtraPot ? 5 : 0;
    const isBombCard = isBombTile(tile);
    const previouslyKeptBombs = memState.keptBombTileIds || [];
    const hasPriorKeptBomb = previouslyKeptBombs.length > 0;

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

      // Mark all 3 opened immutably
      state.tiles = state.tiles.map((t) =>
        Number(t.id) === numTileId ||
        (card1 && Number(t.id) === Number(card1.id)) ||
        (card2 && Number(t.id) === Number(card2.id))
          ? { ...t, isOpened: true }
          : { ...t }
      );

      const cardsInTurn = [card1, card2, card3].filter(Boolean) as MysteryTile[];
      const nonBombCards = cardsInTurn.filter((c) => !isBombTile(c));
      const bombCard = cardsInTurn.find((c) => isBombTile(c)) || tile;

      // Đánh giá 2 lá thường còn lại:
      // "nếu hai lá còn lại trùng nhau (và tất nhiên là cộng điểm), hệ thống sẽ lấy hai lá cộng để tính điểm, ngược lại nếu không trùng nhau sẽ bị trừ điểm"
      const isRescueSuccess = nonBombCards.length === 2 && nonBombCards[0].pairKey === nonBombCards[1].pairKey;

      if (isRescueSuccess) {
        const winCard = nonBombCards[0];
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

        state.phase = "TURN_SUMMARY";
        state.turnFinishedReason = "PAIR_MATCHED";
        state.potPoints = 0;

        const oldScore = team.score || 0;
        const newScore = oldScore + finalDelta;
        const baseReward = finalDelta - extraPotBonus;

        const rewardText = extraPotBonus > 0
          ? `🎉 Thoát hiểm ngoạn mục! Lật phải 2 lá bom nhưng đã ghép chính xác cặp ${winCard.storyTitle}! Nhận trọn vẹn +${baseReward}đ và +${extraPotBonus}đ từ Quỹ thưởng (Tổng +${finalDelta} điểm)!`
          : `🎉 Thoát hiểm ngoạn mục! Lật phải 2 lá bom nhưng đã ghép chính xác cặp ${winCard.storyTitle}! Nhận trọn vẹn +${finalDelta} điểm!`;

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
        // Giải cứu thất bại: "ngược lại nếu không trùng nhau sẽ bị trừ điểm"
        memState.isBombRescueActive = false;
        state.memoryPairsState = { ...memState };

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
            rewardText: `🛡️ KHIÊN THẦN ĐÃ HẤP THỤ VỤ NỔ! Cặp kíp nổ đôi đã bị vô hiệu hóa an toàn, nhận trọn vẹn +${basePoints}đ câu hỏi gốc!`,
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

        const penalty = Math.abs(bombCard.deltaPoints || state.baseQuestionPoints || 10);
        state.bombExploded = {
          type: "MAJOR",
          title: "💣 KÍP NỔ ĐÔI HẮC ÁM PHÁT NỔ!",
          description: "Đã lật phải 2 lá bom và 2 lá bài bổ sung không trùng nhau! Bị phạt trừ điểm!",
          penaltyText: `Bị trừ ${penalty} điểm từ tổng điểm.`,
        };
        state.phase = "TURN_SUMMARY";
        state.turnFinishedReason = "BOMB_HIT";
        state.potPoints = 0;

        const oldScore = team.score || 0;
        const newScore = Math.max(0, oldScore - penalty);

        state.storyResult = {
          teamId: team.id,
          teamName: team.name,
          teamColor: team.color || "#ef4444",
          rewardText: `💥 Kíp nổ đôi phát nổ! Nỗ lực ghép cặp giải cứu không thành công, bị phạt trừ ${penalty} điểm!`,
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
    }

    // ─────────────────────────────────────────────────────────────────────────
    // STEP 1: Lật lá bài thứ 1 của lượt
    // ─────────────────────────────────────────────────────────────────────────
    if (!memState.firstFlippedTileId) {
      memState.firstFlippedTileId = tile.id;
      state.lastFlippedTile = tile;

      // Nếu lá bom thứ 1 đã lộ từ lượt trước, mà lượt này mở trúng lá bom thứ 2 ngay từ lá đầu tiên:
      if (isBombCard && hasPriorKeptBomb) {
        memState.isBombRescueActive = true;
      }

      state.tiles = state.tiles.map((t) =>
        Number(t.id) === numTileId ? { ...t, isOpened: true } : { ...t }
      );
      state.memoryPairsState = { ...memState };
      return { updatedState: { ...state, tiles: [...state.tiles], memoryPairsState: { ...memState } }, isBomb: false, scorePenalty: 0 };
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

    // TH 2.1: Đang trong lượt giải cứu (Card 1 là lá bom thứ 2, Card 2 là lá thường thứ nhất)
    // -> Giữ nguyên, mở khóa chờ lật tiếp lá thứ 3 (Card 3)!
    if (memState.isBombRescueActive) {
      state.memoryPairsState = { ...memState };
      return { updatedState: { ...state, tiles: [...state.tiles], memoryPairsState: { ...memState } }, isBomb: false, scorePenalty: 0 };
    }

    // TH 2.2: Card 2 là lá bom thứ 2, trong khi lá bom thứ 1 đã lộ từ trước!
    // -> Kích hoạt lượt giải cứu, mở khóa chờ lật tiếp lá thứ 3 (Card 3)!
    if (isBombCard && hasPriorKeptBomb) {
      memState.isBombRescueActive = true;
      state.memoryPairsState = { ...memState };
      return { updatedState: { ...state, tiles: [...state.tiles], memoryPairsState: { ...memState } }, isBomb: false, scorePenalty: 0 };
    }

    // TH 2.3: Người chơi lật trúng CẢ 2 LÁ BOM trong CÙNG LƯỢT NÀY!
    const isBothBombs = isBombTile(firstTile) && isBombCard;
    if (isBothBombs) {
      memState.attemptsUsed += 1;
      memState.matchedPairKey = "PAIR_BOMB";
      state.memoryPairsState = { ...memState };

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
          rewardText: `🛡️ KHIÊN THẦN ĐÃ HẤP THỤ VỤ NỔ! Cặp kíp nổ đã bị vô hiệu hóa an toàn, nhận trọn vẹn +${basePoints}đ câu hỏi gốc!`,
          scoreDelta: basePoints,
          oldScore,
          newScore,
        };
        return { updatedState: { ...state, tiles: [...state.tiles], memoryPairsState: { ...memState } }, isBomb: false, scorePenalty: 0, finalScoreDelta: basePoints };
      }

      const penalty = Math.abs(tile.deltaPoints || state.baseQuestionPoints || 10);
      state.bombExploded = {
        type: "MAJOR",
        title: tile.storyTitle,
        description: tile.storyDescription,
        penaltyText: `Dính cặp kíp nổ hắc ám! Bị trừ ${penalty} điểm từ tổng điểm.`,
      };
      state.phase = "TURN_SUMMARY";
      state.turnFinishedReason = "BOMB_HIT";
      state.potPoints = 0;

      const oldScore = team.score || 0;
      const newScore = Math.max(0, oldScore - penalty);
      state.storyResult = {
        teamId: team.id,
        teamName: team.name,
        teamColor: team.color || "#ef4444",
        rewardText: `💥 Dính cặp bom nổ! Bị phạt trừ ${penalty} điểm!`,
        scoreDelta: -penalty,
        oldScore,
        newScore,
      };

      return { updatedState: { ...state, tiles: [...state.tiles], memoryPairsState: { ...memState } }, isBomb: true, scorePenalty: penalty, finalScoreDelta: -penalty };
    }

    // TH 2.4: Một trong 2 lá là lá bom (lần đầu tiên lật trúng bom), lá còn lại là lá thường!
    // "nếu bạn chỉ cần lật trúng 1 trong 2 lá bài trừ điểm, lá đó sau khi lật lên sẽ vẫn được giữ lại cho dù có không lật được 2 lá trừ điểm cùng lượt"
    const isOneBomb = isBombTile(firstTile) || isBombCard;
    if (isOneBomb) {
      memState.attemptsUsed += 1;
      const bombTile = isBombTile(firstTile) ? firstTile! : tile;
      memState.keptBombTileIds = Array.from(new Set([...previouslyKeptBombs, bombTile.id]));
      memState.isMismatchResolving = true;

      const isRoundOver = memState.attemptsUsed >= memState.maxAttempts;
      const currentRound = memState.round || 1;

      if (isRoundOver) {
        if (currentRound === 1) {
          memState.promptSecondChance = true;
          state.memoryPairsState = { ...memState };
          return { updatedState: { ...state, tiles: [...state.tiles], memoryPairsState: { ...memState } }, isBomb: false, scorePenalty: 0, shouldResetMismatchedCards: true };
        } else {
          state.memoryPairsState = { ...memState };
          const penalty = state.baseQuestionPoints || 10;
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
              rewardText: `🛡️ KHIÊN THẦN ĐÃ BẢO VỆ BẠN! Vụ nổ trừng phạt vòng 2 đã bị chặn đứng an toàn, nhận trọn vẹn +${basePoints}đ câu hỏi gốc!`,
              scoreDelta: basePoints,
              oldScore,
              newScore,
            };
            return { updatedState: { ...state, tiles: [...state.tiles], memoryPairsState: { ...memState } }, isBomb: false, scorePenalty: 0, finalScoreDelta: basePoints, shouldResetMismatchedCards: true };
          }
          state.bombExploded = {
            type: "MAJOR",
            title: "💣 KÍCH HOẠT BOM PHẠT DO THẤT BẠI VÒNG 2!",
            description: "Đã cạn 3 lượt lật Vòng 2 mà vẫn không tìm thấy cặp trùng nhau. Kích nổ bom trừng phạt!",
            penaltyText: `Bị trừ ${penalty} điểm từ tổng điểm.`,
          };
          state.phase = "TURN_SUMMARY";
          state.turnFinishedReason = "BOMB_HIT";
          state.potPoints = 0;
          const oldScore = team.score || 0;
          const newScore = Math.max(0, oldScore - penalty);
          state.storyResult = {
            teamId: team.id,
            teamName: team.name,
            teamColor: team.color || "#ef4444",
            rewardText: `💥 Thất bại sau 3 lượt Vòng 2! Dính bom trừng phạt, bị trừ ${penalty} điểm!`,
            scoreDelta: -penalty,
            oldScore,
            newScore,
          };
          return { updatedState: { ...state, tiles: [...state.tiles], memoryPairsState: { ...memState } }, isBomb: true, scorePenalty: penalty, finalScoreDelta: -penalty, shouldResetMismatchedCards: true };
        }
      }

      state.memoryPairsState = { ...memState };
      return { updatedState: { ...state, tiles: [...state.tiles], memoryPairsState: { ...memState } }, isBomb: false, scorePenalty: 0, shouldResetMismatchedCards: true };
    }

    // TH 2.5: Cả 2 lá đều là lá thường (không dính bom)
    memState.attemptsUsed += 1;
    const isMatch = Boolean(firstTile && firstTile.pairKey && firstTile.pairKey === tile.pairKey);

    if (isMatch && firstTile) {
      // MATCH FOUND!
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

      state.phase = "TURN_SUMMARY";
      state.turnFinishedReason = "PAIR_MATCHED";
      state.potPoints = 0;

      const oldScore = team.score || 0;
      const newScore = oldScore + finalDelta;
      const baseReward = finalDelta - extraPotBonus;

      const rewardText = extraPotBonus > 0
        ? `🎉 Ghép thành công ${firstTile.storyTitle}! Nhận trọn vẹn +${baseReward}đ và +${extraPotBonus}đ từ Quỹ thưởng (Tổng +${finalDelta} điểm)!`
        : `🎉 Ghép thành công ${firstTile.storyTitle}! Nhận trọn vẹn +${finalDelta} điểm!`;

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
          state.memoryPairsState = { ...memState };
          const penalty = state.baseQuestionPoints || 10;
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
              rewardText: `🛡️ KHIÊN THẦN ĐÃ BẢO VỆ BẠN! Vụ nổ trừng phạt vòng 2 đã bị chặn đứng an toàn, nhận trọn vẹn +${basePoints}đ câu hỏi gốc!`,
              scoreDelta: basePoints,
              oldScore,
              newScore,
            };
            return { updatedState: { ...state, tiles: [...state.tiles], memoryPairsState: { ...memState } }, isBomb: false, scorePenalty: 0, finalScoreDelta: basePoints, shouldResetMismatchedCards: true };
          }
          state.bombExploded = {
            type: "MAJOR",
            title: "💣 KÍCH HOẠT BOM PHẠT DO THẤT BẠI VÒNG 2!",
            description: "Đã cạn 3 lượt lật Vòng 2 mà vẫn không tìm thấy cặp trùng nhau. Kích nổ bom trừng phạt!",
            penaltyText: `Bị trừ ${penalty} điểm từ tổng điểm.`,
          };
          state.phase = "TURN_SUMMARY";
          state.turnFinishedReason = "BOMB_HIT";
          state.potPoints = 0;
          const oldScore = team.score || 0;
          const newScore = Math.max(0, oldScore - penalty);
          state.storyResult = {
            teamId: team.id,
            teamName: team.name,
            teamColor: team.color || "#ef4444",
            rewardText: `💥 Thất bại sau 3 lượt Vòng 2! Dính bom trừng phạt, bị trừ ${penalty} điểm!`,
            scoreDelta: -penalty,
            oldScore,
            newScore,
          };
          return { updatedState: { ...state, tiles: [...state.tiles], memoryPairsState: { ...memState } }, isBomb: true, scorePenalty: penalty, finalScoreDelta: -penalty, shouldResetMismatchedCards: true };
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
      const finalDelta = (baseReward * multiplier) + extraPotBonus;

      state.potPoints = 0;
      state.phase = "TURN_SUMMARY";
      state.turnFinishedReason = "DOOR_CHOSEN";

      const oldScore = team.score || 0;
      const newScore = oldScore + finalDelta;

      const rewardText = extraPotBonus > 0
        ? `🎉 MỞ CỬA THÀNH CÔNG! ${tile.storyTitle} Nhận +${baseReward * multiplier}đ và +${extraPotBonus}đ Quỹ thưởng (Tổng +${finalDelta} điểm)!`
        : `🎉 MỞ CỬA THÀNH CÔNG! ${tile.storyTitle} Nhận trọn vẹn +${finalDelta} điểm thưởng!`;

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
      };
    }

    return { updatedState: state, isBomb: false, scorePenalty: 0 };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // VARIANT 4: TAROT_DESTINY (Rút 1 trong 5 lá bài Tarot thần số)
  // ═══════════════════════════════════════════════════════════════════════════
  if (normType === "TAROT_DESTINY") {
    const tile = state.tiles.find((t) => t.id === tileId);
    if (!tile || tile.isOpened) {
      return { updatedState: state, isBomb: false, scorePenalty: 0 };
    }

    const tState = state.tarotState || {};
    state.tarotState = tState;

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

      state.potPoints = 0;
      state.phase = "TURN_SUMMARY";
      state.turnFinishedReason = "TAROT_DRAWN";

      const oldScore = team.score || 0;
      const newScore = oldScore + finalDelta;
      const baseReward = finalDelta - extraPotBonus;

      const rewardText = extraPotBonus > 0
        ? `🔮 ${tile.storyTitle}! Nhận trọn vẹn +${baseReward}đ và +${extraPotBonus}đ từ Quỹ thưởng (Tổng +${finalDelta} điểm)!`
        : `🔮 ${tile.storyTitle}! Nhận trọn vẹn +${finalDelta} điểm!`;

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
      isDoublePromo: getPerkType(state.promoPerk) === "DOUBLE_PROMO",
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
    isDoublePromo: getPerkType(state.promoPerk) === "DOUBLE_PROMO",
    options: {
      currentRound: state.currentRound,
      teams: allTeams,
      currentTeamId: team.id,
    },
  });
  state.tiles.push(nextTopCard);

  // Cập nhật soi trước đỉnh chồng bài nếu có PEEK_PROMO
  if (getPerkType(state.promoPerk) === "PEEK_PROMO") {
    state.nextCardPeek = {
      icon: nextTopCard.icon,
      storyTitle: nextTopCard.storyTitle,
      isBomb: nextTopCard.type !== "REWARD",
    };
  }

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
  const finalScoreDelta = state.potPoints;
  const oldScore = team.score || 0;
  const newScore = oldScore + finalScoreDelta;

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

  state.phase = "TURN_SUMMARY";
  state.turnFinishedReason = "CASH_OUT";
  state.potPoints = 0; // Reset to 0 immediately upon cashing out!
  state.stolenPointsPot = 0;

  const rewardText = victimTeamName && stolenPoints
    ? `💰 Bảo toàn thành công! Nhận trọn vẹn +${finalScoreDelta} điểm (đã cướp ${stolenPoints}đ từ Đội ${victimTeamName} có giới hạn bảo vệ)!`
    : `💰 Bảo toàn thành công! Nhận trọn vẹn +${finalScoreDelta} điểm thưởng!`;

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

    const penalty = Math.abs(chosenTile.deltaPoints || state.baseQuestionPoints || 10);
    state.potPoints = 0;
    state.bombExploded = {
      type: "MAJOR",
      title: chosenTile.storyTitle,
      description: chosenTile.storyDescription,
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
      rewardText: `💥 Rủi ro bất thành! Mở trúng Cửa Bẫy Bom: Bị phạt trừ ${penalty} điểm!`,
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

    state.potPoints = 0;
    state.phase = "TURN_SUMMARY";
    state.turnFinishedReason = "DOOR_CHOSEN";

    const oldScore = team.score || 0;
    const newScore = oldScore + finalDelta;

    const rewardText = `🎉 ĐOÁN ĐÚNG XUẤT SẮC! Mở trúng cánh cửa an toàn #${chosenTile.id}: Nhận trọn vẹn +${finalDelta} điểm!`;

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

