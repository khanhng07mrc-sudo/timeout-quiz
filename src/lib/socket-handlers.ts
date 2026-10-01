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
  TournamentMatch,
  TournamentState,
  GridCell,
  GridCaroState,
  DiceTile,
  DiceRaceState,
  TeamRaceProgress,
  TeamWager,
  WagerState,
} from "@/types";
import { computePointsAwarded, computeTeamQuestionScore, computeStealAmount } from "./game-engine/scoring";
import { shuffleArray } from "./utils";
import { verifyAdminToken, sanitizePlayerName } from "./security";
import { checkPlayerJoinLimit, checkActionDebounce, MAX_PLAYERS_PER_ROOM } from "./rate-limiter";

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

// New Game Modes in-memory stores
const roomTournaments = new Map<string, TournamentState>();
const roomGridCaros = new Map<string, GridCaroState>();
const roomDiceRaces = new Map<string, DiceRaceState>();
const roomWagers = new Map<string, WagerState>();
const roomUsedQuestions = new Map<string, Set<string>>(); // roomId -> Set(questionId)
const roomWagerTimers = new Map<string, NodeJS.Timeout>(); // roomId -> wager timer
const roomGridTimers = new Map<string, NodeJS.Timeout>(); // roomId -> preview timer

// ── Helpers for Grid Caro, Tournament, Dice Race ─────────────────────────────

function checkGridCaroStreak(
  cells: GridCell[],
  rows: number,
  cols: number,
  teamId: string,
  targetK: number
): GridCell[] | null {
  if (rows < 4 || cols < 4 || targetK < 3) return null;

  const cellMap = new Map<string, GridCell>();
  cells.forEach((c) => {
    cellMap.set(`${c.row},${c.col}`, c);
  });

  // Check rows
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c <= cols - targetK; c++) {
      const streakCells: GridCell[] = [];
      for (let k = 0; k < targetK; k++) {
        const cell = cellMap.get(`${r},${c + k}`);
        if (cell && cell.isCompleted && cell.claimedByTeamId === teamId) {
          streakCells.push(cell);
        }
      }
      if (streakCells.length === targetK) return streakCells;
    }
  }

  // Check columns
  for (let c = 0; c < cols; c++) {
    for (let r = 0; r <= rows - targetK; r++) {
      const streakCells: GridCell[] = [];
      for (let k = 0; k < targetK; k++) {
        const cell = cellMap.get(`${r + k},${c}`);
        if (cell && cell.isCompleted && cell.claimedByTeamId === teamId) {
          streakCells.push(cell);
        }
      }
      if (streakCells.length === targetK) return streakCells;
    }
  }

  // Check diagonals (top-left to bottom-right)
  for (let r = 0; r <= rows - targetK; r++) {
    for (let c = 0; c <= cols - targetK; c++) {
      const streakCells: GridCell[] = [];
      for (let k = 0; k < targetK; k++) {
        const cell = cellMap.get(`${r + k},${c + k}`);
        if (cell && cell.isCompleted && cell.claimedByTeamId === teamId) {
          streakCells.push(cell);
        }
      }
      if (streakCells.length === targetK) return streakCells;
    }
  }

  // Check anti-diagonals (top-right to bottom-left)
  for (let r = 0; r <= rows - targetK; r++) {
    for (let c = targetK - 1; c < cols; c++) {
      const streakCells: GridCell[] = [];
      for (let k = 0; k < targetK; k++) {
        const cell = cellMap.get(`${r + k},${c - k}`);
        if (cell && cell.isCompleted && cell.claimedByTeamId === teamId) {
          streakCells.push(cell);
        }
      }
      if (streakCells.length === targetK) return streakCells;
    }
  }

  return null;
}

function buildTournamentMatches(teams: any[], questionsPerMatch: number): TournamentMatch[] {
  const matches: TournamentMatch[] = [];
  const teamCount = teams.length;

  if (teamCount <= 2) {
    matches.push({
      id: "FINAL",
      roundIndex: 0,
      roundName: "Chung kết",
      matchIndex: 0,
      team1Id: teams[0]?.id,
      team1Name: teams[0]?.name,
      team1Color: teams[0]?.color,
      team2Id: teams[1]?.id,
      team2Name: teams[1]?.name,
      team2Color: teams[1]?.color,
      team1Score: 0,
      team2Score: 0,
      status: "IN_PROGRESS",
      currentQuestionInMatch: 0,
      totalQuestionsInMatch: questionsPerMatch,
    });
    return matches;
  }

  if (teamCount <= 4) {
    matches.push(
      {
        id: "SF-1",
        roundIndex: 0,
        roundName: "Bán kết 1",
        matchIndex: 0,
        team1Id: teams[0]?.id,
        team1Name: teams[0]?.name,
        team1Color: teams[0]?.color,
        team2Id: teams[3]?.id || teams[1]?.id,
        team2Name: teams[3]?.name || teams[1]?.name,
        team2Color: teams[3]?.color || teams[1]?.color,
        team1Score: 0,
        team2Score: 0,
        status: "IN_PROGRESS",
        currentQuestionInMatch: 0,
        totalQuestionsInMatch: questionsPerMatch,
      },
      {
        id: "SF-2",
        roundIndex: 0,
        roundName: "Bán kết 2",
        matchIndex: 1,
        team1Id: teams[1]?.id,
        team1Name: teams[1]?.name,
        team1Color: teams[1]?.color,
        team2Id: teams[2]?.id,
        team2Name: teams[2]?.name,
        team2Color: teams[2]?.color,
        team1Score: 0,
        team2Score: 0,
        status: "UPCOMING",
        currentQuestionInMatch: 0,
        totalQuestionsInMatch: questionsPerMatch,
      },
      {
        id: "FINAL",
        roundIndex: 1,
        roundName: "Chung kết",
        matchIndex: 2,
        team1Score: 0,
        team2Score: 0,
        status: "UPCOMING",
        currentQuestionInMatch: 0,
        totalQuestionsInMatch: questionsPerMatch,
      }
    );
    return matches;
  }

  // 8 teams: QF (4) -> SF (2) -> Final (1)
  for (let i = 0; i < 4; i++) {
    const t1 = teams[i * 2];
    const t2 = teams[i * 2 + 1];
    matches.push({
      id: `QF-${i + 1}`,
      roundIndex: 0,
      roundName: `Tứ kết ${i + 1}`,
      matchIndex: i,
      team1Id: t1?.id,
      team1Name: t1?.name,
      team1Color: t1?.color,
      team2Id: t2?.id,
      team2Name: t2?.name,
      team2Color: t2?.color,
      team1Score: 0,
      team2Score: 0,
      status: i === 0 ? "IN_PROGRESS" : "UPCOMING",
      currentQuestionInMatch: 0,
      totalQuestionsInMatch: questionsPerMatch,
    });
  }
  matches.push(
    {
      id: "SF-1",
      roundIndex: 1,
      roundName: "Bán kết 1",
      matchIndex: 4,
      team1Score: 0,
      team2Score: 0,
      status: "UPCOMING",
      currentQuestionInMatch: 0,
      totalQuestionsInMatch: questionsPerMatch,
    },
    {
      id: "SF-2",
      roundIndex: 1,
      roundName: "Bán kết 2",
      matchIndex: 5,
      team1Score: 0,
      team2Score: 0,
      status: "UPCOMING",
      currentQuestionInMatch: 0,
      totalQuestionsInMatch: questionsPerMatch,
    },
    {
      id: "FINAL",
      roundIndex: 2,
      roundName: "Chung kết",
      matchIndex: 6,
      team1Score: 0,
      team2Score: 0,
      status: "UPCOMING",
      currentQuestionInMatch: 0,
      totalQuestionsInMatch: questionsPerMatch,
    }
  );
  return matches;
}

