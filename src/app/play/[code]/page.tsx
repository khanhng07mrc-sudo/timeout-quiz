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
  GameIntermissionPayload,
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
import MysteryQuestBoard from "@/components/modes/MysteryQuestBoard";
import MagicWheelBoard from "@/components/modes/MagicWheelBoard";
import TieBreakerOverlay from "@/components/modes/TieBreakerOverlay";
import type { TieBreakerState } from "@/types";
import GameModeRulesModal from "@/components/ui/GameModeRulesModal";
import StealPrepCountdown from "@/components/ui/StealPrepCountdown";
import {
  syncClockWithServer,
  calculateAuthoritativeTimer,
  calibrateClockFromPacket,
  getServerTime,
} from "@/lib/clock-sync";
import { ContinuousTimerBar, ContinuousTimerRing } from "@/components/ui/ContinuousTimerBar";

export default function PlayPage() {
  const { code } = useParams<{ code: string }>();
  const router = useRouter();
  const socketRef = useRef<Socket<ServerToClientEvents, ClientToServerEvents> | null>(null);

  const [connected, setConnected] = useState(false);
  const [roomState, setRoomState] = useState<RoomState | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<QuestionState | null>(null);
  const [revealPayload, setRevealPayload] = useState<AnswerRevealPayload | null>(null);
  const [gameEnd, setGameEnd] = useState<GameEndPayload | null>(null);
  const [tieBreaker, setTieBreaker] = useState<TieBreakerState | null>(null);
  const [playerId, setPlayerId] = useState("");
  const [timer, setTimer] = useState<{ remaining: number; total: number; endsAt?: number } | null>(null);
  const [buzzedBy, setBuzzedBy] = useState<{ playerName: string; teamId?: string; teamName?: string } | null>(null);
  const [lastPowerup, setLastPowerup] = useState<PowerupUsedPayload | null>(null);
  const [answered, setAnswered] = useState(false);
  const [submittedAnswer, setSubmittedAnswer] = useState<string | string[] | null>(null);
  const [hiddenOptionIds, setHiddenOptionIds] = useState<string[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isStealPhase, setIsStealPhase] = useState(false);
  const [stealBuzzedTeam, setStealBuzzedTeam] = useState<{ teamId: string; teamName: string; playerId: string; playerName: string } | null>(null);
  const [matchStarting, setMatchStarting] = useState<{ seconds: number; endsAt?: number; total?: number } | null>(null);
  const [questionPrepare, setQuestionPrepare] = useState<GamePreparePayload | null>(null);
  const [intermission, setIntermission] = useState<GameIntermissionPayload | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(() => {
    if (typeof window !== "undefined") {
      const isSb = new URLSearchParams(window.location.search).get("sandbox") === "1" || window.self !== window.top;
      return !isSb; // True in real play (bật âm tất cả), False in sandbox
    }
    return true;
  });
  const [showRulesModal, setShowRulesModal] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [isSandbox, setIsSandbox] = useState(() => {
    if (typeof window !== "undefined") {
      return new URLSearchParams(window.location.search).get("sandbox") === "1" || window.self !== window.top;
    }
    return false;
  });
  const isSandboxRef = useRef(false);
  const joinRoomRef = useRef<() => void>(() => {});
  const retryJoinTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [activeTeamId, setActiveTeamId] = useState<string>("");
  const [selectedTeamId, setSelectedTeamId] = useState<string>(() => {
    if (typeof window !== "undefined") {
      const searchParams = new URLSearchParams(window.location.search);
      const pt = searchParams.get("teamId");
      if (pt) return pt;
      return sessionStorage.getItem(`timeout_team_id_${code}`) || "";
    }
    return "";
  });
  const [activePlayerName, setActivePlayerName] = useState<string>("");
  const [stealPrepCountdown, setStealPrepCountdown] = useState<{ teamName: string; seconds: number } | null>(null);
  const [usedCardTypes, setUsedCardTypes] = useState<import("@/types").CardType[]>([]);
  const [sharedPowerupLocked, setSharedPowerupLocked] = useState<boolean>(false);
  const [sharedPowerupLockedTeamName, setSharedPowerupLockedTeamName] = useState<string | undefined>(undefined);
  const soundEnabledRef = useRef(true);

  const myTeamIdRef = useRef<string | undefined>(undefined);
  const playerIdRef = useRef<string>("");
  const lastQuestionIdRef = useRef<string | null>(null);
  const lastRevealKeyRef = useRef<string | null>(null);
  const teamAnswersRef = useRef<Map<string, string | string[]>>(new Map());

  const currentQuestionRef = useRef<QuestionState | null>(null);
  currentQuestionRef.current = currentQuestion;
  const roomStateRef = useRef<RoomState | null>(null);
  roomStateRef.current = roomState;
  const handleAnswerRef = useRef<(ans: string | string[], explicitTeamId?: string) => void>(() => {});
  const handleBuzzRef = useRef<() => void>(() => {});
  const handleSubmitWagerRef = useRef<(amt: number) => void>(() => {});

  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    soundEnabledRef.current = next;
    soundManager.setMuted(!next);
    if (next) soundManager.unlockAudio();
  };

  // Authoritative ticker for match warmup countdown (5s)
  const lastMatchTickRef = useRef<number | null>(null);
  useEffect(() => {
    if (!matchStarting) {
      lastMatchTickRef.current = null;
      return;
    }
    const endsAt = matchStarting.endsAt || (getServerTime() + matchStarting.seconds * 1000);
    const total = matchStarting.total || 5;

    // Immediate tick for current second
    const initRem = Math.max(0, Math.min(total, Math.ceil((endsAt - getServerTime()) / 1000)));
    if (initRem > 0 && lastMatchTickRef.current !== initRem && soundEnabledRef.current) {
      lastMatchTickRef.current = initRem;
      soundManager.playCountdownTick(initRem);
    }

    const interval = setInterval(() => {
      const now = getServerTime();
      const rawRem = Math.max(0, Math.ceil((endsAt - now) / 1000));
      const remaining = Math.min(total, rawRem);

      if (lastMatchTickRef.current !== remaining && remaining > 0 && soundEnabledRef.current) {
        lastMatchTickRef.current = remaining;
        soundManager.playCountdownTick(remaining);
      }

      setMatchStarting((prev) => {
        if (!prev) return null;
        const safeSeconds = Math.min(prev.seconds, remaining);
        if (prev.seconds === safeSeconds) return prev;
        return { ...prev, seconds: safeSeconds };
      });

      if (remaining <= 0) {
        setMatchStarting(null);
        clearInterval(interval);
      }
    }, 50);

    return () => clearInterval(interval);
  }, [matchStarting?.endsAt]);

  // Authoritative ticker for question preparation countdown (3s)
  const lastPrepareTickRef = useRef<number | null>(null);
  useEffect(() => {
    if (!questionPrepare) {
      lastPrepareTickRef.current = null;
      return;
    }
    const endsAt = questionPrepare.endsAt || (getServerTime() + questionPrepare.seconds * 1000);
    const total = questionPrepare.total || 3;

    // Immediate tick for current second
    const initRem = Math.max(0, Math.min(total, Math.ceil((endsAt - getServerTime()) / 1000)));
    if (initRem > 0 && lastPrepareTickRef.current !== initRem && soundEnabledRef.current) {
      lastPrepareTickRef.current = initRem;
      soundManager.playCountdownTick(initRem);
    }

    const interval = setInterval(() => {
      const now = getServerTime();
      const rawRem = Math.max(0, Math.ceil((endsAt - now) / 1000));
      const remaining = Math.min(total, rawRem);

      if (lastPrepareTickRef.current !== remaining && remaining > 0 && soundEnabledRef.current) {
        lastPrepareTickRef.current = remaining;
        soundManager.playCountdownTick(remaining);
      }

      setQuestionPrepare((prev) => {
        if (!prev) return null;
        const safeSeconds = Math.min(prev.seconds, remaining);
        if (prev.seconds === safeSeconds) return prev;
        return { ...prev, seconds: safeSeconds };
      });

      if (remaining <= 0) {
        setQuestionPrepare(null);
        clearInterval(interval);
      }
    }, 50);

    return () => clearInterval(interval);
  }, [questionPrepare?.endsAt]);

  // Authoritative local countdown ticker for 0s lag across screens
  useEffect(() => {
    if (!timer?.endsAt) return;
    const interval = setInterval(() => {
      const auth = calculateAuthoritativeTimer(timer.endsAt, timer.total, timer.remaining);
      setTimer((prev) => {
        if (!prev) return null;
        // Monotonic non-increasing: in the same question countdown, never jump backwards +1s
        // Also hold at 1s for up to 350ms past endsAt until server's game:timer:expired arrives so last-second clicks are never blocked by minor clock skew
        const rawAuthRem =
          auth.remaining <= 0 && prev.remaining > 0 && timer.endsAt && timer.endsAt - getServerTime() > -350
            ? 1
            : auth.remaining;
        const safeRemaining = Math.min(prev.remaining, rawAuthRem);
        if (prev.remaining === safeRemaining) return prev;
        return { ...prev, remaining: safeRemaining };
      });
    }, 100);
    return () => clearInterval(interval);
  }, [timer?.endsAt, timer?.total]);

  useEffect(() => {
    const searchParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
    const isSandboxParam = Boolean(searchParams?.get("sandbox") === "1" || (typeof window !== "undefined" && window.self !== window.top));
    isSandboxRef.current = isSandboxParam;
    setIsSandbox(isSandboxParam);

    if (isSandboxParam) {
      // Sandbox: Contestant audio is MUTED by default (âm thanh chỉ kích hoạt trên màn hình Display)
      soundManager.setMuted(true);
      setSoundEnabled(false);
      soundEnabledRef.current = false;
    } else {
      // Chơi chính: Bật âm thanh tất cả máy thí sinh theo yêu cầu
      soundManager.setMuted(false);
      setSoundEnabled(true);
      soundEnabledRef.current = true;

      const unlockAudio = () => {
        soundManager.unlockAudio();
        window.removeEventListener("pointerdown", unlockAudio);
        window.removeEventListener("keydown", unlockAudio);
      };
      window.addEventListener("pointerdown", unlockAudio, { once: true });
      window.addEventListener("keydown", unlockAudio, { once: true });
    }
    const paramTeamId = searchParams?.get("teamId") || "";
    const paramTeamIndex = searchParams?.get("teamIndex");
    const paramName = searchParams?.get("name") || "";
    const paramPlayerId = searchParams?.get("playerId") || "";

    if (paramTeamId) {
      myTeamIdRef.current = paramTeamId;
      setSelectedTeamId(paramTeamId);
    }

    const storageKey = paramTeamIndex !== null && paramTeamIndex !== undefined
      ? `timeout_player_id_${code}_t${paramTeamIndex}`
      : `timeout_player_id_${code}`;

    let savedPlayerId = isSandboxParam
      ? (paramPlayerId || `sb_${code}_t0`)
      : (paramPlayerId || sessionStorage.getItem(storageKey) || localStorage.getItem(storageKey));
    if (!savedPlayerId) {
      savedPlayerId = paramTeamIndex !== null && paramTeamIndex !== undefined
        ? `sb_${code}_t0`
        : `p_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    }
    sessionStorage.setItem(storageKey, savedPlayerId);
    localStorage.setItem(storageKey, savedPlayerId);
    playerIdRef.current = savedPlayerId;
    setPlayerId(savedPlayerId);
    const playerName = paramName || sessionStorage.getItem("playerName") || localStorage.getItem("playerName") || "Thí sinh";

    const handlePostMessage = (e: MessageEvent) => {
      if (e.data?.type === "SWITCH_ACTIVE_TEAM") {
        const teamId = e.data.payload?.teamId || e.data.teamId;
        const teamName = e.data.payload?.teamName || e.data.teamName || e.data.playerName || "";
        const currentAns = e.data.payload?.currentAnswer ?? e.data.currentAnswer;
        if (teamId) {
          myTeamIdRef.current = teamId;
          setActiveTeamId(teamId);
          setSelectedTeamId(teamId);
          if (teamName) setActivePlayerName(teamName);
          setErrorMessage(null);
          setConnected(true);

          const teamIdx = e.data.payload?.teamIndex ?? e.data.teamIndex ?? 0;
          const teamPlayerId = isSandboxRef.current
            ? `sb_${code}_t${teamIdx}`
            : playerIdRef.current;
          playerIdRef.current = teamPlayerId;
          setPlayerId(teamPlayerId);

          // 1. Instantly sync question, timer, and reveal state from sandbox host if provided
          if (e.data.currentQuestion !== undefined) {
            const incomingQId = e.data.currentQuestion?.question?.id ?? null;
            if (incomingQId !== lastQuestionIdRef.current) {
              lastQuestionIdRef.current = incomingQId;
              teamAnswersRef.current.clear();
              setSubmittedAnswer(null);
              setAnswered(false);
            }
            setCurrentQuestion(e.data.currentQuestion);
          }
          if (e.data.timer !== undefined) {
            setTimer(e.data.timer);
          }
          if (e.data.revealPayload !== undefined) {
            setRevealPayload(e.data.revealPayload);
          }

          // 2. Synchronize teams' answers ONLY if an active question is currently in play
          const hasActiveQuestion = Boolean(e.data.currentQuestion && !e.data.revealPayload);
          if (!hasActiveQuestion) {
            teamAnswersRef.current.clear();
            setSubmittedAnswer(null);
            setAnswered(false);
          } else {
            if (e.data.allTeamAnswers && typeof e.data.allTeamAnswers === "object") {
              Object.entries(e.data.allTeamAnswers).forEach(([tid, ans]) => {
                if (ans !== undefined && ans !== null) {
                  teamAnswersRef.current.set(tid, ans as any);
                } else {
                  teamAnswersRef.current.delete(tid);
                }
              });
            }

            if (currentAns !== undefined && currentAns !== null) {
              teamAnswersRef.current.set(teamId, currentAns);
            }
            const savedTeamAns = (currentAns !== undefined && currentAns !== null)
              ? currentAns
              : (teamAnswersRef.current.get(teamId) ?? null);

            setSubmittedAnswer(savedTeamAns);
            setAnswered(savedTeamAns !== null && savedTeamAns !== undefined);
          }

          // Instantly adopt roomState without waiting for network round-trip
          setRoomState((prev) => {
            const base = e.data.roomState || prev;
            if (!base) return prev;
            const pName = teamName || "Bạn (Tester)";
            const exists = base.players.some((p: any) => p.id === teamPlayerId);
            let updatedPlayers: any[];
            if (exists) {
              updatedPlayers = base.players.map((p: any) =>
                p.id === teamPlayerId ? { ...p, teamId, name: pName } : p
              );
            } else {
              updatedPlayers = [
                ...base.players,
                { id: teamPlayerId, name: pName, score: 0, teamId, isHost: true, isOnline: true },
              ];
            }
            return { ...base, players: updatedPlayers };
          });

          // Inform backend in background (fire-and-forget, 0ms blocking)
          if (socketRef.current?.connected) {
            socketRef.current.emit("player:select:team", { teamId, playerId: teamPlayerId });
          }
        }
        return;
      }
      if (e.data?.type === "FORCE_TESTER_ACTION") {
        const { action, answer, isCorrect, amount, teamId, teamIndex } = e.data;
        if (teamId) {
          myTeamIdRef.current = teamId;
          setActiveTeamId(teamId);
          setSelectedTeamId(teamId);
          if (isSandboxRef.current) {
            const teamPlayerId = `sb_${code}_t0`;
            playerIdRef.current = teamPlayerId;
            setPlayerId(teamPlayerId);
            if (socketRef.current?.connected) {
              socketRef.current.emit("player:select:team", { teamId, playerId: teamPlayerId }, (res: any) => {
                if (!res?.success) {
                  socketRef.current?.emit("room:join", {
                    code,
                    playerName: "Bạn (Tester)",
                    playerId: teamPlayerId,
                    teamId,
                  }, () => {});
                }
              });
            }
          }
        }
        if (action === "buzz") {
          handleBuzzRef.current();
        } else if (action === "wager" && typeof amount === "number") {
          handleSubmitWagerRef.current(amount);
        } else if (action === "answer") {
          if (answer) {
            handleAnswerRef.current(answer, teamId);
          } else if (currentQuestionRef.current && isCorrect !== undefined) {
            const opts = currentQuestionRef.current.question.options || [];
            if (opts.length > 0) {
              const chosen = isCorrect ? opts[0] : opts[opts.length - 1];
              handleAnswerRef.current(chosen.id, teamId);
            }
          }
        }
        return;
      }
      if (e.data?.type === "OFFLINE_SYNC" && e.data.payload) {
        setConnected(true);
        const p = e.data.payload;
        if (p.roomState !== undefined) {
          const curTeam = myTeamIdRef.current || activeTeamId;
          const currentPid = playerIdRef.current;
          let patchedState = p.roomState;
          if (curTeam && patchedState?.players) {
            const exists = patchedState.players.some((pl: any) => pl.id === currentPid);
            if (exists) {
              patchedState = {
                ...patchedState,
                players: patchedState.players.map((pl: any) => pl.id === currentPid ? { ...pl, teamId: curTeam } : pl),
              };
            }
          }
          setRoomState(patchedState);
        }
        if (p.currentQuestion !== undefined) {
          const newQId = p.currentQuestion?.question?.id ?? null;
          const isDifferentQ = newQId !== lastQuestionIdRef.current;
          lastQuestionIdRef.current = newQId;
          setCurrentQuestion(p.currentQuestion);
          if (isDifferentQ) {
            teamAnswersRef.current.clear();
            setAnswered(false);
            setSubmittedAnswer(null);
            setSharedPowerupLocked(Boolean(p.currentQuestion?.hasSharedPowerupUsed));
            setSharedPowerupLockedTeamName(undefined);
            setUsedCardTypes([]);
          }
        }
        if (p.revealPayload !== undefined) {
          setRevealPayload(p.revealPayload);
          setIsStealPhase(false);
          if (p.revealPayload && soundEnabledRef.current) {
            const payloadKey = p.revealPayload.questionId || (p.revealPayload.correctAnswer ? JSON.stringify(p.revealPayload.correctAnswer) : "revealed");
            if (lastRevealKeyRef.current !== payloadKey) {
              lastRevealKeyRef.current = payloadKey;
              soundManager.stopQuestionMusic(600, true);
              const myAns = p.revealPayload.answers?.find(
                (a: any) => a.playerId === playerIdRef.current || (myTeamIdRef.current && a.teamId === myTeamIdRef.current)
              );
              if (myAns?.isCorrect) {
                soundManager.playCorrect();
              } else {
                soundManager.playWrong();
              }
            }
          } else if (!p.revealPayload) {
            lastRevealKeyRef.current = null;
          }
        }
        if (p.timer !== undefined) {
          if (p.timer === null) {
            setTimer(null);
          } else {
            setTimer((prev) => {
              if (!prev || !p.timer) return p.timer;
              if (prev.endsAt !== p.timer.endsAt) return p.timer;
              if (p.timer.remaining === 0 && prev.remaining !== 0) return { ...prev, remaining: 0 };
              return prev;
            });
          }
          if (p.timer?.remaining === 0 && soundEnabledRef.current) {
            soundManager.stopQuestionMusic(600, true);
          }
        }
        if (p.buzzedBy !== undefined) setBuzzedBy(p.buzzedBy);
        if (p.lastPowerup !== undefined) setLastPowerup(p.lastPowerup);
        if (p.matchStarting !== undefined) {
          if (p.matchStarting === null) {
            setMatchStarting(null);
          } else {
            setMatchStarting((prev) => {
              const stableEndsAt = prev?.endsAt || p.matchStarting.endsAt || (getServerTime() + p.matchStarting.seconds * 1000);
              const safeSeconds = prev ? Math.min(prev.seconds, p.matchStarting.seconds) : p.matchStarting.seconds;
              if (prev && prev.endsAt === stableEndsAt && prev.seconds === safeSeconds) return prev;
              return { ...p.matchStarting, seconds: safeSeconds, endsAt: stableEndsAt, total: p.matchStarting.total || prev?.total || 5 };
            });
          }
        }
        if (p.questionPrepare !== undefined) {
          if (p.questionPrepare === null) {
            setQuestionPrepare(null);
          } else {
            setQuestionPrepare((prev) => {
              const stableEndsAt = prev?.endsAt || p.questionPrepare.endsAt || (getServerTime() + p.questionPrepare.seconds * 1000);
              const safeSeconds = prev ? Math.min(prev.seconds, p.questionPrepare.seconds) : p.questionPrepare.seconds;
              if (prev && prev.endsAt === stableEndsAt && prev.seconds === safeSeconds) return prev;
              return { ...p.questionPrepare, seconds: safeSeconds, endsAt: stableEndsAt, total: p.questionPrepare.total || prev?.total || 3 };
            });
          }
        }
        if (p.intermission !== undefined) setIntermission(p.intermission);
        if (p.gameEnd !== undefined) {
          setGameEnd(p.gameEnd);
        }
        if (p.isStealOpen !== undefined) setIsStealPhase(p.isStealOpen);
        if (p.stealBuzzed !== undefined) setStealBuzzedTeam(p.stealBuzzed);
        if (p.tournamentState !== undefined) {
          setRoomState((prev) => (prev ? { ...prev, tournamentState: p.tournamentState } : prev));
        }
        if (p.oracleScores !== undefined) {
          setRoomState((prev) => {
            if (!prev || !prev.tournamentState) return prev;
            return {
              ...prev,
              tournamentState: {
                ...prev.tournamentState,
                oracleScores: p.oracleScores,
              },
            };
          });
        }
        if (p.revivalNotice !== undefined) {
          if (p.revivalNotice.revivedTeamId === effectiveTeamId) {
            setErrorMessage(`🎉 ĐỘI BẠN ĐÃ ĐƯỢC HỒI SINH THÀNH CÔNG VỚI ${p.revivalNotice.revivedScore} ĐIỂM!`);
          } else {
            setErrorMessage(`✨ Đội ${p.revivalNotice.revivedTeamName} đã giành vé HỒI SINH với ${p.revivalNotice.revivedScore} điểm!`);
          }
          setTimeout(() => setErrorMessage(null), 5000);
        }
        if (p.sharedPowerupLocked !== undefined) {
          setSharedPowerupLocked(Boolean(p.sharedPowerupLocked));
          setSharedPowerupLockedTeamName(p.sharedPowerupLockedTeamName);
        }
        if (p.mysteryQuestState !== undefined) {
          if (p.roomState === undefined || p.roomState.mysteryQuestState === undefined) {
            setRoomState((prev) => (prev ? { ...prev, mysteryQuestState: p.mysteryQuestState } : prev));
          }
          if (p.mysteryQuestState.phase !== "QUESTION_ACTIVE") {
            setCurrentQuestion(null);
            setRevealPayload(null);
            setTimer(null);
            setAnswered(false);
          }
        }
        if (p.magicWheelState !== undefined) {
          setRoomState((prev) => (prev ? { ...prev, magicWheelState: p.magicWheelState } : prev));
          setCurrentQuestion(null);
          setRevealPayload(null);
          setTimer(null);
          setAnswered(false);
        }
        if (p.teamAnswers !== undefined) {
          const curTid = myTeamIdRef.current || activeTeamId || selectedTeamId;
          if (curTid) {
            if (p.teamAnswers && p.teamAnswers[curTid]) {
              teamAnswersRef.current.set(curTid, p.teamAnswers[curTid]);
              setSubmittedAnswer(p.teamAnswers[curTid]);
              setAnswered(true);
            } else {
              teamAnswersRef.current.delete(curTid);
              setSubmittedAnswer(null);
              setAnswered(false);
            }
          }
        }
      }
    };
    window.addEventListener("message", handlePostMessage);

    if (code.startsWith("OFFLINE")) {
      setConnected(true);
      return () => {
        if (retryJoinTimerRef.current) {
          clearTimeout(retryJoinTimerRef.current);
          retryJoinTimerRef.current = null;
        }
        window.removeEventListener("message", handlePostMessage);
      };
    }

    const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io({
      transports: ["websocket", "polling"],
      query: isSandboxRef.current ? { sandbox: "1" } : {},
      reconnection: true,
      reconnectionAttempts: 15,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
    });
    socketRef.current = socket;

    const joinRoom = () => {
      if (retryJoinTimerRef.current) {
        clearTimeout(retryJoinTimerRef.current);
        retryJoinTimerRef.current = null;
      }
      const currentPid = playerIdRef.current || savedPlayerId;
      const currentName = paramName || sessionStorage.getItem("playerName") || localStorage.getItem("playerName") || playerName;
      const savedPasscode = searchParams?.get("passcode") || (typeof window !== "undefined" ? sessionStorage.getItem(`room_passcode_${code}`) : null) || undefined;

      socket.emit("room:join", {
        code,
        playerName: currentName,
        playerId: currentPid,
        teamId: myTeamIdRef.current || (paramTeamId ? paramTeamId : undefined),
        passcode: savedPasscode,
      }, (result) => {
        if (result.success) {
          setErrorMessage(null);
          setIsReconnecting(false);
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
          const initialTeamId = isSandboxRef.current
            ? (myTeamIdRef.current || p?.teamId || result.roomState?.teams?.[0]?.id)
            : (p?.teamId || myTeamIdRef.current);
          if (initialTeamId) {
            myTeamIdRef.current = initialTeamId;
            setSelectedTeamId(initialTeamId);
          }
        } else {
          const err = result.error ?? "Không thể vào phòng thi";
          setErrorMessage(err);

          // Security & Stability: Nếu phòng vĩnh viễn không tồn tại, đã kết thúc, đã khóa hoặc sai mật khẩu, dừng retry để tránh DDoS server
          const isFatalRoomError =
            err.includes("không tồn tại") ||
            err.includes("Không tìm thấy phòng") ||
            err.includes("đã kết thúc") ||
            err.includes("đạt giới hạn") ||
            err.includes("Mật khẩu") ||
            err.includes("mật khẩu") ||
            err.includes("khóa");

          if (isFatalRoomError) {
            setIsReconnecting(false);
            if (retryJoinTimerRef.current) {
              clearTimeout(retryJoinTimerRef.current);
              retryJoinTimerRef.current = null;
            }
            return;
          }

          setIsReconnecting(true);
          // Tự động thử lại sau 2.5s chỉ đối với lỗi mạng tạm thời
          retryJoinTimerRef.current = setTimeout(() => {
            if (socketRef.current?.connected) {
              joinRoom();
            }
          }, 2500);
        }
      });
    };
    joinRoomRef.current = joinRoom;

    socket.on("connect", () => {
      setConnected(true);
      setIsReconnecting(false);
      setErrorMessage(null);
      syncClockWithServer(socket);
      joinRoom();
      const curTeam = myTeamIdRef.current || paramTeamId;
      if (curTeam) {
        socket.emit("player:select:team", { teamId: curTeam, playerId: playerIdRef.current || savedPlayerId });
      }
    });

    socket.on("disconnect", (reason) => {
      setConnected(false);
      // Chống Ping-Pong Reconnect War: Nếu server chủ động đá (trùng tab hoặc vi phạm), không tự reconnect
      if (reason === "io server disconnect") {
        setIsReconnecting(false);
        setErrorMessage("Bạn đã đăng nhập ở một tab hoặc thiết bị khác, hoặc phiên đã đóng.");
        return;
      }
      setIsReconnecting(true);
      if (reason === "transport close") {
        setTimeout(() => {
          if (!socket.connected) socket.connect();
        }, 1000);
      }
    });

    socket.on("connect_error", () => {
      setConnected(false);
      setIsReconnecting(true);
    });

    socket.io.on("reconnect_attempt", () => {
      setIsReconnecting(true);
    });

    socket.io.on("reconnect", () => {
      setConnected(true);
      setIsReconnecting(false);
      setErrorMessage(null);
      syncClockWithServer(socket);
      joinRoom();
      const curTeam = myTeamIdRef.current || paramTeamId;
      if (curTeam) {
        socket.emit("player:select:team", { teamId: curTeam, playerId: playerIdRef.current || savedPlayerId });
      }
    });

    socket.on("room:state", (state) => {
      const currentPid = playerIdRef.current || savedPlayerId;
      const curTeam = myTeamIdRef.current || paramTeamId || (isSandboxRef.current ? state?.teams?.[0]?.id : "");
      const rawPlayer = state?.players?.find((pl) => pl.id === currentPid);
      const effectiveTid = isSandboxRef.current
        ? (myTeamIdRef.current || rawPlayer?.teamId || curTeam)
        : (rawPlayer?.teamId || curTeam);
      let patchedState = state;
      if (effectiveTid && state?.players) {
        if (rawPlayer && rawPlayer.teamId !== effectiveTid) {
          patchedState = {
            ...state,
            players: state.players.map((pl) => pl.id === currentPid ? { ...pl, teamId: effectiveTid } : pl),
          };
        }
      }
      setRoomState(patchedState);
      if (
        patchedState?.mode === "MYSTERY_QUEST" &&
        patchedState?.mysteryQuestState &&
        patchedState.mysteryQuestState.phase !== "QUESTION_ACTIVE"
      ) {
        setCurrentQuestion(null);
        setRevealPayload(null);
        setTimer(null);
        setAnswered(false);
      }
      const p = patchedState.players.find((pl) => pl.id === currentPid);
      if (effectiveTid) {
        myTeamIdRef.current = effectiveTid;
        setSelectedTeamId(effectiveTid);
      }
      if (p?.name) {
        sessionStorage.setItem("playerName", p.name);
        localStorage.setItem("playerName", p.name);
      }
    });

    socket.on("game:starting", (p) => {
      const incomingEndsAt = p.endsAt || (getServerTime() + p.seconds * 1000);
      const total = p.total || p.seconds || 5;
      setMatchStarting((prev) => {
        const stableEndsAt = prev?.endsAt || incomingEndsAt;
        const safeSeconds = prev && prev.endsAt === stableEndsAt ? Math.min(prev.seconds, p.seconds) : p.seconds;
        return { seconds: safeSeconds, endsAt: stableEndsAt, total };
      });
      setQuestionPrepare(null);
      setIntermission(null);
      setCurrentQuestion(null);
      setRevealPayload(null);
      soundManager.stopMusic(0, true);
    });

    socket.on("game:prepare", (p) => {
      setMatchStarting(null);
      const incomingEndsAt = p.endsAt || (getServerTime() + p.seconds * 1000);
      const total = p.total || p.seconds || 3;
      setQuestionPrepare((prev) => {
        const stableEndsAt = prev?.endsAt || incomingEndsAt;
        const safeSeconds = prev && prev.endsAt === stableEndsAt ? Math.min(prev.seconds, p.seconds) : p.seconds;
        return { ...p, seconds: safeSeconds, endsAt: stableEndsAt, total };
      });
      setIntermission(null);
      setCurrentQuestion(null);
      setRevealPayload(null);
      soundManager.stopMusic(0, true);
    });

    socket.on("game:prepare:clear", () => {
      setMatchStarting(null);
      setQuestionPrepare(null);
    });

    socket.on("game:intermission", (p) => {
      setIntermission(p);
      setMatchStarting(null);
      setQuestionPrepare(null);
      setCurrentQuestion(null);
      setRevealPayload(null);
      setTimer(null);
    });

    socket.on("game:question", (q) => {
      const currentMystery = roomStateRef.current?.mysteryQuestState;
      if (
        roomStateRef.current?.mode === "MYSTERY_QUEST" &&
        currentMystery &&
        currentMystery.phase !== "QUESTION_ACTIVE"
      ) {
        console.warn("[play] Ignoring incoming game:question during MysteryQuest minigame phase:", currentMystery.phase);
        return;
      }

      const incomingQId = q?.question?.id ?? null;
      const isNewQuestion = incomingQId !== lastQuestionIdRef.current;
      lastQuestionIdRef.current = incomingQId;
      setMatchStarting(null);
      setQuestionPrepare(null);
      setIntermission(null);
      setCurrentQuestion(q);
      // Only reset answered/selection state when it's a genuinely new question.
      // If server re-broadcasts the same question (e.g. state update after someone answers),
      // keep the current player's selection intact to avoid cross-device contamination.
      if (isNewQuestion) {
        teamAnswersRef.current.clear();
        setRevealPayload(null);
        setAnswered(false);
        setSubmittedAnswer(null);
        setBuzzedBy(null);
        setHiddenOptionIds([]);
        setIsStealPhase(Boolean(q.isStealPhase));
        setUsedCardTypes([]);
        setSharedPowerupLocked(Boolean(q.hasSharedPowerupUsed));
        setSharedPowerupLockedTeamName(undefined);
      }
      if (q.stealBuzzedTeamId) {
        setStealBuzzedTeam((prev) =>
          prev && prev.teamId === q.stealBuzzedTeamId
            ? prev
            : {
                teamId: q.stealBuzzedTeamId!,
                teamName: q.stealBuzzedTeamName || "",
                playerId: "",
                playerName: "",
              }
        );
      } else {
        setStealBuzzedTeam(null);
      }
      if (q.timerStarted && !q.timerPending && q.endsAt && q.endsAt > getServerTime() - 1000) {
        const auth = calculateAuthoritativeTimer(q.endsAt, q.timeLimit, q.timeLimit);
        setTimer({ remaining: auth.remaining, total: q.timeLimit, endsAt: q.endsAt });
      } else if (isNewQuestion || q.timerPending || !q.timerStarted) {
        setTimer(null);
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
    });

    socket.on("game:timer", (t) => {
      calibrateClockFromPacket(t.serverTime);
      if (typeof t.remaining === "number" && t.remaining > 0) {
        setCurrentQuestion((prev) =>
          prev && (prev.timerPending || !prev.timerStarted)
            ? {
                ...prev,
                timerPending: false,
                timerStarted: true,
                endsAt: t.endsAt || prev.endsAt,
              }
            : prev
        );
      }
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
      if (soundEnabledRef.current) {
        soundManager.playTimeout();
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
      setCurrentQuestion((prev) =>
        prev
          ? {
              ...prev,
              buzzedTeamId: payload.teamId,
              buzzedTeamName: payload.teamName,
              buzzAnsweringActive: true,
              buzzUnlocked: false,
              buzzWindowActive: false,
              buzzAttemptNumber: payload?.attemptNumber ?? prev.buzzAttemptNumber,
              buzzMaxAttempts: payload?.maxAttempts ?? prev.buzzMaxAttempts,
              buzzMultiplier: payload?.multiplier ?? prev.buzzMultiplier,
              timeLimit: payload.timeLimit,
            }
          : prev
      );
      const endsAt = getServerTime() + payload.timeLimit * 1000;
      setTimer({ remaining: payload.timeLimit, total: payload.timeLimit, endsAt });
      soundManager.stopMusic(); // Theo luật mới: Phần trả lời không phát âm thêm
    });

    socket.on("game:buzz:wrong_attempt", (payload) => {
      setBuzzedBy(null);
      setCurrentQuestion((prev) =>
        prev
          ? {
              ...prev,
              buzzDisqualifiedTeamIds: payload?.disqualifiedTeamIds ?? prev.buzzDisqualifiedTeamIds,
              buzzMaxAttempts: payload?.maxAttempts ?? prev.buzzMaxAttempts,
              buzzedTeamId: undefined,
              buzzedTeamName: undefined,
              buzzedBy: undefined,
              buzzAnsweringActive: false,
            }
          : prev
      );
      if (soundEnabledRef.current) soundManager.playWrong();
    });

    socket.on("game:bounceback:open_steal", (payload) => {
      setIsStealPhase(true);
      setStealBuzzedTeam(null);
      const endsAt = getServerTime() + payload.timeLimit * 1000;
      setTimer({ remaining: payload.timeLimit, total: payload.timeLimit, endsAt });
    });

    socket.on("game:bounceback:steal_buzzed", (payload) => {
      setIsStealPhase(false);
      setStealBuzzedTeam(payload);
      if (payload.prepSeconds && payload.prepSeconds > 0) {
        setStealPrepCountdown({ teamName: payload.teamName, seconds: payload.prepSeconds });
      }
      if (soundEnabledRef.current) {
        soundManager.playBuzz();
      }
    });

    socket.on("game:bounceback:steal_answering", (payload) => {
      setStealPrepCountdown(null);
      const endsAt = getServerTime() + payload.timeLimit * 1000;
      setTimer({ remaining: payload.timeLimit, total: payload.timeLimit, endsAt });
      if (soundEnabledRef.current) {
        if (payload.timeLimit <= 5) {
          soundManager.playOlympia5s();
        } else {
          soundManager.playQuestionMusic(payload.timeLimit);
        }
      }
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


    socket.on("game:answer:reveal", (payload) => {
      setRevealPayload(payload);
      setIsStealPhase(false);
      if (payload && soundEnabledRef.current) {
        const payloadKey = payload.questionId || (payload.correctAnswer ? JSON.stringify(payload.correctAnswer) : "revealed");
        if (lastRevealKeyRef.current !== payloadKey) {
          lastRevealKeyRef.current = payloadKey;
          soundManager.stopQuestionMusic(600, true);
          const myAns = payload.answers.find(
            (a) => a.playerId === playerIdRef.current || (myTeamIdRef.current && a.teamId === myTeamIdRef.current)
          );
          if (myAns?.isCorrect) {
            soundManager.playCorrect();
          } else {
            soundManager.playWrong();
          }
        }
      }
    });

    socket.on("game:question:clear", () => {
      lastRevealKeyRef.current = null;
      setCurrentQuestion(null);
      setRevealPayload(null);
      setAnswered(false);
      setSubmittedAnswer(null);
      setBuzzedBy(null);
      setTimer(null);
      setHiddenOptionIds([]);
      setIsStealPhase(false);
      setStealBuzzedTeam(null);
      setStealPrepCountdown(null);
      setUsedCardTypes([]);
    });

    socket.on("game:answer:ack", (payload) => {
      setAnswered(true);
    });

    socket.on("game:answer:applied", (payload) => {
      const currentTid = myTeamIdRef.current || selectedTeamId || activeTeamId;
      const currentPid = playerIdRef.current;
      if (
        (payload.teamId && payload.teamId === currentTid) ||
        (payload.playerId && payload.playerId === currentPid)
      ) {
        if (currentQuestionRef.current && payload.questionId === currentQuestionRef.current.question.id) {
          if (payload.teamId) teamAnswersRef.current.set(payload.teamId, payload.answer);
          setSubmittedAnswer(payload.answer);
          setAnswered(true);
        }
      }
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
      // Track which card types MY team has used this question
      const currentPid = playerIdRef.current;
      const currentTeamId = myTeamIdRef.current;
      if (
        payload.usedByTeamId &&
        currentTeamId &&
        payload.usedByTeamId === currentTeamId
      ) {
        setUsedCardTypes((prev) =>
          prev.includes(payload.type) ? prev : [...prev, payload.type]
        );
      }
      if (soundEnabledRef.current) {
        soundManager.playPowerup();
      }
      setTimeout(() => setLastPowerup(null), 4000);
    });

    socket.on("game:powerup:shared_locked", (payload) => {
      setSharedPowerupLocked(true);
      setSharedPowerupLockedTeamName(payload.usedByTeamName);
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
    socket.on("game:magic_wheel:update", (magicWheelState) => {
      setQuestionPrepare(null);
      setRoomState((prev) => (prev ? { ...prev, magicWheelState } : prev));
    });
    socket.on("game:magic_wheel:spin_started", () => {
      if (soundEnabledRef.current) soundManager.playWheelSpin();
    });
    socket.on("game:magic_wheel:letter_guessed", () => {
      // Dedicated VTV3 highlight.mp3 + letter_open.mp3 / wrong.mp3 are handled inside MagicWheelBoard
    });
    socket.on("game:magic_wheel:puzzle_solved", () => {
      // Dedicated VTV3 solve_win.mp3 / wrong.mp3 are handled inside MagicWheelBoard
    });
    socket.on("game:mystery:update", (mysteryQuestState) => {
      setRoomState((prev) => (prev ? { ...prev, mysteryQuestState } : prev));
      if (mysteryQuestState.phase !== "QUESTION_ACTIVE") {
        setCurrentQuestion(null);
        setRevealPayload(null);
        setTimer(null);
        setAnswered(false);
      }
    });
    socket.on("game:mystery:card_flipped", (payload) => {
      if (payload.audioTrigger === "CORRECT") {
        if (soundEnabledRef.current) soundManager.playCorrect();
      } else if (payload.audioTrigger === "WRONG") {
        if (soundEnabledRef.current) soundManager.playWrong();
      }
    });
    socket.on("game:mystery:cashed_out", () => {
      if (soundEnabledRef.current) soundManager.playCorrect();
    });
    socket.on("game:mystery:steal_open", () => {
      if (soundEnabledRef.current) soundManager.playBuzz();
    });
    socket.on("game:mystery:steal_buzzed", () => {
      if (soundEnabledRef.current) soundManager.playBuzz();
    });
    socket.on("tournament:oracle:update", ({ oracleScores }) => {
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
      if (soundEnabledRef.current) soundManager.playCorrect();
      const isMyTeamRevived = payload.revivedTeamId === effectiveTeamId || Boolean(payload.revivedTeams?.some((t) => t.id === effectiveTeamId));
      const stageStr = payload.eliminatedAtStage ? ` (kiên cường từ Chặng ${payload.eliminatedAtStage})` : "";
      if (isMyTeamRevived) {
        setErrorMessage(`🎉 ĐỘI BẠN ĐÃ ĐƯỢC HỒI SINH THÀNH CÔNG VỚI ${payload.revivedScore} ĐIỂM!`);
      } else {
        setErrorMessage(`✨ Đội ${payload.revivedTeamName}${stageStr} đã giành vé HỒI SINH với ${payload.revivedScore} điểm!`);
      }
      setTimeout(() => setErrorMessage(null), 5000);
    });
    socket.on("game:grid:caro:celebrate", () => {
      if (soundEnabledRef.current) soundManager.playCorrect();
    });
    socket.on("game:dice:rolled", () => {
      if (soundEnabledRef.current) soundManager.playBuzz();
    });
    socket.on("game:buzz:unlocked", (payload) => {
      setCurrentQuestion((prev) => (prev ? {
        ...prev,
        buzzUnlocked: true,
        buzzWindowActive: true,
        buzzAttemptNumber: payload?.attemptNumber ?? prev.buzzAttemptNumber,
        buzzMaxAttempts: payload?.maxAttempts ?? prev.buzzMaxAttempts,
        buzzMultiplier: payload?.multiplier ?? prev.buzzMultiplier,
      } : prev));
      if (payload?.endsAt) {
        setTimer({ remaining: payload.remainingSeconds || 5, total: 5, endsAt: payload.endsAt });
      }
      if (soundEnabledRef.current) soundManager.playOlympia5s();
    });
    socket.on("game:buzz:locked", () => {
      setCurrentQuestion((prev) => (prev ? { ...prev, buzzUnlocked: false } : prev));
    });
    socket.on("game:buzz:closed", () => {
      setIsStealPhase(false);
      setCurrentQuestion((prev) => (prev ? { ...prev, buzzUnlocked: false, buzzWindowActive: false } : prev));
    });

    socket.on("error", (msg) => {
      setErrorMessage(msg);
      setTimeout(() => setErrorMessage(null), 4000);
    });

    socket.on("game:tie_breaker:state", (tbState) => {
      setTieBreaker(tbState);
    });
    socket.on("game:ended", (payload) => {
      setTieBreaker(null);
      setGameEnd(payload);
    });
    socket.on("game:early_completed", () => {
      setTimer((prev) => (prev ? { ...prev, remaining: 0, endsAt: undefined } : { remaining: 0, total: 30 }));
      if (soundEnabledRef.current) {
        soundManager.stopQuestionMusic(600, true);
      }
    });
    socket.on("game:paused", () => setRoomState((s) => s ? { ...s, status: "PAUSED" } : s));
    socket.on("game:resumed", () => setRoomState((s) => s ? { ...s, status: "PLAYING" } : s));

    // Smart Session Recovery for Mobile Phones (Sleep, Screen Lock, Background Tab, App Switching)
    const handleVisibilityOrFocus = () => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        if (!socket.connected) {
          setIsReconnecting(true);
          socket.connect();
        } else {
          syncClockWithServer(socket);
          joinRoom();
        }
        // Immediately recalibrate authoritative countdown on wake
        setTimer((prev) => {
          if (!prev?.endsAt) return prev;
          const auth = calculateAuthoritativeTimer(prev.endsAt, prev.total, prev.remaining);
          return { ...prev, remaining: Math.max(0, auth.remaining) };
        });
      }
    };

    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", handleVisibilityOrFocus);
    }
    if (typeof window !== "undefined") {
      window.addEventListener("focus", handleVisibilityOrFocus);
      window.addEventListener("online", handleVisibilityOrFocus);
    }

    return () => {
      if (retryJoinTimerRef.current) {
        clearTimeout(retryJoinTimerRef.current);
        retryJoinTimerRef.current = null;
      }
      window.removeEventListener("message", handlePostMessage);
      if (typeof document !== "undefined") {
        document.removeEventListener("visibilitychange", handleVisibilityOrFocus);
      }
      if (typeof window !== "undefined") {
        window.removeEventListener("focus", handleVisibilityOrFocus);
        window.removeEventListener("online", handleVisibilityOrFocus);
      }
      socket.disconnect();
    };
  }, [code, router]);

  const handleBuzz = () => {
    if (socketRef.current?.connected) {
      socketRef.current.emit("game:buzz", { clientBuzzedAt: getServerTime() });
    } else {
      window.parent?.postMessage({
        type: "OFFLINE_PLAYER_ACTION",
        action: "buzz",
        teamId: myTeamIdRef.current,
        playerId: playerIdRef.current,
      }, "*");
    }
  };

  const handleTieBreakerBuzz = () => {
    socketRef.current?.emit("tie_breaker:buzz", { clientBuzzedAt: getServerTime() });
  };

  const handleTieBreakerAnswer = (optionId: string) => {
    socketRef.current?.emit("tie_breaker:answer", { optionId });
  };

  const handleTieBreakerLuckyPick = (envelopeId: number) => {
    socketRef.current?.emit("tie_breaker:lucky_pick", { envelopeId });
  };

  const handleAnswer = (answer: string | string[], explicitTeamId?: string) => {
    if (!currentQuestion || revealPayload) return;
    setAnswered(true);
    setSubmittedAnswer(answer);
    const targetTeamId =
      explicitTeamId ||
      activeTeamId ||
      myTeamIdRef.current ||
      selectedTeamId ||
      mePlayer?.teamId ||
      (isSandboxRef.current ? roomState?.teams[0]?.id : undefined);
    if (targetTeamId) teamAnswersRef.current.set(targetTeamId, answer);
    if (socketRef.current?.connected) {
      socketRef.current.emit("game:answer:submit", {
        questionId: currentQuestion.question.id,
        answer,
        teamId: targetTeamId,
        playerId: playerIdRef.current,
        clientAnsweredAt: getServerTime(),
      });
      // In sandbox mode or inside iframe, notify parent MC immediately for 0ms latency update
      if (typeof window !== "undefined" && window.parent && window.parent !== window) {
        window.parent.postMessage({
          type: "SANDBOX_PLAYER_ANSWER_UPDATE",
          teamId: targetTeamId,
          answer,
        }, "*");
      }
    } else {
      window.parent?.postMessage({
        type: "OFFLINE_PLAYER_ACTION",
        action: "answer",
        questionId: currentQuestion.question.id,
        answer,
        teamId: targetTeamId,
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

  handleAnswerRef.current = handleAnswer;
  handleBuzzRef.current = handleBuzz;
  handleSubmitWagerRef.current = handleSubmitWager;

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

  const handleFinalizeAnswer = (answer?: string | string[], explicitTeamId?: string) => {
    const targetTeamId =
      explicitTeamId ||
      activeTeamId ||
      myTeamIdRef.current ||
      selectedTeamId ||
      mePlayer?.teamId ||
      (isSandboxRef.current ? roomState?.teams[0]?.id : undefined);
    if (socketRef.current?.connected && currentQuestion) {
      socketRef.current.emit("game:answer:finalize", {
        questionId: currentQuestion.question.id,
        answer,
        teamId: targetTeamId,
      });
    } else {
      window.parent?.postMessage({
        type: "OFFLINE_PLAYER_ACTION",
        action: "finalize_answer",
        questionId: currentQuestion?.question.id,
        answer,
        teamId: targetTeamId,
        playerId: playerIdRef.current,
      }, "*");
    }
  };

  const handleSelectTeam = (teamId: string) => {
    const currentPid = playerIdRef.current || playerId;
    myTeamIdRef.current = teamId;
    setSelectedTeamId(teamId);
    setActiveTeamId(teamId);
    if (typeof window !== "undefined") {
      sessionStorage.setItem(`timeout_team_id_${code}`, teamId);
    }

    // Optimistically update local roomState immediately
    setRoomState((prev) => {
      if (!prev) return prev;
      const updatedPlayers = prev.players.map((p) =>
        p.id === currentPid ? { ...p, teamId } : p
      );
      return { ...prev, players: updatedPlayers };
    });

    if (socketRef.current?.connected) {
      socketRef.current?.emit("player:select:team", { teamId, playerId: currentPid }, (res) => {
        if (res?.error) {
          setErrorMessage(res.error);
          setTimeout(() => setErrorMessage(null), 5000);
        }
      });
    } else {
      window.parent?.postMessage({
        type: "OFFLINE_PLAYER_ACTION",
        action: "select_team",
        teamId,
        playerId: currentPid,
      }, "*");
    }
  };

  const reconnectBanner = (!connected || isReconnecting) && roomState ? (
    <div className="fixed top-0 left-0 right-0 z-[9999] bg-amber-500/95 text-slate-950 px-4 py-2 flex items-center justify-between text-xs sm:text-sm font-bold shadow-lg backdrop-blur animate-pulse border-b border-amber-600">
      <div className="flex items-center gap-2">
        <span className="text-base animate-bounce">📡</span>
        <span>Mạng chập chờn, đang tự động kết nối lại...</span>
      </div>
      <button
        onClick={() => {
          if (socketRef.current) {
            if (!socketRef.current.connected) socketRef.current.connect();
            joinRoomRef.current();
          }
        }}
        className="bg-black/90 hover:bg-black text-amber-300 px-3 py-1 rounded-lg text-xs font-bold cursor-pointer transition shadow"
      >
        Thử lại ngay
      </button>
    </div>
  ) : null;

  if (errorMessage && !roomState) {
    const isPasscodeError = errorMessage.toLowerCase().includes("mật khẩu");
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="glass rounded-2xl p-6 max-w-sm text-center border border-red-500/30 space-y-4">
          <div className="text-3xl">{isPasscodeError ? "🔐" : "⚠️"}</div>
          <p className="text-sm font-bold text-red-300">{errorMessage}</p>
          {isPasscodeError && (
            <div className="space-y-2 text-left">
              <label className="text-xs font-semibold text-slate-300">Nhập mật khẩu phòng:</label>
              <input
                type="password"
                placeholder="Mật khẩu phòng..."
                className="w-full px-3 py-2 rounded-xl bg-slate-900/90 border border-purple-500/50 text-white text-sm focus:outline-none focus:border-purple-400"
                id="inline-passcode-input"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    const val = (e.target as HTMLInputElement).value.trim();
                    if (val) {
                      sessionStorage.setItem(`room_passcode_${code}`, val);
                      if (socketRef.current) {
                        if (!socketRef.current.connected) socketRef.current.connect();
                        joinRoomRef.current();
                      }
                    }
                  }
                }}
              />
              <button
                type="button"
                onClick={() => {
                  const input = document.getElementById("inline-passcode-input") as HTMLInputElement;
                  const val = input?.value.trim();
                  if (val) {
                    sessionStorage.setItem(`room_passcode_${code}`, val);
                    if (socketRef.current) {
                      if (!socketRef.current.connected) socketRef.current.connect();
                      joinRoomRef.current();
                    }
                  }
                }}
                className="w-full py-2 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold text-xs cursor-pointer shadow-md"
              >
                Xác nhận mật khẩu
              </button>
            </div>
          )}
          <div className="flex gap-2 justify-center pt-2">
            <button
              onClick={() => {
                if (socketRef.current) {
                  if (!socketRef.current.connected) socketRef.current.connect();
                  joinRoomRef.current();
                } else {
                  window.location.reload();
                }
              }}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs cursor-pointer"
            >
              Thử kết nối lại
            </button>
            <button
              onClick={() => router.push("/play")}
              className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs cursor-pointer"
            >
              Về sảnh thi đấu
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!roomState && !code.startsWith("OFFLINE")) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="glass rounded-2xl p-6 max-w-sm text-center border border-purple-500/30 space-y-4">
          <div className="text-4xl animate-spin">⚡</div>
          <p className="text-white font-bold text-base">Đang kết nối vào phòng thi...</p>
          <p className="text-xs text-slate-400">Vui lòng chờ trong giây lát, hệ thống đang đồng bộ dữ liệu.</p>
          <button
            onClick={() => {
              if (socketRef.current) {
                if (!socketRef.current.connected) socketRef.current.connect();
                joinRoomRef.current();
              }
            }}
            className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs cursor-pointer"
          >
            Thử lại
          </button>
        </div>
      </div>
    );
  }

  if (tieBreaker) {
    const mePlayer = roomState?.players.find((p) => p.id === playerId);
    const effectiveTeamId = activeTeamId || selectedTeamId || myTeamIdRef.current || mePlayer?.teamId || roomState?.teams[0]?.id;
    return (
      <>
        {reconnectBanner}
        <TieBreakerOverlay
          role="PLAYER"
          tieBreaker={tieBreaker}
          playerTeamId={effectiveTeamId}
          onBuzz={handleTieBreakerBuzz}
          onAnswer={handleTieBreakerAnswer}
          onLuckyPick={handleTieBreakerLuckyPick}
        />
      </>
    );
  }

  if (gameEnd) {
    return (
      <>
        {reconnectBanner}
        <GameEnd payload={gameEnd} playerId={playerId} />
      </>
    );
  }

  const mePlayer = roomState?.players.find((p) => p.id === playerId);
  const effectiveTeamId = activeTeamId || selectedTeamId || myTeamIdRef.current || mePlayer?.teamId || roomState?.teams[0]?.id;
  const myTeam = roomState?.teams.find((t) => t.id === effectiveTeamId);
  const isSpectator = Boolean(myTeam?.isEliminated) || Boolean(mePlayer?.isSpectator);

  // ── Match Warmup Countdown (5s) ──────────────────────────────────────────
  if (matchStarting) {
    if (roomState?.mode === "DICE_RACE" && roomState?.diceRaceState) {
      return (
        <>
          {reconnectBanner}
          <div className="min-h-screen flex flex-col p-3 sm:p-4 gap-3 max-w-4xl mx-auto w-full">
            <div className="w-full flex items-center justify-between gap-3 p-3 rounded-2xl glass border border-amber-500/40 bg-amber-500/10 shadow animate-slide-up">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="text-2xl animate-bounce shrink-0">🏁</span>
                <div className="min-w-0">
                  <p className="font-black text-amber-300 text-xs sm:text-sm truncate">
                    ĐUA CỜ BẮT ĐẦU!
                  </p>
                  <p className="text-[11px] text-amber-200/90 truncate">
                    Chuẩn bị xuất phát
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
        </>
      );
    }

    return (
      <>
        {reconnectBanner}
        <div className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-6 text-center space-y-4 sm:space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[11px] sm:text-xs font-bold uppercase tracking-widest">
            ⚡ Sẵn sàng
          </div>
          <h1 className="text-2xl sm:text-4xl font-black bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
            Bắt đầu sau
          </h1>
          <div className="flex flex-col items-center justify-center">
            <div className="relative flex items-center justify-center">
              <ContinuousTimerRing
                endsAt={matchStarting.endsAt}
                total={matchStarting.total || 5}
                radius={30}
                strokeWidth={5}
                color="#c084fc"
                remainingText=""
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-white text-3xl sm:text-4xl font-black drop-shadow-2xl font-mono">
                  {matchStarting.seconds}
                </span>
              </div>
            </div>
            <div className="w-48 max-w-xs mt-4">
              <ContinuousTimerBar
                endsAt={matchStarting.endsAt}
                total={matchStarting.total || 5}
                color="#c084fc"
                heightClassName="h-2"
              />
            </div>
          </div>
          <p className="text-muted-foreground text-xs sm:text-sm max-w-xs">
            Sẵn sàng cho câu hỏi đầu tiên!
          </p>
          <button
            onClick={toggleSound}
            className="px-4 py-2 rounded-xl glass border border-white/20 text-xs font-bold flex items-center gap-2 mx-auto hover:bg-white/10 transition"
          >
            {soundEnabled ? "🔊 Âm thanh: BẬT" : "🔇 Âm thanh: TẮT (Bấm để bật)"}
          </button>
        </div>
      </>
    );
  }

  // ── Lobby ──────────────────────────────────────────────────────────────────
  if (!currentQuestion && roomState?.status === "LOBBY") {
    return (
      <>
        {reconnectBanner}
        <PlayerLobby
          roomState={roomState}
          playerId={playerId}
          selectedTeamId={selectedTeamId || myTeamIdRef.current || mePlayer?.teamId || null}
          onSelectTeam={handleSelectTeam}
          errorMessage={errorMessage}
        />
      </>
    );
  }

  // ── Intermission Screen (Leaderboard Standings for Player) ─────────────────
  const isInteractiveBoardPhase = Boolean(
    (roomState?.mode === "WAGER" && roomState?.wagerState) ||
    (roomState?.mode === "GRID_CARO" && roomState?.gridCaroState) ||
    (roomState?.mode === "DICE_RACE" && roomState?.diceRaceState) ||
    (roomState?.mode === "TOURNAMENT" && roomState?.tournamentState) ||
    (roomState?.mode === "MYSTERY_QUEST" && roomState?.mysteryQuestState) ||
    (roomState?.mode === "MAGIC_WHEEL" && roomState?.magicWheelState)
  );

  if (!isInteractiveBoardPhase && (intermission || (!currentQuestion && roomState?.status === "PLAYING"))) {
    const isTeam = roomState?.teamMode === "TEAM";
    const participants = [...(isTeam ? (roomState?.teams ?? []) : (roomState?.players ?? []))]
      .sort((a: any, b: any) => (b.score ?? 0) - (a.score ?? 0));
    const me = isTeam
      ? roomState?.teams.find((t) => t.id === activeTeamId)
      : roomState?.players.find((p) => p.id === playerId);
    const myRank = me ? participants.findIndex((p: any) => p.id === me.id) + 1 : 0;

    return (
      <>
        {reconnectBanner}
        <div className="min-h-screen flex flex-col p-4 max-w-lg mx-auto space-y-4 animate-slide-up justify-between">
          <div className="space-y-4 pt-2">
            {/* Intermission Header */}
            <div className="text-center space-y-1.5">
              <span className="px-3.5 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/30">
                📊 Tổng kết điểm số giữa hiệp
              </span>
              <h2 className="text-2xl font-black text-white">BẢNG XẾP HẠNG</h2>
              {intermission && (
                <p className="text-xs text-cyan-300 font-semibold">
                  Chuẩn bị bước vào Câu hỏi #{intermission.nextQuestionIndex + 1} / {intermission.totalQuestions}
                </p>
              )}
            </div>

            {/* My Team / Player Ranking Highlight Card */}
            {me && (
              <div
                className="p-4 rounded-2xl glass border-2 flex items-center justify-between shadow-xl"
                style={{ borderColor: (me as any).color || "#a855f7" }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-black text-white shadow"
                    style={{ background: (me as any).color || "#a855f7" }}
                  >
                    {myRank === 1 ? "🥇" : myRank === 2 ? "🥈" : myRank === 3 ? "🥉" : `#${myRank}`}
                  </div>
                  <div>
                    <p className="font-bold text-base text-white">{me.name} (Bạn)</p>
                    <p className="text-xs text-muted-foreground">Hạng #{myRank} trong bảng đấu</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="font-mono font-black text-2xl text-cyan-400">{me.score?.toLocaleString() || 0}</span>
                  <span className="text-xs text-muted-foreground block">điểm</span>
                </div>
              </div>
            )}

            {/* Standings List */}
            <div className="glass rounded-2xl p-4 border border-white/10 space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                Thứ hạng các đội
              </h3>
              <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                {participants.map((p: any, idx: number) => {
                  const isMe = me && p.id === me.id;
                  return (
                    <div
                      key={p.id}
                      className={`flex items-center justify-between p-2.5 rounded-xl border text-sm transition-all ${
                        isMe
                          ? "bg-purple-500/20 border-purple-500/50 text-white font-bold"
                          : "bg-white/5 border-white/5 text-slate-300"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="w-6 text-center font-black text-xs shrink-0">
                          {idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : `#${idx + 1}`}
                        </span>
                        <div className="w-3 h-3 rounded-full shrink-0" style={{ background: p.color || "#6366f1" }} />
                        <span className="truncate">{p.name} {isMe ? "(Bạn)" : ""}</span>
                      </div>
                      <span className="font-mono font-bold text-cyan-400 shrink-0">{p.score?.toLocaleString() || 0}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Waiting message & sound toggle */}
          <div className="text-center py-4 space-y-3">
            <p className="text-xs text-muted-foreground animate-pulse">
              ⏳ Quản trò đang tổng kết... Câu hỏi tiếp theo sẽ hiển thị ngay khi bắt đầu!
            </p>
            <button
              onClick={toggleSound}
              className="px-4 py-2 rounded-xl glass border border-white/20 text-xs font-bold flex items-center gap-2 mx-auto hover:bg-white/10 transition"
            >
              {soundEnabled ? "🔊 Âm thanh: BẬT" : "🔇 Âm thanh: TẮT (Bấm để bật)"}
            </button>
          </div>
        </div>
      </>
    );
  }

  const canAdminBailout = Boolean(
    isSandbox ||
    (typeof window !== "undefined" && window.self !== window.top) ||
    roomState?.players.find((p) => p.id === playerId)?.isHost
  );

  return (
    <>
      {reconnectBanner}
      <div className={`flex flex-col mx-auto w-full animate-loaded-reveal ${isSandbox ? "h-full min-h-0 p-1.5 sm:p-2 gap-1.5 sm:gap-2 max-w-full overflow-y-auto" : "h-screen max-h-[100dvh] overflow-hidden p-2 sm:p-3 gap-2 sm:gap-3 max-w-4xl justify-between"}`}>
      {/* Header with score and sound toggle */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        <div className="flex-1 min-w-0">
          <ScoreDisplay
            roomState={roomState}
            playerId={playerId}
            teamId={effectiveTeamId}
            overridePlayerName={activePlayerName}
          />
        </div>
        {!isSandbox && (
          <button
            onClick={() => setShowRulesModal(true)}
            title="Xem thể lệ và luật chơi"
            className="p-2 sm:p-2.5 rounded-xl glass border border-white/20 hover:bg-white/10 transition text-sm sm:text-base shrink-0 text-cyan-300"
          >
            📖
          </button>
        )}
        <button
          onClick={toggleSound}
          title={soundEnabled ? "Tắt âm thanh" : "Bật âm thanh"}
          className={`${isSandbox ? "p-1.5 text-xs" : "p-2 sm:p-2.5 text-sm sm:text-base"} rounded-xl glass border border-white/20 hover:bg-white/10 transition shrink-0`}
        >
          {soundEnabled ? "🔊" : "🔇"}
        </button>
      </div>

      {/* Powerup notification */}
      {lastPowerup && (
        <div className="fixed top-3 left-1/2 -translate-x-1/2 z-50 glass rounded-xl px-4 py-2 sm:px-6 sm:py-2.5 text-center animate-bounce-in flex items-center justify-center gap-2 border border-purple-500/40 shadow-xl w-[92vw] max-w-md">
          <PowerupIcon type={lastPowerup.type} className="w-6 h-6 sm:w-8 sm:h-8 shrink-0 drop-shadow" />
          <span className="font-bold text-xs sm:text-sm truncate">{lastPowerup.usedByName}</span>
          <span className="text-muted-foreground text-xs sm:text-sm"> dùng: </span>
          <span className="font-semibold text-cyan-300 text-xs sm:text-sm truncate">{lastPowerup.effect}</span>
        </div>
      )}

      {/* Error / Alert notification */}
      {errorMessage && (
        <div className="fixed top-3 left-1/2 -translate-x-1/2 z-50 bg-red-600/90 text-white rounded-xl px-4 py-2 sm:px-6 sm:py-2.5 text-center font-bold text-xs sm:text-sm animate-bounce-in shadow-lg w-[92vw] max-w-md">
          ⚠️ {errorMessage}
        </div>
      )}

      {/* Buzz notification */}
      {buzzedBy && (
        <div className="fixed top-14 left-1/2 -translate-x-1/2 z-50 bg-yellow-500 text-black rounded-xl px-4 py-2 sm:px-6 sm:py-2.5 text-center font-bold text-xs sm:text-sm animate-bounce-in shadow-lg w-[90vw] max-w-sm">
          ⚡ {buzzedBy.playerName} đã bấm buzz!
        </div>
      )}

      {/* Main game area */}
      <div className="flex-1 min-h-0 flex flex-col gap-2 overflow-y-auto lg:overflow-hidden justify-between">
        {roomState?.mode === "MYSTERY_QUEST" &&
        roomState?.mysteryQuestState &&
        roomState.mysteryQuestState.phase !== "QUESTION_ACTIVE" ? (
          <div className="w-full animate-fade-in">
            <MysteryQuestBoard
              mysteryState={roomState.mysteryQuestState}
              myTeamId={effectiveTeamId}
              isSandbox={isSandbox}
              teams={roomState.teams}
              onChooseAction={(action) => {
                if (!code.startsWith("OFFLINE") && socketRef.current?.connected) {
                  socketRef.current.emit("game:mystery:choose_action", { action });
                } else if (typeof window !== "undefined" && window.self !== window.top) {
                  window.parent.postMessage({ type: "MYSTERY_CHOOSE_ACTION", actionChoice: action, action, teamId: effectiveTeamId }, "*");
                }
              }}
              onFlipCard={(tileId) => {
                if (!code.startsWith("OFFLINE") && socketRef.current?.connected) {
                  socketRef.current.emit("game:mystery:flip_card", { tileId });
                } else if (typeof window !== "undefined" && window.self !== window.top) {
                  window.parent.postMessage({ type: "MYSTERY_FLIP", action: "mystery_flip", tileId, teamId: effectiveTeamId }, "*");
                }
              }}
              onCashOut={() => {
                if (!code.startsWith("OFFLINE") && socketRef.current?.connected) {
                  socketRef.current.emit("game:mystery:cash_out");
                } else if (typeof window !== "undefined" && window.self !== window.top) {
                  window.parent.postMessage({ type: "MYSTERY_CASH_OUT", action: "mystery_cash_out", teamId: effectiveTeamId }, "*");
                }
              }}
              onAdvanceTurn={() => {
                if (typeof window !== "undefined" && window.self !== window.top) {
                  window.parent.postMessage({ type: "MYSTERY_ADVANCE_TURN", action: "mystery_advance_turn" }, "*");
                }
                if (!code.startsWith("OFFLINE")) {
                  socketRef.current?.emit("admin:mystery:advance_turn");
                }
              }}
              onSelectMiniGame={(miniGameType) => {
                if (typeof window !== "undefined" && window.self !== window.top) {
                  window.parent.postMessage({ type: "MYSTERY_SET_MINIGAME", action: "mystery_set_minigame", miniGameType }, "*");
                }
                if (!code.startsWith("OFFLINE")) {
                  socketRef.current?.emit("admin:mystery:set_minigame_type" as any, { miniGameType });
                }
              }}
              onPairsDecision={(choice) => {
                if (!code.startsWith("OFFLINE") && socketRef.current?.connected) {
                  socketRef.current.emit("game:mystery:pairs_decision", { choice });
                } else if (typeof window !== "undefined" && window.self !== window.top) {
                  window.parent.postMessage({ type: "MYSTERY_PAIRS_DECISION", action: "mystery_pairs_decision", choice, teamId: effectiveTeamId }, "*");
                }
              }}
              onChooseStealTarget={(targetTeamId) => {
                if (!code.startsWith("OFFLINE") && socketRef.current?.connected) {
                  socketRef.current.emit("game:mystery:choose_steal_target", { targetTeamId });
                } else if (typeof window !== "undefined" && window.self !== window.top) {
                  window.parent.postMessage({ type: "MYSTERY_CHOOSE_STEAL_TARGET", action: "mystery_choose_steal_target", targetTeamId, teamId: effectiveTeamId }, "*");
                }
              }}
              onDoorsDecision={(payload) => {
                if (!code.startsWith("OFFLINE") && socketRef.current?.connected) {
                  socketRef.current.emit("game:mystery:doors_decision", payload);
                } else if (typeof window !== "undefined" && window.self !== window.top) {
                  window.parent.postMessage({ type: "MYSTERY_DOORS_DECISION", action: "mystery_doors_decision", ...payload, teamId: effectiveTeamId }, "*");
                }
              }}
              onTarotRedraw={() => {
                if (!code.startsWith("OFFLINE") && socketRef.current?.connected) {
                  socketRef.current.emit("game:mystery:tarot_redraw");
                } else if (typeof window !== "undefined" && window.self !== window.top) {
                  window.parent.postMessage({ type: "MYSTERY_TAROT_REDRAW", action: "mystery_tarot_redraw", teamId: effectiveTeamId }, "*");
                }
              }}
              onTarotConfirmKeep={() => {
                if (!code.startsWith("OFFLINE") && socketRef.current?.connected) {
                  socketRef.current.emit("game:mystery:tarot_keep");
                } else if (typeof window !== "undefined" && window.self !== window.top) {
                  window.parent.postMessage({ type: "MYSTERY_TAROT_KEEP", action: "mystery_tarot_keep", teamId: effectiveTeamId }, "*");
                }
              }}
              onUsePeek={() => {
                if (!code.startsWith("OFFLINE") && socketRef.current?.connected) {
                  socketRef.current.emit("game:mystery:use_peek");
                } else if (typeof window !== "undefined" && window.self !== window.top) {
                  window.parent.postMessage({ type: "MYSTERY_USE_PEEK", action: "mystery_use_peek", teamId: effectiveTeamId }, "*");
                }
              }}
              onTarotProphecyDecision={(choice) => {
                if (!code.startsWith("OFFLINE") && socketRef.current?.connected) {
                  socketRef.current.emit("game:mystery:tarot_prophecy_decision", { choice });
                } else if (typeof window !== "undefined" && window.self !== window.top) {
                  window.parent.postMessage({ type: "MYSTERY_TAROT_PROPHECY_DECISION", action: "mystery_tarot_prophecy_decision", choice, teamId: effectiveTeamId }, "*");
                }
              }}
              onDrawTarot={() => {
                if (!code.startsWith("OFFLINE") && socketRef.current?.connected) {
                  socketRef.current.emit("game:mystery:draw_tarot");
                } else if (typeof window !== "undefined" && window.self !== window.top) {
                  window.parent.postMessage({ type: "MYSTERY_DRAW_TAROT", action: "mystery_draw_tarot", teamId: effectiveTeamId }, "*");
                }
              }}
              onSpinTarotWheel={(powerPercent) => {
                if (typeof window !== "undefined" && window.self !== window.top) {
                  window.parent.postMessage({ type: "MYSTERY_SPIN_TAROT_WHEEL", action: "mystery_spin_tarot_wheel", powerPercent, teamId: effectiveTeamId }, "*");
                } else if (!code.startsWith("OFFLINE") && socketRef.current?.connected) {
                  socketRef.current.emit("game:mystery:spin_tarot_wheel" as any, { powerPercent, code });
                }
              }}
              onTarotReveal={() => {
                if (typeof window !== "undefined" && window.self !== window.top) {
                  window.parent.postMessage({ type: "MYSTERY_TAROT_REVEAL", action: "mystery_tarot_reveal", teamId: effectiveTeamId }, "*");
                } else if (!code.startsWith("OFFLINE") && socketRef.current?.connected) {
                  socketRef.current.emit("game:mystery:ancient_tarot_reveal" as any, { code });
                }
              }}
              onTarotRespin={() => {
                if (typeof window !== "undefined" && window.self !== window.top) {
                  window.parent.postMessage({ type: "MYSTERY_TAROT_RESPIN", action: "mystery_tarot_respin", teamId: effectiveTeamId }, "*");
                } else if (!code.startsWith("OFFLINE") && socketRef.current?.connected) {
                  socketRef.current.emit("game:mystery:ancient_tarot_respin" as any, { code });
                }
              }}
              onTarotGamblePrepare={() => {
                if (typeof window !== "undefined" && window.self !== window.top) {
                  window.parent.postMessage({ type: "MYSTERY_TAROT_GAMBLE_PREPARE", action: "mystery_tarot_gamble_prepare", teamId: effectiveTeamId }, "*");
                } else if (!code.startsWith("OFFLINE") && socketRef.current?.connected) {
                  socketRef.current.emit("game:mystery:ancient_tarot_gamble_prepare" as any, { code });
                }
              }}
              onTarotGambleDecision={(spinAgain, powerPercent) => {
                if (typeof window !== "undefined" && window.self !== window.top) {
                  window.parent.postMessage({ type: "MYSTERY_TAROT_GAMBLE_DECISION", action: "mystery_tarot_gamble_decision", spinAgain, powerPercent, teamId: effectiveTeamId }, "*");
                } else if (!code.startsWith("OFFLINE") && socketRef.current?.connected) {
                  socketRef.current.emit("game:mystery:ancient_tarot_gamble_decision" as any, { spinAgain, powerPercent, code });
                }
              }}
              onSurvivalChoice={(choice) => {
                if (!code.startsWith("OFFLINE") && socketRef.current?.connected) {
                  socketRef.current.emit("game:mystery:survival_choice", { choice });
                } else if (typeof window !== "undefined" && window.self !== window.top) {
                  window.parent.postMessage({ type: "MYSTERY_SURVIVAL_CHOICE", action: "mystery_survival_choice", choice, teamId: effectiveTeamId }, "*");
                }
              }}
            />
          </div>
        ) : currentQuestion && roomState?.mode !== "MAGIC_WHEEL" && (roomState?.mode !== "WAGER" || (roomState?.wagerState?.phase === "QUESTION_PERIOD" && roomState?.wagerState?.questionReady)) ? (
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
                    Boolean(roomState.diceRaceState.canRollDice)
                  }
                  onRollDice={handleRollDice}
                  mode="mini"
                />
              </div>
            )}

            <GameQuestion
              key={`${currentQuestion.question.id}_${effectiveTeamId}_${playerId}`}
              question={
                currentQuestion.primaryTeamId
                  ? currentQuestion
                  : {
                      ...currentQuestion,
                      primaryTeamId:
                        roomState?.mode === "GRID_CARO"
                          ? roomState.gridCaroState?.currentTurnTeamId
                          : roomState?.mode === "DICE_RACE"
                          ? roomState.diceRaceState?.currentTurnTeamId
                          : roomState?.mode === "MYSTERY_QUEST"
                          ? roomState.mysteryQuestState?.currentTurnTeamId
                          : currentQuestion.primaryTeamId,
                      primaryTeamName:
                        currentQuestion.primaryTeamName ||
                        roomState?.teams?.find(
                          (t) =>
                            t.id ===
                            (roomState?.mode === "GRID_CARO"
                              ? roomState.gridCaroState?.currentTurnTeamId
                              : roomState?.mode === "DICE_RACE"
                              ? roomState.diceRaceState?.currentTurnTeamId
                              : roomState?.mode === "MYSTERY_QUEST"
                              ? roomState.mysteryQuestState?.currentTurnTeamId
                              : undefined)
                        )?.name,
                    }
              }
              timer={timer}
              onAnswer={handleAnswer}
              onBuzz={handleBuzz}
              answered={answered || Boolean(effectiveTeamId && teamAnswersRef.current.has(effectiveTeamId))}
              initialAnswer={(effectiveTeamId ? teamAnswersRef.current.get(effectiveTeamId) : submittedAnswer) ?? null}
              revealPayload={revealPayload}
              roomStatus={roomState?.status ?? "PLAYING"}
              hiddenOptionIds={hiddenOptionIds}
              roomMode={roomState?.mode ?? "CLASSIC"}
              myTeamId={effectiveTeamId}
              playerId={playerId}
              answerMethod={roomState?.config?.answerMethod ?? "DEVICE"}
              isStealPhase={isStealPhase}
              stealBuzzedTeam={stealBuzzedTeam}
              buzzedBy={buzzedBy}
              onSelectPoints={handleSelectPoints}
              onFinalizeAnswer={handleFinalizeAnswer}
              isSpectator={isSpectator}
              isGhost={roomState?.mode === "ELIMINATION" && Boolean(myTeam?.isEliminated || myTeam?.isGhost)}
              ghostStats={{
                ghostStreak: myTeam?.ghostStreak,
                ghostRoundAllCorrect: myTeam?.ghostRoundAllCorrect,
                ghostTotalCorrect: myTeam?.ghostTotalCorrect,
                ghostTotalAnswered: myTeam?.ghostTotalAnswered,
                ghostCurrentRoundCorrect: myTeam?.ghostCurrentRoundCorrect,
                eliminationInterval: myTeam?.eliminationInterval || roomState?.config?.eliminationIntervalQuestions || 3,
              }}
              tournamentMatch={roomState?.tournamentState?.matches.find((m) => m.id === (currentQuestion.tournamentMatchId || roomState.tournamentState?.currentMatchId))}
              onPredictWinner={(matchId, predictedWinnerId) => {
                if (typeof window !== "undefined" && window.self !== window.top) {
                  window.parent.postMessage({ type: "TOURNAMENT_PREDICT", matchId, predictedWinnerId, teamId: effectiveTeamId }, "*");
                }
                socketRef.current?.emit("tournament:predict", { matchId, predictedWinnerId });
              }}
              onCheer={(matchId, targetTeamId, emoji) => {
                if (typeof window !== "undefined" && window.self !== window.top) {
                  window.parent.postMessage({ type: "TOURNAMENT_CHEER", matchId, targetTeamId, emoji }, "*");
                }
                socketRef.current?.emit("tournament:cheer", { matchId, targetTeamId, emoji });
              }}
              oracleScore={effectiveTeamId ? roomState?.tournamentState?.oracleScores?.[effectiveTeamId] : undefined}
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
                  onGrantBailout={canAdminBailout ? (teamId) => {
                    if (typeof window !== "undefined" && window.self !== window.top) {
                      window.parent.postMessage({ type: "WAGER_GRANT_BAILOUT", teamId }, "*");
                    }
                    socketRef.current?.emit("admin:wager:grant_bailout" as any, { teamId });
                  } : undefined}
                  onSetBailoutLimit={canAdminBailout ? (limit) => {
                    if (typeof window !== "undefined" && window.self !== window.top) {
                      window.parent.postMessage({ type: "WAGER_SET_BAILOUT_LIMIT", limit }, "*");
                    }
                    socketRef.current?.emit("admin:wager:set_bailout_limit" as any, { limit });
                  } : undefined}
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
                  canRoll={
                    roomState.diceRaceState.currentTurnTeamId === effectiveTeamId &&
                    Boolean(roomState.diceRaceState.canRollDice)
                  }
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
                  onGrantBailout={canAdminBailout ? (teamId) => {
                    if (typeof window !== "undefined" && window.self !== window.top) {
                      window.parent.postMessage({ type: "WAGER_GRANT_BAILOUT", teamId }, "*");
                    }
                    socketRef.current?.emit("admin:wager:grant_bailout" as any, { teamId });
                  } : undefined}
                  onSetBailoutLimit={canAdminBailout ? (limit) => {
                    if (typeof window !== "undefined" && window.self !== window.top) {
                      window.parent.postMessage({ type: "WAGER_SET_BAILOUT_LIMIT", limit }, "*");
                    }
                    socketRef.current?.emit("admin:wager:set_bailout_limit" as any, { limit });
                  } : undefined}
                />
              </div>
            ) : roomState?.mode === "MYSTERY_QUEST" && roomState?.mysteryQuestState && roomState.mysteryQuestState.phase !== "QUESTION_ACTIVE" ? (
              <div className="w-full">
                <MysteryQuestBoard
                  mysteryState={roomState.mysteryQuestState}
                  myTeamId={effectiveTeamId}
                  isSandbox={isSandbox}
                  teams={roomState.teams}
                  onChooseAction={(action) => {
                    if (!code.startsWith("OFFLINE") && socketRef.current?.connected) {
                      socketRef.current.emit("game:mystery:choose_action", { action });
                    } else if (typeof window !== "undefined" && window.self !== window.top) {
                      window.parent.postMessage({ type: "MYSTERY_CHOOSE_ACTION", actionChoice: action, action, teamId: effectiveTeamId }, "*");
                    }
                  }}
                  onFlipCard={(tileId) => {
                    if (!code.startsWith("OFFLINE") && socketRef.current?.connected) {
                      socketRef.current.emit("game:mystery:flip_card", { tileId });
                    } else if (typeof window !== "undefined" && window.self !== window.top) {
                      window.parent.postMessage({ type: "MYSTERY_FLIP", action: "mystery_flip", tileId, teamId: effectiveTeamId }, "*");
                    }
                  }}
                  onCashOut={() => {
                    if (!code.startsWith("OFFLINE") && socketRef.current?.connected) {
                      socketRef.current.emit("game:mystery:cash_out");
                    } else if (typeof window !== "undefined" && window.self !== window.top) {
                      window.parent.postMessage({ type: "MYSTERY_CASH_OUT", action: "mystery_cash_out", teamId: effectiveTeamId }, "*");
                    }
                  }}
                  onAdvanceTurn={() => {
                    if (typeof window !== "undefined" && window.self !== window.top) {
                      window.parent.postMessage({ type: "MYSTERY_ADVANCE_TURN", action: "mystery_advance_turn" }, "*");
                    }
                    if (!code.startsWith("OFFLINE")) {
                      socketRef.current?.emit("admin:mystery:advance_turn");
                    }
                  }}
                  onSelectMiniGame={(miniGameType) => {
                    if (typeof window !== "undefined" && window.self !== window.top) {
                      window.parent.postMessage({ type: "MYSTERY_SET_MINIGAME", action: "mystery_set_minigame", miniGameType }, "*");
                    }
                    if (!code.startsWith("OFFLINE")) {
                      socketRef.current?.emit("admin:mystery:set_minigame_type" as any, { miniGameType });
                    }
                  }}
                  onPairsDecision={(choice) => {
                    if (!code.startsWith("OFFLINE") && socketRef.current?.connected) {
                      socketRef.current.emit("game:mystery:pairs_decision", { choice });
                    } else if (typeof window !== "undefined" && window.self !== window.top) {
                      window.parent.postMessage({ type: "MYSTERY_PAIRS_DECISION", action: "mystery_pairs_decision", choice, teamId: effectiveTeamId }, "*");
                    }
                  }}
                  onChooseStealTarget={(targetTeamId) => {
                    if (!code.startsWith("OFFLINE") && socketRef.current?.connected) {
                      socketRef.current.emit("game:mystery:choose_steal_target", { targetTeamId });
                    } else if (typeof window !== "undefined" && window.self !== window.top) {
                      window.parent.postMessage({ type: "MYSTERY_CHOOSE_STEAL_TARGET", action: "mystery_choose_steal_target", targetTeamId, teamId: effectiveTeamId }, "*");
                    }
                  }}
                  onDoorsDecision={(payload) => {
                    if (!code.startsWith("OFFLINE") && socketRef.current?.connected) {
                      socketRef.current.emit("game:mystery:doors_decision", payload);
                    } else if (typeof window !== "undefined" && window.self !== window.top) {
                      window.parent.postMessage({ type: "MYSTERY_DOORS_DECISION", action: "mystery_doors_decision", ...payload, teamId: effectiveTeamId }, "*");
                    }
                  }}
                  onTarotRedraw={() => {
                    if (!code.startsWith("OFFLINE") && socketRef.current?.connected) {
                      socketRef.current.emit("game:mystery:tarot_redraw");
                    } else if (typeof window !== "undefined" && window.self !== window.top) {
                      window.parent.postMessage({ type: "MYSTERY_TAROT_REDRAW", action: "mystery_tarot_redraw", teamId: effectiveTeamId }, "*");
                    }
                  }}
                  onTarotConfirmKeep={() => {
                    if (!code.startsWith("OFFLINE") && socketRef.current?.connected) {
                      socketRef.current.emit("game:mystery:tarot_keep");
                    } else if (typeof window !== "undefined" && window.self !== window.top) {
                      window.parent.postMessage({ type: "MYSTERY_TAROT_KEEP", action: "mystery_tarot_keep", teamId: effectiveTeamId }, "*");
                    }
                  }}
                  onUsePeek={() => {
                    if (!code.startsWith("OFFLINE") && socketRef.current?.connected) {
                      socketRef.current.emit("game:mystery:use_peek");
                    } else if (typeof window !== "undefined" && window.self !== window.top) {
                      window.parent.postMessage({ type: "MYSTERY_USE_PEEK", action: "mystery_use_peek", teamId: effectiveTeamId }, "*");
                    }
                  }}
                  onTarotProphecyDecision={(choice) => {
                    if (!code.startsWith("OFFLINE") && socketRef.current?.connected) {
                      socketRef.current.emit("game:mystery:tarot_prophecy_decision", { choice });
                    } else if (typeof window !== "undefined" && window.self !== window.top) {
                      window.parent.postMessage({ type: "MYSTERY_TAROT_PROPHECY_DECISION", action: "mystery_tarot_prophecy_decision", choice, teamId: effectiveTeamId }, "*");
                    }
                  }}
                  onDrawTarot={() => {
                    if (!code.startsWith("OFFLINE") && socketRef.current?.connected) {
                      socketRef.current.emit("game:mystery:draw_tarot");
                    } else if (typeof window !== "undefined" && window.self !== window.top) {
                      window.parent.postMessage({ type: "MYSTERY_DRAW_TAROT", action: "mystery_draw_tarot", teamId: effectiveTeamId }, "*");
                    }
                  }}
                  onSpinTarotWheel={(powerPercent) => {
                    if (typeof window !== "undefined" && window.self !== window.top) {
                      window.parent.postMessage({ type: "MYSTERY_SPIN_TAROT_WHEEL", action: "mystery_spin_tarot_wheel", powerPercent, teamId: effectiveTeamId }, "*");
                    } else if (!code.startsWith("OFFLINE") && socketRef.current?.connected) {
                      socketRef.current.emit("game:mystery:spin_tarot_wheel" as any, { powerPercent, code });
                    }
                  }}
                  onTarotReveal={() => {
                    if (typeof window !== "undefined" && window.self !== window.top) {
                      window.parent.postMessage({ type: "MYSTERY_TAROT_REVEAL", action: "mystery_tarot_reveal", teamId: effectiveTeamId }, "*");
                    } else if (!code.startsWith("OFFLINE") && socketRef.current?.connected) {
                      socketRef.current.emit("game:mystery:ancient_tarot_reveal" as any, { code });
                    }
                  }}
                  onTarotRespin={() => {
                    if (typeof window !== "undefined" && window.self !== window.top) {
                      window.parent.postMessage({ type: "MYSTERY_TAROT_RESPIN", action: "mystery_tarot_respin", teamId: effectiveTeamId }, "*");
                    } else if (!code.startsWith("OFFLINE") && socketRef.current?.connected) {
                      socketRef.current.emit("game:mystery:ancient_tarot_respin" as any, { code });
                    }
                  }}
                  onTarotGamblePrepare={() => {
                    if (typeof window !== "undefined" && window.self !== window.top) {
                      window.parent.postMessage({ type: "MYSTERY_TAROT_GAMBLE_PREPARE", action: "mystery_tarot_gamble_prepare", teamId: effectiveTeamId }, "*");
                    } else if (!code.startsWith("OFFLINE") && socketRef.current?.connected) {
                      socketRef.current.emit("game:mystery:ancient_tarot_gamble_prepare" as any, { code });
                    }
                  }}
                  onTarotGambleDecision={(spinAgain, powerPercent) => {
                    if (typeof window !== "undefined" && window.self !== window.top) {
                      window.parent.postMessage({ type: "MYSTERY_TAROT_GAMBLE_DECISION", action: "mystery_tarot_gamble_decision", spinAgain, powerPercent, teamId: effectiveTeamId }, "*");
                    } else if (!code.startsWith("OFFLINE") && socketRef.current?.connected) {
                      socketRef.current.emit("game:mystery:ancient_tarot_gamble_decision" as any, { spinAgain, powerPercent, code });
                    }
                  }}
                  onSurvivalChoice={(choice) => {
                    if (!code.startsWith("OFFLINE") && socketRef.current?.connected) {
                      socketRef.current.emit("game:mystery:survival_choice", { choice });
                    } else if (typeof window !== "undefined" && window.self !== window.top) {
                      window.parent.postMessage({ type: "MYSTERY_SURVIVAL_CHOICE", action: "mystery_survival_choice", choice, teamId: effectiveTeamId }, "*");
                    }
                  }}
                />
              </div>
            ) : roomState?.mode === "MAGIC_WHEEL" && roomState?.magicWheelState ? (
              <div className="w-full max-w-5xl mx-auto">
                <MagicWheelBoard
                  wheelState={roomState.magicWheelState}
                  isDisplay={false}
                  isHost={false}
                  teams={roomState.teams}
                  isMyTurn={
                    (roomState.magicWheelState.tossUpBuzzedTeamId ||
                      roomState.magicWheelState.currentTurnTeamId) === effectiveTeamId || isSandbox
                  }
                  onSpin={(power) => {
                    if (!code.startsWith("OFFLINE") && socketRef.current?.connected) {
                      socketRef.current.emit("magic_wheel:spin", { power, teamId: effectiveTeamId });
                    } else if (typeof window !== "undefined" && window.self !== window.top) {
                      window.parent.postMessage({ type: "MAGIC_WHEEL_SPIN", power, teamId: effectiveTeamId }, "*");
                    }
                  }}
                  onGuessLetter={(letter) => {
                    if (!code.startsWith("OFFLINE") && socketRef.current?.connected) {
                      socketRef.current.emit("magic_wheel:guess_letter", { letter, teamId: effectiveTeamId });
                    } else if (typeof window !== "undefined" && window.self !== window.top) {
                      window.parent.postMessage({ type: "MAGIC_WHEEL_GUESS_LETTER", letter, teamId: effectiveTeamId }, "*");
                    }
                  }}
                  onSolvePuzzle={(answer) => {
                    if (!code.startsWith("OFFLINE") && socketRef.current?.connected) {
                      socketRef.current.emit("magic_wheel:solve_puzzle", { answer, teamId: effectiveTeamId });
                    } else if (typeof window !== "undefined" && window.self !== window.top) {
                      window.parent.postMessage({ type: "MAGIC_WHEEL_SOLVE_PUZZLE", answer, teamId: effectiveTeamId }, "*");
                    }
                  }}
                  onMysteryDecide={(openMystery) => {
                    if (!code.startsWith("OFFLINE") && socketRef.current?.connected) {
                      socketRef.current.emit("magic_wheel:mystery_decide", { openMystery });
                    } else if (typeof window !== "undefined" && window.self !== window.top) {
                      window.parent.postMessage({ type: "MAGIC_WHEEL_MYSTERY_DECIDE", openMystery, teamId: effectiveTeamId }, "*");
                    }
                  }}
                  onLuckyPick={(index) => {
                    if (!code.startsWith("OFFLINE") && socketRef.current?.connected) {
                      socketRef.current.emit("magic_wheel:lucky_pick", { index });
                    } else if (typeof window !== "undefined" && window.self !== window.top) {
                      window.parent.postMessage({ type: "MAGIC_WHEEL_LUCKY_PICK", index, teamId: effectiveTeamId }, "*");
                    }
                  }}
                  onSelectRewardCard={(rewardPayload: any) => {
                    const data = typeof rewardPayload === "string" ? { cardType: rewardPayload } : rewardPayload;
                    if (!code.startsWith("OFFLINE") && socketRef.current?.connected) {
                      socketRef.current.emit("magic_wheel:reward_select", data);
                    } else if (typeof window !== "undefined" && window.self !== window.top) {
                      window.parent.postMessage({ type: "MAGIC_WHEEL_REWARD_SELECT", ...data, teamId: effectiveTeamId }, "*");
                    }
                  }}
                  onTradeDecide={(trade, boxIndex) => {
                    if (!code.startsWith("OFFLINE") && socketRef.current?.connected) {
                      socketRef.current.emit("magic_wheel:trade_decide", { trade, boxIndex });
                    } else if (typeof window !== "undefined" && window.self !== window.top) {
                      window.parent.postMessage({ type: "MAGIC_WHEEL_TRADE_DECIDE", trade, boxIndex, teamId: effectiveTeamId }, "*");
                    }
                  }}
                  onTossUpStart={() => {
                    if (typeof window !== "undefined" && window.self !== window.top) {
                      window.parent.postMessage({ type: "MAGIC_WHEEL_TOSS_UP_START", teamId: effectiveTeamId }, "*");
                    }
                    if (!code.startsWith("OFFLINE") && socketRef.current?.connected) {
                      socketRef.current.emit("magic_wheel:toss_up_start");
                    }
                  }}
                  onTossUpBuzz={(targetTeamId) => {
                    const tId = targetTeamId || effectiveTeamId;
                    if (typeof window !== "undefined" && window.self !== window.top) {
                      window.parent.postMessage({ type: "MAGIC_WHEEL_TOSS_UP_BUZZ", teamId: tId }, "*");
                    }
                    if (!code.startsWith("OFFLINE") && socketRef.current?.connected) {
                      socketRef.current.emit("magic_wheel:toss_up_buzz", { teamId: tId });
                    }
                  }}
                  onExpressDecide={(boardTrain) => {
                    if (!code.startsWith("OFFLINE") && socketRef.current?.connected) {
                      socketRef.current.emit("magic_wheel:express_decide", { rideExpress: boardTrain });
                    } else if (typeof window !== "undefined" && window.self !== window.top) {
                      window.parent.postMessage({ type: "MAGIC_WHEEL_EXPRESS_DECIDE", boardTrain, teamId: effectiveTeamId }, "*");
                    }
                  }}
                  onStealSwapDecide={(mode, targetTeamId) => {
                    const action = mode === "STEAL_50" || mode === "STEAL_HALF" ? "STEAL_50" : "SWAP_LEADER";
                    if (!code.startsWith("OFFLINE") && socketRef.current?.connected) {
                      socketRef.current.emit("magic_wheel:steal_swap_decide", { action, targetTeamId });
                    } else if (typeof window !== "undefined" && window.self !== window.top) {
                      window.parent.postMessage({ type: "MAGIC_WHEEL_STEAL_SWAP_DECIDE", mode, action, targetTeamId, teamId: effectiveTeamId }, "*");
                    }
                  }}
                  onSpecialChooseOrder={(order) => {
                    if (!code.startsWith("OFFLINE") && socketRef.current?.connected) {
                      socketRef.current.emit("magic_wheel:special_choose_order", { order });
                    } else if (typeof window !== "undefined" && window.self !== window.top) {
                      window.parent.postMessage({ type: "MAGIC_WHEEL_SPECIAL_ORDER", order, teamId: effectiveTeamId }, "*");
                    }
                  }}
                  onSpecialPickLetters={(letters) => {
                    if (!code.startsWith("OFFLINE") && socketRef.current?.connected) {
                      socketRef.current.emit("magic_wheel:special_pick_letters", { letters });
                    } else if (typeof window !== "undefined" && window.self !== window.top) {
                      window.parent.postMessage({ type: "MAGIC_WHEEL_SPECIAL_PICK_LETTERS", letters, teamId: effectiveTeamId }, "*");
                    }
                  }}
                  onSetOperationMode={(mode) => {
                    if (!code.startsWith("OFFLINE") && socketRef.current?.connected) {
                      socketRef.current.emit("admin:magic_wheel:set_mode", { mode });
                    } else if (typeof window !== "undefined" && window.self !== window.top) {
                      window.parent.postMessage({ type: "MAGIC_WHEEL_SET_MODE", mode }, "*");
                    }
                  }}
                  onJudgeSolve={(correct) => {
                    if (!code.startsWith("OFFLINE") && socketRef.current?.connected) {
                      socketRef.current.emit("admin:magic_wheel:judge_solve", { isCorrect: correct });
                    } else if (typeof window !== "undefined" && window.self !== window.top) {
                      window.parent.postMessage({ type: "MAGIC_WHEEL_JUDGE_SOLVE", correct }, "*");
                    }
                  }}
                  onPassTurn={() => {
                    if (!code.startsWith("OFFLINE") && socketRef.current?.connected) {
                      socketRef.current.emit("admin:magic_wheel:pass_turn");
                    } else if (typeof window !== "undefined" && window.self !== window.top) {
                      window.parent.postMessage({ type: "MAGIC_WHEEL_PASS_TURN" }, "*");
                    }
                  }}
                  onQuickRevealLetter={() => {
                    if (!code.startsWith("OFFLINE") && socketRef.current?.connected) {
                      socketRef.current.emit("admin:magic_wheel:quick_reveal_letter");
                    } else if (typeof window !== "undefined" && window.self !== window.top) {
                      window.parent.postMessage({ type: "MAGIC_WHEEL_QUICK_REVEAL" }, "*");
                    }
                  }}
                  onRevealAll={() => {
                    if (!code.startsWith("OFFLINE") && socketRef.current?.connected) {
                      socketRef.current.emit("magic_wheel:reveal_all");
                    } else if (typeof window !== "undefined" && window.self !== window.top) {
                      window.parent.postMessage({ type: "MAGIC_WHEEL_REVEAL_ALL" }, "*");
                    }
                  }}
                  onOverrideTurn={(targetTeamId) => {
                    if (!code.startsWith("OFFLINE") && socketRef.current?.connected) {
                      socketRef.current.emit("admin:magic_wheel:override_turn", { teamId: targetTeamId });
                    } else if (typeof window !== "undefined" && window.self !== window.top) {
                      window.parent.postMessage({ type: "MAGIC_WHEEL_OVERRIDE_TURN", teamId: targetTeamId }, "*");
                    }
                  }}
                  onAdvanceRound={() => {
                    if (!code.startsWith("OFFLINE") && socketRef.current?.connected) {
                      socketRef.current.emit("magic_wheel:next_round");
                    } else if (typeof window !== "undefined" && window.self !== window.top) {
                      window.parent.postMessage({ type: "MAGIC_WHEEL_ADVANCE_ROUND" }, "*");
                    }
                  }}
                  onNextRound={() => {
                    if (!code.startsWith("OFFLINE") && socketRef.current?.connected) {
                      socketRef.current.emit("magic_wheel:next_round");
                    } else if (typeof window !== "undefined" && window.self !== window.top) {
                      window.parent.postMessage({ type: "MAGIC_WHEEL_NEXT_ROUND" }, "*");
                    }
                  }}
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
      {roomState && roomState.mode !== "MYSTERY_QUEST" && (roomState.config.powerupEnabled || roomState.sharedCards.length > 0) && (
        <PowerupBar
          roomState={roomState}
          playerId={playerId}
          onUse={handleUsePowerup}
          disabled={
            (roomState?.mode === "BOUNCEBACK" && Boolean(isStealPhase || stealBuzzedTeam)) ||
            (timer?.remaining !== undefined && timer.remaining <= 5 && !revealPayload)
          }
          disabledReason={
            roomState?.mode === "BOUNCEBACK" && Boolean(isStealPhase || stealBuzzedTeam)
              ? "Toàn bộ thẻ hỗ trợ (power-up) bị vô hiệu hoá trong lượt cướp điểm"
              : timer?.remaining !== undefined && timer.remaining <= 5 && !revealPayload
              ? "Khóa dùng thẻ trong 5 giây cuối của câu hỏi để đảm bảo tính công bằng"
              : undefined
          }
          activeCardTypes={usedCardTypes}
          isSharedLocked={sharedPowerupLocked}
          sharedLockedTeamName={sharedPowerupLockedTeamName}
        />
      )}

      {/* Steal Prep Countdown overlay */}
      {stealPrepCountdown && (
        <StealPrepCountdown
          teamName={stealPrepCountdown.teamName}
          initialSeconds={stealPrepCountdown.seconds}
          onComplete={() => setStealPrepCountdown(null)}
        />
      )}

      {/* Rules Modal */}
      <GameModeRulesModal
        mode={roomState?.mode}
        isOpen={showRulesModal}
        onClose={() => setShowRulesModal(false)}
      />
    </div>
    </>
  );
}
