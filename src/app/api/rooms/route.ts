import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateRoomCode, generateInviteUrl, generateCardDeck } from "@/lib/utils";
import {
  verifyAdminRequest,
  getCurrentUserFromRequest,
  generateHostKey,
  sanitizeInput,
} from "@/lib/security";
import { getDefaultAllowedPowerupsForMode, distributeCategorizedCardsToTeams } from "@/lib/game-engine/powerups";
import { calculateModeDerivedConfig } from "@/lib/game-engine/question-allocator";

const DEFAULT_CONFIG = {
  powerupEnabled: true,
  powerupOwnerType: "TEAM",
  powerupCountPerTeam: 2,
  powerupCountShared: 0,
  maxHandSize: 3,
  sharedPowerupTeamQuota: 2,
  sharedPowerupProbability: 0.10,
  allowedPowerups: ["FIFTY_FIFTY", "DOUBLE", "FREEZE", "ATTACK", "SKIP", "TIME_PLUS", "SHIELD", "STEAL", "PENALTY", "SCORE_X2"],
  timeBonusEnabled: true,
  penaltyForWrong: false,
  penaltyPoints: 5,
  maxTeams: 20,
  buzzMode: false,
  eliminationRounds: 3,
  bouncebackQuestionsPerTurn: 1,
  bouncebackCycles: 1,
  answerMethod: "DEVICE",
  eliminationDeepScoring: true,
  eliminationIntervalQuestions: 3,
  // Tournament defaults
  tournamentQuestionsPerMatch: 3,
  // Grid Caro defaults
  gridRows: 4,
  gridCols: 4,
  gridStreakTargetK: 3,
  gridCaroEnabled: true,
  gridCaroBonusPoints: 30,
  gridPreviewDuration: 5,
  // Dice Race defaults
  diceTrackTotalTiles: 30,
  // Wager defaults
  wagerTimeSeconds: 15,
  wagerMinAllowance: 50,
  // Buzz defaults
  buzzUnlockMode: "AUTO",
  buzzAutoDelay: 3,
  // Answer submission & timer control defaults
  answerSubmissionMode: "ALLOW_CHANGE",
  autoTimerStart: false,
  initialTeamScore: 0,
  mysteryQuestTurnsPerTeam: 2,
  matchMaxQuestions: 0,
};

