import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateRoomCode, generateInviteUrl, generateCardDeck, shuffleArray } from "@/lib/utils";
import { GameMode } from "@/types";

const DEFAULT_SANDBOX_CONFIG = {
  powerupEnabled: true,
  powerupOwnerType: "TEAM",
  powerupCountPerTeam: 2,
  powerupCountShared: 0,
  maxHandSize: 3,
  allowedPowerups: [
    "FIFTY_FIFTY",
    "DOUBLE",
    "FREEZE",
    "ATTACK",
    "SKIP",
    "TIME_PLUS",
    "SHIELD",
    "STEAL",
    "PENALTY",
    "SCORE_X2",
  ],
  timeBonusEnabled: true,
  penaltyForWrong: false,
  penaltyPoints: 5,
  maxTeams: 4,
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

const DEFAULT_TEAMS = [
  { name: "Đội Đỏ", color: "#ef4444" },
  { name: "Đội Lam", color: "#3b82f6" },
  { name: "Đội Vàng", color: "#eab308" },
  { name: "Đội Lục", color: "#10b981" },
];

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const mode: GameMode = body.mode || "CLASSIC";
    let quizBankId: string = body.quizBankId;

    // Ensure Host user exists
    const host = await prisma.user.upsert({
      where: { email: "demo-host@timeoutquiz.com" },
      update: {},
      create: {
        id: "demo-host-id",
        email: "demo-host@timeoutquiz.com",
        name: "Nguyễn Gia Khánh (Host)",
        role: "ADMIN",
      },
    });

    // If quiz bank specified, find it; otherwise find any available bank
    let quizBank = quizBankId
      ? await prisma.quizBank.findUnique({
          where: { id: quizBankId },
          include: { _count: { select: { questions: true } } },
        })
      : null;

    if (!quizBank) {
      quizBank = await prisma.quizBank.findFirst({
        where: { OR: [{ ownerId: host.id }, { isPublic: true }] },
        include: { _count: { select: { questions: true } } },
        orderBy: { createdAt: "desc" },
      });
    }

    if (!quizBank) {
      quizBank = await prisma.quizBank.findFirst({
        include: { _count: { select: { questions: true } } },
        orderBy: { createdAt: "desc" },
      });
    }

    // Generate unique 6-digit room code
    let code = generateRoomCode();
    let attempts = 0;
    while (attempts < 10) {
      const existing = await prisma.room.findUnique({ where: { code } });
      if (!existing) break;
      code = generateRoomCode();
      attempts++;
    }

    const inviteUrl = generateInviteUrl(code);

    const room = await prisma.room.create({
      data: {
        code,
        name: `[Sandbox] ${mode} - 4 Đội Test`,
        hostId: host.id,
        quizBankId: quizBank?.id || null,
        mode,
        teamMode: "TEAM",
        status: "LOBBY",
        config: DEFAULT_SANDBOX_CONFIG,
        inviteUrl,
      },
    });

    // Create 4 standard teams
    const createdTeams = [];
    for (const t of DEFAULT_TEAMS) {
      const team = await prisma.team.create({
        data: {
          name: t.name,
          color: t.color,
          roomId: room.id,
        },
      });
      createdTeams.push(team);
    }

    // Create Host Player
    const hostPlayer = await prisma.player.create({
      data: {
        name: "Host Admin",
        roomId: room.id,
        isHost: true,
      },
    });

    // Create Players for the teams (Player 1 is Human Tester, Players 2-4 are Bots)
    const playerConfigs = [
      { name: "Bạn (Tester)", teamIndex: 0 },
      { name: "Bot Lam 🤖", teamIndex: 1 },
      { name: "Bot Vàng 🤖", teamIndex: 2 },
      { name: "Bot Lục 🤖", teamIndex: 3 },
    ];

    const createdPlayers = [];
    for (const p of playerConfigs) {
      const player = await prisma.player.create({
        data: {
          name: p.name,
          roomId: room.id,
          teamId: createdTeams[p.teamIndex].id,
          isHost: false,
        },
      });
      createdPlayers.push(player);
    }

    // Distribute 2 random powerup cards per team
    const allowedTypes = DEFAULT_SANDBOX_CONFIG.allowedPowerups;
    for (const team of createdTeams) {
      const deck = generateCardDeck(allowedTypes, 2);
      await prisma.powerupCard.createMany({
        data: deck.map((type) => ({
          type: type as any,
          ownerType: "TEAM",
          roomId: room.id,
          teamId: team.id,
        })),
      });
    }

    return NextResponse.json({
      success: true,
      code: room.code,
      roomId: room.id,
      mode: room.mode,
      quizBankTitle: quizBank?.title || "Mặc định",
      teams: createdTeams,
      players: createdPlayers,
      hostPlayerId: hostPlayer.id,
    });
  } catch (error) {
    console.error("[sandbox:create] Error:", error);
    return NextResponse.json(
      { success: false, error: "Lỗi khởi tạo phòng Sandbox" },
      { status: 500 }
    );
  }
}
