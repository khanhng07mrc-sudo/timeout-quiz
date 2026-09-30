"use client";

import { GridCaroState, GridCell } from "@/types";

interface Props {
  gridState?: GridCaroState;
  myTeamId?: string;
  isMyTurn?: boolean;
  canSelect?: boolean;
  onSelectCell?: (cellId: number) => void;
  isDisplay?: boolean;
}

export default function GridCaroBoard({
  gridState,
  myTeamId,
  isMyTurn = false,
  canSelect = false,
  onSelectCell,
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
    previewActive,
    previewRemaining,
    currentTurnTeamName,
    streakTargetK,
    caroBonusPoints,
    caroAchievedTeams,
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
              {ticTacToeActive ? (
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40">
                  Caro ({streakTargetK} ô thẳng hàng · Thưởng điểm chuỗi)
                </span>
              ) : (
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                  Chọn ô tự do
                </span>
              )}
            </h3>
            <p className="text-xs text-muted-foreground">
              {ticTacToeActive
                ? `Chọn ô điểm số · Đúng chiếm ô màu đội · Xếp liền ${streakTargetK} ô (ngang/dọc/chéo) nhận thưởng Caro!`
                : "Chọn ô điểm số · Trả lời đúng nhận trọn điểm ô · Sai không trừ điểm và ô mở lại với câu hỏi mới"}
            </p>
          </div>
        </div>

        {/* Status Badges */}
        <div className="flex items-center gap-2">
          {previewActive ? (
            <div className="px-3 py-1.5 rounded-xl bg-cyan-500/20 border border-cyan-500/50 text-cyan-300 font-bold text-sm animate-pulse flex items-center gap-2">
              <span>👁️ Đang xem trước độ khó:</span>
              <span className="text-white font-mono font-black text-base">{previewRemaining}s</span>
            </div>
          ) : currentTurnTeamName ? (
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

      {/* Grid of Rectangles */}
      <div
        className="grid gap-3 select-none"
        style={{
          gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
        }}
      >
        {cells.map((cell: GridCell) => {
          const isClaimed = cell.isCompleted && cell.claimedByTeamId;
          const isClickable = !previewActive && canSelect && !isClaimed;
          const diffStyle = difficultyColors[cell.difficulty] || "text-purple-300 border-purple-500/30 bg-purple-500/10";

          return (
            <button
              key={cell.id}
              type="button"
              disabled={!isClickable}
              onClick={() => onSelectCell && onSelectCell(cell.id)}
              className={`relative rounded-xl border-2 transition-all flex flex-col items-center justify-center p-3 text-center min-h-[90px] ${
                isClaimed
                  ? "shadow-lg scale-[0.98] cursor-default font-bold"
                  : isClickable
                  ? "cursor-pointer hover:border-cyan-400 hover:scale-105 active:scale-95 glass bg-card/60 glow-cyan"
                  : "cursor-default opacity-85 glass bg-card/30"
              }`}
              style={{
                borderColor: isClaimed ? cell.claimedByTeamColor || "#10b981" : undefined,
                background: isClaimed
                  ? `linear-gradient(135deg, ${cell.claimedByTeamColor || "#10b981"}33, ${cell.claimedByTeamColor || "#10b981"}88)`
                  : undefined,
              }}
            >
              {/* Cell Number Badge */}
              <span className="absolute top-1.5 left-2 text-[11px] font-mono text-muted-foreground/80 font-bold">
                #{cell.id}
              </span>

              {/* Claimed content */}
              {isClaimed ? (
                <div className="flex flex-col items-center justify-center gap-1 z-10">
                  <span className="text-xl">⭐</span>
                  <span className="text-xs font-black text-white truncate max-w-[95%]">
                    {cell.claimedByTeamName}
                  </span>
                  <span className="text-[10px] text-white/80 font-mono font-bold">
                    +{cell.points}đ
                  </span>
                </div>
              ) : (
                /* Unclaimed cell content */
                <div className="flex flex-col items-center justify-center gap-1">
                  {/* If in preview period or admin view, reveal difficulty & points */}
                  {previewActive ? (
                    <div className="flex flex-col items-center gap-0.5 animate-fadeIn">
                      <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase border ${diffStyle}`}>
                        {cell.difficulty}
                      </span>
                      <span className="text-lg font-black text-cyan-300 font-mono">
                        {cell.points} pts
                      </span>
                    </div>
                  ) : (
                    /* In-game view */
                    <div className="flex flex-col items-center gap-0.5">
                      <span className="text-2xl font-black text-white font-mono">
                        {cell.points}
                      </span>
                      <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                        {cell.difficulty}
                      </span>
                      {cell.attemptCount > 0 && (
                        <span className="text-[9px] text-yellow-400/80 font-medium">
                          (Đổi câu mới)
                        </span>
                      )}
                    </div>
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
          <span>{caroAchievedTeams.join(", ")} (Đã nhận thưởng điểm Caro chuỗi!)</span>
        </div>
      )}
    </div>
  );
}
