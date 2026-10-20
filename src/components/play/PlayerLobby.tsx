"use client";

import { useState } from "react";
import { RoomState } from "@/types";
import GameModeRulesModal from "@/components/ui/GameModeRulesModal";
import { formatRoomTitle } from "@/lib/game-engine/game-modes-meta";

interface Props {
  roomState: RoomState;
  playerId: string;
  selectedTeamId?: string | null;
  onSelectTeam?: (teamId: string) => void;
  errorMessage?: string | null;
}

export default function PlayerLobby({ roomState, playerId, selectedTeamId, onSelectTeam, errorMessage }: Props) {
  const [showRulesModal, setShowRulesModal] = useState(false);
  const me = roomState.players.find((p) => p.id === playerId);
  const effectiveTeamId = selectedTeamId || me?.teamId || null;
  const myTeam = effectiveTeamId ? roomState.teams.find((t) => t.id === effectiveTeamId) : null;
  const isTeamMode = roomState.teamMode === "TEAM";

  const { mainTitle, badgeText } = formatRoomTitle(roomState?.name, roomState?.mode);

  return (
    <div className="h-screen max-h-screen overflow-hidden flex flex-col p-3 sm:p-4 max-w-lg mx-auto w-full animate-loaded-reveal">
      {/* Top Header: Title, Mode Pill, Rules Button */}
      <div className="shrink-0 pb-2.5 border-b border-white/10 mb-2.5">
        {errorMessage && (
          <div className="w-full mb-2 p-2 rounded-xl bg-red-600/90 text-white font-bold text-xs text-center animate-bounce-in shadow border border-red-400">
            ⚠️ {errorMessage}
          </div>
        )}

        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold tracking-wider bg-purple-500/20 text-cyan-300 border border-cyan-400/30 shrink-0">
              {badgeText}
            </span>
            <h1 className="text-base sm:text-lg font-black bg-gradient-to-r from-purple-300 via-pink-300 to-cyan-300 bg-clip-text text-transparent truncate">
              {mainTitle}
            </h1>
          </div>

          <button
            type="button"
            onClick={() => setShowRulesModal(true)}
            className="px-2.5 py-1 rounded-xl text-xs font-bold glass hover:bg-white/10 border border-white/20 text-cyan-300 hover:text-white flex items-center gap-1 shrink-0 transition cursor-pointer"
          >
            <span>📖</span>
            <span>Thể lệ</span>
          </button>
        </div>
      </div>

      {/* Identity / Team Status Banner (Compact) */}
      <div className="shrink-0 mb-2.5">
        {isTeamMode ? (
          myTeam ? (
            <div
              className="glass rounded-xl p-2.5 flex items-center justify-between border shadow animate-slide-up"
              style={{ borderColor: myTeam.color }}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center font-black text-white text-xs shrink-0 shadow"
                  style={{ background: myTeam.color }}
                >
                  {myTeam.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] uppercase font-bold text-slate-400">Đội của bạn</p>
                  <p className="font-black text-sm truncate" style={{ color: myTeam.color }}>
                    {myTeam.name}
                  </p>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-500/20 text-green-300 border border-green-500/40 shrink-0">
                ✓ Đã sẵn sàng
              </span>
            </div>
          ) : (
            <div className="rounded-xl p-2.5 bg-amber-500/15 border border-amber-500/40 flex items-center justify-between gap-2 animate-pulse">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-lg shrink-0">⚠️</span>
                <span className="text-xs font-bold text-amber-200 truncate">
                  Bạn chưa chọn đội! Vui lòng chọn bên dưới:
                </span>
              </div>
            </div>
          )
        ) : (
          <div className="glass rounded-xl p-2.5 flex items-center justify-between border border-cyan-500/30">
            <span className="text-xs text-slate-300 font-semibold">Chế độ thi đấu cá nhân</span>
            <span className="text-xs font-mono font-bold text-cyan-300">{me?.name || "Thí sinh"}</span>
          </div>
        )}
      </div>

      {/* Middle Section: Scrollable Teams / Players list only */}
      <div className="flex-1 min-h-0 overflow-y-auto space-y-2 pr-1 scrollbar-thin">
        {isTeamMode ? (
          <>
            <div className="flex items-center justify-between text-xs text-slate-400 font-semibold px-1">
              <span>Danh sách các đội ({roomState.teams.length})</span>
              <span>Tổng thí sinh: {roomState.players.length}</span>
            </div>

            {roomState.teams.map((team) => {
              const isMyTeam = myTeam?.id === team.id;
              const members = roomState.players.filter((p) => p.teamId === team.id || (p.id === playerId && effectiveTeamId === team.id));

              return (
                <div
                  key={team.id}
                  className={`glass rounded-2xl p-3 border transition-all ${
                    isMyTeam
                      ? "border-green-400 bg-green-500/10 shadow-md"
                      : "border-white/10 hover:border-purple-500/40"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center font-black text-white text-xs shrink-0 shadow"
                        style={{ background: team.color }}
                      >
                        {team.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-black text-sm truncate text-white">{team.name}</span>
                    </div>

                    {isMyTeam ? (
                      <span className="px-2.5 py-1 rounded-xl text-xs font-bold bg-green-500/25 text-green-300 border border-green-500/40 shrink-0">
                        ✓ Đội của bạn
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onSelectTeam?.(team.id)}
                        className="px-3 py-1 rounded-xl text-xs font-bold bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white shadow shrink-0 cursor-pointer active:scale-95 transition"
                      >
                        {myTeam ? "Chuyển sang" : "Vào đội"}
                      </button>
                    )}
                  </div>

                  {/* Members list */}
                  <div className="flex flex-wrap gap-1 min-h-[22px]">
                    {members.length > 0 ? (
                      members.map((m) => (
                        <span
                          key={m.id}
                          className={`px-2 py-0.5 rounded text-[11px] font-medium ${
                            m.id === playerId
                              ? "bg-purple-600 text-white font-bold ring-1 ring-purple-400"
                              : "bg-white/10 text-slate-200"
                          }`}
                        >
                          {m.name}
                          {m.id === playerId ? " (bạn)" : ""}
                        </span>
                      ))
                    ) : (
                      <span className="text-[11px] text-slate-400 italic">Chưa có ai</span>
                    )}
                  </div>
                </div>
              );
            })}
          </>
        ) : (
          <div className="space-y-2">
            <p className="text-xs text-slate-400 font-semibold px-1">
              Thí sinh tham gia ({roomState.players.length})
            </p>
            <div className="grid grid-cols-2 gap-2">
              {roomState.players.map((p) => (
                <div
                  key={p.id}
                  className={`flex items-center gap-2 p-2 rounded-xl border ${
                    p.id === playerId
                      ? "bg-purple-600/20 border-purple-400 text-white"
                      : "glass border-white/10 text-slate-200"
                  }`}
                >
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-500 to-cyan-500 flex items-center justify-center text-xs font-bold shrink-0 text-white">
                    {p.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-xs truncate font-medium">
                    {p.name}
                    {p.id === playerId ? " (bạn)" : ""}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer Fixed Bar */}
      <div className="shrink-0 pt-2.5 border-t border-white/10 flex items-center justify-between text-xs text-slate-400">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span>Sảnh chờ</span>
        </div>
        <div>
          Mã phòng: <span className="font-mono font-bold text-cyan-300">{roomState.code}</span>
        </div>
      </div>

      {/* Rules Modal */}
      <GameModeRulesModal
        mode={roomState.mode}
        isOpen={showRulesModal}
        onClose={() => setShowRulesModal(false)}
      />
    </div>
  );
}
