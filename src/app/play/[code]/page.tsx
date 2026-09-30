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
} from "@/types";
import { CARD_METADATA } from "@/types";
import GameQuestion from "@/components/play/GameQuestion";
import PlayerLobby from "@/components/play/PlayerLobby";
import GameEnd from "@/components/play/GameEnd";
import PowerupBar from "@/components/play/PowerupBar";
import ScoreDisplay from "@/components/play/ScoreDisplay";

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
  const myTeamIdRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    const playerName = sessionStorage.getItem("playerName") || "Player";

    const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io({
      transports: ["websocket", "polling"],
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      setConnected(true);
      socket.emit("room:join", { code, playerName }, (result) => {
        if (result.success) {
          setPlayerId(result.playerId ?? "");
          setRoomState(result.roomState ?? null);
          const p = result.roomState?.players.find((pl) => pl.id === result.playerId);
          myTeamIdRef.current = p?.teamId;
        } else {
          alert(result.error ?? "Không thể vào phòng");
          router.push("/play");
        }
      });
    });

    socket.on("room:state", (state) => {
      setRoomState(state);
      const p = state.players.find((pl) => pl.id === playerId);
      if (p?.teamId) myTeamIdRef.current = p.teamId;
    });

    socket.on("game:question", (q) => {
      setCurrentQuestion(q);
      setRevealPayload(null);
      setAnswered(false);
      setBuzzedBy(null);
      setTimer(null);
      setHiddenOptionIds([]);
      setIsStealPhase(false);
      setStealBuzzedTeam(null);
    });

    socket.on("game:timer", (t) => setTimer(t));

    socket.on("game:buzz", (payload) => {
      setBuzzedBy({ playerName: payload.playerName, teamId: payload.teamId, teamName: payload.teamName });
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
      setTimeout(() => setLastPowerup(null), 4000);
    });

    socket.on("game:fifty_fifty:applied", (payload) => {
      if (!myTeamIdRef.current || myTeamIdRef.current === payload.teamId) {
        setHiddenOptionIds(payload.hiddenOptionIds);
      }
    });

    socket.on("error", (msg) => {
      setErrorMessage(msg);
      setTimeout(() => setErrorMessage(null), 4000);
    });

    socket.on("game:ended", (payload) => setGameEnd(payload));
    socket.on("game:paused", () => setRoomState((s) => s ? { ...s, status: "PAUSED" } : s));
    socket.on("game:resumed", () => setRoomState((s) => s ? { ...s, status: "PLAYING" } : s));

    return () => {
      socket.disconnect();
    };
  }, [code, router]);

  const handleBuzz = () => socketRef.current?.emit("game:buzz");

  const handleAnswer = (answer: string | string[]) => {
    if (!currentQuestion || answered) return;
    setAnswered(true);
    socketRef.current?.emit("game:answer:submit", {
      questionId: currentQuestion.question.id,
      answer,
    });
  };

  const handleUsePowerup = (cardId: string, targetTeamId?: string) => {
    socketRef.current?.emit("game:powerup:use", { cardId, targetTeamId });
  };

  const handleSelectTeam = (teamId: string) => {
    socketRef.current?.emit("player:select:team", { teamId }, (res) => {
      if (res?.error) {
        setErrorMessage(res.error);
        setTimeout(() => setErrorMessage(null), 4000);
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
    return <PlayerLobby roomState={roomState} playerId={playerId} onSelectTeam={handleSelectTeam} />;
  }

  const myTeam = roomState?.teams.find((t) =>
    t.cards.some(() => true) && roomState.players.find((p) => p.id === playerId)?.teamId === t.id
  );

  return (
    <div className="min-h-screen flex flex-col p-4 gap-4">
      {/* Header with score */}
      <ScoreDisplay roomState={roomState} playerId={playerId} />

      {/* Powerup notification */}
      {lastPowerup && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 glass rounded-xl px-6 py-3 text-center animate-bounce-in">
          <span className="text-2xl mr-2">{CARD_METADATA[lastPowerup.type].emoji}</span>
          <span className="font-bold">{lastPowerup.usedByName}</span>
          <span className="text-muted-foreground"> dùng thẻ: </span>
          <span>{lastPowerup.effect}</span>
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
            myTeamId={myTeamIdRef.current}
            answerMethod={roomState?.config?.answerMethod ?? "DEVICE"}
            isStealPhase={isStealPhase}
            stealBuzzedTeam={stealBuzzedTeam}
            buzzedBy={buzzedBy}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-muted-foreground">
              <div className="text-4xl mb-4">⏳</div>
              <p>Chờ câu hỏi tiếp theo...</p>
            </div>
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
    </div>
  );
}
