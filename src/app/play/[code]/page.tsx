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
import GameModeRulesModal from "@/components/ui/GameModeRulesModal";
import StealPrepCountdown from "@/components/ui/StealPrepCountdown";
import {
  syncClockWithServer,
  calculateAuthoritativeTimer,
  calibrateClockFromPacket,
  getServerTime,
} from "@/lib/clock-sync";

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
  const [timer, setTimer] = useState<{ remaining: number; total: number; endsAt?: number } | null>(null);
  const [buzzedBy, setBuzzedBy] = useState<{ playerName: string; teamId?: string; teamName?: string } | null>(null);
  const [lastPowerup, setLastPowerup] = useState<PowerupUsedPayload | null>(null);
  const [answered, setAnswered] = useState(false);
  const [hiddenOptionIds, setHiddenOptionIds] = useState<string[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isStealPhase, setIsStealPhase] = useState(false);
  const [stealBuzzedTeam, setStealBuzzedTeam] = useState<{ teamId: string; teamName: string; playerId: string; playerName: string } | null>(null);
  const [matchStarting, setMatchStarting] = useState<{ seconds: number } | null>(null);
  const [questionPrepare, setQuestionPrepare] = useState<GamePreparePayload | null>(null);
  const [intermission, setIntermission] = useState<GameIntermissionPayload | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(false);
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
  const soundEnabledRef = useRef(false);

  const myTeamIdRef = useRef<string | undefined>(undefined);
  const playerIdRef = useRef<string>("");
  const lastQuestionIdRef = useRef<string | null>(null);
  const teamAnswersRef = useRef<Map<string, string | string[]>>(new Map());

  const currentQuestionRef = useRef<QuestionState | null>(null);
  currentQuestionRef.current = currentQuestion;
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

  // Local ticker for match warmup countdown (5s)
  useEffect(() => {
    if (!matchStarting) return;
    const interval = setInterval(() => {
      setMatchStarting((prev) => {
        if (!prev || prev.seconds <= 1) {
          return null;
        }
        const next = prev.seconds - 1;
        if (next >= 0 && soundEnabledRef.current) {
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
        if (next >= 0 && soundEnabledRef.current) {
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

  useEffect(() => {
    // Default sound MUTED on player devices to prevent room echo
    soundManager.setMuted(true);

    const searchParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
    const isSandboxParam = searchParams?.get("sandbox") === "1" || (typeof window !== "undefined" && window.self !== window.top);
    isSandboxRef.current = isSandboxParam;
    if (isSandboxParam) setIsSandbox(true);
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
      if (e.data?.type === "SWITCH_ACTIVE_TEAM") {
        const teamId = e.data.payload?.teamId || e.data.teamId;
        const teamName = e.data.payload?.teamName || e.data.teamName || e.data.playerName || "";
        const teamIndex = e.data.payload?.teamIndex ?? e.data.teamIndex ?? 0;
        const currentAns = e.data.payload?.currentAnswer ?? e.data.currentAnswer;
        if (teamId) {
          myTeamIdRef.current = teamId;
          setActiveTeamId(teamId);
          setSelectedTeamId(teamId);
          if (teamName) setActivePlayerName(teamName);

          if (currentAns !== undefined && currentAns !== null) {
            teamAnswersRef.current.set(teamId, currentAns);
          }
          const hasAnswered = Boolean(teamAnswersRef.current.has(teamId));
          setAnswered(hasAnswered);

          const teamPlayerId = isSandbox
            ? `sb_${code}_t${teamIndex}`
            : playerIdRef.current;
          playerIdRef.current = teamPlayerId;
          setPlayerId(teamPlayerId);

          if (socketRef.current?.connected) {
            if (isSandbox) {
              socketRef.current.emit("room:join", {
                code,
                playerName: teamName || `Đội ${teamIndex + 1}`,
                playerId: teamPlayerId,
                teamId,
              }, () => {});
            } else {
              socketRef.current.emit("player:select:team", { teamId, playerId: teamPlayerId });
            }
          }
          setRoomState((prev) => {
            if (!prev) return prev;
            const pName = teamName || (teamIndex === 0 ? "Bạn (Tester)" : `Đội ${teamIndex + 1} 🤖`);
            const exists = prev.players.some((p) => p.id === teamPlayerId);
            let updatedPlayers: any[];
            if (exists) {
              updatedPlayers = prev.players.map((p) =>
                p.id === teamPlayerId ? { ...p, teamId, name: pName } : p
              );
            } else {
              updatedPlayers = [
                ...prev.players,
                { id: teamPlayerId, name: pName, score: 0, teamId, isHost: teamIndex === 0, isOnline: true },
              ];
            }
            return { ...prev, players: updatedPlayers };
          });
        }
        return;
      }
      if (e.data?.type === "FORCE_TESTER_ACTION") {
        const { action, answer, isCorrect, amount, teamId, teamIndex } = e.data;
        if (teamId) {
          myTeamIdRef.current = teamId;
          setActiveTeamId(teamId);
          setSelectedTeamId(teamId);
          if (isSandbox && typeof teamIndex === "number") {
            const teamPlayerId = `sb_${code}_t${teamIndex}`;
            playerIdRef.current = teamPlayerId;
            setPlayerId(teamPlayerId);
            if (socketRef.current?.connected) {
              socketRef.current.emit("room:join", {
                code,
                playerName: `Đội ${teamIndex + 1}`,
                playerId: teamPlayerId,
                teamId,
              }, () => {});
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
          }
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
        if (p.intermission !== undefined) setIntermission(p.intermission);
        if (p.gameEnd !== undefined) {
          setGameEnd(p.gameEnd);
          if (soundEnabledRef.current) soundManager.playFanfare();
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
      }
    };
    window.addEventListener("message", handlePostMessage);

    if (code.startsWith("OFFLINE")) {
      setConnected(true);
    }

    const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io({
      transports: ["websocket", "polling"],
      query: isSandboxRef.current ? { sandbox: "1" } : {},
      reconnection: true,
      reconnectionAttempts: Infinity,
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

      socket.emit("room:join", {
        code,
        playerName: currentName,
        playerId: currentPid,
        teamId: myTeamIdRef.current || (paramTeamId ? paramTeamId : undefined),
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
          if (p?.teamId) {
            myTeamIdRef.current = p.teamId;
            setSelectedTeamId(p.teamId);
          }
        } else {
          // Lỗi kết nối hoặc join phòng tạm thời
          setErrorMessage(result.error ?? "Không thể vào phòng thi");
          setIsReconnecting(true);

          // TUYỆT ĐỐI KHÔNG REDIRECT VỀ /play KHI MẠNG LAG!
          // Tự động thử lại sau 2.5s
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
      setIsReconnecting(true);
      if (reason === "io server disconnect" || reason === "transport close") {
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
      const curTeam = myTeamIdRef.current || paramTeamId;
      let patchedState = state;
      if (curTeam && state?.players) {
        const p = state.players.find((pl) => pl.id === currentPid);
        if (p && !p.teamId) {
          patchedState = {
            ...state,
            players: state.players.map((pl) => pl.id === currentPid ? { ...pl, teamId: curTeam } : pl),
          };
        }
      }
      setRoomState(patchedState);
      const p = patchedState.players.find((pl) => pl.id === currentPid);
      if (p?.teamId) {
        myTeamIdRef.current = p.teamId;
        setSelectedTeamId(p.teamId);
      }
      if (p?.name) {
        sessionStorage.setItem("playerName", p.name);
        localStorage.setItem("playerName", p.name);
      }
    });

    socket.on("game:starting", (p) => {
      setMatchStarting({ seconds: p.seconds });
      setQuestionPrepare(null);
      setIntermission(null);
      setCurrentQuestion(null);
      setRevealPayload(null);
      if (soundEnabledRef.current) {
        soundManager.playCountdownTick(p.seconds);
      }
    });

    socket.on("game:prepare", (p) => {
      setMatchStarting(null);
      setQuestionPrepare(p);
      setIntermission(null);
      setCurrentQuestion(null);
      setRevealPayload(null);
      if (soundEnabledRef.current) {
        soundManager.playCountdownTick(p.seconds);
      }
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
        setBuzzedBy(null);
        setHiddenOptionIds([]);
        setIsStealPhase(Boolean(q.isStealPhase));
        setUsedCardTypes([]);
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
      if (q.timerStarted && !q.timerPending && q.endsAt && q.endsAt > Date.now()) {
        const auth = calculateAuthoritativeTimer(q.endsAt, q.timeLimit, q.timeLimit);
        setTimer({ remaining: auth.remaining, total: q.timeLimit, endsAt: q.endsAt });
      } else {
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
              buzzAttemptNumber: payload?.attemptNumber ?? prev.buzzAttemptNumber,
              buzzMaxAttempts: payload?.maxAttempts ?? prev.buzzMaxAttempts,
              buzzMultiplier: payload?.multiplier ?? prev.buzzMultiplier,
            }
          : prev
      );
      const endsAt = Date.now() + payload.timeLimit * 1000;
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
      const endsAt = Date.now() + payload.timeLimit * 1000;
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
      const endsAt = Date.now() + payload.timeLimit * 1000;
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
      setStealPrepCountdown(null);
      setUsedCardTypes([]);
    });

    socket.on("game:answer:ack", (payload) => {
      setAnswered(true);
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
      if (soundEnabledRef.current) soundManager.playFanfare();
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
      setCurrentQuestion((prev) => (prev ? { ...prev, buzzUnlocked: false, buzzWindowActive: false } : prev));
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
    socket.on("game:early_completed", () => {
      setTimer((prev) => (prev ? { ...prev, remaining: 0, endsAt: undefined } : { remaining: 0, total: 30 }));
      if (soundEnabledRef.current) {
        soundManager.stopMusic();
      }
    });
    socket.on("game:paused", () => setRoomState((s) => s ? { ...s, status: "PAUSED" } : s));
    socket.on("game:resumed", () => setRoomState((s) => s ? { ...s, status: "PLAYING" } : s));

    return () => {
      if (retryJoinTimerRef.current) {
        clearTimeout(retryJoinTimerRef.current);
        retryJoinTimerRef.current = null;
      }
      window.removeEventListener("message", handlePostMessage);
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

  const handleAnswer = (answer: string | string[], explicitTeamId?: string) => {
    if (!currentQuestion || revealPayload) return;
    setAnswered(true);
    const targetTeamId = explicitTeamId || myTeamIdRef.current || activeTeamId || selectedTeamId || mePlayer?.teamId || roomState?.teams[0]?.id;
    if (targetTeamId) teamAnswersRef.current.set(targetTeamId, answer);
    if (socketRef.current?.connected) {
      socketRef.current.emit("game:answer:submit", {
        questionId: currentQuestion.question.id,
        answer,
        teamId: targetTeamId,
        clientAnsweredAt: getServerTime(),
      });
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
    if (socketRef.current?.connected && currentQuestion) {
      const targetTeamId = explicitTeamId || myTeamIdRef.current || activeTeamId || selectedTeamId || mePlayer?.teamId || roomState?.teams[0]?.id;
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
        teamId: explicitTeamId || myTeamIdRef.current || activeTeamId || selectedTeamId,
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
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="glass rounded-2xl p-6 max-w-sm text-center border border-red-500/30 space-y-3">
          <div className="text-3xl">⚠️</div>
          <p className="text-sm font-bold text-red-300">{errorMessage}</p>
          <button
            onClick={() => {
              if (socketRef.current) {
                if (!socketRef.current.connected) socketRef.current.connect();
                joinRoomRef.current();
              } else {
                window.location.reload();
              }
            }}
            className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs cursor-pointer"
          >
            Thử kết nối lại
          </button>
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

  if (roomState?.status === "LOBBY") {
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
        </>
      );
    }

    return (
      <>
        {reconnectBanner}
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
      </>
    );
  }

  // ── Intermission Screen (Leaderboard Standings for Player) ─────────────────
  const isInteractiveBoardPhase = Boolean(
    (roomState?.mode === "WAGER" && roomState?.wagerState) ||
    (roomState?.mode === "GRID_CARO" && roomState?.gridCaroState) ||
    (roomState?.mode === "DICE_RACE" && roomState?.diceRaceState) ||
    (roomState?.mode === "TOURNAMENT" && roomState?.tournamentState)
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
      <div className={`flex flex-col mx-auto w-full ${isSandbox ? "h-full min-h-0 p-1.5 sm:p-2 gap-1.5 sm:gap-2 max-w-full overflow-y-auto" : "min-h-screen p-2.5 sm:p-4 gap-2.5 sm:gap-4 max-w-4xl"}`}>
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
            className="p-2.5 sm:p-3.5 rounded-xl glass border border-white/20 hover:bg-white/10 transition text-sm sm:text-base shrink-0 text-cyan-300"
          >
            📖
          </button>
        )}
        <button
          onClick={toggleSound}
          title={soundEnabled ? "Tắt âm thanh" : "Bật âm thanh"}
          className={`${isSandbox ? "p-1.5 text-xs" : "p-2.5 sm:p-3.5 text-sm sm:text-base"} rounded-xl glass border border-white/20 hover:bg-white/10 transition shrink-0`}
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
        {currentQuestion && (roomState?.mode !== "WAGER" || (roomState?.wagerState?.phase === "QUESTION_PERIOD" && roomState?.wagerState?.questionReady)) ? (
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
                  mode={revealPayload ? "full" : "mini"}
                />
              </div>
            )}

            <GameQuestion
              key={`${currentQuestion.question.id}_${effectiveTeamId}_${playerId}`}
              question={currentQuestion}
              timer={timer}
              onAnswer={handleAnswer}
              onBuzz={handleBuzz}
              answered={Boolean(effectiveTeamId && teamAnswersRef.current.has(effectiveTeamId))}
              initialAnswer={(effectiveTeamId ? teamAnswersRef.current.get(effectiveTeamId) : null) || null}
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
          disabled={roomState?.mode === "BOUNCEBACK" && Boolean(isStealPhase || stealBuzzedTeam)}
          disabledReason="Toàn bộ thẻ hỗ trợ (power-up) bị vô hiệu hoá trong lượt cướp điểm"
          activeCardTypes={usedCardTypes}
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
