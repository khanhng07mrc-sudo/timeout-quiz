import {
  MysteryQuestState,
  MysteryTheme,
  MysteryMiniGameType,
  MysteryTile,
  MysteryTileType,
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
const MINI_GAME_TYPES: MysteryMiniGameType[] = ["DOORS", "CHESTS", "TAROT_CARDS", "RADAR_WINDOWS"];

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

function getTileLabelAndIcon(miniGameType: MysteryMiniGameType, index: number): { label: string; icon: string } {
  switch (miniGameType) {
    case "DOORS":
      return { label: `Cửa #${index + 1}`, icon: "🚪" };
    case "CHESTS":
      return { label: `Rương #${index + 1}`, icon: "🪙" };
    case "TAROT_CARDS":
      return { label: `Thẻ #${index + 1}`, icon: "🃏" };
    case "RADAR_WINDOWS":
      return { label: `Radar #${index + 1}`, icon: "📡" };
  }
}

export interface MysteryTeamRef {
  id: string;
  name: string;
  color?: string;
  score?: number;
  isEliminated?: boolean;
}

/**
 * Generates a full Mystery Quest turn state for the active team with Push-your-luck bombs.
 */
export function generateMysteryStageForTurn({
  turnIndex,
  currentTeam,
  teams,
  turnsPerTeam = 2,
  prevTheme,
}: {
  turnIndex: number;
  currentTeam: MysteryTeamRef;
  teams: MysteryTeamRef[];
  turnsPerTeam?: number;
  prevTheme?: MysteryTheme;
}): MysteryQuestState {
  const availableThemes = prevTheme ? THEME_KEYS.filter((t) => t !== prevTheme) : THEME_KEYS;
  const theme = availableThemes[Math.floor(Math.random() * availableThemes.length)];
  const themeMeta = MYSTERY_THEMES[theme];

  const miniGameType = MINI_GAME_TYPES[Math.floor(Math.random() * MINI_GAME_TYPES.length)];
  const isLongGame = turnsPerTeam >= 3 || (teams.length * turnsPerTeam) >= 12;
  const totalTilesCount = isLongGame ? 16 : 9;

  const currentRound = Math.floor(turnIndex / teams.length) + 1;

  // Plan tile types:
  // - 1x BOMB_MINOR (Tiểu Bom 💣): Nổ mất quỹ câu này
  // - 1x BOMB_MAJOR (Đại Bom 💥): Nổ mất quỹ câu này + phạt trừ 20đ tổng điểm
  // - (Nếu Round >= 2): Có 50% cơ hội có 1x BOMB_DOOM (Bom Hủy Diệt 💀): Mất quỹ + chia đôi tổng điểm!
  // - Các ô còn lại: REWARDS
  const tileTypes: MysteryTileType[] = ["BOMB_MINOR", "BOMB_MAJOR"];
  if (currentRound >= 2 && Math.random() < 0.5) {
    tileTypes.push("BOMB_DOOM");
  }

  while (tileTypes.length < totalTilesCount) {
    tileTypes.push("REWARD");
  }

  // Shuffle tile types across slots
  const shuffledTypes = [...tileTypes].sort(() => Math.random() - 0.5);
  const themeRewards = [...REWARD_TEMPLATES[theme]].sort(() => Math.random() - 0.5);

  let rewardCursor = 0;
  const tiles: MysteryTile[] = [];

  for (let i = 0; i < totalTilesCount; i++) {
    const type = shuffledTypes[i];
    const { label, icon } = getTileLabelAndIcon(miniGameType, i);

    if (type === "BOMB_MINOR") {
      tiles.push({
        id: i + 1,
        label,
        icon,
        isOpened: false,
        type: "BOMB_MINOR",
        storyTitle: "💣 TIỂU BOM NỔ TUNG!",
        storyDescription: "Dẫm phải kíp nổ mini: Toàn bộ điểm tích lũy trong lượt này tan biến thành mây khói!",
        effectType: "LOSE_POINTS",
        deltaPoints: 0,
      });
    } else if (type === "BOMB_MAJOR") {
      tiles.push({
        id: i + 1,
        label,
        icon,
        isOpened: false,
        type: "BOMB_MAJOR",
        storyTitle: "💥 ĐẠI BOM CÔNG PHÁ!",
        storyDescription: "Thùng thuốc súng đại bác phát nổ dữ dội: Mất trắng điểm lượt này VÀ bị phạt trừ 20 điểm từ tổng điểm!",
        effectType: "LOSE_POINTS",
        deltaPoints: -20,
      });
    } else if (type === "BOMB_DOOM") {
      tiles.push({
        id: i + 1,
        label,
        icon,
        isOpened: false,
        type: "BOMB_DOOM",
        storyTitle: "💀 BOM HỦY DIỆT Ô SỐ PHẬN!",
        storyDescription: "Đánh thức bom nguyên tử cổ xưa: Mất toàn bộ điểm câu này VÀ CHIA ĐÔI (/2) tổng điểm của cả trận!",
        effectType: "DIVIDE_HALF",
        deltaPoints: 0,
      });
    } else {
      const rew = themeRewards[rewardCursor % themeRewards.length];
      rewardCursor++;
      tiles.push({
        id: i + 1,
        label,
        icon,
        isOpened: false,
        type: "REWARD",
        storyTitle: rew.storyTitle,
        storyDescription: rew.storyDescription,
        effectType: rew.effectType,
        deltaPoints: rew.deltaPoints,
      });
    }
  }

  const totalTurns = teams.length * turnsPerTeam;

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
  };
}