function generateDiceTiles(totalTiles: number): DiceTile[] {
  const tiles: DiceTile[] = [];
  for (let i = 0; i < totalTiles; i++) {
    if (i === 0) {
      tiles.push({ index: i, type: "NORMAL", label: "Xuất phát" });
    } else if (i === totalTiles - 1) {
      tiles.push({ index: i, type: "FINISH", label: "VỀ ĐÍCH" });
    } else {
      const pct = i / totalTiles;
      if (Math.abs(pct - 0.2) < 0.04 || Math.abs(pct - 0.5) < 0.04 || Math.abs(pct - 0.8) < 0.04) {
        tiles.push({ index: i, type: "BOOST", label: "🚀 +2 Bước", effectValue: 2 });
      } else if (Math.abs(pct - 0.3) < 0.04 || Math.abs(pct - 0.7) < 0.04) {
        tiles.push({ index: i, type: "TRAP", label: "💥 Bẫy -2 Bước", effectValue: -2 });
      } else if (Math.abs(pct - 0.15) < 0.04 || Math.abs(pct - 0.45) < 0.04 || Math.abs(pct - 0.75) < 0.04) {
        tiles.push({ index: i, type: "GEM", label: "💎 Ngọc +150đ", effectValue: 150 });
      } else if (Math.abs(pct - 0.6) < 0.04) {
        tiles.push({ index: i, type: "SWAP", label: "🔀 Đổi chỗ" });
      } else {
        tiles.push({ index: i, type: "NORMAL", label: "⭐" });
      }
    }
  }
  return tiles;
}

// In-memory cache for ultra-fast response
const roomCache = new Map<string, any>(); // roomId -> room with quizBank & questions
const roomQuestionsCache = new Map<string, any[]>(); // roomId -> questions
const roomActiveAnswers = new Map<string, Map<string, { teamId?: string; playerId?: string; answer: string | string[]; isCorrect: boolean | null; timeSpent: number; submittedAt: number }>>(); // qKey -> (actorKey -> answerData)

