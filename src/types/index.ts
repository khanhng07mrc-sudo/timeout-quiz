import type { Server as NetServer, Socket } from "net";
import type { NextApiResponse } from "next";
import type { Server as SocketIOServer } from "socket.io";

// ─── Enums ────────────────────────────────────────────────────────────────────

export type QuestionType =
  | "MC_SINGLE"
  | "MC_MULTI"
  | "TRUE_FALSE"
  | "FILL_BLANK"
  | "ESSAY"
  | "MATCHING"
  | "DRAG_DROP";

export type CardType =
  | "FIFTY_FIFTY"
  | "DOUBLE"
  | "FREEZE"
  | "ATTACK"
  | "SKIP"
  | "TIME_PLUS"
  | "SHIELD"
  | "STEAL"
  | "PENALTY"
  | "SCORE_X2";

export type GameMode = "CLASSIC" | "BUZZ" | "BOUNCEBACK" | "POWERUP" | "ELIMINATION" | "TOURNAMENT";
export type TeamMode = "INDIVIDUAL" | "TEAM";
export type RoomStatus = "LOBBY" | "PLAYING" | "PAUSED" | "FINISHED";

// ─── Card Metadata ────────────────────────────────────────────────────────────

export const CARD_METADATA: Record<CardType, { emoji: string; name: string; nameVi: string; descriptionVi: string; description: string }> = {
  FIFTY_FIFTY: { emoji: "🔀", name: "50/50", nameVi: "50/50", description: "Remove 2 wrong answers", descriptionVi: "Loại bỏ 2 đáp án sai" },
  DOUBLE: { emoji: "✖️2", name: "Double", nameVi: "Nhân đôi", description: "Double points next", descriptionVi: "Nhân đôi điểm câu tiếp theo" },
  FREEZE: { emoji: "❄️", name: "Freeze", nameVi: "Phong tỏa", description: "Skip another team's turn", descriptionVi: "Bỏ qua lượt của đội khác" },
  ATTACK: { emoji: "⚔️", name: "Attack", nameVi: "Tấn công", description: "Force team to answer", descriptionVi: "Chỉ định đội khác trả lời, sai bị trừ" },
  SKIP: { emoji: "🔄", name: "Skip", nameVi: "Đổi câu", description: "Replace question", descriptionVi: "Đổi câu hỏi sang câu khác" },
  TIME_PLUS: { emoji: "⏱️", name: "Time+", nameVi: "Thêm giờ", description: "Add 15 seconds", descriptionVi: "Thêm 15 giây" },
  SHIELD: { emoji: "🛡️", name: "Shield", nameVi: "Tái sinh", description: "Protect from penalty once", descriptionVi: "Bảo vệ khỏi trừ điểm 1 lần" },
  STEAL: { emoji: "💸", name: "Steal", nameVi: "Cướp điểm", description: "Steal points from leader", descriptionVi: "Cướp điểm của đội dẫn đầu" },
  PENALTY: { emoji: "💥", name: "Penalty", nameVi: "Phạt đôi", description: "Double penalty for target team", descriptionVi: "Nhân đôi điểm trừ của đội mục tiêu" },
  SCORE_X2: { emoji: "⭐", name: "Score x2", nameVi: "x2 điểm", description: "Correct=x2, Wrong=0 penalty", descriptionVi: "Đúng x2 điểm, sai không bị trừ" },
};

export type BloomLevel = "REMEMBER" | "APPLY" | "ANALYZE";

export const BLOOM_METADATA: Record<BloomLevel, { labelVi: string; emoji: string; color: string; bg: string }> = {
  REMEMBER: { labelVi: "Nhận biết / Thông hiểu", emoji: "🟢", color: "#22c55e", bg: "rgba(34, 197, 94, 0.15)" },
  APPLY: { labelVi: "Vận dụng", emoji: "🟡", color: "#eab308", bg: "rgba(234, 179, 8, 0.15)" },
  ANALYZE: { labelVi: "Tình huống nâng cao", emoji: "🟣", color: "#a855f7", bg: "rgba(168, 85, 247, 0.15)" },
};

export function getBloomLevelFromPoints(points: number, explicitLevel?: string): BloomLevel {
  if (explicitLevel === "REMEMBER" || explicitLevel === "APPLY" || explicitLevel === "ANALYZE") {
    return explicitLevel;
  }
  if (points >= 20) return "ANALYZE";
  if (points >= 15) return "APPLY";
  return "REMEMBER";
}

