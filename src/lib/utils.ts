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
  const maxQ = config?.matchMaxQuestions && config.matchMaxQuestions > 0 ? config.matchMaxQuestions : undefined;

  if (mode === "MYSTERY_QUEST") {
    const turnsPerTeam = config?.mysteryQuestTurnsPerTeam || (maxQ ? Math.max(1, Math.floor(maxQ / safeTeamsCount)) : 2);
    const modeLimit = safeTeamsCount * turnsPerTeam;
    return Math.min(safeBankTotal, maxQ ? Math.min(maxQ, modeLimit) : modeLimit);
  }
  if (mode === "WAGER") {
    const rounds = config?.wagerRoundsPerTeam || (maxQ ? Math.max(1, Math.floor(maxQ / safeTeamsCount)) : 2);
    const modeLimit = safeTeamsCount * rounds;
    return Math.min(safeBankTotal, maxQ ? Math.min(maxQ, modeLimit) : modeLimit);
  }
  if (mode === "BOUNCEBACK") {
    const qPerTurn = config?.bouncebackQuestionsPerTurn || 1;
    const cycles = config?.bouncebackCycles || (maxQ ? Math.max(1, Math.floor(maxQ / (safeTeamsCount * qPerTurn))) : 1);
    const modeLimit = safeTeamsCount * cycles * qPerTurn;
    return Math.min(safeBankTotal, maxQ ? Math.min(maxQ, modeLimit) : modeLimit);
  }
  if (mode === "GRID_CARO") {
    if (maxQ) return Math.min(safeBankTotal, maxQ);
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
    if (maxQ) return Math.min(safeBankTotal, maxQ);
    if (config?.diceRaceMaxQuestions && config.diceRaceMaxQuestions > 0) {
      return Math.min(safeBankTotal, config.diceRaceMaxQuestions);
    }
    return safeBankTotal;
  }
  if (mode === "TOURNAMENT") {
    if (maxQ) return Math.min(safeBankTotal, maxQ);
    return safeBankTotal;
  }
  // Simultaneous modes: CLASSIC, BUZZ, POWERUP, ELIMINATION, etc.
  if (maxQ) {
    return Math.min(safeBankTotal, maxQ);
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
