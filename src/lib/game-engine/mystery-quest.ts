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
export function generateMysteryPromoPerk(basePoints: number = 10): MysteryPromoPerk {
  const rand = Math.random();
  if (basePoints <= 10) {
    if (rand < 0.45) return "SHIELD_PROMO";
    if (rand < 0.80) return "EXTRA_POT_PROMO";
    return "DOUBLE_PROMO";
  } else if (basePoints <= 20) {
    if (rand < 0.35) return "SHIELD_PROMO";
    if (rand < 0.70) return "EXTRA_POT_PROMO";
    return "DOUBLE_PROMO";
  } else {
    if (rand < 0.25) return "SHIELD_PROMO";
    if (rand < 0.60) return "EXTRA_POT_PROMO";
    return "DOUBLE_PROMO";
  }
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

/**
 * Generates tiles specifically for Variant 1: MEMORY_PAIRS (8 tiles = 4 pairs).
 */
function generateMemoryPairsTiles(basePoints: number = 20): MysteryTile[] {
  interface PairDef {
    pairKey: string;
    icon: string;
    type: MysteryTileType;
    storyTitle: string;
    storyDescription: string;
    effectType: MysteryTileEffectType;
    deltaPoints: number;
  }

  const pBonusHigh = Math.max(15, Math.round((basePoints * 1.5) / 5) * 5);
  const pBonusMed = Math.max(10, basePoints);
  const pBonusTop = Math.max(20, basePoints * 2);
  const pPenalty = Math.max(5, Math.round((basePoints * 0.75) / 5) * 5);

  const pairs: PairDef[] = [
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
      pairKey: "PAIR_MULTIPLY",
      icon: "🚀",
      type: "REWARD",
      storyTitle: "🚀 CẶP ĐỘNG CƠ NHÂN ĐÔI!",
      storyDescription: `Kích hoạt năng lượng đột phá: Nhận nóng +${pBonusTop} điểm thưởng cực khủng!`,
      effectType: "MULTIPLY_X2",
      deltaPoints: pBonusTop,
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
    // Add 2 copies for each pair
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
function generateOneShotDoorsTiles(basePoints: number = 20): MysteryTile[] {
  interface DoorDef {
    icon: string;
    type: MysteryTileType;
    storyTitle: string;
    storyDescription: string;
    effectType: MysteryTileEffectType;
    deltaPoints: number;
  }

  const pHigh = Math.max(15, Math.round((basePoints * 1.5) / 5) * 5);
  const pMed = Math.max(10, basePoints);
  const pPenalty = Math.max(5, Math.round((basePoints * 0.75) / 5) * 5);

  const doors: DoorDef[] = [
    {
      icon: "👑",
      type: "REWARD",
      storyTitle: "👑 CỬA HOÀNG GIA ĐẠI THƯỞNG!",
      storyDescription: `Mở đúng cánh cửa vinh quang: Nhận ngay +${pHigh} điểm thưởng siêu cấp!`,
      effectType: "BONUS_POINTS",
      deltaPoints: pHigh,
    },
    {
      icon: "🛡️",
      type: "REWARD",
      storyTitle: "🛡️ CỬA HỘ VỆ AN TOÀN!",
      storyDescription: `Cánh cửa phòng tuyến an toàn: Nhận an toàn +${pMed} điểm thưởng!`,
      effectType: "BONUS_POINTS",
      deltaPoints: pMed,
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
function generateTarotDestinyTiles(basePoints: number = 20): MysteryTile[] {
  interface TarotDef {
    tarotName: string;
    icon: string;
    type: MysteryTileType;
    storyTitle: string;
    storyDescription: string;
    effectType: MysteryTileEffectType;
    deltaPoints: number;
  }

  const pSun = Math.max(20, basePoints * 2);
  const pEmperor = Math.max(15, Math.round((basePoints * 1.5) / 5) * 5);
  const pFool = Math.max(15, basePoints + 10);
  const pKnight = Math.max(10, basePoints);
  const pDeath = Math.max(5, basePoints);

  const tarotCards: TarotDef[] = [
    {
      tarotName: "Mặt Trời (The Sun)",
      icon: "☀️",
      type: "REWARD",
      storyTitle: "☀️ QUẺ BÀI MẶT TRỜI QUANG MINH",
      storyDescription: `Ánh dương thần thánh chiếu rọi: Đại hồng ân ban tặng +${pSun} điểm thưởng!`,
      effectType: "BONUS_POINTS",
      deltaPoints: pSun,
    },
    {
      tarotName: "Hoàng Đế (The Emperor)",
      icon: "👑",
      type: "REWARD",
      storyTitle: "👑 QUẺ BÀI HOÀNG ĐẾ VƯƠNG QUYỀN",
      storyDescription: `Vương miện uy quyền tối thượng: Thưởng nóng +${pEmperor} điểm danh dự!`,
      effectType: "BONUS_POINTS",
      deltaPoints: pEmperor,
    },
    {
      tarotName: "Kẻ Khờ (The Fool)",
      icon: "🃏",
      type: "REWARD",
      storyTitle: "🃏 QUẺ BÀI KẺ KHỜ PHI THƯỜNG",
      storyDescription: `Vận may bất ngờ của kẻ khờ: Đột phá nhân đôi năng lượng (+${pFool}đ)!`,
      effectType: "BONUS_POINTS",
      deltaPoints: pFool,
    },
    {
      tarotName: "Thần Chết (Death)",
      icon: "💀",
      type: "BOMB_MAJOR",
      storyTitle: "💀 QUẺ BÀI THẦN CHẾT ĐOẠT MỆNH",
      storyDescription: `Lưỡi hái định mệnh buông xuống: Bị phạt trừ ${pDeath} điểm từ tổng điểm!`,
      effectType: "LOSE_POINTS",
      deltaPoints: -pDeath,
    },
    {
      tarotName: "Hiệp Sĩ Đạo Tặc (The Knight)",
      icon: "🗡️",
      type: "REWARD",
      storyTitle: "🗡️ QUẺ BÀI HIỆP SĨ ĐỘT KÍCH",
      storyDescription: `Thanh gươm công lý cướp phá: Cướp thêm ${pKnight} điểm vào quỹ tổng!`,
      effectType: "STEAL_POINTS",
      deltaPoints: pKnight,
    },
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
}: {
  theme: MysteryTheme;
  drawIndex: number;
  basePoints?: number;
  teamScore?: number;
  isDoublePromo?: boolean;
}): MysteryTile {
  // Risk-reward bomb chance based on base question difficulty:
  let bombChance: number;
  if (basePoints <= 10) {
    // 10đ: Higher risk
    bombChance = drawIndex === 1 ? 0.30 : 0.35;
  } else if (basePoints <= 20) {
    // 20đ: Balanced
    bombChance = drawIndex === 1 ? 0.20 : 0.25;
  } else {
    // 30đ: High stakes, lower bomb risk to reward hard questions
    bombChance = drawIndex === 1 ? 0.15 : 0.20;
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

  // Not a bomb: 12% chance for a minor disadvantage or utility trap (TRAP)
  const isTrap = Math.random() < 0.12;
  if (isTrap) {
    if (Math.random() < 0.6) {
      // Trap 1: Hố Sâu Sụt Lún (-5đ / -10đ pot, does not blow up, player can continue to recover)
      const trapLoss = basePoints <= 10 ? 5 : 10;
      return {
        id,
        label,
        icon: "🕳️",
        isOpened: false,
        type: "TRAP",
        storyTitle: "🕳️ HỐ SÂU BẤT NGỜ!",
        storyDescription: `Địa hình sụt lún! Bị hao hụt -${trapLoss}đ trong quỹ điểm, nhưng bạn vẫn trụ vững và có thể rút tiếp để gỡ lại!`,
        effectType: "LOSE_POT_POINTS",
        deltaPoints: trapLoss,
      };
    } else {
      // Trap 2: Khóa Két An Toàn (Force Stop: safely cash out and end turn)
      return {
        id,
        label,
        icon: "🔒",
        isOpened: false,
        type: "TRAP",
        storyTitle: "🔒 KHÓA KÉT AN TOÀN!",
        storyDescription: "Hệ thống bảo an khẩn cấp kích hoạt! Tự động chốt và bảo toàn trọn vẹn điểm quỹ hiện tại, kết thúc lượt an toàn!",
        effectType: "FORCE_STOP",
        deltaPoints: 0,
      };
    }
  }

  // Safe Reward Card from Theme scaled to question tier
  const themeRewards = REWARD_TEMPLATES[theme] || REWARD_TEMPLATES.CASTLE;
  let template = themeRewards[Math.floor(Math.random() * themeRewards.length)];

  // Scale reward deltaPoints according to basePoints
  let delta = template.deltaPoints;
  if (template.effectType === "BONUS_POINTS" || template.effectType === "STEAL_POINTS") {
    if (basePoints <= 10) {
      // 10đ tier: +5đ, +10đ, +15đ, +20đ
      delta = [5, 10, 15, 20][Math.floor(Math.random() * 4)];
    } else if (basePoints <= 20) {
      // 20đ tier: +10đ, +15đ, +20đ, +30đ
      delta = [10, 15, 20, 30][Math.floor(Math.random() * 4)];
    } else {
      // 30đ tier: +15đ, +20đ, +30đ, +50đ
      delta = [15, 20, 30, 50][Math.floor(Math.random() * 4)];
    }
  }

  let effectType = template.effectType;
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
    storyDescription: template.storyDescription,
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
  isDoublePromo: boolean = false
): MysteryTile[] {
  const firstCard = generateNextPushYourLuckCard({
    theme,
    drawIndex: 1,
    basePoints,
    teamScore,
    isDoublePromo,
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

  // Completely random minigame ensuring two consecutive turns never have the same game
  const miniGameType = forcedMiniGameType
    ? normalizeMiniGameType(forcedMiniGameType)
    : getRandomMiniGame(prevMiniGameType);

  const promoPerk = generateMysteryPromoPerk(baseQuestionPoints);

  const currentRound = Math.floor(turnIndex / teams.length) + 1;
  const totalTurns = teams.length * turnsPerTeam;

  let tiles: MysteryTile[] = [];
  let memoryPairsState: MysteryQuestState["memoryPairsState"] = undefined;
  let oneShotState: MysteryQuestState["oneShotState"] = undefined;
  let tarotState: MysteryQuestState["tarotState"] = undefined;

  switch (miniGameType) {
    case "MEMORY_PAIRS":
      tiles = generateMemoryPairsTiles(baseQuestionPoints);
      memoryPairsState = {
        firstFlippedTileId: null,
        secondFlippedTileId: null,
        attemptsUsed: 0,
        maxAttempts: 5,
        matchedPairKey: null,
        isMismatchResolving: false,
      };
      break;

    case "ONE_SHOT_DOORS":
      tiles = generateOneShotDoorsTiles(baseQuestionPoints);
      oneShotState = {
        chosenTileId: undefined,
        allRevealed: false,
      };
      break;

    case "TAROT_DESTINY":
      tiles = generateTarotDestinyTiles(baseQuestionPoints);
      tarotState = {
        chosenCardId: undefined,
      };
      break;

    case "PUSH_YOUR_LUCK":
    default:
      tiles = generatePushYourLuckTiles(
        theme,
        baseQuestionPoints,
        currentTeam.score || 0,
        promoPerk === "DOUBLE_PROMO"
      );
      break;
  }

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
    potMultiplier: 1,
    cardsFlippedCount: 0,
    memoryPairsState,
    oneShotState,
    tarotState,
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
} {
  const normType = normalizeMiniGameType(state.miniGameType);

  // ═══════════════════════════════════════════════════════════════════════════
  // VARIANT 1: MEMORY_PAIRS (Lật cặp trùng nhau)
  // ═══════════════════════════════════════════════════════════════════════════
  if (normType === "MEMORY_PAIRS") {
    const memState = state.memoryPairsState || {
      firstFlippedTileId: null,
      secondFlippedTileId: null,
      attemptsUsed: 0,
      maxAttempts: 5,
      matchedPairKey: null,
      isMismatchResolving: false,
    };

    if (memState.isMismatchResolving) {
      return { updatedState: state, isBomb: false, scorePenalty: 0 };
    }

    const tile = state.tiles.find((t) => t.id === tileId);
    if (!tile || tile.isOpened) {
      return { updatedState: state, isBomb: false, scorePenalty: 0 };
    }

    // Step 1: Flip first card of the pair
    if (!memState.firstFlippedTileId) {
      tile.isOpened = true;
      memState.firstFlippedTileId = tile.id;
      state.memoryPairsState = { ...memState };
      state.lastFlippedTile = tile;
      return { updatedState: state, isBomb: false, scorePenalty: 0 };
    }

    // Step 2: Flip second card of the pair
    if (memState.firstFlippedTileId === tile.id) {
      return { updatedState: state, isBomb: false, scorePenalty: 0 };
    }

    tile.isOpened = true;
    memState.secondFlippedTileId = tile.id;
    memState.attemptsUsed += 1;
    state.lastFlippedTile = tile;

    const firstTile = state.tiles.find((t) => t.id === memState.firstFlippedTileId);
    const isMatch = firstTile && firstTile.pairKey === tile.pairKey;

    if (isMatch && firstTile) {
      // MATCH FOUND! Apply effect of the first matched pair and finish minigame immediately!
      memState.matchedPairKey = firstTile.pairKey;
      state.memoryPairsState = { ...memState };

      const isBomb = firstTile.type !== "REWARD";
      let penalty = 0;
      let finalDelta = 0;

      if (isBomb) {
        // Shield Protection Check:
        if (state.hasShield) {
          state.hasShield = false;
          state.phase = "TURN_SUMMARY";
          state.turnFinishedReason = "PAIR_MATCHED";
          state.potPoints = 0;
          state.storyResult = {
            teamId: team.id,
            teamName: team.name,
            teamColor: team.color || "#ef4444",
            rewardText: `🛡️ KHIÊN THẦN ĐÃ HẤP THỤ VỤ NỔ! Cặp kíp nổ đã bị vô hiệu hóa an toàn, không bị trừ điểm nào!`,
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

        penalty = Math.abs(firstTile.deltaPoints || 15);
        state.bombExploded = {
          type: "MAJOR",
          title: firstTile.storyTitle,
          description: firstTile.storyDescription,
          penaltyText: `Dính cặp kíp nổ hắc ám! Bị trừ ${penalty} điểm từ tổng điểm.`,
        };
        state.phase = "TURN_SUMMARY";
        state.turnFinishedReason = "BOMB_HIT";
        state.potPoints = 0;
        finalDelta = -penalty;

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

        return {
          updatedState: { ...state },
          isBomb: true,
          scorePenalty: penalty,
          finalScoreDelta: -penalty,
        };
      } else {
        // Safe match
        finalDelta = firstTile.deltaPoints || 30;
        state.phase = "TURN_SUMMARY";
        state.turnFinishedReason = "PAIR_MATCHED";
        state.potPoints = 0; // Cleared as it's directly awarded

        const oldScore = team.score || 0;
        const newScore = oldScore + finalDelta;

        state.storyResult = {
          teamId: team.id,
          teamName: team.name,
          teamColor: team.color || "#ef4444",
          rewardText: `🎉 Ghép thành công ${firstTile.storyTitle}! Nhận trọn vẹn +${finalDelta} điểm!`,
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
    } else {
      // MISMATCH: Mark mismatch resolving
      memState.isMismatchResolving = true;
      state.memoryPairsState = { ...memState };

      if (memState.attemptsUsed >= memState.maxAttempts) {
        // Max attempts exhausted!
        state.phase = "TURN_SUMMARY";
        state.turnFinishedReason = "MAX_ATTEMPTS";
        state.potPoints = 0;

        const oldScore = team.score || 0;
        state.storyResult = {
          teamId: team.id,
          teamName: team.name,
          teamColor: team.color || "#ef4444",
          rewardText: `⚠️ Đã hết ${memState.maxAttempts} lượt lật mà chưa tìm thấy cặp trùng nhau. Lượt kết thúc với 0 điểm.`,
          scoreDelta: 0,
          oldScore,
          newScore: oldScore,
        };
      }

      return {
        updatedState: { ...state },
        isBomb: false,
        scorePenalty: 0,
        shouldResetMismatchedCards: true,
      };
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // VARIANT 2: ONE_SHOT_DOORS (Chọn 1 trong 3 cánh cửa)
  // ═══════════════════════════════════════════════════════════════════════════
  if (normType === "ONE_SHOT_DOORS") {
    const tile = state.tiles.find((t) => t.id === tileId);
    if (!tile || tile.isOpened) {
      return { updatedState: state, isBomb: false, scorePenalty: 0 };
    }

    // Reveal chosen door AND simultaneously open the remaining doors for drama!
    state.tiles.forEach((t) => {
      t.isOpened = true;
    });

    state.oneShotState = {
      chosenTileId: tileId,
      allRevealed: true,
    };
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
        state.turnFinishedReason = "DOOR_CHOSEN";
        state.storyResult = {
          teamId: team.id,
          teamName: team.name,
          teamColor: team.color || "#ef4444",
          rewardText: `🛡️ KHIÊN THẦN ĐÃ BẢO VỆ BẠN! Cửa bẫy bom bị chặn đứng, không bị trừ bất kỳ điểm nào!`,
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

      penalty = Math.abs(tile.deltaPoints || 15);
      state.potPoints = 0;
      state.bombExploded = {
        type: "MAJOR",
        title: tile.storyTitle,
        description: tile.storyDescription,
        penaltyText: `Cửa bẫy nổ! Bị trừ ${penalty} điểm từ tổng điểm.`,
      };
      state.phase = "TURN_SUMMARY";
      state.turnFinishedReason = "BOMB_HIT";

      const oldScore = team.score || 0;
      const newScore = Math.max(0, oldScore - penalty);

      state.storyResult = {
        teamId: team.id,
        teamName: team.name,
        teamColor: team.color || "#ef4444",
        rewardText: `💥 Mở trúng Cửa Bẫy! ${tile.storyDescription}`,
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
      finalDelta = tile.deltaPoints || 25;
      state.potPoints = 0;
      state.phase = "TURN_SUMMARY";
      state.turnFinishedReason = "DOOR_CHOSEN";

      const oldScore = team.score || 0;
      const newScore = oldScore + finalDelta;

      state.storyResult = {
        teamId: team.id,
        teamName: team.name,
        teamColor: team.color || "#ef4444",
        rewardText: `🚪 ${tile.storyTitle}! Nhận trọn vẹn +${finalDelta} điểm!`,
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
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // VARIANT 4: TAROT_DESTINY (Rút 1 trong 5 lá bài Tarot thần số)
  // ═══════════════════════════════════════════════════════════════════════════
  if (normType === "TAROT_DESTINY") {
    const tile = state.tiles.find((t) => t.id === tileId);
    if (!tile || tile.isOpened) {
      return { updatedState: state, isBomb: false, scorePenalty: 0 };
    }

    // Reveal drawn card and reveal the other 4 cards
    state.tiles.forEach((t) => {
      t.isOpened = true;
    });

    state.tarotState = { chosenCardId: tileId };
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
        state.storyResult = {
          teamId: team.id,
          teamName: team.name,
          teamColor: team.color || "#ef4444",
          rewardText: `🛡️ KHIÊN THẦN ĐẨY LÙI THẦN CHẾT! Bạn an toàn thoát hiểm và không bị trừ điểm!`,
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
      finalDelta = tile.deltaPoints || 35;
      state.potPoints = 0;
      state.phase = "TURN_SUMMARY";
      state.turnFinishedReason = "TAROT_DRAWN";

      const oldScore = team.score || 0;
      const newScore = oldScore + finalDelta;

      state.storyResult = {
        teamId: team.id,
        teamName: team.name,
        teamColor: team.color || "#ef4444",
        rewardText: `🔮 ${tile.storyTitle}! Nhận trọn vẹn +${finalDelta} điểm!`,
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
    // Shield Protection Check:
    if (state.hasShield) {
      state.hasShield = false; // consume shield
      state.storyResult = {
        teamId: team.id,
        teamName: team.name,
        teamColor: team.color || "#ef4444",
        rewardText: `🛡️ KHIÊN THẦN ĐÃ HẤP THỤ VỤ NỔ! Quả bom ${tile.storyTitle} bị vô hiệu hóa hoàn toàn! Điểm quỹ ${state.potPoints}đ được giữ nguyên và bạn tiếp tục chơi!`,
        scoreDelta: 0,
        oldScore: team.score || 0,
        newScore: team.score || 0,
      };

      // Draw next card on top of stack
      const nextTopCard = generateNextPushYourLuckCard({
        theme: state.theme,
        drawIndex: state.cardsFlippedCount + 1,
        basePoints: state.baseQuestionPoints || 10,
        teamScore: team.score || 0,
        isDoublePromo: getPerkType(state.promoPerk) === "DOUBLE_PROMO",
      });
      state.tiles.push(nextTopCard);

      return {
        updatedState: { ...state },
        isBomb: false,
        scorePenalty: 0,
      };
    }

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
        // Điểm hiện có nhỏ hơn 5 * X: Trừ toàn bộ điểm, chia cho những đội điểm thấp nhất mỗi đội 5đ
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
        // Điểm >= 5 * X: Mất số điểm ngẫu nhiên chia hết cho (X - 1), mỗi đội còn lại nhận điểm như nhau (bội số 5)
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

    state.potPoints = 0;
    state.phase = "TURN_SUMMARY";
    state.turnFinishedReason = "BOMB_HIT";

    const oldScore = currentScore;
    const newScore = Math.max(0, oldScore - penalty);

    state.storyResult = {
      teamId: team.id,
      teamName: team.name,
      teamColor: team.color || "#ef4444",
      rewardText: `💥 ${tile.storyTitle} ${penaltyText}`,
      scoreDelta: -penalty,
      oldScore,
      newScore,
    };

    return {
      updatedState: { ...state },
      isBomb: true,
      scorePenalty: penalty,
      finalScoreDelta: -penalty,
      recipientTeamId,
      giftedPoints,
      darkBombRecipients,
    };
  }

  // Handle Traps (TRAP)
  if (tile.type === "TRAP") {
    if (tile.effectType === "LOSE_POT_POINTS") {
      const lost = tile.deltaPoints || 5;
      state.potPoints = Math.max(0, state.potPoints - lost);
      state.storyResult = {
        teamId: team.id,
        teamName: team.name,
        teamColor: team.color || "#ef4444",
        rewardText: `🕳️ Sụt lún Hố Sâu! Quỹ điểm bị giảm -${lost}đ (còn ${state.potPoints}đ). Bạn vẫn an toàn tiếp tục hành trình!`,
        scoreDelta: 0,
        oldScore: team.score || 0,
        newScore: team.score || 0,
      };

      const nextTopCard = generateNextPushYourLuckCard({
        theme: state.theme,
        drawIndex: state.cardsFlippedCount + 1,
        basePoints: state.baseQuestionPoints || 10,
        teamScore: team.score || 0,
        isDoublePromo: getPerkType(state.promoPerk) === "DOUBLE_PROMO",
      });
      state.tiles.push(nextTopCard);

      return {
        updatedState: { ...state },
        isBomb: false,
        scorePenalty: 0,
      };
    } else if (tile.effectType === "FORCE_STOP") {
      // Force Stop safely cashes out current pot!
      const finalScoreDelta = state.potPoints;
      const oldScore = team.score || 0;
      const newScore = oldScore + finalScoreDelta;

      state.phase = "TURN_SUMMARY";
      state.turnFinishedReason = "FORCE_STOP";
      state.potPoints = 0;

      state.storyResult = {
        teamId: team.id,
        teamName: team.name,
        teamColor: team.color || "#ef4444",
        rewardText: `🔒 Khóa Két An Toàn! Đã tự động chốt và bảo toàn trọn vẹn +${finalScoreDelta} điểm về tổng điểm!`,
        scoreDelta: finalScoreDelta,
        oldScore,
        newScore,
      };

      return {
        updatedState: { ...state },
        isBomb: false,
        scorePenalty: 0,
        finalScoreDelta,
      };
    }
  }

  // Safe Reward Card
  if (tile.effectType === "MULTIPLY_X2") {
    state.potMultiplier *= 2;
    state.potPoints = state.potPoints > 0 ? state.potPoints * 2 : 20;
  } else if (tile.effectType === "STEAL_POINTS") {
    const otherTeams = allTeams.filter((t) => t.id !== team.id && !t.isEliminated);
    if (otherTeams.length > 0) {
      const sorted = [...otherTeams].sort((a, b) => (b.score || 0) - (a.score || 0));
      const leader = sorted[0];
      const stealAmt = Math.min(leader.score || 0, tile.deltaPoints || 20);
      state.potPoints += (stealAmt > 0 ? stealAmt : 15) * state.potMultiplier;
    } else {
      state.potPoints += (tile.deltaPoints || 20) * state.potMultiplier;
    }
  } else {
    state.potPoints += (tile.deltaPoints || 15) * state.potMultiplier;
  }

  // Chồng bài vô hạn: Tự động sinh lá bài tiếp theo úp mặt trên đỉnh chồng bài sẵn sàng rút tiếp!
  const nextTopCard = generateNextPushYourLuckCard({
    theme: state.theme,
    drawIndex: state.cardsFlippedCount + 1,
    basePoints: state.baseQuestionPoints || 10,
    teamScore: team.score || 0,
    isDoublePromo: getPerkType(state.promoPerk) === "DOUBLE_PROMO",
  });
  state.tiles.push(nextTopCard);

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
}: {
  state: MysteryQuestState;
  team: MysteryTeamRef;
}): {
  updatedState: MysteryQuestState;
  finalScoreDelta: number;
} {
  const finalScoreDelta = state.potPoints;
  const oldScore = team.score || 0;
  const newScore = oldScore + finalScoreDelta;

  state.phase = "TURN_SUMMARY";
  state.turnFinishedReason = "CASH_OUT";
  state.potPoints = 0; // Reset to 0 immediately upon cashing out!

  state.storyResult = {
    teamId: team.id,
    teamName: team.name,
    teamColor: team.color || "#ef4444",
    rewardText: `💰 Bảo toàn thành công! Nhận trọn vẹn +${finalScoreDelta} điểm thưởng!`,
    scoreDelta: finalScoreDelta,
    oldScore,
    newScore,
  };

  return {
    updatedState: { ...state },
    finalScoreDelta,
  };
}
