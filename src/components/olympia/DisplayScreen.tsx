"use client";

import { useState, useRef, useEffect } from "react";
import dynamic from "next/dynamic";
import { ROUND_LABELS, type OlympiaState } from "@/lib/olympia/types";
import { useOlympiaAudio, useOlympiaSocket } from "./hooks";
import { CircularTimer, MediaView, ScoreStrip, SEAT_COLORS, Timer, activeSeats, seatName } from "./ui";
import { useOlympiaCameraState } from "./studio/useOlympiaCamera";

const OlympiaStudio3DScene = dynamic(() => import("./OlympiaStudio3DScene"), {
  ssr: false,
  loading: () => (
    <div className="absolute inset-0 flex items-center justify-center bg-[#020510] text-amber-300 text-sm font-bold">
      Đang kết nối Trường quay 3D…
    </div>
  ),
});

function hasActiveRoundContent(state: OlympiaState): boolean {
  if (state.stage !== "playing" || !state.currentRound) return false;

  switch (state.currentRound) {
    case "khoiDong": {
      const kd = state.khoiDong;
      if (!kd || !kd.started) return false;
      return Boolean((kd.questionRevealed && kd.current) || kd.phase === "segmentDone");
    }
    case "vcnv": {
      const v = state.vcnv;
      if (!v) return false;
      return v.phase === "grid" || v.phase === "question" || v.phase === "answers";
    }
    case "tangToc": {
      const tt = state.tangToc;
      if (!tt) return false;
      return tt.phase === "question" || tt.phase === "ranking" || tt.phase === "graded";
    }
    case "veDich": {
      const vd = state.veDich;
      if (!vd) return false;
      return (
        vd.phase === "choosing" ||
        vd.phase === "packageReady" ||
        vd.phase === "thinking" ||
        vd.phase === "stealing" ||
        vd.phase === "result"
      );
    }
    case "cauHoiPhu": {
      const chp = state.cauHoiPhu;
      if (!chp) return false;
      return chp.phase === "question" || chp.phase === "result";
    }
    default:
      return false;
  }
}

