"use client";

import { useState } from "react";
import { RoomState, CARD_METADATA } from "@/types";

interface Props {
  roomState: RoomState;
  playerId: string;
  onUse: (cardId: string, targetTeamId?: string) => void;
}

export default function PowerupBar({ roomState, playerId, onUse }: Props) {
  const [selecting, setSelecting] = useState<string | null>(null);

  const me = roomState.players.find((p) => p.id === playerId);
  const myTeam = me?.teamId ? roomState.teams.find((t) => t.id === me.teamId) : null;
  const myCards = myTeam ? myTeam.cards.filter((c) => !c.used) : [];
  const sharedCards = roomState.sharedCards.filter((c) => !c.used);

  const allCards = [
    ...myCards.map((c) => ({ ...c, source: "team" as const })),
    ...sharedCards.map((c) => ({ ...c, source: "shared" as const })),
  ];

  const targetRequiredCards = ["FREEZE", "ATTACK", "PENALTY"];

  const handleUse = (cardId: string, cardType: string) => {
    if (targetRequiredCards.includes(cardType)) {
      setSelecting(cardId);
    } else {
      onUse(cardId);
    }
  };

  const handleTargetSelect = (teamId: string) => {
    if (selecting) {
      onUse(selecting, teamId);
      setSelecting(null);
    }
  };

  if (allCards.length === 0) return null;

  return (
    <div className="glass rounded-2xl p-4">
      <h3 className="text-sm font-bold text-muted-foreground mb-3">🃏 Thẻ hỗ trợ</h3>

      {/* Target selection modal */}
      {selecting && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setSelecting(null)}>
          <div className="glass rounded-2xl p-6 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-bold mb-4">Chọn đội mục tiêu</h3>
            <div className="space-y-2">
              {roomState.teams
                .filter((t) => t.id !== myTeam?.id && !t.isEliminated)
                .map((t) => (
                  <button
                    key={t.id}
                    onClick={() => handleTargetSelect(t.id)}
                    className="w-full flex items-center gap-3 p-3 rounded-xl border border-border hover:border-purple-500 transition-colors"
                  >
                    <div className="w-8 h-8 rounded-full" style={{ background: t.color }} />
                    <span className="font-medium">{t.name}</span>
                    <span className="ml-auto text-cyan-400 font-bold">{t.score} pts</span>
                  </button>
                ))}
            </div>
            <button onClick={() => setSelecting(null)} className="mt-4 w-full py-2 text-muted-foreground hover:text-foreground">
              Hủy
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {allCards.map((card) => {
          const meta = CARD_METADATA[card.type];
          return (
            <button
              key={card.id}
              onClick={() => handleUse(card.id, card.type)}
              title={meta.descriptionVi}
              className="flex flex-col items-center gap-1 p-3 rounded-xl border border-border hover:border-purple-500 hover:bg-purple-500/10 transition-all active:scale-95 min-w-[70px]"
            >
              <span className="text-2xl">{meta.emoji}</span>
              <span className="text-xs font-medium">{meta.nameVi}</span>
              {card.source === "shared" && (
                <span className="text-[10px] text-cyan-400">Chung</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
