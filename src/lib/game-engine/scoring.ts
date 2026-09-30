import { GameConfig, QuestionType } from "@/types";

export interface ScoringContext {
  basePoints: number;
  timeSpent: number;         // ms
  timeLimit: number;         // seconds
  isCorrect: boolean;
  config: GameConfig;
  multiplier?: number;       // from DOUBLE or SCORE_X2 card
  shielded?: boolean;        // from SHIELD card
  penaltyMultiplier?: number; // from PENALTY card
}

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

  if (ctx.config.timeBonusEnabled) {
    const remainingRatio = Math.max(
      0,
      1 - ctx.timeSpent / (ctx.timeLimit * 1000)
    );
    const bonus = Math.floor(ctx.basePoints * 0.5 * remainingRatio);
    score += bonus;
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
}

export function computeTeamQuestionScore(ctx: TeamScoringContext): TeamScoreResult {
  const total = Math.max(1, ctx.totalOnlineMembers);
  const accuracyRatio = Math.min(1, Math.max(0, ctx.correctMembers / total));

  // Tính hệ số hiếm thực nghiệm (Empirical Rarity Multiplier)
  // Nếu tỷ lệ đúng của toàn phòng < 30%, câu hỏi thực sự hóc búa -> thưởng điểm hiếm
  let empiricalMultiplier = 1.0;
  if (ctx.roomAccuracy !== undefined && ctx.roomAccuracy < 0.30) {
    const rarityDelta = 0.30 - Math.max(0, ctx.roomAccuracy);
    empiricalMultiplier = 1 + rarityDelta * 1.5; // tối đa +45% khi tỷ lệ đúng tiệm cận 0
  }

  if (ctx.correctMembers === 0) {
    if (!ctx.config.penaltyForWrong || ctx.shielded) {
      return { points: 0, accuracyRatio: 0, speedBonus: 0, avgTimeSpent: 0, empiricalMultiplier };
    }
    const pm = ctx.penaltyMultiplier ?? 1;
    // Điểm trừ luôn mặc định = nửa số điểm câu hỏi (-50%)
    const penalty = Math.floor(ctx.basePoints * 0.5 * pm);
    return { points: -penalty, accuracyRatio: 0, speedBonus: 0, avgTimeSpent: 0, empiricalMultiplier };
  }

  // Calculate average response time of members who answered correctly
  const avgTimeSpent =
    ctx.correctTimes.length > 0
      ? ctx.correctTimes.reduce((a, b) => a + b, 0) / ctx.correctTimes.length
      : ctx.timeLimit * 1000;

  let speedBonus = 0;
  if (ctx.config.timeBonusEnabled) {
    const remainingRatio = Math.max(0, 1 - avgTimeSpent / (ctx.timeLimit * 1000));
    speedBonus = remainingRatio * 0.5; // up to +50% speed bonus
  }

  const multiplier = ctx.multiplier ?? 1;
  // Formula: floor(BasePoints * EmpiricalMultiplier * (1 + SpeedBonus) * AccuracyRatio * Multiplier)
  const rawScore = ctx.basePoints * empiricalMultiplier * (1 + speedBonus) * accuracyRatio * multiplier;
  const points = Math.floor(rawScore);

  return { points, accuracyRatio, speedBonus, avgTimeSpent, empiricalMultiplier };
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
