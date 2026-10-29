"use client";

import React, { useState } from "react";
import type { RulesetId } from "@/lib/olympia/types";

interface RuleDetail {
  season: string;
  khoiDong: string;
  vcnv: string;
  tangToc: string;
  veDich: string;
  cauHoiPhu: string;
}

const WIKIPEDIA_RULES: Record<string, RuleDetail> = {
  O26: {
    season: "Olympia 26 (Mới nhất)",
    khoiDong:
      "• Khởi động riêng: 4 thí sinh lần lượt trả lời 6 câu hỏi riêng (suy nghĩ 3 giây/câu). Đúng +10đ, sai không bị trừ điểm.\n• Khởi động chung: Gồm 12 câu hỏi bấm chuông giành quyền trả lời. Khi câu hỏi hiện lên, chuông bị khóa 5 giây rồi mới mở. Đúng +10đ, bấm chuông sai bị trừ 5đ; các thí sinh còn lại có quyền bấm chuông trả lời lại 1 lần duy nhất trong 5 giây.",
    vcnv:
      "• Gồm 4 từ hàng ngang (mỗi câu đúng +10đ) và 1 ô trung tâm (+10đ).\n• Thang điểm đoán CNV: 60đ (trước/tại hàng 1), 50đ (hàng 2), 40đ (hàng 3), 30đ (hàng 4), 20đ (sau ô trung tâm).\n• Đoán sai CNV bị loại khỏi phần thi.",
    tangToc:
      "• Gồm 4 câu hỏi với thời gian suy nghĩ 20s, 20s, 30s, 30s.\n• Thang điểm theo thứ tự gửi đáp án đúng nhanh nhất: 40đ - 30đ - 20đ - 10đ (tính chính xác theo mili-giây; nếu bằng nhau thì cùng điểm).",
    veDich:
      "• Mỗi thí sinh chọn gói 3 câu hỏi ở 2 mức điểm: 20 điểm hoặc 30 điểm (thời gian suy nghĩ: 15s cho câu 20đ, 20s cho câu 30đ; thực hành: 20s–60s).\n• Ngôi sao hy vọng: Đúng nhân đôi (+2x), sai trừ số điểm câu hỏi (-1x).\n• Cướp điểm: Nếu thí sinh chính trả lời sai, các thí sinh còn lại có 5 giây bấm chuông cướp điểm. Đúng được cộng số điểm câu hỏi, sai bị trừ 50% số điểm.",
    cauHoiPhu:
      "• Dành cho các thí sinh bằng điểm sau 4 vòng thi. Mỗi câu 15 giây suy nghĩ, bấm chuông giành quyền. Trả lời đúng thắng ngay lập tức.",
  },
  "O24-25": {
    season: "Olympia 24 – 25",
    khoiDong:
      "• Khởi động riêng: 4 thí sinh lần lượt trả lời 6 câu hỏi riêng (5 giây/câu). Đúng +10đ, sai không trừ.\n• Khởi động chung: 12 câu hỏi bấm chuông, chuông khóa 5 giây đầu. Đúng +10đ, sai trừ 5đ, có cơ hội cướp chuông lần 2.",
    vcnv:
      "• 4 từ hàng ngang + 1 ô trung tâm. Điểm đoán CNV: 60 - 50 - 40 - 30 - 20 điểm.",
    tangToc:
      "• 4 câu hỏi với thời gian suy nghĩ: 10 giây (câu 1), 20 giây (câu 2), 30 giây (câu 3), 40 giây (câu 4). Điểm số: 40 - 30 - 20 - 10đ.",
    veDich:
      "• Chọn 3 câu hỏi ở 2 mức điểm: 20đ hoặc 30đ. Ngôi sao hy vọng (+2x / -1x). Bấm chuông cướp điểm trong 5s (+100% / -50%).",
    cauHoiPhu:
      "• Câu hỏi 15s, bấm chuông giành quyền trả lời, đúng thắng ngay.",
  },
  O23: {
    season: "Olympia 23",
    khoiDong:
      "• Khởi động thi chung toàn bộ theo 3 lượt: Lượt 1 (8 câu - mỗi người 2 câu), Lượt 2 (12 câu - mỗi người 3 câu), Lượt 3 (16 câu - mỗi người 4 câu).\n• Bấm chuông giành quyền trả lời, chuông khóa 5s sau khi mở câu. Trả lời đúng +10đ, trả lời sai bị trừ 5đ.",
    vcnv:
      "• Thang điểm đoán CNV: 50đ (hàng 1), 40đ (hàng 2), 30đ (hàng 3), 20đ (hàng 4), 10đ (ô trung tâm).",
    tangToc:
      "• 4 câu hỏi thời gian 10s - 20s - 30s - 40s. Điểm số: 40 - 30 - 20 - 10đ.",
    veDich:
      "• Chọn 3 câu ở các mức điểm 10đ, 20đ, 30đ. Ngôi sao hy vọng (+2x / -1x). Cướp điểm (+100% / -50%).",
    cauHoiPhu:
      "• Câu hỏi 15s, bấm chuông, đúng thắng ngay.",
  },
  O22: {
    season: "Olympia 22",
    khoiDong:
      "• Khởi động riêng: Mỗi thí sinh có 60 giây trả lời không giới hạn câu hỏi.\n• Khởi động chung: 3 lượt thời gian 30s, 60s, 90s bấm chuông. Chuông khóa 2 giây sau khi mở câu. Trả lời đúng +10đ, trả lời sai bị khóa chuông ở câu tiếp theo (không bị trừ điểm).",
    vcnv:
      "• Thang điểm đoán CNV: 60đ - 50đ - 40đ - 30đ - 20đ. Hàng ngang +10đ.",
    tangToc:
      "• 4 câu hỏi thời gian 10s - 20s - 30s - 40s. Điểm số: 40 - 30 - 20 - 10đ.",
    veDich:
      "• Chọn 3 câu hỏi bất kỳ ở mức 10đ, 20đ, 30đ. Ngôi sao hy vọng (+2x / -1x). Cướp điểm (+100% / -50%).",
    cauHoiPhu:
      "• Câu hỏi 15s, đúng thắng ngay.",
  },
  "O13-21": {
    season: "Olympia 13 – 21 (Kỷ Nguyên Cổ Điển)",
    khoiDong:
      "• Mỗi thí sinh có đồng hồ cá nhân 60 giây trả lời độc lập các câu hỏi (O13: tối đa 12 câu; O14-O21: không giới hạn số câu hỏi). Mỗi câu trả lời đúng được 10 điểm, trả lời sai không bị trừ điểm.",
    vcnv:
      "• 4 hàng ngang và 1 hình ảnh trung tâm. Điểm đoán CNV: 80đ (sau câu 1), 60đ (sau câu 2), 40đ (sau câu 3), 20đ (sau câu 4), 10đ (sau ô trung tâm).",
    tangToc:
      "• 4 câu hỏi đều có chung thời gian suy nghĩ 30 giây. Thang điểm 40 - 30 - 20 - 10đ.",
    veDich:
      "• O13-O14: Chọn gói câu hỏi 40đ (10×4), 60đ (10×2, 20×2), 80đ (10, 20×2, 30).\n• O15-O19: Chọn gói 40đ (10, 10, 20), 60đ (10, 20, 30), 80đ (20, 30, 30).\n• O20-O21: Tự chọn 3 câu ở 3 mức điểm 10, 20, 30 điểm. Ngôi sao hy vọng (+2x / -1x).",
    cauHoiPhu:
      "• Câu hỏi 15s, bấm chuông giành quyền, đúng thắng ngay.",
  },
};

