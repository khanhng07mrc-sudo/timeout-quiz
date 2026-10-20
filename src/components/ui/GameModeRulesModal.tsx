"use client";

import { useState } from "react";
import { GameMode, MODE_RULES } from "@/types";
import GameModeIcon from "@/components/ui/GameModeIcon";

interface Props {
  mode?: GameMode;
  isOpen: boolean;
  onClose: () => void;
}

const MODE_TAB_NAMES: Partial<Record<GameMode, string>> = {
  CLASSIC: "Truyền thống",
  BUZZ: "Chuông bấm",
  BOUNCEBACK: "Bật nảy & Cướp lượt",
  ELIMINATION: "Sinh tồn",
  TOURNAMENT: "Đấu loại 1v1",
  MAGIC_WHEEL: "Magic Wheel",
  GRID_CARO: "Chọn ô & Caro",
  DICE_RACE: "Đua cờ Xí ngầu",
  WAGER: "Cược điểm",
};

interface WalkthroughStep {
  step: number;
  badge: string;
  emoji: string;
  title: string;
  desc: string;
  highlights: string[];
}

const MAGIC_WHEEL_STEPS: WalkthroughStep[] = [
  {
    step: 1,
    badge: "VÒNG 1 - 3",
    emoji: "🎡",
    title: "Quay Nón Tích Lũy Điểm Số",
    desc: "Đội đến lượt bấm chốt lực để quay chiếc nón 24 ô định mệnh. Nón dừng ở ô điểm (100 - 2000đ) để mở quyền đoán chữ cái. Tránh các ô nguy hiểm: Mất Lượt, Mất Điểm (Bankrupt). Trải nghiệm các ô đặc biệt: Ô Phần Thưởng, Ô Bí Mật, May Mắn, Nhân Đôi!",
    highlights: ["🎡 24 ô điểm thưởng & ô hiệu ứng", "🎁 Ô Phần Thưởng & Ô Bí Mật", "⚠️ Ô Mất Điểm / Mất Lượt chuyển quyền chơi"],
  },
  {
    step: 2,
    badge: "SUY LUẬN TỪ KHÓA",
    emoji: "🔤",
    title: "Đoán Phụ Âm & Mua Nguyên Âm",
    desc: "Sau khi quay nón trúng ô điểm, đội gọi 1 phụ âm. Có bao nhiêu chữ cái xuất hiện sẽ nhận [Điểm ô × Số chữ] và tiếp tục giữ lượt quay. Mua nguyên âm (A, E, I, O, U, Y) bằng điểm số quy định để tăng tốc độ suy luận cụm từ ẩn.",
    highlights: ["🔠 Bàn phím theo dõi chữ cái trực quan", "💰 Thưởng điểm: Điểm ô × Số chữ xuất hiện", "💡 Mua nguyên âm mở lối từ khóa"],
  },
  {
    step: 3,
    badge: "TRANH CHUÔNG",
    emoji: "⚡",
    title: "Vòng Đoán Nhanh & Giải Ô Chữ",
    desc: "Ở 2 Vòng Đoán Nhanh, chữ cái hé lộ tự động. Thí sinh bấm chuông tròn cố định sau hiệu lệnh (chặn bấm trước 0.75s) để giành quyền giải. Ở mọi vòng chính, đội tới lượt có thể chọn 'Giải Ô Chữ' bất cứ lúc nào để ẵm trọn toàn bộ điểm tích lũy của vòng!",
    highlights: ["🔔 Nút chuông tròn cố định chống chạm nhầm", "⏱️ Khóa bấm sớm dưới 0.75s đảm bảo công bằng", "🏆 Giải đúng nhận trọn điểm số vòng thi"],
  },
  {
    step: 4,
    badge: "CHUNG KẾT",
    emoji: "🏆",
    title: "Vòng Đặc Biệt 40 Giây Bứt Phá",
    desc: "Đội có tổng điểm cao nhất sau các vòng chính bước vào Vòng Chung Kết. Chọn 1 trong 3 chủ đề bí mật, được mở sẵn các chữ cái gợi ý, sau đó chọn thêm các phụ âm và nguyên âm. Có 40 giây suy luận giải mã ô chữ chung cuộc!",
    highlights: ["🌟 Đội điểm cao nhất vào chung kết", "⏱️ 40 giây bấm chuông giải ô chữ", "🥇 Vinh danh nhận cúp chiến thắng"],
  },
];

