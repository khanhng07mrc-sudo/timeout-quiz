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
} from "@/types";
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

  useEffect(() => {
    const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io({ transports: ["websocket", "polling"] });
    socketRef.current = socket;

    socket.on("connect", () => {
      socket.emit("room:join", { code, playerName: "Admin Host" }, (result) => {
        if (result.success) setRoomState(result.roomState ?? null);
      });
    });

    socket.on("room:state", setRoomState);
    socket.on("game:question", (q) => { setCurrentQuestion(q); setRevealPayload(null); setTimer(null); });
    socket.on("game:timer", setTimer);
    socket.on("game:answer:reveal", setRevealPayload);
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

  const sortedEntries = roomState
    ? (roomState.teamMode === "TEAM" ? [...roomState.teams] : [...roomState.players])
        .sort((a: any, b: any) => b.score - a.score)
    : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black">{roomState?.name ?? "Phòng đang tải..."}</h1>
          <p className="text-muted-foreground">
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
            <div className="text-center">
              <div className="text-5xl font-black" style={{ color: timer.remaining < 5 ? "#ef4444" : timer.remaining < 10 ? "#f59e0b" : "#06b6d4" }}>
                {timer.remaining}s
              </div>
            </div>
          )}

          {/* Question info */}
          {currentQuestion && (
            <div className="glass rounded-xl p-4">
              <p className="text-xs text-muted-foreground mb-1">Câu hiện tại ({currentQuestion.question.type})</p>
              <p className="font-medium line-clamp-2">{currentQuestion.question.content}</p>
            </div>
          )}

          {/* Control buttons */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => emit("admin:next")}
              disabled={gameEnded}
              className="py-3 rounded-xl bg-gradient-to-r from-purple-600 to-cyan-600 font-bold disabled:opacity-50 col-span-2"
            >
              {roomState?.status === "LOBBY" ? "🚀 Bắt đầu game" : "➡️ Câu tiếp theo"}
            </button>
            <button
              onClick={() => emit("admin:reveal")}
              disabled={!currentQuestion}
              className="py-2 rounded-xl border border-green-500/50 hover:bg-green-500/10 text-green-400 font-medium text-sm disabled:opacity-50"
            >
              👁️ Tiết lộ đáp án
            </button>
            {roomState?.status === "PLAYING" ? (
              <button onClick={() => emit("admin:pause")} className="py-2 rounded-xl border border-yellow-500/50 hover:bg-yellow-500/10 text-yellow-400 font-medium text-sm">
                ⏸️ Tạm dừng
              </button>
            ) : roomState?.status === "PAUSED" ? (
              <button onClick={() => emit("admin:resume")} className="py-2 rounded-xl border border-green-500/50 hover:bg-green-500/10 text-green-400 font-medium text-sm">
                ▶️ Tiếp tục
              </button>
            ) : <div />}
          </div>

          {/* Power-up controls */}
          {roomState?.config.powerupEnabled && (
            <div className="border-t border-border pt-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">🃏 Thẻ hỗ trợ</p>
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
