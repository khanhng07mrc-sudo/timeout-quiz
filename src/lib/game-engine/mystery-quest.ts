import {
  MysteryQuestState,
  MysteryTheme,
  MysteryMiniGameType,
  MysteryTile,
  MysteryTileType,
  MysteryTileEffectType,
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

export const MYSTERY_MINIGAME_CYCLE: MysteryMiniGameType[] = [
  "MEMORY_PAIRS",
  "ONE_SHOT_DOORS",
  "PUSH_YOUR_LUCK",
  "TAROT_DESTINY",
];

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
function generateMemoryPairsTiles(): MysteryTile[] {
  interface PairDef {
    pairKey: string;
    icon: string;
    type: MysteryTileType;
    storyTitle: string;
    storyDescription: string;
    effectType: MysteryTileEffectType;
    deltaPoints: number;
  }

  const pairs: PairDef[] = [
    {
      pairKey: "PAIR_TREASURE",
      icon: "💎",
      type: "REWARD",
      storyTitle: "💎 CẶP KHO BÁU HOÀNG KIM!",
      storyDescription: "Tìm thấy cặp ngọc quý tương đồng: Nhận ngay +30 điểm thưởng!",
      effectType: "BONUS_POINTS",
      deltaPoints: 30,
    },
    {
      pairKey: "PAIR_STAR",
      icon: "⭐",
      type: "REWARD",
      storyTitle: "⭐ CẶP TINH TÚ DIỆU KỲ!",
      storyDescription: "Tìm thấy cặp sao may mắn: Nhận an toàn +20 điểm thưởng!",
      effectType: "BONUS_POINTS",
      deltaPoints: 20,
    },
    {
      pairKey: "PAIR_MULTIPLY",
      icon: "🚀",
      type: "REWARD",
      storyTitle: "🚀 CẶP ĐỘNG CƠ NHÂN ĐÔI!",
      storyDescription: "Kích hoạt năng lượng đột phá: Nhận nóng +40 điểm thưởng cực khủng!",
      effectType: "MULTIPLY_X2",
      deltaPoints: 40,
    },
    {
      pairKey: "PAIR_BOMB",
      icon: "💣",
      type: "BOMB_MAJOR",
      storyTitle: "💣 CẶP KÍP NỔ HẮC ÁM!",
      storyDescription: "Ghép trúng cặp kíp nổ liên hoàn: Kích nổ bom hắc ám, bị phạt trừ 15 điểm!",
      effectType: "LOSE_POINTS",
      deltaPoints: -15,
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
function generateOneShotDoorsTiles(): MysteryTile[] {
  interface DoorDef {
    icon: string;
    type: MysteryTileType;
    storyTitle: string;
    storyDescription: string;
    effectType: MysteryTileEffectType;
    deltaPoints: number;
  }

  const doors: DoorDef[] = [
    {
      icon: "👑",
      type: "REWARD",
      storyTitle: "👑 CỬA HOÀNG GIA ĐẠI THƯỞNG!",
      storyDescription: "Mở đúng cánh cửa vinh quang: Nhận ngay +40 điểm thưởng siêu cấp!",
      effectType: "BONUS_POINTS",
      deltaPoints: 40,
    },
    {
      icon: "🛡️",
      type: "REWARD",
      storyTitle: "🛡️ CỬA HỘ VỆ AN TOÀN!",
      storyDescription: "Cánh cửa phòng tuyến an toàn: Nhận an toàn +20 điểm thưởng!",
      effectType: "BONUS_POINTS",
      deltaPoints: 20,
    },
    {
      icon: "💥",
      type: "BOMB_MAJOR",
      storyTitle: "💥 CỬA BẪY BOM CÔNG PHÁ!",
      storyDescription: "Dính bẫy ngầm sau cánh cửa: Bom phát nổ, bị trừ 15 điểm từ tổng điểm!",
      effectType: "LOSE_POINTS",
      deltaPoints: -15,
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
function generateTarotDestinyTiles(): MysteryTile[] {
  interface TarotDef {
    tarotName: string;
    icon: string;
    type: MysteryTileType;
    storyTitle: string;
    storyDescription: string;
    effectType: MysteryTileEffectType;
    deltaPoints: number;
  }

  const tarotCards: TarotDef[] = [
    {
      tarotName: "Mặt Trời (The Sun)",
      icon: "☀️",
      type: "REWARD",
      storyTitle: "☀️ QUẺ BÀI MẶT TRỜI QUANG MINH",
      storyDescription: "Ánh dương thần thánh chiếu rọi: Đại hồng ân ban tặng +50 điểm thưởng!",
      effectType: "BONUS_POINTS",
      deltaPoints: 50,
    },
    {
      tarotName: "Hoàng Đế (The Emperor)",
      icon: "👑",
      type: "REWARD",
      storyTitle: "👑 QUẺ BÀI HOÀNG ĐẾ VƯƠNG QUYỀN",
      storyDescription: "Vương miện uy quyền tối thượng: Thưởng nóng +35 điểm danh dự!",
      effectType: "BONUS_POINTS",
      deltaPoints: 35,
    },
    {
      tarotName: "Kẻ Khờ (The Fool)",
      icon: "🃏",
      type: "REWARD",
      storyTitle: "🃏 QUẺ BÀI KẺ KHỜ PHI THƯỜNG",
      storyDescription: "Vận may bất ngờ của kẻ khờ: Đột phá nhân đôi năng lượng (+40đ)!",
      effectType: "BONUS_POINTS",
      deltaPoints: 40,
    },
    {
      tarotName: "Thần Chết (Death)",
      icon: "💀",
      type: "BOMB_MAJOR",
      storyTitle: "💀 QUẺ BÀI THẦN CHẾT ĐOẠT MỆNH",
      storyDescription: "Lưỡi hái định mệnh buông xuống: Bị phạt trừ 20 điểm từ tổng điểm!",
      effectType: "LOSE_POINTS",
      deltaPoints: -20,
    },
    {
      tarotName: "Hiệp Sĩ Đạo Tặc (The Knight)",
      icon: "🗡️",
      type: "REWARD",
      storyTitle: "🗡️ QUẺ BÀI HIỆP SĨ ĐỘT KÍCH",
      storyDescription: "Thanh gươm công lý cướp phá: Cướp thêm 25 điểm vào quỹ tổng!",
      effectType: "STEAL_POINTS",
      deltaPoints: 25,
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
 * Bomb types follow exact probabilities:
 * 1. Bom xóa toàn bộ điểm đã đạt ở câu hiện tại: 50%
 * 2. Bom làm mất một nửa số điểm đội đang có: 35%
 * 3. Bom tặng toàn bộ điểm đang có cho đội khác: 15%
 */
export function generateNextPushYourLuckCard({
  theme,
  drawIndex,
}: {
  theme: MysteryTheme;
  drawIndex: number;
}): MysteryTile {
  // Overall bomb chance per draw:
  // Draw 1: 15% (gives safety on initial draw while preserving thrill)
  // Draw 2: 20%
  // Draw 3: 25%
  // Draw 4+: 28%
  const bombChance = drawIndex === 1 ? 0.15 : drawIndex === 2 ? 0.20 : drawIndex === 3 ? 0.25 : 0.28;
  const isBomb = Math.random() < bombChance;

  const id = drawIndex;
  const label = `Lá #${drawIndex}`;

  if (isBomb) {
    const bombKindRand = Math.random();

    if (bombKindRand < 0.50) {
      // LOẠI 1 (50%): Bom trừ toàn bộ điểm đã đạt ở câu hiện tại
      return {
        id,
        label,
        icon: "💣",
        isOpened: false,
        type: "BOMB_MINOR",
        storyTitle: "💣 TIỂU BOM NỔ TUNG!",
        storyDescription: "Dẫm phải kíp nổ: Mất toàn bộ số điểm tích lũy ở câu hiện tại (0 điểm nhận được)!",
        effectType: "LOSE_POINTS",
        deltaPoints: 0,
      };
    } else if (bombKindRand < 0.85) {
      // LOẠI 2 (35%): Bom làm mất một nửa số điểm đội đang có
      return {
        id,
        label,
        icon: "💀",
        isOpened: false,
        type: "BOMB_DOOM",
        storyTitle: "💀 ĐẠI BOM CHÉM ĐÔI TỔNG ĐIỂM!",
        storyDescription: "Đánh thức bom hủy diệt: Mất toàn bộ điểm câu này VÀ BỊ CHIA ĐÔI (-50%) tổng điểm đội đang có!",
        effectType: "DIVIDE_HALF",
        deltaPoints: 0,
      };
    } else {
      // LOẠI 3 (15%): Bom trừ nửa số điểm của đội, và bạn phải tặng số điểm đó cho một đội khác
      return {
        id,
        label,
        icon: "🎁",
        isOpened: false,
        type: "BOMB_GIFT",
        storyTitle: "🎁 BOM CHUYỂN GIAO NỬA ĐIỂM!",
        storyDescription: "Dẫm phải bom chuyển giao: Bị trừ một nửa số điểm đội đang có, và bạn phải trao tặng số điểm đó cho một đội khác!",
        effectType: "GIFT_POINTS",
        deltaPoints: 0,
      };
    }
  }

  // Safe Reward Card from Theme
  const themeRewards = REWARD_TEMPLATES[theme] || REWARD_TEMPLATES.CASTLE;
  const template = themeRewards[Math.floor(Math.random() * themeRewards.length)];
  return {
    id,
    label,
    icon: template.effectType === "MULTIPLY_X2" ? "🚀" : template.effectType === "STEAL_POINTS" ? "🎭" : "💎",
    isOpened: false,
    type: "REWARD",
    storyTitle: template.storyTitle,
    storyDescription: template.storyDescription,
    effectType: template.effectType,
    deltaPoints: template.deltaPoints,
  };
}

/**
 * Generates initial tiles for Variant 3: PUSH_YOUR_LUCK (Endless Stacked Deck).
 * Starts with Card #1 face-down on top of the deck!
 */
function generatePushYourLuckTiles(theme: MysteryTheme): MysteryTile[] {
  const firstCard = generateNextPushYourLuckCard({ theme, drawIndex: 1 });
  return [firstCard];
}

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
 * Generates a full Mystery Quest turn state for the active team.
 */
export function generateMysteryStageForTurn({
  turnIndex,
  currentTeam,
  teams,
  turnsPerTeam = 2,
  prevTheme,
  forcedMiniGameType,
}: {
  turnIndex: number;
  currentTeam: MysteryTeamRef;
  teams: MysteryTeamRef[];
  turnsPerTeam?: number;
  prevTheme?: MysteryTheme;
  forcedMiniGameType?: MysteryMiniGameType;
}): MysteryQuestState {
  const availableThemes = prevTheme ? THEME_KEYS.filter((t) => t !== prevTheme) : THEME_KEYS;
  const theme = availableThemes[Math.floor(Math.random() * availableThemes.length)];
  const themeMeta = MYSTERY_THEMES[theme];

  // Rotate through the 4 variants if not forced:
  const miniGameType = forcedMiniGameType
    ? normalizeMiniGameType(forcedMiniGameType)
    : MYSTERY_MINIGAME_CYCLE[turnIndex % MYSTERY_MINIGAME_CYCLE.length];

  const currentRound = Math.floor(turnIndex / teams.length) + 1;
  const totalTurns = teams.length * turnsPerTeam;

  let tiles: MysteryTile[] = [];
  let memoryPairsState: MysteryQuestState["memoryPairsState"] = undefined;
  let oneShotState: MysteryQuestState["oneShotState"] = undefined;
  let tarotState: MysteryQuestState["tarotState"] = undefined;

  switch (miniGameType) {
    case "MEMORY_PAIRS":
      tiles = generateMemoryPairsTiles();
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
      tiles = generateOneShotDoorsTiles();
      oneShotState = {
        chosenTileId: undefined,
        allRevealed: false,
      };
      break;

    case "TAROT_DESTINY":
      tiles = generateTarotDestinyTiles();
      tarotState = {
        chosenCardId: undefined,
      };
      break;

    case "PUSH_YOUR_LUCK":
    default:
      tiles = generatePushYourLuckTiles(theme);
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
        penalty = 15;
        state.bombExploded = {
          type: "MAJOR",
          title: firstTile.storyTitle,
          description: firstTile.storyDescription,
          penaltyText: "Dính cặp kíp nổ hắc ám! Bị trừ 15 điểm từ tổng điểm.",
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
          rewardText: `💥 Dính cặp bom nổ! Bị phạt trừ 15 điểm!`,
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
      penalty = 15;
      state.potPoints = 0;
      state.bombExploded = {
        type: "MAJOR",
        title: tile.storyTitle,
        description: tile.storyDescription,
        penaltyText: "Cửa bẫy nổ! Bị trừ 15 điểm từ tổng điểm.",
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
      penalty = 20;
      state.potPoints = 0;
      state.bombExploded = {
        type: "MAJOR",
        title: tile.storyTitle,
        description: tile.storyDescription,
        penaltyText: "Quẻ bài Thần Chết! Bị phạt trừ 20 điểm từ tổng điểm.",
      };
      state.phase = "TURN_SUMMARY";
      state.turnFinishedReason = "BOMB_HIT";

      const oldScore = team.score || 0;
      const newScore = Math.max(0, oldScore - penalty);

      state.storyResult = {
        teamId: team.id,
        teamName: team.name,
        teamColor: team.color || "#ef4444",
        rewardText: `💀 Quẻ bài Thần Chết xuất hiện! Bị phạt trừ 20 điểm!`,
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
    });
    state.tiles.push(tile);
  }

  tile.isOpened = true;
  state.lastFlippedTile = tile;
  state.cardsFlippedCount++;

  if (tile.type !== "REWARD") {
    // ─── 3 LOẠI BOM THEO QUY TẮC CHÍNH XÁC CỦA NGƯỜI DÙNG: ───
    let penalty = 0;
    let penaltyText = "";
    let recipientTeamId: string | undefined = undefined;
    let recipientTeamName: string | undefined = undefined;
    let giftedPoints = 0;

    if (tile.type === "BOMB_MINOR") {
      // 1. Bom có khả năng trừ toàn bộ số điểm đã đạt ở câu hiện tại (50%)
      penalty = 0;
      penaltyText = "Mất sạch toàn bộ số điểm tích lũy ở câu hiện tại (0 điểm nhận được). Tổng điểm giữ nguyên.";
      state.bombExploded = {
        type: "MINOR",
        title: tile.storyTitle,
        description: tile.storyDescription,
        penaltyText,
      };
    } else if (tile.type === "BOMB_DOOM") {
      // 2. Bom làm mất một nửa số điểm đội đang có (35%)
      const currentScore = team.score || 0;
      penalty = Math.floor(currentScore / 2);
      penaltyText = `Mất điểm câu này và bị CHIA ĐÔI (-50%) tổng điểm đội đang có (-${penalty}đ).`;
      state.bombExploded = {
        type: "DOOM",
        title: tile.storyTitle,
        description: tile.storyDescription,
        penaltyText,
      };
    } else if (tile.type === "BOMB_GIFT") {
      // 3. Bom trừ nửa số điểm của đội, và bạn phải tặng số điểm đó cho một đội khác (15%)
      const currentScore = team.score || 0;
      giftedPoints = Math.floor(currentScore / 2);
      penalty = giftedPoints;
      const otherTeams = allTeams.filter((t) => t.id !== team.id && !t.isEliminated);
      if (otherTeams.length > 0) {
        // Tặng cho đội có điểm thấp nhất (hoặc ngẫu nhiên)
        const sorted = [...otherTeams].sort((a, b) => (a.score || 0) - (b.score || 0));
        const chosenRecipient = sorted[0];
        recipientTeamId = chosenRecipient.id;
        recipientTeamName = chosenRecipient.name;
      }
      penaltyText = recipientTeamName
        ? `Bị trừ một nửa số điểm (-${giftedPoints}đ) và trao tặng số điểm đó cho Đội ${recipientTeamName}!`
        : `Bị trừ một nửa số điểm (-${giftedPoints}đ) và trao tặng cho đối thủ!`;

      state.bombExploded = {
        type: "GIFT",
        title: tile.storyTitle,
        description: tile.storyDescription,
        penaltyText,
        recipientTeamId,
        recipientTeamName,
        giftedPoints,
      };
    }

    state.potPoints = 0;
    state.phase = "TURN_SUMMARY";
    state.turnFinishedReason = "BOMB_HIT";

    const oldScore = team.score || 0;
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
    };
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
