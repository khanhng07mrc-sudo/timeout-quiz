"use client";

import { useState } from "react";
import { DiceRaceState, DiceTile } from "@/types";
import PawnPiece from "./PawnPiece";
import DiceRaceTileIcon from "./DiceRaceTileIcons";

interface Props {
  diceState?: DiceRaceState;
  myTeamId?: string;
  isMyTurn?: boolean;
  canRoll?: boolean;
  onRollDice?: () => void;
  isDisplay?: boolean;
  mode?: "full" | "mini";
  onToggleView?: () => void;
}

export default function DiceRaceTrack({
  diceState,
  myTeamId,
  isMyTurn = false,
  canRoll = false,
  onRollDice,
  isDisplay = false,
  mode = "full",
  onToggleView,
}: Props) {
  const [animatingDice, setAnimatingDice] = useState(false);
  const [forceFullInMini, setForceFullInMini] = useState(false);

  if (!diceState || diceState.tiles.length === 0) {
    return (
      <div className="glass rounded-2xl p-4 text-center text-muted-foreground">
        <p className="text-2xl mb-1">🎲</p>
        <p className="text-xs">Đường đua cờ xí ngầu đang được khởi tạo...</p>
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
  const currentTeam = teams.find((t) => t.teamId === currentTurnTeamId);

  const handleRollClick = () => {
    if (!canRoll || animatingDice || isRolling) return;
    setAnimatingDice(true);
    setTimeout(() => {
      setAnimatingDice(false);
      if (onRollDice) onRollDice();
    }, 600);
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // MINI-TRACK MODE: High-density progress banner when question is active
  // ═══════════════════════════════════════════════════════════════════════════
  if (mode === "mini" && !forceFullInMini) {
    return (
      <div className="w-full glass rounded-xl border border-yellow-500/30 p-2 shadow-lg bg-[#121324]/90 backdrop-blur-md transition-all">
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <div className="flex items-center gap-2">
            <span className="text-base">🎲</span>
            <span className="text-xs font-black text-yellow-300 uppercase tracking-wide">
              Đường Đua Cờ Xí Ngầu
            </span>
            {currentTurnTeamName && (
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                Lượt: <b className="text-cyan-300">{currentTurnTeamName}</b>
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {lastDiceRoll && (
              <span className="text-xs font-mono font-black text-amber-300 px-2 py-0.5 rounded bg-black/40 border border-amber-400/40">
                Xúc xắc: {lastDiceRoll} nút
              </span>
            )}
            <button
              type="button"
              onClick={() => {
                if (onToggleView) onToggleView();
                else setForceFullInMini(true);
              }}
              className="text-[10px] px-2 py-0.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 font-bold transition flex items-center gap-1"
            >
              <span>🗺️</span>
              <span>Xem bàn cờ</span>
            </button>
          </div>
        </div>

        {/* Compact linear track with miniature 3D pawns */}
        <div className="relative w-full h-8 bg-black/50 rounded-lg border border-white/10 px-3 flex items-center">
          {/* Milestone markers */}
          <div className="absolute inset-x-3 h-1.5 bg-gradient-to-r from-emerald-600 via-amber-600 to-yellow-400 rounded-full opacity-60" />

          {/* Start & Finish Labels */}
          <span className="absolute left-1 text-[8px] font-bold text-emerald-400 uppercase">#1</span>
          <span className="absolute right-1 text-[8px] font-bold text-yellow-400 uppercase">🏁 #30</span>

          {/* Position of teams on track */}
          {teams.map((team, idx) => {
            const pct = Math.min(96, Math.max(4, ((team.position || 0) / (totalTiles - 1)) * 92 + 4));
            return (
              <div
                key={team.teamId}
                className="absolute -top-1 transition-all duration-700 ease-out z-10"
                style={{
                  left: `${pct}%`,
                  transform: `translateX(-50%) translateY(${idx % 2 === 0 ? "0px" : "-3px"})`,
                }}
                title={`${team.teamName}: Ô ${team.position + 1}/${totalTiles}`}
              >
                <PawnPiece
                  color={team.teamColor}
                  name={team.teamName}
                  size="sm"
                  hasShield={team.hasShield}
                  isCurrentTurn={team.teamId === currentTurnTeamId}
                />
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // FULL BOARD GAME MODE: Adventure Board Game with Rich Textures & 3D Pawns
  // ═══════════════════════════════════════════════════════════════════════════

  // Map dice roll value to 3D pip dots
  const renderDiceFace = (num: number) => {
    const dotsMap: Record<number, number[]> = {
      1: [4],
      2: [0, 8],
      3: [0, 4, 8],
      4: [0, 2, 6, 8],
      5: [0, 2, 4, 6, 8],
      6: [0, 2, 3, 5, 6, 8],
    };
    const activeDots = dotsMap[num] || dotsMap[5];
    return (
      <div className="grid grid-cols-3 grid-rows-3 w-7 h-7 gap-0.5 p-1 bg-white rounded-lg shadow-inner">
        {Array.from({ length: 9 }).map((_, idx) => (
          <div key={idx} className="flex items-center justify-center">
            {activeDots.includes(idx) && (
              <div className="w-1.5 h-1.5 rounded-full bg-red-600 shadow-sm" />
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div
      className={`relative rounded-3xl overflow-hidden border-2 border-amber-600/40 shadow-2xl transition-all ${
        isDisplay ? "p-5" : "p-3.5"
      }`}
      style={{
        background: "radial-gradient(ellipse at center, #1e1b38 0%, #131326 65%, #090a14 100%)",
      }}
    >
      {/* Adventure Gameboard Decorative Backdrop Elements */}
      <div
        className="absolute inset-0 pointer-events-none opacity-20"
        style={{
          backgroundImage: `radial-gradient(circle at 20% 30%, rgba(245, 158, 11, 0.15) 0%, transparent 40%),
                            radial-gradient(circle at 80% 70%, rgba(6, 182, 212, 0.15) 0%, transparent 40%),
                            linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
                            linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)`,
          backgroundSize: "100% 100%, 100% 100%, 30px 30px, 30px 30px",
        }}
      />

      {/* Ornate Board Header */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 border-b border-amber-500/20 pb-3 mb-3">
        {/* Title & Theme */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-500 to-yellow-600 flex items-center justify-center shadow-lg border border-yellow-300/40 text-xl font-black">
            🎲
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className={`font-black ${isDisplay ? "text-2xl" : "text-base"} text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-amber-200 to-orange-400`}>
                Đường Đua Cờ Xí Ngầu
              </h3>
              <span className="px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[10px] font-black uppercase tracking-wider">
                {totalTiles} Ô
              </span>
            </div>
            <p className="text-[11px] text-slate-300 flex items-center gap-2 mt-0.5">
              <span>Đổ 1-6 bước</span>
              <span>•</span>
              <span className="text-cyan-400">🚀 Tăng tốc</span>
              <span>•</span>
              <span className="text-red-400">💥 Bẫy</span>
              <span>•</span>
              <span className="text-blue-400">🛡️ Khiên</span>
              <span>•</span>
              <span className="text-emerald-400">🎲 x2 Cơ hội</span>
            </p>
          </div>
        </div>

        {/* Dice Controller & Turn Indicator */}
        <div className="flex items-center gap-3">
          {currentTurnTeamName && (
            <div
              className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-2 border transition ${
                isMyTurn
                  ? "bg-yellow-500/20 border-yellow-400 text-yellow-300 animate-pulse shadow-[0_0_12px_rgba(250,204,21,0.4)]"
                  : "bg-black/40 border-white/10 text-white"
              }`}
            >
              <span className="text-slate-400">Lượt:</span>
              <span
                className="font-black"
                style={{ color: currentTeam?.teamColor || "#38bdf8" }}
              >
                {currentTurnTeamName}
              </span>
              {diceState.extraRollGranted && (
                <span className="px-1.5 py-0.2 rounded bg-emerald-500/30 text-emerald-300 border border-emerald-400/50 text-[9px] font-black">
                  x2 Lần gieo!
                </span>
              )}
            </div>
          )}

          {/* 3D Dice Cube */}
          <div className="flex items-center gap-2">
            <div
              className={`p-1.5 rounded-xl bg-gradient-to-br from-amber-600 to-orange-700 border-2 border-yellow-300/60 shadow-xl flex items-center justify-center transition-transform ${
                animatingDice ? "animate-spin scale-110" : ""
              }`}
            >
              {renderDiceFace(lastDiceRoll || 5)}
            </div>

            {canRoll && !diceState.dicePendingAnswer && (
              <button
                type="button"
                onClick={handleRollClick}
                disabled={animatingDice || isRolling}
                className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-yellow-400 via-amber-500 to-orange-500 hover:from-yellow-300 hover:to-orange-400 font-black text-black text-xs shadow-lg transition-all active:scale-95 animate-bounce flex items-center gap-1.5 cursor-pointer"
              >
                <span>🎲</span>
                <span>{diceState.extraRollGranted ? "Gieo lần 2!" : "Tung xúc xắc!"}</span>
              </button>
            )}

            {mode === "mini" && (
              <button
                type="button"
                onClick={() => {
                  if (onToggleView) onToggleView();
                  else setForceFullInMini(false);
                }}
                className="text-xs px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 font-bold transition flex items-center gap-1"
                title="Thu gọn về thanh Mini"
              >
                <span>▲</span>
                <span>Thu gọn</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ═════════════════════════════════════════════════════════════════════
          30-TILE ADVENTURE PATH GRID
          Tiles are presented in an illustrated stepping-stone track
         ═════════════════════════════════════════════════════════════════════ */}
      <div className="relative z-10 grid grid-cols-5 sm:grid-cols-6 md:grid-cols-10 gap-1.5 sm:gap-2 p-1 max-h-[380px] overflow-y-auto rounded-2xl bg-black/30 border border-white/5">
        {tiles.map((tile: DiceTile) => {
          const isFinish = tile.index === totalTiles - 1;
          const isStart = tile.index === 0;
          const teamsHere = teams.filter((t) => t.position === tile.index);

          // Tile-specific color theming
          const tileStyles: Record<string, { border: string; bg: string; text: string; shadow: string }> = {
            NORMAL: {
              border: "border-slate-700/60",
              bg: "bg-gradient-to-b from-[#1c1d32] to-[#121324]",
              text: "text-slate-400",
              shadow: "shadow-md",
            },
            BOOST: {
              border: "border-cyan-400/80",
              bg: "bg-gradient-to-b from-cyan-950/70 to-[#0e2133]",
              text: "text-cyan-300",
              shadow: "shadow-[0_0_12px_rgba(6,182,212,0.25)]",
            },
            TRAP: {
              border: "border-red-500/80",
              bg: "bg-gradient-to-b from-red-950/70 to-[#280d12]",
              text: "text-red-300",
              shadow: "shadow-[0_0_12px_rgba(239,68,68,0.25)]",
            },
            SHIELD: {
              border: "border-blue-400/80",
              bg: "bg-gradient-to-b from-blue-950/70 to-[#101b38]",
              text: "text-blue-300",
              shadow: "shadow-[0_0_12px_rgba(59,130,246,0.25)]",
            },
            SWAP: {
              border: "border-purple-400/80",
              bg: "bg-gradient-to-b from-purple-950/70 to-[#221035]",
              text: "text-purple-300",
              shadow: "shadow-[0_0_12px_rgba(168,85,247,0.25)]",
            },
            EXTRA_ROLL: {
              border: "border-emerald-400/80",
              bg: "bg-gradient-to-b from-emerald-950/70 to-[#0d2a1c]",
              text: "text-emerald-300",
              shadow: "shadow-[0_0_12px_rgba(16,185,129,0.3)]",
            },
            FINISH: {
              border: "border-yellow-400",
              bg: "bg-gradient-to-b from-amber-900/80 via-yellow-950/80 to-[#2d1e05]",
              text: "text-yellow-200",
              shadow: "shadow-[0_0_18px_rgba(234,179,8,0.45)] ring-2 ring-yellow-400/40",
            },
          };

          const style = isFinish ? tileStyles.FINISH : (tileStyles[tile.type] || tileStyles.NORMAL);

          return (
            <div
              key={tile.index}
              className={`relative rounded-2xl border-2 p-1.5 flex flex-col items-center justify-between min-h-[82px] transition-all hover:scale-[1.02] cursor-default ${style.border} ${style.bg} ${style.shadow}`}
            >
              {/* Stepping tile number badge */}
              <div className="w-full flex items-center justify-between text-[10px] font-mono font-black px-0.5">
                <span className={isFinish || isStart ? "text-yellow-300 font-bold" : "text-slate-400"}>
                  #{tile.index + 1}
                </span>
                {isStart && (
                  <span className="text-[8px] px-1 rounded bg-emerald-500/30 text-emerald-300 font-black">
                    START
                  </span>
                )}
                {isFinish && (
                  <span className="text-[8px] px-1 rounded bg-yellow-500/30 text-yellow-300 font-black animate-pulse">
                    ĐÍCH
                  </span>
                )}
              </div>

              {/* Central Tile Icon */}
              <div className="my-0.5 flex flex-col items-center justify-center">
                <DiceRaceTileIcon
                  type={isFinish ? "FINISH" : tile.type}
                  size={isDisplay ? 30 : 24}
                />
                <span className={`text-[9px] font-bold block truncate max-w-[56px] text-center mt-0.5 ${style.text}`}>
                  {isFinish ? "Về Đích" : isStart ? "Xuất phát" : tile.label}
                </span>
              </div>

              {/* 3D Pawns positioned on this tile */}
              <div className="w-full flex flex-wrap items-center justify-center gap-1 min-h-[26px] z-20">
                {teamsHere.map((team, pIdx) => (
                  <div
                    key={team.teamId}
                    style={{
                      transform: teamsHere.length > 1 ? `translateY(${pIdx % 2 === 0 ? "0px" : "-4px"})` : "none",
                    }}
                  >
                    <PawnPiece
                      color={team.teamColor}
                      name={team.teamName}
                      size={teamsHere.length > 2 ? "sm" : "md"}
                      hasShield={team.hasShield}
                      isCurrentTurn={team.teamId === currentTurnTeamId}
                      rank={team.finishRank}
                    />
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* ═════════════════════════════════════════════════════════════════════
          STANDINGS & PAWN TRACKER FOOTER
         ═════════════════════════════════════════════════════════════════════ */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-2.5 mt-2.5 text-xs">
        <div className="flex items-center gap-1.5 text-slate-400 font-bold uppercase text-[11px]">
          <span>🏆</span>
          <span>Bảng xếp hạng vị trí:</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {teams
            .sort((a, b) => {
              if (a.hasFinished && !b.hasFinished) return -1;
              if (!a.hasFinished && b.hasFinished) return 1;
              return b.position - a.position;
            })
            .map((team, idx) => (
              <div
                key={team.teamId}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl border text-xs transition ${
                  team.teamId === currentTurnTeamId
                    ? "bg-purple-900/40 border-purple-400 text-white font-bold ring-1 ring-purple-400/50"
                    : "bg-black/30 border-white/10 text-slate-300"
                }`}
              >
                <span className="font-black text-amber-400">#{idx + 1}</span>
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ background: team.teamColor }}
                />
                <span className="truncate max-w-[85px] font-medium">{team.teamName}</span>
                <span className="font-mono font-black text-cyan-300 ml-1">
                  {team.hasFinished ? "🏁 ĐÍCH" : `Ô ${team.position + 1}`}
                </span>
                {team.hasShield && <span className="text-[10px]" title="Có khiên bảo hộ">🛡️</span>}
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
