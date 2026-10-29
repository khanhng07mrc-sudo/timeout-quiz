"use client";

import { useEffect, useState } from "react";
import { RULESETS, cnvPointsFor } from "@/lib/olympia/rulesets";
import { ROUND_LABELS, ROUND_ORDER, type OlympiaState, type RoundId } from "@/lib/olympia/types";
import { useOlympiaAudio, useOlympiaSocket, useCountdown } from "./hooks";
import OlympiaTranscriptModal from "./OlympiaTranscriptModal";
import OlympiaAudioManagerDrawer from "./OlympiaAudioManagerDrawer";
import OlympiaRulesWikipediaModal from "./OlympiaRulesWikipediaModal";
import OlympiaMatchReportModal from "./OlympiaMatchReportModal";
import { MediaView, Panel, ScoreStrip, SEAT_COLORS, Timer, activeSeats, btn, btnBad, btnOk, btnPrimary, seatName } from "./ui";

export default function HostConsole({ code, hostKey }: { code: string; hostKey: string }) {
  const { state, join, connected, emit, serverNow } = useOlympiaSocket({ code, role: "host", hostKey });
  const introRem = useCountdown(state?.introTimer, serverNow);
  const [err, setErr] = useState("");
  const [audioOn, setAudioOn] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);
  const [showAudioDrawer, setShowAudioDrawer] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [showMiniDisplay, setShowMiniDisplay] = useState(false);
  useOlympiaAudio(state, join?.audioSeason, audioOn);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea") return;

      if (e.code === "Space") {
        e.preventDefault();
        if (state?.currentRound === "khoiDong") call("kd:timer");
        else if (state?.currentRound === "vcnv") call("vcnv:timer");
        else if (state?.currentRound === "tangToc") call("tt:timer");
        else if (state?.currentRound === "veDich") call("vd:startQuestion");
        else if (state?.currentRound === "cauHoiPhu") call("chp:timer");
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (state?.currentRound === "khoiDong") call("kd:correct");
        else if (state?.currentRound === "vcnv") call("vcnv:correct");
        else if (state?.currentRound === "veDich") call("vd:correct");
        else if (state?.currentRound === "cauHoiPhu") call("chp:correct");
      } else if (e.key === "Backspace") {
        e.preventDefault();
        if (state?.currentRound === "khoiDong") call("kd:wrong");
        else if (state?.currentRound === "veDich") call("vd:wrong");
        else if (state?.currentRound === "cauHoiPhu") call("chp:wrong");
      } else if (e.key === "n" || e.key === "N") {
        e.preventDefault();
        if (state?.currentRound === "khoiDong") call("kd:next");
        else if (state?.currentRound === "tangToc") call("tt:next");
        else if (state?.currentRound === "veDich") call("vd:nextSeat");
        else if (state?.currentRound === "cauHoiPhu") call("chp:next");
      } else if (e.key === "b" || e.key === "B") {
        e.preventDefault();
        if (state?.currentRound === "khoiDong") call("kd:buzzer");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [state?.currentRound]);

  const call = async (type: string, extra: Record<string, unknown> = {}) => {
    const r = await emit("action", { type, ...extra });
    setErr(r.ok ? "" : r.error || "Lỗi");
    return r;
  };

  if (join && !join.ok) {
    return <div className="p-8 text-rose-300 text-lg">Không thể vào bàn điều khiển: {join.error}</div>;
  }
  if (!state) return <div className="p-8 text-sky-200">Đang kết nối…</div>;

  const rs = RULESETS[state.rulesetId];
  const origin = typeof window !== "undefined" ? window.location.origin : "";

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-blue-950 to-slate-950 text-white p-2 md:p-3 space-y-2">
      <header className="flex flex-wrap items-center gap-2 justify-between">
        <div className="min-w-0">
          <h1 className="text-base font-black text-sky-300 truncate">🏔️ Olympia — Bàn điều khiển</h1>
          <p className="text-xs text-slate-300">
            Phòng <b className="text-yellow-300">{code}</b> · <b>{rs.label}</b> · {connected ? "🟢 Đã kết nối" : "🔴 Mất kết nối"}
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5 items-center">
          <button type="button" className="px-2.5 py-1 rounded-lg bg-rose-600/80 hover:bg-rose-500 text-white font-bold text-xs cursor-pointer flex items-center gap-1" onClick={() => call("audio:stop_bgm")} title="Dừng toàn bộ nhạc nền đang phát">⏹ Dừng nhạc</button>
          <button type="button" className="px-2.5 py-1 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs cursor-pointer" onClick={() => setShowAudioDrawer(true)} title="Quản lý và nghe thử âm thanh">🎵 Âm thanh</button>
          <button type="button" className={`px-2.5 py-1 rounded-lg border text-xs font-bold cursor-pointer ${audioOn ? "bg-emerald-600/30 border-emerald-400 text-emerald-200" : "bg-white/10 border-white/20"}`} onClick={() => setAudioOn((v) => !v)}>{audioOn ? "🔊 Tự phát" : "🔈 Tắt tiếng"}</button>
          <button type="button" className="px-2.5 py-1 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs cursor-pointer" onClick={() => setShowTranscript(true)}>📋 Biên bản ({(state.transcript ?? []).length})</button>
          <details className="relative">
            <summary className="px-2.5 py-1 rounded-lg bg-white/10 border border-white/20 text-xs font-bold cursor-pointer list-none select-none">⋯ Thêm</summary>
            <div className="absolute right-0 z-30 mt-1 w-56 rounded-xl border border-white/20 bg-slate-900 shadow-2xl p-1.5 flex flex-col gap-1">
              <button type="button" className="text-left px-2.5 py-1.5 rounded-lg hover:bg-white/10 text-xs font-bold text-amber-300" onClick={() => call("audio:prize")}>🏆 Phát nhạc trao giải</button>
              <button type="button" className="text-left px-2.5 py-1.5 rounded-lg hover:bg-white/10 text-xs font-bold text-sky-300" onClick={() => call("audio:summary")}>📊 Phát nhạc tổng kết</button>
              <button type="button" className="text-left px-2.5 py-1.5 rounded-lg hover:bg-white/10 text-xs font-bold" onClick={() => setShowRules(true)}>📜 Luật Wikipedia</button>
              <button type="button" className="text-left px-2.5 py-1.5 rounded-lg hover:bg-white/10 text-xs font-bold" onClick={() => setShowReport(true)}>📊 Xuất Excel</button>
              <button type="button" className="text-left px-2.5 py-1.5 rounded-lg hover:bg-white/10 text-xs font-bold" onClick={() => setShowMiniDisplay((v) => !v)}>👁️ {showMiniDisplay ? "Ẩn" : "Xem"} màn hình chiếu (PiP)</button>
              <a className="px-2.5 py-1.5 rounded-lg hover:bg-white/10 text-xs font-bold" href={`/olympia/display/${code}`} target="_blank" rel="noreferrer">📺 Mở màn hình chiếu ↗</a>
              <button type="button" className="text-left px-2.5 py-1.5 rounded-lg hover:bg-white/10 text-xs font-bold" onClick={() => navigator.clipboard?.writeText(`${origin}/play?pin=${code}`)}>🔗 Sao chép link thí sinh</button>
            </div>
          </details>
        </div>
      </header>

      {showMiniDisplay && (
        <div className="rounded-2xl border border-cyan-500/40 bg-slate-950/95 p-2 shadow-2xl overflow-hidden flex flex-col gap-1.5 backdrop-blur-md">
          <div className="flex items-center justify-between text-xs px-2.5 py-1 bg-cyan-950/40 rounded-lg border border-cyan-500/20">
            <div className="flex items-center gap-2 font-bold text-cyan-300">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_#22d3ee]" />
              <span>Trực tiếp Màn hình Chiếu Trường Quay (Khán giả & Thí sinh đang thấy)</span>
            </div>
            <div className="flex items-center gap-2">
              <a href={`/olympia/display/${code}`} target="_blank" rel="noreferrer" className="text-cyan-400 hover:text-cyan-200 hover:underline font-bold text-[11px]">
                Mở tab riêng ↗
              </a>
              <button
                type="button"
                onClick={() => setShowMiniDisplay(false)}
                className="text-slate-400 hover:text-white font-black px-1.5 py-0.5 rounded hover:bg-white/10"
              >
                ✕
              </button>
            </div>
          </div>
          <div className="w-full aspect-video max-h-[340px] bg-black rounded-xl overflow-hidden border border-white/10 relative">
            <iframe src={`/olympia/display/${code}`} className="w-full h-full border-0" title="Mini Display Screen Preview" />
          </div>
        </div>
      )}

      {err && <div className="rounded-lg bg-rose-500/20 border border-rose-400 px-3 py-2 text-rose-100">⚠ {err}</div>}

      <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-white/15 bg-slate-900/70 px-2 py-1.5">
        {activeSeats(state).length ? (
          activeSeats(state).map((s) => (
            <span key={s.id} className="inline-flex items-center gap-1.5 rounded-lg bg-white/5 px-2 py-0.5 text-xs" style={{ borderLeft: `4px solid ${SEAT_COLORS[s.id]}` }}>
              <span className="font-semibold truncate max-w-[110px]">{s.name}</span>
              <b className="text-base font-black" style={{ color: SEAT_COLORS[s.id] }}>{s.score}</b>
            </span>
          ))
        ) : (
          <span className="text-xs text-slate-400">Chưa có thí sinh nào vào phòng.</span>
        )}
      </div>

      {state.stage === "lobby" && <Lobby state={state} call={call} code={code} origin={origin} />}
      {state.stage === "playing" && (
        <>
          {state.introTimer && (
            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/20 via-yellow-500/20 to-amber-500/20 border-2 border-yellow-400/60 flex flex-wrap items-center justify-between gap-3 animate-pulse shadow-lg shadow-yellow-500/10">
              <div className="flex items-center gap-3">
                <span className="text-2xl animate-spin">🎬</span>
                <div>
                  <div className="font-black text-yellow-300 text-base">
                    Đang phát nhạc mở đầu show (show_intro.mp3)
                  </div>
                  <div className="text-xs text-slate-300">
                    Tự động chuyển vào Khởi Động sau <b className="text-yellow-400 text-sm">{Math.max(1, Math.ceil(introRem / 1000))}s</b>
                  </div>
                </div>
              </div>
              <button
                type="button"
                className="px-4 py-2 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-black text-sm shadow-md cursor-pointer transition active:scale-95 flex items-center gap-1.5"
                onClick={() => call("intro:skip")}
              >
                <span>⚡ Bỏ qua mở đầu</span>
                <span>⏭</span>
              </button>
            </div>
          )}
          <RoundTracker state={state} call={call} />
          {state.currentRound === "khoiDong" && <KhoiDongPanel state={state} call={call} serverNow={serverNow} />}
          {state.currentRound === "vcnv" && <VcnvPanel state={state} call={call} serverNow={serverNow} />}
          {state.currentRound === "tangToc" && <TangTocPanel state={state} call={call} serverNow={serverNow} />}
          {state.currentRound === "veDich" && <VeDichPanel state={state} call={call} serverNow={serverNow} />}
          {state.currentRound === "cauHoiPhu" && <ChpPanel state={state} call={call} serverNow={serverNow} />}
          <details className="rounded-xl border border-white/15 bg-slate-900/70"><summary className="px-3 py-1.5 text-xs font-bold text-sky-300 cursor-pointer select-none">✏️ Chỉnh điểm thủ công</summary><div className="p-2"><ScoreAdjust state={state} call={call} /></div></details>
        </>
      )}
      {state.stage === "finished" && <Finished state={state} call={call} />}

      <details className="rounded-xl border border-white/15 bg-slate-900/70"><summary className="px-3 py-1.5 text-xs font-bold text-sky-300 cursor-pointer select-none">📜 Nhật ký</summary><div className="p-2 text-xs text-slate-300 max-h-28 overflow-auto space-y-0.5">{[...state.log].reverse().map((l, i) => (<div key={i}>{l}</div>))}</div></details>

      <OlympiaTranscriptModal
        open={showTranscript}
        onClose={() => setShowTranscript(false)}
        state={state}
      />
      <OlympiaAudioManagerDrawer
        open={showAudioDrawer}
        onClose={() => setShowAudioDrawer(false)}
        audioSeason={rs.audioSeason}
        autoAudioMode={audioOn}
        onToggleAutoAudioMode={(m) => setAudioOn(m)}
      />
      <OlympiaRulesWikipediaModal
        open={showRules}
        onClose={() => setShowRules(false)}
        initialSeason={state.rulesetId}
      />
      <OlympiaMatchReportModal
        open={showReport}
        onClose={() => setShowReport(false)}
        state={state}
      />
    </div>
  );
}

