"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { io, Socket } from "socket.io-client";
import type {
  ServerToClientEvents,
  ClientToServerEvents,
  RoomState,
  QuestionState,
  AnswerRevealPayload,
  BloomLevel,
  GamePreparePayload,
} from "@/types";
import { BLOOM_METADATA, getBloomLevelFromPoints } from "@/types";
import Link from "next/link";
import QuizBankQuickSummary from "@/components/admin/QuizBankQuickSummary";
import { soundManager } from "@/lib/sound-manager";
import GameModeRulesModal from "@/components/ui/GameModeRulesModal";
import GameModeIcon from "@/components/ui/GameModeIcon";
import SystemIcon from "@/components/ui/SystemIcon";
import GridCaroBoard from "@/components/modes/GridCaroBoard";
import WagerPanel from "@/components/modes/WagerPanel";
import {
  syncClockWithServer,
  calculateAuthoritativeTimer,
  calibrateClockFromPacket,
} from "@/lib/clock-sync";

export default function AdminRoomPage() {
  const { code } = useParams<{ code: string }>();
  const router = useRouter();
  const socketRef = useRef<Socket<ServerToClientEvents, ClientToServerEvents> | null>(null);
  const [roomState, setRoomState] = useState<RoomState | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<QuestionState | null>(null);
  const [revealPayload, setRevealPayload] = useState<AnswerRevealPayload | null>(null);
  const [gameEnded, setGameEnded] = useState(false);
  const [timer, setTimer] = useState<{ remaining: number; total: number; endsAt?: number } | null>(null);
  const [cardsLocked, setCardsLocked] = useState(false);
  const [buzzedTeam, setBuzzedTeam] = useState<{ teamId?: string; teamName?: string; playerId: string; playerName: string } | null>(null);
  const [stealBuzzed, setStealBuzzed] = useState<{ teamId: string; teamName: string; playerId: string; playerName: string } | null>(null);
  const [isStealOpen, setIsStealOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [quizBanks, setQuizBanks] = useState<{ id: string; title: string; _count?: { questions: number } }[]>([]);
  const [currentBankInfo, setCurrentBankInfo] = useState<{ id: string; title: string; questionsCount: number } | null>(null);
  const [updatingBank, setUpdatingBank] = useState(false);

  const [adminTargetTeamId, setAdminTargetTeamId] = useState<string>("");
  const [teamSelectedAnswers, setTeamSelectedAnswers] = useState<Record<string, string>>({});
  const [adminSelectedAnswerId, setAdminSelectedAnswerId] = useState<string | null>(null);

  const [matchStarting, setMatchStarting] = useState<{ seconds: number } | null>(null);
  const [questionPrepare, setQuestionPrepare] = useState<GamePreparePayload | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [showRulesModal, setShowRulesModal] = useState(false);
  const soundEnabledRef = useRef(false);

  // Security & Host Key
  const [currentHostKey, setCurrentHostKey] = useState<string>("");
  const [authRequired, setAuthRequired] = useState(false);
  const [hostKeyInput, setHostKeyInput] = useState("");
  const [copiedHostLink, setCopiedHostLink] = useState(false);

  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    soundEnabledRef.current = next;
    soundManager.setMuted(!next);
    if (next) soundManager.unlockAudio();
  };

  // Local ticker for match warmup countdown (5s)
  useEffect(() => {
    if (!matchStarting || matchStarting.seconds <= 0) return;
    const interval = setInterval(() => {
      setMatchStarting((prev) => {
        if (!prev) return null;
        const next = prev.seconds - 1;
        if (next >= 0 && soundEnabledRef.current) {
          soundManager.playCountdownTick(next);
        }
        return next > 0 ? { seconds: next } : null;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [matchStarting]);

  // Local ticker for question preparation countdown (3s)
  useEffect(() => {
    if (!questionPrepare || questionPrepare.seconds <= 0) return;
    const interval = setInterval(() => {
      setQuestionPrepare((prev) => {
        if (!prev) return null;
        const next = prev.seconds - 1;
        if (next >= 0 && soundEnabledRef.current) {
          soundManager.playCountdownTick(next);
        }
        return next > 0 ? { ...prev, seconds: next } : { ...prev, seconds: 0 };
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [questionPrepare]);

  // Authoritative local countdown ticker for 0s lag across screens
  useEffect(() => {
    if (!timer?.endsAt) return;
    const interval = setInterval(() => {
      const auth = calculateAuthoritativeTimer(timer.endsAt, timer.total, timer.remaining);
      setTimer((prev) => {
        if (!prev) return null;
        if (prev.remaining === auth.remaining) return prev;
        return { ...prev, remaining: auth.remaining };
      });
      if (auth.remaining <= 5 && auth.remaining > 0 && soundEnabledRef.current) {
        soundManager.playCountdownTick(auth.remaining);
      }
      if (auth.isExpired && soundEnabledRef.current) {
        soundManager.stopMusic();
      }
    }, 100);
    return () => clearInterval(interval);
  }, [timer?.endsAt, timer?.total]);

  const fetchRoomAndBanks = async () => {
    try {
      const token = localStorage.getItem("admin_token") || sessionStorage.getItem("admin_token");
      const hostKey = currentHostKey || localStorage.getItem(`host_key_${code}`);
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;
      if (hostKey) headers["x-host-key"] = hostKey;

      const [resRoom, resBanks] = await Promise.all([
        fetch(`/api/rooms/${code}`, { headers }),
        fetch("/api/quiz-bank?ownerId=demo-host-id", { headers }),
      ]);
      const dataRoom = await resRoom.json();
      if (dataRoom.room?.quizBank) {
        setCurrentBankInfo({
          id: dataRoom.room.quizBank.id,
          title: dataRoom.room.quizBank.title,
          questionsCount: dataRoom.room.quizBank._count?.questions ?? 0,
        });
      }
      const dataBanks = await resBanks.json();
      if (dataBanks.banks) setQuizBanks(dataBanks.banks);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchRoomAndBanks();
  }, [code, currentHostKey]);

  useEffect(() => {
    soundManager.setMuted(true);

    const searchParams = new URLSearchParams(window.location.search);
    const urlKey = searchParams.get("key");
    const storedKey = urlKey || localStorage.getItem(`host_key_${code}`) || "";
    if (urlKey) {
      localStorage.setItem(`host_key_${code}`, urlKey);
    }
    if (storedKey) {
      setCurrentHostKey(storedKey);
    }

    const adminToken = localStorage.getItem("admin_token") || sessionStorage.getItem("admin_token");
    const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io({
      transports: ["websocket", "polling"],
      auth: { token: adminToken },
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      syncClockWithServer(socket);
      socket.emit("admin:join", { code, hostKey: storedKey } as any, (result: any) => {
        if (result?.success) {
          setAuthRequired(false);
          if (result.hostKey) {
            setCurrentHostKey(result.hostKey);
            localStorage.setItem(`host_key_${code}`, result.hostKey);
          }
          if (result.roomState) {
            setRoomState(result.roomState);
          }
        } else {
          if (result?.requiresAuth || result?.error) {
            setAuthRequired(true);
            setErrorMessage(result.error || "Cần quyền Host để điều khiển phòng thi này");
          }
        }
      });
    });

    socket.io.on("reconnect", () => {
      syncClockWithServer(socket);
    });

    socket.on("error", (msg) => {
      setErrorMessage(msg);
      setTimeout(() => setErrorMessage(""), 6000);
    });

    socket.on("room:state", setRoomState);

    socket.on("game:starting", (p) => {
      setMatchStarting({ seconds: p.seconds });
      setQuestionPrepare(null);
      setCurrentQuestion(null);
      setRevealPayload(null);
      if (soundEnabledRef.current) {
        soundManager.playCountdownTick(p.seconds);
      }
    });

    socket.on("game:prepare", (p) => {
      setMatchStarting(null);
      setQuestionPrepare(p);
      setCurrentQuestion(null);
      setRevealPayload(null);
      if (soundEnabledRef.current) {
        soundManager.playCountdownTick(p.seconds);
      }
    });

    socket.on("game:question", (q) => {
      if (q.serverTime) calibrateClockFromPacket(q.serverTime);
      setMatchStarting(null);
      setQuestionPrepare(null);
      setCurrentQuestion(q);
      setRevealPayload(null);
      if (!q.timerPending && q.endsAt) {
        const auth = calculateAuthoritativeTimer(q.endsAt, q.timeLimit, q.timeLimit);
        setTimer({ remaining: auth.remaining, total: q.timeLimit, endsAt: q.endsAt });
      } else {
        setTimer(null);
      }
      setBuzzedTeam(null);
      setStealBuzzed(null);
      setIsStealOpen(false);
      setTeamSelectedAnswers({});
      setAdminSelectedAnswerId(null);
      if (q.primaryTeamId) {
        setAdminTargetTeamId(q.primaryTeamId);
      }
      if (soundEnabledRef.current && !q.timerPending) {
        soundManager.playCountdownTick(0);
      }
    });
    socket.on("game:timer:started", (payload) => {
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
      if (soundEnabledRef.current) {
        soundManager.playCountdownTick(0);
      }
    });
    socket.on("game:timer", (t) => {
      calibrateClockFromPacket(t.serverTime);
      setTimer((prev) => {
        const effectiveEndsAt = t.endsAt || prev?.endsAt;
        if (effectiveEndsAt) {
          const auth = calculateAuthoritativeTimer(effectiveEndsAt, t.total, t.remaining);
          return { remaining: auth.remaining, total: t.total, endsAt: effectiveEndsAt };
        }
        return { remaining: t.remaining, total: t.total, endsAt: t.endsAt };
      });
      if (t.remaining <= 5 && t.remaining > 0 && soundEnabledRef.current) {
        soundManager.playCountdownTick(t.remaining);
      }
    });
    socket.on("game:timer:expired", () => {
      setTimer((prev) => (prev ? { ...prev, remaining: 0 } : { remaining: 0, total: 30 }));
      if (soundEnabledRef.current) {
        soundManager.playBuzz();
      }
    });
    socket.on("game:buzz", (p) => {
      setBuzzedTeam(p);
      if (p.teamId) {
        setAdminTargetTeamId(p.teamId);
      }
      if (soundEnabledRef.current) {
        soundManager.playBuzz();
      }
    });
    socket.on("game:bounceback:open_steal", () => {
      setIsStealOpen(true);
      setStealBuzzed(null);
    });
    socket.on("game:bounceback:steal_buzzed", (p) => {
      setIsStealOpen(false);
      setStealBuzzed(p);
      if (p.teamId) {
        setAdminTargetTeamId(p.teamId);
      }
      if (soundEnabledRef.current) {
        soundManager.playBuzz();
      }
    });
    socket.on("game:buzz:closed", () => {
      setIsStealOpen(false);
    });
    socket.on("game:answer:reveal", (p) => {
      setRevealPayload(p);
      setIsStealOpen(false);
      if (soundEnabledRef.current) {
        if (p.answers?.some((a) => a.isCorrect)) {
          soundManager.playCorrect();
        } else {
          soundManager.playWrong();
        }
      }
    });
    socket.on("game:question:clear", () => {
      setCurrentQuestion(null);
      setRevealPayload(null);
      setTimer(null);
      setBuzzedTeam(null);
      setStealBuzzed(null);
      setIsStealOpen(false);
      setTeamSelectedAnswers({});
      setAdminSelectedAnswerId(null);
    });
    socket.on("game:answer:received", (payload: any) => {
      if (payload.teamId && payload.answer) {
        const singleAns = Array.isArray(payload.answer) ? payload.answer[0] : payload.answer;
        setTeamSelectedAnswers((prev) => ({ ...prev, [payload.teamId]: singleAns }));
      }
    });
    socket.on("game:score:update", (scores) => {
      setRoomState((prev) => {
        if (!prev) return prev;
        const teams = prev.teams.map((t) => { const u = scores.find((s) => s.teamId === t.id); return u ? { ...t, score: u.score } : t; });
        const players = prev.players.map((p) => { const u = scores.find((s) => s.playerId === p.id); return u ? { ...p, score: u.score } : p; });
        return { ...prev, teams, players };
      });
    });
    socket.on("game:grid:update", (gridCaroState) => {
      setRoomState((prev) => (prev ? { ...prev, gridCaroState } : prev));
    });
    socket.on("game:dice:update", (diceRaceState) => {
      setRoomState((prev) => (prev ? { ...prev, diceRaceState } : prev));
    });
    socket.on("game:wager:update", (wagerState) => {
      setRoomState((prev) => (prev ? { ...prev, wagerState } : prev));
    });
    socket.on("game:tournament:update", (tournamentState) => {
      setRoomState((prev) => (prev ? { ...prev, tournamentState } : prev));
    });
    socket.on("game:ended", () => {
      if (soundEnabledRef.current) {
        soundManager.playFanfare();
      }
      setGameEnded(true);
    });
    socket.on("game:paused", () => setRoomState((s) => s ? { ...s, status: "PAUSED" } : s));
    socket.on("game:resumed", () => setRoomState((s) => s ? { ...s, status: "PLAYING" } : s));

    return () => {
      socket.disconnect();
    };
  }, [code]);

  const emit = (event: keyof ClientToServerEvents, ...args: any[]) => {
    if (args.length === 0) {
      if (
        event === "admin:next" ||
        event === "admin:reveal" ||
        event === "admin:pause" ||
        event === "admin:resume" ||
        event === "admin:skip:prepare" ||
        event === "admin:dice:advance_to_board"
      ) {
        (socketRef.current?.emit as any)(event, { code });
        return;
      }
    } else if (args.length === 1 && typeof args[0] === "object" && args[0] !== null) {
      if (!args[0].code) {
        args[0] = { ...args[0], code };
      }
    }
    (socketRef.current?.emit as any)(event, ...args);
  };

  const handleToggleCards = (locked: boolean) => {
    setCardsLocked(locked);
    emit("admin:lock:cards", locked);
  };

  const handleUnlockHost = (e: React.FormEvent) => {
    e.preventDefault();
    if (!hostKeyInput.trim()) return;
    const cleanKey = hostKeyInput.trim();
    localStorage.setItem(`host_key_${code}`, cleanKey);
    setCurrentHostKey(cleanKey);

    socketRef.current?.emit("admin:join", { code, hostKey: cleanKey } as any, (result: any) => {
      if (result?.success) {
        setAuthRequired(false);
        setErrorMessage("");
        if (result.hostKey) {
          setCurrentHostKey(result.hostKey);
          localStorage.setItem(`host_key_${code}`, result.hostKey);
        }
        if (result.roomState) setRoomState(result.roomState);
      } else {
        setErrorMessage(result?.error || "Khóa bảo mật Host không chính xác!");
      }
    });
  };

  const handleCopyHostLink = () => {
    const key = currentHostKey || localStorage.getItem(`host_key_${code}`) || "";
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const url = key ? `${origin}/admin/rooms/${code}?key=${key}` : `${origin}/admin/rooms/${code}`;
    navigator.clipboard.writeText(url);
    setCopiedHostLink(true);
    setTimeout(() => setCopiedHostLink(false), 3000);
  };

  const handleDelete = async () => {
    if (!confirm(`Xóa phòng "${roomState?.name ?? code}"? Hành động này không thể hoàn tác!`)) return;
    setDeleteLoading(true);
    try {
      const token = localStorage.getItem("admin_token") || sessionStorage.getItem("admin_token");
      const hostKey = currentHostKey || localStorage.getItem(`host_key_${code}`);
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;
      if (hostKey) headers["x-host-key"] = hostKey;

      const res = await fetch(`/api/rooms/${code}`, { method: "DELETE", headers });
      if (res.ok) {
        socketRef.current?.disconnect();
        router.push("/admin/rooms");
      } else {
        alert("Lỗi khi xóa phòng!");
        setDeleteLoading(false);
      }
    } catch {
      alert("Lỗi kết nối!");
      setDeleteLoading(false);
    }
  };

  const handleAdminSubmitAnswer = (answerId: string) => {
    if (!currentQuestion) return;
    const effTeamId = (roomState?.mode === "GRID_CARO" && roomState.gridCaroState?.currentTurnTeamId)
      ? roomState.gridCaroState.currentTurnTeamId
      : (roomState?.mode === "DICE_RACE" && roomState.diceRaceState?.currentTurnTeamId)
      ? roomState.diceRaceState.currentTurnTeamId
      : adminTargetTeamId || currentQuestion.primaryTeamId || buzzedTeam?.teamId || stealBuzzed?.teamId || roomState?.teams[0]?.id;
    
    if (effTeamId) {
      setTeamSelectedAnswers((prev) => ({ ...prev, [effTeamId]: answerId }));
    }
    setAdminSelectedAnswerId(answerId);

    emit("admin:submit:answer", {
      questionId: currentQuestion.question.id,
      teamId: effTeamId || undefined,
      answer: answerId,
    });
  };

  const handleAssignQuizBank = async (bankId: string) => {
    setUpdatingBank(true);
    try {
      const token = localStorage.getItem("admin_token") || sessionStorage.getItem("admin_token");
      const hostKey = currentHostKey || localStorage.getItem(`host_key_${code}`);
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;
      if (hostKey) headers["x-host-key"] = hostKey;

      const res = await fetch(`/api/rooms/${code}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ quizBankId: bankId || null }),
      });
      if (res.ok) {
        await fetchRoomAndBanks();
      } else {
        alert("Lỗi khi cập nhật bộ đề!");
      }
    } catch {
      alert("Lỗi kết nối!");
    } finally {
      setUpdatingBank(false);
    }
  };

  const sortedEntries = roomState
    ? (roomState.teamMode === "TEAM" ? [...roomState.teams] : [...roomState.players])
        .sort((a: any, b: any) => b.score - a.score)
    : [];

  const bloom: BloomLevel = currentQuestion
    ? (currentQuestion.bloomLevel ?? getBloomLevelFromPoints(currentQuestion.question.points))
    : "REMEMBER";
  const bloomMeta = BLOOM_METADATA[bloom];

  const timerAuth = timer?.endsAt
    ? calculateAuthoritativeTimer(timer.endsAt, timer.total, timer.remaining)
    : null;
  const timerDisplayRemaining = timerAuth ? timerAuth.remaining : timer?.remaining ?? 0;

  return (
    <div className="space-y-6 pb-24 lg:pb-8">
      {/* Back to rooms list */}
      <Link
        href="/admin/rooms"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        ← Danh sách phòng
      </Link>

      {/* Error alert banner */}
      {errorMessage && (
        <div className="bg-destructive/15 border border-destructive/40 text-destructive-foreground px-4 py-3 rounded-xl flex items-center justify-between animate-slide-up">
          <div className="flex items-center gap-2">
            <span>⚠️</span>
            <span className="font-semibold text-sm">{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage("")} className="text-xs hover:underline">Đóng</button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-black">{roomState?.name ?? "Phòng đang tải..."}</h1>
            {roomState?.mode && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30 inline-flex items-center gap-1.5">
                <GameModeIcon mode={roomState.mode} className="w-3.5 h-3.5 shrink-0" />
                Mode: {roomState.mode}
              </span>
            )}
            {roomState?.config.answerMethod === "MC" && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 inline-flex items-center gap-1.5">
                <SystemIcon name="mc" className="w-3.5 h-3.5 shrink-0" />
                Trả lời qua MC
              </span>
            )}
          </div>
          <p className="text-muted-foreground mt-1 text-xs sm:text-sm">
            Mã: <span className="font-mono font-bold text-white">{code}</span>
            {" "}· Trạng thái: <span className={`font-bold ${ roomState?.status === "PLAYING" ? "text-green-400" : roomState?.status === "PAUSED" ? "text-yellow-400" : roomState?.status === "FINISHED" ? "text-red-400" : "text-cyan-400" }`}>{roomState?.status ?? "..."}</span>
          </p>
        </div>
        <div className="flex gap-2 flex-wrap sm:justify-end">
          <button
            onClick={handleCopyHostLink}
            title="Sao chép link điều khiển bí mật có chứa Host Key"
            className="px-3.5 py-2 rounded-xl bg-purple-600/20 border border-purple-500/40 hover:bg-purple-600/30 text-purple-300 hover:text-white font-medium text-sm transition-colors flex items-center gap-1.5 whitespace-nowrap shadow-sm shrink-0"
          >
            <span>🔑</span>
            <span className="whitespace-nowrap">{copiedHostLink ? "Đã chép link Host!" : "Sao chép Link Host"}</span>
          </button>
          <button
            onClick={toggleSound}
            title={soundEnabled ? "Tắt âm thanh máy Host" : "Bật âm thanh máy Host"}
            className="px-3.5 py-2 rounded-xl glass border border-border hover:border-amber-400 font-medium text-sm transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0"
          >
            <SystemIcon name={soundEnabled ? "sound_on" : "sound_off"} className="w-4 h-4 shrink-0 text-amber-400" />
            <span className="whitespace-nowrap">{soundEnabled ? "Âm thanh: BẬT" : "Âm thanh"}</span>
          </button>
          <button
            type="button"
            onClick={() => setShowRulesModal(true)}
            className="px-3.5 py-2 rounded-xl glass border border-border hover:border-cyan-400 font-medium text-sm transition-colors flex items-center gap-1.5 text-cyan-300 hover:text-white whitespace-nowrap shrink-0"
          >
            <span>📖</span>
            <span className="whitespace-nowrap">Luật chơi</span>
          </button>
          <Link
            href={`/admin/sandbox?code=${code}`}
            target="_blank"
            className="px-3.5 py-2 rounded-xl glass border border-border hover:border-fuchsia-400 font-medium text-sm transition-colors flex items-center gap-1.5 text-fuchsia-300 hover:text-white whitespace-nowrap shrink-0"
          >
            <SystemIcon name="sandbox" className="w-4 h-4 shrink-0" />
            <span className="whitespace-nowrap">Mở Sandbox</span>
          </Link>
          <Link
            href={`/display/${code}`}
            target="_blank"
            className="px-4 py-2 rounded-xl glass border border-border hover:border-purple-500 font-medium text-sm transition-colors inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
          >
            <SystemIcon name="display" className="w-4 h-4 shrink-0 text-cyan-400" />
            <span className="whitespace-nowrap">Màn chiếu</span>
          </Link>
          <a
            href={`/play/${code}`}
            target="_blank"
            className="px-4 py-2 rounded-xl glass border border-border hover:border-cyan-500 font-medium text-sm transition-colors inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
          >
            <SystemIcon name="device" className="w-4 h-4 shrink-0 text-purple-400" />
            <span className="whitespace-nowrap">Link tham gia</span>
          </a>
          <button
            onClick={handleDelete}
            disabled={deleteLoading}
            className="px-4 py-2 rounded-xl bg-destructive/10 border border-destructive/40 hover:bg-destructive/20 text-destructive font-medium text-sm transition-colors disabled:opacity-50 inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
          >
            <SystemIcon name="trash" className="w-4 h-4 shrink-0 text-red-400" />
            <span className="whitespace-nowrap">{deleteLoading ? "Đang xóa..." : "Xóa phòng"}</span>
          </button>
        </div>
      </div>

      {/* Auth Guard Modal for Unauthorized Visitors */}
      {authRequired && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass max-w-md w-full p-8 rounded-3xl border border-purple-500/50 shadow-2xl space-y-6 animate-slide-up text-center">
            <div className="w-16 h-16 rounded-2xl bg-purple-600/20 border border-purple-500/40 flex items-center justify-center mx-auto text-3xl">
              🔐
            </div>
            <div>
              <h2 className="text-2xl font-black text-white whitespace-nowrap">Yêu cầu quyền Host</h2>
              <p className="text-sm text-slate-400 mt-2">
                Phòng thi này được bảo vệ bí mật. Vui lòng nhập Khóa bí mật của Host hoặc Mật khẩu Quản trị để mở quyền điều khiển.
              </p>
            </div>
            <form onSubmit={handleUnlockHost} className="space-y-4">
              <input
                type="password"
                value={hostKeyInput}
                onChange={(e) => setHostKeyInput(e.target.value)}
                placeholder="Nhập Host Key (hk_...) hoặc Master Passcode"
                className="input-box w-full py-3 px-4 text-center text-base font-mono font-semibold"
                autoFocus
              />
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => router.push("/admin/rooms")}
                  className="flex-1 py-3 px-4 rounded-xl border border-border text-slate-400 hover:text-white text-sm font-semibold whitespace-nowrap"
                >
                  Quay lại
                </button>
                <button
                  type="submit"
                  disabled={!hostKeyInput.trim()}
                  className="flex-1 btn-gradient py-3 px-4 text-sm font-bold disabled:opacity-50 whitespace-nowrap"
                >
                  Mở khóa Host
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Lobby Quiz Bank selector */}
      {roomState?.status === "LOBBY" && (
        <div className="space-y-3">
          <div className="glass rounded-2xl p-5 border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <SystemIcon name="quiz_bank" className="w-5 h-5 text-purple-400 shrink-0" />
                <h3 className="font-bold text-base">Bộ đề câu hỏi gán cho phòng</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                {currentBankInfo
                  ? `Đang dùng: ${currentBankInfo.title} (${currentBankInfo.questionsCount} câu hỏi)`
                  : "⚠️ Chưa gán bộ đề nào — hãy chọn bộ đề dưới đây trước khi bắt đầu"}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <select
                value={currentBankInfo?.id ?? ""}
                onChange={(e) => handleAssignQuizBank(e.target.value)}
                disabled={updatingBank}
                className="px-3 py-2 rounded-xl bg-[#151728] border border-border text-sm font-medium focus:ring-2 focus:ring-ring text-white"
              >
                <option value="" className="bg-[#151728] text-white">— Chọn bộ đề câu hỏi —</option>
                {quizBanks.map((b) => (
                  <option key={b.id} value={b.id} className="bg-[#151728] text-white">
                    {b.title} {b._count ? `(${b._count.questions} câu)` : ""}
                  </option>
                ))}
              </select>
              <Link
                href="/admin/quiz-bank"
                className="px-3 py-2 rounded-xl glass border border-border hover:border-purple-400 text-xs font-semibold whitespace-nowrap transition"
              >
                + Quản lý bộ đề
              </Link>
            </div>
          </div>

          {currentBankInfo?.id && (
            <QuizBankQuickSummary
              bankId={currentBankInfo.id}
              showClearButton={false}
            />
          )}
        </div>
      )}

      {gameEnded && (
        <div className="glass rounded-xl p-6 text-center border border-green-500/50">
          <p className="text-2xl font-black">🏆 Game đã kết thúc!</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Game controls */}
        <div className="glass rounded-2xl p-6 space-y-4">
          <h2 className="font-bold text-lg">⚡ Điều khiển game</h2>

          {/* Match warmup countdown banner with Skip button */}
          {matchStarting && (
            <div className="p-4 rounded-xl bg-purple-900/30 border border-purple-500/50 text-center space-y-3 animate-pulse">
              <p className="text-xs uppercase font-bold text-purple-300 tracking-wider">
                ⚡ Đang đếm ngược chuẩn bị trận đấu: {matchStarting.seconds}s
              </p>
              <div className="text-4xl font-black text-cyan-400">
                {matchStarting.seconds}s
              </div>
              <button
                onClick={() => emit("admin:skip:prepare")}
                className="w-full py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs shadow transition-all flex items-center justify-center gap-1.5"
              >
                <span>⚡</span> Bỏ qua đếm ngược (Vào câu hỏi ngay)
              </button>
            </div>
          )}

          {/* Question preparation countdown banner with Skip button */}
          {questionPrepare && (
            <div className="p-4 rounded-xl bg-purple-900/30 border border-purple-500/50 text-center space-y-3 animate-pulse">
              <div className="flex items-center justify-between text-xs text-muted-foreground font-medium">
                <span>Chuẩn bị câu {questionPrepare.questionIndex + 1} / {questionPrepare.totalQuestions}</span>
                <span className="text-cyan-300 font-bold">{questionPrepare.points}đ · {questionPrepare.timeLimit}s</span>
              </div>
              <div className="text-4xl font-black text-cyan-400">
                {questionPrepare.seconds}s
              </div>
              <button
                onClick={() => emit("admin:skip:prepare")}
                className="w-full py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs shadow transition-all flex items-center justify-center gap-1.5"
              >
                <span>⚡</span> Bỏ qua đếm ngược (Vào câu hỏi ngay)
              </button>
            </div>
          )}

          {/* Timer display */}
          {timer && (
            <div className="text-center py-1">
              <div className="text-5xl font-black" style={{ color: timerDisplayRemaining < 5 ? "#ef4444" : timerDisplayRemaining < 10 ? "#f59e0b" : "#06b6d4" }}>
                {timerDisplayRemaining}s
              </div>
            </div>
          )}

          {/* Mode specific alerts & action buttons */}
          {roomState?.mode === "BOUNCEBACK" && currentQuestion && (
            <div className="p-4 rounded-xl bg-purple-900/20 border border-purple-500/30 space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">🎯 Đội trả lời chính:</span>
                <span className="font-bold text-cyan-300">{currentQuestion.primaryTeamName ?? "Đang xác định"}</span>
              </div>

              {!stealBuzzed && !isStealOpen && (
                <button
                  onClick={() => emit("admin:bounceback:open_steal")}
                  className="w-full py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 font-bold text-sm text-black transition-colors flex items-center justify-center gap-2 shadow"
                >
                  🔔 Mở chuông cướp lượt (5s cho các đội còn lại)
                </button>
              )}

              {isStealOpen && (
                <div className="text-center py-2 bg-amber-500/20 rounded-lg text-amber-300 text-xs font-bold animate-pulse">
                  ⚡ Chuông cướp lượt 5s đang mở cho các đội khác bấm...
                </div>
              )}

              {stealBuzzed && (
                <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/30 space-y-2">
                  <p className="text-xs font-bold text-green-300">
                    ⚡ Đội <span className="underline">{stealBuzzed.teamName}</span> ({stealBuzzed.playerName}) đã cướp chuông!
                  </p>
                  <button
                    onClick={() => emit("admin:bounceback:start_steal_answer")}
                    className="w-full py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 font-bold text-xs"
                  >
                    ⏱️ Bắt đầu thời gian trả lời cho đội cướp lượt (15s)
                  </button>
                </div>
              )}
            </div>
          )}

          {roomState?.mode === "BUZZ" && (
            <div className="p-4 rounded-xl bg-amber-900/20 border border-amber-500/30 space-y-3">
              {buzzedTeam ? (
                <div className="space-y-2">
                  <p className="text-sm font-bold text-amber-300">
                    ⚡ Đội <span className="underline">{buzzedTeam.teamName ?? buzzedTeam.playerName}</span> đã bấm chuông sớm nhất!
                  </p>
                  <button
                    onClick={() => emit("admin:buzz:start_answer")}
                    className="w-full py-2.5 rounded-xl bg-yellow-500 hover:bg-yellow-400 text-black font-bold text-sm"
                  >
                    ⏱️ Bắt đầu thời gian trả lời cho đội chuông (15s)
                  </button>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground text-center">
                  ⏳ Đang chờ các đội bấm chuông trên thiết bị...
                </p>
              )}
            </div>
          )}

          {/* TOURNAMENT Mode Admin Panel */}
          {roomState?.mode === "TOURNAMENT" && (
            <div className="p-4 rounded-xl bg-yellow-900/20 border border-yellow-500/30 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xl">🏆</span>
                  <span className="font-bold text-sm text-yellow-300">Đấu Loại Trực Tiếp 1v1</span>
                </div>
                {roomState.tournamentState?.championTeamName ? (
                  <span className="px-2.5 py-0.5 rounded-full bg-yellow-500/30 border border-yellow-500 text-yellow-200 text-xs font-bold">
                    👑 Vô địch: {roomState.tournamentState.championTeamName}
                  </span>
                ) : (
                  <button
                    onClick={() => emit("admin:tournament:advance")}
                    className="px-3 py-1.5 rounded-lg bg-yellow-500 hover:bg-yellow-400 text-black font-bold text-xs shadow transition-all active:scale-95"
                  >
                    ➡️ Trận tiếp theo
                  </button>
                )}
              </div>
              {roomState.tournamentState && (
                <div className="text-xs text-muted-foreground flex flex-wrap gap-3">
                  <span>Trận đang đấu: <strong>{roomState.tournamentState.matches.find((m) => m.id === roomState.tournamentState?.currentMatchId)?.team1Name ?? "?"}</strong> vs <strong>{roomState.tournamentState.matches.find((m) => m.id === roomState.tournamentState?.currentMatchId)?.team2Name ?? "?"}</strong></span>
                  <span>Điểm trận: {roomState.tournamentState.matches.find((m) => m.id === roomState.tournamentState?.currentMatchId)?.team1Score ?? 0} - {roomState.tournamentState.matches.find((m) => m.id === roomState.tournamentState?.currentMatchId)?.team2Score ?? 0}</span>
                </div>
              )}
            </div>
          )}

          {/* GRID_CARO Mode Admin Panel */}
          {roomState?.mode === "GRID_CARO" && roomState.gridCaroState && (
            <div className="space-y-3">
              <GridCaroBoard
                gridState={roomState.gridCaroState}
                isAdmin={true}
                canSelect={!currentQuestion && !roomState.gridCaroState.selectedCellAnimation}
                onSelectCell={(cellId) => emit("admin:grid:select:manual", { cellId })}
                onAdvanceNow={() => emit("admin:grid:advance_now")}
                onPreviewStart={() => emit("admin:grid:preview:start")}
                onPreviewStop={() => emit("admin:grid:preview:stop")}
                onLaunchQuestion={() => emit("admin:grid:launch_question")}
              />
            </div>
          )}

          {/* DICE_RACE Mode Admin Panel */}
          {roomState?.mode === "DICE_RACE" && (
            <div className="p-4 rounded-xl bg-indigo-900/20 border border-indigo-500/30 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xl">🎲</span>
                  <div>
                    <span className="font-bold text-sm text-indigo-300">Đua Cờ Xí Ngầu</span>
                    {roomState.diceRaceState?.currentTurnTeamName && (
                      <p className="text-xs text-muted-foreground">
                        Lượt tung xúc xắc: <strong className="text-white">{roomState.diceRaceState.currentTurnTeamName}</strong>
                      </p>
                    )}
                  </div>
                </div>
                <button
                  disabled={roomState.diceRaceState?.dicePendingAnswer}
                  onClick={() => emit("admin:dice:roll:manual")}
                  className="px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-xs shadow transition-all active:scale-95"
                >
                  🎲 Tung xúc xắc thay đội
                </button>
              </div>
              {roomState.diceRaceState?.lastDiceRoll && (
                <p className="text-xs text-indigo-200">
                  Kết quả xúc xắc gần nhất: <strong className="text-white text-sm">{roomState.diceRaceState.lastDiceRoll} nút</strong>
                </p>
              )}
            </div>
          )}

          {/* WAGER Mode Admin Panel */}
          {roomState?.mode === "WAGER" && roomState.wagerState && (
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-xl bg-amber-900/20 border border-amber-500/30">
                <div className="flex items-center gap-2">
                  <span className="text-xl">💰</span>
                  <div>
                    <span className="font-bold text-sm text-amber-300">Điều khiển Cược Điểm</span>
                    <p className="text-xs text-muted-foreground">
                      Giai đoạn: <strong>{roomState.wagerState.phase === "WAGER_PERIOD" ? "Đang cược bí mật (15s)" : roomState.wagerState.phase === "QUESTION_PERIOD" ? "Đang trả lời câu hỏi" : "Công bố đáp án & điểm cược"}</strong>
                    </p>
                  </div>
                </div>
                {roomState.wagerState.phase === "WAGER_PERIOD" && (
                  <button
                    onClick={() => emit("admin:wager:skip_timer")}
                    className="px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs shadow transition-all active:scale-95"
                  >
                    ⏩ Bỏ qua cược & chốt cược
                  </button>
                )}
                {roomState.wagerState.phase === "QUESTION_PERIOD" && !roomState.wagerState.questionReady && (
                  <button
                    onClick={() => emit("admin:wager:launch_question")}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-white font-black text-sm shadow-lg shadow-emerald-500/30 transition-all active:scale-95 animate-pulse flex items-center gap-2"
                  >
                    <span>📢</span>
                    <span>Mở câu hỏi cho thí sinh</span>
                  </button>
                )}
              </div>

              <WagerPanel
                wagerState={roomState.wagerState}
                isAdmin={true}
                teams={roomState.teams}
                positiveTeamsCount={roomState.teams.filter((t) => t.score > 0).length}
                onGrantBailout={(teamId) => emit("admin:wager:grant_bailout", { teamId })}
                onSetBailoutLimit={(limit) => emit("admin:wager:set_bailout_limit", { limit })}
                onLaunchQuestion={() => emit("admin:wager:launch_question")}
              />
            </div>
          )}

          {/* Question info */}
          {currentQuestion && (
            <div className="glass rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground font-semibold">
                  Câu hiện tại ({currentQuestion.question.type})
                </span>
                <span
                  className="px-2 py-0.5 rounded-full font-bold border"
                  style={{ color: bloomMeta.color, borderColor: `${bloomMeta.color}40`, background: bloomMeta.bg }}
                >
                  {bloomMeta.emoji} {bloomMeta.labelVi} ({currentQuestion.question.points}đ)
                </span>
              </div>
              <p className="font-medium">{currentQuestion.question.content}</p>

              {/* Direct Answer Click on Admin screen (MC mode / Fail-safe override) */}
              {currentQuestion.question.options && (() => {
                const effTargetTeamId = (roomState?.mode === "GRID_CARO" && roomState.gridCaroState?.currentTurnTeamId)
                  ? roomState.gridCaroState.currentTurnTeamId
                  : (roomState?.mode === "DICE_RACE" && roomState.diceRaceState?.currentTurnTeamId)
                  ? roomState.diceRaceState.currentTurnTeamId
                  : adminTargetTeamId || currentQuestion?.primaryTeamId || buzzedTeam?.teamId || stealBuzzed?.teamId || roomState?.teams[0]?.id || "";
                const currentTargetAnswerId = effTargetTeamId ? (teamSelectedAnswers[effTargetTeamId] ?? adminSelectedAnswerId) : adminSelectedAnswerId;

                return (
                  <div className="space-y-3 pt-3 border-t border-border/60">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-bold text-xs text-cyan-300 flex items-center gap-1.5">
                        <span>🎙️ Chọn đáp án trên máy Host:</span>
                        <span className="text-[10px] text-green-400 font-normal">(Đổi đáp án liên tục khi còn thời gian)</span>
                      </span>
                      {currentTargetAnswerId && !revealPayload && (
                        <span className="text-[11px] text-green-400 font-bold flex items-center gap-1">
                          <span>✓ Đang chọn</span>
                        </span>
                      )}
                    </div>

                    {/* Team Selector Pills if room has teams */}
                    {roomState?.teamMode === "TEAM" && (roomState.teams?.length ?? 0) > 0 && (
                      <div className="flex flex-wrap items-center gap-2 p-2 rounded-xl bg-card/60 border border-border">
                        {roomState?.mode === "GRID_CARO" ? (
                          <div className="flex items-center justify-between w-full">
                            <span className="text-xs text-muted-foreground font-semibold flex items-center gap-1.5">
                              <span>🎯 Đội trả lời duy nhất:</span>
                            </span>
                            {(() => {
                              const turnTeam = roomState.teams.find((t) => t.id === effTargetTeamId);
                              if (!turnTeam) return null;
                              const chosenAnsId = teamSelectedAnswers[turnTeam.id];
                              const chosenIndex = chosenAnsId
                                ? currentQuestion.question.options?.findIndex((o) => o.id === chosenAnsId)
                                : -1;
                              const chosenLetter = chosenIndex !== undefined && chosenIndex >= 0 ? ["A", "B", "C", "D"][chosenIndex] : null;

                              return (
                                <div className="px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 border border-cyan-400 bg-cyan-500/20 text-cyan-200 ring-1 ring-cyan-400">
                                  <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: turnTeam.color }} />
                                  <span>{turnTeam.name}</span>
                                  <span className="text-[10px] bg-cyan-500/30 px-1.5 py-0.5 rounded text-cyan-300 font-normal">Đang có lượt</span>
                                  {chosenLetter && (
                                    <span className="px-1.5 py-0.2 rounded bg-cyan-500 text-black text-[10px] font-black">
                                      {chosenLetter}
                                    </span>
                                  )}
                                </div>
                              );
                            })()}
                          </div>
                        ) : roomState?.mode === "DICE_RACE" ? (
                          <div className="flex items-center justify-between w-full">
                            <span className="text-xs text-muted-foreground font-semibold flex items-center gap-1.5">
                              <span>🎲 Đội trả lời duy nhất:</span>
                            </span>
                            {(() => {
                              const turnTeam = roomState.teams.find((t) => t.id === effTargetTeamId);
                              if (!turnTeam) return null;
                              return (
                                <div className="px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 border border-indigo-400 bg-indigo-500/20 text-indigo-200 ring-1 ring-indigo-400">
                                  <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: turnTeam.color }} />
                                  <span>{turnTeam.name}</span>
                                  <span className="text-[10px] bg-indigo-500/30 px-1.5 py-0.5 rounded text-indigo-300 font-normal">Đang có lượt</span>
                                </div>
                              );
                            })()}
                          </div>
                        ) : (
                          <>
                            <span className="text-xs text-muted-foreground font-semibold">Chấm cho đội:</span>
                            <div className="flex flex-wrap gap-1.5 flex-1">
                              {roomState?.teams.map((t) => {
                                const isTarget = effTargetTeamId === t.id;
                                const chosenAnsId = teamSelectedAnswers[t.id];
                                const chosenIndex = chosenAnsId
                                  ? currentQuestion.question.options?.findIndex((o) => o.id === chosenAnsId)
                                  : -1;
                                const chosenLetter = chosenIndex !== undefined && chosenIndex >= 0 ? ["A", "B", "C", "D"][chosenIndex] : null;

                                return (
                                  <button
                                    key={t.id}
                                    type="button"
                                    onClick={() => {
                                      setAdminTargetTeamId(t.id);
                                      setAdminSelectedAnswerId(teamSelectedAnswers[t.id] ?? null);
                                    }}
                                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 border transition-all ${
                                      isTarget
                                        ? "border-cyan-400 bg-cyan-500/20 text-cyan-200 ring-1 ring-cyan-400"
                                        : "border-border bg-background/50 hover:border-border/80 text-muted-foreground"
                                    }`}
                                  >
                                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: t.color }} />
                                    <span className="truncate max-w-[100px]">{t.name}</span>
                                    {chosenLetter && (
                                      <span className="px-1.5 py-0.2 rounded bg-cyan-500 text-black text-[10px] font-black">
                                        {chosenLetter}
                                      </span>
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                          </>
                        )}
                      </div>
                    )}

                    {/* Direct options click */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {currentQuestion.question.options.map((opt, i) => {
                        const labels = ["A", "B", "C", "D"];
                        const isRevealed = revealPayload?.correctAnswer.includes(opt.id);
                        const isSelected = currentTargetAnswerId === opt.id;

                        let btnStyle = "border-border hover:border-cyan-400 hover:bg-cyan-500/10 text-muted-foreground hover:text-foreground";
                        if (revealPayload) {
                          if (isRevealed) {
                            btnStyle = "border-green-500 bg-green-500/20 text-green-300 font-bold shadow-md";
                          } else if (isSelected) {
                            btnStyle = "border-red-500/60 bg-red-500/10 text-red-300 opacity-60";
                          } else {
                            btnStyle = "border-border opacity-40";
                          }
                        } else if (isSelected) {
                          btnStyle = "border-cyan-400 bg-cyan-500/25 text-cyan-200 ring-2 ring-cyan-400/60 shadow-lg font-bold";
                        }

                        return (
                          <button
                            key={opt.id}
                            onClick={() => handleAdminSubmitAnswer(opt.id)}
                            className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-left text-sm transition-all active:scale-95 group ${btnStyle}`}
                          >
                            <span
                              className={`w-6 h-6 rounded flex items-center justify-center text-xs font-black shrink-0 ${
                                isSelected
                                  ? "bg-cyan-400 text-black"
                                  : "bg-muted text-muted-foreground group-hover:bg-cyan-500 group-hover:text-black"
                              }`}
                            >
                              {labels[i] ?? i + 1}
                            </span>
                            <span className="truncate flex-1">{opt.text}</span>
                            {isSelected && !revealPayload && (
                              <span className="px-1.5 py-0.5 rounded bg-cyan-400 text-black text-[10px] font-black uppercase tracking-wider shrink-0">
                                ✓ Đang chọn
                              </span>
                            )}
                            {revealPayload && isRevealed && (
                              <span className="px-1.5 py-0.5 rounded bg-green-500 text-black text-[10px] font-black uppercase tracking-wider shrink-0">
                                ✓ Đúng
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* Control buttons */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            {/* Timer pending manual start button */}
            {currentQuestion?.timerPending && (
              <button
                onClick={() => emit("admin:question:start_timer")}
                className="py-3.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-green-500 hover:from-amber-400 hover:to-green-400 text-black font-black text-base col-span-2 shadow-2xl animate-pulse inline-flex items-center justify-center gap-2 whitespace-nowrap"
              >
                <span>⏱️</span>
                <span className="whitespace-nowrap">Bắt đầu tính thời gian</span>
              </button>
            )}

            {/* In GRID_CARO: Return to Board button after reveal */}
            {roomState?.mode === "GRID_CARO" && revealPayload && (
              <button
                onClick={() => emit("admin:grid:advance_now")}
                className="py-3.5 px-4 rounded-xl bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white font-black text-sm col-span-2 shadow-xl inline-flex items-center justify-center gap-2 animate-bounce whitespace-nowrap"
              >
                <span>🏁</span>
                <span className="whitespace-nowrap">Quay về bảng ô (Lượt tiếp theo)</span>
              </button>
            )}

            {/* In GRID_CARO: Launch Question when cell is selected and question not open yet */}
            {roomState?.mode === "GRID_CARO" && !currentQuestion && roomState.gridCaroState?.selectedCellId && (
              <button
                onClick={() => emit("admin:grid:launch_question")}
                className="py-3.5 px-4 rounded-xl bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white font-black text-base col-span-2 shadow-xl animate-pulse inline-flex items-center justify-center gap-2 whitespace-nowrap"
              >
                <span>📖</span>
                <span className="whitespace-nowrap">Hiện câu hỏi cho ô #{roomState.gridCaroState.selectedCellId}</span>
              </button>
            )}

            {roomState?.mode === "GRID_CARO" && roomState?.status !== "LOBBY" ? null : (
              <button
                onClick={() => emit("admin:next", { code })}
                disabled={gameEnded}
                className={`py-3 rounded-xl bg-gradient-to-r from-purple-600 to-cyan-600 font-bold disabled:opacity-50 col-span-2 shadow inline-flex items-center justify-center gap-2 whitespace-nowrap ${
                  roomState?.mode === "DICE_RACE" && !currentQuestion ? "animate-pulse ring-2 ring-cyan-400" : ""
                }`}
              >
                <SystemIcon name={roomState?.status === "LOBBY" ? "play" : "next"} className="w-4 h-4 shrink-0" />
                <span className="whitespace-nowrap">
                  {roomState?.status === "LOBBY"
                    ? "Bắt đầu game"
                    : roomState?.mode === "DICE_RACE" && !currentQuestion
                    ? "🎯 Hiện câu hỏi"
                    : "Câu tiếp theo"}
                </span>
              </button>
            )}

            {/* Tiết lộ đáp án button */}
            {(!revealPayload || roomState?.mode !== "GRID_CARO") && (
              <button
                onClick={() => emit("admin:reveal", { code })}
                disabled={!currentQuestion || !!revealPayload}
                className={`py-3 rounded-xl font-bold text-sm inline-flex items-center justify-center gap-2 whitespace-nowrap transition-all ${
                  roomState?.mode === "GRID_CARO" && !revealPayload && (timerDisplayRemaining === 0)
                    ? "col-span-2 bg-gradient-to-r from-amber-500 to-green-500 hover:from-amber-400 hover:to-green-400 text-black font-black text-base shadow-2xl animate-pulse ring-4 ring-green-400/50"
                    : "border border-green-500/50 hover:bg-green-500/10 text-green-400 disabled:opacity-40"
                }`}
              >
                <span>👁️</span>
                <span className="whitespace-nowrap">
                  {roomState?.mode === "GRID_CARO" && !revealPayload && (timerDisplayRemaining === 0)
                    ? "Tiết lộ đáp án & Chốt điểm (Hết giờ 0s)"
                    : "Tiết lộ đáp án"}
                </span>
              </button>
            )}

            {/* Chuyển qua bàn cờ cho DICE_RACE */}
            {roomState?.mode === "DICE_RACE" && revealPayload && (
              <button
                onClick={() => emit("admin:dice:advance_to_board", { code })}
                className="py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-black font-black text-sm shadow-xl inline-flex items-center justify-center gap-2 whitespace-nowrap transition active:scale-95 animate-pulse cursor-pointer"
              >
                <span>🗺️</span>
                <span className="whitespace-nowrap">Chuyển qua bàn cờ đường đua</span>
              </button>
            )}
            {/* Dừng thời gian sớm button */}
            {currentQuestion && !revealPayload && (
              <button
                onClick={() => emit("admin:timer:stop_early")}
                disabled={Boolean(timer && timerDisplayRemaining <= 0)}
                className="py-2.5 rounded-xl border border-rose-500/50 hover:bg-rose-500/20 text-rose-300 font-bold text-sm inline-flex items-center justify-center gap-1.5 whitespace-nowrap transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                title="Dừng thời gian câu hỏi ngay lập tức"
              >
                <span>⏹️</span>
                <span className="whitespace-nowrap">Dừng giờ sớm</span>
              </button>
            )}

            {roomState?.status === "PLAYING" ? (
              <button onClick={() => emit("admin:pause")} className="py-2.5 rounded-xl border border-yellow-500/50 hover:bg-yellow-500/10 text-yellow-400 font-medium text-sm inline-flex items-center justify-center gap-1.5 whitespace-nowrap">
                <SystemIcon name="pause" className="w-3.5 h-3.5 shrink-0" />
                <span className="whitespace-nowrap">Tạm dừng</span>
              </button>
            ) : roomState?.status === "PAUSED" ? (
              <button onClick={() => emit("admin:resume")} className="py-2.5 rounded-xl border border-green-500/50 hover:bg-green-500/10 text-green-400 font-medium text-sm inline-flex items-center justify-center gap-1.5 whitespace-nowrap">
                <SystemIcon name="play" className="w-3.5 h-3.5 shrink-0" />
                <span className="whitespace-nowrap">Tiếp tục</span>
              </button>
            ) : <div />}
          </div>

          {/* Power-up controls */}
          {roomState?.config.powerupEnabled && (
            <div className="border-t border-border pt-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium whitespace-nowrap">🃏 Thẻ hỗ trợ (Đã bật cho phòng)</p>
                <button
                  onClick={() => handleToggleCards(!cardsLocked)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold whitespace-nowrap ${ cardsLocked ? "bg-red-500/20 text-red-400" : "bg-green-500/20 text-green-400" }`}
                >
                  {cardsLocked ? "🔒 Đang khóa" : "🔓 Đang mở"}
                </button>
              </div>
              <button
                onClick={() => emit("admin:shuffle:cards")}
                className="mt-2 w-full py-2 rounded-xl border border-border hover:border-purple-500 text-sm font-medium transition-colors whitespace-nowrap"
              >
                🔀 Xáo lại thẻ
              </button>
            </div>
          )}
        </div>

        {/* Leaderboard */}
        <div className="glass rounded-2xl p-6">
          <h2 className="font-bold text-lg mb-4 inline-flex items-center gap-2">
            <SystemIcon name="trophy" className="w-5 h-5 text-amber-400 shrink-0" />
            <span>Bảng xếp hạng</span>
          </h2>
          <div className="space-y-2">
            {sortedEntries.slice(0, 10).map((entry: any, i) => (
              <div key={entry.id} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: `${entry.color ?? "#6366f1"}20` }}>
                <span className="w-8 text-lg font-black text-center">{i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}`}</span>
                <div className="flex-1">
                  <p className="font-medium truncate">{entry.name}</p>
                  <p className="text-xs text-muted-foreground">{entry.playerCount !== undefined ? `${entry.playerCount} người` : ""}</p>
                </div>
                <span className="font-black text-cyan-400">{entry.score.toLocaleString()}</span>
              </div>
            ))}
            {sortedEntries.length === 0 && (
              <p className="text-muted-foreground text-center py-4">Chưa có người tham gia</p>
            )}
          </div>

          {/* Essay grading section */}
          {revealPayload?.answers.some((a) => a.isCorrect === null || a.isCorrect === undefined) && (
            <div className="mt-4 border-t border-border pt-4">
              <h3 className="text-sm font-bold mb-3">✏️ Chấm tự luận</h3>
              {revealPayload.answers
                .filter((a) => !a.isCorrect && a.pointsAwarded === 0)
                .map((a, i) => (
                  <div key={i} className="glass rounded-lg p-3 mb-2">
                    <p className="text-sm text-muted-foreground">{a.name}</p>
                    <p className="text-sm mt-1">{Array.isArray(a.answer) ? a.answer.join(", ") : a.answer}</p>
                    <div className="flex gap-2 mt-2">
                      <input
                        type="number"
                        placeholder="Điểm"
                        className="w-20 px-2 py-1 rounded-lg bg-input border border-border text-sm focus:outline-none"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            const pts = parseInt((e.target as HTMLInputElement).value);
                            if (!isNaN(pts)) emit("admin:score:manual", { answerId: (a as any).id, points: pts });
                          }
                        }}
                      />
                      <span className="text-xs text-muted-foreground self-center">Enter để chấm</span>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>

      {/* Players/Teams grid */}
      <div className="glass rounded-2xl p-6">
        {(() => {
          const offlineCount = (roomState?.players ?? []).filter((p) => !p.isOnline).length;
          return (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <h2 className="font-bold text-lg inline-flex items-center gap-2">
                <SystemIcon name="team" className="w-5 h-5 text-cyan-400 shrink-0" />
                <span>{roomState?.teamMode === "TEAM" ? `Danh sách Đội (${roomState.teams.length}) · Thí sinh: ${roomState.players.length} người` : `Thí sinh (${roomState?.players.length ?? 0})`}</span>
              </h2>
              {roomState?.status === "LOBBY" && offlineCount > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    if (confirm(`Dọn dẹp và xoá tất cả ${offlineCount} thí sinh offline khỏi phòng?`)) {
                      socketRef.current?.emit("admin:clean:offline", (res) => {
                        if (res?.success) alert(`Đã dọn dẹp ${res.count ?? offlineCount} thí sinh offline`);
                      });
                    }
                  }}
                  className="px-3 py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/40 text-xs font-bold transition flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
                >
                  <span>🧹</span> Dọn dẹp thí sinh offline ({offlineCount})
                </button>
              )}
            </div>
          );
        })()}

        {/* Warning if any players have not picked a team yet */}
        {roomState?.teamMode === "TEAM" && (() => {
          const unassigned = roomState.players.filter((p) => !p.teamId);
          if (unassigned.length === 0) return null;
          return (
            <div className="mb-4 p-3.5 rounded-xl bg-yellow-500/10 border border-yellow-500/30 text-yellow-200 text-sm flex flex-col gap-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-base">⚠️</span>
                  <span>
                    <strong>Thí sinh chưa chọn đội ({unassigned.length}):</strong>
                  </span>
                </div>
                <span className="text-xs text-yellow-400/80 italic">
                  (Thí sinh cần bấm &quot;Vào đội này&quot; trên thiết bị của họ)
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {unassigned.map((p) => (
                  <span
                    key={p.id}
                    className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium border ${
                      p.isOnline
                        ? "bg-yellow-500/20 text-yellow-200 border-yellow-500/30"
                        : "bg-red-500/10 text-muted-foreground border-red-500/30"
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${p.isOnline ? "bg-green-400" : "bg-gray-500"}`} />
                    <span>{p.name}</span>
                    {!p.isOnline && <span className="text-[10px] text-red-400">(offline)</span>}
                    {roomState?.status === "LOBBY" && (
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm(`Xoá thí sinh "${p.name}" khỏi phòng?`)) {
                            socketRef.current?.emit("admin:kick:player", { playerId: p.id });
                          }
                        }}
                        className="ml-1 text-muted-foreground hover:text-red-400 cursor-pointer"
                        title="Xoá thí sinh này"
                      >
                        ✕
                      </button>
                    )}
                  </span>
                ))}
              </div>
            </div>
          );
        })()}

        {roomState?.teamMode === "TEAM" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {roomState.teams.map((team) => {
              const members = roomState.players.filter((p) => p.teamId === team.id);
              return (
                <div
                  key={team.id}
                  className="glass rounded-xl p-4 flex flex-col gap-2.5 border border-border/80 hover:border-purple-500/40 transition"
                  style={{ borderLeft: `4px solid ${team.color}` }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 text-white"
                        style={{ background: team.color }}
                      >
                        {team.name.charAt(0).toUpperCase()}
                      </div>
                      <p className="font-bold text-sm truncate">{team.name}</p>
                    </div>
                    <span className="text-xs font-black text-cyan-400">{team.score} pts</span>
                  </div>

                  <div className="text-xs text-muted-foreground flex items-center justify-between border-t border-border/40 pt-2">
                    <span>Thành viên:</span>
                    <span className={`font-semibold ${members.length > 0 ? "text-foreground" : "text-yellow-400/80"}`}>
                      {members.length} người
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-1.5 min-h-[28px]">
                    {members.length > 0 ? (
                      members.map((m) => (
                        <span
                          key={m.id}
                          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium border ${
                            m.isOnline
                              ? "bg-muted/60 text-foreground border-border/50"
                              : "bg-red-500/10 text-muted-foreground border-red-500/20"
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${m.isOnline ? "bg-green-400" : "bg-gray-500"}`} />
                          <span>{m.name}</span>
                          {!m.isOnline && <span className="text-[9px] text-red-400 font-normal">(off)</span>}
                          {roomState?.status === "LOBBY" && (
                            <button
                              type="button"
                              onClick={() => {
                                if (confirm(`Xoá thí sinh "${m.name}" khỏi phòng?`)) {
                                  socketRef.current?.emit("admin:kick:player", { playerId: m.id });
                                }
                              }}
                              title="Xoá thí sinh này"
                              className="ml-0.5 text-muted-foreground hover:text-red-400 transition cursor-pointer"
                            >
                              ✕
                            </button>
                          )}
                        </span>
                      ))
                    ) : (
                      <span className="text-[11px] text-muted-foreground italic">Chưa có ai vào đội</span>
                    )}
                  </div>
                  {team.isEliminated && <p className="text-xs text-red-400 font-bold mt-auto">❌ Đã bị loại</p>}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {(roomState?.players ?? []).map((entry) => (
              <div key={entry.id} className="glass rounded-xl p-3 text-center relative group">
                {roomState?.status === "LOBBY" && (
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm(`Xoá thí sinh "${entry.name}" khỏi phòng?`)) {
                        socketRef.current?.emit("admin:kick:player", { playerId: entry.id });
                      }
                    }}
                    title="Xoá thí sinh này"
                    className="absolute top-2 right-2 text-xs text-muted-foreground hover:text-red-400 cursor-pointer"
                  >
                    ✕
                  </button>
                )}
                <div
                  className="w-10 h-10 rounded-full mx-auto mb-2 flex items-center justify-center font-bold text-white relative"
                  style={{ background: "#6366f1" }}
                >
                  {entry.name.charAt(0).toUpperCase()}
                  <span
                    className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border border-black ${
                      entry.isOnline ? "bg-green-400" : "bg-gray-500"
                    }`}
                  />
                </div>
                <p className="text-sm font-medium truncate">{entry.name}</p>
                <p className="text-xs text-cyan-400 font-bold">{entry.score} pts</p>
                {!entry.isOnline && <p className="text-[10px] text-muted-foreground">(offline)</p>}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Rules Modal */}
      <GameModeRulesModal
        mode={roomState?.mode}
        isOpen={showRulesModal}
        onClose={() => setShowRulesModal(false)}
      />

      {/* Mobile Floating Action Bar for Host/Admin */}
      <div className="fixed bottom-0 left-0 right-0 p-3 bg-[#0f0f1a]/95 backdrop-blur-md border-t border-border flex items-center gap-2 z-40 lg:hidden shadow-2xl">
        <button
          onClick={() => emit("admin:next")}
          disabled={gameEnded}
          className="flex-1 py-3 px-2 rounded-xl bg-gradient-to-r from-purple-600 to-cyan-600 font-bold text-xs sm:text-sm text-white shadow active:scale-95 disabled:opacity-50 truncate inline-flex items-center justify-center gap-1.5"
        >
          <SystemIcon name={roomState?.status === "LOBBY" ? "play" : "next"} className="w-3.5 h-3.5 shrink-0" />
          <span>{roomState?.status === "LOBBY" ? "Bắt đầu" : "Câu tiếp"}</span>
        </button>

        <button
          onClick={() => emit("admin:reveal")}
          disabled={!currentQuestion}
          className="py-3 px-3 rounded-xl border border-green-500/50 bg-green-500/10 hover:bg-green-500/20 text-green-300 font-bold text-xs shrink-0 active:scale-95 disabled:opacity-40"
        >
          👁️ Mở đáp án
        </button>

        {roomState?.mode === "DICE_RACE" && revealPayload && (
          <button
            onClick={() => emit("admin:dice:advance_to_board")}
            className="py-3 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 text-black font-black text-xs shrink-0 active:scale-95 flex items-center gap-1 shadow animate-pulse"
          >
            <span>🗺️</span>
            <span>Về bàn cờ</span>
          </button>
        )}

        {roomState?.status === "PLAYING" ? (
          <button
            onClick={() => emit("admin:pause")}
            className="py-3 px-3 rounded-xl border border-yellow-500/50 bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-300 font-bold text-xs shrink-0 active:scale-95 inline-flex items-center justify-center gap-1"
          >
            <SystemIcon name="pause" className="w-3.5 h-3.5 shrink-0" />
            <span>Tạm dừng</span>
          </button>
        ) : roomState?.status === "PAUSED" ? (
          <button
            onClick={() => emit("admin:resume")}
            className="py-3 px-3 rounded-xl border border-green-500/50 bg-green-500/10 hover:bg-green-500/20 text-green-300 font-bold text-xs shrink-0 active:scale-95 inline-flex items-center justify-center gap-1"
          >
            <SystemIcon name="play" className="w-3.5 h-3.5 shrink-0" />
            <span>Tiếp tục</span>
          </button>
        ) : null}
      </div>
    </div>
  );
}
