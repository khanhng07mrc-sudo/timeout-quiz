"use client";

import React, { useState, useEffect } from "react";
import type { TieBreakerState } from "@/types";

interface TieBreakerOverlayProps {
  tieBreaker: TieBreakerState | null;
  role: "DISPLAY" | "PLAYER" | "ADMIN";
  playerTeamId?: string;
  onBuzz?: () => void;
  onAnswer?: (optionId: string) => void;
  onLuckyPick?: (envelopeId: number) => void;
  onAdminAction?: (action: "NEXT_QUESTION" | "START_LUCKY_DRAW" | "FORCE_CHAMPION", winnerTeamId?: string) => void;
  onClose?: () => void;
}

export default function TieBreakerOverlay({
  tieBreaker,
  role,
  playerTeamId,
  onBuzz,
  onAnswer,
  onLuckyPick,
  onAdminAction,
  onClose,
}: TieBreakerOverlayProps) {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);

  useEffect(() => {
    setSelectedOption(null);
  }, [tieBreaker?.questionIndex, tieBreaker?.status]);

  if (!tieBreaker) return null;

  const isTiedTeam = playerTeamId
    ? tieBreaker.tiedTeams.some((t) => t.id === playerTeamId)
    : false;
  const isMyTeamBuzzed = Boolean(playerTeamId && tieBreaker.buzzedTeamId === playerTeamId);
  const hasMyTeamAttempted = Boolean(playerTeamId && tieBreaker.attemptedTeamIds.includes(playerTeamId));

  // ═════════════════════════════════════════════════════════════════════════
  // 1. INTRO: MÀN HÌNH ĐỐI ĐẦU RỰC LỬA (VS)
  // ═════════════════════════════════════════════════════════════════════════
  if (tieBreaker.status === "INTRO") {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#060813]/98 p-4 text-center animate-fade-in overflow-hidden">
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 z-20 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs border border-white/20 transition cursor-pointer"
          >
            ✕ Đóng
          </button>
        )}
        {/* Glow ambient background */}
        <div className="absolute inset-0 bg-gradient-to-t from-red-950/60 via-purple-950/40 to-amber-950/50 pointer-events-none" />
        
        <div className="relative z-10 max-w-4xl mx-auto space-y-6 animate-scale-in">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-red-600/30 border border-red-500 text-red-300 text-xs sm:text-sm font-black uppercase tracking-widest animate-pulse shadow-lg">
            <span>⚔️</span> PHÂN ĐỊNH VÔ ĐỊCH • SUDDEN DEATH <span>⚔️</span>
          </div>

          <h1 className="text-2xl sm:text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-500 uppercase tracking-tight drop-shadow-2xl">
            HÒA ĐIỂM NGÔI ĐẦU BẢNG!
          </h1>
          
          <p className="text-sm sm:text-base text-purple-200 max-w-xl mx-auto font-medium">
            Điểm số ngang tài ngang sức sau toàn bộ câu hỏi chính thức! Kích hoạt loạt câu hỏi phụ bấm chuông tranh ngôi Quán Quân!
          </p>

          {/* Versus Display */}
          <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-10 pt-4">
            {tieBreaker.tiedTeams.map((team, idx) => (
              <React.Fragment key={team.id}>
                {idx > 0 && (
                  <div className="text-3xl sm:text-5xl font-black text-amber-400 font-serif italic animate-pulse">
                    VS
                  </div>
                )}
                <div
                  className="p-4 sm:p-6 rounded-3xl border-2 shadow-2xl flex flex-col items-center gap-2 min-w-[160px] sm:min-w-[220px] transition-transform hover:scale-105"
                  style={{
                    backgroundColor: `${team.color || "#6366f1"}25`,
                    borderColor: team.color || "#6366f1",
                  }}
                >
                  <div className="text-4xl sm:text-6xl drop-shadow-lg">
                    {team.avatar || "👑"}
                  </div>
                  <h3 className="text-lg sm:text-2xl font-black text-white truncate max-w-[200px]">
                    {team.name}
                  </h3>
                  <div className="px-3 py-1 rounded-full bg-black/60 border border-white/20 text-amber-300 font-mono font-black text-sm sm:text-base">
                    {team.score} điểm
                  </div>
                </div>
              </React.Fragment>
            ))}
          </div>

          <div className="pt-6">
            <span className="inline-block px-4 py-2 rounded-xl bg-white/10 text-white font-mono text-xs uppercase tracking-widest border border-white/20 animate-pulse">
              Chuẩn bị bước vào Câu hỏi phụ #1...
            </span>
          </div>
        </div>
      </div>
    );
  }

  // ═════════════════════════════════════════════════════════════════════════
  // 2. LUCKY DRAW: BỐC THĂM LÁ THĂM / HỘP QUÀ BÍ MẬT KHI SAU 3 CÂU VẪN HÒA
  // ═════════════════════════════════════════════════════════════════════════
  if (tieBreaker.status === "LUCKY_DRAW" || (tieBreaker.status === "COMPLETED" && tieBreaker.luckyDraw)) {
    const draw = tieBreaker.luckyDraw!;
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#060813]/98 p-4 text-center animate-fade-in overflow-y-auto">
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 z-20 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs border border-white/20 transition cursor-pointer"
          >
            ✕ Đóng
          </button>
        )}
        <div className="relative z-10 max-w-4xl mx-auto space-y-6 my-auto py-8">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/30 border border-amber-400 text-amber-300 text-xs sm:text-sm font-black uppercase tracking-widest animate-pulse shadow-lg">
            <span>🎁</span> VÒNG BỐC THĂM ĐỊNH MỆNH <span>👑</span>
          </div>

          <h2 className="text-2xl sm:text-4xl font-black text-white uppercase tracking-tight">
            SAU 3 CÂU PHỤ VẪN BẤT PHÂN THẮNG BẠI!
          </h2>
          <p className="text-xs sm:text-sm text-amber-200/90 max-w-md mx-auto">
            Vận may sẽ chọn ra người xứng đáng nhất! Hãy chọn một lá thăm bí mật để tìm Vương Miện Quán Quân!
          </p>

          {/* Envelopes list */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 max-w-2xl mx-auto pt-4">
            {draw.envelopes.map((env) => {
              const isOpened = env.isOpened;
              const isWin = env.isChampion;
              return (
                <button
                  key={env.id}
                  type="button"
                  disabled={isOpened || (role === "PLAYER" && !isTiedTeam)}
                  onClick={() => onLuckyPick?.(env.id)}
                  className={`relative aspect-[3/4] rounded-2xl p-4 flex flex-col items-center justify-between border-2 transition-all duration-300 cursor-pointer ${
                    isOpened
                      ? isWin
                        ? "bg-gradient-to-b from-amber-500 to-yellow-600 border-yellow-200 text-black shadow-2xl scale-105 ring-4 ring-yellow-400 animate-bounce"
                        : "bg-slate-900 border-slate-700 text-slate-400 opacity-60"
                      : "bg-gradient-to-b from-purple-900/80 to-slate-950 border-purple-400/60 hover:border-amber-400 hover:scale-105 shadow-xl group"
                  }`}
                >
                  <span className="text-xs font-mono font-black opacity-75">
                    Lá Thăm #{env.id}
                  </span>

                  <div className="text-4xl sm:text-6xl my-auto transition-transform group-hover:scale-110">
                    {isOpened ? (isWin ? "👑" : "🥈") : "🎁"}
                  </div>

                  <div className="w-full text-center">
                    <span className="text-xs sm:text-sm font-black block truncate">
                      {isOpened
                        ? isWin
                          ? "VƯƠNG MIỆN!"
                          : "Á QUÂN"
                        : "CHẠM ĐỂ MỞ"}
                    </span>
                    {env.pickedByTeamName && (
                      <span className="text-[10px] text-amber-300 font-bold block truncate">
                        {env.pickedByTeamName}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {tieBreaker.championTeamName && (
            <div className="p-4 rounded-2xl bg-amber-500/20 border-2 border-amber-400 text-amber-300 font-black text-lg sm:text-2xl animate-bounce-in shadow-2xl">
              🎉 CHÚC MỪNG QUÁN QUÂN: {tieBreaker.championTeamName} 👑
            </div>
          )}
        </div>
      </div>
    );
  }

  // ═════════════════════════════════════════════════════════════════════════
  // 3. COMPLETED: VINH DANH QUÁN QUÂN
  // ═════════════════════════════════════════════════════════════════════════
  if (tieBreaker.status === "COMPLETED") {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#060813]/98 p-4 text-center animate-fade-in overflow-hidden">
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 z-20 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs border border-white/20 transition cursor-pointer"
          >
            ✕ Đóng
          </button>
        )}
        <div className="relative z-10 max-w-2xl mx-auto space-y-4 animate-bounce-in">
          <div className="text-6xl sm:text-8xl animate-bounce">👑</div>
          <div className="inline-block px-4 py-1.5 rounded-full bg-amber-500/30 border border-amber-400 text-amber-300 text-xs font-black uppercase tracking-widest">
            SUDDEN DEATH COMPLETED
          </div>
          <h1 className="text-3xl sm:text-5xl font-black text-white uppercase tracking-tight">
            XƯỚNG TÊN QUÁN QUÂN!
          </h1>
          <div className="p-6 rounded-3xl bg-gradient-to-r from-amber-500/30 via-yellow-500/40 to-amber-500/30 border-2 border-yellow-400 shadow-2xl">
            <h2 className="text-2xl sm:text-4xl font-black text-yellow-300 drop-shadow">
              {tieBreaker.championTeamName}
            </h2>
            <p className="text-xs sm:text-sm text-yellow-100 mt-2 font-medium">
              Xuất sắc chiến thắng ở loạt đấu câu hỏi phụ cân não để đoạt ngôi vô địch!
            </p>
          </div>
          <p className="text-xs text-white/60 font-mono">
            Đang chuyển sang Bảng tổng kết chính thức...
          </p>
        </div>
      </div>
    );
  }

  // ═════════════════════════════════════════════════════════════════════════
  // 4. QUESTION ACTIVE & BUZZER & REVEAL PHASES
  // ═════════════════════════════════════════════════════════════════════════
  const q = tieBreaker.currentQuestion;
  if (!q) return null;

  const isBuzzerLocked = tieBreaker.status === "BUZZER_LOCKED";
  const isAnswerRevealed = tieBreaker.status === "ANSWER_REVEALED";

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-between bg-[#060813]/98 p-3 sm:p-6 text-center animate-fade-in overflow-y-auto">
      {/* Top Header */}
      <div className="w-full max-w-4xl mx-auto flex items-center justify-between gap-2 pt-2">
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-full bg-red-600/30 border border-red-500 text-red-300 text-xs font-black uppercase tracking-wider animate-pulse">
            ⚔️ CÂU HỎI PHỤ #{tieBreaker.questionIndex + 1}/{tieBreaker.maxQuestions}
          </span>
          <span className="px-2.5 py-1 rounded-full bg-white/10 text-white/90 text-xs font-bold font-mono">
            SUDDEN DEATH
          </span>
        </div>

        {/* Versus badges */}
        <div className="flex items-center gap-1.5">
          {tieBreaker.tiedTeams.map((t) => (
            <span
              key={t.id}
              className="px-2.5 py-1 rounded-lg text-xs font-black truncate max-w-[120px]"
              style={{
                backgroundColor: `${t.color || "#6366f1"}35`,
                color: t.color || "#fff",
                border: `1px solid ${t.color || "#6366f1"}`,
              }}
            >
              {t.name}
            </span>
          ))}
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="ml-2 px-2.5 py-1 rounded-lg bg-red-500/20 hover:bg-red-500/40 text-red-300 text-xs font-bold border border-red-500/40 transition cursor-pointer"
            >
              ✕ Đóng
            </button>
          )}
        </div>
      </div>

      {/* Main Question Card */}
      <div className="w-full max-w-4xl mx-auto my-auto py-4 space-y-4">
        {/* Buzzer Alert Banner */}
        {isBuzzerLocked && (
          <div className="p-3 sm:p-4 rounded-2xl bg-amber-500/20 border-2 border-amber-400 text-amber-300 font-black text-sm sm:text-base animate-bounce-in shadow-xl flex items-center justify-center gap-2">
            <span className="text-xl sm:text-2xl animate-bounce">🚨</span>
            <span>
              ĐỘI <strong className="text-white underline">{tieBreaker.buzzedTeamName}</strong> ĐÃ GIÀNH ĐƯỢC CHUÔNG!
              {isMyTeamBuzzed ? " Hãy chọn đáp án ngay!" : " Đang chờ câu trả lời..."}
            </span>
          </div>
        )}

        {isAnswerRevealed && (
          <div className="p-3 rounded-2xl bg-blue-500/20 border-2 border-blue-400 text-blue-200 font-bold text-xs sm:text-sm animate-bounce-in">
            ℹ️ Cả hai đội chưa trả lời chính xác. Chuẩn bị sang câu hỏi phụ tiếp theo...
          </div>
        )}

        {/* Question Text */}
        <div className="p-4 sm:p-6 rounded-3xl bg-slate-900/90 border border-slate-700 shadow-2xl text-left space-y-2">
          <p className="text-base sm:text-xl md:text-2xl font-black text-white leading-relaxed">
            {q.content}
          </p>
          {isAnswerRevealed && q.explanation && (
            <p className="text-xs sm:text-sm text-emerald-300 font-medium italic border-t border-slate-800 pt-2">
              💡 Giải thích: {q.explanation}
            </p>
          )}
        </div>

        {/* Options Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
          {q.options.map((opt) => {
            const isCorrect = isAnswerRevealed && opt.id === q.correctOptionId;
            const isSelected = selectedOption === opt.id;
            const canPlayerAnswer = role === "PLAYER" && isMyTeamBuzzed && !selectedOption;

            return (
              <button
                key={opt.id}
                type="button"
                disabled={!canPlayerAnswer}
                onClick={() => {
                  if (canPlayerAnswer) {
                    setSelectedOption(opt.id);
                    onAnswer?.(opt.id);
                  }
                }}
                className={`p-3 sm:p-4 rounded-2xl text-left border-2 transition-all flex items-center gap-3 ${
                  isCorrect
                    ? "bg-emerald-600 border-emerald-400 text-white font-black shadow-lg scale-102"
                    : isSelected
                    ? "bg-amber-600 border-amber-300 text-white font-bold"
                    : canPlayerAnswer
                    ? "bg-slate-800/90 border-slate-600 hover:border-amber-400 hover:bg-slate-700 text-white cursor-pointer active:scale-98 shadow-md"
                    : "bg-slate-900/60 border-slate-800 text-slate-300 cursor-default opacity-80"
                }`}
              >
                <span className="w-8 h-8 rounded-xl bg-black/40 border border-white/20 flex items-center justify-center font-mono font-black text-xs shrink-0">
                  {opt.id}
                </span>
                <span className="text-xs sm:text-sm font-bold flex-1 leading-snug">
                  {opt.text}
                </span>
                {isCorrect && <span className="text-base">✅</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Bottom Action Area */}
      <div className="w-full max-w-4xl mx-auto pb-4">
        {/* PLAYER: BIG BUZZER BUTTON */}
        {role === "PLAYER" && (
          <div className="w-full max-w-md mx-auto">
            {isTiedTeam ? (
              hasMyTeamAttempted ? (
                <div className="p-3 rounded-xl bg-red-950/80 border border-red-500 text-red-300 text-xs font-bold">
                  ❌ Đội của bạn đã trả lời sai ở câu này. Quyền trả lời thuộc về đối thủ!
                </div>
              ) : isBuzzerLocked ? (
                isMyTeamBuzzed ? (
                  <div className="p-3 rounded-xl bg-amber-500/20 border border-amber-400 text-amber-300 text-xs font-black animate-pulse">
                    ⚡ ĐÃ GIÀNH CHUÔNG! Hãy bấm chọn 1 trong 4 đáp án phía trên!
                  </div>
                ) : (
                  <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-700 text-slate-400 text-xs font-medium">
                    Đối thủ đã bấm chuông trước. Hãy sẵn sàng bấm nếu đối thủ sai!
                  </div>
                )
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    onBuzz?.();
                  }}
                  className="w-full py-4 sm:py-5 rounded-2xl bg-gradient-to-r from-red-600 via-rose-600 to-red-600 hover:from-red-500 hover:to-rose-500 text-white font-black text-base sm:text-xl uppercase tracking-wider shadow-2xl border-2 border-white/30 cursor-pointer active:scale-95 transition-all transform hover:scale-102 animate-pulse"
                >
                  🚨 BẤM CHUÔNG GIÀNH QUYỀN 🚨
                </button>
              )
            ) : (
              <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-700 text-slate-400 text-xs font-medium">
                👀 Đội bạn đang theo dõi trận tranh tài câu hỏi phụ giữa các đội hòa điểm.
              </div>
            )}
          </div>
        )}

        {/* ADMIN CONTROLS */}
        {role === "ADMIN" && (
          <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
            <button
              type="button"
              onClick={() => onAdminAction?.("NEXT_QUESTION")}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs border border-white/20 transition cursor-pointer"
            >
              ⏩ Bỏ qua / Sang câu phụ tiếp theo
            </button>
            <button
              type="button"
              onClick={() => onAdminAction?.("START_LUCKY_DRAW")}
              className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs border border-amber-300 transition cursor-pointer"
            >
              🎁 Chuyển sang Bốc Thăm May Mắn
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