async function getAdminRoom(socket: Sock) {
  const roomId = adminSockets.get(socket.id);
  if (!roomId) return null;

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

export function registerSocketHandlers(io: IO) {
  globalIO = io;

  io.on("connection", (socket: Sock) => {
    console.log(`[Socket] Connected: ${socket.id}`);

    // ── Join Room ────────────────────────────────────────────────────────────
    socket.on("room:join", async ({ code, playerName, playerId, teamId }, callback) => {
      try {
        const clientIp = (socket.handshake.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || socket.handshake.address || socket.id;
        const joinLimit = checkPlayerJoinLimit(clientIp);
        if (!joinLimit.allowed) {
          return callback({ success: false, error: `Bạn đang gửi yêu cầu quá nhanh. Vui lòng thử lại sau ${joinLimit.retryAfterSeconds}s.` });
        }

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

        const cleanedName = sanitizePlayerName(playerName || "Thí sinh");
        if (!cleanedName || cleanedName.length === 0) {
          return callback({ success: false, error: "Tên người chơi không hợp lệ (không chứa mã độc hoặc rỗng)" });
        }

        // Capacity check
        if (room.players.length >= MAX_PLAYERS_PER_ROOM && !playerId) {
          return callback({ success: false, error: `Phòng thi đã đạt giới hạn tối đa (${MAX_PLAYERS_PER_ROOM} người tham gia)` });
        }

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

            const finalName = (cleanedName && cleanedName !== "Player" && cleanedName !== "Thí sinh")
              ? cleanedName
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
              name: cleanedName,
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
                name: cleanedName,
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
                name: cleanedName,
                socketId: null,
              },
            }).catch(() => {});
          }

          const newId = (playerId && playerId.length > 5) ? playerId : `p_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
          player = await prisma.player.create({
            data: {
              id: newId,
              name: cleanedName,
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

        // If the game is PLAYING and not in preparation countdown, recover current question and timer for this player socket
        const isPreparing = roomPrepareStates.has(room.id);
        if (room.status === "PLAYING" && room.quizBank?.questions && !isPreparing) {
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
    socket.on("admin:join", async (arg1: any, arg2?: any, arg3?: any) => {
      let callback: any;
      try {
        let code = "";
        let hostKey: string | undefined;

        if (typeof arg1 === "object" && arg1 !== null) {
          code = arg1.code;
          hostKey = arg1.hostKey;
          callback = typeof arg2 === "function" ? arg2 : undefined;
        } else if (typeof arg1 === "string") {
          code = arg1;
          if (typeof arg2 === "string") {
            hostKey = arg2;
            callback = typeof arg3 === "function" ? arg3 : undefined;
          } else if (typeof arg2 === "function") {
            callback = arg2;
          }
        }

        const room = await prisma.room.findUnique({
          where: { code },
          include: { quizBank: { include: { questions: { orderBy: { order: "asc" } } } } },
        });
        if (!room) {
          return callback?.({ success: false, error: "Phòng không tồn tại" });
        }

        // Verify Host Authorization:
        // 1. Check if token in handshake/auth is valid Admin Master Passcode
        const authHeader = (socket.handshake.auth?.token as string) || (socket.handshake.headers["authorization"] as string);
        const isAdminTokenValid = authHeader ? verifyAdminToken(authHeader.replace("Bearer ", "")) : false;
        // 2. Check if hostKey matches room.hostKey
        const isHostKeyValid = room.hostKey ? (hostKey === room.hostKey) : true;

        if (!isAdminTokenValid && !isHostKeyValid) {
          return callback?.({
            success: false,
            error: "Khóa bảo mật Host không hợp lệ. Vui lòng sử dụng đúng liên kết Host hoặc nhập Master Admin Passcode.",
            requiresAuth: true,
          });
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

        // If the game is PLAYING and not in preparation countdown, recover current question and timer for admin socket
        const isPreparing = roomPrepareStates.has(room.id);
        if (room.status === "PLAYING" && room.quizBank?.questions && !isPreparing) {
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

        callback?.({ success: true, hostKey: room.hostKey, roomState });
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

        const isPreparing = roomPrepareStates.has(room.id);
        if (room.status === "PLAYING" && room.quizBank?.questions && !isPreparing) {
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
      if (!checkActionDebounce(socket.id, 200)) return;

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
      if (!checkActionDebounce(socket.id, 300)) return;

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
      const existingPrepare = roomPrepareStates.get(room.id);
      if (existingPrepare?.timer) {
        clearTimeout(existingPrepare.timer);
      }
      roomPrepareStates.delete(room.id);

      const existingWagerTimer = roomWagerTimers.get(room.id);
      if (existingWagerTimer) {
        clearInterval(existingWagerTimer);
        roomWagerTimers.delete(room.id);
      }

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
      let tournamentMatchId: string | undefined;
      let gridCellId: number | undefined;
      let diceRollValue: number | undefined;

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
      } else if (room.mode === "TOURNAMENT") {
        const tournament = roomTournaments.get(room.id);
        const currentMatch = tournament?.matches.find((m) => m.id === tournament.currentMatchId);
        if (currentMatch) {
          primaryTeamId = currentMatch.team1Id;
          primaryTeamName = `${currentMatch.team1Name || "?"} vs ${currentMatch.team2Name || "?"}`;
          tournamentMatchId = currentMatch.id;
        }
      } else if (room.mode === "GRID_CARO") {
        const gridState = roomGridCaros.get(room.id);
        if (gridState) {
          primaryTeamId = gridState.currentTurnTeamId;
          primaryTeamName = gridState.currentTurnTeamName;
          gridCellId = gridState.selectedCellId;
        }
      } else if (room.mode === "DICE_RACE") {
        const diceState = roomDiceRaces.get(room.id);
        if (diceState) {
          primaryTeamId = diceState.currentTurnTeamId;
          primaryTeamName = diceState.currentTurnTeamName;
          diceRollValue = diceState.lastDiceRoll;
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
          tournamentMatchId,
          gridCellId,
          diceRollValue,
          wagerPhase: room.mode === "WAGER" ? "QUESTION_PERIOD" : undefined,
        });
        io.to(`room:${room.code}`).emit("game:question", questionState);
        startQuestionTimer(io, room.code, room.id, q.id, q.timeLimit);
      };

      if (room.mode === "WAGER") {
        const wagerTime = config?.wagerTimeSeconds || 15;
        const teams = await prisma.team.findMany({ where: { roomId: room.id } });
        const initialWagers: Record<string, TeamWager> = {};
        teams.forEach((t) => {
          initialWagers[t.id] = { teamId: t.id, teamName: t.name, amount: 10, submitted: false };
        });

        const prevWagerState = roomWagers.get(room.id);
        const bailoutMax = config?.wagerBailoutLimit ?? 1;
        const teamBailouts = prevWagerState?.teamBailouts ?? {};
        teams.forEach((t) => {
          if (!teamBailouts[t.id]) {
            teamBailouts[t.id] = { remaining: bailoutMax, max: bailoutMax };
          }
        });

        const wagerState: WagerState = {
          phase: "WAGER_PERIOD",
          wagerTimeRemaining: wagerTime,
          wagerTimeTotal: wagerTime,
          minWager: 5,
          currentHighestWager: 0,
          lastWagerTeamId: undefined,
          wagerHistory: [],
          allowanceMinScore: config?.wagerMinAllowance || 50,
          initialPoints: config?.wagerInitialPoints || 50,
          topicPreview: q.hint || "Tổng hợp kiến thức",
          difficultyPreview: bloomLevel,
          teamWagers: initialWagers,
          teamBailouts,
          bailoutQueue: prevWagerState?.bailoutQueue ?? [],
          currentQuestionBailoutUsed: false,
        };
        roomWagers.set(room.id, wagerState);
        io.to(`room:${room.code}`).emit("game:wager:update", wagerState);

        let wRem = wagerTime;
        const wTimer = setInterval(() => {
          wRem--;
          wagerState.wagerTimeRemaining = wRem;
          if (wRem <= 0) {
            clearInterval(wTimer);
            roomWagerTimers.delete(room.id);
            wagerState.phase = "QUESTION_PERIOD";
            io.to(`room:${room.code}`).emit("game:wager:update", wagerState);
            launchQuestion();
          } else {
            io.to(`room:${room.code}`).emit("game:wager:update", wagerState);
          }
        }, 1000);
        roomWagerTimers.set(room.id, wTimer);
        return;
      }

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

        // Mode Initializations
        const teams = await prisma.team.findMany({ where: { roomId: room.id }, orderBy: { createdAt: "asc" } });
        const config = room.config as any;

        if (room.mode === "TOURNAMENT") {
          const questionsPerMatch = config?.tournamentQuestionsPerMatch || 3;
          const matches = buildTournamentMatches(teams, questionsPerMatch);
          roomTournaments.set(room.id, {
            matches,
            currentMatchId: matches[0]?.id,
            questionsPerMatch,
          });
        } else if (room.mode === "GRID_CARO") {
          const rows = config?.gridRows || 4;
          const cols = config?.gridCols || 4;
          const streakK = config?.gridStreakTargetK || 3;
          const bonusPts = config?.gridCaroBonusPoints || 30;
          const totalCells = rows * cols;
          const isCaroEligible = rows >= 4 && cols >= 4;
          const caroEnabled = isCaroEligible && config?.gridCaroEnabled !== false && questions.length >= totalCells;

          // Available points from quiz bank questions (e.g. 10, 15, 30)
          const availablePoints: number[] = Array.from(new Set<number>(questions.map((q: any) => Number(q.points) || 10))).sort((a, b) => a - b);
          const pointPalette: number[] = availablePoints.length > 0 ? availablePoints : [10, 20, 30];

          const cells: GridCell[] = [];
          for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
              const cellId = r * cols + c + 1;
              const pts = Number(pointPalette[(r * cols + c) % pointPalette.length]);
              const bloom = getBloomLevelFromPoints(pts);
              const diff: "DỄ" | "TRUNG BÌNH" | "KHÓ" | "CỰC KHÓ" =
                bloom === "REMEMBER" ? "DỄ" :
                bloom === "APPLY" ? "TRUNG BÌNH" : "KHÓ";

              cells.push({
                id: cellId,
                row: r,
                col: c,
                points: pts,
                difficulty: diff,
                isCompleted: false,
                attemptCount: 0,
              });
            }
          }

          const numTeams = Math.max(1, teams.length);
          const configuredRounds = config?.gridRoundsPerTeam || 3;
          const maxPossibleRounds = Math.max(1, Math.floor(questions.length / numTeams));
          const maxRounds = Math.min(configuredRounds, maxPossibleRounds);
          const maxTurns = maxRounds * numTeams;

          const gridCaroState: GridCaroState = {
            rows,
            cols,
            totalCells,
            cells,
            previewActive: false,
            previewRemaining: 0,
            currentTurnTeamId: teams[0]?.id,
            currentTurnTeamName: teams[0]?.name,
            currentRound: 1,
            maxRounds,
            turnsCompleted: 0,
            maxTurns,
            caroEnabled,
            streakTargetK: streakK,
            caroAchievedTeams: [],
            caroBonusPoints: bonusPts,
          };
          roomGridCaros.set(room.id, gridCaroState);
        } else if (room.mode === "DICE_RACE") {
          const totalTiles = config?.diceTrackTotalTiles || 30;
          const tiles = generateDiceTiles(totalTiles);
          const teamPositions: Record<string, TeamRaceProgress> = {};
          teams.forEach((t) => {
            teamPositions[t.id] = {
              teamId: t.id,
              teamName: t.name,
              teamColor: t.color,
              position: 0,
              hasFinished: false,
            };
          });

          roomDiceRaces.set(room.id, {
            totalTiles,
            tiles,
            teamPositions,
            currentTurnTeamId: teams[0]?.id,
            currentTurnTeamName: teams[0]?.name,
            isRolling: false,
            dicePendingAnswer: false,
            finishLeaderboard: [],
          });
        } else if (room.mode === "WAGER") {
          const initPoints = Math.max(30, config?.wagerInitialPoints || 50);
          const bailoutMax = config?.wagerBailoutLimit ?? 1;
          for (const team of teams) {
            await prisma.team.update({
              where: { id: team.id },
              data: { score: initPoints },
            });
            team.score = initPoints;
          }
          const teamBailouts: Record<string, { remaining: number; max: number }> = {};
          teams.forEach((t) => {
            teamBailouts[t.id] = { remaining: bailoutMax, max: bailoutMax };
          });
          roomWagers.set(room.id, {
            phase: "WAGER_PERIOD",
            wagerTimeRemaining: config?.wagerTimeSeconds || 15,
            wagerTimeTotal: config?.wagerTimeSeconds || 15,
            minWager: 5,
            currentHighestWager: 0,
            lastWagerTeamId: undefined,
            wagerHistory: [],
            allowanceMinScore: config?.wagerMinAllowance || 50,
            initialPoints: initPoints,
            teamWagers: {},
            teamBailouts,
          });
        }

        const updatedState = await buildRoomState(room.id);
        io.to(`room:${room.code}`).emit("room:state", updatedState);

        if (room.mode === "GRID_CARO" || room.mode === "DICE_RACE") {
          // Board-based modes wait for turn player's action (cell select / dice roll)
          return;
        }

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

      if (room.mode === "GRID_CARO") {
        const gridState = roomGridCaros.get(room.id);
        if (gridState) {
          const uncompleted = gridState.cells.filter((c) => !c.isCompleted);
          if (uncompleted.length === 0) {
            stopQuestionTimer(room.id);
            room.status = "FINISHED";
            roomCache.set(room.id, room);
            prisma.room.update({ where: { id: room.id }, data: { status: "FINISHED", endedAt: new Date() } }).catch(console.error);
            const leaderboard = await buildLeaderboard(room.id);
            io.to(`room:${room.code}`).emit("game:ended", { leaderboard });
            return;
          }
          gridState.selectedCellId = undefined;
          io.to(`room:${room.code}`).emit("game:grid:update", gridState);
          io.to(`room:${room.code}`).emit("game:question:clear");
          return;
        }
      }

      if (room.mode === "DICE_RACE") {
        const diceState = roomDiceRaces.get(room.id);
        if (diceState) {
          const allFinished = Object.values(diceState.teamPositions).every((p) => p.hasFinished);
          if (allFinished) {
            stopQuestionTimer(room.id);
            room.status = "FINISHED";
            roomCache.set(room.id, room);
            prisma.room.update({ where: { id: room.id }, data: { status: "FINISHED", endedAt: new Date() } }).catch(console.error);
            const leaderboard = await buildLeaderboard(room.id);
            io.to(`room:${room.code}`).emit("game:ended", { leaderboard });
            return;
          }
          diceState.dicePendingAnswer = false;
          io.to(`room:${room.code}`).emit("game:dice:update", diceState);
          io.to(`room:${room.code}`).emit("game:question:clear");
          return;
        }
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
      } else if (room.mode === "TOURNAMENT") {
        await finalizeTournamentQuestion(io, room.id, room.code, q.id);
      } else if (room.mode === "GRID_CARO") {
        await finalizeGridCaroQuestion(io, room.id, room.code, q.id);
      } else if (room.mode === "DICE_RACE") {
        await finalizeDiceRaceQuestion(io, room.id, room.code, q.id);
      } else if (room.mode === "WAGER") {
        await finalizeWagerQuestion(io, room.id, room.code, q.id);
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

    // ── Grid Caro Events ──────────────────────────────────────────────────────
    async function handleGridCellSelect(room: any, cellId: number) {
      const gridState = roomGridCaros.get(room.id);
      if (!gridState || gridState.selectedCellId || roomPrepareStates.has(room.id)) return;

      const cell = gridState.cells.find((c) => c.id === cellId);
      if (!cell || cell.isCompleted) return;

      const autoAdvanceKey = `${room.id}:auto_advance`;
      if (roomGridTimers.has(autoAdvanceKey)) {
        clearInterval(roomGridTimers.get(autoAdvanceKey)!);
        roomGridTimers.delete(autoAdvanceKey);
      }
      gridState.autoAdvanceSeconds = undefined;

      gridState.selectedCellId = cellId;
      gridState.selectedCellAnimation = true;
      io.to(`room:${room.code}`).emit("game:grid:update", gridState);

      let usedSet = roomUsedQuestions.get(room.id);
      if (!usedSet) {
        usedSet = new Set<string>();
        roomUsedQuestions.set(room.id, usedSet);
      }

      const rawQuestions = room.quizBank?.questions ?? [];
      // Prefer unused question with matching cell.points
      let targetQ = rawQuestions.find((q: any) => !usedSet!.has(q.id) && q.points === cell.points);
      if (!targetQ) {
        targetQ = rawQuestions.find((q: any) => !usedSet!.has(q.id));
      }
      if (!targetQ) {
        targetQ = rawQuestions.find((q: any) => q.points === cell.points) || rawQuestions[0];
      }
      if (!targetQ) return;

      usedSet.add(targetQ.id);
      cell.questionId = targetQ.id;

      const qIndex = rawQuestions.findIndex((q: any) => q.id === targetQ!.id);
      room.currentQuestion = qIndex >= 0 ? qIndex : 0;

      // 2-second highlight animation before starting question prepare
      setTimeout(async () => {
        gridState.selectedCellAnimation = false;
        io.to(`room:${room.code}`).emit("game:grid:update", gridState);
        await startQuestionPrepareAndLaunch(room, rawQuestions, room.currentQuestion);
      }, 2000);
    }

    socket.on("game:grid:select", async ({ cellId }) => {
      const playerId = playerSockets.get(socket.id);
      if (!playerId) return;
      const player = await prisma.player.findUnique({
        where: { id: playerId },
        include: { room: { include: { quizBank: { include: { questions: { orderBy: { order: "asc" } } } } } } },
      });
      if (!player || !player.room || player.room.mode !== "GRID_CARO" || player.room.status !== "PLAYING") return;

      const gridState = roomGridCaros.get(player.room.id);
      if (!gridState) return;

      // In Sandbox mode, bot on current turn can select:
      if (gridState.currentTurnTeamId === player.teamId) {
        await handleGridCellSelect(player.room, cellId);
      }
    });

    // ── Dice Race Events ──────────────────────────────────────────────────────
    socket.on("game:dice:roll", async () => {
      const playerId = playerSockets.get(socket.id);
      if (!playerId) return;
      const player = await prisma.player.findUnique({
        where: { id: playerId },
        include: { room: { include: { quizBank: { include: { questions: { orderBy: { order: "asc" } } } } } } },
      });
      if (!player || !player.room || !player.teamId) return;

      const room = player.room;
      if (room.mode !== "DICE_RACE" || room.status !== "PLAYING") return;

      const diceState = roomDiceRaces.get(room.id);
      if (!diceState || diceState.dicePendingAnswer || roomPrepareStates.has(room.id)) return;

      if (diceState.currentTurnTeamId !== player.teamId) {
        socket.emit("error", "Chưa tới lượt tung xúc xắc của đội bạn!");
        return;
      }

      const roll = Math.floor(Math.random() * 6) + 1;
      diceState.lastDiceRoll = roll;
      diceState.dicePendingAnswer = true;

      const team = await prisma.team.findUnique({ where: { id: player.teamId } });
      io.to(`room:${room.code}`).emit("game:dice:rolled", {
        teamId: player.teamId,
        teamName: team?.name || "Đội",
        roll,
      });
      io.to(`room:${room.code}`).emit("game:dice:update", diceState);

      const questions = room.quizBank?.questions ?? [];
      await startQuestionPrepareAndLaunch(room, questions, room.currentQuestion);
    });

    // ── Secret Wager Events ───────────────────────────────────────────────────
    socket.on("game:wager:submit", async ({ amount }) => {
      const playerId = playerSockets.get(socket.id);
      if (!playerId) return;
      const player = await prisma.player.findUnique({
        where: { id: playerId },
        include: { room: true },
      });
      if (!player || !player.room || !player.teamId) return;

      const room = player.room;
      if (room.mode !== "WAGER" || room.status !== "PLAYING") return;

      const wagerState = roomWagers.get(room.id);
      if (!wagerState || wagerState.phase !== "WAGER_PERIOD") return;

      const team = await prisma.team.findUnique({ where: { id: player.teamId } });
      if (!team) return;

      // 1. "tránh việc spam cược, mỗi đội không được cược từ 2 lần liên tiếp trở lên"
      if (wagerState.lastWagerTeamId === team.id) {
        socket.emit("error", "Đội bạn vừa đặt cược! Không được cược 2 lần liên tiếp, vui lòng chờ đội khác cược trước.");
        return;
      }

      // 2. "mỗi đội không được cược số điểm vượt quá điểm hiện tại của đội"
      if (amount > team.score) {
        socket.emit("error", `Không được cược số điểm (${amount}đ) vượt quá điểm hiện tại của đội bạn (${team.score}đ)!`);
        return;
      }

      // 3. "ô nhỏ nhất lớn hơn số điểm hiện tại 5 điểm, các ô cược cách nhau 5 điểm, tránh cược quá tay"
      const currentHighest = wagerState.currentHighestWager || 0;
      const minOption = currentHighest + 5;
      const maxOption = currentHighest + 60;
      const isValidStep = (amount - currentHighest) % 5 === 0;

      if (amount < minOption || amount > maxOption || !isValidStep) {
        socket.emit("error", `Mức cược không hợp lệ. Vui lòng chọn 1 trong 12 ô cược từ ${minOption}đ đến ${maxOption}đ.`);
        return;
      }

      // 4. "khi số điểm cược hiện lên đã vượt quá điểm đội mình, đội mình sẽ mất quyền cược trong câu hỏi đó"
      if (team.score < minOption) {
        socket.emit("error", `Mức cược tối thiểu (${minOption}đ) đã vượt quá điểm đội bạn (${team.score}đ). Đội bạn đã mất quyền cược trong câu hỏi này!`);
        return;
      }

      // Apply the bet
      wagerState.currentHighestWager = amount;
      wagerState.lastWagerTeamId = team.id;
      if (!wagerState.wagerHistory) wagerState.wagerHistory = [];
      const order = wagerState.wagerHistory.length + 1;
      wagerState.wagerHistory.push({
        order,
        teamId: team.id,
        teamName: team.name,
        teamColor: team.color,
        amount,
        timestamp: Date.now(),
      });

      wagerState.teamWagers[team.id] = {
        teamId: team.id,
        teamName: team.name,
        amount,
        submitted: true,
        order,
      };

      // Check which teams are now disqualified because next minimum bet > team.score
      const allTeams = await prisma.team.findMany({ where: { roomId: room.id } });
      const nextMinOption = amount + 5;
      allTeams.forEach((t) => {
        if (!wagerState.teamWagers[t.id]?.submitted && t.score < nextMinOption) {
          wagerState.teamWagers[t.id] = {
            teamId: t.id,
            teamName: t.name,
            amount: 0,
            submitted: false,
            disqualified: true,
          };
        }
      });

      // Broadcast update
      io.to(`room:${room.code}`).emit("game:wager:update", wagerState);

      // Check if any other team can still make a valid bet
      const canAnyOtherTeamBet = allTeams.some((t) =>
        t.id !== wagerState.lastWagerTeamId && t.score >= nextMinOption
      );

      if (!canAnyOtherTeamBet) {
        // No other team can possibly bet further! Advance to question!
        const wTimer = roomWagerTimers.get(room.id);
        if (wTimer) {
          clearTimeout(wTimer);
          clearInterval(wTimer);
          roomWagerTimers.delete(room.id);
        }
        wagerState.phase = "QUESTION_PERIOD";
        io.to(`room:${room.code}`).emit("game:wager:update", wagerState);

        const rCached = await prisma.room.findUnique({
          where: { id: room.id },
          include: { quizBank: { include: { questions: { orderBy: { order: "asc" } } } } },
        });
        const questions = rCached?.quizBank?.questions ?? [];
        if (questions[room.currentQuestion]) {
          const q = questions[room.currentQuestion];
          const questionState = buildQuestionState(q, {
            bloomLevel: getBloomLevelFromPoints(q.points),
            answerMethod: (room.config as any)?.answerMethod ?? "DEVICE",
            wagerPhase: "QUESTION_PERIOD",
          });
          io.to(`room:${room.code}`).emit("game:question", questionState);
          startQuestionTimer(io, room.code, room.id, q.id, q.timeLimit);
        }
      }
    });

    // ── Admin Mode Controls ───────────────────────────────────────────────────
    socket.on("admin:grid:preview:start", async () => {
      const room = await getAdminRoom(socket);
      if (!room || room.mode !== "GRID_CARO") return;
      const gridState = roomGridCaros.get(room.id);
      if (!gridState) return;

      gridState.previewActive = true;
      gridState.previewRemaining = (room.config as any)?.gridPreviewDuration || 5;
      io.to(`room:${room.code}`).emit("game:grid:update", gridState);

      const gTimer = roomGridTimers.get(room.id);
      if (gTimer) clearInterval(gTimer);

      let rem = gridState.previewRemaining;
      const newTimer = setInterval(() => {
        rem--;
        gridState.previewRemaining = rem;
        if (rem <= 0) {
          clearInterval(newTimer);
          gridState.previewActive = false;
          io.to(`room:${room.code}`).emit("game:grid:update", gridState);
        } else {
          io.to(`room:${room.code}`).emit("game:grid:update", gridState);
        }
      }, 1000);
      roomGridTimers.set(room.id, newTimer);
    });

    socket.on("admin:grid:select:manual", async ({ cellId }) => {
      const room = await getAdminRoom(socket);
      if (!room || room.mode !== "GRID_CARO" || room.status !== "PLAYING") return;
      await handleGridCellSelect(room, cellId);
    });

    socket.on("admin:grid:advance_now", async () => {
      const room = await getAdminRoom(socket);
      if (!room || room.mode !== "GRID_CARO") return;
      await advanceGridToBoard(io, room.id, room.code);
    });

    socket.on("admin:dice:roll:manual", async () => {
      const room = await getAdminRoom(socket);
      if (!room || room.mode !== "DICE_RACE") return;
      const diceState = roomDiceRaces.get(room.id);
      if (!diceState || diceState.dicePendingAnswer || roomPrepareStates.has(room.id)) return;

      const roll = Math.floor(Math.random() * 6) + 1;
      diceState.lastDiceRoll = roll;
      diceState.dicePendingAnswer = true;

      io.to(`room:${room.code}`).emit("game:dice:rolled", {
        teamId: diceState.currentTurnTeamId || "",
        teamName: diceState.currentTurnTeamName || "Đội",
        roll,
      });
      io.to(`room:${room.code}`).emit("game:dice:update", diceState);

      const questions = room.quizBank?.questions ?? [];
      await startQuestionPrepareAndLaunch(room, questions, room.currentQuestion);
    });

    socket.on("admin:tournament:advance", async () => {
      const room = await getAdminRoom(socket);
      if (!room || room.mode !== "TOURNAMENT") return;
      const tournament = roomTournaments.get(room.id);
      if (!tournament) return;

      const nextPending = tournament.matches.find((m) => m.status === "UPCOMING" && m.team1Id && m.team2Id);
      if (nextPending) {
        nextPending.status = "IN_PROGRESS";
        tournament.currentMatchId = nextPending.id;
        io.to(`room:${room.code}`).emit("game:tournament:update", tournament);
      }
    });

    socket.on("admin:wager:skip_timer", async () => {
      const room = await getAdminRoom(socket);
      if (!room || room.mode !== "WAGER") return;
      const wagerState = roomWagers.get(room.id);
      if (!wagerState || wagerState.phase !== "WAGER_PERIOD") return;

      const wTimer = roomWagerTimers.get(room.id);
      if (wTimer) {
        clearTimeout(wTimer);
        clearInterval(wTimer);
        roomWagerTimers.delete(room.id);
      }
      wagerState.phase = "QUESTION_PERIOD";
      io.to(`room:${room.code}`).emit("game:wager:update", wagerState);

      const rCached = await prisma.room.findUnique({
        where: { id: room.id },
        include: { quizBank: { include: { questions: { orderBy: { order: "asc" } } } } },
      });
      const questions = rCached?.quizBank?.questions ?? [];
      if (questions[room.currentQuestion]) {
        const q = questions[room.currentQuestion];
        const questionState = buildQuestionState(q, {
          bloomLevel: getBloomLevelFromPoints(q.points),
          answerMethod: (room.config as any)?.answerMethod ?? "DEVICE",
          wagerPhase: "QUESTION_PERIOD",
        });
        io.to(`room:${room.code}`).emit("game:question", questionState);
        startQuestionTimer(io, room.code, room.id, q.id, q.timeLimit);
      }
    });

    socket.on("admin:wager:grant_bailout", async ({ teamId }) => {
      const room = await getAdminRoom(socket);
      if (!room || room.mode !== "WAGER") return;

      const wagerState = roomWagers.get(room.id);
      if (!wagerState) return;

      if (wagerState.currentQuestionBailoutUsed) {
        socket.emit("error", "Chỉ có thể kích hoạt trợ cấp cho 1 đội trong mỗi câu hỏi! Vui lòng đợi câu tiếp theo.");
        return;
      }

      if (!wagerState.bailoutQueue || wagerState.bailoutQueue.length === 0) {
        socket.emit("error", "Hiện không có đội nào trong hàng đợi trợ cấp!");
        return;
      }

      // Check priority: Must grant according to death order (head of queue)
      const topQueueItem = wagerState.bailoutQueue[0];
      if (topQueueItem.teamId !== teamId) {
        socket.emit("error", `Phải ưu tiên trợ cấp theo thứ tự rơi điểm: Đội ${topQueueItem.teamName} cần được cứu trước!`);
        return;
      }

      const team = await prisma.team.findUnique({ where: { id: teamId } });
      if (!team || team.score > 0) return;

      const bailoutInfo = wagerState.teamBailouts?.[teamId] ?? { remaining: 1, max: 1 };
      if (bailoutInfo.remaining <= 0) {
        socket.emit("error", "Đội này đã hết lượt trợ cấp!");
        return;
      }

      // Quyền trợ cấp chỉ sử dụng được khi còn ít nhất 2 đội có điểm lớn hơn 0
      const allTeams = await prisma.team.findMany({ where: { roomId: room.id } });
      const positiveScores = allTeams.filter((t) => t.score > 0).map((t) => t.score);
      if (positiveScores.length < 2) {
        socket.emit("error", "Quyền trợ cấp chỉ sử dụng được khi còn ít nhất 2 đội có điểm lớn hơn 0!");
        return;
      }

      const lowestPositiveScore = Math.min(...positiveScores);

      // Reset team's score to lowestPositiveScore (erasing negative, giving fresh start)
      await prisma.team.update({
        where: { id: teamId },
        data: { score: lowestPositiveScore },
      });

      bailoutInfo.remaining--;
      if (!wagerState.teamBailouts) wagerState.teamBailouts = {};
      wagerState.teamBailouts[teamId] = bailoutInfo;

      // Remove from bailout queue
      wagerState.bailoutQueue.shift();
      // Mark current question bailout used
      wagerState.currentQuestionBailoutUsed = true;

      io.to(`room:${room.code}`).emit("game:score:update", [
        { teamId, score: lowestPositiveScore, delta: lowestPositiveScore - team.score },
      ]);
      io.to(`room:${room.code}`).emit("game:wager:bailout_granted", {
        teamId,
        teamName: team.name,
        newScore: lowestPositiveScore,
        bailoutsRemaining: bailoutInfo.remaining,
      });
      io.to(`room:${room.code}`).emit("game:wager:update", wagerState);
    });

    socket.on("admin:timer:set", async ({ seconds }: { seconds: number }) => {
      const room = await getAdminRoom(socket);
      if (!room) return;
      const key = `${room.id}:timer`;
      if (roomRemainingTimes.has(key)) {
        const newRemaining = Math.max(1, seconds);
        roomRemainingTimes.set(key, newRemaining);
        io.to(`room:${room.code}`).emit("game:timer", {
          remaining: newRemaining,
          total: 30,
        });
      }
    });

    socket.on("admin:sandbox:grant:card", async ({ teamId, cardType }) => {
      const room = await getAdminRoom(socket);
      if (!room) return;
      await prisma.powerupCard.create({
        data: {
          type: cardType as any,
          ownerType: "TEAM",
          roomId: room.id,
          teamId,
          used: false,
        },
      });
      const state = await buildRoomState(room.id);
      io.to(`room:${room.code}`).emit("room:state", state);
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
  } else if (room.mode === "TOURNAMENT") {
    const tournament = roomTournaments.get(room.id);
    const currentMatch = tournament?.matches.find((m) => m.id === tournament.currentMatchId);
    if (currentMatch && teamId !== currentMatch.team1Id && teamId !== currentMatch.team2Id && !isAdminOverride) {
      if (socket) socket.emit("error", "Chỉ 2 đội trong trận đối đầu hiện tại mới được trả lời!");
      return;
    }
  } else if (room.mode === "GRID_CARO") {
    const gridState = roomGridCaros.get(room.id);
    if (gridState && teamId !== gridState.currentTurnTeamId && !isAdminOverride) {
      if (socket) socket.emit("error", "Hiện đang là lượt của đội khác!");
      return;
    }
  } else if (room.mode === "DICE_RACE") {
    const diceState = roomDiceRaces.get(room.id);
    if (diceState && teamId !== diceState.currentTurnTeamId && !isAdminOverride) {
      if (socket) socket.emit("error", "Hiện đang là lượt của đội khác!");
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

async function finalizeTournamentQuestion(io: IO, roomId: string, roomCode: string, questionId: string) {
  const qKey = `${roomId}:${questionId}`;
  if (roomQuestionProcessed.has(qKey)) return;
  roomQuestionProcessed.add(qKey);

  const tournament = roomTournaments.get(roomId);
  const room = await prisma.room.findUnique({ where: { id: roomId }, include: { teams: true } });
  const question = await prisma.question.findUnique({ where: { id: questionId } });
  if (!tournament || !room || !question) return;

  const currentMatch = tournament.matches.find((m) => m.id === tournament.currentMatchId);
  if (!currentMatch) return;

  const t1Ans = currentMatch.team1Id
    ? await prisma.answer.findFirst({ where: { roomId, questionId, teamId: currentMatch.team1Id } })
    : null;
  const t2Ans = currentMatch.team2Id
    ? await prisma.answer.findFirst({ where: { roomId, questionId, teamId: currentMatch.team2Id } })
    : null;

  const scoreUpdates: ScoreUpdate[] = [];

  if (t1Ans && t1Ans.isCorrect && currentMatch.team1Id) {
    currentMatch.team1Score += question.points;
    const upd = await prisma.team.update({
      where: { id: currentMatch.team1Id },
      data: { score: { increment: question.points } },
    });
    scoreUpdates.push({ teamId: currentMatch.team1Id, score: upd.score, delta: question.points });
  }

  if (t2Ans && t2Ans.isCorrect && currentMatch.team2Id) {
    currentMatch.team2Score += question.points;
    const upd = await prisma.team.update({
      where: { id: currentMatch.team2Id },
      data: { score: { increment: question.points } },
    });
    scoreUpdates.push({ teamId: currentMatch.team2Id, score: upd.score, delta: question.points });
  }

  currentMatch.currentQuestionInMatch++;

  if (currentMatch.currentQuestionInMatch >= currentMatch.totalQuestionsInMatch) {
    currentMatch.status = "COMPLETED";
    const winnerId = currentMatch.team1Score >= currentMatch.team2Score ? currentMatch.team1Id : currentMatch.team2Id;
    const winnerName = currentMatch.team1Score >= currentMatch.team2Score ? currentMatch.team1Name : currentMatch.team2Name;
    currentMatch.winnerTeamId = winnerId;

    if (currentMatch.id === "FINAL") {
      tournament.championTeamId = winnerId;
      tournament.championTeamName = winnerName;
    } else {
      const nextMatch = tournament.matches.find(
        (m) => m.roundIndex === currentMatch.roundIndex + 1 && (!m.team1Id || !m.team2Id)
      );
      if (nextMatch) {
        if (!nextMatch.team1Id) {
          nextMatch.team1Id = winnerId;
          nextMatch.team1Name = winnerName;
        } else if (!nextMatch.team2Id) {
          nextMatch.team2Id = winnerId;
          nextMatch.team2Name = winnerName;
        }
      }

      const nextPending = tournament.matches.find((m) => m.status === "UPCOMING" && m.team1Id && m.team2Id);
      if (nextPending) {
        nextPending.status = "IN_PROGRESS";
        tournament.currentMatchId = nextPending.id;
      }
    }
  }

  if (scoreUpdates.length > 0) {
    io.to(`room:${roomCode}`).emit("game:score:update", scoreUpdates);
  }
  io.to(`room:${roomCode}`).emit("game:tournament:update", tournament);
  await revealCurrentAnswer(io, roomId, roomCode, questionId);
}

async function advanceGridToBoard(io: IO, roomId: string, roomCode: string) {
  const autoAdvanceKey = `${roomId}:auto_advance`;
  if (roomGridTimers.has(autoAdvanceKey)) {
    clearInterval(roomGridTimers.get(autoAdvanceKey)!);
    roomGridTimers.delete(autoAdvanceKey);
  }

  const gridState = roomGridCaros.get(roomId);
  if (!gridState) return;

  gridState.autoAdvanceSeconds = undefined;
  gridState.selectedCellId = undefined;
  gridState.selectedCellAnimation = false;

  const isMatchOver = gridState.turnsCompleted >= gridState.maxTurns || gridState.cells.every((c) => c.isCompleted);

  if (isMatchOver) {
    await prisma.room.update({
      where: { id: roomId },
      data: { status: "FINISHED", endedAt: new Date() },
    });
    const leaderboard = await buildLeaderboard(roomId);
    io.to(`room:${roomCode}`).emit("game:ended", { leaderboard });
  } else {
    io.to(`room:${roomCode}`).emit("game:question:clear");
    io.to(`room:${roomCode}`).emit("game:grid:update", gridState);
  }
}

async function finalizeGridCaroQuestion(io: IO, roomId: string, roomCode: string, questionId: string) {
  const qKey = `${roomId}:${questionId}`;
  if (roomQuestionProcessed.has(qKey)) return;
  roomQuestionProcessed.add(qKey);

  const gridState = roomGridCaros.get(roomId);
  const room = await prisma.room.findUnique({ where: { id: roomId }, include: { teams: true } });
  const question = await prisma.question.findUnique({ where: { id: questionId } });
  if (!gridState || !room || !question) return;

  const currentTeamId = gridState.currentTurnTeamId;
  const currentTeam = room.teams.find((t) => t.id === currentTeamId);
  const cell = gridState.selectedCellId ? gridState.cells.find((c) => c.id === gridState.selectedCellId) : null;

  const scoreUpdates: ScoreUpdate[] = [];

  if (currentTeam && cell) {
    const ans = await prisma.answer.findFirst({
      where: { roomId, questionId, teamId: currentTeam.id },
    });

    if (ans && ans.isCorrect) {
      cell.isCompleted = true;
      cell.claimedByTeamId = currentTeam.id;
      cell.claimedByTeamName = currentTeam.name;
      cell.claimedByTeamColor = currentTeam.color;

      let awardedPoints = cell.points;

      if (gridState.caroEnabled) {
        const winningStreak = checkGridCaroStreak(
          gridState.cells,
          gridState.rows,
          gridState.cols,
          currentTeam.id,
          gridState.streakTargetK
        );

        if (winningStreak && winningStreak.length > 0 && !gridState.caroAchievedTeams.includes(currentTeam.name)) {
          const streakPtsSum = winningStreak.reduce((acc, c) => acc + c.points, 0);
          const avgPts = streakPtsSum / winningStreak.length;
          // Tính bằng trung bình cộng điểm số của K ô tạo nên chuỗi (làm tròn về số chia hết cho 5 gần nhất, tối thiểu 10)
          const dynamicBonus = Math.max(10, Math.round(avgPts / 5) * 5);

          gridState.caroAchievedTeams.push(currentTeam.name);
          awardedPoints += dynamicBonus;
          io.to(`room:${roomCode}`).emit("game:grid:caro:celebrate", {
            teamId: currentTeam.id,
            teamName: currentTeam.name,
            bonusPoints: dynamicBonus,
          });
        }
      }

      const upd = await prisma.team.update({
        where: { id: currentTeam.id },
        data: { score: { increment: awardedPoints } },
      });
      scoreUpdates.push({ teamId: currentTeam.id, score: upd.score, delta: awardedPoints });
    } else {
      cell.isCompleted = false;
      cell.claimedByTeamId = undefined;
      cell.claimedByTeamName = undefined;
      cell.claimedByTeamColor = undefined;
      cell.attemptCount = (cell.attemptCount || 0) + 1;
      cell.questionId = undefined; // Cleared so next selection gets fresh unused question with same points
    }
  }

  gridState.turnsCompleted = (gridState.turnsCompleted || 0) + 1;
  const numTeams = Math.max(1, room.teams.length);
  gridState.currentRound = Math.min(gridState.maxRounds, Math.floor(gridState.turnsCompleted / numTeams) + 1);

  if (room.teams.length > 0) {
    const curIdx = room.teams.findIndex((t) => t.id === currentTeamId);
    const nextIdx = (curIdx + 1) % room.teams.length;
    gridState.currentTurnTeamId = room.teams[nextIdx].id;
    gridState.currentTurnTeamName = room.teams[nextIdx].name;
    gridState.selectedCellId = undefined;
  }

  if (scoreUpdates.length > 0) {
    io.to(`room:${roomCode}`).emit("game:score:update", scoreUpdates);
  }
  io.to(`room:${roomCode}`).emit("game:grid:update", gridState);
  await revealCurrentAnswer(io, roomId, roomCode, questionId);

  // 6-second auto-advance countdown back to the board
  let remSeconds = 6;
  gridState.autoAdvanceSeconds = remSeconds;
  io.to(`room:${roomCode}`).emit("game:grid:update", gridState);

  const autoAdvanceKey = `${roomId}:auto_advance`;
  if (roomGridTimers.has(autoAdvanceKey)) {
    clearInterval(roomGridTimers.get(autoAdvanceKey)!);
  }

  const advanceTimer = setInterval(async () => {
    remSeconds--;
    gridState.autoAdvanceSeconds = remSeconds;
    if (remSeconds <= 0) {
      clearInterval(advanceTimer);
      roomGridTimers.delete(autoAdvanceKey);
      await advanceGridToBoard(io, roomId, roomCode);
    } else {
      io.to(`room:${roomCode}`).emit("game:grid:update", gridState);
    }
  }, 1000);
  roomGridTimers.set(autoAdvanceKey, advanceTimer);
}

async function finalizeDiceRaceQuestion(io: IO, roomId: string, roomCode: string, questionId: string) {
  const qKey = `${roomId}:${questionId}`;
  if (roomQuestionProcessed.has(qKey)) return;
  roomQuestionProcessed.add(qKey);

  const diceState = roomDiceRaces.get(roomId);
  const room = await prisma.room.findUnique({ where: { id: roomId }, include: { teams: true } });
  const question = await prisma.question.findUnique({ where: { id: questionId } });
  if (!diceState || !room || !question) return;

  const currentTeamId = diceState.currentTurnTeamId;
  const teamProg = currentTeamId ? diceState.teamPositions[currentTeamId] : null;
  const scoreUpdates: ScoreUpdate[] = [];

  if (teamProg && diceState.lastDiceRoll) {
    const ans = await prisma.answer.findFirst({
      where: { roomId, questionId, teamId: currentTeamId },
    });

    if (ans && ans.isCorrect) {
      let newPos = Math.min(diceState.totalTiles - 1, teamProg.position + diceState.lastDiceRoll);
      const landingTile = diceState.tiles[newPos];

      let bonusPoints = question.points;

      if (landingTile) {
        if (landingTile.type === "BOOST") {
          newPos = Math.min(diceState.totalTiles - 1, newPos + (landingTile.effectValue || 2));
        } else if (landingTile.type === "TRAP") {
          newPos = Math.max(0, newPos + (landingTile.effectValue || -2));
        } else if (landingTile.type === "GEM") {
          bonusPoints += landingTile.effectValue || 150;
        } else if (landingTile.type === "SWAP") {
          const otherTeams = Object.values(diceState.teamPositions).filter((t) => t.teamId !== currentTeamId);
          otherTeams.sort((a, b) => b.position - a.position);
          if (otherTeams.length > 0 && otherTeams[0].position > newPos) {
            const opp = otherTeams[0];
            const tempPos = opp.position;
            opp.position = newPos;
            newPos = tempPos;
          }
        } else if (landingTile.type === "FINISH" && !teamProg.hasFinished) {
          teamProg.hasFinished = true;
          const finishRank = diceState.finishLeaderboard.length + 1;
          teamProg.finishRank = finishRank;
          diceState.finishLeaderboard.push(teamProg.teamName);
          const finishBonus = finishRank === 1 ? 300 : finishRank === 2 ? 200 : 100;
          bonusPoints += finishBonus;
        }
      }

      teamProg.position = newPos;

      const upd = await prisma.team.update({
        where: { id: currentTeamId },
        data: { score: { increment: bonusPoints } },
      });
      scoreUpdates.push({ teamId: currentTeamId, score: upd.score, delta: bonusPoints });
    }
  }

  diceState.dicePendingAnswer = false;
  if (room.teams.length > 0) {
    const curIdx = room.teams.findIndex((t) => t.id === currentTeamId);
    const nextIdx = (curIdx + 1) % room.teams.length;
    diceState.currentTurnTeamId = room.teams[nextIdx].id;
    diceState.currentTurnTeamName = room.teams[nextIdx].name;
  }

  if (scoreUpdates.length > 0) {
    io.to(`room:${roomCode}`).emit("game:score:update", scoreUpdates);
  }
  io.to(`room:${roomCode}`).emit("game:dice:update", diceState);
  await revealCurrentAnswer(io, roomId, roomCode, questionId);
}

async function finalizeWagerQuestion(io: IO, roomId: string, roomCode: string, questionId: string) {
  const qKey = `${roomId}:${questionId}`;
  if (roomQuestionProcessed.has(qKey)) return;
  roomQuestionProcessed.add(qKey);

  const wagerState = roomWagers.get(roomId);
  const room = await prisma.room.findUnique({ where: { id: roomId }, include: { teams: true } });
  const question = await prisma.question.findUnique({ where: { id: questionId } });
  if (!wagerState || !room || !question) return;

  wagerState.phase = "REVEAL_PERIOD";
  const scoreUpdates: ScoreUpdate[] = [];

  for (const team of room.teams) {
    const wagerInfo = wagerState.teamWagers[team.id];
    const wager = (wagerInfo?.submitted && !wagerInfo?.disqualified) ? wagerInfo.amount : 0;
    const ans = await prisma.answer.findFirst({
      where: { roomId, questionId, teamId: team.id },
    });

    const isCorrect = ans?.isCorrect === true;
    const delta = wager > 0 ? (isCorrect ? wager : -wager) : 0;

    const upd = await prisma.team.update({
      where: { id: team.id },
      data: { score: { increment: delta } },
    });

    scoreUpdates.push({ teamId: team.id, score: upd.score, delta });

    if (!wagerState.bailoutQueue) wagerState.bailoutQueue = [];
    const bailoutsRem = wagerState.teamBailouts?.[team.id]?.remaining ?? 1;

    if (upd.score <= 0) {
      if (bailoutsRem > 0 && !wagerState.bailoutQueue.some((item) => item.teamId === team.id)) {
        wagerState.bailoutQueue.push({
          teamId: team.id,
          teamName: team.name,
          teamColor: team.color,
          score: upd.score,
          questionIndex: room.currentQuestion + 1,
        });
      }
    } else {
      wagerState.bailoutQueue = wagerState.bailoutQueue.filter((item) => item.teamId !== team.id);
    }
  }

  if (scoreUpdates.length > 0) {
    io.to(`room:${roomCode}`).emit("game:score:update", scoreUpdates);
  }
  io.to(`room:${roomCode}`).emit("game:wager:update", wagerState);
  await revealCurrentAnswer(io, roomId, roomCode, questionId);

  // Check Sudden Victory (Knockout Win):
  // Nếu chỉ còn 1 đội có điểm > 0, đội đó thắng ngay lập tức!
  const updatedTeams = await prisma.team.findMany({ where: { roomId } });
  if (updatedTeams.length > 1) {
    const positiveTeams = updatedTeams.filter((t) => t.score > 0);

    if (positiveTeams.length === 1) {
      await prisma.room.update({
        where: { id: roomId },
        data: { status: "FINISHED", endedAt: new Date() },
      });
      const leaderboard = await buildLeaderboard(roomId);
      io.to(`room:${roomCode}`).emit("game:ended", { leaderboard });
    }
  }
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
      bailoutsRemaining: roomWagers.get(room.id)?.teamBailouts?.[t.id]?.remaining,
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
    tournamentState: roomTournaments.get(room.id),
    gridCaroState: roomGridCaros.get(room.id),
    diceRaceState: roomDiceRaces.get(room.id),
    wagerState: roomWagers.get(room.id),
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
    tournamentMatchId?: string;
    gridCellId?: number;
    diceRollValue?: number;
    wagerPhase?: "WAGER_PERIOD" | "QUESTION_PERIOD" | "REVEAL_PERIOD";
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
    tournamentMatchId: extra?.tournamentMatchId,
    gridCellId: extra?.gridCellId,
    diceRollValue: extra?.diceRollValue,
    wagerPhase: extra?.wagerPhase,
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
      } else if (room.mode === "TOURNAMENT") {
        await finalizeTournamentQuestion(io, roomId, roomCode, questionId);
      } else if (room.mode === "GRID_CARO") {
        await finalizeGridCaroQuestion(io, roomId, roomCode, questionId);
      } else if (room.mode === "DICE_RACE") {
        await finalizeDiceRaceQuestion(io, roomId, roomCode, questionId);
      } else if (room.mode === "WAGER") {
        await finalizeWagerQuestion(io, roomId, roomCode, questionId);
      } else if (room.mode === "CLASSIC" || room.mode === "ELIMINATION") {
        if (room.teamMode === "TEAM") {
          const { teamScoresUpdates } = await resolveQuestionTeamScores(io, roomId, questionId);
          if (teamScoresUpdates.length > 0) {
            io.to(`room:${roomCode}`).emit("game:score:update", teamScoresUpdates);
          }
        } else {
          await finalizeIndividualScores(io, roomId, roomCode, questionId);
        }
        await revealCurrentAnswer(io, roomId, roomCode, questionId);
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
