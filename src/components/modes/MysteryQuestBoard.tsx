"use client";

import React, { useState, useEffect, useRef } from "react";
import { MysteryQuestState, MysteryTile, MysteryMiniGameType } from "@/types";
import { MYSTERY_THEMES, getPerkType, TAROT_WHEEL_SEGMENTS } from "@/lib/game-engine/mystery-quest";
import { TarotCardBackSvg, TarotCardEmblem, getTarotCardMeta } from "./TarotCardGraphic";
import { DoorClipPathDefinition, RealisticDoorArtwork } from "./DoorGraphic";

interface Props {
  mysteryState?: MysteryQuestState;
  isDisplay?: boolean;
  isAdmin?: boolean;
  isSandbox?: boolean;
  myTeamId?: string;
  onFlipCard?: (tileId: number) => void;
  onCashOut?: () => void;
  onStealBuzz?: () => void;
  onAdvanceTurn?: () => void;
  onSelectMiniGame?: (miniGameType: MysteryMiniGameType) => void;
  onChooseAction?: (action: "TAKE_BASE_POINTS" | "PLAY_MINIGAME") => void;
  onPairsDecision?: (choice: "CASH_OUT" | "PLAY_ROUND_2") => void;
  onChooseStealTarget?: (targetTeamId: string) => void;
  onDoorsDecision?: (payload: { decision: "SAFE_EXIT" | "RISK_OPEN"; chosenDoorId?: number }) => void;
  onTarotRedraw?: () => void;
  onTarotConfirmKeep?: () => void;
  onUsePeek?: () => void;
  onTarotProphecyDecision?: (choice: "KEEP" | "DISCARD") => void;
  onAdjustScore?: (teamId: string, delta?: number, setScore?: number) => void;
  onDrawTarot?: () => void;
  onSpinTarotWheel?: (powerPercent: number) => void;
  teams?: Array<{ id: string; name: string; color: string; score: number; hearts?: number }>;
}

