import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import type { GameMode, GameConfig } from "@/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getTargetTotalQuestions(
  mode: GameMode,
  config: GameConfig | undefined,
  teamsCount: number,
  bankTotal: number
): number {
  const safeBankTotal = Math.max(1, bankTotal);
  const safeTeamsCount = Math.max(1, teamsCount);

  if (mode === "WAGER") {
    const rounds = config?.wagerRoundsPerTeam || 2;
    return Math.min(safeBankTotal, safeTeamsCount * rounds);
  }
  if (mode === "BOUNCEBACK") {
    const cycles = config?.bouncebackCycles || 1;
    const qPerTurn = config?.bouncebackQuestionsPerTurn || 3;
    return Math.min(safeBankTotal, safeTeamsCount * cycles * qPerTurn);
  }
  if (mode === "GRID_CARO") {
    const rounds = config?.gridRoundsPerTeam;
    if (rounds && rounds > 0) {
      return Math.min(safeBankTotal, safeTeamsCount * rounds);
    }
    if (config?.gridMaxQuestions && config.gridMaxQuestions > 0) {
      return Math.min(safeBankTotal, config.gridMaxQuestions);
    }
    return safeBankTotal;
  }
  if (mode === "DICE_RACE") {
    if (config?.diceRaceMaxQuestions && config.diceRaceMaxQuestions > 0) {
      return Math.min(safeBankTotal, config.diceRaceMaxQuestions);
    }
    return safeBankTotal;
  }
  // Simultaneous modes: CLASSIC, BUZZ, POWERUP, ELIMINATION, etc.
  if (config?.matchMaxQuestions && config.matchMaxQuestions > 0) {
    return Math.min(safeBankTotal, config.matchMaxQuestions);
  }
  return safeBankTotal;
}

export function generateRoomCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export function generateInviteUrl(code: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return `${baseUrl}/play/${code}`;
}

export function calculateTimeBonus(
  timeSpent: number,
  timeLimit: number,
  basePoints: number
): number {
  const remainingRatio = Math.max(0, 1 - timeSpent / (timeLimit * 1000));
  const bonus = Math.floor(basePoints * 0.5 * remainingRatio);
  return bonus;
}

export function calculateScore({
  basePoints,
  timeSpent,
  timeLimit,
  timeBonusEnabled,
  multiplier = 1,
}: {
  basePoints: number;
  timeSpent: number;
  timeLimit: number;
  timeBonusEnabled: boolean;
  multiplier?: number;
}): number {
  let score = basePoints;
  if (timeBonusEnabled) {
    score += calculateTimeBonus(timeSpent, timeLimit, basePoints);
  }
  return Math.floor(score * multiplier);
}

export function formatScore(score: number): string {
  return score.toLocaleString();
}

export function getTeamColorClass(color: string): string {
  // Map hex color to a Tailwind-safe class or return inline style
  return color;
}

export function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function generateCardDeck(types: string[], count: number): string[] {
  const deck: string[] = [];
  while (deck.length < count) {
    deck.push(...types);
  }
  return shuffleArray(deck).slice(0, count);
}
