"use client";

import { RoomState } from "@/types";

interface Props {
  roomState: RoomState | null;
  playerId: string;
}

export default function ScoreDisplay({ roomState, playerId }: Props) {
  if (!roomState) return null;

  const me = roomState.players.find((p) => p.id === playerId);
  const myTeam = me?.teamId ? roomState.teams.find((t) => t.id === me.teamId) : null;

  const sorted = roomState.teamMode === "TEAM"
    ? [...roomState.teams].sort((a, b) => b.score - a.score)
    : [...roomState.players].sort((a, b) => b.score - a.score);

  const myRank = sorted.findIndex((e) => e.id === (myTeam?.id ?? me?.id)) + 1;

  return (
    <div className="glass rounded-xl p-3 flex items-center justify-between gap-3">
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground">
          {roomState.teamMode === "TEAM" && myTeam ? "Thành viên đội" : "Người chơi"}
        </p>
        <p className="font-bold truncate text-sm">
          {me?.name ?? "Bạn"}
          {myTeam && (
            <span className="ml-1 text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: `${myTeam.color}30`, color: myTeam.color }}>
              {myTeam.name}
            </span>
          )}
        </p>
      </div>

      {myTeam && (
        <div className="text-center px-2">
          <p className="text-[10px] text-muted-foreground uppercase">Cá nhân (MVP)</p>
          <p className="font-bold text-sm text-yellow-400">{(me?.score ?? 0).toLocaleString()} <span className="text-[10px]">pts</span></p>
        </div>
      )}

      <div className="text-center px-2 border-l border-border/50">
        <p className="text-[10px] text-muted-foreground uppercase">{myTeam ? "Hạng đội" : "Xếp hạng"}</p>
        <p className="font-black text-base text-purple-400">#{myRank || "-"}</p>
      </div>

      <div className="text-center pl-2 border-l border-border/50">
        <p className="text-[10px] text-muted-foreground uppercase">{myTeam ? "Điểm đội" : "Điểm"}</p>
        <p className="font-black text-base text-cyan-400">{(myTeam ? myTeam.score : (me?.score ?? 0)).toLocaleString()}</p>
      </div>
    </div>
  );
}
