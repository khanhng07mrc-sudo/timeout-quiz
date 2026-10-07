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
} from "@/types";
import { CARD_METADATA, quantizeOlympiaTimeLimit } from "@/types";
import Link from "next/link";
import GameModeRulesModal from "@/components/ui/GameModeRulesModal";
import GameModeIcon from "@/components/ui/GameModeIcon";
import MysteryQuestBoard from "@/components/modes/MysteryQuestBoard";
import {
  generateMysteryStageForTurn,
  handleFlipCard as handleMysteryFlipCard,
  handleCashOut as handleMysteryCashOut,
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

const AVAILABLE_MODES: { mode: GameMode; name: string; emoji: string }[] = [
  { mode: "CLASSIC", name: "Truyền thống", emoji: "⚡" },
  { mode: "BUZZ", name: "Bấm chuông nhanh", emoji: "🛎️" },
  { mode: "BOUNCEBACK", name: "Cướp điểm luân phiên (Về đích Olympia)", emoji: "🔄" },
  { mode: "ELIMINATION", name: "Sinh tồn loại dần", emoji: "💀" },
  { mode: "TOURNAMENT", name: "Đấu loại 1v1", emoji: "🏆" },
  { mode: "GRID_CARO", name: "Lưới chọn ô & Caro", emoji: "🏁" },
  { mode: "DICE_RACE", name: "Đua cờ Xí ngầu", emoji: "🎲" },
  { mode: "WAGER", name: "Cược điểm Bí mật", emoji: "💰" },
  { mode: "MYSTERY_QUEST", name: "Hành Trình Bí Ẩn", emoji: "🗝️" },
];

export default function AdminSandboxPage() {
  const [code, setCode] = useState<string>("");
  const [inputCode, setInputCode] = useState<string>("");
  const [selectedMode, setSelectedMode] = useState<GameMode>("GRID_CARO");
  const [selectedBankId, setSelectedBankId] = useState<string>("");
  const [quizBanks, setQuizBanks] = useState<{ id: string; title: string; _count?: { questions: number } }[]>([]);
  const [creating, setCreating] = useState(false);
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

  // Stable team ordering: keeps teams in deterministic positions (index 0, 1, 2, 3) across questions & score updates
  const stableTeams = useMemo<TeamState[]>(() => {
    if (!roomState?.teams || roomState.teams.length === 0) return [];
    if (isOfflineSandbox) {
      const fixedOrder = ["t_red", "t_blue", "t_yellow", "t_purple"];
      return [...roomState.teams].sort((a, b) => {
        const idxA = fixedOrder.indexOf(a.id);
        const idxB = fixedOrder.indexOf(b.id);
        if (idxA !== -1 && idxB !== -1) return idxA - idxB;
        if (idxA !== -1) return -1;
        if (idxB !== -1) return 1;
        return 0;
      });
    }
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
  }, [roomState?.teams, isOfflineSandbox]);

  const currentTeam = stableTeams[activeTeamIndex] || stableTeams[0];

  useEffect(() => {
    if (currentTeam?.id) {
      activeTeamIdRef.current = currentTeam.id;
    }
  }, [currentTeam?.id]);

  // Bot automation state (default: OFF, manual on-demand control)
  const [botAutoEnabled, setBotAutoEnabled] = useState(false);
  const [botLogs, setBotLogs] = useState<string[]>([]);

  // Debug card grant modal
  const [showCardModal, setShowCardModal] = useState(false);
  const [grantCardType, setGrantCardType] = useState<CardType>("DOUBLE");
  const [grantTargetTeamId, setGrantTargetTeamId] = useState<string>("");

  // Rule modal
  const [showRulesModal, setShowRulesModal] = useState(false);
  const [showLogsModal, setShowLogsModal] = useState(false);
  const [showCheatDropdown, setShowCheatDropdown] = useState(false);
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
  const [matchStarting, setMatchStarting] = useState<{ seconds: number } | null>(null);
  const [questionPrepare, setQuestionPrepare] = useState<GamePreparePayload | null>(null);
  const [intermission, setIntermission] = useState<GameIntermissionPayload | null>(null);
  const [cardsLocked, setCardsLocked] = useState(false);
  const [showEssayModal, setShowEssayModal] = useState(false);
  const [essayGradingScores, setEssayGradingScores] = useState<Record<string, number>>({});
  const [showDirectAnswerModal, setShowDirectAnswerModal] = useState(false);
  const [directAnswerTargetTeamId, setDirectAnswerTargetTeamId] = useState<string>("");
  const [teamSelectedAnswers, setTeamSelectedAnswers] = useState<Record<string, string>>({});
  const [initialTeamScoreInput, setInitialTeamScoreInput] = useState<number>(0);

  const offlinePrepIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const offlineWarmupIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const pendingOfflineLaunchRef = useRef<(() => void) | null>(null);
  const handleWagerLaunchQuestionRef = useRef<() => void>(() => {});
  const handleAdminNextRef = useRef<() => void>(() => {});

  // Local ticker for match warmup countdown (5s)
  useEffect(() => {
    if (!matchStarting) return;
    const interval = setInterval(() => {
      setMatchStarting((prev) => {
        if (!prev || prev.seconds <= 1) return null;
        return { seconds: prev.seconds - 1 };
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [Boolean(matchStarting)]);

  // Local ticker for question preparation countdown (3s)
  useEffect(() => {
    if (!questionPrepare) return;
    const interval = setInterval(() => {
      setQuestionPrepare((prev) => {
        if (!prev || prev.seconds <= 1) return null;
        return { ...prev, seconds: prev.seconds - 1 };
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [Boolean(questionPrepare)]);

  const addLog = useCallback((msg: string) => {
    setBotLogs((prev) => [
      `[${new Date().toLocaleTimeString()}] ${msg}`,
      ...prev.slice(0, 49),
    ]);
  }, []);

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

    // Spawn bot sockets for all teams
    teams.forEach((team, botIdx) => {
      const sock: Socket<ServerToClientEvents, ClientToServerEvents> = io({
        transports: ["websocket", "polling"],
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
        if (!botAutoEnabled) return;
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
          if (team.id === activeTeamIdRef.current) return;
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

  // ── Session Storage & URL Sync Helpers ─────────────────────────────────────
  const saveSandboxSession = useCallback((codeStr: string, isOffline: boolean, mode?: GameMode, bankId?: string) => {
    if (typeof window === "undefined") return;
    try {
      sessionStorage.setItem("sandbox_current_code", codeStr);
      if (isOffline) {
        sessionStorage.setItem("sandbox_is_offline", "1");
        if (mode) sessionStorage.setItem("sandbox_offline_mode", mode);
        if (bankId) sessionStorage.setItem("sandbox_offline_bank", bankId);
      } else {
        sessionStorage.removeItem("sandbox_is_offline");
        sessionStorage.removeItem("sandbox_offline_mode");
        sessionStorage.removeItem("sandbox_offline_bank");
      }
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
  }, []);

  const clearSandboxSession = useCallback(() => {
    if (typeof window === "undefined") return;
    try {
      sessionStorage.removeItem("sandbox_current_code");
      sessionStorage.removeItem("sandbox_is_offline");
      sessionStorage.removeItem("sandbox_offline_mode");
      sessionStorage.removeItem("sandbox_offline_bank");
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
    if (adminSocketRef.current) {
      adminSocketRef.current.disconnect();
    }

    const adminToken = typeof window !== "undefined"
      ? (localStorage.getItem("admin_token") || sessionStorage.getItem("admin_token"))
      : null;
    const storedHostKey = typeof window !== "undefined"
      ? (new URLSearchParams(window.location.search).get("key") || localStorage.getItem(`host_key_${roomCode}`) || "")
      : "";

    const sock: Socket<ServerToClientEvents, ClientToServerEvents> = io({
      transports: ["websocket", "polling"],
      auth: { token: adminToken },
    });
    adminSocketRef.current = sock;

    sock.on("connect", () => {
      syncClockWithServer(sock);
      sock.emit("admin:join", { code: roomCode, hostKey: storedHostKey } as any, (res: any) => {
        if (res?.success && res.roomState) {
          setRoomState(res.roomState);
          setSelectedMode(res.roomState.mode);
          if (res.hostKey) {
            localStorage.setItem(`host_key_${roomCode}`, res.hostKey);
          }
          saveSandboxSession(roomCode, false);
          addLog(`Admin Socket đã gắn vào phòng: ${roomCode}`);
          initBotSockets(roomCode, res.roomState.teams);
          sock.emit("admin:question:get_data", { code: roomCode });
        } else {
          addLog(`⚠️ Không thể gắn vào phòng ${roomCode}: ${res?.error || "Lỗi tham gia"}`);
          if (res?.error && typeof res.error === "string" && res.error.includes("không tồn tại")) {
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
          sock.emit("admin:question:get_data", { code: roomCode });
        }
      });
    });

    sock.on("room:state", (state) => setRoomState(state));
    sock.on("admin:question:data", (data: any) => {
      setAdminQuestionData(data);
      adminQuestionDataRef.current = data;
    });
    sock.on("game:question", (q) => {
      if (q.serverTime) calibrateClockFromPacket(q.serverTime);
      sock.emit("admin:question:get_data", { code: roomCode });
      setCurrentQuestion(q);
      setRevealPayload(null);
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
      addLog(`📊 Bảng xếp hạng giữa hiệp (Chặng câu #${p ? p.nextQuestionIndex : ""})`);
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
      addLog(`Đáp án đã công bố! Câu: ${rev.questionId}`);
    });

    sock.on("game:question:clear", () => {
      setCurrentQuestion(null);
      setRevealPayload(null);
      setTimer(null);
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
      setMatchStarting({ seconds: p.seconds });
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

    sock.on("game:score:update", (scores) => {
      setRoomState((prev) => {
        if (!prev) return prev;
        const updatedTeams = prev.teams.map((t) => {
          const upd = scores.find((s) => s.teamId === t.id);
          return upd ? { ...t, score: upd.score } : t;
        });
        return { ...prev, teams: updatedTeams };
      });
    });

    sock.on("game:ended", () => {
      addLog(`Trận đấu kết thúc!`);
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

  const syncToIframes = useCallback((overrides?: Record<string, any>) => {
    const payload = {
      roomState: roomStateRef.current,
      currentQuestion: currentQuestionRef.current,
      timer: timerRef.current,
      revealPayload: revealPayloadRef.current,
      buzzed: null,
      lastPowerup: null,
      matchStarting: matchStarting,
      questionPrepare: questionPrepare,
      intermission: intermissionRef.current,
      ...overrides,
    };
    displayIframeRef.current?.contentWindow?.postMessage({ type: "OFFLINE_SYNC", payload }, "*");
    playerIframeRef.current?.contentWindow?.postMessage({ type: "OFFLINE_SYNC", payload }, "*");
  }, [matchStarting, questionPrepare]);

  useEffect(() => {
    if (isOfflineSandbox) {
      syncToIframes();
    }
  }, [isOfflineSandbox, roomState, currentQuestion, revealPayload, syncToIframes]);

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
              const rem = Math.max(0, Math.ceil((curQ.endsAt - now) / 1000));
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
    const maxQ = roomState?.config?.matchMaxQuestions && roomState.config.matchMaxQuestions > 0 ? roomState.config.matchMaxQuestions : undefined;
    const allocResult = allocateQuestionsForMatch({
      questions: rawQuestions,
      targetCount: maxQ,
      mode,
      teamsCount: 4,
    });
    offlineQuestionsRef.current = allocResult.allocatedQuestions;
    offlineQIndexRef.current = -1;
    offlineAnswersRef.current.clear();
    offlineUsedQuestionIdsRef.current.clear();

    const modeAllowedPowerups = getDefaultAllowedPowerupsForMode(mode);
    const initialScore = mode === "DICE_RACE" ? 1 : 0;
    const teamIds = ["t_red", "t_blue", "t_yellow", "t_purple"];
    const offlineCardsMap = distributeCategorizedCardsToTeams(teamIds, modeAllowedPowerups as any, 2, 2);
    offlineSharedPowerupUsedThisQuestionRef.current = false;

    const teams = [
      { id: "t_red", name: "Đội Đỏ (Bạn)", color: "#ef4444", score: initialScore, isEliminated: false, frozenRounds: 0, shieldCount: 0, cards: mode === "MYSTERY_QUEST" ? [] : (offlineCardsMap.get("t_red") || [modeAllowedPowerups[0] || "FIFTY_FIFTY", modeAllowedPowerups[1] || "TIME_PLUS"]).map((t, idx) => ({ id: `c_r${idx + 1}`, type: t, ownerType: "TEAM" as const, teamId: "t_red", used: false })), playerCount: 1, isGhost: false, ghostStreak: 0, ghostRoundAllCorrect: false, ghostTotalCorrect: 0, ghostTotalAnswered: 0, ghostCurrentRoundCorrect: 0, eliminationInterval: 3 },
      { id: "t_blue", name: "Đội Xanh 🤖", color: "#3b82f6", score: initialScore, isEliminated: false, frozenRounds: 0, shieldCount: 0, cards: mode === "MYSTERY_QUEST" ? [] : (offlineCardsMap.get("t_blue") || [modeAllowedPowerups[0] || "FIFTY_FIFTY", modeAllowedPowerups[1] || "TIME_PLUS"]).map((t, idx) => ({ id: `c_b${idx + 1}`, type: t, ownerType: "TEAM" as const, teamId: "t_blue", used: false })), playerCount: 1, isGhost: false, ghostStreak: 0, ghostRoundAllCorrect: false, ghostTotalCorrect: 0, ghostTotalAnswered: 0, ghostCurrentRoundCorrect: 0, eliminationInterval: 3 },
      { id: "t_yellow", name: "Đội Vàng 🤖", color: "#eab308", score: initialScore, isEliminated: false, frozenRounds: 0, shieldCount: 0, cards: mode === "MYSTERY_QUEST" ? [] : (offlineCardsMap.get("t_yellow") || [modeAllowedPowerups[0] || "FIFTY_FIFTY", modeAllowedPowerups[1] || "TIME_PLUS"]).map((t, idx) => ({ id: `c_y${idx + 1}`, type: t, ownerType: "TEAM" as const, teamId: "t_yellow", used: false })), playerCount: 1, isGhost: false, ghostStreak: 0, ghostRoundAllCorrect: false, ghostTotalCorrect: 0, ghostTotalAnswered: 0, ghostCurrentRoundCorrect: 0, eliminationInterval: 3 },
      { id: "t_purple", name: "Đội Tím 🤖", color: "#a855f7", score: initialScore, isEliminated: false, frozenRounds: 0, shieldCount: 0, cards: mode === "MYSTERY_QUEST" ? [] : (offlineCardsMap.get("t_purple") || [modeAllowedPowerups[0] || "FIFTY_FIFTY", modeAllowedPowerups[1] || "TIME_PLUS"]).map((t, idx) => ({ id: `c_p${idx + 1}`, type: t, ownerType: "TEAM" as const, teamId: "t_purple", used: false })), playerCount: 1, isGhost: false, ghostStreak: 0, ghostRoundAllCorrect: false, ghostTotalCorrect: 0, ghostTotalAnswered: 0, ghostCurrentRoundCorrect: 0, eliminationInterval: 3 },
    ];

    const players = [
      { id: "p_you", name: "Bạn (Tester)", score: initialScore, teamId: "t_red", isHost: true, isOnline: true },
      { id: "bot_1", name: "Đội Xanh 🤖", score: initialScore, teamId: "t_blue", isHost: false, isOnline: true },
      { id: "bot_2", name: "Đội Vàng 🤖", score: initialScore, teamId: "t_yellow", isHost: false, isOnline: true },
      { id: "bot_3", name: "Đội Tím 🤖", score: initialScore, teamId: "t_purple", isHost: false, isOnline: true },
    ];

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
        currentTurnTeamId: "t_red",
        currentTurnTeamName: "Đội Đỏ (Bạn)",
        currentTurnIndex: 0,
        completedLines: [],
        previewActive: false,
      };
    }

    let diceRaceState: any = undefined;
    if (mode === "DICE_RACE") {
      const totalTiles = 30;
      const tiles = generateBalancedDiceTiles(totalTiles);
      diceRaceState = {
        totalTiles,
        tiles,
        teamPositions: {
          t_red: { teamId: "t_red", teamName: "Đội Đỏ (Bạn)", teamColor: "#ef4444", position: 0, hasFinished: false, hasShield: false },
          t_blue: { teamId: "t_blue", teamName: "Đội Xanh 🤖", teamColor: "#3b82f6", position: 0, hasFinished: false, hasShield: false },
          t_yellow: { teamId: "t_yellow", teamName: "Đội Vàng 🤖", teamColor: "#eab308", position: 0, hasFinished: false, hasShield: false },
          t_purple: { teamId: "t_purple", teamName: "Đội Tím 🤖", teamColor: "#a855f7", position: 0, hasFinished: false, hasShield: false },
        },
        currentTurnTeamId: "t_red",
        currentTurnTeamName: "Đội Đỏ (Bạn)",
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
        turnsPerTeam: 2,
      });
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

    const searchParams = new URLSearchParams(window.location.search);
    const urlCode = searchParams.get("code");
    const urlOffline = searchParams.get("offline") === "1";
    const urlMode = searchParams.get("mode") as GameMode | null;

    const storedCode = sessionStorage.getItem("sandbox_current_code");
    const storedOffline = sessionStorage.getItem("sandbox_is_offline") === "1";
    const storedMode = sessionStorage.getItem("sandbox_offline_mode") as GameMode | null;
    const storedBank = sessionStorage.getItem("sandbox_offline_bank") || "";

    // Only restore offline mode if explicitly requested in URL (e.g. ?offline=1 or ?code=OFFLINE)
    const isExplicitlyOffline = urlOffline || (urlCode === "OFFLINE" || (urlCode?.startsWith("OFFLINE") ?? false));

    if (isExplicitlyOffline) {
      const modeToUse = urlMode || storedMode || "BOUNCEBACK";
      const bankToUse = storedBank || "";
      setSelectedMode(modeToUse);
      setIsOfflineSandbox(true);
      startOfflineSandbox(modeToUse, bankToUse);
    } else {
      const candidateCode = (urlCode || storedCode || "").trim();
      if (candidateCode && candidateCode.length === 6 && candidateCode !== "OFFLINE") {
        // Validate with server first before mounting iframes to prevent flashing dead room UI
        fetch(`/api/rooms/${candidateCode}/validate`)
          .then((r) => r.json())
          .then((data) => {
            if (data?.room && data.room.status !== "FINISHED") {
              setCode(candidateCode);
              setIsOfflineSandbox(false);
              saveSandboxSession(candidateCode, false);
              connectAdminSocket(candidateCode);
            } else {
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
  }, [connectAdminSocket, startOfflineSandbox, saveSandboxSession, clearSandboxSession]);

  const checkOfflineEarlyCompletion = () => {
    if (!currentQuestionRef.current) return;
    const curQ = currentQuestionRef.current;
    const teams = roomStateRef.current?.teams || [];

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
    } else if (selectedMode === "TOURNAMENT") {
      if (curQ.tournamentTeam1Id && curQ.tournamentTeam2Id) {
        neededTeamIds = [curQ.tournamentTeam1Id, curQ.tournamentTeam2Id];
      }
    } else if (selectedMode === "ELIMINATION") {
      neededTeamIds = teams.map((t) => t.id);
    } else {
      neededTeamIds = teams.filter((t) => !t.isEliminated).map((t) => t.id);
    }

    const testerTeamId = activeTeamIdRef.current || stableTeams[activeTeamIndex]?.id || "t_red";
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
      addLog(`⚡ Tất cả người chơi (${neededTeamIds.length}/${neededTeamIds.length}) đã chốt/nộp bài! Kết thúc câu hỏi sớm.`);
      setTimeout(() => {
        handleAdminReveal();
      }, 500);
    }
  };

  const handleOfflineBouncebackPointsPicked = (pts: 10 | 20 | 30) => {
    const ptsTimeLimit = pts === 10 ? 15 : pts === 20 ? 20 : 30;
    if (offlineTimerRef.current) {
      clearInterval(offlineTimerRef.current);
      offlineTimerRef.current = null;
    }
    const primaryId = currentQuestionRef.current?.primaryTeamId || roomStateRef.current?.teams[0]?.id || "t_red";
    const primaryName = roomStateRef.current?.teams.find((t) => t.id === primaryId)?.name || "Đội chính";

    // Step 1: 3s prepare countdown
    let prepSeconds = 3;
    syncToIframes({
      questionPrepare: { seconds: prepSeconds, points: pts, primaryTeamId: primaryId, primaryTeamName: primaryName },
      currentQuestion: null,
      timer: null,
    });
    addLog(`Đội [${primaryName}] đã chọn gói ${pts}đ. Chuẩn bị câu hỏi trong 3s...`);

    const prepInterval = setInterval(() => {
      prepSeconds -= 1;
      if (prepSeconds > 0) {
        syncToIframes({
          questionPrepare: { seconds: prepSeconds, points: pts, primaryTeamId: primaryId, primaryTeamName: primaryName },
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

  const handleAdminSubmitDirectAnswer = useCallback((teamId: string, answerId: string) => {
    if (!currentQuestionRef.current) return;
    const targetTeam = roomStateRef.current?.teams.find((t) => t.id === teamId);
    const teamName = targetTeam?.name || teamId;

    setTeamSelectedAnswers((prev) => ({ ...prev, [teamId]: answerId }));

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
      checkOfflineEarlyCompletion();

      addLog(`🎙️ MC chọn đáp án [${answerId}] cho Đội [${teamName}] (${isCorrect ? "Đúng" : "Sai"})`);
      return;
    }

    adminSocketRef.current?.emit("admin:submit:answer" as any, {
      questionId: currentQuestionRef.current.question.id,
      teamId,
      answer: answerId,
      code,
    });
    addLog(`🎙️ MC nộp đáp án [${answerId}] cho Đội [${teamName}]`);
  }, [isOfflineSandbox, code, addLog, checkOfflineEarlyCompletion]);

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
      const bank = (bankId && offlineStorage.getLocalBankById(bankId)) || DEFAULT_OFFLINE_BANK;
      const questions = bank.questions && bank.questions.length > 0 ? bank.questions : DEFAULT_OFFLINE_BANK.questions!;
      offlineQuestionsRef.current = questions.map((q) => ({
        ...q,
        points: normalizeToThreeLevels(q.points || 10),
      }));
      offlineUsedQuestionIdsRef.current.clear();
      offlineQIndexRef.current = 0;
      addLog(`Ngoại tuyến: Đã chuyển sang bộ đề [${bank.title}] (${questions.length} câu)`);
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
  }, [isOfflineSandbox, code, quizBanks, addLog]);

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
          adminSocketRef.current?.emit("admin:mystery:flip_card" as any, { tileId, code });
          addLog(`✨ Admin lật thẻ #${tileId} trong Sandbox Online`);
          return;
        }
        if (!roomStateRef.current?.mysteryQuestState) return;
        const curMystery = { ...roomStateRef.current.mysteryQuestState };
        const activeTeam = roomStateRef.current.teams.find((t) => t.id === curMystery.currentTurnTeamId);
        if (!activeTeam) return;

        const { updatedState, isBomb, scorePenalty } = handleMysteryFlipCard({
          state: curMystery,
          tileId,
          team: activeTeam,
          allTeams: roomStateRef.current.teams,
        });

        let updatedTeams = [...roomStateRef.current.teams];
        if (isBomb && scorePenalty > 0) {
          updatedTeams = updatedTeams.map((t) =>
            t.id === activeTeam.id ? { ...t, score: Math.max(0, t.score - scorePenalty) } : t
          );
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
        addLog(
          isBomb
            ? `💥 [${activeTeam.name}] dẫm phải BOM ở ô #${tileId}! ${updatedState.bombExploded?.penaltyText || ""}`
            : `💎 [${activeTeam.name}] lật mở thành công ô #${tileId}! Hũ điểm: ${updatedState.potPoints}đ`
        );
        return;
      }
      if (e.data?.type === "MYSTERY_CASH_OUT" || e.data?.action === "mystery_cash_out") {
        if (!isOfflineSandbox) {
          adminSocketRef.current?.emit("admin:mystery:cash_out" as any, { code });
          addLog("💰 Admin bảo toàn quỹ điểm trong Sandbox Online");
          return;
        }
        if (!roomStateRef.current?.mysteryQuestState) return;
        const curMystery = { ...roomStateRef.current.mysteryQuestState };
        const activeTeam = roomStateRef.current.teams.find((t) => t.id === curMystery.currentTurnTeamId);
        if (!activeTeam) return;

        const { updatedState, finalScoreDelta } = handleMysteryCashOut({
          state: curMystery,
          team: activeTeam,
        });

        const updatedTeams = roomStateRef.current.teams.map((t) =>
          t.id === activeTeam.id ? { ...t, score: t.score + finalScoreDelta } : t
        );

        const nextRoomState: RoomState = {
          ...roomStateRef.current,
          teams: updatedTeams,
          mysteryQuestState: updatedState,
        };
        roomStateRef.current = nextRoomState;
        setRoomState(nextRoomState);
        syncToIframes({ roomState: nextRoomState, mysteryQuestState: updatedState });
        addLog(`💰 [${activeTeam.name}] quyết định BẢO TOÀN ĐIỂM! Thu về an toàn +${finalScoreDelta} điểm!`);
        return;
      }
      if (e.data?.type === "MYSTERY_STEAL_BUZZ" || e.data?.action === "mystery_steal_buzz") {
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
        const teams = roomStateRef.current.teams;
        const nextTurnIdx = curMystery.currentTurnIndex + 1;
        const nextTeam = teams[nextTurnIdx % teams.length];

        const nextStage = generateMysteryStageForTurn({
          turnIndex: nextTurnIdx,
          currentTeam: nextTeam,
          teams,
          turnsPerTeam: curMystery.turnsPerTeam,
          prevTheme: curMystery.theme,
        });

        const nextRoomState: RoomState = {
          ...roomStateRef.current,
          mysteryQuestState: nextStage,
        };
        roomStateRef.current = nextRoomState;
        setRoomState(nextRoomState);
        syncToIframes({ roomState: nextRoomState, mysteryQuestState: nextStage });
        addLog(`➡️ Chuyển sang lượt #${nextTurnIdx + 1} của [${nextTeam.name}] (Chủ đề: ${nextStage.themeNameVi})`);

        setTimeout(() => {
          handleAdminNextRef.current?.();
        }, 500);
        return;
      }
      if (e.data?.type !== "OFFLINE_PLAYER_ACTION" || !isOfflineSandbox) return;
      const { action, answer, points, cellId, teamId } = e.data;
      const targetTeamId = teamId || stableTeams[activeTeamIndex]?.id || "t_red";
      const targetTeamName = stableTeams.find((t) => t.id === targetTeamId)?.name || "Bạn (Tester)";

      if (action === "answer") {
        if (!currentQuestion) return;
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
            if (targetT) {
              const stealAmt = Math.min(targetT.score, 30);
              targetT.score -= stealAmt;
              cardTeam.score += stealAmt;
              addLog(`🃏 [${cardTeam.name}] dùng [Cướp điểm]: Cướp ${stealAmt}đ từ [${targetT.name}]!`);
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
        addLog(`🔮 Đội [${targetTeamName}] đã DỰ ĐOÁN đội thắng cho trận [${matchId}]!`);
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

  // ── 1-Click Launch ──────────────────────────────────────────────────────────
  const handleLaunchSandbox = async () => {
    setCreating(true);
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      startOfflineSandbox(selectedMode, selectedBankId);
      setCreating(false);
      return;
    }

    try {
      const res = await fetch("/api/sandbox/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: selectedMode,
          quizBankId: selectedBankId,
        }),
      });
      const data = await res.json();
      if (data.success && data.code) {
        setCode(data.code);
        setIsOfflineSandbox(false);
        saveSandboxSession(data.code, false);
        connectAdminSocket(data.code);
        addLog(`⚡ Đã khởi tạo Sandbox Online: Phòng ${data.code} (${data.mode}) - Bộ đề: ${data.quizBankTitle || "Trực tuyến"}`);
      } else {
        const errorMsg = data?.error || "Không thể tạo phòng Sandbox trên máy chủ";
        addLog(`❌ Không thể tạo phòng online: ${errorMsg}`);
        const wantOffline = window.confirm(`Không thể tạo phòng Sandbox Online trên máy chủ:\n\n"${errorMsg}"\n\nBạn có muốn chuyển sang chế độ Sandbox Offline (mô phỏng trên trình duyệt) không?`);
        if (wantOffline) {
          startOfflineSandbox(selectedMode, selectedBankId);
        }
      }
    } catch (err: any) {
      const errorMsg = err?.message || "Lỗi kết nối mạng";
      addLog(`❌ Lỗi kết nối mạng: ${errorMsg}`);
      const wantOffline = window.confirm(`Lỗi kết nối mạng khi tạo Sandbox Online:\n\n"${errorMsg}"\n\nBạn có muốn chuyển sang chế độ Sandbox Offline (mô phỏng trên trình duyệt) không?`);
      if (wantOffline) {
        startOfflineSandbox(selectedMode, selectedBankId);
      }
    } finally {
      setCreating(false);
    }
  };

  const handleConnectExisting = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputCode.trim().length === 6) {
      const clean = inputCode.trim();
      setCode(clean);
      setIsOfflineSandbox(false);
      saveSandboxSession(clean, false);
      connectAdminSocket(clean);
    }
  };

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
    offlineSharedPowerupUsedThisQuestionRef.current = false;

    // Multi-round replenish: Replenish +1 card for each team with < 3 cards every 3 questions
    if (nextIdx > 0 && nextIdx % 3 === 0) {
      replenishOfflineTeamPowerups();
    }

    const questions = offlineQuestionsRef.current;
    offlineQIndexRef.current = nextIdx;
    const q = questions[nextIdx] || DEFAULT_OFFLINE_BANK.questions![0];

    const timeLimit = quantizeOlympiaTimeLimit(q.points || 10, q.timeLimit);
    const endsAt = Date.now() + timeLimit * 1000;
    const autoTimer = roomState?.config.autoTimerStart === true;
    const offlineQId = q.id || `q_${nextIdx + 1}`;

    adminQuestionDataRef.current = {
      questionId: offlineQId,
      options: q.options || [],
      answer: q.answer,
      type: q.type,
      explanation: q.hint,
    };
    setAdminQuestionData(adminQuestionDataRef.current);

    const qState: QuestionState = {
      question: {
        id: offlineQId,
        type: q.type || "MC_SINGLE",
        content: q.content,
        options: q.options?.map((o: any) => ({ id: o.id, text: o.text, isCorrect: o.isCorrect })),
        points: q.points || 10,
        timeLimit,
        hint: q.hint,
        order: nextIdx + 1,
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
          ? roomState?.teams[0]?.id
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
          ? `${roomState?.teams[0]?.name || "Đội 1"} vs ${roomState?.teams[1]?.name || "Đội 2"}`
          : undefined,
      tournamentTeam1Id: selectedMode === "TOURNAMENT" ? roomState?.teams[0]?.id : undefined,
      tournamentTeam2Id: selectedMode === "TOURNAMENT" ? roomState?.teams[1]?.id : undefined,
      isGoldQuestion: selectedMode === "CLASSIC" && questions.length >= 7 && (
        q.points === 30 || nextIdx >= Math.floor(questions.length * 0.7)
      ),
    };

    setRoomState((prev) => {
      if (!prev) return prev;
      const nextDice = prev.diceRaceState
        ? { ...prev.diceRaceState, canRollDice: false }
        : undefined;
      const nextMystery = prev.mysteryQuestState
        ? { ...prev.mysteryQuestState, phase: "QUESTION_ACTIVE" as const }
        : undefined;
      return {
        ...prev,
        status: "PLAYING",
        currentQuestionIndex: nextIdx,
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
          const rem = Math.max(0, Math.ceil((endsAt - Date.now()) / 1000));
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
      return {
        ...prev,
        config: { ...prev.config, ...derivedConfig, [key]: value },
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
        let tourState: TournamentState | undefined = undefined;
        if (selectedMode === "TOURNAMENT") {
          const tourMatches = buildOfflineTournamentMatches(roomState?.teams || []);
          tourState = {
            matches: tourMatches,
            currentMatchId: tourMatches[0]?.id || "M1",
            questionsPerMatch: roomState?.config?.tournamentQuestionsPerMatch || 3,
          };
        }

        let warmupSec = 5;
        setMatchStarting({ seconds: warmupSec });
        syncToIframes({ matchStarting: { seconds: warmupSec } });
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
          syncToIframes({
            matchStarting: null,
            roomState: {
              ...(roomState || {}),
              status: "PLAYING",
              tournamentState: tourState || roomState?.tournamentState,
            },
          });

          if (selectedMode === "DICE_RACE") {
            addLog("🏁 Cuộc đua cờ xí ngầu bắt đầu! Bàn cờ hiển thị toàn màn hình. Nhấn 'Hiện câu hỏi' khi sẵn sàng.");
            return;
          } else if (selectedMode === "GRID_CARO") {
            addLog("🏁 Bàn cờ Caro bắt đầu! Đội hiện tại chọn ô để mở câu hỏi.");
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
        if (offlineWarmupIntervalRef.current) {
          clearInterval(offlineWarmupIntervalRef.current);
          offlineWarmupIntervalRef.current = null;
        }
        offlineWarmupIntervalRef.current = setInterval(() => {
          warmupSec -= 1;
          if (warmupSec > 0) {
            setMatchStarting({ seconds: warmupSec });
            syncToIframes({ matchStarting: { seconds: warmupSec } });
          } else {
            proceedAfterWarmup();
          }
        }, 1000);
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
      setMatchStarting({ seconds: 5 });
      addLog("⚡ Admin: Bắt đầu trận đấu — Đang đếm ngược chuẩn bị 5s...");
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
      const baseQPoints = currentQuestion.question.points || 20;

      // 1. Điểm các đội không cược khi đúng: 1/2 điểm gốc cố định (5đ/10đ/15đ), sai = 0đ
      const nonWagerCorrectPoints = Math.max(5, Math.floor(baseQPoints / 2));

      // 2. Tính số đội khác (không phải đội cược) trả lời đúng
      let otherCorrectCount = 0;
      (roomState?.teams || []).forEach((t) => {
        if (t.id !== lastWagerTeamId) {
          const recorded = offlineAnswersRef.current.get(t.id);
          const ansId = recorded ? recorded.answer : (t.id === "t_red" ? correctId : "B");
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
        const ansId = recorded ? recorded.answer : (hasAnyRecorded ? null : (t.id === "t_red" ? correctId : null));
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
        const ansId = recorded ? recorded.answer : (hasAnyRecorded ? null : (t.id === "t_red" ? correctId : null));
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
        const ansId = recorded ? recorded.answer : (hasAnyRecorded ? null : (t.id === "t_red" ? correctId : null));
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
          const base = currentQuestion.question.points || 10;
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
            const basePoints = currentQuestion.question.points || 20;
            nextMystery = {
              ...curMystery,
              phase: "PUSH_YOUR_LUCK",
              potPoints: basePoints,
              potMultiplier: 1,
            };
          } else {
            nextMystery = {
              ...curMystery,
              phase: "TURN_SUMMARY",
              turnFinishedReason: "QUESTION_FAILED",
              potPoints: 0,
              potMultiplier: 1,
              storyResult: {
                teamId: curMystery.currentTurnTeamId,
                teamName: curMystery.currentTurnTeamName,
                teamColor: curMystery.currentTurnTeamColor,
                rewardText: "Trả lời chưa chính xác. Lượt thi kết thúc với 0 điểm tích lũy.",
                scoreDelta: 0,
                oldScore: 0,
                newScore: 0,
              },
            };
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
          if (botAutoEnabled && curTurnTeamId && curTurnTeamId !== "t_red") {
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

    adminSocketRef.current?.emit("admin:timer:set", { seconds: 1 });
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

    adminSocketRef.current?.emit("admin:timer:stop_early");
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
        const rem = Math.max(0, Math.ceil((endsAt - Date.now()) / 1000));
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
        const rem = Math.max(0, Math.ceil((endsAt - Date.now()) / 1000));
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
        const rem = Math.max(0, Math.ceil((endsAt - Date.now()) / 1000));
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

      const primaryTeamId = currentQuestion.primaryTeamId || stableTeams[activeTeamIndex]?.id || "t_red";
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

  // Score adjust cheat
  const handleAdjustScore = (teamId: string, delta?: number, setScore?: number) => {
    if (isOfflineSandbox) {
      setRoomState((prev) => {
        if (!prev) return prev;
        const updatedTeams = prev.teams.map((t) => {
          if (t.id !== teamId) return t;
          const newScore = setScore !== undefined ? setScore : t.score + (delta || 0);
          return { ...t, score: newScore };
        });
        return { ...prev, teams: updatedTeams };
      });
      addLog(`Cheat điểm đội ${teamId}: delta=${delta ?? "N/A"}, setScore=${setScore ?? "N/A"}`);
      return;
    }

    adminSocketRef.current?.emit("admin:sandbox:adjust_score" as any, { teamId, delta, setScore });
    addLog(`Cheat điểm đội ${teamId}: delta=${delta ?? "N/A"}, setScore=${setScore ?? "N/A"}`);
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
        if (t.id === (currentTeam?.id || "t_red")) return;
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
    const targetAnswer = isOfflineSandbox ? (offlineAnswersRef.current.get(targetTeam.id)?.answer || null) : null;
    playerIframeRef.current?.contentWindow?.postMessage(
      {
        type: "SWITCH_ACTIVE_TEAM",
        teamId: targetTeam.id,
        teamName: targetName,
        teamIndex: idx,
        currentAnswer: targetAnswer,
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
      className="h-full max-h-full flex flex-col min-h-0 gap-1.5 sm:gap-2 overflow-hidden"
      onClick={() => { if (showSettingsDropdown) setShowSettingsDropdown(false); if (showCheatDropdown) setShowCheatDropdown(false); }}
    >
      {/* ── Top Header Controls (Compact Single-Bar) ─────────────────── */}
      <div className="glass rounded-xl px-2.5 py-1.5 sm:px-3 sm:py-2 border border-white/10 flex flex-wrap items-center justify-between gap-1.5 sm:gap-2 shadow-lg shrink-0 bg-[#121424]">
        <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-gradient-to-br from-purple-600 to-cyan-500 flex items-center justify-center text-sm sm:text-base shadow glow-purple shrink-0">
            🧪
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
              <span className="text-xs sm:text-sm font-black text-white whitespace-nowrap">Sandbox</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-bold whitespace-nowrap hidden md:inline">
                1 Người Điều Khiển
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
                  <span className="text-purple-300 font-bold hidden sm:inline-flex items-center gap-1 text-[11px]">
                    <GameModeIcon mode={roomState?.mode || selectedMode} className="w-3 h-3" />
                    [{roomState?.mode || selectedMode}]
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
                onClick={handleLaunchSandbox}
                className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white font-bold text-xs shadow transition active:scale-95 disabled:opacity-50 flex items-center gap-1 whitespace-nowrap"
              >
                <span>⚡</span>
                <span>{creating ? "Đang tạo..." : "Chạy Sandbox"}</span>
              </button>

              <button
                type="button"
                onClick={() => startOfflineSandbox(selectedMode, selectedBankId)}
                className="px-2.5 py-1.5 rounded-lg glass hover:bg-amber-500/20 border border-amber-500/40 text-amber-300 font-bold text-xs shadow transition active:scale-95 flex items-center gap-1 whitespace-nowrap"
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
                {currentQuestion?.timerPending && (
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

                {/* 3. Core Next / Start / Conclude Button */}
                {roomState?.mode === "GRID_CARO" && roomState?.status === "PLAYING" && !currentQuestion ? null : (
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
                          className="px-3 py-1 rounded-lg bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 text-black text-xs font-black shadow-lg shadow-amber-500/30 border border-yellow-300 animate-pulse transition active:scale-95 flex items-center gap-1.5 whitespace-nowrap cursor-pointer ring-2 ring-yellow-400"
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
                          className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-500 hover:from-purple-500 hover:to-cyan-400 text-white text-xs font-black shadow-lg shadow-purple-500/30 animate-pulse transition active:scale-95 flex items-center gap-1.5 whitespace-nowrap cursor-pointer ring-2 ring-cyan-400"
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
                        className={`px-3 py-1 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-black shadow transition active:scale-95 flex items-center gap-1 whitespace-nowrap cursor-pointer ${
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
                {currentQuestion && !revealPayload && (
                  <button
                    type="button"
                    onClick={handleAdminReveal}
                    className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black shadow flex items-center gap-1 whitespace-nowrap cursor-pointer animate-pulse"
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
                    <span>✏️</span>
                    <span>Chấm điểm ({revealPayload.answers?.length ?? 0})</span>
                  </button>
                )}

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
                      <div className="absolute top-full mt-1.5 right-0 w-80 p-3 rounded-2xl bg-[#151728]/95 border border-amber-500/40 shadow-2xl backdrop-blur-md z-50 text-xs space-y-2 animate-fade-in text-white text-left">
                        <div className="flex items-center justify-between border-b border-amber-500/20 pb-1.5">
                          <div className="flex items-center gap-1.5 font-black text-amber-300">
                            <span>🔑</span>
                            <span>Phao đáp án & Lời giải MC</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setShowMcCheatSheet(false)}
                            className="text-slate-400 hover:text-white text-xs px-1 cursor-pointer"
                          >
                            ✕
                          </button>
                        </div>
                        <div className="space-y-1.5">
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
                      className="absolute right-0 top-full mt-1 z-40 w-64 rounded-2xl glass border border-white/20 bg-[#151728]/95 shadow-2xl p-3 flex flex-col gap-2 text-xs"
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
                      <div className="flex items-center justify-between gap-2 pt-1 border-t border-white/10">
                        <div className="flex items-center gap-1.5">
                          <span className="text-slate-300">Tổng số câu hỏi</span>
                          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">Tất cả mode</span>
                        </div>
                        <div className="flex items-center gap-1 flex-wrap justify-end">
                          {[5, 10, 12, 15, 20, 25, 0].map((qCount) => (
                            <button
                              key={qCount}
                              type="button"
                              onClick={() => updateConfig("matchMaxQuestions", qCount)}
                              className={`px-1.5 py-0.5 rounded text-[10px] font-bold border transition cursor-pointer ${
                                (roomState.config.matchMaxQuestions ?? 0) === qCount
                                  ? "bg-purple-500/30 border-purple-400 text-purple-300"
                                  : "glass border-white/10 text-slate-400 hover:text-white"
                              }`}
                            >
                              {qCount === 0 ? "Hết đề" : `${qCount}c`}
                            </button>
                          ))}
                        </div>
                      </div>

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
                    </div>
                  )}
                </div>

                {/* Exit */}
                <button
                  type="button"
                  onClick={() => {
                    clearSandboxSession();
                    setCode("");
                    setRoomState(null);
                    setCurrentQuestion(null);
                    setIsOfflineSandbox(false);
                  }}
                  className="px-2.5 py-1 rounded-lg glass hover:bg-red-500/20 text-red-400 text-xs font-bold transition shrink-0 whitespace-nowrap cursor-pointer"
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
        <div className="flex-1 overflow-y-auto flex items-center justify-center p-4">
          <div className="glass rounded-3xl p-8 text-center border border-white/10 space-y-5 max-w-xl mx-auto shadow-2xl">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-cyan-500 flex items-center justify-center text-3xl mx-auto shadow-xl glow-purple">
              🧪
            </div>
            <div className="space-y-1.5">
              <h2 className="text-2xl font-black text-white">Studio Kiểm Thử Hợp Nhất</h2>
              <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                Màn chiếu hội trường Display bên trái · Thiết bị di động thí sinh bên phải với chuyển đổi 4 đội tức thì. Giao diện tự động co giãn vừa vặn màn hình.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center max-w-md mx-auto pt-1 text-left">
              <div className="flex-1">
                <label className="block text-[11px] font-bold text-slate-400 mb-1">🎮 Chế độ (8 Mode)</label>
                <select
                  value={selectedMode}
                  onChange={(e) => setSelectedMode(e.target.value as GameMode)}
                  className="w-full px-3 py-2 rounded-xl glass border border-white/20 text-xs font-bold text-white bg-[#151728] focus:outline-none"
                >
                  {AVAILABLE_MODES.map((m) => (
                    <option key={m.mode} value={m.mode}>
                      {m.emoji} {m.name} ({m.mode})
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex-1">
                <label className="block text-[11px] font-bold text-slate-400 mb-1">📚 Bộ câu hỏi</label>
                <select
                  value={selectedBankId}
                  onChange={(e) => setSelectedBankId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl glass border border-white/20 text-xs font-medium text-white bg-[#151728] focus:outline-none truncate"
                >
                  {quizBanks.length === 0 ? (
                    <option value="">📚 Bộ đề mặc định (25 câu)</option>
                  ) : (
                    quizBanks.map((b) => (
                      <option key={b.id} value={b.id}>
                        📚 {b.title} ({b._count?.questions ?? 25} câu)
                      </option>
                    ))
                  )}
                </select>
              </div>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row gap-2.5 justify-center">
              <button
                type="button"
                disabled={creating}
                onClick={handleLaunchSandbox}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white font-bold text-xs shadow-xl transition hover:scale-105 active:scale-95 disabled:opacity-50 whitespace-nowrap"
              >
                {creating ? "Đang chuẩn bị phòng..." : `⚡ Khởi chạy Sandbox: ${selectedMode}`}
              </button>
              <button
                type="button"
                onClick={() => startOfflineSandbox(selectedMode, selectedBankId)}
                className="px-5 py-2.5 rounded-xl glass hover:bg-amber-500/20 border border-amber-500/40 text-amber-300 font-bold text-xs shadow-xl transition hover:scale-105 active:scale-95 whitespace-nowrap flex items-center justify-center gap-1.5"
              >
                <span>🔌</span>
                <span>Chạy Offline (Không cần mạng)</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-2 overflow-hidden">
          {/* ══════════════════════════════════════════════════════════════════
              LEFT COLUMN (7 cols ~58%): Large Display + Host Master Controls
             ══════════════════════════════════════════════════════════════════ */}
          <div className={`lg:col-span-7 flex flex-col min-h-0 h-full gap-1.5 overflow-hidden ${
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
                    if (isOfflineSandbox) {
                      syncToIframes();
                    }
                  }}
                />
              </div>
            </div>

            {/* Live Bot Event Logs (Compact Single-line Ticker Bar) */}
            <div className="glass rounded-xl px-3 py-1.5 border border-white/10 text-xs bg-[#121424] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2 min-w-0 flex-1 mr-2">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse shrink-0" />
                <span className="font-bold text-slate-400 text-[11px] shrink-0">Nhật ký:</span>
                <span className="font-mono text-[11px] text-slate-300 truncate">
                  {botLogs[0] || "Đang chờ sự kiện đầu tiên..."}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowLogsModal(true)}
                className="px-2 py-0.5 rounded glass hover:bg-white/10 text-cyan-300 text-[11px] font-bold shrink-0 transition"
              >
                📜 Xem tất cả ({botLogs.length})
              </button>
            </div>
          </div>

          {/* ══════════════════════════════════════════════════════════════════
              RIGHT COLUMN (5 cols ~42%): Unified Mobile Device + Team Switcher
             ══════════════════════════════════════════════════════════════════ */}
          <div className={`lg:col-span-5 flex flex-col min-h-0 h-full gap-1 overflow-hidden ${
            mobileTab === "PLAYER" ? "flex" : "hidden lg:flex"
          }`}>
            {/* Team Switcher Tabs (Ultra-Compact Single Row) */}
            <div className="glass rounded-xl px-2 py-1 border border-white/10 bg-[#121424] shrink-0 flex items-center gap-1.5">
              <span className="text-[10px] font-bold text-slate-400 whitespace-nowrap shrink-0 hidden sm:inline">📱 Chọn Đội:</span>
              <div className="grid grid-cols-4 gap-1 flex-1">
                {stableTeams.map((t: TeamState, idx: number) => {
                  const isActive = activeTeamIndex === idx;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => handleSwitchActiveTeam(idx)}
                      className={`px-1 sm:px-1.5 py-1 rounded-lg text-left border transition flex items-center justify-between gap-0.5 sm:gap-1 cursor-pointer ${
                        isActive
                          ? "bg-purple-600/30 border-purple-500 shadow ring-1 ring-purple-400/50"
                          : "glass border-white/10 hover:border-white/30 text-slate-300"
                      }`}
                    >
                      <div className="flex items-center gap-1 min-w-0">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ background: t.color }} />
                        <span className="font-bold text-[10px] truncate text-white">{t.name}</span>
                      </div>
                      <span className="font-mono font-bold text-cyan-300 text-[10px] shrink-0">
                        {t.score}đ
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
                <div className="flex items-center gap-1 sm:gap-1.5 min-w-0 shrink-0">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0 animate-pulse" style={{ background: currentTeam?.color || "#a855f7" }} />
                  <span className="font-black text-xs text-white truncate max-w-[75px] sm:max-w-[120px]">
                    {activeTeamIndex === 0 ? "Bạn (Tester)" : currentTeam?.name || "Đội"}
                  </span>
                  <span className="px-1.5 py-0.2 rounded font-mono font-bold text-[10px] bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shrink-0">
                    {currentTeam?.score ?? 0}đ
                  </span>
                </div>

                {/* Quick Test Controls */}
                <div className="flex items-center gap-1 shrink-0">
                  {/* Contextual Quick MC Action */}
                  {renderQuickMcAction()}

                  <button
                    type="button"
                    onClick={() => handleForceActiveTeamAnswer(true)}
                    className="px-1.5 sm:px-2 py-0.5 rounded-lg bg-green-500/20 border border-green-500/40 text-green-300 hover:bg-green-500/30 font-bold transition text-[10px] active:scale-95 cursor-pointer shadow-sm"
                    title="Giả lập đội này chọn đáp án đúng"
                  >
                    ✓ Đúng
                  </button>
                  <button
                    type="button"
                    onClick={() => handleForceActiveTeamAnswer(false)}
                    className="px-1.5 sm:px-2 py-0.5 rounded-lg bg-red-500/20 border border-red-500/40 text-red-300 hover:bg-red-500/30 font-bold transition text-[10px] active:scale-95 cursor-pointer shadow-sm"
                    title="Giả lập đội này chọn đáp án sai"
                  >
                    ✗ Sai
                  </button>
                  <button
                    type="button"
                    onClick={handleForceActiveTeamBuzz}
                    className="px-1.5 sm:px-2 py-0.5 rounded-lg bg-yellow-500/20 border border-yellow-500/40 text-yellow-300 hover:bg-yellow-500/30 font-bold transition text-[10px] active:scale-95 cursor-pointer shadow-sm"
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
                      className="px-1.5 sm:px-2 py-0.5 rounded-lg bg-purple-500/20 border border-purple-500/40 text-purple-300 hover:bg-purple-500/30 font-bold transition text-[10px] active:scale-95 cursor-pointer shadow-sm hidden sm:inline-block"
                      title="MC nộp đáp án trực tiếp cho đội này hoặc đội khác"
                    >
                      🎙️ MC nộp
                    </button>
                  )}

                  {/* Score Cheat Dropdown */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setShowCheatDropdown(!showCheatDropdown); }}
                      className="px-1.5 sm:px-2 py-0.5 rounded-lg glass border border-white/20 text-slate-300 hover:text-white font-bold transition text-[10px] flex items-center gap-0.5 cursor-pointer"
                      title="Chỉnh điểm nhanh cho đội này"
                    >
                      <span>Cheat</span>
                      <span>▾</span>
                    </button>

                    {showCheatDropdown && currentTeam && (
                      <div
                        className="absolute right-0 top-full mt-1 z-50 p-1.5 rounded-xl glass border border-white/20 bg-[#151728]/95 shadow-2xl flex flex-col gap-1 w-28 text-[10px]"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          onClick={() => { handleAdjustScore(currentTeam.id, 20); setShowCheatDropdown(false); }}
                          className="px-2 py-1 rounded bg-green-500/10 hover:bg-green-500/20 text-green-300 text-left font-mono font-bold"
                        >
                          +20 điểm
                        </button>
                        <button
                          type="button"
                          onClick={() => { handleAdjustScore(currentTeam.id, -20); setShowCheatDropdown(false); }}
                          className="px-2 py-1 rounded bg-red-500/10 hover:bg-red-500/20 text-red-300 text-left font-mono font-bold"
                        >
                          -20 điểm
                        </button>
                        <button
                          type="button"
                          onClick={() => { handleAdjustScore(currentTeam.id, undefined, 0); setShowCheatDropdown(false); }}
                          className="px-2 py-1 rounded bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-300 text-left font-mono font-bold"
                        >
                          Set 0 điểm
                        </button>
                        <button
                          type="button"
                          onClick={() => { handleAdjustScore(currentTeam.id, undefined, 50); setShowCheatDropdown(false); }}
                          className="px-2 py-1 rounded bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 text-left font-mono font-bold"
                        >
                          Set 50 điểm
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Player Viewport */}
              <div className="flex-1 min-h-0 bg-[#0f0f1a]">
                <iframe
                  ref={playerIframeRef}
                  src={`/play/${code}?sandbox=1`}
                  allow="autoplay; camera; microphone"
                  onLoad={() => {
                    if (isOfflineSandbox) {
                      syncToIframes();
                    }
                    const targetTeam = stableTeams[activeTeamIndex] || stableTeams[0];
                    if (targetTeam) {
                      const tName = activeTeamIndex === 0 ? "Bạn (Tester)" : `Bạn (Tester - ${targetTeam.name})`;
                      const targetAnswer = isOfflineSandbox ? (offlineAnswersRef.current.get(targetTeam.id)?.answer || null) : null;
                      playerIframeRef.current?.contentWindow?.postMessage(
                        {
                          type: "SWITCH_ACTIVE_TEAM",
                          teamId: targetTeam.id,
                          teamName: tName,
                          teamIndex: activeTeamIndex,
                          currentAnswer: targetAnswer,
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
            className={`lg:hidden flex-col min-h-0 h-full gap-2.5 overflow-y-auto p-2 glass rounded-2xl border border-white/10 bg-[#0c0d18] ${
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

                {currentQuestion?.timerPending && (
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
                {roomState?.mode === "GRID_CARO" && roomState?.status === "PLAYING" && !currentQuestion ? null : (
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
                {currentQuestion && !revealPayload && (
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

                {roomState?.mode === "MYSTERY_QUEST" && roomState?.mysteryQuestState && (
                  <div className="pt-3 border-t border-white/10 space-y-3">
                    <MysteryQuestBoard
                      mysteryState={roomState.mysteryQuestState}
                      isAdmin={true}
                      teams={roomState.teams}
                      onFlipCard={(tileId) => {
                        window.postMessage({ type: "MYSTERY_FLIP", action: "mystery_flip", tileId }, "*");
                      }}
                      onCashOut={() => {
                        window.postMessage({ type: "MYSTERY_CASH_OUT", action: "mystery_cash_out" }, "*");
                      }}
                      onAdvanceTurn={() => {
                        window.postMessage({ type: "MYSTERY_ADVANCE_TURN", action: "mystery_advance_turn" }, "*");
                      }}
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
                      </span>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleAdjustScore(t.id, 20)}
                          className="px-1.5 py-0.5 rounded bg-green-500/20 hover:bg-green-500/30 text-green-300 font-mono font-bold text-[10px]"
                        >
                          +20
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAdjustScore(t.id, -20)}
                          className="px-1.5 py-0.5 rounded bg-red-500/20 hover:bg-red-500/30 text-red-300 font-mono font-bold text-[10px]"
                        >
                          -20
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

      {/* ── Game Mode Rules Modal ─────────────────────────────────────────── */}
      <GameModeRulesModal
        mode={roomState?.mode || selectedMode}
        isOpen={showRulesModal}
        onClose={() => setShowRulesModal(false)}
      />
    </div>
  );
}
