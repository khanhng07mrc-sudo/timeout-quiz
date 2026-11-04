"use client";

import { useState, useRef, useEffect } from "react";
import dynamic from "next/dynamic";
import { ROUND_LABELS, type OlympiaState } from "@/lib/olympia/types";
import { RULESETS } from "@/lib/olympia/rulesets";
import { parseVcnvAnswer } from "@/lib/olympia/engine";
import { useOlympiaAudio, useOlympiaSocket } from "./hooks";
import { CircularTimer, MediaView, ScoreStrip, SEAT_COLORS, Timer, activeSeats, seatName } from "./ui";
import { useOlympiaCameraState } from "./studio/useOlympiaCamera";
import {
  Vtv3ChalkboardBackdrop,
  Vtv3ChalkboardQuestionFrame,
  VcnvCountdownGraphic,
  VcnvAnswerRevealGraphic,
  TangTocQuestionGraphic,
  TangTocRankedAnswersGraphic,
  GlossyBlackDomeButton,
  BlueSquareNumberBadge,
  SummaryLowerThirdGraphic,
  EconovaContestantScoreTabBar,
  EconovaLowerThirdV3,
  VeDichSlantedGridGraphic,
} from "./Vtv3BroadcastGraphics";
import { isTtsEnabled, setTtsEnabled, speakTTS, cancelTTS } from "@/lib/olympia/tts";

const OlympiaStudio3DScene = dynamic(() => import("./OlympiaStudio3DScene"), {
  ssr: false,
  loading: () => (
    <div className="absolute inset-0 flex items-center justify-center bg-[#020510] text-amber-300 text-sm font-bold">
      Đang kết nối Trường quay 3D…
    </div>
  ),
});

