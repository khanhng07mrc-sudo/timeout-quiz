"use client";

import { useState } from "react";
import { RoomState, CARD_METADATA, CardType } from "@/types";
import PowerupIcon from "@/components/ui/PowerupIcon";

interface Props {
  roomState: RoomState;
  playerId: string;
  onUse: (cardId: string, targetTeamId?: string) => void;
  disabled?: boolean;
  disabledReason?: string;
  activeCardTypes?: CardType[];
  isSharedLocked?: boolean;
  sharedLockedTeamName?: string;
}

interface ActiveCardToConfirm {
  cardId: string;
  type: CardType;
  source: "team" | "shared";
}

export default function PowerupBar({
  roomState,
  playerId,
  onUse,
  disabled,
  disabledReason,
  activeCardTypes,
  isSharedLocked,
  sharedLockedTeamName,
}: Props) {
  const [confirmingCard, setConfirmingCard] = useState<ActiveCardToConfirm | null>(null);
  const [selectedTargetTeamId, setSelectedTargetTeamId] = useState<string | null>(null);

  const me = roomState.players.find((p) => p.id === playerId);
  const myTeam = me?.teamId ? roomState.teams.find((t) => t.id === me.teamId) : null;

  // Prioritize team's own cards (up to 3 cards max hand size)
  const myCards = myTeam ? myTeam.cards.filter((c) => !c.used) : [];
  const sharedCards = roomState.sharedCards.filter((c) => !c.used);

  // If team has cards, show team cards (up to 3). If individual or empty team hand, show shared cards (up to 3)
  const availableCards = (myCards.length > 0
    ? myCards.slice(0, 3).map((c) => ({ ...c, source: "team" as const }))
    : sharedCards.slice(0, 3).map((c) => ({ ...c, source: "shared" as const }))
  );

  if (availableCards.length === 0) return null;

  const handleCardClick = (card: { id: string; type: CardType; source: "team" | "shared" }) => {
    if (disabled) return;
    setConfirmingCard({ cardId: card.id, type: card.type, source: card.source });
    setSelectedTargetTeamId(null);
  };

  const handleConfirmUse = () => {
    if (disabled || !confirmingCard) return;
    const meta = CARD_METADATA[confirmingCard.type];
    if (meta.requiresTarget && !selectedTargetTeamId) {
      alert("Vui lòng chọn đội mục tiêu trước khi kích hoạt thẻ này!");
      return;
    }

    onUse(confirmingCard.cardId, selectedTargetTeamId ?? undefined);
    setConfirmingCard(null);
    setSelectedTargetTeamId(null);
  };

  const activeMeta = confirmingCard ? CARD_METADATA[confirmingCard.type] : null;

  return (
    <div className={`glass rounded-2xl p-4 border transition-all ${disabled ? "border-amber-500/30 opacity-75" : "border-purple-500/20 shadow-lg"}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">🃏</span>
          <h3 className="text-sm font-bold text-foreground">
            Thẻ hỗ trợ của đội
          </h3>
          <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
            {availableCards.length}/3 thẻ
          </span>
        </div>
        <span className="text-xs text-muted-foreground hidden sm:inline">
          {disabled ? "Đang tạm khóa" : "Nhấn vào thẻ để xem tính năng & xác nhận dùng"}
        </span>
      </div>

      {disabled && (
        <div className="mb-3 px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-semibold flex items-center gap-2 animate-fadeIn">
          <span className="text-base">🚫</span>
          <span>{disabledReason || "Toàn bộ thẻ hỗ trợ (power-up) bị vô hiệu hoá trong lượt cướp điểm"}</span>
        </div>
      )}

      {isSharedLocked && (
        <div className="mb-3 px-3 py-2 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-200 text-xs font-semibold flex items-center gap-2 animate-fadeIn">
          <span className="text-base">🔒</span>
          <span>
            {sharedLockedTeamName
              ? `Đội ${sharedLockedTeamName} đã kích hoạt thẻ dùng chung câu này! Các thẻ dùng riêng vẫn hoạt động bình thường.`
              : "Đã có đội kích hoạt thẻ dùng chung ở câu hỏi này! Các thẻ dùng riêng vẫn hoạt động bình thường."}
          </span>
        </div>
      )}

      {/* Confirmation & Function Detail Modal */}
      {confirmingCard && activeMeta && (
        <div
          className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setConfirmingCard(null)}
        >
          <div
            className="glass rounded-2xl p-6 w-full max-w-md border border-purple-500/40 shadow-2xl relative space-y-5 animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-start gap-4">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-inner shrink-0 p-2"
                style={{ background: `${activeMeta.color}25`, border: `2px solid ${activeMeta.color}60` }}
              >
                <PowerupIcon type={confirmingCard.type} className="w-12 h-12 drop-shadow" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <h3 className="text-xl font-black text-foreground">{activeMeta.nameVi}</h3>
                  <span
                    className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider"
                    style={{ background: `${activeMeta.color}25`, color: activeMeta.color }}
                  >
                    {activeMeta.tag}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wider ${
                      activeMeta.scope === "GLOBAL"
                        ? "bg-purple-500/25 text-purple-300 border border-purple-500/40"
                        : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                    }`}
                  >
                    {activeMeta.scope === "GLOBAL" ? "🌐 Thẻ Dùng Chung" : "👤 Thẻ Dùng Riêng"}
                  </span>
                </div>
                <p className="text-xs font-semibold text-purple-300">{activeMeta.summaryVi}</p>
              </div>
              <button
                onClick={() => setConfirmingCard(null)}
                className="text-muted-foreground hover:text-foreground text-xl p-1 rounded-lg hover:bg-card transition-colors"
                title="Đóng"
              >
                ✕
              </button>
            </div>

            {/* Function Detailed Explanation */}
            <div className="bg-card/60 rounded-xl p-3.5 border border-border/60 text-sm leading-relaxed text-foreground/90">
              <p className="font-semibold text-xs text-muted-foreground mb-1 uppercase tracking-wider">
                💡 Công dụng chi tiết (Function):
              </p>
              <p>{activeMeta.detailVi}</p>
            </div>

            {/* Lockout Notice for Shared Cards */}
            {activeMeta.scope === "GLOBAL" && isSharedLocked && (
              <div className="p-3 rounded-xl bg-destructive/15 border border-destructive/40 text-destructive text-xs font-bold flex items-center gap-2">
                <span>🔒</span>
                <span>Thẻ dùng chung đã được một đội kích hoạt trong câu hỏi này! Thẻ này chỉ có thể sử dụng ở các câu hỏi tiếp theo.</span>
              </div>
            )}

            {/* Reward & Risk Mechanism */}
            {(activeMeta.correctEffectVi || activeMeta.wrongEffectVi) && (
              <div className="grid grid-cols-2 gap-2 text-xs">
                {activeMeta.correctEffectVi && (
                  <div className="rounded-xl p-2.5 bg-green-500/10 border border-green-500/30">
                    <p className="font-bold text-green-400 mb-0.5">✓ Khi Đúng</p>
                    <p className="text-foreground/85">{activeMeta.correctEffectVi}</p>
                  </div>
                )}
                {activeMeta.wrongEffectVi && (
                  <div className={`rounded-xl p-2.5 ${activeMeta.wrongEffectVi.includes("Không") || activeMeta.wrongEffectVi.includes("Miễn") ? "bg-cyan-500/10 border border-cyan-500/30" : "bg-destructive/10 border border-destructive/30"}`}>
                    <p className={`font-bold mb-0.5 ${activeMeta.wrongEffectVi.includes("Không") || activeMeta.wrongEffectVi.includes("Miễn") ? "text-cyan-400" : "text-destructive"}`}>
                      {activeMeta.wrongEffectVi.includes("Không") || activeMeta.wrongEffectVi.includes("Miễn") ? "🛡️ Khi Sai (Bảo vệ)" : "💥 Khi Sai (Rủi ro)"}
                    </p>
                    <p className="text-foreground/85">{activeMeta.wrongEffectVi}</p>
                  </div>
                )}
              </div>
            )}

            {/* Target Team Selection (if required) */}
            {activeMeta.requiresTarget && (
              <div className="space-y-2">
                <p className="text-xs font-bold text-yellow-400 flex items-center gap-1.5">
                  <span>🎯</span>
                  <span>Chọn 1 đội đối thủ làm mục tiêu:</span>
                </p>
                <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
                  {roomState.teams
                    .filter((t) => t.id !== myTeam?.id && !t.isEliminated)
                    .map((t) => {
                      const isSelected = selectedTargetTeamId === t.id;
                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => setSelectedTargetTeamId(t.id)}
                          className={`w-full flex items-center gap-3 p-2.5 rounded-xl border transition-all text-left ${
                            isSelected
                              ? "border-purple-500 bg-purple-500/25 ring-2 ring-purple-500/50"
                              : "border-border/60 hover:border-purple-400/60 bg-muted/20"
                          }`}
                        >
                          <div className="w-6 h-6 rounded-full shrink-0" style={{ background: t.color }} />
                          <span className="font-semibold text-sm flex-1 truncate">{t.name}</span>
                          <span className="text-xs font-bold text-cyan-400">{t.score} pts</span>
                          <span className={`w-4 h-4 rounded-full border flex items-center justify-center text-[10px] ${isSelected ? "border-purple-400 bg-purple-500 text-white" : "border-border"}`}>
                            {isSelected && "✓"}
                          </span>
                        </button>
                      );
                    })}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setConfirmingCard(null)}
                className="flex-1 py-3 rounded-xl border border-border hover:bg-card text-muted-foreground hover:text-foreground font-semibold text-sm transition-colors"
              >
                ✕ Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleConfirmUse}
                disabled={Boolean((activeMeta.requiresTarget && !selectedTargetTeamId) || (activeMeta.scope === "GLOBAL" && isSharedLocked))}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 font-bold text-sm text-white shadow-lg shadow-purple-600/30 transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98]"
              >
                {activeMeta.scope === "GLOBAL" && isSharedLocked ? "🔒 Đã khóa câu này" : "⚡ Xác nhận dùng thẻ"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cards List (Max 3 on hand) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {availableCards.map((card) => {
          const meta = CARD_METADATA[card.type];
          const isGlobalCard = meta.scope === "GLOBAL";
          const isSharedLockedCard = isGlobalCard && isSharedLocked;

          const isMutexDisabled =
            (card.type === "SHIELD" && activeCardTypes?.some((t) => t === "SCORE_X2" || t === "DOUBLE")) ||
            ((card.type === "SCORE_X2" || card.type === "DOUBLE") && activeCardTypes?.some((t) => t === "SHIELD")) ||
            (roomState.mode === "BUZZ" && card.type === "FIFTY_FIFTY") ||
            (roomState.mode === "WAGER" && (card.type === "STEAL" || card.type === "FREEZE"));

          const isCardDisabled = Boolean(disabled || isMutexDisabled || isSharedLockedCard);
          const badgeText =
            isSharedLockedCard
              ? "🔒 Đã có đội bật câu này!"
              : card.type === "SHIELD" && activeCardTypes?.some((t) => t === "SCORE_X2" || t === "DOUBLE")
              ? "Cấm dùng cùng x2"
              : (card.type === "SCORE_X2" || card.type === "DOUBLE") && activeCardTypes?.some((t) => t === "SHIELD")
              ? "Cấm dùng cùng Khiên"
              : roomState.mode === "BUZZ" && card.type === "FIFTY_FIFTY"
              ? "Không khả dụng"
              : roomState.mode === "WAGER" && (card.type === "STEAL" || card.type === "FREEZE")
              ? "Bị cấm"
              : null;

          return (
            <button
              key={card.id}
              disabled={isCardDisabled}
              onClick={() => handleCardClick(card)}
              className={`flex items-center sm:flex-col sm:items-start p-3 rounded-xl border transition-all text-left relative overflow-hidden bg-card/40 ${
                isCardDisabled
                  ? "border-border/40 opacity-40 cursor-not-allowed"
                  : "border-border/70 hover:border-purple-500 hover:bg-purple-500/10 active:scale-[0.98] group hover:shadow-md cursor-pointer"
              }`}
            >
              <div className="flex items-center gap-2.5 sm:mb-2 w-full">
                <div className="w-10 h-10 sm:w-11 sm:h-11 shrink-0 group-hover:scale-110 transition-transform">
                  <PowerupIcon type={card.type} className="w-full h-full drop-shadow" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-sm text-foreground truncate">{meta.nameVi}</span>
                  </div>
                  <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                    <span
                      className="inline-block px-1.5 py-0.2 rounded text-[10px] font-bold uppercase tracking-wider"
                      style={{ background: badgeText ? "#ef444425" : `${meta.color}25`, color: badgeText ? "#f87171" : meta.color }}
                    >
                      {badgeText || meta.tag}
                    </span>
                    <span
                      className={`inline-block px-1.5 py-0.2 rounded text-[9px] font-bold tracking-wider ${
                        isGlobalCard
                          ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                          : "bg-emerald-500/15 text-emerald-400 border border-emerald-500/25"
                      }`}
                    >
                      {isGlobalCard ? "🌐 Dùng chung" : "👤 Riêng"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Summary line */}
              <div className="hidden sm:block text-xs text-muted-foreground group-hover:text-foreground/90 transition-colors mt-0.5 line-clamp-1 w-full">
                {badgeText ? `Không thể dùng: ${badgeText}` : meta.summaryVi}
              </div>

              <div className="ml-auto sm:hidden shrink-0 text-xs font-bold text-purple-400">
                {isCardDisabled ? "Khóa" : "Dùng ›"}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
