"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import type {
  ServerToClientEvents,
  ClientToServerEvents,
  RoomState,
  QuestionState,
  GameMode,
  CardType,
  DiceRaceState,
} from "@/types";
import { CARD_METADATA } from "@/types";
import Link from "next/link";
import GameModeRulesModal from "@/components/ui/GameModeRulesModal";
import GameModeIcon from "@/components/ui/GameModeIcon";
import { offlineStorage, DEFAULT_OFFLINE_BANK } from "@/lib/offline-storage";
import { generateBalancedDiceTiles, handleDiceRaceLanding } from "@/lib/game-engine/dice-race";
import { getDefaultAllowedPowerupsForMode } from "@/lib/game-engine/powerups";

const AVAILABLE_MODES: { mode: GameMode; name: string; emoji: string }[] = [
  { mode: "CLASSIC", name: "Truyền thống", emoji: "⚡" },
  { mode: "BUZZ", name: "Bấm chuông nhanh", emoji: "🛎️" },
  { mode: "BOUNCEBACK", name: "Cướp điểm luân phiên (Về đích Olympia)", emoji: "🔄" },
  { mode: "ELIMINATION", name: "Sinh tồn loại dần", emoji: "💀" },
  { mode: "TOURNAMENT", name: "Đấu loại 1v1", emoji: "🏆" },
  { mode: "GRID_CARO", name: "Lưới chọn ô & Caro", emoji: "🏁" },
  { mode: "DICE_RACE", name: "Đua cờ Xí ngầu", emoji: "🎲" },
  { mode: "WAGER", name: "Cược điểm Bí mật", emoji: "💰" },
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

  // Offline Sandbox Simulator State & Iframe Refs
  const [isOfflineSandbox, setIsOfflineSandbox] = useState(false);
  const displayIframeRef = useRef<HTMLIFrameElement | null>(null);
  const playerIframeRef = useRef<HTMLIFrameElement | null>(null);
  const offlineQuestionsRef = useRef<any[]>([]);
  const offlineQIndexRef = useRef<number>(-1);
  const offlineTimerRef = useRef<NodeJS.Timeout | null>(null);
  const offlineRemainingRef = useRef<number>(0);
  const offlineAnswersRef = useRef<Map<string, { answer: any; isCorrect: boolean; points: number }>>(new Map());
  const offlineUsedQuestionIdsRef = useRef<Set<string>>(new Set());

  // Active Team Switcher in Mobile Device Viewport
  const [activeTeamIndex, setActiveTeamIndex] = useState<number>(0);

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
  const [revealPayload, setRevealPayload] = useState<any>(null);

  // Sockets
  const adminSocketRef = useRef<Socket<ServerToClientEvents, ClientToServerEvents> | null>(null);
  const botSocketsRef = useRef<Map<string, Socket<ServerToClientEvents, ClientToServerEvents>>>(new Map());
  const pendingBotGridTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pendingBotDiceTimerRef = useRef<NodeJS.Timeout | null>(null);

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

    // Spawn sockets for Teams 2, 3, 4 (Teams[1], [2], [3])
    teams.slice(1).forEach((team, botIdx) => {
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
        const qData = qState.question;
        const opts = qData.options || [];
        if (opts.length === 0) return;

        // If turn-based mode, only answer if it is this bot's turn:
        if (qState.primaryTeamId && qState.primaryTeamId !== team.id) {
          return;
        }

        const delay = 2000 + Math.random() * 2000;
        setTimeout(() => {
          const chosenOpt = opts[Math.floor(Math.random() * opts.length)];
          sock.emit("game:answer:submit", {
            questionId: qData.id,
            answer: chosenOpt.id,
          });
          addLog(`Bot [${team.name}] nộp đáp án: ${chosenOpt.text}`);
        }, delay);
      };

      sock.on("game:question", (q) => {
        if (q.bouncebackSelectPhase) {
          pendingBotAnswerQ = q;
          if (botAutoEnabled && q.primaryTeamId === team.id) {
            const levels: (10 | 20 | 30)[] = [10, 20, 30];
            const picked = levels[Math.floor(Math.random() * levels.length)];
            setTimeout(() => {
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
        if (pendingBotAnswerQ) {
          const q = pendingBotAnswerQ;
          pendingBotAnswerQ = null;
          triggerBotAnswer(q);
        }
      });

      // Handle Bounceback open steal buzz
      sock.on("game:bounceback:open_steal", () => {
        if (!botAutoEnabled) return;
        if (Math.random() > 0.4) {
          const delay = 1000 + Math.random() * 2000;
          setTimeout(() => {
            sock.emit("game:buzz");
            addLog(`Bot [${team.name}] bấm chuông CƯỚP LƯỢT!`);
          }, delay);
        }
      });

      // Handle Buzz mode auto buzz when unlocked
      sock.on("game:buzz:unlocked", () => {
        if (!botAutoEnabled) return;
        if (Math.random() > 0.3) {
          const delay = 800 + Math.random() * 2000;
          setTimeout(() => {
            sock.emit("game:buzz");
            addLog(`Bot [${team.name}] bấm chuông BUZZ!`);
          }, delay);
        }
      });

      botSocketsRef.current.set(team.id, sock);
    });
  }, [botAutoEnabled, addLog]);

  // ── Admin Socket Connection ─────────────────────────────────────────────────
  const connectAdminSocket = useCallback((roomCode: string) => {
    if (adminSocketRef.current) {
      adminSocketRef.current.disconnect();
    }

    const sock: Socket<ServerToClientEvents, ClientToServerEvents> = io({
      transports: ["websocket", "polling"],
    });
    adminSocketRef.current = sock;

    sock.on("connect", () => {
      sock.emit("admin:join", roomCode, (res) => {
        if (res.success && res.roomState) {
          setRoomState(res.roomState);
          addLog(`Admin Socket đã gắn vào phòng: ${roomCode}`);
          initBotSockets(roomCode, res.roomState.teams);
        }
      });
    });

    sock.on("room:state", (state) => setRoomState(state));
    sock.on("game:question", (q) => {
      setCurrentQuestion(q);
      setRevealPayload(null);
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
      setCurrentQuestion((prev) =>
        prev
          ? {
              ...prev,
              timerPending: false,
              timerStarted: true,
              startedAt: Date.now(),
              endsAt: payload?.endsAt,
              timeLimit: payload?.timeLimit ?? prev.timeLimit,
            }
          : prev
      );
      if (payload?.endsAt) {
        setTimer({ remaining: payload?.timeLimit ?? 30, total: payload?.timeLimit ?? 30, endsAt: payload.endsAt });
      }
      addLog(`⏱️ Bắt đầu tính giờ: ${payload?.timeLimit ?? 30}s`);
    });
    sock.on("game:timer", (t) => setTimer(t));
    sock.on("game:buzz:unlocked", () => {
      setCurrentQuestion((prev) => prev ? { ...prev, buzzUnlocked: true } : prev);
      addLog("🔔 Chuông đã MỞ KHÓA cho tất cả các đội!");
    });
    sock.on("game:bounceback:points_selected", (payload) => {
      setCurrentQuestion((prev) =>
        prev
          ? {
              ...prev,
              bouncebackSelectPhase: false,
              selectedPointLevel: payload.points,
              question: { ...prev.question, points: payload.points },
            }
          : prev
      );
      addLog(`🎯 Đã chọn mức điểm: ${payload.points}đ (Về đích Olympia)`);
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
            const validSteps = [10, 15, 20, 25, 30, 35, 40, 45, 50].filter(
              (amt) => amt > currentHighest
            );
            if (validSteps.length > 0 && Math.random() > 0.4) {
              const bet = validSteps[Math.floor(Math.random() * Math.min(2, validSteps.length))];
              bSock.emit("game:wager:submit", { amount: bet });
              addLog(`Bot đã cược ${bet}đ (chia hết cho 5)`);
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
  }, [botAutoEnabled, initBotSockets, addLog]);

  useEffect(() => {
    return () => {
      if (adminSocketRef.current) adminSocketRef.current.disconnect();
      botSocketsRef.current.forEach((s) => s.disconnect());
      if (offlineTimerRef.current) clearInterval(offlineTimerRef.current);
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

  const syncToIframes = useCallback((overrides?: Record<string, any>) => {
    const payload = {
      roomState: roomStateRef.current,
      currentQuestion: currentQuestionRef.current,
      timer: timerRef.current,
      revealPayload: revealPayloadRef.current,
      buzzed: null,
      lastPowerup: null,
      matchStarting: null,
      questionPrepare: null,
      ...overrides,
    };
    displayIframeRef.current?.contentWindow?.postMessage({ type: "OFFLINE_SYNC", payload }, "*");
    playerIframeRef.current?.contentWindow?.postMessage({ type: "OFFLINE_SYNC", payload }, "*");
  }, []);

  useEffect(() => {
    if (isOfflineSandbox) {
      syncToIframes();
    }
  }, [isOfflineSandbox, roomState, currentQuestion, revealPayload, syncToIframes]);

  // Offline Sandbox Simulator Initialization
  const startOfflineSandbox = useCallback((mode: GameMode, bankId?: string) => {
    setIsOfflineSandbox(true);
    const offlineCode = "OFFLINE";
    setCode(offlineCode);

    if (offlineTimerRef.current) {
      clearInterval(offlineTimerRef.current);
      offlineTimerRef.current = null;
    }

    const bank = (bankId && offlineStorage.getLocalBankById(bankId)) || DEFAULT_OFFLINE_BANK;
    const questions = bank.questions && bank.questions.length > 0 ? bank.questions : DEFAULT_OFFLINE_BANK.questions!;
    offlineQuestionsRef.current = questions;
    offlineQIndexRef.current = -1;
    offlineAnswersRef.current.clear();
    offlineUsedQuestionIdsRef.current.clear();

    const modeAllowedPowerups = getDefaultAllowedPowerupsForMode(mode);
    const initialScore = mode === "DICE_RACE" ? 1 : 0;
    const teams = [
      { id: "t_red", name: "Đội Đỏ (Bạn)", color: "#ef4444", score: initialScore, isEliminated: false, frozenRounds: 0, shieldCount: 0, cards: [
        { id: "c_r1", type: modeAllowedPowerups[0] || "FIFTY_FIFTY", ownerType: "TEAM" as const, teamId: "t_red", used: false },
        { id: "c_r2", type: modeAllowedPowerups[1] || "TIME_PLUS", ownerType: "TEAM" as const, teamId: "t_red", used: false },
      ], playerCount: 1 },
      { id: "t_blue", name: "Đội Xanh 🤖", color: "#3b82f6", score: initialScore, isEliminated: false, frozenRounds: 0, shieldCount: 0, cards: [
        { id: "c_b1", type: modeAllowedPowerups[0] || "FIFTY_FIFTY", ownerType: "TEAM" as const, teamId: "t_blue", used: false },
        { id: "c_b2", type: modeAllowedPowerups[1] || "TIME_PLUS", ownerType: "TEAM" as const, teamId: "t_blue", used: false },
      ], playerCount: 1 },
      { id: "t_yellow", name: "Đội Vàng 🤖", color: "#eab308", score: initialScore, isEliminated: false, frozenRounds: 0, shieldCount: 0, cards: [
        { id: "c_y1", type: modeAllowedPowerups[0] || "FIFTY_FIFTY", ownerType: "TEAM" as const, teamId: "t_yellow", used: false },
        { id: "c_y2", type: modeAllowedPowerups[1] || "TIME_PLUS", ownerType: "TEAM" as const, teamId: "t_yellow", used: false },
      ], playerCount: 1 },
      { id: "t_purple", name: "Đội Tím 🤖", color: "#a855f7", score: initialScore, isEliminated: false, frozenRounds: 0, shieldCount: 0, cards: [
        { id: "c_p1", type: modeAllowedPowerups[0] || "FIFTY_FIFTY", ownerType: "TEAM" as const, teamId: "t_purple", used: false },
        { id: "c_p2", type: modeAllowedPowerups[1] || "TIME_PLUS", ownerType: "TEAM" as const, teamId: "t_purple", used: false },
      ], playerCount: 1 },
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

    const initialRoomState: RoomState = {
      id: "room_offline_local",
      code: offlineCode,
      name: `Phòng Sandbox Ngoại tuyến (${mode})`,
      mode,
      teamMode: "TEAM",
      status: "LOBBY",
      currentQuestionIndex: 0,
      totalQuestions: questions.length,
      teams,
      players,
      sharedCards: [],
      config: {
        powerupEnabled: true,
        powerupOwnerType: "TEAM",
        powerupCountPerTeam: 2,
        powerupCountShared: 0,
        allowedPowerups: modeAllowedPowerups,
        timeBonusEnabled: true,
        penaltyForWrong: true,
        penaltyPoints: 10,
        maxTeams: 4,
        buzzMode: mode === "BUZZ",
        eliminationRounds: 1,
      },
      gridCaroState,
      diceRaceState,
    };

    setRoomState(initialRoomState);
    setCurrentQuestion(null);
    setRevealPayload(null);
    setTimer(null);
    addLog(`⚡ Đã kích hoạt Sandbox Ngoại tuyến (Offline Mode) - Chế độ: ${mode}`);
  }, [addLog]);

  // Handle player actions sent from the mobile viewport iframe
  useEffect(() => {
    const handlePlayerAction = (e: MessageEvent) => {
      if (e.data?.type !== "OFFLINE_PLAYER_ACTION" || !isOfflineSandbox) return;
      const { action, answer, points, cellId, teamId } = e.data;
      const targetTeamId = teamId || roomState?.teams[activeTeamIndex]?.id || "t_red";
      const targetTeamName = roomState?.teams.find((t) => t.id === targetTeamId)?.name || "Bạn (Tester)";

      if (action === "answer") {
        if (!currentQuestion) return;
        const qData = currentQuestion.question;
        const opts = qData.options || [];
        const chosenOpt = opts.find((o: any) => o.id === answer || o.text === answer);
        const rawQ = offlineQuestionsRef.current[offlineQIndexRef.current] || qData;
        const correctOpt = rawQ.options?.find((o: any) => o.isCorrect);
        const isCorrect = correctOpt ? correctOpt.id === answer : false;
        const awarded = isCorrect ? (currentQuestion.question.points || 10) : 0;
        offlineAnswersRef.current.set(targetTeamId, { answer, isCorrect, points: awarded });
        addLog(`[${targetTeamName}] đã nộp đáp án: ${chosenOpt?.text || answer}`);
      } else if (action === "buzz") {
        setCurrentQuestion((prev) => prev ? { ...prev, buzzedTeamId: targetTeamId, buzzedTeamName: targetTeamName } : prev);
        addLog(`⚡ [${targetTeamName}] đã BẤM CHUÔNG thành công!`);
        syncToIframes({ buzzedBy: { playerName: targetTeamName, teamId: targetTeamId } });
      } else if (action === "bounceback_select_points") {
        setCurrentQuestion((prev) => {
          if (!prev) return prev;
          const updated = {
            ...prev,
            bouncebackSelectPhase: false,
            selectedPointLevel: points,
            question: { ...prev.question, points },
          };
          syncToIframes({ currentQuestion: updated });
          return updated;
        });
        addLog(`🎯 [${targetTeamName}] đã chọn gói điểm: ${points}đ`);
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
      } else if (action === "grid_select") {
        addLog(`🏁 [${targetTeamName}] đã chọn ô #${cellId}`);
      } else if (action === "dice_roll") {
        handleDiceRollManual();
      }
    };

    window.addEventListener("message", handlePlayerAction);
    return () => window.removeEventListener("message", handlePlayerAction);
  }, [isOfflineSandbox, currentQuestion, addLog, syncToIframes, activeTeamIndex, roomState?.teams]);

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
        connectAdminSocket(data.code);
        addLog(`Đã khởi tạo Sandbox: Phòng ${data.code} (${data.mode})`);
      } else {
        addLog("⚡ Không thể tạo phòng online, tự động chuyển sang Sandbox Ngoại tuyến!");
        startOfflineSandbox(selectedMode, selectedBankId);
      }
    } catch {
      addLog("⚡ Lỗi kết nối mạng: Đã tự động kích hoạt Sandbox Ngoại tuyến!");
      startOfflineSandbox(selectedMode, selectedBankId);
    } finally {
      setCreating(false);
    }
  };

  const handleConnectExisting = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputCode.trim().length === 6) {
      setCode(inputCode.trim());
      setIsOfflineSandbox(false);
      connectAdminSocket(inputCode.trim());
    }
  };

  // ── Host Actions ──────────────────────────────────────────────────────────
  const launchOfflineQuestion = (nextIdx: number) => {
    if (offlineTimerRef.current) {
      clearInterval(offlineTimerRef.current);
      offlineTimerRef.current = null;
    }
    offlineAnswersRef.current.clear();

    const questions = offlineQuestionsRef.current;
    offlineQIndexRef.current = nextIdx;
    const q = questions[nextIdx] || DEFAULT_OFFLINE_BANK.questions![0];

    const timeLimit = q.timeLimit || 20;
    const endsAt = Date.now() + timeLimit * 1000;
    const qState: QuestionState = {
      question: {
        id: q.id || `q_${nextIdx + 1}`,
        type: q.type || "MC_SINGLE",
        content: q.content,
        options: q.options?.map((o: any) => ({ id: o.id, text: o.text })),
        points: q.points || 10,
        timeLimit,
        hint: q.hint,
        order: nextIdx + 1,
      },
      timeLimit,
      startedAt: Date.now(),
      endsAt,
      serverTime: Date.now(),
      activeBoosts: [],
      timerPending: false,
      timerStarted: true,
      buzzUnlocked: selectedMode === "BUZZ" ? false : true,
      buzzUnlockMode: "MANUAL",
      bouncebackSelectPhase: selectedMode === "BOUNCEBACK",
      primaryTeamId:
        selectedMode === "BOUNCEBACK"
          ? roomState?.teams[nextIdx % (roomState?.teams.length || 4)]?.id
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
          : selectedMode === "GRID_CARO"
          ? (roomState?.gridCaroState?.currentTurnTeamName || roomState?.teams[nextIdx % (roomState?.teams.length || 4)]?.name)
          : selectedMode === "DICE_RACE"
          ? (roomState?.diceRaceState?.currentTurnTeamName || roomState?.teams[nextIdx % (roomState?.teams.length || 4)]?.name)
          : selectedMode === "TOURNAMENT"
          ? `${roomState?.teams[0]?.name || "Đội 1"} vs ${roomState?.teams[1]?.name || "Đội 2"}`
          : undefined,
      tournamentTeam1Id: selectedMode === "TOURNAMENT" ? roomState?.teams[0]?.id : undefined,
      tournamentTeam2Id: selectedMode === "TOURNAMENT" ? roomState?.teams[1]?.id : undefined,
    };

    setCurrentQuestion(qState);
    setRevealPayload(null);
    setTimer({ remaining: timeLimit, total: timeLimit, endsAt });
    offlineRemainingRef.current = timeLimit;

    setRoomState((prev) => {
      if (!prev) return prev;
      const nextDice = prev.diceRaceState
        ? { ...prev.diceRaceState, canRollDice: false }
        : undefined;
      return { ...prev, status: "PLAYING", currentQuestionIndex: nextIdx, diceRaceState: nextDice };
    });

    offlineTimerRef.current = setInterval(() => {
      offlineRemainingRef.current -= 1;
      const rem = offlineRemainingRef.current;
      setTimer({ remaining: rem, total: timeLimit, endsAt });
      if (rem <= 0) {
        if (offlineTimerRef.current) clearInterval(offlineTimerRef.current);
        offlineTimerRef.current = null;
      }
    }, 1000);

    if (botAutoEnabled) {
      setTimeout(() => {
        const opts = q.options || [];
        if (opts.length > 0) {
          ["t_blue", "t_yellow", "t_purple"].forEach((bTeamId) => {
            const bOpt = opts[Math.floor(Math.random() * opts.length)];
            const isCorrect = (bOpt as any).isCorrect ?? false;
            offlineAnswersRef.current.set(bTeamId, {
              answer: bOpt.id,
              isCorrect,
              points: isCorrect ? (q.points || 10) : 0,
            });
            const teamName = roomState?.teams.find((t) => t.id === bTeamId)?.name;
            addLog(`Bot [${teamName}] nộp đáp án: ${bOpt.text}`);
          });
        }
      }, 2200);
    }

    addLog(`Admin: Bắt đầu câu hỏi #${nextIdx + 1}: "${q.content.slice(0, 30)}..."`);
  };

  const handleAdminNext = () => {
    if (isOfflineSandbox) {
      // Khi nhấn Bắt đầu ở LOBBY: Hiện bàn cờ/đường đua trước rồi mới hiện câu hỏi!
      if (roomState?.status === "LOBBY") {
        setRoomState((prev) => prev ? { ...prev, status: "PLAYING" } : prev);
        if (selectedMode === "DICE_RACE") {
          addLog("🏁 Cuộc đua cờ xí ngầu bắt đầu! Bàn cờ hiển thị toàn màn hình. Nhấn 'Hiện câu hỏi' khi sẵn sàng.");
          return;
        } else if (selectedMode === "GRID_CARO") {
          addLog("🏁 Bàn cờ Caro bắt đầu! Đội hiện tại chọn ô để mở câu hỏi.");
          return;
        }
      }

      const questions = offlineQuestionsRef.current;
      if (questions.length === 0) return;

      // Theo quy tắc: Nếu hết câu hỏi trong bộ đề mà chưa ai về đích / chưa hết ô -> Dừng luôn cuộc chơi và tính hạng luôn
      if (offlineUsedQuestionIdsRef.current.size >= questions.length) {
        setRoomState((prev) => prev ? { ...prev, status: "FINISHED" } : prev);
        setCurrentQuestion(null);
        setRevealPayload(null);
        addLog("🏁 Đã hết toàn bộ câu hỏi trong bộ đề! Trận đấu kết thúc và công bố bảng xếp hạng.");
        syncToIframes({ roomState: { ...(roomState || {}), status: "FINISHED" }, currentQuestion: null });
        return;
      }

      let nextIdx = -1;
      for (let i = 0; i < questions.length; i++) {
        const qId = questions[i].id || `q_${i + 1}`;
        if (!offlineUsedQuestionIdsRef.current.has(qId)) {
          nextIdx = i;
          offlineUsedQuestionIdsRef.current.add(qId);
          break;
        }
      }

      if (nextIdx === -1) {
        setRoomState((prev) => prev ? { ...prev, status: "FINISHED" } : prev);
        addLog("🏁 Hết câu hỏi khả dụng! Trận đấu kết thúc.");
        return;
      }

      launchOfflineQuestion(nextIdx);
      return;
    }

    adminSocketRef.current?.emit("admin:next", { code });
    addLog("Admin: Bắt đầu / Next câu tiếp theo");
  };

  const handleAdminReveal = () => {
    if (isOfflineSandbox) {
      if (offlineTimerRef.current) {
        clearInterval(offlineTimerRef.current);
        offlineTimerRef.current = null;
      }
      if (!currentQuestion) return;

      const qRaw = offlineQuestionsRef.current[offlineQIndexRef.current] || currentQuestion.question;
      const correctOpt = qRaw.options?.find((o: any) => o.isCorrect);
      const correctId = correctOpt ? correctOpt.id : "A";

      const answers: any[] = [];
      const scoreDeltas: { teamId: string; delta: number }[] = [];

      (roomState?.teams || []).forEach((t) => {
        const recorded = offlineAnswersRef.current.get(t.id);
        const ansId = recorded ? recorded.answer : (t.id === "t_red" ? correctId : "B");
        const isCorrect = recorded ? recorded.isCorrect : ansId === correctId;
        const pts = isCorrect ? (currentQuestion.question.points || 10) : 0;
        answers.push({
          teamId: t.id,
          name: t.name,
          answer: [ansId],
          isCorrect,
          pointsAwarded: pts,
          timeSpent: 3000,
        });
        scoreDeltas.push({ teamId: t.id, delta: pts });
      });

      const payload = {
        questionId: currentQuestion.question.id,
        correctAnswer: [correctId],
        answers,
      };

      const curTurnTeamId = roomState?.diceRaceState?.currentTurnTeamId;
      const curTeamAnswer = answers.find((a) => a.teamId === curTurnTeamId);
      const isCurTeamCorrect = Boolean(curTeamAnswer?.isCorrect);

      setRevealPayload(payload);

      setRoomState((prev) => {
        if (!prev) return prev;
        const updatedTeams = prev.teams.map((t) => {
          const delta = scoreDeltas.find((d) => d.teamId === t.id)?.delta || 0;
          return { ...t, score: t.score + delta };
        });

        let nextDice = prev.diceRaceState;
        if (prev.diceRaceState) {
          const teamIds = (prev.teams || []).map((t) => t.id);
          const curIdx = curTurnTeamId ? teamIds.indexOf(curTurnTeamId) : 0;
          const nextTeamId = teamIds[(curIdx + 1) % (teamIds.length || 1)];
          const nextTeamName = prev.teams.find((t) => t.id === nextTeamId)?.name;

          nextDice = {
            ...prev.diceRaceState,
            canRollDice: isCurTeamCorrect,
            // If team was WRONG, advance turn to next team for the next question:
            currentTurnTeamId: isCurTeamCorrect ? prev.diceRaceState.currentTurnTeamId : nextTeamId,
            currentTurnTeamName: isCurTeamCorrect ? prev.diceRaceState.currentTurnTeamName : nextTeamName,
          };
        }

        return { ...prev, teams: updatedTeams, diceRaceState: nextDice };
      });

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
    if (isOfflineSandbox) {
      if (!currentQuestion) return;
      const timeLimit = currentQuestion.timeLimit || 20;
      const endsAt = Date.now() + timeLimit * 1000;
      const updatedQ = {
        ...currentQuestion,
        timerPending: false,
        timerStarted: true,
        endsAt,
        serverTime: Date.now(),
      };
      setCurrentQuestion(updatedQ);
      offlineRemainingRef.current = timeLimit;
      setTimer({ remaining: timeLimit, total: timeLimit, endsAt });
      syncToIframes({ currentQuestion: updatedQ, timer: { remaining: timeLimit, total: timeLimit, endsAt } });

      if (offlineTimerRef.current) clearInterval(offlineTimerRef.current);
      offlineTimerRef.current = setInterval(() => {
        offlineRemainingRef.current -= 1;
        const rem = offlineRemainingRef.current;
        setTimer({ remaining: rem, total: timeLimit, endsAt });
        if (rem <= 0) {
          if (offlineTimerRef.current) clearInterval(offlineTimerRef.current);
          offlineTimerRef.current = null;
        }
      }, 1000);
      addLog(`Admin: Bắt đầu tính giờ (${timeLimit}s)`);
      return;
    }

    adminSocketRef.current?.emit("admin:question:start_timer");
    addLog("Admin: Bắt đầu tính giờ");
  };

  // Mode Specific Handlers
  const handleBuzzUnlock = () => {
    if (isOfflineSandbox) {
      setCurrentQuestion((prev) => prev ? { ...prev, buzzUnlocked: true } : prev);
      addLog("🔔 Chuông đã MỞ KHÓA cho tất cả các đội!");
      return;
    }

    adminSocketRef.current?.emit("admin:buzz:unlock");
    addLog("Admin: Mở chuông cho thí sinh bấm (admin:buzz:unlock)");
  };

  const handleBuzzStartAnswer = () => {
    adminSocketRef.current?.emit("admin:buzz:start_answer");
    addLog("Admin: Bắt đầu 15s trả lời cho đội bấm chuông");
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

  const handleBouncebackStartStealAnswer = () => {
    adminSocketRef.current?.emit("admin:bounceback:start_steal_answer");
    addLog("Admin: Bắt đầu 15s trả lời cướp điểm");
  };

  const handleAdminBouncebackSelectPoints = (points: 10 | 20 | 30) => {
    if (isOfflineSandbox) {
      setCurrentQuestion((prev) =>
        prev
          ? {
              ...prev,
              bouncebackSelectPhase: false,
              selectedPointLevel: points,
              question: { ...prev.question, points },
            }
          : prev
      );
      addLog(`🎯 Đã chọn mức điểm: ${points}đ (Về đích Olympia)`);
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

      const roll = Math.floor(Math.random() * 6) + 1;
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
  const handleForceActiveTeamAnswer = (isCorrect: boolean) => {
    if (!currentQuestion || !currentTeam) return;
    const opts = currentQuestion.question.options || [];
    if (opts.length === 0) return;

    const opt = isCorrect ? opts[0] : opts[opts.length - 1];

    if (isOfflineSandbox) {
      const awarded = isCorrect ? (currentQuestion.question.points || 10) : 0;
      offlineAnswersRef.current.set(currentTeam.id, {
        answer: opt.id,
        isCorrect,
        points: awarded,
      });
      addLog(`[${currentTeam.name}] nộp đáp án: ${isCorrect ? "ĐÚNG" : "SAI"}`);
      return;
    }

    const sock = botSocketsRef.current.get(currentTeam.id);
    if (sock) {
      sock.emit("game:answer:submit", {
        questionId: currentQuestion.question.id,
        answer: opt.id,
      });
      addLog(`[${currentTeam.name}] nộp đáp án: ${isCorrect ? "ĐÚNG" : "SAI"}`);
    }
  };

  const handleForceActiveTeamBuzz = () => {
    if (!currentTeam) return;

    if (isOfflineSandbox) {
      setCurrentQuestion((prev) => prev ? { ...prev, buzzedTeamId: currentTeam.id, buzzedTeamName: currentTeam.name } : prev);
      addLog(`[${currentTeam.name}] bấm Buzz!`);
      return;
    }

    const sock = botSocketsRef.current.get(currentTeam.id);
    if (sock) {
      sock.emit("game:buzz");
      addLog(`[${currentTeam.name}] bấm Buzz!`);
    }
  };

  const handleForceActiveTeamWager = (amount: number) => {
    if (!currentTeam) return;
    const sock = botSocketsRef.current.get(currentTeam.id);
    if (sock) {
      sock.emit("game:wager:submit", { amount });
      addLog(`[${currentTeam.name}] cược ${amount}đ`);
    }
  };

  const handleTriggerAllBotsAnswer = () => {
    if (!currentQuestion) return;
    const opts = currentQuestion.question.options || [];
    if (opts.length === 0) return;

    if (isOfflineSandbox) {
      (roomState?.teams || []).forEach((t) => {
        if (t.id === (currentTeam?.id || "t_red")) return;
        const opt = opts[Math.floor(Math.random() * opts.length)];
        const rawQ = offlineQuestionsRef.current[offlineQIndexRef.current] || currentQuestion.question;
        const correctOpt = rawQ.options?.find((o: any) => o.isCorrect);
        const isCorrect = correctOpt ? correctOpt.id === opt.id : false;
        const awarded = isCorrect ? (currentQuestion.question.points || 10) : 0;
        offlineAnswersRef.current.set(t.id, {
          answer: opt.id,
          isCorrect,
          points: awarded,
        });
        addLog(`🤖 Cho Bot [${t.name}] nộp đáp án: ${opt.text}`);
      });
      return;
    }

    botSocketsRef.current.forEach((sock, bTeamId) => {
      if (bTeamId === currentTeam?.id) return;
      const opt = opts[Math.floor(Math.random() * opts.length)];
      sock.emit("game:answer:submit", {
        questionId: currentQuestion.question.id,
        answer: opt.id,
      });
      const tName = roomState?.teams.find((t) => t.id === bTeamId)?.name;
      addLog(`🤖 Cho Bot [${tName || bTeamId}] nộp đáp án: ${opt.text}`);
    });
  };

  const handleSwitchActiveTeam = (idx: number) => {
    setActiveTeamIndex(idx);
    const targetTeam = roomState?.teams[idx];
    if (!targetTeam) return;
    const targetName = idx === 0 ? "Bạn (Tester)" : `${targetTeam.name} 🤖`;
    playerIframeRef.current?.contentWindow?.postMessage(
      {
        type: "SWITCH_ACTIVE_TEAM",
        teamId: targetTeam.id,
        teamName: targetName,
        teamIndex: idx,
        payload: {
          teamId: targetTeam.id,
          teamName: targetName,
          teamIndex: idx,
        },
      },
      "*"
    );
    addLog(`📱 Chuyển thiết bị điện thoại sang điều khiển: [${targetTeam.name}]`);
  };

  const handleGrantCard = async () => {
    if (!roomState || !grantTargetTeamId) return;
    const currentModeAllowed = getDefaultAllowedPowerupsForMode((roomState.mode || "CLASSIC") as GameMode);
    if (!currentModeAllowed.includes(grantCardType)) {
      alert(`Thẻ [${grantCardType}] không được phép sử dụng trong chế độ ${roomState.mode}!`);
      return;
    }
    if (isOfflineSandbox) {
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

  const currentTeam = roomState?.teams?.[activeTeamIndex] || roomState?.teams?.[0];

  return (
    <div className="h-full max-h-full flex flex-col min-h-0 gap-2 overflow-hidden">
      {/* ── Top Header Controls (Compact Single-Bar) ─────────────────── */}
      <div className="glass rounded-xl px-3 py-2 border border-white/10 flex flex-wrap items-center justify-between gap-2 shadow-lg shrink-0 bg-[#121424]">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-600 to-cyan-500 flex items-center justify-center text-base shadow glow-purple shrink-0">
            🧪
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-black text-white whitespace-nowrap">Sandbox Studio</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-bold whitespace-nowrap">
                1 Người Điều Khiển
              </span>
              {isOfflineSandbox && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold whitespace-nowrap animate-pulse">
                  ⚡ Ngoại tuyến
                </span>
              )}
              {code && (
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-white/5 border border-purple-500/30 text-xs">
                  <span className="text-muted-foreground text-[10px]">PIN:</span>
                  <span className="font-mono font-black text-cyan-300">{code}</span>
                  <span className="text-purple-300 font-bold inline-flex items-center gap-1 text-[11px]">
                    <GameModeIcon mode={roomState?.mode || "CLASSIC"} className="w-3 h-3" />
                    [{roomState?.mode}]
                  </span>
                  <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                    roomState?.status === "PLAYING" ? "bg-green-500/20 text-green-300" : "bg-yellow-500/20 text-yellow-300"
                  }`}>
                    {roomState?.status}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

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
            <div className="flex items-center gap-1.5 flex-wrap">
              {/* Bot Auto Toggle */}
              <button
                type="button"
                onClick={() => setBotAutoEnabled(!botAutoEnabled)}
                className={`px-2.5 py-1 rounded-lg border text-xs font-bold transition flex items-center gap-1 shrink-0 cursor-pointer ${
                  botAutoEnabled
                    ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-300 shadow-sm"
                    : "glass border-white/10 text-muted-foreground hover:text-white"
                }`}
                title="Bật/Tắt cơ chế Bot tự động nộp đáp án"
              >
                <span>🤖</span>
                <span className="whitespace-nowrap">Bot Auto: {botAutoEnabled ? "BẬT" : "TẮT"}</span>
              </button>

              {/* On-Demand Trigger All Bots */}
              <button
                type="button"
                onClick={handleTriggerAllBotsAnswer}
                disabled={!currentQuestion || !!revealPayload || Boolean(timer && timer.remaining <= 0)}
                className="px-2.5 py-1 rounded-lg border border-blue-500/40 bg-blue-600/20 text-blue-200 hover:bg-blue-600/30 text-xs font-bold transition flex items-center gap-1 shrink-0 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-sm"
                title="Yêu cầu tất cả Bot ảo nộp đáp án ngay lúc này"
              >
                <span>⚡</span>
                <span className="whitespace-nowrap">Bot nộp bài</span>
              </button>

              {/* Tools Group */}
              <div className="flex items-center gap-1 p-0.5 rounded-lg glass border border-white/10 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowRulesModal(true)}
                  className="px-2 py-0.5 rounded hover:bg-white/10 text-cyan-300 text-xs font-bold transition flex items-center gap-1 whitespace-nowrap"
                >
                  <span>📖</span>
                  <span>Luật</span>
                </button>
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
                  }}
                  className="px-2 py-0.5 rounded hover:bg-white/10 text-purple-300 text-xs font-bold transition flex items-center gap-1 whitespace-nowrap"
                >
                  <span>🃏</span>
                  <span>Cấp thẻ</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowLogsModal(true)}
                  className="px-2 py-0.5 rounded hover:bg-white/10 text-amber-300 text-xs font-bold transition flex items-center gap-1 whitespace-nowrap"
                >
                  <span>📜</span>
                  <span>Logs ({botLogs.length})</span>
                </button>
              </div>

              {/* Exit */}
              <button
                type="button"
                onClick={() => {
                  setCode("");
                  setRoomState(null);
                  setCurrentQuestion(null);
                  setIsOfflineSandbox(false);
                }}
                className="px-2 py-1 rounded-lg glass hover:bg-red-500/20 text-red-400 text-xs font-bold transition shrink-0 whitespace-nowrap"
              >
                ✕ Đổi phòng
              </button>
            </div>
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
          <div className="lg:col-span-7 flex flex-col min-h-0 h-full gap-1.5 overflow-hidden">
            {/* Host Action Bar (Compact Single Line) */}
            <div className="glass rounded-xl px-2.5 py-1.5 border border-white/10 bg-[#121424] flex flex-wrap items-center justify-between gap-1.5 shadow shrink-0">
              <div className="flex items-center gap-1 flex-wrap">
                <span className="text-[11px] font-black text-purple-300 flex items-center gap-1 mr-1">
                  <span>🎛️</span>
                  <span>MC:</span>
                </span>

                {/* Core Flow */}
                {roomState?.mode === "GRID_CARO" && roomState?.status === "PLAYING" && !currentQuestion ? null : (
                  <button
                    type="button"
                    onClick={handleAdminNext}
                    className={`px-2.5 py-1 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-black shadow transition active:scale-95 flex items-center gap-1 whitespace-nowrap ${
                      roomState?.mode === "DICE_RACE" && !currentQuestion && roomState?.status === "PLAYING"
                        ? "animate-pulse ring-2 ring-cyan-400 bg-gradient-to-r from-purple-600 to-cyan-600"
                        : ""
                    }`}
                  >
                    <span>
                      {roomState?.status === "LOBBY"
                        ? "🚀 Bắt đầu"
                        : roomState?.mode === "DICE_RACE" && !currentQuestion
                        ? "🎯 Hiện câu hỏi"
                        : "⏩ Câu kế"}
                    </span>
                  </button>
                )}

                {/* Reveal */}
                <button
                  type="button"
                  onClick={handleAdminReveal}
                  className="px-2.5 py-1 rounded-lg glass hover:bg-white/10 border border-white/20 text-amber-300 text-xs font-bold transition flex items-center gap-1 whitespace-nowrap cursor-pointer"
                >
                  <span>👁️</span>
                  <span>Công bố</span>
                </button>

                {/* Early Stop */}
                {currentQuestion && !revealPayload && (
                  <button
                    type="button"
                    onClick={handleAdminStopEarly}
                    disabled={Boolean(timer && timer.remaining <= 0)}
                    className="px-2.5 py-1 rounded-lg bg-rose-600/30 hover:bg-rose-600/50 border border-rose-500/40 text-rose-300 text-xs font-bold transition flex items-center gap-1 whitespace-nowrap cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
                    title="Dừng thời gian câu hỏi ngay lập tức"
                  >
                    <span>⏹️</span>
                    <span>Dừng sớm</span>
                  </button>
                )}

                {/* Start Timer if pending */}
                {currentQuestion?.timerPending && (
                  <button
                    type="button"
                    onClick={handleStartTimer}
                    className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-amber-500 to-green-500 hover:from-amber-400 text-black text-xs font-black shadow animate-pulse flex items-center gap-1 whitespace-nowrap"
                  >
                    <span>⏱️</span>
                    <span>Bắt đầu tính giờ</span>
                  </button>
                )}

                {/* Mode-specific actions */}
                {roomState?.mode === "BUZZ" && currentQuestion && (
                  <>
                    {!currentQuestion.buzzUnlocked && (
                      <button
                        type="button"
                        onClick={handleBuzzUnlock}
                        className="px-2 py-1 rounded-lg bg-yellow-500 hover:bg-yellow-400 text-black text-xs font-black shadow animate-pulse flex items-center gap-1 whitespace-nowrap"
                      >
                        <span>🔔</span>
                        <span>Mở chuông</span>
                      </button>
                    )}
                    {currentQuestion.buzzedTeamId && (
                      <button
                        type="button"
                        onClick={handleBuzzStartAnswer}
                        className="px-2 py-1 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-black shadow flex items-center gap-1 whitespace-nowrap"
                      >
                        <span>🎙️</span>
                        <span>Cho trả lời 15s</span>
                      </button>
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
                    <button
                      type="button"
                      onClick={handleBouncebackOpenSteal}
                      className="px-2 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-black text-xs font-black shadow flex items-center gap-1 whitespace-nowrap"
                    >
                      <span>🔔</span>
                      <span>Mở cướp 5s</span>
                    </button>
                    {currentQuestion.stealBuzzedTeamId && (
                      <button
                        type="button"
                        onClick={handleBouncebackStartStealAnswer}
                        className="px-2 py-1 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-black shadow flex items-center gap-1 whitespace-nowrap"
                      >
                        <span>🎙️</span>
                        <span>Cho cướp 15s</span>
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
                        className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-purple-600 to-cyan-600 text-white text-xs font-black shadow animate-pulse flex items-center gap-1 whitespace-nowrap"
                      >
                        <span>📖</span>
                        <span>Hiện câu (#{roomState.gridCaroState.selectedCellId})</span>
                      </button>
                    )}
                    {!currentQuestion && !roomState.gridCaroState?.previewActive && !roomState.gridCaroState?.selectedCellId && (
                      <button
                        type="button"
                        onClick={handleGridPreviewStart}
                        className="px-2 py-1 rounded-lg glass hover:bg-white/10 border border-purple-500/40 text-purple-300 text-xs font-bold transition flex items-center gap-1 whitespace-nowrap"
                      >
                        <span>👁️</span>
                        <span>Xem độ khó (5s)</span>
                      </button>
                    )}
                    {!currentQuestion && roomState.gridCaroState?.previewActive && (
                      <button
                        type="button"
                        onClick={handleGridPreviewStop}
                        className="px-2 py-1 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition flex items-center gap-1 whitespace-nowrap"
                      >
                        <span>🙈</span>
                        <span>Lật úp</span>
                      </button>
                    )}
                    {revealPayload && (
                      <button
                        type="button"
                        onClick={handleGridAdvanceNow}
                        className="px-2 py-1 rounded-lg bg-gradient-to-r from-purple-600 to-cyan-600 text-white text-xs font-black shadow flex items-center gap-1 whitespace-nowrap"
                      >
                        <span>🏁</span>
                        <span>Về bảng ô</span>
                      </button>
                    )}
                  </>
                )}

                {roomState?.mode === "DICE_RACE" && (
                  <>
                    <button
                      type="button"
                      onClick={handleDiceRollManual}
                      disabled={!roomState?.diceRaceState?.canRollDice || (Boolean(currentQuestion) && !revealPayload)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-black shadow flex items-center gap-1 whitespace-nowrap transition ${
                        roomState?.diceRaceState?.canRollDice && (!currentQuestion || revealPayload)
                          ? "bg-gradient-to-r from-amber-400 via-orange-400 to-yellow-500 hover:from-amber-300 text-black animate-pulse cursor-pointer shadow-amber-500/30"
                          : "bg-white/5 border border-white/10 text-slate-500 opacity-40 cursor-not-allowed"
                      }`}
                      title={
                        roomState?.diceRaceState?.canRollDice && (!currentQuestion || revealPayload)
                          ? "Tung xúc xắc cho đội của lượt hiện tại"
                          : "Chưa đủ điều kiện tung xúc xắc (Đội cần trả lời đúng câu hỏi hoặc có ô x2)"
                      }
                    >
                      <span>🎲</span>
                      <span>Tung xúc xắc</span>
                    </button>
                    {revealPayload && (
                      <button
                        type="button"
                        onClick={handleDiceAdvanceToBoard}
                        className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 text-black text-xs font-black shadow flex items-center gap-1 whitespace-nowrap animate-pulse"
                        title="Chuyển màn hình hội trường và thí sinh về bàn cờ đường đua"
                      >
                        <span>🗺️</span>
                        <span>Về bàn cờ</span>
                      </button>
                    )}
                  </>
                )}
              </div>

              {/* Utility Fast Controls */}
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={handleSkipTimerToOneSecond}
                  title="Giảm thời gian đếm ngược còn 1s"
                  className="px-2 py-1 rounded-lg glass hover:bg-white/10 border border-white/20 text-yellow-300 text-xs font-bold transition flex items-center gap-1 whitespace-nowrap"
                >
                  <span>⚡</span>
                  <span>Tua 1s</span>
                </button>
                <button
                  type="button"
                  onClick={handlePauseResume}
                  className="px-2 py-1 rounded-lg glass hover:bg-white/10 border border-white/20 text-slate-300 text-xs font-bold transition whitespace-nowrap"
                >
                  {roomState?.status === "PAUSED" ? "▶️ Tiếp" : "⏸️ Dừng"}
                </button>
              </div>
            </div>

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
          <div className="lg:col-span-5 flex flex-col min-h-0 h-full gap-1.5 overflow-hidden">
            {/* Team Switcher Tabs (Compact) */}
            <div className="glass rounded-xl p-1.5 border border-white/10 bg-[#121424] shrink-0">
              <div className="text-[10px] font-bold text-slate-400 mb-1 px-1 flex items-center justify-between">
                <span>📱 Chọn Đội trên điện thoại:</span>
                <span className="text-cyan-400 font-mono font-bold">
                  {currentTeam?.name || "Đội 1"}
                </span>
              </div>
              <div className="grid grid-cols-4 gap-1">
                {(roomState?.teams || []).map((t, idx) => {
                  const isActive = activeTeamIndex === idx;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => handleSwitchActiveTeam(idx)}
                      className={`p-1.5 rounded-lg text-left border transition flex flex-col gap-0.5 cursor-pointer ${
                        isActive
                          ? "bg-purple-600/30 border-purple-500 shadow ring-1 ring-purple-400/50"
                          : "glass border-white/10 hover:border-white/30 text-slate-300"
                      }`}
                    >
                      <div className="flex items-center gap-1 min-w-0">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ background: t.color }} />
                        <span className="font-bold text-[11px] truncate text-white">{t.name}</span>
                      </div>
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="text-slate-400 text-[9px]">
                          {idx === 0 ? "Tester" : "Bot"}
                        </span>
                        <span className="font-mono font-bold text-cyan-300 text-[10px]">
                          {t.score}đ
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Quick Testing Actions for Current Selected Team */}
            {currentTeam && (
              <div className="glass rounded-xl px-2 py-1.5 border border-white/10 bg-[#151728] shrink-0 flex flex-wrap items-center justify-between gap-1 text-xs">
                {/* Answer simulation */}
                <div className="flex items-center gap-1 flex-wrap">
                  <button
                    type="button"
                    onClick={() => handleForceActiveTeamAnswer(true)}
                    className="px-2 py-0.5 rounded-lg bg-green-500/20 border border-green-500/40 text-green-300 hover:bg-green-500/30 font-bold transition text-[11px]"
                  >
                    ✓ Chọn ĐÚNG
                  </button>
                  <button
                    type="button"
                    onClick={() => handleForceActiveTeamAnswer(false)}
                    className="px-2 py-0.5 rounded-lg bg-red-500/20 border border-red-500/40 text-red-300 hover:bg-red-500/30 font-bold transition text-[11px]"
                  >
                    ✗ Chọn SAI
                  </button>
                  <button
                    type="button"
                    onClick={handleForceActiveTeamBuzz}
                    className="px-2 py-0.5 rounded-lg bg-yellow-500/20 border border-yellow-500/40 text-yellow-300 hover:bg-yellow-500/30 font-bold transition text-[11px]"
                  >
                    ⚡ Buzz
                  </button>
                </div>

                {/* Score Cheat Controls */}
                <div className="flex items-center gap-1 relative">
                  <button
                    type="button"
                    onClick={() => setShowCheatDropdown(!showCheatDropdown)}
                    className="px-2 py-0.5 rounded-lg glass border border-white/20 text-slate-300 hover:text-white font-bold transition text-[10px] flex items-center gap-1"
                  >
                    <span>Cheat điểm ({currentTeam.score}đ)</span>
                    <span>▾</span>
                  </button>

                  {showCheatDropdown && (
                    <div className="absolute right-0 top-full mt-1 z-30 p-2 rounded-xl glass border border-white/20 bg-[#151728] shadow-2xl flex flex-col gap-1 w-32">
                      <button
                        type="button"
                        onClick={() => { handleAdjustScore(currentTeam.id, 20); setShowCheatDropdown(false); }}
                        className="px-2 py-1 rounded bg-green-500/10 hover:bg-green-500/20 text-green-300 text-left font-mono text-[11px]"
                      >
                        +20 điểm
                      </button>
                      <button
                        type="button"
                        onClick={() => { handleAdjustScore(currentTeam.id, -20); setShowCheatDropdown(false); }}
                        className="px-2 py-1 rounded bg-red-500/10 hover:bg-red-500/20 text-red-300 text-left font-mono text-[11px]"
                      >
                        -20 điểm
                      </button>
                      <button
                        type="button"
                        onClick={() => { handleAdjustScore(currentTeam.id, undefined, 0); setShowCheatDropdown(false); }}
                        className="px-2 py-1 rounded bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-300 text-left font-mono text-[11px]"
                      >
                        Set 0 điểm
                      </button>
                      <button
                        type="button"
                        onClick={() => { handleAdjustScore(currentTeam.id, undefined, 50); setShowCheatDropdown(false); }}
                        className="px-2 py-1 rounded bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 text-left font-mono text-[11px]"
                      >
                        Set 50 điểm
                      </button>
                    </div>
                  )}
                </div>

                {/* Secret Wager quick bids if mode is WAGER */}
                {roomState?.mode === "WAGER" && (
                  <div className="w-full flex items-center gap-1 pt-1 border-t border-white/10 flex-wrap">
                    <span className="font-bold text-amber-300 text-[10px]">Cược nhanh:</span>
                    {[10, 15, 20, 25, 30].map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => handleForceActiveTeamWager(amt)}
                        className="px-1.5 py-0.5 rounded bg-amber-500/20 border border-amber-500/40 text-amber-300 hover:bg-amber-500/30 font-mono font-bold text-[9px]"
                      >
                        +{amt}đ
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Mobile Device Frame Mockup (Fills Remaining Height) */}
            <div className="flex-1 min-h-0 glass rounded-3xl border-2 border-purple-500/30 overflow-hidden shadow-2xl flex flex-col bg-[#0b0c16]">
              {/* Phone Speaker Notch */}
              <div className="bg-[#151728] px-3 py-1 border-b border-white/10 flex items-center justify-between text-[10px] text-slate-400 shrink-0">
                <span className="font-mono">9:41</span>
                <div className="w-10 h-1 rounded-full bg-white/20" />
                <span className="flex items-center gap-1 font-mono text-[9px]">
                  <span>5G</span>
                  <span>100%</span>
                </span>
              </div>

              {/* Player Viewport */}
              <div className="flex-1 min-h-0 bg-[#0f0f1a]">
                <iframe
                  ref={playerIframeRef}
                  src={`/play/${code}?sandbox=1`}
                  onLoad={() => {
                    if (isOfflineSandbox) {
                      syncToIframes();
                    }
                    const targetTeam = roomState?.teams[activeTeamIndex] || roomState?.teams[0];
                    if (targetTeam) {
                      playerIframeRef.current?.contentWindow?.postMessage(
                        {
                          type: "SWITCH_ACTIVE_TEAM",
                          teamId: targetTeam.id,
                          teamName: activeTeamIndex === 0 ? "Bạn (Tester)" : `${targetTeam.name} 🤖`,
                          teamIndex: activeTeamIndex,
                          payload: {
                            teamId: targetTeam.id,
                            teamName: activeTeamIndex === 0 ? "Bạn (Tester)" : `${targetTeam.name} 🤖`,
                            teamIndex: activeTeamIndex,
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

      {/* ── Game Mode Rules Modal ─────────────────────────────────────────── */}
      <GameModeRulesModal
        mode={roomState?.mode || selectedMode}
        isOpen={showRulesModal}
        onClose={() => setShowRulesModal(false)}
      />
    </div>
  );
}
