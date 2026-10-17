"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { MagicWheelState, MagicWheelSector, TeamState } from "@/types";
import { VIETNAMESE_ALPHABET, normalizeVietnameseBaseLetter } from "@/lib/game-engine/magic-wheel";

interface Props {
  magicWheelState?: MagicWheelState;
  wheelState?: MagicWheelState;
  teams: TeamState[];
  myTeamId?: string;
  isHost?: boolean;
  isDisplay?: boolean;
  isMyTurn?: boolean;
  onSpin?: (power: number) => void;
  onGuessLetter?: (letter: string) => void;
  onSolvePuzzle?: (answer: string) => void;
  onMysteryDecide?: (openMystery: boolean) => void;
  onLuckyPick?: (index: number) => void;
  onAdvanceRound?: () => void;
  onOverrideTurn?: (teamId: string) => void;
}

export default function MagicWheelBoard({
  magicWheelState,
  wheelState,
  teams,
  myTeamId,
  isHost = false,
  isDisplay = false,
  isMyTurn,
  onSpin,
  onGuessLetter,
  onSolvePuzzle,
  onMysteryDecide,
  onLuckyPick,
  onAdvanceRound,
  onOverrideTurn,
}: Props) {
  const activeState = magicWheelState || wheelState;
  if (!activeState) return null;

  const {
    sectors,
    currentTurnTeamId,
    currentTurnTeamName,
    currentRound,
    maxRounds,
    currentPuzzle,
    isSpinning,
    targetRotationDegrees,
    selectedSector,
    guessedLetters,
    roundScores,
    phase,
    subMode,
    lastActionMessage,
    freeSpinCount,
  } = activeState;

  // Local state for interactive controls
  const [power, setPower] = useState<number>(65);
  const [solveModalOpen, setSolveModalOpen] = useState<boolean>(false);
  const [solveInput, setSolveInput] = useState<string>("");
  const effectiveIsMyTurn = isMyTurn !== undefined ? isMyTurn : Boolean(myTeamId && myTeamId === currentTurnTeamId);
  const canInteract = effectiveIsMyTurn || isHost;

  // Power bar animation for auto-oscillating effect
  const [oscillatingPower, setOscillatingPower] = useState<number>(50);
  useEffect(() => {
    if (phase !== "SPIN_WAITING" || isSpinning) return;
    let dir = 1;
    const interval = setInterval(() => {
      setOscillatingPower((prev) => {
        let next = prev + dir * 3;
        if (next >= 100) { next = 100; dir = -1; }
        if (next <= 10) { next = 10; dir = 1; }
        return next;
      });
    }, 40);
    return () => clearInterval(interval);
  }, [phase, isSpinning]);

  // Current turn team object
  const activeTeam = teams.find((t) => t.id === currentTurnTeamId);

  // ── Format 4-Row VTV3 Grid (14 columns per row) ───────────────────────────
  // Bố cục chuẩn như trên trường quay Chiếc nón kỳ diệu VTV3: 4 hàng x 14 cột
  const ROWS = 4;
  const COLS = 14;

  const gridMatrix = useMemo(() => {
    // Khởi tạo ma trận rỗng
    const matrix: Array<Array<{
      char: string;
      isLetter: boolean;
      isRevealed: boolean;
      originalIndex: number;
    } | null>> = Array.from({ length: ROWS }, () => Array(COLS).fill(null));

    if (!currentPuzzle || !currentPuzzle.secretPhrase) {
      return matrix;
    }

    const phrase = currentPuzzle.secretPhrase.toUpperCase();
    const words = phrase.split(" ");
    const revealed = new Set(currentPuzzle.revealedIndices || []);

    // Phân bổ các từ vào các dòng (ưu tiên dòng 2 và 3, căn giữa dòng)
    let currentWordIdx = 0;
    let charGlobalCounter = 0;

    // Tính toán cách chia từ vào các dòng
    const rowLines: Array<Array<{ word: string; startGlobalIdx: number }>> = [[], [], [], []];
    
    // Nếu phrase ngắn (dưới 12 ký tự), đặt ở dòng 1 hoặc dòng 2
    // Thuật toán gói từ (word wrap) vào 4 dòng
    let targetRow = 1; // Bắt đầu từ dòng 2 (index 1) cho đẹp như TV
    if (words.length <= 2 && phrase.length <= 10) {
      targetRow = 1;
    }

    for (const w of words) {
      const lineLen = rowLines[targetRow].reduce((acc, curr) => acc + curr.word.length + 1, 0);
      if (lineLen + w.length <= COLS) {
        rowLines[targetRow].push({ word: w, startGlobalIdx: charGlobalCounter });
      } else if (targetRow + 1 < ROWS) {
        targetRow++;
        rowLines[targetRow].push({ word: w, startGlobalIdx: charGlobalCounter });
      } else {
        // Tràn hàng, đẩy lên dòng 0 nếu còn chỗ
        rowLines[0].push({ word: w, startGlobalIdx: charGlobalCounter });
      }
      charGlobalCounter += w.length + 1; // +1 cho dấu cách
    }

    // Đặt các từ vào ma trận, căn giữa mỗi dòng
    rowLines.forEach((lineWords, rIdx) => {
      if (lineWords.length === 0) return;
      const totalCharsInLine = lineWords.reduce((acc, curr) => acc + curr.word.length, 0) + (lineWords.length - 1);
      let startCol = Math.max(0, Math.floor((COLS - totalCharsInLine) / 2));

      lineWords.forEach((item, wIdx) => {
        let originalIdx = item.startGlobalIdx;
        for (let c = 0; c < item.word.length; c++) {
          if (startCol < COLS) {
            const letter = item.word[c];
            matrix[rIdx][startCol] = {
              char: letter,
              isLetter: true,
              isRevealed: revealed.has(originalIdx + c),
              originalIndex: originalIdx + c,
            };
            startCol++;
          }
        }
        // Thêm dấu cách
        if (wIdx < lineWords.length - 1 && startCol < COLS) {
          startCol++;
        }
      });
    });

    return matrix;
  }, [currentPuzzle]);

  return (
    <div className={`w-full flex flex-col gap-4 ${isDisplay ? "p-3 sm:p-5" : "p-2 sm:p-4"} bg-gradient-to-b from-[#0a0f1d] via-[#10192e] to-[#070b14] text-white rounded-3xl border border-white/10 shadow-2xl overflow-hidden`}>
      {/* ── TOP HEADER: ROUND & TURN INFO ─────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-black/40 p-3 sm:p-4 rounded-2xl border border-white/10 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="p-2 sm:p-2.5 rounded-2xl bg-gradient-to-tr from-pink-500/30 to-purple-600/30 border border-pink-400/30 shadow-lg text-2xl sm:text-3xl">
            🎡
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-black text-lg sm:text-xl text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-pink-400 to-cyan-300">
                VÒNG QUAY TRI THỨC
              </h3>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider bg-pink-500/20 text-pink-300 border border-pink-500/40">
                {subMode === "WORD_PUZZLE" ? "Ô Chữ Kỳ Diệu" : "Quiz Vòng Quay"}
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium">
              Vòng {currentRound}/{maxRounds} · Chiếc nón kỳ diệu 24 ô chuẩn
            </p>
          </div>
        </div>

        {/* Current Turn Team Badge */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2.5 px-4 py-2 rounded-2xl bg-gradient-to-r from-amber-500/15 via-purple-500/15 to-cyan-500/15 border border-white/15 shadow">
            <span
              className="w-4 h-4 rounded-full shadow-md animate-pulse shrink-0"
              style={{ background: activeTeam?.color || "#ec4899" }}
            />
            <div className="text-left">
              <span className="block text-[10px] uppercase font-bold text-slate-400">Đang đến lượt</span>
              <span className="block text-sm sm:text-base font-black text-white truncate max-w-[150px]">
                {currentTurnTeamName || "Chưa có"}
              </span>
            </div>
          </div>

          {/* Host Admin fast turn override */}
          {isHost && onAdvanceRound && (
            <button
              type="button"
              onClick={onAdvanceRound}
              className="px-3 py-2 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 border border-white/20 transition cursor-pointer"
              title="Chuyển sang vòng tiếp theo"
            >
              ⏭️ Vòng sau
            </button>
          )}
        </div>
      </div>

      {/* ── THE ICONIC VTV3 PUZZLE BOARD GRID (4 ROWS x 14 COLS) ──────────── */}
      {subMode === "WORD_PUZZLE" && (
        <div className="w-full flex flex-col items-center bg-gradient-to-b from-[#0e2a14] via-[#091f0e] to-[#051408] p-3 sm:p-5 rounded-2xl border-4 border-[#1b4e22] shadow-[0_0_30px_rgba(22,101,52,0.3)]">
          {/* Header Category on Top of Board */}
          <div className="mb-3 px-4 py-1.5 rounded-full bg-black/60 border border-amber-400/40 text-amber-300 font-black text-xs sm:text-sm uppercase tracking-widest shadow">
            ⭐ CHỦ ĐỀ: {currentPuzzle?.category || "TỔNG HỢP"} ⭐
          </div>

          {/* Grid Container */}
          <div className="w-full max-w-4xl overflow-x-auto flex justify-center py-2">
            <div className="grid grid-rows-4 gap-1.5 sm:gap-2 p-2 sm:p-3 rounded-xl bg-[#030d05] border-2 border-[#166534]/50 shadow-inner">
              {gridMatrix.map((row, rIdx) => (
                <div key={rIdx} className="flex gap-1.5 sm:gap-2 justify-center">
                  {row.map((cell, cIdx) => {
                    // Cell unused (Decorative Green Floral Tile)
                    if (!cell) {
                      return (
                        <div
                          key={cIdx}
                          className="w-6 h-8 sm:w-10 sm:h-12 md:w-12 md:h-14 rounded-md bg-[#133817] border border-[#1e5824] flex items-center justify-center shadow-inner opacity-75"
                        >
                          <svg viewBox="0 0 24 24" className="w-3 h-3 sm:w-5 sm:h-5 text-[#2a7a33] opacity-60 fill-current">
                            <polygon points="12,2 15,9 22,9 17,14 19,21 12,17 5,21 7,14 2,9 9,9" />
                          </svg>
                        </div>
                      );
                    }

                    // Cell is active letter tile
                    return (
                      <div
                        key={cIdx}
                        onClick={() => {
                          if (phase === "LUCKY_PICK" && canInteract && !cell.isRevealed) {
                            onLuckyPick?.(cell.originalIndex);
                          }
                        }}
                        className={`w-6 h-8 sm:w-10 sm:h-12 md:w-12 md:h-14 rounded-md font-black flex items-center justify-center transition-all duration-500 select-none ${
                          cell.isRevealed
                            ? "bg-white text-[#0f172a] shadow-[0_4px_10px_rgba(255,255,255,0.4)] border-2 border-white scale-100"
                            : phase === "LUCKY_PICK"
                            ? "bg-amber-300 text-black border-2 border-yellow-400 animate-bounce cursor-pointer hover:scale-110"
                            : "bg-white/95 text-transparent border-2 border-slate-300 shadow-md"
                        }`}
                      >
                        <span className="text-sm sm:text-2xl md:text-3xl font-extrabold tracking-tight">
                          {cell.isRevealed ? cell.char : "?"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

          {/* Bottom Clue Bar (Dải băng phụ đề VTV3) */}
          <div className="w-full mt-3 p-3 rounded-xl bg-gradient-to-r from-red-950/80 via-black/90 to-red-950/80 border-y-2 border-red-500/60 shadow-lg flex items-center justify-center text-center">
            <p className="text-xs sm:text-sm md:text-base font-semibold text-slate-100 tracking-wide">
              {currentPuzzle?.clue || "Lắng nghe gợi ý từ người dẫn chương trình và đoán các chữ cái!"}
            </p>
          </div>
        </div>
      )}

      {/* ── WHEEL & INTERACTION SECTION ───────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
        {/* Left Col: 24-Sector SVG Wheel (5 cols on lg) */}
        <div className="lg:col-span-5 flex flex-col items-center justify-center relative p-2">
          {/* Top Pointer Needle */}
          <div className="absolute top-0 z-20 flex flex-col items-center pointer-events-none drop-shadow-[0_4px_8px_rgba(0,0,0,0.8)]">
            <div className="w-6 h-8 sm:w-8 sm:h-10 bg-gradient-to-b from-yellow-300 via-amber-400 to-red-600 clip-needle shadow-xl" />
          </div>

          {/* Spinning SVG Wheel */}
          <div className="w-[280px] h-[280px] sm:w-[340px] sm:h-[340px] relative transition-transform duration-[4500ms] ease-[cubic-bezier(0.15,0.9,0.25,1.0)] drop-shadow-[0_10px_25px_rgba(0,0,0,0.7)]"
            style={{ transform: `rotate(${targetRotationDegrees}deg)` }}
          >
            <svg viewBox="0 0 400 400" className="w-full h-full select-none">
              <defs>
                <filter id="mw_shadow" x="-10%" y="-10%" width="120%" height="120%">
                  <feDropShadow dx="0" dy="2" stdDeviation="2" floodOpacity="0.4" />
                </filter>
              </defs>

              {/* Outer Golden Rim */}
              <circle cx="200" cy="200" r="195" fill="#1e1b4b" stroke="#f59e0b" strokeWidth="8" />
              <circle cx="200" cy="200" r="188" fill="none" stroke="#fef08a" strokeWidth="2" strokeDasharray="6 4" />

              {/* 24 Sectors (15 deg each) */}
              {sectors.map((sec, idx) => {
                const anglePerSector = 360 / sectors.length; // 15 độ
                const startAngle = idx * anglePerSector - 90;
                const endAngle = (idx + 1) * anglePerSector - 90;
                const startRad = (startAngle * Math.PI) / 180;
                const endRad = (endAngle * Math.PI) / 180;

                const r = 186;
                const x1 = 200 + r * Math.cos(startRad);
                const y1 = 200 + r * Math.sin(startRad);
                const x2 = 200 + r * Math.cos(endRad);
                const y2 = 200 + r * Math.sin(endRad);

                const midAngle = startAngle + anglePerSector / 2;
                const midRad = (midAngle * Math.PI) / 180;
                const textR = 125;
                const tx = 200 + textR * Math.cos(midRad);
                const ty = 200 + textR * Math.sin(midRad);

                const pathData = `M 200 200 L ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2} Z`;

                return (
                  <g key={sec.id}>
                    <path
                      d={pathData}
                      fill={sec.color}
                      stroke="#ffffff"
                      strokeWidth="1.2"
                      strokeOpacity="0.4"
                    />
                    {/* Text rotated along radial line */}
                    <text
                      x={tx}
                      y={ty}
                      fill={sec.textColor || "#ffffff"}
                      fontSize={sec.label.length > 6 ? "9.5" : "13"}
                      fontWeight="900"
                      fontFamily="system-ui, -apple-system, sans-serif"
                      textAnchor="middle"
                      dominantBaseline="central"
                      transform={`rotate(${midAngle + 90}, ${tx}, ${ty})`}
                      filter="url(#mw_shadow)"
                    >
                      {sec.label}
                    </text>
                  </g>
                );
              })}

              {/* Center Hub */}
              <circle cx="200" cy="200" r="32" fill="#fbbf24" stroke="#78350f" strokeWidth="4" />
              <circle cx="200" cy="200" r="16" fill="#18181b" stroke="#ffffff" strokeWidth="2" />
              <text x="200" y="204" textAnchor="middle" fill="#fef08a" fontSize="14" fontWeight="black">⭐</text>
            </svg>
          </div>

          {/* Current Selected Sector Callout */}
          {selectedSector && phase !== "SPINNING" && (
            <div className="mt-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-amber-500/30 to-pink-500/30 border border-amber-400/50 text-amber-200 text-xs sm:text-sm font-black shadow animate-scale-up">
              🎯 Ô quay: {selectedSector.label}
            </div>
          )}
        </div>

        {/* Right Col: Interactive Controls & Letters Keyboard (7 cols on lg) */}
        <div className="lg:col-span-7 flex flex-col gap-3.5 bg-black/30 p-3 sm:p-5 rounded-2xl border border-white/10 backdrop-blur-md">
          {/* Action notification message */}
          {lastActionMessage && (
            <div className="p-3 rounded-xl bg-cyan-950/40 border border-cyan-500/40 text-cyan-200 text-xs sm:text-sm font-semibold flex items-center gap-2">
              <span>📢</span>
              <span>{lastActionMessage}</span>
            </div>
          )}

          {/* 1. Spin Control (When waiting to spin) */}
          {phase === "SPIN_WAITING" && (
            <div className="space-y-3 p-3.5 rounded-xl bg-gradient-to-r from-purple-950/40 via-indigo-950/30 to-purple-950/40 border border-purple-500/30">
              <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                <span className="flex items-center gap-1.5 text-amber-300">
                  <span>⚡</span> LỰC QUAY ĐỊNH MỆNH: {oscillatingPower}%
                </span>
                <span className="text-[11px] text-muted-foreground">Nhấn chốt lực để quay nón</span>
              </div>

              {/* Oscillating visual power bar */}
              <div className="w-full h-3.5 bg-slate-800 rounded-full overflow-hidden p-0.5 border border-white/20">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-amber-400 to-rose-500 transition-all duration-75 shadow-lg"
                  style={{ width: `${oscillatingPower}%` }}
                />
              </div>

              {canInteract ? (
                <button
                  type="button"
                  onClick={() => onSpin?.(oscillatingPower)}
                  disabled={isSpinning}
                  className="w-full py-3 sm:py-3.5 rounded-xl font-black text-sm sm:text-base text-white bg-gradient-to-r from-pink-600 via-purple-600 to-indigo-600 hover:brightness-110 active:scale-98 transition shadow-[0_0_20px_rgba(236,72,153,0.4)] cursor-pointer"
                >
                  ✦ CHỐT LỰC & QUAY NÓN ({oscillatingPower}%) ✦
                </button>
              ) : (
                <div className="text-center py-2 text-xs text-slate-400 italic">
                  Đang chờ Đội {currentTurnTeamName} bấm quay nón...
                </div>
              )}
            </div>
          )}

          {/* 2. Action Input: Vietnamese Alphabet Keyboard */}
          {subMode === "WORD_PUZZLE" && (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-slate-300">
                  Bàn phím 29 chữ cái tiếng Việt:
                </span>
                {canInteract && phase === "ACTION_INPUT" && (
                  <button
                    type="button"
                    onClick={() => setSolveModalOpen(true)}
                    className="px-3 py-1 rounded-xl text-xs font-black bg-gradient-to-r from-yellow-500 to-amber-600 hover:brightness-110 text-black shadow transition cursor-pointer"
                  >
                    🎯 GIẢI Ô CHỮ
                  </button>
                )}
              </div>

              {/* 29 Letters Grid */}
              <div className="grid grid-cols-7 sm:grid-cols-10 gap-1 sm:gap-1.5">
                {VIETNAMESE_ALPHABET.map((letter) => {
                  const isGuessed = guessedLetters.includes(letter);
                  const isCurrentTarget = canInteract && phase === "ACTION_INPUT" && !isGuessed && !isSpinning;

                  return (
                    <button
                      key={letter}
                      type="button"
                      disabled={!isCurrentTarget}
                      onClick={() => onGuessLetter?.(letter)}
                      className={`p-2 sm:p-2.5 rounded-lg font-black text-xs sm:text-sm transition-all select-none ${
                        isGuessed
                          ? "bg-white/5 text-slate-500 border border-white/5 opacity-50 cursor-not-allowed line-through"
                          : isCurrentTarget
                          ? "bg-gradient-to-b from-cyan-500/20 to-blue-600/30 hover:from-cyan-400/40 hover:to-blue-500/50 text-cyan-200 border border-cyan-400/40 shadow hover:scale-105 active:scale-95 cursor-pointer"
                          : "bg-white/5 text-slate-300 border border-white/10 opacity-70 cursor-not-allowed"
                      }`}
                    >
                      {letter}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* 3. Mystery Decision Choice (Ô Bí Mật Vòng 2) */}
          {phase === "MYSTERY_CHOICE" && (
            <div className="p-4 rounded-xl bg-gradient-to-r from-purple-950/70 via-indigo-950/70 to-purple-950/70 border-2 border-purple-500/50 shadow-xl space-y-3 animate-scale-up">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🔮</span>
                <div>
                  <h4 className="font-black text-sm text-purple-200">QUYẾT ĐỊNH Ô BÍ MẬT</h4>
                  <p className="text-[11px] text-slate-300">
                    Bạn đã đoán đúng chữ cái! Hãy chọn: Lật ô Bí Mật (50% Thưởng 3000đ, 50% Mất điểm) hoặc Từ chối để nhận 1000đ an toàn.
                  </p>
                </div>
              </div>

              {canInteract ? (
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => onMysteryDecide?.(true)}
                    className="py-2.5 px-3 rounded-xl font-black text-xs bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:brightness-110 shadow cursor-pointer active:scale-98 transition"
                  >
                    🎲 LẬT Ô BÍ MẬT ➔
                  </button>
                  <button
                    type="button"
                    onClick={() => onMysteryDecide?.(false)}
                    className="py-2.5 px-3 rounded-xl font-black text-xs bg-slate-700 hover:bg-slate-600 text-white shadow cursor-pointer active:scale-98 transition"
                  >
                    🛡️ TỪ CHỐI (+1000đ)
                  </button>
                </div>
              ) : (
                <div className="text-center text-xs text-slate-400 italic">
                  Đang đợi Đội {currentTurnTeamName} quyết định...
                </div>
              )}
            </div>
          )}

          {/* 4. Round Score Leaderboard Mini */}
          <div className="pt-2 border-t border-white/10">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
              Điểm tích luỹ vòng {currentRound}:
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {teams.map((t) => {
                const rScore = roundScores?.[t.id] || 0;
                const freeCount = freeSpinCount?.[t.id] || 0;
                const isTurn = t.id === currentTurnTeamId;

                return (
                  <div
                    key={t.id}
                    className={`p-2 rounded-xl flex items-center justify-between border transition ${
                      isTurn
                        ? "bg-amber-500/15 border-amber-400/50 shadow-[0_0_10px_rgba(245,158,11,0.2)]"
                        : "bg-white/5 border-white/10"
                    }`}
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: t.color || "#6366f1" }} />
                      <span className="text-xs font-bold text-white truncate">{t.name}</span>
                    </div>
                    <div className="flex items-center gap-1 text-right">
                      {freeCount > 0 && <span title="Thẻ thêm lượt" className="text-[10px]">🎟️{freeCount}</span>}
                      <span className="text-xs font-mono font-black text-amber-300">+{rScore}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ── MODAL: GIẢI Ô CHỮ BÍ MẬT ───────────────────────────────────────── */}
      {solveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md p-5 rounded-2xl bg-[#121829] border border-amber-400/50 shadow-2xl space-y-4">
            <div className="flex items-center gap-2 border-b border-white/10 pb-2">
              <span className="text-2xl">🎯</span>
              <div>
                <h4 className="font-black text-base text-amber-300">GIẢI Ô CHỮ BÍ MẬT</h4>
                <p className="text-[11px] text-slate-400">
                  Nhập chính xác toàn bộ cụm từ khóa (không phân biệt hoa thường).
                </p>
              </div>
            </div>

            <input
              type="text"
              value={solveInput}
              onChange={(e) => setSolveInput(e.target.value)}
              placeholder="Nhập cụm từ khóa..."
              className="w-full p-3 rounded-xl bg-black/50 border border-white/20 text-white font-bold text-sm focus:outline-none focus:border-amber-400 uppercase tracking-widest"
              autoFocus
            />

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => { setSolveModalOpen(false); setSolveInput(""); }}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 text-slate-300 transition cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={() => {
                  if (solveInput.trim()) {
                    onSolvePuzzle?.(solveInput.trim());
                    setSolveModalOpen(false);
                    setSolveInput("");
                  }
                }}
                className="px-5 py-2 rounded-xl text-xs font-black bg-gradient-to-r from-amber-400 to-yellow-500 hover:brightness-110 text-black shadow transition cursor-pointer"
              >
                CHỐT ĐÁP ÁN ➔
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom styles for needle clip-path */}
      <style jsx>{`
        .clip-needle {
          clip-path: polygon(50% 100%, 0 0, 100% 0);
        }
      `}</style>
    </div>
  );
}