type Call = (type: string, extra?: Record<string, unknown>) => Promise<{ ok: boolean; error?: string }>;
type SN = () => number;

function Lobby({ state, call, code, origin }: { state: OlympiaState; call: Call; code: string; origin: string }) {
  const seats = state.seats;
  const count = seats.length;
  const gridCols =
    count === 2
      ? "grid-cols-2"
      : count === 3
      ? "grid-cols-3"
      : count === 4
      ? "grid-cols-2 sm:grid-cols-4"
      : count <= 6
      ? "grid-cols-3 sm:grid-cols-6"
      : "grid-cols-2 sm:grid-cols-4";

  return (
    <Panel title="Sảnh chờ">
      <p className="text-xs sm:text-sm text-slate-300 mb-3">
        Thí sinh vào <b className="text-sky-300">{origin}/play</b> và nhập mã <b className="text-yellow-300">{code}</b> (tối đa {count} người).
      </p>
      <div className={`grid ${gridCols} gap-2 mb-4`}>
        {seats.map((s) => (
          <div key={s.id} className="rounded-lg border border-white/15 p-2 bg-white/5" style={{ borderLeft: `4px solid ${SEAT_COLORS[s.id]}` }}>
            <div className="text-xs text-slate-400">Ghế {s.id + 1}</div>
            {s.name ? (
              <>
                <div className="font-bold truncate text-sm">
                  {s.connected ? "🟢" : "⚪"} {s.name}
                </div>
                <button className="text-xs text-rose-300 underline" onClick={() => call("seat:kick", { seat: s.id })}>
                  Mời ra
                </button>
              </>
            ) : (
              <div className="text-slate-500 italic text-xs">Trống</div>
            )}
          </div>
        ))}
      </div>
      <div className="text-sm mb-3">
        Các vòng sẽ chơi:{" "}
        {state.rounds.map((r) => (
          <span key={r} className="inline-block mr-2 px-2 py-0.5 rounded bg-sky-500/20 border border-sky-400/40">
            {ROUND_LABELS[r]}
          </span>
        ))}
        <span className="inline-block px-2 py-0.5 rounded bg-amber-500/20 border border-amber-400/40">
          {ROUND_LABELS.cauHoiPhu} (tự động nếu đồng hạng)
        </span>
      </div>
      <button className={btnPrimary} onClick={() => call("game:start")}>
        {activeSeats(state).length === 0 ? "▶ Bắt đầu trận đấu (Tạo thí sinh mẫu)" : "▶ Bắt đầu trận đấu"}
      </button>
    </Panel>
  );
}