function hasActiveRoundContent(state: OlympiaState): boolean {
  if (
    state.stage !== "playing" ||
    !state.currentRound ||
    state.summaryState?.active ||
    state.roundStatus[state.currentRound] === "done"
  ) {
    return false;
  }

  switch (state.currentRound) {
    case "khoiDong": {
      const kd = state.khoiDong;
      if (!kd || !kd.started || kd.phase === "segmentDone" || kd.phase === "intro") return false;
      return true;
    }
    case "vcnv": {
      const v = state.vcnv;
      if (!v) return false;
      return (
        v.phase === "grid" ||
        v.phase === "selecting" ||
        v.phase === "question" ||
        v.phase === "answers" ||
        v.phase === "done" ||
        Boolean(v.answersRevealed)
      );
    }
    case "tangToc": {
      const tt = state.tangToc;
      if (!tt) return false;
      return tt.phase === "question" || tt.phase === "ranking" || tt.phase === "graded";
    }
    case "veDich": {
      const vd = state.veDich;
      if (!vd || vd.phase === "seatDone") return false;
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


function ContestantIntroChyron({ state }: { state: OlympiaState }) {
  if (!state.entranceState?.active) return null;
  const currentIdx = Math.min(
    Math.max(0, state.entranceState.currentSeatIdx ?? 0),
    Math.max(0, state.seats.length - 1)
  );
  const currentSeat = state.seats[currentIdx];
  if (!currentSeat) return null;

  const seatName = (currentSeat.name || `Thí sinh ${currentIdx + 1}`).toUpperCase();
  const seatSchool = currentSeat.school?.trim();
  const seatNumber = currentIdx + 1;
  const seatColor = SEAT_COLORS[currentIdx] || "#00f0ff";

  return (
    <div className="absolute bottom-6 left-0 right-0 z-40 flex justify-center px-4 pointer-events-none animate-fade-in">
      <div className="w-full max-w-2xl rounded-2xl border border-white/20 shadow-[0_10px_35px_rgba(0,0,0,0.8)] backdrop-blur-xl bg-gradient-to-r from-slate-950/95 via-[#0b1636]/95 to-slate-950/95 overflow-hidden flex items-stretch">
        {/* Seat Number Tag */}
        <div
          className="w-16 sm:w-20 shrink-0 flex flex-col items-center justify-center font-black border-r border-white/10"
          style={{ background: `linear-gradient(135deg, ${seatColor}33, ${seatColor}11)` }}
        >
          <span className="text-[10px] sm:text-xs text-slate-300 uppercase tracking-widest">Vị trí</span>
          <span className="text-2xl sm:text-3xl font-black" style={{ color: seatColor }}>
            {seatNumber}
          </span>
        </div>

        {/* Contestant Name & School */}
        <div className="flex-1 py-3 px-4 sm:px-6 flex flex-col justify-center min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-amber-400 text-sm sm:text-base">👑</span>
            <h3
              className="text-lg sm:text-2xl font-black tracking-wide truncate text-white"
              style={{
                textShadow: "0 2px 8px rgba(0,0,0,0.8)",
              }}
            >
              {seatName}
            </h3>
          </div>
          {seatSchool && (
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-cyan-300 font-bold text-xs sm:text-sm tracking-wide truncate flex items-center gap-1.5">
                <span>🏫</span>
                <span>{seatSchool}</span>
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function DisplayScreen({ code }: { code: string }) {
  const { state, join, connected, serverNow } = useOlympiaSocket({ code, role: "display" });
  const isMutedParam =
    typeof window !== "undefined" &&
    (new URLSearchParams(window.location.search).get("mute") === "1" ||
      new URLSearchParams(window.location.search).get("audio") === "0");
  const [audioOn, setAudioOn] = useState(!isMutedParam);
  const [ttsActive, setTtsActive] = useState<boolean>(() => isTtsEnabled());
  useOlympiaAudio(state, join?.audioSeason, audioOn);

  // Auto-camera and question overlay visibility state
  const cameraState = useOlympiaCameraState(state, serverNow);

  // Automated Vietnamese TTS question reading
  const lastQuestionRef = useRef<string>("");
  useEffect(() => {
    if (!state || !ttsActive) return;
    let currentQ = "";
    if (state.currentRound === "khoiDong" && state.khoiDong?.started && state.khoiDong.current?.q) {
      currentQ = state.khoiDong.current.q;
    } else if (state.currentRound === "vcnv" && state.vcnv?.phase === "waitingAnswer") {
      const curIdx = state.vcnv.currentRow;
      const isCenter = curIdx === 4;
      currentQ = isCenter ? (state.vcnv.centerQuestion?.q || "") : (state.vcnv.rows[curIdx]?.hint || "");
    } else if (state.currentRound === "tangToc" && state.tangToc?.phase === "question") {
      const tt = state.tangToc;
      currentQ = tt.questions[tt.qIdx]?.q || "";
    } else if (
      state.currentRound === "veDich" &&
      state.veDich?.current?.q?.q &&
      (state.veDich.phase === "thinking" || state.veDich.phase === "stealing")
    ) {
      currentQ = state.veDich.current.q.q;
    } else if (state.currentRound === "cauHoiPhu" && state.cauHoiPhu?.phase === "question") {
      const cp = state.cauHoiPhu;
      currentQ = cp.questions[cp.qIdx]?.q || "";
    }

    if (currentQ && currentQ !== lastQuestionRef.current) {
      lastQuestionRef.current = currentQ;
      speakTTS(currentQ);
    } else if (!currentQ) {
      lastQuestionRef.current = "";
      cancelTTS();
    }
  }, [
    ttsActive,
    state?.currentRound,
    state?.khoiDong?.current?.q,
    state?.vcnv?.phase,
    state?.vcnv?.currentRow,
    state?.tangToc?.phase,
    state?.tangToc?.qIdx,
    state?.veDich?.phase,
    state?.veDich?.current?.q?.q,
    state?.cauHoiPhu?.phase,
    state?.cauHoiPhu?.qIdx,
  ]);

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
  const isVcnvReveal = state.currentRound === "vcnv" && Boolean(state.vcnv?.answersRevealed);
  const isTangTocReveal =
    state.currentRound === "tangToc" &&
    (state.tangToc?.phase === "ranking" || state.tangToc?.phase === "graded");
  const isTangTocQuestion = state.currentRound === "tangToc" && state.tangToc?.phase === "question";
  const isVcnvFullscreen = state.currentRound === "vcnv" && state.vcnv?.phase !== "waitingAnswer";

  const showFullscreen =
    isVcnvReveal ||
    isTangTocReveal ||
    isTangTocQuestion ||
    isVcnvFullscreen ||
    (state.overlayMode === "FULLSCREEN" && state.currentRound !== "khoiDong" && state.currentRound !== "veDich");

  const isLowerThird = !showFullscreen;
  const isOverlayHidden = cameraState.isOverlayHidden;
  const activeRoundContent = hasActiveRoundContent(state);
  const isVcnvQuadView =
    state.stage === "playing" &&
    !state.banner &&
    !isOverlayHidden &&
    !state.summaryState?.active &&
    activeRoundContent &&
    state.currentRound === "vcnv" &&
    Boolean(state.vcnv) &&
    !state.vcnv?.answersRevealed;

  return (
    <div className="fixed inset-0 w-full h-full max-h-full overflow-hidden bg-gradient-to-b from-[#060818] via-[#090d24] to-[#040612] text-white flex flex-col select-none">
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
                className="rounded-2xl border border-cyan-500/35 p-5 text-center flex flex-col items-center gap-2 bg-gradient-to-b from-[#091536]/90 to-slate-950/90 backdrop-blur shadow-[0_4px_24px_rgba(0,0,0,0.6)]"
              >
                <div className="w-9 h-9 rounded-full border-2 border-cyan-400 bg-cyan-500/20 flex items-center justify-center font-black text-sm text-cyan-300">
                  {s.id + 1}
                </div>
                <span className="text-base font-bold truncate max-w-full text-slate-100">{s.name}</span>
                {s.school && (
                  <span className="text-xs text-amber-300 font-medium truncate max-w-full bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/20">
                    {s.school}
                  </span>
                )}
                <span className="text-5xl font-black drop-shadow text-amber-300">
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
            className={`px-2 py-1 border rounded-lg transition text-xs cursor-pointer flex items-center gap-1 ${
              ttsActive
                ? "border-cyan-400/50 bg-cyan-500/20 text-cyan-200 shadow-[0_0_8px_rgba(6,182,212,0.4)]"
                : "border-white/10 text-slate-400 hover:bg-white/5"
            }`}
            onClick={() => {
              const next = !ttsActive;
              setTtsActive(next);
              setTtsEnabled(next);
              if (!next) cancelTTS();
            }}
            title="Bật/Tắt đọc câu hỏi tự động (TTS tiếng Việt)"
          >
            <span>🎙️</span>
            <span className="hidden sm:inline">{ttsActive ? "TTS" : "TẮT"}</span>
          </button>
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
      {/* ── 4.5. BROADCAST CONTESTANT INTRO LOWER-THIRD CHYRON (Z-40) ── */}
      {state.entranceState?.active && <ContestantIntroChyron state={state} />}

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
            {state.currentRound === "vcnv" && state.banner === ROUND_LABELS.vcnv ? (
              <>
                <span className="block">VƯỢT</span>
                <span className="block">CHƯỚNG NGẠI VẬT</span>
              </>
            ) : (
              state.banner
            )}
          </div>
        </div>
      )}

      {/* ── 5. GAME STAGE LAYERS (Z-20) ── */}
      <div className="flex-1 min-h-0 relative z-20 flex flex-col justify-end overflow-hidden">
        {/* ── 1. 3D BROADCAST STUDIO (FULLSCREEN OR VCNV BOTTOM-RIGHT QUADRANT WINDOW) ── */}
        <div
          className={
            isVcnvQuadView
              ? "absolute z-[35] rounded-2xl border-2 border-cyan-400/80 shadow-[0_0_30px_rgba(6,182,212,0.35)] overflow-hidden pointer-events-none top-[calc(50%+0.375rem)] left-[calc(50%+0.375rem)] right-3 bottom-3 sm:top-[calc(50%+0.5rem)] sm:left-[calc(50%+0.5rem)] sm:right-5 sm:bottom-5 md:top-[calc(50%+0.625rem)] md:left-[calc(50%+0.625rem)] md:right-6 md:bottom-6"
              : "fixed inset-0 w-full h-full z-0 overflow-hidden pointer-events-none"
          }
        >
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

        {/* Sảnh chờ / Lobby */}
        {state.stage === "lobby" && !state.entranceState?.active && (
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
        {state.stage === "playing" && !state.banner && !isOverlayHidden && !state.summaryState?.active && activeRoundContent && (
          isLowerThird ? (
            /* ── LOWER-THIRD BROADCAST OVERLAY (20 - 25% BOTTOM) ── */
            <div className="w-full px-2 sm:px-6 pb-3 pt-1 pointer-events-auto flex flex-col justify-end z-20">
              <div className="w-full max-w-6xl mx-auto flex flex-col justify-end">
                {state.currentRound === "khoiDong" && <KhoiDong state={state} serverNow={serverNow} />}
                {state.currentRound === "vcnv" && <Vcnv state={state} serverNow={serverNow} isLowerThird={true} />}
                {state.currentRound === "tangToc" && <TangToc state={state} serverNow={serverNow} />}
                {state.currentRound === "veDich" && <VeDich state={state} serverNow={serverNow} />}
                {state.currentRound === "cauHoiPhu" && <Chp state={state} serverNow={serverNow} />}
              </div>
            </div>
          ) : (
            /* ── FULLSCREEN BROADCAST OVERLAY (AUTHENTIC VTV3 GRAPHICS) ── */
            <div className="absolute inset-0 pointer-events-auto z-30 flex items-center justify-center">
              {state.currentRound === "khoiDong" && <KhoiDong state={state} serverNow={serverNow} />}
              {state.currentRound === "vcnv" && <Vcnv state={state} serverNow={serverNow} isLowerThird={false} />}
              {state.currentRound === "tangToc" && <TangToc state={state} serverNow={serverNow} />}
              {state.currentRound === "veDich" && <VeDich state={state} serverNow={serverNow} />}
              {state.currentRound === "cauHoiPhu" && <Chp state={state} serverNow={serverNow} />}
            </div>
          )
        )}

        {/* ── 6. SUMMARY LOWER-THIRD / FULLSCREEN GRAPHIC ── */}
        {state.summaryState?.active && <SummaryLowerThirdGraphic state={state} />}
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
  if (len <= 45) return "text-xl sm:text-2xl md:text-3xl lg:text-4xl leading-relaxed font-black";
  if (len <= 85) return "text-lg sm:text-xl md:text-2xl lg:text-3xl leading-relaxed font-black";
  if (len <= 140) return "text-base sm:text-lg md:text-xl lg:text-2xl leading-normal font-extrabold";
  return "text-sm sm:text-base md:text-lg lg:text-xl leading-normal font-bold";
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

  const totalQ = seg.questions > 100 ? "" : `/${seg.questions}`;
  const qNum = Math.max(1, kd.qIdx + 1);
  const questionBadge = `Câu ${qNum}${totalQ}`;

  if (!kd.started || kd.phase === "segmentDone" || !kd.questionRevealed || !kd.current) {
    return null;
  }

  const currentBuzzedSeat = kd.buzzedSeat;
  const currentSoloSeat = isSolo ? (seg.seat ?? null) : null;

  return (
    <div className="w-full max-w-6xl mx-auto flex flex-col justify-end h-full min-h-0 py-1 gap-1.5">
      {/* Main question card / Result answer overlay */}
      {kd.phase === "result" && kd.current?.a ? (
        <div className="w-full max-w-6xl mx-auto px-3 sm:px-6 flex flex-col shadow-[0_14px_40px_rgba(0,0,0,0.85)]">
          <EconovaContestantScoreTabBar
            state={state}
            activeSeatId={currentSoloSeat}
            buzzedSeatId={currentBuzzedSeat}
            lockedSeats={kd.lockedSeats}
            questionNumberBadge={questionBadge}
          />
          <div
            className="w-full shrink-0 px-6 py-4 flex items-center justify-center gap-3 shadow-2xl backdrop-blur-md"
            style={{
              background: "linear-gradient(135deg, rgba(6, 78, 59, 0.95) 0%, rgba(4, 120, 87, 0.9) 100%)",
              border: "2px solid #10b981",
              boxShadow: "0 0 30px rgba(16, 185, 129, 0.5)",
            }}
          >
            <span className="text-emerald-300 font-black text-sm sm:text-base uppercase tracking-wider flex items-center gap-2">
              <span>✔</span>
              <span>ĐÁP ÁN:</span>
            </span>
            <span className="text-white font-black text-lg sm:text-2xl drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
              {kd.current.a}
            </span>
          </div>
        </div>
      ) : state.themeMode === "o26_classic" ? (
        <div className="w-full max-w-5xl mx-auto flex flex-col gap-1">
          <EconovaContestantScoreTabBar
            state={state}
            activeSeatId={currentSoloSeat}
            buzzedSeatId={currentBuzzedSeat}
            lockedSeats={kd.lockedSeats}
            questionNumberBadge={questionBadge}
          />
          <Vtv3ChalkboardQuestionFrame
            headerBadge={null}
            questionText={kd.current?.q}
            mediaElement={
              kd.current?.media ? (
                <MediaView
                  url={kd.current.media}
                  type={kd.current.mediaType}
                  className="max-h-20 sm:max-h-24 rounded-lg mx-auto mt-1"
                />
              ) : null
            }
            timer={kd.timer}
            serverNow={serverNow}
          />
        </div>
      ) : (
        <EconovaLowerThirdV3
          state={state}
          serverNow={serverNow}
          activeSeatId={currentSoloSeat}
          buzzedSeatId={currentBuzzedSeat}
          lockedSeats={kd.lockedSeats}
          questionNumberBadge={questionBadge}
          headerBadge={kd.current?.subject ? `${kd.current.subject.toUpperCase()}` : null}
          questionText={kd.current?.q}
          mediaElement={
            kd.current?.media ? (
              <MediaView
                url={kd.current.media}
                type={kd.current.mediaType}
                className="max-h-20 sm:max-h-24 rounded-lg mx-auto mt-1"
              />
            ) : null
          }
          timer={kd.timer}
          showScoreTab={true}
        />
      )}
    </div>
  );
}

function Vcnv({ state, serverNow }: P) {
  const v = state.vcnv!;
  if (!v) return null;

  // 1. Candidate Answers Revealed -> Fullscreen VTV3 Vertical Brass Rail Layout (Image 3)
  if (v.answersRevealed) {
    return <VcnvAnswerRevealGraphic state={state} />;
  }

  // 2. Authentic VTV3 4-Quadrant Broadcast Layout (Grid, Question & 15s Countdown Phases)
  return <VcnvCountdownGraphic state={state} serverNow={serverNow} />;
}

function TangToc({ state, serverNow }: P) {
  const tt = state.tangToc!;
  if (!tt || tt.phase === "idle") return null;

  // 1. Candidate Answers Revealed & Graded -> Fullscreen Ranked Layout
  if (tt.phase === "ranking" || tt.phase === "graded") {
    return <TangTocRankedAnswersGraphic state={state} />;
  }

  // 2. Question Clue Frame -> Fullscreen Frame
  return <TangTocQuestionGraphic state={state} serverNow={serverNow} />;
}

function VeDich({ state, serverNow }: P) {
  const vd = state.veDich!;
  const owner = vd.order[vd.turnIdx];
  const cur = vd.current;

  if (vd.phase === "seatDone") return null;

  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col justify-end">
      {/* When choosing package or package confirmed before opening a question: show slanted hexagonal package grid */}
      {(vd.phase === "choosing" || (vd.packages[owner] && !cur)) && (
        <VeDichSlantedGridGraphic state={state} />
      )}

      {vd.phase === "result" && cur?.q.a ? (
        <div
          className="w-full shrink-0 rounded-2xl px-6 py-4 flex flex-col items-center justify-center gap-1.5 shadow-2xl backdrop-blur-md"
          style={{
            background: "linear-gradient(135deg, rgba(6, 78, 59, 0.95) 0%, rgba(4, 120, 87, 0.9) 100%)",
            border: "2px solid #10b981",
            boxShadow: "0 0 30px rgba(16, 185, 129, 0.5)",
          }}
        >
          <div className="flex items-center gap-2">
            <span className="text-emerald-300 font-black text-xs sm:text-sm uppercase tracking-wider flex items-center gap-1.5">
              <span>✔</span>
              <span>ĐÁP ÁN VỀ ĐÍCH:</span>
            </span>
            <span className="text-white font-black text-base sm:text-xl drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)]">
              {cur.q.a}
            </span>
          </div>
          {cur.points && (
            <div className="text-[11px] sm:text-xs font-bold text-emerald-200">
              Điểm câu hỏi: {cur.points} điểm {vd.hopeStarActive ? "⭐ NGÔI SAO HY VỌNG" : ""}
            </div>
          )}
        </div>
      ) : cur ? (
        state.themeMode === "o26_classic" ? (
          <Vtv3ChalkboardQuestionFrame
            headerBadge={`${seatName(state, owner)} · ${cur.q.subject || "VỀ ĐÍCH"} (${cur.points} điểm) ${
              vd.hopeStarActive ? "⭐ NGÔI SAO HY VỌNG" : ""
            }`}
            questionText={cur.q.q}
            mediaElement={
              cur.q.media ? (
                <MediaView
                  url={cur.q.media}
                  type={cur.q.mediaType}
                  className="max-h-20 sm:max-h-24 rounded-xl mx-auto border border-violet-500/20 mt-1"
                />
              ) : null
            }
            timer={vd.steal && vd.phase === "stealing" ? vd.steal.timer : vd.timer}
            serverNow={serverNow}
          >
            {vd.phase === "stealing" && (
              <div className="text-base sm:text-lg font-black text-rose-400 animate-pulse mt-1">
                🚨 CƯỚP ĐIỂM {vd.steal?.buzzedSeat != null ? `— ${seatName(state, vd.steal.buzzedSeat)}` : ""}
              </div>
            )}
          </Vtv3ChalkboardQuestionFrame>
        ) : (
          <EconovaLowerThirdV3
            state={state}
            serverNow={serverNow}
            activeSeatId={owner}
            buzzedSeatId={vd.steal?.buzzedSeat ?? null}
            headerBadge={`${cur.q.subject || "VỀ ĐÍCH"} · ${cur.points} ĐIỂM${
              vd.hopeStarActive ? " ⭐ NGÔI SAO HY VỌNG" : ""
            }`}
            questionText={cur.q.q}
            mediaElement={
              cur.q.media ? (
                <MediaView
                  url={cur.q.media}
                  type={cur.q.mediaType}
                  className="max-h-20 sm:max-h-24 rounded-xl mx-auto border border-violet-500/20 mt-1"
                />
              ) : null
            }
            timer={vd.steal && vd.phase === "stealing" ? vd.steal.timer : vd.timer}
            showScoreTab={true}
          />
        )
      ) : null}
    </div>
  );
}

function Chp({ state, serverNow }: P) {
  const cp = state.cauHoiPhu!;
  const q = cp.questions[cp.qIdx];
  return (
    <div className="max-w-5xl mx-auto text-center space-y-2 w-full animate-fade-in">
      <div className="text-sm font-bold text-amber-300">
        Câu hỏi phụ — {cp.tied.map((i) => seatName(state, i)).join(" · ")}
      </div>
      {q && (
        state.themeMode === "o26_classic" ? (
          <div className="flex flex-col gap-1">
            <EconovaContestantScoreTabBar
              state={state}
              buzzedSeatId={cp.buzzedSeat}
            />
            <Vtv3ChalkboardQuestionFrame
              headerBadge="CÂU HỎI PHỤ"
              questionText={q.q}
              timer={cp.timer}
              serverNow={serverNow}
            />
          </div>
        ) : (
          <EconovaLowerThirdV3
            state={state}
            serverNow={serverNow}
            buzzedSeatId={cp.buzzedSeat}
            headerBadge="CÂU HỎI PHỤ"
            questionText={q.q}
            timer={cp.timer}
            showScoreTab={true}
          />
        )
      )}
      {cp.phase === "result" && q?.a && (
        <div className="text-2xl font-black text-emerald-300 mt-2">✔ Đáp án: {q.a}</div>
      )}
      {cp.winner != null && (
        <div className="text-3xl font-black text-emerald-300 mt-2">🏆 {seatName(state, cp.winner)}</div>
      )}
    </div>
  );
}
