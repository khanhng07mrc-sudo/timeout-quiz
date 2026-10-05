import { GameConfig, GameMode } from "@/types";

export interface ScoringContext {
  basePoints: number;
  timeSpent: number; // ms
  timeLimit: number; // seconds
  isCorrect: boolean;
  config: GameConfig;
  streak?: number; // Current correct streak count
  roomAccuracy?: number; // Tỷ lệ đúng của toàn phòng (0 - 1)
  topHalfCorrect?: number;
  topHalfTotal?: number;
  bottomHalfCorrect?: number;
  bottomHalfTotal?: number;
  totalParticipants?: number;
  multiplier?: number; // from DOUBLE or SCORE_X2 card
  shielded?: boolean; // from SHIELD card
  penaltyMultiplier?: number; // from PENALTY card
  mode?: GameMode;
  hasRiskPowerup?: boolean; // When true, answering wrong carries a penalty in CLASSIC / ELIMINATION
}

export interface DetailedPointsResult {
  points: number;
  basePoints: number;
  speedPoints: number;
  streakPoints: number;
  rarityPoints: number;
  effectiveDifficulty?: number;
  discrimination?: number;
}

export interface ItemIRTMetrics {
  bPrior: number;
  bEmpirical: number;
  bEffective: number;
  discrimination: number;
  bonusRate: number;
}

/**
 * Ước lượng độ khó hiệu dụng b_eff và độ phân biệt a theo mô hình IRT thực nghiệm:
 * - Prior: Dễ (b=-0.8), Trung bình (b=0.0), Khó (b=+1.0)
 * - Logit phòng: b_emp = ln((1 - P_room + 0.05)/(P_room + 0.05))
 * - Bayesian shrinkage weight: w = N / (N + 4)
 * - Discrimination index a: so sánh tỷ lệ đúng nhóm nửa trên và nửa dưới bảng xếp hạng
 * - Dynamic bonus: thưởng độ khó và phân hóa (tối đa +50% điểm gốc)
 */
export function calculateItemIRTMetrics(params: {
  rawPoints: number;
  roomAccuracy: number;
  totalParticipants?: number;
  topHalfCorrect?: number;
  topHalfTotal?: number;
  bottomHalfCorrect?: number;
  bottomHalfTotal?: number;
}): ItemIRTMetrics {
  const { rawPoints, roomAccuracy } = params;
  const total = params.totalParticipants ?? 4;

  // 1. Prior b từ độ khó ban đầu
  let bPrior = 0.0;
  if (rawPoints <= 10) bPrior = -0.8;
  else if (rawPoints <= 20) bPrior = 0.0;
  else bPrior = 1.0;

  // 2. Logit thực nghiệm từ tỷ lệ đúng của phòng
  const pClamped = Math.max(0.02, Math.min(0.98, roomAccuracy));
  const bEmpirical = Math.max(-2.0, Math.min(2.0, Math.log((1 - pClamped) / pClamped)));

  // 3. Bayesian shrinkage
  const w = Math.min(0.85, total / (total + 4));
  const bEffective = Number((w * bEmpirical + (1 - w) * bPrior).toFixed(2));

  // 4. Độ phân biệt a (Discrimination index: P_top - P_bottom)
  let discrimination = 0;
  if (
    params.topHalfTotal &&
    params.topHalfTotal > 0 &&
    params.bottomHalfTotal &&
    params.bottomHalfTotal > 0
  ) {
    const pTop = (params.topHalfCorrect ?? 0) / params.topHalfTotal;
    const pBottom = (params.bottomHalfCorrect ?? 0) / params.bottomHalfTotal;
    discrimination = Number((pTop - pBottom).toFixed(2));
  } else {
    discrimination = Number((Math.max(0, bEffective) * 0.25).toFixed(2));
  }

  // 5. Thưởng phân hóa (ẩn dưới dạng Thưởng Phân Loại / Độ Khó)
  let bonusRate = 0;
  if (bEffective > 0) {
    bonusRate += Math.min(0.35, bEffective * 0.2);
  }
  if (discrimination > 0.15) {
    bonusRate += Math.min(0.15, discrimination * 0.2);
  }
  bonusRate = Math.min(0.50, Math.max(0, Number(bonusRate.toFixed(2))));

  return {
    bPrior,
    bEmpirical,
    bEffective,
    discrimination,
    bonusRate,
  };
}

