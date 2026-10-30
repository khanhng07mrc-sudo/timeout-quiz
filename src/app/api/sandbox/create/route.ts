import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateRoomCode, generateInviteUrl, generateCardDeck, shuffleArray } from "@/lib/utils";
import { generateHostKey, getCurrentUserFromRequest } from "@/lib/security";
import { GameMode } from "@/types";
import { getDefaultAllowedPowerupsForMode, distributeCategorizedCardsToTeams } from "@/lib/game-engine/powerups";
import { calculateModeDerivedConfig } from "@/lib/game-engine/question-allocator";
import { MODE_DISPLAY_NAMES } from "@/lib/game-engine/game-modes-meta";
import { ensureQuizBankExists } from "@/lib/quiz-bank-seeder";
import { SAMPLE_QUESTION_SET } from "@/lib/olympia/sample-questions";

const DEFAULT_SANDBOX_CONFIG = {
  powerupEnabled: true,
  powerupOwnerType: "TEAM",
  powerupCountPerTeam: 2,
  powerupCountShared: 0,
  maxHandSize: 3,
  sharedPowerupTeamQuota: 2,
  sharedPowerupProbability: 0.10,
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
  mysteryQuestTurnsPerTeam: 2,
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

    let customQuizBankTitle: string | undefined = body.quizBankTitle;
    let quizBank = null;
    let quizBankTitle = "Mặc định";

    if (mode === "OLYMPIA") {
      const oRuleset = body.config?.olympia?.rulesetId || "O26";
      quizBankTitle = customQuizBankTitle || `Đề Thi Olympia (${oRuleset})`;
    } else {
      // If quiz bank specified, ensure it exists (auto-seeding preset if necessary)
      if (quizBankId) {
        quizBankId = (await ensureQuizBankExists(quizBankId)) || quizBankId;
      }

      quizBank = quizBankId
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

      quizBankTitle = customQuizBankTitle || quizBank?.title || "Mặc định";
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
      ...(body.config || {}),
      isSandbox: true,
    };

    if (mode === "MYSTERY_QUEST" || mode === "OLYMPIA") {
      sandboxConfig.powerupEnabled = false;
      sandboxConfig.allowedPowerups = [];
    }

    const TEAM_PALETTE = ["#ef4444", "#3b82f6", "#eab308", "#10b981", "#a855f7", "#ec4899", "#06b6d4", "#f97316"];
    const inputTeams = (Array.isArray(body.teams) && body.teams.length >= 2)
      ? body.teams.slice(0, 10)
      : DEFAULT_TEAMS;
    const teamCount = inputTeams.length;
    sandboxConfig.maxTeams = teamCount;

    if (mode === "OLYMPIA") {
      (sandboxConfig as any).olympia = {
        rulesetId: body.config?.olympia?.rulesetId || "O26",
        rounds: body.config?.olympia?.rounds || ["khoiDong", "vcnv", "tangToc", "veDich"],
        questionSet: body.config?.olympia?.questionSet || SAMPLE_QUESTION_SET,
        seatCount: teamCount,
        teams: inputTeams,
        playIntroOnCreate: body.config?.olympia?.playIntroOnCreate !== false,
      };
    }

    if (body.matchMaxQuestions || body.config?.matchMaxQuestions) {
      const maxQ = Number(body.matchMaxQuestions || body.config?.matchMaxQuestions);
      if (maxQ > 0) {
        const derived = calculateModeDerivedConfig(mode, maxQ, teamCount);
        if (derived.mysteryQuestTurnsPerTeam) sandboxConfig.mysteryQuestTurnsPerTeam = derived.mysteryQuestTurnsPerTeam;
        if (derived.wagerRoundsPerTeam) sandboxConfig.wagerRoundsPerTeam = derived.wagerRoundsPerTeam;
        if (derived.bouncebackCycles) sandboxConfig.bouncebackCycles = derived.bouncebackCycles;
        if (derived.eliminationIntervalQuestions) sandboxConfig.eliminationIntervalQuestions = derived.eliminationIntervalQuestions;
        if (derived.tournamentQuestionsPerMatch) sandboxConfig.tournamentQuestionsPerMatch = derived.tournamentQuestionsPerMatch;
        if (derived.gridMaxQuestions) sandboxConfig.gridMaxQuestions = derived.gridMaxQuestions;
        if (derived.diceRaceMaxQuestions) sandboxConfig.diceRaceMaxQuestions = derived.diceRaceMaxQuestions;
        sandboxConfig.matchMaxQuestions = derived.matchMaxQuestions;
      }
    }

    const hostKey = generateHostKey();
    const currentUser = getCurrentUserFromRequest(req);
    let effectiveHostId = host.id;
    if (currentUser?.userId && currentUser.userId !== "master-admin") {
      const existingUser = await prisma.user.findUnique({ where: { id: currentUser.userId } });
      if (existingUser) {
        effectiveHostId = existingUser.id;
      }
    }

    let room;
    const cleanName = MODE_DISPLAY_NAMES[mode] || mode;
    try {
      room = await prisma.room.create({
        data: {
          code,
          name: `[Sandbox] ${cleanName} (${teamCount} Đội)`,
          hostId: effectiveHostId,
          hostKey,
          quizBankId: quizBank?.id || null,
          mode,
          teamMode: "TEAM",
          status: "LOBBY",
          config: sandboxConfig,
          inviteUrl,
        },
      });
    } catch (createErr: any) {
      if (String(createErr).includes("GameMode") || String(createErr).includes("22P02")) {
        await prisma.$executeRawUnsafe(`ALTER TYPE "GameMode" ADD VALUE IF NOT EXISTS '${mode}'`).catch(() => {});
        room = await prisma.room.create({
          data: {
            code,
            name: `[Sandbox] ${cleanName} (${teamCount} Đội)`,
            hostId: effectiveHostId,
            hostKey,
            quizBankId: quizBank?.id || null,
            mode,
            teamMode: "TEAM",
            status: "LOBBY",
            config: sandboxConfig,
            inviteUrl,
          },
        });
      } else {
        throw createErr;
      }
    }

    // Create teams dynamically
    const createdTeams = [];
    for (let i = 0; i < inputTeams.length; i++) {
      const t = inputTeams[i];
      const team = await prisma.team.create({
        data: {
          name: t.name || `Đội ${i + 1}`,
          color: t.color || TEAM_PALETTE[i % TEAM_PALETTE.length],
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

    // Create Players for the teams (Player 0 is Human Tester, Players 1..N-1 are Bots)
    const playerConfigs = createdTeams.map((t, idx) => ({
      id: idx === 0 ? `sb_${code}_t0` : `bot_${code}_t${idx + 1}`,
      name: idx === 0 ? "Bạn (Tester)" : `${t.name} 🤖`,
      teamIndex: idx,
    }));

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

    // Distribute 2 categorized powerup cards per team matched strictly to mode (MYSTERY_QUEST / OLYMPIA have NO powerups)
    if (mode !== "MYSTERY_QUEST" && mode !== "OLYMPIA") {
      const allowedTypes = modeAllowedPowerups;
      const teamIds = createdTeams.map((t) => t.id);
      const cardsMap = distributeCategorizedCardsToTeams(teamIds, allowedTypes as any, 2, 2);
      for (const team of createdTeams) {
        const cards = cardsMap.get(team.id) || [];
        if (cards.length > 0) {
          await prisma.powerupCard.createMany({
            data: cards.map((type) => ({
              type: type as any,
              ownerType: "TEAM",
              roomId: room.id,
              teamId: team.id,
            })),
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      code: room.code,
      roomId: room.id,
      name: room.name,
      hostKey,
      mode: room.mode,
      quizBankTitle,
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

