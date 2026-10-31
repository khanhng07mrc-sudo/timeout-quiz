"use client";

import { useState, useRef, useEffect } from "react";
import dynamic from "next/dynamic";
import { ROUND_LABELS, type OlympiaState } from "@/lib/olympia/types";
import { useOlympiaAudio, useOlympiaSocket, useCountdown } from "./hooks";
import { MediaView, ScoreStrip, SEAT_COLORS, Timer, activeSeats, seatName } from "./ui";

const OlympiaStudio3DScene = dynamic(() => import("./OlympiaStudio3DScene"), {
  ssr: false,
  loading: () => (
    <div className="absolute inset-0 flex items-center justify-center bg-[#020510] text-amber-300 text-sm font-bold">
      Đang tải Trường quay 3D…
    </div>
  ),
});

export default function DisplayScreen({ code }: { code: string }) {
  const { state, join, connected, serverNow } = useOlympiaSocket({ code, role: "display" });
  const [audioOn, setAudioOn] = useState(true);
  const [show3DStudio, setShow3DStudio] = useState(false);
  useOlympiaAudio(state, join?.audioSeason, audioOn);
  // introRemainingMs not used for display anymore (canvas is infinite), kept for type safety
  const _introRemainingMs = useCountdown(state?.introTimer, serverNow); void _introRemainingMs;

  if (join && !join.ok) return <div className="fixed inset-0 w-full h-full flex items-center justify-center bg-black p-10 text-rose-300 text-2xl">{join.error}</div>;
  if (!state)
    return (
      <div className="fixed inset-0 w-full h-full flex items-center justify-center bg-gradient-to-b from-[#060814] via-[#0a0f24] to-[#03040a] text-violet-300 text-2xl font-bold">
        Đang kết nối…
      </div>
    );

  const origin = typeof window !== "undefined" ? window.location.origin : "";

  // Canvas is shown when introTimer active OR host manually enabled stage graphics
  const showCanvas = state.stage === "playing" && (!!state.introTimer || !!state.showStageGraphics);
  const isIntro = state.stage === "playing" && !!state.introTimer;

  return (
    <div className="fixed inset-0 w-full h-full min-h-screen overflow-hidden bg-gradient-to-b from-[#060814] via-[#0a0f24] to-[#03040a] text-white flex flex-col select-none">
      {/* Ambient background orbs */}
      <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-violet-600/8 blur-[100px] pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-amber-500/6 blur-[100px] pointer-events-none" />

      {/* ✅ FULL-SCREEN hexagonal LED canvas — z-40, covers header + score strip */}
      {showCanvas && (
        <div className="fixed inset-0 w-full h-full z-40 pointer-events-none">
          <OlympiaIntroCanvas isIntro={isIntro} />
        </div>
      )}

      {/* Scoreboard overlay — z-50 above canvas */}
      {state.showScoreboard && (
        <div className="absolute inset-0 z-50 bg-[#0d0820]/97 flex flex-col items-center justify-center p-6 animate-fade-in backdrop-blur-md">
          <h2 className="text-3xl sm:text-4xl font-black mb-6 tracking-wider"
            style={{ background: "linear-gradient(90deg,#f59e0b,#ef4444,#7c3aed)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
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

      {/* Header bar */}
      <div className="shrink-0 flex items-center justify-between px-3 py-2 border-b border-violet-500/15 bg-black/20">
        <div className="flex items-center gap-2">
          <span className="text-lg">🏔️</span>
          <span
            className="text-sm sm:text-base font-black tracking-wide"
            style={{ background: "linear-gradient(90deg,#f59e0b,#ef4444,#7c3aed)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}
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
            className={`px-2 py-1 border rounded-lg transition text-xs font-bold flex items-center gap-1.5 cursor-pointer ${
              show3DStudio
                ? "bg-amber-400 text-slate-950 border-amber-300 shadow-[0_0_8px_#f59e0b]"
                : "border-violet-400/30 hover:bg-violet-500/15 text-violet-200"
            }`}
            onClick={() => setShow3DStudio((v) => !v)}
            title={show3DStudio ? "Chuyển về Giao diện 2D" : "Bật Trường quay 3D Olympia"}
          >
            <span>🎥</span>
            <span>{show3DStudio ? "3D Studio" : "2D"}</span>
          </button>
          <button
            className="px-2 py-1 border border-violet-400/30 rounded-lg hover:bg-violet-500/15 transition text-xs"
            onClick={() => setAudioOn((v) => !v)}
          >
            {audioOn ? "🔊" : "🔈"}
          </button>
          <span>{connected ? "🟢" : "🔴"}</span>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden relative">
        {show3DStudio && (
          <div className="absolute inset-0 z-0 w-full h-full">
            <OlympiaStudio3DScene state={state} serverNow={serverNow} />
          </div>
        )}
        <div className={`flex-1 min-h-0 flex items-center justify-center overflow-hidden px-3 py-2 relative z-10 ${show3DStudio ? "pointer-events-none" : ""}`}>
          {/* Khi ở sảnh chờ: màn trống chỉ chứa hình nền trường quay chuẩn Olympia */}
          {state.stage === "finished" && (
            <div className="pointer-events-auto">
              <Podium state={state} />
            </div>
          )}

          {/* Round banner: shown when NOT in canvas mode, and there's a banner */}
          {state.stage === "playing" && !state.introTimer && !state.showStageGraphics && state.banner && (
            <div className="text-center animate-fade-in flex items-center justify-center h-full pointer-events-auto">
              <div
                className="font-black tracking-[0.12em] uppercase animate-fade-in"
                style={{
                  fontSize: "clamp(2.8rem, 9vw, 6.5rem)",
                  lineHeight: 1,
                  background: "linear-gradient(135deg, #00bfff, #ffffff 50%, #1e90ff)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  filter: "drop-shadow(0 0 25px rgba(0,191,255,0.6))",
                }}
              >
                {state.banner}
              </div>
            </div>
          )}

          {state.stage === "playing" && !state.banner && !state.introTimer && !state.showStageGraphics && (
            <div className="w-full h-full flex items-center justify-center pointer-events-auto">
              {state.currentRound === "khoiDong" && <KhoiDong state={state} serverNow={serverNow} />}
              {state.currentRound === "vcnv" && <Vcnv state={state} serverNow={serverNow} />}
              {state.currentRound === "tangToc" && <TangToc state={state} serverNow={serverNow} />}
              {state.currentRound === "veDich" && <VeDich state={state} serverNow={serverNow} />}
              {state.currentRound === "cauHoiPhu" && <Chp state={state} serverNow={serverNow} />}
            </div>
          )}
        </div>

        {/* Score strip (ở Khởi Động các ô tên/điểm đã được đẩy lên trên đầu cạnh câu hỏi) */}
        {state.stage !== "lobby" && state.currentRound !== "khoiDong" && (
          <div className="shrink-0 px-2 pb-2 relative z-10 pointer-events-auto">
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

type P = { state: OlympiaState; serverNow: () => number };

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
        style={{ background: "linear-gradient(90deg,#f59e0b,#ef4444)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}
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
        style={{ background: "linear-gradient(90deg,#f59e0b,#ef4444,#7c3aed)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}
      >
        KẾT QUẢ CHUNG CUỘC
      </div>
      {r.map((s, i) => (
        <div key={s.id} className="text-3xl" style={{ color: i === 0 ? "#f59e0b" : "white" }}>
          {["🥇", "🥈", "🥉"][i] ?? `${i + 1}.`} {s.name} — <b>{s.score}</b>
        </div>
      ))}
    </div>
  );
}

function autoQuestionFontSize(text: string) {
  const len = text.length;
  if (len <= 45) return "text-2xl sm:text-3xl md:text-4xl leading-tight";
  if (len <= 90) return "text-xl sm:text-2xl md:text-3xl leading-snug";
  if (len <= 140) return "text-lg sm:text-xl md:text-2xl leading-snug";
  return "text-base sm:text-lg md:text-xl leading-normal";
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

  // Chạy từ trái sang phải mượt mà 60 FPS không giật lag
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

  // Olympia TV Display rule: Khi phần khởi động chạy mới kích hoạt hiển thị đồ hoạ
  if (!kd.started || (!kd.questionRevealed && kd.phase !== "segmentDone") || (!kd.current && kd.phase !== "segmentDone")) {
    return null;
  }

  // Contestant seats for single-row header
  const seats = activeSeats(state);
  const currentBuzzedSeat = kd.buzzedSeat;
  const currentSoloSeat = isSolo ? (seg.seat ?? null) : null;

  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col h-full min-h-0 py-1 gap-2">
      {/* ── SINGLE-LINE TOP BAR: Question number + 4 Contestant Shapes ── */}
      <div className="flex items-center justify-between gap-1.5 sm:gap-2 shrink-0 w-full">
        {/* Question Counter Badge */}
        <div className="flex items-center gap-1.5 shrink-0">
          <span
            className="px-2.5 py-1 rounded-xl text-xs sm:text-sm font-black whitespace-nowrap shadow-sm"
            style={{
              background: "linear-gradient(90deg, rgba(245,158,11,0.25), rgba(239,68,68,0.25))",
              border: "1px solid rgba(245,158,11,0.45)",
              color: "#fbbf24",
            }}
          >
            Câu {qNum}{totalQ} · 10đ
          </span>
          {kd.current?.subject && (
            <span className="hidden md:inline-flex px-2.5 py-1 rounded-xl bg-violet-500/20 border border-violet-400/30 text-violet-200 font-bold text-xs items-center gap-1 whitespace-nowrap">
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
                  className="rounded-lg border px-1.5 py-1 text-center transition-all animate-pulse shadow-[0_0_16px_#f59e0b] flex items-center justify-between min-w-0"
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
                  className="rounded-lg border px-1.5 py-1 text-center transition-all flex items-center justify-between min-w-0"
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
                className="rounded-lg border px-1.5 py-1 text-center transition-all border-violet-500/20 bg-gradient-to-b from-white/10 to-white/[0.03] flex items-center justify-between min-w-0"
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
        className="w-full relative rounded-2xl flex flex-col gap-3 overflow-hidden flex-1 min-h-0"
        style={{
          background: "linear-gradient(160deg, rgba(26,13,63,0.95) 0%, rgba(15,7,40,0.98) 100%)",
          border: `1px solid ${seatColor}30`,
          boxShadow: `0 8px 32px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.05), inset 0 1px 0 rgba(255,255,255,0.08)`,
          padding: "clamp(12px, 2vw, 24px)",
        }}
      >
        {/* Accent bar */}
        <div className="absolute top-0 left-0 right-0 h-0.5 rounded-t-2xl" style={{ background: `linear-gradient(90deg, ${seatColor}80, #ef4444aa, #7c3aedaa)` }} />

        {/* Question stage with fixed height */}
        <div className="w-full flex-1 min-h-0 flex flex-col justify-center items-center py-2 overflow-hidden">
          {kd.phase === "segmentDone" ? (
            <div className="text-center space-y-2 animate-fade-in">
              <div
                className="text-3xl sm:text-4xl font-black"
                style={{ background: "linear-gradient(90deg,#f59e0b,#ef4444)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}
              >
                KẾT THÚC LƯỢT THI
              </div>
              <div className="text-sm text-violet-300/60">Chuẩn bị sang phần thi tiếp theo…</div>
            </div>
          ) : !kd.current ? (
            <div className="text-violet-400/50 text-lg font-medium animate-pulse">Đang đợi câu hỏi…</div>
          ) : !kd.questionRevealed ? (
            <div className="text-center py-4 space-y-2">
              <div
                className="text-xl sm:text-2xl font-black tracking-wider uppercase animate-pulse"
                style={{ background: "linear-gradient(90deg,#7c3aed,#ef4444,#f59e0b)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}
              >
                SẴN SÀNG THI ĐẤU
              </div>
              <div className="text-xs text-violet-400/50">
                Nhấn [CÂU TIẾP THEO] trên bàn điều khiển để bắt đầu câu hỏi và tính giờ
              </div>
            </div>
          ) : (
            <div className="w-full text-center space-y-3">
              <div className={`font-black text-white text-center select-text leading-tight ${autoQuestionFontSize(kd.current.q)}`} style={{ textShadow: "0 2px 12px rgba(0,0,0,0.6)" }}>
                {kd.current.q}
              </div>
              {kd.current.media && (
                <MediaView url={kd.current.media} type={kd.current.mediaType} className="max-h-48 rounded-xl mx-auto border border-violet-500/20" />
              )}

            </div>
          )}

          {/* Buzzer unlock countdown */}
          {kd.buzzUnlockAt && kd.buzzUnlockAt > serverNow() && (
            <div className="mt-2 inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs sm:text-sm font-black animate-pulse"
              style={{ background: "rgba(245,158,11,0.15)", border: "1px solid rgba(245,158,11,0.5)", color: "#fbbf24" }}>
              <span>🔒 Chuông mở sau:</span>
              <span className="font-mono">{Math.max(1, Math.ceil((kd.buzzUnlockAt - serverNow()) / 1000))}s</span>
            </div>
          )}

          {/* Buzzed player */}
          {kd.buzzedSeat != null && (
            <div className="mt-2 inline-flex items-center gap-2 px-5 py-2 rounded-xl font-black text-lg sm:text-xl text-slate-950 animate-bounce"
              style={{ background: "linear-gradient(90deg,#f59e0b,#ef4444)", boxShadow: "0 0 24px rgba(245,158,11,0.6)" }}>
              <span>🔔</span>
              <span>{seatName(state, kd.buzzedSeat)}</span>
            </div>
          )}
        </div>

        {/* Timer footer */}
        {(() => {
          const isO22OrBefore = state.rulesetId === "O22" || /^O(1[3-9]|2[0-2])$/.test(state.rulesetId);
          if (isO22OrBefore) {
            if (!kd.globalTimer) return null;
            return (
              <div className="shrink-0 pt-2 border-t border-violet-500/15">
                <DisplayTimerBar timer={kd.globalTimer} serverNow={serverNow} />
              </div>
            );
          }
          if (kd.timer && kd.timer.startedAt != null) {
            return (
              <div className="shrink-0 pt-2 border-t border-violet-500/15">
                <DisplayTimerBar timer={kd.timer} serverNow={serverNow} />
              </div>
            );
          }
          return null;
        })()}
      </div>

      {/* Khung chứa đáp án riêng biệt chỉ có ở vòng Khởi Động */}
      {kd.phase === "result" && kd.current?.a && (
        <div
          className="w-full shrink-0 rounded-2xl px-6 py-3 flex items-center justify-center gap-3 animate-fade-in shadow-2xl backdrop-blur-md"
          style={{
            background: "linear-gradient(135deg, rgba(6, 78, 59, 0.95) 0%, rgba(4, 120, 87, 0.9) 100%)",
            border: "2px solid #10b981",
            boxShadow: "0 0 30px rgba(16, 185, 129, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.25)",
          }}
        >
          <span className="text-emerald-300 font-black text-sm sm:text-base uppercase tracking-wider flex items-center gap-2">
            <span className="text-lg">✔</span>
            <span>ĐÁP ÁN:</span>
          </span>
          <span className="text-white font-black text-lg sm:text-2xl drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)]">
            {kd.current.a}
          </span>
        </div>
      )}
    </div>
  );
}

function Vcnv({ state, serverNow }: P) {
  const v = state.vcnv!;
  const cur = v.currentRow >= 0 && v.currentRow < 4 ? v.rows[v.currentRow] : null;
  const isCenterRow = v.currentRow === 4;
  return (
    <div className="w-full max-w-6xl space-y-3">
      <div className="relative mx-auto rounded-2xl overflow-hidden border border-violet-500/20 bg-[#1a0d3f] aspect-[16/7]" style={{ maxHeight: "36vh" }}>
        {v.mysteryImage && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={v.mysteryImage} alt="" className="absolute inset-0 w-full h-full object-cover" />
        )}
        <div className="absolute inset-0 grid grid-cols-2 grid-rows-2">
          {v.rows.map((_r, i) => (
            <div
              key={i}
              className={`flex items-center justify-center text-4xl font-black border border-violet-900 transition-all duration-700 ${v.piecesRevealed[i] ? "opacity-0" : "bg-violet-900/95 opacity-100"}`}
            >
              {i + 1}
            </div>
          ))}
        </div>
        <div
          className={`absolute inset-1/4 rounded-xl border-2 flex items-center justify-center text-2xl font-black transition-all duration-700 ${
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
            className={`flex items-center gap-3 rounded-lg px-4 py-2 border text-lg transition-all ${
              v.currentRow === i
                ? "border-amber-400/50 bg-amber-500/10 shadow-[0_0_12px_rgba(245,158,11,0.2)]"
                : "border-violet-500/15 bg-white/[0.03]"
            }`}
          >
            <span className="w-6 font-black text-amber-400">{i + 1}</span>
            <span className="flex-1">
              {r.opened || (v.answersRevealed && v.currentRow === i) ? <b className="tracking-widest text-amber-100">{r.answer}</b> : v.currentRow === i ? r.hint : "••••••"}
            </span>
            {r.wrong && <span className="text-red-400">✘</span>}
          </div>
        ))}
      </div>
      <div className="text-center text-2xl tracking-[0.4em] font-black text-amber-300">
        {v.keyword}
        <span className="ml-3 text-sm text-violet-400/60 tracking-normal">({v.keyword.replace(/\s/g, "").length} chữ cái)</span>
      </div>
      {isCenterRow && v.centerQuestion && (
        <div className="rounded-xl border border-amber-400/30 bg-amber-500/10 p-3 text-center">
          <div className="text-xs font-bold text-amber-300 uppercase tracking-wider">⭐ Câu hỏi số 5 — Ô Trung Tâm</div>
          <div className="text-2xl font-bold text-white mt-1">{v.centerQuestion.q}</div>
          
        </div>
      )}
      {(cur || isCenterRow) && (
        <div className="max-w-xl mx-auto">
          <Timer timer={v.timer} serverNow={serverNow} big />
        </div>
      )}
      {v.answersRevealed && (
        <div className="grid grid-cols-4 gap-2">
          {activeSeats(state).map((s) => (
            <div key={s.id} className="rounded-lg bg-white/5 border border-violet-500/15 p-2 text-center">
              <div className="text-xs font-bold" style={{ color: SEAT_COLORS[s.id] }}>{s.name}</div>
              <div className="text-xl font-bold">{v.answers[s.id]?.text || "—"}</div>
            </div>
          ))}
        </div>
      )}
      {v.bells.length > 0 && (
        <div className="text-center text-2xl text-amber-300 font-bold">
          🔔 {v.bells.map((b) => seatName(state, b.seat)).join(" → ")}
        </div>
      )}
      {v.solvedBy != null && (
        <div className="text-center text-4xl font-black text-emerald-300">
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
    <div className="w-full max-w-5xl text-center space-y-4">
      <div className="text-lg text-violet-300 font-bold">
        Câu {Math.max(1, tt.qIdx + 1)}/{tt.questions.length}
      </div>
      {/* Khi idle: màn trống chỉ chứa nền */}
      {q && (
        <>
          {q.q && (
            <div className={`font-bold select-text leading-tight ${autoQuestionFontSize(q.q)}`}>{q.q}</div>
          )}
          {q.clueImages && q.clueImages.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-4xl mx-auto">
              {q.clueImages.map((cl, idx) => (
                <div key={idx} className="rounded-xl overflow-hidden border border-violet-500/20 bg-violet-900/50 p-1.5">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={cl.url} alt={cl.label || `Gợi ý ${idx + 1}`} className="w-full h-32 object-cover rounded-lg" />
                  <div className="text-xs text-amber-300 font-bold mt-1">{cl.label || `Dữ kiện ${idx + 1}`} ({cl.atSec}s)</div>
                </div>
              ))}
            </div>
          ) : (
            <MediaView url={q.media} type={q.type} className="max-h-[44vh] rounded-xl mx-auto" />
          )}
        </>
      )}
      {tt.phase === "question" && (
        <div className="max-w-md mx-auto">
          <Timer timer={tt.timer} serverNow={serverNow} big />
        </div>
      )}
      {(tt.phase === "ranking" || tt.phase === "graded") && (
        <div className="space-y-2 max-w-2xl mx-auto">
          {tt.correctAnswer && (
            <div className="text-3xl text-emerald-300 font-bold">Đáp án: {tt.correctAnswer}</div>
          )}
          {tt.ranking.map((r, i) => (
            <div
              key={r.seat}
              className={`flex items-center gap-3 rounded-xl px-4 py-2 text-lg border transition ${
                r.wrong
                  ? "border-rose-500/40 bg-rose-500/10"
                  : "border-violet-500/15 bg-white/[0.04]"
              }`}
            >
              <span className="w-6 text-violet-400">{i + 1}</span>
              <b style={{ color: SEAT_COLORS[r.seat] }} className="w-36 text-left truncate">{seatName(state, r.seat)}</b>
              <span className="flex-1 text-left">{r.noAnswer ? "—" : r.answer}</span>
              <span className="tabular-nums text-sm text-violet-400/60">{r.noAnswer ? "" : `${(r.ms / 1000).toFixed(2)}s`}</span>
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
    <div className="w-full max-w-5xl text-center space-y-4">
      <div className="text-3xl font-black" style={{ color: SEAT_COLORS[owner] }}>
        {seatName(state, owner)}
      </div>
      {vd.phase === "choosing" && <div className="text-2xl text-violet-200/60">Đang chọn gói câu hỏi…</div>}
      {vd.packages[owner] && (
        <div className="flex justify-center gap-3">
          {vd.packages[owner].map((p, i) => (
            <div
              key={i}
              className={`w-20 h-20 sm:w-24 sm:h-24 rounded-xl flex items-center justify-center text-3xl sm:text-4xl font-black border transition-all ${
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
        <>
          {cur.q.subject && (
            <div className="inline-block px-3 py-1 rounded-full bg-violet-500/20 border border-violet-400/30 text-violet-200 text-base font-bold">
              📚 {cur.q.subject} ({cur.points} điểm)
            </div>
          )}
          {vd.hopeStarActive && (
            <div className="text-3xl font-black text-amber-300">⭐ NGÔI SAO HY VỌNG ⭐</div>
          )}
          <div className={`font-bold leading-tight select-text ${autoQuestionFontSize(cur.q.q)}`}>{cur.q.q}</div>
          <MediaView url={cur.q.media} type={cur.q.mediaType} className="max-h-52 rounded-xl mx-auto" />
          
          <div className="max-w-md mx-auto">
            <Timer timer={vd.steal && vd.phase === "stealing" ? vd.steal.timer : vd.timer} serverNow={serverNow} big />
          </div>
          {vd.phase === "stealing" && (
            <div className="text-3xl sm:text-4xl font-black text-rose-400">
              🚨 CƯỚP ĐIỂM {vd.steal?.buzzedSeat != null ? `— ${seatName(state, vd.steal.buzzedSeat)}` : ""}
            </div>
          )}
        </>
      )}
      {vd.phase === "seatDone" && (
        <div className="text-4xl font-black text-amber-300">Hoàn thành lượt thi</div>
      )}
    </div>
  );
}

function Chp({ state, serverNow }: P) {
  const cp = state.cauHoiPhu!;
  const q = cp.questions[cp.qIdx];
  return (
    <div className="max-w-5xl mx-auto text-center space-y-4 w-full">
      <div className="text-lg text-amber-300 font-bold">
        Câu hỏi phụ — {cp.tied.map((i) => seatName(state, i)).join(" · ")}
      </div>
      {q && cp.phase !== "idle" && (
        <div className={`font-bold leading-tight select-text ${autoQuestionFontSize(q.q)}`}>{q.q}</div>
      )}
      {cp.phase === "result" && q?.a && (
        <div className="text-4xl text-emerald-300 font-bold">Đáp án: {q.a}</div>
      )}
      {cp.buzzedSeat != null && (
        <div className="text-4xl font-black text-amber-300">🔔 {seatName(state, cp.buzzedSeat)}</div>
      )}
      {cp.winner != null && (
        <div className="text-5xl font-black text-emerald-300">🏆 {seatName(state, cp.winner)}</div>
      )}
      <div className="max-w-md mx-auto">
        <Timer timer={cp.timer} serverNow={serverNow} big />
      </div>
    </div>
  );
}


// ─── Hexagonal LED Studio Canvas (Trường quay S14 Đường lên đỉnh Olympia) ───
// Full-screen Canvas 2D: Tái hiện chân thực trường quay Olympia 26 với cổng lục giác đứng,
// hiệu ứng camera/portal zoom dập dồn từng đợt khi mở đầu, panel ký hiệu khoa học bên trái,
// màn hình bảng tên bên phải, bục tròn đồng tâm và mặt sàn bóng gương phản chiếu.
function OlympiaIntroCanvas({ isIntro = false }: { isIntro?: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const logoImgRef = useRef<HTMLImageElement | null>(null);

  // Load logo chính thức Đường lên đỉnh Olympia
  useEffect(() => {
    const img = new Image();
    img.src = "/olympia/olympia_logo.png";
    img.onload = () => {
      logoImgRef.current = img;
    };
  }, []);

  // Đồng bộ kích thước chuẩn theo viewport thực tế (kể cả iframe hay fullscreen)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const syncSize = () => {
      const rect = canvas.getBoundingClientRect();
      const parent = canvas.parentElement;
      const w = Math.round(rect.width || parent?.clientWidth || window.innerWidth || 1280);
      const h = Math.round(rect.height || parent?.clientHeight || window.innerHeight || 720);
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = Math.max(200, w);
        canvas.height = Math.max(150, h);
      }
    };

    syncSize();
    const ro = new ResizeObserver(syncSize);
    ro.observe(canvas);
    if (canvas.parentElement) ro.observe(canvas.parentElement);
    window.addEventListener("resize", syncSize);

    return () => {
      ro.disconnect();
      window.removeEventListener("resize", syncSize);
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: false }) || canvas.getContext("2d")!;
    let t = 0;

    // Hạt sao và bụi sáng không gian trường quay
    const stars = Array.from({ length: 180 }, () => ({
      x: Math.random(),
      y: Math.random(),
      vx: (Math.random() - 0.5) * 0.00016,
      vy: (Math.random() - 0.5) * 0.0001,
      r: Math.random() * 1.8 + 0.4,
      phase: Math.random() * Math.PI * 2,
    }));

    // Hàm vẽ hình lục giác đứng (Vertical Flat-top Hexagon - Chuẩn cổng trường quay S14)
    // Cạnh trên phẳng nằm ngang, cạnh dưới phẳng nằm ngang, 2 bên vát góc thẳng đứng
    function drawVerticalHex(cx: number, cy: number, w: number, h: number) {
      const halfW = w * 0.5;
      const topFlat = w * 0.34; // độ dài cạnh phẳng nằm ngang trên & dưới
      const halfH = h * 0.5;
      ctx.beginPath();
      ctx.moveTo(cx - topFlat, cy - halfH); // Đỉnh 1: Trái cạnh trên
      ctx.lineTo(cx + topFlat, cy - halfH); // Đỉnh 2: Phải cạnh trên
      ctx.lineTo(cx + halfW, cy + h * 0.02); // Đỉnh 3: Nhô ra góc phải
      ctx.lineTo(cx + topFlat, cy + halfH); // Đỉnh 4: Phải cạnh dưới
      ctx.lineTo(cx - topFlat, cy + halfH); // Đỉnh 5: Trái cạnh dưới
      ctx.lineTo(cx - halfW, cy + h * 0.02); // Đỉnh 6: Nhô ra góc trái
      ctx.closePath();
    }

    const draw = () => {
      const W = canvas.width;
      const H = canvas.height;
      if (!W || !H) {
        rafRef.current = requestAnimationFrame(draw);
        return;
      }

      // Vị trí tâm sân khấu trung tâm
      const cx = W * 0.5;
      const cy = H * 0.42;

      // Kích thước chuẩn cổng lục giác đứng (chiều cao lớn hơn chiều rộng)
      const baseHexW = Math.min(W * 0.46, H * 0.62);
      const baseHexH = baseHexW * 1.25;

      // ── 1. NỀN KHÔNG GIAN TRƯỜNG QUAY S14 (Studio Backdrop) ─────────────────
      const bgGrad = ctx.createRadialGradient(cx, cy * 0.8, 0, cx, cy, Math.max(W, H) * 0.85);
      bgGrad.addColorStop(0, "#081b3a");
      bgGrad.addColorStop(0.35, "#040e24");
      bgGrad.addColorStop(0.75, "#020713");
      bgGrad.addColorStop(1, "#010308");
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, W, H);

      // ── 2. ĐÈN SPOTLIGHT TỪ ĐỈNH TRẦN RỌI XUỐNG SÀN ĐẤU ──────────────────────
      ctx.save();
      const spotGrad = ctx.createLinearGradient(cx, 0, cx, H * 0.85);
      spotGrad.addColorStop(0, "rgba(0, 195, 255, 0.22)");
      spotGrad.addColorStop(0.5, "rgba(0, 130, 255, 0.07)");
      spotGrad.addColorStop(1, "rgba(0, 50, 150, 0)");
      ctx.fillStyle = spotGrad;
      ctx.beginPath();
      ctx.moveTo(cx - W * 0.04, 0);
      ctx.lineTo(cx + W * 0.04, 0);
      ctx.lineTo(cx + baseHexW * 0.9, H * 0.85);
      ctx.lineTo(cx - baseHexW * 0.9, H * 0.85);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      // ── 3. MA TRẬN HẠT SAO VÀ BỤI SÁNG SỐ TRÔI TRONG TRƯỜNG QUAY ────────────
      stars.forEach((s) => {
        s.x = (s.x + s.vx + 1) % 1;
        s.y = (s.y + s.vy + 1) % 1;
        const alpha = 0.22 + Math.sin(t * 1.5 + s.phase) * 0.14;
        ctx.beginPath();
        ctx.arc(s.x * W, s.y * H, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(165, 215, 255, ${alpha})`;
        ctx.fill();
      });

      // ── 4. HIỆU ỨNG ZOOM TỪNG ĐỢT (ZOOM WAVES CHO PHẦN MỞ ĐẦU) ──────────────
      // Khi isIntro === true: Camera/Portal zoom dập dồn từng đợt theo chu kỳ 2.6s
      // Các tầng cổng lục giác liên tục nở từ trong ra ngoài (portal flow)
      const zoomWaveSpeed = 0.45;
      const waveCycle = (t * zoomWaveSpeed) % 1;

      // ── 5. CỔNG LỤC GIÁC ĐỨNG ĐA TẦNG 3D (Vertical Hexagonal Tunnel) ────────
      // Nếu là mở đầu: vẽ các tầng zoom nở dần từ tâm ra ngoài (nhịp 5 tầng)
      // Nếu là host bật lại: vẽ 5 tầng tĩnh với sóng quét LED êm dịu
      const portalLayers = 5;

      for (let i = 0; i < portalLayers; i++) {
        let layerProgress: number;
        let scale: number;
        let alpha: number;

        if (isIntro) {
          // Hiệu ứng Zoom từng đợt liên tục: mỗi tầng dịch chuyển theo waveCycle
          layerProgress = (waveCycle + i / portalLayers) % 1;
          // Scale từ 0.25 (sâu bên trong) nở to lên 1.35 (phóng ra trước mắt người xem)
          scale = 0.25 + Math.pow(layerProgress, 1.4) * 1.15;
          // Fade in ở giữa và fade out khi nở cực đại
          alpha = Math.sin(layerProgress * Math.PI) * 0.95;
        } else {
          // Chế độ trường quay tĩnh (Host bật thủ công): 5 khung lồng nhau cố định
          const scales = [1.28, 1.14, 1.0, 0.86, 0.72];
          const alphas = [0.12, 0.28, 0.95, 0.45, 0.22];
          scale = scales[i];
          alpha = alphas[i] + Math.sin(t * 2.5 + i) * 0.08;
        }

        const curW = baseHexW * scale;
        const curH = baseHexH * scale;

        ctx.save();
        ctx.shadowColor = "#00d4ff";
        ctx.shadowBlur = Math.min(35, 12 * scale);
        ctx.strokeStyle = `rgba(0, 215, 255, ${Math.max(0, alpha)})`;
        ctx.lineWidth = Math.max(1.5, (i === 2 || (!isIntro && scale === 1.0) ? 4.5 : 2.5) * Math.min(1.5, scale));
        drawVerticalHex(cx, cy, curW, curH);
        ctx.stroke();

        // Viền LED kép bên trong mỗi tầng khung
        if (scale > 0.4) {
          ctx.strokeStyle = `rgba(220, 245, 255, ${Math.max(0, alpha * 0.7)})`;
          ctx.lineWidth = 1.0;
          drawVerticalHex(cx, cy, curW * 0.96, curH * 0.96);
          ctx.stroke();
        }
        ctx.restore();
      }

      // Khung cổng LED lục giác chính (cố định nền tảng vững chãi)
      ctx.save();
      ctx.shadowColor = "#00e5ff";
      ctx.shadowBlur = 28;
      ctx.strokeStyle = "rgba(0, 230, 255, 0.95)";
      ctx.lineWidth = 3.5;
      drawVerticalHex(cx, cy, baseHexW, baseHexH);
      ctx.stroke();
      ctx.restore();

      // ── 6. LÒNG TRONG CỔNG LỤC GIÁC (NỀN LED DIGITAL RAIN & CHỮ OLYMPIA) ─────
      ctx.save();
      drawVerticalHex(cx, cy, baseHexW * 0.97, baseHexH * 0.97);
      ctx.clip(); // Giới hạn chỉ vẽ bên trong cổng lục giác

      // Nền gradient xanh dương đậm sâu thẳm
      const innerGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, baseHexW * 0.75);
      innerGrad.addColorStop(0, "rgba(0, 60, 160, 0.55)");
      innerGrad.addColorStop(0.65, "rgba(0, 20, 75, 0.85)");
      innerGrad.addColorStop(1, "rgba(0, 5, 25, 0.98)");
      ctx.fillStyle = innerGrad;
      ctx.fillRect(cx - baseHexW, cy - baseHexH, baseHexW * 2, baseHexH * 2);

      // Các tia sáng chùm quét từ tâm cổng ra
      for (let j = 0; j < 14; j++) {
        const rayAngle = (j / 14) * Math.PI * 2 + t * 0.2;
        const rayAlpha = (Math.sin(t * 1.8 + j * 0.8) * 0.5 + 0.5) * 0.22;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.cos(rayAngle) * baseHexW * 0.9, cy + Math.sin(rayAngle) * baseHexH * 0.9);
        ctx.strokeStyle = `rgba(0, 200, 255, ${rayAlpha})`;
        ctx.lineWidth = 1.6;
        ctx.stroke();
      }

      // Vòng tròn ánh sáng đồng tâm co giãn nhẹ bên trong cổng
      for (let k = 0; k < 6; k++) {
        const ringPhase = ((t * 0.4 + k / 6) % 1);
        const ringR = (baseHexW * 0.42) * (1 - ringPhase);
        const ringAlpha = Math.sin(ringPhase * Math.PI) * 0.65;
        ctx.beginPath();
        ctx.arc(cx, cy, ringR, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(0, 225, 255, ${ringAlpha})`;
        ctx.lineWidth = 1.8;
        ctx.stroke();
      }

      // Logo chính thức Đường lên đỉnh Olympia (hoặc text phát sáng nếu ảnh đang tải)
      if (logoImgRef.current && logoImgRef.current.complete) {
        const logoImg = logoImgRef.current;
        const aspect = logoImg.width / logoImg.height;
        const logoW = Math.min(baseHexW * 0.74, baseHexH * 0.44 * aspect);
        const logoH = logoW / aspect;
        const logoY = cy - logoH * 0.5 - baseHexH * 0.02;

        ctx.save();
        ctx.shadowColor = "#00d4ff";
        ctx.shadowBlur = 24;
        const pulse = isIntro ? (1 + Math.sin(t * 3.2) * 0.05) : 1.0;
        const dw = logoW * pulse;
        const dh = logoH * pulse;
        ctx.drawImage(logoImg, cx - dw * 0.5, logoY - (dh - logoH) * 0.5, dw, dh);
        ctx.restore();
      } else {
        // Text fallback "ĐƯỜNG LÊN ĐỈNH OLYMPIA" phát sáng kiêu hãnh
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        const line1FontSize = Math.max(12, Math.round(baseHexW * 0.082));
        ctx.font = `900 ${line1FontSize}px "Plus Jakarta Sans", sans-serif`;
        ctx.fillStyle = "rgba(220, 245, 255, 0.95)";
        ctx.shadowColor = "#00d4ff";
        ctx.shadowBlur = 12;
        ctx.fillText("ĐƯỜNG LÊN ĐỈNH", cx, cy - baseHexH * 0.08);

        const line2FontSize = Math.max(16, Math.round(baseHexW * 0.125));
        ctx.font = `900 ${line2FontSize}px "Plus Jakarta Sans", sans-serif`;
        ctx.fillStyle = "rgba(0, 230, 255, 0.98)";
        ctx.shadowColor = "#00f0ff";
        ctx.shadowBlur = 24;
        ctx.fillText("OLYMPIA", cx, cy + baseHexH * 0.06);
      }

      ctx.restore(); // Kết thúc clip lòng cổng lục giác

      // ── 7. PANEL BÊN TRÁI: KÝ HIỆU KHOA HỌC / TOÁN / LÝ (Left Science Board) ──
      // Kích thước và vị trí bảng ký hiệu bên trái
      const pLeftW = Math.min(W * 0.22, baseHexW * 0.65);
      const pLeftH = pLeftW * 0.95;
      const pLeftX = cx - baseHexW * 0.68 - pLeftW;
      const pLeftY = cy - pLeftH * 0.45;

      if (pLeftX > 5) {
        ctx.save();
        // Khung bảng đa giác vát góc bên trái
        ctx.beginPath();
        const vCut = pLeftW * 0.15;
        ctx.moveTo(pLeftX + vCut, pLeftY);
        ctx.lineTo(pLeftX + pLeftW, pLeftY);
        ctx.lineTo(pLeftX + pLeftW, pLeftY + pLeftH);
        ctx.lineTo(pLeftX, pLeftY + pLeftH);
        ctx.lineTo(pLeftX, pLeftY + vCut);
        ctx.closePath();

        // Nền bảng xanh cyan đậm
        const panelBg = ctx.createLinearGradient(pLeftX, pLeftY, pLeftX + pLeftW, pLeftY + pLeftH);
        panelBg.addColorStop(0, "rgba(0, 45, 110, 0.45)");
        panelBg.addColorStop(1, "rgba(0, 15, 50, 0.75)");
        ctx.fillStyle = panelBg;
        ctx.fill();

        ctx.shadowColor = "#00c3ff";
        ctx.shadowBlur = 12;
        ctx.strokeStyle = "rgba(0, 205, 255, 0.65)";
        ctx.lineWidth = 2.0;
        ctx.stroke();

        // Vẽ các ký hiệu khoa học sáng rực rỡ
        const symbols = [
          ["Σ", "kg", "μ", "Ψ"],
          ["sin", "cos", "Ω", "Δ"],
          ["π", "∞", "∫", "m²"],
          ["∂", "tan", "λ", "θ"],
        ];
        const symFontSz = Math.max(9, Math.round(pLeftW * 0.08));
        ctx.font = `bold ${symFontSz}px monospace`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        symbols.forEach((row, rIdx) => {
          row.forEach((sym, cIdx) => {
            const symX = pLeftX + (cIdx + 0.5) * (pLeftW / row.length);
            const symY = pLeftY + (rIdx + 0.5) * (pLeftH / symbols.length);
            const symAlpha = 0.35 + Math.sin(t * 2.0 + rIdx * 1.2 + cIdx * 0.8) * 0.25;
            ctx.fillStyle = `rgba(0, 225, 255, ${symAlpha})`;
            ctx.shadowColor = "#00d4ff";
            ctx.shadowBlur = 8;
            ctx.fillText(sym, symX, symY);
          });
        });
        ctx.restore();
      }

      // ── 8. PANEL BÊN PHẢI: BẢNG TÊN "ĐƯỜNG LÊN ĐỈNH OLYMPIA" (Right Signboard) ─
      const pRightW = Math.min(W * 0.22, baseHexW * 0.65);
      const pRightH = pRightW * 0.72;
      const pRightX = cx + baseHexW * 0.68;
      const pRightY = cy - pRightH * 0.45;

      if (pRightX + pRightW < W - 5) {
        ctx.save();
        // Khung chữ nhật viền kép phát sáng
        ctx.beginPath();
        ctx.rect(pRightX, pRightY, pRightW, pRightH);
        const rGrad = ctx.createLinearGradient(pRightX, pRightY, pRightX + pRightW, pRightY + pRightH);
        rGrad.addColorStop(0, "rgba(0, 55, 130, 0.55)");
        rGrad.addColorStop(1, "rgba(0, 15, 60, 0.82)");
        ctx.fillStyle = rGrad;
        ctx.fill();

        ctx.shadowColor = "#00c3ff";
        ctx.shadowBlur = 14;
        ctx.strokeStyle = "rgba(0, 220, 255, 0.75)";
        ctx.lineWidth = 2.2;
        ctx.stroke();

        // Viền trong nhỏ
        ctx.strokeStyle = "rgba(0, 180, 255, 0.35)";
        ctx.lineWidth = 1.0;
        ctx.strokeRect(pRightX + 4, pRightY + 4, pRightW - 8, pRightH - 8);

        // Chữ trong bảng bên phải
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        const rLine1Sz = Math.max(8, Math.round(pRightW * 0.08));
        ctx.font = `bold ${rLine1Sz}px "Plus Jakarta Sans", sans-serif`;
        ctx.fillStyle = "rgba(225, 245, 255, 0.9)";
        ctx.shadowColor = "#00d4ff";
        ctx.shadowBlur = 6;
        ctx.fillText("ĐƯỜNG LÊN ĐỈNH", pRightX + pRightW * 0.5, pRightY + pRightH * 0.38);

        const rLine2Sz = Math.max(10, Math.round(pRightW * 0.11));
        ctx.font = `900 ${rLine2Sz}px "Plus Jakarta Sans", sans-serif`;
        ctx.fillStyle = "rgba(0, 230, 255, 0.95)";
        ctx.shadowColor = "#00f0ff";
        ctx.shadowBlur = 12;
        ctx.fillText("OLYMPIA", pRightX + pRightW * 0.5, pRightY + pRightH * 0.65);
        ctx.restore();
      }

      // ── 9. BỤC TRÒN SÂN KHẤU & MẶT SÀN BÓNG GƯƠNG PHẢN CHIẾU (Stage Platform) ──
      const floorCenterY = cy + baseHexH * 0.52;
      const floorRadiusX = baseHexW * 0.95;
      const floorRadiusY = floorRadiusX * 0.24;

      ctx.save();
      // Vẽ bục tròn đồng tâm phát sáng
      for (let f = 3; f >= 1; f--) {
        const ringScale = 0.5 + f * 0.22;
        ctx.beginPath();
        ctx.ellipse(cx, floorCenterY, floorRadiusX * ringScale, floorRadiusY * ringScale, 0, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(0, 200, 255, ${0.18 + f * 0.15})`;
        ctx.lineWidth = f === 3 ? 3.0 : 1.5;
        ctx.shadowColor = "#00bfff";
        ctx.shadowBlur = 12;
        ctx.stroke();
      }

      // Ánh sáng phản chiếu mặt sàn đen bóng gương (Floor Mirror Reflection)
      const floorGrad = ctx.createRadialGradient(cx, floorCenterY, 0, cx, floorCenterY, floorRadiusX);
      floorGrad.addColorStop(0, "rgba(0, 160, 255, 0.28)");
      floorGrad.addColorStop(0.5, "rgba(0, 80, 200, 0.12)");
      floorGrad.addColorStop(1, "rgba(0, 10, 40, 0)");
      ctx.fillStyle = floorGrad;
      ctx.beginPath();
      ctx.ellipse(cx, floorCenterY, floorRadiusX * 1.3, floorRadiusY * 1.4, 0, 0, Math.PI * 2);
      ctx.fill();

      // Phản chiếu mờ của chân cổng lục giác xuống sàn
      ctx.globalAlpha = 0.25;
      ctx.save();
      ctx.translate(cx, floorCenterY * 2 - cy);
      ctx.scale(1, -0.6); // Lật ngược xuống dưới sàn
      ctx.strokeStyle = "rgba(0, 200, 255, 0.7)";
      ctx.lineWidth = 2.0;
      drawVerticalHex(0, 0, baseHexW * 0.85, baseHexH * 0.85);
      ctx.stroke();
      ctx.restore();

      ctx.restore();

      // Tiến triển thời gian cho frame kế tiếp
      t += 0.016;
      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, [isIntro]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full pointer-events-none block"
      style={{ display: "block", width: "100%", height: "100%" }}
    />
  );
}
