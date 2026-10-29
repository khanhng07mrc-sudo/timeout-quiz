"use client";

import type { OlympiaState, Seat, TimerState } from "@/lib/olympia/types";
import { useCountdown } from "./hooks";

export const SEAT_COLORS = ["#38bdf8", "#f472b6", "#facc15", "#4ade80", "#c084fc", "#fb923c", "#2dd4bf", "#f87171"];

export function seatName(s: OlympiaState, id: number | null | undefined) {
  if (id == null) return "—";
  return s.seats[id]?.name || `Ghế ${id + 1}`;
}

export function activeSeats(s: OlympiaState): Seat[] {
  return s.seats.filter((x) => x.name);
}

export function Timer({
  timer,
  serverNow,
  big,
}: {
  timer: TimerState | null | undefined;
  serverNow: () => number;
  big?: boolean;
}) {
  const ms = useCountdown(timer, serverNow);
  const total = timer?.totalMs || 1;
  const pct = Math.max(0, Math.min(100, (ms / total) * 100));
  const secs = (ms / 1000).toFixed(ms < 10000 ? 1 : 0);
  const low = ms <= 5000 && ms > 0;
  return (
    <div className="w-full">
      <div className={`font-mono font-black tabular-nums text-center ${big ? "text-7xl" : "text-3xl"} ${low ? "text-red-400" : "text-sky-200"}`}>
        {secs}s
      </div>
      <div className="h-2 rounded bg-white/10 overflow-hidden mt-1">
        <div className={`h-full ${low ? "bg-red-500" : "bg-sky-400"}`} style={{ width: `${pct}%`, transition: "width 0.1s linear" }} />
      </div>
    </div>
  );
}

export function ScoreStrip({
  state,
  highlight = [],
  large,
}: {
  state: OlympiaState;
  highlight?: (number | null | undefined)[];
  large?: boolean;
}) {
  const seats = activeSeats(state);
  const count = seats.length;
  const cols =
    count === 2
      ? "grid-cols-2 max-w-md mx-auto"
      : count === 3
      ? "grid-cols-3 max-w-xl mx-auto"
      : count === 4
      ? "grid-cols-4 max-w-3xl mx-auto"
      : count <= 6
      ? "grid-cols-3 sm:grid-cols-6 max-w-4xl mx-auto"
      : "grid-cols-4 sm:grid-cols-8 w-full";

  return (
    <div className={`grid ${cols} gap-2 w-full`}>
      {seats.map((s) => {
        const hl = highlight.includes(s.id);
        return (
          <div
            key={s.id}
            className={`rounded-xl border px-2.5 py-1.5 sm:px-3 sm:py-2 text-center transition ${hl ? "border-yellow-300 bg-yellow-300/20 scale-[1.03]" : "border-white/15 bg-white/5"} ${s.connected ? "" : "opacity-60"}`}
            style={{ borderLeft: `5px solid ${SEAT_COLORS[s.id]}` }}
          >
            <div className={`truncate font-semibold ${large ? "text-sm sm:text-base" : "text-xs sm:text-sm"}`}>{s.name}</div>
            <div className={`font-black tabular-nums ${large ? "text-2xl sm:text-4xl" : "text-lg sm:text-2xl"}`} style={{ color: SEAT_COLORS[s.id] }}>
              {s.score}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function MediaView({ url, type, className }: { url?: string; type?: string; className?: string }) {
  if (!url) return null;
  const isVideo = type === "video" || /\.(mp4|webm|mov|ogg)$/i.test(url);
  return isVideo ? (
    <video src={url} controls playsInline className={className ?? "max-h-[50vh] rounded-xl mx-auto"} />
  ) : (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt="" className={className ?? "max-h-[50vh] rounded-xl mx-auto object-contain"} />
  );
}

export function Panel({ title, children, className = "" }: { title?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border border-white/15 bg-slate-900/70 p-2.5 ${className}`}>
      {title && <h3 className="text-[11px] uppercase tracking-widest text-sky-300 mb-1.5 font-bold">{title}</h3>}
      {children}
    </div>
  );
}

export const btn =
  "px-2.5 py-1.5 rounded-lg text-xs font-bold border border-white/20 bg-white/10 hover:bg-white/20 active:scale-95 transition disabled:opacity-40 disabled:cursor-not-allowed";
export const btnPrimary = "px-2.5 py-1.5 rounded-lg text-xs font-bold bg-sky-500 hover:bg-sky-400 text-slate-950 active:scale-95 transition";
export const btnOk = "px-2.5 py-1.5 rounded-lg text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 active:scale-95 transition";
export const btnBad = "px-2.5 py-1.5 rounded-lg text-xs font-bold bg-rose-500 hover:bg-rose-400 text-white active:scale-95 transition";
