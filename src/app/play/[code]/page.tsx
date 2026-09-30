"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { io, Socket } from "socket.io-client";
import type {
  ServerToClientEvents,
  ClientToServerEvents,
  RoomState,
  QuestionState,
  GameEndPayload,
  PowerupUsedPayload,
  AnswerRevealPayload,
  GamePreparePayload,
} from "@/types";
import { CARD_METADATA } from "@/types";
import GameQuestion from "@/components/play/GameQuestion";
import PlayerLobby from "@/components/play/PlayerLobby";
import GameEnd from "@/components/play/GameEnd";
import PowerupBar from "@/components/play/PowerupBar";
import ScoreDisplay from "@/components/play/ScoreDisplay";
import PowerupIcon from "@/components/ui/PowerupIcon";
import { soundManager } from "@/lib/sound-manager";
import TournamentBracket from "@/components/modes/TournamentBracket";
import GridCaroBoard from "@/components/modes/GridCaroBoard";
import DiceRaceTrack from "@/components/modes/DiceRaceTrack";
import WagerPanel from "@/components/modes/WagerPanel";
import GameModeRulesModal from "@/components/ui/GameModeRulesModal";

export default function PlayPage() {
  const { code } = useParams<{ code: string }>();
  const router = useRouter();
  const socketRef = useRef<Socket<ServerToClientEvents, ClientToServerEvents> | null>(null);

  const [connected, setConnected] = useState(false);
  const [roomState, setRoomState] = useState<RoomState | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<QuestionState | null>(null);
  const [revealPayload, setRevealPayload] = useState<AnswerRevealPayload | null>(null);
  const [gameEnd, setGameEnd] = useState<GameEndPayload | null>(null);
  const [playerId, setPlayerId] = useState("");
  const [timer, setTimer] = useState<{ remaining: number; total: number } | null>(null);
  const [buzzedBy, setBuzzedBy] = useState<{ playerName: string; teamId?: string; teamName?: string } | null>(null);
  const [lastPowerup, setLastPowerup] = useState<PowerupUsedPayload | null>(null);
  const [answered, setAnswered] = useState(false);
  const [hiddenOptionIds, setHiddenOptionIds] = useState<string[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isStealPhase, setIsStealPhase] = useState(false);
  const [stealBuzzedTeam, setStealBuzzedTeam] = useState<{ teamId: string; teamName: string; playerId: string; playerName: string } | null>(null);
  const [matchStarting, setMatchStarting] = useState<{ seconds: number } | null>(null);
  const [questionPrepare, setQuestionPrepare] = useState<GamePreparePayload | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [showRulesModal, setShowRulesModal] = useState(false);
  const soundEnabledRef = useRef(false);

  const myTeamIdRef = useRef<string | undefined>(undefined);
  const playerIdRef = useRef<string>("");

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

  useEffect(() => {
    // Default sound MUTED on player devices to prevent room echo
    soundManager.setMuted(true);

    const storageKey = `timeout_player_id_${code}`;
    let savedPlayerId = sessionStorage.getItem(storageKey) || localStorage.getItem(storageKey);
    if (!savedPlayerId) {
      savedPlayerId = `p_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
      sessionStorage.setItem(storageKey, savedPlayerId);
      localStorage.setItem(storageKey, savedPlayerId);
    }
    playerIdRef.current = savedPlayerId;
    setPlayerId(savedPlayerId);

    const playerName = sessionStorage.getItem("playerName") || localStorage.getItem("playerName") || "Thí sinh";

    const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io({
      transports: ["websocket", "polling"],
    });
    socketRef.current = socket;

    const joinRoom = () => {
      const currentPid = playerIdRef.current || savedPlayerId;
      const currentName = sessionStorage.getItem("playerName") || localStorage.getItem("playerName") || playerName;

      socket.emit("room:join", {
        code,
        playerName: currentName,
        playerId: currentPid,
        teamId: myTeamIdRef.current,
      }, (result) => {
        if (result.success) {
          const finalId = result.playerId || currentPid;
          playerIdRef.current = finalId;
          setPlayerId(finalId);
          sessionStorage.setItem(storageKey, finalId);
          localStorage.setItem(storageKey, finalId);
          setRoomState(result.roomState ?? null);
          const p = result.roomState?.players.find((pl) => pl.id === finalId);
          if (p?.name) {
            sessionStorage.setItem("playerName", p.name);
            localStorage.setItem("playerName", p.name);
          }
          if (p?.teamId) myTeamIdRef.current = p.teamId;
        } else {
          alert(result.error ?? "Không thể vào phòng");
          router.push("/play");
        }
      });
    };

    socket.on("connect", () => {
      setConnected(true);
      joinRoom();
    });

    socket.io.on("reconnect", () => {
      joinRoom();
    });

    socket.on("room:state", (state) => {
      setRoomState(state);
      const currentPid = playerIdRef.current || savedPlayerId;
      const p = state.players.find((pl) => pl.id === currentPid);
      if (p?.teamId) myTeamIdRef.current = p.teamId;
      if (p?.name) {
        sessionStorage.setItem("playerName", p.name);
        localStorage.setItem("playerName", p.name);
      }
    });

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
      setMatchStarting(null);
      setQuestionPrepare(null);
      setCurrentQuestion(q);
      setRevealPayload(null);
      setAnswered(false);
      setBuzzedBy(null);
      setTimer(null);
      setHiddenOptionIds([]);
      setIsStealPhase(false);
      setStealBuzzedTeam(null);
      if (soundEnabledRef.current) {
        soundManager.playCountdownTick(0);
      }
    });

    socket.on("game:timer", (t) => setTimer(t));

    socket.on("game:buzz", (payload) => {
      setBuzzedBy({ playerName: payload.playerName, teamId: payload.teamId, teamName: payload.teamName });
      if (soundEnabledRef.current) {
        soundManager.playBuzz();
      }
    });

    socket.on("game:buzz:answering", (payload) => {
      setBuzzedBy({ playerName: payload.teamName, teamId: payload.teamId, teamName: payload.teamName });
      setTimer({ remaining: payload.timeLimit, total: payload.timeLimit });
    });

    socket.on("game:bounceback:open_steal", (payload) => {
      setIsStealPhase(true);
      setStealBuzzedTeam(null);
      setTimer({ remaining: payload.timeLimit, total: payload.timeLimit });
    });

    socket.on("game:bounceback:steal_buzzed", (payload) => {
      setIsStealPhase(false);
      setStealBuzzedTeam(payload);
      if (soundEnabledRef.current) {
        soundManager.playBuzz();
      }
    });

    socket.on("game:bounceback:steal_answering", (payload) => {
      setTimer({ remaining: payload.timeLimit, total: payload.timeLimit });
    });

    socket.on("game:buzz:closed", () => {
      setIsStealPhase(false);
    });

    socket.on("game:answer:reveal", (payload) => {
      setRevealPayload(payload);
      setIsStealPhase(false);
      if (soundEnabledRef.current) {
        const myAns = payload.answers.find(
          (a) => a.playerId === playerIdRef.current || (myTeamIdRef.current && a.teamId === myTeamIdRef.current)
        );
        if (myAns?.isCorrect) {
          soundManager.playCorrect();
        } else {
          soundManager.playWrong();
        }
      }
    });

    socket.on("game:question:clear", () => {
      setCurrentQuestion(null);
      setRevealPayload(null);
      setAnswered(false);
      setBuzzedBy(null);
      setTimer(null);
      setHiddenOptionIds([]);
      setIsStealPhase(false);
      setStealBuzzedTeam(null);
    });

    socket.on("game:score:update", (scores) => {
      setRoomState((prev) => {
        if (!prev) return prev;
        const updatedPlayers = prev.players.map((p) => {
          const update = scores.find((s) => s.playerId === p.id);
          return update ? { ...p, score: update.score } : p;
        });
        const updatedTeams = prev.teams.map((t) => {
          const update = scores.find((s) => s.teamId === t.id);
          return update ? { ...t, score: update.score } : t;
        });
        return { ...prev, players: updatedPlayers, teams: updatedTeams };
      });
    });

    socket.on("game:powerup:used", (payload) => {
      setLastPowerup(payload);
      if (soundEnabledRef.current) {
        soundManager.playPowerup();
      }
      setTimeout(() => setLastPowerup(null), 4000);
    });

    socket.on("game:fifty_fifty:applied", (payload) => {
      if (!myTeamIdRef.current || myTeamIdRef.current === payload.teamId) {
        setHiddenOptionIds(payload.hiddenOptionIds);
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
      if (soundEnabledRef.current) soundManager.playCorrect();
    });
    socket.on("game:dice:rolled", () => {
      if (soundEnabledRef.current) soundManager.playBuzz();
    });

    socket.on("error", (msg) => {
      setErrorMessage(msg);
      setTimeout(() => setErrorMessage(null), 4000);
    });

    socket.on("game:ended", (payload) => {
      if (soundEnabledRef.current) {
        soundManager.playFanfare();
      }
      setGameEnd(payload);
    });
    socket.on("game:paused", () => setRoomState((s) => s ? { ...s, status: "PAUSED" } : s));
    socket.on("game:resumed", () => setRoomState((s) => s ? { ...s, status: "PLAYING" } : s));

    return () => {
      socket.disconnect();
    };
  }, [code, router]);

  const handleBuzz = () => socketRef.current?.emit("game:buzz");

  const handleAnswer = (answer: string | string[]) => {
    if (!currentQuestion || revealPayload) return;
    setAnswered(true);
    socketRef.current?.emit("game:answer:submit", {
      questionId: currentQuestion.question.id,
      answer,
    });
  };

  const handleUsePowerup = (cardId: string, targetTeamId?: string) => {
    socketRef.current?.emit("game:powerup:use", { cardId, targetTeamId });
  };

  const handleSelectGridCell = (cellId: number) => {
    socketRef.current?.emit("game:grid:select", { cellId });
  };

  const handleRollDice = () => {
    socketRef.current?.emit("game:dice:roll");
  };

  const handleSubmitWager = (amount: number) => {
    socketRef.current?.emit("game:wager:submit", { amount });
  };

  const handleSelectTeam = (teamId: string) => {
    const currentPid = playerIdRef.current || playerId;
    myTeamIdRef.current = teamId;

    // Optimistically update local roomState immediately
    setRoomState((prev) => {
      if (!prev) return prev;
      const updatedPlayers = prev.players.map((p) =>
        p.id === currentPid ? { ...p, teamId } : p
      );
      return { ...prev, players: updatedPlayers };
    });

    socketRef.current?.emit("player:select:team", { teamId, playerId: currentPid }, (res) => {
      if (res?.error) {
        setErrorMessage(res.error);
        setTimeout(() => setErrorMessage(null), 5000);
      }
    });
  };

  if (!connected) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4 animate-spin">⚡</div>
          <p className="text-muted-foreground">Đang kết nối...</p>
        </div>
      </div>
    );
  }

  if (gameEnd) {
    return <GameEnd payload={gameEnd} playerId={playerId} />;
  }

  if (roomState?.status === "LOBBY") {
    return (
      <PlayerLobby
        roomState={roomState}
        playerId={playerId}
        onSelectTeam={handleSelectTeam}
        errorMessage={errorMessage}
      />
    );
  }

  // ── Match Warmup Countdown (5s) ──────────────────────────────────────────
  if (matchStarting) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center space-y-6">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 text-xs font-bold uppercase tracking-widest">
          ⚡ Sẵn sàng thi đấu
        </div>
        <h1 className="text-3xl sm:text-4xl font-black bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
          Trận đấu bắt đầu sau
        </h1>
        <div className="inline-flex items-center justify-center w-32 h-32 rounded-full bg-gradient-to-br from-purple-600 to-cyan-600 text-white text-6xl font-black shadow-2xl animate-bounce-in glow-purple border-4 border-white/20">
          {matchStarting.seconds}
        </div>
        <p className="text-muted-foreground text-sm max-w-xs">
          Tập trung vào màn hình của bạn và sẵn sàng cho câu hỏi đầu tiên!
        </p>
        <button
          onClick={toggleSound}
          className="px-4 py-2 rounded-xl glass border border-white/20 text-xs font-bold flex items-center gap-2 mx-auto hover:bg-white/10 transition"
        >
          {soundEnabled ? "🔊 Âm thanh: BẬT" : "🔇 Âm thanh: TẮT (Bấm để bật)"}
        </button>
      </div>
    );
  }

  // ── Question Preparation Countdown (3s) ──────────────────────────────────
  if (questionPrepare) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center space-y-6">
        <div className="w-full max-w-sm glass rounded-2xl p-6 border-2 border-purple-500/40 space-y-5 animate-slide-up">
          <div className="flex items-center justify-between text-xs text-muted-foreground font-bold">
            <span>CÂU {questionPrepare.questionIndex + 1} / {questionPrepare.totalQuestions}</span>
            <span className="text-cyan-400 font-bold">{questionPrepare.points}đ · {questionPrepare.timeLimit}s</span>
          </div>
          <h2 className="text-2xl font-black text-white">Chuẩn bị câu hỏi!</h2>
          {questionPrepare.primaryTeamName && (
            <p className="text-xs font-bold text-purple-300">
              🎯 Đội trả lời chính: {questionPrepare.primaryTeamName}
            </p>
          )}
          <div className="py-2">
            <div className="inline-flex items-center justify-center w-28 h-28 rounded-full bg-gradient-to-br from-purple-600 to-cyan-500 text-white text-5xl font-black shadow-xl animate-bounce-in glow-cyan">
              {questionPrepare.seconds}
            </div>
          </div>
          <p className="text-xs text-muted-foreground">Đáp án và câu hỏi sẽ mở ngay sau đếm ngược</p>
        </div>
        <button
          onClick={toggleSound}
          className="px-4 py-2 rounded-xl glass border border-white/20 text-xs font-bold flex items-center gap-2 mx-auto hover:bg-white/10 transition"
        >
          {soundEnabled ? "🔊 Âm thanh: BẬT" : "🔇 Âm thanh: TẮT (Bấm để bật)"}
        </button>
      </div>
    );
  }

  const mePlayer = roomState?.players.find((p) => p.id === playerId);
  const effectiveTeamId = myTeamIdRef.current || mePlayer?.teamId;
  const myTeam = roomState?.teams.find((t) => t.id === effectiveTeamId);

  return (
    <div className="min-h-screen flex flex-col p-4 gap-4">
      {/* Header with score and sound toggle */}
      <div className="flex items-center gap-2">
        <div className="flex-1">
          <ScoreDisplay roomState={roomState} playerId={playerId} />
        </div>
        <button
          onClick={() => setShowRulesModal(true)}
          title="Xem thể lệ và luật chơi"
          className="p-3.5 rounded-xl glass border border-white/20 hover:bg-white/10 transition text-base shrink-0 text-cyan-300"
        >
          📖
        </button>
        <button
          onClick={toggleSound}
          title={soundEnabled ? "Tắt âm thanh" : "Bật âm thanh"}
          className="p-3.5 rounded-xl glass border border-white/20 hover:bg-white/10 transition text-base shrink-0"
        >
          {soundEnabled ? "🔊" : "🔇"}
        </button>
      </div>

      {/* Powerup notification */}
      {lastPowerup && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 glass rounded-xl px-6 py-3 text-center animate-bounce-in flex items-center gap-2 border border-purple-500/40 shadow-xl">
          <PowerupIcon type={lastPowerup.type} className="w-8 h-8 shrink-0 drop-shadow" />
          <span className="font-bold">{lastPowerup.usedByName}</span>
          <span className="text-muted-foreground"> dùng thẻ: </span>
          <span className="font-semibold text-cyan-300">{lastPowerup.effect}</span>
        </div>
      )}

      {/* Error / Alert notification */}
      {errorMessage && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-red-600/90 text-white rounded-xl px-6 py-3 text-center font-bold animate-bounce-in shadow-lg">
          ⚠️ {errorMessage}
        </div>
      )}

      {/* Buzz notification */}
      {buzzedBy && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-yellow-500 text-black rounded-xl px-6 py-3 text-center font-bold animate-bounce-in">
          ⚡ {buzzedBy.playerName} đã bấm buzz!
        </div>
      )}

      {/* Main game area */}
      <div className="flex-1 flex flex-col gap-4">
        {currentQuestion ? (
          <>
            <GameQuestion
              question={currentQuestion}
              timer={timer}
              onAnswer={handleAnswer}
              onBuzz={handleBuzz}
              answered={answered}
              revealPayload={revealPayload}
              roomStatus={roomState?.status ?? "PLAYING"}
              hiddenOptionIds={hiddenOptionIds}
              roomMode={roomState?.mode ?? "CLASSIC"}
              myTeamId={effectiveTeamId}
              answerMethod={roomState?.config?.answerMethod ?? "DEVICE"}
              isStealPhase={isStealPhase}
              stealBuzzedTeam={stealBuzzedTeam}
              buzzedBy={buzzedBy}
            />

            {/* Wager Reveal results for players */}
            {revealPayload && roomState?.mode === "WAGER" && roomState?.wagerState && (
              <div className="w-full">
                <WagerPanel
                  wagerState={roomState.wagerState}
                  myTeamId={effectiveTeamId}
                  myTeamScore={myTeam?.score ?? mePlayer?.score ?? 0}
                  myTeamName={myTeam?.name ?? mePlayer?.name}
                  teams={roomState.teams}
                  positiveTeamsCount={roomState?.teams.filter((t) => t.score > 0).length}
                />
              </div>
            )}

            {/* In-game board previews for players */}
            {roomState?.mode === "GRID_CARO" && roomState?.gridCaroState && (
              <div className="w-full mt-2">
                <GridCaroBoard
                  gridState={roomState.gridCaroState}
                  myTeamId={effectiveTeamId}
                  isMyTurn={false}
                  canSelect={false}
                />
              </div>
            )}

            {roomState?.mode === "DICE_RACE" && roomState?.diceRaceState && (
              <div className="w-full mt-2">
                <DiceRaceTrack
                  diceState={roomState.diceRaceState}
                  myTeamId={effectiveTeamId}
                  isMyTurn={false}
                  canRoll={false}
                />
              </div>
            )}
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-2">
            {roomState?.mode === "TOURNAMENT" && roomState?.tournamentState ? (
              <div className="w-full">
                <TournamentBracket
                  tournamentState={roomState.tournamentState}
                  myTeamId={effectiveTeamId}
                />
              </div>
            ) : roomState?.mode === "GRID_CARO" && roomState?.gridCaroState ? (
              <div className="w-full">
                <GridCaroBoard
                  gridState={roomState.gridCaroState}
                  myTeamId={effectiveTeamId}
                  isMyTurn={roomState.gridCaroState.currentTurnTeamId === effectiveTeamId}
                  canSelect={false}
                />
              </div>
            ) : roomState?.mode === "DICE_RACE" && roomState?.diceRaceState ? (
              <div className="w-full">
                <DiceRaceTrack
                  diceState={roomState.diceRaceState}
                  myTeamId={effectiveTeamId}
                  isMyTurn={roomState.diceRaceState.currentTurnTeamId === effectiveTeamId}
                  canRoll={roomState.diceRaceState.currentTurnTeamId === effectiveTeamId}
                  onRollDice={handleRollDice}
                />
              </div>
            ) : roomState?.mode === "WAGER" && roomState?.wagerState ? (
              <div className="w-full">
                <WagerPanel
                  wagerState={roomState.wagerState}
                  myTeamId={effectiveTeamId}
                  myTeamScore={myTeam?.score ?? mePlayer?.score ?? 0}
                  myTeamName={myTeam?.name ?? mePlayer?.name}
                  teams={roomState.teams}
                  onSubmitWager={handleSubmitWager}
                  positiveTeamsCount={roomState?.teams.filter((t) => t.score > 0).length}
                />
              </div>
            ) : (
              <div className="text-center text-muted-foreground">
                <div className="text-4xl mb-4">⏳</div>
                <p>Chờ câu hỏi tiếp theo...</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Power-up bar */}
      {roomState && (roomState.config.powerupEnabled || roomState.sharedCards.length > 0) && (
        <PowerupBar
          roomState={roomState}
          playerId={playerId}
          onUse={handleUsePowerup}
        />
      )}

      {/* Rules Modal */}
      <GameModeRulesModal
        mode={roomState?.mode}
        isOpen={showRulesModal}
        onClose={() => setShowRulesModal(false)}
      />
    </div>
  );
}