/**
 * Chuẩn hóa điểm gốc theo chế độ chơi:
 * - Đối với CLASSIC & ELIMINATION: Thang điểm chuẩn Kahoot 1.000 - 2.000 điểm
 *   + Dễ (<= 10đ): 1.000 điểm
 *   + Trung bình (11 - 20đ): 1.500 điểm
 *   + Khó (> 20đ): 2.000 điểm
 * - Đối với các mode khác (BOUNCEBACK, GRID_CARO, DICE_RACE, BUZZ, WAGER, POWERUP, TOURNAMENT):
 *   Giữ nguyên thang 10, 20, 30 điểm truyền thống.
 */
export function getBasePointsForMode(rawPoints: number, mode?: GameMode): number {
  if (mode === "CLASSIC" || mode === "ELIMINATION") {
    if (rawPoints <= 10) return 1000;
    if (rawPoints <= 20) return 1500;
    return 2000;
  }
  return normalizeToThreeLevels(rawPoints);
}

/**
 * Chuẩn hóa điểm câu hỏi về 3 mức chuẩn 10, 20, 30 điểm cho các chế độ truyền thống
 * Dễ (<=10đ) -> 10đ; Trung bình (11-20đ) -> 20đ; Khó (>20đ) -> 30đ
 */
export function normalizeToThreeLevels(points: number): 10 | 20 | 30 {
  if (points <= 10) return 10;
  if (points <= 20) return 20;
  return 30;
}

/**
 * Tính điểm đa tiêu chí chi tiết cho cá nhân:
 * 1. Đúng/Sai (Điểm gốc)
 * 2. Tốc độ phản xạ theo mili-giây (tối đa +50% theo tỷ lệ thời gian còn lại)
 * 3. Chuỗi đúng liên tiếp (Streak Combo: 2 -> +10%, 3 -> +20%, 4 -> +30%, 5+ -> +50%)
 * 4. Thưởng độ khó & phân hóa (Empirical IRT: b_eff & discrimination a)
 */
export function computeDetailedPointsAwarded(ctx: ScoringContext): DetailedPointsResult {
  const base = getBasePointsForMode(ctx.basePoints, ctx.mode);

  if (!ctx.isCorrect) {
    if (ctx.mode === "CLASSIC" || ctx.mode === "ELIMINATION") {
      // Ở chế độ CLASSIC & ELIMINATION: Trả lời sai KHÔNG bị trừ điểm, trừ khi có powerup rủi ro (DOUBLE/PENALTY) và không có khiên
      if (!ctx.hasRiskPowerup || ctx.shielded) {
        return { points: 0, basePoints: 0, speedPoints: 0, streakPoints: 0, rarityPoints: 0 };
      }
    } else if (!ctx.config.penaltyForWrong || ctx.shielded) {
      return { points: 0, basePoints: 0, speedPoints: 0, streakPoints: 0, rarityPoints: 0 };
    }
    const penalty = Math.floor(base * 0.5);
    const pm = ctx.penaltyMultiplier ?? 1;
    const finalPenalty = -Math.floor(penalty * pm);
    return { points: finalPenalty, basePoints: finalPenalty, speedPoints: 0, streakPoints: 0, rarityPoints: 0 };
  }

  const isKahootScaleMode = ctx.mode === "CLASSIC" || ctx.mode === "ELIMINATION";
  const multiplier = ctx.multiplier ?? 1;

  let basePoints = 0;
  let speedPoints = 0;

  // 1. Điểm cơ bản và Tốc độ phản xạ theo chuẩn Kahoot:
  // Tối đa 100% điểm (1000/1500/2000) khi trả lời tức thì, giảm tuyến tính về 50% (500/750/1000) ở giây cuối cùng.
  if (isKahootScaleMode) {
    const totalMs = ctx.timeLimit * 1000;
    const remainingRatio = Math.max(0, 1 - ctx.timeSpent / totalMs);
    basePoints = Math.round(base * 0.5 * multiplier);
    speedPoints = Math.round(base * 0.5 * remainingRatio * multiplier);
  } else {
    basePoints = Math.round(base * multiplier);
    if (ctx.config.timeBonusEnabled) {
      const totalMs = ctx.timeLimit * 1000;
      const remainingRatio = Math.max(0, 1 - ctx.timeSpent / totalMs);
      speedPoints = Math.round(base * 0.5 * remainingRatio * multiplier);
    }
  }

  // 2. Chuỗi đúng liên tiếp (Streak bonus)
  let streakPoints = 0;
  if (ctx.streak && ctx.streak >= 2) {
    let streakRate = 0.1;
    if (ctx.streak === 3) streakRate = 0.2;
    else if (ctx.streak === 4) streakRate = 0.3;
    else if (ctx.streak >= 5) streakRate = 0.5;
    streakPoints = Math.round(base * streakRate * multiplier);
  }

  // 3. Thưởng độ khó & phân loại thực nghiệm
  let rarityPoints = 0;
  let effectiveDifficulty: number | undefined;
  let discrimination: number | undefined;
  if (ctx.mode === "CLASSIC" || ctx.mode === "ELIMINATION") {
    if (ctx.roomAccuracy !== undefined) {
      const irt = calculateItemIRTMetrics({
        rawPoints: ctx.basePoints,
        roomAccuracy: ctx.roomAccuracy,
        totalParticipants: ctx.totalParticipants ?? 4,
        topHalfCorrect: ctx.topHalfCorrect,
        topHalfTotal: ctx.topHalfTotal,
        bottomHalfCorrect: ctx.bottomHalfCorrect,
        bottomHalfTotal: ctx.bottomHalfTotal,
      });
      effectiveDifficulty = irt.bEffective;
      discrimination = irt.discrimination;
      if (irt.bonusRate > 0) {
        rarityPoints = Math.round(base * irt.bonusRate * multiplier);
      }
    }
  } else if (ctx.roomAccuracy !== undefined && ctx.roomAccuracy < 0.30) {
    const rarityDelta = 0.30 - Math.max(0, ctx.roomAccuracy);
    rarityPoints = Math.round(base * rarityDelta * 1.5 * multiplier);
  }

  const points = basePoints + speedPoints + streakPoints + rarityPoints;
  return { points, basePoints, speedPoints, streakPoints, rarityPoints, effectiveDifficulty, discrimination };
}

