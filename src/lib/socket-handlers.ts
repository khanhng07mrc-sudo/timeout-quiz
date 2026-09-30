import { Server as SocketIOServer, Socket } from "socket.io";
import { prisma } from "./prisma";
import { ClientToServerEvents, ServerToClientEvents, RoomState, TeamState, PlayerState, QuestionState } from "@/types";
import { computePointsAwarded } from "./game-engine/scoring";
import { resolvePowerup } from "./game-engine/powerups";

type IO = SocketIOServer<ClientToServerEvents, ServerToClientEvents>;
type Sock = Socket<ClientToServerEvents, ServerToClientEvents>;

// In-memory session store (room code -> player socket map)
const playerSockets = new Map<string, string>(); // socketId -> playerId
const roomTimers = new Map<string, NodeJS.Timeout>(); // roomId -> timer

export function registerSocketHandlers(io: IO) {
  io.on("connection", (socket: Sock) => {
    console.log(`[Socket] Connected: ${socket.id}`);

    // ── Join Room ────────────────────────────────────────────────────────────
    socket.on("room:join", async ({ code, playerName, teamId }, callback) => {
      try {
        const room = await prisma.room.findUnique({
          where: { code },
          include: {
            teams: { include: { players: true, powerupCards: true } },
            players: true,
            powerupCards: { where: { teamId: null } },
          },
        });

        if (!room) {
          return callback({ success: false, error: "Room not found" });
        }
        if (room.status === "FINISHED") {
          return callback({ success: false, error: "Game already ended" });
        }

        // Upsert player
        const player = await prisma.player.upsert({
          where: { id: socket.id },
          create: {
            id: socket.id,
            name: playerName,
            socketId: socket.id,
            roomId: room.id,
            teamId: teamId ?? null,
          },
          update: {
            name: playerName,
            socketId: socket.id,
            teamId: teamId ?? null,
          },
        });

        playerSockets.set(socket.id, player.id);
        socket.join(`room:${code}`);
        socket.join(`room:${code}:players`);

        const roomState = await buildRoomState(room.id);
        // Notify others
        socket.to(`room:${code}`).emit("player:joined", {
          id: player.id,
          name: player.name,
          score: player.score,
          teamId: player.teamId ?? undefined,
          isHost: player.isHost,
          isOnline: true,
        });

        callback({ success: true, playerId: player.id, roomState });
      } catch (err) {
        console.error("[room:join]", err);
        callback({ success: false, error: "Server error" });
      }
    });

    // ── Display Join ────────────────────────────────────────────────────────
    socket.on("display:join", async (code) => {
      socket.join(`room:${code}`);
      socket.join(`room:${code}:display`);
      const room = await prisma.room.findUnique({ where: { code } });
      if (room) {
        const state = await buildRoomState(room.id);
        socket.emit("room:state", state);
      }
    });

    // ── Submit Answer ────────────────────────────────────────────────────────
    socket.on("game:answer:submit", async ({ questionId, answer }) => {
      const playerId = playerSockets.get(socket.id);
      if (!playerId) return;

      const player = await prisma.player.findUnique({
        where: { id: playerId },
        include: { room: true, team: true },
      });
      if (!player || !player.room) return;

      const room = player.room;
      if (room.status !== "PLAYING") return;

      const question = await prisma.question.findUnique({ where: { id: questionId } });
      if (!question) return;

      // Check if already answered
      const existing = await prisma.answer.findFirst({
        where: { roomId: room.id, questionId, playerId },
      });
      if (existing) return;

      const config = room.config as any;
      const timeSpent = Date.now() - (roomTimers.get(`${room.id}:startedAt`) ? parseInt(roomTimers.get(`${room.id}:startedAt`) as any) : Date.now());

      // Determine correctness
      let isCorrect = false;
      const options = question.options as any[] | null;
      if (question.type === "MC_SINGLE" || question.type === "TRUE_FALSE") {
        const correctOption = options?.find((o: any) => o.isCorrect);
        isCorrect = correctOption?.id === answer;
      } else if (question.type === "MC_MULTI") {
        const correctIds = options?.filter((o: any) => o.isCorrect).map((o: any) => o.id) ?? [];
        const submittedIds = Array.isArray(answer) ? answer : [answer];
        isCorrect = correctIds.length === submittedIds.length &&
          correctIds.every((id: string) => submittedIds.includes(id));
      } else if (question.type === "FILL_BLANK") {
        isCorrect = question.answer?.toLowerCase().trim() === (answer as string).toLowerCase().trim();
      } else if (question.type === "ESSAY") {
        isCorrect = null as any; // will be graded manually
      }

      const points = computePointsAwarded({
        basePoints: question.points,
        timeSpent,
        timeLimit: question.timeLimit,
        isCorrect: isCorrect ?? false,
        config: config,
      });

      await prisma.answer.create({
        data: {
          roomId: room.id,
          questionId,
          playerId,
          teamId: player.teamId ?? undefined,
          answer: Array.isArray(answer) ? answer : [answer],
          isCorrect: question.type === "ESSAY" ? null : isCorrect,
          pointsAwarded: question.type === "ESSAY" ? 0 : points,
          timeSpent,
        },
      });

      // Update score
      if (question.type !== "ESSAY" && points !== 0) {
        await prisma.player.update({
          where: { id: playerId },
          data: { score: { increment: points } },
        });
        if (player.teamId) {
          await prisma.team.update({
            where: { id: player.teamId },
            data: { score: { increment: points } },
          });
        }
      }

      // Broadcast score update
      const updatedPlayer = await prisma.player.findUnique({ where: { id: playerId } });
      io.to(`room:${room.code}`).emit("game:score:update", [
        { playerId, teamId: player.teamId ?? undefined, score: updatedPlayer!.score, delta: points },
      ]);
    });

    // ── Buzz ────────────────────────────────────────────────────────────────
    socket.on("game:buzz", async () => {
      const playerId = playerSockets.get(socket.id);
      if (!playerId) return;
      const player = await prisma.player.findUnique({ where: { id: playerId }, include: { room: true } });
      if (!player?.room) return;

      const buzzKey = `${player.room.id}:buzzed`;
      if (roomTimers.has(buzzKey)) return; // Already buzzed

      roomTimers.set(buzzKey, setTimeout(() => roomTimers.delete(buzzKey), 10000) as any);
      io.to(`room:${player.room.code}`).emit("game:buzz", {
        playerId,
        playerName: player.name,
        teamId: player.teamId ?? undefined,
      });
    });

    // ── Use Power-up ─────────────────────────────────────────────────────────
    socket.on("game:powerup:use", async ({ cardId, targetTeamId }) => {
      const playerId = playerSockets.get(socket.id);
      if (!playerId) return;

      const player = await prisma.player.findUnique({ where: { id: playerId }, include: { room: true, team: true } });
      if (!player?.room || !player.team) return;

      const card = await prisma.powerupCard.findUnique({ where: { id: cardId } });
      if (!card || card.used) return;
      if (card.ownerType === "TEAM" && card.teamId !== player.teamId) return;

      await prisma.powerupCard.update({
        where: { id: cardId },
        data: { used: true, usedAt: new Date(), usedByTeamId: player.teamId },
      });

      await prisma.gameLog.create({
        data: {
          roomId: player.room.id,
          event: "powerup_used",
          payload: { cardId, type: card.type, usedByTeamId: player.teamId, targetTeamId },
        },
      });

      io.to(`room:${player.room.code}`).emit("game:powerup:used", {
        cardId,
        type: card.type as any,
        usedByTeamId: player.teamId ?? undefined,
        usedByName: player.team.name,
        targetTeamId: targetTeamId,
        targetTeamName: undefined,
        effect: `${card.type} used by ${player.team.name}`,
      });

      // Refresh room state
      const state = await buildRoomState(player.room.id);
      io.to(`room:${player.room.code}`).emit("room:state", state);
    });

    // ── Admin Controls ───────────────────────────────────────────────────────
    socket.on("admin:next", async () => {
      const playerId = playerSockets.get(socket.id);
      if (!playerId) return;
      const player = await prisma.player.findUnique({ where: { id: playerId }, include: { room: { include: { quizBank: { include: { questions: { orderBy: { order: "asc" } } } } } } } });
      if (!player?.room || !player.isHost) return;

      const room = player.room;
      const questions = room.quizBank?.questions ?? [];
      const nextIndex = room.currentQuestion + 1;

      if (nextIndex >= questions.length) {
        // End game
        await prisma.room.update({ where: { id: room.id }, data: { status: "FINISHED", endedAt: new Date() } });
        const leaderboard = await buildLeaderboard(room.id);
        io.to(`room:${room.code}`).emit("game:ended", { leaderboard });
        return;
      }

      await prisma.room.update({ where: { id: room.id }, data: { currentQuestion: nextIndex, status: "PLAYING" } });
      const q = questions[nextIndex];
      const questionState = buildQuestionState(q);

      io.to(`room:${room.code}`).emit("game:question", questionState);
      startQuestionTimer(io, room.code, room.id, q.timeLimit);
    });

    socket.on("admin:pause", async () => {
      const playerId = playerSockets.get(socket.id);
      if (!playerId) return;
      const player = await prisma.player.findUnique({ where: { id: playerId }, include: { room: true } });
      if (!player?.room || !player.isHost) return;
      await prisma.room.update({ where: { id: player.room.id }, data: { status: "PAUSED" } });
      io.to(`room:${player.room.code}`).emit("game:paused");
    });

    socket.on("admin:resume", async () => {
      const playerId = playerSockets.get(socket.id);
      if (!playerId) return;
      const player = await prisma.player.findUnique({ where: { id: playerId }, include: { room: true } });
      if (!player?.room || !player.isHost) return;
      await prisma.room.update({ where: { id: player.room.id }, data: { status: "PLAYING" } });
      io.to(`room:${player.room.code}`).emit("game:resumed");
    });

    socket.on("admin:reveal", async () => {
      const playerId = playerSockets.get(socket.id);
      if (!playerId) return;
      const player = await prisma.player.findUnique({ where: { id: playerId }, include: { room: { include: { quizBank: { include: { questions: { orderBy: { order: "asc" } } } } } } } });
      if (!player?.room || !player.isHost) return;

      const room = player.room;
      const q = room.quizBank?.questions[room.currentQuestion];
      if (!q) return;

      const answers = await prisma.answer.findMany({
        where: { roomId: room.id, questionId: q.id },
        include: { player: true, team: true },
      });

      const options = q.options as any[] | null;
      const correctAnswer = options?.filter((o: any) => o.isCorrect).map((o: any) => o.id) ?? q.answer ?? "";

      io.to(`room:${room.code}`).emit("game:answer:reveal", {
        questionId: q.id,
        correctAnswer: Array.isArray(correctAnswer) ? correctAnswer : [correctAnswer as string],
        answers: answers.map((a) => ({
          teamId: a.teamId ?? undefined,
          playerId: a.playerId ?? undefined,
          name: a.player?.name ?? a.team?.name ?? "?",
          answer: a.answer as string[],
          isCorrect: a.isCorrect ?? false,
          pointsAwarded: a.pointsAwarded,
          timeSpent: a.timeSpent,
        })),
      });
    });

    socket.on("admin:score:manual", async ({ answerId, points }) => {
      const playerId = playerSockets.get(socket.id);
      if (!playerId) return;
      const player = await prisma.player.findUnique({ where: { id: playerId } });
      if (!player?.isHost) return;

      const answer = await prisma.answer.update({
        where: { id: answerId },
        data: { isCorrect: points > 0, pointsAwarded: points },
      });

      if (answer.playerId) {
        await prisma.player.update({ where: { id: answer.playerId }, data: { score: { increment: points } } });
      }
      if (answer.teamId) {
        await prisma.team.update({ where: { id: answer.teamId }, data: { score: { increment: points } } });
      }
    });

    socket.on("admin:shuffle:cards", async () => {
      const playerId = playerSockets.get(socket.id);
      if (!playerId) return;
      const player = await prisma.player.findUnique({ where: { id: playerId }, include: { room: true } });
      if (!player?.room || !player.isHost) return;
      const state = await buildRoomState(player.room.id);
      io.to(`room:${player.room.code}`).emit("room:state", state);
    });

    // ── Disconnect ────────────────────────────────────────────────────────────
    socket.on("disconnect", async () => {
      const playerId = playerSockets.get(socket.id);
      if (playerId) {
        const player = await prisma.player.findUnique({ where: { id: playerId }, include: { room: true } });
        if (player?.room) {
          io.to(`room:${player.room.code}`).emit("player:left", playerId);
        }
        await prisma.player.update({ where: { id: playerId }, data: { socketId: null } }).catch(() => {});
        playerSockets.delete(socket.id);
      }
    });
  });
}

