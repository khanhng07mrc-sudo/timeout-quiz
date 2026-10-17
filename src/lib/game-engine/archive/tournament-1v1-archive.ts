/**
 * TOURNAMENT 1V1 ARCHIVE MODULE
 * -------------------------------------------------------------
 * File này lưu trữ toàn bộ mã nguồn, kiểu dữ liệu, thuật toán chia bảng,
 * logic chấm điểm và thành phần UI của chế độ Tournament 1v1 (Đấu loại trực tiếp 1v1).
 *
 * Lý do lưu trữ:
 * - Thay thế bởi mode MAGIC_WHEEL (Vòng Quay Tri Thức - Chiếc nón kỳ diệu).
 * - Phục vụ công tác nghiên cứu, tham khảo kiến trúc và khả năng tái kích hoạt/mở rộng trong tương lai.
 *
 * Ngày lưu trữ: 17/10/2026
 */

import React from "react";

// ============================================================================
// 1. TYPE DEFINITIONS
// ============================================================================

export interface ArchivedTournamentMatch {
  id: string; // e.g. "R1-M1", "FINAL"
  roundIndex: number;
  roundName: string; // "Tứ kết", "Bán kết", "Chung kết"
  matchIndex: number;
  team1Id?: string;
  team2Id?: string;
  team1Name?: string;
  team2Name?: string;
  team1Color?: string;
  team2Color?: string;
  team1Score: number;
  team2Score: number;
  winnerTeamId?: string;
  status: "UPCOMING" | "IN_PROGRESS" | "COMPLETED";
  currentQuestionInMatch: number;
  totalQuestionsInMatch: number;
  isTieBreaker?: boolean;
  predictions?: Record<string, string>; // teamId -> predictedWinnerId
  cheers?: { countA: number; countB: number };
  recap?: { team1Score: number; team2Score: number; winnerId?: string; winnerName?: string };
}

export interface ArchivedTournamentState {
  matches: ArchivedTournamentMatch[];
  currentMatchId?: string;
  questionsPerMatch: number;
  championTeamId?: string;
  championTeamName?: string;
  oracleScores?: Record<string, number>; // teamId -> prediction points (+15 predict, +10 answer)
  cheers?: { countA: number; countB: number };
  isSeedingRound?: boolean;
  seedingTotalQuestions?: number;
  currentSeedingQuestion?: number;
  activeRecapMatchId?: string;
  recapCountdownSeconds?: number;
}

// ============================================================================
// 2. BRACKET GENERATION ALGORITHM
// ============================================================================