const GENERIC_MODE_STEPS: Record<string, WalkthroughStep[]> = {
  GRID_CARO: [
    {
      step: 1,
      badge: "CHỌN Ô SỐ",
      emoji: "🎯",
      title: "Chọn Ô Ma Trận 10đ - 20đ - 30đ",
      desc: "Các đội luân phiên chọn ô trên bàn cờ ma trận. Mỗi ô gắn cố định mức điểm và độ khó Dễ (10đ), Trung bình (20đ), Khó (30đ).",
      highlights: ["🎲 Luôn có câu hỏi mới phù hợp", "🎯 3 bậc nhận thức chuẩn mực"],
    },
    {
      step: 2,
      badge: "CHIẾN THUẬT CARO",
      emoji: "🏁",
      title: "Chiếm Ô & Chặn Đường Đối Thủ",
      desc: "Trả lời đúng sẽ đổi màu ô thành màu của đội mình. Đội trả lời sai thì ô vẫn mở cho lượt chơi sau.",
      highlights: ["🛡️ Vừa ghi điểm vừa chặn đường đối phương", "⚡ Ô sai vẫn giữ nguyên trên bàn cờ"],
    },
    {
      step: 3,
      badge: "THƯỞNG CARO",
      emoji: "🌟",
      title: "Nối Chuỗi K Ô Nhận Thưởng Lớn",
      desc: "Đội đầu tiên tạo được hàng liên tiếp (ngang, dọc, chéo) theo quy định nhận trọn giải thưởng Caro Bonus!",
      highlights: ["✨ Thưởng chuỗi liên kết", "🏆 Bứt phá bảng xếp hạng"],
    },
  ],
  BUZZ: [
    {
      step: 1,
      badge: "ĐỌC ĐỀ",
      emoji: "📖",
      title: "Theo Dõi Câu Hỏi & Gợi Ý",
      desc: "Câu hỏi được hiển thị cùng các phương án lựa chọn trên màn hình lớn của hội trường.",
      highlights: ["👀 Quan sát câu hỏi", "🧠 Chuẩn bị phản xạ"],
    },
    {
      step: 2,
      badge: "BẤM CHUÔNG",
      emoji: "🔔",
      title: "Cướp Quyền Trả Lời Siêu Tốc",
      desc: "Đội bấm chuông nhanh nhất tính theo mili-giây sẽ giành quyền trả lời duy nhất của câu hỏi.",
      highlights: ["⚡ Cạnh tranh tốc độ bấm chuông", "🔒 Khóa chuông các đội còn lại"],
    },
    {
      step: 3,
      badge: "GHI ĐIỂM",
      emoji: "🎯",
      title: "Trả Lời Đúng Ăn Điểm / Bật Nảy",
      desc: "Đúng nhận trọn điểm câu hỏi. Nếu trả lời sai, cơ hội cướp lượt có thể bật nảy sang cho đội bấm nhanh tiếp theo!",
      highlights: ["💰 Ăn trọn điểm số", "🔄 Cơ chế bật nảy cướp lượt kịch tính"],
    },
  ],
};

