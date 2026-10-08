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

export interface TileGeometry {
  x: number;       // percentage 0 - 100
  y: number;       // percentage 0 - 100
  rotateZ: number; // tangent angle in degrees along the racetrack
}

/**
 * Calculates continuous, smooth tangent coordinates and Z-rotation
 * for every tile along the Serpentine Racetrack Circuit.
 * Eliminates chopped rectangular grids; delivers a real continuous circuit with U-turn bends.
 */
export function getSerpentineTileGeometry(index: number, totalTiles: number = 60): TileGeometry {
  if (totalTiles <= 35) {
    // 3 rows for legacy small boards
    const numRows = 3;
    const numCurves = 2;
    const curveTilesCount = 3;
    const totalCurveTiles = numCurves * curveTilesCount;
    const straightTilesTotal = totalTiles - totalCurveTiles;
    const r1 = Math.round(straightTilesTotal * 0.38);
    const r2 = Math.round(straightTilesTotal * 0.31);
    const r3 = straightTilesTotal - (r1 + r2);
    const tilesPerRow = [r1, r2, r3];

    const yStart = 15.0;
    const yEnd = 88.0;
    const yStep = (yEnd - yStart) / 2;
    const xLeft = 6.2;
    const xRight = 74.2;

    let currentIndex = 0;
    for (let r = 0; r < numRows; r++) {
      const rowCount = tilesPerRow[r];
      const yRow = yStart + r * yStep;
      const isEven = r % 2 === 0;

      if (index >= currentIndex && index < currentIndex + rowCount) {
        const step = index - currentIndex;
        const frac = rowCount > 1 ? step / (rowCount - 1) : 0.5;
        const x = isEven ? xLeft + frac * (xRight - xLeft) : xRight - frac * (xRight - xLeft);
        return { x: Number(x.toFixed(2)), y: Number(yRow.toFixed(2)), rotateZ: 0 };
      }
      currentIndex += rowCount;

      if (r < numCurves) {
        if (index >= currentIndex && index < currentIndex + curveTilesCount) {
          const cStep = index - currentIndex;
          const cFrac = (cStep + 1) / (curveTilesCount + 1);
          const yCurve = yRow + cFrac * yStep;
          const xCurve = isEven ? xRight + 9.0 : xLeft - 2.0;
          return { x: Number(xCurve.toFixed(2)), y: Number(yCurve.toFixed(2)), rotateZ: 0 };
        }
        currentIndex += curveTilesCount;
      }
    }
    return { x: 86.5, y: 88.0, rotateZ: 0 };
  }

  // Continuous S-Curve circuit for marathon boards (50 - 100 tiles)
  const numRows = totalTiles >= 80 ? 6 : 5;
  const numCurves = numRows - 1;
  const curveTilesCount = 2;
  const totalCurveTiles = numCurves * curveTilesCount;
  const straightTilesTotal = totalTiles - totalCurveTiles;

  const basePerRow = Math.floor(straightTilesTotal / numRows);
  const remainder = straightTilesTotal % numRows;
  const tilesPerRow: number[] = [];
  for (let r = 0; r < numRows; r++) {
    const extra = (r === 0 || r === numRows - 1) ? Math.ceil(remainder / 2) : 0;
    tilesPerRow.push(basePerRow + extra);
  }
  let sum = tilesPerRow.reduce((a, b) => a + b, 0);
  while (sum > straightTilesTotal) { tilesPerRow[1]--; sum--; }
  while (sum < straightTilesTotal) { tilesPerRow[1]++; sum++; }

  const yStart = numRows === 6 ? 10.0 : 11.0;
  const yEnd = numRows === 6 ? 90.0 : 89.0;
  const yStep = (yEnd - yStart) / (numRows - 1);
  const xLeft = 6.5;
  const xRight = 93.5;

  let currentIndex = 0;
  for (let r = 0; r < numRows; r++) {
    const rowCount = tilesPerRow[r];
    const yRow = yStart + r * yStep;
    const isEven = r % 2 === 0;

    if (index >= currentIndex && index < currentIndex + rowCount) {
      const step = index - currentIndex;
      const frac = rowCount > 1 ? step / (rowCount - 1) : 0.5;
      const x = isEven ? xLeft + frac * (xRight - xLeft) : xRight - frac * (xRight - xLeft);
      return { x: Number(x.toFixed(2)), y: Number(yRow.toFixed(2)), rotateZ: 0 };
    }
    currentIndex += rowCount;

    if (r < numCurves) {
      if (index >= currentIndex && index < currentIndex + curveTilesCount) {
        const cStep = index - currentIndex;
        const cFrac = (cStep + 1) / (curveTilesCount + 1);
        const yCurve = yRow + cFrac * yStep;
        const xCurve = isEven ? xRight + 2.5 : xLeft - 2.5;
        return { x: Number(xCurve.toFixed(2)), y: Number(yCurve.toFixed(2)), rotateZ: 0 };
      }
      currentIndex += curveTilesCount;
    }
  }

  return { x: 50, y: 50, rotateZ: 0 };
}

