import { Server as SocketIOServer, Socket } from "socket.io";
import { prisma } from "./prisma";
import {
  ClientToServerEvents,
  ServerToClientEvents,
  RoomState,
  TeamState,
  PlayerState,
  QuestionState,
  CardType,
  CARD_METADATA,
  TeamRevealSummary,
  ScoreUpdate,
  BloomLevel,
  getBloomLevelFromPoints,
} from "@/types";
import { computePointsAwarded, computeTeamQuestionScore, computeStealAmount } from "./game-engine/scoring";
import { shuffleArray } from "./utils";

type IO = SocketIOServer<ClientToServerEvents, ServerToClientEvents>;
type Sock = Socket<ClientToServerEvents, ServerToClientEvents>;

interface ActiveTeamCard {
  cardId: string;
  type: CardType;
  usedByPlayerId: string;
  usedByPlayerName: string;
  teamId: string;
  targetTeamId?: string;
  appliedAt: number;
}

// In-memory session store
const playerSockets = new Map<string, string>(); // socketId -> playerId
const roomTimers = new Map<string, NodeJS.Timeout>(); // roomId -> timer
const roomRemainingTimes = new Map<string, number>(); // roomId -> remaining seconds
const roomQuestionTeamCards = new Map<string, Map<string, ActiveTeamCard>>(); // qKey -> Map(teamId -> ActiveTeamCard)
const roomFrozenTeams = new Map<string, Set<string>>(); // qKey -> Set(teamId)
const roomFiftyFifty = new Map<string, Map<string, string[]>>(); // qKey -> Map(teamId -> hiddenOptionIds[])
const roomQuestionProcessed = new Set<string>(); // qKey to prevent double team scoring