export function computePointsAwarded(ctx: ScoringContext): number {
  return computeDetailedPointsAwarded(ctx).points;
}

export interface TeamScoringContext {
  basePoints: number;
  timeLimit: number; // seconds
  totalOnlineMembers: number;
  correctMembers: number;
  correctTimes: number[]; // ms spent by members who got the question right
  config: GameConfig;
  streak?: number;
  multiplier?: number; // 2 from DOUBLE / SCORE_X2
  shielded?: boolean; // from SHIELD / SCORE_X2
  penaltyMultiplier?: number; // from PENALTY
  roomAccuracy?: number; // Tỷ lệ đúng của toàn phòng (0 - 1)
  topHalfCorrect?: number;
  topHalfTotal?: number;
  bottomHalfCorrect?: number;
  bottomHalfTotal?: number;
  mode?: GameMode;
  hasRiskPowerup?: boolean; // When true, answering wrong carries a penalty in CLASSIC / ELIMINATION
}

export interface TeamScoreResult {
  points: number;
  basePoints: number;
  speedPoints: number;
  streakPoints: number;
  rarityPoints: number;
  accuracyRatio: number;
  speedBonus: number;
  avgTimeSpent: number;
  empiricalMultiplier: number;
  streakBonus: number;
  effectiveDifficulty?: number;
  discrimination?: number;
}

/**
 * Tính điểm đa tiêu chí tập thể cho Đội (Team) với thang điểm và bóc tách thành phần:
 * Base + Speed + Streak + Rarity x Accuracy ratio x Multiplier
 */