function RoundTracker({ state, call }: { state: OlympiaState; call: Call }) {
  return (
    <div className="flex flex-wrap gap-1.5 items-center rounded-xl border border-white/15 bg-slate-900/70 px-2 py-1.5">
      {state.roundsPlan.map((r) => {
        const st = state.roundStatus[r];
        const cur = state.currentRound === r;
        return (
          <span
            key={r}
            className={`px-2 py-0.5 rounded-full text-[11px] border ${cur ? "bg-yellow-300 text-slate-950 border-yellow-200 font-black" : st === "done" ? "bg-emerald-500/20 border-emerald-400/40" : "bg-white/5 border-white/15"}`}
          >
            {ROUND_LABELS[r]}
            {st === "done" ? " ✓" : ""}
          </span>
        );
      })}
      <span className="flex-1" />
      <button className={btnPrimary} onClick={() => call("round:next")}>
        Vòng tiếp theo ⏭
      </button>
      <button className={btn} onClick={() => call("round:force", { round: "cauHoiPhu" })}>
        Chạy Câu hỏi phụ
      </button>
      <button className={btnBad} onClick={() => confirm("Kết thúc trận đấu?") && call("game:end")}>
        Kết thúc
      </button>
    </div>
  );
}

function ScoreAdjust({ state, call }: { state: OlympiaState; call: Call }) {
  return (
    <Panel title="Chỉnh điểm thủ công">
      <div className="flex flex-wrap gap-3">
        {activeSeats(state).map((s) => (
          <div key={s.id} className="flex items-center gap-1 text-sm">
            <span style={{ color: SEAT_COLORS[s.id] }} className="font-bold">
              {s.name}
            </span>
            {[-10, -5, 5, 10].map((d) => (
              <button key={d} className={btn} onClick={() => call("score:adjust", { seat: s.id, delta: d })}>
                {d > 0 ? "+" : ""}
                {d}
              </button>
            ))}
          </div>
        ))}
      </div>
    </Panel>
  );
}

