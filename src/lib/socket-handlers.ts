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
  GameStartingPayload,
  GamePreparePayload,
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

interface RoomPrepareState {
  type: "STARTING" | "PREPARE";
  questionIndex: number;
  totalQuestions: number;
  targetTimestamp: number;
  timer?: NodeJS.Timeout;
  skipCallback?: () => void;
  preparePayload?: GamePreparePayload;
}

let globalIO: IO | undefined;
const pendingDisconnects = new Map<string, NodeJS.Timeout>(); // playerId -> timeout for graceful reconnect

// In-memory session store
const playerSockets = new Map<string, string>(); // socketId -> playerId
const adminSockets = new Map<string, string>(); // socketId -> roomId
const roomTimers = new Map<string, NodeJS.Timeout>(); // roomId -> timer
const roomRemainingTimes = new Map<string, number>(); // roomId -> remaining seconds
const roomQuestionTeamCards = new Map<string, Map<string, ActiveTeamCard>>(); // qKey -> Map(teamId -> ActiveTeamCard)
const roomFrozenTeams = new Map<string, Set<string>>(); // qKey -> Set(teamId)
const roomFiftyFifty = new Map<string, Map<string, string[]>>(); // qKey -> Map(teamId -> hiddenOptionIds[])
const roomQuestionProcessed = new Set<string>(); // qKey to prevent double team scoring
const roomPrepareStates = new Map<string, RoomPrepareState>(); // roomId -> preparation countdown state

// Mode-specific in-memory states
const roomPrimaryTeams = new Map<string, { teamId: string; teamName: string }>(); // qKey -> primaryTeam in BOUNCEBACK
const roomStealPhase = new Map<string, boolean>(); // qKey -> whether 5s steal buzz window is open
const roomStealBuzzed = new Map<string, { teamId: string; teamName: string; playerId: string; playerName: string }>(); // qKey -> steal buzz
const roomStealTimer = new Map<string, NodeJS.Timeout>(); // qKey -> 5s buzzer timer
const roomBuzzFirst = new Map<string, { teamId: string; teamName: string; playerId: string; playerName: string }>(); // qKey -> first buzz in BUZZ mode

// In-memory cache for ultra-fast response
const roomCache = new Map<string, any>(); // roomId -> room with quizBank & questions
const roomQuestionsCache = new Map<string, any[]>(); // roomId -> questions
const roomActiveAnswers = new Map<string, Map<string, { teamId?: string; playerId?: string; answer: string | string[]; isCorrect: boolean | null; timeSpent: number; submittedAt: number }>>(); // qKey -> (actorKey -> answerData)

async function getAdminRoom(socket: Sock) {
  const roomId = adminSockets.get(socket.id);
  if (roomId) {
    const cached = roomCache.get(roomId);
    if (cached) return cached;

    const r = await prisma.room.findUnique({
      where: { id: roomId },
      include: { quizBank: { include: { questions: { orderBy: { order: "asc" } } } } },
    });
    if (r) {
      roomCache.set(roomId, r);
      if (r.quizBank?.questions) {
        roomQuestionsCache.set(roomId, r.quizBank.questions);
      }
    }
    return r;
  }

  // Fallback if legacy connection was used
  const playerId = playerSockets.get(socket.id);
  if (playerId) {
    const player = await prisma.player.findUnique({
      where: { id: playerId },
      include: {
        room: { include: { quizBank: { include: { questions: { orderBy: { order: "asc" } } } } } },
      },
    });
    if (player?.isHost && player.room) {
      return player.room;
    }
  }

  return null;
}

