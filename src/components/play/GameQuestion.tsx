"use client";

import { QuestionState, AnswerRevealPayload, BloomLevel, BLOOM_METADATA, getBloomLevelFromPoints } from "@/types";
import { useState } from "react";

interface Props {
  question: QuestionState;
  timer: { remaining: number; total: number } | null;
  onAnswer: (answer: string | string[]) => void;
  onBuzz: () => void;
  answered: boolean;
  revealPayload: AnswerRevealPayload | null;
  roomStatus: string;
  hiddenOptionIds?: string[];
  roomMode?: string;
  myTeamId?: string;
  answerMethod?: "DEVICE" | "MC";
  isStealPhase?: boolean;
  stealBuzzedTeam?: { teamId: string; teamName: string; playerId: string; playerName: string } | null;
  buzzedBy?: { playerName: string; teamId?: string; teamName?: string } | null;
}

export default function GameQuestion({
  question,
  timer,
  onAnswer,
  onBuzz,
  answered,
  revealPayload,
  roomStatus,
  hiddenOptionIds,
  roomMode = "CLASSIC",
  myTeamId,
  answerMethod = "DEVICE",
  isStealPhase = false,
  stealBuzzedTeam = null,
  buzzedBy = null,
}: Props) {
  const [selected, setSelected] = useState<string[]>([]);
  const [essayText, setEssayText] = useState("");
  const [fillText, setFillText] = useState("");

  const q = question.question;
  const timerPercent = timer ? (timer.remaining / timer.total) * 100 : 100;
  const timerColor = timerPercent > 50 ? "#06b6d4" : timerPercent > 25 ? "#f59e0b" : "#ef4444";

  const bloom: BloomLevel = question.bloomLevel ?? getBloomLevelFromPoints(q.points);
  const bloomMeta = BLOOM_METADATA[bloom];

  // Mode permissions
  const isMcMode = (question.answerMethod ?? answerMethod) === "MC";

  // In BOUNCEBACK mode:
  // Primary phase: only primary team can answer
  const isPrimaryTeam = myTeamId && question.primaryTeamId ? myTeamId === question.primaryTeamId : false;
  // Steal phase: only steal buzzed team can answer
  const isStealTeam = myTeamId && stealBuzzedTeam ? myTeamId === stealBuzzedTeam.teamId : false;

  // In BUZZ mode: only buzzed team can answer
  const isBuzzedTeam = myTeamId && buzzedBy?.teamId ? myTeamId === buzzedBy.teamId : false;

  const canAnswerThisQuestion = () => {
    if (answered || !!revealPayload || roomStatus === "PAUSED" || isMcMode) return false;
    if (roomMode === "BOUNCEBACK") {
      if (stealBuzzedTeam) return isStealTeam;
      if (isStealPhase) return false; // In steal buzz phase, only buzzing is allowed
      return isPrimaryTeam;
    }
    if (roomMode === "BUZZ") {
      return isBuzzedTeam;
    }
    return true;
  };

  const handleOptionClick = (optId: string) => {
    if (!canAnswerThisQuestion() || hiddenOptionIds?.includes(optId)) return;
    if (q.type === "MC_SINGLE" || q.type === "TRUE_FALSE") {
      onAnswer(optId);
    } else if (q.type === "MC_MULTI") {
      const next = selected.includes(optId)
        ? selected.filter((id) => id !== optId)
        : [...selected, optId];
      setSelected(next);
    }
  };

  const handleSubmitMulti = () => {
    if (selected.length > 0 && canAnswerThisQuestion()) onAnswer(selected);
  };

  const handleSubmitEssay = () => {
    if (essayText.trim() && canAnswerThisQuestion()) onAnswer(essayText.trim());
  };

  const handleSubmitFill = () => {
    if (fillText.trim() && canAnswerThisQuestion()) onAnswer(fillText.trim());
  };

  return (
    <div className="glass rounded-2xl p-6 flex flex-col gap-4 animate-slide-up">
      {/* Timer */}
      {timer && (
        <div className="flex items-center gap-3">
          <div className="relative w-12 h-12">
            <svg className="w-12 h-12" viewBox="0 0 48 48">
              <circle cx="24" cy="24" r="20" fill="none" stroke="#2d2d5a" strokeWidth="5" />
              <circle
                cx="24" cy="24" r="20"
                fill="none"
                stroke={timerColor}
                strokeWidth="5"
                strokeDasharray={`${2 * Math.PI * 20}`}
                strokeDashoffset={`${2 * Math.PI * 20 * (1 - timerPercent / 100)}`}
                className="timer-ring transition-all duration-1000"
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-sm font-bold">{timer.remaining}</span>
          </div>
          <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-1000"
              style={{ width: `${timerPercent}%`, background: timerColor }}
            />
          </div>
        </div>
      )}

      {/* Mode & Turn Banner */}
      {roomMode === "BOUNCEBACK" && (
        <div className="rounded-xl p-3 border text-sm font-medium transition-all">
          {isStealPhase ? (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-amber-500/20 border border-amber-500/50 p-3 rounded-lg text-amber-300">
              <div className="flex items-center gap-2">
                <span className="text-2xl animate-bounce">⚡</span>
                <div>
                  <p className="font-bold">CHUÔNG CƯỚP LƯỢT ĐANG MỞ (5s)!</p>
                  <p className="text-xs text-amber-200/80">Đội nào bấm chuông nhanh nhất sẽ giành quyền trả lời (+100%, sai -50%)</p>
                </div>
              </div>
              {!isPrimaryTeam && (
                <button
                  onClick={onBuzz}
                  className="px-6 py-3 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-black font-black text-lg rounded-xl shadow-lg active:scale-95 animate-pulse"
                >
                  🔔 BẤM CHUÔNG!
                </button>
              )}
            </div>
          ) : stealBuzzedTeam ? (
            <div className="bg-purple-500/20 border border-purple-500/40 p-3 rounded-lg text-purple-200">
              <span className="font-bold text-cyan-400">⚡ Đội {stealBuzzedTeam.teamName}</span> đã cướp chuông thành công!
              {isStealTeam && " 👉 Đội của bạn đang trả lời!"}
            </div>
          ) : (
            <div className="bg-blue-500/15 border border-blue-500/30 p-3 rounded-lg flex items-center justify-between">
              <div>
                <span className="text-xs uppercase text-blue-300 tracking-wider">🎯 Đội trả lời chính: </span>
                <span className="font-bold text-foreground">{question.primaryTeamName ?? "Đang xác định"}</span>
              </div>
              {isPrimaryTeam ? (
                <span className="px-2.5 py-1 rounded-full bg-green-500/20 text-green-300 text-xs font-bold border border-green-500/30">
                  Lượt của bạn
                </span>
              ) : (
                <span className="text-xs text-muted-foreground">Chờ đội chính</span>
              )}
            </div>
          )}
        </div>
      )}

      {/* BUZZ Mode Banner */}
      {roomMode === "BUZZ" && (
        <div className="rounded-xl p-3 border text-sm font-medium transition-all">
          {!buzzedBy ? (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-amber-500/15 border border-amber-500/30 p-3 rounded-lg">
              <div>
                <p className="font-bold text-amber-300">⚡ Tranh quyền trả lời</p>
                <p className="text-xs text-muted-foreground">Đội bấm chuông sớm nhất sẽ giành quyền trả lời duy nhất!</p>
              </div>
              <button
                onClick={onBuzz}
                className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-black font-black rounded-xl shadow-lg active:scale-95 animate-pulse"
              >
                🔔 BẤM CHUÔNG!
              </button>
            </div>
          ) : (
            <div className="bg-yellow-500/20 border border-yellow-500/40 p-3 rounded-lg text-yellow-200">
              ⚡ Đội <span className="font-bold text-white">{buzzedBy.teamName ?? buzzedBy.playerName}</span> đã bấm chuông sớm nhất!
              {isBuzzedTeam && " 👉 Đội bạn đang có quyền trả lời!"}
            </div>
          )}
        </div>
      )}

      {/* MC Mode Notice */}
      {isMcMode && (
        <div className="px-4 py-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center gap-2.5 text-xs text-cyan-300 font-medium">
          <span className="text-base">🎙️</span>
          <span>
            <strong>Chế độ trả lời qua MC:</strong> Thí sinh đọc và trả lời miệng cho MC/Giám khảo. Quản trò (Admin) sẽ click chọn đáp án trên máy.
          </span>
        </div>
      )}

      {/* Question metadata & Bloom Difficulty */}
      <div>
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
            {q.type === "MC_SINGLE" ? "Trắc nghiệm" : q.type === "MC_MULTI" ? "Nhiều đáp án" : q.type === "TRUE_FALSE" ? "Đúng/Sai" : q.type === "FILL_BLANK" ? "Điền vào chỗ trống" : q.type === "ESSAY" ? "Tự luận" : "Câu hỏi"}
          </span>
          <span className="text-xs text-muted-foreground">·</span>
          <span
            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border"
            style={{ color: bloomMeta.color, borderColor: `${bloomMeta.color}40`, background: bloomMeta.bg }}
          >
            <span>{bloomMeta.emoji}</span>
            <span>{bloomMeta.labelVi}</span>
            <span className="opacity-75">({q.points}đ)</span>
          </span>
        </div>

        <h2 className="text-xl font-bold leading-relaxed">{q.content}</h2>
        {q.mediaUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={q.mediaUrl} alt="Media" className="max-h-48 rounded-xl mt-3 mx-auto" />
        )}
      </div>

      {/* Answer Area */}
      {roomStatus === "PAUSED" ? (
        <div className="text-center py-6 text-muted-foreground">⏸️ Game đã tạm dừng</div>
      ) : q.type === "MC_SINGLE" || q.type === "TRUE_FALSE" ? (
        <div className="grid grid-cols-1 gap-2">
          {q.options?.map((opt, i) => {
            const labels = ["A", "B", "C", "D"];
            const isCorrect = revealPayload?.correctAnswer.includes(opt.id);
            const isSelected = selected.includes(opt.id);
            const isHidden = hiddenOptionIds?.includes(opt.id);
            const disabled = !canAnswerThisQuestion() || isHidden;

            return (
              <button
                key={opt.id}
                onClick={() => handleOptionClick(opt.id)}
                disabled={disabled}
                className={`flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all ${
                  isHidden
                    ? "opacity-25 line-through border-border cursor-not-allowed bg-black/30"
                    : revealPayload
                    ? isCorrect
                      ? "border-green-500 bg-green-500/20 text-green-300"
                      : "border-border opacity-50"
                    : isSelected
                    ? "border-purple-500 bg-purple-500/20"
                    : disabled
                    ? "border-border opacity-60 cursor-not-allowed"
                    : "border-border hover:border-purple-400 active:scale-95"
                }`}
              >
                <span className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm font-bold shrink-0">
                  {labels[i] ?? i + 1}
                </span>
                <span className="flex-1">{opt.text}</span>
                {isHidden && (
                  <span className="text-[10px] px-2 py-0.5 rounded bg-muted text-muted-foreground font-mono">
                    50/50
                  </span>
                )}
              </button>
            );
          })}
        </div>
      ) : q.type === "MC_MULTI" ? (
        <div className="flex flex-col gap-2">
          {q.options?.map((opt, i) => {
            const labels = ["A", "B", "C", "D"];
            const isCorrect = revealPayload?.correctAnswer.includes(opt.id);
            const isSelected = selected.includes(opt.id);
            const isHidden = hiddenOptionIds?.includes(opt.id);
            const disabled = !canAnswerThisQuestion() || isHidden;

            return (
              <button
                key={opt.id}
                onClick={() => handleOptionClick(opt.id)}
                disabled={disabled}
                className={`flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all ${
                  isHidden
                    ? "opacity-25 line-through border-border cursor-not-allowed bg-black/30"
                    : revealPayload
                    ? isCorrect
                      ? "border-green-500 bg-green-500/20"
                      : "border-border opacity-50"
                    : isSelected
                    ? "border-purple-500 bg-purple-500/20"
                    : disabled
                    ? "border-border opacity-60 cursor-not-allowed"
                    : "border-border hover:border-purple-400"
                }`}
              >
                <span className="w-8 h-8 rounded border-2 flex items-center justify-center shrink-0">
                  {isSelected && "✓"}
                </span>
                <span className="font-bold w-6">{labels[i]}</span>
                <span className="flex-1">{opt.text}</span>
                {isHidden && (
                  <span className="text-[10px] px-2 py-0.5 rounded bg-muted text-muted-foreground font-mono">
                    50/50
                  </span>
                )}
              </button>
            );
          })}
          {!answered && !revealPayload && canAnswerThisQuestion() && (
            <button
              onClick={handleSubmitMulti}
              disabled={selected.length === 0}
              className="mt-2 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 font-bold transition-colors disabled:opacity-50"
            >
              Xác nhận ({selected.length} đã chọn)
            </button>
          )}
        </div>
      ) : q.type === "FILL_BLANK" ? (
        <div className="flex gap-2">
          <input
            type="text"
            value={fillText}
            onChange={(e) => setFillText(e.target.value)}
            placeholder={isMcMode ? "Đang ở chế độ trả lời qua MC..." : "Điền câu trả lời..."}
            disabled={!canAnswerThisQuestion()}
            className="flex-1 px-4 py-3 rounded-xl bg-input border border-border focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60"
            onKeyDown={(e) => e.key === "Enter" && handleSubmitFill()}
          />
          <button
            onClick={handleSubmitFill}
            disabled={!fillText.trim() || !canAnswerThisQuestion()}
            className="px-4 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 font-bold disabled:opacity-50"
          >
            Gửi
          </button>
        </div>
      ) : null}

      {answered && !revealPayload && (
        <div className="text-center py-2 text-green-400 font-bold">✓ Đã ghi nhận câu trả lời — Chờ kết quả...</div>
      )}

      {/* Answer Reveal Section */}
      {revealPayload && (
        <div className="space-y-3 pt-2">
          <div className="text-center py-2 font-bold text-lg">
            {revealPayload.answers.find((a) => a.isCorrect) ? (
              <span className="text-green-400">✓ Đúng rồi!</span>
            ) : (
              <span className="text-red-400">✗ Sai rồi!</span>
            )}
          </div>

          {/* Rarity Empirical Bonus Banner */}
          {revealPayload.rarityBonusPercent !== undefined && revealPayload.rarityBonusPercent > 0 && (
            <div className="p-3 rounded-xl bg-gradient-to-r from-red-500/20 to-amber-500/20 border border-amber-500/40 text-center animate-bounce-in">
              <p className="font-black text-amber-300 text-sm">
                🔥 CÂU HỎI HÓC BÚA (Độ hiếm toàn phòng: {Math.round((revealPayload.roomAccuracy ?? 0) * 100)}% đúng)
              </p>
              <p className="text-xs text-amber-200/80 mt-0.5">
                Các đội trả lời đúng được cộng thưởng thêm <strong>+{revealPayload.rarityBonusPercent}%</strong> điểm hiếm thực nghiệm!
              </p>
            </div>
          )}

          {/* Team Summaries breakdown */}
          {revealPayload.teamSummaries && revealPayload.teamSummaries.length > 0 && (
            <div className="p-3 rounded-xl bg-card/90 border border-border space-y-2">
              <p className="text-xs font-bold text-cyan-400 uppercase tracking-wider">📊 Điểm đồng đội câu này</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {revealPayload.teamSummaries.map((ts) => (
                  <div key={ts.teamId} className="flex items-center justify-between p-2 rounded-lg bg-background/60 border border-border text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-3 h-3 rounded-full shrink-0" style={{ background: ts.teamColor }} />
                      <span className="font-bold truncate">{ts.teamName}</span>
                    </div>
                    <div className="flex items-center gap-2 font-mono shrink-0">
                      <span className="text-muted-foreground">{ts.correctMembers}/{ts.totalOnlineMembers} đúng</span>
                      {ts.empiricalMultiplier && ts.empiricalMultiplier > 1 && (
                        <span className="text-amber-400 font-bold text-[10px]">🔥+{Math.round((ts.empiricalMultiplier - 1) * 100)}%</span>
                      )}
                      <span className={ts.pointsAwarded >= 0 ? "text-green-400 font-bold" : "text-red-400 font-bold"}>
                        {ts.pointsAwarded >= 0 ? `+${ts.pointsAwarded}` : ts.pointsAwarded} pts
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
