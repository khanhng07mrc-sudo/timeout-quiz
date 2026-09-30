import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateRoomCode, generateInviteUrl, generateCardDeck, shuffleArray } from "@/lib/utils";
import { GameMode, TeamMode } from "@/types";

const DEFAULT_CONFIG = {
  powerupEnabled: false,
  powerupOwnerType: "SHARED",
  powerupCountPerTeam: 3,
  powerupCountShared: 10,
  allowedPowerups: ["FIFTY_FIFTY", "DOUBLE", "FREEZE", "ATTACK", "SKIP", "TIME_PLUS", "SHIELD", "STEAL"],
  timeBonusEnabled: true,
  penaltyForWrong: false,
  penaltyPoints: 5,
  maxTeams: 20,
  buzzMode: false,
  eliminationRounds: 3,
  bouncebackQuestionsPerTurn: 1,
  bouncebackCycles: 1,
  answerMethod: "DEVICE",
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, quizBankId, mode, teamMode, config, hostId, teams } = body;

    if (!name || !hostId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
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

    const room = await prisma.room.create({
      data: {
        code,
        name,
        hostId,
        quizBankId: quizBankId || null,
        mode: mode ?? "CLASSIC",
        teamMode: teamMode ?? "INDIVIDUAL",
        status: "LOBBY",
        config: mergedConfig,
        inviteUrl,
      },
    });

    // Create host as player
    await prisma.player.create({
      data: {
        name: "Host",
        roomId: room.id,
        userId: hostId,
        isHost: true,
      },
    });

    // Create teams if provided
    if (teams && Array.isArray(teams)) {
      for (const team of teams) {
        await prisma.team.create({
          data: {
            name: team.name,
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
        // Per-team cards (will be assigned when teams are confirmed)
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

    return NextResponse.json({ room }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/rooms]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const hostId = searchParams.get("hostId");
    if (!hostId) return NextResponse.json({ error: "Missing hostId" }, { status: 400 });

    const rooms = await prisma.room.findMany({
      where: { hostId },
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { players: true, teams: true } },
        quizBank: { select: { title: true } },
      },
    });

    return NextResponse.json({ rooms });
  } catch (err) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
