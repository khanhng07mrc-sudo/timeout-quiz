"use client";

import { GameMode, MODE_RULES } from "@/types";
import GameModeIcon from "@/components/ui/GameModeIcon";

interface Props {
  mode: GameMode;
  onOpenModal?: () => void;
  className?: string;
}

export default function GameModeRulesCard({ mode, onOpenModal, className = "" }: Props) {
  const rule = MODE_RULES[mode] || MODE_RULES.CLASSIC;

  return (
    <div className={`glass rounded-2xl p-4 border border-white/10 space-y-3 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <GameModeIcon mode={mode} className="w-7 h-7 shrink-0 drop-shadow" />
          <div>
            <h4 className="font-black text-sm text-foreground flex items-center gap-2">
              <span>{rule.nameVi}</span>
            </h4>
            <p className="text-[11px] text-muted-foreground">{rule.taglineVi}</p>
          </div>
        </div>
        {onOpenModal && (
          <button
            type="button"
            onClick={onOpenModal}
            className="px-2.5 py-1 rounded-lg text-xs font-bold glass hover:bg-white/10 border border-white/20 text-cyan-300 hover:text-white transition flex items-center gap-1 active:scale-95"
          >
            <span>📖</span>
            <span>Chi tiết luật</span>
          </button>
        )}
      </div>

      <p className="text-xs text-foreground/80 leading-relaxed bg-white/5 p-2.5 rounded-xl border border-white/5">
        {rule.summaryVi}
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
        <div className="space-y-1">
          <span className="font-bold text-cyan-400">🕹️ Cách chơi chính:</span>
          <p className="text-muted-foreground line-clamp-2">{rule.mechanicsVi[0]}</p>
        </div>
        <div className="space-y-1">
          <span className="font-bold text-amber-400">📊 Tính điểm:</span>
          <p className="text-muted-foreground line-clamp-2">{rule.scoringVi[0]}</p>
        </div>
      </div>
    </div>
  );
}
