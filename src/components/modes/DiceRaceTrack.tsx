"use client";

import React, { useState, useEffect, useRef } from "react";
import { DiceRaceState, DiceTile } from "@/types";
import PawnPiece from "./PawnPiece";
import DiceRaceTileIcon from "./DiceRaceTileIcons";
import Dice3DRoller from "./Dice3DRoller";

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

/**
 * Adventure Island Serpentine S-Curve Racetrack
 * Features:
 * - Continuous Cobblestone / Adventure Pathway Ribbon connecting all rows seamlessly
 * - Glowing directional arrows (➤ ➤ ➤) guiding player along the path
 * - Uniform 3D stepping stone tiles (aspect ratio & size identical across every tile)
 * - 3D Tumbling Cube Dice Roller with multi-axis physics (2.0s - 2.5s)
 * - Step-by-step pawn hop movement tile-by-tile
 * - Distinctive Start Gateway & Finish Trophy Shrine
 */
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
  const [forceFullInMini, setForceFullInMini] = useState(false);

  // 3D Dice Roll Animation States
  const [isRolling3D, setIsRolling3D] = useState(false);
  const [activeRollValue, setActiveRollValue] = useState<number>(diceState?.lastDiceRoll || 6);
  const [showDiceModal, setShowDiceModal] = useState(false);

  // Step-by-step pawn hop animation
  const [animPositions, setAnimPositions] = useState<Record<string, number>>({});
  const [hoppingTeamId, setHoppingTeamId] = useState<string | null>(null);
  const [landingBanner, setLandingBanner] = useState<{ text: string; subtext?: string } | null>(null);

  const prevPositionsRef = useRef<Record<string, number>>({});
  const isAnimatingHopRef = useRef(false);

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
  } = diceState;

  const teams = Object.values(teamPositions || {});
  const currentTeam = teams.find((t) => t.teamId === currentTurnTeamId);

  // Sync positions & detect movement
  useEffect(() => {
    const nextAnim: Record<string, number> = {};
    let movedTeam: { teamId: string; from: number; to: number } | null = null;

    teams.forEach((t) => {
      const prev = prevPositionsRef.current[t.teamId];
      if (prev !== undefined && prev !== t.position && !isAnimatingHopRef.current) {
        movedTeam = { teamId: t.teamId, from: prev, to: t.position };
      }
      nextAnim[t.teamId] = animPositions[t.teamId] ?? t.position;
      prevPositionsRef.current[t.teamId] = t.position;
    });

    // If a team moved, trigger step-by-step hop
    if (movedTeam && (movedTeam as any).from !== (movedTeam as any).to) {
      animatePawnHop((movedTeam as any).teamId, (movedTeam as any).from, (movedTeam as any).to);
    } else if (!isAnimatingHopRef.current) {
      teams.forEach((t) => {
        nextAnim[t.teamId] = t.position;
      });
      setAnimPositions(nextAnim);
    }
  }, [teamPositions]);

  // Animate pawn jumping tile by tile
  const animatePawnHop = (teamId: string, fromPos: number, toPos: number) => {
    isAnimatingHopRef.current = true;
    setHoppingTeamId(teamId);

    const stepDiff = toPos > fromPos ? 1 : -1;
    let current = fromPos;

    const interval = setInterval(() => {
      current += stepDiff;
      setAnimPositions((prev) => ({ ...prev, [teamId]: current }));

      if (current === toPos) {
        clearInterval(interval);
        isAnimatingHopRef.current = false;
        setHoppingTeamId(null);

        // Check landing tile effect
        const landedTile = tiles[toPos];
        if (landedTile) {
          if (landedTile.type === "TELEPORT" && landedTile.teleportTargetIndex !== undefined) {
            setLandingBanner({
              text: `🌀 CỔNG DỊCH CHUYỂN ALPHA!`,
              subtext: `Vọt thẳng tới Ô #${landedTile.teleportTargetIndex + 1}!`,
            });
            setTimeout(() => {
              setAnimPositions((prev) => ({ ...prev, [teamId]: landedTile.teleportTargetIndex! }));
              setTimeout(() => setLandingBanner(null), 2500);
            }, 800);
          } else if (landedTile.type === "BOOST") {
            setLandingBanner({ text: `🚀 TĂNG TỐC SIÊU TỐC!`, subtext: `Tiến thêm 2 ô an toàn!` });
            setTimeout(() => setLandingBanner(null), 2500);
          } else if (landedTile.type === "TRAP") {
            setLandingBanner({ text: `💥 SỤT BẪY ĐỊA HÌNH!`, subtext: `Tụt lùi 2 ô!` });
            setTimeout(() => setLandingBanner(null), 2500);
          } else if (landedTile.type === "SHIELD") {
            setLandingBanner({ text: `🛡️ KHIÊN HOÀNG KIM!`, subtext: `Bảo vệ khỏi bẫy lần kế tiếp!` });
            setTimeout(() => setLandingBanner(null), 2500);
          } else if (landedTile.type === "FINISH") {
            setLandingBanner({ text: `🏆 CÁN ĐÍCH VINH QUANG!`, subtext: `Xin chúc mừng nhà vô địch!` });
            setTimeout(() => setLandingBanner(null), 4000);
          }
        }
      }
    }, 240);
  };

  const handleRollClick = () => {
    if (!canRoll || isRolling3D || isRolling) return;
    const roll = Math.floor(Math.random() * 6) + 1;
    setActiveRollValue(roll);
    setIsRolling3D(true);
    setShowDiceModal(true);

    if (onRollDice) {
      onRollDice();
    }
  };

  const handle3DComplete = () => {
    setIsRolling3D(false);
    setTimeout(() => {
      setShowDiceModal(false);
    }, 850);
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // MINI-TRACK HUD MODE: High-density progress banner when question is active
  // ═══════════════════════════════════════════════════════════════════════════
  if (mode === "mini" && !forceFullInMini) {
    return (
      <div className="w-full rounded-2xl border-2 border-amber-500/40 p-2 sm:p-2.5 shadow-xl bg-[#0f111e]/95 backdrop-blur-md transition-all">
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <div className="flex items-center gap-2">
            <span className="text-lg">🎲</span>
            <span className="text-xs font-black text-amber-300 uppercase tracking-wide">
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
              <span className="text-xs font-mono font-black text-amber-300 px-2 py-0.5 rounded bg-black/50 border border-amber-400/40">
                Xúc xắc: {lastDiceRoll} nút
              </span>
            )}

            {/* Quick roll button right inside Mini HUD */}
            {canRoll && isMyTurn && !isDisplay && (
              <button
                type="button"
                onClick={handleRollClick}
                disabled={isRolling3D || isRolling}
                className="px-3 py-1 rounded-xl font-black text-[11px] bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-black shadow-lg border border-yellow-200 animate-pulse transition flex items-center gap-1 active:scale-95"
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
              className="text-[11px] px-2.5 py-0.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 font-bold transition flex items-center gap-1"
            >
              <span>🗺️</span>
              <span>Bàn cờ</span>
            </button>
          </div>
        </div>

        {/* Compact linear track with miniature 3D pawns */}
        <div className="relative w-full h-8 bg-black/70 rounded-xl border border-amber-600/30 px-3 flex items-center shadow-inner">
          <div className="absolute inset-x-3 h-2 bg-gradient-to-r from-emerald-600 via-amber-600 to-yellow-400 rounded-full opacity-70" />
          <span className="absolute left-1.5 text-[8px] font-black text-emerald-400 uppercase">#1</span>
          <span className="absolute right-1.5 text-[8px] font-black text-yellow-300 uppercase">🏁 #{totalTiles}</span>

          {teams.map((team, idx) => {
            const currentTile = animPositions[team.teamId] ?? team.position;
            const pct = Math.min(96, Math.max(4, (currentTile / (totalTiles - 1)) * 92 + 4));
            return (
              <div
                key={team.teamId}
                className="absolute -top-1.5 transition-all duration-300 ease-out z-10"
                style={{
                  left: `${pct}%`,
                  transform: `translateX(-50%) translateY(${idx % 2 === 0 ? "0px" : "-3px"})`,
                }}
                title={`${team.teamName}: Ô ${currentTile + 1}/${totalTiles}`}
              >
                <PawnPiece
                  color={team.teamColor}
                  name={team.teamName}
                  size="xs"
                  hasShield={team.hasShield}
                  isCurrentTurn={team.teamId === currentTurnTeamId}
                  isHopping={hoppingTeamId === team.teamId}
                />
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // FULL ADVENTURE SERPENTINE RACETRACK (Continuous Pathway Ribbon & Uniform 3D Tiles)
  // ═══════════════════════════════════════════════════════════════════════════

  const tilesPerRow = 10;
  const rowCount = Math.ceil(tiles.length / tilesPerRow);

  // Helper to render an individual 3D Stepping Stone Tile
  const renderTile = (tile: DiceTile, isLastInRow: boolean, isFirstInRow: boolean, rowIdx: number) => {
    const isFinish = tile.index === totalTiles - 1;
    const isStart = tile.index === 0;
    const teamsHere = teams.filter((t) => (animPositions[t.teamId] ?? t.position) === tile.index);
    const hasPawns = teamsHere.length > 0;
    const isEvenRow = rowIdx % 2 === 0;

    // Distinct 3D Stepping Stone Themes (Thick extruded borders, rich highlights)
    const tileStyles: Record<string, { border: string; bg: string; text: string; shadow: string; glow: string; topBevel: string }> = {
      NORMAL: {
        border: "border-slate-600/80 border-b-[4.5px] border-b-slate-900",
        bg: "bg-gradient-to-b from-[#2e3148] via-[#1f2133] to-[#12131f]",
        text: "text-slate-300",
        shadow: "shadow-[0_4px_8px_rgba(0,0,0,0.6)]",
        glow: "",
        topBevel: "border-t border-white/20",
      },
      BOOST: {
        border: "border-cyan-400 border-b-[4.5px] border-b-cyan-800",
        bg: "bg-gradient-to-b from-cyan-800/90 via-[#0e314c] to-[#071c2c]",
        text: "text-cyan-200",
        shadow: "shadow-[0_4px_12px_rgba(6,182,212,0.45)]",
        glow: "ring-1 ring-cyan-400/50",
        topBevel: "border-t border-cyan-200/40",
      },
      TRAP: {
        border: "border-rose-500 border-b-[4.5px] border-b-rose-900",
        bg: "bg-gradient-to-b from-rose-900/90 via-[#381017] to-[#1e070c]",
        text: "text-rose-200",
        shadow: "shadow-[0_4px_12px_rgba(244,63,94,0.45)]",
        glow: "ring-1 ring-rose-500/50",
        topBevel: "border-t border-rose-200/40",
      },
      SHIELD: {
        border: "border-blue-400 border-b-[4.5px] border-b-blue-800",
        bg: "bg-gradient-to-b from-blue-800/90 via-[#122b5c] to-[#0a1835]",
        text: "text-blue-200",
        shadow: "shadow-[0_4px_12px_rgba(59,130,246,0.45)]",
        glow: "ring-1 ring-blue-400/50",
        topBevel: "border-t border-blue-200/40",
      },
      SWAP: {
        border: "border-purple-400 border-b-[4.5px] border-b-purple-800",
        bg: "bg-gradient-to-b from-purple-800/90 via-[#331554] to-[#1b0a2e]",
        text: "text-purple-200",
        shadow: "shadow-[0_4px_12px_rgba(168,85,247,0.45)]",
        glow: "ring-1 ring-purple-400/50",
        topBevel: "border-t border-purple-200/40",
      },
      EXTRA_ROLL: {
        border: "border-emerald-400 border-b-[4.5px] border-b-emerald-800",
        bg: "bg-gradient-to-b from-emerald-800/90 via-[#0f3d28] to-[#072417]",
        text: "text-emerald-200",
        shadow: "shadow-[0_4px_12px_rgba(160,185,129,0.45)]",
        glow: "ring-1 ring-emerald-400/50",
        topBevel: "border-t border-emerald-200/40",
      },
      TELEPORT: {
        border: "border-fuchsia-400 border-b-[4.5px] border-b-fuchsia-800",
        bg: "bg-gradient-to-b from-fuchsia-900/95 via-[#361350] to-[#1f0730]",
        text: "text-fuchsia-200",
        shadow: "shadow-[0_4px_16px_rgba(217,70,239,0.55)]",
        glow: "ring-1.5 ring-fuchsia-400/60 animate-pulse",
        topBevel: "border-t border-fuchsia-200/40",
      },
      TELEPORT_EXIT: {
        border: "border-teal-400 border-b-[4.5px] border-b-teal-800",
        bg: "bg-gradient-to-b from-teal-900/95 via-[#0f383d] to-[#072225]",
        text: "text-teal-200",
        shadow: "shadow-[0_4px_14px_rgba(20,184,166,0.45)]",
        glow: "ring-1 ring-teal-400/50",
        topBevel: "border-t border-teal-200/40",
      },
      FINISH: {
        border: "border-amber-300 border-b-[5px] border-b-amber-700",
        bg: "bg-gradient-to-b from-amber-500 via-[#684306] to-[#3a2402]",
        text: "text-amber-100",
        shadow: "shadow-[0_4px_20px_rgba(245,158,11,0.6)]",
        glow: "ring-2 ring-yellow-400 animate-pulse",
        topBevel: "border-t border-yellow-200/60",
      },
    };

    const style = isFinish ? tileStyles.FINISH : (tileStyles[tile.type] || tileStyles.NORMAL);

    let tileLabel = tile.label;
    if (tile.type === "TELEPORT" && tile.teleportTargetIndex !== undefined) {
      tileLabel = `➔ Ô ${tile.teleportTargetIndex + 1}`;
    } else if (tile.type === "TELEPORT_EXIT") {
      tileLabel = "Cổng Ra";
    }

    return (
      <div
        key={tile.index}
        className={`relative w-full aspect-[3/4] sm:aspect-[4/5] min-h-[64px] sm:min-h-[80px] rounded-xl sm:rounded-2xl border-2 p-0.5 sm:p-1 flex flex-col items-center justify-between transition-all select-none overflow-hidden ${style.border} ${style.bg} ${style.shadow} ${style.glow} ${style.topBevel}`}
      >
        {/* Step Tile Number Header */}
        <div className="w-full flex items-center justify-between text-[7px] sm:text-[9px] font-mono font-black leading-none px-0.5 shrink-0 z-10">
          <span className={isFinish || isStart ? "text-amber-300 font-black text-[8px] sm:text-[10px]" : "text-slate-300 font-bold"}>
            #{tile.index + 1}
          </span>
          {isStart && (
            <span className="text-[6px] sm:text-[7.5px] px-1 py-0.2 rounded bg-emerald-500/40 text-emerald-200 font-black uppercase">
              XUẤT PHÁT
            </span>
          )}
          {isFinish && (
            <span className="text-[6px] sm:text-[7.5px] px-1 py-0.2 rounded bg-amber-400/50 text-amber-100 font-black animate-pulse uppercase">
              ĐÍCH
            </span>
          )}
          {tile.portalId && (
            <span className={`text-[6px] sm:text-[7.5px] px-1 py-0.2 rounded font-black uppercase ${
              tile.type === "TELEPORT" ? "bg-fuchsia-500/40 text-fuchsia-100" : "bg-teal-500/40 text-teal-100"
            }`}>
              {tile.portalId}
            </span>
          )}
          {!isStart && !isFinish && !tile.portalId && hasPawns && (
            <span className="opacity-80 scale-90 sm:scale-100">
              <DiceRaceTileIcon type={tile.type} size={10} />
            </span>
          )}
        </div>

        {/* Central Illustrated Icon & Label (When NO pawns occupy this tile) */}
        {!hasPawns && (
          <div className="flex-1 w-full my-auto flex flex-col items-center justify-center pointer-events-none min-h-0">
            <DiceRaceTileIcon
              type={isFinish ? "FINISH" : tile.type}
              size={isDisplay ? (rowCount >= 5 ? 16 : 20) : (rowCount >= 5 ? 12 : 16)}
            />
            <span className={`text-[7px] sm:text-[8.5px] font-bold block truncate max-w-[42px] sm:max-w-[58px] text-center mt-0.5 leading-tight ${style.text}`}>
              {isFinish ? "Về Đích" : isStart ? "Khởi đầu" : tileLabel}
            </span>
          </div>
        )}

        {/* Central & Floor Area (When pawns are standing on this tile) */}
        {hasPawns && (
          <>
            {/* Subtle Watermark Icon in background of stone */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-15 overflow-hidden">
              <DiceRaceTileIcon type={isFinish ? "FINISH" : tile.type} size={36} />
            </div>

            {/* Pawns Standing Proudly on Stone Surface - Inside tile floor */}
            <div className="flex-1 w-full flex items-end justify-center pb-1 sm:pb-1.5 relative z-20 min-h-0">
              <div
                className={`inline-flex items-end justify-center flex-nowrap relative ${
                  teamsHere.length >= 3
                    ? "-space-x-2 sm:-space-x-2.5"
                    : teamsHere.length === 2
                    ? "-space-x-1.5 sm:-space-x-2"
                    : ""
                }`}
              >
                {teamsHere.map((team, pIdx) => {
                  const yOffset = teamsHere.length > 1 ? (pIdx % 2 === 0 ? "0px" : "-2px") : "0px";
                  return (
                    <div
                      key={team.teamId}
                      className="relative transition-transform duration-200 hover:scale-110 cursor-pointer"
                      style={{
                        zIndex: pIdx + 1,
                        transform: `translateY(${yOffset})`,
                      }}
                      title={`${team.teamName}: Ô #${tile.index + 1}`}
                    >
                      <PawnPiece
                        color={team.teamColor}
                        name={team.teamName}
                        size={
                          teamsHere.length >= 3 || rowCount >= 5
                            ? "xs"
                            : teamsHere.length === 2
                            ? (isDisplay ? "sm" : "xs")
                            : (isDisplay ? "md" : "sm")
                        }
                        hasShield={team.hasShield}
                        isCurrentTurn={team.teamId === currentTurnTeamId}
                        isHopping={hoppingTeamId === team.teamId}
                        rank={team.finishRank}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>
    );
  };

  return (
    <div
      className={`relative rounded-3xl overflow-hidden border-2 border-amber-600/60 shadow-2xl transition-all flex flex-col justify-between ${
        isDisplay ? "p-3 sm:p-5" : "p-2.5 sm:p-4"
      }`}
      style={{
        background: "radial-gradient(ellipse at center, #18192e 0%, #0f101d 65%, #07070f 100%)",
      }}
    >
      {/* Vintage Pirate Chart / Nautical World Map Watermark Texture */}
      <div
        className="absolute inset-0 pointer-events-none opacity-20"
        style={{
          backgroundImage: `radial-gradient(circle at 10% 20%, rgba(245, 158, 11, 0.25) 0%, transparent 45%),
                            radial-gradient(circle at 90% 80%, rgba(6, 182, 212, 0.25) 0%, transparent 45%),
                            linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px),
                            linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)`,
          backgroundSize: "100% 100%, 100% 100%, 32px 32px, 32px 32px",
        }}
      />

      {/* Decorative Gold Filigree Corner Accents */}
      <div className="absolute top-2 left-2 text-amber-500/30 text-xs font-serif pointer-events-none select-none">⚜</div>
      <div className="absolute top-2 right-2 text-amber-500/30 text-xs font-serif pointer-events-none select-none">⚜</div>
      <div className="absolute bottom-2 left-2 text-amber-500/30 text-xs font-serif pointer-events-none select-none">⚜</div>
      <div className="absolute bottom-2 right-2 text-amber-500/30 text-xs font-serif pointer-events-none select-none">⚜</div>

      {/* 3D Tumbling Cube Modal Overlay */}
      {showDiceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="relative p-8 rounded-3xl bg-gradient-to-b from-[#202238] via-[#141525] to-[#0a0a14] border-2 border-amber-400 shadow-[0_0_50px_rgba(245,158,11,0.5)] flex flex-col items-center">
            <h4 className="text-sm font-black text-amber-300 uppercase tracking-widest mb-6">
              🎲 {currentTurnTeamName || "Thí sinh"} Đang Gieo Xúc Xắc...
            </h4>

            <Dice3DRoller
              value={activeRollValue}
              isRolling={isRolling3D}
              durationMs={2200}
              onComplete={handle3DComplete}
              size={84}
            />

            <p className="mt-8 text-xs text-slate-300 font-semibold animate-pulse">
              {isRolling3D ? "Đang nhào lộn xúc xắc 3D..." : `Chốt số ${activeRollValue} nút! Chuẩn bị tiến bước...`}
            </p>
          </div>
        </div>
      )}

      {/* Landing Event Splash Banner */}
      {landingBanner && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-40 px-5 py-2 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-yellow-400 text-black font-black text-center shadow-2xl border-2 border-white animate-bounce">
          <p className="text-sm font-black uppercase tracking-wide">{landingBanner.text}</p>
          {landingBanner.subtext && <p className="text-xs font-bold mt-0.5">{landingBanner.subtext}</p>}
        </div>
      )}

      {/* Ornate Board Header */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-2 border-b border-amber-500/30 pb-2 mb-2 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-2xl bg-gradient-to-br from-amber-500 to-yellow-600 flex items-center justify-center shadow-lg border border-yellow-300/50 text-base sm:text-lg font-black shrink-0">
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
              <span className="text-cyan-400 font-bold">🚀 Tăng tốc (+2)</span>
              <span>•</span>
              <span className="text-rose-400 font-bold">💥 Bẫy (-2)</span>
              <span>•</span>
              <span className="text-blue-400 font-bold">🛡️ Khiên</span>
              <span>•</span>
              <span className="text-fuchsia-400 font-bold">🌀 Cổng Không Gian</span>
              <span>•</span>
              <span className="text-purple-400 font-bold">🔀 Đổi chỗ</span>
              <span>•</span>
              <span className="text-emerald-400 font-bold">🎲 x2 Cơ hội</span>
            </p>
          </div>
        </div>

        {/* Dice Controller & Turn Indicator */}
        <div className="flex items-center gap-2">
          {currentTurnTeamName && (
            <div
              className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 border transition ${
                isMyTurn
                  ? "bg-yellow-500/20 border-yellow-400 text-yellow-300 animate-pulse shadow-[0_0_15px_rgba(250,204,21,0.4)]"
                  : "bg-black/50 border-white/10 text-white"
              }`}
            >
              <span className="text-slate-400 text-[10px] sm:text-[11px]">Lượt:</span>
              <span
                className="font-black text-sm"
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

          {/* Quick Dice Roll Action */}
          {canRoll && isMyTurn && !isDisplay && (
            <button
              type="button"
              onClick={handleRollClick}
              disabled={isRolling3D || isRolling}
              className="px-3.5 py-2 rounded-xl font-black text-xs bg-gradient-to-r from-amber-400 via-orange-400 to-yellow-500 hover:from-amber-300 hover:to-orange-400 text-black shadow-lg shadow-amber-500/30 border border-yellow-200 active:scale-95 transition-all flex items-center gap-1.5 animate-bounce"
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

      {/* ═════════════════════════════════════════════════════════════════════
          CONTINUOUS PATHWAY RIBBON WITH DIRECTION ARROWS (30 - 50 TILES)
         ═════════════════════════════════════════════════════════════════════ */}
      <div className="relative z-10 flex flex-col gap-2.5 sm:gap-3.5 p-2 sm:p-3 rounded-2xl bg-black/45 border border-amber-600/30 flex-1 justify-center">
        {Array.from({ length: rowCount }).map((_, r) => {
          const startIdx = r * tilesPerRow;
          const endIdx = Math.min(tiles.length, (r + 1) * tilesPerRow);
          const rowTiles = tiles.slice(startIdx, endIdx);
          const isEvenRow = r % 2 === 0;
          const displayTiles = isEvenRow ? rowTiles : [...rowTiles].reverse();
          const hasNextRow = r < rowCount - 1;

          return (
            <div key={r} className="relative flex flex-col w-full">
              {/* Connected Cobblestone Pathway Road Bed (Lót đường đá phiêu lưu) */}
              <div
                className={`relative w-full rounded-2xl border-2 border-[#433522] p-1.5 shadow-inner ${
                  isEvenRow ? "rounded-r-3xl" : "rounded-l-3xl"
                }`}
                style={{
                  background: "linear-gradient(180deg, #2a2217 0%, #1e1810 50%, #15110a 100%)",
                  boxShadow: "inset 0 3px 6px rgba(0,0,0,0.8), 0 2px 4px rgba(0,0,0,0.5)",
                }}
              >
                {/* 10-Column Strict Equal Grid */}
                <div className="grid grid-cols-10 gap-1 sm:gap-2 w-full items-stretch">
                  {displayTiles.map((tile, tIdx) => {
                    const isLastInThisDisplay = tIdx === displayTiles.length - 1;
                    return (
                      <div key={tile.index} className="relative flex items-stretch min-w-0 w-full h-full">
                        {renderTile(tile, isLastInThisDisplay, tIdx === 0, r)}

                        {/* Emerald Glowing Direction Arrow on Road between Tiles */}
                        {!isLastInThisDisplay && (
                          <div
                            className={`absolute top-1/2 -translate-y-1/2 pointer-events-none z-30 filter drop-shadow-[0_0_4px_rgba(52,211,153,0.8)] ${
                              isEvenRow
                                ? "-right-1 sm:-right-1.5 text-emerald-400"
                                : "-left-1 sm:-left-1.5 text-emerald-400"
                            }`}
                          >
                            <span className="text-[10px] sm:text-[12px] font-black leading-none">
                              {isEvenRow ? "➤" : "◀"}
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Right U-Turn Curve Road Cap (Chuyển hàng Chẵn sang Lẻ) */}
                {hasNextRow && isEvenRow && (
                  <div
                    className="hidden sm:flex absolute -right-4 top-1/2 -translate-y-1/2 w-6 h-full border-r-4 border-t-4 border-b-4 border-[#52412b] rounded-r-3xl pointer-events-none items-center justify-center bg-[#241d13] shadow-lg z-0"
                    style={{
                      height: "calc(100% + 14px)",
                      transform: "translateY(12px)",
                    }}
                  >
                    <span className="text-xs text-emerald-400 font-black animate-pulse">
                      ⤵
                    </span>
                  </div>
                )}

                {/* Left U-Turn Curve Road Cap (Chuyển hàng Lẻ sang Chẵn) */}
                {hasNextRow && !isEvenRow && (
                  <div
                    className="hidden sm:flex absolute -left-4 top-1/2 -translate-y-1/2 w-6 h-full border-l-4 border-t-4 border-b-4 border-[#52412b] rounded-l-3xl pointer-events-none items-center justify-center bg-[#241d13] shadow-lg z-0"
                    style={{
                      height: "calc(100% + 14px)",
                      transform: "translateY(12px)",
                    }}
                  >
                    <span className="text-xs text-emerald-400 font-black animate-pulse">
                      ⤵
                    </span>
                  </div>
                )}
              </div>

              {/* U-Turn Milestone Badge */}
              {hasNextRow && (
                <div
                  className={`flex items-center -my-1 text-[8px] sm:text-[9px] font-mono font-bold text-amber-300 pointer-events-none z-10 ${
                    isEvenRow ? "justify-end pr-3" : "justify-start pl-3"
                  }`}
                >
                  <span className="flex items-center gap-1 bg-black/80 px-2 py-0.5 rounded-full border border-amber-500/40 shadow">
                    <span>Khúc Cua #{endIdx} ➔ #{endIdx + 1}</span>
                    <span className="text-emerald-400 font-black">⤵</span>
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
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-1.5 sm:gap-2 border-t border-amber-500/20 pt-1.5 sm:pt-2 mt-2 text-xs shrink-0">
        <div className="flex items-center gap-1.5 text-slate-300 font-bold uppercase text-[9px] sm:text-[11px]">
          <span>🏆</span>
          <span>Bảng xếp hạng vị trí đường đua:</span>
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
                    ? "bg-purple-900/50 border-purple-400 text-white font-bold ring-1 ring-purple-400/50 shadow-md"
                    : "bg-black/50 border-white/10 text-slate-300"
                }`}
              >
                <span className="font-black text-amber-400 text-[10px] sm:text-[11px]">#{idx + 1}</span>
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm"
                  style={{ background: team.teamColor }}
                />
                <span className="truncate max-w-[75px] sm:max-w-[105px] font-semibold text-[10px] sm:text-[11px]">{team.teamName}</span>
                <span className="font-mono font-black text-cyan-300 text-[10px] sm:text-[11px] ml-0.5">
                  {team.hasFinished ? "🏁 ĐÍCH" : `Ô ${(animPositions[team.teamId] ?? team.position) + 1}`}
                </span>
                {team.hasShield && <span className="text-[10px]" title="Có khiên bảo vệ">🛡️</span>}
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
