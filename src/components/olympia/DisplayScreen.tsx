"use client";

import { useState } from "react";
import { ROUND_LABELS, type OlympiaState } from "@/lib/olympia/types";
import { useOlympiaAudio, useOlympiaSocket, useCountdown } from "./hooks";
import { MediaView, ScoreStrip, SEAT_COLORS, Timer, activeSeats, seatName } from "./ui";

export default function DisplayScreen({ code }: { code: string }) {
  const { state, join, connected, serverNow } = useOlympiaSocket({ code, role: "display" });
  const [audioOn, setAudioOn] = useState(true);
  useOlympiaAudio(state, join?.audioSeason, audioOn);
  const introRemainingMs = useCountdown(state?.introTimer, serverNow);

  if (join && !join.ok) return <div className="p-10 text-rose-300 text-2xl">{join.error}</div>;
  if (!state)
    return (
      <div className="h-screen flex items-center justify-center bg-[#0d0820] text-violet-300 text-2xl font-bold">
        Đang kết nối…
      </div>
    );

  const origin = typeof window !== "undefined" ? window.location.origin : "";

  return (
    <div className="h-full max-h-full overflow-hidden bg-gradient-to-b from-[#0d0820] via-[#120b2e] to-[#0a0618] text-white flex flex-col select-none relative">
      {/* Ambient background orbs */}
      <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-violet-600/8 blur-[100px] pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-amber-500/6 blur-[100px] pointer-events-none" />

      {/* Scoreboard overlay */}
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
            className="px-2 py-1 border border-violet-400/30 rounded-lg hover:bg-violet-500/15 transition text-xs"
            onClick={() => setAudioOn((v) => !v)}
          >
            {audioOn ? "🔊" : "🔈"}
          </button>
          <span>{connected ? "🟢" : "🔴"}</span>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
        <div className="flex-1 min-h-0 flex items-center justify-center overflow-hidden px-3 py-2">
          {state.stage === "lobby" && <Lobby state={state} code={code} origin={origin} />}
          {state.stage === "finished" && <Podium state={state} />}

          {state.stage === "playing" && state.introTimer && (
            <div className="text-center space-y-5 animate-fade-in max-w-3xl px-4">
              <div className="text-base sm:text-lg text-violet-300/70 font-bold uppercase tracking-widest animate-pulse">
                Chào mừng đến với
              </div>
              <div
                className="text-4xl sm:text-6xl font-black tracking-wide"
                style={{ background: "linear-gradient(90deg,#f59e0b,#ef4444,#7c3aed)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}
              >
                ĐƯỜNG LÊN ĐỈNH OLYMPIA
              </div>
              <div className="flex items-center justify-center gap-4 pt-2">
                <span className="text-base sm:text-lg text-violet-200/70 font-medium">Bắt đầu trận đấu trong:</span>
                <span
                  className="inline-flex items-center justify-center w-14 h-14 rounded-full text-slate-950 font-black text-3xl shadow-2xl"
                  style={{ background: "linear-gradient(135deg,#f59e0b,#ef4444)" }}
                >
                  {Math.max(1, Math.ceil(introRemainingMs / 1000))}
                </span>
              </div>
            </div>
          )}

          {state.stage === "playing" && !state.introTimer && state.banner && (
            <div className="text-center animate-fade-in">
              <div className="text-base text-violet-300/60 mb-2 uppercase tracking-widest font-bold">Phần thi</div>
              <div
                className="text-4xl sm:text-6xl font-black"
                style={{ background: "linear-gradient(90deg,#f59e0b,#ef4444,#7c3aed)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}
              >
                {state.banner}
              </div>
            </div>
          )}

          {state.stage === "playing" && !state.banner && (
            <>
              {state.currentRound === "khoiDong" && <KhoiDong state={state} serverNow={serverNow} />}
              {state.currentRound === "vcnv" && <Vcnv state={state} serverNow={serverNow} />}
              {state.currentRound === "tangToc" && <TangToc state={state} serverNow={serverNow} />}
              {state.currentRound === "veDich" && <VeDich state={state} serverNow={serverNow} />}
              {state.currentRound === "cauHoiPhu" && <Chp state={state} serverNow={serverNow} />}
            </>
          )}
        </div>

        {/* Score strip */}
        {state.stage !== "lobby" && (
          <div className="shrink-0 px-2 pb-2">
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
  const ms = useCountdown(timer, serverNow);
  const total = timer?.totalMs || 1;
  const pct = Math.max(0, Math.min(100, (ms / total) * 100));
  const secs = (ms / 1000).toFixed(ms < 10000 ? 1 : 0);
  const running = timer?.startedAt != null;
  const low = ms <= 3000 && ms > 0;

  return (
    <div className="w-full flex items-center gap-3">
      <div className={`font-mono font-black tabular-nums text-lg sm:text-2xl shrink-0 transition-colors ${low ? "text-red-400 drop-shadow-[0_0_12px_rgba(239,68,68,0.8)]" : running ? "text-amber-300 drop-shadow-[0_0_10px_rgba(251,191,36,0.6)]" : "text-violet-400/50"}`}>
        {running ? `${secs}s` : `${Math.round(total / 1000)}s`}
      </div>
      <div className="flex-1 h-3 rounded-full bg-black/50 border border-violet-500/20 overflow-hidden shadow-inner">
        <div
          className={`h-full rounded-full transition-all duration-100 ${
            low
              ? "bg-gradient-to-r from-red-500 to-rose-400 shadow-[0_0_10px_rgba(239,68,68,0.7)]"
              : "bg-gradient-to-r from-amber-400 via-red-500 to-violet-500 shadow-[0_0_10px_rgba(251,191,36,0.4)]"
          }`}
          style={{ width: `${running ? pct : 100}%` }}
        />
      </div>
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

  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col h-full min-h-0 py-1">
      {/* Main card */}
      <div
        className="w-full relative rounded-2xl flex flex-col gap-3 overflow-hidden"
        style={{
          background: "linear-gradient(160deg, rgba(26,13,63,0.95) 0%, rgba(15,7,40,0.98) 100%)",
          border: `1px solid ${seatColor}30`,
          boxShadow: `0 8px 32px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.05), inset 0 1px 0 rgba(255,255,255,0.08)`,
          padding: "clamp(12px, 2vw, 24px)",
        }}
      >
        {/* Accent bar */}
        <div className="absolute top-0 left-0 right-0 h-0.5 rounded-t-2xl" style={{ background: `linear-gradient(90deg, ${seatColor}80, #ef4444aa, #7c3aedaa)` }} />

        {/* Header */}
        <div className="flex items-center justify-between gap-2 shrink-0 border-b border-violet-500/15 pb-3 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full shadow-md shrink-0" style={{ backgroundColor: seatColor, boxShadow: `0 0 8px ${seatColor}` }} />
            <span className="font-bold text-sm sm:text-base text-violet-100 tracking-wide">{seg.label}</span>
          </div>
          <div className="flex items-center gap-2">
            <span
              className="px-3 py-1 rounded-full text-xs sm:text-sm font-black"
              style={{ background: "linear-gradient(90deg,rgba(245,158,11,0.2),rgba(239,68,68,0.2))", border: "1px solid rgba(245,158,11,0.4)", color: "#fbbf24" }}
            >
              Câu {qNum}{totalQ} · 10đ
            </span>
            {kd.current?.subject && (
              <span className="px-3 py-1 rounded-full bg-violet-500/15 border border-violet-400/30 text-violet-200 font-bold text-xs sm:text-sm flex items-center gap-1">
                <span>📚</span>
                <span>{kd.current.subject}</span>
              </span>
            )}
          </div>
        </div>

        {/* Question stage */}
        <div className="flex-1 min-h-[90px] flex flex-col justify-center items-center py-2">
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
              {kd.phase === "result" && kd.current.a && (
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-xl text-base sm:text-xl font-black animate-fade-in"
                  style={{ background: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.4)", color: "#34d399", boxShadow: "0 0 20px rgba(16,185,129,0.2)" }}>
                  <span>✔ ĐÁP ÁN:</span>
                  <span>{kd.current.a}</span>
                </div>
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
          {v.centerQuestion.a && <div className="text-lg font-bold text-emerald-300 mt-1">Đáp án: {v.centerQuestion.a}</div>}
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
  return (
    <div className="w-full max-w-5xl text-center space-y-4">
      <div className="text-lg text-violet-300 font-bold">
        Câu {Math.max(1, tt.qIdx + 1)}/{tt.questions.length}
      </div>
      {tt.phase === "idle" && <div className="text-3xl text-violet-200/60">Chuẩn bị…</div>}
      {q && tt.phase !== "idle" && (
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
          {vd.phase === "result" && cur.q.a && (
            <div className="text-4xl text-emerald-300 font-bold">Đáp án: {cur.q.a}</div>
          )}
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