export function buildArchivedTournamentMatches(teams: any[], questionsPerMatch: number): ArchivedTournamentMatch[] {
  const matches: ArchivedTournamentMatch[] = [];
  const teamCount = teams.length;

  if (teamCount <= 2) {
    matches.push({
      id: "FINAL",
      roundIndex: 0,
      roundName: "Chung kết",
      matchIndex: 0,
      team1Id: teams[0]?.id,
      team1Name: teams[0]?.name,
      team1Color: teams[0]?.color,
      team2Id: teams[1]?.id,
      team2Name: teams[1]?.name,
      team2Color: teams[1]?.color,
      team1Score: 0,
      team2Score: 0,
      status: "IN_PROGRESS",
      currentQuestionInMatch: 0,
      totalQuestionsInMatch: questionsPerMatch,
    });
    return matches;
  }

  if (teamCount === 3) {
    matches.push(
      {
        id: "SF-1",
        roundIndex: 0,
        roundName: "Bán kết",
        matchIndex: 0,
        team1Id: teams[1]?.id,
        team1Name: teams[1]?.name,
        team1Color: teams[1]?.color,
        team2Id: teams[2]?.id,
        team2Name: teams[2]?.name,
        team2Color: teams[2]?.color,
        team1Score: 0,
        team2Score: 0,
        status: "IN_PROGRESS",
        currentQuestionInMatch: 0,
        totalQuestionsInMatch: questionsPerMatch,
      },
      {
        id: "FINAL",
        roundIndex: 1,
        roundName: "Chung kết",
        matchIndex: 1,
        team1Id: teams[0]?.id,
        team1Name: teams[0]?.name,
        team1Color: teams[0]?.color,
        team1Score: 0,
        team2Score: 0,
        status: "UPCOMING",
        currentQuestionInMatch: 0,
        totalQuestionsInMatch: questionsPerMatch,
      }
    );
    return matches;
  }

  if (teamCount === 4) {
    matches.push(
      {
        id: "SF-1",
        roundIndex: 0,
        roundName: "Bán kết 1",
        matchIndex: 0,
        team1Id: teams[0]?.id,
        team1Name: teams[0]?.name,
        team1Color: teams[0]?.color,
        team2Id: teams[3]?.id,
        team2Name: teams[3]?.name,
        team2Color: teams[3]?.color,
        team1Score: 0,
        team2Score: 0,
        status: "IN_PROGRESS",
        currentQuestionInMatch: 0,
        totalQuestionsInMatch: questionsPerMatch,
      },
      {
        id: "SF-2",
        roundIndex: 0,
        roundName: "Bán kết 2",
        matchIndex: 1,
        team1Id: teams[1]?.id,
        team1Name: teams[1]?.name,
        team1Color: teams[1]?.color,
        team2Id: teams[2]?.id,
        team2Name: teams[2]?.name,
        team2Color: teams[2]?.color,
        team1Score: 0,
        team2Score: 0,
        status: "UPCOMING",
        currentQuestionInMatch: 0,
        totalQuestionsInMatch: questionsPerMatch,
      },
      {
        id: "FINAL",
        roundIndex: 1,
        roundName: "Chung kết",
        matchIndex: 2,
        team1Score: 0,
        team2Score: 0,
        status: "UPCOMING",
        currentQuestionInMatch: 0,
        totalQuestionsInMatch: questionsPerMatch,
      }
    );
    return matches;
  }

  if (teamCount === 5) {
    matches.push(
      {
        id: "QF-1",
        roundIndex: 0,
        roundName: "Vòng loại Tứ kết",
        matchIndex: 0,
        team1Id: teams[3]?.id,
        team1Name: teams[3]?.name,
        team1Color: teams[3]?.color,
        team2Id: teams[4]?.id,
        team2Name: teams[4]?.name,
        team2Color: teams[4]?.color,
        team1Score: 0,
        team2Score: 0,
        status: "IN_PROGRESS",
        currentQuestionInMatch: 0,
        totalQuestionsInMatch: questionsPerMatch,
      },
      {
        id: "SF-1",
        roundIndex: 1,
        roundName: "Bán kết 1",
        matchIndex: 1,
        team1Id: teams[0]?.id,
        team1Name: teams[0]?.name,
        team1Color: teams[0]?.color,
        team1Score: 0,
        team2Score: 0,
        status: "UPCOMING",
        currentQuestionInMatch: 0,
        totalQuestionsInMatch: questionsPerMatch,
      },
      {
        id: "SF-2",
        roundIndex: 1,
        roundName: "Bán kết 2",
        matchIndex: 2,
        team1Id: teams[1]?.id,
        team1Name: teams[1]?.name,
        team1Color: teams[1]?.color,
        team2Id: teams[2]?.id,
        team2Name: teams[2]?.name,
        team2Color: teams[2]?.color,
        team1Score: 0,
        team2Score: 0,
        status: "UPCOMING",
        currentQuestionInMatch: 0,
        totalQuestionsInMatch: questionsPerMatch,
      },
      {
        id: "FINAL",
        roundIndex: 2,
        roundName: "Chung kết",
        matchIndex: 3,
        team1Score: 0,
        team2Score: 0,
        status: "UPCOMING",
        currentQuestionInMatch: 0,
        totalQuestionsInMatch: questionsPerMatch,
      }
    );
    return matches;
  }

  if (teamCount === 6) {
    matches.push(
      {
        id: "QF-1",
        roundIndex: 0,
        roundName: "Tứ kết 1",
        matchIndex: 0,
        team1Id: teams[2]?.id,
        team1Name: teams[2]?.name,
        team1Color: teams[2]?.color,
        team2Id: teams[5]?.id,
        team2Name: teams[5]?.name,
        team2Color: teams[5]?.color,
        team1Score: 0,
        team2Score: 0,
        status: "IN_PROGRESS",
        currentQuestionInMatch: 0,
        totalQuestionsInMatch: questionsPerMatch,
      },
      {
        id: "QF-2",
        roundIndex: 0,
        roundName: "Tứ kết 2",
        matchIndex: 1,
        team1Id: teams[3]?.id,
        team1Name: teams[3]?.name,
        team1Color: teams[3]?.color,
        team2Id: teams[4]?.id,
        team2Name: teams[4]?.name,
        team2Color: teams[4]?.color,
        team1Score: 0,
        team2Score: 0,
        status: "UPCOMING",
        currentQuestionInMatch: 0,
        totalQuestionsInMatch: questionsPerMatch,
      },
      {
        id: "SF-1",
        roundIndex: 1,
        roundName: "Bán kết 1",
        matchIndex: 2,
        team1Id: teams[0]?.id,
        team1Name: teams[0]?.name,
        team1Color: teams[0]?.color,
        team1Score: 0,
        team2Score: 0,
        status: "UPCOMING",
        currentQuestionInMatch: 0,
        totalQuestionsInMatch: questionsPerMatch,
      },
      {
        id: "SF-2",
        roundIndex: 1,
        roundName: "Bán kết 2",
        matchIndex: 3,
        team1Id: teams[1]?.id,
        team1Name: teams[1]?.name,
        team1Color: teams[1]?.color,
        team1Score: 0,
        team2Score: 0,
        status: "UPCOMING",
        currentQuestionInMatch: 0,
        totalQuestionsInMatch: questionsPerMatch,
      },
      {
        id: "FINAL",
        roundIndex: 2,
        roundName: "Chung kết",
        matchIndex: 4,
        team1Score: 0,
        team2Score: 0,
        status: "UPCOMING",
        currentQuestionInMatch: 0,
        totalQuestionsInMatch: questionsPerMatch,
      }
    );
    return matches;
  }

  // 7 hoặc 8+ đội
  const isSeven = teamCount === 7;
  const qfCount = isSeven ? 3 : 4;
  for (let i = 0; i < qfCount; i++) {
    const t1 = isSeven ? teams[i + 1] : teams[i * 2];
    const t2 = isSeven ? teams[6 - i] : teams[i * 2 + 1];
    matches.push({
      id: `QF-${i + 1}`,
      roundIndex: 0,
      roundName: `Tứ kết ${i + 1}`,
      matchIndex: i,
      team1Id: t1?.id,
      team1Name: t1?.name,
      team1Color: t1?.color,
      team2Id: t2?.id,
      team2Name: t2?.name,
      team2Color: t2?.color,
      team1Score: 0,
      team2Score: 0,
      status: i === 0 ? "IN_PROGRESS" : "UPCOMING",
      currentQuestionInMatch: 0,
      totalQuestionsInMatch: questionsPerMatch,
    });
  }

  matches.push(
    {
      id: "SF-1",
      roundIndex: 1,
      roundName: "Bán kết 1",
      matchIndex: qfCount,
      team1Id: isSeven ? teams[0]?.id : undefined,
      team1Name: isSeven ? teams[0]?.name : undefined,
      team1Color: isSeven ? teams[0]?.color : undefined,
      team1Score: 0,
      team2Score: 0,
      status: "UPCOMING",
      currentQuestionInMatch: 0,
      totalQuestionsInMatch: questionsPerMatch,
    },
    {
      id: "SF-2",
      roundIndex: 1,
      roundName: "Bán kết 2",
      matchIndex: qfCount + 1,
      team1Score: 0,
      team2Score: 0,
      status: "UPCOMING",
      currentQuestionInMatch: 0,
      totalQuestionsInMatch: questionsPerMatch,
    },
    {
      id: "FINAL",
      roundIndex: 2,
      roundName: "Chung kết",
      matchIndex: qfCount + 2,
      team1Score: 0,
      team2Score: 0,
      status: "UPCOMING",
      currentQuestionInMatch: 0,
      totalQuestionsInMatch: questionsPerMatch,
    }
  );

  return matches;
}