export function computeTeamQuestionScore(ctx: TeamScoringContext): TeamScoreResult {
  const base = getBasePointsForMode(ctx.basePoints, ctx.mode);
  const total = Math.max(1, ctx.totalOnlineMembers);
  const accuracyRatio = Math.min(1, Math.max(0, ctx.correctMembers / total));

  // 1. Hệ số phân hóa / hiếm thực nghiệm
  let empiricalMultiplier = 1.0;
  let rarityBonus = 0;
  let effectiveDifficulty: number | undefined;
  let discrimination: number | undefined;

  if (ctx.mode === "CLASSIC" || ctx.mode === "ELIMINATION") {
    if (ctx.roomAccuracy !== undefined) {
      const irt = calculateItemIRTMetrics({
        rawPoints: ctx.basePoints,
        roomAccuracy: ctx.roomAccuracy,
        totalParticipants: ctx.totalOnlineMembers,
        topHalfCorrect: ctx.topHalfCorrect,
        topHalfTotal: ctx.topHalfTotal,
        bottomHalfCorrect: ctx.bottomHalfCorrect,
        bottomHalfTotal: ctx.bottomHalfTotal,
      });
      effectiveDifficulty = irt.bEffective;
      discrimination = irt.discrimination;
      rarityBonus = irt.bonusRate;
      empiricalMultiplier = 1 + irt.bonusRate;
    }
  } else if (ctx.roomAccuracy !== undefined && ctx.roomAccuracy < 0.30) {
    const rarityDelta = 0.30 - Math.max(0, ctx.roomAccuracy);
    empiricalMultiplier = 1 + rarityDelta * 1.5;
    rarityBonus = rarityDelta * 1.5;
  }

  if (ctx.correctMembers === 0) {
    if (ctx.mode === "CLASSIC" || ctx.mode === "ELIMINATION") {
      // Ở chế độ CLASSIC & ELIMINATION: Cả đội không ai trả lời đúng thì KHÔNG bị trừ điểm, trừ khi có powerup rủi ro (DOUBLE/PENALTY) và không có khiên
      if (!ctx.hasRiskPowerup || ctx.shielded) {
        return {
          points: 0,
          basePoints: 0,
          speedPoints: 0,
          streakPoints: 0,
          rarityPoints: 0,
          accuracyRatio: 0,
          speedBonus: 0,
          avgTimeSpent: 0,
          empiricalMultiplier,
          streakBonus: 0,
          effectiveDifficulty,
          discrimination,
        };
      }
    } else if (!ctx.config.penaltyForWrong || ctx.shielded) {
      return {
        points: 0,
        basePoints: 0,
        speedPoints: 0,
        streakPoints: 0,
        rarityPoints: 0,
        accuracyRatio: 0,
        speedBonus: 0,
        avgTimeSpent: 0,
        empiricalMultiplier,
        streakBonus: 0,
        effectiveDifficulty,
        discrimination,
      };
    }
    const pm = ctx.penaltyMultiplier ?? 1;
    const penalty = -Math.floor(base * 0.5 * pm);
    return {
      points: penalty,
      basePoints: penalty,
      speedPoints: 0,
      streakPoints: 0,
      rarityPoints: 0,
      accuracyRatio: 0,
      speedBonus: 0,
      avgTimeSpent: 0,
      empiricalMultiplier,
      streakBonus: 0,
      effectiveDifficulty,
      discrimination,
    };
  }

  // 2. Tốc độ trung bình (ms)
  const avgTimeSpent =
    ctx.correctTimes.length > 0
      ? ctx.correctTimes.reduce((a, b) => a + b, 0) / ctx.correctTimes.length
      : ctx.timeLimit * 1000;

  const isKahootScaleMode = ctx.mode === "CLASSIC" || ctx.mode === "ELIMINATION";
  const remainingRatio = Math.max(0, 1 - avgTimeSpent / (ctx.timeLimit * 1000));
  const multiplier = ctx.multiplier ?? 1;

  let speedBonus = 0;
  let basePoints = 0;
  let speedPoints = 0;

  if (isKahootScaleMode) {
    speedBonus = remainingRatio * 0.5;
    // Chuẩn Kahoot: Điểm sàn cố định 50% và Thưởng thời gian phản xạ tối đa 50%
    basePoints = Math.round(base * 0.5 * accuracyRatio * multiplier);
    speedPoints = Math.round(base * 0.5 * remainingRatio * accuracyRatio * multiplier);
  } else {
    if (ctx.config.timeBonusEnabled) {
      speedBonus = remainingRatio * 0.5;
    }
    basePoints = Math.round(base * accuracyRatio * multiplier);
    speedPoints = Math.round(base * speedBonus * accuracyRatio * multiplier);
  }

  // 3. Chuỗi đúng liên tiếp của Đội
  let streakBonus = 0;
  if (ctx.streak && ctx.streak >= 2) {
    if (ctx.streak === 2) streakBonus = 0.1;
    else if (ctx.streak === 3) streakBonus = 0.2;
    else if (ctx.streak === 4) streakBonus = 0.3;
    else if (ctx.streak >= 5) streakBonus = 0.5;
  }

  // Bóc tách từng phần điểm số chuẩn xác:
  const streakPoints = Math.round(base * streakBonus * accuracyRatio * multiplier);
  const rarityPoints = Math.round(base * rarityBonus * accuracyRatio * multiplier);
  const points = basePoints + speedPoints + streakPoints + rarityPoints;

  return {
    points,
    basePoints,
    speedPoints,
    streakPoints,
    rarityPoints,
    accuracyRatio,
    speedBonus,
    avgTimeSpent,
    empiricalMultiplier,
    streakBonus,
    effectiveDifficulty,
    discrimination,
  };
}

export function computeTeamScore(
  memberScores: number[],
  correctCount: number,
  totalMembers: number
): number {
  if (memberScores.length === 0) return 0;
  const avg = memberScores.reduce((a, b) => a + b, 0) / memberScores.length;
  const accuracyBonus = totalMembers > 0 ? correctCount / totalMembers : 0;
  return Math.floor(avg * (1 + accuracyBonus * 0.2));
}

export function computeStealAmount(
  leaderScore: number,
  stealerScore: number
): number {
  const diff = leaderScore - stealerScore;
  if (diff <= 0) return 0;
  return Math.floor(Math.min(diff * 0.2, leaderScore * 0.1, 50));
}
