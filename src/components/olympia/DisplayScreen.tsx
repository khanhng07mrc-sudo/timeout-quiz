"use client";

import { useState } from "react";
import { ROUND_LABELS, type OlympiaState } from "@/lib/olympia/types";
import { useOlympiaAudio, useOlympiaSocket } from "./hooks";
import { MediaView, ScoreStrip, SEAT_COLORS, Timer, activeSeats, seatName } from "./ui";

export default function DisplayScreen({ code }: { code: string }) {
  const { state, join, connected, serverNow } = useOlympiaSocket({ code, role: "display" });
  const [audioOn, setAudioOn] = useState(false);
  useOlympiaAudio(state, join?.audioSeason, audioOn);

  if (join && !join.ok) return <div className="p-10 text-rose-300 text-2xl">{join.error}</div>;
  if (!state) return <div className="p-10 text-sky-200 text-2xl">Đang kết nối…</div>;
  const origin = typeof window !== "undefined" ? window.location.origin : "";

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-950 via-indigo-950 to-slate-950 text-white flex flex-col p-6 gap-4 select-none">
      <div className="flex items-center justify-between">
        <div className="text-2xl font-black text-sky-300 tracking-wide">ĐƯỜNG LÊN ĐỈNH OLYMPIA</div>
        <div className="flex items-center gap-3 text-sm text-slate-300">
          <span>{state.currentRound ? ROUND_LABELS[state.currentRound] : ""}</span>
          <button className="px-2 py-1 border border-white/20 rounded" onClick={() => setAudioOn((v) => !v)}>
            {audioOn ? "🔊" : "🔈 Bật âm thanh"}
          </button>
          <span>{connected ? "🟢" : "🔴"}</span>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center">
        {state.stage === "lobby" && <Lobby state={state} code={code} origin={origin} />}
        {state.stage === "finished" && <Podium state={state} />}
        {state.stage === "playing" && state.banner && (
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
  return (
    <div className="text-center space-y-6">
      <div className="text-xl text-slate-300">Vào {origin}/play và nhập mã</div>
      <div className="text-9xl font-black tracking-[0.3em] text-yellow-300">{code}</div>
      <div className="grid grid-cols-4 gap-3 max-w-3xl mx-auto">
        {state.seats.map((s) => (
          <div
            key={s.id}
            className="rounded-xl border border-white/15 bg-white/5 p-3 text-lg"
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

function QuestionCard({ children }: { children: React.ReactNode }) {
  return <div className="max-w-5xl mx-auto text-center space-y-4">{children}</div>;
}

function KhoiDong({ state, serverNow }: P) {
  const kd = state.khoiDong!;
  const seg = kd.segments[kd.segIdx];
  return (
    <QuestionCard>
      <div className="text-xl text-sky-300">{seg.label}</div>
      {kd.phase === "intro" && <div className="text-3xl text-slate-300">Chuẩn bị…</div>}
      {kd.phase === "segmentDone" && <div className="text-4xl font-black text-yellow-300">Kết thúc phần thi</div>}
      {kd.current && (
        <>
          <div className="text-sm text-slate-400 flex items-center justify-center gap-2">
            <span>
              Câu {kd.qIdx + 1}
              {seg.questions > 100 ? "" : `/${seg.questions}`}
            </span>
            {kd.current.subject && (
              <span className="px-2.5 py-0.5 rounded-full bg-sky-500/20 border border-sky-400/40 text-sky-300 font-bold">
                📚 {kd.current.subject}
              </span>
            )}
          </div>
          <div className="text-5xl font-bold leading-tight">{kd.current.q}</div>
          <MediaView url={kd.current.media} type={kd.current.mediaType} className="max-h-72 rounded-xl mx-auto" />
          {kd.phase === "result" && kd.current.a && <div className="text-4xl text-emerald-300 font-bold">Đáp án: {kd.current.a}</div>}
          {kd.buzzedSeat != null && <div className="text-4xl font-black text-yellow-300">🔔 {seatName(state, kd.buzzedSeat)}</div>}
          <div className="max-w-md mx-auto">
            <Timer timer={kd.globalTimer ?? kd.timer} serverNow={serverNow} big />
          </div>
        </>
      )}
    </QuestionCard>
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
          {q.q && <div className="text-4xl font-bold">{q.q}</div>}
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
          <div className="text-5xl font-bold leading-tight">{cur.q.q}</div>
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
      {q && cp.phase !== "idle" && <div className="text-5xl font-bold leading-tight">{q.q}</div>}
      {cp.phase === "result" && q?.a && <div className="text-4xl text-emerald-300 font-bold">Đáp án: {q.a}</div>}
      {cp.buzzedSeat != null && <div className="text-4xl font-black text-yellow-300">🔔 {seatName(state, cp.buzzedSeat)}</div>}
      {cp.winner != null && <div className="text-5xl font-black text-emerald-300">🏆 {seatName(state, cp.winner)}</div>}
      <div className="max-w-md mx-auto">
        <Timer timer={cp.timer} serverNow={serverNow} big />
      </div>
    </QuestionCard>
  );
}
