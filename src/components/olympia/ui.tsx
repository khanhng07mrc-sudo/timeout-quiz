"use client";

import type { OlympiaState, Seat, TimerState } from "@/lib/olympia/types";
import { useCountdown } from "./hooks";

// ── Ascend Theme — Palette ──────────────────────────────────────────────────
// Deep indigo/violet background + amber-to-rose accent gradient
// Background: #0d0820 → #120b2e → #1a0d3f
// Accent gradient: #f59e0b (amber) → #ef4444 (red) → #7c3aed (violet)

export const SEAT_COLORS = ["#38bdf8", "#f472b6", "#facc15", "#4ade80", "#c084fc", "#fb923c", "#2dd4bf", "#f87171"];

// Ascend theme tokens
export const ASCEND = {
  bg: "bg-gradient-to-b from-[#0d0820] via-[#120b2e] to-[#0a0618]",
  card: "bg-gradient-to-b from-[#1a0d3f]/90 to-[#0f0728]/95 border border-violet-500/20 backdrop-blur-xl shadow-[0_8px_32px_rgba(109,40,217,0.25)]",
  cardHighlight: "bg-gradient-to-br from-[#2a0f5a]/90 to-[#1a0d3f]/95 border border-amber-400/40 shadow-[0_0_24px_rgba(251,191,36,0.25)]",
  header: "text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-red-400 to-violet-400 font-black",
  subText: "text-violet-200/70",
  timerGlow: "shadow-[0_0_20px_rgba(251,191,36,0.5)]",
  timerLow: "shadow-[0_0_20px_rgba(239,68,68,0.7)]",
  pill: "px-3 py-1 rounded-full bg-violet-500/20 border border-violet-400/30 text-violet-200 text-xs font-bold",
  pillAmber: "px-3 py-1 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-300 text-xs font-bold",
  divider: "border-violet-500/20",
  glow: "drop-shadow-[0_0_12px_rgba(245,158,11,0.6)]",
  glowRed: "drop-shadow-[0_0_12px_rgba(239,68,68,0.6)]",
} as const;

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
  const running = timer?.startedAt != null;
  const low = ms <= 5000 && ms > 0;

  return (
    <div className="w-full space-y-2">
      <div
        className={`font-mono font-black tabular-nums text-center transition-all ${big ? "text-6xl sm:text-7xl" : "text-3xl sm:text-4xl"} ${
          low
            ? "text-red-400 drop-shadow-[0_0_16px_rgba(239,68,68,0.8)]"
            : running
            ? "text-amber-300 drop-shadow-[0_0_12px_rgba(251,191,36,0.6)]"
            : "text-violet-300/60"
        }`}
      >
        {secs}s
      </div>
      <div className="h-2.5 rounded-full bg-black/40 border border-violet-500/20 overflow-hidden shadow-inner">
        <div
          className={`h-full rounded-full transition-all duration-100 ${
            low
              ? "bg-gradient-to-r from-red-500 to-rose-400 shadow-[0_0_10px_rgba(239,68,68,0.7)]"
              : "bg-gradient-to-r from-amber-400 via-red-400 to-violet-500 shadow-[0_0_10px_rgba(251,191,36,0.5)]"
          }`}
          style={{ width: `${running ? pct : 100}%` }}
        />
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
    <div className={`grid ${cols} gap-1.5 sm:gap-2 w-full`}>
      {seats.map((s) => {
        const hl = highlight.includes(s.id);
        return (
          <div
            key={s.id}
            className={`rounded-xl border px-2 py-1.5 text-center transition-all ${
              hl
                ? "border-amber-400/70 bg-gradient-to-b from-amber-500/25 to-amber-800/10 scale-[1.04] shadow-[0_0_16px_rgba(251,191,36,0.35)]"
                : "border-violet-500/20 bg-gradient-to-b from-white/5 to-white/[0.02]"
            } ${s.connected ? "" : "opacity-50"}`}
            style={{ borderLeft: `4px solid ${SEAT_COLORS[s.id]}` }}
          >
            <div
              className={`truncate font-semibold leading-tight ${large ? "text-xs sm:text-sm" : "text-[10px] sm:text-xs"} text-violet-200/80`}
            >
              {s.name}
            </div>
            <div
              className={`font-black tabular-nums leading-tight ${large ? "text-xl sm:text-3xl" : "text-base sm:text-xl"}`}
              style={{ color: SEAT_COLORS[s.id] }}
            >
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
    <video src={url} controls playsInline className={className ?? "max-h-[45vh] rounded-xl mx-auto"} />
  ) : (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt="" className={className ?? "max-h-[45vh] rounded-xl mx-auto object-contain"} />
  );
}

export function Panel({ title, children, className = "" }: { title?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border border-violet-500/20 bg-[#1a0d3f]/60 p-2.5 backdrop-blur-sm ${className}`}>
      {title && (
        <h3 className="text-[10px] uppercase tracking-widest text-violet-300/60 mb-1.5 font-bold">{title}</h3>
      )}
      {children}
    </div>
  );
}

// Ascend-themed button variants
export const btn =
  "px-2.5 py-1.5 rounded-lg text-xs font-bold border border-violet-400/30 bg-violet-500/15 hover:bg-violet-500/25 text-violet-100 active:scale-95 transition disabled:opacity-40 disabled:cursor-not-allowed";
export const btnPrimary =
  "px-2.5 py-1.5 rounded-lg text-xs font-bold bg-gradient-to-r from-amber-500 to-red-500 hover:from-amber-400 hover:to-red-400 text-white shadow-[0_2px_10px_rgba(251,191,36,0.35)] active:scale-95 transition disabled:opacity-40";
export const btnOk =
  "px-2.5 py-1.5 rounded-lg text-xs font-bold bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white active:scale-95 transition disabled:opacity-40";
export const btnBad =
  "px-2.5 py-1.5 rounded-lg text-xs font-bold bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-400 hover:to-red-500 text-white active:scale-95 transition disabled:opacity-40";