export function registerSocketHandlers(io: IO) {
  globalIO = io;

  io.on("connection", (socket: Sock) => {
    console.log(`[Socket] Connected: ${socket.id}`);

    // ── Join Room ────────────────────────────────────────────────────────────
    socket.on("room:join", async ({ code, playerName, playerId, teamId }, callback) => {
      try {
        const room = await prisma.room.findUnique({
          where: { code },
          include: {
            teams: { include: { players: true, powerupCards: true } },
            players: true,
            powerupCards: { where: { teamId: null } },
            quizBank: { include: { questions: { orderBy: { order: "asc" } } } },
          },
        });

        if (!room) {
          return callback({ success: false, error: "Không tìm thấy phòng chơi" });
        }
        if (room.status === "FINISHED") {
          return callback({ success: false, error: "Trận đấu đã kết thúc" });
        }

        // Cancel any pending disconnect timer for this playerId
        if (playerId && pendingDisconnects.has(playerId)) {
          clearTimeout(pendingDisconnects.get(playerId)!);
          pendingDisconnects.delete(playerId);
        }

        const trimmedName = (playerName || "Thí sinh").trim();
        let player: any = null;

        // 1. Try reconnecting via persistent playerId
        if (playerId) {
          const existingById = await prisma.player.findFirst({
            where: { id: playerId, roomId: room.id },
          });
          if (existingById) {
            // Cancel pending disconnect timer
            if (pendingDisconnects.has(existingById.id)) {
              clearTimeout(pendingDisconnects.get(existingById.id)!);
              pendingDisconnects.delete(existingById.id);
            }

            const finalName = (trimmedName && trimmedName !== "Player" && trimmedName !== "Thí sinh")
              ? trimmedName
              : existingById.name;

            player = await prisma.player.update({
              where: { id: existingById.id },
              data: {
                name: finalName,
                socketId: socket.id,
                ...(teamId ? { teamId } : {}),
              },
            });

            // Clean up any stale disconnected ghost clones with same name
            await prisma.player.deleteMany({
              where: {
                roomId: room.id,
                name: finalName,
                id: { not: existingById.id },
                socketId: null,
              },
            }).catch(() => {});
          }
        }

        // 2. If no playerId match, try reclaiming an offline player with the exact same name
        if (!player) {
          const offlineSameName = await prisma.player.findFirst({
            where: {
              roomId: room.id,
              name: trimmedName,
              socketId: null,
            },
          });
          if (offlineSameName) {
            if (pendingDisconnects.has(offlineSameName.id)) {
              clearTimeout(pendingDisconnects.get(offlineSameName.id)!);
              pendingDisconnects.delete(offlineSameName.id);
            }

            player = await prisma.player.update({
              where: { id: offlineSameName.id },
              data: {
                socketId: socket.id,
                ...(teamId ? { teamId } : {}),
              },
            });

            // Clean up any remaining duplicate offline entries with same name
            await prisma.player.deleteMany({
              where: {
                roomId: room.id,
                name: trimmedName,
                id: { not: offlineSameName.id },
                socketId: null,
              },
            }).catch(() => {});
          }
        }

        // 3. Otherwise, create a new player record
        if (!player) {
          // Clean up any old disconnected duplicates in lobby before creating
          if (room.status === "LOBBY") {
            await prisma.player.deleteMany({
              where: {
                roomId: room.id,
                name: trimmedName,
                socketId: null,
              },
            }).catch(() => {});
          }

          const newId = (playerId && playerId.length > 5) ? playerId : `p_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
          player = await prisma.player.create({
            data: {
              id: newId,
              name: trimmedName,
              socketId: socket.id,
              roomId: room.id,
              teamId: teamId ?? null,
            },
          });
        }

        if (player && pendingDisconnects.has(player.id)) {
          clearTimeout(pendingDisconnects.get(player.id)!);
          pendingDisconnects.delete(player.id);
        }

        playerSockets.set(socket.id, player.id);
        socket.join(`room:${code}`);
        socket.join(`room:${code}:players`);

        const roomState = await buildRoomState(room.id);

        // Broadcast updated room state so all participants see the online status & team counts
        io.to(`room:${code}`).emit("room:state", roomState);

        // If the game is PLAYING, recover current question and timer for this player socket
        if (room.status === "PLAYING" && room.quizBank?.questions) {
          const currentQ = room.quizBank.questions[room.currentQuestion];
          if (currentQ) {
            const qKey = `${room.id}:${currentQ.id}`;
            const primary = roomPrimaryTeams.get(qKey);
            const stealBuzzed = roomStealBuzzed.get(qKey);
            const buzzFirst = roomBuzzFirst.get(qKey);
            const isSteal = roomStealPhase.get(qKey) ?? false;
            const config = room.config as any;

            const qState = buildQuestionState(currentQ, {
              primaryTeamId: primary?.teamId,
              primaryTeamName: primary?.teamName,
              bloomLevel: getBloomLevelFromPoints(currentQ.points),
              answerMethod: config?.answerMethod ?? "DEVICE",
              isStealPhase: isSteal,
              stealBuzzedTeamId: stealBuzzed?.teamId,
              stealBuzzedTeamName: stealBuzzed?.teamName,
              buzzedTeamId: buzzFirst?.teamId,
              buzzedTeamName: buzzFirst?.teamName,
            });

            socket.emit("game:question", qState);

            const timerKey = `${room.id}:timer`;
            const remaining = roomRemainingTimes.get(timerKey);
            if (typeof remaining === "number" && remaining > 0) {
              socket.emit("game:timer", { remaining, total: currentQ.timeLimit });
            }
          }
        }

        if (roomPrepareStates.has(room.id)) {
          const prep = roomPrepareStates.get(room.id)!;
          const remainingSec = Math.max(1, Math.ceil((prep.targetTimestamp - Date.now()) / 1000));
          if (prep.type === "STARTING") {
            socket.emit("game:starting", { seconds: remainingSec });
          } else if (prep.type === "PREPARE" && prep.preparePayload) {
            socket.emit("game:prepare", { ...prep.preparePayload, seconds: remainingSec });
          }
        }

        callback({ success: true, playerId: player.id, teamId: player.teamId ?? undefined, roomState });
      } catch (err) {
        console.error("[room:join]", err);
        callback({ success: false, error: "Lỗi kết nối máy chủ" });
      }
    });

    // ── Admin Join ───────────────────────────────────────────────────────────
    socket.on("admin:join", async (code, callback) => {
      try {
        const room = await prisma.room.findUnique({
          where: { code },
          include: { quizBank: { include: { questions: { orderBy: { order: "asc" } } } } },
        });
        if (!room) {
          return callback?.({ success: false, error: "Phòng không tồn tại" });
        }

        // Clean up any ghost host players in this room
        await prisma.player.deleteMany({
          where: {
            roomId: room.id,
            OR: [
              { isHost: true },
              { name: "Host" },
              { name: "Admin Host" },
            ],
          },
        }).catch(() => {});

        adminSockets.set(socket.id, room.id);
        socket.join(`room:${code}`);
        socket.join(`room:${code}:admin`);

        const roomState = await buildRoomState(room.id);
        io.to(`room:${code}`).emit("room:state", roomState);

        // If the game is PLAYING, recover current question and timer for admin socket
        if (room.status === "PLAYING" && room.quizBank?.questions) {
          const currentQ = room.quizBank.questions[room.currentQuestion];
          if (currentQ) {
            const qKey = `${room.id}:${currentQ.id}`;
            const primary = roomPrimaryTeams.get(qKey);
            const stealBuzzed = roomStealBuzzed.get(qKey);
            const buzzFirst = roomBuzzFirst.get(qKey);
            const isSteal = roomStealPhase.get(qKey) ?? false;
            const config = room.config as any;

            const qState = buildQuestionState(currentQ, {
              primaryTeamId: primary?.teamId,
              primaryTeamName: primary?.teamName,
              bloomLevel: getBloomLevelFromPoints(currentQ.points),
              answerMethod: config?.answerMethod ?? "DEVICE",
              isStealPhase: isSteal,
              stealBuzzedTeamId: stealBuzzed?.teamId,
              stealBuzzedTeamName: stealBuzzed?.teamName,
              buzzedTeamId: buzzFirst?.teamId,
              buzzedTeamName: buzzFirst?.teamName,
            });

            socket.emit("game:question", qState);

            const timerKey = `${room.id}:timer`;
            const remaining = roomRemainingTimes.get(timerKey);
            if (typeof remaining === "number" && remaining > 0) {
              socket.emit("game:timer", { remaining, total: currentQ.timeLimit });
            }
          }
        }

        if (roomPrepareStates.has(room.id)) {
          const prep = roomPrepareStates.get(room.id)!;
          const remainingSec = Math.max(1, Math.ceil((prep.targetTimestamp - Date.now()) / 1000));
          if (prep.type === "STARTING") {
            socket.emit("game:starting", { seconds: remainingSec });
          } else if (prep.type === "PREPARE" && prep.preparePayload) {
            socket.emit("game:prepare", { ...prep.preparePayload, seconds: remainingSec });
          }
        }

        callback?.({ success: true, roomState });
      } catch (err) {
        console.error("[admin:join]", err);
        callback?.({ success: false, error: "Lỗi kết nối máy chủ" });
      }
    });

    // ── Player Select Team ───────────────────────────────────────────────────
    socket.on("player:select:team", async ({ teamId, playerId: clientPlayerId }, callback) => {
      try {
        const playerId = clientPlayerId || playerSockets.get(socket.id);
        if (!playerId) {
          return callback?.({ success: false, error: "Không tìm thấy thông tin thí sinh" });
        }

        // Always re-associate socket.id with playerId
        playerSockets.set(socket.id, playerId);

        const player = await prisma.player.findUnique({
          where: { id: playerId },
          include: { room: true },
        });
        if (!player || !player.room) {
          return callback?.({ success: false, error: "Không tìm thấy thí sinh trong phòng này" });
        }

        // Re-join socket to rooms in case of transport upgrade or reconnect
        socket.join(`room:${player.room.code}`);
        socket.join(`room:${player.room.code}:players`);

        const team = await prisma.team.findFirst({
          where: { id: teamId, roomId: player.room.id },
        });
        if (!team) {
          return callback?.({ success: false, error: "Đội không tồn tại trong phòng này" });
        }

        await prisma.player.update({
          where: { id: playerId },
          data: {
            teamId,
            socketId: socket.id,
          },
        });

        const state = await buildRoomState(player.room.id);
        io.to(`room:${player.room.code}`).emit("room:state", state);
        socket.emit("room:state", state);
        callback?.({ success: true });
      } catch (err) {
        console.error("[player:select:team]", err);
        callback?.({ success: false, error: "Lỗi khi chọn đội" });
      }
    });

    // ── Display Join ────────────────────────────────────────────────────────
    socket.on("display:join", async (code) => {
      socket.join(`room:${code}`);
      socket.join(`room:${code}:display`);
      const room = await prisma.room.findUnique({
        where: { code },
        include: { quizBank: { include: { questions: { orderBy: { order: "asc" } } } } },
      });
      if (room) {
        const state = await buildRoomState(room.id);
        socket.emit("room:state", state);

        if (room.status === "PLAYING" && room.quizBank?.questions) {
          const currentQ = room.quizBank.questions[room.currentQuestion];
          if (currentQ) {
            const qKey = `${room.id}:${currentQ.id}`;
            const primary = roomPrimaryTeams.get(qKey);
            const stealBuzzed = roomStealBuzzed.get(qKey);
            const buzzFirst = roomBuzzFirst.get(qKey);
            const isSteal = roomStealPhase.get(qKey) ?? false;
            const config = room.config as any;

            const qState = buildQuestionState(currentQ, {
              primaryTeamId: primary?.teamId,
              primaryTeamName: primary?.teamName,
              bloomLevel: getBloomLevelFromPoints(currentQ.points),
              answerMethod: config?.answerMethod ?? "DEVICE",
              isStealPhase: isSteal,
              stealBuzzedTeamId: stealBuzzed?.teamId,
              stealBuzzedTeamName: stealBuzzed?.teamName,
              buzzedTeamId: buzzFirst?.teamId,
              buzzedTeamName: buzzFirst?.teamName,
            });

            socket.emit("game:question", qState);

            const timerKey = `${room.id}:timer`;
            const remaining = roomRemainingTimes.get(timerKey);
            if (typeof remaining === "number" && remaining > 0) {
              socket.emit("game:timer", { remaining, total: currentQ.timeLimit });
            }
          }
        }

        if (roomPrepareStates.has(room.id)) {
          const prep = roomPrepareStates.get(room.id)!;
          const remainingSec = Math.max(1, Math.ceil((prep.targetTimestamp - Date.now()) / 1000));
          if (prep.type === "STARTING") {
            socket.emit("game:starting", { seconds: remainingSec });
          } else if (prep.type === "PREPARE" && prep.preparePayload) {
            socket.emit("game:prepare", { ...prep.preparePayload, seconds: remainingSec });
          }
        }
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
      const room = await getAdminRoom(socket);
      if (!room) return;

      const qKey = `${room.id}:${questionId}`;

      let effTeamId = teamId;
      let effPlayerId = playerId;

      if (room.mode === "BOUNCEBACK") {
        const steal = roomStealBuzzed.get(qKey);
        const primary = roomPrimaryTeams.get(qKey);
        if (steal) {
          effTeamId = effTeamId || steal.teamId;
          effPlayerId = effPlayerId || steal.playerId;
        } else if (primary) {
          effTeamId = effTeamId || primary.teamId;
        }
      } else if (room.mode === "BUZZ") {
        const buzz = roomBuzzFirst.get(qKey);
        if (buzz) {
          effTeamId = effTeamId || buzz.teamId;
          effPlayerId = effPlayerId || buzz.playerId;
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
      const room = await getAdminRoom(socket);
      if (!room) return;

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
      const room = await getAdminRoom(socket);
      if (!room) return;

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
      const room = await getAdminRoom(socket);
      if (!room) return;

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

    async function startQuestionPrepareAndLaunch(
      room: any,
      questions: any[],
      questionIndex: number
    ) {
      stopQuestionTimer(room.id);
      const q = questions[questionIndex];
      if (!q) return;
      const qKey = `${room.id}:${q.id}`;

      // Reset mode states for new question
      roomStealPhase.delete(qKey);
      roomStealBuzzed.delete(qKey);
      roomBuzzFirst.delete(qKey);
      roomQuestionProcessed.delete(qKey);

      let primaryTeamId: string | undefined;
      let primaryTeamName: string | undefined;

      if (room.mode === "BOUNCEBACK") {
        const teams = await prisma.team.findMany({ where: { roomId: room.id }, orderBy: { createdAt: "asc" } });
        if (teams.length > 0) {
          const config = room.config as any;
          const questionsPerTurn = config?.bouncebackQuestionsPerTurn || 1;
          const turnIndex = Math.floor(questionIndex / questionsPerTurn) % teams.length;
          const primary = teams[turnIndex];
          primaryTeamId = primary.id;
          primaryTeamName = primary.name;
          roomPrimaryTeams.set(qKey, { teamId: primary.id, teamName: primary.name });
        }
      }

      const config = room.config as any;
      const bloomLevel = getBloomLevelFromPoints(q.points);

      const launchQuestion = () => {
        roomPrepareStates.delete(room.id);
        const questionState = buildQuestionState(q, {
          primaryTeamId,
          primaryTeamName,
          bloomLevel,
          answerMethod: config?.answerMethod ?? "DEVICE",
        });
        io.to(`room:${room.code}`).emit("game:question", questionState);
        startQuestionTimer(io, room.code, room.id, q.id, q.timeLimit);
      };

      const preparePayload: GamePreparePayload = {
        questionIndex,
        totalQuestions: questions.length,
        points: q.points,
        timeLimit: q.timeLimit,
        seconds: 3,
        bloomLevel,
        primaryTeamName,
      };

      io.to(`room:${room.code}`).emit("game:prepare", preparePayload);

      const timer = setTimeout(() => {
        launchQuestion();
      }, 3000);

      roomPrepareStates.set(room.id, {
        type: "PREPARE",
        questionIndex,
        totalQuestions: questions.length,
        targetTimestamp: Date.now() + 3000,
        timer,
        skipCallback: launchQuestion,
        preparePayload,
      });
    }

    // ── Fair Card Distribution & Multi-round Replenishment ──────────────────
    async function ensureInitialTeamPowerups(roomId: string, ioInstance: IO) {
      try {
        const room = await prisma.room.findUnique({
          where: { id: roomId },
          include: { teams: { include: { powerupCards: true } } },
        });
        if (!room) return;
        const config = room.config as any;
        if (!config?.powerupEnabled) return;

        const allowed = (config.allowedPowerups as string[]) || [
          "FIFTY_FIFTY", "DOUBLE", "FREEZE", "ATTACK", "SKIP", "TIME_PLUS", "SHIELD", "STEAL", "PENALTY", "SCORE_X2"
        ];
        if (allowed.length === 0) return;

        const initialCount = config.powerupCountPerTeam || 2;
        let addedAny = false;

        for (const team of room.teams) {
          const activeUnused = team.powerupCards.filter((c) => !c.used).length;
          const need = Math.max(0, initialCount - activeUnused);
          for (let i = 0; i < need; i++) {
            const randomType = allowed[Math.floor(Math.random() * allowed.length)];
            await prisma.powerupCard.create({
              data: {
                type: randomType as any,
                ownerType: "TEAM",
                teamId: team.id,
                roomId: room.id,
              },
            });
            addedAny = true;
          }
        }

        if (addedAny) {
          const updatedState = await buildRoomState(room.id);
          ioInstance.to(`room:${room.code}`).emit("room:state", updatedState);
        }
      } catch (err) {
        console.error("[ensureInitialTeamPowerups]", err);
      }
    }

    async function replenishTeamPowerups(roomId: string, ioInstance: IO) {
      try {
        const room = await prisma.room.findUnique({
          where: { id: roomId },
          include: { teams: { include: { powerupCards: true } } },
        });
        if (!room) return;
        const config = room.config as any;
        if (!config?.powerupEnabled) return;

        const allowed = (config.allowedPowerups as string[]) || [
          "FIFTY_FIFTY", "DOUBLE", "FREEZE", "ATTACK", "SKIP", "TIME_PLUS", "SHIELD", "STEAL", "PENALTY", "SCORE_X2"
        ];
        if (allowed.length === 0) return;

        const maxHand = config.maxHandSize || 3;
        let addedAny = false;

        for (const team of room.teams) {
          if (team.isEliminated) continue;
          const activeUnused = team.powerupCards.filter((c) => !c.used).length;
          if (activeUnused < maxHand) {
            const randomType = allowed[Math.floor(Math.random() * allowed.length)];
            await prisma.powerupCard.create({
              data: {
                type: randomType as any,
                ownerType: "TEAM",
                teamId: team.id,
                roomId: room.id,
              },
            });
            addedAny = true;
          }
        }

        if (addedAny) {
          const updatedState = await buildRoomState(room.id);
          ioInstance.to(`room:${room.code}`).emit("room:state", updatedState);
        }
      } catch (err) {
        console.error("[replenishTeamPowerups]", err);
      }
    }

    // ── Admin: Next Question ──────────────────────────────────────────────────
    socket.on("admin:next", async () => {
      const room = await getAdminRoom(socket);
      if (!room) return;

      // Fast-skip if preparation/countdown is already active
      if (roomPrepareStates.has(room.id)) {
        const prep = roomPrepareStates.get(room.id);
        if (prep) {
          if (prep.timer) clearTimeout(prep.timer);
          roomPrepareStates.delete(room.id);
          if (prep.skipCallback) {
            prep.skipCallback();
            return;
          }
        }
      }

      const questions = room.quizBank?.questions ?? [];

      if (questions.length === 0) {
        socket.emit("error", "Phòng chưa có câu hỏi nào! Vui lòng chọn bộ đề câu hỏi trước khi bắt đầu.");
        return;
      }

      if (room.status === "LOBBY") {
        room.currentQuestion = 0;
        room.status = "PLAYING";
        roomCache.set(room.id, room);
        prisma.room.update({ where: { id: room.id }, data: { currentQuestion: 0, status: "PLAYING" } }).catch(console.error);

        // Ensure 2 initial cards distributed per team
        ensureInitialTeamPowerups(room.id, io).catch(console.error);

        const updatedState = await buildRoomState(room.id);
        io.to(`room:${room.code}`).emit("room:state", updatedState);

        const launchWarmupToFirstQuestion = () => {
          roomPrepareStates.delete(room.id);
          startQuestionPrepareAndLaunch(room, questions, 0);
        };

        io.to(`room:${room.code}`).emit("game:starting", { seconds: 5 });

        const timer = setTimeout(() => {
          launchWarmupToFirstQuestion();
        }, 5000);

        roomPrepareStates.set(room.id, {
          type: "STARTING",
          questionIndex: 0,
          totalQuestions: questions.length,
          targetTimestamp: Date.now() + 5000,
          timer,
          skipCallback: launchWarmupToFirstQuestion,
        });
        return;
      }

      const nextIndex = room.currentQuestion + 1;

      if (nextIndex >= questions.length) {
        stopQuestionTimer(room.id);
        room.status = "FINISHED";
        roomCache.set(room.id, room);
        prisma.room.update({ where: { id: room.id }, data: { status: "FINISHED", endedAt: new Date() } }).catch(console.error);
        const leaderboard = await buildLeaderboard(room.id);
        io.to(`room:${room.code}`).emit("game:ended", { leaderboard });
        return;
      }

      room.currentQuestion = nextIndex;
      room.status = "PLAYING";
      roomCache.set(room.id, room);
      prisma.room.update({ where: { id: room.id }, data: { currentQuestion: nextIndex, status: "PLAYING" } }).catch(console.error);

      // Multi-round replenish: Replenish +1 card for each team with < 3 cards every 3 questions
      if (nextIndex > 0 && nextIndex % 3 === 0) {
        replenishTeamPowerups(room.id, io).catch(console.error);
      }

      await startQuestionPrepareAndLaunch(room, questions, nextIndex);
    });

    socket.on("admin:skip:prepare", async () => {
      const room = await getAdminRoom(socket);
      if (!room) return;
      if (roomPrepareStates.has(room.id)) {
        const prep = roomPrepareStates.get(room.id);
        if (prep) {
          if (prep.timer) clearTimeout(prep.timer);
          roomPrepareStates.delete(room.id);
          if (prep.skipCallback) {
            prep.skipCallback();
          }
        }
      }
    });

    socket.on("admin:pause", async () => {
      const room = await getAdminRoom(socket);
      if (!room) return;
      if (roomPrepareStates.has(room.id)) {
        const prep = roomPrepareStates.get(room.id);
        if (prep?.timer) clearTimeout(prep.timer);
      }
      await prisma.room.update({ where: { id: room.id }, data: { status: "PAUSED" } });
      io.to(`room:${room.code}`).emit("game:paused");
    });

    socket.on("admin:resume", async () => {
      const room = await getAdminRoom(socket);
      if (!room) return;
      await prisma.room.update({ where: { id: room.id }, data: { status: "PLAYING" } });
      io.to(`room:${room.code}`).emit("game:resumed");
    });

    socket.on("admin:reveal", async () => {
      const room = await getAdminRoom(socket);
      if (!room) return;

      const q = room.quizBank?.questions[room.currentQuestion];
      if (!q) return;

      stopQuestionTimer(room.id);
      const qKey = `${room.id}:${q.id}`;

      if (room.mode === "BOUNCEBACK") {
        if (roomStealBuzzed.has(qKey)) {
          await finalizeBouncebackSteal(io, room.id, room.code, q.id);
        } else if (roomPrimaryTeams.has(qKey)) {
          const correct = await finalizeBouncebackPrimary(io, room.id, room.code, q.id);
          if (!correct) {
            await revealCurrentAnswer(io, room.id, room.code, q.id);
          }
        } else {
          await revealCurrentAnswer(io, room.id, room.code, q.id);
        }
      } else if (room.mode === "BUZZ") {
        if (roomBuzzFirst.has(qKey)) {
          await finalizeBuzzAnswer(io, room.id, room.code, q.id);
        } else {
          await revealCurrentAnswer(io, room.id, room.code, q.id);
        }
      } else {
        if (room.teamMode !== "TEAM") {
          await finalizeIndividualScores(io, room.id, room.code, q.id);
        }
        await revealCurrentAnswer(io, room.id, room.code, q.id);
      }
    });

    socket.on("admin:score:manual", async ({ answerId, points }) => {
      const room = await getAdminRoom(socket);
      if (!room) return;

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
      const room = await getAdminRoom(socket);
      if (!room) return;
      const state = await buildRoomState(room.id);
      io.to(`room:${room.code}`).emit("room:state", state);
    });

    socket.on("admin:lock:cards", async (locked: boolean) => {
      const room = await getAdminRoom(socket);
      if (!room) return;
      const config = room.config as any;
      await prisma.room.update({
        where: { id: room.id },
        data: { config: { ...config, cardsLocked: locked } },
      });
      const state = await buildRoomState(room.id);
      io.to(`room:${room.code}`).emit("room:state", state);
    });

    socket.on("admin:buzz:clear", async () => {
      const room = await getAdminRoom(socket);
      if (!room) return;
      io.to(`room:${room.code}`).emit("game:buzz:closed");
    });

    // ── Admin: Kick Player ───────────────────────────────────────────────────
    socket.on("admin:kick:player", async ({ playerId }, callback) => {
      try {
        const room = await getAdminRoom(socket);
        if (!room) {
          callback?.({ success: false, error: "Không có quyền Admin" });
          return;
        }

        const playerToKick = await prisma.player.findFirst({
          where: { id: playerId, roomId: room.id },
        });

        if (!playerToKick) {
          callback?.({ success: false, error: "Không tìm thấy người chơi" });
          return;
        }

        // Delete player
        await prisma.player.delete({ where: { id: playerId } });

        // Disconnect their socket if active
        if (playerToKick.socketId) {
          const clientSock = io.sockets.sockets.get(playerToKick.socketId);
          if (clientSock) {
            clientSock.emit("error", "Bạn đã bị chủ phòng mời ra khỏi phòng.");
            clientSock.disconnect(true);
          }
          playerSockets.delete(playerToKick.socketId);
        }

        const state = await buildRoomState(room.id);
        io.to(`room:${room.code}`).emit("room:state", state);
        callback?.({ success: true });
      } catch (err) {
        console.error("[admin:kick:player]", err);
        callback?.({ success: false, error: "Lỗi khi xoá người chơi" });
      }
    });

    // ── Admin: Clean All Offline Players in Lobby ─────────────────────────────
    socket.on("admin:clean:offline", async (callback) => {
      try {
        const room = await getAdminRoom(socket);
        if (!room) {
          callback?.({ success: false, error: "Không có quyền Admin" });
          return;
        }

        const offlineCandidates = await prisma.player.findMany({
          where: {
            roomId: room.id,
            socketId: null,
            isHost: false,
          },
        });

        // Filter out anyone currently in pendingDisconnects grace period (refreshing)
        const toDeleteIds = offlineCandidates
          .filter((p) => !pendingDisconnects.has(p.id))
          .map((p) => p.id);

        let count = 0;
        if (toDeleteIds.length > 0) {
          const result = await prisma.player.deleteMany({
            where: { id: { in: toDeleteIds } },
          });
          count = result.count;
        }

        const state = await buildRoomState(room.id);
        io.to(`room:${room.code}`).emit("room:state", state);
        callback?.({ success: true, count });
      } catch (err) {
        console.error("[admin:clean:offline]", err);
        callback?.({ success: false, error: "Lỗi khi dọn dẹp thí sinh offline" });
      }
    });

    socket.on("disconnect", async () => {
      adminSockets.delete(socket.id);
      const playerId = playerSockets.get(socket.id);
      if (!playerId) return;

      playerSockets.delete(socket.id);

      const player = await prisma.player.findUnique({
        where: { id: playerId },
        include: { room: true },
      });
      if (!player) return;

      // If player already reconnected with a newer socket, do NOT mark them offline!
      if (player.socketId && player.socketId !== socket.id) {
        return;
      }

      // Check if player has another active socket in playerSockets
      let activeSocketId: string | null = null;
      for (const [sockId, pId] of playerSockets.entries()) {
        if (pId === playerId && io.sockets.sockets.has(sockId)) {
          activeSocketId = sockId;
          break;
        }
      }

      if (activeSocketId) {
        await prisma.player.update({
          where: { id: playerId },
          data: { socketId: activeSocketId },
        }).catch(() => {});
        return;
      }

      // 2.5s grace period to allow seamless page refresh without turning offline
      const existingTimer = pendingDisconnects.get(playerId);
      if (existingTimer) clearTimeout(existingTimer);

      const timer = setTimeout(async () => {
        pendingDisconnects.delete(playerId);

        // Check if player reconnected during the grace period
        let reconnectedSocketId: string | null = null;
        for (const [sockId, pId] of playerSockets.entries()) {
          if (pId === playerId && io.sockets.sockets.has(sockId)) {
            reconnectedSocketId = sockId;
            break;
          }
        }

        if (reconnectedSocketId) {
          await prisma.player.update({
            where: { id: playerId },
            data: { socketId: reconnectedSocketId },
          }).catch(() => {});
          return;
        }

        // Truly disconnected/offline
        await prisma.player.update({
          where: { id: playerId },
          data: { socketId: null },
        }).catch(() => {});

        if (player.room) {
          io.to(`room:${player.room.code}`).emit("player:left", playerId);
          const state = await buildRoomState(player.room.id);
          io.to(`room:${player.room.code}`).emit("room:state", state);
        }
      }, 2500);

      pendingDisconnects.set(playerId, timer);
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

  // Mode permissions check
  if (room.mode === "BOUNCEBACK") {
    const stealInfo = roomStealBuzzed.get(qKey);
    const primary = roomPrimaryTeams.get(qKey);

    if (stealInfo) {
      if (!isAdminOverride && teamId !== stealInfo.teamId && playerId !== stealInfo.playerId) {
        if (socket) socket.emit("error", "Chỉ đội cướp chuông mới được trả lời!");
        return;
      }
    } else if (primary) {
      if (!isAdminOverride && teamId !== primary.teamId) {
        if (socket) socket.emit("error", "Hiện đang là lượt của đội chính!");
        return;
      }
    }
  } else if (room.mode === "BUZZ") {
    const buzz = roomBuzzFirst.get(qKey);
    if (!buzz && !isAdminOverride) {
      if (socket) socket.emit("error", "Chưa có đội nào bấm chuông!");
      return;
    }
    if (!isAdminOverride && buzz && teamId !== buzz.teamId && playerId !== buzz.playerId) {
      if (socket) socket.emit("error", "Chỉ đội bấm chuông đầu tiên mới được trả lời!");
      return;
    }
  }

  const timeSpent = Date.now() - (roomTimers.get(`${room.id}:startedAt`) ? parseInt(roomTimers.get(`${room.id}:startedAt`) as any) : Date.now());

  // Upsert Answer in database: Allows continuous answer switching while timer is running!
  const targetTeamId = teamId;
  const targetPlayerId = playerId;

  let existingAnswer: any = null;
  if (targetTeamId) {
    existingAnswer = await prisma.answer.findFirst({
      where: { roomId: room.id, questionId, teamId: targetTeamId },
    });
  } else if (targetPlayerId) {
    existingAnswer = await prisma.answer.findFirst({
      where: { roomId: room.id, questionId, playerId: targetPlayerId },
    });
  }

  if (existingAnswer) {
    await prisma.answer.update({
      where: { id: existingAnswer.id },
      data: {
        answer: Array.isArray(answer) ? answer : [answer],
        isCorrect: question.type === "ESSAY" ? null : isCorrect,
        timeSpent: isAdminOverride ? 0 : timeSpent,
        submittedAt: new Date(),
      },
    });
  } else {
    await prisma.answer.create({
      data: {
        roomId: room.id,
        questionId,
        playerId: targetPlayerId ?? null,
        teamId: targetTeamId ?? null,
        answer: Array.isArray(answer) ? answer : [answer],
        isCorrect: question.type === "ESSAY" ? null : isCorrect,
        pointsAwarded: 0,
        timeSpent: isAdminOverride ? 0 : timeSpent,
      },
    });
  }
}

// ── Mode Finalization Helpers (Called on timeout or admin reveal) ─────────────

async function finalizeBuzzAnswer(io: IO, roomId: string, roomCode: string, questionId: string) {
  const qKey = `${roomId}:${questionId}`;
  if (roomQuestionProcessed.has(qKey)) return;
  roomQuestionProcessed.add(qKey);

  stopQuestionTimer(roomId);

  const room = await prisma.room.findUnique({ where: { id: roomId }, include: { teams: true } });
  const question = await prisma.question.findUnique({ where: { id: questionId } });
  if (!room || !question) return;

  const buzz = roomBuzzFirst.get(qKey);
  const effTeamId = buzz?.teamId;
  if (!effTeamId) {
    await revealCurrentAnswer(io, roomId, roomCode, questionId);
    return;
  }

  const existingAns = await prisma.answer.findFirst({
    where: { roomId, questionId, teamId: effTeamId },
  });

  const teamCardsMap = roomQuestionTeamCards.get(qKey);
  const activeCard = teamCardsMap?.get(effTeamId);
  let multiplier = 1;
  const currentTeamObj = room.teams.find((t) => t.id === effTeamId);
  let shielded = currentTeamObj ? currentTeamObj.shieldCount > 0 : false;
  if (activeCard) {
    if (activeCard.type === "DOUBLE") multiplier = 2;
    if (activeCard.type === "SCORE_X2") {
      multiplier = 1.5;
      shielded = true;
    }
    if (activeCard.type === "SHIELD") shielded = true;
  }

  const isCorrect = existingAns?.isCorrect === true;
  let points = 0;
  if (isCorrect) {
    points = Math.floor(question.points * multiplier);
  } else {
    const config = room.config as any;
    points = (config.penaltyForWrong && !shielded) ? -Math.floor(question.points * 0.5) : 0;
  }

  if (existingAns) {
    await prisma.answer.update({
      where: { id: existingAns.id },
      data: { pointsAwarded: points, isCorrect },
    });
  } else {
    await prisma.answer.create({
      data: {
        roomId,
        questionId,
        teamId: effTeamId,
        playerId: buzz.playerId,
        answer: [],
        isCorrect: false,
        pointsAwarded: points,
        timeSpent: 0,
      },
    });
  }

  if (points !== 0) {
    const updatedTeam = await prisma.team.update({
      where: { id: effTeamId },
      data: { score: { increment: points } },
    });
    io.to(`room:${roomCode}`).emit("game:score:update", [
      { teamId: effTeamId, score: updatedTeam.score, delta: points },
    ]);
  }

  await revealCurrentAnswer(io, roomId, roomCode, questionId);
}

async function finalizeBouncebackPrimary(io: IO, roomId: string, roomCode: string, questionId: string): Promise<boolean> {
  const qKey = `${roomId}:${questionId}`;
  if (roomQuestionProcessed.has(qKey)) return false;

  stopQuestionTimer(roomId);

  const room = await prisma.room.findUnique({ where: { id: roomId }, include: { teams: true } });
  const question = await prisma.question.findUnique({ where: { id: questionId } });
  if (!room || !question) return false;

  const primary = roomPrimaryTeams.get(qKey);
  if (!primary) return false;

  const existingAns = await prisma.answer.findFirst({
    where: { roomId, questionId, teamId: primary.teamId },
  });

  const isCorrect = existingAns?.isCorrect === true;

  if (isCorrect) {
    roomQuestionProcessed.add(qKey);

    const teamCardsMap = roomQuestionTeamCards.get(qKey);
    const activeCard = teamCardsMap?.get(primary.teamId);
    let multiplier = 1;
    if (activeCard && activeCard.type === "DOUBLE") {
      multiplier = 2;
    } else if (activeCard && activeCard.type === "SCORE_X2") {
      multiplier = 1.5;
    }
    const points = Math.floor(question.points * multiplier);

    await prisma.answer.update({
      where: { id: existingAns!.id },
      data: { pointsAwarded: points, isCorrect: true },
    });

    const updatedTeam = await prisma.team.update({
      where: { id: primary.teamId },
      data: { score: { increment: points } },
    });
    io.to(`room:${roomCode}`).emit("game:score:update", [
      { teamId: primary.teamId, score: updatedTeam.score, delta: points },
    ]);

    await revealCurrentAnswer(io, roomId, roomCode, questionId);
    return true;
  } else {
    if (existingAns) {
      await prisma.answer.update({
        where: { id: existingAns.id },
        data: { pointsAwarded: 0, isCorrect: false },
      });
    } else {
      await prisma.answer.create({
        data: {
          roomId,
          questionId,
          teamId: primary.teamId,
          answer: [],
          isCorrect: false,
          pointsAwarded: 0,
          timeSpent: 0,
        },
      });
    }

    io.to(`room:${roomCode}`).emit("game:timer", { remaining: 0, total: question.timeLimit });
    return false;
  }
}

async function finalizeBouncebackSteal(io: IO, roomId: string, roomCode: string, questionId: string) {
  const qKey = `${roomId}:${questionId}`;
  if (roomQuestionProcessed.has(qKey)) return;
  roomQuestionProcessed.add(qKey);

  stopQuestionTimer(roomId);

  const room = await prisma.room.findUnique({ where: { id: roomId }, include: { teams: true } });
  const question = await prisma.question.findUnique({ where: { id: questionId } });
  if (!room || !question) return;

  const stealInfo = roomStealBuzzed.get(qKey);
  if (!stealInfo) {
    await revealCurrentAnswer(io, roomId, roomCode, questionId);
    return;
  }

  const existingAns = await prisma.answer.findFirst({
    where: { roomId, questionId, teamId: stealInfo.teamId },
  });

  const teamCardsMap = roomQuestionTeamCards.get(qKey);
  const activeCard = teamCardsMap?.get(stealInfo.teamId);
  let multiplier = 1;
  const currentTeamObj = room.teams.find((t) => t.id === stealInfo.teamId);
  let shielded = currentTeamObj ? currentTeamObj.shieldCount > 0 : false;
  if (activeCard) {
    if (activeCard.type === "DOUBLE") multiplier = 2;
    if (activeCard.type === "SCORE_X2") {
      multiplier = 1.5;
      shielded = true;
    }
    if (activeCard.type === "SHIELD") shielded = true;
  }

  const isCorrect = existingAns?.isCorrect === true;
  let points = 0;
  if (isCorrect) {
    points = Math.floor(question.points * multiplier);
  } else {
    points = shielded ? 0 : -Math.floor(question.points * 0.5);
  }

  if (existingAns) {
    await prisma.answer.update({
      where: { id: existingAns.id },
      data: { pointsAwarded: points, isCorrect },
    });
  } else {
    await prisma.answer.create({
      data: {
        roomId,
        questionId,
        teamId: stealInfo.teamId,
        playerId: stealInfo.playerId,
        answer: [],
        isCorrect: false,
        pointsAwarded: points,
        timeSpent: 0,
      },
    });
  }

  if (points !== 0) {
    const updatedTeam = await prisma.team.update({
      where: { id: stealInfo.teamId },
      data: { score: { increment: points } },
    });
    io.to(`room:${roomCode}`).emit("game:score:update", [
      { teamId: stealInfo.teamId, score: updatedTeam.score, delta: points },
    ]);
  }

  await revealCurrentAnswer(io, roomId, roomCode, questionId);
}

async function finalizeIndividualScores(io: IO, roomId: string, roomCode: string, questionId: string) {
  const qKey = `${roomId}:${questionId}`;
  if (roomQuestionProcessed.has(qKey)) return;
  roomQuestionProcessed.add(qKey);

  const room = await prisma.room.findUnique({ where: { id: roomId } });
  const question = await prisma.question.findUnique({ where: { id: questionId } });
  if (!room || !question) return;

  const answers = await prisma.answer.findMany({
    where: { roomId, questionId },
  });

  const config = room.config as any;
  const effectiveConfig = {
    ...config,
    timeBonusEnabled: room.mode === "CLASSIC" ? Boolean(config?.timeBonusEnabled) : false,
  };

  const scoreUpdates: ScoreUpdate[] = [];

  for (const ans of answers) {
    if (!ans.playerId) continue;

    const points = computePointsAwarded({
      basePoints: question.points,
      timeSpent: ans.timeSpent,
      timeLimit: question.timeLimit,
      isCorrect: ans.isCorrect ?? false,
      config: effectiveConfig,
    });

    await prisma.answer.update({
      where: { id: ans.id },
      data: { pointsAwarded: points },
    });

    if (points !== 0) {
      const updatedPlayer = await prisma.player.update({
        where: { id: ans.playerId },
        data: { score: { increment: points } },
      });
      scoreUpdates.push({
        playerId: ans.playerId,
        teamId: ans.teamId ?? undefined,
        score: updatedPlayer.score,
        delta: points,
      });
    }
  }

  if (scoreUpdates.length > 0) {
    io.to(`room:${roomCode}`).emit("game:score:update", scoreUpdates);
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────────

async function getRoomQuestions(roomId: string) {
  if (roomQuestionsCache.has(roomId)) {
    return roomQuestionsCache.get(roomId)!;
  }
  const room = await prisma.room.findUnique({
    where: { id: roomId },
    include: { quizBank: { include: { questions: { orderBy: { order: "asc" } } } } },
  });
  const questions = room?.quizBank?.questions ?? [];
  if (questions.length > 0) {
    roomQuestionsCache.set(roomId, questions);
  }
  return questions;
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

  // Filter out any ghost host/admin dummy players
  const validPlayers = room.players.filter((p) => !p.isHost && p.name !== "Host" && p.name !== "Admin Host");

  const teams: TeamState[] = room.teams.map((t) => {
    const teamPlayers = validPlayers.filter((p) => p.teamId === t.id);
    return {
      id: t.id,
      name: t.name,
      color: t.color,
      avatar: t.avatar ?? undefined,
      score: t.score,
      isEliminated: t.isEliminated,
      frozenRounds: t.frozenRounds,
      shieldCount: t.shieldCount,
      cards: t.powerupCards.map((c) => ({
        id: c.id,
        type: c.type as any,
        ownerType: c.ownerType as any,
        teamId: c.teamId ?? undefined,
        used: c.used,
      })),
      playerCount: teamPlayers.length,
    };
  });

  const players: PlayerState[] = validPlayers.map((p) => {
    let isConnected = false;
    if (p.socketId && globalIO?.sockets.sockets.has(p.socketId)) {
      isConnected = true;
    } else if (p.socketId && !globalIO) {
      isConnected = true;
    } else {
      // Check if player has any other active socket in playerSockets
      for (const [sockId, pId] of playerSockets.entries()) {
        if (pId === p.id && globalIO?.sockets.sockets.has(sockId)) {
          isConnected = true;
          break;
        }
      }
    }
    const isOnline = isConnected || pendingDisconnects.has(p.id);

    return {
      id: p.id,
      name: p.name,
      avatar: p.avatar ?? undefined,
      score: p.score,
      teamId: p.teamId ?? undefined,
      isHost: false,
      isOnline,
    };
  });

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
      if (activeCard.type === "DOUBLE") {
        multiplier = 2;
      } else if (activeCard.type === "SCORE_X2") {
        multiplier = 1.5;
        shielded = true;
      }
      if (activeCard.type === "SHIELD") {
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
      if (!room) return;
      const qKey = `${roomId}:${questionId}`;

      if (room.mode === "BOUNCEBACK") {
        if (roomStealBuzzed.has(qKey)) {
          await finalizeBouncebackSteal(io, roomId, roomCode, questionId);
        } else if (roomPrimaryTeams.has(qKey)) {
          await finalizeBouncebackPrimary(io, roomId, roomCode, questionId);
        }
      } else if (room.mode === "BUZZ") {
        if (roomBuzzFirst.has(qKey)) {
          await finalizeBuzzAnswer(io, roomId, roomCode, questionId);
        }
      } else if (room.mode === "CLASSIC" || room.mode === "ELIMINATION") {
        if (room.teamMode === "TEAM") {
          const { teamScoresUpdates } = await resolveQuestionTeamScores(io, roomId, questionId);
          if (teamScoresUpdates.length > 0) {
            io.to(`room:${roomCode}`).emit("game:score:update", teamScoresUpdates);
          }
        } else {
          await finalizeIndividualScores(io, roomId, roomCode, questionId);
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
    const validPlayers = room.players.filter((p) => !p.isHost && p.name !== "Host" && p.name !== "Admin Host");
    return validPlayers
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