// ── Helpers ────────────────────────────────────────────────────────────────────

async function buildRoomState(roomId: string): Promise<RoomState> {
  const room = await prisma.room.findUnique({
    where: { id: roomId },
    include: {
      teams: { include: { players: true, powerupCards: true } },
      players: true,
      powerupCards: { where: { ownerType: "SHARED" } },
    },
  });
  if (!room) throw new Error("Room not found");

  const config = room.config as any;

  const teams: TeamState[] = room.teams.map((t) => ({
    id: t.id,
    name: t.name,
    color: t.color,
    avatar: t.avatar ?? undefined,
    score: t.score,
    isEliminated: t.isEliminated,
    frozenRounds: t.frozenRounds,
    shieldCount: t.shieldCount,
    cards: t.powerupCards.map((c) => ({ id: c.id, type: c.type as any, ownerType: c.ownerType as any, teamId: c.teamId ?? undefined, used: c.used })),
    playerCount: t.players.length,
  }));

  const players: PlayerState[] = room.players.map((p) => ({
    id: p.id,
    name: p.name,
    avatar: p.avatar ?? undefined,
    score: p.score,
    teamId: p.teamId ?? undefined,
    isHost: p.isHost,
    isOnline: !!p.socketId,
  }));

  const sharedCards = room.powerupCards.map((c) => ({
    id: c.id,
    type: c.type as any,
    ownerType: c.ownerType as any,
    teamId: undefined,
    used: c.used,
  }));

  return {
    id: room.id,
    code: room.code,
    name: room.name,
    mode: room.mode as any,
    teamMode: room.teamMode as any,
    status: room.status as any,
    currentQuestionIndex: room.currentQuestion,
    totalQuestions: 0,
    teams,
    players,
    sharedCards,
    config: config,
  };
}