function Finished({ state, call }: { state: OlympiaState; call: Call }) {
  const ranking = [...activeSeats(state)].sort((a, b) => b.score - a.score);
  return (
    <Panel title="Kết quả chung cuộc">
      <ol className="space-y-1 mb-3">
        {ranking.map((s, i) => (
          <li key={s.id} className="text-lg">
            {["🥇", "🥈", "🥉"][i] ?? `${i + 1}.`} <b>{s.name}</b> — {s.score} điểm
          </li>
        ))}
      </ol>
      <div className="flex flex-wrap gap-2 pt-2 border-t border-white/10">
        <button className={btn} onClick={() => call("audio:prize")} title="Phát nhạc trao giải thưởng Olympia">
          🏆 Nhạc trao giải
        </button>
        <button className={btn} onClick={() => call("audio:summary")} title="Phát nhạc tổng kết điểm số">
          📊 Nhạc tổng kết
        </button>
        <button className={btnBad} onClick={() => call("audio:stop_bgm")} title="Dừng toàn bộ nhạc">
          ⏹ Dừng nhạc
        </button>
        <button className={btn} onClick={() => call("game:reset")}>
          ↺ Chơi lại (giữ thí sinh, reset điểm)
        </button>
      </div>
    </Panel>
  );
}

// ───────── Khởi Động ─────────
function KhoiDongPanel({ state, call, serverNow }: { state: OlympiaState; call: Call; serverNow: SN }) {
  const kd = state.khoiDong!;
  const seg = kd.segments[kd.segIdx];
  const total = seg.questions > 100 ? "∞" : seg.questions;
  return (
    <Panel title={`Khởi Động — ${seg.label}`}>
      <div className="grid md:grid-cols-3 gap-4">
        <div className="md:col-span-2 space-y-2">
          <div className="text-sm text-slate-300 flex items-center flex-wrap gap-2">
            <span>
              Câu {Math.max(0, kd.qIdx + 1)}/{total} · Giai đoạn: <b>{kd.phase}</b>
            </span>
            {kd.current?.subject && (
              <span className="px-2 py-0.5 rounded-full bg-sky-500/20 border border-sky-400/40 text-sky-300 text-xs font-bold">
                📚 {kd.current.subject}
              </span>
            )}
            {kd.buzzedSeat != null && (
              <span className="ml-2 px-2 rounded bg-yellow-300 text-slate-950 font-bold">🔔 {seatName(state, kd.buzzedSeat)}</span>
            )}
            {kd.buzzOpen && <span className="ml-2 text-emerald-300">chuông đang mở</span>}
            {kd.buzzUnlockAt && kd.buzzUnlockAt > serverNow() && (
              <span className="ml-2 px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 text-xs font-semibold animate-pulse border border-amber-400/30">
                🔒 Chuông khoá ({Math.ceil((kd.buzzUnlockAt - serverNow()) / 1000)}s)
              </span>
            )}
          </div>
          {kd.current ? (
            <div className="rounded-xl bg-white/5 p-2">
              <div className="text-xl font-semibold">{kd.current.q}</div>
              <div className="text-emerald-300 mt-1">Đáp án: {kd.current.a}</div>
              <MediaView url={kd.current.media} type={kd.current.mediaType} className="max-h-40 mt-2 rounded" />
            </div>
          ) : (
            <div className="text-slate-400 italic">{kd.phase === "segmentDone" ? "Hết phần thi — bấm Tiếp để sang phần kế." : "Bấm “Câu tiếp” để mở câu hỏi."}</div>
          )}
          {(() => {
            const isLastQuestionDone =
              kd.segIdx >= kd.segments.length - 1 &&
              (kd.phase === "segmentDone" || (kd.qIdx >= seg.questions - 1 && kd.phase === "result"));
            return (
              <div className="flex flex-wrap gap-2">
                <button
                  className={`${btnPrimary} ${isLastQuestionDone ? "opacity-40 cursor-not-allowed pointer-events-none" : ""}`}
                  disabled={isLastQuestionDone}
                  onClick={() => call("kd:next")}
                  title={isLastQuestionDone ? "Đã kết thúc toàn bộ câu hỏi Khởi Động chung" : undefined}
                >
                  {kd.phase === "segmentDone" ? "Phần tiếp ⏭" : "Câu tiếp ⏭"}
                </button>
            {seg.kind === "solo" && (
              <button className={btn} onClick={() => call("kd:ready")} title="Phát âm thanh sẵn sàng của thí sinh">
                🎵 Sẵn sàng
              </button>
            )}
            <button className={btn} onClick={() => call("kd:timer")}>
              ⏱ Bắt đầu/Tạm dừng
            </button>
            {seg.kind !== "solo" && (
              <button className={btn} onClick={() => call("kd:buzzer")}>
                🔔 Mở/Đóng chuông
              </button>
            )}
            <button className={btnOk} onClick={() => call("kd:correct")}>
              ✔ Đúng
            </button>
            <button className={btnBad} onClick={() => call("kd:wrong")}>
              ✘ Sai
            </button>
            <button className={btn} onClick={() => call("kd:skip")}>
              Bỏ qua
            </button>
          </div>
            );
          })()}
        </div>
        <div className="space-y-2">
          <Timer timer={kd.timer} serverNow={serverNow} />
          {kd.globalTimer && (
            <div>
              <div className="text-xs text-slate-400">Đồng hồ cả lượt</div>
              <Timer timer={kd.globalTimer} serverNow={serverNow} />
            </div>
          )}
          {kd.lockedSeats.length > 0 && (
            <div className="text-xs text-amber-300">Bị khóa: {kd.lockedSeats.map((i) => seatName(state, i)).join(", ")}</div>
          )}
        </div>
      </div>
    </Panel>
  );
}