export default function OlympiaRulesWikipediaModal({
  open,
  onClose,
  initialSeason = "O26",
}: {
  open: boolean;
  onClose: () => void;
  initialSeason?: RulesetId;
}) {
  const [selectedSeason, setSelectedSeason] = useState<string>(() => {
    if (initialSeason === "O24" || initialSeason === "O25") return "O24-25";
    if (initialSeason === "O23") return "O23";
    if (initialSeason === "O22") return "O22";
    if (["O13", "O14", "O15", "O16", "O17", "O18", "O19", "O20", "O21"].includes(initialSeason)) return "O13-21";
    return "O26";
  });

  if (!open) return null;

  const rule = WIKIPEDIA_RULES[selectedSeason] || WIKIPEDIA_RULES["O26"];

  return (
    <div className="fixed inset-0 z-[160] flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-4xl max-h-[90vh] bg-[#0c1222] border border-sky-500/30 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-white animate-scaleUp">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-white/10 bg-gradient-to-r from-sky-950/80 to-indigo-950/80 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">📖</span>
            <div>
              <h2 className="text-lg font-black text-sky-300">Chi Tiết Luật Thi Đường Lên Đỉnh Olympia</h2>
              <p className="text-xs text-slate-300">Tài liệu tra cứu quy chế chính thức theo từng thời kỳ (Chuẩn Wikipedia)</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition"
          >
            ✕
          </button>
        </div>

        {/* Season Selector Tabs */}
        <div className="flex items-center gap-1.5 p-3 bg-black/30 border-b border-white/10 overflow-x-auto text-xs font-bold">
          <span className="text-slate-400 shrink-0 mr-1">Mùa giải:</span>
          {Object.entries(WIKIPEDIA_RULES).map(([key, item]) => {
            const active = selectedSeason === key;
            return (
              <button
                key={key}
                onClick={() => setSelectedSeason(key)}
                className={`px-3 py-1.5 rounded-xl border transition whitespace-nowrap ${
                  active
                    ? "bg-sky-500 text-slate-950 border-sky-400 font-black shadow-md shadow-sky-500/20"
                    : "bg-white/5 border-white/10 text-slate-300 hover:bg-white/10"
                }`}
              >
                {item.season}
              </button>
            );
          })}
        </div>

        {/* Body: 5 Rounds Rule Cards */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 text-xs sm:text-sm">
          {/* Khởi Động */}
          <div className="p-4 rounded-xl bg-gradient-to-br from-amber-500/10 to-orange-500/5 border border-amber-500/20 space-y-2">
            <div className="flex items-center gap-2 font-black text-amber-300 text-sm sm:text-base">
              <span>🏃</span>
              <span>1. Phần Thi Khởi Động</span>
            </div>
            <p className="text-slate-200 whitespace-pre-line leading-relaxed font-normal">
              {rule.khoiDong}
            </p>
          </div>

          {/* Vượt Chướng Ngại Vật */}
          <div className="p-4 rounded-xl bg-gradient-to-br from-cyan-500/10 to-blue-500/5 border border-cyan-500/20 space-y-2">
            <div className="flex items-center gap-2 font-black text-cyan-300 text-sm sm:text-base">
              <span>🧩</span>
              <span>2. Phần Thi Vượt Chướng Ngại Vật</span>
            </div>
            <p className="text-slate-200 whitespace-pre-line leading-relaxed font-normal">
              {rule.vcnv}
            </p>
          </div>

          {/* Tăng Tốc */}
          <div className="p-4 rounded-xl bg-gradient-to-br from-purple-500/10 to-pink-500/5 border border-purple-500/20 space-y-2">
            <div className="flex items-center gap-2 font-black text-purple-300 text-sm sm:text-base">
              <span>⚡</span>
              <span>3. Phần Thi Tăng Tốc</span>
            </div>
            <p className="text-slate-200 whitespace-pre-line leading-relaxed font-normal">
              {rule.tangToc}
            </p>
          </div>

          {/* Về Đích */}
          <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-500/10 to-teal-500/5 border border-emerald-500/20 space-y-2">
            <div className="flex items-center gap-2 font-black text-emerald-300 text-sm sm:text-base">
              <span>🏁</span>
              <span>4. Phần Thi Về Đích</span>
            </div>
            <p className="text-slate-200 whitespace-pre-line leading-relaxed font-normal">
              {rule.veDich}
            </p>
          </div>

          {/* Câu Hỏi Phụ */}
          <div className="p-4 rounded-xl bg-gradient-to-br from-rose-500/10 to-red-500/5 border border-rose-500/20 space-y-2">
            <div className="flex items-center gap-2 font-black text-rose-300 text-sm sm:text-base">
              <span>❓</span>
              <span>5. Phần Thi Câu Hỏi Phụ</span>
            </div>
            <p className="text-slate-200 whitespace-pre-line leading-relaxed font-normal">
              {rule.cauHoiPhu}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3.5 border-t border-white/10 bg-black/40 flex items-center justify-between text-xs text-slate-400">
          <span>📚 Nguồn: Bách khoa toàn thư mở Wikipedia & Luật thi Đường lên đỉnh Olympia chính thức.</span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold transition shadow"
          >
            Đã hiểu & Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
