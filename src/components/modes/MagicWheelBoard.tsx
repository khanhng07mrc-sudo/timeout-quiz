"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { MagicWheelState, MagicWheelSector, TeamState } from "@/types";
import { VIETNAMESE_ALPHABET, normalizeVietnameseBaseLetter } from "@/lib/game-engine/magic-wheel";
import { soundManager } from "@/lib/sound-manager";

/**
 * 3-Phase Physics Speed Curve for 15s - 21s Authentic Spin:
 * - 0s to 3s: Smooth sinusoidal acceleration from 0 to V_max
 * - 3s to 10s: Constant MAXIMUM velocity V_max (FASTEST PHASE)
 * - 10s to T: Smooth cubic friction deceleration to 0 at T
 * Returns normalized progress in [0, 1].
 */
function evaluateThreePhaseWheelProgress(elapsedMs: number, totalDurationMs: number): number {
  if (elapsedMs <= 0) return 0;
  if (elapsedMs >= totalDurationMs) return 1;

  const t = elapsedMs / 1000;
  const T = Math.max(14, totalDurationMs / 1000);
  const t1 = 3.0; // Acceleration ends at 3s
  const t2 = Math.min(10.0, T - 2.5); // Cruise ends at 10s

  const D1 = 0.5 * t1; // 1.5 * V_max
  const D2 = t2 - t1; // 7.0 * V_max
  const D3 = (T - t2) / 3; // (T - 10) / 3 * V_max
  const D_total = D1 + D2 + D3;

  if (t < t1) {
    const d = 0.5 * (t - (t1 / Math.PI) * Math.sin((Math.PI * t) / t1));
    return Math.max(0, Math.min(1, d / D_total));
  } else if (t < t2) {
    const d = D1 + (t - t1);
    return Math.max(0, Math.min(1, d / D_total));
  } else {
    const u = (t - t2) / (T - t2);
    const uClamped = Math.max(0, Math.min(1, u));
    const dDecel = ((T - t2) * (1 - Math.pow(1 - uClamped, 3))) / 3;
    const d = D1 + D2 + dDecel;
    return Math.max(0, Math.min(1, d / D_total));
  }
}

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
  onSelectRewardCard?: (cardType: "POINTS_1500" | "FREE_SPIN" | "SHIELD") => void;
  onTradeDecide?: (trade: boolean, boxIndex?: number) => void;
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
  onSelectRewardCard,
  onTradeDecide,
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
  const [solveModalOpen, setSolveModalOpen] = useState<boolean>(false);
  const [solveInput, setSolveInput] = useState<string>("");
  const effectiveIsMyTurn = isMyTurn !== undefined ? isMyTurn : Boolean(myTeamId && myTeamId === currentTurnTeamId);
  const canInteract = effectiveIsMyTurn || isHost;

  // Power bar animation for auto-oscillating effect
  const [oscillatingPower, setOscillatingPower] = useState<number>(65);
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

  // ── 3D Wheel Physics & DOM Refs (Tarot Wheel Architecture) ───────────────
  const wheelRef = useRef<HTMLDivElement>(null);
  const needleRef = useRef<HTMLDivElement>(null);
  const wheelPrevAngleRef = useRef<number>(0);
  const lastSnapTimeRef = useRef<number>(0);
  const [clientWheelAngle, setClientWheelAngle] = useState<number>(0);
  const [isWheelZoomedIn, setIsWheelZoomedIn] = useState<boolean>(false);
  const [wheelZoomDurationMs, setWheelZoomDurationMs] = useState<number>(7000);

  // ── TV Board Staged Appearance Sequence ───────────────────────────────────
  // STAGES: "EMPTY_56" (chỉ 56 ô rỗng) -> "BLANK_PHRASE" (lật ô trắng rỗng) -> "READY_CLUE" (hiện chủ đề & gợi ý)
  const [boardStage, setBoardStage] = useState<"EMPTY_56" | "BLANK_PHRASE" | "READY_CLUE">("EMPTY_56");
  const prevRoundForStage = useRef<number>(currentRound || 1);

  useEffect(() => {
    // Khi bắt đầu vòng mới: khởi động quy trình mở màn
    setBoardStage("EMPTY_56");
    const t1 = setTimeout(() => {
      setBoardStage("BLANK_PHRASE");
      soundManager.playMagicWheelBoardOpen();
    }, 1200);

    const t2 = setTimeout(() => {
      setBoardStage("READY_CLUE");
    }, 2800);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [currentRound]);

  // ── Sequential Letter Highlighting Pipeline (Left-to-Right, Top-to-Bottom) ─
  const [highlightedIndices, setHighlightedIndices] = useState<Set<number>>(new Set());
  const [animRevealedIndices, setAnimRevealedIndices] = useState<Set<number>>(
    new Set(currentPuzzle?.revealedIndices || [])
  );
  const prevServerRevealed = useRef<number[]>(currentPuzzle?.revealedIndices || []);

  useEffect(() => {
    const serverRevealed = currentPuzzle?.revealedIndices || [];
    const newLetters = serverRevealed.filter((idx) => !prevServerRevealed.current.includes(idx));
    prevServerRevealed.current = serverRevealed;

    if (newLetters.length === 0) {
      setAnimRevealedIndices(new Set(serverRevealed));
      return;
    }

    // Nếu có chữ cái mới mở: Chạy quy trình Highlight tuần tự rồi mới lật mở
    // 1. Tìm toạ độ ma trận (col, row) của từng ô để sắp xếp đúng thứ tự: Trái sang Phải, Trên xuống Dưới
    // Tạo map index -> { col, row }
    const phrase = (currentPuzzle?.secretPhrase || "").toUpperCase();
    const words = phrase.split(" ");
    const rowLines: Array<Array<{ word: string; startGlobalIdx: number }>> = [[], [], [], []];
    let targetRow = 1;
    let charGlobalCounter = 0;
    for (const w of words) {
      const lineLen = rowLines[targetRow].reduce((acc, curr) => acc + curr.word.length + 1, 0);
      if (lineLen + w.length <= 14) {
        rowLines[targetRow].push({ word: w, startGlobalIdx: charGlobalCounter });
      } else if (targetRow + 1 < 4) {
        targetRow++;
        rowLines[targetRow].push({ word: w, startGlobalIdx: charGlobalCounter });
      } else {
        rowLines[0].push({ word: w, startGlobalIdx: charGlobalCounter });
      }
      charGlobalCounter += w.length + 1;
    }

    const cellPositions: Record<number, { col: number; row: number }> = {};
    rowLines.forEach((lineWords, rIdx) => {
      if (lineWords.length === 0) return;
      const totalCharsInLine = lineWords.reduce((acc, curr) => acc + curr.word.length, 0) + (lineWords.length - 1);
      let startCol = Math.max(0, Math.floor((14 - totalCharsInLine) / 2));
      lineWords.forEach((item, wIdx) => {
        let originalIdx = item.startGlobalIdx;
        for (let c = 0; c < item.word.length; c++) {
          if (startCol < 14) {
            cellPositions[originalIdx + c] = { col: startCol, row: rIdx };
            startCol++;
          }
        }
        if (wIdx < lineWords.length - 1 && startCol < 14) {
          startCol++;
        }
      });
    });

    // Sắp xếp các ô mới: col tăng dần (trái -> phải), nếu trùng col thì row tăng dần (trên -> dưới)
    const sortedNewIndices = [...newLetters].sort((a, b) => {
      const posA = cellPositions[a] || { col: 0, row: 0 };
      const posB = cellPositions[b] || { col: 0, row: 0 };
      if (posA.col !== posB.col) return posA.col - posB.col;
      return posA.row - posB.row;
    });

    let currentStep = 0;
    const highlightDelay = 420; // 420ms mỗi nhịp highlight

    const highlightInterval = setInterval(() => {
      if (currentStep < sortedNewIndices.length) {
        const idxToHighlight = sortedNewIndices[currentStep];
        setHighlightedIndices((prev) => new Set([...prev, idxToHighlight]));
        soundManager.playMagicWheelMark();
        currentStep++;
      } else {
        // Highlight đã hoàn thành toàn bộ ô! Giờ lật mở từng chữ cái
        clearInterval(highlightInterval);

        let revealStep = 0;
        const revealInterval = setInterval(() => {
          if (revealStep < sortedNewIndices.length) {
            const idxToReveal = sortedNewIndices[revealStep];
            setHighlightedIndices((prev) => {
              const next = new Set(prev);
              next.delete(idxToReveal);
              return next;
            });
            setAnimRevealedIndices((prev) => new Set([...prev, idxToReveal]));
            soundManager.playMagicWheelLetterReveal();
            revealStep++;
          } else {
            clearInterval(revealInterval);
          }
        }, 360);
      }
    }, highlightDelay);

    return () => clearInterval(highlightInterval);
  }, [currentPuzzle?.revealedIndices, currentPuzzle?.secretPhrase]);

  // ── Audio Engine Hooks ───────────────────────────────────────────────────
  const prevIsSpinning = useRef<boolean>(false);
  const prevWrongCount = useRef<number>(0);
  const prevPhase = useRef<string>(phase || "SPIN_WAITING");

  // Spin audio & Result sound effects
  useEffect(() => {
    if (isSpinning && !prevIsSpinning.current) {
      soundManager.playMagicWheelSpin();
    } else if (!isSpinning && prevIsSpinning.current) {
      soundManager.stopMagicWheelSpin();
      if (selectedSector) {
        if (selectedSector.type === "DOUBLE") {
          soundManager.playMagicWheelDouble();
        } else if (selectedSector.type === "HALF") {
          soundManager.playMagicWheelHalve();
        } else if (selectedSector.type === "BANKRUPT") {
          soundManager.playMagicWheelBankrupt();
        } else if (selectedSector.type === "LOSE_TURN") {
          soundManager.playMagicWheelLoseTurn();
        } else if (selectedSector.type === "LUCKY" || selectedSector.type === "EXTRA_TURN") {
          soundManager.playMagicWheelLucky();
        } else if (selectedSector.type === "PRIZE") {
          soundManager.playMagicWheelReward();
        } else if (selectedSector.type === "MYSTERY") {
          soundManager.playMagicWheelMystery();
        } else {
          soundManager.playWheelStopChime();
        }
      }
    }
    prevIsSpinning.current = Boolean(isSpinning);
  }, [isSpinning, selectedSector]);

  // Wrong guess audio
  const totalWrongGuesses = Object.values(activeState.wrongGuessesCount || {}).reduce((a, b) => a + b, 0);
  useEffect(() => {
    if (totalWrongGuesses > prevWrongCount.current) {
      soundManager.playMagicWheelWrong();
    }
    prevWrongCount.current = totalWrongGuesses;
  }, [totalWrongGuesses]);

  // Phase music / effects
  useEffect(() => {
    if (prevPhase.current === "ACTION_INPUT" && (phase as string) !== "ACTION_INPUT") {
      soundManager.stopMagicWheelThinking();
    }

    if (phase === "ROUND_RECAP") {
      soundManager.playMagicWheelSolveWin();
    } else if (phase === "ACTION_INPUT") {
      soundManager.playMagicWheelThinking();
    } else if (phase === "TRADE_CHOICE") {
      soundManager.playMagicWheelTrade();
    }
    prevPhase.current = phase;
  }, [phase]);

  // ── 3D Wheel Animation Loop (RequestAnimationFrame) ──────────────────────
  useEffect(() => {
    const target = targetRotationDegrees;
    if (target === undefined || target === null) {
      wheelPrevAngleRef.current = 0;
      setClientWheelAngle(0);
      lastSnapTimeRef.current = 0;
      if (wheelRef.current) wheelRef.current.style.transform = "rotate(0deg)";
      if (needleRef.current) needleRef.current.style.transform = "rotate(0deg) scale(1.06) translateZ(0)";
      soundManager.stopWheelSpinMusic(150);
      return;
    }

    const startAngle = wheelPrevAngleRef.current;
    if (!isSpinning || target <= startAngle) {
      wheelPrevAngleRef.current = target;
      setClientWheelAngle(target);
      if (wheelRef.current) wheelRef.current.style.transform = `rotate(${target}deg)`;
      setIsWheelZoomedIn(false);
      setWheelZoomDurationMs(800);
      lastSnapTimeRef.current = 0;
      if (needleRef.current) needleRef.current.style.transform = "rotate(0deg) scale(1.06) translateZ(0)";
      return;
    }

    // Spin duration 15s - 21s
    const durationMs = 15000 + Math.round(((activeState.spinPower || 65) / 100) * 6000);
    const segAngle = 360 / (sectors.length || 24); // 15 độ
    const totalDelta = target - startAngle;
    const startTime = performance.now();
    let lastPegIndex = Math.floor(startAngle / segAngle);
    let rafId = 0;
    let zoomStartTimer: ReturnType<typeof setTimeout> | null = null;

    // 1. Khởi tạo kim thẳng đứng và bánh xe ở góc startAngle
    lastSnapTimeRef.current = 0;
    if (wheelRef.current) wheelRef.current.style.transform = `rotate(${startAngle}deg)`;
    if (needleRef.current) needleRef.current.style.transform = "rotate(0deg) scale(1.06) translateZ(0)";

    // Tiếng gõ chốt khởi động
    soundManager.playWheelPegTick(0.05);

    // 2. Dynamic Camera Zoom Rig (Phóng to 1.35x cận cảnh kim 12h kịch tính từ 3s -> 10s)
    setIsWheelZoomedIn(false);
    setWheelZoomDurationMs(7000);
    zoomStartTimer = setTimeout(() => {
      setIsWheelZoomedIn(true);
      setWheelZoomDurationMs(7000);
    }, 3000);

    // 3. RequestAnimationFrame loop driving the exact 3-phase physics curve & Hooke's Law needle physics
    const step = (now: number) => {
      const elapsed = now - startTime;
      const rawProgress = Math.min(1, Math.max(0, elapsed / durationMs));
      const threePhaseProgress = evaluateThreePhaseWheelProgress(elapsed, durationMs);
      const currentLiveAngle = startAngle + totalDelta * threePhaseProgress;

      if (wheelRef.current) {
        wheelRef.current.style.transform = `rotate(${currentLiveAngle}deg)`;
      }

      // Kiểm tra chốt đi qua kim
      const currentPegIndex = Math.floor(currentLiveAngle / segAngle);
      if (currentPegIndex > lastPegIndex) {
        lastPegIndex = currentPegIndex;
        lastSnapTimeRef.current = now;
        soundManager.playWheelPegTick(rawProgress);
      }

      // Vật lý Kim Flipper chân thật chuẩn cơ khí VTV3
      let needleAngle = 0;
      if (elapsed < 60) {
        needleAngle = 0;
      } else {
        const pegDistToSnap = segAngle - (currentLiveAngle % segAngle);
        const contactWindow = 3.6;

        if (pegDistToSnap <= contactWindow) {
          const contactProgress = 1.0 - (pegDistToSnap / contactWindow);
          needleAngle = -22.0 * Math.pow(contactProgress, 1.15);
        } else if (lastSnapTimeRef.current > 0) {
          const dt = (now - lastSnapTimeRef.current) / 1000;
          if (dt < 0.085) {
            needleAngle = 14.0 * Math.exp(-32.0 * dt) * Math.cos(50.0 * dt);
          } else {
            needleAngle = 0;
          }
        } else {
          needleAngle = 0;
        }
      }

      if (needleRef.current) {
        needleRef.current.style.transform = `rotate(${needleAngle}deg) scale(1.06) translateZ(0)`;
      }

      if (rawProgress < 1) {
        rafId = requestAnimationFrame(step);
      } else {
        if (wheelRef.current) {
          wheelRef.current.style.transform = `rotate(${target}deg)`;
        }
        setClientWheelAngle(target);
        wheelPrevAngleRef.current = target;
        if (needleRef.current) {
          needleRef.current.style.transform = "rotate(0deg) scale(1.06) translateZ(0)";
        }
      }
    };

    rafId = requestAnimationFrame(step);

    return () => {
      cancelAnimationFrame(rafId);
      if (zoomStartTimer) clearTimeout(zoomStartTimer);
    };
  }, [isSpinning, targetRotationDegrees, activeState.spinPower, sectors.length]);

  // Current turn team object
  const activeTeam = teams.find((t) => t.id === currentTurnTeamId);

  // Rule Vòng 3 check: Cấm đoán cả ô chữ
  const secretLettersOnly = (currentPuzzle?.secretPhrase || "").replace(/[^a-zA-Zà-ỹÀ-Ỹ]/g, "");
  const remainingHiddenLetters = Math.max(0, secretLettersOnly.length - (currentPuzzle?.revealedIndices?.length || 0));
  const isSolveForbiddenInRound3 =
    currentRound === 3 &&
    (activeState.round3ForbiddenSolveTeams || []).includes(currentTurnTeamId) &&
    remainingHiddenLetters > 0;

  // ── Format 4-Row VTV3 Grid (14 columns per row) ───────────────────────────
  const ROWS = 4;
  const COLS = 14;

  const gridMatrix = useMemo(() => {
    const matrix: Array<Array<{
      char: string;
      isLetter: boolean;
      isRevealed: boolean;
      isHighlighted: boolean;
      originalIndex: number;
    } | null>> = Array.from({ length: ROWS }, () => Array(COLS).fill(null));

    if (!currentPuzzle || !currentPuzzle.secretPhrase) {
      return matrix;
    }

    const phrase = currentPuzzle.secretPhrase.toUpperCase();
    const words = phrase.split(" ");

    let charGlobalCounter = 0;
    const rowLines: Array<Array<{ word: string; startGlobalIdx: number }>> = [[], [], [], []];
    let targetRow = 1;

    for (const w of words) {
      const lineLen = rowLines[targetRow].reduce((acc, curr) => acc + curr.word.length + 1, 0);
      if (lineLen + w.length <= COLS) {
        rowLines[targetRow].push({ word: w, startGlobalIdx: charGlobalCounter });
      } else if (targetRow + 1 < ROWS) {
        targetRow++;
        rowLines[targetRow].push({ word: w, startGlobalIdx: charGlobalCounter });
      } else {
        rowLines[0].push({ word: w, startGlobalIdx: charGlobalCounter });
      }
      charGlobalCounter += w.length + 1;
    }

    rowLines.forEach((lineWords, rIdx) => {
      if (lineWords.length === 0) return;
      const totalCharsInLine = lineWords.reduce((acc, curr) => acc + curr.word.length, 0) + (lineWords.length - 1);
      let startCol = Math.max(0, Math.floor((COLS - totalCharsInLine) / 2));

      lineWords.forEach((item, wIdx) => {
        let originalIdx = item.startGlobalIdx;
        for (let c = 0; c < item.word.length; c++) {
          if (startCol < COLS) {
            const letter = item.word[c];
            const origIdx = originalIdx + c;
            matrix[rIdx][startCol] = {
              char: letter,
              isLetter: true,
              isRevealed: animRevealedIndices.has(origIdx),
              isHighlighted: highlightedIndices.has(origIdx),
              originalIndex: origIdx,
            };
            startCol++;
          }
        }
        if (wIdx < lineWords.length - 1 && startCol < COLS) {
          startCol++;
        }
      });
    });

    return matrix;
  }, [currentPuzzle, animRevealedIndices, highlightedIndices]);

  // Virtual MC Comment & Expression
  const mcReaction = useMemo(() => {
    if (phase === "SPINNING") {
      return { emotion: "😲", text: "Nón đang quay với lực rất tốt! Chờ xem mũi tên dừng ở ô nào..." };
    }
    if (selectedSector?.type === "BANKRUPT") {
      return { emotion: "😱", text: "Ôi không! Rất tiếc, nón đã dừng trúng ô MẤT ĐIỂM!" };
    }
    if (selectedSector?.type === "LOSE_TURN") {
      return { emotion: "😥", text: "Rất tiếc! Nón dừng trúng ô MẤT LƯỢT, quyền quay chuyển sang đội kế tiếp." };
    }
    if (selectedSector?.type === "LUCKY" || selectedSector?.type === "EXTRA_TURN") {
      return { emotion: "✨", text: "Tuyệt vời! Chúc mừng đội bạn đã quay vào ô MAY MẮN / THÊM LƯỢT!" };
    }
    if (selectedSector?.type === "PRIZE") {
      return { emotion: "🎁", text: "Chúc mừng! Ô Phần Thưởng mở ra 3 thẻ chức năng chiến thuật đặc biệt!" };
    }
    if (selectedSector?.type === "MYSTERY") {
      return { emotion: "🔮", text: "Ô Bí Mật! Bạn sẽ lật mở hay an toàn nhận điểm?" };
    }
    if (phase === "ACTION_INPUT") {
      return { emotion: "🤔", text: `Đội ${currentTurnTeamName || "bạn"}, xin mời đoán một chữ cái tiếng Việt!` };
    }
    if (phase === "ROUND_RECAP") {
      return { emotion: "🎉", text: "Chúc mừng ô chữ đã được giải mã thành công! Trận đấu quá xuất sắc!" };
    }
    return { emotion: "🎙️", text: lastActionMessage || `Chào mừng đến với Chiếc nón kỳ diệu VTV3! Vòng ${currentRound}.` };
  }, [phase, selectedSector, currentTurnTeamName, lastActionMessage, currentRound]);

  return (
    <div className={`w-full flex flex-col gap-3.5 ${isDisplay ? "p-3 sm:p-5" : "p-2 sm:p-3"} bg-gradient-to-b from-[#0a0f1d] via-[#10192e] to-[#070b14] text-white rounded-3xl border border-white/10 shadow-2xl overflow-hidden`}>
      {/* ── TOP HEADER: ROUND & TURN INFO ─────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 bg-black/40 px-3.5 py-2.5 rounded-2xl border border-white/10 backdrop-blur-md">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-gradient-to-tr from-pink-500/30 to-purple-600/30 border border-pink-400/30 shadow-lg text-xl sm:text-2xl">
            🎡
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-black text-base sm:text-lg text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-pink-400 to-cyan-300">
                CHIẾC NÓN KỲ DIỆU VTV3
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-pink-500/20 text-pink-300 border border-pink-500/40">
                {subMode === "WORD_PUZZLE" ? "Ô Chữ Huyền Thoại" : "Quiz Vòng Quay"}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium">
              Vòng {currentRound}/{maxRounds} · 24 ô chuẩn VTV3 2013–2016 · 15s–21s
            </p>
          </div>
        </div>

        {/* Current Turn Team Badge */}
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500/15 via-purple-500/15 to-cyan-500/15 border border-white/15 shadow">
            <span
              className="w-3.5 h-3.5 rounded-full shadow-md animate-pulse shrink-0"
              style={{ background: activeTeam?.color || "#ec4899" }}
            />
            <div className="text-left">
              <span className="block text-[9px] uppercase font-bold text-slate-400">Đang đến lượt</span>
              <span className="block text-xs sm:text-sm font-black text-white truncate max-w-[130px]">
                {currentTurnTeamName || "Chưa có"}
              </span>
            </div>
          </div>

          {/* Host Fast Turn Override */}
          {isHost && onAdvanceRound && (
            <button
              type="button"
              onClick={onAdvanceRound}
              className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 border border-white/20 transition cursor-pointer"
              title="Chuyển sang vòng tiếp theo"
            >
              ⏭️ Vòng sau
            </button>
          )}
        </div>
      </div>

      {/* ── THE ICONIC VTV3 PUZZLE BOARD GRID (4 ROWS x 14 COLS = 56 TILES) ─ */}
      {subMode === "WORD_PUZZLE" && (
        <div className="w-full flex flex-col items-center bg-gradient-to-b from-[#0e2a14] via-[#091f0e] to-[#051408] p-2.5 sm:p-4 rounded-2xl border-4 border-[#1b4e22] shadow-[0_0_30px_rgba(22,101,52,0.3)]">
          {/* Header Category on Top of Board (Animate in when READY_CLUE) */}
          <div className="mb-2 px-3.5 py-1 rounded-full bg-black/60 border border-amber-400/40 text-amber-300 font-black text-xs sm:text-sm uppercase tracking-widest shadow transition-all duration-500">
            {boardStage === "READY_CLUE"
              ? `⭐ CHỦ ĐỀ: ${currentPuzzle?.category || "TỔNG HỢP"} ⭐`
              : "⭐ CHIẾC NÓN KỲ DIỆU ⭐"}
          </div>

          {/* Grid Container (Responsive 14 columns, no overflow) */}
          <div className="w-full max-w-4xl flex justify-center py-1 px-1">
            <div className="w-full grid grid-rows-4 gap-1 sm:gap-1.5 md:gap-2 p-1.5 sm:p-2 rounded-xl bg-[#030d05] border-2 border-[#166534]/50 shadow-inner">
              {gridMatrix.map((row, rIdx) => (
                <div key={rIdx} className="grid grid-cols-[repeat(14,minmax(0,1fr))] gap-1 sm:gap-1.5 md:gap-2 w-full items-center justify-items-center">
                  {row.map((cell, cIdx) => {
                    // Cell unused (Decorative Green Floral Tile)
                    if (!cell || boardStage === "EMPTY_56") {
                      return (
                        <div
                          key={cIdx}
                          className="w-full aspect-[3/4] max-h-[42px] sm:max-h-[46px] rounded bg-[#133817] border border-[#1e5824] flex items-center justify-center shadow-inner opacity-75"
                        >
                          <svg viewBox="0 0 24 24" className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 text-[#2a7a33] opacity-60 fill-current">
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
                        className={`w-full aspect-[3/4] max-h-[42px] sm:max-h-[46px] rounded font-black flex items-center justify-center transition-all duration-300 select-none ${
                          cell.isHighlighted
                            ? "bg-gradient-to-tr from-amber-400 via-yellow-300 to-amber-200 text-amber-950 border-2 border-yellow-200 scale-105 shadow-[0_0_20px_#f59e0b] animate-bounce"
                            : cell.isRevealed
                            ? "bg-white text-[#0f172a] shadow-[0_4px_10px_rgba(255,255,255,0.4)] border-2 border-white scale-100"
                            : phase === "LUCKY_PICK"
                            ? "bg-gradient-to-br from-amber-300 via-yellow-300 to-amber-400 text-amber-950 border-2 border-yellow-200 animate-pulse shadow-[0_0_20px_#f59e0b] cursor-pointer hover:scale-110"
                            : "bg-white/95 text-transparent border-2 border-slate-300 shadow-md"
                        }`}
                      >
                        <span className="text-xs sm:text-base md:text-xl font-extrabold tracking-tight">
                          {cell.isRevealed
                            ? cell.char
                            : cell.isHighlighted
                            ? "⭐"
                            : phase === "LUCKY_PICK"
                            ? "⭐"
                            : "?"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

          {/* Bottom Clue Bar (Dải băng phụ đề VTV3 - hiện khi READY_CLUE) */}
          <div className="w-full mt-2.5 p-2.5 rounded-xl bg-gradient-to-r from-red-950/80 via-black/90 to-red-950/80 border-y-2 border-red-500/60 shadow-lg flex items-center justify-center text-center">
            <p className="text-xs sm:text-sm font-semibold text-slate-100 tracking-wide">
              {boardStage === "READY_CLUE"
                ? (currentPuzzle?.clue || "Lắng nghe gợi ý từ người dẫn chương trình và đoán các chữ cái!")
                : "Bảng ô chữ đang chuẩn bị..."}
            </p>
          </div>
        </div>
      )}

      {/* ── WHEEL & STUDIO CONTROL SECTION ─────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-start">
        {/* Left Col: 3D Wheel Rig (5 cols on lg) */}
        <div className="lg:col-span-5 flex flex-col items-center justify-center relative p-2 bg-black/25 rounded-2xl border border-white/5">
          {/* Wheel Frame Container with Camera Zoom Rig */}
          <div
            className="w-[280px] h-[280px] sm:w-[330px] sm:h-[330px] relative transition-transform"
            style={{
              transform: isWheelZoomedIn ? "scale(1.32) translateY(28px)" : "scale(1.0) translateY(0)",
              transitionDuration: `${wheelZoomDurationMs}ms`,
              transitionTimingFunction: "cubic-bezier(0.25, 1, 0.5, 1)",
            }}
          >
            {/* Top 3D Chrome & Ruby Flipper Pointer at 12 o'clock */}
            <div
              ref={needleRef}
              className="absolute -top-3 left-1/2 -translate-x-1/2 z-30 w-9 h-11 pointer-events-none origin-[50%_25%]"
              style={{
                filter: "drop-shadow(0px 4px 8px rgba(0,0,0,0.85))",
                willChange: "transform",
              }}
            >
              <svg viewBox="0 0 44 48" className="w-full h-full">
                <defs>
                  <linearGradient id="mwChromeNeedleGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#ffffff" />
                    <stop offset="30%" stopColor="#e2e8f0" />
                    <stop offset="60%" stopColor="#94a3b8" />
                    <stop offset="100%" stopColor="#334155" />
                  </linearGradient>
                  <linearGradient id="mwNeedleFacetLeft" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#fef08a" />
                    <stop offset="50%" stopColor="#f59e0b" />
                    <stop offset="100%" stopColor="#d97706" />
                  </linearGradient>
                  <linearGradient id="mwNeedleFacetRight" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#d97706" />
                    <stop offset="60%" stopColor="#b45309" />
                    <stop offset="100%" stopColor="#78350f" />
                  </linearGradient>
                </defs>
                {/* Left Beveled Facet */}
                <path d="M22 45 L11 8 Q22 13 22 8 Z" fill="url(#mwNeedleFacetLeft)" stroke="#fef08a" strokeWidth="1.2" strokeLinejoin="round" />
                {/* Right Beveled Facet */}
                <path d="M22 45 L33 8 Q22 13 22 8 Z" fill="url(#mwNeedleFacetRight)" stroke="#b45309" strokeWidth="1.2" strokeLinejoin="round" />
                {/* Chrome Spine Rib */}
                <path d="M22 44 L22 10" stroke="url(#mwChromeNeedleGrad)" strokeWidth="2.8" strokeLinecap="round" />
                {/* Pivot Bolt */}
                <circle cx="22" cy="11" r="5.5" fill="#0f172a" stroke="#fef08a" strokeWidth="1.8" />
                <circle cx="22" cy="11" r="3.6" fill="url(#mwChromeNeedleGrad)" />
                <circle cx="20.6" cy="9.6" r="1.2" fill="#ffffff" />
              </svg>
            </div>

            {/* Outer Gold Rim Frame */}
            <div className="absolute inset-0 aspect-square rounded-full border-[10px] border-[#d97706] shadow-[0_16px_40px_rgba(0,0,0,0.9),0_0_35px_rgba(245,158,11,0.45),inset_0_2px_4px_rgba(254,240,138,0.9)] pointer-events-none z-20">
              <div className="w-full h-full rounded-full border border-amber-950/70" />
            </div>

            {/* Spinning Wheel Body */}
            <div
              ref={wheelRef}
              className="w-full h-full aspect-square rounded-full overflow-hidden shadow-2xl relative"
              style={{ transform: `rotate(${clientWheelAngle}deg)` }}
            >
              <svg viewBox="0 0 400 400" className="w-full h-full select-none">
                <defs>
                  <filter id="mw_text_shadow" x="-15%" y="-15%" width="130%" height="130%">
                    <feDropShadow dx="0" dy="1.5" stdDeviation="1.5" floodColor="#000000" floodOpacity="0.8" />
                  </filter>
                  <radialGradient id="mwHubGrad" cx="45%" cy="40%" r="55%">
                    <stop offset="0%" stopColor="#fbbf24" />
                    <stop offset="50%" stopColor="#d97706" />
                    <stop offset="100%" stopColor="#78350f" />
                  </radialGradient>
                </defs>

                {/* Outer Ring */}
                <circle cx="200" cy="200" r="195" fill="#1e1b4b" stroke="#f59e0b" strokeWidth="6" />

                {/* 24 Sectors (15 deg each) */}
                {sectors.map((sec, idx) => {
                  const anglePerSector = 360 / sectors.length;
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
                  const pathData = `M 200 200 L ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2} Z`;

                  const isNumeric = sec.type === "POINTS" || /^\d+$/.test(sec.label.trim());
                  const digits = isNumeric ? sec.label.trim().split("") : [];
                  const numCount = digits.length;
                  const numStep = numCount >= 4 ? 20 : 25;
                  const numStartY = -(112 + ((numCount - 1) * numStep) / 2);

                  const specialLabel = sec.label;
                  const specialFontSize = specialLabel.length > 9 ? "9.5" : specialLabel.length > 7 ? "10.5" : "11.5";

                  const pegX = 200 + 185 * Math.cos(startRad);
                  const pegY = 200 + 185 * Math.sin(startRad);

                  return (
                    <g key={sec.id}>
                      <path
                        d={pathData}
                        fill={sec.color}
                        stroke="#ffffff"
                        strokeWidth="1.2"
                        strokeOpacity="0.4"
                      />

                      <g transform={`translate(200, 200) rotate(${midAngle + 90})`}>
                        {isNumeric ? (
                          digits.map((digit, dIdx) => (
                            <text
                              key={dIdx}
                              x={0}
                              y={numStartY + dIdx * numStep}
                              fill={sec.textColor || "#ffffff"}
                              fontSize={numCount >= 4 ? "15" : "17"}
                              fontWeight="900"
                              fontFamily="system-ui, -apple-system, sans-serif"
                              textAnchor="middle"
                              dominantBaseline="central"
                              filter="url(#mw_text_shadow)"
                            >
                              {digit}
                            </text>
                          ))
                        ) : (
                          <text
                            x={0}
                            y={-110}
                            transform="rotate(90, 0, -110)"
                            fill={sec.textColor || "#ffffff"}
                            fontSize={specialFontSize}
                            fontWeight="900"
                            fontFamily="system-ui, -apple-system, sans-serif"
                            textAnchor="middle"
                            dominantBaseline="central"
                            letterSpacing="0.8px"
                            filter="url(#mw_text_shadow)"
                          >
                            {specialLabel}
                          </text>
                        )}
                      </g>

                      {/* 3D Chrome Peg Pin */}
                      <circle cx={pegX} cy={pegY} r="2.8" fill="#fef08a" stroke="#78350f" strokeWidth="1" />
                    </g>
                  );
                })}

                {/* Center Hub */}
                <circle cx="200" cy="200" r="32" fill="url(#mwHubGrad)" stroke="#78350f" strokeWidth="4" />
                <circle cx="200" cy="200" r="16" fill="#18181b" stroke="#ffffff" strokeWidth="2" />
                <text x="200" y="204" textAnchor="middle" fill="#fef08a" fontSize="14" fontWeight="black">⭐</text>
              </svg>
            </div>
          </div>

          {/* Current Selected Sector Callout */}
          {selectedSector && !isSpinning && (
            <div className="mt-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-amber-500/30 to-pink-500/30 border border-amber-400/50 text-amber-200 text-xs sm:text-sm font-black shadow animate-scale-up">
              🎯 Ô quay: {selectedSector.label}
            </div>
          )}
        </div>

        {/* Right Col: Studio Dashboard & Virtual MC (7 cols on lg) */}
        <div className="lg:col-span-7 flex flex-col gap-3">
          {/* Virtual MC Card with Speech Bubble */}
          <div className="flex items-center gap-3 p-3 rounded-2xl bg-gradient-to-r from-purple-950/60 via-slate-900/70 to-indigo-950/60 border border-purple-500/30 shadow-md">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-400 via-pink-500 to-purple-600 p-0.5 shadow-lg shrink-0 flex items-center justify-center">
              <div className="w-full h-full rounded-[14px] bg-slate-900 flex items-center justify-center text-2xl">
                {mcReaction.emotion}
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-[10px] uppercase font-black tracking-wider text-pink-400 block mb-0.5">
                🎙️ MC ẢO CHIẾC NÓN KỲ DIỆU
              </span>
              <p className="text-xs sm:text-sm font-bold text-white line-clamp-2">
                "{mcReaction.text}"
              </p>
            </div>
          </div>

          {/* Interactive Player / Host Controls */}
          {!isDisplay && (
            <div className="flex flex-col gap-3 bg-black/30 p-3 rounded-2xl border border-white/10">
              {/* 1. Spin Control */}
              {phase === "SPIN_WAITING" && (
                <div className="space-y-2.5 p-3 rounded-xl bg-purple-950/30 border border-purple-500/30">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                    <span className="flex items-center gap-1 text-amber-300">
                      ⚡ LỰC QUAY: {oscillatingPower}% (Thời gian: {((15000 + Math.round((oscillatingPower / 100) * 6000)) / 1000).toFixed(1)}s)
                    </span>
                    <span className="text-[10px] text-muted-foreground">Nhấn để quay</span>
                  </div>

                  <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden p-0.5 border border-white/20">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-amber-400 to-rose-500 transition-all duration-75 shadow-lg"
                      style={{ width: `${oscillatingPower}%` }}
                    />
                  </div>

                  {canInteract ? (
                    <div className="flex flex-col sm:flex-row gap-2">
                      <button
                        type="button"
                        onClick={() => onSpin?.(oscillatingPower)}
                        disabled={isSpinning}
                        className="flex-1 py-2.5 sm:py-3 rounded-xl font-black text-xs sm:text-sm text-white bg-gradient-to-r from-pink-600 via-purple-600 to-indigo-600 hover:brightness-110 active:scale-98 transition shadow-[0_0_20px_rgba(236,72,153,0.4)] cursor-pointer"
                      >
                        ✦ CHỐT LỰC & QUAY NÓN ({oscillatingPower}%) ✦
                      </button>
                      {subMode === "WORD_PUZZLE" && (
                        <button
                          type="button"
                          onClick={() => setSolveModalOpen(true)}
                          disabled={isSpinning || isSolveForbiddenInRound3}
                          title={isSolveForbiddenInRound3 ? "Theo luật Vòng 3 VTV3: Cần mở hết chữ." : undefined}
                          className={`px-3.5 py-2.5 rounded-xl font-black text-xs whitespace-nowrap transition shadow ${
                            isSolveForbiddenInRound3
                              ? "bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed opacity-60"
                              : "text-black bg-gradient-to-r from-amber-400 to-yellow-500 hover:brightness-110 active:scale-98 cursor-pointer"
                          }`}
                        >
                          {isSolveForbiddenInRound3 ? "🔒 CẦN MỞ HẾT" : "🎯 ĐOÁN CẢ Ô CHỮ"}
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-1.5 text-xs text-slate-400 italic">
                      Đang chờ Đội {currentTurnTeamName} quay nón hoặc giải ô chữ...
                    </div>
                  )}
                </div>
              )}

              {/* 2. Vietnamese Alphabet Keyboard (No 5s time limit) */}
              {subMode === "WORD_PUZZLE" && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-black uppercase tracking-wider text-slate-300">
                      Bàn phím 29 chữ cái (thư thả đoán chữ):
                    </span>
                    {canInteract && phase === "ACTION_INPUT" && (
                      <button
                        type="button"
                        onClick={() => setSolveModalOpen(true)}
                        disabled={isSolveForbiddenInRound3}
                        className={`px-2.5 py-0.5 rounded-lg text-[11px] font-black shadow transition ${
                          isSolveForbiddenInRound3
                            ? "bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed"
                            : "bg-gradient-to-r from-yellow-500 to-amber-600 text-black cursor-pointer"
                        }`}
                      >
                        🎯 GIẢI Ô CHỮ
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-7 sm:grid-cols-10 gap-1">
                    {VIETNAMESE_ALPHABET.map((letter) => {
                      const isGuessed = guessedLetters.includes(letter);
                      const isCurrentTarget = canInteract && phase === "ACTION_INPUT" && !isGuessed && !isSpinning;

                      return (
                        <button
                          key={letter}
                          type="button"
                          disabled={!isCurrentTarget}
                          onClick={() => onGuessLetter?.(letter)}
                          className={`p-1.5 sm:p-2 rounded-lg font-black text-xs transition-all select-none ${
                            isGuessed
                              ? "bg-white/5 text-slate-500 border border-white/5 opacity-40 cursor-not-allowed line-through"
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

              {/* 3. Vòng 1: Ô Phần Thưởng */}
              {phase === "REWARD_CHOICE" && (
                <div className="p-3 rounded-xl bg-amber-950/60 border border-amber-500/40 shadow space-y-2">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xl">🎁</span>
                    <h4 className="font-black text-xs text-amber-200">Ô PHẦN THƯỞNG: CHỌN 1 TRONG 3 THẺ</h4>
                  </div>
                  {canInteract ? (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => onSelectRewardCard?.("POINTS_1500")}
                        className="p-2.5 rounded-lg border border-amber-400/50 bg-amber-500/20 text-amber-200 text-left cursor-pointer hover:bg-amber-500/30 transition text-xs font-bold"
                      >
                        🌟 +1.500 ĐIỂM
                      </button>
                      <button
                        type="button"
                        onClick={() => onSelectRewardCard?.("FREE_SPIN")}
                        className="p-2.5 rounded-lg border border-sky-400/50 bg-sky-500/20 text-sky-200 text-left cursor-pointer hover:bg-sky-500/30 transition text-xs font-bold"
                      >
                        🎟️ THÊM LƯỢT
                      </button>
                      <button
                        type="button"
                        onClick={() => onSelectRewardCard?.("SHIELD")}
                        className="p-2.5 rounded-lg border border-emerald-400/50 bg-emerald-500/20 text-emerald-200 text-left cursor-pointer hover:bg-emerald-500/30 transition text-xs font-bold"
                      >
                        🛡️ KHIÊN BẢO HỘ
                      </button>
                    </div>
                  ) : (
                    <div className="text-center text-xs text-slate-400 italic">Đang đợi Đội {currentTurnTeamName}...</div>
                  )}
                </div>
              )}

              {/* 4. Vòng 2: Ô Bí Mật (3.000.000đ vs Mất Điểm) */}
              {phase === "MYSTERY_CHOICE" && (() => {
                const mysterySector = selectedSector || sectors[activeState.selectedSectorIndex ?? -1];
                const baseVal = mysterySector?.basePoints || 100;
                return (
                  <div className="p-3 rounded-xl bg-purple-950/60 border border-purple-500/40 shadow space-y-2">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xl">🔮</span>
                      <h4 className="font-black text-xs text-purple-200">QUYẾT ĐỊNH Ô BÍ MẬT (3.000.000đ hoặc MẤT ĐIỂM)</h4>
                    </div>
                    {canInteract ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => onMysteryDecide?.(false)}
                          className="py-2 px-3 rounded-lg font-black text-xs bg-emerald-600 hover:bg-emerald-500 text-white shadow cursor-pointer transition"
                        >
                          🛡️ KHÔNG LẬT (Nhận {baseVal}đ)
                        </button>
                        <button
                          type="button"
                          onClick={() => onMysteryDecide?.(true)}
                          className="py-2 px-3 rounded-lg font-black text-xs bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:brightness-110 shadow cursor-pointer transition"
                        >
                          🎲 LẬT Ô BÍ MẬT ➔
                        </button>
                      </div>
                    ) : (
                      <div className="text-center text-xs text-slate-400 italic">Đang đợi Đội {currentTurnTeamName}...</div>
                    )}
                  </div>
                );
              })()}

              {/* 5. Vòng 3: Mini-Game Đổi Hay Không Đổi */}
              {phase === "TRADE_CHOICE" && (
                <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-500/40 shadow space-y-2">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xl">🎁</span>
                    <h4 className="font-black text-xs text-rose-200">ĐỔI HAY KHÔNG ĐỔI? (VÒNG 3)</h4>
                  </div>
                  {canInteract ? (
                    <div className="space-y-2">
                      <div className="grid grid-cols-4 gap-1.5">
                        {[0, 1, 2, 3].map((idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => onTradeDecide?.(true, idx)}
                            className="p-2 rounded-lg border border-rose-400/40 bg-rose-500/20 text-rose-200 text-xs font-black cursor-pointer hover:bg-rose-500/30 transition text-center"
                          >
                            🎁 Hộp #{idx + 1}
                          </button>
                        ))}
                      </div>
                      <button
                        type="button"
                        onClick={() => onTradeDecide?.(false)}
                        className="w-full py-2 rounded-lg font-black text-xs bg-cyan-600 hover:bg-cyan-500 text-white shadow cursor-pointer transition"
                      >
                        🛡️ KHÔNG ĐỔI — TIẾP TỤC ĐUA Ô CHỮ ➔
                      </button>
                    </div>
                  ) : (
                    <div className="text-center text-xs text-slate-400 italic">Đang đợi Đội {currentTurnTeamName}...</div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Compact Scoreboard (Always visible and responsive) */}
          <div className="p-3 rounded-2xl bg-black/40 border border-white/10 space-y-2">
            <div className="flex items-center justify-between text-[11px] font-black uppercase tracking-wider text-slate-400">
              <span>🏆 BẢNG ĐIỂM (VÒNG {currentRound})</span>
              <span className="text-amber-300">Điểm vòng / Tổng điểm</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
              {teams.map((t) => {
                const rScore = roundScores?.[t.id] || 0;
                const freeCount = freeSpinCount?.[t.id] || 0;
                const isTurn = t.id === currentTurnTeamId;
                const strikes = activeState.consecutiveWrongGuesses?.[t.id] || activeState.wrongGuessesCount?.[t.id] || 0;
                const isEliminated = (activeState.disqualifiedTeamIdsInRound || []).includes(t.id);

                return (
                  <div
                    key={t.id}
                    className={`p-2 rounded-xl flex flex-col gap-1 border transition ${
                      isEliminated
                        ? "bg-red-950/20 border-red-500/30 opacity-60"
                        : isTurn
                        ? "bg-amber-500/15 border-amber-400/60 shadow-[0_0_12px_rgba(245,158,11,0.25)]"
                        : "bg-white/5 border-white/10"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0 shadow" style={{ background: t.color || "#6366f1" }} />
                        <span className="text-xs font-bold text-white truncate">{t.name}</span>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-xs font-mono font-black text-amber-300">+{rScore}đ</span>
                        <span className="text-[9px] text-slate-400 ml-1">({t.score || 0}đ)</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-[10px] pt-0.5 border-t border-white/5">
                      {freeCount > 0 ? (
                        <span className="text-[9px] text-sky-300 font-semibold">🎟️ {freeCount}</span>
                      ) : (
                        <span className="text-[9px] text-slate-500">0 thẻ</span>
                      )}
                      {isEliminated ? (
                        <span className="text-rose-400 font-bold uppercase text-[9px]">⛔ Dừng vòng</span>
                      ) : (
                        <div className="flex items-center gap-0.5">
                          <span className={strikes >= 1 ? "text-rose-400 font-black" : "text-slate-600"}>❌</span>
                          <span className={strikes >= 2 ? "text-rose-400 font-black" : "text-slate-600"}>❌</span>
                          <span className={strikes >= 3 ? "text-rose-400 font-black" : "text-slate-600"}>❌</span>
                        </div>
                      )}
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
    </div>
  );
}