// ───────── VCNV ─────────
function VcnvPanel({ state, call, serverNow }: { state: OlympiaState; call: Call; serverNow: SN }) {
  const v = state.vcnv!;
  const rs = RULESETS[state.rulesetId] ?? RULESETS.O26;
  const seats = activeSeats(state);
  const row = v.currentRow >= 0 && v.currentRow < 4 ? v.rows[v.currentRow] : null;
  const isCenterRow = v.currentRow === 4;
  // Mặc định để trống toàn bộ ô tích (0 người được chọn sẵn): MC/Admin tự tay tích chọn thí sinh trả lời đúng
  const [checked, setChecked] = useState<number[]>([]);
  useEffect(() => setChecked([]), [v.currentRow]);
  const sel = checked;
  const currentCnvPts = cnvPointsFor(rs, v.openedCount, Boolean(v.centerOpened));
  return (
    <Panel title="Vượt Chướng Ngại Vật">
      <div className="grid md:grid-cols-3 gap-4">
        <div className="md:col-span-2 space-y-3">
          <div className="text-sm flex items-center flex-wrap gap-3">
            <span>
              Từ khóa: <b className="text-yellow-300">{v.keyword}</b> · Đã mở {v.openedCount}/4 hàng
              {v.centerOpened ? " + Ô trung tâm" : ""}
            </span>
            <span className="px-2 py-0.5 rounded bg-amber-500/20 border border-amber-400/40 text-amber-300 text-xs font-bold">
              Điểm giải CNV hiện tại: +{currentCnvPts}đ
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {v.rows.map((r, i) => (
              <button
                key={i}
                disabled={r.opened}
                onClick={() => call("vcnv:selectRow", { row: i })}
                className={`text-left rounded-lg p-2 border ${v.currentRow === i ? "border-yellow-300 bg-yellow-300/10" : "border-white/15 bg-white/5"} ${r.opened ? "opacity-40" : ""}`}
              >
                <div className="text-xs text-slate-400">
                  Hàng {i + 1} {r.opened ? "✓ đã mở" : r.wrong ? "✘ sai" : ""}
                </div>
                <div className="text-sm">{r.hint}</div>
                <div className="text-emerald-300 text-xs">ĐA: {r.answer}</div>
              </button>
            ))}
            <button
              disabled={Boolean(v.centerOpened)}
              onClick={() => call("vcnv:selectRow", { row: 4 })}
              className={`col-span-2 text-left rounded-lg p-2 border ${
                v.currentRow === 4 ? "border-yellow-300 bg-yellow-300/10" : "border-amber-400/30 bg-amber-500/10"
              } ${v.centerOpened ? "opacity-40" : ""}`}
            >
              <div className="text-xs text-amber-300 font-bold">
                ⭐ Câu hỏi số 5 — Ô Trung Tâm (+10đ) {v.centerOpened ? "✓ đã mở" : v.centerWrong ? "✘ sai" : ""}
              </div>
              <div className="text-sm">{v.centerQuestion?.q || "Câu hỏi gợi ý cuối cùng ở trung tâm bức tranh"}</div>
              <div className="text-emerald-300 text-xs">ĐA: {v.centerQuestion?.a || v.keyword}</div>
            </button>
          </div>
          <div className="space-y-2">
            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-xs font-bold text-slate-400">Trong câu hỏi:</span>
              <button className={btn} onClick={() => call("vcnv:timer")}>
                ⏱ 15s suy nghĩ
              </button>
              <button className={btn} onClick={() => call("vcnv:reveal")}>
                👁 Hiện đáp án thí sinh
              </button>
              <button className={btnOk} onClick={() => call("vcnv:correct", { seatIds: sel })}>
                ✔ Chấm đúng ({sel.length})
              </button>
              <button className={btnBad} onClick={() => call("vcnv:wrong")}>
                ✘ Không ai đúng
              </button>
              <button className={btn} onClick={() => call("vcnv:revealTile")} title="Mở mảnh ghép tương ứng hàng này">
                🧩 Mở mảnh ghép hàng này
              </button>
            </div>
            <div className="flex flex-wrap gap-2 items-center pt-1 border-t border-white/10">
              <span className="text-xs font-bold text-slate-400">Cuối vòng / Giải CNV:</span>
              <button className={btn} onClick={() => call("vcnv:revealAll")} title="Mở toàn bộ ô chữ và lật hết mảnh ghép ảnh">
                🌟 Mở tất cả (ô chữ + mảnh ghép)
              </button>
              <button className={btnPrimary} onClick={() => call("vcnv:end")}>
                ⏭ Kết thúc vòng VCNV
              </button>
              <details className="inline-block">
                <summary className="text-xs text-slate-400 hover:text-white cursor-pointer px-2 py-1 rounded bg-white/5 border border-white/10">
                  ⚙️ Mở thủ công chi tiết
                </summary>
                <div className="flex gap-2 mt-1.5">
                  <button className={btn} onClick={() => call("vcnv:revealRowsOnly")}>
                    🔤 Mở tất cả hàng chữ
                  </button>
                  <button className={btn} onClick={() => call("vcnv:revealPiecesOnly")}>
                    🧩 Mở tất cả mảnh ảnh
                  </button>
                </div>
              </details>
            </div>
          </div>
          {(row || isCenterRow) && (
            <div className="rounded-lg bg-white/5 p-2.5 space-y-1.5">
              <div className="text-xs text-slate-300 mb-1">
                Đáp án thí sinh cho <b>{isCenterRow ? "Ô Trung Tâm (Câu 5)" : `Hàng ${v.currentRow + 1}`}</b> — MC tự tích chọn thí sinh đúng (+{rs.vcnv.rowPoints}đ):
              </div>
              {seats.map((s) => {
                const ans = v.answers[s.id];
                return (
                  <label key={s.id} className="flex flex-wrap items-center gap-2 text-sm py-0.5">
                    <input
                      type="checkbox"
                      checked={sel.includes(s.id)}
                      onChange={(e) => setChecked(e.target.checked ? [...sel, s.id] : sel.filter((x) => x !== s.id))}
                    />
                    <span className="font-bold" style={{ color: SEAT_COLORS[s.id] }}>
                      {s.name}:
                    </span>
                    <b className="text-white">{ans?.text || "—"}</b>
                    {ans?.ms != null && (
                      <span className="text-xs font-mono text-cyan-300">({(ans.ms / 1000).toFixed(2)}s)</span>
                    )}
                    {ans?.previousText && (
                      <span className="text-xs text-amber-200/90 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-400/20">
                        Áp chót: &ldquo;{ans.previousText}&rdquo;
                        {ans.previousMs != null ? ` (${(ans.previousMs / 1000).toFixed(2)}s)` : ""}
                      </span>
                    )}
                    {ans?.history && ans.history.length > 2 && (
                      <span className="text-[11px] text-slate-400">
                        ({ans.history.length} lần nhập)
                      </span>
                    )}
                    {v.eliminatedSeats.includes(s.id) && <span className="text-rose-300 text-xs">(đã bị loại)</span>}
                  </label>
                );
              })}
            </div>
          )}
          <div className="rounded-lg bg-white/5 p-2">
            <div className="text-xs text-slate-400 mb-1">Chuông Chướng ngại vật</div>
            {v.bells.length === 0 && <div className="text-slate-500 text-sm">Chưa ai bấm chuông</div>}
            {v.bells.map((b) => (
              <div key={b.seat} className="flex items-center gap-2 text-sm py-0.5">
                🔔 <b style={{ color: SEAT_COLORS[b.seat] }}>{seatName(state, b.seat)}</b>
                {b.before && <span className="text-xs text-amber-300">(trước khi lật đáp án hàng)</span>}
                <button className={btnOk} onClick={() => call("vcnv:correctCNV", { seat: b.seat })}>
                  CNV đúng
                </button>
                <button className={btnBad} onClick={() => call("vcnv:wrongCNV", { seat: b.seat })}>
                  CNV sai (loại)
                </button>
              </div>
            ))}
            {v.centerQuestion && <div className="text-xs text-slate-400 mt-2">Câu hỏi trung tâm: {v.centerQuestion.q} → {v.centerQuestion.a}</div>}
          </div>
        </div>
        <div>
          <Timer timer={v.timer} serverNow={serverNow} />
        </div>
      </div>
    </Panel>
  );
}

