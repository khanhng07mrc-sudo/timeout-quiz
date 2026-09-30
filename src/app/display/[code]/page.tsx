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
  GamePreparePayload,
} from "@/types";
import { CARD_METADATA, BLOOM_METADATA, getBloomLevelFromPoints } from "@/types";
import PowerupIcon from "@/components/ui/PowerupIcon";
import { soundManager } from "@/lib/sound-manager";
import TournamentBracket from "@/components/modes/TournamentBracket";
import GridCaroBoard from "@/components/modes/GridCaroBoard";
import DiceRaceTrack from "@/components/modes/DiceRaceTrack";
import WagerPanel from "@/components/modes/WagerPanel";

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

  const [matchStarting, setMatchStarting] = useState<{ seconds: number } | null>(null);
  const [questionPrepare, setQuestionPrepare] = useState<GamePreparePayload | null>(null);
  const [soundMuted, setSoundMuted] = useState(false);
  const [audioUnlocked, setAudioUnlocked] = useState(false);

  // Local ticker for match warmup countdown (5s)
  useEffect(() => {
    if (!matchStarting || matchStarting.seconds <= 0) return;
    const interval = setInterval(() => {
      setMatchStarting((prev) => {
        if (!prev) return null;
        const next = prev.seconds - 1;
        if (next >= 0) {
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
        if (next >= 0) {
          soundManager.playCountdownTick(next);
        }
        return next > 0 ? { ...prev, seconds: next } : null;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [questionPrepare]);

  useEffect(() => {
    // Default sound ON on Display
    soundManager.setMuted(false);
    soundManager.setVolume(0.8);

    const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io({
      transports: ["websocket", "polling"],
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      socket.emit("display:join", code);
    });

    socket.on("room:state", (state) => {
      setRoomState(state);
      if (state.status === "LOBBY") {
        soundManager.playLobbyMusic();
      }
    });

    socket.on("game:starting", (p) => {
      setMatchStarting({ seconds: p.seconds });
      setQuestionPrepare(null);
      setCurrentQuestion(null);
      setRevealPayload(null);
      soundManager.stopMusic();
      soundManager.playCountdownTick(p.seconds);
    });

    socket.on("game:prepare", (p) => {
      setMatchStarting(null);
      setQuestionPrepare(p);
      setCurrentQuestion(null);
      setRevealPayload(null);
      soundManager.stopMusic();
      soundManager.playCountdownTick(p.seconds);
    });

    socket.on("game:question", (q) => {
      setMatchStarting(null);
      setQuestionPrepare(null);
      setCurrentQuestion(q);
      setRevealPayload(null);
      setBuzzed(null);
      setTimer(null);
      setIsStealOpen(false);
      setStealBuzzed(null);
      soundManager.playCountdownTick(0);
      soundManager.playQuestionMusic(q.timeLimit);
    });

    socket.on("game:timer", setTimer);
    socket.on("game:buzz", (p) => {
      setBuzzed({ playerName: p.teamName ?? p.playerName });
      soundManager.playBuzz();
    });
    socket.on("game:buzz:answering", (p) => setBuzzed({ playerName: p.teamName }));
    socket.on("game:bounceback:open_steal", () => {
      setIsStealOpen(true);
      setStealBuzzed(null);
    });
    socket.on("game:bounceback:steal_buzzed", (p) => {
      setIsStealOpen(false);
      setStealBuzzed({ teamName: p.teamName, playerName: p.playerName });
      soundManager.playBuzz();
    });
    socket.on("game:buzz:closed", () => {
      setIsStealOpen(false);
    });
    socket.on("game:answer:reveal", (payload) => {
      setRevealPayload(payload);
      setIsStealOpen(false);
      soundManager.stopMusic();
      if (payload.answers?.some((a) => a.isCorrect)) {
        soundManager.playCorrect();
      } else {
        soundManager.playWrong();
      }
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
    socket.on("game:grid:caro:celebrate", () => {
      soundManager.playCorrect();
    });
    socket.on("game:dice:rolled", () => {
      soundManager.playBuzz();
    });
    socket.on("game:powerup:used", (p) => {
      setLastPowerup(p);
      soundManager.playPowerup();
      setTimeout(() => setLastPowerup(null), 4000);
    });
    socket.on("game:ended", (payload) => {
      soundManager.stopMusic();
      soundManager.playFanfare();
      setGameEnd(payload);
    });
    socket.on("game:paused", () => {
      soundManager.stopMusic();
      setRoomState((s) => s ? { ...s, status: "PAUSED" } : s);
    });
    socket.on("game:resumed", () => {
      setRoomState((s) => s ? { ...s, status: "PLAYING" } : s);
      soundManager.playQuestionMusic();
    });
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
      soundManager.stopMusic();
      socket.disconnect();
    };
  }, [code]);

  const handleUnlockAudio = () => {
    soundManager.unlockAudio();
    soundManager.setMuted(false);
    setAudioUnlocked(true);
    setSoundMuted(false);
    if (!matchStarting && !questionPrepare) {
      if (roomState?.status === "LOBBY") {
        soundManager.playLobbyMusic();
      } else if (currentQuestion && !revealPayload) {
        soundManager.playQuestionMusic();
      }
    }
  };

  const toggleSound = () => {
    const next = !soundMuted;
    setSoundMuted(next);
    soundManager.setMuted(next);
    if (!next) {
      handleUnlockAudio();
    }
  };

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

  // ── Match Warmup Countdown (5s) ──────────────────────────────────────────
  if (matchStarting) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center p-8 bg-gradient-to-br from-purple-950 via-[#0f0f1a] to-cyan-950 relative overflow-hidden cursor-pointer"
        onClick={handleUnlockAudio}
      >
        {/* Floating Sound Toggle */}
        <div className="absolute top-6 right-6 z-20">
          <button
            onClick={(e) => { e.stopPropagation(); toggleSound(); }}
            className="px-4 py-2 rounded-xl glass border border-white/20 text-sm font-bold flex items-center gap-2 hover:bg-white/10 transition"
          >
            {soundMuted ? "🔇 Đã tắt âm" : "🔊 Âm thanh: BẬT"}
          </button>
        </div>

        {!audioUnlocked && (
          <div
            onClick={handleUnlockAudio}
            className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-6 py-2.5 rounded-full bg-gradient-to-r from-purple-600 to-cyan-600 text-white text-xs sm:text-sm font-bold shadow-xl border border-white/30 cursor-pointer flex items-center gap-2 animate-bounce"
          >
            <span>🔊</span>
            <span>Nhấp chuột bất kỳ đâu để bật âm thanh hội trường</span>
          </div>
        )}

        <div className="text-center z-10 max-w-2xl space-y-6 animate-slide-up">
          <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 text-sm font-bold uppercase tracking-widest">
            ⚡ Chuẩn bị bắt đầu trận đấu
          </div>
          <h1 className="text-5xl sm:text-7xl font-black bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent">
            {roomState?.name ?? "Timeout Quiz"}
          </h1>
          <p className="text-xl text-white/70">
            Các đội và người chơi hãy sẵn sàng trên thiết bị của mình!
          </p>
          <div className="py-6">
            <div className="inline-flex items-center justify-center w-40 h-40 rounded-full bg-gradient-to-br from-purple-600 to-cyan-600 text-white text-8xl font-black shadow-2xl animate-bounce-in glow-purple border-4 border-white/20">
              {matchStarting.seconds}
            </div>
          </div>
          <p className="text-sm text-cyan-300 font-mono tracking-wider animate-pulse">
            Trận đấu sẽ bắt đầu ngay sau tiếng chuông...
          </p>
        </div>
      </div>
    );
  }

  // ── Question Preparation Countdown (3s) ──────────────────────────────────
  if (questionPrepare) {
    const bloom = questionPrepare.bloomLevel ?? getBloomLevelFromPoints(questionPrepare.points);
    const bloomMeta = BLOOM_METADATA[bloom];

    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center p-8 bg-gradient-to-br from-[#0c0d18] via-[#121429] to-[#0c1a2e] relative overflow-hidden cursor-pointer"
        onClick={handleUnlockAudio}
      >
        {/* Floating Sound Toggle */}
        <div className="absolute top-6 right-6 z-20">
          <button
            onClick={(e) => { e.stopPropagation(); toggleSound(); }}
            className="px-4 py-2 rounded-xl glass border border-white/20 text-sm font-bold flex items-center gap-2 hover:bg-white/10 transition"
          >
            {soundMuted ? "🔇 Đã tắt âm" : "🔊 Âm thanh: BẬT"}
          </button>
        </div>

        {!audioUnlocked && (
          <div
            onClick={handleUnlockAudio}
            className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-6 py-2.5 rounded-full bg-gradient-to-r from-purple-600 to-cyan-600 text-white text-xs sm:text-sm font-bold shadow-xl border border-white/30 cursor-pointer flex items-center gap-2 animate-bounce"
          >
            <span>🔊</span>
            <span>Nhấp chuột bất kỳ đâu để bật âm thanh hội trường</span>
          </div>
        )}

        <div className="w-full max-w-3xl glass rounded-3xl p-10 text-center border-2 border-purple-500/40 glow-purple space-y-8 animate-slide-up relative">
          <div className="flex items-center justify-between border-b border-border/60 pb-4">
            <span className="text-base font-bold text-muted-foreground uppercase tracking-widest">
              Câu hỏi {questionPrepare.questionIndex + 1} / {questionPrepare.totalQuestions}
            </span>
            <span
              className="px-4 py-1.5 rounded-full text-sm font-bold border"
              style={{ color: bloomMeta.color, borderColor: `${bloomMeta.color}60`, background: bloomMeta.bg }}
            >
              {bloomMeta.emoji} {bloomMeta.labelVi}
            </span>
          </div>

          <div className="space-y-3">
            <p className="text-sm uppercase tracking-wider text-cyan-300 font-semibold">Chuẩn bị</p>
            <h2 className="text-4xl sm:text-5xl font-black text-white">
              Sẵn sàng câu trả lời!
            </h2>
            <div className="flex items-center justify-center gap-6 pt-2 text-lg text-muted-foreground font-medium">
              <span>💰 Điểm: <strong className="text-cyan-400 font-bold">{questionPrepare.points} điểm</strong></span>
              <span>⏱️ Thời gian: <strong className="text-purple-400 font-bold">{questionPrepare.timeLimit}s</strong></span>
            </div>
            {questionPrepare.primaryTeamName && (
              <div className="mt-4 p-3 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-300 font-bold text-base inline-block">
                🎯 Lượt trả lời chính: {questionPrepare.primaryTeamName}
              </div>
            )}
          </div>

          <div className="pt-4 pb-2">
            <div className="inline-flex items-center justify-center w-36 h-36 rounded-full bg-gradient-to-br from-purple-600 via-indigo-600 to-cyan-500 text-white text-7xl font-black shadow-2xl animate-bounce-in glow-cyan border-4 border-white/30">
              {questionPrepare.seconds}
            </div>
          </div>

          <p className="text-sm text-white/50">Chú ý đọc nhanh nội dung câu hỏi khi xuất hiện</p>
        </div>
      </div>
    );
  }

  // ── Lobby ──────────────────────────────────────────────────────────────────
  if (!roomState || roomState.status === "LOBBY") {
    const isTeamMode = roomState?.teamMode === "TEAM";
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8 max-w-6xl mx-auto relative" onClick={handleUnlockAudio}>
        {/* Floating Sound Toggle */}
        <div className="absolute top-6 right-6 z-20">
          <button
            onClick={(e) => { e.stopPropagation(); toggleSound(); }}
            className="px-4 py-2 rounded-xl glass border border-white/20 text-sm font-bold flex items-center gap-2 hover:bg-white/10 transition"
          >
            {soundMuted ? "🔇 Đã tắt âm" : "🔊 Nhạc nền: BẬT"}
          </button>
        </div>

        {!audioUnlocked && (
          <div
            onClick={handleUnlockAudio}
            className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-6 py-2.5 rounded-full bg-gradient-to-r from-purple-600 to-cyan-600 text-white text-xs sm:text-sm font-bold shadow-xl border border-white/30 cursor-pointer flex items-center gap-2 animate-bounce"
          >
            <span>🔊</span>
            <span>Nhấp chuột bất kỳ đâu để bật nhạc nền và âm thanh hội trường</span>
          </div>
        )}

        <div className="text-center mb-10">
          <span className="px-4 py-1.5 rounded-full text-sm font-bold uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/30">
            {isTeamMode ? "Đấu Đội (Team Mode)" : "Cá Nhân (Individual)"}
          </span>
          <h1 className="text-6xl sm:text-7xl font-black bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent mt-3">
            {roomState?.name ?? "Timeout Quiz"}
          </h1>
          <p className="text-xl text-muted-foreground mt-4">Mã phòng tham gia</p>
          <div className="inline-block mt-2 px-8 py-3 rounded-2xl glass border-2 border-purple-500/40 glow-purple">
            <p className="text-7xl sm:text-8xl font-black font-mono tracking-widest text-cyan-300">{code}</p>
          </div>
          <p className="text-muted-foreground mt-4 text-lg">
            Truy cập <span className="text-white font-bold font-mono">/play/{code}</span> để tham gia
          </p>
        </div>

        {isTeamMode ? (
          <div className="w-full space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {roomState.teams.map((t) => {
                const members = roomState.players.filter((pl) => pl.teamId === t.id);
                return (
                  <div
                    key={t.id}
                    className="glass rounded-2xl p-5 border-2 flex flex-col justify-between"
                    style={{ borderColor: t.color }}
                  >
                    <div>
                      <div className="flex items-center gap-3 mb-3">
                        <div
                          className="w-12 h-12 rounded-full flex items-center justify-center text-xl font-black text-white shadow"
                          style={{ background: t.color }}
                        >
                          {t.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-lg truncate">{t.name}</p>
                          <p className="text-xs text-muted-foreground">{members.length} thành viên</p>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-1.5 min-h-[36px]">
                        {members.length > 0 ? (
                          members.map((m) => (
                            <span
                              key={m.id}
                              className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-muted/80 text-foreground border border-border/60"
                            >
                              {m.name}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-muted-foreground italic">Chờ thí sinh tham gia...</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {(() => {
              const unassigned = roomState.players.filter((pl) => !pl.teamId);
              if (unassigned.length === 0) return null;
              return (
                <div className="glass rounded-xl p-3 text-center text-sm text-yellow-300 border border-yellow-500/30">
                  ⚠️ <strong>Chưa chọn đội ({unassigned.length}):</strong> {unassigned.map((pl) => pl.name).join(", ")}
                </div>
              );
            })()}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-4 max-w-4xl w-full">
            {(roomState?.players ?? []).slice(0, 20).map((p) => (
              <div key={p.id} className="glass rounded-xl p-4 text-center">
                <div
                  className="w-12 h-12 rounded-full mx-auto mb-2 flex items-center justify-center text-xl font-bold text-white shadow"
                  style={{ background: "#6366f1" }}
                >
                  {p.name.charAt(0).toUpperCase()}
                </div>
                <p className="text-sm font-medium truncate">{p.name}</p>
              </div>
            ))}
          </div>
        )}
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
    <div className="min-h-screen grid grid-cols-[1fr_340px] gap-4 p-4 relative" onClick={handleUnlockAudio}>
      {!audioUnlocked && (
        <div
          onClick={handleUnlockAudio}
          className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-6 py-2.5 rounded-full bg-gradient-to-r from-purple-600 to-cyan-600 text-white text-xs sm:text-sm font-bold shadow-xl border border-white/30 cursor-pointer flex items-center gap-2 animate-bounce"
        >
          <span>🔊</span>
          <span>Nhấp chuột bất kỳ đâu để bật âm thanh hội trường</span>
        </div>
      )}

      {/* Main content area */}
      <div className="flex flex-col gap-4">
        {/* Powerup notification */}
        {lastPowerup && (
          <div className="glass rounded-xl p-4 flex items-center gap-3 animate-bounce-in border border-purple-500/50 shadow-xl">
            <PowerupIcon type={lastPowerup.type} className="w-12 h-12 shrink-0 drop-shadow" />
            <div>
              <p className="font-bold text-lg">{lastPowerup.usedByName} dùng thẻ!</p>
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
                    {roomState.mode === "TOURNAMENT" && (
                      <p className="text-lg font-black text-yellow-300 mt-1">
                        🏆 Đối đầu 1v1: {currentQuestion.primaryTeamName ?? "..."}
                      </p>
                    )}
                    {roomState.mode === "GRID_CARO" && (
                      <p className="text-lg font-black text-purple-300 mt-1">
                        🎯 Ô số #{currentQuestion.gridCellId ?? "?"} — Lượt của {currentQuestion.primaryTeamName ?? "..."}
                      </p>
                    )}
                    {roomState.mode === "DICE_RACE" && (
                      <p className="text-lg font-black text-indigo-300 mt-1">
                        🎲 Xúc xắc: {currentQuestion.diceRollValue ?? "?"} nút — Lượt của {currentQuestion.primaryTeamName ?? "..."}
                      </p>
                    )}
                    {roomState.mode === "WAGER" && (
                      <p className="text-lg font-black text-amber-300 mt-1">
                        💰 Cược điểm bí mật — Câu hỏi đang diễn ra!
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
            {revealPayload && roomState.mode === "WAGER" && roomState.wagerState && (
              <div className="mt-4">
                <WagerPanel wagerState={roomState.wagerState} isDisplay={true} />
              </div>
            )}
          </div>
        )}

        {/* Board tracking widgets when question is active */}
        {currentQuestion && roomState.mode === "GRID_CARO" && roomState.gridCaroState && (
          <div className="w-full animate-slide-up">
            <GridCaroBoard gridState={roomState.gridCaroState} isDisplay={true} />
          </div>
        )}

        {currentQuestion && roomState.mode === "DICE_RACE" && roomState.diceRaceState && (
          <div className="w-full animate-slide-up">
            <DiceRaceTrack diceState={roomState.diceRaceState} isDisplay={true} />
          </div>
        )}

        {!currentQuestion && (
          <div className="flex-1 flex flex-col items-center justify-center p-2">
            {roomState.mode === "TOURNAMENT" && roomState.tournamentState ? (
              <div className="w-full">
                <TournamentBracket tournamentState={roomState.tournamentState} isDisplay={true} />
              </div>
            ) : roomState.mode === "GRID_CARO" && roomState.gridCaroState ? (
              <div className="w-full">
                <GridCaroBoard gridState={roomState.gridCaroState} isDisplay={true} />
              </div>
            ) : roomState.mode === "DICE_RACE" && roomState.diceRaceState ? (
              <div className="w-full">
                <DiceRaceTrack diceState={roomState.diceRaceState} isDisplay={true} />
              </div>
            ) : roomState.mode === "WAGER" && roomState.wagerState ? (
              <div className="w-full">
                <WagerPanel wagerState={roomState.wagerState} isDisplay={true} />
              </div>
            ) : (
              <p className="text-3xl text-muted-foreground">⏳ Chờ câu hỏi tiếp theo...</p>
            )}
          </div>
        )}
      </div>

      {/* Leaderboard sidebar */}
      <div className="glass rounded-2xl p-4 flex flex-col gap-2">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-bold">🏆 Bảng điểm</h3>
          <button
            onClick={(e) => { e.stopPropagation(); toggleSound(); }}
            className="px-2.5 py-1 rounded-lg text-xs font-bold glass border border-white/20 hover:bg-white/10 transition"
          >
            {soundMuted ? "🔇 Tắt" : "🔊 Bật"}
          </button>
        </div>
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
