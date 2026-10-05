"use client";

import { useState } from "react";
import { WagerState } from "@/types";

interface Props {
  wagerState?: WagerState;
  myTeamId?: string;
  myTeamScore?: number;
  myTeamName?: string;
  positiveTeamsCount?: number;
  onSubmitWager?: (amount: number) => void;
  isAdmin?: boolean;
  onGrantBailout?: (teamId: string) => void;
  onSetBailoutLimit?: (limit: number) => void;
  onLaunchQuestion?: () => void;
  isDisplay?: boolean;
  teams?: Array<{ id: string; name: string; color: string; score: number }>;
}

export default function WagerPanel({
  wagerState,
  myTeamId,
  myTeamScore = 0,
  myTeamName,
  positiveTeamsCount,
  onSubmitWager,
  isAdmin = false,
  onGrantBailout,
  onSetBailoutLimit,
  onLaunchQuestion,
  isDisplay = false,
  teams = [],
}: Props) {
  const [hasSubmittedLocal, setHasSubmittedLocal] = useState(false);

  if (!wagerState) return null;

  const {
    phase,
    wagerSubPhase,
    autoAssignedTeamId,
    autoAssignedTeamName,
    questionReady,
    wagerTimeRemaining,
    currentHighestWager = 0,
    lastWagerTeamId,
    previousQuestionWagerTeamId,
    wagerHistory = [],
    initialPoints = 50,
    topicPreview,
    difficultyPreview,
    teamWagers = {},
    teamBailouts = {},
    bailoutQueue = [],
    currentQuestionBailoutUsed = false,
    maxBetCap,
    wagerMultiplierCap = 2.5,
    baseQuestionPoints,
    roundIndex,
    totalRounds,
  } = wagerState;

  // 12 Cells calculation: lowest is currentHighestWager + 5, stepping by 5 each
  const minOption = currentHighestWager + 5;
  const wagerOptions = Array.from({ length: 12 }, (_, i) => currentHighestWager + 5 * (i + 1));

  const myWager = myTeamId && teamWagers ? teamWagers[myTeamId] : undefined;
  const myBailoutInfo = myTeamId && teamBailouts ? teamBailouts[myTeamId] : undefined;
  const myBailoutsRemaining = myBailoutInfo ? myBailoutInfo.remaining : 1;

  // Rule: "Và để đảm bảo công bằng, một đội không được cược 2 câu liên tiếp"
  const isPreviousQuestionWagerTeam = Boolean(myTeamId && previousQuestionWagerTeamId === myTeamId);

  // Đội được chỉ định ngẫu nhiên 10đ vẫn được chọn cược 1 lần kế tiếp
  const isAutoAssigned = Boolean(myTeamId && autoAssignedTeamId === myTeamId);
  // Rule: "mỗi đội không được cược từ 2 lần liên tiếp trở lên" (trừ lần đầu của đội được chỉ định ngẫu nhiên)
  const isConsecutiveBlocked = Boolean(myTeamId && lastWagerTeamId === myTeamId && !isAutoAssigned);

  // Rule: "khi số điểm cược hiện lên đã vượt quá điểm đội mình, đội mình sẽ mất quyền cược trong câu hỏi đó"
  const hasLostWagerRight = Boolean(myTeamId && myTeamScore < minOption && !myWager?.submitted && !isAutoAssigned);
  const cannotRaiseFurther = Boolean(myTeamId && myTeamScore < minOption && myWager?.submitted);

  const handleSubmit = (amount: number) => {
    if (
      phase !== "WAGER_PERIOD" ||
      isPreviousQuestionWagerTeam ||
      isConsecutiveBlocked ||
      amount > myTeamScore ||
      (maxBetCap && amount > maxBetCap)
    ) return;
    setHasSubmittedLocal(true);
    if (onSubmitWager) onSubmitWager(amount);
  };

  // Compile team list for status section
  const allTeamsList = teams.length > 0 ? teams : Object.values(teamWagers).map((tw) => ({
    id: tw.teamId,
    name: tw.teamName,
    color: "#6366f1",
    score: tw.amount,
  }));

  const winningTeam = wagerHistory[wagerHistory.length - 1];
  const winningTeamName = winningTeam?.teamName ?? autoAssignedTeamName ?? "Đội cược";
  const winningTeamColor = winningTeam?.teamColor ?? "#f59e0b";
  const wagerAmt = currentHighestWager || 10;
  const isMeWinning = myTeamId && (winningTeam?.teamId === myTeamId || autoAssignedTeamId === myTeamId);

  // ── 1. GIAI ĐOẠN ĐANG TRẢ LỜI CÂU HỎI HOẶC CÔNG BỐ ĐÁP ÁN: THU GỌN VÀO THANH BADGE ~40PX ──
  if ((phase === "QUESTION_PERIOD" && questionReady) || phase === "REVEAL_PERIOD") {
    return (
      <div className="glass rounded-xl p-2 sm:p-2.5 border border-amber-500/40 bg-amber-500/10 flex flex-wrap items-center justify-between gap-2 shadow-lg animate-fadeIn text-xs">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-lg shrink-0">💰</span>
          <span className="font-bold text-amber-200">
            Đội cược: <strong className="text-amber-300 underline font-black">{winningTeamName} {isMeWinning ? "(Đội bạn)" : ""}</strong> ({wagerAmt}đ)
          </span>
          {maxBetCap !== undefined && (
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30 text-[10px]">
              🛡️ Trần: {maxBetCap}đ
            </span>
          )}
          {roundIndex !== undefined && totalRounds !== undefined && (
            <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30 text-[10px]">
              🔄 Vòng {roundIndex + 1}/{totalRounds}
            </span>
          )}
        </div>
        <div className="text-[11px] text-amber-200/80 font-medium">
          {isMeWinning ? "Đúng = +" : "Đội cược: Đúng = +"}{wagerAmt}đ, Sai = -{wagerAmt}đ · Các đội khác: Đúng = +{Math.max(5, Math.ceil((((baseQuestionPoints || 20) / 2) * wagerMultiplierCap) / 5) * 5)}đ
        </div>
      </div>
    );
  }

  // ── 2. KHI PHIÊN CƯỢC KẾT THÚC VÀ ĐANG CHỜ CHUYỂN CÂU HỎI (2.5S AUTO-ADVANCE) ──
  if (phase === "QUESTION_PERIOD" && !questionReady) {
    return (
      <div className="glass rounded-2xl p-4 sm:p-5 border-2 border-amber-400/80 bg-gradient-to-b from-amber-500/20 via-[#0f111e]/90 to-purple-950/40 text-center space-y-2.5 shadow-2xl animate-fadeIn max-w-md mx-auto my-auto flex flex-col items-center justify-center">
        <span className="text-3xl sm:text-4xl animate-bounce">👑</span>
        <div className="space-y-0.5">
          <h3 className="text-base sm:text-lg font-black text-amber-300 uppercase tracking-wide">
            ĐÃ CHỐT MỨC CƯỢC THÀNH CÔNG!
          </h3>
          <p className="text-xs text-slate-300">
            {isMeWinning ? "Đội bạn đã giành quyền cược điểm câu này!" : `Đội ${winningTeamName} đã giành quyền cược điểm.`}
          </p>
        </div>

        <div className="px-3.5 py-1.5 rounded-xl bg-black/60 border border-amber-400/40 inline-flex items-center gap-2.5 shadow-inner">
          <div className="w-3 h-3 rounded-full shrink-0 animate-pulse" style={{ background: winningTeamColor }} />
          <span className="text-sm sm:text-base font-black text-white">{winningTeamName}</span>
          <span className="px-2 py-0.5 rounded-md bg-amber-500 text-black font-black text-xs">
            {wagerAmt}đ
          </span>
        </div>

        <div className="pt-1 flex items-center justify-center gap-2 text-xs text-amber-200/90 font-medium">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span>Hệ thống đang tự động mở câu hỏi...</span>
        </div>

        {isAdmin && onLaunchQuestion && (
          <button
            type="button"
            onClick={onLaunchQuestion}
            className="mt-1 px-3 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-white font-black text-xs shadow transition active:scale-95 flex items-center gap-1.5 cursor-pointer"
          >
            <span>⚡</span>
            <span>Mở câu hỏi ngay</span>
          </button>
        )}
      </div>
    );
  }

  // ── 3. GIAI ĐOẠN ĐANG ĐẤU GIÁ CƯỢC (WAGER_PERIOD) - BỐ CỤC 2 CỘT TỐI ƯU DIỆN TÍCH ──
  return (
    <div className={`glass rounded-2xl ${isDisplay ? "p-3 sm:p-4" : "p-2.5 sm:p-3"} space-y-2 flex flex-col justify-start`}>
      {/* ── Compact Header Bar ────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-1.5">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xl">💰</span>
          <div className="flex items-center gap-1.5 flex-wrap">
            <h3 className="font-black text-sm sm:text-base text-white">
              Cược Điểm
            </h3>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
              +{initialPoints}đ
            </span>
            {totalRounds !== undefined && roundIndex !== undefined && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-bold">
                Vòng {roundIndex + 1}/{totalRounds}
              </span>
            )}
            {maxBetCap !== undefined && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold" title={`Trần cược tối đa: ${maxBetCap}đ`}>
                🛡️ Trần: {maxBetCap}đ
              </span>
            )}
          </div>
          <span className="text-[10px] text-muted-foreground hidden lg:inline">
            · Đúng: +cược, Sai: -cược · Đội khác: +1/2 điểm × hệ số trần
          </span>
        </div>

        {/* Phase Indicator & Timer */}
        <div className="flex items-center gap-1.5 shrink-0">
          <div className={`px-2.5 py-1 rounded-lg border text-xs font-bold flex items-center gap-1.5 ${
            wagerSubPhase === "INITIAL_5S"
              ? "bg-blue-500/20 border-blue-500/40 text-blue-300 animate-pulse"
              : "bg-amber-500/20 border-amber-500/50 text-amber-300"
          }`}>
            <span>{wagerSubPhase === "INITIAL_5S" ? "⏱️ Mở cược:" : "⏳ Thời gian:"}</span>
            <span className="text-white font-mono font-black text-sm">{wagerTimeRemaining}s</span>
          </div>
        </div>
      </div>

      {/* Bailout Queue Alert (if any team needs bailout) */}
      {bailoutQueue.length > 0 && (
        <div className="px-2.5 py-1.5 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-between text-xs animate-fadeIn">
          <div className="flex items-center gap-1.5 text-rose-300 font-semibold truncate">
            <span>🚑</span>
            <span className="truncate">Cứu trợ ưu tiên: <strong>{bailoutQueue[0]?.teamName}</strong></span>
          </div>
          {onGrantBailout && !currentQuestionBailoutUsed && (
            <button
              type="button"
              onClick={() => onGrantBailout(bailoutQueue[0].teamId)}
              className="px-2 py-0.5 rounded bg-rose-600 hover:bg-rose-500 text-white font-bold text-[10px] transition shrink-0 cursor-pointer"
            >
              Cấp cứu trợ
            </button>
          )}
        </div>
      )}

      {/* ── BỐ CỤC 2 CỘT NGANG (SPLIT GRID 5:7) ────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-stretch min-h-0">
        {/* ══ CỘT TRÁI (5 cols ~42%): CHỦ ĐỀ & DIỄN BIẾN THỨ TỰ CƯỢC ══ */}
        <div className="sm:col-span-5 flex flex-col gap-2 min-h-0">
          {/* Topic & Difficulty Preview */}
          <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between gap-2 shrink-0">
            <div className="min-w-0">
              <span className="text-[10px] font-bold text-muted-foreground uppercase block">Chủ đề câu hỏi:</span>
              <p className="font-bold text-white text-xs truncate" title={topicPreview || "Tổng hợp kiến thức"}>
                {topicPreview || "Tổng hợp kiến thức"}
              </p>
            </div>
            {difficultyPreview && (
              <span className="px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-300 border border-purple-500/40 text-[10px] font-bold shrink-0">
                {difficultyPreview}
              </span>
            )}
          </div>

          {/* VÙNG 1: Thứ Tự Cược (Realtime List) */}
          <div className="glass rounded-xl p-2.5 border border-amber-500/30 flex-1 flex flex-col gap-1.5 min-h-[160px] max-h-[220px]">
            <div className="flex items-center justify-between border-b border-white/10 pb-1 shrink-0">
              <span className="font-bold text-xs text-amber-300 flex items-center gap-1">
                <span>📋</span>
                <span>Thứ tự cược ({wagerHistory.length})</span>
              </span>
              <span className="text-[10px] font-mono font-bold text-amber-200">
                {currentHighestWager > 0 ? `👑 Đang dẫn: ${currentHighestWager}đ` : "Khởi điểm: 10đ"}
              </span>
            </div>

            {/* Scrollable feed */}
            <div className="flex-1 overflow-y-auto space-y-1 pr-0.5 text-xs">
              {wagerHistory.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-3 text-muted-foreground text-[11px] italic">
                  <span>⚡ 5s đầu tiên: Hãy là đội mở màn!</span>
                  <span className="text-[10px] text-slate-400 mt-0.5">Nếu không đội nào cược, hệ thống sẽ chỉ định ngẫu nhiên 10đ.</span>
                </div>
              ) : (
                wagerHistory.map((item) => {
                  const isLeading = item.teamId === lastWagerTeamId;
                  const isMe = item.teamId === myTeamId;
                  return (
                    <div
                      key={`${item.order}-${item.teamId}-${item.amount}`}
                      className={`flex items-center justify-between px-2 py-1 rounded-lg border text-xs transition ${
                        isLeading
                          ? "bg-amber-500/25 border-amber-400 font-bold ring-1 ring-amber-400/40"
                          : "bg-white/5 border-white/10 text-slate-300"
                      }`}
                    >
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className={`w-4 h-4 rounded-full flex items-center justify-center font-bold text-[9px] shrink-0 ${
                          item.order === 1 ? "bg-amber-400 text-black" : "bg-white/15 text-white"
                        }`}>
                          #{item.order}
                        </span>
                        <div className="flex items-center gap-1 min-w-0">
                          <span className="truncate max-w-[110px]" style={{ color: item.teamColor }}>
                            {item.teamName}
                          </span>
                          {isMe && <span className="text-[8px] px-1 rounded bg-purple-500/30 text-purple-200 font-bold">BẠN</span>}
                        </div>
                      </div>
                      <span className="font-mono font-black text-amber-300 shrink-0 text-xs">
                        {item.amount}đ
                      </span>
                    </div>
                  );
                })
              )}
            </div>

            {/* Teams status summary pills */}
            {allTeamsList.length > 0 && (
              <div className="pt-1 border-t border-white/10 flex flex-wrap gap-1 shrink-0">
                {allTeamsList.map((t) => {
                  const isResting = t.id === previousQuestionWagerTeamId;
                  const hasBet = wagerHistory.some((h) => h.teamId === t.id);
                  const isDisqualified = !hasBet && !isResting && t.score < minOption;
                  const isLeading = t.id === lastWagerTeamId;
                  return (
                    <span
                      key={t.id}
                      className={`px-1.5 py-0.5 rounded text-[9px] font-medium flex items-center gap-1 border ${
                        isResting
                          ? "bg-purple-500/20 border-purple-400 text-purple-300"
                          : isDisqualified
                          ? "bg-red-500/15 border-red-500/30 text-red-300"
                          : isLeading
                          ? "bg-amber-500/20 border-amber-400 text-amber-300 font-bold"
                          : "bg-white/5 border-white/10 text-slate-400"
                      }`}
                    >
                      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: t.color }} />
                      <span className="truncate max-w-[65px]">{t.name}</span>
                      <span>{t.score}đ</span>
                    </span>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ══ CỘT PHẢI (7 cols ~58%): 12 Ô CƯỢC ĐIỂM COMPACT ══ */}
        <div className="sm:col-span-7 glass rounded-xl p-2.5 border border-cyan-500/30 flex flex-col gap-1.5 min-h-0">
          <div className="flex items-center justify-between border-b border-white/10 pb-1 shrink-0">
            <div className="flex items-center gap-1.5">
              <span className="text-base">🎯</span>
              <span className="font-bold text-xs text-cyan-300">
                12 Mức Cược (+5đ/ô)
              </span>
            </div>
            {myTeamId && (
              <span className="text-[11px] px-2 py-0.5 rounded-lg bg-cyan-500/20 text-cyan-200 border border-cyan-500/40 font-bold font-mono">
                Điểm bạn: {myTeamScore}đ
              </span>
            )}
          </div>

          {/* Contextual status alerts in compact banner */}
          {Boolean(maxBetCap && minOption > maxBetCap) ? (
            <div className="px-2.5 py-1 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-200 text-xs flex items-center gap-1.5 animate-pulse shrink-0">
              <span>🛡️</span>
              <span className="font-bold text-[11px]">ĐÃ CHẠM TRẦN CƯỢC TỐI ĐA ({maxBetCap}đ) — Phiên cược dừng tại đây!</span>
            </div>
          ) : isPreviousQuestionWagerTeam ? (
            <div className="px-2.5 py-1 rounded-lg bg-purple-500/20 border border-purple-500/40 text-purple-200 text-xs flex items-center gap-1.5 shrink-0">
              <span>⏸️</span>
              <span className="text-[11px]">Đội bạn tạm nghỉ cược câu này để đảm bảo công bằng.</span>
            </div>
          ) : isConsecutiveBlocked ? (
            <div className="px-2.5 py-1 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-200 text-xs flex items-center gap-1.5 shrink-0">
              <span>⏳</span>
              <span className="text-[11px]">Đang giữ mức cược {currentHighestWager}đ. Chờ đội khác nâng cược!</span>
            </div>
          ) : hasLostWagerRight ? (
            <div className="px-2.5 py-1 rounded-lg bg-red-500/20 border border-red-500/40 text-red-200 text-xs flex items-center gap-1.5 shrink-0">
              <span>🚫</span>
              <span className="text-[11px]">Mức tối thiểu ({minOption}đ) vượt quá điểm đội bạn ({myTeamScore}đ).</span>
            </div>
          ) : null}

          {/* 12 Cells Grid (4 cols x 3 rows) */}
          <div className="grid grid-cols-4 gap-1.5 flex-1 items-stretch">
            {wagerOptions.map((optValue, idx) => {
              const stepIncrement = (idx + 1) * 5;
              const exceedsMyScore = Boolean(myTeamId && optValue > myTeamScore);
              const exceedsMaxCap = Boolean(maxBetCap && optValue > maxBetCap);
              const isCurrentSelected = myWager?.amount === optValue;
              const isDisabled =
                phase !== "WAGER_PERIOD" ||
                isDisplay ||
                isPreviousQuestionWagerTeam ||
                isConsecutiveBlocked ||
                hasLostWagerRight ||
                exceedsMyScore ||
                exceedsMaxCap;

              return (
                <button
                  key={optValue}
                  type="button"
                  disabled={isDisabled}
                  onClick={() => handleSubmit(optValue)}
                  className={`h-11 sm:h-12 rounded-xl border flex flex-col items-center justify-center transition-all relative ${
                    isCurrentSelected
                      ? "border-green-400 bg-green-500/30 text-white shadow-lg ring-1 ring-green-400"
                      : isDisabled
                      ? "border-white/5 bg-white/[0.02] text-slate-500 cursor-not-allowed opacity-50"
                      : "border-cyan-500/30 bg-cyan-950/30 hover:bg-cyan-500/25 hover:border-cyan-400 text-white cursor-pointer active:scale-95 shadow-sm"
                  }`}
                >
                  <span className="text-[8px] sm:text-[9px] text-cyan-300 font-semibold leading-none">
                    +{stepIncrement}đ
                  </span>
                  <span className="text-xs sm:text-sm font-black font-mono leading-tight">
                    {optValue}đ
                  </span>
                  {exceedsMaxCap && !isDisplay && (
                    <span className="text-[7px] text-amber-400 font-bold leading-none">
                      &gt;Trần
                    </span>
                  )}
                  {exceedsMyScore && !exceedsMaxCap && !isDisplay && (
                    <span className="text-[7px] text-red-400 font-bold leading-none">
                      &gt;Điểm
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {isDisplay && (
            <p className="text-[9px] text-muted-foreground text-center italic shrink-0 pt-0.5">
              Thí sinh bấm chọn 1 trong 12 ô cược trên thiết bị cá nhân để nâng mức cược
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
