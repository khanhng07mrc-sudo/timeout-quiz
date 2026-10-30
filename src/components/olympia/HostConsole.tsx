"use client";

import React, { useEffect, useState, useRef, useMemo } from "react";
import { RULESETS, cnvPointsFor } from "@/lib/olympia/rulesets";
import { ROUND_LABELS, ROUND_ORDER, type OlympiaState, type RoundId, type Seat, type O22Quarter } from "@/lib/olympia/types";
import { useOlympiaAudio, useOlympiaSocket, useCountdown } from "./hooks";
import OlympiaTranscriptModal from "./OlympiaTranscriptModal";
import OlympiaAudioManagerDrawer from "./OlympiaAudioManagerDrawer";
import OlympiaRulesWikipediaModal from "./OlympiaRulesWikipediaModal";
import OlympiaMatchReportModal from "./OlympiaMatchReportModal";
import { MediaView, SEAT_COLORS, Timer, activeSeats, seatName } from "./ui";

type Call = (type: string, extra?: Record<string, unknown>) => Promise<{ ok: boolean; error?: string }>;
type SN = () => number;

export default function HostConsole({ code, hostKey }: { code: string; hostKey: string }) {
  const { state, join, connected, emit, serverNow } = useOlympiaSocket({ code, role: "host", hostKey });
  const [err, setErr] = useState("");
  // Auto-enabled by default so Host Console plays all game sounds like the real desktop software
  const [audioOn, setAudioOn] = useState(true);
  const [rightSidebarOpen, setRightSidebarOpen] = useState(false);
  const [o22Quarter, setO22Quarter] = useState<O22Quarter>(1);

  useEffect(() => {
    if (state?.o22Quarter && state.o22Quarter !== o22Quarter) {
      setO22Quarter(state.o22Quarter);
    }
  }, [state?.o22Quarter]);
  const [showTranscript, setShowTranscript] = useState(false);
  const [showAudioDrawer, setShowAudioDrawer] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [showMiniDisplay, setShowMiniDisplay] = useState(false);
  const [showScoreModal, setShowScoreModal] = useState(false);
  const [manualSeat, setManualSeat] = useState<number>(0);
  const [manualDelta, setManualDelta] = useState<number>(10);

  // HostConsole: Audio is strictly played by Display only
  useOlympiaAudio(state, join?.audioSeason, false);

  const call: Call = async (type: string, extra: Record<string, unknown> = {}) => {
    const r = await emit("action", { type, ...extra });
    setErr(r.ok ? "" : r.error || "Lỗi");
    return r;
  };

  // Keyboard Shortcuts matching the reference application:
  // Space: Play/Pause | Enter: Đúng | Bksp: Sai | W: Nền chờ | R: Lật đáp án | C: Toggle chuông | S: Ngôi sao | B: Bảng điểm | N: Câu tiếp
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select") return;

      if (e.code === "Space") {
        e.preventDefault();
        if (state?.currentRound === "khoiDong") call("kd:timer");
        else if (state?.currentRound === "vcnv") call("vcnv:timer");
        else if (state?.currentRound === "tangToc") call("tt:timer");
        else if (state?.currentRound === "veDich") call("vd:timer");
        else if (state?.currentRound === "cauHoiPhu") call("chp:timer");
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (state?.currentRound === "khoiDong") call("kd:correct");
        else if (state?.currentRound === "vcnv") call("vcnv:correct");
        else if (state?.currentRound === "tangToc") call("tt:grade");
        else if (state?.currentRound === "veDich") call("vd:correct");
        else if (state?.currentRound === "cauHoiPhu") call("chp:correct");
      } else if (e.key === "Backspace") {
        e.preventDefault();
        if (state?.currentRound === "khoiDong") call("kd:wrong");
        else if (state?.currentRound === "vcnv") call("vcnv:wrong");
        else if (state?.currentRound === "veDich") call("vd:wrong");
        else if (state?.currentRound === "cauHoiPhu") call("chp:wrong");
      } else if (e.key === "w" || e.key === "W") {
        e.preventDefault();
        call("bgm:waiting");
      } else if (e.key === "r" || e.key === "R") {
        e.preventDefault();
        if (state?.currentRound === "vcnv") call("vcnv:reveal");
        else if (state?.currentRound === "tangToc") call("tt:revealAndGrade");
      } else if (e.key === "c" || e.key === "C") {
        e.preventDefault();
        if (state?.currentRound === "khoiDong") call("kd:buzzer");
        else if (state?.currentRound === "vcnv") call("vcnv:clearBells");
        else if (state?.currentRound === "veDich") call("vd:openSteal");
        else if (state?.currentRound === "cauHoiPhu") call("chp:buzzer");
      } else if (e.key === "s" || e.key === "S") {
        e.preventDefault();
        if (state?.currentRound === "veDich") call("vd:hopeStar");
      } else if (e.key === "b" || e.key === "B") {
        e.preventDefault();
        call("scoreboard:toggle");
      } else if (e.key === "n" || e.key === "N") {
        e.preventDefault();
        if (state?.currentRound === "khoiDong") call("kd:next");
        else if (state?.currentRound === "tangToc") call("tt:next");
        else if (state?.currentRound === "veDich") call("vd:nextSeat");
        else if (state?.currentRound === "cauHoiPhu") call("chp:next");
      } else if (e.key === "f" || e.key === "F") {
        e.preventDefault();
        if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(() => {});
        else document.exitFullscreen().catch(() => {});
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [state?.currentRound]);

  if (join && !join.ok) {
    return <div className="p-8 text-rose-300 text-lg">Không thể vào bàn điều khiển: {join.error}</div>;
  }
  if (!state) return <div className="p-8 text-sky-200">Đang kết nối bàn điều khiển…</div>;

  const seats = activeSeats(state);
  const curRound = state.currentRound;
  const curRoundName = curRound ? ROUND_LABELS[curRound] : "CHỜ BẮT ĐẦU";

  // Calculate current timer countdown for right-hand status widget with live useCountdown
  const activeTimer = useMemo(() => {
    if (!state) return null;
    const curRound = state.currentRound;
    if (curRound === "khoiDong") {
      return state.khoiDong?.globalTimer || state.khoiDong?.timer || null;
    } else if (curRound === "vcnv") {
      return state.vcnv?.timer || null;
    } else if (curRound === "tangToc") {
      return state.tangToc?.timer || null;
    } else if (curRound === "veDich") {
      return (state.veDich?.steal?.open ? state.veDich.steal.timer : state.veDich?.timer) || null;
    } else if (curRound === "cauHoiPhu") {
      return state.cauHoiPhu?.timer || null;
    }
    return null;
  }, [state]);

  const activeTimerMs = useCountdown(activeTimer, serverNow);
  const activeTimerSeconds = activeTimer
    ? (activeTimer.startedAt != null || activeTimer.remainingMs > 0
        ? `${Math.ceil(activeTimerMs / 1000)}s`
        : "0s")
    : "--";

  const buzzerActive =
    curRound === "khoiDong"
      ? state.khoiDong?.buzzOpen
      : curRound === "veDich"
        ? state.veDich?.steal?.open
        : curRound === "cauHoiPhu"
          ? state.cauHoiPhu?.buzzOpen
          : false;

  const buzzedNameText =
    curRound === "khoiDong" && state.khoiDong?.buzzedSeat != null
      ? seatName(state, state.khoiDong.buzzedSeat)
      : curRound === "vcnv" && (state.vcnv?.bells?.length ?? 0) > 0
        ? seatName(state, state.vcnv!.bells[0].seat)
        : curRound === "veDich" && state.veDich?.steal?.buzzedSeat != null
          ? seatName(state, state.veDich.steal.buzzedSeat)
          : curRound === "cauHoiPhu" && state.cauHoiPhu?.buzzedSeat != null
            ? seatName(state, state.cauHoiPhu.buzzedSeat)
            : "--";

  return (
    <div className="h-full max-h-full bg-gradient-to-b from-[#0d0820] via-[#120b2e] to-[#0a0618] text-slate-100 flex flex-col font-sans select-none overflow-hidden">
      {/* ── TOP HEADER BAR (CLEAN, NO OVERLAPPING) ── */}
      <header className="h-10 border-b border-violet-500/15 bg-black/30 backdrop-blur-sm px-2.5 sm:px-3 flex items-center justify-between shrink-0 gap-2">
        {/* Left: Branding & Current Round */}
        <div className="flex items-center gap-2 min-w-0 shrink-0">
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-red-400 text-xs sm:text-sm font-black tracking-wide flex items-center gap-1.5 whitespace-nowrap">
            <span>🏔️</span>
            <span>ĐƯỜNG LÊN ĐỈNH OLYMPIA</span>
          </span>
          <span className="px-2 py-0.5 rounded-full bg-violet-500/20 border border-violet-400/30 text-violet-200 text-[11px] font-bold uppercase whitespace-nowrap">
            {curRoundName}
          </span>
        </div>

        {/* Right: Audio Manager, Mute, Toggle Sidebar, Connection & PIN */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setShowAudioDrawer(true)}
            className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white font-black text-xs shadow cursor-pointer flex items-center gap-1 shrink-0"
            title="Mở Audio Manager quản lý và nghe thử âm thanh"
          >
            <span>🎵 AUDIO</span>
            <span className="px-1.5 py-0.2 rounded-full bg-black/40 text-[10px] text-yellow-300">22</span>
          </button>

          <button
            type="button"
            onClick={() => setAudioOn((v) => !v)}
            className={`px-2 py-1 rounded text-xs font-bold cursor-pointer border shrink-0 ${
              audioOn ? "bg-emerald-600/30 border-emerald-400 text-emerald-200" : "bg-white/5 border-white/10 text-slate-400"
            }`}
            title="Bật/Tắt âm thanh bàn điều khiển"
          >
            {audioOn ? "🔊" : "🔈"}
          </button>

          <button
            type="button"
            onClick={() => setRightSidebarOpen((v) => !v)}
            className={`px-2 py-1 rounded text-xs font-bold border transition flex items-center gap-1 cursor-pointer shrink-0 ${
              rightSidebarOpen
                ? "bg-purple-600/30 border-purple-400 text-purple-200 shadow"
                : "bg-white/5 border-white/10 text-slate-300 hover:bg-white/10"
            }`}
            title="Ẩn/Hiện cột Phím tắt & Trạng thái"
          >
            <span>⌨️</span>
            <span className="hidden lg:inline">{rightSidebarOpen ? "Thu gọn cột" : "Phím tắt"}</span>
          </button>

          <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-300 pl-1.5 border-l border-white/10 shrink-0">
            <span className={connected ? "text-emerald-400 font-bold" : "text-rose-400 font-bold"}>
              {connected ? "🟢" : "🔴"}
            </span>
            <span className="font-mono text-amber-300 font-bold text-[11px]">PIN: {code}</span>
          </div>
        </div>
      </header>

      {/* Mini Display PIP Modal if enabled */}
      {showMiniDisplay && (
        <div className="bg-slate-900 border-b border-cyan-500/30 p-2 flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-xs px-2 text-cyan-300 font-bold">
            <span>📺 Xem trước Màn hình Chiếu (Display Screen)</span>
            <div className="flex gap-2">
              <a href={`/olympia/display/${code}`} target="_blank" rel="noreferrer" className="text-sky-400 hover:underline">
                Mở tab riêng ↗
              </a>
              <button type="button" onClick={() => setShowMiniDisplay(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>
          </div>
          <div className="w-full aspect-video max-h-[260px] bg-black rounded-lg overflow-hidden border border-white/10">
            <iframe src={`/olympia/display/${code}`} className="w-full h-full border-0" title="Mini Display" />
          </div>
        </div>
      )}

      {err && <div className="bg-rose-500/20 border-b border-rose-500/50 px-3 py-1.5 text-rose-200 text-xs">⚠️ {err}</div>}

      {/* ── MAIN 3-COLUMN WORKSPACE ── */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* 1. LEFT SIDEBAR: Rounds & Tools (Compact) */}
        <aside className="w-28 sm:w-32 bg-black/25 border-r border-violet-500/15 p-1.5 flex flex-col justify-between shrink-0">
          <div className="space-y-1">
            <RoundTabButton
              id="khoiDong"
              label="Khởi Động"
              icon="⭐"
              active={curRound === "khoiDong"}
              done={state.roundStatus.khoiDong === "done"}
              onClick={() => call("round:force", { round: "khoiDong" })}
            />
            <RoundTabButton
              id="vcnv"
              label="VCNV"
              icon="🧩"
              active={curRound === "vcnv"}
              done={state.roundStatus.vcnv === "done"}
              onClick={() => call("round:force", { round: "vcnv" })}
            />
            <RoundTabButton
              id="tangToc"
              label="Tăng Tốc"
              icon="⚡"
              active={curRound === "tangToc"}
              done={state.roundStatus.tangToc === "done"}
              onClick={() => call("round:force", { round: "tangToc" })}
            />
            <RoundTabButton
              id="veDich"
              label="Về Đích"
              icon="🏁"
              active={curRound === "veDich"}
              done={state.roundStatus.veDich === "done"}
              onClick={() => call("round:force", { round: "veDich" })}
            />
            <RoundTabButton
              id="cauHoiPhu"
              label="Câu Hỏi Phụ"
              icon="❓"
              active={curRound === "cauHoiPhu"}
              done={state.roundStatus.cauHoiPhu === "done"}
              onClick={() => call("round:force", { round: "cauHoiPhu" })}
            />
          </div>

          <div className="pt-1.5 border-t border-white/10 space-y-1">
            <button
              type="button"
              onClick={() => call("scoreboard:toggle")}
              className="w-full text-left px-1.5 py-1 rounded text-[10px] sm:text-[11px] font-bold text-slate-300 hover:bg-white/10 flex items-center gap-1 cursor-pointer truncate"
              title="Mở Bảng Điểm (Phím B)"
            >
              <span>📊</span>
              <span className="truncate">Điểm (B)</span>
            </button>
            <button
              type="button"
              onClick={() => {
                if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(() => {});
                else document.exitFullscreen().catch(() => {});
              }}
              className="w-full text-left px-1.5 py-1 rounded text-[10px] sm:text-[11px] font-bold text-slate-300 hover:bg-white/10 flex items-center gap-1 cursor-pointer truncate"
              title="Toàn màn hình (Phím F)"
            >
              <span>🖥️</span>
              <span className="truncate">Full (F)</span>
            </button>
            <button
              type="button"
              onClick={() => setShowMiniDisplay((v) => !v)}
              className="w-full text-left px-1.5 py-1 rounded text-[10px] sm:text-[11px] font-bold text-slate-300 hover:bg-white/10 flex items-center gap-1 cursor-pointer truncate"
              title="Bật PIP xem trước Màn chiếu"
            >
              <span>👁️</span>
              <span className="truncate">Chiếu</span>
            </button>
            <button
              type="button"
              onClick={() => setShowReport(true)}
              className="w-full text-left px-1.5 py-1 rounded text-[10px] sm:text-[11px] font-bold text-slate-300 hover:bg-white/10 flex items-center gap-1 cursor-pointer truncate"
              title="Cài đặt & Xuất kết quả"
            >
              <span>⚙️</span>
              <span className="truncate">Cài đặt</span>
            </button>
          </div>
        </aside>

        {/* 2. CENTER STAGE: Question Box, Utility Top Bar & Round Control Deck */}
        <main className="flex-1 overflow-y-auto p-2 space-y-2 flex flex-col justify-between min-h-0 scrollbar-thin">
          <div className="space-y-2">
            {/* Round & Question Indicator Bar */}
            <div className="flex items-center justify-between text-xs px-1">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-300">
                  {curRound === "khoiDong" && state.khoiDong
                    ? `Câu ${Math.max(0, state.khoiDong.qIdx + 1)}/${state.khoiDong.segments[state.khoiDong.segIdx]?.questions ?? 6}`
                    : curRound === "vcnv" && state.vcnv
                      ? `Hàng ${state.vcnv.openedCount}/4`
                      : curRound === "tangToc" && state.tangToc
                        ? `Câu ${Math.max(0, state.tangToc.qIdx + 1)}/4`
                        : curRound === "veDich" && state.veDich
                          ? `Câu ${Math.max(0, state.veDich.qIdx + 1)}/3`
                          : curRound === "cauHoiPhu" && state.cauHoiPhu
                            ? `Câu ${Math.max(0, state.cauHoiPhu.qIdx + 1)}/3`
                            : "Vòng đấu"}
                </span>
                <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold border border-amber-400/30 text-[11px]">
                  {curRound === "khoiDong"
                    ? "10đ"
                    : curRound === "vcnv"
                      ? "10đ/hàng"
                      : curRound === "tangToc"
                        ? "10..40đ"
                        : curRound === "veDich" && state.veDich?.current
                          ? `${state.veDich.current.points}đ`
                          : "10đ"}
                </span>
              </div>
              <div className="text-xl font-black font-mono text-amber-300 drop-shadow-[0_0_8px_rgba(251,191,36,0.6)]">
                {activeTimerSeconds}
              </div>
            </div>

            {/* 1. Question Card Box (Fixed height for stability) */}
            <div className="rounded-xl border border-violet-500/25 bg-gradient-to-b from-[#1a0d3f]/90 to-[#0f0728]/95 p-2.5 shadow-md backdrop-blur-sm">
              <div className="text-xs md:text-sm font-semibold leading-relaxed min-h-[52px] max-h-[52px] overflow-y-auto no-scrollbar flex items-center">
                {getQuestionText(state) || <span className="text-slate-400 italic">Đang đợi câu hỏi…</span>}
              </div>
            </div>

            {/* 2. Separate Answer & Explanation Card Box */}
            <div className="rounded-xl border border-emerald-500/35 bg-gradient-to-r from-emerald-950/45 via-[#0b1f1a]/70 to-purple-950/35 p-2 flex flex-col gap-1.5 shadow-md backdrop-blur-sm">
              {/* Green box: ĐÁP ÁN */}
              <div className="rounded-lg bg-emerald-900/50 border border-emerald-400/40 px-2.5 py-1 text-xs text-emerald-200 flex items-center gap-2 shadow-inner">
                <span className="font-black text-emerald-400 shrink-0 text-[11px] uppercase tracking-wider">ĐÁP ÁN:</span>
                <span className="font-bold text-xs tracking-wide text-emerald-100 select-text">{getAnswerText(state) || "--"}</span>
              </div>

              {/* Purple box: GIẢI THÍCH */}
              {getExplanationText(state) && (
                <div className="rounded-lg bg-purple-950/40 border border-purple-400/30 px-2.5 py-1 text-xs text-purple-200 flex items-center gap-2">
                  <span className="font-black text-purple-400 shrink-0 text-[11px] uppercase tracking-wider">GIẢI THÍCH:</span>
                  <span className="text-slate-300 text-[11px] truncate select-text">{getExplanationText(state)}</span>
                </div>
              )}
            </div>

            {/* Utility Bar: NỀN CHỜ (W) & BẢNG ĐIỂM (B) */}
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => call("bgm:waiting")}
                className={`py-1.5 rounded-lg border text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer transition ${
                  state.waitingBgm
                    ? "bg-amber-500/30 border-amber-400 text-amber-200 shadow-[0_0_15px_rgba(245,158,11,0.3)] animate-pulse"
                    : "bg-violet-500/10 border-violet-500/20 text-violet-300 hover:bg-violet-500/20"
                }`}
              >
                <span>🎵</span>
                <span>NỀN CHỜ (W)</span>
              </button>
              <button
                type="button"
                onClick={() => call("scoreboard:toggle")}
                className={`py-1.5 rounded-lg border text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer transition ${
                  state.showScoreboard
                    ? "bg-sky-500/30 border-sky-400 text-sky-200 shadow-[0_0_15px_rgba(56,189,248,0.3)]"
                    : "bg-violet-500/10 border-violet-500/20 text-violet-300 hover:bg-violet-500/20"
                }`}
              >
                <span>📊</span>
                <span>BẢNG ĐIỂM (B)</span>
              </button>
            </div>

            {/* ROUND-SPECIFIC CONTROL DECK */}
            <div className="rounded-xl border border-violet-500/15 bg-gradient-to-b from-[#1a0d3f]/60 to-[#0f0728]/80 p-2 sm:p-2.5 shadow-xl backdrop-blur-sm">
              {curRound === "khoiDong" && (
                <KhoiDongDeck
                  state={state}
                  call={call}
                  o22Quarter={o22Quarter}
                  setO22Quarter={setO22Quarter}
                  serverNow={serverNow}
                />
              )}
              {curRound === "vcnv" && <VcnvDeck state={state} call={call} seats={seats} />}
              {curRound === "tangToc" && <TangTocDeck state={state} call={call} />}
              {curRound === "veDich" && (
                <VeDichDeck
                  state={state}
                  call={call}
                  o22Quarter={o22Quarter}
                  setO22Quarter={setO22Quarter}
                />
              )}
              {curRound === "cauHoiPhu" && <CauHoiPhuDeck state={state} call={call} seats={seats} />}
              {!curRound && (
                <div className="py-6 text-center space-y-2">
                  <div className="text-violet-400/70 text-xs">Trận đấu chưa bắt đầu hoặc đang ở phòng chờ.</div>
                  <button
                    type="button"
                    onClick={() => call("game:start")}
                    className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 via-red-500 to-violet-600 hover:from-amber-400 hover:to-violet-500 text-white font-black text-xs shadow-lg shadow-amber-500/30 cursor-pointer animate-pulse"
                  >
                    ▶ BẮT ĐẦU TRẬN ĐẤU OLYMPIA
                  </button>
                </div>
              )}
            </div>
          </div>
        </main>

        {/* 3. RIGHT SIDEBAR: Hotkeys & State Dashboard (Collapsible) */}
        {rightSidebarOpen && (
          <aside className="w-44 bg-black/20 border-l border-violet-500/15 p-2 flex flex-col justify-between shrink-0 space-y-2 animate-fade-in">
            {/* Box 1: Phím Tắt */}
            <div className="space-y-1">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <span>⌨️</span>
                  <span>Phím Tắt</span>
                </span>
                <button
                  type="button"
                  onClick={() => setRightSidebarOpen(false)}
                  className="text-slate-400 hover:text-white"
                  title="Thu gọn"
                >
                  ✕
                </button>
              </div>
              <div className="bg-violet-900/20 rounded-lg p-1.5 border border-violet-500/10 space-y-0.5 text-[10px]">
                <HotkeyRow keyName="Space" desc="Play/Pause" color="text-purple-400" />
                <HotkeyRow keyName="Enter" desc="Đúng ✔" color="text-emerald-400" />
                <HotkeyRow keyName="Bksp" desc="Sai ✘" color="text-rose-400" />
                <HotkeyRow keyName="W" desc="Nền chờ" color="text-amber-400" />
                <HotkeyRow keyName="R" desc="Lật đáp án" color="text-sky-400" />
                <HotkeyRow keyName="C" desc="Toggle chuông" color="text-yellow-400" />
                <HotkeyRow keyName="S" desc="Ngôi sao Hy vọng" color="text-yellow-300" />
                <HotkeyRow keyName="B" desc="Bảng điểm" color="text-sky-300" />
                <HotkeyRow keyName="N" desc="Câu tiếp" color="text-cyan-300" />
              </div>
            </div>

            {/* Box 2: Trạng Thái */}
            <div className="space-y-1">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <span>📶</span>
                <span>Trạng Thái</span>
              </div>
              <div className="bg-violet-900/20 rounded-lg p-2 border border-violet-500/10 space-y-1 text-[11px]">
                <div className="flex justify-between">
                  <span className="text-slate-400">Round:</span>
                  <b className="text-sky-300 truncate max-w-[80px]">{curRound || "lobby"}</b>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Timer:</span>
                  <b className="font-mono text-cyan-300">{activeTimerSeconds}</b>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Buzzer:</span>
                  <b className={buzzerActive ? "text-emerald-400" : "text-slate-400"}>
                    {buzzerActive ? "🔔 Mở" : "🔒 Khóa"}
                  </b>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Buzzed:</span>
                  <b className="text-yellow-300 truncate max-w-[80px]">{buzzedNameText}</b>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Clients:</span>
                  <b className="text-slate-200">{seats.length}</b>
                </div>

                <button
                  type="button"
                  onClick={() => setShowScoreModal(true)}
                  className="w-full mt-1.5 py-1 rounded bg-white/10 hover:bg-white/20 text-[11px] font-bold text-amber-300 border border-amber-400/20 cursor-pointer flex items-center justify-center gap-1"
                >
                  <span>✏</span>
                  <span>Chỉnh Điểm</span>
                </button>
              </div>
            </div>
          </aside>
        )}
      </div>

      {/* ── BOTTOM BAR: 4 CONTESTANT CARDS COMPACT (ZERO-SCROLL) ── */}
      <footer className="border-t border-violet-500/15 bg-black/25 px-2 py-1 shrink-0">
        <div className="grid grid-cols-4 gap-1.5">
          {seats.slice(0, 4).map((s, idx) => (
            <div
              key={s.id}
              className="rounded-lg border bg-gradient-to-b from-violet-900/30 to-violet-950/30 px-2 py-1 flex items-center justify-between gap-1 relative overflow-hidden shadow"
              style={{ borderLeft: `4px solid ${SEAT_COLORS[s.id] || "#38bdf8"}` }}
            >
              <div className="min-w-0 flex-1">
                <div className="text-[11px] font-bold truncate text-slate-300">
                  {s.name || `TS ${idx + 1}`}
                </div>
                <input
                  type="number"
                  defaultValue={s.score}
                  key={`host_score_${s.id}_${s.score}`}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      (e.target as HTMLInputElement).blur();
                    }
                  }}
                  onBlur={(e) => {
                    const val = parseInt(e.target.value, 10);
                    if (!isNaN(val) && val !== s.score) {
                      call("score:set", { seat: s.id, score: val });
                    }
                  }}
                  className="w-16 px-1 py-0.5 rounded bg-black/40 border border-white/20 text-base sm:text-lg font-black leading-none focus:outline-none focus:border-amber-400"
                  style={{ color: SEAT_COLORS[s.id] || "#38bdf8" }}
                  title="Gõ điểm trực tiếp (Enter để lưu)"
                />
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => call("score:adjust", { seat: s.id, delta: -10 })}
                  className="w-5 h-5 rounded bg-rose-500/20 border border-rose-500/40 hover:bg-rose-500/30 text-rose-300 text-xs font-bold cursor-pointer flex items-center justify-center"
                  title="Trừ 10 điểm"
                >
                  -
                </button>
                <button
                  type="button"
                  onClick={() => call("score:adjust", { seat: s.id, delta: 10 })}
                  className="w-5 h-5 rounded bg-emerald-500/20 border border-emerald-500/40 hover:bg-emerald-500/30 text-emerald-300 text-xs font-bold cursor-pointer flex items-center justify-center"
                  title="Cộng 10 điểm"
                >
                  +
                </button>
              </div>
            </div>
          ))}
        </div>
      </footer>

      {/* Manual Score Adjust Modal */}
      {showScoreModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="rounded-2xl border border-white/20 bg-slate-900 p-5 w-full max-w-md space-y-4">
            <h3 className="text-base font-bold text-amber-300">✏ Chỉnh Điểm Thí Sinh</h3>
            <div className="space-y-2">
              <label className="text-xs text-slate-400">Chọn Thí sinh:</label>
              <select
                className="w-full rounded-lg bg-black/50 border border-white/20 p-2 text-sm text-white"
                value={manualSeat}
                onChange={(e) => setManualSeat(Number(e.target.value))}
              >
                {seats.map((s) => (
                  <option key={s.id} value={s.id}>{s.name} ({s.score}đ)</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs text-slate-400">Số điểm thay đổi (+ hoặc -):</label>
              <input
                type="number"
                step="5"
                className="w-full rounded-lg bg-black/50 border border-white/20 p-2 text-sm text-white font-mono"
                value={manualDelta}
                onChange={(e) => setManualDelta(Number(e.target.value))}
              />
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowScoreModal(false)}
                className="px-3 py-1.5 rounded-lg bg-white/10 text-slate-300 text-xs font-bold"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={async () => {
                  await call("score:adjust", { seat: manualSeat, delta: manualDelta });
                  setShowScoreModal(false);
                }}
                className="px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black text-xs font-black"
              >
                Cập nhật điểm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      <OlympiaAudioManagerDrawer
        open={showAudioDrawer}
        onClose={() => setShowAudioDrawer(false)}
        audioSeason={join?.audioSeason as any}
        autoAudioMode={audioOn}
        onToggleAutoAudioMode={(v) => setAudioOn(v)}
      />
      <OlympiaTranscriptModal open={showTranscript} onClose={() => setShowTranscript(false)} state={state} />
      <OlympiaRulesWikipediaModal open={showRules} onClose={() => setShowRules(false)} initialSeason={state.rulesetId} />
      <OlympiaMatchReportModal open={showReport} onClose={() => setShowReport(false)} state={state} />
    </div>
  );
}

// ───────────────────────────────────────────────────────────
// KHỞI ĐỘNG DECK (Image 1 reference)
// ───────────────────────────────────────────────────────────
function KhoiDongDeck({
  state,
  call,
  o22Quarter,
  setO22Quarter,
  serverNow,
}: {
  state: OlympiaState;
  call: Call;
  o22Quarter: O22Quarter;
  setO22Quarter: (q: O22Quarter) => void;
  serverNow: () => number;
}) {
  const kd = state.khoiDong!;
  const seg = kd.segments[kd.segIdx];
  const isSolo = seg.kind === "solo";
  const isO22 = state.rulesetId === "O22";

  return (
    <div className="space-y-2">
      {/* Row 1: Segment & Contestant Selectors */}
      <div className="flex items-center justify-between gap-1.5 flex-wrap bg-black/30 p-1.5 rounded-xl border border-white/5">
        {/* Toggle Lượt Riêng / Lượt Chung - CHỈ HIỂN THỊ Ở O24, O25, O26 */}
        {["O24", "O25", "O26"].includes(state.rulesetId) && (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => call("kd:selectSegment", { kind: "solo", seatId: 0 })}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition cursor-pointer ${
                isSolo ? "bg-purple-600/30 border-purple-400 text-purple-200 shadow" : "bg-white/5 border-white/10 text-slate-400 hover:bg-white/10"
              }`}
            >
              📍 Lượt Riêng
            </button>
            <button
              type="button"
              onClick={() => call("kd:selectSegment", { kind: "shared" })}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition cursor-pointer ${
                !isSolo ? "bg-cyan-600/30 border-cyan-400 text-cyan-200 shadow" : "bg-white/5 border-white/10 text-slate-400 hover:bg-white/10"
              }`}
            >
              👥 Lượt Chung
            </button>
          </div>
        )}

        {/* Contestant TS1..TS4 Buttons */}
        <div className="flex items-center gap-1">
          {[0, 1, 2, 3].map((sId) => {
            const isCur = isSolo && seg.seat === sId;
            return (
              <button
                key={sId}
                type="button"
                onClick={() => call("kd:selectSegment", { seatId: sId })}
                className={`px-2.5 py-1 rounded-lg text-xs font-black border transition cursor-pointer ${
                  isCur
                    ? "bg-sky-500 text-slate-950 border-sky-400 shadow-md"
                    : "bg-white/5 border-white/10 text-slate-300 hover:bg-white/10"
                }`}
              >
                TS{sId + 1}
              </button>
            );
          })}
        </div>

        {/* O22 Quarter Toggle (Quý 1 [30s] vs Quý 2 [60s] vs Quý 3-CKN [60s, -5đ]) */}
        {isO22 && (
          <div className="flex items-center gap-1 border-l border-white/10 pl-2">
            <span className="text-[10px] text-amber-300 font-bold">O22:</span>
            <button
              type="button"
              onClick={() => {
                setO22Quarter(1);
                call("system:setO22Quarter", { quarter: 1 });
              }}
              className={`px-2 py-0.5 rounded text-[11px] font-bold border cursor-pointer ${
                o22Quarter === 1 ? "bg-amber-500 text-black border-amber-400 font-black shadow-sm" : "bg-white/5 text-slate-400 border-white/10 hover:bg-white/10"
              }`}
            >
              ⚡ Q1 (30s)
            </button>
            <button
              type="button"
              onClick={() => {
                setO22Quarter(2);
                call("system:setO22Quarter", { quarter: 2 });
              }}
              className={`px-2 py-0.5 rounded text-[11px] font-bold border cursor-pointer ${
                o22Quarter === 2 ? "bg-amber-500 text-black border-amber-400 font-black shadow-sm" : "bg-white/5 text-slate-400 border-white/10 hover:bg-white/10"
              }`}
            >
              ⏱️ Q2 (60s)
            </button>
            <button
              type="button"
              onClick={() => {
                setO22Quarter(3);
                call("system:setO22Quarter", { quarter: 3 });
              }}
              className={`px-2 py-0.5 rounded text-[11px] font-bold border cursor-pointer ${
                o22Quarter === 3 ? "bg-amber-500 text-black border-amber-400 font-black shadow-sm" : "bg-white/5 text-slate-400 border-white/10 hover:bg-white/10"
              }`}
            >
              🎯 Q3-CKN (-5đ)
            </button>
          </div>
        )}
      </div>

      {/* Row 2: Main Action Buttons */}
      {(() => {
        const inCooldown = state.khoiDong?.startCooldownUntil != null && serverNow() < state.khoiDong.startCooldownUntil;
        const cdSec = inCooldown ? Math.ceil((state.khoiDong!.startCooldownUntil! - serverNow()) / 1000) : 0;
        const isTimeUp = Boolean(seg.globalMs && kd.globalTimer && kd.globalTimer.remainingMs <= 0);
        const isLastQ = kd.qIdx >= (seg.questions || 6) - 1;
        const canFinishTurn = kd.started && kd.phase !== "intro" && kd.phase !== "segmentDone" && (isTimeUp || isLastQ);

        return (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5">
            {/* ▶ BẮT ĐẦU */}
            {(() => {
              const seg = kd.segments[kd.segIdx];
              const isLocked = kd.started && kd.phase !== "segmentDone" && kd.phase !== "intro" && kd.qIdx < (seg?.questions ?? 6) - 1;
              return (
                <button
                  type="button"
                  onClick={() => call("kd:start")}
                  disabled={isLocked}
                  className={`py-2.5 rounded-xl text-xs font-black shadow flex items-center justify-center gap-1.5 uppercase tracking-wider transition ${
                    isLocked
                      ? "bg-slate-800 text-slate-500 cursor-not-allowed border border-white/5 opacity-60"
                      : "bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white cursor-pointer shadow-cyan-600/20"
                  }`}
                  title={isLocked ? "Lượt thi đang diễn ra, còn câu hỏi chưa thi xong" : "Bắt đầu lượt thi"}
                >
                  <span>▶</span>
                  <span>BẮT ĐẦU</span>
                </button>
              );
            })()}

            {/* ⏭ CÂU TIẾP (N) hoặc ⏹ KẾT THÚC LƯỢT */}
            {canFinishTurn ? (
              <button
                type="button"
                onClick={() => call("kd:finishTurn")}
                disabled={inCooldown}
                className="py-2.5 rounded-xl bg-gradient-to-r from-amber-500 via-rose-500 to-red-600 hover:from-amber-400 hover:to-red-500 text-white text-xs font-black shadow-lg shadow-rose-500/25 flex items-center justify-center gap-1.5 cursor-pointer uppercase tracking-wider animate-pulse border border-amber-300/30"
                title="Hết thời gian hoặc đã đến câu cuối, nhấn để kết thúc lượt thi và phát âm thanh kết thúc"
              >
                <span>⏹</span>
                <span>KẾT THÚC LƯỢT</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => call("kd:next")}
                disabled={inCooldown}
                className={`py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-teal-400 hover:from-sky-400 hover:to-teal-300 text-slate-950 text-xs font-black shadow-lg shadow-sky-500/20 flex items-center justify-center gap-1.5 cursor-pointer uppercase tracking-wider ${inCooldown ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                <span>{inCooldown ? `CÂU TIẾP (${cdSec}s)` : "CÂU TIẾP (N)"}</span>
                <span>⏭</span>
              </button>
            )}

            {/* ⏱ TÍNH GIỜ (Space) */}
            <button
              type="button"
              onClick={() => call("kd:timer")}
              className="py-2.5 rounded-xl bg-purple-700 hover:bg-purple-600 text-white text-xs font-black shadow-lg shadow-purple-600/20 flex items-center justify-center gap-1.5 cursor-pointer uppercase tracking-wider"
            >
              <span>⏱</span>
              <span>TÍNH GIỜ (Space)</span>
            </button>
          </div>
        );
      })()}



      {/* Row 3: Evaluation: Đúng (Enter) | Sai (Bksp) | Ô TRỐNG */}
      <div className="grid grid-cols-3 gap-1.5">
        <button
          type="button"
          onClick={() => call("kd:correct")}
          className="py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black shadow cursor-pointer flex items-center justify-center gap-1"
        >
          <span>✔</span>
          <span>ĐÚNG (Enter) [+10đ]</span>
        </button>
        <button
          type="button"
          onClick={() => call("kd:wrong")}
          className="py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-black shadow cursor-pointer flex items-center justify-center gap-1"
        >
          <span>✘</span>
          <span>SAI (Bksp)</span>
        </button>
        <button
          type="button"
          onClick={() => call("kd:blank")}
          className="py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-bold shadow cursor-pointer flex items-center justify-center gap-1"
        >
          <span>■</span>
          <span>Ô TRỐNG</span>
        </button>
      </div>

      {/* Row 4: Auxiliary: Toggle Chuông (chỉ hiện khi có bấm chuông), Đổi BGM, Dừng BGM */}
      {(() => {
        const isO13to21 = ["O13", "O14", "O15", "O16", "O17", "O18", "O19", "O20", "O21"].includes(state.rulesetId);
        const hasBuzzerInKd = !isSolo && !isO13to21;
        return (
          <div className={`grid ${hasBuzzerInKd ? "grid-cols-3" : "grid-cols-2"} gap-1.5 pt-0.5`}>
            {hasBuzzerInKd && (
              <button
                type="button"
                onClick={() => call("kd:buzzer")}
                className={`py-1.5 rounded-lg font-black text-xs border shadow flex items-center justify-center gap-1.5 cursor-pointer uppercase transition ${
                  kd.buzzOpen
                    ? "bg-amber-500 border-amber-400 text-black shadow-amber-500/20"
                    : "bg-white/5 border-amber-400/30 text-amber-300 hover:bg-white/10"
                }`}
              >
                <span>🔔</span>
                <span>Chuông (C): {kd.buzzOpen ? "MỞ" : "KHÓA"}</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => call("kd:cycle_bgm")}
              className="py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-slate-200 text-xs font-bold border border-white/10 cursor-pointer flex items-center justify-center gap-1"
            >
              <span>🎵</span>
              <span>Đổi nhạc nền</span>
            </button>
            <button
              type="button"
              onClick={() => call("audio:stop_bgm")}
              className="py-1.5 rounded-lg bg-rose-600/30 hover:bg-rose-600/40 text-rose-200 text-xs font-bold border border-rose-500/30 cursor-pointer flex items-center justify-center gap-1"
            >
              <span>⏹</span>
              <span>Dừng nhạc nền</span>
            </button>
          </div>
        );
      })()}
    </div>
  );
}

// ───────────────────────────────────────────────────────────
// VƯỢT CHƯỚNG NGẠI VẬT DECK (Image 2 reference)
// ───────────────────────────────────────────────────────────
function VcnvDeck({ state, call, seats }: { state: OlympiaState; call: Call; seats: Seat[] }) {
  const v = state.vcnv!;
  const [selectedCnvSeat, setSelectedCnvSeat] = useState<number>(0);

  return (
    <div className="space-y-2.5">
      {/* Banner status: Phase & Số lượng chữ cái */}
      <div className="flex items-center justify-between text-xs text-slate-300 px-1 border-b border-white/10 pb-1.5">
        <span>
          Phase: <b className="text-cyan-300">{v.phase === "grid" ? "Lưới từ khóa" : v.phase === "question" ? "Câu hỏi hàng ngang" : "Lật đáp án"}</b>
          {" · "}Hàng chọn: <b className="text-yellow-300">{v.currentRow >= 0 ? (v.currentRow === 4 ? "Trung tâm" : `Hàng ${v.currentRow + 1}`) : "—"}</b>
        </span>
        <span className="text-amber-300 font-bold">
          Số lượng chữ cái Chướng ngại vật: {v.keyword ? v.keyword.replace(/\s+/g, "").length : 0}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Left: Mở Các Hàng Ngang & Hàng 1..4, Trung Tâm */}
        <div className="space-y-1.5">
          <button
            type="button"
            onClick={() => call("vcnv:showGrid")}
            className="w-full py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-black shadow flex items-center justify-center gap-1 cursor-pointer"
          >
            <span>⭐</span>
            <span>Mở Các Hàng Ngang</span>
          </button>
          {[0, 1, 2, 3].map((rIdx) => (
            <button
              key={rIdx}
              type="button"
              onClick={() => call("vcnv:selectRow", { row: rIdx })}
              className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-bold border transition ${
                v.currentRow === rIdx
                  ? "bg-yellow-400/20 border-yellow-400 text-yellow-200"
                  : v.rows[rIdx]?.opened
                    ? "bg-white/5 border-white/10 text-slate-500"
                    : "bg-white/5 border-white/10 text-slate-300 hover:bg-white/10"
              }`}
            >
              Hàng {rIdx + 1} {v.rows[rIdx]?.opened ? "✓" : ""}
            </button>
          ))}
          <button
            type="button"
            onClick={() => call("vcnv:selectRow", { row: 4 })}
            className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-bold border transition ${
              v.currentRow === 4
                ? "bg-yellow-400/20 border-yellow-400 text-yellow-200"
                : v.centerOpened
                  ? "bg-white/5 border-white/10 text-slate-500"
                  : "bg-amber-500/10 border-amber-400/30 text-amber-300 hover:bg-amber-500/20"
            }`}
          >
            Trung Tâm {v.centerOpened ? "✓" : ""}
          </button>
        </div>

        {/* Center: In-Question flow controls */}
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => call("vcnv:openQuestion")}
            className="w-full py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-black shadow cursor-pointer"
          >
            Mở Câu Hỏi
          </button>

          <button
            type="button"
            onClick={() => call("vcnv:timer")}
            className="w-full py-2 rounded-xl bg-purple-700 hover:bg-purple-600 text-white text-xs font-black shadow cursor-pointer uppercase tracking-wider"
          >
            ⏳ Đếm 15s (Space)
          </button>

          <div className="grid grid-cols-3 gap-1">
            <button
              type="button"
              onClick={() => call("vcnv:timer")}
              className="py-1 rounded bg-white/10 hover:bg-white/15 text-[11px] font-bold text-slate-300"
            >
              Nền chờ ĐA
            </button>
            <button
              type="button"
              onClick={() => call("vcnv:reveal")}
              className="py-1 rounded bg-cyan-600 hover:bg-cyan-500 text-[11px] font-black text-white"
            >
              👁 Hiện ĐA (R)
            </button>
            <button
              type="button"
              onClick={() => call("vcnv:blank")}
              className="py-1 rounded bg-white/5 hover:bg-white/10 text-[11px] text-slate-400"
            >
              ○ Ẩn
            </button>
          </div>

          <div className="grid grid-cols-3 gap-1">
            <button
              type="button"
              onClick={() => call("vcnv:correct")}
              className="py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-[11px] font-black text-white"
            >
              ✔ Cộng điểm HN
            </button>
            <button
              type="button"
              onClick={() => call("vcnv:wrong")}
              className="py-1.5 rounded bg-rose-600 hover:bg-rose-500 text-[11px] font-black text-white"
            >
              ✘ Sai / Không ĐA
            </button>
            <button
              type="button"
              onClick={() => call("vcnv:blank")}
              className="py-1.5 rounded bg-slate-700 hover:bg-slate-600 text-[11px] font-bold text-slate-300"
            >
              ■ Ô TRỐNG
            </button>
          </div>

          <div className="grid grid-cols-2 gap-1.5 pt-1 border-t border-white/10">
            <button
              type="button"
              onClick={() => call("vcnv:revealTile")}
              className="py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold"
            >
              🧩 Lật mở miếng ghép
            </button>
            <button
              type="button"
              onClick={() => call("vcnv:revealRowText")}
              className="py-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold"
            >
              Tiết lộ đáp án HN
            </button>
          </div>
        </div>

        {/* Right: Chướng Ngại Vật bell & CNV grading */}
        <div className="space-y-2 border-l border-white/10 pl-2.5">
          <button
            type="button"
            className="w-full py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-black shadow flex items-center justify-center gap-1 cursor-pointer"
          >
            <span>🔔</span>
            <span>Chuông CNV (C)</span>
          </button>
          <button
            type="button"
            onClick={() => call("vcnv:clearBells")}
            className="w-full py-1 rounded bg-white/10 hover:bg-white/15 text-slate-300 text-xs font-bold"
          >
            🔕 Tắt tín hiệu CNV
          </button>

          <div className="space-y-1">
            <span className="text-[11px] text-slate-400 font-bold">Thí sinh bấm chuông:</span>
            <div className="grid grid-cols-2 gap-1">
              {seats.slice(0, 4).map((s) => {
                const buzzed = v.bells?.some((b) => b.seat === s.id);
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setSelectedCnvSeat(s.id)}
                    className={`px-1.5 py-1 rounded text-xs font-bold border text-left truncate ${
                      selectedCnvSeat === s.id
                        ? "bg-amber-500/20 border-amber-400 text-amber-200"
                        : buzzed
                          ? "bg-yellow-400/30 border-yellow-400 text-yellow-300 animate-pulse"
                          : "bg-white/5 border-white/10 text-slate-400"
                    }`}
                  >
                    TS{s.id + 1} {buzzed ? "🔔" : ""}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-1.5 pt-1">
            <button
              type="button"
              onClick={() => call("vcnv:correctCNV", { seat: selectedCnvSeat })}
              className="py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black"
            >
              ✔ CNV Đúng
            </button>
            <button
              type="button"
              onClick={() => call("vcnv:wrongCNV", { seat: selectedCnvSeat })}
              className="py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-black"
            >
              ✘ CNV Sai
            </button>
          </div>

          <button
            type="button"
            onClick={() => call("vcnv:revealAll")}
            className="w-full py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-slate-300 text-xs font-bold border border-white/10"
          >
            Mở Toàn Bộ Miếng Ghép
          </button>
        </div>
      </div>
    </div>
  );
}

// ───────────────────────────────────────────────────────────
// TĂNG TỐC DECK (Image 3 reference)
// ───────────────────────────────────────────────────────────
function TangTocDeck({ state, call }: { state: OlympiaState; call: Call }) {
  const tt = state.tangToc!;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center">
      {/* Left: Danh Sách Câu 1..4 (BẢNG ÁN) */}
      <div className="space-y-1.5">
        <div className="text-xs font-bold text-slate-400 uppercase">BẢNG ÁN / CÂU HỎI</div>
        {[0, 1, 2, 3].map((idx) => {
          const isCur = tt.qIdx === idx;
          const label = idx === 3 ? "Câu 4 (Video)" : `Câu ${idx + 1} (Ảnh)`;
          return (
            <button
              key={idx}
              type="button"
              onClick={() => call("tt:selectQuestion", { qIdx: idx })}
              className={`w-full text-left px-3 py-1.5 rounded-lg text-xs font-bold border transition ${
                isCur ? "bg-cyan-600/30 border-cyan-400 text-cyan-200" : "bg-white/5 border-white/10 text-slate-400 hover:bg-white/10"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* Center: Controls */}
      <div className="space-y-2 flex flex-col items-center">
        <button
          type="button"
          onClick={() => call("tt:show")}
          className="w-full py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-black shadow flex items-center justify-center gap-1.5 cursor-pointer uppercase tracking-wider"
        >
          <span>▶</span>
          <span>Hiện Câu Hỏi</span>
        </button>

        <button
          type="button"
          onClick={() => call("tt:timer")}
          className="w-full py-2.5 rounded-xl bg-purple-700 hover:bg-purple-600 text-white text-sm font-black shadow-lg shadow-purple-600/20 flex items-center justify-center gap-1.5 cursor-pointer uppercase tracking-wider"
        >
          <span>Bắt đầu đếm giờ (Space)</span>
        </button>

        <div className="w-full grid grid-cols-2 gap-1.5">
          <button
            type="button"
            onClick={() => call("tt:revealAndGrade")}
            className="py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black shadow cursor-pointer flex items-center justify-center gap-1"
          >
            <span>✔</span>
            <span>Hiện ĐA thí sinh (R)</span>
          </button>
          <button
            type="button"
            onClick={() => call("tt:blank")}
            className="py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs font-bold shadow cursor-pointer flex items-center justify-center gap-1"
          >
            <span>■</span>
            <span>Ô Trống</span>
          </button>
        </div>

        <button
          type="button"
          onClick={() => call("tt:next")}
          className="w-full py-2 rounded-xl bg-gradient-to-r from-sky-600 to-cyan-500 hover:from-sky-500 hover:to-cyan-400 text-white text-xs font-black shadow flex items-center justify-center gap-1.5 cursor-pointer uppercase tracking-wider"
        >
          <span>Câu tiếp (N)</span>
          <span>⏭</span>
        </button>
      </div>

      {/* Right: Nền chờ đáp án */}
      <div className="space-y-2">
        <button
          type="button"
          onClick={() => call("bgm:waiting")}
          className="w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-slate-200 text-xs font-bold border border-white/10 cursor-pointer"
        >
          Nền chờ đáp án
        </button>
        <button
          type="button"
          onClick={() => call("audio:stop_bgm")}
          className="w-full py-2 rounded-xl bg-rose-600/30 hover:bg-rose-600/40 text-rose-200 text-xs font-bold border border-rose-500/30 cursor-pointer"
        >
          Dừng nhạc nền
        </button>
      </div>
    </div>
  );
}

// ───────────────────────────────────────────────────────────
// VỀ ĐÍCH DECK (Image 4 reference)
// ───────────────────────────────────────────────────────────
function VeDichDeck({
  state,
  call,
  o22Quarter,
  setO22Quarter,
}: {
  state: OlympiaState;
  call: Call;
  o22Quarter: O22Quarter;
  setO22Quarter: (q: O22Quarter) => void;
}) {
  const vd = state.veDich!;
  const isO22 = state.rulesetId === "O22";
  const isO22Q1 = isO22 && o22Quarter === 1;

  const [pkgQ1, setPkgQ1] = useState<number>(20);
  const [pkgQ2, setPkgQ2] = useState<number>(isO22Q1 ? 40 : 20);
  const [pkgQ3, setPkgQ3] = useState<number>(20);

  useEffect(() => {
    if (isO22Q1) {
      if (pkgQ1 !== 20 && pkgQ1 !== 40) setPkgQ1(20);
      if (pkgQ2 !== 20 && pkgQ2 !== 40) setPkgQ2(40);
    } else if (isO22) {
      if (pkgQ1 !== 20 && pkgQ1 !== 30) setPkgQ1(20);
      if (pkgQ2 !== 20 && pkgQ2 !== 30) setPkgQ2(20);
      if (pkgQ3 !== 20 && pkgQ3 !== 30) setPkgQ3(30);
    }
  }, [isO22Q1, isO22]);

  return (
    <div className="space-y-2.5">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Left: Khởi tạo lượt thi, Lên sân khấu/Trở về, Mở chọn gói đồ họa, Xác nhận gói */}
        <div className="space-y-1.5">
          <div className="text-xs font-bold text-slate-400 uppercase">Khởi tạo lượt thi</div>
          <div className="grid grid-cols-2 gap-1.5">
            <button
              type="button"
              onClick={() => call("vd:onStage")}
              className="py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold shadow"
            >
              Lên sân khấu
            </button>
            <button
              type="button"
              onClick={() => call("vd:finishTurn")}
              className="py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs font-bold shadow"
            >
              Trở về vị trí
            </button>
          </div>

          {/* O22 Quarter Selector in VeDich */}
          {isO22 && (
            <div className="flex items-center gap-1 bg-black/40 p-1 rounded-lg border border-white/10">
              <span className="text-[10px] text-amber-300 font-bold px-1">O22:</span>
              <button
                type="button"
                onClick={() => {
                  setO22Quarter(1);
                  call("system:setO22Quarter", { quarter: 1 });
                }}
                className={`flex-1 py-1 rounded text-[10px] font-bold border cursor-pointer ${
                  o22Quarter === 1 ? "bg-amber-500 text-black border-amber-400 font-black shadow-sm" : "bg-white/5 text-slate-400 border-white/10 hover:bg-white/10"
                }`}
              >
                ⚡ Q1 (2 câu 20/40)
              </button>
              <button
                type="button"
                onClick={() => {
                  setO22Quarter(2);
                  call("system:setO22Quarter", { quarter: 2 });
                }}
                className={`flex-1 py-1 rounded text-[10px] font-bold border cursor-pointer ${
                  o22Quarter === 2 ? "bg-amber-500 text-black border-amber-400 font-black shadow-sm" : "bg-white/5 text-slate-400 border-white/10 hover:bg-white/10"
                }`}
              >
                ⏱️ Q2 (3 câu 20/30)
              </button>
              <button
                type="button"
                onClick={() => {
                  setO22Quarter(3);
                  call("system:setO22Quarter", { quarter: 3 });
                }}
                className={`flex-1 py-1 rounded text-[10px] font-bold border cursor-pointer ${
                  o22Quarter === 3 ? "bg-amber-500 text-black border-amber-400 font-black shadow-sm" : "bg-white/5 text-slate-400 border-white/10 hover:bg-white/10"
                }`}
              >
                🎯 Q3-CKN
              </button>
            </div>
          )}

          {/* Mở bảng chọn gói đồ họa: Phát ngay choose_package.mp3 */}
          <button
            type="button"
            onClick={() => call("vd:showPackageGraphic")}
            className="w-full py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-black shadow"
          >
            🎨 Mở bảng chọn gói đồ họa
          </button>

          {/* Gói Câu Hỏi Dropdowns (Quý 1: 2 câu 20/40đ; Quý 2-3: 3 câu 20/30đ) */}
          <div className="space-y-1 bg-[#162032] p-2 rounded-lg border border-white/5">
            <div className="flex items-center justify-between text-[11px] font-bold text-amber-300">
              <span>GÓI CÂU HỎI</span>
              {isO22Q1 && <span className="text-[10px] text-amber-400 font-normal">Quý 1: 2 câu (20đ, 40đ)</span>}
            </div>
            {isO22Q1 ? (
              <div className="grid grid-cols-2 gap-1.5">
                <div>
                  <span className="text-[10px] text-slate-400">Câu 1</span>
                  <select
                    value={pkgQ1}
                    onChange={(e) => setPkgQ1(Number(e.target.value))}
                    className="w-full bg-black/40 border border-white/20 rounded p-1 text-xs text-white"
                  >
                    <option value={20}>20đ</option>
                    <option value={40}>40đ (30s)</option>
                  </select>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400">Câu 2</span>
                  <select
                    value={pkgQ2}
                    onChange={(e) => setPkgQ2(Number(e.target.value))}
                    className="w-full bg-black/40 border border-white/20 rounded p-1 text-xs text-white"
                  >
                    <option value={20}>20đ</option>
                    <option value={40}>40đ (30s)</option>
                  </select>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-1">
                <div>
                  <span className="text-[10px] text-slate-400">Câu 1</span>
                  <select
                    value={pkgQ1}
                    onChange={(e) => setPkgQ1(Number(e.target.value))}
                    className="w-full bg-black/40 border border-white/20 rounded p-1 text-xs text-white"
                  >
                    {!isO22 && <option value={10}>10đ</option>}
                    <option value={20}>20đ</option>
                    <option value={30}>30đ</option>
                    {!isO22 && <option value={40}>40đ</option>}
                  </select>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400">Câu 2</span>
                  <select
                    value={pkgQ2}
                    onChange={(e) => setPkgQ2(Number(e.target.value))}
                    className="w-full bg-black/40 border border-white/20 rounded p-1 text-xs text-white"
                  >
                    {!isO22 && <option value={10}>10đ</option>}
                    <option value={20}>20đ</option>
                    <option value={30}>30đ</option>
                    {!isO22 && <option value={40}>40đ</option>}
                  </select>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400">Câu 3</span>
                  <select
                    value={pkgQ3}
                    onChange={(e) => setPkgQ3(Number(e.target.value))}
                    className="w-full bg-black/40 border border-white/20 rounded p-1 text-xs text-white"
                  >
                    {!isO22 && <option value={10}>10đ</option>}
                    <option value={20}>20đ</option>
                    <option value={30}>30đ</option>
                    {!isO22 && <option value={40}>40đ</option>}
                  </select>
                </div>
              </div>
            )}

            {/* ✔ Xác nhận gói */}
            <button
              type="button"
              onClick={() =>
                call("vd:confirmPackage", {
                  points: isO22Q1 ? [pkgQ1, pkgQ2] : [pkgQ1, pkgQ2, pkgQ3],
                })
              }
              className="w-full mt-1.5 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-xs font-black shadow cursor-pointer"
            >
              ✔ Xác nhận gói ({isO22Q1 ? `${pkgQ1 + pkgQ2}đ` : `${pkgQ1 + pkgQ2 + pkgQ3}đ`})
            </button>
          </div>
        </div>

        {/* Center: Star of hope, Timer, Evaluation, Câu tiếp */}
        <div className="space-y-2 flex flex-col items-center">
          <button
            type="button"
            onClick={() => call("vd:hopeStar")}
            className={`w-full py-2 rounded-xl text-xs font-black border shadow flex items-center justify-center gap-1.5 cursor-pointer uppercase transition ${
              vd.hopeStarActive
                ? "bg-yellow-400 border-yellow-300 text-black shadow-yellow-400/30 animate-pulse"
                : "bg-amber-500/10 border-amber-400/30 text-amber-300 hover:bg-amber-500/20"
            }`}
          >
            <span>⭐</span>
            <span>Ngôi Sao Hy Vọng (S)</span>
          </button>

          <div className="w-full grid grid-cols-2 gap-1.5">
            <button
              type="button"
              onClick={() => call("vd:timer")}
              className="py-2.5 rounded-xl bg-purple-700 hover:bg-purple-600 text-white text-xs font-black shadow uppercase"
            >
              Tính Giờ Thi (Space)
            </button>
            <button
              type="button"
              onClick={() => call("vd:practiceTimer")}
              className="py-2.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs font-bold shadow uppercase"
            >
              Tính Giờ Thực Hành
            </button>
          </div>

          <div className="w-full grid grid-cols-3 gap-1.5">
            <button
              type="button"
              onClick={() => call("vd:correct")}
              className="py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black shadow"
            >
              ✔ ĐÚNG (Enter)
            </button>
            <button
              type="button"
              onClick={() => call("vd:wrong")}
              className="py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-black shadow"
            >
              ✘ SAI (Bksp)
            </button>
            <button
              type="button"
              onClick={() => call("vd:blank")}
              className="py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs font-bold shadow"
            >
              ■ Ô TRỐNG
            </button>
          </div>

          <button
            type="button"
            onClick={() => call("vd:startQuestion")}
            className="w-full py-2 rounded-xl bg-gradient-to-r from-sky-600 to-cyan-500 hover:from-sky-500 hover:to-cyan-400 text-white text-xs font-black shadow uppercase"
          >
            <span>Câu tiếp (N)</span>
            <span>⏭</span>
          </button>
        </div>

        {/* Right / Steal Controls */}
        <div className="space-y-2 flex flex-col justify-between">
          <button
            type="button"
            onClick={() => call("vd:openSteal")}
            className={`w-full py-3 rounded-xl font-black text-xs border shadow flex items-center justify-center gap-1.5 cursor-pointer uppercase ${
              vd.steal?.open
                ? "bg-amber-500 border-amber-400 text-black shadow-amber-500/30 animate-pulse"
                : "bg-amber-500/10 border-amber-400/30 text-amber-300 hover:bg-amber-500/20"
            }`}
          >
            <span>🔔</span>
            <span>Mở Cướp 5s (C)</span>
          </button>

          {vd.steal?.buzzedSeat != null && (
            <div className="bg-yellow-400/10 border border-yellow-400/30 p-2 rounded-lg text-center space-y-1.5">
              <span className="text-xs text-yellow-300 font-bold">Thí sinh cướp điểm:</span>
              <div className="text-sm font-black text-white">{seatName(state, vd.steal.buzzedSeat)}</div>
              <div className="grid grid-cols-2 gap-1">
                <button
                  type="button"
                  onClick={() => call("vd:correctSteal")}
                  className="py-1 rounded bg-emerald-600 text-white text-xs font-bold"
                >
                  ✔ Đúng
                </button>
                <button
                  type="button"
                  onClick={() => call("vd:wrongSteal")}
                  className="py-1 rounded bg-rose-600 text-white text-xs font-bold"
                >
                  ✘ Sai
                </button>
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={() => call("audio:stop_bgm")}
            className="w-full py-2 rounded-xl bg-rose-600/30 hover:bg-rose-600/40 text-rose-200 text-xs font-bold border border-rose-500/30 cursor-pointer"
          >
            Dừng nhạc nền
          </button>
        </div>
      </div>
    </div>
  );
}

// ───────────────────────────────────────────────────────────
// CÂU HỎI PHỤ DECK (Image 5 reference)
// ───────────────────────────────────────────────────────────
function CauHoiPhuDeck({ state, call, seats }: { state: OlympiaState; call: Call; seats: Seat[] }) {
  const cp = state.cauHoiPhu!;
  const [selectedSeats, setSelectedSeats] = useState<number[]>(cp.tied ?? [0, 1]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center">
      {/* Left: CHỌN THÍ SINH DỰ THI */}
      <div className="space-y-1.5">
        <div className="text-xs font-bold text-slate-400 uppercase">CHỌN THÍ SINH</div>
        <div className="grid grid-cols-2 gap-1.5">
          {seats.slice(0, 4).map((s) => {
            const checked = selectedSeats.includes(s.id);
            return (
              <label
                key={s.id}
                className={`flex items-center gap-2 p-1.5 rounded-lg border text-xs font-bold cursor-pointer transition ${
                  checked ? "bg-sky-500/20 border-sky-400 text-sky-200" : "bg-white/5 border-white/10 text-slate-400"
                }`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(e) => {
                    const next = e.target.checked
                      ? [...selectedSeats, s.id]
                      : selectedSeats.filter((x) => x !== s.id);
                    setSelectedSeats(next);
                  }}
                  className="rounded"
                />
                <span>TS{s.id + 1}</span>
              </label>
            );
          })}
        </div>
        <button
          type="button"
          onClick={() => call("chp:selectSeats", { seats: selectedSeats })}
          className="w-full py-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow"
        >
          ✔ Xác nhận Thí sinh dự thi
        </button>
      </div>

      {/* Center: Hiện Câu Hỏi, Tính Giờ, Đúng/Sai, Câu tiếp */}
      <div className="space-y-2 flex flex-col items-center">
        <button
          type="button"
          onClick={() => call("chp:show")}
          className="w-full py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-black shadow uppercase tracking-wider"
        >
          ▶ Hiện Câu Hỏi
        </button>

        <button
          type="button"
          onClick={() => call("chp:timer")}
          className="w-full py-2.5 rounded-xl bg-purple-700 hover:bg-purple-600 text-white text-sm font-black shadow uppercase tracking-wider"
        >
          Tính Giờ (Space)
        </button>

        <div className="w-full grid grid-cols-3 gap-1.5">
          <button
            type="button"
            onClick={() => call("chp:correct")}
            className="py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black shadow"
          >
            ✔ ĐÚNG (Enter)
          </button>
          <button
            type="button"
            onClick={() => call("chp:wrong")}
            className="py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-black shadow"
          >
            ✘ SAI (Bksp)
          </button>
          <button
            type="button"
            onClick={() => call("chp:blank")}
            className="py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs font-bold shadow"
          >
            ■ Ô TRỐNG
          </button>
        </div>

        <button
          type="button"
          onClick={() => call("chp:next")}
          className="w-full py-2 rounded-xl bg-gradient-to-r from-sky-600 to-cyan-500 hover:from-sky-500 hover:to-cyan-400 text-white text-xs font-black shadow uppercase tracking-wider"
        >
          <span>Câu tiếp (N)</span>
          <span>⏭</span>
        </button>
      </div>

      {/* Right: Mở chuông thủ công & Dừng nhạc */}
      <div className="space-y-2">
        <button
          type="button"
          onClick={() => call("chp:buzzer")}
          className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-black shadow flex items-center justify-center gap-1.5 cursor-pointer uppercase"
        >
          <span>🔔</span>
          <span>Mở Chuông Thủ Công</span>
        </button>
        <button
          type="button"
          onClick={() => call("audio:stop_bgm")}
          className="w-full py-2 rounded-xl bg-rose-600/30 hover:bg-rose-600/40 text-rose-200 text-xs font-bold border border-rose-500/30 cursor-pointer"
        >
          Dừng Nhạc Khẩn Cấp
        </button>
      </div>
    </div>
  );
}

// ───────────────────────────────────────────────────────────
// Sub-components & Helpers
// ───────────────────────────────────────────────────────────
function RoundTabButton({
  id,
  label,
  icon,
  active,
  done,
  onClick,
}: {
  id: RoundId;
  label: string;
  icon: string;
  active: boolean;
  done: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full p-2 rounded-xl text-left text-xs font-bold border flex items-center justify-between transition cursor-pointer ${
        active
          ? "bg-cyan-600/20 border-cyan-400 text-cyan-200 shadow-[0_0_12px_rgba(34,211,238,0.2)]"
          : "bg-white/5 border-white/10 text-slate-400 hover:bg-white/10 hover:text-slate-200"
      }`}
    >
      <div className="flex items-center gap-1.5 truncate">
        <span>{icon}</span>
        <span className="truncate">{label}</span>
      </div>
      {done && <span className="text-[10px] text-emerald-400">✓</span>}
    </button>
  );
}

function HotkeyRow({ keyName, desc, color }: { keyName: string; desc: string; color: string }) {
  return (
    <div className="flex items-center justify-between py-0.5">
      <span className={`font-mono font-bold px-1 rounded bg-black/40 border border-white/10 text-[10px] ${color}`}>
        {keyName}
      </span>
      <span className="text-slate-400 text-[10px]">{desc}</span>
    </div>
  );
}

function getQuestionText(st: OlympiaState): string {
  if (st.currentRound === "khoiDong") {
    if (!st.khoiDong?.questionRevealed) return "";
    return st.khoiDong?.current?.q || "";
  }
  if (st.currentRound === "vcnv") {
    if (st.vcnv?.currentRow === 4) return st.vcnv.centerQuestion?.q || "Câu hỏi ô trung tâm";
    if (st.vcnv?.currentRow != null && st.vcnv.currentRow >= 0) return st.vcnv.rows[st.vcnv.currentRow]?.hint || "";
    return "";
  }
  if (st.currentRound === "tangToc") {
    if (st.tangToc && st.tangToc.qIdx >= 0) return st.tangToc.questions[st.tangToc.qIdx]?.q || `Câu hỏi Tăng Tốc số ${st.tangToc.qIdx + 1}`;
    return "";
  }
  if (st.currentRound === "veDich") return st.veDich?.current?.q?.q || "";
  if (st.currentRound === "cauHoiPhu") {
    if (st.cauHoiPhu && st.cauHoiPhu.qIdx >= 0) return st.cauHoiPhu.questions[st.cauHoiPhu.qIdx]?.q || "";
    return "";
  }
  return "";
}

function getAnswerText(st: OlympiaState): string {
  if (st.currentRound === "khoiDong") {
    if (!st.khoiDong?.questionRevealed) return "";
    return st.khoiDong?.current?.a || "";
  }
  if (st.currentRound === "vcnv") {
    if (st.vcnv?.currentRow === 4) return st.vcnv.centerQuestion?.a || st.vcnv.keyword;
    if (st.vcnv?.currentRow != null && st.vcnv.currentRow >= 0) return st.vcnv.rows[st.vcnv.currentRow]?.answer || "";
    return "";
  }
  if (st.currentRound === "tangToc") {
    if (st.tangToc && st.tangToc.qIdx >= 0) return st.tangToc.questions[st.tangToc.qIdx]?.answer || "";
    return "";
  }
  if (st.currentRound === "veDich") return st.veDich?.current?.q?.a || "";
  if (st.currentRound === "cauHoiPhu") {
    if (st.cauHoiPhu && st.cauHoiPhu.qIdx >= 0) return st.cauHoiPhu.questions[st.cauHoiPhu.qIdx]?.a || "";
    return "";
  }
  return "";
}

function getExplanationText(st: OlympiaState): string {
  if (st.currentRound === "khoiDong") return st.khoiDong?.current?.subject || "--";
  if (st.currentRound === "vcnv") return `Từ khóa Chướng ngại vật: ${st.vcnv?.keyword || "--"}`;
  if (st.currentRound === "tangToc") return `Thời gian câu: ${st.tangToc ? [10, 20, 30, 40][st.tangToc.qIdx] || 20 : 20}s`;
  if (st.currentRound === "veDich") return st.veDich?.current ? `Mức điểm: ${st.veDich.current.points}đ` : "--";
  if (st.currentRound === "cauHoiPhu") return "Thời gian suy nghĩ: 15s";
  return "--";
}