/**
 * Handles flipping a single card in Push-Your-Luck mode.
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
} {
  const tile = state.tiles.find((t) => t.id === tileId);
  if (!tile || tile.isOpened) {
    return { updatedState: state, isBomb: false, scorePenalty: 0 };
  }

  tile.isOpened = true;
  state.lastFlippedTile = tile;
  state.cardsFlippedCount++;

  // ── Case 1: Bomb Hit! ──────────────────────────────────────────────────────
  if (tile.type !== "REWARD") {
    let penalty = 0;
    let penaltyText = "";

    if (tile.type === "BOMB_MINOR") {
      penalty = 0;
      penaltyText = "Mất sạch toàn bộ điểm tích lũy trong lượt này (0đ nhận được).";
    } else if (tile.type === "BOMB_MAJOR") {
      penalty = Math.min(team.score || 0, 20);
      penaltyText = `Mất điểm lượt này và bị phạt trừ ${penalty} điểm từ tổng điểm.`;
    } else if (tile.type === "BOMB_DOOM") {
      const halfScore = Math.floor((team.score || 0) / 2);
      penalty = halfScore;
      penaltyText = `Mất điểm lượt này và bị CHIA ĐÔI tổng điểm (-${halfScore}đ).`;
    }

    state.potPoints = 0;
    state.bombExploded = {
      type: tile.type === "BOMB_MINOR" ? "MINOR" : tile.type === "BOMB_MAJOR" ? "MAJOR" : "DOOM",
      title: tile.storyTitle,
      description: tile.storyDescription,
      penaltyText,
    };
    state.phase = "TURN_SUMMARY";
    state.turnFinishedReason = "BOMB_HIT";

    const oldScore = team.score || 0;
    const newScore = Math.max(0, oldScore - penalty);

    state.storyResult = {
      teamId: team.id,
      teamName: team.name,
      teamColor: team.color || "#ef4444",
      rewardText: `💥 Dính bom! ${penaltyText}`,
      scoreDelta: -penalty,
      oldScore,
      newScore,
    };

    return {
      updatedState: { ...state },
      isBomb: true,
      scorePenalty: penalty,
    };
  }

  // ── Case 2: Reward Card ───────────────────────────────────────────────────
  if (tile.effectType === "MULTIPLY_X2") {
    state.potMultiplier *= 2;
    state.potPoints = state.potPoints > 0 ? state.potPoints * 2 : 20;
  } else if (tile.effectType === "STEAL_POINTS") {
    // Steal from leader
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

  // Check if all non-bomb reward cards have been cleared (Jackpot Victory!)
  const remainingRewardTiles = state.tiles.filter((t) => !t.isOpened && t.type === "REWARD");
  if (remainingRewardTiles.length === 0) {
    // Auto-cashout jackpot!
    state.potPoints += 50; // +50 bonus for clearing all!
    state.phase = "TURN_SUMMARY";
    state.turnFinishedReason = "ALL_CLEARED";

    const oldScore = team.score || 0;
    const newScore = oldScore + state.potPoints;

    state.storyResult = {
      teamId: team.id,
      teamName: team.name,
      teamColor: team.color || "#ef4444",
      rewardText: `🏆 ĐẠI THẮNG QUÉT SẠCH BẢN ĐỒ! Thu hoạch trọn vẹn +${state.potPoints} điểm!`,
      scoreDelta: state.potPoints,
      oldScore,
      newScore,
    };
  }

  return {
    updatedState: { ...state },
    isBomb: false,
    scorePenalty: 0,
  };
}

/**
 * Handles cashing out (Dừng lại & Bảo toàn điểm).
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
