"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_http = require("http");
var import_url = require("url");
var import_next = __toESM(require("next"));

// src/lib/socket-server.ts
var import_socket = require("socket.io");
var io;
function initSocketServer(httpServer) {
  if (io) return io;
  io = new import_socket.Server(httpServer, {
    cors: {
      origin: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
      methods: ["GET", "POST"],
      credentials: true
    },
    transports: ["websocket", "polling"],
    pingTimeout: 6e4,
    pingInterval: 25e3
  });
  return io;
}

// src/lib/prisma.ts
var import_client = require("@prisma/client");
var globalForPrisma = globalThis;
var prisma = globalForPrisma.prisma ?? new import_client.PrismaClient({
  log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"]
});
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

// src/lib/game-engine/scoring.ts
function computePointsAwarded(ctx) {
  if (!ctx.isCorrect) {
    if (!ctx.config.penaltyForWrong) return 0;
    const penalty = ctx.config.penaltyPoints;
    if (ctx.shielded) return 0;
    const pm = ctx.penaltyMultiplier ?? 1;
    return -Math.floor(penalty * pm);
  }
  let score = ctx.basePoints;
  if (ctx.config.timeBonusEnabled) {
    const remainingRatio = Math.max(
      0,
      1 - ctx.timeSpent / (ctx.timeLimit * 1e3)
    );
    const bonus = Math.floor(ctx.basePoints * 0.5 * remainingRatio);
    score += bonus;
  }
  const multiplier = ctx.multiplier ?? 1;
  return Math.floor(score * multiplier);
}

