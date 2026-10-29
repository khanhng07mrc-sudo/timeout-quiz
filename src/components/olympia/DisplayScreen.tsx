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
  if (!state) return <div className="p-10 text-sky-200 text-2xl">Đang kết nối…</div>;
  const origin = typeof window !== "undefined" ? window.location.origin : "";

  return (
    <div className="h-full max-h-full overflow-hidden bg-gradient-to-b from-[#060b1c] via-[#091533] to-[#040714] text-white flex flex-col p-2 sm:p-4 gap-1.5 sm:gap-3 select-none justify-between relative">
      {state.showScoreboard && (
        <div className="absolute inset-0 z-50 bg-slate-950/95 flex flex-col items-center justify-center p-6 animate-fade-in backdrop-blur-md">
          <h2 className="text-4xl sm:text-5xl font-black text-yellow-300 mb-8 uppercase tracking-wider drop-shadow-[0_4px_20px_rgba(234,179,8,0.5)]">
            BẢNG ĐIỂM HIỆN TẠI
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 w-full max-w-5xl">
            {activeSeats(state).map((s) => (
              <div key={s.id} className="rounded-2xl border-2 p-6 text-center bg-white/5 backdrop-blur shadow-2xl flex flex-col items-center justify-center gap-3" style={{ borderColor: SEAT_COLORS[s.id] }}>
                <span className="text-xl font-bold truncate max-w-full text-slate-200">{s.name}</span>
                <span className="text-6xl font-black drop-shadow" style={{ color: SEAT_COLORS[s.id] }}>{s.score}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="flex items-center justify-between shrink-0">
        <div className="text-base sm:text-xl font-black text-sky-300 tracking-wide flex items-center gap-2">
          <span>🏔️</span>
          <span>ĐƯỜNG LÊN ĐỈNH OLYMPIA</span>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 text-xs sm:text-sm text-slate-300">
          <span className="px-2 py-0.5 rounded bg-sky-500/20 border border-sky-400/30 text-sky-300 font-bold">
            {state.currentRound ? ROUND_LABELS[state.currentRound] : ""}
          </span>
          <button className="px-2 py-1 border border-white/20 rounded hover:bg-white/10 transition cursor-pointer" onClick={() => setAudioOn((v) => !v)}>
            {audioOn ? "🔊" : "🔈 Bật âm thanh"}
          </button>
          <span>{connected ? "🟢" : "🔴"}</span>
        </div>
      </div>

      <div className="flex-1 min-h-0 flex items-center justify-center overflow-hidden w-full">
        {state.stage === "lobby" && <Lobby state={state} code={code} origin={origin} />}
        {state.stage === "finished" && <Podium state={state} />}
        {state.stage === "playing" && state.introTimer && (
          <div className="text-center space-y-4 animate-fade-in max-w-3xl px-4">
            <div className="text-xl sm:text-2xl text-sky-300 font-bold uppercase tracking-widest animate-pulse">
              Chào mừng đến với
            </div>
            <div className="text-5xl sm:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-amber-200 to-yellow-400 drop-shadow-[0_4px_25px_rgba(234,179,8,0.5)]">
              ĐƯỜNG LÊN ĐỈNH OLYMPIA
            </div>
            <div className="flex items-center justify-center gap-3 pt-4">
              <span className="text-lg sm:text-xl text-slate-300 font-medium">Bắt đầu trận đấu trong:</span>
              <span className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-br from-yellow-400 to-amber-500 text-slate-950 font-black text-3xl shadow-xl shadow-yellow-500/30 animate-bounce">
                {Math.max(1, Math.ceil(introRemainingMs / 1000))}
              </span>
            </div>
          </div>
        )}
        {state.stage === "playing" && !state.introTimer && state.banner && (
          <div className="text-center">
            <div className="text-xl text-sky-300 mb-2">Phần thi</div>
            <div className="text-6xl font-black text-yellow-300 drop-shadow">{state.banner}</div>
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

      {state.stage !== "lobby" && <ScoreStrip state={state} large highlight={highlightSeats(state)} />}
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
    count === 2
      ? "grid-cols-2 max-w-md"
      : count === 3
      ? "grid-cols-3 max-w-xl"
      : count === 4
      ? "grid-cols-4 max-w-2xl"
      : count <= 6
      ? "grid-cols-3 sm:grid-cols-6 max-w-3xl"
      : "grid-cols-4 max-w-3xl";

  return (
    <div className="text-center space-y-3 sm:space-y-4 max-w-4xl mx-auto w-full px-2">
      <div className="text-sm sm:text-base text-slate-300">Vào {origin}/play và nhập mã</div>
      <div className="text-5xl sm:text-7xl font-black tracking-[0.2em] sm:tracking-[0.25em] text-yellow-300 drop-shadow select-all">
        {code}
      </div>
      <div className={`grid ${gridClass} gap-2 mx-auto w-full pt-1`}>
        {seats.map((s) => (
          <div
            key={s.id}
            className="rounded-xl border border-white/15 bg-white/5 p-2 sm:p-2.5 text-sm sm:text-base font-semibold shadow-inner truncate transition-all"
            style={{ borderLeft: `5px solid ${SEAT_COLORS[s.id]}` }}
          >
            {s.name || <span className="text-slate-500">Ghế {s.id + 1}</span>}
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
      <div className="text-5xl font-black text-yellow-300">KẾT QUẢ CHUNG CUỘC</div>
      {r.map((s, i) => (
        <div key={s.id} className="text-4xl" style={{ color: i === 0 ? "#fde047" : "white" }}>
          {["🥇", "🥈", "🥉"][i] ?? `${i + 1}.`} {s.name} — <b>{s.score}</b>
        </div>
      ))}
    </div>
  );
}

function autoQuestionFontSize(text: string) {
  const len = text.length;
  if (len <= 45) return "text-2xl sm:text-3xl md:text-4xl lg:text-5xl leading-tight";
  if (len <= 90) return "text-xl sm:text-2xl md:text-3xl lg:text-4xl leading-snug";
  if (len <= 140) return "text-lg sm:text-xl md:text-2xl lg:text-3xl leading-snug";
  return "text-base sm:text-lg md:text-xl lg:text-2xl leading-normal";
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
      <div className={`font-mono font-black tabular-nums text-lg sm:text-2xl shrink-0 ${low ? "text-rose-400 animate-pulse" : running ? "text-cyan-300" : "text-slate-400"}`}>
        {running ? `${secs}s` : `${Math.round(total / 1000)}s`}
      </div>
      <div className="flex-1 h-3 rounded-full bg-black/50 border border-white/15 overflow-hidden p-0.5 shadow-inner">
        <div
          className={`h-full rounded-full transition-all duration-100 ${
            low
              ? "bg-gradient-to-r from-rose-500 to-amber-500 shadow-[0_0_12px_rgba(244,63,94,0.8)]"
              : "bg-gradient-to-r from-cyan-400 to-sky-500 shadow-[0_0_12px_rgba(56,189,248,0.7)]"
          }`}
          style={{ width: `${running ? pct : 100}%` }}
        />
      </div>
    </div>
  );
}

function QuestionCard({ children }: { children: React.ReactNode }) {
  return <div className="max-w-5xl mx-auto text-center space-y-4">{children}</div>;
}

function KhoiDong({ state, serverNow }: P) {
  const kd = state.khoiDong!;
  const seg = kd.segments[kd.segIdx];
  const isSolo = seg.kind === "solo";
  const seatId = isSolo ? (seg.seat as number) : kd.buzzedSeat;
  const currentSeat = seatId != null ? state.seats[seatId] : null;
  const seatColor = (currentSeat && SEAT_COLORS[currentSeat.id]) || "#38bdf8";

  const totalQ = seg.questions > 100 ? "" : `/${seg.questions}`;
  const qNum = Math.max(1, kd.qIdx + 1);

  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col justify-center items-center h-full min-h-0 py-1">
      {/* ── ROUNDED GLASSMORPHISM CARD (OLYMPIA 26) ── */}
      <div className="w-full relative rounded-3xl p-4 sm:p-6 backdrop-blur-2xl bg-gradient-to-b from-slate-900/90 via-slate-900/75 to-slate-950/95 border border-cyan-400/30 ring-1 ring-white/10 shadow-[0_16px_48px_rgba(0,0,0,0.6),0_0_30px_rgba(56,189,248,0.15)] flex flex-col justify-between gap-3 overflow-hidden">
        {/* Subtle decorative glow orb */}
        <div className="absolute -top-16 -left-16 w-48 h-48 rounded-full bg-cyan-500/15 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -right-16 w-48 h-48 rounded-full bg-indigo-500/15 blur-3xl pointer-events-none" />

        {/* 1. Header ribbon: Contestant, Segment & Subject chips */}
        <div className="flex items-center justify-between gap-2 shrink-0 border-b border-white/10 pb-3 flex-wrap">
          {/* Contestant Tag */}
          <div className="flex items-center gap-2">
            <span
              className="w-3.5 h-3.5 rounded-full ring-2 ring-white/40 shadow-md shrink-0"
              style={{ backgroundColor: seatColor }}
            />
            <span className="font-bold text-sm sm:text-base text-slate-100 tracking-wide">
              {seg.label}
            </span>
          </div>

          {/* Badges: Question index & Subject */}
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-300 font-extrabold text-xs sm:text-sm shadow-[0_0_12px_rgba(245,158,11,0.2)]">
              Câu {qNum}{totalQ} · 10đ
            </span>
            {kd.current?.subject && (
              <span className="px-3 py-1 rounded-full bg-sky-500/20 border border-sky-400/40 text-sky-200 font-bold text-xs sm:text-sm shadow-[0_0_12px_rgba(56,189,248,0.2)] flex items-center gap-1">
                <span>📚</span>
                <span>{kd.current.subject}</span>
              </span>
            )}
          </div>
        </div>

        {/* 2. Central Question Stage */}
        <div className="flex-1 min-h-[90px] sm:min-h-[140px] flex flex-col justify-center items-center py-2 relative z-10">
          {kd.phase === "segmentDone" ? (
            <div className="text-center space-y-2 animate-fade-in">
              <div className="text-3xl sm:text-4xl font-black text-yellow-300 drop-shadow">KẾT THÚC LƯỢT THI</div>
              <div className="text-sm sm:text-base text-slate-300">Chuẩn bị sang phần thi tiếp theo…</div>
            </div>
          ) : !kd.current ? (
            <div className="text-center text-slate-400 text-lg sm:text-xl font-medium animate-pulse">
              Đang đợi câu hỏi…
            </div>
          ) : !kd.questionRevealed ? (
            /* PRELUDE / READY STATE: Question frame open, but question text NOT revealed yet! */
            <div className="text-center py-6 space-y-2 animate-pulse">
              <div className="text-lg sm:text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-sky-300 via-yellow-200 to-amber-300 tracking-wider uppercase">
                SẴN SÀNG THI ĐẤU
              </div>
              <div className="text-xs sm:text-sm text-slate-400">
                Nhấn [CÂU TIẾP THEO] trên bàn điều khiển để bắt đầu câu hỏi và tính giờ
              </div>
            </div>
          ) : (
            /* REVEALED QUESTION CONTENT */
            <div className="w-full text-center space-y-3">
              <div className={`font-black text-white text-center select-text drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)] ${autoQuestionFontSize(kd.current.q)}`}>
                {kd.current.q}
              </div>

              {kd.current.media && (
                <MediaView url={kd.current.media} type={kd.current.mediaType} className="max-h-56 rounded-2xl mx-auto shadow-2xl border border-white/20" />
              )}

              {kd.phase === "result" && kd.current.a && (
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-2xl bg-emerald-950/70 border border-emerald-400/40 text-emerald-300 font-black text-base sm:text-xl shadow-[0_0_20px_rgba(16,185,129,0.3)] animate-fade-in">
                  <span>✔ ĐÁP ÁN:</span>
                  <span>{kd.current.a}</span>
                </div>
              )}
            </div>
          )}

          {/* Buzzer unlocked alert (Shared mode) */}
          {kd.buzzUnlockAt && kd.buzzUnlockAt > serverNow() && (
            <div className="mt-2 inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/20 border border-amber-400 text-amber-300 font-black text-xs sm:text-sm animate-pulse shadow-[0_0_15px_rgba(245,158,11,0.4)]">
              <span>🔒 Chuông mở sau:</span>
              <span className="font-mono font-black text-yellow-300">
                {Math.max(1, Math.ceil((kd.buzzUnlockAt - serverNow()) / 1000))}s
              </span>
            </div>
          )}

          {/* Buzzed player popup */}
          {kd.buzzedSeat != null && (
            <div className="mt-2 inline-flex items-center gap-2 px-5 py-2 rounded-2xl bg-yellow-400 text-slate-950 font-black text-lg sm:text-xl shadow-[0_0_25px_rgba(250,204,21,0.6)] animate-bounce">
              <span>🔔</span>
              <span>{seatName(state, kd.buzzedSeat)}</span>
            </div>
          )}
        </div>

        {/* 3. Footer: Sleek Glowing Timer Bar */}
        {(() => {
          const isO22OrBefore = state.rulesetId === "O22" || /^O(1[3-9]|2[0-2])$/.test(state.rulesetId);
          if (isO22OrBefore) {
            if (!kd.globalTimer) return null;
            return (
              <div className="shrink-0 pt-1 border-t border-white/10">
                <DisplayTimerBar timer={kd.globalTimer} serverNow={serverNow} />
              </div>
            );
          }
          if (kd.timer && kd.timer.startedAt != null) {
            return (
              <div className="shrink-0 pt-1 border-t border-white/10">
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
    <div className="w-full max-w-6xl space-y-4">
      <div className="relative mx-auto rounded-2xl overflow-hidden border border-white/20 bg-slate-800 aspect-[16/7] max-h-[38vh]">
        {v.mysteryImage && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={v.mysteryImage} alt="" className="absolute inset-0 w-full h-full object-cover" />
        )}
        <div className="absolute inset-0 grid grid-cols-2 grid-rows-2">
          {v.rows.map((_r, i) => (
            <div
              key={i}
              className={`flex items-center justify-center text-4xl font-black border border-slate-900 transition-all duration-700 ${v.piecesRevealed[i] ? "opacity-0" : "bg-blue-800/95 opacity-100"}`}
            >
              {i + 1}
            </div>
          ))}
        </div>
        <div
          className={`absolute inset-1/4 rounded-2xl border-2 border-amber-300/60 flex items-center justify-center text-2xl font-black transition-all duration-700 ${
            v.piecesRevealed[4] ? "opacity-0 pointer-events-none" : "bg-indigo-950/95 text-amber-300 shadow-2xl opacity-100"
          }`}
        >
          Ô Trung Tâm
        </div>
      </div>
      <div className="space-y-1">
        {v.rows.map((r, i) => (
          <div
            key={i}
            className={`flex items-center gap-3 rounded-lg px-4 py-2 border text-xl ${v.currentRow === i ? "border-yellow-300 bg-yellow-300/10" : "border-white/10 bg-white/5"}`}
          >
            <span className="w-8 font-black text-sky-300">{i + 1}</span>
            <span className="flex-1">
              {r.opened || (v.answersRevealed && v.currentRow === i) ? <b className="tracking-widest">{r.answer}</b> : v.currentRow === i ? r.hint : "••••••"}
            </span>
            {r.wrong && <span className="text-rose-400">✘</span>}
          </div>
        ))}
      </div>
      <div className="text-center text-2xl tracking-[0.4em] font-black text-yellow-300">
        {v.keyword}
        <span className="ml-3 text-sm text-slate-400 tracking-normal">({v.keyword.replace(/\s/g, "").length} chữ cái)</span>
      </div>
      {isCenterRow && v.centerQuestion && (
        <div className="rounded-xl border border-amber-400/40 bg-amber-500/10 p-3 text-center">
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
            <div key={s.id} className="rounded-lg bg-white/5 p-2 text-center">
              <div className="text-xs" style={{ color: SEAT_COLORS[s.id] }}>
                {s.name}
              </div>
              <div className="text-xl font-bold">{v.answers[s.id]?.text || "—"}</div>
            </div>
          ))}
        </div>
      )}
      {v.bells.length > 0 && (
        <div className="text-center text-2xl text-yellow-300 font-bold">
          🔔 {v.bells.map((b) => seatName(state, b.seat)).join(" → ")}
        </div>
      )}
      {v.solvedBy != null && <div className="text-center text-4xl font-black text-emerald-300">🎉 {seatName(state, v.solvedBy)} giải được chướng ngại vật!</div>}
    </div>
  );
}

function TangToc({ state, serverNow }: P) {
  const tt = state.tangToc!;
  const q = tt.questions[tt.qIdx];
  return (
    <div className="w-full max-w-5xl text-center space-y-4">
      <div className="text-xl text-sky-300">
        Câu {Math.max(1, tt.qIdx + 1)}/{tt.questions.length}
      </div>
      {tt.phase === "idle" && <div className="text-3xl text-slate-300">Chuẩn bị…</div>}
      {q && tt.phase !== "idle" && (
        <>
          {q.q && <div className={`font-bold select-text drop-shadow ${autoQuestionFontSize(q.q)}`}>{q.q}</div>}
          {q.clueImages && q.clueImages.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-4xl mx-auto">
              {q.clueImages.map((cl, idx) => (
                <div key={idx} className="rounded-xl overflow-hidden border border-white/20 bg-slate-900/80 p-1.5">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={cl.url} alt={cl.label || `Gợi ý ${idx + 1}`} className="w-full h-36 object-cover rounded-lg" />
                  <div className="text-xs text-sky-300 font-bold mt-1">
                    {cl.label || `Dữ kiện ${idx + 1}`} ({cl.atSec}s)
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <MediaView url={q.media} type={q.type} className="max-h-[48vh] rounded-xl mx-auto" />
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
          {tt.correctAnswer && <div className="text-3xl text-emerald-300 font-bold">Đáp án: {tt.correctAnswer}</div>}
          {tt.ranking.map((r, i) => (
            <div
              key={r.seat}
              className={`flex items-center gap-3 rounded-lg px-4 py-2 text-xl border ${r.wrong ? "border-rose-500/50 bg-rose-500/10" : "border-white/15 bg-white/5"}`}
            >
              <span className="w-6">{i + 1}</span>
              <b style={{ color: SEAT_COLORS[r.seat] }} className="w-40 text-left truncate">
                {seatName(state, r.seat)}
              </b>
              <span className="flex-1 text-left">{r.noAnswer ? "—" : r.answer}</span>
              <span className="tabular-nums">{r.noAnswer ? "" : `${(r.ms / 1000).toFixed(2)}s`}</span>
              {r.points ? <span className="text-yellow-300 font-black">+{r.points}</span> : null}
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
      {vd.phase === "choosing" && <div className="text-3xl text-slate-300">Đang chọn gói câu hỏi…</div>}
      {vd.packages[owner] && (
        <div className="flex justify-center gap-3">
          {vd.packages[owner].map((p, i) => (
            <div
              key={i}
              className={`w-24 h-24 rounded-xl flex items-center justify-center text-4xl font-black border ${vd.qIdx === i ? "bg-yellow-300 text-slate-950 border-yellow-100" : "bg-white/5 border-white/20"}`}
            >
              {p.points}
            </div>
          ))}
        </div>
      )}
      {cur && (
        <>
          {cur.q.subject && (
            <div className="inline-block px-3 py-1 rounded-full bg-purple-500/20 border border-purple-400/40 text-purple-200 text-base font-bold">
              📚 Lĩnh vực: {cur.q.subject} ({cur.points} điểm)
            </div>
          )}
          {vd.hopeStarActive && <div className="text-3xl text-yellow-300 font-black">⭐ NGÔI SAO HY VỌNG ⭐</div>}
          <div className={`font-bold leading-tight select-text drop-shadow ${autoQuestionFontSize(cur.q.q)}`}>{cur.q.q}</div>
          <MediaView url={cur.q.media} type={cur.q.mediaType} className="max-h-60 rounded-xl mx-auto" />
          {vd.phase === "result" && cur.q.a && <div className="text-4xl text-emerald-300 font-bold">Đáp án: {cur.q.a}</div>}
          <div className="max-w-md mx-auto">
            <Timer timer={vd.steal && vd.phase === "stealing" ? vd.steal.timer : vd.timer} serverNow={serverNow} big />
          </div>
          {vd.phase === "stealing" && (
            <div className="text-4xl font-black text-rose-400">
              🚨 CƯỚP ĐIỂM {vd.steal?.buzzedSeat != null ? `— ${seatName(state, vd.steal.buzzedSeat)}` : ""}
            </div>
          )}
        </>
      )}
      {vd.phase === "seatDone" && <div className="text-4xl font-black text-yellow-300">Hoàn thành lượt thi</div>}
    </div>
  );
}

function Chp({ state, serverNow }: P) {
  const cp = state.cauHoiPhu!;
  const q = cp.questions[cp.qIdx];
  return (
    <QuestionCard>
      <div className="text-xl text-amber-300">Câu hỏi phụ — {cp.tied.map((i) => seatName(state, i)).join(" · ")}</div>
      {q && cp.phase !== "idle" && <div className={`font-bold leading-tight select-text drop-shadow ${autoQuestionFontSize(q.q)}`}>{q.q}</div>}
      {cp.phase === "result" && q?.a && <div className="text-4xl text-emerald-300 font-bold">Đáp án: {q.a}</div>}
      {cp.buzzedSeat != null && <div className="text-4xl font-black text-yellow-300">🔔 {seatName(state, cp.buzzedSeat)}</div>}
      {cp.winner != null && <div className="text-5xl font-black text-emerald-300">🏆 {seatName(state, cp.winner)}</div>}
      <div className="max-w-md mx-auto">
        <Timer timer={cp.timer} serverNow={serverNow} big />
      </div>
    </QuestionCard>
  );
}
