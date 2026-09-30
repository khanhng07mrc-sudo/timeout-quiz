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
    const penalty = ctx.config.penaltyPoints;
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