// ─── Question ─────────────────────────────────────────────────────────────────

export interface Option {
  id: string;
  text: string;
  isCorrect: boolean;
}

export interface MatchPair {
  id: string;
  left: string;
  right: string;
}

export interface Question {
  id: string;
  type: QuestionType;
  content: string;
  options?: Option[];
  answer?: string;
  pairs?: MatchPair[];
  points: number;
  timeLimit: number;
  mediaUrl?: string;
  mediaType?: "image" | "audio" | "video";
  hint?: string;
  order: number;
  bloomLevel?: BloomLevel;
}

// ─── Game Config ──────────────────────────────────────────────────────────────

export interface GameConfig {
  powerupEnabled: boolean;
  powerupOwnerType: "SHARED" | "TEAM";
  powerupCountPerTeam: number;
  powerupCountShared: number;
  allowedPowerups: CardType[];
  timeBonusEnabled: boolean;
  penaltyForWrong: boolean;
  penaltyPoints: number;
  maxTeams: number;
  buzzMode: boolean;
  eliminationRounds: number;
  bouncebackQuestionsPerTurn?: number;
  bouncebackCycles?: number;
  answerMethod?: "DEVICE" | "MC";
  eliminationDeepScoring?: boolean;
  eliminationIntervalQuestions?: number;
}

// ─── State ────────────────────────────────────────────────────────────────────

export interface PowerupCard {
  id: string;
  type: CardType;
  ownerType: "SHARED" | "TEAM";
  teamId?: string;
  used: boolean;
}

export interface TeamState {
  id: string;
  name: string;
  color: string;
  avatar?: string;
  score: number;
  isEliminated: boolean;
  frozenRounds: number;
  shieldCount: number;
  cards: PowerupCard[];
  playerCount: number;
}

export interface PlayerState {
  id: string;
  name: string;
  avatar?: string;
  score: number;
  teamId?: string;
  isHost: boolean;
  isOnline: boolean;
}

export interface RoomState {
  id: string;
  code: string;
  name: string;
  mode: GameMode;
  teamMode: TeamMode;
  status: RoomStatus;
  currentQuestionIndex: number;
  totalQuestions: number;
  teams: TeamState[];
  players: PlayerState[];
  sharedCards: PowerupCard[];
  config: GameConfig;
}

export interface ActiveBoost {
  type: CardType;
  teamId?: string;
  targetTeamId?: string;
  appliedAt: number;
}

export interface QuestionState {
  question: Omit<Question, "answer" | "pairs" | "options"> & {
    options?: Omit<Option, "isCorrect">[];
    visibleOptionIds?: string[]; // after 50/50 applied
  };
  timeLimit: number;
  startedAt: number;
  buzzedBy?: string;
  activeBoosts: ActiveBoost[];
  bloomLevel?: BloomLevel;
  primaryTeamId?: string; // For BOUNCEBACK: team answering primarily
  primaryTeamName?: string;
  isStealPhase?: boolean; // For BOUNCEBACK: 5s steal buzz window active
  stealBuzzedTeamId?: string; // Team that buzzed to steal
  stealBuzzedTeamName?: string;
  stealAnsweringActive?: boolean; // When answer timer is counting down for steal team
  buzzAnsweringActive?: boolean; // In BUZZ mode: when answer timer is active for buzzed team
  buzzedTeamId?: string;
  buzzedTeamName?: string;
  answerMethod?: "DEVICE" | "MC";
}

// ─── Socket Events ────────────────────────────────────────────────────────────

export interface JoinResult {
  success: boolean;
  playerId?: string;
  teamId?: string;
  roomState?: RoomState;
  error?: string;
}

export interface TeamRevealSummary {
  teamId: string;
  teamName: string;
  teamColor: string;
  totalOnlineMembers: number;
  correctMembers: number;
  pointsAwarded: number;
  speedBonus: number;
  multiplier: number;
  activeCard?: CardType;
  empiricalMultiplier?: number;
}

export interface AnswerRevealPayload {
  questionId: string;
  correctAnswer: string | string[];
  answers: Array<{
    teamId?: string;
    playerId?: string;
    name: string;
    answer: string | string[];
    isCorrect: boolean;
    pointsAwarded: number;
    timeSpent: number;
  }>;
  teamSummaries?: TeamRevealSummary[];
  roomAccuracy?: number; // Tỷ lệ đúng toàn phòng (0 - 1)
  rarityBonusPercent?: number; // % thưởng hiếm nếu tỷ lệ < 30%
  bloomLevel?: BloomLevel;
}