function buildQuestionState(q: any): QuestionState {
  const options = q.options as any[] | null;
  return {
    question: {
      id: q.id,
      type: q.type,
      content: q.content,
      options: options?.map(({ id, text }: any) => ({ id, text })),
      timeLimit: q.timeLimit,
      mediaUrl: q.mediaUrl,
      mediaType: q.mediaType,
      hint: q.hint,
      order: q.order,
      points: q.points,
    },
    timeLimit: q.timeLimit,
    startedAt: Date.now(),
    activeBoosts: [],
  };
}

function startQuestionTimer(io: IO, roomCode: string, roomId: string, timeLimit: number) {
  const key = `${roomId}:timer`;
  if (roomTimers.has(key)) clearInterval(roomTimers.get(key)!);

  let remaining = timeLimit;
  roomTimers.set(key, setInterval(() => {
    remaining--;
    io.to(`room:${roomCode}`).emit("game:timer", { remaining, total: timeLimit });
    if (remaining <= 0) {
      clearInterval(roomTimers.get(key)!);
      roomTimers.delete(key);
    }
  }, 1000) as unknown as NodeJS.Timeout);
}

async function buildLeaderboard(roomId: string) {
  const room = await prisma.room.findUnique({
    where: { id: roomId },
    include: {
      teams: true,
      players: true,
      answers: true,
    },
  });
  if (!room) return [];

  if (room.teamMode === "TEAM") {
    return room.teams
      .sort((a, b) => b.score - a.score)
      .map((t, i) => ({
        rank: i + 1,
        teamId: t.id,
        name: t.name,
        score: t.score,
        correctAnswers: room.answers.filter((a) => a.teamId === t.id && a.isCorrect).length,
        totalAnswers: room.answers.filter((a) => a.teamId === t.id).length,
      }));
  } else {
    return room.players
      .sort((a, b) => b.score - a.score)
      .map((p, i) => ({
        rank: i + 1,
        playerId: p.id,
        name: p.name,
        score: p.score,
        correctAnswers: room.answers.filter((a) => a.playerId === p.id && a.isCorrect).length,
        totalAnswers: room.answers.filter((a) => a.playerId === p.id).length,
      }));
  }
}
