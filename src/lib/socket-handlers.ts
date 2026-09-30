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
} from "@/types";
import { computePointsAwarded, computeTeamQuestionScore, computeStealAmount } from "./game-engine/scoring";
import { resolvePowerup } from "./game-engine/powerups";
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

      // Kiểm tra xem đội có đang bị phong tỏa (FREEZE) không
      const qKey = `${room.id}:${questionId}`;
      if (player.teamId) {
        const frozenSet = roomFrozenTeams.get(qKey);
        if (frozenSet && frozenSet.has(player.teamId)) {
          socket.emit("error", "Đội của bạn đang bị đóng băng ở câu này nên không thể nộp đáp án!");
          return;
        }
      }

      // Kiểm tra nếu người chơi đã nộp câu này rồi
      const existing = await prisma.answer.findFirst({
        where: { roomId: room.id, questionId, playerId },
      });
      if (existing) return;

      const config = room.config as any;
      const timeSpent = Date.now() - (roomTimers.get(`${room.id}:startedAt`) ? parseInt(roomTimers.get(`${room.id}:startedAt`) as any) : Date.now());

      // Xác định tính đúng/sai của đáp án
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
          isCorrect,
          pointsAwarded: points,
          timeSpent,
        },
      });

      // Cập nhật điểm cá nhân (để theo dõi bảng xếp hạng cá nhân MVP)
      if (points !== 0) {
        await prisma.player.update({
          where: { id: playerId },
          data: { score: { increment: points } },
        });
        // Ở chế độ cá nhân (INDIVIDUAL), cộng điểm đội dồn luôn nếu có
        if (room.teamMode !== "TEAM" && player.teamId) {
          await prisma.team.update({
            where: { id: player.teamId },
            data: { score: { increment: points } },
          });
        }
      }

      // Phát thông báo điểm cá nhân
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
      if (roomTimers.has(buzzKey)) return;

      roomTimers.set(buzzKey, setTimeout(() => roomTimers.delete(buzzKey), 10000) as any);
      io.to(`room:${player.room.code}`).emit("game:buzz", {
        playerId,
        playerName: player.name,
        teamId: player.teamId ?? undefined,
      });
    });

    // ── Use Power-up (Thẻ hỗ trợ: 1 thẻ/câu cho cả đội, người bấm sớm nhất có hiệu lực) ──
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

        // Kiểm tra xem đội đã có thành viên nào kích hoạt thẻ ở câu này chưa
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

      // Đánh dấu thẻ đã được dùng
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

      // Xử lý hiệu ứng tức thì của thẻ
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

          // Phát sự kiện ẩn 2 đáp án cho toàn bộ thành viên trong đội
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

      // Phát thông báo kích hoạt thẻ cho toàn phòng
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

    // ── Admin Controls ───────────────────────────────────────────────────────
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
      const nextIndex = room.status === "LOBBY" ? 0 : room.currentQuestion + 1;

      if (nextIndex >= questions.length) {
        // Kết thúc trò chơi
        await prisma.room.update({ where: { id: room.id }, data: { status: "FINISHED", endedAt: new Date() } });
        const leaderboard = await buildLeaderboard(room.id);
        io.to(`room:${room.code}`).emit("game:ended", { leaderboard });
        return;
      }

      await prisma.room.update({ where: { id: room.id }, data: { currentQuestion: nextIndex, status: "PLAYING" } });
      const q = questions[nextIndex];
      const questionState = buildQuestionState(q);

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

      // Hủy timer đang chạy nếu còn
      const key = `${room.id}:timer`;
      if (roomTimers.has(key)) {
        clearInterval(roomTimers.get(key)!);
        roomTimers.delete(key);
        roomRemainingTimes.delete(key);
      }

      // Quyết toán điểm đội nhóm chuẩn hóa theo công thức tỷ lệ đúng + tốc độ
      const { teamScoresUpdates, teamSummaries } = await resolveQuestionTeamScores(io, room.id, q.id);
      if (teamScoresUpdates.length > 0) {
        io.to(`room:${room.code}`).emit("game:score:update", teamScoresUpdates);
      }

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
        teamSummaries: teamSummaries.length > 0 ? teamSummaries : undefined,
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

async function resolveQuestionTeamScores(io: IO, roomId: string, questionId: string): Promise<{ teamScoresUpdates: ScoreUpdate[]; teamSummaries: TeamRevealSummary[] }> {
  const qKey = `${roomId}:${questionId}`;
  if (roomQuestionProcessed.has(qKey)) {
    return { teamScoresUpdates: [], teamSummaries: [] };
  }
  roomQuestionProcessed.add(qKey);

  const room = await prisma.room.findUnique({
    where: { id: roomId },
    include: {
      teams: { include: { players: true } },
    },
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
    include: { player: true, team: true },
  });

  const teamCardsMap = roomQuestionTeamCards.get(qKey);
  const teamScoresUpdates: ScoreUpdate[] = [];
  const teamSummaries: TeamRevealSummary[] = [];

  for (const team of room.teams) {
    // Online members (players currently connected with socketId)
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

    // Check if team is target of PENALTY card from another team
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
      config: room.config as any,
      multiplier,
      shielded,
      penaltyMultiplier,
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
    });
  }

  return { teamScoresUpdates, teamSummaries };
}

function startQuestionTimer(io: IO, roomCode: string, roomId: string, questionId: string, timeLimit: number) {
  const key = `${roomId}:timer`;
  if (roomTimers.has(key)) clearInterval(roomTimers.get(key)!);

  roomRemainingTimes.set(key, timeLimit);
  roomTimers.set(key, setInterval(async () => {
    const cur = roomRemainingTimes.get(key) ?? timeLimit;
    const remaining = cur - 1;
    roomRemainingTimes.set(key, remaining);
    io.to(`room:${roomCode}`).emit("game:timer", { remaining, total: timeLimit });
    if (remaining <= 0) {
      clearInterval(roomTimers.get(key)!);
      roomTimers.delete(key);
      roomRemainingTimes.delete(key);

      // Auto resolve team scores when time is up
      const { teamScoresUpdates } = await resolveQuestionTeamScores(io, roomId, questionId);
      if (teamScoresUpdates.length > 0) {
        io.to(`room:${roomCode}`).emit("game:score:update", teamScoresUpdates);
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
