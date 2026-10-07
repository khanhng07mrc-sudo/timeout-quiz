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
  quantizeOlympiaTimeLimit,
  getBuzzedAnswerTimeLimit,
  getStandardQuestionTimeLimit,
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
  MysteryQuestState,
  MysteryMiniGameType,
  GameIntermissionPayload,
  GameMode,
  TeamMode,
} from "@/types";
import { computePointsAwarded, computeTeamQuestionScore, computeStealAmount, normalizeToThreeLevels, calculateItemIRTMetrics } from "./game-engine/scoring";
import { generateBalancedDiceTiles, handleDiceRaceLanding } from "./game-engine/dice-race";
import { generateMysteryStageForTurn, handleFlipCard, handleCashOut, normalizeMiniGameType } from "./game-engine/mystery-quest";
import { isPowerupAllowedForMode, isSharedPowerup, SHARED_POWERUP_TYPES, distributeCategorizedCardsToTeams, DEFAULT_SHARED_POWERUP_PROBABILITY } from "./game-engine/powerups";
import { allocateQuestionsForMatch } from "./game-engine/question-allocator";
import { shuffleArray, getTargetTotalQuestions } from "./utils";
import { verifyAdminToken, sanitizePlayerName } from "./security";
import { checkPlayerJoinLimit, checkActionDebounce, MAX_PLAYERS_PER_ROOM } from "./rate-limiter";
import { getBroadTopic } from "./topics";

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
interface CachedPlayerSession {
  playerId: string;
  playerName: string;
  roomId: string;
  roomCode: string;
  teamId?: string;
  teamName?: string;
  roomMode?: GameMode;
  teamMode?: TeamMode;
}
const socketPlayerSessions = new Map<string, CachedPlayerSession>(); // socketId -> session
const playerSessions = new Map<string, CachedPlayerSession>(); // playerId -> session

// Fair Reaction Buzzer Arbitration
interface BuzzCandidate {
  teamId: string;
  teamName: string;
  playerId: string;
  playerName: string;
  clientBuzzedAt: number;
  receivedAt: number;
  socket: Sock;
  mode: "BUZZ" | "BOUNCEBACK";
}
const roomBuzzArbitration = new Map<string, { timer: NodeJS.Timeout; candidates: BuzzCandidate[]; deadline: number }>(); // qKey -> arbitration window
const roomBuzzWindowOpenedAt = new Map<string, number>(); // qKey -> timestamp when buzz window unlocked
const roomStealOpenedAt = new Map<string, number>(); // qKey -> timestamp when steal window opened
const roomStealEndsAt = new Map<string, number>(); // qKey -> timestamp when steal window ends
const roomQuestionStartedAt = new Map<string, number>(); // roomId -> timestamp when question answering timer started (ms)

const playerSockets = new Map<string, string>(); // socketId -> playerId
const adminSockets = new Map<string, string>(); // socketId -> roomId
const roomTimers = new Map<string, NodeJS.Timeout>(); // roomId -> timer
const roomRemainingTimes = new Map<string, number>(); // roomId -> remaining seconds
const roomTimerEndsAt = new Map<string, number>(); // roomId -> endsAt timestamp (epoch ms)
const roomQuestionTeamCards = new Map<string, Map<string, ActiveTeamCard[]>>(); // qKey -> Map(teamId -> ActiveTeamCard[])
const roomFrozenTeams = new Map<string, Set<string>>(); // qKey -> Set(teamId)
const roomFiftyFifty = new Map<string, Map<string, string[]>>(); // qKey -> Map(teamId -> hiddenOptionIds[])
const roomQuestionProcessed = new Set<string>(); // qKey to prevent double team scoring
const roomQuestionScoresCache = new Map<string, {
  teamScoresUpdates: ScoreUpdate[];
  teamSummaries: TeamRevealSummary[];
  roomAccuracy: number;
  rarityBonusPercent: number;
  effectiveDifficulty?: number;
  itemDiscrimination?: number;
}>();
const roomSandboxActiveTeam = new Map<string, string>(); // roomId -> active human teamId in sandbox
const roomPrepareStates = new Map<string, RoomPrepareState>(); // roomId -> preparation countdown state

// Mode-specific in-memory states
const roomPrimaryTeams = new Map<string, { teamId: string; teamName: string }>(); // qKey -> primaryTeam in BOUNCEBACK
const roomStealPhase = new Map<string, boolean>(); // qKey -> whether 5s steal buzz window is open
const roomStealBuzzed = new Map<string, { teamId: string; teamName: string; playerId: string; playerName: string }>(); // qKey -> steal buzz
const roomStealTimer = new Map<string, NodeJS.Timeout>(); // qKey -> 5s buzzer timer
const roomBuzzFirst = new Map<string, { teamId: string; teamName: string; playerId: string; playerName: string; attemptNumber: number; multiplier: number }>(); // qKey -> first buzz in BUZZ mode
const roomBuzzUnlocked = new Map<string, boolean>(); // qKey -> whether buzzer is unlocked in BUZZ mode
const roomBuzzDelayTimers = new Map<string, NodeJS.Timeout>(); // qKey -> delay timer for auto buzzer unlock
const roomBuzzAttemptOrder = new Map<string, Array<{ teamId: string; teamName: string; playerId: string; playerName: string; attemptNumber: number }>>(); // qKey -> ordered list of buzz attempts (attempt 1,2,3)
const roomBuzzWindowTimers = new Map<string, NodeJS.Timeout>(); // qKey -> 5s buzz window countdown timer
const roomBuzzWindowEndsAt = new Map<string, number>(); // qKey -> when the 5s buzz window expires
const roomBuzzWindowRemaining = new Map<string, number>(); // qKey -> remaining ms in 5s buzz window
const roomBuzzDisqualified = new Map<string, Set<string>>(); // qKey -> set of teamIds who answered wrong in this question
const roomBuzzAnsweringTimers = new Map<string, NodeJS.Timeout>(); // qKey -> 5s answering timer

// New Game Modes in-memory stores
const roomTournaments = new Map<string, TournamentState>();
const roomGridCaros = new Map<string, GridCaroState>();
const roomDiceRaces = new Map<string, DiceRaceState>();
const roomWagers = new Map<string, WagerState>();
const roomMysteryQuests = new Map<string, MysteryQuestState>();
const roomUsedQuestions = new Map<string, Set<string>>(); // roomId -> Set(questionId)
const roomWagerTimers = new Map<string, NodeJS.Timeout>(); // roomId -> wager timer
const roomWagerAutoLaunchTimers = new Map<string, NodeJS.Timeout>(); // roomId -> auto launch timer after wager ends
const roomGridTimers = new Map<string, NodeJS.Timeout>(); // roomId -> preview timer
const roomActiveQuestions = new Map<string, QuestionState>(); // roomId -> active question
const roomRevealPayloads = new Map<string, any>(); // roomId -> active reveal payload for reconnect recovery
const roomIntermissions = new Map<string, GameIntermissionPayload>(); // roomId -> current intermission state
const roomIntermissionTimers = new Map<string, NodeJS.Timeout>(); // roomId -> auto-advance timer for intermission
const teamStreakMap = new Map<string, number>(); // teamId -> streak count
const playerStreakMap = new Map<string, number>(); // playerId -> streak count
const roomBouncebackSelectedPoints = new Map<string, 10 | 20 | 30>(); // qKey -> chosen point level
const roomFinalizedActors = new Map<string, Set<string>>(); // qKey -> set of actors who finalized
const roomSubmittedActors = new Map<string, Set<string>>(); // qKey -> set of actors who submitted at least once
const roomTeamImmunity = new Map<string, number>(); // roomId:teamId -> immuneUntilQuestionIndex
const roomSharedPowerupUsedInQuestion = new Map<string, boolean>(); // roomId -> whether a shared powerup (TIME_PLUS, SKIP) was used in current question

// Classic Gold Rush Questions (Double Points)
const roomGoldQuestions = new Map<string, Set<string>>(); // roomId -> Set(questionId)

// Elimination Ghost Stats
interface EliminationGhostStat {
  ghostStreak: number;
  ghostTotalCorrect: number;
  ghostTotalAnswered: number;
  ghostTotalTimeSpent: number;
  ghostRoundAllCorrect: boolean;
  currentRoundCorrect: number;
  eliminatedAtStage?: number;
  eliminatedAtQuestion?: number;
  firstGhostStage?: number;
}
const roomEliminationGhostStats = new Map<string, Map<string, EliminationGhostStat>>(); // roomId -> Map(teamId -> stat)

function selectGoldQuestions(questions: any[]): Set<string> {
  const goldSet = new Set<string>();
  if (questions.length < 7) return goldSet;
  const count = Math.max(1, Math.floor(questions.length * 0.15));

  const highDiffIndices: number[] = [];
  const otherIndices: number[] = [];

  questions.forEach((q, idx) => {
    const isHigh = q.points === 30 || ["APPLY", "ANALYZE", "EVALUATE", "CREATE"].includes(q.bloomLevel);
    if (isHigh) {
      highDiffIndices.push(idx);
    } else {
      otherIndices.push(idx);
    }
  });

  const candidates = [...highDiffIndices, ...otherIndices.reverse()];
  for (const idx of candidates) {
    if (goldSet.size >= count) break;
    goldSet.add(questions[idx].id);
  }
  return goldSet;
}

/**
 * Snapshot & Recovery helpers (Solution 2):
 * Tự động sao lưu và khôi phục trạng thái bàn cờ (Grid Caro, Dice, Wager, Tournament, Ghost Stats) vào Database.
 */
async function persistGameStateSnapshot(roomId: string) {
  try {
    const room = await prisma.room.findUnique({ where: { id: roomId }, select: { config: true } });
    if (!room) return;
    const currentConfig = (room.config as any) || {};
    const snapshot: any = {};
    if (roomGridCaros.has(roomId)) snapshot.gridCaroState = roomGridCaros.get(roomId);
    if (roomDiceRaces.has(roomId)) snapshot.diceRaceState = roomDiceRaces.get(roomId);
    if (roomWagers.has(roomId)) snapshot.wagerState = roomWagers.get(roomId);
    if (roomMysteryQuests.has(roomId)) snapshot.mysteryQuestState = roomMysteryQuests.get(roomId);
    if (roomTournaments.has(roomId)) snapshot.tournamentState = roomTournaments.get(roomId);
    if (roomEliminationGhostStats.has(roomId)) {
      snapshot.ghostStats = Array.from(roomEliminationGhostStats.get(roomId)!.entries());
    }
    await prisma.room.update({
      where: { id: roomId },
      data: { config: { ...currentConfig, gameStateSnapshot: snapshot } },
    });
  } catch (err) {
    console.error("[persistGameStateSnapshot] Error:", err);
  }
}

function restoreGameStateSnapshot(room: any) {
  if (!room) return;
  const snapshot = (room.config as any)?.gameStateSnapshot;
  if (!snapshot) return;

  if (snapshot.gridCaroState && !roomGridCaros.has(room.id)) {
    roomGridCaros.set(room.id, snapshot.gridCaroState);
  }
  if (snapshot.diceRaceState && !roomDiceRaces.has(room.id)) {
    roomDiceRaces.set(room.id, snapshot.diceRaceState);
  }
  if (snapshot.wagerState && !roomWagers.has(room.id)) {
    roomWagers.set(room.id, snapshot.wagerState);
  }
  if (snapshot.mysteryQuestState && !roomMysteryQuests.has(room.id)) {
    roomMysteryQuests.set(room.id, snapshot.mysteryQuestState);
  }
  if (snapshot.tournamentState && !roomTournaments.has(room.id)) {
    roomTournaments.set(room.id, snapshot.tournamentState);
  }
  if (snapshot.ghostStats && !roomEliminationGhostStats.has(room.id)) {
    roomEliminationGhostStats.set(room.id, new Map(snapshot.ghostStats));
  }
}

/**
 * Áp dụng thay đổi điểm số cho Đội, đảm bảo quy định:
 * "Điểm số của các đội xuyên suốt cuộc chơi luôn >= 0, nếu có một phép trừ có thể khiến điểm về âm, hệ thống chuyển điểm về 0 thay vì âm."
 */
async function applyScoreDeltaToTeam(
  teamId: string,
  delta: number
): Promise<{ oldScore: number; newScore: number; effectiveDelta: number }> {
  const current = await prisma.team.findUnique({ where: { id: teamId }, select: { score: true } });
  const oldScore = current?.score ?? 0;
  const newScore = Math.max(0, oldScore + delta);
  const effectiveDelta = newScore - oldScore;
  await prisma.team.update({
    where: { id: teamId },
    data: { score: newScore },
  });
  return { oldScore, newScore, effectiveDelta };
}

/**
 * Áp dụng thay đổi điểm số cho Thí sinh cá nhân, đảm bảo quy định điểm số luôn >= 0.
 */
async function applyScoreDeltaToPlayer(
  playerId: string,
  delta: number
): Promise<{ oldScore: number; newScore: number; effectiveDelta: number }> {
  const current = await prisma.player.findUnique({ where: { id: playerId }, select: { score: true } });
  const oldScore = current?.score ?? 0;
  const newScore = Math.max(0, oldScore + delta);
  const effectiveDelta = newScore - oldScore;
  await prisma.player.update({
    where: { id: playerId },
    data: { score: newScore },
  });
  return { oldScore, newScore, effectiveDelta };
}

/**
 * Lấy câu hỏi tiếp theo đảm bảo KHÔNG BAO GIỜ bị lặp lại ở tất cả các mode.
 * Theo quy tắc: Nếu hết câu hỏi trong ngân hàng đề mà chưa ai về đích, hoặc không dùng hết ô,
 * thì dừng luôn cuộc chơi và tính hạng luôn (tuyệt đối không lặp lại câu hỏi cũ).
 */
function getNextUniqueQuestion(
  roomId: string,
  rawQuestions: any[],
  preferredIndex?: number,
  targetPoints?: number
): { question: any; index: number } | null {
  if (!rawQuestions || rawQuestions.length === 0) return null;

  let usedSet = roomUsedQuestions.get(roomId);
  if (!usedSet) {
    usedSet = new Set<string>();
    roomUsedQuestions.set(roomId, usedSet);
  }

  // Nếu tất cả câu hỏi trong ngân hàng đề đã được hỏi hết -> dừng luôn cuộc chơi, không lặp lại
  if (usedSet.size >= rawQuestions.length) {
    return null;
  }

  // 1. Thử lấy câu hỏi theo preferredIndex nếu câu đó chưa từng được dùng
  if (preferredIndex !== undefined && preferredIndex >= 0 && preferredIndex < rawQuestions.length) {
    const candidate = rawQuestions[preferredIndex];
    if (candidate && !usedSet.has(candidate.id)) {
      usedSet.add(candidate.id);
      if (targetPoints) {
        candidate.points = targetPoints;
        candidate.bloomLevel = getBloomLevelFromPoints(targetPoints);
      }
      return { question: candidate, index: preferredIndex };
    }
  }

  // 2. Nếu có targetPoints (đồng nhất điểm theo vòng), ưu tiên tìm câu hỏi trong kho khớp mức điểm này trước!
  if (targetPoints) {
    for (let i = 0; i < rawQuestions.length; i++) {
      const candidate = rawQuestions[i];
      if (!usedSet.has(candidate.id)) {
        const normPts = normalizeToThreeLevels(candidate.points || 10);
        if (normPts === targetPoints) {
          usedSet.add(candidate.id);
          candidate.points = targetPoints;
          candidate.bloomLevel = getBloomLevelFromPoints(targetPoints);
          return { question: candidate, index: i };
        }
      }
    }
  }

  // 3. Tìm câu hỏi đầu tiên chưa được sử dụng theo thứ tự của bộ đề
  for (let i = 0; i < rawQuestions.length; i++) {
    const candidate = rawQuestions[i];
    if (!usedSet.has(candidate.id)) {
      usedSet.add(candidate.id);
      if (targetPoints) {
        candidate.points = targetPoints;
        candidate.bloomLevel = getBloomLevelFromPoints(targetPoints);
      }
      return { question: candidate, index: i };
    }
  }

  // Không còn câu hỏi nào chưa sử dụng
  return null;
}

function startGridCaroPreview(ioInstance: IO, roomId: string, roomCode: string, durationSec: number = 5) {
  const gridState = roomGridCaros.get(roomId);
  if (!gridState) return;

  const prevTimer = roomGridTimers.get(roomId);
  if (prevTimer) clearInterval(prevTimer);

  gridState.previewActive = true;
  gridState.previewRemaining = durationSec;
  ioInstance.to(`room:${roomCode}`).emit("game:grid:update", gridState);

  let rem = durationSec;
  const pTimer = setInterval(() => {
    rem--;
    gridState.previewRemaining = rem;
    if (rem <= 0) {
      clearInterval(pTimer);
      roomGridTimers.delete(roomId);
      gridState.previewActive = false;
      gridState.previewRemaining = 0;
      ioInstance.to(`room:${roomCode}`).emit("game:grid:update", gridState);
    } else {
      ioInstance.to(`room:${roomCode}`).emit("game:grid:update", gridState);
    }
  }, 1000);
  roomGridTimers.set(roomId, pTimer);
}

function stopGridCaroPreview(ioInstance: IO, roomId: string, roomCode: string) {
  const gTimer = roomGridTimers.get(roomId);
  if (gTimer) {
    clearInterval(gTimer);
    roomGridTimers.delete(roomId);
  }
  const gridState = roomGridCaros.get(roomId);
  if (gridState) {
    gridState.previewActive = false;
    gridState.previewRemaining = 0;
    ioInstance.to(`room:${roomCode}`).emit("game:grid:update", gridState);
  }
}

async function assignDefaultWagerTeamIfNone(roomId: string, wagerState: WagerState) {
  if (!wagerState.lastWagerTeamId || !wagerState.wagerHistory || wagerState.wagerHistory.length === 0) {
    const teams = await prisma.team.findMany({ where: { roomId } });
    const activeTeams = teams.filter((t) => !t.isEliminated);
    const prevWagerTeamId = wagerState.previousQuestionWagerTeamId;
    const eligibleTeams = prevWagerTeamId && activeTeams.filter((t) => t.id !== prevWagerTeamId).length > 0
      ? activeTeams.filter((t) => t.id !== prevWagerTeamId)
      : activeTeams;

    const teamsGte10 = eligibleTeams.filter((t) => t.score >= 10);
    let pickedTeam: typeof activeTeams[0] | undefined;
    let assignedWager = 10;

    if (teamsGte10.length > 0) {
      pickedTeam = teamsGte10[Math.floor(Math.random() * teamsGte10.length)];
      assignedWager = 10;
    } else {
      const teams5 = eligibleTeams.filter((t) => t.score === 5);
      const pool5 = teams5.length > 0 ? teams5 : eligibleTeams.filter((t) => t.score > 0);
      if (pool5.length > 0) {
        pickedTeam = pool5[Math.floor(Math.random() * pool5.length)];
        assignedWager = Math.min(5, pickedTeam.score > 0 ? pickedTeam.score : 5);
      }
    }

    if (pickedTeam) {
      wagerState.currentHighestWager = assignedWager;
      wagerState.lastWagerTeamId = pickedTeam.id;
      wagerState.autoAssignedTeamId = pickedTeam.id;
      wagerState.autoAssignedTeamName = pickedTeam.name;
      wagerState.wagerHistory = [{
        order: 1,
        teamId: pickedTeam.id,
        teamName: pickedTeam.name,
        teamColor: pickedTeam.color,
        amount: assignedWager,
        timestamp: Date.now(),
      }];
      wagerState.teamWagers[pickedTeam.id] = {
        teamId: pickedTeam.id,
        teamName: pickedTeam.name,
        amount: assignedWager,
        submitted: true,
        order: 1,
      };
    }
  }
}

async function launchWagerQuestion(ioInstance: IO, roomId: string, roomCode: string) {
  const existingAutoTimer = roomWagerAutoLaunchTimers.get(roomId);
  if (existingAutoTimer) {
    clearTimeout(existingAutoTimer);
    roomWagerAutoLaunchTimers.delete(roomId);
  }

  const room = await prisma.room.findUnique({
    where: { id: roomId },
    include: { quizBank: { include: { questions: { orderBy: { order: "asc" } } } } },
  });
  if (!room || room.mode !== "WAGER" || room.status !== "PLAYING") return;
  const wagerState = roomWagers.get(room.id);
  if (!wagerState) return;

  const questions = room.quizBank?.questions ?? [];
  const q = questions[room.currentQuestion];
  if (!q) return;

  // Chuẩn hóa điểm câu hỏi về đúng quy chuẩn 10/20/30 điểm
  q.points = normalizeToThreeLevels(q.points || 10);

  wagerState.phase = "QUESTION_PERIOD";
  wagerState.questionReady = true;
  wagerState.autoLaunchCountdown = undefined;
  wagerState.baseQuestionPoints = q.points;
  const mult = wagerState.wagerMultiplierCap ?? 2.5;
  wagerState.maxBetCap = Math.floor(q.points * mult);

  const qKey = `${room.id}:${q.id}`;
  roomQuestionProcessed.delete(qKey);
  roomQuestionScoresCache.delete(qKey);

  let winningTeamName = wagerState.autoAssignedTeamName || "Đội cược";
  if (wagerState.lastWagerTeamId) {
    const teamObj = await prisma.team.findUnique({ where: { id: wagerState.lastWagerTeamId } });
    if (teamObj) winningTeamName = teamObj.name;
  }

  const answerMethod = (room.config as any)?.answerMethod ?? "DEVICE";
  const isDeviceAnswer = answerMethod === "DEVICE";
  const bloomLevel = getBloomLevelFromPoints(q.points);
  const effectiveTimeLimit = isDeviceAnswer ? getStandardQuestionTimeLimit(q) : quantizeOlympiaTimeLimit(q.points, q.timeLimit);
  const questionState = buildQuestionState(q, {
    bloomLevel,
    answerMethod,
    wagerPhase: "QUESTION_PERIOD",
    primaryTeamId: wagerState.lastWagerTeamId,
    primaryTeamName: winningTeamName,
  });
  questionState.question.points = q.points;
  questionState.timeLimit = effectiveTimeLimit;
  questionState.question.timeLimit = effectiveTimeLimit;

  const autoTimer = (room.config as any)?.autoTimerStart ?? false;
  if (autoTimer) {
    questionState.timerPending = false;
    questionState.timerStarted = true;
    startQuestionTimer(ioInstance, room.code, room.id, q.id, effectiveTimeLimit);
  } else {
    questionState.timerPending = true;
    questionState.timerStarted = false;
  }
  roomActiveQuestions.set(room.id, questionState);

  ioInstance.to(`room:${room.code}`).emit("game:question", questionState);
  ioInstance.to(`room:${room.code}:admin`).emit("admin:question:data", {
    questionId: q.id,
    options: q.options,
    answer: q.answer,
    type: q.type,
    explanation: q.hint || (q as any).explanation,
  });
  ioInstance.to(`room:${room.code}`).emit("game:wager:update", wagerState);
}

function scheduleWagerAutoLaunch(ioInstance: IO, roomId: string, roomCode: string) {
  const existingAutoTimer = roomWagerAutoLaunchTimers.get(roomId);
  if (existingAutoTimer) {
    clearTimeout(existingAutoTimer);
  }
  const timer = setTimeout(async () => {
    roomWagerAutoLaunchTimers.delete(roomId);
    await launchWagerQuestion(ioInstance, roomId, roomCode);
  }, 2500);
  roomWagerAutoLaunchTimers.set(roomId, timer);
}

function checkCanAnyTeamBet(
  allTeams: { id: string; score: number; isEliminated?: boolean }[],
  wagerState: WagerState,
  nextMinOption: number
): boolean {
  if (wagerState.maxBetCap && nextMinOption > wagerState.maxBetCap) {
    return false;
  }
  return allTeams.some((t) => {
    if (t.isEliminated) return false;
    if (wagerState.previousQuestionWagerTeamId && t.id === wagerState.previousQuestionWagerTeamId) {
      return false;
    }
    if (wagerState.lastWagerTeamId === t.id && wagerState.autoAssignedTeamId !== t.id) {
      return false;
    }
    return t.score >= nextMinOption;
  });
}

async function lockWagerAndScheduleAutoLaunch(
  ioInstance: IO,
  roomId: string,
  roomCode: string,
  wagerState: WagerState
) {
  const existingTimer = roomWagerTimers.get(roomId);
  if (existingTimer) {
    clearInterval(existingTimer);
    clearTimeout(existingTimer);
    roomWagerTimers.delete(roomId);
  }
  await assignDefaultWagerTeamIfNone(roomId, wagerState);
  wagerState.phase = "QUESTION_PERIOD";
  wagerState.questionReady = false;
  wagerState.wagerTimeRemaining = 0;
  ioInstance.to(`room:${roomCode}`).emit("game:wager:update", wagerState);
  scheduleWagerAutoLaunch(ioInstance, roomId, roomCode);
}

function startWager15sCountdown(ioInstance: IO, roomId: string, roomCode: string, duration?: number) {
  const existingTimer = roomWagerTimers.get(roomId);
  if (existingTimer) {
    clearInterval(existingTimer);
    clearTimeout(existingTimer);
    roomWagerTimers.delete(roomId);
  }

  const existingAutoLaunch = roomWagerAutoLaunchTimers.get(roomId);
  if (existingAutoLaunch) {
    clearTimeout(existingAutoLaunch);
    roomWagerAutoLaunchTimers.delete(roomId);
  }

  const wagerState = roomWagers.get(roomId);
  if (!wagerState) return;

  const wagerTime = duration && duration > 0 ? duration : 15;
  wagerState.wagerSubPhase = "MAIN_15S";
  wagerState.wagerTimeRemaining = wagerTime;
  wagerState.wagerTimeTotal = wagerTime;
  ioInstance.to(`room:${roomCode}`).emit("game:wager:update", wagerState);

  let wRem = wagerTime;
  const wTimer = setInterval(async () => {
    wRem--;
    wagerState.wagerTimeRemaining = wRem;
    if (wRem <= 0) {
      clearInterval(wTimer);
      roomWagerTimers.delete(roomId);
      await assignDefaultWagerTeamIfNone(roomId, wagerState);
      wagerState.phase = "QUESTION_PERIOD";
      wagerState.questionReady = false;
      wagerState.wagerTimeRemaining = 0;
      ioInstance.to(`room:${roomCode}`).emit("game:wager:update", wagerState);
      scheduleWagerAutoLaunch(ioInstance, roomId, roomCode);
    } else {
      ioInstance.to(`room:${roomCode}`).emit("game:wager:update", wagerState);
    }
  }, 1000);
  roomWagerTimers.set(roomId, wTimer);
}

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

function generateDiceTiles(totalTiles: number = 60): DiceTile[] {
  return generateBalancedDiceTiles(totalTiles);
}

// In-memory cache for ultra-fast response
const roomCache = new Map<string, any>(); // roomId -> room with quizBank & questions
const roomQuestionsCache = new Map<string, any[]>(); // roomId -> questions
const roomActiveAnswers = new Map<string, Map<string, { teamId?: string; playerId?: string; answer: string | string[]; isCorrect: boolean | null; timeSpent: number; submittedAt: number }>>(); // qKey -> (actorKey -> answerData)

export function cleanupRoomInMemory(roomId: string) {
  try {
    // 1. Clear question timers
    for (const [key, timer] of roomTimers.entries()) {
      if (key === roomId || key.startsWith(`${roomId}:`)) {
        clearInterval(timer);
        roomTimers.delete(key);
      }
    }

    // 2. Clear wager and grid timers
    const wagerTimer = roomWagerTimers.get(roomId);
    if (wagerTimer) {
      clearInterval(wagerTimer);
      clearTimeout(wagerTimer);
      roomWagerTimers.delete(roomId);
    }
    const wagerAutoTimer = roomWagerAutoLaunchTimers.get(roomId);
    if (wagerAutoTimer) {
      clearTimeout(wagerAutoTimer);
      roomWagerAutoLaunchTimers.delete(roomId);
    }
    const gridTimer = roomGridTimers.get(roomId);
    if (gridTimer) {
      clearInterval(gridTimer);
      roomGridTimers.delete(roomId);
    }

    // 3. Clear steal and buzz delay timers
    for (const [key, timer] of roomStealTimer.entries()) {
      if (key.startsWith(`${roomId}:`)) {
        clearTimeout(timer);
        roomStealTimer.delete(key);
      }
    }
    for (const [key, timer] of roomBuzzDelayTimers.entries()) {
      if (key.startsWith(`${roomId}:`)) {
        clearTimeout(timer);
        roomBuzzDelayTimers.delete(key);
      }
    }

    // 4. Delete room-level entries
    roomActiveQuestions.delete(roomId);
    roomRevealPayloads.delete(roomId);
    roomRemainingTimes.delete(roomId);
    roomTimerEndsAt.delete(roomId);
    roomPrepareStates.delete(roomId);
    roomTournaments.delete(roomId);
    roomGridCaros.delete(roomId);
    roomDiceRaces.delete(roomId);
    roomWagers.delete(roomId);
    roomUsedQuestions.delete(roomId);
    roomIntermissions.delete(roomId);
    roomCache.delete(roomId);
    roomQuestionsCache.delete(roomId);
    roomGoldQuestions.delete(roomId);
    roomEliminationGhostStats.delete(roomId);

    // 5. Delete qKey-level entries (qKey starts with `${roomId}:`)
    const prefix = `${roomId}:`;
    for (const key of roomQuestionTeamCards.keys()) {
      if (key.startsWith(prefix)) roomQuestionTeamCards.delete(key);
    }
    for (const key of roomFrozenTeams.keys()) {
      if (key.startsWith(prefix)) roomFrozenTeams.delete(key);
    }
    for (const key of roomFiftyFifty.keys()) {
      if (key.startsWith(prefix)) roomFiftyFifty.delete(key);
    }
    for (const key of roomQuestionProcessed) {
      if (key.startsWith(prefix)) roomQuestionProcessed.delete(key);
    }
    for (const key of roomQuestionScoresCache.keys()) {
      if (key.startsWith(prefix)) roomQuestionScoresCache.delete(key);
    }
    roomSandboxActiveTeam.delete(roomId);
    for (const key of roomPrimaryTeams.keys()) {
      if (key.startsWith(prefix)) roomPrimaryTeams.delete(key);
    }
    for (const key of roomStealPhase.keys()) {
      if (key.startsWith(prefix)) roomStealPhase.delete(key);
    }
    for (const key of roomStealBuzzed.keys()) {
      if (key.startsWith(prefix)) roomStealBuzzed.delete(key);
    }
    for (const key of roomBuzzFirst.keys()) {
      if (key.startsWith(prefix)) roomBuzzFirst.delete(key);
    }
    for (const key of roomBuzzUnlocked.keys()) {
      if (key.startsWith(prefix)) roomBuzzUnlocked.delete(key);
    }
    for (const key of roomBuzzAttemptOrder.keys()) {
      if (key.startsWith(prefix)) roomBuzzAttemptOrder.delete(key);
    }
    for (const key of roomBuzzWindowTimers.keys()) {
      if (key.startsWith(prefix)) {
        clearTimeout(roomBuzzWindowTimers.get(key)!);
        roomBuzzWindowTimers.delete(key);
      }
    }
    for (const key of roomBuzzWindowEndsAt.keys()) {
      if (key.startsWith(prefix)) roomBuzzWindowEndsAt.delete(key);
    }
    for (const key of roomBuzzWindowRemaining.keys()) {
      if (key.startsWith(prefix)) roomBuzzWindowRemaining.delete(key);
    }
    for (const key of roomBuzzDisqualified.keys()) {
      if (key.startsWith(prefix)) roomBuzzDisqualified.delete(key);
    }
    for (const key of roomBuzzAnsweringTimers.keys()) {
      if (key.startsWith(prefix)) {
        clearTimeout(roomBuzzAnsweringTimers.get(key)!);
        roomBuzzAnsweringTimers.delete(key);
      }
    }
    for (const key of roomBouncebackSelectedPoints.keys()) {
      if (key.startsWith(prefix)) roomBouncebackSelectedPoints.delete(key);
    }
    for (const key of roomFinalizedActors.keys()) {
      if (key.startsWith(prefix)) roomFinalizedActors.delete(key);
    }
    for (const key of roomSubmittedActors.keys()) {
      if (key.startsWith(prefix)) roomSubmittedActors.delete(key);
    }
    for (const key of roomActiveAnswers.keys()) {
      if (key.startsWith(prefix)) roomActiveAnswers.delete(key);
    }
    for (const [key, val] of roomBuzzArbitration.entries()) {
      if (key.startsWith(prefix)) {
        clearTimeout(val.timer);
        roomBuzzArbitration.delete(key);
      }
    }
    for (const key of roomBuzzWindowOpenedAt.keys()) {
      if (key.startsWith(prefix)) roomBuzzWindowOpenedAt.delete(key);
    }
    for (const key of roomStealOpenedAt.keys()) {
      if (key.startsWith(prefix)) roomStealOpenedAt.delete(key);
    }
    for (const key of roomStealEndsAt.keys()) {
      if (key.startsWith(prefix)) roomStealEndsAt.delete(key);
    }
    roomQuestionStartedAt.delete(roomId);
  } catch (err) {
    console.error(`[cleanupRoomInMemory] Error clearing room ${roomId}:`, err);
  }
}

// Register on globalThis for cross-module accessibility in Node.js
const globalForSockets = globalThis as unknown as {
  cleanupRoomInMemory?: (roomId: string) => void;
};
globalForSockets.cleanupRoomInMemory = cleanupRoomInMemory;

async function getAdminRoom(socket: Sock, payloadCode?: string) {
  let roomId = adminSockets.get(socket.id);

  if (!roomId && payloadCode) {
    const rByCode = await prisma.room.findUnique({
      where: { code: payloadCode },
      include: { quizBank: { include: { questions: { orderBy: { order: "asc" } } } } },
    });
    if (rByCode) {
      roomId = rByCode.id;
      adminSockets.set(socket.id, roomId);
      roomCache.set(roomId, rByCode);
      if (rByCode.quizBank?.questions) {
        roomQuestionsCache.set(roomId, rByCode.quizBank.questions);
      }
      return rByCode;
    }
  }

  if (!roomId) {
    for (const roomName of socket.rooms) {
      if (roomName.startsWith("room:") && roomName.endsWith(":admin")) {
        const extractedCode = roomName.replace("room:", "").replace(":admin", "");
        if (extractedCode) {
          const rByCode = await prisma.room.findUnique({
            where: { code: extractedCode },
            include: { quizBank: { include: { questions: { orderBy: { order: "asc" } } } } },
          });
          if (rByCode) {
            roomId = rByCode.id;
            adminSockets.set(socket.id, roomId);
            roomCache.set(roomId, rByCode);
            if (rByCode.quizBank?.questions) {
              roomQuestionsCache.set(roomId, rByCode.quizBank.questions);
            }
            return rByCode;
          }
        }
      }
    }
  }

  if (!roomId) return null;

  const cached = roomCache.get(roomId);
  if (cached) {
    if (!cached.quizBank?.questions?.length) {
      const qCached = roomQuestionsCache.get(roomId);
      if (qCached && qCached.length > 0) {
        if (!cached.quizBank) cached.quizBank = { questions: qCached };
        else cached.quizBank.questions = qCached;
      } else {
        const r = await prisma.room.findUnique({
          where: { id: roomId },
          include: { quizBank: { include: { questions: { orderBy: { order: "asc" } } } } },
        });
        if (r) {
          roomCache.set(roomId, r);
          if (r.quizBank?.questions) roomQuestionsCache.set(roomId, r.quizBank.questions);
          restoreGameStateSnapshot(r);
          return r;
        }
      }
    }
    restoreGameStateSnapshot(cached);
    return cached;
  }

  const r = await prisma.room.findUnique({
    where: { id: roomId },
    include: { quizBank: { include: { questions: { orderBy: { order: "asc" } } } } },
  });
  if (r) {
    roomCache.set(roomId, r);
    if (r.quizBank?.questions) {
      roomQuestionsCache.set(roomId, r.quizBank.questions);
    }
    restoreGameStateSnapshot(r);
  }
  return r;
}

