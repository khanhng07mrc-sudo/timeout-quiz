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
  ELIMINATION: "Đấu trường Sinh tồn",
  TOURNAMENT: "Đấu loại 1v1",
  GRID_CARO: "Chọn ô & Caro",
  DICE_RACE: "Đua cờ Xí ngầu",
  WAGER: "Cược điểm Bí mật",
};

export default function GameModeRulesModal({ mode = "CLASSIC", isOpen, onClose }: Props) {
  const [selectedMode, setSelectedMode] = useState<GameMode>(mode);

  if (!isOpen) return null;

  const currentMode = selectedMode || mode || "CLASSIC";
  const rule = MODE_RULES[currentMode] || MODE_RULES.CLASSIC;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl max-h-[90vh] glass rounded-3xl border border-white/20 p-6 flex flex-col gap-5 overflow-hidden shadow-2xl animate-scale-up bg-[#121324]/95 text-white"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-2xl bg-white/5 border border-white/10 shadow-inner shrink-0">
              <GameModeIcon mode={currentMode} className="w-10 h-10 drop-shadow" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-black bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
                  {rule.nameVi}
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  {rule.mode}
                </span>
              </div>
              <p className="text-xs text-muted-foreground font-medium mt-0.5">
                {rule.taglineVi}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl glass hover:bg-white/10 flex items-center justify-center text-muted-foreground hover:text-white transition active:scale-95"
          >
            ✕
          </button>
        </div>

        {/* Mode Selector Tabs */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {(Object.keys(MODE_RULES) as GameMode[]).filter((m) => m !== "POWERUP").map((m) => {
            const r = MODE_RULES[m];
            const active = m === currentMode;
            return (
              <button
                key={m}
                onClick={() => setSelectedMode(m)}
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

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1 text-sm">
          {/* Summary Box */}
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-muted-foreground leading-relaxed">
            <p className="text-foreground font-medium">{rule.summaryVi}</p>
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

        {/* Footer */}
        <div className="border-t border-white/10 pt-3 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition active:scale-95 shadow-lg"
          >
            Đã hiểu luật chơi ✓
          </button>
        </div>
      </div>
    </div>
  );
}
