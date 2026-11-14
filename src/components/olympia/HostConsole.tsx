"use client";

import React, { useEffect, useState, useRef, useMemo } from "react";
import { RULESETS, cnvPointsFor } from "@/lib/olympia/rulesets";
import { ROUND_LABELS, ROUND_ORDER, canStartScoreSummary, seatToStudioCamera, type OlympiaState, type RoundId, type Seat, type O22Quarter, type TimerState } from "@/lib/olympia/types";
import { normalizeAnswer } from "@/lib/olympia/engine";
import { useOlympiaAudio, useOlympiaSocket, useCountdown } from "./hooks";
import OlympiaTranscriptModal from "./OlympiaTranscriptModal";
import OlympiaAudioManagerDrawer from "./OlympiaAudioManagerDrawer";
import OlympiaRulesWikipediaModal from "./OlympiaRulesWikipediaModal";
import OlympiaMatchReportModal from "./OlympiaMatchReportModal";
import RoomQRCodeModal from "@/components/room/RoomQRCodeModal";
import QRCode from "qrcode";
import ScaledDisplayFrame from "./ScaledDisplayFrame";
import { MediaView, SEAT_COLORS, Timer, activeSeats, seatName } from "./ui";
import { isTtsEnabled, setTtsEnabled, speakTTS, cancelTTS } from "@/lib/olympia/tts";

type Call = (type: string, extra?: Record<string, unknown>) => Promise<{ ok: boolean; error?: string }>;
type SN = () => number;


export const ActiveTimerBadge = React.memo(function ActiveTimerBadge({
  timer,
  activeTimer,
  serverNow,
  className = "",
}: {
  timer?: TimerState | null | undefined;
  activeTimer?: TimerState | null | undefined;
  serverNow: () => number;
  className?: string;
}) {
  const targetTimer = timer !== undefined ? timer : activeTimer;
  const ms = useCountdown(targetTimer, serverNow);
  const text = targetTimer
    ? (targetTimer.startedAt != null || targetTimer.remainingMs > 0
        ? `${Math.ceil(ms / 1000)}s`
        : "0s")
    : "--";
  return <span className={className}>{text}</span>;
});

