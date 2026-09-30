"use client";

import { useState } from "react";
import { WagerState } from "@/types";

interface Props {
  wagerState?: WagerState;
  myTeamId?: string;
  myTeamScore?: number;
  myTeamName?: string;
  onSubmitWager?: (amount: number) => void;
  isDisplay?: boolean;
}

export default function WagerPanel({
  wagerState,
  myTeamId,
  myTeamScore = 0,
  myTeamName,
  onSubmitWager,
  isDisplay = false,
}: Props) {
  const [customWager, setCustomWager] = useState<number>(10);
  const [hasSubmittedLocal, setHasSubmittedLocal] = useState(false);

  if (!wagerState) return null;

  const {
    phase,
    wagerTimeRemaining,
    minWager,
    allowanceMinScore,
    topicPreview,
    difficultyPreview,
    teamWagers,
  } = wagerState;

  // Max wagerable score: score > 0 ? score : allowance
  const effectiveMaxScore = myTeamScore > 0 ? myTeamScore : allowanceMinScore;
  const clampedWager = Math.max(minWager, Math.min(customWager, effectiveMaxScore));

  const myWager = myTeamId && teamWagers ? teamWagers[myTeamId] : undefined;
  const isAlreadySubmitted = hasSubmittedLocal || Boolean(myWager?.submitted);

  const handleSubmit = (amount: number) => {
    if (isAlreadySubmitted || phase !== "WAGER_PERIOD") return;
    setHasSubmittedLocal(true);
    if (onSubmitWager) onSubmitWager(amount);
  };

  const handlePercentage = (pct: number) => {
    const val = Math.max(minWager, Math.floor((effectiveMaxScore * pct) / 100));
    setCustomWager(val);
  };

  return (
    <div className={`glass rounded-2xl ${isDisplay ? "p-6" : "p-4"} space-y-4`}>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/50 pb-3">
        <div className="flex items-center gap-3">
          <span className="text-3xl">💰</span>
          <div>
            <h3 className={`font-black ${isDisplay ? "text-2xl" : "text-lg"} text-white flex items-center gap-2`}>
              Cược Điểm Bí Mật (Wager & All-In)
            </h3>
            <p className="text-xs text-muted-foreground">
              Bí mật đặt cược số điểm · Đúng nhận số điểm cược, Sai bị trừ số điểm cược
            </p>
          </div>
        </div>

        {/* Phase Indicator & Timer */}
        <div className="flex items-center gap-2">
          {phase === "WAGER_PERIOD" ? (
            <div className="px-4 py-1.5 rounded-xl bg-amber-500/20 border border-amber-500/60 text-amber-300 font-bold text-sm flex items-center gap-2 animate-pulse">
              <span>⏳ Đang đặt cược bí mật:</span>
              <span className="text-white font-mono font-black text-lg">{wagerTimeRemaining}s</span>
            </div>
          ) : (
            <div className="px-3 py-1 rounded-xl bg-purple-500/20 text-purple-300 text-xs font-semibold">
              {phase === "QUESTION_PERIOD" ? "Đang trả lời câu hỏi" : "Bảng cược công khai"}
            </div>
          )}
        </div>
      </div>

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

      {/* Player Betting Interface (When active player in WAGER_PERIOD) */}
      {!isDisplay && myTeamId && phase === "WAGER_PERIOD" && (
        <div className="space-y-4 p-4 rounded-xl bg-card/60 border border-purple-500/30">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Điểm hiện có của đội:</span>
            <span className="font-black text-lg text-cyan-300 font-mono">
              {myTeamScore.toLocaleString()} pts
            </span>
          </div>

          {myTeamScore <= 0 && (
            <p className="text-xs text-yellow-400 bg-yellow-500/10 p-2 rounded-lg border border-yellow-500/30">
              💡 Đội bạn đang có 0 hoặc âm điểm: Hệ thống kích hoạt trợ cấp sàn{" "}
              <strong>{allowanceMinScore} điểm</strong> để đặt cược tiếp!
            </p>
          )}

          {isAlreadySubmitted ? (
            <div className="text-center py-4 bg-green-500/10 border border-green-500/40 rounded-xl text-green-300">
              <span className="text-2xl block mb-1">🔒</span>
              <p className="font-bold">Đã khóa mức cược bí mật thành công!</p>
              <p className="text-xs text-muted-foreground mt-1">
                Mức cược của bạn:{" "}
                <span className="text-white font-mono font-bold text-sm">
                  {myWager?.amount ?? customWager} điểm
                </span>{" "}
                (Giữ kín trước đối thủ)
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-bold text-white">Chọn số điểm cược:</label>
                <span className="text-xl font-black text-yellow-400 font-mono">
                  {clampedWager.toLocaleString()} pts
                </span>
              </div>

              {/* Slider */}
              <input
                type="range"
                min={minWager}
                max={effectiveMaxScore}
                step={5}
                value={clampedWager}
                onChange={(e) => setCustomWager(parseInt(e.target.value) || minWager)}
                className="w-full accent-yellow-400 h-2 bg-muted rounded-lg cursor-pointer"
              />

              {/* Quick Presets */}
              <div className="grid grid-cols-4 gap-2">
                {[
                  { label: "10%", pct: 10 },
                  { label: "25%", pct: 25 },
                  { label: "50%", pct: 50 },
                  { label: "🔥 ALL-IN", pct: 100 },
                ].map(({ label, pct }) => (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => handlePercentage(pct)}
                    className="py-1.5 px-2 rounded-lg bg-white/5 hover:bg-white/15 border border-border text-xs font-bold transition-all"
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* Confirm Bet Button */}
              <button
                type="button"
                onClick={() => handleSubmit(clampedWager)}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-400 hover:to-amber-500 font-black text-black shadow-lg transition-transform active:scale-95"
              >
                🔒 XÁC NHẬN CƯỢC {clampedWager.toLocaleString()} ĐIỂM
              </button>
            </div>
          )}
        </div>
      )}

      {/* Secret Wagers Grid (For Display or Reveal Phase) */}
      <div className="space-y-2">
        <span className="text-xs font-bold text-muted-foreground uppercase">Trạng thái đặt cược các đội:</span>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {Object.entries(teamWagers || {}).map(([teamId, wager]) => {
            const isRevealed = phase === "REVEAL_PERIOD";

            return (
              <div
                key={teamId}
                className="p-3 rounded-xl bg-card/50 border border-border/60 flex items-center justify-between text-xs"
              >
                <span className="font-semibold text-white truncate max-w-[90px]">
                  {wager.teamName}
                </span>

                {isRevealed ? (
                  <span className="font-mono font-black text-yellow-300">
                    {wager.amount.toLocaleString()} pts
                  </span>
                ) : wager.submitted ? (
                  <span className="text-green-400 font-bold flex items-center gap-1">
                    <span>🔒 Đã cược</span>
                  </span>
                ) : (
                  <span className="text-muted-foreground italic">Đang nghĩ...</span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
