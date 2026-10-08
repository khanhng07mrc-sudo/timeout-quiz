"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
  GameIntermissionPayload,
} from "@/types";
import { CARD_METADATA, BLOOM_METADATA, getBloomLevelFromPoints } from "@/types";
import PowerupIcon from "@/components/ui/PowerupIcon";
import { soundManager } from "@/lib/sound-manager";
import TournamentBracket from "@/components/modes/TournamentBracket";
import GridCaroBoard from "@/components/modes/GridCaroBoard";
import DiceRaceTrack from "@/components/modes/DiceRaceTrack";
import WagerPanel from "@/components/modes/WagerPanel";
import MysteryQuestBoard from "@/components/modes/MysteryQuestBoard";
import GameModeRulesModal from "@/components/ui/GameModeRulesModal";
import GameModeRulesCard from "@/components/ui/GameModeRulesCard";
import GameModeIcon from "@/components/ui/GameModeIcon";
import SystemIcon from "@/components/ui/SystemIcon";
import StealPrepCountdown from "@/components/ui/StealPrepCountdown";
import {
  syncClockWithServer,
  calculateAuthoritativeTimer,
  calibrateClockFromPacket,
} from "@/lib/clock-sync";

export default function DisplayPage() {
  const { code } = useParams<{ code: string }>();
  const socketRef = useRef<Socket<ServerToClientEvents, ClientToServerEvents> | null>(null);

  const [roomState, setRoomState] = useState<RoomState | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<QuestionState | null>(null);
  const [revealPayload, setRevealPayload] = useState<AnswerRevealPayload | null>(null);
  const [gameEnd, setGameEnd] = useState<GameEndPayload | null>(null);
  const [timer, setTimer] = useState<{ remaining: number; total: number; endsAt?: number } | null>(null);
  const [buzzed, setBuzzed] = useState<{ playerName: string } | null>(null);
  const [lastPowerup, setLastPowerup] = useState<PowerupUsedPayload | null>(null);
  const [isStealOpen, setIsStealOpen] = useState(false);
  const [stealBuzzed, setStealBuzzed] = useState<{ teamName: string; playerName: string } | null>(null);

  const [matchStarting, setMatchStarting] = useState<{ seconds: number } | null>(null);
  const matchStartingRef = useRef(false);
  useEffect(() => {
    matchStartingRef.current = Boolean(matchStarting);
  }, [matchStarting]);
  const [questionPrepare, setQuestionPrepare] = useState<GamePreparePayload | null>(null);
  const [intermission, setIntermission] = useState<GameIntermissionPayload | null>(null);
  const [displayModeTab, setDisplayModeTab] = useState<"QUESTION" | "BOARD">("QUESTION");
  const [soundMuted, setSoundMuted] = useState(false);
  const [audioUnlocked, setAudioUnlocked] = useState(false);
  const [showRulesModal, setShowRulesModal] = useState(false);
  const [stealPrepCountdown, setStealPrepCountdown] = useState<{ teamName: string; seconds: number } | null>(null);
  const [eliminationNotice, setEliminationNotice] = useState<{
    round: number;
    eliminatedTeamName: string;
    survivingTeamsCount: number;
    isGameOver: boolean;
  } | null>(null);
  const [revivalNotice, setRevivalNotice] = useState<{
    round: number;
    revivedTeamName: string;
    revivedScore: number;
    eliminatedAtStage?: number;
    revivedTeams?: { id: string; name: string; score: number; eliminatedAtStage?: number }[];
  } | null>(null);
  const [liveCheer, setLiveCheer] = useState<{
    matchId: string;
    targetTeamId: string;
    countA: number;
    countB: number;
    percentA: number;
    percentB: number;
  } | null>(null);
  const [floatingEmojis, setFloatingEmojis] = useState<
    Array<{ id: number; emoji: string; left: number }>
  >([]);
  const [oracleScores, setOracleScores] = useState<Record<string, number> | null>(null);

  const triggerFloatingCheer = useCallback((emoji: string, _targetTeamId: string) => {
    const id = Date.now() + Math.random();
    const left = Math.floor(Math.random() * 70) + 15;
    setFloatingEmojis((prev) => [...prev.slice(-15), { id, emoji, left }]);
    setTimeout(() => {
      setFloatingEmojis((prev) => prev.filter((item) => item.id !== id));
    }, 2500);
  }, []);

  // Local ticker for match warmup countdown (5s)
  useEffect(() => {
    if (!matchStarting) return;
    const interval = setInterval(() => {
      setMatchStarting((prev) => {
        if (!prev) return null;
        if (prev.seconds <= 0) return prev;
        const next = prev.seconds - 1;
        if (next >= 0) {
          soundManager.playCountdownTick(next);
        }
        return { seconds: next };
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [Boolean(matchStarting)]);

  // Local ticker for question preparation countdown (3s)
  useEffect(() => {
    if (!questionPrepare) return;
    const interval = setInterval(() => {
      setQuestionPrepare((prev) => {
        if (!prev || prev.seconds <= 1) {
          return prev ? { ...prev, seconds: 0 } : null;
        }
        const next = prev.seconds - 1;
        if (next >= 0) {
          soundManager.playCountdownTick(next);
        }
        return { ...prev, seconds: next };
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [Boolean(questionPrepare)]);

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
    }, 100);
    return () => clearInterval(interval);
  }, [timer?.endsAt, timer?.total]);

  // Immediately recalibrate timer when switching back to this tab (prevent sleeping tab lag)
  useEffect(() => {
    const onVisibility = () => {
      if (typeof document !== "undefined" && document.visibilityState === "visible" && timer?.endsAt) {
        const auth = calculateAuthoritativeTimer(timer.endsAt, timer.total, timer.remaining);
        setTimer((prev) => (prev ? { ...prev, remaining: auth.remaining } : null));
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [timer?.endsAt, timer?.total, timer?.remaining]);

  useEffect(() => {
    // Default sound ON on Display
    soundManager.setMuted(false);
    soundManager.setVolume(0.8);

    const handlePostMessage = (e: MessageEvent) => {
      if (e.data?.type === "OFFLINE_SYNC" && e.data.payload) {
        const p = e.data.payload;
        if (p.roomState !== undefined) {
          setRoomState(p.roomState);
          if (p.roomState?.status === "LOBBY") {
            soundManager.playLobbyMusic();
          } else if (p.roomState?.status === "GAME_OVER") {
            soundManager.stopMusic(0);
          }
          if (p.roomState?.wagerState) {
            const ws = p.roomState.wagerState;
            if (ws.phase === "WAGER_PERIOD") {
              soundManager.playBiddingSuspense();
            } else if (ws.phase === "QUESTION_PERIOD" && !ws.questionReady) {
              soundManager.stopMusic(0);
            }
          }
        }
        if (p.currentQuestion !== undefined) {
          setCurrentQuestion(p.currentQuestion);
          if (p.currentQuestion) {
            setDisplayModeTab("QUESTION");
            const isTimerRunning = Boolean(
              p.currentQuestion.timerStarted &&
              !p.currentQuestion.timerPending &&
              !p.currentQuestion.bouncebackSelectPhase &&
              p.currentQuestion.endsAt &&
              p.currentQuestion.endsAt > Date.now()
            );
            const activeMode = p.roomState?.mode || roomState?.mode;
            if (isTimerRunning && activeMode !== "BUZZ") {
              soundManager.playQuestionMusic(p.currentQuestion.timeLimit, p.currentQuestion.question?.id);
            }
          } else {
            setDisplayModeTab("BOARD");
            soundManager.stopMusic(0);
          }
        }
        if (p.revealPayload !== undefined) {
          setRevealPayload(p.revealPayload);
          // Preserve authentic Olympia countdown ending chime/gong without premature cutoff
          if (p.revealPayload?.answers?.some((a: any) => a.isCorrect)) {
            soundManager.playCorrect();
          } else {
            soundManager.playWrong();
          }
        }
        if (p.timer !== undefined) {
          setTimer(p.timer);
        }
        if (p.buzzed !== undefined) setBuzzed(p.buzzed);
        if (p.lastPowerup !== undefined) setLastPowerup(p.lastPowerup);
        if (p.matchStarting !== undefined) setMatchStarting(p.matchStarting);
        if (p.questionPrepare !== undefined) setQuestionPrepare(p.questionPrepare);
        if (p.intermission !== undefined) setIntermission(p.intermission);
        if (p.isStealOpen !== undefined) setIsStealOpen(p.isStealOpen);
        if (p.stealBuzzed !== undefined) setStealBuzzed(p.stealBuzzed);
        if (p.eliminationNotice !== undefined) setEliminationNotice(p.eliminationNotice);
        if (p.liveCheer !== undefined) {
          setLiveCheer(p.liveCheer);
          triggerFloatingCheer(p.liveCheer.emoji, p.liveCheer.targetTeamId);
        }
        if (p.oracleScores !== undefined) {
          setOracleScores(p.oracleScores);
        }
        if (p.revivalNotice !== undefined) {
          setRevivalNotice(p.revivalNotice);
          soundManager.playCorrect();
          setTimeout(() => setRevivalNotice(null), 7000);
        }
        if (p.gameEnd !== undefined) {
          setGameEnd(p.gameEnd);
        }
        if (p.mysteryQuestState !== undefined) {
          setRoomState((prev) => (prev ? { ...prev, mysteryQuestState: p.mysteryQuestState } : prev));
        }
      }
    };
    window.addEventListener("message", handlePostMessage);

    const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io({
      transports: ["websocket", "polling"],
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      syncClockWithServer(socket);
      socket.emit("display:join", code);
    });

    socket.on("room:state", (state) => {
      setRoomState(state);
      if (state.status === "LOBBY") {
        if (!matchStartingRef.current) {
          soundManager.playLobbyMusic();
        }
      } else if (state.status === "FINISHED" || state.status === "PAUSED") {
        soundManager.stopMusic(0, true);
      }
    });

    socket.on("game:starting", (p) => {
      matchStartingRef.current = true;
      setMatchStarting({ seconds: p.seconds });
      setQuestionPrepare(null);
      setIntermission(null);
      setCurrentQuestion(null);
      setRevealPayload(null);
      soundManager.stopMusic(0);
      soundManager.playCountdownTick(p.seconds);
    });

    socket.on("game:prepare", (p) => {
      setMatchStarting(null);
      setQuestionPrepare(p);
      setIntermission(null);
      setCurrentQuestion(null);
      setRevealPayload(null);
      soundManager.stopMusic(0);
      soundManager.playCountdownTick(p.seconds);
    });

    socket.on("game:intermission", (p) => {
      setIntermission(p);
      setMatchStarting(null);
      setQuestionPrepare(null);
      setCurrentQuestion(null);
      setRevealPayload(null);
      setTimer(null);
      soundManager.stopMusic(300);
    });

    socket.on("game:question", (q) => {
      soundManager.stopMusic(0);
      setMatchStarting(null);
      setQuestionPrepare(null);
      setIntermission(null);
      setCurrentQuestion(q);
      setRevealPayload(null);
      setIsStealOpen(Boolean(q.isStealPhase));
      if (q.stealBuzzedTeamId) {
        setStealBuzzed((prev) =>
          prev && prev.teamName === (q.stealBuzzedTeamName || prev.teamName)
            ? prev
            : {
                teamName: q.stealBuzzedTeamName || "Đội cướp",
                playerName: "",
              }
        );
      } else {
        setStealBuzzed(null);
      }
      setDisplayModeTab("QUESTION");
      const isTimerRunning = Boolean(
        q.timerStarted &&
        !q.timerPending &&
        !q.bouncebackSelectPhase &&
        !(q.stealBuzzedTeamId && !q.stealAnsweringActive) &&
        q.endsAt &&
        q.endsAt > Date.now()
      );
      if (isTimerRunning) {
        const auth = calculateAuthoritativeTimer(q.endsAt!, q.timeLimit, q.timeLimit);
        setTimer({ remaining: auth.remaining, total: q.timeLimit, endsAt: q.endsAt });
        if (roomState?.mode !== "BUZZ") {
          soundManager.playQuestionMusic(q.timeLimit, q.question?.id);
        }
      } else {
        setTimer(null);
        if (!q) {
          soundManager.stopMusic();
        }
      }
    });

    socket.on("game:timer:started", (payload) => {
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
      if (roomState?.mode !== "BUZZ") {
        soundManager.playQuestionMusic(tLimit, payload?.questionId);
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
    });
    socket.on("game:timer:expired", () => {
      setTimer((prev) => (prev ? { ...prev, remaining: 0, endsAt: undefined } : { remaining: 0, total: 30 }));
    });
    socket.on("game:buzz", (p) => {
      setBuzzed({ playerName: p.teamName ?? p.playerName });
      soundManager.playBuzz();
    });
    socket.on("game:buzz:answering", (p) => {
      setBuzzed({ playerName: p.teamName });
      setCurrentQuestion((prev) =>
        prev
          ? {
              ...prev,
              buzzAttemptNumber: p?.attemptNumber ?? prev.buzzAttemptNumber,
              buzzMaxAttempts: p?.maxAttempts ?? prev.buzzMaxAttempts,
              buzzMultiplier: p?.multiplier ?? prev.buzzMultiplier,
            }
          : prev
      );
      const tLimit = p.timeLimit ?? 5;
      const endsAt = Date.now() + tLimit * 1000;
      setTimer({ remaining: tLimit, total: tLimit, endsAt });
      soundManager.stopMusic(); // Theo luật mới: Phần trả lời không phát âm thêm
    });
    socket.on("game:buzz:wrong_attempt", (p) => {
      soundManager.playWrong();
      setBuzzed(null);
      setCurrentQuestion((prev) =>
        prev
          ? {
              ...prev,
              buzzDisqualifiedTeamIds: p?.disqualifiedTeamIds ?? prev.buzzDisqualifiedTeamIds,
              buzzMaxAttempts: p?.maxAttempts ?? prev.buzzMaxAttempts,
              buzzedTeamId: undefined,
              buzzedTeamName: undefined,
              buzzedBy: undefined,
              buzzAnsweringActive: false,
            }
          : prev
      );
    });
    socket.on("game:bounceback:open_steal", () => {
      setIsStealOpen(true);
      setStealBuzzed(null);
      soundManager.playOlympia5s();
    });
    socket.on("game:bounceback:steal_buzzed", (p) => {
      setIsStealOpen(false);
      setStealBuzzed({ teamName: p.teamName, playerName: p.playerName });
      soundManager.playBuzz();
      // Show prep countdown if server sent prepSeconds
      if (p.prepSeconds && p.prepSeconds > 0) {
        setStealPrepCountdown({ teamName: p.teamName, seconds: p.prepSeconds });
      }
      // Nhạc 5s bấm chuông tiếp tục chạy tới hết file như yêu cầu
    });
    socket.on("game:bounceback:steal_answering", (p) => {
      setStealPrepCountdown(null);
      const tLimit = p.timeLimit ?? 5;
      const endsAt = Date.now() + tLimit * 1000;
      setTimer({ remaining: tLimit, total: tLimit, endsAt });
      if (tLimit <= 5) {
        soundManager.playOlympia5s();
      } else {
        soundManager.playQuestionMusic(tLimit);
      }
    });
    socket.on("game:bounceback:points_selected", (payload) => {
      const ptsTimeLimit = payload.timeLimit ?? (payload.points === 10 ? 15 : payload.points === 20 ? 20 : 30);
      setCurrentQuestion((prev) =>
        prev
          ? {
              ...prev,
              bouncebackSelectPhase: false,
              selectedPointLevel: payload.points,
              timeLimit: ptsTimeLimit,
              timerPending: true,
              timerStarted: false,
              question: {
                ...prev.question,
                points: payload.points,
                timeLimit: ptsTimeLimit,
              },
            }
          : prev
      );
    });
    socket.on("game:early_completed", () => {
      soundManager.stopMusic();
      setTimer((prev) => (prev ? { ...prev, remaining: 0, endsAt: undefined } : { remaining: 0, total: 30 }));
    });
    socket.on("game:elimination:round", (payload) => {
      setEliminationNotice({
        round: payload.round ?? 1,
        eliminatedTeamName: payload.eliminatedTeamName,
        survivingTeamsCount: payload.survivingTeamsCount ?? 0,
        isGameOver: payload.isGameOver ?? false,
      });
      soundManager.playWrong();
      setTimeout(() => setEliminationNotice(null), 8000);
    });
    socket.on("game:buzz:closed", () => {
      setIsStealOpen(false);
    });
    socket.on("game:answer:reveal", (payload) => {
      setRevealPayload(payload);
      setIsStealOpen(false);
      // Giữ trọn vẹn phần kết chiêng/chuông Olympia của nhạc đếm ngược, không ngắt sớm
      if (payload.answers?.some((a) => a.isCorrect)) {
        soundManager.playCorrect();
      } else {
        soundManager.playWrong();
      }
    });

    socket.on("game:question:clear", () => {
      setCurrentQuestion(null);
      setRevealPayload(null);
      setTimer(null);
      setBuzzed(null);
      setStealBuzzed(null);
      setIsStealOpen(false);
      setDisplayModeTab("BOARD");
      soundManager.stopMusic();
    });
    socket.on("game:wager:bailout_granted", () => {
      soundManager.playCorrect();
    });

    socket.on("game:grid:update", (gridCaroState) => {
      setRoomState((prev) => (prev ? { ...prev, gridCaroState } : prev));
    });
    socket.on("game:dice:update", (diceRaceState) => {
      setRoomState((prev) => (prev ? { ...prev, diceRaceState } : prev));
    });
    socket.on("game:wager:update", (wagerState) => {
      setRoomState((prev) => (prev ? { ...prev, wagerState } : prev));
      if (wagerState.phase === "WAGER_PERIOD") {
        soundManager.playBiddingSuspense();
      } else if (wagerState.phase === "QUESTION_PERIOD" && !wagerState.questionReady) {
        soundManager.stopMusic(300);
      }
    });
    socket.on("game:tournament:update", (tournamentState) => {
      setRoomState((prev) => (prev ? { ...prev, tournamentState } : prev));
    });
    socket.on("game:mystery:update", (mysteryQuestState) => {
      setRoomState((prev) => (prev ? { ...prev, mysteryQuestState } : prev));
    });
    socket.on("game:mystery:card_flipped", (payload) => {
      if (payload.audioTrigger === "CORRECT") {
        soundManager.playCorrect();
      } else if (payload.audioTrigger === "WRONG") {
        soundManager.playWrong();
      }
    });
    socket.on("game:mystery:cashed_out", () => {
      soundManager.playCorrect();
    });
    socket.on("game:mystery:steal_open", () => {
      soundManager.playBuzz();
    });
    socket.on("game:mystery:steal_buzzed", () => {
      soundManager.playBuzz();
    });
    socket.on("tournament:cheer:broadcast", (payload) => {
      setLiveCheer(payload);
      triggerFloatingCheer(payload.emoji, payload.targetTeamId);
      soundManager.playBuzz();
    });
    socket.on("tournament:oracle:update", ({ oracleScores }) => {
      setOracleScores(oracleScores);
      setRoomState((prev) => {
        if (!prev || !prev.tournamentState) return prev;
        return {
          ...prev,
          tournamentState: {
            ...prev.tournamentState,
            oracleScores,
          },
        };
      });
    });
    socket.on("elimination:revival", (payload) => {
      setRevivalNotice(payload);
      soundManager.playCorrect();
      setTimeout(() => {
        setRevivalNotice(null);
      }, 7000);
    });
    socket.on("game:grid:caro:celebrate", () => {
      soundManager.playCorrect();
    });
    socket.on("game:dice:rolled", () => {
      soundManager.playBuzz();
    });
    socket.on("game:buzz:unlocked", (payload) => {
      setBuzzed(null);
      setCurrentQuestion((prev) => (prev ? {
        ...prev,
        buzzUnlocked: true,
        buzzWindowActive: true,
        buzzAttemptNumber: payload?.attemptNumber ?? prev.buzzAttemptNumber,
        buzzMaxAttempts: payload?.maxAttempts ?? prev.buzzMaxAttempts,
        buzzMultiplier: payload?.multiplier ?? prev.buzzMultiplier,
        buzzedTeamId: undefined,
        buzzedTeamName: undefined,
        buzzedBy: undefined,
        buzzAnsweringActive: false,
      } : prev));
      if (payload?.endsAt) {
        setTimer({ remaining: payload.remainingSeconds || 5, total: 5, endsAt: payload.endsAt });
      }
      soundManager.playOlympia5s();
    });
    socket.on("game:buzz:locked", () => {
      setCurrentQuestion((prev) => (prev ? { ...prev, buzzUnlocked: false } : prev));
    });
    socket.on("game:buzz:closed", () => {
      setCurrentQuestion((prev) => (prev ? { ...prev, buzzUnlocked: false, buzzWindowActive: false } : prev));
    });
    socket.on("game:powerup:used", (p) => {
      setLastPowerup(p);
      soundManager.playPowerup();
      setTimeout(() => setLastPowerup(null), 4000);
    });
    socket.on("game:ended", (payload) => {
      soundManager.stopMusic(0, true);
      setGameEnd(payload);
    });
    socket.on("game:paused", () => {
      soundManager.stopMusic();
      setRoomState((s) => s ? { ...s, status: "PAUSED" } : s);
    });
    socket.on("game:resumed", () => {
      setRoomState((s) => s ? { ...s, status: "PLAYING" } : s);
      const isTimerRunning = Boolean(
        currentQuestion?.timerStarted &&
        !currentQuestion?.timerPending &&
        currentQuestion?.endsAt &&
        currentQuestion?.endsAt > Date.now()
      );
      if (isTimerRunning && roomState?.mode !== "BUZZ") {
        soundManager.playQuestionMusic(currentQuestion?.timeLimit, currentQuestion?.question?.id);
      }
    });
    socket.on("game:question:clear", () => {
      setCurrentQuestion(null);
      setRevealPayload(null);
      setTimer(null);
      setBuzzed(null);
      setIsStealOpen(false);
      setStealBuzzed(null);
      soundManager.stopMusic();
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
      window.removeEventListener("message", handlePostMessage);
      soundManager.stopMusic();
      socket.disconnect();
    };
  }, [code]);

  const handleUnlockAudio = useCallback(() => {
    soundManager.unlockAudio();
    soundManager.setMuted(false);
    setAudioUnlocked(true);
    setSoundMuted(false);
    if (!matchStarting && !questionPrepare) {
      if (!currentQuestion && roomState?.status === "LOBBY") {
        soundManager.playLobbyMusic();
      } else if (
        currentQuestion &&
        !revealPayload &&
        currentQuestion.timerStarted &&
        !currentQuestion.timerPending &&
        currentQuestion.endsAt &&
        currentQuestion.endsAt > Date.now() &&
        roomState?.mode !== "BUZZ"
      ) {
        soundManager.playQuestionMusic(currentQuestion?.timeLimit, currentQuestion?.question?.id);
      }
    }
  }, [currentQuestion, matchStarting, questionPrepare, revealPayload, roomState?.mode, roomState?.status]);

  useEffect(() => {
    if (audioUnlocked) return;
    const onUserInteraction = () => {
      handleUnlockAudio();
    };
    window.addEventListener("click", onUserInteraction);
    window.addEventListener("pointerdown", onUserInteraction);
    window.addEventListener("keydown", onUserInteraction);
    return () => {
      window.removeEventListener("click", onUserInteraction);
      window.removeEventListener("pointerdown", onUserInteraction);
      window.removeEventListener("keydown", onUserInteraction);
    };
  }, [audioUnlocked, handleUnlockAudio]);

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
        <h1 className="text-6xl font-black mb-2 text-white inline-flex items-center gap-4">
          <SystemIcon name="trophy" className="w-14 h-14 text-amber-400 shrink-0" />
          <span>Kết quả</span>
        </h1>
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

        {roomState?.mode === "DICE_RACE" && roomState?.diceRaceState ? (
          <div className="w-full max-w-6xl space-y-4 animate-slide-up z-10">
            <div className="flex items-center justify-between p-3.5 sm:p-4 rounded-2xl glass border border-amber-500/40 bg-amber-500/10 shadow-xl">
              <div className="flex items-center gap-3">
                <span className="text-3xl animate-bounce">🏁</span>
                <div className="text-left">
                  <h2 className="text-xl sm:text-2xl font-black text-amber-300">
                    BẮT ĐẦU ĐƯỜNG ĐUA CỜ XÍ NGẦU!
                  </h2>
                  <p className="text-xs sm:text-sm text-amber-200/90">
                    Chiêm ngưỡng toàn cảnh các ô và vị trí quân cờ xuất phát trước khi vào câu hỏi 1...
                  </p>
                </div>
              </div>
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 text-black font-black text-2xl shadow-xl border-2 border-amber-300 shrink-0">
                {matchStarting.seconds}s
              </div>
            </div>
            <DiceRaceTrack diceState={roomState.diceRaceState} isDisplay={true} mode="full" />
          </div>
        ) : (
          <div className="text-center z-10 max-w-2xl space-y-6 animate-slide-up">
            <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 text-sm font-bold uppercase tracking-widest">
              ⚡ Chuẩn bị bắt đầu trận đấu
            </div>
            <h1 className="text-5xl sm:text-7xl font-black bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent">
              {roomState?.name ?? "Quizorra"}
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
        )}
      </div>
    );
  }

  // ── Intermission Screen (Leaderboard / Mode Standings Between Questions) ────
  if (intermission) {
    const isCaro = roomState?.mode === "GRID_CARO" && roomState.gridCaroState;
    const isDice = roomState?.mode === "DICE_RACE" && roomState.diceRaceState;
    const isWager = roomState?.mode === "WAGER" && roomState.wagerState;
    const isTour = roomState?.mode === "TOURNAMENT" && roomState.tournamentState;
    const isMystery = roomState?.mode === "MYSTERY_QUEST" && roomState.mysteryQuestState;

    const participants = [...(roomState?.teamMode === "TEAM" ? roomState.teams : roomState?.players ?? [])]
      .sort((a: any, b: any) => (b.score ?? 0) - (a.score ?? 0));
    const top1 = participants[0];
    const top2 = participants[1];
    const top3 = participants[2];
    const rest = participants.slice(3);

    return (
      <div
        className="min-h-screen flex flex-col justify-between p-4 sm:p-8 bg-gradient-to-br from-[#0c0d18] via-[#121429] to-[#0c1a2e] relative overflow-hidden cursor-pointer"
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

        {/* Mode Specific Standings */}
        {isCaro ? (
          <div className="w-full max-w-5xl mx-auto flex-1 flex flex-col justify-center animate-slide-up">
            <div className="text-center mb-4">
              <span className="px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/30">
                Bàn cờ Caro & Lượt thi đấu
              </span>
              <h2 className="text-3xl sm:text-4xl font-black text-white mt-2">CỤC DIỆN BÀN CỜ CARO</h2>
              <p className="text-sm text-cyan-300 mt-1 font-semibold">
                Chuẩn bị bước vào Câu hỏi #{intermission.nextQuestionIndex + 1} / {intermission.totalQuestions}
              </p>
            </div>
            <GridCaroBoard gridState={roomState.gridCaroState!} isDisplay={true} />
          </div>
        ) : isDice ? (
          <div className="w-full max-w-5xl mx-auto flex-1 flex flex-col justify-center animate-slide-up">
            <div className="text-center mb-4">
              <span className="px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                Đường đua xúc xắc & Vị trí các đội
              </span>
              <h2 className="text-3xl sm:text-4xl font-black text-white mt-2">ĐƯỜNG ĐUA XÍ NGẦU</h2>
              <p className="text-sm text-cyan-300 mt-1 font-semibold">
                Chuẩn bị bước vào Câu hỏi #{intermission.nextQuestionIndex + 1} / {intermission.totalQuestions}
              </p>
            </div>
            <DiceRaceTrack diceState={roomState.diceRaceState!} isDisplay={true} />
          </div>
        ) : isWager ? (
          <div className="w-full max-w-5xl mx-auto flex-1 flex flex-col justify-center animate-slide-up">
            <div className="text-center mb-4">
              <span className="px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30">
                Bảng điểm & Điểm cược các đội
              </span>
              <h2 className="text-3xl sm:text-4xl font-black text-white mt-2">TỔNG KẾT ĐIỂM CƯỢC</h2>
              <p className="text-sm text-cyan-300 mt-1 font-semibold">
                Chuẩn bị bước vào Câu hỏi #{intermission.nextQuestionIndex + 1} / {intermission.totalQuestions}
              </p>
            </div>
            <WagerPanel
              wagerState={roomState.wagerState!}
              isDisplay={true}
              teams={roomState.teams}
              positiveTeamsCount={roomState.teams.filter((t) => t.score > 0).length}
            />
          </div>
        ) : isTour ? (
          <div className="w-full max-w-5xl mx-auto flex-1 flex flex-col justify-center animate-slide-up">
            <div className="text-center mb-4">
              <span className="px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/30">
                Nhánh thi đấu đối kháng 1v1
              </span>
              <h2 className="text-3xl sm:text-4xl font-black text-white mt-2">CÂY ĐẤU LOẠI TRỰC TIẾP</h2>
              <p className="text-sm text-cyan-300 mt-1 font-semibold">
                Chuẩn bị bước vào Câu hỏi #{intermission.nextQuestionIndex + 1} / {intermission.totalQuestions}
              </p>
            </div>
            <TournamentBracket tournamentState={roomState.tournamentState!} isDisplay={true} />
          </div>
        ) : isMystery ? (
          <div className="w-full max-w-5xl mx-auto flex-1 flex flex-col justify-center animate-slide-up">
            <MysteryQuestBoard mysteryState={roomState.mysteryQuestState!} isDisplay={true} teams={roomState.teams} />
          </div>
        ) : (
          /* Grand Leaderboard Intermission for BUZZ, CLASSIC, OLYMPIA, ELIMINATION, etc. */
          <div className="w-full max-w-5xl mx-auto flex-1 flex flex-col justify-center items-center py-4 space-y-6 animate-slide-up">
            <div className="text-center space-y-2">
              <div className="inline-flex items-center gap-2 px-5 py-1.5 rounded-full bg-gradient-to-r from-purple-500/20 via-pink-500/20 to-cyan-500/20 border border-purple-500/40 text-cyan-300 font-black text-xs uppercase tracking-widest shadow-lg">
                <span>📊</span>
                <span>BẢNG XẾP HẠNG TỔNG HỢP GIỮA CÁC CÂU THI</span>
              </div>
              <h2 className="text-4xl sm:text-6xl font-black bg-gradient-to-r from-purple-400 via-pink-300 to-cyan-400 bg-clip-text text-transparent">
                CỤC DIỆN ĐIỂM SỐ
              </h2>
              <p className="text-sm sm:text-base text-slate-300">
                Sẵn sàng cho Câu hỏi #{intermission.nextQuestionIndex + 1} / {intermission.totalQuestions}
              </p>
            </div>

            {/* Top 3 Podium */}
            <div className="grid grid-cols-3 gap-3 sm:gap-6 w-full max-w-3xl items-end pt-6">
              {/* Rank 2 (Silver) */}
              {top2 ? (
                <div className="flex flex-col items-center animate-slide-up">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full border-4 border-slate-300 shadow-xl flex items-center justify-center text-2xl font-black mb-2" style={{ background: (top2 as any)?.color || "#94a3b8" }}>
                    {top2.name.charAt(0).toUpperCase()}
                  </div>
                  <p className="font-black text-sm sm:text-lg text-white truncate max-w-[110px] sm:max-w-[150px]">{top2.name}</p>
                  <p className="text-cyan-300 font-mono font-black text-base sm:text-2xl mt-0.5">{top2.score?.toLocaleString() || 0} pts</p>
                  <div className="w-full h-32 sm:h-40 glass rounded-t-2xl border-t-4 border-slate-300 bg-slate-500/20 flex flex-col items-center justify-center mt-2 shadow-xl">
                    <span className="text-3xl sm:text-4xl">🥈</span>
                    <span className="text-xs font-black uppercase text-slate-300 mt-1">HẠNG 2</span>
                  </div>
                </div>
              ) : <div />}

              {/* Rank 1 (Gold) */}
              {top1 ? (
                <div className="flex flex-col items-center animate-bounce-in relative">
                  <span className="text-3xl sm:text-4xl absolute -top-10 animate-bounce">👑</span>
                  <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full border-4 border-yellow-400 shadow-2xl flex items-center justify-center text-3xl font-black mb-2 ring-4 ring-yellow-400/40 glow-purple" style={{ background: (top1 as any)?.color || "#eab308" }}>
                    {top1.name.charAt(0).toUpperCase()}
                  </div>
                  <p className="font-black text-base sm:text-xl text-yellow-300 truncate max-w-[130px] sm:max-w-[180px]">{top1.name}</p>
                  <p className="text-yellow-400 font-mono font-black text-xl sm:text-3xl mt-0.5">{top1.score?.toLocaleString() || 0} pts</p>
                  <div className="w-full h-44 sm:h-52 glass rounded-t-2xl border-t-4 border-yellow-400 bg-yellow-500/20 flex flex-col items-center justify-center mt-2 shadow-2xl ring-2 ring-yellow-400/30">
                    <span className="text-4xl sm:text-5xl">🥇</span>
                    <span className="text-sm font-black uppercase text-yellow-300 mt-1">QUÁN QUÂN</span>
                  </div>
                </div>
              ) : <div />}

              {/* Rank 3 (Bronze) */}
              {top3 ? (
                <div className="flex flex-col items-center animate-slide-up">
                  <div className="w-14 h-14 sm:w-18 sm:h-18 rounded-full border-4 border-amber-600 shadow-xl flex items-center justify-center text-xl font-black mb-2" style={{ background: (top3 as any)?.color || "#d97706" }}>
                    {top3.name.charAt(0).toUpperCase()}
                  </div>
                  <p className="font-black text-xs sm:text-base text-white truncate max-w-[100px] sm:max-w-[140px]">{top3.name}</p>
                  <p className="text-cyan-300 font-mono font-black text-sm sm:text-xl mt-0.5">{top3.score?.toLocaleString() || 0} pts</p>
                  <div className="w-full h-24 sm:h-32 glass rounded-t-2xl border-t-4 border-amber-600 bg-amber-600/20 flex flex-col items-center justify-center mt-2 shadow-xl">
                    <span className="text-2xl sm:text-3xl">🥉</span>
                    <span className="text-xs font-black uppercase text-amber-400 mt-1">HẠNG 3</span>
                  </div>
                </div>
              ) : <div />}
            </div>

            {/* Remaining teams list (Rank 4+) */}
            {rest.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full max-w-2xl pt-2">
                {rest.map((p: any, idx: number) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between p-3 rounded-xl glass border border-white/10"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center text-xs font-black text-slate-300 shrink-0">
                        #{idx + 4}
                      </span>
                      <div className="w-3.5 h-3.5 rounded-full shrink-0" style={{ background: p.color || "#6366f1" }} />
                      <span className="font-bold text-sm text-white truncate">{p.name}</span>
                    </div>
                    <span className="font-mono font-bold text-sm text-cyan-300 shrink-0">{p.score?.toLocaleString() || 0} pts</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Footer announcement */}
        <div className="text-center py-3 border-t border-white/10">
          <p className="text-xs sm:text-sm text-cyan-300/80 font-medium animate-pulse inline-flex items-center gap-2">
            <span>⚡</span>
            <span>Quản trò đang kiểm tra điểm số · Chuẩn bị bước vào câu hỏi tiếp theo!</span>
          </p>
        </div>
      </div>
    );
  }

  // ── Lobby ──────────────────────────────────────────────────────────────────
  if (!currentQuestion && (!roomState || roomState.status === "LOBBY")) {
    const isTeamMode = roomState?.teamMode === "TEAM";
    return (
      <div className="min-h-screen flex flex-col p-4 sm:p-6 max-w-6xl mx-auto w-full relative" onClick={handleUnlockAudio}>
        {/* Top Navigation & Status Bar - Guarantees NO overlapping */}
        <div className="w-full flex flex-wrap items-center justify-between gap-3 mb-6 z-20 pb-3 border-b border-white/10">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-black uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/30 whitespace-nowrap">
              {isTeamMode ? "Đấu Đội (Team Mode)" : "Cá Nhân (Individual)"}
            </span>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 whitespace-nowrap">
              [{roomState?.mode}]
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={(e) => { e.stopPropagation(); setShowRulesModal(true); }}
              className="px-3.5 py-1.5 rounded-xl glass border border-white/20 text-xs sm:text-sm font-bold flex items-center gap-1.5 text-cyan-300 hover:text-white hover:bg-white/10 transition whitespace-nowrap"
            >
              <span>📖</span>
              <span>Thể lệ luật chơi</span>
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); toggleSound(); }}
              className="px-3.5 py-1.5 rounded-xl glass border border-white/20 text-xs sm:text-sm font-bold flex items-center gap-1.5 hover:bg-white/10 transition whitespace-nowrap"
            >
              {soundMuted ? "🔇 Đã tắt âm" : "🔊 Nhạc nền: BẬT"}
            </button>
          </div>
        </div>

        {!audioUnlocked && (
          <div
            onClick={handleUnlockAudio}
            className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-6 py-2.5 rounded-full bg-gradient-to-r from-purple-600 to-cyan-600 text-white text-xs sm:text-sm font-bold shadow-xl border border-white/30 cursor-pointer flex items-center gap-2 animate-bounce text-center max-w-[90vw]"
          >
            <span>🔊</span>
            <span>Nhấp chuột bất kỳ đâu để bật nhạc nền và âm thanh hội trường</span>
          </div>
        )}

        <div className="text-center mb-6">
          <h1 className="text-4xl sm:text-6xl font-black bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent">
            {roomState?.name ?? "Quizorra"}
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-2">Mã phòng tham gia</p>
          <div className="inline-block mt-2 px-6 sm:px-8 py-2.5 sm:py-3 rounded-2xl glass border-2 border-purple-500/40 glow-purple">
            <p className="text-5xl sm:text-7xl font-black font-mono tracking-widest text-cyan-300">{code}</p>
          </div>
          <p className="text-muted-foreground mt-3 text-sm sm:text-base">
            Truy cập <span className="text-white font-bold font-mono">/play/{code}</span> để tham gia
          </p>
        </div>

        {/* Detailed Game Rules Card */}
        {roomState && (
          <div className="w-full max-w-4xl mb-6">
            <GameModeRulesCard mode={roomState.mode} onOpenModal={() => setShowRulesModal(true)} />
          </div>
        )}

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
  if (!roomState) return null;

  const sortedTeams = [...(roomState.teamMode === "TEAM" ? roomState.teams : roomState.players)]
    .sort((a: any, b: any) => b.score - a.score)
    .slice(0, 10);

  const timerAuth = timer
    ? calculateAuthoritativeTimer(timer.endsAt, timer.total, timer.remaining)
    : null;
  const timerDisplayRemaining = timerAuth ? timerAuth.remaining : (timer?.remaining ?? 0);
  const timerPercent = timerAuth ? timerAuth.percent : (timer ? (timer.remaining / timer.total) * 100 : 100);
  const timerColor = timerPercent > 50 ? "#06b6d4" : timerPercent > 25 ? "#f59e0b" : "#ef4444";

  const bloom: BloomLevel = currentQuestion
    ? (currentQuestion.bloomLevel ?? getBloomLevelFromPoints(currentQuestion.question.points))
    : "REMEMBER";
  const bloomMeta = BLOOM_METADATA[bloom];

  return (
    <div className="min-h-screen flex flex-col lg:grid lg:grid-cols-[1fr_280px] xl:grid-cols-[1fr_320px] gap-2.5 sm:gap-3 p-2 sm:p-3 relative" onClick={handleUnlockAudio}>
      {!audioUnlocked && (
        <div
          onClick={handleUnlockAudio}
          className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 sm:px-6 sm:py-2.5 rounded-full bg-gradient-to-r from-purple-600 to-cyan-600 text-white text-xs sm:text-sm font-bold shadow-xl border border-white/30 cursor-pointer flex items-center justify-center gap-2 animate-bounce max-w-[90vw] text-center"
        >
          <span>🔊</span>
          <span>Nhấp chuột bất kỳ đâu để bật âm thanh hội trường</span>
        </div>
      )}

      {/* Elimination Notice Popup */}
      {eliminationNotice && (
        <div className="fixed top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 glass bg-red-950/95 border-2 border-red-500 rounded-3xl p-8 max-w-xl w-[90vw] text-center shadow-2xl animate-bounce-in">
          <span className="text-6xl mb-3 block">💀</span>
          <h2 className="text-3xl font-black text-red-400">VÒNG LOẠI #{eliminationNotice.round}</h2>
          <p className="text-xl text-white mt-2">
            Đội <span className="font-black text-yellow-400">{eliminationNotice.eliminatedTeamName}</span> đã bị loại!
          </p>
          <p className="text-sm text-red-200/90 mt-2">
            {eliminationNotice.isGameOver
              ? "Chỉ còn 1 đội sống sót — Trận đấu kết thúc!"
              : `Còn lại ${eliminationNotice.survivingTeamsCount} đội tiếp tục sinh tồn.`}
          </p>
        </div>
      )}

      {/* Ghost Revival Celebration Modal */}
      {revivalNotice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-fade-in">
          <div className="glass bg-gradient-to-br from-purple-950/95 via-indigo-950/95 to-purple-950/95 border-4 border-yellow-400 rounded-3xl p-6 sm:p-10 max-w-lg w-full text-center shadow-[0_0_60px_rgba(234,179,8,0.5)] animate-bounce-in space-y-4">
            <span className="text-7xl block animate-bounce">✨👻✨</span>
            <div className="space-y-1">
              <span className="px-4 py-1 rounded-full bg-yellow-400 text-black font-black text-xs uppercase tracking-widest">
                ĐẶC CÁCH HỒI SINH (STAGE #{revivalNotice.round})
              </span>
              <h2 className="text-3xl sm:text-4xl font-black text-yellow-300 pt-2">
                HỒI SINH THÀNH CÔNG!
              </h2>
            </div>
            <p className="text-xl sm:text-2xl font-bold text-white">
              Đội <span className="text-cyan-300 font-black">{revivalNotice.revivedTeamName}</span>
              {revivalNotice.eliminatedAtStage && (!revivalNotice.revivedTeams || revivalNotice.revivedTeams.length <= 1) ? (
                <span className="text-purple-300 font-medium text-base sm:text-lg block mt-1">
                  (Kiên cường từ Chặng {revivalNotice.eliminatedAtStage} — Ưu tiên đội bị loại sớm)
                </span>
              ) : null}
            </p>
            {revivalNotice.revivedTeams && revivalNotice.revivedTeams.length > 1 && (
              <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                {revivalNotice.revivedTeams.map((team) => (
                  <span
                    key={team.id}
                    className="px-3 py-1.5 rounded-xl bg-purple-500/30 border border-purple-400/50 text-white font-bold text-sm flex items-center gap-1.5"
                  >
                    <span>✨</span>
                    <strong className="text-cyan-300">{team.name}</strong>
                    {team.eliminatedAtStage ? (
                      <span className="text-xs text-purple-200/80">(từ Chặng {team.eliminatedAtStage})</span>
                    ) : null}
                  </span>
                ))}
              </div>
            )}
            <p className="text-sm text-purple-200/90 bg-purple-500/20 p-3 rounded-xl border border-purple-400/30">
              Nhờ thành tích bóng ma xuất sắc nhất, {revivalNotice.revivedTeams && revivalNotice.revivedTeams.length > 1 ? "các đội" : "đội"} được hồi sinh với số điểm{" "}
              <strong className="text-yellow-300 font-mono text-base">{revivalNotice.revivedScore}đ</strong>!
            </p>
          </div>
        </div>
      )}

      {/* Floating Cheers Animation */}
      {floatingEmojis.map((item) => (
        <div
          key={item.id}
          style={{
            left: `${item.left}%`,
            bottom: "12%",
            animation: "floatUp 2.2s cubic-bezier(0.2, 0.8, 0.2, 1) forwards",
          }}
          className="fixed z-50 text-4xl sm:text-5xl pointer-events-none drop-shadow-2xl select-none"
        >
          {item.emoji}
        </div>
      ))}

      {/* Main content area */}
      <div className="flex flex-col gap-3 sm:gap-4 min-w-0">
        {/* Powerup notification */}
        {lastPowerup && (
          <div className="glass rounded-xl p-4 flex items-center gap-3 animate-bounce-in border border-purple-500/50 shadow-xl">
            <PowerupIcon type={lastPowerup.type} className="w-12 h-12 shrink-0 drop-shadow" />
            <div>
              <div className="flex items-center gap-2">
                <p className="font-bold text-lg">{lastPowerup.usedByName} dùng thẻ!</p>
                {CARD_METADATA[lastPowerup.type]?.scope === "GLOBAL" && (
                  <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-purple-500/25 text-purple-300 border border-purple-500/40">
                    🌐 Thẻ Dùng Chung
                  </span>
                )}
              </div>
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
          <div className="bg-gradient-to-r from-red-600 via-rose-600 to-blue-600 text-white border-4 border-white/80 rounded-2xl p-5 text-center font-black animate-bounce-in shadow-2xl flex items-center justify-center gap-4">
            <span className="text-4xl animate-pulse">🚨</span>
            <div>
              <div className="text-xs uppercase tracking-widest text-yellow-300 font-bold mb-1">
                {currentQuestion?.stealAnsweringActive ? "⏱️ ĐANG TRẢ LỜI CƯỚP ĐIỂM (ĐỘI BẤM CHUÔNG)" : "✨ GIÀNH QUYỀN TRẢ LỜI — ĐANG CHUẨN BỊ"}
              </div>
              <div className="text-3xl text-white font-black drop-shadow">ĐỘI {stealBuzzed.teamName.toUpperCase()}</div>
              {stealBuzzed.playerName && <div className="text-sm text-rose-100 font-medium mt-0.5">Thí sinh: {stealBuzzed.playerName}</div>}
            </div>
            <span className="text-4xl animate-pulse">⚡</span>
          </div>
        )}

        {/* Buzz notification */}
        {buzzed && (
          <div className="bg-gradient-to-r from-red-600 via-rose-600 to-blue-600 text-white border-4 border-white/80 rounded-2xl p-4 text-center font-black text-2xl animate-bounce-in shadow-2xl">
            🚨 ĐỘI BẤM CHUÔNG: {buzzed.playerName.toUpperCase()} {currentQuestion?.buzzAnsweringActive ? "ĐANG TRẢ LỜI!" : "ĐÃ BẤM CHUÔNG (ĐANG CHUẨN BỊ)"}
            {currentQuestion?.buzzAttemptNumber ? ` (LƯỢT ${currentQuestion.buzzAttemptNumber}/${currentQuestion.buzzMaxAttempts || 3})` : ""}
          </div>
        )}

        {/* DICE_RACE: Full Board view if tab selected, or Mini-Track HUD if Question view */}
        {currentQuestion && roomState.mode === "DICE_RACE" && roomState.diceRaceState && (
          <div className="w-full shrink-0 animate-slide-up">
            <DiceRaceTrack
              diceState={roomState.diceRaceState}
              isDisplay={true}
              mode={displayModeTab === "BOARD" ? "full" : "mini"}
              onToggleView={() => setDisplayModeTab((prev) => prev === "BOARD" ? "QUESTION" : "BOARD")}
            />
          </div>
        )}

        {/* Question (hidden if viewing full board tab in DICE_RACE or minigame phase in MYSTERY_QUEST) */}
        {currentQuestion &&
          displayModeTab !== "BOARD" &&
          !(
            roomState.mode === "MYSTERY_QUEST" &&
            roomState.mysteryQuestState &&
            (roomState.mysteryQuestState.phase === "PUSH_YOUR_LUCK" ||
              (roomState.mysteryQuestState.phase === "TURN_SUMMARY" && Boolean(revealPayload)))
          ) && (
          <div className="flex-1 glass rounded-2xl p-3.5 sm:p-6 flex flex-col justify-between">
            {currentQuestion.bouncebackSelectPhase ? (
              <div className="py-8 sm:py-16 px-4 text-center flex flex-col items-center justify-center space-y-6 sm:space-y-8 animate-slide-up flex-1">
                <div className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-gradient-to-r from-blue-600/30 via-indigo-600/30 to-purple-600/30 border border-indigo-400/50 text-indigo-300 font-black text-sm sm:text-base uppercase tracking-widest shadow-xl">
                  <span>🎯</span>
                  <span>PHẦN THI VỀ ĐÍCH — CHỌN GÓI CÂU HỎI</span>
                </div>

                <div className="space-y-2 max-w-2xl">
                  <h2 className="text-3xl sm:text-5xl font-black bg-gradient-to-r from-blue-400 via-indigo-300 to-purple-400 bg-clip-text text-transparent">
                    LƯỢT THI CỦA ĐỘI {currentQuestion.primaryTeamName?.toUpperCase() || "THÍ SINH"}
                  </h2>
                  <p className="text-base sm:text-xl text-slate-300">
                    Đội đang lựa chọn mức điểm trên màn hình thiết bị...
                  </p>
                </div>

                {/* 3 Point Pack Cards Display */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 w-full max-w-4xl pt-2">
                  <div className="glass rounded-2xl p-6 sm:p-8 border-2 border-blue-500/40 bg-blue-950/40 flex flex-col items-center justify-center space-y-2 shadow-xl hover:border-blue-400 transition">
                    <span className="text-5xl sm:text-6xl font-mono font-black text-blue-400">10</span>
                    <span className="text-xl sm:text-2xl font-black text-white">ĐIỂM</span>
                    <span className="text-xs sm:text-sm font-semibold text-blue-200/90 bg-blue-500/20 px-3 py-1 rounded-full border border-blue-400/30">
                      ⏱️ 15 giây suy nghĩ
                    </span>
                    <span className="text-xs text-slate-400 pt-1">Độ khó cơ bản</span>
                  </div>

                  <div className="glass rounded-2xl p-6 sm:p-8 border-2 border-indigo-500/50 bg-indigo-950/50 flex flex-col items-center justify-center space-y-2 shadow-2xl hover:border-indigo-400 transition ring-2 ring-indigo-500/30">
                    <span className="text-5xl sm:text-6xl font-mono font-black text-indigo-300">20</span>
                    <span className="text-xl sm:text-2xl font-black text-white">ĐIỂM</span>
                    <span className="text-xs sm:text-sm font-semibold text-indigo-200/90 bg-indigo-500/20 px-3 py-1 rounded-full border border-indigo-400/30">
                      ⏱️ 20 giây suy nghĩ
                    </span>
                    <span className="text-xs text-slate-400 pt-1">Độ khó trung bình</span>
                  </div>

                  <div className="glass rounded-2xl p-6 sm:p-8 border-2 border-purple-500/50 bg-purple-950/40 flex flex-col items-center justify-center space-y-2 shadow-xl hover:border-purple-400 transition">
                    <span className="text-5xl sm:text-6xl font-mono font-black text-purple-400">30</span>
                    <span className="text-xl sm:text-2xl font-black text-white">ĐIỂM</span>
                    <span className="text-xs sm:text-sm font-semibold text-purple-200/90 bg-purple-500/20 px-3 py-1 rounded-full border border-purple-400/30">
                      ⏱️ 30 giây suy nghĩ
                    </span>
                    <span className="text-xs text-slate-400 pt-1">Độ khó nâng cao</span>
                  </div>
                </div>

                <div className="flex items-center justify-center gap-2 text-xs sm:text-sm text-indigo-300/80 font-mono animate-pulse pt-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-400 animate-ping inline-block" />
                  <span>Nội dung câu hỏi và đồng hồ đếm ngược sẽ kích hoạt ngay khi chốt gói điểm</span>
                </div>
              </div>
            ) : (
              <div>

              {/* Timer & Turn Info */}
              <div className="flex items-center justify-between gap-2.5 sm:gap-4 mb-2.5 sm:mb-4">
                <div className="flex items-center gap-3 sm:gap-4">
                  {timer && (
                    <svg className="w-12 h-12 sm:w-16 sm:h-16 shrink-0" viewBox="0 0 64 64">
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
                        {timerDisplayRemaining}
                      </text>
                    </svg>
                  )}
                  {currentQuestion.timerPending && !timer && !currentQuestion.bouncebackSelectPhase && (
                    <div className="px-3.5 py-2 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 font-bold text-xs sm:text-sm flex items-center gap-2 animate-pulse shrink-0">
                      <span>⏱️</span>
                      <span>Chờ MC / Admin bấm Bắt đầu tính giờ...</span>
                    </div>
                  )}
                  {timer && timerDisplayRemaining === 0 && !revealPayload && (
                    <div className="px-3.5 py-2 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 font-bold text-xs sm:text-sm flex items-center gap-2 animate-pulse shrink-0">
                      <span>⏱️</span>
                      <span>Hết thời gian! Chờ Quản trò công bố kết quả...</span>
                    </div>
                  )}
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs sm:text-sm text-muted-foreground font-semibold">
                        Câu {roomState.currentQuestionIndex + 1} / {roomState.totalQuestions}
                        {roomState.wagerState?.totalRounds
                          ? ` (Vòng ${(roomState.wagerState.roundIndex ?? 0) + 1}/${roomState.wagerState.totalRounds})`
                          : ""}
                      </span>
                      {roomState.wagerState?.maxBetCap && (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold border border-emerald-500/40 bg-emerald-500/20 text-emerald-300">
                          🛡️ Trần cược: {roomState.wagerState.maxBetCap}đ ({roomState.wagerState.wagerMultiplierCap ?? 2.5}x)
                        </span>
                      )}
                      <span
                        className="px-2.5 py-0.5 rounded-full text-xs font-bold border"
                        style={{ color: bloomMeta.color, borderColor: `${bloomMeta.color}40`, background: bloomMeta.bg }}
                      >
                        {bloomMeta.emoji} {bloomMeta.labelVi} ({currentQuestion.question.points}đ)
                      </span>
                      {currentQuestion.streakCount && currentQuestion.streakCount >= 2 && (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/50 text-amber-300 animate-pulse whitespace-nowrap">
                          🔥 Streak x{currentQuestion.streakCount} (+{currentQuestion.streakCount === 2 ? 10 : currentQuestion.streakCount === 3 ? 20 : currentQuestion.streakCount === 4 ? 30 : 50}%)
                        </span>
                      )}

                      {/* Classic Gold Rush Indicator */}
                      {currentQuestion.isGoldQuestion && (
                        <span className="px-3 py-1 rounded-full text-xs font-black border-2 border-yellow-400 bg-gradient-to-r from-amber-500/30 to-yellow-500/30 text-yellow-300 shadow-[0_0_15px_rgba(234,179,8,0.5)] flex items-center gap-1.5 animate-pulse whitespace-nowrap">
                          <span>⭐</span>
                          <span>CÂU HỎI ĐIỂM VÀNG (x2 ĐIỂM)</span>
                        </span>
                      )}

                      {/* Mode tab switch for DICE_RACE */}
                      {roomState.mode === "DICE_RACE" && (
                        <div className="flex items-center gap-1 bg-black/60 p-0.5 rounded-xl border border-amber-500/40 shrink-0 ml-auto shadow">
                          <button
                            type="button"
                            onClick={() => setDisplayModeTab("QUESTION")}
                            className="px-3 py-1 rounded-lg text-xs font-black transition flex items-center gap-1 cursor-pointer bg-purple-600 text-white shadow"
                          >
                            <span>📖</span>
                            <span>{revealPayload ? "Đáp án" : "Câu hỏi"}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setDisplayModeTab("BOARD")}
                            className="px-3 py-1 rounded-lg text-xs font-black transition flex items-center gap-1 cursor-pointer text-slate-300 hover:text-white hover:bg-white/10"
                          >
                            <span>🗺️</span>
                            <span>Bàn cờ</span>
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Mode specific info banner */}
                    {roomState.mode === "BOUNCEBACK" && (
                      <div className="flex flex-wrap items-center gap-2 mt-1.5">
                        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white text-slate-950 font-black shadow-md border-2 border-slate-200">
                          <span className="text-blue-600">🎯</span>
                          <span className="text-xs uppercase tracking-wider text-slate-600 font-bold">Đội trả lời chính:</span>
                          <span className="text-base text-slate-950 font-black">{currentQuestion.primaryTeamName ?? "..."}</span>
                        </div>
                        {(stealBuzzed || currentQuestion.stealBuzzedTeamName) && (
                          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-red-600 via-rose-600 to-blue-600 text-white font-black shadow-lg border-2 border-white/60 animate-pulse">
                            <span>🚨</span>
                            <span className="text-xs uppercase tracking-wider text-red-100 font-bold">Đội bấm chuông cướp:</span>
                            <span className="text-base text-white font-black">{currentQuestion.stealBuzzedTeamName || stealBuzzed?.teamName}</span>
                          </div>
                        )}
                      </div>
                    )}
                    {roomState.mode === "BUZZ" && (buzzed || currentQuestion.buzzedTeamName) && (
                      <div className="flex flex-wrap items-center gap-2 mt-1.5">
                        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-red-600 via-rose-600 to-blue-600 text-white font-black shadow-lg border-2 border-white/60 animate-pulse">
                          <span>🚨</span>
                          <span className="text-xs uppercase tracking-wider text-red-100 font-bold">Đội bấm chuông:</span>
                          <span className="text-base text-white font-black">{currentQuestion.buzzedTeamName || buzzed?.playerName}</span>
                        </div>
                      </div>
                    )}
                    {roomState.mode === "TOURNAMENT" && (
                      <div className="flex flex-col gap-2 mt-1.5 w-full">
                        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white text-slate-950 font-black shadow-md border-2 border-slate-200 w-fit">
                          <span className="text-yellow-600">🏆</span>
                          <span className="text-xs uppercase tracking-wider text-slate-600 font-bold">Đối đầu 1v1:</span>
                          <span className="text-base text-slate-950 font-black">{currentQuestion.primaryTeamName ?? "..."}</span>
                        </div>

                        {/* Live Fan Support Meter */}
                        {(() => {
                          const match = roomState.tournamentState?.matches.find(
                            (m) => m.id === (currentQuestion.tournamentMatchId || roomState.tournamentState?.currentMatchId)
                          );
                          const countA = (liveCheer && match && liveCheer.matchId === match.id) ? liveCheer.countA : (match?.cheers?.countA || 0);
                          const countB = (liveCheer && match && liveCheer.matchId === match.id) ? liveCheer.countB : (match?.cheers?.countB || 0);
                          const total = countA + countB;
                          const pctA = total > 0 ? Math.round((countA / total) * 100) : 50;
                          const pctB = 100 - pctA;

                          return (
                            <div className="p-3 rounded-2xl bg-black/50 border border-white/10 shadow-lg space-y-1.5 max-w-2xl">
                              <div className="flex items-center justify-between text-xs font-bold px-1">
                                <span className="text-cyan-300 flex items-center gap-1.5 truncate max-w-[40%]">
                                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: match?.team1Color || "#06b6d4" }} />
                                  <span className="truncate">{match?.team1Name || "Đội 1"}: <strong>{pctA}%</strong> ({countA})</span>
                                </span>
                                <span className="text-muted-foreground uppercase tracking-widest text-[10px] font-black flex items-center gap-1 shrink-0">
                                  <span>🔥</span> FAN SUPPORT METER <span>🔥</span>
                                </span>
                                <span className="text-pink-300 flex items-center gap-1.5 truncate max-w-[40%] justify-end">
                                  <span className="truncate">{match?.team2Name || "Đội 2"}: <strong>{pctB}%</strong> ({countB})</span>
                                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: match?.team2Color || "#ec4899" }} />
                                </span>
                              </div>
                              <div className="h-3 w-full bg-slate-800 rounded-full overflow-hidden flex border border-white/20">
                                <div
                                  className="h-full bg-gradient-to-r from-cyan-500 to-blue-600 transition-all duration-500"
                                  style={{ width: `${pctA}%` }}
                                />
                                <div
                                  className="h-full bg-gradient-to-r from-rose-500 to-pink-500 transition-all duration-500"
                                  style={{ width: `${pctB}%` }}
                                />
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    )}
                    {roomState.mode === "GRID_CARO" && (
                      <p className="text-base sm:text-lg font-black text-purple-300 mt-1 flex items-center gap-2">
                        <GameModeIcon mode="GRID_CARO" className="w-5 h-5 shrink-0 inline-block" />
                        <span>Ô số #{currentQuestion.gridCellId ?? "?"} — Lượt của {currentQuestion.primaryTeamName ?? "..."}</span>
                      </p>
                    )}
                    {roomState.mode === "DICE_RACE" && (
                      <p className="text-base sm:text-lg font-black text-indigo-300 mt-1 flex items-center gap-2">
                        <GameModeIcon mode="DICE_RACE" className="w-5 h-5 shrink-0 inline-block" />
                        <span>Xúc xắc: {currentQuestion.diceRollValue ?? "?"} nút — Lượt của {currentQuestion.primaryTeamName ?? "..."}</span>
                      </p>
                    )}
                    {roomState.mode === "WAGER" && (
                      <div className="flex flex-wrap items-center gap-2 mt-1.5">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-xl bg-amber-500/20 text-yellow-300 font-bold border border-amber-500/40 shadow-sm text-sm">
                          <span>👑</span>
                          <span className="text-xs uppercase tracking-wider opacity-80">Đội cược điểm:</span>
                          <span className="text-white font-black">{currentQuestion.primaryTeamName || "Đang xác định"}</span>
                          <span className="text-amber-300 font-mono font-black">({roomState.wagerState?.currentHighestWager || 10}đ cược)</span>
                        </div>
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40 text-xs">
                          <span>🎯</span>
                          <span>Đội khác đúng nhận +{Math.max(5, Math.floor((currentQuestion.question?.points || 10) / 2))}đ</span>
                        </div>
                      </div>
                    )}
                    {roomState.mode === "MYSTERY_QUEST" && (
                      <div className="flex flex-wrap items-center gap-2 mt-1.5">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-xl bg-purple-500/20 text-purple-300 font-bold border border-purple-500/40 shadow-sm text-sm">
                          <GameModeIcon mode="MYSTERY_QUEST" className="w-4 h-4 shrink-0 inline-block" />
                          <span className="text-xs uppercase tracking-wider opacity-80">Lượt thi đấu:</span>
                          <span className="text-white font-black">{roomState.mysteryQuestState?.currentTurnTeamName || currentQuestion.primaryTeamName || "..."}</span>
                          <span className="text-amber-300 font-mono font-black">(Hũ: {roomState.mysteryQuestState?.potPoints || 0}đ)</span>
                        </div>
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40 text-xs">
                          <span>🗝️</span>
                          <span>Đúng để mở khóa bản đồ lật thẻ may mắn!</span>
                        </div>
                      </div>
                    )}
                    {roomState.config.answerMethod === "MC" && (
                      <p className="text-xs text-yellow-300 font-medium mt-0.5 inline-flex items-center gap-1.5">
                        <SystemIcon name="mc" className="w-3.5 h-3.5 shrink-0 text-yellow-300" />
                        <span>Chế độ trả lời miệng qua MC / Ban giám khảo</span>
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Question content */}
              <h2 className="text-lg sm:text-2xl font-bold mb-2.5 sm:mb-4 leading-snug">{currentQuestion.question.content}</h2>

              {currentQuestion.question.mediaUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={currentQuestion.question.mediaUrl} alt="Question media" className="max-h-44 sm:max-h-56 rounded-xl mb-3 sm:mb-4 mx-auto" />
              )}

              {/* Options */}
              {currentQuestion.question.options && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-2.5">
                  {currentQuestion.question.options.map((opt, i) => {
                    const labels = ["A", "B", "C", "D", "E", "F"];
                    const isRevealed = revealPayload?.correctAnswer.includes(opt.id);
                    return (
                      <div
                        key={opt.id}
                        className={`p-2.5 sm:p-3.5 rounded-xl border-2 transition-all text-sm sm:text-base font-medium ${
                          revealPayload
                            ? isRevealed
                              ? "border-green-500 bg-green-500/20 text-green-300 ring-2 ring-green-500/50"
                              : "border-border opacity-40"
                            : "border-border glass"
                        }`}
                      >
                        <span className="font-black mr-2 sm:mr-2.5 text-purple-400">{labels[i]}.</span>
                        {opt.text}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Prominent Correct Answer Banner on Reveal */}
              {revealPayload && (
                <div className="mt-3 p-3 sm:p-4 rounded-xl bg-gradient-to-r from-emerald-500/20 via-green-500/20 to-teal-500/20 border-2 border-emerald-500 shadow-xl animate-slide-up space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xl sm:text-2xl">✅</span>
                    <span className="text-xs sm:text-sm font-black uppercase tracking-wider text-emerald-300">
                      ĐÁP ÁN CHÍNH XÁC
                    </span>
                  </div>
                  <p className="text-lg sm:text-2xl font-black text-white leading-relaxed">
                    {revealPayload.correctAnswerText ||
                      (Array.isArray(revealPayload.correctAnswer)
                        ? revealPayload.correctAnswer.join(", ")
                        : revealPayload.correctAnswer)}
                  </p>
                  {(revealPayload.explanation || currentQuestion.question.hint) && (
                    <div className="pt-2 border-t border-emerald-500/30 text-xs sm:text-sm text-emerald-200/90 flex items-start gap-1.5">
                      <span className="font-bold shrink-0">💡 Giải thích:</span>
                      <span className="leading-relaxed">
                        {revealPayload.explanation || currentQuestion.question.hint}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
            )}

            {/* Rarity & Team Results on Reveal */}
            {revealPayload && (
              <div className="mt-6 space-y-3 animate-slide-up">
                {revealPayload.rarityBonusPercent !== undefined && revealPayload.rarityBonusPercent > 0 && (
                  <div className="p-4 rounded-xl bg-gradient-to-r from-purple-500/20 via-pink-500/20 to-amber-500/20 border border-purple-500/40 text-center animate-bounce-in">
                    <p className="font-black text-amber-300 text-lg">
                      🌟 CÂU HỎI PHÂN HÓA CAO (Tỷ lệ đúng toàn phòng: {Math.round((revealPayload.roomAccuracy ?? 0) * 100)}%)
                    </p>
                    <p className="text-sm text-purple-200/90 mt-1">
                      Các đội đúng được cộng thưởng thêm <strong>+{revealPayload.rarityBonusPercent}%</strong> điểm theo độ khó thực nghiệm &amp; độ phân loại!
                    </p>
                  </div>
                )}

                {revealPayload.teamSummaries && revealPayload.teamSummaries.length > 0 && (
                  <div className="p-4 rounded-2xl glass border border-purple-500/40">
                    <h3 className="font-bold text-base mb-3 text-cyan-400 flex items-center gap-2">
                      <span>📊</span> Điểm đồng đội câu này:
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {revealPayload.teamSummaries.map((ts) => {
                        const isGhostTeam = roomState.mode === "ELIMINATION" && (ts.isEliminated || (ts.pointsAwarded === 0 && ts.correctMembers > 0));
                        return (
                          <div key={ts.teamId} className="p-3 rounded-xl bg-card border border-border flex flex-col justify-between gap-1.5">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2 min-w-0">
                                <div className="w-4 h-4 rounded-full shrink-0" style={{ background: ts.teamColor }} />
                                <span className="font-bold truncate text-base">{ts.teamName}</span>
                                {isGhostTeam && (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700 font-sans">
                                    Bóng ma
                                  </span>
                                )}
                              </div>
                              <div className="text-right shrink-0">
                                <p className="text-xs text-muted-foreground">{ts.correctMembers}/{ts.totalOnlineMembers} đúng</p>
                                <p className={`font-mono font-bold text-lg ${ts.pointsAwarded >= 0 ? "text-green-400" : "text-red-400"}`}>
                                  {roomState.mode === "DICE_RACE"
                                    ? (ts.correctMembers > 0 ? "✓ Đúng" : "✗ Sai")
                                    : isGhostTeam
                                    ? (ts.correctMembers > 0 ? "✓ Hồi sinh +1" : "✗ 0đ")
                                    : `${ts.pointsAwarded >= 0 ? `+${ts.pointsAwarded.toLocaleString()}` : ts.pointsAwarded.toLocaleString()} pts`}
                                </p>
                              </div>
                            </div>
                            {(roomState.mode === "CLASSIC" || roomState.mode === "ELIMINATION") && !isGhostTeam && ts.pointsAwarded > 0 && (
                              <div className="flex items-center gap-2 text-xs text-muted-foreground pt-1 border-t border-border/50 flex-wrap">
                                <span className="text-zinc-400">Sàn: {(ts.basePoints ?? 500).toLocaleString()}</span>
                                {(ts.speedPoints ?? 0) > 0 && (
                                  <span className="text-blue-400 font-semibold">⚡+{(ts.speedPoints ?? 0).toLocaleString()}</span>
                                )}
                                {(ts.streakPoints ?? 0) > 0 && (
                                  <span className="text-amber-400 font-semibold">🔥+{(ts.streakPoints ?? 0).toLocaleString()}</span>
                                )}
                                {(ts.rarityPoints ?? 0) > 0 && (
                                  <span className="text-purple-400 font-semibold">🌟+{(ts.rarityPoints ?? 0).toLocaleString()}</span>
                                )}
                                {ts.avgTimeSpent !== undefined && ts.avgTimeSpent > 0 && (
                                  <span className="text-zinc-500 font-mono">({(ts.avgTimeSpent / 1000).toFixed(2)}s)</span>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* DICE_RACE Advance to board banner & action */}
                {roomState.mode === "DICE_RACE" && (
                  <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/25 via-yellow-500/20 to-orange-500/25 border-2 border-amber-500/60 flex flex-wrap items-center justify-between gap-3 shadow-xl animate-bounce-in">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">🎲</span>
                      <div>
                        <p className="font-black text-base sm:text-lg text-amber-200">
                          Đã công bố đáp án! Lượt gieo xúc xắc tiếp theo: <strong className="text-yellow-300 underline">{roomState.diceRaceState?.currentTurnTeamName || "Thí sinh"}</strong>
                        </p>
                        <p className="text-xs text-amber-300/80 mt-0.5">
                          MC / Admin bấm &quot;Về bàn cờ&quot; trên điều khiển hoặc bấm nút bên phải để chuyển màn chiếu sang Bàn Cờ Đường Đua.
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setDisplayModeTab("BOARD");
                        socketRef.current?.emit("admin:dice:advance_to_board");
                      }}
                      className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 via-orange-400 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 text-black font-black text-sm shadow-xl transition active:scale-95 flex items-center gap-2 whitespace-nowrap cursor-pointer animate-pulse"
                    >
                      <span>🗺️</span>
                      <span>Chuyển qua bàn cờ ngay</span>
                    </button>
                  </div>
                )}
              </div>
            )}
            {revealPayload && roomState.mode === "WAGER" && roomState.wagerState && (
              <div className="mt-4">
                <WagerPanel
                  wagerState={roomState.wagerState}
                  isDisplay={true}
                  teams={roomState.teams}
                  positiveTeamsCount={roomState.teams.filter((t) => t.score > 0).length}
                  onGrantBailout={(teamId) => {
                    if (typeof window !== "undefined" && window.self !== window.top) {
                      window.parent.postMessage({ type: "WAGER_GRANT_BAILOUT", teamId }, "*");
                    }
                    socketRef.current?.emit("admin:wager:grant_bailout" as any, { teamId });
                  }}
                  onSetBailoutLimit={(limit) => {
                    if (typeof window !== "undefined" && window.self !== window.top) {
                      window.parent.postMessage({ type: "WAGER_SET_BAILOUT_LIMIT", limit }, "*");
                    }
                    socketRef.current?.emit("admin:wager:set_bailout_limit" as any, { limit });
                  }}
                />
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

        {(
          (roomState.mode === "MYSTERY_QUEST" &&
            roomState.mysteryQuestState &&
            (roomState.mysteryQuestState.phase === "PUSH_YOUR_LUCK" ||
              (roomState.mysteryQuestState.phase === "TURN_SUMMARY" && Boolean(revealPayload)))) ||
          (!currentQuestion && roomState.mode !== "MYSTERY_QUEST") ||
          (!currentQuestion && roomState.mode === "MYSTERY_QUEST" && roomState.mysteryQuestState?.phase !== "QUESTION_ACTIVE")
        ) && (
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
                <WagerPanel
                  wagerState={roomState.wagerState}
                  isDisplay={true}
                  teams={roomState.teams}
                  positiveTeamsCount={roomState.teams.filter((t) => t.score > 0).length}
                  onGrantBailout={(teamId) => {
                    if (typeof window !== "undefined" && window.self !== window.top) {
                      window.parent.postMessage({ type: "WAGER_GRANT_BAILOUT", teamId }, "*");
                    }
                    socketRef.current?.emit("admin:wager:grant_bailout" as any, { teamId });
                  }}
                  onSetBailoutLimit={(limit) => {
                    if (typeof window !== "undefined" && window.self !== window.top) {
                      window.parent.postMessage({ type: "WAGER_SET_BAILOUT_LIMIT", limit }, "*");
                    }
                    socketRef.current?.emit("admin:wager:set_bailout_limit" as any, { limit });
                  }}
                />
              </div>
            ) : roomState.mode === "MYSTERY_QUEST" && roomState.mysteryQuestState && (roomState.mysteryQuestState.phase === "DECISION_CHOICE" || roomState.mysteryQuestState.phase === "PUSH_YOUR_LUCK" || (roomState.mysteryQuestState.phase === "TURN_SUMMARY" && Boolean(revealPayload))) ? (
              <div className="w-full max-w-5xl">
                <MysteryQuestBoard
                  mysteryState={roomState.mysteryQuestState}
                  isDisplay={true}
                  teams={roomState.teams}
                />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center p-6 space-y-4 text-center">
                <div className="w-16 h-16 rounded-full bg-purple-500/20 flex items-center justify-center text-3xl animate-pulse">
                  📊
                </div>
                <div>
                  <h3 className="text-2xl font-black text-white">BẢNG XẾP HẠNG THỜI GIAN THỰC</h3>
                  <p className="text-sm text-cyan-300 mt-1">Đang chờ câu hỏi tiếp theo từ Quản trò...</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Leaderboard sidebar */}
      <div className="glass rounded-2xl p-2.5 sm:p-3 flex flex-col gap-1.5 min-h-0 overflow-hidden">
        <div className="flex items-center justify-between pb-1 border-b border-white/10 shrink-0">
          <h3 className="text-sm font-bold inline-flex items-center gap-1.5 text-white">
            <SystemIcon name="trophy" className="w-4 h-4 text-amber-400 shrink-0" />
            <span>Bảng điểm</span>
          </h3>
          <div className="flex items-center gap-1">
            <button
              onClick={(e) => { e.stopPropagation(); setShowRulesModal(true); }}
              className="px-2 py-0.5 rounded-lg text-[11px] font-bold glass border border-white/20 text-cyan-300 hover:text-white hover:bg-white/10 transition flex items-center gap-1"
            >
              <span>📖</span>
              <span>Luật</span>
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); toggleSound(); }}
              className="px-2 py-0.5 rounded-lg text-[11px] font-bold glass border border-white/20 hover:bg-white/10 transition"
            >
              {soundMuted ? "🔇 Tắt" : "🔊 Bật"}
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto space-y-1 pr-0.5 min-h-0">
          {sortedTeams.map((entry: any, i) => (
            <div key={entry.id} className="flex items-center gap-2 p-2 rounded-lg text-xs" style={{ background: `${entry.color ?? "#6366f1"}20` }}>
              <span className="text-sm font-black w-6 text-center shrink-0">{i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}`}</span>
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate">{entry.name}</p>
              </div>
              <span className="font-bold font-mono text-cyan-400 shrink-0">{entry.score.toLocaleString()}đ</span>
            </div>
          ))}
        </div>
      </div>

      {/* Rules Modal */}
      <GameModeRulesModal
        mode={roomState?.mode}
        isOpen={showRulesModal}
        onClose={() => setShowRulesModal(false)}
      />

      {/* Steal Prep Countdown overlay */}
      {stealPrepCountdown && (
        <StealPrepCountdown
          teamName={stealPrepCountdown.teamName}
          initialSeconds={stealPrepCountdown.seconds}
          onComplete={() => setStealPrepCountdown(null)}
        />
      )}

      <style jsx global>{`
        @keyframes floatUp {
          0% {
            transform: translateY(0) scale(0.8) rotate(0deg);
            opacity: 1;
          }
          50% {
            transform: translateY(-160px) scale(1.3) rotate(-8deg);
            opacity: 0.95;
          }
          100% {
            transform: translateY(-340px) scale(1.6) rotate(8deg);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}