export default function MysteryQuestBoard({
  mysteryState,
  isDisplay = false,
  isAdmin = false,
  isSandbox = false,
  myTeamId,
  onFlipCard,
  onCashOut,
  onStealBuzz,
  onAdvanceTurn,
  onSelectMiniGame,
  onChooseAction,
  onPairsDecision,
  onChooseStealTarget,
  onDoorsDecision,
  onTarotRedraw,
  onTarotConfirmKeep,
  onUsePeek,
  onTarotProphecyDecision,
  onAdjustScore,
  onDrawTarot,
  onSpinTarotWheel,
  teams = [],
}: Props) {
  const [flippingTileId, setFlippingTileId] = useState<number | null>(null);
  const [optimisticOpenedIds, setOptimisticOpenedIds] = useState<Set<number>>(new Set());
  const [optimisticMatchedPairKey, setOptimisticMatchedPairKey] = useState<string | null>(null);
  const [isDrawingAnimation, setIsDrawingAnimation] = useState<boolean>(false);
  const [isCashingOut, setIsCashingOut] = useState<boolean>(false);
  const [showScoreEditModal, setShowScoreEditModal] = useState<boolean>(false);
  const [doorsRiskAccepted, setDoorsRiskAccepted] = useState<boolean>(false);
  const [wheelPower, setWheelPower] = useState<number>(50);
  const [isPowerIncreasing, setIsPowerIncreasing] = useState<boolean>(true);
  const [isWheelSpinningOptimistic, setIsWheelSpinningOptimistic] = useState<boolean>(false);
  const [lockedPower, setLockedPower] = useState<number | null>(null);
  const [clientWheelAngle, setClientWheelAngle] = useState<number>(0);
  const isFlippingRef = useRef<boolean>(false);
  const flippingTileIdRef = useRef<number | null>(null);
  const lastClickedTileIdRef = useRef<number | null>(null);

  if (!mysteryState) {
    return (
      <div className="glass rounded-2xl p-8 text-center text-muted-foreground border border-white/10">
        <p className="text-4xl mb-3 animate-pulse">🗝️</p>
        <p className="text-lg font-bold text-white/80">Hành Trình Bí Ẩn đang được khởi tạo...</p>
      </div>
    );
  }

  const {
    currentTurnTeamId,
    currentTurnTeamName,
    currentTurnTeamColor,
    currentTurnIndex,
    totalTurns,
    currentRound,
    theme,
    miniGameType,
    themeNameVi,
    themeBgGradient,
    tiles,
    phase,
    baseQuestionPoints,
    promoPerk,
    hasShield,
    decisionMade,
    potPoints,
    potMultiplier,
    cardsFlippedCount,
    bombExploded,
    turnFinishedReason,
    storyResult,
    lastFlippedTile,
    memoryPairsState,
    oneShotState,
    tarotState,
    nextCardPeek,
    peekUsesRemaining,
  } = mysteryState;

  // Sync optimistic set with actual opened tiles from server without redundant re-renders or flickering
  useEffect(() => {
    const serverOpened = new Set(tiles.filter((t) => t.isOpened).map((t) => t.id));
    const matchedKey = memoryPairsState?.matchedPairKey || optimisticMatchedPairKey;
    if (matchedKey) {
      tiles.forEach((t) => {
        if (t.pairKey === matchedKey) {
          serverOpened.add(t.id);
        }
      });
    }

    setOptimisticOpenedIds((prev) => {
      // Khi không có lá bài nào đang trong lượt lật (firstFlippedTileId và secondFlippedTileId đều null):
      // Đồng bộ 100% về serverOpened, đảm bảo sau khi mismatch 1.5s các lá bài úp lại sạch sẽ!
      if (
        !memoryPairsState?.firstFlippedTileId &&
        !memoryPairsState?.secondFlippedTileId &&
        !lastClickedTileIdRef.current
      ) {
        return serverOpened;
      }

      // If mismatch is resolving, promptSecondChance, or turn finished: reset immediately
      if (
        memoryPairsState?.isMismatchResolving ||
        memoryPairsState?.promptSecondChance ||
        phase === "TURN_SUMMARY"
      ) {
        lastClickedTileIdRef.current = null;
        return serverOpened;
      }

      // Khi đang có lá bài lật dở trong lượt (ví dụ lá 1 hoặc lá 2 vừa bấm):
      // Giữ lại serverOpened cộng với lá đang lật dở để không bị flicker!
      const currentAttemptIds = new Set<number>();
      if (memoryPairsState?.firstFlippedTileId) currentAttemptIds.add(Number(memoryPairsState.firstFlippedTileId));
      if (memoryPairsState?.secondFlippedTileId) currentAttemptIds.add(Number(memoryPairsState.secondFlippedTileId));
      if (lastClickedTileIdRef.current) currentAttemptIds.add(Number(lastClickedTileIdRef.current));

      const merged = new Set([...serverOpened, ...currentAttemptIds]);
      if (merged.size === prev.size) {
        let same = true;
        for (const id of merged) {
          if (!prev.has(id)) {
            same = false;
            break;
          }
        }
        if (same) return prev;
      }
      return merged;
    });
  }, [tiles, memoryPairsState?.matchedPairKey, memoryPairsState?.firstFlippedTileId, memoryPairsState?.secondFlippedTileId, memoryPairsState?.isMismatchResolving, memoryPairsState?.promptSecondChance, phase, optimisticMatchedPairKey]);

  useEffect(() => {
    if (memoryPairsState?.matchedPairKey) {
      setOptimisticMatchedPairKey(memoryPairsState.matchedPairKey);
    } else if (!memoryPairsState?.firstFlippedTileId && !lastClickedTileIdRef.current) {
      setOptimisticMatchedPairKey(null);
    }
  }, [memoryPairsState?.matchedPairKey, memoryPairsState?.firstFlippedTileId]);

  useEffect(() => {
    lastClickedTileIdRef.current = null;
    setOptimisticMatchedPairKey(null);
  }, [currentTurnIndex, miniGameType]);

  useEffect(() => {
    setIsCashingOut(false);
  }, [phase, potPoints]);

  useEffect(() => {
    setDoorsRiskAccepted(false);
  }, [currentTurnIndex, miniGameType, oneShotState?.phase]);

  // Reset optimistic spin state when turn changes or card is revealed
  useEffect(() => {
    setIsWheelSpinningOptimistic(false);
    setLockedPower(null);
  }, [currentTurnIndex, miniGameType, tarotState?.isDrawn]);

  // Fallback safety timeout for optimistic spin state
  useEffect(() => {
    if (!isWheelSpinningOptimistic) return;
    const fallbackTimer = setTimeout(() => {
      setIsWheelSpinningOptimistic(false);
      setLockedPower(null);
    }, 10000);
    return () => clearTimeout(fallbackTimer);
  }, [isWheelSpinningOptimistic]);

  // Synchronize Tarot Wheel angle when server spins or stops
  useEffect(() => {
    if (tarotState?.targetAngle !== undefined && tarotState.targetAngle !== null) {
      setClientWheelAngle(tarotState.targetAngle);
    }
  }, [tarotState?.targetAngle, tarotState?.isWheelSpinning]);

  // Ping-pong power gauge loop (0% -> 100% -> 0%) - freezes immediately when spun
  useEffect(() => {
    const isSpinning = Boolean(tarotState?.isWheelSpinning || isWheelSpinningOptimistic);
    if (miniGameType !== "TAROT_DESTINY" || phase !== "PUSH_YOUR_LUCK" || isSpinning || tarotState?.isDrawn) {
      return;
    }
    const interval = setInterval(() => {
      setWheelPower((prev) => {
        if (prev >= 100) {
          setIsPowerIncreasing(false);
          return 97;
        }
        if (prev <= 5) {
          setIsPowerIncreasing(true);
          return 8;
        }
        return isPowerIncreasing ? prev + 3 : prev - 3;
      });
    }, 35);
    return () => clearInterval(interval);
  }, [miniGameType, phase, tarotState?.isWheelSpinning, isWheelSpinningOptimistic, tarotState?.isDrawn, isPowerIncreasing]);

  const themeMeta = MYSTERY_THEMES[theme] || {
    accentColor: "#a855f7",
    emoji: "🗝️",
    taglineVi: "Hành Trình Bí Ẩn",
  };

  const isMyTurn = Boolean(myTeamId && myTeamId === currentTurnTeamId);
  const canInteract = Boolean((isMyTurn || isAdmin || isSandbox) && phase === "PUSH_YOUR_LUCK");
  const canInteractDecision = Boolean((isMyTurn || isAdmin || isSandbox) && phase === "DECISION_CHOICE");
  const canCashOut = Boolean(canInteract && (miniGameType === "PUSH_YOUR_LUCK" || miniGameType === "RADAR_WINDOWS") && potPoints > 0);

  // Việc chuyển lượt / chuyển câu hỏi diễn ra thủ công bởi Admin/MC, không tự động


  const handleTileClick = (tile: MysteryTile) => {
    if (!canInteract || tile.isOpened || optimisticOpenedIds.has(tile.id)) return;
    if (phase === "TURN_SUMMARY") return;

    if (miniGameType === "MEMORY_PAIRS") {
      if (memoryPairsState?.isMismatchResolving) return;
      if (memoryPairsState?.promptSecondChance) return;
      if (memoryPairsState?.matchedPairKey || optimisticMatchedPairKey) return;
      if (
        (memoryPairsState?.attemptsUsed ?? 0) >= (memoryPairsState?.maxAttempts ?? 3) &&
        !memoryPairsState?.isBombRescueActive
      ) {
        return;
      }

      // Check if this click completes a matching pair optimistically
      const priorFlippedId = memoryPairsState?.firstFlippedTileId || lastClickedTileIdRef.current;
      if (priorFlippedId && Number(priorFlippedId) !== Number(tile.id)) {
        const first = tiles.find((t) => Number(t.id) === Number(priorFlippedId));
        if (first && first.pairKey && first.pairKey === tile.pairKey) {
          setOptimisticMatchedPairKey(tile.pairKey);
        }
      } else if (!priorFlippedId) {
        lastClickedTileIdRef.current = tile.id;
      }

      // Trong Lật Cặp, chỉ chặn click đúp vào đúng cùng một lá bài trong vòng 200ms
      if (flippingTileIdRef.current === tile.id) return;
      flippingTileIdRef.current = tile.id;
      setTimeout(() => {
        if (flippingTileIdRef.current === tile.id) {
          flippingTileIdRef.current = null;
        }
      }, 200);

      // Cooldown click giữa 2 thẻ khác nhau cực ngắn (80ms) để không làm mất lượt click thứ 2
      if (isFlippingRef.current) return;
      isFlippingRef.current = true;
      setTimeout(() => {
        isFlippingRef.current = false;
      }, 80);
    } else {
      if (isFlippingRef.current) return;
      isFlippingRef.current = true;
      setTimeout(() => {
        isFlippingRef.current = false;
      }, 450);
    }

    // Instant optimistic visual feedback (<16ms) - Trong ONE_SHOT_DOORS Giai đoạn 1 thì chỉ chọn để ra riêng (vẫn úp, không lật)
    const isOneShot = miniGameType === "ONE_SHOT_DOORS" || miniGameType === "DOORS" || miniGameType === "CHESTS";
    if (!isOneShot || oneShotState?.phase === "STAGE_2_PICK" || oneShotState?.phase === "SCANNED") {
      setOptimisticOpenedIds((prev) => new Set(prev).add(tile.id));
    }
    setFlippingTileId(tile.id);
    if (miniGameType === "PUSH_YOUR_LUCK" || miniGameType === "RADAR_WINDOWS") {
      setIsDrawingAnimation(true);
      setTimeout(() => setIsDrawingAnimation(false), 450);
    }
    setTimeout(() => {
      setFlippingTileId(null);
    }, 450);

    onFlipCard?.(tile.id);
  };

  const getVariantLabel = () => {
    switch (miniGameType) {
      case "MEMORY_PAIRS":
        return { title: "🃏 Lật Cặp Trùng Nhau", badge: "Memory Pair" };
      case "ONE_SHOT_DOORS":
      case "DOORS":
      case "CHESTS":
        return { title: "🚪 4 Cánh Cửa Bí Mật (2 Giai Đoạn)", badge: "4 Secret Doors" };
      case "TAROT_DESTINY":
      case "TAROT_CARDS":
        return { title: "🔮 BÀI TAROT (Định Mệnh Chọn Lá)", badge: "Tarot" };
      case "PUSH_YOUR_LUCK":
      case "RADAR_WINDOWS":
      default:
        return { title: "💣 Lật Liều Tích Lũy Né Bom", badge: "Push-Your-Luck" };
    }
  };

  const variantInfo = getVariantLabel();

  return (
    <div
      className={`w-full rounded-2xl p-2.5 sm:p-4 bg-gradient-to-b ${themeBgGradient} border-2 border-white/15 shadow-2xl relative overflow-hidden transition-all duration-700`}
      style={{
        boxShadow: `0 20px 60px -15px ${themeMeta.accentColor}33`,
      }}
    >
      {/* Ambient background glow */}
      <div
        className="absolute -top-32 -right-32 w-96 h-96 rounded-full blur-3xl opacity-25 pointer-events-none"
        style={{ backgroundColor: themeMeta.accentColor }}
      />
      <div
        className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full blur-3xl opacity-20 pointer-events-none"
        style={{ backgroundColor: currentTurnTeamColor || "#3b82f6" }}
      />

      {/* ── Top Header: Theme, Turn, Team, and Minigame Selector ── */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <div
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center text-xl sm:text-2xl shadow-lg border border-white/20 shrink-0"
            style={{ backgroundColor: `${themeMeta.accentColor}33` }}
          >
            {themeMeta.emoji}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] uppercase font-black tracking-widest px-2 py-0.2 rounded-full bg-white/10 text-white/90 border border-white/15">
                {themeNameVi}
              </span>
              <span className="text-[10px] font-bold text-amber-300 px-2 py-0.2 rounded-full bg-amber-500/20 border border-amber-400/40">
                {variantInfo.title}
              </span>
            </div>
            <p className="text-[11px] text-white/60 mt-0.5 line-clamp-1">{themeMeta.taglineVi}</p>
          </div>
        </div>

        {/* Turn & Active Team Badge */}
        <div className="flex items-center gap-2">
          <div className="px-2.5 py-1 rounded-lg bg-black/40 border border-white/10 text-[11px] font-mono font-bold text-white/80">
            LƯỢT <span className="text-amber-400 font-black">{currentTurnIndex + 1}</span> / {totalTurns}
            <span className="mx-1.5 opacity-40">|</span>
            VÒNG <span className="text-cyan-400 font-black">{currentRound}</span>
          </div>

          <div
            className="flex items-center gap-2 px-2.5 py-1 rounded-xl border-2 shadow-xl backdrop-blur-md"
            style={{
              borderColor: currentTurnTeamColor,
              backgroundColor: `${currentTurnTeamColor}22`,
            }}
          >
            <div
              className="w-2.5 h-2.5 rounded-full ring-2 ring-white/50 shrink-0 animate-pulse"
              style={{ backgroundColor: currentTurnTeamColor }}
            />
            <div className="text-left">
              <span className="text-[8px] uppercase font-black tracking-wider text-white/70 block leading-tight">
                ĐỘI THI ĐẤU
              </span>
              <span className="text-xs font-black text-white truncate max-w-[120px] block leading-tight">
                {currentTurnTeamName}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Host / Sandbox Minigame Switcher Pills ── */}
      {(isAdmin || isSandbox) && (
        <div className="relative z-10 pt-2 pb-1 flex flex-wrap items-center gap-1 text-[11px]">
          <span className="text-[10px] font-bold text-slate-400 mr-1">🎮 Đổi Minigame:</span>
          {[
            { key: "MEMORY_PAIRS", label: "🃏 Lật Cặp", icon: "🃏" },
            { key: "ONE_SHOT_DOORS", label: "🚪 4 Cửa", icon: "🚪" },
            { key: "PUSH_YOUR_LUCK", label: "💣 Lật Liều", icon: "💣" },
            { key: "TAROT_DESTINY", label: "🔮 Tarot", icon: "🔮" },
          ].map((v) => {
            const isActive = miniGameType === v.key;
            return (
              <button
                key={v.key}
                type="button"
                onClick={() => onSelectMiniGame?.(v.key as MysteryMiniGameType)}
                className={`px-2 py-0.5 rounded-md font-bold text-[10px] transition border cursor-pointer ${
                  isActive
                    ? "bg-purple-600 text-white border-purple-400 shadow-md ring-1 ring-purple-300"
                    : "bg-black/40 text-slate-300 border-white/10 hover:border-white/30 hover:bg-white/10"
                }`}
              >
                {v.label}
              </button>
            );
          })}
        </div>
      )}

      {/* ── Phase HUD / Alerts ── */}
      <div className="relative z-10 py-2 sm:py-2.5">
        {/* Phase: QUESTION_ACTIVE */}
        {phase === "QUESTION_ACTIVE" && (
          <div className="p-4 rounded-2xl bg-black/40 border border-cyan-500/30 text-center animate-slide-up">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-300 text-xs font-bold uppercase tracking-wider mb-2">
              <span>🎯</span> VÒNG CÂU HỎI BẢN ĐỒ
            </div>
            <h3 className="text-base sm:text-lg font-black text-white">
              Đội <span style={{ color: currentTurnTeamColor }}>{currentTurnTeamName}</span> đang trả lời câu hỏi!
            </h3>
            <p className="text-xs text-white/70 mt-1 max-w-xl mx-auto">
              Trả lời đúng sẽ mở khóa thử thách Minigame{" "}
              <strong className="text-amber-300">{variantInfo.title}</strong>!
            </p>
          </div>
        )}

        {/* Phase: DECISION_CHOICE (Team chooses between Safe Base Points or Gamble Minigame) */}
        {phase === "DECISION_CHOICE" && (
          <div className="w-full max-w-4xl mx-auto space-y-2 sm:space-y-3 animate-slide-up">
            <div className="p-2.5 sm:p-3 rounded-xl bg-black/60 border border-amber-500/40 text-center backdrop-blur-md shadow-xl">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] sm:text-xs font-black uppercase tracking-wider mb-1">
                <span>⭐</span> TRẢ LỜI CHÍNH XÁC! LỰA CHỌN QUYẾT ĐỊNH
              </div>
              <h3 className="text-base sm:text-lg font-black text-white">
                Chúc mừng Đội <span style={{ color: currentTurnTeamColor }}>{currentTurnTeamName}</span>!
              </h3>
              <p className="text-[11px] sm:text-xs text-white/80 mt-0.5 max-w-xl mx-auto line-clamp-2">
                Bạn muốn nhận chắc chắn số điểm gốc của câu hỏi hay đem số điểm này vào quỹ để mạo hiểm cùng Minigame?
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:gap-3">
              {/* Option A: Nhận điểm an toàn */}
              {(() => {
                const activeTeamObj = teams.find((t) => t.id === currentTurnTeamId);
                const teamHeartsVal = mysteryState?.teamHearts?.[currentTurnTeamId] ?? activeTeamObj?.hearts ?? mysteryState?.initialHeartsPerTeam ?? 0;
                const hasHearts = teamHeartsVal > 0;

                return (
                  <div className={`p-3 sm:p-4 rounded-2xl bg-gradient-to-b ${hasHearts ? "from-emerald-950/80 via-black/80 to-emerald-950/80 border-emerald-400/60 hover:border-emerald-300" : "from-gray-950/80 via-black/80 to-gray-950/80 border-rose-500/30 opacity-80"} border-2 shadow-xl flex flex-col justify-between text-center relative overflow-hidden group transition-all`}>
                    <div className="space-y-1 sm:space-y-1.5">
                      <div className="text-2xl sm:text-3xl">{hasHearts ? "🛡️" : "🔒"}</div>
                      <h4 className={`text-xs sm:text-sm font-black uppercase tracking-wide ${hasHearts ? "text-emerald-300" : "text-rose-400"}`}>
                        Phương Án 1: Nhận An Toàn
                      </h4>
                      <div className="py-0.5">
                        <span className={`text-2xl sm:text-4xl font-black font-mono ${hasHearts ? "text-emerald-400" : "text-slate-400"}`}>
                          +{baseQuestionPoints || 10}
                        </span>
                        <span className={`font-bold ml-1 text-xs sm:text-sm ${hasHearts ? "text-emerald-300" : "text-slate-500"}`}>điểm</span>
                      </div>
                      {hasHearts ? (
                        <p className="text-[10px] sm:text-xs text-white/70 leading-snug line-clamp-2">
                          Tiêu hao 1 ❤️ để nhận trọn vẹn điểm số câu hỏi (Hiện có: <strong className="text-rose-400">❤️ {teamHeartsVal}</strong>).
                        </p>
                      ) : (
                        <p className="text-[10px] sm:text-xs text-rose-300/90 leading-snug line-clamp-2 font-medium">
                          🔒 Đội đã hết Tim (0 ❤️)! Khóa quyền ăn điểm an toàn, bắt buộc phải vào Minigame né bom!
                        </p>
                      )}
                    </div>

                    <div className="pt-2 sm:pt-3">
                      {canInteractDecision ? (
                        hasHearts ? (
                          <button
                            type="button"
                            onClick={() => onChooseAction?.("TAKE_BASE_POINTS")}
                            className="w-full py-2 sm:py-2.5 px-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-black text-xs sm:text-sm uppercase tracking-wider shadow-lg shadow-emerald-900/50 border border-emerald-300 hover:scale-[1.02] active:scale-95 transition cursor-pointer"
                          >
                            🛡️ Chốt +{baseQuestionPoints || 10}đ An Toàn (-1 ❤️)
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled
                            className="w-full py-2 sm:py-2.5 px-2 rounded-xl bg-slate-800/80 text-rose-300/80 font-black text-xs sm:text-sm uppercase tracking-wider border border-rose-500/30 cursor-not-allowed opacity-75"
                          >
                            🔒 Đã hết Tim! Bắt buộc vào Minigame
                          </button>
                        )
                      ) : (
                        <div className="py-1.5 px-2 rounded-lg bg-black/40 border border-white/10 text-[10px] sm:text-xs text-slate-400 italic">
                          Đang đợi Đội {currentTurnTeamName}...
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* Option B: Chơi Minigame */}
              <div className="p-3 sm:p-4 rounded-2xl bg-gradient-to-b from-purple-950/80 via-black/80 to-amber-950/80 border-2 border-amber-400/60 shadow-xl flex flex-col justify-between text-center relative overflow-hidden group hover:border-amber-300 transition-all">
                <div className="space-y-1 sm:space-y-1.5">
                  <div className="text-2xl sm:text-3xl">🎲</div>
                  <h4 className="text-xs sm:text-sm font-black text-amber-300 uppercase tracking-wide">
                    Phương Án 2: Vào Minigame
                  </h4>
                  <div className="text-[10px] sm:text-xs font-bold text-indigo-300 flex items-center justify-center gap-1 truncate">
                    <span>Thử thách:</span>
                    <strong className="text-amber-200 truncate">{variantInfo.title}</strong>
                  </div>

                  {/* Starting Pot */}
                  <div className="py-0.5">
                    <span className="text-2xl sm:text-4xl font-black font-mono text-amber-400">
                      {(() => {
                        const perkType = typeof promoPerk === "string" ? promoPerk : promoPerk?.type;
                        return `+${(baseQuestionPoints || 10) + (perkType === "EXTRA_POT_PROMO" ? 5 : 0)}`;
                      })()}
                    </span>
                    <span className="text-amber-300 font-bold ml-1 text-xs sm:text-sm">điểm</span>
                  </div>

                  {/* Promo Perk Badge */}
                  {(() => {
                    const perkType = typeof promoPerk === "string" ? promoPerk : promoPerk?.type;
                    if (!perkType) return null;
                    return (
                      <div className="py-1 px-1.5 rounded-lg bg-purple-900/40 border border-purple-400/40 text-[10px] text-purple-200 font-bold flex items-center justify-center gap-1 truncate">
                        {perkType === "SHIELD_PROMO" && (
                          <>
                            <span>🛡️</span>
                            <span className="truncate">Khiên Chặn Bom (Bảo toàn điểm gốc)!</span>
                          </>
                        )}
                        {perkType === "EXTRA_POT_PROMO" && (
                          <>
                            <span>🎁</span>
                            <span className="truncate">Quỹ thưởng +5đ!</span>
                          </>
                        )}
                        {perkType === "STEAL_5_PROMO" && (
                          <>
                            <span>🗡️</span>
                            <span className="truncate">Đạo Tặc (Đánh cắp 5đ từ đội cao nhất)!</span>
                          </>
                        )}
                        {perkType === "DOUBLE_PROMO" && (
                          <>
                            <span>⚡</span>
                            <span className="truncate">Nhân đôi x2 điểm thưởng!</span>
                          </>
                        )}
                        {perkType === "PEEK_PROMO" && (
                          <>
                            <span>👁️</span>
                            <span className="truncate">Mắt Thần Soi Bài!</span>
                          </>
                        )}
                        {perkType === "EXTRA_ATTEMPT_PROMO" && (
                          <>
                            <span>🔄</span>
                            <span className="truncate">Thêm lượt / Cơ hội thứ hai!</span>
                          </>
                        )}
                        {perkType === "SAFETY_NET_PROMO" && (
                          <>
                            <span>🧲</span>
                            <span className="truncate">Két Sắt Bảo Lưu (giữ 50% quỹ)!</span>
                          </>
                        )}
                      </div>
                    );
                  })()}
                </div>

                <div className="pt-2 sm:pt-3">
                  {canInteractDecision ? (
                    <button
                      type="button"
                      onClick={() => onChooseAction?.("PLAY_MINIGAME")}
                      className="w-full py-2 sm:py-2.5 px-2 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-pink-600 hover:from-amber-400 hover:to-pink-500 text-white font-black text-xs sm:text-sm uppercase tracking-wider shadow-lg shadow-orange-900/50 border border-amber-300 hover:scale-[1.02] active:scale-95 transition cursor-pointer"
                    >
                      🎲 Vào Chơi Minigame
                    </button>
                  ) : (
                    <div className="py-1.5 px-2 rounded-lg bg-black/40 border border-white/10 text-[10px] sm:text-xs text-slate-400 italic">
                      Đang đợi Đội {currentTurnTeamName}...
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Admin / Sandbox override prompt */}
            {(isAdmin || isSandbox) && (
              <div className="p-2 rounded-xl bg-black/60 border border-white/10 flex items-center justify-between gap-2 text-[11px] text-slate-300">
                <span className="font-bold flex items-center gap-1 truncate">
                  <span>👑</span> Quyền Admin / MC:
                </span>
                <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                  <button
                    type="button"
                    onClick={() => onChooseAction?.("TAKE_BASE_POINTS")}
                    className="px-2.5 py-1 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white font-bold cursor-pointer transition text-[11px]"
                  >
                    MC chọn Nhận An Toàn (+{baseQuestionPoints || 10}đ)
                  </button>
                  <button
                    type="button"
                    onClick={() => onChooseAction?.("PLAY_MINIGAME")}
                    className="px-2.5 py-1 rounded-lg bg-purple-700 hover:bg-purple-600 text-white font-bold cursor-pointer transition text-[11px]"
                  >
                    MC chọn Chơi Minigame
                  </button>
                  {onAdvanceTurn && (
                    <button
                      type="button"
                      onClick={onAdvanceTurn}
                      className="px-2.5 py-1 rounded-lg bg-slate-700 hover:bg-slate-600 text-white font-bold cursor-pointer transition text-[11px]"
                    >
                      MC Bỏ qua lượt ➔
                    </button>
                  )}
                  {onAdjustScore && (
                    <button
                      type="button"
                      onClick={() => setShowScoreEditModal(true)}
                      className="px-2.5 py-1 rounded-lg bg-amber-600/80 hover:bg-amber-500 text-white font-bold cursor-pointer transition text-[11px] flex items-center gap-1 shadow"
                    >
                      <span>✏️</span>
                      <span>Sửa điểm</span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Phase: PUSH_YOUR_LUCK / MINIGAME_ACTIVE */}
        {phase === "PUSH_YOUR_LUCK" && (
          <div className="flex flex-col items-center justify-center text-center space-y-3">
            {/* VARIANT 1: MEMORY PAIRS HUD */}
            {miniGameType === "MEMORY_PAIRS" && (
              <div className="w-full max-w-xl mx-auto p-2 sm:p-2.5 rounded-xl bg-black/60 border border-indigo-400/50 backdrop-blur-md shadow-xl">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-black text-indigo-300 uppercase tracking-wider text-[11px]">
                    🃏 THỬ THÁCH LẬT CẶP TRÙNG NHAU (12 THẺ - 6 CẶP)
                  </span>
                  <div className="flex items-center gap-2">
                    {memoryPairsState?.isBombRescueActive ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-amber-500/30 text-amber-300 border border-amber-400 animate-pulse">
                        ⚠️ LƯỢT GIẢI CỨU: 3 LÁ
                      </span>
                    ) : (
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                          memoryPairsState?.round === 2
                            ? "bg-rose-500/30 text-rose-300 border border-rose-500/50 animate-pulse"
                            : "bg-indigo-500/30 text-indigo-200 border border-indigo-500/40"
                        }`}
                      >
                        {memoryPairsState?.round === 2 ? "🔥 VÒNG 2 SINH TỬ" : "✨ VÒNG 1"}
                      </span>
                    )}
                    <span className="font-mono font-bold text-amber-300 px-2 py-0.5 rounded bg-amber-500/20 border border-amber-500/30 text-[11px]">
                      Lượt lật: {memoryPairsState?.attemptsUsed ?? 0}/{memoryPairsState?.maxAttempts ?? 4}
                    </span>
                  </div>
                </div>
                {memoryPairsState?.isBombRescueActive ? (
                  <p className="text-[11px] text-amber-200 font-bold leading-snug animate-pulse">
                    ⚠️ Đã ghép phải 2 lá của cặp phạt! Mở khóa lượt giải cứu (lá thứ 3): Ghép trúng cặp thưởng để thoát hiểm. Nếu trùng cặp phạt còn lại, hệ thống sẽ hủy cặp cũ và phạt theo cặp mới!
                  </p>
                ) : (memoryPairsState?.keptBombTileIds && memoryPairsState.keptBombTileIds.length > 0) ? (
                  <p className="text-[11px] text-rose-300 font-bold leading-snug">
                    💣 Cảnh báo: Đã có {memoryPairsState.keptBombTileIds.length} lá phạt bị lộ (#{memoryPairsState.keptBombTileIds.join(", #")}) và giữ nguyên trên bàn! Tránh lật trúng lá cùng loại để né kích nổ phạt!
                  </p>
                ) : (
                  <p className="text-[11px] text-white/80 leading-snug">
                    {memoryPairsState?.round === 2
                      ? "Cảnh báo sinh tử: Đang ở Vòng 2! Nếu sau 4 lượt vẫn không tìm được cặp trùng sẽ dừng chơi và dính ngay 1 BOM trừng phạt!"
                      : "Lật 2 thẻ để tìm cặp giống nhau. Cặp trùng đầu tiên sẽ nhận thưởng. Nếu hết 4 lượt Vòng 1 sẽ được đảo vị trí và chọn làm lại lần 2!"}
                  </p>
                )}
              </div>
            )}

            {/* MEMORY PAIRS SECOND CHANCE MODAL */}
            {miniGameType === "MEMORY_PAIRS" && memoryPairsState?.promptSecondChance && (
              <div className="w-full max-w-xl mx-auto p-3 sm:p-4 rounded-2xl bg-gradient-to-b from-indigo-950/95 via-purple-950/95 to-black/95 border-2 border-amber-400/90 shadow-2xl backdrop-blur-xl animate-bounce-in text-center space-y-2 z-30">
                <div className="text-3xl animate-pulse">🔀</div>
                <h4 className="text-sm sm:text-base font-black text-amber-300 uppercase tracking-wider">
                  HẾT 4 LƯỢT VÒNG 1 — CÁC LÁ BÀI ĐÃ ĐƯỢC XÁO TRỘN!
                </h4>
                <p className="text-[11px] text-white/90 max-w-md mx-auto leading-relaxed">
                  Bạn chưa ghép được cặp nào trong Vòng 1. Không bị mất điểm!
                  <br />
                  Bạn có cơ hội <strong className="text-yellow-300">làm lại Lần 2 với 4 lượt tiếp theo</strong> (nhưng nếu trượt cả 4 lượt sẽ nhận 1 BOM phạt), hoặc <strong className="text-emerald-300">dừng chơi và nhận điểm câu hỏi (+{baseQuestionPoints || 10}đ)</strong>!
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => (onPairsDecision ? onPairsDecision("CASH_OUT") : onCashOut?.())}
                    disabled={!canInteract}
                    className="w-full sm:w-auto px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white font-black text-xs border border-emerald-300 shadow-lg cursor-pointer transition hover:scale-105 active:scale-95"
                  >
                    💰 DỪNG LẠI & NHẬN +{baseQuestionPoints || 10}Đ CÂU HỎI
                  </button>
                  <button
                    type="button"
                    onClick={() => onPairsDecision?.("PLAY_ROUND_2")}
                    disabled={!canInteract}
                    className="w-full sm:w-auto px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-rose-600 hover:from-purple-500 hover:to-rose-500 text-white font-black text-xs border border-rose-300 shadow-lg cursor-pointer transition hover:scale-105 active:scale-95"
                  >
                    🔥 CHƠI TIẾP VÒNG 2 (3 LƯỢT TIẾP THEO)
                  </button>
                </div>
              </div>
            )}

            {/* VARIANT 2: ONE SHOT DOORS HUD */}
            {(miniGameType === "ONE_SHOT_DOORS" || miniGameType === "DOORS" || miniGameType === "CHESTS") && (
              <div className="w-full max-w-xl mx-auto p-2 sm:p-2.5 rounded-xl bg-black/60 border border-amber-400/50 backdrop-blur-md shadow-xl text-center space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-black text-amber-300 uppercase tracking-wider text-[11px]">
                    🚪 4 CÁNH CỬA BÍ MẬT (2 GIAI ĐOẠN)
                  </span>
                  <span className="font-mono font-bold text-amber-300 px-2 py-0.5 rounded bg-amber-500/20 border border-amber-500/30 text-[10px]">
                    {oneShotState?.phase === "STAGE_2_PICK" || oneShotState?.phase === "SCANNED"
                      ? "✨ GIAI ĐOẠN 2: CHỌN MỞ 1 TRONG 2 CỬA ĐÃ ĐỂ RA RIÊNG"
                      : `Giai đoạn 1: Để ra riêng (${oneShotState?.selectedDoorIds?.length || 0}/2 cửa)`}
                  </span>
                </div>
                {oneShotState?.phase === "STAGE_2_PICK" || oneShotState?.phase === "SCANNED" ? (
                  <div className="space-y-1">
                    {oneShotState?.hasBombDetected ? (
                      <div className="p-1.5 sm:p-2 rounded-xl bg-red-950/80 border border-red-500/80 text-red-200 text-xs font-bold animate-pulse flex items-center justify-center gap-1.5 shadow-inner">
                        <span>⚠️ CẢNH BÁO:</span>
                        <span>Trong 2 cánh cửa bạn để ra riêng <strong>CÓ cánh cửa trừ điểm (Bẫy bom)</strong>!</span>
                      </div>
                    ) : (
                      <div className="p-1.5 sm:p-2 rounded-xl bg-emerald-950/80 border border-emerald-500/80 text-emerald-200 text-xs font-bold animate-pulse flex items-center justify-center gap-1.5 shadow-inner">
                        <span>✨ AN TOÀN TUYỆT ĐỐI:</span>
                        <span>Trong 2 cánh cửa bạn để ra riêng <strong>KHÔNG CÓ cánh cửa trừ điểm</strong> (Cả 2 đều là thưởng)!</span>
                      </div>
                    )}
                    <p className="text-[11px] text-yellow-300 font-bold leading-snug">
                      👉 Hãy chọn mở 1 trong 2 cánh cửa đã để ra riêng ĐANG SÁNG (Cửa #{oneShotState?.selectedDoorIds?.[0]} hoặc #{oneShotState?.selectedDoorIds?.[1]}) bên dưới!
                    </p>
                  </div>
                ) : (
                  <p className="text-[11px] text-white/85 leading-snug">
                    Giai đoạn 1: Hãy chọn 2 cánh cửa để <strong className="text-amber-300">ĐỂ RA RIÊNG</strong> (vẫn úp xuống, chưa lật). Hệ thống sẽ quét báo bom, và ở Giai đoạn 2 bạn sẽ mở 1 trong 2 cánh cửa này!
                  </p>
                )}
              </div>
            )}

            {/* VARIANT 4: TAROT DESTINY HUD */}
            {(miniGameType === "TAROT_DESTINY" || miniGameType === "TAROT_CARDS") && (
              <div className="w-full max-w-xl mx-auto p-2 sm:p-2.5 rounded-xl bg-black/60 border border-purple-400/50 backdrop-blur-md shadow-xl text-center">
                <div className="text-xs font-black text-purple-300 uppercase tracking-wider mb-0.5">
                  🔮 BÀI TAROT — ĐỊNH MỆNH CHỌN LÁ
                </div>
                <p className="text-[11px] text-white/80 leading-snug">
                  5 Thực Thể Cổ Xưa: Mặt Trời (+{baseQuestionPoints || 10}đ), Kẻ Khờ (0đ), Hoàng Đế (chia đều), Hiệp Sĩ (-50%), Thần Chết (Tặng/Cướp)!
                </p>
              </div>
            )}

            {/* VARIANT 3: PUSH YOUR LUCK HUD (The Classic Pot) */}
            {(miniGameType === "PUSH_YOUR_LUCK" || miniGameType === "RADAR_WINDOWS") && (
              <div className="w-full max-w-xl mx-auto p-2 sm:p-2.5 rounded-xl bg-black/60 border-2 border-amber-400/50 backdrop-blur-md shadow-2xl relative overflow-hidden">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-amber-300">
                    <span>💰</span> HŨ ĐIỂM TÍCH LŨY HIỆN TẠI
                  </div>
                  {potMultiplier > 1 && (
                    <div className="px-2 py-0.2 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-black text-[10px] uppercase tracking-widest border border-white/20 animate-pulse">
                      ⚡ X{potMultiplier}
                    </div>
                  )}
                </div>

                <div className="flex items-baseline justify-center gap-1.5 py-0.5">
                  <span className="text-2xl sm:text-3xl font-black bg-gradient-to-b from-yellow-200 via-amber-300 to-amber-500 bg-clip-text text-transparent drop-shadow-md font-mono">
                    +{potPoints.toLocaleString()}
                  </span>
                  <span className="text-xs font-black text-amber-300">điểm</span>
                </div>

                {mysteryState?.stolenPointsPot && mysteryState.stolenPointsPot > 0 ? (
                  <div className="flex justify-center">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.2 rounded-full bg-rose-500/20 border border-rose-400/50 text-rose-300 text-[10px] font-black animate-pulse shadow-sm">
                      <span>🗡️</span>
                      <span>Gồm +{mysteryState.stolenPointsPot}đ cướp từ đối thủ dẫn đầu!</span>
                    </span>
                  </div>
                ) : null}

                <div className="flex items-center justify-between text-[10px] text-white/70 pt-1 border-t border-white/10 mt-0.5">
                  <span>Đã lật: <strong className="text-white">{cardsFlippedCount}</strong> ô</span>
                  <span>Còn lại: <strong className="text-white">{tiles.filter((t) => !t.isOpened).length}</strong> ô bí ẩn</span>
                </div>
              </div>
            )}

            {/* Admin / MC Control Bar during active minigame */}
            {(isAdmin || isSandbox) && (
              <div className="w-full max-w-xl mx-auto p-2 rounded-xl bg-black/60 border border-white/10 flex items-center justify-between gap-2 text-[11px] text-slate-300">
                <span className="font-bold flex items-center gap-1 truncate">
                  <span>👑</span> Quyền Admin / MC:
                </span>
                <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                  {potPoints > 0 && onCashOut && (
                    <button
                      type="button"
                      onClick={() => onCashOut()}
                      className="px-2.5 py-1 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white font-bold cursor-pointer transition text-[11px]"
                    >
                      MC Chốt hũ (+{potPoints}đ)
                    </button>
                  )}
                  {onAdvanceTurn && (
                    <button
                      type="button"
                      onClick={onAdvanceTurn}
                      className="px-2.5 py-1 rounded-lg bg-indigo-700 hover:bg-indigo-600 text-white font-bold cursor-pointer transition text-[11px]"
                    >
                      MC Chuyển lượt ➔
                    </button>
                  )}
                  {onAdjustScore && (
                    <button
                      type="button"
                      onClick={() => setShowScoreEditModal(true)}
                      className="px-2.5 py-1 rounded-lg bg-amber-600/80 hover:bg-amber-500 text-white font-bold cursor-pointer transition text-[11px] flex items-center gap-1 shadow"
                    >
                      <span>✏️</span>
                      <span>Sửa điểm</span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Phase: TURN_SUMMARY */}
        {phase === "TURN_SUMMARY" && (
          <div className="w-full max-w-xl mx-auto text-center animate-slide-up space-y-2">
            {turnFinishedReason === "QUESTION_FAILED" ? (
              <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-b from-slate-900/95 to-black/95 border-2 border-rose-500/80 shadow-2xl space-y-1.5">
                <div className="text-3xl sm:text-4xl animate-bounce">❌</div>
                <h3 className="text-lg sm:text-xl font-black text-rose-400">TRẢ LỜI CHƯA CHÍNH XÁC!</h3>
                <p className="text-xs text-slate-300 max-w-md mx-auto">
                  Đội <strong className="text-white">{currentTurnTeamName}</strong> chưa trả lời đúng câu hỏi. Lượt thi kết thúc với 0 điểm tích lũy.
                </p>
              </div>
            ) : turnFinishedReason === "BOMB_HIT" && bombExploded ? (
              <div
                className={`p-3.5 sm:p-4 rounded-2xl bg-gradient-to-b border-2 shadow-2xl space-y-2 ${
                  bombExploded.type === "CHARITY" || bombExploded.type === "GIFT"
                    ? "from-amber-950/95 via-yellow-950/90 to-black/95 border-amber-400"
                    : bombExploded.type === "DARK" || bombExploded.type === "DOOM"
                    ? "from-purple-950/95 via-zinc-950/90 to-black/95 border-purple-500"
                    : "from-slate-900/95 via-gray-950/90 to-black/95 border-slate-400"
                }`}
              >
                <div className="text-3xl sm:text-4xl animate-bounce">
                  {bombExploded.type === "CHARITY" || bombExploded.type === "GIFT"
                    ? "🎁"
                    : bombExploded.type === "DARK" || bombExploded.type === "DOOM"
                    ? "🌑"
                    : "💨"}
                </div>
                <h3
                  className={`text-lg sm:text-xl font-black ${
                    bombExploded.type === "CHARITY" || bombExploded.type === "GIFT"
                      ? "text-amber-300"
                      : bombExploded.type === "DARK" || bombExploded.type === "DOOM"
                      ? "text-purple-300"
                      : "text-slate-200"
                  }`}
                >
                  {bombExploded.title}
                </h3>
                <p className="text-xs text-white/80 max-w-md mx-auto">{bombExploded.description}</p>
                <div
                  className={`p-2 rounded-xl border font-bold text-[11px] ${
                    bombExploded.type === "CHARITY" || bombExploded.type === "GIFT"
                      ? "bg-amber-900/40 border-amber-400/50 text-amber-200"
                      : bombExploded.type === "DARK" || bombExploded.type === "DOOM"
                      ? "bg-purple-900/40 border-purple-500/50 text-purple-200"
                      : "bg-slate-800/50 border-slate-500/50 text-slate-200"
                  }`}
                >
                  ⚠️ Hậu quả: {bombExploded.penaltyText}
                </div>

                {/* Danh sách các đội nhận điểm thưởng từ Bom Hắc Ám hoặc Bom Từ Thiện */}
                {bombExploded.recipients && bombExploded.recipients.length > 0 && (
                  <div className="pt-0.5 flex flex-wrap items-center justify-center gap-1.5">
                    <span className="text-[10px] font-bold text-purple-300/80 uppercase">Đội nhận điểm:</span>
                    {bombExploded.recipients.map((rec, idx) => (
                      <span
                        key={rec.teamId || idx}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-500/20 border border-purple-400/40 text-purple-200 text-[11px] font-black shadow-sm"
                      >
                        <span>🎁</span>
                        <span>{rec.teamName}</span>
                        <span className="text-emerald-300 font-mono">+{rec.points}đ</span>
                      </span>
                    ))}
                  </div>
                )}

                {bombExploded.recipientTeamName && (bombExploded.type === "CHARITY" || bombExploded.type === "GIFT") && (
                  <div className="pt-0.5 flex items-center justify-center gap-2">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-400/50 text-amber-200 text-[11px] font-black shadow-sm">
                      <span>🏆</span>
                      <span>{bombExploded.recipientTeamName} (Đội cao điểm nhất)</span>
                      <span className="text-emerald-300 font-mono">+{bombExploded.giftedPoints || bombExploded.deductedPoints}đ</span>
                    </span>
                  </div>
                )}
              </div>
            ) : turnFinishedReason === "ALL_CLEARED" ? (
              <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-b from-amber-950/90 to-black/90 border-2 border-amber-400 shadow-2xl space-y-1.5">
                <div className="text-3xl sm:text-4xl animate-bounce">🏆</div>
                <h3 className="text-lg sm:text-xl font-black text-amber-300">ĐẠI THẮNG QUÉT SẠCH TẤT CẢ Ô!</h3>
                <p className="text-xs text-amber-100 max-w-md mx-auto">
                  Tuyệt đỉnh! Đội {currentTurnTeamName} đã lật hết toàn bộ phần thưởng mà không dính bom!
                </p>
                <div className="p-2 rounded-xl bg-amber-500/20 border border-amber-400/50 text-amber-300 font-black text-xs">
                  {storyResult?.rewardText || "Cộng thưởng an toàn trọn vẹn!"}
                </div>
              </div>
            ) : turnFinishedReason === "PAIR_MATCHED" ? (
              <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-b from-indigo-950/90 to-black/90 border-2 border-indigo-400 shadow-2xl space-y-1.5">
                <div className="text-3xl sm:text-4xl animate-bounce">🎉</div>
                <h3 className="text-lg sm:text-xl font-black text-indigo-300">GHÉP CẶP THÀNH CÔNG!</h3>
                <p className="text-xs text-indigo-100 max-w-md mx-auto">
                  {storyResult?.rewardText || "Đã ghép chính xác cặp thẻ đầu tiên!"}
                </p>
              </div>
            ) : turnFinishedReason === "DOOR_CHOSEN" ? (
              <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-b from-amber-950/90 to-black/90 border-2 border-amber-400 shadow-2xl space-y-1.5">
                <div className="text-3xl sm:text-4xl animate-bounce">🚪</div>
                <h3 className="text-lg sm:text-xl font-black text-amber-300">CÁNH CỬA ĐÃ MỞ!</h3>
                <p className="text-xs text-amber-100 max-w-md mx-auto">
                  {storyResult?.rewardText || "Nhận thưởng thành công từ cánh cửa đã chọn!"}
                </p>
              </div>
            ) : turnFinishedReason === "TAROT_DRAWN" ? (
              <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-b from-purple-950/90 to-black/90 border-2 border-purple-400 shadow-2xl space-y-1.5">
                <div className="text-3xl sm:text-4xl animate-bounce">🔮</div>
                <h3 className="text-lg sm:text-xl font-black text-purple-300">QUẺ BÀI ĐỊNH MỆNH ĐÃ KHAI MỞ!</h3>
                <p className="text-xs text-purple-100 max-w-md mx-auto">
                  {storyResult?.rewardText || "Đã rút bài Tarot vận mệnh thành công!"}
                </p>
              </div>
            ) : turnFinishedReason === "MAX_ATTEMPTS" ? (
              <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-b from-slate-900/90 to-black/90 border-2 border-amber-500 shadow-2xl space-y-1.5">
                <div className="text-3xl sm:text-4xl animate-bounce">⏳</div>
                <h3 className="text-lg sm:text-xl font-black text-amber-400">HẾT LƯỢT LẬT THỬ!</h3>
                <p className="text-xs text-white/80 max-w-md mx-auto">
                  Đã sử dụng hết số lượt lật bài mà chưa mở được cặp trùng nhau. Lượt kết thúc với 0 điểm.
                </p>
              </div>
            ) : (
              <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-b from-emerald-950/90 to-black/90 border-2 border-emerald-400 shadow-2xl space-y-1.5">
                <div className="text-3xl sm:text-4xl animate-bounce">💰</div>
                <h3 className="text-lg sm:text-xl font-black text-emerald-300">BẢO TOÀN ĐIỂM THÀNH CÔNG!</h3>
                <p className="text-xs text-emerald-100 max-w-md mx-auto">
                  Lựa chọn sáng suốt! Đội {currentTurnTeamName} đã bảo toàn an toàn quỹ điểm về tài khoản!
                </p>
                <div className="p-2 rounded-xl bg-emerald-500/20 border border-emerald-400/50 text-emerald-300 font-black text-sm font-mono">
                  {storyResult?.rewardText || "Bảo toàn thành công!"}
                </div>
              </div>
            )}

            {/* Host Advance Bar & Status */}
            <div className="p-2.5 sm:p-3 rounded-xl bg-black/60 border border-white/10 flex flex-col sm:flex-row items-center justify-between gap-2.5">
              <span className="text-xs text-slate-300 flex items-center gap-2 font-bold">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
                {isAdmin || isSandbox ? (
                  <span>Lượt thi đã kết thúc. Vui lòng bấm nút bên cạnh để chuyển sang lượt tiếp theo.</span>
                ) : (
                  <span>Đang chờ Admin / Quản trò chuyển sang lượt hoặc câu hỏi tiếp theo...</span>
                )}
              </span>

              {(isAdmin || isSandbox) && (
                <button
                  type="button"
                  onClick={onAdvanceTurn}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black text-xs shadow-lg border border-white/20 hover:scale-105 active:scale-95 transition-all cursor-pointer whitespace-nowrap"
                >
                  CHUYỂN SANG LƯỢT TIẾP THEO ➔
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Minigame Specific Interactive Grids ── */}
      {(phase === "PUSH_YOUR_LUCK" || phase === "TURN_SUMMARY") && (
        <div className="relative z-10 mt-2">
        {/* ════════════════════════════════════════════════════════════════════
            1. VARIANT: ONE_SHOT_DOORS (4 Cánh Cửa Bí Mật - Radar Scan)
        ════════════════════════════════════════════════════════════════════ */}
        {(miniGameType === "ONE_SHOT_DOORS" || miniGameType === "DOORS" || miniGameType === "CHESTS") && (
          <div className="max-w-3xl mx-auto py-1">
            {/* Stage 2 Door Select Prompt */}
            {(oneShotState?.phase === "STAGE_2_PICK" || oneShotState?.phase === "SCANNED") && (
              <div className="mb-3 p-3 sm:p-4 rounded-2xl bg-gradient-to-b from-amber-950/95 via-yellow-950/90 to-black/95 border-2 border-yellow-400 shadow-2xl text-center space-y-2.5 animate-bounce-in max-w-xl mx-auto">
                {oneShotState?.hasBombDetected && !doorsRiskAccepted ? (
                  <>
                    <div className="text-4xl animate-bounce">⚠️💣</div>
                    <h4 className="text-xs sm:text-sm font-black text-red-400 uppercase tracking-wider">
                      CẢNH BÁO: 1 TRONG 2 CỬA ĐÃ CHỌN CHỨA BẪY BOM TRỪ ĐIỂM!
                    </h4>
                    <div className="px-3 py-1.5 rounded-xl bg-red-950/90 border border-red-500/80 text-red-200 text-xs font-bold flex items-center justify-center gap-1.5 shadow-inner animate-pulse">
                      <span>⚠️</span>
                      <span>Radar quét: Có 1 cánh cửa Bẫy Bom (-{baseQuestionPoints || 10}đ) trong 2 cửa này!</span>
                    </div>
                    <p className="text-[11px] sm:text-xs text-white/90 max-w-md mx-auto leading-relaxed">
                      Bạn có chấp nhận rủi ro 50/50 để tiếp tục mở 1 trong 2 cửa, hay muốn dừng lại rút lui an toàn nhận điểm gốc câu hỏi?
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => onDoorsDecision?.({ decision: "SAFE_EXIT" })}
                        disabled={!canInteract}
                        className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs sm:text-sm uppercase tracking-wider shadow-lg shadow-emerald-900/50 border border-emerald-400/60 active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <span>🛡️</span>
                        <span>Rút lui an toàn (+{baseQuestionPoints || 10}đ)</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setDoorsRiskAccepted(true)}
                        disabled={!canInteract}
                        className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-rose-600 hover:from-amber-500 hover:to-rose-500 text-white font-black text-xs sm:text-sm uppercase tracking-wider shadow-lg shadow-amber-900/50 border border-amber-400/60 active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-1.5 animate-pulse"
                      >
                        <span>🎲</span>
                        <span>Chấp nhận rủi ro (Mở 1 trong 2)</span>
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="text-3xl animate-pulse">🚪✨</div>
                    <h4 className="text-xs sm:text-sm font-black text-yellow-300 uppercase tracking-wider">
                      {oneShotState?.hasBombDetected
                        ? "ĐÃ CHẤP NHẬN RỦI RO! BẤM MỞ 1 TRONG 2 CÁNH CỬA:"
                        : "GIAI ĐOẠN 2: CHỌN MỞ 1 TRONG 2 CÁNH CỬA ĐÃ ĐỂ RA RIÊNG!"}
                    </h4>
                    {oneShotState?.hasBombDetected ? (
                      <div className="px-3 py-1.5 rounded-xl bg-red-950/80 border border-red-500/80 text-red-200 text-xs font-bold flex items-center justify-center gap-1.5 shadow-inner">
                        <span>⚠️</span>
                        <span>
                          {getPerkType(promoPerk) === "PEEK_PROMO"
                            ? "Radar & Mắt Thần: CÓ 1 cánh cửa Bẫy Bom! Mắt Thần đã gán nhãn cửa cộng điểm lên CẢ HAI CỬA!"
                            : "Radar phát hiện: CÓ 1 cánh cửa trừ điểm (Bẫy bom) trong 2 cửa này!"}
                        </span>
                      </div>
                    ) : (
                      <div className="px-3 py-1.5 rounded-xl bg-emerald-950/80 border border-emerald-500/80 text-emerald-200 text-xs font-bold flex items-center justify-center gap-1.5 shadow-inner animate-pulse">
                        <span>✨</span>
                        <span>
                          {getPerkType(promoPerk) === "PEEK_PROMO"
                            ? "Radar & Mắt Thần: KHÔNG CÓ bom (Cả 2 đều an toàn)! Mắt Thần đã hé lộ chức năng của 1 cánh cửa!"
                            : "Radar xác nhận: KHÔNG CÓ cánh cửa trừ điểm (Cả 2 đều an toàn)!"}
                        </span>
                      </div>
                    )}
                    <p className="text-[11px] text-white/90 max-w-md mx-auto leading-relaxed">
                      2 cánh cửa còn lại đã bị loại bỏ. Hãy bấm trực tiếp vào <strong className="text-yellow-300 underline">Cửa #{oneShotState.selectedDoorIds?.[0]}</strong> hoặc <strong className="text-yellow-300 underline">Cửa #{oneShotState.selectedDoorIds?.[1]}</strong> đang sáng bên dưới để mở!
                    </p>
                    {oneShotState?.hasBombDetected && (
                      <div className="pt-0.5">
                        <button
                          type="button"
                          onClick={() => onDoorsDecision?.({ decision: "SAFE_EXIT" })}
                          disabled={!canInteract}
                          className="px-3 py-1 rounded-lg bg-stone-800/90 hover:bg-stone-700 text-stone-300 hover:text-white text-[11px] font-bold border border-white/20 transition-all cursor-pointer"
                        >
                          🛡️ Đổi ý: Rút lui an toàn (+{baseQuestionPoints || 10}đ)
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Global SVG ClipPath for realistic door shape: arched top, pointed shield bottom */}
            <DoorClipPathDefinition />

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-4 max-w-3xl mx-auto py-2">
              {tiles.map((tile) => {
                const isSelected = Boolean(oneShotState?.selectedDoorIds?.includes(tile.id));
                const isChosenFinal = oneShotState?.chosenFinalDoorId === tile.id;
                const isBomb = tile.type !== "REWARD";
                const isSteal = tile.effectType === "STEAL_POINTS";
                const isStage2 = oneShotState?.phase === "STAGE_2_PICK" || oneShotState?.phase === "SCANNED";
                const isWaitingRiskDecision = Boolean(isStage2 && oneShotState?.hasBombDetected && !doorsRiskAccepted);

                const isCardOpened = tile.isOpened || (isStage2 && optimisticOpenedIds.has(tile.id));
                if (!isCardOpened) {
                  return (
                    <button
                      key={tile.id}
                      type="button"
                      onClick={() => handleTileClick(tile)}
                      disabled={
                        !canInteract ||
                        (isStage2 && (!isSelected || isWaitingRiskDecision))
                      }
                      style={{ clipPath: "url(#realisticDoorClip)" }}
                      className={`relative aspect-[2/3] sm:aspect-[3/4] max-h-[28vh] sm:max-h-[32vh] p-2 flex flex-col items-center justify-between transition-all duration-300 overflow-hidden ${
                        isStage2
                          ? isSelected
                            ? isWaitingRiskDecision
                              ? "scale-100 opacity-90 cursor-not-allowed"
                              : "scale-105 shadow-[0_0_35px_rgba(250,204,21,0.8)] cursor-pointer animate-pulse hover:scale-108"
                            : "opacity-25 grayscale-80 scale-95 pointer-events-none cursor-not-allowed"
                          : isSelected
                          ? "scale-102 shadow-xl cursor-pointer"
                          : canInteract
                          ? "hover:scale-103 shadow-lg hover:shadow-amber-500/50 cursor-pointer group"
                          : "opacity-60 cursor-default"
                      }`}
                    >
                      {/* Realistic Arched Door Artwork SVG */}
                      <RealisticDoorArtwork
                        doorNumber={tile.id}
                        isSelected={isSelected}
                        isStage2={isStage2}
                        isPeeked={tile.isPeeked}
                        isOpened={false}
                        canInteract={canInteract}
                        hasBombDetected={oneShotState?.hasBombDetected}
                      />

                      {/* Overlay Header: Door # and Peek Badge */}
                      <div className="w-full flex items-center justify-between z-10 px-1 pt-1.5">
                        <span className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-black/80 border border-amber-400/80 text-[10px] sm:text-[11px] font-black text-amber-200 flex items-center justify-center font-mono shadow-md">
                          #{tile.id}
                        </span>
                        {tile.isPeeked && (
                          <span className="text-[7.5px] sm:text-[8.5px] font-black text-cyan-200 px-1.5 py-0.5 rounded-full bg-cyan-950/95 border border-cyan-400 animate-pulse shadow-md flex items-center gap-1 max-w-[125px] truncate">
                            <span>👁️</span>
                            <span className="truncate">{tile.peekLabel ? `${tile.peekIcon || "✨"} ${tile.peekLabel}` : "AN TOÀN"}</span>
                          </span>
                        )}
                        {!tile.isPeeked && (
                          <>
                            {isStage2 ? (
                              isSelected ? (
                                <span className={`text-[7.5px] sm:text-[8.5px] font-black px-1.5 py-0.5 rounded-full font-extrabold ${
                                  isWaitingRiskDecision
                                    ? "bg-amber-500/80 text-black"
                                    : "bg-yellow-400 text-black animate-pulse"
                                }`}>
                                  {isWaitingRiskDecision ? "CHỜ QUYẾT ĐỊNH" : "CHỌN MỞ ✨"}
                                </span>
                              ) : (
                                <span className="text-[7px] sm:text-[8px] font-black px-1.5 py-0.5 rounded-full bg-stone-800 text-stone-400">
                                  LOẠI ❌
                                </span>
                              )
                            ) : isSelected ? (
                              <span className="text-[7.5px] sm:text-[8.5px] font-black px-1.5 py-0.5 rounded-full bg-amber-500 text-black font-extrabold">
                                ĐỂ RIÊNG ({oneShotState?.selectedDoorIds?.indexOf(tile.id)! + 1}/2) 📦
                              </span>
                            ) : canInteract ? (
                              <span className="text-[7.5px] sm:text-[8.5px] font-black text-yellow-300 animate-pulse">
                                CHỌN ✨
                              </span>
                            ) : null}
                          </>
                        )}
                      </div>

                      {/* Middle Center Emblem / Peek Indicator */}
                      <div className="z-10 my-auto text-center flex flex-col items-center">
                        {tile.isPeeked ? (
                          <div className="text-2xl sm:text-4xl animate-bounce drop-shadow-md">
                            {tile.peekIcon || "✨"}
                          </div>
                        ) : (
                          <div className={`text-2xl sm:text-4xl transition-transform duration-300 drop-shadow-md ${
                            isStage2 && isSelected && !isWaitingRiskDecision ? "scale-110 animate-pulse text-amber-300" : "group-hover:scale-110"
                          }`}>
                            {isStage2 && isSelected && !isWaitingRiskDecision ? "🗝️✨" : "🔒"}
                          </div>
                        )}
                        {tile.isPeeked && tile.peekLabel && (
                          <span className="text-[8px] sm:text-[9.5px] font-black uppercase text-cyan-200 max-w-[110px] truncate block px-1.5 py-0.5 bg-black/75 rounded border border-cyan-400/60 mt-1">
                            {tile.peekLabel}
                          </span>
                        )}
                      </div>

                      {/* Bottom Footer: Label and State */}
                      <div className="w-full text-center pb-2.5 z-10 px-0.5">
                        <span className="text-[11px] sm:text-xs font-black text-white block drop-shadow-md">
                          {tile.label}
                        </span>
                        <span className="text-[7.5px] sm:text-[8.5px] uppercase tracking-wider text-amber-300 font-extrabold block drop-shadow-sm truncate">
                          {isStage2
                            ? isSelected
                              ? isWaitingRiskDecision
                                ? "Chờ quyết định"
                                : "Đang sáng · Mở!"
                              : "Đã bị loại"
                            : isSelected
                            ? "Đã để ra riêng"
                            : "Cửa Bí Ẩn"}
                        </span>
                      </div>
                    </button>
                  );
                }

                // Revealed Door (Tròn ở trên, nhọn ở dưới)
                return (
                  <div
                    key={tile.id}
                    style={{ clipPath: "url(#realisticDoorClip)" }}
                    className={`relative aspect-[2/3] sm:aspect-[3/4] max-h-[28vh] sm:max-h-[32vh] p-2 flex flex-col items-center justify-between shadow-2xl transition-all duration-300 overflow-hidden ${
                      isChosenFinal ? "scale-104 z-10 ring-4 ring-yellow-400" : isSelected ? "opacity-90 ring-2 ring-white/30" : "opacity-70"
                    }`}
                  >
                    {/* Realistic Arched Door Artwork SVG with Opened status */}
                    <RealisticDoorArtwork
                      doorNumber={tile.id}
                      isSelected={isSelected}
                      isStage2={isStage2}
                      isOpened={true}
                      isBomb={isBomb}
                      isSteal={isSteal}
                      isChosenFinal={isChosenFinal}
                    />

                    {/* Overlay Header: Door # and Result Badge */}
                    <div className="w-full flex items-center justify-between z-10 px-1 pt-1.5">
                      <span className="text-[10px] sm:text-xs font-mono font-bold text-white/80">#{tile.id}</span>
                      <span
                        className={`text-[7.5px] sm:text-[8.5px] font-black uppercase px-2 py-0.5 rounded-full ${
                          isChosenFinal
                            ? isSteal
                              ? "bg-rose-500 text-white font-extrabold ring-1 ring-white"
                              : isBomb
                              ? "bg-red-500 text-white font-extrabold ring-1 ring-white"
                              : "bg-yellow-400 text-black font-extrabold ring-1 ring-white"
                            : isSelected
                            ? "bg-stone-700 text-stone-200"
                            : isBomb
                            ? "bg-red-500/40 text-red-300"
                            : isSteal
                            ? "bg-rose-500/40 text-rose-300"
                            : "bg-emerald-500/40 text-emerald-300"
                        }`}
                      >
                        {isChosenFinal
                          ? isSteal
                            ? "CƯỚP ĐIỂM 🗡️"
                            : isBomb
                            ? "ĐÃ MỞ BOM 💥"
                            : "ĐÃ MỞ ⭐"
                          : isSelected
                          ? "ĐỂ RA RIÊNG 📦"
                          : isBomb
                          ? "BẪY BOM (LOẠI) 💥"
                          : isSteal
                          ? "CƯỚP (LOẠI) 🗡️"
                          : "THƯỞNG (LOẠI) ⭐"}
                      </span>
                    </div>

                    {/* Prize Icon */}
                    <div className="text-3xl sm:text-5xl my-auto text-center drop-shadow-2xl z-10 animate-scale-in">
                      {isBomb ? "💥" : tile.icon || "👑"}
                    </div>

                    {/* Bottom: Story title and Points delta */}
                    <div className="w-full text-center pb-2.5 z-10 px-1">
                      <p className="text-[10px] sm:text-xs font-black text-white leading-tight truncate drop-shadow-md">
                        {tile.storyTitle}
                      </p>
                      <p
                        className={`text-xs sm:text-sm font-black font-mono mt-0.5 drop-shadow-md ${
                          isBomb ? "text-red-400" : isSteal ? "text-rose-300" : "text-amber-300"
                        }`}
                      >
                        {isBomb
                          ? `-${Math.abs(tile.deltaPoints || baseQuestionPoints || 10)}đ Tổng`
                          : isSteal
                          ? `Cướp +${tile.deltaPoints}đ`
                          : `+${tile.deltaPoints}đ`}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════════
            2. VARIANT: BÀI TAROT (Định Mệnh Chọn Lá - 5 Thực Thể Cổ Xưa)
        ════════════════════════════════════════════════════════════════════ */}
        {(miniGameType === "TAROT_DESTINY" || miniGameType === "TAROT_CARDS") && (() => {
          const isDrawn = Boolean(tarotState?.isDrawn && tarotState?.drawnCard);
          const drawnCard = tarotState?.drawnCard;

          // Color & Glow scheme for the 5 Ancient Entities
          const getEntityVisuals = (cardKey?: string) => {
            switch (cardKey) {
              case "THE_SUN":
                return {
                  gradient: "from-amber-600/30 via-yellow-500/20 to-amber-950/80",
                  border: "border-amber-400",
                  glow: "rgba(251, 191, 36, 0.6)",
                  tagColor: "bg-emerald-500/20 text-emerald-300 border-emerald-400/40",
                  textColor: "text-amber-300",
                };
              case "THE_FOOL":
                return {
                  gradient: "from-purple-950/40 via-violet-900/30 to-black/90",
                  border: "border-purple-500",
                  glow: "rgba(168, 85, 247, 0.5)",
                  tagColor: "bg-rose-500/20 text-rose-300 border-rose-400/40",
                  textColor: "text-purple-300",
                };
              case "THE_EMPEROR":
                return {
                  gradient: "from-amber-950/40 via-orange-950/30 to-black/90",
                  border: "border-orange-500",
                  glow: "rgba(249, 115, 22, 0.5)",
                  tagColor: "bg-orange-500/20 text-orange-300 border-orange-400/40",
                  textColor: "text-orange-300",
                };
              case "THE_KNIGHT":
                return {
                  gradient: "from-blue-950/40 via-indigo-950/30 to-black/90",
                  border: "border-indigo-400",
                  glow: "rgba(99, 102, 241, 0.5)",
                  tagColor: "bg-rose-500/20 text-rose-300 border-rose-400/40",
                  textColor: "text-indigo-300",
                };
              case "THE_DEATH":
              case "DEATH":
              default:
                return {
                  gradient: "from-rose-950/50 via-red-950/40 to-black/95",
                  border: "border-rose-500",
                  glow: "rgba(244, 63, 94, 0.6)",
                  tagColor: "bg-red-500/20 text-red-300 border-red-500/40",
                  textColor: "text-rose-400",
                };
            }
          };

          const cardVisual = getEntityVisuals(drawnCard?.key);

          return (
            <div className="max-w-xl mx-auto py-2">
              {!isDrawn ? (
                /* ── Trạng thái CHƯA RÚT / ĐANG QUAY: Vòng Quay Tarot 20 Nan Quạt ── */
                <div className="flex flex-col items-center justify-center p-4 sm:p-6 rounded-3xl bg-black/60 border-2 border-purple-500/40 backdrop-blur-xl shadow-2xl relative overflow-hidden group space-y-3">
                  {/* Glowing background aura */}
                  <div className="absolute inset-0 bg-radial from-purple-600/20 via-transparent to-transparent opacity-75 pointer-events-none animate-pulse" />

                  {/* Header Title */}
                  <div className="text-center z-10">
                    <h3 className="text-sm sm:text-base font-black text-amber-300 uppercase tracking-widest drop-shadow">
                      🎡 VÒNG QUAY TAROT ĐỊNH MỆNH
                    </h3>
                    <p className="text-[11px] text-purple-300 font-serif mt-0.5">
                      20 Nan Quạt Cổ Xưa • Cân Bằng Tỷ Lệ 50% - 35% - 15%
                    </p>
                  </div>

                  {/* ── SVG 20-Segment Wheel with 12 o'clock pointer ── */}
                  <div className="relative w-64 h-64 sm:w-72 sm:h-72 mx-auto my-1 flex items-center justify-center z-10">
                    {/* Pointer Needle at 12 o'clock (pointing down) */}
                    <div className={`absolute -top-3.5 left-1/2 -translate-x-1/2 z-30 filter drop-shadow-[0_4px_8px_rgba(0,0,0,0.8)] ${tarotState?.isWheelSpinning || isWheelSpinningOptimistic ? "animate-bounce" : ""}`}>
                      <svg width="32" height="32" viewBox="0 0 32 32">
                        <polygon points="6,2 26,2 16,26" fill="#ef4444" stroke="#fef08a" strokeWidth="2.5" />
                        <circle cx="16" cy="8" r="3.5" fill="#fef08a" />
                      </svg>
                    </div>

                    {/* Outer Glowing Border Ring */}
                    <div className="absolute inset-0 rounded-full border-4 border-amber-400/80 shadow-[0_0_30px_rgba(168,85,247,0.5)] pointer-events-none z-20" />

                    {/* Spinning Wheel */}
                    <div
                      className="w-full h-full rounded-full overflow-hidden shadow-2xl relative"
                      style={{
                        transform: `rotate(${tarotState?.targetAngle ?? clientWheelAngle ?? 0}deg)`,
                        transition: tarotState?.isWheelSpinning || isWheelSpinningOptimistic
                          ? `transform ${tarotState?.spinDurationMs ?? 5000}ms cubic-bezier(0.15, 0.9, 0.25, 1)`
                          : "none",
                      }}
                    >
                      <svg viewBox="0 0 340 340" className="w-full h-full select-none">
                        <defs>
                          <radialGradient id="hubGradient" cx="50%" cy="50%" r="50%">
                            <stop offset="0%" stopColor="#fbbf24" />
                            <stop offset="70%" stopColor="#b45309" />
                            <stop offset="100%" stopColor="#451a03" />
                          </radialGradient>
                        </defs>

                        {/* 20 Segments (18 deg each) */}
                        {TAROT_WHEEL_SEGMENTS.map((seg, i) => {
                          const theta1 = (i * 18 * Math.PI) / 180;
                          const theta2 = ((i + 1) * 18 * Math.PI) / 180;
                          const r = 168;
                          const cx = 170;
                          const cy = 170;
                          const x1 = cx + r * Math.sin(theta1);
                          const y1 = cy - r * Math.cos(theta1);
                          const x2 = cx + r * Math.sin(theta2);
                          const y2 = cy - r * Math.cos(theta2);
                          const midDeg = (i + 0.5) * 18;

                          return (
                            <g key={seg.index}>
                              <path
                                d={`M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2} Z`}
                                fill={seg.bgColor}
                                stroke={seg.borderColor}
                                strokeWidth="1.2"
                              />
                              <g transform={`rotate(${midDeg} ${cx} ${cy})`}>
                                <text
                                  x={cx}
                                  y={cy - 122}
                                  textAnchor="middle"
                                  fontSize="12"
                                  dominantBaseline="central"
                                  className="select-none pointer-events-none drop-shadow"
                                >
                                  {seg.icon}
                                </text>
                                <text
                                  x={cx}
                                  y={cy - 98}
                                  textAnchor="middle"
                                  fontSize="7.5"
                                  fontWeight="900"
                                  fill={seg.textColor}
                                  dominantBaseline="central"
                                  className="font-serif select-none pointer-events-none"
                                >
                                  {seg.roman}
                                </text>
                              </g>
                            </g>
                          );
                        })}

                        {/* Center Hub */}
                        <circle cx="170" cy="170" r="30" fill="#09090b" stroke="#f59e0b" strokeWidth="3" />
                        <circle cx="170" cy="170" r="24" fill="url(#hubGradient)" />
                        <circle cx="170" cy="170" r="13" fill="#09090b" stroke="#fde047" strokeWidth="1.5" />
                        <text x="170" y="174" textAnchor="middle" fontSize="13" dominantBaseline="central">
                          🔮
                        </text>
                      </svg>
                    </div>
                  </div>

                  {/* ── Ping-pong Power Gauge ── */}
                  {(() => {
                    const effectivePower = lockedPower ?? wheelPower;
                    const isSpinningActive = Boolean(tarotState?.isWheelSpinning || isWheelSpinningOptimistic);

                    const handleTriggerSpin = () => {
                      if (isSpinningActive) return;
                      const powerToLock = wheelPower;
                      setLockedPower(powerToLock);
                      setIsWheelSpinningOptimistic(true);
                      if (onSpinTarotWheel) {
                        onSpinTarotWheel(powerToLock);
                      } else if (onDrawTarot) {
                        onDrawTarot();
                      } else {
                        onFlipCard?.(0);
                      }
                    };

                    return (
                      <>
                        <div className="w-full max-w-sm mx-auto space-y-1.5 px-2 z-10">
                          <div className="flex items-center justify-between text-xs font-black">
                            <span className="text-purple-300 uppercase tracking-wider text-[11px] flex items-center gap-1">
                              ⚡ LỰC QUAY DAO ĐỘNG:
                            </span>
                            <span
                              className={`font-mono text-xs px-2 py-0.5 rounded font-black border transition-colors ${
                                effectivePower > 75
                                  ? "bg-rose-500/30 text-rose-300 border-rose-400"
                                  : effectivePower > 40
                                  ? "bg-amber-500/30 text-amber-300 border-amber-400"
                                  : "bg-emerald-500/30 text-emerald-300 border-emerald-400"
                              }`}
                            >
                              {effectivePower}%
                            </span>
                          </div>

                          {/* Gauge track */}
                          <div className="w-full h-4 rounded-full bg-black/80 border border-white/20 p-0.5 relative overflow-hidden shadow-inner">
                            <div className="absolute inset-0 flex justify-between px-2 pointer-events-none z-10 opacity-30 text-[8px] font-mono font-bold text-white items-center">
                              <span>0</span>
                              <span>25</span>
                              <span>50</span>
                              <span>75</span>
                              <span>100</span>
                            </div>
                            <div
                              style={{ width: `${effectivePower}%` }}
                              className="h-full rounded-full transition-all duration-75 bg-gradient-to-r from-emerald-500 via-yellow-400 via-orange-500 to-rose-600 shadow-[0_0_12px_rgba(245,158,11,0.6)]"
                            />
                          </div>

                          {/* Free-timing info without 20s countdown */}
                          <div className="flex items-center justify-between text-[11px] text-white/70 pt-0.5">
                            <span className="flex items-center gap-1 font-sans">
                              <span>🎯</span>
                              <span className="text-amber-300 font-medium">Chủ động chốt lực khi sẵn sàng</span>
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {isSpinningActive ? "Đã khóa lực" : "Dao động Ping-pong"}
                            </span>
                          </div>
                        </div>

                        {/* ── Spin Action Buttons ── */}
                        <div className="text-center space-y-2 z-10 w-full max-w-sm pt-1">
                          {canInteract ? (
                            <button
                              type="button"
                              onClick={handleTriggerSpin}
                              disabled={isSpinningActive}
                              className={`w-full py-3 px-6 rounded-2xl font-black text-sm uppercase tracking-wider shadow-2xl transition-all cursor-pointer border-2 ${
                                isSpinningActive
                                  ? "bg-purple-950/80 text-purple-300 border-purple-500/40 cursor-wait animate-pulse"
                                  : "bg-gradient-to-r from-purple-600 via-pink-600 to-amber-500 hover:from-purple-500 hover:to-amber-400 text-white border-amber-300/90 shadow-purple-900/60 hover:scale-[1.02] active:scale-95"
                              }`}
                            >
                              {isSpinningActive ? "🌀 ĐANG QUAY VÒNG ĐỊNH MỆNH..." : `🎯 CHỐT LỰC & QUAY (${effectivePower}%)`}
                            </button>
                          ) : (
                            <div className="py-2.5 px-4 rounded-xl bg-black/50 border border-white/10 text-xs text-slate-300 italic text-center">
                              {isSpinningActive
                                ? "🌀 Vòng quay định mệnh đang xoay..."
                                : `Đang đợi Đội ${currentTurnTeamName} chốt lực quay...`}
                            </div>
                          )}

                          {(isAdmin || isSandbox) && !isSpinningActive && (
                            <button
                              type="button"
                              onClick={handleTriggerSpin}
                              className="w-full py-1.5 px-3 rounded-xl bg-purple-900/40 hover:bg-purple-900/70 border border-purple-400/50 text-purple-200 text-xs font-bold transition cursor-pointer"
                            >
                              ⚡ Admin Quay Hộ ({effectivePower}%)
                            </button>
                          )}

                          <p className="text-[10px] text-white/60">
                            Tỷ lệ: Thường 50% (5 Sun, 5 Fool) | Đột biến 35% (4 Emperor, 3 Knight) | Chí mạng 15% (2 Steal, 1 Gift)
                          </p>
                        </div>
                      </>
                    );
                  })()}
                </div>
              ) : (
                /* ── Trạng thái ĐÃ RÚT: Hiển thị 1 Thực Thể Cổ Xưa được chọn ── */
                <div className="flex flex-col items-center justify-center p-4 sm:p-6 rounded-3xl bg-black/70 border-2 border-purple-500/50 backdrop-blur-xl shadow-2xl animate-fade-in relative overflow-hidden">
                  <div className="text-center mb-3">
                    <span className={`inline-block px-3 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${cardVisual.tagColor}`}>
                      {drawnCard?.group === "COMMON"
                        ? "✨ ĐỊNH MỆNH THƯỜNG (60%)"
                        : drawnCard?.group === "MUTATION"
                        ? "⚡ ĐỊNH MỆNH ĐỘT BIẾN (30%)"
                        : "💀 ĐỊNH MỆNH CHÍ MẠNG (10%)"}
                    </span>
                  </div>

                  {/* Main Drawn Card Artwork */}
                  <div
                    className={`relative w-48 h-72 sm:w-56 sm:h-80 rounded-2xl p-4 flex flex-col items-center justify-between border-2 shadow-2xl bg-gradient-to-b ${cardVisual.gradient} ${cardVisual.border} transition-all duration-500`}
                    style={{ boxShadow: `0 0 35px ${cardVisual.glow}, 0 0 10px rgba(255,255,255,0.2)` }}
                  >
                    {/* Roman Numeral & English name */}
                    <div className="w-full flex items-center justify-between border-b border-white/15 pb-1">
                      <span className="font-serif font-black text-sm text-amber-300 tracking-wider">
                        {drawnCard?.roman}
                      </span>
                      <span className="text-[10px] font-bold text-white/90 tracking-wider uppercase">
                        {drawnCard?.nameEn}
                      </span>
                    </div>

                    {/* Central Entity Icon Artwork */}
                    <div className="my-auto flex flex-col items-center justify-center">
                      <span className="text-6xl sm:text-7xl drop-shadow-[0_0_20px_rgba(255,255,255,0.4)] animate-bounce-in">
                        {drawnCard?.icon}
                      </span>
                    </div>

                    {/* Footer: Card Name and Concise Delta */}
                    <div className="w-full text-center space-y-1">
                      <h3 className={`text-lg sm:text-xl font-black uppercase tracking-wider ${cardVisual.textColor}`}>
                        {drawnCard?.nameVi}
                      </h3>
                      <div className="inline-flex items-center justify-center px-3 py-1 rounded-full text-xs sm:text-sm font-black font-mono shadow-lg bg-black/60 border border-white/20">
                        {drawnCard?.key === "THE_SUN" && (
                          <span className="text-emerald-400">+{drawnCard.scoreDelta}đ (An Toàn)</span>
                        )}
                        {drawnCard?.key === "THE_FOOL" && (
                          <span className="text-rose-400">0đ (Mất điểm câu)</span>
                        )}
                        {drawnCard?.key === "THE_EMPEROR" && (
                          <span className="text-orange-400">-{drawnCard.scoreDelta}đ (Chia đều đối thủ)</span>
                        )}
                        {drawnCard?.key === "THE_KNIGHT" && (
                          <span className="text-rose-400">-{drawnCard.scoreDelta}đ (Mất 1/2 tổng điểm)</span>
                        )}
                        {drawnCard && (drawnCard.key === "THE_DEATH" || (drawnCard.key as any) === "DEATH") && (drawnCard.deathSubtype === "GIFT_TOP1" || (drawnCard.deathSubtype as any) === "GIFT") && (
                          <span className="text-rose-400">-{Math.abs(drawnCard.scoreDelta)}đ ➔ Tặng {drawnCard.victimTeamName || "Top 1"}</span>
                        )}
                        {drawnCard && (drawnCard.key === "THE_DEATH" || (drawnCard.key as any) === "DEATH") && (drawnCard.deathSubtype === "STEAL_TOP1" || (drawnCard.deathSubtype as any) === "STEAL") && (
                          <span className="text-emerald-400">+{drawnCard.stolenPoints || drawnCard.scoreDelta}đ ➔ Cướp từ {drawnCard.victimTeamName || "Top 1"}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })()}

        {/* ════════════════════════════════════════════════════════════════════
            3. VARIANT: MEMORY_PAIRS (12 Cards / 6 Pairs)
        ════════════════════════════════════════════════════════════════════ */}
        {miniGameType === "MEMORY_PAIRS" && (() => {
          const effectiveMatchedPairKey = memoryPairsState?.matchedPairKey || optimisticMatchedPairKey;
          const isPairsLocked = Boolean(
            !canInteract ||
            memoryPairsState?.isMismatchResolving ||
            memoryPairsState?.promptSecondChance ||
            effectiveMatchedPairKey ||
            phase === "TURN_SUMMARY" ||
            ((memoryPairsState?.attemptsUsed ?? 0) >= (memoryPairsState?.maxAttempts ?? 4) && !memoryPairsState?.isBombRescueActive)
          );

          const shouldDimBoard = Boolean(memoryPairsState?.promptSecondChance);

          return (
            <div className={`grid grid-cols-3 sm:grid-cols-4 md:grid-cols-4 gap-2 max-w-2xl mx-auto py-1 transition-opacity duration-300 ${
              shouldDimBoard ? "opacity-40 pointer-events-none grayscale-30" : ""
            }`}>
              {tiles.map((tile) => {
                const isMatched = effectiveMatchedPairKey === tile.pairKey;
                const isBomb = tile.type !== "REWARD";

                const isCardOpened = tile.isOpened || optimisticOpenedIds.has(tile.id);
                if (!isCardOpened) {
                  return (
                    <button
                      key={tile.id}
                      type="button"
                      onClick={() => handleTileClick(tile)}
                      disabled={isPairsLocked}
                      className={`relative aspect-[4/3] max-h-[10.5vh] sm:max-h-[12.5vh] rounded-xl p-1.5 flex flex-col items-center justify-between border-2 transition-all duration-300 ${
                        !isPairsLocked
                          ? tile.isPeeked
                            ? "bg-gradient-to-b from-indigo-900/90 to-slate-950 border-emerald-400/80 ring-2 ring-emerald-400/40 hover:scale-102 shadow-xl group cursor-pointer"
                            : "bg-gradient-to-b from-indigo-900/80 to-slate-950 border-indigo-400/60 hover:border-amber-400 hover:scale-102 shadow-xl group cursor-pointer"
                          : "bg-black/40 border-white/10 opacity-75 cursor-not-allowed pointer-events-none"
                      }`}
                    >
                      <div className="w-full flex items-center justify-between">
                        <span className="w-4 h-4 rounded-full bg-black/60 border border-white/20 text-[9px] font-black text-white flex items-center justify-center font-mono">
                          #{tile.id}
                        </span>
                        {tile.isPeeked && (
                          <span className="text-[7px] font-black text-emerald-300 px-1.5 py-0.2 rounded bg-emerald-950/90 border border-emerald-400 animate-pulse shadow-md">
                            👁️ AN TOÀN ✨
                          </span>
                        )}
                      </div>

                      <div className="text-xl sm:text-2xl my-auto transition-transform duration-300 group-hover:scale-110 drop-shadow-md">
                        🃏
                      </div>

                      <div className="w-full text-center">
                        <span className="text-[9px] sm:text-[10px] font-black text-white block truncate">
                          {tile.label}
                        </span>
                      </div>
                    </button>
                  );
                }

                // Revealed Tile
              const isSteal = tile.effectType === "STEAL_POINTS";
              return (
                <div
                  key={tile.id}
                  className={`relative aspect-[4/3] max-h-[10.5vh] sm:max-h-[12.5vh] rounded-xl p-1.5 flex flex-col items-center justify-between border-2 shadow-2xl transition-all duration-200 ${
                    isMatched ? "ring-2 ring-yellow-400 scale-102 z-10" : ""
                  } ${
                    isBomb
                      ? "bg-gradient-to-b from-red-950 via-stone-950 to-black border-red-500 text-red-200"
                      : isSteal
                      ? "bg-gradient-to-b from-rose-950 via-purple-950 to-black border-rose-400 text-rose-200"
                      : "bg-gradient-to-b from-indigo-950 via-purple-950 to-black border-emerald-400 text-emerald-200"
                  }`}
                >
                  <div className="w-full flex items-center justify-between">
                    <span className="text-[9px] font-mono font-bold opacity-70">#{tile.id}</span>
                    <span
                      className={`text-[8px] font-black uppercase px-1 py-0.2 rounded ${
                        isMatched
                          ? isSteal
                            ? "bg-rose-500 text-white font-extrabold"
                            : "bg-yellow-400 text-black font-extrabold"
                          : isBomb
                          ? "bg-red-500/30 text-red-300"
                          : isSteal
                          ? "bg-rose-500/30 text-rose-300"
                          : "bg-emerald-500/30 text-emerald-300"
                      }`}
                    >
                      {isMatched ? (isSteal ? "CƯỚP! 🗡️" : "CẶP! ⭐") : isBomb ? "BOM" : isSteal ? "CƯỚP 🗡️" : "THƯỞNG"}
                    </span>
                  </div>

                  <div className="text-lg sm:text-xl my-auto text-center drop-shadow-xl">
                    {tile.icon}
                  </div>

                  <div className="w-full text-center">
                    <p className="text-[9px] sm:text-[10px] font-black text-white leading-tight truncate">
                      {tile.storyTitle}
                    </p>
                    <p
                      className={`text-[9px] sm:text-[10px] font-black font-mono mt-0.2 ${
                        isBomb ? "text-red-400" : isSteal ? "text-rose-300" : "text-amber-300"
                      }`}
                    >
                      {isBomb
                        ? `-${Math.abs(tile.deltaPoints || baseQuestionPoints || 10)}đ`
                        : isSteal
                        ? `Cướp +${tile.deltaPoints}đ`
                        : `+${tile.deltaPoints}đ`}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        );
      })()}

        {/* ════════════════════════════════════════════════════════════════════
            4. VARIANT: PUSH_YOUR_LUCK (Chồng Bài Xếp Lớp Vô Hạn Né Bom)
        ════════════════════════════════════════════════════════════════════ */}
        {(miniGameType === "PUSH_YOUR_LUCK" || miniGameType === "RADAR_WINDOWS") && phase === "PUSH_YOUR_LUCK" && (() => {
          const unopenedTile = tiles.find((t) => !t.isOpened && !optimisticOpenedIds.has(t.id));
          const openedTiles = tiles.filter((t) => t.isOpened || optimisticOpenedIds.has(t.id));
          const latestCard = lastFlippedTile || (openedTiles.length > 0 ? openedTiles[openedTiles.length - 1] : undefined);
          const nextCardNum = unopenedTile?.id ?? (cardsFlippedCount + 1);

          return (
            <div className="flex flex-col items-center justify-center space-y-2 sm:space-y-2.5 max-w-lg mx-auto py-1">
              {nextCardPeek && (
                <div className="w-full max-w-md px-3 py-1.5 rounded-xl bg-cyan-950/80 border border-cyan-400 text-cyan-200 text-xs font-bold flex items-center justify-between shadow-lg animate-pulse">
                  <span className="flex items-center gap-1.5 truncate">
                    <span>👁️</span>
                    <span>Mắt Thần Soi Đỉnh Bài:</span>
                    <strong className="text-white truncate">{nextCardPeek.icon} {nextCardPeek.storyTitle}</strong>
                  </span>
                  <span className={`shrink-0 ml-1.5 px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                    nextCardPeek.isBomb ? "bg-red-500/40 text-red-300 border border-red-400" : "bg-emerald-500/40 text-emerald-300 border border-emerald-400"
                  }`}>
                    {nextCardPeek.isBomb ? "💥 BẪY BOM!" : "✨ AN TOÀN!"}
                  </span>
                </div>
              )}
              {(peekUsesRemaining ?? 0) > 0 && !nextCardPeek && (
                <div className="w-full max-w-md px-3 py-1 rounded-xl bg-cyan-950/80 border border-cyan-400 text-cyan-200 text-[11px] font-bold flex items-center justify-center gap-1.5 shadow-md">
                  <span>👁️ Mắt Thần Chủ Động:</span>
                  <span className="text-white">Bạn có {peekUsesRemaining} lượt chủ động bấm soi trước lá bài trên đỉnh!</span>
                </div>
              )}
              {getPerkType(promoPerk) === "SAFETY_NET_PROMO" && (
                <div className="w-full max-w-md px-3 py-1 rounded-xl bg-blue-950/80 border border-blue-400 text-blue-200 text-[11px] font-bold flex items-center justify-center gap-1.5 shadow-md">
                  <span>🧲 Két Sắt Bảo Lưu:</span>
                  <span className="text-white">Bảo lưu 50% quỹ điểm nếu không may dính bom!</span>
                </div>
              )}
              {/* ── 2 Main Card Areas: Deck & Latest Drawn Card ── */}
              <div className="grid grid-cols-2 gap-2.5 sm:gap-4 items-center justify-center w-full max-w-md">
                {/* ── LEFT: CHỒNG BÀI RÚT (STACKED DECK) ── */}
                <div className="flex flex-col items-center">
                  <div className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-amber-300 mb-1 flex items-center gap-1">
                    <span>📚</span> BÀI RÚT (VÔ HẠN)
                  </div>

                  {/* 3D Stack container */}
                  <div
                    className="relative group cursor-pointer"
                    onClick={() => {
                      if (unopenedTile) {
                        handleTileClick(unopenedTile);
                      } else {
                        handleTileClick({
                          id: nextCardNum,
                          label: `Lá #${nextCardNum}`,
                          icon: "🃏",
                          isOpened: false,
                          type: "REWARD",
                          storyTitle: "Rút bài bí ẩn",
                          storyDescription: "",
                          effectType: "BONUS_POINTS",
                          deltaPoints: 20,
                        });
                      }
                    }}
                  >
                    {/* Depth shadow layer 3 */}
                    <div className="absolute inset-0 translate-x-2 translate-y-2 rounded-xl bg-indigo-950/70 border border-white/10 shadow-lg pointer-events-none" />
                    {/* Depth shadow layer 2 */}
                    <div className="absolute inset-0 translate-x-1 translate-y-1 rounded-xl bg-purple-950/80 border border-white/15 shadow-xl pointer-events-none" />

                    {/* Top card of the stack */}
                    <div
                      className={`relative w-28 sm:w-36 aspect-[3/4] max-h-[19vh] sm:max-h-[23vh] rounded-xl sm:rounded-2xl p-2 flex flex-col items-center justify-between border-2 transition-all duration-300 shadow-2xl ${
                        canInteract
                          ? "bg-gradient-to-b from-indigo-900 via-purple-950 to-slate-950 border-amber-400/80 hover:border-yellow-300 hover:-translate-y-1 hover:shadow-amber-500/40 active:scale-95 group-hover:scale-102"
                          : "bg-black/60 border-white/10 opacity-70 cursor-default"
                      } ${isDrawingAnimation ? "-translate-y-4 rotate-2 scale-105 ring-4 ring-amber-300" : ""}`}
                    >
                      <div className="w-full flex items-center justify-between text-[10px] font-mono font-bold text-amber-300">
                        <span>#{nextCardNum}</span>
                        <span className="text-[8px] uppercase font-bold text-white/70 px-1 py-0.2 rounded bg-black/40 border border-white/10">
                          Chồng bài
                        </span>
                      </div>

                      <div className="text-2xl sm:text-3xl my-auto text-center drop-shadow-xl transition-transform duration-300 group-hover:scale-110 animate-pulse">
                        🃏
                      </div>

                      <div className="w-full text-center">
                        <span className="text-[11px] sm:text-xs font-black text-white block">
                          Lá #{nextCardNum}
                        </span>
                        {canInteract && (
                          <span className="text-[8px] font-extrabold text-amber-300 uppercase tracking-widest mt-0.5 block animate-bounce">
                            CLICK RÚT ✨
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* ── RIGHT: LÁ BÀI VỪA RÚT (DRAWN CARD) ── */}
                <div className="flex flex-col items-center">
                  <div className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-emerald-300 mb-1 flex items-center gap-1">
                    <span>✨</span> LÁ VỪA RÚT
                  </div>

                  {latestCard ? (
                    <div
                      className={`w-28 sm:w-36 aspect-[3/4] max-h-[19vh] sm:max-h-[23vh] rounded-xl sm:rounded-2xl p-2 flex flex-col items-center justify-between border-2 shadow-2xl animate-fade-in relative ${
                        latestCard.type === "BOMB_DARK" || latestCard.type === "BOMB_DOOM"
                          ? "bg-gradient-to-b from-purple-950 via-black to-red-950 border-purple-500 text-purple-200 ring-2 ring-purple-500/40"
                          : latestCard.type === "BOMB_CHARITY" || latestCard.type === "BOMB_GIFT"
                          ? "bg-gradient-to-b from-amber-950 via-yellow-950 to-black border-amber-400 text-amber-200 ring-2 ring-amber-400/40"
                          : latestCard.type === "BOMB_SMOKE" || latestCard.type === "BOMB_MINOR"
                          ? "bg-gradient-to-b from-slate-900 via-stone-950 to-black border-slate-500 text-slate-200 ring-2 ring-slate-500/40"
                          : latestCard.effectType === "STEAL_POINTS"
                          ? "bg-gradient-to-b from-rose-950 via-purple-950 to-black border-rose-400 text-rose-200 ring-2 ring-rose-500/40"
                          : "bg-gradient-to-b from-amber-950/90 via-emerald-950/80 to-black border-emerald-400 text-emerald-200 ring-2 ring-emerald-400/30"
                      }`}
                    >
                      <div className="w-full flex items-center justify-between text-[10px]">
                        <span className="font-mono font-bold opacity-75">#{latestCard.id}</span>
                        <span
                          className={`text-[7px] font-black uppercase px-1.5 py-0.2 rounded-full ${
                            latestCard.type === "BOMB_DARK" || latestCard.type === "BOMB_DOOM"
                              ? "bg-purple-500/30 text-purple-300 border border-purple-400/50"
                              : latestCard.type === "BOMB_CHARITY" || latestCard.type === "BOMB_GIFT"
                              ? "bg-amber-500/30 text-amber-300 border border-amber-400/50"
                              : latestCard.type === "BOMB_SMOKE" || latestCard.type === "BOMB_MINOR"
                              ? "bg-slate-500/30 text-slate-300 border border-slate-400/50"
                              : latestCard.effectType === "STEAL_POINTS"
                              ? "bg-rose-500/30 text-rose-300 border border-rose-400/50"
                              : "bg-emerald-500/30 text-emerald-300 border border-emerald-400/50"
                          }`}
                        >
                          {latestCard.type === "BOMB_DARK" || latestCard.type === "BOMB_DOOM"
                            ? "BOM HẮC ÁM"
                            : latestCard.type === "BOMB_CHARITY" || latestCard.type === "BOMB_GIFT"
                            ? "BOM TỪ THIỆN"
                            : latestCard.type === "BOMB_SMOKE" || latestCard.type === "BOMB_MINOR"
                            ? "BOM KHÓI"
                            : latestCard.effectType === "STEAL_POINTS"
                            ? "CƯỚP 🗡️"
                            : "THƯỞNG"}
                        </span>
                      </div>

                      <div className="text-2xl sm:text-3xl my-auto text-center drop-shadow-xl">
                        {latestCard.icon}
                      </div>

                      <div className="w-full text-center">
                        <p className="text-[10px] sm:text-xs font-black text-white leading-tight truncate">
                          {latestCard.storyTitle}
                        </p>
                        <p
                          className={`text-[10px] sm:text-xs font-black font-mono mt-0.2 ${
                            latestCard.type === "BOMB_DARK" || latestCard.type === "BOMB_DOOM"
                              ? "text-purple-300"
                              : latestCard.type === "BOMB_CHARITY" || latestCard.type === "BOMB_GIFT"
                              ? "text-amber-300"
                              : latestCard.type === "BOMB_SMOKE" || latestCard.type === "BOMB_MINOR"
                              ? "text-slate-300"
                              : latestCard.effectType === "MULTIPLY_X2"
                              ? "text-purple-300"
                              : latestCard.effectType === "STEAL_POINTS"
                              ? "text-rose-300"
                              : "text-amber-300"
                          }`}
                        >
                          {latestCard.type === "BOMB_DARK" || latestCard.type === "BOMB_DOOM"
                            ? "Trừ Điểm Chia Đều"
                            : latestCard.type === "BOMB_CHARITY" || latestCard.type === "BOMB_GIFT"
                            ? "Tặng 50% Cho #1"
                            : latestCard.type === "BOMB_SMOKE" || latestCard.type === "BOMB_MINOR"
                            ? "Mất Hũ (0đ)"
                            : latestCard.effectType === "MULTIPLY_X2"
                            ? "X2 HŨ ĐIỂM"
                            : latestCard.effectType === "STEAL_POINTS"
                            ? `Cướp +${latestCard.deltaPoints}đ`
                            : `+${latestCard.deltaPoints}đ`}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="w-28 sm:w-36 aspect-[3/4] max-h-[19vh] sm:max-h-[23vh] rounded-xl sm:rounded-2xl p-2 border-2 border-dashed border-white/20 flex flex-col items-center justify-center text-center text-white/50 bg-black/20">
                      <span className="text-2xl mb-1">📭</span>
                      <span className="text-[11px] font-bold text-white/80">Chưa rút lá nào</span>
                      <span className="text-[9px] text-white/40 mt-0.5">
                        Rút lá đầu tiên!
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* ── ACTION BUTTONS: RÚT TIẾP & CHỐT ĐIỂM ── */}
              {canInteract && (
                <div className="flex flex-wrap items-center justify-center gap-2 pt-0.5">
                  <button
                    type="button"
                    onClick={() => {
                      if (unopenedTile) {
                        handleTileClick(unopenedTile);
                      } else {
                        handleTileClick({
                          id: nextCardNum,
                          label: `Lá #${nextCardNum}`,
                          icon: "🃏",
                          isOpened: false,
                          type: "REWARD",
                          storyTitle: "Rút bài bí ẩn",
                          storyDescription: "",
                          effectType: "BONUS_POINTS",
                          deltaPoints: 20,
                        });
                      }
                    }}
                    className="px-4 sm:px-5 py-2 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black text-xs sm:text-sm shadow-xl border border-purple-400 hover:scale-105 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>🃏</span>
                    <span>RÚT 1 LÁ (#{nextCardNum})</span>
                  </button>

                  {canCashOut && (
                    <button
                      type="button"
                      disabled={isCashingOut}
                      onClick={() => {
                        if (isCashingOut) return;
                        setIsCashingOut(true);
                        onCashOut?.();
                      }}
                      className={`px-4 sm:px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 via-green-500 to-emerald-600 hover:from-emerald-500 hover:to-green-400 text-white font-black text-xs sm:text-sm shadow-xl border border-emerald-300 transition-all flex items-center gap-1.5 ${
                        isCashingOut
                          ? "opacity-60 cursor-not-allowed scale-95"
                          : "hover:scale-105 active:scale-95 cursor-pointer animate-pulse"
                      }`}
                    >
                      <span>{isCashingOut ? "⏳" : "💰"}</span>
                      <span>{isCashingOut ? "ĐANG CHỐT..." : `CHỐT ĐIỂM (+${potPoints}Đ)`}</span>
                    </button>
                  )}

                  {canInteract && (peekUsesRemaining ?? 0) > 0 && !nextCardPeek && (
                    <button
                      type="button"
                      onClick={() => onUsePeek?.()}
                      className="px-4 sm:px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-600 via-teal-600 to-cyan-600 hover:from-cyan-500 hover:to-teal-500 text-white font-black text-xs sm:text-sm shadow-xl border border-cyan-300 hover:scale-105 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer animate-pulse"
                    >
                      <span>👁️</span>
                      <span>SOI ĐỈNH BÀI ({peekUsesRemaining})</span>
                    </button>
                  )}
                </div>
              )}

              {/* ── DRAW HISTORY TRAIL ── */}
              {openedTiles.length > 0 && (
                <div className="w-full max-w-md mx-auto p-2 rounded-xl bg-black/40 border border-white/10 text-left max-h-16 overflow-y-auto">
                  <span className="text-[10px] font-bold text-white/60 uppercase tracking-wider block mb-1">
                    📜 LỊCH SỬ ({openedTiles.length} lá):
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {openedTiles.map((t, idx) => (
                      <span
                        key={t.id || idx}
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${
                          t.type !== "REWARD"
                            ? "bg-red-950/60 border-red-500/50 text-red-300"
                            : "bg-emerald-950/60 border-emerald-500/50 text-emerald-300"
                        }`}
                      >
                        <span>{t.icon}</span>
                        <span>#{t.id}:</span>
                        <span>
                          {t.type !== "REWARD"
                            ? t.type === "BOMB_DARK" || t.type === "BOMB_DOOM"
                              ? "Hắc Ám"
                              : t.type === "BOMB_CHARITY" || t.type === "BOMB_GIFT"
                              ? "Từ Thiện"
                              : "Khói"
                            : t.effectType === "MULTIPLY_X2"
                            ? "x2"
                            : `+${t.deltaPoints}đ`}
                        </span>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })()}
        </div>
      )}

      {/* ── Modal Chọn Đội Cướp Điểm (STEAL_TARGET_SELECT) ── */}
      {phase === "STEAL_TARGET_SELECT" && mysteryState.pendingSteal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-fade-in">
          <div className="glass bg-gradient-to-br from-rose-950/95 via-purple-950/95 to-slate-950/95 border-2 border-rose-500 rounded-3xl p-6 sm:p-8 max-w-lg w-full text-center shadow-[0_0_60px_rgba(244,63,94,0.4)] animate-bounce-in space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-rose-500/20 border-2 border-rose-400 flex items-center justify-center text-3xl shadow-inner animate-pulse">
              {mysteryState.pendingSteal.tileIcon || "🗡️"}
            </div>

            <div className="space-y-1">
              <span className="px-3 py-1 rounded-full bg-rose-500/30 border border-rose-400/50 text-rose-300 font-black text-xs uppercase tracking-widest">
                KÍCH HOẠT THẺ CƯỚP ĐIỂM
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-white pt-1">
                {mysteryState.pendingSteal.tileTitle || "Đoạt Bảo Thành Công!"}
              </h2>
              <p className="text-sm text-rose-200/90 font-medium">
                Được quyền cướp <strong className="text-yellow-300 font-mono text-base font-black">+{mysteryState.pendingSteal.stolenPoints}đ</strong> từ một đối thủ đủ điều kiện!
              </p>
            </div>

            {/* Danh sách các đội đủ điều kiện để cướp */}
            <div className="space-y-2 max-h-56 overflow-y-auto pt-2">
              <p className="text-xs font-bold text-white/60 uppercase tracking-wider text-left">
                CHỌN ĐỐI THỦ ĐỂ CƯỚP (ĐIỂM ≥ {mysteryState.pendingSteal.stolenPoints}Đ):
              </p>
              {(() => {
                const eligibleTeams = (teams || []).filter((t) =>
                  mysteryState.pendingSteal?.eligibleTeamIds?.includes(t.id)
                );
                if (eligibleTeams.length === 0) {
                  return (
                    <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-xs text-white/70">
                      Không có đối thủ nào đủ điều kiện cướp điểm.
                    </div>
                  );
                }
                return eligibleTeams.map((t) => {
                  const afterScore = Math.max(0, t.score - (mysteryState.pendingSteal?.stolenPoints || 0));
                  return (
                    <div
                      key={t.id}
                      className="flex items-center justify-between p-3 rounded-2xl bg-white/10 border border-white/15 hover:border-rose-400/60 transition group"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className="w-3.5 h-3.5 rounded-full shrink-0 shadow"
                          style={{ backgroundColor: t.color }}
                        />
                        <div className="text-left min-w-0">
                          <p className="font-bold text-sm text-white truncate">{t.name}</p>
                          <p className="text-xs text-slate-300 font-mono">
                            Hiện có: <strong className="text-amber-300">{t.score}đ</strong> ➔ Còn: <span className="text-rose-300 font-bold">{afterScore}đ</span>
                          </p>
                        </div>
                      </div>

                      {(isMyTurn || isAdmin || isSandbox) ? (
                        <button
                          type="button"
                          onClick={() => onChooseStealTarget?.(t.id)}
                          className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-black text-xs shadow-md border border-rose-400 hover:scale-105 active:scale-95 transition cursor-pointer shrink-0"
                        >
                          CƯỚP 🗡️
                        </button>
                      ) : (
                        <span className="text-xs text-white/40 italic">Đang chờ chọn...</span>
                      )}
                    </div>
                  );
                });
              })()}
            </div>

            {!(isMyTurn || isAdmin || isSandbox) && (
              <p className="text-xs text-slate-400 italic animate-pulse">
                Đang chờ Đội {currentTurnTeamName} lựa chọn đối thủ để cướp điểm...
              </p>
            )}
          </div>
        </div>
      )}

      {/* ── Footer Standings / Quick Score Bar ── */}
      {teams && teams.length > 0 && (
        <div className="relative z-10 mt-2 pt-2 border-t border-white/10 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-white/60 font-semibold uppercase tracking-wider text-[11px]">
              BẢNG ĐIỂM TRẬN ĐẤU:
            </span>
            {(isAdmin || isSandbox) && onAdjustScore && (
              <button
                type="button"
                onClick={() => setShowScoreEditModal(true)}
                className="px-2 py-0.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-[10px] font-bold cursor-pointer transition flex items-center gap-1"
                title="Chỉnh sửa điểm thủ công cho các đội thi"
              >
                <span>✏️</span>
                <span>Sửa điểm</span>
              </button>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {teams.map((t) => {
              const currentHearts = t.hearts ?? mysteryState?.teamHearts?.[t.id] ?? mysteryState?.initialHeartsPerTeam ?? 0;

              // Calculate specific score delta for this team if Tarot was drawn
              let tarotDelta: number | null = null;
              if (miniGameType === "TAROT_DESTINY" && tarotState?.isDrawn && tarotState?.drawnCard) {
                const dc = tarotState.drawnCard;
                if (t.id === currentTurnTeamId) {
                  if (dc.key === "THE_SUN") tarotDelta = dc.scoreDelta;
                  else if (dc.key === "THE_FOOL") tarotDelta = 0;
                  else if (dc.key === "THE_EMPEROR" || dc.key === "THE_KNIGHT") tarotDelta = -dc.scoreDelta;
                  else if ((dc.key === "THE_DEATH" || (dc.key as any) === "DEATH") && (dc.deathSubtype === "GIFT_TOP1" || (dc.deathSubtype as any) === "GIFT")) tarotDelta = -Math.abs(dc.scoreDelta);
                  else if ((dc.key === "THE_DEATH" || (dc.key as any) === "DEATH") && (dc.deathSubtype === "STEAL_TOP1" || (dc.deathSubtype as any) === "STEAL")) tarotDelta = dc.stolenPoints || dc.scoreDelta;
                } else {
                  if (dc.key === "THE_EMPEROR") {
                    const rec = dc.darkBombRecipients?.find((r) => r.teamId === t.id);
                    if (rec) tarotDelta = rec.points;
                  } else if ((dc.key === "THE_DEATH" || (dc.key as any) === "DEATH") && (dc.deathSubtype === "GIFT_TOP1" || (dc.deathSubtype as any) === "GIFT") && t.id === dc.victimTeamId) {
                    tarotDelta = dc.giftedPoints || Math.abs(dc.scoreDelta);
                  } else if ((dc.key === "THE_DEATH" || (dc.key as any) === "DEATH") && (dc.deathSubtype === "STEAL_TOP1" || (dc.deathSubtype as any) === "STEAL") && t.id === dc.victimTeamId) {
                    tarotDelta = -(dc.stolenPoints || dc.scoreDelta);
                  }
                }
              }

              return (
                <div
                  key={t.id}
                  onClick={() => {
                    if ((isAdmin || isSandbox) && onAdjustScore) {
                      setShowScoreEditModal(true);
                    }
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-xl border transition relative ${
                    (isAdmin || isSandbox) && onAdjustScore ? "cursor-pointer hover:border-amber-400/60" : ""
                  } ${
                    t.id === currentTurnTeamId
                      ? "bg-white/15 border-white/40 text-white font-bold"
                      : "bg-black/30 border-white/10 text-white/70"
                  }`}
                  title={(isAdmin || isSandbox) && onAdjustScore ? `Nhấp để sửa điểm cho ${t.name}` : undefined}
                >
                  <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: t.color }} />
                  <span>{t.name}:</span>
                  <span className="font-mono font-bold text-amber-300">{t.score.toLocaleString()}đ</span>
                  <span className="flex items-center gap-0.5 text-xs text-rose-400 font-bold ml-1 bg-rose-950/40 px-1.5 py-0.5 rounded-md border border-rose-500/30" title={`${currentHearts} Tim`}>
                    ❤️ {currentHearts}
                  </span>
                  {/* Floating brief score delta indicator for Divine Eye / Mắt Thần */}
                  {tarotDelta !== null && tarotDelta !== 0 && (
                    <span
                      className={`ml-1 font-mono font-black text-xs px-1.5 py-0.5 rounded-md border animate-bounce ${
                        tarotDelta > 0
                          ? "bg-emerald-500/30 text-emerald-300 border-emerald-400"
                          : "bg-rose-500/30 text-rose-300 border-rose-400"
                      }`}
                    >
                      {tarotDelta > 0 ? `+${tarotDelta}` : `${tarotDelta}`}
                    </span>
                  )}
                  {(isAdmin || isSandbox) && onAdjustScore && (
                    <span className="text-[9px] text-amber-400/80 ml-0.5">✏️</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Modal Chỉnh Sửa Điểm Thủ Công (Admin / MC) ── */}
      {showScoreEditModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-[#14162a] border border-amber-400/50 rounded-2xl p-5 shadow-2xl text-white space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">✏️</span>
                <h3 className="font-black text-sm uppercase tracking-wider text-amber-300">
                  Chỉnh sửa điểm thủ công (Admin / MC)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowScoreEditModal(false)}
                className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/70 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-white/70 leading-relaxed">
              Tính năng can thiệp trực tiếp dành cho Host/MC để điều chỉnh hoặc khắc phục điểm số ngay lập tức khi phát sinh sự cố.
            </p>

            <div className="space-y-2.5 max-h-[60vh] overflow-y-auto pr-1">
              {teams.map((t) => (
                <div
                  key={t.id}
                  className="p-3 rounded-xl bg-black/40 border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-3.5 h-3.5 rounded-full shrink-0" style={{ backgroundColor: t.color }} />
                    <div>
                      <span className="font-bold text-xs">{t.name}</span>
                      <span className="block font-mono font-black text-amber-300 text-sm">{t.score}đ</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      type="button"
                      onClick={() => onAdjustScore?.(t.id, 10)}
                      className="px-2 py-1 rounded-lg bg-emerald-700/80 hover:bg-emerald-600 text-white font-mono font-bold text-xs cursor-pointer active:scale-95 transition"
                    >
                      +10
                    </button>
                    <button
                      type="button"
                      onClick={() => onAdjustScore?.(t.id, 20)}
                      className="px-2 py-1 rounded-lg bg-emerald-700/80 hover:bg-emerald-600 text-white font-mono font-bold text-xs cursor-pointer active:scale-95 transition"
                    >
                      +20
                    </button>
                    <button
                      type="button"
                      onClick={() => onAdjustScore?.(t.id, -10)}
                      className="px-2 py-1 rounded-lg bg-rose-700/80 hover:bg-rose-600 text-white font-mono font-bold text-xs cursor-pointer active:scale-95 transition"
                    >
                      -10
                    </button>
                    <button
                      type="button"
                      onClick={() => onAdjustScore?.(t.id, -20)}
                      className="px-2 py-1 rounded-lg bg-rose-700/80 hover:bg-rose-600 text-white font-mono font-bold text-xs cursor-pointer active:scale-95 transition"
                    >
                      -20
                    </button>

                    <div className="flex items-center gap-1 ml-1">
                      <input
                        type="number"
                        min={0}
                        step={5}
                        defaultValue={t.score}
                        id={`mystery-score-input-${t.id}`}
                        className="w-16 px-1.5 py-1 rounded-lg bg-black/60 border border-amber-400/50 text-amber-200 text-xs font-mono font-bold text-center focus:outline-none focus:ring-1 focus:ring-amber-400"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const input = document.getElementById(`mystery-score-input-${t.id}`) as HTMLInputElement;
                          if (input) {
                            const val = parseInt(input.value, 10);
                            if (!isNaN(val)) onAdjustScore?.(t.id, undefined, val);
                          }
                        }}
                        className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs cursor-pointer shadow active:scale-95 transition"
                      >
                        Đặt
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={() => setShowScoreEditModal(false)}
                className="px-4 py-1.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-white font-bold text-xs cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
