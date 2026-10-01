import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateRoomCode, generateInviteUrl, generateCardDeck } from "@/lib/utils";
import { verifyAdminRequest, generateHostKey, sanitizeInput } from "@/lib/security";

const DEFAULT_CONFIG = {
  powerupEnabled: true,
  powerupOwnerType: "TEAM",
  powerupCountPerTeam: 2,
  powerupCountShared: 0,
  maxHandSize: 3,
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
};

export async function POST(req: NextRequest) {
  if (!verifyAdminRequest(req)) {
    return NextResponse.json({ error: "Yêu cầu quyền Quản trị viên (Unauthorized)" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { name, quizBankId, mode, teamMode, config, hostId, teams } = body;

    if (!name || !hostId) {
      return NextResponse.json({ error: "Vui lòng nhập tên phòng thi" }, { status: 400 });
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

    const mergedConfig = { ...DEFAULT_CONFIG, ...config };
    const inviteUrl = generateInviteUrl(code);
    const hostKey = generateHostKey();

    const room = await prisma.room.create({
      data: {
        code,
        name: sanitizeInput(name, 100),
        hostId,
        hostKey,
        quizBankId: quizBankId || null,
        mode: mode ?? "CLASSIC",
        teamMode: teamMode ?? "INDIVIDUAL",
        status: "LOBBY",
        config: mergedConfig,
        inviteUrl,
      },
    });

    // Create teams if provided
    if (teams && Array.isArray(teams)) {
      for (const team of teams) {
        await prisma.team.create({
          data: {
            name: sanitizeInput(team.name, 50),
            color: team.color ?? "#6366f1",
            roomId: room.id,
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
        for (const team of createdTeams) {
          const deck = generateCardDeck(allowedTypes, mergedConfig.powerupCountPerTeam);
          await prisma.powerupCard.createMany({
            data: deck.map((type) => ({
              type: type as any,
              ownerType: "TEAM",
              teamId: team.id,
              roomId: room.id,
            })),
          });
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

    const rooms = await prisma.room.findMany({
      where: hostId ? { hostId } : undefined,
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
