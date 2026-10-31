"use client";

import { useState, useRef, useEffect } from "react";
import dynamic from "next/dynamic";
import { ROUND_LABELS, type OlympiaState } from "@/lib/olympia/types";
import { useOlympiaAudio, useOlympiaSocket } from "./hooks";
import { MediaView, ScoreStrip, SEAT_COLORS, Timer, activeSeats, seatName } from "./ui";
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
      return v.phase === "question" || v.phase === "answers";
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
  const isLowerThird = (state.overlayMode ?? "LOWER_THIRD") === "LOWER_THIRD";
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
            <div className="w-full px-2 sm:px-4 pb-1 sm:pb-2 pt-0 pointer-events-auto flex flex-col justify-end z-20 animate-fade-in">
              <div
                className="w-full max-w-5xl mx-auto rounded-xl sm:rounded-2xl bg-slate-950/95 backdrop-blur-md border border-white/15 shadow-[0_6px_28px_rgba(0,0,0,0.85)] p-1 sm:p-2 flex flex-col justify-between"
                style={{ minHeight: "105px", maxHeight: "25vh" }}
              >
                {state.currentRound === "khoiDong" && <KhoiDong state={state} serverNow={serverNow} />}
                {state.currentRound === "vcnv" && <Vcnv state={state} serverNow={serverNow} isLowerThird={true} />}
                {state.currentRound === "tangToc" && <TangToc state={state} serverNow={serverNow} />}
                {state.currentRound === "veDich" && <VeDich state={state} serverNow={serverNow} />}
                {state.currentRound === "cauHoiPhu" && <Chp state={state} serverNow={serverNow} />}
              </div>
            </div>
          ) : (
            /* ── FULLSCREEN CENTERED OVERLAY ── */
            <div className="absolute inset-0 flex items-center justify-center p-4 bg-[#050818]/85 backdrop-blur-md pointer-events-auto animate-fade-in">
              <div className="w-full max-w-5xl h-full flex items-center justify-center">
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

  // In lower-third mode while 15s timer runs: hide big mystery board so 3D camera transitions take center stage!
  const showBoard = !isLowerThird || !isTimerRunning;

  return (
    <div className="w-full max-w-5xl mx-auto space-y-2">
      {showBoard && (
        <>
          <div className="relative mx-auto rounded-xl overflow-hidden border border-violet-500/20 bg-[#1a0d3f] aspect-[16/7]" style={{ maxHeight: "24vh" }}>
            {v.mysteryImage && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={v.mysteryImage} alt="" className="absolute inset-0 w-full h-full object-cover" />
            )}
            <div className="absolute inset-0 grid grid-cols-2 grid-rows-2">
              {v.rows.map((_r, i) => (
                <div
                  key={i}
                  className={`flex items-center justify-center text-3xl font-black border border-violet-900 transition-all duration-700 ${v.piecesRevealed[i] ? "opacity-0" : "bg-violet-900/95 opacity-100"}`}
                >
                  {i + 1}
                </div>
              ))}
            </div>
            <div
              className={`absolute inset-1/4 rounded-xl border-2 flex items-center justify-center text-xl font-black transition-all duration-700 ${
                v.piecesRevealed[4] ? "opacity-0 pointer-events-none" : "opacity-100"
              }`}
              style={{ background: "rgba(13,8,32,0.95)", borderColor: "rgba(245,158,11,0.6)", color: "#fbbf24", boxShadow: "0 0 20px rgba(245,158,11,0.3)" }}
            >
              Ô Trung Tâm
            </div>
          </div>

          <div className="space-y-1">
            {v.rows.map((r, i) => (
              <div
                key={i}
                className={`flex items-center gap-3 rounded-lg px-3 py-1.5 border text-base transition-all ${
                  v.currentRow === i
                    ? "border-amber-400/50 bg-amber-500/10 shadow-[0_0_12px_rgba(245,158,11,0.2)]"
                    : "border-violet-500/15 bg-white/[0.03]"
                }`}
              >
                <span className="w-5 font-black text-amber-400">{i + 1}</span>
                <span className="flex-1">
                  {r.opened || (v.answersRevealed && v.currentRow === i) ? <b className="tracking-widest text-amber-100">{r.answer}</b> : v.currentRow === i ? r.hint : "••••••"}
                </span>
                {r.wrong && <span className="text-red-400">✘</span>}
              </div>
            ))}
          </div>
        </>
      )}

      {/* Row question during 15s timer */}
      {(cur || isCenterRow) && (
        <div className="space-y-1 text-center animate-fade-in">
          <div className="text-xs font-bold text-amber-300 uppercase tracking-wider">
            {isCenterRow ? "⭐ CÂU HỎI Ô TRUNG TÂM" : `HÀNG NGANG SỐ ${v.currentRow + 1} (${cur?.answer.replace(/\s/g, "").length} CHỮ CÁI)`}
          </div>
          <div className="text-lg sm:text-xl font-black text-white leading-snug">
            {isCenterRow ? v.centerQuestion?.q : cur?.hint}
          </div>
          <div className="max-w-md mx-auto">
            <Timer timer={v.timer} serverNow={serverNow} big />
          </div>
        </div>
      )}

      {v.answersRevealed && (
        <div className="grid grid-cols-4 gap-2">
          {activeSeats(state).map((s) => (
            <div key={s.id} className="rounded-lg bg-white/5 border border-violet-500/15 p-1.5 text-center">
              <div className="text-[11px] font-bold" style={{ color: SEAT_COLORS[s.id] }}>{s.name}</div>
              <div className="text-base font-bold">{v.answers[s.id]?.text || "—"}</div>
            </div>
          ))}
        </div>
      )}

      {v.bells.length > 0 && (
        <div className="text-center text-xl text-amber-300 font-black animate-pulse">
          🔔 {v.bells.map((b) => seatName(state, b.seat)).join(" → ")}
        </div>
      )}

      {v.solvedBy != null && (
        <div className="text-center text-3xl font-black text-emerald-300">
          🎉 {seatName(state, v.solvedBy)} giải được chướng ngại vật!
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
    <div className="w-full max-w-5xl text-center space-y-3">
      <div className="text-sm text-violet-300 font-bold">
        Câu {Math.max(1, tt.qIdx + 1)}/{tt.questions.length}
      </div>
      {q && (
        <>
          {q.q && (
            <div className={`font-bold select-text leading-tight ${autoQuestionFontSize(q.q)}`}>{q.q}</div>
          )}
          {q.clueImages && q.clueImages.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 max-w-4xl mx-auto">
              {q.clueImages.map((cl, idx) => (
                <div key={idx} className="rounded-xl overflow-hidden border border-violet-500/20 bg-violet-900/50 p-1">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={cl.url} alt={cl.label || `Gợi ý ${idx + 1}`} className="w-full h-28 object-cover rounded-lg" />
                  <div className="text-[11px] text-amber-300 font-bold mt-1">{cl.label || `Dữ kiện ${idx + 1}`} ({cl.atSec}s)</div>
                </div>
              ))}
            </div>
          ) : (
            <MediaView url={q.media} type={q.type} className="max-h-[30vh] rounded-xl mx-auto" />
          )}
        </>
      )}
      {tt.phase === "question" && (
        <div className="max-w-md mx-auto">
          <Timer timer={tt.timer} serverNow={serverNow} big />
        </div>
      )}
      {(tt.phase === "ranking" || tt.phase === "graded") && (
        <div className="space-y-1.5 max-w-2xl mx-auto">
          {tt.correctAnswer && (
            <div className="text-2xl text-emerald-300 font-bold">Đáp án: {tt.correctAnswer}</div>
          )}
          {tt.ranking.map((r, i) => (
            <div
              key={r.seat}
              className={`flex items-center gap-3 rounded-xl px-3 py-1.5 text-base border transition ${
                r.wrong
                  ? "border-rose-500/40 bg-rose-500/10"
                  : "border-violet-500/15 bg-white/[0.04]"
              }`}
            >
              <span className="w-5 text-violet-400">{i + 1}</span>
              <b style={{ color: SEAT_COLORS[r.seat] }} className="w-32 text-left truncate">{seatName(state, r.seat)}</b>
              <span className="flex-1 text-left">{r.noAnswer ? "—" : r.answer}</span>
              <span className="tabular-nums text-xs text-violet-400/60">{r.noAnswer ? "" : `${(r.ms / 1000).toFixed(2)}s`}</span>
              {r.points ? <span className="text-amber-300 font-black">+{r.points}</span> : null}
            </div>
          ))}
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
