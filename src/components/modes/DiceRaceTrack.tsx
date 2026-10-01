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
      <div className="grid grid-cols-3 grid-rows-3 w-6 h-6 sm:w-7 sm:h-7 gap-0.5 p-1 bg-white rounded-lg shadow-inner">
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

  // ═══════════════════════════════════════════════════════════════════════════
  // MINI-TRACK HUD MODE: High-density progress banner when question is active
  // ═══════════════════════════════════════════════════════════════════════════
  if (mode === "mini" && !forceFullInMini) {
    return (
      <div className="w-full glass rounded-xl border border-yellow-500/30 p-2 shadow-lg bg-[#121324]/95 backdrop-blur-md transition-all">
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <div className="flex items-center gap-2">
            <span className="text-base">🎲</span>
            <span className="text-xs font-black text-yellow-300 uppercase tracking-wide">
              Đường Đua Cờ
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-white/10 text-slate-300">
              {totalTiles} Ô
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

            {/* Quick roll button right inside Mini HUD */}
            {canRoll && isMyTurn && !isDisplay && (
              <button
                type="button"
                onClick={handleRollClick}
                disabled={animatingDice || isRolling}
                className="px-2.5 py-1 rounded-lg font-black text-[11px] bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-black shadow border border-yellow-200 animate-pulse transition flex items-center gap-1"
              >
                <span>🎲</span>
                <span>TUNG XÚC XẮC!</span>
              </button>
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
              <span>Bàn cờ</span>
            </button>
          </div>
        </div>

        {/* Compact linear track with miniature 3D pawns */}
        <div className="relative w-full h-8 bg-black/60 rounded-lg border border-white/10 px-3 flex items-center">
          {/* Milestone markers */}
          <div className="absolute inset-x-3 h-1.5 bg-gradient-to-r from-emerald-600 via-amber-600 to-yellow-400 rounded-full opacity-60" />

          {/* Start & Finish Labels */}
          <span className="absolute left-1 text-[8px] font-bold text-emerald-400 uppercase">#1</span>
          <span className="absolute right-1 text-[8px] font-bold text-yellow-400 uppercase">🏁 #{totalTiles}</span>

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
  // FULL SERPENTINE S-CURVE RACETRACK MODE (Scalable for 30 - 50 tiles)
  // ═══════════════════════════════════════════════════════════════════════════

  const tilesPerRow = 10;
  const rowCount = Math.ceil(tiles.length / tilesPerRow);

  // Responsive tile height and icon size depending on row count to avoid scrolling
  const tileHeightClass =
    rowCount <= 3
      ? "min-h-[58px] sm:min-h-[68px] md:min-h-[74px]"
      : rowCount === 4
      ? "min-h-[48px] sm:min-h-[56px] md:min-h-[62px]"
      : "min-h-[42px] sm:min-h-[48px] md:min-h-[52px]";

  const iconSize =
    rowCount <= 3
      ? (isDisplay ? 22 : 18)
      : rowCount === 4
      ? (isDisplay ? 19 : 15)
      : (isDisplay ? 16 : 13);

  // Helper to render an individual 3D stepping tile
  const renderTileCard = (tile: DiceTile) => {
    const isFinish = tile.index === totalTiles - 1;
    const isStart = tile.index === 0;
    const teamsHere = teams.filter((t) => t.position === tile.index);

    // Color theming for each category of tile
    const tileStyles: Record<string, { border: string; bg: string; text: string; shadow: string; glow: string }> = {
      NORMAL: {
        border: "border-slate-600/70 border-b-slate-800",
        bg: "bg-gradient-to-b from-[#24263a] to-[#141524]",
        text: "text-slate-400",
        shadow: "shadow-md",
        glow: "",
      },
      BOOST: {
        border: "border-cyan-400 border-b-cyan-700",
        bg: "bg-gradient-to-b from-cyan-900/80 via-[#0e273c] to-[#091b2c]",
        text: "text-cyan-300",
        shadow: "shadow-[0_0_12px_rgba(6,182,212,0.35)]",
        glow: "ring-1 ring-cyan-400/40",
      },
      TRAP: {
        border: "border-rose-500 border-b-rose-800",
        bg: "bg-gradient-to-b from-rose-950/90 via-[#2d0f15] to-[#1c080c]",
        text: "text-rose-300",
        shadow: "shadow-[0_0_12px_rgba(244,63,94,0.35)]",
        glow: "ring-1 ring-rose-500/40",
      },
      SHIELD: {
        border: "border-blue-400 border-b-blue-700",
        bg: "bg-gradient-to-b from-blue-950/80 via-[#102042] to-[#0a142c]",
        text: "text-blue-300",
        shadow: "shadow-[0_0_12px_rgba(59,130,246,0.35)]",
        glow: "ring-1 ring-blue-400/40",
      },
      SWAP: {
        border: "border-purple-400 border-b-purple-700",
        bg: "bg-gradient-to-b from-purple-950/80 via-[#28133f] to-[#170a26]",
        text: "text-purple-300",
        shadow: "shadow-[0_0_12px_rgba(168,85,247,0.35)]",
        glow: "ring-1 ring-purple-400/40",
      },
      EXTRA_ROLL: {
        border: "border-emerald-400 border-b-emerald-700",
        bg: "bg-gradient-to-b from-emerald-950/80 via-[#0d3020] to-[#071f14]",
        text: "text-emerald-300",
        shadow: "shadow-[0_0_12px_rgba(16,185,129,0.35)]",
        glow: "ring-1 ring-emerald-400/40",
      },
      TELEPORT: {
        border: "border-fuchsia-400 border-b-fuchsia-700",
        bg: "bg-gradient-to-b from-fuchsia-950/90 via-[#260f38] to-[#160624]",
        text: "text-fuchsia-300",
        shadow: "shadow-[0_0_16px_rgba(217,70,239,0.45)]",
        glow: "ring-1 ring-fuchsia-400/50 animate-pulse",
      },
      TELEPORT_EXIT: {
        border: "border-teal-400 border-b-teal-700",
        bg: "bg-gradient-to-b from-teal-950/90 via-[#0d2a2d] to-[#07191b]",
        text: "text-teal-300",
        shadow: "shadow-[0_0_14px_rgba(20,184,166,0.4)]",
        glow: "ring-1 ring-teal-400/40",
      },
      FINISH: {
        border: "border-amber-300 border-b-amber-600",
        bg: "bg-gradient-to-b from-amber-600/90 via-[#442c06] to-[#251703]",
        text: "text-amber-200",
        shadow: "shadow-[0_0_20px_rgba(245,158,11,0.55)]",
        glow: "ring-2 ring-yellow-400 animate-pulse",
      },
    };

    const style = isFinish ? tileStyles.FINISH : (tileStyles[tile.type] || tileStyles.NORMAL);

    // Label computation
    let tileLabel = tile.label;
    if (tile.type === "TELEPORT" && tile.teleportTargetIndex !== undefined) {
      tileLabel = `➔ Ô ${tile.teleportTargetIndex + 1}`;
    } else if (tile.type === "TELEPORT_EXIT") {
      tileLabel = "Cổng Ra";
    }

    return (
      <div
        key={tile.index}
        className={`relative flex-1 min-w-0 rounded-xl sm:rounded-2xl border-2 border-b-[3.5px] p-1 sm:p-1.5 flex flex-col items-center justify-between transition-all hover:scale-[1.03] select-none ${style.border} ${style.bg} ${style.shadow} ${style.glow} ${tileHeightClass}`}
      >
        {/* Tile Number Header Badge */}
        <div className="w-full flex items-center justify-between text-[8px] sm:text-[9px] md:text-[10px] font-mono font-black leading-none px-0.5">
          <span className={isFinish || isStart ? "text-amber-300 font-black" : "text-slate-400 font-bold"}>
            #{tile.index + 1}
          </span>
          {isStart && (
            <span className="text-[7px] sm:text-[8px] px-1 py-0.2 rounded bg-emerald-500/30 text-emerald-300 font-black uppercase">
              XUẤT PHÁT
            </span>
          )}
          {isFinish && (
            <span className="text-[7px] sm:text-[8px] px-1 py-0.2 rounded bg-amber-400/40 text-amber-200 font-black animate-pulse uppercase">
              ĐÍCH
            </span>
          )}
          {tile.portalId && (
            <span className={`text-[7px] px-1 py-0.2 rounded font-black uppercase ${
              tile.type === "TELEPORT" ? "bg-fuchsia-500/30 text-fuchsia-200" : "bg-teal-500/30 text-teal-200"
            }`}>
              {tile.portalId}
            </span>
          )}
        </div>

        {/* Central Illustrated Icon & Label */}
        <div className="my-0.5 flex flex-col items-center justify-center pointer-events-none">
          <DiceRaceTileIcon
            type={isFinish ? "FINISH" : tile.type}
            size={iconSize}
          />
          <span className={`text-[8px] sm:text-[9px] font-bold block truncate max-w-[50px] sm:max-w-[62px] text-center mt-0.5 leading-tight ${style.text}`}>
            {isFinish ? "Về Đích" : isStart ? "Khởi đầu" : tileLabel}
          </span>
        </div>

        {/* Pawns Standing on Tile */}
        <div className="w-full flex flex-wrap items-center justify-center gap-0.5 min-h-[20px] sm:min-h-[24px] z-20">
          {teamsHere.map((team, pIdx) => (
            <div
              key={team.teamId}
              style={{
                transform: teamsHere.length > 1 ? `translateY(${pIdx % 2 === 0 ? "0px" : "-3px"})` : "none",
              }}
            >
              <PawnPiece
                color={team.teamColor}
                name={team.teamName}
                size={teamsHere.length > 2 || rowCount >= 5 ? "sm" : "md"}
                hasShield={team.hasShield}
                isCurrentTurn={team.teamId === currentTurnTeamId}
                rank={team.finishRank}
              />
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div
      className={`relative rounded-3xl overflow-hidden border-2 border-amber-600/50 shadow-2xl transition-all flex flex-col justify-between ${
        isDisplay ? "p-3 sm:p-5" : "p-2.5 sm:p-4"
      }`}
      style={{
        background: "radial-gradient(ellipse at center, #1b1935 0%, #111124 60%, #070811 100%)",
      }}
    >
      {/* Decorative Adventure Map Grid & Compass Texture */}
      <div
        className="absolute inset-0 pointer-events-none opacity-25"
        style={{
          backgroundImage: `radial-gradient(circle at 15% 25%, rgba(245, 158, 11, 0.18) 0%, transparent 40%),
                            radial-gradient(circle at 85% 75%, rgba(6, 182, 212, 0.18) 0%, transparent 40%),
                            linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px),
                            linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)`,
          backgroundSize: "100% 100%, 100% 100%, 28px 28px, 28px 28px",
        }}
      />

      {/* Ornate Board Header */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-2 border-b border-amber-500/20 pb-2 mb-2 shrink-0">
        {/* Title & Legend */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br from-amber-500 to-yellow-600 flex items-center justify-center shadow-lg border border-yellow-300/40 text-base sm:text-lg font-black shrink-0">
            🎲
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className={`font-black ${isDisplay ? "text-lg sm:text-2xl" : "text-sm sm:text-base"} text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-amber-200 to-orange-400`}>
                Đường Đua Cờ Xí Ngầu S-Curve
              </h3>
              <span className="px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[10px] font-black uppercase tracking-wider">
                {totalTiles} Ô
              </span>
            </div>
            <p className="text-[9px] sm:text-[11px] text-slate-300 flex items-center gap-1.5 flex-wrap mt-0.5">
              <span>Đổ 1-6</span>
              <span>•</span>
              <span className="text-cyan-400">🚀 Tăng tốc (+2)</span>
              <span>•</span>
              <span className="text-rose-400">💥 Bẫy (-2)</span>
              <span>•</span>
              <span className="text-blue-400">🛡️ Khiên</span>
              <span>•</span>
              <span className="text-fuchsia-400">🌀 Cổng Không Gian</span>
              <span>•</span>
              <span className="text-purple-400">🔀 Đổi chỗ</span>
              <span>•</span>
              <span className="text-emerald-400">🎲 x2 Cơ hội</span>
            </p>
          </div>
        </div>

        {/* Dice Controller & Turn Indicator */}
        <div className="flex items-center gap-2">
          {currentTurnTeamName && (
            <div
              className={`px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 border transition ${
                isMyTurn
                  ? "bg-yellow-500/20 border-yellow-400 text-yellow-300 animate-pulse shadow-[0_0_12px_rgba(250,204,21,0.4)]"
                  : "bg-black/40 border-white/10 text-white"
              }`}
            >
              <span className="text-slate-400 text-[10px] sm:text-[11px]">Lượt:</span>
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

          {/* 3D Animated Dice Cube */}
          <div className="flex items-center gap-2">
            <div
              className={`p-1 rounded-xl bg-gradient-to-br from-amber-600 to-orange-700 border-2 border-yellow-300/60 shadow-xl flex items-center justify-center transition-transform ${
                animatingDice ? "animate-spin scale-110" : ""
              }`}
            >
              {lastDiceRoll ? renderDiceFace(lastDiceRoll) : renderDiceFace(6)}
            </div>

            {canRoll && isMyTurn && !isDisplay && (
              <button
                type="button"
                onClick={handleRollClick}
                disabled={animatingDice || isRolling}
                className="px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl font-black text-xs bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-black shadow-lg shadow-amber-500/30 border border-yellow-200 active:scale-95 transition-all flex items-center gap-1.5 animate-bounce"
              >
                <span>🎲</span>
                <span>TUNG XÚC XẮC!</span>
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
          DYNAMIC SERPENTINE S-CURVE RACETRACK BODY (Scalable for 30 - 50 tiles)
          Row 0: LTR (0..9) ➔ Right U-Turn
          Row 1: RTL (10..19, reversed) ➔ Left U-Turn
          Row 2: LTR (20..29) ➔ (Right U-Turn if Row 3 exists)
          Row 3: RTL (30..39, reversed) ➔ (Left U-Turn if Row 4 exists)
          Row 4: LTR (40..49) ➔ FINISH
         ═════════════════════════════════════════════════════════════════════ */}
      <div className="relative z-10 flex flex-col gap-1.5 sm:gap-2 p-1.5 sm:p-2 rounded-2xl bg-black/40 border border-white/10 flex-1 justify-center">
        {Array.from({ length: rowCount }).map((_, r) => {
          const startIdx = r * tilesPerRow;
          const endIdx = Math.min(tiles.length, (r + 1) * tilesPerRow);
          const rowTiles = tiles.slice(startIdx, endIdx);
          const isEvenRow = r % 2 === 0;
          const displayTiles = isEvenRow ? rowTiles : [...rowTiles].reverse();
          const hasNextRow = r < rowCount - 1;

          // Milestone numbers for U-Turn
          const lastNumThisRow = isEvenRow ? endIdx : startIdx + 1;
          const firstNumNextRow = isEvenRow ? endIdx + 1 : (r + 1) * tilesPerRow + Math.min(tilesPerRow, tiles.length - (r + 1) * tilesPerRow);

          return (
            <div key={r} className="flex flex-col gap-1 w-full">
              {/* Row Tiles */}
              <div className="relative flex items-center gap-1 sm:gap-1.5 w-full">
                {displayTiles.map((tile) => renderTileCard(tile))}

                {/* Right U-Turn Curve Connector (for Even Row transition) */}
                {hasNextRow && isEvenRow && (
                  <div className="hidden sm:flex absolute -right-3.5 top-1/2 w-4 h-14 border-r-2 border-t-2 border-b-2 border-amber-400/60 rounded-r-2xl pointer-events-none items-center justify-end pr-0.5">
                    <span className="text-[10px] text-amber-300 font-black animate-pulse">⇣</span>
                  </div>
                )}

                {/* Left U-Turn Curve Connector (for Odd Row transition) */}
                {hasNextRow && !isEvenRow && (
                  <div className="hidden sm:flex absolute -left-3.5 top-1/2 w-4 h-14 border-l-2 border-t-2 border-b-2 border-amber-400/60 rounded-l-2xl pointer-events-none items-center justify-start pl-0.5">
                    <span className="text-[10px] text-amber-300 font-black animate-pulse">⇣</span>
                  </div>
                )}
              </div>

              {/* U-Turn Indicator Label between rows */}
              {hasNextRow && (
                <div
                  className={`flex items-center -my-1 text-[8px] sm:text-[9px] font-mono font-bold text-amber-400/80 pointer-events-none ${
                    isEvenRow ? "justify-end pr-2" : "justify-start pl-2"
                  }`}
                >
                  <span className="flex items-center gap-1 bg-black/60 px-2 py-0.5 rounded-full border border-amber-500/30">
                    {isEvenRow ? (
                      <>
                        <span>U-Turn #{endIdx} ➔ #{endIdx + 1}</span>
                        <span className="animate-bounce">⤵</span>
                      </>
                    ) : (
                      <>
                        <span className="animate-bounce">⤵</span>
                        <span>U-Turn #{endIdx} ➔ #{endIdx + 1}</span>
                      </>
                    )}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ═════════════════════════════════════════════════════════════════════
          STANDINGS & PAWN TRACKER FOOTER
         ═════════════════════════════════════════════════════════════════════ */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-1.5 sm:gap-2 border-t border-white/10 pt-1.5 sm:pt-2 mt-1.5 sm:mt-2 text-xs shrink-0">
        <div className="flex items-center gap-1.5 text-slate-400 font-bold uppercase text-[9px] sm:text-[11px]">
          <span>🏆</span>
          <span>Bảng xếp hạng vị trí:</span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          {teams
            .sort((a, b) => {
              if (a.hasFinished && !b.hasFinished) return -1;
              if (!a.hasFinished && b.hasFinished) return 1;
              return b.position - a.position;
            })
            .map((team, idx) => (
              <div
                key={team.teamId}
                className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-xl border text-xs transition ${
                  team.teamId === currentTurnTeamId
                    ? "bg-purple-900/40 border-purple-400 text-white font-bold ring-1 ring-purple-400/50 shadow-sm"
                    : "bg-black/40 border-white/10 text-slate-300"
                }`}
              >
                <span className="font-black text-amber-400 text-[10px] sm:text-[11px]">#{idx + 1}</span>
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm"
                  style={{ background: team.teamColor }}
                />
                <span className="truncate max-w-[75px] sm:max-w-[100px] font-semibold text-[10px] sm:text-[11px]">{team.teamName}</span>
                <span className="font-mono font-black text-cyan-300 text-[10px] sm:text-[11px] ml-0.5">
                  {team.hasFinished ? "🏁 ĐÍCH" : `Ô ${team.position + 1}`}
                </span>
                {team.hasShield && <span className="text-[10px]" title="Có khiên bảo vệ">🛡️</span>}
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
