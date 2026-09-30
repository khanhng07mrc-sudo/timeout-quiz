"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { io, Socket } from "socket.io-client";
import type {
  ServerToClientEvents,
  ClientToServerEvents,
  RoomState,
  QuestionState,
  GameEndPayload,
  AnswerRevealPayload,
  PowerupUsedPayload,
  BloomLevel,
} from "@/types";
import { CARD_METADATA, BLOOM_METADATA, getBloomLevelFromPoints } from "@/types";

export default function DisplayPage() {
  const { code } = useParams<{ code: string }>();
  const socketRef = useRef<Socket<ServerToClientEvents, ClientToServerEvents> | null>(null);

  const [roomState, setRoomState] = useState<RoomState | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<QuestionState | null>(null);
  const [revealPayload, setRevealPayload] = useState<AnswerRevealPayload | null>(null);
  const [gameEnd, setGameEnd] = useState<GameEndPayload | null>(null);
  const [timer, setTimer] = useState<{ remaining: number; total: number } | null>(null);
  const [buzzed, setBuzzed] = useState<{ playerName: string } | null>(null);
  const [lastPowerup, setLastPowerup] = useState<PowerupUsedPayload | null>(null);
  const [isStealOpen, setIsStealOpen] = useState(false);
  const [stealBuzzed, setStealBuzzed] = useState<{ teamName: string; playerName: string } | null>(null);

  useEffect(() => {
    const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io({
      transports: ["websocket", "polling"],
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      socket.emit("display:join", code);
    });

    socket.on("room:state", setRoomState);
    socket.on("game:question", (q) => {
      setCurrentQuestion(q);
      setRevealPayload(null);
      setBuzzed(null);
      setTimer(null);
      setIsStealOpen(false);
      setStealBuzzed(null);
    });
    socket.on("game:timer", setTimer);
    socket.on("game:buzz", (p) => setBuzzed({ playerName: p.teamName ?? p.playerName }));
    socket.on("game:buzz:answering", (p) => setBuzzed({ playerName: p.teamName }));
    socket.on("game:bounceback:open_steal", () => {
      setIsStealOpen(true);
      setStealBuzzed(null);
    });
    socket.on("game:bounceback:steal_buzzed", (p) => {
      setIsStealOpen(false);
      setStealBuzzed({ teamName: p.teamName, playerName: p.playerName });
    });
    socket.on("game:buzz:closed", () => {
      setIsStealOpen(false);
    });
    socket.on("game:answer:reveal", (payload) => {
      setRevealPayload(payload);
      setIsStealOpen(false);
    });
    socket.on("game:powerup:used", (p) => {
      setLastPowerup(p);
      setTimeout(() => setLastPowerup(null), 4000);
    });
    socket.on("game:ended", setGameEnd);
    socket.on("game:score:update", (scores) => {
      setRoomState((prev) => {
        if (!prev) return prev;
        const teams = prev.teams.map((t) => {
          const u = scores.find((s) => s.teamId === t.id);
          return u ? { ...t, score: u.score } : t;
        });
        const players = prev.players.map((p) => {
          const u = scores.find((s) => s.playerId === p.id);
          return u ? { ...p, score: u.score } : p;
        });
        return { ...prev, teams, players };
      });
    });

    return () => {
      socket.disconnect();
    };
  }, [code]);

  // ── Leaderboard (game end) ──────────────────────────────────────────────────
  if (gameEnd) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8 bg-gradient-to-br from-purple-900 to-cyan-900">
        <h1 className="text-6xl font-black mb-2 text-white">🏆 Kết quả</h1>
        <p className="text-xl text-white/70 mb-12">Game kết thúc!</p>
        <div className="w-full max-w-2xl space-y-4">
          {gameEnd.leaderboard.slice(0, 10).map((entry) => (
            <div
              key={entry.rank}
              className={`flex items-center gap-6 p-6 rounded-2xl glass ${
                entry.rank === 1 ? "border-yellow-400 border-2 glow-cyan" : ""
              }`}
            >
              <span className="text-4xl font-black w-12">
                {entry.rank === 1 ? "🥇" : entry.rank === 2 ? "🥈" : entry.rank === 3 ? "🥉" : `#${entry.rank}`}
              </span>
              <div className="flex-1">
                <p className="text-2xl font-bold">{entry.name}</p>
                <p className="text-muted-foreground">{entry.correctAnswers}/{entry.totalAnswers} câu đúng</p>
              </div>
              <span className="text-3xl font-black text-cyan-400">{entry.score.toLocaleString()} pts</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── Lobby ──────────────────────────────────────────────────────────────────
  if (!roomState || roomState.status === "LOBBY") {
    const participants = roomState?.teamMode === "TEAM" ? roomState.teams : roomState?.players ?? [];
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8">
        <div className="text-center mb-12">
          <h1 className="text-7xl font-black bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
            {roomState?.name ?? "Timeout Quiz"}
          </h1>
          <p className="text-2xl text-muted-foreground mt-4">Mã phòng</p>
          <p className="text-8xl font-black font-mono tracking-widest text-white mt-2">{code}</p>
          <p className="text-muted-foreground mt-4">Vào play/{code} để tham gia</p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-4 max-w-4xl">
          {participants.slice(0, 10).map((p: any) => (
            <div key={p.id} className="glass rounded-xl p-4 text-center">
              <div className="w-12 h-12 rounded-full mx-auto mb-2 flex items-center justify-center text-xl font-bold" style={{ background: p.color ?? "#6366f1" }}>
                {p.name.charAt(0).toUpperCase()}
              </div>
              <p className="text-sm font-medium truncate">{p.name}</p>
            </div>
          ))}
        </div>
        {(participants.length > 10) && <p className="text-muted-foreground mt-4">+{participants.length - 10} người khác</p>}
      </div>
    );
  }

  // ── Active Game ────────────────────────────────────────────────────────────
  const sortedTeams = [...(roomState.teamMode === "TEAM" ? roomState.teams : roomState.players)]
    .sort((a: any, b: any) => b.score - a.score)
    .slice(0, 10);

  const timerPercent = timer ? (timer.remaining / timer.total) * 100 : 100;
  const timerColor = timerPercent > 50 ? "#06b6d4" : timerPercent > 25 ? "#f59e0b" : "#ef4444";

  const bloom: BloomLevel = currentQuestion
    ? (currentQuestion.bloomLevel ?? getBloomLevelFromPoints(currentQuestion.question.points))
    : "REMEMBER";
  const bloomMeta = BLOOM_METADATA[bloom];

  return (
    <div className="min-h-screen grid grid-cols-[1fr_340px] gap-4 p-4">
      {/* Main content area */}
      <div className="flex flex-col gap-4">
        {/* Powerup notification */}
        {lastPowerup && (
          <div className="glass rounded-xl p-4 flex items-center gap-3 animate-bounce-in border border-purple-500/50">
            <span className="text-3xl">{CARD_METADATA[lastPowerup.type].emoji}</span>
            <div>
              <p className="font-bold">{lastPowerup.usedByName} dùng thẻ!</p>
              <p className="text-muted-foreground">{lastPowerup.effect}</p>
            </div>
          </div>
        )}

        {/* Bounceback Steal notifications */}
        {isStealOpen && (
          <div className="bg-gradient-to-r from-amber-500 to-yellow-500 text-black rounded-xl p-4 text-center font-black text-2xl animate-bounce shadow-xl">
            ⚡ MỞ CHUÔNG CƯỚP LƯỢT (5s) — CÁC ĐỘI HÃY BẤM CHUÔNG!
          </div>
        )}

        {stealBuzzed && (
          <div className="bg-purple-600 text-white rounded-xl p-4 text-center font-black text-2xl animate-bounce-in shadow-xl">
            ⚡ ĐỘI {stealBuzzed.teamName.toUpperCase()} ĐÃ CƯỚP CHUÔNG THÀNH CÔNG!
          </div>
        )}

        {/* Buzz notification */}
        {buzzed && (
          <div className="bg-yellow-500 text-black rounded-xl p-4 text-center font-black text-2xl animate-bounce-in shadow-xl">
            ⚡ ĐỘI {buzzed.playerName.toUpperCase()} BUZZ!
          </div>
        )}

        {/* Question */}
        {currentQuestion && (
          <div className="flex-1 glass rounded-2xl p-8 flex flex-col justify-between">
            <div>
              {/* Timer & Turn Info */}
              <div className="flex items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-4">
                  {timer && (
                    <svg className="w-16 h-16" viewBox="0 0 64 64">
                      <circle cx="32" cy="32" r="28" fill="none" stroke="#2d2d5a" strokeWidth="6" />
                      <circle
                        cx="32" cy="32" r="28"
                        fill="none"
                        stroke={timerColor}
                        strokeWidth="6"
                        strokeDasharray={`${2 * Math.PI * 28}`}
                        strokeDashoffset={`${2 * Math.PI * 28 * (1 - timerPercent / 100)}`}
                        className="timer-ring transition-all duration-1000"
                      />
                      <text x="32" y="38" textAnchor="middle" fill="white" fontSize="18" fontWeight="bold">
                        {timer.remaining}
                      </text>
                    </svg>
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground font-semibold">
                        Câu {roomState.currentQuestionIndex + 1} / {roomState.totalQuestions}
                      </span>
                      <span
                        className="px-2.5 py-0.5 rounded-full text-xs font-bold border"
                        style={{ color: bloomMeta.color, borderColor: `${bloomMeta.color}40`, background: bloomMeta.bg }}
                      >
                        {bloomMeta.emoji} {bloomMeta.labelVi} ({currentQuestion.question.points}đ)
                      </span>
                    </div>

                    {/* Mode specific info banner */}
                    {roomState.mode === "BOUNCEBACK" && (
                      <p className="text-lg font-black text-cyan-300 mt-1">
                        🎯 Lượt trả lời chính: {currentQuestion.primaryTeamName ?? "..."}
                      </p>
                    )}
                    {roomState.config.answerMethod === "MC" && (
                      <p className="text-xs text-yellow-300 font-medium mt-0.5">
                        🎙️ Chế độ trả lời miệng qua MC / Ban giám khảo
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Question content */}
              <h2 className="text-3xl font-bold mb-6 leading-relaxed">{currentQuestion.question.content}</h2>

              {currentQuestion.question.mediaUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={currentQuestion.question.mediaUrl} alt="Question media" className="max-h-64 rounded-xl mb-6 mx-auto" />
              )}

              {/* Options */}
              {currentQuestion.question.options && (
                <div className="grid grid-cols-2 gap-4">
                  {currentQuestion.question.options.map((opt, i) => {
                    const labels = ["A", "B", "C", "D", "E", "F"];
                    const isRevealed = revealPayload?.correctAnswer.includes(opt.id);
                    return (
                      <div
                        key={opt.id}
                        className={`p-5 rounded-xl border-2 transition-all text-xl font-medium ${
                          revealPayload
                            ? isRevealed
                              ? "border-green-500 bg-green-500/20 text-green-300 ring-2 ring-green-500/50"
                              : "border-border opacity-40"
                            : "border-border glass"
                        }`}
                      >
                        <span className="font-black mr-3 text-purple-400">{labels[i]}.</span>
                        {opt.text}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Rarity & Team Results on Reveal */}
            {revealPayload && (
              <div className="mt-6 space-y-3 animate-slide-up">
                {revealPayload.rarityBonusPercent !== undefined && revealPayload.rarityBonusPercent > 0 && (
                  <div className="p-4 rounded-xl bg-gradient-to-r from-red-500/20 to-amber-500/20 border border-amber-500/40 text-center animate-bounce-in">
                    <p className="font-black text-amber-300 text-lg">
                      🔥 CÂU HỎI HÓC BÚA (Độ hiếm toàn phòng: {Math.round((revealPayload.roomAccuracy ?? 0) * 100)}% đúng)
                    </p>
                    <p className="text-sm text-amber-200/90 mt-1">
                      Các đội đúng được cộng thưởng thêm <strong>+{revealPayload.rarityBonusPercent}%</strong> điểm hiếm thực nghiệm!
                    </p>
                  </div>
                )}

                {revealPayload.teamSummaries && revealPayload.teamSummaries.length > 0 && (
                  <div className="p-4 rounded-2xl glass border border-purple-500/40">
                    <h3 className="font-bold text-base mb-3 text-cyan-400 flex items-center gap-2">
                      <span>📊</span> Điểm đồng đội câu này:
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {revealPayload.teamSummaries.map((ts) => (
                        <div key={ts.teamId} className="p-3 rounded-xl bg-card border border-border flex items-center justify-between">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="w-4 h-4 rounded-full shrink-0" style={{ background: ts.teamColor }} />
                            <span className="font-bold truncate text-base">{ts.teamName}</span>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-xs text-muted-foreground">{ts.correctMembers}/{ts.totalOnlineMembers} đúng</p>
                            <p className={`font-mono font-bold text-lg ${ts.pointsAwarded >= 0 ? "text-green-400" : "text-red-400"}`}>
                              {ts.pointsAwarded >= 0 ? `+${ts.pointsAwarded}` : ts.pointsAwarded} pts
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {!currentQuestion && (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-3xl text-muted-foreground">⏳ Chờ câu hỏi tiếp theo...</p>
          </div>
        )}
      </div>

      {/* Leaderboard sidebar */}
      <div className="glass rounded-2xl p-4 flex flex-col gap-2">
        <h3 className="text-lg font-bold mb-2">🏆 Bảng điểm</h3>
        {sortedTeams.map((entry: any, i) => (
          <div key={entry.id} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: `${entry.color ?? "#6366f1"}20` }}>
            <span className="text-xl font-black w-8">{i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}`}</span>
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{entry.name}</p>
            </div>
            <span className="font-black text-cyan-400">{entry.score.toLocaleString()}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
