"use client";

import React, { useState, useEffect, useRef } from "react";
import { MysteryQuestState, MysteryTile, MysteryMiniGameType } from "@/types";
import { MYSTERY_THEMES } from "@/lib/game-engine/mystery-quest";

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
  teams = [],
}: Props) {
  const [flippingTileId, setFlippingTileId] = useState<number | null>(null);
  const [optimisticOpenedIds, setOptimisticOpenedIds] = useState<Set<number>>(new Set());
  const [isDrawingAnimation, setIsDrawingAnimation] = useState<boolean>(false);


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

  const themeMeta = MYSTERY_THEMES[theme] || {
    accentColor: "#a855f7",
    emoji: "🗝️",
    taglineVi: "Hành Trình Bí Ẩn",
  };

  const isMyTurn = Boolean(myTeamId && myTeamId === currentTurnTeamId);
  const canInteract = Boolean((isMyTurn || isAdmin || isSandbox) && phase === "PUSH_YOUR_LUCK");
  const canCashOut = Boolean(canInteract && (miniGameType === "PUSH_YOUR_LUCK" || miniGameType === "RADAR_WINDOWS") && potPoints > 0);

  // Việc chuyển lượt / chuyển câu hỏi diễn ra thủ công bởi Admin/MC, không tự động


  const handleTileClick = (tile: MysteryTile) => {
    if (!canInteract || tile.isOpened || optimisticOpenedIds.has(tile.id)) return;
    if (memoryPairsState?.isMismatchResolving) return;

    // Instant optimistic visual feedback (<16ms)
    setOptimisticOpenedIds((prev) => new Set(prev).add(tile.id));
    setFlippingTileId(tile.id);
    if (miniGameType === "PUSH_YOUR_LUCK" || miniGameType === "RADAR_WINDOWS") {
      setIsDrawingAnimation(true);
      setTimeout(() => setIsDrawingAnimation(false), 450);
    }
    setTimeout(() => setFlippingTileId(null), 500);

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
      className={`w-full rounded-3xl p-4 sm:p-6 md:p-8 bg-gradient-to-b ${themeBgGradient} border-2 border-white/15 shadow-2xl relative overflow-hidden transition-all duration-700`}
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
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-lg border border-white/20 shrink-0"
            style={{ backgroundColor: `${themeMeta.accentColor}33` }}
          >
            {themeMeta.emoji}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs uppercase font-black tracking-widest px-2.5 py-0.5 rounded-full bg-white/10 text-white/90 border border-white/15">
                {themeNameVi}
              </span>
              <span className="text-xs font-bold text-amber-300 px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-400/40">
                {variantInfo.title}
              </span>
            </div>
            <p className="text-xs text-white/60 mt-0.5 line-clamp-1">{themeMeta.taglineVi}</p>
          </div>
        </div>

        {/* Turn & Active Team Badge */}
        <div className="flex items-center gap-3">
          <div className="px-3 py-1.5 rounded-xl bg-black/40 border border-white/10 text-xs font-mono font-bold text-white/80">
            LƯỢT <span className="text-amber-400 font-black">{currentTurnIndex + 1}</span> / {totalTurns}
            <span className="mx-2 opacity-40">|</span>
            VÒNG <span className="text-cyan-400 font-black">{currentRound}</span>
          </div>

          <div
            className="flex items-center gap-2.5 px-3.5 py-1.5 rounded-2xl border-2 shadow-xl backdrop-blur-md"
            style={{
              borderColor: currentTurnTeamColor,
              backgroundColor: `${currentTurnTeamColor}22`,
            }}
          >
            <div
              className="w-3.5 h-3.5 rounded-full ring-2 ring-white/50 shrink-0 animate-pulse"
              style={{ backgroundColor: currentTurnTeamColor }}
            />
            <div className="text-left">
              <span className="text-[9px] uppercase font-black tracking-wider text-white/70 block leading-tight">
                ĐỘI THI ĐẤU
              </span>
              <span className="text-xs sm:text-sm font-black text-white truncate max-w-[130px] block leading-tight">
                {currentTurnTeamName}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Host / Sandbox Minigame Switcher Pills ── */}
      {(isAdmin || isSandbox) && (
        <div className="relative z-10 pt-3 pb-1 flex flex-wrap items-center gap-1.5 text-xs">
          <span className="text-[11px] font-bold text-slate-400 mr-1">🎮 Đổi Minigame:</span>
          {[
            { key: "MEMORY_PAIRS", label: "🃏 Lật Cặp (Pairs)", icon: "🃏" },
            { key: "ONE_SHOT_DOORS", label: "🚪 3 Cánh Cửa (Doors)", icon: "🚪" },
            { key: "PUSH_YOUR_LUCK", label: "💣 Lật Liều (Push-Luck)", icon: "💣" },
            { key: "TAROT_DESTINY", label: "🔮 Thẻ Tarot (Tarot)", icon: "🔮" },
          ].map((v) => {
            const isActive = miniGameType === v.key;
            return (
              <button
                key={v.key}
                type="button"
                onClick={() => onSelectMiniGame?.(v.key as MysteryMiniGameType)}
                className={`px-2.5 py-1 rounded-lg font-bold text-xs transition border cursor-pointer ${
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
      <div className="relative z-10 py-4">
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

        {/* Phase: PUSH_YOUR_LUCK / MINIGAME_ACTIVE */}
        {phase === "PUSH_YOUR_LUCK" && (
          <div className="flex flex-col items-center justify-center text-center space-y-3">
            {/* VARIANT 1: MEMORY PAIRS HUD */}
            {miniGameType === "MEMORY_PAIRS" && (
              <div className="w-full max-w-xl mx-auto p-4 rounded-2xl bg-black/60 border border-indigo-400/50 backdrop-blur-md shadow-xl">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-black text-indigo-300 uppercase tracking-wider">
                    🃏 THỬ THÁCH LẬT CẶP TRÙNG NHAU
                  </span>
                  <span className="font-mono font-bold text-amber-300 px-2 py-0.5 rounded bg-amber-500/20 border border-amber-500/30">
                    Lượt lật: {memoryPairsState?.attemptsUsed ?? 0}/{memoryPairsState?.maxAttempts ?? 5}
                  </span>
                </div>
                <p className="text-xs text-white/80">
                  Lật 2 thẻ để tìm cặp giống nhau. Cặp trùng nhau đầu tiên được mở sẽ quyết định phần thưởng hoặc hình phạt!
                </p>
              </div>
            )}

            {/* VARIANT 2: ONE SHOT DOORS HUD */}
            {(miniGameType === "ONE_SHOT_DOORS" || miniGameType === "DOORS" || miniGameType === "CHESTS") && (
              <div className="w-full max-w-xl mx-auto p-4 rounded-2xl bg-black/60 border border-amber-400/50 backdrop-blur-md shadow-xl">
                <div className="text-xs font-black text-amber-300 uppercase tracking-wider mb-1">
                  🚪 CHỌN 1 TRONG 3 CÁNH CỬA HOÀNG GIA
                </div>
                <p className="text-xs text-white/80">
                  Chỉ được chọn DUY NHẤT 1 cửa! Gồm 1 Siêu Thưởng (+40đ), 1 An Toàn (+20đ) và 1 Bẫy Bom (-15đ)!
                </p>
              </div>
            )}

            {/* VARIANT 4: TAROT DESTINY HUD */}
            {(miniGameType === "TAROT_DESTINY" || miniGameType === "TAROT_CARDS") && (
              <div className="w-full max-w-xl mx-auto p-4 rounded-2xl bg-black/60 border border-purple-400/50 backdrop-blur-md shadow-xl">
                <div className="text-xs font-black text-purple-300 uppercase tracking-wider mb-1">
                  🔮 RÚT 1 LÁ BÀI TAROT THẦN SỐ VẬN MỆNH
                </div>
                <p className="text-xs text-white/80">
                  Rút duy nhất 1 lá bài định mệnh trên tay để giải mã quẻ bài thần bí: Mặt Trời, Hoàng Đế, Kẻ Khờ, Thần Chết hay Hiệp Sĩ!
                </p>
              </div>
            )}

            {/* VARIANT 3: PUSH YOUR LUCK HUD (The Classic Pot) */}
            {(miniGameType === "PUSH_YOUR_LUCK" || miniGameType === "RADAR_WINDOWS") && (
              <div className="w-full max-w-xl mx-auto p-4 rounded-2xl bg-black/60 border-2 border-amber-400/50 backdrop-blur-md shadow-2xl relative overflow-hidden">
                <div className="flex items-center justify-between gap-4 mb-1">
                  <div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-amber-300">
                    <span>💰</span> HŨ ĐIỂM TÍCH LŨY HIỆN TẠI
                  </div>
                  {potMultiplier > 1 && (
                    <div className="px-2.5 py-0.5 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-black text-xs uppercase tracking-widest border border-white/20 animate-pulse">
                      ⚡ X{potMultiplier}
                    </div>
                  )}
                </div>

                <div className="flex items-baseline justify-center gap-2 py-1">
                  <span className="text-5xl sm:text-6xl font-black bg-gradient-to-b from-yellow-200 via-amber-300 to-amber-500 bg-clip-text text-transparent drop-shadow-md font-mono">
                    +{potPoints.toLocaleString()}
                  </span>
                  <span className="text-lg font-black text-amber-300">điểm</span>
                </div>

                <div className="flex items-center justify-between text-[11px] text-white/70 pt-2 border-t border-white/10 mt-1">
                  <span>Đã lật: <strong className="text-white">{cardsFlippedCount}</strong> ô</span>
                  <span>Còn lại: <strong className="text-white">{tiles.filter((t) => !t.isOpened).length}</strong> ô bí ẩn</span>
                </div>
              </div>
            )}

            {/* Decision Controls: Cash Out for Push-Your-Luck */}
            {canCashOut && (
              <div className="flex items-center justify-center pt-1 animate-bounce-in">
                <button
                  type="button"
                  onClick={onCashOut}
                  className="px-6 sm:px-8 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 via-green-500 to-emerald-600 hover:from-emerald-500 hover:to-green-400 text-white font-black text-sm sm:text-base shadow-2xl shadow-emerald-900/50 border-2 border-emerald-300 hover:scale-105 active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
                >
                  <span>💰</span>
                  <span>DỪNG LẠI & BẢO TOÀN +{potPoints} ĐIỂM</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Phase: TURN_SUMMARY */}
        {phase === "TURN_SUMMARY" && (
          <div className="w-full max-w-2xl mx-auto text-center animate-slide-up space-y-3">
            {turnFinishedReason === "QUESTION_FAILED" ? (
              <div className="p-6 rounded-3xl bg-gradient-to-b from-slate-900/95 to-black/95 border-2 border-rose-500/80 shadow-2xl space-y-2">
                <div className="text-5xl animate-bounce">❌</div>
                <h3 className="text-2xl font-black text-rose-400">TRẢ LỜI CHƯA CHÍNH XÁC!</h3>
                <p className="text-xs text-slate-300 max-w-lg mx-auto">
                  Đội <strong className="text-white">{currentTurnTeamName}</strong> chưa trả lời đúng câu hỏi. Lượt thi kết thúc với 0 điểm tích lũy.
                </p>
              </div>
            ) : turnFinishedReason === "BOMB_HIT" && bombExploded ? (
              <div
                className={`p-6 rounded-3xl bg-gradient-to-b border-2 shadow-2xl space-y-3 ${
                  bombExploded.type === "CHARITY" || bombExploded.type === "GIFT"
                    ? "from-amber-950/95 via-yellow-950/90 to-black/95 border-amber-400"
                    : bombExploded.type === "DARK" || bombExploded.type === "DOOM"
                    ? "from-purple-950/95 via-zinc-950/90 to-black/95 border-purple-500"
                    : "from-slate-900/95 via-gray-950/90 to-black/95 border-slate-400"
                }`}
              >
                <div className="text-5xl animate-bounce">
                  {bombExploded.type === "CHARITY" || bombExploded.type === "GIFT"
                    ? "🎁"
                    : bombExploded.type === "DARK" || bombExploded.type === "DOOM"
                    ? "🌑"
                    : "💨"}
                </div>
                <h3
                  className={`text-2xl font-black ${
                    bombExploded.type === "CHARITY" || bombExploded.type === "GIFT"
                      ? "text-amber-300"
                      : bombExploded.type === "DARK" || bombExploded.type === "DOOM"
                      ? "text-purple-300"
                      : "text-slate-200"
                  }`}
                >
                  {bombExploded.title}
                </h3>
                <p className="text-xs text-white/80 max-w-lg mx-auto">{bombExploded.description}</p>
                <div
                  className={`p-2.5 rounded-xl border font-bold text-xs ${
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
                  <div className="pt-1 flex flex-wrap items-center justify-center gap-2">
                    <span className="text-[11px] font-bold text-purple-300/80 uppercase">Đội nhận điểm:</span>
                    {bombExploded.recipients.map((rec, idx) => (
                      <span
                        key={rec.teamId || idx}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-purple-500/20 border border-purple-400/40 text-purple-200 text-xs font-black shadow-sm"
                      >
                        <span>🎁</span>
                        <span>{rec.teamName}</span>
                        <span className="text-emerald-300 font-mono">+{rec.points}đ</span>
                      </span>
                    ))}
                  </div>
                )}

                {bombExploded.recipientTeamName && (bombExploded.type === "CHARITY" || bombExploded.type === "GIFT") && (
                  <div className="pt-1 flex items-center justify-center gap-2">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-400/50 text-amber-200 text-xs font-black shadow-sm">
                      <span>🏆</span>
                      <span>{bombExploded.recipientTeamName} (Đội cao điểm nhất)</span>
                      <span className="text-emerald-300 font-mono">+{bombExploded.giftedPoints || bombExploded.deductedPoints}đ</span>
                    </span>
                  </div>
                )}
              </div>
            ) : turnFinishedReason === "ALL_CLEARED" ? (
              <div className="p-6 rounded-3xl bg-gradient-to-b from-amber-950/90 to-black/90 border-2 border-amber-400 shadow-2xl space-y-2">
                <div className="text-5xl animate-bounce">🏆</div>
                <h3 className="text-2xl font-black text-amber-300">ĐẠI THẮNG QUÉT SẠCH TẤT CẢ Ô!</h3>
                <p className="text-xs text-amber-100 max-w-lg mx-auto">
                  Tuyệt đỉnh! Đội {currentTurnTeamName} đã lật hết toàn bộ phần thưởng mà không dính bom!
                </p>
                <div className="p-2.5 rounded-xl bg-amber-500/20 border border-amber-400/50 text-amber-300 font-black text-sm">
                  {storyResult?.rewardText || "Cộng thưởng an toàn trọn vẹn!"}
                </div>
              </div>
            ) : turnFinishedReason === "PAIR_MATCHED" ? (
              <div className="p-6 rounded-3xl bg-gradient-to-b from-indigo-950/90 to-black/90 border-2 border-indigo-400 shadow-2xl space-y-2">
                <div className="text-5xl animate-bounce">🎉</div>
                <h3 className="text-2xl font-black text-indigo-300">GHÉP CẶP THÀNH CÔNG!</h3>
                <p className="text-xs text-indigo-100 max-w-lg mx-auto">
                  {storyResult?.rewardText || "Đã ghép chính xác cặp thẻ đầu tiên!"}
                </p>
              </div>
            ) : turnFinishedReason === "DOOR_CHOSEN" ? (
              <div className="p-6 rounded-3xl bg-gradient-to-b from-amber-950/90 to-black/90 border-2 border-amber-400 shadow-2xl space-y-2">
                <div className="text-5xl animate-bounce">🚪</div>
                <h3 className="text-2xl font-black text-amber-300">CÁNH CỬA ĐÃ MỞ!</h3>
                <p className="text-xs text-amber-100 max-w-lg mx-auto">
                  {storyResult?.rewardText || "Nhận thưởng thành công từ cánh cửa đã chọn!"}
                </p>
              </div>
            ) : turnFinishedReason === "TAROT_DRAWN" ? (
              <div className="p-6 rounded-3xl bg-gradient-to-b from-purple-950/90 to-black/90 border-2 border-purple-400 shadow-2xl space-y-2">
                <div className="text-5xl animate-bounce">🔮</div>
                <h3 className="text-2xl font-black text-purple-300">QUẺ BÀI ĐỊNH MỆNH ĐÃ KHAI MỞ!</h3>
                <p className="text-xs text-purple-100 max-w-lg mx-auto">
                  {storyResult?.rewardText || "Đã rút bài Tarot vận mệnh thành công!"}
                </p>
              </div>
            ) : turnFinishedReason === "MAX_ATTEMPTS" ? (
              <div className="p-6 rounded-3xl bg-gradient-to-b from-slate-900/90 to-black/90 border-2 border-amber-500 shadow-2xl space-y-2">
                <div className="text-5xl animate-bounce">⏳</div>
                <h3 className="text-2xl font-black text-amber-400">HẾT LƯỢT LẬT THỬ!</h3>
                <p className="text-xs text-white/80 max-w-lg mx-auto">
                  Đã sử dụng hết số lượt lật bài mà chưa mở được cặp trùng nhau. Lượt kết thúc với 0 điểm.
                </p>
              </div>
            ) : (
              <div className="p-6 rounded-3xl bg-gradient-to-b from-emerald-950/90 to-black/90 border-2 border-emerald-400 shadow-2xl space-y-2">
                <div className="text-5xl animate-bounce">💰</div>
                <h3 className="text-2xl font-black text-emerald-300">BẢO TOÀN ĐIỂM THÀNH CÔNG!</h3>
                <p className="text-xs text-emerald-100 max-w-lg mx-auto">
                  Lựa chọn sáng suốt! Đội {currentTurnTeamName} đã bảo toàn an toàn quỹ điểm về tài khoản!
                </p>
                <div className="p-2.5 rounded-xl bg-emerald-500/20 border border-emerald-400/50 text-emerald-300 font-black text-base font-mono">
                  {storyResult?.rewardText || "Bảo toàn thành công!"}
                </div>
              </div>
            )}

            {/* Host Advance Bar & Status */}
            <div className="p-3.5 rounded-2xl bg-black/60 border border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3">
              <span className="text-xs text-slate-300 flex items-center gap-2 font-bold">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
                {isAdmin || isSandbox ? (
                  <span>Lượt thi đã kết thúc. Vui lòng bấm nút bên cạnh để chuyển sang lượt/câu hỏi tiếp theo.</span>
                ) : (
                  <span>Đang chờ Admin / Quản trò chuyển sang lượt hoặc câu hỏi tiếp theo...</span>
                )}
              </span>

              {(isAdmin || isSandbox) && (
                <button
                  type="button"
                  onClick={onAdvanceTurn}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black text-xs shadow-lg border border-white/20 hover:scale-105 active:scale-95 transition-all cursor-pointer whitespace-nowrap"
                >
                  CHUYỂN SANG LƯỢT TIẾP THEO ➔
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Minigame Specific Interactive Grids ── */}
      <div className="relative z-10 mt-2">
        {/* ════════════════════════════════════════════════════════════════════
            1. VARIANT: ONE_SHOT_DOORS (3 Giant Doors)
        ════════════════════════════════════════════════════════════════════ */}
        {(miniGameType === "ONE_SHOT_DOORS" || miniGameType === "DOORS" || miniGameType === "CHESTS") && (
          <div className="grid grid-cols-3 gap-3 sm:gap-6 max-w-3xl mx-auto py-2">
            {tiles.map((tile) => {
              const isChosen = oneShotState?.chosenTileId === tile.id;
              const isBomb = tile.type !== "REWARD";

              const isCardOpened = tile.isOpened || optimisticOpenedIds.has(tile.id);
              if (!isCardOpened) {
                return (
                  <button
                    key={tile.id}
                    type="button"
                    onClick={() => handleTileClick(tile)}
                    disabled={!canInteract}
                    className={`relative aspect-[2/3] sm:aspect-[3/5] rounded-3xl p-3 flex flex-col items-center justify-between border-4 transition-all duration-300 cursor-pointer ${
                      canInteract
                        ? "bg-gradient-to-b from-amber-700/80 via-amber-900/90 to-stone-950 border-amber-400 hover:border-yellow-300 hover:scale-105 shadow-2xl hover:shadow-amber-500/50 group"
                        : "bg-black/50 border-white/20 opacity-80 cursor-default"
                    }`}
                  >
                    <div className="w-full flex items-center justify-between">
                      <span className="w-7 h-7 rounded-full bg-black/60 border border-white/30 text-xs font-black text-white flex items-center justify-center">
                        #{tile.id}
                      </span>
                      {canInteract && (
                        <span className="text-[10px] font-black text-yellow-300 animate-pulse">
                          CHỌN CỬA ✨
                        </span>
                      )}
                    </div>

                    {/* Giant Door Graphic */}
                    <div className="text-5xl sm:text-7xl my-auto transition-transform duration-300 group-hover:scale-110 drop-shadow-2xl">
                      🚪
                    </div>

                    <div className="w-full text-center pb-2">
                      <span className="text-sm sm:text-base font-black text-white block">
                        {tile.label}
                      </span>
                      <span className="text-[10px] uppercase tracking-wider text-amber-300/80 font-bold block">
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
                  className={`relative aspect-[2/3] sm:aspect-[3/5] rounded-3xl p-3 flex flex-col items-center justify-between border-4 shadow-2xl animate-fade-in ${
                    isChosen ? "ring-4 ring-yellow-400 scale-105 z-10" : "opacity-80"
                  } ${
                    isBomb
                      ? "bg-gradient-to-b from-red-950 via-stone-950 to-black border-red-500 text-red-200"
                      : "bg-gradient-to-b from-amber-950 via-emerald-950/80 to-black border-emerald-400 text-emerald-200"
                  }`}
                >
                  <div className="w-full flex items-center justify-between">
                    <span className="text-xs font-mono font-bold opacity-75">#{tile.id}</span>
                    <span
                      className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                        isChosen
                          ? "bg-yellow-400 text-black font-extrabold"
                          : isBomb
                          ? "bg-red-500/30 text-red-300"
                          : "bg-emerald-500/30 text-emerald-300"
                      }`}
                    >
                      {isChosen ? "ĐÃ CHỌN ⭐" : isBomb ? "BẪY BOM" : "THƯỞNG"}
                    </span>
                  </div>

                  <div className="text-4xl sm:text-6xl my-auto text-center drop-shadow-xl">
                    {isBomb ? "💥" : tile.icon || "👑"}
                  </div>

                  <div className="w-full text-center pb-2">
                    <p className="text-xs sm:text-sm font-black text-white leading-tight">
                      {tile.storyTitle}
                    </p>
                    <p
                      className={`text-sm sm:text-lg font-black font-mono mt-1 ${
                        isBomb ? "text-red-400" : "text-amber-300"
                      }`}
                    >
                      {isBomb ? "-15đ Tổng" : `+${tile.deltaPoints}đ`}
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
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 max-w-4xl mx-auto py-2">
            {tiles.map((tile) => {
              const isChosen = tarotState?.chosenCardId === tile.id;
              const isBomb = tile.type !== "REWARD";

              const isCardOpened = tile.isOpened || optimisticOpenedIds.has(tile.id);
              if (!isCardOpened) {
                return (
                  <button
                    key={tile.id}
                    type="button"
                    onClick={() => handleTileClick(tile)}
                    disabled={!canInteract}
                    className={`relative aspect-[2/3] rounded-2xl p-2.5 flex flex-col items-center justify-between border-2 transition-all duration-300 cursor-pointer ${
                      canInteract
                        ? "bg-gradient-to-b from-indigo-900/90 via-purple-950/90 to-slate-950 border-purple-400/80 hover:border-yellow-300 hover:-translate-y-2 shadow-2xl hover:shadow-purple-500/50 group"
                        : "bg-black/40 border-white/10 opacity-80 cursor-default"
                    }`}
                  >
                    <div className="w-full flex items-center justify-between">
                      <span className="w-6 h-6 rounded-full bg-black/60 border border-white/20 text-[11px] font-black text-white flex items-center justify-center">
                        #{tile.id}
                      </span>
                      {canInteract && (
                        <span className="text-[9px] font-black text-purple-300 animate-pulse">
                          RÚT LÁ ✨
                        </span>
                      )}
                    </div>

                    <div className="text-4xl my-auto transition-transform duration-300 group-hover:scale-110 drop-shadow-xl">
                      🔮
                    </div>

                    <div className="w-full text-center">
                      <span className="text-xs font-black text-white block">
                        {tile.label}
                      </span>
                      <span className="text-[9px] uppercase tracking-wider text-purple-300/80 font-bold block">
                        Tarot Thần Số
                      </span>
                    </div>
                  </button>
                );
              }

              // Revealed Tarot Card
              return (
                <div
                  key={tile.id}
                  className={`relative aspect-[2/3] rounded-2xl p-2.5 flex flex-col items-center justify-between border-2 shadow-2xl animate-fade-in ${
                    isChosen ? "ring-4 ring-yellow-400 scale-105 z-10" : "opacity-80"
                  } ${
                    isBomb
                      ? "bg-gradient-to-b from-red-950 via-stone-950 to-black border-red-500 text-red-200"
                      : "bg-gradient-to-b from-indigo-950 via-purple-950 to-black border-purple-400 text-purple-200"
                  }`}
                >
                  <div className="w-full flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold opacity-70">#{tile.id}</span>
                    <span
                      className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded-full ${
                        isChosen
                          ? "bg-yellow-400 text-black font-extrabold"
                          : isBomb
                          ? "bg-red-500/30 text-red-300"
                          : "bg-purple-500/30 text-purple-300"
                      }`}
                    >
                      {isChosen ? "BÀI RÚT ⭐" : isBomb ? "THẦN CHẾT" : "QUẺ LÀNH"}
                    </span>
                  </div>

                  <div className="text-3xl my-auto text-center drop-shadow-xl">
                    {tile.icon}
                  </div>

                  <div className="w-full text-center pb-1">
                    <p className="text-[11px] font-black text-white leading-tight truncate">
                      {tile.tarotName || tile.storyTitle}
                    </p>
                    <p
                      className={`text-xs sm:text-sm font-black font-mono mt-0.5 ${
                        isBomb ? "text-red-400" : "text-amber-300"
                      }`}
                    >
                      {isBomb ? "-20đ Tổng" : `+${tile.deltaPoints}đ`}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════════
            3. VARIANT: MEMORY_PAIRS (8 Cards / 4 Pairs)
        ════════════════════════════════════════════════════════════════════ */}
        {miniGameType === "MEMORY_PAIRS" && (
          <div className="grid grid-cols-4 gap-2.5 sm:gap-4 max-w-3xl mx-auto py-2">
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
                    className={`relative aspect-[3/4] rounded-2xl p-2.5 flex flex-col items-center justify-between border-2 transition-all duration-300 cursor-pointer ${
                      canInteract && !memoryPairsState?.isMismatchResolving
                        ? "bg-gradient-to-b from-indigo-900/80 to-slate-950 border-indigo-400/60 hover:border-amber-400 hover:scale-105 shadow-xl group"
                        : "bg-black/40 border-white/10 opacity-75 cursor-default"
                    }`}
                  >
                    <div className="w-full flex items-center justify-between">
                      <span className="w-5 h-5 rounded-full bg-black/60 border border-white/20 text-[10px] font-black text-white flex items-center justify-center">
                        #{tile.id}
                      </span>
                    </div>

                    <div className="text-3xl my-auto transition-transform duration-300 group-hover:scale-110 drop-shadow-md">
                      🃏
                    </div>

                    <div className="w-full text-center">
                      <span className="text-xs font-black text-white block">
                        {tile.label}
                      </span>
                    </div>
                  </button>
                );
              }

              // Revealed Tile
              return (
                <div
                  key={tile.id}
                  className={`relative aspect-[3/4] rounded-2xl p-2.5 flex flex-col items-center justify-between border-2 shadow-2xl animate-fade-in ${
                    isMatched ? "ring-4 ring-yellow-400 scale-105 z-10" : ""
                  } ${
                    isBomb
                      ? "bg-gradient-to-b from-red-950 via-stone-950 to-black border-red-500 text-red-200"
                      : "bg-gradient-to-b from-indigo-950 via-purple-950 to-black border-emerald-400 text-emerald-200"
                  }`}
                >
                  <div className="w-full flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold opacity-70">#{tile.id}</span>
                    <span
                      className={`text-[8px] font-black uppercase px-1 py-0.2 rounded ${
                        isMatched
                          ? "bg-yellow-400 text-black font-extrabold"
                          : isBomb
                          ? "bg-red-500/30 text-red-300"
                          : "bg-emerald-500/30 text-emerald-300"
                      }`}
                    >
                      {isMatched ? "TRÙNG KHỚP! ⭐" : isBomb ? "BOM" : "THƯỞNG"}
                    </span>
                  </div>

                  <div className="text-3xl my-auto text-center drop-shadow-xl">
                    {tile.icon}
                  </div>

                  <div className="w-full text-center">
                    <p className="text-[10px] font-black text-white leading-tight truncate">
                      {tile.storyTitle}
                    </p>
                    <p
                      className={`text-xs font-black font-mono mt-0.5 ${
                        isBomb ? "text-red-400" : "text-amber-300"
                      }`}
                    >
                      {isBomb ? "-15đ Tổng" : `+${tile.deltaPoints}đ`}
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
            <div className="flex flex-col items-center justify-center space-y-6 max-w-3xl mx-auto py-2">
              {/* ── 2 Main Card Areas: Deck & Latest Drawn Card ── */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-10 items-center justify-center w-full max-w-xl">
                {/* ── LEFT: CHỒNG BÀI RÚT (STACKED DECK) ── */}
                <div className="flex flex-col items-center">
                  <div className="text-xs font-black uppercase tracking-wider text-amber-300 mb-2.5 flex items-center gap-1.5">
                    <span>📚</span> CHỒNG BÀI RÚT (VÔ HẠN)
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
                    <div className="absolute inset-0 translate-x-3.5 translate-y-3.5 rounded-2xl bg-indigo-950/70 border border-white/10 shadow-lg pointer-events-none" />
                    {/* Depth shadow layer 2 */}
                    <div className="absolute inset-0 translate-x-1.5 translate-y-1.5 rounded-2xl bg-purple-950/80 border border-white/15 shadow-xl pointer-events-none" />

                    {/* Top card of the stack */}
                    <div
                      className={`relative w-48 sm:w-52 aspect-[3/4] rounded-2xl p-4 flex flex-col items-center justify-between border-2 transition-all duration-300 shadow-2xl ${
                        canInteract
                          ? "bg-gradient-to-b from-indigo-900 via-purple-950 to-slate-950 border-amber-400/80 hover:border-yellow-300 hover:-translate-y-2 hover:shadow-amber-500/40 active:scale-95 group-hover:scale-102"
                          : "bg-black/60 border-white/10 opacity-70 cursor-default"
                      } ${isDrawingAnimation ? "-translate-y-6 rotate-3 scale-105 ring-4 ring-amber-300" : ""}`}
                    >
                      <div className="w-full flex items-center justify-between text-xs font-mono font-bold text-amber-300">
                        <span>#{nextCardNum}</span>
                        <span className="text-[10px] uppercase font-bold text-white/70 px-1.5 py-0.5 rounded bg-black/40 border border-white/10">
                          Chồng bài
                        </span>
                      </div>

                      <div className="text-5xl sm:text-6xl my-auto text-center drop-shadow-xl transition-transform duration-300 group-hover:scale-110 animate-pulse">
                        🃏
                      </div>

                      <div className="w-full text-center">
                        <span className="text-xs sm:text-sm font-black text-white block">
                          Lá Bài #{nextCardNum}
                        </span>
                        {canInteract && (
                          <span className="text-[10px] font-extrabold text-amber-300 uppercase tracking-widest mt-1 block animate-bounce">
                            CLICK ĐỂ RÚT ✨
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* ── RIGHT: LÁ BÀI VỪA RÚT (DRAWN CARD) ── */}
                <div className="flex flex-col items-center">
                  <div className="text-xs font-black uppercase tracking-wider text-emerald-300 mb-2.5 flex items-center gap-1.5">
                    <span>✨</span> LÁ BÀI VỪA RÚT
                  </div>

                  {latestCard ? (
                    <div
                      className={`w-48 sm:w-52 aspect-[3/4] rounded-2xl p-4 flex flex-col items-center justify-between border-2 shadow-2xl animate-fade-in relative ${
                        latestCard.type === "BOMB_DARK" || latestCard.type === "BOMB_DOOM"
                          ? "bg-gradient-to-b from-purple-950 via-black to-red-950 border-purple-500 text-purple-200 ring-4 ring-purple-500/40"
                          : latestCard.type === "BOMB_CHARITY" || latestCard.type === "BOMB_GIFT"
                          ? "bg-gradient-to-b from-amber-950 via-yellow-950 to-black border-amber-400 text-amber-200 ring-4 ring-amber-400/40"
                          : latestCard.type === "BOMB_SMOKE" || latestCard.type === "BOMB_MINOR"
                          ? "bg-gradient-to-b from-slate-900 via-stone-950 to-black border-slate-500 text-slate-200 ring-4 ring-slate-500/40"
                          : "bg-gradient-to-b from-amber-950/90 via-emerald-950/80 to-black border-emerald-400 text-emerald-200 ring-4 ring-emerald-400/30"
                      }`}
                    >
                      <div className="w-full flex items-center justify-between text-xs">
                        <span className="font-mono font-bold opacity-75">#{latestCard.id}</span>
                        <span
                          className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                            latestCard.type === "BOMB_DARK" || latestCard.type === "BOMB_DOOM"
                              ? "bg-purple-500/30 text-purple-300 border border-purple-400/50"
                              : latestCard.type === "BOMB_CHARITY" || latestCard.type === "BOMB_GIFT"
                              ? "bg-amber-500/30 text-amber-300 border border-amber-400/50"
                              : latestCard.type === "BOMB_SMOKE" || latestCard.type === "BOMB_MINOR"
                              ? "bg-slate-500/30 text-slate-300 border border-slate-400/50"
                              : "bg-emerald-500/30 text-emerald-300 border border-emerald-400/50"
                          }`}
                        >
                          {latestCard.type === "BOMB_DARK" || latestCard.type === "BOMB_DOOM"
                            ? "BOM HẮC ÁM"
                            : latestCard.type === "BOMB_CHARITY" || latestCard.type === "BOMB_GIFT"
                            ? "BOM TỪ THIỆN"
                            : latestCard.type === "BOMB_SMOKE" || latestCard.type === "BOMB_MINOR"
                            ? "BOM KHÓI"
                            : "THƯỞNG"}
                        </span>
                      </div>

                      <div className="text-5xl sm:text-6xl my-auto text-center drop-shadow-xl">
                        {latestCard.icon}
                      </div>

                      <div className="w-full text-center">
                        <p className="text-xs sm:text-sm font-black text-white leading-tight truncate">
                          {latestCard.storyTitle}
                        </p>
                        <p
                          className={`text-sm sm:text-base font-black font-mono mt-0.5 ${
                            latestCard.type === "BOMB_DARK" || latestCard.type === "BOMB_DOOM"
                              ? "text-purple-300"
                              : latestCard.type === "BOMB_CHARITY" || latestCard.type === "BOMB_GIFT"
                              ? "text-amber-300"
                              : latestCard.type === "BOMB_SMOKE" || latestCard.type === "BOMB_MINOR"
                              ? "text-slate-300"
                              : latestCard.effectType === "MULTIPLY_X2"
                              ? "text-purple-300"
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
                            : `+${latestCard.deltaPoints}đ`}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="w-48 sm:w-52 aspect-[3/4] rounded-2xl p-4 border-2 border-dashed border-white/20 flex flex-col items-center justify-center text-center text-white/50 bg-black/20">
                      <span className="text-4xl mb-2">📭</span>
                      <span className="text-xs font-bold text-white/80">Chưa rút lá nào</span>
                      <span className="text-[10px] text-white/40 mt-1">
                        Rút lá đầu tiên từ chồng bài bên cạnh!
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* ── ACTION BUTTONS: RÚT TIẾP & CHỐT ĐIỂM ── */}
              {canInteract && (
                <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
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
                    className="px-6 sm:px-8 py-3 rounded-2xl bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black text-sm sm:text-base shadow-xl border-2 border-purple-400 hover:scale-105 active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
                  >
                    <span>🃏</span>
                    <span>RÚT 1 LÁ (LÁ #{nextCardNum})</span>
                  </button>

                  {canCashOut && (
                    <button
                      type="button"
                      onClick={onCashOut}
                      className="px-6 sm:px-8 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 via-green-500 to-emerald-600 hover:from-emerald-500 hover:to-green-400 text-white font-black text-sm sm:text-base shadow-xl border-2 border-emerald-300 hover:scale-105 active:scale-95 transition-all flex items-center gap-2 cursor-pointer animate-pulse"
                    >
                      <span>💰</span>
                      <span>CHỐT ĐIỂM (+{potPoints}Đ)</span>
                    </button>
                  )}
                </div>
              )}

              {/* ── DRAW HISTORY TRAIL ── */}
              {openedTiles.length > 0 && (
                <div className="w-full max-w-xl mx-auto p-3 rounded-2xl bg-black/40 border border-white/10 text-left">
                  <span className="text-[11px] font-bold text-white/60 uppercase tracking-wider block mb-1.5">
                    📜 LỊCH SỬ RÚT BÀI ({openedTiles.length} lá):
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {openedTiles.map((t, idx) => (
                      <span
                        key={t.id || idx}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-mono font-bold border ${
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
                              : "Bom Khói"
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

      {/* ── Footer Standings / Quick Score Bar ── */}
      {teams && teams.length > 0 && (
        <div className="relative z-10 mt-5 pt-3 border-t border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs">
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
