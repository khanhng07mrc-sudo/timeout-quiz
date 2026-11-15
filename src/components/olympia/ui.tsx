"use client";

import type { OlympiaState, Seat, TimerState } from "@/lib/olympia/types";
import { useCountdown } from "./hooks";

// ── Ascend Theme — Palette ──────────────────────────────────────────────────
// Deep indigo/violet background + amber-to-rose accent gradient
// Background: #0d0820 → #120b2e → #1a0d3f
// Accent gradient: #f59e0b (amber) → #ef4444 (red) → #7c3aed (violet)

export const SEAT_COLORS = ["#ef4444", "#3b82f6", "#eab308", "#10b981", "#c084fc", "#fb923c", "#2dd4bf", "#f87171"];

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
  variant,
  isClassic,
}: {
  timer: TimerState | null | undefined;
  serverNow: () => number;
  big?: boolean;
  variant?: "modern" | "classic";
  isClassic?: boolean;
}) {
  const ms = useCountdown(timer, serverNow);
  const total = timer?.totalMs || 1;
  const pct = Math.max(0, Math.min(100, (ms / total) * 100));
  const secs = (ms / 1000).toFixed(ms < 10000 ? 1 : 0);
  const running = timer?.startedAt != null;
  const low = ms <= 5000 && ms > 0;
  const classic = Boolean(isClassic || variant === "classic");

  if (classic) {
    return (
      <div className="w-full space-y-2">
        <div
          className={`font-mono font-black tabular-nums text-center transition-all ${big ? "text-6xl sm:text-7xl" : "text-3xl sm:text-4xl"} ${
            low
              ? "text-red-400 drop-shadow-[0_0_16px_rgba(239,68,68,0.85)]"
              : running
              ? "text-[#fbbf24] drop-shadow-[0_0_14px_rgba(251,191,36,0.75)]"
              : "text-amber-200/60"
          }`}
        >
          {secs}s
        </div>
        <div className="h-2.5 rounded-full bg-black/75 border border-[#b8860b]/40 overflow-hidden shadow-inner">
          <div
            className={`h-full rounded-full transition-all duration-100 ${
              low
                ? "bg-gradient-to-r from-red-600 via-rose-500 to-red-400 shadow-[0_0_12px_rgba(239,68,68,0.8)]"
                : "bg-gradient-to-r from-[#d97706] via-[#f59e0b] to-[#ef4444] shadow-[0_0_12px_rgba(245,158,11,0.6)]"
            }`}
            style={{ width: `${running ? pct : 100}%` }}
          />
        </div>
      </div>
    );
  }

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

/**
 * Iconic Olympia Circular Radial Dial Timer (Đồng hồ đếm ngược vòng tròn phát sóng)
 * Features:
 * - 360-degree SVG radial countdown arc strokeDashoffset.
 * - Multi-layer concentric glowing neon rings with metal bezel.
 * - Dynamic color transitions: Cyan (#00f0ff) -> Amber (#f59e0b) -> Crimson Red (#ef4444) when <= 5s.
 * - High-legibility broadcast monospace countdown seconds at the center.
 */
export function CircularTimer({
  timer,
  serverNow,
  size = 150,
  strokeWidth = 10,
  variant,
  isClassic,
}: {
  timer: TimerState | null | undefined;
  serverNow: () => number;
  size?: number;
  strokeWidth?: number;
  variant?: "modern" | "classic";
  isClassic?: boolean;
}) {
  const ms = useCountdown(timer, serverNow);
  const total = timer?.totalMs || 1;
  const pct = Math.max(0, Math.min(1, ms / total));
  const secs = (ms / 1000).toFixed(ms < 10000 ? 1 : 0);
  const running = timer?.startedAt != null;
  const low = ms <= 5000 && ms > 0;
  const classic = Boolean(isClassic || variant === "classic");

  const radius = (size - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - (running ? pct : 1));

  const strokeColor = classic
    ? low
      ? "#ef4444"
      : running
      ? "#fbbf24"
      : "#d4af37"
    : low
    ? "#ef4444"
    : running
    ? "#f59e0b"
    : "#00e5ff";

  const glowShadow = classic
    ? low
      ? "drop-shadow(0 0 16px rgba(239,68,68,0.85))"
      : running
      ? "drop-shadow(0 0 14px rgba(245,158,11,0.75))"
      : "drop-shadow(0 0 12px rgba(212,175,55,0.65))"
    : low
    ? "drop-shadow(0 0 16px rgba(239,68,68,0.85))"
    : running
    ? "drop-shadow(0 0 14px rgba(245,158,11,0.75))"
    : "drop-shadow(0 0 12px rgba(0,229,255,0.65))";

  return (
    <div
      className="relative flex items-center justify-center select-none"
      style={{ width: size, height: size, filter: glowShadow }}
    >
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background Track Circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={classic ? "rgba(28, 30, 34, 0.95)" : "rgba(15, 23, 42, 0.85)"}
          strokeWidth={strokeWidth}
          fill={classic ? "rgba(16, 17, 20, 0.85)" : "rgba(5, 10, 25, 0.75)"}
        />
        {/* Decorative Inner Metal Ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius - strokeWidth}
          stroke={classic ? "rgba(212, 175, 55, 0.4)" : "rgba(255, 255, 255, 0.12)"}
          strokeWidth={1.5}
          fill="none"
        />
        {/* Active Animated Radial Arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          fill="none"
          className="transition-[stroke-dashoffset] duration-100 ease-linear"
        />
      </svg>
      {/* Centered Monospace Countdown Text */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className={`font-mono font-black tabular-nums tracking-tighter leading-none ${
            size > 130 ? "text-4xl sm:text-5xl" : "text-3xl"
          }`}
          style={{
            color: low ? "#fca5a5" : running ? "#fef08a" : classic ? "#fde68a" : "#e0f2fe",
            textShadow: low
              ? "0 0 16px rgba(239,68,68,0.9)"
              : "0 0 12px rgba(245,158,11,0.8)",
          }}
        >
          {secs}
          <span className="text-xl sm:text-2xl font-bold ml-0.5">s</span>
        </span>
        <span className={`text-[10px] sm:text-[11px] font-black uppercase tracking-widest mt-0.5 ${classic ? "text-amber-300/80" : "text-cyan-300/80"}`}>
          {low ? "HẾT GIỜ" : "THỜI GIAN"}
        </span>
      </div>
    </div>
  );
}

export function ScoreStrip({
  state,
  highlight,
  buzzedSeat,
  activeSoloSeat,
  large,
  variant,
  isClassic,
}: {
  state: OlympiaState;
  highlight?: (number | null | undefined)[];
  buzzedSeat?: number | null;
  activeSoloSeat?: number | null;
  large?: boolean;
  variant?: "modern" | "classic";
  isClassic?: boolean;
}) {
  const seats = activeSeats(state);
  const count = seats.length;
  const classic = Boolean(isClassic || variant === "classic" || state?.themeMode === "o26_classic");

  // Xác định thí sinh bấm chuông (chỉ highlight sáng ô khi bấm chuông)
  const currentBuzzedSeat =
    buzzedSeat !== undefined
      ? buzzedSeat
      : state.currentRound === "khoiDong"
      ? state.khoiDong?.buzzedSeat
      : state.currentRound === "vcnv"
      ? (state.vcnv?.bells?.[0]?.seat ?? null)
      : state.currentRound === "veDich"
      ? state.veDich?.steal?.buzzedSeat
      : state.currentRound === "cauHoiPhu"
      ? state.cauHoiPhu?.buzzedSeat
      : null;

  // Xác định thí sinh đang thi lượt riêng cá nhân (O13-21 và lượt riêng O24-26)
  const currentSoloSeat =
    activeSoloSeat !== undefined
      ? activeSoloSeat
      : state.currentRound === "khoiDong" && state.khoiDong
      ? (() => {
          const kd = state.khoiDong;
          const seg = kd.segments[kd.segIdx];
          return seg?.kind === "solo" ? (seg.seat ?? null) : null;
        })()
      : state.currentRound === "veDich" && state.veDich
      ? state.veDich.order[state.veDich.turnIdx] ?? null
      : null;

  return (
    <div className="flex items-center justify-center gap-1 sm:gap-2 flex-nowrap w-full max-w-full overflow-hidden px-1">
      {seats.map((s) => {
        const isBuzzed = currentBuzzedSeat != null && currentBuzzedSeat === s.id;
        const isSoloTurn = !isBuzzed && currentSoloSeat != null && currentSoloSeat === s.id;
        const color = SEAT_COLORS[s.id] || "#38bdf8";

        // Dynamic compact font scaling based on candidate count so it never wraps
        const nameClass = count > 5 ? "text-[9px] sm:text-[10px]" : count > 4 ? "text-[10px] sm:text-xs" : large ? "text-xs sm:text-sm" : "text-[10px] sm:text-xs";
        const scoreClass = count > 5 ? "text-sm sm:text-base" : count > 4 ? "text-base sm:text-lg" : large ? "text-lg sm:text-2xl" : "text-base sm:text-xl";

        // 1. Khi có thí sinh bấm chuông: highlight sáng rực rỡ màu chuông amber/gold
        if (isBuzzed) {
          return (
            <div
              key={s.id}
              className={`flex-1 min-w-0 max-w-[150px] rounded-xl border px-1.5 py-1 text-center transition-all scale-[1.03] animate-pulse ${
                classic ? "shadow-[0_0_16px_rgba(254,240,138,0.8)]" : "shadow-[0_0_20px_#f59e0b]"
              } ${s.connected ? "" : "opacity-50"}`}
              style={{
                border: classic ? "2px solid #fef08a" : "2px solid #facc15",
                background: classic
                  ? "linear-gradient(180deg, #452b0a 0%, #170e02 100%)"
                  : "linear-gradient(180deg, rgba(245, 158, 11, 0.45) 0%, rgba(217, 119, 6, 0.25) 100%)",
                borderLeft: classic ? "4px solid #fef08a" : "4px solid #facc15",
              }}
            >
              <div
                className={`truncate font-black leading-tight ${nameClass} ${classic ? "text-amber-100" : "text-amber-200"} flex items-center justify-center gap-0.5`}
              >
                <span>🔔</span>
                <span className="truncate">{s.name}</span>
              </div>
              <div
                className={`font-black tabular-nums leading-tight ${scoreClass} ${classic ? "text-[#fef08a]" : "text-amber-300"} drop-shadow`}
              >
                {s.score}
              </div>
            </div>
          );
        }

        // 2. Thí sinh đang có lượt thi đấu riêng (Solo): viền sáng nổi bật
        if (isSoloTurn) {
          return (
            <div
              key={s.id}
              className={`flex-1 min-w-0 max-w-[150px] rounded-xl border px-1.5 py-1 text-center transition-all scale-[1.02] ${
                s.connected ? "" : "opacity-50"
              }`}
              style={{
                border: classic ? "2px solid #f59e0b" : "1.5px solid #00f0ff",
                borderLeft: classic ? "4px solid #f59e0b" : "4px solid #00f0ff",
                background: classic
                  ? "linear-gradient(180deg, #4a1515 0%, #1a0808 100%)"
                  : "linear-gradient(180deg, rgba(0, 240, 255, 0.28) 0%, rgba(2, 6, 23, 0.85) 100%)",
                boxShadow: classic
                  ? "0 0 14px rgba(245, 158, 11, 0.5), inset 0 0 8px rgba(245, 158, 11, 0.2)"
                  : "0 0 16px rgba(0, 240, 255, 0.35), inset 0 0 8px rgba(0, 240, 255, 0.15)",
              }}
            >
              <div
                className={`truncate font-bold leading-tight ${nameClass} ${classic ? "text-amber-200" : "text-cyan-200"} drop-shadow`}
              >
                {s.name}
              </div>
              <div
                className={`font-black tabular-nums leading-tight ${scoreClass} ${classic ? "text-[#fbbf24] drop-shadow-[0_0_12px_rgba(251,191,36,0.7)]" : "text-cyan-300 drop-shadow-[0_0_12px_rgba(0,240,255,0.7)]"}`}
              >
                {s.score}
              </div>
            </div>
          );
        }

        // 3. Trạng thái bình thường
        return (
          <div
            key={s.id}
            className={`flex-1 min-w-0 max-w-[150px] rounded-xl border px-1.5 py-1 text-center transition-all ${
              classic
                ? "border-[#d4af37]/50 bg-gradient-to-b from-[#2a2d33] via-[#1e2025] to-[#141518] shadow-[0_2px_6px_rgba(0,0,0,0.6)]"
                : "border-cyan-500/25 bg-slate-950/80 shadow-[0_2px_10px_rgba(0,0,0,0.5)]"
            } ${s.connected ? "" : "opacity-50"}`}
            style={{ borderLeft: `3.5px solid ${classic ? color : color}` }}
          >
            <div
              className={`truncate font-semibold leading-tight ${nameClass} ${classic ? "text-amber-200" : "text-slate-200"}`}
            >
              {s.name}
            </div>
            <div
              className={`font-black tabular-nums leading-tight ${scoreClass} ${classic ? "text-[#fbbf24]" : "text-amber-300"} drop-shadow`}
            >
              {s.score}
            </div>
          </div>
        );
      })}
    </div>
  );
}

import { OlympiaBroadcastVideo } from "./OlympiaBroadcastVideo";

export function resolveMediaUrl(url?: string): string | undefined {
  if (!url) return undefined;
  if (/^[a-zA-Z]:[\\/]/i.test(url) || (!url.startsWith("/") && !url.startsWith("http") && !url.startsWith("data:"))) {
    const filename = url.split(/[\\/]/).pop();
    if (filename) return `/olympia/media/${filename}`;
  }
  return url;
}

export function MediaView({
  url,
  type,
  className,
  isTiming,
}: {
  url?: string;
  type?: string;
  className?: string;
  isTiming?: boolean;
}) {
  const resolved = resolveMediaUrl(url);
  if (!resolved) return null;
  const isVideo = type === "video" || /\.(mp4|webm|mov|ogg|m4v|ogv|mpeg)$/i.test(resolved);
  if (!isVideo) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={resolved} alt="" className={className ?? "max-h-[45vh] rounded-xl mx-auto object-contain shadow-2xl"} />;
  }

  if (isTiming !== undefined) {
    return (
      <div className={className ?? "max-h-[45vh] w-full rounded-xl mx-auto overflow-hidden shadow-2xl"}>
        <OlympiaBroadcastVideo src={resolved} isTiming={isTiming} />
      </div>
    );
  }

  return (
    <video
      src={resolved}
      controls
      playsInline
      muted
      preload="auto"
      className={className ?? "max-h-[45vh] rounded-xl mx-auto shadow-2xl"}
    />
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
