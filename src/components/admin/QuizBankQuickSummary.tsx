"use client";

import { useEffect, useState } from "react";
import QuizBankPreviewModal, { QuizBankDetail } from "./QuizBankPreviewModal";

interface Props {
  bankId: string;
  onClear?: () => void;
  showClearButton?: boolean;
}

export default function QuizBankQuickSummary({ bankId, onClear, showClearButton = true }: Props) {
  const [bank, setBank] = useState<QuizBankDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (!bankId) {
      setBank(null);
      return;
    }

    let isMounted = true;
    setLoading(true);

    fetch(`/api/quiz-bank/${bankId}`)
      .then((res) => res.json())
      .then((data) => {
        if (isMounted && data.bank) {
          setBank(data.bank);
        }
      })
      .catch((err) => console.error("Error fetching bank preview:", err))
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [bankId]);

  if (!bankId) return null;

  if (loading) {
    return (
      <div className="p-4 rounded-2xl border border-border/80 bg-[#151728]/60 text-xs text-muted-foreground flex items-center gap-2 animate-pulse">
        <span className="animate-spin text-purple-400">⚡</span>
        Đang tải thông tin xem trước bộ đề...
      </div>
    );
  }

  if (!bank) return null;

  const questions = bank.questions || [];
  const totalPoints = questions.reduce((sum, q) => sum + (q.points || 0), 0);
  const totalTimeSeconds = questions.reduce((sum, q) => sum + (q.timeLimit || 0), 0);
  const totalMinutes = Math.ceil(totalTimeSeconds / 60);

  // Group by question type
  const countByType = questions.reduce((acc, q) => {
    acc[q.type] = (acc[q.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <>
      <div className="p-4 rounded-2xl border border-purple-500/40 bg-purple-950/20 shadow-md space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xl">📚</span>
            <div>
              <p className="font-bold text-sm text-white flex items-center gap-2">
                {bank.title}
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-500/20 text-green-300 border border-green-500/30">
                  Đã chọn
                </span>
              </p>
              {bank.description && (
                <p className="text-xs text-muted-foreground line-clamp-1">{bank.description}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowModal(true)}
              className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center gap-1.5 transition shadow"
            >
              <span>👁️</span> Xem trước đề
            </button>
            {showClearButton && onClear && (
              <button
                type="button"
                onClick={onClear}
                className="px-2.5 py-1.5 rounded-xl border border-border hover:bg-destructive/20 text-muted-foreground hover:text-destructive text-xs transition"
                title="Bỏ chọn bộ đề này"
              >
                ✕ Bỏ chọn
              </button>
            )}
          </div>
        </div>

        {/* Quick metrics bar */}
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="p-2.5 rounded-xl bg-[#101221]/80 border border-border/60 text-center">
            <p className="text-[11px] text-muted-foreground">Số câu hỏi</p>
            <p className="font-black text-sm text-purple-300">{questions.length} câu</p>
          </div>
          <div className="p-2.5 rounded-xl bg-[#101221]/80 border border-border/60 text-center">
            <p className="text-[11px] text-muted-foreground">Tổng điểm</p>
            <p className="font-black text-sm text-amber-300">{totalPoints} điểm</p>
          </div>
          <div className="p-2.5 rounded-xl bg-[#101221]/80 border border-border/60 text-center">
            <p className="text-[11px] text-muted-foreground">Dự kiến thời gian</p>
            <p className="font-black text-sm text-cyan-300">~{totalMinutes} phút</p>
          </div>
        </div>

        {/* Type badges */}
        {questions.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-[11px] text-muted-foreground mr-1">Cấu trúc:</span>
            {countByType["MC_SINGLE"] && (
              <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-muted/30 text-muted-foreground border border-border">
                {countByType["MC_SINGLE"]} Trắc nghiệm đơn
              </span>
            )}
            {countByType["MC_MULTI"] && (
              <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-muted/30 text-muted-foreground border border-border">
                {countByType["MC_MULTI"]} Nhiều đáp án
              </span>
            )}
            {countByType["TRUE_FALSE"] && (
              <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-muted/30 text-muted-foreground border border-border">
                {countByType["TRUE_FALSE"]} Đúng/Sai
              </span>
            )}
            {countByType["FILL_BLANK"] && (
              <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-muted/30 text-muted-foreground border border-border">
                {countByType["FILL_BLANK"]} Điền từ
              </span>
            )}
            {countByType["ESSAY"] && (
              <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-muted/30 text-muted-foreground border border-border">
                {countByType["ESSAY"]} Tự luận
              </span>
            )}
          </div>
        )}
      </div>

      {showModal && (
        <QuizBankPreviewModal bank={bank} onClose={() => setShowModal(false)} />
      )}
    </>
  );
}
