"use client";

import { QuestionState, AnswerRevealPayload, BloomLevel, BLOOM_METADATA, getBloomLevelFromPoints } from "@/types";
import { useState, useEffect } from "react";
import { calculateAuthoritativeTimer } from "@/lib/clock-sync";

interface Props {
  question: QuestionState;
  timer: { remaining: number; total: number; endsAt?: number } | null;
  onAnswer: (answer: string | string[]) => void;
  onBuzz: () => void;
  answered: boolean;
  revealPayload: AnswerRevealPayload | null;
  roomStatus: string;
  hiddenOptionIds?: string[];
  roomMode?: string;
  myTeamId?: string;
  playerId?: string;
  answerMethod?: "DEVICE" | "MC";
  isStealPhase?: boolean;
  stealBuzzedTeam?: { teamId: string; teamName: string; playerId: string; playerName: string } | null;
  buzzedBy?: { playerName: string; teamId?: string; teamName?: string; playerId?: string } | null;
  onSelectPoints?: (points: 10 | 20 | 30) => void;
  onStopEarly?: () => void;
  onFinalizeAnswer?: (answer?: string | string[]) => void;
  isSpectator?: boolean;
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
  playerId,
  answerMethod = "DEVICE",
  isStealPhase = false,
  stealBuzzedTeam = null,
  buzzedBy = null,
  onSelectPoints,
  onStopEarly,
  onFinalizeAnswer,
  isSpectator = false,
}: Props) {
  const [selected, setSelected] = useState<string[]>([]);
  const [essayText, setEssayText] = useState("");
  const [fillText, setFillText] = useState("");
  const [isBuzzedLocally, setIsBuzzedLocally] = useState(false);
  const [isFinalizedLocally, setIsFinalizedLocally] = useState(false);

  const q = question.question;

  // Clean reset of input and selection states whenever question ID changes
  useEffect(() => {
    setSelected([]);
    setEssayText("");
    setFillText("");
    setIsBuzzedLocally(false);
    setIsFinalizedLocally(false);
  }, [q.id]);

  const timerAuth = timer
    ? calculateAuthoritativeTimer(timer.endsAt, timer.total, timer.remaining)
    : null;
  const timerDisplayRemaining = timerAuth ? timerAuth.remaining : (timer?.remaining ?? 0);
  const timerPercent = timerAuth ? timerAuth.percent : (timer ? (timer.remaining / timer.total) * 100 : 100);
  const timerColor = timerPercent > 50 ? "#06b6d4" : timerPercent > 25 ? "#f59e0b" : "#ef4444";

  const bloom: BloomLevel = question.bloomLevel ?? getBloomLevelFromPoints(q.points);
  const bloomMeta = BLOOM_METADATA[bloom];

  // Mode permissions (supports both TEAM and INDIVIDUAL mode)
  const isMcMode = (question.answerMethod ?? answerMethod) === "MC";
  const myActorId = myTeamId || playerId;

  // In BOUNCEBACK mode:
  // Primary phase: primary team/player can answer
  const isPrimaryTeam = myActorId && question.primaryTeamId ? myActorId === question.primaryTeamId : !question.primaryTeamId;
  // Steal phase: only steal buzzed team/player can answer
  const isStealTeam = myActorId && stealBuzzedTeam
    ? (stealBuzzedTeam.teamId === myActorId || stealBuzzedTeam.playerId === myActorId)
    : false;

  // In BUZZ mode: only buzzed team/player can answer
  const isBuzzedTeam = myActorId && buzzedBy
    ? (buzzedBy.teamId === myActorId || (buzzedBy as any).playerId === myActorId)
    : (myActorId && question.buzzedTeamId ? myActorId === question.buzzedTeamId : false);

  // In TOURNAMENT mode: 2 active competitors in match can answer
  const isTournamentCompetitor =
    question.tournamentTeam1Id && question.tournamentTeam2Id
      ? (myActorId === question.tournamentTeam1Id || myActorId === question.tournamentTeam2Id)
      : true;

  const isBouncebackSteal = roomMode === "BOUNCEBACK" && Boolean(stealBuzzedTeam);
  const subMode = question.answerSubmissionMode || "ALLOW_CHANGE";
  const isSingleSubmit = isBouncebackSteal || subMode === "SINGLE_SUBMIT";

  const isBuzzedWaitingPrep =
    (roomMode === "BUZZ" && isBuzzedTeam && !question.buzzAnsweringActive && !revealPayload) ||
    (roomMode === "BOUNCEBACK" && Boolean(stealBuzzedTeam) && isStealTeam && !question.stealAnsweringActive && !revealPayload);

  const canAnswerThisQuestion = () => {
    if (isSpectator) return false;
    if (isFinalizedLocally) return false;
    if (isSingleSubmit && answered) return false;
    if (!!revealPayload || roomStatus === "PAUSED" || isMcMode) return false;
    if (question.bouncebackSelectPhase) return false;
    if (question.bouncebackAwaitingJudgment) return false;
    if (question.timerPending) return false;
    if (timer && timerDisplayRemaining <= 0) return false;
    if (roomMode === "BOUNCEBACK") {
      if (stealBuzzedTeam) return Boolean(isStealTeam && question.stealAnsweringActive);
      if (isStealPhase) return false; // In steal buzz phase, only buzzing is allowed
      return isPrimaryTeam;
    }
    if (roomMode === "BUZZ") {
      return Boolean(isBuzzedTeam && question.buzzAnsweringActive);
    }
    if (roomMode === "GRID_CARO" || roomMode === "DICE_RACE") {
      return isPrimaryTeam;
    }
    if (roomMode === "TOURNAMENT") {
      return isTournamentCompetitor;
    }
    return true;
  };

  const handleOptionClick = (optId: string) => {
    if (!canAnswerThisQuestion() || hiddenOptionIds?.includes(optId)) return;
    if (q.type === "MC_SINGLE" || q.type === "TRUE_FALSE") {
      setSelected([optId]);
      onAnswer(optId);
      if (isSingleSubmit) {
        setIsFinalizedLocally(true);
      }
    } else if (q.type === "MC_MULTI") {
      const next = selected.includes(optId)
        ? selected.filter((id) => id !== optId)
        : [...selected, optId];
      setSelected(next);
    }
  };

  const handleSubmitMulti = () => {
    if (selected.length > 0 && canAnswerThisQuestion()) {
      onAnswer(selected);
      if (isSingleSubmit) {
        setIsFinalizedLocally(true);
      }
    }
  };

  const handleSubmitEssay = () => {
    if (essayText.trim() && canAnswerThisQuestion()) {
      onAnswer(essayText.trim());
      if (isSingleSubmit) {
        setIsFinalizedLocally(true);
      }
    }
  };

  const handleSubmitFill = () => {
    if (fillText.trim() && canAnswerThisQuestion()) {
      onAnswer(fillText.trim());
      if (isSingleSubmit) {
        setIsFinalizedLocally(true);
      }
    }
  };

  return (
    <div className={`glass rounded-2xl p-3 sm:p-5 flex flex-col gap-2.5 sm:gap-3.5 animate-slide-up transition-all duration-500 ${
      isBuzzedWaitingPrep
        ? "border-2 border-emerald-400/90 shadow-[0_0_35px_rgba(16,185,129,0.35)] ring-2 ring-emerald-400/30"
        : ""
    }`}>
      {/* Spectator Mode Notice */}
      {isSpectator && (
        <div className="p-3.5 rounded-2xl bg-purple-900/40 border-2 border-purple-500/50 text-purple-200 text-center font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg">
          <span className="text-xl">👀</span>
          <span>Chế độ Khán giả (Đội đã bị loại) — Bạn có thể theo dõi câu hỏi và bảng điểm trực tiếp nhưng không thể gửi đáp án.</span>
        </div>
      )}

      {/* Timer Pending Alert */}
      {question.timerPending && !revealPayload && !isBuzzedWaitingPrep && (
        <div className="p-3.5 rounded-2xl bg-amber-500/20 border-2 border-amber-400 text-amber-200 text-center font-bold text-xs sm:text-sm flex items-center justify-center gap-2 animate-pulse shadow-lg">
          <span className="text-xl">⏳</span>
          <span>Lắng nghe câu hỏi — Chờ MC / Admin bấm Bắt đầu tính giờ...</span>
        </div>
      )}

      {/* Timer */}
      {timer && !question.bouncebackSelectPhase && !isBuzzedWaitingPrep && (
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
            <span className="absolute inset-0 flex items-center justify-center text-sm font-bold">{timerDisplayRemaining}</span>
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
          {question.bouncebackSelectPhase ? (
            isPrimaryTeam ? (
              <div className="flex flex-col items-center justify-center gap-4 bg-indigo-950/60 border-2 border-indigo-400 p-5 rounded-2xl text-center shadow-2xl">
                <div>
                  <span className="text-3xl mb-1 block">🎯</span>
                  <p className="font-black text-indigo-300 text-lg sm:text-xl">
                    CHỌN GÓI ĐIỂM CÂU HỎI (VỀ ĐÍCH)
                  </p>
                  <p className="text-xs sm:text-sm text-indigo-200/90 mt-1">
                    Đội bạn đang là đội trả lời chính. Đề bài và đồng hồ sẽ được mở ra ngay sau khi chọn:
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full max-w-md">
                  {([10, 20, 30] as const).map((pts) => {
                    const secs = pts === 10 ? 15 : pts === 20 ? 20 : 30;
                    return (
                      <button
                        key={pts}
                        type="button"
                        onClick={() => onSelectPoints?.(pts)}
                        className="py-3.5 px-3 rounded-xl font-black bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white shadow-xl active:scale-95 transition-all cursor-pointer border-2 border-indigo-300/40 hover:border-indigo-300 flex flex-col items-center justify-center gap-1 group"
                      >
                        <span className="font-mono text-2xl group-hover:scale-110 transition">{pts} ĐIỂM</span>
                        <span className="text-xs font-semibold text-indigo-200">⏱️ {secs} giây</span>
                      </button>
                    );
                  })}
                </div>
                <p className="text-[11px] text-indigo-300/80 italic">
                  * Trả lời đúng nhận trọn số điểm; Trả lời sai các đội khác có cơ hội bấm chuông cướp điểm!
                </p>
              </div>
            ) : (
              <div className="bg-blue-950/50 border-2 border-blue-500/40 p-5 rounded-2xl text-center space-y-2 shadow-xl">
                <span className="text-3xl mb-1 block animate-bounce">⏳</span>
                <p className="font-black text-blue-300 text-base sm:text-lg">
                  Đang chờ đội chính chọn gói câu hỏi...
                </p>
                <p className="text-xs sm:text-sm text-blue-200/90">
                  Đội <strong className="text-yellow-400 font-bold">{question.primaryTeamName ?? "chính"}</strong> đang lựa chọn gói 10, 20 hoặc 30 điểm.
                </p>
                <div className="pt-2">
                  <span className="text-[11px] px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30">
                    Chuẩn bị chuông cướp điểm nếu đội chính không trả lời được
                  </span>
                </div>
              </div>
            )
          ) : isStealPhase ? (
            !isPrimaryTeam ? (
              <div className="flex flex-col items-center justify-center gap-4 bg-gradient-to-b from-amber-950/90 to-red-950/90 border-2 border-amber-400 p-6 rounded-2xl text-center shadow-2xl animate-bounce-in my-3">
                <div className="flex items-center gap-2 text-amber-300 font-black text-sm sm:text-base uppercase tracking-wider">
                  <span className="text-2xl animate-bounce">⚡</span>
                  <span>CHUÔNG CƯỚP ĐIỂM ĐANG MỞ (5 GIÂY)!</span>
                </div>
                <p className="text-xs sm:text-sm text-amber-200/90 max-w-md">
                  Cướp điểm trực tiếp từ đội chính: Đúng +100% điểm (đội chính bị trừ 100% điểm), Sai -50% điểm (đội chính không bị trừ).
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setIsBuzzedLocally(true);
                    onBuzz();
                  }}
                  disabled={isBuzzedLocally}
                  className={`w-48 h-48 sm:w-60 sm:h-60 rounded-full border-4 sm:border-8 border-yellow-300 shadow-[0_0_60px_rgba(245,158,11,0.85)] active:scale-90 transition-transform flex flex-col items-center justify-center gap-2 select-none cursor-pointer my-2 ${
                    isBuzzedLocally
                      ? "bg-gradient-to-br from-green-500 to-emerald-700 opacity-90 scale-95"
                      : "bg-gradient-to-br from-amber-500 via-orange-500 to-red-600 hover:scale-105 animate-pulse"
                  }`}
                >
                  <span className="text-5xl sm:text-7xl drop-shadow-md">
                    {isBuzzedLocally ? "⚡" : "🔔"}
                  </span>
                  <span className="text-white font-black text-xl sm:text-2xl tracking-wider uppercase drop-shadow-lg px-2">
                    {isBuzzedLocally ? "ĐÃ BẤM CHUÔNG!" : "BẤM CƯỚP ĐIỂM!"}
                  </span>
                  <span className="text-yellow-200 text-xs sm:text-sm font-semibold">
                    {isBuzzedLocally ? "Đang chờ phán quyết..." : "Chạm nhanh để giành quyền!"}
                  </span>
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center gap-3 bg-red-950/70 border-2 border-red-500/60 p-6 rounded-2xl text-center shadow-xl my-3">
                <div className="w-14 h-14 rounded-full bg-red-500/20 flex items-center justify-center text-3xl">
                  ❌
                </div>
                <p className="text-lg font-black text-red-300">
                  ĐỘI BẠN ĐÃ TRẢ LỜI SAI!
                </p>
                <p className="text-sm text-red-200/90 max-w-md">
                  Các đội khác đang có 5 giây để bấm chuông giành quyền cướp điểm. Chuông của đội bạn đã bị vô hiệu hoá.
                </p>
                <div className="px-3 py-1 rounded-full bg-red-500/20 text-xs font-bold text-red-300 border border-red-500/30 animate-pulse">
                  ⏳ Cửa sổ cướp 5s đang đếm ngược...
                </div>
              </div>
            )
          ) : stealBuzzedTeam ? (
            isStealTeam ? (
              !question.stealAnsweringActive ? (
                <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-emerald-950/90 via-teal-950/90 to-emerald-950/90 border-2 border-emerald-400 text-center shadow-xl animate-fade-in my-1">
                  <div className="flex items-center justify-center gap-2 text-emerald-300 font-black text-base sm:text-lg mb-1">
                    <span className="text-2xl animate-pulse">✨</span>
                    <span>BẠN ĐÃ GIÀNH QUYỀN TRẢ LỜI!</span>
                  </div>
                  <p className="text-sm sm:text-base text-emerald-100 font-semibold">
                    Hãy bình tĩnh suy nghĩ câu trả lời...
                  </p>
                  <p className="text-xs text-emerald-300/80 mt-1">
                    {isMcMode
                      ? "🎙️ Bạn hãy chuẩn bị và trả lời trực tiếp cho MC / Quản trò."
                      : "⏳ Quản trò (MC) sẽ bấm bắt đầu tính giờ trên máy khi bạn đã sẵn sàng."}
                  </p>
                </div>
              ) : (
                <div className="bg-purple-500/20 border border-purple-500/40 p-4 rounded-xl text-purple-200 text-center space-y-1 my-1">
                  <p className="text-base font-black text-cyan-300">
                    ⚡ Đội của bạn đang trong thời gian trả lời! (Chỉ 1 lần chọn duy nhất)
                  </p>
                  <p className="text-xs text-purple-300">
                    Hãy chọn hoặc nhập câu trả lời trên màn hình trước khi hết giờ.
                  </p>
                </div>
              )
            ) : (
              <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-700/60 text-slate-300 text-center text-xs sm:text-sm my-1 flex items-center justify-center gap-2 shadow">
                <span className="text-lg">⚡</span>
                <span>
                  Đội <strong className="text-amber-300 font-bold">{stealBuzzedTeam.teamName}</strong> đã giành quyền bấm chuông. Hãy cùng chú ý theo dõi...
                </span>
              </div>
            )
          ) : (
            <div className="bg-blue-500/15 border border-blue-500/30 p-3 rounded-lg flex items-center justify-between">
              <div>
                <span className="text-xs uppercase text-blue-300 tracking-wider">🎯 Đội trả lời chính: </span>
                <span className="font-bold text-foreground">{question.primaryTeamName ?? "Đang xác định"}</span>
              </div>
              {isPrimaryTeam ? (
                <span className="px-2.5 py-1 rounded-full bg-green-500/20 text-green-300 text-xs font-bold border border-green-500/30 whitespace-nowrap shrink-0">
                  Lượt của bạn
                </span>
              ) : (
                <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0">Chờ đội chính</span>
              )}
            </div>
          )}

          {/* Banner awaiting MC judgment for primary or steal team */}
          {question.bouncebackAwaitingJudgment === "PRIMARY" && (
            <div className="mt-3 flex flex-col items-center justify-center gap-2 bg-indigo-950/80 border-2 border-indigo-400 p-5 rounded-2xl text-center shadow-xl animate-pulse">
              <div className="text-3xl">⚖️</div>
              <p className="text-base sm:text-lg font-black text-indigo-200">
                {isPrimaryTeam ? "ĐÃ CHỐT ĐÁP ÁN — ĐANG CHỜ PHÁN QUYẾT CỦA MC" : `ĐỘI [${question.primaryTeamName || "CHÍNH"}] ĐÃ CHỐT — CHỜ MC PHÁN QUYẾT`}
              </p>
              <p className="text-xs text-indigo-300/80">
                MC / Ban giám khảo đang xem xét câu trả lời để quyết định Đúng hoặc Sai.
              </p>
            </div>
          )}

          {question.bouncebackAwaitingJudgment === "STEAL" && (
            <div className="mt-3 flex flex-col items-center justify-center gap-2 bg-amber-950/80 border-2 border-amber-400 p-5 rounded-2xl text-center shadow-xl animate-pulse">
              <div className="text-3xl">⚡⚖️</div>
              <p className="text-base sm:text-lg font-black text-amber-200">
                {isStealTeam ? "ĐÃ NỘP CÂU TRẢ LỜI CƯỚP ĐIỂM — ĐANG CHỜ MC PHÁN QUYẾT" : `ĐỘI CƯỚP [${stealBuzzedTeam?.teamName || "CƯỚP"}] ĐÃ TRẢ LỜI — CHỜ MC PHÁN QUYẾT`}
              </p>
              <p className="text-xs text-amber-300/80">
                Đúng: +100% điểm cho đội cướp & -100% điểm đội chính | Sai: -50% điểm đội cướp & đội chính 0đ.
              </p>
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
                <p className="font-bold text-amber-300 flex items-center gap-1.5">
                  <span>⚡ Tranh quyền trả lời</span>
                  {question.buzzUnlocked ? (
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-green-500/20 text-green-300 border border-green-500/40 font-normal animate-pulse">
                      Chuông đã mở!
                    </span>
                  ) : question.buzzUnlockMode === "MANUAL" ? (
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 font-normal">
                      🔒 Chờ MC mở chuông
                    </span>
                  ) : (
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-normal">
                      🔒 Mở sau {question.buzzAutoDelaySeconds ?? 3}s...
                    </span>
                  )}
                </p>
                <p className="text-xs text-muted-foreground">
                  {question.buzzUnlocked
                    ? "Đội bấm chuông sớm nhất sẽ giành quyền trả lời duy nhất! (Sai trừ 50% điểm câu hỏi)"
                    : question.buzzUnlockMode === "MANUAL"
                    ? "Quản trò sẽ mở khóa chuông sau khi đọc xong câu hỏi."
                    : `Hệ thống đếm ngược ${question.buzzAutoDelaySeconds ?? 3} giây trước khi mở chuông tự động.`}
                </p>
              </div>
              <button
                onClick={() => {
                  setIsBuzzedLocally(true);
                  onBuzz();
                }}
                disabled={!question.buzzUnlocked || isBuzzedLocally}
                className={`w-full sm:w-auto px-5 sm:px-6 py-2.5 rounded-xl font-black text-sm whitespace-nowrap shrink-0 transition-all ${
                  isBuzzedLocally
                    ? "bg-amber-400 text-black shadow-lg shadow-amber-500/30 opacity-80 cursor-default"
                    : question.buzzUnlocked
                    ? "bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-black shadow-lg shadow-amber-500/30 active:scale-95 animate-pulse cursor-pointer"
                    : "bg-white/10 text-slate-500 border border-white/10 cursor-not-allowed opacity-60"
                }`}
              >
                {isBuzzedLocally
                  ? "⚡ ĐÃ BẤM CHUÔNG!"
                  : question.buzzUnlocked
                  ? "🔔 BẤM CHUÔNG!"
                  : "🔒 CHUÔNG KHÓA"}
              </button>
            </div>
          ) : (
            isBuzzedTeam ? (
              !question.buzzAnsweringActive ? (
                <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-emerald-950/90 via-teal-950/90 to-emerald-950/90 border-2 border-emerald-400 text-center shadow-xl animate-fade-in my-1">
                  <div className="flex items-center justify-center gap-2 text-emerald-300 font-black text-base sm:text-lg mb-1">
                    <span className="text-2xl animate-pulse">✨</span>
                    <span>BẠN ĐÃ GIÀNH QUYỀN TRẢ LỜI!</span>
                  </div>
                  <p className="text-sm sm:text-base text-emerald-100 font-semibold">
                    Hãy bình tĩnh suy nghĩ câu trả lời...
                  </p>
                  <p className="text-xs text-emerald-300/80 mt-1">
                    {isMcMode
                      ? "🎙️ Bạn hãy chuẩn bị và trả lời trực tiếp cho MC / Quản trò."
                      : "⏳ Quản trò (MC) sẽ bấm bắt đầu tính giờ trên máy khi bạn đã sẵn sàng."}
                  </p>
                </div>
              ) : (
                <div className="bg-yellow-500/20 border border-yellow-500/40 p-3 rounded-lg text-yellow-200 my-1">
                  ⚡ Đội <span className="font-bold text-white">{buzzedBy.teamName ?? buzzedBy.playerName}</span> đang trong thời gian trả lời!
                </div>
              )
            ) : (
              <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-700/60 text-slate-300 text-center text-xs sm:text-sm my-1 flex items-center justify-center gap-2 shadow">
                <span className="text-lg">⚡</span>
                <span>
                  Đội <strong className="text-amber-300 font-bold">{buzzedBy.teamName ?? buzzedBy.playerName}</strong> đã bấm chuông sớm nhất. Hãy cùng chú ý theo dõi...
                </span>
              </div>
            )
          )}
        </div>
      )}

      {/* GRID_CARO Banner */}
      {roomMode === "GRID_CARO" && (
        <div className="rounded-xl p-3 border text-sm font-medium transition-all bg-purple-500/15 border-purple-500/30">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs uppercase text-purple-300 tracking-wider">🎯 Ô #{question.gridCellId ?? "?"} · Lượt chọn & trả lời: </span>
              <span className="font-bold text-foreground">{question.primaryTeamName ?? "Đang xác định"}</span>
            </div>
            {isPrimaryTeam ? (
              <span className="px-2.5 py-1 rounded-full bg-green-500/20 text-green-300 text-xs font-bold border border-green-500/30">
                Lượt của bạn
              </span>
            ) : (
              <span className="text-xs text-muted-foreground">Quan sát</span>
            )}
          </div>
        </div>
      )}

      {/* DICE_RACE Banner */}
      {roomMode === "DICE_RACE" && (
        <div className="rounded-xl p-3 border text-sm font-medium transition-all bg-indigo-500/15 border-indigo-500/30">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs uppercase text-indigo-300 tracking-wider">🎲 Đua cờ · Lượt trả lời: </span>
              <span className="font-bold text-foreground">{question.primaryTeamName ?? "Đang xác định"}</span>
            </div>
            {isPrimaryTeam ? (
              <span className="px-2.5 py-1 rounded-full bg-green-500/20 text-green-300 text-xs font-bold border border-green-500/30">
                Đúng để được gieo xúc xắc!
              </span>
            ) : (
              <span className="text-xs text-muted-foreground">Quan sát</span>
            )}
          </div>
        </div>
      )}

      {/* TOURNAMENT Banner */}
      {roomMode === "TOURNAMENT" && (
        <div className="rounded-xl p-3 border text-sm font-medium transition-all bg-yellow-500/15 border-yellow-500/30">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs uppercase text-yellow-300 tracking-wider">🏆 Trận đối đầu 1v1: </span>
              <span className="font-bold text-foreground">{question.primaryTeamName ?? "Đang thi đấu"}</span>
            </div>
            {isPrimaryTeam ? (
              <span className="px-2.5 py-1 rounded-full bg-yellow-500/20 text-yellow-300 text-xs font-bold border border-yellow-500/30">
                Trận của bạn!
              </span>
            ) : (
              <span className="text-xs text-muted-foreground">Khán giả</span>
            )}
          </div>
        </div>
      )}

      {/* WAGER Banner */}
      {roomMode === "WAGER" && (
        <div className="rounded-xl p-3 border text-xs sm:text-sm font-medium transition-all bg-amber-500/15 border-amber-500/30 text-amber-200">
          <div className="flex items-center gap-2">
            <span className="text-base shrink-0">💰</span>
            <span>
              <strong>Cược điểm:</strong> 👑 Đội cược cuối: Đúng nhận điểm cược, Sai trừ điểm cược · Các đội khác: Đúng nhận 1/2 điểm câu hỏi (làm tròn lên chia hết cho 5), Sai 0đ
            </span>
          </div>
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
      {!question.bouncebackSelectPhase && (
        <>
          <div>
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold whitespace-nowrap">
            {q.type === "MC_SINGLE" ? "Trắc nghiệm" : q.type === "MC_MULTI" ? "Nhiều đáp án" : q.type === "TRUE_FALSE" ? "Đúng/Sai" : q.type === "FILL_BLANK" ? "Điền vào chỗ trống" : q.type === "ESSAY" ? "Tự luận" : "Câu hỏi"}
          </span>
          <span className="text-xs text-muted-foreground">·</span>
          <span
            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border whitespace-nowrap"
            style={{ color: bloomMeta.color, borderColor: `${bloomMeta.color}40`, background: bloomMeta.bg }}
          >
            <span>{bloomMeta.emoji}</span>
            <span className="whitespace-nowrap">{bloomMeta.labelVi}</span>
            <span className="opacity-75 whitespace-nowrap">({q.points}đ)</span>
          </span>
          {question.streakCount && question.streakCount >= 2 && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/50 text-amber-300 animate-pulse whitespace-nowrap">
              <span>🔥 Streak x{question.streakCount}</span>
              <span className="text-[10px] text-amber-400 font-bold">
                (+{question.streakCount === 2 ? 10 : question.streakCount === 3 ? 20 : question.streakCount === 4 ? 30 : 50}%)
              </span>
            </span>
          )}
        </div>

        <h2 className="text-xl font-bold leading-relaxed">{q.content}</h2>
        {q.mediaUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={q.mediaUrl} alt="Media" className="max-h-48 rounded-xl mt-3 mx-auto" />
        )}
      </div>

      {/* Answer Area */}
      {roomStatus === "PAUSED" ? (
        <div className="text-center py-6 text-muted-foreground text-sm font-semibold glass rounded-xl">⏸️ Game đã tạm dừng</div>
      ) : q.type === "MC_SINGLE" || q.type === "TRUE_FALSE" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
          {q.options?.map((opt, i) => {
            const labels = ["A", "B", "C", "D", "E", "F"];
            const badgeClasses = [
              "bg-blue-500 text-white shadow-blue-500/30",
              "bg-amber-400 text-black shadow-amber-400/30",
              "bg-emerald-500 text-white shadow-emerald-500/30",
              "bg-rose-500 text-white shadow-rose-500/30",
              "bg-purple-500 text-white shadow-purple-500/30",
              "bg-cyan-500 text-black shadow-cyan-500/30",
            ];
            const isCorrect = revealPayload?.correctAnswer.includes(opt.id);
            const isSelected = selected.includes(opt.id);
            const isHidden = hiddenOptionIds?.includes(opt.id);
            const disabled = !canAnswerThisQuestion() || isHidden;

            return (
              <button
                key={opt.id}
                onClick={() => handleOptionClick(opt.id)}
                disabled={disabled}
                className={`flex items-center gap-2.5 sm:gap-3 p-2.5 sm:p-3.5 rounded-xl border-2 text-left transition-all active:scale-[0.98] min-h-[44px] sm:min-h-[52px] ${
                  isHidden
                    ? "opacity-25 line-through border-border cursor-not-allowed bg-black/30"
                    : revealPayload
                    ? isCorrect
                      ? "border-green-500 bg-green-500/25 text-green-300 ring-2 ring-green-500/50 shadow-lg"
                      : "border-border opacity-40"
                    : isSelected
                    ? "border-purple-500 bg-purple-500/25 text-white ring-2 ring-purple-500/60 shadow-lg"
                    : disabled
                    ? "border-border opacity-60 cursor-not-allowed"
                    : "border-border hover:border-purple-400 hover:bg-white/5 active:bg-purple-500/10 cursor-pointer"
                }`}
              >
                <span className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center text-xs sm:text-sm font-black shrink-0 shadow ${
                  badgeClasses[i % badgeClasses.length]
                }`}>
                  {labels[i] ?? i + 1}
                </span>
                <span className="flex-1 text-xs sm:text-sm font-semibold leading-snug">{opt.text}</span>
                {isHidden && (
                  <span className="text-[10px] px-2 py-0.5 rounded bg-muted text-muted-foreground font-mono">
                    50/50
                  </span>
                )}
                {isSelected && !revealPayload && (
                  <span className="w-2.5 h-2.5 rounded-full bg-purple-400 animate-pulse shrink-0" />
                )}
              </button>
            );
          })}
        </div>
      ) : q.type === "MC_MULTI" ? (
        <div className="flex flex-col gap-2.5">
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
                className={`flex items-center gap-2.5 sm:gap-3 p-2.5 sm:p-3 rounded-xl border-2 text-left transition-all ${
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
                <span className="w-7 h-7 sm:w-8 sm:h-8 rounded border-2 flex items-center justify-center shrink-0">
                  {isSelected && "✓"}
                </span>
                <span className="font-bold w-5 sm:w-6 text-xs sm:text-sm">{labels[i]}</span>
                <span className="flex-1 text-xs sm:text-sm font-semibold">{opt.text}</span>
                {isHidden && (
                  <span className="text-[10px] px-2 py-0.5 rounded bg-muted text-muted-foreground font-mono">
                    50/50
                  </span>
                )}
              </button>
            );
          })}
          {canAnswerThisQuestion() && !revealPayload && (
            <button
              onClick={handleSubmitMulti}
              disabled={selected.length === 0}
              className="mt-1.5 py-2.5 sm:py-3 rounded-xl bg-purple-600 hover:bg-purple-500 font-bold text-xs sm:text-sm transition-colors disabled:opacity-50 cursor-pointer"
            >
              {answered ? `✓ Cập nhật đáp án (${selected.length} đã chọn)` : `Xác nhận (${selected.length} đã chọn)`}
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
            className="px-4 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 font-bold disabled:opacity-50 cursor-pointer"
          >
            {answered ? "Cập nhật" : "Gửi"}
          </button>
        </div>
      ) : q.type === "ESSAY" ? (
        <div className="flex flex-col gap-2">
          <textarea
            value={essayText}
            onChange={(e) => setEssayText(e.target.value)}
            placeholder={isMcMode ? "Đang ở chế độ trả lời qua MC..." : "Viết câu trả lời của bạn..."}
            rows={3}
            disabled={!canAnswerThisQuestion()}
            className="w-full px-4 py-3 rounded-xl bg-input border border-border focus:outline-none focus:ring-2 focus:ring-ring resize-none disabled:opacity-60"
          />
          <button
            onClick={handleSubmitEssay}
            disabled={!essayText.trim() || !canAnswerThisQuestion()}
            className="py-3 rounded-xl bg-purple-600 hover:bg-purple-500 font-bold disabled:opacity-50 cursor-pointer"
          >
            {answered ? "Cập nhật bài làm" : "Nộp bài"}
          </button>
        </div>
      ) : null}
        </>
      )}

      {/* Finalized Status */}
      {isFinalizedLocally && !revealPayload && (
        <div className="text-center py-2.5 text-cyan-300 font-bold flex flex-wrap items-center justify-center gap-1.5 text-xs sm:text-sm bg-cyan-500/15 border border-cyan-500/40 rounded-xl px-4 animate-slide-up shadow-sm">
          <span className="text-base">🔒</span>
          <span>Đã chốt đáp án thành công!</span>
          <span className="text-[11px] sm:text-xs text-cyan-200/80 font-normal">
            (Đang chờ các đội khác hoàn thành hoặc hết thời gian)
          </span>
        </div>
      )}

      {/* Answered Status (When not finalized yet) */}
      {answered && !isFinalizedLocally && !revealPayload && (
        <div className="text-center py-2 text-green-400 font-bold flex flex-wrap items-center justify-center gap-1.5 text-xs sm:text-sm bg-green-500/10 border border-green-500/30 rounded-xl px-4 animate-slide-up shadow-sm">
          <span className="text-base">✓</span>
          <span>{isSingleSubmit ? "Đã nộp bài (1 lần duy nhất)" : "Đã lưu đáp án tạm tính"}</span>
          <span className="text-[11px] sm:text-xs text-green-300/80 font-normal">
            {timer && timerDisplayRemaining <= 0
              ? "(Hết thời gian — Chờ Quản trò công bố kết quả)"
              : isSingleSubmit
              ? "(Chờ các thí sinh khác hoàn thành)"
              : "(Có thể chọn đổi phương án khác, hoặc bấm nút Chốt đáp án bên dưới)"}
          </span>
        </div>
      )}

      {/* Chốt đáp án Button in ALLOW_CHANGE mode */}
      {!isSingleSubmit && answered && !isFinalizedLocally && !revealPayload && timer && timerDisplayRemaining > 0 && (
        <button
          type="button"
          onClick={() => {
            setIsFinalizedLocally(true);
            const finalAns = selected.length > 0
              ? (q.type === "MC_MULTI" ? selected : selected[0])
              : (fillText || essayText || undefined);
            if (onFinalizeAnswer) {
              onFinalizeAnswer(finalAns);
            } else if (onStopEarly) {
              onStopEarly();
            }
          }}
          className="w-full py-2.5 sm:py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white font-black text-xs sm:text-sm shadow-xl flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95 border border-emerald-300/40 hover:border-emerald-300"
        >
          <span className="text-base">🔒</span>
          <span>Chốt đáp án ({timerDisplayRemaining}s còn lại — Hoàn thành sớm)</span>
        </button>
      )}

      {/* Early Stop Button for Host/Special bypass if provided */}
      {onStopEarly && !isFinalizedLocally && !answered && !revealPayload && timer && timerDisplayRemaining > 0 && canAnswerThisQuestion() && (
        <button
          type="button"
          onClick={onStopEarly}
          className="w-full py-2.5 sm:py-3 px-4 rounded-xl bg-gradient-to-r from-rose-600 via-pink-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white font-black text-xs sm:text-sm shadow-lg flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95 border border-rose-300/30 hover:border-rose-300"
        >
          <span className="text-base">⏹️</span>
          <span>Dừng thời gian sớm ({timerDisplayRemaining}s)</span>
        </button>
      )}

      {!answered && !revealPayload && timer && timerDisplayRemaining <= 0 && (
        <div className="text-center py-2 text-amber-400 font-bold flex items-center justify-center gap-1.5 text-sm animate-pulse">
          <span>⏱️ Hết thời gian! Đang chờ Quản trò công bố kết quả...</span>
        </div>
      )}
      {(roomMode === "GRID_CARO" || roomMode === "DICE_RACE") && !isPrimaryTeam && !revealPayload && (
        <div className="text-center py-2 text-muted-foreground text-xs sm:text-sm flex items-center justify-center gap-2 bg-muted/20 border border-border/40 rounded-xl p-3">
          <span className="text-base">👀</span>
          <span>Đang là lượt của <strong>{question.primaryTeamName ?? "đội khác"}</strong>. Đội bạn đang ở chế độ quan sát.</span>
        </div>
      )}

      {/* Answer Reveal Section */}
      {revealPayload && (
        <div className="space-y-3 pt-2">
          <div className="text-center py-2 font-bold text-lg">
            {revealPayload.answers.some((a) => (myTeamId ? a.teamId === myTeamId : true) && a.isCorrect) ? (
              <span className="text-green-400">
                {roomMode === "DICE_RACE"
                  ? "✓ Đúng rồi!"
                  : `✓ Đúng rồi! +${revealPayload.answers.find((a) => (myTeamId ? a.teamId === myTeamId : true) && a.isCorrect)?.pointsAwarded ?? 0} điểm`}
              </span>
            ) : (
              <span className="text-red-400">✗ Chưa chính xác!</span>
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
                        {roomMode === "DICE_RACE"
                          ? (ts.correctMembers > 0 ? "✓ Đúng" : "✗ Sai")
                          : `${ts.pointsAwarded >= 0 ? `+${ts.pointsAwarded}` : ts.pointsAwarded} pts`}
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