export default function DisplayScreen({ code }: { code: string }) {
  const { state, join, connected, serverNow } = useOlympiaSocket({ code, role: "display" });
  const [audioOn, setAudioOn] = useState(true);
  useOlympiaAudio(state, join?.audioSeason, audioOn);

  // Auto-camera and question overlay visibility state
  const cameraState = useOlympiaCameraState(state, serverNow);

  if (join && !join.ok) {
    return (
      <div className="fixed inset-0 w-full h-full flex items-center justify-center bg-black p-10 text-rose-300 text-2xl">
        {join.error}
      </div>
    );
  }

  if (!state) {
    return (
      <div className="fixed inset-0 w-full h-full flex items-center justify-center bg-gradient-to-b from-[#060814] via-[#0a0f24] to-[#03040a] text-violet-300 text-2xl font-bold">
        Đang kết nối…
      </div>
    );
  }

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const isRoundFullscreen = state.currentRound === "vcnv" || state.currentRound === "tangToc";
  const isLowerThird = !isRoundFullscreen && (state.overlayMode ?? "LOWER_THIRD") === "LOWER_THIRD";
  const isOverlayHidden = cameraState.isOverlayHidden;

  return (
    <div className="fixed inset-0 w-full h-full min-h-screen overflow-hidden bg-gradient-to-b from-[#060818] via-[#090d24] to-[#040612] text-white flex flex-col select-none">
      {/* ── 1. 3D BROADCAST STUDIO (ONLY RUNS WHEN PLAYING) ── */}
      {state.stage === "playing" && (
        <div className="fixed inset-0 w-full h-full z-0 overflow-hidden pointer-events-none">
          <OlympiaStudio3DScene
            state={state}
            serverNow={serverNow}
            activeCamera={cameraState.camAngle}
            transitionMode={cameraState.transitionMode}
            pushInProgress={cameraState.pushInProgress}
            showDirectorBar={false}
            allowPTZ={false}
          />
        </div>
      )}

      {/* ── 2. BROADCAST SCOREBOARD OVERLAY (Z-50) ── */}
      {state.showScoreboard && (
        <div className="absolute inset-0 z-50 bg-[#0d0820]/95 flex flex-col items-center justify-center p-6 animate-fade-in backdrop-blur-md pointer-events-auto">
          <h2
            className="text-3xl sm:text-4xl font-black mb-6 tracking-wider"
            style={{
              background: "linear-gradient(90deg,#f59e0b,#ef4444,#7c3aed)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            BẢNG ĐIỂM HIỆN TẠI
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 w-full max-w-4xl">
            {activeSeats(state).map((s) => (
              <div
                key={s.id}
                className="rounded-2xl border p-5 text-center flex flex-col items-center gap-2 bg-gradient-to-b from-white/5 to-white/[0.02] backdrop-blur shadow-xl"
                style={{ borderColor: SEAT_COLORS[s.id], boxShadow: `0 0 20px ${SEAT_COLORS[s.id]}30` }}
              >
                <span className="text-base font-bold truncate max-w-full text-violet-200">{s.name}</span>
                <span className="text-5xl font-black drop-shadow" style={{ color: SEAT_COLORS[s.id] }}>
                  {s.score}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── 3. BROADCAST TOP HEADER BAR (Z-30) ── */}
      <div className="shrink-0 flex items-center justify-between px-3 py-1.5 border-b border-white/10 bg-black/40 backdrop-blur-md z-30">
        <div className="flex items-center gap-2">
          <span className="text-lg">🏔️</span>
          <span
            className="text-sm sm:text-base font-black tracking-wide"
            style={{
              background: "linear-gradient(90deg,#fffbd0 0%, #ffd700 50%, #f59e0b 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            ĐƯỜNG LÊN ĐỈNH OLYMPIA
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs text-violet-300/70">
          {state.currentRound && (
            <span className="px-2 py-0.5 rounded-full bg-violet-500/20 border border-violet-400/30 text-violet-200 font-bold">
              {ROUND_LABELS[state.currentRound]}
            </span>
          )}
          <button
            type="button"
            className="px-2 py-1 border border-violet-400/30 rounded-lg hover:bg-violet-500/15 transition text-xs cursor-pointer"
            onClick={() => setAudioOn((v) => !v)}
          >
            {audioOn ? "🔊" : "🔈"}
          </button>
          <span>{connected ? "🟢" : "🔴"}</span>
        </div>
      </div>

      {/* ── 4. BROADCAST STAGE BANNER (Z-40) ── */}
      {state.stage === "playing" && state.banner && (
        <div className="absolute inset-0 z-40 flex items-center justify-center pointer-events-auto animate-fade-in bg-black/40 backdrop-blur-sm">
          <div
            className="font-black tracking-[0.14em] uppercase text-center px-8 py-5 rounded-3xl border border-white/20 bg-slate-950/85 shadow-[0_0_50px_rgba(0,191,255,0.4)]"
            style={{
              fontSize: "clamp(2.4rem, 7vw, 5.5rem)",
              lineHeight: 1.1,
              background: "linear-gradient(135deg, #fffbd0 0%, #ffd700 50%, #f59e0b 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              filter: "drop-shadow(0 0 30px rgba(251,191,36,0.6))",
            }}
          >
            {state.banner}
          </div>
        </div>
      )}

      {/* ── 5. GAME STAGE LAYERS (Z-20) ── */}
      <div className="flex-1 min-h-0 relative z-20 flex flex-col justify-end overflow-hidden">
        {/* Sảnh chờ / Lobby */}
        {state.stage === "lobby" && (
          <div className="absolute inset-0 flex items-center justify-center p-4 z-20 pointer-events-auto animate-fade-in">
            <div className="bg-slate-950/80 backdrop-blur-md rounded-3xl border border-white/15 p-6 shadow-2xl max-w-3xl w-full">
              <Lobby state={state} code={code} origin={origin} />
            </div>
          </div>
        )}

        {/* Kết thúc trận chung cuộc */}
        {state.stage === "finished" && (
          <div className="absolute inset-0 flex items-center justify-center p-4 z-20 pointer-events-auto animate-fade-in">
            <div className="bg-slate-950/85 backdrop-blur-md rounded-3xl border border-amber-400/30 p-8 shadow-2xl max-w-2xl w-full">
              <Podium state={state} />
            </div>
          </div>
        )}

        {/* In-Game Round Overlays */}
        {state.stage === "playing" && !state.banner && !isOverlayHidden && hasActiveRoundContent(state) && (
          isLowerThird ? (
            /* ── LOWER-THIRD BROADCAST OVERLAY (20 - 25% BOTTOM) ── */
            <div className="w-full px-2 sm:px-6 pb-2 pt-0 pointer-events-auto flex flex-col justify-end z-20 animate-fade-in">
              <div
                className="w-full max-w-6xl mx-auto rounded-2xl bg-slate-950/95 backdrop-blur-md border border-white/20 shadow-[0_6px_28px_rgba(0,0,0,0.85)] p-2 sm:p-3 flex flex-col justify-between"
                style={{ minHeight: "115px", maxHeight: "25vh" }}
              >
                {state.currentRound === "khoiDong" && <KhoiDong state={state} serverNow={serverNow} />}
                {state.currentRound === "vcnv" && <Vcnv state={state} serverNow={serverNow} isLowerThird={true} />}
                {state.currentRound === "tangToc" && <TangToc state={state} serverNow={serverNow} />}
                {state.currentRound === "veDich" && <VeDich state={state} serverNow={serverNow} />}
                {state.currentRound === "cauHoiPhu" && <Chp state={state} serverNow={serverNow} />}
              </div>
            </div>
          ) : (
            /* ── FULLSCREEN CENTERED OVERLAY (EXPANSIVE BROADCAST SCALE 96VW) ── */
            <div className="absolute inset-0 flex items-center justify-center p-2 sm:p-6 bg-[#030612]/85 backdrop-blur-md pointer-events-auto animate-fade-in z-30">
              <div className="w-full max-w-[96vw] lg:max-w-7xl h-full max-h-[94vh] flex items-center justify-center">
                {state.currentRound === "khoiDong" && <KhoiDong state={state} serverNow={serverNow} />}
                {state.currentRound === "vcnv" && <Vcnv state={state} serverNow={serverNow} isLowerThird={false} />}
                {state.currentRound === "tangToc" && <TangToc state={state} serverNow={serverNow} />}
                {state.currentRound === "veDich" && <VeDich state={state} serverNow={serverNow} />}
                {state.currentRound === "cauHoiPhu" && <Chp state={state} serverNow={serverNow} />}
              </div>
            </div>
          )
        )}

        {/* Score strip at bottom when not in Khởi Động and not hidden */}
        {state.stage !== "lobby" && state.currentRound !== "khoiDong" && !isOverlayHidden && isLowerThird && (
          <div className="shrink-0 px-2 pb-1 relative z-20 pointer-events-auto">
            <ScoreStrip state={state} large highlight={highlightSeats(state)} />
          </div>
        )}
      </div>
    </div>
  );
}

function highlightSeats(s: OlympiaState): (number | null)[] {
  if (s.khoiDong && s.currentRound === "khoiDong") {
    const kd = s.khoiDong;
    const seg = kd.segments[kd.segIdx];
    return [kd.buzzedSeat ?? (seg.kind === "solo" ? (seg.seat ?? null) : null)];
  }
  if (s.veDich && s.currentRound === "veDich") return [s.veDich.order[s.veDich.turnIdx], s.veDich.steal?.buzzedSeat ?? null];
  if (s.cauHoiPhu && s.currentRound === "cauHoiPhu") return s.cauHoiPhu.tied;
  return [];
}

type P = { state: OlympiaState; serverNow: () => number; isLowerThird?: boolean };

function Lobby({ state, code, origin }: { state: OlympiaState; code: string; origin: string }) {
  const seats = state.seats;
  const count = seats.length;
  const gridClass =
    count === 2 ? "grid-cols-2 max-w-sm" :
    count === 3 ? "grid-cols-3 max-w-lg" :
    count === 4 ? "grid-cols-4 max-w-xl" :
    count <= 6 ? "grid-cols-3 sm:grid-cols-6 max-w-2xl" :
    "grid-cols-4 max-w-2xl";

  return (
    <div className="text-center space-y-4 max-w-4xl mx-auto w-full px-3">
      <div className="text-sm text-violet-300/60">Vào <span className="text-violet-200 font-bold">{origin}/play</span> và nhập mã</div>
      <div
        className="text-5xl sm:text-7xl font-black tracking-[0.2em] select-all"
        style={{ background: "linear-gradient(90deg,#fffbd0,#ffd700,#f59e0b)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}
      >
        {code}
      </div>
      <div className={`grid ${gridClass} gap-2 mx-auto w-full`}>
        {seats.map((s) => (
          <div
            key={s.id}
            className="rounded-xl border bg-gradient-to-b from-white/5 to-transparent p-2 text-sm font-semibold truncate"
            style={{ borderLeft: `4px solid ${SEAT_COLORS[s.id]}`, borderTop: "1px solid rgba(255,255,255,0.1)", borderRight: "1px solid rgba(255,255,255,0.05)", borderBottom: "1px solid rgba(255,255,255,0.05)" }}
          >
            {s.name || <span className="text-violet-400/50">Ghế {s.id + 1}</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

function Podium({ state }: { state: OlympiaState }) {
  const r = [...activeSeats(state)].sort((a, b) => b.score - a.score);
  return (
    <div className="text-center space-y-4">
      <div
        className="text-4xl font-black"
        style={{ background: "linear-gradient(90deg,#fffbd0,#ffd700,#f59e0b)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}
      >
        KẾT QUẢ CHUNG CUỘC
      </div>
      {r.map((s, i) => (
        <div key={s.id} className="text-3xl" style={{ color: i === 0 ? "#ffd700" : "white" }}>
          {["🥇", "🥈", "🥉"][i] ?? `${i + 1}.`} {s.name} — <b>{s.score}</b>
        </div>
      ))}
    </div>
  );
}

function autoQuestionFontSize(text: string) {
  const len = text ? text.length : 0;
  if (len <= 45) return "text-sm sm:text-base md:text-xl lg:text-2xl leading-snug";
  if (len <= 85) return "text-xs sm:text-sm md:text-lg lg:text-xl leading-snug";
  if (len <= 140) return "text-[11px] sm:text-xs md:text-base lg:text-lg leading-snug";
  return "text-[10px] sm:text-[11px] md:text-sm lg:text-base leading-snug";
}

function DisplayTimerBar({ timer, serverNow }: { timer: any; serverNow: () => number }) {
  const [now, setNow] = useState(serverNow);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!timer || timer.startedAt == null) return;
    let active = true;
    const loop = () => {
      if (!active) return;
      setNow(serverNow());
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => {
      active = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [timer?.startedAt, timer?.remainingMs, serverNow]);

  const running = timer?.startedAt != null;
  if (!running || !timer) return null;

  const total = timer.totalMs || 60000;
  const elapsed = Math.max(0, now - timer.startedAt);
  const remaining = Math.max(0, timer.remainingMs - elapsed);
  if (remaining <= 0) return null;

  const elapsedPct = Math.max(0, Math.min(100, ((total - remaining) / total) * 100));
  const isStart = remaining >= total - 1200;
  const isEnd = remaining <= 3000;

  return (
    <div className="w-full relative py-1 flex items-center animate-fade-in">
      <div className="w-full h-2 rounded-full bg-violet-950/80 border border-violet-500/30 overflow-hidden shadow-inner relative">
        <div
          className={`h-full rounded-full will-change-[width] ${
            isEnd
              ? "bg-gradient-to-r from-red-600 via-rose-500 to-amber-400 shadow-[0_0_12px_rgba(239,68,68,0.9)]"
              : "bg-gradient-to-r from-violet-600 via-sky-400 to-amber-300 shadow-[0_0_10px_rgba(56,189,248,0.6)]"
          }`}
          style={{ width: `${elapsedPct}%` }}
        />
      </div>
      <div
        className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 pointer-events-none rounded-full border will-change-[left] ${
          isEnd
            ? "w-4 h-4 bg-red-400 border-red-100 shadow-[0_0_14px_#ef4444] scale-125 animate-ping"
            : isStart
            ? "w-3.5 h-3.5 bg-sky-300 border-white shadow-[0_0_12px_#38bdf8] scale-125 animate-pulse"
            : "w-3 h-3 bg-amber-300 border-amber-100 shadow-[0_0_8px_#f59e0b]"
        }`}
        style={{ left: `${elapsedPct}%` }}
      />
    </div>
  );
}

function KhoiDong({ state, serverNow }: P) {
  const kd = state.khoiDong!;
  const seg = kd.segments[kd.segIdx];
  const isSolo = seg.kind === "solo";
  const seatId = isSolo ? (seg.seat as number) : kd.buzzedSeat;
  const currentSeat = seatId != null ? state.seats[seatId] : null;
  const seatColor = (currentSeat && SEAT_COLORS[currentSeat.id]) || "#7c3aed";

  const totalQ = seg.questions > 100 ? "" : `/${seg.questions}`;
  const qNum = Math.max(1, kd.qIdx + 1);

  if (!kd.started || (!kd.questionRevealed && kd.phase !== "segmentDone") || (!kd.current && kd.phase !== "segmentDone")) {
    return null;
  }

  const seats = activeSeats(state);
  const currentBuzzedSeat = kd.buzzedSeat;
  const currentSoloSeat = isSolo ? (seg.seat ?? null) : null;

  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col justify-between h-full min-h-0 py-0.5 gap-1">
      {/* ── SINGLE-LINE TOP BAR: Question number + 4 Contestant Shapes ── */}
      <div className="flex items-center justify-between gap-1.5 sm:gap-2 shrink-0 w-full">
        <div className="flex items-center gap-1.5 shrink-0">
          <span
            className="px-2 py-0.5 rounded-lg text-xs sm:text-sm font-black whitespace-nowrap shadow-sm"
            style={{
              background: "linear-gradient(90deg, rgba(245,158,11,0.25), rgba(239,68,68,0.25))",
              border: "1px solid rgba(245,158,11,0.45)",
              color: "#fbbf24",
            }}
          >
            Câu {qNum}{totalQ} · 10đ
          </span>
          {kd.current?.subject && (
            <span className="hidden md:inline-flex px-2 py-0.5 rounded-lg bg-violet-500/20 border border-violet-400/30 text-violet-200 font-bold text-xs items-center gap-1 whitespace-nowrap">
              <span>📚</span>
              <span>{kd.current.subject}</span>
            </span>
          )}
        </div>

        {/* 4 Contestant Shapes (Tên & Điểm trên cùng 1 hàng duy nhất) */}
        <div className="flex-1 grid grid-cols-4 gap-1 sm:gap-1.5 min-w-0">
          {seats.map((s) => {
            const isBuzzed = currentBuzzedSeat != null && currentBuzzedSeat === s.id;
            const isSoloTurn = !isBuzzed && currentSoloSeat != null && currentSoloSeat === s.id;
            const color = SEAT_COLORS[s.id] || "#38bdf8";

            if (isBuzzed) {
              return (
                <div
                  key={s.id}
                  className="rounded-lg border px-1.5 py-0.5 text-center transition-all animate-pulse shadow-[0_0_16px_#f59e0b] flex items-center justify-between min-w-0"
                  style={{
                    border: "1.5px solid #facc15",
                    borderLeft: "4px solid #facc15",
                    background: "linear-gradient(180deg, rgba(245, 158, 11, 0.45) 0%, rgba(217, 119, 6, 0.25) 100%)",
                  }}
                >
                  <span className="truncate font-black text-[11px] sm:text-xs text-amber-200 flex items-center gap-0.5">
                    <span>🔔</span>
                    <span>{s.name}</span>
                  </span>
                  <span className="font-black tabular-nums text-xs sm:text-sm text-amber-300 ml-1">
                    {s.score}
                  </span>
                </div>
              );
            }

            if (isSoloTurn) {
              return (
                <div
                  key={s.id}
                  className="rounded-lg border px-1.5 py-0.5 text-center transition-all flex items-center justify-between min-w-0"
                  style={{
                    border: `1.5px solid ${color}90`,
                    borderLeft: `4px solid ${color}`,
                    background: `linear-gradient(180deg, ${color}45 0%, ${color}20 100%)`,
                    boxShadow: `0 0 14px ${color}50, inset 0 0 8px ${color}30`,
                  }}
                >
                  <span className="truncate font-black text-[11px] sm:text-xs text-white">
                    {s.name}
                  </span>
                  <span className="font-black tabular-nums text-xs sm:text-sm ml-1" style={{ color, textShadow: `0 0 8px ${color}` }}>
                    {s.score}
                  </span>
                </div>
              );
            }

            return (
              <div
                key={s.id}
                className="rounded-lg border px-1.5 py-0.5 text-center transition-all border-violet-500/20 bg-gradient-to-b from-white/10 to-white/[0.03] flex items-center justify-between min-w-0"
                style={{ borderLeft: `3px solid ${color}` }}
              >
                <span className="truncate font-medium text-[11px] sm:text-xs text-slate-300">
                  {s.name}
                </span>
                <span className="font-bold tabular-nums text-xs sm:text-sm text-slate-200 ml-1">
                  {s.score}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main question card */}
      <div
        className="w-full relative rounded-xl sm:rounded-2xl flex flex-col justify-between flex-1 min-h-0"
        style={{
          background: "linear-gradient(160deg, rgba(26,13,63,0.95) 0%, rgba(15,7,40,0.98) 100%)",
          border: `1px solid ${seatColor}30`,
          boxShadow: `0 4px 20px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.08)`,
          padding: "4px 10px",
        }}
      >
        <div className="absolute top-0 left-0 right-0 h-0.5 rounded-t-2xl" style={{ background: `linear-gradient(90deg, ${seatColor}80, #ef4444aa, #7c3aedaa)` }} />

        <div className="w-full flex-1 flex flex-col justify-center items-center py-0.5 min-h-[44px]">
          {kd.phase === "segmentDone" ? (
            <div className="text-center space-y-1 animate-fade-in">
              <div
                className="text-2xl sm:text-3xl font-black"
                style={{ background: "linear-gradient(90deg,#fffbd0,#ffd700,#f59e0b)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}
              >
                KẾT THÚC LƯỢT THI
              </div>
              <div className="text-xs text-violet-300/60">Chuẩn bị sang phần thi tiếp theo…</div>
            </div>
          ) : !kd.current ? (
            <div className="text-violet-400/50 text-base font-medium animate-pulse">Đang đợi câu hỏi…</div>
          ) : !kd.questionRevealed ? (
            <div className="text-center py-1 space-y-1">
              <div
                className="text-lg sm:text-xl font-black tracking-wider uppercase animate-pulse"
                style={{ background: "linear-gradient(90deg,#fffbd0,#ffd700,#f59e0b)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}
              >
                SẴN SÀNG THI ĐẤU
              </div>
            </div>
          ) : (
            <div className="w-full text-center flex-1 flex flex-col items-center justify-center min-h-[44px]">
              <div className={`font-black text-white text-center select-text leading-snug break-words ${autoQuestionFontSize(kd.current.q)}`} style={{ textShadow: "0 2px 10px rgba(0,0,0,0.7)" }}>
                {kd.current.q}
              </div>
              {kd.current.media && (
                <MediaView url={kd.current.media} type={kd.current.mediaType} className="max-h-20 sm:max-h-28 rounded-xl mx-auto border border-violet-500/20 mt-1" />
              )}
            </div>
          )}

          {kd.buzzUnlockAt && kd.buzzUnlockAt > serverNow() && (
            <div className="mt-1 inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black animate-pulse bg-amber-500/15 border border-amber-400/50 text-amber-300">
              <span>🔒 Chuông mở sau:</span>
              <span className="font-mono">{Math.max(1, Math.ceil((kd.buzzUnlockAt - serverNow()) / 1000))}s</span>
            </div>
          )}

          {kd.buzzedSeat != null && (
            <div className="mt-1 inline-flex items-center gap-1.5 px-4 py-1 rounded-xl font-black text-sm sm:text-base text-slate-950 animate-bounce"
              style={{ background: "linear-gradient(90deg,#f59e0b,#ef4444)", boxShadow: "0 0 20px rgba(245,158,11,0.6)" }}>
              <span>🔔</span>
              <span>{seatName(state, kd.buzzedSeat)}</span>
            </div>
          )}
        </div>

        {(() => {
          const isO22OrBefore = state.rulesetId === "O22" || /^O(1[3-9]|2[0-2])$/.test(state.rulesetId);
          if (isO22OrBefore) {
            if (!kd.globalTimer) return null;
            return (
              <div className="shrink-0 pt-1 border-t border-violet-500/15">
                <DisplayTimerBar timer={kd.globalTimer} serverNow={serverNow} />
              </div>
            );
          }
          if (kd.timer && kd.timer.startedAt != null) {
            return (
              <div className="shrink-0 pt-1 border-t border-violet-500/15">
                <DisplayTimerBar timer={kd.timer} serverNow={serverNow} />
              </div>
            );
          }
          return null;
        })()}
      </div>

      {kd.phase === "result" && kd.current?.a && (
        <div
          className="w-full shrink-0 rounded-xl px-4 py-2 flex items-center justify-center gap-2 animate-fade-in shadow-xl backdrop-blur-md"
          style={{
            background: "linear-gradient(135deg, rgba(6, 78, 59, 0.95) 0%, rgba(4, 120, 87, 0.9) 100%)",
            border: "1.5px solid #10b981",
            boxShadow: "0 0 20px rgba(16, 185, 129, 0.4)",
          }}
        >
          <span className="text-emerald-300 font-black text-xs sm:text-sm uppercase tracking-wider flex items-center gap-1.5">
            <span>✔</span>
            <span>ĐÁP ÁN:</span>
          </span>
          <span className="text-white font-black text-base sm:text-xl drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)]">
            {kd.current.a}
          </span>
        </div>
      )}
    </div>
  );
}

function Vcnv({ state, serverNow, isLowerThird }: P) {
  const v = state.vcnv!;
  const cur = v.currentRow >= 0 && v.currentRow < 4 ? v.rows[v.currentRow] : null;
  const isCenterRow = v.currentRow === 4;
  const isTimerRunning = v.timer?.startedAt != null;

  // In VCNV when 15s countdown runs, hide the crossword rows and puzzle pieces so only question prompt and answers show!
  const showBoard = !isTimerRunning;

  return (
    <div className="w-full max-w-[94vw] lg:max-w-6xl mx-auto flex flex-col justify-between py-2 sm:py-4 gap-3 sm:gap-4 animate-fade-in">
      {showBoard && (
        <>
          <div className="relative mx-auto rounded-2xl overflow-hidden border-2 border-cyan-500/30 bg-[#0d0728] shadow-[0_0_35px_rgba(0,180,255,0.25)] aspect-[16/7] w-full max-h-[38vh]">
            {v.mysteryImage && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={v.mysteryImage} alt="" className="absolute inset-0 w-full h-full object-cover" />
            )}
            <div className="absolute inset-0 grid grid-cols-2 grid-rows-2">
              {v.rows.map((_r, i) => (
                <div
                  key={i}
                  className={`flex items-center justify-center border border-violet-900 transition-all duration-700 ${v.piecesRevealed[i] ? "opacity-0" : "bg-violet-950/95 opacity-100"}`}
                >
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full border-2 border-amber-300/80 bg-slate-950/80 flex items-center justify-center text-3xl sm:text-4xl font-black text-amber-300 shadow-[0_0_20px_rgba(245,158,11,0.5)]">
                    {i + 1}
                  </div>
                </div>
              ))}
            </div>
            <div
              className={`absolute inset-1/4 rounded-2xl border-2 flex items-center justify-center transition-all duration-700 ${
                v.piecesRevealed[4] ? "opacity-0 pointer-events-none" : "opacity-100"
              }`}
              style={{ background: "rgba(10,5,28,0.95)", borderColor: "rgba(245,158,11,0.7)", color: "#fbbf24", boxShadow: "0 0 25px rgba(245,158,11,0.4)" }}
            >
              <div className="flex flex-col items-center gap-1">
                <span className="text-2xl sm:text-3xl">⭐</span>
                <span className="text-lg sm:text-2xl font-black uppercase tracking-wider">Ô Trung Tâm</span>
              </div>
            </div>
          </div>

          <div className="space-y-1.5 w-full">
            {v.rows.map((r, i) => (
              <div
                key={i}
                className={`flex items-center gap-3 sm:gap-4 rounded-xl px-3 sm:px-4 py-2 border text-base sm:text-lg transition-all ${
                  v.currentRow === i
                    ? "border-amber-400/80 bg-amber-500/15 shadow-[0_0_16px_rgba(245,158,11,0.3)]"
                    : "border-cyan-500/20 bg-slate-950/60"
                }`}
              >
                <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-full border-2 border-amber-400 bg-amber-500/20 flex items-center justify-center font-black text-base sm:text-lg text-amber-300 shadow-[0_0_10px_#f59e0b] shrink-0">
                  {i + 1}
                </div>
                <span className="flex-1 font-bold">
                  {r.opened || (v.answersRevealed && v.currentRow === i) ? (
                    <b className="tracking-widest text-amber-200 text-lg sm:text-xl">{r.answer}</b>
                  ) : v.currentRow === i ? (
                    <span className="text-white">{r.hint}</span>
                  ) : (
                    <span className="tracking-widest text-slate-400">••••••••••</span>
                  )}
                </span>
                {r.wrong && <span className="text-rose-400 text-xl font-black">✘</span>}
              </div>
            ))}
          </div>
        </>
      )}

      {/* Row question during 15s timer */}
      {(cur || isCenterRow) && (
        <div className="space-y-3 sm:space-y-4 text-center animate-fade-in w-full">
          {/* Top Bar with Circular Badge */}
          <div className="flex items-center justify-center gap-2.5 sm:gap-3 shrink-0">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full border-2 border-amber-400 bg-gradient-to-br from-amber-400/30 to-amber-600/30 flex items-center justify-center font-black text-xl sm:text-2xl text-amber-300 shadow-[0_0_18px_#f59e0b]">
              {isCenterRow ? "⭐" : v.currentRow + 1}
            </div>
            <div className="text-base sm:text-2xl font-black text-amber-300 uppercase tracking-widest drop-shadow-[0_2px_8px_rgba(245,158,11,0.6)]">
              {isCenterRow ? "CÂU HỎI Ô TRUNG TÂM" : `HÀNG NGANG SỐ ${v.currentRow + 1} · ${cur?.answer.replace(/\s/g, "").length} CHỮ CÁI`}
            </div>
          </div>

          {/* Grand Expansive Question Container */}
          <div className="w-full rounded-2xl sm:rounded-3xl p-5 sm:p-8 border-2 border-cyan-400/40 bg-gradient-to-b from-[#091536]/95 via-[#04091c]/95 to-[#020510]/95 shadow-[0_0_40px_rgba(0,210,255,0.3)] flex flex-col items-center justify-center min-h-[140px] sm:min-h-[180px]">
            <div className="text-2xl sm:text-4xl md:text-5xl font-black text-white text-center leading-snug drop-shadow-[0_4px_16px_rgba(0,0,0,0.85)] max-w-5xl">
              {isCenterRow ? v.centerQuestion?.q : cur?.hint}
            </div>
          </div>

          {/* Centered Large Circular Radial Dial Timer (150px) */}
          <div className="flex items-center justify-center my-1 sm:my-2">
            <CircularTimer timer={v.timer} serverNow={serverNow} size={150} strokeWidth={11} />
          </div>

          {/* 4 Contestant Circles (Ô Tròn Thí Sinh) */}
          <div className="grid grid-cols-4 gap-2 sm:gap-4 w-full max-w-4xl mx-auto">
            {activeSeats(state).map((s) => {
              const hasBuzzed = v.bells.some((b) => b.seat === s.id);
              const col = SEAT_COLORS[s.id] || "#38bdf8";
              return (
                <div
                  key={s.id}
                  className={`rounded-2xl p-2 sm:p-3 border flex flex-col items-center gap-1.5 transition-all ${
                    hasBuzzed
                      ? "border-amber-400 bg-amber-500/20 shadow-[0_0_20px_#f59e0b] animate-bounce"
                      : "border-white/10 bg-slate-900/60"
                  }`}
                >
                  <div
                    className="w-10 h-10 sm:w-12 sm:h-12 rounded-full border-2 flex items-center justify-center font-black text-sm sm:text-base"
                    style={{ borderColor: col, background: `${col}25`, color: col, boxShadow: `0 0 12px ${col}60` }}
                  >
                    {hasBuzzed ? "🔔" : (s.id + 1)}
                  </div>
                  <span className="font-bold text-xs sm:text-sm text-slate-200 truncate max-w-full">{s.name}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Candidate Answers Revealed */}
      {v.answersRevealed && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 w-full max-w-5xl mx-auto animate-fade-in">
          {activeSeats(state).map((s) => (
            <div
              key={s.id}
              className="rounded-2xl bg-[#091536]/90 border border-cyan-500/30 p-3 sm:p-4 text-center shadow-xl flex flex-col items-center gap-1.5"
            >
              <div
                className="w-10 h-10 rounded-full border-2 flex items-center justify-center font-black text-sm"
                style={{ borderColor: SEAT_COLORS[s.id], color: SEAT_COLORS[s.id] }}
              >
                {s.id + 1}
              </div>
              <div className="text-xs sm:text-sm font-bold truncate max-w-full" style={{ color: SEAT_COLORS[s.id] }}>
                {s.name}
              </div>
              <div className="text-base sm:text-xl font-black text-amber-200 mt-1">{v.answers[s.id]?.text || "—"}</div>
            </div>
          ))}
        </div>
      )}

      {v.bells.length > 0 && (
        <div className="text-center text-xl sm:text-2xl text-amber-300 font-black animate-pulse drop-shadow-[0_0_15px_#f59e0b]">
          🔔 {v.bells.map((b) => seatName(state, b.seat)).join(" → ")}
        </div>
      )}

      {v.solvedBy != null && (
        <div className="text-center text-3xl sm:text-5xl font-black text-emerald-300 drop-shadow-[0_0_25px_#10b981]">
          🎉 {seatName(state, v.solvedBy)} GIẢI ĐƯỢC CHƯỚNG NGẠI VẬT!
        </div>
      )}
    </div>
  );
}

function TangToc({ state, serverNow }: P) {
  const tt = state.tangToc!;
  const q = tt.questions[tt.qIdx];
  if (tt.phase === "idle") return null;

  return (
    <div className="w-full max-w-[94vw] lg:max-w-6xl mx-auto flex flex-col justify-between py-2 sm:py-4 gap-3 sm:gap-4 text-center animate-fade-in">
      {/* ── TOP BAR: Circular Question Number Badge + Point Tier Circles ── */}
      <div className="flex items-center justify-between gap-3 w-full border-b border-cyan-500/25 pb-2">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full border-2 border-amber-400 bg-amber-500/20 flex items-center justify-center font-black text-xl sm:text-2xl text-amber-300 shadow-[0_0_18px_#f59e0b]">
            {tt.qIdx + 1}
          </div>
          <div className="text-left">
            <div className="text-base sm:text-xl font-black text-white uppercase tracking-wider">
              TĂNG TỐC — CÂU HỎI SỐ {tt.qIdx + 1} / {tt.questions.length}
            </div>
            <div className="text-xs text-cyan-300/80 font-bold">Thời gian tối đa: {q?.type === "video" ? "30s" : "20s - 40s"}</div>
          </div>
        </div>

        {/* 4 Circular Point Step Badges (40đ - 30đ - 20đ - 10đ) */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {[40, 30, 20, 10].map((pts) => (
            <div
              key={pts}
              className="w-10 h-10 sm:w-12 sm:h-12 rounded-full border border-amber-400/60 bg-amber-500/15 flex items-center justify-center font-mono font-black text-xs sm:text-sm text-amber-300 shadow-[0_0_10px_rgba(245,158,11,0.3)]"
            >
              {pts}đ
            </div>
          ))}
        </div>
      </div>

      {/* ── EXPANSIVE MEDIA / CLUE IMAGE CONTAINER ── */}
      {q && (
        <div className="space-y-3 w-full">
          {q.q && (
            <div className="text-2xl sm:text-3xl md:text-4xl font-black text-white leading-snug drop-shadow-[0_4px_16px_rgba(0,0,0,0.85)] max-w-5xl mx-auto">
              {q.q}
            </div>
          )}

          {q.clueImages && q.clueImages.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 w-full max-w-6xl mx-auto">
              {q.clueImages.map((cl, idx) => (
                <div key={idx} className="rounded-2xl overflow-hidden border-2 border-cyan-500/30 bg-[#091536]/80 p-1.5 shadow-xl">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={cl.url} alt={cl.label || `Gợi ý ${idx + 1}`} className="w-full h-40 sm:h-56 object-cover rounded-xl" />
                  <div className="text-xs sm:text-sm text-amber-300 font-black mt-2">
                    {cl.label || `Dữ kiện ${idx + 1}`} ({cl.atSec}s)
                  </div>
                </div>
              ))}
            </div>
          ) : (
            q.media && (
              <MediaView url={q.media} type={q.type} className="max-h-[46vh] w-auto mx-auto rounded-2xl border-2 border-cyan-500/30 shadow-2xl" />
            )
          )}
        </div>
      )}

      {/* ── CENTERED LARGE CIRCULAR RADIAL DIAL TIMER (150px) ── */}
      {tt.phase === "question" && (
        <div className="flex items-center justify-center my-2 sm:my-3">
          <CircularTimer timer={tt.timer} serverNow={serverNow} size={150} strokeWidth={11} />
        </div>
      )}

      {/* ── RANKED ANSWER RESULTS WITH CIRCULAR BADGES ── */}
      {(tt.phase === "ranking" || tt.phase === "graded") && (
        <div className="space-y-2.5 max-w-3xl mx-auto w-full animate-fade-in">
          {tt.correctAnswer && (
            <div className="text-2xl sm:text-4xl font-black text-emerald-300 uppercase tracking-wider py-1 drop-shadow-[0_0_15px_#10b981]">
              ✔ ĐÁP ÁN: {tt.correctAnswer}
            </div>
          )}
          {tt.ranking.map((r, i) => {
            const col = SEAT_COLORS[r.seat] || "#38bdf8";
            return (
              <div
                key={r.seat}
                className={`flex items-center gap-3 sm:gap-4 rounded-2xl px-4 py-2.5 text-base sm:text-lg border transition shadow-xl ${
                  r.wrong
                    ? "border-rose-500/50 bg-rose-950/40"
                    : "border-cyan-500/30 bg-[#091536]/85"
                }`}
              >
                {/* Circular Rank Badge */}
                <div
                  className="w-10 h-10 sm:w-11 sm:h-11 rounded-full border-2 flex items-center justify-center font-black text-base sm:text-lg shrink-0 shadow-md"
                  style={{ borderColor: col, color: col, background: `${col}20` }}
                >
                  {i + 1}
                </div>
                <b style={{ color: col }} className="w-36 text-left truncate text-base sm:text-lg">
                  {seatName(state, r.seat)}
                </b>
                <span className="flex-1 text-left font-bold text-white text-base sm:text-xl">
                  {r.noAnswer ? "—" : r.answer}
                </span>
                <span className="tabular-nums font-mono text-xs sm:text-sm text-cyan-300/80">
                  {r.noAnswer ? "" : `${(r.ms / 1000).toFixed(2)}s`}
                </span>
                {r.points ? (
                  <span className="px-2.5 py-1 rounded-xl bg-amber-500/20 border border-amber-400 text-amber-300 font-black text-sm sm:text-base shadow-[0_0_10px_#f59e0b]">
                    +{r.points}
                  </span>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function VeDich({ state, serverNow }: P) {
  const vd = state.veDich!;
  const owner = vd.order[vd.turnIdx];
  const cur = vd.current;
  return (
    <div className="w-full max-w-5xl text-center space-y-1.5 flex flex-col justify-between h-full min-h-0 py-0.5">
      <div className="flex items-center justify-center gap-2">
        <span className="text-base sm:text-lg font-black" style={{ color: SEAT_COLORS[owner] }}>
          {seatName(state, owner)}
        </span>
        {cur?.q.subject && (
          <span className="px-2 py-0.5 rounded-full bg-violet-500/20 border border-violet-400/30 text-violet-200 text-xs font-bold">
            📚 {cur.q.subject} ({cur.points} điểm)
          </span>
        )}
        {vd.hopeStarActive && (
          <span className="text-xs sm:text-sm font-black text-amber-300 animate-pulse">⭐ NGÔI SAO HY VỌNG ⭐</span>
        )}
      </div>

      {vd.phase === "choosing" && <div className="text-sm sm:text-base text-violet-200/60 font-medium">Đang chọn gói câu hỏi…</div>}

      {vd.packages[owner] && !cur && (
        <div className="flex justify-center gap-2">
          {vd.packages[owner].map((p, i) => (
            <div
              key={i}
              className={`w-12 h-12 sm:w-16 sm:h-16 rounded-xl flex items-center justify-center text-lg sm:text-2xl font-black border transition-all ${
                vd.qIdx === i
                  ? "text-slate-950 border-amber-300"
                  : "border-violet-500/30 bg-white/5 text-violet-200"
              }`}
              style={vd.qIdx === i ? { background: "linear-gradient(135deg,#f59e0b,#ef4444)", boxShadow: "0 0 20px rgba(245,158,11,0.5)" } : {}}
            >
              {p.points}
            </div>
          ))}
        </div>
      )}

      {cur && (
        <div className="w-full flex-1 flex flex-col items-center justify-center min-h-[44px]">
          <div className={`font-black select-text leading-snug break-words text-white ${autoQuestionFontSize(cur.q.q)}`}>{cur.q.q}</div>
          {cur.q.media && (
            <MediaView url={cur.q.media} type={cur.q.mediaType} className="max-h-20 sm:max-h-28 rounded-xl mx-auto border border-violet-500/20 mt-1" />
          )}
          
          <div className="w-full max-w-md mx-auto mt-1">
            <Timer timer={vd.steal && vd.phase === "stealing" ? vd.steal.timer : vd.timer} serverNow={serverNow} big />
          </div>
          {vd.phase === "stealing" && (
            <div className="text-lg sm:text-xl font-black text-rose-400 animate-pulse mt-0.5">
              🚨 CƯỚP ĐIỂM {vd.steal?.buzzedSeat != null ? `— ${seatName(state, vd.steal.buzzedSeat)}` : ""}
            </div>
          )}
        </div>
      )}
      {vd.phase === "seatDone" && (
        <div className="text-xl sm:text-2xl font-black text-amber-300">Hoàn thành lượt thi</div>
      )}
    </div>
  );
}

function Chp({ state, serverNow }: P) {
  const cp = state.cauHoiPhu!;
  const q = cp.questions[cp.qIdx];
  return (
    <div className="max-w-5xl mx-auto text-center space-y-3 w-full">
      <div className="text-base text-amber-300 font-bold">
        Câu hỏi phụ — {cp.tied.map((i) => seatName(state, i)).join(" · ")}
      </div>
      {q && cp.phase !== "idle" && (
        <div className={`font-bold leading-tight select-text ${autoQuestionFontSize(q.q)}`}>{q.q}</div>
      )}
      {cp.phase === "result" && q?.a && (
        <div className="text-3xl text-emerald-300 font-bold">Đáp án: {q.a}</div>
      )}
      {cp.buzzedSeat != null && (
        <div className="text-3xl font-black text-amber-300">🔔 {seatName(state, cp.buzzedSeat)}</div>
      )}
      {cp.winner != null && (
        <div className="text-4xl font-black text-emerald-300">🏆 {seatName(state, cp.winner)}</div>
      )}
      <div className="max-w-md mx-auto">
        <Timer timer={cp.timer} serverNow={serverNow} big />
      </div>
    </div>
  );
}
