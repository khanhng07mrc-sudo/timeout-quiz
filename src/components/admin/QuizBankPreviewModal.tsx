"use client";

import { useEffect } from "react";
import { BLOOM_METADATA, getBloomLevelFromPoints, BloomLevel } from "@/types";

export interface PreviewQuestion {
  id: string;
  type: string;
  content: string;
  options?: any;
  answer?: string;
  points: number;
  timeLimit: number;
  hint?: string;
  mediaUrl?: string;
  order: number;
}

export interface QuizBankDetail {
  id: string;
  title: string;
  description?: string;
  questions: PreviewQuestion[];
  _count?: { questions: number };
}

interface Props {
  bank: QuizBankDetail;
  onClose: () => void;
}

export default function QuizBankPreviewModal({ bank, onClose }: Props) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const totalPoints = bank.questions.reduce((sum, q) => sum + (q.points || 0), 0);
  const totalTimeSeconds = bank.questions.reduce((sum, q) => sum + (q.timeLimit || 0), 0);
  const totalMinutes = Math.ceil(totalTimeSeconds / 60);

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
      <div
        className="glass rounded-3xl w-full max-w-3xl border border-border bg-[#101221] shadow-2xl my-8 flex flex-col max-h-[90vh] overflow-hidden animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-border/80 flex items-start justify-between gap-4 bg-[#151728]">
          <div className="space-y-1 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-2xl">📚</span>
              <h2 className="text-xl font-black text-white">{bank.title}</h2>
            </div>
            {bank.description && (
              <p className="text-xs text-muted-foreground line-clamp-2">{bank.description}</p>
            )}
            <div className="flex flex-wrap items-center gap-3 pt-2 text-xs">
              <span className="px-2.5 py-1 rounded-lg bg-purple-500/20 text-purple-300 font-bold border border-purple-500/30">
                📝 {bank.questions.length} câu hỏi
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                ⭐ Tổng: {totalPoints} điểm
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30">
                ⏱️ Dự kiến: ~{totalMinutes} phút ({totalTimeSeconds}s)
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-xl bg-card border border-border hover:bg-muted/40 text-muted-foreground hover:text-white flex items-center justify-center font-bold text-lg transition"
            title="Đóng (ESC)"
          >
            ✕
          </button>
        </div>

        {/* Question List */}
        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          {bank.questions.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground">
              <p className="text-4xl mb-2">📭</p>
              <p className="font-semibold">Bộ đề này chưa có câu hỏi nào</p>
            </div>
          ) : (
            bank.questions.map((q, idx) => {
              const bloom: BloomLevel = getBloomLevelFromPoints(q.points);
              const bloomMeta = BLOOM_METADATA[bloom];
              const options = Array.isArray(q.options) ? q.options : [];

              return (
                <div
                  key={q.id || idx}
                  className="rounded-2xl p-5 border border-border/80 bg-[#151728]/70 hover:border-purple-500/40 transition space-y-3"
                >
                  {/* Question header info */}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="w-7 h-7 rounded-lg bg-purple-600/30 text-purple-300 border border-purple-500/40 flex items-center justify-center font-black text-xs">
                        {idx + 1}
                      </span>
                      <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-muted/40 text-muted-foreground border border-border">
                        {q.type === "MC_SINGLE"
                          ? "Trắc nghiệm 1 đáp án"
                          : q.type === "MC_MULTI"
                          ? "Nhiều đáp án"
                          : q.type === "TRUE_FALSE"
                          ? "Đúng / Sai"
                          : q.type === "FILL_BLANK"
                          ? "Điền từ"
                          : q.type === "ESSAY"
                          ? "Tự luận"
                          : q.type}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-xs">
                      <span
                        className="px-2 py-0.5 rounded-full font-bold border"
                        style={{
                          color: bloomMeta.color,
                          borderColor: `${bloomMeta.color}40`,
                          backgroundColor: bloomMeta.bg,
                        }}
                      >
                        {bloomMeta.emoji} {bloomMeta.labelVi}
                      </span>
                      <span className="px-2 py-0.5 rounded-lg bg-muted/20 text-muted-foreground">
                        ⏱️ {q.timeLimit}s
                      </span>
                      <span className="px-2 py-0.5 rounded-lg bg-amber-500/15 text-amber-300 font-bold">
                        ⭐ {q.points}đ
                      </span>
                    </div>
                  </div>

                  {/* Question content */}
                  <p className="text-base font-semibold text-white leading-relaxed">
                    {q.content}
                  </p>

                  {/* Media if present */}
                  {q.mediaUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={q.mediaUrl}
                      alt="Question media"
                      className="max-h-48 rounded-xl border border-border object-contain mx-auto"
                    />
                  )}

                  {/* Options display */}
                  {options.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                      {options.map((opt: any, optIdx: number) => {
                        const label = opt.id?.length === 1 ? opt.id : String.fromCharCode(65 + optIdx);
                        const isCorrect = Boolean(opt.isCorrect);

                        return (
                          <div
                            key={opt.id || optIdx}
                            className={`p-3 rounded-xl text-xs font-medium border flex items-center gap-2.5 transition ${
                              isCorrect
                                ? "border-green-500/80 bg-green-500/15 text-green-200 shadow-sm"
                                : "border-border/60 bg-card/30 text-muted-foreground"
                            }`}
                          >
                            <span
                              className={`w-6 h-6 rounded-md flex items-center justify-center font-bold shrink-0 ${
                                isCorrect
                                  ? "bg-green-500 text-black font-black"
                                  : "bg-muted/40 text-muted-foreground"
                              }`}
                            >
                              {label}
                            </span>
                            <span className="flex-1">{opt.text}</span>
                            {isCorrect && (
                              <span className="text-green-400 font-black text-sm shrink-0">✓ Đúng</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Text answer if fill blank / essay */}
                  {q.answer && (
                    <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-xs text-cyan-200">
                      <span className="font-bold">Đáp án chuẩn: </span>
                      <span className="font-mono">{q.answer}</span>
                    </div>
                  )}

                  {/* Hint if present */}
                  {q.hint && (
                    <div className="text-[11px] text-muted-foreground italic flex items-center gap-1.5 pt-1">
                      <span>💡 Gợi ý:</span>
                      <span>{q.hint}</span>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border/80 flex items-center justify-between bg-[#151728]">
          <p className="text-xs text-muted-foreground">
            Phím tắt <kbd className="px-1.5 py-0.5 rounded bg-muted/40 border border-border text-[10px] text-white">ESC</kbd> để đóng
          </p>
          <button
            onClick={onClose}
            className="px-6 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-sm transition"
          >
            Đóng xem trước
          </button>
        </div>
      </div>
    </div>
  );
}