export const HostConsole = React.memo(function HostConsole({ code, hostKey }: { code: string; hostKey: string }) {
  const { state, join, connected, emit, serverNow } = useOlympiaSocket({ code, role: "host", hostKey });
  const [err, setErr] = useState("");
  // Auto-enabled by default so Host Console plays all game sounds like the real desktop software
  const [audioOn, setAudioOn] = useState(true);
  const [ttsActive, setTtsActive] = useState<boolean>(() => isTtsEnabled());
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
  const [showQrModal, setShowQrModal] = useState(false);
  const [kickCandidate, setKickCandidate] = useState<Seat | null>(null);
  const [editingSeatId, setEditingSeatId] = useState<number | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedPin, setCopiedPin] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [lobbyQrDataUrl, setLobbyQrDataUrl] = useState<string>("");
  const [swapSourceSeat, setSwapSourceSeat] = useState<number | null>(null);
  const [startBlockModal, setStartBlockModal] = useState(false);
  const [startWarningStep, setStartWarningStep] = useState<0 | 1 | 2>(0);

  const handleStartMatch = () => {
    if (!state) return;
    const approvedCount = state.seats.filter(
      (s) => s.name && s.approved !== false && (s.playerKey || (state as any).teams)
    ).length;
    const numSeats = state.seatCount || 4;

    if (approvedCount <= 1) {
      setStartBlockModal(true);
      return;
    }

    if (approvedCount < numSeats) {
      setStartWarningStep(1);
      return;
    }

    call("game:start");
  };

  const isSandbox =
    Boolean((state as any)?.isSandbox) ||
    code.startsWith("sb_") ||
    (typeof window !== "undefined" && window.location.pathname.includes("/sandbox"));

  const handleDeleteRoom = async () => {
    if (
      !confirm(
        `Xác nhận gỡ bỏ hoàn toàn phòng "${code}"?\n\nTất cả dữ liệu và kết nối của phòng này sẽ bị xóa khỏi hệ thống.`
      )
    ) {
      return;
    }
    setDeleteLoading(true);
    try {
      const headers: Record<string, string> = {};
      if (hostKey) headers["x-host-key"] = hostKey;
      const adminPass = typeof window !== "undefined" ? localStorage.getItem("admin_password") || "" : "";
      if (adminPass) headers["x-admin-password"] = adminPass;

      const res = await fetch(`/api/rooms/${code}`, {
        method: "DELETE",
        headers,
      });
      if (res.ok) {
        alert(`Đã gỡ phòng ${code} thành công.`);
        window.location.href = "/admin/rooms";
      } else {
        const data = await res.json().catch(() => ({}));
        alert(`Lỗi khi gỡ phòng: ${data.error || res.statusText}`);
      }
    } catch (err: any) {
      alert(`Lỗi kết nối khi gỡ phòng: ${err.message}`);
    } finally {
      setDeleteLoading(false);
    }
  };

  const joinUrl = typeof window !== "undefined" ? `${window.location.origin}/olympia/play/${code}` : "";

  useEffect(() => {
    if (!code) return;
    const origin = typeof window !== "undefined" ? window.location.origin : "https://quizorra.app";
    QRCode.toDataURL(`${origin}/olympia/play/${code}`, {
      width: 240,
      margin: 2,
      color: { dark: "#080a16", light: "#ffffff" },
      errorCorrectionLevel: "M",
    })
      .then(setLobbyQrDataUrl)
      .catch(() => {});
  }, [code]);

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
      if ((e.target as HTMLElement)?.isContentEditable) return;
      // Enter/Space on a focused button must only activate that button, never a host shortcut
      if ((tag === "button" || tag === "a") && (e.key === "Enter" || e.code === "Space")) return;

      const isIntro = state?.stage === "playing" && (Boolean(state.introTimer) || Boolean(state.entranceState?.active) || Boolean(state.introStandby));
      const notInGame = state?.stage !== "playing" || isIntro;

      // When in lobby or intro stage, lock all game actions and scoring hotkeys!
      if (notInGame) {
        if ((e.key === "b" || e.key === "B") && state?.stage === "finished") {
          e.preventDefault();
          if (state.summaryState?.active) call("summary:stop");
          else if (canStartScoreSummary(state)) call("summary:start");
        } else if (e.key === "f" || e.key === "F") {
          e.preventDefault();
          if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(() => {});
          else document.exitFullscreen().catch(() => {});
        } else if (e.key === "h" || e.key === "H") {
          e.preventDefault();
          call("studio:toggle");
        }
        return; // Strictly suppress Space, Enter, Backspace, W, R, G, C, S, B, N
      }

      if (e.code === "Space") {
        e.preventDefault();
        if (state?.currentRound === "khoiDong") {
          if (!state.khoiDong?.started || !state.khoiDong?.questionRevealed) return;
          call("kd:timer");
        }
        else if (state?.currentRound === "vcnv") call("vcnv:timer");
        else if (state?.currentRound === "tangToc") call("tt:timer");
        else if (state?.currentRound === "veDich") call("vd:timer");
        else if (state?.currentRound === "cauHoiPhu") call("chp:timer");
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (state?.currentRound === "khoiDong") {
          if (!state.khoiDong?.started || !state.khoiDong?.questionRevealed) return;
          call("kd:correct");
        }
        else if (state?.currentRound === "vcnv") call("vcnv:correct");
        else if (state?.currentRound === "tangToc") call("tt:grade");
        else if (state?.currentRound === "veDich") call("vd:correct");
        else if (state?.currentRound === "cauHoiPhu") call("chp:correct");
      } else if (e.key === "Backspace") {
        e.preventDefault();
        if (state?.currentRound === "khoiDong") {
          const kd = state.khoiDong;
          if (!kd?.started || !kd?.questionRevealed) return;
          const seg = kd.segments[kd.segIdx];
          const isSolo = seg?.kind === "solo";
          const now = serverNow ? serverNow() : Date.now();
          if (!isSolo && kd.buzzedSeat == null && kd.noBuzzWrongUnlockAt && now < kd.noBuzzWrongUnlockAt) {
            return;
          }
          call("kd:wrong");
        }
        else if (state?.currentRound === "vcnv") call("vcnv:wrong");
        else if (state?.currentRound === "veDich") call("vd:wrong");
        else if (state?.currentRound === "cauHoiPhu") call("chp:wrong");
      } else if (e.key === "w" || e.key === "W") {
        e.preventDefault();
        if (state?.currentRound === "vcnv") call("vcnv:waitingAnswer");
        else if (state?.currentRound === "tangToc") call("tt:blank");
        else call("bgm:waiting");
      } else if (e.key === "r" || e.key === "R") {
        e.preventDefault();
        if (state?.currentRound === "vcnv") call("vcnv:reveal");
        else if (state?.currentRound === "tangToc") call("tt:reveal");
      } else if (e.key === "g" || e.key === "G") {
        e.preventDefault();
        if (state?.currentRound === "tangToc") call("tt:grade");
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
        if (state?.summaryState?.active) {
          call("summary:stop");
        } else if (canStartScoreSummary(state)) {
          call("summary:start");
        }
      } else if (e.key === "h" || e.key === "H") {
        e.preventDefault();
        call("studio:toggle");
      } else if (e.key === "n" || e.key === "N") {
        e.preventDefault();
        if (state?.currentRound === "khoiDong") {
          const kd = state.khoiDong;
          if (!kd?.started) return;
          const now = serverNow ? serverNow() : Date.now();
          if (kd.startCooldownUntil && now < kd.startCooldownUntil) return;
          call("kd:next");
        }
        else if (state?.currentRound === "tangToc") call("tt:next");
        else if (state?.currentRound === "veDich") {
          const vd = state.veDich;
          if (vd?.phase === "seatDone") call("vd:nextSeat");
          else if (vd?.phase === "packageReady" || vd?.phase === "result") call("vd:startQuestion");
        }
        else if (state?.currentRound === "cauHoiPhu") call("chp:next");
      } else if (e.key === "f" || e.key === "F") {
        e.preventDefault();
        if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(() => {});
        else document.exitFullscreen().catch(() => {});
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [state, serverNow]);

  // Tick every 100ms when Host "Sai" button lock countdown is active in shared Khởi Động
  const [, setWrongLockTick] = useState(0);
  useEffect(() => {
    const unlockAt = state?.khoiDong?.noBuzzWrongUnlockAt;
    if (!unlockAt) return;
    const now = serverNow ? serverNow() : Date.now();
    if (now >= unlockAt) return;
    const interval = setInterval(() => {
      setWrongLockTick((t) => t + 1);
      const cur = serverNow ? serverNow() : Date.now();
      if (cur >= unlockAt) clearInterval(interval);
    }, 100);
    return () => clearInterval(interval);
  }, [state?.khoiDong?.noBuzzWrongUnlockAt, serverNow]);

  // Calculate current timer countdown for right-hand status widget with live useCountdown
  const activeTimer = useMemo(() => {
    if (!state || state.stage !== "playing" || Boolean(state.introTimer) || Boolean(state.entranceState?.active) || Boolean(state.introStandby)) return null;
    const curRound = state.currentRound;
    if (curRound === "khoiDong") {
      if (!state.khoiDong?.started || !state.khoiDong?.questionRevealed) return null;
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

  // Timer countdown isolated to <ActiveTimerBadge /> leaf component to maintain 60fps and 0ms latency
  const activeTimerSeconds = activeTimer ? "active" : "--";

  if (join && !join.ok) {
    return (
      <div className="fixed inset-0 w-full h-full min-h-screen bg-gradient-to-b from-[#0a0c1a] via-[#101226] to-[#060712] p-8 text-rose-300 text-lg flex items-center justify-center">
        Không thể vào bàn điều khiển: {join.error}
      </div>
    );
  }
  if (!state) {
    return (
      <div className="fixed inset-0 w-full h-full min-h-screen bg-gradient-to-b from-[#0a0c1a] via-[#101226] to-[#060712] p-8 text-sky-200 flex items-center justify-center font-bold text-lg">
        Đang kết nối bàn điều khiển…
      </div>
    );
  }

  const seats = activeSeats(state);
  const curRound = state.currentRound;
  const summaryAllowed = canStartScoreSummary(state);
  const isIntroStage =
    state.stage === "playing" &&
    (Boolean(state.introTimer) || Boolean(state.entranceState?.active) || Boolean(state.introStandby));
  const curRoundName = isIntroStage
    ? "CHÀO ĐẦU & GIỚI THIỆU"
    : curRound
      ? ROUND_LABELS[curRound]
      : "CHỜ BẮT ĐẦU";



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
    <div className="w-full h-full min-h-full flex-1 bg-gradient-to-b from-[#0a0c1a] via-[#101226] to-[#060712] text-slate-100 flex flex-col font-sans select-none overflow-hidden">
      {/* ── TOP HEADER BAR (CLEAN, NO OVERLAPPING) ── */}
      <header className="min-h-10 py-1 border-b border-violet-500/15 bg-black/30 backdrop-blur-sm px-2.5 sm:px-3 flex flex-wrap items-center justify-between shrink-0 gap-x-2 gap-y-1">
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

        {/* Right: Theme Switcher, Buzzer Test, Audio Manager, Mute, Toggle Sidebar, Connection, PIN & QR */}
        <div className="flex items-center gap-1 sm:gap-1.5 min-w-0 flex-wrap justify-end">
          {/* Dual-Theme Broadcast Switcher */}
          <button
            type="button"
            onClick={() =>
              call("theme:set", {
                themeMode: state.themeMode === "o26_classic" ? "v3_arrow" : "o26_classic",
              })
            }
            className={`px-2 py-1 rounded-lg font-black text-[11px] border shadow cursor-pointer flex items-center gap-1 shrink-0 transition ${
              state.themeMode === "o26_classic"
                ? "bg-amber-500/25 border-amber-400 text-amber-200"
                : "bg-red-600/30 border-red-400 text-red-100"
            }`}
            title="Chuyển đổi giao diện đồ họa Màn chiếu (Mũi Tên V3 vs O26 Cổ Điển VTV3)"
          >
            <span>🎨</span>
            <span>{state.themeMode === "o26_classic" ? "Theme: O26 Cổ Điển" : "Theme: Mũi Tên V3"}</span>
          </button>

          {/* Buzzer Test Mode Toggle */}
          <button
            type="button"
            onClick={() => call("bell:toggleTest")}
            className={`px-2 py-1 rounded-lg font-black text-[11px] border shadow cursor-pointer flex items-center gap-1 shrink-0 transition ${
              state.bellTestMode
                ? "bg-amber-400 text-slate-950 border-amber-200 animate-pulse"
                : "bg-white/10 hover:bg-white/20 border-white/20 text-amber-300"
            }`}
            title="Bật/Tắt chế độ cho thí sinh bấm thử chuông mà không khóa quyền thi đấu"
          >
            <span>🔔</span>
            <span>{state.bellTestMode ? "Đang Test Chuông" : "Test Chuông"}</span>
          </button>

          {state.bellTestMode && (
            <button
              type="button"
              onClick={() => call("bell:clearTest")}
              className="px-2 py-1 rounded-lg bg-rose-600/40 hover:bg-rose-600/60 border border-rose-400 text-white font-bold text-[11px] cursor-pointer shrink-0"
              title="Xóa danh sách test chuông để thử lại"
            >
              🧹 Reset Chuông
            </button>
          )}

          <button
            type="button"
            onClick={() => setShowQrModal(true)}
            className="px-2 py-1 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-black text-[11px] shadow cursor-pointer flex items-center gap-1 shrink-0"
            title="Mở Mã QR để thí sinh quét tham gia trận đấu"
          >
            <span>📱</span>
            <span className="hidden sm:inline">Mã QR</span>
          </button>

          <button
            type="button"
            onClick={() => {
              const url = typeof window !== "undefined" ? `${window.location.origin}/olympia/play/${code}` : "";
              if (url && navigator?.clipboard?.writeText) {
                navigator.clipboard.writeText(url);
                setCopiedLink(true);
                setTimeout(() => setCopiedLink(false), 2000);
              }
            }}
            className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold text-xs shadow cursor-pointer flex items-center gap-1 shrink-0"
            title="Sao chép link thí sinh"
          >
            <span>📋</span>
            <span>{copiedLink ? "✓ Đã chép link!" : "Copy link"}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (navigator?.clipboard?.writeText) {
                navigator.clipboard.writeText(code);
                setCopiedPin(true);
                setTimeout(() => setCopiedPin(false), 2000);
              }
            }}
            className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/40 text-amber-300 font-mono font-black text-xs cursor-pointer flex items-center gap-1.5 shrink-0"
            title="Nhấp để chép mã PIN phòng"
          >
            <span className={connected ? "text-emerald-400 font-bold" : "text-rose-400 font-bold"}>
              {connected ? "🟢" : "🔴"}
            </span>
            <span>PIN: {code}</span>
            {copiedPin && <span className="text-[10px] text-emerald-400 font-sans font-bold">✓ Đã chép!</span>}
          </button>

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
            onClick={() => {
              const next = !ttsActive;
              setTtsActive(next);
              setTtsEnabled(next);
              if (typeof window !== "undefined") {
                try {
                  window.postMessage({ type: "SET_TTS", enabled: next }, "*");
                  document.querySelectorAll("iframe").forEach((frame) => {
                    frame.contentWindow?.postMessage({ type: "SET_TTS", enabled: next }, "*");
                  });
                } catch {}
              }
              if (next) {
                speakTTS("Bật chế độ đọc câu hỏi");
              } else {
                cancelTTS();
              }
            }}
            className={`px-2 py-1 rounded text-xs font-bold cursor-pointer border shrink-0 transition flex items-center gap-1 ${
              ttsActive
                ? "bg-cyan-600/30 border-cyan-400 text-cyan-200 shadow-[0_0_10px_rgba(6,182,212,0.4)]"
                : "bg-white/5 border-white/10 text-slate-400 hover:bg-white/10"
            }`}
            title="Bật/Tắt chế độ đọc câu hỏi tự động (TTS tiếng Việt)"
          >
            <span>🎙️</span>
            <span className="hidden sm:inline">{ttsActive ? "TTS: BẬT" : "TTS: TẮT"}</span>
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

          {/* Gỡ phòng / Xóa phòng khi ở phòng thật */}
          {!isSandbox && (
            <button
              type="button"
              onClick={handleDeleteRoom}
              disabled={deleteLoading}
              className="px-2.5 py-1 rounded-lg bg-rose-600/20 hover:bg-rose-600/40 border border-rose-500/50 text-rose-300 hover:text-white font-bold text-xs shadow cursor-pointer flex items-center gap-1 shrink-0 transition"
              title="Xóa/Gỡ hoàn toàn phòng này khỏi hệ thống"
            >
              <span>🗑️</span>
              <span>{deleteLoading ? "Đang gỡ..." : "Gỡ phòng"}</span>
            </button>
          )}
        </div>
      </header>

      {/* Floating 16:9 Picture-in-Picture (PiP) Display Preview */}
      {showMiniDisplay && (
        <div className="fixed bottom-16 right-4 z-40 w-[320px] sm:w-[384px] rounded-xl bg-slate-950/95 border-2 border-cyan-400/60 shadow-[0_12px_40px_rgba(0,0,0,0.9)] overflow-hidden flex flex-col">
          <div className="flex items-center justify-between text-[11px] px-2.5 py-1.5 bg-slate-900 border-b border-cyan-500/30 text-cyan-300 font-bold">
            <span className="truncate">📺 PiP Màn hình Chiếu (16:9)</span>
            <div className="flex items-center gap-2 shrink-0">
              <a
                href={`/olympia/display/${code}`}
                target="_blank"
                rel="noreferrer"
                className="text-sky-400 hover:underline"
              >
                Mở tab riêng ↗
              </a>
              <button
                type="button"
                onClick={() => setShowMiniDisplay(false)}
                className="text-slate-400 hover:text-white px-1 cursor-pointer"
                title="Đóng cửa sổ xem trước"
              >
                ✕
              </button>
            </div>
          </div>
          <div className="relative w-[320px] h-[180px] sm:w-[384px] sm:h-[216px] bg-black overflow-hidden">
            <ScaledDisplayFrame
              src={`/olympia/display/${code}?mute=1`}
              title="Mini Display"
            />
          </div>
        </div>
      )}

      {err && <div className="bg-rose-500/20 border-b border-rose-500/50 px-3 py-1.5 text-rose-200 text-xs">⚠️ {err}</div>}

      {/* Bell Test Mode Live Log Banner */}
      {state.bellTestMode && (
        <div className="bg-amber-500/20 border-b border-amber-400/50 px-3 py-1.5 flex items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-black text-amber-300 uppercase">🔔 CHẾ ĐỘ THỬ CHUÔNG ĐANG BẬT:</span>
            {state.bellTestLogs && state.bellTestLogs.length > 0 ? (
              state.bellTestLogs.map((log) => (
                <span
                  key={log.seat}
                  className="px-2 py-0.5 rounded bg-amber-400 text-slate-950 font-black text-[11px]"
                >
                  Lượt {log.order}: {seatName(state, log.seat)}
                </span>
              ))
            ) : (
              <span className="text-slate-300 italic">Đang chờ thí sinh bấm thử chuông…</span>
            )}
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => call("bell:clearTest")}
              className="px-2 py-0.5 rounded bg-white/15 hover:bg-white/25 text-white font-bold text-[11px] cursor-pointer"
            >
              🧹 Xóa thử lại
            </button>
            <button
              type="button"
              onClick={() => call("bell:toggleTest")}
              className="px-2 py-0.5 rounded bg-rose-600 hover:bg-rose-500 text-white font-black text-[11px] cursor-pointer"
            >
              ✕ Tắt chế độ thử
            </button>
          </div>
        </div>
      )}

      {/* ── MAIN 3-COLUMN WORKSPACE ── */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* 1. LEFT SIDEBAR: Rounds & Tools (Compact) */}
        <aside className="w-28 sm:w-32 bg-black/25 border-r border-violet-500/15 p-1.5 flex flex-col justify-between shrink-0">
          <div className="space-y-1">
            <RoundTabButton
              id="khoiDong"
              label="Khởi Động"
              icon="⭐"
              active={!isIntroStage && curRound === "khoiDong"}
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
            {/* Entrance Sequence Toggle / Step / Skip Controls (Manual Trigger by Host/MC) */}
            {state.entranceState?.active ? (
              <div className="space-y-1 bg-amber-950/40 border border-amber-400/40 rounded p-1">
                <div className="flex items-center justify-between text-[10px] font-bold text-amber-200 px-0.5">
                  <span>TS {(state.entranceState.currentSeatIdx ?? 0) + 1}/{state.seats.length || 4}</span>
                  <span className="text-[9px] text-amber-300">
                    {(() => {
                      const g = state.entranceState.seatGestures?.[state.entranceState.currentSeatIdx ?? 0];
                      if (g === "fist_pump") return "✊ Quyết tâm";
                      if (g === "hand_on_heart_bow") return "🙇 Cúi chào";
                      if (g === "wave_double") return "🙌 Vẫy 2 tay";
                      if (g === "heart_pose") return "🫶 Bắn tim";
                      return "👋 Vẫy tay";
                    })()}
                  </span>
                </div>
                <div className="text-[10px] text-amber-300/80 text-center py-0.5 bg-black/30 rounded border border-white/5 font-semibold">
                  <span>🎬 Đang chào sân khấu</span>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => call("entrance:start")}
                className="w-full text-left px-1.5 py-1 rounded text-[10px] sm:text-[11px] font-bold text-sky-300 bg-sky-950/40 border border-sky-500/30 hover:bg-sky-500/20 flex items-center gap-1 cursor-pointer truncate"
                title="Bắt đầu hoạt cảnh từng thí sinh bước từ cổng vòm xuống bục"
              >
                <span>👥</span>
                <span className="truncate">Chào & Giới thiệu thí sinh</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => call("scoreboard:toggle")}
              className="w-full text-left px-1.5 py-1 rounded text-[10px] sm:text-[11px] font-bold text-slate-300 hover:bg-white/10 flex items-center gap-1 cursor-pointer truncate"
              title="Bật/Tắt Bảng Điểm Tĩnh"
            >
              <span>📊</span>
              <span className="truncate">Bảng điểm</span>
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
                  {isIntroStage
                    ? "Mở màn trận đấu"
                    : curRound === "khoiDong" && state.khoiDong
                    ? (() => {
                        const kdSeg = state.khoiDong.segments[state.khoiDong.segIdx];
                        const isUnlimited = (kdSeg?.questions ?? 0) >= 50 || Boolean(kdSeg?.globalMs && (kdSeg?.questions ?? 0) >= 30);
                        const qNum = state.khoiDong.questionRevealed ? Math.max(1, state.khoiDong.qIdx + 1) : 0;
                        return `Câu ${qNum}${isUnlimited ? "" : `/${kdSeg?.questions ?? 6}`}`;
                      })()
                    : curRound === "vcnv" && state.vcnv
                      ? `Hàng ${state.vcnv.openedCount}/4`
                      : curRound === "tangToc" && state.tangToc
                        ? `Câu ${Math.max(0, state.tangToc.qIdx + 1)}/4`
                        : curRound === "veDich" && state.veDich
                          ? `Câu ${Math.max(0, state.veDich.qIdx + 1)}/3`
                          : curRound === "cauHoiPhu" && state.cauHoiPhu
                            ? `Câu ${Math.max(0, state.cauHoiPhu.qIdx + 1)}/${state.chpQuestionLimit === "unlimited" ? "∞" : 3}`
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
                <ActiveTimerBadge timer={activeTimer} serverNow={serverNow} />
              </div>
            </div>

            {/* 1. Question Card Box (Flexible dynamic height to show full question) */}
            <div className="rounded-xl border border-violet-500/25 bg-gradient-to-b from-[#1a0d3f]/90 to-[#0f0728]/95 p-3 shadow-md backdrop-blur-sm">
              <div className="text-xs md:text-sm font-semibold leading-relaxed min-h-[56px] max-h-[240px] overflow-y-auto pr-1 select-text break-words whitespace-pre-wrap">
                {getQuestionText(state) || (
                  <div className="flex items-center gap-2 text-slate-400 italic text-xs py-1">
                    <span className="text-amber-400 font-bold not-italic">🎬</span>
                    <span>
                      {isIntroStage || state.stage !== "playing"
                        ? "Trận đấu đang ở phần Chào đầu & Giới thiệu thí sinh. Nội dung câu hỏi sẽ hiển thị khi chính thức bắt đầu thi."
                        : curRound === "khoiDong" && !state.khoiDong?.started
                        ? "Vòng Khởi Động: Nhấn [▶ BẮT ĐẦU] để khởi động lượt thi."
                        : curRound === "khoiDong" && !state.khoiDong?.questionRevealed
                        ? "Đang mở đồ hoạ (3.5s)... Nhấn [CÂU TIẾP] khi hết đếm lùi để mở câu 1."
                        : "(Trống)"}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* 2. Separate Answer, Subject & Explanation Card Box */}
            <div className="rounded-xl border border-emerald-500/35 bg-gradient-to-r from-emerald-950/45 via-[#0b1f1a]/70 to-purple-950/35 p-2 flex flex-col gap-1.5 shadow-md backdrop-blur-sm">
              {/* Green box: ĐÁP ÁN */}
              <div className="rounded-lg bg-emerald-900/50 border border-emerald-400/40 px-2.5 py-1 text-xs text-emerald-200 flex items-center gap-2 shadow-inner">
                <span className="font-black text-emerald-400 shrink-0 text-[11px] uppercase tracking-wider">ĐÁP ÁN:</span>
                <span className="font-bold text-xs tracking-wide text-emerald-100 select-text">{getAnswerText(state) || "--"}</span>
              </div>

              {/* Cyan / Sky box: LĨNH VỰC (if available) */}
              {getSubjectText(state) && (
                <div className="rounded-lg bg-sky-950/40 border border-sky-400/35 px-2.5 py-1 text-xs text-sky-200 flex items-center gap-2">
                  <span className="font-black text-sky-400 shrink-0 text-[11px] uppercase tracking-wider">LĨNH VỰC:</span>
                  <span className="font-semibold text-sky-100 text-[11px] select-text">{getSubjectText(state)}</span>
                </div>
              )}

              {/* Purple box: GIẢI THÍCH */}
              {getExplanationText(state) && (
                <div className="rounded-lg bg-purple-950/40 border border-purple-400/30 px-2.5 py-1 text-xs text-purple-200 flex items-center gap-2">
                  <span className="font-black text-purple-400 shrink-0 text-[11px] uppercase tracking-wider">GIẢI THÍCH:</span>
                  <span className="text-slate-300 text-[11px] truncate select-text">{getExplanationText(state)}</span>
                </div>
              )}
            </div>

            {/* Dedicated Manual Video Control for KD, VCNV, VD, CHP */}
            {(() => {
              const curMedia = getCurrentQuestionMedia(state);
              if (!curMedia || !curMedia.isVideo || state.currentRound === "tangToc") return null;
              const isMediaOpen = Boolean(state.manualMediaState?.isOpen);
              const isMediaPlaying = Boolean(state.manualMediaState?.isPlaying);

              return (
                <div className="rounded-xl border-2 border-cyan-400/50 bg-gradient-to-r from-[#041430]/90 to-[#020b1c]/95 p-3 flex flex-wrap items-center justify-between gap-3 shadow-lg animate-fade-in">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-lg bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-lg">
                      🎬
                    </div>
                    <div>
                      <div className="text-xs font-black text-cyan-300 uppercase tracking-wider flex items-center gap-1.5">
                        <span>VIDEO CÂU HỎI (ĐIỀU KHIỂN THỦ CÔNG)</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-400/10 text-cyan-200 border border-cyan-400/20 font-bold">
                          Độc lập
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 font-medium mt-0.5">
                        {isMediaOpen
                          ? isMediaPlaying
                            ? "🟢 Đang phát trên màn hình chiếu"
                            : "⏸ Đang tạm dừng trên màn hình chiếu"
                          : "⚪ Video chưa mở lên màn hình chiếu"}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {!isMediaOpen ? (
                      <button
                        type="button"
                        onClick={() => call("media:open")}
                        className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs flex items-center gap-1.5 shadow-[0_0_12px_rgba(16,185,129,0.35)] cursor-pointer transition"
                      >
                        <span>👁 MỞ & PHÁT VIDEO</span>
                      </button>
                    ) : (
                      <>
                        {isMediaPlaying ? (
                          <button
                            type="button"
                            onClick={() => call("media:pause")}
                            className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs flex items-center gap-1 cursor-pointer transition shadow"
                          >
                            <span>⏸ TẠM DỪNG</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => call("media:play")}
                            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1 cursor-pointer transition shadow"
                          >
                            <span>▶ PHÁT TIẾP</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => call("media:close")}
                          className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-1 cursor-pointer transition shadow"
                        >
                          <span>✕ ĐÓNG VIDEO</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* Utility Bar: NỀN CHỜ (W), BẢNG ĐIỂM (B), TRƯỜNG QUAY 3D (H) & CHẾ ĐỘ HIỂN THỊ */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
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
                disabled={!state.summaryState?.active && !summaryAllowed}
                onClick={() => {
                  if (state.summaryState?.active) {
                    call("summary:stop");
                  } else if (summaryAllowed) {
                    call("summary:start");
                  }
                }}
                className={`py-1.5 rounded-lg border text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition ${
                  state.summaryState?.active
                    ? "bg-amber-500/30 border-amber-400 text-amber-200 shadow-[0_0_15px_rgba(251,191,36,0.3)] animate-pulse cursor-pointer"
                    : summaryAllowed
                    ? "bg-violet-500/15 border-violet-400/35 text-violet-200 hover:bg-violet-500/25 cursor-pointer"
                    : "bg-slate-900/60 border-white/10 text-slate-500 opacity-45 cursor-not-allowed"
                }`}
                title={
                  state.summaryState?.active
                    ? "Dừng tổng kết điểm và quay lại toàn cảnh (Phím B)"
                    : summaryAllowed
                    ? "Tổng kết điểm số các thí sinh từ thấp đến cao sau khi kết thúc phần thi (Phím B)"
                    : "Chỉ mở Tổng kết điểm (Phím B) sau khi kết thúc hoàn toàn một phần thi"
                }
              >
                <span>🏆</span>
                <span>{state.summaryState?.active ? "DỪNG TỔNG KẾT (B)" : "TỔNG KẾT ĐIỂM (B)"}</span>
              </button>
              <button
                type="button"
                onClick={() => call("studio:toggle")}
                className={`py-1.5 rounded-lg border text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer transition ${
                  state.showStageGraphics
                    ? "bg-cyan-500/35 border-cyan-300 text-cyan-100 shadow-[0_0_15px_rgba(34,211,238,0.4)] ring-1 ring-cyan-400"
                    : "bg-cyan-500/10 border-cyan-500/20 text-cyan-300 hover:bg-cyan-500/20"
                }`}
                title="Bật/Tắt chế độ toàn cảnh trường quay 3D & Cổng lục giác (Phím H)"
              >
                <span>💎</span>
                <span className="truncate">{state.showStageGraphics ? "TRƯỜNG QUAY 3D: BẬT" : "TRƯỜNG QUAY 3D (H)"}</span>
              </button>
              <button
                type="button"
                onClick={() => call("display:overlayMode")}
                className={`py-1.5 rounded-lg border text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1 transition cursor-pointer ${
                  state.overlayMode === "FULLSCREEN"
                    ? "bg-purple-600/30 text-purple-200 border-purple-400 shadow-[0_0_10px_rgba(168,85,247,0.3)]"
                    : "bg-emerald-600/25 text-emerald-200 border-emerald-400/60 shadow-[0_0_10px_rgba(16,185,129,0.3)]"
                }`}
                title="Chuyển chế độ hiển thị: 1/3 Dưới đè lên 3D hoặc Toàn Màn Hình"
              >
                <span>{state.overlayMode === "FULLSCREEN" ? "🔲" : "📺"}</span>
                <span className="truncate">{state.overlayMode === "FULLSCREEN" ? "Toàn Màn" : "1/3 Dưới"}</span>
              </button>
            </div>

            {/* Summary Controls Toolbar when Summary is active */}
            {state.summaryState?.active && (
              <div className="rounded-xl border border-amber-500/60 bg-gradient-to-r from-amber-950/80 via-slate-950/95 to-amber-950/80 p-2.5 shadow-xl flex flex-wrap items-center justify-between gap-2 backdrop-blur-md animate-fade-in">
                <div className="flex items-center gap-2">
                  <span className="text-amber-400 font-black text-xs uppercase tracking-wider flex items-center gap-1">
                    <span>🏆</span> TỔNG KẾT ĐIỂM:
                  </span>
                  <span className="text-[11px] font-bold text-amber-200 bg-amber-500/20 px-2 py-0.5 rounded border border-amber-500/30">
                    Thí sinh {state.summaryState.currentIndex + 1}/{state.summaryState.orderedSeats.length}
                    {state.seats[state.summaryState.orderedSeats[state.summaryState.currentIndex]] && (
                      <span className="ml-1 text-white font-black">
                        ({state.seats[state.summaryState.orderedSeats[state.summaryState.currentIndex]].name} - {state.seats[state.summaryState.orderedSeats[state.summaryState.currentIndex]].score}đ)
                      </span>
                    )}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {state.summaryState.isAuto ? "⏱ Tự động 3.5s" : "✋ Thủ công"}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    type="button"
                    onClick={() => call("summary:prev")}
                    className="px-2 py-1 rounded bg-white/10 hover:bg-white/20 text-xs font-bold text-white border border-white/20 cursor-pointer"
                    title="Thí sinh trước"
                  >
                    ◀ Trước
                  </button>
                  <button
                    type="button"
                    onClick={() => call("summary:next")}
                    className="px-2 py-1 rounded bg-white/10 hover:bg-white/20 text-xs font-bold text-white border border-white/20 cursor-pointer"
                    title="Thí sinh tiếp theo"
                  >
                    ▶ Tiếp
                  </button>
                  <button
                    type="button"
                    onClick={() => call("summary:toggleAuto")}
                    className={`px-2 py-1 rounded text-xs font-bold border transition cursor-pointer ${
                      state.summaryState.isAuto
                        ? "bg-amber-600/40 text-amber-200 border-amber-500/60"
                        : "bg-emerald-600/40 text-emerald-200 border-emerald-500/60"
                    }`}
                    title="Tạm dừng / Bật tự động chuyển thí sinh sau 3.5s"
                  >
                    {state.summaryState.isAuto ? "⏸ Tạm dừng" : "▶ Tiếp tục"}
                  </button>
                  <button
                    type="button"
                    onClick={() => call("summary:toggleFullscreen")}
                    className="px-2 py-1 rounded bg-purple-600/40 hover:bg-purple-600/60 text-purple-200 text-xs font-bold border border-purple-500/50 cursor-pointer"
                    title="Chuyển chế độ Toàn Màn / 1/3 Dưới"
                  >
                    {state.summaryState.isFullscreen ? "📺 1/3 Dưới" : "⛶ Toàn màn"}
                  </button>
                  <button
                    type="button"
                    onClick={() => call("summary:stop")}
                    className="px-2.5 py-1 rounded bg-rose-600 hover:bg-rose-500 text-xs font-black text-white shadow cursor-pointer"
                    title="Kết thúc tổng kết điểm và quay về toàn cảnh CAM 10"
                  >
                    🏁 Về toàn cảnh
                  </button>
                </div>
              </div>
            )}

            {/* ── BÀN ĐẠO DIỄN HÌNH ẢNH TRƯỜNG QUAY 3D & MÀN HÌNH PHẢI (COMPACT VISION MIXER) ── */}
            <div className="rounded-xl border border-cyan-500/30 bg-[#090d1e]/95 p-2 shadow-xl flex flex-col gap-1.5 backdrop-blur-md">
              <div className="flex items-center justify-between text-[11px] font-bold">
                <div className="flex items-center gap-1.5 text-cyan-300">
                  <span className="text-xs">🎥</span>
                  <span className="uppercase tracking-wider font-black text-white">ĐẠO DIỄN TRƯỜNG QUAY 3D</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded font-mono bg-cyan-950/80 text-cyan-300 border border-cyan-700/50">
                    {state.studioCameraManual
                      ? `Góc C${state.studioCamera ?? 1}`
                      : state.summaryState?.active
                        ? state.summaryState.isFullscreen
                          ? "Tổng kết Toàn cảnh (C10)"
                          : `Tổng kết TS ${(state.summaryState.orderedSeats[state.summaryState.currentIndex] ?? 0) + 1} (C${seatToStudioCamera(state.summaryState.orderedSeats[state.summaryState.currentIndex] ?? 0)})`
                        : "Tự động theo vòng"}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => call("studio:camera:auto")}
                  className={`px-2 py-0.5 rounded text-[10px] font-black border transition cursor-pointer ${
                    !state.studioCameraManual
                      ? "bg-amber-400 text-slate-950 border-amber-300 shadow-[0_0_8px_#f59e0b]"
                      : "bg-white/5 text-slate-300 border-white/15 hover:bg-white/10"
                  }`}
                  title="Kích hoạt tự động chuyển góc quay thông minh theo diễn biến thi đấu"
                >
                  🤖 TỰ ĐỘNG
                </button>
              </div>

              {/* Camera Presets Selector */}
              <div className="grid grid-cols-5 sm:grid-cols-10 md:grid-cols-14 gap-1">
                {[
                  { id: 1, label: "CAM 1: Toàn Cảnh Sân Khấu", short: "Toàn Cảnh" },
                  { id: 2, label: "CAM 2: Màn LED & Cổng Lục Giác", short: "Màn LED" },
                  { id: 3, label: "CAM 3: Bục MC Dẫn Chương Trình", short: "Bục MC" },
                  { id: 4, label: "CAM 4: Bục Danh Dự Vòng Nguyệt Quế", short: "Nguyệt Quế" },
                  { id: 5, label: "CAM 5: Cận Cảnh TS 1", short: "TS 1" },
                  { id: 6, label: "CAM 6: Cận Cảnh TS 2", short: "TS 2" },
                  { id: 7, label: "CAM 7: Cận Cảnh TS 3", short: "TS 3" },
                  { id: 8, label: "CAM 8: Cận Cảnh TS 4", short: "TS 4" },
                  ...(seats.length > 4
                    ? seats.slice(4).map((s, idx) => ({
                        id: 25 + idx,
                        label: `CAM ${25 + idx}: Cận Cảnh TS ${5 + idx} (${s.name || `TS ${5 + idx}`})`,
                        short: `TS ${5 + idx}`,
                      }))
                    : []),
                  { id: 9, label: "CAM 9: Cẩu Quay Jib Toàn Khán Đài", short: "Cẩu Jib" },
                  { id: 10, label: "CAM 10: Toàn Cảnh Bục Thí Sinh", short: "Bục TS" },
                  { id: 11, label: "CAM 11: Cam Ẩn Trực Diện Chào Sân", short: "Trực Diện" },
                  { id: 12, label: "CAM 12: Cam Chéo Khán Đài 3/4", short: "Chéo 3/4" },
                  { id: 13, label: "CAM 13: Cổng Vòm & Đỉnh Núi", short: "Cổng Vòm" },
                  { id: 14, label: "CAM 14: Góc Thấp Khởi Động", short: "Góc Thấp" },
                  { id: 15, label: "CAM 15: Cận Bục Về Đích", short: "Về Đích" },
                ].map((c) => {
                  const isPinned = state.studioCameraManual && (state.studioCamera ?? 1) === c.id;
                  const summaryTargetCam =
                    state.summaryState?.active && !state.studioCameraManual
                      ? state.summaryState.isFullscreen
                        ? 10
                        : seatToStudioCamera(state.summaryState.orderedSeats[state.summaryState.currentIndex] ?? 0)
                      : null;
                  const isAutoSummaryCam = summaryTargetCam === c.id;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => call("studio:camera", { cam: c.id })}
                      title={c.label}
                      className={`py-1 px-0.5 rounded text-[10px] font-bold transition flex flex-col items-center justify-center cursor-pointer border ${
                        isPinned
                          ? "bg-amber-400 text-slate-950 border-amber-300 shadow-[0_0_8px_#f59e0b] font-black"
                          : isAutoSummaryCam
                            ? "bg-cyan-500/25 text-cyan-100 border-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.45)] font-black"
                            : "bg-white/5 hover:bg-white/15 text-slate-300 border-white/10 hover:border-cyan-400/40"
                      }`}
                    >
                      <span className="text-[9px] opacity-75 font-mono">C{c.id}</span>
                      <span className="truncate max-w-full text-[10px] leading-tight">{c.short}</span>
                    </button>
                  );
                })}
              </div>

              {/* Right LED Screen Mode Selector */}
              <div className="flex flex-wrap items-center justify-between gap-1 pt-1 border-t border-cyan-500/20 text-[11px]">
                <span className="text-cyan-300 font-bold flex items-center gap-1">
                  <span>🖥️</span>
                  <span>Màn hình phải (Right Screen):</span>
                </span>
                <div className="flex items-center gap-1">
                  {[
                    { id: "auto", label: "Tự động" },
                    { id: "roundTitle", label: "Tên phần thi" },
                    { id: "logo", label: "Logo Olympia" },
                    { id: "question", label: "Câu hỏi" },
                    { id: "scoreboard", label: "Bảng điểm" },
                  ].map((m) => {
                    const active = (state.rightScreenMode || "auto") === m.id;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => call("rightScreen:setMode", { mode: m.id })}
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold border transition cursor-pointer ${
                          active
                            ? "bg-cyan-500 text-slate-950 border-cyan-300 shadow-[0_0_8px_rgba(0,240,255,0.6)] font-black"
                            : "bg-white/5 text-slate-300 border-white/10 hover:bg-white/10"
                        }`}
                      >
                        {m.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* ROUND-SPECIFIC CONTROL DECK */}
            <div className="rounded-xl border border-violet-500/15 bg-gradient-to-b from-[#1a0d3f]/60 to-[#0f0728]/80 p-2 sm:p-2.5 shadow-xl backdrop-blur-sm">
              {isIntroStage && (
                <div className="py-5 px-4 max-w-3xl mx-auto space-y-4 text-center animate-fade-in">
                  <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/20 border border-amber-400/50 text-amber-300 text-xs sm:text-sm font-black uppercase tracking-wider">
                    <span>🎬</span>
                    <span>ĐANG Ở PHẦN KHAI MẠC &amp; GIỚI THIỆU TRẬN ĐẤU</span>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-300 max-w-xl mx-auto">
                    Hệ thống đang phát hoạt cảnh mở đầu trên màn hình chiếu. Bạn có thể bấm giới thiệu từng thí sinh hoặc chủ động bấm vào vòng <b>Khởi Động</b> khi MC đã dẫn xong.
                  </p>
                  <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
                    {state.entranceState?.active ? (
                      <>
                        {(() => {
                          const curIdx = state.entranceState.currentSeatIdx ?? 0;
                          const totalSeats = state.seats.length || 4;
                          const isLastSeat = curIdx >= totalSeats - 1;

                          if (!isLastSeat) {
                            return (
                              <button
                                type="button"
                                onClick={() => call("entrance:next")}
                                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs sm:text-sm shadow-lg cursor-pointer transition flex items-center gap-1.5"
                              >
                                <span>⏭️</span>
                                <span>Thí sinh tiếp theo ({curIdx + 2}/{totalSeats})</span>
                              </button>
                            );
                          } else {
                            return (
                              <div className="px-4 py-2 rounded-xl bg-emerald-950/60 border border-emerald-400/50 text-emerald-200 text-xs sm:text-sm font-black flex items-center gap-2 shadow-inner">
                                <span>✅</span>
                                <span>Đã giới thiệu xong toàn bộ ({totalSeats}/{totalSeats}) thí sinh</span>
                              </div>
                            );
                          }
                        })()}
                        <button
                          type="button"
                          onClick={() => call("entrance:skip")}
                          className="px-4 py-2.5 rounded-xl bg-rose-600/80 hover:bg-rose-500 text-white font-bold text-xs sm:text-sm shadow cursor-pointer transition flex items-center gap-1.5"
                        >
                          <span>⏹</span>
                          <span>Kết thúc màn chào thí sinh</span>
                        </button>
                      </>
                    ) : state.entranceCompleted ? (
                      <div className="px-4 py-2 rounded-xl bg-emerald-950/60 border border-emerald-400/50 text-emerald-200 text-xs sm:text-sm font-black flex items-center gap-2 shadow-inner">
                        <span>✅</span>
                        <span>Đã giới thiệu xong ({state.seats.length || 4}/{state.seats.length || 4}) thí sinh — Sẵn sàng vào thi</span>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => call("entrance:start")}
                        className="px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-black text-xs sm:text-sm shadow-lg cursor-pointer transition flex items-center gap-2"
                      >
                        <span>👥</span>
                        <span>Chào &amp; Giới thiệu Thí sinh</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => call("round:force", { round: "khoiDong" })}
                      className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-red-600 hover:from-amber-400 hover:to-red-500 text-white font-black text-xs sm:text-sm shadow-xl cursor-pointer transition flex items-center gap-2"
                    >
                      <span>⭐</span>
                      <span>Vào Vòng KHỞI ĐỘNG</span>
                    </button>
                  </div>
                </div>
              )}
              {!isIntroStage && curRound === "khoiDong" && (
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
                <div className="py-4 px-3 max-w-4xl mx-auto space-y-4 animate-fade-in">
                  {/* Top Join & QR Banner */}
                  <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-violet-950/60 via-slate-900/80 to-blue-950/60 border border-violet-500/30 shadow-2xl backdrop-blur-md flex flex-col md:flex-row items-center justify-between gap-4">
                    {/* Left Info */}
                    <div className="space-y-2 text-center md:text-left flex-1 min-w-0">
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-violet-500/20 border border-violet-400/40 text-violet-300 text-xs font-bold uppercase tracking-wider">
                        <span>🏔️</span>
                        <span>Sảnh Chờ Thi Đấu Olympia</span>
                      </div>
                      <div className="space-y-1">
                        <div className="text-xs text-slate-400 uppercase font-bold tracking-wider">Mã PIN Tham Gia Phòng:</div>
                        <div className="flex items-center justify-center md:justify-start gap-2">
                          <span
                            onClick={() => {
                              if (navigator?.clipboard?.writeText) {
                                navigator.clipboard.writeText(code);
                                setCopiedPin(true);
                                setTimeout(() => setCopiedPin(false), 2000);
                              }
                            }}
                            className="font-mono text-3xl sm:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-200 tracking-widest cursor-pointer hover:scale-105 transition"
                            title="Nhấp để sao chép mã PIN"
                          >
                            {code}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              if (navigator?.clipboard?.writeText) {
                                navigator.clipboard.writeText(code);
                                setCopiedPin(true);
                                setTimeout(() => setCopiedPin(false), 2000);
                              }
                            }}
                            className="px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-xs text-amber-300 font-bold border border-amber-400/30 cursor-pointer"
                          >
                            {copiedPin ? "✓ Đã chép PIN!" : "📋 Chép PIN"}
                          </button>
                        </div>
                      </div>
                      <div className="text-xs text-slate-300 flex items-center justify-center md:justify-start gap-2 flex-wrap">
                        <span className="text-slate-400">Link thí sinh:</span>
                        <code className="text-cyan-300 font-mono text-[11px] bg-black/40 px-2 py-0.5 rounded border border-cyan-500/30 truncate max-w-[260px] sm:max-w-xs">
                          {typeof window !== "undefined" ? `${window.location.origin}/olympia/play/${code}` : `/olympia/play/${code}`}
                        </code>
                        <button
                          type="button"
                          onClick={() => {
                            const url = typeof window !== "undefined" ? `${window.location.origin}/olympia/play/${code}` : "";
                            if (url && navigator?.clipboard?.writeText) {
                              navigator.clipboard.writeText(url);
                              setCopiedLink(true);
                              setTimeout(() => setCopiedLink(false), 2000);
                            }
                          }}
                          className="px-2 py-0.5 rounded bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 text-[11px] font-bold border border-cyan-400/40 cursor-pointer"
                        >
                          {copiedLink ? "✓ Đã chép link!" : "📋 Chép Link"}
                        </button>
                      </div>
                      <div className="pt-1 flex items-center justify-center md:justify-start gap-2 flex-wrap">
                        <button
                          type="button"
                          onClick={() => setShowQrModal(true)}
                          className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-black text-xs shadow-lg shadow-cyan-900/40 flex items-center gap-1.5 cursor-pointer transition active:scale-95"
                        >
                          <span>📱</span>
                          <span>Phóng to Mã QR Toàn Màn Hình</span>
                        </button>

                        {/* Setting Câu hỏi phụ: 3 câu vs Không giới hạn (độc lập mùa thi) */}
                        <div
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-xl bg-amber-950/50 border border-amber-400/35"
                          title="Cài đặt số câu tối đa cho vòng Câu hỏi phụ (độc lập với mùa thi; không giới hạn áp dụng từ O27)"
                        >
                          <span className="text-[11px] font-bold text-amber-300 mr-0.5">❓ CHP:</span>
                          <button
                            type="button"
                            onClick={() => call("system:setChpLimit", { limit: 3 })}
                            className={`px-2 py-0.5 rounded-lg text-[11px] font-black transition cursor-pointer ${
                              state.chpQuestionLimit !== "unlimited"
                                ? "bg-amber-400 text-slate-950 shadow"
                                : "bg-white/5 text-slate-300 hover:bg-white/10"
                            }`}
                          >
                            3 câu
                          </button>
                          <button
                            type="button"
                            onClick={() => call("system:setChpLimit", { limit: "unlimited" })}
                            className={`px-2 py-0.5 rounded-lg text-[11px] font-black transition cursor-pointer ${
                              state.chpQuestionLimit === "unlimited"
                                ? "bg-cyan-400 text-slate-950 shadow"
                                : "bg-white/5 text-slate-300 hover:bg-white/10"
                            }`}
                          >
                            ∞ Không giới hạn
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Right: QR Code Preview */}
                    {lobbyQrDataUrl && (
                      <div
                        onClick={() => setShowQrModal(true)}
                        className="p-2.5 bg-white rounded-2xl shadow-xl cursor-pointer hover:scale-105 transition shrink-0 group relative"
                        title="Nhấp để phóng to toàn màn hình"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={lobbyQrDataUrl}
                          alt={`QR ${code}`}
                          className="w-28 h-28 sm:w-32 sm:h-32 rounded-lg block"
                        />
                        <div className="absolute inset-0 bg-black/60 rounded-2xl opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white text-xs font-bold">
                          🔍 Phóng to
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Contestant List & Kick Guidance */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-300 px-1">
                      <span className="flex items-center gap-2">
                        <span>👥 DANH SÁCH THÍ SINH VÀO PHÒNG:</span>
                        <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                          {state.seats.filter((s) => s.name && s.approved !== false).length}/{state.seats.length} Đã duyệt
                        </span>
                      </span>
                      <span className="text-[11px] text-cyan-300 font-semibold">
                        * Duyệt thí sinh và hoán đổi vị trí trước khi bắt đầu
                      </span>
                    </div>

                    {/* Pending Join Requests Alert */}
                    {state.joinRequests && state.joinRequests.length > 0 && (
                      <div className="p-3.5 rounded-2xl bg-amber-500/15 border border-amber-400/50 shadow-xl space-y-2.5 animate-fade-in">
                        <div className="flex items-center justify-between text-xs font-black text-amber-300 uppercase tracking-wider">
                          <span className="flex items-center gap-1.5">
                            <span className="animate-pulse">⏳</span>
                            <span>Yêu cầu tham gia chờ Host phê duyệt ({state.joinRequests.length})</span>
                          </span>
                          <span className="text-[10px] text-amber-200/80 font-normal">Chỉ thí sinh được duyệt mới được tham gia thi đấu</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {state.joinRequests.map((req) => (
                            <div
                              key={req.id}
                              className="p-2.5 rounded-xl bg-slate-900/95 border border-amber-400/40 flex items-center justify-between gap-2 shadow-md"
                            >
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-black bg-cyan-500/20 text-cyan-300 border border-cyan-400/30">
                                    Vị trí {req.seatId + 1}
                                  </span>
                                  <span className="font-bold text-xs text-white truncate">{req.name}</span>
                                </div>
                                {req.school && <div className="text-[10px] text-slate-400 truncate mt-0.5">{req.school}</div>}
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => call("seat:approve", { requestId: req.id, seatId: req.seatId })}
                                  className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow transition active:scale-95 cursor-pointer"
                                  title="Phê duyệt thí sinh vào vị trí này"
                                >
                                  ✓ Duyệt
                                </button>
                                <button
                                  type="button"
                                  onClick={() => call("seat:reject", { requestId: req.id, seatId: req.seatId })}
                                  className="px-2.5 py-1 rounded-lg bg-rose-600/80 hover:bg-rose-600 text-white font-bold text-xs shadow transition active:scale-95 cursor-pointer"
                                  title="Từ chối yêu cầu tham gia"
                                >
                                  ✕ Từ chối
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Swap mode indicator */}
                    {swapSourceSeat !== null && (
                      <div className="p-2 rounded-xl bg-amber-500/20 border border-amber-400 text-amber-200 text-xs font-bold flex items-center justify-between animate-pulse">
                        <span>⇄ Đang chọn vị trí hoán đổi với Vị trí {swapSourceSeat + 1}. Nhấp vào ghế thứ hai để hoàn tất!</span>
                        <button
                          type="button"
                          onClick={() => setSwapSourceSeat(null)}
                          className="px-2 py-0.5 rounded bg-black/40 hover:bg-black/60 text-white text-[10px] border border-white/20"
                        >
                          Hủy bỏ
                        </button>
                      </div>
                    )}

                    <div className={`grid gap-2 ${
                      state.seats.length <= 4 ? "grid-cols-1 sm:grid-cols-2 md:grid-cols-4" :
                      state.seats.length <= 6 ? "grid-cols-2 sm:grid-cols-3 md:grid-cols-6" :
                      "grid-cols-2 sm:grid-cols-4 md:grid-cols-8"
                    }`}>
                      {state.seats.map((s, idx) => {
                        const isPending = Boolean(s.name && s.approved === false);
                        const isApproved = Boolean(s.name && s.approved !== false);
                        const isSwapSelected = swapSourceSeat === s.id;

                        return (
                          <div
                            key={s.id}
                            className={`rounded-xl border p-2.5 transition flex flex-col justify-between gap-2 relative overflow-hidden ${
                              isSwapSelected
                                ? "bg-amber-500/20 border-amber-400 ring-2 ring-amber-400/50 shadow-xl"
                                : isApproved
                                ? "bg-slate-900/90 border-cyan-500/40 shadow-lg shadow-cyan-950/40"
                                : isPending
                                ? "bg-amber-950/40 border-amber-500/50 border-dashed"
                                : "bg-white/[0.02] border-white/10 border-dashed"
                            }`}
                            style={{
                              borderTop: `3px solid ${SEAT_COLORS[idx % SEAT_COLORS.length] || "#00e5ff"}`
                            }}
                          >
                            <div className="flex items-center justify-between text-[11px] text-slate-400 font-bold">
                              <span>Vị trí {idx + 1}</span>
                              {isApproved && (
                                <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-400/30">
                                  ✓ ĐÃ DUYỆT
                                </span>
                              )}
                              {isPending && (
                                <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-bold border border-amber-400/30">
                                  ⏳ CHỜ DUYỆT
                                </span>
                              )}
                              {!s.name && <span className="text-slate-500">⚪ Trống</span>}
                            </div>

                            {s.name ? (
                              <div className="space-y-1.5">
                                <div className="flex items-center justify-between gap-1">
                                  <span className="font-black text-xs sm:text-sm text-white truncate">
                                    {s.name}
                                  </span>
                                  <span className={s.connected ? "text-emerald-400 text-[10px]" : "text-slate-500 text-[10px]"}>
                                    {s.connected ? "🟢 Online" : "🔴 Offline"}
                                  </span>
                                </div>
                                {s.school && (
                                  <div className="text-[10px] text-slate-400 truncate">
                                    {s.school}
                                  </div>
                                )}

                                {/* Action buttons */}
                                <div className="flex items-center gap-1 pt-1 border-t border-white/10">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (swapSourceSeat === null) {
                                        setSwapSourceSeat(s.id);
                                      } else if (swapSourceSeat === s.id) {
                                        setSwapSourceSeat(null);
                                      } else {
                                        call("seat:swap", { seatA: swapSourceSeat, seatB: s.id });
                                        setSwapSourceSeat(null);
                                      }
                                    }}
                                    className={`flex-1 py-1 rounded text-[10px] font-bold border transition cursor-pointer text-center ${
                                      isSwapSelected
                                        ? "bg-amber-500 text-slate-950 border-amber-400 font-black animate-pulse"
                                        : "bg-white/5 hover:bg-white/15 text-cyan-300 border-white/15"
                                    }`}
                                    title="Đổi vị trí thí sinh này với vị trí khác"
                                  >
                                    {isSwapSelected ? "Đang chọn..." : "⇄ Đổi vị trí"}
                                  </button>
                                  {isPending && (
                                    <button
                                      type="button"
                                      onClick={() => call("seat:approve", { seatId: s.id })}
                                      className="px-2 py-1 rounded text-[10px] font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow transition cursor-pointer"
                                      title="Duyệt thí sinh này"
                                    >
                                      ✓ Duyệt
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => setKickCandidate(s)}
                                    className="px-1.5 py-1 rounded text-[10px] font-bold bg-rose-500/10 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 transition cursor-pointer"
                                    title="Hủy thí sinh khỏi vị trí này"
                                  >
                                    ✕
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div>
                                {swapSourceSeat !== null ? (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      call("seat:swap", { seatA: swapSourceSeat, seatB: s.id });
                                      setSwapSourceSeat(null);
                                    }}
                                    className="w-full py-2 rounded-lg bg-amber-500/20 hover:bg-amber-500/40 border border-amber-400/60 text-amber-200 font-bold text-xs transition cursor-pointer text-center animate-pulse"
                                  >
                                    Chuyển tới đây ➔
                                  </button>
                                ) : (
                                  <div className="py-2 text-center text-xs text-slate-500 italic">
                                    Đang chờ thí sinh...
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Start Match CTA */}
                  <div className="pt-2 text-center">
                    <button
                      type="button"
                      onClick={handleStartMatch}
                      className="px-8 py-3 rounded-2xl bg-gradient-to-r from-amber-500 via-red-500 to-violet-600 hover:from-amber-400 hover:to-violet-500 text-white font-black text-sm shadow-xl shadow-amber-500/30 cursor-pointer animate-pulse transition transform hover:scale-105 active:scale-95"
                    >
                      ▶ BẮT ĐẦU TRẬN ĐẤU OLYMPIA
                    </button>
                  </div>
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
                  <b className="font-mono text-cyan-300"><ActiveTimerBadge timer={activeTimer} serverNow={serverNow} /></b>
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

      {/* ── BOTTOM BAR: CONTESTANT CARDS COMPACT (ZERO-SCROLL) ── */}
      <footer className="border-t border-violet-500/15 bg-black/25 px-2 py-1 shrink-0">
        <div className={`grid gap-1.5 ${
          state.seats.length <= 4 ? "grid-cols-2 sm:grid-cols-4" :
          state.seats.length <= 6 ? "grid-cols-3 sm:grid-cols-6" :
          "grid-cols-4 sm:grid-cols-8"
        }`}>
          {state.seats.map((s, idx) => {
            const isEditing = editingSeatId === s.id;
            return (
              <div
                key={s.id}
                className="rounded-lg border border-cyan-500/25 bg-slate-900/95 px-2 py-1 flex items-center justify-between gap-1.5 relative overflow-hidden shadow"
                style={{ borderLeft: `3.5px solid ${SEAT_COLORS[idx % SEAT_COLORS.length] || "#00e5ff"}` }}
              >
                <div className="min-w-0 flex-1 flex flex-col justify-center">
                  {s.name ? (
                    isEditing ? (
                      <input
                        type="text"
                        defaultValue={s.name}
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            const val = (e.target as HTMLInputElement).value.trim();
                            if (val && val !== s.name) call("seat:rename", { seat: s.id, name: val, school: s.school });
                            setEditingSeatId(null);
                          } else if (e.key === "Escape") {
                            setEditingSeatId(null);
                          }
                        }}
                        onBlur={(e) => {
                          const val = e.target.value.trim();
                          if (val && val !== s.name) call("seat:rename", { seat: s.id, name: val, school: s.school });
                          setEditingSeatId(null);
                        }}
                        className="text-[11px] font-black text-slate-100 bg-black/50 border border-cyan-400 rounded px-1 py-0.5 focus:outline-none w-full"
                      />
                    ) : (
                      <div className="flex items-center gap-1 group/name">
                        <button
                          type="button"
                          onClick={() => setKickCandidate(s)}
                          className="text-[11px] font-black text-slate-100 hover:text-rose-300 hover:bg-rose-500/20 px-1 py-0.5 rounded transition flex items-center gap-1 truncate text-left cursor-pointer group-hover/name:border group-hover/name:border-rose-500/30"
                          title="Nhấp vào tên để kick thí sinh khỏi phòng"
                        >
                          <span className={s.connected ? "text-emerald-400 text-[10px]" : "text-slate-500 text-[10px]"}>●</span>
                          <span className="truncate">{s.name}</span>
                          <span className="text-[10px] text-rose-400 opacity-0 group-hover/name:opacity-100 transition shrink-0">🚫</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingSeatId(s.id)}
                          className="text-[10px] text-slate-500 hover:text-amber-300 opacity-40 hover:opacity-100 transition shrink-0 p-0.5"
                          title="Đổi tên"
                        >
                          ✏️
                        </button>
                      </div>
                    )
                  ) : (
                    <div className="text-[11px] font-semibold text-slate-500 italic flex items-center gap-1">
                      <span>Ghế {idx + 1} (Trống)</span>
                      <button
                        type="button"
                        onClick={() => setEditingSeatId(s.id)}
                        className="text-[9px] text-cyan-400 hover:underline not-italic cursor-pointer"
                      >
                        + gán tên
                      </button>
                    </div>
                  )}
                  <input
                    type="text"
                    defaultValue={s.school || ""}
                    key={`host_school_${s.id}_${s.school || ""}`}
                    placeholder="Trường THPT..."
                    onKeyDown={(e) => {
                      if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                    }}
                    onBlur={(e) => {
                      const val = e.target.value.trim();
                      if (val !== (s.school || "")) {
                        call("seat:setSchool", { seat: s.id, school: val });
                      }
                    }}
                    className="w-full text-[9px] px-1 py-0.5 rounded bg-black/40 border border-white/10 text-amber-300 placeholder:text-slate-500 focus:outline-none focus:border-amber-400 leading-normal"
                    title="Nhập tên trường THPT / Tỉnh đại diện"
                  />
                </div>
                <div className="flex flex-col items-end gap-0.5 shrink-0">
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
                    className="w-12 px-1 py-0.5 rounded bg-black/50 border border-amber-400/30 text-amber-300 text-center text-xs sm:text-sm font-black leading-tight focus:outline-none focus:border-amber-400"
                    title="Gõ điểm trực tiếp (Enter để lưu)"
                  />
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => call("score:adjust", { seat: s.id, delta: -10 })}
                      className="w-5 h-4 rounded bg-rose-500/25 border border-rose-500/40 hover:bg-rose-500/40 text-rose-300 text-[10px] font-black cursor-pointer flex items-center justify-center transition"
                      title="Trừ 10 điểm"
                    >
                      -
                    </button>
                    <button
                      type="button"
                      onClick={() => call("score:adjust", { seat: s.id, delta: 10 })}
                      className="w-5 h-4 rounded bg-emerald-500/25 border border-emerald-500/40 hover:bg-emerald-500/40 text-emerald-300 text-[10px] font-black cursor-pointer flex items-center justify-center transition"
                      title="Cộng 10 điểm"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
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

      {/* QR Code Modal */}
      <RoomQRCodeModal
        isOpen={showQrModal}
        onClose={() => setShowQrModal(false)}
        roomCode={code}
        roomTitle="Đường lên đỉnh Olympia"
        customJoinUrl={joinUrl}
      />

      {/* Kick Contestant Confirmation Modal */}
      {kickCandidate && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in select-none">
          <div className="rounded-2xl border border-rose-500/40 bg-slate-900 p-5 w-full max-w-sm space-y-4 shadow-2xl shadow-rose-950/60 animate-scale-up text-center">
            <div className="w-14 h-14 rounded-full bg-rose-500/20 border-2 border-rose-500/50 flex items-center justify-center text-2xl mx-auto text-rose-400">
              🚫
            </div>
            <div className="space-y-1.5">
              <h3 className="text-base font-black text-white">Xác nhận Kick Thí Sinh</h3>
              <p className="text-xs text-slate-300">
                Bạn có chắc chắn muốn mời thí sinh{" "}
                <b className="text-rose-400 font-bold">{kickCandidate.name}</b> (Ghế {kickCandidate.id + 1}) ra khỏi phòng thi?
              </p>
              <p className="text-[11px] text-slate-400">
                Ghế này sẽ được giải phóng ngay lập tức để thí sinh khác có thể vào thay thế.
              </p>
            </div>
            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setKickCandidate(null)}
                className="flex-1 py-2 px-3 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 font-bold text-xs transition cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={async () => {
                  const target = kickCandidate;
                  setKickCandidate(null);
                  if (target) {
                    await call("seat:kick", { seat: target.id });
                  }
                }}
                className="flex-1 py-2 px-3 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-black text-xs shadow-lg shadow-rose-900/50 transition cursor-pointer"
              >
                🚫 Xác nhận Kick
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Start Game Block Modal (<= 1 Contestant) */}
      {startBlockModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-md rounded-3xl bg-slate-900 border-2 border-rose-500/60 p-6 sm:p-8 space-y-5 shadow-2xl text-center">
            <div className="w-16 h-16 rounded-full bg-rose-500/20 border-2 border-rose-500 flex items-center justify-center text-3xl mx-auto">
              🚫
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-black text-rose-400 uppercase tracking-wide">
                KHÔNG THỂ BẮT ĐẦU TRẬN ĐẤU
              </h3>
              <p className="text-sm text-slate-300 leading-relaxed">
                Hiện tại chỉ có{" "}
                <b className="text-rose-300 font-bold">
                  {state.seats.filter((s) => s.name && s.approved !== false).length}
                </b>{" "}
                thí sinh tham gia trong phòng thi.
              </p>
              <p className="text-xs text-slate-400">
                Cần tối thiểu <b>2 thí sinh</b> đã được phê duyệt để có thể bắt đầu cuộc thi!
              </p>
            </div>
            <button
              type="button"
              onClick={() => setStartBlockModal(false)}
              className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm border border-white/20 transition cursor-pointer"
            >
              Đã hiểu
            </button>
          </div>
        </div>
      )}

      {/* Start Game Warning Step 1 */}
      {startWarningStep === 1 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-md rounded-3xl bg-slate-900 border-2 border-amber-400/60 p-6 sm:p-8 space-y-5 shadow-2xl text-center">
            <div className="w-16 h-16 rounded-full bg-amber-400/20 border-2 border-amber-400 flex items-center justify-center text-3xl mx-auto animate-pulse">
              ⚠️
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-black text-amber-300 uppercase tracking-wide">
                CẢNH BÁO SỐ LƯỢNG THÍ SINH
              </h3>
              <p className="text-sm text-slate-300 leading-relaxed">
                Phòng thi được cài đặt cho <b>{state.seatCount || 4} thí sinh</b>, nhưng hiện chỉ có{" "}
                <b className="text-amber-300 font-bold">
                  {state.seats.filter((s) => s.name && s.approved !== false).length} thí sinh
                </b>{" "}
                đã được phê duyệt vào vị trí.
              </p>
              <p className="text-xs text-amber-200/80 font-medium">
                Bạn có muốn bắt đầu trận đấu ngay bây giờ không?
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => setStartWarningStep(0)}
                className="py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-sm border border-white/20 transition cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={() => setStartWarningStep(2)}
                className="py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm shadow-lg shadow-amber-500/30 transition cursor-pointer"
              >
                Có, tiếp tục ➔
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Start Game Final Confirmation Step 2 */}
      {startWarningStep === 2 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-md rounded-3xl bg-slate-900 border-2 border-red-500/80 p-6 sm:p-8 space-y-5 shadow-2xl text-center">
            <div className="w-16 h-16 rounded-full bg-red-500/20 border-2 border-red-500 flex items-center justify-center text-3xl mx-auto">
              🔔
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-black text-red-400 uppercase tracking-wide">
                XÁC NHẬN LẦN CUỐI
              </h3>
              <p className="text-sm text-slate-300 leading-relaxed">
                Xác nhận lần cuối: Bắt đầu trận đấu với{" "}
                <b className="text-white font-black">
                  {state.seats.filter((s) => s.name && s.approved !== false).length} thí sinh
                </b>
                ?
              </p>
              <p className="text-xs text-red-300/90 font-medium p-3 rounded-xl bg-red-500/10 border border-red-500/30">
                Các vị trí còn lại sẽ để trống trong suốt trận đấu và không thể bổ sung thêm người chơi sau khi bắt đầu.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => setStartWarningStep(1)}
                className="py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-sm border border-white/20 transition cursor-pointer"
              >
                ← Quay lại
              </button>
              <button
                type="button"
                onClick={() => {
                  setStartWarningStep(0);
                  call("game:start");
                }}
                className="py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-black text-sm shadow-xl shadow-red-600/40 transition cursor-pointer"
              >
                🚀 XÁC NHẬN BẮT ĐẦU
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

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

  // Real-time local countdown interval for button cooldowns
  const [, setCdTick] = useState(0);
  useEffect(() => {
    if (!state.khoiDong?.startCooldownUntil) return;
    const interval = setInterval(() => {
      setCdTick((c) => c + 1);
    }, 200);
    return () => clearInterval(interval);
  }, [state.khoiDong?.startCooldownUntil]);

  return (
    <div className="space-y-2">
      {/* Row 1: Segment & Contestant Selectors */}
      <div className="flex items-center justify-between gap-1.5 flex-wrap bg-black/30 p-1.5 rounded-xl border border-white/5">
        {/* Toggle Lượt Riêng / Lượt Chung - CHỈ HIỂN THỊ Ở O24, O25, O26, O27 */}
        {["O24", "O25", "O26", "O27"].includes(state.rulesetId) && (
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

        {/* Contestant TS1..TSN Buttons */}
        <div className="flex items-center gap-1 flex-wrap">
          {state.seats.map((_, sId) => {
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

        {/* Question Counter Badge & Subject Toggle */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="px-2.5 py-1 rounded-lg bg-sky-500/20 text-sky-300 font-bold border border-sky-400/30 text-xs">
            {(() => {
              const isUnlimited = (seg?.questions ?? 0) >= 50 || Boolean(seg?.globalMs && (seg?.questions ?? 0) >= 30);
              const qNum = kd.questionRevealed ? Math.max(1, kd.qIdx + 1) : 0;
              return `Câu ${qNum}${isUnlimited ? "" : `/${seg?.questions ?? 6}`}`;
            })()}
          </span>

          <button
            type="button"
            onClick={() => call("kd:toggleSubject")}
            title="Bật/tắt hiển thị lĩnh vực câu hỏi trên màn hình đồ hoạ phát sóng"
            className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition cursor-pointer flex items-center gap-1.5 ${
              kd.showSubject
                ? "bg-amber-400 text-slate-950 border-amber-300 shadow-md font-black"
                : "bg-white/5 border-white/10 text-slate-400 hover:text-slate-200 hover:bg-white/10"
            }`}
          >
            <span>📚 Lĩnh vực:</span>
            <span>{kd.showSubject ? "HIỆN" : "ẨN"}</span>
          </button>
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
        const isKdInGameDisabled = !kd.started || !kd.questionRevealed;

        return (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5">
            {/* ▶ BẮT ĐẦU */}
            {(() => {
              const seg = kd.segments[kd.segIdx];
              const isLocked = kd.started && kd.phase !== "segmentDone" && kd.phase !== "intro";
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
                disabled={!kd.started || inCooldown}
                className={`py-2.5 rounded-xl text-xs font-black shadow-lg flex items-center justify-center gap-1.5 uppercase tracking-wider transition ${
                  !kd.started
                    ? "bg-slate-800 text-slate-500 cursor-not-allowed border border-white/5 opacity-40 pointer-events-none"
                    : inCooldown
                    ? "bg-gradient-to-r from-sky-500 to-teal-400 text-slate-950 opacity-50 cursor-not-allowed"
                    : "bg-gradient-to-r from-sky-500 to-teal-400 hover:from-sky-400 hover:to-teal-300 text-slate-950 shadow-sky-500/20 cursor-pointer"
                }`}
              >
                <span>{inCooldown ? `CÂU TIẾP (${cdSec}s)` : (!kd.questionRevealed ? "CÂU TIẾP (MỞ CÂU 1)" : "CÂU TIẾP (N)")}</span>
                <span>⏭</span>
              </button>
            )}

            {/* ⏱ TÍNH GIỜ (Space) */}
            <button
              type="button"
              onClick={() => call("kd:timer")}
              disabled={isKdInGameDisabled}
              className={`py-2.5 rounded-xl text-xs font-black shadow-lg flex items-center justify-center gap-1.5 uppercase tracking-wider transition ${
                isKdInGameDisabled
                  ? "bg-purple-950/40 text-purple-600/40 border border-purple-900/20 cursor-not-allowed pointer-events-none opacity-40"
                  : "bg-purple-700 hover:bg-purple-600 text-white cursor-pointer shadow-purple-600/20"
              }`}
            >
              <span>⏱</span>
              <span>TÍNH GIỜ (Space)</span>
            </button>
          </div>
        );
      })()}



      {/* Row 3: Evaluation: Đúng (Enter) | Sai (Bksp) | Ô TRỐNG */}
      {(() => {
        const seg = kd.segments[kd.segIdx];
        const isSolo = seg?.kind === "solo";
        const now = serverNow ? serverNow() : Date.now();
        const wrongUnlockRemMs = (!isSolo && kd.buzzedSeat == null && kd.noBuzzWrongUnlockAt)
          ? Math.max(0, kd.noBuzzWrongUnlockAt - now)
          : 0;
        const isWrongLocked = wrongUnlockRemMs > 0;
        const isWrongDisabled = !kd.started || !kd.questionRevealed || isWrongLocked;

        return (
          <div className="grid grid-cols-3 gap-1.5">
            <button
              type="button"
              onClick={() => call("kd:correct")}
              disabled={!kd.started || !kd.questionRevealed}
              className={`py-2 rounded-xl text-xs font-black shadow flex items-center justify-center gap-1 transition ${
                !kd.started || !kd.questionRevealed
                  ? "bg-emerald-950/40 text-emerald-600/40 border border-emerald-900/20 cursor-not-allowed pointer-events-none opacity-40"
                  : "bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer"
              }`}
            >
              <span>✔</span>
              <span>ĐÚNG (Enter) [+10đ]</span>
            </button>
            <button
              type="button"
              onClick={() => call("kd:wrong")}
              disabled={isWrongDisabled}
              title={isWrongLocked ? `Khóa chấm sai trong ${(wrongUnlockRemMs / 1000).toFixed(1)}s đầu khi chưa có thí sinh bấm chuông` : "Chấm sai cho thí sinh"}
              className={`py-2 rounded-xl text-xs font-black shadow flex items-center justify-center gap-1 transition ${
                isWrongDisabled
                  ? "bg-rose-950/40 text-rose-600/40 border border-rose-900/20 cursor-not-allowed pointer-events-none opacity-40"
                  : "bg-rose-600 hover:bg-rose-500 text-white cursor-pointer"
              }`}
            >
              <span>✘</span>
              <span>SAI (Bksp)</span>
              {isWrongLocked && (
                <span className="text-[10px] px-1 py-0.2 rounded bg-black/40 text-amber-300 font-mono font-bold animate-pulse">
                  {(wrongUnlockRemMs / 1000).toFixed(1)}s
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => call("kd:blank")}
              disabled={!kd.started || !kd.questionRevealed}
              className={`py-2 rounded-xl text-xs font-bold shadow flex items-center justify-center gap-1 transition ${
                !kd.started || !kd.questionRevealed
                  ? "bg-slate-900/40 text-slate-600 border border-white/5 cursor-not-allowed pointer-events-none opacity-40"
                  : "bg-slate-700 hover:bg-slate-600 text-slate-200 cursor-pointer"
              }`}
            >
              <span>■</span>
              <span>Ô TRỐNG</span>
            </button>
          </div>
        );
      })()}

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
  const [selectedCnvSeat, setSelectedCnvSeat] = useState<number | null>(v.bells?.[0]?.seat ?? null);
  const [showClearBellsModal, setShowClearBellsModal] = useState(false);

  // Strictly sync selectedCnvSeat with active v.bells: only contestants with an active CNV bell can be selected
  useEffect(() => {
    if (!v.bells || v.bells.length === 0) {
      setSelectedCnvSeat(null);
    } else if (selectedCnvSeat == null || !v.bells.some((b) => b.seat === selectedCnvSeat)) {
      setSelectedCnvSeat(v.bells[0].seat);
    }
  }, [v.bells, selectedCnvSeat]);

  const activeCnvSeat =
    selectedCnvSeat != null && v.bells?.some((b) => b.seat === selectedCnvSeat)
      ? selectedCnvSeat
      : (v.bells?.[0]?.seat ?? null);

  const activeSeatObj = activeCnvSeat != null ? state.seats[activeCnvSeat] : null;
  const activeSeatName = activeSeatObj ? (activeSeatObj.name || `Thí sinh ${activeCnvSeat + 1}`) : "";

  const kwLen = v.keywordLength ?? (v.keyword ? v.keyword.replace(/\s+/g, "").length : 0);

  return (
    <div className="space-y-2.5">
      {/* Banner status: Phase & Số lượng chữ cái */}
      <div className="flex items-center justify-between text-xs text-slate-300 px-1 border-b border-white/10 pb-1.5 flex-wrap gap-2">
        <span>
          Phase:{" "}
          <b className="text-cyan-300">
            {v.phase === "grid" ? "Lưới từ khóa" : v.phase === "question" ? "Câu hỏi hàng ngang" : "Lật đáp án"}
          </b>
          {" · "}Hàng chọn:{" "}
          <b className="text-yellow-300">
            {v.currentRow >= 0 ? (v.currentRow === 4 ? "Trung tâm" : `Hàng ${v.currentRow + 1}`) : "—"}
          </b>
        </span>
        <span className="text-amber-300 font-bold">
          Từ khóa CNV: <b className="text-white">{v.keyword || "—"}</b> ({kwLen} chữ cái)
        </span>
      </div>

      {/* LIVE CONTESTANT ANSWERS & PER-SEAT VCNV LOCK MONITOR */}
      <div className="rounded-xl bg-black/45 border border-cyan-500/30 p-2 space-y-1.5">
        <div className="flex items-center justify-between text-[11px]">
          <span className="font-black text-cyan-300 uppercase tracking-wider flex items-center gap-1.5">
            <span>📋</span>
            <span>ĐÁP ÁN HÀNG NGANG TRỰC TIẾP & QUYỀN CHƠI VCNV</span>
          </span>
          {v.eliminatedSeats.length > 0 && (
            <button
              type="button"
              onClick={() => call("vcnv:unlockAllSeats")}
              className="px-2 py-0.5 rounded bg-emerald-600/30 hover:bg-emerald-600/50 border border-emerald-400/50 text-emerald-200 font-bold text-[10px] cursor-pointer"
              title="Mở khóa quyền chơi VCNV cho tất cả thí sinh"
            >
              🔓 Mở khóa tất cả ({v.eliminatedSeats.length} đang khóa)
            </button>
          )}
        </div>
        <div className="flex flex-col gap-1.5">
          {seats.map((s) => {
            const ans = v.answers?.[s.id];
            const isLocked = v.eliminatedSeats.includes(s.id);
            const bellIdx = v.bells?.findIndex((b) => b.seat === s.id) ?? -1;
            const hasBell = bellIdx >= 0;

            return (
              <div
                key={s.id}
                className={`rounded-lg px-2.5 py-1.5 border flex items-center justify-between gap-2 transition ${
                  hasBell
                    ? "bg-amber-950/60 border-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.3)]"
                    : isLocked
                    ? "bg-rose-950/35 border-rose-500/40"
                    : "bg-slate-900/90 border-white/10"
                }`}
              >
                {/* Contestant Badge & Name */}
                <div className="w-32 sm:w-44 shrink-0 flex items-center gap-1.5 min-w-0">
                  <span className="px-1.5 py-0.5 rounded bg-cyan-500/20 border border-cyan-400/35 text-cyan-200 font-mono font-black text-[10px] shrink-0">
                    TS{s.id + 1}
                  </span>
                  <span
                    className="font-bold text-xs text-slate-100 truncate"
                    title={s.name || `Ghế ${s.id + 1}`}
                  >
                    {s.name || `Ghế ${s.id + 1}`}
                  </span>
                </div>

                {/* Live Typed Answer + Previous History + Time */}
                <div className="flex-1 min-w-0 rounded-md bg-black/55 border border-white/10 px-2.5 py-1 min-h-[30px] flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0 flex-wrap">
                    {ans?.text ? (
                      <span
                        className="font-black text-xs sm:text-[13px] text-amber-300 uppercase tracking-wide break-words select-text"
                        title={ans.text}
                      >
                        {ans.text}
                      </span>
                    ) : (
                      <span className="text-[11px] text-slate-500 italic">Chưa gửi đáp án</span>
                    )}
                    {ans?.previousText && (
                      <span className="text-[10px] text-slate-400 truncate">
                        (Trước đó: {ans.previousText} · {((ans.previousMs || 0) / 1000).toFixed(2)}s)
                      </span>
                    )}
                  </div>
                  {ans?.text && (
                    <span className="px-1.5 py-0.5 rounded bg-cyan-950/80 border border-cyan-500/30 text-[10px] font-mono font-bold text-cyan-300 shrink-0 whitespace-nowrap">
                      {((ans.ms ?? 0) / 1000).toFixed(2)}s
                    </span>
                  )}
                </div>

                {/* CNV Bell Status Pill */}
                {hasBell && (
                  <div className="px-2 py-0.5 rounded-md text-[10px] font-black text-amber-200 bg-amber-500/25 border border-amber-400/50 shrink-0 whitespace-nowrap flex items-center gap-1">
                    <span>🔔 Chuông CNV #{bellIdx + 1}</span>
                    <span className="hidden xl:inline text-amber-300/90">(Đã tự dừng)</span>
                  </div>
                )}

                {/* Lock / Unlock Action */}
                <button
                  type="button"
                  onClick={() => call("vcnv:toggleLockSeat", { seat: s.id })}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-black border cursor-pointer shrink-0 whitespace-nowrap transition ${
                    isLocked
                      ? "bg-rose-600 hover:bg-emerald-600 text-white border-rose-300 shadow-sm"
                      : "bg-emerald-950/80 hover:bg-rose-900/60 text-emerald-300 border-emerald-500/40"
                  }`}
                  title={isLocked ? "Nhấn để MỞ LẠI quyền chơi VCNV cho thí sinh này" : "Nhấn để khóa quyền chơi VCNV"}
                >
                  {isLocked ? "🔒 Mở lại" : "🟢 Đang chơi"}
                </button>
              </div>
            );
          })}
        </div>
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
          {[0, 1, 2, 3].map((rIdx) => {
            const lc = v.rows[rIdx]?.letterCount || v.rows[rIdx]?.answer?.length || "?";
            return (
              <button
                key={rIdx}
                type="button"
                onClick={() => call("vcnv:selectRow", { row: rIdx })}
                className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-bold border transition flex items-center justify-between cursor-pointer ${
                  v.currentRow === rIdx
                    ? "bg-yellow-400/20 border-yellow-400 text-yellow-200"
                    : v.rows[rIdx]?.opened
                    ? "bg-white/5 border-white/10 text-slate-500"
                    : "bg-white/5 border-white/10 text-slate-300 hover:bg-white/10"
                }`}
              >
                <span>
                  Hàng {rIdx + 1} ({lc} ký tự) {v.rows[rIdx]?.opened ? "✓" : ""}
                </span>
                <span className="text-[10px] text-amber-300/80 truncate max-w-[90px]">{v.rows[rIdx]?.answer}</span>
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => call("vcnv:selectRow", { row: 4 })}
            className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-bold border transition cursor-pointer ${
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
            onClick={() => {
              const timer = state.vcnv?.timer;
              const isRunning = Boolean(
                timer &&
                timer.startedAt != null &&
                Date.now() - timer.startedAt < timer.remainingMs
              );
              if (isRunning) {
                if (window.confirm("Thời gian 15s đang chạy! Bạn có chắc chắn muốn đếm lại từ đầu?")) {
                  call("vcnv:timer");
                }
              } else {
                call("vcnv:timer");
              }
            }}
            className="w-full py-2 rounded-xl bg-purple-700 hover:bg-purple-600 text-white text-xs font-black shadow cursor-pointer uppercase tracking-wider"
          >
            ⏳ Đếm 15s (Space)
          </button>

          <div className="grid grid-cols-4 gap-1">
            <button
              type="button"
              onClick={() => call("vcnv:waitingAnswer")}
              className="py-1 rounded bg-white/10 hover:bg-white/15 text-[11px] font-bold text-slate-300 cursor-pointer"
            >
              Nền chờ ĐA
            </button>
            <button
              type="button"
              onClick={() => call("vcnv:reveal")}
              className="py-1 rounded bg-cyan-600 hover:bg-cyan-500 text-[11px] font-black text-white cursor-pointer"
            >
              👁 Hiện ĐA (R)
            </button>
            <button
              type="button"
              onClick={() => call("vcnv:revealCorrect")}
              className={`py-1 rounded text-[11px] font-black cursor-pointer ${
                state.vcnv?.revealedCorrectAnswer
                  ? "bg-emerald-600 text-white"
                  : "bg-amber-600 hover:bg-amber-500 text-white"
              }`}
            >
              ⭐ {state.vcnv?.revealedCorrectAnswer ? "Đã hiện" : "Hiện Đ/A đúng"}
            </button>
            <button
              type="button"
              onClick={() => call("vcnv:hideAnswer")}
              className="py-1 rounded bg-white/5 hover:bg-white/10 text-[11px] text-slate-400 cursor-pointer"
            >
              ○ Ẩn
            </button>
          </div>

          <div className="grid grid-cols-3 gap-1">
            <button
              type="button"
              onClick={() => call("vcnv:correct")}
              className="py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-[11px] font-black text-white cursor-pointer"
            >
              ✔ Cộng điểm HN
            </button>
            <button
              type="button"
              onClick={() => call("vcnv:wrong")}
              className="py-1.5 rounded bg-rose-600 hover:bg-rose-500 text-[11px] font-black text-white cursor-pointer"
            >
              ✘ Sai / Không ĐA
            </button>
            <button
              type="button"
              onClick={() => call("vcnv:blank")}
              className="py-1.5 rounded bg-slate-700 hover:bg-slate-600 text-[11px] font-bold text-slate-300 cursor-pointer"
            >
              ■ Ô TRỐNG
            </button>
          </div>

          <div className="grid grid-cols-2 gap-1.5 pt-1 border-t border-white/10">
            <button
              type="button"
              onClick={() => call("vcnv:revealTile")}
              className="py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold cursor-pointer"
            >
              🧩 Lật mở miếng ghép
            </button>
            <button
              type="button"
              onClick={() => call("vcnv:revealRowText")}
              className="py-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold cursor-pointer"
            >
              Tiết lộ đáp án HN
            </button>
          </div>
        </div>

        {/* Right: Chướng Ngại Vật bell & CNV grading */}
        <div className="space-y-2 border-l border-white/10 pl-2.5">
          <div className="rounded-lg bg-amber-500/15 border border-amber-400/40 px-2.5 py-1.5 text-[11px] text-amber-200 font-bold">
            🔔 Thí sinh bấm chuông CNV sẽ <b>tự động dừng phần chơi VCNV</b> ngay trên máy thí sinh. Nếu bấm nhầm, nhấn <b>🔓 Mở lại</b> ở bảng trên!
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[11px] text-slate-400 font-bold">
              <span>Tín hiệu bấm chuông CNV (Thứ tự trước - sau):</span>
              <span className="text-amber-300 font-mono text-[10px]">
                {v.bells?.length || 0} tín hiệu
              </span>
            </div>

            {v.bells && v.bells.length > 0 ? (
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-0.5">
                {v.bells.map((b, idx) => {
                  const s = state.seats[b.seat];
                  const isSelected = activeCnvSeat === b.seat;
                  const isAfterWrong = Boolean(
                    (v as any).lastJudgedWrongAt && b.atMs && b.atMs > (v as any).lastJudgedWrongAt
                  );
                  const wasJudgedWrong = Boolean((b as any).judgedWrong);
                  const timeStr = b.atMs ? `${((b.atMs % 60000) / 1000).toFixed(2)}s` : `${idx + 1}`;

                  return (
                    <div
                      key={`${b.seat}-${idx}`}
                      onClick={() => setSelectedCnvSeat(b.seat)}
                      className={`flex items-center justify-between p-2 rounded-lg border cursor-pointer transition select-none ${
                        isSelected
                          ? "bg-amber-500/35 border-amber-300 text-amber-100 ring-2 ring-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.4)]"
                          : "bg-slate-900/80 border-white/10 hover:bg-slate-800 text-slate-200"
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-300 font-black text-xs flex items-center justify-center shrink-0">
                          #{idx + 1}
                        </span>
                        <div className="flex flex-col min-w-0">
                          <span className="font-black text-xs break-words">
                            TS{b.seat + 1} · {s?.name || `Ghế ${b.seat + 1}`}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            Chuông: {timeStr}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {wasJudgedWrong && (
                          <span className="px-1.5 py-0.5 rounded bg-rose-500/20 border border-rose-500/40 text-rose-300 font-bold text-[10px]">
                            Đã chấm Sai
                          </span>
                        )}
                        {isAfterWrong && (
                          <span className="px-1.5 py-0.5 rounded bg-amber-500/20 border border-amber-400/50 text-amber-200 font-bold text-[10px] animate-pulse">
                            ⚠️ Bấm sau
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (window.confirm(`Bạn có chắc muốn tắt riêng tín hiệu chuông và LOẠI quyền chơi VCNV của ${s?.name || `TS${b.seat + 1}`}?`)) {
                              call("vcnv:dismissBell", { seat: b.seat });
                            }
                          }}
                          className="px-1.5 py-0.5 rounded bg-white/10 hover:bg-rose-600 text-slate-300 hover:text-white text-[10px] font-bold"
                          title="Tắt riêng tín hiệu này và loại TS này"
                        >
                          ✕ Tắt
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-2.5 rounded-lg bg-white/5 border border-white/10 text-slate-500 text-xs italic text-center">
                Chưa có thí sinh nào bấm chuông CNV
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-1.5 pt-1">
            <button
              type="button"
              disabled={activeCnvSeat == null}
              onClick={() => {
                if (activeCnvSeat != null) call("vcnv:correctCNV", { seat: activeCnvSeat });
              }}
              className={`py-2 px-1 rounded-lg text-white text-xs font-black shadow transition ${
                activeCnvSeat != null
                  ? "bg-emerald-600 hover:bg-emerald-500 cursor-pointer"
                  : "bg-emerald-950/40 text-slate-500 border border-white/10 opacity-50 cursor-not-allowed"
              }`}
              title="Cộng điểm CNV cho đội đang chọn và mở toàn bộ Chướng ngại vật"
            >
              ✔ Chấm ĐÚNG: {activeSeatName || "TS"} (+Điểm)
            </button>
            <button
              type="button"
              disabled={!v.bells || v.bells.length === 0}
              onClick={() => {
                call("vcnv:wrongCNV", activeCnvSeat != null ? { seat: activeCnvSeat } : {});
              }}
              className={`py-2 px-1 rounded-lg text-white text-xs font-black shadow transition ${
                v.bells && v.bells.length > 0
                  ? "bg-rose-600 hover:bg-rose-500 cursor-pointer"
                  : "bg-rose-950/40 text-slate-500 border border-white/10 opacity-50 cursor-not-allowed"
              }`}
              title="Phát âm thanh trả lời sai CNV (không tự tắt chuông các đội còn lại)"
            >
              ✘ Chấm SAI (Phát âm): {activeSeatName || "TS"}
            </button>
          </div>

          {(() => {
            const hasJudged = Boolean(v.lastJudgedWrongAt || v.bells?.some((b) => b.judgedWrong));
            const hasUnjudgedAfterWrong = Boolean(
              v.lastJudgedWrongAt && v.bells?.some((b) => b.atMs && b.atMs > (v.lastJudgedWrongAt || 0) && !b.judgedWrong)
            );

            return (
              <>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    disabled={!v.bells || v.bells.length === 0}
                    onClick={() => setShowClearBellsModal(true)}
                    className={`py-1.5 rounded-lg text-xs font-bold transition ${
                      v.bells && v.bells.length > 0
                        ? "bg-rose-900/40 hover:bg-rose-800/60 text-rose-200 border border-rose-500/40 cursor-pointer"
                        : "bg-white/5 text-slate-600 opacity-50 cursor-not-allowed"
                    }`}
                    title={hasJudged ? "Tắt tín hiệu chuông và chốt loại quyền chơi VCNV" : "Chưa thể tắt: Chưa chốt Đúng hay Sai cho thí sinh có chuông!"}
                  >
                    🔕 Tắt tín hiệu chuông ({v.bells?.length || 0})
                  </button>
                  <button
                    type="button"
                    onClick={() => call("vcnv:revealAll")}
                    className="py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-slate-300 text-xs font-bold border border-white/10 cursor-pointer"
                  >
                    Mở Toàn Bộ CNV
                  </button>
                </div>

                {/* Modal Cảnh báo Tắt Tín Hiệu Chuông VCNV */}
                {showClearBellsModal && (
                  <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <div className="w-full max-w-md rounded-2xl bg-[#0b1528] border-2 border-rose-500/80 shadow-[0_0_30px_rgba(244,63,94,0.4)] p-5 space-y-4 text-white animate-fade-in">
                      <div className="flex items-center gap-3 text-rose-400">
                        <span className="text-3xl">⚠️</span>
                        <h3 className="text-lg font-black uppercase tracking-wide">CẢNH BÁO TẮT TÍN HIỆU CHUÔNG</h3>
                      </div>
                      <p className="text-sm text-slate-300 leading-relaxed">
                        Hành động này sẽ <b>TẮT toàn bộ tín hiệu chuông</b> và <b>CHÍNH THỨC LOẠI quyền chơi VCNV</b> của các thí sinh sau:
                      </p>
                      <div className="rounded-lg bg-black/50 border border-white/10 p-3 space-y-1.5 max-h-48 overflow-y-auto">
                        {v.bells?.map((b, idx) => {
                          const s = state.seats[b.seat];
                          const isAfterWrong = Boolean(
                            v.lastJudgedWrongAt && b.atMs && b.atMs > v.lastJudgedWrongAt
                          );
                          return (
                            <div key={b.seat} className="flex items-center justify-between text-xs py-1 border-b border-white/5">
                              <span className="font-bold text-amber-200">
                                #{idx + 1}: TS{b.seat + 1} - {s?.name || `Ghế ${b.seat + 1}`}
                              </span>
                              {isAfterWrong ? (
                                <span className="text-[10px] text-rose-400 font-bold bg-rose-500/20 px-1.5 py-0.5 rounded">
                                  ⚠️ Bấm sau lần Sai!
                                </span>
                              ) : (
                                <span className="text-[10px] text-slate-400">Sẽ bị loại</span>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {!hasJudged && (
                        <div className="rounded-lg bg-amber-500/20 border border-amber-400/50 p-3 text-amber-200 text-xs font-bold leading-relaxed">
                          ⛔ <b>CHƯA THỂ TẮT CHUÔNG:</b> Bạn chưa chốt Đúng hay Sai cho bất kỳ thí sinh nào có chuông. Vui lòng bấm <b>✘ Chấm SAI</b> (hoặc ✔ Chấm ĐÚNG) trước khi tắt chuông!
                        </div>
                      )}

                      {hasJudged && hasUnjudgedAfterWrong && (
                        <div className="rounded-lg bg-rose-500/25 border border-rose-400/60 p-3 text-rose-200 text-xs font-bold leading-relaxed animate-pulse">
                          ⚠️ <b>CẢNH BÁO TẮT NHẦM:</b> Có thí sinh bấm chuông SAU thời điểm bạn vừa nhấn Chấm Sai gần nhất. Vui lòng kiểm tra kỹ trước khi xác nhận loại!
                        </div>
                      )}

                      <div className="text-xs text-amber-300/90 font-medium bg-amber-500/10 border border-amber-500/20 rounded p-2.5">
                        💡 MC/Host chỉ tắt tín hiệu chuông sau khi các thí sinh bấm chuông đã trả lời sai và bạn muốn tiếp tục lật mở các hàng ngang khác.
                      </div>
                      <div className="flex items-center justify-end gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => setShowClearBellsModal(false)}
                          className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-slate-200 text-xs font-bold cursor-pointer"
                        >
                          Hủy bỏ
                        </button>
                        <button
                          type="button"
                          disabled={!hasJudged}
                          onClick={() => {
                            call("vcnv:clearBells", { force: true });
                            setShowClearBellsModal(false);
                          }}
                          className={`px-4 py-2 rounded-lg text-xs font-black shadow transition ${
                            hasJudged
                              ? "bg-rose-600 hover:bg-rose-500 text-white cursor-pointer"
                              : "bg-rose-950/40 text-slate-500 border border-white/10 opacity-50 cursor-not-allowed"
                          }`}
                        >
                          Xác nhận Tắt & Loại thí sinh
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </>
            );
          })()}
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
  const seats = activeSeats(state);
  const [extraCorrectSeats, setExtraCorrectSeats] = useState<Record<number, boolean>>({});

  useEffect(() => {
    setExtraCorrectSeats({});
  }, [tt.qIdx]);

  const isExactMatch = (ans: string | undefined): boolean => {
    if (!ans || !tt.correctAnswer) return false;
    const normUser = normalizeAnswer(ans);
    const userNoSpace = normUser.replace(/\s+/g, "");
    const userNoHyphen = normUser.replace(/[-]/g, "");
    const targetCandidates = new Set<string>();
    tt.correctAnswer
      .split(/[/|()]/)
      .map((s) => normalizeAnswer(s))
      .filter(Boolean)
      .forEach((s) => {
        targetCandidates.add(s);
        targetCandidates.add(s.replace(/\s+/g, ""));
        targetCandidates.add(s.replace(/[-]/g, ""));
      });
    return (
      targetCandidates.has(normUser) ||
      targetCandidates.has(userNoSpace) ||
      targetCandidates.has(userNoHyphen)
    );
  };

  return (
    <div className="space-y-2.5">
      {/* LIVE CONTESTANT SUBMISSIONS MONITOR */}
      <div className="rounded-xl bg-black/45 border border-cyan-500/30 p-2 space-y-1.5">
        <div className="flex items-center justify-between text-[11px]">
          <span className="font-black text-cyan-300 uppercase tracking-wider flex items-center gap-1.5">
            <span>⚡</span>
            <span>ĐÁP ÁN & THỜI GIAN TĂNG TỐC TRỰC TIẾP CỦA THÍ SINH</span>
          </span>
          <span className="text-slate-400 text-[10px]">
            Đã gửi: {Object.keys(tt.submissions || {}).length}/{seats.length} thí sinh
          </span>
        </div>
        <div className="flex flex-col gap-1.5">
          {seats.map((s) => {
            const sub = tt.submissions?.[s.id];
            const rankEntry = tt.ranking?.find((r) => r.seat === s.id);
            const exact = isExactMatch(sub?.answer);
            const isChecked = exact || Boolean(extraCorrectSeats[s.id]);

            return (
              <div
                key={s.id}
                className={`rounded-lg px-2.5 py-1.5 border flex items-center justify-between gap-2 transition ${
                  (rankEntry?.points ?? 0) > 0
                    ? "bg-emerald-950/60 border-emerald-400"
                    : rankEntry && (rankEntry.points ?? 0) === 0 && tt.phase === "graded"
                    ? "bg-rose-950/40 border-rose-500/40"
                    : sub?.answer
                    ? "bg-slate-900 border-cyan-500/40"
                    : "bg-slate-900/70 border-white/10"
                }`}
              >
                {/* Contestant Checkbox & Badge & Name */}
                <div className="w-40 sm:w-56 shrink-0 flex items-center gap-2 min-w-0">
                  {sub?.answer ? (
                    <label
                      className="flex items-center gap-1 cursor-pointer"
                      title={
                        exact
                          ? "Khớp hoàn toàn đáp án đề bài (Khóa)"
                          : "Đánh dấu chấm đúng cho thí sinh này"
                      }
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        disabled={exact || tt.phase === "graded"}
                        onChange={(e) =>
                          setExtraCorrectSeats((prev) => ({
                            ...prev,
                            [s.id]: e.target.checked,
                          }))
                        }
                        className="w-4 h-4 rounded text-emerald-500 bg-slate-900 border-white/20 focus:ring-emerald-400 cursor-pointer disabled:cursor-not-allowed"
                      />
                      {exact ? (
                        <span className="text-[10px] text-emerald-400 font-bold" title="Khớp đề (Khóa)">
                          🔒
                        </span>
                      ) : null}
                    </label>
                  ) : null}
                  <span className="px-1.5 py-0.5 rounded bg-cyan-500/20 border border-cyan-400/35 text-cyan-200 font-mono font-black text-[10px] shrink-0">
                    TS{s.id + 1}
                  </span>
                  <span
                    className="font-bold text-xs text-slate-100 truncate"
                    title={s.name || `Ghế ${s.id + 1}`}
                  >
                    {s.name || `Ghế ${s.id + 1}`}
                  </span>
                </div>

                {/* Live Answer + Edited History */}
                <div className="flex-1 min-w-0 rounded-md bg-black/55 border border-white/10 px-2.5 py-1 min-h-[30px] flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0 flex-wrap">
                    {sub?.answer ? (
                      <span
                        className="font-black text-xs sm:text-[13px] text-white uppercase tracking-wide break-words select-text"
                        title={sub.answer}
                      >
                        {sub.answer}
                      </span>
                    ) : (
                      <span className="text-[11px] text-slate-500 italic">Chưa gửi đáp án</span>
                    )}
                    {sub?.previousAnswer && (
                      <span className="text-[10px] text-slate-400 truncate">
                        (Trước đó: {sub.previousAnswer} · {((sub.previousMs || 0) / 1000).toFixed(2)}s)
                      </span>
                    )}
                  </div>
                </div>

                {/* Submission Timestamp & Graded Points */}
                <div className="flex items-center gap-1.5 shrink-0">
                  {sub ? (
                    <span className="px-2 py-0.5 rounded-md bg-amber-500/20 border border-amber-400/40 text-amber-300 font-mono font-black text-[11px] whitespace-nowrap">
                      {(sub.ms / 1000).toFixed(2)}s
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-slate-500 font-mono text-[10px] whitespace-nowrap">
                      --
                    </span>
                  )}
                  {(rankEntry?.points ?? 0) > 0 ? (
                    <span className="px-2 py-0.5 rounded-md bg-emerald-500/25 border border-emerald-400/50 text-[11px] font-black text-emerald-300 whitespace-nowrap">
                      +{rankEntry!.points}đ
                    </span>
                  ) : rankEntry && tt.phase === "graded" ? (
                    <span className="px-2 py-0.5 rounded-md bg-rose-500/20 border border-rose-400/40 text-[10px] font-bold text-rose-300 whitespace-nowrap">
                      0đ
                    </span>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center">
        {/* Left: Danh Sách Câu 1..4 (BẢNG ÁN) */}
        <div className="space-y-1.5">
          <div className="text-xs font-bold text-slate-400 uppercase">BẢNG ÁN / CÂU HỎI</div>
          {[0, 1, 2, 3].map((idx) => {
            const isCur = tt.qIdx === idx;
            const label = idx === 3 ? "Câu 4 (Video/Ảnh)" : `Câu ${idx + 1}`;
            return (
              <button
                key={idx}
                type="button"
                onClick={() => call("tt:selectQuestion", { qIdx: idx })}
                className={`w-full text-left px-3 py-1.5 rounded-lg text-xs font-bold border transition cursor-pointer ${
                  isCur
                    ? "bg-cyan-600/30 border-cyan-400 text-cyan-200"
                    : "bg-white/5 border-white/10 text-slate-400 hover:bg-white/10"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>

        {/* Center: Controls */}
        <div className="space-y-2 flex flex-col items-center">
          <div className="w-full grid grid-cols-2 gap-1.5">
            <button
              type="button"
              onClick={() => call("tt:show")}
              className="py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-black shadow flex items-center justify-center gap-1.5 cursor-pointer uppercase tracking-wider"
              title="Hiện câu hỏi lên màn hình"
            >
              <span>▶</span>
              <span>{tt.phase === "ranking" || tt.phase === "graded" ? "Xem lại Câu Hỏi" : "Hiện Câu Hỏi"}</span>
            </button>

            <button
              type="button"
              onClick={() => call("tt:toggleAnswerImage")}
              className={`py-2 rounded-xl text-xs font-bold border shadow flex items-center justify-center gap-1.5 cursor-pointer ${
                tt.showAnswerImage
                  ? "bg-amber-400 text-slate-950 border-amber-300 font-black animate-pulse"
                  : "bg-slate-800 hover:bg-slate-700 text-amber-300 border-amber-400/40"
              }`}
              title="Chuyển đổi hiển thị giữa ảnh câu hỏi và ảnh đáp án"
            >
              <span>🖼️</span>
              <span>{tt.showAnswerImage ? "Ẩn Ảnh ĐA" : "Ảnh Đáp Án"}</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              if (
                window.confirm(
                  "Bạn có chắc chắn muốn ĐỔI CÂU DỰ PHÒNG thay thế cho câu Tăng Tốc này? (Dùng khi gặp sự cố kỹ thuật lộ đáp án)"
                )
              ) {
                call("tt:swapBackup");
              }
            }}
            className="w-full py-1.5 rounded-xl bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 text-xs font-bold border border-amber-500/40 shadow flex items-center justify-center gap-1.5 cursor-pointer"
            title="Tráo câu hỏi dự phòng khẩn cấp khi hệ thống gặp lỗi"
          >
            <span>🔄</span>
            <span>Đổi câu dự phòng (Khẩn cấp)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              const timer = state.tangToc?.timer;
              const isRunning = Boolean(
                timer &&
                timer.startedAt != null &&
                Date.now() - timer.startedAt < timer.remainingMs
              );
              if (isRunning) {
                if (window.confirm("Thời gian Tăng tốc đang chạy! Bạn có chắc chắn muốn đếm lại từ đầu?")) {
                  call("tt:timer");
                }
              } else {
                call("tt:timer");
              }
            }}
            className="w-full py-2.5 rounded-xl bg-purple-700 hover:bg-purple-600 text-white text-sm font-black shadow-lg shadow-purple-600/20 flex items-center justify-center gap-1.5 cursor-pointer uppercase tracking-wider"
          >
            <span>Bắt đầu đếm giờ (Space)</span>
          </button>

          {/* 3-Step Independent Reveal & Grade Controls */}
          <div className="w-full grid grid-cols-3 gap-1.5">
            <button
              type="button"
              onClick={() => call(tt.viewMode === "question" && (tt.phase === "ranking" || tt.phase === "graded") ? "tt:showRanking" : "tt:reveal")}
              className="py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-[11px] font-black shadow cursor-pointer flex items-center justify-center gap-1"
              title="Bước 1: Hiện bảng đáp án & thời gian xếp hạng của thí sinh"
            >
              <span>👁</span>
              <span>{tt.viewMode === "question" && (tt.phase === "ranking" || tt.phase === "graded") ? "Xem Bảng ĐA" : "Hiện ĐA TS (R)"}</span>
            </button>
            <button
              type="button"
              onClick={() => call("tt:revealCorrect")}
              className={`py-2 rounded-lg text-[11px] font-black shadow cursor-pointer flex items-center justify-center gap-1 ${
                state.tangToc?.revealedCorrectAnswer
                  ? "bg-amber-400 text-slate-950 font-black"
                  : "bg-amber-600 hover:bg-amber-500 text-white"
              }`}
              title="Bước 2: Hiện đáp án đúng của chương trình (làm tối các đáp án sai)"
            >
              <span>⭐</span>
              <span>{state.tangToc?.revealedCorrectAnswer ? "Đã hiện ĐA" : "Hiện ĐA Đúng"}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                const allCorrectSeats = seats
                  .filter((s) => {
                    const sub = tt.submissions?.[s.id];
                    return isExactMatch(sub?.answer) || Boolean(extraCorrectSeats[s.id]);
                  })
                  .map((s) => s.id);
                call("tt:grade", { correctSeats: allCorrectSeats });
              }}
              className="py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-black shadow cursor-pointer flex items-center justify-center gap-1"
              title="Bước 3: Chấm điểm tự động (+40/+30/+20/+10) cho các thí sinh được tick"
            >
              <span>✔</span>
              <span>Chấm Điểm (Enter)</span>
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

        {/* Right: Nền chờ đáp án & Ô Trống */}
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => call("tt:blank")}
            className="w-full py-2 rounded-xl bg-white/10 hover:bg-white/15 text-slate-200 text-xs font-bold border border-white/10 cursor-pointer"
          >
            Nền chờ đáp án / Ẩn (W)
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
  const rs = RULESETS[state.rulesetId]?.veDich || RULESETS.O26.veDich;
  const allowedPointOptions = isO22Q1 ? [20, 40] : rs.pointOptions;

  const [pkgQ1, setPkgQ1] = useState<number>(allowedPointOptions[0] ?? 20);
  const [pkgQ2, setPkgQ2] = useState<number>(isO22Q1 ? 40 : allowedPointOptions[0] ?? 20);
  const [pkgQ3, setPkgQ3] = useState<number>(allowedPointOptions[0] ?? 20);

  useEffect(() => {
    const opts = isO22Q1 ? [20, 40] : rs.pointOptions;
    if (!opts.includes(pkgQ1)) setPkgQ1(opts[0] ?? 20);
    if (!opts.includes(pkgQ2)) setPkgQ2(isO22Q1 ? 40 : opts[0] ?? 20);
    if (!opts.includes(pkgQ3)) setPkgQ3(opts[opts.length - 1] ?? 30);
  }, [isO22Q1, state.rulesetId, rs.pointOptions, pkgQ1, pkgQ2, pkgQ3]);

  return (
    <div className="space-y-2.5">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Left: Khởi tạo lượt thi, Lên sân khấu/Trở về, Mở chọn gói đồ họa, Xác nhận gói */}
        <div className="space-y-1.5">
          <div className="text-xs font-bold text-slate-400 uppercase">Khởi tạo lượt thi</div>
          <div className="flex items-center gap-1 flex-wrap">
            <span className="text-[10px] text-slate-400 font-bold">Thí sinh:</span>
            {vd.order.map((id) => {
              const isCur = id === vd.order[vd.turnIdx];
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => call("vd:setSeat", { seat: id })}
                  className={`px-2 py-0.5 rounded text-xs font-black border transition cursor-pointer ${
                    isCur
                      ? "bg-amber-400 text-slate-950 border-amber-300 shadow font-black"
                      : "bg-white/5 border-white/10 text-slate-300 hover:bg-white/10"
                  }`}
                  title={`Chọn ${seatName(state, id)} lên sân khấu`}
                >
                  TS{id + 1}
                </button>
              );
            })}
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            <button
              type="button"
              onClick={() => call("vd:onStage")}
              className={`py-1.5 rounded-lg text-white text-xs font-bold shadow cursor-pointer transition ${
                vd.phase === "idle" && !vd.onStage
                  ? "bg-cyan-600 hover:bg-cyan-500 font-black animate-pulse border border-cyan-300"
                  : vd.onStage
                  ? "bg-emerald-700/80 text-emerald-200 border border-emerald-500/40"
                  : "bg-cyan-600 hover:bg-cyan-500"
              }`}
            >
              {vd.onStage ? "✓ Đã lên sân khấu" : "Lên sân khấu"}
            </button>
            <button
              type="button"
              onClick={() => call("vd:finishTurn")}
              className="py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs font-bold shadow cursor-pointer"
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

          {/* Mở bảng chọn gói đồ họa: Hiển thị khi thí sinh đã lên sân khấu hoặc đang chọn gói */}
          {(vd.onStage || vd.phase === "choosing") && (
            <button
              type="button"
              onClick={() => call("vd:showPackageGraphic")}
              className={`w-full py-1.5 rounded-lg text-white text-xs font-black shadow cursor-pointer transition ${
                vd.phase === "idle" && vd.onStage
                  ? "bg-cyan-600 hover:bg-cyan-500 border border-cyan-300 animate-pulse"
                  : vd.phase === "choosing"
                  ? "bg-emerald-700/80 text-emerald-200 border border-emerald-500/40"
                  : "bg-cyan-600 hover:bg-cyan-500"
              }`}
            >
              {vd.phase === "choosing" ? "✓ Đang mở bảng chọn gói" : "🎨 Mở bảng chọn gói đồ họa"}
            </button>
          )}

          {/* Gói Câu Hỏi Dropdowns strictly filtered by ruleset pointOptions */}
          <div className="space-y-1 bg-[#162032] p-2 rounded-lg border border-white/5">
            <div className="flex items-center justify-between text-[11px] font-bold text-amber-300">
              <span>GÓI CÂU HỎI ({state.rulesetId})</span>
              <span className="text-[10px] text-amber-400 font-normal">
                Mức điểm: {allowedPointOptions.map((p) => `${p}đ`).join(" / ")}
              </span>
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
                    {allowedPointOptions.map((pt) => (
                      <option key={pt} value={pt}>
                        {pt}đ
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400">Câu 2</span>
                  <select
                    value={pkgQ2}
                    onChange={(e) => setPkgQ2(Number(e.target.value))}
                    className="w-full bg-black/40 border border-white/20 rounded p-1 text-xs text-white"
                  >
                    {allowedPointOptions.map((pt) => (
                      <option key={pt} value={pt}>
                        {pt}đ
                      </option>
                    ))}
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
                    {allowedPointOptions.map((pt) => (
                      <option key={pt} value={pt}>
                        {pt}đ
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400">Câu 2</span>
                  <select
                    value={pkgQ2}
                    onChange={(e) => setPkgQ2(Number(e.target.value))}
                    className="w-full bg-black/40 border border-white/20 rounded p-1 text-xs text-white"
                  >
                    {allowedPointOptions.map((pt) => (
                      <option key={pt} value={pt}>
                        {pt}đ
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400">Câu 3</span>
                  <select
                    value={pkgQ3}
                    onChange={(e) => setPkgQ3(Number(e.target.value))}
                    className="w-full bg-black/40 border border-white/20 rounded p-1 text-xs text-white"
                  >
                    {allowedPointOptions.map((pt) => (
                      <option key={pt} value={pt}>
                        {pt}đ
                      </option>
                    ))}
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
              className="py-2.5 rounded-xl bg-purple-700 hover:bg-purple-600 text-white text-xs font-black shadow uppercase cursor-pointer"
            >
              Tính Giờ Thi (Space)
            </button>
            <button
              type="button"
              onClick={() => call("vd:practiceTimer")}
              className="py-2.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs font-bold shadow uppercase cursor-pointer"
            >
              Tính Giờ Thực Hành
            </button>
          </div>

          <div className="w-full grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => call("vd:correct")}
              className="py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black shadow cursor-pointer uppercase tracking-wider flex items-center justify-center gap-1"
            >
              <span>✔</span>
              <span>ĐÚNG (Enter)</span>
            </button>
            <button
              type="button"
              onClick={() => call("vd:openSteal")}
              className="py-2 rounded-xl bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white text-xs font-black shadow cursor-pointer uppercase tracking-wider flex items-center justify-center gap-1"
              title="Trả lời sai & Mở quyền cướp điểm 5s cho các thí sinh còn lại (cho phép nhấn nhiều lần phòng ngừa lỗi)"
            >
              <span>✘</span>
              <span>SAI & MỞ CƯỚP 5S (Bksp)</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => call("vd:startQuestion")}
            className={`w-full py-2 rounded-xl text-white text-xs font-black shadow uppercase cursor-pointer transition ${
              vd.phase === "packageReady"
                ? "bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 animate-pulse border border-emerald-400"
                : "bg-gradient-to-r from-sky-600 to-cyan-500 hover:from-sky-500 hover:to-cyan-400"
            }`}
          >
            <span>{vd.phase === "packageReady" ? "▶ Bắt đầu Câu 1 (N)" : "Câu tiếp (N)"}</span>
            <span>⏭</span>
          </button>
        </div>

        {/* Right / Steal Controls */}
        <div className="space-y-2 flex flex-col justify-between">
          <div className="w-full">
            <button
              type="button"
              onClick={() => call("vd:closeSteal")}
              className="w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-slate-200 font-bold text-xs cursor-pointer flex items-center justify-center gap-1.5"
              title="Đóng thời gian cướp điểm và hiện đáp án"
            >
              <span>⏹</span>
              <span>Đóng Cướp / Hiện ĐA</span>
            </button>
          </div>

          {vd.steal?.buzzedSeat != null && (
            <div className="bg-yellow-400/10 border border-yellow-400/30 p-2 rounded-lg text-center space-y-1.5">
              <span className="text-xs text-yellow-300 font-bold">Thí sinh cướp điểm:</span>
              <div className="text-sm font-black text-white">{seatName(state, vd.steal.buzzedSeat)}</div>
              <div className="grid grid-cols-2 gap-1">
                <button
                  type="button"
                  onClick={() => call("vd:correctSteal")}
                  className="py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold cursor-pointer"
                >
                  ✔ Cướp Đúng
                </button>
                <button
                  type="button"
                  onClick={() => call("vd:wrongSteal")}
                  className="py-1 rounded bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold cursor-pointer"
                >
                  ✘ Cướp Sai
                </button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-1.5">
            <button
              type="button"
              onClick={() => call("vd:blank")}
              className="py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs font-bold cursor-pointer"
            >
              ■ Ô Trống
            </button>
            <button
              type="button"
              onClick={() => call("audio:stop_bgm")}
              className="py-2 rounded-xl bg-rose-600/30 hover:bg-rose-600/40 text-rose-200 text-xs font-bold border border-rose-500/30 cursor-pointer"
            >
              Dừng nhạc nền
            </button>
          </div>
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
    <div className="space-y-2">
      {cp.winner != null && (
        <div className="rounded-xl border border-emerald-400/60 bg-emerald-500/15 px-3 py-2 text-xs font-black text-emerald-200 flex flex-wrap items-center gap-x-3 gap-y-1">
          <span>🏆 Vô địch: {seats.find((s) => s.id === cp.winner)?.name || `Thí sinh ${cp.winner + 1}`}</span>
          <span className="text-emerald-300/90">✔ Đáp án: {cp.questions[cp.qIdx]?.a ?? "—"}</span>
          <span className="text-slate-400 font-medium">(chỉ hiển thị ở Host/Thí sinh, không lên màn hình)</span>
        </div>
      )}
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center">
      {/* Left: CHỌN THÍ SINH DỰ THI */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <div className="text-xs font-black text-slate-300 uppercase tracking-wider">CHỌN THÍ SINH DỰ THI</div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setSelectedSeats(seats.map((s) => s.id))}
              className="text-[10px] text-cyan-400 hover:underline cursor-pointer"
            >
              Tất cả
            </button>
            <span className="text-slate-600">|</span>
            <button
              type="button"
              onClick={() => setSelectedSeats([])}
              className="text-[10px] text-slate-400 hover:underline cursor-pointer"
            >
              Bỏ chọn
            </button>
          </div>
        </div>
        <div className="max-h-40 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
          {seats.map((s) => {
            const checked = selectedSeats.includes(s.id);
            const contestantName = s.name || `Thí sinh ${s.id + 1}`;
            return (
              <label
                key={s.id}
                className={`flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg border text-xs font-bold cursor-pointer transition select-none ${
                  checked ? "bg-sky-500/20 border-sky-400 text-sky-200 shadow-sm" : "bg-white/5 border-white/10 text-slate-400 hover:bg-white/10"
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => {
                      const next = e.target.checked
                        ? [...selectedSeats, s.id]
                        : selectedSeats.filter((x) => x !== s.id);
                      setSelectedSeats(next);
                    }}
                    className="rounded text-sky-500 focus:ring-sky-400 cursor-pointer"
                  />
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-black bg-white/10 text-slate-300 shrink-0">
                    TS{s.id + 1}
                  </span>
                  <span className="truncate text-white font-medium">
                    {contestantName}
                  </span>
                </div>
                <span className="text-amber-300 font-mono text-[11px] shrink-0 font-bold">
                  {s.score}đ
                </span>
              </label>
            );
          })}
        </div>
        <button
          type="button"
          onClick={() => call("chp:selectSeats", { seats: selectedSeats })}
          className="w-full py-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow transition cursor-pointer"
        >
          ✔ Xác nhận Thí sinh dự thi ({selectedSeats.length})
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

      {/* Right: Giới hạn Câu hỏi phụ, Mở chuông thủ công & Dừng nhạc */}
      <div className="space-y-2">
        <div className="rounded-xl border border-amber-400/30 bg-amber-950/30 p-2 space-y-1.5">
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-bold text-amber-300">Giới hạn Câu hỏi phụ</span>
            <span className="font-black text-white">
              {state.chpQuestionLimit === "unlimited" ? "♾️ Không giới hạn" : "🔒 Tối đa 3 câu"}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-1">
            <button
              type="button"
              onClick={() => call("system:setChpLimit", { limit: 3 })}
              className={`py-1 px-2 rounded-lg text-[11px] font-black border cursor-pointer transition ${
                state.chpQuestionLimit !== "unlimited"
                  ? "bg-amber-400 text-slate-950 border-amber-300 shadow"
                  : "bg-white/5 text-slate-300 border-white/10 hover:bg-white/10"
              }`}
            >
              3 câu
            </button>
            <button
              type="button"
              onClick={() => call("system:setChpLimit", { limit: "unlimited" })}
              className={`py-1 px-2 rounded-lg text-[11px] font-black border cursor-pointer transition ${
                state.chpQuestionLimit === "unlimited"
                  ? "bg-cyan-400 text-slate-950 border-cyan-300 shadow"
                  : "bg-white/5 text-slate-300 border-white/10 hover:bg-white/10"
              }`}
            >
              ∞ Không giới hạn
            </button>
          </div>
          {cp.phase === "done" && cp.winner == null && (
            <div className="text-[11px] text-amber-200 bg-black/30 rounded-lg px-2 py-1 border border-amber-400/20">
              {state.chpQuestionLimit !== "unlimited"
                ? "Đã hết 3 câu hỏi phụ mà chưa phân định thắng thua (có thể bốc thăm hoặc bật Không giới hạn để hỏi tiếp)."
                : "Đã kết thúc vòng Câu hỏi phụ."}
            </div>
          )}
        </div>
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

function isQuestionRevealedToHost(st: OlympiaState): boolean {
  if (st.stage !== "playing" || Boolean(st.introTimer) || Boolean(st.entranceState?.active) || Boolean(st.introStandby)) {
    return false;
  }
  if (st.currentRound === "khoiDong") {
    return Boolean(st.khoiDong?.started && st.khoiDong?.questionRevealed);
  }
  if (st.currentRound === "vcnv") {
    return Boolean(st.vcnv?.currentRow != null && st.vcnv.currentRow >= 0);
  }
  if (st.currentRound === "tangToc") {
    return Boolean(st.tangToc && st.tangToc.qIdx >= 0);
  }
  if (st.currentRound === "veDich") {
    return Boolean(st.veDich?.current);
  }
  if (st.currentRound === "cauHoiPhu") {
    return Boolean(st.cauHoiPhu && st.cauHoiPhu.qIdx >= 0);
  }
  return false;
}

function getQuestionText(st: OlympiaState): string {
  if (!isQuestionRevealedToHost(st)) return "";
  if (st.currentRound === "khoiDong") {
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
  if (!isQuestionRevealedToHost(st)) return "";
  if (st.currentRound === "khoiDong") {
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

function getSubjectText(st: OlympiaState): string {
  if (!isQuestionRevealedToHost(st)) return "";
  if (st.currentRound === "khoiDong") return st.khoiDong?.current?.subject || "";
  if (st.currentRound === "veDich") return st.veDich?.current?.q?.subject || "";
  return "";
}

function getExplanationText(st: OlympiaState): string {
  if (!isQuestionRevealedToHost(st)) return "";
  let exp = "";
  if (st.currentRound === "khoiDong") {
    const cur = st.khoiDong?.current as any;
    exp = cur?.explanation || cur?.hint || "";
  } else if (st.currentRound === "vcnv") {
    const curIdx = st.vcnv?.currentRow;
    if (curIdx === 4) {
      exp = (st.vcnv?.centerQuestion as any)?.explanation || (st.vcnv?.centerQuestion as any)?.hint || "";
    } else if (curIdx != null && curIdx >= 0) {
      exp = (st.vcnv?.rows[curIdx] as any)?.explanation || (st.vcnv?.rows[curIdx] as any)?.hint || "";
    }
  } else if (st.currentRound === "tangToc") {
    if (st.tangToc && st.tangToc.qIdx >= 0) {
      const q = st.tangToc.questions[st.tangToc.qIdx] as any;
      exp = q?.explanation || q?.hint || "";
    }
  } else if (st.currentRound === "veDich") {
    const cur = st.veDich?.current?.q as any;
    exp = cur?.explanation || cur?.hint || "";
  } else if (st.currentRound === "cauHoiPhu") {
    if (st.cauHoiPhu && st.cauHoiPhu.qIdx >= 0) {
      const q = st.cauHoiPhu.questions[st.cauHoiPhu.qIdx] as any;
      exp = q?.explanation || q?.hint || "";
    }
  }
  return exp.trim();
}

export function getCurrentQuestionMedia(st: OlympiaState | null): { url?: string; isVideo: boolean } | null {
  if (!st) return null;
  let url: string | undefined;
  let type: string | undefined;

  if (st.currentRound === "khoiDong" && st.khoiDong?.current) {
    url = st.khoiDong.current.media;
    type = st.khoiDong.current.mediaType;
  } else if (st.currentRound === "veDich" && st.veDich?.current?.q) {
    url = st.veDich.current.q.media;
    type = st.veDich.current.q.type;
  } else if (st.currentRound === "cauHoiPhu" && st.cauHoiPhu && st.cauHoiPhu.qIdx >= 0) {
    const q = st.cauHoiPhu.questions[st.cauHoiPhu.qIdx];
    url = q?.media;
    type = q?.mediaType;
  } else if (st.currentRound === "vcnv" && st.vcnv) {
    const r = st.vcnv.currentRow;
    if (r === 4 && st.vcnv.centerQuestion) {
      url = st.vcnv.centerQuestion.media;
      type = st.vcnv.centerQuestion.mediaType;
    } else if (r >= 0 && r < 4) {
      url = st.vcnv.rows[r]?.media;
      type = st.vcnv.rows[r]?.mediaType;
    }
  }

  if (!url) return null;
  const isVideo = type === "video" || /\.(mp4|webm|mov|ogg|m4v|ogv|mpeg)$/i.test(url);
  return { url, isVideo };
}

export default HostConsole;
