"use client";

import { RoomState } from "@/types";

interface Props {
  roomState: RoomState;
  playerId: string;
  onSelectTeam?: (teamId: string) => void;
}

export default function PlayerLobby({ roomState, playerId, onSelectTeam }: Props) {
  const me = roomState.players.find((p) => p.id === playerId);
  const myTeam = me?.teamId ? roomState.teams.find((t) => t.id === me.teamId) : null;
  const isTeamMode = roomState.teamMode === "TEAM";

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-6 max-w-4xl mx-auto w-full">
      {/* Header */}
      <div className="text-center mb-6">
        <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/30">
          Chế độ: {isTeamMode ? "Đấu Đội (Team Mode)" : "Cá Nhân (Individual)"}
        </span>
        <h1 className="text-3xl sm:text-5xl font-black bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent mt-2">
          {roomState.name}
        </h1>
        <p className="text-muted-foreground text-sm mt-1">Đang chờ chủ phòng bắt đầu trận đấu...</p>
      </div>

      {isTeamMode ? (
        <div className="w-full space-y-6">
          {/* Status banner */}
          {myTeam ? (
            <div
              className="glass rounded-2xl p-4 sm:p-5 text-center border-2 shadow-lg animate-slide-up"
              style={{ borderColor: myTeam.color }}
            >
              <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Đội hiện tại của bạn</p>
              <div className="flex items-center justify-center gap-3 mt-1.5">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-white text-sm"
                  style={{ background: myTeam.color }}
                >
                  {myTeam.name.charAt(0).toUpperCase()}
                </div>
                <h2 className="text-2xl sm:text-3xl font-black" style={{ color: myTeam.color }}>
                  {myTeam.name}
                </h2>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Bạn đã sẵn sàng! Bạn có thể đổi sang đội khác bên dưới nếu muốn trước khi bắt đầu.
              </p>
            </div>
          ) : (
            <div className="rounded-2xl p-4 sm:p-5 bg-yellow-500/10 border-2 border-yellow-500/40 text-center animate-pulse">
              <span className="text-2xl">⚠️</span>
              <h2 className="text-lg font-black text-yellow-300 mt-1">Bạn chưa chọn đội!</h2>
              <p className="text-sm text-yellow-200/80 mt-0.5">
                Vui lòng bấm nút <strong>&quot;Vào đội này&quot;</strong> ở danh sách các đội bên dưới để tham gia thi đấu:
              </p>
            </div>
          )}

          {/* Teams list */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base sm:text-lg flex items-center gap-2">
                <span>🛡️ Chọn đội thi đấu ({roomState.teams.length} đội)</span>
              </h3>
              <span className="text-xs text-muted-foreground">
                Tổng thí sinh: {roomState.players.length}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {roomState.teams.map((team) => {
                const isMyTeam = myTeam?.id === team.id;
                const members = roomState.players.filter((p) => p.teamId === team.id);

                return (
                  <div
                    key={team.id}
                    className={`glass rounded-2xl p-4 flex flex-col justify-between transition-all duration-200 border-2 ${
                      isMyTeam
                        ? "border-green-400 bg-green-500/10 shadow-lg glow-purple"
                        : "border-border hover:border-purple-500/50"
                    }`}
                  >
                    <div>
                      {/* Team title */}
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-white text-sm shrink-0 shadow"
                            style={{ background: team.color }}
                          >
                            {team.name.charAt(0).toUpperCase()}
                          </div>
                          <span className="font-bold text-base truncate">{team.name}</span>
                        </div>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-muted/80 text-foreground font-semibold shrink-0">
                          {members.length} người
                        </span>
                      </div>

                      {/* Members list */}
                      <div className="mb-4">
                        <p className="text-[11px] font-semibold text-muted-foreground mb-1.5">Thành viên:</p>
                        <div className="flex flex-wrap gap-1.5 min-h-[30px]">
                          {members.length > 0 ? (
                            members.map((m) => (
                              <span
                                key={m.id}
                                className={`px-2 py-0.5 rounded-md text-xs font-medium ${
                                  m.id === playerId
                                    ? "bg-purple-600 text-white font-bold ring-1 ring-purple-400"
                                    : "bg-muted/70 text-foreground"
                                }`}
                              >
                                {m.name}
                                {m.id === playerId ? " (bạn)" : ""}
                              </span>
                            ))
                          ) : (
                            <span className="text-xs text-muted-foreground italic">Chưa có ai</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Join / Switch Button */}
                    <div className="pt-2 border-t border-border/40">
                      {isMyTeam ? (
                        <button
                          disabled
                          className="w-full py-2.5 rounded-xl font-bold text-sm bg-green-500/20 text-green-300 border border-green-500/40 cursor-default flex items-center justify-center gap-1.5"
                        >
                          <span>✓</span> Đội của bạn
                        </button>
                      ) : (
                        <button
                          onClick={() => onSelectTeam?.(team.id)}
                          className="w-full py-2.5 rounded-xl font-bold text-sm bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white shadow transition-all active:scale-95 cursor-pointer"
                        >
                          {myTeam ? "Chuyển sang đội này" : "👉 Vào đội này"}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Unassigned players notice */}
          {(() => {
            const unassigned = roomState.players.filter((p) => !p.teamId);
            if (unassigned.length === 0) return null;
            return (
              <div className="glass rounded-xl p-3.5 text-xs text-muted-foreground flex items-center justify-between gap-2">
                <span>
                  <strong>Chưa chọn đội ({unassigned.length}):</strong>{" "}
                  {unassigned.map((p) => (p.id === playerId ? `${p.name} (bạn)` : p.name)).join(", ")}
                </span>
                <span className="text-[11px] text-yellow-400 font-medium shrink-0">
                  Hãy bấm chọn 1 đội ở trên
                </span>
              </div>
            );
          })()}
        </div>
      ) : (
        /* Individual Mode */
        <div className="glass rounded-2xl p-6 w-full max-w-md">
          <h2 className="font-bold mb-4">👥 Thí sinh tham gia ({roomState.players.length})</h2>
          <div className="grid grid-cols-2 gap-2">
            {roomState.players.slice(0, 20).map((p) => (
              <div
                key={p.id}
                className={`flex items-center gap-2 p-2 rounded-lg ${
                  p.id === playerId ? "bg-purple-500/20 border border-purple-500/50" : "bg-muted/30"
                }`}
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-cyan-500 flex items-center justify-center text-sm font-bold shrink-0 text-white">
                  {p.name.charAt(0).toUpperCase()}
                </div>
                <span className="text-sm truncate">
                  {p.name}
                  {p.id === playerId ? " (bạn)" : ""}
                </span>
              </div>
            ))}
          </div>
          {roomState.players.length > 20 && (
            <p className="text-muted-foreground text-sm mt-2 text-center">
              +{roomState.players.length - 20} người khác
            </p>
          )}
        </div>
      )}

      {/* Footer PIN */}
      <div className="mt-8 flex items-center gap-2 text-muted-foreground text-sm">
        <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
        Kết nối thành công · Mã phòng: <span className="font-mono font-bold text-foreground">{roomState.code}</span>
      </div>
    </div>
  );
}
