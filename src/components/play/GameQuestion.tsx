"use client";

import { QuestionState, AnswerRevealPayload } from "@/types";
import { useState } from "react";

interface Props {
  question: QuestionState;
  timer: { remaining: number; total: number } | null;
  onAnswer: (answer: string | string[]) => void;
  onBuzz: () => void;
  answered: boolean;
  revealPayload: AnswerRevealPayload | null;
  isBuzzMode: boolean;
  roomStatus: string;
}

export default function GameQuestion({ question, timer, onAnswer, onBuzz, answered, revealPayload, roomStatus }: Props) {
  const [selected, setSelected] = useState<string[]>([]);
  const [essayText, setEssayText] = useState("");
  const [fillText, setFillText] = useState("");

  const q = question.question;
  const timerPercent = timer ? (timer.remaining / timer.total) * 100 : 100;
  const timerColor = timerPercent > 50 ? "#06b6d4" : timerPercent > 25 ? "#f59e0b" : "#ef4444";

  const handleOptionClick = (optId: string) => {
    if (answered || revealPayload) return;
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
    if (selected.length > 0) onAnswer(selected);
  };

  const handleSubmitEssay = () => {
    if (essayText.trim()) onAnswer(essayText.trim());
  };

  const handleSubmitFill = () => {
    if (fillText.trim()) onAnswer(fillText.trim());
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

      {/* Question text */}
      <div>
        <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider">
          {q.type === "MC_SINGLE" ? "Trắc nghiệm" : q.type === "MC_MULTI" ? "Nhiều đáp án" : q.type === "TRUE_FALSE" ? "Đúng/Sai" : q.type === "FILL_BLANK" ? "Điền vào chỗ trống" : q.type === "ESSAY" ? "Tự luận" : q.type === "MATCHING" ? "Ghep cặp" : "Kéo thả"}
        </p>
        <h2 className="text-xl font-bold leading-relaxed">{q.content}</h2>
        {q.mediaUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={q.mediaUrl} alt="Media" className="max-h-48 rounded-xl mt-3 mx-auto" />
        )}
      </div>

      {/* Answer area */}
      {roomStatus === "PAUSED" ? (
        <div className="text-center py-6 text-muted-foreground">⏸️ Game đã tạm dừng</div>
      ) : q.type === "MC_SINGLE" || q.type === "TRUE_FALSE" ? (
        <div className="grid grid-cols-1 gap-2">
          {q.options?.map((opt, i) => {
            const labels = ["A", "B", "C", "D"];
            const isCorrect = revealPayload?.correctAnswer.includes(opt.id);
            const isSelected = selected.includes(opt.id);
            return (
              <button
                key={opt.id}
                onClick={() => handleOptionClick(opt.id)}
                disabled={answered || !!revealPayload}
                className={`flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all ${
                  revealPayload
                    ? isCorrect
                      ? "border-green-500 bg-green-500/20 text-green-300"
                      : "border-border opacity-50"
                    : isSelected
                    ? "border-purple-500 bg-purple-500/20"
                    : "border-border hover:border-purple-400 active:scale-95"
                }`}
              >
                <span className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm font-bold shrink-0">
                  {labels[i] ?? i + 1}
                </span>
                <span>{opt.text}</span>
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
            return (
              <button
                key={opt.id}
                onClick={() => handleOptionClick(opt.id)}
                disabled={answered || !!revealPayload}
                className={`flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all ${
                  revealPayload
                    ? isCorrect
                      ? "border-green-500 bg-green-500/20"
                      : "border-border opacity-50"
                    : isSelected
                    ? "border-purple-500 bg-purple-500/20"
                    : "border-border hover:border-purple-400"
                }`}
              >
                <span className="w-8 h-8 rounded border-2 flex items-center justify-center shrink-0">
                  {isSelected && "✓"}
                </span>
                <span className="font-bold w-6">{labels[i]}</span>
                <span>{opt.text}</span>
              </button>
            );
          })}
          {!answered && !revealPayload && (
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
            placeholder="Điền câu trả lời..."
            disabled={answered || !!revealPayload}
            className="flex-1 px-4 py-3 rounded-xl bg-input border border-border focus:outline-none focus:ring-2 focus:ring-ring"
            onKeyDown={(e) => e.key === "Enter" && handleSubmitFill()}
          />
          <button
            onClick={handleSubmitFill}
            disabled={!fillText.trim() || answered}
            className="px-4 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 font-bold disabled:opacity-50"
          >
            Gửi
          </button>
        </div>
      ) : q.type === "ESSAY" ? (
        <div className="flex flex-col gap-2">
          <textarea
            value={essayText}
            onChange={(e) => setEssayText(e.target.value)}
            placeholder="Viết câu trả lời của bạn..."
            rows={4}
            disabled={answered || !!revealPayload}
            className="w-full px-4 py-3 rounded-xl bg-input border border-border focus:outline-none focus:ring-2 focus:ring-ring resize-none"
          />
          <button
            onClick={handleSubmitEssay}
            disabled={!essayText.trim() || answered}
            className="py-3 rounded-xl bg-purple-600 hover:bg-purple-500 font-bold disabled:opacity-50"
          >
            Nộp bài
          </button>
        </div>
      ) : null}

      {answered && !revealPayload && (
        <div className="text-center py-2 text-green-400 font-bold">✓ Đã nộp — Chờ kết quả...</div>
      )}

      {revealPayload && (
        <div className="text-center py-2 font-bold">
          {revealPayload.answers.find((a) => a.isCorrect) ? (
            <span className="text-green-400">✓ Đúng rồi! +{revealPayload.answers.find((a) => a.isCorrect)?.pointsAwarded ?? 0} điểm</span>
          ) : (
            <span className="text-red-400">✗ Sai rồi!</span>
          )}
        </div>
      )}
    </div>
  );
}
