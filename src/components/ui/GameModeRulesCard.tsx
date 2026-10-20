"use client";

import { GameMode } from "@/types";
import GameModeIcon from "@/components/ui/GameModeIcon";
import { MODE_DISPLAY_NAMES, MODE_RULES_SUMMARY } from "@/lib/game-engine/game-modes-meta";

interface Props {
  mode: GameMode;
  magicWheelEdition?: "VIETNAMESE" | "ENGLISH";
  onOpenModal?: () => void;
  className?: string;
}

export default function GameModeRulesCard({ mode, magicWheelEdition, onOpenModal, className = "" }: Props) {
  const modeKey = (mode || "CLASSIC").toUpperCase();
  const displayName = MODE_DISPLAY_NAMES[modeKey] || modeKey;
  let summary = MODE_RULES_SUMMARY[modeKey] || MODE_RULES_SUMMARY.CLASSIC;

  if (modeKey === "MAGIC_WHEEL" && magicWheelEdition === "ENGLISH") {
    summary = {
      objective: "Quay nón 24 ô, đoán phụ âm hoặc mua nguyên âm (250đ) để giải ô chữ tiếng Anh.",
      mechanism: "Quay chỉ đoán phụ âm; mua nguyên âm 250đ. Khi hết phụ âm báo No More Consonants. Đoán/giải sai chỉ mất lượt (không bị loại, giữ điểm vòng).",
      tip: "Chủ động giải ô chữ khi phụ âm đã mở hết. Vòng Đặc Biệt được mở sẵn R, S, T, L, N, E và chọn thêm 3 phụ âm + 1 nguyên âm.",
    };
  }

  return (
    <div className={`glass rounded-2xl p-4 sm:p-5 border border-white/10 space-y-3.5 bg-[#121428]/85 shadow-xl ${className}`}>
      {/* Header Mode Name & Open Modal Button */}
      <div className="flex items-center justify-between border-b border-white/10 pb-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-tr from-cyan-500/20 to-purple-600/20 border border-white/15 shadow-inner shrink-0">
            <GameModeIcon mode={modeKey} className="w-7 h-7 drop-shadow" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-black text-base sm:text-lg text-white">
                {displayName}
              </h4>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border ${
                modeKey === "MAGIC_WHEEL"
                  ? magicWheelEdition === "ENGLISH"
                    ? "bg-blue-500/20 text-cyan-300 border-cyan-400/50"
                    : "bg-red-500/20 text-amber-300 border-amber-400/50"
                  : "bg-cyan-500/15 text-cyan-300 border-cyan-500/30"
              }`}>
                {modeKey === "MAGIC_WHEEL"
                  ? magicWheelEdition === "ENGLISH"
                    ? "🇺🇸 LUẬT ANH (WOF)"
                    : "🇻🇳 LUẬT VIỆT (VTV3)"
                  : "LUẬT ĐẤU"}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium">
              Quy tắc thi đấu chính thức của đấu trường
            </p>
          </div>
        </div>

        {onOpenModal && (
          <button
            type="button"
            onClick={onOpenModal}
            className="px-3 py-1.5 rounded-xl text-xs font-bold glass hover:bg-white/15 border border-white/20 text-cyan-300 hover:text-white transition flex items-center gap-1.5 cursor-pointer active:scale-95 shadow-sm"
          >
            <span>📖</span>
            <span className="hidden sm:inline">Chi tiết luật</span>
          </button>
        )}
      </div>

      {/* 3 Điểm then chốt tinh gọn: Mục tiêu, Cơ chế, Mẹo */}
      <div className="space-y-2 text-xs">
        {/* 1. Mục tiêu */}
        <div className="flex items-start gap-2.5 p-2 rounded-xl bg-white/5 border border-white/5">
          <span className="text-sm shrink-0">🎯</span>
          <div>
            <span className="font-bold text-cyan-300 mr-1.5">Mục tiêu:</span>
            <span className="text-slate-200 leading-relaxed">{summary.objective}</span>
          </div>
        </div>

        {/* 2. Cơ chế */}
        <div className="flex items-start gap-2.5 p-2 rounded-xl bg-white/5 border border-white/5">
          <span className="text-sm shrink-0">⚡</span>
          <div>
            <span className="font-bold text-purple-300 mr-1.5">Cơ chế:</span>
            <span className="text-slate-200 leading-relaxed">{summary.mechanism}</span>
          </div>
        </div>

        {/* 3. Mẹo ghi điểm */}
        <div className="flex items-start gap-2.5 p-2 rounded-xl bg-white/5 border border-white/5">
          <span className="text-sm shrink-0">💡</span>
          <div>
            <span className="font-bold text-amber-300 mr-1.5">Mẹo thắng:</span>
            <span className="text-amber-100/90 leading-relaxed">{summary.tip}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