// src/lib/socket-handlers.ts
var playerSockets = /* @__PURE__ */ new Map();
var roomTimers = /* @__PURE__ */ new Map();
function registerSocketHandlers(io2) {
  io2.on("connection", (socket) => {
    console.log(`[Socket] Connected: ${socket.id}`);
    socket.on("room:join", async ({ code, playerName, teamId }, callback) => {
      try {
        const room = await prisma.room.findUnique({
          where: { code },
          include: {
            teams: { include: { players: true, powerupCards: true } },
            players: true,
            powerupCards: { where: { teamId: null } }
          }
        });
        if (!room) {
          return callback({ success: false, error: "Room not found" });
        }
        if (room.status === "FINISHED") {
          return callback({ success: false, error: "Game already ended" });
        }
        const player = await prisma.player.upsert({
          where: { id: socket.id },
          create: {
            id: socket.id,
            name: playerName,
            socketId: socket.id,
            roomId: room.id,
            teamId: teamId ?? null
          },
          update: {
            name: playerName,
            socketId: socket.id,
            teamId: teamId ?? null
          }
        });
        playerSockets.set(socket.id, player.id);
        socket.join(`room:${code}`);
        socket.join(`room:${code}:players`);
        const roomState = await buildRoomState(room.id);
        socket.to(`room:${code}`).emit("player:joined", {
          id: player.id,
          name: player.name,
          score: player.score,
          teamId: player.teamId ?? void 0,
          isHost: player.isHost,
          isOnline: true
        });
        callback({ success: true, playerId: player.id, roomState });
      } catch (err) {
        console.error("[room:join]", err);
        callback({ success: false, error: "Server error" });
      }
    });
    socket.on("display:join", async (code) => {
      socket.join(`room:${code}`);
      socket.join(`room:${code}:display`);
      const room = await prisma.room.findUnique({ where: { code } });
      if (room) {
        const state = await buildRoomState(room.id);
        socket.emit("room:state", state);
      }
    });
    socket.on("game:answer:submit", async ({ questionId, answer }) => {
      const playerId = playerSockets.get(socket.id);
      if (!playerId) return;
      const player = await prisma.player.findUnique({
        where: { id: playerId },
        include: { room: true, team: true }
      });
      if (!player || !player.room) return;
      const room = player.room;
      if (room.status !== "PLAYING") return;
      const question = await prisma.question.findUnique({ where: { id: questionId } });
      if (!question) return;
      const existing = await prisma.answer.findFirst({
        where: { roomId: room.id, questionId, playerId }
      });
      if (existing) return;
      const config = room.config;
      const timeSpent = Date.now() - (roomTimers.get(`${room.id}:startedAt`) ? parseInt(roomTimers.get(`${room.id}:startedAt`)) : Date.now());
      let isCorrect = false;
      const options = question.options;
      if (question.type === "MC_SINGLE" || question.type === "TRUE_FALSE") {
        const correctOption = options?.find((o) => o.isCorrect);
        isCorrect = correctOption?.id === answer;
      } else if (question.type === "MC_MULTI") {
        const correctIds = options?.filter((o) => o.isCorrect).map((o) => o.id) ?? [];
        const submittedIds = Array.isArray(answer) ? answer : [answer];
        isCorrect = correctIds.length === submittedIds.length && correctIds.every((id) => submittedIds.includes(id));
      } else if (question.type === "FILL_BLANK") {
        isCorrect = question.answer?.toLowerCase().trim() === answer.toLowerCase().trim();
      } else if (question.type === "ESSAY") {
        isCorrect = null;
      }
      const points = computePointsAwarded({
        basePoints: question.points,
        timeSpent,
        timeLimit: question.timeLimit,
        isCorrect: isCorrect ?? false,
        config
      });
      await prisma.answer.create({
        data: {
          roomId: room.id,
          questionId,
          playerId,
          teamId: player.teamId ?? void 0,
          answer: Array.isArray(answer) ? answer : [answer],
          isCorrect: question.type === "ESSAY" ? null : isCorrect,
          pointsAwarded: question.type === "ESSAY" ? 0 : points,
          timeSpent
        }
      });
      if (question.type !== "ESSAY" && points !== 0) {
        await prisma.player.update({
          where: { id: playerId },
          data: { score: { increment: points } }
        });
        if (player.teamId) {
          await prisma.team.update({
            where: { id: player.teamId },
            data: { score: { increment: points } }
          });
        }
      }
      const updatedPlayer = await prisma.player.findUnique({ where: { id: playerId } });
      io2.to(`room:${room.code}`).emit("game:score:update", [
        { playerId, teamId: player.teamId ?? void 0, score: updatedPlayer.score, delta: points }
      ]);
    });
    socket.on("game:buzz", async () => {
      const playerId = playerSockets.get(socket.id);
      if (!playerId) return;
      const player = await prisma.player.findUnique({ where: { id: playerId }, include: { room: true } });
      if (!player?.room) return;
      const buzzKey = `${player.room.id}:buzzed`;
      if (roomTimers.has(buzzKey)) return;
      roomTimers.set(buzzKey, setTimeout(() => roomTimers.delete(buzzKey), 1e4));
      io2.to(`room:${player.room.code}`).emit("game:buzz", {
        playerId,
        playerName: player.name,
        teamId: player.teamId ?? void 0
      });
    });
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
        data: { used: true, usedAt: /* @__PURE__ */ new Date(), usedByTeamId: player.teamId }
      });
      await prisma.gameLog.create({
        data: {
          roomId: player.room.id,
          event: "powerup_used",
          payload: { cardId, type: card.type, usedByTeamId: player.teamId, targetTeamId }
        }
      });
      io2.to(`room:${player.room.code}`).emit("game:powerup:used", {
        cardId,
        type: card.type,
        usedByTeamId: player.teamId ?? void 0,
        usedByName: player.team.name,
        targetTeamId,
        targetTeamName: void 0,
        effect: `${card.type} used by ${player.team.name}`
      });
      const state = await buildRoomState(player.room.id);
      io2.to(`room:${player.room.code}`).emit("room:state", state);
    });
    socket.on("admin:next", async () => {
      const playerId = playerSockets.get(socket.id);
      if (!playerId) return;
      const player = await prisma.player.findUnique({ where: { id: playerId }, include: { room: { include: { quizBank: { include: { questions: { orderBy: { order: "asc" } } } } } } } });
      if (!player?.room || !player.isHost) return;
      const room = player.room;
      const questions = room.quizBank?.questions ?? [];
      const nextIndex = room.currentQuestion + 1;
      if (nextIndex >= questions.length) {
        await prisma.room.update({ where: { id: room.id }, data: { status: "FINISHED", endedAt: /* @__PURE__ */ new Date() } });
        const leaderboard = await buildLeaderboard(room.id);
        io2.to(`room:${room.code}`).emit("game:ended", { leaderboard });
        return;
      }
      await prisma.room.update({ where: { id: room.id }, data: { currentQuestion: nextIndex, status: "PLAYING" } });
      const q = questions[nextIndex];
      const questionState = buildQuestionState(q);
      io2.to(`room:${room.code}`).emit("game:question", questionState);
      startQuestionTimer(io2, room.code, room.id, q.timeLimit);
    });
    socket.on("admin:pause", async () => {
      const playerId = playerSockets.get(socket.id);
      if (!playerId) return;
      const player = await prisma.player.findUnique({ where: { id: playerId }, include: { room: true } });
      if (!player?.room || !player.isHost) return;
      await prisma.room.update({ where: { id: player.room.id }, data: { status: "PAUSED" } });
      io2.to(`room:${player.room.code}`).emit("game:paused");
    });
    socket.on("admin:resume", async () => {
      const playerId = playerSockets.get(socket.id);
      if (!playerId) return;
      const player = await prisma.player.findUnique({ where: { id: playerId }, include: { room: true } });
      if (!player?.room || !player.isHost) return;
      await prisma.room.update({ where: { id: player.room.id }, data: { status: "PLAYING" } });
      io2.to(`room:${player.room.code}`).emit("game:resumed");
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
        include: { player: true, team: true }
      });
      const options = q.options;
      const correctAnswer = options?.filter((o) => o.isCorrect).map((o) => o.id) ?? q.answer ?? "";
      io2.to(`room:${room.code}`).emit("game:answer:reveal", {
        questionId: q.id,
        correctAnswer: Array.isArray(correctAnswer) ? correctAnswer : [correctAnswer],
        answers: answers.map((a) => ({
          teamId: a.teamId ?? void 0,
          playerId: a.playerId ?? void 0,
          name: a.player?.name ?? a.team?.name ?? "?",
          answer: a.answer,
          isCorrect: a.isCorrect ?? false,
          pointsAwarded: a.pointsAwarded,
          timeSpent: a.timeSpent
        }))
      });
    });
    socket.on("admin:score:manual", async ({ answerId, points }) => {
      const playerId = playerSockets.get(socket.id);
      if (!playerId) return;
      const player = await prisma.player.findUnique({ where: { id: playerId } });
      if (!player?.isHost) return;
      const answer = await prisma.answer.update({
        where: { id: answerId },
        data: { isCorrect: points > 0, pointsAwarded: points }
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
      io2.to(`room:${player.room.code}`).emit("room:state", state);
    });
    socket.on("disconnect", async () => {
      const playerId = playerSockets.get(socket.id);
      if (playerId) {
        const player = await prisma.player.findUnique({ where: { id: playerId }, include: { room: true } });
        if (player?.room) {
          io2.to(`room:${player.room.code}`).emit("player:left", playerId);
        }
        await prisma.player.update({ where: { id: playerId }, data: { socketId: null } }).catch(() => {
        });
        playerSockets.delete(socket.id);
      }
    });
  });
}
async function buildRoomState(roomId) {
  const room = await prisma.room.findUnique({
    where: { id: roomId },
    include: {
      teams: { include: { players: true, powerupCards: true } },
      players: true,
      powerupCards: { where: { ownerType: "SHARED" } }
    }
  });
  if (!room) throw new Error("Room not found");
  const config = room.config;
  const teams = room.teams.map((t) => ({
    id: t.id,
    name: t.name,
    color: t.color,
    avatar: t.avatar ?? void 0,
    score: t.score,
    isEliminated: t.isEliminated,
    frozenRounds: t.frozenRounds,
    shieldCount: t.shieldCount,
    cards: t.powerupCards.map((c) => ({ id: c.id, type: c.type, ownerType: c.ownerType, teamId: c.teamId ?? void 0, used: c.used })),
    playerCount: t.players.length
  }));
  const players = room.players.map((p) => ({
    id: p.id,
    name: p.name,
    avatar: p.avatar ?? void 0,
    score: p.score,
    teamId: p.teamId ?? void 0,
    isHost: p.isHost,
    isOnline: !!p.socketId
  }));
  const sharedCards = room.powerupCards.map((c) => ({
    id: c.id,
    type: c.type,
    ownerType: c.ownerType,
    teamId: void 0,
    used: c.used
  }));
  return {
    id: room.id,
    code: room.code,
    name: room.name,
    mode: room.mode,
    teamMode: room.teamMode,
    status: room.status,
    currentQuestionIndex: room.currentQuestion,
    totalQuestions: 0,
    teams,
    players,
    sharedCards,
    config
  };
}
function buildQuestionState(q) {
  const options = q.options;
  return {
    question: {
      id: q.id,
      type: q.type,
      content: q.content,
      options: options?.map(({ id, text }) => ({ id, text })),
      timeLimit: q.timeLimit,
      mediaUrl: q.mediaUrl,
      mediaType: q.mediaType,
      hint: q.hint,
      order: q.order,
      points: q.points
    },
    timeLimit: q.timeLimit,
    startedAt: Date.now(),
    activeBoosts: []
  };
}
function startQuestionTimer(io2, roomCode, roomId, timeLimit) {
  const key = `${roomId}:timer`;
  if (roomTimers.has(key)) clearInterval(roomTimers.get(key));
  let remaining = timeLimit;
  roomTimers.set(key, setInterval(() => {
    remaining--;
    io2.to(`room:${roomCode}`).emit("game:timer", { remaining, total: timeLimit });
    if (remaining <= 0) {
      clearInterval(roomTimers.get(key));
      roomTimers.delete(key);
    }
  }, 1e3));
}
async function buildLeaderboard(roomId) {
  const room = await prisma.room.findUnique({
    where: { id: roomId },
    include: {
      teams: true,
      players: true,
      answers: true
    }
  });
  if (!room) return [];
  if (room.teamMode === "TEAM") {
    return room.teams.sort((a, b) => b.score - a.score).map((t, i) => ({
      rank: i + 1,
      teamId: t.id,
      name: t.name,
      score: t.score,
      correctAnswers: room.answers.filter((a) => a.teamId === t.id && a.isCorrect).length,
      totalAnswers: room.answers.filter((a) => a.teamId === t.id).length
    }));
  } else {
    return room.players.sort((a, b) => b.score - a.score).map((p, i) => ({
      rank: i + 1,
      playerId: p.id,
      name: p.name,
      score: p.score,
      correctAnswers: room.answers.filter((a) => a.playerId === p.id && a.isCorrect).length,
      totalAnswers: room.answers.filter((a) => a.playerId === p.id).length
    }));
  }
}

// server.ts
var dev = process.env.NODE_ENV !== "production";
var hostname = process.env.HOSTNAME || "0.0.0.0";
var port = parseInt(process.env.PORT ?? "3000", 10);
var app = (0, import_next.default)({ dev, hostname, port });
var handle = app.getRequestHandler();
app.prepare().then(() => {
  const httpServer = (0, import_http.createServer)(async (req, res) => {
    try {
      const parsedUrl = (0, import_url.parse)(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error("Error occurred handling", req.url, err);
      res.statusCode = 500;
      res.end("internal server error");
    }
  });
  const io2 = initSocketServer(httpServer);
  registerSocketHandlers(io2);
  httpServer.listen(port, "0.0.0.0", () => {
    console.log(`> Ready on http://${hostname}:${port}`);
    console.log(`> Socket.IO server initialized`);
  });
});
