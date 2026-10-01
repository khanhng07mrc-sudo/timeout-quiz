import { GameConfig } from "@/types";

export interface ScoringContext {
  basePoints: number;
  timeSpent: number; // ms
  timeLimit: number; // seconds
  isCorrect: boolean;
  config: GameConfig;
  streak?: number; // Current correct streak count
  roomAccuracy?: number; // Tỷ lệ đúng của toàn phòng (0 - 1)
  multiplier?: number; // from DOUBLE or SCORE_X2 card
  shielded?: boolean; // from SHIELD card
  penaltyMultiplier?: number; // from PENALTY card
}

/**
 * Chuẩn hóa điểm câu hỏi về 3 mức chuẩn 10, 20, 30 điểm
 * Dễ (<=10đ) -> 10đ; Trung bình (11-20đ) -> 20đ; Khó (>20đ) -> 30đ
 */
export function normalizeToThreeLevels(points: number): 10 | 20 | 30 {
  if (points <= 10) return 10;
  if (points <= 20) return 20;
  return 30;
}

/**
 * Tính điểm đa tiêu chí cho cá nhân:
 * 1. Đúng/Sai (Điểm gốc)
 * 2. Tốc độ phản xạ (Speed bonus: tối đa +50% theo thời gian còn lại)
 * 3. Chuỗi đúng liên tiếp (Streak Combo: 2 -> +10%, 3 -> +20%, 4 -> +30%, 5+ -> +50%)
 * 4. Độ hiếm đáp án (Rarity: phòng < 30% đúng được thưởng tối đa +45%)
 */
export function computePointsAwarded(ctx: ScoringContext): number {
  if (!ctx.isCorrect) {
    if (!ctx.config.penaltyForWrong) return 0;
    // Điểm trừ luôn mặc định = nửa số điểm câu hỏi (-50%)
    const penalty = Math.floor(ctx.basePoints * 0.5);
    if (ctx.shielded) return 0;
    const pm = ctx.penaltyMultiplier ?? 1;
    return -Math.floor(penalty * pm);
  }

  let score = ctx.basePoints;

  // 1. Tốc độ (Speed bonus)
  if (ctx.config.timeBonusEnabled) {
    const remainingRatio = Math.max(
      0,
      1 - ctx.timeSpent / (ctx.timeLimit * 1000)
    );
    const speedBonus = Math.floor(ctx.basePoints * 0.5 * remainingRatio);
    score += speedBonus;
  }

  // 2. Chuỗi đúng liên tiếp (Streak bonus)
  if (ctx.streak && ctx.streak >= 2) {
    let streakRate = 0.1;
    if (ctx.streak === 3) streakRate = 0.2;
    else if (ctx.streak === 4) streakRate = 0.3;
    else if (ctx.streak >= 5) streakRate = 0.5;
    const streakBonus = Math.floor(ctx.basePoints * streakRate);
    score += streakBonus;
  }

  // 3. Độ hiếm đáp án (Rarity multiplier)
  if (ctx.roomAccuracy !== undefined && ctx.roomAccuracy < 0.30) {
    const rarityDelta = 0.30 - Math.max(0, ctx.roomAccuracy);
    const rarityBonus = Math.floor(ctx.basePoints * rarityDelta * 1.5);
    score += rarityBonus;
  }

  const multiplier = ctx.multiplier ?? 1;
  return Math.floor(score * multiplier);
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
}

export interface TeamScoreResult {
  points: number;
  accuracyRatio: number;
  speedBonus: number;
  avgTimeSpent: number;
  empiricalMultiplier: number;
  streakBonus: number;
}

/**
 * Tính điểm đa tiêu chí tập thể cho Đội (Team):
 * Accuracy ratio * Base * Speed * Streak * Empirical Rarity
 */
export function computeTeamQuestionScore(ctx: TeamScoringContext): TeamScoreResult {
  const total = Math.max(1, ctx.totalOnlineMembers);
  const accuracyRatio = Math.min(1, Math.max(0, ctx.correctMembers / total));

  // 1. Hệ số hiếm thực nghiệm
  let empiricalMultiplier = 1.0;
  if (ctx.roomAccuracy !== undefined && ctx.roomAccuracy < 0.30) {
    const rarityDelta = 0.30 - Math.max(0, ctx.roomAccuracy);
    empiricalMultiplier = 1 + rarityDelta * 1.5;
  }

  if (ctx.correctMembers === 0) {
    if (!ctx.config.penaltyForWrong || ctx.shielded) {
      return { points: 0, accuracyRatio: 0, speedBonus: 0, avgTimeSpent: 0, empiricalMultiplier, streakBonus: 0 };
    }
    const pm = ctx.penaltyMultiplier ?? 1;
    const penalty = Math.floor(ctx.basePoints * 0.5 * pm);
    return { points: -penalty, accuracyRatio: 0, speedBonus: 0, avgTimeSpent: 0, empiricalMultiplier, streakBonus: 0 };
  }

  // 2. Tốc độ trung bình
  const avgTimeSpent =
    ctx.correctTimes.length > 0
      ? ctx.correctTimes.reduce((a, b) => a + b, 0) / ctx.correctTimes.length
      : ctx.timeLimit * 1000;

  let speedBonus = 0;
  if (ctx.config.timeBonusEnabled) {
    const remainingRatio = Math.max(0, 1 - avgTimeSpent / (ctx.timeLimit * 1000));
    speedBonus = remainingRatio * 0.5;
  }

  // 3. Chuỗi đúng liên tiếp của Đội
  let streakMultiplier = 1.0;
  let streakBonus = 0;
  if (ctx.streak && ctx.streak >= 2) {
    if (ctx.streak === 2) streakBonus = 0.1;
    else if (ctx.streak === 3) streakBonus = 0.2;
    else if (ctx.streak === 4) streakBonus = 0.3;
    else if (ctx.streak >= 5) streakBonus = 0.5;
    streakMultiplier = 1.0 + streakBonus;
  }

  const multiplier = ctx.multiplier ?? 1;
  const rawScore = ctx.basePoints * empiricalMultiplier * streakMultiplier * (1 + speedBonus) * accuracyRatio * multiplier;
  const points = Math.floor(rawScore);

  return { points, accuracyRatio, speedBonus, avgTimeSpent, empiricalMultiplier, streakBonus };
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