export async function POST(req: NextRequest) {
  if (!verifyAdminRequest(req)) {
    return NextResponse.json({ error: "Yêu cầu quyền Quản trị viên (Unauthorized)" }, { status: 401 });
  }

  try {
    const user = getCurrentUserFromRequest(req);
    const body = await req.json();
    const { name, quizBankId, mode, teamMode, config, teams } = body;
    const effectiveHostId = user?.userId || body.hostId || "demo-host-id";

    if (!name) {
      return NextResponse.json({ error: "Vui lòng nhập tên phòng thi" }, { status: 400 });
    }

    // Ensure host User record exists in DB to prevent foreign key errors
    const existingHost = await prisma.user.findUnique({ where: { id: effectiveHostId } });
    if (!existingHost) {
      await prisma.user.upsert({
        where: { email: user?.email || `${effectiveHostId}@quizorra.com` },
        update: {},
        create: {
          id: effectiveHostId,
          name: user?.name || "Quizorra Host",
          email: user?.email || `${effectiveHostId}@quizorra.com`,
          role: "ADMIN",
        },
      });
    }

    const targetMode = mode ?? "CLASSIC";
    const defaultModeAllowed = getDefaultAllowedPowerupsForMode(targetMode);
    const mergedConfig = {
      ...DEFAULT_CONFIG,
      allowedPowerups: defaultModeAllowed,
      ...config,
    };
    if (config?.allowedPowerups && Array.isArray(config.allowedPowerups)) {
      const filtered = config.allowedPowerups.filter((c: any) => defaultModeAllowed.includes(c));
      mergedConfig.allowedPowerups = filtered.length > 0 ? filtered : defaultModeAllowed;
    }
    if (targetMode === "MYSTERY_QUEST") {
      mergedConfig.powerupEnabled = false;
      mergedConfig.allowedPowerups = [];
    }

    // Auto-synchronize derived configurations if matchMaxQuestions is provided
    if (config?.matchMaxQuestions && Number(config.matchMaxQuestions) > 0) {
      const numTeams = Array.isArray(teams) && teams.length > 0 ? teams.length : 4;
      const maxQ = Number(config.matchMaxQuestions);
      const derived = calculateModeDerivedConfig(targetMode, maxQ, numTeams);
      if (derived.mysteryQuestTurnsPerTeam) mergedConfig.mysteryQuestTurnsPerTeam = derived.mysteryQuestTurnsPerTeam;
      if (derived.wagerRoundsPerTeam) mergedConfig.wagerRoundsPerTeam = derived.wagerRoundsPerTeam;
      if (derived.bouncebackCycles) mergedConfig.bouncebackCycles = derived.bouncebackCycles;
      if (derived.eliminationIntervalQuestions) mergedConfig.eliminationIntervalQuestions = derived.eliminationIntervalQuestions;
      if (derived.tournamentQuestionsPerMatch) mergedConfig.tournamentQuestionsPerMatch = derived.tournamentQuestionsPerMatch;
      if (derived.gridMaxQuestions) mergedConfig.gridMaxQuestions = derived.gridMaxQuestions;
      if (derived.diceRaceMaxQuestions) mergedConfig.diceRaceMaxQuestions = derived.diceRaceMaxQuestions;
      mergedConfig.matchMaxQuestions = derived.matchMaxQuestions;
    }

    // ── Strict Validation for GRID_CARO ──────────────────────────────────────────
    if (mode === "GRID_CARO") {
      if (!quizBankId) {
        return NextResponse.json(
          { error: "Chế độ GRID_CARO bắt buộc phải chọn một bộ câu hỏi!" },
          { status: 400 }
        );
      }

      const quizBank = await prisma.quizBank.findUnique({
        where: { id: quizBankId },
        include: { questions: true },
      });

      if (!quizBank || quizBank.questions.length === 0) {
        return NextResponse.json(
          { error: "Bộ câu hỏi đã chọn không có câu hỏi nào!" },
          { status: 400 }
        );
      }

      const gridRows = Number(mergedConfig.gridRows) || 4;
      const gridCols = Number(mergedConfig.gridCols) || 4;
      const totalCells = gridRows * gridCols;

      const easyCells = Number(mergedConfig.gridEasyCells) || Math.floor(totalCells / 3);
      const medCells = Number(mergedConfig.gridMediumCells) || Math.floor(totalCells / 3);
      const hardCells = Number(mergedConfig.gridHardCells) || (totalCells - easyCells - medCells);

      if (easyCells + medCells + hardCells !== totalCells) {
        return NextResponse.json(
          {
            error: `Tổng số ô các độ khó (${easyCells} Dễ + ${medCells} TB + ${hardCells} Khó = ${easyCells + medCells + hardCells}) không khớp kích thước bàn cờ (${gridRows}×${gridCols} = ${totalCells} ô)!`,
          },
          { status: 400 }
        );
      }

      const reqEasy = Math.ceil(easyCells * 1.25);
      const reqMed = Math.ceil(medCells * 1.25);
      const reqHard = Math.ceil(hardCells * 1.25);

      const easyInBank = quizBank.questions.filter((q) => (q.points || 10) <= 10).length;
      const medInBank = quizBank.questions.filter((q) => (q.points || 10) > 10 && (q.points || 10) <= 20).length;
      const hardInBank = quizBank.questions.filter((q) => (q.points || 10) > 20).length;

      const errors: string[] = [];
      if (easyInBank < reqEasy) {
        errors.push(`Câu Dễ: cần tối thiểu ${reqEasy} câu (hiện có ${easyInBank}, thiếu ${reqEasy - easyInBank})`);
      }
      if (medInBank < reqMed) {
        errors.push(`Câu Trung bình: cần tối thiểu ${reqMed} câu (hiện có ${medInBank}, thiếu ${reqMed - medInBank})`);
      }
      if (hardInBank < reqHard) {
        errors.push(`Câu Khó: cần tối thiểu ${reqHard} câu (hiện có ${hardInBank}, thiếu ${reqHard - hardInBank})`);
      }

      if (errors.length > 0) {
        return NextResponse.json(
          {
            error: `Kho câu hỏi không đáp ứng yêu cầu bàn cờ ${gridRows}×${gridCols} (gồm 25% dự phòng): ${errors.join("; ")}. Vui lòng bổ sung câu hỏi hoặc điều chỉnh bàn cờ!`,
          },
          { status: 400 }
        );
      }
    }

    // Generate unique PIN
    let code = generateRoomCode();
    let attempts = 0;
    while (attempts < 10) {
      const existing = await prisma.room.findUnique({ where: { code } });
      if (!existing) break;
      code = generateRoomCode();
      attempts++;
    }

    const inviteUrl = generateInviteUrl(code);
    const hostKey = generateHostKey();

    let room;
    try {
      room = await prisma.room.create({
        data: {
          code,
          name: sanitizeInput(name, 100),
          hostId: effectiveHostId,
          hostKey,
          quizBankId: quizBankId || null,
          mode: mode ?? "CLASSIC",
          teamMode: teamMode ?? "INDIVIDUAL",
          status: "LOBBY",
          config: mergedConfig,
          inviteUrl,
        },
      });
    } catch (createErr: any) {
      if (String(createErr).includes("GameMode") || String(createErr).includes("22P02")) {
        const fallbackMode = mode ?? "CLASSIC";
        await prisma.$executeRawUnsafe(`ALTER TYPE "GameMode" ADD VALUE IF NOT EXISTS '${fallbackMode}'`).catch(() => {});
        room = await prisma.room.create({
          data: {
            code,
            name: sanitizeInput(name, 100),
            hostId: effectiveHostId,
            hostKey,
            quizBankId: quizBankId || null,
            mode: fallbackMode,
            teamMode: teamMode ?? "INDIVIDUAL",
            status: "LOBBY",
            config: mergedConfig,
            inviteUrl,
          },
        });
      } else {
        throw createErr;
      }
    }

    // Create teams if provided
    if (teams && Array.isArray(teams)) {
      for (const team of teams) {
        await prisma.team.create({
          data: {
            name: sanitizeInput(team.name, 50),
            color: team.color ?? "#6366f1",
            roomId: room.id,
            score: (mode ?? "CLASSIC") === "DICE_RACE" ? 1 : Math.max(0, Number(mergedConfig.initialTeamScore) || 0),
          },
        });
      }
    }

    // Generate power-up cards if enabled
    if (mergedConfig.powerupEnabled) {
      const allowedTypes = mergedConfig.allowedPowerups as string[];
      if (mergedConfig.powerupOwnerType === "SHARED") {
        const deck = generateCardDeck(allowedTypes, mergedConfig.powerupCountShared);
        await prisma.powerupCard.createMany({
          data: deck.map((type) => ({
            type: type as any,
            ownerType: "SHARED",
            roomId: room.id,
          })),
        });
      } else {
        const createdTeams = await prisma.team.findMany({ where: { roomId: room.id } });
        const teamIds = createdTeams.map((t) => t.id);
        const cardsMap = distributeCategorizedCardsToTeams(
          teamIds,
          allowedTypes as any,
          mergedConfig.powerupCountPerTeam || 2,
          mergedConfig.sharedPowerupTeamQuota
        );
        for (const team of createdTeams) {
          const cards = cardsMap.get(team.id) || [];
          if (cards.length > 0) {
            await prisma.powerupCard.createMany({
              data: cards.map((type) => ({
                type: type as any,
                ownerType: "TEAM",
                teamId: team.id,
                roomId: room.id,
              })),
            });
          }
        }
      }
    }

    return NextResponse.json({ room, hostKey }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/rooms]", err);
    return NextResponse.json({ error: "Lỗi tạo phòng thi" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  if (!verifyAdminRequest(req)) {
    return NextResponse.json({ error: "Yêu cầu quyền Quản trị viên (Unauthorized)" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const hostId = searchParams.get("hostId");
    const user = getCurrentUserFromRequest(req);

    let whereClause: any = undefined;
    if (user && user.userId !== "master-admin") {
      whereClause = {
        OR: [
          { hostId: user.userId },
          { hostId: "demo-host-id" },
          ...(hostId && hostId !== "demo-host-id" && hostId !== user.userId ? [{ hostId }] : []),
        ],
      };
    } else if (hostId && hostId !== "demo-host-id") {
      whereClause = { hostId };
    }

    const rooms = await prisma.room.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { players: true, teams: true } },
        quizBank: { select: { title: true } },
      },
    });

    return NextResponse.json({ rooms });
  } catch (err) {
    console.error("[GET /api/rooms]", err);
    return NextResponse.json({ error: "Lỗi tải danh sách phòng" }, { status: 500 });
  }
}

