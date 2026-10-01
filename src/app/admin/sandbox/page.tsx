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
import { CARD_METADATA, MODE_RULES } from "@/types";
import Link from "next/link";
import GameModeRulesModal from "@/components/ui/GameModeRulesModal";
import GameModeIcon from "@/components/ui/GameModeIcon";

const AVAILABLE_MODES: { mode: GameMode; name: string; emoji: string }[] = [
  { mode: "CLASSIC", name: "Truyền thống", emoji: "⚡" },
  { mode: "BUZZ", name: "Bấm chuông nhanh", emoji: "🛎️" },
  { mode: "POWERUP", name: "Đấu trí thẻ bài", emoji: "🃏" },
  { mode: "BOUNCEBACK", name: "Cướp điểm luân phiên", emoji: "🔄" },
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

  // Layout mode
  const [layoutMode, setLayoutMode] = useState<"SPLIT" | "MULTI" | "HOST_DISPLAY">("SPLIT");

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

  // Fetch quiz banks on mount
  useEffect(() => {
    fetch("/api/quiz-bank?ownerId=demo-host-id")
      .then((res) => res.json())
      .then((data) => {
        const banksList = data.banks || data.quizBanks || [];
        if (Array.isArray(banksList) && banksList.length > 0) {
          setQuizBanks(banksList);
          setSelectedBankId(banksList[0].id);
        } else {
          // If no banks with ownerId, try fetching public banks
          fetch("/api/quiz-bank")
            .then((res2) => res2.json())
            .then((data2) => {
              const fallbackList = data2.banks || data2.quizBanks || [];
              if (Array.isArray(fallbackList) && fallbackList.length > 0) {
                setQuizBanks(fallbackList);
                setSelectedBankId(fallbackList[0].id);
              }
            })
            .catch(() => {});
        }
      })
      .catch(console.error);
  }, []);

  // ── Bot Socket Manager ──────────────────────────────────────────────────────
  const initBotSockets = useCallback((roomCode: string, teams: { id: string; name: string }[]) => {
    // Disconnect old bot sockets
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
              addLog(`Bot [${team.name}] đã kết nối thành công vào phòng`);
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
          return; // It's another team's turn, do not spam answers!
        }

        // Human-like thinking delay: 2000ms - 4000ms
        const delay = 2000 + Math.random() * 2000;
        setTimeout(() => {
          // Pick an option
          const chosenOpt = opts[Math.floor(Math.random() * opts.length)];
          sock.emit("game:answer:submit", {
            questionId: qData.id,
            answer: chosenOpt.id,
          });
          addLog(`Bot [${team.name}] đã nộp đáp án: ${chosenOpt.text}`);
        }, delay);
      };

      // Handle question event for Bot auto-play
      sock.on("game:question", (q) => {
        if (q.timerPending) {
          pendingBotAnswerQ = q;
          return;
        }
        triggerBotAnswer(q);
      });

      sock.on("game:timer:started", () => {
        if (pendingBotAnswerQ) {
          const q = pendingBotAnswerQ;
          pendingBotAnswerQ = null;
          triggerBotAnswer(q);
        }
      });

      // Handle Buzz mode
      sock.on("game:prepare", () => {
        // Prepare to buzz if buzz mode
      });

      // Handle Bounceback open steal buzz
      sock.on("game:bounceback:open_steal", (payload) => {
        if (!botAutoEnabled) return;
        // 50% chance to buzz steal
        if (Math.random() > 0.4) {
          const delay = 1000 + Math.random() * 2000;
          setTimeout(() => {
            sock.emit("game:buzz");
            addLog(`Bot [${team.name}] bấm chuông CƯỚP LƯỢT!`);
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
      addLog(`⏱️ Bắt đầu tính thời gian: ${payload?.timeLimit ?? 30}s`);
    });
    sock.on("game:timer", (t) => setTimer(t));
    sock.on("game:grid:update", (grid) => {
      setRoomState((prev) => prev ? { ...prev, gridCaroState: grid } : prev);
      
      // If cell is already selected or preview is active, clear any pending auto-selection
      if (grid.selectedCellId || grid.previewActive) {
        if (pendingBotGridTimerRef.current) {
          clearTimeout(pendingBotGridTimerRef.current);
          pendingBotGridTimerRef.current = null;
        }
        return;
      }

      // If current turn is a bot and auto-play is on, and NO cell is currently selected:
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
      if (dice.dicePendingAnswer || dice.isRolling) {
        if (pendingBotDiceTimerRef.current) {
          clearTimeout(pendingBotDiceTimerRef.current);
          pendingBotDiceTimerRef.current = null;
        }
        return;
      }
      // If current turn is a bot and waiting to roll, auto roll
      if (botAutoEnabled && dice.currentTurnTeamId && !dice.dicePendingAnswer && !dice.isRolling) {
        if (pendingBotDiceTimerRef.current) {
          clearTimeout(pendingBotDiceTimerRef.current);
        }
        const botSock = botSocketsRef.current.get(dice.currentTurnTeamId);
        if (botSock) {
          pendingBotDiceTimerRef.current = setTimeout(() => {
            botSock.emit("game:dice:roll");
            addLog(`Bot [${dice.currentTurnTeamName}] đã đổ xúc xắc!`);
            pendingBotDiceTimerRef.current = null;
          }, 2000);
        }
      }
    });

    sock.on("game:wager:update", (wager) => {
      setRoomState((prev) => prev ? { ...prev, wagerState: wager } : prev);
      if (botAutoEnabled && wager.phase === "WAGER_PERIOD") {
        botSocketsRef.current.forEach((bSock, tId) => {
          setTimeout(() => {
            const bet = Math.floor(20 + Math.random() * 40);
            bSock.emit("game:wager:submit", { amount: bet });
            addLog(`Bot đã cược ${bet} điểm`);
          }, 1500 + Math.random() * 1500);
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
      addLog(`Chuyển về bảng điều khiển / đường đua`);
    });

    sock.on("game:ended", () => {
      addLog(`Trận đấu kết thúc!`);
    });
  }, [botAutoEnabled, initBotSockets, addLog]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (adminSocketRef.current) adminSocketRef.current.disconnect();
      botSocketsRef.current.forEach((s) => s.disconnect());
    };
  }, []);

  // ── 1-Click Launch ──────────────────────────────────────────────────────────
  const handleLaunchSandbox = async () => {
    setCreating(true);
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
        connectAdminSocket(data.code);
        addLog(`Đã khởi tạo Sandbox thành công: Phòng ${data.code} (${data.mode})`);
      } else {
        alert(data.error || "Không thể tạo phòng Sandbox");
      }
    } catch {
      alert("Lỗi kết nối khi khởi tạo phòng");
    } finally {
      setCreating(false);
    }
  };

  const handleConnectExisting = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputCode.trim().length === 6) {
      setCode(inputCode.trim());
      connectAdminSocket(inputCode.trim());
    }
  };

  // ── Fast-forward Actions ──────────────────────────────────────────────────
  const handleAdminNext = () => {
    adminSocketRef.current?.emit("admin:next");
    addLog("Admin bấm: Next / Bắt đầu câu hỏi");
  };

  const handleAdminReveal = () => {
    adminSocketRef.current?.emit("admin:reveal");
    addLog("Admin bấm: Công bố đáp án");
  };

  const handleSkipTimerToOneSecond = () => {
    adminSocketRef.current?.emit("admin:timer:set", { seconds: 1 });
    addLog("⚡ Admin tua nhanh: Đặt đếm ngược còn 1s!");
  };

  const handlePauseResume = () => {
    if (roomState?.status === "PAUSED") {
      adminSocketRef.current?.emit("admin:resume");
      addLog("Admin bấm: Tiếp tục trận đấu");
    } else {
      adminSocketRef.current?.emit("admin:pause");
      addLog("Admin bấm: Tạm dừng trận đấu");
    }
  };

  const handleStartTimer = () => {
    adminSocketRef.current?.emit("admin:question:start_timer");
    addLog("Admin bấm: Bắt đầu tính giờ");
  };

  const handleGridAdvanceNow = () => {
    adminSocketRef.current?.emit("admin:grid:advance_now");
    addLog("Admin bấm: Quay về bảng ô");
  };

  const handleGridLaunchQuestion = () => {
    adminSocketRef.current?.emit("admin:grid:launch_question");
    addLog("Admin bấm: Hiện câu hỏi cho ô đang chọn");
  };

  const handleGridPreviewStart = () => {
    adminSocketRef.current?.emit("admin:grid:preview:start");
    addLog("Admin bấm: Xem lại độ khó (5s)");
  };

  const handleGridPreviewStop = () => {
    adminSocketRef.current?.emit("admin:grid:preview:stop");
    addLog("Admin bấm: Dừng xem độ khó");
  };

  // ── Bot Manual Trigger Actions ──────────────────────────────────────────────
  const handleForceAllBotsAnswer = (correct: boolean) => {
    if (!currentQuestion) return;
    const opts = currentQuestion.question.options || [];
    if (opts.length === 0) return;

    botSocketsRef.current.forEach((sock, teamId) => {
      const opt = correct ? opts[0] : opts[opts.length - 1];
      sock.emit("game:answer:submit", {
        questionId: currentQuestion.question.id,
        answer: opt.id,
      });
    });
    addLog(`Đã ép tất cả Bot nộp đáp án: ${correct ? "ĐÚNG" : "SAI"}`);
  };

  const handleForceBotBuzz = (teamId: string) => {
    const sock = botSocketsRef.current.get(teamId);
    if (sock) {
      sock.emit("game:buzz");
      addLog(`Ép Bot [${teamId}] bấm Buzz!`);
    }
  };

  const handleGrantCard = async () => {
    if (!roomState || !grantTargetTeamId) return;
    adminSocketRef.current?.emit("admin:sandbox:grant:card", {
      teamId: grantTargetTeamId,
      cardType: grantCardType,
    });
    addLog(`Đã cấp thẻ [${grantCardType}] cho Đội ID: ${grantTargetTeamId}`);
    setShowCardModal(false);
  };

  return (
    <div className="space-y-4">
      {/* ── Top Bar / Header Controls ─────────────────────────────────────── */}
      <div className="glass rounded-2xl p-4 border border-white/10 flex flex-wrap items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-cyan-500 flex items-center justify-center text-xl shadow glow-purple">
            🧪
          </div>
          <div>
            <h1 className="text-xl font-black text-white flex items-center gap-2">
              Sandbox Studio
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                Solo Testing 1 Người
              </span>
            </h1>
            <p className="text-xs text-muted-foreground">
              Mô phỏng đầy đủ Màn chiếu & Các đội ảo để test 8 chế độ game mà không cần thêm người
            </p>
          </div>
        </div>

        {/* Room Launch / Connection Form */}
        <div className="flex items-center gap-2 flex-wrap">
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
                className="px-3 py-2 rounded-xl glass border border-white/20 text-xs font-medium text-white bg-[#151728] focus:outline-none min-w-[200px] max-w-[280px] truncate"
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
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white font-bold text-xs shadow-lg transition active:scale-95 disabled:opacity-50 flex items-center gap-1.5"
              >
                <span>⚡</span>
                <span>{creating ? "Đang tạo..." : "Khởi chạy Sandbox"}</span>
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
                  className="px-3 py-2 rounded-xl glass hover:bg-white/10 text-white font-bold text-xs border border-white/20 disabled:opacity-40"
                >
                  Gắn PIN
                </button>
              </form>
            </div>
          ) : (
            /* Active Room Controls */
            <div className="flex items-center gap-2 flex-wrap">
              <div className="px-3 py-1.5 rounded-xl glass border border-purple-500/40 text-xs flex items-center gap-2">
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

              {/* Action Buttons */}
              {currentQuestion?.timerPending && (
                <button
                  type="button"
                  onClick={handleStartTimer}
                  className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-green-500 hover:from-amber-400 hover:to-green-400 text-black text-xs font-black shadow-lg animate-pulse flex items-center gap-1.5"
                >
                  <span>⏱️</span>
                  <span>Bắt đầu tính giờ</span>
                </button>
              )}

              {roomState?.mode === "GRID_CARO" && revealPayload && (
                <button
                  type="button"
                  onClick={handleGridAdvanceNow}
                  className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white text-xs font-black shadow-lg animate-bounce flex items-center gap-1.5"
                >
                  <span>🏁</span>
                  <span>Quay về bảng ô</span>
                </button>
              )}

              {roomState?.mode === "GRID_CARO" && !currentQuestion && roomState.gridCaroState?.selectedCellId && (
                <button
                  type="button"
                  onClick={handleGridLaunchQuestion}
                  className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white text-xs font-black shadow-lg animate-pulse flex items-center gap-1.5"
                >
                  <span>📖</span>
                  <span>Hiện câu hỏi (#{roomState.gridCaroState.selectedCellId})</span>
                </button>
              )}

              {roomState?.mode === "GRID_CARO" && !currentQuestion && !roomState.gridCaroState?.previewActive && !roomState.gridCaroState?.selectedCellId && (
                <button
                  type="button"
                  onClick={handleGridPreviewStart}
                  className="px-3 py-1.5 rounded-xl glass hover:bg-white/10 border border-purple-500/40 text-purple-300 text-xs font-bold transition flex items-center gap-1"
                >
                  <span>👁️</span>
                  <span>Xem độ khó (5s)</span>
                </button>
              )}

              {roomState?.mode === "GRID_CARO" && !currentQuestion && roomState.gridCaroState?.previewActive && (
                <button
                  type="button"
                  onClick={handleGridPreviewStop}
                  className="px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition flex items-center gap-1"
                >
                  <span>🙈</span>
                  <span>Lật úp ngay</span>
                </button>
              )}

              {roomState?.mode === "GRID_CARO" && roomState?.status === "PLAYING" && !currentQuestion ? null : (
                <button
                  type="button"
                  onClick={handleAdminNext}
                  className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition flex items-center gap-1"
                >
                  <span>{roomState?.status === "LOBBY" ? "🚀 Bắt đầu" : "⏩ Next"}</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleAdminReveal}
                className="px-3 py-1.5 rounded-xl glass hover:bg-white/10 border border-white/20 text-amber-300 text-xs font-bold transition flex items-center gap-1"
              >
                <span>👁️</span>
                <span>Công bố</span>
              </button>

              <button
                type="button"
                onClick={handleSkipTimerToOneSecond}
                title="Giảm thời gian đếm ngược còn 1s"
                className="px-3 py-1.5 rounded-xl glass hover:bg-white/10 border border-white/20 text-yellow-300 text-xs font-bold transition flex items-center gap-1"
              >
                <span>⚡</span>
                <span>Tua còn 1s</span>
              </button>

              <button
                type="button"
                onClick={handlePauseResume}
                className="px-3 py-1.5 rounded-xl glass hover:bg-white/10 border border-white/20 text-slate-300 text-xs font-bold transition"
              >
                {roomState?.status === "PAUSED" ? "▶️ Tiếp tục" : "⏸️ Tạm dừng"}
              </button>

              {/* Bot Auto Toggle */}
              <button
                type="button"
                onClick={() => setBotAutoEnabled(!botAutoEnabled)}
                className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition flex items-center gap-1.5 ${
                  botAutoEnabled
                    ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-300 shadow-md"
                    : "glass border-white/10 text-muted-foreground hover:text-white"
                }`}
              >
                <span>🤖</span>
                <span>Bot tự động: {botAutoEnabled ? "BẬT" : "TẮT"}</span>
              </button>

              {/* Grant Card Button */}
              <button
                type="button"
                onClick={() => {
                  if (roomState?.teams && roomState.teams.length > 0) {
                    setGrantTargetTeamId(roomState.teams[0].id);
                  }
                  setShowCardModal(true);
                }}
                className="px-3 py-1.5 rounded-xl glass hover:bg-white/10 border border-purple-500/40 text-purple-300 text-xs font-bold transition flex items-center gap-1"
              >
                <span>🃏</span>
                <span>Cấp thẻ</span>
              </button>

              {/* Rules Button */}
              <button
                type="button"
                onClick={() => setShowRulesModal(true)}
                className="px-3 py-1.5 rounded-xl glass hover:bg-white/10 border border-cyan-500/40 text-cyan-300 text-xs font-bold transition flex items-center gap-1"
              >
                <span>📖</span>
                <span>Luật</span>
              </button>

              {/* Layout Switcher */}
              <div className="flex rounded-xl glass p-0.5 border border-white/10 text-[11px] font-bold">
                <button
                  type="button"
                  onClick={() => setLayoutMode("SPLIT")}
                  className={`px-2.5 py-1 rounded-lg transition ${
                    layoutMode === "SPLIT" ? "bg-purple-600 text-white" : "text-muted-foreground hover:text-white"
                  }`}
                >
                  Split
                </button>
                <button
                  type="button"
                  onClick={() => setLayoutMode("MULTI")}
                  className={`px-2.5 py-1 rounded-lg transition ${
                    layoutMode === "MULTI" ? "bg-purple-600 text-white" : "text-muted-foreground hover:text-white"
                  }`}
                >
                  4 Đội (2x2)
                </button>
                <button
                  type="button"
                  onClick={() => setLayoutMode("HOST_DISPLAY")}
                  className={`px-2.5 py-1 rounded-lg transition ${
                    layoutMode === "HOST_DISPLAY" ? "bg-purple-600 text-white" : "text-muted-foreground hover:text-white"
                  }`}
                >
                  Host + Display
                </button>
              </div>

              {/* Exit Sandbox / New room */}
              <button
                type="button"
                onClick={() => {
                  setCode("");
                  setRoomState(null);
                  setCurrentQuestion(null);
                }}
                className="px-2.5 py-1.5 rounded-xl glass hover:bg-red-500/20 text-red-400 text-xs font-bold transition"
              >
                ✕ Đổi phòng
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Sandbox Main Viewport Area ────────────────────────────────────── */}
      {!code ? (
        <div className="glass rounded-3xl p-12 text-center border border-white/10 space-y-6 max-w-2xl mx-auto my-12">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-cyan-500 flex items-center justify-center text-4xl mx-auto shadow-2xl glow-purple">
            🧪
          </div>
          <div className="space-y-2">
            <h2 className="text-3xl font-black text-white">Chào mừng tới Sandbox Studio!</h2>
            <p className="text-sm text-slate-400 max-w-md mx-auto leading-relaxed">
              Hệ thống kiểm thử độc lập cho phép 1 người chạy thử nghiệm mọi chế độ chơi với các Bot ảo tự động tính toán, bấm chuông, chọn ô và đổ xí ngầu.
            </p>
          </div>

          {/* Quick Selectors in Welcome Card */}
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
              className="px-8 py-3.5 rounded-2xl bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white font-bold text-sm shadow-xl transition hover:scale-105 active:scale-95 disabled:opacity-50"
            >
              {creating ? "Đang chuẩn bị phòng..." : `⚡ Khởi chạy Sandbox Mode: ${selectedMode}`}
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Quick Bot Simulation Override Bar */}
          <div className="glass rounded-xl p-3 border border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs bg-[#121424]">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-300">🕹️ Giả lập nhanh cho Bot:</span>
              <button
                type="button"
                onClick={() => handleForceAllBotsAnswer(true)}
                className="px-2.5 py-1 rounded-lg bg-green-500/20 border border-green-500/40 text-green-300 hover:bg-green-500/30 font-bold transition"
              >
                ✓ Cho tất cả Bot chọn ĐÚNG
              </button>
              <button
                type="button"
                onClick={() => handleForceAllBotsAnswer(false)}
                className="px-2.5 py-1 rounded-lg bg-red-500/20 border border-red-500/40 text-red-300 hover:bg-red-500/30 font-bold transition"
              >
                ✗ Cho tất cả Bot chọn SAI
              </button>
              {roomState?.teams && roomState.teams.length > 1 && (
                <button
                  type="button"
                  onClick={() => handleForceBotBuzz(roomState.teams[1].id)}
                  className="px-2.5 py-1 rounded-lg bg-yellow-500/20 border border-yellow-500/40 text-yellow-300 hover:bg-yellow-500/30 font-bold transition"
                >
                  ⚡ Ép Đội 2 Buzz
                </button>
              )}
            </div>

            {/* Live Bot Event Ticker */}
            <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              <span className="truncate max-w-xs">{botLogs[0] || "Đang chờ sự kiện..."}</span>
            </div>
          </div>

          {/* Layout 1: SPLIT (50% Display Màn chiếu + 50% Player Bạn Điều Khiển) */}
          {layoutMode === "SPLIT" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-[78vh]">
              {/* Display Viewport */}
              <div className="glass rounded-2xl border border-white/10 overflow-hidden flex flex-col shadow-2xl">
                <div className="bg-[#151728] px-4 py-2 border-b border-white/10 flex items-center justify-between text-xs font-bold text-slate-300">
                  <div className="flex items-center gap-2">
                    <span>📺</span>
                    <span>Màn hình hiển thị hội trường (Display)</span>
                  </div>
                  <Link
                    href={`/display/${code}`}
                    target="_blank"
                    className="text-cyan-400 hover:underline flex items-center gap-1"
                  >
                    Mở tab riêng ↗
                  </Link>
                </div>
                <div className="flex-1 bg-black">
                  <iframe
                    src={`/display/${code}`}
                    title="Display Preview"
                    className="w-full h-full border-0"
                  />
                </div>
              </div>

              {/* Player 1 Viewport (Bạn - Đội Đỏ) */}
              <div className="glass rounded-2xl border border-white/10 overflow-hidden flex flex-col shadow-2xl">
                <div className="bg-[#151728] px-4 py-2 border-b border-white/10 flex items-center justify-between text-xs font-bold text-slate-300">
                  <div className="flex items-center gap-2">
                    <span>📱</span>
                    <span className="text-red-400">Đội 1: Bạn điều khiển (Tester)</span>
                    <span className="text-[10px] text-muted-foreground">(Các đội khác do Bot tự xử lý)</span>
                  </div>
                  <Link
                    href={`/play/${code}`}
                    target="_blank"
                    className="text-cyan-400 hover:underline flex items-center gap-1"
                  >
                    Mở tab riêng ↗
                  </Link>
                </div>
                <div className="flex-1 bg-[#0f0f1a]">
                  <iframe
                    src={`/play/${code}?sandbox=1&teamIndex=0&name=${encodeURIComponent("Bạn (Tester)")}${roomState?.teams?.[0]?.id ? `&teamId=${roomState.teams[0].id}` : ""}`}
                    title="Player 1 Preview"
                    className="w-full h-full border-0"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Layout 2: MULTI (Display trên + 4 Viewports Đội chơi bên dưới) */}
          {layoutMode === "MULTI" && (
            <div className="space-y-4">
              {/* Top: Compact Display */}
              <div className="glass rounded-2xl border border-white/10 overflow-hidden h-[42vh] shadow-xl">
                <div className="bg-[#151728] px-4 py-1.5 border-b border-white/10 flex items-center justify-between text-xs font-bold text-slate-300">
                  <div className="flex items-center gap-2">
                    <span>📺</span>
                    <span>Màn hình hội trường (Display Live)</span>
                  </div>
                  <span className="text-[11px] font-mono text-cyan-300">PIN: {code}</span>
                </div>
                <div className="h-full bg-black">
                  <iframe
                    src={`/display/${code}`}
                    title="Display Compact"
                    className="w-full h-full border-0"
                  />
                </div>
              </div>

              {/* Bottom: 4 Team Viewports side-by-side */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 h-[46vh]">
                {(roomState?.teams || []).map((t, idx) => (
                  <div
                    key={t.id}
                    className="glass rounded-2xl border flex flex-col overflow-hidden shadow-lg"
                    style={{ borderColor: `${t.color}60` }}
                  >
                    <div
                      className="px-3 py-1.5 border-b flex items-center justify-between text-xs font-bold text-white"
                      style={{ background: `${t.color}25`, borderColor: `${t.color}40` }}
                    >
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ background: t.color }} />
                        <span className="truncate">{t.name}</span>
                        {idx === 0 && <span className="text-[10px] text-green-300">(Bạn)</span>}
                        {idx > 0 && <span className="text-[10px] text-slate-400">(Bot)</span>}
                      </div>
                      <span className="font-mono text-cyan-300 text-[11px]">{t.score}đ</span>
                    </div>
                    <div className="flex-1 bg-[#0f0f1a]">
                      <iframe
                        src={`/play/${code}?sandbox=1&teamIndex=${idx}&teamId=${t.id}&name=${encodeURIComponent(idx === 0 ? "Bạn (Tester)" : `${t.name} 🤖`)}`}
                        title={`Team ${idx + 1}`}
                        className="w-full h-full border-0"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Layout 3: HOST + DISPLAY */}
          {layoutMode === "HOST_DISPLAY" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-[78vh]">
              {/* Host Controller Viewport */}
              <div className="glass rounded-2xl border border-white/10 overflow-hidden flex flex-col shadow-2xl">
                <div className="bg-[#151728] px-4 py-2 border-b border-white/10 flex items-center justify-between text-xs font-bold text-slate-300">
                  <div className="flex items-center gap-2">
                    <span>👨‍💼</span>
                    <span>Bảng điều khiển Quản trị viên (Host View)</span>
                  </div>
                  <Link
                    href={`/admin/rooms/${code}`}
                    target="_blank"
                    className="text-cyan-400 hover:underline flex items-center gap-1"
                  >
                    Mở trang quản trị ↗
                  </Link>
                </div>
                <div className="flex-1 bg-[#0b0c16]">
                  <iframe
                    src={`/admin/rooms/${code}`}
                    title="Admin Room Detail"
                    className="w-full h-full border-0"
                  />
                </div>
              </div>

              {/* Display Viewport */}
              <div className="glass rounded-2xl border border-white/10 overflow-hidden flex flex-col shadow-2xl">
                <div className="bg-[#151728] px-4 py-2 border-b border-white/10 flex items-center justify-between text-xs font-bold text-slate-300">
                  <div className="flex items-center gap-2">
                    <span>📺</span>
                    <span>Màn hình hiển thị hội trường (Display)</span>
                  </div>
                </div>
                <div className="flex-1 bg-black">
                  <iframe
                    src={`/display/${code}`}
                    title="Display Preview"
                    className="w-full h-full border-0"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Bot Activity Logs drawer */}
          <div className="glass rounded-2xl p-4 border border-white/10 text-xs">
            <h4 className="font-bold text-slate-300 mb-2 flex items-center gap-2">
              <span>📋 Nhật ký hoạt động Bot ảo (Sandbox Event Logs):</span>
            </h4>
            <div className="max-h-24 overflow-y-auto space-y-1 font-mono text-[11px] text-slate-400 pr-2">
              {botLogs.map((log, i) => (
                <div key={i} className="truncate">{log}</div>
              ))}
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