export default function GameModeRulesModal({ mode = "CLASSIC", isOpen, onClose }: Props) {
  const [selectedMode, setSelectedMode] = useState<GameMode>(mode);
  const [viewType, setViewType] = useState<"WALKTHROUGH" | "RULES">("WALKTHROUGH");
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  if (!isOpen) return null;

  const currentMode = selectedMode || mode || "CLASSIC";
  const rule = MODE_RULES[currentMode] || MODE_RULES.CLASSIC;
  const walkthroughSteps = currentMode === "MAGIC_WHEEL" 
    ? MAGIC_WHEEL_STEPS 
    : (GENERIC_MODE_STEPS[currentMode] || null);

  const activeStep = walkthroughSteps ? walkthroughSteps[Math.min(currentStepIndex, walkthroughSteps.length - 1)] : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl max-h-[92vh] glass rounded-3xl border border-white/20 p-5 sm:p-6 flex flex-col gap-4 overflow-hidden shadow-2xl animate-scale-up bg-[#121324]/95 text-white"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-2xl bg-white/5 border border-white/10 shadow-inner shrink-0">
              <GameModeIcon mode={currentMode} className="w-9 h-9 drop-shadow" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-black bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
                  {rule.nameVi}
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  {rule.mode}
                </span>
              </div>
              <p className="text-xs text-muted-foreground font-medium mt-0.5 line-clamp-1">
                {rule.taglineVi}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl glass hover:bg-white/10 flex items-center justify-center text-muted-foreground hover:text-white transition active:scale-95"
            aria-label="Đóng"
          >
            ✕
          </button>
        </div>

        {/* Mode Selector Tabs */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {(Object.keys(MODE_RULES) as GameMode[]).map((m) => {
            const r = MODE_RULES[m];
            const active = m === currentMode;
            return (
              <button
                key={m}
                onClick={() => {
                  setSelectedMode(m);
                  setCurrentStepIndex(0);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 flex items-center gap-1.5 transition-all whitespace-nowrap ${
                  active
                    ? "bg-gradient-to-r from-purple-600 to-cyan-600 text-white shadow-lg ring-1 ring-white/30"
                    : "glass hover:bg-white/10 text-muted-foreground hover:text-white"
                }`}
              >
                <GameModeIcon mode={m} className="w-4 h-4 shrink-0" />
                <span className="whitespace-nowrap">{MODE_TAB_NAMES[m] || r.nameVi.replace(/\s*\(.*?\)/, "").trim() || r.nameVi}</span>
              </button>
            );
          })}
        </div>

        {/* View Mode Switcher: 🎬 4 Bước Trực Quan vs 📋 Chi Tiết Thể Lệ */}
        <div className="flex items-center justify-between bg-black/40 p-1 rounded-xl border border-white/10">
          <button
            type="button"
            onClick={() => setViewType("WALKTHROUGH")}
            disabled={!walkthroughSteps}
            className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition ${
              viewType === "WALKTHROUGH" && walkthroughSteps
                ? "bg-gradient-to-r from-purple-600 to-cyan-600 text-white shadow"
                : "text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
            }`}
          >
            <span>🎬</span>
            <span>Minh Họa Các Bước {walkthroughSteps ? `(${walkthroughSteps.length} bước)` : ""}</span>
          </button>
          <button
            type="button"
            onClick={() => setViewType("RULES")}
            className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition ${
              viewType === "RULES" || !walkthroughSteps
                ? "bg-gradient-to-r from-purple-600 to-cyan-600 text-white shadow"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <span>📋</span>
            <span>Thể Lệ Chi Tiết</span>
          </button>
        </div>

        {/* Body Content Area */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1 text-sm min-h-0">
          {viewType === "WALKTHROUGH" && activeStep && walkthroughSteps ? (
            /* Carousel Step View */
            <div className="flex flex-col gap-4 py-1">
              {/* Step Navigation Dots & Arrows */}
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-cyan-300">
                  Bước {currentStepIndex + 1} / {walkthroughSteps.length}
                </span>
                <div className="flex items-center gap-2">
                  {walkthroughSteps.map((s, idx) => (
                    <button
                      key={s.step}
                      type="button"
                      onClick={() => setCurrentStepIndex(idx)}
                      className={`h-2 rounded-full transition-all ${
                        idx === currentStepIndex ? "w-6 bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.6)]" : "w-2 bg-white/20 hover:bg-white/40"
                      }`}
                      aria-label={`Bước ${idx + 1}`}
                    />
                  ))}
                </div>
              </div>

              {/* Active Step Card */}
              <div className="glass rounded-2xl p-5 border border-purple-500/30 bg-gradient-to-br from-purple-950/40 via-[#15172b] to-black/60 shadow-xl space-y-3.5">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider bg-purple-500/25 text-purple-300 border border-purple-500/40">
                    {activeStep.badge}
                  </span>
                  <span className="text-3xl">{activeStep.emoji}</span>
                </div>

                <h3 className="text-lg font-black text-white">
                  {activeStep.title}
                </h3>

                <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
                  {activeStep.desc}
                </p>

                {/* Highlights pill tags */}
                <div className="pt-2 border-t border-white/10 flex flex-wrap gap-2">
                  {activeStep.highlights.map((h, hIdx) => (
                    <span
                      key={hIdx}
                      className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-white/5 border border-white/10 text-cyan-200"
                    >
                      {h}
                    </span>
                  ))}
                </div>
              </div>

              {/* Prev / Next Buttons */}
              <div className="flex items-center justify-between gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setCurrentStepIndex((prev) => Math.max(0, prev - 1))}
                  disabled={currentStepIndex === 0}
                  className="px-4 py-2 rounded-xl text-xs font-bold glass hover:bg-white/10 border border-white/15 text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed transition"
                >
                  ← Bước trước
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (currentStepIndex < walkthroughSteps.length - 1) {
                      setCurrentStepIndex((prev) => prev + 1);
                    } else {
                      setViewType("RULES");
                    }
                  }}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white shadow-lg transition"
                >
                  {currentStepIndex < walkthroughSteps.length - 1 ? "Bước tiếp theo →" : "Xem toàn bộ thể lệ →"}
                </button>
              </div>
            </div>
          ) : (
            /* Detailed Rules View */
            <div className="space-y-4">
              {/* Summary Box */}
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-muted-foreground leading-relaxed">
                <p className="text-foreground font-medium text-xs sm:text-sm">{rule.summaryVi}</p>
              </div>

              {/* Mechanics */}
              <div className="space-y-2">
                <h3 className="text-xs font-black uppercase tracking-wider text-cyan-400 flex items-center gap-2">
                  <span>🕹️</span> Cách thức chơi & Lượt thi đấu:
                </h3>
                <ul className="space-y-1.5 pl-1">
                  {rule.mechanicsVi.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2.5 text-xs text-foreground/90">
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 mt-1.5 shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Scoring */}
              <div className="space-y-2">
                <h3 className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-2">
                  <span>📊</span> Tính điểm & Thưởng phạt:
                </h3>
                <ul className="space-y-1.5 pl-1">
                  {rule.scoringVi.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2.5 text-xs text-foreground/90">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Tips */}
              {rule.tipsVi.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-xs font-black uppercase tracking-wider text-green-400 flex items-center gap-2">
                    <span>💡</span> Chiến thuật & Mẹo chiến thắng:
                  </h3>
                  <ul className="space-y-1.5 pl-1">
                    {rule.tipsVi.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-2.5 text-xs text-green-200/90 italic">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-400 mt-1.5 shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-white/10 pt-3 flex items-center justify-between text-xs text-slate-400">
          <span>Quy chế đấu trường chính thức</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold transition active:scale-95"
          >
            Đã hiểu & Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