export function getSerpentineSvgPath(totalTiles: number = 60): string {
  if (totalTiles <= 35) {
    return "M 62 90 L 742 90 A 108 111 0 0 1 742 312 L 232 312 A 108 108 0 0 0 232 528 L 865 528";
  }

  const numRows = totalTiles >= 80 ? 6 : 5;
  const yStart = numRows === 6 ? 10.0 : 11.0;
  const yEnd = numRows === 6 ? 90.0 : 89.0;
  const yStep = (yEnd - yStart) / (numRows - 1);
  const xLeft = 6.5;
  const xRight = 93.5;

  let path = "";
  for (let r = 0; r < numRows; r++) {
    const yRow = (yStart + r * yStep) * 6; // Scale to 600 height
    const xL = xLeft * 10; // Scale to 1000 width
    const xR = xRight * 10;
    const isEven = r % 2 === 0;

    if (r === 0) {
      path += `M ${xL} ${yRow} L ${xR} ${yRow}`;
    } else if (isEven) {
      path += ` L ${xR} ${yRow}`;
    } else {
      path += ` L ${xL} ${yRow}`;
    }

    if (r < numRows - 1) {
      const nextY = (yStart + (r + 1) * yStep) * 6;
      const radiusY = ((nextY - yRow) / 2);
      const radiusX = 40;
      if (isEven) {
        path += ` A ${radiusX} ${radiusY} 0 0 1 ${xR} ${nextY}`;
      } else {
        path += ` A ${radiusX} ${radiusY} 0 0 0 ${xL} ${nextY}`;
      }
    }
  }

  return path;
}