export interface ScoreUpdate {
  teamId?: string;
  playerId?: string;
  score: number;
  delta: number;
}

export interface PowerupUsedPayload {
  cardId: string;
  type: CardType;
  usedByTeamId?: string;
  usedByName: string;
  targetTeamId?: string;
  targetTeamName?: string;
  effect: string;
}

export interface GameEndPayload {
  leaderboard: Array<{
    rank: number;
    teamId?: string;
    playerId?: string;
    name: string;
    score: number;
    correctAnswers: number;
    totalAnswers: number;
  }>;
}

export interface GameStartingPayload {
  seconds: number;
}

export interface GamePreparePayload {
  questionIndex: number;
  totalQuestions: number;
  points: number;
  timeLimit: number;
  seconds: number;
  bloomLevel?: BloomLevel;
  primaryTeamName?: string;
}

export interface ServerToClientEvents {
  "room:state": (state: RoomState) => void;
  "game:starting": (payload: GameStartingPayload) => void;
  "game:prepare": (payload: GamePreparePayload) => void;
  "game:question": (question: QuestionState) => void;
  "game:timer": (payload: { remaining: number; total: number }) => void;
  "game:buzz": (payload: { playerId: string; playerName: string; teamId?: string; teamName?: string }) => void;
  "game:buzz:closed": () => void;
  "game:buzz:answering": (payload: { teamId: string; teamName: string; timeLimit: number }) => void;
  "game:bounceback:open_steal": (payload: { questionId: string; timeLimit: number }) => void;
  "game:bounceback:steal_buzzed": (payload: { teamId: string; teamName: string; playerId: string; playerName: string }) => void;
  "game:bounceback:steal_answering": (payload: { teamId: string; teamName: string; timeLimit: number }) => void;
  "game:answer:reveal": (payload: AnswerRevealPayload) => void;
  "game:score:update": (scores: ScoreUpdate[]) => void;
  "game:powerup:used": (payload: PowerupUsedPayload) => void;
  "game:fifty_fifty:applied": (payload: { teamId: string; hiddenOptionIds: string[] }) => void;
  "game:ended": (payload: GameEndPayload) => void;
  "game:paused": () => void;
  "game:resumed": () => void;
  "player:joined": (player: PlayerState) => void;
  "player:left": (playerId: string) => void;
  "error": (message: string) => void;
}

export interface ClientToServerEvents {
  "room:join": (payload: { code: string; playerName: string; playerId?: string; teamId?: string }, callback: (result: JoinResult) => void) => void;
  "room:leave": () => void;
  "game:answer:submit": (payload: { questionId: string; answer: string | string[] }) => void;
  "game:buzz": () => void;
  "game:powerup:use": (payload: { cardId: string; targetTeamId?: string }) => void;
  "admin:next": () => void;
  "admin:skip:prepare": () => void;
  "admin:pause": () => void;
  "admin:resume": () => void;
  "admin:reveal": () => void;
  "admin:score:manual": (payload: { answerId: string; points: number }) => void;
  "admin:shuffle:cards": () => void;
  "admin:lock:cards": (locked: boolean) => void;
  "admin:buzz:clear": () => void;
  "admin:buzz:start_answer": () => void;
  "admin:bounceback:open_steal": () => void;
  "admin:bounceback:start_steal_answer": () => void;
  "admin:submit:answer": (payload: { questionId: string; teamId?: string; playerId?: string; answer: string | string[] }) => void;
  "admin:join": (code: string, callback?: (result: { success: boolean; roomState?: RoomState; error?: string }) => void) => void;
  "admin:kick:player": (payload: { playerId: string }, callback?: (result: { success: boolean; error?: string }) => void) => void;
  "admin:clean:offline": (callback?: (result: { success: boolean; count?: number; error?: string }) => void) => void;
  "player:select:team": (payload: { teamId: string; playerId?: string }, callback?: (result: { success: boolean; error?: string }) => void) => void;
  "display:join": (code: string) => void;
}

export type NextApiResponseWithSocket = NextApiResponse & {
  socket: Socket & {
    server: NetServer & {
      io?: SocketIOServer<ClientToServerEvents, ServerToClientEvents>;
    };
  };
};
