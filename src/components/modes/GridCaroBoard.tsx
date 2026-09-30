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
    currentRound = 1,
    maxRounds = 3,
    turnsCompleted = 0,
    maxTurns = 6,
    currentTurnTeamName,
    selectedCellId,
    selectedCellAnimation,
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
            <h3 className={`font-black ${isDisplay ? "text-2xl" : "text-lg"} text-white flex items-center gap-2`}>
              {ticTacToeActive ? `Lưới Câu Hỏi & Đấu Caro ${rows}×${cols}` : `Lưới Chọn Ô Câu Hỏi ${rows}×${cols}`}
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-mono">
                Vòng {currentRound}/{maxRounds} · Lượt {turnsCompleted}/{maxTurns}
              </span>
              {ticTacToeActive && (
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40">
                  Caro ({streakTargetK} ô thẳng hàng · Thưởng chuỗi)
                </span>
              )}
            </h3>
            <p className="text-xs text-muted-foreground">
              {ticTacToeActive
                ? `Chọn ô điểm số · Đúng chiếm ô màu đội · Xếp liền ${streakTargetK} ô nhận thưởng Caro · Sai ô vẫn mở cho lượt sau!`
                : "Chọn ô điểm số · Trả lời đúng nhận trọn điểm ô · Sai ô vẫn mở với câu hỏi mới cùng mức điểm!"}
            </p>
          </div>
        </div>

        {/* Status Badges */}
        <div className="flex items-center gap-2">
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
        className="grid gap-3 select-none"
        style={{
          gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
        }}
      >
        {cells.map((cell: GridCell) => {
          const isClaimed = cell.isCompleted && cell.claimedByTeamId;
          const isSelectedAnim = Boolean(selectedCellAnimation && cell.id === selectedCellId);
          const isClickable = (isAdmin || canSelect) && !isClaimed && !selectedCellAnimation;
          const diffStyle = difficultyColors[cell.difficulty] || "text-purple-300 border-purple-500/30 bg-purple-500/10";

          return (
            <button
              key={cell.id}
              type="button"
              disabled={!isClickable}
              onClick={() => onSelectCell && onSelectCell(cell.id)}
              className={`relative rounded-xl border-2 transition-all flex flex-col items-center justify-center p-3 text-center min-h-[95px] ${
                isSelectedAnim
                  ? "border-yellow-400 bg-yellow-500/30 scale-105 shadow-2xl animate-pulse ring-4 ring-yellow-400/50"
                  : isClaimed
                  ? "shadow-lg scale-[0.98] cursor-default font-bold"
                  : isClickable
                  ? "cursor-pointer hover:border-cyan-400 hover:scale-105 active:scale-95 glass bg-card/60 glow-cyan"
                  : "cursor-default opacity-85 glass bg-card/30"
              }`}
              style={{
                borderColor: isSelectedAnim
                  ? "#facc15"
                  : isClaimed
                  ? cell.claimedByTeamColor || "#10b981"
                  : undefined,
                background: isSelectedAnim
                  ? "rgba(234, 179, 8, 0.25)"
                  : isClaimed
                  ? `linear-gradient(135deg, ${cell.claimedByTeamColor || "#10b981"}33, ${cell.claimedByTeamColor || "#10b981"}88)`
                  : undefined,
              }}
            >
              {/* Cell Number Badge */}
              <span className="absolute top-1.5 left-2 text-[11px] font-mono text-muted-foreground/90 font-bold">
                #{cell.id}
              </span>

              {/* Selection Animation Banner */}
              {isSelectedAnim ? (
                <div className="flex flex-col items-center justify-center gap-1 animate-bounce">
                  <span className="text-xl">⚡</span>
                  <span className="text-xs font-black text-yellow-300 uppercase tracking-widest">
                    ĐÃ CHỌN!
                  </span>
                  <span className="text-sm font-bold text-white font-mono">
                    {cell.points}đ · {cell.difficulty}
                  </span>
                </div>
              ) : isClaimed ? (
                /* Claimed content */
                <div className="flex flex-col items-center justify-center gap-1 z-10">
                  <span className="text-xl">⭐</span>
                  <span className="text-xs font-black text-white truncate max-w-[95%]">
                    {cell.claimedByTeamName}
                  </span>
                  <span className="text-[10px] text-white/90 font-mono font-bold">
                    +{cell.points}đ
                  </span>
                </div>
              ) : (
                /* Unclaimed cell content - Always shows points and difficulty */
                <div className="flex flex-col items-center gap-1">
                  <span className="text-2xl font-black text-white font-mono">
                    {cell.points}đ
                  </span>
                  <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase border ${diffStyle}`}>
                    {cell.difficulty}
                  </span>
                  {cell.attemptCount > 0 && (
                    <span className="text-[9px] text-amber-300 font-semibold bg-amber-500/10 px-1.5 py-0.2 rounded border border-amber-500/30">
                      🔄 Mở lại (Câu mới)
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
          <span>{caroAchievedTeams.join(", ")} (Đã nhận thưởng điểm chuỗi Caro!)</span>
        </div>
      )}
    </div>
  );
}
