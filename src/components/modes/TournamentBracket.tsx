"use client";

import { TournamentState, TournamentMatch } from "@/types";

interface Props {
  tournamentState?: TournamentState;
  myTeamId?: string;
  isDisplay?: boolean;
}

export default function TournamentBracket({
  tournamentState,
  myTeamId,
  isDisplay = false,
}: Props) {
  if (!tournamentState || tournamentState.matches.length === 0) {
    return (
      <div className="glass rounded-2xl p-6 text-center text-muted-foreground">
        <p className="text-2xl mb-2">🏆</p>
        <p>Bảng đấu đang được thiết lập...</p>
      </div>
    );
  }

  // Group matches by roundIndex
  const rounds: Record<number, TournamentMatch[]> = {};
  tournamentState.matches.forEach((m) => {
    if (!rounds[m.roundIndex]) rounds[m.roundIndex] = [];
    rounds[m.roundIndex].push(m);
  });

  const roundIndices = Object.keys(rounds)
    .map(Number)
    .sort((a, b) => a - b);

  return (
    <div className={`glass rounded-2xl ${isDisplay ? "p-6" : "p-4"} space-y-6`}>
      <div className="flex items-center justify-between border-b border-border/50 pb-3">
        <div className="flex items-center gap-3">
          <span className="text-3xl">🏆</span>
          <div>
            <h3 className={`font-black ${isDisplay ? "text-2xl" : "text-lg"} text-white`}>
              Bảng Đấu Loại Trực Tiếp 1v1
            </h3>
            <p className="text-xs text-muted-foreground">
              Mỗi trận đấu {tournamentState.questionsPerMatch} câu hỏi · Đội thắng đi tiếp
            </p>
          </div>
        </div>

        {tournamentState.championTeamName && (
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-yellow-500/20 border border-yellow-500/50 text-yellow-300 font-bold animate-pulse">
            <span>👑 VÔ ĐỊCH:</span>
            <span className="text-white font-black">{tournamentState.championTeamName}</span>
          </div>
        )}
      </div>

      {/* Bracket Rounds Layout */}
      <div className="flex flex-col md:flex-row gap-6 items-stretch justify-around overflow-x-auto pb-4">
        {roundIndices.map((roundIdx) => {
          const roundMatches = rounds[roundIdx];
          const roundTitle = roundMatches[0]?.roundName || `Vòng ${roundIdx + 1}`;

          return (
            <div key={roundIdx} className="flex-1 min-w-[260px] flex flex-col gap-4">
              <div className="text-center py-2 px-3 rounded-lg bg-white/5 border border-white/10 font-bold text-sm text-cyan-300 uppercase tracking-wider">
                {roundTitle}
              </div>

              <div className="flex flex-col justify-around gap-4 flex-1">
                {roundMatches.map((match) => {
                  const isCurrent = tournamentState.currentMatchId === match.id;
                  const isMyMatch = myTeamId && (match.team1Id === myTeamId || match.team2Id === myTeamId);

                  return (
                    <div
                      key={match.id}
                      className={`relative rounded-xl border-2 transition-all p-3.5 ${
                        isCurrent
                          ? "border-yellow-400 bg-yellow-500/10 shadow-[0_0_20px_rgba(234,179,8,0.3)] scale-[1.02]"
                          : match.status === "COMPLETED"
                          ? "border-green-500/40 bg-card/60"
                          : "border-border/60 bg-card/40"
                      } ${isMyMatch ? "ring-2 ring-purple-500" : ""}`}
                    >
                      {/* Match Header Tag */}
                      <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-2">
                        <span>Trận #{match.matchIndex + 1}</span>
                        {isCurrent && (
                          <span className="px-2 py-0.5 rounded-full bg-yellow-500 text-black font-black animate-pulse">
                            ĐANG ĐẤU ({match.currentQuestionInMatch}/{match.totalQuestionsInMatch})
                          </span>
                        )}
                        {match.status === "COMPLETED" && (
                          <span className="text-green-400 font-semibold">✓ Đã xong</span>
                        )}
                        {match.status === "UPCOMING" && <span>Sắp diễn ra</span>}
                      </div>

                      {/* Team 1 */}
                      <div
                        className={`flex items-center justify-between p-2 rounded-lg mb-1.5 transition-colors ${
                          match.winnerTeamId === match.team1Id
                            ? "bg-green-500/20 border border-green-500/40 text-green-300 font-bold"
                            : match.status === "COMPLETED"
                            ? "opacity-60"
                            : "bg-white/5"
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className="w-3.5 h-3.5 rounded-full shrink-0"
                            style={{ background: match.team1Color || "#6366f1" }}
                          />
                          <span className="truncate text-sm font-semibold">
                            {match.team1Name || "Chờ xác định"}
                          </span>
                        </div>
                        <span className="text-sm font-mono font-bold ml-2">
                          {match.team1Score}
                        </span>
                      </div>

                      {/* Team 2 */}
                      <div
                        className={`flex items-center justify-between p-2 rounded-lg transition-colors ${
                          match.winnerTeamId === match.team2Id
                            ? "bg-green-500/20 border border-green-500/40 text-green-300 font-bold"
                            : match.status === "COMPLETED"
                            ? "opacity-60"
                            : "bg-white/5"
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className="w-3.5 h-3.5 rounded-full shrink-0"
                            style={{ background: match.team2Color || "#ec4899" }}
                          />
                          <span className="truncate text-sm font-semibold">
                            {match.team2Name || "Chờ xác định"}
                          </span>
                        </div>
                        <span className="text-sm font-mono font-bold ml-2">
                          {match.team2Score}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Oracle Leaderboard (Nhà Tiên Tri Đại Tài) */}
      {tournamentState.oracleScores && Object.keys(tournamentState.oracleScores).length > 0 && (
        <div className="pt-4 border-t border-border/40">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xl">🔮</span>
            <h4 className="font-bold text-sm uppercase tracking-wider text-cyan-300">
              Bảng Xếp Hạng Tiên Tri (Khán Giả Dự Đoán Đúng)
            </h4>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {Object.entries(tournamentState.oracleScores)
              .sort(([, a], [, b]) => b - a)
              .map(([tId, pts], rank) => {
                let tName = tId;
                for (const m of tournamentState.matches) {
                  if (m.team1Id === tId && m.team1Name) { tName = m.team1Name; break; }
                  if (m.team2Id === tId && m.team2Name) { tName = m.team2Name; break; }
                }

                return (
                  <div
                    key={tId}
                    className="p-2.5 rounded-xl bg-cyan-950/30 border border-cyan-500/30 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs font-black text-yellow-400">#{rank + 1}</span>
                      <span className="text-xs font-bold text-white truncate">{tName}</span>
                    </div>
                    <span className="text-xs font-mono font-black text-cyan-300">{pts} pts</span>
                  </div>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
}
