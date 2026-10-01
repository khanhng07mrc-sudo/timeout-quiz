"use client";

import { useState } from "react";
import { DiceRaceState, DiceTile } from "@/types";

interface Props {
  diceState?: DiceRaceState;
  myTeamId?: string;
  isMyTurn?: boolean;
  canRoll?: boolean;
  onRollDice?: () => void;
  isDisplay?: boolean;
}

export default function DiceRaceTrack({
  diceState,
  myTeamId,
  isMyTurn = false,
  canRoll = false,
  onRollDice,
  isDisplay = false,
}: Props) {
  const [animatingDice, setAnimatingDice] = useState(false);

  if (!diceState || diceState.tiles.length === 0) {
    return (
      <div className="glass rounded-2xl p-6 text-center text-muted-foreground">
        <p className="text-3xl mb-2">🎲</p>
        <p>Đường đua cờ xí ngầu đang được khởi tạo...</p>
      </div>
    );
  }

  const {
    totalTiles,
    tiles,
    teamPositions,
    currentTurnTeamName,
    currentTurnTeamId,
    lastDiceRoll,
    isRolling,
    finishLeaderboard,
  } = diceState;

  const teams = Object.values(teamPositions || {});

  const handleRollClick = () => {
    if (!canRoll || animatingDice || isRolling) return;
    setAnimatingDice(true);
    setTimeout(() => {
      setAnimatingDice(false);
      if (onRollDice) onRollDice();
    }, 600);
  };

  const tileTypeIcons: Record<string, { icon: string; color: string }> = {
    NORMAL: { icon: "⚪", color: "border-border/40" },
    BOOST: { icon: "🚀", color: "border-cyan-400 bg-cyan-500/10 text-cyan-300" },
    TRAP: { icon: "💥", color: "border-red-400 bg-red-500/10 text-red-300" },
    GEM: { icon: "💎", color: "border-yellow-400 bg-yellow-500/10 text-yellow-300" },
    SWAP: { icon: "🔀", color: "border-purple-400 bg-purple-500/10 text-purple-300" },
    FINISH: { icon: "🏆", color: "border-amber-400 bg-amber-500/20 text-amber-300" },
  };

  return (
    <div className={`glass rounded-2xl ${isDisplay ? "p-6" : "p-4"} space-y-5`}>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/50 pb-3">
        <div className="flex items-center gap-3">
          <span className="text-3xl">🎲</span>
          <div>
            <h3 className={`font-black ${isDisplay ? "text-2xl" : "text-lg"} text-white flex items-center gap-2`}>
              Đường Đua Cờ Xí Ngầu ({totalTiles} Ô)
            </h3>
            <p className="text-xs text-muted-foreground">
              Đổ xí ngầu 1-6 bước · Trả lời đúng để tiến bước · Ô sự kiện bất ngờ
            </p>
          </div>
        </div>

        {/* Dice & Turn Controller */}
        <div className="flex items-center gap-4">
          {/* Active Turn Team */}
          {currentTurnTeamName && (
            <div className={`px-4 py-1.5 rounded-xl font-bold text-sm flex items-center gap-2 ${
              isMyTurn ? "bg-yellow-500/20 border border-yellow-500 text-yellow-300 animate-pulse" : "bg-white/10 text-white"
            }`}>
              <span>Lượt tung xúc xắc:</span>
              <span className="font-black text-cyan-400">{currentTurnTeamName}</span>
            </div>
          )}

          {/* Dice Box */}
          <div className="flex items-center gap-2">
            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br from-purple-600 to-indigo-700 border-2 border-purple-400/60 shadow-lg flex items-center justify-center text-2xl font-black text-white ${
              animatingDice ? "animate-spin" : ""
            }`}>
              {lastDiceRoll ? lastDiceRoll : "⚄"}
            </div>

            {canRoll && !diceState.dicePendingAnswer && (
              <button
                type="button"
                onClick={handleRollClick}
                disabled={animatingDice || isRolling}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-400 hover:to-amber-500 font-black text-black shadow-lg transition-transform active:scale-95 animate-bounce"
              >
                🎲 Tung xúc xắc ngay!
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Board Game Track (Grid / Ribbon of Tiles) */}
      <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-10 gap-1.5 sm:gap-2.5 max-h-[360px] overflow-y-auto p-1">
        {tiles.map((tile: DiceTile) => {
          const config = tileTypeIcons[tile.type] || tileTypeIcons.NORMAL;
          const teamsHere = teams.filter((t) => t.position === tile.index);
          const isFinish = tile.index === totalTiles - 1;

          return (
            <div
              key={tile.index}
              className={`relative rounded-xl border-2 p-2 flex flex-col items-center justify-between min-h-[75px] transition-all ${
                isFinish
                  ? "border-yellow-400 bg-yellow-500/20 glow-cyan"
                  : config.color
              }`}
            >
              {/* Tile Index */}
              <span className="absolute top-1 left-1.5 text-[9px] font-mono font-bold text-muted-foreground">
                #{tile.index + 1}
              </span>

              {/* Event Icon / Label */}
              <div className="mt-2 text-center">
                <span className="text-xl block">{config.icon}</span>
                <span className="text-[10px] font-bold block truncate max-w-[55px]">
                  {tile.label}
                </span>
              </div>

              {/* Pawns / Mascots on this tile */}
              <div className="flex flex-wrap gap-1 items-center justify-center mt-1 z-10">
                {teamsHere.map((team) => (
                  <div
                    key={team.teamId}
                    title={`${team.teamName} (Ô ${tile.index + 1})`}
                    className="w-5 h-5 rounded-full border-2 border-white shadow-md flex items-center justify-center text-[10px] font-black text-white shrink-0 animate-bounce"
                    style={{ background: team.teamColor }}
                  >
                    {team.teamName.charAt(0).toUpperCase()}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Leaderboard / Teams standing */}
      <div className="flex flex-wrap gap-3 items-center border-t border-border/50 pt-3">
        <span className="text-xs font-bold text-muted-foreground uppercase">Vị trí hiện tại:</span>
        {teams
          .sort((a, b) => b.position - a.position)
          .map((team, idx) => (
            <div
              key={team.teamId}
              className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-card/60 border border-border/60 text-xs"
            >
              <span className="font-bold text-muted-foreground">#{idx + 1}</span>
              <span
                className="w-3 h-3 rounded-full"
                style={{ background: team.teamColor }}
              />
              <span className="font-semibold text-white truncate max-w-[100px]">
                {team.teamName}
              </span>
              <span className="font-mono text-cyan-300 font-bold">
                {team.hasFinished ? "🏆 ĐÃ VỀ ĐÍCH" : `Ô ${team.position + 1}/${totalTiles}`}
              </span>
            </div>
          ))}
      </div>
    </div>
  );
}
