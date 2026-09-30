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

// src/types/index.ts
var CARD_METADATA = {
  FIFTY_FIFTY: { emoji: "\u{1F500}", name: "50/50", nameVi: "50/50", description: "Remove 2 wrong answers", descriptionVi: "Lo\u1EA1i b\u1ECF 2 \u0111\xE1p \xE1n sai" },
  DOUBLE: { emoji: "\u2716\uFE0F2", name: "Double", nameVi: "Nh\xE2n \u0111\xF4i", description: "Double points next", descriptionVi: "Nh\xE2n \u0111\xF4i \u0111i\u1EC3m c\xE2u ti\u1EBFp theo" },
  FREEZE: { emoji: "\u2744\uFE0F", name: "Freeze", nameVi: "Phong t\u1ECFa", description: "Skip another team's turn", descriptionVi: "B\u1ECF qua l\u01B0\u1EE3t c\u1EE7a \u0111\u1ED9i kh\xE1c" },
  ATTACK: { emoji: "\u2694\uFE0F", name: "Attack", nameVi: "T\u1EA5n c\xF4ng", description: "Force team to answer", descriptionVi: "Ch\u1EC9 \u0111\u1ECBnh \u0111\u1ED9i kh\xE1c tr\u1EA3 l\u1EDDi, sai b\u1ECB tr\u1EEB" },
  SKIP: { emoji: "\u{1F504}", name: "Skip", nameVi: "\u0110\u1ED5i c\xE2u", description: "Replace question", descriptionVi: "\u0110\u1ED5i c\xE2u h\u1ECFi sang c\xE2u kh\xE1c" },
  TIME_PLUS: { emoji: "\u23F1\uFE0F", name: "Time+", nameVi: "Th\xEAm gi\u1EDD", description: "Add 15 seconds", descriptionVi: "Th\xEAm 15 gi\xE2y" },
  SHIELD: { emoji: "\u{1F6E1}\uFE0F", name: "Shield", nameVi: "T\xE1i sinh", description: "Protect from penalty once", descriptionVi: "B\u1EA3o v\u1EC7 kh\u1ECFi tr\u1EEB \u0111i\u1EC3m 1 l\u1EA7n" },
  STEAL: { emoji: "\u{1F4B8}", name: "Steal", nameVi: "C\u01B0\u1EDBp \u0111i\u1EC3m", description: "Steal points from leader", descriptionVi: "C\u01B0\u1EDBp \u0111i\u1EC3m c\u1EE7a \u0111\u1ED9i d\u1EABn \u0111\u1EA7u" },
  PENALTY: { emoji: "\u{1F4A5}", name: "Penalty", nameVi: "Ph\u1EA1t \u0111\xF4i", description: "Double penalty for target team", descriptionVi: "Nh\xE2n \u0111\xF4i \u0111i\u1EC3m tr\u1EEB c\u1EE7a \u0111\u1ED9i m\u1EE5c ti\xEAu" },
  SCORE_X2: { emoji: "\u2B50", name: "Score x2", nameVi: "x2 \u0111i\u1EC3m", description: "Correct=x2, Wrong=0 penalty", descriptionVi: "\u0110\xFAng x2 \u0111i\u1EC3m, sai kh\xF4ng b\u1ECB tr\u1EEB" }
};

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
function computeTeamQuestionScore(ctx) {
  const total = Math.max(1, ctx.totalOnlineMembers);
  const accuracyRatio = Math.min(1, Math.max(0, ctx.correctMembers / total));
  if (ctx.correctMembers === 0) {
    if (!ctx.config.penaltyForWrong || ctx.shielded) {
      return { points: 0, accuracyRatio: 0, speedBonus: 0, avgTimeSpent: 0 };
    }
    const pm = ctx.penaltyMultiplier ?? 1;
    const penalty = Math.floor(ctx.config.penaltyPoints * pm);
    return { points: -penalty, accuracyRatio: 0, speedBonus: 0, avgTimeSpent: 0 };
  }
  const avgTimeSpent = ctx.correctTimes.length > 0 ? ctx.correctTimes.reduce((a, b) => a + b, 0) / ctx.correctTimes.length : ctx.timeLimit * 1e3;
  let speedBonus = 0;
  if (ctx.config.timeBonusEnabled) {
    const remainingRatio = Math.max(0, 1 - avgTimeSpent / (ctx.timeLimit * 1e3));
    speedBonus = remainingRatio * 0.5;
  }
  const multiplier = ctx.multiplier ?? 1;
  const rawScore = ctx.basePoints * accuracyRatio * (1 + speedBonus) * multiplier;
  const points = Math.floor(rawScore);
  return { points, accuracyRatio, speedBonus, avgTimeSpent };
}
function computeStealAmount(leaderScore, stealerScore) {
  const diff = leaderScore - stealerScore;
  if (diff <= 0) return 0;
  return Math.floor(Math.min(diff * 0.2, leaderScore * 0.1, 50));
}

