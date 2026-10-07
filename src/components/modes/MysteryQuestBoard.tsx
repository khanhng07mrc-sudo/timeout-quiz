"use client";

import React, { useState } from "react";
import { MysteryQuestState, MysteryTile } from "@/types";
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
  teams = [],
}: Props) {
  const [flippingTileId, setFlippingTileId] = useState<number | null>(null);

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
    stealCountdown,
    stealBuzzedTeamName,
  } = mysteryState;

  const themeMeta = MYSTERY_THEMES[theme] || {
    accentColor: "#a855f7",
    emoji: "🗝️",
    taglineVi: "Hành Trình Bí Ẩn",
  };

  const isMyTurn = Boolean(myTeamId && myTeamId === currentTurnTeamId);
  const canFlip = Boolean(
    (isMyTurn || isAdmin || isSandbox) && phase === "PUSH_YOUR_LUCK"
  );
  const canCashOut = Boolean(
    (isMyTurn || isAdmin || isSandbox) && phase === "PUSH_YOUR_LUCK" && potPoints > 0
  );

  const handleTileClick = (tile: MysteryTile) => {
    if (!canFlip || tile.isOpened) return;
    setFlippingTileId(tile.id);
    setTimeout(() => setFlippingTileId(null), 600);
    onFlipCard?.(tile.id);
  };

  // Helper theme-specific tile cover styling
  const getCoverIcon = () => {
    switch (miniGameType) {
      case "DOORS":
        return "🚪";
      case "CHESTS":
        return "🪙";
      case "TAROT_CARDS":
        return "🃏";
      case "RADAR_WINDOWS":
        return "📡";
      default:
        return "📦";
    }
  };

  return (
    <div
      className={`w-full rounded-3xl p-4 sm:p-6 md:p-8 bg-gradient-to-b ${themeBgGradient} border-2 border-white/15 shadow-2xl relative overflow-hidden transition-all duration-700`}
      style={{
        boxShadow: `0 20px 60px -15px ${themeMeta.accentColor}33`,
      }}
    >
      {/* Ambient background particles / glow */}
      <div
        className="absolute -top-32 -right-32 w-96 h-96 rounded-full blur-3xl opacity-25 pointer-events-none"
        style={{ backgroundColor: themeMeta.accentColor }}
      />
      <div
        className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full blur-3xl opacity-20 pointer-events-none"
        style={{ backgroundColor: currentTurnTeamColor || "#3b82f6" }}
      />

      {/* ── Top Header: Theme, Turn, and Team Info ── */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-lg border border-white/20 shrink-0"
            style={{ backgroundColor: `${themeMeta.accentColor}33` }}
          >
            {themeMeta.emoji}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase font-black tracking-widest px-2.5 py-0.5 rounded-full bg-white/10 text-white/90 border border-white/15">
                CHỦ ĐỀ: {themeNameVi}
              </span>
              <span className="text-xs font-bold text-amber-300">
                {miniGameType === "DOORS" && "🚪 Cánh Cửa Bí Ẩn"}
                {miniGameType === "CHESTS" && "🪙 Rương Kho Báu"}
                {miniGameType === "TAROT_CARDS" && "🃏 Thẻ Bài Số Phận"}
                {miniGameType === "RADAR_WINDOWS" && "📡 Ô Radar Viễn Tưởng"}
              </span>
            </div>
            <p className="text-xs text-white/60 mt-0.5 line-clamp-1">{themeMeta.taglineVi}</p>
          </div>
        </div>

        {/* Turn & Team Badge */}
        <div className="flex items-center gap-3">
          <div className="px-3.5 py-1.5 rounded-xl bg-black/40 border border-white/10 text-xs font-mono font-bold text-white/80">
            LƯỢT <span className="text-amber-400 font-black">{currentTurnIndex + 1}</span> / {totalTurns}
            <span className="mx-2 opacity-40">|</span>
            VÒNG <span className="text-cyan-400 font-black">{currentRound}</span>
          </div>

          <div
            className="flex items-center gap-2.5 px-4 py-2 rounded-2xl border-2 shadow-xl backdrop-blur-md"
            style={{
              borderColor: currentTurnTeamColor,
              backgroundColor: `${currentTurnTeamColor}22`,
            }}
          >
            <div
              className="w-4 h-4 rounded-full ring-2 ring-white/50 shrink-0 animate-pulse"
              style={{ backgroundColor: currentTurnTeamColor }}
            />
            <div className="text-left">
              <span className="text-[10px] uppercase font-black tracking-wider text-white/70 block leading-tight">
                ĐỘI ĐANG THI ĐẤU
              </span>
              <span className="text-sm sm:text-base font-black text-white truncate max-w-[150px] block leading-tight">
                {currentTurnTeamName}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Phase HUD / Status Alerts ── */}
      <div className="relative z-10 py-5">
        {/* Phase: QUESTION_ACTIVE */}
        {phase === "QUESTION_ACTIVE" && (
          <div className="p-4 rounded-2xl bg-black/40 border border-cyan-500/30 text-center animate-slide-up">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-300 text-xs font-bold uppercase tracking-wider mb-2">
              <span>🎯</span> VÒNG KHỞI ĐỘNG CÂU HỎI
            </div>
            <h3 className="text-lg sm:text-xl font-black text-white">
              Đội <span style={{ color: currentTurnTeamColor }}>{currentTurnTeamName}</span> đang trả lời câu hỏi!
            </h3>
            <p className="text-xs sm:text-sm text-white/70 mt-1 max-w-xl mx-auto">
              Trả lời chính xác sẽ mở khóa toàn bộ Bản Đồ Bí Ẩn và kích hoạt thử thách tích lũy điểm không giới hạn!
            </p>
          </div>
        )}

        {/* Phase: PUSH_YOUR_LUCK */}
        {phase === "PUSH_YOUR_LUCK" && (
          <div className="flex flex-col items-center justify-center text-center space-y-4">
            {/* The Central Glowing Pot */}
            <div className="w-full max-w-xl mx-auto p-4 sm:p-5 rounded-3xl bg-black/50 border-2 border-amber-400/50 backdrop-blur-md shadow-2xl relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-amber-500/10 via-yellow-500/10 to-amber-500/10 pointer-events-none" />

              <div className="flex items-center justify-between gap-4 mb-2">
                <div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-amber-300">
                  <span>💰</span> HŨ ĐIỂM TÍCH LŨY HIỆN TẠI
                </div>
                {potMultiplier > 1 && (
                  <div className="px-3 py-1 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-black text-xs uppercase tracking-widest border border-white/20 animate-pulse">
                    ⚡ HỆ SỐ NHÂN X{potMultiplier}
                  </div>
                )}
              </div>

              <div className="flex items-baseline justify-center gap-2 py-1">
                <span className="text-5xl sm:text-7xl font-black bg-gradient-to-b from-yellow-200 via-amber-300 to-amber-500 bg-clip-text text-transparent drop-shadow-md font-mono">
                  +{potPoints.toLocaleString()}
                </span>
                <span className="text-xl sm:text-2xl font-black text-amber-300">điểm</span>
              </div>

              <div className="flex items-center justify-between text-xs text-white/70 pt-2 border-t border-white/10 mt-2">
                <span>Đã lật: <strong className="text-white">{cardsFlippedCount}</strong> ô</span>
                <span>Còn lại: <strong className="text-white">{tiles.filter((t) => !t.isOpened).length}</strong> ô bí ẩn</span>
              </div>
            </div>

            {/* Push-Your-Luck Decision Controls */}
            <div className="flex flex-wrap items-center justify-center gap-3 w-full">
              {canCashOut && (
                <button
                  onClick={onCashOut}
                  className="px-6 sm:px-8 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 via-green-500 to-emerald-600 hover:from-emerald-500 hover:to-green-400 text-white font-black text-sm sm:text-base shadow-2xl shadow-emerald-900/50 border-2 border-emerald-300 hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
                >
                  <span>💰</span>
                  <span>DỪNG LẠI & BẢO TOÀN +{potPoints} ĐIỂM</span>
                </button>
              )}

              <div className="text-xs font-semibold px-4 py-2 rounded-xl bg-black/40 border border-white/10 text-white/80">
                {canFlip
                  ? "👉 Bạn có thể lật tiếp để nhân thêm điểm HOẶC chọn Bảo Toàn điểm để cất túi an toàn!"
                  : `Đội ${currentTurnTeamName} đang lựa chọn: Lật tiếp hay dừng lại?`}
              </div>
            </div>
          </div>
        )}

        {/* Phase: TURN_SUMMARY */}
        {phase === "TURN_SUMMARY" && (
          <div className="w-full max-w-2xl mx-auto text-center animate-slide-up">
            {turnFinishedReason === "QUESTION_FAILED" ? (
              <div className="p-6 rounded-3xl bg-gradient-to-b from-slate-900/95 to-black/95 border-2 border-rose-500/80 shadow-2xl space-y-3">
                <div className="text-5xl sm:text-6xl animate-bounce">❌</div>
                <h3 className="text-2xl sm:text-3xl font-black text-rose-400">
                  TRẢ LỜI CHƯA CHÍNH XÁC!
                </h3>
                <p className="text-sm text-slate-300 max-w-lg mx-auto leading-relaxed">
                  Đội <strong className="text-white">{currentTurnTeamName}</strong> chưa trả lời đúng câu hỏi thử thách. Lượt thi đấu kết thúc với 0 điểm tích lũy.
                </p>
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-200 font-bold text-sm">
                  ⚠️ Kết quả: 0 điểm cho lượt thi này.
                </div>
              </div>
            ) : turnFinishedReason === "BOMB_HIT" && bombExploded ? (
              <div className="p-6 rounded-3xl bg-gradient-to-b from-red-950/90 to-black/90 border-2 border-red-500 shadow-2xl space-y-3">
                <div className="text-5xl sm:text-6xl animate-bounce">
                  {bombExploded.type === "DOOM" ? "💀" : bombExploded.type === "MAJOR" ? "💥" : "💣"}
                </div>
                <h3 className="text-2xl sm:text-3xl font-black text-red-400">
                  {bombExploded.title}
                </h3>
                <p className="text-sm text-white/80 max-w-lg mx-auto leading-relaxed">
                  {bombExploded.description}
                </p>
                <div className="p-3 rounded-xl bg-red-900/40 border border-red-500/50 text-red-200 font-bold text-sm">
                  ⚠️ Hậu quả: {bombExploded.penaltyText}
                </div>
                {storyResult && (
                  <div className="text-xs text-white/60 font-mono pt-2">
                    Điểm số: {storyResult.oldScore} ➔ <strong className="text-white text-sm">{storyResult.newScore}đ</strong>
                  </div>
                )}
              </div>
            ) : turnFinishedReason === "ALL_CLEARED" ? (
              <div className="p-6 rounded-3xl bg-gradient-to-b from-amber-950/90 to-black/90 border-2 border-amber-400 shadow-2xl space-y-3">
                <div className="text-5xl sm:text-6xl animate-bounce">🏆</div>
                <h3 className="text-2xl sm:text-3xl font-black text-amber-300">
                  ĐẠI THẮNG QUÉT SẠCH TẤT CẢ THẺ!
                </h3>
                <p className="text-sm text-amber-100 max-w-lg mx-auto">
                  Tuyệt đỉnh! Đội {currentTurnTeamName} đã lật hết toàn bộ phần thưởng an toàn mà không dính bom!
                </p>
                <div className="p-3 rounded-xl bg-amber-500/20 border border-amber-400/50 text-amber-300 font-black text-base">
                  {storyResult?.rewardText || `Cộng thưởng an toàn trọn vẹn!`}
                </div>
              </div>
            ) : (
              <div className="p-6 rounded-3xl bg-gradient-to-b from-emerald-950/90 to-black/90 border-2 border-emerald-400 shadow-2xl space-y-3">
                <div className="text-5xl sm:text-6xl animate-bounce">💰</div>
                <h3 className="text-2xl sm:text-3xl font-black text-emerald-300">
                  BẢO TOÀN ĐIỂM THÀNH CÔNG!
                </h3>
                <p className="text-sm text-emerald-100 max-w-lg mx-auto">
                  Lựa chọn sáng suốt! Đội {currentTurnTeamName} đã bảo toàn an toàn quỹ điểm về tài khoản!
                </p>
                <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-400/50 text-emerald-300 font-black text-lg font-mono">
                  {storyResult?.rewardText || `Bảo toàn thành công!`}
                </div>
              </div>
            )}

            {(isAdmin || isSandbox) && (
              <div className="mt-5">
                <button
                  onClick={onAdvanceTurn}
                  className="px-8 py-3.5 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black text-base shadow-xl border border-white/20 hover:scale-105 active:scale-95 transition-all cursor-pointer"
                >
                  CHUYỂN SANG LƯỢT TIẾP THEO ➔
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── The Mystery Tiles Grid (Cards / Doors / Chests / Radars) ── */}
      <div className="relative z-10 mt-2">
        <div
          className={`grid gap-3 sm:gap-4 ${
            tiles.length === 9
              ? "grid-cols-3 sm:grid-cols-3 md:grid-cols-3 max-w-2xl mx-auto"
              : tiles.length === 16
              ? "grid-cols-4 sm:grid-cols-4 md:grid-cols-4 max-w-4xl mx-auto"
              : tiles.length > 8
              ? "grid-cols-3 sm:grid-cols-5 md:grid-cols-5"
              : "grid-cols-2 sm:grid-cols-4 md:grid-cols-4"
          }`}
        >
          {tiles.map((tile) => {
            const isOpened = tile.isOpened;
            const isFlipping = flippingTileId === tile.id;
            const isBomb = tile.type !== "REWARD";

            if (!isOpened) {
              return (
                <button
                  key={tile.id}
                  onClick={() => handleTileClick(tile)}
                  disabled={!canFlip}
                  className={`relative aspect-[3/4] rounded-2xl p-3 flex flex-col items-center justify-between border-2 transition-all duration-300 ${
                    canFlip
                      ? "cursor-pointer hover:-translate-y-1.5 hover:shadow-2xl hover:border-amber-400 bg-gradient-to-b from-white/15 to-white/5 border-white/20 active:scale-95 group"
                      : "cursor-default opacity-85 bg-black/40 border-white/10"
                  }`}
                  style={{
                    boxShadow: canFlip ? `0 8px 25px -5px ${themeMeta.accentColor}44` : undefined,
                  }}
                >
                  {/* Card number badge */}
                  <div className="w-full flex items-center justify-between">
                    <span className="w-6 h-6 rounded-full bg-black/40 border border-white/20 text-[11px] font-black font-mono text-white/80 flex items-center justify-center">
                      #{tile.id}
                    </span>
                    {canFlip && (
                      <span className="text-[10px] font-bold text-amber-300 opacity-0 group-hover:opacity-100 transition-opacity">
                        LẬT NGAY ✨
                      </span>
                    )}
                  </div>

                  {/* Mystery Icon */}
                  <div className="text-4xl sm:text-5xl my-auto transition-transform duration-300 group-hover:scale-110 drop-shadow-lg">
                    {getCoverIcon()}
                  </div>

                  {/* Label */}
                  <div className="w-full text-center">
                    <span className="text-xs sm:text-sm font-black text-white/90 block truncate">
                      {tile.label}
                    </span>
                    <span className="text-[9px] uppercase tracking-wider text-white/50 block">
                      Ẩn số
                    </span>
                  </div>
                </button>
              );
            }

            // Opened Tile (Revealed Reward or Bomb)
            return (
              <div
                key={tile.id}
                className={`relative aspect-[3/4] rounded-2xl p-3 flex flex-col items-center justify-between border-2 shadow-2xl animate-fade-in transition-all ${
                  isBomb
                    ? tile.type === "BOMB_DOOM"
                      ? "bg-gradient-to-b from-purple-950 via-black to-red-950 border-purple-500 text-purple-200"
                      : tile.type === "BOMB_MAJOR"
                      ? "bg-gradient-to-b from-red-950 via-amber-950 to-black border-red-500 text-red-200"
                      : "bg-gradient-to-b from-red-950 to-black border-red-400 text-red-200"
                    : "bg-gradient-to-b from-amber-950/80 via-emerald-950/60 to-black border-amber-400 text-amber-200"
                }`}
              >
                {/* Tile Header */}
                <div className="w-full flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold opacity-60">#{tile.id}</span>
                  <span
                    className={`text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full ${
                      isBomb ? "bg-red-500/30 text-red-300" : "bg-emerald-500/30 text-emerald-300"
                    }`}
                  >
                    {isBomb ? "BOM" : "THƯỞNG"}
                  </span>
                </div>

                {/* Big Center Icon */}
                <div className="text-3xl sm:text-4xl my-auto text-center drop-shadow-md">
                  {tile.type === "BOMB_MINOR" && "💣"}
                  {tile.type === "BOMB_MAJOR" && "💥"}
                  {tile.type === "BOMB_DOOM" && "💀"}
                  {tile.type === "REWARD" && (tile.effectType === "MULTIPLY_X2" ? "⚡" : tile.effectType === "SAFE_SHIELD" ? "🛡️" : "💎")}
                </div>

                {/* Title & Reward Info */}
                <div className="w-full text-center">
                  <p className="text-xs sm:text-sm font-black text-white leading-tight truncate">
                    {tile.storyTitle}
                  </p>
                  <p
                    className={`text-xs sm:text-base font-black font-mono mt-0.5 ${
                      isBomb
                        ? "text-red-400"
                        : tile.effectType === "MULTIPLY_X2"
                        ? "text-purple-300"
                        : "text-amber-300"
                    }`}
                  >
                    {isBomb
                      ? tile.type === "BOMB_MAJOR"
                        ? "-20đ Tổng"
                        : tile.type === "BOMB_DOOM"
                        ? "÷2 Tổng Điểm"
                        : "Mất Quỹ"
                      : tile.effectType === "MULTIPLY_X2"
                      ? "X2 HŨ ĐIỂM"
                      : `+${tile.deltaPoints}đ`}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Footer Standings / Quick Score Bar ── */}
      {teams && teams.length > 0 && (
        <div className="relative z-10 mt-6 pt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs">
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
