"use client";

import React, { useState, useEffect, useRef } from "react";
import { MysteryQuestState, MysteryTile, MysteryMiniGameType } from "@/types";
import { MYSTERY_THEMES } from "@/lib/game-engine/mystery-quest";
import { TarotCardBackSvg, TarotCardEmblem, getTarotCardMeta } from "./TarotCardGraphic";

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
  teams?: Array<{ id: string; name: string; color: string; score: number }>;
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
  teams = [],
}: Props) {
  const [flippingTileId, setFlippingTileId] = useState<number | null>(null);
  const [optimisticOpenedIds, setOptimisticOpenedIds] = useState<Set<number>>(new Set());
  const [isDrawingAnimation, setIsDrawingAnimation] = useState<boolean>(false);
  const [isCashingOut, setIsCashingOut] = useState<boolean>(false);
  const isFlippingRef = useRef<boolean>(false);

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
  } = mysteryState;

  // Sync optimistic set with actual opened tiles from server
  useEffect(() => {
    setOptimisticOpenedIds(new Set(tiles.filter((t) => t.isOpened).map((t) => t.id)));
  }, [tiles]);

  useEffect(() => {
    setIsCashingOut(false);
  }, [phase, potPoints]);

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
    if (!canInteract || tile.isOpened || optimisticOpenedIds.has(tile.id) || isFlippingRef.current) return;
    if (memoryPairsState?.isMismatchResolving) return;

    isFlippingRef.current = true;
    // Instant optimistic visual feedback (<16ms)
    setOptimisticOpenedIds((prev) => new Set(prev).add(tile.id));
    setFlippingTileId(tile.id);
    if (miniGameType === "PUSH_YOUR_LUCK" || miniGameType === "RADAR_WINDOWS") {
      setIsDrawingAnimation(true);
      setTimeout(() => setIsDrawingAnimation(false), 450);
    }
    setTimeout(() => {
      setFlippingTileId(null);
      isFlippingRef.current = false;
    }, 550);

    onFlipCard?.(tile.id);
  };

  const getVariantLabel = () => {
    switch (miniGameType) {
      case "MEMORY_PAIRS":
        return { title: "🃏 Lật Cặp Trùng Nhau", badge: "Memory Pair" };
      case "ONE_SHOT_DOORS":
      case "DOORS":
      case "CHESTS":
        return { title: "🚪 Chọn 1 Trong 3 Cửa", badge: "Single Pick" };
      case "TAROT_DESTINY":
      case "TAROT_CARDS":
        return { title: "🔮 Rút Thẻ Bài Tarot Thần Số", badge: "Tarot of Destiny" };
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
            { key: "ONE_SHOT_DOORS", label: "🚪 3 Cửa", icon: "🚪" },
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
              <div className="p-3 sm:p-4 rounded-2xl bg-gradient-to-b from-emerald-950/80 via-black/80 to-emerald-950/80 border-2 border-emerald-400/60 shadow-xl flex flex-col justify-between text-center relative overflow-hidden group hover:border-emerald-300 transition-all">
                <div className="space-y-1 sm:space-y-1.5">
                  <div className="text-2xl sm:text-3xl">🛡️</div>
                  <h4 className="text-xs sm:text-sm font-black text-emerald-300 uppercase tracking-wide">
                    Phương Án 1: Nhận An Toàn
                  </h4>
                  <div className="py-0.5">
                    <span className="text-2xl sm:text-4xl font-black font-mono text-emerald-400">
                      +{baseQuestionPoints || 10}
                    </span>
                    <span className="text-emerald-300 font-bold ml-1 text-xs sm:text-sm">điểm</span>
                  </div>
                  <p className="text-[10px] sm:text-xs text-white/70 leading-snug line-clamp-2">
                    Nhận trọn vẹn điểm số câu hỏi trực tiếp vào bảng điểm. Tỉ lệ an toàn 100%, không lo bom nổ.
                  </p>
                </div>

                <div className="pt-2 sm:pt-3">
                  {canInteractDecision ? (
                    <button
                      type="button"
                      onClick={() => onChooseAction?.("TAKE_BASE_POINTS")}
                      className="w-full py-2 sm:py-2.5 px-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-black text-xs sm:text-sm uppercase tracking-wider shadow-lg shadow-emerald-900/50 border border-emerald-300 hover:scale-[1.02] active:scale-95 transition cursor-pointer"
                    >
                      🛡️ Chốt +{baseQuestionPoints || 10}đ An Toàn
                    </button>
                  ) : (
                    <div className="py-1.5 px-2 rounded-lg bg-black/40 border border-white/10 text-[10px] sm:text-xs text-slate-400 italic">
                      Đang đợi Đội {currentTurnTeamName}...
                    </div>
                  )}
                </div>
              </div>

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
                            <span className="truncate">Tặng 01 Khiên Chặn Bom!</span>
                          </>
                        )}
                        {perkType === "EXTRA_POT_PROMO" && (
                          <>
                            <span>🎁</span>
                            <span className="truncate">Quỹ thưởng +5đ ban đầu!</span>
                          </>
                        )}
                        {perkType === "DOUBLE_PROMO" && (
                          <>
                            <span>⚡</span>
                            <span className="truncate">Tăng tỉ lệ x2 điểm quỹ!</span>
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
                <div className="flex items-center gap-1.5 shrink-0">
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
                    🃏 THỬ THÁCH LẬT CẶP TRÙNG NHAU (10 THẺ)
                  </span>
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                        memoryPairsState?.round === 2
                          ? "bg-rose-500/30 text-rose-300 border border-rose-500/50 animate-pulse"
                          : "bg-indigo-500/30 text-indigo-200 border border-indigo-500/40"
                      }`}
                    >
                      {memoryPairsState?.round === 2 ? "🔥 VÒNG 2 SINH TỬ" : "✨ VÒNG 1"}
                    </span>
                    <span className="font-mono font-bold text-amber-300 px-2 py-0.5 rounded bg-amber-500/20 border border-amber-500/30 text-[11px]">
                      Lượt lật: {memoryPairsState?.attemptsUsed ?? 0}/{memoryPairsState?.maxAttempts ?? 3}
                    </span>
                  </div>
                </div>
                <p className="text-[11px] text-white/80 leading-snug">
                  {memoryPairsState?.round === 2
                    ? "Cảnh báo sinh tử: Đang ở Vòng 2! Nếu sau 3 lượt vẫn không tìm được cặp trùng sẽ dừng chơi và dính ngay 1 BOM trừng phạt!"
                    : "Lật 2 thẻ để tìm cặp giống nhau. Cặp trùng đầu tiên sẽ nhận thưởng. Nếu hết 3 lượt Vòng 1 sẽ được đảo vị trí và chọn làm lại lần 2!"}
                </p>
              </div>
            )}

            {/* MEMORY PAIRS SECOND CHANCE MODAL */}
            {miniGameType === "MEMORY_PAIRS" && memoryPairsState?.promptSecondChance && (
              <div className="w-full max-w-xl mx-auto p-3 sm:p-4 rounded-2xl bg-gradient-to-b from-indigo-950/95 via-purple-950/95 to-black/95 border-2 border-amber-400/90 shadow-2xl backdrop-blur-xl animate-bounce-in text-center space-y-2 z-30">
                <div className="text-3xl animate-pulse">🔀</div>
                <h4 className="text-sm sm:text-base font-black text-amber-300 uppercase tracking-wider">
                  HẾT 3 LƯỢT VÒNG 1 — CÁC LÁ BÀI ĐÃ ĐƯỢC XÁO TRỘN!
                </h4>
                <p className="text-[11px] text-white/90 max-w-md mx-auto leading-relaxed">
                  Bạn chưa ghép được cặp nào trong Vòng 1. Không bị mất điểm!
                  <br />
                  Bạn có cơ hội <strong className="text-yellow-300">làm lại Lần 2 với 3 lượt tiếp theo</strong> (nhưng nếu trượt cả 3 lượt sẽ nhận 1 BOM phạt), hoặc <strong className="text-emerald-300">dừng chơi và nhận điểm câu hỏi (+{baseQuestionPoints || 10}đ)</strong>!
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
              <div className="w-full max-w-xl mx-auto p-2 sm:p-2.5 rounded-xl bg-black/60 border border-amber-400/50 backdrop-blur-md shadow-xl">
                <div className="text-xs font-black text-amber-300 uppercase tracking-wider mb-0.5">
                  🚪 CHỌN 1 TRONG 3 CÁNH CỬA HOÀNG GIA
                </div>
                <p className="text-[11px] text-white/80 leading-snug">
                  Chỉ được chọn DUY NHẤT 1 cửa! Gồm 1 Đại Thưởng (+{baseQuestionPoints ? baseQuestionPoints * 2 : 20}đ), 1 An Toàn (+{baseQuestionPoints || 10}đ) và 1 Bẫy Bom (-{baseQuestionPoints || 10}đ)!
                </p>
              </div>
            )}

            {/* VARIANT 4: TAROT DESTINY HUD */}
            {(miniGameType === "TAROT_DESTINY" || miniGameType === "TAROT_CARDS") && (
              <div className="w-full max-w-xl mx-auto p-2 sm:p-2.5 rounded-xl bg-black/60 border border-purple-400/50 backdrop-blur-md shadow-xl">
                <div className="text-xs font-black text-purple-300 uppercase tracking-wider mb-0.5">
                  🔮 RÚT 1 LÁ BÀI TAROT THẦN SỐ VẬN MỆNH
                </div>
                <p className="text-[11px] text-white/80 leading-snug">
                  Rút duy nhất 1 lá bài định mệnh để giải mã quẻ bài: Mặt Trời (+{baseQuestionPoints ? baseQuestionPoints * 2 : 20}đ), Hoàng Đế, Kẻ Khờ, Hiệp Sĩ hay Thần Chết (-{baseQuestionPoints || 10}đ)!
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
            1. VARIANT: ONE_SHOT_DOORS (3 Giant Doors)
        ════════════════════════════════════════════════════════════════════ */}
        {(miniGameType === "ONE_SHOT_DOORS" || miniGameType === "DOORS" || miniGameType === "CHESTS") && (
          <div className="grid grid-cols-3 gap-2 sm:gap-3.5 max-w-2xl mx-auto py-1">
            {tiles.map((tile) => {
              const isChosen = oneShotState?.chosenTileId === tile.id;
              const isBomb = tile.type !== "REWARD";
              const isSteal = tile.effectType === "STEAL_POINTS";

              const isCardOpened = tile.isOpened || optimisticOpenedIds.has(tile.id);
              if (!isCardOpened) {
                return (
                  <button
                    key={tile.id}
                    type="button"
                    onClick={() => handleTileClick(tile)}
                    disabled={!canInteract}
                    className={`relative aspect-[3/4] sm:aspect-[4/5] max-h-[25vh] sm:max-h-[28vh] rounded-2xl p-2 sm:p-2.5 flex flex-col items-center justify-between border-3 transition-all duration-300 cursor-pointer ${
                      canInteract
                        ? "bg-gradient-to-b from-amber-700/80 via-amber-900/90 to-stone-950 border-amber-400 hover:border-yellow-300 hover:scale-103 shadow-2xl hover:shadow-amber-500/50 group"
                        : "bg-black/50 border-white/20 opacity-80 cursor-default"
                    }`}
                  >
                    <div className="w-full flex items-center justify-between">
                      <span className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-black/60 border border-white/30 text-[10px] sm:text-[11px] font-black text-white flex items-center justify-center">
                        #{tile.id}
                      </span>
                      {canInteract && (
                        <span className="text-[8px] sm:text-[9px] font-black text-yellow-300 animate-pulse">
                          CHỌN CỬA ✨
                        </span>
                      )}
                    </div>

                    {/* Giant Door Graphic */}
                    <div className="text-3xl sm:text-5xl my-auto transition-transform duration-300 group-hover:scale-110 drop-shadow-2xl">
                      🚪
                    </div>

                    <div className="w-full text-center pb-0.5">
                      <span className="text-xs sm:text-sm font-black text-white block">
                        {tile.label}
                      </span>
                      <span className="text-[8px] sm:text-[9px] uppercase tracking-wider text-amber-300/80 font-bold block">
                        Cánh Cửa Bí Ẩn
                      </span>
                    </div>
                  </button>
                );
              }

              // Revealed Door
              return (
                <div
                  key={tile.id}
                  className={`relative aspect-[3/4] sm:aspect-[4/5] max-h-[25vh] sm:max-h-[28vh] rounded-2xl p-2 sm:p-2.5 flex flex-col items-center justify-between border-3 shadow-2xl animate-fade-in ${
                    isChosen ? "ring-4 ring-yellow-400 scale-103 z-10" : "opacity-80"
                  } ${
                    isBomb
                      ? "bg-gradient-to-b from-red-950 via-stone-950 to-black border-red-500 text-red-200"
                      : isSteal
                      ? "bg-gradient-to-b from-rose-950 via-purple-950 to-black border-rose-400 text-rose-200"
                      : "bg-gradient-to-b from-amber-950 via-emerald-950/80 to-black border-emerald-400 text-emerald-200"
                  }`}
                >
                  <div className="w-full flex items-center justify-between">
                    <span className="text-xs font-mono font-bold opacity-75">#{tile.id}</span>
                    <span
                      className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full ${
                        isChosen
                          ? isSteal
                            ? "bg-rose-500 text-white font-extrabold ring-1 ring-white"
                            : "bg-yellow-400 text-black font-extrabold"
                          : isBomb
                          ? "bg-red-500/30 text-red-300"
                          : isSteal
                          ? "bg-rose-500/30 text-rose-300"
                          : "bg-emerald-500/30 text-emerald-300"
                      }`}
                    >
                      {isChosen ? (isSteal ? "CƯỚP ĐIỂM 🗡️" : "ĐÃ CHỌN ⭐") : isBomb ? "BẪY BOM" : isSteal ? "CƯỚP ĐIỂM 🗡️" : "THƯỞNG"}
                    </span>
                  </div>

                  <div className="text-3xl sm:text-5xl my-auto text-center drop-shadow-xl">
                    {isBomb ? "💥" : tile.icon || "👑"}
                  </div>

                  <div className="w-full text-center pb-1">
                    <p className="text-xs sm:text-sm font-black text-white leading-tight truncate">
                      {tile.storyTitle}
                    </p>
                    <p
                      className={`text-xs sm:text-base font-black font-mono mt-0.5 ${
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
        )}

        {/* ════════════════════════════════════════════════════════════════════
            2. VARIANT: TAROT_DESTINY (5 Mystical Vertical Floating Cards)
        ════════════════════════════════════════════════════════════════════ */}
        {(miniGameType === "TAROT_DESTINY" || miniGameType === "TAROT_CARDS") && (
          <div className="grid grid-cols-5 gap-1.5 sm:gap-2.5 max-w-3xl mx-auto py-1">
            {tiles.map((tile) => {
              const isChosen = tarotState?.chosenCardId === tile.id;
              const isBomb = tile.type !== "REWARD";
              const isCardOpened = tile.isOpened || optimisticOpenedIds.has(tile.id);
              const meta = getTarotCardMeta(tile.tarotName, tile.storyTitle);

              if (!isCardOpened) {
                return (
                  <button
                    key={tile.id}
                    type="button"
                    onClick={() => handleTileClick(tile)}
                    disabled={!canInteract}
                    className={`relative aspect-[2/3] sm:aspect-[3/4] max-h-[22vh] sm:max-h-[26vh] rounded-xl sm:rounded-2xl p-1.5 sm:p-2 flex flex-col items-center justify-between border-2 transition-all duration-300 cursor-pointer overflow-hidden ${
                      canInteract
                        ? "border-amber-400/70 hover:border-yellow-300 hover:-translate-y-1 shadow-2xl hover:shadow-amber-500/40 group ring-1 ring-amber-400/30"
                        : "border-white/10 opacity-80 cursor-default"
                    }`}
                  >
                    {/* Tarot Card Back SVG Artwork */}
                    <div className="absolute inset-0 z-0">
                      <TarotCardBackSvg />
                    </div>

                    {/* Card Back Overlays */}
                    <div className="w-full flex items-center justify-between z-10 px-0.5 pt-0.5">
                      <span className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-black/80 border border-amber-400/80 text-[9px] sm:text-[10px] font-black text-amber-200 flex items-center justify-center font-mono shadow-md">
                        #{tile.id}
                      </span>
                      {canInteract && (
                        <span className="text-[8px] sm:text-[9px] font-black text-amber-300 px-1 py-0.2 rounded-full bg-black/70 border border-amber-400/60 animate-pulse">
                          RÚT ✨
                        </span>
                      )}
                    </div>

                    <div className="z-10 w-full text-center pb-0.5">
                      <span className="text-[9px] sm:text-[11px] font-black uppercase tracking-widest text-amber-200 block drop-shadow-md">
                        TAROT
                      </span>
                    </div>
                  </button>
                );
              }

              // Revealed Tarot Card
              return (
                <div
                  key={tile.id}
                  className={`relative aspect-[2/3] sm:aspect-[3/4] max-h-[22vh] sm:max-h-[26vh] rounded-xl sm:rounded-2xl p-1.5 sm:p-2 flex flex-col items-center justify-between border-2 shadow-2xl animate-fade-in transition-all overflow-hidden ${
                    isChosen ? "ring-2 sm:ring-4 ring-yellow-400 scale-103 z-20" : "opacity-90"
                  } bg-gradient-to-b ${meta.bgGradient} ${meta.borderColor}`}
                  style={{
                    boxShadow: isChosen
                      ? `0 0 25px ${meta.glowColor}, 0 0 8px rgba(250, 204, 21, 0.6)`
                      : `0 4px 15px ${meta.glowColor}`,
                  }}
                >
                  {/* Card Header: Roman Numeral & English Name in 1 clean line */}
                  <div className="w-full flex items-center justify-between border-b border-white/15 pb-0.5">
                    <span className="text-[9px] font-mono font-bold opacity-75 text-amber-200/80">
                      #{tile.id}
                    </span>
                    <div className="flex items-center gap-0.5 sm:gap-1">
                      <span className="font-serif font-black text-[10px] sm:text-xs text-amber-300 tracking-wider">
                        {meta.roman}
                      </span>
                      <span className="text-[8px] sm:text-[9px] font-bold text-white/90 tracking-wide uppercase whitespace-nowrap">
                        · {meta.nameEn}
                      </span>
                    </div>
                  </div>

                  {/* Card Center: Rich Tarot Artwork SVG */}
                  <div className="w-10 h-10 sm:w-14 sm:h-14 my-auto relative flex items-center justify-center p-0.5 drop-shadow-2xl">
                    <TarotCardEmblem cardKey={meta.key} />
                  </div>

                  {/* Card Footer: Vietnamese Title & Single-line Score Pill */}
                  <div className="w-full text-center space-y-0.5">
                    <p className="text-[10px] sm:text-xs font-black text-white tracking-wide truncate">
                      {meta.nameVi}
                    </p>
                    <div
                      className={`inline-flex items-center justify-center px-1.5 py-0.2 rounded-full text-[9px] sm:text-[11px] font-black font-mono shadow-md whitespace-nowrap ${
                        isBomb
                          ? "bg-rose-500/30 border border-rose-400/80 text-rose-200"
                          : meta.key === "THE_KNIGHT"
                          ? "bg-emerald-500/30 border border-emerald-400/80 text-emerald-200"
                          : "bg-amber-500/30 border border-amber-300/80 text-amber-200"
                      }`}
                    >
                      {isBomb
                        ? `-${Math.abs(tile.deltaPoints || baseQuestionPoints || 10)}đ`
                        : meta.key === "THE_KNIGHT"
                        ? `Cướp ${tile.deltaPoints}đ`
                        : `+${tile.deltaPoints}đ`}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════════
            3. VARIANT: MEMORY_PAIRS (10 Cards / 5 Pairs)
        ════════════════════════════════════════════════════════════════════ */}
        {miniGameType === "MEMORY_PAIRS" && (
          <div className="grid grid-cols-5 gap-1.5 sm:gap-2 max-w-2xl mx-auto py-1">
            {tiles.map((tile) => {
              const isMatched = memoryPairsState?.matchedPairKey === tile.pairKey;
              const isBomb = tile.type !== "REWARD";

              const isCardOpened = tile.isOpened || optimisticOpenedIds.has(tile.id);
              if (!isCardOpened) {
                return (
                  <button
                    key={tile.id}
                    type="button"
                    onClick={() => handleTileClick(tile)}
                    disabled={!canInteract || memoryPairsState?.isMismatchResolving}
                    className={`relative aspect-[4/3] max-h-[10.5vh] sm:max-h-[12.5vh] rounded-xl p-1.5 flex flex-col items-center justify-between border-2 transition-all duration-300 cursor-pointer ${
                      canInteract && !memoryPairsState?.isMismatchResolving
                        ? "bg-gradient-to-b from-indigo-900/80 to-slate-950 border-indigo-400/60 hover:border-amber-400 hover:scale-102 shadow-xl group"
                        : "bg-black/40 border-white/10 opacity-75 cursor-default"
                    }`}
                  >
                    <div className="w-full flex items-center justify-between">
                      <span className="w-4 h-4 rounded-full bg-black/60 border border-white/20 text-[9px] font-black text-white flex items-center justify-center font-mono">
                        #{tile.id}
                      </span>
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
                  className={`relative aspect-[4/3] max-h-[10.5vh] sm:max-h-[12.5vh] rounded-xl p-1.5 flex flex-col items-center justify-between border-2 shadow-2xl animate-fade-in ${
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
        )}

        {/* ════════════════════════════════════════════════════════════════════
            4. VARIANT: PUSH_YOUR_LUCK (Chồng Bài Xếp Lớp Vô Hạn Né Bom)
        ════════════════════════════════════════════════════════════════════ */}
        {(miniGameType === "PUSH_YOUR_LUCK" || miniGameType === "RADAR_WINDOWS") && (() => {
          const unopenedTile = tiles.find((t) => !t.isOpened && !optimisticOpenedIds.has(t.id));
          const openedTiles = tiles.filter((t) => t.isOpened || optimisticOpenedIds.has(t.id));
          const latestCard = lastFlippedTile || (openedTiles.length > 0 ? openedTiles[openedTiles.length - 1] : undefined);
          const nextCardNum = unopenedTile?.id ?? (cardsFlippedCount + 1);

          return (
            <div className="flex flex-col items-center justify-center space-y-2.5 sm:space-y-3 max-w-lg mx-auto py-1">
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
          <span className="text-white/60 font-semibold uppercase tracking-wider text-[11px]">
            BẢNG ĐIỂM TRẬN ĐẤU:
          </span>
          <div className="flex flex-wrap items-center gap-2">
            {teams.map((t) => (
              <div
                key={t.id}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-xl border ${
                  t.id === currentTurnTeamId
                    ? "bg-white/15 border-white/40 text-white font-bold"
                    : "bg-black/30 border-white/10 text-white/70"
                }`}
              >
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: t.color }} />
                <span>{t.name}:</span>
                <span className="font-mono font-bold text-amber-300">{t.score.toLocaleString()}đ</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
