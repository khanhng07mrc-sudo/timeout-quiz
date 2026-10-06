"use client";

import { RoomState } from "@/types";

interface Props {
  roomState: RoomState | null;
  playerId: string;
  teamId?: string;
  overridePlayerName?: string;
}

export default function ScoreDisplay({ roomState, playerId, teamId, overridePlayerName }: Props) {
  if (!roomState) return null;

  const me = roomState.players.find((p) => p.id === playerId);
  const targetTeamId = teamId || me?.teamId;
  const myTeam = targetTeamId ? roomState.teams.find((t) => t.id === targetTeamId) : null;

  const sorted = roomState.teamMode === "TEAM"
    ? [...roomState.teams].sort((a, b) => b.score - a.score)
    : [...roomState.players].sort((a, b) => b.score - a.score);

  const myRank = sorted.findIndex((e) => e.id === (myTeam?.id ?? me?.id)) + 1;
  const scoreVal = myTeam ? myTeam.score : (me?.score ?? 0);
  const displayName = overridePlayerName || me?.name || "Bạn";

  return (
    <div className="glass rounded-xl p-1.5 sm:p-2.5 flex items-center justify-between gap-1 sm:gap-2 border border-white/10 shadow-sm">
      {/* Player & Team Info */}
      <div className="flex-1 min-w-0 pr-1">
        <p className="text-[10px] sm:text-xs text-muted-foreground truncate whitespace-nowrap">
          {roomState.teamMode === "TEAM" && myTeam ? "Đội thi đấu" : "Người chơi"}
        </p>
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="font-bold truncate text-xs sm:text-sm text-foreground whitespace-nowrap">
            {displayName}
          </span>
          {myTeam && (
            <span
              className="text-[10px] sm:text-xs font-semibold px-1.5 sm:px-2 py-0.5 rounded-full truncate shrink-0 max-w-[85px] sm:max-w-[110px] whitespace-nowrap"
              style={{ background: `${myTeam.color}25`, color: myTeam.color, border: `1px solid ${myTeam.color}40` }}
            >
              {myTeam.name}
            </span>
          )}
        </div>
      </div>

      {/* Individual MVP Score (shown on sm+ or if Individual mode) */}
      {myTeam && (
        <div className="hidden sm:block text-center px-2 border-l border-border/50 shrink-0">
          <p className="text-[10px] text-muted-foreground uppercase whitespace-nowrap">Cá nhân</p>
          <p className="font-bold text-xs sm:text-sm text-yellow-400 font-mono whitespace-nowrap">
            {(me?.score ?? 0).toLocaleString()} <span className="text-[9px]">pts</span>
          </p>
        </div>
      )}

      {/* Rank */}
      <div className="text-center px-2 border-l border-border/50 shrink-0">
        <p className="text-[9px] sm:text-[10px] text-muted-foreground uppercase whitespace-nowrap">{myTeam ? "Hạng" : "Xếp"}</p>
        <p className="font-black text-sm sm:text-base text-purple-400 font-mono whitespace-nowrap">
          #{myRank || "-"}
        </p>
      </div>

      {/* Team Score */}
      <div className="text-right pl-2 border-l border-border/50 shrink-0">
        <p className="text-[9px] sm:text-[10px] text-muted-foreground uppercase whitespace-nowrap">{myTeam ? "Điểm đội" : "Điểm"}</p>
        <p className="font-black text-sm sm:text-base text-cyan-400 font-mono whitespace-nowrap">
          {scoreVal.toLocaleString()}
        </p>
      </div>
    </div>
  );
}