// ============================================================================
// 3. TOURNAMENT ADVANCE & SCORING LOGIC ARCHIVE
// ============================================================================

export function handleArchivedTournamentAdvance(tournament: ArchivedTournamentState): boolean {
  const nextPending = tournament.matches.find((m) => m.status === "UPCOMING" && m.team1Id && m.team2Id);
  if (nextPending) {
    nextPending.status = "IN_PROGRESS";
    tournament.currentMatchId = nextPending.id;
    tournament.activeRecapMatchId = undefined;
    tournament.recapCountdownSeconds = undefined;
    return true;
  }
  return false;
}

export function handleArchivedMatchCompletion(
  tournament: ArchivedTournamentState,
  currentMatch: ArchivedTournamentMatch
): void {
  currentMatch.status = "COMPLETED";
  currentMatch.isTieBreaker = false;
  const winnerId = currentMatch.team1Score > currentMatch.team2Score ? currentMatch.team1Id : currentMatch.team2Id;
  const winnerName = currentMatch.team1Score > currentMatch.team2Score ? currentMatch.team1Name : currentMatch.team2Name;
  currentMatch.winnerTeamId = winnerId;

  currentMatch.recap = {
    team1Score: currentMatch.team1Score,
    team2Score: currentMatch.team2Score,
    winnerId,
    winnerName: winnerName || "?",
  };
  tournament.activeRecapMatchId = currentMatch.id;
  tournament.recapCountdownSeconds = 8;

  if (currentMatch.id === "FINAL") {
    tournament.championTeamId = winnerId;
    tournament.championTeamName = winnerName;
  } else {
    const nextMatch = tournament.matches.find(
      (m) => m.roundIndex === currentMatch.roundIndex + 1 && (!m.team1Id || !m.team2Id)
    );
    if (nextMatch) {
      if (!nextMatch.team1Id) {
        nextMatch.team1Id = winnerId;
        nextMatch.team1Name = winnerName;
        nextMatch.team1Color = winnerId === currentMatch.team1Id ? currentMatch.team1Color : currentMatch.team2Color;
      } else if (!nextMatch.team2Id) {
        nextMatch.team2Id = winnerId;
        nextMatch.team2Name = winnerName;
        nextMatch.team2Color = winnerId === currentMatch.team1Id ? currentMatch.team1Color : currentMatch.team2Color;
      }
    }
  }

  // Trao điểm Tiên tri (+15đ) cho khán giả đoán đúng
  if (currentMatch.predictions && winnerId) {
    tournament.oracleScores = tournament.oracleScores || {};
    for (const [predTeamId, predWinnerId] of Object.entries(currentMatch.predictions)) {
      if (predWinnerId === winnerId) {
        tournament.oracleScores[predTeamId] = (tournament.oracleScores[predTeamId] || 0) + 15;
      }
    }
  }
}