// ───────── Tăng Tốc ─────────
function TangTocPanel({ state, call, serverNow }: { state: OlympiaState; call: Call; serverNow: SN }) {
  const tt = state.tangToc!;
  const q = tt.questions[tt.qIdx];
  // Mặc định để trống toàn bộ ô tích (0 người được chọn sẵn): MC/Admin tự tay tích chọn thí sinh đúng
  const [checked, setChecked] = useState<number[]>([]);
  useEffect(() => setChecked([]), [tt.qIdx, tt.phase]);
  const sel = checked;
  return (
    <Panel title={`Tăng Tốc — Câu ${tt.qIdx + 1}/${tt.questions.length}`}>
      <div className="grid md:grid-cols-3 gap-4">
        <div className="md:col-span-2 space-y-3">
          {q ? (
            <div className="rounded-xl bg-white/5 p-2">
              {q.q && <div className="text-lg">{q.q}</div>}
              <MediaView url={q.media} type={q.type} className="max-h-48 rounded mt-2" />
              <div className="text-emerald-300 mt-1">Đáp án: {q.answer}</div>
            </div>
          ) : (
            <div className="text-slate-400 italic">Bấm “Câu tiếp” để chuẩn bị câu hỏi.</div>
          )}
          <div className="flex flex-wrap gap-2">
            <button className={btnPrimary} onClick={() => call("tt:next")}>
              Câu tiếp ⏭
            </button>
            <button className={btn} onClick={() => call("tt:show")}>
              🖼 Hiện câu hỏi
            </button>
            <button className={btn} onClick={() => call("tt:timer")}>
              ⏱ Bắt đầu/Tạm dừng
            </button>
            <button className={btn} onClick={() => call("tt:reveal")}>
              👁 Lật xếp hạng
            </button>
            <button className={btnOk} disabled={tt.phase !== "ranking"} onClick={() => call("tt:grade", { correctSeats: sel })}>
              ✔ Chấm điểm ({sel.length} đúng)
            </button>
            <button className={btn} onClick={() => call("tt:end")}>
              Kết thúc vòng
            </button>
          </div>
          {tt.phase === "question" && (
            <div className="text-sm text-slate-300">
              Đã gửi: {Object.keys(tt.submissions).length}/{activeSeats(state).length}
            </div>
          )}
          {tt.ranking.length > 0 && (
            <div className="rounded-lg bg-white/5 p-2.5 space-y-1.5">
              <div className="text-xs text-slate-300 mb-1">
                Thứ tự trả lời của thí sinh — MC tự tích chọn những người trả lời Đúng rồi bấm <b>Chấm điểm</b>:
              </div>
              {tt.ranking.map((r, i) => (
                <label key={r.seat} className="flex flex-wrap items-center gap-2 text-sm py-0.5">
                  <input
                    type="checkbox"
                    disabled={tt.phase === "graded" || r.noAnswer}
                    checked={sel.includes(r.seat)}
                    onChange={(e) => setChecked(e.target.checked ? [...sel, r.seat] : sel.filter((x) => x !== r.seat))}
                  />
                  <span className="w-6 font-mono font-bold text-yellow-300">#{i + 1}</span>
                  <b style={{ color: SEAT_COLORS[r.seat] }}>{seatName(state, r.seat)}</b>
                  <span>{r.noAnswer ? "(không trả lời)" : `“${r.answer}” — ${(r.ms / 1000).toFixed(2)}s`}</span>
                  {r.previousAnswer && (
                    <span className="text-xs text-amber-200/90 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-400/20">
                      Áp chót: &ldquo;{r.previousAnswer}&rdquo;
                      {r.previousMs != null ? ` (${(r.previousMs / 1000).toFixed(2)}s)` : ""}
                    </span>
                  )}
                  {r.history && r.history.length > 2 && (
                    <span className="text-[11px] text-slate-400">({r.history.length} lần nhập)</span>
                  )}
                  {r.points ? <span className="text-emerald-300 font-bold">+{r.points}đ</span> : null}
                  {r.wrong && <span className="text-rose-300 text-xs">✘ Sai</span>}
                </label>
              ))}
            </div>
          )}
        </div>
        <Timer timer={tt.timer} serverNow={serverNow} />
      </div>
    </Panel>
  );
}

