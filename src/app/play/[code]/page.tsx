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
  const [isSandbox, setIsSandbox] = useState(false);
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

    const searchParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
    const isSandboxParam = searchParams?.get("sandbox") === "1";
    if (isSandboxParam) setIsSandbox(true);
    const paramTeamId = searchParams?.get("teamId") || "";
    const paramTeamIndex = searchParams?.get("teamIndex");
    const paramName = searchParams?.get("name") || "";
    const paramPlayerId = searchParams?.get("playerId") || "";

    if (paramTeamId) {
      myTeamIdRef.current = paramTeamId;
    }

    const storageKey = paramTeamIndex !== null && paramTeamIndex !== undefined
      ? `timeout_player_id_${code}_t${paramTeamIndex}`
      : `timeout_player_id_${code}`;

    let savedPlayerId = paramPlayerId || sessionStorage.getItem(storageKey) || localStorage.getItem(storageKey);
    if (!savedPlayerId) {
      savedPlayerId = paramTeamIndex !== null && paramTeamIndex !== undefined
        ? `p_sb_${code}_t${paramTeamIndex}_${Math.random().toString(36).slice(2, 7)}`
        : `p_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
      sessionStorage.setItem(storageKey, savedPlayerId);
      localStorage.setItem(storageKey, savedPlayerId);
    }
    playerIdRef.current = savedPlayerId;
    setPlayerId(savedPlayerId);
    const playerName = paramName || sessionStorage.getItem("playerName") || localStorage.getItem("playerName") || "Thí sinh";

    const handlePostMessage = (e: MessageEvent) => {
      if (e.data?.type === "SWITCH_ACTIVE_TEAM" && e.data.payload) {
        const { teamId, teamName, teamIndex } = e.data.payload;
        myTeamIdRef.current = teamId;
        const currentPid = playerIdRef.current;
        if (socketRef.current?.connected && teamId) {
          socketRef.current.emit("player:select:team", { teamId, playerId: currentPid });
        }
        setRoomState((prev) => {
          if (!prev) return prev;
          const updatedPlayers = prev.players.map((p) =>
            p.id === currentPid
              ? { ...p, teamId, name: teamIndex === 0 ? "Bạn (Tester)" : `${teamName} 🤖` }
              : p
          );
          return { ...prev, players: updatedPlayers };
        });
        setAnswered(false);
        return;
      }
      if (e.data?.type === "OFFLINE_SYNC" && e.data.payload) {
        setConnected(true);
        const p = e.data.payload;
        if (p.roomState !== undefined) setRoomState(p.roomState);
        if (p.currentQuestion !== undefined) {
          setCurrentQuestion(p.currentQuestion);
          if (p.currentQuestion !== null) setAnswered(false);
        }
        if (p.revealPayload !== undefined) {
          setRevealPayload(p.revealPayload);
          setIsStealPhase(false);
          if (soundEnabledRef.current) {
            const myAns = p.revealPayload.answers?.find(
              (a: any) => a.playerId === playerIdRef.current || (myTeamIdRef.current && a.teamId === myTeamIdRef.current)
            );
            if (myAns?.isCorrect) {
              soundManager.playCorrect();
            } else {
              soundManager.playWrong();
            }
          }
        }
        if (p.timer !== undefined) setTimer(p.timer);
        if (p.buzzedBy !== undefined) setBuzzedBy(p.buzzedBy);
        if (p.lastPowerup !== undefined) setLastPowerup(p.lastPowerup);
        if (p.matchStarting !== undefined) setMatchStarting(p.matchStarting);
        if (p.questionPrepare !== undefined) setQuestionPrepare(p.questionPrepare);
        if (p.gameEnd !== undefined) {
          setGameEnd(p.gameEnd);
          if (soundEnabledRef.current) soundManager.playFanfare();
        }
        if (p.isStealOpen !== undefined) setIsStealPhase(p.isStealOpen);
        if (p.stealBuzzed !== undefined) setStealBuzzedTeam(p.stealBuzzed);
      }
    };
    window.addEventListener("message", handlePostMessage);

    if (code.startsWith("OFFLINE")) {
      setConnected(true);
    }

    const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io({
      transports: ["websocket", "polling"],
      query: isSandbox ? { sandbox: "1" } : {},
    });
    socketRef.current = socket;

    const joinRoom = () => {
      const currentPid = playerIdRef.current || savedPlayerId;
      const currentName = paramName || sessionStorage.getItem("playerName") || localStorage.getItem("playerName") || playerName;

      socket.emit("room:join", {
        code,
        playerName: currentName,
        playerId: currentPid,
        teamId: myTeamIdRef.current || (paramTeamId ? paramTeamId : undefined),
      }, (result) => {
        if (result.success) {
          setErrorMessage(null);
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
          setErrorMessage(result.error ?? "Không thể vào phòng");
          if (!isSandbox) {
            setTimeout(() => {
              router.push("/play");
            }, 3500);
          }
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
      if (soundEnabledRef.current && !q.timerPending) {
        soundManager.playCountdownTick(0);
      }
    });

    socket.on("game:timer:started", (payload) => {
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
      if (soundEnabledRef.current) {
        soundManager.playCountdownTick(0);
      }
    });

    socket.on("game:timer", (t) => {
      setTimer(t);
      if (t.remaining <= 0 && soundEnabledRef.current) {
        soundManager.stopMusic();
      }
    });
    socket.on("game:timer:expired", () => {
      setTimer((prev) => (prev ? { ...prev, remaining: 0 } : { remaining: 0, total: 30 }));
      if (soundEnabledRef.current) {
        soundManager.stopMusic();
        soundManager.playBuzz();
      }
    });

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

    socket.on("game:bounceback:points_selected", (payload) => {
      setCurrentQuestion((prev) =>
        prev
          ? {
              ...prev,
              bouncebackSelectPhase: false,
              selectedPointLevel: payload.points,
              question: {
                ...prev.question,
                points: payload.points,
              },
            }
          : prev
      );
    });

    socket.on("game:elimination:round", () => {
      if (soundEnabledRef.current) {
        soundManager.playBuzz();
      }
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
    socket.on("game:buzz:unlocked", () => {
      setCurrentQuestion((prev) => (prev ? { ...prev, buzzUnlocked: true } : prev));
      if (soundEnabledRef.current) soundManager.playBuzz();
    });
    socket.on("game:buzz:locked", () => {
      setCurrentQuestion((prev) => (prev ? { ...prev, buzzUnlocked: false } : prev));
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
      window.removeEventListener("message", handlePostMessage);
      socket.disconnect();
    };
  }, [code, router]);

  const handleBuzz = () => {
    if (socketRef.current?.connected) {
      socketRef.current.emit("game:buzz");
    } else {
      window.parent?.postMessage({
        type: "OFFLINE_PLAYER_ACTION",
        action: "buzz",
        teamId: myTeamIdRef.current,
        playerId: playerIdRef.current,
      }, "*");
    }
  };

  const handleAnswer = (answer: string | string[]) => {
    if (!currentQuestion || revealPayload) return;
    setAnswered(true);
    if (socketRef.current?.connected) {
      socketRef.current.emit("game:answer:submit", {
        questionId: currentQuestion.question.id,
        answer,
      });
    } else {
      window.parent?.postMessage({
        type: "OFFLINE_PLAYER_ACTION",
        action: "answer",
        questionId: currentQuestion.question.id,
        answer,
        teamId: myTeamIdRef.current,
        playerId: playerIdRef.current,
      }, "*");
    }
  };

  const handleUsePowerup = (cardId: string, targetTeamId?: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit("game:powerup:use", { cardId, targetTeamId });
    } else {
      window.parent?.postMessage({
        type: "OFFLINE_PLAYER_ACTION",
        action: "powerup_use",
        cardId,
        targetTeamId,
        teamId: myTeamIdRef.current,
        playerId: playerIdRef.current,
      }, "*");
    }
  };

  const handleSelectGridCell = (cellId: number) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit("game:grid:select", { cellId });
    } else {
      window.parent?.postMessage({
        type: "OFFLINE_PLAYER_ACTION",
        action: "grid_select",
        cellId,
        teamId: myTeamIdRef.current,
        playerId: playerIdRef.current,
      }, "*");
    }
  };

  const handleRollDice = () => {
    if (socketRef.current?.connected) {
      socketRef.current.emit("game:dice:roll");
    } else {
      window.parent?.postMessage({
        type: "OFFLINE_PLAYER_ACTION",
        action: "dice_roll",
        teamId: myTeamIdRef.current,
        playerId: playerIdRef.current,
      }, "*");
    }
  };

  const handleSubmitWager = (amount: number) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit("game:wager:submit", { amount });
    } else {
      window.parent?.postMessage({
        type: "OFFLINE_PLAYER_ACTION",
        action: "wager_submit",
        amount,
        teamId: myTeamIdRef.current,
        playerId: playerIdRef.current,
      }, "*");
    }
  };

  const handleSelectPoints = (points: 10 | 20 | 30) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit("game:bounceback:select_points", { points });
    } else {
      window.parent?.postMessage({
        type: "OFFLINE_PLAYER_ACTION",
        action: "bounceback_select_points",
        points,
        teamId: myTeamIdRef.current,
        playerId: playerIdRef.current,
      }, "*");
    }
  };

  const handleStopEarly = () => {
    if (socketRef.current?.connected && currentQuestion) {
      socketRef.current.emit("game:answer:stop_early", {
        questionId: currentQuestion.question.id,
      });
    } else {
      window.parent?.postMessage({
        type: "OFFLINE_PLAYER_ACTION",
        action: "stop_early",
        questionId: currentQuestion?.question.id,
        teamId: myTeamIdRef.current,
        playerId: playerIdRef.current,
      }, "*");
    }
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

  if (errorMessage && !roomState) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="glass rounded-2xl p-6 max-w-sm text-center border border-red-500/30 space-y-3">
          <div className="text-3xl">⚠️</div>
          <p className="text-sm font-bold text-red-300">{errorMessage}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs"
          >
            Thử kết nối lại
          </button>
        </div>
      </div>
    );
  }

  if (!connected && !code.startsWith("OFFLINE")) {
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

  const mePlayer = roomState?.players.find((p) => p.id === playerId);
  const effectiveTeamId = myTeamIdRef.current || mePlayer?.teamId;
  const myTeam = roomState?.teams.find((t) => t.id === effectiveTeamId);
  const isSpectator = Boolean(myTeam?.isEliminated) || Boolean(mePlayer?.isSpectator);

  // ── Match Warmup Countdown (5s) ──────────────────────────────────────────
  if (matchStarting) {
    if (roomState?.mode === "DICE_RACE" && roomState?.diceRaceState) {
      return (
        <div className="min-h-screen flex flex-col p-3 sm:p-4 gap-3 max-w-4xl mx-auto w-full">
          <div className="w-full flex items-center justify-between gap-3 p-3 rounded-2xl glass border border-amber-500/40 bg-amber-500/10 shadow animate-slide-up">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="text-2xl animate-bounce shrink-0">🏁</span>
              <div className="min-w-0">
                <p className="font-black text-amber-300 text-xs sm:text-sm truncate">
                  CUỘC ĐUA CỜ XÍ NGẦU BẮT ĐẦU!
                </p>
                <p className="text-[11px] text-amber-200/90 truncate">
                  Xem toàn cảnh vị trí các quân cờ ở ô xuất phát
                </p>
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 text-black font-black text-lg flex items-center justify-center shadow shrink-0">
              {matchStarting.seconds}s
            </div>
          </div>

          <div className="flex-1 flex flex-col justify-center">
            <DiceRaceTrack
              diceState={roomState.diceRaceState}
              myTeamId={effectiveTeamId}
              mode="full"
            />
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-6 text-center space-y-4 sm:space-y-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[11px] sm:text-xs font-bold uppercase tracking-widest">
          ⚡ Sẵn sàng thi đấu
        </div>
        <h1 className="text-2xl sm:text-4xl font-black bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
          Trận đấu bắt đầu sau
        </h1>
        <div className="inline-flex items-center justify-center w-24 h-24 sm:w-32 sm:h-32 rounded-full bg-gradient-to-br from-purple-600 to-cyan-600 text-white text-5xl sm:text-6xl font-black shadow-2xl animate-bounce-in glow-purple border-4 border-white/20">
          {matchStarting.seconds}
        </div>
        <p className="text-muted-foreground text-xs sm:text-sm max-w-xs">
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
      <div className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-6 text-center space-y-4 sm:space-y-6">
        <div className="w-full max-w-sm glass rounded-2xl p-5 sm:p-6 border-2 border-purple-500/40 space-y-4 sm:space-y-5 animate-slide-up">
          <div className="flex items-center justify-between text-xs text-muted-foreground font-bold">
            <span>CÂU {questionPrepare.questionIndex + 1} / {questionPrepare.totalQuestions}</span>
            <span className="text-cyan-400 font-bold">{questionPrepare.points}đ · {questionPrepare.timeLimit}s</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white">Chuẩn bị câu hỏi!</h2>
          {questionPrepare.primaryTeamName && (
            <p className="text-xs font-bold text-purple-300">
              🎯 Đội trả lời chính: {questionPrepare.primaryTeamName}
            </p>
          )}
          <div className="py-1 sm:py-2">
            <div className="inline-flex items-center justify-center w-20 h-20 sm:w-28 sm:h-28 rounded-full bg-gradient-to-br from-purple-600 to-cyan-500 text-white text-4xl sm:text-5xl font-black shadow-xl animate-bounce-in glow-cyan">
              {questionPrepare.seconds}
            </div>
          </div>
          <p className="text-[11px] sm:text-xs text-muted-foreground">Đáp án và câu hỏi sẽ mở ngay sau đếm ngược</p>
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
  return (
    <div className="min-h-screen flex flex-col p-2.5 sm:p-4 gap-2.5 sm:gap-4 max-w-4xl mx-auto w-full">
      {/* Header with score and sound toggle */}
      <div className="flex items-center gap-2">
        <div className="flex-1 min-w-0">
          <ScoreDisplay roomState={roomState} playerId={playerId} />
        </div>
        <button
          onClick={() => setShowRulesModal(true)}
          title="Xem thể lệ và luật chơi"
          className="p-2.5 sm:p-3.5 rounded-xl glass border border-white/20 hover:bg-white/10 transition text-sm sm:text-base shrink-0 text-cyan-300"
        >
          📖
        </button>
        <button
          onClick={toggleSound}
          title={soundEnabled ? "Tắt âm thanh" : "Bật âm thanh"}
          className="p-2.5 sm:p-3.5 rounded-xl glass border border-white/20 hover:bg-white/10 transition text-sm sm:text-base shrink-0"
        >
          {soundEnabled ? "🔊" : "🔇"}
        </button>
      </div>

      {/* Powerup notification */}
      {lastPowerup && (
        <div className="fixed top-3 left-1/2 -translate-x-1/2 z-50 glass rounded-xl px-4 py-2.5 sm:px-6 sm:py-3 text-center animate-bounce-in flex items-center justify-center gap-2 border border-purple-500/40 shadow-xl w-[92vw] max-w-md">
          <PowerupIcon type={lastPowerup.type} className="w-6 h-6 sm:w-8 sm:h-8 shrink-0 drop-shadow" />
          <span className="font-bold text-xs sm:text-sm truncate">{lastPowerup.usedByName}</span>
          <span className="text-muted-foreground text-xs sm:text-sm"> dùng: </span>
          <span className="font-semibold text-cyan-300 text-xs sm:text-sm truncate">{lastPowerup.effect}</span>
        </div>
      )}

      {/* Error / Alert notification */}
      {errorMessage && (
        <div className="fixed top-3 left-1/2 -translate-x-1/2 z-50 bg-red-600/90 text-white rounded-xl px-4 py-2.5 sm:px-6 sm:py-3 text-center font-bold text-xs sm:text-sm animate-bounce-in shadow-lg w-[92vw] max-w-md">
          ⚠️ {errorMessage}
        </div>
      )}

      {/* Buzz notification */}
      {buzzedBy && (
        <div className="fixed top-14 left-1/2 -translate-x-1/2 z-50 bg-yellow-500 text-black rounded-xl px-4 py-2 sm:px-6 sm:py-3 text-center font-bold text-xs sm:text-sm animate-bounce-in shadow-lg w-[90vw] max-w-sm">
          ⚡ {buzzedBy.playerName} đã bấm buzz!
        </div>
      )}

      {/* Main game area */}
      <div className="flex-1 flex flex-col gap-2 sm:gap-3">
        {currentQuestion ? (
          <>
            {/* DICE_RACE: Mini-track on top while answering; Full Board after reveal so team can roll dice */}
            {roomState?.mode === "DICE_RACE" && roomState?.diceRaceState && (
              <div className="w-full animate-slide-up">
                <DiceRaceTrack
                  diceState={roomState.diceRaceState}
                  myTeamId={effectiveTeamId}
                  isMyTurn={roomState.diceRaceState.currentTurnTeamId === effectiveTeamId}
                  canRoll={
                    roomState.diceRaceState.currentTurnTeamId === effectiveTeamId &&
                    (Boolean(roomState.diceRaceState.canRollDice) || isSandbox || Boolean(revealPayload))
                  }
                  onRollDice={handleRollDice}
                  mode={revealPayload ? "full" : "mini"}
                />
              </div>
            )}

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
              onSelectPoints={handleSelectPoints}
              onStopEarly={handleStopEarly}
              isSpectator={isSpectator}
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
                  canSelect={
                    roomState.gridCaroState.currentTurnTeamId === effectiveTeamId &&
                    !roomState.gridCaroState.selectedCellId &&
                    !roomState.gridCaroState.previewActive &&
                    !roomState.gridCaroState.selectedCellAnimation
                  }
                  onSelectCell={(cellId) => socketRef.current?.emit("game:grid:select", { cellId })}
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