export function registerSocketHandlers(io: IO) {
  globalIO = io;

  const startStealAnsweringTimer = async (
    roomId: string,
    roomCode: string,
    currentQ: any,
    customDuration?: number
  ) => {
    const qKey = `${roomId}:${currentQ.id}`;
    const prepKey = `${roomId}:steal_prep`;
    if (roomStealTimer.has(prepKey)) {
      clearTimeout(roomStealTimer.get(prepKey)!);
      roomStealTimer.delete(prepKey);
    }

    const steal = roomStealBuzzed.get(qKey);
    if (!steal) return;

    const chosenPoints = roomBouncebackSelectedPoints.get(qKey) ?? 20;
    const defaultDuration = getBuzzedAnswerTimeLimit(currentQ, chosenPoints);
    const timeLimit = customDuration && customDuration > 0 ? customDuration : defaultDuration;

    const activeQ = roomActiveQuestions.get(roomId);
    if (activeQ) {
      activeQ.stealAnsweringActive = true;
      activeQ.timeLimit = timeLimit;
      activeQ.startedAt = Date.now();
      activeQ.endsAt = Date.now() + timeLimit * 1000;
      activeQ.timerPending = false;
      activeQ.timerStarted = true;
      io.to(`room:${roomCode}`).emit("game:question", activeQ);
    }

    io.to(`room:${roomCode}`).emit("game:bounceback:steal_answering", {
      teamId: steal.teamId,
      teamName: steal.teamName,
      timeLimit,
    });
    io.to(`room:${roomCode}`).emit("game:timer:started", {
      timeLimit,
      endsAt: Date.now() + timeLimit * 1000,
      serverTime: Date.now(),
      questionId: currentQ.id,
    });
    startQuestionTimer(io, roomCode, roomId, currentQ.id, timeLimit);
  };

  const resolveBuzzArbitrationWinner = async (
    roomId: string,
    roomCode: string,
    questionId: string,
    mode: "BUZZ" | "BOUNCEBACK",
    candidates: BuzzCandidate[]
  ) => {
    if (!candidates || candidates.length === 0) return;
    const qKey = `${roomId}:${questionId}`;

    // Sort candidates by clientBuzzedAt ascending; tiebreak by receivedAt
    candidates.sort((a, b) => {
      if (a.clientBuzzedAt !== b.clientBuzzedAt) {
        return a.clientBuzzedAt - b.clientBuzzedAt;
      }
      return a.receivedAt - b.receivedAt;
    });

    const winner = candidates[0];

    if (mode === "BUZZ") {
      if (roomBuzzFirst.has(qKey)) return;

      const attempts = roomBuzzAttemptOrder.get(qKey) || [];
      const attemptNumber = attempts.length + 1;
      const multiplier = attemptNumber === 1 ? 1.5 : attemptNumber === 2 ? 1.0 : 0.5;
      const buzzInfo = {
        teamId: winner.teamId,
        teamName: winner.teamName,
        playerId: winner.playerId,
        playerName: winner.playerName,
        attemptNumber,
        multiplier,
      };

      roomBuzzFirst.set(qKey, buzzInfo);
      attempts.push(buzzInfo);
      roomBuzzAttemptOrder.set(qKey, attempts);

      // Stop standard question timer
      stopQuestionTimer(roomId);

      const questions = await getRoomQuestions(roomId);
      const room = await prisma.room.findUnique({
        where: { id: roomId },
        select: { currentQuestion: true, config: true },
      });
      const currentQ = questions[room?.currentQuestion ?? 0];
      const isDeviceAnswer = (room?.config as any)?.answerMethod !== "MC";
      const answerTimeLimit = isDeviceAnswer ? getBuzzedAnswerTimeLimit(currentQ) : 15;
      const answerEndsAt = Date.now() + answerTimeLimit * 1000;

      const activeQ = roomActiveQuestions.get(roomId);
      if (activeQ) {
        activeQ.buzzedTeamId = winner.teamId;
        activeQ.buzzedTeamName = winner.teamName;
        activeQ.buzzedBy = winner.playerName;
        activeQ.buzzAnsweringActive = true;
        activeQ.buzzAttemptNumber = attemptNumber;
        activeQ.buzzMaxAttempts = activeQ.buzzMaxAttempts ?? (attempts.length <= 2 ? 2 : 3);
        activeQ.buzzMultiplier = multiplier;
        activeQ.buzzWindowActive = false;
        activeQ.timeLimit = answerTimeLimit;
        activeQ.startedAt = Date.now();
        activeQ.endsAt = answerEndsAt;
        activeQ.timerPending = false;
        activeQ.timerStarted = true;
        io.to(`room:${roomCode}`).emit("game:question", activeQ);
      }

      io.to(`room:${roomCode}`).emit("game:buzz", buzzInfo);
      io.to(`room:${roomCode}`).emit("game:buzz:answering", {
        teamId: winner.teamId,
        teamName: winner.teamName,
        timeLimit: answerTimeLimit,
        attemptNumber,
        maxAttempts: activeQ?.buzzMaxAttempts,
        multiplier,
      });
      io.to(`room:${roomCode}`).emit("game:timer:started", {
        timeLimit: answerTimeLimit,
        endsAt: answerEndsAt,
        serverTime: Date.now(),
        questionId,
      });

      startQuestionTimer(io, roomCode, roomId, questionId, answerTimeLimit);
    } else if (mode === "BOUNCEBACK") {
      if (roomStealBuzzed.has(qKey)) return;

      // Stop steal timer & ticker
      if (roomStealTimer.has(qKey)) {
        clearTimeout(roomStealTimer.get(qKey)!);
        roomStealTimer.delete(qKey);
      }
      roomStealPhase.set(qKey, false);
      stopQuestionTimer(roomId);

      const stealInfo = {
        teamId: winner.teamId,
        teamName: winner.teamName,
        playerId: winner.playerId,
        playerName: winner.playerName,
      };
      roomStealBuzzed.set(qKey, stealInfo);

      const questions = await getRoomQuestions(roomId);
      const room = await prisma.room.findUnique({
        where: { id: roomId },
        select: { currentQuestion: true, config: true },
      });
      const currentQ = questions[room?.currentQuestion ?? 0];

      const activeQ = roomActiveQuestions.get(roomId);
      if (activeQ) {
        activeQ.isStealPhase = false;
        activeQ.stealBuzzedTeamId = stealInfo.teamId;
        activeQ.stealBuzzedTeamName = stealInfo.teamName;
        activeQ.stealAnsweringActive = false; // 3s buffer first
        activeQ.timerPending = true;
        activeQ.timerStarted = false;
        io.to(`room:${roomCode}`).emit("game:question", activeQ);
      }

      io.to(`room:${roomCode}`).emit("game:bounceback:steal_buzzed", {
        ...stealInfo,
        prepSeconds: 3,
      });

      // 3 giây đệm 'SẴN SÀNG' để thí sinh chuẩn bị tâm lý trước khi đồng hồ trả lời chính thức chạy
      const prepKey = `${roomId}:steal_prep`;
      if (roomStealTimer.has(prepKey)) {
        clearTimeout(roomStealTimer.get(prepKey)!);
      }
      const prepTimeout = setTimeout(async () => {
        roomStealTimer.delete(prepKey);
        const currentActiveQ = roomActiveQuestions.get(roomId);
        if (currentActiveQ && currentActiveQ.stealBuzzedTeamId === stealInfo.teamId && !currentActiveQ.stealAnsweringActive) {
          await startStealAnsweringTimer(roomId, roomCode, currentQ);
        }
      }, 3000);
      roomStealTimer.set(prepKey, prepTimeout);
    }
  };

  io.on("connection", (socket: Sock) => {
    console.log(`[Socket] Connected: ${socket.id}`);

    // ── Clock Synchronization (NTP-style) ───────────────────────────────────
    socket.on("time:sync", (clientTime, callback) => {
      if (typeof callback === "function") {
        callback({ clientTime, serverTime: Date.now() });
      }
    });

    // ── Join Room ────────────────────────────────────────────────────────────
    socket.on("room:join", async ({ code, playerName, playerId, teamId }, callback) => {
      try {
        const isSandbox =
          Boolean(socket.handshake.query?.sandbox === "1") ||
          Boolean(playerName?.includes("🤖")) ||
          Boolean(playerName?.includes("(Tester)"));

        if (!isSandbox) {
          // Bỏ qua rate limit nếu người chơi đang kết nối lại (đã có playerId hợp lệ) để tránh bị chặn khi mạng chập chờn
          if (!playerId) {
            const clientIp = (socket.handshake.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || socket.handshake.address || socket.id;
            const joinLimit = checkPlayerJoinLimit(clientIp);
            if (!joinLimit.allowed) {
              return callback({ success: false, error: `Bạn đang gửi yêu cầu quá nhanh. Vui lòng thử lại sau ${joinLimit.retryAfterSeconds}s.` });
            }
          }
        }

        const room = await prisma.room.findUnique({
          where: { code },
          include: {
            teams: {
              orderBy: { createdAt: "asc" },
              include: { players: true, powerupCards: true },
            },
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
            // Enforce single active session: disconnect prior active socket if different
            if (!isSandbox && existingById.socketId && existingById.socketId !== socket.id) {
              const oldSock = io.sockets.sockets.get(existingById.socketId);
              if (oldSock && oldSock.connected) {
                oldSock.emit("error", "Tài khoản của bạn đã được đăng nhập từ một thiết bị hoặc tab khác!");
                oldSock.disconnect(true);
              }
            }

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
        const matchedTeam = roomState.teams.find((t) => t.id === player.teamId);
        const cachedSession: CachedPlayerSession = {
          playerId: player.id,
          playerName: player.name,
          roomId: room.id,
          roomCode: code,
          teamId: player.teamId ?? undefined,
          teamName: matchedTeam?.name ?? undefined,
          roomMode: room.mode as any,
          teamMode: room.teamMode as any,
        };
        socketPlayerSessions.set(socket.id, cachedSession);
        playerSessions.set(player.id, cachedSession);

        // Broadcast updated room state so all participants see the online status & team counts
        io.to(`room:${code}`).emit("room:state", roomState);

        // If the room is in intermission, send intermission payload; otherwise if PLAYING recover question and timer
        const isPreparing = roomPrepareStates.has(room.id);
        const effectiveRoomStatus = roomCache.get(room.id)?.status ?? room.status;
        if (roomIntermissions.has(room.id)) {
          socket.emit("game:intermission", roomIntermissions.get(room.id)!);
        } else if (effectiveRoomStatus === "PLAYING" && !isPreparing) {
          if (roomRevealPayloads.has(room.id)) {
            socket.emit("game:answer:reveal", roomRevealPayloads.get(room.id)!);
          } else if (room.quizBank?.questions) {
            const activeQ = roomActiveQuestions.get(room.id);
            if (activeQ) {
              socket.emit("game:question", activeQ);
              const remaining = roomRemainingTimes.get(`${room.id}:timer`);
              const endsAt = roomTimerEndsAt.get(room.id) || activeQ.endsAt;
              if (activeQ.timerStarted && typeof remaining === "number" && remaining > 0) {
                socket.emit("game:timer", { remaining, total: activeQ.timeLimit, endsAt, serverTime: Date.now() });
              }
            } else {
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
                  timerPending: true,
                  timerStarted: false,
                });

                const timerKey = `${room.id}:timer`;
                const remaining = roomRemainingTimes.get(timerKey);
                const endsAt = roomTimerEndsAt.get(room.id);
                if (endsAt) {
                  qState.endsAt = endsAt;
                  qState.serverTime = Date.now();
                }

                socket.emit("game:question", qState);

                if (typeof remaining === "number" && remaining > 0) {
                  socket.emit("game:timer", { remaining, total: currentQ.timeLimit, endsAt, serverTime: Date.now() });
                }
              }
            }
          }

          // Phục hồi sub-states của các game mode đặc thù khi reconnect
          if (roomDiceRaces.has(room.id)) {
            socket.emit("game:dice:update", roomDiceRaces.get(room.id)!);
          }
          if (roomGridCaros.has(room.id)) {
            socket.emit("game:grid:update", roomGridCaros.get(room.id)!);
          }
          if (roomWagers.has(room.id)) {
            socket.emit("game:wager:update", roomWagers.get(room.id)!);
          }
          if (roomTournaments.has(room.id)) {
            socket.emit("game:tournament:update", roomTournaments.get(room.id)!);
          }
          const currentQ = room.quizBank?.questions?.[room.currentQuestion];
          if (currentQ) {
            const qKey = `${room.id}:${currentQ.id}`;
            if (roomStealPhase.get(qKey)) {
              socket.emit("game:bounceback:open_steal", { questionId: currentQ.id, timeLimit: 5 });
            }
            if (roomStealBuzzed.has(qKey)) {
              socket.emit("game:bounceback:steal_buzzed", roomStealBuzzed.get(qKey)!);
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

        // If the room is in intermission, send intermission payload; otherwise if PLAYING recover question and timer
        const isPreparing = roomPrepareStates.has(room.id);
        const effectiveRoomStatus = roomCache.get(room.id)?.status ?? room.status;
        if (roomIntermissions.has(room.id)) {
          socket.emit("game:intermission", roomIntermissions.get(room.id)!);
        } else if (effectiveRoomStatus === "PLAYING" && room.quizBank?.questions && !isPreparing) {
          const activeQ = roomActiveQuestions.get(room.id);
          if (activeQ) {
            socket.emit("game:question", activeQ);
            const rawQ = room.quizBank.questions.find((item: any) => item.id === activeQ.question.id) || room.quizBank.questions[room.currentQuestion];
            if (rawQ) {
              socket.emit("admin:question:data", {
                questionId: rawQ.id,
                options: rawQ.options,
                answer: rawQ.answer,
                type: rawQ.type,
                explanation: rawQ.hint || (rawQ as any).explanation,
              });
            }
            const remaining = roomRemainingTimes.get(`${room.id}:timer`);
            const endsAt = roomTimerEndsAt.get(room.id) || activeQ.endsAt;
            if (activeQ.timerStarted && typeof remaining === "number" && remaining > 0) {
              socket.emit("game:timer", { remaining, total: activeQ.timeLimit, endsAt, serverTime: Date.now() });
            }
          } else {
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
                timerPending: true,
                timerStarted: false,
              });

              const timerKey = `${room.id}:timer`;
              const remaining = roomRemainingTimes.get(timerKey);
              const endsAt = roomTimerEndsAt.get(room.id);
              if (endsAt) {
                qState.endsAt = endsAt;
                qState.serverTime = Date.now();
              }

              socket.emit("game:question", qState);
              socket.emit("admin:question:data", {
                questionId: currentQ.id,
                options: currentQ.options,
                answer: currentQ.answer,
                type: currentQ.type,
                explanation: currentQ.hint || (currentQ as any).explanation,
              });

              if (typeof remaining === "number" && remaining > 0) {
                socket.emit("game:timer", { remaining, total: currentQ.timeLimit, endsAt, serverTime: Date.now() });
              }
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
        const sess = socketPlayerSessions.get(socket.id) || playerSessions.get(playerId);
        if (sess) {
          sess.teamId = team.id;
          sess.teamName = team.name;
          socketPlayerSessions.set(socket.id, sess);
          playerSessions.set(playerId, sess);
        } else {
          const newSess: CachedPlayerSession = {
            playerId,
            playerName: player.name,
            roomId: player.room.id,
            roomCode: player.room.code,
            teamId: team.id,
            teamName: team.name,
            roomMode: player.room.mode as any,
            teamMode: player.room.teamMode as any,
          };
          socketPlayerSessions.set(socket.id, newSess);
          playerSessions.set(playerId, newSess);
        }

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

        // If the room is in intermission, send intermission payload; otherwise if PLAYING recover question and timer
        const isPreparing = roomPrepareStates.has(room.id);
        const effectiveRoomStatus = roomCache.get(room.id)?.status ?? room.status;
        if (roomIntermissions.has(room.id)) {
          socket.emit("game:intermission", roomIntermissions.get(room.id)!);
        } else if (effectiveRoomStatus === "PLAYING" && room.quizBank?.questions && !isPreparing) {
          const activeQ = roomActiveQuestions.get(room.id);
          if (activeQ) {
            socket.emit("game:question", activeQ);
            const remaining = roomRemainingTimes.get(`${room.id}:timer`);
            const endsAt = roomTimerEndsAt.get(room.id) || activeQ.endsAt;
            if (activeQ.timerStarted && typeof remaining === "number" && remaining > 0) {
              socket.emit("game:timer", { remaining, total: activeQ.timeLimit, endsAt, serverTime: Date.now() });
            }
          } else {
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
                timerPending: true,
                timerStarted: false,
              });

              const timerKey = `${room.id}:timer`;
              const remaining = roomRemainingTimes.get(timerKey);
              const endsAt = roomTimerEndsAt.get(room.id);
              if (endsAt) {
                qState.endsAt = endsAt;
                qState.serverTime = Date.now();
              }

              socket.emit("game:question", qState);

              if (typeof remaining === "number" && remaining > 0) {
                socket.emit("game:timer", { remaining, total: currentQ.timeLimit, endsAt, serverTime: Date.now() });
              }
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
    socket.on("game:answer:submit", async ({ questionId, answer, teamId, playerId: clientPlayerId, clientAnsweredAt }: any) => {
      if (!checkActionDebounce(socket.id, 150)) return;

      let playerId = clientPlayerId || playerSockets.get(socket.id);
      if (!playerId) {
        const dbPlayer = await prisma.player.findFirst({
          where: { socketId: socket.id },
          include: { room: true },
        }).catch(() => null);
        if (dbPlayer) {
          playerId = dbPlayer.id;
          playerSockets.set(socket.id, dbPlayer.id);
        }
      }
      if (!playerId) return;

      let session = socketPlayerSessions.get(socket.id) || playerSessions.get(playerId);
      if (!session || !session.teamId) {
        const player = await prisma.player.findFirst({
          where: {
            OR: [
              { id: playerId },
              { socketId: socket.id },
            ],
          },
          include: { room: true, team: true },
        });
        if (!player || !player.room) return;
        const effTeamId = teamId || player.teamId || session?.teamId || undefined;
        session = {
          playerId: player.id,
          playerName: player.name,
          roomId: player.room.id,
          roomCode: player.room.code,
          teamId: effTeamId,
          teamName: player.team?.name ?? session?.teamName ?? player.name,
          roomMode: player.room.mode as any,
          teamMode: player.room.teamMode as any,
        };
        socketPlayerSessions.set(socket.id, session);
        playerSessions.set(player.id, session);
      }

      const submissionTeamId = teamId || session.teamId || undefined;

      await processAnswerSubmission({
        io,
        roomId: session.roomId,
        questionId,
        playerId,
        teamId: submissionTeamId,
        answer,
        clientAnsweredAt,
        isAdminOverride: false,
        socket,
      });
    });

    // ── Admin Submit Answer (MC Mode / Override / After Timeout) ──────────────
    socket.on("admin:submit:answer", async ({ questionId, teamId, playerId, answer, code }: any) => {
      const room = await getAdminRoom(socket, code);
      if (!room) return;

      const activeQ = roomActiveQuestions.get(room.id);
      const rawQuestions = room.quizBank?.questions ?? [];
      const effectiveQuestionId = questionId || activeQ?.question.id || (rawQuestions[room.currentQuestion] as any)?.id;
      if (!effectiveQuestionId) return;

      const qKey = `${room.id}:${effectiveQuestionId}`;

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
      } else if (room.mode === "GRID_CARO") {
        const gridState = roomGridCaros.get(room.id);
        if (gridState?.currentTurnTeamId) {
          effTeamId = effTeamId || gridState.currentTurnTeamId;
        }
      } else if (room.mode === "DICE_RACE") {
        const diceState = roomDiceRaces.get(room.id);
        if (diceState?.currentTurnTeamId) {
          effTeamId = effTeamId || diceState.currentTurnTeamId;
        }
      } else if (room.mode === "MYSTERY_QUEST") {
        const questState = roomMysteryQuests.get(room.id);
        if (questState?.currentTurnTeamId) {
          effTeamId = effTeamId || questState.currentTurnTeamId;
        }
      }

      if ((room.name?.startsWith("[Sandbox]") || (room.config as any)?.isSandbox) && effTeamId) {
        roomSandboxActiveTeam.set(room.id, effTeamId);
      }

      await processAnswerSubmission({
        io,
        roomId: room.id,
        questionId: effectiveQuestionId,
        playerId: effPlayerId,
        teamId: effTeamId,
        answer,
        isAdminOverride: true,
        socket,
      });
    });



    // ── Buzz ────────────────────────────────────────────────────────────────
    socket.on("game:buzz", async (payload?: { clientBuzzedAt?: number }) => {
      if (!checkActionDebounce(socket.id, 150)) return;

      const now = Date.now();
      const clientBuzzedAt = typeof payload?.clientBuzzedAt === "number" ? payload.clientBuzzedAt : now;

      const playerId = playerSockets.get(socket.id);
      if (!playerId) return;

      // Fast-path: read from memory cache (0ms DB query)
      let session = socketPlayerSessions.get(socket.id) || playerSessions.get(playerId);
      if (!session) {
        const player = await prisma.player.findUnique({
          where: { id: playerId },
          include: { room: true, team: true },
        });
        if (!player?.room || player.room.status !== "PLAYING") return;
        session = {
          playerId: player.id,
          playerName: player.name,
          roomId: player.room.id,
          roomCode: player.room.code,
          teamId: player.teamId ?? undefined,
          teamName: player.team?.name ?? player.name,
          roomMode: player.room.mode as any,
          teamMode: player.room.teamMode as any,
        };
        socketPlayerSessions.set(socket.id, session);
        playerSessions.set(player.id, session);
      }

      const activeQ = roomActiveQuestions.get(session.roomId);
      if (!activeQ || !activeQ.question?.id) return;
      const questionId = activeQ.question.id;
      const qKey = `${session.roomId}:${questionId}`;
      const mode = session.roomMode;

      if (mode === "BUZZ") {
        // Buzzer lock check with network latency grace period
        const isUnlocked = roomBuzzUnlocked.get(qKey) ?? false;
        const windowEndsAt = roomBuzzWindowEndsAt.get(qKey);
        const inGracePeriod = Boolean(windowEndsAt && (clientBuzzedAt <= windowEndsAt + 200 || now <= windowEndsAt + 400));

        if (!isUnlocked && !inGracePeriod) {
          socket.emit("error", "Chuông đang bị khóa! Vui lòng chờ mở chuông.");
          return;
        }

        // Only accept if no team is currently in answering mode
        if (roomBuzzFirst.has(qKey)) return;

        const teamId = session.teamId ?? session.playerId;
        const teamName = session.teamName ?? session.playerName;
        const maxAttempts = activeQ.buzzMaxAttempts ?? 3;
        const attempts = roomBuzzAttemptOrder.get(qKey) || [];

        if (attempts.length >= maxAttempts) {
          socket.emit("error", `Đã hết ${maxAttempts} lượt bấm chuông cho câu hỏi này!`);
          return;
        }

        // Rule: "mỗi đội có tối đa 1 lần bấm"
        const disqSet = roomBuzzDisqualified.get(qKey);
        const alreadyBuzzed = attempts.some((a) => a.teamId === teamId) || Boolean(disqSet && disqSet.has(teamId));
        if (alreadyBuzzed) {
          socket.emit("error", "Mỗi đội chỉ được bấm chuông tối đa 1 lần cho mỗi câu hỏi!");
          return;
        }

        // Anti-cheat / timestamp normalization
        const minAllowedTime = (roomBuzzWindowOpenedAt.get(qKey) ?? (now - 2000)) - 150;
        const safeClientBuzzedAt = Math.min(Math.max(clientBuzzedAt, minAllowedTime), now + 150);

        // Check active arbitration window
        if (roomBuzzArbitration.has(qKey)) {
          const arb = roomBuzzArbitration.get(qKey)!;
          if (!arb.candidates.some((c) => c.teamId === teamId)) {
            arb.candidates.push({
              teamId,
              teamName,
              playerId: session.playerId,
              playerName: session.playerName,
              clientBuzzedAt: safeClientBuzzedAt,
              receivedAt: now,
              socket,
              mode: "BUZZ",
            });
          }
          return;
        }

        // First candidate: lock buzzer immediately in RAM & open 120ms arbitration window
        roomBuzzUnlocked.set(qKey, false);

        if (roomBuzzWindowTimers.has(qKey)) {
          clearTimeout(roomBuzzWindowTimers.get(qKey)!);
          roomBuzzWindowTimers.delete(qKey);
        }
        const wEndsAt = roomBuzzWindowEndsAt.get(qKey) || now;
        const remWindowMs = Math.max(0, wEndsAt - now);
        roomBuzzWindowRemaining.set(qKey, remWindowMs);

        const candidates: BuzzCandidate[] = [{
          teamId,
          teamName,
          playerId: session.playerId,
          playerName: session.playerName,
          clientBuzzedAt: safeClientBuzzedAt,
          receivedAt: now,
          socket,
          mode: "BUZZ",
        }];

        const arbTimer = setTimeout(async () => {
          roomBuzzArbitration.delete(qKey);
          await resolveBuzzArbitrationWinner(session.roomId, session.roomCode, questionId, "BUZZ", candidates);
        }, 120);

        roomBuzzArbitration.set(qKey, {
          timer: arbTimer,
          candidates,
          deadline: now + 120,
        });

      } else if (mode === "BOUNCEBACK") {
        const isSteal = roomStealPhase.get(qKey) ?? false;
        const stealEndsAt = roomStealEndsAt.get(qKey);
        const inGracePeriod = Boolean(stealEndsAt && (clientBuzzedAt <= stealEndsAt + 200 || now <= stealEndsAt + 400));

        if (!isSteal && !inGracePeriod) return;

        // Primary team cannot steal their own question!
        const primary = roomPrimaryTeams.get(qKey);
        if (session.teamId && primary && session.teamId === primary.teamId) {
          socket.emit("error", "Đội của bạn là đội trả lời chính, không thể cướp lượt câu này!");
          return;
        }

        // Only first steal buzz wins
        if (roomStealBuzzed.has(qKey)) return;

        const teamId = session.teamId ?? session.playerId;
        const teamName = session.teamName ?? session.playerName;

        const minAllowedTime = (roomStealOpenedAt.get(qKey) ?? (now - 2000)) - 150;
        const safeClientBuzzedAt = Math.min(Math.max(clientBuzzedAt, minAllowedTime), now + 150);

        if (roomBuzzArbitration.has(qKey)) {
          const arb = roomBuzzArbitration.get(qKey)!;
          if (!arb.candidates.some((c) => c.teamId === teamId)) {
            arb.candidates.push({
              teamId,
              teamName,
              playerId: session.playerId,
              playerName: session.playerName,
              clientBuzzedAt: safeClientBuzzedAt,
              receivedAt: now,
              socket,
              mode: "BOUNCEBACK",
            });
          }
          return;
        }

        // First candidate: lock steal phase & open 120ms arbitration window
        if (roomStealTimer.has(qKey)) {
          clearTimeout(roomStealTimer.get(qKey)!);
          roomStealTimer.delete(qKey);
        }
        roomStealPhase.set(qKey, false);

        const candidates: BuzzCandidate[] = [{
          teamId,
          teamName,
          playerId: session.playerId,
          playerName: session.playerName,
          clientBuzzedAt: safeClientBuzzedAt,
          receivedAt: now,
          socket,
          mode: "BOUNCEBACK",
        }];

        const arbTimer = setTimeout(async () => {
          roomBuzzArbitration.delete(qKey);
          await resolveBuzzArbitrationWinner(session.roomId, session.roomCode, questionId, "BOUNCEBACK", candidates);
        }, 120);

        roomBuzzArbitration.set(qKey, {
          timer: arbTimer,
          candidates,
          deadline: now + 120,
        });
      }
    });

    // ── Admin: Buzz Unlock (Manual or Early Unlock) ───────────────────────────
    socket.on("admin:buzz:unlock", async () => {
      const room = await getAdminRoom(socket);
      if (!room || room.mode !== "BUZZ") return;

      const questions = await getRoomQuestions(room.id);
      const currentQ = questions[room.currentQuestion];
      if (!currentQ) return;
      const qKey = `${room.id}:${currentQ.id}`;

      if (roomBuzzDelayTimers.has(qKey)) {
        clearTimeout(roomBuzzDelayTimers.get(qKey)!);
        roomBuzzDelayTimers.delete(qKey);
      }

      // Mở mới 5s khi MC bấm mở chuông
      roomBuzzWindowRemaining.set(qKey, 5000);
      await openBuzzWindow(io, room.id, room.code, currentQ.id, 5000);
    });

    // ── Admin: Buzz Judge (MC manual Correct/Wrong override) ──────────────────
    socket.on("admin:buzz:judge", async ({ isCorrect, code }: any) => {
      const room = await getAdminRoom(socket, code);
      if (!room || room.mode !== "BUZZ") return;

      const questions = await getRoomQuestions(room.id);
      const currentQ = questions[room.currentQuestion];
      if (!currentQ) return;

      await finalizeBuzzAnswer(io, room.id, room.code, currentQ.id, isCorrect);
    });

    // ── Admin: Buzz Start Answer ──────────────────────────────────────────────
    socket.on("admin:buzz:start_answer", async (payload?: { duration?: number }) => {
      const room = await getAdminRoom(socket);
      if (!room) return;

      const questions = await getRoomQuestions(room.id);
      const currentQ = questions[room.currentQuestion];
      if (!currentQ) return;
      const qKey = `${room.id}:${currentQ.id}`;

      const buzz = roomBuzzFirst.get(qKey);
      if (!buzz) return;

      const isDeviceAnswer = (room.config as any)?.answerMethod !== "MC";
      const defaultDuration = isDeviceAnswer ? getBuzzedAnswerTimeLimit(currentQ) : 15;
      const timeLimit = payload?.duration && payload.duration > 0
        ? payload.duration
        : defaultDuration;

      const activeQ = roomActiveQuestions.get(room.id);
      if (activeQ) {
        activeQ.buzzAnsweringActive = true;
        activeQ.timeLimit = timeLimit;
        activeQ.startedAt = Date.now();
        activeQ.endsAt = Date.now() + timeLimit * 1000;
        activeQ.timerPending = false;
        activeQ.timerStarted = true;
        io.to(`room:${room.code}`).emit("game:question", activeQ);
      }

      io.to(`room:${room.code}`).emit("game:buzz:answering", {
        teamId: buzz.teamId,
        teamName: buzz.teamName,
        timeLimit,
        attemptNumber: buzz.attemptNumber,
        maxAttempts: activeQ?.buzzMaxAttempts,
        multiplier: buzz.multiplier,
      });
      io.to(`room:${room.code}`).emit("game:timer:started", {
        timeLimit,
        endsAt: Date.now() + timeLimit * 1000,
        serverTime: Date.now(),
        questionId: currentQ.id,
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
      await openBouncebackStealWindow(io, room.id, room.code, currentQ.id);
    });

    // ── Admin: Bounceback Judge (Primary or Steal) ────────────────────────────
    socket.on("admin:bounceback:judge", async ({ isCorrect, code }) => {
      const room = await getAdminRoom(socket, code);
      if (!room || room.mode !== "BOUNCEBACK") return;

      const rawQuestions = room.quizBank?.questions ?? [];
      const activeQ = roomActiveQuestions.get(room.id);
      const q = (activeQ ? rawQuestions.find((item: any) => item.id === activeQ.question.id) : null) || rawQuestions[room.currentQuestion];
      if (!q) return;

      const qKey = `${room.id}:${q.id}`;
      if (roomQuestionProcessed.has(qKey)) return;

      const stealInfo = roomStealBuzzed.get(qKey);
      if (stealInfo) {
        // Áp dụng lên ĐỘI CƯỚP
        await finalizeBouncebackSteal(io, room.id, room.code, q.id, isCorrect);
      } else {
        // Áp dụng lên ĐỘI CHÍNH
        await finalizeBouncebackPrimary(io, room.id, room.code, q.id, isCorrect);
      }
    });

    // ── Admin: Bounceback Start Steal Answer (Manual Trigger) ─────────────────
    socket.on("admin:bounceback:start_steal_answer", async (payload?: { duration?: number }) => {
      const room = await getAdminRoom(socket);
      if (!room) return;

      const questions = await getRoomQuestions(room.id);
      const currentQ = questions[room.currentQuestion];
      if (!currentQ) return;
      await startStealAnsweringTimer(room.id, room.code, currentQ, payload?.duration);
    });

    // ── Bounceback Select Point Level (Olympia 10, 20, 30đ) ───────────────────
    const handleBouncebackPointSelect = async (roomId: string, points: 10 | 20 | 30) => {
      const room = await prisma.room.findUnique({
        where: { id: roomId },
        include: { quizBank: { include: { questions: { orderBy: { order: "asc" } } } }, teams: true },
      });
      if (!room || room.mode !== "BOUNCEBACK") return;

      const q = room.quizBank?.questions[room.currentQuestion];
      if (!q) return;
      const qKey = `${room.id}:${q.id}`;

      const validPoints: 10 | 20 | 30 = [10, 20, 30].includes(points) ? points : 20;
      const timeLimit = validPoints === 10 ? 15 : validPoints === 20 ? 20 : 30;
      roomBouncebackSelectedPoints.set(qKey, validPoints);

      const activeQ = roomActiveQuestions.get(room.id);
      const primary = roomPrimaryTeams.get(qKey);

      if (activeQ) {
        activeQ.bouncebackSelectPhase = false;
        activeQ.selectedPointLevel = validPoints;
        activeQ.timeLimit = timeLimit;
        activeQ.question.points = validPoints;
        activeQ.question.timeLimit = timeLimit;
        activeQ.timerPending = true; // Wait for MC to start timer manually!
        activeQ.timerStarted = false;
        activeQ.startedAt = Date.now();
        activeQ.endsAt = undefined;
      }

      // 1. Emit points selected notification to all clients
      io.to(`room:${room.code}`).emit("game:bounceback:points_selected", {
        teamId: primary?.teamId || "",
        points: validPoints,
        timeLimit,
      });

      // 2. Sau khi chọn điểm xong: MỚI ĐẾM 3s chuẩn bị!
      const teamsCount = (await prisma.team.count({ where: { roomId: room.id } })) || 4;
      const totalQuestionsCount = getTargetTotalQuestions(
        room.mode,
        room.config as any,
        teamsCount,
        room.quizBank?.questions?.length || 1
      );
      const preparePayload: GamePreparePayload = {
        questionIndex: room.currentQuestion,
        totalQuestions: totalQuestionsCount,
        points: validPoints,
        timeLimit,
        seconds: 3,
        bloomLevel: getBloomLevelFromPoints(validPoints),
        primaryTeamName: primary?.teamName,
      };
      io.to(`room:${room.code}`).emit("game:prepare", preparePayload);

      const launchQuestionAfterPrepare = () => {
        roomPrepareStates.delete(room.id);
        if (activeQ) {
          activeQ.timerPending = true;
          activeQ.timerStarted = false;
          io.to(`room:${room.code}`).emit("game:question", activeQ);
        }
      };

      const prepTimer = setTimeout(launchQuestionAfterPrepare, 3000);
      roomPrepareStates.set(room.id, {
        type: "PREPARE",
        questionIndex: room.currentQuestion,
        totalQuestions: totalQuestionsCount,
        targetTimestamp: Date.now() + 3000,
        timer: prepTimer,
        skipCallback: launchQuestionAfterPrepare,
        preparePayload,
      });
    };

    socket.on("game:bounceback:select_points", async ({ points }) => {
      const playerId = playerSockets.get(socket.id);
      if (!playerId) return;
      const player = await prisma.player.findUnique({ where: { id: playerId }, include: { room: true } });
      if (!player?.room) return;
      await handleBouncebackPointSelect(player.room.id, points as any);
    });

    socket.on("admin:bounceback:select_points", async ({ points }) => {
      const room = await getAdminRoom(socket);
      if (!room) return;
      await handleBouncebackPointSelect(room.id, points as any);
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

      // Khóa dùng thẻ ở 5s cuối câu hỏi để đảm bảo nhịp độ thi đấu
      const timerKey = `${room.id}:timer`;
      const curRem = roomRemainingTimes.get(timerKey);
      if (typeof curRem === "number" && curRem <= 5) {
        socket.emit("error", "Đã vào 5 giây đếm ngược cuối cùng, thẻ hỗ trợ đã bị khóa để đảm bảo nhịp độ thi đấu!");
        return;
      }

      if (room.mode === "MYSTERY_QUEST") {
        socket.emit("error", "Chế độ Hành Trình Bí Ẩn không hỗ trợ thẻ bổ trợ (Power-up)!");
        return;
      }

      if (room.mode === "BOUNCEBACK" && qKey) {
        if (roomStealPhase.get(qKey) || roomStealBuzzed.has(qKey)) {
          socket.emit("error", "Toàn bộ thẻ hỗ trợ (power-up) bị vô hiệu hoá trong lượt cướp điểm!");
          return;
        }
        const primary = roomPrimaryTeams.get(qKey);
        if (primary && player.teamId !== primary.teamId) {
          socket.emit("error", "Ở phần thi Về đích, chỉ đội chính mới được dùng thẻ hỗ trợ ở câu này!");
          return;
        }
        const activeQ = roomActiveQuestions.get(room.id);
        if (activeQ?.timerStarted) {
          socket.emit("error", "Ở phần thi Về đích, Ngôi sao hy vọng và thẻ hỗ trợ chỉ được kích hoạt trước khi bắt đầu đếm ngược!");
          return;
        }
      }

      if (room.mode === "BUZZ" && qKey) {
        const activeQ = roomActiveQuestions.get(room.id);
        if (roomBuzzFirst.has(qKey) || activeQ?.buzzedTeamId || activeQ?.timerStarted) {
          socket.emit("error", "Không thể dùng thẻ hỗ trợ sau khi chuông đã bấm hoặc thời gian trả lời đã bắt đầu!");
          return;
        }
      }

      // Fetch card from DB first (needed for type checks below)
      const card = await prisma.powerupCard.findUnique({ where: { id: cardId } });
      if (!card || card.used) {
        socket.emit("error", "Thẻ này đã được dùng hoặc không hợp lệ!");
        return;
      }
      if (card.ownerType === "TEAM" && card.teamId !== player.teamId) {
        socket.emit("error", "Thẻ này không thuộc về đội của bạn!");
        return;
      }

      if (room.teamMode === "TEAM" && qKey) {
        let teamCardsMap = roomQuestionTeamCards.get(qKey);
        if (!teamCardsMap) {
          teamCardsMap = new Map();
          roomQuestionTeamCards.set(qKey, teamCardsMap);
        }

        const existingCards = teamCardsMap.get(player.teamId) || [];
        if (existingCards.some((c) => c.type === card.type)) {
          socket.emit("error", `Đội của bạn đã kích hoạt thẻ ${CARD_METADATA[card.type as CardType]?.nameVi || card.type} ở câu hỏi này rồi!`);
          return;
        }

        // Quy tắc Mutex: Không được vừa dùng Khiên vừa dùng x2 điểm trong cùng một câu
        if (card.type === "SHIELD" && existingCards.some((c) => c.type === "SCORE_X2" || c.type === "DOUBLE")) {
          socket.emit("error", "Không thể vừa dùng Khiên Bảo Vệ vừa dùng Ngôi Sao Hy Vọng (x2 điểm) trong cùng một câu!");
          return;
        }
        if ((card.type === "SCORE_X2" || card.type === "DOUBLE") && existingCards.some((c) => c.type === "SHIELD")) {
          socket.emit("error", "Không thể vừa dùng Ngôi Sao Hy Vọng (x2 điểm) vừa dùng Khiên Bảo Vệ trong cùng một câu!");
          return;
        }
      }

      if (!isPowerupAllowedForMode(room.mode as any, card.type as any)) {
        socket.emit("error", `Thẻ ${CARD_METADATA[card.type as CardType]?.nameVi || card.type} không được phép sử dụng trong chế độ ${room.mode}!`);
        return;
      }

      if (isSharedPowerup(card.type as CardType)) {
        if (roomSharedPowerupUsedInQuestion.get(room.id)) {
          socket.emit("error", "Một đội khác đã kích hoạt thẻ dùng chung trong câu hỏi này rồi! Mỗi câu chỉ được dùng tối đa 1 thẻ dùng chung.");
          return;
        }
      }

      // Cơ chế chống 'Úp sọt' (Gang-up Protection): Miễn nhiễm 1 câu sau khi bị dính ATTACK, FREEZE hoặc PENALTY
      if ((card.type === "ATTACK" || card.type === "FREEZE" || card.type === "PENALTY") && targetTeamId) {
        const immunityKey = `${room.id}:${targetTeamId}`;
        const immuneUntilQ = roomTeamImmunity.get(immunityKey);
        if (immuneUntilQ !== undefined && immuneUntilQ >= room.currentQuestion) {
          socket.emit("error", "Đội này vừa bị tấn công và đang được kích hoạt Khiên miễn nhiễm bảo hộ trong câu hỏi này!");
          return;
        }
        // Thiết lập miễn nhiễm cho câu hỏi tiếp theo
        roomTeamImmunity.set(immunityKey, room.currentQuestion + 1);
      }

      await prisma.powerupCard.update({
        where: { id: cardId },
        data: { used: true, usedAt: new Date(), usedByTeamId: player.teamId },
      });

      if (room.teamMode === "TEAM" && qKey) {
        const teamCardsMap = roomQuestionTeamCards.get(qKey)!;
        const currentList = teamCardsMap.get(player.teamId) || [];
        currentList.push({
          cardId,
          type: card.type as CardType,
          usedByPlayerId: player.id,
          usedByPlayerName: player.name,
          teamId: player.teamId,
          targetTeamId,
          appliedAt: Date.now(),
        });
        teamCardsMap.set(player.teamId, currentList);
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
          const curEndsAt = roomTimerEndsAt.get(room.id) ?? (Date.now() + curRem * 1000);
          const newEndsAt = curEndsAt + 15000;
          roomTimerEndsAt.set(room.id, newEndsAt);
          io.to(`room:${room.code}`).emit("game:timer", {
            remaining: nextRem,
            total: (currentQ?.timeLimit ?? 30) + 15,
            endsAt: newEndsAt,
            serverTime: Date.now(),
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
          if (amount > 0 && player.teamId) {
            const leaderRes = await applyScoreDeltaToTeam(leader.id, -amount);
            const myRes = await applyScoreDeltaToTeam(player.teamId, amount);
            io.to(`room:${room.code}`).emit("game:score:update", [
              { teamId: leader.id, score: leaderRes.newScore, delta: leaderRes.effectiveDelta },
              { teamId: player.teamId, score: myRes.newScore, delta: myRes.effectiveDelta },
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

      if (isSharedPowerup(card.type as CardType)) {
        roomSharedPowerupUsedInQuestion.set(room.id, true);
        const activeQ = roomActiveQuestions.get(room.id);
        if (activeQ) {
          activeQ.hasSharedPowerupUsed = true;
        }
        io.to(`room:${room.code}`).emit("game:powerup:shared_locked", {
          cardType: card.type as CardType,
          usedByTeamId: player.teamId,
          usedByTeamName: player.team.name,
          questionIndex: room.currentQuestion,
        });
      }

      const state = await buildRoomState(room.id);
      io.to(`room:${room.code}`).emit("room:state", state);
    });

    async function startQuestionPrepareAndLaunch(
      room: any,
      questions: any[],
      questionIndex: number,
      specificQ?: any
    ) {
      stopQuestionTimer(room.id);
      roomRevealPayloads.delete(room.id);
      roomIntermissions.delete(room.id);
      if (roomIntermissionTimers.has(room.id)) {
        clearTimeout(roomIntermissionTimers.get(room.id)!);
        roomIntermissionTimers.delete(room.id);
      }
      io.to(`room:${room.code}`).emit("game:intermission", null);
      const existingPrepare = roomPrepareStates.get(room.id);
      if (existingPrepare?.timer) {
        clearTimeout(existingPrepare.timer);
      }
      roomPrepareStates.delete(room.id);

      const existingWagerTimer = roomWagerTimers.get(room.id);
      if (existingWagerTimer) {
        clearInterval(existingWagerTimer);
        clearTimeout(existingWagerTimer);
        roomWagerTimers.delete(room.id);
      }
      const existingWagerAutoTimer = roomWagerAutoLaunchTimers.get(room.id);
      if (existingWagerAutoTimer) {
        clearTimeout(existingWagerAutoTimer);
        roomWagerAutoLaunchTimers.delete(room.id);
      }

      const q = specificQ || questions[questionIndex];
      if (!q) return;

      // Đánh dấu câu hỏi đã được sử dụng trong phòng này để không bao giờ bị lặp lại
      let usedSet = roomUsedQuestions.get(room.id);
      if (!usedSet) {
        usedSet = new Set<string>();
        roomUsedQuestions.set(room.id, usedSet);
      }
      usedSet.add(q.id);

      const qKey = `${room.id}:${q.id}`;

      // Reset mode states for new question
      roomStealPhase.delete(qKey);
      roomStealBuzzed.delete(qKey);
      roomStealOpenedAt.delete(qKey);
      roomStealEndsAt.delete(qKey);
      roomBuzzFirst.delete(qKey);
      roomBuzzUnlocked.delete(qKey);
      roomBuzzWindowOpenedAt.delete(qKey);
      if (roomBuzzArbitration.has(qKey)) {
        clearTimeout(roomBuzzArbitration.get(qKey)!.timer);
        roomBuzzArbitration.delete(qKey);
      }
      if (roomBuzzDelayTimers.has(qKey)) {
        clearTimeout(roomBuzzDelayTimers.get(qKey)!);
        roomBuzzDelayTimers.delete(qKey);
      }
      roomQuestionProcessed.delete(qKey);
      roomQuestionScoresCache.delete(qKey);
      roomSharedPowerupUsedInQuestion.delete(room.id);

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
          diceState.canRollDice = false;
          diceState.dicePendingAnswer = true;
          io.to(`room:${room.code}`).emit("game:dice:update", diceState);
        }
      } else if (room.mode === "MYSTERY_QUEST") {
        const questState = roomMysteryQuests.get(room.id);
        if (questState) {
          primaryTeamId = questState.currentTurnTeamId;
          primaryTeamName = questState.currentTurnTeamName;
          // Crucial fix: question launch resets phase to QUESTION_ACTIVE so question card displays cleanly
          questState.phase = "QUESTION_ACTIVE";
          questState.potPoints = 0;
          questState.potMultiplier = 1;
          questState.bombExploded = undefined;
          questState.turnFinishedReason = undefined;
          questState.storyResult = undefined;
          questState.lastFlippedTile = undefined;
          roomMysteryQuests.set(room.id, questState);
          io.to(`room:${room.code}`).emit("game:mystery:update", questState);
        }
      }

      const config = room.config as any;

      let bouncebackSelectPhase = false;
      const chosenPoints: (10 | 20 | 30) | undefined = roomBouncebackSelectedPoints.get(qKey);

      if (room.mode === "BOUNCEBACK") {
        if (!chosenPoints) {
          bouncebackSelectPhase = true;
        } else {
          q.points = chosenPoints;
        }
      } else if (room.mode === "MYSTERY_QUEST") {
        const questState = roomMysteryQuests.get(room.id);
        const round = questState ? questState.currentRound : 1;
        q.points = round === 1 ? 10 : round === 2 ? 20 : 30;
      } else if (room.mode === "DICE_RACE") {
        const teamsCount = await prisma.team.count({ where: { roomId: room.id } }).catch(() => 4);
        const round = Math.floor((room.currentQuestion || 0) / Math.max(1, teamsCount)) + 1;
        q.points = round === 1 ? 10 : round === 2 ? 20 : 30;
      } else {
        q.points = normalizeToThreeLevels(q.points || 10);
      }

      const bloomLevel = getBloomLevelFromPoints(q.points);

      const launchQuestion = async () => {
        roomPrepareStates.delete(room.id);
        const buzzMode = room.mode === "BUZZ";
        const buzzUnlockMode = config?.autoTimerStart ? (config?.buzzUnlockMode ?? "AUTO") : "MANUAL";
        const buzzAutoDelay = Math.max(3, Number(config?.buzzAutoDelay) || 3);
        const buzzUnlocked = !buzzMode;
        roomBuzzUnlocked.set(qKey, buzzUnlocked);

        let buzzMaxAttempts: number | undefined = undefined;
        if (buzzMode) {
          const totalActors = room.teamMode === "TEAM"
            ? (await prisma.team.count({ where: { roomId: room.id } }))
            : (await prisma.player.count({ where: { roomId: room.id } }));
          buzzMaxAttempts = totalActors <= 2 ? 2 : 3;
          roomBuzzWindowRemaining.set(qKey, 5000);
          roomBuzzDisqualified.set(qKey, new Set<string>());
          roomBuzzAttemptOrder.set(qKey, []);
          roomBuzzFirst.delete(qKey);
          if (roomBuzzWindowTimers.has(qKey)) {
            clearTimeout(roomBuzzWindowTimers.get(qKey)!);
            roomBuzzWindowTimers.delete(qKey);
          }
        }

        const questionState = buildQuestionState(q, {
          primaryTeamId,
          primaryTeamName,
          bloomLevel,
          answerMethod: config?.answerMethod ?? "DEVICE",
          tournamentMatchId,
          gridCellId,
          diceRollValue,
          wagerPhase: room.mode === "WAGER" ? "QUESTION_PERIOD" : undefined,
          buzzUnlockMode,
          buzzAutoDelaySeconds: buzzAutoDelay,
          buzzUnlocked,
          canRollDice: false,
          bouncebackSelectPhase,
          selectedPointLevel: chosenPoints,
          streakCount: primaryTeamId ? (teamStreakMap.get(primaryTeamId) || 0) : undefined,
          answerSubmissionMode: config?.answerSubmissionMode || "ALLOW_CHANGE",
        });

        if (room.mode === "CLASSIC" && !roomGoldQuestions.has(room.id)) {
          const goldSet = selectGoldQuestions(questions);
          roomGoldQuestions.set(room.id, goldSet);
        }
        questionState.isGoldQuestion = room.mode === "CLASSIC" && Boolean(roomGoldQuestions.get(room.id)?.has(q.id));

        if (buzzMode) {
          questionState.buzzAttemptNumber = 1;
          questionState.buzzMaxAttempts = buzzMaxAttempts;
          questionState.buzzDisqualifiedTeamIds = [];
        }

        const isDeviceAnswer = (config?.answerMethod ?? "DEVICE") === "DEVICE";
        const standardTimeLimit = getStandardQuestionTimeLimit(q, chosenPoints);
        questionState.timeLimit = standardTimeLimit;
        questionState.question.timeLimit = standardTimeLimit;

        // Đếm ngược thủ công (Manual Timer) mặc định cho TẤT CẢ các mode
        // Chỉ tự động đếm ngay nếu config.autoTimerStart === true và không phải giai đoạn chọn điểm Bounceback
        const isAutoTimer = config?.autoTimerStart === true && !bouncebackSelectPhase;
        if (!isAutoTimer) {
          questionState.timerPending = true;
          questionState.timerStarted = false;
          roomActiveQuestions.set(room.id, questionState);
          io.to(`room:${room.code}`).emit("game:question", questionState);
        } else {
          if (buzzMode) {
            questionState.timerPending = true;
            questionState.timerStarted = false;
            roomActiveQuestions.set(room.id, questionState);
            io.to(`room:${room.code}`).emit("game:question", questionState);

            const autoTimer = setTimeout(async () => {
              roomBuzzDelayTimers.delete(qKey);
              await openBuzzWindow(io, room.id, room.code, q.id);
            }, buzzAutoDelay * 1000);
            roomBuzzDelayTimers.set(qKey, autoTimer);
          } else {
            const endsAt = Date.now() + standardTimeLimit * 1000;
            questionState.timerPending = false;
            questionState.timerStarted = true;
            questionState.endsAt = endsAt;
            questionState.serverTime = Date.now();
            roomActiveQuestions.set(room.id, questionState);
            io.to(`room:${room.code}`).emit("game:question", questionState);
            startQuestionTimer(io, room.code, room.id, q.id, standardTimeLimit);
          }
        }

        io.to(`room:${room.code}:admin`).emit("admin:question:data", {
          questionId: q.id,
          options: q.options,
          answer: q.answer,
          type: q.type,
          explanation: q.hint || (q as any).explanation,
        });
      };

      if (room.mode === "WAGER") {
        roomActiveQuestions.delete(room.id);
        io.to(`room:${room.code}`).emit("game:question:clear");
        const teams = await prisma.team.findMany({ where: { roomId: room.id } });
        const initialWagers: Record<string, TeamWager> = {};
        teams.forEach((t) => {
          initialWagers[t.id] = { teamId: t.id, teamName: t.name, amount: 10, submitted: false };
        });

        const prevWagerState = roomWagers.get(room.id);
        const prevWagerTeamId = prevWagerState?.lastWagerTeamId;
        const bailoutMax = config?.wagerBailoutLimit ?? 1;
        const teamBailouts = prevWagerState?.teamBailouts ?? {};
        teams.forEach((t) => {
          if (!teamBailouts[t.id]) {
            teamBailouts[t.id] = { remaining: bailoutMax, max: bailoutMax };
          }
        });

        const teamsCount = Math.max(1, teams.length);
        const wagerRounds = config?.wagerRoundsPerTeam || 2;
        const currentRoundIdx = Math.floor(questionIndex / teamsCount);
        const wagerMultCap = Math.max(1.0, Math.min(3.0, Number(config?.wagerMultiplierCap) || 2.5));
        const basePts = q.points || 10;
        const calculatedMaxBetCap = Math.floor(basePts * wagerMultCap);

        const wagerState: WagerState = {
          phase: "WAGER_PERIOD",
          wagerSubPhase: "INITIAL_5S",
          wagerTimeRemaining: 5,
          wagerTimeTotal: 5,
          minWager: 5,
          currentHighestWager: 0,
          lastWagerTeamId: undefined,
          previousQuestionWagerTeamId: prevWagerTeamId,
          autoAssignedTeamName: undefined,
          questionReady: false,
          wagerHistory: [],
          allowanceMinScore: config?.wagerMinAllowance || 50,
          initialPoints: config?.wagerInitialPoints || 50,
          topicPreview: getBroadTopic({
            topic: (q as any).topic,
            content: q.content,
            bankTitle: room.quizBank?.title || (q as any).quizBank?.title,
          }),
          difficultyPreview: bloomLevel,
          teamWagers: initialWagers,
          teamBailouts,
          bailoutQueue: prevWagerState?.bailoutQueue ?? [],
          currentQuestionBailoutUsed: false,
          maxBetCap: calculatedMaxBetCap,
          wagerMultiplierCap: wagerMultCap,
          baseQuestionPoints: basePts,
          roundIndex: currentRoundIdx,
          totalRounds: wagerRounds,
        };
        roomWagers.set(room.id, wagerState);
        io.to(`room:${room.code}`).emit("game:wager:update", wagerState);

        let initRem = 5;
        const initTimer = setInterval(async () => {
          initRem--;
          wagerState.wagerTimeRemaining = initRem;
          if (initRem <= 0) {
            clearInterval(initTimer);
            roomWagerTimers.delete(room.id);

            // Nếu không ai tự cược trong 5s, hệ thống chọn theo luật luân phiên (round-robin)
            if (!wagerState.lastWagerTeamId || wagerState.wagerHistory.length === 0) {
              const activeTeams = teams.filter((t) => !t.isEliminated);
              // Lọc bỏ đội đã cược ở câu trước để đảm bảo công bằng (không cược 2 câu liên tiếp)
              const eligibleTeams = prevWagerTeamId && activeTeams.filter((t) => t.id !== prevWagerTeamId).length > 0
                ? activeTeams.filter((t) => t.id !== prevWagerTeamId)
                : activeTeams;

              // Round-robin opening assignment: câu 1 đội 1, câu 2 đội 2, câu 3 đội 3...
              const roundRobinIndex = questionIndex % eligibleTeams.length;
              const pickedTeam = eligibleTeams[roundRobinIndex] || activeTeams[0];
              const assignedWager = pickedTeam && pickedTeam.score < 10 ? Math.min(5, pickedTeam.score > 0 ? pickedTeam.score : 5) : 10;

              if (pickedTeam) {
                wagerState.currentHighestWager = assignedWager;
                wagerState.lastWagerTeamId = pickedTeam.id;
                wagerState.autoAssignedTeamId = pickedTeam.id;
                wagerState.autoAssignedTeamName = pickedTeam.name;
                wagerState.wagerHistory = [{
                  order: 1,
                  teamId: pickedTeam.id,
                  teamName: pickedTeam.name,
                  teamColor: pickedTeam.color,
                  amount: assignedWager,
                  timestamp: Date.now(),
                }];
                wagerState.teamWagers[pickedTeam.id] = {
                  teamId: pickedTeam.id,
                  teamName: pickedTeam.name,
                  amount: assignedWager,
                  submitted: true,
                  order: 1,
                };
              }
            }

            const nextMin = (wagerState.currentHighestWager || 10) + 5;
            const canAnyBet = checkCanAnyTeamBet(teams, wagerState, nextMin);
            if (!canAnyBet) {
              // Không còn đội nào đủ điều kiện nâng cược: Tự động chốt cược ngay lập tức!
              await lockWagerAndScheduleAutoLaunch(io, room.id, room.code, wagerState);
            } else {
              // Đếm tiếp thời gian cho các đội kế tiếp cược (theo cấu hình hoặc mặc định 15s)
              const wagerDuration = (room.config as any)?.wagerTimeSeconds || 15;
              startWager15sCountdown(io, room.id, room.code, wagerDuration);
            }
          } else {
            io.to(`room:${room.code}`).emit("game:wager:update", wagerState);
          }
        }, 1000);
        roomWagerTimers.set(room.id, initTimer);
        return;
      }

      if (room.mode === "BOUNCEBACK" && bouncebackSelectPhase) {
        // Sau 5s khởi động hoặc khi chuyển câu, đội chính chọn luôn mức điểm (10, 20, 30đ) mà KHÔNG đếm 3s trước đó.
        // Sau khi đội chính chọn mức điểm xong thì mới đếm 3s chuẩn bị!
        await launchQuestion();
        return;
      }

      // Launch question directly without 3s artificial countdown!
      await launchQuestion();
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
        if (room.mode === "MYSTERY_QUEST" || !config?.powerupEnabled) return;

        const allowed = (config.allowedPowerups as CardType[]) || [
          "FIFTY_FIFTY", "DOUBLE", "FREEZE", "ATTACK", "SKIP", "TIME_PLUS", "SHIELD", "STEAL", "PENALTY", "SCORE_X2"
        ];
        if (allowed.length === 0) return;

        const initialCount = config.powerupCountPerTeam || 2;
        const sharedAllowed = allowed.filter((t) => isSharedPowerup(t));
        const privateAllowed = allowed.filter((t) => !isSharedPowerup(t));
        const safePrivatePool = privateAllowed.length > 0 ? privateAllowed : allowed;

        const sharedQuota = config.sharedPowerupTeamQuota ?? (room.teams.length <= 3 ? 1 : 2);
        const sharedProbability = config.sharedPowerupProbability ?? DEFAULT_SHARED_POWERUP_PROBABILITY;

        // Count how many teams currently have an active unused shared card
        const teamsWithShared = new Set(
          room.teams
            .filter((t) => t.powerupCards.some((c) => !c.used && isSharedPowerup(c.type as CardType)))
            .map((t) => t.id)
        );

        // Teams that currently need cards
        const teamsNeedingCards = room.teams.filter((t) => {
          const activeUnused = t.powerupCards.filter((c) => !c.used).length;
          return activeUnused < initialCount;
        });

        // How many more teams can receive a shared card?
        const slotsForShared = Math.max(0, sharedQuota - teamsWithShared.size);
        const candidatesForShared = teamsNeedingCards.filter((t) => !teamsWithShared.has(t.id));
        const luckyTeams = new Set<string>();

        if (slotsForShared > 0 && sharedAllowed.length > 0 && candidatesForShared.length > 0) {
          const shuffledCandidates = [...candidatesForShared].sort(() => Math.random() - 0.5);
          for (const cand of shuffledCandidates) {
            if (luckyTeams.size >= slotsForShared) break;
            if (Math.random() < sharedProbability) {
              luckyTeams.add(cand.id);
            }
          }
        }

        let addedAny = false;

        for (const team of room.teams) {
          const activeUnused = team.powerupCards.filter((c) => !c.used).length;
          const need = Math.max(0, initialCount - activeUnused);
          if (need <= 0) continue;

          let giveShared = luckyTeams.has(team.id) && sharedAllowed.length > 0;

          for (let i = 0; i < need; i++) {
            let cardTypeToGive: CardType;
            if (giveShared) {
              cardTypeToGive = sharedAllowed[Math.floor(Math.random() * sharedAllowed.length)];
              giveShared = false; // Only 1 shared card per team!
            } else {
              cardTypeToGive = safePrivatePool[Math.floor(Math.random() * safePrivatePool.length)];
            }

            await prisma.powerupCard.create({
              data: {
                type: cardTypeToGive as any,
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
        if (room.mode === "MYSTERY_QUEST" || !config?.powerupEnabled) return;

        const allowed = (config.allowedPowerups as CardType[]) || [
          "FIFTY_FIFTY", "DOUBLE", "FREEZE", "ATTACK", "SKIP", "TIME_PLUS", "SHIELD", "STEAL", "PENALTY", "SCORE_X2"
        ];
        if (allowed.length === 0) return;

        const maxHand = config.maxHandSize || 3;
        const sharedQuota = config.sharedPowerupTeamQuota ?? (room.teams.length <= 3 ? 1 : 2);
        const sharedProbability = config.sharedPowerupProbability ?? DEFAULT_SHARED_POWERUP_PROBABILITY;

        const sharedAllowed = allowed.filter((t) => isSharedPowerup(t));
        const privateAllowed = allowed.filter((t) => !isSharedPowerup(t));
        const safePrivatePool = privateAllowed.length > 0 ? privateAllowed : allowed;

        // Count how many teams currently have an active unused shared card
        let currentSharedTeamCount = room.teams.filter((t) =>
          !t.isEliminated && t.powerupCards.some((c) => !c.used && isSharedPowerup(c.type as CardType))
        ).length;

        let addedAny = false;

        for (const team of room.teams) {
          if (team.isEliminated) continue;
          const activeUnused = team.powerupCards.filter((c) => !c.used).length;
          if (activeUnused < maxHand) {
            // Check if team is eligible for a rare shared card drop
            const hasShared = team.powerupCards.some((c) => !c.used && isSharedPowerup(c.type as CardType));
            let cardTypeToGive: CardType;

            if (
              !hasShared &&
              currentSharedTeamCount < sharedQuota &&
              sharedAllowed.length > 0 &&
              Math.random() < sharedProbability
            ) {
              cardTypeToGive = sharedAllowed[Math.floor(Math.random() * sharedAllowed.length)];
              currentSharedTeamCount++;
            } else {
              cardTypeToGive = safePrivatePool[Math.floor(Math.random() * safePrivatePool.length)];
            }

            await prisma.powerupCard.create({
              data: {
                type: cardTypeToGive as any,
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
    socket.on("admin:next", async (payload?: { code?: string }) => {
      const room = await getAdminRoom(socket, payload?.code);
      if (!room) {
        console.warn(`[admin:next] Unable to find admin room for socket ${socket.id}, payload:`, payload);
        return;
      }

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

      let questions = room.quizBank?.questions ?? [];
      if (questions.length === 0) {
        questions = await getRoomQuestions(room.id);
        if (room.quizBank) {
          room.quizBank.questions = questions;
        }
      }

      if (questions.length === 0) {
        socket.emit("error", "Phòng chưa có câu hỏi nào! Vui lòng chọn bộ đề câu hỏi trước khi bắt đầu.");
        return;
      }

      if (room.status === "LOBBY") {
        // 1. Broadcast game:starting immediately (0ms latency so clients start countdown instantly)
        io.to(`room:${room.code}`).emit("game:starting", { seconds: 5 });

        room.currentQuestion = 0;
        room.status = "PLAYING";
        roomCache.set(room.id, room);
        await prisma.room.update({ where: { id: room.id }, data: { currentQuestion: 0, status: "PLAYING" } }).catch(console.error);

        // Ensure 2 initial cards distributed per team
        ensureInitialTeamPowerups(room.id, io).catch(console.error);

        // Mode Initializations
        const teams = await prisma.team.findMany({ where: { roomId: room.id }, orderBy: { createdAt: "asc" } });
        const config = room.config as any;

        // Auto allocate questions based on matchMaxQuestions and mode
        const targetQCount = config?.matchMaxQuestions && config.matchMaxQuestions > 0 ? config.matchMaxQuestions : undefined;
        const allocation = allocateQuestionsForMatch({
          questions,
          targetCount: targetQCount,
          mode: room.mode as GameMode,
          teamsCount: teams.length,
          options: {
            eliminationStages: config?.eliminationRounds,
            bouncebackQuestionsPerTurn: config?.bouncebackQuestionsPerTurn,
            tournamentQuestionsPerMatch: config?.tournamentQuestionsPerMatch,
          },
        });

        questions = allocation.allocatedQuestions;
        roomQuestionsCache.set(room.id, questions);
        if (room.quizBank) {
          room.quizBank.questions = questions;
        }

        if (allocation.derivedConfig) {
          Object.assign(config, allocation.derivedConfig);
          room.config = config;
          prisma.room.update({ where: { id: room.id }, data: { config } }).catch(console.error);
        }

        if (room.mode === "CLASSIC") {
          const goldSet = selectGoldQuestions(questions);
          roomGoldQuestions.set(room.id, goldSet);
        } else if (room.mode === "TOURNAMENT") {
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

          // 3 mức điểm chuẩn hoá cho GRID_CARO: 10đ (Dễ), 20đ (Trung bình), 30đ (Khó)
          const pointPalette: (10 | 20 | 30)[] = [10, 20, 30];

          const cells: GridCell[] = [];
          for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
              const cellId = r * cols + c + 1;
              const pts = pointPalette[(r * cols + c) % pointPalette.length];
              const diff: "DỄ" | "TRUNG BÌNH" | "KHÓ" =
                pts === 10 ? "DỄ" : pts === 20 ? "TRUNG BÌNH" : "KHÓ";

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
          const configuredTiles = config?.diceTrackTotalTiles || 60;
          const totalTiles = Math.min(100, Math.max(60, configuredTiles));
          const tiles = generateBalancedDiceTiles(totalTiles);
          const teamPositions: Record<string, TeamRaceProgress> = {};
          for (const t of teams) {
            // Điểm số mặc định tính theo vị trí ô: ô xuất phát #1 tương ứng 1 điểm (thấp nhất là 1 điểm)
            await prisma.team.update({
              where: { id: t.id },
              data: { score: 1 },
            }).catch(console.error);
            t.score = 1;
            teamPositions[t.id] = {
              teamId: t.id,
              teamName: t.name,
              teamColor: t.color,
              position: 0,
              hasFinished: false,
            };
          }

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
        } else if (room.mode === "MYSTERY_QUEST") {
          const turnsPerTeam = config?.mysteryQuestTurnsPerTeam || 2;
          const fallbackTeam = { id: "t1", name: "Đội 1", color: "#ef4444", score: 0 };
          const activeTeams = teams.length > 0 ? teams : [fallbackTeam];
          const questState = generateMysteryStageForTurn({
            turnIndex: 0,
            currentTeam: activeTeams[0],
            teams: activeTeams,
            turnsPerTeam,
          });
          roomMysteryQuests.set(room.id, questState);
        } else if (room.mode !== "DICE_RACE" && config?.initialTeamScore && config.initialTeamScore > 0) {
          const initScore = Math.max(0, config.initialTeamScore);
          for (const team of teams) {
            if (team.score === 0) {
              await prisma.team.update({
                where: { id: team.id },
                data: { score: initScore },
              });
              team.score = initScore;
            }
          }
        }

        const updatedState = await buildRoomState(room.id);
        io.to(`room:${room.code}`).emit("room:state", updatedState);

        if (room.mode === "MYSTERY_QUEST") {
          const questState = roomMysteryQuests.get(room.id);
          if (questState) {
            io.to(`room:${room.code}`).emit("game:mystery:update", questState);
          }
        }

        if (room.mode === "GRID_CARO") {
          // Board-based mode waits for turn player's cell selection
          startGridCaroPreview(io, room.id, room.code, config?.gridPreviewDuration || 5);
          return;
        }

        if (room.mode === "DICE_RACE") {
          // Bắt đầu game: Hiện bàn cờ đường đua trước toàn màn hình.
          // Chỉ khi admin nhấn 'Hiện câu hỏi' thì mới đếm ngược và lộ câu hỏi.
          const diceState = roomDiceRaces.get(room.id);
          if (diceState) {
            io.to(`room:${room.code}`).emit("game:dice:update", diceState);
          }
          return;
        }

        const launchWarmupToFirstQuestion = async () => {
          try {
            roomPrepareStates.delete(room.id);
            const firstRoundTargetPoints = (room.mode === "MYSTERY_QUEST" || room.mode === "DICE_RACE") ? 10 : undefined;
            const nextQ = getNextUniqueQuestion(room.id, questions, 0, firstRoundTargetPoints);
            if (nextQ) {
              room.currentQuestion = nextQ.index;
              room.status = "PLAYING";
              roomCache.set(room.id, room);
              await prisma.room.update({
                where: { id: room.id },
                data: { currentQuestion: nextQ.index, status: "PLAYING" },
              }).catch(console.error);

              await startQuestionPrepareAndLaunch(room, questions, nextQ.index, nextQ.question);

              const refreshedState = await buildRoomState(room.id);
              io.to(`room:${room.code}`).emit("room:state", refreshedState);

              if (room.mode === "MYSTERY_QUEST") {
                const questState = roomMysteryQuests.get(room.id);
                if (questState) {
                  io.to(`room:${room.code}`).emit("game:mystery:update", questState);
                }
              }
            } else {
              console.warn(`[launchWarmupToFirstQuestion] No next question available in room ${room.code}`);
            }
          } catch (err) {
            console.error("[launchWarmupToFirstQuestion] Error:", err);
          }
        };

        const timer = setTimeout(() => {
          launchWarmupToFirstQuestion();
        }, 5000);

        const targetStartingQuestions = getTargetTotalQuestions(
          room.mode,
          config,
          teams.length,
          questions.length
        );

        roomPrepareStates.set(room.id, {
          type: "STARTING",
          questionIndex: 0,
          totalQuestions: targetStartingQuestions,
          targetTimestamp: Date.now() + 5000,
          timer,
          skipCallback: launchWarmupToFirstQuestion,
        });
        return;
      }

      if (room.mode === "GRID_CARO") {
        await advanceGridToBoard(io, room.id, room.code);
        return;
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
        }
      }

      // Kiểm tra giới hạn số câu hỏi của trận đấu theo luật thi đấu
      const config = room.config as any;
      const targetQuestions = getTargetTotalQuestions(
        room.mode,
        config,
        (await prisma.team.count({ where: { roomId: room.id } })) || 4,
        questions.length
      );

      const usedCount = roomUsedQuestions.get(room.id)?.size ?? 0;
      if (usedCount >= targetQuestions) {
        stopQuestionTimer(room.id);
        room.status = "FINISHED";
        roomCache.set(room.id, room);
        prisma.room.update({ where: { id: room.id }, data: { status: "FINISHED", endedAt: new Date() } }).catch(console.error);
        const leaderboard = await buildLeaderboard(room.id);
        io.to(`room:${room.code}`).emit("game:ended", { leaderboard });
        return;
      }

      // Lấy câu hỏi độc nhất tiếp theo (đồng nhất điểm theo vòng ở các mode theo lượt)
      let targetRoundPoints: number | undefined = undefined;
      if (room.mode === "MYSTERY_QUEST") {
        const questState = roomMysteryQuests.get(room.id);
        const round = questState ? questState.currentRound : 1;
        targetRoundPoints = round === 1 ? 10 : round === 2 ? 20 : 30;
      } else if (room.mode === "DICE_RACE") {
        const teamsCount = await prisma.team.count({ where: { roomId: room.id } }).catch(() => 4);
        const round = Math.floor((room.currentQuestion || 0) / Math.max(1, teamsCount)) + 1;
        targetRoundPoints = round === 1 ? 10 : round === 2 ? 20 : 30;
      }
      const nextQ = getNextUniqueQuestion(room.id, questions, undefined, targetRoundPoints);
      if (!nextQ) {
        stopQuestionTimer(room.id);
        room.status = "FINISHED";
        roomCache.set(room.id, room);
        prisma.room.update({ where: { id: room.id }, data: { status: "FINISHED", endedAt: new Date() } }).catch(console.error);
        const leaderboard = await buildLeaderboard(room.id);
        io.to(`room:${room.code}`).emit("game:ended", { leaderboard });
        return;
      }

      const nextIndex = nextQ.index;

      // Nếu đang ở màn hình Bảng xếp hạng giữa hiệp (Intermission):
      // Bấm nút sẽ vào thẳng câu hỏi tiếp theo NGAY LẬP TỨC (0s delay)!
      if (roomIntermissions.has(room.id)) {
        if (roomIntermissionTimers.has(room.id)) {
          clearTimeout(roomIntermissionTimers.get(room.id)!);
          roomIntermissionTimers.delete(room.id);
        }
        roomIntermissions.delete(room.id);
        io.to(`room:${room.code}`).emit("game:intermission", null);

        room.currentQuestion = nextIndex;
        room.status = "PLAYING";
        roomCache.set(room.id, room);
        await prisma.room.update({ where: { id: room.id }, data: { currentQuestion: nextIndex, status: "PLAYING" } }).catch(console.error);

        // Multi-round replenish: Replenish +1 card for each team with < 3 cards every 3 questions
        if (nextIndex > 0 && nextIndex % 3 === 0) {
          replenishTeamPowerups(room.id, io).catch(console.error);
        }

        await startQuestionPrepareAndLaunch(room, questions, nextIndex, nextQ.question);
        return;
      }

      // Nếu đang trong câu hỏi hoặc vừa công bố đáp án xong:
      // Chuyển qua màn hình Bảng xếp hạng giữa hiệp (Leaderboard Intermission)
      stopQuestionTimer(room.id);
      roomActiveQuestions.delete(room.id);

      const intermissionPayload: GameIntermissionPayload = {
        nextQuestionIndex: nextIndex,
        totalQuestions: targetQuestions,
        previousQuestionIndex: room.currentQuestion,
        titleVi: `BẢNG XẾP HẠNG SAU CÂU #${(room.currentQuestion ?? 0) + 1}`,
        countdownSeconds: 3,
      };
      roomIntermissions.set(room.id, intermissionPayload);

      io.to(`room:${room.code}`).emit("game:intermission", intermissionPayload);
      io.to(`room:${room.code}`).emit("game:question:clear");

      // Auto-advance to next question after 3s leaderboard countdown
      if (roomIntermissionTimers.has(room.id)) {
        clearTimeout(roomIntermissionTimers.get(room.id)!);
      }
      const autoTimer = setTimeout(async () => {
        if (!roomIntermissions.has(room.id)) return;
        roomIntermissions.delete(room.id);
        roomIntermissionTimers.delete(room.id);
        io.to(`room:${room.code}`).emit("game:intermission", null);

        room.currentQuestion = nextIndex;
        room.status = "PLAYING";
        roomCache.set(room.id, room);
        await prisma.room.update({ where: { id: room.id }, data: { currentQuestion: nextIndex, status: "PLAYING" } }).catch(console.error);

        if (nextIndex > 0 && nextIndex % 3 === 0) {
          replenishTeamPowerups(room.id, io).catch(console.error);
        }

        await startQuestionPrepareAndLaunch(room, questions, nextIndex, nextQ.question);
      }, 3000);
      roomIntermissionTimers.set(room.id, autoTimer);
    });

    socket.on("admin:skip:prepare", async (payload?: { code?: string }) => {
      const room = await getAdminRoom(socket, payload?.code);
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

    socket.on("admin:pause", async (payload?: { code?: string }) => {
      const room = await getAdminRoom(socket, payload?.code);
      if (!room) return;
      if (roomPrepareStates.has(room.id)) {
        const prep = roomPrepareStates.get(room.id);
        if (prep?.timer) clearTimeout(prep.timer);
      }
      await prisma.room.update({ where: { id: room.id }, data: { status: "PAUSED" } });
      io.to(`room:${room.code}`).emit("game:paused");
    });

    socket.on("admin:resume", async (payload?: { code?: string }) => {
      const room = await getAdminRoom(socket, payload?.code);
      if (!room) return;
      await prisma.room.update({ where: { id: room.id }, data: { status: "PLAYING" } });
      io.to(`room:${room.code}`).emit("game:resumed");
    });

    socket.on("admin:reveal", async (payload?: { code?: string }) => {
      const room = await getAdminRoom(socket, payload?.code);
      if (!room) {
        console.warn(`[admin:reveal] Unable to find admin room for socket ${socket.id}, payload:`, payload);
        return;
      }

      const activeQ = roomActiveQuestions.get(room.id);
      const rawQuestions = room.quizBank?.questions ?? [];
      const q = (activeQ ? rawQuestions.find((item: any) => item.id === activeQ.question.id) : null) || rawQuestions[room.currentQuestion];
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
        const pRes = await applyScoreDeltaToPlayer(answer.playerId, points);
        io.to(`room:${room.code}`).emit("game:score:update", [
          { playerId: answer.playerId, score: pRes.newScore, delta: pRes.effectiveDelta },
        ]);
      }
      if (answer.teamId) {
        const tRes = await applyScoreDeltaToTeam(answer.teamId, points);
        io.to(`room:${room.code}`).emit("game:score:update", [
          { teamId: answer.teamId, score: tRes.newScore, delta: tRes.effectiveDelta },
        ]);
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
      gridState.questionReady = false;

      const currentTeam = room.teams?.find((t: any) => t.id === gridState.currentTurnTeamId);
      gridState.selectedCellInfo = {
        cellId: cell.id,
        points: cell.points,
        difficulty: cell.difficulty,
        teamId: gridState.currentTurnTeamId,
        teamName: currentTeam?.name || gridState.currentTurnTeamName || "Thí sinh",
        teamColor: currentTeam?.color,
      };

      io.to(`room:${room.code}`).emit("game:grid:update", gridState);

      let usedSet = roomUsedQuestions.get(room.id);
      if (!usedSet) {
        usedSet = new Set<string>();
        roomUsedQuestions.set(room.id, usedSet);
      }

      const rawQuestions = room.quizBank?.questions ?? [];
      // Ưu tiên câu hỏi chưa dùng có điểm chuẩn hoá khớp với điểm của ô
      let targetQ = rawQuestions.find((q: any) => !usedSet!.has(q.id) && normalizeToThreeLevels(q.points) === cell.points);
      if (!targetQ) {
        targetQ = rawQuestions.find((q: any) => !usedSet!.has(q.id));
      }
      if (!targetQ) {
        // Theo quy tắc: Hết câu hỏi mà chưa ai thắng hoặc không dùng hết ô -> Dừng luôn cuộc chơi và tính hạng luôn
        gridState.selectedCellAnimation = false;
        io.to(`room:${room.code}`).emit("game:grid:update", gridState);
        room.status = "FINISHED";
        await prisma.room.update({ where: { id: room.id }, data: { status: "FINISHED", endedAt: new Date() } }).catch(console.error);
        const leaderboard = await buildLeaderboard(room.id);
        io.to(`room:${room.code}`).emit("game:ended", { leaderboard });
        return;
      }

      usedSet.add(targetQ.id);
      targetQ.points = cell.points; // Đảm bảo điểm câu hỏi chuẩn hoá khớp chính xác ô đã chọn
      cell.questionId = targetQ.id;

      const qIndex = rawQuestions.findIndex((q: any) => q.id === targetQ!.id);
      room.currentQuestion = qIndex >= 0 ? qIndex : 0;
      await prisma.room.update({
        where: { id: room.id },
        data: { currentQuestion: room.currentQuestion },
      }).catch(console.error);
      roomCache.delete(room.id);

      // 1.5-second 3D flip animation completes, staying on board for Admin to click "Hiện câu hỏi"
      setTimeout(() => {
        gridState.selectedCellAnimation = false;
        io.to(`room:${room.code}`).emit("game:grid:update", gridState);
      }, 1500);
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
    async function executeDiceRoll(room: any, diceState: DiceRaceState, teamId: string) {
      const teamProg = diceState.teamPositions[teamId];
      if (!teamProg) return;

      const d1 = Math.floor(Math.random() * 6) + 1;
      const d2 = Math.floor(Math.random() * 6) + 1;
      const roll = d1 + d2;
      diceState.lastDiceRoll = roll;
      diceState.lastDiceValues = [d1, d2];
      diceState.rollTimestamp = Date.now();

      const landingResult = handleDiceRaceLanding({ diceState, teamId, roll });
      const newPos = landingResult.finalPosition;
      const grantAnotherRoll = landingResult.grantAnotherRoll;

      teamProg.position = newPos;
      teamProg.hasShield = landingResult.hasShield;

      // Đồng bộ điểm đội theo vị trí ô để hiển thị trên UI nhất quán (thấp nhất là 1 điểm ở ô xuất phát #1)
      const newScore = newPos + 1;
      await prisma.team.update({
        where: { id: teamId },
        data: { score: newScore },
      }).catch(console.error);

      io.to(`room:${room.code}`).emit("game:score:update", [{ teamId, score: newScore, delta: roll }]);

      io.to(`room:${room.code}`).emit("game:dice:rolled", {
        teamId,
        teamName: teamProg.teamName,
        roll,
        diceValues: [d1, d2],
      });

      // Log/message if special effect or teleport triggered
      if (landingResult.effectMessage) {
        console.log(`[DiceRace] ${teamProg.teamName}: ${landingResult.effectMessage}`);
      }

      // Kiểm tra cán đích
      if (newPos >= diceState.totalTiles - 1 && !teamProg.hasFinished) {
        teamProg.hasFinished = true;
        if (!diceState.finishLeaderboard.includes(teamProg.teamName)) {
          diceState.finishLeaderboard.push(teamProg.teamName);
        }
        teamProg.finishRank = diceState.finishLeaderboard.length;
        io.to(`room:${room.code}`).emit("game:dice:update", diceState);

        // Đội đầu tiên cán đích sẽ kết thúc trận đấu và giành chiến thắng ngay lập tức
        await prisma.room.update({ where: { id: room.id }, data: { status: "FINISHED", endedAt: new Date() } });
        const leaderboard = await buildLeaderboard(room.id);
        io.to(`room:${room.code}`).emit("game:ended", { leaderboard });
        return;
      }

      if (grantAnotherRoll) {
        // Ô x2 Cơ hội: được thêm 1 lần gieo nữa trước khi chuyển lượt (không mất lượt, được gieo tiếp ngay)
        diceState.canRollDice = true;
        diceState.dicePendingAnswer = false;
        diceState.extraRollGranted = true;
        teamProg.extraRollGranted = true;
      } else {
        diceState.extraRollGranted = false;
        teamProg.extraRollGranted = false;
        diceState.dicePendingAnswer = false;

        const teams = await prisma.team.findMany({ where: { roomId: room.id }, orderBy: { createdAt: "asc" } });
        if (teams.length > 0) {
          const curIdx = teams.findIndex((t) => t.id === teamId);
          const nextIdx = (curIdx + 1) % teams.length;
          diceState.currentTurnTeamId = teams[nextIdx].id;
          diceState.currentTurnTeamName = teams[nextIdx].name;
        }

        diceState.canRollDice = false;
      }

      io.to(`room:${room.code}`).emit("game:dice:update", diceState);
    }

    socket.on("game:dice:roll", async () => {
      const playerId = playerSockets.get(socket.id);
      if (!playerId) return;
      const player = await prisma.player.findUnique({
        where: { id: playerId },
        include: { room: true },
      });
      if (!player || !player.room || !player.teamId) return;

      const room = player.room;
      if (room.mode !== "DICE_RACE" || room.status !== "PLAYING") return;

      const diceState = roomDiceRaces.get(room.id);
      if (!diceState || !diceState.canRollDice) {
        socket.emit("error", "Chưa được phép gieo xúc xắc hoặc bạn chưa trả lời đúng câu hỏi!");
        return;
      }

      if (diceState.currentTurnTeamId !== player.teamId) {
        socket.emit("error", "Chưa tới lượt tung xúc xắc của đội bạn!");
        return;
      }

      // Tự động chuyển về bàn cờ trước nếu màn hình còn đang hiển thị câu hỏi / đáp án!
      if (roomActiveQuestions.has(room.id)) {
        roomActiveQuestions.delete(room.id);
        io.to(`room:${room.code}`).emit("game:question:clear");
        io.to(`room:${room.code}`).emit("game:dice:update", diceState);
        await new Promise((resolve) => setTimeout(resolve, 400));
      }

      await executeDiceRoll(room, diceState, player.teamId);
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

      // 0. "Và để đảm bảo công bằng, một đội không được cược 2 câu liên tiếp"
      if (wagerState.previousQuestionWagerTeamId && team.id === wagerState.previousQuestionWagerTeamId) {
        socket.emit("error", "Đội bạn đã đặt cược ở câu hỏi trước! Theo luật công bằng, đội bạn tạm nghỉ cược câu này để nhường các đội khác.");
        return;
      }

      // 1. "tránh việc spam cược, mỗi đội không được cược từ 2 lần liên tiếp trở lên"
      // Ngoại lệ: Đội được chỉ định ngẫu nhiên 10đ vẫn được chọn cược 1 lần kế tiếp
      const isAutoAssignedFirstBid = wagerState.autoAssignedTeamId === team.id;
      if (wagerState.lastWagerTeamId === team.id && !isAutoAssignedFirstBid) {
        socket.emit("error", "Đội bạn vừa đặt cược! Không được cược 2 lần liên tiếp, vui lòng chờ đội khác cược trước.");
        return;
      }

      // 2. "mỗi đội không được cược số điểm vượt quá điểm hiện tại của đội"
      if (amount > team.score) {
        socket.emit("error", `Không được cược số điểm (${amount}đ) vượt quá điểm hiện tại của đội bạn (${team.score}đ)!`);
        return;
      }

      // 2b. Kiểm tra trần cược tối đa theo hệ số điểm câu hỏi (maxBetCap)
      if (wagerState.maxBetCap && amount > wagerState.maxBetCap) {
        socket.emit("error", `Không được cược số điểm (${amount}đ) vượt quá trần cược tối đa (${wagerState.maxBetCap}đ) của câu hỏi này!`);
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
      if (isAutoAssignedFirstBid) {
        // Sau khi đã cược lần kế tiếp thì xóa cờ để các lượt sau tuân thủ quy tắc chống spam cược liên tiếp
        wagerState.autoAssignedTeamId = undefined;
      }
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

      const canAnyTeamBet = checkCanAnyTeamBet(allTeams, wagerState, nextMinOption);

      if (!canAnyTeamBet) {
        // Không còn đội nào có thể cược tiếp: Chốt phiên cược & tự động mở câu hỏi sau 2.5s ngay lập tức!
        await lockWagerAndScheduleAutoLaunch(io, room.id, room.code, wagerState);
        return;
      }

      const wasInitial5s = wagerState.wagerSubPhase === "INITIAL_5S";
      if (wasInitial5s) {
        // Có đội đầu tiên cược trong 5s: Tự đếm tiếp theo với thời gian đã cấu hình
        const wagerDuration = (room.config as any)?.wagerTimeSeconds || 15;
        startWager15sCountdown(io, room.id, room.code, wagerDuration);
      } else {
        // Broadcast update
        io.to(`room:${room.code}`).emit("game:wager:update", wagerState);
      }
    });

    // ── Admin Mode Controls ───────────────────────────────────────────────────
    socket.on("admin:grid:preview:start", async () => {
      const room = await getAdminRoom(socket);
      if (!room || room.mode !== "GRID_CARO") return;
      const duration = (room.config as any)?.gridPreviewDuration || 5;
      startGridCaroPreview(io, room.id, room.code, duration);
    });

    socket.on("admin:grid:preview:stop", async () => {
      const room = await getAdminRoom(socket);
      if (!room || room.mode !== "GRID_CARO") return;
      stopGridCaroPreview(io, room.id, room.code);
    });

    socket.on("admin:grid:select:manual", async ({ cellId }) => {
      const room = await getAdminRoom(socket);
      if (!room || room.mode !== "GRID_CARO" || room.status !== "PLAYING") return;
      await handleGridCellSelect(room, cellId);
    });

    socket.on("admin:grid:launch_question", async () => {
      const room = await getAdminRoom(socket);
      if (!room || room.mode !== "GRID_CARO" || room.status !== "PLAYING") return;
      const gridState = roomGridCaros.get(room.id);
      if (!gridState || !gridState.selectedCellId) return;

      const cell = gridState.cells.find((c) => c.id === gridState.selectedCellId);
      const rawQuestions = room.quizBank?.questions ?? [];
      const q = (cell?.questionId ? rawQuestions.find((item: any) => item.id === cell.questionId) : null) || rawQuestions[room.currentQuestion];
      if (!q) return;

      const qKey = `${room.id}:${q.id}`;
      roomQuestionProcessed.delete(qKey);
      roomQuestionScoresCache.delete(qKey);

      const qIndex = rawQuestions.findIndex((item: any) => item.id === q.id);
      if (qIndex >= 0 && room.currentQuestion !== qIndex) {
        room.currentQuestion = qIndex;
        await prisma.room.update({ where: { id: room.id }, data: { currentQuestion: qIndex } }).catch(console.error);
        roomCache.delete(room.id);
      }

      gridState.questionReady = true;
      io.to(`room:${room.code}`).emit("game:grid:update", gridState);

      const bloomLevel = getBloomLevelFromPoints(q.points);
      const config = room.config as any;

      const questionState = buildQuestionState(q, {
        primaryTeamId: gridState.currentTurnTeamId,
        primaryTeamName: gridState.currentTurnTeamName,
        bloomLevel,
        answerMethod: config?.answerMethod ?? "DEVICE",
        gridCellId: gridState.selectedCellId,
      });

      const isDeviceAnswer = (config?.answerMethod ?? "DEVICE") === "DEVICE";
      const effectiveTimeLimit = isDeviceAnswer ? getStandardQuestionTimeLimit(q, cell?.points) : (q.timeLimit || 30);
      questionState.timeLimit = effectiveTimeLimit;
      questionState.question.timeLimit = effectiveTimeLimit;

      // Do NOT start timer yet! Await Admin "Bắt đầu tính giờ"!
      questionState.timerPending = true;
      questionState.timerStarted = false;
      roomActiveQuestions.set(room.id, questionState);

      io.to(`room:${room.code}`).emit("game:question", questionState);
      io.to(`room:${room.code}:admin`).emit("admin:question:data", {
        questionId: q.id,
        options: q.options,
        answer: q.answer,
        type: q.type,
        explanation: q.hint || (q as any).explanation,
      });
    });

    socket.on("admin:question:get_data", async ({ code }: { code?: string } = {}) => {
      const room = await getAdminRoom(socket, code);
      if (!room) return;
      const activeQ = roomActiveQuestions.get(room.id);
      const rawQuestions = room.quizBank?.questions ?? [];
      const q = (activeQ ? rawQuestions.find((item: any) => item.id === activeQ.question.id) : null) || rawQuestions[room.currentQuestion];
      if (q) {
        socket.emit("admin:question:data", {
          questionId: q.id,
          options: q.options,
          answer: q.answer,
          type: q.type,
          explanation: q.hint || (q as any).explanation,
        });
      }
    });

    socket.on("admin:question:start_timer", async (payload?: { code?: string }) => {
      const room = await getAdminRoom(socket, payload?.code);
      if (!room || room.status !== "PLAYING") return;

      const activeQ = roomActiveQuestions.get(room.id);
      const rawQuestions = room.quizBank?.questions ?? [];
      const q = (activeQ ? rawQuestions.find((item: any) => item.id === activeQ.question.id) : null) || rawQuestions[room.currentQuestion];
      if (!q) return;

      // 1. BOUNCEBACK Steal Timer trigger:
      if (room.mode === "BOUNCEBACK" && activeQ?.stealBuzzedTeamId) {
        await startStealAnsweringTimer(room.id, room.code, q);
        return;
      }

      // 2. BUZZ Mode: Khi MC bấm bắt đầu tính giờ, mở cửa sổ 5s bấm chuông
      if (room.mode === "BUZZ") {
        const qKey = `${room.id}:${q.id}`;
        if (roomBuzzDelayTimers.has(qKey)) {
          clearTimeout(roomBuzzDelayTimers.get(qKey)!);
          roomBuzzDelayTimers.delete(qKey);
        }
        await openBuzzWindow(io, room.id, room.code, q.id);
        return;
      }

      const effectiveTimeLimit = getStandardQuestionTimeLimit(q);
      const endsAt = Date.now() + effectiveTimeLimit * 1000;
      if (activeQ) {
        activeQ.timerPending = false;
        activeQ.timerStarted = true;
        activeQ.startedAt = Date.now();
        activeQ.endsAt = endsAt;
        activeQ.serverTime = Date.now();
        io.to(`room:${room.code}`).emit("game:question", activeQ);
      }

      io.to(`room:${room.code}`).emit("game:timer:started", {
        timeLimit: effectiveTimeLimit,
        endsAt,
        serverTime: Date.now(),
        questionId: q.id,
      });
      startQuestionTimer(io, room.code, room.id, q.id, effectiveTimeLimit);
    });

    socket.on("admin:grid:advance_now", async () => {
      const room = await getAdminRoom(socket);
      if (!room || room.mode !== "GRID_CARO") return;
      await advanceGridToBoard(io, room.id, room.code);
    });

    socket.on("admin:dice:roll:manual", async (payload?: { code?: string }) => {
      const room = await getAdminRoom(socket, payload?.code);
      if (!room || room.mode !== "DICE_RACE") return;
      const diceState = roomDiceRaces.get(room.id);
      if (!diceState) return;

      const teamId = diceState.currentTurnTeamId;
      if (!teamId) return;

      // Tự động chuyển về bàn cờ trước nếu màn hình còn đang hiển thị câu hỏi / đáp án!
      if (roomActiveQuestions.has(room.id)) {
        roomActiveQuestions.delete(room.id);
        io.to(`room:${room.code}`).emit("game:question:clear");
        io.to(`room:${room.code}`).emit("game:dice:update", diceState);
        // Chờ 400ms để màn hình chuyển cảnh mượt về bàn cờ trước khi tung xúc xắc
        await new Promise((resolve) => setTimeout(resolve, 400));
      }

      await executeDiceRoll(room, diceState, teamId);
    });

    socket.on("admin:dice:advance_to_board", async (payload?: { code?: string }) => {
      const room = await getAdminRoom(socket, payload?.code);
      if (!room || room.mode !== "DICE_RACE") return;
      roomActiveQuestions.delete(room.id);
      io.to(`room:${room.code}`).emit("game:question:clear");
      const diceState = roomDiceRaces.get(room.id);
      if (diceState) {
        io.to(`room:${room.code}`).emit("game:dice:update", diceState);
      }
    });

    // ── Mystery Quest (Hành Trình Bí Ẩn) Events ──────────────────────────────
    const executeMysteryFlip = async (room: any, questState: any, team: any, tileId: number) => {
      const allTeams = await prisma.team.findMany({ where: { roomId: room.id } });
      const {
        updatedState,
        isBomb,
        scorePenalty,
        finalScoreDelta,
        shouldResetMismatchedCards,
        recipientTeamId,
        giftedPoints,
        darkBombRecipients,
      } = handleFlipCard({
        state: questState,
        tileId,
        team,
        allTeams,
      });

      roomMysteryQuests.set(room.id, updatedState);

      if (isBomb) {
        if (darkBombRecipients && darkBombRecipients.length > 0) {
          // BOM HẮC ÁM: Trừ điểm đội chính và chia đều cho các đội đối thủ
          const updates: Array<{ teamId: string; score: number; delta: number }> = [];
          if (scorePenalty > 0) {
            const donorDelta = await applyScoreDeltaToTeam(team.id, -scorePenalty);
            updates.push({ teamId: team.id, score: donorDelta.newScore, delta: donorDelta.effectiveDelta });
          }
          for (const rec of darkBombRecipients) {
            if (rec.points > 0) {
              const recDelta = await applyScoreDeltaToTeam(rec.teamId, rec.points);
              updates.push({ teamId: rec.teamId, score: recDelta.newScore, delta: recDelta.effectiveDelta });
            }
          }
          if (updates.length > 0) {
            io.to(`room:${room.code}`).emit("game:score:update", updates);
          }
        } else if (recipientTeamId && giftedPoints && giftedPoints > 0) {
          // BOM TỪ THIỆN: Trừ 50% điểm của đội chính và chuyển tặng cho đội đối thủ cao điểm nhất (không phải đội trả lời chính)
          const donorDelta = await applyScoreDeltaToTeam(team.id, -giftedPoints);
          const recipientDelta = await applyScoreDeltaToTeam(recipientTeamId, giftedPoints);
          io.to(`room:${room.code}`).emit("game:score:update", [
            { teamId: team.id, score: donorDelta.newScore, delta: donorDelta.effectiveDelta },
            { teamId: recipientTeamId, score: recipientDelta.newScore, delta: recipientDelta.effectiveDelta },
          ]);
        } else if (scorePenalty > 0) {
          const deltaRes = await applyScoreDeltaToTeam(team.id, -scorePenalty);
          io.to(`room:${room.code}`).emit("game:score:update", [
            { teamId: team.id, score: deltaRes.newScore, delta: deltaRes.effectiveDelta },
          ]);
        }
      } else if (finalScoreDelta && finalScoreDelta > 0) {
        const deltaRes = await applyScoreDeltaToTeam(team.id, finalScoreDelta);
        io.to(`room:${room.code}`).emit("game:score:update", [
          { teamId: team.id, score: deltaRes.newScore, delta: deltaRes.effectiveDelta },
        ]);
      } else if (updatedState.turnFinishedReason === "ALL_CLEARED") {
        const deltaRes = await applyScoreDeltaToTeam(team.id, updatedState.potPoints);
        io.to(`room:${room.code}`).emit("game:score:update", [
          { teamId: team.id, score: deltaRes.newScore, delta: deltaRes.effectiveDelta },
        ]);
      }

      // ── Audio Trigger determination ──
      const normType = normalizeMiniGameType(updatedState.miniGameType);
      let audioTrigger: "CORRECT" | "WRONG" | "NONE" = "NONE";

      if (normType === "MEMORY_PAIRS") {
        if (updatedState.memoryPairsState?.matchedPairKey) {
          // Chỉ phát khi lật được cặp trùng nhau:
          // Nếu cặp cộng điểm -> phát đúng, nếu cặp trừ điểm (bom) -> phát sai!
          audioTrigger = isBomb ? "WRONG" : "CORRECT";
        } else {
          // Flip lẻ hoặc flip lệch 2 lá không khớp: TUYỆT ĐỐI KHÔNG CÓ NHẠC!
          audioTrigger = "NONE";
        }
      } else if (normType === "ONE_SHOT_DOORS") {
        audioTrigger = isBomb ? "WRONG" : "CORRECT";
      } else if (normType === "TAROT_DESTINY") {
        audioTrigger = isBomb ? "WRONG" : "CORRECT";
      } else if (normType === "PUSH_YOUR_LUCK") {
        audioTrigger = isBomb ? "WRONG" : "NONE";
      }

      const refreshedState = await buildRoomState(room.id);
      io.to(`room:${room.code}`).emit("room:state", refreshedState);
      io.to(`room:${room.code}`).emit("game:mystery:update", updatedState);
      if (updatedState.lastFlippedTile) {
        io.to(`room:${room.code}`).emit("game:mystery:card_flipped", {
          tile: updatedState.lastFlippedTile,
          potPoints: updatedState.potPoints,
          potMultiplier: updatedState.potMultiplier,
          isBomb,
          bombExploded: updatedState.bombExploded,
          audioTrigger,
        });
      }

      // Memory Pairs mismatch: auto flip back after 1.5s
      if (shouldResetMismatchedCards && updatedState.memoryPairsState) {
        setTimeout(async () => {
          const cur = roomMysteryQuests.get(room.id);
          if (!cur || !cur.memoryPairsState) return;
          const { firstFlippedTileId, secondFlippedTileId } = cur.memoryPairsState;
          cur.tiles.forEach((t) => {
            if (t.id === firstFlippedTileId || t.id === secondFlippedTileId) {
              t.isOpened = false;
            }
          });
          cur.memoryPairsState.firstFlippedTileId = null;
          cur.memoryPairsState.secondFlippedTileId = null;
          cur.memoryPairsState.isMismatchResolving = false;
          roomMysteryQuests.set(room.id, cur);
          io.to(`room:${room.code}`).emit("game:mystery:update", cur);
        }, 1500);
      }
    };

    const executeMysteryCashOut = async (room: any, questState: any, team: any) => {
      const { updatedState, finalScoreDelta } = handleCashOut({
        state: questState,
        team,
      });

      if (finalScoreDelta > 0) {
        const deltaRes = await applyScoreDeltaToTeam(team.id, finalScoreDelta);
        io.to(`room:${room.code}`).emit("game:score:update", [
          { teamId: team.id, score: deltaRes.newScore, delta: deltaRes.effectiveDelta },
        ]);
      }

      roomMysteryQuests.set(room.id, updatedState);

      const refreshedState = await buildRoomState(room.id);
      io.to(`room:${room.code}`).emit("room:state", refreshedState);
      io.to(`room:${room.code}`).emit("game:mystery:update", updatedState);
      io.to(`room:${room.code}`).emit("game:mystery:cashed_out", {
        teamId: team.id,
        teamName: team.name,
        totalGained: finalScoreDelta,
        newScore: (team.score || 0) + finalScoreDelta,
      });
    };

    const executeMysteryAdvanceTurn = async (room: any, questState: any) => {
      const teams = await prisma.team.findMany({
        where: { roomId: room.id },
        orderBy: { createdAt: "asc" },
      });
      if (teams.length === 0) return;

      const nextTurnIndex = questState.currentTurnIndex + 1;
      if (nextTurnIndex >= questState.totalTurns) {
        await prisma.room.update({ where: { id: room.id }, data: { status: "FINISHED", endedAt: new Date() } });
        const leaderboard = await buildLeaderboard(room.id);
        io.to(`room:${room.code}`).emit("game:ended", { leaderboard });
        return;
      }

      const nextTeam = teams[nextTurnIndex % teams.length];
      const nextStage = generateMysteryStageForTurn({
        turnIndex: nextTurnIndex,
        currentTeam: nextTeam,
        teams,
        turnsPerTeam: questState.turnsPerTeam,
        prevTheme: questState.theme,
      });
      nextStage.phase = "QUESTION_ACTIVE";
      roomMysteryQuests.set(room.id, nextStage);

      io.to(`room:${room.code}`).emit("game:mystery:update", nextStage);
      const updatedState = await buildRoomState(room.id);
      io.to(`room:${room.code}`).emit("room:state", updatedState);

      // Launch next unique question for this team immediately with round-uniform points!
      const questions = await getRoomQuestions(room.id);
      const nextRound = Math.floor(nextTurnIndex / teams.length) + 1;
      const targetPoints = nextRound === 1 ? 10 : nextRound === 2 ? 20 : 30;
      const nextQ = getNextUniqueQuestion(room.id, questions, undefined, targetPoints);
      if (nextQ) {
        room.currentQuestion = nextQ.index;
        room.status = "PLAYING";
        roomCache.set(room.id, room);
        await prisma.room.update({ where: { id: room.id }, data: { currentQuestion: nextQ.index, status: "PLAYING" } }).catch(console.error);
        await startQuestionPrepareAndLaunch(room, questions, nextQ.index, nextQ.question);
      }
    };

    socket.on("game:mystery:flip_card", async ({ tileId }) => {
      const playerId = playerSockets.get(socket.id);
      if (!playerId) return;
      const player = await prisma.player.findUnique({
        where: { id: playerId },
        include: { room: true },
      });
      if (!player || !player.room || !player.teamId) return;

      const room = player.room;
      if (room.mode !== "MYSTERY_QUEST" || room.status !== "PLAYING") return;

      const questState = roomMysteryQuests.get(room.id);
      if (!questState || questState.phase !== "PUSH_YOUR_LUCK") return;

      if (questState.currentTurnTeamId !== player.teamId) {
        socket.emit("error", "Chưa đến lượt lật bài của đội bạn!");
        return;
      }

      const team = await prisma.team.findUnique({ where: { id: player.teamId } });
      if (!team) return;

      await executeMysteryFlip(room, questState, team, tileId);
    });

    socket.on("admin:mystery:flip_card", async (payload: { tileId: number; code?: string }) => {
      const room = await getAdminRoom(socket, payload?.code);
      if (!room || room.mode !== "MYSTERY_QUEST" || room.status !== "PLAYING") return;

      const questState = roomMysteryQuests.get(room.id);
      if (!questState || questState.phase !== "PUSH_YOUR_LUCK") return;

      const team = await prisma.team.findUnique({ where: { id: questState.currentTurnTeamId } });
      if (!team) return;

      await executeMysteryFlip(room, questState, team, payload.tileId);
    });

    socket.on("game:mystery:cash_out", async () => {
      const playerId = playerSockets.get(socket.id);
      if (!playerId) return;
      const player = await prisma.player.findUnique({
        where: { id: playerId },
        include: { room: true },
      });
      if (!player || !player.room || !player.teamId) return;

      const room = player.room;
      if (room.mode !== "MYSTERY_QUEST" || room.status !== "PLAYING") return;

      const questState = roomMysteryQuests.get(room.id);
      if (!questState || questState.phase !== "PUSH_YOUR_LUCK") return;

      if (questState.currentTurnTeamId !== player.teamId) {
        socket.emit("error", "Chưa đến lượt bảo toàn điểm của đội bạn!");
        return;
      }

      const team = await prisma.team.findUnique({ where: { id: player.teamId } });
      if (!team) return;

      await executeMysteryCashOut(room, questState, team);
    });

    socket.on("admin:mystery:cash_out", async (payload?: { code?: string }) => {
      const room = await getAdminRoom(socket, payload?.code);
      if (!room || room.mode !== "MYSTERY_QUEST" || room.status !== "PLAYING") return;

      const questState = roomMysteryQuests.get(room.id);
      if (!questState || questState.phase !== "PUSH_YOUR_LUCK") return;

      const team = await prisma.team.findUnique({ where: { id: questState.currentTurnTeamId } });
      if (!team) return;

      await executeMysteryCashOut(room, questState, team);
    });

    socket.on("game:mystery:steal_buzz", async () => {
      const playerId = playerSockets.get(socket.id);
      if (!playerId) return;
      const player = await prisma.player.findUnique({
        where: { id: playerId },
        include: { room: true },
      });
      if (!player || !player.room || !player.teamId) return;

      const room = player.room;
      if (room.mode !== "MYSTERY_QUEST" || room.status !== "PLAYING") return;

      const questState = roomMysteryQuests.get(room.id);
      if (!questState || questState.phase !== "STEAL_PHASE" || questState.stealBuzzedTeamId) return;

      if (questState.currentTurnTeamId === player.teamId) return;

      const team = await prisma.team.findUnique({ where: { id: player.teamId } });
      if (!team) return;

      questState.stealBuzzedTeamId = team.id;
      questState.stealBuzzedTeamName = team.name;
      questState.phase = "PUSH_YOUR_LUCK";
      questState.currentTurnTeamId = team.id;
      questState.currentTurnTeamName = team.name;
      questState.currentTurnTeamColor = team.color;
      questState.potPoints = 15; // base steal pot points
      roomMysteryQuests.set(room.id, questState);

      io.to(`room:${room.code}`).emit("game:mystery:update", questState);
      io.to(`room:${room.code}`).emit("game:mystery:steal_buzzed", {
        teamId: team.id,
        teamName: team.name,
        timeLimit: 15,
      });
    });

    socket.on("admin:mystery:steal_buzz", async ({ targetTeamId }: { targetTeamId?: string } = {}) => {
      const room = await getAdminRoom(socket);
      if (!room || room.mode !== "MYSTERY_QUEST" || room.status !== "PLAYING") return;

      const questState = roomMysteryQuests.get(room.id);
      if (!questState || questState.phase !== "STEAL_PHASE" || questState.stealBuzzedTeamId) return;

      const teams = await prisma.team.findMany({ where: { roomId: room.id } });
      const otherTeams = teams.filter((t) => t.id !== questState.currentTurnTeamId);
      const team = (targetTeamId ? teams.find((t) => t.id === targetTeamId) : null) || otherTeams[0];
      if (!team) return;

      questState.stealBuzzedTeamId = team.id;
      questState.stealBuzzedTeamName = team.name;
      questState.phase = "PUSH_YOUR_LUCK";
      questState.currentTurnTeamId = team.id;
      questState.currentTurnTeamName = team.name;
      questState.currentTurnTeamColor = team.color;
      questState.potPoints = 15; // base steal pot points
      roomMysteryQuests.set(room.id, questState);

      io.to(`room:${room.code}`).emit("game:mystery:update", questState);
      io.to(`room:${room.code}`).emit("game:mystery:steal_buzzed", {
        teamId: team.id,
        teamName: team.name,
        timeLimit: 15,
      });
    });

    socket.on("admin:mystery:advance_turn", async (payload?: { code?: string }) => {
      const room = await getAdminRoom(socket, payload?.code);
      if (!room || room.mode !== "MYSTERY_QUEST" || room.status !== "PLAYING") return;

      const questState = roomMysteryQuests.get(room.id);
      if (!questState) return;

      await executeMysteryAdvanceTurn(room, questState);
    });

    socket.on("admin:mystery:set_minigame_type", async ({ miniGameType, code }: { miniGameType: MysteryMiniGameType; code?: string }) => {
      const room = await getAdminRoom(socket, code);
      if (!room || room.mode !== "MYSTERY_QUEST" || room.status !== "PLAYING") return;

      const questState = roomMysteryQuests.get(room.id);
      if (!questState) return;

      const teams = await prisma.team.findMany({ where: { roomId: room.id }, orderBy: { createdAt: "asc" } });
      const currentTeam = teams.find((t) => t.id === questState.currentTurnTeamId) || teams[0] || { id: "t1", name: "Đội 1" };

      const newStage = generateMysteryStageForTurn({
        turnIndex: questState.currentTurnIndex,
        currentTeam,
        teams,
        turnsPerTeam: questState.turnsPerTeam,
        prevTheme: questState.theme,
        forcedMiniGameType: miniGameType,
      });
      // Retain active phase
      newStage.phase = questState.phase;
      newStage.potPoints = questState.potPoints;
      roomMysteryQuests.set(room.id, newStage);

      io.to(`room:${room.code}`).emit("game:mystery:update", newStage);
      const refreshedState = await buildRoomState(room.id);
      io.to(`room:${room.code}`).emit("room:state", refreshedState);
    });

    // ── Admin Sandbox Adjust Score (Sandbox Cheats) ───────────────────────────
    socket.on("admin:sandbox:adjust_score", async ({ teamId, delta, setScore }) => {
      const room = await getAdminRoom(socket);
      if (!room) return;

      const team = await prisma.team.findUnique({ where: { id: teamId } });
      if (!team) return;

      let newScore = team.score;
      let effectiveDelta = 0;

      if (typeof setScore === "number") {
        newScore = Math.max(0, setScore);
        effectiveDelta = newScore - team.score;
      } else if (typeof delta === "number") {
        newScore = Math.max(0, team.score + delta);
        effectiveDelta = newScore - team.score;
      }

      await prisma.team.update({
        where: { id: teamId },
        data: { score: newScore },
      });

      io.to(`room:${room.code}`).emit("game:score:update", [
        { teamId, score: newScore, delta: effectiveDelta },
      ]);
    });

    socket.on("admin:sandbox:set_active_team", async ({ teamId, teamIndex, code }: { teamId: string; teamIndex?: number; code?: string }) => {
      const room = await getAdminRoom(socket, code);
      if (!room) return;

      roomSandboxActiveTeam.set(room.id, teamId);
      console.log(`[admin:sandbox:set_active_team] Room ${room.code} active human team set to ${teamId} (index ${teamIndex})`);

      await prisma.player.updateMany({
        where: {
          roomId: room.id,
          isHost: false,
          OR: [
            { name: { contains: "Tester" } },
            { id: { startsWith: "sb_" } },
            { id: { startsWith: "p_sb_" } },
          ],
        },
        data: { teamId },
      }).catch(() => {});

      if (room.mode === "MYSTERY_QUEST") {
        const questState = roomMysteryQuests.get(room.id);
        if (questState) {
          const teams = await prisma.team.findMany({ where: { roomId: room.id } });
          const newTeam = teams.find((t) => t.id === teamId);
          if (newTeam) {
            questState.currentTurnTeamId = newTeam.id;
            questState.currentTurnTeamName = newTeam.name;
            questState.currentTurnTeamColor = newTeam.color || "#ef4444";
            if (roomActiveQuestions.has(room.id) || room.status === "PLAYING") {
              questState.phase = "QUESTION_ACTIVE";
              questState.potPoints = 0;
              questState.bombExploded = undefined;
              questState.turnFinishedReason = undefined;
            }
            roomMysteryQuests.set(room.id, questState);
            io.to(`room:${room.code}`).emit("game:mystery:update", questState);
            const refState = await buildRoomState(room.id);
            io.to(`room:${room.code}`).emit("room:state", refState);
          }
        }
      }
    });

    // ── Cài đặt điểm số ban đầu cho các đội khi bắt đầu thi ────────────────────
    socket.on("admin:teams:set_initial_scores", async ({ defaultScore, teamScores, code }, callback) => {
      try {
        const room = await getAdminRoom(socket, code);
        if (!room) {
          if (callback) callback({ success: false, error: "Không tìm thấy phòng hoặc không có quyền Admin" });
          return;
        }

        const scoreUpdates: ScoreUpdate[] = [];
        const teams = await prisma.team.findMany({ where: { roomId: room.id } });

        for (const t of teams) {
          let targetScore = t.score;
          if (typeof defaultScore === "number") {
            targetScore = Math.max(0, defaultScore);
          }
          if (teamScores && typeof teamScores[t.id] === "number") {
            targetScore = Math.max(0, teamScores[t.id]);
          }

          if (targetScore !== t.score) {
            const effectiveDelta = targetScore - t.score;
            await prisma.team.update({
              where: { id: t.id },
              data: { score: targetScore },
            });
            scoreUpdates.push({ teamId: t.id, score: targetScore, delta: effectiveDelta });
          }
        }

        // Persist initialTeamScore in room config if defaultScore is provided
        if (typeof defaultScore === "number") {
          const config = (room.config as any) || {};
          await prisma.room.update({
            where: { id: room.id },
            data: { config: { ...config, initialTeamScore: Math.max(0, defaultScore) } },
          });
        }

        if (scoreUpdates.length > 0) {
          io.to(`room:${room.code}`).emit("game:score:update", scoreUpdates);
        }

        const updatedState = await buildRoomState(room.id);
        io.to(`room:${room.code}`).emit("room:state", updatedState);

        if (callback) callback({ success: true });
      } catch (err) {
        console.error("[admin:teams:set_initial_scores]", err);
        if (callback) callback({ success: false, error: "Lỗi hệ thống khi cập nhật điểm" });
      }
    });

    socket.on("admin:team:update_score", async ({ teamId, score, code }, callback) => {
      try {
        const room = await getAdminRoom(socket, code);
        if (!room) {
          if (callback) callback({ success: false, error: "Không tìm thấy phòng hoặc không có quyền Admin" });
          return;
        }

        const team = await prisma.team.findUnique({ where: { id: teamId } });
        if (!team || team.roomId !== room.id) {
          if (callback) callback({ success: false, error: "Không tìm thấy đội trong phòng này" });
          return;
        }

        const newScore = Math.max(0, score);
        const effectiveDelta = newScore - team.score;
        await prisma.team.update({
          where: { id: teamId },
          data: { score: newScore },
        });

        io.to(`room:${room.code}`).emit("game:score:update", [
          { teamId, score: newScore, delta: effectiveDelta },
        ]);

        const updatedState = await buildRoomState(room.id);
        io.to(`room:${room.code}`).emit("room:state", updatedState);

        if (callback) callback({ success: true });
      } catch (err) {
        console.error("[admin:team:update_score]", err);
        if (callback) callback({ success: false, error: "Lỗi hệ thống khi cập nhật điểm đội" });
      }
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

    socket.on("tournament:predict", async ({ matchId, predictedWinnerId }) => {
      const playerId = playerSockets.get(socket.id);
      if (!playerId) return;
      const player = await prisma.player.findUnique({
        where: { id: playerId },
        include: { room: true, team: true },
      });
      if (!player || !player.room || player.room.mode !== "TOURNAMENT") return;
      const tournament = roomTournaments.get(player.room.id);
      if (!tournament) return;
      const match = tournament.matches.find((m) => m.id === matchId);
      if (!match || match.status === "COMPLETED") return;
      const teamId = player.teamId;
      if (!teamId) return;
      if (teamId === match.team1Id || teamId === match.team2Id) return;

      match.predictions = match.predictions || {};
      match.predictions[teamId] = predictedWinnerId;
      io.to(`room:${player.room.code}`).emit("game:tournament:update", tournament);
    });

    socket.on("tournament:cheer", async ({ matchId, targetTeamId, emoji }) => {
      const playerId = playerSockets.get(socket.id);
      let roomCode: string | undefined;
      let roomId: string | undefined;

      if (playerId) {
        const player = await prisma.player.findUnique({
          where: { id: playerId },
          select: { roomId: true, room: { select: { code: true, mode: true } } },
        });
        if (player?.room?.mode === "TOURNAMENT") {
          roomId = player.roomId;
          roomCode = player.room.code;
        }
      } else {
        roomId = adminSockets.get(socket.id);
        if (roomId) {
          const room = await prisma.room.findUnique({
            where: { id: roomId },
            select: { code: true, mode: true },
          });
          if (room?.mode === "TOURNAMENT") {
            roomCode = room.code;
          }
        }
      }

      if (!roomId || !roomCode) return;
      const tournament = roomTournaments.get(roomId);
      if (!tournament) return;
      const match = tournament.matches.find((m) => m.id === matchId) ||
                    tournament.matches.find((m) => m.id === tournament.currentMatchId);
      if (!match) return;

      match.cheers = match.cheers || { countA: 0, countB: 0 };
      if (targetTeamId === match.team1Id) {
        match.cheers.countA = (match.cheers.countA || 0) + 1;
      } else if (targetTeamId === match.team2Id) {
        match.cheers.countB = (match.cheers.countB || 0) + 1;
      }
      tournament.cheers = match.cheers;

      const countA = match.cheers.countA;
      const countB = match.cheers.countB;
      const total = countA + countB;
      const percentA = total > 0 ? Math.round((countA / total) * 100) : 50;
      const percentB = 100 - percentA;

      io.to(`room:${roomCode}`).emit("tournament:cheer:broadcast", {
        matchId: match.id,
        targetTeamId,
        emoji: emoji || "🔥",
        countA,
        countB,
        percentA,
        percentB,
      });
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

      await assignDefaultWagerTeamIfNone(room.id, wagerState);
      wagerState.phase = "QUESTION_PERIOD";
      wagerState.questionReady = false;
      wagerState.wagerTimeRemaining = 0;
      io.to(`room:${room.code}`).emit("game:wager:update", wagerState);
      scheduleWagerAutoLaunch(io, room.id, room.code);
    });

    socket.on("admin:wager:launch_question", async () => {
      const room = await getAdminRoom(socket);
      if (!room || room.mode !== "WAGER" || room.status !== "PLAYING") return;
      await launchWagerQuestion(io, room.id, room.code);
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

      // Check priority: Must grant according to death order (head of queue: team that left earlier)
      const topQueueItem = wagerState.bailoutQueue[0];
      if (topQueueItem.teamId !== teamId) {
        socket.emit("error", `Phải ưu tiên trợ cấp theo thứ tự rời cuộc chơi sớm hơn: Đội ${topQueueItem.teamName} (rời cuộc chơi tại câu ${topQueueItem.questionIndex}) cần được cứu trước!`);
        return;
      }

      const team = await prisma.team.findUnique({ where: { id: teamId } });
      if (!team || team.score > 0) return;

      const config = (room.config as any) || {};
      const bailoutMax = config?.wagerBailoutLimit ?? 1;
      const bailoutInfo = wagerState.teamBailouts?.[teamId] ?? { remaining: bailoutMax, max: bailoutMax };
      if (bailoutInfo.remaining <= 0) {
        socket.emit("error", "Đội này đã hết lượt trợ cấp!");
        return;
      }

      // Quyền trợ cấp:
      // 1. Điểm trợ cấp = điểm đội thấp nhất trong các đội còn sống (score > 0)
      // 2. Còn ít nhất 2 đội còn sống (tính cả đội đã nhận trợ cấp trong câu hỏi hiện tại)
      const allTeams = await prisma.team.findMany({ where: { roomId: room.id } });
      const positiveScores = allTeams.filter((t) => t.score > 0).map((t) => t.score);
      // Đội nhận trợ cấp sau khi cấp sẽ có điểm > 0. Để còn ít nhất 2 đội sống (tính cả đội này),
      // số đội đang có điểm > 0 hiện tại phải >= 1
      if (positiveScores.length < 1) {
        socket.emit("error", "Điều kiện dùng trợ cấp không thỏa mãn: Cần còn ít nhất 2 đội còn sống (tính cả đội nhận trợ cấp)!");
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

    socket.on("admin:wager:set_bailout_limit", async ({ limit }: { limit: number }) => {
      const room = await getAdminRoom(socket);
      if (!room || room.mode !== "WAGER") return;
      const newLimit = Math.max(1, Math.min(10, limit));
      const config = (room.config as any) || {};
      config.wagerBailoutLimit = newLimit;
      await prisma.room.update({
        where: { id: room.id },
        data: { config },
      });

      const wagerState = roomWagers.get(room.id);
      if (wagerState) {
        if (!wagerState.teamBailouts) wagerState.teamBailouts = {};
        const teams = await prisma.team.findMany({ where: { roomId: room.id } });
        teams.forEach((t) => {
          const cur = wagerState.teamBailouts![t.id];
          if (cur) {
            const used = Math.max(0, cur.max - cur.remaining);
            cur.max = newLimit;
            cur.remaining = Math.max(0, newLimit - used);
          } else {
            wagerState.teamBailouts![t.id] = { remaining: newLimit, max: newLimit };
          }
        });
        io.to(`room:${room.code}`).emit("game:wager:update", wagerState);
        const roomState = await buildRoomState(room.id);
        io.to(`room:${room.code}`).emit("room:state", roomState);
      }
    });

    socket.on("admin:room:update_config", async ({ key, value, code }: { key: string; value: any; code?: string }) => {
      const room = await getAdminRoom(socket, code);
      if (!room) return;
      const config = (room.config as any) || {};
      config[key] = value;
      await prisma.room.update({
        where: { id: room.id },
        data: { config },
      });
      room.config = config;
      roomCache.set(room.id, room);

      if (key === "wagerMultiplierCap" && room.mode === "WAGER") {
        const wagerState = roomWagers.get(room.id);
        if (wagerState) {
          const rawMult = Number(value) || 2.5;
          const newMult = Math.max(1.0, Math.min(3.0, rawMult));
          const basePts = wagerState.baseQuestionPoints || 20;
          wagerState.wagerMultiplierCap = newMult;
          wagerState.maxBetCap = Math.floor(basePts * newMult);
          io.to(`room:${room.code}`).emit("game:wager:update", wagerState);
        }
      }

      const roomState = await buildRoomState(room.id);
      io.to(`room:${room.code}`).emit("room:state", roomState);
    });

    socket.on("admin:timer:set", async ({ seconds }: { seconds: number }) => {
      const room = await getAdminRoom(socket);
      if (!room) return;
      const key = `${room.id}:timer`;
      if (roomRemainingTimes.has(key)) {
        const newRemaining = Math.max(1, seconds);
        roomRemainingTimes.set(key, newRemaining);
        const newEndsAt = Date.now() + newRemaining * 1000;
        roomTimerEndsAt.set(room.id, newEndsAt);
        io.to(`room:${room.code}`).emit("game:timer", {
          remaining: newRemaining,
          total: 30,
          endsAt: newEndsAt,
          serverTime: Date.now(),
        });
      }
    });

    socket.on("admin:timer:stop_early", async (payload?: { code?: string }) => {
      const room = await getAdminRoom(socket, payload?.code);
      if (!room || room.status !== "PLAYING") return;
      const questions = await getRoomQuestions(room.id);
      const q = questions[room.currentQuestion];
      if (q) {
        await finalizeQuestionOnTimeUp(io, room.id, room.code, q.id);
      }
    });

    socket.on("game:answer:stop_early", async ({ questionId, answer }) => {
      const playerId = playerSockets.get(socket.id);
      if (!playerId) return;
      const player = await prisma.player.findUnique({
        where: { id: playerId },
        include: { room: true },
      });
      if (!player?.room || player.room.status !== "PLAYING") return;
      // Normal contestants must NEVER be able to stop question timer early for everyone!
      if (!player.isHost) {
        return;
      }

      if (answer !== undefined) {
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
      }

      await finalizeQuestionOnTimeUp(io, player.room.id, player.room.code, questionId);
    });

    socket.on("game:answer:finalize", async ({ questionId, answer, teamId }: any) => {
      const playerId = playerSockets.get(socket.id);
      if (!playerId) return;
      const player = await prisma.player.findFirst({
        where: {
          OR: [
            { id: playerId },
            { socketId: socket.id },
          ],
        },
        include: { room: true, team: true },
      });
      if (!player?.room || player.room.status !== "PLAYING") return;

      const room = player.room;
      const qKey = `${room.id}:${questionId}`;

      let effectiveTeamId = teamId || player.teamId;
      if (!effectiveTeamId && (playerId.startsWith("p_sb_") || playerId.startsWith("sb_") || player.name.includes("Tester"))) {
        const activeSb = roomSandboxActiveTeam.get(room.id);
        const primary = roomPrimaryTeams.get(qKey);
        effectiveTeamId = activeSb || primary?.teamId || null;
        if (!effectiveTeamId && room.name?.startsWith("[Sandbox]")) {
          const match = playerId.match(/_t(\d+)/);
          if (match) {
            const rawIdx = parseInt(match[1], 10);
            const teams = await prisma.team.findMany({ where: { roomId: room.id }, orderBy: { createdAt: "asc" } });
            effectiveTeamId = (rawIdx < teams.length ? teams[rawIdx]?.id : undefined) ||
                              (rawIdx >= 1 && rawIdx <= teams.length ? teams[rawIdx - 1]?.id : undefined) ||
                              null;
          }
        }
        if (!effectiveTeamId) {
          const firstTeam = await prisma.team.findFirst({ where: { roomId: room.id }, orderBy: { createdAt: "asc" } });
          effectiveTeamId = firstTeam?.id ?? null;
        }
        if (effectiveTeamId) {
          await prisma.player.update({
            where: { id: player.id },
            data: { teamId: effectiveTeamId },
          }).catch(() => {});
        }
      }

      const actorId = effectiveTeamId || player.id;

      if (answer !== undefined) {
        await processAnswerSubmission({
          io,
          roomId: player.room.id,
          questionId,
          playerId,
          teamId: effectiveTeamId ?? undefined,
          answer,
          isAdminOverride: false,
          socket,
        });
      }

      let finSet = roomFinalizedActors.get(qKey);
      if (!finSet) {
        finSet = new Set<string>();
        roomFinalizedActors.set(qKey, finSet);
      }
      finSet.add(actorId);
      if (effectiveTeamId) finSet.add(effectiveTeamId);
      if (playerId) finSet.add(playerId);

      const activeParticipants = await getActiveParticipantsForQuestion(room, questionId);
      const finalizedCount = activeParticipants.filter((id) => finSet?.has(id)).length;
      const totalParticipantsCount = activeParticipants.length;

      io.to(`room:${room.code}`).emit("game:answer:finalized", {
        questionId,
        actorId,
        actorName: player.team?.name || player.name,
        finalizedCount,
        totalParticipantsCount,
      });

      // Human-First Check: Early completion is STRICTLY FORBIDDEN if any human participant has not finalized!
      const hasPendingHumans = await hasUnfinalizedHumanParticipants(room, questionId, finSet);

      // Nếu tất cả người chơi/đội hợp lệ đã chốt đáp án VÀ không còn người chơi thật nào chưa chốt: Kết thúc vòng tính giờ sớm ngay!
      if (!hasPendingHumans && totalParticipantsCount > 0 && finalizedCount >= totalParticipantsCount) {
        const isMcMode = (room.config as any)?.answerMethod === "MC";
        if (isMcMode) {
          // Trong chế độ Trả lời qua MC: MC công bố đáp án hoàn toàn THỦ CÔNG!
          return;
        }

        stopQuestionTimer(room.id);
        const activeQ = roomActiveQuestions.get(room.id);
        io.to(`room:${room.code}`).emit("game:timer", { remaining: 0, total: activeQ?.timeLimit || 30, endsAt: Date.now(), serverTime: Date.now() });
        io.to(`room:${room.code}`).emit("game:timer:expired", { questionId });

        if (room.mode === "BOUNCEBACK") {
          const stealInfo = roomStealBuzzed.get(qKey);
          const primary = roomPrimaryTeams.get(qKey);
          const question = await prisma.question.findUnique({ where: { id: questionId } });

          io.to(`room:${room.code}`).emit("game:early_completed", {
            questionId,
            reason: "ALL_FINALIZED",
            message: "Đội thi đã chốt đáp án sớm!",
          });

          if (stealInfo && (actorId === stealInfo.teamId || actorId === stealInfo.playerId || player.id === stealInfo.playerId || effectiveTeamId === stealInfo.teamId)) {
            const existingAns = await prisma.answer.findFirst({
              where: {
                roomId: room.id,
                questionId,
                OR: [
                  { teamId: stealInfo.teamId },
                  { playerId: stealInfo.playerId },
                  { playerId: player.id },
                ],
              },
              orderBy: { submittedAt: "desc" },
            });
            const ansArr: string[] = existingAns?.answer ? (Array.isArray(existingAns.answer) ? (existingAns.answer as any[]).map(String) : [String(existingAns.answer)]) : [];
            const { isAutoCorrect, answerText } = evaluateAnswerCorrectness(question, ansArr);
            if (activeQ) {
              activeQ.bouncebackAwaitingJudgment = "STEAL";
              activeQ.bouncebackStealAnswer = ansArr;
              activeQ.bouncebackAutoCorrect = isAutoCorrect;
              activeQ.bouncebackAnswerText = answerText;
              io.to(`room:${room.code}`).emit("game:question", activeQ);
            }
            const stealPayload = {
              phase: "STEAL" as const,
              targetTeamId: stealInfo.teamId,
              targetTeamName: stealInfo.teamName,
              answer: ansArr,
              points: roomBouncebackSelectedPoints.get(qKey) ?? 20,
              isAutoCorrect,
              answerText,
            };
            io.to(`room:${room.code}`).emit("game:bounceback:awaiting_judgment", stealPayload);
            io.to(`room:${room.code}:admin`).emit("game:bounceback:awaiting_judgment", stealPayload);
            return;
          } else if (primary && (actorId === primary.teamId || player.id === primary.teamId || effectiveTeamId === primary.teamId || player.teamId === primary.teamId)) {
            const existingAns = await prisma.answer.findFirst({
              where: {
                roomId: room.id,
                questionId,
                OR: [
                  { teamId: primary.teamId },
                  { playerId: player.id },
                ],
              },
              orderBy: { submittedAt: "desc" },
            });
            const ansArr: string[] = existingAns?.answer ? (Array.isArray(existingAns.answer) ? (existingAns.answer as any[]).map(String) : [String(existingAns.answer)]) : [];
            const { isAutoCorrect, answerText } = evaluateAnswerCorrectness(question, ansArr);
            if (activeQ) {
              activeQ.bouncebackAwaitingJudgment = "PRIMARY";
              activeQ.bouncebackPrimaryAnswer = ansArr;
              activeQ.bouncebackAutoCorrect = isAutoCorrect;
              activeQ.bouncebackAnswerText = answerText;
              io.to(`room:${room.code}`).emit("game:question", activeQ);
            }
            const primaryPayload = {
              phase: "PRIMARY" as const,
              targetTeamId: primary.teamId,
              targetTeamName: primary.teamName,
              answer: ansArr,
              points: roomBouncebackSelectedPoints.get(qKey) ?? 20,
              isAutoCorrect,
              answerText,
            };
            io.to(`room:${room.code}`).emit("game:bounceback:awaiting_judgment", primaryPayload);
            io.to(`room:${room.code}:admin`).emit("game:bounceback:awaiting_judgment", primaryPayload);
            return;
          }
        }

        io.to(`room:${room.code}`).emit("game:early_completed", {
          questionId,
          reason: "ALL_FINALIZED",
          message: "Tất cả các đội đã chốt đáp án! Đang kiểm tra kết quả...",
        });
        setTimeout(async () => {
          await finalizeQuestionOnTimeUp(io, room.id, room.code, questionId);
        }, 2500);
      }
    });

    socket.on("admin:sandbox:grant:card", async ({ teamId, cardType }) => {
      const room = await getAdminRoom(socket);
      if (!room) return;
      if (room.mode === "MYSTERY_QUEST") {
        socket.emit("error", "Chế độ Hành Trình Bí Ẩn không hỗ trợ thẻ bổ trợ (Power-up)!");
        return;
      }
      if (!isPowerupAllowedForMode(room.mode as any, cardType as any)) {
        socket.emit("error", `Thẻ ${cardType} không được phép sử dụng trong chế độ ${room.mode}!`);
        return;
      }
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
      socketPlayerSessions.delete(socket.id);

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

      // 30s grace period to allow seamless reconnect over shaky mobile/wifi network without turning offline
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
      }, 30000);

      pendingDisconnects.set(playerId, timer);
    });
  });
}

// ── Answer Processing (Unified for Device & MC Mode) ─────────────────────────

async function getActiveParticipantsForQuestion(room: any, questionId: string): Promise<string[]> {
  const qKey = `${room.id}:${questionId}`;
  if (room.mode === "BOUNCEBACK") {
    const steal = roomStealBuzzed.get(qKey);
    if (steal) {
      return [steal.teamId || steal.playerId];
    }
    const primary = roomPrimaryTeams.get(qKey);
    return primary ? [primary.teamId] : [];
  }
  if (room.mode === "BUZZ") {
    const buzz = roomBuzzFirst.get(qKey);
    return buzz ? [buzz.teamId || buzz.playerId] : [];
  }
  if (room.mode === "GRID_CARO") {
    const gridState = roomGridCaros.get(room.id);
    return gridState?.currentTurnTeamId ? [gridState.currentTurnTeamId] : [];
  }
  if (room.mode === "DICE_RACE") {
    const diceState = roomDiceRaces.get(room.id);
    return diceState?.currentTurnTeamId ? [diceState.currentTurnTeamId] : [];
  }
  if (room.mode === "MYSTERY_QUEST") {
    const questState = roomMysteryQuests.get(room.id);
    return questState?.currentTurnTeamId ? [questState.currentTurnTeamId] : [];
  }
  if (room.mode === "TOURNAMENT") {
    const tournament = roomTournaments.get(room.id);
    const currentMatch = tournament?.matches.find((m) => m.id === tournament.currentMatchId);
    return [currentMatch?.team1Id, currentMatch?.team2Id].filter(Boolean) as string[];
  }
  // CLASSIC, POWERUP, ELIMINATION, WAGER
  if (room.teamMode === "TEAM") {
    // In ELIMINATION mode, ghost teams (isEliminated: true) are active participants answering for revival stats!
    // They must NOT be excluded, otherwise the question terminates prematurely as soon as surviving teams answer.
    const whereClause: any = { roomId: room.id };
    if (room.mode !== "ELIMINATION") {
      whereClause.isEliminated = false;
    }
    const teams = await prisma.team.findMany({
      where: whereClause,
    });
    return teams.map((t) => t.id);
  } else {
    const players = await prisma.player.findMany({
      where: { roomId: room.id, isHost: false },
    });
    return players.map((p) => p.id);
  }
}

function isPlayerBot(p?: { id?: string | null; name?: string | null } | null): boolean {
  if (!p) return false;
  // Human testers and sandbox players are NEVER bots!
  if (p.id?.startsWith("p_sb_") || p.id?.startsWith("sb_") || p.name?.includes("Tester")) return false;
  if (p.id?.startsWith("bot_")) return true;
  if (p.name?.includes("🤖")) return true;
  if (p.name?.toLowerCase().startsWith("bot ")) return true;
  return false;
}

function normalizeTextForComparison(text: string): string {
  if (!text) return "";
  return text
    .toString()
    .normalize("NFC")
    .toLowerCase()
    .trim()
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/[.,!?;:]+$/, "")
    .replace(/\s+/g, " ");
}

function matchFillBlankText(expectedAnswer: string, submittedAnswer: string): boolean {
  const normExpected = normalizeTextForComparison(expectedAnswer);
  const normSubmitted = normalizeTextForComparison(submittedAnswer);

  if (!normExpected || !normSubmitted) return false;
  if (normExpected === normSubmitted) return true;

  const variants = expectedAnswer
    .split(/[/;|]/)
    .flatMap((part) => {
      if (part.includes(",") && !/\d,\d/.test(part)) {
        return part.split(",");
      }
      return [part];
    })
    .map((v) => normalizeTextForComparison(v))
    .filter(Boolean);

  if (variants.includes(normSubmitted)) return true;

  const cleanExpNum = Number(normExpected.replace(",", "."));
  const cleanSubNum = Number(normSubmitted.replace(",", "."));
  if (!isNaN(cleanExpNum) && !isNaN(cleanSubNum) && cleanExpNum === cleanSubNum) {
    return true;
  }

  return false;
}

function matchTrueFalseText(expectedTextOrId: string, submittedTextOrId: string): boolean {
  const normExp = normalizeTextForComparison(expectedTextOrId);
  const normSub = normalizeTextForComparison(submittedTextOrId);

  if (normExp === normSub) return true;

  const trueTokens = ["true", "đúng", "dung", "t", "d", "1", "yes", "có", "co"];
  const falseTokens = ["false", "sai", "f", "s", "0", "no", "không", "khong"];

  const isExpTrue = trueTokens.includes(normExp);
  const isExpFalse = falseTokens.includes(normExp);

  const isSubTrue = trueTokens.includes(normSub);
  const isSubFalse = falseTokens.includes(normSub);

  if (isExpTrue && isSubTrue) return true;
  if (isExpFalse && isSubFalse) return true;

  return false;
}

async function hasUnfinalizedHumanParticipants(
  room: any,
  questionId: string,
  finSet: Set<string>
): Promise<boolean> {
  const activeParticipants = await getActiveParticipantsForQuestion(room, questionId);
  if (activeParticipants.length === 0) return false;

  const players = await prisma.player.findMany({
    where: { roomId: room.id, isHost: false },
    include: { team: true },
  });

  const isSandbox = Boolean(room.name?.startsWith("[Sandbox]"));
  const sandboxActiveTeamId = isSandbox ? roomSandboxActiveTeam.get(room.id) : undefined;

  for (const partId of activeParticipants) {
    if (isSandbox && sandboxActiveTeamId && partId === sandboxActiveTeamId) {
      if (!finSet.has(partId)) {
        return true; // The sandbox human tester team has not finalized yet!
      }
      continue;
    }

    const teamPlayers = players.filter((p) => p.teamId === partId);
    if (teamPlayers.length > 0) {
      // It's a team
      const humanPlayers = teamPlayers.filter((p) => {
        if (isPlayerBot(p)) return false;
        if (isSandbox) {
          return (sandboxActiveTeamId === partId) || (!p.id.startsWith("bot_") && !p.name?.includes("🤖") && !!p.socketId);
        }
        return !p.id.startsWith("bot_") && !p.name?.includes("🤖") && !!p.socketId;
      });

      if (humanPlayers.length > 0) {
        // This is a human team
        const teamFinalized = finSet.has(partId);
        const anyHumanFinalized = humanPlayers.some((hp) => finSet.has(hp.id));
        if (!teamFinalized && !anyHumanFinalized) {
          return true; // An active human participant has not finalized!
        }
      }
    } else {
      // It's an individual player
      const p = players.find((pl) => pl.id === partId);
      if (p && !isPlayerBot(p) && (isSandbox || !!p.socketId)) {
        if (!finSet.has(partId)) {
          return true;
        }
      }
    }
  }

  return false;
}

function evaluateAnswerCorrectness(
  question: any,
  submittedAnswer: string | string[]
): { isAutoCorrect: boolean | undefined; answerText: string } {
  if (!question) {
    return { isAutoCorrect: false, answerText: "(Không có câu hỏi)" };
  }
  const options = (question.options as any[]) || [];
  const ansArray = Array.isArray(submittedAnswer)
    ? submittedAnswer
    : submittedAnswer !== undefined && submittedAnswer !== null
    ? [String(submittedAnswer)]
    : [];

  if (ansArray.length === 0) {
    return { isAutoCorrect: false, answerText: "(Chưa chọn đáp án / Hết giờ)" };
  }

  const selectedOptions = options.filter((o: any) =>
    ansArray.some((ans) =>
      ans === o.id ||
      normalizeTextForComparison(ans) === normalizeTextForComparison(o.id) ||
      normalizeTextForComparison(ans) === normalizeTextForComparison(o.text)
    )
  );
  const answerText = selectedOptions.length > 0
    ? selectedOptions.map((o: any) => `${o.text}`).join(", ")
    : ansArray.join(", ");

  if (question.type === "ESSAY") {
    return { isAutoCorrect: undefined, answerText };
  }

  let isAutoCorrect = false;

  if (question.type === "MC_SINGLE") {
    const correctOption = options.find((o: any) => o.isCorrect);
    if (correctOption) {
      const normCorrectId = normalizeTextForComparison(correctOption.id);
      const normCorrectText = normalizeTextForComparison(correctOption.text || "");

      isAutoCorrect = ansArray.some((ans) => {
        const normAns = normalizeTextForComparison(ans);
        return (
          normAns === normCorrectId ||
          normAns === normCorrectText ||
          ans === correctOption.id
        );
      });
    }
  } else if (question.type === "TRUE_FALSE") {
    const correctOption = options.find((o: any) => o.isCorrect);
    if (correctOption) {
      const normCorrectId = normalizeTextForComparison(correctOption.id);
      const normCorrectText = normalizeTextForComparison(correctOption.text || "");

      isAutoCorrect = ansArray.some((ans) => {
        const normAns = normalizeTextForComparison(ans);
        return (
          normAns === normCorrectId ||
          normAns === normCorrectText ||
          ans === correctOption.id ||
          matchTrueFalseText(correctOption.text || correctOption.id, ans)
        );
      });
    }
  } else if (question.type === "MC_MULTI") {
    const correctOptions = options.filter((o: any) => o.isCorrect);
    const correctIds = new Set(correctOptions.map((o: any) => normalizeTextForComparison(o.id)));
    const correctTexts = new Set(correctOptions.map((o: any) => normalizeTextForComparison(o.text || "")));

    const submittedNormalized = ansArray.map((ans) => normalizeTextForComparison(ans));
    let matchedCount = 0;
    for (const sub of submittedNormalized) {
      if (correctIds.has(sub) || correctTexts.has(sub)) {
        matchedCount++;
      } else {
        matchedCount = -1;
        break;
      }
    }
    isAutoCorrect = matchedCount === correctOptions.length && correctOptions.length === ansArray.length;
  } else if (question.type === "FILL_BLANK") {
    const expected = question.answer || (options.find((o: any) => o.isCorrect)?.text) || "";
    const submitted = ansArray[0] || "";
    isAutoCorrect = matchFillBlankText(expected, submitted);
  }

  return { isAutoCorrect, answerText };
}

async function processAnswerSubmission({
  io,
  roomId,
  questionId,
  playerId,
  teamId,
  answer,
  clientAnsweredAt,
  isAdminOverride = false,
  socket,
}: {
  io: IO;
  roomId: string;
  questionId: string;
  playerId?: string;
  teamId?: string;
  answer: string | string[];
  clientAnsweredAt?: number;
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

  const activeQ = roomActiveQuestions.get(room.id);
  const isSandboxRoom = Boolean(
    room.name?.startsWith("[Sandbox]") ||
    (room.config as any)?.isSandbox ||
    roomSandboxActiveTeam.has(room.id) ||
    socket?.handshake?.query?.sandbox === "1"
  );

  if (activeQ?.timerPending && !isAdminOverride) {
    if (isSandboxRoom) {
      // In Sandbox, if a tester or bot answers while timer is pending, automatically activate the timer!
      activeQ.timerPending = false;
      activeQ.timerStarted = true;
      activeQ.startedAt = Date.now();
      const effLimit = getStandardQuestionTimeLimit(question);
      activeQ.endsAt = Date.now() + effLimit * 1000;
      io.to(`room:${room.code}`).emit("game:question", activeQ);
      io.to(`room:${room.code}`).emit("game:timer:started", {
        timeLimit: effLimit,
        endsAt: activeQ.endsAt,
        serverTime: Date.now(),
        questionId: question.id,
      });
      startQuestionTimer(io, room.code, room.id, question.id, effLimit);
    } else {
      if (socket) socket.emit("error", "Chưa đến giờ trả lời! Hãy chờ Admin bấm Bắt đầu tính giờ.");
      return;
    }
  }
  if (activeQ?.isExpired && !isAdminOverride) {
    const endsAt = activeQ.endsAt || (roomTimerEndsAt.get(room.id) ?? 0);
    const isWithinGrace = typeof clientAnsweredAt === "number" && endsAt > 0 && clientAnsweredAt <= (endsAt + 1500);
    if (!isWithinGrace) {
      if (socket) socket.emit("error", "Đã hết thời gian trả lời câu hỏi!");
      return;
    }
  }

  // Check if team is frozen
  if (teamId) {
    const frozenSet = roomFrozenTeams.get(qKey);
    if (frozenSet && frozenSet.has(teamId)) {
      if (socket) socket.emit("error", "Đội của bạn đang bị đóng băng ở câu này nên không thể nộp đáp án!");
      return;
    }
  }

  // Determine correctness via unified robust evaluator
  const evalResult = evaluateAnswerCorrectness(question, answer);
  const isCorrect = evalResult.isAutoCorrect;

  // Mode permissions check (supports both TEAM and INDIVIDUAL mode)
  let effectiveTeamId = teamId;

  if (!effectiveTeamId && playerId) {
    const pRecord = await prisma.player.findFirst({
      where: {
        roomId: room.id,
        OR: [
          { id: playerId },
          { socketId: socket?.id },
        ],
      },
      include: { team: true },
    });
    if (pRecord?.teamId) {
      effectiveTeamId = pRecord.teamId;
      if (socket) {
        const sess = socketPlayerSessions.get(socket.id);
        if (sess) sess.teamId = pRecord.teamId;
      }
    } else if (pRecord?.name?.includes("Tester") || playerId.startsWith("p_sb_") || playerId.startsWith("sb_")) {
      const activeSb = isSandboxRoom ? roomSandboxActiveTeam.get(room.id) : undefined;
      const primary = roomPrimaryTeams.get(qKey);
      let matchTeamId: string | undefined;
      const match = playerId?.match(/_t(\d+)/);
      if (match && room.teams.length > 0) {
        const rawIdx = parseInt(match[1], 10);
        matchTeamId = (rawIdx < room.teams.length ? room.teams[rawIdx]?.id : undefined) ||
                      (rawIdx >= 1 && rawIdx <= room.teams.length ? room.teams[rawIdx - 1]?.id : undefined);
      }
      effectiveTeamId = activeSb || matchTeamId || primary?.teamId || room.teams[0]?.id;
      if (effectiveTeamId && pRecord?.id) {
        await prisma.player.update({
          where: { id: pRecord.id },
          data: { teamId: effectiveTeamId },
        }).catch(() => {});
      }
    }
  }

  // Fallback for team modes if effectiveTeamId is still null
  if (!effectiveTeamId && room.teamMode === "TEAM" && room.teams.length > 0) {
    const pRecord = await prisma.player.findFirst({
      where: { roomId: room.id, OR: [{ id: playerId }, { socketId: socket?.id }] },
    });
    if (pRecord?.teamId) {
      effectiveTeamId = pRecord.teamId;
    } else if (isSandboxRoom) {
      const activeSb = roomSandboxActiveTeam.get(room.id);
      const match = playerId?.match(/_t(\d+)/);
      if (match) {
        const rawIdx = parseInt(match[1], 10);
        const teamBy0 = rawIdx < room.teams.length ? room.teams[rawIdx]?.id : undefined;
        const teamBy1 = (rawIdx >= 1 && rawIdx <= room.teams.length) ? room.teams[rawIdx - 1]?.id : undefined;
        effectiveTeamId = activeSb || teamBy0 || teamBy1 || room.teams[0]?.id;
      } else {
        effectiveTeamId = activeSb || room.teams[0]?.id;
      }
    }
  }

  const actorId = effectiveTeamId || playerId;

  if (room.mode === "BOUNCEBACK") {
    const stealInfo = roomStealBuzzed.get(qKey);
    const primary = roomPrimaryTeams.get(qKey);

    if (stealInfo) {
      const isStealActor = (effectiveTeamId && effectiveTeamId === stealInfo.teamId) ||
                           (actorId && actorId === stealInfo.teamId) ||
                           (playerId && (playerId === stealInfo.playerId || playerId === stealInfo.teamId));
      if (!isAdminOverride && !isStealActor) {
        if (socket) socket.emit("error", "Chỉ đội cướp chuông mới được trả lời!");
        return;
      }
    } else if (primary) {
      const isPrimaryActor = (effectiveTeamId && effectiveTeamId === primary.teamId) ||
                             (actorId && actorId === primary.teamId) ||
                             (playerId && playerId === primary.teamId);
      if (!isAdminOverride && !isPrimaryActor) {
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
    const isBuzzActor = buzz ? ((effectiveTeamId && effectiveTeamId === buzz.teamId) ||
                        (actorId && actorId === buzz.teamId) ||
                        (playerId && (playerId === buzz.playerId || playerId === buzz.teamId))) : false;
    if (!isAdminOverride && !isBuzzActor) {
      if (socket) socket.emit("error", "Chỉ đội bấm chuông đầu tiên mới được trả lời!");
      return;
    }
  } else if (room.mode === "TOURNAMENT") {
    const tournament = roomTournaments.get(room.id);
    const currentMatch = tournament?.matches.find((m) => m.id === tournament.currentMatchId);
    const isMatchActor = currentMatch && (
      actorId === currentMatch.team1Id ||
      actorId === currentMatch.team2Id ||
      effectiveTeamId === currentMatch.team1Id ||
      effectiveTeamId === currentMatch.team2Id
    );
    if (currentMatch && !isMatchActor && !isAdminOverride) {
      if (socket) socket.emit("error", "Chỉ 2 đội trong trận đối đầu hiện tại mới được trả lời!");
      return;
    }
  } else if (room.mode === "GRID_CARO") {
    const gridState = roomGridCaros.get(room.id);
    const isGridActor = gridState && (actorId === gridState.currentTurnTeamId || effectiveTeamId === gridState.currentTurnTeamId);
    if (gridState && !isGridActor && !isAdminOverride) {
      if (socket) socket.emit("error", "Hiện đang là lượt của đội khác!");
      return;
    }
  } else if (room.mode === "DICE_RACE") {
    const diceState = roomDiceRaces.get(room.id);
    const isDiceActor = diceState && (actorId === diceState.currentTurnTeamId || effectiveTeamId === diceState.currentTurnTeamId);
    if (diceState && !isDiceActor && !isAdminOverride) {
      if (socket) socket.emit("error", "Hiện đang là lượt của đội khác!");
      return;
    }
  } else if (room.mode === "MYSTERY_QUEST") {
    const questState = roomMysteryQuests.get(room.id);
    if (questState && questState.phase !== "QUESTION_ACTIVE" && !isAdminOverride) {
      if (socket) socket.emit("error", "Trò chơi đang ở giai đoạn Lật bài bí ẩn, không nhận đáp án câu hỏi!");
      return;
    }
    const isMysteryActor = questState && (actorId === questState.currentTurnTeamId || effectiveTeamId === questState.currentTurnTeamId);
    if (questState && !isMysteryActor && !isAdminOverride) {
      if (socket) socket.emit("error", `Hiện đang là lượt thi đấu của ${questState.currentTurnTeamName}! Đội bạn vui lòng chú ý theo dõi.`);
      return;
    }
  } else if (room.mode === "ELIMINATION" && !isAdminOverride) {
    // Eliminated teams act as Ghost teams: they can answer to build Revival momentum!
  }

  const now = Date.now();
  let qStartedAt = roomQuestionStartedAt.get(room.id);
  if (!qStartedAt) {
    if (activeQ?.startedAt) {
      qStartedAt = activeQ.startedAt;
    } else if (roomTimerEndsAt.has(room.id) && activeQ?.timeLimit) {
      qStartedAt = roomTimerEndsAt.get(room.id)! - (activeQ.timeLimit * 1000);
    } else {
      qStartedAt = now;
    }
  }

  let timeSpent = Math.max(100, now - qStartedAt);
  if (
    typeof clientAnsweredAt === "number" &&
    clientAnsweredAt >= qStartedAt - 500 &&
    clientAnsweredAt <= now + 500
  ) {
    timeSpent = Math.max(100, clientAnsweredAt - qStartedAt);
  }
  const maxAllowedLimitMs = ((activeQ?.timeLimit || question?.timeLimit || 30) * 1000);
  timeSpent = Math.min(timeSpent, maxAllowedLimitMs);

  // Upsert Answer in database: Allows continuous answer switching while timer is running!
  const targetTeamId = effectiveTeamId;
  const targetPlayerId = playerId;

  const isTeamMode = room.teamMode === "TEAM" ||
    room.mode === "BOUNCEBACK" ||
    room.mode === "BUZZ" ||
    room.mode === "GRID_CARO" ||
    room.mode === "DICE_RACE" ||
    room.mode === "TOURNAMENT" ||
    room.mode === "WAGER";

  // Check if incoming submission is from a human tester/player
  const isTesterPlayer = Boolean(
    playerId?.startsWith("p_sb_") ||
    playerId?.startsWith("sb_") ||
    (socket?.handshake?.query?.sandbox === "1" && !playerId?.startsWith("bot_")) ||
    (isSandboxRoom && !playerId?.startsWith("bot_"))
  );

  // Check if incoming submission is from a bot
  const isBotSender = !isTesterPlayer && (
    isPlayerBot({ id: playerId }) ||
    Boolean(socket?.handshake?.query?.sandbox === "1" && playerId?.startsWith("bot_"))
  );

  // Anti-collision: If a human player is in this team, Bot must NEVER submit or overwrite!
  if (targetTeamId && isBotSender) {
    if (isSandboxRoom && roomSandboxActiveTeam.get(room.id) === targetTeamId) {
      console.log(`[processAnswerSubmission] Ignored bot answer for active sandbox human team ${targetTeamId}`);
      return;
    }
    const teamMembers = await prisma.player.findMany({
      where: { roomId: room.id, teamId: targetTeamId },
    });
    const hasHumanMember = teamMembers.some((m) =>
      !isPlayerBot(m) && (m.socketId || m.name?.includes("Tester") || m.id?.startsWith("p_sb_") || m.id?.startsWith("sb_"))
    );
    if (hasHumanMember) {
      console.log(`[processAnswerSubmission] Ignored bot answer for human-controlled team ${targetTeamId}`);
      return;
    }
  }

  let existingAnswer: any = null;
  if (isTeamMode && targetTeamId) {
    existingAnswer = await prisma.answer.findFirst({
      where: { roomId: room.id, questionId, teamId: targetTeamId },
      orderBy: { submittedAt: "desc" },
    });
  } else if (targetPlayerId) {
    existingAnswer = await prisma.answer.findFirst({
      where: { roomId: room.id, questionId, playerId: targetPlayerId },
      orderBy: { submittedAt: "desc" },
    });
  }

  // If existing answer was submitted by a human, and incoming is a bot, reject bot!
  if (existingAnswer && targetTeamId && isBotSender) {
    const prevSubWasHuman = existingAnswer.playerId && !isPlayerBot({ id: existingAnswer.playerId });
    if (prevSubWasHuman) {
      console.log(`[processAnswerSubmission] Prevented bot from overwriting human answer for team ${targetTeamId}`);
      return;
    }
  }

  // Check if existing answer was submitted by a bot:
  let existingWasBot = false;
  if (existingAnswer?.playerId) {
    if (isPlayerBot({ id: existingAnswer.playerId }) || existingAnswer.playerId.startsWith("bot_")) {
      existingWasBot = true;
    } else {
      const prevPlayer = await prisma.player.findUnique({
        where: { id: existingAnswer.playerId },
        select: { id: true, name: true },
      }).catch(() => null);
      if (prevPlayer && isPlayerBot(prevPlayer)) {
        existingWasBot = true;
      }
    }
  }

  // If a bot submitted earlier, but now a human player/tester is submitting,
  // or if in Sandbox a tester is submitting for a team whose answer was from a bot or another actor,
  // the human MUST override the bot answer (do not block human by bot placeholder submission)!
  const isHumanOverridingBot = !isBotSender && (
    existingWasBot ||
    (isSandboxRoom && (
      existingAnswer?.playerId !== targetPlayerId ||
      roomSandboxActiveTeam.get(room.id) === targetTeamId
    ))
  );

  if (isHumanOverridingBot) {
    console.log(`[processAnswerSubmission] Human player/tester overriding prior bot/placeholder answer for team ${targetTeamId || playerId}`);
  }

  const isUpdate = Boolean(existingAnswer);
  const normalizedAnswer = Array.isArray(answer) ? answer : [answer];

  // 1. BOUNCEBACK Steal Team rule: Đội bấm chuông chỉ tính MỘT LẦN TRẢ LỜI DUY NHẤT (Admin không thể chỉnh điều đó)!
  const isBouncebackSteal = room.mode === "BOUNCEBACK" && roomStealBuzzed.has(qKey);
  if (isBouncebackSteal && existingAnswer && !isAdminOverride && !isHumanOverridingBot) {
    if (socket) socket.emit("error", "Đội bấm chuông chỉ được chọn 1 đáp án duy nhất!");
    return;
  }

  // 2. Chế độ cấu hình tuỳ chỉnh SINGLE_SUBMIT ở các mode khác:
  const config = room.config as any;
  const isSingleSubmitMode = config?.answerSubmissionMode === "SINGLE_SUBMIT";
  if (!isBouncebackSteal && isSingleSubmitMode && existingAnswer && !isAdminOverride && !isHumanOverridingBot) {
    const existingVal = Array.isArray(existingAnswer.answer) ? existingAnswer.answer : [existingAnswer.answer];
    const isSameAnswer = JSON.stringify(existingVal) === JSON.stringify(normalizedAnswer);
    if (!isSameAnswer) {
      if (socket) socket.emit("error", "Chế độ này chỉ cho phép chọn 1 lần duy nhất, bạn đã hoàn thành câu hỏi!");
      return;
    }
  }

  // Verify foreign key integrity before persisting to avoid unhandled database constraint exceptions
  let safePlayerId: string | null = null;
  if (targetPlayerId) {
    const pExists = await prisma.player.findUnique({
      where: { id: targetPlayerId },
      select: { id: true },
    }).catch(() => null);
    if (pExists) {
      safePlayerId = pExists.id;
    } else if (socket?.id) {
      const sockPlayer = await prisma.player.findFirst({
        where: { roomId: room.id, socketId: socket.id },
        select: { id: true },
      }).catch(() => null);
      if (sockPlayer) {
        safePlayerId = sockPlayer.id;
      }
    }
  }

  let safeTeamId: string | null = null;
  if (targetTeamId) {
    const tExists = await prisma.team.findUnique({
      where: { id: targetTeamId },
      select: { id: true },
    }).catch(() => null);
    if (tExists) {
      safeTeamId = tExists.id;
    }
  }

  try {
    if (existingAnswer) {
      await prisma.answer.update({
        where: { id: existingAnswer.id },
        data: {
          answer: normalizedAnswer,
          isCorrect: question.type === "ESSAY" ? null : isCorrect,
          timeSpent: isAdminOverride ? 0 : timeSpent,
          submittedAt: new Date(),
          teamId: safeTeamId ?? existingAnswer.teamId,
          playerId: safePlayerId ?? existingAnswer.playerId,
        },
      });
      if (safeTeamId) {
        await prisma.answer.deleteMany({
          where: {
            roomId: room.id,
            questionId,
            teamId: safeTeamId,
            id: { not: existingAnswer.id },
          },
        }).catch(() => {});
      }
    } else {
      await prisma.answer.create({
        data: {
          roomId: room.id,
          questionId,
          playerId: safePlayerId,
          teamId: safeTeamId,
          answer: normalizedAnswer,
          isCorrect: question.type === "ESSAY" ? null : isCorrect,
          pointsAwarded: 0,
          timeSpent: isAdminOverride ? 0 : timeSpent,
        },
      });
    }
  } catch (err: any) {
    console.error("[processAnswerSubmission] Error persisting answer:", err?.message);
    if (err?.code === "P2003" || err?.message?.includes("foreign key")) {
      try {
        await prisma.answer.create({
          data: {
            roomId: room.id,
            questionId,
            playerId: null,
            teamId: safeTeamId,
            answer: normalizedAnswer,
            isCorrect: question.type === "ESSAY" ? null : isCorrect,
            pointsAwarded: 0,
            timeSpent: isAdminOverride ? 0 : timeSpent,
          },
        });
      } catch (innerErr) {
        console.error("[processAnswerSubmission] Fallback create failed:", innerErr);
      }
    }
  }

  // 1. Send positive acknowledgment (Ack) to the submitting player
  if (socket) {
    socket.emit("game:answer:ack", {
      questionId,
      answer: normalizedAnswer,
      isUpdate,
      success: true,
    });
  }

  // 2. Broadcast live answer notification to Admin Host dashboard and room
  const playerObj = playerId ? await prisma.player.findUnique({ where: { id: playerId } }).catch(() => null) : null;
  const teamObj = effectiveTeamId ? await prisma.team.findUnique({ where: { id: effectiveTeamId } }).catch(() => null) : null;

  const answerReceivedPayload = {
    teamId: effectiveTeamId,
    playerId,
    playerName: playerObj?.name || "Thí sinh",
    teamName: teamObj?.name,
    questionId,
    answer: normalizedAnswer,
    isUpdate,
  };
  io.to(`room:${room.code}:admin`).emit("game:answer:received", answerReceivedPayload);
  // Note: do NOT broadcast game:answer:received to the full room (player clients).
  // Only admins need to see live answer notifications. Broadcasting to players can
  // cause unintended cross-device state contamination.

  // 3. Nếu là Đội cướp chuông Bounceback: Chốt ngay lập tức và chuyển sang MC phán quyết
  if (isBouncebackSteal && !isAdminOverride) {
    stopQuestionTimer(room.id);
    const stealInfo = roomStealBuzzed.get(qKey);
    const activeQ = roomActiveQuestions.get(room.id);
    const { isAutoCorrect, answerText } = evaluateAnswerCorrectness(question, normalizedAnswer);

    io.to(`room:${room.code}`).emit("game:early_completed", {
      questionId,
      reason: "ALL_SUBMITTED",
      message: "Đội cướp chuông đã chốt đáp án duy nhất!",
    });
    io.to(`room:${room.code}`).emit("game:timer", { remaining: 0, total: activeQ?.timeLimit || 30, endsAt: Date.now(), serverTime: Date.now() });
    io.to(`room:${room.code}`).emit("game:timer:expired", { questionId });

    if (activeQ) {
      activeQ.bouncebackAwaitingJudgment = "STEAL";
      activeQ.bouncebackStealAnswer = normalizedAnswer;
      activeQ.bouncebackAutoCorrect = isAutoCorrect;
      activeQ.bouncebackAnswerText = answerText;
      io.to(`room:${room.code}`).emit("game:question", activeQ);
    }
    io.to(`room:${room.code}`).emit("game:bounceback:awaiting_judgment", {
      phase: "STEAL",
      targetTeamId: stealInfo?.teamId || "",
      targetTeamName: stealInfo?.teamName || "",
      answer: normalizedAnswer,
      points: roomBouncebackSelectedPoints.get(qKey) ?? 20,
      isAutoCorrect,
      answerText,
    });
    return;
  }

  // 3b. Nếu là Đội chính Bounceback trong chế độ bấm 1 lần: Chốt đáp án và chuyển sang MC phán quyết
  if (room.mode === "BOUNCEBACK" && !isBouncebackSteal && isSingleSubmitMode && !isAdminOverride) {
    stopQuestionTimer(room.id);
    const primary = roomPrimaryTeams.get(qKey);
    const activeQ = roomActiveQuestions.get(room.id);
    const { isAutoCorrect, answerText } = evaluateAnswerCorrectness(question, normalizedAnswer);

    io.to(`room:${room.code}`).emit("game:early_completed", {
      questionId,
      reason: "ALL_SUBMITTED",
      message: "Đội chính đã chốt đáp án (1 lần duy nhất)!",
    });
    io.to(`room:${room.code}`).emit("game:timer", { remaining: 0, total: activeQ?.timeLimit || 30, endsAt: Date.now(), serverTime: Date.now() });
    io.to(`room:${room.code}`).emit("game:timer:expired", { questionId });

    if (activeQ) {
      activeQ.bouncebackAwaitingJudgment = "PRIMARY";
      activeQ.bouncebackPrimaryAnswer = normalizedAnswer;
      activeQ.bouncebackAutoCorrect = isAutoCorrect;
      activeQ.bouncebackAnswerText = answerText;
      io.to(`room:${room.code}`).emit("game:question", activeQ);
    }
    io.to(`room:${room.code}`).emit("game:bounceback:awaiting_judgment", {
      phase: "PRIMARY",
      targetTeamId: primary?.teamId || "",
      targetTeamName: primary?.teamName || "",
      answer: normalizedAnswer,
      points: roomBouncebackSelectedPoints.get(qKey) ?? 20,
      isAutoCorrect,
      answerText,
    });
    return;
  }

  // 3c. Nếu là BUZZ mode: khi đội bấm chuông nộp đáp án trên thiết bị
  if (room.mode === "BUZZ" && !isAdminOverride) {
    stopQuestionTimer(room.id);
    const { isAutoCorrect } = evaluateAnswerCorrectness(question, normalizedAnswer);
    if (question.type !== "ESSAY") {
      await finalizeBuzzAnswer(io, room.id, room.code, questionId, isAutoCorrect);
      return;
    }
  }

  // 4. Ghi nhận actor này đã nộp ít nhất 1 lần
  const actorKey = targetTeamId || targetPlayerId;
  if (actorKey) {
    let subSet = roomSubmittedActors.get(qKey);
    if (!subSet) {
      subSet = new Set<string>();
      roomSubmittedActors.set(qKey, subSet);
    }
    subSet.add(actorKey);
  }

  // 5. Smart Auto-Complete: Kiểm tra nếu tất cả thí sinh/đội hợp lệ đã nộp bài đầy đủ
  if (!isAdminOverride) {
    const isMcMode = (room.config as any)?.answerMethod === "MC";
    const subBehavior = (room.config as any)?.submissionBehavior || "ALLOW_CHANGE";

    // Khi chọn chế độ MC trả lời: MC chọn đáp án và công bố đáp án hoàn toàn thủ công, không tự động kết thúc!
    if (!isMcMode && subBehavior === "SINGLE_SUBMIT") {
      const activeParticipants = await getActiveParticipantsForQuestion(room, questionId);
      const subSet = roomSubmittedActors.get(qKey) || new Set<string>();
      const hasPendingHumans = await hasUnfinalizedHumanParticipants(room, questionId, subSet);
      if (!hasPendingHumans && activeParticipants.length > 0 && activeParticipants.every((id) => subSet.has(id))) {
        stopQuestionTimer(room.id);
        const activeQ = roomActiveQuestions.get(room.id);
        io.to(`room:${room.code}`).emit("game:timer", { remaining: 0, total: activeQ?.timeLimit || 30, endsAt: Date.now(), serverTime: Date.now() });
        io.to(`room:${room.code}`).emit("game:timer:expired", { questionId });
        io.to(`room:${room.code}`).emit("game:early_completed", {
          questionId,
          reason: "ALL_SUBMITTED",
          message: "Tất cả các đội đã hoàn thành chọn đáp án! Đang chuẩn bị công bố đáp án...",
        });
        setTimeout(async () => {
          await finalizeQuestionOnTimeUp(io, room.id, room.code, questionId);
        }, 2500);
      }
    }
  }
}

// ── BUZZ Mode Helpers ─────────────────────────────────────────────────────────

async function openBuzzWindow(io: IO, roomId: string, roomCode: string, questionId: string, customDurationMs?: number) {
  const qKey = `${roomId}:${questionId}`;
  if (roomBuzzWindowTimers.has(qKey)) {
    clearTimeout(roomBuzzWindowTimers.get(qKey)!);
    roomBuzzWindowTimers.delete(qKey);
  }

  let remainingMs = customDurationMs ?? roomBuzzWindowRemaining.get(qKey);
  if (remainingMs === undefined || remainingMs <= 100) {
    remainingMs = 5000;
  }
  roomBuzzWindowRemaining.set(qKey, remainingMs);

  const attempts = roomBuzzAttemptOrder.get(qKey) || [];
  const room = await prisma.room.findUnique({ where: { id: roomId }, select: { teamMode: true } });
  const isTeamMode = room?.teamMode === "TEAM";
  const totalActors = isTeamMode
    ? await prisma.team.count({ where: { roomId } })
    : await prisma.player.count({ where: { roomId } });
  const disqSet = roomBuzzDisqualified.get(qKey) || new Set<string>();
  const maxAttempts = totalActors <= 2 ? 2 : 3;
  const eligibleCount = Math.max(0, totalActors - disqSet.size);

  if (attempts.length >= maxAttempts || eligibleCount === 0) {
    roomBuzzUnlocked.set(qKey, false);
    const currQ = roomActiveQuestions.get(roomId);
    if (currQ) {
      currQ.buzzUnlocked = false;
      currQ.buzzWindowActive = false;
      io.to(`room:${roomCode}`).emit("game:question", currQ);
    }
    io.to(`room:${roomCode}`).emit("game:buzz:closed");
    await revealCurrentAnswer(io, roomId, roomCode, questionId);
    return;
  }

  const nextAttemptNum = attempts.length + 1;
  const nextMultiplier = nextAttemptNum === 1 ? 1.5 : nextAttemptNum === 2 ? 1.0 : 0.5;

  roomBuzzUnlocked.set(qKey, true);
  roomBuzzWindowOpenedAt.set(qKey, Date.now());
  const endsAt = Date.now() + remainingMs;
  roomBuzzWindowEndsAt.set(qKey, endsAt);

  const activeQ = roomActiveQuestions.get(roomId);
  if (activeQ) {
    activeQ.buzzUnlocked = true;
    activeQ.buzzWindowActive = true;
    activeQ.buzzWindowEndsAt = endsAt;
    activeQ.buzzAttemptNumber = nextAttemptNum;
    activeQ.buzzMaxAttempts = maxAttempts;
    activeQ.buzzMultiplier = nextMultiplier;
    activeQ.buzzDisqualifiedTeamIds = Array.from(disqSet);
    activeQ.buzzedTeamId = undefined;
    activeQ.buzzedTeamName = undefined;
    activeQ.buzzedBy = undefined;
    activeQ.buzzAnsweringActive = false;
    io.to(`room:${roomCode}`).emit("game:question", activeQ);
  }

  io.to(`room:${roomCode}`).emit("game:buzz:unlocked", {
    remainingSeconds: Math.ceil(remainingMs / 1000),
    attemptNumber: nextAttemptNum,
    maxAttempts,
    multiplier: nextMultiplier,
    endsAt,
  });

  const timer = setTimeout(async () => {
    roomBuzzWindowTimers.delete(qKey);
    roomBuzzUnlocked.set(qKey, false);
    roomBuzzWindowRemaining.set(qKey, 0);

    const currQ = roomActiveQuestions.get(roomId);
    if (currQ) {
      currQ.buzzUnlocked = false;
      currQ.buzzWindowActive = false;
      io.to(`room:${roomCode}`).emit("game:question", currQ);
    }
    io.to(`room:${roomCode}`).emit("game:buzz:closed");
    await revealCurrentAnswer(io, roomId, roomCode, questionId);
  }, remainingMs + 350);

  roomBuzzWindowTimers.set(qKey, timer);
}

async function finalizeBuzzAnswer(
  io: IO,
  roomId: string,
  roomCode: string,
  questionId: string,
  overrideIsCorrect?: boolean
) {
  const qKey = `${roomId}:${questionId}`;
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

  let isCorrect = false;
  if (typeof overrideIsCorrect === "boolean") {
    isCorrect = overrideIsCorrect;
  } else if (existingAns && typeof existingAns.isCorrect === "boolean") {
    isCorrect = existingAns.isCorrect;
  }

  const attemptNum = buzz.attemptNumber || 1;
  const buzzMultiplier = buzz.multiplier || (attemptNum === 1 ? 1.5 : attemptNum === 2 ? 1.0 : 0.5);

  const teamCardsMap = roomQuestionTeamCards.get(qKey);
  const activeCards = teamCardsMap?.get(effTeamId) || [];
  let cardMultiplier = 1;
  if (activeCards.some((c) => c.type === "DOUBLE" || c.type === "SCORE_X2")) cardMultiplier = 2;

  let points = 0;
  if (isCorrect) {
    points = Math.round(question.points * buzzMultiplier * cardMultiplier);
  } else {
    // Theo luật mới: Đội sai không bị trừ điểm, chỉ mất cơ hội
    points = 0;
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
        isCorrect,
        pointsAwarded: points,
        timeSpent: 0,
      },
    });
  }

  if (isCorrect) {
    roomQuestionProcessed.add(qKey);
    roomBuzzUnlocked.set(qKey, false);

    if (points > 0) {
      const tRes = await applyScoreDeltaToTeam(effTeamId, points);
      io.to(`room:${roomCode}`).emit("game:score:update", [
        { teamId: effTeamId, score: tRes.newScore, delta: tRes.effectiveDelta },
      ]);
    }

    await revealCurrentAnswer(io, roomId, roomCode, questionId);
  } else {
    // Đội sai: Không bị trừ điểm. Đánh dấu loại khỏi câu hỏi này.
    let disqSet = roomBuzzDisqualified.get(qKey);
    if (!disqSet) {
      disqSet = new Set<string>();
      roomBuzzDisqualified.set(qKey, disqSet);
    }
    disqSet.add(effTeamId);

    // Giải phóng lượt buzz hiện tại
    roomBuzzFirst.delete(qKey);

    const attempts = roomBuzzAttemptOrder.get(qKey) || [];
    const isTeamMode = room.teamMode === "TEAM";
    const totalActors = isTeamMode
      ? await prisma.team.count({ where: { roomId } })
      : await prisma.player.count({ where: { roomId } });
    const maxAttempts = totalActors <= 2 ? 2 : 3;
    const eligibleCount = Math.max(0, totalActors - disqSet.size);

    // Theo yêu cầu người dùng: Mỗi lần mở chuông lại cho lượt mới (lần 2, lần 3) đều được cấp một cửa sổ chuông 5 giây mới (5s)!
    const freshWindowMs = 5000;
    roomBuzzWindowRemaining.set(qKey, freshWindowMs);

    if (attempts.length < maxAttempts && eligibleCount > 0) {
      io.to(`room:${roomCode}`).emit("game:buzz:wrong_attempt", {
        teamId: effTeamId,
        teamName: buzz.teamName,
        attemptNumber: attemptNum,
        maxAttempts,
        remainingSeconds: 5,
        canRetry: true,
        disqualifiedTeamIds: Array.from(disqSet),
      });

      // Mở lại chuông với thời gian 5s mới cho các đội khác bấm!
      await openBuzzWindow(io, roomId, roomCode, questionId, freshWindowMs);
    } else {
      // Hết số lần bấm tối đa hoặc hết đội -> Chốt kết thúc câu và hiện đáp án
      roomQuestionProcessed.add(qKey);
      roomBuzzUnlocked.set(qKey, false);
      io.to(`room:${roomCode}`).emit("game:buzz:closed");
      await revealCurrentAnswer(io, roomId, roomCode, questionId);
    }
  }
}

async function finalizeTournamentQuestion(io: IO, roomId: string, roomCode: string, questionId: string) {
  const qKey = `${roomId}:${questionId}`;
  if (roomQuestionProcessed.has(qKey)) return;
  roomQuestionProcessed.add(qKey);

  const tournament = roomTournaments.get(roomId);
  const room = await prisma.room.findUnique({
    where: { id: roomId },
    include: { teams: { include: { players: true } } },
  });
  const question = await prisma.question.findUnique({ where: { id: questionId } });
  if (!tournament || !room || !question) return;

  const currentMatch = tournament.matches.find((m) => m.id === tournament.currentMatchId);
  if (!currentMatch) return;

  const isSandboxRoom = Boolean(
    room.name?.startsWith("[Sandbox]") ||
    (room.config as any)?.isSandbox ||
    roomSandboxActiveTeam.has(room.id)
  );

  const t1Ans = currentMatch.team1Id
    ? await prisma.answer.findFirst({
        where: { roomId, questionId, teamId: currentMatch.team1Id },
        orderBy: { submittedAt: "desc" },
      })
    : null;
  const t2Ans = currentMatch.team2Id
    ? await prisma.answer.findFirst({
        where: { roomId, questionId, teamId: currentMatch.team2Id },
        orderBy: { submittedAt: "desc" },
      })
    : null;

  const scoreUpdates: ScoreUpdate[] = [];

  const team1Obj = room.teams.find((t) => t.id === currentMatch.team1Id);
  const team2Obj = room.teams.find((t) => t.id === currentMatch.team2Id);
  const team1HasHuman = team1Obj?.players?.some((p) => !isPlayerBot(p)) ?? true;
  const team2HasHuman = team2Obj?.players?.some((p) => !isPlayerBot(p)) ?? true;

  if (t1Ans && t1Ans.isCorrect && currentMatch.team1Id && (isSandboxRoom || team1HasHuman)) {
    currentMatch.team1Score += question.points;
    const tRes = await applyScoreDeltaToTeam(currentMatch.team1Id, question.points);
    scoreUpdates.push({ teamId: currentMatch.team1Id, score: tRes.newScore, delta: tRes.effectiveDelta });
  }

  if (t2Ans && t2Ans.isCorrect && currentMatch.team2Id && (isSandboxRoom || team2HasHuman)) {
    currentMatch.team2Score += question.points;
    const tRes = await applyScoreDeltaToTeam(currentMatch.team2Id, question.points);
    scoreUpdates.push({ teamId: currentMatch.team2Id, score: tRes.newScore, delta: tRes.effectiveDelta });
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

    // Award Oracle Points (+10 points) for spectators who correctly predicted the winner
    if (currentMatch.predictions && winnerId) {
      tournament.oracleScores = tournament.oracleScores || {};
      for (const [predTeamId, predWinnerId] of Object.entries(currentMatch.predictions)) {
        if (predWinnerId === winnerId) {
          tournament.oracleScores[predTeamId] = (tournament.oracleScores[predTeamId] || 0) + 10;
        }
      }
      io.to(`room:${roomCode}`).emit("tournament:oracle:update", { oracleScores: tournament.oracleScores });
    }
  }

  if (scoreUpdates.length > 0) {
    io.to(`room:${roomCode}`).emit("game:score:update", scoreUpdates);
  }
  io.to(`room:${roomCode}`).emit("game:tournament:update", tournament);
  await persistGameStateSnapshot(roomId);
  await revealCurrentAnswer(io, roomId, roomCode, questionId);
}

async function advanceGridToBoard(io: IO, roomId: string, roomCode: string) {
  const autoAdvanceKey = `${roomId}:auto_advance`;
  if (roomGridTimers.has(autoAdvanceKey)) {
    clearInterval(roomGridTimers.get(autoAdvanceKey)!);
    roomGridTimers.delete(autoAdvanceKey);
  }

  const gridState = roomGridCaros.get(roomId);
  const room = await prisma.room.findUnique({ where: { id: roomId }, include: { teams: true } });
  if (!gridState || !room) return;

  gridState.autoAdvanceSeconds = undefined;
  gridState.selectedCellId = undefined;
  gridState.selectedCellAnimation = false;
  gridState.selectedCellInfo = undefined;
  gridState.questionReady = false;
  roomActiveQuestions.delete(roomId);

  gridState.turnsCompleted = (gridState.turnsCompleted || 0) + 1;
  const numTeams = Math.max(1, room.teams.length);
  gridState.currentRound = Math.min(gridState.maxRounds, Math.floor(gridState.turnsCompleted / numTeams) + 1);

  if (room.teams.length > 0) {
    const curIdx = room.teams.findIndex((t) => t.id === gridState.currentTurnTeamId);
    const nextIdx = (curIdx + 1) % room.teams.length;
    gridState.currentTurnTeamId = room.teams[nextIdx].id;
    gridState.currentTurnTeamName = room.teams[nextIdx].name;
  }

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
  const room = await prisma.room.findUnique({
    where: { id: roomId },
    include: { teams: { include: { players: true } } },
  });
  const question = await prisma.question.findUnique({ where: { id: questionId } });
  if (!gridState || !room || !question) return;

  const isSandboxRoom = Boolean(
    room.name?.startsWith("[Sandbox]") ||
    (room.config as any)?.isSandbox ||
    roomSandboxActiveTeam.has(room.id)
  );

  const currentTeamId = gridState.currentTurnTeamId;
  const currentTeam = room.teams.find((t) => t.id === currentTeamId);
  const cell = gridState.selectedCellId ? gridState.cells.find((c) => c.id === gridState.selectedCellId) : null;
  const hasHuman = currentTeam?.players?.some((p) => !isPlayerBot(p)) ?? true;

  const scoreUpdates: ScoreUpdate[] = [];

  if (currentTeam && cell && (isSandboxRoom || hasHuman)) {
    const ans = await prisma.answer.findFirst({
      where: { roomId, questionId, teamId: currentTeam.id },
      orderBy: { submittedAt: "desc" },
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

      if (ans) {
        await prisma.answer.update({
          where: { id: ans.id },
          data: { pointsAwarded: awardedPoints },
        }).catch(console.error);
      }

      const tRes = await applyScoreDeltaToTeam(currentTeam.id, awardedPoints);
      scoreUpdates.push({ teamId: currentTeam.id, score: tRes.newScore, delta: tRes.effectiveDelta });
    } else {
      cell.isCompleted = false;
      cell.claimedByTeamId = undefined;
      cell.claimedByTeamName = undefined;
      cell.claimedByTeamColor = undefined;
      cell.attemptCount = (cell.attemptCount || 0) + 1;
      cell.questionId = undefined; // Cleared so next selection gets fresh unused question with same points
    }
  }

  gridState.autoAdvanceSeconds = undefined;

  if (scoreUpdates.length > 0) {
    io.to(`room:${roomCode}`).emit("game:score:update", scoreUpdates);
  }
  io.to(`room:${roomCode}`).emit("game:grid:update", gridState);
  await persistGameStateSnapshot(roomId);
  await revealCurrentAnswer(io, roomId, roomCode, questionId);
}

async function finalizeDiceRaceQuestion(io: IO, roomId: string, roomCode: string, questionId: string) {
  const qKey = `${roomId}:${questionId}`;
  if (roomQuestionProcessed.has(qKey)) return;
  roomQuestionProcessed.add(qKey);

  const diceState = roomDiceRaces.get(roomId);
  const room = await prisma.room.findUnique({
    where: { id: roomId },
    include: { teams: { include: { players: true } } },
  });
  const question = await prisma.question.findUnique({ where: { id: questionId } });
  if (!diceState || !room || !question) return;

  const isSandboxRoom = Boolean(
    room.name?.startsWith("[Sandbox]") ||
    (room.config as any)?.isSandbox ||
    roomSandboxActiveTeam.has(room.id)
  );

  const currentTeamId = diceState.currentTurnTeamId;
  const currentTeam = room.teams.find((t) => t.id === currentTeamId);
  const hasHuman = currentTeam?.players?.some((p) => !isPlayerBot(p)) ?? true;
  const scoreUpdates: ScoreUpdate[] = [];

  const ans = await prisma.answer.findFirst({
    where: { roomId, questionId, teamId: currentTeamId },
    orderBy: { submittedAt: "desc" },
  });

  const isCorrect = ans?.isCorrect === true && (isSandboxRoom || hasHuman);

  if (isCorrect && currentTeamId) {
    // Trả lời đúng: ĐƯỢC QUYỀN GIEO XÚC XẮC! (Xếp hạng theo vị trí ô đua cờ, không cộng điểm độc lập)
    diceState.canRollDice = true;
    diceState.dicePendingAnswer = false;
  } else {
    // Trả lời sai hoặc không trả lời: chuyển lượt cho đội tiếp theo
    diceState.dicePendingAnswer = false;
    if (room.teams.length > 0) {
      const curIdx = room.teams.findIndex((t) => t.id === currentTeamId);
      const nextIdx = (curIdx + 1) % room.teams.length;
      diceState.currentTurnTeamId = room.teams[nextIdx].id;
      diceState.currentTurnTeamName = room.teams[nextIdx].name;
    }
    diceState.canRollDice = false;
  }

  io.to(`room:${roomCode}`).emit("game:dice:update", diceState);
  await persistGameStateSnapshot(roomId);
  await revealCurrentAnswer(io, roomId, roomCode, questionId);
}

async function finalizeWagerQuestion(io: IO, roomId: string, roomCode: string, questionId: string) {
  const qKey = `${roomId}:${questionId}`;
  if (roomQuestionProcessed.has(qKey)) return;
  roomQuestionProcessed.add(qKey);

  const wagerState = roomWagers.get(roomId);
  const room = await prisma.room.findUnique({
    where: { id: roomId },
    include: { teams: { include: { players: true } } },
  });
  const question = await prisma.question.findUnique({ where: { id: questionId } });
  if (!wagerState || !room || !question) return;

  wagerState.phase = "REVEAL_PERIOD";
  const scoreUpdates: ScoreUpdate[] = [];
  const teamSummaries: TeamRevealSummary[] = [];

  const lastWagerTeamId = wagerState.lastWagerTeamId;
  const wagerAmount = wagerState.currentHighestWager || 10;
  const basePoints = question.points || 20;

  // 1. Điểm cho các đội không cược khi đúng: cố định 1/2 điểm gốc câu hỏi (5đ / 10đ / 15đ), sai = 0đ
  const nonWagerCorrectPoints = Math.max(5, Math.floor(basePoints / 2));

  // 2. Thu thập câu trả lời mới nhất của tất cả các đội cho câu hỏi này
  const teamAnswers = await prisma.answer.findMany({
    where: { roomId, questionId },
    orderBy: { submittedAt: "desc" },
  });
  const answerMap = new Map<string, any>();
  for (const ans of teamAnswers) {
    if (ans.teamId && !answerMap.has(ans.teamId)) {
      answerMap.set(ans.teamId, ans);
    }
  }

  const isSandboxRoom = Boolean(
    room.name?.startsWith("[Sandbox]") ||
    (room.config as any)?.isSandbox ||
    roomSandboxActiveTeam.has(room.id)
  );

  // 3. Đếm số đội KHÁC (không phải đội cược) trả lời ĐÚNG
  let otherCorrectCount = 0;
  for (const team of room.teams) {
    if (team.id !== lastWagerTeamId) {
      const hasHuman = team.players?.some((p: any) => !isPlayerBot(p)) ?? true;
      if (!isSandboxRoom && !hasHuman) continue;
      const ans = answerMap.get(team.id);
      if (ans?.isCorrect === true) {
        otherCorrectCount++;
      }
    }
  }

  // 4. Tính điểm phạt cho Đội cược nếu trả lời SAI:
  // Đơn vị phạt U = Round(Mức cược / 2), làm tròn về số chia hết cho 5 gần nhất
  const unitPenalty = Math.max(5, Math.round((wagerAmount / 2) / 5) * 5);

  // Quy tắc phạt theo điểm gốc câu hỏi:
  // - Cả 4 đội đều sai (otherCorrectCount = 0): phạt 0 điểm
  // - Câu 10đ: có ít nhất 1 đội khác đúng -> phạt 1 * unitPenalty
  // - Câu 20đ: mỗi đội khác đúng phạt 1 * unitPenalty (tối đa 2 đội)
  // - Câu 30đ: mỗi đội khác đúng phạt 1 * unitPenalty (tối đa 3 đội)
  let wagerPenalty = 0;
  if (otherCorrectCount > 0) {
    const maxPenaltyTeams = basePoints <= 10 ? 1 : (basePoints <= 20 ? 2 : 3);
    const effectiveTeams = Math.min(otherCorrectCount, maxPenaltyTeams);
    wagerPenalty = effectiveTeams * unitPenalty;
  }

  for (const team of room.teams) {
    const hasHuman = team.players?.some((p: any) => !isPlayerBot(p)) ?? true;
    if (!isSandboxRoom && !hasHuman) {
      scoreUpdates.push({ teamId: team.id, score: team.score, delta: 0 });
      teamSummaries.push({
        teamId: team.id,
        teamName: team.name,
        teamColor: team.color,
        totalOnlineMembers: 0,
        correctMembers: 0,
        pointsAwarded: 0,
        speedBonus: 0,
        multiplier: 1,
      });
      continue;
    }

    const isCorrect = Boolean(answerMap.get(team.id)?.isCorrect === true);
    let delta = 0;

    if (team.id === lastWagerTeamId) {
      // Đội cược: Đúng = nhận điểm cược, Sai = trừ điểm phạt đã tính
      delta = isCorrect ? wagerAmount : -wagerPenalty;
    } else {
      // Các đội còn lại: Đúng = 1/2 điểm gốc cố định (5đ, 10đ, 15đ), Sai = 0đ (không mất gì)
      delta = isCorrect ? nonWagerCorrectPoints : 0;
    }

    await prisma.answer.updateMany({
      where: { roomId, questionId, teamId: team.id },
      data: { pointsAwarded: delta },
    }).catch(console.error);

    const tRes = await applyScoreDeltaToTeam(team.id, delta);
    scoreUpdates.push({ teamId: team.id, score: tRes.newScore, delta: tRes.effectiveDelta });

    teamSummaries.push({
      teamId: team.id,
      teamName: team.name,
      teamColor: team.color,
      totalOnlineMembers: 1,
      correctMembers: isCorrect ? 1 : 0,
      pointsAwarded: delta,
      speedBonus: 0,
      multiplier: team.id === lastWagerTeamId ? Number((wagerAmount / basePoints).toFixed(1)) : 1,
    });

    if (!wagerState.bailoutQueue) wagerState.bailoutQueue = [];
    const bailoutsRem = wagerState.teamBailouts?.[team.id]?.remaining ?? 1;

    if (tRes.newScore <= 0) {
      if (bailoutsRem > 0 && !wagerState.bailoutQueue.some((item) => item.teamId === team.id)) {
        wagerState.bailoutQueue.push({
          teamId: team.id,
          teamName: team.name,
          teamColor: team.color,
          score: tRes.newScore,
          questionIndex: room.currentQuestion + 1,
          eliminatedAt: Date.now(),
        });
      }
    } else {
      wagerState.bailoutQueue = wagerState.bailoutQueue.filter((item) => item.teamId !== team.id);
    }
  }

  // Ưu tiên đội đã rời cuộc chơi sớm hơn (questionIndex nhỏ hơn, eliminatedAt sớm hơn)
  if (wagerState.bailoutQueue) {
    wagerState.bailoutQueue.sort(
      (a, b) => a.questionIndex - b.questionIndex || (a.eliminatedAt || 0) - (b.eliminatedAt || 0) || a.score - b.score
    );
  }

  if (scoreUpdates.length > 0) {
    io.to(`room:${roomCode}`).emit("game:score:update", scoreUpdates);
  }
  io.to(`room:${roomCode}`).emit("game:wager:update", wagerState);
  await persistGameStateSnapshot(roomId);
  await revealCurrentAnswer(io, roomId, roomCode, questionId, teamSummaries);

  // Check Sudden Victory (Knockout Win):
  // Ở bất kỳ câu nào mà chỉ còn 1 đội còn sống, đội duy nhất nghiễm nhiên thắng, quyền trợ cấp bị huỷ hoàn toàn!
  const updatedTeams = await prisma.team.findMany({ where: { roomId } });
  if (updatedTeams.length > 1) {
    const positiveTeams = updatedTeams.filter((t) => t.score > 0);

    if (positiveTeams.length === 1) {
      // Huỷ hoàn toàn quyền trợ cấp
      wagerState.bailoutQueue = [];
      wagerState.teamBailouts = {};
      io.to(`room:${roomCode}`).emit("game:wager:update", wagerState);

      await prisma.room.update({
        where: { id: roomId },
        data: { status: "FINISHED", endedAt: new Date() },
      });
      const leaderboard = await buildLeaderboard(roomId);
      io.to(`room:${roomCode}`).emit("game:ended", { leaderboard });
    }
  }
}

async function openBouncebackStealWindow(io: IO, roomId: string, roomCode: string, questionId: string) {
  const qKey = `${roomId}:${questionId}`;
  if (roomQuestionProcessed.has(qKey)) return;

  if (roomStealTimer.has(qKey)) {
    clearTimeout(roomStealTimer.get(qKey)!);
    roomStealTimer.delete(qKey);
  }

  roomStealPhase.set(qKey, true);
  roomStealOpenedAt.set(qKey, Date.now());
  roomStealEndsAt.set(qKey, Date.now() + 5000);
  const activeQ = roomActiveQuestions.get(roomId);
  if (activeQ) {
    activeQ.isStealPhase = true;
    activeQ.stealBuzzedTeamId = undefined;
    activeQ.stealBuzzedTeamName = undefined;
    activeQ.bouncebackAwaitingJudgment = null;
    io.to(`room:${roomCode}`).emit("game:question", activeQ);
  }

  const timeLimit = 5;
  io.to(`room:${roomCode}`).emit("game:bounceback:open_steal", {
    questionId,
    timeLimit,
  });

  const timer = setTimeout(async () => {
    roomStealPhase.set(qKey, false);
    roomStealTimer.delete(qKey);
    io.to(`room:${roomCode}`).emit("game:buzz:closed");
    if (activeQ) {
      activeQ.isStealPhase = false;
      io.to(`room:${roomCode}`).emit("game:question", activeQ);
    }
    // Hết 5s không ai cướp chuông: Đội chính KHÔNG BỊ TRỪ ĐIỂM (0đ)! Reveal đáp án, kết thúc câu hỏi!
    if (!roomStealBuzzed.has(qKey) && !roomQuestionProcessed.has(qKey)) {
      roomQuestionProcessed.add(qKey);
      await revealCurrentAnswer(io, roomId, roomCode, questionId);
    }
  }, 5350);
  roomStealTimer.set(qKey, timer);
}

async function finalizeBouncebackPrimary(
  io: IO,
  roomId: string,
  roomCode: string,
  questionId: string,
  forceCorrect?: boolean
): Promise<boolean> {
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

  const isCorrect = forceCorrect !== undefined ? forceCorrect : (existingAns?.isCorrect === true);
  const activeQ = roomActiveQuestions.get(roomId);
  if (activeQ) {
    activeQ.bouncebackAwaitingJudgment = null;
  }

  const chosenPoints = roomBouncebackSelectedPoints.get(qKey) ?? 20;

  if (isCorrect) {
    roomQuestionProcessed.add(qKey);

    const teamCardsMap = roomQuestionTeamCards.get(qKey);
    const activeCards = teamCardsMap?.get(primary.teamId) || [];
    let multiplier = 1;
    if (activeCards.some((c) => c.type === "DOUBLE" || c.type === "SCORE_X2")) {
      multiplier = 2;
    }
    const points = Math.floor(chosenPoints * multiplier);

    if (existingAns) {
      await prisma.answer.update({
        where: { id: existingAns.id },
        data: { pointsAwarded: points, isCorrect: true },
      });
    } else {
      await prisma.answer.create({
        data: {
          roomId,
          questionId,
          teamId: primary.teamId,
          answer: [],
          isCorrect: true,
          pointsAwarded: points,
          timeSpent: 0,
        },
      });
    }

    const playerToUpdate = await prisma.player.findUnique({ where: { id: primary.teamId } }).catch(() => null);
    if (playerToUpdate) {
      const pRes = await applyScoreDeltaToPlayer(primary.teamId, points);
      io.to(`room:${roomCode}`).emit("game:score:update", [
        { playerId: primary.teamId, score: pRes.newScore, delta: pRes.effectiveDelta },
      ]);
    } else {
      const tRes = await applyScoreDeltaToTeam(primary.teamId, points);
      io.to(`room:${roomCode}`).emit("game:score:update", [
        { teamId: primary.teamId, score: tRes.newScore, delta: tRes.effectiveDelta },
      ]);
    }

    await revealCurrentAnswer(io, roomId, roomCode, questionId);
    return true;
  } else {
    // Đội chính trả lời sai:
    const teamCardsMap = roomQuestionTeamCards.get(qKey);
    const activeCards = teamCardsMap?.get(primary.teamId) || [];
    let hopeStarPenalty = 0;
    if (activeCards.some((c) => c.type === "SHIELD")) {
      // Khiên bảo vệ: Miễn trừ trừ điểm khi sai!
      hopeStarPenalty = 0;
    } else if (activeCards.some((c) => c.type === "DOUBLE" || c.type === "SCORE_X2")) {
      // Ngôi sao hy vọng (x2 điểm): Đúng x2, Sai bị trừ 100% điểm câu hỏi!
      hopeStarPenalty = chosenPoints;
    }

    if (existingAns) {
      await prisma.answer.update({
        where: { id: existingAns.id },
        data: { pointsAwarded: -hopeStarPenalty, isCorrect: false },
      });
    } else {
      await prisma.answer.create({
        data: {
          roomId,
          questionId,
          teamId: primary.teamId,
          answer: [],
          isCorrect: false,
          pointsAwarded: -hopeStarPenalty,
          timeSpent: 0,
        },
      });
    }

    if (hopeStarPenalty > 0) {
      const primaryPlayer = await prisma.player.findUnique({ where: { id: primary.teamId } }).catch(() => null);
      if (primaryPlayer) {
        const pRes = await applyScoreDeltaToPlayer(primary.teamId, -hopeStarPenalty);
        io.to(`room:${roomCode}`).emit("game:score:update", [
          { playerId: primary.teamId, score: pRes.newScore, delta: pRes.effectiveDelta },
        ]);
      } else {
        const tRes = await applyScoreDeltaToTeam(primary.teamId, -hopeStarPenalty);
        io.to(`room:${roomCode}`).emit("game:score:update", [
          { teamId: primary.teamId, score: tRes.newScore, delta: tRes.effectiveDelta },
        ]);
      }
    }

    io.to(`room:${roomCode}`).emit("game:timer", { remaining: 0, total: question.timeLimit });
    // Tự động mở chuông 5s cho các đội khác giành quyền cướp điểm!
    await openBouncebackStealWindow(io, roomId, roomCode, questionId);
    return false;
  }
}

async function finalizeBouncebackSteal(
  io: IO,
  roomId: string,
  roomCode: string,
  questionId: string,
  forceCorrect?: boolean
) {
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
  const activeCards = teamCardsMap?.get(stealInfo.teamId) || [];
  let multiplier = 1;
  const currentTeamObj = room.teams.find((t) => t.id === stealInfo.teamId);
  let shielded = currentTeamObj ? currentTeamObj.shieldCount > 0 : false;
  if (activeCards.some((c) => c.type === "DOUBLE" || c.type === "SCORE_X2")) multiplier = 2;
  if (activeCards.some((c) => c.type === "SHIELD")) shielded = true;

  const isCorrect = forceCorrect !== undefined ? forceCorrect : (existingAns?.isCorrect === true);
  const chosenPoints = roomBouncebackSelectedPoints.get(qKey) ?? 20;

  let points = 0;
  if (isCorrect) {
    points = Math.floor(chosenPoints * multiplier);
  } else {
    points = shielded ? 0 : -Math.floor(chosenPoints * 0.5);
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
        isCorrect,
        pointsAwarded: points,
        timeSpent: 0,
      },
    });
  }

  const scoreUpdates: ScoreUpdate[] = [];

  if (points !== 0) {
    const stealPlayer = await prisma.player.findUnique({ where: { id: stealInfo.teamId } }).catch(() => null);
    if (stealPlayer) {
      const pRes = await applyScoreDeltaToPlayer(stealInfo.teamId, points);
      scoreUpdates.push({ playerId: stealInfo.teamId, score: pRes.newScore, delta: pRes.effectiveDelta });
    } else {
      const tRes = await applyScoreDeltaToTeam(stealInfo.teamId, points);
      scoreUpdates.push({ teamId: stealInfo.teamId, score: tRes.newScore, delta: tRes.effectiveDelta });
    }
  }

  // Olympia Steal:
  // Nếu đội cướp đúng -> đội cướp ăn trọn điểm (+chosenPoints), đội chính bị trừ 100% điểm (-chosenPoints)!
  // Lưu ý: Nếu đội chính đã đặt Ngôi sao hy vọng thì đã bị trừ 100% lúc làm sai, không trừ lần 2!
  // Nếu đội cướp sai -> đội cướp bị trừ 50% điểm (-chosenPoints * 0.5), đội chính giữ nguyên điểm (0đ)!
  const primary = roomPrimaryTeams.get(qKey);
  const primaryHadDouble = (teamCardsMap?.get(primary?.teamId ?? "") ?? []).some((c) => c.type === "DOUBLE");
  if (isCorrect && primary && primary.teamId !== stealInfo.teamId && !primaryHadDouble) {
    const deductPoints = -chosenPoints;
    const primaryPlayer = await prisma.player.findUnique({ where: { id: primary.teamId } }).catch(() => null);
    if (primaryPlayer) {
      const pRes = await applyScoreDeltaToPlayer(primary.teamId, deductPoints);
      scoreUpdates.push({ playerId: primary.teamId, score: pRes.newScore, delta: pRes.effectiveDelta });
    } else {
      const tRes = await applyScoreDeltaToTeam(primary.teamId, deductPoints);
      scoreUpdates.push({ teamId: primary.teamId, score: tRes.newScore, delta: tRes.effectiveDelta });
    }
  }

  if (scoreUpdates.length > 0) {
    io.to(`room:${roomCode}`).emit("game:score:update", scoreUpdates);
  }

  const activeQ = roomActiveQuestions.get(roomId);
  if (activeQ) {
    activeQ.bouncebackAwaitingJudgment = null;
    activeQ.isStealPhase = false;
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
    timeBonusEnabled: room.mode === "CLASSIC" || room.mode === "ELIMINATION" ? Boolean(config?.timeBonusEnabled !== false) : false,
  };

  const totalAnswers = answers.length;
  const correctAnswersTotal = answers.filter((a) => a.isCorrect === true).length;
  const roomAccuracy = totalAnswers > 0 ? correctAnswersTotal / totalAnswers : 1.0;

  const allPlayers = await prisma.player.findMany({
    where: { roomId },
    orderBy: { score: "desc" },
  });
  const midPoint = Math.max(1, Math.floor(allPlayers.length / 2));
  const topHalfPlayerIds = new Set(allPlayers.slice(0, midPoint).map((p) => p.id));
  const bottomHalfPlayerIds = new Set(allPlayers.slice(midPoint).map((p) => p.id));

  let topHalfCorrect = 0;
  let topHalfTotal = 0;
  let bottomHalfCorrect = 0;
  let bottomHalfTotal = 0;

  for (const a of answers) {
    if (a.playerId && topHalfPlayerIds.has(a.playerId)) {
      topHalfTotal++;
      if (a.isCorrect) topHalfCorrect++;
    } else if (a.playerId && bottomHalfPlayerIds.has(a.playerId)) {
      bottomHalfTotal++;
      if (a.isCorrect) bottomHalfCorrect++;
    }
  }

  const scoreUpdates: ScoreUpdate[] = [];

  for (const ans of answers) {
    if (!ans.playerId) continue;

    const isCorrect = ans.isCorrect ?? false;
    let pStreak = playerStreakMap.get(ans.playerId) || 0;
    if (isCorrect) {
      pStreak += 1;
      playerStreakMap.set(ans.playerId, pStreak);
    } else {
      pStreak = 0;
      playerStreakMap.set(ans.playerId, 0);
    }

    const isGold = room.mode === "CLASSIC" && Boolean(roomGoldQuestions.get(room.id)?.has(question.id));
    const effectiveBasePoints = isGold ? question.points * 2 : question.points;

    const qKey = `${room.id}:${question.id}`;
    const teamCardsMap = roomQuestionTeamCards.get(qKey);
    const activeCards = (ans.teamId && teamCardsMap?.get(ans.teamId)) || [];
    let penaltyMultiplier = 1;
    let isTargetedWithRiskCard = false;
    if (teamCardsMap && ans.teamId) {
      for (const [, otherCards] of teamCardsMap) {
        if (otherCards.some((c) => (c.type === "PENALTY" || c.type === "ATTACK") && c.targetTeamId === ans.teamId)) {
          penaltyMultiplier = 2;
          isTargetedWithRiskCard = true;
        }
      }
    }
    const hasDoubleCard = activeCards.some((c) => c.type === "DOUBLE");
    const hasRiskPowerup = hasDoubleCard || isTargetedWithRiskCard;
    const shielded = activeCards.some((c) => c.type === "SHIELD");

    const points = computePointsAwarded({
      basePoints: effectiveBasePoints,
      timeSpent: ans.timeSpent,
      timeLimit: question.timeLimit,
      isCorrect,
      config: effectiveConfig,
      streak: pStreak,
      roomAccuracy,
      topHalfCorrect,
      topHalfTotal,
      bottomHalfCorrect,
      bottomHalfTotal,
      totalParticipants: totalAnswers || allPlayers.length,
      mode: room.mode as any,
      hasRiskPowerup,
      shielded,
      penaltyMultiplier,
    });

    await prisma.answer.update({
      where: { id: ans.id },
      data: { pointsAwarded: points },
    });

    if (points !== 0) {
      const pRes = await applyScoreDeltaToPlayer(ans.playerId, points);
      scoreUpdates.push({
        playerId: ans.playerId,
        teamId: ans.teamId ?? undefined,
        score: pRes.newScore,
        delta: pRes.effectiveDelta,
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

async function revealCurrentAnswer(io: IO, roomId: string, roomCode: string, questionId: string, customTeamSummaries?: TeamRevealSummary[]) {
  stopQuestionTimer(roomId);

  const room = await prisma.room.findUnique({ where: { id: roomId } });
  const q = await prisma.question.findUnique({ where: { id: questionId } });
  if (!room || !q) return;

  const config = room.config as any;
  let teamScoresUpdates: ScoreUpdate[] = [];
  let teamSummaries: TeamRevealSummary[] = customTeamSummaries || [];
  let roomAccuracy: number | undefined;
  let rarityBonusPercent: number | undefined;
  let effectiveDifficulty: number | undefined;
  let itemDiscrimination: number | undefined;

  // Collective team scoring in CLASSIC and ELIMINATION mode
  if ((room.mode === "CLASSIC" || room.mode === "ELIMINATION") && room.teamMode === "TEAM") {
    const res = await resolveQuestionTeamScores(io, room.id, q.id);
    teamScoresUpdates = res.teamScoresUpdates;
    teamSummaries = res.teamSummaries;
    roomAccuracy = res.roomAccuracy;
    rarityBonusPercent = res.rarityBonusPercent;
    effectiveDifficulty = res.effectiveDifficulty;
    itemDiscrimination = res.itemDiscrimination;
    if (teamScoresUpdates.length > 0) {
      io.to(`room:${roomCode}`).emit("game:score:update", teamScoresUpdates);
    }
  }

  // Elimination check: sau mỗi interval câu, loại đội có thành tích thấp nhất theo đa tiêu chí
  if (room.mode === "ELIMINATION") {
    const interval = Math.max(1, config?.eliminationIntervalQuestions || 3);
    if ((room.currentQuestion + 1) % interval === 0) {
      const currentStageJustFinished = Math.floor((room.currentQuestion + 1) / interval);
      let roomGhosts = roomEliminationGhostStats.get(room.id);
      if (roomGhosts) {
        // 1. Evaluate round performance for each ghost team (100% correct in at least 1 round qualifies for revival)
        for (const [, ghostStat] of roomGhosts.entries()) {
          if (ghostStat.currentRoundCorrect >= interval) {
            ghostStat.ghostRoundAllCorrect = true;
          }
          ghostStat.currentRoundCorrect = 0; // reset for next round
        }
      }

      if (room.teamMode === "TEAM") {
        const activeTeams = await prisma.team.findMany({
          where: { roomId: room.id, isEliminated: false },
          include: { answers: { where: { roomId: room.id } } },
        });

        if (activeTeams.length > 1) {
          // Tiêu chí phụ phân định hoà (Tie-breakers):
          // 1. Điểm tổng thấp nhất
          // 2. Tỷ lệ câu trả lời đúng (Accuracy) thấp nhất
          // 3. Thời gian phản xạ trung bình chậm nhất
          activeTeams.sort((a, b) => {
            if (a.score !== b.score) return a.score - b.score;

            const totalA = a.answers.length || 0;
            const corrA = a.answers.filter((x) => x.isCorrect === true).length;
            const accA = totalA > 0 ? corrA / totalA : 0;

            const totalB = b.answers.length || 0;
            const corrB = b.answers.filter((x) => x.isCorrect === true).length;
            const accB = totalB > 0 ? corrB / totalB : 0;

            if (accA !== accB) return accA - accB;

            const timeA = totalA > 0 ? a.answers.reduce((acc, curr) => acc + curr.timeSpent, 0) / totalA : 999999;
            const timeB = totalB > 0 ? b.answers.reduce((acc, curr) => acc + curr.timeSpent, 0) / totalB : 999999;

            return timeB - timeA; // Sắp xếp thời gian lớn hơn (chậm hơn) lên đầu để loại
          });

          // Xác định số đội bị loại theo setting (mặc định 1, cho phép chọn 1 - 3 đội):
          // Lưu ý quy tắc an toàn: Không loại toàn bộ các đội còn sống!
          const configuredTeamsPerStage = Math.max(1, Math.min(3, config?.eliminationTeamsPerStage || 1));
          const numToEliminate = Math.min(configuredTeamsPerStage, activeTeams.length - 1);
          const teamsToEliminate = activeTeams.slice(0, numToEliminate);

          const currentStageNumber = Math.floor((room.currentQuestion + 1) / interval);
          if (!roomGhosts) {
            roomGhosts = new Map();
            roomEliminationGhostStats.set(room.id, roomGhosts);
          }

          for (const toElim of teamsToEliminate) {
            await prisma.team.update({
              where: { id: toElim.id },
              data: { isEliminated: true },
            });

            let elimGhostStat = roomGhosts.get(toElim.id);
            if (!elimGhostStat) {
              elimGhostStat = {
                ghostStreak: 0,
                ghostTotalCorrect: 0,
                ghostTotalAnswered: 0,
                ghostTotalTimeSpent: 0,
                ghostRoundAllCorrect: false,
                currentRoundCorrect: 0,
                eliminatedAtStage: currentStageNumber,
                eliminatedAtQuestion: room.currentQuestion,
                firstGhostStage: currentStageNumber + 1,
              };
              roomGhosts.set(toElim.id, elimGhostStat);
            } else {
              elimGhostStat.eliminatedAtStage = currentStageNumber;
              elimGhostStat.eliminatedAtQuestion = room.currentQuestion;
              elimGhostStat.firstGhostStage = currentStageNumber + 1;
            }
          }

          io.to(`room:${roomCode}`).emit("game:elimination:round", {
            eliminatedTeamId: teamsToEliminate.map((t) => t.id).join(","),
            eliminatedTeamName: teamsToEliminate.map((t) => t.name).join(", "),
            eliminatedTeams: teamsToEliminate.map((t) => ({ id: t.id, name: t.name })),
            reason: `Điểm số thấp nhất sau vòng sinh tồn ${currentStageNumber} (${teamsToEliminate.length} đội bị loại)`,
          });

          // 2. Ghost Revival Check at Penultimate Stage (Chặng áp chót)
          // Áp dụng khi trận đấu có từ 4 chặng trở lên (totalStages >= 4) và hiện đang ở chặng áp chót
          const allQuestions = await getRoomQuestions(room.id);
          const totalStages = Math.floor(allQuestions.length / interval);
          const currentStage = Math.floor((room.currentQuestion + 1) / interval);

          if (totalStages >= 4 && currentStage === totalStages - 1) {
            const eliminatedTeams = await prisma.team.findMany({
              where: { roomId: room.id, isEliminated: true },
            });
            // 100% là điều kiện lý tưởng, nhưng nếu không ai đạt 100% thì lấy các đội có thành tích cao nhất:
            const activeGhostCandidates = eliminatedTeams.filter((t) => {
              const stat = roomGhosts?.get(t.id);
              return Boolean(stat && stat.ghostTotalAnswered > 0);
            });
            const ghostCandidates = activeGhostCandidates.length > 0 ? activeGhostCandidates : eliminatedTeams;

            if (ghostCandidates.length > 0) {
              ghostCandidates.sort((a, b) => {
                const statA = roomGhosts?.get(a.id);
                const statB = roomGhosts?.get(b.id);

                // Tiêu chuẩn lý tưởng: Đội từng đạt 100% trong ít nhất 1 chặng được ưu tiên cao nhất
                const isPerfectA = Boolean(statA?.ghostRoundAllCorrect);
                const isPerfectB = Boolean(statB?.ghostRoundAllCorrect);
                if (isPerfectA !== isPerfectB) {
                  return isPerfectA ? -1 : 1; // Đội đạt 100% đứng trước
                }

                // Nếu cùng đạt 100% HOẶC cùng KHÔNG đạt 100% (khi không ai đạt 100%):
                // Ưu tiên 1 (Quy tắc người dùng): Đội có tỷ lệ % chính xác câu bóng ma cao hơn
                const accA = (statA && statA.ghostTotalAnswered > 0) ? statA.ghostTotalCorrect / statA.ghostTotalAnswered : 0;
                const accB = (statB && statB.ghostTotalAnswered > 0) ? statB.ghostTotalCorrect / statB.ghostTotalAnswered : 0;
                if (accA !== accB) return accB - accA; // tỷ lệ cao hơn đứng trước (lấy cao nhất)

                // Ưu tiên 2 (Quy tắc người dùng): Đội bị loại sớm hơn
                const elimA = statA?.eliminatedAtQuestion ?? (999999 - (statA?.ghostTotalAnswered || 0));
                const elimB = statB?.eliminatedAtQuestion ?? (999999 - (statB?.ghostTotalAnswered || 0));
                if (elimA !== elimB) {
                  return elimA - elimB; // chỉ số câu bị loại nhỏ hơn = bị loại sớm hơn
                }

                // Ưu tiên 3 (Quy tắc người dùng): Đội có tổng thời gian trả lời câu bóng ma ít hơn
                const timeA = statA?.ghostTotalTimeSpent ?? 999999;
                const timeB = statB?.ghostTotalTimeSpent ?? 999999;
                if (timeA !== timeB) {
                  return timeA - timeB; // ít thời gian hơn = nhanh hơn đứng trước
                }

                // Tiêu chí phụ 4 (dự phòng): Tổng số câu đúng
                const corrA = statA?.ghostTotalCorrect || 0;
                const corrB = statB?.ghostTotalCorrect || 0;
                return corrB - corrA;
              });

              // Cài đặt số đội được duyệt hồi sinh tại chặng áp chót (1 - 3 đội, mặc định 1):
              const revivalLimit = Math.max(1, Math.min(3, config?.eliminationRevivalCount || 1));
              const toRevive = ghostCandidates.slice(0, revivalLimit);

              const survivingRemaining = activeTeams.filter((t) => !teamsToEliminate.some((elim) => elim.id === t.id));
              const minSurvivingScore = survivingRemaining.length > 0
                ? Math.min(...survivingRemaining.map((t) => t.score))
                : 0;

              for (const revived of toRevive) {
                await prisma.team.update({
                  where: { id: revived.id },
                  data: { isEliminated: false, score: minSurvivingScore },
                });

                const statRevived = roomGhosts?.get(revived.id);
                if (statRevived) {
                  statRevived.ghostRoundAllCorrect = false;
                }
              }

              if (toRevive.length > 0) {
                const revivedPayloadList = toRevive.map((r) => ({
                  id: r.id,
                  name: r.name,
                  score: minSurvivingScore,
                  eliminatedAtStage: roomGhosts?.get(r.id)?.eliminatedAtStage,
                }));

                io.to(`room:${roomCode}`).emit("elimination:revival", {
                  round: currentStage,
                  revivedTeamId: toRevive[0].id,
                  revivedTeamName: toRevive.map((r) => r.name).join(", "),
                  revivedScore: minSurvivingScore,
                  eliminatedAtStage: roomGhosts?.get(toRevive[0].id)?.eliminatedAtStage,
                  revivedTeams: revivedPayloadList,
                });
              }
            }
          }

          const refreshedState = await buildRoomState(room.id);
          io.to(`room:${roomCode}`).emit("room:state", refreshedState);

          // Nếu chỉ còn duy nhất 1 đội sống sót sau khi tính cả hồi sinh, đội đó nghiễm nhiên chiến thắng!
          const finalSurviving = await prisma.team.findMany({
            where: { roomId: room.id, isEliminated: false },
          });
          if (finalSurviving.length === 1) {
            await prisma.room.update({ where: { id: room.id }, data: { status: "FINISHED", endedAt: new Date() } });
            const leaderboard = await buildLeaderboard(room.id);
            io.to(`room:${roomCode}`).emit("game:ended", { leaderboard });
            return;
          }
        }
      }
    }
  }

  const answers = await prisma.answer.findMany({
    where: { roomId: room.id, questionId: q.id },
    include: { player: true, team: true },
  });

  const options = q.options as any[] | null;
  const correctOptions = options && Array.isArray(options) ? options.filter((o: any) => o.isCorrect) : [];
  let correctAnswer: string[] = [];
  let correctAnswerText = "";

  if (correctOptions.length > 0) {
    correctAnswer = correctOptions.map((o: any) => o.id);
    const labels = ["A", "B", "C", "D", "E", "F"];
    correctAnswerText = correctOptions.map((o: any) => {
      const idx = (options || []).findIndex((opt: any) => opt.id === o.id);
      const prefix = idx >= 0 && idx < labels.length ? `${labels[idx]}. ` : "";
      return `${prefix}${o.text}`;
    }).join(" | ");
  } else if (q.answer) {
    correctAnswer = [q.answer];
    correctAnswerText = q.answer;
  }

  const revealPayload = {
    questionId: q.id,
    correctAnswer: Array.isArray(correctAnswer) ? correctAnswer : [correctAnswer as string],
    correctAnswerText: correctAnswerText || undefined,
    explanation: q.hint || undefined,
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
    effectiveDifficulty,
    itemDiscrimination,
  };

  roomRevealPayloads.set(roomId, revealPayload);
  io.to(`room:${roomCode}`).emit("game:answer:reveal", revealPayload);

  if (room.mode === "MYSTERY_QUEST") {
    const questState = roomMysteryQuests.get(room.id);
    if (questState) {
      const activeAns = answers.find((a) => a.teamId === questState.currentTurnTeamId);
      const isCorrect = Boolean(activeAns?.isCorrect);
      const basePts = q.points || 10;

      if (activeAns) {
        await prisma.answer.update({
          where: { id: activeAns.id },
          data: { pointsAwarded: isCorrect ? basePts : 0 },
        }).catch(() => {});
      }

      if (isCorrect) {
        questState.phase = "PUSH_YOUR_LUCK";
        questState.potPoints = 0;
        questState.potMultiplier = 1;
        roomMysteryQuests.set(room.id, questState);
        io.to(`room:${roomCode}`).emit("game:mystery:update", questState);
      } else {
        // Mode Hành Trình Bí Ẩn: Lượt thi độc quyền từng đội, trả lời sai kết thúc lượt ngay với 0đ, không có cướp chuông
        questState.phase = "TURN_SUMMARY";
        questState.turnFinishedReason = "QUESTION_FAILED";
        questState.potPoints = 0;
        questState.potMultiplier = 1;
        questState.storyResult = {
          teamId: questState.currentTurnTeamId,
          teamName: questState.currentTurnTeamName,
          teamColor: questState.currentTurnTeamColor,
          rewardText: "Trả lời chưa chính xác. Lượt thi kết thúc với 0 điểm tích lũy.",
          scoreDelta: 0,
          oldScore: 0,
          newScore: 0,
        };
        roomMysteryQuests.set(room.id, questState);
        io.to(`room:${roomCode}`).emit("game:mystery:update", questState);
      }
      const refreshedState = await buildRoomState(room.id);
      io.to(`room:${roomCode}`).emit("room:state", refreshedState);
    }
  }
}

function stopQuestionTimer(roomId: string) {
  const key = `${roomId}:timer`;
  if (roomTimers.has(key)) {
    clearInterval(roomTimers.get(key)!);
    roomTimers.delete(key);
    roomRemainingTimes.delete(key);
  }
  roomTimerEndsAt.delete(roomId);
}

async function buildRoomState(roomId: string): Promise<RoomState> {
  const room = await prisma.room.findUnique({
    where: { id: roomId },
    include: {
      teams: {
        orderBy: { createdAt: "asc" },
        include: { players: true, powerupCards: true },
      },
      players: true,
      powerupCards: { where: { ownerType: "SHARED" } },
      quizBank: { select: { questions: { select: { id: true } } } },
    },
  });
  if (!room) throw new Error("Room not found");

  const config = room.config as any;

  // Filter out any ghost host/admin dummy players and deduplicate sandbox tester clones
  const rawValidPlayers = room.players.filter((p) => !p.isHost && p.name !== "Host" && p.name !== "Admin Host");
  const isSandboxRoom = room.name?.includes("[Sandbox]") || room.code?.startsWith("sb_") || Boolean(room.config && (room.config as any)?.isSandbox);

  let validPlayers = rawValidPlayers;
  if (isSandboxRoom) {
    const hasPrimaryTester = rawValidPlayers.some((p) => p.id === `sb_${room.code}_t0` || p.name === "Bạn (Tester)");
    validPlayers = rawValidPlayers.filter((p) => {
      // If primary tester exists, remove redundant temporary tester clones
      if (hasPrimaryTester && p.id !== `sb_${room.code}_t0` && (p.name.includes("(Tester)") || p.id.startsWith(`sb_${room.code}_t`))) {
        return false;
      }
      return true;
    });
  }
  validPlayers = validPlayers.filter((p, idx, arr) => arr.findIndex((x) => x.id === p.id) === idx);

  const teams: TeamState[] = room.teams.map((t) => {
    const teamPlayers = validPlayers.filter((p) => p.teamId === t.id);
    const ghostStat = roomEliminationGhostStats.get(room.id)?.get(t.id);
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
      streak: teamStreakMap.get(t.id) || 0,
      isSpectator: t.isEliminated,
      isGhost: room.mode === "ELIMINATION" && t.isEliminated,
      ghostStreak: ghostStat?.ghostStreak || 0,
      ghostRoundAllCorrect: ghostStat?.ghostRoundAllCorrect || false,
      ghostTotalCorrect: ghostStat?.ghostTotalCorrect || 0,
      ghostTotalAnswered: ghostStat?.ghostTotalAnswered || 0,
      ghostCurrentRoundCorrect: ghostStat?.currentRoundCorrect || 0,
      eliminationInterval: (config?.eliminationIntervalQuestions || 3),
      eliminatedAtStage: ghostStat?.eliminatedAtStage,
      firstGhostStage: ghostStat?.firstGhostStage,
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
    const myTeam = p.teamId ? room.teams.find((t) => t.id === p.teamId) : null;
    const isSpectator = Boolean(myTeam?.isEliminated) || Boolean((p as any).isSpectator);

    return {
      id: p.id,
      name: p.name,
      avatar: p.avatar ?? undefined,
      score: p.score,
      teamId: p.teamId ?? undefined,
      isHost: false,
      isOnline,
      streak: playerStreakMap.get(p.id) || 0,
      isSpectator,
    };
  });

  const sharedCards = room.powerupCards.map((c) => ({
    id: c.id,
    type: c.type as any,
    ownerType: c.ownerType as any,
    teamId: undefined,
    used: c.used,
  }));

  const cachedRoom = roomCache.get(roomId);
  const effectiveStatus = (cachedRoom?.status ?? room.status) as any;
  const effectiveCurrentQuestion = cachedRoom?.currentQuestion ?? room.currentQuestion;

  return {
    id: room.id,
    code: room.code,
    name: room.name,
    mode: room.mode as any,
    teamMode: room.teamMode as any,
    status: effectiveStatus,
    currentQuestionIndex: effectiveCurrentQuestion,
    totalQuestions: getTargetTotalQuestions(
      room.mode as any,
      config,
      teams.length,
      (roomQuestionsCache.get(roomId) || room.quizBank?.questions)?.length || 0
    ),
    teams,
    players,
    sharedCards,
    config: config,
    tournamentState: roomTournaments.get(room.id),
    gridCaroState: roomGridCaros.get(room.id),
    diceRaceState: roomDiceRaces.get(room.id),
    wagerState: roomWagers.get(room.id),
    mysteryQuestState: roomMysteryQuests.get(room.id),
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
    tournamentTeam1Id?: string;
    tournamentTeam2Id?: string;
    gridCellId?: number;
    diceRollValue?: number;
    wagerPhase?: "WAGER_PERIOD" | "QUESTION_PERIOD" | "REVEAL_PERIOD";
    buzzUnlocked?: boolean;
    buzzUnlockMode?: "AUTO" | "MANUAL";
    buzzAutoDelaySeconds?: number;
    canRollDice?: boolean;
    bouncebackSelectPhase?: boolean;
    selectedPointLevel?: 10 | 20 | 30;
    streakCount?: number;
    speedBonusPercent?: number;
    rarityBonusPercent?: number;
    endsAt?: number;
    serverTime?: number;
    timerPending?: boolean;
    timerStarted?: boolean;
    answerSubmissionMode?: "SINGLE_SUBMIT" | "ALLOW_CHANGE";
    hasSharedPowerupUsed?: boolean;
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
    endsAt: extra?.endsAt,
    serverTime: extra?.serverTime ?? Date.now(),
    timerPending: extra?.timerPending ?? true,
    timerStarted: extra?.timerStarted ?? false,
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
    tournamentTeam1Id: extra?.tournamentTeam1Id,
    tournamentTeam2Id: extra?.tournamentTeam2Id,
    gridCellId: extra?.gridCellId,
    diceRollValue: extra?.diceRollValue,
    wagerPhase: extra?.wagerPhase,
    buzzUnlocked: extra?.buzzUnlocked,
    buzzUnlockMode: extra?.buzzUnlockMode,
    buzzAutoDelaySeconds: extra?.buzzAutoDelaySeconds,
    canRollDice: extra?.canRollDice,
    bouncebackSelectPhase: extra?.bouncebackSelectPhase,
    selectedPointLevel: extra?.selectedPointLevel,
    streakCount: extra?.streakCount,
    speedBonusPercent: extra?.speedBonusPercent,
    rarityBonusPercent: extra?.rarityBonusPercent,
    answerSubmissionMode: extra?.answerSubmissionMode,
    hasSharedPowerupUsed: extra?.hasSharedPowerupUsed ?? false,
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
  effectiveDifficulty?: number;
  itemDiscrimination?: number;
}> {
  const qKey = `${roomId}:${questionId}`;
  if (roomQuestionScoresCache.has(qKey)) {
    return roomQuestionScoresCache.get(qKey)!;
  }
  if (roomQuestionProcessed.has(qKey)) {
    return { teamScoresUpdates: [], teamSummaries: [], roomAccuracy: 1, rarityBonusPercent: 0 };
  }
  roomQuestionProcessed.add(qKey);

  const room = await prisma.room.findUnique({
    where: { id: roomId },
    include: {
      teams: {
        orderBy: { createdAt: "asc" },
        include: { players: true },
      },
    },
  });
  if (!room || room.teamMode !== "TEAM" || (room.mode !== "CLASSIC" && room.mode !== "ELIMINATION")) {
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

  const sortedTeams = [...room.teams].sort((a, b) => b.score - a.score);
  const midPoint = Math.max(1, Math.floor(sortedTeams.length / 2));
  const topHalfTeamIds = new Set(sortedTeams.slice(0, midPoint).map((t) => t.id));
  const bottomHalfTeamIds = new Set(sortedTeams.slice(midPoint).map((t) => t.id));

  let topHalfCorrect = 0;
  let topHalfTotal = 0;
  let bottomHalfCorrect = 0;
  let bottomHalfTotal = 0;

  for (const a of answers) {
    if (a.teamId && topHalfTeamIds.has(a.teamId)) {
      topHalfTotal++;
      if (a.isCorrect) topHalfCorrect++;
    } else if (a.teamId && bottomHalfTeamIds.has(a.teamId)) {
      bottomHalfTotal++;
      if (a.isCorrect) bottomHalfCorrect++;
    }
  }

  const irtMetrics = calculateItemIRTMetrics({
    rawPoints: question.points || 10,
    roomAccuracy,
    totalParticipants: totalAnswers || room.teams.length,
    topHalfCorrect,
    topHalfTotal,
    bottomHalfCorrect,
    bottomHalfTotal,
  });

  const rarityBonusPercent =
    room.mode === "CLASSIC" || room.mode === "ELIMINATION"
      ? Math.round(irtMetrics.bonusRate * 100)
      : roomAccuracy < 0.30
      ? Math.round((0.30 - roomAccuracy) * 1.5 * 100)
      : 0;

  const teamCardsMap = roomQuestionTeamCards.get(qKey);
  const teamScoresUpdates: ScoreUpdate[] = [];
  const teamSummaries: TeamRevealSummary[] = [];

  const isSandboxRoom = Boolean(
    room.name?.startsWith("[Sandbox]") ||
    (room.config as any)?.isSandbox ||
    roomSandboxActiveTeam.has(room.id)
  );

  for (const team of room.teams) {
    const teamAnswers = answers
      .filter((a) => a.teamId === team.id)
      .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());

    const humanMembers = team.players.filter((p) =>
      !isPlayerBot(p) && !p.id?.startsWith("bot_") && !p.name?.includes("🤖")
    );
    const hasHuman = humanMembers.length > 0 || team.players.some((p) =>
      p.name?.includes("Tester") || p.id?.startsWith("p_sb_") || p.id?.startsWith("sb_")
    );

    let totalOnline = 1;
    let correctAnswers: any[] = [];
    let correctTimes: number[] = [];

    if (!isSandboxRoom) {
      // ── REAL ROOM RULES ─────────────────────────────────────────────
      // "đối với bot, hệ thống không tính điểm, tức nghĩa đội không thể chỉ toàn bot"
      if (!hasHuman) {
        // Team has only bots or no human players -> cannot score in real room!
        teamScoresUpdates.push({ teamId: team.id, score: team.score, delta: 0 });
        teamSummaries.push({
          teamId: team.id,
          teamName: team.name,
          teamColor: team.color,
          totalOnlineMembers: 0,
          correctMembers: 0,
          pointsAwarded: 0,
          speedBonus: 0,
          multiplier: 1,
          streak: 0,
          avgTimeSpent: 0,
          basePoints: 0,
          speedPoints: 0,
          streakPoints: 0,
          rarityPoints: 0,
        });
        continue;
      }

      // Filter answers to ONLY include human members of this team
      const humanAnswers = teamAnswers.filter((a) =>
        !a.playerId || !isPlayerBot({ id: a.playerId })
      );

      // Average mechanism: Điểm trung bình cộng các thành viên
      const onlineHumans = humanMembers.filter((hm) => !!hm.socketId);
      totalOnline = Math.max(1, humanAnswers.length > 0 ? humanAnswers.length : (onlineHumans.length > 0 ? onlineHumans.length : humanMembers.length));

      correctAnswers = humanAnswers.filter((a) => a.isCorrect === true);
      correctTimes = correctAnswers
        .map((a) => a.timeSpent)
        .filter((t) => typeof t === "number" && t > 0);
    } else {
      // ── SANDBOX ROOM RULES ──────────────────────────────────────────
      // In sandbox mode, virtual bots can score to simulate 4-team leaderboards!
      const activeSbTeamId = roomSandboxActiveTeam.get(room.id);
      const isTesterTeam = (activeSbTeamId && activeSbTeamId === team.id) || hasHuman;

      if (isTesterTeam) {
        const testerAnswers = teamAnswers.filter((a) =>
          !a.playerId || !isPlayerBot({ id: a.playerId }) || a.playerId.startsWith("sb_") || a.playerId.startsWith("p_sb_")
        );
        const repAnswer = testerAnswers.find((a) => a.isCorrect === true) ||
                          teamAnswers.find((a) => a.isCorrect === true) ||
                          testerAnswers[0] ||
                          teamAnswers[0];
        const isRepCorrect = repAnswer?.isCorrect === true;
        totalOnline = 1;
        correctAnswers = isRepCorrect && repAnswer ? [repAnswer] : [];
        correctTimes = isRepCorrect && typeof repAnswer?.timeSpent === "number" ? [repAnswer.timeSpent] : [];
      } else {
        // Bot team: allow bot answer to score for leaderboard testing
        const repAnswer = teamAnswers.find((a) => a.isCorrect === true) || teamAnswers[0];
        const isRepCorrect = repAnswer?.isCorrect === true;
        totalOnline = 1;
        correctAnswers = isRepCorrect && repAnswer ? [repAnswer] : [];
        correctTimes = isRepCorrect && typeof repAnswer?.timeSpent === "number" ? [repAnswer.timeSpent] : [1500];
      }
    }

    let teamStreak = teamStreakMap.get(team.id) || 0;
    if (correctAnswers.length > 0) {
      teamStreak += 1;
      teamStreakMap.set(team.id, teamStreak);
    } else {
      teamStreak = 0;
      teamStreakMap.set(team.id, 0);
    }

    const activeCards = teamCardsMap?.get(team.id) || [];
    let multiplier = 1;
    let shielded = team.shieldCount > 0;
    if (activeCards.some((c) => c.type === "DOUBLE" || c.type === "SCORE_X2")) {
      multiplier = 2;
    }
    if (activeCards.some((c) => c.type === "SHIELD")) {
      shielded = true;
    }

    // Classic Gold Rush Question (x2 Points)
    const isGold = room.mode === "CLASSIC" && Boolean(roomGoldQuestions.get(room.id)?.has(question.id));
    if (isGold) {
      multiplier *= 2;
    }

    // In ELIMINATION mode: Ghost teams accumulate revival statistics instead of live board points
    if (room.mode === "ELIMINATION" && team.isEliminated) {
      let roomGhosts = roomEliminationGhostStats.get(room.id);
      if (!roomGhosts) {
        roomGhosts = new Map();
        roomEliminationGhostStats.set(room.id, roomGhosts);
      }
      let ghostStat = roomGhosts.get(team.id);
      if (!ghostStat) {
        ghostStat = { ghostStreak: 0, ghostTotalCorrect: 0, ghostTotalAnswered: 0, ghostTotalTimeSpent: 0, ghostRoundAllCorrect: false, currentRoundCorrect: 0 };
        roomGhosts.set(team.id, ghostStat);
      }
      if (teamAnswers.length > 0) {
        ghostStat.ghostTotalAnswered++;
        const timeSpentThisQ = teamAnswers[0]?.timeSpent || 0;
        ghostStat.ghostTotalTimeSpent = (ghostStat.ghostTotalTimeSpent || 0) + timeSpentThisQ;
        if (correctAnswers.length > 0) {
          ghostStat.ghostTotalCorrect++;
          ghostStat.ghostStreak++;
          ghostStat.currentRoundCorrect++;
        } else {
          ghostStat.ghostStreak = 0;
        }
      }
    }

    let penaltyMultiplier = 1;
    let isTargetedWithRiskCard = false;
    if (teamCardsMap) {
      for (const [, otherCards] of teamCardsMap) {
        if (otherCards.some((c) => (c.type === "PENALTY" || c.type === "ATTACK") && c.targetTeamId === team.id)) {
          penaltyMultiplier = 2;
          isTargetedWithRiskCard = true;
        }
      }
    }

    const hasDoubleCard = activeCards.some((c) => c.type === "DOUBLE");
    const hasRiskPowerup = hasDoubleCard || isTargetedWithRiskCard;

    const effectiveTeamConfig = {
      ...(room.config as any),
      timeBonusEnabled: room.mode === "CLASSIC" || room.mode === "ELIMINATION" ? Boolean((room.config as any)?.timeBonusEnabled !== false) : false,
    };

    const teamScoreRes = computeTeamQuestionScore({
      basePoints: question.points,
      timeLimit: question.timeLimit,
      totalOnlineMembers: totalOnline,
      correctMembers: correctAnswers.length,
      correctTimes,
      config: effectiveTeamConfig,
      multiplier,
      shielded,
      penaltyMultiplier,
      hasRiskPowerup,
      roomAccuracy,
      topHalfCorrect,
      topHalfTotal,
      bottomHalfCorrect,
      bottomHalfTotal,
      streak: teamStreak,
      mode: room.mode as any,
    });
    const teamPoints = teamScoreRes.points;
    const accuracyRatio = teamScoreRes.accuracyRatio;
    const speedBonus = teamScoreRes.speedBonus;
    const empiricalMultiplier = teamScoreRes.empiricalMultiplier;

    if (room.mode === "ELIMINATION" && team.isEliminated) {
      // Eliminated ghost team does not gain live score on main board
      teamSummaries.push({
        teamId: team.id,
        teamName: team.name,
        teamColor: team.color,
        totalOnlineMembers: totalOnline,
        correctMembers: correctAnswers.length,
        pointsAwarded: 0,
        speedBonus: Math.round(speedBonus * 100),
        multiplier,
        activeCard: activeCards[0]?.type,
        empiricalMultiplier,
        basePoints: teamScoreRes.basePoints,
        speedPoints: teamScoreRes.speedPoints,
        streakPoints: teamScoreRes.streakPoints,
        rarityPoints: teamScoreRes.rarityPoints,
        streak: teamStreak,
        avgTimeSpent: teamScoreRes.avgTimeSpent,
        isEliminated: true,
        effectiveDifficulty: teamScoreRes.effectiveDifficulty,
        discrimination: teamScoreRes.discrimination,
      });
      continue;
    }

    const tRes = await applyScoreDeltaToTeam(team.id, teamPoints);

    if (teamAnswers.length > 0) {
      await prisma.answer.updateMany({
        where: { roomId, questionId, teamId: team.id },
        data: { pointsAwarded: teamPoints },
      }).catch(console.error);
    }

    teamScoresUpdates.push({
      teamId: team.id,
      score: tRes.newScore,
      delta: tRes.effectiveDelta,
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
      activeCard: activeCards[0]?.type,
      empiricalMultiplier,
      basePoints: teamScoreRes.basePoints,
      speedPoints: teamScoreRes.speedPoints,
      streakPoints: teamScoreRes.streakPoints,
      rarityPoints: teamScoreRes.rarityPoints,
      streak: teamStreak,
      avgTimeSpent: teamScoreRes.avgTimeSpent,
      isEliminated: false,
      effectiveDifficulty: teamScoreRes.effectiveDifficulty,
      discrimination: teamScoreRes.discrimination,
    });
  }

  const scoreResult = {
    teamScoresUpdates,
    teamSummaries,
    roomAccuracy,
    rarityBonusPercent,
    effectiveDifficulty: irtMetrics.bEffective,
    itemDiscrimination: irtMetrics.discrimination,
  };
  roomQuestionScoresCache.set(qKey, scoreResult);
  return scoreResult;
}

async function finalizeQuestionOnTimeUp(io: IO, roomId: string, roomCode: string, questionId: string) {
  stopQuestionTimer(roomId);

  const key = `${roomId}:timer`;
  roomRemainingTimes.set(key, 0);
  roomTimerEndsAt.delete(roomId);
  io.to(`room:${roomCode}`).emit("game:timer", { remaining: 0, total: 30, endsAt: Date.now(), serverTime: Date.now() });
  io.to(`room:${roomCode}`).emit("game:timer:expired", { questionId });

  const room = await prisma.room.findUnique({ where: { id: roomId } });
  if (!room) return;
  const qKey = `${roomId}:${questionId}`;

  const isMcMode = (room.config as any)?.answerMethod === "MC";
  if (isMcMode) {
    // Trong chế độ MC/Admin proxy: MC chọn đáp án và công bố đáp án hoàn toàn THỦ CÔNG!
    // Hết giờ thì timer dừng và thông báo hết giờ, nhưng tuyệt đối không tự động reveal!
    return;
  }

  if (room.mode === "BOUNCEBACK") {
    const stealInfo = roomStealBuzzed.get(qKey);
    const primary = roomPrimaryTeams.get(qKey);
    const activeQ = roomActiveQuestions.get(roomId);
    const question = await prisma.question.findUnique({ where: { id: questionId } });

    if (stealInfo) {
      const existingAns = await prisma.answer.findFirst({
        where: {
          roomId,
          questionId,
          OR: [
            { teamId: stealInfo.teamId },
            { playerId: stealInfo.playerId },
          ],
        },
        orderBy: { submittedAt: "desc" },
      });
      const ansArr: string[] = existingAns?.answer ? (Array.isArray(existingAns.answer) ? (existingAns.answer as any[]).map(String) : [String(existingAns.answer)]) : [];
      const { isAutoCorrect, answerText } = evaluateAnswerCorrectness(question, ansArr);
      if (activeQ) {
        activeQ.bouncebackAwaitingJudgment = "STEAL";
        activeQ.bouncebackStealAnswer = ansArr;
        activeQ.bouncebackAutoCorrect = isAutoCorrect;
        activeQ.bouncebackAnswerText = answerText;
        io.to(`room:${roomCode}`).emit("game:question", activeQ);
      }
      const stealTimeoutPayload = {
        phase: "STEAL" as const,
        targetTeamId: stealInfo.teamId,
        targetTeamName: stealInfo.teamName,
        answer: ansArr,
        points: roomBouncebackSelectedPoints.get(qKey) ?? 20,
        isAutoCorrect,
        answerText,
      };
      io.to(`room:${roomCode}`).emit("game:bounceback:awaiting_judgment", stealTimeoutPayload);
      io.to(`room:${roomCode}:admin`).emit("game:bounceback:awaiting_judgment", stealTimeoutPayload);
      return;
    } else if (primary) {
      const teamPlayers = await prisma.player.findMany({ where: { roomId, teamId: primary.teamId }, select: { id: true } });
      const teamPlayerIds = teamPlayers.map((p) => p.id);
      const existingAns = await prisma.answer.findFirst({
        where: {
          roomId,
          questionId,
          OR: [
            { teamId: primary.teamId },
            ...(teamPlayerIds.length > 0 ? [{ playerId: { in: teamPlayerIds } }] : []),
          ],
        },
        orderBy: { submittedAt: "desc" },
      });
      const ansArr: string[] = existingAns?.answer ? (Array.isArray(existingAns.answer) ? (existingAns.answer as any[]).map(String) : [String(existingAns.answer)]) : [];
      const { isAutoCorrect, answerText } = evaluateAnswerCorrectness(question, ansArr);
      if (activeQ) {
        activeQ.bouncebackAwaitingJudgment = "PRIMARY";
        activeQ.bouncebackPrimaryAnswer = ansArr;
        activeQ.bouncebackAutoCorrect = isAutoCorrect;
        activeQ.bouncebackAnswerText = answerText;
        io.to(`room:${roomCode}`).emit("game:question", activeQ);
      }
      const primaryTimeoutPayload = {
        phase: "PRIMARY" as const,
        targetTeamId: primary.teamId,
        targetTeamName: primary.teamName,
        answer: ansArr,
        points: roomBouncebackSelectedPoints.get(qKey) ?? 20,
        isAutoCorrect,
        answerText,
      };
      io.to(`room:${roomCode}`).emit("game:bounceback:awaiting_judgment", primaryTimeoutPayload);
      io.to(`room:${roomCode}:admin`).emit("game:bounceback:awaiting_judgment", primaryTimeoutPayload);
      return;
    }
  } else if (room.mode === "BUZZ") {
    if (roomBuzzFirst.has(qKey)) {
      await finalizeBuzzAnswer(io, roomId, roomCode, questionId);
    }
  } else if (room.mode === "TOURNAMENT") {
    await finalizeTournamentQuestion(io, roomId, roomCode, questionId);
  } else if (room.mode === "GRID_CARO") {
    await finalizeGridCaroQuestion(io, roomId, roomCode, questionId);
  } else if (room.mode === "WAGER") {
    await finalizeWagerQuestion(io, roomId, roomCode, questionId);
  } else if (room.mode === "DICE_RACE") {
    await finalizeDiceRaceQuestion(io, roomId, roomCode, questionId);
  } else if (room.mode === "CLASSIC" || room.mode === "ELIMINATION") {
    if (room.teamMode !== "TEAM") {
      await finalizeIndividualScores(io, roomId, roomCode, questionId);
    }
    await revealCurrentAnswer(io, roomId, roomCode, questionId);
  } else {
    // Catch-all fallback: never leave any mode hanging when countdown reaches 0
    if (room.teamMode !== "TEAM") {
      await finalizeIndividualScores(io, roomId, roomCode, questionId);
    }
    await revealCurrentAnswer(io, roomId, roomCode, questionId);
  }
}

function startQuestionTimer(io: IO, roomCode: string, roomId: string, questionId: string, timeLimit: number) {
  stopQuestionTimer(roomId);

  const key = `${roomId}:timer`;
  const endsAt = Date.now() + timeLimit * 1000;
  roomQuestionStartedAt.set(roomId, Date.now());
  roomTimerEndsAt.set(roomId, endsAt);
  roomRemainingTimes.set(key, timeLimit);

  // Broadcast immediate sync tick with authoritative endsAt and server timestamp
  io.to(`room:${roomCode}`).emit("game:timer", {
    remaining: timeLimit,
    total: timeLimit,
    endsAt,
    serverTime: Date.now(),
  });

  roomTimers.set(key, setInterval(async () => {
    const cur = roomRemainingTimes.get(key) ?? timeLimit;
    const remaining = cur - 1;
    roomRemainingTimes.set(key, remaining);
    io.to(`room:${roomCode}`).emit("game:timer", {
      remaining: Math.max(0, remaining),
      total: timeLimit,
      endsAt,
      serverTime: Date.now(),
    });
    if (remaining <= 0) {
      stopQuestionTimer(roomId);
      await finalizeQuestionOnTimeUp(io, roomId, roomCode, questionId);
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

  if (room.mode === "DICE_RACE") {
    const diceState = roomDiceRaces.get(roomId);
    if (diceState) {
      return room.teams
        .slice()
        .sort((a, b) => {
          const progA = diceState.teamPositions[a.id];
          const progB = diceState.teamPositions[b.id];
          if (progA?.hasFinished && progB?.hasFinished) {
            return (progA.finishRank || 999) - (progB.finishRank || 999);
          }
          if (progA?.hasFinished) return -1;
          if (progB?.hasFinished) return 1;
          const posA = progA?.position ?? 0;
          const posB = progB?.position ?? 0;
          if (posB !== posA) return posB - posA;
          const corrA = room.answers.filter((ans) => ans.teamId === a.id && ans.isCorrect).length;
          const corrB = room.answers.filter((ans) => ans.teamId === b.id && ans.isCorrect).length;
          return corrB - corrA;
        })
        .map((t, i) => {
          const prog = diceState.teamPositions[t.id];
          const pos = prog?.position ?? 0;
          return {
            rank: i + 1,
            teamId: t.id,
            name: t.name,
            score: pos + 1,
            correctAnswers: room.answers.filter((a) => a.teamId === t.id && a.isCorrect).length,
            totalAnswers: room.answers.filter((a) => a.teamId === t.id).length,
          };
        });
    }
  }

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
