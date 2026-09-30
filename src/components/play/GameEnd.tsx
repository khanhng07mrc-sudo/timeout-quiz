"use client";

import { GameEndPayload } from "@/types";
import Link from "next/link";

interface Props {
  payload: GameEndPayload;
  playerId: string;
}

export default function GameEnd({ payload, playerId }: Props) {
  const myEntry = payload.leaderboard.find((e) => e.playerId === playerId);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6">
      <div className="text-center mb-8">
        <div className="text-6xl mb-4">
          {myEntry?.rank === 1 ? "🥇" : myEntry?.rank === 2 ? "🥈" : myEntry?.rank === 3 ? "🥉" : "🏅"}
        </div>
        <h1 className="text-4xl font-black">Game kết thúc!</h1>
        {myEntry && (
          <p className="text-xl text-muted-foreground mt-2">
            Bạn xếp hạng <span className="font-black text-foreground">#{myEntry.rank}</span> với{" "}
            <span className="text-cyan-400 font-black">{myEntry.score.toLocaleString()} điểm</span>
          </p>
        )}
      </div>

      <div className="w-full max-w-md space-y-3 mb-8">
        {payload.leaderboard.slice(0, 10).map((entry) => (
          <div
            key={entry.rank}
            className={`flex items-center gap-4 p-4 rounded-xl ${
              (entry.playerId === playerId) ? "glass border border-purple-500/50" : "glass"
            }`}
          >
            <span className="w-10 text-xl font-black text-center">
              {entry.rank === 1 ? "🥇" : entry.rank === 2 ? "🥈" : entry.rank === 3 ? "🥉" : `#${entry.rank}`}
            </span>
            <div className="flex-1">
              <p className="font-bold">{entry.name}</p>
              <p className="text-xs text-muted-foreground">{entry.correctAnswers}/{entry.totalAnswers} đúng</p>
            </div>
            <span className="font-black text-cyan-400">{entry.score.toLocaleString()}</span>
          </div>
        ))}
      </div>

      <div className="flex gap-4">
        <Link href="/play" className="px-6 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 font-bold transition-colors">
          Chơi lại
        </Link>
        <Link href="/" className="px-6 py-3 rounded-xl glass border border-border hover:border-purple-500 font-bold transition-colors">
          Về trang chủ
        </Link>
      </div>
    </div>
  );
}
