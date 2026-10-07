import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateRoomCode, generateInviteUrl, generateCardDeck, shuffleArray } from "@/lib/utils";
import { GameMode } from "@/types";
import { getDefaultAllowedPowerupsForMode } from "@/lib/game-engine/powerups";

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
  wagerMultiplierCap: 2.5,
  wagerRoundsPerTeam: 2,
  wagerInitialPoints: 50,
  wagerBailoutLimit: 1,
  // Buzz defaults
  buzzUnlockMode: "AUTO",
  buzzAutoDelay: 3,
  initialTeamScore: 0,
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

    // Ensure Host user exists safely without ID collision
    let host = await prisma.user.findFirst({
      where: {
        OR: [
          { id: "demo-host-id" },
          { email: "demo.host@quizorra.com" },
          { email: "demo-host@quizorra.com" },
          { email: "demo-host@timeoutquiz.com" },
        ],
      },
    });

    if (!host) {
      host = await prisma.user.create({
        data: {
          id: "demo-host-id",
          email: "demo.host@quizorra.com",
          name: "Nguyễn Gia Khánh (Host)",
          role: "ADMIN",
        },
      });
    }

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

    // Prune stale sandbox test rooms older than 30 minutes to prevent database bloat
    try {
      const staleCutoff = new Date(Date.now() - 30 * 60 * 1000);
      const staleSandboxRooms = await prisma.room.findMany({
        where: {
          name: { startsWith: "[Sandbox]" },
          createdAt: { lte: staleCutoff },
        },
        select: { id: true },
      });
      const globalForSockets = globalThis as unknown as {
        cleanupRoomInMemory?: (roomId: string) => void;
      };
      for (const sr of staleSandboxRooms) {
        globalForSockets.cleanupRoomInMemory?.(sr.id);
        await prisma.room.delete({ where: { id: sr.id } }).catch(() => {});
      }
    } catch {}

    const modeAllowedPowerups = getDefaultAllowedPowerupsForMode(mode);
    const sandboxConfig = {
      ...DEFAULT_SANDBOX_CONFIG,
      allowedPowerups: modeAllowedPowerups,
    };

    const room = await prisma.room.create({
      data: {
        code,
        name: `[Sandbox] ${mode} - 4 Đội Test`,
        hostId: host.id,
        quizBankId: quizBank?.id || null,
        mode,
        teamMode: "TEAM",
        status: "LOBBY",
        config: sandboxConfig,
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
          score: mode === "DICE_RACE" ? 1 : Math.max(0, Number(sandboxConfig.initialTeamScore) || 0),
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
      { id: `sb_${code}_t0`, name: "Bạn (Tester)", teamIndex: 0 },
      { id: `bot_${code}_t2`, name: "Đội Lam 🤖", teamIndex: 1 },
      { id: `bot_${code}_t3`, name: "Đội Vàng 🤖", teamIndex: 2 },
      { id: `bot_${code}_t4`, name: "Đội Lục 🤖", teamIndex: 3 },
    ];

    const createdPlayers = [];
    for (const p of playerConfigs) {
      const player = await prisma.player.create({
        data: {
          id: p.id,
          name: p.name,
          roomId: room.id,
          teamId: createdTeams[p.teamIndex].id,
          isHost: false,
          score: mode === "DICE_RACE" ? 1 : Math.max(0, Number(sandboxConfig.initialTeamScore) || 0),
        },
      });
      createdPlayers.push(player);
    }

    // Distribute 2 random powerup cards per team matched strictly to mode
    const allowedTypes = modeAllowedPowerups;
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
  } catch (error: any) {
    console.error("[sandbox:create] Error:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Lỗi khởi tạo phòng Sandbox" },
      { status: 500 }
    );
  }
}

