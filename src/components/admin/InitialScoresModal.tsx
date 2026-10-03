"use client";

import { useState } from "react";
import { TeamState } from "@/types";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  teams: TeamState[];
  currentCode: string;
  onSave: (defaultScore: number | undefined, teamScores: Record<string, number>) => Promise<boolean>;
}

export default function InitialScoresModal({
  isOpen,
  onClose,
  teams,
  currentCode,
  onSave,
}: Props) {
  const [uniformScore, setUniformScore] = useState<number>(0);
  const [teamScores, setTeamScores] = useState<Record<string, number>>(() => {
    const map: Record<string, number> = {};
    teams.forEach((t) => {
      map[t.id] = Math.max(0, t.score);
    });
    return map;
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  if (!isOpen) return null;

  const handleApplyUniform = (score: number) => {
    const valid = Math.max(0, score);
    setUniformScore(valid);
    const updated: Record<string, number> = {};
    teams.forEach((t) => {
      updated[t.id] = valid;
    });
    setTeamScores(updated);
  };

  const handleTeamScoreChange = (teamId: string, val: string) => {
    const num = parseInt(val, 10);
    setTeamScores((prev) => ({
      ...prev,
      [teamId]: isNaN(num) ? 0 : Math.max(0, num),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFeedbackMsg(null);
    try {
      const ok = await onSave(undefined, teamScores);
      if (ok) {
        setFeedbackMsg({ type: "success", text: "Đã cập nhật điểm thành công!" });
        setTimeout(() => {
          onClose();
        }, 800);
      } else {
        setFeedbackMsg({ type: "error", text: "Không thể lưu điểm số. Vui lòng thử lại!" });
      }
    } catch {
      setFeedbackMsg({ type: "error", text: "Có lỗi xảy ra khi lưu điểm." });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="glass rounded-2xl p-6 w-full max-w-lg border border-purple-500/40 shadow-2xl relative space-y-5 animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border/50 pb-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">⚙️</span>
            <div>
              <h2 className="text-xl font-bold text-foreground">Cài đặt điểm cho các đội</h2>
              <p className="text-xs text-muted-foreground">Phòng: {currentCode}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/10 text-muted-foreground hover:text-foreground text-sm font-bold"
          >
            ✕
          </button>
        </div>

        {/* Quy định điểm >= 0 banner */}
        <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs flex items-center gap-2">
          <span>ℹ️</span>
          <span>
            <strong>Quy định:</strong> Điểm số xuyên suốt cuộc chơi luôn <strong>&ge; 0</strong>. Mọi phép trừ khiến điểm về âm đều tự động đưa về 0.
          </span>
        </div>

        {/* Quick Presets */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Cài đặt nhanh cho tất cả các đội:
          </label>
          <div className="grid grid-cols-4 gap-2">
            {[0, 50, 100, 200].map((val) => (
              <button
                key={val}
                type="button"
                onClick={() => handleApplyUniform(val)}
                className="py-2 rounded-xl text-xs font-bold border border-border hover:border-purple-500/60 hover:bg-purple-500/10 transition-all active:scale-95"
              >
                {val} điểm
              </button>
            ))}
          </div>
        </div>

        {/* Individual Team List */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Điểm số từng đội:
            </label>
            {teams.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">Chưa có đội nào tham gia phòng.</p>
            ) : (
              teams.map((t) => (
                <div
                  key={t.id}
                  className="flex items-center justify-between p-3 rounded-xl glass border border-border/50 gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-4 h-4 rounded-full shrink-0 shadow-sm"
                      style={{ background: t.color || "#6366f1" }}
                    />
                    <span className="font-semibold text-sm truncate">{t.name}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <input
                      type="number"
                      min={0}
                      value={teamScores[t.id] ?? 0}
                      onChange={(e) => handleTeamScoreChange(t.id, e.target.value)}
                      className="w-24 px-3 py-1.5 rounded-lg bg-input border border-border text-center font-bold text-cyan-400 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                    />
                    <span className="text-xs text-muted-foreground">pts</span>
                  </div>
                </div>
              ))
            )}
          </div>

          {feedbackMsg && (
            <div
              className={`p-3 rounded-xl text-xs font-semibold text-center ${
                feedbackMsg.type === "success"
                  ? "bg-green-500/10 border border-green-500/30 text-green-300"
                  : "bg-destructive/10 border border-destructive/30 text-destructive"
              }`}
            >
              {feedbackMsg.text}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-border hover:bg-card text-muted-foreground hover:text-foreground font-semibold text-sm transition-colors"
            >
              Đóng
            </button>
            <button
              type="submit"
              disabled={isSubmitting || teams.length === 0}
              className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white font-bold text-sm transition-all shadow-md active:scale-95 disabled:opacity-50"
            >
              {isSubmitting ? "Đang lưu..." : "Xác nhận & Lưu"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
