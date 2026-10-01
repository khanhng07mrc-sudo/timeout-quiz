"use client";

import { GridCaroState, GridCell } from "@/types";

interface Props {
  gridState?: GridCaroState;
  myTeamId?: string;
  isMyTurn?: boolean;
  canSelect?: boolean;
  isAdmin?: boolean;
  onSelectCell?: (cellId: number) => void;
  onAdvanceNow?: () => void;
  onPreviewStart?: () => void;
  onPreviewStop?: () => void;
  onLaunchQuestion?: () => void;
  isDisplay?: boolean;
}

export default function GridCaroBoard({
  gridState,
  myTeamId,
  isMyTurn = false,
  canSelect = false,
  isAdmin = false,
  onSelectCell,
  onAdvanceNow,
  onPreviewStart,
  onPreviewStop,
  onLaunchQuestion,
  isDisplay = false,
}: Props) {
  if (!gridState || gridState.cells.length === 0) {
    return (
      <div className="glass rounded-2xl p-6 text-center text-muted-foreground">
        <p className="text-3xl mb-2">🏁</p>
        <p>Bảng ô câu hỏi đang được khởi tạo...</p>
      </div>
    );
  }

  const {
    rows,
    cols,
    cells,
    previewActive = false,
    previewRemaining = 0,
    currentRound = 1,
    maxRounds = 3,
    turnsCompleted = 0,
    maxTurns = 6,
    currentTurnTeamName,
    selectedCellId,
    selectedCellAnimation,
    selectedCellInfo,
    questionReady = false,
    autoAdvanceSeconds,
    streakTargetK,
    caroBonusPoints,
    caroAchievedTeams = [],
  } = gridState;

  const ticTacToeActive = !!gridState.caroEnabled && rows >= 4 && cols >= 4;

  const difficultyColors: Record<string, string> = {
    "DỄ": "text-green-400 border-green-500/40 bg-green-500/10",
    "TRUNG BÌNH": "text-yellow-400 border-yellow-500/40 bg-yellow-500/10",
    "KHÓ": "text-orange-400 border-orange-500/40 bg-orange-500/10",
    "CỰC KHÓ": "text-red-400 border-red-500/40 bg-red-500/10",
  };

  return (
    <div className={`glass rounded-2xl ${isDisplay ? "p-6" : "p-4"} space-y-4`}>
      {/* Header Info */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/50 pb-3">
        <div className="flex items-center gap-3">
          <span className="text-3xl">🎯</span>
          <div>
            <h3 className={`font-black ${isDisplay ? "text-2xl" : "text-lg"} text-white flex items-center gap-2 flex-wrap`}>
              <span>{ticTacToeActive ? `Lưới Câu Hỏi & Đấu Caro ${rows}×${cols}` : `Lưới Chọn Ô Câu Hỏi ${rows}×${cols}`}</span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-mono whitespace-nowrap">
                Vòng {currentRound}/{maxRounds} · Lượt {turnsCompleted}/{maxTurns}
              </span>
              {ticTacToeActive && (
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40 whitespace-nowrap">
                  Caro ({streakTargetK} ô thẳng hàng · Thưởng chuỗi)
                </span>
              )}
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {ticTacToeActive
                ? `Chọn ô bí mật · Đúng chiếm ô màu đội · Xếp liền ${streakTargetK} ô nhận thưởng Caro · Sai ô vẫn mở cho lượt sau!`
                : "Chọn ô bí mật · Trả lời đúng nhận trọn điểm ô · Sai ô vẫn mở với câu hỏi mới cùng mức điểm!"}
            </p>
          </div>
        </div>

        {/* Status Badges & Admin Quick Preview */}
        <div className="flex items-center gap-2 flex-wrap">
          {isAdmin && !previewActive && !selectedCellId && onPreviewStart && (
            <button
              type="button"
              onClick={onPreviewStart}
              className="px-3.5 py-1.5 rounded-xl bg-purple-600/30 hover:bg-purple-600/50 border border-purple-500/50 text-purple-200 hover:text-white font-bold text-xs transition active:scale-95 flex items-center gap-1.5 shadow"
            >
              <span>👁️</span>
              <span className="whitespace-nowrap">Cho xem lại độ khó (5s)</span>
            </button>
          )}

          {currentTurnTeamName ? (
            <div className={`px-4 py-1.5 rounded-xl font-bold text-sm flex items-center gap-2 ${
              isMyTurn ? "bg-yellow-500/20 border border-yellow-500 text-yellow-300 animate-bounce" : "bg-white/10 text-white"
            }`}>
              <span>👉 Lượt chọn:</span>
              <span className="font-black text-cyan-400">{currentTurnTeamName}</span>
              {isMyTurn && <span className="ml-1 text-yellow-300">(ĐỘI BẠN!)</span>}
            </div>
          ) : null}
        </div>
      </div>

      {/* Preview Memory Phase Banner */}
      {previewActive && previewRemaining > 0 && (
        <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-amber-500/20 via-purple-600/25 to-cyan-500/20 border-2 border-amber-400/80 shadow-2xl flex items-center justify-between gap-3 animate-pulse">
          <div className="flex items-center gap-3">
            <span className="text-2xl sm:text-3xl animate-bounce">⏳</span>
            <div>
              <p className="text-[11px] sm:text-xs uppercase font-black text-amber-300 tracking-wider">
                GIAI ĐOẠN GHI NHỚ VỊ TRÍ ĐỘ KHÓ
              </p>
              <p className="text-xs sm:text-sm font-semibold text-white">
                Các ô sẽ tự động lật úp lại sau:{" "}
                <strong className="font-mono text-lg sm:text-2xl font-black text-amber-400 ml-1">
                  {previewRemaining}s
                </strong>
              </p>
            </div>
          </div>
          {isAdmin && onPreviewStop && (
            <button
              type="button"
              onClick={onPreviewStop}
              className="px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs border border-white/20 transition active:scale-95 whitespace-nowrap"
            >
              Lật úp ngay ✕
            </button>
          )}
        </div>
      )}

      {/* Selected Cell Announcement Banner */}
      {selectedCellInfo && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-yellow-500/25 via-purple-600/25 to-cyan-500/25 border-2 border-yellow-400 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-3 animate-bounce-in">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-yellow-400/20 border border-yellow-400 flex items-center justify-center text-2xl shrink-0 shadow-inner">
              🎯
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-black text-base sm:text-lg text-yellow-300">
                  {selectedCellInfo.teamName}
                </span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-yellow-400/20 text-yellow-200 border border-yellow-400/40 font-bold font-mono">
                  ĐÃ CHỌN Ô #{selectedCellInfo.cellId}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-white font-medium mt-0.5 flex items-center gap-2">
                <span>Độ khó:</span>
                <span className={`px-2 py-0.5 rounded font-black uppercase text-xs border ${difficultyColors[selectedCellInfo.difficulty] || ""}`}>
                  {selectedCellInfo.difficulty}
                </span>
                <span className="text-cyan-300 font-bold font-mono">({selectedCellInfo.points} điểm)</span>
              </p>
            </div>
          </div>

          {isAdmin && !questionReady && onLaunchQuestion && (
            <button
              type="button"
              onClick={onLaunchQuestion}
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white font-black text-sm shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2 animate-pulse whitespace-nowrap"
            >
              <span>📖</span>
              <span>Hiện câu hỏi ngay</span>
            </button>
          )}
        </div>
      )}

      {/* Auto-Advance Countdown Banner */}
      {autoAdvanceSeconds !== undefined && autoAdvanceSeconds > 0 && (
        <div className="p-3.5 rounded-xl bg-gradient-to-r from-purple-600/30 to-cyan-600/30 border border-purple-500/60 flex items-center justify-between animate-pulse shadow-lg">
          <div className="flex items-center gap-2">
            <span className="text-xl">⏱️</span>
            <span className="font-bold text-sm text-purple-200">
              Tự động trở về bàn cờ sau: <strong className="text-white font-mono text-base">{autoAdvanceSeconds}s</strong>
            </span>
          </div>
          {isAdmin && onAdvanceNow && (
            <button
              type="button"
              onClick={onAdvanceNow}
              className="px-3 py-1.5 rounded-lg bg-yellow-500 hover:bg-yellow-400 text-black font-black text-xs shadow transition active:scale-95 flex items-center gap-1"
            >
              <span>⚡</span>
              <span>Trở về bàn cờ ngay</span>
            </button>
          )}
        </div>
      )}

      {/* Grid of Rectangles */}
      <div
        className="grid gap-2 sm:gap-3 select-none"
        style={{
          gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
        }}
      >
        {cells.map((cell: GridCell) => {
          const isClaimed = cell.isCompleted && cell.claimedByTeamId;
          const isSelected = cell.id === selectedCellId;
          const isSelectedAnim = Boolean(selectedCellAnimation && isSelected);
          const isClickable = (isAdmin || canSelect) && !isClaimed && !selectedCellId && !selectedCellAnimation && !previewActive;
          const diffStyle = difficultyColors[cell.difficulty] || "text-purple-300 border-purple-500/30 bg-purple-500/10";
          const showFaceUp = previewActive || isSelected || isClaimed;

          return (
            <button
              key={cell.id}
              type="button"
              disabled={!isClickable}
              onClick={() => onSelectCell && onSelectCell(cell.id)}
              className={`relative rounded-2xl border-2 border-b-[4.5px] border-t border-white/20 transition-all flex flex-col items-center justify-between p-2 sm:p-2.5 text-center w-full aspect-[4/3] sm:aspect-square overflow-hidden select-none ${
                isSelectedAnim
                  ? "animate-flip-360 border-yellow-400 border-b-yellow-700 bg-yellow-500/35 shadow-2xl ring-4 ring-yellow-400/60 z-20"
                  : isSelected
                  ? "border-yellow-400 border-b-yellow-700 bg-yellow-500/25 shadow-xl scale-102 ring-2 ring-yellow-400/50 z-10"
                  : isClaimed
                  ? "shadow-lg scale-[0.98] cursor-default font-bold border-b-[4px]"
                  : previewActive
                  ? "animate-flip-reveal bg-[#1e2038] cursor-default border-purple-500/40 border-b-purple-800"
                  : isClickable
                  ? "cursor-pointer hover:border-cyan-400 hover:scale-[1.03] active:translate-y-0.5 active:border-b-[2px] bg-gradient-to-b from-[#252844] via-[#1b1c31] to-[#111221] border-slate-600/70 border-b-slate-900 shadow-[0_4px_8px_rgba(0,0,0,0.55)] hover:shadow-cyan-500/30"
                  : "cursor-default opacity-85 bg-[#171829] border-border/60 border-b-slate-900"
              }`}
              style={{
                borderColor: isSelected
                  ? "#facc15"
                  : isClaimed
                  ? cell.claimedByTeamColor || "#10b981"
                  : undefined,
                background: isSelected
                  ? "rgba(234, 179, 8, 0.25)"
                  : isClaimed
                  ? `linear-gradient(180deg, ${cell.claimedByTeamColor || "#10b981"}44, ${cell.claimedByTeamColor || "#10b981"}99)`
                  : undefined,
              }}
            >
              {/* Cell Number Badge (Top-left) */}
              <span className={`absolute top-1.5 left-2 text-[10px] sm:text-xs font-mono font-bold ${
                isSelected ? "text-yellow-300" : isClaimed ? "text-white/80" : "text-muted-foreground/90"
              }`}>
                #{cell.id}
              </span>

              {/* Cell Content */}
              {isClaimed ? (
                /* Claimed Cell */
                <div className="flex flex-col items-center justify-center gap-0.5 sm:gap-1 z-10">
                  <span className="text-base sm:text-2xl drop-shadow">⭐</span>
                  <span className="text-[10px] sm:text-xs font-black text-white truncate max-w-[95%]">
                    {cell.claimedByTeamName}
                  </span>
                  <span className="text-[9px] sm:text-[11px] text-white/95 font-mono font-bold">
                    +{cell.points}đ
                  </span>
                </div>
              ) : isSelected ? (
                /* Selected Cell (Flipped open with 360 animation) */
                <div className="flex flex-col items-center justify-center gap-1 z-10">
                  <span className="text-lg sm:text-2xl animate-bounce">⚡</span>
                  <span className="text-base sm:text-2xl font-black text-white font-mono drop-shadow">
                    {cell.points}đ
                  </span>
                  <span className={`text-[9px] sm:text-[11px] px-2 py-0.5 rounded font-black uppercase border ${diffStyle}`}>
                    {cell.difficulty}
                  </span>
                </div>
              ) : previewActive ? (
                /* Preview Face-Up */
                <div className="flex flex-col items-center gap-0.5 sm:gap-1.5 z-10 animate-fade-in">
                  <span className="text-base sm:text-2xl font-black text-white font-mono drop-shadow">
                    {cell.points}đ
                  </span>
                  <span className={`text-[8px] sm:text-[10px] px-1.5 sm:px-2 py-0.5 rounded font-bold uppercase border ${diffStyle}`}>
                    {cell.difficulty}
                  </span>
                  {cell.attemptCount > 0 && (
                    <span className="text-[8px] sm:text-[9px] text-amber-300 font-semibold bg-amber-500/10 px-1 py-0.2 rounded border border-amber-500/30">
                      🔄 Mở lại
                    </span>
                  )}
                </div>
              ) : (
                /* FACE DOWN (Lật úp - Ẩn độ khó và điểm số) */
                <div className="flex flex-col items-center justify-center gap-1 sm:gap-1.5 py-1">
                  <div className="w-7 h-7 sm:w-10 sm:h-10 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-sm sm:text-xl text-purple-300/80 shadow-inner group-hover:scale-110 transition-transform">
                    ❓
                  </div>
                  <span className="text-xs sm:text-sm font-black text-slate-300 font-mono tracking-wider">
                    Ô #{cell.id}
                  </span>
                  {cell.attemptCount > 0 && (
                    <span className="text-[8px] sm:text-[9px] text-amber-300 font-semibold bg-amber-500/15 px-1.5 py-0.2 rounded border border-amber-500/30">
                      🔄 Mở lại
                    </span>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Footer Instructions / Caro Winners */}
      {ticTacToeActive && caroAchievedTeams.length > 0 && (
        <div className="p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/40 text-yellow-300 text-xs flex items-center gap-2 animate-bounce-in">
          <span>🎉</span>
          <span className="font-bold">Đã đạt liên hoàn Caro:</span>
          <span>{caroAchievedTeams.join(", ")} (Đã nhận thưởng +{caroBonusPoints}đ chuỗi Caro!)</span>
        </div>
      )}
    </div>
  );
}
