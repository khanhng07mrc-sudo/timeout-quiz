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
  const displayScore = myTeam ? myTeam.score : (me?.score ?? 0);
  const displayName = myTeam ? myTeam.name : (me?.name ?? "Bạn");

  const sorted = roomState.teamMode === "TEAM"
    ? [...roomState.teams].sort((a, b) => b.score - a.score)
    : [...roomState.players].sort((a, b) => b.score - a.score);

  const myRank = sorted.findIndex((e) => e.id === (myTeam?.id ?? me?.id)) + 1;

  return (
    <div className="glass rounded-xl p-3 flex items-center gap-4">
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground">Bạn đang chơi</p>
        <p className="font-bold truncate">{displayName}</p>
      </div>
      <div className="text-center">
        <p className="text-xs text-muted-foreground">Xếp hạng</p>
        <p className="font-black text-lg text-purple-400">#{myRank || "-"}</p>
      </div>
      <div className="text-center">
        <p className="text-xs text-muted-foreground">Điểm</p>
        <p className="font-black text-lg text-cyan-400">{displayScore.toLocaleString()}</p>
      </div>
    </div>
  );
}