// ───────── Về Đích ─────────
function VeDichPanel({ state, call, serverNow }: { state: OlympiaState; call: Call; serverNow: SN }) {
  const vd = state.veDich!;
  const rs = RULESETS[state.rulesetId].veDich;
  const owner = vd.order[vd.turnIdx];
  const [pts, setPts] = useState<number[]>(() => Array(rs.questionsPerSeat).fill(rs.pointOptions[0]));
  const cur = vd.current;
  const pkg = vd.packages[owner];
  return (
    <Panel title={`Về Đích — Lượt của ${seatName(state, owner)}`}>
      <div className="grid md:grid-cols-3 gap-4">
        <div className="md:col-span-2 space-y-3">
          <div className="flex flex-wrap gap-1 text-sm">
            {vd.order.map((id) => (
              <button
                key={id}
                className={`px-2 py-1 rounded border ${id === owner ? "bg-yellow-300 text-slate-950 border-yellow-200" : "border-white/20 bg-white/5"}`}
                onClick={() => call("vd:setSeat", { seat: id })}
              >
                {seatName(state, id)} {vd.hopeStarUsed.includes(id) ? "⭐✓" : ""}
              </button>
            ))}
          </div>
          {vd.phase === "choosing" && (
            <div className="rounded-lg bg-white/5 p-3 space-y-2">
              {rs.selectionMode === "presetPackages" && rs.presetPackages ? (
                <>
                  <div className="text-sm">
                    Chọn gói câu hỏi cố định ({rs.questionsPerSeat} câu/gói — chuẩn {state.rulesetId}):
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(rs.presetPackages).map(([pkgKey, pkgPoints]) => (
                      <button
                        key={pkgKey}
                        className={btnPrimary}
                        onClick={() => call("vd:choosePackage", { points: pkgPoints })}
                      >
                        📦 Gói {pkgKey} điểm ({pkgPoints.join(" - ")})
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <>
                  <div className="text-sm mb-2">Chọn gói {rs.questionsPerSeat} câu (thí sinh cũng có thể tự chọn trên điện thoại):</div>
                  <div className="flex gap-2 mb-2">
                    {pts.map((p, i) => (
                      <select
                        key={i}
                        value={p}
                        className="bg-slate-800 border border-white/20 rounded px-2 py-1"
                        onChange={(e) => setPts(pts.map((x, j) => (j === i ? Number(e.target.value) : x)))}
                      >
                        {rs.pointOptions.map((o) => (
                          <option key={o} value={o}>
                            {o}đ
                          </option>
                        ))}
                      </select>
                    ))}
                  </div>
                  <button className={btnPrimary} onClick={() => call("vd:choosePackage", { points: pts })}>
                    Xác nhận gói
                  </button>
                </>
              )}
            </div>
          )}
          {pkg && (
            <div className="text-sm text-slate-300">
              Gói: {pkg.map((p, i) => (
                <span key={i} className={`mr-2 px-2 rounded ${vd.qIdx === i ? "bg-yellow-300 text-slate-950 font-bold" : "bg-white/10"}`}>
                  {p.points}đ
                </span>
              ))}
            </div>
          )}
          {cur && (
            <div className="rounded-xl bg-white/5 p-2">
              <div className="text-xs text-slate-400">
                {cur.points} điểm · {cur.q.type === "practice" ? "thực hành" : "lý thuyết"} {vd.hopeStarActive && <b className="text-yellow-300">⭐ Ngôi sao hy vọng</b>}
              </div>
              <div className="text-xl font-semibold">{cur.q.q}</div>
              <div className="text-emerald-300">Đáp án: {cur.q.a}</div>
              <MediaView url={cur.q.media} type={cur.q.mediaType} className="max-h-40 rounded mt-2" />
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            <button className={btnPrimary} onClick={() => call("vd:startQuestion")}>
              Câu tiếp ⏭
            </button>
            <button className={btn} onClick={() => call("vd:timer")}>
              ⏱ Bắt đầu/Tạm dừng
            </button>
            <button className={btn} onClick={() => call("vd:hopeStar")}>
              ⭐ Ngôi sao hy vọng
            </button>
            <button className={btnOk} onClick={() => call("vd:correct")}>
              ✔ Đúng
            </button>
            <button className={btnBad} onClick={() => call("vd:wrong")}>
              ✘ Sai / hết giờ
            </button>
            <button className={btn} onClick={() => call("vd:openSteal")}>
              🚨 Mở cướp điểm 5s
            </button>
            <button className={btnOk} onClick={() => call("vd:correctSteal")}>
              Cướp đúng
            </button>
            <button className={btnBad} onClick={() => call("vd:wrongSteal")}>
              Cướp sai
            </button>
            <button className={btn} onClick={() => call("vd:nextSeat")}>
              Thí sinh tiếp theo ⏭
            </button>
          </div>
          {vd.steal && (
            <div className="text-sm">
              Cướp điểm: {vd.steal.buzzedSeat != null ? <b className="text-yellow-300">🔔 {seatName(state, vd.steal.buzzedSeat)}</b> : "chưa ai bấm"}
            </div>
          )}
          {vd.lastVerdict && <div className="text-xs text-slate-400">Kết quả: {vd.lastVerdict}</div>}
        </div>
        <div className="space-y-2">
          <Timer timer={vd.timer} serverNow={serverNow} />
          {vd.steal && <Timer timer={vd.steal.timer} serverNow={serverNow} />}
        </div>
      </div>
    </Panel>
  );
}

// ───────── Câu hỏi phụ ─────────
function ChpPanel({ state, call, serverNow }: { state: OlympiaState; call: Call; serverNow: SN }) {
  const cp = state.cauHoiPhu!;
  const q = cp.questions[cp.qIdx];
  return (
    <Panel title={`Câu hỏi phụ — ${cp.tied.map((i) => seatName(state, i)).join(", ")}`}>
      <div className="grid md:grid-cols-3 gap-4">
        <div className="md:col-span-2 space-y-3">
          {q ? (
            <div className="rounded-xl bg-white/5 p-2">
              <div className="text-xl font-semibold">{q.q}</div>
              <div className="text-emerald-300">Đáp án: {q.a}</div>
            </div>
          ) : (
            <div className="text-slate-400 italic">{cp.phase === "done" ? "Hết câu hỏi phụ." : "Bấm “Câu tiếp”."}</div>
          )}
          {cp.buzzedSeat != null && <div className="text-yellow-300 font-bold">🔔 {seatName(state, cp.buzzedSeat)}</div>}
          {cp.winner != null && <div className="text-emerald-300 font-bold">🏆 {seatName(state, cp.winner)} trả lời đúng</div>}
          <div className="flex flex-wrap gap-2">
            <button className={btnPrimary} onClick={() => call("chp:next")}>
              Câu tiếp ⏭
            </button>
            <button className={btn} onClick={() => call("chp:show")}>
              Hiện câu hỏi
            </button>
            <button className={btn} onClick={() => call("chp:timer")}>
              ⏱ Bắt đầu/Tạm dừng (mở chuông)
            </button>
            <button className={btnOk} onClick={() => call("chp:correct")}>
              ✔ Đúng
            </button>
            <button className={btnBad} onClick={() => call("chp:wrong")}>
              ✘ Sai
            </button>
            <button className={btn} onClick={() => call("chp:finish")}>
              Kết thúc vòng
            </button>
          </div>
        </div>
        <Timer timer={cp.timer} serverNow={serverNow} />
      </div>
    </Panel>
  );
}

export type { RoundId };
void ROUND_ORDER;
