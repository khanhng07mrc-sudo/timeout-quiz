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
} from "@/types";
import { CARD_METADATA } from "@/types";
import Link from "next/link";
import GameModeRulesModal from "@/components/ui/GameModeRulesModal";
import GameModeIcon from "@/components/ui/GameModeIcon";
import { offlineStorage, DEFAULT_OFFLINE_BANK } from "@/lib/offline-storage";

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
  const [timer, setTimer] = useState<{ remaining: number; total: number } | null>(null);

  // Offline Sandbox Simulator State & Iframe Refs
  const [isOfflineSandbox, setIsOfflineSandbox] = useState(false);
  const displayIframeRef = useRef<HTMLIFrameElement | null>(null);
  const playerIframeRef = useRef<HTMLIFrameElement | null>(null);
  const offlineQuestionsRef = useRef<any[]>([]);
  const offlineQIndexRef = useRef<number>(-1);
  const offlineTimerRef = useRef<NodeJS.Timeout | null>(null);
  const offlineRemainingRef = useRef<number>(0);
  const offlineAnswersRef = useRef<Map<string, { answer: any; isCorrect: boolean; points: number }>>(new Map());

  // Active Team Switcher in Mobile Device Viewport
  const [activeTeamIndex, setActiveTeamIndex] = useState<number>(0);

  // Bot automation state
  const [botAutoEnabled, setBotAutoEnabled] = useState(true);
  const [botLogs, setBotLogs] = useState<string[]>([]);

  // Debug card grant modal
  const [showCardModal, setShowCardModal] = useState(false);
  const [grantCardType, setGrantCardType] = useState<CardType>("DOUBLE");
  const [grantTargetTeamId, setGrantTargetTeamId] = useState<string>("");

  // Rule modal
  const [showRulesModal, setShowRulesModal] = useState(false);
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
              timeLimit: payload?.timeLimit ?? prev.timeLimit,
            }
          : prev
      );
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

  const syncToIframes = useCallback((overrides?: Record<string, any>) => {
    const payload = {
      roomState,
      currentQuestion,
      timer,
      revealPayload,
      buzzed: null,
      lastPowerup: null,
      matchStarting: null,
      questionPrepare: null,
      ...overrides,
    };
    displayIframeRef.current?.contentWindow?.postMessage({ type: "OFFLINE_SYNC", payload }, "*");
    playerIframeRef.current?.contentWindow?.postMessage({ type: "OFFLINE_SYNC", payload }, "*");
  }, [roomState, currentQuestion, timer, revealPayload]);

  useEffect(() => {
    if (isOfflineSandbox) {
      syncToIframes();
    }
  }, [isOfflineSandbox, roomState, currentQuestion, timer, revealPayload, syncToIframes]);

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

    const teams = [
      { id: "t_red", name: "Đội Đỏ (Bạn)", color: "#ef4444", score: 0, isEliminated: false, frozenRounds: 0, shieldCount: 0, cards: [], playerCount: 1 },
      { id: "t_blue", name: "Đội Xanh 🤖", color: "#3b82f6", score: 0, isEliminated: false, frozenRounds: 0, shieldCount: 0, cards: [], playerCount: 1 },
      { id: "t_yellow", name: "Đội Vàng 🤖", color: "#eab308", score: 0, isEliminated: false, frozenRounds: 0, shieldCount: 0, cards: [], playerCount: 1 },
      { id: "t_purple", name: "Đội Tím 🤖", color: "#a855f7", score: 0, isEliminated: false, frozenRounds: 0, shieldCount: 0, cards: [], playerCount: 1 },
    ];

    const players = [
      { id: "p_you", name: "Bạn (Tester)", score: 0, teamId: "t_red", isHost: true, isOnline: true },
      { id: "bot_1", name: "Đội Xanh 🤖", score: 0, teamId: "t_blue", isHost: false, isOnline: true },
      { id: "bot_2", name: "Đội Vàng 🤖", score: 0, teamId: "t_yellow", isHost: false, isOnline: true },
      { id: "bot_3", name: "Đội Tím 🤖", score: 0, teamId: "t_purple", isHost: false, isOnline: true },
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
      const tiles = Array.from({ length: 30 }, (_, idx) => {
        const id = idx + 1;
        let type = "NORMAL";
        let label = `Ô ${id}`;
        if (id === 30) { type = "FINISH"; label = "Về đích"; }
        else if (id === 5) { type = "BOOST"; label = "Tăng tốc +2"; }
        else if (id === 8) { type = "EXTRA_ROLL"; label = "x2 Cơ hội"; }
        else if (id === 12) { type = "TRAP"; label = "Bẫy lùi 2"; }
        else if (id === 16) { type = "EXTRA_ROLL"; label = "x2 Cơ hội"; }
        else if (id === 20) { type = "SHIELD"; label = "Khiên bảo vệ"; }
        else if (id === 24) { type = "EXTRA_ROLL"; label = "x2 Cơ hội"; }
        else if (id === 27) { type = "SWAP"; label = "Đổi vị trí"; }
        return { id, position: id, type, label };
      });
      diceRaceState = {
        totalTiles: 30,
        tiles,
        teamPositions: {
          t_red: { teamId: "t_red", teamName: "Đội Đỏ (Bạn)", color: "#ef4444", position: 1, shields: 0, extraRollGranted: false, isFinished: false },
          t_blue: { teamId: "t_blue", teamName: "Đội Xanh 🤖", color: "#3b82f6", position: 1, shields: 0, extraRollGranted: false, isFinished: false },
          t_yellow: { teamId: "t_yellow", teamName: "Đội Vàng 🤖", color: "#eab308", position: 1, shields: 0, extraRollGranted: false, isFinished: false },
          t_purple: { teamId: "t_purple", teamName: "Đội Tím 🤖", color: "#a855f7", position: 1, shields: 0, extraRollGranted: false, isFinished: false },
        },
        currentTurnTeamId: "t_red",
        currentTurnTeamName: "Đội Đỏ (Bạn)",
        currentTurnIndex: 0,
        canRollDice: true,
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
        allowedPowerups: ["DOUBLE", "FIFTY_FIFTY", "SHIELD", "TIME_PLUS", "FREEZE", "ATTACK", "STEAL"],
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
      const { action, answer, points, cellId } = e.data;

      if (action === "answer") {
        if (!currentQuestion) return;
        const qData = currentQuestion.question;
        const opts = qData.options || [];
        const chosenOpt = opts.find((o: any) => o.id === answer || o.text === answer);
        const rawQ = offlineQuestionsRef.current[offlineQIndexRef.current] || qData;
        const correctOpt = rawQ.options?.find((o: any) => o.isCorrect);
        const isCorrect = correctOpt ? correctOpt.id === answer : false;
        const awarded = isCorrect ? (currentQuestion.question.points || 10) : 0;
        offlineAnswersRef.current.set("t_red", { answer, isCorrect, points: awarded });
        addLog(`[Bạn (Tester)] đã nộp đáp án: ${chosenOpt?.text || answer}`);
      } else if (action === "buzz") {
        setCurrentQuestion((prev) => prev ? { ...prev, buzzedTeamId: "t_red", buzzedTeamName: "Đội Đỏ (Bạn)" } : prev);
        addLog("⚡ [Bạn (Tester)] đã BẤM CHUÔNG thành công!");
        syncToIframes({ buzzed: { playerName: "Đội Đỏ (Bạn)" } });
      } else if (action === "bounceback_select_points") {
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
        addLog(`🎯 [Bạn (Tester)] đã chọn gói điểm: ${points}đ`);
      } else if (action === "grid_select") {
        addLog(`🏁 [Bạn (Tester)] đã chọn ô #${cellId}`);
      } else if (action === "dice_roll") {
        handleDiceRollManual();
      }
    };

    window.addEventListener("message", handlePlayerAction);
    return () => window.removeEventListener("message", handlePlayerAction);
  }, [isOfflineSandbox, currentQuestion, addLog, syncToIframes]);

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
  const handleAdminNext = () => {
    if (isOfflineSandbox) {
      if (offlineTimerRef.current) {
        clearInterval(offlineTimerRef.current);
        offlineTimerRef.current = null;
      }
      offlineAnswersRef.current.clear();

      const questions = offlineQuestionsRef.current;
      const nextIdx = (offlineQIndexRef.current + 1) % (questions.length || 1);
      offlineQIndexRef.current = nextIdx;
      const q = questions[nextIdx] || DEFAULT_OFFLINE_BANK.questions![0];

      const timeLimit = q.timeLimit || 20;
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
        activeBoosts: [],
        timerPending: false,
        timerStarted: true,
        buzzUnlocked: selectedMode === "BUZZ" ? false : true,
        buzzUnlockMode: "MANUAL",
        bouncebackSelectPhase: selectedMode === "BOUNCEBACK",
        primaryTeamId: selectedMode === "BOUNCEBACK" ? roomState?.teams[nextIdx % (roomState?.teams.length || 4)]?.id : undefined,
        primaryTeamName: selectedMode === "BOUNCEBACK" ? roomState?.teams[nextIdx % (roomState?.teams.length || 4)]?.name : undefined,
      };

      setCurrentQuestion(qState);
      setRevealPayload(null);
      setTimer({ remaining: timeLimit, total: timeLimit });
      offlineRemainingRef.current = timeLimit;

      setRoomState((prev) => prev ? { ...prev, status: "PLAYING", currentQuestionIndex: nextIdx } : prev);

      offlineTimerRef.current = setInterval(() => {
        offlineRemainingRef.current -= 1;
        const rem = offlineRemainingRef.current;
        setTimer({ remaining: rem, total: timeLimit });
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
      return;
    }

    adminSocketRef.current?.emit("admin:next");
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

      setRevealPayload(payload);

      setRoomState((prev) => {
        if (!prev) return prev;
        const updatedTeams = prev.teams.map((t) => {
          const delta = scoreDeltas.find((d) => d.teamId === t.id)?.delta || 0;
          return { ...t, score: t.score + delta };
        });
        return { ...prev, teams: updatedTeams };
      });

      addLog(`Admin: Đã công bố đáp án câu hỏi #${offlineQIndexRef.current + 1}`);
      return;
    }

    adminSocketRef.current?.emit("admin:reveal");
    addLog("Admin: Công bố đáp án");
  };

  const handleSkipTimerToOneSecond = () => {
    if (isOfflineSandbox) {
      offlineRemainingRef.current = 1;
      setTimer((prev) => prev ? { ...prev, remaining: 1 } : { remaining: 1, total: 30 });
      addLog("⚡ Admin tua nhanh: Đặt đếm ngược còn 1s!");
      return;
    }

    adminSocketRef.current?.emit("admin:timer:set", { seconds: 1 });
    addLog("⚡ Admin tua nhanh: Đặt đếm ngược còn 1s!");
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
      adminSocketRef.current?.emit("admin:resume");
      addLog("Admin: Tiếp tục trận đấu");
    } else {
      adminSocketRef.current?.emit("admin:pause");
      addLog("Admin: Tạm dừng trận đấu");
    }
  };

  const handleStartTimer = () => {
    if (isOfflineSandbox) {
      if (!currentQuestion) return;
      const timeLimit = currentQuestion.timeLimit || 20;
      setCurrentQuestion((prev) => prev ? { ...prev, timerPending: false, timerStarted: true } : prev);
      offlineRemainingRef.current = timeLimit;
      setTimer({ remaining: timeLimit, total: timeLimit });

      if (offlineTimerRef.current) clearInterval(offlineTimerRef.current);
      offlineTimerRef.current = setInterval(() => {
        offlineRemainingRef.current -= 1;
        const rem = offlineRemainingRef.current;
        setTimer({ remaining: rem, total: timeLimit });
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
    if (isOfflineSandbox) {
      const roll = Math.floor(Math.random() * 6) + 1;
      setRoomState((prev) => {
        if (!prev || !prev.diceRaceState) return prev;
        const curTurnId = prev.diceRaceState.currentTurnTeamId;
        if (!curTurnId) return prev;
        const curPos = prev.diceRaceState.teamPositions[curTurnId]?.position || 1;
        const nextPos = Math.min(30, curPos + roll);
        const tile = prev.diceRaceState.tiles.find((t: any) => t.position === nextPos);
        const isExtra = tile?.type === "EXTRA_ROLL";
        const isBoost = tile?.type === "BOOST";
        const finalPos = isBoost ? Math.min(30, nextPos + 2) : nextPos;

        const updatedPositions = {
          ...prev.diceRaceState.teamPositions,
          [curTurnId]: {
            ...prev.diceRaceState.teamPositions[curTurnId],
            position: finalPos,
            extraRollGranted: isExtra,
          },
        };

        const teamIds = Object.keys(updatedPositions);
        const curIdx = teamIds.indexOf(curTurnId);
        const nextTeamId = isExtra ? curTurnId : teamIds[(curIdx + 1) % teamIds.length];
        const nextTeamName = prev.teams.find((t) => t.id === nextTeamId)?.name;

        addLog(`🎲 Đội [${prev.diceRaceState.currentTurnTeamName}] đã gieo xúc xắc: ${roll} điểm! Đến ô #${finalPos} (${tile?.label || "Bình thường"})${isExtra ? " - Nhận thêm lượt đổ x2 Cơ hội!" : ""}`);

        return {
          ...prev,
          diceRaceState: {
            ...prev.diceRaceState,
            lastDiceRoll: roll,
            teamPositions: updatedPositions,
            currentTurnTeamId: nextTeamId,
            currentTurnTeamName: nextTeamName,
          },
        };
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

  const handleGrantCard = async () => {
    if (!roomState || !grantTargetTeamId) return;
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
    <div className="space-y-4">
      {/* ── Top Header Controls ─────────────────────────────────────── */}
      <div className="glass rounded-2xl p-4 border border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-cyan-500 flex items-center justify-center text-xl shadow glow-purple shrink-0">
            🧪
          </div>
          <div>
            <h1 className="text-xl font-black text-white flex items-center gap-2 flex-wrap">
              <span>Sandbox Studio Hợp Nhất</span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 whitespace-nowrap">
                1 Người Điều Khiển
              </span>
              {isOfflineSandbox && (
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold whitespace-nowrap animate-pulse">
                  ⚡ Ngoại tuyến (Offline Mode)
                </span>
              )}
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Màn chiếu hội trường trực quan bên trái · Thiết bị thí sinh linh hoạt chuyển đổi bên phải
            </p>
          </div>
        </div>

        {/* Room Launch or Connected Status */}
        <div className="flex items-center gap-2 flex-wrap justify-start md:justify-end">
          {!code ? (
            <div className="flex items-center gap-2 flex-wrap">
              <select
                value={selectedMode}
                onChange={(e) => setSelectedMode(e.target.value as GameMode)}
                className="px-3 py-2 rounded-xl glass border border-white/20 text-xs font-bold text-white bg-[#151728] focus:outline-none"
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
                className="px-3 py-2 rounded-xl glass border border-white/20 text-xs font-medium text-white bg-[#151728] focus:outline-none min-w-[180px] max-w-[260px] truncate"
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

              <button
                type="button"
                disabled={creating}
                onClick={handleLaunchSandbox}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white font-bold text-xs shadow-lg transition active:scale-95 disabled:opacity-50 flex items-center gap-1.5 whitespace-nowrap"
              >
                <span>⚡</span>
                <span>{creating ? "Đang tạo..." : "Khởi chạy Sandbox"}</span>
              </button>

              <button
                type="button"
                onClick={() => startOfflineSandbox(selectedMode, selectedBankId)}
                className="px-3 py-2 rounded-xl glass hover:bg-amber-500/20 border border-amber-500/40 text-amber-300 font-bold text-xs shadow transition active:scale-95 flex items-center gap-1 whitespace-nowrap"
                title="Chạy mô phỏng trực tiếp trên trình duyệt, không cần máy chủ mạng"
              >
                <span>🔌</span>
                <span>Chạy Offline</span>
              </button>

              <div className="text-muted-foreground text-xs px-1">hoặc</div>

              <form onSubmit={handleConnectExisting} className="flex items-center gap-1">
                <input
                  type="text"
                  placeholder="Mã PIN 6 số"
                  value={inputCode}
                  onChange={(e) => setInputCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  className="w-24 px-2.5 py-2 rounded-xl glass border border-white/20 text-center font-mono font-bold text-xs text-white bg-[#151728]"
                />
                <button
                  type="submit"
                  disabled={inputCode.length !== 6}
                  className="px-3 py-2 rounded-xl glass hover:bg-white/10 text-white font-bold text-xs border border-white/20 disabled:opacity-40 whitespace-nowrap"
                >
                  Gắn PIN
                </button>
              </form>
            </div>
          ) : (
            <div className="flex items-center gap-2 flex-wrap">
              <div className="px-3 py-1.5 rounded-xl glass border border-purple-500/40 text-xs flex items-center gap-2 shrink-0">
                <span className="text-muted-foreground">Phòng:</span>
                <span className="font-mono font-black text-cyan-300 text-sm">{code}</span>
                <span className="text-purple-300 font-bold inline-flex items-center gap-1">
                  <GameModeIcon mode={roomState?.mode || "CLASSIC"} className="w-3.5 h-3.5" />
                  [{roomState?.mode}]
                </span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  roomState?.status === "PLAYING" ? "bg-green-500/20 text-green-300" : "bg-yellow-500/20 text-yellow-300"
                }`}>
                  {roomState?.status}
                </span>
              </div>

              {/* Bot Auto Toggle */}
              <button
                type="button"
                onClick={() => setBotAutoEnabled(!botAutoEnabled)}
                className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition flex items-center gap-1.5 shrink-0 ${
                  botAutoEnabled
                    ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-300 shadow-md"
                    : "glass border-white/10 text-muted-foreground hover:text-white"
                }`}
              >
                <span>🤖</span>
                <span className="whitespace-nowrap">Bot: {botAutoEnabled ? "BẬT" : "TẮT"}</span>
              </button>

              {/* Tools Group */}
              <div className="flex items-center gap-1.5 p-0.5 rounded-xl glass border border-white/10 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowRulesModal(true)}
                  className="px-2.5 py-1 rounded-lg hover:bg-white/10 text-cyan-300 text-xs font-bold transition flex items-center gap-1 whitespace-nowrap"
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
                    setShowCardModal(true);
                  }}
                  className="px-2.5 py-1 rounded-lg hover:bg-white/10 text-purple-300 text-xs font-bold transition flex items-center gap-1 whitespace-nowrap"
                >
                  <span>🃏</span>
                  <span>Cấp thẻ</span>
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
                className="px-2.5 py-1.5 rounded-xl glass hover:bg-red-500/20 text-red-400 text-xs font-bold transition shrink-0 whitespace-nowrap"
              >
                ✕ Đổi phòng
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Studio Main Area ────────────────────────────────────── */}
      {!code ? (
        <div className="glass rounded-3xl p-12 text-center border border-white/10 space-y-6 max-w-2xl mx-auto my-12">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-cyan-500 flex items-center justify-center text-4xl mx-auto shadow-2xl glow-purple">
            🧪
          </div>
          <div className="space-y-2">
            <h2 className="text-3xl font-black text-white">Chào mừng tới Studio Hợp Nhất!</h2>
            <p className="text-sm text-slate-400 max-w-md mx-auto leading-relaxed">
              Môi trường kiểm thử gọn gàng, liền mạch: Màn hình lớn Display bên trái và 1 thiết bị di động thí sinh bên phải với thanh chuyển đổi 4 đội tức thì.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center max-w-lg mx-auto pt-2 text-left">
            <div className="flex-1">
              <label className="block text-[11px] font-bold text-slate-400 mb-1">🎮 Chế độ chơi (8 Mode)</label>
              <select
                value={selectedMode}
                onChange={(e) => setSelectedMode(e.target.value as GameMode)}
                className="w-full px-3 py-2.5 rounded-xl glass border border-white/20 text-xs font-bold text-white bg-[#151728] focus:outline-none"
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
                className="w-full px-3 py-2.5 rounded-xl glass border border-white/20 text-xs font-medium text-white bg-[#151728] focus:outline-none truncate"
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

          <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center">
            <button
              type="button"
              disabled={creating}
              onClick={handleLaunchSandbox}
              className="px-8 py-3.5 rounded-2xl bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white font-bold text-sm shadow-xl transition hover:scale-105 active:scale-95 disabled:opacity-50 whitespace-nowrap"
            >
              {creating ? "Đang chuẩn bị phòng..." : `⚡ Khởi chạy Sandbox: ${selectedMode}`}
            </button>
            <button
              type="button"
              onClick={() => startOfflineSandbox(selectedMode, selectedBankId)}
              className="px-6 py-3.5 rounded-2xl glass hover:bg-amber-500/20 border border-amber-500/40 text-amber-300 font-bold text-sm shadow-xl transition hover:scale-105 active:scale-95 whitespace-nowrap flex items-center justify-center gap-2"
            >
              <span>🔌</span>
              <span>Chạy Offline (Không cần mạng)</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
          {/* ══════════════════════════════════════════════════════════════════
              LEFT COLUMN (7 cols ~58%): Large Display + Host Master Controls
             ══════════════════════════════════════════════════════════════════ */}
          <div className="lg:col-span-7 flex flex-col gap-3">
            {/* Host Action Bar (Live Triggers) */}
            <div className="glass rounded-2xl p-2.5 border border-white/10 bg-[#121424] flex flex-wrap items-center gap-2 shadow-lg">
              {/* Host MC Tag */}
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-purple-950/60 border border-purple-500/30 shrink-0">
                <span className="text-xs font-black text-purple-300 flex items-center gap-1">
                  <span>🎛️</span>
                  <span>MC:</span>
                </span>
              </div>

              {/* Group 1: Core Flow */}
              <div className="flex items-center gap-1 p-1 rounded-xl glass border border-white/10 shrink-0 flex-wrap">
                {/* Next Question / Start */}
                {roomState?.mode === "GRID_CARO" && roomState?.status === "PLAYING" && !currentQuestion ? null : (
                  <button
                    type="button"
                    onClick={handleAdminNext}
                    className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-black shadow transition active:scale-95 flex items-center gap-1 whitespace-nowrap"
                  >
                    <span>{roomState?.status === "LOBBY" ? "🚀 Bắt đầu" : "⏩ Câu kế"}</span>
                  </button>
                )}

                {/* Reveal */}
                <button
                  type="button"
                  onClick={handleAdminReveal}
                  className="px-3 py-1.5 rounded-lg glass hover:bg-white/10 border border-white/20 text-amber-300 text-xs font-bold transition flex items-center gap-1 whitespace-nowrap"
                >
                  <span>👁️</span>
                  <span>Công bố</span>
                </button>

                {/* Start Timer if pending */}
                {currentQuestion?.timerPending && (
                  <button
                    type="button"
                    onClick={handleStartTimer}
                    className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-green-500 hover:from-amber-400 text-black text-xs font-black shadow animate-pulse flex items-center gap-1 whitespace-nowrap"
                  >
                    <span>⏱️</span>
                    <span>Bắt đầu đếm giờ</span>
                  </button>
                )}
              </div>

              {/* Group 2: Mode Controls */}
              {(roomState?.mode === "BUZZ" || roomState?.mode === "BOUNCEBACK" || roomState?.mode === "GRID_CARO" || roomState?.mode === "DICE_RACE") && (
                <div className="flex items-center gap-1.5 p-1 rounded-xl glass border border-cyan-500/20 bg-cyan-950/20 shrink-0 flex-wrap">
                  {/* BUZZ Mode Controls */}
                  {roomState?.mode === "BUZZ" && currentQuestion && (
                    <>
                      {!currentQuestion.buzzUnlocked && (
                        <button
                          type="button"
                          onClick={handleBuzzUnlock}
                          className="px-3 py-1.5 rounded-lg bg-yellow-500 hover:bg-yellow-400 text-black text-xs font-black shadow animate-pulse flex items-center gap-1 whitespace-nowrap"
                        >
                          <span>🔔</span>
                          <span>Mở chuông</span>
                        </button>
                      )}
                      {currentQuestion.buzzedTeamId && (
                        <button
                          type="button"
                          onClick={handleBuzzStartAnswer}
                          className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-black shadow flex items-center gap-1 whitespace-nowrap"
                        >
                          <span>🎙️</span>
                          <span>Cho trả lời 15s</span>
                        </button>
                      )}
                    </>
                  )}

                  {/* BOUNCEBACK Mode Controls */}
                  {roomState?.mode === "BOUNCEBACK" && currentQuestion && (
                    <>
                      {currentQuestion.bouncebackSelectPhase && (
                        <div className="flex items-center gap-1 bg-blue-500/20 border border-blue-500/40 p-0.5 rounded-lg">
                          <span className="text-[10px] font-bold text-blue-300 ml-1">Gói:</span>
                          {([10, 20, 30] as const).map((pts) => (
                            <button
                              key={pts}
                              type="button"
                              onClick={() => handleAdminBouncebackSelectPoints(pts)}
                              className="px-2 py-0.5 rounded bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-black shadow transition active:scale-95 cursor-pointer"
                            >
                              {pts}đ
                            </button>
                          ))}
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={handleBouncebackOpenSteal}
                        className="px-2.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black text-xs font-black shadow flex items-center gap-1 whitespace-nowrap"
                      >
                        <span>🔔</span>
                        <span>Mở cướp 5s</span>
                      </button>
                      {currentQuestion.stealBuzzedTeamId && (
                        <button
                          type="button"
                          onClick={handleBouncebackStartStealAnswer}
                          className="px-2.5 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-black shadow flex items-center gap-1 whitespace-nowrap"
                        >
                          <span>🎙️</span>
                          <span>Cho cướp 15s</span>
                        </button>
                      )}
                    </>
                  )}

                  {/* GRID_CARO Controls */}
                  {roomState?.mode === "GRID_CARO" && (
                    <>
                      {!currentQuestion && roomState.gridCaroState?.selectedCellId && (
                        <button
                          type="button"
                          onClick={handleGridLaunchQuestion}
                          className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-purple-600 to-cyan-600 text-white text-xs font-black shadow animate-pulse flex items-center gap-1 whitespace-nowrap"
                        >
                          <span>📖</span>
                          <span>Hiện câu (#{roomState.gridCaroState.selectedCellId})</span>
                        </button>
                      )}
                      {!currentQuestion && !roomState.gridCaroState?.previewActive && !roomState.gridCaroState?.selectedCellId && (
                        <button
                          type="button"
                          onClick={handleGridPreviewStart}
                          className="px-2.5 py-1.5 rounded-lg glass hover:bg-white/10 border border-purple-500/40 text-purple-300 text-xs font-bold transition flex items-center gap-1 whitespace-nowrap"
                        >
                          <span>👁️</span>
                          <span>Xem độ khó (5s)</span>
                        </button>
                      )}
                      {!currentQuestion && roomState.gridCaroState?.previewActive && (
                        <button
                          type="button"
                          onClick={handleGridPreviewStop}
                          className="px-2.5 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition flex items-center gap-1 whitespace-nowrap"
                        >
                          <span>🙈</span>
                          <span>Lật úp ngay</span>
                        </button>
                      )}
                      {revealPayload && (
                        <button
                          type="button"
                          onClick={handleGridAdvanceNow}
                          className="px-2.5 py-1.5 rounded-lg bg-gradient-to-r from-purple-600 to-cyan-600 text-white text-xs font-black shadow flex items-center gap-1 whitespace-nowrap"
                        >
                          <span>🏁</span>
                          <span>Về bảng ô</span>
                        </button>
                      )}
                    </>
                  )}

                  {/* DICE_RACE Controls */}
                  {roomState?.mode === "DICE_RACE" && roomState.diceRaceState?.canRollDice && (
                    <button
                      type="button"
                      onClick={handleDiceRollManual}
                      className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-pink-500 to-amber-500 text-black text-xs font-black shadow animate-pulse flex items-center gap-1 whitespace-nowrap"
                    >
                      <span>🎲</span>
                      <span>Tung xúc xắc ngay</span>
                    </button>
                  )}
                </div>
              )}

              {/* Group 3: Utility Controls */}
              <div className="flex items-center gap-1 p-1 rounded-xl glass border border-white/10 shrink-0 ml-auto">
                {/* Tua nhanh 1s */}
                <button
                  type="button"
                  onClick={handleSkipTimerToOneSecond}
                  title="Giảm thời gian đếm ngược còn 1s"
                  className="px-2.5 py-1.5 rounded-lg glass hover:bg-white/10 border border-white/20 text-yellow-300 text-xs font-bold transition flex items-center gap-1 whitespace-nowrap"
                >
                  <span>⚡</span>
                  <span>Tua 1s</span>
                </button>

                {/* Pause/Resume */}
                <button
                  type="button"
                  onClick={handlePauseResume}
                  className="px-2.5 py-1.5 rounded-lg glass hover:bg-white/10 border border-white/20 text-slate-300 text-xs font-bold transition whitespace-nowrap"
                >
                  {roomState?.status === "PAUSED" ? "▶️ Tiếp" : "⏸️ Tạm dừng"}
                </button>
              </div>
            </div>

            {/* Display Iframe Viewport */}
            <div className="glass rounded-2xl border border-white/10 overflow-hidden flex flex-col shadow-2xl h-[70vh]">
              <div className="bg-[#151728] px-4 py-2 border-b border-white/10 flex items-center justify-between text-xs font-bold text-slate-300">
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
              <div className="flex-1 bg-black">
                <iframe
                  ref={displayIframeRef}
                  src={`/display/${code}`}
                  title="Display Preview"
                  className="w-full h-full border-0"
                />
              </div>
            </div>

            {/* Live Bot Event Logs */}
            <div className="glass rounded-2xl p-3 border border-white/10 text-xs bg-[#121424]">
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-bold text-slate-300 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                  <span>Nhật ký sự kiện Bot ảo:</span>
                </span>
                <span className="text-[10px] text-muted-foreground font-mono">
                  {botLogs.length} events
                </span>
              </div>
              <div className="max-h-20 overflow-y-auto space-y-1 font-mono text-[11px] text-slate-400 pr-1">
                {botLogs.map((log, i) => (
                  <div key={i} className="truncate">{log}</div>
                ))}
              </div>
            </div>
          </div>

          {/* ══════════════════════════════════════════════════════════════════
              RIGHT COLUMN (5 cols ~42%): Unified Mobile Device + Team Switcher
             ══════════════════════════════════════════════════════════════════ */}
          <div className="lg:col-span-5 flex flex-col gap-3">
            {/* Team Switcher Tabs */}
            <div className="glass rounded-2xl p-2 border border-white/10 bg-[#121424]">
              <div className="text-[11px] font-bold text-slate-400 mb-1.5 px-1 flex items-center justify-between">
                <span>📱 Chọn Đội để hiển thị trên màn hình điện thoại:</span>
                <span className="text-cyan-400 font-mono">
                  Đang xem: {currentTeam?.name || "Đội 1"}
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                {(roomState?.teams || []).map((t, idx) => {
                  const isActive = activeTeamIndex === idx;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setActiveTeamIndex(idx)}
                      className={`p-2 rounded-xl text-left border transition flex flex-col gap-0.5 ${
                        isActive
                          ? "bg-purple-600/30 border-purple-500 shadow-lg ring-2 ring-purple-400/50"
                          : "glass border-white/10 hover:border-white/30 text-slate-300"
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: t.color }} />
                        <span className="font-bold text-xs truncate text-white">{t.name}</span>
                      </div>
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="text-slate-400">
                          {idx === 0 ? "Bạn (Tester)" : "Bot"}
                        </span>
                        <span className="font-mono font-bold text-cyan-300">
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
              <div className="glass rounded-2xl p-2.5 border border-white/10 bg-[#151728] space-y-2 text-xs">
                {/* Answer simulation */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="font-bold text-slate-400 text-[11px]">Hành động nhanh:</span>
                  <button
                    type="button"
                    onClick={() => handleForceActiveTeamAnswer(true)}
                    className="px-2.5 py-1 rounded-lg bg-green-500/20 border border-green-500/40 text-green-300 hover:bg-green-500/30 font-bold transition text-[11px]"
                  >
                    ✓ Chọn ĐÚNG
                  </button>
                  <button
                    type="button"
                    onClick={() => handleForceActiveTeamAnswer(false)}
                    className="px-2.5 py-1 rounded-lg bg-red-500/20 border border-red-500/40 text-red-300 hover:bg-red-500/30 font-bold transition text-[11px]"
                  >
                    ✗ Chọn SAI
                  </button>
                  <button
                    type="button"
                    onClick={handleForceActiveTeamBuzz}
                    className="px-2.5 py-1 rounded-lg bg-yellow-500/20 border border-yellow-500/40 text-yellow-300 hover:bg-yellow-500/30 font-bold transition text-[11px]"
                  >
                    ⚡ Bấm Buzz
                  </button>
                </div>

                {/* Secret Wager quick bids (multiples of 5) */}
                {roomState?.mode === "WAGER" && (
                  <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-white/10">
                    <span className="font-bold text-amber-300 text-[11px]">Cược nhanh (chia hết 5):</span>
                    {[10, 15, 20, 25, 30].map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => handleForceActiveTeamWager(amt)}
                        className="px-2 py-0.5 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-300 hover:bg-amber-500/30 font-mono font-bold text-[10px]"
                      >
                        +{amt}đ
                      </button>
                    ))}
                  </div>
                )}

                {/* Score Cheat Controls */}
                <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-white/10">
                  <span className="font-bold text-slate-400 text-[11px]">Cheat điểm [{currentTeam.name}]:</span>
                  <button
                    type="button"
                    onClick={() => handleAdjustScore(currentTeam.id, 20)}
                    className="px-2 py-0.5 rounded-lg bg-green-500/10 border border-green-500/30 text-green-300 hover:bg-green-500/20 font-mono text-[10px]"
                  >
                    +20đ
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAdjustScore(currentTeam.id, -20)}
                    className="px-2 py-0.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 hover:bg-red-500/20 font-mono text-[10px]"
                  >
                    -20đ
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAdjustScore(currentTeam.id, undefined, 0)}
                    title="Đặt 0đ để kiểm thử cứu trợ WAGER / âm điểm"
                    className="px-2 py-0.5 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-yellow-300 hover:bg-yellow-500/20 font-mono text-[10px]"
                  >
                    Set 0đ
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAdjustScore(currentTeam.id, undefined, 50)}
                    className="px-2 py-0.5 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/20 font-mono text-[10px]"
                  >
                    Set 50đ
                  </button>
                </div>
              </div>
            )}

            {/* Mobile Device Frame Mockup */}
            <div className="glass rounded-3xl border-2 border-purple-500/30 overflow-hidden shadow-2xl flex flex-col h-[60vh] bg-[#0b0c16]">
              {/* Phone Speaker Notch */}
              <div className="bg-[#151728] px-4 py-1.5 border-b border-white/10 flex items-center justify-between text-[11px] text-slate-400">
                <span className="font-mono">9:41</span>
                <div className="w-12 h-1.5 rounded-full bg-white/20" />
                <span className="flex items-center gap-1 font-mono text-[10px]">
                  <span>5G</span>
                  <span>100%</span>
                </span>
              </div>

              {/* Player Viewport */}
              <div className="flex-1 bg-[#0f0f1a]">
                <iframe
                  ref={playerIframeRef}
                  key={`${code}-${activeTeamIndex}-${currentTeam?.id}`}
                  src={`/play/${code}?sandbox=1&teamIndex=${activeTeamIndex}&teamId=${currentTeam?.id || ""}&name=${encodeURIComponent(activeTeamIndex === 0 ? "Bạn (Tester)" : `${currentTeam?.name || "Đội"} 🤖`)}`}
                  title={`Player ${currentTeam?.name || activeTeamIndex + 1}`}
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
            className="w-full max-w-md glass rounded-3xl border border-white/20 p-6 flex flex-col gap-5 shadow-2xl bg-[#121324]/95 text-white"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-lg font-black flex items-center gap-2">
                <span>🃏</span>
                <span>Cấp thẻ hỗ trợ cho Đội (Debug Card)</span>
              </h3>
              <button
                onClick={() => setShowCardModal(false)}
                className="w-8 h-8 rounded-xl glass hover:bg-white/10 flex items-center justify-center text-muted-foreground hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block text-muted-foreground font-bold mb-1.5">Chọn Đội nhận thẻ:</label>
                <select
                  value={grantTargetTeamId}
                  onChange={(e) => setGrantTargetTeamId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl glass border border-white/20 text-white bg-[#151728] focus:outline-none"
                >
                  {(roomState?.teams || []).map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} (Điểm: {t.score})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-muted-foreground font-bold mb-1.5">Chọn loại thẻ Power-up:</label>
                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                  {(Object.keys(CARD_METADATA) as CardType[]).map((cType) => {
                    const meta = CARD_METADATA[cType];
                    const active = grantCardType === cType;
                    return (
                      <button
                        key={cType}
                        type="button"
                        onClick={() => setGrantCardType(cType)}
                        className={`p-2.5 rounded-xl border text-left flex items-center gap-2 transition ${
                          active
                            ? "bg-purple-600/30 border-purple-500 text-white font-bold"
                            : "glass border-white/10 text-slate-300 hover:text-white hover:bg-white/5"
                        }`}
                      >
                        <span className="text-xl">{meta.emoji}</span>
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-[11px]">{meta.nameVi}</p>
                          <p className="text-[10px] text-muted-foreground truncate">{meta.summaryVi}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={handleGrantCard}
                className="flex-1 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition"
              >
                Xác nhận cấp thẻ ngay
              </button>
              <button
                type="button"
                onClick={() => setShowCardModal(false)}
                className="px-4 py-2.5 rounded-xl glass hover:bg-white/10 text-slate-300 font-bold text-xs transition"
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