/**
 * Neon Serpentine Circuit Racetrack
 * Features:
 * - Continuous flowing S-Curve Roadbed with SVG asphalt and glowing neon curbs
 * - Continuous tangent Z-rotation (rotateZ) for each tile block
 * - Upright counter-rotated pawns that stand proud without being tilted sideways
 * - Push dice out of the board & Recall dice widget anytime
 * - Full support for Extra Roll x2 opportunity (grantAnotherRoll)
 * - Overflow step clamp to finish line
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
  const [rollSessionId, setRollSessionId] = useState(0);
  const [isRolling3D, setIsRolling3D] = useState(false);
  const [activeRollValue, setActiveRollValue] = useState<number>(diceState?.lastDiceRoll || 7);
  const [activeDiceValues, setActiveDiceValues] = useState<[number, number]>(
    diceState?.lastDiceValues || [3, 4]
  );
  const [originCorner, setOriginCorner] = useState<0 | 1 | 2 | 3>(0);
  const [landingPos, setLandingPos] = useState<{ x: number; y: number }>({ x: 50, y: 50 });
  const [hasLandedDice, setHasLandedDice] = useState<boolean>(Boolean(diceState?.lastDiceRoll));
  const [isDiceDismissed, setIsDiceDismissed] = useState(false);

  // Step-by-step pawn hop animation
  const [animPositions, setAnimPositions] = useState<Record<string, number>>({});
  const [hoppingTeamId, setHoppingTeamId] = useState<string | null>(null);
  const [landingBanner, setLandingBanner] = useState<{ text: string; subtext?: string } | null>(null);

  const prevPositionsRef = useRef<Record<string, number>>({});
  const isAnimatingHopRef = useRef(false);
  const pendingMoveRef = useRef<{ teamId: string; from: number; to: number } | null>(null);
  const prevLastRollRef = useRef<number | null>(diceState?.lastDiceRoll ?? null);
  const prevRollTimestampRef = useRef<number | null>(diceState?.rollTimestamp ?? null);
  const isDiceRollingRef = useRef(false);
  const hopTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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

  // Synchronize Authoritative Roll from Engine / Server
  useEffect(() => {
    if (lastDiceRoll !== null && lastDiceRoll !== undefined) {
      const isNewRoll =
        diceState.rollTimestamp !== undefined
          ? diceState.rollTimestamp !== prevRollTimestampRef.current
          : lastDiceRoll !== prevLastRollRef.current;

      if (isNewRoll) {
        prevRollTimestampRef.current = diceState.rollTimestamp ?? Date.now();
        prevLastRollRef.current = lastDiceRoll;
        setActiveRollValue(lastDiceRoll);

        let dVals: [number, number];
        if (diceState.lastDiceValues && Array.isArray(diceState.lastDiceValues) && diceState.lastDiceValues.length === 2) {
          dVals = [diceState.lastDiceValues[0], diceState.lastDiceValues[1]];
        } else {
          const half = Math.floor(lastDiceRoll / 2);
          dVals = [Math.max(1, Math.min(6, lastDiceRoll - half)), Math.max(1, Math.min(6, half))];
        }
        setActiveDiceValues(dVals);

        // Random corner outside board (0: TL, 1: TR, 2: BL, 3: BR)
        const randCorner = Math.floor(Math.random() * 4) as 0 | 1 | 2 | 3;
        setOriginCorner(randCorner);

        // Random landing spot strictly >22% from edges
        const randX = Math.floor(28 + Math.random() * 42);
        const randY = Math.floor(28 + Math.random() * 38);
        setLandingPos({ x: randX, y: randY });

        // Synchronously lock movement until 3D roll finishes
        isDiceRollingRef.current = true;
        setIsRolling3D(true);
        setRollSessionId((prev) => prev + 1);
        setHasLandedDice(true);
        setIsDiceDismissed(false); // Reset dismiss so players watch the 3D roll
      }
    } else {
      prevLastRollRef.current = null;
      prevRollTimestampRef.current = null;
      setHasLandedDice(false);
      setIsRolling3D(false);
      isDiceRollingRef.current = false;
    }
  }, [lastDiceRoll, diceState.rollTimestamp]);

  // Sync positions & detect movement (STRICTLY DELAYED until 3D dice lands)
  useEffect(() => {
    const nextAnim: Record<string, number> = {};
    let movedTeam: { teamId: string; from: number; to: number } | null = null;

    teams.forEach((t) => {
      const prev = prevPositionsRef.current[t.teamId];
      if (prev !== undefined && prev !== t.position && !isAnimatingHopRef.current) {
        movedTeam = { teamId: t.teamId, from: prev, to: t.position };
      }
      prevPositionsRef.current[t.teamId] = t.position;
    });

    if (movedTeam && (movedTeam as any).from !== (movedTeam as any).to) {
      if (isDiceRollingRef.current) {
        pendingMoveRef.current = movedTeam;
        setAnimPositions((prev) => ({ ...prev, [(movedTeam as any).teamId]: (movedTeam as any).from }));
      } else {
        animatePawnHop((movedTeam as any).teamId, (movedTeam as any).from, (movedTeam as any).to);
      }
    } else if (!isAnimatingHopRef.current && !isDiceRollingRef.current) {
      teams.forEach((t) => {
        nextAnim[t.teamId] = t.position;
      });
      setAnimPositions(nextAnim);
    }
  }, [teamPositions]);

  // Cleanup hop timer on unmount
  useEffect(() => {
    return () => {
      if (hopTimeoutRef.current) clearTimeout(hopTimeoutRef.current);
    };
  }, []);

  // Animate pawn jumping tile by tile along the Serpentine Circuit
  const animatePawnHop = (teamId: string, fromPos: number, toPos: number) => {
    if (fromPos === toPos) return;

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

        // Check landing tile effect banner
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
          } else if (landedTile.type === "EXTRA_ROLL") {
            setLandingBanner({ text: `🎲 x2 CƠ HỘI ĐỘT PHÁ!`, subtext: `Được gieo xúc xắc thêm một lần nữa ngay!` });
            setTimeout(() => setLandingBanner(null), 3000);
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
    if (onRollDice) {
      onRollDice();
    }
  };

  const handle3DComplete = () => {
    setIsRolling3D(false);
    isDiceRollingRef.current = false;

    if (hopTimeoutRef.current) clearTimeout(hopTimeoutRef.current);
    hopTimeoutRef.current = setTimeout(() => {
      if (pendingMoveRef.current) {
        const { teamId, from, to } = pendingMoveRef.current;
        pendingMoveRef.current = null;
        animatePawnHop(teamId, from, to);
      }
    }, 380);
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
            {diceState.extraRollGranted && (
              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-500/30 text-emerald-300 border border-emerald-400/50 animate-pulse">
                🎲 x2 Lần gieo!
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {canRoll && onRollDice && (
              <button
                type="button"
                onClick={onRollDice}
                className="text-xs px-3 py-1 rounded-lg bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-black font-black transition flex items-center gap-1 cursor-pointer animate-pulse shadow-md whitespace-nowrap"
              >
                <span>🎲</span>
                <span>Gieo Xí Ngầu!</span>
              </button>
            )}

            {lastDiceRoll && (
              <span className="text-xs font-mono font-black text-amber-300 px-2 py-0.5 rounded bg-black/50 border border-amber-400/40">
                Xúc xắc: {lastDiceRoll} nút
              </span>
            )}

            <button
              type="button"
              onClick={() => {
                if (onToggleView) onToggleView();
                else setForceFullInMini(true);
              }}
              className="text-[11px] px-2.5 py-0.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 font-bold transition flex items-center gap-1 cursor-pointer"
            >
              <span>🗺️</span>
              <span>Bàn cờ</span>
            </button>
          </div>
        </div>

        {/* Compact linear track with miniature 3D pawns */}
        <div className="relative w-full h-8 bg-black/70 rounded-xl border border-amber-600/30 px-3 flex items-center shadow-inner">
          <div className="absolute inset-x-3 h-2 bg-gradient-to-r from-emerald-600 via-cyan-600 to-amber-400 rounded-full opacity-70" />
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
  // FULL SERPENTINE RACETRACK CIRCUIT (Continuous Ribbon & Tangent Z-Rotation)
  // ═══════════════════════════════════════════════════════════════════════════

  // Distinct 3D Stepping Stone Themes
  const tileStyles: Record<string, { border: string; bg: string; text: string; shadow: string; glow: string; topBevel: string }> = {
    NORMAL: {
      border: "border-cyan-500/30 border-b-[4.5px] border-b-cyan-950",
      bg: "bg-gradient-to-b from-[#1c223d] via-[#12162a] to-[#0a0d18]",
      text: "text-slate-200",
      shadow: "shadow-[0_4px_10px_rgba(0,0,0,0.7)]",
      glow: "hover:border-cyan-400/60",
      topBevel: "border-t border-cyan-400/20",
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
      shadow: "shadow-[0_4px_12px_rgba(16,185,129,0.5)]",
      glow: "ring-1 ring-emerald-400/60 animate-pulse",
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
      shadow: "shadow-[0_4px_22px_rgba(245,158,11,0.65)]",
      glow: "ring-2 ring-yellow-400 animate-pulse",
      topBevel: "border-t border-yellow-200/60",
    },
  };

  // Helper to render an individual 3D Stepping Stone Tile along the Serpentine Path
  const renderSerpentineTile = (tile: DiceTile, geo: TileGeometry) => {
    const isFinish = tile.index === totalTiles - 1;
    const isStart = tile.index === 0;
    const teamsHere = teams.filter((t) => (animPositions[t.teamId] ?? t.position) === tile.index);
    const hasPawns = teamsHere.length > 0;
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
        className="absolute select-none transition-all duration-300 z-10 flex items-center justify-center pointer-events-auto"
        style={{
          left: `${geo.x}%`,
          top: `${geo.y}%`,
          transform: `translate(-50%, -50%) rotateZ(${geo.rotateZ}deg)`,
          width: totalTiles >= 80 ? (isDisplay ? "5.4%" : "5.0%") : totalTiles >= 50 ? (isDisplay ? "6.4%" : "5.8%") : (isDisplay ? "7.6%" : "7.2%"),
          maxWidth: totalTiles >= 80 ? "56px" : totalTiles >= 50 ? "68px" : "84px",
          minWidth: totalTiles >= 80 ? "30px" : totalTiles >= 50 ? "36px" : "46px",
        }}
      >
        {/* 3D Stepping Stone Block with Tangent rotateZ Angle */}
        <div
          className={`relative w-full aspect-[3/4] sm:aspect-[4/5] rounded-xl sm:rounded-2xl border-2 p-0.5 sm:p-1 flex flex-col items-center justify-between transition-all overflow-hidden ${style.border} ${style.bg} ${style.shadow} ${style.glow} ${style.topBevel}`}
        >
          {/* Step Tile Number Header */}
          <div className="w-full flex items-center justify-between text-[7px] sm:text-[9px] font-mono font-black leading-none px-0.5 shrink-0 z-10">
            <span className={isFinish || isStart ? "text-amber-300 font-black text-[8px] sm:text-[10px]" : "text-slate-300 font-bold"}>
              #{tile.index + 1}
            </span>
            {isStart && (
              <span className="text-[6px] sm:text-[7.5px] px-1 py-0.2 rounded bg-emerald-500/40 text-emerald-200 font-black uppercase">
                XUẤT PHÁT (1đ)
              </span>
            )}
            {isFinish && (
              <span className="text-[6px] sm:text-[7.5px] px-1 py-0.2 rounded bg-amber-400/50 text-amber-100 font-black animate-pulse uppercase">
                ĐÍCH ({totalTiles}đ)
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
                size={isDisplay ? 18 : 14}
              />
              <span className={`text-[6.5px] sm:text-[8px] font-bold block truncate max-w-[44px] sm:max-w-[58px] text-center mt-0.5 leading-tight ${style.text}`}>
                {isFinish ? "Về Đích" : isStart ? "Khởi đầu" : tileLabel}
              </span>
            </div>
          )}

          {/* Central Floor Area: Pawns Standing Proudly - Counter-rotated so they always stay upright! */}
          {hasPawns && (
            <>
              {/* Subtle Watermark Icon in background of stone */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-15 overflow-hidden">
                <DiceRaceTileIcon type={isFinish ? "FINISH" : tile.type} size={32} />
              </div>

              {/* Counter-rotate pawn container to cancel tile's rotateZ so pawns always face the screen upright */}
              <div
                className="flex-1 w-full flex items-end justify-center pb-1 sm:pb-1.5 relative z-20 min-h-0"
                style={{
                  transform: `rotateZ(${-geo.rotateZ}deg)`,
                  transformOrigin: "center 70%",
                }}
              >
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
                            totalTiles >= 60
                              ? teamsHere.length >= 2 ? "xs" : isDisplay ? "sm" : "xs"
                              : teamsHere.length >= 3
                              ? "xs"
                              : teamsHere.length === 2
                              ? isDisplay ? "sm" : "xs"
                              : isDisplay ? "md" : "sm"
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
      </div>
    );
  };

  return (
    <div
      className={`relative rounded-3xl overflow-visible border-2 border-cyan-500/40 shadow-[0_0_35px_rgba(6,182,212,0.18)] transition-all flex flex-col justify-between max-h-[78vh] ${
        isDisplay ? "p-2.5 sm:p-3.5 px-3 sm:px-5" : "p-2 sm:p-3 px-2.5 sm:px-4"
      }`}
      style={{
        background: "radial-gradient(ellipse at center, #11152e 0%, #090c1c 65%, #05060f 100%)",
      }}
    >
      {/* Cyber Circuit Grid Background Texture */}
      <div
        className="absolute inset-0 pointer-events-none opacity-20 rounded-3xl overflow-hidden"
        style={{
          backgroundImage: `radial-gradient(circle at 10% 20%, rgba(6, 182, 212, 0.25) 0%, transparent 45%),
                            radial-gradient(circle at 90% 80%, rgba(168, 85, 247, 0.25) 0%, transparent 45%),
                            linear-gradient(rgba(6, 182, 212, 0.1) 1px, transparent 1px),
                            linear-gradient(90deg, rgba(6, 182, 212, 0.1) 1px, transparent 1px)`,
          backgroundSize: "100% 100%, 100% 100%, 32px 32px, 32px 32px",
        }}
      />

      {/* 3D Dual Dice Toss Simulated on Real Gameboard with Dismiss / Recall Support */}
      {hasLandedDice && (
        <>
          {/* Dice 1 */}
          <Dice3DRoller
            key={`${rollSessionId}-d1`}
            value={activeDiceValues[0]}
            isRolling={isRolling3D}
            durationMs={2000}
            onComplete={handle3DComplete}
            simulateToss={true}
            landingPos={{ x: Math.max(22, landingPos.x - (isDisplay ? 6.5 : 5.5)), y: landingPos.y }}
            originCorner={originCorner === 1 || originCorner === 3 ? 0 : 2}
            size={isDisplay ? 72 : 62}
            isDismissed={isDiceDismissed}
            onDismiss={() => setIsDiceDismissed(true)}
          />
          {/* Dice 2 */}
          <Dice3DRoller
            key={`${rollSessionId}-d2`}
            value={activeDiceValues[1]}
            isRolling={isRolling3D}
            durationMs={2000}
            simulateToss={true}
            landingPos={{ x: Math.min(78, landingPos.x + (isDisplay ? 6.5 : 5.5)), y: landingPos.y }}
            originCorner={originCorner === 0 || originCorner === 2 ? 1 : 3}
            size={isDisplay ? 72 : 62}
            isDismissed={isDiceDismissed}
            onDismiss={() => setIsDiceDismissed(true)}
          />
          {/* Sum Banner Floating Above Landed Dice */}
          {!isDiceDismissed && !isRolling3D && (
            <div
              className="absolute z-40 pointer-events-none -translate-x-1/2 -translate-y-full flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 rounded-2xl bg-black/90 border-2 border-amber-400 text-amber-300 shadow-[0_0_25px_rgba(245,158,11,0.6)] font-black text-xs sm:text-sm animate-pulse"
              style={{
                left: `${landingPos.x}%`,
                top: `${Math.max(12, landingPos.y - 12)}%`,
              }}
            >
              <span className="font-mono text-white text-xs sm:text-sm bg-white/10 px-1.5 py-0.5 rounded">🎲 {activeDiceValues[0]}</span>
              <span className="text-amber-400 font-black">+</span>
              <span className="font-mono text-white text-xs sm:text-sm bg-white/10 px-1.5 py-0.5 rounded">🎲 {activeDiceValues[1]}</span>
              <span className="text-amber-400 font-black">=</span>
              <span className="text-black bg-gradient-to-r from-amber-400 to-yellow-300 px-2 py-0.5 rounded-xl font-mono font-black text-xs sm:text-base shadow">
                {activeRollValue} BƯỚC
              </span>
            </div>
          )}
        </>
      )}

      {/* Landing Event Splash Banner */}
      {landingBanner && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-40 px-5 py-2 rounded-2xl bg-gradient-to-r from-cyan-500 via-sky-500 to-emerald-400 text-black font-black text-center shadow-2xl border-2 border-white animate-bounce">
          <p className="text-sm font-black uppercase tracking-wide">{landingBanner.text}</p>
          {landingBanner.subtext && <p className="text-xs font-bold mt-0.5">{landingBanner.subtext}</p>}
        </div>
      )}

      {/* Ornate Board Header with Dice Dismiss/Recall Controls */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-2 border-b border-cyan-500/30 pb-2 mb-2 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-2xl bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center shadow-lg border border-cyan-300/50 text-base sm:text-lg font-black shrink-0">
            🎲
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className={`font-black ${isDisplay ? "text-lg sm:text-2xl" : "text-sm sm:text-base"} text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-sky-200 to-amber-300`}>
                Đường Đua Cờ Xí Ngầu Neon Circuit
              </h3>
              <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 text-[10px] font-black uppercase tracking-wider">
                {totalTiles} Ô
              </span>
            </div>
            <p className="text-[9px] sm:text-[11px] text-slate-300 flex items-center gap-1.5 flex-wrap mt-0.5">
              <span className="text-cyan-300 font-bold">Đổ 2 Xí Ngầu (2–12 bước)</span>
              <span>•</span>
              <span className="text-amber-300 font-bold">Điểm = Vị trí ô (Tối thiểu 1đ)</span>
              <span>•</span>
              <span className="text-cyan-400 font-bold">🚀 +2</span>
              <span>•</span>
              <span className="text-rose-400 font-bold">💥 -2</span>
              <span>•</span>
              <span className="text-blue-400 font-bold">🛡️ Khiên</span>
              <span>•</span>
              <span className="text-purple-400 font-bold">🔀 Vượt mặt</span>
              <span>•</span>
              <span className="text-emerald-400 font-bold">🎲 x2 Cơ hội</span>
            </p>
          </div>
        </div>

        {/* Dice Controller, Extra Roll Status & Recall Tray */}
        <div className="flex items-center gap-2">
          {/* Dice Recall / Dismiss Tray Widget */}
          {hasLandedDice && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-black/80 border border-amber-400/50 shadow-md">
              <span className="text-xs">🎲</span>
              <span className="font-mono font-black text-amber-300 text-xs">
                {activeRollValue} nút
              </span>
              {isDiceDismissed ? (
                <button
                  type="button"
                  onClick={() => setIsDiceDismissed(false)}
                  className="px-2 py-0.5 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 text-black font-black text-[10px] shadow transition flex items-center gap-1 active:scale-95 cursor-pointer"
                  title="Đưa xúc xắc trở lại vị trí trên bàn cờ"
                >
                  <span>↩</span>
                  <span>Xem lại</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsDiceDismissed(true)}
                  className="px-2 py-0.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-200 font-bold text-[10px] transition flex items-center gap-1 active:scale-95 cursor-pointer"
                  title="Đẩy xúc xắc ra ngoài bàn để không che các ô"
                >
                  <span>↗</span>
                  <span>Đẩy ra</span>
                </button>
              )}
            </div>
          )}

          {/* Turn Indicator */}
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
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/30 text-emerald-300 border border-emerald-400/50 text-[10px] font-black animate-pulse">
                  🎲 x2 Lượt gieo!
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
              className="px-3.5 py-2 rounded-xl font-black text-xs bg-gradient-to-r from-amber-400 via-orange-400 to-yellow-500 hover:from-amber-300 hover:to-orange-400 text-black shadow-lg shadow-amber-500/30 border border-yellow-200 active:scale-95 transition-all flex items-center gap-1.5 animate-bounce cursor-pointer"
            >
              <span>🎲</span>
              <span>{diceState.extraRollGranted ? "GIEO TIẾP LẦN 2!" : "TUNG XÚC XẮC!"}</span>
            </button>
          )}

          {mode === "mini" && (
            <button
              type="button"
              onClick={() => {
                if (onToggleView) onToggleView();
                else setForceFullInMini(false);
              }}
              className="text-xs px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 font-bold transition flex items-center gap-1 cursor-pointer"
              title="Thu gọn về thanh Mini"
            >
              <span>▲</span>
              <span>Thu gọn</span>
            </button>
          )}
        </div>
      </div>

      {/* ═════════════════════════════════════════════════════════════════════
          CONTINUOUS SERPENTINE RACETRACK CIRCUIT WITH Z-ROTATION
         ═════════════════════════════════════════════════════════════════════ */}
      <div className="relative w-full aspect-[16/9.8] sm:aspect-[16/9.2] max-h-[58vh] min-h-[300px] rounded-3xl bg-[#080b1a]/95 border border-cyan-500/30 overflow-hidden shadow-2xl p-2 sm:p-4 my-1 flex-1 flex items-center justify-center">
        {/* SVG Continuous Racetrack Bed Ribbon */}
        <svg
          viewBox="0 0 1000 600"
          className="absolute inset-0 w-full h-full pointer-events-none select-none z-0"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="cyberNeonGlow" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.5" />
              <stop offset="35%" stopColor="#3b82f6" stopOpacity="0.4" />
              <stop offset="70%" stopColor="#8b5cf6" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.6" />
            </linearGradient>
            <filter id="roadGlowFilter" x="-10%" y="-10%" width="120%" height="120%">
              <feGaussianBlur stdDeviation="12" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Ambient Glow */}
          <path
            d={getSerpentineSvgPath(totalTiles)}
            fill="none"
            stroke="url(#cyberNeonGlow)"
            strokeWidth={totalTiles >= 50 ? "62" : "92"}
            strokeLinecap="round"
            strokeLinejoin="round"
            filter="url(#roadGlowFilter)"
            opacity="0.6"
          />

          {/* Outer Guardrails / Neon Curb */}
          <path
            d={getSerpentineSvgPath(totalTiles)}
            fill="none"
            stroke="#06b6d4"
            strokeWidth={totalTiles >= 50 ? "52" : "78"}
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.3"
          />

          {/* Deep Asphalt Tarmac Roadbed */}
          <path
            d={getSerpentineSvgPath(totalTiles)}
            fill="none"
            stroke="#0b0e22"
            strokeWidth={totalTiles >= 50 ? "46" : "70"}
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Road Texture Core */}
          <path
            d={getSerpentineSvgPath(totalTiles)}
            fill="none"
            stroke="#141a3a"
            strokeWidth={totalTiles >= 50 ? "38" : "58"}
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.85"
          />

          {/* Glowing Dashed Centerline Track Marking */}
          <path
            d={getSerpentineSvgPath(totalTiles)}
            fill="none"
            stroke="#06b6d4"
            strokeWidth={totalTiles >= 50 ? "2.5" : "3.5"}
            strokeDasharray="14 14"
            strokeLinecap="round"
            opacity="0.7"
          />
        </svg>

        {/* Direction Chevrons along each Straight Row */}
        <div className="absolute inset-0 pointer-events-none select-none z-5">
          {Array.from({ length: totalTiles >= 80 ? 6 : totalTiles >= 50 ? 5 : 3 }).map((_, rIdx) => {
            const numR = totalTiles >= 80 ? 6 : totalTiles >= 50 ? 5 : 3;
            const yStart = numR === 6 ? 10.0 : 11.0;
            const yEnd = numR === 6 ? 90.0 : 89.0;
            const yRow = yStart + rIdx * ((yEnd - yStart) / (numR - 1));
            const isEven = rIdx % 2 === 0;
            return (
              <div
                key={rIdx}
                className="absolute text-cyan-400/35 text-[9px] sm:text-[11px] font-black -translate-y-1/2 flex items-center justify-between pointer-events-none"
                style={{ top: `${yRow}%`, left: "28%", right: "28%" }}
              >
                <span>{isEven ? "➤ ➤" : "◀ ◀"}</span>
                <span>{isEven ? "➤ ➤" : "◀ ◀"}</span>
              </div>
            );
          })}
        </div>

        {/* All Continuous Serpentine Tiles with Tangent Z-Rotation */}
        {tiles.map((tile) => {
          const geo = getSerpentineTileGeometry(tile.index, totalTiles);
          return renderSerpentineTile(tile, geo);
        })}
      </div>

      {/* ═════════════════════════════════════════════════════════════════════
          STANDINGS & PAWN TRACKER FOOTER (Score = Position + 1, Min 1 Pt)
         ═════════════════════════════════════════════════════════════════════ */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-1.5 sm:gap-2 border-t border-cyan-500/30 pt-2 sm:pt-2.5 mt-2 text-xs shrink-0">
        <div className="flex items-center gap-1.5 text-slate-200 font-bold uppercase text-[9px] sm:text-[11px]">
          <span>🏆</span>
          <span>Bảng xếp hạng vị trí & điểm số:</span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          {teams
            .sort((a, b) => {
              if (a.hasFinished && !b.hasFinished) return -1;
              if (!a.hasFinished && b.hasFinished) return 1;
              return b.position - a.position;
            })
            .map((team, idx) => {
              const pos = animPositions[team.teamId] ?? team.position;
              const points = pos + 1;
              return (
                <div
                  key={team.teamId}
                  className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-xl border text-xs transition ${
                    team.teamId === currentTurnTeamId
                      ? "bg-cyan-950/60 border-cyan-400 text-white font-bold ring-1 ring-cyan-400/60 shadow-[0_0_12px_rgba(6,182,212,0.4)]"
                      : "bg-black/60 border-white/10 text-slate-300"
                  }`}
                >
                  <span className="font-black text-amber-400 text-[10px] sm:text-[11px]">#{idx + 1}</span>
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm"
                    style={{ background: team.teamColor }}
                  />
                  <span className="truncate max-w-[75px] sm:max-w-[105px] font-semibold text-[10px] sm:text-[11px]">{team.teamName}</span>
                  <span className="font-mono font-black text-cyan-300 text-[10px] sm:text-[11px] ml-0.5">
                    {team.hasFinished ? `🏁 ĐÍCH (${totalTiles}đ)` : `Ô ${points} (${points}đ)`}
                  </span>
                  {team.hasShield && <span className="text-[10px]" title="Có khiên bảo vệ">🛡️</span>}
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
}
