"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { io, Socket } from "socket.io-client";
import type {
  ServerToClientEvents,
  ClientToServerEvents,
  RoomState,
  TeamState,
  QuestionState,
  GameMode,
  CardType,
  DiceRaceState,
  WagerState,
  TeamWager,
  GamePreparePayload,
  GameIntermissionPayload,
  TournamentState,
  MysteryQuestState,
  TieBreakerState,
  TieBreakerTeam,
} from "@/types";
import { CARD_METADATA, quantizeOlympiaTimeLimit } from "@/types";
import Link from "next/link";
import GameModeRulesModal from "@/components/ui/GameModeRulesModal";
import GameModeIcon from "@/components/ui/GameModeIcon";
import ArenaModeLaunchTransition from "@/components/ui/ArenaModeLaunchTransition";
import { MODE_DISPLAY_NAMES } from "@/lib/game-engine/game-modes-meta";
import MysteryQuestBoard from "@/components/modes/MysteryQuestBoard";
import MagicWheelBoard from "@/components/modes/MagicWheelBoard";
import {
  generateMagicWheelSectors,
  generateSpecialRoundWheelSectors,
  DEFAULT_MAGIC_WHEEL_PUZZLES,
  buildMagicWheelMatchPuzzles,
  calculateSpinDestination,
  normalizeVietnameseBaseLetter,
  checkLetterInSecretPhrase,
  isPuzzleFullyRevealed,
  matchWholeSecretPhrase,
  calculateSpecialRoundAllowedLetters,
  generateFlexibleMCCommentary,
  VIETNAMESE_ALPHABET,
  BASE_24_SECTORS,
} from "@/lib/game-engine/magic-wheel";
import TieBreakerOverlay from "@/components/modes/TieBreakerOverlay";
import type { MagicWheelState, MagicWheelPuzzle } from "@/types";
import { soundManager } from "@/lib/sound-manager";
import {
  generateMysteryStageForTurn,
  handleFlipCard as handleMysteryFlipCard,
  handleCashOut as handleMysteryCashOut,
  handleChooseStealTarget as handleMysteryChooseStealTarget,
  generateMysteryPromoPerk,
  shuffleMemoryPairsTiles,
  handleMemoryPairsSecondChanceDecision,
  handleOneShotDoorsDecision as handleMysteryDoorsDecision,
  handleTarotRedraw as handleMysteryTarotRedraw,
  handleTarotConfirmKeep as handleMysteryTarotConfirmKeep,
  handlePushYourLuckUsePeek as handleMysteryPushYourLuckUsePeek,
  handleTarotProphecyDecision as handleMysteryTarotProphecyDecision,
  synchronizeMysteryStageWithQuestionPoints,
  handleAncientTarotDraw,
  handleAncientTarotSpinWheel,
  handleAncientTarotGambleDecision,
  roundToMultipleOfFive,
  startSurvivalPenaltyMinigame,
  getInitialMemoryPairsState,
} from "@/lib/game-engine/mystery-quest";
import { allocateQuestionsForMatch, calculateModeDerivedConfig } from "@/lib/game-engine/question-allocator";
import { offlineStorage, DEFAULT_OFFLINE_BANK } from "@/lib/offline-storage";
import { generateBalancedDiceTiles, handleDiceRaceLanding } from "@/lib/game-engine/dice-race";
import { getDefaultAllowedPowerupsForMode, isSharedPowerup, SHARED_POWERUP_TYPES, distributeCategorizedCardsToTeams, DEFAULT_SHARED_POWERUP_PROBABILITY } from "@/lib/game-engine/powerups";
import { getTargetTotalQuestions } from "@/lib/utils";
import { normalizeToThreeLevels, getBasePointsForMode, calculateItemIRTMetrics } from "@/lib/game-engine/scoring";
import { getBroadTopic } from "@/lib/topics";
import { getBloomLevelFromPoints } from "@/types";
import {
  syncClockWithServer,
  calculateAuthoritativeTimer,
  calibrateClockFromPacket,
} from "@/lib/clock-sync";

function checkOfflineCanAnyTeamBet(
  teams: TeamState[],
  wagerState: WagerState,
  nextMinOption: number
): boolean {
  if (wagerState.maxBetCap && nextMinOption > wagerState.maxBetCap) {
    return false;
  }
  return teams.some((t) => {
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

const AVAILABLE_MODES: {
  mode: GameMode;
  name: string;
  emoji: string;
  tagline: string;
  badge: string;
  gradient: string;
  accentColor: string;
  glowClass: string;
  perks: string[];
}[] = [
  {
    mode: "GRID_CARO",
    name: "Grid Caro",
    emoji: "🏁",
    tagline: "Chiếm ô ma trận 4x4 · Nối chuỗi Caro K ô nhận thưởng lớn",
    badge: "Chiến thuật",
    gradient: "from-cyan-600 via-blue-600 to-indigo-700",
    accentColor: "#06b6d4",
    glowClass: "glow-neon-cyan",
    perks: ["Ma trận 4x4", "Chuỗi Caro 3 ô", "Thưởng chuỗi +30đ"],
  },
  {
    mode: "MYSTERY_QUEST",
    name: "Mystery Quest",
    emoji: "🗝️",
    tagline: "Lật mở Rương thần bí · Cân não Minigame & Ô số phận",
    badge: "Gameshow",
    gradient: "from-violet-600 via-purple-600 to-pink-600",
    accentColor: "#a855f7",
    glowClass: "glow-neon-purple",
    perks: ["Rương bí ẩn", "3 Minigame cân não", "Khuyến mãi & Khiên"],
  },
  {
    mode: "WAGER",
    name: "Secret Wager",
    emoji: "💰",
    tagline: "Bí mật cược điểm trước câu hỏi · Nhân bội điểm số thắng lớn",
    badge: "Tâm lý",
    gradient: "from-amber-500 via-yellow-600 to-orange-600",
    accentColor: "#f59e0b",
    glowClass: "glow-neon-amber",
    perks: ["Cược điểm bí mật", "Hệ số nhân 2.5x", "Bảo hiểm phá sản"],
  },
  {
    mode: "DICE_RACE",
    name: "Dice Race",
    emoji: "🎲",
    tagline: "Gieo 2 xí ngầu 3D marathon · Vượt cạm bẫy tranh đua về đích",
    badge: "Board Game",
    gradient: "from-orange-500 via-amber-600 to-yellow-600",
    accentColor: "#f97316",
    glowClass: "glow-neon-amber",
    perks: ["Đường đua 30 ô", "Xúc xắc 3D", "Ô cạm bẫy may rủi"],
  },
  {
    mode: "BOUNCEBACK",
    name: "Bounceback",
    emoji: "🔄",
    tagline: "Đội chính trả lời sai · Mở chuông 5 giây cho đối thủ cướp lượt",
    badge: "Cướp điểm",
    gradient: "from-emerald-600 via-teal-600 to-cyan-600",
    accentColor: "#10b981",
    glowClass: "glow-neon-emerald",
    perks: ["Chọn gói điểm", "Sao hy vọng x2", "Cướp quyền luân phiên"],
  },
  {
    mode: "BUZZ",
    name: "Fast Buzz",
    emoji: "🛎️",
    tagline: "Bấm chuông siêu tốc · Độc chiếm quyền trả lời câu hỏi",
    badge: "Tốc độ",
    gradient: "from-rose-600 via-red-600 to-amber-600",
    accentColor: "#ef4444",
    glowClass: "glow-neon-rose",
    perks: ["Cướp chuông 0ms", "Khóa nút tự động", "Phạt điểm sai"],
  },
  {
    mode: "MAGIC_WHEEL",
    name: "Vòng Quay Tri Thức",
    emoji: "🎡",
    tagline: "Chiếc Nón Kỳ Diệu · Quay nón tính điểm, đoán chữ cái & giải ô chữ bí mật",
    badge: "Gameshow VTV3",
    gradient: "from-amber-600 via-orange-600 to-yellow-600",
    accentColor: "#f59e0b",
    glowClass: "glow-neon-amber",
    perks: ["Ô chữ 4x14", "24 ô chuẩn VTV3", "Luật 3 lỗi liên tiếp"],
  },
  {
    mode: "TOURNAMENT",
    name: "Tournament 1v1",
    emoji: "🏆",
    tagline: "Nhánh đấu trực tiếp loại trừ · Tranh cúp vô địch đấu trường",
    badge: "Đối kháng",
    gradient: "from-indigo-600 via-purple-600 to-blue-700",
    accentColor: "#6366f1",
    glowClass: "glow-neon-purple",
    perks: ["Nhánh đấu 1v1", "Khán giả cổ vũ", "Tranh cúp Vô địch"],
  },
  {
    mode: "ELIMINATION",
    name: "Survival",
    emoji: "💀",
    tagline: "Đấu trường sinh tồn khốc liệt · Loại dần đội điểm thấp nhất",
    badge: "Sinh tồn",
    gradient: "from-purple-700 via-pink-700 to-rose-700",
    accentColor: "#d946ef",
    glowClass: "glow-neon-rose",
    perks: ["Loại dần theo vòng", "Thẻ Hồi sinh", "Tính điểm sâu"],
  },
  {
    mode: "CLASSIC",
    name: "Classic",
    emoji: "⚡",
    tagline: "Đấu bảng tính điểm tổng hợp · Trọn bộ thẻ bổ trợ chiến thuật",
    badge: "Toàn năng",
    gradient: "from-blue-600 via-indigo-600 to-cyan-500",
    accentColor: "#3b82f6",
    glowClass: "glow-neon-cyan",
    perks: ["Tính thời gian", "Bonus tốc độ", "Kho thẻ bài"],
  },

];

export default function AdminSandboxPage() {
  const [code, setCode] = useState<string>("");
  const [inputCode, setInputCode] = useState<string>("");
  const [selectedMode, setSelectedMode] = useState<GameMode>("GRID_CARO");
  const [selectedBankId, setSelectedBankId] = useState<string>("");
  const [quizBanks, setQuizBanks] = useState<{ id: string; title: string; _count?: { questions: number } }[]>([]);
  const [creating, setCreating] = useState(false);
  const [isLaunchingAnim, setIsLaunchingAnim] = useState(false);
  const [isLaunchReady, setIsLaunchReady] = useState(false);
  const [launchSourceRect, setLaunchSourceRect] = useState<{ top: number; left: number; width: number; height: number } | null>(null);
  const [launchingMeta, setLaunchingMeta] = useState<typeof AVAILABLE_MODES[0] | null>(null);
  const [roomState, setRoomState] = useState<RoomState | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<QuestionState | null>(null);
  const [timer, setTimer] = useState<{ remaining: number; total: number; endsAt?: number } | null>(null);
  const [adminQuestionData, setAdminQuestionData] = useState<{
    questionId: string;
    options: any[];
    answer?: string;
    type?: string;
    explanation?: string;
  } | null>(null);
  const [showMcCheatSheet, setShowMcCheatSheet] = useState(true);
  const [sandboxTieBreaker, setSandboxTieBreaker] = useState<TieBreakerState | null>(null);
  const adminQuestionDataRef = useRef<{
    questionId: string;
    options: any[];
    answer?: string;
    type?: string;
    explanation?: string;
  } | null>(null);
  const offlineTeamMultiplierRef = useRef<Map<string, number>>(new Map());

  // Offline Sandbox Simulator State & Iframe Refs
  const [isOfflineSandbox, setIsOfflineSandbox] = useState(false);
  const displayIframeRef = useRef<HTMLIFrameElement | null>(null);
  const playerIframeRef = useRef<HTMLIFrameElement | null>(null);
  const offlineQuestionsRef = useRef<any[]>([]);
  const offlineQIndexRef = useRef<number>(-1);
  const offlineTimerRef = useRef<NodeJS.Timeout | null>(null);
  const offlineRemainingRef = useRef<number>(0);
  const offlineAnswersRef = useRef<Map<string, { answer: any; isCorrect: boolean; points: number; timeSpent?: number }>>(new Map());
  const offlineUsedQuestionIdsRef = useRef<Set<string>>(new Set());
  const offlineFinalizedActorsRef = useRef<Set<string>>(new Set());
  const offlineSharedPowerupUsedThisQuestionRef = useRef<boolean>(false);

  // Active Team Switcher in Mobile Device Viewport
  const [activeTeamIndex, setActiveTeamIndex] = useState<number>(0);
  const activeTeamIdRef = useRef<string>("");
  const initialTeamOrderRef = useRef<string[]>([]);
  // Customizable Sandbox Teams (2 to 8 teams)
  const [sandboxCustomTeams, setSandboxCustomTeams] = useState<Array<{ name: string; color: string }>>(() => {
    try {
      if (typeof window !== "undefined") {
        const saved = localStorage.getItem("sandbox_custom_teams");
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length >= 2) return parsed;
        }
      }
    } catch {}
    return [
      { name: "Đội Đỏ", color: "#ef4444" },
      { name: "Đội Lam", color: "#3b82f6" },
      { name: "Đội Vàng", color: "#eab308" },
      { name: "Đội Lục", color: "#10b981" },
    ];
  });

  const handleSetSandboxTeamCount = (count: number) => {
    const clamped = Math.max(2, Math.min(8, count));
    const palette = ["#ef4444", "#3b82f6", "#eab308", "#10b981", "#a855f7", "#ec4899", "#06b6d4", "#f97316"];
    let updated = [...sandboxCustomTeams];
    if (clamped > updated.length) {
      for (let i = updated.length; i < clamped; i++) {
        updated.push({
          name: `Đội ${i + 1}`,
          color: palette[i % palette.length],
        });
      }
    } else if (clamped < updated.length) {
      updated = updated.slice(0, clamped);
    }
    setSandboxCustomTeams(updated);
    try {
      localStorage.setItem("sandbox_custom_teams", JSON.stringify(updated));
    } catch {}
  };

  const handleUpdateSandboxTeamName = (index: number, newName: string) => {
    const updated = [...sandboxCustomTeams];
    if (updated[index]) {
      updated[index] = { ...updated[index], name: newName };
      setSandboxCustomTeams(updated);
      try {
        localStorage.setItem("sandbox_custom_teams", JSON.stringify(updated));
      } catch {}
    }
  };

  // Stable team ordering: keeps teams in deterministic positions (index 0, 1, 2, ...) across questions & score updates
  const stableTeams = useMemo<TeamState[]>(() => {
    if (!roomState?.teams || roomState.teams.length === 0) return [];
    if (initialTeamOrderRef.current.length === 0 && roomState.teams.length > 0) {
      initialTeamOrderRef.current = roomState.teams.map((t) => t.id);
    }
    return [...roomState.teams].sort((a, b) => {
      const idxA = initialTeamOrderRef.current.indexOf(a.id);
      const idxB = initialTeamOrderRef.current.indexOf(b.id);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return (a.name || "").localeCompare(b.name || "");
    });
  }, [roomState?.teams]);

  const currentTeam = stableTeams[activeTeamIndex] || stableTeams[0];

  useEffect(() => {
    // Trong sandbox: Chỉ kích hoạt âm thanh cho màn hình hiển thị (Display preview iframe), host page tắt âm để không bị vọng âm
    soundManager.setMuted(true);
  }, []);

  useEffect(() => {
    if (currentTeam?.id) {
      activeTeamIdRef.current = currentTeam.id;
    }
  }, [currentTeam?.id]);

  // Bot automation state (default: OFF, manual on-demand control)
  const [botAutoEnabled, setBotAutoEnabled] = useState(false);
  const botAutoEnabledRef = useRef(false);
  botAutoEnabledRef.current = botAutoEnabled;
  const [botLogs, setBotLogs] = useState<string[]>([]);

  // Debug card grant modal
  const [showCardModal, setShowCardModal] = useState(false);
  const [grantCardType, setGrantCardType] = useState<CardType>("DOUBLE");
  const [grantTargetTeamId, setGrantTargetTeamId] = useState<string>("");

  // Rule modal
  const [showRulesModal, setShowRulesModal] = useState(false);
  const [showLogsModal, setShowLogsModal] = useState(false);
  const [showCheatDropdown, setShowCheatDropdown] = useState(false);
  const [cheatMenuPos, setCheatMenuPos] = useState({ top: 0, right: 0 });
  const [showSettingsDropdown, setShowSettingsDropdown] = useState(false);
  const [showUtilitiesDropdown, setShowUtilitiesDropdown] = useState(false);
  const [revealPayload, setRevealPayload] = useState<any>(null);
  const [mobileTab, setMobileTab] = useState<"PLAYER" | "DISPLAY" | "HOST">("PLAYER");

  // Sockets
  const adminSocketRef = useRef<Socket<ServerToClientEvents, ClientToServerEvents> | null>(null);
  const botSocketsRef = useRef<Map<string, Socket<ServerToClientEvents, ClientToServerEvents>>>(new Map());
  const pendingBotGridTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pendingBotDiceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const offlineIntermissionTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Admin Features States & Tickers
  const [matchStarting, setMatchStarting] = useState<{ seconds: number; endsAt?: number; total?: number } | null>(null);
  const [questionPrepare, setQuestionPrepare] = useState<GamePreparePayload | null>(null);
  const [intermission, setIntermission] = useState<GameIntermissionPayload | null>(null);
  const [cardsLocked, setCardsLocked] = useState(false);
  const [showEssayModal, setShowEssayModal] = useState(false);
  const [essayGradingScores, setEssayGradingScores] = useState<Record<string, number>>({});
  const [showDirectAnswerModal, setShowDirectAnswerModal] = useState(false);
  const [directAnswerTargetTeamId, setDirectAnswerTargetTeamId] = useState<string>("");
  const [teamSelectedAnswers, setTeamSelectedAnswers] = useState<Record<string, string>>({});
  const [initialTeamScoreInput, setInitialTeamScoreInput] = useState<number>(0);
  const [customMaxQuestionsInput, setCustomMaxQuestionsInput] = useState<string>("");

  useEffect(() => {
    if (roomState?.config?.matchMaxQuestions !== undefined) {
      setCustomMaxQuestionsInput(roomState.config.matchMaxQuestions === 0 ? "" : String(roomState.config.matchMaxQuestions));
    }
  }, [roomState?.config?.matchMaxQuestions]);

  const addLog = useCallback((msg: string) => {
    setBotLogs((prev) => [
      `[${new Date().toLocaleTimeString()}] ${msg}`,
      ...prev.slice(0, 49),
    ]);
  }, []);

  // Floating animated score popups for Sandbox feedback (+20đ, -10đ) & Live Ticker score updates
  const [scorePopups, setScorePopups] = useState<{ id: string; teamId: string; delta: number; text: string }[]>([]);
  const prevScoresRef = useRef<Map<string, number>>(new Map());
  const prevPlayerScoresRef = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    if (!roomState?.teams || roomState.teams.length === 0) return;
    const newPopups: { id: string; teamId: string; delta: number; text: string }[] = [];
    const scoreChanges: string[] = [];

    roomState.teams.forEach((t) => {
      const prev = prevScoresRef.current.get(t.id);
      if (prev !== undefined && prev !== t.score) {
        const delta = t.score - prev;
        if (delta !== 0) {
          const sign = delta > 0 ? `+${delta}` : `${delta}`;
          scoreChanges.push(`[${t.name}]: ${sign}đ (Tổng: ${t.score}đ)`);
          const id = `${t.id}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
          newPopups.push({
            id,
            teamId: t.id,
            delta,
            text: delta > 0 ? `+${delta}đ` : `${delta}đ`,
          });
        }
      }
      prevScoresRef.current.set(t.id, t.score);
    });

    // Also track individual players if in INDIVIDUAL mode
    if (roomState.teamMode === "INDIVIDUAL" && roomState.players && roomState.players.length > 0) {
      roomState.players.forEach((p) => {
        const prev = prevPlayerScoresRef.current.get(p.id);
        if (prev !== undefined && prev !== p.score) {
          const delta = p.score - prev;
          if (delta !== 0) {
            const sign = delta > 0 ? `+${delta}` : `${delta}`;
            scoreChanges.push(`[${p.name}]: ${sign}đ (Tổng: ${p.score}đ)`);
          }
        }
        prevPlayerScoresRef.current.set(p.id, p.score);
      });
    }

    if (scoreChanges.length > 0) {
      addLog(`📊 Cập nhật điểm: ${scoreChanges.join(" · ")}`);
    }

    if (newPopups.length > 0) {
      setScorePopups((curr) => [...curr, ...newPopups]);
      const timer = setTimeout(() => {
        const idsToRemove = new Set(newPopups.map((p) => p.id));
        setScorePopups((curr) => curr.filter((p) => !idsToRemove.has(p.id)));
      }, 1300);
      return () => clearTimeout(timer);
    }
  }, [roomState?.teams, roomState?.players, roomState?.teamMode, addLog]);


  const offlinePrepIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const offlineWarmupIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const pendingOfflineLaunchRef = useRef<(() => void) | null>(null);
  const handleWagerLaunchQuestionRef = useRef<() => void>(() => {});
  const handleAdminNextRef = useRef<() => void>(() => {});
  const launchOfflineQuestionRef = useRef<(idx: number) => void>(() => {});

  // Authoritative ticker for match warmup countdown (5s)
  useEffect(() => {
    if (!matchStarting?.endsAt) return;
    const interval = setInterval(() => {
      const endsAt = matchStarting.endsAt!;
      const total = matchStarting.total || 5;
      const rawRem = Math.max(0, Math.ceil((endsAt - Date.now()) / 1000));
      const remaining = Math.min(total, rawRem);
      setMatchStarting((prev) => {
        if (!prev) return null;
        const rem = Math.min(prev.seconds, remaining);
        if (rem <= 0) {
          if (pendingOfflineLaunchRef.current) {
            const cb = pendingOfflineLaunchRef.current;
            pendingOfflineLaunchRef.current = null;
            setTimeout(() => cb(), 0);
          }
          syncToIframes({ matchStarting: null, questionPrepare: null });
          return null;
        }
        if (prev.seconds === rem && prev.endsAt === endsAt) return prev;
        return { ...prev, seconds: rem, endsAt, total };
      });
    }, 100);
    return () => clearInterval(interval);
  }, [matchStarting?.endsAt]);

  // Authoritative ticker for question preparation countdown (3s)
  useEffect(() => {
    if (!questionPrepare?.endsAt) return;
    const interval = setInterval(() => {
      const endsAt = questionPrepare.endsAt!;
      const total = questionPrepare.total || 3;
      const rawRem = Math.max(0, Math.ceil((endsAt - Date.now()) / 1000));
      const remaining = Math.min(total, rawRem);
      setQuestionPrepare((prev) => {
        if (!prev) return null;
        const rem = Math.min(prev.seconds, remaining);
        if (rem <= 0) return null;
        if (prev.seconds === rem && prev.endsAt === endsAt) return prev;
        return { ...prev, seconds: rem, endsAt, total };
      });
    }, 100);
    return () => clearInterval(interval);
  }, [questionPrepare?.endsAt]);

  // Fetch quiz banks on mount (with offline storage fallback)
  useEffect(() => {
    fetch("/api/quiz-bank?ownerId=demo-host-id")
      .then((res) => res.json())
      .then((data) => {
        const banksList = data.banks || data.quizBanks || [];
        const localOnly = offlineStorage.getLocalBanks().filter((b) => b.isLocalOnly);
        const combined = [...localOnly, ...banksList];
        if (combined.length > 0) {
          setQuizBanks(combined);
          setSelectedBankId(combined[0].id);
        } else {
          const local = offlineStorage.getLocalBanks();
          setQuizBanks(local);
          if (local.length > 0) setSelectedBankId(local[0].id);
        }
      })
      .catch(() => {
        const local = offlineStorage.getLocalBanks();
        setQuizBanks(local);
        if (local.length > 0) setSelectedBankId(local[0].id);
      });
  }, []);

  // ── Bot Socket Manager ──────────────────────────────────────────────────────
  const initBotSockets = useCallback((roomCode: string, teams: { id: string; name: string }[]) => {
    botSocketsRef.current.forEach((sock) => sock.disconnect());
    botSocketsRef.current.clear();
    if (pendingBotGridTimerRef.current) {
      clearTimeout(pendingBotGridTimerRef.current);
      pendingBotGridTimerRef.current = null;
    }
    if (pendingBotDiceTimerRef.current) {
      clearTimeout(pendingBotDiceTimerRef.current);
      pendingBotDiceTimerRef.current = null;
    }

    // Spawn bot sockets for bot-controlled teams only (teams 1, 2, 3). Team 0 is the Human Tester!
    teams.forEach((team, botIdx) => {
      if (botIdx === 0) return;
      const sock: Socket<ServerToClientEvents, ClientToServerEvents> = io({
        transports: ["websocket"],
        query: { sandbox: "1" },
      });

      sock.on("connect", () => {
        sock.emit(
          "room:join",
          {
            code: roomCode,
            playerName: `${team.name} 🤖`,
            playerId: `bot_${roomCode}_t${botIdx + 1}`,
            teamId: team.id,
          },
          (result) => {
            if (result.success) {
              addLog(`Bot [${team.name}] đã kết nối thành công`);
            }
          }
        );
      });

      let pendingBotAnswerQ: QuestionState | null = null;

      const triggerBotAnswer = (qState: QuestionState) => {
        if (!botAutoEnabledRef.current) return;
        // If human tester is controlling this team, do not answer for this bot!
        if (team.id === activeTeamIdRef.current) return;

        const qData = qState.question;
        const rawOpts = (adminQuestionDataRef.current?.questionId === qData.id
          ? adminQuestionDataRef.current.options
          : null) || (qData.options as any[]) || [];
        if (rawOpts.length === 0) return;

        // If turn-based mode, only answer if it is this bot's turn:
        if (qState.primaryTeamId && qState.primaryTeamId !== team.id) {
          return;
        }

        const delay = 2000 + Math.random() * 2000;
        setTimeout(() => {
          if (!botAutoEnabledRef.current) return;
          if (team.id === activeTeamIdRef.current) return;
          if (currentQuestionRef.current?.question?.id !== qData.id) return;
          const correctOpt = rawOpts.find((o: any) => o.isCorrect) || rawOpts[0];
          const wrongOpts = rawOpts.filter((o: any) => !o.isCorrect);
          const wrongOpt = wrongOpts.length > 0
            ? wrongOpts[Math.floor(Math.random() * wrongOpts.length)]
            : (rawOpts.find((o: any) => o.id !== correctOpt.id) || rawOpts[rawOpts.length - 1]);
          const isBotCorrect = Math.random() < 0.70;
          const chosenOpt = isBotCorrect ? correctOpt : wrongOpt;
          const botPlayerId = `bot_${roomCode}_t${botIdx + 1}`;
          sock.emit("game:answer:submit", {
            questionId: qData.id,
            answer: chosenOpt.id,
            teamId: team.id,
            playerId: botPlayerId,
          });
          sock.emit("game:answer:finalize", {
            questionId: qData.id,
            answer: chosenOpt.id,
            teamId: team.id,
          });
          addLog(`Bot [${team.name}] nộp đáp án: ${chosenOpt.text || chosenOpt.id}`);
        }, delay);
      };

      sock.on("game:question", (q) => {
        if (team.id === activeTeamIdRef.current) return;
        if (q.bouncebackSelectPhase) {
          pendingBotAnswerQ = q;
          if (botAutoEnabled && q.primaryTeamId === team.id) {
            const levels: (10 | 20 | 30)[] = [10, 20, 30];
            const picked = levels[Math.floor(Math.random() * levels.length)];
            setTimeout(() => {
              if (team.id === activeTeamIdRef.current) return;
              sock.emit("game:bounceback:select_points", { points: picked });
              addLog(`Bot [${team.name}] tự động chọn gói ${picked} điểm (Về đích Olympia)`);
            }, 1200);
          }
          return;
        }
        if (q.timerPending) {
          pendingBotAnswerQ = q;
          return;
        }
        triggerBotAnswer(q);
      });

      sock.on("game:bounceback:points_selected", (payload) => {
        if (team.id === activeTeamIdRef.current) return;
        if (pendingBotAnswerQ) {
          const q = {
            ...pendingBotAnswerQ,
            bouncebackSelectPhase: false,
            selectedPointLevel: payload.points,
            question: { ...pendingBotAnswerQ.question, points: payload.points },
          };
          pendingBotAnswerQ = null;
          triggerBotAnswer(q);
        }
      });

      sock.on("game:timer:started", () => {
        if (team.id === activeTeamIdRef.current) return;
        if (pendingBotAnswerQ) {
          const q = pendingBotAnswerQ;
          pendingBotAnswerQ = null;
          triggerBotAnswer(q);
        }
      });

      // Handle Bounceback open steal buzz & answer
      sock.on("game:bounceback:open_steal", () => {
        if (!botAutoEnabled) return;
        if (team.id === activeTeamIdRef.current) return;
        if (Math.random() > 0.4) {
          const delay = 1000 + Math.random() * 2000;
          setTimeout(() => {
            if (team.id === activeTeamIdRef.current) return;
            sock.emit("game:buzz");
            addLog(`Bot [${team.name}] bấm chuông CƯỚP LƯỢT!`);
          }, delay);
        }
      });

      sock.on("game:bounceback:steal_answering", (payload) => {
        if (!botAutoEnabled) return;
        if (team.id === activeTeamIdRef.current) return;
        if (payload.teamId === team.id) {
          const delay = 1200 + Math.random() * 1500;
          setTimeout(() => {
            if (team.id === activeTeamIdRef.current) return;
            const curQ = currentQuestionRef.current;
            if (!curQ) return;
            const rawOpts = (adminQuestionDataRef.current?.questionId === curQ.question.id
              ? adminQuestionDataRef.current.options
              : null) || (curQ.question.options as any[]) || [];
            if (rawOpts.length === 0) return;
            const correctOpt = rawOpts.find((o: any) => o.isCorrect) || rawOpts[0];
            const wrongOpts = rawOpts.filter((o: any) => !o.isCorrect);
            const wrongOpt = wrongOpts.length > 0 ? wrongOpts[0] : correctOpt;
            const isBotCorrect = Math.random() < 0.70;
            const chosenOpt = isBotCorrect ? correctOpt : wrongOpt;
            const botPlayerId = `bot_${roomCode}_t${botIdx + 1}`;
            sock.emit("game:answer:submit", {
              questionId: curQ.question.id,
              answer: chosenOpt.id,
              teamId: team.id,
              playerId: botPlayerId,
            });
            addLog(`Bot [${team.name}] trả lời cướp điểm: ${chosenOpt.text || chosenOpt.id}`);
          }, delay);
        }
      });

      // Handle Buzz mode auto buzz when unlocked & answer
      sock.on("game:buzz:unlocked", () => {
        if (!botAutoEnabled) return;
        if (team.id === activeTeamIdRef.current) return;
        if (Math.random() > 0.3) {
          const delay = 800 + Math.random() * 2000;
          setTimeout(() => {
            if (team.id === activeTeamIdRef.current) return;
            sock.emit("game:buzz");
            addLog(`Bot [${team.name}] bấm chuông BUZZ!`);
          }, delay);
        }
      });

      sock.on("game:buzz:answering", (payload) => {
        if (!botAutoEnabled) return;
        if (team.id === activeTeamIdRef.current) return;
        if (payload.teamId === team.id) {
          const delay = 1200 + Math.random() * 1500;
          setTimeout(() => {
            if (team.id === activeTeamIdRef.current) return;
            const curQ = currentQuestionRef.current;
            if (!curQ) return;
            const rawOpts = (adminQuestionDataRef.current?.questionId === curQ.question.id
              ? adminQuestionDataRef.current.options
              : null) || (curQ.question.options as any[]) || [];
            if (rawOpts.length === 0) return;
            const correctOpt = rawOpts.find((o: any) => o.isCorrect) || rawOpts[0];
            const wrongOpts = rawOpts.filter((o: any) => !o.isCorrect);
            const wrongOpt = wrongOpts.length > 0 ? wrongOpts[0] : correctOpt;
            const isBotCorrect = Math.random() < 0.75;
            const chosenOpt = isBotCorrect ? correctOpt : wrongOpt;
            const botPlayerId = `bot_${roomCode}_t${botIdx + 1}`;
            sock.emit("game:answer:submit", {
              questionId: curQ.question.id,
              answer: chosenOpt.id,
              teamId: team.id,
              playerId: botPlayerId,
            });
            addLog(`Bot [${team.name}] trả lời chuông: ${chosenOpt.text || chosenOpt.id}`);
          }, delay);
        }
      });

      botSocketsRef.current.set(team.id, sock);
    });
  }, [botAutoEnabled, addLog]);

  // ── Local Storage & Session Storage Sync Helpers ───────────────────────────
  const [localSandboxRooms, setLocalSandboxRooms] = useState<
    { code: string; name: string; mode: GameMode; isOffline?: boolean; createdAt: string; hostKey?: string }[]
  >([]);

  const syncLocalSandboxRoomsState = useCallback(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem("sandbox_local_rooms");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setLocalSandboxRooms(parsed);
          return;
        }
      }
      setLocalSandboxRooms([]);
    } catch {
      setLocalSandboxRooms([]);
    }
  }, []);

  const saveSandboxSession = useCallback(
    (codeStr: string, isOffline: boolean, mode?: GameMode, bankId?: string, hostKey?: string, roomName?: string) => {
      if (typeof window === "undefined") return;
      try {
        sessionStorage.setItem("sandbox_current_code", codeStr);
        localStorage.setItem("sandbox_current_code", codeStr);
        if (hostKey) {
          localStorage.setItem(`host_key_${codeStr}`, hostKey);
        }
        if (isOffline) {
          sessionStorage.setItem("sandbox_is_offline", "1");
          localStorage.setItem("sandbox_is_offline", "1");
          if (mode) {
            sessionStorage.setItem("sandbox_offline_mode", mode);
            localStorage.setItem("sandbox_offline_mode", mode);
          }
          if (bankId) {
            sessionStorage.setItem("sandbox_offline_bank", bankId);
            localStorage.setItem("sandbox_offline_bank", bankId);
          }
        } else {
          sessionStorage.removeItem("sandbox_is_offline");
          sessionStorage.removeItem("sandbox_offline_mode");
          sessionStorage.removeItem("sandbox_offline_bank");
          localStorage.removeItem("sandbox_is_offline");
          localStorage.removeItem("sandbox_offline_mode");
          localStorage.removeItem("sandbox_offline_bank");
        }

        // Persist room entry in localStorage sandbox_local_rooms
        const rawList = localStorage.getItem("sandbox_local_rooms");
        const existingList: any[] = rawList ? JSON.parse(rawList) : [];
        const safeList = Array.isArray(existingList) ? existingList : [];
        const effectiveMode = mode || "CLASSIC";
        const cleanName = MODE_DISPLAY_NAMES[effectiveMode] || effectiveMode;
        const entry = {
          code: codeStr,
          name: roomName || `Sandbox: ${cleanName} (4 Đội)`,
          mode: effectiveMode,
          isOffline,
          createdAt: new Date().toISOString(),
          hostKey: hostKey || localStorage.getItem(`host_key_${codeStr}`) || "",
        };
        const updatedList = [entry, ...safeList.filter((item) => item?.code !== codeStr)].slice(0, 20);
        localStorage.setItem("sandbox_local_rooms", JSON.stringify(updatedList));
        setLocalSandboxRooms(updatedList);

        const url = new URL(window.location.href);
        url.searchParams.set("code", codeStr);
        if (isOffline) {
          url.searchParams.set("offline", "1");
          if (mode) url.searchParams.set("mode", mode);
        } else {
          url.searchParams.delete("offline");
          url.searchParams.delete("mode");
        }
        window.history.replaceState(null, "", url.toString());
      } catch {}
    },
    []
  );

  const removeSandboxRoomFromLocal = useCallback((targetCode: string) => {
    if (typeof window === "undefined" || !targetCode) return;
    try {
      localStorage.removeItem(`host_key_${targetCode}`);
      if (sessionStorage.getItem("sandbox_current_code") === targetCode) {
        sessionStorage.removeItem("sandbox_current_code");
        sessionStorage.removeItem("sandbox_is_offline");
        sessionStorage.removeItem("sandbox_offline_mode");
        sessionStorage.removeItem("sandbox_offline_bank");
      }
      if (localStorage.getItem("sandbox_current_code") === targetCode) {
        localStorage.removeItem("sandbox_current_code");
        localStorage.removeItem("sandbox_is_offline");
        localStorage.removeItem("sandbox_offline_mode");
        localStorage.removeItem("sandbox_offline_bank");
      }
      const rawList = localStorage.getItem("sandbox_local_rooms");
      if (rawList) {
        const parsed = JSON.parse(rawList);
        if (Array.isArray(parsed)) {
          const next = parsed.filter((item) => item?.code !== targetCode);
          localStorage.setItem("sandbox_local_rooms", JSON.stringify(next));
          setLocalSandboxRooms(next);
        }
      }
    } catch {}
  }, []);

  const clearSandboxSession = useCallback(() => {
    if (typeof window === "undefined") return;
    try {
      sessionStorage.removeItem("sandbox_current_code");
      sessionStorage.removeItem("sandbox_is_offline");
      sessionStorage.removeItem("sandbox_offline_mode");
      sessionStorage.removeItem("sandbox_offline_bank");
      localStorage.removeItem("sandbox_current_code");
      localStorage.removeItem("sandbox_is_offline");
      localStorage.removeItem("sandbox_offline_mode");
      localStorage.removeItem("sandbox_offline_bank");
      const url = new URL(window.location.href);
      url.searchParams.delete("code");
      url.searchParams.delete("offline");
      url.searchParams.delete("mode");
      url.searchParams.delete("key");
      window.history.replaceState(null, "", url.pathname);
    } catch {}
  }, []);

  // ── Admin Socket Connection ─────────────────────────────────────────────────
  const connectAdminSocket = useCallback((roomCode: string) => {
    initialTeamOrderRef.current = [];
    setActiveTeamIndex(0);
    setCurrentQuestion(null);
    setRevealPayload(null);
    setTimer(null);
    setMatchStarting(null);
    setQuestionPrepare(null);
    setIntermission(null);
    setAdminQuestionData(null);
    adminQuestionDataRef.current = null;

    if (adminSocketRef.current) {
      adminSocketRef.current.disconnect();
      adminSocketRef.current = null;
    }
    botSocketsRef.current.forEach((s) => s.disconnect());
    botSocketsRef.current.clear();

    const adminToken = typeof window !== "undefined"
      ? (localStorage.getItem("admin_token") || sessionStorage.getItem("admin_token"))
      : null;
    const storedHostKey = typeof window !== "undefined"
      ? (new URLSearchParams(window.location.search).get("key") || localStorage.getItem(`host_key_${roomCode}`) || "")
      : "";

    const sock: Socket<ServerToClientEvents, ClientToServerEvents> = io({
      transports: ["websocket"],
      query: { sandbox: "1" },
      auth: { token: adminToken },
    });
    adminSocketRef.current = sock;

    sock.on("connect", () => {
      syncClockWithServer(sock);
      sock.emit("admin:join", { code: roomCode, hostKey: storedHostKey } as any, (res: any) => {
        if (res?.success && res.roomState) {
          setRoomState(res.roomState);
          setSelectedMode(res.roomState.mode);
          if (res.roomState.status === "LOBBY") {
            setCurrentQuestion(null);
            setRevealPayload(null);
            setTimer(null);
            setMatchStarting(null);
            setQuestionPrepare(null);
            setIntermission(null);
            setAdminQuestionData(null);
            adminQuestionDataRef.current = null;
          }
          if (res.hostKey) {
            localStorage.setItem(`host_key_${roomCode}`, res.hostKey);
          }
          saveSandboxSession(
            roomCode,
            false,
            res.roomState.mode,
            undefined,
            res.hostKey || storedHostKey,
            res.roomState.name
          );
          addLog(`Admin Socket đã gắn vào phòng: ${roomCode}`);
          initBotSockets(roomCode, res.roomState.teams);
          if (res.roomState.status === "PLAYING") {
            sock.emit("admin:question:get_data", { code: roomCode });
          }
        } else {
          addLog(`⚠️ Không thể gắn vào phòng ${roomCode}: ${res?.error || "Lỗi tham gia"}`);
          if (res?.error && typeof res.error === "string" && res.error.includes("không tồn tại")) {
            removeSandboxRoomFromLocal(roomCode);
            clearSandboxSession();
            setCode("");
            setRoomState(null);
          }
        }
      });
    });

    sock.io.on("reconnect", () => {
      syncClockWithServer(sock);
      sock.emit("admin:join", { code: roomCode, hostKey: storedHostKey } as any, (res: any) => {
        if (res?.success && res.roomState) {
          setRoomState(res.roomState);
          if (res.roomState.status === "PLAYING") {
            sock.emit("admin:question:get_data", { code: roomCode });
          }
        }
      });
    });

    sock.on("room:state", (state) => {
      setRoomState(state);
      roomStateRef.current = state;
      syncToIframes({ roomState: state, magicWheelState: state?.magicWheelState });
      if (state?.status === "LOBBY") {
        setCurrentQuestion(null);
        setRevealPayload(null);
        setTimer(null);
        setMatchStarting(null);
        setQuestionPrepare(null);
        setIntermission(null);
      }
    });
    sock.on("game:prepare:clear" as any, () => {
      setMatchStarting(null);
      setQuestionPrepare(null);
      syncToIframes({ matchStarting: null, questionPrepare: null });
    });
    sock.on("game:magic_wheel:update" as any, (wheelState: any) => {
      setRoomState((prev) => {
        if (!prev) return prev;
        const next = { ...prev, magicWheelState: wheelState };
        roomStateRef.current = next;
        syncToIframes({ roomState: next, magicWheelState: wheelState });
        return next;
      });
    });
    sock.on("game:question:clear" as any, () => {
      setCurrentQuestion(null);
      setRevealPayload(null);
      setTimer(null);
      setTeamSelectedAnswers({});
      offlineAnswersRef.current.clear();
      offlineFinalizedActorsRef.current.clear();
    });
    sock.on("admin:question:data", (data: any) => {
      setAdminQuestionData(data);
      adminQuestionDataRef.current = data;
    });
    sock.on("game:question", (q) => {
      if (roomStateRef.current?.mode === "MAGIC_WHEEL") return;
      if (q.serverTime) calibrateClockFromPacket(q.serverTime);
      sock.emit("admin:question:get_data", { code: roomCode });
      setCurrentQuestion(q);
      setRevealPayload(null);
      setTeamSelectedAnswers({});
      offlineAnswersRef.current.clear();
      offlineFinalizedActorsRef.current.clear();
      const curTeamId = activeTeamIdRef.current || stableTeams[activeTeamIndex]?.id;
      if (curTeamId) {
        sock.emit("admin:sandbox:set_active_team", {
          teamId: curTeamId,
          teamIndex: activeTeamIndex,
          code: roomCode,
        });
      }
      if (pendingBotGridTimerRef.current) {
        clearTimeout(pendingBotGridTimerRef.current);
        pendingBotGridTimerRef.current = null;
      }
      if (pendingBotDiceTimerRef.current) {
        clearTimeout(pendingBotDiceTimerRef.current);
        pendingBotDiceTimerRef.current = null;
      }
      addLog(`Câu hỏi mới: "${q.question.content.slice(0, 30)}..."`);
    });
    sock.on("game:timer:started", (payload) => {
      if (payload?.serverTime) calibrateClockFromPacket(payload.serverTime);
      const tLimit = payload?.timeLimit ?? 30;
      setCurrentQuestion((prev) =>
        prev
          ? {
              ...prev,
              timerPending: false,
              timerStarted: true,
              startedAt: Date.now(),
              endsAt: payload?.endsAt,
              timeLimit: tLimit,
            }
          : prev
      );
      if (payload?.endsAt) {
        const auth = calculateAuthoritativeTimer(payload.endsAt, tLimit, tLimit);
        setTimer({ remaining: auth.remaining, total: tLimit, endsAt: payload.endsAt });
      }
      addLog(`⏱️ Bắt đầu tính giờ: ${tLimit}s`);
    });
    sock.on("game:timer", (t) => {
      if (t.serverTime) calibrateClockFromPacket(t.serverTime);
      setTimer((prev) => {
        const effectiveEndsAt = t.endsAt || prev?.endsAt;
        if (effectiveEndsAt) {
          const auth = calculateAuthoritativeTimer(effectiveEndsAt, t.total, t.remaining);
          return { remaining: auth.remaining, total: t.total, endsAt: effectiveEndsAt };
        }
        return { remaining: t.remaining, total: t.total, endsAt: t.endsAt };
      });
    });
    sock.on("game:timer:expired", () => {
      setTimer((prev) => (prev ? { ...prev, remaining: 0 } : { remaining: 0, total: 30 }));
      addLog("⏰ Hết thời gian câu hỏi!");
    });
    sock.on("game:buzz", (p) => {
      setCurrentQuestion((prev) => prev ? { ...prev, buzzedTeamId: p.teamId, buzzedTeamName: p.teamName, buzzedBy: p.playerName } : prev);
      addLog(`🔔 Đội ${p.teamName || p.playerName} đã bấm chuông!`);
    });
    sock.on("game:buzz:wrong_attempt", (p) => {
      setCurrentQuestion((prev) => prev ? {
        ...prev,
        buzzDisqualifiedTeamIds: p?.disqualifiedTeamIds ?? prev.buzzDisqualifiedTeamIds,
        buzzMaxAttempts: p?.maxAttempts ?? prev.buzzMaxAttempts,
        buzzedTeamId: undefined,
        buzzedTeamName: undefined,
        buzzedBy: undefined,
        buzzAnsweringActive: false,
      } : prev);
      addLog(`❌ Đội ${p.teamName} trả lời sai chuông lượt ${p.attemptNumber}/${p.maxAttempts}`);
    });
    sock.on("game:buzz:closed", () => {
      setCurrentQuestion((prev) => prev ? { ...prev, buzzUnlocked: false, buzzWindowActive: false } : prev);
      addLog("🔒 Chuông đã đóng!");
    });
    sock.on("game:bounceback:open_steal", () => {
      setCurrentQuestion((prev) => prev ? { ...prev, isStealPhase: true, stealBuzzedTeamId: undefined, stealBuzzedTeamName: undefined } : prev);
      addLog("🔔 Cửa sổ cướp điểm 5s đã mở cho các đội!");
    });
    sock.on("game:bounceback:steal_buzzed", (p) => {
      setCurrentQuestion((prev) => prev ? { ...prev, isStealPhase: false, stealBuzzedTeamId: p.teamId, stealBuzzedTeamName: p.teamName } : prev);
      addLog(`🔔 Đội [${p.teamName}] đã bấm chuông cướp lượt!`);
    });
    sock.on("game:intermission", (p) => {
      setIntermission(p);
      setMatchStarting(null);
      setQuestionPrepare(null);
      setCurrentQuestion(null);
      setRevealPayload(null);
      setTimer(null);
      const afterQ = (p?.previousQuestionIndex !== undefined)
        ? (p.previousQuestionIndex + 1)
        : (p?.nextQuestionIndex !== undefined ? p.nextQuestionIndex : (roomStateRef.current?.currentQuestionIndex !== undefined ? roomStateRef.current.currentQuestionIndex + 1 : 1));
      const totalQ = p?.totalQuestions ? ` / ${p.totalQuestions}` : "";
      addLog(`📊 Bảng xếp hạng giữa hiệp (Sau câu #${afterQ}${totalQ})`);
    });
    sock.on("elimination:revival", (payload) => {
      addLog(`✨ [Hồi sinh] Đội ${payload.revivedTeamName} đã được HỒI SINH ngoạn mục với ${payload.revivedScore}đ!`);
    });
    sock.on("game:paused", () => {
      setRoomState((s) => s ? { ...s, status: "PAUSED" } : s);
      addLog("⏸️ Trận đấu tạm dừng");
    });
    sock.on("game:resumed", () => {
      setRoomState((s) => s ? { ...s, status: "PLAYING" } : s);
      addLog("▶️ Trận đấu tiếp tục");
    });
    sock.on("game:powerup:used", (payload: any) => {
      addLog(`🃏 Đội [${payload.usedByName || payload.teamName || "Thí sinh"}] đã kích hoạt thẻ [${payload.type || payload.cardType}]!`);
    });
    sock.on("game:powerup:shared_locked", (payload: any) => {
      addLog(`🔒 Thẻ dùng chung [${payload.cardType}] đã được kích hoạt bởi [${payload.usedByTeamName}]! Thẻ dùng chung của các đội khác bị khóa trong câu này.`);
    });
    sock.on("game:buzz:unlocked", () => {
      setCurrentQuestion((prev) => prev ? { ...prev, buzzUnlocked: true } : prev);
      addLog("🔔 Chuông đã MỞ KHÓA cho tất cả các đội!");
    });
    sock.on("game:bounceback:points_selected", (payload) => {
      const pts = payload.points as (10 | 20 | 30);
      const ptsTimeLimit = payload.timeLimit ?? (pts === 10 ? 15 : pts === 20 ? 20 : 30);
      const effectiveEndsAt = payload.endsAt ?? (Date.now() + ptsTimeLimit * 1000);
      setCurrentQuestion((prev) =>
        prev
          ? {
              ...prev,
              bouncebackSelectPhase: false,
              selectedPointLevel: pts,
              timeLimit: ptsTimeLimit,
              startedAt: Date.now(),
              endsAt: effectiveEndsAt,
              timerPending: false,
              timerStarted: true,
              question: { ...prev.question, points: pts, timeLimit: ptsTimeLimit },
            }
          : prev
      );
      setTimer({ remaining: ptsTimeLimit, total: ptsTimeLimit, endsAt: effectiveEndsAt });
      addLog(`🎯 Đã chọn mức điểm: ${pts}đ (${ptsTimeLimit}s) (Về đích Olympia)`);
    });
    sock.on("game:elimination:round", (payload) => {
      addLog(`💀 Vòng loại #${payload.round}: Đội ${payload.eliminatedTeamName} bị loại! (Còn ${payload.survivingTeamsCount} đội)`);
    });
    sock.on("game:grid:update", (grid) => {
      setRoomState((prev) => prev ? { ...prev, gridCaroState: grid } : prev);
      
      if (grid.selectedCellId || grid.previewActive) {
        if (pendingBotGridTimerRef.current) {
          clearTimeout(pendingBotGridTimerRef.current);
          pendingBotGridTimerRef.current = null;
        }
        return;
      }

      if (botAutoEnabled && grid.currentTurnTeamId && !grid.previewActive && !grid.selectedCellId) {
        if (pendingBotGridTimerRef.current) {
          clearTimeout(pendingBotGridTimerRef.current);
        }
        const botSock = botSocketsRef.current.get(grid.currentTurnTeamId);
        if (botSock) {
          const unclaimed = grid.cells.filter((c) => !c.isCompleted);
          if (unclaimed.length > 0) {
            pendingBotGridTimerRef.current = setTimeout(() => {
              const target = unclaimed[Math.floor(Math.random() * unclaimed.length)];
              botSock.emit("game:grid:select", { cellId: target.id });
              addLog(`Bot [${grid.currentTurnTeamName}] đã chọn ô #${target.id} (${target.points}đ)`);
              pendingBotGridTimerRef.current = null;
            }, 2000);
          }
        }
      }
    });

    sock.on("game:dice:update", (dice) => {
      setRoomState((prev) => prev ? { ...prev, diceRaceState: dice } : prev);
      // If current turn is a bot and allowed to roll (after answering correctly), auto roll
      if (botAutoEnabled && dice.currentTurnTeamId && dice.canRollDice) {
        if (pendingBotDiceTimerRef.current) {
          clearTimeout(pendingBotDiceTimerRef.current);
        }
        const botSock = botSocketsRef.current.get(dice.currentTurnTeamId);
        if (botSock) {
          pendingBotDiceTimerRef.current = setTimeout(() => {
            botSock.emit("game:dice:roll");
            addLog(`Bot [${dice.currentTurnTeamName}] đã đổ xúc xắc!`);
            pendingBotDiceTimerRef.current = null;
          }, 1500);
        }
      }
    });

    sock.on("game:wager:update", (wager) => {
      setRoomState((prev) => prev ? { ...prev, wagerState: wager } : prev);
      // Strictly multiples of 5 within valid steps
      if (botAutoEnabled && wager.phase === "WAGER_PERIOD") {
        botSocketsRef.current.forEach((bSock) => {
          setTimeout(() => {
            const currentHighest = wager.currentHighestWager || 0;
            const maxCap = wager.maxBetCap || 999;
            const allSteps = [10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90];
            const validSteps = allSteps.filter(
              (amt) => amt > currentHighest && amt <= maxCap
            );
            if (validSteps.length > 0 && Math.random() > 0.4) {
              const bet = validSteps[Math.floor(Math.random() * Math.min(2, validSteps.length))];
              bSock.emit("game:wager:submit", { amount: bet });
              addLog(`Bot đã cược ${bet}đ (trần cược: ${maxCap}đ)`);
            }
          }, 1500 + Math.random() * 2000);
        });
      }
    });

    sock.on("game:answer:reveal", (rev) => {
      setRevealPayload(rev);
      const qNum = ((rev as any)?.questionIndex ?? roomStateRef.current?.currentQuestionIndex ?? (currentQuestionRef.current as any)?.index ?? 0) + 1;
      addLog(`Đáp án đã công bố! (Câu hỏi số #${qNum})`);
    });

    sock.on("game:question:clear", () => {
      setCurrentQuestion(null);
      setRevealPayload(null);
      setTimer(null);
      setTeamSelectedAnswers({});
      offlineAnswersRef.current.clear();
      offlineFinalizedActorsRef.current.clear();
      addLog(`Chuyển về bàn cờ / đường đua`);
    });

    sock.on("game:bounceback:awaiting_judgment", (p) => {
      const normalizedAns = Array.isArray(p.answer) ? p.answer : (p.answer ? [p.answer] : undefined);
      setCurrentQuestion((prev) =>
        prev
          ? {
              ...prev,
              bouncebackAwaitingJudgment: p.phase,
              bouncebackAutoCorrect: p.isAutoCorrect,
              bouncebackAnswerText: p.answerText,
              bouncebackPrimaryAnswer: p.phase === "PRIMARY" ? normalizedAns : prev.bouncebackPrimaryAnswer,
              bouncebackStealAnswer: p.phase === "STEAL" ? normalizedAns : prev.bouncebackStealAnswer,
            }
          : prev
      );
      setTimer((prev) => (prev ? { ...prev, remaining: 0, endsAt: undefined } : { remaining: 0, total: 30 }));
      addLog(`⚖️ [Phán quyết] Đội ${p.targetTeamName} đã chốt: ${p.answerText} (${p.isAutoCorrect ? "✓ Đúng" : "✗ Sai"})`);
    });

    sock.on("game:early_completed", (p) => {
      setTimer((prev) => (prev ? { ...prev, remaining: 0, endsAt: undefined } : { remaining: 0, total: 30 }));
      addLog(`⏹️ Vòng trả lời đã chốt sớm! (${p.message || ""})`);
    });

    sock.on("game:answer:finalized", (payload) => {
      addLog(`🔒 [${payload.actorName}] đã chốt đáp án! (${payload.finalizedCount}/${payload.totalParticipantsCount})`);
    });

    sock.on("game:answer:received", (payload: any) => {
      if (payload.teamName || payload.playerName) {
        const ans = Array.isArray(payload.answer) ? payload.answer.join(", ") : payload.answer;
        if (payload.teamId && payload.answer) {
          const singleAns = Array.isArray(payload.answer) ? payload.answer[0] : payload.answer;
          setTeamSelectedAnswers((prev) => ({ ...prev, [payload.teamId]: singleAns }));
        }
        addLog(`📝 [${payload.teamName || payload.playerName}] đã chọn: ${ans}`);
      }
    });

    sock.on("game:buzz:locked", () => {
      setCurrentQuestion((prev) => (prev ? { ...prev, buzzUnlocked: false } : prev));
      addLog("🔒 Chuông đã KHÓA!");
    });

    sock.on("game:starting", (p) => {
      setMatchStarting({ seconds: p.seconds, endsAt: p.endsAt, total: p.total || p.seconds });
      setQuestionPrepare(null);
      setCurrentQuestion(null);
      setRevealPayload(null);
      addLog(`⚡ Chuẩn bị trận đấu: ${p.seconds}s`);
    });

    sock.on("game:prepare", (p) => {
      setMatchStarting(null);
      setQuestionPrepare(p);
      setCurrentQuestion(null);
      setRevealPayload(null);
      addLog(`📖 Chuẩn bị câu ${p.questionIndex + 1}: ${p.seconds}s`);
    });

    sock.on("game:tournament:update", (tState) => {
      setRoomState((prev) => (prev ? { ...prev, tournamentState: tState } : prev));
      addLog(`🏆 Cập nhật giải đấu 1v1 (Trận ${tState.currentMatchId})`);
    });

    sock.on("game:mystery:update", (mState: any) => {
      setRoomState((prev) => (prev ? { ...prev, mysteryQuestState: mState } : prev));
    });

    sock.on("game:mystery:cashed_out", (payload: any) => {
      setRoomState((prev) => {
        if (!prev) return prev;
        const updatedTeams = prev.teams.map((t) => t.id === payload.teamId ? { ...t, score: payload.newScore } : t);
        const updatedMystery = prev.mysteryQuestState ? { ...prev.mysteryQuestState, potPoints: 0, phase: "TURN_SUMMARY" as const } : prev.mysteryQuestState;
        return { ...prev, teams: updatedTeams, mysteryQuestState: updatedMystery };
      });
      addLog(`💰 [${payload.teamName}] đã bảo toàn quỹ điểm: +${payload.totalGained}đ (Tổng: ${payload.newScore}đ)`);
    });

    sock.on("game:score:update", (scores) => {
      setRoomState((prev) => {
        if (!prev) return prev;
        const updatedTeams = prev.teams.map((t) => {
          const upd = scores.find((s) => s.teamId === t.id);
          return upd ? { ...t, score: upd.score } : t;
        });
        const nextState = { ...prev, teams: updatedTeams };
        syncToIframes({ roomState: nextState });
        return nextState;
      });
    });

    sock.on("game:ended", () => {
      addLog(`Trận đấu kết thúc!`);
    });

    sock.on("game:tie_breaker:state" as any, (tbState: TieBreakerState | null) => {
      setSandboxTieBreaker(tbState);
      if (tbState) {
        addLog(`⚔️ [Tie-Breaker] Cập nhật trạng thái: ${tbState.status}`);
      }
    });
  }, [botAutoEnabled, initBotSockets, addLog, saveSandboxSession, clearSandboxSession]);

  useEffect(() => {
    return () => {
      if (adminSocketRef.current) adminSocketRef.current.disconnect();
      botSocketsRef.current.forEach((s) => s.disconnect());
      if (offlineTimerRef.current) clearInterval(offlineTimerRef.current);
      if (offlinePrepIntervalRef.current) clearInterval(offlinePrepIntervalRef.current);
      if (offlineWarmupIntervalRef.current) clearInterval(offlineWarmupIntervalRef.current);
      if (offlineIntermissionTimerRef.current) clearTimeout(offlineIntermissionTimerRef.current);
    };
  }, []);

  const roomStateRef = useRef(roomState);
  roomStateRef.current = roomState;
  const currentQuestionRef = useRef(currentQuestion);
  currentQuestionRef.current = currentQuestion;
  const timerRef = useRef(timer);
  timerRef.current = timer;
  const revealPayloadRef = useRef(revealPayload);
  revealPayloadRef.current = revealPayload;
  const intermissionRef = useRef(intermission);
  intermissionRef.current = intermission;
  const matchStartingRef = useRef(matchStarting);
  matchStartingRef.current = matchStarting;
  const questionPrepareRef = useRef(questionPrepare);
  questionPrepareRef.current = questionPrepare;

  const lastExplicitSyncTimeRef = useRef<number>(0);

  const syncToIframes = useCallback((overrides?: Record<string, any>) => {
    if (!isOfflineSandbox) return;
    if (overrides) {
      lastExplicitSyncTimeRef.current = Date.now();
    }
    const rState = overrides?.roomState ?? roomStateRef.current;
    const curQ = overrides?.currentQuestion ?? currentQuestionRef.current;
    const payload = {
      roomState: rState,
      currentQuestion: curQ,
      timer: overrides?.timer !== undefined ? overrides.timer : timerRef.current,
      revealPayload: overrides?.revealPayload !== undefined ? overrides.revealPayload : revealPayloadRef.current,
      buzzed: null,
      lastPowerup: null,
      matchStarting: overrides?.matchStarting !== undefined ? overrides.matchStarting : matchStartingRef.current,
      questionPrepare: overrides?.questionPrepare !== undefined ? overrides.questionPrepare : questionPrepareRef.current,
      intermission: intermissionRef.current,
      mysteryQuestState: rState?.mysteryQuestState,
      magicWheelState: rState?.magicWheelState,
      ...overrides,
    };
    displayIframeRef.current?.contentWindow?.postMessage({ type: "OFFLINE_SYNC", payload }, "*");
    playerIframeRef.current?.contentWindow?.postMessage({ type: "OFFLINE_SYNC", payload }, "*");
  }, [isOfflineSandbox]);

  useEffect(() => {
    // Tránh gửi lặp 2 lần liên tiếp trong cùng một khung hình khi vừa mới sync trực tiếp từ handler
    if (Date.now() - lastExplicitSyncTimeRef.current < 50) return;
    syncToIframes();
  }, [roomState, currentQuestion, revealPayload, syncToIframes]);

  // Immediately recalibrate timers and resync iframes when switching back to this tab
  useEffect(() => {
    const handleVisibility = () => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        if (isOfflineSandbox) {
          const curQ = currentQuestionRef.current;
          if (curQ?.endsAt && curQ.timeLimit) {
            const now = Date.now();
            if (now >= curQ.endsAt) {
              if (offlineTimerRef.current) {
                clearInterval(offlineTimerRef.current);
                offlineTimerRef.current = null;
              }
              offlineRemainingRef.current = 0;
              setTimer({ remaining: 0, total: curQ.timeLimit, endsAt: 0 });
              syncToIframes({ timer: { remaining: 0, total: curQ.timeLimit, endsAt: 0 } });
            } else {
              const rawRem = Math.max(0, Math.ceil((curQ.endsAt - now) / 1000));
              const rem = Math.min(offlineRemainingRef.current, Math.min(curQ.timeLimit, rawRem));
              offlineRemainingRef.current = rem;
              setTimer({ remaining: rem, total: curQ.timeLimit, endsAt: curQ.endsAt });
              syncToIframes({ timer: { remaining: rem, total: curQ.timeLimit, endsAt: curQ.endsAt } });
            }
          } else {
            syncToIframes();
          }
        }
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [isOfflineSandbox, syncToIframes]);

  const buildOfflineTournamentMatches = useCallback((teams: TeamState[], questionsPerMatch: number = 3) => {
    return [
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
        status: "IN_PROGRESS" as const,
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
        status: "UPCOMING" as const,
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
        status: "UPCOMING" as const,
        currentQuestionInMatch: 0,
        totalQuestionsInMatch: questionsPerMatch,
      },
    ];
  }, []);

  // Offline Sandbox Simulator Initialization
  const startOfflineSandbox = useCallback((mode: GameMode, bankId?: string) => {
    setIsOfflineSandbox(true);
    const offlineCode = "OFFLINE";
    setCode(offlineCode);
    initialTeamOrderRef.current = [];
    setActiveTeamIndex(0);
    saveSandboxSession(offlineCode, true, mode, bankId);

    if (offlineTimerRef.current) {
      clearInterval(offlineTimerRef.current);
      offlineTimerRef.current = null;
    }

    const bank = (bankId && offlineStorage.getLocalBankById(bankId)) || DEFAULT_OFFLINE_BANK;
    const rawQuestions = (bank.questions || []).map((q: any) => ({
      ...q,
      points: normalizeToThreeLevels(q.points || 10),
    }));
    const activeCustomTeams = sandboxCustomTeams.length >= 2 ? sandboxCustomTeams : [
      { name: "Đội Đỏ", color: "#ef4444" },
      { name: "Đội Lam", color: "#3b82f6" },
      { name: "Đội Vàng", color: "#eab308" },
      { name: "Đội Lục", color: "#10b981" },
    ];
    const numTeams = activeCustomTeams.length;

    const maxQ = roomState?.config?.matchMaxQuestions && roomState.config.matchMaxQuestions > 0 ? roomState.config.matchMaxQuestions : undefined;
    const allocResult = allocateQuestionsForMatch({
      questions: rawQuestions,
      targetCount: maxQ,
      mode,
      teamsCount: numTeams,
    });
    offlineQuestionsRef.current = allocResult.allocatedQuestions;
    offlineQIndexRef.current = -1;
    offlineAnswersRef.current.clear();
    offlineUsedQuestionIdsRef.current.clear();

    const modeAllowedPowerups = getDefaultAllowedPowerupsForMode(mode);
    const initialScore = mode === "DICE_RACE" ? 1 : 0;
    const teamIds = activeCustomTeams.map((_, idx) => `t_${idx}`);
    initialTeamOrderRef.current = teamIds;
    const offlineCardsMap = distributeCategorizedCardsToTeams(teamIds, modeAllowedPowerups as any, 2, 2);
    offlineSharedPowerupUsedThisQuestionRef.current = false;

    const palette = ["#ef4444", "#3b82f6", "#eab308", "#10b981", "#a855f7", "#ec4899", "#06b6d4", "#f97316"];
    let teams = activeCustomTeams.map((t, idx) => {
      const tid = teamIds[idx];
      return {
        id: tid,
        name: idx === 0 ? `${t.name} (Bạn)` : `${t.name} 🤖`,
        color: t.color || palette[idx % palette.length],
        score: initialScore,
        isEliminated: false,
        frozenRounds: 0,
        shieldCount: 0,
        cards: mode === "MYSTERY_QUEST" ? [] : (offlineCardsMap.get(tid) || [modeAllowedPowerups[0] || "FIFTY_FIFTY", modeAllowedPowerups[1] || "TIME_PLUS"]).map((type, cidx) => ({ id: `c_${idx}_${cidx + 1}`, type, ownerType: "TEAM" as const, teamId: tid, used: false })),
        playerCount: 1,
        isGhost: false,
        ghostStreak: 0,
        ghostRoundAllCorrect: false,
        ghostTotalCorrect: 0,
        ghostTotalAnswered: 0,
        ghostCurrentRoundCorrect: 0,
        eliminationInterval: 3,
      };
    });

    const players = teams.map((t, idx) => ({
      id: idx === 0 ? "p_you" : `bot_${idx}`,
      name: idx === 0 ? "Bạn (Tester)" : t.name,
      score: initialScore,
      teamId: t.id,
      isHost: idx === 0,
      isOnline: true,
    }));

    let gridCaroState: any = undefined;
    if (mode === "GRID_CARO") {
      const difficultyPoints = [10, 20, 30];
      const cells = Array.from({ length: 9 }, (_, i) => ({
        id: i + 1,
        row: Math.floor(i / 3),
        col: i % 3,
        points: difficultyPoints[i % 3],
        bloomLevel: (i % 3 === 0 ? "REMEMBER" : i % 3 === 1 ? "APPLY" : "EVALUATE") as any,
        isCompleted: false,
      }));
      gridCaroState = {
        gridSize: 3,
        targetToWin: 3,
        cells,
        currentTurnTeamId: teams[0].id,
        currentTurnTeamName: teams[0].name,
        currentTurnIndex: 0,
        completedLines: [],
        previewActive: false,
      };
    }

    let diceRaceState: any = undefined;
    if (mode === "DICE_RACE") {
      const totalTiles = 30;
      const tiles = generateBalancedDiceTiles(totalTiles);
      const teamPositions: Record<string, any> = {};
      for (const t of teams) {
        teamPositions[t.id] = {
          teamId: t.id,
          teamName: t.name,
          teamColor: t.color,
          position: 0,
          hasFinished: false,
          hasShield: false,
        };
      }
      diceRaceState = {
        totalTiles,
        tiles,
        teamPositions,
        currentTurnTeamId: teams[0].id,
        currentTurnTeamName: teams[0].name,
        currentTurnIndex: 0,
        canRollDice: false,
        finishLeaderboard: [],
      };
    }

    let mysteryQuestState: any = undefined;
    if (mode === "MYSTERY_QUEST") {
      mysteryQuestState = generateMysteryStageForTurn({
        turnIndex: 0,
        currentTeam: teams[0],
        teams,
        turnsPerTeam: allocResult.derivedConfig?.mysteryQuestTurnsPerTeam || 2,
      });
      teams = teams.map((t) => ({
        ...t,
        hearts: mysteryQuestState.teamHearts?.[t.id] ?? mysteryQuestState.initialHeartsPerTeam ?? 0,
      }));
    }

    let magicWheelState: any = undefined;
    if (mode === "MAGIC_WHEEL") {
      const bankWordPuzzles = (bank.questions || []).filter((q: any) => q.type === "WORD_PUZZLE");
      const customPuzzles: MagicWheelPuzzle[] = bankWordPuzzles.map((q: any, i: number) => {
        const roundOpt = q.options?.find((o: any) => o.id === "round");
        return {
          id: `puzzle-sandbox-${i + 1}`,
          roundNumber: roundOpt ? Number(roundOpt.text) || (i + 1) : (i + 1),
          category: q.hint || "TỔNG HỢP",
          secretPhrase: (q.answer || "").toUpperCase(),
          clue: q.content || "",
          revealedIndices: [],
        };
      });
      const activePuzzles = buildMagicWheelMatchPuzzles(customPuzzles, teams.length);
      const totalMainRounds = Math.max(3, teams.length);

      magicWheelState = {
        subMode: "WORD_PUZZLE",
        operationMode: "SELF_SERVICE",
        roundStage: "TOSS_UP_1",
        totalMainRounds,
        sectors: generateMagicWheelSectors(1),
        currentTurnTeamId: teams[0].id,
        currentTurnTeamName: teams[0].name,
        mainRound1StarterTeamId: teams[0].id,
        currentRound: 0,
        maxRounds: activePuzzles.length,
        puzzles: activePuzzles,
        currentPuzzle: { ...activePuzzles[0], revealedIndices: [] },
        isSpinning: false,
        spinPower: 50,
        targetRotationDegrees: 0,
        guessedLetters: [],
        wrongGuessesCount: {},
        freeSpinCount: {},
        roundScores: {},
        permanentScores: {},
        disqualifiedTeamIdsInRound: [],
        consecutiveWrongGuesses: {},
        mustSolveWithTones: false,
        tossUpRevealOrder: [],
        tossUpWrongTeamIds: [],
        jackpotPool: 2000,
        expressTrainActive: false,
        speedUpBellActive: false,
        pendingSpecialAction: "NONE",
        phase: "TOSS_UP_READY",
        lastActionMessage: `⚡ VÒNG ĐOÁN NHANH 1 (+500đ): Mời MC/Admin bấm bắt đầu để các chữ cái xuất hiện ngẫu nhiên (0,5s/chữ)!`,
      };
    }

    let tournamentState: any = undefined;
    if (mode === "TOURNAMENT") {
      const tourMatches = buildOfflineTournamentMatches(teams);
      tournamentState = {
        matches: tourMatches,
        currentMatchId: tourMatches[0]?.id || "SF-1",
        questionsPerMatch: allocResult.derivedConfig?.tournamentQuestionsPerMatch || 3,
      };
    }

    const initialRoomState: RoomState = {
      id: "room_offline_local",
      code: offlineCode,
      name: `Phòng Sandbox Ngoại tuyến (${mode})`,
      mode,
      teamMode: "TEAM",
      status: "LOBBY",
      currentQuestionIndex: 0,
      totalQuestions: allocResult.allocatedQuestions.length,
      teams,
      players,
      sharedCards: [],
      config: {
        ...(allocResult.derivedConfig || {}),
        powerupEnabled: mode === "MYSTERY_QUEST" ? false : true,
        powerupOwnerType: "TEAM",
        powerupCountPerTeam: mode === "MYSTERY_QUEST" ? 0 : 2,
        powerupCountShared: 0,
        sharedPowerupTeamQuota: 2,
        sharedPowerupProbability: DEFAULT_SHARED_POWERUP_PROBABILITY,
        allowedPowerups: mode === "MYSTERY_QUEST" ? [] : modeAllowedPowerups,
        timeBonusEnabled: true,
        penaltyForWrong: true,
        penaltyPoints: 10,
        maxTeams: 4,
        buzzMode: mode === "BUZZ",
        eliminationRounds: 1,
        eliminationIntervalQuestions: 3,
        eliminationTeamsPerStage: 1,
        eliminationRevivalCount: 1,
        eliminationDeepScoring: true,
        answerSubmissionMode: "ALLOW_CHANGE",
        autoTimerStart: false,
      },
      gridCaroState,
      diceRaceState,
      mysteryQuestState,
      magicWheelState,
      tournamentState,
    };

    setRoomState(initialRoomState);
    setCurrentQuestion(null);
    setRevealPayload(null);
    setTimer(null);
    addLog(`⚡ Đã kích hoạt Sandbox Ngoại tuyến (Offline Mode) - Chế độ: ${mode}`);
  }, [addLog, saveSandboxSession]);

  // ── Auto Restore Sandbox Room on Mount / Browser Refresh (F5) ───────────────
  const restoredRef = useRef(false);
  useEffect(() => {
    if (restoredRef.current) return;
    restoredRef.current = true;
    if (typeof window === "undefined") return;

    syncLocalSandboxRoomsState();

    const searchParams = new URLSearchParams(window.location.search);
    const urlCode = searchParams.get("code");
    const urlOffline = searchParams.get("offline") === "1";
    const urlMode = searchParams.get("mode") as GameMode | null;

    const storedCode =
      sessionStorage.getItem("sandbox_current_code") ||
      localStorage.getItem("sandbox_current_code");
    const storedOffline =
      sessionStorage.getItem("sandbox_is_offline") === "1" ||
      localStorage.getItem("sandbox_is_offline") === "1";
    const storedMode = (sessionStorage.getItem("sandbox_offline_mode") ||
      localStorage.getItem("sandbox_offline_mode")) as GameMode | null;
    const storedBank =
      sessionStorage.getItem("sandbox_offline_bank") ||
      localStorage.getItem("sandbox_offline_bank") ||
      "";

    // Only restore offline mode if explicitly requested in URL (e.g. ?offline=1 or ?code=OFFLINE)
    const isExplicitlyOffline = urlOffline || (urlCode === "OFFLINE" || (urlCode?.startsWith("OFFLINE") ?? false));

    if (isExplicitlyOffline) {
      const modeToUse = urlMode || storedMode || "BOUNCEBACK";
      const bankToUse = storedBank || "";
      setSelectedMode(modeToUse);
      setIsOfflineSandbox(true);
      startOfflineSandbox(modeToUse, bankToUse);
    } else {
      const candidateCode = (urlCode || (!storedOffline ? storedCode : "") || "").trim();
      if (candidateCode && candidateCode.length === 6 && candidateCode !== "OFFLINE") {
        // Validate with server first before mounting iframes to prevent flashing dead room UI
        fetch(`/api/rooms/${candidateCode}/validate`)
          .then((r) => r.json())
          .then((data) => {
            if (data?.room && data.room.status !== "FINISHED") {
              setCode(candidateCode);
              setIsOfflineSandbox(false);
              saveSandboxSession(candidateCode, false, data.room.mode, undefined, undefined, data.room.name);
              connectAdminSocket(candidateCode);
            } else {
              removeSandboxRoomFromLocal(candidateCode);
              clearSandboxSession();
              setCode("");
              setIsOfflineSandbox(false);
              setRoomState(null);
            }
          })
          .catch(() => {
            clearSandboxSession();
            setCode("");
            setIsOfflineSandbox(false);
            setRoomState(null);
          });
      } else {
        // Fresh start: clear any stale offline flags so user starts in online selection mode
        clearSandboxSession();
        setCode("");
        setIsOfflineSandbox(false);
        setRoomState(null);
      }
    }
  }, [connectAdminSocket, startOfflineSandbox, saveSandboxSession, clearSandboxSession, removeSandboxRoomFromLocal, syncLocalSandboxRoomsState]);

  const checkOfflineEarlyCompletion = () => {
    if (!currentQuestionRef.current) return;
    const curQ = currentQuestionRef.current;
    const teams = roomStateRef.current?.teams || [];

    // Chế độ trả lời qua MC: MC chọn đáp án và công bố đáp án hoàn toàn THỦ CÔNG, không tự động kết thúc!
    const isMcMode = roomStateRef.current?.config?.answerMethod === "MC";
    if (isMcMode) return;

    let neededTeamIds: string[] = [];
    if (selectedMode === "BOUNCEBACK") {
      if (curQ.stealBuzzedTeamId) {
        neededTeamIds = [curQ.stealBuzzedTeamId];
      } else if (curQ.primaryTeamId) {
        neededTeamIds = [curQ.primaryTeamId];
      }
    } else if (selectedMode === "GRID_CARO") {
      const curTurnId = roomStateRef.current?.gridCaroState?.currentTurnTeamId;
      if (curTurnId) neededTeamIds = [curTurnId];
    } else if (selectedMode === "DICE_RACE") {
      const curTurnId = roomStateRef.current?.diceRaceState?.currentTurnTeamId;
      if (curTurnId) neededTeamIds = [curTurnId];
    } else if (selectedMode === "MYSTERY_QUEST") {
      const curTurnId = roomStateRef.current?.mysteryQuestState?.currentTurnTeamId;
      if (curTurnId) neededTeamIds = [curTurnId];
    } else if (selectedMode === "TOURNAMENT") {
      if (curQ.tournamentTeam1Id && curQ.tournamentTeam2Id) {
        neededTeamIds = [curQ.tournamentTeam1Id, curQ.tournamentTeam2Id];
      }
    } else if (selectedMode === "ELIMINATION") {
      neededTeamIds = teams.map((t) => t.id);
    } else {
      neededTeamIds = teams.filter((t) => !t.isEliminated).map((t) => t.id);
    }

    const testerTeamId = activeTeamIdRef.current || stableTeams[activeTeamIndex]?.id || stableTeams[0]?.id || "t_0";
    const testerNeedsToFinalize = neededTeamIds.includes(testerTeamId);
    if (testerNeedsToFinalize && !offlineFinalizedActorsRef.current.has(testerTeamId)) {
      // Tester is playing this question and has not finalized yet! Do not end early!
      return;
    }

    if (neededTeamIds.length > 0 && neededTeamIds.every((id) => offlineFinalizedActorsRef.current.has(id))) {
      if (offlineTimerRef.current) {
        clearInterval(offlineTimerRef.current);
        offlineTimerRef.current = null;
      }
      offlineRemainingRef.current = 0;
      setTimer({ remaining: 0, total: curQ.timeLimit || 30, endsAt: 0 });
      syncToIframes({
        timer: { remaining: 0, total: curQ.timeLimit || 30, endsAt: 0 },
      });
      addLog(`⚡ Tất cả người chơi (${neededTeamIds.length}/${neededTeamIds.length}) đã chốt/nộp bài! Đang chuẩn bị công bố đáp án sau 2.5s...`);
      setTimeout(() => {
        handleAdminReveal();
      }, 2500);
    }
  };

  const handleOfflineBouncebackPointsPicked = (pts: 10 | 20 | 30) => {
    const ptsTimeLimit = pts === 10 ? 15 : pts === 20 ? 20 : 30;
    if (offlineTimerRef.current) {
      clearInterval(offlineTimerRef.current);
      offlineTimerRef.current = null;
    }
    const primaryId = currentQuestionRef.current?.primaryTeamId || roomStateRef.current?.teams[0]?.id || stableTeams[0]?.id || "t_0";
    const primaryName = roomStateRef.current?.teams.find((t) => t.id === primaryId)?.name || "Đội chính";

    // Step 1: 3s prepare countdown
    let prepSeconds = 3;
    const prepEndsAt = Date.now() + 3000 + 250;
    syncToIframes({
      questionPrepare: { seconds: prepSeconds, points: pts, primaryTeamId: primaryId, primaryTeamName: primaryName, endsAt: prepEndsAt, total: 3 },
      currentQuestion: null,
      timer: null,
    });
    addLog(`Đội [${primaryName}] đã chọn gói ${pts}đ. Chuẩn bị câu hỏi trong 3s...`);

    const prepInterval = setInterval(() => {
      prepSeconds -= 1;
      if (prepSeconds > 0) {
        syncToIframes({
          questionPrepare: { seconds: prepSeconds, points: pts, primaryTeamId: primaryId, primaryTeamName: primaryName, endsAt: prepEndsAt, total: 3 },
        });
      } else {
        clearInterval(prepInterval);
        const updatedQ: QuestionState = {
          ...(currentQuestionRef.current || ({} as any)),
          bouncebackSelectPhase: false,
          selectedPointLevel: pts,
          timeLimit: ptsTimeLimit,
          startedAt: Date.now(),
          endsAt: undefined,
          timerPending: true,
          timerStarted: false,
          question: {
            ...currentQuestionRef.current!.question,
            points: pts,
            timeLimit: ptsTimeLimit,
          },
        };
        setCurrentQuestion(updatedQ);
        setTimer(null);
        syncToIframes({
          questionPrepare: null,
          currentQuestion: updatedQ,
          timer: null,
        });
        addLog(`📖 Câu hỏi ${pts}đ đã mở (Timer dừng cho MC đọc đề). Nhấn [Bắt đầu tính giờ] để đếm ngược ${ptsTimeLimit}s!`);
      }
    }, 1000);
  };

  const handleGrantBailout = useCallback((teamId: string) => {
    if (!roomStateRef.current?.wagerState) return;
    const curWager = roomStateRef.current.wagerState;
    const curTeams = roomStateRef.current.teams;

    if (isOfflineSandbox) {
      const q = curWager.bailoutQueue || [];
      if (q.length === 0) {
        addLog("⚠️ Hàng đợi cứu trợ đang trống!");
        return;
      }
      if (curWager.currentQuestionBailoutUsed) {
        addLog("⚠️ Chỉ có thể cứu trợ 1 đội trong mỗi câu hỏi! Vui lòng chờ câu tiếp theo.");
        return;
      }

      const topQueueItem = q[0];
      if (topQueueItem.teamId !== teamId) {
        addLog(`⚠️ Phải ưu tiên cứu đội rời cuộc chơi sớm hơn: [${topQueueItem.teamName}]!`);
        return;
      }

      const team = curTeams.find((t) => t.id === teamId);
      if (!team) return;

      const positiveScores = curTeams.filter((t) => t.score > 0).map((t) => t.score);
      if (positiveScores.length < 1) {
        addLog("⚠️ Điều kiện cứu trợ không thỏa mãn: Cần còn ít nhất 2 đội còn sống!");
        return;
      }

      const lowestPositiveScore = Math.min(...positiveScores);
      const updatedTeams = curTeams.map((t) => {
        if (t.id === teamId) {
          return { ...t, score: lowestPositiveScore, isEliminated: false };
        }
        return t;
      });

      const bailoutMax = roomStateRef.current.config.wagerBailoutLimit ?? 1;
      const bailoutInfo = {
        ...(curWager.teamBailouts?.[teamId] || { remaining: bailoutMax, max: bailoutMax }),
      };
      bailoutInfo.remaining = Math.max(0, bailoutInfo.remaining - 1);

      const nextQueue = q.slice(1);
      const nextWagerState: WagerState = {
        ...curWager,
        teamBailouts: {
          ...curWager.teamBailouts,
          [teamId]: bailoutInfo,
        },
        bailoutQueue: nextQueue,
        currentQuestionBailoutUsed: true,
      };

      const nextRoomState: RoomState = {
        ...roomStateRef.current,
        teams: updatedTeams,
        wagerState: nextWagerState,
      };

      setRoomState(nextRoomState);
      syncToIframes({ roomState: nextRoomState });
      addLog(`🆘 Admin đã cấp trợ cấp hồi sinh cho Đội [${team.name}] (${lowestPositiveScore}đ)!`);
      return;
    }

    // Online Sandbox Mode
    adminSocketRef.current?.emit("admin:wager:grant_bailout" as any, { teamId });
    const targetTeam = curTeams.find((t) => t.id === teamId);
    addLog(`Admin: Kích hoạt cứu trợ cho Đội [${targetTeam?.name || teamId}]...`);
  }, [isOfflineSandbox, addLog, syncToIframes]);

  const handleSetBailoutLimit = useCallback((limit: number) => {
    if (isOfflineSandbox) {
      if (!roomStateRef.current?.wagerState) return;
      const updatedBailouts = { ...(roomStateRef.current.wagerState.teamBailouts || {}) };
      Object.keys(updatedBailouts).forEach((tid) => {
        updatedBailouts[tid] = { ...updatedBailouts[tid], max: limit, remaining: Math.min(updatedBailouts[tid].remaining, limit) };
      });
      const nextRoomState: RoomState = {
        ...roomStateRef.current,
        config: { ...roomStateRef.current.config, wagerBailoutLimit: limit },
        wagerState: { ...roomStateRef.current.wagerState, teamBailouts: updatedBailouts },
      };
      setRoomState(nextRoomState);
      syncToIframes({ roomState: nextRoomState });
      addLog(`Admin: Đã chỉnh giới hạn cứu trợ tối đa: ${limit} lần/đội`);
      return;
    }
    adminSocketRef.current?.emit("admin:wager:set_bailout_limit" as any, { limit });
    addLog(`Admin: Chỉnh giới hạn cứu trợ: ${limit} lần`);
  }, [isOfflineSandbox, addLog, syncToIframes]);

  // ── Admin Features Implementation ──────────────────────────────────────────

  const handleSkipPrepare = useCallback(() => {
    if (isOfflineSandbox) {
      if (offlinePrepIntervalRef.current) {
        clearInterval(offlinePrepIntervalRef.current);
        offlinePrepIntervalRef.current = null;
      }
      if (offlineWarmupIntervalRef.current) {
        clearInterval(offlineWarmupIntervalRef.current);
        offlineWarmupIntervalRef.current = null;
      }
      setMatchStarting(null);
      setQuestionPrepare(null);
      if (pendingOfflineLaunchRef.current) {
        pendingOfflineLaunchRef.current();
        pendingOfflineLaunchRef.current = null;
      }
      syncToIframes({ matchStarting: null, questionPrepare: null });
      addLog("Admin: Đã bỏ qua đếm ngược chuẩn bị");
      return;
    }
    adminSocketRef.current?.emit("admin:skip:prepare" as any, { code });
    setMatchStarting(null);
    setQuestionPrepare(null);
    addLog("Admin: Bỏ qua đếm ngược chuẩn bị");
  }, [isOfflineSandbox, code, addLog, syncToIframes]);

  const handleWagerSkipTimer = useCallback(() => {
    if (isOfflineSandbox) {
      if (!roomStateRef.current?.wagerState || roomStateRef.current.wagerState.phase !== "WAGER_PERIOD") return;
      if (offlineTimerRef.current) {
        clearInterval(offlineTimerRef.current);
        offlineTimerRef.current = null;
      }
      const curWager = roomStateRef.current.wagerState;
      let assignedHighest = curWager.currentHighestWager || 10;
      let winningTeamId = curWager.lastWagerTeamId;
      let winningTeamName = curWager.autoAssignedTeamName;

      if (!winningTeamId) {
        const eligible = (roomStateRef.current.teams || []).filter((t) => t.score > 0 && t.id !== curWager.previousQuestionWagerTeamId);
        const picked = eligible[0] || roomStateRef.current.teams[0];
        if (picked) {
          winningTeamId = picked.id;
          winningTeamName = picked.name;
          assignedHighest = Math.min(10, picked.score || 10);
        }
      }

      const nextWagerState: WagerState = {
        ...curWager,
        currentHighestWager: assignedHighest,
        lastWagerTeamId: winningTeamId,
        autoAssignedTeamId: winningTeamId,
        autoAssignedTeamName: winningTeamName,
        phase: "QUESTION_PERIOD",
        questionReady: false,
        wagerTimeRemaining: 0,
      };

      const nextRoomState: RoomState = { ...roomStateRef.current, wagerState: nextWagerState };
      setRoomState(nextRoomState);
      setTimer(null);
      syncToIframes({ roomState: nextRoomState, timer: null });
      addLog(`Admin: Bỏ qua đếm ngược cược — Đã chốt cược: [${winningTeamName || "Đội cược"}] với ${assignedHighest}đ. Tự động mở câu hỏi sau 2.5s...`);
      setTimeout(() => {
        handleWagerLaunchQuestionRef.current();
      }, 2500);
      return;
    }
    adminSocketRef.current?.emit("admin:wager:skip_timer" as any, { code });
    addLog("Admin: Bỏ qua đếm ngược và chốt cược sớm");
  }, [isOfflineSandbox, code, addLog, syncToIframes]);

  const handleTournamentAdvance = useCallback(() => {
    if (isOfflineSandbox) {
      if (!roomStateRef.current?.tournamentState) return;
      const tournament = { ...roomStateRef.current.tournamentState };
      const curMatch = tournament.matches.find((m) => m.id === tournament.currentMatchId);
      if (curMatch) {
        curMatch.status = "COMPLETED";
        const winnerId = curMatch.team1Score >= curMatch.team2Score ? curMatch.team1Id : curMatch.team2Id;
        const winnerName = curMatch.team1Score >= curMatch.team2Score ? curMatch.team1Name : curMatch.team2Name;
        const winnerColor = curMatch.team1Score >= curMatch.team2Score ? curMatch.team1Color : curMatch.team2Color;

        const finalMatch = tournament.matches.find((m) => m.id === "FINAL");
        if (finalMatch && curMatch.id !== "FINAL") {
          if (!finalMatch.team1Id) {
            finalMatch.team1Id = winnerId;
            finalMatch.team1Name = winnerName;
            finalMatch.team1Color = winnerColor;
          } else if (!finalMatch.team2Id) {
            finalMatch.team2Id = winnerId;
            finalMatch.team2Name = winnerName;
            finalMatch.team2Color = winnerColor;
          }
        } else if (curMatch.id === "FINAL") {
          tournament.championTeamId = winnerId;
          tournament.championTeamName = winnerName;
        }
      }
      const nextPending = tournament.matches.find((m) => m.status === "UPCOMING" && m.team1Id && m.team2Id);
      if (nextPending) {
        nextPending.status = "IN_PROGRESS";
        tournament.currentMatchId = nextPending.id;
      }
      const nextRoomState: RoomState = { ...roomStateRef.current, tournamentState: tournament };
      setRoomState(nextRoomState);
      syncToIframes({ roomState: nextRoomState, tournamentState: tournament });
      addLog(`Admin: Chuyển sang trận tiếp theo trong giải đấu: ${tournament.currentMatchId || "Chung kết"}`);
      return;
    }
    adminSocketRef.current?.emit("admin:tournament:advance" as any, { code });
    addLog("Admin: Chuyển sang trận tiếp theo (1v1)");
  }, [isOfflineSandbox, code, addLog, syncToIframes]);

  const handleScoreManual = useCallback((answerId: string, points: number, teamId?: string, playerId?: string) => {
    if (isOfflineSandbox) {
      if (!revealPayloadRef.current) return;
      const updatedAnswers = (revealPayloadRef.current.answers || []).map((a: any) => {
        if ((a.id && a.id === answerId) || (teamId && a.teamId === teamId) || (playerId && a.playerId === playerId)) {
          return {
            ...a,
            isCorrect: points > 0,
            pointsAwarded: points,
          };
        }
        return a;
      });

      const nextReveal = { ...revealPayloadRef.current, answers: updatedAnswers };
      setRevealPayload(nextReveal);

      if (teamId) {
        setRoomState((prev) => {
          if (!prev) return prev;
          const updatedTeams = prev.teams.map((t) => (t.id === teamId ? { ...t, score: Math.max(0, t.score + points) } : t));
          return { ...prev, teams: updatedTeams };
        });
      }

      syncToIframes({ revealPayload: nextReveal });
      addLog(`Admin: Chấm tự luận: ${points}đ cho [${teamId || playerId || answerId}]`);
      return;
    }

    adminSocketRef.current?.emit("admin:score:manual" as any, { answerId, points, code });
    addLog(`Admin: Chấm tự luận: ${points}đ (ID: ${answerId})`);
  }, [isOfflineSandbox, code, addLog, syncToIframes]);

  const handleOverrideVerdict = useCallback(
    (targetTeamId: string, isCorrect: boolean, answerId?: string, playerId?: string) => {
      const qId = currentQuestionRef.current?.question?.id || adminQuestionDataRef.current?.questionId || "";
      if (!qId) return;

      const teamObj = roomStateRef.current?.teams.find((t) => t.id === targetTeamId);
      const teamName = teamObj?.name || targetTeamId;

      if (!isOfflineSandbox) {
        // Online Room / Sandbox Online: Emit socket event to authoritative server
        adminSocketRef.current?.emit("admin:answer:override_verdict" as any, {
          questionId: qId,
          teamId: targetTeamId,
          playerId,
          answerId,
          isCorrect,
          code,
        });
        addLog(
          isCorrect
            ? `⚖️ MC Can thiệp: DUYỆT ĐÚNG cho [${teamName}]! Hệ thống mở khóa hành động tiếp theo.`
            : `❌ MC Can thiệp: CHẤM SAI / HỦY ĐIỂM cho [${teamName}].`
        );
        return;
      }

      // Offline Sandbox Mode: Process synchronously
      const curQ = currentQuestionRef.current?.question;
      const rawQ = curQ || offlineQuestionsRef.current[offlineQIndexRef.current];
      const basePts = normalizeToThreeLevels(curQ?.points || rawQ?.points || 10);
      let newAwarded = isCorrect ? basePts : 0;

      // Update offline answers cache
      const prevAns = offlineAnswersRef.current.get(targetTeamId);
      const prevAwarded = prevAns?.points ?? 0;
      offlineAnswersRef.current.set(targetTeamId, {
        answer: prevAns?.answer || "MC_OVERRIDE",
        isCorrect,
        points: newAwarded,
      });

      // Update revealPayload
      if (revealPayloadRef.current) {
        const updatedAnswers = (revealPayloadRef.current.answers || []).map((a: any) => {
          if (a.teamId === targetTeamId || (answerId && a.id === answerId)) {
            return {
              ...a,
              isCorrect,
              pointsAwarded: newAwarded,
            };
          }
          return a;
        });

        if (!updatedAnswers.some((a: any) => a.teamId === targetTeamId)) {
          updatedAnswers.push({
            id: answerId || `ans_ov_${targetTeamId}`,
            teamId: targetTeamId,
            teamName,
            answer: prevAns?.answer || "(MC duyệt đúng)",
            isCorrect,
            pointsAwarded: newAwarded,
          });
        }

        const nextReveal = { ...revealPayloadRef.current, answers: updatedAnswers };
        revealPayloadRef.current = nextReveal;
        setRevealPayload(nextReveal);
        syncToIframes({ revealPayload: nextReveal });
      }

      // Mode-specific progression in Offline Sandbox
      setRoomState((prev) => {
        if (!prev) return prev;
        const curMode = selectedMode;

        // Score delta calculation
        const netDelta = newAwarded - prevAwarded;
        let updatedTeams = prev.teams.map((t) =>
          t.id === targetTeamId ? { ...t, score: Math.max(0, t.score + netDelta) } : t
        );

        let nextMystery = prev.mysteryQuestState;
        if (curMode === "MYSTERY_QUEST" && prev.mysteryQuestState) {
          const curMystery = prev.mysteryQuestState;
          if (curMystery.currentTurnTeamId === targetTeamId) {
            if (isCorrect) {
              const promo = generateMysteryPromoPerk(basePts, curMystery.miniGameType, {
                teams: prev.teams,
                currentTeamId: targetTeamId,
                currentRound: curMystery.currentRound ?? 1,
              });
              nextMystery = {
                ...curMystery,
                phase: "DECISION_CHOICE",
                baseQuestionPoints: basePts,
                potPoints: basePts,
                potMultiplier: 1,
                promoPerk: promo,
                hasShield: promo === "SHIELD_PROMO",
                decisionMade: undefined,
                turnFinishedReason: undefined,
                storyResult: undefined,
              };
              nextMystery = synchronizeMysteryStageWithQuestionPoints({
                state: nextMystery,
                questionPoints: basePts,
                theme: nextMystery.theme,
                teams: updatedTeams,
              });
            } else {
              const currentTeamObj = updatedTeams.find((t) => t.id === curMystery.currentTurnTeamId);
              const teamHearts = curMystery.teamHearts ? { ...curMystery.teamHearts } : {};
              const currentHearts = teamHearts[curMystery.currentTurnTeamId] ?? currentTeamObj?.hearts ?? curMystery.initialHeartsPerTeam ?? 0;
              const currentScore = currentTeamObj?.score || 0;

              curMystery.baseQuestionPoints = basePts;
              curMystery.potPoints = 0;
              curMystery.potMultiplier = 1;
              curMystery.turnFinishedReason = undefined;

              // KHI TRẢ LỜI SAI:
              // Nếu còn tim: Chỉ có 1 trong 2 lựa chọn: hoặc giữ nguyên điểm nhưng mất hết tim, hoặc chơi minigame!
              // Nếu đã hết tim (0 tim): Bắt buộc vào thẳng Minigame Sinh Tử!
              if (currentHearts > 0) {
                nextMystery = {
                  ...curMystery,
                  phase: "DECISION_CHOICE",
                  survivalDilemmaPending: true,
                  survivalDilemmaChoice: undefined,
                  isPenaltySurvivalMode: false,
                  teamHearts,
                };
              } else {
                const clonedState = {
                  ...curMystery,
                  survivalDilemmaPending: false,
                  teamHearts,
                };
                startSurvivalPenaltyMinigame({
                  state: clonedState,
                  team: currentTeamObj!,
                  allTeams: updatedTeams,
                });
                nextMystery = clonedState;
              }
            }
          }
        }

        let nextDice = prev.diceRaceState;
        if (curMode === "DICE_RACE" && prev.diceRaceState) {
          if (prev.diceRaceState.currentTurnTeamId === targetTeamId) {
            nextDice = {
              ...prev.diceRaceState,
              canRollDice: isCorrect,
              dicePendingAnswer: false,
            };
          }
        }

        let nextGrid = prev.gridCaroState;
        if (curMode === "GRID_CARO" && prev.gridCaroState) {
          const cell = prev.gridCaroState.cells.find((c) => c.id === prev.gridCaroState?.selectedCellId);
          if (cell && prev.gridCaroState.currentTurnTeamId === targetTeamId) {
            const nextCells = prev.gridCaroState.cells.map((c) => {
              if (c.id === cell.id) {
                return {
                  ...c,
                  isCompleted: isCorrect,
                  claimedByTeamId: isCorrect ? targetTeamId : undefined,
                  claimedByTeamName: isCorrect ? teamName : undefined,
                  claimedByTeamColor: isCorrect ? teamObj?.color : undefined,
                };
              }
              return c;
            });
            nextGrid = {
              ...prev.gridCaroState,
              cells: nextCells,
            };
          }
        }

        let nextWager = prev.wagerState;
        if (curMode === "WAGER" && prev.wagerState) {
          nextWager = {
            ...prev.wagerState,
            phase: "REVEAL_PERIOD",
          };
        }

        const nextRoomState: RoomState = {
          ...prev,
          teams: updatedTeams,
          mysteryQuestState: nextMystery,
          diceRaceState: nextDice,
          gridCaroState: nextGrid,
          wagerState: nextWager,
        };
        roomStateRef.current = nextRoomState;
        syncToIframes({
          roomState: nextRoomState,
          mysteryQuestState: nextMystery,
          diceRaceState: nextDice,
          gridCaroState: nextGrid,
          wagerState: nextWager,
        });
        return nextRoomState;
      });

      addLog(
        isCorrect
          ? `⚖️ [Offline Sandbox] MC Can thiệp: DUYỆT ĐÚNG cho [${teamName}]! Hệ thống mở khóa hành động tiếp theo.`
          : `❌ [Offline Sandbox] MC Can thiệp: CHẤM SAI cho [${teamName}].`
      );
    },
    [isOfflineSandbox, code, selectedMode, addLog, syncToIframes]
  );

  const handleAdminSubmitDirectAnswer = useCallback((teamId: string, answerId: string) => {
    if (!currentQuestionRef.current) return;
    const targetTeam = roomStateRef.current?.teams.find((t) => t.id === teamId);
    const teamName = targetTeam?.name || teamId;

    setTeamSelectedAnswers((prev) => ({ ...prev, [teamId]: answerId }));
    setShowDirectAnswerModal(false);

    // Forward action to tester player iframe so mobile UI updates instantly
    playerIframeRef.current?.contentWindow?.postMessage(
      {
        type: "FORCE_TESTER_ACTION",
        action: "answer",
        answer: answerId,
        teamId,
      },
      "*"
    );

    if (isOfflineSandbox) {
      const rawQ = offlineQuestionsRef.current[offlineQIndexRef.current] || currentQuestionRef.current.question;
      const correctOpt = rawQ.options?.find((o: any) => o.isCorrect);
      const isCorrect = correctOpt ? correctOpt.id === answerId : false;
      const awarded = isCorrect ? (currentQuestionRef.current.question.points || 10) : 0;

      offlineAnswersRef.current.set(teamId, {
        answer: answerId,
        isCorrect,
        points: awarded,
      });
      offlineFinalizedActorsRef.current.add(teamId);
      syncToIframes({ teamAnswers: { [teamId]: answerId } });

      addLog(`🎙️ MC đã nộp đáp án [${answerId}] cho Đội [${teamName}] (${isCorrect ? "Đúng" : "Sai"})`);
      return;
    }

    adminSocketRef.current?.emit("admin:submit:answer" as any, {
      questionId: currentQuestionRef.current.question.id,
      teamId,
      answer: answerId,
      code,
    });
    addLog(`🎙️ MC đã nộp đáp án [${answerId}] cho Đội [${teamName}]`);
  }, [isOfflineSandbox, code, addLog, syncToIframes]);

  const handleToggleCards = useCallback((locked: boolean) => {
    setCardsLocked(locked);
    if (isOfflineSandbox) {
      addLog(locked ? "Admin: Đã khóa thẻ hỗ trợ" : "Admin: Đã mở thẻ hỗ trợ");
      return;
    }
    adminSocketRef.current?.emit("admin:lock:cards" as any, locked);
    addLog(locked ? "Admin: Đã khóa thẻ hỗ trợ" : "Admin: Đã mở thẻ hỗ trợ");
  }, [isOfflineSandbox, addLog]);

  const handleShuffleCards = useCallback(() => {
    if (isOfflineSandbox) {
      addLog("Admin: Đã xáo lại thẻ hỗ trợ");
      return;
    }
    adminSocketRef.current?.emit("admin:shuffle:cards" as any);
    addLog("Admin: Đã xáo lại thẻ hỗ trợ");
  }, [isOfflineSandbox, addLog]);

  const handleSetAllTeamsInitialScores = useCallback((score: number) => {
    const cleanScore = Math.max(0, score);
    if (isOfflineSandbox) {
      setRoomState((prev) => {
        if (!prev) return prev;
        const updatedTeams = prev.teams.map((t) => ({ ...t, score: cleanScore }));
        return {
          ...prev,
          config: { ...prev.config, initialTeamScore: cleanScore } as any,
          teams: updatedTeams,
        };
      });
      syncToIframes();
      addLog(`Admin: Đã đặt điểm xuất phát ban đầu: ${cleanScore}đ cho tất cả đội`);
      return;
    }
    adminSocketRef.current?.emit(
      "admin:teams:set_initial_scores" as any,
      { defaultScore: cleanScore, code },
      (res: any) => {
        if (!res?.success) alert(res?.error || "Không thể đặt điểm ban đầu");
        else addLog(`Admin: Đã đặt điểm xuất phát ban đầu: ${cleanScore}đ cho tất cả đội`);
      }
    );
  }, [isOfflineSandbox, code, addLog, syncToIframes]);

  const handleCleanOfflinePlayers = useCallback(() => {
    if (isOfflineSandbox) {
      addLog("Ngoại tuyến: Tất cả thí sinh là Bot mô phỏng, không có người offline");
      return;
    }
    adminSocketRef.current?.emit("admin:clean:offline" as any, (res: any) => {
      if (res?.success) addLog(`Admin: Đã dọn dẹp ${res.count ?? 0} thí sinh offline`);
      else alert(res?.error || "Lỗi khi dọn dẹp thí sinh offline");
    });
  }, [isOfflineSandbox, addLog]);

  const handleAssignQuizBank = useCallback(async (bankId: string) => {
    if (isOfflineSandbox) {
      setSelectedBankId(bankId);
      let bank = (bankId && offlineStorage.getLocalBankById(bankId)) || null;
      if (!bank && bankId) {
        try {
          const res = await fetch(`/api/quiz-bank/${bankId}`);
          if (res.ok) {
            const data = await res.json();
            if (data?.bank) {
              const fetchedBank = data.bank;
              bank = fetchedBank;
              offlineStorage.saveLocalBank(fetchedBank as any);
            }
          }
        } catch (e) {
          console.error("Failed to fetch bank for offline sandbox:", e);
        }
      }
      if (!bank) bank = DEFAULT_OFFLINE_BANK;

      const rawQuestions = (bank.questions && bank.questions.length > 0 ? bank.questions : DEFAULT_OFFLINE_BANK.questions!).map((q: any) => ({
        ...q,
        points: normalizeToThreeLevels(q.points || 10),
      }));

      const maxQ = roomState?.config?.matchMaxQuestions && roomState.config.matchMaxQuestions > 0 ? roomState.config.matchMaxQuestions : undefined;
      const allocResult = allocateQuestionsForMatch({
        questions: rawQuestions,
        targetCount: maxQ,
        mode: roomState?.mode || "CLASSIC",
        teamsCount: roomState?.teams?.length || 4,
      });

      offlineQuestionsRef.current = allocResult.allocatedQuestions;
      offlineUsedQuestionIdsRef.current.clear();
      offlineAnswersRef.current.clear();
      offlineQIndexRef.current = -1;

      setRoomState((prev) => {
        if (!prev) return prev;
        const updatedConfig = {
          ...prev.config,
          ...(allocResult.derivedConfig || {}),
        };
        let updatedMystery = prev.mysteryQuestState;
        let nextTeams = prev.teams;
        if (prev.mode === "MYSTERY_QUEST" && prev.teams.length > 0) {
          updatedMystery = generateMysteryStageForTurn({
            turnIndex: 0,
            currentTeam: prev.teams[0],
            teams: prev.teams,
            turnsPerTeam: allocResult.derivedConfig?.mysteryQuestTurnsPerTeam || 2,
          });
          nextTeams = nextTeams.map((t) => ({
            ...t,
            hearts: updatedMystery?.teamHearts?.[t.id] ?? updatedMystery?.initialHeartsPerTeam ?? 0,
          }));
        }
        const nextState = {
          ...prev,
          teams: nextTeams,
          totalQuestions: allocResult.allocatedQuestions.length,
          config: updatedConfig,
          mysteryQuestState: updatedMystery,
        };
        setTimeout(() => syncToIframes({ roomState: nextState }), 50);
        return nextState;
      });

      addLog(`Ngoại tuyến: Đã chuyển sang bộ đề [${bank.title}] (${allocResult.allocatedQuestions.length} câu)`);
      return;
    }
    try {
      const token = localStorage.getItem("admin_token") || sessionStorage.getItem("admin_token");
      const storedHostKey = localStorage.getItem(`host_key_${code}`) || "";
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;
      if (storedHostKey) headers["x-host-key"] = storedHostKey;

      const res = await fetch(`/api/rooms/${code}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ quizBankId: bankId || null }),
      });
      if (res.ok) {
        setSelectedBankId(bankId);
        const bTitle = quizBanks.find((b) => b.id === bankId)?.title || bankId;
        addLog(`Admin: Đã đổi bộ đề gán cho phòng: [${bTitle}]`);
      } else {
        alert("Lỗi khi cập nhật bộ đề cho phòng!");
      }
    } catch (err) {
      console.error(err);
      alert("Lỗi kết nối khi đổi bộ đề!");
    }
  }, [isOfflineSandbox, code, quizBanks, addLog, roomState, syncToIframes]);

  const processOfflineWager = useCallback((targetTeamId: string, amount: number) => {
    if (!roomStateRef.current?.wagerState) return;
    const curWager = roomStateRef.current.wagerState;
    if (curWager.phase !== "WAGER_PERIOD") return;

    const team = roomStateRef.current.teams.find((t) => t.id === targetTeamId);
    if (!team) return;

    if (curWager.previousQuestionWagerTeamId === team.id) {
      addLog(`⚠️ [${team.name}] đã cược ở câu trước nên tạm nghỉ cược câu này!`);
      return;
    }

    const isAutoAssignedFirstBid = curWager.autoAssignedTeamId === team.id;
    if (curWager.lastWagerTeamId === team.id && !isAutoAssignedFirstBid) {
      addLog(`⚠️ [${team.name}] không thể cược 2 lần liên tiếp!`);
      return;
    }

    if (amount > team.score) {
      addLog(`⚠️ [${team.name}] cược ${amount}đ vượt quá điểm hiện có (${team.score}đ)!`);
      return;
    }

    if (curWager.maxBetCap && amount > curWager.maxBetCap) {
      addLog(`⚠️ [${team.name}] cược ${amount}đ vượt quá trần cược (${curWager.maxBetCap}đ)!`);
      return;
    }

    const currentHighest = curWager.currentHighestWager || 0;
    const minOption = currentHighest + 5;
    if (amount < minOption) {
      addLog(`⚠️ [${team.name}] cược ${amount}đ không hợp lệ (tối thiểu ${minOption}đ)!`);
      return;
    }

    const nextWager: WagerState = {
      ...curWager,
      currentHighestWager: amount,
      lastWagerTeamId: team.id,
      autoAssignedTeamId: isAutoAssignedFirstBid ? undefined : curWager.autoAssignedTeamId,
      wagerHistory: [
        ...(curWager.wagerHistory || []),
        {
          order: (curWager.wagerHistory?.length || 0) + 1,
          teamId: team.id,
          teamName: team.name,
          teamColor: team.color,
          amount,
          timestamp: Date.now(),
        },
      ],
      teamWagers: {
        ...curWager.teamWagers,
        [team.id]: {
          teamId: team.id,
          teamName: team.name,
          amount,
          submitted: true,
          order: (curWager.wagerHistory?.length || 0) + 1,
        },
      },
    };

    const nextMinOption = amount + 5;
    const canAnyBet = checkOfflineCanAnyTeamBet(roomStateRef.current.teams, nextWager, nextMinOption);

    if (!canAnyBet) {
      if (offlineTimerRef.current) {
        clearInterval(offlineTimerRef.current);
        offlineTimerRef.current = null;
      }
      nextWager.phase = "QUESTION_PERIOD";
      nextWager.questionReady = false;
      nextWager.wagerTimeRemaining = 0;

      const nextRoomState: RoomState = { ...roomStateRef.current, wagerState: nextWager };
      setRoomState(nextRoomState);
      setTimer(null);
      syncToIframes({ roomState: nextRoomState, timer: null });
      addLog(`👑 [${team.name}] cược ${amount}đ — Không còn đội nào đủ điều kiện nâng cược! Tự động chốt cược và mở câu hỏi sau 2.5s...`);
      setTimeout(() => {
        handleWagerLaunchQuestionRef.current();
      }, 2500);
      return;
    }

    if (curWager.wagerSubPhase === "INITIAL_5S") {
      if (offlineTimerRef.current) {
        clearInterval(offlineTimerRef.current);
        offlineTimerRef.current = null;
      }
      const configuredWagerDuration = (roomStateRef.current.config as any)?.wagerTimeSeconds || 15;
      nextWager.wagerSubPhase = "MAIN_15S";
      nextWager.wagerTimeRemaining = configuredWagerDuration;
      nextWager.wagerTimeTotal = configuredWagerDuration;

      const nextRoomState: RoomState = { ...roomStateRef.current, wagerState: nextWager };
      setRoomState(nextRoomState);
      setTimer({ remaining: configuredWagerDuration, total: configuredWagerDuration, endsAt: Date.now() + configuredWagerDuration * 1000 });
      syncToIframes({ roomState: nextRoomState, timer: { remaining: configuredWagerDuration, total: configuredWagerDuration, endsAt: Date.now() + configuredWagerDuration * 1000 } });
      addLog(`💰 [${team.name}] mở màn cược ${amount}đ! Bắt đầu ${configuredWagerDuration}s cho các đội khác nâng cược.`);

      let mainRem = configuredWagerDuration;
      offlineTimerRef.current = setInterval(() => {
        mainRem--;
        if (mainRem <= 0) {
          if (offlineTimerRef.current) {
            clearInterval(offlineTimerRef.current);
            offlineTimerRef.current = null;
          }
          const finalWager: WagerState = {
            ...nextWager,
            phase: "QUESTION_PERIOD",
            questionReady: false,
            wagerTimeRemaining: 0,
          };
          setRoomState((prev) => prev ? { ...prev, wagerState: finalWager } : prev);
          setTimer(null);
          syncToIframes({ roomState: { ...(roomStateRef.current || {}), wagerState: finalWager }, timer: null });
          addLog(`⌛ Đã hết ${configuredWagerDuration}s cược! Tự động chốt cược và mở câu hỏi trong 2.5s...`);
          setTimeout(() => {
            handleWagerLaunchQuestionRef.current();
          }, 2500);
        } else {
          setTimer((prev) => prev ? { ...prev, remaining: mainRem } : null);
          setRoomState((prev) => prev?.wagerState ? { ...prev, wagerState: { ...prev.wagerState, wagerTimeRemaining: mainRem } } : prev);
        }
      }, 1000);
      return;
    }

    const nextRoomState: RoomState = { ...roomStateRef.current, wagerState: nextWager };
    setRoomState(nextRoomState);
    syncToIframes({ roomState: nextRoomState });
    addLog(`💰 [${team.name}] nâng cược lên ${amount}đ!`);
  }, [addLog, syncToIframes]);

  // Handle player actions sent from the mobile viewport iframe
  useEffect(() => {
    const handlePlayerAction = (e: MessageEvent) => {
      if (e.data?.type === "WAGER_GRANT_BAILOUT") {
        handleGrantBailout(e.data.teamId);
        return;
      }
      if (e.data?.type === "WAGER_SET_BAILOUT_LIMIT") {
        handleSetBailoutLimit(e.data.limit);
        return;
      }
      if (e.data?.type === "MYSTERY_FLIP" || e.data?.action === "mystery_flip") {
        const tileId = Number(e.data?.tileId);
        if (!isOfflineSandbox) {
          // Thí sinh trong iframe ở Sandbox Online đã emit trực tiếp qua socket thí sinh.
          // Tuyệt đối không emit thêm từ admin socket để tránh rút 2 lá 1 lúc!
          return;
        }
        if (!roomStateRef.current?.mysteryQuestState) return;
        const curMystery = { ...roomStateRef.current.mysteryQuestState };
        const activeTeam = roomStateRef.current.teams.find((t) => t.id === curMystery.currentTurnTeamId);
        if (!activeTeam) return;

        const {
          updatedState,
          isBomb,
          scorePenalty,
          finalScoreDelta,
          recipientTeamId,
          giftedPoints,
          darkBombRecipients,
          victimTeamId,
          victimTeamName,
          stolenPoints,
          temperanceBonusRecipients,
          shouldResetMismatchedCards,
        } = handleMysteryFlipCard({
          state: curMystery,
          tileId,
          team: activeTeam,
          allTeams: roomStateRef.current.teams,
        });

        let updatedTeams = [...roomStateRef.current.teams];
        if (victimTeamId && stolenPoints && stolenPoints > 0 && updatedState.miniGameType !== "PUSH_YOUR_LUCK") {
          updatedTeams = updatedTeams.map((t) => {
            if (t.id === victimTeamId) return { ...t, score: Math.max(0, t.score - stolenPoints) };
            if (t.id === activeTeam.id) return { ...t, score: t.score + (finalScoreDelta || stolenPoints) };
            return t;
          });
          addLog(`🗡️ [${activeTeam.name}] cướp thành công ${stolenPoints}đ từ [${victimTeamName || "Đội dẫn đầu"}] (có giới hạn bảo vệ)!`);
        } else if (isBomb) {
          if (darkBombRecipients && darkBombRecipients.length > 0) {
            const recipientMap = new Map(darkBombRecipients.map((r) => [r.teamId, r.points]));
            updatedTeams = updatedTeams.map((t) => {
              if (t.id === activeTeam.id) return { ...t, score: Math.max(0, t.score - scorePenalty) };
              if (recipientMap.has(t.id)) return { ...t, score: t.score + (recipientMap.get(t.id) || 0) };
              return t;
            });
          } else if (recipientTeamId && giftedPoints && giftedPoints > 0) {
            updatedTeams = updatedTeams.map((t) => {
              if (t.id === activeTeam.id) return { ...t, score: Math.max(0, t.score - giftedPoints) };
              if (t.id === recipientTeamId) return { ...t, score: t.score + giftedPoints };
              return t;
            });
          } else if (scorePenalty > 0) {
            const netDelta = (finalScoreDelta !== undefined && finalScoreDelta !== 0) ? finalScoreDelta : -scorePenalty;
            updatedTeams = updatedTeams.map((t) =>
              t.id === activeTeam.id ? { ...t, score: Math.max(0, t.score + netDelta) } : t
            );
          }
        } else if (finalScoreDelta !== undefined && finalScoreDelta !== 0) {
          const temperanceMap = new Map((temperanceBonusRecipients || []).map((r) => [r.teamId, r.points]));
          updatedTeams = updatedTeams.map((t) => {
            if (t.id === activeTeam.id) return { ...t, score: Math.max(0, t.score + finalScoreDelta) };
            if (temperanceMap.has(t.id)) return { ...t, score: t.score + (temperanceMap.get(t.id) || 0) };
            return t;
          });
        } else if (updatedState.turnFinishedReason === "ALL_CLEARED") {
          updatedTeams = updatedTeams.map((t) =>
            t.id === activeTeam.id ? { ...t, score: t.score + updatedState.potPoints } : t
          );
        }

        const nextRoomState: RoomState = {
          ...roomStateRef.current,
          teams: updatedTeams,
          mysteryQuestState: updatedState,
        };
        roomStateRef.current = nextRoomState;
        setRoomState(nextRoomState);
        syncToIframes({ roomState: nextRoomState, mysteryQuestState: updatedState });
        if (updatedState.turnFinishedReason === "PAIR_MATCHED" || updatedState.turnFinishedReason === "SURVIVAL_ESCAPE") {
          addLog(`🎉 [${activeTeam.name}] ${updatedState.turnFinishedReason === "SURVIVAL_ESCAPE" ? "THOÁT HIỂM THÀNH CÔNG" : "GHÉP CẶP THÀNH CÔNG"}: ${updatedState.storyResult?.rewardText || ""} (+${finalScoreDelta || 0}đ)`);
          soundManager.playCorrect();
        } else if (isBomb || updatedState.turnFinishedReason === "SURVIVAL_FAILED") {
          addLog(`💥 [${activeTeam.name}] ${updatedState.turnFinishedReason === "SURVIVAL_FAILED" ? "SINH TỬ THẤT BẠI" : "dẫm phải BOM"} ở ô #${tileId}! ${updatedState.bombExploded?.penaltyText || updatedState.storyResult?.rewardText || ""}`);
          soundManager.playWrong();
        } else {
          addLog(`💎 [${activeTeam.name}] lật mở thành công ô #${tileId}! Hũ điểm: ${updatedState.potPoints}đ`);
        }

        // Memory Pairs mismatch auto reset in offline sandbox
        if (shouldResetMismatchedCards && updatedState.memoryPairsState) {
          setTimeout(() => {
            if (!roomStateRef.current?.mysteryQuestState?.memoryPairsState) return;
            const cur = { ...roomStateRef.current.mysteryQuestState };
            const curMem = { ...cur.memoryPairsState! };
            if (curMem.isBombRescueActive) return;
            const { firstFlippedTileId, secondFlippedTileId, thirdFlippedTileId, keptBombTileIds } = curMem;
            const keptBombsSet = new Set((keptBombTileIds || []).map(Number));
            cur.tiles = cur.tiles.map((t) => {
              const isTurnTile = Number(t.id) === Number(firstFlippedTileId) ||
                                 Number(t.id) === Number(secondFlippedTileId) ||
                                 Number(t.id) === Number(thirdFlippedTileId);
              if (isTurnTile && !keptBombsSet.has(Number(t.id))) {
                return { ...t, isOpened: false };
              }
              return { ...t };
            });
            curMem.firstFlippedTileId = null;
            curMem.secondFlippedTileId = null;
            curMem.thirdFlippedTileId = null;
            curMem.isMismatchResolving = false;
            cur.memoryPairsState = curMem;
            const updatedRState = { ...roomStateRef.current, mysteryQuestState: cur };
            roomStateRef.current = updatedRState;
            setRoomState(updatedRState);
            syncToIframes({ roomState: updatedRState, mysteryQuestState: cur });
          }, 1500);
        }

        return;
      }
      if (e.data?.type === "MYSTERY_PAIRS_DECISION" || e.data?.action === "mystery_pairs_decision") {
        if (!isOfflineSandbox) return;
        if (!roomStateRef.current?.mysteryQuestState) return;
        const curMystery = { ...roomStateRef.current.mysteryQuestState };
        const activeTeam = roomStateRef.current.teams.find((t) => t.id === curMystery.currentTurnTeamId);
        if (!activeTeam) return;

        const { updatedState, finalScoreDelta } = handleMemoryPairsSecondChanceDecision({
          state: curMystery,
          team: activeTeam,
          choice: e.data.choice,
        });

        let updatedTeams = [...roomStateRef.current.teams];
        if (finalScoreDelta > 0) {
          updatedTeams = updatedTeams.map((t) =>
            t.id === activeTeam.id
              ? {
                  ...t,
                  score: t.score + finalScoreDelta,
                  hearts: updatedState.teamHearts?.[t.id] ?? t.hearts,
                }
              : { ...t, hearts: updatedState.teamHearts?.[t.id] ?? t.hearts }
          );
          const remainingHearts = updatedState.teamHearts?.[activeTeam.id] ?? activeTeam.hearts ?? 0;
          addLog(`💰 [${activeTeam.name}] dừng lại an toàn nhận +${finalScoreDelta}đ từ câu hỏi (Tiêu hao 1 ❤️, còn ${remainingHearts} ❤️)!`);
          soundManager.playCorrect();
        } else if (e.data.choice === "PLAY_ROUND_2") {
          addLog(`🔥 [${activeTeam.name}] quyết định chơi tiếp Vòng 2 (4 lượt mới né bom)! Đã randomize lại vị trí toàn bộ bài!`);
        }

        const nextRoomState: RoomState = {
          ...roomStateRef.current,
          teams: updatedTeams,
          mysteryQuestState: updatedState,
        };
        roomStateRef.current = nextRoomState;
        setRoomState(nextRoomState);
        syncToIframes({ roomState: nextRoomState, mysteryQuestState: updatedState });
        return;
      }
      if (e.data?.type === "MYSTERY_DOORS_DECISION" || e.data?.action === "mystery_doors_decision") {
        if (!isOfflineSandbox) {
          adminSocketRef.current?.emit("admin:mystery:doors_decision" as any, {
            decision: e.data.decision,
            chosenDoorId: e.data.chosenDoorId,
            swapRemovedDoorId: e.data.swapRemovedDoorId,
            swapAddedDoorId: e.data.swapAddedDoorId,
            code,
          });
          return;
        }
        if (!roomStateRef.current?.mysteryQuestState) return;
        const curMystery = { ...roomStateRef.current.mysteryQuestState };
        const activeTeam = roomStateRef.current.teams.find((t) => t.id === curMystery.currentTurnTeamId);
        if (!activeTeam) return;

        const {
          updatedState,
          finalScoreDelta,
          victimTeamId,
          victimTeamName,
          stolenPoints,
          recipientTeamId,
          giftedPoints,
          darkBombRecipients,
          temperanceBonusRecipients,
        } = handleMysteryDoorsDecision({
          state: curMystery,
          team: activeTeam,
          allTeams: roomStateRef.current.teams,
          decision: e.data.decision,
          chosenDoorId: e.data.chosenDoorId,
          swapRemovedDoorId: e.data.swapRemovedDoorId,
          swapAddedDoorId: e.data.swapAddedDoorId,
        });

        let updatedTeams = [...roomStateRef.current.teams];
        if (victimTeamId && stolenPoints && stolenPoints > 0) {
          updatedTeams = updatedTeams.map((t) => {
            if (t.id === victimTeamId) return { ...t, score: Math.max(0, t.score - stolenPoints) };
            if (t.id === activeTeam.id) return { ...t, score: t.score + finalScoreDelta };
            return t;
          });
          addLog(`🗡️ [${activeTeam.name}] cướp thành công ${stolenPoints}đ từ [${victimTeamName || "Đội dẫn đầu"}] (Đạo Tặc 5đ)!`);
        } else if (darkBombRecipients && darkBombRecipients.length > 0) {
          updatedTeams = updatedTeams.map((t) => {
            if (t.id === activeTeam.id) return { ...t, score: Math.max(0, t.score + finalScoreDelta) };
            const rec = darkBombRecipients.find((r) => r.teamId === t.id);
            if (rec) return { ...t, score: t.score + (rec.points || 0) };
            return t;
          });
        } else if (recipientTeamId && giftedPoints && giftedPoints > 0) {
          updatedTeams = updatedTeams.map((t) => {
            if (t.id === activeTeam.id) return { ...t, score: Math.max(0, t.score + (finalScoreDelta || -giftedPoints)) };
            if (t.id === recipientTeamId) return { ...t, score: t.score + giftedPoints };
            return t;
          });
          const recipientTeam = roomStateRef.current.teams.find((t) => t.id === recipientTeamId);
          addLog(`🎁 [${activeTeam.name}] dính Bom Từ Thiện: Chuyển ${giftedPoints}đ cho [${recipientTeam?.name || "Top 1"}]!`);
        } else if (finalScoreDelta !== 0) {
          const temperanceMap = new Map((temperanceBonusRecipients || []).map((r) => [r.teamId, r.points]));
          updatedTeams = updatedTeams.map((t) => {
            if (t.id === activeTeam.id) return { ...t, score: Math.max(0, t.score + finalScoreDelta) };
            if (temperanceMap.has(t.id)) return { ...t, score: t.score + (temperanceMap.get(t.id) || 0) };
            return t;
          });
        }

        if (updatedState.teamHearts) {
          updatedTeams = updatedTeams.map((t) => ({
            ...t,
            hearts: updatedState.teamHearts?.[t.id] ?? t.hearts,
          }));
        }

        const nextRoomState: RoomState = {
          ...roomStateRef.current,
          teams: updatedTeams,
          mysteryQuestState: updatedState,
        };
        roomStateRef.current = nextRoomState;
        setRoomState(nextRoomState);
        syncToIframes({ roomState: nextRoomState, mysteryQuestState: updatedState });
        return;
      }
      if (e.data?.type === "MYSTERY_TAROT_REDRAW" || e.data?.action === "mystery_tarot_redraw") {
        if (!isOfflineSandbox) {
          adminSocketRef.current?.emit("admin:mystery:tarot_redraw" as any, { code });
          return;
        }
        if (!roomStateRef.current?.mysteryQuestState) return;
        const curMystery = { ...roomStateRef.current.mysteryQuestState };
        const { updatedState } = handleMysteryTarotRedraw({
          state: curMystery,
        });

        const nextRoomState: RoomState = {
          ...roomStateRef.current,
          mysteryQuestState: updatedState,
        };
        roomStateRef.current = nextRoomState;
        setRoomState(nextRoomState);
        syncToIframes({ roomState: nextRoomState, mysteryQuestState: updatedState });
        return;
      }
      if (e.data?.type === "MYSTERY_TAROT_KEEP" || e.data?.action === "mystery_tarot_keep") {
        if (!isOfflineSandbox) {
          adminSocketRef.current?.emit("admin:mystery:tarot_keep" as any, { code });
          return;
        }
        if (!roomStateRef.current?.mysteryQuestState) return;
        const curMystery = { ...roomStateRef.current.mysteryQuestState };
        const activeTeam = roomStateRef.current.teams.find((t) => t.id === curMystery.currentTurnTeamId);
        if (!activeTeam) return;

        const { updatedState, finalScoreDelta } = handleMysteryTarotConfirmKeep({
          state: curMystery,
          team: activeTeam,
          allTeams: roomStateRef.current.teams,
        });

        const delta = finalScoreDelta || 0;
        const updatedTeams = roomStateRef.current.teams.map((t) =>
          t.id === activeTeam.id ? { ...t, score: Math.max(0, (t.score || 0) + delta) } : t
        );

        const nextRoomState: RoomState = {
          ...roomStateRef.current,
          teams: updatedTeams,
          mysteryQuestState: updatedState,
        };
        roomStateRef.current = nextRoomState;
        setRoomState(nextRoomState);
        syncToIframes({ roomState: nextRoomState, mysteryQuestState: updatedState });
        return;
      }
      if (e.data?.type === "MYSTERY_USE_PEEK" || e.data?.action === "mystery_use_peek") {
        if (!isOfflineSandbox) {
          adminSocketRef.current?.emit("admin:mystery:use_peek" as any, { code });
          return;
        }
        if (!roomStateRef.current?.mysteryQuestState) return;
        const curMystery = { ...roomStateRef.current.mysteryQuestState };
        const { updatedState } = handleMysteryPushYourLuckUsePeek({
          state: curMystery,
        });

        const nextRoomState: RoomState = {
          ...roomStateRef.current,
          mysteryQuestState: updatedState,
        };
        roomStateRef.current = nextRoomState;
        setRoomState(nextRoomState);
        syncToIframes({ roomState: nextRoomState, mysteryQuestState: updatedState });
        return;
      }
      if (e.data?.type === "MYSTERY_TAROT_PROPHECY_DECISION" || e.data?.action === "mystery_tarot_prophecy_decision") {
        const choice = e.data?.choice as "KEEP" | "DISCARD";
        if (!isOfflineSandbox) {
          adminSocketRef.current?.emit("admin:mystery:tarot_prophecy_decision" as any, { choice, code });
          return;
        }
        if (!roomStateRef.current?.mysteryQuestState) return;
        const curMystery = { ...roomStateRef.current.mysteryQuestState };
        const activeTeam = roomStateRef.current.teams.find((t) => t.id === curMystery.currentTurnTeamId);
        if (!activeTeam) return;

        const { updatedState, finalScoreDelta, isBomb, scorePenalty } = handleMysteryTarotProphecyDecision({
          state: curMystery,
          team: activeTeam,
          allTeams: roomStateRef.current.teams,
          choice,
        });

        let updatedTeams = [...roomStateRef.current.teams];
        if (choice === "KEEP") {
          if (isBomb && scorePenalty && scorePenalty > 0) {
            updatedTeams = updatedTeams.map((t) =>
              t.id === activeTeam.id ? { ...t, score: Math.max(0, (t.score || 0) - scorePenalty) } : t
            );
          } else if (finalScoreDelta !== undefined && finalScoreDelta !== 0) {
            updatedTeams = updatedTeams.map((t) =>
              t.id === activeTeam.id ? { ...t, score: Math.max(0, (t.score || 0) + finalScoreDelta) } : t
            );
          }
        }

        const nextRoomState: RoomState = {
          ...roomStateRef.current,
          teams: updatedTeams,
          mysteryQuestState: updatedState,
        };
        roomStateRef.current = nextRoomState;
        setRoomState(nextRoomState);
        syncToIframes({ roomState: nextRoomState, mysteryQuestState: updatedState });
        return;
      }
      if (e.data?.type === "MYSTERY_CHOOSE_STEAL_TARGET" || e.data?.action === "mystery_choose_steal_target") {
        const targetTeamId = e.data?.targetTeamId;
        if (!isOfflineSandbox) {
          adminSocketRef.current?.emit("admin:mystery:choose_steal_target" as any, { targetTeamId, code });
          return;
        }
        if (!roomStateRef.current?.mysteryQuestState) return;
        const curMystery = { ...roomStateRef.current.mysteryQuestState };
        const activeTeam = roomStateRef.current.teams.find((t) => t.id === curMystery.currentTurnTeamId);
        if (!activeTeam) return;

        const { updatedState, victimTeamId, victimTeamName, stolenPoints, finalScoreDelta } = handleMysteryChooseStealTarget({
          state: curMystery,
          targetTeamId,
          allTeams: roomStateRef.current.teams,
        });

        let updatedTeams = [...roomStateRef.current.teams];
        if (updatedState.miniGameType === "PUSH_YOUR_LUCK") {
          // Trong push-your-luck, điểm được nạp vào pot, trừ điểm đối thủ khi chốt điểm
        } else {
          if (victimTeamId && stolenPoints && stolenPoints > 0) {
            updatedTeams = updatedTeams.map((t) =>
              t.id === victimTeamId ? { ...t, score: Math.max(0, t.score - stolenPoints) } : t
            );
            addLog(`🗡️ [${activeTeam.name}] đã cướp thành công ${stolenPoints}đ từ [${victimTeamName || "Đối thủ"}]!`);
          }
          if (finalScoreDelta && finalScoreDelta > 0) {
            updatedTeams = updatedTeams.map((t) =>
              t.id === activeTeam.id ? { ...t, score: t.score + finalScoreDelta } : t
            );
          }
        }

        const nextRoomState: RoomState = {
          ...roomStateRef.current,
          teams: updatedTeams,
          mysteryQuestState: updatedState,
        };
        roomStateRef.current = nextRoomState;
        setRoomState(nextRoomState);
        syncToIframes({ roomState: nextRoomState, mysteryQuestState: updatedState });
        return;
      }
      if (e.data?.type === "MYSTERY_CASH_OUT" || e.data?.action === "mystery_cash_out") {
        if (!isOfflineSandbox) {
          adminSocketRef.current?.emit("admin:mystery:cash_out" as any, { code });
        }
        if (!roomStateRef.current?.mysteryQuestState) return;
        const curMystery = { ...roomStateRef.current.mysteryQuestState };
        const activeTeam = roomStateRef.current.teams.find((t) => t.id === curMystery.currentTurnTeamId);
        if (!activeTeam) return;

        const { updatedState, finalScoreDelta, victimTeamId, victimTeamName, stolenPoints } = handleMysteryCashOut({
          state: curMystery,
          team: activeTeam,
          allTeams: roomStateRef.current.teams,
        });

        let updatedTeams = [...roomStateRef.current.teams];
        if (victimTeamId && stolenPoints && stolenPoints > 0) {
          updatedTeams = updatedTeams.map((t) => {
            if (t.id === victimTeamId) return { ...t, score: Math.max(0, t.score - stolenPoints) };
            if (t.id === activeTeam.id) return { ...t, score: t.score + finalScoreDelta };
            return t;
          });
          addLog(`💰 [${activeTeam.name}] BẢO TOÀN ĐIỂM (+${finalScoreDelta}đ) & CƯỚP ${stolenPoints}đ từ [${victimTeamName || "Đội dẫn đầu"}] (có giới hạn)!`);
        } else {
          updatedTeams = updatedTeams.map((t) =>
            t.id === activeTeam.id ? { ...t, score: t.score + finalScoreDelta } : t
          );
          addLog(`💰 [${activeTeam.name}] quyết định BẢO TOÀN ĐIỂM! Thu về an toàn +${finalScoreDelta} điểm!`);
        }

        const nextRoomState: RoomState = {
          ...roomStateRef.current,
          teams: updatedTeams,
          mysteryQuestState: updatedState,
        };
        roomStateRef.current = nextRoomState;
        setRoomState(nextRoomState);
        syncToIframes({ roomState: nextRoomState, mysteryQuestState: updatedState });
        return;
      }
      if (e.data?.type === "MYSTERY_CHOOSE_ACTION" || e.data?.action === "mystery_choose_action") {
        let actionChoice = e.data?.actionChoice || e.data?.action || e.data?.choice;
        const targetTeamId = e.data?.teamId || roomStateRef.current?.mysteryQuestState?.currentTurnTeamId;
        if (!isOfflineSandbox) {
          adminSocketRef.current?.emit("admin:mystery:choose_action" as any, { action: actionChoice, teamId: targetTeamId, code });
          addLog(`🎲 MC/Thí sinh chọn: ${actionChoice === "TAKE_BASE_POINTS" ? "Nhận điểm gốc" : "Thử thách Minigame"}`);
          return;
        }
        if (!roomStateRef.current?.mysteryQuestState) return;
        const curMystery = { ...roomStateRef.current.mysteryQuestState };
        const activeTeam = roomStateRef.current.teams.find((t) => t.id === (targetTeamId || curMystery.currentTurnTeamId));
        if (!activeTeam) return;

        const teamHearts = curMystery.teamHearts ? { ...curMystery.teamHearts } : {};
        const currentHearts = teamHearts[activeTeam.id] ?? activeTeam.hearts ?? curMystery.initialHeartsPerTeam ?? 0;

        if (actionChoice === "TAKE_BASE_POINTS") {
          if (currentHearts <= 0) {
            actionChoice = "PLAY_MINIGAME";
          } else {
            teamHearts[activeTeam.id] = Math.max(0, currentHearts - 1);
            const basePts = normalizeToThreeLevels(curMystery.baseQuestionPoints || curMystery.potPoints || 10);
            const updatedTeams = roomStateRef.current.teams.map((t) =>
              t.id === activeTeam.id
                ? { ...t, score: t.score + basePts, hearts: teamHearts[t.id] }
                : { ...t, hearts: teamHearts[t.id] ?? t.hearts }
            );
            const updatedState = {
              ...curMystery,
              teamHearts,
              phase: "TURN_SUMMARY" as const,
              turnFinishedReason: "TOOK_BASE_POINTS" as const,
              decisionMade: "TAKE_BASE_POINTS" as const,
              potPoints: 0,
              storyResult: {
                teamId: activeTeam.id,
                teamName: activeTeam.name,
                teamColor: activeTeam.color,
                rewardText: `🛡️ Đội đã dùng 1 ❤️ để chốt an toàn +${basePts} điểm câu hỏi! (Còn ${teamHearts[activeTeam.id]} ❤️)`,
                scoreDelta: basePts,
                oldScore: activeTeam.score,
                newScore: activeTeam.score + basePts,
              },
            };
            const nextRoomState: RoomState = {
              ...roomStateRef.current,
              teams: updatedTeams,
              mysteryQuestState: updatedState,
            };
            roomStateRef.current = nextRoomState;
            setRoomState(nextRoomState);
            syncToIframes({ roomState: nextRoomState, mysteryQuestState: updatedState });
            addLog(`🛡️ [${activeTeam.name}] CHỌN AN TOÀN (Dùng 1 ❤️, còn ${teamHearts[activeTeam.id]} ❤️): Nhận +${basePts} điểm câu hỏi!`);
            return;
          }
        }

        // PLAY_MINIGAME
        const perkType = typeof curMystery.promoPerk === "string" ? curMystery.promoPerk : curMystery.promoPerk?.type;
        const basePts = normalizeToThreeLevels(curMystery.baseQuestionPoints || 10);
        const initialPot = basePts + (perkType === "EXTRA_POT_PROMO" ? 5 : 0);
        let updatedState: MysteryQuestState = {
          ...curMystery,
          cardsFlippedCount: 0,
          baseQuestionPoints: basePts,
          potPoints: initialPot,
          hasShield: perkType === "SHIELD_PROMO",
          phase: "PUSH_YOUR_LUCK" as const,
          decisionMade: "PLAY_MINIGAME" as const,
          memoryPairsState: getInitialMemoryPairsState(curMystery.promoPerk),
        };
        updatedState = synchronizeMysteryStageWithQuestionPoints({
          state: updatedState,
          questionPoints: basePts,
          theme: updatedState.theme,
          teams: roomStateRef.current?.teams || [],
        });
        const nextRoomState: RoomState = {
          ...roomStateRef.current,
          mysteryQuestState: updatedState,
        };
        roomStateRef.current = nextRoomState;
        setRoomState(nextRoomState);
        syncToIframes({ roomState: nextRoomState, mysteryQuestState: updatedState });
        addLog(`🎲 [${activeTeam.name}] CHỌN THỬ THÁCH MINIGAME: Quyết định chơi lớn!`);
        return;
      }
      if (e.data?.type === "MYSTERY_SURVIVAL_CHOICE" || e.data?.action === "mystery_survival_choice") {
        const choice: "SACRIFICE_HEART" | "RISK_SURVIVAL" = e.data?.choice;
        if (!isOfflineSandbox) {
          adminSocketRef.current?.emit("admin:mystery:survival_choice" as any, { choice, code });
          addLog(`💀 Thí sinh/MC chọn Sinh Tử: ${choice === "SACRIFICE_HEART" ? "Hy sinh 1 Tim để giữ điểm" : "Vào Minigame Sinh Tử"}`);
          return;
        }
        if (!roomStateRef.current?.mysteryQuestState) return;
        const curMystery = { ...roomStateRef.current.mysteryQuestState };
        const activeTeam = roomStateRef.current.teams.find((t) => t.id === curMystery.currentTurnTeamId);
        if (!activeTeam) return;

        const teamHearts = curMystery.teamHearts ? { ...curMystery.teamHearts } : {};
        const currentHearts = teamHearts[activeTeam.id] ?? activeTeam.hearts ?? curMystery.initialHeartsPerTeam ?? 0;

        curMystery.survivalDilemmaPending = false;
        curMystery.survivalDilemmaChoice = choice;

        let updatedTeams = [...roomStateRef.current.teams];

        if (choice === "SACRIFICE_HEART") {
          teamHearts[activeTeam.id] = 0; // Mất hết tim!
          curMystery.teamHearts = teamHearts;
          curMystery.phase = "TURN_SUMMARY";
          curMystery.turnFinishedReason = "QUESTION_FAILED";
          curMystery.potPoints = 0;
          curMystery.storyResult = {
            teamId: activeTeam.id,
            teamName: activeTeam.name,
            teamColor: activeTeam.color,
            rewardText: `💔 Đội chấp nhận đánh đổi toàn bộ tim (mất hết ❤️) để bảo toàn nguyên vẹn ${activeTeam.score} điểm!`,
            scoreDelta: 0,
            oldScore: activeTeam.score,
            newScore: activeTeam.score,
          };
          updatedTeams = updatedTeams.map((t) => ({
            ...t,
            hearts: t.id === activeTeam.id ? 0 : (teamHearts[t.id] ?? t.hearts),
          }));
          addLog(`💔 [${activeTeam.name}] CHỌN BẢO TOÀN ĐIỂM: Mất toàn bộ tim để giữ nguyên ${activeTeam.score}đ!`);
        } else if (choice === "RISK_SURVIVAL") {
          startSurvivalPenaltyMinigame({
            state: curMystery,
            team: activeTeam,
            allTeams: roomStateRef.current.teams,
          });
          addLog(`💀 [${activeTeam.name}] BƯỚC VÀO MINIGAME SINH TỬ: Đặt cược số điểm để bảo vệ Tim!`);
        }

        const nextRoomState: RoomState = {
          ...roomStateRef.current,
          teams: updatedTeams,
          mysteryQuestState: curMystery,
        };
        roomStateRef.current = nextRoomState;
        setRoomState(nextRoomState);
        syncToIframes({ roomState: nextRoomState, mysteryQuestState: curMystery });
        return;
      }
      if (e.data?.type === "MYSTERY_DRAW_TAROT" || e.data?.action === "mystery_draw_tarot") {
        if (!isOfflineSandbox) {
          adminSocketRef.current?.emit("admin:mystery:draw_tarot" as any, { code });
          return;
        }
        if (!roomStateRef.current?.mysteryQuestState) return;
        const curMystery = { ...roomStateRef.current.mysteryQuestState };
        const activeTeam = roomStateRef.current.teams.find((t) => t.id === curMystery.currentTurnTeamId);
        if (!activeTeam) return;

        const { updatedState, scoreDeltas, drawnCard } = handleAncientTarotDraw({
          state: curMystery,
          team: activeTeam,
          allTeams: roomStateRef.current.teams,
        });

        let updatedTeams = [...roomStateRef.current.teams];
        for (const item of scoreDeltas) {
          if (item.delta !== 0) {
            updatedTeams = updatedTeams.map((t) =>
              t.id === item.teamId ? { ...t, score: Math.max(0, (t.score || 0) + item.delta) } : t
            );
          }
        }

        const nextRoomState: RoomState = {
          ...roomStateRef.current,
          teams: updatedTeams,
          mysteryQuestState: updatedState,
        };
        roomStateRef.current = nextRoomState;
        setRoomState(nextRoomState);
        syncToIframes({ roomState: nextRoomState, mysteryQuestState: updatedState });
        addLog(`🔮 [${activeTeam.name}] RÚT BÀI TAROT: [${drawnCard.nameVi}]!`);
        return;
      }
      if (e.data?.type === "MYSTERY_SPIN_TAROT_WHEEL" || e.data?.action === "mystery_spin_tarot_wheel") {
        const powerPercent = typeof e.data?.powerPercent === "number" ? e.data.powerPercent : 50;
        if (!isOfflineSandbox) {
          adminSocketRef.current?.emit("admin:mystery:spin_tarot_wheel" as any, { code, powerPercent });
          return;
        }
        const currentRoomState = roomStateRef.current;
        if (!currentRoomState?.mysteryQuestState) return;
        const curMystery = currentRoomState.mysteryQuestState;
        const activeTeam = currentRoomState.teams.find((t) => t.id === curMystery.currentTurnTeamId);
        if (!activeTeam) return;

        const { updatedState, scoreDeltas, landedSegment, startAngle, targetAngle, spinDurationMs, landedIndex, drawnCard } = handleAncientTarotSpinWheel({
          state: { ...curMystery, tarotState: curMystery.tarotState ? { ...curMystery.tarotState } : undefined },
          team: activeTeam,
          allTeams: currentRoomState.teams,
          powerPercent,
        });

        // Set wheel to spinning state first so animation runs
        const spinningMystery: MysteryQuestState = {
          ...curMystery,
          tarotState: {
            ...curMystery.tarotState,
            isWheelSpinning: true,
            wheelPower: Math.max(1, Math.min(100, Math.round(powerPercent))),
            startAngle,
            targetAngle,
            spinDurationMs,
            selectedSegmentIndex: landedIndex,
            drawnCard,
            isDrawn: false,
            isRevealPending: false,
          },
        };
        (spinningMystery as any)._pendingScoreDeltas = scoreDeltas;

        const spinningRoomState: RoomState = {
          ...currentRoomState,
          mysteryQuestState: spinningMystery,
        };
        roomStateRef.current = spinningRoomState;
        setRoomState(spinningRoomState);
        syncToIframes({ roomState: spinningRoomState, mysteryQuestState: spinningMystery });

        setTimeout(() => {
          if (!roomStateRef.current) return;
          const settledMystery: MysteryQuestState = {
            ...updatedState,
            phase: "PUSH_YOUR_LUCK",
          };
          (settledMystery as any)._pendingScoreDeltas = scoreDeltas;

          const nextRoomState: RoomState = {
            ...roomStateRef.current,
            mysteryQuestState: settledMystery,
          };
          roomStateRef.current = nextRoomState;
          setRoomState(nextRoomState);
          syncToIframes({ roomState: nextRoomState, mysteryQuestState: settledMystery });
          addLog(`🎡 [${activeTeam.name}] QUAY VÒNG TAROT (Lực ${powerPercent}%): Dừng tại [${landedSegment.nameVi}] (Chờ lật bài)!`);

          // Tự động lật bài sau 2.2s (khớp 650ms bay + 1500ms đính icon trên client)
          setTimeout(() => {
            if (roomStateRef.current?.mysteryQuestState?.tarotState?.isRevealPending) {
              window.postMessage({ type: "MYSTERY_TAROT_REVEAL", action: "mystery_tarot_reveal" }, "*");
            }
          }, 2200);
        }, spinDurationMs + 100);
        return;
      }
      if (e.data?.type === "MYSTERY_TAROT_REVEAL" || e.data?.action === "mystery_tarot_reveal") {
        if (!isOfflineSandbox) {
          adminSocketRef.current?.emit("admin:mystery:ancient_tarot_reveal" as any, { code });
          return;
        }
        if (!roomStateRef.current?.mysteryQuestState?.tarotState?.isRevealPending) return;
        const curMystery = roomStateRef.current.mysteryQuestState;
        const drawnCard = curMystery.tarotState?.drawnCard;
        const isShieldRespin = Boolean(curMystery.tarotState?.isShieldRespin);
        const isGamble = !curMystery.isPenaltySurvivalMode && (drawnCard?.key === "THE_STAR" || drawnCard?.key === "THE_MOON");

        // Nếu lá bài yêu cầu chọn đội cướp (The Empress, The Lovers, The Chariot, The Death, Judgement, The World)
        // Chuyển sang phase STEAL_TARGET_SELECT để người chơi tự chọn đối thủ!
        if (curMystery.pendingSteal && (curMystery.pendingSteal.eligibleTeamIds?.length || 0) > 0) {
          const targetSelectState: MysteryQuestState = {
            ...curMystery,
            phase: "STEAL_TARGET_SELECT",
            turnFinishedReason: undefined,
            tarotState: {
              ...curMystery.tarotState,
              isRevealPending: false,
            },
          };
          delete (targetSelectState as any)._pendingScoreDeltas;
          const nextRoomState = {
            ...roomStateRef.current,
            mysteryQuestState: targetSelectState,
          };
          roomStateRef.current = nextRoomState;
          setRoomState(nextRoomState);
          syncToIframes({ roomState: nextRoomState, mysteryQuestState: targetSelectState });
          return;
        }

        let pendingDeltas: Array<{ teamId: string; delta: number }> = (curMystery as any)._pendingScoreDeltas || [];
        if (pendingDeltas.length === 0 && curMystery.currentTurnTeamId) {
          if (drawnCard?.scoreDelta) {
            pendingDeltas.push({ teamId: curMystery.currentTurnTeamId, delta: drawnCard.scoreDelta });
          }
          if (drawnCard?.temperanceBonusRecipients) {
            for (const rec of drawnCard.temperanceBonusRecipients) {
              if (rec.points) pendingDeltas.push({ teamId: rec.teamId, delta: rec.points });
            }
          }
          if (drawnCard?.hierophantPenalties) {
            for (const pen of drawnCard.hierophantPenalties) {
              if (pen.points) pendingDeltas.push({ teamId: pen.teamId, delta: -pen.points });
            }
          }
          if (drawnCard?.darkBombRecipients) {
            for (const rec of drawnCard.darkBombRecipients) {
              if (rec.points) pendingDeltas.push({ teamId: rec.teamId, delta: rec.points });
            }
          }
          if (drawnCard?.recipientTeamId && drawnCard?.giftedPoints) {
            pendingDeltas.push({ teamId: drawnCard.recipientTeamId, delta: drawnCard.giftedPoints });
          }
          if (drawnCard?.victimTeamId && drawnCard?.stolenPoints) {
            pendingDeltas.push({ teamId: drawnCard.victimTeamId, delta: -drawnCard.stolenPoints });
          }
        }

        let updatedTeams = [...roomStateRef.current.teams];
        if (!isGamble && !isShieldRespin && pendingDeltas.length > 0) {
          for (const item of pendingDeltas) {
            if (item.delta !== 0) {
              updatedTeams = updatedTeams.map((t) =>
                t.id === item.teamId ? { ...t, score: Math.max(0, (t.score || 0) + item.delta) } : t
              );
            }
          }
        }

        const updatedTarot = {
          ...curMystery.tarotState,
          isRevealPending: false,
          isGambling: isGamble,
          isShieldRespin,
          shieldTransformedCardKey: curMystery.tarotState?.shieldTransformedCardKey,
        };
        const updatedMystery: MysteryQuestState = {
          ...curMystery,
          phase: (isGamble || isShieldRespin) ? "PUSH_YOUR_LUCK" : "TURN_SUMMARY",
          turnFinishedReason: (isGamble || isShieldRespin)
            ? undefined
            : curMystery.isPenaltySurvivalMode
            ? drawnCard?.key === "THE_PEACE"
              ? "SURVIVAL_ESCAPE"
              : "SURVIVAL_FAILED"
            : "TAROT_WHEEL_SPUN",
          tarotState: updatedTarot,
        };
        delete (updatedMystery as any)._pendingScoreDeltas;

        const nextRoomState: RoomState = {
          ...roomStateRef.current,
          teams: updatedTeams,
          mysteryQuestState: updatedMystery,
        };
        roomStateRef.current = nextRoomState;
        setRoomState(nextRoomState);
        syncToIframes({ roomState: nextRoomState, mysteryQuestState: updatedMystery });
        addLog(`🔮 Đã lật bài Tarot: ${updatedTarot.drawnCard?.nameVi || ""} (Lá ${updatedTarot.drawnCard?.roman || ""})!`);
        return;
      }
      if (e.data?.type === "MYSTERY_TAROT_RESPIN" || e.data?.action === "mystery_tarot_respin") {
        if (!isOfflineSandbox) {
          adminSocketRef.current?.emit("admin:mystery:ancient_tarot_respin" as any, { code });
          return;
        }
        if (!roomStateRef.current?.mysteryQuestState?.tarotState) return;
        const curMystery = roomStateRef.current.mysteryQuestState;
        const respinMystery: MysteryQuestState = {
          ...curMystery,
          phase: "PUSH_YOUR_LUCK",
          turnFinishedReason: undefined,
          tarotState: {
            ...curMystery.tarotState,
            isDrawn: false,
            isRevealPending: false,
            drawnCard: undefined,
            isWheelSpinning: false,
            shieldTransformedCardKey: curMystery.tarotState?.shieldTransformedCardKey,
            isShieldRespin: false,
          },
        };
        const nextRoomState = { ...roomStateRef.current, mysteryQuestState: respinMystery };
        setRoomState(nextRoomState);
        roomStateRef.current = nextRoomState;
        syncToIframes({ roomState: nextRoomState, mysteryQuestState: respinMystery });
        addLog(`🛡️ [KHIÊN THẦN] Đã hóa giải ô trừ thành ô cộng điểm! Chuẩn bị bước vào Lượt quay 2!`);
        return;
      }
      if (e.data?.type === "MYSTERY_TAROT_GAMBLE_PREPARE" || e.data?.action === "mystery_tarot_gamble_prepare") {
        if (!isOfflineSandbox) {
          adminSocketRef.current?.emit("admin:mystery:ancient_tarot_gamble_prepare" as any, { code });
          return;
        }
        if (!roomStateRef.current?.mysteryQuestState?.tarotState) return;
        const curMystery = roomStateRef.current.mysteryQuestState;
        const prepareMystery: MysteryQuestState = {
          ...curMystery,
          phase: "PUSH_YOUR_LUCK",
          turnFinishedReason: undefined,
          tarotState: {
            ...curMystery.tarotState,
            isDrawn: false,
            isRevealPending: false,
            isWheelSpinning: false,
            isGamblingWaitingSpin: true,
          },
        };
        const nextRoomState = { ...roomStateRef.current, mysteryQuestState: prepareMystery };
        setRoomState(nextRoomState);
        roomStateRef.current = nextRoomState;
        syncToIframes({ roomState: nextRoomState, mysteryQuestState: prepareMystery });
        addLog(`⭐ [ĐÁNH CƯỢC] Đã mở lại Vòng Quay Tarot! Hãy canh thanh lực Ping-pong để Quay Tiếp!`);
        return;
      }
      if (e.data?.type === "MYSTERY_TAROT_GAMBLE_DECISION" || e.data?.action === "mystery_tarot_gamble_decision") {
        const spinAgain = Boolean(e.data?.spinAgain);
        const powerPercent = typeof e.data?.powerPercent === "number" ? e.data.powerPercent : 50;
        if (!isOfflineSandbox) {
          adminSocketRef.current?.emit("admin:mystery:ancient_tarot_gamble_decision" as any, { spinAgain, powerPercent, code });
          return;
        }
        if (!roomStateRef.current?.mysteryQuestState) return;
        const curMystery = roomStateRef.current.mysteryQuestState;
        const activeTeam = roomStateRef.current.teams.find((t) => t.id === curMystery.currentTurnTeamId);
        if (!activeTeam) return;

        const { updatedState, scoreDeltas, finalScoreDelta, drawnCard, landedSegment, startAngle, targetAngle, spinDurationMs, landedIndex } = handleAncientTarotGambleDecision({
          state: { ...curMystery, tarotState: curMystery.tarotState ? { ...curMystery.tarotState } : undefined },
          team: activeTeam,
          allTeams: roomStateRef.current.teams,
          spinAgain,
          powerPercent,
        });

        if (spinAgain && targetAngle !== undefined && landedSegment) {
          const spinningMystery: MysteryQuestState = {
            ...curMystery,
            phase: "PUSH_YOUR_LUCK",
            tarotState: {
              ...curMystery.tarotState,
              isWheelSpinning: true,
              wheelPower: Math.max(1, Math.min(100, Math.round(powerPercent))),
              startAngle,
              targetAngle,
              spinDurationMs: spinDurationMs || 20000,
              selectedSegmentIndex: landedIndex,
              drawnCard,
              isDrawn: false,
              isRevealPending: false,
              isGambling: false,
            },
          };
          (spinningMystery as any)._pendingScoreDeltas = scoreDeltas;
          const spinningRoomState = { ...roomStateRef.current, mysteryQuestState: spinningMystery };
          roomStateRef.current = spinningRoomState;
          setRoomState(spinningRoomState);
          syncToIframes({ roomState: spinningRoomState, mysteryQuestState: spinningMystery });

          setTimeout(() => {
            if (!roomStateRef.current) return;
            const settledMystery: MysteryQuestState = {
              ...updatedState,
              phase: "PUSH_YOUR_LUCK",
            };
            (settledMystery as any)._pendingScoreDeltas = scoreDeltas;
            const nextRoomState = {
              ...roomStateRef.current,
              mysteryQuestState: settledMystery,
            };
            roomStateRef.current = nextRoomState;
            setRoomState(nextRoomState);
            syncToIframes({ roomState: nextRoomState, mysteryQuestState: settledMystery });
            addLog(`🎲 [${activeTeam.name}] QUAY THÊM TAROT: Dừng tại [${landedSegment.nameVi}] (Chờ lật bài)!`);

            setTimeout(() => {
              if (roomStateRef.current?.mysteryQuestState?.tarotState?.isRevealPending) {
                window.postMessage({ type: "MYSTERY_TAROT_REVEAL", action: "mystery_tarot_reveal" }, "*");
              }
            }, 2800);
          }, (spinDurationMs || 20000) + 100);
        } else {
          let updatedTeams = [...roomStateRef.current.teams];
          if (scoreDeltas && scoreDeltas.length > 0) {
            for (const item of scoreDeltas) {
              if (item.delta !== 0) {
                updatedTeams = updatedTeams.map((t) =>
                  t.id === item.teamId ? { ...t, score: Math.max(0, (t.score || 0) + item.delta) } : t
                );
              }
            }
          }
          delete (updatedState as any)._pendingScoreDeltas;
          const nextRoomState = {
            ...roomStateRef.current,
            teams: updatedTeams,
            mysteryQuestState: updatedState,
          };
          roomStateRef.current = nextRoomState;
          setRoomState(nextRoomState);
          syncToIframes({ roomState: nextRoomState, mysteryQuestState: updatedState });
          addLog(`🛑 [${activeTeam.name}] DỪNG LẠI AN TOÀN (+${finalScoreDelta} điểm)!`);
        }
        return;
      }
      const isOfflineTeamAllowedToAnswer = (checkTeamId: string): boolean => {
        if (!currentQuestion) return false;
        const curState = roomStateRef.current || roomState;
        if (selectedMode === "ELIMINATION") {
          const tObj = curState?.teams.find((t) => t.id === checkTeamId);
          if (tObj?.isEliminated) return false;
        }
        if (selectedMode === "BOUNCEBACK") {
          if (currentQuestion.bouncebackSelectPhase || currentQuestion.isStealPhase) return false;
          if (currentQuestion.stealBuzzedTeamId) {
            return Boolean(currentQuestion.stealAnsweringActive && currentQuestion.stealBuzzedTeamId === checkTeamId);
          }
          return currentQuestion.primaryTeamId === checkTeamId;
        }
        if (selectedMode === "BUZZ") {
          return Boolean(
            currentQuestion.buzzAnsweringActive &&
            currentQuestion.buzzedTeamId &&
            currentQuestion.buzzedTeamId === checkTeamId
          );
        }
        if (selectedMode === "GRID_CARO") {
          const turnTeamId = currentQuestion.primaryTeamId || curState?.gridCaroState?.currentTurnTeamId;
          return Boolean(turnTeamId && turnTeamId === checkTeamId);
        }
        if (selectedMode === "DICE_RACE") {
          const turnTeamId = currentQuestion.primaryTeamId || curState?.diceRaceState?.currentTurnTeamId;
          return Boolean(turnTeamId && turnTeamId === checkTeamId);
        }
        if (selectedMode === "MYSTERY_QUEST") {
          const turnTeamId = currentQuestion.primaryTeamId || curState?.mysteryQuestState?.currentTurnTeamId;
          return Boolean(turnTeamId && turnTeamId === checkTeamId);
        }
        if (selectedMode === "TOURNAMENT") {
          const activeMatch =
            curState?.tournamentState?.matches.find(
              (m) => m.id === curState?.tournamentState?.currentMatchId || m.status === "IN_PROGRESS"
            ) || curState?.tournamentState?.matches[0];
          const t1 = currentQuestion.tournamentTeam1Id || activeMatch?.team1Id;
          const t2 = currentQuestion.tournamentTeam2Id || activeMatch?.team2Id;
          if (t1 || t2) {
            return checkTeamId === t1 || checkTeamId === t2;
          }
        }
        return true;
      };

      if (e.data?.type === "SANDBOX_PLAYER_ANSWER_UPDATE") {
        const { teamId, answer } = e.data;
        if (teamId && answer) {
          if (isOfflineSandbox && currentQuestion && !isOfflineTeamAllowedToAnswer(teamId)) {
            return;
          }
          const singleAns = Array.isArray(answer) ? answer[0] : answer;
          setTeamSelectedAnswers((prev) => ({ ...prev, [teamId]: singleAns }));
          if (isOfflineSandbox && currentQuestion && !offlineFinalizedActorsRef.current.has(teamId)) {
            const qData = currentQuestion.question;
            const rawQ = offlineQuestionsRef.current[offlineQIndexRef.current] || qData;
            const correctOpt = rawQ.options?.find((o: any) => o.isCorrect);
            const isCorrect = correctOpt
              ? (correctOpt.id === singleAns ||
                 (Array.isArray(answer) && answer.includes(correctOpt.id)) ||
                 (typeof singleAns === "string" && (correctOpt.text?.trim() === singleAns.trim() || correctOpt.id === singleAns.trim())))
              : false;
            const timeLimit = currentQuestion.timeLimit || 30;
            const remaining = offlineRemainingRef.current !== undefined ? offlineRemainingRef.current : (timer?.remaining ?? timeLimit);
            const timeSpentMs = Math.max(500, (timeLimit - remaining) * 1000);
            const base = getBasePointsForMode(currentQuestion.question.points || 10, selectedMode);
            let awarded = 0;
            if (isCorrect) {
              if (selectedMode === "CLASSIC" || selectedMode === "ELIMINATION") {
                const ratio = Math.max(0, 1 - timeSpentMs / (timeLimit * 1000));
                const speedBonus = Math.round(base * 0.5 * ratio);
                awarded = base + speedBonus;
              } else {
                awarded = base;
              }
            }
            offlineAnswersRef.current.set(teamId, { answer: singleAns, isCorrect, points: awarded, timeSpent: timeSpentMs });
          }
        }
        return;
      }
      if (e.data?.type === "MYSTERY_STEAL_BUZZ" || e.data?.action === "mystery_steal_buzz") {
        return;
      }
      if (e.data?.type === "MYSTERY_SET_MINIGAME" || e.data?.action === "mystery_set_minigame") {
        const miniGameType = e.data?.miniGameType;
        if (!isOfflineSandbox) {
          adminSocketRef.current?.emit("admin:mystery:set_minigame_type" as any, { miniGameType, code });
          addLog(`🎮 Admin đổi Minigame sang: ${miniGameType}`);
          return;
        }
        if (!roomStateRef.current?.mysteryQuestState) return;
        const curMystery = roomStateRef.current.mysteryQuestState;
        const teams = roomStateRef.current.teams;
        const currentTeam = teams.find((t) => t.id === curMystery.currentTurnTeamId) || teams[0];
        const nextStage = generateMysteryStageForTurn({
          turnIndex: curMystery.currentTurnIndex,
          currentTeam,
          teams,
          turnsPerTeam: curMystery.turnsPerTeam,
          prevTheme: curMystery.theme,
          forcedMiniGameType: miniGameType,
          initialHeartsPerTeam: curMystery.initialHeartsPerTeam,
          teamHearts: curMystery.teamHearts,
          teamMaxHearts: curMystery.teamMaxHearts,
          teamShields: curMystery.teamShields,
          teamImmunities: curMystery.teamImmunities,
          timesStolenInCycle: curMystery.timesStolenInCycle,
          consecutiveBombsByTeam: curMystery.consecutiveBombsByTeam,
        });
        nextStage.phase = curMystery.phase;
        nextStage.potPoints = curMystery.potPoints;
        const nextRoomState: RoomState = {
          ...roomStateRef.current,
          mysteryQuestState: nextStage,
        };
        roomStateRef.current = nextRoomState;
        setRoomState(nextRoomState);
        syncToIframes({ roomState: nextRoomState, mysteryQuestState: nextStage });
        addLog(`🎮 Sandbox đổi Minigame sang: ${miniGameType}`);
        return;
      }
      if (e.data?.type === "MYSTERY_ADVANCE_TURN" || e.data?.action === "mystery_advance_turn") {
        if (!isOfflineSandbox) {
          adminSocketRef.current?.emit("admin:mystery:advance_turn" as any, { code });
          addLog("➡️ Admin chuyển lượt tiếp theo trong Sandbox Online");
          return;
        }
        if (!roomStateRef.current?.mysteryQuestState) return;
        const curMystery = roomStateRef.current.mysteryQuestState;

        // Tự động giải ngân điểm số chưa lật nếu MC bấm qua lượt sớm:
        let teams = [...roomStateRef.current.teams];
        const pendingDeltas: Array<{ teamId: string; delta: number }> = (curMystery as any)._pendingScoreDeltas || [];
        if (pendingDeltas.length > 0) {
          for (const item of pendingDeltas) {
            if (item.delta !== 0) {
              teams = teams.map((t) =>
                t.id === item.teamId ? { ...t, score: Math.max(0, (t.score || 0) + item.delta) } : t
              );
            }
          }
        }
        delete (curMystery as any)._pendingScoreDeltas;

        const nextTurnIdx = curMystery.currentTurnIndex + 1;

        if (nextTurnIdx >= curMystery.totalTurns) {
          addLog("🏁 Mystery Quest: Đã hoàn thành tất cả các lượt chơi!");
          const finalState: RoomState = {
            ...roomStateRef.current,
            teams,
            status: "FINISHED",
          };
          roomStateRef.current = finalState;
          setRoomState(finalState);
          setCurrentQuestion(null);
          setRevealPayload(null);
          setTimer(null);
          syncToIframes({
            roomState: finalState,
            currentQuestion: null,
            revealPayload: null,
            timer: null,
          });
          return;
        }

        const nextTeam = teams[nextTurnIdx % teams.length];

        let nextStage = generateMysteryStageForTurn({
          turnIndex: nextTurnIdx,
          currentTeam: nextTeam,
          teams,
          turnsPerTeam: curMystery.turnsPerTeam,
          prevTheme: curMystery.theme,
          prevMiniGameType: curMystery.miniGameType,
          initialHeartsPerTeam: curMystery.initialHeartsPerTeam,
          teamHearts: curMystery.teamHearts,
          teamMaxHearts: curMystery.teamMaxHearts,
          teamShields: curMystery.teamShields,
          teamImmunities: curMystery.teamImmunities,
          timesStolenInCycle: curMystery.timesStolenInCycle,
          consecutiveBombsByTeam: curMystery.consecutiveBombsByTeam,
        });

        const questions = offlineQuestionsRef.current;
        let nextQIdx = -1;
        for (let i = 0; i < questions.length; i++) {
          const qId = questions[i].id || `q_${i + 1}`;
          if (!offlineUsedQuestionIdsRef.current.has(qId)) {
            nextQIdx = i;
            break;
          }
        }
        if (nextQIdx === -1 && questions.length > 0) {
          nextQIdx = (offlineQIndexRef.current + 1) % questions.length;
        }

        const nextQ = questions[nextQIdx];
        if (nextQ?.points) {
          const normPts = normalizeToThreeLevels(nextQ.points);
          nextStage = synchronizeMysteryStageWithQuestionPoints({
            state: nextStage,
            questionPoints: normPts,
            theme: nextStage.theme,
            teams,
          });
        }

        const nextRoomState: RoomState = {
          ...roomStateRef.current,
          teams,
          mysteryQuestState: nextStage,
        };
        roomStateRef.current = nextRoomState;
        setRoomState(nextRoomState);
        setCurrentQuestion(null);
        setRevealPayload(null);
        setTimer(null);
        syncToIframes({
          roomState: nextRoomState,
          mysteryQuestState: nextStage,
          currentQuestion: null,
          revealPayload: null,
          timer: null,
        });
        addLog(`➡️ Chuyển sang lượt #${nextTurnIdx + 1} của [${nextTeam.name}] (Chủ đề: ${nextStage.themeNameVi})`);

        soundManager.stopQuestionMusic(0, true);
        if (nextQIdx !== -1) {
          launchOfflineQuestionRef.current?.(nextQIdx);
        }
        return;
      }
      if (e.data?.type === "OFFLINE_PLAYER_ACTION" && isOfflineSandbox) {
      const { action, answer, points, cellId, teamId } = e.data;
      const targetTeamId = teamId || stableTeams[activeTeamIndex]?.id || stableTeams[0]?.id || "t_0";
      const targetTeamName = stableTeams.find((t) => t.id === targetTeamId)?.name || "Bạn (Tester)";

      if (action === "answer") {
        if (!currentQuestion) return;
        if (!isOfflineTeamAllowedToAnswer(targetTeamId)) {
          addLog(`⚠️ [${targetTeamName}] chưa đến lượt trả lời ở chế độ này!`);
          return;
        }
        const qData = currentQuestion.question;
        const opts = qData.options || [];
        const chosenOpt = opts.find((o: any) => o.id === answer || o.text === answer);
        const rawQ = offlineQuestionsRef.current[offlineQIndexRef.current] || qData;
        const correctOpt = rawQ.options?.find((o: any) => o.isCorrect);
        const isCorrect = correctOpt
          ? (correctOpt.id === answer ||
             (Array.isArray(answer) && answer.includes(correctOpt.id)) ||
             (typeof answer === "string" && (correctOpt.text?.trim() === answer.trim() || correctOpt.id === answer.trim())))
          : false;
        const timeLimit = currentQuestion.timeLimit || 30;
        const remaining = offlineRemainingRef.current !== undefined ? offlineRemainingRef.current : (timer?.remaining ?? timeLimit);
        const timeSpentMs = Math.max(500, (timeLimit - remaining) * 1000);

        const base = getBasePointsForMode(currentQuestion.question.points || 10, selectedMode);
        let awarded = 0;
        if (isCorrect) {
          if (selectedMode === "CLASSIC" || selectedMode === "ELIMINATION") {
            const ratio = Math.max(0, 1 - timeSpentMs / (timeLimit * 1000));
            const speedBonus = Math.round(base * 0.5 * ratio);
            awarded = base + speedBonus;
          } else {
            awarded = base;
          }
        }
        offlineAnswersRef.current.set(targetTeamId, { answer, isCorrect, points: awarded, timeSpent: timeSpentMs });
        const singleAns = Array.isArray(answer) ? answer[0] : answer;
        setTeamSelectedAnswers((prev) => ({ ...prev, [targetTeamId]: singleAns }));

        const isSingleSubmit = roomState?.config.answerSubmissionMode === "SINGLE_SUBMIT";
        const isStealInBounceback = selectedMode === "BOUNCEBACK" && currentQuestion.stealBuzzedTeamId === targetTeamId;

        if (isSingleSubmit || isStealInBounceback) {
          offlineFinalizedActorsRef.current.add(targetTeamId);
          addLog(`🔒 [${targetTeamName}] nộp bài (Bấm 1 lần duy nhất): ${chosenOpt?.text || answer}`);
          checkOfflineEarlyCompletion();
        } else {
          addLog(`[${targetTeamName}] đã chọn đáp án: ${chosenOpt?.text || answer} (có thể đổi tiếp)`);
        }
      } else if (action === "finalize_answer") {
        if (!currentQuestion) return;
        if (!isOfflineTeamAllowedToAnswer(targetTeamId)) {
          addLog(`⚠️ [${targetTeamName}] chưa đến lượt chốt đáp án ở chế độ này!`);
          return;
        }
        const qData = currentQuestion.question;
        const rawQ = offlineQuestionsRef.current[offlineQIndexRef.current] || qData;
        const correctOpt = rawQ.options?.find((o: any) => o.isCorrect);
        const existingAns = offlineAnswersRef.current.get(targetTeamId)?.answer;
        const finalAns = answer || existingAns;
        if (finalAns) {
          const isCorrect = correctOpt
            ? (correctOpt.id === finalAns ||
               (Array.isArray(finalAns) && finalAns.includes(correctOpt.id)) ||
               (typeof finalAns === "string" && (correctOpt.text?.trim() === finalAns.trim() || correctOpt.id === finalAns.trim())))
            : false;
          const timeLimit = currentQuestion.timeLimit || 30;
          const remaining = offlineRemainingRef.current !== undefined ? offlineRemainingRef.current : (timer?.remaining ?? timeLimit);
          const timeSpentMs = Math.max(500, (timeLimit - remaining) * 1000);

          const base = getBasePointsForMode(currentQuestion.question.points || 10, selectedMode);
          let awarded = 0;
          if (isCorrect) {
            if (selectedMode === "CLASSIC" || selectedMode === "ELIMINATION") {
              const ratio = Math.max(0, 1 - timeSpentMs / (timeLimit * 1000));
              const speedBonus = Math.round(base * 0.5 * ratio);
              awarded = base + speedBonus;
            } else {
              awarded = base;
            }
          }
          offlineAnswersRef.current.set(targetTeamId, { answer: finalAns, isCorrect, points: awarded, timeSpent: timeSpentMs });

          if (selectedMode === "BOUNCEBACK") {
            const isSteal = Boolean(currentQuestion.stealBuzzedTeamId);
            const chosenOpt = (qData.options || []).find((o: any) => o.id === finalAns || o.text === finalAns);
            const ansText = chosenOpt ? `${chosenOpt.text}` : String(finalAns);
            const ansArr = [finalAns];

            setCurrentQuestion((prev) =>
              prev
                ? {
                    ...prev,
                    bouncebackAwaitingJudgment: isSteal ? "STEAL" : "PRIMARY",
                    bouncebackAutoCorrect: isCorrect,
                    bouncebackAnswerText: ansText,
                    bouncebackPrimaryAnswer: !isSteal ? ansArr : prev.bouncebackPrimaryAnswer,
                    bouncebackStealAnswer: isSteal ? ansArr : prev.bouncebackStealAnswer,
                  }
                : prev
            );
          }
        }
        offlineFinalizedActorsRef.current.add(targetTeamId);
        addLog(`🔒 [${targetTeamName}] đã CHỐT ĐÁP ÁN!`);
        checkOfflineEarlyCompletion();
      } else if (action === "buzz") {
        if (selectedMode === "BOUNCEBACK" && currentQuestion?.isStealPhase) {
          if (currentQuestion.primaryTeamId === targetTeamId) {
            addLog(`⚠️ [${targetTeamName}] là đội chính nên không được cướp điểm!`);
            return;
          }
          const stealData = { teamId: targetTeamId, teamName: targetTeamName, playerId: "", playerName: "" };
          const updatedQ: QuestionState = {
            ...currentQuestion,
            isStealPhase: false,
            stealBuzzedTeamId: targetTeamId,
            stealBuzzedTeamName: targetTeamName,
            stealAnsweringActive: false,
            timerPending: true,
            timerStarted: false,
          };
          setCurrentQuestion(updatedQ);
          addLog(`⚡ [${targetTeamName}] đã BẤM CHUÔNG CƯỚP ĐIỂM thành công!`);
          syncToIframes({
            isStealOpen: false,
            stealBuzzed: stealData,
            currentQuestion: updatedQ,
          });
        } else {
          setCurrentQuestion((prev) => prev ? { ...prev, buzzedTeamId: targetTeamId, buzzedTeamName: targetTeamName, buzzAnsweringActive: false, timerPending: true, timerStarted: false } : prev);
          addLog(`⚡ [${targetTeamName}] đã BẤM CHUÔNG thành công!`);
          syncToIframes({ buzzedBy: { playerName: targetTeamName, teamId: targetTeamId } });
        }
      } else if (action === "bounceback_select_points") {
        if (currentQuestion?.primaryTeamId && currentQuestion.primaryTeamId !== targetTeamId) {
          addLog(`⚠️ Không phải lượt của [${targetTeamName}] để chọn gói điểm!`);
          return;
        }
        const pts = (points as 10 | 20 | 30) || 20;
        handleOfflineBouncebackPointsPicked(pts);
      } else if (action === "stop_early") {
        if (offlineTimerRef.current) {
          clearInterval(offlineTimerRef.current);
          offlineTimerRef.current = null;
        }
        offlineRemainingRef.current = 0;
        setTimer({ remaining: 0, total: currentQuestion?.timeLimit || 30, endsAt: 0 });
        syncToIframes({ timer: { remaining: 0, total: currentQuestion?.timeLimit || 30, endsAt: 0 } });
        addLog(`⏹️ [Dừng giờ sớm] Đội [${targetTeamName}] đã chốt kết thúc thời gian!`);
        setTimeout(() => {
          handleAdminReveal();
        }, 500);
      } else if (action === "powerup_use") {
        const { cardId, targetTeamId: powerupTargetTeamId } = e.data;
        const curRem = offlineRemainingRef.current !== undefined ? offlineRemainingRef.current : (timer?.remaining ?? 30);
        if (curRem <= 5 && !revealPayload) {
          addLog(`⚠️ Không thể sử dụng thẻ hỗ trợ trong 5 giây cuối của câu hỏi!`);
          return;
        }
        if (selectedMode === "BOUNCEBACK" && (currentQuestion?.isStealPhase || currentQuestion?.stealBuzzedTeamId)) {
          addLog(`⚠️ Toàn bộ thẻ hỗ trợ bị vô hiệu hóa trong lượt cướp điểm!`);
          return;
        }

        const teams = roomStateRef.current?.teams || [];
        let cardFound: any = null;
        let cardTeam: any = null;

        for (const t of teams) {
          const c = (t.cards || []).find((card) => card.id === cardId && !card.used);
          if (c) {
            cardFound = c;
            cardTeam = t;
            break;
          }
        }

        if (!cardFound) {
          addLog(`⚠️ Thẻ không tồn tại hoặc đã được sử dụng!`);
          return;
        }

        if (isSharedPowerup(cardFound.type as CardType)) {
          if (offlineSharedPowerupUsedThisQuestionRef.current) {
            addLog(`⚠️ Đã có đội kích hoạt thẻ dùng chung ở câu hỏi này! Mỗi câu chỉ được dùng tối đa 1 thẻ dùng chung.`);
            return;
          }
        }

        cardFound.used = true;
        const cType = cardFound.type;

        if (cType === "FIFTY_FIFTY") {
          const qData = currentQuestion?.question;
          const rawQ = offlineQuestionsRef.current[offlineQIndexRef.current] || qData;
          const wrongOpts = (rawQ?.options || []).filter((o: any) => !o.isCorrect);
          const toHide = wrongOpts.slice(0, 2).map((o: any) => o.id);
          syncToIframes({ hiddenOptionIds: toHide });
          addLog(`🃏 [${cardTeam.name}] dùng [50:50]: Đã loại bỏ 2 phương án sai!`);
        } else if (cType === "TIME_PLUS") {
          offlineRemainingRef.current = (offlineRemainingRef.current || 30) + 15;
          const newTotal = (currentQuestion?.timeLimit || 30) + 15;
          const newEndsAt = Date.now() + offlineRemainingRef.current * 1000;
          setTimer({ remaining: offlineRemainingRef.current, total: newTotal, endsAt: newEndsAt });
          syncToIframes({ timer: { remaining: offlineRemainingRef.current, total: newTotal, endsAt: newEndsAt } });
          addLog(`🃏 [${cardTeam.name}] dùng [Cộng giờ]: Đã cộng thêm 15 giây!`);
        } else if (cType === "SKIP") {
          addLog(`🃏 [${cardTeam.name}] dùng [Đổi câu hỏi]: Bỏ qua câu hỏi hiện tại để đổi câu mới!`);
          setTimeout(() => {
            handleAdminNextRef.current();
          }, 800);
        } else if (cType === "DOUBLE_POINT" || cType === "DOUBLE") {
          offlineTeamMultiplierRef.current.set(cardTeam.id, 2);
          addLog(`🃏 [${cardTeam.name}] dùng [Nhân đôi điểm]: Nhân 2 điểm nếu trả lời đúng!`);
        } else if (cType === "SHIELD") {
          cardTeam.shieldCount = (cardTeam.shieldCount || 0) + 1;
          addLog(`🃏 [${cardTeam.name}] dùng [Khiên bảo vệ]: Được miễn trừ trừ điểm!`);
        } else if (cType === "FREEZE") {
          if (powerupTargetTeamId) {
            const targetT = teams.find((t) => t.id === powerupTargetTeamId);
            if (targetT) targetT.frozenRounds = 1;
          }
          addLog(`🃏 [${cardTeam.name}] dùng [Băng tuyết]: Đóng băng đối thủ!`);
        } else if (cType === "STEAL_POINTS" || cType === "STEAL") {
          if (powerupTargetTeamId) {
            const targetT = teams.find((t) => t.id === powerupTargetTeamId);
            if (targetT && targetT.score > 0) {
              const stealAmt = Math.min(targetT.score, 30);
              targetT.score -= stealAmt;
              cardTeam.score += stealAmt;
              addLog(`🃏 [${cardTeam.name}] dùng [Cướp điểm]: Cướp ${stealAmt}đ từ [${targetT.name}]!`);
            } else {
              addLog(`⚠️ [${cardTeam.name}] dùng [Cướp điểm] không thành công: Mục tiêu không có điểm để cướp! Thẻ được bảo toàn.`);
            }
          }
        } else if (cType === "SWAP_SCORES") {
          if (powerupTargetTeamId) {
            const targetT = teams.find((t) => t.id === powerupTargetTeamId);
            if (targetT) {
              const tmp = targetT.score;
              targetT.score = cardTeam.score;
              cardTeam.score = tmp;
              addLog(`🃏 [${cardTeam.name}] dùng [Hoán đổi]: Đổi điểm với [${targetT.name}]!`);
            }
          }
        }

        if (isSharedPowerup(cType as CardType)) {
          offlineSharedPowerupUsedThisQuestionRef.current = true;
          syncToIframes({
            sharedPowerupLocked: true,
            sharedPowerupLockedTeamName: cardTeam.name,
          });
        }

        const powerupPayload = {
          cardId,
          cardType: cType,
          playerId: e.data.playerId || "",
          playerName: cardTeam.name,
          teamId: cardTeam.id,
          teamName: cardTeam.name,
          targetTeamId: powerupTargetTeamId,
          targetTeamName: teams.find((t) => t.id === powerupTargetTeamId)?.name,
          usedAt: Date.now(),
        };

        setRoomState((prev) => (prev ? { ...prev, teams: [...teams] } : prev));
        syncToIframes({
          lastPowerup: powerupPayload,
          roomState: { ...(roomStateRef.current || {}), teams: [...teams] },
        });
      } else if (action === "grid_select") {
        addLog(`🏁 [${targetTeamName}] đã chọn ô #${cellId}`);
      } else if (action === "dice_roll") {
        handleDiceRollManual();
      } else if (action === "wager_submit") {
        processOfflineWager(targetTeamId, Number(e.data.amount) || 10);
      } else if (action === "select_team") {
        setRoomState((prev) => {
          if (!prev) return prev;
          const currentPid = e.data.playerId || "p_you";
          const exists = prev.players.some((p) => p.id === currentPid);
          let updatedPlayers: any[];
          if (exists) {
            updatedPlayers = prev.players.map((p) =>
              p.id === currentPid ? { ...p, teamId: targetTeamId } : p
            );
          } else {
            updatedPlayers = [
              ...prev.players,
              { id: currentPid, name: targetTeamName, score: 0, teamId: targetTeamId, isHost: false, isOnline: true },
            ];
          }
          const nextState = { ...prev, players: updatedPlayers };
          roomStateRef.current = nextState;
          return nextState;
        });
        syncToIframes();
        }
      }

      if (e.data?.type === "MAGIC_WHEEL_SPIN") {
        const { power } = e.data;
        setRoomState((prev) => {
          if (!prev || !prev.magicWheelState || prev.magicWheelState.isSpinning) return prev;
          const cur = { ...prev.magicWheelState };
          const effPower = Math.max(10, Math.min(100, power || 50));
          const { targetDegrees, landingSectorIndex } = calculateSpinDestination(
            cur.targetRotationDegrees,
            effPower,
            cur.sectors.length
          );
          cur.isSpinning = true;
          cur.spinPower = effPower;
          cur.targetRotationDegrees = targetDegrees;
          cur.selectedSectorIndex = landingSectorIndex;
          cur.phase = "SPINNING";
          const spinDurationMs = 15000 + Math.round((effPower / 100) * 6000);
          soundManager.playWheelSpin(spinDurationMs);

          setTimeout(() => {
            setRoomState((latest) => {
              if (!latest || !latest.magicWheelState) return latest;
              const nextWheel = { ...latest.magicWheelState };
              nextWheel.isSpinning = false;
              const sector = nextWheel.sectors[landingSectorIndex];
              nextWheel.selectedSector = sector;
              const tId = nextWheel.currentTurnTeamId;
              const teamName = nextWheel.currentTurnTeamName;
              const eligibleTeams = latest.teams.filter(
                (t) =>
                  !(nextWheel.disqualifiedTeamIdsInRound || []).includes(t.id) &&
                  !(nextWheel.round3TradedTeams || []).includes(t.id)
              );
              const isSoleSurvivor = eligibleTeams.length === 1 && latest.teams.length > 1;

              // Vòng Đặc Biệt: Quay trúng phong bì giải thưởng
              if (nextWheel.roundStage === "SPECIAL_FINAL") {
                soundManager.playMagicWheelReward();
                nextWheel.specialEnvelopePrize = {
                  label: `Phong bì ${sector.label} điểm`,
                  value: sector.value || 10000,
                };
                if (nextWheel.specialFinalChoiceOrder === "SPIN_FIRST") {
                  const allowed = calculateSpecialRoundAllowedLetters(
                    nextWheel.currentPuzzle?.secretPhrase || ""
                  );
                  nextWheel.specialAllowedLetterCount = allowed;
                  nextWheel.specialSelectedLetters = [];
                  nextWheel.phase = "SPECIAL_PICK_LETTERS";
                  nextWheel.lastActionMessage = `🎉 Đã khóa ${nextWheel.specialEnvelopePrize.label}! Bây giờ mời ${teamName} chọn trước ${allowed} chữ cái!`;
                } else {
                  nextWheel.phase = "ROUND_RECAP";
                  const prizeVal = nextWheel.specialEnvelopePrize.value;
                  const perm = { ...(nextWheel.permanentScores || {}) };
                  perm[tId] = (perm[tId] || 0) + prizeVal;
                  nextWheel.permanentScores = perm;
                  const updatedTeams = latest.teams.map((t) =>
                    t.id === tId ? { ...t, score: (t.score || 0) + prizeVal } : t
                  );
                  nextWheel.lastActionMessage = `🏆 CHÚC MỪNG NHÀ VÔ ĐỊCH ${teamName}! Mở phong bì nhận thêm +${prizeVal.toLocaleString()}đ!`;
                  const nextRoom = { ...latest, teams: updatedTeams, magicWheelState: nextWheel };
                  roomStateRef.current = nextRoom;
                  syncToIframes({ roomState: nextRoom });
                  return nextRoom;
                }
                const nextRoom = { ...latest, magicWheelState: nextWheel };
                roomStateRef.current = nextRoom;
                syncToIframes({ roomState: nextRoom });
                return nextRoom;
              }

              // Tích lũy quỹ Jackpot ở Vòng 4+
              if (nextWheel.currentRound >= 4 && sector.type === "POINTS" && (sector.value || 0) > 0) {
                nextWheel.jackpotPool = (nextWheel.jackpotPool || 2000) + 500;
              }

              if (sector.type === "LOSE_TURN") {
                soundManager.playMagicWheelLoseTurn();
                nextWheel.pendingSpecialAction = "NONE";
                if (isSoleSurvivor) {
                  nextWheel.phase = "SPIN_WAITING";
                  nextWheel.lastActionMessage = `Đội ${teamName} quay vào MẤT LƯỢT nhưng vì là đội duy nhất còn lại nên được miễn phạt và quay tiếp!`;
                } else if ((nextWheel.freeSpinCount[tId] || 0) > 0) {
                  nextWheel.freeSpinCount = { ...nextWheel.freeSpinCount, [tId]: nextWheel.freeSpinCount[tId] - 1 };
                  nextWheel.phase = "SPIN_WAITING";
                  nextWheel.lastActionMessage = `Đội ${teamName} quay vào MẤT LƯỢT nhưng đã dùng 1 Thẻ Thêm Lượt để giữ quyền chơi!`;
                } else {
                  const activeIdx = eligibleTeams.findIndex((t) => t.id === nextWheel.currentTurnTeamId);
                  const nextIdx = (activeIdx + 1) % Math.max(1, eligibleTeams.length);
                  nextWheel.currentTurnTeamId = eligibleTeams[nextIdx]?.id || "";
                  nextWheel.currentTurnTeamName = eligibleTeams[nextIdx]?.name || "";
                  nextWheel.phase = "SPIN_WAITING";
                  nextWheel.selectedSector = undefined;
                  nextWheel.lastActionMessage = generateFlexibleMCCommentary({
                    event: "LOSE_TURN",
                    teamName,
                    nextTeamName: nextWheel.currentTurnTeamName,
                  });
                }
              } else if (sector.type === "BANKRUPT") {
                soundManager.playMagicWheelBankrupt();
                nextWheel.pendingSpecialAction = "NONE";
                nextWheel.roundScores = { ...nextWheel.roundScores, [tId]: 0 };
                if (isSoleSurvivor) {
                  nextWheel.phase = "SPIN_WAITING";
                  nextWheel.lastActionMessage = `Đội ${teamName} quay vào ô MẤT ĐIỂM (về 0đ)! Vì là đội duy nhất còn lại nên vẫn được quay tiếp.`;
                } else if ((nextWheel.freeSpinCount[tId] || 0) > 0) {
                  nextWheel.freeSpinCount = { ...nextWheel.freeSpinCount, [tId]: nextWheel.freeSpinCount[tId] - 1 };
                  nextWheel.phase = "SPIN_WAITING";
                  nextWheel.lastActionMessage = `Đội ${teamName} quay vào ô MẤT ĐIỂM (về 0đ)! Đã dùng Thẻ Thêm Lượt để quay tiếp.`;
                } else {
                  const activeIdx = eligibleTeams.findIndex((t) => t.id === nextWheel.currentTurnTeamId);
                  const nextIdx = (activeIdx + 1) % Math.max(1, eligibleTeams.length);
                  nextWheel.currentTurnTeamId = eligibleTeams[nextIdx]?.id || "";
                  nextWheel.currentTurnTeamName = eligibleTeams[nextIdx]?.name || "";
                  nextWheel.phase = "SPIN_WAITING";
                  nextWheel.selectedSector = undefined;
                  nextWheel.lastActionMessage = generateFlexibleMCCommentary({
                    event: "BANKRUPT",
                    teamName,
                    nextTeamName: nextWheel.currentTurnTeamName,
                  });
                }
              } else if (sector.type === "HALF") {
                soundManager.playWheelStopChime();
                nextWheel.pendingSpecialAction = "HALF";
                nextWheel.roundScores = {
                  ...nextWheel.roundScores,
                  [tId]: Math.floor((nextWheel.roundScores[tId] || 0) / 2),
                };
                nextWheel.phase = "ACTION_INPUT";
                nextWheel.lastActionMessage = `Đội ${teamName} quay vào ô CHIA ĐÔI! Điểm vòng còn ${nextWheel.roundScores[tId]}đ. Mời chọn chữ cái!`;
              } else if (sector.type === "DOUBLE") {
                soundManager.playMagicWheelExtraTurn();
                nextWheel.pendingSpecialAction = "DOUBLE";
                nextWheel.phase = "ACTION_INPUT";
                const curPts = nextWheel.roundScores[tId] || 0;
                nextWheel.lastActionMessage = curPts > 0
                  ? `Đội ${teamName} quay vào ô NHÂN ĐÔI! Đoán đúng chữ cái để x2 số điểm vòng (${curPts}đ -> ${curPts * 2}đ)!`
                  : `Đội ${teamName} quay vào ô NHÂN ĐÔI! Mời chọn chữ cái!`;
              } else if (sector.type === "TRIPLE") {
                soundManager.playMagicWheelExtraTurn();
                nextWheel.pendingSpecialAction = "TRIPLE";
                nextWheel.phase = "ACTION_INPUT";
                nextWheel.lastActionMessage = `🔥 Đội ${teamName} quay vào ô NHÂN BA (X3)! Đoán đúng chữ cái để nhân 3 điểm vòng!`;
              } else if (sector.type === "EXTRA_TURN") {
                soundManager.playMagicWheelExtraTurn();
                nextWheel.pendingSpecialAction = "EXTRA_TURN";
                nextWheel.phase = "ACTION_INPUT";
                nextWheel.lastActionMessage = `Đội ${teamName} quay vào ô THÊM LƯỢT 🎟️! Hãy đoán đúng 1 chữ cái để chính thức nhận thẻ!`;
              } else if (sector.type === "LUCKY") {
                soundManager.playMagicWheelLucky();
                nextWheel.pendingSpecialAction = "LUCKY";
                nextWheel.phase = "LUCKY_PICK";
                nextWheel.lastActionMessage = `Đội ${teamName} quay vào ô MAY MẮN! Mời bấm chọn 1 ô bất kỳ trên bảng để lật mở miễn phí!`;
              } else if (sector.type === "PRIZE") {
                soundManager.playMagicWheelReward();
                nextWheel.pendingSpecialAction = "PRIZE";
                nextWheel.phase = "REWARD_CHOICE";
                nextWheel.lastActionMessage = `Đội ${teamName} quay vào ô PHẦN THƯỞNG 🎁! Hãy chọn 1 trong 20 lá thăm bí mật!`;
              } else if (sector.type === "MYSTERY") {
                soundManager.playWheelStopChime();
                nextWheel.pendingSpecialAction = "MYSTERY";
                nextWheel.phase = "MYSTERY_CHOICE";
                nextWheel.lastActionMessage = `Đội ${teamName} quay vào ô BÍ MẬT 🔮! Hãy quyết định lật ô bí mật hay nhận điểm an toàn.`;
              } else if (sector.type === "EXPRESS") {
                soundManager.playMagicWheelExtraTurn();
                nextWheel.pendingSpecialAction = "EXPRESS";
                nextWheel.phase = "EXPRESS_CHOICE";
                nextWheel.lastActionMessage = `🚄 Đội ${teamName} quay vào ô TÀU TỐC HÀNH! Chọn Lên Tàu (đoán liên tiếp 1.000đ/chữ, sai 1 chữ = Phá sản) hay đoán bình thường?`;
              } else if (sector.type === "JACKPOT") {
                soundManager.playMagicWheelReward();
                nextWheel.pendingSpecialAction = "JACKPOT";
                nextWheel.phase = "ACTION_INPUT";
                nextWheel.lastActionMessage = `💎 Đội ${teamName} quay vào ô KÉT SẮT JACKPOT (${(nextWheel.jackpotPool || 2000).toLocaleString()}đ)! Đoán đúng chữ cái để tiếp tục tích quỹ và mở khóa giải thưởng!`;
              } else if (sector.type === "STEAL_SWAP") {
                soundManager.playMagicWheelExtraTurn();
                nextWheel.pendingSpecialAction = "STEAL_SWAP";
                nextWheel.phase = "ACTION_INPUT";
                nextWheel.lastActionMessage = `⚡ Đội ${teamName} quay vào ô CƯỚP / HOÁN ĐỔI! Hãy đoán đúng 1 chữ cái trước để kích hoạt quyền Cướp 50% hoặc Hoán đổi điểm!`;
              } else {
                soundManager.playWheelStopChime();
                nextWheel.pendingSpecialAction = "POINTS";
                nextWheel.phase = "ACTION_INPUT";
                nextWheel.lastActionMessage = generateFlexibleMCCommentary({
                  event: "SPIN_POINTS",
                  teamName,
                  sectorValue: sector.value,
                });
              }

              const nextRoom = { ...latest, magicWheelState: nextWheel };
              roomStateRef.current = nextRoom;
              syncToIframes({ roomState: nextRoom });
              return nextRoom;
            });
          }, spinDurationMs);

          const nextRoom = { ...prev, magicWheelState: cur };
          roomStateRef.current = nextRoom;
          syncToIframes({ roomState: nextRoom });
          return nextRoom;
        });
      } else if (e.data?.type === "MAGIC_WHEEL_GUESS_LETTER") {
        const { letter } = e.data;
        setRoomState((prev) => {
          if (!prev || !prev.magicWheelState || prev.magicWheelState.phase !== "ACTION_INPUT") return prev;
          const cur = { ...prev.magicWheelState };
          const normLetter = normalizeVietnameseBaseLetter(letter);
          if (cur.guessedLetters.includes(normLetter)) return prev;

          cur.guessedLetters = [...cur.guessedLetters, normLetter];
          const p = cur.currentPuzzle ? { ...cur.currentPuzzle } : null;
          if (!p) return prev;
          cur.currentPuzzle = p;

          const check = checkLetterInSecretPhrase(p.secretPhrase, normLetter, p.revealedIndices);
          const tId = cur.currentTurnTeamId;
          const teamName = cur.currentTurnTeamName;
          const eligibleTeams = prev.teams.filter(
            (t) =>
              !(cur.disqualifiedTeamIdsInRound || []).includes(t.id) &&
              !(cur.round3TradedTeams || []).includes(t.id)
          );

          if (check.found) {
            cur.consecutiveWrongGuesses = { ...cur.consecutiveWrongGuesses, [tId]: 0 };
            cur.wrongGuessesCount = { ...cur.wrongGuessesCount, [tId]: 0 };
            p.revealedIndices = check.newRevealedIndices;
            let earned = 0;
            if (cur.expressTrainActive) {
              earned = 1000 * check.count;
              cur.roundScores = { ...cur.roundScores, [tId]: (cur.roundScores[tId] || 0) + earned };
            } else if (cur.pendingSpecialAction === "DOUBLE") {
              const prevSc = cur.roundScores[tId] || 0;
              if (prevSc > 0) {
                cur.roundScores = { ...cur.roundScores, [tId]: prevSc * 2 };
                earned = prevSc;
              }
            } else if (cur.pendingSpecialAction === "TRIPLE") {
              const prevSc = cur.roundScores[tId] || 0;
              if (prevSc > 0) {
                cur.roundScores = { ...cur.roundScores, [tId]: prevSc * 3 };
                earned = prevSc * 2;
              }
            } else if (cur.pendingSpecialAction === "HALF") {
              earned = 0;
            } else if (cur.pendingSpecialAction === "EXTRA_TURN") {
              if (eligibleTeams.length > 1) {
                cur.freeSpinCount = { ...cur.freeSpinCount, [tId]: (cur.freeSpinCount[tId] || 0) + 1 };
              }
              earned = 0;
            } else if (cur.pendingSpecialAction === "STEAL_SWAP") {
              earned = 300 * check.count;
              cur.roundScores = { ...cur.roundScores, [tId]: (cur.roundScores[tId] || 0) + earned };
              cur.phase = "STEAL_SWAP_CHOICE";
              cur.pendingSpecialAction = "NONE";
              cur.lastActionMessage = `⚡ Có ${check.count} chữ ${normLetter}! Mời Đội ${teamName} chọn Cướp 50% điểm hoặc Hoán đổi điểm với đối thủ!`;
              const nextRoom = { ...prev, magicWheelState: cur };
              roomStateRef.current = nextRoom;
              syncToIframes({ roomState: nextRoom });
              return nextRoom;
            } else {
              const baseVal = cur.selectedSector?.value || 300;
              earned = baseVal * check.count;
              cur.roundScores = { ...cur.roundScores, [tId]: (cur.roundScores[tId] || 0) + earned };
            }

            if (isPuzzleFullyRevealed(p.secretPhrase, p.revealedIndices)) {
              cur.mustSolveWithTones = true;
              cur.expressTrainActive = false;
              cur.phase = "SPIN_WAITING";
              cur.pendingSpecialAction = "NONE";
              cur.lastActionMessage = generateFlexibleMCCommentary({
                event: "ALL_LETTERS_OPEN_NEED_TONES",
                teamName,
                letter: normLetter,
                count: check.count,
                earnedPoints: earned,
              });
            } else if (cur.expressTrainActive) {
              cur.phase = "ACTION_INPUT";
              cur.lastActionMessage = `🚄 [TÀU TỐC HÀNH] Tuyệt vời! Có ${check.count} chữ ${normLetter} (+${earned.toLocaleString()}đ). Mời Đội ${teamName} đoán tiếp chữ cái hoặc bấm Giải Ô Chữ!`;
            } else {
              cur.phase = "SPIN_WAITING";
              cur.pendingSpecialAction = "NONE";
              cur.lastActionMessage = generateFlexibleMCCommentary({
                event: "LETTER_HIT",
                teamName,
                letter: normLetter,
                count: check.count,
                earnedPoints: earned,
              });
            }
          } else {
            if (cur.expressTrainActive) {
              cur.expressTrainActive = false;
              cur.roundScores = { ...cur.roundScores, [tId]: 0 };
              const activeIdx = eligibleTeams.findIndex((t) => t.id === cur.currentTurnTeamId);
              const nextIdx = (activeIdx + 1) % Math.max(1, eligibleTeams.length);
              cur.currentTurnTeamId = eligibleTeams[nextIdx]?.id || "";
              cur.currentTurnTeamName = eligibleTeams[nextIdx]?.name || "";
              cur.phase = "SPIN_WAITING";
              cur.selectedSector = undefined;
              cur.pendingSpecialAction = "NONE";
              cur.lastActionMessage = `💥 [TRẬT ĐƯỜNG RAY!] Không có chữ ${normLetter}! Đội ${teamName} mất toàn bộ điểm vòng (về 0đ) và chuyển lượt sang ${cur.currentTurnTeamName}!`;
            } else {
              const strikes = (cur.consecutiveWrongGuesses[tId] ?? cur.wrongGuessesCount[tId] ?? 0) + 1;
              cur.consecutiveWrongGuesses = { ...cur.consecutiveWrongGuesses, [tId]: strikes };
              cur.wrongGuessesCount = { ...cur.wrongGuessesCount, [tId]: strikes };

              if (strikes >= 3) {
                cur.disqualifiedTeamIdsInRound = [...(cur.disqualifiedTeamIdsInRound || []), tId];
                cur.roundScores = { ...cur.roundScores, [tId]: 0 };
                const remaining = prev.teams.filter(
                  (t) =>
                    !cur.disqualifiedTeamIdsInRound.includes(t.id) &&
                    !(cur.round3TradedTeams || []).includes(t.id)
                );
                if (remaining.length > 0) {
                  cur.currentTurnTeamId = remaining[0].id;
                  cur.currentTurnTeamName = remaining[0].name;
                  cur.phase = "SPIN_WAITING";
                  cur.lastActionMessage = `❌ Đội ${teamName} phạm 3 LỖI LIÊN TIẾP (3/3 X) và bị dừng quyền chơi vòng này! Chuyển lượt sang ${cur.currentTurnTeamName}.`;
                } else {
                  cur.phase = "ROUND_RECAP";
                  cur.lastActionMessage = "Tất cả các đội đều đã dừng cuộc chơi trong vòng này!";
                }
              } else if ((cur.freeSpinCount[tId] || 0) > 0) {
                cur.freeSpinCount = { ...cur.freeSpinCount, [tId]: cur.freeSpinCount[tId] - 1 };
                cur.phase = "SPIN_WAITING";
                cur.pendingSpecialAction = "NONE";
                cur.lastActionMessage = `Không có chữ ${normLetter}! Đội ${teamName} đã dùng 1 Thẻ Thêm Lượt để quay tiếp (Lỗi liên tiếp: ${strikes}/3).`;
              } else {
                const activeIdx = eligibleTeams.findIndex((t) => t.id === cur.currentTurnTeamId);
                const nextIdx = (activeIdx + 1) % Math.max(1, eligibleTeams.length);
                cur.currentTurnTeamId = eligibleTeams[nextIdx]?.id || "";
                cur.currentTurnTeamName = eligibleTeams[nextIdx]?.name || "";
                cur.phase = "SPIN_WAITING";
                cur.selectedSector = undefined;
                cur.pendingSpecialAction = "NONE";
                cur.lastActionMessage = generateFlexibleMCCommentary({
                  event: "LETTER_MISS",
                  teamName,
                  letter: normLetter,
                  nextTeamName: cur.currentTurnTeamName,
                  strikes,
                });
              }
            }
          }

          const nextRoom = { ...prev, magicWheelState: cur };
          roomStateRef.current = nextRoom;
          syncToIframes({ roomState: nextRoom });
          return nextRoom;
        });
      } else if (e.data?.type === "MAGIC_WHEEL_SOLVE_PUZZLE") {
        const { answer } = e.data;
        setRoomState((prev) => {
          if (!prev || !prev.magicWheelState || !prev.magicWheelState.currentPuzzle) return prev;
          const cur = { ...prev.magicWheelState };
          const p = { ...prev.magicWheelState.currentPuzzle };
          cur.currentPuzzle = p;
          const tId = cur.tossUpBuzzedTeamId || cur.currentTurnTeamId;
          const teamObj = prev.teams.find((t) => t.id === tId);
          const teamName = teamObj?.name || cur.currentTurnTeamName;
          const isCorrect = matchWholeSecretPhrase(p.secretPhrase, answer);
          cur.lastSolveAttemptText = answer;

          // Vòng Đoán Nhanh 1 & 2
          if (cur.roundStage === "TOSS_UP_1" || cur.roundStage === "TOSS_UP_2") {
            if (isCorrect) {
              soundManager.playMagicWheelSolveWin();
              p.revealedIndices = Array.from({ length: p.secretPhrase.length }, (_, i) => i);
              const bonusPts = cur.roundStage === "TOSS_UP_1" ? 500 : 1000;
              const perm = { ...(cur.permanentScores || {}) };
              perm[tId] = (perm[tId] || 0) + bonusPts;
              cur.permanentScores = perm;
              cur.roundScores = { ...cur.roundScores, [tId]: bonusPts };
              if (cur.roundStage === "TOSS_UP_2") {
                cur.mainRound1StarterTeamId = tId;
                cur.currentTurnTeamId = tId;
                cur.currentTurnTeamName = teamName;
              }
              cur.tossUpBuzzedTeamId = undefined;
              cur.tossUpBuzzedTeamName = undefined;
              cur.phase = "ROUND_RECAP";
              cur.lastActionMessage =
                cur.roundStage === "TOSS_UP_1"
                  ? `⚡ CHÍNH XÁC! Đội ${teamName} giải đúng Ô chữ Đoán Nhanh 1 và nhận ngay +500 điểm thưởng!`
                  : `⚡ XUẤT SẮC! Đội ${teamName} giải đúng Ô chữ Đoán Nhanh 2 (+1.000đ) và giành quyền QUAY ĐẦU TIÊN ở Vòng Chính 1!`;
              const updatedTeams = prev.teams.map((t) =>
                t.id === tId ? { ...t, score: (t.score || 0) + bonusPts } : t
              );
              const nextRoom = { ...prev, teams: updatedTeams, magicWheelState: cur };
              roomStateRef.current = nextRoom;
              syncToIframes({ roomState: nextRoom });
              return nextRoom;
            } else {
              soundManager.playMagicWheelWrong();
              cur.tossUpBuzzedTeamId = undefined;
              cur.tossUpBuzzedTeamName = undefined;
              cur.phase = "TOSS_UP_REVEALING";
              cur.lastActionMessage = `❌ Đáp án "${answer}" của ${teamName} chưa chính xác! Các chữ cái tiếp tục mở (0,5s/ô) — Tất cả các đội đều có quyền bấm chuông lại!`;
              const nextRoom = { ...prev, magicWheelState: cur };
              roomStateRef.current = nextRoom;
              syncToIframes({ roomState: nextRoom });
              return nextRoom;
            }
          }

          // Vòng Đặc Biệt (SPECIAL_FINAL)
          if (cur.roundStage === "SPECIAL_FINAL") {
            if (isCorrect) {
              soundManager.playMagicWheelSolveWin();
              p.revealedIndices = Array.from({ length: p.secretPhrase.length }, (_, i) => i);
              cur.mustSolveWithTones = false;
              if (cur.specialFinalChoiceOrder === "SOLVE_FIRST" && !cur.specialEnvelopePrize) {
                cur.phase = "SPIN_WAITING";
                cur.sectors = generateSpecialRoundWheelSectors();
                cur.lastActionMessage = `🎉 TUYỆT VỜI! Đội ${teamName} đã giải đúng Ô Chữ Đặc Biệt! Bây giờ mời bạn QUAY NÓN để mở Phong bì Giải Thưởng Chung Cuộc!`;
                const nextRoom = { ...prev, magicWheelState: cur };
                roomStateRef.current = nextRoom;
                syncToIframes({ roomState: nextRoom });
                return nextRoom;
              } else {
                const prizeVal = cur.specialEnvelopePrize?.value || 10000;
                const perm = { ...(cur.permanentScores || {}) };
                perm[tId] = (perm[tId] || 0) + prizeVal;
                cur.permanentScores = perm;
                cur.phase = "ROUND_RECAP";
                cur.lastActionMessage = `🏆 CHÚC MỪNG NHÀ VÔ ĐỊCH ${teamName}! Giải chính xác Ô Chữ Đặc Biệt và nhận giải thưởng +${prizeVal.toLocaleString()}đ!`;
                const updatedTeams = prev.teams.map((t) =>
                  t.id === tId ? { ...t, score: (t.score || 0) + prizeVal } : t
                );
                const nextRoom = { ...prev, teams: updatedTeams, magicWheelState: cur };
                roomStateRef.current = nextRoom;
                syncToIframes({ roomState: nextRoom });
                return nextRoom;
              }
            } else {
              // Trong Vòng Đặc Biệt người chơi được gõ liên tục trong thời gian quy định
              soundManager.playMagicWheelWrong();
              cur.lastActionMessage = `Chưa chính xác ("${answer}")! Bạn vẫn có thể tiếp tục gõ đáp án khác trong thời gian quy định!`;
              const nextRoom = { ...prev, magicWheelState: cur };
              roomStateRef.current = nextRoom;
              syncToIframes({ roomState: nextRoom });
              return nextRoom;
            }
          }

          // Vòng Chính 1..N
          if (isCorrect) {
            soundManager.playMagicWheelSolveWin();
            p.revealedIndices = Array.from({ length: p.secretPhrase.length }, (_, i) => i);
            cur.mustSolveWithTones = false;
            cur.expressTrainActive = false;
            const roundPts = Math.max(500, cur.roundScores[tId] || 0);
            const jackpotBonus =
              cur.pendingSpecialAction === "JACKPOT" || cur.selectedSector?.type === "JACKPOT"
                ? cur.jackpotPool || 2000
                : 0;
            const totalWon = roundPts + jackpotBonus;
            cur.roundScores = { ...cur.roundScores, [tId]: totalWon };
            const perm = { ...(cur.permanentScores || {}) };
            perm[tId] = (perm[tId] || 0) + totalWon;
            cur.permanentScores = perm;
            cur.phase = "ROUND_RECAP";
            cur.lastActionMessage = generateFlexibleMCCommentary({
              event: "SOLVE_WIN",
              teamName,
              earnedPoints: totalWon,
            });
            const updatedTeams = prev.teams.map((t) =>
              t.id === tId ? { ...t, score: (t.score || 0) + totalWon } : t
            );
            const nextRoom = { ...prev, teams: updatedTeams, magicWheelState: cur };
            roomStateRef.current = nextRoom;
            syncToIframes({ roomState: nextRoom });
            return nextRoom;
          } else {
            soundManager.playMagicWheelWrong();
            cur.expressTrainActive = false;
            const strikes = (cur.consecutiveWrongGuesses[tId] ?? cur.wrongGuessesCount[tId] ?? 0) + 1;
            cur.consecutiveWrongGuesses = { ...cur.consecutiveWrongGuesses, [tId]: strikes };
            cur.wrongGuessesCount = { ...cur.wrongGuessesCount, [tId]: strikes };
            if (strikes >= 3) {
              cur.disqualifiedTeamIdsInRound = [...(cur.disqualifiedTeamIdsInRound || []), tId];
              cur.roundScores = { ...cur.roundScores, [tId]: 0 };
            }
            const remaining = prev.teams.filter(
              (t) =>
                !(cur.disqualifiedTeamIdsInRound || []).includes(t.id) &&
                !(cur.round3TradedTeams || []).includes(t.id)
            );
            if (remaining.length > 0) {
              const activeIdx = remaining.findIndex((t) => t.id === cur.currentTurnTeamId);
              const nextIdx = (activeIdx + 1) % remaining.length;
              cur.currentTurnTeamId = remaining[nextIdx]?.id || "";
              cur.currentTurnTeamName = remaining[nextIdx]?.name || "";
              cur.phase = "SPIN_WAITING";
              cur.lastActionMessage = generateFlexibleMCCommentary({
                event: "SOLVE_FAIL",
                teamName,
                nextTeamName: cur.currentTurnTeamName,
                strikes,
              });
            } else {
              cur.phase = "ROUND_RECAP";
              cur.lastActionMessage = "Tất cả các đội đều đã hết quyền thi đấu trong vòng này!";
            }
            const nextRoom = { ...prev, magicWheelState: cur };
            roomStateRef.current = nextRoom;
            syncToIframes({ roomState: nextRoom });
            return nextRoom;
          }
        });
      } else if (e.data?.type === "MAGIC_WHEEL_LUCKY_PICK") {
        const { index } = e.data;
        setRoomState((prev) => {
          if (!prev || !prev.magicWheelState || !prev.magicWheelState.currentPuzzle) return prev;
          const cur = { ...prev.magicWheelState };
          const p = { ...prev.magicWheelState.currentPuzzle };
          cur.currentPuzzle = p;
          if (index >= 0 && index < p.secretPhrase.length && !p.revealedIndices.includes(index)) {
            p.revealedIndices = [...p.revealedIndices, index];
            const baseChar = normalizeVietnameseBaseLetter(p.secretPhrase[index]);
            if ( isPuzzleFullyRevealed(p.secretPhrase, p.revealedIndices) ) {
              cur.mustSolveWithTones = true;
              cur.phase = "SPIN_WAITING";
              cur.lastActionMessage = `🍀 Ô May Mắn đã mở chữ "${baseChar}"! Toàn bộ chữ cái gốc đã lộ diện — mời Đội ${cur.currentTurnTeamName} bấm GIẢI Ô CHỮ chính xác từng dấu thanh!`;
            } else {
              cur.phase = "SPIN_WAITING";
              cur.lastActionMessage = `🍀 Ô May Mắn đã lật mở vị trí #${index + 1} (chữ "${baseChar}")! Mời Đội ${cur.currentTurnTeamName} quay tiếp.`;
            }
          }
          const nextRoom = { ...prev, magicWheelState: cur };
          roomStateRef.current = nextRoom;
          syncToIframes({ roomState: nextRoom });
          return nextRoom;
        });
      } else if (e.data?.type === "MAGIC_WHEEL_MYSTERY_DECIDE") {
        const { openMystery } = e.data;
        setRoomState((prev) => {
          if (!prev || !prev.magicWheelState) return prev;
          const cur = { ...prev.magicWheelState };
          const tId = cur.currentTurnTeamId;
          const teamName = cur.currentTurnTeamName;
          const currentSector = cur.selectedSector || cur.sectors[cur.selectedSectorIndex ?? -1];
          const basePts = currentSector?.basePoints || (currentSector?.id === 13 ? 100 : 200);
          const is3M = currentSector?.mysteryContent ? currentSector.mysteryContent === "PRIZE_3M" : Math.random() >= 0.5;
          let updatedTeams = prev.teams;

          if (openMystery) {
            if (currentSector) {
              const sIdx = cur.sectors.findIndex((s) => s.id === currentSector.id);
              if (sIdx !== -1) {
                const orig = BASE_24_SECTORS.find((b) => b.id === currentSector.id) || {
                  id: currentSector.id,
                  label: String(basePts),
                  type: "POINTS" as const,
                  value: basePts,
                  color: basePts === 100 ? "#16a34a" : "#059669",
                  textColor: "#ffffff",
                };
                cur.sectors = cur.sectors.map((sec, idx) => (idx === sIdx ? { ...orig } : sec));
              }
            }

            if (is3M) {
              const perm = { ...(cur.permanentScores || {}) };
              perm[tId] = (perm[tId] || 0) + 3000;
              cur.permanentScores = perm;
              updatedTeams = prev.teams.map((t) =>
                t.id === tId ? { ...t, score: (t.score || 0) + 3000 } : t
              );
              cur.phase = "ACTION_INPUT";
              cur.pendingSpecialAction = "POINTS";
              cur.lastActionMessage = `🎉 CHÚC MỪNG! Mặt sau ô Bí Mật là +3.000 ĐIỂM VĨNH VIỄN! Mời Đội ${teamName} gọi chữ cái!`;
            } else {
              cur.roundScores = { ...cur.roundScores, [tId]: 0 };
              const eligibleTeams = prev.teams.filter(
                (t) =>
                  !(cur.disqualifiedTeamIdsInRound || []).includes(t.id) &&
                  !(cur.round3TradedTeams || []).includes(t.id)
              );
              if (eligibleTeams.length > 0) {
                const activeIdx = eligibleTeams.findIndex((t) => t.id === cur.currentTurnTeamId);
                const nextIdx = (activeIdx + 1) % eligibleTeams.length;
                cur.currentTurnTeamId = eligibleTeams[nextIdx]?.id || "";
                cur.currentTurnTeamName = eligibleTeams[nextIdx]?.name || "";
              }
              cur.phase = "SPIN_WAITING";
              cur.lastActionMessage = `💥 ÔI KHÔNG! Mặt sau ô Bí Mật là MẤT ĐIỂM! Đội ${teamName} mất toàn bộ điểm vòng! Chuyển lượt sang ${cur.currentTurnTeamName}.`;
            }
          } else {
            cur.roundScores = { ...cur.roundScores, [tId]: (cur.roundScores[tId] || 0) + basePts };
            cur.phase = "ACTION_INPUT";
            cur.pendingSpecialAction = "POINTS";
            cur.lastActionMessage = `Đội ${teamName} chọn KHÔNG LẬT ô bí mật! Nhận an toàn ${basePts} điểm và tiếp tục gọi chữ cái.`;
          }
          const nextRoom = { ...prev, teams: updatedTeams, magicWheelState: cur };
          roomStateRef.current = nextRoom;
          syncToIframes({ roomState: nextRoom });
          return nextRoom;
        });
      } else if (e.data?.type === "MAGIC_WHEEL_FORCE_PHASE") {
        setRoomState((prev) => {
          if (!prev || !prev.magicWheelState) return prev;
          const cur = { ...prev.magicWheelState, phase: e.data.phase || "ACTION_INPUT" };
          if (e.data.selectedSector) cur.selectedSector = e.data.selectedSector;
          if (e.data.lastActionMessage) cur.lastActionMessage = e.data.lastActionMessage;
          const nextRoom = { ...prev, magicWheelState: cur };
          roomStateRef.current = nextRoom;
          syncToIframes({ roomState: nextRoom });
          return nextRoom;
        });
      } else if (e.data?.type === "MAGIC_WHEEL_REWARD_SELECT") {
        const { cardIndex, rewardType, points, cardType, cardId } = e.data;
        setRoomState((prev) => {
          if (!prev || !prev.magicWheelState) return prev;
          const cur = { ...prev.magicWheelState };
          const tId = cur.currentTurnTeamId;
          const teamName = cur.currentTurnTeamName;
          const perm = { ...(cur.permanentScores || {}) };
          const shields = { ...(cur.teamShields || {}) };
          const freeSpins = { ...(cur.freeSpinCount || {}) };
          const cardNum = cardIndex !== undefined ? cardIndex + 1 : 1;
          let updatedTeams = prev.teams;

          if (rewardType === "POINTS") {
            const pts = points || 500;
            cur.roundScores = { ...cur.roundScores, [tId]: (cur.roundScores[tId] || 0) + pts };
            cur.lastActionMessage = `🎁 Đội ${teamName} bốc được lá thăm #${cardNum}: Nhận ngay +${pts} điểm vòng!`;
          } else if (rewardType === "FREE_SPIN") {
            freeSpins[tId] = (freeSpins[tId] || 0) + 1;
            cur.lastActionMessage = `🎟️ Đội ${teamName} bốc được lá thăm #${cardNum}: Nhận 1 Thẻ Thêm Lượt bảo lưu!`;
          } else if (rewardType === "JACKPOT_LETTER") {
            const pts = points || 3000;
            cur.roundScores = { ...cur.roundScores, [tId]: (cur.roundScores[tId] || 0) + pts };
            if (cur.currentPuzzle) {
              const p = { ...cur.currentPuzzle };
              cur.currentPuzzle = p;
              const unrevealed: number[] = [];
              for (let i = 0; i < p.secretPhrase.length; i++) {
                if (/[a-zA-Zà-ỹÀ-Ỹ]/.test(p.secretPhrase[i]) && !p.revealedIndices.includes(i)) {
                  unrevealed.push(i);
                }
              }
              if (unrevealed.length > 0) {
                const luckyIdx = unrevealed[Math.floor(Math.random() * unrevealed.length)];
                p.revealedIndices = [...p.revealedIndices, luckyIdx];
                const baseChar = normalizeVietnameseBaseLetter(p.secretPhrase[luckyIdx]);
                if (isPuzzleFullyRevealed(p.secretPhrase, p.revealedIndices)) {
                  cur.mustSolveWithTones = true;
                }
                cur.lastActionMessage = `⭐ Đội ${teamName} bốc trúng SIÊU PHẦN THƯỞNG lá thăm #${cardNum}: +${pts} điểm VÀ mở chữ "${baseChar}"!`;
              } else {
                cur.lastActionMessage = `⭐ Đội ${teamName} bốc trúng SIÊU PHẦN THƯỞNG lá thăm #${cardNum}: +${pts} điểm!`;
              }
            } else {
              cur.lastActionMessage = `⭐ Đội ${teamName} bốc trúng SIÊU PHẦN THƯỞNG lá thăm #${cardNum}: +${pts} điểm!`;
            }
          } else if (cardType === "POINTS_1500" || cardId === "CARD_1500") {
            perm[tId] = (perm[tId] || 0) + 1500;
            updatedTeams = prev.teams.map((t) =>
              t.id === tId ? { ...t, score: (t.score || 0) + 1500 } : t
            );
            cur.lastActionMessage = `🎁 Đội ${teamName} nhận Thẻ +1.500 Điểm Vĩnh Viễn!`;
          } else if (cardType === "FREE_SPIN" || cardId === "CARD_EXTRA_TURN") {
            freeSpins[tId] = (freeSpins[tId] || 0) + 1;
            cur.lastActionMessage = `🎟️ Đội ${teamName} nhận Thẻ Thêm Lượt bảo lưu!`;
          } else if (cardType === "SHIELD" || cardId === "CARD_SHIELD") {
            shields[tId] = true;
            cur.lastActionMessage = `🛡️ Đội ${teamName} nhận Khiên Bảo Hộ chống mất điểm/mất lượt 1 lần!`;
          }
          cur.permanentScores = perm;
          cur.teamShields = shields;
          cur.freeSpinCount = freeSpins;
          cur.phase = "SPIN_WAITING";
          cur.pendingSpecialAction = "NONE";
          const nextRoom = { ...prev, teams: updatedTeams, magicWheelState: cur };
          roomStateRef.current = nextRoom;
          syncToIframes({ roomState: nextRoom });
          return nextRoom;
        });
      } else if (e.data?.type === "MAGIC_WHEEL_TRADE_DECIDE") {
        const { trade, acceptTrade, boxIndex, giftBoxId } = e.data;
        const isTradeAccepted = trade !== undefined ? trade : Boolean(acceptTrade);
        setRoomState((prev) => {
          if (!prev || !prev.magicWheelState) return prev;
          const cur = { ...prev.magicWheelState };
          const tId = cur.currentTurnTeamId;
          const teamName = cur.currentTurnTeamName;
          const eligibleTeams = prev.teams.filter(
            (t) => !(cur.disqualifiedTeamIdsInRound || []).includes(t.id)
          );
          let updatedTeams = prev.teams;

          if (isTradeAccepted) {
            const traded = [...(cur.round3TradedTeams || [])];
            if (!traded.includes(tId)) traded.push(tId);
            cur.round3TradedTeams = traded;
            const perm = { ...(cur.permanentScores || {}) };
            const freeSpins = { ...(cur.freeSpinCount || {}) };
            const shields = { ...(cur.teamShields || {}) };

            if (boxIndex === 0 || giftBoxId === "BOX_A") {
              perm[tId] = (perm[tId] || 0) + 2500;
              updatedTeams = prev.teams.map((t) =>
                t.id === tId ? { ...t, score: (t.score || 0) + 2500 } : t
              );
              cur.lastActionMessage = `🎁 [HỘP QUÀ 1] Đội ${teamName} nhận +2.500 điểm vĩnh viễn và dừng chơi Vòng 3 để bảo toàn giải thưởng!`;
            } else if (boxIndex === 1 || giftBoxId === "BOX_B") {
              freeSpins[tId] = (freeSpins[tId] || 0) + 2;
              cur.lastActionMessage = `🎟️ [HỘP QUÀ 2] Đội ${teamName} nhận 2 Thẻ Thêm Lượt cho vòng sau và dừng chơi Vòng 3!`;
            } else if (boxIndex === 2 || giftBoxId === "BOX_C") {
              shields[tId] = true;
              cur.lastActionMessage = `🛡️ [HỘP QUÀ 3] Đội ${teamName} nhận Khiên Bảo Hộ Vĩnh Cửu và dừng chơi Vòng 3!`;
            } else {
              perm[tId] = (perm[tId] || 0) + 4000;
              updatedTeams = prev.teams.map((t) =>
                t.id === tId ? { ...t, score: (t.score || 0) + 4000 } : t
              );
              cur.lastActionMessage = `🏆 [HỘP QUÀ ĐẶC BIỆT] Đội ${teamName} nhận giải thưởng khủng +4.000 điểm vĩnh viễn và dừng chơi Vòng 3!`;
            }
            cur.permanentScores = perm;
            cur.freeSpinCount = freeSpins;
            cur.teamShields = shields;

            const remaining = eligibleTeams.filter((t) => !traded.includes(t.id));
            if (remaining.length > 0) {
              cur.currentTurnTeamId = remaining[0].id;
              cur.currentTurnTeamName = remaining[0].name;
              cur.phase = "SPIN_WAITING";
            } else {
              cur.phase = "ROUND_RECAP";
              cur.lastActionMessage = "Tất cả các đội đều đã nhận quà Đổi Hộp Quà ở Vòng 3!";
            }
          } else {
            const forbidden = [...(cur.round3ForbiddenSolveTeams || [])];
            if (!forbidden.includes(tId)) forbidden.push(tId);
            cur.round3ForbiddenSolveTeams = forbidden;
            cur.phase = "SPIN_WAITING";
            cur.lastActionMessage = `Đội ${teamName} CHỌN KHÔNG ĐỔI! Đội sẽ tiếp tục quay mở ô chữ nhưng BỊ CẤM ĐOÁN Ô CHỮ cho đến khi toàn bộ chữ cái được lật mở!`;
          }

          const nextRoom = { ...prev, teams: updatedTeams, magicWheelState: cur };
          roomStateRef.current = nextRoom;
          syncToIframes({ roomState: nextRoom });
          return nextRoom;
        });
      } else if (e.data?.type === "MAGIC_WHEEL_TOSS_UP_START") {
        setRoomState((prev) => {
          if (!prev || !prev.magicWheelState?.currentPuzzle) return prev;
          const cur = { ...prev.magicWheelState };
          const p = { ...prev.magicWheelState.currentPuzzle };
          cur.currentPuzzle = p;
          const allIndices: number[] = [];
          for (let i = 0; i < p.secretPhrase.length; i++) {
            if (p.secretPhrase[i] !== " " && !p.revealedIndices.includes(i)) {
              allIndices.push(i);
            }
          }
          // Shuffle order with a tile near left/right edge first for hostess touch
          for (let i = allIndices.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [allIndices[i], allIndices[j]] = [allIndices[j], allIndices[i]];
          }
          cur.tossUpRevealOrder = allIndices;
          cur.tossUpBuzzedTeamId = undefined;
          cur.tossUpBuzzedTeamName = undefined;
          cur.phase = "TOSS_UP_REVEALING";
          cur.lastActionMessage = `⚡ Người mẫu chạm tay mở ô chữ đầu tiên — Các chữ cái đang xuất hiện ngẫu nhiên (0,5s/ô)! Hãy bấm chuông giành quyền trả lời!`;
          const nextRoom = { ...prev, magicWheelState: cur };
          roomStateRef.current = nextRoom;
          syncToIframes({ roomState: nextRoom });
          return nextRoom;
        });
      } else if (e.data?.type === "MAGIC_WHEEL_TOSS_UP_TICK") {
        setRoomState((prev) => {
          if (
            !prev ||
            !prev.magicWheelState?.currentPuzzle ||
            prev.magicWheelState.phase !== "TOSS_UP_REVEALING"
          ) {
            return prev;
          }
          const cur = { ...prev.magicWheelState };
          const p = { ...prev.magicWheelState.currentPuzzle };
          cur.currentPuzzle = p;
          const order = [...(cur.tossUpRevealOrder || [])];
          const nextIdx = order.find((idx) => !p.revealedIndices.includes(idx));
          if (nextIdx !== undefined) {
            p.revealedIndices = [...p.revealedIndices, nextIdx];
          }
          if (isPuzzleFullyRevealed(p.secretPhrase, p.revealedIndices)) {
            cur.mustSolveWithTones = true;
            cur.lastActionMessage = `⚡ Tất cả chữ cái gốc đã lộ diện! Đội nào bấm chuông và gõ đúng dấu thanh nhanh nhất sẽ chiến thắng!`;
          }
          const nextRoom = { ...prev, magicWheelState: cur };
          roomStateRef.current = nextRoom;
          syncToIframes({ roomState: nextRoom });
          return nextRoom;
        });
      } else if (e.data?.type === "MAGIC_WHEEL_TOSS_UP_BUZZ") {
        const { teamId } = e.data;
        setRoomState((prev) => {
          if (!prev || !prev.magicWheelState) return prev;
          const cur = { ...prev.magicWheelState };
          if (cur.phase !== "TOSS_UP_REVEALING" && cur.phase !== "TOSS_UP_READY") return prev;
          const buzzTeam = prev.teams.find((t) => t.id === teamId) || prev.teams[0];
          if (!buzzTeam) return prev;
          soundManager.playBuzz();
          cur.tossUpBuzzedTeamId = buzzTeam.id;
          cur.tossUpBuzzedTeamName = buzzTeam.name;
          cur.phase = "TOSS_UP_BUZZED";
          cur.lastActionMessage = `🔔 Đội ${buzzTeam.name} đã bấm chuông giành quyền trả lời! Mời nhập đáp án chính xác từng dấu thanh!`;
          const nextRoom = { ...prev, magicWheelState: cur };
          roomStateRef.current = nextRoom;
          syncToIframes({ roomState: nextRoom });
          return nextRoom;
        });
      } else if (e.data?.type === "MAGIC_WHEEL_EXPRESS_DECIDE") {
        const { boardTrain } = e.data;
        setRoomState((prev) => {
          if (!prev || !prev.magicWheelState) return prev;
          const cur = { ...prev.magicWheelState };
          cur.expressTrainActive = Boolean(boardTrain);
          cur.phase = "ACTION_INPUT";
          cur.pendingSpecialAction = "POINTS";
          cur.lastActionMessage = boardTrain
            ? `🚄 Đội ${cur.currentTurnTeamName} ĐÃ LÊN TÀU TỐC HÀNH! Mỗi chữ cái đúng nhận +1.000đ liên tiếp không cần quay nón, nhưng đoán sai 1 chữ sẽ PHÁ SẢN ngay!`
            : `Đội ${cur.currentTurnTeamName} chọn đoán bình thường (+500đ/chữ). Mời chọn chữ cái!`;
          const nextRoom = { ...prev, magicWheelState: cur };
          roomStateRef.current = nextRoom;
          syncToIframes({ roomState: nextRoom });
          return nextRoom;
        });
      } else if (e.data?.type === "MAGIC_WHEEL_STEAL_SWAP_DECIDE") {
        const { mode, targetTeamId } = e.data;
        setRoomState((prev) => {
          if (!prev || !prev.magicWheelState) return prev;
          const cur = { ...prev.magicWheelState };
          const tId = cur.currentTurnTeamId;
          const teamName = cur.currentTurnTeamName;
          const targetTeam = prev.teams.find((t) => t.id === targetTeamId);
          const targetName = targetTeam?.name || "Đối thủ";
          const rScores = { ...cur.roundScores };

          if (mode === "STEAL_HALF") {
            const stolen = Math.floor((rScores[targetTeamId] || 0) / 2);
            rScores[targetTeamId] = (rScores[targetTeamId] || 0) - stolen;
            rScores[tId] = (rScores[tId] || 0) + stolen;
            cur.lastActionMessage = `⚡ Đội ${teamName} đã CƯỚP 50% điểm vòng (+${stolen.toLocaleString()}đ) từ Đội ${targetName}!`;
          } else {
            const mySc = rScores[tId] || 0;
            const targetSc = rScores[targetTeamId] || 0;
            rScores[tId] = targetSc;
            rScores[targetTeamId] = mySc;
            cur.lastActionMessage = `🔄 Đội ${teamName} đã HOÁN ĐỔI điểm vòng với Đội ${targetName} (${mySc.toLocaleString()}đ ↔ ${targetSc.toLocaleString()}đ)!`;
          }
          cur.roundScores = rScores;
          cur.phase = "SPIN_WAITING";
          const nextRoom = { ...prev, magicWheelState: cur };
          roomStateRef.current = nextRoom;
          syncToIframes({ roomState: nextRoom });
          return nextRoom;
        });
      } else if (e.data?.type === "MAGIC_WHEEL_SPECIAL_ORDER") {
        const { order } = e.data;
        setRoomState((prev) => {
          if (!prev || !prev.magicWheelState) return prev;
          const cur = { ...prev.magicWheelState };
          cur.specialFinalChoiceOrder = order;
          const allowed = calculateSpecialRoundAllowedLetters(
            cur.currentPuzzle?.secretPhrase || ""
          );
          cur.specialAllowedLetterCount = allowed;
          cur.specialSelectedLetters = [];

          if (order === "SPIN_FIRST") {
            cur.sectors = generateSpecialRoundWheelSectors();
            cur.phase = "SPIN_WAITING";
            cur.lastActionMessage = `🌟 Đội ${cur.currentTurnTeamName} chọn QUAY PHẦN THƯỞNG TRƯỚC! Mời quay nón để lấy Phong bì Giải Thưởng!`;
          } else {
            cur.phase = "SPECIAL_PICK_LETTERS";
            cur.lastActionMessage = `🧠 Đội ${cur.currentTurnTeamName} chọn GIẢI Ô CHỮ TRƯỚC! Hệ thống cho phép bạn đoán trước ${allowed} chữ cái!`;
          }
          const nextRoom = { ...prev, magicWheelState: cur };
          roomStateRef.current = nextRoom;
          syncToIframes({ roomState: nextRoom });
          return nextRoom;
        });
      } else if (e.data?.type === "MAGIC_WHEEL_SPECIAL_PICK_LETTERS") {
        const { letters } = e.data;
        setRoomState((prev) => {
          if (!prev || !prev.magicWheelState?.currentPuzzle) return prev;
          const cur = { ...prev.magicWheelState };
          const p = { ...prev.magicWheelState.currentPuzzle };
          cur.currentPuzzle = p;
          const normLetters: string[] = (letters || []).map((l: string) =>
            normalizeVietnameseBaseLetter(l)
          );
          cur.specialSelectedLetters = normLetters;
          cur.guessedLetters = [...new Set([...cur.guessedLetters, ...normLetters])];

          let revealed = [...p.revealedIndices];
          for (const ch of normLetters) {
            const res = checkLetterInSecretPhrase(p.secretPhrase, ch, revealed);
            revealed = res.newRevealedIndices;
          }
          p.revealedIndices = revealed;
          cur.specialThinkEndsAt = Date.now() + 30000;
          cur.specialAnswerEndsAt = Date.now() + 40000;
          cur.phase = "SPECIAL_THINKING";
          cur.lastActionMessage = `⏱️ Đã mở các chữ cái [${normLetters.join(", ")}]! Bạn có 30s suy nghĩ + 10s trả lời (được gõ đáp án liên tục bất kỳ lúc nào)!`;
          const nextRoom = { ...prev, magicWheelState: cur };
          roomStateRef.current = nextRoom;
          syncToIframes({ roomState: nextRoom });
          return nextRoom;
        });
      } else if (e.data?.type === "MAGIC_WHEEL_SET_MODE") {
        const { mode } = e.data;
        setRoomState((prev) => {
          if (!prev || !prev.magicWheelState) return prev;
          const cur = {
            ...prev.magicWheelState,
            operationMode: mode,
            lastActionMessage:
              mode === "HOST_ASSISTED"
                ? "🎙️ Đã chuyển sang Mode MC/Admin thao tác giúp (Sân khấu lớn)."
                : "💻 Đã chuyển sang Mode Người chơi tự thao tác trên máy.",
          };
          const nextRoom = { ...prev, magicWheelState: cur };
          roomStateRef.current = nextRoom;
          syncToIframes({ roomState: nextRoom });
          return nextRoom;
        });
      } else if (e.data?.type === "MAGIC_WHEEL_JUDGE_SOLVE") {
        const { correct } = e.data;
        setRoomState((prev) => {
          if (!prev || !prev.magicWheelState?.currentPuzzle) return prev;
          const cur = { ...prev.magicWheelState };
          const p = { ...prev.magicWheelState.currentPuzzle };
          cur.currentPuzzle = p;
          const tId = cur.tossUpBuzzedTeamId || cur.currentTurnTeamId;
          const teamObj = prev.teams.find((t) => t.id === tId);
          const teamName = teamObj?.name || cur.currentTurnTeamName;

          if (correct) {
            soundManager.playMagicWheelSolveWin();
            p.revealedIndices = Array.from({ length: p.secretPhrase.length }, (_, i) => i);
            cur.mustSolveWithTones = false;
            const earned =
              cur.roundStage === "TOSS_UP_1"
                ? 500
                : cur.roundStage === "TOSS_UP_2"
                ? 1000
                : cur.roundStage === "SPECIAL_FINAL"
                ? cur.specialEnvelopePrize?.value || 10000
                : Math.max(500, cur.roundScores[tId] || 0);
            const perm = { ...(cur.permanentScores || {}) };
            perm[tId] = (perm[tId] || 0) + earned;
            cur.permanentScores = perm;
            cur.roundScores = { ...cur.roundScores, [tId]: earned };
            if (cur.roundStage === "TOSS_UP_2") {
              cur.mainRound1StarterTeamId = tId;
            }
            cur.phase = "ROUND_RECAP";
            cur.lastActionMessage = `🎉 MC xác nhận Đội ${teamName} GIẢI Ô CHỮ CHÍNH XÁC (+${earned.toLocaleString()}đ)!`;
            const updatedTeams = prev.teams.map((t) =>
              t.id === tId ? { ...t, score: (t.score || 0) + earned } : t
            );
            const nextRoom = { ...prev, teams: updatedTeams, magicWheelState: cur };
            roomStateRef.current = nextRoom;
            syncToIframes({ roomState: nextRoom });
            return nextRoom;
          } else {
            soundManager.playMagicWheelWrong();
            const strikes = (cur.consecutiveWrongGuesses[tId] ?? cur.wrongGuessesCount[tId] ?? 0) + 1;
            cur.consecutiveWrongGuesses = { ...cur.consecutiveWrongGuesses, [tId]: strikes };
            cur.wrongGuessesCount = { ...cur.wrongGuessesCount, [tId]: strikes };
            const eligibleTeams = prev.teams.filter(
              (t) => !(cur.disqualifiedTeamIdsInRound || []).includes(t.id)
            );
            if (eligibleTeams.length > 0) {
              const activeIdx = eligibleTeams.findIndex((t) => t.id === cur.currentTurnTeamId);
              const nextIdx = (activeIdx + 1) % eligibleTeams.length;
              cur.currentTurnTeamId = eligibleTeams[nextIdx]?.id || "";
              cur.currentTurnTeamName = eligibleTeams[nextIdx]?.name || "";
            }
            cur.phase = "SPIN_WAITING";
            cur.lastActionMessage = `❌ MC xác nhận đáp án của ${teamName} chưa đúng dấu thanh (${strikes}/3 X). Chuyển lượt sang ${cur.currentTurnTeamName}!`;
            const nextRoom = { ...prev, magicWheelState: cur };
            roomStateRef.current = nextRoom;
            syncToIframes({ roomState: nextRoom });
            return nextRoom;
          }
        });
      } else if (e.data?.type === "MAGIC_WHEEL_OVERRIDE_TURN") {
        const { teamId } = e.data;
        setRoomState((prev) => {
          if (!prev || !prev.magicWheelState) return prev;
          const targetTeam = prev.teams.find((t) => t.id === teamId);
          if (!targetTeam) return prev;
          const cur = {
            ...prev.magicWheelState,
            currentTurnTeamId: targetTeam.id,
            currentTurnTeamName: targetTeam.name,
            lastActionMessage: `🎙️ Quản trò trao quyền lượt chơi cho Đội ${targetTeam.name}.`,
          };
          const nextRoom = { ...prev, magicWheelState: cur };
          roomStateRef.current = nextRoom;
          syncToIframes({ roomState: nextRoom });
          return nextRoom;
        });
      } else if (e.data?.type === "MAGIC_WHEEL_PASS_TURN") {
        setRoomState((prev) => {
          if (!prev || !prev.magicWheelState) return prev;
          const cur = { ...prev.magicWheelState };
          const eligibleTeams = prev.teams.filter(
            (t) =>
              !(cur.disqualifiedTeamIdsInRound || []).includes(t.id) &&
              !(cur.round3TradedTeams || []).includes(t.id)
          );
          if (eligibleTeams.length > 0) {
            const activeIdx = eligibleTeams.findIndex((t) => t.id === cur.currentTurnTeamId);
            const nextIdx = (activeIdx + 1) % eligibleTeams.length;
            cur.currentTurnTeamId = eligibleTeams[nextIdx]?.id || "";
            cur.currentTurnTeamName = eligibleTeams[nextIdx]?.name || "";
            cur.phase = "SPIN_WAITING";
            cur.selectedSector = undefined;
            cur.pendingSpecialAction = "NONE";
            cur.lastActionMessage = `Quản trò chuyển lượt sang Đội ${cur.currentTurnTeamName}.`;
          }
          const nextRoom = { ...prev, magicWheelState: cur };
          roomStateRef.current = nextRoom;
          syncToIframes({ roomState: nextRoom });
          return nextRoom;
        });
      } else if (e.data?.type === "MAGIC_WHEEL_QUICK_REVEAL") {
        setRoomState((prev) => {
          if (!prev || !prev.magicWheelState?.currentPuzzle) return prev;
          const cur = { ...prev.magicWheelState };
          const p = { ...prev.magicWheelState.currentPuzzle };
          cur.currentPuzzle = p;
          const unrevealed: number[] = [];
          for (let i = 0; i < p.secretPhrase.length; i++) {
            if (p.secretPhrase[i] !== " " && !p.revealedIndices.includes(i)) unrevealed.push(i);
          }
          if (unrevealed.length > 0) {
            const pick = unrevealed[Math.floor(Math.random() * unrevealed.length)];
            soundManager.playMagicWheelLetterReveal();
            p.revealedIndices = [...p.revealedIndices, pick];
            const baseChar = normalizeVietnameseBaseLetter(p.secretPhrase[pick]);
            cur.lastActionMessage = `Quản trò mở nhanh vị trí #${pick + 1} (${baseChar})`;
            if (isPuzzleFullyRevealed(p.secretPhrase, p.revealedIndices)) {
              cur.mustSolveWithTones = true;
              cur.lastActionMessage = `Toàn bộ chữ cái gốc đã lộ diện! Người chơi vẫn phải bấm GIẢI Ô CHỮ đúng từng dấu thanh!`;
            }
          }
          const nextRoom = { ...prev, magicWheelState: cur };
          roomStateRef.current = nextRoom;
          syncToIframes({ roomState: nextRoom });
          return nextRoom;
        });
      } else if (e.data?.type === "MAGIC_WHEEL_REVEAL_ALL") {
        setRoomState((prev) => {
          if (!prev || !prev.magicWheelState?.currentPuzzle) return prev;
          const cur = { ...prev.magicWheelState };
          const p = { ...prev.magicWheelState.currentPuzzle };
          cur.currentPuzzle = p;
          p.revealedIndices = Array.from({ length: p.secretPhrase.length }, (_, i) => i);
          soundManager.playMagicWheelSolveWin();
          cur.mustSolveWithTones = false;
          cur.phase = "ROUND_RECAP";
          cur.lastActionMessage = `Quản trò đã lật mở toàn bộ ô chữ có dấu: "${p.secretPhrase}"!`;
          const nextRoom = { ...prev, magicWheelState: cur };
          roomStateRef.current = nextRoom;
          syncToIframes({ roomState: nextRoom });
          return nextRoom;
        });
      } else if (e.data?.type === "MAGIC_WHEEL_ADVANCE_ROUND") {
        setRoomState((prev) => {
          if (!prev || !prev.magicWheelState) return prev;
          const cur = { ...prev.magicWheelState };
          const totalMain = cur.totalMainRounds || Math.max(3, prev.teams.length);

          // 1. Từ TOSS_UP_1 -> TOSS_UP_2
          if (cur.roundStage === "TOSS_UP_1") {
            cur.roundStage = "TOSS_UP_2";
            cur.currentPuzzle = { ...(cur.puzzles[1] || cur.puzzles[0]), revealedIndices: [] };
            cur.guessedLetters = [];
            cur.roundScores = {};
            cur.mustSolveWithTones = false;
            cur.tossUpRevealOrder = [];
            cur.tossUpBuzzedTeamId = undefined;
            cur.tossUpBuzzedTeamName = undefined;
            cur.phase = "TOSS_UP_READY";
            cur.lastActionMessage = `⚡ VÒNG ĐOÁN NHANH 2 (+1.000đ & Quyền đi đầu Vòng Chính 1): Mời MC bấm Bắt đầu mở chữ!`;
          }
          // 2. Từ TOSS_UP_2 -> Vòng Chính 1
          else if (cur.roundStage === "TOSS_UP_2") {
            cur.roundStage = "MAIN_ROUND";
            cur.currentRound = 1;
            cur.sectors = generateMagicWheelSectors(1);
            cur.currentPuzzle = { ...(cur.puzzles[2] || cur.puzzles[0]), revealedIndices: [] };
            const starterId = cur.mainRound1StarterTeamId || prev.teams[0]?.id || "";
            const starterTeam = prev.teams.find((t) => t.id === starterId) || prev.teams[0];
            cur.currentTurnTeamId = starterTeam?.id || "";
            cur.currentTurnTeamName = starterTeam?.name || "";
            cur.guessedLetters = [];
            cur.wrongGuessesCount = {};
            cur.consecutiveWrongGuesses = {};
            cur.roundScores = {};
            cur.disqualifiedTeamIdsInRound = [];
            cur.mustSolveWithTones = false;
            cur.expressTrainActive = false;
            cur.speedUpBellActive = false;
            cur.phase = "SPIN_WAITING";
            cur.selectedSector = undefined;
            cur.lastActionMessage = `🎡 BẮT ĐẦU VÒNG CHÍNH 1! Đội ${cur.currentTurnTeamName} (Thắng Đoán Nhanh 2) được quyền mở màn!`;
          }
          // 3. Từ Vòng Chính k -> Vòng Chính k+1 hoặc Vòng Đặc Biệt
          else if (cur.roundStage === "MAIN_ROUND" && cur.currentRound < totalMain) {
            cur.currentRound++;
            cur.sectors = generateMagicWheelSectors(cur.currentRound);
            const puzzleIdx = Math.min(cur.puzzles.length - 2, cur.currentRound + 1);
            cur.currentPuzzle = { ...(cur.puzzles[puzzleIdx] || cur.puzzles[0]), revealedIndices: [] };
            // Xoay vòng người chơi mở màn kế tiếp người đã mở màn Vòng 1
            const r1StarterIdx = Math.max(
              0,
              prev.teams.findIndex((t) => t.id === cur.mainRound1StarterTeamId)
            );
            const nextStarterTeam =
              prev.teams[(r1StarterIdx + (cur.currentRound - 1)) % Math.max(1, prev.teams.length)];
            cur.currentTurnTeamId = nextStarterTeam?.id || prev.teams[0]?.id || "";
            cur.currentTurnTeamName = nextStarterTeam?.name || prev.teams[0]?.name || "";
            cur.guessedLetters = [];
            cur.wrongGuessesCount = {};
            cur.consecutiveWrongGuesses = {};
            cur.roundScores = {};
            cur.disqualifiedTeamIdsInRound = [];
            cur.round3TradedTeams = [];
            cur.round3ForbiddenSolveTeams = [];
            cur.mustSolveWithTones = false;
            cur.expressTrainActive = false;
            cur.speedUpBellActive = cur.currentRound >= 6;
            cur.pendingSpecialAction = "NONE";
            cur.phase = "SPIN_WAITING";
            cur.selectedSector = undefined;
            cur.lastActionMessage = `🎡 BẮT ĐẦU VÒNG CHÍNH ${cur.currentRound}! Theo thứ tự xoay vòng, mời Đội ${cur.currentTurnTeamName} mở màn!`;
          }
          // 4. Sang Vòng Đặc Biệt (SPECIAL_FINAL)
          else {
            cur.roundStage = "SPECIAL_FINAL";
            cur.sectors = generateSpecialRoundWheelSectors();
            const finalPuzzle = cur.puzzles[cur.puzzles.length - 1] || cur.puzzles[0];
            cur.currentPuzzle = { ...finalPuzzle, revealedIndices: [] };
            const topTeam = [...prev.teams].sort((a, b) => (b.score || 0) - (a.score || 0))[0] || prev.teams[0];
            cur.currentTurnTeamId = topTeam?.id || "";
            cur.currentTurnTeamName = topTeam?.name || "";
            cur.guessedLetters = [];
            cur.wrongGuessesCount = {};
            cur.consecutiveWrongGuesses = {};
            cur.roundScores = {};
            cur.mustSolveWithTones = false;
            cur.specialFinalChoiceOrder = undefined;
            cur.specialEnvelopePrize = undefined;
            cur.specialSelectedLetters = [];
            cur.specialAllowedLetterCount = calculateSpecialRoundAllowedLetters(
              finalPuzzle.secretPhrase
            );
            cur.phase = "SPECIAL_CHOOSE_ORDER";
            cur.lastActionMessage = `👑 VÒNG ĐẶC BIỆT! Chúc mừng Đội ${cur.currentTurnTeamName} (Điểm cao nhất: ${(topTeam?.score || 0).toLocaleString()}đ) bước vào Vòng Đặc Biệt! Hãy chọn QUAY PHẦN THƯỞNG TRƯỚC hoặc GIẢI Ô CHỮ TRƯỚC!`;
          }

          const nextRoom = { ...prev, magicWheelState: cur };
          roomStateRef.current = nextRoom;
          syncToIframes({ roomState: nextRoom });
          return nextRoom;
        });
      } else if (e.data?.type === "TOURNAMENT_PREDICT") {
        const { matchId, predictedWinnerId, teamId } = e.data;
        setRoomState((prev) => {
          if (!prev || !prev.tournamentState) return prev;
          const matches = prev.tournamentState.matches.map((m) => {
            if (m.id === matchId) {
              const predictions = { ...(m.predictions || {}), [teamId]: predictedWinnerId };
              return { ...m, predictions };
            }
            return m;
          });
          const nextTournament = { ...prev.tournamentState, matches };
          syncToIframes({ tournamentState: nextTournament });
          return { ...prev, tournamentState: nextTournament };
        });
        const predTeamName = stableTeams.find((t) => t.id === teamId)?.name || teamId || "Đội";
        addLog(`🔮 Đội [${predTeamName}] đã DỰ ĐOÁN đội thắng cho trận [${matchId}]!`);
      } else if (e.data?.type === "TOURNAMENT_CHEER") {
        const { matchId, targetTeamId: cheerTeamId, emoji } = e.data;
        setRoomState((prev) => {
          if (!prev || !prev.tournamentState) return prev;
          const match = prev.tournamentState.matches.find((m) => m.id === matchId);
          if (!match) return prev;
          const currentCheers = match.cheers || { countA: 0, countB: 0 };
          const countA = cheerTeamId === match.team1Id ? currentCheers.countA + 1 : currentCheers.countA;
          const countB = cheerTeamId === match.team2Id ? currentCheers.countB + 1 : currentCheers.countB;
          const total = countA + countB;
          const percentA = total > 0 ? Math.round((countA / total) * 100) : 50;
          const percentB = 100 - percentA;
          const cheers = { countA, countB };
          const matches = prev.tournamentState.matches.map((m) => m.id === matchId ? { ...m, cheers } : m);
          const nextTour = { ...prev.tournamentState, matches, cheers };
          syncToIframes({
            tournamentState: nextTour,
            liveCheer: { matchId, targetTeamId: cheerTeamId, emoji, countA, countB, percentA, percentB },
          });
          return { ...prev, tournamentState: nextTour };
        });
      }
    };

    window.addEventListener("message", handlePlayerAction);
    return () => window.removeEventListener("message", handlePlayerAction);
  }, [isOfflineSandbox, currentQuestion, addLog, syncToIframes, activeTeamIndex, roomState?.teams, roomState?.config.answerSubmissionMode, selectedMode, processOfflineWager]);

  // ── Helper lấy vị trí Logo 2D ở góc trên bên trái của thẻ Mode ────────────
  const getModeIconRect = (targetMode: GameMode) => {
    if (typeof document !== "undefined") {
      const el = document.getElementById(`mode-card-icon-${targetMode}`);
      if (el) {
        const r = el.getBoundingClientRect();
        return { top: r.top, left: r.left, width: r.width, height: r.height };
      }
    }
    return null;
  };

  // ── 1-Click Launch with 3D Hologram Transition (110% Screen Wipe) ──────────
  const handleLaunchOffline = useCallback(() => {
    const meta = AVAILABLE_MODES.find((m) => m.mode === selectedMode) || AVAILABLE_MODES[0];
    setLaunchingMeta(meta);
    setLaunchSourceRect(getModeIconRect(selectedMode));
    setIsLaunchingAnim(true);
    setIsLaunchReady(false);
    // Cho phép video transition 3D khởi chạy mượt mà ngay frame đầu tiên không bị giật lag
    setTimeout(() => {
      startOfflineSandbox(selectedMode, selectedBankId);
      setIsLaunchReady(true);
    }, 120);
  }, [selectedMode, selectedBankId, startOfflineSandbox]);

  const handleLaunchSandbox = async (targetMode?: GameMode) => {
    const modeToUse = targetMode || selectedMode;
    const meta = AVAILABLE_MODES.find((m) => m.mode === modeToUse) || AVAILABLE_MODES[0];
    setLaunchingMeta(meta);
    setLaunchSourceRect(getModeIconRect(modeToUse));
    setIsLaunchingAnim(true);
    setIsLaunchReady(false);
    setCreating(true);

    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setTimeout(() => {
        startOfflineSandbox(modeToUse, selectedBankId);
        setIsLaunchReady(true);
        setCreating(false);
      }, 120);
      return;
    }

    try {
      const token =
        typeof window !== "undefined"
          ? localStorage.getItem("admin_token") || sessionStorage.getItem("admin_token")
          : null;
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch("/api/sandbox/create", {
        method: "POST",
        headers,
        body: JSON.stringify({
          mode: modeToUse,
          quizBankId: selectedBankId,
          teams: sandboxCustomTeams,
        }),
      });
      const data = await res.json();
      if (data.success && data.code) {
        if (data.hostKey) {
          localStorage.setItem(`host_key_${data.code}`, data.hostKey);
        }
        // Nạp ngầm bàn đấu NGAY LẬP TỨC vào DOM (đang được che kín bởi transition loading)
        setCurrentQuestion(null);
        setRevealPayload(null);
        setTimer(null);
        setMatchStarting(null);
        setQuestionPrepare(null);
        setIntermission(null);
        setAdminQuestionData(null);
        adminQuestionDataRef.current = null;
        setCode(data.code);
        setIsOfflineSandbox(false);
        saveSandboxSession(data.code, false, data.mode || modeToUse, selectedBankId, data.hostKey, data.name);
        connectAdminSocket(data.code);
        addLog(`⚡ Đã khởi tạo Sandbox Online: Phòng ${data.code} (${data.mode}) - Bộ đề: ${data.quizBankTitle || "Trực tuyến"}`);

        // Chờ 150ms để React hoàn tất mount bàn đấu ngầm, sau đó kích hoạt pha quét logo 110vh & vén màn
        setTimeout(() => {
          setIsLaunchReady(true);
        }, 150);
      } else {
        setIsLaunchingAnim(false);
        setIsLaunchReady(false);
        const errorMsg = data?.error || "Không thể tạo phòng Sandbox trên máy chủ";
        addLog(`❌ Không thể tạo phòng online: ${errorMsg}`);
        const wantOffline = window.confirm(`Không thể tạo phòng Sandbox Online trên máy chủ:\n\n"${errorMsg}"\n\nBạn có muốn chuyển sang chế độ Sandbox Offline (mô phỏng trên trình duyệt) không?`);
        if (wantOffline) {
          handleLaunchOffline();
        }
      }
    } catch (err: any) {
      setIsLaunchingAnim(false);
      setIsLaunchReady(false);
      const errorMsg = err?.message || "Lỗi kết nối mạng";
      addLog(`❌ Lỗi kết nối mạng: ${errorMsg}`);
      const wantOffline = window.confirm(`Lỗi kết nối mạng khi tạo Sandbox Online:\n\n"${errorMsg}"\n\nBạn có muốn chuyển sang chế độ Sandbox Offline (mô phỏng trên trình duyệt) không?`);
      if (wantOffline) {
        handleLaunchOffline();
      }
    } finally {
      setCreating(false);
    }
  };

  const handleConnectExisting = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputCode.trim().length === 6) {
      const clean = inputCode.trim();
      setCurrentQuestion(null);
      setRevealPayload(null);
      setTimer(null);
      setMatchStarting(null);
      setQuestionPrepare(null);
      setIntermission(null);
      setAdminQuestionData(null);
      adminQuestionDataRef.current = null;
      prevScoresRef.current.clear();
      prevPlayerScoresRef.current.clear();
      setCode(clean);
      setIsOfflineSandbox(false);
      saveSandboxSession(clean, false, selectedMode);
      connectAdminSocket(clean);
    }
  };

  const handleExitSandboxRoom = useCallback(() => {
    prevScoresRef.current.clear();
    prevPlayerScoresRef.current.clear();
    if (adminSocketRef.current) {
      adminSocketRef.current.disconnect();
      adminSocketRef.current = null;
    }
    botSocketsRef.current.forEach((s) => s.disconnect());
    botSocketsRef.current.clear();
    clearSandboxSession();
    setCode("");
    setRoomState(null);
    setCurrentQuestion(null);
    setRevealPayload(null);
    setTimer(null);
    setMatchStarting(null);
    setQuestionPrepare(null);
    setIntermission(null);
    setAdminQuestionData(null);
    adminQuestionDataRef.current = null;
    setIsOfflineSandbox(false);
    syncLocalSandboxRoomsState();
  }, [clearSandboxSession, syncLocalSandboxRoomsState]);

  const handleDeleteSandboxRoom = useCallback(
    async (targetCode?: string, skipConfirm?: boolean) => {
      const codeToDelete = (targetCode || code || "").trim();
      if (!codeToDelete) return;
      if (!skipConfirm && !window.confirm(`Xóa hoàn toàn phòng Sandbox "${codeToDelete}" khỏi máy và máy chủ?`)) {
        return;
      }

      if (codeToDelete !== "OFFLINE" && !codeToDelete.startsWith("OFFLINE")) {
        try {
          const token =
            typeof window !== "undefined"
              ? localStorage.getItem("admin_token") || sessionStorage.getItem("admin_token")
              : null;
          const hostKey =
            typeof window !== "undefined" ? localStorage.getItem(`host_key_${codeToDelete}`) : null;
          const headers: Record<string, string> = {};
          if (token) headers["Authorization"] = `Bearer ${token}`;
          if (hostKey) headers["x-host-key"] = hostKey;
          await fetch(`/api/rooms/${codeToDelete}`, { method: "DELETE", headers });
        } catch {}
      }

      removeSandboxRoomFromLocal(codeToDelete);
      if (codeToDelete === code) {
        handleExitSandboxRoom();
      } else {
        syncLocalSandboxRoomsState();
      }
      addLog(`🗑️ Đã xóa phòng Sandbox: ${codeToDelete}`);
    },
    [code, removeSandboxRoomFromLocal, handleExitSandboxRoom, syncLocalSandboxRoomsState, addLog]
  );

  const handleDeleteAllLocalSandboxRooms = useCallback(async () => {
    if (localSandboxRooms.length === 0) return;
    if (!window.confirm(`Xóa toàn bộ ${localSandboxRooms.length} phòng Sandbox đã lưu trên máy (và trên máy chủ)?`)) {
      return;
    }
    for (const r of localSandboxRooms) {
      await handleDeleteSandboxRoom(r.code, true);
    }
    try {
      localStorage.removeItem("sandbox_local_rooms");
      setLocalSandboxRooms([]);
    } catch {}
  }, [localSandboxRooms, handleDeleteSandboxRoom]);

  // ── Host Actions ──────────────────────────────────────────────────────────
  const replenishOfflineTeamPowerups = () => {
    setRoomState((prev) => {
      if (!prev) return prev;
      const config = prev.config || {};
      if (config.powerupEnabled === false) return prev;

      const currentModeAllowed =
        (config.allowedPowerups as CardType[]) ||
        getDefaultAllowedPowerupsForMode((prev.mode || "CLASSIC") as GameMode);
      if (!currentModeAllowed || currentModeAllowed.length === 0) return prev;

      const maxHand = config.maxHandSize || 3;
      const sharedQuota = config.sharedPowerupTeamQuota ?? (prev.teams.length <= 3 ? 1 : 2);
      const sharedProbability = config.sharedPowerupProbability ?? DEFAULT_SHARED_POWERUP_PROBABILITY;

      const sharedAllowed = currentModeAllowed.filter((t) => isSharedPowerup(t));
      const privateAllowed = currentModeAllowed.filter((t) => !isSharedPowerup(t));
      const safePrivatePool = privateAllowed.length > 0 ? privateAllowed : currentModeAllowed;

      let currentSharedTeamCount = prev.teams.filter((t) =>
        !t.isEliminated && (t.cards || []).some((c: any) => !c.used && isSharedPowerup(c.type as CardType))
      ).length;

      let anyReplenished = false;
      const updatedTeams = prev.teams.map((t) => {
        if (t.isEliminated) return t;
        const activeUnused = (t.cards || []).filter((c: any) => !c.used).length;
        if (activeUnused >= maxHand) return t;

        const hasShared = (t.cards || []).some((c: any) => !c.used && isSharedPowerup(c.type as CardType));
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

        const newCard = {
          id: `card_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          type: cardTypeToGive,
          ownerType: "TEAM" as const,
          teamId: t.id,
          used: false,
        };
        anyReplenished = true;
        return {
          ...t,
          cards: [...(t.cards || []), newCard],
        };
      });

      if (!anyReplenished) return prev;

      const nextState = { ...prev, teams: updatedTeams };
      roomStateRef.current = nextState;
      syncToIframes({ roomState: nextState });
      addLog(`🎁 [Hồi thẻ hiệp]: Đã hồi +1 thẻ cho các đội còn dưới ${maxHand} thẻ!`);
      return nextState;
    });
  };

  const launchOfflineQuestion = (nextIdx: number) => {
    if (offlineIntermissionTimerRef.current) {
      clearTimeout(offlineIntermissionTimerRef.current);
      offlineIntermissionTimerRef.current = null;
    }
    setIntermission(null);
    if (offlineTimerRef.current) {
      clearInterval(offlineTimerRef.current);
      offlineTimerRef.current = null;
    }
    offlineAnswersRef.current.clear();
    offlineFinalizedActorsRef.current.clear();
    setTeamSelectedAnswers({});
    offlineSharedPowerupUsedThisQuestionRef.current = false;

    // Multi-round replenish: Replenish +1 card for each team with < 3 cards every 3 questions
    if (nextIdx > 0 && nextIdx % 3 === 0) {
      replenishOfflineTeamPowerups();
    }

    const questions = offlineQuestionsRef.current;
    offlineQIndexRef.current = nextIdx;
    const q = questions[nextIdx] || DEFAULT_OFFLINE_BANK.questions![0];

    const normPoints = normalizeToThreeLevels(q.points || 10);
    const timeLimit = quantizeOlympiaTimeLimit(normPoints, q.timeLimit);
    const endsAt = Date.now() + timeLimit * 1000;
    const autoTimer = roomState?.config.autoTimerStart === true;
    const offlineQId = q.id || `q_${nextIdx + 1}`;
    offlineUsedQuestionIdsRef.current.add(offlineQId);

    adminQuestionDataRef.current = {
      questionId: offlineQId,
      options: q.options || [],
      answer: q.answer,
      type: q.type,
      explanation: q.hint,
    };
    setAdminQuestionData(adminQuestionDataRef.current);

    const activeOfflineMatch =
      selectedMode === "TOURNAMENT"
        ? roomState?.tournamentState?.matches.find(
            (m) => m.id === roomState?.tournamentState?.currentMatchId || m.status === "IN_PROGRESS"
          ) || roomState?.tournamentState?.matches[0]
        : undefined;

    const qState: QuestionState = {
      question: {
        id: offlineQId,
        type: q.type || "MC_SINGLE",
        content: q.content,
        options: q.options?.map((o: any) => ({ id: o.id, text: o.text, isCorrect: o.isCorrect })),
        points: normPoints,
        timeLimit,
        hint: q.hint,
        order: (selectedMode === "MYSTERY_QUEST" && roomState?.mysteryQuestState ? roomState.mysteryQuestState.currentTurnIndex : nextIdx) + 1,
      },
      timeLimit,
      startedAt: Date.now(),
      endsAt: (selectedMode === "BOUNCEBACK" || !autoTimer) ? undefined : endsAt,
      serverTime: Date.now(),
      activeBoosts: [],
      hasSharedPowerupUsed: false,
      timerPending: selectedMode === "BOUNCEBACK" || !autoTimer,
      timerStarted: selectedMode !== "BOUNCEBACK" && autoTimer,
      buzzUnlocked: selectedMode === "BUZZ" ? false : true,
      buzzUnlockMode: "MANUAL",
      bouncebackSelectPhase: selectedMode === "BOUNCEBACK",
      answerSubmissionMode: roomState?.config.answerSubmissionMode || "ALLOW_CHANGE",
      totalParticipantsCount: roomState?.teams.length || 4,
      primaryTeamId:
        selectedMode === "BOUNCEBACK"
          ? roomState?.teams[nextIdx % (roomState?.teams.length || 4)]?.id
          : selectedMode === "MYSTERY_QUEST"
          ? (roomState?.mysteryQuestState?.currentTurnTeamId || roomState?.teams[nextIdx % (roomState?.teams.length || 4)]?.id)
          : selectedMode === "GRID_CARO"
          ? (roomState?.gridCaroState?.currentTurnTeamId || roomState?.teams[nextIdx % (roomState?.teams.length || 4)]?.id)
          : selectedMode === "DICE_RACE"
          ? (roomState?.diceRaceState?.currentTurnTeamId || roomState?.teams[nextIdx % (roomState?.teams.length || 4)]?.id)
          : selectedMode === "TOURNAMENT"
          ? (activeOfflineMatch?.team1Id || roomState?.teams[0]?.id)
          : undefined,
      primaryTeamName:
        selectedMode === "BOUNCEBACK"
          ? roomState?.teams[nextIdx % (roomState?.teams.length || 4)]?.name
          : selectedMode === "MYSTERY_QUEST"
          ? (roomState?.mysteryQuestState?.currentTurnTeamName || roomState?.teams[nextIdx % (roomState?.teams.length || 4)]?.name)
          : selectedMode === "GRID_CARO"
          ? (roomState?.gridCaroState?.currentTurnTeamName || roomState?.teams[nextIdx % (roomState?.teams.length || 4)]?.name)
          : selectedMode === "DICE_RACE"
          ? (roomState?.diceRaceState?.currentTurnTeamName || roomState?.teams[nextIdx % (roomState?.teams.length || 4)]?.name)
          : selectedMode === "TOURNAMENT"
          ? `${activeOfflineMatch?.team1Name || roomState?.teams[0]?.name || "Đội 1"} vs ${activeOfflineMatch?.team2Name || roomState?.teams[1]?.name || "Đội 2"}`
          : undefined,
      tournamentTeam1Id: selectedMode === "TOURNAMENT" ? (activeOfflineMatch?.team1Id || roomState?.teams[0]?.id) : undefined,
      tournamentTeam2Id: selectedMode === "TOURNAMENT" ? (activeOfflineMatch?.team2Id || roomState?.teams[1]?.id) : undefined,
      isGoldQuestion: selectedMode === "CLASSIC" && questions.length >= 7 && (
        normPoints === 30 || nextIdx >= Math.floor(questions.length * 0.7)
      ),
    };

    setRoomState((prev) => {
      if (!prev) return prev;
      const nextDice = prev.diceRaceState
        ? { ...prev.diceRaceState, canRollDice: false }
        : undefined;
      let nextMystery = prev.mysteryQuestState;
      if (nextMystery) {
        nextMystery = {
          ...nextMystery,
          phase: "QUESTION_ACTIVE" as const,
          baseQuestionPoints: normPoints,
          cardsFlippedCount: 0,
          potPoints: 0,
          potMultiplier: 1,
          bombExploded: undefined,
          turnFinishedReason: undefined,
          storyResult: undefined,
          lastFlippedTile: undefined,
          decisionMade: undefined,
          pendingSteal: undefined,
          isPenaltySurvivalMode: false,
          survivalDilemmaPending: false,
          memoryPairsState: getInitialMemoryPairsState(nextMystery.promoPerk),
        };
        nextMystery = synchronizeMysteryStageWithQuestionPoints({
          state: nextMystery,
          questionPoints: normPoints,
          theme: nextMystery.theme,
          teams: prev.teams,
        });
      }
      return {
        ...prev,
        status: "PLAYING",
        currentQuestionIndex: selectedMode === "MYSTERY_QUEST" && prev.mysteryQuestState ? prev.mysteryQuestState.currentTurnIndex : nextIdx,
        diceRaceState: nextDice,
        mysteryQuestState: nextMystery,
      };
    });

    if (selectedMode === "BOUNCEBACK") {
      setCurrentQuestion(qState);
      setRevealPayload(null);
      setTimer(null);
      offlineRemainingRef.current = 0;
      if (offlineTimerRef.current) {
        clearInterval(offlineTimerRef.current);
        offlineTimerRef.current = null;
      }
      syncToIframes({
        currentQuestion: qState,
        timer: null,
        sharedPowerupLocked: false,
        sharedPowerupLockedTeamName: undefined,
      });
      addLog(`🎯 Đội [${qState.primaryTeamName || "Chính"}] đang chọn gói điểm (10/20/30đ)...`);
    } else if (selectedMode === "WAGER") {
      const prevWagerTeamId = roomState?.wagerState?.lastWagerTeamId;
      const initialWagers: Record<string, TeamWager> = {};
      (roomState?.teams || []).forEach((t) => {
        initialWagers[t.id] = { teamId: t.id, teamName: t.name, amount: 10, submitted: false };
      });
      const teamsCount = Math.max(1, (roomState?.teams || []).length);
      const wagerRounds = roomState?.config?.wagerRoundsPerTeam || 2;
      const currentRoundIdx = Math.floor(nextIdx / teamsCount);
      const wagerMultCap = Math.max(1.0, Math.min(3.0, Number(roomState?.config?.wagerMultiplierCap) || 2.5));
      const basePts = q.points || 10;
      const calculatedMaxBetCap = Math.floor(basePts * wagerMultCap);
      const currentBankTitle = quizBanks.find((b) => b.id === selectedBankId)?.title || "";
      const bloomLevel = getBloomLevelFromPoints(basePts);
      const configuredWagerDuration = roomState?.config?.wagerTimeSeconds || 15;
      const newWagerState: WagerState = {
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
        allowanceMinScore: 50,
        initialPoints: 50,
        topicPreview: getBroadTopic({
          topic: (q as any).topic,
          content: q.content,
          bankTitle: currentBankTitle,
        }),
        difficultyPreview: bloomLevel,
        teamWagers: initialWagers,
        teamBailouts: roomState?.wagerState?.teamBailouts || {},
        bailoutQueue: roomState?.wagerState?.bailoutQueue || [],
        currentQuestionBailoutUsed: false,
        maxBetCap: calculatedMaxBetCap,
        wagerMultiplierCap: wagerMultCap,
        baseQuestionPoints: basePts,
        roundIndex: currentRoundIdx,
        totalRounds: wagerRounds,
      };
      setRoomState((prev) => prev ? { ...prev, wagerState: newWagerState } : prev);
      setCurrentQuestion(null);
      setRevealPayload(null);
      setTimer({ remaining: 5, total: 5, endsAt: Date.now() + 5000 });
      syncToIframes({
        currentQuestion: null,
        roomState: { ...(roomState || {}), wagerState: newWagerState },
        timer: { remaining: 5, total: 5 },
        intermission: null,
      });
      addLog(`💰 Phiên cược câu #${nextIdx + 1} (Vòng ${currentRoundIdx + 1}/${wagerRounds}, trần ${calculatedMaxBetCap}đ) bắt đầu! 5s mở màn...`);

      let initRem = 5;
      if (offlineTimerRef.current) {
        clearInterval(offlineTimerRef.current);
        offlineTimerRef.current = null;
      }
      offlineTimerRef.current = setInterval(() => {
        initRem -= 1;
        if (initRem > 0) {
          const updatedState: WagerState = { ...newWagerState, wagerTimeRemaining: initRem };
          setRoomState((prev) => prev ? { ...prev, wagerState: updatedState } : prev);
          setTimer({ remaining: initRem, total: 5 });
          syncToIframes({
            roomState: { ...(roomState || {}), wagerState: updatedState },
            timer: { remaining: initRem, total: 5 },
          });
        } else {
          if (offlineTimerRef.current) {
            clearInterval(offlineTimerRef.current);
            offlineTimerRef.current = null;
          }
          const currentTeams = roomStateRef.current?.teams || [];
          const activeTeams = currentTeams.filter((t) => !t.isEliminated);
          const eligibleTeams = prevWagerTeamId && activeTeams.filter((t) => t.id !== prevWagerTeamId).length > 0
            ? activeTeams.filter((t) => t.id !== prevWagerTeamId)
            : activeTeams;

          // Round-robin opening assignment: câu 1 đội 1, câu 2 đội 2, câu 3 đội 3...
          const roundRobinIndex = nextIdx % eligibleTeams.length;
          const pickedTeam = eligibleTeams[roundRobinIndex] || activeTeams[0];
          const assignedWager = 10;
          if (pickedTeam) {
            newWagerState.currentHighestWager = assignedWager;
            newWagerState.lastWagerTeamId = pickedTeam.id;
            newWagerState.autoAssignedTeamId = pickedTeam.id;
            newWagerState.autoAssignedTeamName = pickedTeam.name;
            newWagerState.wagerHistory = [{
              order: 1,
              teamId: pickedTeam.id,
              teamName: pickedTeam.name,
              teamColor: pickedTeam.color,
              amount: assignedWager,
              timestamp: Date.now(),
            }];
            newWagerState.teamWagers[pickedTeam.id] = {
              teamId: pickedTeam.id,
              teamName: pickedTeam.name,
              amount: assignedWager,
              submitted: true,
              order: 1,
            };
            addLog(`🤖 Hệ thống chọn [${pickedTeam.name}] mở cược: ${assignedWager}đ`);
          }

          const nextMin = assignedWager + 5;
          const canAnyBet = checkOfflineCanAnyTeamBet(currentTeams, newWagerState, nextMin);
          if (!canAnyBet) {
            newWagerState.phase = "QUESTION_PERIOD";
            newWagerState.questionReady = false;
            newWagerState.wagerTimeRemaining = 0;

            setRoomState((prev) => prev ? { ...prev, wagerState: { ...newWagerState } } : prev);
            setTimer(null);
            syncToIframes({
              roomState: { ...(roomState || {}), wagerState: { ...newWagerState } },
              timer: null,
            });
            addLog(`👑 Đã chốt cược: [${pickedTeam?.name || "Đội cược"}] (${assignedWager}đ) do không còn đội nào đủ điều kiện nâng cược! Tự động mở câu hỏi sau 2.5s...`);
            setTimeout(() => {
              handleWagerLaunchQuestionRef.current();
            }, 2500);
            return;
          }

          let mainRem = configuredWagerDuration;
          newWagerState.wagerSubPhase = "MAIN_15S";
          newWagerState.wagerTimeRemaining = mainRem;
          newWagerState.wagerTimeTotal = configuredWagerDuration;

          setRoomState((prev) => prev ? { ...prev, wagerState: { ...newWagerState } } : prev);
          setTimer({ remaining: mainRem, total: configuredWagerDuration, endsAt: Date.now() + mainRem * 1000 });
          syncToIframes({
            roomState: { ...(roomState || {}), wagerState: { ...newWagerState } },
            timer: { remaining: mainRem, total: configuredWagerDuration, endsAt: Date.now() + mainRem * 1000 },
          });
          addLog(`💰 Bắt đầu ${configuredWagerDuration}s để các đội bí mật chốt cược!`);

          offlineTimerRef.current = setInterval(() => {
            mainRem -= 1;
            if (mainRem > 0) {
              const uState: WagerState = { ...newWagerState, wagerTimeRemaining: mainRem };
              setRoomState((prev) => prev ? { ...prev, wagerState: uState } : prev);
              setTimer({ remaining: mainRem, total: configuredWagerDuration });
              syncToIframes({
                roomState: { ...(roomState || {}), wagerState: uState },
                timer: { remaining: mainRem, total: configuredWagerDuration },
              });
            } else {
              if (offlineTimerRef.current) {
                clearInterval(offlineTimerRef.current);
                offlineTimerRef.current = null;
              }
              newWagerState.phase = "QUESTION_PERIOD";
              newWagerState.questionReady = false;
              newWagerState.wagerTimeRemaining = 0;

              setRoomState((prev) => prev ? { ...prev, wagerState: { ...newWagerState } } : prev);
              setTimer(null);
              syncToIframes({
                roomState: { ...(roomState || {}), wagerState: { ...newWagerState } },
                timer: null,
              });
              addLog(`⌛ Đã hết ${configuredWagerDuration}s cược! Tự động chốt cược và mở câu hỏi trong 2.5s...`);
              setTimeout(() => {
                handleWagerLaunchQuestionRef.current();
              }, 2500);
            }
          }, 1000);
        }
      }, 1000);
    } else {
      if (offlinePrepIntervalRef.current) {
        clearInterval(offlinePrepIntervalRef.current);
        offlinePrepIntervalRef.current = null;
      }
      setIntermission(null);
      setQuestionPrepare(null);
      setCurrentQuestion(qState);
      setRevealPayload(null);

      if (autoTimer) {
        setTimer({ remaining: timeLimit, total: timeLimit, endsAt });
        offlineRemainingRef.current = timeLimit;
        syncToIframes({
          matchStarting: null,
          intermission: null,
          questionPrepare: null,
          currentQuestion: qState,
          timer: { remaining: timeLimit, total: timeLimit, endsAt },
          sharedPowerupLocked: false,
          sharedPowerupLockedTeamName: undefined,
        });

        // Mode BUZZ: Nếu cài đặt tự động đếm giờ, chờ 3s đọc đề rồi mới tự động mở chuông
        if (selectedMode === "BUZZ") {
          setTimeout(() => {
            setCurrentQuestion((prev) => (prev ? { ...prev, buzzUnlocked: true } : prev));
            syncToIframes({ currentQuestion: { ...qState, buzzUnlocked: true } });
            addLog("🔔 [Tự động] Hết 3s đọc đề — Chuông đã MỞ KHÓA cho tất cả các đội bấm!");
          }, 3000);
        }

        offlineTimerRef.current = setInterval(() => {
          const rawRem = Math.max(0, Math.ceil((endsAt - Date.now()) / 1000));
          const rem = Math.min(offlineRemainingRef.current, Math.min(timeLimit, rawRem));
          offlineRemainingRef.current = rem;
          setTimer({ remaining: rem, total: timeLimit, endsAt });
          if (rem <= 0) {
            if (offlineTimerRef.current) clearInterval(offlineTimerRef.current);
            offlineTimerRef.current = null;
            syncToIframes({ timer: { remaining: 0, total: timeLimit, endsAt: 0 } });
          }
        }, 500);
      } else {
        setTimer(null);
        syncToIframes({
          matchStarting: null,
          intermission: null,
          questionPrepare: null,
          currentQuestion: qState,
          timer: null,
          sharedPowerupLocked: false,
          sharedPowerupLockedTeamName: undefined,
        });
        addLog(`📖 Câu hỏi #${nextIdx + 1} đã mở ngay (Timer dừng cho MC đọc đề). Nhấn [Mở chuông] hoặc [Bắt đầu tính giờ] để mở chuông ngay lập tức không chờ!`);
      }
    }

    if (botAutoEnabled && selectedMode !== "BOUNCEBACK" && selectedMode !== "WAGER") {
      setTimeout(() => {
        handleTriggerAllBotsAnswer();
      }, 2200);
    }

    addLog(`Admin: Bắt đầu câu hỏi #${nextIdx + 1}: "${q.content.slice(0, 30)}..."`);
  };
  launchOfflineQuestionRef.current = launchOfflineQuestion;

  // ── Config Toggle Helper ──────────────────────────────────────────────────
  const updateConfig = useCallback(<K extends keyof NonNullable<RoomState["config"]>>(key: K, value: NonNullable<RoomState["config"]>[K]) => {
    setRoomState((prev) => {
      if (!prev) return prev;
      let nextWager = prev.wagerState;
      if (key === "wagerMultiplierCap" && nextWager) {
        const newMult = Number(value) || 2.5;
        const basePts = nextWager.baseQuestionPoints || 20;
        const newMaxBetCap = Math.floor(basePts * newMult);
        nextWager = {
          ...nextWager,
          wagerMultiplierCap: newMult,
          maxBetCap: newMaxBetCap,
        };
      }
      let derivedConfig: any = {};
      if (key === "matchMaxQuestions") {
        const maxQ = Number(value) || 0;
        derivedConfig = calculateModeDerivedConfig(prev.mode, maxQ, prev.teams.length);
        if (isOfflineSandbox) {
          const bank = (selectedBankId && offlineStorage.getLocalBankById(selectedBankId)) || DEFAULT_OFFLINE_BANK;
          const rawQ = (bank.questions || []).map((q: any) => ({
            ...q,
            points: normalizeToThreeLevels(q.points || 10),
          }));
          const alloc = allocateQuestionsForMatch({
            questions: rawQ,
            targetCount: maxQ > 0 ? maxQ : undefined,
            mode: prev.mode,
            teamsCount: prev.teams.length,
          });
          offlineQuestionsRef.current = alloc.allocatedQuestions;
        }
      }
      const effectiveValue = (key === "matchMaxQuestions" && derivedConfig.matchMaxQuestions !== undefined)
        ? derivedConfig.matchMaxQuestions
        : value;
      return {
        ...prev,
        config: { ...prev.config, ...derivedConfig, [key]: effectiveValue },
        wagerState: nextWager,
      };
    });
    addLog(`⚙️ Cài đặt [${String(key)}] = ${JSON.stringify(value)}`);

    if (!isOfflineSandbox) {
      adminSocketRef.current?.emit("admin:room:update_config", { key, value, code });
    } else {
      setTimeout(() => syncToIframes(), 50);
    }
  }, [addLog, isOfflineSandbox, syncToIframes, code]);

  const handleAdminNext = () => {
    if (isOfflineSandbox) {
      if (roomState?.status === "LOBBY") {
        offlineUsedQuestionIdsRef.current.clear();
        offlineAnswersRef.current.clear();
        let tourState: TournamentState | undefined = undefined;
        if (selectedMode === "TOURNAMENT") {
          const tourMatches = buildOfflineTournamentMatches(roomState?.teams || []);
          tourState = {
            matches: tourMatches,
            currentMatchId: tourMatches[0]?.id || "M1",
            questionsPerMatch: roomState?.config?.tournamentQuestionsPerMatch || 3,
          };
        }

        const warmupTotal = 5;
        const warmupEndsAt = Date.now() + warmupTotal * 1000 + 250;
        setMatchStarting({ seconds: warmupTotal, endsAt: warmupEndsAt, total: warmupTotal });
        syncToIframes({ matchStarting: { seconds: warmupTotal, endsAt: warmupEndsAt, total: warmupTotal } });
        addLog("🏁 Trận đấu bắt đầu! Đếm ngược chuẩn bị 5s...");

        const proceedAfterWarmup = () => {
          if (offlineWarmupIntervalRef.current) {
            clearInterval(offlineWarmupIntervalRef.current);
            offlineWarmupIntervalRef.current = null;
          }
          setMatchStarting(null);
          setRoomState((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              status: "PLAYING",
              tournamentState: tourState || prev.tournamentState,
            };
          });

          if (selectedMode === "DICE_RACE") {
            syncToIframes({
              matchStarting: null,
              roomState: {
                ...(roomState || {}),
                status: "PLAYING",
                tournamentState: tourState || roomState?.tournamentState,
              },
            });
            addLog("🏁 Cuộc đua cờ xí ngầu bắt đầu! Bàn cờ hiển thị toàn màn hình. Nhấn 'Hiện câu hỏi' khi sẵn sàng.");
            return;
          } else if (selectedMode === "GRID_CARO") {
            syncToIframes({
              matchStarting: null,
              roomState: {
                ...(roomState || {}),
                status: "PLAYING",
                tournamentState: tourState || roomState?.tournamentState,
              },
            });
            addLog("🏁 Bàn cờ Caro bắt đầu! Đội hiện tại chọn ô để mở câu hỏi.");
            return;
          } else if (selectedMode === "MAGIC_WHEEL") {
            const currentRState = roomStateRef.current || roomState;
            const updatedRoomState: RoomState = {
              ...(currentRState || {}),
              status: "PLAYING",
              magicWheelState: currentRState?.magicWheelState,
            };
            roomStateRef.current = updatedRoomState;
            setRoomState(updatedRoomState);
            setCurrentQuestion(null);
            setRevealPayload(null);
            setTimer(null);
            syncToIframes({
              matchStarting: null,
              roomState: updatedRoomState,
              magicWheelState: updatedRoomState.magicWheelState,
              currentQuestion: null,
              revealPayload: null,
              timer: null,
            });
            addLog("🎡 Chiếc Nón Kỳ Diệu bắt đầu! Vòng quay tri thức và ô chữ 4x14 sẵn sàng.");
            return;
          }

          const questions = offlineQuestionsRef.current;
          if (questions.length === 0) return;
          let nextIdx = -1;
          for (let i = 0; i < questions.length; i++) {
            const qId = questions[i].id || `q_${i + 1}`;
            if (!offlineUsedQuestionIdsRef.current.has(qId)) {
              nextIdx = i;
              offlineUsedQuestionIdsRef.current.add(qId);
              break;
            }
          }
          if (nextIdx !== -1) {
            launchOfflineQuestion(nextIdx);
          }
        };

        pendingOfflineLaunchRef.current = proceedAfterWarmup;
        return;
      }

      const questions = offlineQuestionsRef.current;
      if (questions.length === 0) return;

      const targetTotal = getTargetTotalQuestions(
        selectedMode,
        roomState?.config,
        roomState?.teams.length || 4,
        questions.length
      );

      // Dừng trận đấu khi đủ số câu hỏi quy định theo luật hoặc hết bộ đề
      if (offlineUsedQuestionIdsRef.current.size >= targetTotal || offlineUsedQuestionIdsRef.current.size >= questions.length) {
        setRoomState((prev) => prev ? { ...prev, status: "FINISHED" } : prev);
        setCurrentQuestion(null);
        setRevealPayload(null);
        setIntermission(null);
        addLog(`🏁 Đã hoàn thành đủ ${targetTotal} câu hỏi theo luật thi đấu! Trận đấu kết thúc và công bố bảng xếp hạng.`);
        syncToIframes({ roomState: { ...(roomState || {}), status: "FINISHED" }, currentQuestion: null, intermission: null });
        return;
      }

      // Nếu đang ở màn hình Bảng xếp hạng giữa hiệp (Intermission): Bắt đầu câu hỏi tiếp theo ngay lập tức!
      if (intermission) {
        if (offlineIntermissionTimerRef.current) {
          clearTimeout(offlineIntermissionTimerRef.current);
          offlineIntermissionTimerRef.current = null;
        }
        const nextIdx = intermission.nextQuestionIndex;
        const qId = questions[nextIdx]?.id || `q_${nextIdx + 1}`;
        offlineUsedQuestionIdsRef.current.add(qId);
        setIntermission(null);
        launchOfflineQuestion(nextIdx);
        return;
      }

      // Chế độ bàn cờ/theo lượt (MYSTERY_QUEST, GRID_CARO, DICE_RACE): Chuyển lượt/về bàn cờ ngay lập tức 0ms, không treo đếm ngược 3s
      if (selectedMode === "GRID_CARO") {
        setCurrentQuestion(null);
        setRevealPayload(null);
        setTimer(null);
        syncToIframes({ currentQuestion: null, revealPayload: null, timer: null });
        addLog("Admin: Quay về bảng ô Caro ngay lập tức (0s delay)");
        return;
      }
      if (selectedMode === "DICE_RACE") {
        if (!currentQuestion) {
          let nextIdx = -1;
          for (let i = 0; i < questions.length; i++) {
            const qId = questions[i].id || `q_${i + 1}`;
            if (!offlineUsedQuestionIdsRef.current.has(qId)) {
              nextIdx = i;
              break;
            }
          }
          if (nextIdx !== -1) {
            launchOfflineQuestion(nextIdx);
            return;
          }
        }
        setCurrentQuestion(null);
        setRevealPayload(null);
        setTimer(null);
        syncToIframes({ currentQuestion: null, revealPayload: null, timer: null });
        addLog("Admin: Quay về bàn cờ Đường Đua ngay lập tức (0s delay)");
        return;
      }
      if (selectedMode === "MYSTERY_QUEST") {
        setCurrentQuestion(null);
        setRevealPayload(null);
        setTimer(null);
        syncToIframes({ currentQuestion: null, revealPayload: null, timer: null });
        window.postMessage({ type: "MYSTERY_ADVANCE_TURN", action: "mystery_advance_turn" }, "*");
        return;
      }

      // Nếu đang trong câu hỏi hoặc vừa công bố đáp án xong: Chuyển qua màn hình Bảng xếp hạng giữa hiệp
      let nextIdx = -1;
      for (let i = 0; i < questions.length; i++) {
        const qId = questions[i].id || `q_${i + 1}`;
        if (!offlineUsedQuestionIdsRef.current.has(qId)) {
          nextIdx = i;
          break;
        }
      }

      if (nextIdx === -1) {
        setRoomState((prev) => prev ? { ...prev, status: "FINISHED" } : prev);
        setIntermission(null);
        addLog("🏁 Hết câu hỏi khả dụng! Trận đấu kết thúc.");
        syncToIframes({ roomState: { ...(roomState || {}), status: "FINISHED" }, currentQuestion: null, intermission: null });
        return;
      }

      if (offlineIntermissionTimerRef.current) {
        clearTimeout(offlineIntermissionTimerRef.current);
        offlineIntermissionTimerRef.current = null;
      }

      // Kích hoạt màn hình Bảng xếp hạng giữa hiệp (Leaderboard Intermission) với đếm ngược 3s tự động
      const intermissionPayload: GameIntermissionPayload = {
        nextQuestionIndex: nextIdx,
        totalQuestions: targetTotal,
        previousQuestionIndex: offlineQIndexRef.current,
        titleVi: `BẢNG XẾP HẠNG SAU CÂU #${offlineQIndexRef.current + 1}`,
        countdownSeconds: 3,
      };
      setIntermission(intermissionPayload);
      setCurrentQuestion(null);
      setRevealPayload(null);
      setTimer(null);
      syncToIframes({
        intermission: intermissionPayload,
        currentQuestion: null,
        revealPayload: null,
        timer: null,
      });
      addLog(`📊 Hiển thị Bảng xếp hạng giữa hiệp (Sau câu #${offlineQIndexRef.current + 1}). Tự động vào câu #${nextIdx + 1} sau 3s...`);

      // 3s auto advance timer
      offlineIntermissionTimerRef.current = setTimeout(() => {
        offlineIntermissionTimerRef.current = null;
        const qId = questions[nextIdx]?.id || `q_${nextIdx + 1}`;
        offlineUsedQuestionIdsRef.current.add(qId);
        setIntermission(null);
        launchOfflineQuestion(nextIdx);
      }, 3000);
      return;
    }

    if (roomState?.status === "LOBBY") {
      addLog("⚡ Admin: Bắt đầu trận đấu — Đang khởi động 5s chuẩn bị...");
    }
    adminSocketRef.current?.emit("admin:next", { code });
    addLog("Admin: Bắt đầu / Next câu tiếp theo");
  };
  handleAdminNextRef.current = handleAdminNext;

  const handleConcludeMatch = () => {
    if (isOfflineSandbox) {
      if (offlineTimerRef.current) {
        clearInterval(offlineTimerRef.current);
        offlineTimerRef.current = null;
      }
      const questions = offlineQuestionsRef.current;
      const targetTotal = getTargetTotalQuestions(
        selectedMode,
        roomState?.config,
        roomState?.teams.length || 4,
        questions.length || 25
      );
      setRoomState((prev) => prev ? { ...prev, status: "FINISHED" } : prev);
      setCurrentQuestion(null);
      setRevealPayload(null);
      addLog(`🏆 Tổng kết trận đấu sau ${targetTotal} câu thi đấu hoàn tất! Trao giải và vinh danh.`);
      syncToIframes({ roomState: { ...(roomState || {}), status: "FINISHED" }, currentQuestion: null });
      return;
    }
    adminSocketRef.current?.emit("admin:next", { code });
  };

  const handleAdminReveal = () => {
    if (isOfflineSandbox) {
      if (offlineTimerRef.current) {
        clearInterval(offlineTimerRef.current);
        offlineTimerRef.current = null;
      }
      if (!currentQuestion) return;

      const qRaw = offlineQuestionsRef.current[offlineQIndexRef.current] || currentQuestion.question;
      const opts = qRaw.options as any[] | null;
      const correctOpts = opts && Array.isArray(opts) ? opts.filter((o: any) => o.isCorrect) : [];
      let correctId = "A";
      let correctAnswerText = "";
      if (correctOpts.length > 0) {
        correctId = correctOpts[0].id;
        const labels = ["A", "B", "C", "D", "E", "F"];
        correctAnswerText = correctOpts.map((o: any) => {
          const idx = (opts || []).findIndex((opt: any) => opt.id === o.id);
          const prefix = idx >= 0 && idx < labels.length ? `${labels[idx]}. ` : "";
          return `${prefix}${o.text}`;
        }).join(" | ");
      } else if (qRaw.answer) {
        correctId = qRaw.answer;
        correctAnswerText = qRaw.answer;
      }

      const answers: any[] = [];
      const scoreDeltas: { teamId: string; delta: number }[] = [];

      const isWagerMode = selectedMode === "WAGER";
      const curWager = roomState?.wagerState;
      const lastWagerTeamId = curWager?.lastWagerTeamId;
      const wagerAmount = curWager?.currentHighestWager || 10;
      const baseQPoints = normalizeToThreeLevels(currentQuestion.question.points || 10);

      const activeTesterId = activeTeamIdRef.current || stableTeams[activeTeamIndex]?.id || stableTeams[0]?.id || "t_0";

      // 1. Điểm các đội không cược khi đúng: 1/2 điểm gốc cố định (5đ/10đ/15đ), sai = 0đ
      const nonWagerCorrectPoints = Math.max(5, Math.floor(baseQPoints / 2));

      // 2. Tính số đội khác (không phải đội cược) trả lời đúng
      let otherCorrectCount = 0;
      (roomState?.teams || []).forEach((t) => {
        if (t.id !== lastWagerTeamId) {
          const recorded = offlineAnswersRef.current.get(t.id);
          const ansId = recorded ? recorded.answer : (t.id === activeTesterId ? correctId : "B");
          const isCorrect = recorded ? recorded.isCorrect : ansId === correctId;
          if (isCorrect) otherCorrectCount++;
        }
      });

      // 3. Tính điểm phạt đội cược nếu trả lời SAI:
      // Đơn vị phạt U = Round(Mức cược / 2), làm tròn về số chia hết cho 5 gần nhất
      const unitPenalty = Math.max(5, Math.round((wagerAmount / 2) / 5) * 5);
      let wagerPenalty = 0;
      if (otherCorrectCount > 0) {
        const maxPenaltyTeams = baseQPoints <= 10 ? 1 : (baseQPoints <= 20 ? 2 : 3);
        const effectiveTeams = Math.min(otherCorrectCount, maxPenaltyTeams);
        wagerPenalty = effectiveTeams * unitPenalty;
      }

      // Tính tỷ lệ đúng toàn phòng và độ phân biệt Top/Bottom trong sandbox
      const currentTeamsList = roomState?.teams || [];
      const totalSandboxAnswers = currentTeamsList.length;
      let correctSandboxCount = 0;
      const hasAnyRecorded = offlineAnswersRef.current.size > 0;
      currentTeamsList.forEach((t) => {
        const recorded = offlineAnswersRef.current.get(t.id);
        const ansId = recorded ? recorded.answer : (hasAnyRecorded ? null : (t.id === activeTesterId ? correctId : null));
        const isCorrect = recorded ? recorded.isCorrect : (ansId ? ansId === correctId : false);
        if (isCorrect) correctSandboxCount++;
      });
      const sandboxAccuracy = totalSandboxAnswers > 0 ? correctSandboxCount / totalSandboxAnswers : 1.0;

      const sortedSandboxTeams = [...currentTeamsList].sort((a, b) => b.score - a.score);
      const midPoint = Math.max(1, Math.floor(sortedSandboxTeams.length / 2));
      const topHalfIds = new Set(sortedSandboxTeams.slice(0, midPoint).map((t) => t.id));
      const bottomHalfIds = new Set(sortedSandboxTeams.slice(midPoint).map((t) => t.id));

      let topHalfCorrect = 0;
      let topHalfTotal = 0;
      let bottomHalfCorrect = 0;
      let bottomHalfTotal = 0;

      currentTeamsList.forEach((t) => {
        const recorded = offlineAnswersRef.current.get(t.id);
        const ansId = recorded ? recorded.answer : (hasAnyRecorded ? null : (t.id === activeTesterId ? correctId : null));
        const isCorrect = recorded ? recorded.isCorrect : (ansId ? ansId === correctId : false);
        if (topHalfIds.has(t.id)) {
          topHalfTotal++;
          if (isCorrect) topHalfCorrect++;
        } else if (bottomHalfIds.has(t.id)) {
          bottomHalfTotal++;
          if (isCorrect) bottomHalfCorrect++;
        }
      });

      const irtMetrics = calculateItemIRTMetrics({
        rawPoints: currentQuestion.question.points || 10,
        roomAccuracy: sandboxAccuracy,
        totalParticipants: totalSandboxAnswers,
        topHalfCorrect,
        topHalfTotal,
        bottomHalfCorrect,
        bottomHalfTotal,
      });

      const irtBonusPercent = (selectedMode === "CLASSIC" || selectedMode === "ELIMINATION")
        ? Math.round(irtMetrics.bonusRate * 100)
        : (sandboxAccuracy < 0.30 ? Math.round((0.30 - sandboxAccuracy) * 1.5 * 100) : 0);

      (roomState?.teams || []).forEach((t) => {
        const recorded = offlineAnswersRef.current.get(t.id);
        const ansId = recorded ? recorded.answer : (hasAnyRecorded ? null : (t.id === activeTesterId ? correctId : null));
        const isCorrect = recorded ? recorded.isCorrect : (ansId ? ansId === correctId : false);
        const timeSpent = recorded?.timeSpent ?? 3000;

        let pts = 0;
        let basePts = 0;
        let speedPts = 0;
        let rarityPts = 0;

        if (isWagerMode) {
          if (t.id === lastWagerTeamId) {
            pts = isCorrect ? wagerAmount : -wagerPenalty;
          } else {
            pts = isCorrect ? nonWagerCorrectPoints : 0;
          }
          basePts = pts;
        } else if (selectedMode === "ELIMINATION" && t.isEliminated) {
          pts = 0;
          basePts = 0;
        } else if (selectedMode === "CLASSIC" || selectedMode === "ELIMINATION") {
          const rawBase = currentQuestion.question.points || 10;
          const base = getBasePointsForMode(rawBase, selectedMode);
          const isGold = selectedMode === "CLASSIC" && Boolean(currentQuestion.isGoldQuestion);
          const effBase = isGold ? base * 2 : base;
          if (isCorrect) {
            const timeLimit = currentQuestion.timeLimit || 30;
            const ratio = Math.max(0, 1 - timeSpent / (timeLimit * 1000));
            basePts = Math.round(effBase * 0.5);
            speedPts = Math.round(effBase * 0.5 * ratio);
            rarityPts = irtMetrics.bonusRate > 0 ? Math.round(effBase * irtMetrics.bonusRate) : 0;
            pts = basePts + speedPts + rarityPts;
          } else {
            pts = 0;
            basePts = 0;
          }
        } else {
          const base = normalizeToThreeLevels(currentQuestion.question.points || 10);
          pts = isCorrect ? base : 0;
          basePts = pts;
        }

        const teamMult = offlineTeamMultiplierRef.current.get(t.id) || 1;
        if (teamMult > 1 && isCorrect) {
          pts *= teamMult;
          basePts *= teamMult;
          speedPts *= teamMult;
          rarityPts *= teamMult;
        }
        offlineTeamMultiplierRef.current.delete(t.id);

        if (t.shieldCount && t.shieldCount > 0 && pts < 0) {
          pts = 0;
          t.shieldCount -= 1;
        }

        answers.push({
          teamId: t.id,
          name: t.name,
          answer: [ansId],
          isCorrect,
          pointsAwarded: pts,
          timeSpent,
          basePoints: basePts,
          speedPoints: speedPts,
          rarityPoints: rarityPts,
        });
        scoreDeltas.push({ teamId: t.id, delta: pts });
      });

      const teamSummaries = (roomState?.teams || []).map((t) => {
        const delta = scoreDeltas.find((d) => d.teamId === t.id)?.delta || 0;
        const ans = answers.find((a) => a.teamId === t.id);
        const recorded = offlineAnswersRef.current.get(t.id);
        return {
          teamId: t.id,
          teamName: t.name,
          teamColor: t.color,
          totalOnlineMembers: 1,
          correctMembers: ans?.isCorrect ? 1 : 0,
          pointsAwarded: delta,
          speedBonus: ans?.speedPoints ? Math.round((ans.speedPoints / (ans.basePoints || 1)) * 100) : 0,
          multiplier: t.id === lastWagerTeamId ? Number((wagerAmount / baseQPoints).toFixed(1)) : 1,
          basePoints: ans?.basePoints ?? 0,
          speedPoints: ans?.speedPoints ?? 0,
          rarityPoints: ans?.rarityPoints ?? 0,
          avgTimeSpent: recorded?.timeSpent ?? ans?.timeSpent ?? 3000,
          isEliminated: t.isEliminated,
          effectiveDifficulty: irtMetrics.bEffective,
          discrimination: irtMetrics.discrimination,
        };
      });

      const payload = {
        questionId: currentQuestion.question.id,
        correctAnswer: [correctId],
        correctAnswerText: correctAnswerText || undefined,
        explanation: qRaw.hint || currentQuestion.question.hint || undefined,
        answers,
        teamSummaries,
        roomAccuracy: sandboxAccuracy,
        rarityBonusPercent: irtBonusPercent,
        effectiveDifficulty: irtMetrics.bEffective,
        itemDiscrimination: irtMetrics.discrimination,
      };

      const curTurnTeamId = roomState?.diceRaceState?.currentTurnTeamId;
      const curTeamAnswer = answers.find((a) => a.teamId === curTurnTeamId);
      const isCurTeamCorrect = Boolean(curTeamAnswer?.isCorrect);

      setRevealPayload(payload);
      syncToIframes({ revealPayload: payload });

      setRoomState((prev) => {
        if (!prev) return prev;
        let updatedTeams = prev.teams.map((t) => {
          const delta = scoreDeltas.find((d) => d.teamId === t.id)?.delta || 0;
          const ans = answers.find((a) => a.teamId === t.id);
          const hasAnswered = Boolean(ans && ans.answer && ans.answer.length > 0 && ans.answer[0]);
          const isCorrect = Boolean(ans?.isCorrect);

          let newGhostStreak = t.ghostStreak || 0;
          let newGhostTotalCorrect = t.ghostTotalCorrect || 0;
          let newGhostTotalAnswered = t.ghostTotalAnswered || 0;
          let newGhostCurrentRoundCorrect = t.ghostCurrentRoundCorrect || 0;

          if (selectedMode === "ELIMINATION" && t.isEliminated) {
            if (hasAnswered) {
              newGhostTotalAnswered += 1;
              if (isCorrect) {
                newGhostTotalCorrect += 1;
                newGhostCurrentRoundCorrect += 1;
                newGhostStreak += 1;
              } else {
                newGhostStreak = 0;
              }
            }
          }

          return {
            ...t,
            score: t.score + delta,
            isGhost: selectedMode === "ELIMINATION" && t.isEliminated,
            ghostStreak: newGhostStreak,
            ghostTotalCorrect: newGhostTotalCorrect,
            ghostTotalAnswered: newGhostTotalAnswered,
            ghostCurrentRoundCorrect: newGhostCurrentRoundCorrect,
            eliminationInterval: prev.config?.eliminationIntervalQuestions || 3,
          };
        });

        // Offline ELIMINATION stage boundary processing
        if (selectedMode === "ELIMINATION") {
          const interval = Math.max(1, prev.config?.eliminationIntervalQuestions || 3);
          const currentQNum = offlineQIndexRef.current + 1;

          if (currentQNum % interval === 0) {
            const currentStageNumber = Math.floor(currentQNum / interval);

            // 1. Evaluate round performance for each ghost team (100% correct -> ghostRoundAllCorrect)
            updatedTeams = updatedTeams.map((t) => {
              if (t.isEliminated) {
                const perfect = (t.ghostCurrentRoundCorrect || 0) >= interval;
                return {
                  ...t,
                  ghostRoundAllCorrect: t.ghostRoundAllCorrect || perfect,
                  ghostCurrentRoundCorrect: 0,
                };
              }
              return t;
            });

            // 2. Eliminate lowest active team
            const activeTeams = updatedTeams.filter((t) => !t.isEliminated);
            if (activeTeams.length > 1) {
              activeTeams.sort((a, b) => {
                if (a.score !== b.score) return a.score - b.score;
                return 0;
              });
              const toEliminate = activeTeams[0];
              updatedTeams = updatedTeams.map((t) => {
                if (t.id === toEliminate.id) {
                  return {
                    ...t,
                    isEliminated: true,
                    isGhost: true,
                    eliminatedAtStage: currentStageNumber,
                    firstGhostStage: currentStageNumber + 1,
                  };
                }
                return t;
              });
              addLog(`💀 [Vòng sinh tồn #${currentStageNumber}] Đội [${toEliminate.name}] có điểm thấp nhất và bị loại thành Bóng ma!`);
            }

            // 3. Ghost Revival Check at Penultimate Stage
            const totalQuestions = offlineQuestionsRef.current.length || 12;
            const totalStages = Math.floor(totalQuestions / interval);
            if (totalStages >= 4 && currentStageNumber === totalStages - 1) {
              const eliminatedCandidates = updatedTeams.filter((t) => t.isEliminated);
              if (eliminatedCandidates.length > 0) {
                eliminatedCandidates.sort((a, b) => {
                  const isPerfA = Boolean(a.ghostRoundAllCorrect);
                  const isPerfB = Boolean(b.ghostRoundAllCorrect);
                  if (isPerfA !== isPerfB) return isPerfA ? -1 : 1;
                  const accA = (a.ghostTotalAnswered || 0) > 0 ? (a.ghostTotalCorrect || 0) / a.ghostTotalAnswered! : 0;
                  const accB = (b.ghostTotalAnswered || 0) > 0 ? (b.ghostTotalCorrect || 0) / b.ghostTotalAnswered! : 0;
                  if (accA !== accB) return accB - accA;
                  return (b.ghostTotalCorrect || 0) - (a.ghostTotalCorrect || 0);
                });

                const candidateToRevive = eliminatedCandidates[0];
                const surviving = updatedTeams.filter((t) => !t.isEliminated);
                const minSurvivingScore = surviving.length > 0 ? Math.min(...surviving.map((t) => t.score)) : 0;

                updatedTeams = updatedTeams.map((t) => {
                  if (t.id === candidateToRevive.id) {
                    return {
                      ...t,
                      isEliminated: false,
                      isGhost: false,
                      score: minSurvivingScore,
                      ghostRoundAllCorrect: false,
                    };
                  }
                  return t;
                });

                const revivalPayload = {
                  round: currentStageNumber,
                  revivedTeamName: candidateToRevive.name,
                  revivedScore: minSurvivingScore,
                  eliminatedAtStage: candidateToRevive.eliminatedAtStage,
                };
                addLog(`✨ [HỒI SINH] Đội [${candidateToRevive.name}] đã HỒI SINH ngoạn mục với ${minSurvivingScore}đ!`);
                syncToIframes({ revivalNotice: revivalPayload });
              }
            }
          }
        }

        let nextWager = prev.wagerState;
        if (nextWager) {
          nextWager = { ...nextWager, phase: "REVEAL_PERIOD" };
        }

        let nextDice = prev.diceRaceState;
        if (prev.diceRaceState) {
          const teamIds = (prev.teams || []).map((t) => t.id);
          const curIdx = curTurnTeamId ? teamIds.indexOf(curTurnTeamId) : 0;
          const nextTeamId = teamIds[(curIdx + 1) % (teamIds.length || 1)];
          const nextTeamName = prev.teams.find((t) => t.id === nextTeamId)?.name;

          nextDice = {
            ...prev.diceRaceState,
            canRollDice: isCurTeamCorrect,
            currentTurnTeamId: isCurTeamCorrect ? prev.diceRaceState.currentTurnTeamId : nextTeamId,
            currentTurnTeamName: isCurTeamCorrect ? prev.diceRaceState.currentTurnTeamName : nextTeamName,
          };
        }

        let nextMystery = prev.mysteryQuestState;
        if (selectedMode === "MYSTERY_QUEST" && prev.mysteryQuestState) {
          const curMystery = prev.mysteryQuestState;
          const activeTeamId = curMystery.currentTurnTeamId;
          const activeAns = answers.find((a) => a.teamId === activeTeamId);
          const isCorrect = Boolean(activeAns?.isCorrect);

          if (isCorrect) {
            const curQ = currentQuestion?.question;
            const rawQ = curQ || offlineQuestionsRef.current[offlineQIndexRef.current];
            const basePts = normalizeToThreeLevels(curQ?.points || rawQ?.points || 10);
            const promo = generateMysteryPromoPerk(basePts, curMystery.miniGameType, {
              teams: prev.teams,
              currentTeamId: activeTeamId,
              currentRound: curMystery.currentRound ?? 1,
            });
            nextMystery = {
              ...curMystery,
              phase: "DECISION_CHOICE",
              baseQuestionPoints: basePts,
              potPoints: basePts,
              potMultiplier: 1,
              promoPerk: promo,
              hasShield: promo === "SHIELD_PROMO",
              decisionMade: undefined,
            };
            nextMystery = synchronizeMysteryStageWithQuestionPoints({
              state: nextMystery,
              questionPoints: basePts,
              theme: nextMystery.theme,
              teams: updatedTeams,
            });
          } else {
            const currentTeamObj = updatedTeams.find((t) => t.id === curMystery.currentTurnTeamId);
            const teamHearts = curMystery.teamHearts ? { ...curMystery.teamHearts } : {};
            const currentHearts = teamHearts[curMystery.currentTurnTeamId] ?? currentTeamObj?.hearts ?? curMystery.initialHeartsPerTeam ?? 0;
            const currentScore = currentTeamObj?.score || 0;
            const curQ = currentQuestion?.question;
            const rawQ = curQ || offlineQuestionsRef.current[offlineQIndexRef.current];
            const basePts = normalizeToThreeLevels(curQ?.points || rawQ?.points || 10);

            curMystery.baseQuestionPoints = basePts;
            curMystery.potPoints = 0;
            curMystery.potMultiplier = 1;
            curMystery.turnFinishedReason = undefined;

            // KHI TRẢ LỜI SAI:
            // Nếu còn tim: Chỉ có 1 trong 2 lựa chọn: hoặc giữ nguyên điểm nhưng mất hết tim, hoặc chơi minigame!
            // Nếu đã hết tim (0 tim): Bắt buộc vào thẳng Minigame Sinh Tử!
            if (currentHearts > 0) {
              nextMystery = {
                ...curMystery,
                phase: "DECISION_CHOICE",
                survivalDilemmaPending: true,
                survivalDilemmaChoice: undefined,
                isPenaltySurvivalMode: false,
                teamHearts,
              };
            } else {
              const clonedState = {
                ...curMystery,
                survivalDilemmaPending: false,
                teamHearts,
              };
              startSurvivalPenaltyMinigame({
                state: clonedState,
                team: currentTeamObj!,
                allTeams: updatedTeams,
              });
              nextMystery = clonedState;
            }
          }
        }

        const nextRoomState = {
          ...prev,
          teams: updatedTeams,
          diceRaceState: nextDice,
          wagerState: nextWager,
          mysteryQuestState: nextMystery,
        };
        roomStateRef.current = nextRoomState;
        syncToIframes({ roomState: nextRoomState, mysteryQuestState: nextMystery });
        return nextRoomState;
      });

      if (selectedMode === "MYSTERY_QUEST") {
        const curMystery = roomState?.mysteryQuestState;
        const curName = curMystery?.currentTurnTeamName || "Đội thi";
        const curTeamAns = answers.find((a) => a.teamId === curMystery?.currentTurnTeamId);
        if (curTeamAns?.isCorrect) {
          addLog(`🎉 [${curName}] trả lời ĐÚNG! Nhận ${currentQuestion.question.points || 20}đ vào Hũ và mở khóa Thử thách Lật Thẻ!`);
        } else {
          addLog(`❌ [${curName}] trả lời CHƯA ĐÚNG! Lượt thi kết thúc với 0 điểm.`);
        }
      }

      if (selectedMode === "DICE_RACE") {
        const curName = roomState?.diceRaceState?.currentTurnTeamName || curTurnTeamId;
        if (isCurTeamCorrect) {
          addLog(`🎲 [${curName}] trả lời ĐÚNG! Đã mở quyền gieo xúc xắc!`);
          if (botAutoEnabled && curTurnTeamId && curTurnTeamId !== activeTesterId) {
            setTimeout(() => {
              handleDiceRollManual();
            }, 1800);
          }
        } else {
          addLog(`❌ [${curName}] trả lời SAI! Mất lượt đổ xúc xắc.`);
        }
      }

      addLog(`Admin: Đã công bố đáp án câu hỏi #${offlineQIndexRef.current + 1}`);
      return;
    }

    adminSocketRef.current?.emit("admin:reveal", { code });
    addLog("Admin: Công bố đáp án");
  };

  const handleSkipTimerToOneSecond = () => {
    if (isOfflineSandbox) {
      offlineRemainingRef.current = 1;
      const endsAt = Date.now() + 1000;
      setTimer((prev) => prev ? { ...prev, remaining: 1, endsAt } : { remaining: 1, total: 30, endsAt });
      syncToIframes({ timer: { remaining: 1, total: currentQuestion?.timeLimit || 30, endsAt } });
      addLog("⚡ Admin tua nhanh: Đặt đếm ngược còn 1s!");
      return;
    }

    adminSocketRef.current?.emit("admin:timer:set", { seconds: 1, code });
    addLog("⚡ Admin tua nhanh: Đặt đếm ngược còn 1s!");
  };

  const handleAdminStopEarly = () => {
    if (isOfflineSandbox) {
      if (offlineTimerRef.current) {
        clearInterval(offlineTimerRef.current);
        offlineTimerRef.current = null;
      }
      offlineRemainingRef.current = 0;
      setTimer({ remaining: 0, total: currentQuestion?.timeLimit || 30, endsAt: 0 });
      syncToIframes({ timer: { remaining: 0, total: currentQuestion?.timeLimit || 30, endsAt: 0 } });
      addLog("⏹️ Admin đã bấm Dừng thời gian sớm!");
      setTimeout(() => {
        handleAdminReveal();
      }, 500);
      return;
    }

    adminSocketRef.current?.emit("admin:timer:stop_early", { code });
    addLog("Admin: Dừng thời gian sớm");
  };

  const handlePauseResume = () => {
    if (isOfflineSandbox) {
      setRoomState((prev) => {
        if (!prev) return prev;
        const nextStatus = prev.status === "PAUSED" ? "PLAYING" : "PAUSED";
        addLog(`Admin: ${nextStatus === "PAUSED" ? "Tạm dừng" : "Tiếp tục"} trận đấu`);
        return { ...prev, status: nextStatus };
      });
      return;
    }

    if (roomState?.status === "PAUSED") {
      adminSocketRef.current?.emit("admin:resume", { code });
      addLog("Admin: Tiếp tục trận đấu");
    } else {
      adminSocketRef.current?.emit("admin:pause", { code });
      addLog("Admin: Tạm dừng trận đấu");
    }
  };

  const handleStartTimer = () => {
    if (selectedMode === "BOUNCEBACK" && currentQuestion?.stealBuzzedTeamId) {
      handleBouncebackStartStealAnswer();
      return;
    }
    if (selectedMode === "BUZZ" && currentQuestion?.buzzedTeamId && !currentQuestion.buzzAnsweringActive) {
      handleBuzzStartAnswer();
      return;
    }

    if (isOfflineSandbox) {
      if (!currentQuestion) return;
      const ptsLimit = currentQuestion.selectedPointLevel === 10 ? 15 : currentQuestion.selectedPointLevel === 20 ? 20 : currentQuestion.selectedPointLevel === 30 ? 30 : null;
      const timeLimit = ptsLimit || quantizeOlympiaTimeLimit(currentQuestion.question?.points || 10, currentQuestion.timeLimit);
      const endsAt = Date.now() + timeLimit * 1000;
      const updatedQ: QuestionState = {
        ...currentQuestion,
        timerPending: false,
        timerStarted: true,
        endsAt,
        timeLimit,
        serverTime: Date.now(),
        buzzUnlocked: selectedMode === "BUZZ" ? true : currentQuestion.buzzUnlocked,
      };
      setCurrentQuestion(updatedQ);
      offlineRemainingRef.current = timeLimit;
      setTimer({ remaining: timeLimit, total: timeLimit, endsAt });
      syncToIframes({ currentQuestion: updatedQ, timer: { remaining: timeLimit, total: timeLimit, endsAt } });

      if (offlineTimerRef.current) clearInterval(offlineTimerRef.current);
      offlineTimerRef.current = setInterval(() => {
        const rawRem = Math.max(0, Math.ceil((endsAt - Date.now()) / 1000));
        const rem = Math.min(offlineRemainingRef.current, Math.min(timeLimit, rawRem));
        offlineRemainingRef.current = rem;
        setTimer({ remaining: rem, total: timeLimit, endsAt });
        syncToIframes({ timer: { remaining: rem, total: timeLimit, endsAt } });
        if (rem <= 0) {
          if (offlineTimerRef.current) clearInterval(offlineTimerRef.current);
          offlineTimerRef.current = null;
          syncToIframes({ timer: { remaining: 0, total: timeLimit, endsAt: 0 } });
        }
      }, 500);
      addLog(`Admin: Bắt đầu tính giờ (${timeLimit}s)${selectedMode === "BUZZ" ? " & Mở chuông ngay lập tức" : ""}`);
      return;
    }

    adminSocketRef.current?.emit("admin:question:start_timer");
    addLog("Admin: Bắt đầu tính giờ");
  };

  // ── Magic Wheel Dedicated Admin Controls ──────────────────────────────────
  const handleMagicWheelQuickSpin = () => {
    const power = Math.floor(Math.random() * 40 + 50);
    window.postMessage({ type: "MAGIC_WHEEL_SPIN", power }, "*");
    if (adminSocketRef.current?.connected) {
      adminSocketRef.current.emit("magic_wheel:spin" as any, { power });
    }
    addLog(`🎡 [Quản trò] Quay nón với lực ${power}%`);
  };

  const handleMagicWheelPassTurn = () => {
    if (adminSocketRef.current?.connected) {
      adminSocketRef.current.emit("admin:magic_wheel:pass_turn" as any);
    }
    window.postMessage({ type: "MAGIC_WHEEL_PASS_TURN" }, "*");
    addLog(`⏭️ [Quản trò] Đổi lượt sang đội kế tiếp`);
  };

  const handleMagicWheelQuickRevealLetter = () => {
    if (adminSocketRef.current?.connected) {
      adminSocketRef.current.emit("admin:magic_wheel:quick_reveal_letter" as any);
    }
    window.postMessage({ type: "MAGIC_WHEEL_QUICK_REVEAL" }, "*");
    addLog(`🔤 [Quản trò] Mở nhanh 1 chữ cái trên bàn cờ`);
  };

  const handleMagicWheelTriggerLucky = () => {
    const mw = roomStateRef.current?.magicWheelState;
    if (mw?.currentPuzzle) {
      const p = mw.currentPuzzle;
      const unrevealed: number[] = [];
      for (let i = 0; i < p.secretPhrase.length; i++) {
        if (p.secretPhrase[i] !== " " && !p.revealedIndices.includes(i)) unrevealed.push(i);
      }
      if (unrevealed.length > 0) {
        const randomIdx = unrevealed[Math.floor(Math.random() * unrevealed.length)];
        if (adminSocketRef.current?.connected) {
          adminSocketRef.current.emit("magic_wheel:lucky_pick" as any, { index: randomIdx });
        }
        window.postMessage({ type: "MAGIC_WHEEL_LUCKY_PICK", index: randomIdx }, "*");
        addLog(`🎁 [Quản trò] Kích hoạt ô May Mắn mở vị trí #${randomIdx + 1}`);
      }
    }
  };

  const handleMagicWheelDirectSolve = () => {
    const mw = roomStateRef.current?.magicWheelState;
    if (mw?.currentPuzzle) {
      const answer = mw.currentPuzzle.secretPhrase;
      if (adminSocketRef.current?.connected) {
        adminSocketRef.current.emit("magic_wheel:solve_puzzle" as any, { answer });
      }
      window.postMessage({ type: "MAGIC_WHEEL_SOLVE_PUZZLE", answer }, "*");
      addLog(`🎯 [Quản trò] Đoán ô chữ chính xác: "${answer}"`);
    }
  };

  const handleMagicWheelRevealAll = () => {
    if (adminSocketRef.current?.connected) {
      adminSocketRef.current.emit("admin:magic_wheel:reveal_all" as any);
    }
    window.postMessage({ type: "MAGIC_WHEEL_REVEAL_ALL" }, "*");
    addLog(`💡 [Quản trò] Mở toàn bộ ô chữ bí mật`);
  };

  const handleMagicWheelNextRound = () => {
    if (adminSocketRef.current?.connected) {
      adminSocketRef.current.emit("admin:magic_wheel:advance_round" as any);
    }
    window.postMessage({ type: "MAGIC_WHEEL_ADVANCE_ROUND" }, "*");
    addLog(`⏩ [Quản trò] Tiến sang vòng kế tiếp`);
  };

  // ── Magic Wheel Bot Automation Timer ──────────────────────────────────────
  const pendingBotWheelTimerRef = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    if (!botAutoEnabled || selectedMode !== "MAGIC_WHEEL") {
      if (pendingBotWheelTimerRef.current) {
        clearTimeout(pendingBotWheelTimerRef.current);
        pendingBotWheelTimerRef.current = null;
      }
      return;
    }

    const mw = roomState?.magicWheelState;
    if (!mw) return;

    const currentTurnTeamId = mw.currentTurnTeamId;
    const activeTesterId = activeTeamIdRef.current || stableTeams[activeTeamIndex]?.id;
    const isBotTurn = currentTurnTeamId && currentTurnTeamId !== activeTesterId;
    if (!isBotTurn) return;

    if (pendingBotWheelTimerRef.current) {
      clearTimeout(pendingBotWheelTimerRef.current);
    }

    if (mw.phase === "SPIN_WAITING" && !mw.isSpinning) {
      pendingBotWheelTimerRef.current = setTimeout(() => {
        handleMagicWheelQuickSpin();
      }, 2000);
    } else if (mw.phase === "ACTION_INPUT" && !mw.isSpinning) {
      pendingBotWheelTimerRef.current = setTimeout(() => {
        const availableLetters = VIETNAMESE_ALPHABET.filter((l) => !mw.guessedLetters.includes(l));
        if (availableLetters.length > 0) {
          const letter = availableLetters[Math.floor(Math.random() * availableLetters.length)];
          window.postMessage({ type: "MAGIC_WHEEL_GUESS_LETTER", letter }, "*");
          if (adminSocketRef.current?.connected) {
            adminSocketRef.current.emit("magic_wheel:guess_letter" as any, { letter });
          }
          addLog(`🤖 [Bot ${mw.currentTurnTeamName}] Tự động gọi chữ cái "${letter}"`);
        }
      }, 2500);
    } else if (mw.phase === "REWARD_CHOICE") {
      pendingBotWheelTimerRef.current = setTimeout(() => {
        const cards: ("POINTS_1500" | "FREE_SPIN" | "SHIELD")[] = ["POINTS_1500", "FREE_SPIN", "SHIELD"];
        const chosen = cards[Math.floor(Math.random() * cards.length)];
        window.postMessage({ type: "MAGIC_WHEEL_REWARD_SELECT", cardType: chosen }, "*");
        if (adminSocketRef.current?.connected) {
          adminSocketRef.current.emit("magic_wheel:reward_select" as any, { cardType: chosen });
        }
        addLog(`🤖 [Bot ${mw.currentTurnTeamName}] Tự động chọn thẻ quà: ${chosen}`);
      }, 2000);
    } else if (mw.phase === "MYSTERY_CHOICE") {
      pendingBotWheelTimerRef.current = setTimeout(() => {
        const openMystery = Math.random() >= 0.4;
        window.postMessage({ type: "MAGIC_WHEEL_MYSTERY_DECIDE", openMystery }, "*");
        if (adminSocketRef.current?.connected) {
          adminSocketRef.current.emit("magic_wheel:mystery_decide" as any, { openMystery });
        }
        addLog(`🤖 [Bot ${mw.currentTurnTeamName}] Tự động chọn ô Bí Mật: ${openMystery ? "Lật Hộp Đỏ" : "Nhận 3.000đ vĩnh viễn"}`);
      }, 2000);
    } else if (mw.phase === "TRADE_CHOICE") {
      pendingBotWheelTimerRef.current = setTimeout(() => {
        const trade = Math.random() >= 0.5;
        const boxIndex = Math.floor(Math.random() * 4);
        window.postMessage({ type: "MAGIC_WHEEL_TRADE_DECIDE", trade, boxIndex }, "*");
        if (adminSocketRef.current?.connected) {
          adminSocketRef.current.emit("magic_wheel:trade_decide" as any, { trade, boxIndex });
        }
        addLog(`🤖 [Bot ${mw.currentTurnTeamName}] Tự động quyết định Vòng 3: ${trade ? `Đổi lấy Hộp Quà #${boxIndex + 1}` : "Không Đổi"}`);
      }, 2000);
    }

    return () => {
      if (pendingBotWheelTimerRef.current) {
        clearTimeout(pendingBotWheelTimerRef.current);
      }
    };
  }, [botAutoEnabled, selectedMode, roomState?.magicWheelState]);

  // Mode Specific Handlers
  const handleBuzzUnlock = () => {
    if (isOfflineSandbox) {
      if (currentQuestion) {
        const updatedQ = { ...currentQuestion, buzzUnlocked: true };
        setCurrentQuestion(updatedQ);
        syncToIframes({ currentQuestion: updatedQ });
      }
      addLog("🔔 Chuông đã MỞ KHÓA NGAY LẬP TỨC (0s delay) cho tất cả các đội!");
      return;
    }

    adminSocketRef.current?.emit("admin:buzz:unlock");
    addLog("Admin: Mở chuông cho thí sinh bấm ngay lập tức (admin:buzz:unlock)");
  };

  const handleBuzzStartAnswer = (duration?: number) => {
    const isMC = currentQuestion?.question.type === "MC_SINGLE" || currentQuestion?.question.type === "TRUE_FALSE" || currentQuestion?.question.type === "MC_MULTI";
    const finalDuration = duration && duration > 0 ? duration : (isMC ? 5 : 15);

    if (isOfflineSandbox) {
      if (!currentQuestion) return;
      const endsAt = Date.now() + finalDuration * 1000;
      const updatedQ: QuestionState = {
        ...currentQuestion,
        buzzAnsweringActive: true,
        timerPending: false,
        timerStarted: true,
        timeLimit: finalDuration,
        startedAt: Date.now(),
        endsAt,
        serverTime: Date.now(),
      };
      setCurrentQuestion(updatedQ);
      offlineRemainingRef.current = finalDuration;
      setTimer({ remaining: finalDuration, total: finalDuration, endsAt });
      syncToIframes({
        currentQuestion: updatedQ,
        timer: { remaining: finalDuration, total: finalDuration, endsAt },
      });

      if (offlineTimerRef.current) clearInterval(offlineTimerRef.current);
      offlineTimerRef.current = setInterval(() => {
        const rawRem = Math.max(0, Math.ceil((endsAt - Date.now()) / 1000));
        const rem = Math.min(offlineRemainingRef.current, Math.min(finalDuration, rawRem));
        offlineRemainingRef.current = rem;
        setTimer({ remaining: rem, total: finalDuration, endsAt });
        syncToIframes({ timer: { remaining: rem, total: finalDuration, endsAt } });
        if (rem <= 0) {
          if (offlineTimerRef.current) clearInterval(offlineTimerRef.current);
          offlineTimerRef.current = null;
          syncToIframes({ timer: { remaining: 0, total: finalDuration, endsAt: 0 } });
        }
      }, 500);
      addLog(`Admin: Bắt đầu ${finalDuration}s trả lời cho đội bấm chuông`);
      return;
    }

    adminSocketRef.current?.emit("admin:buzz:start_answer", { duration: finalDuration });
    addLog(`Admin: Bắt đầu ${finalDuration}s trả lời cho đội bấm chuông`);
  };

  const handleBouncebackOpenSteal = () => {
    if (isOfflineSandbox) {
      addLog("Admin: Mở cửa sổ chuông cướp điểm 5s");
      syncToIframes({ isStealOpen: true });
      return;
    }

    adminSocketRef.current?.emit("admin:bounceback:open_steal");
    addLog("Admin: Mở cửa sổ chuông cướp điểm 5s");
  };

  const handleBouncebackStartStealAnswer = (duration?: number) => {
    const isMC = currentQuestion?.question.type === "MC_SINGLE" || currentQuestion?.question.type === "TRUE_FALSE" || currentQuestion?.question.type === "MC_MULTI";
    const finalDuration = duration && duration > 0 ? duration : (isMC ? 5 : 15);

    if (isOfflineSandbox) {
      if (!currentQuestion) return;
      const endsAt = Date.now() + finalDuration * 1000;
      const updatedQ: QuestionState = {
        ...currentQuestion,
        stealAnsweringActive: true,
        timerPending: false,
        timerStarted: true,
        timeLimit: finalDuration,
        startedAt: Date.now(),
        endsAt,
        serverTime: Date.now(),
      };
      setCurrentQuestion(updatedQ);
      offlineRemainingRef.current = finalDuration;
      setTimer({ remaining: finalDuration, total: finalDuration, endsAt });
      syncToIframes({
        currentQuestion: updatedQ,
        timer: { remaining: finalDuration, total: finalDuration, endsAt },
        stealBuzzed: currentQuestion.stealBuzzedTeamId ? {
          teamId: currentQuestion.stealBuzzedTeamId,
          teamName: currentQuestion.stealBuzzedTeamName || "",
          playerId: "",
          playerName: "",
        } : undefined,
      });

      if (offlineTimerRef.current) clearInterval(offlineTimerRef.current);
      offlineTimerRef.current = setInterval(() => {
        const rawRem = Math.max(0, Math.ceil((endsAt - Date.now()) / 1000));
        const rem = Math.min(offlineRemainingRef.current, Math.min(finalDuration, rawRem));
        offlineRemainingRef.current = rem;
        setTimer({ remaining: rem, total: finalDuration, endsAt });
        syncToIframes({ timer: { remaining: rem, total: finalDuration, endsAt } });
        if (rem <= 0) {
          if (offlineTimerRef.current) clearInterval(offlineTimerRef.current);
          offlineTimerRef.current = null;
          syncToIframes({ timer: { remaining: 0, total: finalDuration, endsAt: 0 } });
        }
      }, 500);
      addLog(`Admin: Bắt đầu ${finalDuration}s trả lời cướp điểm`);
      return;
    }

    adminSocketRef.current?.emit("admin:bounceback:start_steal_answer", { duration: finalDuration });
    addLog(`Admin: Bắt đầu ${finalDuration}s trả lời cướp điểm`);
  };

  const handleBouncebackJudge = (isCorrect: boolean) => {
    if (isOfflineSandbox) {
      if (offlineTimerRef.current) {
        clearInterval(offlineTimerRef.current);
        offlineTimerRef.current = null;
      }
      if (!currentQuestion) return;

      const qRaw = offlineQuestionsRef.current[offlineQIndexRef.current] || currentQuestion.question;
      const correctOpt = qRaw.options?.find((o: any) => o.isCorrect);
      const correctId = correctOpt ? correctOpt.id : "A";
      const chosenPoints = currentQuestion.selectedPointLevel || currentQuestion.question.points || 20;

      const primaryTeamId = currentQuestion.primaryTeamId || stableTeams[activeTeamIndex]?.id || stableTeams[0]?.id || "t_0";
      const primaryTeamName = currentQuestion.primaryTeamName || stableTeams.find((t) => t.id === primaryTeamId)?.name || "Đội chính";
      const stealTeamId = currentQuestion.stealBuzzedTeamId;
      const stealTeamName = currentQuestion.stealBuzzedTeamName;

      // 1. Phán quyết cho ĐỘI CƯỚP:
      if (stealTeamId) {
        const stealPts = isCorrect ? chosenPoints : -Math.floor(chosenPoints * 0.5);
        const primaryDeduct = isCorrect ? -chosenPoints : 0;

        setRoomState((prev) => {
          if (!prev) return prev;
          const updatedTeams = prev.teams.map((t) => {
            if (t.id === stealTeamId) return { ...t, score: t.score + stealPts };
            if (t.id === primaryTeamId) return { ...t, score: t.score + primaryDeduct };
            return t;
          });
          return { ...prev, teams: updatedTeams };
        });

        const answers = (roomState?.teams || []).map((t) => ({
          teamId: t.id,
          name: t.name,
          answer: t.id === stealTeamId ? [isCorrect ? correctId : "B"] : [],
          isCorrect: t.id === stealTeamId ? isCorrect : false,
          pointsAwarded: t.id === stealTeamId ? stealPts : (t.id === primaryTeamId ? primaryDeduct : 0),
          timeSpent: 2000,
        }));

        setRevealPayload({
          questionId: currentQuestion.question.id,
          correctAnswer: [correctId],
          answers,
        });

        setCurrentQuestion((prev) => prev ? { ...prev, bouncebackAwaitingJudgment: null, isStealPhase: false } : prev);
        syncToIframes({
          revealPayload: { questionId: currentQuestion.question.id, correctAnswer: [correctId], answers },
          isStealOpen: false,
        });

        if (isCorrect) {
          addLog(`⚖️ MC chấm: Đội cướp [${stealTeamName}] ĐÚNG! +${chosenPoints}đ cho cướp, -${chosenPoints}đ cho [${primaryTeamName}]!`);
        } else {
          addLog(`⚖️ MC chấm: Đội cướp [${stealTeamName}] SAI! -${Math.floor(chosenPoints * 0.5)}đ cho cướp, [${primaryTeamName}] giữ nguyên điểm.`);
        }
        return;
      }

      // 2. Phán quyết cho ĐỘI CHÍNH:
      if (isCorrect) {
        setRoomState((prev) => {
          if (!prev) return prev;
          const updatedTeams = prev.teams.map((t) => {
            if (t.id === primaryTeamId) return { ...t, score: t.score + chosenPoints };
            return t;
          });
          return { ...prev, teams: updatedTeams };
        });

        const answers = (roomState?.teams || []).map((t) => ({
          teamId: t.id,
          name: t.name,
          answer: t.id === primaryTeamId ? [correctId] : [],
          isCorrect: t.id === primaryTeamId ? true : false,
          pointsAwarded: t.id === primaryTeamId ? chosenPoints : 0,
          timeSpent: 2000,
        }));

        setRevealPayload({
          questionId: currentQuestion.question.id,
          correctAnswer: [correctId],
          answers,
        });

        setCurrentQuestion((prev) => prev ? { ...prev, bouncebackAwaitingJudgment: null } : prev);
        syncToIframes({
          revealPayload: { questionId: currentQuestion.question.id, correctAnswer: [correctId], answers },
          isStealOpen: false,
        });

        addLog(`⚖️ MC chấm: Đội chính [${primaryTeamName}] ĐÚNG! +${chosenPoints}đ trọn vẹn (không mở cướp).`);
      } else {
        // Đội chính sai: Mở chuông cướp 5s!
        setCurrentQuestion((prev) => prev ? { ...prev, bouncebackAwaitingJudgment: null, isStealPhase: true } : prev);
        syncToIframes({ isStealOpen: true });
        addLog(`⚖️ MC chấm: Đội chính [${primaryTeamName}] SAI! Tự động mở chuông cướp 5s cho các đội khác...`);

        // Countdown 5s
        let steal5s = 5;
        const sTimer = setInterval(() => {
          steal5s--;
          if (steal5s <= 0) {
            clearInterval(sTimer);
            setCurrentQuestion((prev) => {
              if (prev && !prev.stealBuzzedTeamId) {
                handleAdminReveal();
                return { ...prev, isStealPhase: false };
              }
              return prev;
            });
            syncToIframes({ isStealOpen: false });
          }
        }, 1000);
      }
      return;
    }

    adminSocketRef.current?.emit("admin:bounceback:judge", { isCorrect, code });
    addLog(`Admin phán quyết Bounceback: ${isCorrect ? "ĐÚNG" : "SAI"}`);
  };

  const handleAdminBouncebackSelectPoints = (points: 10 | 20 | 30) => {
    if (isOfflineSandbox) {
      handleOfflineBouncebackPointsPicked(points);
      return;
    }

    adminSocketRef.current?.emit("admin:bounceback:select_points", { points });
    addLog(`Admin ép chọn gói ${points} điểm cho câu hỏi`);
  };

  const handleDiceRollManual = () => {
    if (roomState?.diceRaceState && !roomState.diceRaceState.canRollDice) {
      addLog("⚠️ Chưa đủ điều kiện tung xúc xắc: Đội của lượt này cần trả lời đúng câu hỏi hoặc có ô x2!");
      return;
    }

    if (isOfflineSandbox) {
      if (currentQuestion || revealPayload) {
        setCurrentQuestion(null);
        setRevealPayload(null);
        setTimer(null);
        syncToIframes({ currentQuestion: null, revealPayload: null, timer: null });
      }

      const d1 = Math.floor(Math.random() * 6) + 1;
      const d2 = Math.floor(Math.random() * 6) + 1;
      const roll = d1 + d2;
      setRoomState((prev) => {
        if (!prev || !prev.diceRaceState) return prev;
        const curTurnId = prev.diceRaceState.currentTurnTeamId;
        if (!curTurnId) return prev;

        const landingResult = handleDiceRaceLanding({
          diceState: prev.diceRaceState,
          teamId: curTurnId,
          roll,
        });

        const finalPos = landingResult.finalPosition;
        const isExtra = landingResult.grantAnotherRoll;

        const updatedPositions = {
          ...prev.diceRaceState.teamPositions,
          [curTurnId]: {
            ...prev.diceRaceState.teamPositions[curTurnId],
            position: finalPos,
            hasShield: landingResult.hasShield,
            extraRollGranted: isExtra,
          },
        };

        const teamIds = Object.keys(updatedPositions);
        const curIdx = teamIds.indexOf(curTurnId);
        const nextTeamId = isExtra ? curTurnId : teamIds[(curIdx + 1) % teamIds.length];
        const nextTeamName = prev.teams.find((t) => t.id === nextTeamId)?.name;

        // Điểm theo vị trí ô: ô xuất phát #1 = 1 điểm, finalPos 0-indexed => newScore = finalPos + 1
        const newScore = finalPos + 1;
        const updatedTeams = prev.teams.map((t) =>
          t.id === curTurnId ? { ...t, score: newScore } : t
        );
        const updatedPlayers = prev.players.map((p) =>
          p.teamId === curTurnId ? { ...p, score: newScore } : p
        );

        addLog(`🎲 [${prev.diceRaceState.currentTurnTeamName}] ${landingResult.effectMessage}`);

        const nextDiceRaceState: DiceRaceState = {
          ...prev.diceRaceState,
          lastDiceRoll: roll,
          lastDiceValues: [d1, d2],
          rollTimestamp: Date.now(),
          teamPositions: updatedPositions,
          currentTurnTeamId: nextTeamId,
          currentTurnTeamName: nextTeamName,
          canRollDice: isExtra ? true : false,
          extraRollGranted: isExtra,
        };

        let nextStatus = prev.status;
        const hasFinished = finalPos >= prev.diceRaceState.totalTiles - 1;
        if (hasFinished) {
          nextStatus = "FINISHED";
          const sortedTeams = [...updatedTeams].sort((a, b) => b.score - a.score);
          const leaderboard = sortedTeams.map((t, idx) => ({
            rank: idx + 1,
            teamId: t.id,
            name: t.name,
            score: t.score,
            correctAnswers: 0,
            totalAnswers: 0,
          }));
          syncToIframes({ gameEnd: { leaderboard } });
          addLog(`🏆 Đội [${prev.diceRaceState.currentTurnTeamName}] đã cán đích chiến thắng! Trận đấu kết thúc!`);
        }

        const nextRoomState: RoomState = {
          ...prev,
          status: nextStatus,
          teams: updatedTeams,
          players: updatedPlayers,
          diceRaceState: nextDiceRaceState,
        };

        syncToIframes({
          roomState: nextRoomState,
          diceState: nextDiceRaceState,
          scores: [{ teamId: curTurnId, score: newScore, delta: roll }],
        });

        return nextRoomState;
      });
      return;
    }

    adminSocketRef.current?.emit("admin:dice:roll:manual");
    addLog("Admin: Tung xúc xắc thay cho đội hiện tại");
  };

  const handleGridAdvanceNow = () => {
    if (isOfflineSandbox) {
      setCurrentQuestion(null);
      setRevealPayload(null);
      addLog("Admin: Quay về bảng ô");
      return;
    }

    adminSocketRef.current?.emit("admin:grid:advance_now");
    addLog("Admin: Quay về bảng ô");
  };

  const handleDiceAdvanceToBoard = () => {
    if (isOfflineSandbox) {
      setCurrentQuestion(null);
      setRevealPayload(null);
      setTimer(null);
      setRoomState((prev) => {
        if (!prev) return prev;
        const nextDice = prev.diceRaceState
          ? { ...prev.diceRaceState }
          : undefined;
        return { ...prev, diceRaceState: nextDice };
      });
      addLog("Admin: Đã chuyển sang bàn cờ đường đua!");
      return;
    }

    adminSocketRef.current?.emit("admin:dice:advance_to_board", { code });
    addLog("Admin: Chuyển sang bàn cờ đường đua");
  };

  const handleGridLaunchQuestion = () => {
    if (isOfflineSandbox) {
      handleAdminNext();
      return;
    }

    adminSocketRef.current?.emit("admin:grid:launch_question");
    addLog("Admin: Hiện câu hỏi ô đã chọn");
  };

  const handleGridPreviewStart = () => {
    if (isOfflineSandbox) {
      setRoomState((prev) => prev?.gridCaroState ? { ...prev, gridCaroState: { ...prev.gridCaroState, previewActive: true } } : prev);
      addLog("Admin: Xem độ khó 5s");
      return;
    }

    adminSocketRef.current?.emit("admin:grid:preview:start");
    addLog("Admin: Xem độ khó 5s");
  };

  const handleGridPreviewStop = () => {
    if (isOfflineSandbox) {
      setRoomState((prev) => prev?.gridCaroState ? { ...prev, gridCaroState: { ...prev.gridCaroState, previewActive: false } } : prev);
      addLog("Admin: Dừng xem độ khó");
      return;
    }

    adminSocketRef.current?.emit("admin:grid:preview:stop");
    addLog("Admin: Dừng xem độ khó");
  };

  // Score adjust cheat / manual override
  const handleAdjustScore = (teamId: string, delta?: number, setScore?: number) => {
    if (isOfflineSandbox) {
      setRoomState((prev) => {
        if (!prev) return prev;
        const updatedTeams = prev.teams.map((t) => {
          if (t.id !== teamId) return t;
          const newScore = setScore !== undefined ? Math.max(0, setScore) : Math.max(0, t.score + (delta || 0));
          return { ...t, score: newScore };
        });
        const next = { ...prev, teams: updatedTeams };
        roomStateRef.current = next;
        syncToIframes({ roomState: next });
        return next;
      });
      addLog(`Chỉnh điểm đội ${teamId}: delta=${delta ?? "N/A"}, setScore=${setScore ?? "N/A"}`);
      return;
    }

    adminSocketRef.current?.emit("admin:sandbox:adjust_score" as any, { teamId, delta, setScore, code });
    addLog(`Chỉnh điểm đội ${teamId}: delta=${delta ?? "N/A"}, setScore=${setScore ?? "N/A"}`);
  };

  // ── Auto-advance Tie-Breaker Intro -> Question ───────────────────────────
  useEffect(() => {
    if (sandboxTieBreaker?.status === "INTRO") {
      const t = setTimeout(() => {
        setSandboxTieBreaker((prev) =>
          prev?.status === "INTRO" ? { ...prev, status: "QUESTION_ACTIVE" } : prev
        );
      }, 3500);
      return () => clearTimeout(t);
    }
  }, [sandboxTieBreaker?.status]);

  // ── Toggle Tie-Breaker (Sudden Death) Simulation ─────────────────────────
  const handleToggleTestTieBreaker = () => {
    if (sandboxTieBreaker) {
      setSandboxTieBreaker(null);
      addLog("⚔️ Đã đóng màn hình Test Tie-Breaker");
      return;
    }

    const sortedTeams = [...stableTeams].sort((a, b) => b.score - a.score);
    const topTeams = sortedTeams.length >= 2 ? sortedTeams.slice(0, 2) : stableTeams.slice(0, 2);
    const tiedTeams: TieBreakerTeam[] = topTeams.map((t) => ({
      id: t.id,
      name: t.name,
      color: t.color || "#6366f1",
      avatar: t.avatar,
      score: Math.max(t.score, 100),
    }));

    const mockQuestions = [
      {
        id: "TB_Q1",
        content: "Thủ đô của quốc gia nào được mệnh danh là 'Thành phố Ánh Sáng'?",
        options: [
          { id: "A", text: "Paris (Pháp)" },
          { id: "B", text: "Rome (Ý)" },
          { id: "C", text: "Tokyo (Nhật Bản)" },
          { id: "D", text: "London (Anh)" },
        ],
        correctOptionId: "A",
        explanation: "Thành phố nổi tiếng với tháp Eiffel và dòng sông Seine thơ mộng.",
        timeLimit: 15,
      },
      {
        id: "TB_Q2",
        content: "Đại dương nào có diện tích lớn nhất trên Trái Đất?",
        options: [
          { id: "A", text: "Đại Tây Dương" },
          { id: "B", text: "Thái Bình Dương" },
          { id: "C", text: "Ấn Độ Dương" },
          { id: "D", text: "Bắc Băng Dương" },
        ],
        correctOptionId: "B",
        explanation: "Chiếm khoảng một phần ba bề mặt Trái Đất.",
        timeLimit: 15,
      },
      {
        id: "TB_Q3",
        content: "Bảng tuần hoàn các nguyên tố hóa học đầu tiên do nhà khoa học nào phát minh ra?",
        options: [
          { id: "A", text: "Dmitri Mendeleev" },
          { id: "B", text: "Marie Curie" },
          { id: "C", text: "Albert Einstein" },
          { id: "D", text: "Isaac Newton" },
        ],
        correctOptionId: "A",
        explanation: "Nhà hóa học người Nga sinh năm 1834 phát minh ra bảng tuần hoàn.",
        timeLimit: 15,
      },
    ];

    const initialTB: TieBreakerState = {
      roomId: code || "sandbox_tb",
      roomCode: code || "SANDBOX",
      status: "INTRO",
      tiedTeams,
      questions: mockQuestions,
      questionIndex: 0,
      maxQuestions: 3,
      currentQuestion: mockQuestions[0],
      attemptedTeamIds: [],
    };
    setSandboxTieBreaker(initialTB);
    addLog(`⚔️ Đã kích hoạt mô phỏng Tie-Breaker Đột Tử giữa [${tiedTeams[0]?.name}] và [${tiedTeams[1]?.name}]`);
  };

  // ── Bot / Active Team Manual Actions ────────────────────────────────────────
  const handleWagerLaunchQuestion = () => {
    if (isOfflineSandbox) {
      if (!roomState?.wagerState) return;
      const updatedWager: WagerState = {
        ...roomState.wagerState,
        phase: "QUESTION_PERIOD",
        questionReady: true,
      };
      setRoomState((prev) => prev ? { ...prev, wagerState: updatedWager } : prev);
      const q = offlineQuestionsRef.current[offlineQIndexRef.current] || DEFAULT_OFFLINE_BANK.questions![0];
      if (q) {
        const timeLimit = quantizeOlympiaTimeLimit(q.points || 10, q.timeLimit);
        const winningTeamId = updatedWager.lastWagerTeamId;
        const winningTeam = stableTeams.find((t) => t.id === winningTeamId);
        const qState: QuestionState = {
          question: {
            id: q.id || `q_${offlineQIndexRef.current + 1}`,
            type: q.type || "MC_SINGLE",
            content: q.content,
            options: q.options?.map((o: any) => ({ id: o.id, text: o.text, isCorrect: o.isCorrect })),
            points: q.points || 10,
            timeLimit,
            hint: q.hint,
            order: offlineQIndexRef.current + 1,
          },
          timeLimit,
          startedAt: Date.now(),
          serverTime: Date.now(),
          activeBoosts: [],
          timerPending: true,
          timerStarted: false,
          buzzUnlocked: true,
          buzzUnlockMode: "MANUAL",
          answerSubmissionMode: roomState?.config.answerSubmissionMode || "ALLOW_CHANGE",
          totalParticipantsCount: roomState?.teams.length || 4,
          primaryTeamId: winningTeamId,
          primaryTeamName: winningTeam?.name || updatedWager.autoAssignedTeamName || "Đội cược",
        };
        setCurrentQuestion(qState);
        syncToIframes({ currentQuestion: qState, roomState: { ...roomState, wagerState: updatedWager } });
      }
      addLog("Admin: Mở câu hỏi cược cho thí sinh");
      return;
    }

    adminSocketRef.current?.emit("admin:wager:launch_question");
    addLog("Admin: Mở câu hỏi cược cho thí sinh (admin:wager:launch_question)");
  };
  handleWagerLaunchQuestionRef.current = handleWagerLaunchQuestion;

  const handleForceActiveTeamAnswer = (isCorrect: boolean) => {
    if (!currentQuestion || !currentTeam) return;
    const rawOpts = (adminQuestionDataRef.current?.questionId === currentQuestion.question.id
      ? adminQuestionDataRef.current.options
      : null) || (currentQuestion.question.options as any[]) || [];
    if (rawOpts.length === 0) return;

    const correctOpt = rawOpts.find((o: any) => o.isCorrect) || rawOpts[0];
    const wrongOpts = rawOpts.filter((o: any) => !o.isCorrect);
    const wrongOpt = wrongOpts.length > 0
      ? wrongOpts[0]
      : (rawOpts.find((o: any) => o.id !== correctOpt.id) || rawOpts[rawOpts.length - 1]);
    const opt = isCorrect ? correctOpt : wrongOpt;

    if (isOfflineSandbox) {
      const timeLimit = currentQuestion.timeLimit || 30;
      const remaining = offlineRemainingRef.current !== undefined ? offlineRemainingRef.current : (timer?.remaining ?? timeLimit);
      const timeSpentMs = Math.max(500, (timeLimit - remaining) * 1000);
      const base = getBasePointsForMode(currentQuestion.question.points || 10, selectedMode);
      let awarded = 0;
      if (isCorrect) {
        if (selectedMode === "CLASSIC" || selectedMode === "ELIMINATION") {
          const ratio = Math.max(0, 1 - timeSpentMs / (timeLimit * 1000));
          awarded = Math.round(base * 0.5) + Math.round(base * 0.5 * ratio);
        } else {
          awarded = base;
        }
      }
      offlineAnswersRef.current.set(currentTeam.id, {
        answer: opt.id,
        isCorrect,
        points: awarded,
        timeSpent: timeSpentMs,
      });
      addLog(`[${currentTeam.name}] nộp đáp án: ${isCorrect ? "ĐÚNG" : "SAI"}`);
      return;
    }

    // Direct submit via admin to ensure reliable recording in the backend
    adminSocketRef.current?.emit("admin:submit:answer", {
      questionId: currentQuestion.question.id,
      teamId: currentTeam.id,
      answer: opt.id,
      code,
    });

    playerIframeRef.current?.contentWindow?.postMessage(
      {
        type: "FORCE_TESTER_ACTION",
        action: "answer",
        answer: opt.id,
        isCorrect,
        teamId: currentTeam.id,
        teamIndex: activeTeamIndex,
      },
      "*"
    );
    addLog(`[${currentTeam.name}] nộp đáp án: ${isCorrect ? "ĐÚNG" : "SAI"} (${opt.text || opt.id})`);
  };

  const handleForceActiveTeamBuzz = () => {
    if (!currentTeam) return;

    if (isOfflineSandbox) {
      setCurrentQuestion((prev) => prev ? { ...prev, buzzedTeamId: currentTeam.id, buzzedTeamName: currentTeam.name } : prev);
      addLog(`[${currentTeam.name}] bấm Buzz!`);
      return;
    }

    playerIframeRef.current?.contentWindow?.postMessage(
      {
        type: "FORCE_TESTER_ACTION",
        action: "buzz",
      },
      "*"
    );
    addLog(`[${currentTeam.name}] bấm Buzz qua điện thoại!`);
  };

  const handleForceActiveTeamWager = (amount: number) => {
    if (!currentTeam) return;
    if (roomState?.wagerState?.previousQuestionWagerTeamId === currentTeam.id) {
      addLog(`⚠️ Đội [${currentTeam.name}] đã cược ở câu trước nên tạm nghỉ cược câu này!`);
      return;
    }
    if (isOfflineSandbox) {
      processOfflineWager(currentTeam.id, amount);
      return;
    }

    playerIframeRef.current?.contentWindow?.postMessage(
      {
        type: "FORCE_TESTER_ACTION",
        action: "wager",
        amount,
      },
      "*"
    );
    addLog(`[${currentTeam.name}] cược ${amount}đ qua điện thoại`);
  };

  const handleTriggerAllBotsAnswer = () => {
    if (!currentQuestion) return;
    const rawOpts = (adminQuestionDataRef.current?.questionId === currentQuestion.question.id
      ? adminQuestionDataRef.current.options
      : null) || (currentQuestion.question.options as any[]) || [];
    if (rawOpts.length === 0) return;

    const correctOpt = rawOpts.find((o: any) => o.isCorrect) || rawOpts[0];
    const wrongOpts = rawOpts.filter((o: any) => !o.isCorrect);
    const wrongOpt = wrongOpts.length > 0
      ? wrongOpts[0]
      : (rawOpts.find((o: any) => o.id !== correctOpt.id) || rawOpts[rawOpts.length - 1]);

    if (isOfflineSandbox) {
      (roomState?.teams || []).forEach((t) => {
        if (t.id === (currentTeam?.id || stableTeams[0]?.id)) return;
        const isBotCorrect = Math.random() < 0.75;
        const opt = isBotCorrect ? correctOpt : wrongOpt;
        const isCorrect = isBotCorrect;
        const timeLimit = currentQuestion.timeLimit || 30;
        const botTimeSpentMs = Math.floor(1200 + Math.random() * 3300);
        const base = getBasePointsForMode(currentQuestion.question.points || 10, selectedMode);
        let awarded = 0;
        if (isCorrect) {
          if (selectedMode === "CLASSIC" || selectedMode === "ELIMINATION") {
            const ratio = Math.max(0, 1 - botTimeSpentMs / (timeLimit * 1000));
            awarded = base + Math.round(base * 0.5 * ratio);
          } else {
            awarded = base;
          }
        }
        offlineAnswersRef.current.set(t.id, {
          answer: opt.id,
          isCorrect,
          points: awarded,
          timeSpent: botTimeSpentMs,
        });
        offlineFinalizedActorsRef.current.add(t.id);
        addLog(`🤖 Cho Bot [${t.name}] nộp đáp án: ${opt.text || opt.id}`);
      });
      checkOfflineEarlyCompletion();
      return;
    }

    const humanTeamId = activeTeamIdRef.current || stableTeams[activeTeamIndex]?.id || currentTeam?.id;
    botSocketsRef.current.forEach((sock, bTeamId) => {
      if (bTeamId === humanTeamId) return;
      const isBotCorrect = Math.random() < 0.75;
      const opt = isBotCorrect ? correctOpt : wrongOpt;
      sock.emit("game:answer:submit", {
        questionId: currentQuestion.question.id,
        answer: opt.id,
        teamId: bTeamId,
      });
      sock.emit("game:answer:finalize", {
        questionId: currentQuestion.question.id,
        answer: opt.id,
        teamId: bTeamId,
      });
      const tName = roomState?.teams.find((t) => t.id === bTeamId)?.name;
      addLog(`🤖 Cho Bot [${tName || bTeamId}] nộp & chốt đáp án: ${opt.text || opt.id}`);
    });
  };



  const handleSwitchActiveTeam = (idx: number) => {
    setActiveTeamIndex(idx);
    const targetTeam = stableTeams[idx];
    if (!targetTeam) return;
    activeTeamIdRef.current = targetTeam.id;
    if (!isOfflineSandbox) {
      adminSocketRef.current?.emit("admin:sandbox:set_active_team", {
        teamId: targetTeam.id,
        teamIndex: idx,
        code,
      });
    }

    const targetName = idx === 0 ? "Bạn (Tester)" : `Bạn (Tester - ${targetTeam.name})`;
    const isQuestionActive = Boolean(currentQuestion && !revealPayload);
    const targetAnswer = isQuestionActive
      ? (isOfflineSandbox
          ? (offlineAnswersRef.current.get(targetTeam.id)?.answer || null)
          : (teamSelectedAnswers[targetTeam.id] || null))
      : null;

    const allAnswers = isQuestionActive
      ? (isOfflineSandbox
          ? Object.fromEntries(
              Array.from(offlineAnswersRef.current.entries()).map(([tid, val]) => [tid, val.answer])
            )
          : teamSelectedAnswers)
      : {};

    playerIframeRef.current?.contentWindow?.postMessage(
      {
        type: "SWITCH_ACTIVE_TEAM",
        teamId: targetTeam.id,
        teamName: targetName,
        teamIndex: idx,
        currentAnswer: targetAnswer,
        allTeamAnswers: allAnswers,
        roomState,
        currentQuestion,
        timer,
        revealPayload,
        payload: {
          teamId: targetTeam.id,
          teamName: targetName,
          teamIndex: idx,
          currentAnswer: targetAnswer,
        },
      },
      "*"
    );
    addLog(`📱 Chuyển thiết bị điện thoại sang điều khiển: [${targetTeam.name}] (Bot đội này tạm dừng)`);
  };

  const handleGrantCard = async () => {
    if (!roomState || !grantTargetTeamId) return;
    const currentModeAllowed = getDefaultAllowedPowerupsForMode((roomState.mode || "CLASSIC") as GameMode);
    if (!currentModeAllowed.includes(grantCardType)) {
      alert(`Thẻ [${grantCardType}] không được phép sử dụng trong chế độ ${roomState.mode}!`);
      return;
    }
    if (isOfflineSandbox) {
      setRoomState((prev) => {
        if (!prev) return prev;
        const newCard = {
          id: `card_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          type: grantCardType,
          ownerType: "TEAM" as const,
          teamId: grantTargetTeamId,
          used: false,
        };
        const updatedTeams = prev.teams.map((t) =>
          t.id === grantTargetTeamId ? { ...t, cards: [...t.cards, newCard] } : t
        );
        const nextState = { ...prev, teams: updatedTeams };
        roomStateRef.current = nextState;
        syncToIframes({ roomState: nextState });
        return nextState;
      });
      addLog(`Đã cấp thẻ [${grantCardType}] cho Đội ID: ${grantTargetTeamId}`);
      setShowCardModal(false);
      return;
    }

    adminSocketRef.current?.emit("admin:sandbox:grant:card", {
      teamId: grantTargetTeamId,
      cardType: grantCardType,
    });
    addLog(`Đã cấp thẻ [${grantCardType}] cho Đội ID: ${grantTargetTeamId}`);
    setShowCardModal(false);
  };

  const renderQuickMcAction = () => {
    if (matchStarting || questionPrepare) {
      return (
        <button
          type="button"
          onClick={handleSkipPrepare}
          className="px-2 py-0.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-black text-[10px] animate-pulse flex items-center gap-1 shadow cursor-pointer whitespace-nowrap"
          title="Bỏ qua đếm ngược chuẩn bị"
        >
          <span>⚡ Bỏ qua 3s</span>
        </button>
      );
    }
    if (currentQuestion?.timerPending) {
      return (
        <button
          type="button"
          onClick={handleStartTimer}
          className="px-2 py-0.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-black text-[10px] animate-pulse flex items-center gap-1 shadow cursor-pointer whitespace-nowrap"
          title="Bắt đầu tính giờ câu hỏi"
        >
          <span>⏱️ Bắt đầu giờ</span>
        </button>
      );
    }
    if (roomState?.mode === "GRID_CARO" && !currentQuestion && roomState.gridCaroState?.selectedCellId) {
      return (
        <button
          type="button"
          onClick={handleGridLaunchQuestion}
          className="px-2 py-0.5 rounded-lg bg-gradient-to-r from-purple-600 to-cyan-600 text-white font-black text-[10px] animate-pulse flex items-center gap-1 shadow cursor-pointer whitespace-nowrap"
        >
          <span>📖 Hiện câu #{roomState.gridCaroState.selectedCellId}</span>
        </button>
      );
    }
    if (roomState?.mode === "DICE_RACE" && roomState?.diceRaceState?.canRollDice && (!currentQuestion || revealPayload)) {
      return (
        <button
          type="button"
          onClick={handleDiceRollManual}
          className="px-2 py-0.5 rounded-lg bg-gradient-to-r from-amber-400 to-yellow-500 text-black font-black text-[10px] animate-pulse flex items-center gap-1 shadow cursor-pointer whitespace-nowrap"
        >
          <span>🎲 Tung xúc xắc</span>
        </button>
      );
    }
    if (currentQuestion && !revealPayload) {
      return (
        <button
          type="button"
          onClick={handleAdminReveal}
          className="px-2 py-0.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-black text-[10px] animate-pulse flex items-center gap-1 shadow cursor-pointer whitespace-nowrap"
          title="Công bố kết quả câu hỏi"
        >
          <span>👁️ Công bố</span>
        </button>
      );
    }
    if (revealPayload || (!currentQuestion && roomState?.status === "PLAYING")) {
      return (
        <button
          type="button"
          onClick={handleAdminNext}
          className="px-2 py-0.5 rounded-lg bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 text-white font-black text-[10px] shadow cursor-pointer whitespace-nowrap flex items-center gap-1"
          title="Chuyển sang câu hỏi kế tiếp"
        >
          <span>⏩ Câu kế</span>
        </button>
      );
    }
    if (!currentQuestion && roomState?.status === "LOBBY") {
      return (
        <button
          type="button"
          onClick={handleAdminNext}
          className="px-2 py-0.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-black text-[10px] shadow cursor-pointer whitespace-nowrap flex items-center gap-1"
          title="Bắt đầu trận đấu"
        >
          <span>🚀 Bắt đầu</span>
        </button>
      );
    }
    return null;
  };

  return (
    <div
      className="h-full max-h-full flex flex-col min-h-0 gap-1.5 sm:gap-2 overflow-hidden relative"
      onClick={() => { if (showSettingsDropdown) setShowSettingsDropdown(false); if (showCheatDropdown) setShowCheatDropdown(false); }}
    >
      {/* ── Holographic 3D Arena Mode Launch Transition (110% Screen Wipe) ── */}
      <ArenaModeLaunchTransition
        isOpen={isLaunchingAnim}
        isReady={isLaunchReady}
        mode={launchingMeta?.mode || selectedMode}
        modeName={launchingMeta?.name || selectedMode}
        sourceRect={launchSourceRect}
        onComplete={() => {
          setIsLaunchingAnim(false);
          setIsLaunchReady(false);
          setCreating(false);
        }}
      />

      {/* ── Top Header Controls (Compact Single-Bar) ─────────────────── */}
      <div className="glass rounded-xl px-2.5 py-1.5 sm:px-3 sm:py-2 border border-white/10 flex flex-wrap items-center justify-between gap-1.5 sm:gap-2 shadow-lg shrink-0 bg-[#121424]">
        <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-gradient-to-br from-purple-600 to-cyan-500 flex items-center justify-center text-sm sm:text-base shadow glow-purple shrink-0">
            🧪
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
              <span className="text-xs sm:text-sm font-black text-white whitespace-nowrap">Phòng Sandbox</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-bold whitespace-nowrap hidden md:inline" title="Môi trường thử nghiệm độc lập trên máy này, không hiển thị trong phòng đấu chính">
                🧪 Thử Nghiệm Độc Lập Trên Máy
              </span>
              {isOfflineSandbox && (
                <div className="flex items-center gap-1">
                  <span className="text-[10px] px-1.5 sm:px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold whitespace-nowrap">
                    ⚡ Offline
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      clearSandboxSession();
                      setCode("");
                      setIsOfflineSandbox(false);
                      setRoomState(null);
                      setCurrentQuestion(null);
                    }}
                    className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 font-bold whitespace-nowrap hidden lg:flex items-center gap-1 transition cursor-pointer"
                    title="Thoát chế độ ngoại tuyến và mở phòng online với bộ đề trên máy chủ"
                  >
                    <span>🌐</span>
                    <span>Online</span>
                  </button>
                </div>
              )}
              {code && (
                <div className="flex items-center gap-1 sm:gap-1.5 px-1.5 sm:px-2 py-0.5 rounded-lg bg-white/5 border border-purple-500/30 text-xs shrink-0">
                  <span className="text-muted-foreground text-[10px]">PIN:</span>
                  <span className="font-mono font-black text-cyan-300 text-xs">{code}</span>
                  <span className="text-purple-300 font-bold hidden sm:inline-flex items-center gap-1.5 text-[11px]">
                    <GameModeIcon mode={roomState?.mode || selectedMode} className="w-3.5 h-3.5 drop-shadow-sm" />
                    <span>{MODE_DISPLAY_NAMES[(roomState?.mode || selectedMode).toUpperCase()] || (roomState?.mode || selectedMode)}</span>
                  </span>
                  <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                    roomState?.status === "PLAYING" ? "bg-green-500/20 text-green-300" : roomState?.status ? "bg-yellow-500/20 text-yellow-300" : "bg-cyan-500/20 text-cyan-300 animate-pulse"
                  }`}>
                    {roomState?.status || "KẾT NỐI..."}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Mobile Segmented Viewport Switcher (< lg:) */}
        {code && (
          <div className="flex lg:hidden items-center p-0.5 rounded-xl bg-black/40 border border-white/10 shrink-0">
            <button
              type="button"
              onClick={() => setMobileTab("PLAYER")}
              className={`px-2 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                mobileTab === "PLAYER"
                  ? "bg-purple-600 text-white shadow"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <span>📱</span>
              <span>Thí sinh</span>
            </button>
            <button
              type="button"
              onClick={() => setMobileTab("DISPLAY")}
              className={`px-2 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                mobileTab === "DISPLAY"
                  ? "bg-cyan-600 text-white shadow"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <span>📺</span>
              <span>Màn chiếu</span>
            </button>
            <button
              type="button"
              onClick={() => setMobileTab("HOST")}
              className={`px-2 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                mobileTab === "HOST"
                  ? "bg-amber-600 text-white shadow"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <span>🎛️</span>
              <span>Quản trò</span>
            </button>
          </div>
        )}

        {/* Room Launch or Connected Status Controls */}
        <div className="flex items-center gap-1.5 flex-wrap justify-end">
          {!code ? (
            <div className="flex items-center gap-1.5 flex-wrap">
              <select
                value={selectedMode}
                onChange={(e) => setSelectedMode(e.target.value as GameMode)}
                className="px-2.5 py-1.5 rounded-lg glass border border-white/20 text-xs font-bold text-white bg-[#151728] focus:outline-none"
              >
                {AVAILABLE_MODES.map((m) => (
                  <option key={m.mode} value={m.mode}>
                    {m.emoji} {m.name} ({m.mode})
                  </option>
                ))}
              </select>

              <select
                value={selectedBankId}
                onChange={(e) => setSelectedBankId(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg glass border border-white/20 text-xs font-medium text-white bg-[#151728] focus:outline-none min-w-[140px] max-w-[200px] truncate"
              >
                {quizBanks.length === 0 ? (
                  <option value="">📚 Mặc định (25 câu)</option>
                ) : (
                  quizBanks.map((b) => (
                    <option key={b.id} value={b.id}>
                      📚 {b.title} ({b._count?.questions ?? 25}c)
                    </option>
                  ))
                )}
              </select>

              <button
                type="button"
                disabled={creating}
                onClick={() => handleLaunchSandbox()}
                className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white font-bold text-xs shadow transition active:scale-95 disabled:opacity-50 flex items-center gap-1 whitespace-nowrap cursor-pointer"
              >
                <span>⚡</span>
                <span>{creating ? "Đang tạo..." : "Chạy Sandbox"}</span>
              </button>

              <button
                type="button"
                onClick={handleLaunchOffline}
                className="px-2.5 py-1.5 rounded-lg glass hover:bg-amber-500/20 border border-amber-500/40 text-amber-300 font-bold text-xs shadow transition active:scale-95 flex items-center gap-1 whitespace-nowrap cursor-pointer"
                title="Chạy mô phỏng trực tiếp trên trình duyệt, không cần máy chủ mạng"
              >
                <span>🔌</span>
                <span>Offline</span>
              </button>

              <form onSubmit={handleConnectExisting} className="flex items-center gap-1 ml-1">
                <input
                  type="text"
                  placeholder="PIN 6 số"
                  value={inputCode}
                  onChange={(e) => setInputCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  className="w-20 px-2 py-1.5 rounded-lg glass border border-white/20 text-center font-mono font-bold text-xs text-white bg-[#151728]"
                />
                <button
                  type="submit"
                  disabled={inputCode.length !== 6}
                  className="px-2.5 py-1.5 rounded-lg glass hover:bg-white/10 text-white font-bold text-xs border border-white/20 disabled:opacity-40 whitespace-nowrap"
                >
                  Gắn
                </button>
              </form>
            </div>
          ) : (
            <>
              {/* Center Section: Primary Smart MC Flow (Desktop only, mobile has Host Tab & Quick MC Button) */}
              <div className="hidden lg:flex items-center gap-1.5 flex-wrap justify-center">
                {/* 0a. Skip Countdown (Match Starting or Question Prepare) */}
                {(matchStarting || questionPrepare) && (
                  <button
                    type="button"
                    onClick={handleSkipPrepare}
                    className="px-3 py-1 rounded-lg bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 text-black text-xs font-black shadow animate-pulse flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
                    title="Bỏ qua đếm ngược chuẩn bị"
                  >
                    <span>⚡</span>
                    <span>
                      Bỏ qua chuẩn bị ({matchStarting?.seconds ?? questionPrepare?.seconds ?? 3}s)
                    </span>
                  </button>
                )}

                {/* 0c. TOURNAMENT Mode Advance */}
                {roomState?.mode === "TOURNAMENT" && (
                  <button
                    type="button"
                    onClick={handleTournamentAdvance}
                    className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 text-white text-xs font-black shadow flex items-center gap-1 whitespace-nowrap cursor-pointer"
                    title="Chuyển sang trận tiếp theo trong nhánh đấu"
                  >
                    <span>{roomState?.tournamentState?.championTeamName ? "👑" : "➡️"}</span>
                    <span>
                      {roomState?.tournamentState?.championTeamName
                        ? `Vô địch: ${roomState.tournamentState.championTeamName}`
                        : "Trận kế (1v1)"}
                    </span>
                  </button>
                )}

                {/* 1. WAGER Mode Launch Question (when bidding ended but question not yet opened) */}
                {roomState?.mode === "WAGER" && roomState?.wagerState?.phase === "QUESTION_PERIOD" && !roomState?.wagerState?.questionReady && (
                  <button
                    type="button"
                    onClick={handleWagerLaunchQuestion}
                    className="px-3 py-1 rounded-lg bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-white font-black text-xs shadow-lg shadow-emerald-500/30 transition-all active:scale-95 animate-pulse flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>📢</span>
                    <span>Mở câu hỏi cược</span>
                  </button>
                )}

                {/* 1b. WAGER Mode Bailout Grant Button (When any team falls into bailout queue) */}
                {roomState?.mode === "WAGER" && roomState?.wagerState?.bailoutQueue && roomState.wagerState.bailoutQueue.length > 0 && (
                  <button
                    type="button"
                    disabled={roomState.wagerState.currentQuestionBailoutUsed}
                    onClick={() => handleGrantBailout(roomState.wagerState!.bailoutQueue![0].teamId)}
                    className={`px-3 py-1 rounded-lg text-xs font-black shadow flex items-center gap-1.5 whitespace-nowrap transition-all active:scale-95 cursor-pointer ${
                      roomState.wagerState.currentQuestionBailoutUsed
                        ? "bg-slate-700/50 text-slate-400 border border-slate-600/40 cursor-not-allowed opacity-60"
                        : "bg-gradient-to-r from-rose-600 via-pink-600 to-amber-500 hover:from-rose-500 hover:to-amber-400 text-white shadow-rose-500/30 animate-pulse border border-rose-400/50"
                    }`}
                    title={
                      roomState.wagerState.currentQuestionBailoutUsed
                        ? "Đã cấp cứu trợ trong câu này. Đội tiếp theo sẽ được cứu ở câu kế tiếp."
                        : `Cấp trợ cấp hồi sinh cho ${roomState.wagerState.bailoutQueue[0].teamName}`
                    }
                  >
                    <span>🆘</span>
                    <span>
                      {roomState.wagerState.currentQuestionBailoutUsed
                        ? "Đã cứu câu này (Chờ câu sau)"
                        : `Cứu trợ: ${roomState.wagerState.bailoutQueue[0].teamName}`}
                    </span>
                  </button>
                )}

                {/* 2. Start Timer if pending */}
                {currentQuestion?.timerPending && selectedMode !== "MAGIC_WHEEL" && (
                  <button
                    type="button"
                    onClick={handleStartTimer}
                    className="px-3 py-1 rounded-lg bg-gradient-to-r from-amber-500 to-green-500 hover:from-amber-400 text-black text-xs font-black shadow animate-pulse flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
                  >
                    <span>⏱️</span>
                    <span>
                      {selectedMode === "BOUNCEBACK" && currentQuestion?.stealBuzzedTeamId
                        ? `Bắt đầu tính giờ cướp (${currentQuestion.stealBuzzedTeamName || "Đội cướp"})`
                        : selectedMode === "BUZZ" && currentQuestion?.buzzedTeamId
                        ? `Bắt đầu tính giờ (${currentQuestion.buzzedTeamName || "Đội chuông"})`
                        : "Bắt đầu tính giờ"}
                    </span>
                  </button>
                )}

                {/* 2b. MAGIC WHEEL Mode Dedicated Top Header Controls */}
                {selectedMode === "MAGIC_WHEEL" && (
                  roomState?.status === "LOBBY" ? (
                    <button
                      type="button"
                      onClick={handleAdminNext}
                      className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-500 hover:from-purple-500 hover:to-cyan-400 text-white text-xs font-black shadow-lg shadow-purple-500/30 animate-pulse transition active:scale-95 flex items-center gap-1.5 whitespace-nowrap cursor-pointer ring-2 ring-cyan-400 btn-tactile"
                      title="Bắt đầu trận đấu Chiếc Nón Kỳ Diệu"
                    >
                      <span>🚀</span>
                      <span>Bắt đầu trận</span>
                    </button>
                  ) : roomState?.status === "PLAYING" ? (
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <button
                        type="button"
                        onClick={handleMagicWheelQuickSpin}
                        className="px-2.5 py-1 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-300 hover:bg-amber-500/30 font-bold transition text-xs btn-tactile cursor-pointer shadow-sm flex items-center gap-1"
                        title="Quay nón cho đội hiện tại"
                      >
                        <span>🎡</span>
                        <span>Quay nón</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleMagicWheelPassTurn}
                        className="px-2.5 py-1 rounded-lg bg-blue-500/20 border border-blue-500/40 text-blue-300 hover:bg-blue-500/30 font-bold transition text-xs btn-tactile cursor-pointer shadow-sm flex items-center gap-1"
                        title="Chuyển lượt cho đội kế tiếp"
                      >
                        <span>⏭️</span>
                        <span>Đổi lượt</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleMagicWheelQuickRevealLetter}
                        className="px-2.5 py-1 rounded-lg bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/30 font-bold transition text-xs btn-tactile cursor-pointer shadow-sm flex items-center gap-1"
                        title="Mở nhanh 1 chữ cái ngẫu nhiên chưa lật"
                      >
                        <span>🔤</span>
                        <span>Mở chữ</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleMagicWheelTriggerLucky}
                        className="px-2.5 py-1 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/30 font-bold transition text-xs btn-tactile cursor-pointer shadow-sm flex items-center gap-1"
                        title="Kích hoạt ô May Mắn"
                      >
                        <span>🎁</span>
                        <span>May mắn</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleMagicWheelDirectSolve}
                        className="px-2.5 py-1 rounded-lg bg-purple-500/20 border border-purple-500/40 text-purple-300 hover:bg-purple-500/30 font-bold transition text-xs btn-tactile cursor-pointer shadow-sm flex items-center gap-1"
                        title="Đoán ô chữ chính xác"
                      >
                        <span>🎯</span>
                        <span>Đoán ô chữ</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleMagicWheelRevealAll}
                        className="px-2.5 py-1 rounded-lg bg-rose-500/20 border border-rose-500/40 text-rose-300 hover:bg-rose-500/30 font-bold transition text-xs btn-tactile cursor-pointer shadow-sm flex items-center gap-1"
                        title="Mở toàn bộ ô chữ hoàn thành vòng"
                      >
                        <span>💡</span>
                        <span>Mở hết</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleMagicWheelNextRound}
                        className="px-2.5 py-1 rounded-lg bg-yellow-500/20 border border-yellow-500/40 text-yellow-300 hover:bg-yellow-500/30 font-bold transition text-xs btn-tactile cursor-pointer shadow-sm flex items-center gap-1"
                        title="Chuyển nhanh sang vòng tiếp theo"
                      >
                        <span>⏩</span>
                        <span>Vòng kế</span>
                      </button>
                    </div>
                  ) : null
                )}

                {/* 3. Core Next / Start / Conclude Button */}
                {roomState?.mode === "GRID_CARO" && roomState?.status === "PLAYING" && !currentQuestion ? null : selectedMode === "MAGIC_WHEEL" ? null : (
                  (() => {
                    const targetTotal = getTargetTotalQuestions(
                      selectedMode,
                      roomState?.config,
                      roomState?.teams.length || 4,
                      offlineQuestionsRef.current.length || 25
                    );
                    const isLimitReached = (offlineQIndexRef.current + 1 >= targetTotal) || (offlineUsedQuestionIdsRef.current.size >= targetTotal);

                    if (roomState?.status === "PLAYING" && revealPayload && isLimitReached) {
                      return (
                        <button
                          type="button"
                          onClick={handleConcludeMatch}
                          className="px-3 py-1 rounded-lg bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 text-black text-xs font-black shadow-lg shadow-amber-500/30 border border-yellow-300 animate-pulse transition active:scale-95 flex items-center gap-1.5 whitespace-nowrap cursor-pointer ring-2 ring-yellow-400 btn-tactile"
                          title="Đã thi đủ số câu quy định theo luật, kết thúc và công bố giải"
                        >
                          <span className="text-sm">🏆</span>
                          <span>Tổng kết trận đấu & Trao giải (Đủ {targetTotal} câu)</span>
                        </button>
                      );
                    }

                    if (intermission) {
                      return (
                        <button
                          type="button"
                          onClick={handleAdminNext}
                          className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-500 hover:from-purple-500 hover:to-cyan-400 text-white text-xs font-black shadow-lg shadow-purple-500/30 animate-pulse transition active:scale-95 flex items-center gap-1.5 whitespace-nowrap cursor-pointer ring-2 ring-cyan-400 btn-tactile"
                          title="Vào ngay câu hỏi tiếp theo (0s delay, không chờ 3s)"
                        >
                          <span>🚀</span>
                          <span>Bắt đầu câu hỏi #{intermission.nextQuestionIndex + 1}</span>
                        </button>
                      );
                    }

                    return (
                      <button
                        type="button"
                        onClick={handleAdminNext}
                        className={`px-3 py-1 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-black shadow transition active:scale-95 flex items-center gap-1 whitespace-nowrap cursor-pointer btn-tactile ${
                          roomState?.mode === "DICE_RACE" && !currentQuestion && roomState?.status === "PLAYING"
                            ? "animate-pulse ring-2 ring-cyan-400 bg-gradient-to-r from-purple-600 to-cyan-600"
                            : ""
                        }`}
                      >
                        <span>
                          {!currentQuestion && roomState?.status === "LOBBY"
                            ? "🚀 Bắt đầu"
                            : roomState?.mode === "DICE_RACE" && !currentQuestion
                            ? "🎯 Hiện câu hỏi"
                            : revealPayload
                            ? "📊 Bảng điểm / Câu kế"
                            : "⏩ Câu kế"}
                        </span>
                      </button>
                    );
                  })()
                )}

                {/* 4. Reveal Button - Only when question is active and not yet revealed */}
                {currentQuestion && !revealPayload && selectedMode !== "MAGIC_WHEEL" && (
                  <button
                    type="button"
                    onClick={handleAdminReveal}
                    className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black shadow flex items-center gap-1 whitespace-nowrap cursor-pointer animate-pulse btn-tactile"
                  >
                    <span>👁️</span>
                    <span>Công bố đáp án</span>
                  </button>
                )}

                {/* 4b. Essay & Manual Grading Modal Trigger */}
                {revealPayload && (
                  <button
                    type="button"
                    onClick={() => setShowEssayModal(true)}
                    className="px-2.5 py-1 rounded-lg bg-emerald-600/30 hover:bg-emerald-600/50 border border-emerald-500/50 text-emerald-300 text-xs font-bold transition flex items-center gap-1 whitespace-nowrap cursor-pointer"
                    title="Chấm điểm câu tự luận hoặc điều chỉnh điểm"
                  >
                    <span>🪄</span>
                    <span>Chấm điểm ({revealPayload.answers?.length ?? 0})</span>
                  </button>
                )}

                {/* 4b2. Manual Score Edit Button (Always available for Admin/MC) */}
                <button
                  type="button"
                  onClick={() => {
                    const teamNames = stableTeams.map((t, i) => `${i + 1}. ${t.name} (${t.score}đ)`).join("\n");
                    const pick = window.prompt(`Chọn số thứ tự đội muốn sửa điểm (1-${stableTeams.length}):\n${teamNames}`);
                    if (pick !== null) {
                      const idx = parseInt(pick, 10) - 1;
                      if (idx >= 0 && idx < stableTeams.length) {
                        const target = stableTeams[idx];
                        const val = window.prompt(`Nhập điểm số mới cho ${target.name} (hiện tại: ${target.score}đ):`, String(target.score));
                        if (val !== null) {
                          const parsed = parseInt(val, 10);
                          if (!isNaN(parsed)) handleAdjustScore(target.id, undefined, Math.max(0, parsed));
                        }
                      }
                    }
                  }}
                  className="px-2.5 py-1 rounded-lg bg-amber-600/30 hover:bg-amber-600/50 border border-amber-500/50 text-amber-300 text-xs font-bold transition flex items-center gap-1 whitespace-nowrap cursor-pointer"
                  title="Chỉnh sửa điểm số thủ công cho bất kỳ đội nào (Đề phòng lỗi)"
                >
                  <span>✏️</span>
                  <span>Sửa điểm</span>
                </button>

                {/* 4b2. Test Tie-Breaker (Sudden Death) */}
                <button
                  type="button"
                  onClick={handleToggleTestTieBreaker}
                  className={`px-2.5 py-1 rounded-lg border text-xs font-bold transition flex items-center gap-1 whitespace-nowrap cursor-pointer ${
                    sandboxTieBreaker
                      ? "bg-red-600 border-red-400 text-white shadow-lg animate-pulse"
                      : "bg-red-600/30 hover:bg-red-600/50 border-red-500/50 text-red-300"
                  }`}
                  title="Kích hoạt mô phỏng câu hỏi phụ đột tử (Sudden Death buzz & Lucky Draw) để phân định ngôi vô địch"
                >
                  <span>⚔️</span>
                  <span>{sandboxTieBreaker ? "Đang Test Đột Tử" : "Test Tie-Breaker"}</span>
                </button>

                {/* 4c. MC Direct Answer Submission Trigger */}
                {currentQuestion && !revealPayload && currentQuestion.question.options && (
                  <button
                    type="button"
                    onClick={() => setShowDirectAnswerModal(true)}
                    className="px-2.5 py-1 rounded-lg bg-purple-600/30 hover:bg-purple-600/50 border border-purple-500/50 text-purple-300 text-xs font-bold transition flex items-center gap-1 whitespace-nowrap cursor-pointer"
                    title="MC nộp đáp án A/B/C/D trực tiếp hộ bất kỳ đội nào"
                  >
                    <span>🎙️</span>
                    <span>MC nộp hộ</span>
                  </button>
                )}

                {/* 4d. MC Cheat Sheet Quick Toggle */}
                {currentQuestion && adminQuestionData && adminQuestionData.questionId === currentQuestion.question.id && (
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowMcCheatSheet((prev) => !prev)}
                      className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-xs font-bold transition flex items-center gap-1 whitespace-nowrap cursor-pointer shadow-sm"
                      title="Xem nhanh phao đáp án và lời giải MC"
                    >
                      <span>🔑</span>
                      <span>Phao đáp án</span>
                    </button>
                    {showMcCheatSheet && (
                      <>
                        <div
                          className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[1px]"
                          onClick={() => setShowMcCheatSheet(false)}
                        />
                        <div className="absolute top-full mt-1.5 left-0 sm:left-auto sm:right-0 w-84 max-w-[90vw] p-3 rounded-2xl bg-[#151728]/98 border border-amber-500/50 shadow-2xl backdrop-blur-xl z-50 text-xs space-y-2 animate-fade-in text-white text-left ring-1 ring-amber-400/20">
                          <div className="flex items-center justify-between border-b border-amber-500/20 pb-1.5">
                            <div className="flex items-center gap-1.5 font-black text-amber-300">
                              <span>🔑</span>
                              <span>Phao đáp án & Lời giải MC</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => setShowMcCheatSheet(false)}
                              className="text-slate-400 hover:text-white text-xs px-1.5 py-0.5 rounded hover:bg-white/10 cursor-pointer"
                            >
                              ✕
                            </button>
                          </div>
                          <div className="space-y-1.5 max-h-[60vh] overflow-y-auto pr-1">
                            <div className="flex items-start gap-1.5">
                              <span className="font-semibold text-amber-200 shrink-0">Đáp án chuẩn:</span>
                              <span className="font-bold text-emerald-300">
                                {(() => {
                                  if (adminQuestionData.options && Array.isArray(adminQuestionData.options)) {
                                    const correctOpts = adminQuestionData.options.filter((o: any) => o.isCorrect);
                                    if (correctOpts.length > 0) return correctOpts.map((o: any) => o.text).join(", ");
                                  }
                                  if (adminQuestionData.answer) {
                                    return Array.isArray(adminQuestionData.answer)
                                      ? adminQuestionData.answer.join(", ")
                                      : String(adminQuestionData.answer);
                                  }
                                  return "Chưa có đáp án cấu hình";
                                })()}
                              </span>
                            </div>
                            {(adminQuestionData.explanation || currentQuestion.question.hint) && (
                              <div className="flex items-start gap-1.5">
                                <span className="font-semibold text-amber-200 shrink-0">💡 Giải thích MC:</span>
                                <span className="text-amber-100/90 leading-relaxed text-[11px]">
                                  {adminQuestionData.explanation || currentQuestion.question.hint}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* 5. Early Stop */}
                {currentQuestion && !revealPayload && (
                  <button
                    type="button"
                    onClick={handleAdminStopEarly}
                    disabled={Boolean(timer && timer.remaining <= 0)}
                    className="px-2 py-1 rounded-lg bg-rose-600/30 hover:bg-rose-600/50 border border-rose-500/40 text-rose-300 text-xs font-bold transition flex items-center gap-1 whitespace-nowrap cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
                    title="Dừng thời gian câu hỏi ngay lập tức"
                  >
                    <span>⏹️</span>
                    <span>Dừng sớm</span>
                  </button>
                )}

                {/* 6. Skip 1s */}
                {currentQuestion && !revealPayload && timer && timer.remaining > 1 && (
                  <button
                    type="button"
                    onClick={handleSkipTimerToOneSecond}
                    title="Giảm thời gian đếm ngược còn 1s"
                    className="px-2 py-1 rounded-lg glass hover:bg-white/10 border border-white/20 text-yellow-300 text-xs font-bold transition flex items-center gap-1 whitespace-nowrap cursor-pointer"
                  >
                    <span>⚡</span>
                    <span>Tua 1s</span>
                  </button>
                )}

                {/* Mode specific additions */}
                {roomState?.mode === "BUZZ" && currentQuestion && (
                  <>
                    {!currentQuestion.buzzUnlocked && (
                      <button
                        type="button"
                        onClick={handleBuzzUnlock}
                        className="px-2 py-1 rounded-lg bg-yellow-500 hover:bg-yellow-400 text-black text-xs font-black shadow animate-pulse flex items-center gap-1 whitespace-nowrap cursor-pointer"
                      >
                        <span>🔔</span>
                        <span>Mở chuông</span>
                      </button>
                    )}
                    {currentQuestion.buzzedTeamId && (
                      <div className="flex items-center gap-1">
                        {currentQuestion.question.type === "MC_SINGLE" || currentQuestion.question.type === "TRUE_FALSE" || currentQuestion.question.type === "MC_MULTI" ? (
                          <button
                            type="button"
                            onClick={() => handleBuzzStartAnswer(5)}
                            className="px-2 py-1 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-black shadow flex items-center gap-1 whitespace-nowrap cursor-pointer"
                          >
                            <span>⏱️ 5s</span>
                          </button>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => handleBuzzStartAnswer(10)}
                              className="px-1.5 py-1 rounded-lg bg-cyan-700 hover:bg-cyan-600 text-white text-[11px] font-bold shadow whitespace-nowrap cursor-pointer"
                            >
                              10s
                            </button>
                            <button
                              type="button"
                              onClick={() => handleBuzzStartAnswer(15)}
                              className="px-2 py-1 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-black shadow whitespace-nowrap cursor-pointer"
                            >
                              15s ⭐
                            </button>
                            <button
                              type="button"
                              onClick={() => handleBuzzStartAnswer(20)}
                              className="px-1.5 py-1 rounded-lg bg-cyan-700 hover:bg-cyan-600 text-white text-[11px] font-bold shadow whitespace-nowrap cursor-pointer"
                            >
                              20s
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </>
                )}

                {roomState?.mode === "BOUNCEBACK" && currentQuestion && (
                  <>
                    {currentQuestion.bouncebackSelectPhase && (
                      <div className="flex items-center gap-1 bg-blue-500/20 border border-blue-500/40 px-1 py-0.5 rounded-lg">
                        <span className="text-[10px] font-bold text-blue-300">Gói:</span>
                        {([10, 20, 30] as const).map((pts) => (
                          <button
                            key={pts}
                            type="button"
                            onClick={() => handleAdminBouncebackSelectPoints(pts)}
                            className="px-1.5 py-0.5 rounded bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-black shadow transition active:scale-95 cursor-pointer"
                          >
                            {pts}đ
                          </button>
                        ))}
                      </div>
                    )}
                    {!revealPayload && (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleBouncebackJudge(true)}
                          className="px-2 py-1 rounded-lg bg-green-600 hover:bg-green-500 text-white text-xs font-black shadow flex items-center gap-1 whitespace-nowrap active:scale-95 cursor-pointer"
                        >
                          <span>✓ {currentQuestion.stealBuzzedTeamId ? "CƯỚP ĐÚNG" : "ĐÚNG"}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleBouncebackJudge(false)}
                          className="px-2 py-1 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-black shadow flex items-center gap-1 whitespace-nowrap active:scale-95 cursor-pointer"
                        >
                          <span>✗ {currentQuestion.stealBuzzedTeamId ? "CƯỚP SAI" : "SAI"}</span>
                        </button>
                      </div>
                    )}
                    {!currentQuestion.stealBuzzedTeamId && !currentQuestion.isStealPhase && !revealPayload && (
                      <button
                        type="button"
                        onClick={handleBouncebackOpenSteal}
                        className="px-2 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-black text-xs font-black shadow flex items-center gap-1 whitespace-nowrap cursor-pointer"
                      >
                        <span>🔔 Mở cướp 5s</span>
                      </button>
                    )}
                    {currentQuestion.stealBuzzedTeamId && (
                      <button
                        type="button"
                        onClick={() => handleBouncebackStartStealAnswer(5)}
                        className="px-2 py-1 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-black shadow flex items-center gap-1 whitespace-nowrap cursor-pointer"
                      >
                        <span>⏱️ Cho cướp 5s</span>
                      </button>
                    )}
                  </>
                )}

                {roomState?.mode === "GRID_CARO" && (
                  <>
                    {!currentQuestion && roomState.gridCaroState?.selectedCellId && (
                      <button
                        type="button"
                        onClick={handleGridLaunchQuestion}
                        className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-purple-600 to-cyan-600 text-white text-xs font-black shadow animate-pulse flex items-center gap-1 whitespace-nowrap cursor-pointer"
                      >
                        <span>📖 Hiện câu #{roomState.gridCaroState.selectedCellId}</span>
                      </button>
                    )}
                    {!currentQuestion && !roomState.gridCaroState?.previewActive && !roomState.gridCaroState?.selectedCellId && (
                      <button
                        type="button"
                        onClick={handleGridPreviewStart}
                        className="px-2 py-1 rounded-lg glass hover:bg-white/10 border border-purple-500/40 text-purple-300 text-xs font-bold transition flex items-center gap-1 whitespace-nowrap cursor-pointer"
                      >
                        <span>👁️ Xem độ khó</span>
                      </button>
                    )}
                    {!currentQuestion && roomState.gridCaroState?.previewActive && (
                      <button
                        type="button"
                        onClick={handleGridPreviewStop}
                        className="px-2 py-1 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition flex items-center gap-1 whitespace-nowrap cursor-pointer"
                      >
                        <span>🙈 Lật úp</span>
                      </button>
                    )}
                    {revealPayload && (
                      <button
                        type="button"
                        onClick={handleGridAdvanceNow}
                        className="px-2 py-1 rounded-lg bg-gradient-to-r from-purple-600 to-cyan-600 text-white text-xs font-black shadow flex items-center gap-1 whitespace-nowrap cursor-pointer"
                      >
                        <span>🏁 Về bảng ô</span>
                      </button>
                    )}
                  </>
                )}

                {roomState?.mode === "DICE_RACE" && (
                  <>
                    {roomState?.diceRaceState?.canRollDice && (!currentQuestion || revealPayload) && (
                      <button
                        type="button"
                        onClick={handleDiceRollManual}
                        className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-300 text-black text-xs font-black shadow flex items-center gap-1 whitespace-nowrap animate-pulse cursor-pointer shadow-amber-500/30"
                      >
                        <span>🎲 Tung xúc xắc</span>
                      </button>
                    )}
                    {revealPayload && (
                      <button
                        type="button"
                        onClick={handleDiceAdvanceToBoard}
                        className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 text-black text-xs font-black shadow flex items-center gap-1 whitespace-nowrap animate-pulse cursor-pointer"
                      >
                        <span>🗺️ Về bàn cờ</span>
                      </button>
                    )}
                  </>
                )}

              </div>

              {/* Right Section: Studio Utilities */}
              <div className="flex items-center gap-1.5 shrink-0 justify-end">
                {/* Consolidated Utilities Dropdown */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowUtilitiesDropdown(!showUtilitiesDropdown)}
                    className={`px-2.5 py-1 rounded-lg border text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                      showUtilitiesDropdown
                        ? "bg-purple-600/30 border-purple-400/50 text-white shadow-sm"
                        : "glass border-white/10 text-muted-foreground hover:text-white"
                    }`}
                    title="Tiện ích hỗ trợ quản lý phòng và bot"
                  >
                    <span>🛠️</span>
                    <span className="whitespace-nowrap">Tiện ích</span>
                    <span className="text-[10px] text-muted-foreground">▾</span>
                  </button>

                  {showUtilitiesDropdown && (
                    <div
                      className="absolute right-0 top-full mt-1.5 z-50 w-56 rounded-2xl glass border border-white/20 bg-[#151728]/95 backdrop-blur-xl shadow-2xl p-2 flex flex-col gap-1 text-xs"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-between px-2 py-1 border-b border-white/10 mb-1">
                        <span className="font-black text-white text-[11px] uppercase tracking-wider">🛠️ Tiện ích phòng</span>
                        <button
                          type="button"
                          onClick={() => setShowUtilitiesDropdown(false)}
                          className="text-muted-foreground hover:text-white text-xs cursor-pointer"
                        >
                          ✕
                        </button>
                      </div>

                      {/* Bot Auto */}
                      <button
                        type="button"
                        onClick={() => setBotAutoEnabled(!botAutoEnabled)}
                        className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-white/10 transition cursor-pointer text-left"
                      >
                        <span className="flex items-center gap-2 text-slate-200">
                          <span>🤖</span> Bot tự động
                        </span>
                        <span className={`text-[10px] font-black px-1.5 py-0.5 rounded ${
                          botAutoEnabled ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" : "bg-white/10 text-slate-400"
                        }`}>
                          {botAutoEnabled ? "BẬT" : "TẮT"}
                        </span>
                      </button>

                      {/* Trigger All Bots */}
                      <button
                        type="button"
                        onClick={() => {
                          handleTriggerAllBotsAnswer();
                          setShowUtilitiesDropdown(false);
                        }}
                        disabled={!currentQuestion || !!revealPayload || Boolean(timer && timer.remaining <= 0)}
                        className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-white/10 transition cursor-pointer text-left disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <span className="flex items-center gap-2 text-slate-200">
                          <span>⚡</span> Bot nộp bài ngay
                        </span>
                        <span className="text-[10px] text-muted-foreground">Trigger</span>
                      </button>

                      {/* Auto-Timer */}
                      <button
                        type="button"
                        onClick={() => {
                          if (roomState) updateConfig("autoTimerStart", !roomState.config.autoTimerStart);
                        }}
                        disabled={!roomState}
                        className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-white/10 transition cursor-pointer text-left disabled:opacity-40"
                      >
                        <span className="flex items-center gap-2 text-slate-200">
                          <span>⏱️</span> Đếm tự động
                        </span>
                        <span className={`text-[10px] font-black px-1.5 py-0.5 rounded ${
                          roomState?.config.autoTimerStart ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30" : "bg-white/10 text-slate-400"
                        }`}>
                          {roomState?.config.autoTimerStart ? "BẬT" : "TẮT"}
                        </span>
                      </button>

                      <div className="h-px bg-white/10 my-1" />

                      {/* Rules */}
                      <button
                        type="button"
                        onClick={() => {
                          setShowRulesModal(true);
                          setShowUtilitiesDropdown(false);
                        }}
                        className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-white/10 text-cyan-300 transition cursor-pointer text-left"
                      >
                        <span>📖</span>
                        <span>Luật chơi</span>
                      </button>

                      {/* Grant Card */}
                      <button
                        type="button"
                        onClick={() => {
                          if (roomState?.teams && roomState.teams.length > 0) {
                            setGrantTargetTeamId(roomState.teams[0].id);
                          }
                          const currentModeAllowed = getDefaultAllowedPowerupsForMode((roomState?.mode || "CLASSIC") as GameMode);
                          if (!currentModeAllowed.includes(grantCardType)) {
                            setGrantCardType(currentModeAllowed[0] || "FIFTY_FIFTY");
                          }
                          setShowCardModal(true);
                          setShowUtilitiesDropdown(false);
                        }}
                        className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-white/10 text-purple-300 transition cursor-pointer text-left"
                      >
                        <span>🃏</span>
                        <span>Cấp thẻ bổ trợ</span>
                      </button>

                      {/* Logs */}
                      <button
                        type="button"
                        onClick={() => {
                          setShowLogsModal(true);
                          setShowUtilitiesDropdown(false);
                        }}
                        className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-white/10 text-amber-300 transition cursor-pointer text-left"
                      >
                        <span className="flex items-center gap-2">
                          <span>📜</span>
                          <span>Nhật ký</span>
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-slate-300">
                          {botLogs.length}
                        </span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Settings Dropdown (Request C) */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowSettingsDropdown(!showSettingsDropdown)}
                    disabled={!roomState}
                    className={`px-2.5 py-1 rounded-lg border text-xs font-bold transition flex items-center gap-1 shrink-0 cursor-pointer disabled:opacity-40 ${
                      showSettingsDropdown
                        ? "bg-slate-500/30 border-slate-400/50 text-white"
                        : "glass border-white/10 text-muted-foreground hover:text-white"
                    }`}
                    title="Cài đặt nâng cao cho chế độ hiện tại"
                  >
                    <span>⚙️</span>
                    <span className="whitespace-nowrap">Cài đặt</span>
                  </button>
                  {showSettingsDropdown && roomState && (
                    <div
                      className="absolute right-0 top-full mt-1 z-40 w-80 sm:w-96 max-h-[85vh] overflow-y-auto rounded-2xl glass border border-white/20 bg-[#151728]/98 shadow-2xl p-3 flex flex-col gap-2 text-xs"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-between border-b border-white/10 pb-1.5 mb-0.5">
                        <span className="font-black text-white text-[11px]">⚙️ Cài đặt — {roomState.mode}</span>
                        <button type="button" onClick={() => setShowSettingsDropdown(false)} className="text-muted-foreground hover:text-white text-[11px] cursor-pointer">✕</button>
                      </div>

                      {/* Penalty for wrong */}
                      <label className="flex items-center justify-between cursor-pointer gap-2">
                        <span className="text-slate-300">Trừ điểm khi sai</span>
                        <button
                          type="button"
                          onClick={() => updateConfig("penaltyForWrong", !roomState.config.penaltyForWrong)}
                          className={`w-10 h-5 rounded-full border transition-all relative ${roomState.config.penaltyForWrong ? "bg-red-500 border-red-400" : "bg-slate-700 border-slate-500"}`}
                        >
                          <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${roomState.config.penaltyForWrong ? "left-5" : "left-0.5"}`} />
                        </button>
                      </label>

                      {/* Time bonus */}
                      <label className="flex items-center justify-between cursor-pointer gap-2">
                        <span className="text-slate-300">Bonus thời gian còn lại</span>
                        <button
                          type="button"
                          onClick={() => updateConfig("timeBonusEnabled", !roomState.config.timeBonusEnabled)}
                          className={`w-10 h-5 rounded-full border transition-all relative ${roomState.config.timeBonusEnabled ? "bg-emerald-500 border-emerald-400" : "bg-slate-700 border-slate-500"}`}
                        >
                          <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${roomState.config.timeBonusEnabled ? "left-5" : "left-0.5"}`} />
                        </button>
                      </label>

                      {/* Answer submission mode */}
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-slate-300">Chế độ trả lời</span>
                        <select
                          value={roomState.config.answerSubmissionMode || "ALLOW_CHANGE"}
                          onChange={(e) => updateConfig("answerSubmissionMode", e.target.value as any)}
                          className="px-2 py-0.5 rounded-lg glass border border-white/20 text-white text-[11px] bg-[#0f0f1a] focus:outline-none"
                        >
                          <option value="ALLOW_CHANGE">Cho phép đổi</option>
                          <option value="SINGLE_SUBMIT">Bấm 1 lần duy nhất</option>
                        </select>
                      </div>

                      {/* Auto-timer (duplicate for settings panel) */}
                      <label className="flex items-center justify-between cursor-pointer gap-2">
                        <span className="text-slate-300">Đếm ngược tự động</span>
                        <button
                          type="button"
                          onClick={() => updateConfig("autoTimerStart", !roomState.config.autoTimerStart)}
                          className={`w-10 h-5 rounded-full border transition-all relative ${roomState.config.autoTimerStart ? "bg-cyan-500 border-cyan-400" : "bg-slate-700 border-slate-500"}`}
                        >
                          <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${roomState.config.autoTimerStart ? "left-5" : "left-0.5"}`} />
                        </button>
                      </label>

                      {/* Penalty points */}
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-slate-300">Mức trừ điểm</span>
                        <input
                          type="number"
                          min={0}
                          max={50}
                          value={roomState.config.penaltyPoints ?? 10}
                          onChange={(e) => updateConfig("penaltyPoints", Number(e.target.value))}
                          className="w-16 px-2 py-0.5 rounded-lg glass border border-white/20 text-white text-[11px] bg-[#0f0f1a] focus:outline-none text-right"
                        />
                      </div>

                      {roomState.mode === "WAGER" && (
                        <>
                          {/* Wager Betting Duration Setting */}
                          <div className="flex items-center justify-between gap-2 pt-1 border-t border-white/10">
                            <span className="text-slate-300">Thời gian cược</span>
                            <div className="flex items-center gap-1 flex-wrap justify-end">
                              {[10, 15, 20, 30, 45].map((sec) => (
                                <button
                                  key={sec}
                                  type="button"
                                  onClick={() => updateConfig("wagerTimeSeconds", sec)}
                                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold border transition cursor-pointer ${
                                    (roomState.config.wagerTimeSeconds ?? 15) === sec
                                      ? "bg-amber-500/30 border-amber-400 text-amber-300"
                                      : "glass border-white/10 text-slate-400 hover:text-white"
                                  }`}
                                >
                                  {sec}s
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Wager Max Bet Cap Multiplier (Cố định 5 mức chia hết cho 5: x1.0 - x3.0) */}
                          <div className="flex items-center justify-between gap-2 pt-1 border-t border-white/10">
                            <span className="text-slate-300">Trần cược</span>
                            <div className="flex items-center gap-1 flex-wrap justify-end">
                              {[1, 1.5, 2, 2.5, 3].map((mult) => (
                                <button
                                  key={mult}
                                  type="button"
                                  onClick={() => updateConfig("wagerMultiplierCap", mult)}
                                  className={`px-2 py-0.5 rounded text-[10px] font-bold border transition cursor-pointer ${
                                    (roomState.config.wagerMultiplierCap ?? 2.5) === mult
                                      ? "bg-amber-500/30 border-amber-400 text-amber-300 ring-1 ring-amber-400/50"
                                      : "glass border-white/10 text-slate-400 hover:text-white"
                                  }`}
                                >
                                  x{mult}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Wager Rounds Per Team */}
                          <div className="flex items-center justify-between gap-2 pt-1 border-t border-white/10">
                            <span className="text-slate-300">Số vòng thi/đội</span>
                            <div className="flex items-center gap-1">
                              {[1, 2, 3].map((r) => (
                                <button
                                  key={r}
                                  type="button"
                                  onClick={() => updateConfig("wagerRoundsPerTeam", r)}
                                  className={`px-2 py-0.5 rounded text-[10px] font-bold border transition cursor-pointer ${
                                    (roomState.config.wagerRoundsPerTeam ?? 2) === r
                                      ? "bg-amber-500/30 border-amber-400 text-amber-300"
                                      : "glass border-white/10 text-slate-400 hover:text-white"
                                  }`}
                                >
                                  {r} vòng
                                </button>
                              ))}
                            </div>
                          </div>

                          <div className="flex items-center justify-between gap-2 pt-1 border-t border-white/10">
                            <span className="text-slate-300">Giới hạn cứu trợ</span>
                            <div className="flex items-center gap-1">
                              {[1, 2, 3].map((limit) => (
                                <button
                                  key={limit}
                                  type="button"
                                  onClick={() => handleSetBailoutLimit(limit)}
                                  className={`px-2 py-0.5 rounded text-[10px] font-bold border transition cursor-pointer ${
                                    (roomState.config.wagerBailoutLimit ?? 1) === limit
                                      ? "bg-amber-500/30 border-amber-400 text-amber-300"
                                      : "glass border-white/10 text-slate-400 hover:text-white"
                                  }`}
                                >
                                  {limit} lần
                                </button>
                              ))}
                            </div>
                          </div>
                        </>
                      )}

                      {/* Bounceback Rounds (Cycles) */}
                      {roomState.mode === "BOUNCEBACK" && (
                        <div className="flex items-center justify-between gap-2 pt-1 border-t border-white/10">
                          <span className="text-slate-300">Số vòng thi/đội</span>
                          <div className="flex items-center gap-1">
                            {[1, 2].map((cycles) => (
                              <button
                                key={cycles}
                                type="button"
                                onClick={() => updateConfig("bouncebackCycles", cycles)}
                                className={`px-2 py-0.5 rounded text-[10px] font-bold border transition cursor-pointer ${
                                  (roomState.config.bouncebackCycles ?? 1) === cycles
                                    ? "bg-cyan-500/30 border-cyan-400 text-cyan-300"
                                    : "glass border-white/10 text-slate-400 hover:text-white"
                                }`}
                              >
                                {cycles} vòng
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Dice Race Max Questions Limit */}
                      {roomState.mode === "DICE_RACE" && (
                        <div className="flex items-center justify-between gap-2 pt-1 border-t border-white/10">
                          <span className="text-slate-300">Giới hạn câu đua</span>
                          <div className="flex items-center gap-1 flex-wrap justify-end">
                            {[8, 12, 16, 0].map((qLimit) => (
                              <button
                                key={qLimit}
                                type="button"
                                onClick={() => updateConfig("diceRaceMaxQuestions", qLimit)}
                                className={`px-1.5 py-0.5 rounded text-[10px] font-bold border transition cursor-pointer ${
                                  (roomState.config.diceRaceMaxQuestions ?? 0) === qLimit
                                    ? "bg-indigo-500/30 border-indigo-400 text-indigo-300"
                                    : "glass border-white/10 text-slate-400 hover:text-white"
                                }`}
                              >
                                {qLimit === 0 ? "Hết đề" : `${qLimit}c`}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Universal Match Max Questions (Tất cả các mode) */}
                      {(() => {
                        const isTeamMultipleMode = ["MYSTERY_QUEST", "WAGER", "BOUNCEBACK"].includes(roomState.mode);
                        const teamsCount = Math.max(1, roomState.teams.length || 4);
                        const currentMaxQ = roomState.config.matchMaxQuestions ?? 0;
                        const turnsPerTeam = currentMaxQ > 0 ? Math.floor(currentMaxQ / teamsCount) : 0;

                        const presetList = isTeamMultipleMode
                          ? [teamsCount * 1, teamsCount * 2, teamsCount * 3, teamsCount * 4, teamsCount * 5, 0]
                          : [5, 10, 12, 15, 20, 25, 0];

                        const handleSaveCustomMaxQuestions = (rawVal: number | string) => {
                          const num = Number(rawVal);
                          if (!rawVal || isNaN(num) || num <= 0) {
                            updateConfig("matchMaxQuestions", 0);
                            setCustomMaxQuestionsInput("");
                            return;
                          }
                          if (isTeamMultipleMode) {
                            const turns = Math.max(1, Math.round(num / teamsCount));
                            const snapped = turns * teamsCount;
                            updateConfig("matchMaxQuestions", snapped);
                            setCustomMaxQuestionsInput(String(snapped));
                            if (snapped !== num) {
                              addLog(`⚙️ Đã làm tròn số câu thành ${snapped} (${turns} lượt/đội × ${teamsCount} đội) cho chế độ ${roomState.mode}`);
                            }
                          } else {
                            updateConfig("matchMaxQuestions", num);
                            setCustomMaxQuestionsInput(String(num));
                          }
                        };

                        return (
                          <div className="space-y-1.5 pt-1.5 border-t border-white/10">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-1.5">
                                <span className="text-slate-300 font-bold">Tổng số câu hỏi</span>
                                <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full border ${
                                  isTeamMultipleMode
                                    ? "bg-amber-500/20 text-amber-300 border-amber-500/30"
                                    : "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
                                }`}>
                                  {isTeamMultipleMode ? `Bội số ${teamsCount} đội` : "Tất cả mode"}
                                </span>
                              </div>

                              {/* Numeric Input Field */}
                              <div className="flex items-center gap-1">
                                <input
                                  type="number"
                                  min={isTeamMultipleMode ? teamsCount : 1}
                                  step={isTeamMultipleMode ? teamsCount : 1}
                                  placeholder={isTeamMultipleMode ? `Bội ${teamsCount}` : "Số câu"}
                                  value={customMaxQuestionsInput}
                                  onChange={(e) => setCustomMaxQuestionsInput(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      handleSaveCustomMaxQuestions(customMaxQuestionsInput);
                                    }
                                  }}
                                  className="w-16 px-1.5 py-0.5 rounded-lg glass border border-white/20 text-white text-[11px] bg-[#0f0f1a] focus:outline-none text-right font-mono"
                                  title={isTeamMultipleMode ? `Nhập số câu (tự động làm tròn theo bội số ${teamsCount})` : "Nhập số câu hỏi tùy ý"}
                                />
                                <button
                                  type="button"
                                  onClick={() => handleSaveCustomMaxQuestions(customMaxQuestionsInput)}
                                  className="px-2 py-0.5 rounded bg-purple-600 hover:bg-purple-500 text-white text-[10px] font-bold transition active:scale-95 cursor-pointer"
                                  title="Lưu số câu hỏi"
                                >
                                  Lưu
                                </button>
                              </div>
                            </div>

                            {/* Preset Buttons */}
                            <div className="flex items-center gap-1 flex-wrap justify-end">
                              {presetList.map((qCount) => {
                                const isCurrent = currentMaxQ === qCount;
                                const label = qCount === 0
                                  ? "Hết đề"
                                  : isTeamMultipleMode
                                  ? `${qCount}c (${qCount / teamsCount}v)`
                                  : `${qCount}c`;
                                return (
                                  <button
                                    key={qCount}
                                    type="button"
                                    onClick={() => {
                                      updateConfig("matchMaxQuestions", qCount);
                                      setCustomMaxQuestionsInput(qCount === 0 ? "" : String(qCount));
                                    }}
                                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold border transition cursor-pointer ${
                                      isCurrent
                                        ? "bg-purple-500/30 border-purple-400 text-purple-300"
                                        : "glass border-white/10 text-slate-400 hover:text-white"
                                    }`}
                                  >
                                    {label}
                                  </button>
                                );
                              })}
                            </div>

                            {/* Helper hint for modes requiring team multiples */}
                            {isTeamMultipleMode && (
                              <div className="text-[10px] text-amber-400/90 flex items-center justify-between">
                                <span>⚠️ Bắt buộc là bội số của {teamsCount} đội</span>
                                <span className="font-mono text-cyan-300 font-bold">
                                  {currentMaxQ > 0 ? `${turnsPerTeam} lượt/đội (${currentMaxQ}c)` : "Toàn bộ bộ đề"}
                                </span>
                              </div>
                            )}
                          </div>
                        );
                      })()}

                      {/* Initial Team Score */}
                      <div className="flex items-center justify-between gap-2 pt-1 border-t border-white/10">
                        <span className="text-slate-300">Điểm ban đầu</span>
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            min={0}
                            max={1000}
                            value={initialTeamScoreInput}
                            onChange={(e) => setInitialTeamScoreInput(Number(e.target.value))}
                            className="w-16 px-2 py-0.5 rounded-lg glass border border-white/20 text-white text-[11px] bg-[#0f0f1a] focus:outline-none text-right"
                          />
                          <button
                            type="button"
                            onClick={() => handleSetAllTeamsInitialScores(initialTeamScoreInput)}
                            className="px-2 py-0.5 rounded bg-purple-600 hover:bg-purple-500 text-white text-[10px] font-bold transition active:scale-95 cursor-pointer"
                          >
                            Set
                          </button>
                        </div>
                      </div>

                      {/* Powerup Card Lock / Unlock & Shuffle */}
                      <div className="flex items-center justify-between gap-2 pt-1 border-t border-white/10">
                        <span className="text-slate-300">Thẻ hỗ trợ</span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleToggleCards(!cardsLocked)}
                            className={`px-2 py-0.5 rounded text-[10px] font-bold border transition cursor-pointer ${
                              cardsLocked
                                ? "bg-red-500/30 border-red-400 text-red-300"
                                : "glass border-white/20 text-slate-300 hover:text-white"
                            }`}
                          >
                            {cardsLocked ? "🔒 Đã khóa" : "🔓 Mở"}
                          </button>
                          <button
                            type="button"
                            onClick={handleShuffleCards}
                            className="px-2 py-0.5 rounded glass border border-white/20 text-slate-300 hover:text-white text-[10px] font-bold transition cursor-pointer"
                            title="Xáo lại kho bài chia cho các đội"
                          >
                            🔀 Xáo bài
                          </button>
                        </div>
                      </div>

                      {/* Clean offline participants */}
                      <div className="flex items-center justify-between gap-2 pt-1 border-t border-white/10">
                        <span className="text-slate-300">Dọn dẹp offline</span>
                        <button
                          type="button"
                          onClick={handleCleanOfflinePlayers}
                          className="px-2 py-0.5 rounded glass border border-amber-500/30 text-amber-300 hover:bg-amber-500/20 text-[10px] font-bold transition cursor-pointer"
                          title="Xóa thí sinh mất kết nối"
                        >
                          🧹 Xóa offline
                        </button>
                      </div>

                      {/* Assign Quiz Bank selector */}
                      <div className="flex flex-col gap-1 pt-1 border-t border-white/10">
                        <span className="text-slate-300 text-[10px]">Đổi bộ đề đang gán:</span>
                        <select
                          value={selectedBankId}
                          onChange={(e) => handleAssignQuizBank(e.target.value)}
                          className="w-full px-2 py-1 rounded-lg glass border border-white/20 text-white text-[10px] bg-[#0f0f1a] focus:outline-none truncate"
                        >
                          <option value="">📚 Mặc định (25 câu)</option>
                          {quizBanks.map((b) => (
                            <option key={b.id} value={b.id}>
                              📚 {b.title} ({b._count?.questions ?? 25}c)
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Team Configuration inside Settings */}
                      <div className="space-y-1.5 pt-1.5 border-t border-white/10">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-slate-300 font-bold">Cấu hình Đội ({sandboxCustomTeams.length} đội)</span>
                          <div className="flex items-center gap-1">
                            {[2, 3, 4, 5, 6, 8].map((cnt) => (
                              <button
                                key={cnt}
                                type="button"
                                onClick={() => handleSetSandboxTeamCount(cnt)}
                                className={`px-1.5 py-0.5 rounded text-[10px] font-bold border transition cursor-pointer ${
                                  sandboxCustomTeams.length === cnt
                                    ? "bg-purple-500/30 border-purple-400 text-purple-200"
                                    : "glass border-white/10 text-slate-400 hover:text-white"
                                }`}
                              >
                                {cnt}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-1.5 pt-1 max-h-36 overflow-y-auto no-scrollbar">
                          {sandboxCustomTeams.map((team, idx) => (
                            <div key={idx} className="flex items-center gap-1.5 p-1 rounded-lg bg-black/40 border border-white/10">
                              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: team.color }} />
                              <input
                                type="text"
                                value={team.name}
                                onChange={(e) => handleUpdateSandboxTeamName(idx, e.target.value)}
                                className="flex-1 bg-transparent text-[10px] font-bold text-white focus:outline-none"
                              />
                            </div>
                          ))}
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setShowSettingsDropdown(false);
                            if (isOfflineSandbox) {
                              startOfflineSandbox(roomState.mode, selectedBankId);
                            } else {
                              handleLaunchSandbox(roomState.mode);
                            }
                          }}
                          className="w-full mt-1 py-1 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-[10px] shadow transition flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <span>🔄</span>
                          <span>Áp dụng & Chạy lại với cấu hình đội này</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Delete Room */}
                <button
                  type="button"
                  onClick={() => handleDeleteSandboxRoom(code)}
                  title="Xóa hoàn toàn phòng Sandbox này khỏi máy và máy chủ"
                  className="px-2.5 py-1 rounded-lg glass border border-rose-500/40 bg-rose-500/10 hover:bg-rose-500/25 text-rose-300 text-xs font-bold transition shrink-0 whitespace-nowrap cursor-pointer"
                >
                  🗑️ Xóa phòng
                </button>

                {/* Exit / Switch Room */}
                <button
                  type="button"
                  onClick={handleExitSandboxRoom}
                  title="Thoát khỏi phòng hiện tại để chọn hoặc tạo phòng khác"
                  className="px-2.5 py-1 rounded-lg glass hover:bg-white/10 text-slate-300 hover:text-white text-xs font-bold transition shrink-0 whitespace-nowrap cursor-pointer"
                >
                  ✕ Đổi phòng
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Studio Main Area (100% Fit Screen) ───────────────────────── */}
      {!code ? (
        <div className="flex-1 overflow-y-auto min-h-0 p-3 sm:p-5 lg:p-6 space-y-6 animate-pull-from-left">
          {/* ── Top Hero Banner ── */}
          <div className="text-center space-y-3 max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-bold shadow-sm">
              <span className="text-base">🧪</span>
              <span>Sandbox Studio · Môi trường thử nghiệm độc lập trên máy của bạn</span>
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight">
              Chọn chế độ trò chơi thử nghiệm
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 max-w-2xl mx-auto leading-relaxed">
              Hệ thống tích hợp Màn chiếu hội trường bên trái và Điện thoại thí sinh bên phải. Bạn có thể tự do tùy chỉnh số đội và tên đội mong muốn để kiểm thử toàn diện.
            </p>
          </div>

          {/* ── Sandbox Team Setup Bar ── */}
          <div className="max-w-5xl mx-auto glass rounded-2xl p-3 sm:p-4 border border-purple-500/25 bg-[#121424]/90 space-y-3">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="text-base">👥</span>
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-purple-300">
                    Cấu hình Đội thi đấu ({sandboxCustomTeams.length} đội)
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Tùy chỉnh số lượng đội (2 đến 8 đội) và đặt tên đội mong muốn cho Sandbox
                  </p>
                </div>
              </div>

              {/* Quick team count selector */}
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold text-slate-300">Số đội:</span>
                {[2, 3, 4, 5, 6, 8].map((cnt) => (
                  <button
                    key={cnt}
                    type="button"
                    onClick={() => handleSetSandboxTeamCount(cnt)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition cursor-pointer ${
                      sandboxCustomTeams.length === cnt
                        ? "bg-purple-500/30 border-purple-400 text-purple-200 ring-1 ring-purple-400/40"
                        : "glass border-white/10 text-slate-400 hover:text-white"
                    }`}
                  >
                    {cnt} đội
                  </button>
                ))}
              </div>
            </div>

            {/* Editable Team Names List */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
              {sandboxCustomTeams.map((team, idx) => (
                <div key={idx} className="flex items-center gap-2 p-2 rounded-xl bg-black/40 border border-white/10">
                  <span className="w-3 h-3 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: team.color }} />
                  <input
                    type="text"
                    value={team.name}
                    onChange={(e) => handleUpdateSandboxTeamName(idx, e.target.value)}
                    className="flex-1 bg-transparent text-xs font-bold text-white focus:outline-none focus:ring-1 focus:ring-purple-400 rounded px-1"
                    placeholder={`Đội ${idx + 1}`}
                  />
                  {idx === 0 ? (
                    <span className="text-[9px] font-bold text-cyan-300 px-1 py-0.5 rounded bg-cyan-500/20 shrink-0">Bạn</span>
                  ) : (
                    <span className="text-[9px] font-bold text-purple-300 px-1 py-0.5 rounded bg-purple-500/20 shrink-0">Bot</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* ── Floating Control & Config Bar ── */}
          <div className="glass rounded-2xl p-3 sm:p-4 border border-white/15 bg-[#121424]/90 backdrop-blur-xl max-w-5xl mx-auto shadow-2xl flex flex-col md:flex-row items-center justify-between gap-3 sm:gap-4 sticky top-0 z-20">
            {/* Left: Quiz Bank Picker */}
            <div className="flex items-center gap-2.5 w-full md:w-auto">
              <span className="text-xs font-bold text-slate-400 shrink-0 hidden sm:inline">📚 Bộ đề:</span>
              <select
                value={selectedBankId}
                onChange={(e) => setSelectedBankId(e.target.value)}
                className="flex-1 md:w-64 px-3 py-2 rounded-xl glass border border-white/20 text-xs font-bold text-white bg-[#151728] focus:outline-none focus:ring-2 focus:ring-purple-400 truncate cursor-pointer"
              >
                {quizBanks.length === 0 ? (
                  <option value="">📚 Bộ đề mẫu Đa chế độ (25 câu)</option>
                ) : (
                  quizBanks.map((b) => (
                    <option key={b.id} value={b.id}>
                      📚 {b.title} ({b._count?.questions ?? 25} câu)
                    </option>
                  ))
                )}
              </select>
            </div>

            {/* Center: Connect PIN form */}
            <form onSubmit={handleConnectExisting} className="flex items-center gap-1.5 w-full md:w-auto justify-end">
              <input
                type="text"
                placeholder="PIN 6 số"
                value={inputCode}
                onChange={(e) => setInputCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                className="w-24 px-3 py-2 rounded-xl glass border border-white/20 text-center font-mono font-bold text-xs text-white bg-[#151728] focus:outline-none focus:border-cyan-400"
              />
              <button
                type="submit"
                disabled={inputCode.length !== 6}
                className="px-3 py-2 rounded-xl glass hover:bg-white/10 text-white font-bold text-xs border border-white/20 disabled:opacity-40 whitespace-nowrap cursor-pointer transition active:scale-95"
              >
                Gắn PIN
              </button>
            </form>

            {/* Right: Master Launch Buttons (Unified 3D Cyber Buttons) */}
            <div className="flex items-center gap-3 w-full md:w-auto justify-end flex-wrap">
              <button
                type="button"
                disabled={creating}
                onClick={() => handleLaunchSandbox()}
                className="btn-3d-cyber-purple flex-1 sm:flex-initial px-5 py-2.5 text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap disabled:opacity-50"
              >
                <span>⚡</span>
                <span>{creating ? "Đang chuẩn bị..." : `Khởi chạy Online: ${selectedMode}`}</span>
              </button>

              <button
                type="button"
                onClick={handleLaunchOffline}
                className="btn-3d-cyber-cyan px-4 py-2.5 text-xs sm:text-sm flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
                title="Chạy mô phỏng trực tiếp trên trình duyệt, không cần mạng hay máy chủ"
              >
                <span>🔌</span>
                <span>Chạy Offline</span>
              </button>
            </div>
          </div>

          {/* ── Locally Saved Sandbox Rooms Bar ── */}
          {localSandboxRooms.length > 0 && (
            <div className="max-w-5xl mx-auto glass rounded-2xl p-3 sm:p-4 border border-cyan-500/25 bg-[#121629]/85 space-y-2.5">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="text-sm">💾</span>
                  <span className="text-xs font-bold text-cyan-300">
                    Phòng Sandbox đang lưu trên máy ({localSandboxRooms.length})
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleDeleteAllLocalSandboxRooms}
                  className="px-2.5 py-1 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/35 text-rose-300 text-[11px] font-bold transition cursor-pointer"
                >
                  🧹 Xóa tất cả ({localSandboxRooms.length})
                </button>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {localSandboxRooms.map((item) => (
                  <div
                    key={item.code}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs"
                  >
                    <span className="font-mono font-black text-cyan-300">{item.code}</span>
                    <span className="text-slate-300 font-semibold">{item.mode}</span>
                    <button
                      type="button"
                      onClick={() => {
                        if (item.isOffline || item.code === "OFFLINE") {
                          setSelectedMode(item.mode || "CLASSIC");
                          setIsOfflineSandbox(true);
                          startOfflineSandbox(item.mode || "CLASSIC", selectedBankId);
                        } else {
                          setCode(item.code);
                          setIsOfflineSandbox(false);
                          saveSandboxSession(item.code, false, item.mode, undefined, item.hostKey, item.name);
                          connectAdminSocket(item.code);
                        }
                      }}
                      className="px-2 py-0.5 rounded-md bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 font-bold text-[11px] transition cursor-pointer"
                    >
                      ▶ Mở
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteSandboxRoom(item.code)}
                      className="px-2 py-0.5 rounded-md bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 font-bold text-[11px] transition cursor-pointer"
                      title="Xóa phòng này"
                    >
                      🗑️ Xóa
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Visual Mode Cards Grid (9 Modes) ── */}
          <div className="max-w-5xl mx-auto pb-4">
            <div className="flex items-center justify-between mb-3 px-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Danh sách chế độ:</span>
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  9 Chế độ
                </span>
              </div>
              <span className="text-xs text-slate-400 hidden sm:inline">
                💡 Nhấp vào thẻ để chọn & xem chi tiết · Nhấp đúp để khởi chạy ngay
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
              {AVAILABLE_MODES.map((m, mIdx) => {
                const isSelected = selectedMode === m.mode;
                return (
                  <div
                    key={m.mode}
                    onClick={() => setSelectedMode(m.mode)}
                    onDoubleClick={() => handleLaunchSandbox(m.mode)}
                    style={{
                      animationDelay: `${mIdx * 45}ms`,
                      boxShadow: isSelected ? `0 0 35px -5px ${m.accentColor}80, 0 12px 25px -5px rgba(0,0,0,0.8)` : undefined,
                    }}
                    className={`rounded-2xl p-4 sm:p-5 border transition-all duration-300 cursor-pointer relative overflow-hidden group flex flex-col justify-between animate-card-stagger ${
                      isSelected
                        ? `bg-gradient-to-br from-[#1e2246] via-[#141833] to-[#0d1024] border-2 border-cyan-300 ${m.glowClass} scale-[1.02] shadow-2xl ring-1 ring-cyan-400/50`
                        : "bg-gradient-to-br from-[#15182e]/80 to-[#0e1022]/90 border-purple-500/20 hover:border-cyan-400/50 hover:bg-[#1a1e38]/80 hover:scale-[1.01]"
                    }`}
                  >
                    {/* Top holographic light line when selected */}
                    {isSelected ? (
                      <div
                        className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${m.gradient} shadow-[0_0_12px_#22d3ee]`}
                      />
                    ) : (
                      <div className="absolute top-0 left-4 right-4 h-[1px] bg-gradient-to-r from-transparent via-purple-500/30 to-transparent" />
                    )}

                    <div>
                      {/* Header: Emoji box + Category badge */}
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div
                          id={`mode-card-icon-${m.mode}`}
                          className={`w-12 h-12 rounded-2xl bg-gradient-to-tr ${m.gradient} flex items-center justify-center p-2 shadow-xl group-hover:scale-110 transition-transform duration-300 shrink-0 ring-2 ring-white/15 relative ${
                            isSelected ? "scale-105 ring-cyan-400" : ""
                          }`}
                        >
                          <GameModeIcon mode={m.mode} className="w-full h-full drop-shadow-md" />
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-white/10 text-slate-200 border border-white/20 font-bold uppercase tracking-wider backdrop-blur-md">
                            {m.badge}
                          </span>
                          {isSelected && (
                            <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-400/60 font-black flex items-center gap-1.5 shadow-[0_0_10px_rgba(6,182,212,0.4)]">
                              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
                              <span>ONLINE</span>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Title & Mode code */}
                      <div className="mb-1.5">
                        <h3 className="text-base sm:text-lg font-black text-white group-hover:text-cyan-300 transition-colors flex items-center gap-1.5">
                          <span>{m.name}</span>
                        </h3>
                        <span className="text-[10px] text-cyan-400 font-mono font-bold tracking-wide">
                          Arena Mode
                        </span>
                      </div>

                      {/* Tagline */}
                      <p className="text-xs text-slate-300 leading-relaxed min-h-[36px] line-clamp-2 mb-3 font-medium">
                        {m.tagline}
                      </p>

                      {/* Feature Chips */}
                      <div className="flex items-center gap-1.5 flex-wrap mb-4">
                        {m.perks.map((p, pIdx) => (
                          <span
                            key={pIdx}
                            className="text-[10px] px-2 py-0.5 rounded-md bg-white/5 border border-purple-500/20 text-slate-300 font-semibold"
                          >
                            • {p}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Bottom Card Footer */}
                    <div className="pt-3 border-t border-white/10 flex items-center justify-between text-xs">
                      <span className={`text-[11px] font-bold ${isSelected ? "text-cyan-300" : "text-slate-500 group-hover:text-slate-300"}`}>
                        {isSelected ? "⚡ Sẵn sàng khởi chạy" : "Nhấp để chọn"}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedMode(m.mode);
                          handleLaunchSandbox(m.mode);
                        }}
                        className={`px-3.5 py-1.5 rounded-lg text-xs font-black transition flex items-center gap-1.5 cursor-pointer ${
                          isSelected
                            ? "btn-3d-cyber-purple text-white shadow-lg"
                            : "glass text-slate-300 hover:text-white hover:bg-white/15 border border-white/15"
                        }`}
                      >
                        <span>Chạy</span>
                        <span>➔</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ── Interactive Mode Showcase & Quick Action Drawer ── */}
            {(() => {
              const currentMeta = AVAILABLE_MODES.find((m) => m.mode === selectedMode) || AVAILABLE_MODES[0];
              return (
                <div key={selectedMode} className="mt-6 glass rounded-3xl p-5 sm:p-6 border-2 border-white/20 bg-[#121424]/95 shadow-2xl animate-zoom-in-center relative overflow-hidden">
                  <div className={`absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r ${currentMeta.gradient}`} />
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
                    <div className="flex items-start gap-4">
                      <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-tr ${currentMeta.gradient} flex items-center justify-center text-3xl shadow-xl shrink-0 ring-4 ring-white/10`}>
                        {currentMeta.emoji}
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-lg sm:text-xl font-black text-white">{currentMeta.name}</h3>
                          <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-bold uppercase">
                            {currentMeta.badge}
                          </span>
                        </div>
                        <p className="text-xs text-slate-300 max-w-xl leading-relaxed">
                          {currentMeta.tagline}
                        </p>
                        <div className="flex items-center gap-2 flex-wrap pt-1">
                          {currentMeta.perks.map((p, pI) => (
                            <span key={pI} className="text-[11px] px-2.5 py-0.5 rounded-lg bg-white/10 text-white font-medium border border-white/10">
                              ✓ {p}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0 self-end lg:self-center flex-wrap">
                      <button
                        type="button"
                        disabled={creating}
                        onClick={() => handleLaunchSandbox(currentMeta.mode)}
                        className="px-6 py-3 rounded-2xl bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-500 hover:from-purple-500 hover:to-cyan-400 text-white font-black text-xs sm:text-sm shadow-xl transition-all transform hover:scale-105 active:scale-95 disabled:opacity-50 flex items-center gap-2 cursor-pointer glow-neon-purple whitespace-nowrap"
                      >
                        <span>⚡</span>
                        <span>Khởi chạy Online ({currentMeta.mode})</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleLaunchOffline}
                        className="px-5 py-3 rounded-2xl glass hover:bg-amber-500/20 border border-amber-500/40 text-amber-300 font-bold text-xs sm:text-sm shadow-lg transition-all hover:scale-105 active:scale-95 flex items-center gap-1.5 cursor-pointer glow-neon-amber whitespace-nowrap"
                      >
                        <span>🔌</span>
                        <span>Chạy Offline (0ms)</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      ) : (
        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-2 overflow-hidden animate-loaded-reveal">
          {/* ══════════════════════════════════════════════════════════════════
              LEFT COLUMN (7 cols ~58%): Large Display + Host Master Controls
             ══════════════════════════════════════════════════════════════════ */}
          <div className={`lg:col-span-7 flex flex-col min-h-0 h-full gap-1.5 overflow-hidden animate-slide-in-left ${
            mobileTab === "DISPLAY" ? "flex" : "hidden lg:flex"
          }`}>
            {/* Display Iframe Viewport (Fills Remaining Height) */}
            <div className="flex-1 min-h-0 glass rounded-2xl border border-white/10 overflow-hidden flex flex-col shadow-2xl bg-black">
              <div className="bg-[#151728] px-3 py-1.5 border-b border-white/10 flex items-center justify-between text-xs font-bold text-slate-300 shrink-0">
                <div className="flex items-center gap-2">
                  <span>📺</span>
                  <span>Màn hình hiển thị hội trường (Display Màn chiếu)</span>
                </div>
                <Link
                  href={`/display/${code}`}
                  target="_blank"
                  className="text-cyan-400 hover:underline flex items-center gap-1 text-[11px]"
                >
                  Mở tab riêng ↗
                </Link>
              </div>
              <div className="flex-1 min-h-0 bg-black">
                <iframe
                  ref={displayIframeRef}
                  src={`/display/${code}`}
                  title="Display Preview"
                  className="w-full h-full border-0"
                  allow="autoplay; camera; microphone"
                  onLoad={() => {
                    syncToIframes();
                  }}
                />
              </div>
            </div>

            {/* Live Bot Event Logs (Compact Single-line Ticker Bar) */}
            <div className="glass rounded-xl px-3 py-1.5 border border-white/10 text-xs bg-[#121424] flex items-center justify-between shrink-0 shadow-lg">
              <div className="flex items-center gap-2 min-w-0 flex-1 mr-2">
                <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${botAutoEnabled ? "bg-emerald-400 animate-pulse glow-neon-emerald" : "bg-cyan-400 animate-pulse glow-neon-cyan"}`} />
                <span className="font-bold text-slate-400 text-[11px] shrink-0 uppercase tracking-wider">Live Ticker:</span>
                <span
                  key={botLogs[0] || "initial"}
                  className="font-mono text-[11px] text-slate-200 truncate animate-ticker-slide"
                >
                  {botLogs[0] || "Phòng Sandbox sẵn sàng · Đang chờ sự kiện đầu tiên..."}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowLogsModal(true)}
                className="px-2 py-0.5 rounded glass hover:bg-white/10 text-cyan-300 text-[11px] font-bold shrink-0 transition btn-tactile cursor-pointer"
              >
                📜 Xem tất cả ({botLogs.length})
              </button>
            </div>
          </div>

          {/* ══════════════════════════════════════════════════════════════════
              RIGHT COLUMN (5 cols ~42%): Unified Mobile Device + Team Switcher
             ══════════════════════════════════════════════════════════════════ */}
          <div className={`lg:col-span-5 flex flex-col min-h-0 h-full gap-1 overflow-hidden animate-slide-in-right ${
            mobileTab === "PLAYER" ? "flex" : "hidden lg:flex"
          }`}>
            {/* Team Switcher Tabs (Ultra-Compact Single Row) */}
            <div className="glass rounded-xl px-2 py-1 border border-white/10 bg-[#121424] shrink-0 flex items-center gap-1.5">
              <span className="text-[10px] font-bold text-slate-400 whitespace-nowrap shrink-0 hidden sm:inline">📱 Chọn Đội:</span>
              <div className="flex items-center gap-1 flex-1 overflow-x-auto no-scrollbar">
                {stableTeams.map((t: TeamState, idx: number) => {
                  const isActive = activeTeamIndex === idx;
                  const teamPopups = scorePopups.filter((p) => p.teamId === t.id);
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => handleSwitchActiveTeam(idx)}
                      className={`relative px-1 sm:px-1.5 py-1 rounded-lg text-left border transition flex items-center justify-between gap-0.5 sm:gap-1 cursor-pointer btn-tactile ${
                        isActive
                          ? "bg-purple-600/30 border-purple-500 shadow ring-1 ring-purple-400/50"
                          : "glass border-white/10 hover:border-white/30 text-slate-300"
                      }`}
                    >
                      {/* Floating dynamic score badges */}
                      {teamPopups.map((p) => (
                        <span
                          key={p.id}
                          className={`absolute -top-3.5 right-1 z-30 font-black text-[10px] px-1.5 py-0.2 rounded-full shadow-lg animate-score-float pointer-events-none whitespace-nowrap ${
                            p.delta > 0
                              ? "bg-emerald-500 text-white shadow-emerald-500/50"
                              : "bg-rose-500 text-white shadow-rose-500/50"
                          }`}
                        >
                          {p.text}
                        </span>
                      ))}
                      <div className="flex items-center gap-1 min-w-0">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ background: t.color }} />
                        <span className="font-bold text-[10px] truncate text-white">{t.name}</span>
                      </div>
                      <span className="font-mono font-bold text-cyan-300 text-[10px] shrink-0">
                        {t.score}đ
                        {roomState?.mode === "MAGIC_WHEEL" &&
                        roomState?.magicWheelState?.phase !== "ROUND_RECAP" &&
                        (roomState?.magicWheelState?.roundScores?.[t.id] || 0) > 0 ? (
                          <span className="text-amber-300 font-extrabold ml-0.5">
                            (+{roomState?.magicWheelState?.roundScores?.[t.id]}đ)
                          </span>
                        ) : null}
                        {roomState?.mode === "MYSTERY_QUEST" && roomState?.mysteryQuestState?.currentTurnTeamId === t.id && roomState.mysteryQuestState.phase !== "TURN_SUMMARY" && (roomState.mysteryQuestState.potPoints || 0) > 0 ? (
                          <span className="text-yellow-400 font-extrabold ml-0.5">(+{roomState.mysteryQuestState.potPoints}đ)</span>
                        ) : null}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Mobile Device Frame with Integrated Quick Testing Header */}
            <div className="flex-1 min-h-0 glass rounded-2xl border border-white/10 overflow-hidden shadow-2xl flex flex-col bg-[#0b0c16]">
              {/* Integrated Tester Header (Single Slim Bar) */}
              <div className="bg-[#151728] px-2 sm:px-2.5 py-1.5 border-b border-white/10 flex items-center justify-between gap-1 sm:gap-2 shrink-0 overflow-x-auto no-scrollbar">
                {/* Active Team Identity Badge */}
                <div className="flex items-center gap-1 sm:gap-1.5 min-w-0 shrink-0 relative">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0 animate-pulse" style={{ background: currentTeam?.color || "#a855f7" }} />
                  <span className="font-black text-xs text-white truncate max-w-[75px] sm:max-w-[120px]">
                    {activeTeamIndex === 0 ? "Bạn (Tester)" : currentTeam?.name || "Đội"}
                  </span>
                  <div className="relative inline-flex items-center">
                    <span className="px-1.5 py-0.2 rounded font-mono font-bold text-[10px] bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shrink-0">
                      {currentTeam?.score ?? 0}đ
                      {roomState?.mode === "MAGIC_WHEEL" &&
                      currentTeam?.id &&
                      roomState?.magicWheelState?.phase !== "ROUND_RECAP" &&
                      (roomState?.magicWheelState?.roundScores?.[currentTeam.id] || 0) > 0 ? (
                        <span className="text-amber-300 font-extrabold ml-0.5">
                          (+{roomState?.magicWheelState?.roundScores?.[currentTeam.id]}đ)
                        </span>
                      ) : null}
                      {roomState?.mode === "MYSTERY_QUEST" && roomState?.mysteryQuestState?.currentTurnTeamId === currentTeam?.id && roomState.mysteryQuestState.phase !== "TURN_SUMMARY" && (roomState.mysteryQuestState.potPoints || 0) > 0 ? (
                        <span className="text-yellow-400 font-extrabold ml-0.5">(+{roomState.mysteryQuestState.potPoints}đ)</span>
                      ) : null}
                    </span>
                    {scorePopups.filter((p) => p.teamId === currentTeam?.id).map((p) => (
                      <span
                        key={p.id}
                        className={`absolute -top-3.5 left-1/2 -translate-x-1/2 z-30 font-black text-[11px] px-1.5 py-0.2 rounded-full shadow-lg animate-score-float pointer-events-none whitespace-nowrap ${
                          p.delta > 0
                            ? "bg-emerald-500 text-white shadow-emerald-500/50"
                            : "bg-rose-500 text-white shadow-rose-500/50"
                        }`}
                      >
                        {p.text}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Quick Test Controls */}
                <div className="flex items-center gap-1 shrink-0">
                  {/* Contextual Quick MC Action */}
                  {renderQuickMcAction()}

                  {selectedMode === "MAGIC_WHEEL" ? null : (
                    <>
                      <button
                        type="button"
                        onClick={() => handleForceActiveTeamAnswer(true)}
                        className="px-1.5 sm:px-2 py-0.5 rounded-lg bg-green-500/20 border border-green-500/40 text-green-300 hover:bg-green-500/30 font-bold transition text-[10px] btn-tactile cursor-pointer shadow-sm"
                        title="Giả lập đội này chọn đáp án đúng"
                      >
                        ✓ Đúng
                      </button>
                      <button
                        type="button"
                        onClick={() => handleForceActiveTeamAnswer(false)}
                        className="px-1.5 sm:px-2 py-0.5 rounded-lg bg-red-500/20 border border-red-500/40 text-red-300 hover:bg-red-500/30 font-bold transition text-[10px] btn-tactile cursor-pointer shadow-sm"
                        title="Giả lập đội này chọn đáp án sai"
                      >
                        ✗ Sai
                      </button>
                      <button
                        type="button"
                        onClick={handleForceActiveTeamBuzz}
                        className="px-1.5 sm:px-2 py-0.5 rounded-lg bg-yellow-500/20 border border-yellow-500/40 text-yellow-300 hover:bg-yellow-500/30 font-bold transition text-[10px] btn-tactile cursor-pointer shadow-sm"
                        title="Giả lập đội này bấm chuông"
                      >
                        ⚡ Buzz
                      </button>
                      {currentQuestion && !revealPayload && currentQuestion.question.options && (
                        <button
                          type="button"
                          onClick={() => {
                            if (currentTeam) setDirectAnswerTargetTeamId(currentTeam.id);
                            setShowDirectAnswerModal(true);
                          }}
                          className="px-1.5 sm:px-2 py-0.5 rounded-lg bg-purple-500/20 border border-purple-500/40 text-purple-300 hover:bg-purple-500/30 font-bold transition text-[10px] btn-tactile cursor-pointer shadow-sm hidden sm:inline-block"
                          title="MC nộp đáp án trực tiếp cho đội này hoặc đội khác"
                        >
                          🎙️ MC nộp
                        </button>
                      )}
                    </>
                  )}

                  {/* Score Cheat Dropdown (Fixed Floating Popover) */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        const rect = e.currentTarget.getBoundingClientRect();
                        setCheatMenuPos({
                          top: rect.bottom + 4,
                          right: Math.max(8, window.innerWidth - rect.right),
                        });
                        setShowCheatDropdown((prev) => !prev);
                      }}
                      className="px-1.5 sm:px-2 py-0.5 rounded-lg glass border border-white/20 text-slate-300 hover:text-white font-bold transition text-[10px] flex items-center gap-0.5 btn-tactile cursor-pointer"
                      title="Chỉnh điểm nhanh cho đội này"
                    >
                      <span>Cheat</span>
                      <span>▾</span>
                    </button>

                    {showCheatDropdown && currentTeam && (
                      <>
                        <div
                          className="fixed inset-0 z-[9998]"
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowCheatDropdown(false);
                          }}
                        />
                        <div
                          className="fixed z-[9999] p-1.5 rounded-xl glass border border-white/25 bg-[#151728]/98 shadow-2xl flex flex-col gap-1 w-32 text-[10px] animate-scale-in"
                          style={{
                            top: `${cheatMenuPos.top}px`,
                            right: `${cheatMenuPos.right}px`,
                          }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="px-2 py-0.5 text-[9px] font-bold text-slate-400 border-b border-white/10 uppercase tracking-wider truncate">
                            {currentTeam.name}
                          </div>
                          <button
                            type="button"
                            onClick={() => { handleAdjustScore(currentTeam.id, 10); setShowCheatDropdown(false); }}
                            className="px-2 py-1 rounded bg-green-500/15 hover:bg-green-500/25 text-green-300 text-left font-mono font-bold transition cursor-pointer"
                          >
                            +10 điểm
                          </button>
                          <button
                            type="button"
                            onClick={() => { handleAdjustScore(currentTeam.id, 20); setShowCheatDropdown(false); }}
                            className="px-2 py-1 rounded bg-green-500/15 hover:bg-green-500/25 text-green-300 text-left font-mono font-bold transition cursor-pointer"
                          >
                            +20 điểm
                          </button>
                          <button
                            type="button"
                            onClick={() => { handleAdjustScore(currentTeam.id, -10); setShowCheatDropdown(false); }}
                            className="px-2 py-1 rounded bg-red-500/15 hover:bg-red-500/25 text-red-300 text-left font-mono font-bold transition cursor-pointer"
                          >
                            -10 điểm
                          </button>
                          <button
                            type="button"
                            onClick={() => { handleAdjustScore(currentTeam.id, -20); setShowCheatDropdown(false); }}
                            className="px-2 py-1 rounded bg-red-500/15 hover:bg-red-500/25 text-red-300 text-left font-mono font-bold transition cursor-pointer"
                          >
                            -20 điểm
                          </button>
                          <button
                            type="button"
                            onClick={() => { handleAdjustScore(currentTeam.id, undefined, 0); setShowCheatDropdown(false); }}
                            className="px-2 py-1 rounded bg-yellow-500/15 hover:bg-yellow-500/25 text-yellow-300 text-left font-mono font-bold transition cursor-pointer"
                          >
                            Set 0 điểm
                          </button>
                          <button
                            type="button"
                            onClick={() => { handleAdjustScore(currentTeam.id, undefined, 50); setShowCheatDropdown(false); }}
                            className="px-2 py-1 rounded bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 text-left font-mono font-bold transition cursor-pointer"
                          >
                            Set 50 điểm
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setShowCheatDropdown(false);
                              const val = window.prompt(`Nhập điểm số chính xác cho ${currentTeam.name}:`, String(currentTeam.score));
                              if (val !== null) {
                                const parsed = parseInt(val, 10);
                                if (!isNaN(parsed)) handleAdjustScore(currentTeam.id, undefined, Math.max(0, parsed));
                              }
                            }}
                            className="px-2 py-1 rounded bg-amber-500/20 hover:bg-amber-500/35 text-amber-300 text-left font-bold border border-amber-500/40 transition cursor-pointer"
                          >
                            ✏️ Nhập điểm...
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Player Viewport */}
              <div className="flex-1 min-h-0 bg-[#0f0f1a]">
                <iframe
                  ref={playerIframeRef}
                  src={`/play/${code}?sandbox=1&playerId=sb_${code}_t0&teamIndex=0&name=${encodeURIComponent("Bạn (Tester)")}`}
                  allow="autoplay; camera; microphone"
                  onLoad={() => {
                    if (isOfflineSandbox) {
                      syncToIframes();
                    }
                    const targetTeam = stableTeams[activeTeamIndex] || stableTeams[0];
                    if (targetTeam) {
                      const tName = activeTeamIndex === 0 ? "Bạn (Tester)" : `Bạn (Tester - ${targetTeam.name})`;
                      const isQuestionActive = Boolean(currentQuestion && !revealPayload);
                      const targetAnswer = isQuestionActive
                        ? (isOfflineSandbox
                            ? (offlineAnswersRef.current.get(targetTeam.id)?.answer || null)
                            : (teamSelectedAnswers[targetTeam.id] || null))
                        : null;
                      const allAnswers = isQuestionActive
                        ? (isOfflineSandbox
                            ? Object.fromEntries(
                                Array.from(offlineAnswersRef.current.entries()).map(([tid, val]) => [tid, val.answer])
                              )
                            : teamSelectedAnswers)
                        : {};
                      playerIframeRef.current?.contentWindow?.postMessage(
                        {
                          type: "SWITCH_ACTIVE_TEAM",
                          teamId: targetTeam.id,
                          teamName: tName,
                          teamIndex: activeTeamIndex,
                          currentAnswer: targetAnswer,
                          allTeamAnswers: allAnswers,
                          roomState,
                          currentQuestion,
                          timer,
                          revealPayload,
                          payload: {
                            teamId: targetTeam.id,
                            teamName: tName,
                            teamIndex: activeTeamIndex,
                            currentAnswer: targetAnswer,
                          },
                        },
                        "*"
                      );
                    }
                  }}
                  title="Player Viewport"
                  className="w-full h-full border-0"
                />
              </div>
            </div>
          </div>

          {/* ══════════════════════════════════════════════════════════════════
              MOBILE HOST CONTROL PANEL (Only visible on mobile when mobileTab === 'HOST')
             ══════════════════════════════════════════════════════════════════ */}
          <div
            className={`lg:hidden flex-col min-h-0 h-full gap-2.5 overflow-y-auto p-2 glass rounded-2xl border border-white/10 bg-[#0c0d18] animate-tab-enter ${
              mobileTab === "HOST" ? "flex" : "hidden"
            }`}
          >
            {/* 1. Header & Primary Game Flow Card */}
            <div className="p-3 rounded-xl bg-[#151728]/80 border border-white/10 space-y-2.5 shadow-lg">
              <div className="flex items-center justify-between border-b border-white/10 pb-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-base">🎛️</span>
                  <span className="font-black text-xs text-white uppercase tracking-wider">Tiến trình trận đấu</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                    {roomState?.mode || selectedMode}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    roomState?.status === "PLAYING" ? "bg-green-500/20 text-green-300" : "bg-yellow-500/20 text-yellow-300"
                  }`}>
                    {roomState?.status || "LOBBY"}
                  </span>
                </div>
              </div>

              {/* Primary Action Buttons */}
              <div className="space-y-1.5">
                {(matchStarting || questionPrepare) && (
                  <button
                    type="button"
                    onClick={handleSkipPrepare}
                    className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 text-black text-xs font-black shadow animate-pulse flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span>⚡</span>
                    <span>Bỏ qua chuẩn bị ({matchStarting?.seconds ?? questionPrepare?.seconds ?? 3}s)</span>
                  </button>
                )}

                {currentQuestion?.timerPending && selectedMode !== "MAGIC_WHEEL" && (
                  <button
                    type="button"
                    onClick={handleStartTimer}
                    className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-green-500 text-black text-xs font-black shadow animate-pulse flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span>⏱️</span>
                    <span>
                      {selectedMode === "BOUNCEBACK" && currentQuestion?.stealBuzzedTeamId
                        ? `Bắt đầu tính giờ cướp (${currentQuestion.stealBuzzedTeamName || "Đội cướp"})`
                        : selectedMode === "BUZZ" && currentQuestion?.buzzedTeamId
                        ? `Bắt đầu tính giờ (${currentQuestion.buzzedTeamName || "Đội chuông"})`
                        : "Bắt đầu tính giờ"}
                    </span>
                  </button>
                )}

                {/* Next / Start / Conclude */}
                {roomState?.mode === "GRID_CARO" && roomState?.status === "PLAYING" && !currentQuestion ? null : selectedMode === "MAGIC_WHEEL" ? null : (
                  (() => {
                    const targetTotal = getTargetTotalQuestions(
                      selectedMode,
                      roomState?.config,
                      roomState?.teams.length || 4,
                      offlineQuestionsRef.current.length || 25
                    );
                    const isLimitReached = (offlineQIndexRef.current + 1 >= targetTotal) || (offlineUsedQuestionIdsRef.current.size >= targetTotal);

                    if (roomState?.status === "PLAYING" && revealPayload && isLimitReached) {
                      return (
                        <button
                          type="button"
                          onClick={handleConcludeMatch}
                          className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 text-black text-xs font-black shadow-lg border border-yellow-300 animate-pulse flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <span className="text-sm">🏆</span>
                          <span>Tổng kết trận & Trao giải (Đủ {targetTotal} câu)</span>
                        </button>
                      );
                    }

                    if (intermission) {
                      return (
                        <button
                          type="button"
                          onClick={handleAdminNext}
                          className="w-full py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-cyan-500 text-white text-xs font-black shadow-lg animate-pulse flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <span>🚀</span>
                          <span>Bắt đầu câu #{intermission.nextQuestionIndex + 1}</span>
                        </button>
                      );
                    }

                    return (
                      <button
                        type="button"
                        onClick={handleAdminNext}
                        className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-black shadow flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 transition"
                      >
                        <span>
                          {!currentQuestion && roomState?.status === "LOBBY"
                            ? "🚀 Bắt đầu trận đấu"
                            : roomState?.mode === "DICE_RACE" && !currentQuestion
                            ? "🎯 Hiện câu hỏi"
                            : revealPayload
                            ? "⏩ Sang câu hỏi tiếp theo"
                            : "⏩ Câu kế tiếp"}
                        </span>
                      </button>
                    );
                  })()
                )}

                {/* Reveal & In-Question Controls */}
                {currentQuestion && !revealPayload && selectedMode !== "MAGIC_WHEEL" && (
                  <div className="space-y-1.5 pt-1">
                    <button
                      type="button"
                      onClick={handleAdminReveal}
                      className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black shadow flex items-center justify-center gap-1.5 cursor-pointer animate-pulse"
                    >
                      <span>👁️</span>
                      <span>Công bố đáp án ngay</span>
                    </button>

                    <div className="grid grid-cols-3 gap-1.5">
                      <button
                        type="button"
                        onClick={handleAdminStopEarly}
                        disabled={Boolean(timer && timer.remaining <= 0)}
                        className="py-1.5 px-2 rounded-lg bg-rose-600/30 border border-rose-500/40 text-rose-300 text-[11px] font-bold flex items-center justify-center gap-1 cursor-pointer disabled:opacity-40"
                      >
                        <span>⏹️ Dừng sớm</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleSkipTimerToOneSecond}
                        disabled={Boolean(!timer || timer.remaining <= 1)}
                        className="py-1.5 px-2 rounded-lg glass border border-white/20 text-yellow-300 text-[11px] font-bold flex items-center justify-center gap-1 cursor-pointer disabled:opacity-40"
                      >
                        <span>⚡ Tua 1s</span>
                      </button>
                      {currentQuestion.question.options && (
                        <button
                          type="button"
                          onClick={() => setShowDirectAnswerModal(true)}
                          className="py-1.5 px-2 rounded-lg bg-purple-600/30 border border-purple-500/50 text-purple-300 text-[11px] font-bold flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <span>🎙️ MC nộp</span>
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Essay Grading */}
                {revealPayload && (
                  <button
                    type="button"
                    onClick={() => setShowEssayModal(true)}
                    className="w-full py-2 rounded-xl bg-emerald-600/30 border border-emerald-500/50 text-emerald-300 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span>✏️</span>
                    <span>Chấm điểm tự luận / tay ({revealPayload.answers?.length ?? 0})</span>
                  </button>
                )}

                {/* MC Answer Review & Manual Verdict Overrides */}
                {revealPayload && revealPayload.answers && revealPayload.answers.length > 0 && (
                  <div className="mt-3 p-3 rounded-2xl glass border border-white/15 bg-black/40 space-y-2 animate-slide-up">
                    <div className="flex items-center justify-between border-b border-white/10 pb-2">
                      <div className="flex items-center gap-1.5 text-xs font-black text-amber-300">
                        <span>⚖️</span>
                        <span>Phán quyết bài làm & Can thiệp MC</span>
                      </div>
                      <span className="text-[10px] text-slate-400">
                        Đảo phán quyết Đúng/Sai
                      </span>
                    </div>
                    <div className="grid grid-cols-1 gap-2">
                      {revealPayload.answers.map((ans: any, aIdx: number) => {
                        const isAnsCorrect = ans.isCorrect === true;
                        const teamObj = roomState?.teams.find((t) => t.id === ans.teamId);
                        const displayName = ans.name || ans.teamName || teamObj?.name || `Đội #${aIdx + 1}`;
                        const teamColor = teamObj?.color || "#06b6d4";

                        return (
                          <div
                            key={ans.id || ans.teamId || aIdx}
                            className="p-2.5 rounded-xl bg-white/5 border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-2 transition hover:border-white/20"
                          >
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              <div className="w-3 h-3 rounded-full shrink-0 shadow-sm ring-1 ring-white/20" style={{ background: teamColor }} />
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-bold text-xs text-white truncate">{displayName}</span>
                                  <span
                                    className={`px-2 py-0.5 rounded-full text-[10px] font-black tracking-wide border ${
                                      isAnsCorrect
                                        ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                                        : "bg-rose-500/20 text-rose-300 border-rose-500/40"
                                    }`}
                                  >
                                    {isAnsCorrect ? `✓ ĐÚNG (+${ans.pointsAwarded ?? 0}đ)` : "✗ SAI (0đ)"}
                                  </span>
                                </div>
                                <p className="text-[11px] text-slate-300 font-mono mt-0.5 truncate bg-black/40 px-2 py-0.5 rounded border border-white/5">
                                  Đã chọn: <span className="text-cyan-300 font-bold">{Array.isArray(ans.answer) ? ans.answer.join(", ") : String(ans.answer || "(Trống)")}</span>
                                </p>
                              </div>
                            </div>

                            {/* Two-way Override Actions */}
                            <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                              {!isAnsCorrect ? (
                                <button
                                  type="button"
                                  onClick={() => handleOverrideVerdict(ans.teamId, true, ans.id, ans.playerId)}
                                  className="px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-md transition active:scale-95 flex items-center gap-1 cursor-pointer glow-neon-emerald"
                                  title="Hệ thống chấm sai: MC can thiệp công nhận đáp án đúng, cộng điểm và mở khóa hành động tiếp theo của chế độ chơi"
                                >
                                  <span>⚖️</span>
                                  <span>MC Duyệt Đúng</span>
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleOverrideVerdict(ans.teamId, false, ans.id, ans.playerId)}
                                  className="px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-bold text-xs shadow-md transition active:scale-95 flex items-center gap-1 cursor-pointer"
                                  title="Hệ thống chấm nhầm: MC can thiệp đảo phán quyết thành Sai và thu hồi điểm"
                                >
                                  <span>❌</span>
                                  <span>MC Chấm Sai</span>
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Mode Specific Controls */}
                {roomState?.mode === "BUZZ" && currentQuestion && (
                  <div className="pt-2 border-t border-white/10 space-y-1.5">
                    <span className="text-[11px] font-bold text-amber-300 block">🛎️ Điều khiển bấm chuông:</span>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {!currentQuestion.buzzUnlocked && (
                        <button
                          type="button"
                          onClick={handleBuzzUnlock}
                          className="px-3 py-1.5 rounded-lg bg-yellow-500 text-black text-xs font-black shadow flex items-center gap-1"
                        >
                          <span>🔔 Mở chuông</span>
                        </button>
                      )}
                      {currentQuestion.buzzedTeamId && (
                        <div className="flex items-center gap-1">
                          <span className="text-[11px] text-slate-300 mr-1">Thời gian:</span>
                          {[5, 10, 15, 20].map((s) => (
                            <button
                              key={s}
                              type="button"
                              onClick={() => handleBuzzStartAnswer(s)}
                              className="px-2 py-1 rounded bg-cyan-600 text-white font-bold text-[11px]"
                            >
                              {s}s
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {roomState?.mode === "BOUNCEBACK" && currentQuestion && (
                  <div className="pt-2 border-t border-white/10 space-y-1.5">
                    <span className="text-[11px] font-bold text-blue-300 block">🔄 Điều khiển Về đích:</span>
                    <div className="flex items-center gap-1 flex-wrap">
                      {currentQuestion.bouncebackSelectPhase && ([10, 20, 30] as const).map((pts) => (
                        <button
                          key={pts}
                          type="button"
                          onClick={() => handleAdminBouncebackSelectPoints(pts)}
                          className="px-2.5 py-1 rounded-lg bg-blue-600 text-white text-xs font-black"
                        >
                          Gói {pts}đ
                        </button>
                      ))}
                      {!revealPayload && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleBouncebackJudge(true)}
                            className="px-2.5 py-1 rounded-lg bg-green-600 text-white text-xs font-black"
                          >
                            ✓ Đúng
                          </button>
                          <button
                            type="button"
                            onClick={() => handleBouncebackJudge(false)}
                            className="px-2.5 py-1 rounded-lg bg-red-600 text-white text-xs font-black"
                          >
                            ✗ Sai
                          </button>
                        </>
                      )}
                      {!currentQuestion.stealBuzzedTeamId && !currentQuestion.isStealPhase && !revealPayload && (
                        <button
                          type="button"
                          onClick={handleBouncebackOpenSteal}
                          className="px-2.5 py-1 rounded-lg bg-amber-500 text-black text-xs font-black"
                        >
                          🔔 Mở cướp 5s
                        </button>
                      )}
                      {currentQuestion.stealBuzzedTeamId && (
                        <button
                          type="button"
                          onClick={() => handleBouncebackStartStealAnswer(5)}
                          className="px-2.5 py-1 rounded-lg bg-cyan-600 text-white text-xs font-black"
                        >
                          ⏱️ Cho cướp 5s
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {roomState?.mode === "GRID_CARO" && (
                  <div className="pt-2 border-t border-white/10 flex items-center gap-1.5 flex-wrap">
                    {!currentQuestion && roomState.gridCaroState?.selectedCellId && (
                      <button
                        type="button"
                        onClick={handleGridLaunchQuestion}
                        className="px-3 py-1.5 rounded-lg bg-purple-600 text-white text-xs font-black"
                      >
                        📖 Hiện câu #{roomState.gridCaroState.selectedCellId}
                      </button>
                    )}
                    {!currentQuestion && !roomState.gridCaroState?.previewActive && !roomState.gridCaroState?.selectedCellId && (
                      <button
                        type="button"
                        onClick={handleGridPreviewStart}
                        className="px-2.5 py-1 rounded-lg glass border border-purple-500/40 text-purple-300 text-xs font-bold"
                      >
                        👁️ Xem độ khó
                      </button>
                    )}
                    {!currentQuestion && roomState.gridCaroState?.previewActive && (
                      <button
                        type="button"
                        onClick={handleGridPreviewStop}
                        className="px-2.5 py-1 rounded-lg bg-red-600 text-white text-xs font-bold"
                      >
                        🙈 Lật úp
                      </button>
                    )}
                    {revealPayload && (
                      <button
                        type="button"
                        onClick={handleGridAdvanceNow}
                        className="px-3 py-1.5 rounded-lg bg-cyan-600 text-white text-xs font-black"
                      >
                        🏁 Về bảng ô
                      </button>
                    )}
                  </div>
                )}

                {roomState?.mode === "DICE_RACE" && (
                  <div className="pt-2 border-t border-white/10 flex items-center gap-1.5 flex-wrap">
                    {roomState?.diceRaceState?.canRollDice && (!currentQuestion || revealPayload) && (
                      <button
                        type="button"
                        onClick={handleDiceRollManual}
                        className="px-3 py-1.5 rounded-lg bg-amber-400 text-black text-xs font-black shadow animate-pulse"
                      >
                        🎲 Tung xúc xắc
                      </button>
                    )}
                    {revealPayload && (
                      <button
                        type="button"
                        onClick={handleDiceAdvanceToBoard}
                        className="px-3 py-1.5 rounded-lg bg-amber-500 text-black text-xs font-black"
                      >
                        🗺️ Về bàn cờ
                      </button>
                    )}
                  </div>
                )}

                {roomState?.mode === "WAGER" && (
                  <div className="pt-2 border-t border-white/10 flex items-center gap-1.5 flex-wrap">
                    {roomState?.wagerState?.phase === "QUESTION_PERIOD" && !roomState?.wagerState?.questionReady && (
                      <button
                        type="button"
                        onClick={handleWagerLaunchQuestion}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-black text-xs animate-pulse"
                      >
                        📢 Mở câu hỏi cược
                      </button>
                    )}
                    {roomState?.wagerState?.bailoutQueue && roomState.wagerState.bailoutQueue.length > 0 && (
                      <button
                        type="button"
                        disabled={roomState.wagerState.currentQuestionBailoutUsed}
                        onClick={() => handleGrantBailout(roomState.wagerState!.bailoutQueue![0].teamId)}
                        className="px-3 py-1.5 rounded-lg text-xs font-black bg-rose-600 text-white disabled:opacity-40"
                      >
                        🆘 Cứu trợ {roomState.wagerState.bailoutQueue[0].teamName}
                      </button>
                    )}
                  </div>
                )}

                {roomState?.mode === "MAGIC_WHEEL" && roomState?.magicWheelState && (
                  <div className="pt-3 border-t border-white/10 space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-amber-300">🎡 Vòng Quay Tri Thức (Admin Sandbox Control)</span>
                      <button
                        type="button"
                        onClick={() => {
                          window.postMessage({ type: "MAGIC_WHEEL_ADVANCE_ROUND" }, "*");
                          if (adminSocketRef.current?.connected) {
                            adminSocketRef.current.emit("magic_wheel:advance_round" as any);
                          }
                        }}
                        className="px-2.5 py-1 rounded bg-amber-500 text-black font-bold text-xs cursor-pointer"
                      >
                        ⏩ Sang Vòng Tiếp Theo
                      </button>
                    </div>
                    <MagicWheelBoard
                      wheelState={roomState.magicWheelState}
                      isDisplay={false}
                      isHost={true}
                      teams={roomState.teams}
                      isMyTurn={true}
                      onSpin={(power) => {
                        window.postMessage({ type: "MAGIC_WHEEL_SPIN", power }, "*");
                        if (adminSocketRef.current?.connected) {
                          adminSocketRef.current.emit("magic_wheel:spin" as any, { power });
                        }
                      }}
                      onGuessLetter={(letter) => {
                        window.postMessage({ type: "MAGIC_WHEEL_GUESS_LETTER", letter }, "*");
                        if (adminSocketRef.current?.connected) {
                          adminSocketRef.current.emit("magic_wheel:guess_letter" as any, { letter });
                        }
                      }}
                      onSolvePuzzle={(answer) => {
                        window.postMessage({ type: "MAGIC_WHEEL_SOLVE_PUZZLE", answer }, "*");
                        if (adminSocketRef.current?.connected) {
                          adminSocketRef.current.emit("magic_wheel:solve_puzzle" as any, { answer });
                        }
                      }}
                      onMysteryDecide={(openMystery) => {
                        window.postMessage({ type: "MAGIC_WHEEL_MYSTERY_DECIDE", openMystery }, "*");
                        if (adminSocketRef.current?.connected) {
                          adminSocketRef.current.emit("magic_wheel:mystery_decide" as any, { openMystery });
                        }
                      }}
                      onLuckyPick={(index) => {
                        window.postMessage({ type: "MAGIC_WHEEL_LUCKY_PICK", index }, "*");
                        if (adminSocketRef.current?.connected) {
                          adminSocketRef.current.emit("magic_wheel:lucky_pick" as any, { index });
                        }
                      }}
                      onSelectRewardCard={(rewardPayload: any) => {
                        const data = typeof rewardPayload === "string" ? { cardType: rewardPayload } : rewardPayload;
                        window.postMessage({ type: "MAGIC_WHEEL_REWARD_SELECT", ...data }, "*");
                        if (adminSocketRef.current?.connected) {
                          adminSocketRef.current.emit("magic_wheel:reward_select" as any, data);
                        }
                      }}
                      onTradeDecide={(trade, boxIndex) => {
                        window.postMessage({ type: "MAGIC_WHEEL_TRADE_DECIDE", trade, boxIndex }, "*");
                        if (adminSocketRef.current?.connected) {
                          adminSocketRef.current.emit("magic_wheel:trade_decide" as any, { trade, boxIndex });
                        }
                      }}
                      onTossUpStart={() => {
                        window.postMessage({ type: "MAGIC_WHEEL_TOSS_UP_START" }, "*");
                        if (adminSocketRef.current?.connected) {
                          adminSocketRef.current.emit("magic_wheel:toss_up_start" as any);
                        }
                      }}
                      onTossUpBuzz={(targetTeamId) => {
                        const tId = targetTeamId || currentTeam?.id || roomState.teams[0]?.id;
                        window.postMessage({ type: "MAGIC_WHEEL_TOSS_UP_BUZZ", teamId: tId }, "*");
                        if (adminSocketRef.current?.connected) {
                          adminSocketRef.current.emit("magic_wheel:toss_up_buzz" as any, { teamId: tId });
                        }
                      }}
                      onTossUpRevealTick={() => {
                        window.postMessage({ type: "MAGIC_WHEEL_TOSS_UP_TICK" }, "*");
                        if (adminSocketRef.current?.connected) {
                          adminSocketRef.current.emit("magic_wheel:toss_up_tick" as any);
                        }
                      }}
                      onExpressDecide={(boardTrain) => {
                        window.postMessage({ type: "MAGIC_WHEEL_EXPRESS_DECIDE", boardTrain }, "*");
                        if (adminSocketRef.current?.connected) {
                          adminSocketRef.current.emit("magic_wheel:express_decide" as any, { boardTrain });
                        }
                      }}
                      onStealSwapDecide={(mode, targetTeamId) => {
                        window.postMessage({ type: "MAGIC_WHEEL_STEAL_SWAP_DECIDE", mode, targetTeamId }, "*");
                        if (adminSocketRef.current?.connected) {
                          adminSocketRef.current.emit("magic_wheel:steal_swap_decide" as any, { mode, targetTeamId });
                        }
                      }}
                      onSpecialChooseOrder={(order) => {
                        window.postMessage({ type: "MAGIC_WHEEL_SPECIAL_ORDER", order }, "*");
                        if (adminSocketRef.current?.connected) {
                          adminSocketRef.current.emit("magic_wheel:special_order" as any, { order });
                        }
                      }}
                      onSpecialPickLetters={(letters) => {
                        window.postMessage({ type: "MAGIC_WHEEL_SPECIAL_PICK_LETTERS", letters }, "*");
                        if (adminSocketRef.current?.connected) {
                          adminSocketRef.current.emit("magic_wheel:special_pick_letters" as any, { letters });
                        }
                      }}
                      onSetOperationMode={(mode) => {
                        window.postMessage({ type: "MAGIC_WHEEL_SET_MODE", mode }, "*");
                        if (adminSocketRef.current?.connected) {
                          adminSocketRef.current.emit("magic_wheel:set_mode" as any, { mode });
                        }
                      }}
                      onJudgeSolve={(correct) => {
                        window.postMessage({ type: "MAGIC_WHEEL_JUDGE_SOLVE", correct }, "*");
                        if (adminSocketRef.current?.connected) {
                          adminSocketRef.current.emit("magic_wheel:judge_solve" as any, { correct });
                        }
                      }}
                      onPassTurn={() => {
                        window.postMessage({ type: "MAGIC_WHEEL_PASS_TURN" }, "*");
                        if (adminSocketRef.current?.connected) {
                          adminSocketRef.current.emit("magic_wheel:pass_turn" as any);
                        }
                      }}
                      onQuickRevealLetter={() => {
                        window.postMessage({ type: "MAGIC_WHEEL_QUICK_REVEAL" }, "*");
                        if (adminSocketRef.current?.connected) {
                          adminSocketRef.current.emit("magic_wheel:quick_reveal" as any);
                        }
                      }}
                      onRevealAll={() => {
                        window.postMessage({ type: "MAGIC_WHEEL_REVEAL_ALL" }, "*");
                        if (adminSocketRef.current?.connected) {
                          adminSocketRef.current.emit("magic_wheel:reveal_all" as any);
                        }
                      }}
                      onOverrideTurn={(targetTeamId) => {
                        window.postMessage({ type: "MAGIC_WHEEL_OVERRIDE_TURN", teamId: targetTeamId }, "*");
                        if (adminSocketRef.current?.connected) {
                          adminSocketRef.current.emit("magic_wheel:override_turn" as any, { teamId: targetTeamId });
                        }
                      }}
                      onAdvanceRound={() => {
                        window.postMessage({ type: "MAGIC_WHEEL_ADVANCE_ROUND" }, "*");
                        if (adminSocketRef.current?.connected) {
                          adminSocketRef.current.emit("magic_wheel:advance_round" as any);
                        }
                      }}
                    />
                  </div>
                )}

                {roomState?.mode === "TOURNAMENT" && (
                  <div className="pt-2 border-t border-white/10">
                    <button
                      type="button"
                      onClick={handleTournamentAdvance}
                      className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-black"
                    >
                      {roomState?.tournamentState?.championTeamName
                        ? `👑 Vô địch: ${roomState.tournamentState.championTeamName}`
                        : "➡️ Trận kế (1v1)"}
                    </button>
                  </div>
                )}

                {roomState?.mode === "MYSTERY_QUEST" && roomState?.mysteryQuestState && roomState.mysteryQuestState.phase !== "QUESTION_ACTIVE" && (
                  <div className="pt-3 border-t border-white/10 space-y-3">
                    <MysteryQuestBoard
                      mysteryState={roomState.mysteryQuestState}
                      isAdmin={true}
                      teams={roomState.teams}
                      onChooseAction={(action) => {
                        if (!isOfflineSandbox) {
                          adminSocketRef.current?.emit("admin:mystery:choose_action" as any, { action, code });
                        } else {
                          window.postMessage({ type: "MYSTERY_CHOOSE_ACTION", actionChoice: action, action }, "*");
                        }
                      }}
                      onFlipCard={(tileId) => {
                        if (!isOfflineSandbox) {
                          adminSocketRef.current?.emit("admin:mystery:flip_card" as any, { tileId, code });
                        } else {
                          window.postMessage({ type: "MYSTERY_FLIP", action: "mystery_flip", tileId }, "*");
                        }
                      }}
                      onCashOut={() => {
                        if (!isOfflineSandbox) {
                          adminSocketRef.current?.emit("admin:mystery:cash_out" as any, { code });
                        } else {
                          window.postMessage({ type: "MYSTERY_CASH_OUT", action: "mystery_cash_out" }, "*");
                        }
                      }}
                      onAdvanceTurn={() => {
                        window.postMessage({ type: "MYSTERY_ADVANCE_TURN", action: "mystery_advance_turn" }, "*");
                      }}
                      onSelectMiniGame={(miniGameType) => {
                        window.postMessage({ type: "MYSTERY_SET_MINIGAME", action: "mystery_set_minigame", miniGameType }, "*");
                      }}
                      onPairsDecision={(choice) => {
                        if (!isOfflineSandbox) {
                          adminSocketRef.current?.emit("admin:mystery:pairs_decision" as any, { choice, code });
                        } else {
                          window.postMessage({ type: "MYSTERY_PAIRS_DECISION", action: "mystery_pairs_decision", choice }, "*");
                        }
                      }}
                      onChooseStealTarget={(targetTeamId) => {
                        if (!isOfflineSandbox) {
                          adminSocketRef.current?.emit("admin:mystery:choose_steal_target" as any, { targetTeamId, code });
                        } else {
                          window.postMessage({ type: "MYSTERY_CHOOSE_STEAL_TARGET", action: "mystery_choose_steal_target", targetTeamId }, "*");
                        }
                      }}
                      onDoorsDecision={(payload) => {
                        if (!isOfflineSandbox) {
                          adminSocketRef.current?.emit("admin:mystery:doors_decision" as any, { ...payload, code });
                        } else {
                          window.postMessage({ type: "MYSTERY_DOORS_DECISION", action: "mystery_doors_decision", ...payload }, "*");
                        }
                      }}
                      onTarotRedraw={() => {
                        if (!isOfflineSandbox) {
                          adminSocketRef.current?.emit("admin:mystery:tarot_redraw" as any, { code });
                        } else {
                          window.postMessage({ type: "MYSTERY_TAROT_REDRAW", action: "mystery_tarot_redraw" }, "*");
                        }
                      }}
                      onTarotConfirmKeep={() => {
                        if (!isOfflineSandbox) {
                          adminSocketRef.current?.emit("admin:mystery:tarot_keep" as any, { code });
                        } else {
                          window.postMessage({ type: "MYSTERY_TAROT_KEEP", action: "mystery_tarot_keep" }, "*");
                        }
                      }}
                      onUsePeek={() => {
                        if (!isOfflineSandbox) {
                          adminSocketRef.current?.emit("admin:mystery:use_peek" as any, { code });
                        } else {
                          window.postMessage({ type: "MYSTERY_USE_PEEK", action: "mystery_use_peek" }, "*");
                        }
                      }}
                      onTarotProphecyDecision={(choice) => {
                        if (!isOfflineSandbox) {
                          adminSocketRef.current?.emit("admin:mystery:tarot_prophecy_decision" as any, { choice, code });
                        } else {
                          window.postMessage({ type: "MYSTERY_TAROT_PROPHECY_DECISION", action: "mystery_tarot_prophecy_decision", choice }, "*");
                        }
                      }}
                      onDrawTarot={() => {
                        if (!isOfflineSandbox) {
                          adminSocketRef.current?.emit("admin:mystery:draw_tarot" as any, { code });
                        } else {
                          window.postMessage({ type: "MYSTERY_DRAW_TAROT", action: "mystery_draw_tarot" }, "*");
                        }
                      }}
                      onSpinTarotWheel={(powerPercent) => {
                        if (!isOfflineSandbox) {
                          adminSocketRef.current?.emit("admin:mystery:spin_tarot_wheel" as any, { code, powerPercent });
                        } else {
                          window.postMessage({ type: "MYSTERY_SPIN_TAROT_WHEEL", action: "mystery_spin_tarot_wheel", powerPercent }, "*");
                        }
                      }}
                      onTarotReveal={() => {
                        if (!isOfflineSandbox) {
                          adminSocketRef.current?.emit("admin:mystery:ancient_tarot_reveal" as any, { code });
                        } else {
                          window.postMessage({ type: "MYSTERY_TAROT_REVEAL", action: "mystery_tarot_reveal" }, "*");
                        }
                      }}
                      onTarotRespin={() => {
                        if (!isOfflineSandbox) {
                          adminSocketRef.current?.emit("admin:mystery:ancient_tarot_respin" as any, { code });
                        } else {
                          window.postMessage({ type: "MYSTERY_TAROT_RESPIN", action: "mystery_tarot_respin" }, "*");
                        }
                      }}
                      onTarotGamblePrepare={() => {
                        if (!isOfflineSandbox) {
                          adminSocketRef.current?.emit("admin:mystery:ancient_tarot_gamble_prepare" as any, { code });
                        } else {
                          window.postMessage({ type: "MYSTERY_TAROT_GAMBLE_PREPARE", action: "mystery_tarot_gamble_prepare" }, "*");
                        }
                      }}
                      onTarotGambleDecision={(spinAgain, powerPercent) => {
                        if (!isOfflineSandbox) {
                          adminSocketRef.current?.emit("admin:mystery:ancient_tarot_gamble_decision" as any, { spinAgain, powerPercent, code });
                        } else {
                          window.postMessage({ type: "MYSTERY_TAROT_GAMBLE_DECISION", action: "mystery_tarot_gamble_decision", spinAgain, powerPercent }, "*");
                        }
                      }}
                      onSurvivalChoice={(choice) => {
                        if (!isOfflineSandbox) {
                          adminSocketRef.current?.emit("admin:mystery:survival_choice" as any, { choice, code });
                        } else {
                          window.postMessage({ type: "MYSTERY_SURVIVAL_CHOICE", action: "mystery_survival_choice", choice }, "*");
                        }
                      }}
                      onAdjustScore={(teamId, delta, setScore) => handleAdjustScore(teamId, delta, setScore)}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* 1b. MC Answer Key & Explanation Cheat Sheet (Mobile Host View) */}
            {adminQuestionData && currentQuestion && (adminQuestionData.questionId === currentQuestion.question.id) && !(roomState?.mode === "MYSTERY_QUEST" && roomState?.mysteryQuestState?.phase !== "QUESTION_ACTIVE") && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs space-y-2 animate-slide-up shadow-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-bold text-amber-300">
                    <span>🔑</span>
                    <span>Phao đáp án & Lời giải MC</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowMcCheatSheet((prev) => !prev)}
                    className="text-[11px] text-amber-400 hover:text-amber-200 underline font-medium cursor-pointer"
                  >
                    {showMcCheatSheet ? "Thu gọn ▲" : "Xem chi tiết ▼"}
                  </button>
                </div>
                {showMcCheatSheet && (
                  <div className="pt-2 border-t border-amber-500/20 space-y-1.5">
                    <div className="flex items-start gap-1.5">
                      <span className="font-semibold text-amber-200 shrink-0">Đáp án chuẩn:</span>
                      <span className="font-bold text-emerald-300">
                        {(() => {
                          if (adminQuestionData.options && Array.isArray(adminQuestionData.options)) {
                            const correctOpts = adminQuestionData.options.filter((o: any) => o.isCorrect);
                            if (correctOpts.length > 0) return correctOpts.map((o: any) => o.text).join(", ");
                          }
                          if (adminQuestionData.answer) {
                            return Array.isArray(adminQuestionData.answer)
                              ? adminQuestionData.answer.join(", ")
                              : String(adminQuestionData.answer);
                          }
                          return "Chưa có đáp án cấu hình";
                        })()}
                      </span>
                    </div>
                    {(adminQuestionData.explanation || currentQuestion.question.hint) && (
                      <div className="flex items-start gap-1.5">
                        <span className="font-semibold text-amber-200 shrink-0">💡 Giải thích MC:</span>
                        <span className="text-amber-100/90 leading-relaxed text-[11px]">
                          {adminQuestionData.explanation || currentQuestion.question.hint}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* 2. Teams & Scoring Card */}
            <div className="p-3 rounded-xl bg-[#151728]/80 border border-white/10 space-y-2.5 shadow-lg">
              <div className="flex items-center justify-between border-b border-white/10 pb-1.5">
                <span className="font-black text-xs text-white uppercase tracking-wider">👥 4 Đội thi & Chấm điểm</span>
                <span className="text-[10px] text-slate-400">Chạm để đổi người chơi</span>
              </div>
              <div className="space-y-1.5">
                {stableTeams.map((t: TeamState, idx: number) => {
                  const isActive = activeTeamIndex === idx;
                  return (
                    <div
                      key={t.id}
                      className={`p-2 rounded-xl border flex items-center justify-between gap-1.5 transition ${
                        isActive
                          ? "bg-purple-900/30 border-purple-500 ring-1 ring-purple-400/50"
                          : "bg-black/30 border-white/10"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          handleSwitchActiveTeam(idx);
                          setMobileTab("PLAYER");
                        }}
                        className="flex items-center gap-1.5 min-w-0 flex-1 text-left cursor-pointer"
                      >
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: t.color }} />
                        <span className="font-bold text-xs truncate text-white">{t.name}</span>
                        {isActive && (
                          <span className="text-[9px] px-1 py-0.2 rounded bg-purple-500/30 text-purple-300 font-bold">
                            Đang xem
                          </span>
                        )}
                      </button>
                      <span className="font-mono font-black text-cyan-300 text-xs shrink-0 mr-1">
                        {t.score}đ
                        {roomState?.mode === "MAGIC_WHEEL" &&
                        roomState?.magicWheelState?.phase !== "ROUND_RECAP" &&
                        (roomState?.magicWheelState?.roundScores?.[t.id] || 0) > 0 ? (
                          <span className="text-amber-300 font-extrabold ml-0.5">
                            (+{roomState?.magicWheelState?.roundScores?.[t.id]}đ)
                          </span>
                        ) : null}
                        {roomState?.mode === "MYSTERY_QUEST" && roomState?.mysteryQuestState?.currentTurnTeamId === t.id && roomState.mysteryQuestState.phase !== "TURN_SUMMARY" && (roomState.mysteryQuestState.potPoints || 0) > 0 ? (
                          <span className="text-yellow-400 font-extrabold ml-0.5">(+{roomState.mysteryQuestState.potPoints}đ)</span>
                        ) : null}
                      </span>
                      <div className="flex items-center gap-1 shrink-0 flex-wrap">
                        <button
                          type="button"
                          onClick={() => handleAdjustScore(t.id, 10)}
                          className="px-1.5 py-0.5 rounded bg-green-500/20 hover:bg-green-500/30 text-green-300 font-mono font-bold text-[10px]"
                          title="Cộng 10 điểm"
                        >
                          +10
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAdjustScore(t.id, 20)}
                          className="px-1.5 py-0.5 rounded bg-green-500/20 hover:bg-green-500/30 text-green-300 font-mono font-bold text-[10px]"
                          title="Cộng 20 điểm"
                        >
                          +20
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAdjustScore(t.id, -10)}
                          className="px-1.5 py-0.5 rounded bg-red-500/20 hover:bg-red-500/30 text-red-300 font-mono font-bold text-[10px]"
                          title="Trừ 10 điểm"
                        >
                          -10
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAdjustScore(t.id, -20)}
                          className="px-1.5 py-0.5 rounded bg-red-500/20 hover:bg-red-500/30 text-red-300 font-mono font-bold text-[10px]"
                          title="Trừ 20 điểm"
                        >
                          -20
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const newScoreStr = window.prompt(`Nhập điểm số chính xác cho ${t.name}:`, String(t.score));
                            if (newScoreStr !== null) {
                              const parsed = parseInt(newScoreStr, 10);
                              if (!isNaN(parsed)) handleAdjustScore(t.id, undefined, Math.max(0, parsed));
                            }
                          }}
                          className="px-1.5 py-0.5 rounded bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 font-bold text-[10px] flex items-center gap-0.5 cursor-pointer"
                          title="Nhập số điểm chính xác"
                        >
                          <span>✏️</span>
                          <span>Đặt</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 3. Automation & Utilities Card */}
            <div className="p-3 rounded-xl bg-[#151728]/80 border border-white/10 space-y-2.5 shadow-lg">
              <span className="font-black text-xs text-white uppercase tracking-wider block border-b border-white/10 pb-1.5">
                🛠️ Tiện ích & Tự động
              </span>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setBotAutoEnabled(!botAutoEnabled)}
                  className={`p-2 rounded-xl border flex items-center justify-between text-left transition ${
                    botAutoEnabled ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-300" : "glass border-white/10 text-slate-300"
                  }`}
                >
                  <span className="font-bold text-[11px]">🤖 Bot tự động</span>
                  <span className="font-mono text-[10px] font-black">{botAutoEnabled ? "BẬT" : "TẮT"}</span>
                </button>

                <button
                  type="button"
                  onClick={handleTriggerAllBotsAnswer}
                  disabled={!currentQuestion || !!revealPayload || Boolean(timer && timer.remaining <= 0)}
                  className="p-2 rounded-xl glass border border-white/10 text-slate-300 hover:text-white font-bold text-[11px] disabled:opacity-40 text-left"
                >
                  ⚡ Bot nộp bài ngay
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (roomState) updateConfig("autoTimerStart", !roomState.config.autoTimerStart);
                  }}
                  className={`p-2 rounded-xl border flex items-center justify-between text-left transition ${
                    roomState?.config.autoTimerStart ? "bg-cyan-500/20 border-cyan-500/40 text-cyan-300" : "glass border-white/10 text-slate-300"
                  }`}
                >
                  <span className="font-bold text-[11px]">⏱️ Đếm tự động</span>
                  <span className="font-mono text-[10px] font-black">{roomState?.config.autoTimerStart ? "BẬT" : "TẮT"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowRulesModal(true)}
                  className="p-2 rounded-xl glass border border-white/10 text-cyan-300 font-bold text-[11px] text-left"
                >
                  📖 Luật chơi mode
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (roomState?.teams && roomState.teams.length > 0) {
                      setGrantTargetTeamId(roomState.teams[0].id);
                    }
                    setShowCardModal(true);
                  }}
                  className="p-2 rounded-xl glass border border-white/10 text-purple-300 font-bold text-[11px] text-left"
                >
                  🃏 Cấp thẻ bổ trợ
                </button>

                <button
                  type="button"
                  onClick={() => setShowLogsModal(true)}
                  className="p-2 rounded-xl glass border border-white/10 text-amber-300 font-bold text-[11px] text-left flex items-center justify-between"
                >
                  <span>📜 Xem nhật ký</span>
                  <span className="font-mono text-[10px] opacity-70">({botLogs.length})</span>
                </button>
              </div>
            </div>

            {/* 4. Exit / Reset Button */}
            <div className="pt-1">
              <button
                type="button"
                onClick={() => {
                  clearSandboxSession();
                  setCode("");
                  setRoomState(null);
                  setCurrentQuestion(null);
                  setIsOfflineSandbox(false);
                }}
                className="w-full py-2.5 rounded-xl glass hover:bg-red-500/20 border border-red-500/30 text-red-400 font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>✕</span>
                <span>Thoát và đổi phòng</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Debug Card Grant Modal ────────────────────────────────────────── */}
      {showCardModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in"
          onClick={() => setShowCardModal(false)}
        >
          <div
            className="w-full max-w-md glass rounded-3xl border border-white/20 p-5 flex flex-col gap-4 shadow-2xl bg-[#121324]/95 text-white"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <h3 className="text-base font-black flex items-center gap-2">
                <span>🃏</span>
                <span>Cấp thẻ hỗ trợ cho Đội (Debug Card)</span>
              </h3>
              <button
                onClick={() => setShowCardModal(false)}
                className="w-7 h-7 rounded-lg glass hover:bg-white/10 flex items-center justify-center text-muted-foreground hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-muted-foreground font-bold mb-1">Chọn Đội nhận thẻ:</label>
                <select
                  value={grantTargetTeamId}
                  onChange={(e) => setGrantTargetTeamId(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl glass border border-white/20 text-white bg-[#151728] focus:outline-none"
                >
                  {(roomState?.teams || []).map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} (Điểm: {t.score})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-muted-foreground font-bold mb-1">
                  Chọn loại thẻ Power-up ({roomState?.mode || "CLASSIC"}):
                </label>
                <div className="grid grid-cols-2 gap-1.5 max-h-48 overflow-y-auto pr-1">
                  {(() => {
                    const currentModeAllowed = getDefaultAllowedPowerupsForMode((roomState?.mode || "CLASSIC") as GameMode);
                    return (Object.keys(CARD_METADATA) as CardType[]).map((cType) => {
                      const meta = CARD_METADATA[cType];
                      const isSupported = currentModeAllowed.includes(cType);
                      const active = grantCardType === cType;
                      return (
                        <button
                          key={cType}
                          type="button"
                          disabled={!isSupported}
                          onClick={() => setGrantCardType(cType)}
                          className={`p-2 rounded-xl border text-left flex items-center gap-2 transition ${
                            !isSupported
                              ? "opacity-30 cursor-not-allowed border-red-500/20 bg-red-950/10 text-slate-500"
                              : active
                              ? "bg-purple-600/30 border-purple-500 text-white font-bold"
                              : "glass border-white/10 text-slate-300 hover:text-white hover:bg-white/5"
                          }`}
                        >
                          <span className={`text-lg ${!isSupported ? "grayscale opacity-50" : ""}`}>{meta.emoji}</span>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between">
                              <p className="truncate font-semibold text-[11px]">{meta.nameVi}</p>
                              {!isSupported && (
                                <span className="text-[9px] px-1 py-0.2 rounded bg-red-500/20 text-red-300 font-bold border border-red-500/30">
                                  Khóa
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] text-muted-foreground truncate">
                              {!isSupported ? `Không thuộc mode ${roomState?.mode}` : meta.summaryVi}
                            </p>
                          </div>
                        </button>
                      );
                    });
                  })()}
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={handleGrantCard}
                className="flex-1 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition"
              >
                Xác nhận cấp thẻ ngay
              </button>
              <button
                type="button"
                onClick={() => setShowCardModal(false)}
                className="px-4 py-2 rounded-xl glass hover:bg-white/10 text-slate-300 font-bold text-xs transition"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Bot Logs Full Modal ─────────────────────────────────────────── */}
      {showLogsModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in"
          onClick={() => setShowLogsModal(false)}
        >
          <div
            className="w-full max-w-2xl glass rounded-3xl border border-white/20 p-5 flex flex-col gap-3 shadow-2xl bg-[#121324]/95 text-white max-h-[80vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <h3 className="text-base font-black flex items-center gap-2">
                <span>📜</span>
                <span>Toàn bộ nhật ký Bot ảo & Sự kiện ({botLogs.length})</span>
              </h3>
              <button
                onClick={() => setShowLogsModal(false)}
                className="w-7 h-7 rounded-lg glass hover:bg-white/10 flex items-center justify-center text-muted-foreground hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto space-y-1.5 font-mono text-xs text-slate-300 pr-1 p-2 rounded-xl bg-black/40 border border-white/5">
              {botLogs.length === 0 ? (
                <p className="text-slate-500 text-center py-4">Chưa có nhật ký sự kiện nào.</p>
              ) : (
                botLogs.map((log, i) => (
                  <div key={i} className="py-0.5 border-b border-white/5 last:border-0 leading-relaxed">
                    {log}
                  </div>
                ))
              )}
            </div>

            <div className="flex justify-between items-center pt-1 border-t border-white/10">
              <button
                type="button"
                onClick={() => setBotLogs([])}
                className="px-3 py-1.5 rounded-lg glass hover:bg-red-500/20 text-red-400 font-bold text-xs transition"
              >
                Xóa sạch logs
              </button>
              <button
                type="button"
                onClick={() => setShowLogsModal(false)}
                className="px-4 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Essay / Manual Grading Modal ─────────────────────────────────── */}
      {showEssayModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in"
          onClick={() => setShowEssayModal(false)}
        >
          <div
            className="w-full max-w-2xl glass rounded-3xl border border-white/20 p-5 flex flex-col gap-4 shadow-2xl bg-[#121324]/95 text-white max-h-[85vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <h3 className="text-base font-black flex items-center gap-2">
                <span>✏️</span>
                <span>Chấm điểm tự luận & Thủ công</span>
              </h3>
              <button
                onClick={() => setShowEssayModal(false)}
                className="w-7 h-7 rounded-lg glass hover:bg-white/10 flex items-center justify-center text-muted-foreground hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto space-y-3 pr-1">
              {(!revealPayload || !revealPayload.answers || revealPayload.answers.length === 0) ? (
                <div className="text-center py-8 text-slate-400">
                  <p className="text-2xl mb-2">📝</p>
                  <p>Chưa có câu trả lời nào được nộp hoặc chưa nhấn [Công bố].</p>
                  <p className="text-xs text-slate-500 mt-1">Khi công bố kết quả, các bài làm của thí sinh sẽ hiển thị tại đây để MC chấm điểm.</p>
                </div>
              ) : (
                revealPayload.answers.map((ans: any, idx: number) => {
                  const itemKey = ans.id || ans.teamId || ans.playerId || `ans_${idx}`;
                  const currentScore = essayGradingScores[itemKey] ?? (ans.pointsAwarded ?? 10);

                  return (
                    <div
                      key={itemKey}
                      className="p-3 rounded-2xl glass border border-white/10 bg-black/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-black text-sm text-cyan-300">{ans.name || `Đội ${idx + 1}`}</span>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              ans.isCorrect === true
                                ? "bg-green-500/20 text-green-300 border border-green-500/30"
                                : ans.isCorrect === false
                                ? "bg-red-500/20 text-red-300 border border-red-500/30"
                                : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                            }`}
                          >
                            {ans.isCorrect === true ? "✓ Đúng" : ans.isCorrect === false ? "✗ Sai" : "⏳ Chờ chấm"}
                          </span>
                          <span className="text-[11px] font-mono text-slate-400">
                            Hiện có: {ans.pointsAwarded ?? 0}đ
                          </span>
                        </div>
                        <p className="text-xs text-slate-200 bg-white/5 p-2 rounded-xl font-mono break-words">
                          {Array.isArray(ans.answer) ? ans.answer.join(", ") : String(ans.answer || "(Trống)")}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={currentScore}
                          onChange={(e) =>
                            setEssayGradingScores((prev) => ({
                              ...prev,
                              [itemKey]: Number(e.target.value),
                            }))
                          }
                          className="w-16 px-2 py-1.5 rounded-xl glass border border-white/20 text-white font-mono font-bold text-xs bg-[#0f0f1a] text-center focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => handleScoreManual(ans.id || "", currentScore, ans.teamId, ans.playerId)}
                          className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white font-bold text-xs transition active:scale-95 shadow-sm"
                        >
                          Lưu điểm
                        </button>
                        <div className="flex flex-col gap-1">
                          <button
                            type="button"
                            onClick={() => handleScoreManual(ans.id || "", 10, ans.teamId, ans.playerId)}
                            className="px-1.5 py-0.5 rounded bg-green-500/20 hover:bg-green-500/30 text-green-300 text-[10px] font-bold"
                          >
                            +10đ
                          </button>
                          <button
                            type="button"
                            onClick={() => handleScoreManual(ans.id || "", 0, ans.teamId, ans.playerId)}
                            className="px-1.5 py-0.5 rounded bg-red-500/20 hover:bg-red-500/30 text-red-300 text-[10px] font-bold"
                          >
                            0đ
                          </button>
                        </div>
                        {/* Quick Two-way Verdict Overrides */}
                        <div className="flex flex-col gap-1">
                          <button
                            type="button"
                            onClick={() => handleOverrideVerdict(ans.teamId, true, ans.id, ans.playerId)}
                            className="px-2 py-0.5 rounded bg-emerald-600/80 hover:bg-emerald-500 text-white text-[10px] font-bold flex items-center justify-center gap-1 shadow-sm transition active:scale-95"
                            title="MC Duyệt Đúng: Chuyển thành Đúng, cộng điểm chuẩn và mở khóa hành động tiếp theo"
                          >
                            <span>⚖️ Đúng</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOverrideVerdict(ans.teamId, false, ans.id, ans.playerId)}
                            className="px-2 py-0.5 rounded bg-rose-600/80 hover:bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center gap-1 shadow-sm transition active:scale-95"
                            title="MC Chấm Sai: Chuyển thành Sai và thu hồi điểm"
                          >
                            <span>❌ Sai</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={() => setShowEssayModal(false)}
                className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MC Direct Answer Submission Modal ─────────────────────────────── */}
      {showDirectAnswerModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in"
          onClick={() => setShowDirectAnswerModal(false)}
        >
          <div
            className="w-full max-w-lg glass rounded-3xl border border-white/20 p-5 flex flex-col gap-4 shadow-2xl bg-[#121324]/95 text-white max-h-[85vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <h3 className="text-base font-black flex items-center gap-2">
                <span>🎙️</span>
                <span>MC chọn đáp án trực tiếp</span>
              </h3>
              <button
                onClick={() => setShowDirectAnswerModal(false)}
                className="w-7 h-7 rounded-lg glass hover:bg-white/10 flex items-center justify-center text-muted-foreground hover:text-white"
              >
                ✕
              </button>
            </div>

            {/* Question preview */}
            <div className="p-3 rounded-2xl glass border border-purple-500/30 bg-purple-950/20">
              <p className="text-[10px] font-bold uppercase tracking-wider text-purple-300 mb-1">
                Câu hỏi hiện tại ({currentQuestion?.question.points || 10}đ)
              </p>
              <p className="text-xs font-semibold text-white leading-relaxed line-clamp-2">
                {currentQuestion?.question.content || "Chưa có câu hỏi"}
              </p>
            </div>

            {/* Phao đáp án & Lời giải MC */}
            {adminQuestionData && currentQuestion && (adminQuestionData.questionId === currentQuestion.question.id) && (
              <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs space-y-1.5 animate-slide-up">
                <div className="flex items-center gap-1.5 font-bold text-amber-300">
                  <span>🔑</span>
                  <span>Phao đáp án & Lời giải MC</span>
                </div>
                <div className="pt-1.5 border-t border-amber-500/20 space-y-1">
                  <div className="flex items-start gap-1.5">
                    <span className="font-semibold text-amber-200 shrink-0">Đáp án chuẩn:</span>
                    <span className="font-bold text-emerald-300">
                      {(() => {
                        if (adminQuestionData.options && Array.isArray(adminQuestionData.options)) {
                          const correctOpts = adminQuestionData.options.filter((o: any) => o.isCorrect);
                          if (correctOpts.length > 0) return correctOpts.map((o: any) => o.text).join(", ");
                        }
                        if (adminQuestionData.answer) {
                          return Array.isArray(adminQuestionData.answer)
                            ? adminQuestionData.answer.join(", ")
                            : String(adminQuestionData.answer);
                        }
                        return "Chưa có đáp án cấu hình";
                      })()}
                    </span>
                  </div>
                  {(adminQuestionData.explanation || currentQuestion.question.hint) && (
                    <div className="flex items-start gap-1.5">
                      <span className="font-semibold text-amber-200 shrink-0">💡 Giải thích MC:</span>
                      <span className="text-amber-100/90 leading-relaxed text-[11px]">
                        {adminQuestionData.explanation || currentQuestion.question.hint}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Target Team Selection */}
            <div>
              <label className="block text-[11px] font-bold text-slate-400 mb-1.5">
                1. Chọn đội để MC nộp đáp án:
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                {(roomState?.teams || []).map((t) => {
                  const isTarget = (directAnswerTargetTeamId || currentTeam?.id) === t.id;
                  const chosenOpt = teamSelectedAnswers[t.id];
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setDirectAnswerTargetTeamId(t.id)}
                      className={`p-2 rounded-xl text-left border transition flex flex-col gap-0.5 cursor-pointer ${
                        isTarget
                          ? "bg-purple-600/40 border-purple-400 ring-2 ring-purple-400/50"
                          : "glass border-white/10 hover:border-white/30 text-slate-300"
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: t.color }} />
                        <span className="font-bold text-xs truncate text-white">{t.name}</span>
                      </div>
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="text-cyan-300 font-mono">{t.score}đ</span>
                        {chosenOpt && (
                          <span className="font-black text-amber-300 px-1 rounded bg-amber-500/20">
                            [{chosenOpt}]
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Option Selection */}
            <div>
              <label className="block text-[11px] font-bold text-slate-400 mb-1.5">
                2. Bấm chọn phương án cho đội được chọn:
              </label>
              {currentQuestion?.question.options ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {currentQuestion.question.options.map((opt, i) => {
                    const activeTeamId = directAnswerTargetTeamId || currentTeam?.id || roomState?.teams[0]?.id || "";
                    const isSelected = teamSelectedAnswers[activeTeamId] === opt.id;
                    const labels = ["A", "B", "C", "D", "E", "F"];
                    const isCheatCorrect = Boolean(
                      adminQuestionData?.questionId === currentQuestion.question.id && (
                        adminQuestionData?.options?.some((o: any) => o.id === opt.id && o.isCorrect) ||
                        adminQuestionData?.answer === opt.id ||
                        (Array.isArray(adminQuestionData?.answer) && adminQuestionData.answer.includes(opt.id))
                      )
                    );

                    let btnStyle = "glass border-white/15 hover:border-purple-400 hover:bg-white/5 text-white";
                    if (isSelected) {
                      btnStyle = "bg-emerald-500/20 border-emerald-400 text-emerald-300 ring-1 ring-emerald-400 shadow-md";
                    } else if (isCheatCorrect) {
                      btnStyle = "border-amber-500/50 bg-amber-500/10 text-amber-200 hover:border-amber-400";
                    }

                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => handleAdminSubmitDirectAnswer(activeTeamId, opt.id)}
                        className={`p-3 rounded-2xl border text-left transition flex items-center gap-2.5 cursor-pointer active:scale-95 ${btnStyle}`}
                      >
                        <span className={`w-6 h-6 rounded-lg flex items-center justify-center font-black text-xs shrink-0 ${
                          isSelected
                            ? "bg-emerald-500 text-black"
                            : isCheatCorrect
                            ? "bg-amber-400 text-black font-black"
                            : "bg-white/10 text-cyan-300"
                        }`}>
                          {labels[i] || i + 1}
                        </span>
                        <span className="text-xs font-medium flex-1 truncate">{opt.text}</span>
                        {isSelected && <span className="text-emerald-400 text-xs font-bold shrink-0">✓ Đã nộp</span>}
                        {isCheatCorrect && !isSelected && (
                          <span className="px-1.5 py-0.5 rounded bg-amber-400 text-black text-[10px] font-black uppercase tracking-wider shrink-0">
                            🔑 Chuẩn
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-slate-400 text-center py-4 glass rounded-xl">
                  Câu hỏi này không có các lựa chọn A/B/C/D trắc nghiệm.
                </p>
              )}
            </div>

            <div className="flex justify-between items-center pt-2 border-t border-white/10">
              <span className="text-[11px] text-slate-400">
                💡 MC có thể chọn nhiều đội lần lượt mà không cần tắt hộp thoại.
              </span>
              <button
                type="button"
                onClick={() => setShowDirectAnswerModal(false)}
                className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition"
              >
                Xong
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Tie-Breaker (Sudden Death) Overlay ───────────────────────────── */}
      {sandboxTieBreaker && (
        <TieBreakerOverlay
          role="ADMIN"
          tieBreaker={sandboxTieBreaker}
          playerTeamId={activeTeamIdRef.current || stableTeams[activeTeamIndex]?.id}
          onClose={() => setSandboxTieBreaker(null)}
          onBuzz={() => {
            const currentTId = activeTeamIdRef.current || stableTeams[activeTeamIndex]?.id || stableTeams[0]?.id;
            const currentT = stableTeams.find((t) => t.id === currentTId) || stableTeams[0];
            setSandboxTieBreaker((prev) => {
              if (!prev) return null;
              return {
                ...prev,
                status: "BUZZER_LOCKED",
                buzzedTeamId: currentT.id,
                buzzedTeamName: currentT.name,
                buzzedTeamColor: currentT.color || "#6366f1",
              };
            });
            addLog(`🔔 [Tie-Breaker] Đội ${currentT.name} đã bấm chuông giành quyền!`);
          }}
          onAnswer={(optionId) => {
            setSandboxTieBreaker((prev) => {
              if (!prev || !prev.currentQuestion) return null;
              const isCorrect = prev.currentQuestion.correctOptionId === optionId;
              if (isCorrect) {
                const champName = prev.buzzedTeamName || prev.tiedTeams[0]?.name || "Quán Quân";
                const champId = prev.buzzedTeamId || prev.tiedTeams[0]?.id;
                addLog(`🎉 [Tie-Breaker] Đội ${champName} trả lời chính xác -> ĐOẠT NGÔI QUÁN QUÂN!`);
                return {
                  ...prev,
                  status: "COMPLETED",
                  championTeamId: champId,
                  championTeamName: champName,
                };
              } else {
                addLog(`❌ [Tie-Breaker] ${prev.buzzedTeamName || "Đội"} trả lời sai câu hỏi phụ.`);
                const newAttempted = [...prev.attemptedTeamIds, prev.buzzedTeamId!].filter(Boolean);
                if (newAttempted.length >= prev.tiedTeams.length) {
                  if (prev.questionIndex + 1 < prev.maxQuestions) {
                    const nextIdx = prev.questionIndex + 1;
                    return {
                      ...prev,
                      status: "QUESTION_ACTIVE",
                      questionIndex: nextIdx,
                      currentQuestion: prev.questions?.[nextIdx],
                      buzzedTeamId: undefined,
                      buzzedTeamName: undefined,
                      buzzedTeamColor: undefined,
                      attemptedTeamIds: [],
                    };
                  } else {
                    return {
                      ...prev,
                      status: "LUCKY_DRAW",
                      luckyDraw: {
                        envelopes: [
                          { id: 1, isOpened: false, isChampion: false },
                          { id: 2, isOpened: false, isChampion: true },
                          { id: 3, isOpened: false, isChampion: false },
                        ],
                      },
                    };
                  }
                }
                return {
                  ...prev,
                  status: "QUESTION_ACTIVE",
                  buzzedTeamId: undefined,
                  buzzedTeamName: undefined,
                  buzzedTeamColor: undefined,
                  attemptedTeamIds: newAttempted,
                };
              }
            });
          }}
          onLuckyPick={(envId) => {
            setSandboxTieBreaker((prev) => {
              if (!prev || !prev.luckyDraw) return null;
              const currentTId = activeTeamIdRef.current || stableTeams[activeTeamIndex]?.id || stableTeams[0]?.id;
              const currentT = stableTeams.find((t) => t.id === currentTId) || stableTeams[0];
              const updatedEnvelopes = prev.luckyDraw.envelopes.map((env) =>
                env.id === envId
                  ? { ...env, isOpened: true, pickedByTeamId: currentT.id, pickedByTeamName: currentT.name }
                  : env
              );
              const chosen = updatedEnvelopes.find((e) => e.id === envId);
              if (chosen?.isChampion) {
                addLog(`👑 [Tie-Breaker Bốc thăm] Đội ${currentT.name} bốc trúng Vương Miện Quán Quân!`);
                return {
                  ...prev,
                  status: "COMPLETED",
                  championTeamId: currentT.id,
                  championTeamName: currentT.name,
                  luckyDraw: { envelopes: updatedEnvelopes },
                };
              } else {
                const otherT = prev.tiedTeams.find((t) => t.id !== currentT.id) || prev.tiedTeams[0];
                addLog(`🥈 [Tie-Breaker Bốc thăm] Đội ${currentT.name} bốc Á Quân. Quán Quân thuộc về ${otherT.name}!`);
                return {
                  ...prev,
                  status: "COMPLETED",
                  championTeamId: otherT.id,
                  championTeamName: otherT.name,
                  luckyDraw: { envelopes: updatedEnvelopes },
                };
              }
            });
          }}
          onAdminAction={(action, winnerTeamId) => {
            if (adminSocketRef.current?.connected && code) {
              adminSocketRef.current.emit("admin:tie_breaker:advance" as any, { code, action, winnerTeamId });
            }
            if (action === "NEXT_QUESTION") {
              setSandboxTieBreaker((prev) => {
                if (!prev) return null;
                const nextIdx = prev.questionIndex + 1;
                if (nextIdx < prev.maxQuestions) {
                  return {
                    ...prev,
                    status: "QUESTION_ACTIVE",
                    questionIndex: nextIdx,
                    currentQuestion: prev.questions?.[nextIdx],
                    buzzedTeamId: undefined,
                    buzzedTeamName: undefined,
                    buzzedTeamColor: undefined,
                    attemptedTeamIds: [],
                  };
                } else {
                  return {
                    ...prev,
                    status: "LUCKY_DRAW",
                    luckyDraw: {
                      envelopes: [
                        { id: 1, isOpened: false, isChampion: false },
                        { id: 2, isOpened: false, isChampion: true },
                        { id: 3, isOpened: false, isChampion: false },
                      ],
                    },
                  };
                }
              });
            } else if (action === "START_LUCKY_DRAW") {
              setSandboxTieBreaker((prev) => {
                if (!prev) return null;
                return {
                  ...prev,
                  status: "LUCKY_DRAW",
                  luckyDraw: {
                    envelopes: [
                      { id: 1, isOpened: false, isChampion: false },
                      { id: 2, isOpened: false, isChampion: true },
                      { id: 3, isOpened: false, isChampion: false },
                    ],
                  },
                };
              });
            } else if (action === "FORCE_CHAMPION") {
              setSandboxTieBreaker((prev) => {
                if (!prev) return null;
                const target = prev.tiedTeams.find((t) => t.id === winnerTeamId) || prev.tiedTeams[0];
                return {
                  ...prev,
                  status: "COMPLETED",
                  championTeamId: target.id,
                  championTeamName: target.name,
                };
              });
            }
          }}
        />
      )}

      {/* ── Game Mode Rules Modal ─────────────────────────────────────────── */}
      <GameModeRulesModal
        mode={roomState?.mode || selectedMode}
        isOpen={showRulesModal}
        onClose={() => setShowRulesModal(false)}
      />
    </div>
  );
}
