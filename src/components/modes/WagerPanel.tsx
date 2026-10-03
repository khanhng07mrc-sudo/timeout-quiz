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
  const [mobileTab, setMobileTab] = useState<"BOTH" | "VUNG1" | "VUNG2">("BOTH");

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
    if (phase !== "WAGER_PERIOD" || isPreviousQuestionWagerTeam || isConsecutiveBlocked || amount > myTeamScore) return;
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

  return (
    <div className={`glass rounded-2xl ${isDisplay ? "p-6" : "p-4"} space-y-4`}>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/50 pb-3">
        <div className="flex items-center gap-3">
          <span className="text-3xl">💰</span>
          <div>
            <h3 className={`font-black ${isDisplay ? "text-2xl" : "text-lg"} text-white flex items-center gap-2`}>
              Cược Điểm (Wager Escalation)
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                Tặng trước {initialPoints}đ
              </span>
            </h3>
            <p className="text-xs text-muted-foreground">
              Đội cược cuối: Đúng = +điểm cược, Sai = -điểm cược · Các đội khác: Đúng = +1/2 điểm câu hỏi (làm tròn lên chia hết cho 5), Sai = 0đ
            </p>
          </div>
        </div>

        {/* Phase Indicator & Timer */}
        <div className="flex items-center gap-2">
          {phase === "WAGER_PERIOD" ? (
            <div className="px-4 py-1.5 rounded-xl bg-amber-500/20 border border-amber-500/60 text-amber-300 font-bold text-sm flex items-center gap-2 animate-pulse">
              <span>{wagerSubPhase === "INITIAL_5S" ? "⏱️ Mở màn:" : "⏳ Thời gian cược:"}</span>
              <span className="text-white font-mono font-black text-lg">{wagerTimeRemaining}s</span>
            </div>
          ) : (
            <div className="px-3 py-1 rounded-xl bg-purple-500/20 text-purple-300 text-xs font-semibold">
              {phase === "QUESTION_PERIOD" ? (questionReady ? "Đang trả lời câu hỏi" : "Chờ MC mở câu hỏi") : "Bảng cược công khai"}
            </div>
          )}
        </div>
      </div>

      {/* Initial 5s Alert */}
      {phase === "WAGER_PERIOD" && wagerSubPhase === "INITIAL_5S" && (
        <div className="p-3 rounded-xl bg-blue-500/15 border border-blue-500/30 text-blue-200 text-xs sm:text-sm flex items-center gap-2">
          <span className="text-lg">⚡</span>
          <span><strong>5 giây mở màn:</strong> Đội nào cược đầu tiên sẽ kích hoạt 15s đếm ngược. Nếu không có đội nào cược, hệ thống sẽ ngẫu nhiên chọn 1 đội cược 10đ mặc định!</span>
        </div>
      )}

      {/* Auto Assigned Notification */}
      {autoAssignedTeamName && (
        <div className="p-3 rounded-xl bg-purple-500/20 border border-purple-500/40 text-purple-200 text-xs sm:text-sm flex items-center gap-2">
          <span className="text-lg">🎲</span>
          <span>
            Hệ thống đã chỉ định ngẫu nhiên đội <strong>{autoAssignedTeamName}</strong> cược khởi điểm <strong>10đ</strong>!
            {isAutoAssigned ? " Đội bạn vẫn có quyền nâng cược thêm 1 lần kế tiếp!" : " Các đội kế tiếp có 15s để nâng cược."}
          </span>
        </div>
      )}

      {/* Finished Bidding / Waiting for Admin to Launch Question */}
      {phase === "QUESTION_PERIOD" && !questionReady && (
        <div className="p-4 rounded-xl bg-amber-500/20 border-2 border-amber-400 text-amber-100 flex flex-col sm:flex-row items-center justify-between gap-3 animate-fadeIn">
          <div>
            <p className="font-black text-base text-amber-300">🎉 ĐÃ CHỐT MỨC CƯỢC THÀNH CÔNG!</p>
            <p className="text-xs text-amber-200/90 mt-0.5">
              Đội chốt cược cuối cùng: <strong>{wagerHistory[wagerHistory.length - 1]?.teamName ?? "Đội cược"}</strong> ({currentHighestWager}đ).
              {isAdmin ? " Bấm nút bên dưới để mở câu hỏi cho thí sinh." : " Đang chờ Quản trò mở câu hỏi..."}
            </p>
          </div>
          {isAdmin && onLaunchQuestion && (
            <button
              onClick={onLaunchQuestion}
              className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-black text-sm shadow-lg shadow-emerald-500/30 transition-all active:scale-95 animate-pulse shrink-0 flex items-center gap-2"
            >
              <span>📢</span>
              <span>Mở câu hỏi cho thí sinh</span>
            </button>
          )}
        </div>
      )}

      {/* Bailout Queue Banner (When any team falls to <= 0) */}
      {bailoutQueue.length > 0 && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 space-y-2.5 animate-fadeIn">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-lg">🚑</span>
              <span className="font-bold text-sm text-rose-300">
                Hàng Đợi Cứu Trợ (Ưu tiên đội rời cuộc chơi sớm hơn):
              </span>
            </div>
            <div className="flex items-center gap-2">
              {isAdmin && onSetBailoutLimit && (
                <div className="flex items-center gap-1.5 text-xs bg-white/10 px-2 py-1 rounded-lg border border-white/10">
                  <span className="text-muted-foreground text-[11px]">Giới hạn:</span>
                  <button
                    type="button"
                    onClick={() => onSetBailoutLimit(Math.max(1, (Object.values(teamBailouts)[0]?.max ?? 1) - 1))}
                    className="w-4 h-4 flex items-center justify-center rounded bg-white/15 hover:bg-white/25 text-white font-bold text-xs"
                    title="Giảm số lần trợ cấp tối đa"
                  >
                    -
                  </button>
                  <span className="font-mono font-bold text-amber-300 text-[11px]">
                    {Object.values(teamBailouts)[0]?.max ?? 1} lần
                  </span>
                  <button
                    type="button"
                    onClick={() => onSetBailoutLimit(Math.min(5, (Object.values(teamBailouts)[0]?.max ?? 1) + 1))}
                    className="w-4 h-4 flex items-center justify-center rounded bg-white/15 hover:bg-white/25 text-white font-bold text-xs"
                    title="Tăng số lần trợ cấp tối đa"
                  >
                    +
                  </button>
                </div>
              )}
              {currentQuestionBailoutUsed ? (
                <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-yellow-500/20 text-yellow-300 border border-yellow-500/40 font-medium">
                  ⏳ Đã dùng quyền cứu trợ câu này — Đội tiếp theo được cứu ở câu kế tiếp
                </span>
              ) : (
                <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-medium">
                  ✨ Sẵn sàng cứu trợ 1 đội ở câu này
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {bailoutQueue.map((item, idx) => {
              const isFirst = idx === 0;
              return (
                <div
                  key={item.teamId}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold border transition-all ${
                    isFirst
                      ? "bg-rose-500/20 border-rose-400 text-white shadow"
                      : "bg-white/5 border-white/10 text-muted-foreground opacity-75"
                  }`}
                >
                  <span className="font-mono text-amber-300">
                    #{idx + 1} {isFirst ? "(Ưu tiên cứu đầu tiên)" : "(Chờ sau)"}
                  </span>
                  <span style={{ color: item.teamColor }}>{item.teamName}</span>
                  <span className="font-mono text-rose-300">({item.score}đ tại câu {item.questionIndex})</span>

                  {isFirst && isAdmin && onGrantBailout && (
                    positiveTeamsCount !== undefined && positiveTeamsCount < 1 ? (
                      <span className="ml-2 text-[10px] text-amber-300 font-bold bg-amber-500/20 px-2 py-0.5 rounded border border-amber-500/40">
                        🔒 Cần &ge;2 đội sống
                      </span>
                    ) : (
                      <button
                        type="button"
                        disabled={currentQuestionBailoutUsed}
                        onClick={() => onGrantBailout(item.teamId)}
                        className="ml-2 px-3 py-1 rounded-md bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed text-black font-black text-xs shadow transition active:scale-95"
                      >
                        {currentQuestionBailoutUsed ? "Chờ câu sau" : "🆘 Cấp Trợ Cấp"}
                      </button>
                    )
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Topic & Difficulty Preview */}
      {(topicPreview || difficultyPreview) && (
        <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-muted-foreground uppercase">Chủ đề câu hỏi:</span>
            <span className="font-bold text-white text-sm">{topicPreview || "Tổng hợp kiến thức"}</span>
          </div>
          {difficultyPreview && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-muted-foreground uppercase">Mức độ:</span>
              <span className="px-2.5 py-0.5 rounded-md bg-purple-500/20 text-purple-300 border border-purple-500/40 text-xs font-bold">
                {difficultyPreview}
              </span>
            </div>
          )}
        </div>
      )}

      {/* ─── HAI VÙNG MÀN HÌNH CƯỢC (VÙNG 1 & VÙNG 2) ─── */}
      {/* Mobile Tab Switcher */}
      <div className="flex lg:hidden items-center justify-center p-1 rounded-xl bg-white/5 border border-white/10 gap-1 text-xs font-bold">
        <button
          type="button"
          onClick={() => setMobileTab("BOTH")}
          className={`flex-1 py-1.5 rounded-lg transition ${mobileTab === "BOTH" ? "bg-white/20 text-white shadow" : "text-muted-foreground hover:text-white"}`}
        >
          🔄 Tất cả
        </button>
        <button
          type="button"
          onClick={() => setMobileTab("VUNG2")}
          className={`flex-1 py-1.5 rounded-lg transition ${mobileTab === "VUNG2" ? "bg-cyan-500/30 text-cyan-300 border border-cyan-500/50 shadow" : "text-muted-foreground hover:text-white"}`}
        >
          🎯 12 Ô Cược
        </button>
        <button
          type="button"
          onClick={() => setMobileTab("VUNG1")}
          className={`flex-1 py-1.5 rounded-lg transition ${mobileTab === "VUNG1" ? "bg-amber-500/30 text-amber-300 border border-amber-500/50 shadow" : "text-muted-foreground hover:text-white"}`}
        >
          📋 Thứ Tự ({wagerHistory.length})
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* ─── VÙNG 1: THỨ TỰ NGƯỜI/ĐỘI CƯỢC (CÔNG KHAI) ─── */}
        <div className={`lg:col-span-5 glass rounded-2xl p-3.5 sm:p-4 border border-amber-500/30 flex flex-col gap-3 ${
          mobileTab === "VUNG2" ? "hidden lg:flex" : "flex"
        }`}>
          <div className="flex items-center justify-between border-b border-white/10 pb-2">
            <div className="flex items-center gap-2">
              <span className="text-xl">📋</span>
              <div>
                <h4 className="font-bold text-sm text-amber-300">VÙNG 1: Thứ Tự Cược</h4>
                <p className="text-[11px] text-muted-foreground">Công khai thời gian thực câu này</p>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full text-xs font-mono font-black bg-amber-500/20 text-amber-300 border border-amber-500/40">
              {currentHighestWager > 0 ? `Đang dẫn: ${currentHighestWager}đ` : "Khởi điểm: 5đ"}
            </span>
          </div>

          {/* History List */}
          <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
            {wagerHistory.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-xs glass rounded-xl border border-white/5 space-y-1.5">
                <span className="text-3xl block mb-1">⚡</span>
                <p className="font-bold text-foreground text-sm">Chưa có đội nào đặt cược!</p>
                <p className="text-[11px] text-amber-200/80">
                  Mức cược mở màn: 5 điểm. Đội nào sẽ ra đòn trước?
                </p>
              </div>
            ) : (
              wagerHistory.map((item) => {
                const isLeading = item.teamId === lastWagerTeamId;
                const isMe = item.teamId === myTeamId;
                return (
                  <div
                    key={`${item.order}-${item.teamId}-${item.amount}`}
                    className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                      isLeading
                        ? "bg-amber-500/20 border-amber-400 ring-2 ring-amber-400/50 shadow-lg"
                        : "bg-white/5 border-white/10 text-foreground"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className={`w-7 h-7 rounded-full flex items-center justify-center font-black text-xs shrink-0 ${
                          item.order === 1
                            ? "bg-yellow-400 text-black shadow"
                            : item.order === 2
                            ? "bg-slate-300 text-black"
                            : item.order === 3
                            ? "bg-amber-600 text-white"
                            : "bg-white/10 text-white"
                        }`}
                      >
                        #{item.order}
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-xs truncate" style={{ color: item.teamColor }}>
                            {item.teamName}
                          </span>
                          {isMe && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-purple-500/30 text-purple-200 border border-purple-500/50">
                              BẠN
                            </span>
                          )}
                        </div>
                        {isLeading && (
                          <span className="text-[10px] text-amber-300 font-semibold flex items-center gap-1">
                            🔥 Vừa cược (Đang dẫn mức cược)
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="font-mono font-black text-base text-yellow-300">
                        {item.amount} pts
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Teams Status Section */}
          {allTeamsList.length > 0 && (
            <div className="pt-2 border-t border-white/10 space-y-1.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Trạng thái các đội:
              </p>
              <div className="flex flex-wrap gap-1.5">
                {allTeamsList.map((t) => {
                  const isResting = t.id === previousQuestionWagerTeamId;
                  const hasBet = wagerHistory.some((h) => h.teamId === t.id);
                  const isDisqualified = !hasBet && !isResting && t.score < minOption;
                  const isLeading = t.id === lastWagerTeamId;
                  if (hasBet && !isLeading) return null;
                  return (
                    <div
                      key={t.id}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-medium flex items-center gap-1.5 border ${
                        isResting
                          ? "bg-purple-500/15 border-purple-500/40 text-purple-300"
                          : isDisqualified
                          ? "bg-red-500/10 border-red-500/30 text-red-300"
                          : isLeading
                          ? "bg-amber-500/10 border-amber-500/30 text-amber-300"
                          : "bg-white/5 border-white/10 text-muted-foreground"
                      }`}
                    >
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ background: t.color }} />
                      <span className="font-bold">{t.name}:</span>
                      {isResting ? (
                        <span className="text-purple-300 font-bold">⏸️ Tạm nghỉ (Đã cược câu trước)</span>
                      ) : isDisqualified ? (
                        <span className="text-red-400 font-bold">🚫 Mất quyền cược ({t.score}đ &lt; {minOption}đ)</span>
                      ) : isLeading ? (
                        <span className="text-amber-300 font-bold">🔥 Giữ mức {currentHighestWager}đ</span>
                      ) : (
                        <span>Chưa cược ({t.score}đ)</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* ─── VÙNG 2: 12 Ô CƯỢC ĐIỂM ─── */}
        <div className={`lg:col-span-7 glass rounded-2xl p-3.5 sm:p-4 border border-cyan-500/30 flex flex-col gap-3 ${
          mobileTab === "VUNG1" ? "hidden lg:flex" : "flex"
        }`}>
          <div className="flex items-center justify-between border-b border-white/10 pb-2">
            <div className="flex items-center gap-2">
              <span className="text-xl">🎯</span>
              <div>
                <h4 className="font-bold text-sm text-cyan-300">VÙNG 2: 12 Ô Cược Điểm</h4>
                <p className="text-[11px] text-muted-foreground">
                  Ô nhỏ nhất: {minOption}đ (+5đ) · Các ô cách nhau 5đ · Tránh cược quá tay
                </p>
              </div>
            </div>
            {myTeamId && (
              <span className="text-xs px-2.5 py-1 rounded-lg bg-cyan-500/20 text-cyan-200 border border-cyan-500/40 font-bold">
                Điểm đội bạn: {myTeamScore} pts
              </span>
            )}
          </div>

          {/* Previous question bettor notice: Luật công bằng - không được cược 2 câu liên tiếp */}
          {isPreviousQuestionWagerTeam && (
            <div className="p-3.5 rounded-xl bg-purple-500/15 border border-purple-500/40 text-purple-200 text-xs flex items-start gap-2.5 animate-bounce-in">
              <span className="text-2xl shrink-0">⏸️</span>
              <div className="space-y-1">
                <p className="font-black text-purple-300 text-sm">
                  ĐỘI BẠN TẠM NGHỈ CƯỢC CÂU NÀY
                </p>
                <p className="text-[11px] leading-relaxed">
                  Theo luật công bằng, đội bạn đã tham gia cược ở câu hỏi trước nên sẽ tạm nghỉ cược câu này để nhường quyền cho các đội khác. Đội bạn vẫn tham gia trả lời và hưởng 1/2 điểm nếu trả lời đúng!
                </p>
              </div>
            </div>
          )}

          {/* Auto-assigned notice: Đội được chỉ định ngẫu nhiên 10đ vẫn được chọn cược 1 lần kế tiếp */}
          {isAutoAssigned && (
            <div className="p-3 rounded-xl bg-purple-500/15 border border-purple-500/40 text-purple-200 text-xs flex items-center gap-2.5 animate-pulse">
              <span className="text-xl shrink-0">🎲</span>
              <div>
                <p className="font-bold">Đội bạn được hệ thống chỉ định cược 10đ khởi điểm!</p>
                <p className="text-[11px] text-purple-200/90">
                  Bạn vẫn có quyền chọn nâng cược thêm 1 lần kế tiếp trong phiên này!
                </p>
              </div>
            </div>
          )}

          {/* Anti-spam notice: "mỗi đội không được cược từ 2 lần liên tiếp trở lên" */}
          {isConsecutiveBlocked && (
            <div className="p-3 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-300 text-xs flex items-center gap-2.5 animate-pulse">
              <span className="text-xl shrink-0">⏳</span>
              <div>
                <p className="font-bold">Đội bạn vừa đặt cược ({currentHighestWager}đ)!</p>
                <p className="text-[11px] text-amber-200/90">
                  Tránh spam cược: Không được cược từ 2 lần liên tiếp trở lên. Vui lòng chờ đội khác cược trước khi có thể cược tiếp!
                </p>
              </div>
            </div>
          )}

          {/* Disqualification notice: "khi số điểm cược hiện lên đã vượt quá điểm đội mình, đội mình sẽ mất quyền cược trong câu hỏi đó" */}
          {hasLostWagerRight && (
            <div className="p-3.5 rounded-xl bg-red-500/15 border border-red-500/40 text-red-200 text-xs flex items-start gap-2.5 animate-bounce-in">
              <span className="text-2xl shrink-0">🚫</span>
              <div className="space-y-1">
                <p className="font-black text-red-300 text-sm">
                  ĐỘI BẠN ĐÃ MẤT QUYỀN CƯỢC TRONG CÂU HỎI NÀY!
                </p>
                <p className="text-[11px] leading-relaxed">
                  Mức cược tối thiểu trên bàn ({minOption}đ) đã vượt quá số điểm hiện tại của đội bạn ({myTeamScore}đ). Đội bạn không thể đặt cược ở câu hỏi này.
                </p>
              </div>
            </div>
          )}

          {cannotRaiseFurther && (
            <div className="p-3 rounded-xl bg-purple-500/15 border border-purple-500/40 text-purple-200 text-xs flex items-center gap-2">
              <span className="text-xl shrink-0">🔒</span>
              <div>
                <p className="font-bold">Đã chốt cược {myWager?.amount} điểm!</p>
                <p className="text-[11px] text-purple-200/80">
                  Mức cược tiếp theo ({minOption}đ) đã vượt quá số điểm hiện có ({myTeamScore}đ). Mức cược của bạn được bảo lưu ở {myWager?.amount}đ.
                </p>
              </div>
            </div>
          )}

          {/* 12 Clickable Cells */}
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 sm:gap-2.5">
            {wagerOptions.map((optValue, idx) => {
              const stepIncrement = 5 * (idx + 1);
              const exceedsMyScore = optValue > myTeamScore;
              const isDisabled =
                isDisplay ||
                phase !== "WAGER_PERIOD" ||
                isPreviousQuestionWagerTeam ||
                isConsecutiveBlocked ||
                hasLostWagerRight ||
                exceedsMyScore;

              const isCurrentSelected = myWager?.amount === optValue;

              return (
                <button
                  key={optValue}
                  type="button"
                  disabled={isDisabled}
                  onClick={() => handleSubmit(optValue)}
                  className={`relative p-2.5 sm:p-3 min-h-[52px] sm:min-h-[58px] rounded-xl border flex flex-col items-center justify-center gap-0.5 sm:gap-1 transition-all duration-200 active:scale-95 ${
                    isCurrentSelected
                      ? "bg-gradient-to-br from-green-500/30 to-emerald-600/30 border-green-400 ring-2 ring-green-400 text-white shadow-lg"
                      : isDisabled
                      ? exceedsMyScore
                        ? "bg-white/5 border-red-500/20 text-muted-foreground/40 opacity-40 cursor-not-allowed"
                        : "bg-white/5 border-white/5 text-muted-foreground/50 opacity-50 cursor-not-allowed"
                      : "bg-card/70 hover:bg-cyan-500/20 border-cyan-500/40 hover:border-cyan-400 text-white hover:shadow-cyan-500/20 hover:shadow-md cursor-pointer group"
                  }`}
                >
                  {/* Step Badge */}
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                      isDisabled ? "bg-white/5 text-muted-foreground" : "bg-cyan-500/20 text-cyan-300"
                    }`}
                  >
                    +{stepIncrement}đ
                  </span>

                  {/* Value */}
                  <span
                    className={`font-mono font-black text-base sm:text-lg ${
                      isCurrentSelected
                        ? "text-green-300"
                        : isDisabled
                        ? "text-muted-foreground/60"
                        : "text-yellow-300 group-hover:text-yellow-200"
                    }`}
                  >
                    {optValue}đ
                  </span>

                  {/* Exceeds score warning */}
                  {exceedsMyScore && !isDisplay && (
                    <span className="text-[9px] text-red-400/80 font-semibold truncate max-w-[80px]">
                      🔒 &gt; {myTeamScore}đ
                    </span>
                  )}

                  {isCurrentSelected && (
                    <span className="text-[9px] text-green-300 font-black">
                      ✓ Đang cược
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {isDisplay && (
            <p className="text-[11px] text-muted-foreground text-center italic mt-1">
              Thí sinh bấm chọn 1 trong 12 ô cược trên thiết bị cá nhân để nâng mức cược
            </p>
          )}
        </div>
      </div>

      {/* Reveal Phase Results Summary */}
      {phase === "REVEAL_PERIOD" && (
        <div className="space-y-2 pt-2 border-t border-white/10">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-bold text-muted-foreground uppercase">
              Kết quả cược & tính điểm câu này:
            </span>
            <span className="text-[11px] text-amber-300 font-semibold">
              👑 Đội cược cuối: Đúng +{currentHighestWager}đ / Sai -{currentHighestWager}đ · Các đội còn lại: Đúng +1/2 câu hỏi, Sai 0đ
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {Object.entries(teamWagers).map(([teamId, wager]) => {
              const bailoutsRem = teamBailouts[teamId]?.remaining ?? 1;
              const isDisqualified = wager.disqualified;
              const isLastWager = teamId === lastWagerTeamId;

              return (
                <div
                  key={teamId}
                  className={`p-3 rounded-xl border flex flex-col gap-1 text-xs ${
                    isLastWager
                      ? "bg-amber-500/20 border-amber-500/60 ring-1 ring-amber-400"
                      : "bg-card/50 border-border/60"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-white truncate max-w-[90px] flex items-center gap-1">
                      {isLastWager && <span>👑</span>}
                      {wager.teamName}
                    </span>
                    <span className="text-[10px] text-purple-300 font-bold">
                      🛡️ {bailoutsRem}/{teamBailouts[teamId]?.max ?? 1}
                    </span>
                  </div>

                  <div className="flex items-center justify-between mt-1">
                    {isDisqualified ? (
                      <span className="text-red-400 font-bold text-xs">🚫 Mất quyền cược</span>
                    ) : isLastWager ? (
                      <span className="font-mono font-black text-amber-300 text-sm">
                        {currentHighestWager} pts (Chốt cược)
                      </span>
                    ) : wager.submitted ? (
                      <span className="font-mono font-medium text-yellow-300/80 text-xs">
                        Đã nâng {wager.amount}đ
                      </span>
                    ) : (
                      <span className="text-muted-foreground italic text-xs">Không cược</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
