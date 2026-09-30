"use client";

import { RoomState } from "@/types";

interface Props {
  roomState: RoomState;
  playerId: string;
}

export default function PlayerLobby({ roomState, playerId }: Props) {
  const me = roomState.players.find((p) => p.id === playerId);
  const myTeam = me?.teamId ? roomState.teams.find((t) => t.id === me.teamId) : null;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-black bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
          {roomState.name}
        </h1>
        <p className="text-muted-foreground mt-2">Đang chờ chủ phòng bắt đầu...</p>
      </div>

      {myTeam && (
        <div className="glass rounded-xl px-6 py-4 mb-6 text-center">
          <p className="text-sm text-muted-foreground">Bạn đang ở đội</p>
          <p className="text-xl font-bold mt-1" style={{ color: myTeam.color }}>{myTeam.name}</p>
        </div>
      )}

      <div className="glass rounded-2xl p-6 w-full max-w-md">
        <h2 className="font-bold mb-4">👥 Người chơi ({roomState.players.length})</h2>
        <div className="grid grid-cols-2 gap-2">
          {roomState.players.slice(0, 20).map((p) => (
            <div key={p.id} className={`flex items-center gap-2 p-2 rounded-lg ${
              p.id === playerId ? "bg-purple-500/20 border border-purple-500/50" : "bg-muted/30"
            }`}>
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-cyan-500 flex items-center justify-center text-sm font-bold shrink-0">
                {p.name.charAt(0).toUpperCase()}
              </div>
              <span className="text-sm truncate">{p.name}{p.id === playerId ? " (bạn)" : ""}</span>
            </div>
          ))}
        </div>
        {roomState.players.length > 20 && (
          <p className="text-muted-foreground text-sm mt-2 text-center">+{roomState.players.length - 20} người khác</p>
        )}
      </div>

      <div className="mt-6 flex items-center gap-2 text-muted-foreground text-sm">
        <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
        Kết nối thành công · Mã phòng: <span className="font-mono font-bold text-foreground">{roomState.code}</span>
      </div>
    </div>
  );
}