// Mode-specific in-memory states
const roomPrimaryTeams = new Map<string, { teamId: string; teamName: string }>(); // qKey -> primaryTeam in BOUNCEBACK
const roomStealPhase = new Map<string, boolean>(); // qKey -> whether 5s steal buzz window is open
const roomStealBuzzed = new Map<string, { teamId: string; teamName: string; playerId: string; playerName: string }>(); // qKey -> steal buzz
const roomStealTimer = new Map<string, NodeJS.Timeout>(); // qKey -> 5s buzzer timer
const roomBuzzFirst = new Map<string, { teamId: string; teamName: string; playerId: string; playerName: string }>(); // qKey -> first buzz in BUZZ mode

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

    // ── Submit Answer (Player Device) ─────────────────────────────────────────
    socket.on("game:answer:submit", async ({ questionId, answer }) => {
      const playerId = playerSockets.get(socket.id);
      if (!playerId) return;

      const player = await prisma.player.findUnique({
        where: { id: playerId },
        include: { room: true, team: true },
      });
      if (!player || !player.room) return;

      await processAnswerSubmission({
        io,
        roomId: player.room.id,
        questionId,
        playerId,
        teamId: player.teamId ?? undefined,
        answer,
        isAdminOverride: false,
        socket,
      });
    });

    // ── Admin Submit Answer (MC Mode / Override / After Timeout) ──────────────
    socket.on("admin:submit:answer", async ({ questionId, teamId, playerId, answer }) => {
      const hostPlayerId = playerSockets.get(socket.id);
      if (!hostPlayerId) return;
      const hostPlayer = await prisma.player.findUnique({ where: { id: hostPlayerId }, include: { room: true } });
      if (!hostPlayer?.room || !hostPlayer.isHost) return;

      const room = hostPlayer.room;
      const qKey = `${room.id}:${questionId}`;

      let effTeamId = teamId;
      let effPlayerId = playerId;

      if (room.mode === "BOUNCEBACK") {
        const steal = roomStealBuzzed.get(qKey);
        const primary = roomPrimaryTeams.get(qKey);
        if (steal) {
          effTeamId = steal.teamId;
          effPlayerId = steal.playerId;
        } else if (primary) {
          effTeamId = primary.teamId;
        }
      } else if (room.mode === "BUZZ") {
        const buzz = roomBuzzFirst.get(qKey);
        if (buzz) {
          effTeamId = buzz.teamId;
          effPlayerId = buzz.playerId;
        }
      }

      await processAnswerSubmission({
        io,
        roomId: room.id,
        questionId,
        playerId: effPlayerId,
        teamId: effTeamId,
        answer,
        isAdminOverride: true,
        socket,
      });
    });

    // ── Buzz ────────────────────────────────────────────────────────────────
    socket.on("game:buzz", async () => {
      const playerId = playerSockets.get(socket.id);
      if (!playerId) return;
      const player = await prisma.player.findUnique({
        where: { id: playerId },
        include: { room: true, team: true },
      });
      if (!player?.room || player.room.status !== "PLAYING") return;

      const room = player.room;
      const questions = await getRoomQuestions(room.id);
      const currentQ = questions[room.currentQuestion];
      if (!currentQ) return;
      const qKey = `${room.id}:${currentQ.id}`;

      if (room.mode === "BUZZ") {
        // Only accept the very first buzz
        if (roomBuzzFirst.has(qKey)) return;

        const teamId = player.teamId ?? player.id;
        const teamName = player.team?.name ?? player.name;
        const buzzInfo = { teamId, teamName, playerId, playerName: player.name };
        roomBuzzFirst.set(qKey, buzzInfo);

        // Pause standard question timer
        stopQuestionTimer(room.id);

        io.to(`room:${room.code}`).emit("game:buzz", {
          playerId,
          playerName: player.name,
          teamId: player.teamId ?? undefined,
          teamName,
        });
      } else if (room.mode === "BOUNCEBACK") {
        // Must be in the 5s steal buzz window
        if (!roomStealPhase.get(qKey)) return;

        // Primary team cannot steal their own question!
        const primary = roomPrimaryTeams.get(qKey);
        if (player.teamId && primary && player.teamId === primary.teamId) {
          socket.emit("error", "Đội của bạn là đội trả lời chính, không thể cướp lượt câu này!");
          return;
        }

        // Only first steal buzz wins
        if (roomStealBuzzed.has(qKey)) return;

        // Cancel the 5s timer
        if (roomStealTimer.has(qKey)) {
          clearTimeout(roomStealTimer.get(qKey)!);
          roomStealTimer.delete(qKey);
        }
        roomStealPhase.set(qKey, false);

        const teamId = player.teamId ?? player.id;
        const teamName = player.team?.name ?? player.name;
        const stealInfo = { teamId, teamName, playerId, playerName: player.name };
        roomStealBuzzed.set(qKey, stealInfo);

        io.to(`room:${room.code}`).emit("game:bounceback:steal_buzzed", stealInfo);
      }
    });

    // ── Admin: Buzz Start Answer ──────────────────────────────────────────────
    socket.on("admin:buzz:start_answer", async () => {
      const playerId = playerSockets.get(socket.id);
      if (!playerId) return;
      const player = await prisma.player.findUnique({ where: { id: playerId }, include: { room: true } });
      if (!player?.room || !player.isHost) return;

      const room = player.room;
      const questions = await getRoomQuestions(room.id);
      const currentQ = questions[room.currentQuestion];
      if (!currentQ) return;
      const qKey = `${room.id}:${currentQ.id}`;

      const buzz = roomBuzzFirst.get(qKey);
      if (!buzz) return;

      const timeLimit = 15;
      io.to(`room:${room.code}`).emit("game:buzz:answering", {
        teamId: buzz.teamId,
        teamName: buzz.teamName,
        timeLimit,
      });
      startQuestionTimer(io, room.code, room.id, currentQ.id, timeLimit);
    });

    // ── Admin: Bounceback Open Steal (5s buzzer) ──────────────────────────────
    socket.on("admin:bounceback:open_steal", async () => {
      const playerId = playerSockets.get(socket.id);
      if (!playerId) return;
      const player = await prisma.player.findUnique({ where: { id: playerId }, include: { room: true } });
      if (!player?.room || !player.isHost) return;

      const room = player.room;
      const questions = await getRoomQuestions(room.id);
      const currentQ = questions[room.currentQuestion];
      if (!currentQ) return;
      const qKey = `${room.id}:${currentQ.id}`;

      roomStealPhase.set(qKey, true);
      const timeLimit = 5;
      io.to(`room:${room.code}`).emit("game:bounceback:open_steal", {
        questionId: currentQ.id,
        timeLimit,
      });

      const timer = setTimeout(() => {
        roomStealPhase.set(qKey, false);
        roomStealTimer.delete(qKey);
        io.to(`room:${room.code}`).emit("game:buzz:closed");
      }, 5000);
      roomStealTimer.set(qKey, timer);
    });

    // ── Admin: Bounceback Start Steal Answer (15s) ─────────────────────────────
    socket.on("admin:bounceback:start_steal_answer", async () => {
      const playerId = playerSockets.get(socket.id);
      if (!playerId) return;
      const player = await prisma.player.findUnique({ where: { id: playerId }, include: { room: true } });
      if (!player?.room || !player.isHost) return;

      const room = player.room;
      const questions = await getRoomQuestions(room.id);
      const currentQ = questions[room.currentQuestion];
      if (!currentQ) return;
      const qKey = `${room.id}:${currentQ.id}`;

      const steal = roomStealBuzzed.get(qKey);
      if (!steal) return;

      const timeLimit = 15;
      io.to(`room:${room.code}`).emit("game:bounceback:steal_answering", {
        teamId: steal.teamId,
        teamName: steal.teamName,
        timeLimit,
      });
      startQuestionTimer(io, room.code, room.id, currentQ.id, timeLimit);
    });

    // ── Use Power-up ─────────────────────────────────────────────────────────
    socket.on("game:powerup:use", async ({ cardId, targetTeamId }) => {
      const playerId = playerSockets.get(socket.id);
      if (!playerId) return;

      const player = await prisma.player.findUnique({
        where: { id: playerId },
        include: { room: { include: { quizBank: { include: { questions: { orderBy: { order: "asc" } } } } } }, team: true },
      });
      if (!player?.room || !player.team || !player.teamId) return;

      const room = player.room;
      if (room.status !== "PLAYING") return;

      const currentQ = room.quizBank?.questions[room.currentQuestion];
      const qKey = currentQ ? `${room.id}:${currentQ.id}` : "";

      if (room.teamMode === "TEAM" && qKey) {
        let teamCardsMap = roomQuestionTeamCards.get(qKey);
        if (!teamCardsMap) {
          teamCardsMap = new Map();
          roomQuestionTeamCards.set(qKey, teamCardsMap);
        }

        const existingCard = teamCardsMap.get(player.teamId);
        if (existingCard) {
          socket.emit("error", `Đồng đội ${existingCard.usedByPlayerName} đã kích hoạt thẻ ${CARD_METADATA[existingCard.type]?.nameVi || existingCard.type} cho đội ở câu này rồi!`);
          return;
        }
      }

      const card = await prisma.powerupCard.findUnique({ where: { id: cardId } });
      if (!card || card.used) {
        socket.emit("error", "Thẻ này đã được dùng hoặc không hợp lệ!");
        return;
      }
      if (card.ownerType === "TEAM" && card.teamId !== player.teamId) {
        socket.emit("error", "Thẻ này không thuộc về đội của bạn!");
        return;
      }

      await prisma.powerupCard.update({
        where: { id: cardId },
        data: { used: true, usedAt: new Date(), usedByTeamId: player.teamId },
      });

      if (room.teamMode === "TEAM" && qKey) {
        const teamCardsMap = roomQuestionTeamCards.get(qKey)!;
        teamCardsMap.set(player.teamId, {
          cardId,
          type: card.type as CardType,
          usedByPlayerId: player.id,
          usedByPlayerName: player.name,
          teamId: player.teamId,
          targetTeamId,
          appliedAt: Date.now(),
        });
      }

      // Handle card effects
      if (card.type === "FIFTY_FIFTY" && currentQ) {
        const options = currentQ.options as any[] | null;
        if (options && options.length > 2) {
          const wrongOpts = options.filter((o: any) => !o.isCorrect);
          const shuffledWrong = shuffleArray(wrongOpts).slice(0, 2);
          const hiddenIds = shuffledWrong.map((o: any) => o.id);

          let fMap = roomFiftyFifty.get(qKey);
          if (!fMap) {
            fMap = new Map();
            roomFiftyFifty.set(qKey, fMap);
          }
          fMap.set(player.teamId, hiddenIds);

          io.to(`room:${room.code}`).emit("game:fifty_fifty:applied", {
            teamId: player.teamId,
            hiddenOptionIds: hiddenIds,
          });
        }
      } else if (card.type === "FREEZE" && targetTeamId && qKey) {
        let fSet = roomFrozenTeams.get(qKey);
        if (!fSet) {
          fSet = new Set();
          roomFrozenTeams.set(qKey, fSet);
        }
        fSet.add(targetTeamId);
      } else if (card.type === "TIME_PLUS") {
        const tKey = `${room.id}:timer`;
        const curRem = roomRemainingTimes.get(tKey);
        if (curRem !== undefined) {
          const nextRem = curRem + 15;
          roomRemainingTimes.set(tKey, nextRem);
          io.to(`room:${room.code}`).emit("game:timer", {
            remaining: nextRem,
            total: (currentQ?.timeLimit ?? 30) + 15,
          });
        }
      } else if (card.type === "STEAL") {
        const teams = await prisma.team.findMany({
          where: { roomId: room.id },
          orderBy: { score: "desc" },
        });
        const leader = teams[0];
        if (leader && leader.id !== player.teamId) {
          const myTeam = teams.find((t) => t.id === player.teamId);
          const amount = computeStealAmount(leader.score, myTeam?.score ?? 0);
          if (amount > 0) {
            await prisma.team.update({ where: { id: leader.id }, data: { score: { decrement: amount } } });
            await prisma.team.update({ where: { id: player.teamId }, data: { score: { increment: amount } } });
            io.to(`room:${room.code}`).emit("game:score:update", [
              { teamId: leader.id, score: leader.score - amount, delta: -amount },
              { teamId: player.teamId, score: (myTeam?.score ?? 0) + amount, delta: amount },
            ]);
          }
        }
      }

      await prisma.gameLog.create({
        data: {
          roomId: room.id,
          event: "powerup_used",
          payload: { cardId, type: card.type, usedByPlayerName: player.name, usedByTeamId: player.teamId, targetTeamId },
        },
      });

      io.to(`room:${room.code}`).emit("game:powerup:used", {
        cardId,
        type: card.type as any,
        usedByTeamId: player.teamId,
        usedByName: `${player.name} (${player.team.name})`,
        targetTeamId,
        targetTeamName: undefined,
        effect: `${CARD_METADATA[card.type as CardType]?.nameVi || card.type} đã được kích hoạt cho toàn đội!`,
      });

      const state = await buildRoomState(room.id);
      io.to(`room:${room.code}`).emit("room:state", state);
    });

    // ── Admin: Next Question ──────────────────────────────────────────────────
    socket.on("admin:next", async () => {
      const playerId = playerSockets.get(socket.id);
      if (!playerId) return;
      const player = await prisma.player.findUnique({
        where: { id: playerId },
        include: { room: { include: { quizBank: { include: { questions: { orderBy: { order: "asc" } } } } } } },
      });
      if (!player?.room || !player.isHost) return;

      const room = player.room;
      const questions = room.quizBank?.questions ?? [];

      if (questions.length === 0) {
        socket.emit("error", "Phòng chưa có câu hỏi nào! Vui lòng chọn bộ đề câu hỏi trước khi bắt đầu.");
        return;
      }

      const nextIndex = room.status === "LOBBY" ? 0 : room.currentQuestion + 1;

      if (nextIndex >= questions.length) {
        await prisma.room.update({ where: { id: room.id }, data: { status: "FINISHED", endedAt: new Date() } });
        const leaderboard = await buildLeaderboard(room.id);
        io.to(`room:${room.code}`).emit("game:ended", { leaderboard });
        return;
      }

      await prisma.room.update({ where: { id: room.id }, data: { currentQuestion: nextIndex, status: "PLAYING" } });
      const q = questions[nextIndex];
      const qKey = `${room.id}:${q.id}`;

      // Reset mode states for new question
      roomStealPhase.delete(qKey);
      roomStealBuzzed.delete(qKey);
      roomBuzzFirst.delete(qKey);

      let primaryTeamId: string | undefined;
      let primaryTeamName: string | undefined;

      if (room.mode === "BOUNCEBACK") {
        const teams = await prisma.team.findMany({ where: { roomId: room.id }, orderBy: { createdAt: "asc" } });
        if (teams.length > 0) {
          const config = room.config as any;
          const questionsPerTurn = config?.bouncebackQuestionsPerTurn || 1;
          const turnIndex = Math.floor(nextIndex / questionsPerTurn) % teams.length;
          const primary = teams[turnIndex];
          primaryTeamId = primary.id;
          primaryTeamName = primary.name;
          roomPrimaryTeams.set(qKey, { teamId: primary.id, teamName: primary.name });
        }
      }

      const config = room.config as any;
      const questionState = buildQuestionState(q, {
        primaryTeamId,
        primaryTeamName,
        bloomLevel: getBloomLevelFromPoints(q.points),
        answerMethod: config?.answerMethod ?? "DEVICE",
      });

      io.to(`room:${room.code}`).emit("game:question", questionState);
      startQuestionTimer(io, room.code, room.id, q.id, q.timeLimit);
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
      const player = await prisma.player.findUnique({
        where: { id: playerId },
        include: { room: { include: { quizBank: { include: { questions: { orderBy: { order: "asc" } } } } } } },
      });
      if (!player?.room || !player.isHost) return;

      const room = player.room;
      const q = room.quizBank?.questions[room.currentQuestion];
      if (!q) return;

      await revealCurrentAnswer(io, room.id, room.code, q.id);
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

// ── Answer Processing (Unified for Device & MC Mode) ─────────────────────────

async function processAnswerSubmission({
  io,
  roomId,
  questionId,
  playerId,
  teamId,
  answer,
  isAdminOverride = false,
  socket,
}: {
  io: IO;
  roomId: string;
  questionId: string;
  playerId?: string;
  teamId?: string;
  answer: string | string[];
  isAdminOverride?: boolean;
  socket?: Sock;
}) {
  const room = await prisma.room.findUnique({
    where: { id: roomId },
    include: { teams: true },
  });
  if (!room || room.status !== "PLAYING") return;

  const question = await prisma.question.findUnique({ where: { id: questionId } });
  if (!question) return;

  const qKey = `${room.id}:${questionId}`;

  // Check if team is frozen
  if (teamId) {
    const frozenSet = roomFrozenTeams.get(qKey);
    if (frozenSet && frozenSet.has(teamId)) {
      if (socket) socket.emit("error", "Đội của bạn đang bị đóng băng ở câu này nên không thể nộp đáp án!");
      return;
    }
  }

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
    isCorrect = null as any;
  }

  // Active powerup card for team
  const teamCardsMap = roomQuestionTeamCards.get(qKey);
  const activeCard = teamId ? teamCardsMap?.get(teamId) : undefined;
  let multiplier = 1;
  const currentTeamObj = room.teams.find((t) => t.id === teamId);
  let shielded = currentTeamObj ? currentTeamObj.shieldCount > 0 : false;
  if (activeCard) {
    if (activeCard.type === "DOUBLE" || activeCard.type === "SCORE_X2") multiplier = 2;
    if (activeCard.type === "SHIELD" || activeCard.type === "SCORE_X2") shielded = true;
  }

  // 1. BOUNCEBACK MODE
  if (room.mode === "BOUNCEBACK") {
    const stealInfo = roomStealBuzzed.get(qKey);
    const primary = roomPrimaryTeams.get(qKey);

    if (stealInfo) {
      // Steal phase answer!
      if (!isAdminOverride && teamId !== stealInfo.teamId && playerId !== stealInfo.playerId) {
        if (socket) socket.emit("error", "Chỉ đội cướp chuông mới được trả lời!");
        return;
      }

      const existingSteal = await prisma.answer.findFirst({
        where: { roomId: room.id, questionId, teamId: stealInfo.teamId },
      });
      if (existingSteal) return;

      let points = 0;
      if (isCorrect) {
        // Đúng: +100% điểm cố định (không bonus thời gian trong Bounceback)
        points = Math.floor(question.points * multiplier);
      } else {
        // Sai: LUÔN trừ -50% điểm bất kể config penaltyForWrong, shield vẫn bảo vệ
        points = shielded ? 0 : -Math.floor(question.points * 0.5);
      }

      await prisma.answer.create({
        data: {
          roomId: room.id,
          questionId,
          playerId: playerId ?? stealInfo.playerId,
          teamId: stealInfo.teamId,
          answer: Array.isArray(answer) ? answer : [answer],
          isCorrect,
          pointsAwarded: points,
          timeSpent: 0,
        },
      });

      if (stealInfo.teamId) {
        const updatedTeam = await prisma.team.update({
          where: { id: stealInfo.teamId },
          data: { score: { increment: points } },
        });
        io.to(`room:${room.code}`).emit("game:score:update", [
          { teamId: stealInfo.teamId, score: updatedTeam.score, delta: points },
        ]);
      }

      stopQuestionTimer(room.id);
      await revealCurrentAnswer(io, room.id, room.code, question.id);
      return;
    }

    // Primary team phase!
    if (!isAdminOverride && primary && teamId !== primary.teamId) {
      if (socket) socket.emit("error", "Hiện đang là lượt của đội chính!");
      return;
    }

    const effTeamId = primary?.teamId ?? teamId;
    const existingPrimary = await prisma.answer.findFirst({
      where: { roomId: room.id, questionId, teamId: effTeamId },
    });
    if (existingPrimary) return;

    if (isCorrect) {
      // Đội chính đúng: +100% điểm cố định (KHÔNG bonus thời gian trong Bounceback)
      const points = Math.floor(question.points * multiplier);
      await prisma.answer.create({
        data: {
          roomId: room.id,
          questionId,
          playerId,
          teamId: effTeamId,
          answer: Array.isArray(answer) ? answer : [answer],
          isCorrect: true,
          pointsAwarded: points,
          timeSpent: 0,
        },
      });

      if (effTeamId) {
        const updatedTeam = await prisma.team.update({
          where: { id: effTeamId },
          data: { score: { increment: points } },
        });
        io.to(`room:${room.code}`).emit("game:score:update", [
          { teamId: effTeamId, score: updatedTeam.score, delta: points },
        ]);
      }

      stopQuestionTimer(room.id);
      await revealCurrentAnswer(io, room.id, room.code, question.id);
    } else {
      // Đội chính sai: Bounceback KHÔNG trừ điểm đội chính, chỉ dừng timer để admin mở chuông cướp
      await prisma.answer.create({
        data: {
          roomId: room.id,
          questionId,
          playerId,
          teamId: effTeamId,
          answer: Array.isArray(answer) ? answer : [answer],
          isCorrect: false,
          pointsAwarded: 0,
          timeSpent: 0,
        },
      });

      // Stop primary timer so admin can open 5s steal buzz
      stopQuestionTimer(room.id);
      io.to(`room:${room.code}`).emit("game:timer", { remaining: 0, total: question.timeLimit });
    }
    return;
  }

  // 2. BUZZ MODE
  if (room.mode === "BUZZ") {
    const buzz = roomBuzzFirst.get(qKey);
    if (!buzz && !isAdminOverride) {
      if (socket) socket.emit("error", "Chưa có đội nào bấm chuông!");
      return;
    }

    const effTeamId = buzz?.teamId ?? teamId;
    if (!isAdminOverride && buzz && teamId !== buzz.teamId && playerId !== buzz.playerId) {
      if (socket) socket.emit("error", "Chỉ đội bấm chuông đầu tiên mới được trả lời!");
      return;
    }

    const existingBuzzAns = await prisma.answer.findFirst({
      where: { roomId: room.id, questionId, teamId: effTeamId },
    });
    if (existingBuzzAns) return;

    let points = 0;
    if (isCorrect) {
      points = Math.floor(question.points * multiplier);
    } else {
      const config = room.config as any;
      points = (config.penaltyForWrong && !shielded) ? -Math.floor(config.penaltyPoints || 5) : 0;
    }

    await prisma.answer.create({
      data: {
        roomId: room.id,
        questionId,
        playerId,
        teamId: effTeamId,
        answer: Array.isArray(answer) ? answer : [answer],
        isCorrect,
        pointsAwarded: points,
        timeSpent: 0,
      },
    });

    if (points !== 0 && effTeamId) {
      const updatedTeam = await prisma.team.update({
        where: { id: effTeamId },
        data: { score: { increment: points } },
      });
      io.to(`room:${room.code}`).emit("game:score:update", [
        { teamId: effTeamId, score: updatedTeam.score, delta: points },
      ]);
    }

    stopQuestionTimer(room.id);
    await revealCurrentAnswer(io, room.id, room.code, question.id);
    return;
  }

  // 3. CLASSIC MODE
  if (playerId) {
    const existing = await prisma.answer.findFirst({
      where: { roomId: room.id, questionId, playerId },
    });
    if (existing) return;
  }

  const config = room.config as any;
  const timeSpent = Date.now() - (roomTimers.get(`${room.id}:startedAt`) ? parseInt(roomTimers.get(`${room.id}:startedAt`) as any) : Date.now());

  // Chỉ mode CLASSIC mới được phép bật timeBonusEnabled!
  const effectiveConfig = {
    ...config,
    timeBonusEnabled: room.mode === "CLASSIC" ? Boolean(config?.timeBonusEnabled) : false,
  };

  const points = computePointsAwarded({
    basePoints: question.points,
    timeSpent: isAdminOverride ? 0 : timeSpent,
    timeLimit: question.timeLimit,
    isCorrect: isCorrect ?? false,
    config: effectiveConfig,
    multiplier,
    shielded,
  });

  await prisma.answer.create({
    data: {
      roomId: room.id,
      questionId,
      playerId,
      teamId,
      answer: Array.isArray(answer) ? answer : [answer],
      isCorrect,
      pointsAwarded: points,
      timeSpent: isAdminOverride ? 0 : timeSpent,
    },
  });

  if (playerId && points !== 0) {
    await prisma.player.update({
      where: { id: playerId },
      data: { score: { increment: points } },
    });
    if (room.teamMode !== "TEAM" && teamId) {
      await prisma.team.update({
        where: { id: teamId },
        data: { score: { increment: points } },
      });
    }
  }

  if (playerId) {
    const updatedPlayer = await prisma.player.findUnique({ where: { id: playerId } });
    io.to(`room:${room.code}`).emit("game:score:update", [
      { playerId, teamId, score: updatedPlayer?.score ?? 0, delta: points },
    ]);
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────────

async function getRoomQuestions(roomId: string) {
  const room = await prisma.room.findUnique({
    where: { id: roomId },
    include: { quizBank: { include: { questions: { orderBy: { order: "asc" } } } } },
  });
  return room?.quizBank?.questions ?? [];
}

async function revealCurrentAnswer(io: IO, roomId: string, roomCode: string, questionId: string) {
  stopQuestionTimer(roomId);

  const room = await prisma.room.findUnique({ where: { id: roomId } });
  const q = await prisma.question.findUnique({ where: { id: questionId } });
  if (!room || !q) return;

  const config = room.config as any;
  let teamScoresUpdates: ScoreUpdate[] = [];
  let teamSummaries: TeamRevealSummary[] = [];
  let roomAccuracy: number | undefined;
  let rarityBonusPercent: number | undefined;

  // Collective team scoring in CLASSIC mode, OR in ELIMINATION mode when device & eliminationDeepScoring are active
  const isEliminationDeep = room.mode === "ELIMINATION" && config?.answerMethod === "DEVICE" && config?.eliminationDeepScoring !== false;
  if ((room.mode === "CLASSIC" || isEliminationDeep) && room.teamMode === "TEAM") {
    const res = await resolveQuestionTeamScores(io, room.id, q.id);
    teamScoresUpdates = res.teamScoresUpdates;
    teamSummaries = res.teamSummaries;
    roomAccuracy = res.roomAccuracy;
    rarityBonusPercent = res.rarityBonusPercent;
    if (teamScoresUpdates.length > 0) {
      io.to(`room:${roomCode}`).emit("game:score:update", teamScoresUpdates);
    }
  }

  // Elimination check: sau mỗi interval câu, loại đội có điểm thấp nhất
  if (room.mode === "ELIMINATION") {
    const interval = config?.eliminationIntervalQuestions || 3;
    if ((room.currentQuestion + 1) % interval === 0) {
      if (room.teamMode === "TEAM") {
        const activeTeams = await prisma.team.findMany({
          where: { roomId: room.id, isEliminated: false },
          orderBy: { score: "asc" },
        });
        if (activeTeams.length > 1) {
          const toEliminate = activeTeams[0];
          await prisma.team.update({
            where: { id: toEliminate.id },
            data: { isEliminated: true },
          });
          const refreshedState = await buildRoomState(room.id);
          io.to(`room:${roomCode}`).emit("room:state", refreshedState);
        }
      }
    }
  }

  const answers = await prisma.answer.findMany({
    where: { roomId: room.id, questionId: q.id },
    include: { player: true, team: true },
  });

  const options = q.options as any[] | null;
  const correctAnswer = options?.filter((o: any) => o.isCorrect).map((o: any) => o.id) ?? q.answer ?? "";

  io.to(`room:${roomCode}`).emit("game:answer:reveal", {
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
    teamSummaries: teamSummaries.length > 0 ? teamSummaries : undefined,
    roomAccuracy,
    rarityBonusPercent,
    bloomLevel: getBloomLevelFromPoints(q.points),
  });
}

function stopQuestionTimer(roomId: string) {
  const key = `${roomId}:timer`;
  if (roomTimers.has(key)) {
    clearInterval(roomTimers.get(key)!);
    roomTimers.delete(key);
    roomRemainingTimes.delete(key);
  }
}

async function buildRoomState(roomId: string): Promise<RoomState> {
  const room = await prisma.room.findUnique({
    where: { id: roomId },
    include: {
      teams: { include: { players: true, powerupCards: true } },
      players: true,
      powerupCards: { where: { ownerType: "SHARED" } },
      quizBank: { select: { questions: { select: { id: true } } } },
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
    totalQuestions: room.quizBank?.questions.length ?? 0,
    teams,
    players,
    sharedCards,
    config: config,
  };
}

function buildQuestionState(
  q: any,
  extra?: {
    primaryTeamId?: string;
    primaryTeamName?: string;
    bloomLevel?: BloomLevel;
    isStealPhase?: boolean;
    stealBuzzedTeamId?: string;
    stealBuzzedTeamName?: string;
    stealAnsweringActive?: boolean;
    buzzAnsweringActive?: boolean;
    buzzedTeamId?: string;
    buzzedTeamName?: string;
    answerMethod?: "DEVICE" | "MC";
  }
): QuestionState {
  const options = q.options as any[] | null;
  const bloomLevel = extra?.bloomLevel ?? getBloomLevelFromPoints(q.points);
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
      bloomLevel,
    },
    timeLimit: q.timeLimit,
    startedAt: Date.now(),
    activeBoosts: [],
    bloomLevel,
    primaryTeamId: extra?.primaryTeamId,
    primaryTeamName: extra?.primaryTeamName,
    isStealPhase: extra?.isStealPhase,
    stealBuzzedTeamId: extra?.stealBuzzedTeamId,
    stealBuzzedTeamName: extra?.stealBuzzedTeamName,
    stealAnsweringActive: extra?.stealAnsweringActive,
    buzzAnsweringActive: extra?.buzzAnsweringActive,
    buzzedTeamId: extra?.buzzedTeamId,
    buzzedTeamName: extra?.buzzedTeamName,
    answerMethod: extra?.answerMethod,
  };
}

async function resolveQuestionTeamScores(
  io: IO,
  roomId: string,
  questionId: string
): Promise<{
  teamScoresUpdates: ScoreUpdate[];
  teamSummaries: TeamRevealSummary[];
  roomAccuracy: number;
  rarityBonusPercent: number;
}> {
  const qKey = `${roomId}:${questionId}`;
  if (roomQuestionProcessed.has(qKey)) {
    return { teamScoresUpdates: [], teamSummaries: [], roomAccuracy: 1, rarityBonusPercent: 0 };
  }
  roomQuestionProcessed.add(qKey);

  const room = await prisma.room.findUnique({
    where: { id: roomId },
    include: {
      teams: { include: { players: true } },
    },
  });
  if (!room || room.teamMode !== "TEAM" || room.mode !== "CLASSIC") {
    return { teamScoresUpdates: [], teamSummaries: [], roomAccuracy: 1, rarityBonusPercent: 0 };
  }

  const question = await prisma.question.findUnique({ where: { id: questionId } });
  if (!question) {
    return { teamScoresUpdates: [], teamSummaries: [], roomAccuracy: 1, rarityBonusPercent: 0 };
  }

  const answers = await prisma.answer.findMany({
    where: { roomId, questionId },
    include: { player: true, team: true },
  });

  const totalAnswers = answers.length;
  const correctAnswersTotal = answers.filter((a) => a.isCorrect === true).length;
  const roomAccuracy = totalAnswers > 0 ? correctAnswersTotal / totalAnswers : 1.0;
  const rarityBonusPercent = roomAccuracy < 0.30 ? Math.round((0.30 - roomAccuracy) * 1.5 * 100) : 0;

  const teamCardsMap = roomQuestionTeamCards.get(qKey);
  const teamScoresUpdates: ScoreUpdate[] = [];
  const teamSummaries: TeamRevealSummary[] = [];

  for (const team of room.teams) {
    const onlineMembers = team.players.filter((p) => !!p.socketId);
    const totalOnline = onlineMembers.length > 0 ? onlineMembers.length : (team.players.length || 1);

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

    const effectiveTeamConfig = {
      ...(room.config as any),
      timeBonusEnabled: room.mode === "CLASSIC" ? Boolean((room.config as any)?.timeBonusEnabled) : false,
    };

    const { points: teamPoints, accuracyRatio, speedBonus, empiricalMultiplier } = computeTeamQuestionScore({
      basePoints: question.points,
      timeLimit: question.timeLimit,
      totalOnlineMembers: totalOnline,
      correctMembers: correctAnswers.length,
      correctTimes,
      config: effectiveTeamConfig,
      multiplier,
      shielded,
      penaltyMultiplier,
      roomAccuracy,
    });

    const updatedTeam = await prisma.team.update({
      where: { id: team.id },
      data: { score: { increment: teamPoints } },
    });

    teamScoresUpdates.push({
      teamId: team.id,
      score: updatedTeam.score,
      delta: teamPoints,
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
      activeCard: activeCard?.type,
      empiricalMultiplier,
    });
  }

  return { teamScoresUpdates, teamSummaries, roomAccuracy, rarityBonusPercent };
}

function startQuestionTimer(io: IO, roomCode: string, roomId: string, questionId: string, timeLimit: number) {
  stopQuestionTimer(roomId);

  const key = `${roomId}:timer`;
  roomRemainingTimes.set(key, timeLimit);
  roomTimers.set(key, setInterval(async () => {
    const cur = roomRemainingTimes.get(key) ?? timeLimit;
    const remaining = cur - 1;
    roomRemainingTimes.set(key, remaining);
    io.to(`room:${roomCode}`).emit("game:timer", { remaining, total: timeLimit });
    if (remaining <= 0) {
      stopQuestionTimer(roomId);

      const room = await prisma.room.findUnique({ where: { id: roomId } });
      if (room && room.mode === "CLASSIC" && room.teamMode === "TEAM") {
        const { teamScoresUpdates } = await resolveQuestionTeamScores(io, roomId, questionId);
        if (teamScoresUpdates.length > 0) {
          io.to(`room:${roomCode}`).emit("game:score:update", teamScoresUpdates);
        }
      }
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
