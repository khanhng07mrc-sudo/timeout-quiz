"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { io, Socket } from "socket.io-client";
import type {
  ServerToClientEvents,
  ClientToServerEvents,
  RoomState,
  QuestionState,
  AnswerRevealPayload,
  BloomLevel,
} from "@/types";
import { BLOOM_METADATA, getBloomLevelFromPoints } from "@/types";
import Link from "next/link";

export default function AdminRoomPage() {
  const { code } = useParams<{ code: string }>();
  const socketRef = useRef<Socket<ServerToClientEvents, ClientToServerEvents> | null>(null);
  const [roomState, setRoomState] = useState<RoomState | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<QuestionState | null>(null);
  const [revealPayload, setRevealPayload] = useState<AnswerRevealPayload | null>(null);
  const [gameEnded, setGameEnded] = useState(false);
  const [timer, setTimer] = useState<{ remaining: number; total: number } | null>(null);
  const [cardsLocked, setCardsLocked] = useState(false);
  const [buzzedTeam, setBuzzedTeam] = useState<{ teamId?: string; teamName?: string; playerId: string; playerName: string } | null>(null);
  const [stealBuzzed, setStealBuzzed] = useState<{ teamId: string; teamName: string; playerId: string; playerName: string } | null>(null);
  const [isStealOpen, setIsStealOpen] = useState(false);

  useEffect(() => {
    const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io({ transports: ["websocket", "polling"] });
    socketRef.current = socket;

    socket.on("connect", () => {
      socket.emit("room:join", { code, playerName: "Admin Host" }, (result) => {
        if (result.success) setRoomState(result.roomState ?? null);
      });
    });

    socket.on("room:state", setRoomState);
    socket.on("game:question", (q) => {
      setCurrentQuestion(q);
      setRevealPayload(null);
      setTimer(null);
      setBuzzedTeam(null);
      setStealBuzzed(null);
      setIsStealOpen(false);
    });
    socket.on("game:timer", setTimer);
    socket.on("game:buzz", (p) => {
      setBuzzedTeam(p);
    });
    socket.on("game:bounceback:open_steal", () => {
      setIsStealOpen(true);
      setStealBuzzed(null);
    });
    socket.on("game:bounceback:steal_buzzed", (p) => {
      setIsStealOpen(false);
      setStealBuzzed(p);
    });
    socket.on("game:buzz:closed", () => {
      setIsStealOpen(false);
    });
    socket.on("game:answer:reveal", (p) => {
      setRevealPayload(p);
      setIsStealOpen(false);
    });
    socket.on("game:score:update", (scores) => {
      setRoomState((prev) => {
        if (!prev) return prev;
        const teams = prev.teams.map((t) => { const u = scores.find((s) => s.teamId === t.id); return u ? { ...t, score: u.score } : t; });
        const players = prev.players.map((p) => { const u = scores.find((s) => s.playerId === p.id); return u ? { ...p, score: u.score } : p; });
        return { ...prev, teams, players };
      });
    });
    socket.on("game:ended", () => setGameEnded(true));
    socket.on("game:paused", () => setRoomState((s) => s ? { ...s, status: "PAUSED" } : s));
    socket.on("game:resumed", () => setRoomState((s) => s ? { ...s, status: "PLAYING" } : s));

    return () => {
      socket.disconnect();
    };
  }, [code]);

  const emit = (event: keyof ClientToServerEvents, ...args: any[]) => {
    (socketRef.current?.emit as any)(event, ...args);
  };

  const handleToggleCards = (locked: boolean) => {
    setCardsLocked(locked);
    emit("admin:lock:cards", locked);
  };

  const handleAdminSubmitAnswer = (answerId: string) => {
    if (!currentQuestion) return;
    emit("admin:submit:answer", {
      questionId: currentQuestion.question.id,
      answer: answerId,
    });
  };

  const sortedEntries = roomState
    ? (roomState.teamMode === "TEAM" ? [...roomState.teams] : [...roomState.players])
        .sort((a: any, b: any) => b.score - a.score)
    : [];

  const bloom: BloomLevel = currentQuestion
    ? (currentQuestion.bloomLevel ?? getBloomLevelFromPoints(currentQuestion.question.points))
    : "REMEMBER";
  const bloomMeta = BLOOM_METADATA[bloom];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black">{roomState?.name ?? "Phòng đang tải..."}</h1>
            {roomState?.mode && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                Mode: {roomState.mode}
              </span>
            )}
            {roomState?.config.answerMethod === "MC" && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                🎙️ Trả lời qua MC
              </span>
            )}
          </div>
          <p className="text-muted-foreground mt-1">
            Mã: <span className="font-mono font-bold text-white">{code}</span>
            {" "}· Trạng thái: <span className={`font-bold ${ roomState?.status === "PLAYING" ? "text-green-400" : roomState?.status === "PAUSED" ? "text-yellow-400" : roomState?.status === "FINISHED" ? "text-red-400" : "text-cyan-400" }`}>{roomState?.status ?? "..."}</span>
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/display/${code}`}
            target="_blank"
            className="px-4 py-2 rounded-xl glass border border-border hover:border-purple-500 font-medium text-sm transition-colors"
          >
            📺 Màn chiếu
          </Link>
          <a
            href={`/play/${code}`}
            target="_blank"
            className="px-4 py-2 rounded-xl glass border border-border hover:border-cyan-500 font-medium text-sm transition-colors"
          >
            🔗 Link tham gia
          </a>
        </div>
      </div>

      {gameEnded && (
        <div className="glass rounded-xl p-6 text-center border border-green-500/50">
          <p className="text-2xl font-black">🏆 Game đã kết thúc!</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Game controls */}
        <div className="glass rounded-2xl p-6 space-y-4">
          <h2 className="font-bold text-lg">⚡ Điều khiển game</h2>

          {/* Timer display */}
          {timer && (
            <div className="text-center py-1">
              <div className="text-5xl font-black" style={{ color: timer.remaining < 5 ? "#ef4444" : timer.remaining < 10 ? "#f59e0b" : "#06b6d4" }}>
                {timer.remaining}s
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
              {currentQuestion.question.options && (
                <div className="space-y-2 pt-3 border-t border-border/60">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-cyan-300">🎙️ Click chọn đáp án trên máy Admin:</span>
                    <span className="text-[10px] text-green-400 font-medium">Luôn chọn được kể cả khi hết giờ</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {currentQuestion.question.options.map((opt, i) => {
                      const labels = ["A", "B", "C", "D"];
                      return (
                        <button
                          key={opt.id}
                          onClick={() => handleAdminSubmitAnswer(opt.id)}
                          className="flex items-center gap-2.5 p-2.5 rounded-lg border border-border hover:border-cyan-400 hover:bg-cyan-500/10 text-left text-sm transition-all active:scale-95 group"
                        >
                          <span className="w-6 h-6 rounded bg-muted flex items-center justify-center text-xs font-black group-hover:bg-cyan-500 group-hover:text-black">
                            {labels[i] ?? i + 1}
                          </span>
                          <span className="truncate flex-1">{opt.text}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Control buttons */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <button
              onClick={() => emit("admin:next")}
              disabled={gameEnded}
              className="py-3 rounded-xl bg-gradient-to-r from-purple-600 to-cyan-600 font-bold disabled:opacity-50 col-span-2 shadow"
            >
              {roomState?.status === "LOBBY" ? "🚀 Bắt đầu game" : "➡️ Câu tiếp theo"}
            </button>
            <button
              onClick={() => emit("admin:reveal")}
              disabled={!currentQuestion}
              className="py-2.5 rounded-xl border border-green-500/50 hover:bg-green-500/10 text-green-400 font-medium text-sm disabled:opacity-50"
            >
              👁️ Tiết lộ đáp án
            </button>
            {roomState?.status === "PLAYING" ? (
              <button onClick={() => emit("admin:pause")} className="py-2.5 rounded-xl border border-yellow-500/50 hover:bg-yellow-500/10 text-yellow-400 font-medium text-sm">
                ⏸️ Tạm dừng
              </button>
            ) : roomState?.status === "PAUSED" ? (
              <button onClick={() => emit("admin:resume")} className="py-2.5 rounded-xl border border-green-500/50 hover:bg-green-500/10 text-green-400 font-medium text-sm">
                ▶️ Tiếp tục
              </button>
            ) : <div />}
          </div>

          {/* Power-up controls */}
          {roomState?.config.powerupEnabled && (
            <div className="border-t border-border pt-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">🃏 Thẻ hỗ trợ (Đã bật cho phòng)</p>
                <button
                  onClick={() => handleToggleCards(!cardsLocked)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold ${ cardsLocked ? "bg-red-500/20 text-red-400" : "bg-green-500/20 text-green-400" }`}
                >
                  {cardsLocked ? "🔒 Đang khóa" : "🔓 Đang mở"}
                </button>
              </div>
              <button
                onClick={() => emit("admin:shuffle:cards")}
                className="mt-2 w-full py-2 rounded-xl border border-border hover:border-purple-500 text-sm font-medium transition-colors"
              >
                🔀 Xáo lại thẻ
              </button>
            </div>
          )}
        </div>

        {/* Leaderboard */}
        <div className="glass rounded-2xl p-6">
          <h2 className="font-bold text-lg mb-4">🏆 Bảng xếp hạng</h2>
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
        <h2 className="font-bold text-lg mb-4">👥 {roomState?.teamMode === "TEAM" ? "Đội" : "Người chơi"} ({(roomState?.teamMode === "TEAM" ? roomState?.teams : roomState?.players)?.length ?? 0})</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {(roomState?.teamMode === "TEAM" ? roomState.teams : roomState?.players ?? []).map((entry: any) => (
            <div key={entry.id} className="glass rounded-xl p-3 text-center">
              <div className="w-10 h-10 rounded-full mx-auto mb-2 flex items-center justify-center font-bold" style={{ background: entry.color ?? "#6366f1" }}>
                {entry.name.charAt(0).toUpperCase()}
              </div>
              <p className="text-sm font-medium truncate">{entry.name}</p>
              <p className="text-xs text-cyan-400 font-bold">{entry.score} pts</p>
              {entry.isEliminated && <p className="text-xs text-red-400">❌ Loại</p>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