// src/lib/utils.ts
function shuffleArray(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// src/lib/socket-handlers.ts
var playerSockets = /* @__PURE__ */ new Map();
var roomTimers = /* @__PURE__ */ new Map();
var roomRemainingTimes = /* @__PURE__ */ new Map();
var roomQuestionTeamCards = /* @__PURE__ */ new Map();
var roomFrozenTeams = /* @__PURE__ */ new Map();
var roomFiftyFifty = /* @__PURE__ */ new Map();
var roomQuestionProcessed = /* @__PURE__ */ new Set();
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
      const qKey = `${room.id}:${questionId}`;
      if (player.teamId) {
        const frozenSet = roomFrozenTeams.get(qKey);
        if (frozenSet && frozenSet.has(player.teamId)) {
          socket.emit("error", "\u0110\u1ED9i c\u1EE7a b\u1EA1n \u0111ang b\u1ECB \u0111\xF3ng b\u0103ng \u1EDF c\xE2u n\xE0y n\xEAn kh\xF4ng th\u1EC3 n\u1ED9p \u0111\xE1p \xE1n!");
          return;
        }
      }
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
          isCorrect,
          pointsAwarded: points,
          timeSpent
        }
      });
      if (points !== 0) {
        await prisma.player.update({
          where: { id: playerId },
          data: { score: { increment: points } }
        });
        if (room.teamMode !== "TEAM" && player.teamId) {
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
      const player = await prisma.player.findUnique({
        where: { id: playerId },
        include: { room: { include: { quizBank: { include: { questions: { orderBy: { order: "asc" } } } } } }, team: true }
      });
      if (!player?.room || !player.team || !player.teamId) return;
      const room = player.room;
      if (room.status !== "PLAYING") return;
      const currentQ = room.quizBank?.questions[room.currentQuestion];
      const qKey = currentQ ? `${room.id}:${currentQ.id}` : "";
      if (room.teamMode === "TEAM" && qKey) {
        let teamCardsMap = roomQuestionTeamCards.get(qKey);
        if (!teamCardsMap) {
          teamCardsMap = /* @__PURE__ */ new Map();
          roomQuestionTeamCards.set(qKey, teamCardsMap);
        }
        const existingCard = teamCardsMap.get(player.teamId);
        if (existingCard) {
          socket.emit("error", `\u0110\u1ED3ng \u0111\u1ED9i ${existingCard.usedByPlayerName} \u0111\xE3 k\xEDch ho\u1EA1t th\u1EBB ${CARD_METADATA[existingCard.type]?.nameVi || existingCard.type} cho \u0111\u1ED9i \u1EDF c\xE2u n\xE0y r\u1ED3i!`);
          return;
        }
      }
      const card = await prisma.powerupCard.findUnique({ where: { id: cardId } });
      if (!card || card.used) {
        socket.emit("error", "Th\u1EBB n\xE0y \u0111\xE3 \u0111\u01B0\u1EE3c d\xF9ng ho\u1EB7c kh\xF4ng h\u1EE3p l\u1EC7!");
        return;
      }
      if (card.ownerType === "TEAM" && card.teamId !== player.teamId) {
        socket.emit("error", "Th\u1EBB n\xE0y kh\xF4ng thu\u1ED9c v\u1EC1 \u0111\u1ED9i c\u1EE7a b\u1EA1n!");
        return;
      }
      await prisma.powerupCard.update({
        where: { id: cardId },
        data: { used: true, usedAt: /* @__PURE__ */ new Date(), usedByTeamId: player.teamId }
      });
      if (room.teamMode === "TEAM" && qKey) {
        const teamCardsMap = roomQuestionTeamCards.get(qKey);
        teamCardsMap.set(player.teamId, {
          cardId,
          type: card.type,
          usedByPlayerId: player.id,
          usedByPlayerName: player.name,
          teamId: player.teamId,
          targetTeamId,
          appliedAt: Date.now()
        });
      }
      if (card.type === "FIFTY_FIFTY" && currentQ) {
        const options = currentQ.options;
        if (options && options.length > 2) {
          const wrongOpts = options.filter((o) => !o.isCorrect);
          const shuffledWrong = shuffleArray(wrongOpts).slice(0, 2);
          const hiddenIds = shuffledWrong.map((o) => o.id);
          let fMap = roomFiftyFifty.get(qKey);
          if (!fMap) {
            fMap = /* @__PURE__ */ new Map();
            roomFiftyFifty.set(qKey, fMap);
          }
          fMap.set(player.teamId, hiddenIds);
          io2.to(`room:${room.code}`).emit("game:fifty_fifty:applied", {
            teamId: player.teamId,
            hiddenOptionIds: hiddenIds
          });
        }
      } else if (card.type === "FREEZE" && targetTeamId && qKey) {
        let fSet = roomFrozenTeams.get(qKey);
        if (!fSet) {
          fSet = /* @__PURE__ */ new Set();
          roomFrozenTeams.set(qKey, fSet);
        }
        fSet.add(targetTeamId);
      } else if (card.type === "TIME_PLUS") {
        const tKey = `${room.id}:timer`;
        const curRem = roomRemainingTimes.get(tKey);
        if (curRem !== void 0) {
          const nextRem = curRem + 15;
          roomRemainingTimes.set(tKey, nextRem);
          io2.to(`room:${room.code}`).emit("game:timer", {
            remaining: nextRem,
            total: (currentQ?.timeLimit ?? 30) + 15
          });
        }
      } else if (card.type === "STEAL") {
        const teams = await prisma.team.findMany({
          where: { roomId: room.id },
          orderBy: { score: "desc" }
        });
        const leader = teams[0];
        if (leader && leader.id !== player.teamId) {
          const myTeam = teams.find((t) => t.id === player.teamId);
          const amount = computeStealAmount(leader.score, myTeam?.score ?? 0);
          if (amount > 0) {
            await prisma.team.update({ where: { id: leader.id }, data: { score: { decrement: amount } } });
            await prisma.team.update({ where: { id: player.teamId }, data: { score: { increment: amount } } });
            io2.to(`room:${room.code}`).emit("game:score:update", [
              { teamId: leader.id, score: leader.score - amount, delta: -amount },
              { teamId: player.teamId, score: (myTeam?.score ?? 0) + amount, delta: amount }
            ]);
          }
        }
      }
      await prisma.gameLog.create({
        data: {
          roomId: room.id,
          event: "powerup_used",
          payload: { cardId, type: card.type, usedByPlayerName: player.name, usedByTeamId: player.teamId, targetTeamId }
        }
      });
      io2.to(`room:${room.code}`).emit("game:powerup:used", {
        cardId,
        type: card.type,
        usedByTeamId: player.teamId,
        usedByName: `${player.name} (${player.team.name})`,
        targetTeamId,
        targetTeamName: void 0,
        effect: `${CARD_METADATA[card.type]?.nameVi || card.type} \u0111\xE3 \u0111\u01B0\u1EE3c k\xEDch ho\u1EA1t cho to\xE0n \u0111\u1ED9i!`
      });
      const state = await buildRoomState(room.id);
      io2.to(`room:${room.code}`).emit("room:state", state);
    });
    socket.on("admin:next", async () => {
      const playerId = playerSockets.get(socket.id);
      if (!playerId) return;
      const player = await prisma.player.findUnique({
        where: { id: playerId },
        include: { room: { include: { quizBank: { include: { questions: { orderBy: { order: "asc" } } } } } } }
      });
      if (!player?.room || !player.isHost) return;
      const room = player.room;
      const questions = room.quizBank?.questions ?? [];
      const nextIndex = room.status === "LOBBY" ? 0 : room.currentQuestion + 1;
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
      startQuestionTimer(io2, room.code, room.id, q.id, q.timeLimit);
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
      const player = await prisma.player.findUnique({
        where: { id: playerId },
        include: { room: { include: { quizBank: { include: { questions: { orderBy: { order: "asc" } } } } } } }
      });
      if (!player?.room || !player.isHost) return;
      const room = player.room;
      const q = room.quizBank?.questions[room.currentQuestion];
      if (!q) return;
      const key = `${room.id}:timer`;
      if (roomTimers.has(key)) {
        clearInterval(roomTimers.get(key));
        roomTimers.delete(key);
        roomRemainingTimes.delete(key);
      }
      const { teamScoresUpdates, teamSummaries } = await resolveQuestionTeamScores(io2, room.id, q.id);
      if (teamScoresUpdates.length > 0) {
        io2.to(`room:${room.code}`).emit("game:score:update", teamScoresUpdates);
      }
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
        })),
        teamSummaries: teamSummaries.length > 0 ? teamSummaries : void 0
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
async function resolveQuestionTeamScores(io2, roomId, questionId) {
  const qKey = `${roomId}:${questionId}`;
  if (roomQuestionProcessed.has(qKey)) {
    return { teamScoresUpdates: [], teamSummaries: [] };
  }
  roomQuestionProcessed.add(qKey);
  const room = await prisma.room.findUnique({
    where: { id: roomId },
    include: {
      teams: { include: { players: true } }
    }
  });
  if (!room || room.teamMode !== "TEAM") {
    return { teamScoresUpdates: [], teamSummaries: [] };
  }
  const question = await prisma.question.findUnique({ where: { id: questionId } });
  if (!question) {
    return { teamScoresUpdates: [], teamSummaries: [] };
  }
  const answers = await prisma.answer.findMany({
    where: { roomId, questionId },
    include: { player: true, team: true }
  });
  const teamCardsMap = roomQuestionTeamCards.get(qKey);
  const teamScoresUpdates = [];
  const teamSummaries = [];
  for (const team of room.teams) {
    const onlineMembers = team.players.filter((p) => !!p.socketId);
    const totalOnline = onlineMembers.length > 0 ? onlineMembers.length : team.players.length || 1;
    const teamAnswers = answers.filter((a) => a.teamId === team.id);
    const correctAnswers = teamAnswers.filter((a) => a.isCorrect === true);
    const correctTimes = correctAnswers.map((a) => a.timeSpent);
    const activeCard = teamCardsMap?.get(team.id);
    let multiplier = 1;
    let shielded = team.shieldCount > 0;
    if (activeCard) {
      if (activeCard.type === "DOUBLE" || activeCard.type === "SCORE_X2") {
        multiplier = 2;
      }
      if (activeCard.type === "SHIELD" || activeCard.type === "SCORE_X2") {
        shielded = true;
      }
    }
    let penaltyMultiplier = 1;
    if (teamCardsMap) {
      for (const [, otherCard] of teamCardsMap) {
        if (otherCard.type === "PENALTY" && otherCard.targetTeamId === team.id) {
          penaltyMultiplier = 2;
        }
      }
    }
    const { points: teamPoints, accuracyRatio, speedBonus } = computeTeamQuestionScore({
      basePoints: question.points,
      timeLimit: question.timeLimit,
      totalOnlineMembers: totalOnline,
      correctMembers: correctAnswers.length,
      correctTimes,
      config: room.config,
      multiplier,
      shielded,
      penaltyMultiplier
    });
    const updatedTeam = await prisma.team.update({
      where: { id: team.id },
      data: { score: { increment: teamPoints } }
    });
    teamScoresUpdates.push({
      teamId: team.id,
      score: updatedTeam.score,
      delta: teamPoints
    });
    teamSummaries.push({
      teamId: team.id,
      teamName: team.name,
      teamColor: team.color,
      totalOnlineMembers: totalOnline,
      correctMembers: correctAnswers.length,
      pointsAwarded: teamPoints,
      speedBonus: Math.round(speedBonus * 100),
      multiplier,
      activeCard: activeCard?.type
    });
  }
  return { teamScoresUpdates, teamSummaries };
}
function startQuestionTimer(io2, roomCode, roomId, questionId, timeLimit) {
  const key = `${roomId}:timer`;
  if (roomTimers.has(key)) clearInterval(roomTimers.get(key));
  roomRemainingTimes.set(key, timeLimit);
  roomTimers.set(key, setInterval(async () => {
    const cur = roomRemainingTimes.get(key) ?? timeLimit;
    const remaining = cur - 1;
    roomRemainingTimes.set(key, remaining);
    io2.to(`room:${roomCode}`).emit("game:timer", { remaining, total: timeLimit });
    if (remaining <= 0) {
      clearInterval(roomTimers.get(key));
      roomTimers.delete(key);
      roomRemainingTimes.delete(key);
      const { teamScoresUpdates } = await resolveQuestionTeamScores(io2, roomId, questionId);
      if (teamScoresUpdates.length > 0) {
        io2.to(`room:${roomCode}`).emit("game:score:update", teamScoresUpdates);
      }
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
