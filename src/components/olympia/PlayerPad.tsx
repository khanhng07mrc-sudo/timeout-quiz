"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { RULESETS } from "@/lib/olympia/rulesets";
import { ROUND_LABELS, type OlympiaState, type TimerState } from "@/lib/olympia/types";
import { getVcnvUnit } from "@/lib/olympia/engine";
import { useOlympiaSocket, useStableToken, prewarmBuzzerSounds } from "./hooks";
import { MediaView, SEAT_COLORS, seatName, activeSeats } from "./ui";

type Emit = (e: string, p?: unknown) => Promise<{ ok: boolean; error?: string }>;

function PlayerPadCountdown({
  timer,
  serverNow,
  isClassic,
  isSandbox,
}: {
  timer: TimerState | null | undefined;
  serverNow: () => number;
  isClassic?: boolean;
  isSandbox?: boolean;
}) {
  const barRef = useRef<HTMLDivElement>(null);

  const getSeconds = useCallback(() => {
    if (!timer) return 0;
    if (timer.startedAt == null) return Math.max(0, Math.ceil((timer.remainingMs ?? 0) / 1000));
    const ms = Math.max(0, timer.remainingMs - (serverNow() - timer.startedAt));
    return Math.max(0, Math.ceil(ms / 1000));
  }, [timer, serverNow]);

  const [seconds, setSeconds] = useState<number>(getSeconds);
  const running = timer?.startedAt != null;

  useEffect(() => {
    setSeconds(getSeconds());
    if (!running) {
      if (barRef.current) {
        const total = Math.max(1, timer?.totalMs || (timer?.remainingMs ?? 1));
        const rem = Math.max(0, timer?.remainingMs ?? 0);
        const pct = Math.max(0, Math.min(100, (rem / total) * 100));
        barRef.current.style.width = `${pct}%`;
      }
      return;
    }

    let rafId: number;
    let active = true;

    // 1Hz tick for React state to prevent layout recalculation thrash
    const intervalId = setInterval(() => {
      setSeconds(getSeconds());
    }, 1000);

    // RAF for hardware-accelerated 60fps smooth progress bar
    const tick = () => {
      if (!active) return;
      if (timer && timer.startedAt != null) {
        const total = Math.max(1, timer.totalMs || 15000);
        const elapsed = Math.max(0, serverNow() - timer.startedAt);
        const rem = Math.max(0, timer.remainingMs - elapsed);
        const pct = Math.max(0, Math.min(100, (rem / total) * 100));
        if (barRef.current) {
          barRef.current.style.width = `${pct}%`;
        }
      }
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);

    return () => {
      active = false;
      clearInterval(intervalId);
      cancelAnimationFrame(rafId);
    };
  }, [running, timer, getSeconds, serverNow]);

  const low = seconds <= 5 && seconds > 0;

  return (
    <div className={`w-full flex flex-col items-center justify-center ${isSandbox ? "py-0.5" : "py-1"}`}>
      <div
        className={`font-mono font-black tabular-nums transition-colors duration-200 rounded-lg px-3 py-0.5 border shadow-sm flex items-center gap-1.5 ${
          low
            ? "bg-red-950/80 border-red-500/80 text-red-400 animate-pulse shadow-[0_0_12px_rgba(239,68,68,0.4)]"
            : running
            ? isClassic
              ? "bg-amber-950/70 border-amber-500/70 text-amber-300 shadow-[0_0_10px_rgba(245,158,11,0.3)]"
              : "bg-indigo-950/70 border-indigo-500/70 text-indigo-300 shadow-[0_0_10px_rgba(99,102,241,0.3)]"
            : isClassic
            ? "bg-black/50 border-amber-400/20 text-amber-200/50"
            : "bg-black/50 border-white/10 text-white/50"
        } ${isSandbox ? "text-xs sm:text-sm" : "text-sm sm:text-base"}`}
      >
        <span>⏱️</span>
        <span>{seconds}s</span>
      </div>
      <div className="w-full max-w-xs h-1.5 bg-black/40 rounded-full overflow-hidden border border-white/10 mt-1">
        <div
          ref={barRef}
          className={`h-full rounded-full transition-[background-color] duration-200 will-change-[width] ${
            low
              ? "bg-gradient-to-r from-red-600 via-rose-500 to-amber-400 shadow-[0_0_8px_rgba(239,68,68,0.8)]"
              : isClassic
              ? "bg-gradient-to-r from-amber-600 via-yellow-400 to-amber-200 shadow-[0_0_6px_rgba(245,158,11,0.5)]"
              : "bg-gradient-to-r from-indigo-600 via-sky-400 to-emerald-400 shadow-[0_0_6px_rgba(56,189,248,0.5)]"
          }`}
          style={{ width: "100%" }}
        />
      </div>
    </div>
  );
}

export default function PlayerPad({
  code,
  initialSeat,
  initialName,
  isSandbox = false,
}: {
  code: string;
  initialSeat?: number;
  initialName?: string;
  isSandbox?: boolean;
}) {
  const defaultToken = useStableToken();
  const token = initialSeat !== undefined ? `sandbox_${code}_seat_${initialSeat}` : defaultToken;
  const isSandboxMode =
    isSandbox ||
    (typeof window !== "undefined" &&
      (window.location.search.includes("sandbox=1") ||
        window.location.search.includes("variant=sandbox") ||
        (token.startsWith("sandbox_") && window.self !== window.top)));
  const [selectedSeat, setSelectedSeat] = useState<number>(initialSeat ?? 0);
  const [school, setSchool] = useState<string>("");
  const [name, setName] = useState<string | null>(
    initialName || (initialSeat !== undefined ? `Thí sinh ${initialSeat + 1}` : null)
  );

  useEffect(() => {
    if (initialName || initialSeat !== undefined) return;
    setName(sessionStorage.getItem("playerName") || "");
  }, [initialName, initialSeat]);

  const [inputName, setInputName] = useState("");
  const { state, join, connected, emit, serverNow, kickedMessage } = useOlympiaSocket({
    code,
    role: "player",
    name: name ?? "",
    token,
    seatId: initialSeat !== undefined ? initialSeat : selectedSeat,
    school,
    enabled: !!token,
  });

  useEffect(() => {
    prewarmBuzzerSounds(join?.audioSeason || "O26");
  }, [join?.audioSeason]);

  // Responsive ticker during Khởi Động buzzer lock countdown (optimized 200ms interval to prevent lag)
  const [, setUnlockTick] = useState(0);
  useEffect(() => {
    const unlockAt = state?.khoiDong?.buzzUnlockAt;
    if (!unlockAt) return;
    const now = serverNow();
    if (now >= unlockAt) return;

    const id = setInterval(() => {
      const curNow = serverNow();
      setUnlockTick((t) => t + 1);
      if (curNow >= unlockAt) {
        clearInterval(id);
      }
    }, 200);

    return () => {
      clearInterval(id);
    };
  }, [state?.khoiDong?.buzzUnlockAt, serverNow]);

  const lastBuzzEmitAtRef = useRef<number>(0);
  const [optimisticBuzzPending, setOptimisticBuzzPending] = useState(false);

  const triggerBuzz = useCallback(async () => {
    const nowLocal = performance.now();
    if (nowLocal - lastBuzzEmitAtRef.current < 160) return;
    lastBuzzEmitAtRef.current = nowLocal;
    setOptimisticBuzzPending(true);

    try {
      await emit("buzz");
    } finally {
      setTimeout(() => setOptimisticBuzzPending(false), 600);
    }
  }, [emit]);

  // Forward first user interaction to parent to unlock display iframe audio in sandbox mode
  useEffect(() => {
    if (typeof window === "undefined") return;
    let unlocked = false;
    const notifyParentUnlock = () => {
      if (unlocked) return;
      unlocked = true;
      try {
        if (window.parent && window.parent !== window) {
          window.parent.postMessage({ type: "UNLOCK_AUDIO" }, "*");
          if (typeof (window.parent as any).__OLYMPIA_FORWARD_UNLOCK__ === "function") {
            (window.parent as any).__OLYMPIA_FORWARD_UNLOCK__();
          }
        }
      } catch {}
    };
    window.addEventListener("pointerdown", notifyParentUnlock, { once: true, passive: true });
    window.addEventListener("keydown", notifyParentUnlock, { once: true, passive: true });
    return () => {
      window.removeEventListener("pointerdown", notifyParentUnlock);
      window.removeEventListener("keydown", notifyParentUnlock);
    };
  }, []);

  const [vcnvTab, setVcnvTab] = useState<"question" | "pieces">("question");
  useEffect(() => {
    if (state?.vcnv?.phase === "question") {
      setVcnvTab("question");
    } else if (state?.vcnv?.phase === "grid" || state?.vcnv?.phase === "done") {
      setVcnvTab("pieces");
    }
  }, [state?.vcnv?.phase]);

  const seatId = join?.seatId ?? -1;

  // Compute buzzer availability for keyboard Space shortcut (with !e.repeat anti-spam & server +180ms unlock tolerance)
  const canPressMainBuzz = useCallback((): boolean => {
    if (!state || seatId < 0) return false;
    if (state.bellTestMode) return true;
    if (state.stage !== "playing" || state.introTimer || state.introStandby || state.entranceState?.active) return false;
    const now = serverNow();

    switch (state.currentRound) {
      case "khoiDong": {
        const kd = state.khoiDong;
        if (!kd || kd.phase !== "question") return false;
        const seg = kd.segments[kd.segIdx];
        if (!seg || seg.kind === "solo") return false;
        if (kd.lockedSeats.includes(seatId) || kd.buzzedSeat != null) return false;
        if (kd.buzzUnlockAt && now < kd.buzzUnlockAt) return false;
        return kd.buzzOpen || Boolean(kd.buzzUnlockAt && now >= kd.buzzUnlockAt);
      }
      case "vcnv": {
        const v = state.vcnv;
        if (!v || v.phase === "done") return false;
        return !v.eliminatedSeats.includes(seatId) && !v.bells.some((b) => b.seat === seatId);
      }
      case "veDich": {
        const vd = state.veDich;
        if (!vd || vd.phase !== "stealing" || !vd.steal?.open) return false;
        const owner = vd.order[vd.turnIdx];
        return owner !== seatId && vd.steal.buzzedSeat == null;
      }
      case "cauHoiPhu": {
        const cp = state.cauHoiPhu;
        if (!cp || cp.phase !== "question" || !cp.buzzOpen) return false;
        return cp.tied.includes(seatId) && !cp.buzzedThisQuestion.includes(seatId) && cp.buzzedSeat == null;
      }
      default:
        return false;
    }
  }, [state, seatId, serverNow]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return; // Anti-spam guard: ignore held-down key repeats
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (e.code === "Space") {
        if (canPressMainBuzz()) {
          e.preventDefault();
          triggerBuzz();
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [canPressMainBuzz, triggerBuzz]);

  if (kickedMessage) {
    return (
      <div className="fixed inset-0 w-full h-full min-h-screen bg-gradient-to-b from-[#1a0505] via-[#2d0a0a] to-[#0a0202] text-white p-6 flex flex-col items-center justify-center gap-6 text-center select-none">
        <div className="w-20 h-20 rounded-full bg-rose-500/20 border-2 border-rose-500/50 flex items-center justify-center text-4xl shadow-xl shadow-rose-950/50">
          🚫
        </div>
        <div className="space-y-2 max-w-md">
          <h2 className="text-xl sm:text-2xl font-black text-rose-300">ĐÃ RỜI PHÒNG THI</h2>
          <p className="text-sm text-slate-300">{kickedMessage}</p>
        </div>
        <div className="flex flex-wrap gap-3 justify-center">
          <a
            href="/"
            className="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-sm border border-white/20 transition cursor-pointer"
          >
            ← Về trang chủ
          </a>
          <button
            type="button"
            onClick={() => {
              if (typeof window !== "undefined") {
                sessionStorage.removeItem("playerName");
                localStorage.removeItem("playerName");
                window.location.href = `/play?pin=${code}`;
              }
            }}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-black text-sm shadow-lg shadow-cyan-900/50 transition cursor-pointer"
          >
            🔄 Tham gia lại
          </button>
        </div>
      </div>
    );
  }

  if (!name) {
    const totalSeats = state?.seatCount || 4;
    const isClassic = state?.themeMode === "o26_classic";

    return (
      <div
        className={`fixed inset-0 w-full h-full min-h-screen text-white p-6 flex flex-col items-center justify-center select-none overflow-y-auto ${
          isClassic
            ? "bg-gradient-to-b from-[#24272c] via-[#1a1c20] to-[#101114]"
            : "bg-gradient-to-b from-[#080d24] via-[#0e173b] to-[#040714]"
        }`}
      >
        <div
          className={`w-full max-w-md rounded-3xl p-6 sm:p-8 space-y-5 shadow-2xl backdrop-blur-xl text-center my-auto transition-all ${
            isClassic
              ? "bg-gradient-to-b from-[#1c1e22] via-[#26292f] to-[#1c1e22] border-2 border-[#d4af37]/60 shadow-[0_8px_32px_rgba(0,0,0,0.8)]"
              : "bg-slate-900/95 border border-cyan-500/40"
          }`}
        >
          <div className="text-4xl">🏔️</div>
          <div className="space-y-1">
            <h2 className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-yellow-400">
              ĐƯỜNG LÊN ĐỈNH OLYMPIA
            </h2>
            <p className="text-xs text-slate-400">
              Phòng thi PIN: <b className="text-cyan-400 font-mono text-sm tracking-widest">{code}</b>
            </p>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              const trimmed = inputName.trim();
              if (trimmed) {
                sessionStorage.setItem("playerName", trimmed);
                setName(trimmed);
              }
            }}
            className="space-y-4 text-left"
          >
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">Họ và tên thí sinh:</label>
              <input
                type="text"
                autoFocus
                required
                maxLength={30}
                value={inputName}
                onChange={(e) => setInputName(e.target.value)}
                placeholder="Nhập họ và tên..."
                className={`w-full px-4 py-3 rounded-xl font-bold placeholder:text-slate-500 focus:outline-none text-sm transition-all ${
                  isClassic
                    ? "bg-[#121418] border-2 border-[#d4af37]/60 text-white placeholder:text-amber-200/40 focus:border-[#d4af37] focus:ring-2 focus:ring-[#d4af37]/30"
                    : "bg-black/60 border border-white/20 text-white focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20"
                }`}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">Trường / Đơn vị (tùy chọn):</label>
              <input
                type="text"
                maxLength={50}
                value={school}
                onChange={(e) => setSchool(e.target.value)}
                placeholder="VD: THPT Chuyên Hà Nội - Amsterdam"
                className={`w-full px-4 py-2.5 rounded-xl text-xs placeholder:text-slate-500 focus:outline-none transition-all ${
                  isClassic
                    ? "bg-[#121418] border border-[#d4af37]/40 text-white placeholder:text-amber-200/40 focus:border-[#d4af37]"
                    : "bg-black/60 border border-white/20 text-white focus:border-cyan-400"
                }`}
              />
            </div>

            {/* Visual Seat Picker */}
            <div className="space-y-2 pt-1">
              <label className="block text-xs font-bold text-slate-300">
                Chọn vị trí dự thi ({totalSeats} ghế):
              </label>
              <div className="grid grid-cols-2 gap-2.5">
                {Array.from({ length: totalSeats }).map((_, idx) => {
                  const seat = state?.seats?.[idx];
                  const isOccupied = Boolean(seat?.approved && seat?.playerKey && seat.playerKey !== token);
                  const isSelected = selectedSeat === idx;
                  const color = SEAT_COLORS[idx % SEAT_COLORS.length] || "#0284c7";

                  const seatButtonClass = isOccupied
                    ? "bg-slate-950/60 border-slate-800 opacity-50 cursor-not-allowed"
                    : isSelected
                    ? isClassic
                      ? "bg-amber-500/20 border-2 border-[#fef08a] ring-2 ring-[#d4af37]/40 shadow-lg cursor-pointer"
                      : "bg-cyan-500/20 border-cyan-400 ring-2 ring-cyan-400/40 shadow-lg cursor-pointer"
                    : isClassic
                    ? "bg-[#141619] border border-[#d4af37]/30 hover:border-[#d4af37]/60 cursor-pointer"
                    : "bg-slate-800/60 border-white/10 hover:border-white/30 cursor-pointer";

                  return (
                    <button
                      key={idx}
                      type="button"
                      disabled={isOccupied}
                      onClick={() => setSelectedSeat(idx)}
                      className={`p-3 rounded-2xl border text-left transition flex flex-col justify-between ${seatButtonClass}`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black uppercase tracking-wider" style={{ color }}>
                          Vị trí {idx + 1}
                        </span>
                        {isOccupied && <span className="text-[10px] text-slate-500 font-bold">ĐÃ CÓ NGƯỜI</span>}
                        {!isOccupied && isSelected && (
                          <span className={`text-xs ${isClassic ? "text-[#fef08a]" : "text-cyan-400"}`}>✓ Đang chọn</span>
                        )}
                      </div>
                      <div className="text-xs font-bold text-white truncate mt-1">
                        {isOccupied ? seat?.name || "Đã duyệt" : "Còn trống"}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              type="submit"
              disabled={!inputName.trim()}
              className={`w-full py-3.5 rounded-xl font-black text-sm shadow-lg disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition transform active:scale-95 ${
                isClassic
                  ? "bg-gradient-to-b from-[#d97706] via-[#b45309] to-[#78350f] border border-[#fef08a] hover:brightness-110 text-white shadow-amber-900/40"
                  : "bg-gradient-to-r from-amber-500 via-red-500 to-violet-600 hover:from-amber-400 hover:to-violet-500 text-white shadow-amber-500/30"
              }`}
            >
              🚀 ĐĂNG KÝ VỊ TRÍ & VÀO PHÒNG
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (join && !join.ok) {
    return (
      <div className="fixed inset-0 w-full h-full min-h-screen bg-gradient-to-b from-[#080d24] via-[#0e173b] to-[#040714] text-white p-6 flex flex-col items-center justify-center gap-4">
        <div className="text-rose-300 text-lg text-center font-bold">{join.error}</div>
        <div className="flex items-center gap-4 mt-2">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-sm shadow cursor-pointer transition"
          >
            🔄 Thử kết nối lại
          </button>
          <a href="/play" className="underline text-sky-300 text-sm">
            ← Quay lại
          </a>
        </div>
      </div>
    );
  }

  if (!state || join?.seatId == null) {
    return (
      <div className="fixed inset-0 w-full h-full min-h-screen bg-gradient-to-b from-[#080d24] via-[#0e173b] to-[#040714] text-sky-200 flex items-center justify-center p-8 text-lg font-bold">
        Đang kết nối…
      </div>
    );
  }

  const mySeatId = join?.seatId ?? selectedSeat;
  const me = state.seats[mySeatId];
  const isApproved =
    me?.approved === true ||
    token.startsWith("sandbox_") ||
    state.stage !== "lobby";

  // Check if player is waiting for Host approval or was rejected
  if (!isApproved) {
    const isPending =
      state.joinRequests?.some((r) => r.id === token) ||
      (me?.playerKey === token && me?.approved === false);

    if (!isPending && me?.playerKey !== token) {
      return (
        <div className="fixed inset-0 w-full h-full min-h-screen bg-gradient-to-b from-[#1a0505] via-[#2d0a0a] to-[#0a0202] text-white p-6 flex flex-col items-center justify-center gap-6 text-center select-none animate-fade-in">
          <div className="w-20 h-20 rounded-full bg-rose-500/20 border-2 border-rose-500/50 flex items-center justify-center text-4xl shadow-xl shadow-rose-950/50">
            ⚠️
          </div>
          <div className="space-y-2 max-w-md">
            <h2 className="text-xl sm:text-2xl font-black text-rose-300 uppercase">
              YÊU CẦU ĐÃ BỊ TỪ CHỐI
            </h2>
            <p className="text-sm text-slate-300">
              Host đã từ chối yêu cầu tham gia Vị trí {mySeatId + 1} của bạn. Vui lòng chọn lại vị trí khác hoặc đổi tên.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              sessionStorage.removeItem("playerName");
              setName(null);
            }}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-black text-sm shadow-lg shadow-cyan-900/50 transition cursor-pointer"
          >
            🔄 Chọn lại vị trí khác
          </button>
        </div>
      );
    }

    const isClassic = state?.themeMode === "o26_classic";

    return (
      <div
        className={`fixed inset-0 w-full h-full min-h-screen text-white p-6 flex flex-col items-center justify-center select-none animate-fade-in ${
          isClassic
            ? "bg-gradient-to-b from-[#24272c] via-[#1a1c20] to-[#101114]"
            : "bg-gradient-to-b from-[#080d24] via-[#0e173b] to-[#040714]"
        }`}
      >
        <div
          className={`w-full max-w-md rounded-3xl p-8 space-y-6 shadow-2xl backdrop-blur-xl text-center transition-all ${
            isClassic
              ? "bg-gradient-to-b from-[#1c1e22] via-[#26292f] to-[#1c1e22] border-2 border-[#d4af37]/60 shadow-[0_8px_32px_rgba(0,0,0,0.8)]"
              : "bg-slate-900/95 border border-amber-400/40"
          }`}
        >
          <div className="relative inline-flex items-center justify-center">
            <div className="w-20 h-20 rounded-full bg-amber-400/10 border-2 border-amber-400/60 flex items-center justify-center text-3xl animate-pulse">
              ⏳
            </div>
            <div className="absolute inset-0 rounded-full border border-amber-400/30 animate-ping" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-yellow-400 uppercase tracking-wide">
              ĐANG CHỜ PHÊ DUYỆT
            </h2>
            <p className="text-sm text-slate-300">
              Xin chào <b className="text-amber-300">{name}</b>!
            </p>
            <div
              className={`p-3.5 rounded-2xl text-xs sm:text-sm font-semibold ${
                isClassic
                  ? "bg-[#2a2d33] border border-[#d4af37]/40 text-amber-200 shadow"
                  : "bg-amber-500/10 border border-amber-400/30 text-amber-200"
              }`}
            >
              Bạn đã đăng ký tham gia thi đấu tại <b>Vị trí {mySeatId + 1}</b>.
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Vui lòng đợi Quản trò (Host) phê duyệt danh sách chính thức để bắt đầu cuộc thi...
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              sessionStorage.removeItem("playerName");
              setName(null);
            }}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              isClassic
                ? "bg-[#141619] hover:bg-[#202328] text-amber-200 border border-[#d4af37]/40"
                : "bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white border border-white/20"
            }`}
          >
            ← Chọn lại vị trí khác / Đổi tên
          </button>
        </div>
      </div>
    );
  }

  const seats = activeSeats(state);
  const myTestLog = state.bellTestLogs?.find((b) => b.seat === me.id);

  // Determine active timer for the top display box (support both per-question and global round timer in Khởi Động)
  const kdTimer = state.khoiDong
    ? (state.khoiDong.timer?.startedAt != null
        ? state.khoiDong.timer
        : state.khoiDong.globalTimer?.startedAt != null
        ? state.khoiDong.globalTimer
        : (state.khoiDong.globalTimer || state.khoiDong.timer))
    : null;

  const activeTimer =
    state.currentRound === "khoiDong"
      ? kdTimer
      : state.currentRound === "vcnv"
      ? state.vcnv?.timer
      : state.currentRound === "tangToc"
      ? state.tangToc?.timer
      : state.currentRound === "veDich"
      ? state.veDich?.phase === "stealing" && state.veDich.steal
        ? state.veDich.steal.timer
        : state.veDich?.timer
      : state.currentRound === "cauHoiPhu"
      ? state.cauHoiPhu?.timer
      : null;

  // Determine if current state is Solo Khởi Động (no buzzer/input required, single status line)
  const isSoloKd =
    state.stage === "playing" &&
    state.currentRound === "khoiDong" &&
    state.khoiDong?.segments[state.khoiDong.segIdx]?.kind === "solo";

  const isBuzzerRound =
    Boolean(state.bellTestMode) ||
    (state.stage === "playing" && state.currentRound === "khoiDong" && !isSoloKd && Boolean(state.khoiDong?.started)) ||
    (state.stage === "playing" && state.currentRound === "veDich" && state.veDich?.phase === "stealing") ||
    (state.stage === "playing" && state.currentRound === "cauHoiPhu" && state.cauHoiPhu?.phase === "question");

  const isClassic = state?.themeMode === "o26_classic";

  return (
    <div
      className={`fixed inset-0 w-full h-full overflow-hidden text-white ${
        isSandboxMode ? "p-1.5 gap-1" : "p-2 sm:p-3 gap-2"
      } flex flex-col justify-between select-none relative ${
        isClassic
          ? "bg-gradient-to-b from-[#24272c] via-[#1a1c20] to-[#101114]"
          : "bg-gradient-to-b from-[#070b1e] via-[#0c1433] to-[#040611]"
      }`}
    >
      {/* Subtle radial warmth / gold sheen when in Classic Mode */}
      {isClassic && (
        <div
          className="absolute inset-0 pointer-events-none opacity-40 z-0"
          style={{
            backgroundImage: "radial-gradient(ellipse at 50% 0%, rgba(212,175,55,0.15) 0%, transparent 70%)",
          }}
        />
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          TOP DISPLAY AREA (Header + 4-Contestant Score Cards + Question Box)
         ═══════════════════════════════════════════════════════════════════════ */}
      <div className={`flex-1 min-h-0 flex flex-col ${isSandboxMode ? "gap-1" : "gap-2"} overflow-hidden relative z-10`}>
        {/* 1. Round Header + Sub-status + Bell Test Mode Indicator */}
        <div
          className={`shrink-0 flex items-center justify-between gap-1.5 transition-all ${
            isSandboxMode ? "rounded-lg px-2 py-0.5" : "rounded-xl px-3 py-1.5"
          } ${
            isClassic
              ? "bg-gradient-to-r from-[#1c1e22] via-[#26292f] to-[#1c1e22] border border-[#d4af37]/60 shadow-[0_2px_8px_rgba(0,0,0,0.7)]"
              : "bg-slate-950/85 border border-white/15"
          }`}
        >
          <div className="flex items-center gap-1.5 min-w-0">
            <span
              className={`rounded-lg uppercase tracking-wider shrink-0 transition-all ${
                isSandboxMode
                  ? "px-1.5 py-0.2 text-[10px] sm:text-[11px] font-black"
                  : "px-2.5 py-0.5 text-xs sm:text-sm font-black"
              }`}
              style={{
                background: isClassic
                  ? "linear-gradient(135deg, #b8860b 0%, #854d0e 50%, #451a03 100%)"
                  : "linear-gradient(135deg, #c62828 0%, #8e0000 100%)",
                border: isClassic ? "1.5px solid #fef08a" : "1px solid rgba(255,255,255,0.25)",
                color: isClassic ? "#fef3c7" : "#ffffff",
              }}
            >
              {state.currentRound ? ROUND_LABELS[state.currentRound] : state.stage === "lobby" ? "PHÒNG CHỜ" : "KẾT THÚC"}
            </span>
            <span className={`${isSandboxMode ? "text-[11px]" : "text-xs sm:text-sm"} font-bold truncate ${isClassic ? "text-amber-200" : "text-slate-300"}`}>
              {getSubRoundLabel(state)}
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {state.bellTestMode && (
              <span
                className={`rounded-full font-black animate-pulse ${
                  isSandboxMode ? "px-1.5 py-0.2 text-[9.5px]" : "px-2.5 py-0.5 text-[11px] sm:text-xs"
                } ${
                  isClassic
                    ? "bg-amber-500/25 border border-[#d4af37] text-amber-200 shadow-[0_0_10px_rgba(212,175,55,0.4)]"
                    : "bg-amber-500/25 border border-amber-400 text-amber-300"
                }`}
              >
                🔔 {isSandboxMode ? "THỬ CHUÔNG" : `CHẾ ĐỘ THỬ CHUÔNG ${myTestLog ? `(Lượt ${myTestLog.order})` : ""}`}
              </span>
            )}
            <span className={`${isSandboxMode ? "text-[10px]" : "text-[11px] sm:text-xs"} font-bold ${isClassic ? "text-amber-300/80" : "text-slate-400"}`}>
              Ghế {me.id + 1} {connected ? "🟢" : "🔴"}
            </span>
          </div>
        </div>

        {/* 2. All Contestant Score Cards Bar: Strictly 1 Single Line for all shapes */}
        <div
          className={`shrink-0 grid ${isSandboxMode ? "gap-1" : "gap-1 sm:gap-1.5"} w-full items-center`}
          style={{
            gridTemplateColumns: `repeat(${Math.max(1, seats.length)}, minmax(0, 1fr))`,
          }}
        >
          {seats.map((s) => {
            const isMe = s.id === me.id;
            const isBuzzed =
              (state.currentRound === "khoiDong" && state.khoiDong?.buzzedSeat === s.id) ||
              (state.currentRound === "vcnv" && state.vcnv?.bells.some((b) => b.seat === s.id)) ||
              (state.currentRound === "veDich" && state.veDich?.steal?.buzzedSeat === s.id) ||
              (state.currentRound === "cauHoiPhu" && state.cauHoiPhu?.buzzedSeat === s.id);
            const isLocked =
              (state.currentRound === "khoiDong" && state.khoiDong?.lockedSeats.includes(s.id)) ||
              (state.currentRound === "vcnv" && state.vcnv?.eliminatedSeats.includes(s.id));

            const cardClass = isClassic
              ? isMe
                ? "bg-gradient-to-b from-[#4a1515] via-[#2b1010] to-[#1a0808] border-2 border-[#f59e0b] shadow-[0_0_12px_rgba(245,158,11,0.5)]"
                : isBuzzed
                ? "bg-gradient-to-b from-[#452b0a] via-[#2d1c05] to-[#170e02] border-2 border-[#fef08a] shadow-[0_0_16px_rgba(254,240,138,0.8)]"
                : "bg-gradient-to-b from-[#2a2d33] via-[#1e2025] to-[#141518] border border-[#d4af37]/50 shadow-[0_2px_6px_rgba(0,0,0,0.6)]"
              : isMe
              ? "border-2 border-red-500 bg-gradient-to-b from-red-950/75 via-slate-900/95 to-slate-950 shadow-[0_0_16px_rgba(239,68,68,0.45)]"
              : isBuzzed
              ? "border-2 border-amber-400 bg-amber-950/50 shadow-[0_0_14px_rgba(245,158,11,0.4)]"
              : "border border-white/15 bg-slate-900/80";

            const nameColor = isClassic
              ? isMe
                ? "text-amber-200"
                : isBuzzed
                ? "text-amber-100"
                : "text-amber-200"
              : isMe
              ? "text-amber-300"
              : "text-slate-300";

            const scoreColor = isClassic
              ? isMe
                ? "text-white drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]"
                : isBuzzed
                ? "text-[#fef08a]"
                : "text-[#fbbf24]"
              : isMe
              ? "text-white"
              : "text-amber-300";

            const borderLeftColor = isClassic
              ? isMe
                ? "#f59e0b"
                : isBuzzed
                ? "#fef08a"
                : SEAT_COLORS[s.id] || "#d4af37"
              : isMe
              ? "#ef4444"
              : SEAT_COLORS[s.id] || "#38bdf8";

            return (
              <div
                key={s.id}
                className={`${
                  isSandboxMode ? "h-8 rounded-lg px-1.5 py-0.5" : "h-8 sm:h-9 md:h-10 rounded-lg sm:rounded-xl px-1.5 sm:px-2 py-0.5"
                } flex items-center justify-between gap-1 transition-all relative overflow-hidden min-w-0 ${cardClass}`}
                style={{
                  borderLeftWidth: isSandboxMode ? "3px" : "4px",
                  borderLeftColor,
                }}
              >
                <div className="flex items-center gap-1 min-w-0 overflow-hidden flex-1 py-0.5">
                  <span
                    className={`${
                      isSandboxMode ? "text-[9.5px]" : "text-[10px] sm:text-xs"
                    } font-extrabold uppercase truncate tracking-tight text-left leading-normal ${nameColor}`}
                    style={{
                      fontStretch: "condensed",
                      letterSpacing: "-0.03em",
                      transform: "scaleX(0.96)",
                      transformOrigin: "left center",
                    }}
                    title={s.name || `TS ${s.id + 1}`}
                  >
                    {s.name || `TS ${s.id + 1}`}
                  </span>
                  {isMe && (
                    <span
                      className={`px-1 py-0.2 rounded ${
                        isSandboxMode ? "text-[7px]" : "text-[8px] sm:text-[8.5px]"
                      } font-black uppercase shrink-0 ${
                        isClassic
                          ? "bg-gradient-to-b from-[#b91c1c] to-[#7f1d1d] border border-[#fef08a] text-amber-100 shadow"
                          : "bg-red-600 text-white"
                      }`}
                    >
                      BẠN
                    </span>
                  )}
                  {isBuzzed && <span className={`${isSandboxMode ? "text-[9px]" : "text-[10px] sm:text-xs"} animate-bounce shrink-0`}>🔔</span>}
                  {isLocked && <span className={`${isSandboxMode ? "text-[9px]" : "text-[10px] sm:text-xs"} text-rose-400 shrink-0`}>🔒</span>}
                </div>
                <span className={`${isSandboxMode ? "text-xs" : "text-xs sm:text-sm md:text-base"} font-black font-mono tabular-nums leading-none shrink-0 ml-1 ${scoreColor}`}>
                  {s.score}
                </span>
              </div>
            );
          })}
        </div>

        {/* 3. Fixed Question & Media Box */}
        <div
          className={`flex-1 ${
            isSandboxMode ? "min-h-0 rounded-xl p-1.5 sm:p-2" : "min-h-[90px] rounded-2xl p-2 sm:p-3"
          } flex flex-col justify-between relative overflow-hidden transition-all ${
            isClassic
              ? "bg-gradient-to-b from-[#181b22] via-[#121418] to-[#0a0b0e] border-2 sm:border-[3px] border-[#d4af37] shadow-[0_8px_30px_rgba(0,0,0,0.9),0_0_15px_rgba(212,175,55,0.25)] outline outline-1 outline-[#78350f] outline-offset-[-3px]"
              : "bg-slate-950/85 border-2 border-white/15 shadow-inner"
          }`}
        >
          {/* VCNV sub-tabs inside Question Box strictly on 1 single line with Lock Status */}
          {state.stage === "playing" && state.currentRound === "vcnv" && state.vcnv && (
            <div
              className={`shrink-0 flex items-center justify-between gap-1 mb-1.5 pb-1.5 border-b flex-nowrap w-full overflow-hidden ${
                isClassic ? "border-[#d4af37]/30" : "border-white/10"
              }`}
            >
              <div className="flex items-center gap-1 min-w-0 flex-1 overflow-hidden flex-nowrap">
                <button
                  type="button"
                  onClick={() => setVcnvTab("question")}
                  className={`px-2 py-0.5 rounded-lg font-black shrink-0 whitespace-nowrap ${
                    isSandboxMode ? "text-[9.5px]" : "text-[11px] sm:text-xs"
                  } border transition cursor-pointer ${
                    isClassic
                      ? vcnvTab === "question"
                        ? "bg-gradient-to-b from-[#b8860b] via-[#854d0e] to-[#451a03] text-amber-100 border-[#fef08a] shadow-[0_0_8px_rgba(212,175,55,0.4)]"
                        : "bg-[#1a1c20]/80 text-amber-200/70 border-[#d4af37]/30 hover:border-[#d4af37]/60"
                      : vcnvTab === "question"
                      ? "bg-red-600 text-white border-red-400 shadow"
                      : "bg-white/5 text-slate-300 border-white/10 hover:bg-white/10"
                  }`}
                >
                  ❓ Hàng ngang
                </button>
                <button
                  type="button"
                  onClick={() => setVcnvTab("pieces")}
                  className={`px-2 py-0.5 rounded-lg font-black truncate shrink min-w-0 ${
                    isSandboxMode ? "text-[9.5px]" : "text-[11px] sm:text-xs"
                  } border transition cursor-pointer ${
                    isClassic
                      ? vcnvTab === "pieces"
                        ? "bg-gradient-to-b from-[#d97706] via-[#b45309] to-[#78350f] text-white border-[#fef08a] shadow-[0_0_8px_rgba(245,158,11,0.4)]"
                        : "bg-[#1a1c20]/80 text-amber-200/70 border-[#d4af37]/30 hover:border-[#d4af37]/60"
                      : vcnvTab === "pieces"
                      ? "bg-amber-400 text-slate-950 border-amber-300 shadow"
                      : "bg-white/5 text-slate-300 border-white/10 hover:bg-white/10"
                  }`}
                  title={`Miếng ghép & CNV (${state.vcnv.keywordLength ?? (state.vcnv.keyword ? state.vcnv.keyword.replace(/\s+/g, "").length : "?")} ${getVcnvUnit(state.vcnv.keyword || "")})`}
                >
                  🧩 Miếng ghép & CNV
                </button>
              </div>
              {state.vcnv.eliminatedSeats.includes(me.id) && (
                <span
                  className={`${
                    isSandboxMode ? "text-[9.5px] px-1.5 py-0.5" : "text-xs px-2 py-0.5"
                  } font-black rounded-lg border shrink-0 whitespace-nowrap ml-1 ${
                    isClassic
                      ? "text-rose-300 bg-rose-950/70 border-rose-500/50 shadow"
                      : "text-rose-400 bg-rose-950/60 border border-rose-500/40"
                  }`}
                >
                  🔒 Khóa quyền
                </span>
              )}
            </div>
          )}

          {/* Main Question / Content Area - top-left aligned across all rounds & themes */}
          <div className="flex-1 min-h-0 flex flex-col items-start justify-start text-left overflow-y-auto no-scrollbar px-2 py-1 w-full">
            <div className="w-full flex flex-col items-start justify-start py-0.5 text-left">
              <QuestionBoxContent
                state={state}
                seatId={me.id}
                emit={emit}
                vcnvTab={vcnvTab}
                isClassic={isClassic}
                isSandbox={isSandboxMode}
              />
            </div>
          </div>

          {/* Bottom Timer Bar inside Question Box - 1Hz Numerical Countdown without 60fps progress bar */}
          <div className="shrink-0 pt-0.5">
            {activeTimer && (
              <PlayerPadCountdown
                timer={activeTimer}
                serverNow={serverNow}
                isClassic={isClassic}
                isSandbox={isSandboxMode}
              />
            )}
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          BOTTOM FIXED INTERACTION AREA (Buzzer / Answer Input / CNV Bell)
         ═══════════════════════════════════════════════════════════════════════ */}
      <div
        className={`shrink-0 ${
          isSandboxMode ? "rounded-xl px-2.5 py-1" : "rounded-2xl px-3 sm:px-6 py-1.5"
        } flex items-center justify-center relative overflow-hidden shadow-2xl relative z-10 transition-all ${
          isClassic
            ? "bg-gradient-to-r from-[#1c1e22] via-[#26292f] to-[#1c1e22] border-2 border-[#d4af37]/60 shadow-[0_6px_20px_rgba(0,0,0,0.8)]"
            : "bg-slate-950/95 border-2 border-white/15"
        } ${
          isSandboxMode
            ? isBuzzerRound
              ? "h-auto min-h-[54px] max-h-[72px]"
              : "h-auto min-h-[40px] max-h-[58px]"
            : isBuzzerRound
            ? "h-auto min-h-[96px] sm:min-h-[110px] max-h-[140px]"
            : "h-auto min-h-[46px] sm:min-h-[52px] max-h-[76px]"
        }`}
      >
        <InteractionZone
          state={state}
          seatId={me.id}
          emit={emit}
          triggerBuzz={triggerBuzz}
          serverNow={serverNow}
          optimisticBuzzPending={optimisticBuzzPending}
          isClassic={isClassic}
          isSandbox={isSandboxMode}
        />
      </div>
    </div>
  );
}

function getSubRoundLabel(state: OlympiaState): string {
  if (state.stage === "lobby") return "Đang chờ quản trò bắt đầu trận đấu";
  if (state.stage === "finished") return "Trận đấu đã kết thúc";
  if (state.introTimer || state.introStandby || state.entranceState?.active) {
    return state.entranceState?.active ? "Chào sân & Giới thiệu thí sinh" : "Khai mạc & Giới thiệu trận đấu";
  }
  if (state.banner) return state.banner;

  switch (state.currentRound) {
    case "khoiDong": {
      const kd = state.khoiDong;
      if (!kd) return "";
      const seg = kd.segments[kd.segIdx];
      const isUnlimitedQ = seg.questions >= 50 || Boolean(seg.globalMs && seg.questions >= 30);
      const qNum = kd.qIdx >= 0 ? ` · Câu ${kd.qIdx + 1}${!isUnlimitedQ ? `/${seg.questions}` : ""}` : "";
      if (seg.kind === "solo") {
        return `Khởi động riêng — ${seatName(state, seg.seat)}${qNum}`;
      }
      return `Khởi động chung${qNum}`;
    }
    case "vcnv": {
      const v = state.vcnv;
      if (!v) return "";
      const kwLen = v.keywordLength ?? (v.keyword ? v.keyword.replace(/\s+/g, "").length : 0);
      if (v.currentRow >= 0 && v.currentRow < 4) {
        const lc = v.rows[v.currentRow]?.letterCount || v.rows[v.currentRow]?.answer?.length || "?";
        const rowUnit = getVcnvUnit(v.rows[v.currentRow]?.answer || "");
        const kwUnit = getVcnvUnit(v.keyword || "");
        return `Hàng ngang số ${v.currentRow + 1} (${lc} ${rowUnit}) · CNV: ${kwLen} ${kwUnit}`;
      }
      if (v.currentRow === 4) {
        const kwUnit = getVcnvUnit(v.keyword || "");
        return `Ô trung tâm · CNV: ${kwLen} ${kwUnit}`;
      }
      const kwUnit = getVcnvUnit(v.keyword || "");
      return `Chướng ngại vật gồm ${kwLen} ${kwUnit}`;
    }
    case "tangToc": {
      const tt = state.tangToc;
      if (!tt || tt.qIdx < 0) return "Chuẩn bị câu hỏi Tăng Tốc";
      return `Tăng tốc câu số ${tt.qIdx + 1}/4`;
    }
    case "veDich": {
      const vd = state.veDich;
      if (!vd) return "";
      const owner = vd.order[vd.turnIdx];
      const qInfo = vd.current ? ` · Câu ${vd.qIdx + 1} (${vd.current.points} điểm)` : "";
      return `Lượt thi của ${seatName(state, owner)}${qInfo}`;
    }
    case "cauHoiPhu": {
      const cp = state.cauHoiPhu;
      if (!cp) return "";
      const limitLabel = state.chpQuestionLimit === "unlimited" ? "∞" : "3";
      return `Câu hỏi phụ ${cp.qIdx >= 0 ? `${cp.qIdx + 1}/${limitLabel}` : ""}`;
    }
    default:
      return "";
  }
}

function QuestionBoxContent({
  state,
  seatId,
  emit,
  vcnvTab,
  isClassic,
  isSandbox,
}: {
  state: OlympiaState;
  seatId: number;
  emit: Emit;
  vcnvTab: "question" | "pieces";
  isClassic?: boolean;
  isSandbox?: boolean;
}) {
  if (state.stage === "lobby") {
    return (
      <div className={`w-full text-center ${isClassic ? "text-amber-200/90 text-lg sm:text-xl font-bold" : "text-slate-300 text-lg sm:text-xl font-bold"}`}>
        Đã kết nối máy thí sinh. Chờ MC bắt đầu trận đấu…
      </div>
    );
  }
  if (state.stage === "finished") {
    const myScore = state.seats[seatId]?.score ?? 0;
    return (
      <div className="w-full text-center space-y-2">
        <div className={`text-2xl sm:text-3xl font-black ${isClassic ? "text-[#fbbf24] drop-shadow-[0_2px_8px_rgba(251,191,36,0.6)]" : "text-amber-300"}`}>
          TRẬN ĐẤU KẾT THÚC
        </div>
        <div className="text-lg text-white">
          Điểm chung cuộc của bạn: <b className={`text-2xl ${isClassic ? "text-[#fef08a]" : "text-amber-300"}`}>{myScore}</b>
        </div>
      </div>
    );
  }
  if (state.introTimer || state.introStandby || state.entranceState?.active) {
    return (
      <div className="w-full text-center space-y-1 max-w-full">
        <div className={`text-base sm:text-xl md:text-2xl font-black tracking-wider uppercase animate-pulse ${
          isClassic ? "text-amber-300 drop-shadow-[0_0_10px_rgba(251,191,36,0.6)]" : "text-cyan-300"
        }`}>
          {state.entranceState?.active ? "CHÀO SÂN THÍ SINH" : "SẴN SÀNG THI ĐẤU"}
        </div>
        <div className={isClassic ? "text-amber-200/70 text-xs sm:text-sm" : "text-slate-400 text-xs sm:text-sm"}>
          {state.entranceState?.active
            ? "Đang giới thiệu từng thí sinh bước vào vị trí thi đấu…"
            : "Đang ở phần giới thiệu trận đấu — Chờ MC mở màn…"}
        </div>
      </div>
    );
  }
  if (state.banner) {
    return (
      <div className={`w-full text-center text-xl sm:text-3xl font-black uppercase tracking-wider ${
        isClassic ? "text-[#fbbf24] drop-shadow-[0_2px_8px_rgba(251,191,36,0.6)]" : "text-amber-300"
      }`}>
        {state.banner}
      </div>
    );
  }

  switch (state.currentRound) {
    case "khoiDong": {
      const kd = state.khoiDong;
      if (!kd || !kd.started || kd.phase === "segmentDone") {
        return (
          <div className={`w-full text-center ${isClassic ? "text-amber-200/70 text-sm sm:text-base font-semibold" : "text-slate-400 text-sm sm:text-base font-semibold"}`}>
            Đang đợi bắt đầu lượt Khởi động…
          </div>
        );
      }
      if (!kd.questionRevealed || !kd.current) {
        return (
          <div className={`w-full text-center ${isClassic ? "text-amber-300 text-base sm:text-lg font-black uppercase animate-pulse drop-shadow" : "text-sky-300 text-base sm:text-lg font-black uppercase animate-pulse"}`}>
            Sẵn sàng thi đấu…
          </div>
        );
      }
      return (
        <div className="space-y-1.5 w-full max-w-3xl text-left">
          <div className={`select-text text-left py-1 ${
            isSandbox
              ? "text-xs sm:text-sm font-black leading-normal text-white"
              : isClassic
              ? "text-base sm:text-lg md:text-xl xl:text-2xl font-black text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.95)] leading-normal sm:leading-relaxed"
              : "text-white text-sm sm:text-base md:text-lg font-bold leading-normal sm:leading-relaxed"
          }`}>
            {kd.current.q}
          </div>
          {kd.current.media && (
            <MediaView url={kd.current.media} type={kd.current.mediaType} className={`${isSandbox ? "max-h-16" : "max-h-24 sm:max-h-36"} rounded-xl mx-auto`} />
          )}
          {kd.phase === "result" && kd.current.a && (
            <div className={`mt-1 inline-block px-3 py-1 rounded-xl font-black text-xs sm:text-sm ${
              isClassic
                ? "bg-gradient-to-r from-[#064e3b] to-[#042f2e] border-2 border-emerald-400/80 text-emerald-200 shadow-md"
                : "bg-emerald-950/80 border border-emerald-400 text-emerald-300"
            }`}>
              ✔ Đáp án: <span className="text-white">{kd.current.a}</span>
            </div>
          )}
        </div>
      );
    }

    case "vcnv": {
      const v = state.vcnv;
      if (!v) return null;
      if (vcnvTab === "pieces") {
        return (
          <div className="w-full max-w-xl grid grid-cols-2 gap-2 text-left">
            {[0, 1, 2, 3].map((rIdx) => {
              const row = v.rows[rIdx];
              const lc = row?.letterCount || row?.answer?.length || "?";
              const isSolved = Boolean(row?.opened && !row?.wrong);
              return (
                <div
                  key={rIdx}
                  className={`rounded-xl p-2 border flex items-center justify-between gap-2 transition-all ${
                    isClassic
                      ? isSolved
                        ? "bg-[#0d2a17] border-2 border-[#22c55e]/80 text-emerald-100 shadow-[0_0_10px_rgba(34,197,94,0.3)]"
                        : row?.opened
                        ? "bg-[#2a1010] border-2 border-rose-500/60 text-rose-200"
                        : "bg-[#202226] border border-[#d4af37]/40 text-amber-100 shadow"
                      : isSolved
                      ? "bg-emerald-950/60 border-emerald-400/60 text-white"
                      : row?.opened
                      ? "bg-rose-950/40 border-rose-500/40 text-slate-300"
                      : "bg-slate-900/80 border-white/10 text-slate-300"
                  }`}
                >
                  <div className="min-w-0">
                    <div className={`text-[10px] font-black uppercase ${isClassic ? "text-[#fbbf24]" : "text-amber-300"}`}>
                      Hàng ngang {rIdx + 1} ({lc} {getVcnvUnit(row?.answer || "")})
                    </div>
                    <div className="text-xs sm:text-sm font-bold truncate mt-0.5">
                      {isSolved ? row?.answer || "Đã mở" : row?.opened ? "Đã mở (Không có ĐA đúng)" : "🔒 Chưa mở"}
                    </div>
                  </div>
                  <span className={`px-1.5 py-0.2 rounded font-black text-[11px] shrink-0 ${
                    isClassic
                      ? "bg-gradient-to-b from-[#d97706] to-[#78350f] border border-amber-300/60 text-white"
                      : "bg-blue-600 text-white"
                  }`}>
                    {lc} ô
                  </span>
                </div>
              );
            })}
          </div>
        );
      }

      if (v.currentRow < 0) {
        return (
          <div className={`w-full text-center ${isClassic ? "text-amber-200/70 text-sm sm:text-base font-semibold" : "text-slate-400 text-sm sm:text-base font-semibold"}`}>
            Đang đợi MC chọn hàng ngang…
          </div>
        );
      }
      if (v.phase === "selecting") {
        const lc = v.currentRow < 4 ? v.rows[v.currentRow]?.letterCount || v.rows[v.currentRow]?.answer?.length || "?" : "";
        return (
          <div className="w-full text-center space-y-1">
            <div className={`text-base sm:text-lg font-black uppercase ${isClassic ? "text-[#fbbf24] drop-shadow" : "text-amber-300"}`}>
              {v.currentRow < 4 ? `HÀNG NGANG SỐ ${v.currentRow + 1} (${lc} ${getVcnvUnit(v.rows[v.currentRow]?.answer || "").toUpperCase()})` : "⭐ Ô TRUNG TÂM"}
            </div>
            <div className={isClassic ? "text-amber-200/70 text-xs sm:text-sm" : "text-slate-400 text-xs sm:text-sm"}>
              Đã chọn hàng ngang. Đang đợi mở câu hỏi…
            </div>
          </div>
        );
      }
      if (v.currentRow < 4) {
        const row = v.rows[v.currentRow];
        const lc = row?.letterCount || row?.answer?.length || "?";
        return (
          <div className="space-y-1 max-w-3xl text-left w-full">
            <div className={`text-xs font-black uppercase tracking-wider text-left ${isClassic ? "text-amber-300" : "text-sky-300"}`}>
              Hàng ngang số {v.currentRow + 1} ({lc} {getVcnvUnit(row?.answer || "")})
            </div>
            <div className={`select-text text-left py-1 ${
              isSandbox
                ? "text-xs sm:text-sm font-black leading-normal text-white"
                : isClassic
                ? "text-base sm:text-lg md:text-xl xl:text-2xl font-black text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.95)] leading-normal sm:leading-relaxed"
                : "text-white text-sm sm:text-base md:text-lg font-bold leading-normal sm:leading-relaxed"
            }`}>
              {row?.hint || "Đang tải câu hỏi…"}
            </div>
          </div>
        );
      }
      return (
        <div className="space-y-1 max-w-3xl text-left w-full">
          <div className={`text-xs font-black uppercase tracking-wider text-left ${isClassic ? "text-[#fbbf24]" : "text-amber-400"}`}>
            ⭐ CÂU HỎI Ô TRUNG TÂM
          </div>
          <div className={`select-text text-left py-1 ${
            isSandbox
              ? "text-xs sm:text-sm font-black leading-normal text-white"
              : isClassic
              ? "text-base sm:text-lg md:text-xl xl:text-2xl font-black text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.95)] leading-normal sm:leading-relaxed"
              : "text-white text-sm sm:text-base md:text-lg font-bold leading-normal sm:leading-relaxed"
          }`}>
            {v.centerQuestion?.q || "Đang tải câu hỏi trung tâm…"}
          </div>
        </div>
      );
    }

    case "tangToc": {
      const tt = state.tangToc;
      if (!tt || tt.qIdx < 0 || tt.phase === "idle") {
        return (
          <div className={`w-full text-center ${isClassic ? "text-amber-200/70 text-sm sm:text-base font-semibold" : "text-slate-400 text-sm sm:text-base font-semibold"}`}>
            Chuẩn bị mở câu hỏi Tăng Tốc…
          </div>
        );
      }
      const q = tt.questions[tt.qIdx];
      return (
        <div className="space-y-1.5 w-full max-w-3xl text-left">
          <div className={`select-text text-left py-1 ${
            isSandbox
              ? "text-xs sm:text-sm font-black leading-normal text-white"
              : isClassic
              ? "text-base sm:text-lg md:text-xl xl:text-2xl font-black text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.95)] leading-normal"
              : "text-white text-sm sm:text-base md:text-lg font-bold leading-normal"
          }`}>
            {q?.q || "Quan sát dữ kiện trên màn hình chính"}
          </div>
          {q?.media && (
            <MediaView url={q.media} className={`${isSandbox ? "max-h-16" : "max-h-24 sm:max-h-36"} rounded-xl mx-auto`} />
          )}
        </div>
      );
    }

    case "veDich": {
      const vd = state.veDich;
      if (!vd) return null;
      const owner = vd.order[vd.turnIdx];
      const rs = RULESETS[state.rulesetId]?.veDich || RULESETS.O26.veDich;
      const isO22Q1 = state.rulesetId === "O22" && (state.o22Quarter ?? 1) === 1;
      const allowedPointOptions = isO22Q1 ? [20, 40] : rs.pointOptions;
      const questionCount = isO22Q1 ? 2 : rs.questionsPerSeat;

      if (vd.phase === "choosing" || (vd.phase === "idle" && vd.onStage)) {
        if (owner === seatId) {
          return (
            <div
              className={`w-full max-w-md mx-auto p-4 rounded-2xl text-center space-y-2 select-none shadow-xl border-2 ${
                isClassic
                  ? "bg-gradient-to-b from-[#24272c] to-[#181a1d] border-[#d4af37]/70 text-amber-200"
                  : "bg-slate-900/90 border-cyan-500/40 text-cyan-200"
              }`}
            >
              <div className="text-2xl animate-bounce">🎙️</div>
              <div className="text-base sm:text-lg font-black tracking-wide text-white uppercase drop-shadow">
                Bạn đang trên bục Về Đích
              </div>
              <div className="text-xs sm:text-sm font-semibold opacity-90 leading-relaxed text-amber-300">
                Vui lòng báo gói câu hỏi đã chọn cho MC.
                <br />
                Quản trò / MC sẽ xác nhận gói câu hỏi trên bàn điều khiển.
              </div>
            </div>
          );
        }
        return (
          <div className={`w-full text-center ${isClassic ? "text-[#fbbf24] text-base sm:text-lg font-bold drop-shadow" : "text-amber-300 text-base sm:text-lg font-bold"}`}>
            {seatName(state, owner)} đang lựa chọn gói câu hỏi Về Đích…
          </div>
        );
      }

      if (!vd.current) {
        const pkg = vd.packages[owner];
        return (
          <div className="w-full text-center space-y-1.5">
            <div className={`text-xs sm:text-sm font-bold uppercase ${isClassic ? "text-[#fbbf24]" : "text-amber-300"}`}>
              Gói câu hỏi của {seatName(state, owner)}
            </div>
            {pkg && (
              <div className="flex items-center justify-center gap-2">
                {pkg.map((p, i) => (
                  <div
                    key={i}
                    className={`px-3.5 py-1.5 rounded-xl font-black text-lg transition-all ${
                      isClassic
                        ? "bg-gradient-to-b from-[#854d0e] via-[#78350f] to-[#451a03] border-2 border-[#fef08a] text-amber-100 shadow-[0_0_10px_rgba(212,175,55,0.4)]"
                        : "bg-red-600/80 border border-amber-300 text-white"
                    }`}
                  >
                    {p.points}đ
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      }

      return (
        <div className="space-y-1.5 w-full max-w-3xl text-left">
          <div className={`flex items-center justify-start gap-2 text-xs sm:text-sm font-black uppercase ${
            isClassic ? "text-[#fbbf24]" : "text-amber-300"
          }`}>
            <span>Câu {vd.qIdx + 1} · {vd.current.points} điểm</span>
            {vd.hopeStarActive && (
              <span className={isClassic ? "text-[#fde047] drop-shadow-[0_0_8px_rgba(250,204,21,0.8)] font-black" : "text-yellow-300"}>
                ⭐ NGÔI SAO HY VỌNG
              </span>
            )}
          </div>
          <div className={`select-text text-left py-1 ${
            isSandbox
              ? "text-xs sm:text-sm font-black leading-normal text-white"
              : isClassic
              ? "text-base sm:text-lg md:text-xl xl:text-2xl font-black text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.95)] leading-normal sm:leading-relaxed"
              : "text-white text-sm sm:text-base md:text-lg font-bold leading-normal sm:leading-relaxed"
          }`}>
            {vd.current.q.q}
          </div>
          {vd.current.q.media && (
            <MediaView url={vd.current.q.media} type={vd.current.q.mediaType} className={`${isSandbox ? "max-h-16" : "max-h-24 sm:max-h-36"} rounded-xl mx-auto`} />
          )}
          {vd.phase === "result" && vd.current.q.a && (
            <div className={`mt-1 inline-block px-3 py-1 rounded-xl font-black text-xs sm:text-sm text-left ${
              isClassic
                ? "bg-gradient-to-r from-[#064e3b] to-[#042f2e] border-2 border-emerald-400/80 text-emerald-200 shadow-md"
                : "bg-emerald-950/80 border border-emerald-400 text-emerald-300"
            }`}>
              ✔ Đáp án: <span className="text-white">{vd.current.q.a}</span>
            </div>
          )}
        </div>
      );
    }

    case "cauHoiPhu": {
      const cp = state.cauHoiPhu;
      if (!cp) return null;
      const q = cp.questions[cp.qIdx];
      if (!q || cp.phase === "idle") {
        return (
          <div className={`w-full text-center ${isClassic ? "text-amber-200/70 text-sm sm:text-base font-semibold" : "text-slate-400 text-sm sm:text-base font-semibold"}`}>
            Chuẩn bị Câu hỏi phụ…
          </div>
        );
      }
      return (
        <div className="space-y-1.5 max-w-3xl text-left w-full">
          <div className={`text-xs sm:text-sm font-black uppercase tracking-wider text-left ${
            isClassic ? "text-[#fbbf24]" : "text-amber-300"
          }`}>
            CÂU HỎI PHỤ {cp.qIdx >= 0 ? `${cp.qIdx + 1}/${state.chpQuestionLimit === "unlimited" ? "∞" : "3"}` : ""}
          </div>
          <div className={`select-text text-left py-1 ${
            isSandbox
              ? "text-xs sm:text-sm font-black leading-normal text-white"
              : isClassic
              ? "text-base sm:text-lg md:text-xl xl:text-2xl font-black text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.95)] leading-normal sm:leading-relaxed"
              : "text-white text-sm sm:text-base md:text-lg font-bold leading-normal sm:leading-relaxed"
          }`}>
            {q.q}
          </div>
          {cp.phase === "result" && q.a && (
            <div className={`font-black text-sm sm:text-base text-left ${isClassic ? "text-emerald-300 drop-shadow" : "text-emerald-300"}`}>
              ✔ Đáp án: {q.a}
            </div>
          )}
        </div>
      );
    }

    default:
      return null;
  }
}

function InteractionZone({
  state,
  seatId,
  emit,
  triggerBuzz,
  serverNow,
  optimisticBuzzPending = false,
  isClassic,
  isSandbox = false,
}: {
  state: OlympiaState;
  seatId: number;
  emit: Emit;
  triggerBuzz: () => void;
  serverNow: () => number;
  optimisticBuzzPending?: boolean;
  isClassic?: boolean;
  isSandbox?: boolean;
}) {
  // 1. Bell Test Mode overrides the bottom 30% zone so contestants can test their buzzer anytime
  if (state.bellTestMode) {
    const myLog = state.bellTestLogs?.find((b) => b.seat === seatId);
    return (
      <div className={`w-full h-full flex items-center justify-center ${isSandbox ? "gap-2" : "gap-6"}`}>
        <CircularBuzzer3D
          enabled={!myLog}
          onPress={triggerBuzz}
          label={myLog ? `ĐÃ THỬ (${myLog.order})` : "THỬ CHUÔNG"}
          subLabel={myLog ? "Tín hiệu chuông tốt" : "Nhấn Space hoặc chạm nút để bấm chuông"}
          isClassic={isClassic}
          isSandbox={isSandbox}
        />
        {!isSandbox && (
          <div className="hidden sm:flex flex-col gap-1 text-left max-w-xs">
            <div className={`font-black text-sm uppercase ${isClassic ? "text-[#fbbf24]" : "text-amber-300"}`}>
              🔔 Chế độ kiểm tra chuông
            </div>
            <div className={`text-xs ${isClassic ? "text-amber-200/80" : "text-slate-300"}`}>
              Bấm thử chuông để kiểm tra độ nhạy bàn phím (Space) hoặc chuột trước khi vào phần thi chính thức.
            </div>
            {myLog && (
              <div className="text-emerald-400 text-xs font-bold mt-1">
                ✔ Máy chủ đã ghi nhận tín hiệu chuông của bạn (Lượt {myLog.order}).
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  if (
    state.stage !== "playing" ||
    state.introTimer ||
    state.introStandby ||
    state.entranceState?.active ||
    !state.currentRound ||
    (state.currentRound === "khoiDong" && !state.khoiDong?.started)
  ) {
    return (
      <div className={`${isSandbox ? "text-xs" : "text-sm"} font-bold uppercase tracking-wider ${isClassic ? "text-amber-200/50" : "text-slate-500"}`}>
        Khu vực tương tác sẽ mở khi phần thi bắt đầu
      </div>
    );
  }

  const now = serverNow();

  switch (state.currentRound) {
    case "khoiDong": {
      const kd = state.khoiDong;
      if (!kd) return null;
      const seg = kd.segments[kd.segIdx];
      if (seg?.kind === "solo") {
        const isMyTurn = seg.seat === seatId;
        return (
          <div
            className={`${isSandbox ? "p-1.5" : "p-2.5 sm:p-3"} rounded-xl w-full text-center transition-all ${
              isClassic
                ? "bg-gradient-to-r from-[#24272c] via-[#2c3037] to-[#24272c] border border-[#d4af37]/50 shadow-[0_2px_8px_rgba(0,0,0,0.6)]"
                : ""
            }`}
          >
            <div
              className={`${isSandbox ? "text-xs sm:text-sm font-black" : "text-base sm:text-lg font-black"} uppercase ${
                isMyTurn
                  ? isClassic
                    ? "text-[#fbbf24]"
                    : "text-amber-300"
                  : isClassic
                  ? "text-amber-200/60"
                  : "text-slate-400"
              }`}
            >
              {isMyTurn ? "🎙️ Khởi động riêng — Trả lời trực tiếp MC" : `Đang là lượt Khởi động riêng của ${seatName(state, seg.seat)}`}
            </div>
          </div>
        );
      }

      const locked = kd.lockedSeats.includes(seatId);
      const unlockRemainingMs = kd.buzzUnlockAt ? Math.max(0, kd.buzzUnlockAt - now) : 0;
      const canBuzz =
        kd.phase === "question" &&
        !locked &&
        kd.buzzedSeat == null &&
        (kd.buzzOpen || Boolean(kd.buzzUnlockAt && now >= kd.buzzUnlockAt));
      const isCountingDownUnlock = kd.phase === "question" && unlockRemainingMs > 0 && !canBuzz;

      const label =
        kd.buzzedSeat === seatId || (optimisticBuzzPending && kd.buzzedSeat == null)
          ? "ĐÃ BẤM CHUÔNG"
          : locked
          ? "ĐÃ KHÓA CÂU NÀY"
          : isCountingDownUnlock
          ? `MỞ SAU ${(unlockRemainingMs / 1000).toFixed(1)}s`
          : "BẤM CHUÔNG";

      const subLabel =
        kd.buzzedSeat != null
          ? `🔔 ${seatName(state, kd.buzzedSeat)} giành quyền`
          : canBuzz
          ? "Nhấn Space hoặc bấm nút ngay!"
          : "Nhấn Space hoặc chạm nút để bấm chuông";

      return (
        <CircularBuzzer3D
          enabled={canBuzz}
          onPress={() => {
            if (canBuzz) {
              triggerBuzz();
            }
          }}
          label={label}
          subLabel={subLabel}
          isClassic={isClassic}
          isSandbox={isSandbox}
        />
      );
    }

    case "vcnv": {
      const v = state.vcnv;
      if (!v) return null;
      const running = v.timer.startedAt != null;
      const out = v.eliminatedSeats.includes(seatId);
      const hasBuzzed = v.bells.some((b) => b.seat === seatId);
      const canAnswerRow =
        running &&
        !out &&
        !hasBuzzed &&
        (v.phase === "question" || v.phase === "waitingAnswer") &&
        v.currentRow >= 0 &&
        v.currentRow <= 4;
      const canBuzzCnv = !out && !hasBuzzed && v.phase !== "done";
      const submittedText = v.answers[seatId]?.text;

      return (
        <div className={`w-full h-full flex items-center justify-between ${isSandbox ? "gap-2" : "gap-3 sm:gap-5"}`}>
          {/* Left / Center: Fixed Horizontal Answer Input Bar */}
          <div className={`flex-1 min-w-0 flex flex-col justify-center ${isSandbox ? "gap-0.5" : "gap-2"}`}>
            <HorizontalAnswerBar
              enabled={canAnswerRow}
              emit={emit}
              placeholder={
                out || hasBuzzed
                  ? "Đã dừng quyền nhập đáp án hàng ngang"
                  : isSandbox
                  ? "Nhập đáp án hàng ngang…"
                  : "Nhập đáp án hàng ngang rồi nhấn Enter hoặc GỬI…"
              }
              resetKey={`vcnv_${v.currentRow}`}
              serverSubmittedText={submittedText}
              isClassic={isClassic}
              isSandbox={isSandbox}
            />
            {(hasBuzzed || out) && (
              <div className={`${isSandbox ? "text-[10px]" : "text-xs sm:text-sm"} font-extrabold flex items-center gap-1.5 ${isClassic ? "text-[#fbbf24]" : "text-amber-300"}`}>
                <span>🔔</span>
                <span>
                  {hasBuzzed
                    ? "Bạn đã bấm chuông CNV — Chờ MC chấm."
                    : "Quyền chơi VCNV đang khóa."}
                </span>
              </div>
            )}
          </div>

          {/* Fixed Right: Compact CNV Buzzer Pill Button */}
          <div className="shrink-0 flex items-center justify-center">
            <button
              type="button"
              disabled={!canBuzzCnv}
              onPointerDown={(e) => {
                if (!canBuzzCnv) return;
                e.preventDefault();
                triggerBuzz();
              }}
              onClick={() => {
                if (!canBuzzCnv) return;
                triggerBuzz();
              }}
              className={`${
                isSandbox ? "h-8 px-2.5 text-[11px]" : "h-11 sm:h-12 px-3 sm:px-4 text-xs sm:text-sm"
              } rounded-xl font-black uppercase tracking-wider border-2 flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer shadow-lg whitespace-nowrap ${
                canBuzzCnv
                  ? isClassic
                    ? "bg-gradient-to-b from-amber-600 via-red-700 to-red-900 border-2 border-amber-300 text-white shadow-[0_0_20px_rgba(212,175,55,0.6)] animate-pulse"
                    : "bg-gradient-to-r from-amber-500 via-red-600 to-rose-700 border-amber-300 text-white shadow-[0_0_20px_rgba(239,68,68,0.55)] animate-pulse"
                  : isClassic
                  ? "bg-[#1e2025] border-2 border-[#78350f]/60 text-amber-200/40 cursor-not-allowed opacity-60"
                  : "bg-slate-800 border-slate-700 text-slate-500 cursor-not-allowed opacity-60"
              }`}
            >
              <span className={isSandbox ? "text-sm" : "text-base sm:text-lg"}>🔔</span>
              <span>
                {hasBuzzed ? "ĐÃ BẤM CNV" : out ? "ĐÃ KHÓA" : "CHUÔNG CNV"}
              </span>
            </button>
          </div>
        </div>
      );
    }

    case "tangToc": {
      const tt = state.tangToc;
      if (!tt) return null;
      const canAnswer = tt.phase === "question" && tt.timer.startedAt != null;
      const sub = tt.submissions[seatId];
      return (
        <div className="w-full max-w-3xl mx-auto flex flex-col justify-center">
          <HorizontalAnswerBar
            enabled={canAnswer}
            emit={emit}
            placeholder={isSandbox ? "Nhập đáp án Tăng Tốc…" : "Nhập đáp án Tăng Tốc rồi nhấn Enter hoặc GỬI…"}
            resetKey={`tt_${tt.qIdx}`}
            serverSubmittedText={sub ? `${sub.answer} (${(sub.ms / 1000).toFixed(2)}s)` : undefined}
            isClassic={isClassic}
            isSandbox={isSandbox}
          />
        </div>
      );
    }

    case "veDich": {
      const vd = state.veDich;
      if (!vd) return null;
      const owner = vd.order[vd.turnIdx];
      const isStealOpen = vd.phase === "stealing" && Boolean(vd.steal?.open) && vd.steal?.buzzedSeat == null;
      const canSteal = owner !== seatId && isStealOpen;

      const label =
        owner === seatId
          ? "ĐANG TRÊN BỤC"
          : vd.steal?.buzzedSeat === seatId
          ? "ĐÃ BẤM CƯỚP"
          : canSteal
          ? "CƯỚP ĐIỂM (5s)"
          : "CHỜ CƯỚP ĐIỂM";

      const subLabel =
        owner === seatId
          ? "Bạn là thí sinh đang thi gói Về Đích"
          : vd.steal?.buzzedSeat != null
          ? `🔔 ${seatName(state, vd.steal.buzzedSeat)} đã giành quyền trả lời`
          : canSteal
          ? "Nhấn Space hoặc bấm nút ngay!"
          : "Nhấn Space hoặc chạm nút để bấm chuông";

      return (
        <CircularBuzzer3D
          enabled={canSteal}
          onPress={triggerBuzz}
          label={label}
          subLabel={subLabel}
          isClassic={isClassic}
          isSandbox={isSandbox}
        />
      );
    }

    case "cauHoiPhu": {
      const cp = state.cauHoiPhu;
      if (!cp) return null;
      const mine = cp.tied.includes(seatId);
      const alreadyBuzzed = cp.buzzedThisQuestion.includes(seatId);
      const canBuzz = mine && cp.phase === "question" && cp.buzzOpen && !alreadyBuzzed && cp.buzzedSeat == null;

      return (
        <CircularBuzzer3D
          enabled={canBuzz}
          onPress={triggerBuzz}
          label={!mine ? "NGOÀI NHÓM CHP" : alreadyBuzzed ? "ĐÃ BẤM CÂU NÀY" : "BẤM CHUÔNG"}
          subLabel={
            cp.buzzedSeat != null
              ? `🔔 ${seatName(state, cp.buzzedSeat)} đã bấm chuông`
              : canBuzz
              ? "Nhấn Space hoặc bấm nút ngay!"
              : "Nhấn Space hoặc chạm nút để bấm chuông"
          }
          isClassic={isClassic}
          isSandbox={isSandbox}
        />
      );
    }

    default:
      return null;
  }
}

function CircularBuzzer3D({
  enabled,
  onPress,
  label,
  subLabel,
  isClassic,
  isSandbox,
}: {
  enabled: boolean;
  onPress: () => void;
  label: string;
  subLabel?: string;
  isClassic?: boolean;
  isSandbox?: boolean;
}) {
  const lastFiredRef = useRef<number>(0);
  const [pressedLocal, setPressedLocal] = useState(false);

  const fireOnce = () => {
    if (!enabled) return;
    const now = performance.now();
    if (now - lastFiredRef.current < 160) return;
    lastFiredRef.current = now;
    setPressedLocal(true);
    setTimeout(() => setPressedLocal(false), 300);

    // Smooth visual feedback + trigger without synthetic audio delay or audio context hitches
    onPress();
  };

  if (isSandbox) {
    return (
      <div className="relative flex items-center justify-center gap-2.5 w-full max-w-sm mx-auto select-none py-0.5">
        <div className="relative flex items-center justify-center w-12 h-12 shrink-0">
          <button
            type="button"
            disabled={!enabled}
            onPointerDown={(e) => {
              if (!enabled) return;
              e.preventDefault();
              fireOnce();
            }}
            onClick={(e) => e.preventDefault()}
            className={`w-full h-full rounded-full font-black uppercase tracking-wider flex flex-col items-center justify-center gap-0.5 transition-transform duration-75 cursor-pointer shrink-0 ${
              pressedLocal ? "scale-90 brightness-125" : "active:scale-95"
            } ${
              enabled
                ? isClassic
                  ? "border-2 border-[#d4af37] shadow-[0_0_0_1px_#78350f,0_4px_12px_rgba(0,0,0,0.9),0_0_15px_rgba(212,175,55,0.6)] bg-[radial-gradient(circle_at_35%_30%,#f87171_0%,#dc2626_50%,#7f1d1d_100%)] text-white animate-pulse"
                  : "border-2 border-amber-300 bg-gradient-to-b from-red-500 via-red-600 to-rose-800 text-white shadow-[0_0_15px_rgba(239,68,68,0.75)] animate-pulse"
                : isClassic
                ? "border-2 border-[#78350f]/60 bg-gradient-to-b from-[#2a2d33] via-[#1e2025] to-[#141518] text-amber-200/40 cursor-not-allowed opacity-75 shadow-inner"
                : "border-2 border-slate-700 bg-slate-800/90 text-slate-400 cursor-not-allowed opacity-70 shadow-inner"
            }`}
          >
            <span className="text-base drop-shadow">🔔</span>
          </button>
        </div>
        <div className="flex-1 min-w-0 flex flex-col justify-center text-left">
          <span className={`text-xs font-black uppercase truncate ${
            enabled
              ? isClassic ? "text-[#fef08a]" : "text-amber-300"
              : isClassic ? "text-amber-200/50" : "text-slate-400"
          }`}>
            {label}
          </span>
          <span className={`text-[10px] truncate ${
            enabled
              ? isClassic ? "text-amber-200/80" : "text-slate-300"
              : isClassic ? "text-amber-200/40" : "text-slate-500"
          }`}>
            {subLabel || " "}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex flex-col items-center justify-center w-full max-w-sm mx-auto select-none py-0.5">
      {/* ── Fixed Button Container: perfectly centered at all times ── */}
      <div className="relative flex items-center justify-center w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 shrink-0">
        <button
          type="button"
          disabled={!enabled}
          onPointerDown={(e) => {
            if (!enabled) return;
            e.preventDefault();
            fireOnce();
          }}
          onClick={(e) => e.preventDefault()}
          className={`w-full h-full rounded-full font-black text-[11px] sm:text-xs md:text-sm uppercase tracking-wider flex flex-col items-center justify-center gap-0.5 sm:gap-1 transition-transform duration-75 cursor-pointer shrink-0 ${
            pressedLocal ? "scale-90 brightness-125" : "active:scale-95"
          } ${
            enabled
              ? isClassic
                ? "border-4 border-[#d4af37] shadow-[0_0_0_2px_#78350f,0_8px_24px_rgba(0,0,0,0.9),0_0_25px_rgba(212,175,55,0.6),inset_0_4px_10px_rgba(255,255,255,0.4)] bg-[radial-gradient(circle_at_35%_30%,#f87171_0%,#dc2626_50%,#7f1d1d_100%)] text-white animate-pulse"
                : "border-3 sm:border-4 border-amber-300 bg-gradient-to-b from-red-500 via-red-600 to-rose-800 text-white shadow-[0_0_25px_rgba(239,68,68,0.75),inset_0_4px_10px_rgba(255,255,255,0.4)] animate-pulse"
              : isClassic
              ? "border-4 border-[#78350f]/60 bg-gradient-to-b from-[#2a2d33] via-[#1e2025] to-[#141518] text-amber-200/40 cursor-not-allowed opacity-75 shadow-inner"
              : "border-3 sm:border-4 border-slate-700 bg-slate-800/90 text-slate-400 cursor-not-allowed opacity-70 shadow-inner"
          }`}
        >
          <span className="text-lg sm:text-xl drop-shadow">🔔</span>
          <span className={`px-1 text-center leading-tight text-[10px] sm:text-xs font-black break-words max-w-[110px] ${
            isClassic ? "text-amber-100 drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]" : ""
          }`}>
            {label}
          </span>
        </button>
      </div>

      {/* ── Fixed Bottom SubLabel: constant height so button never shifts ── */}
      <div className="h-4 sm:h-5 mt-1 flex items-center justify-center text-center px-2 w-full overflow-hidden">
        <span
          className={`text-[10px] sm:text-xs font-semibold leading-tight text-center max-w-[340px] truncate ${
            enabled ? (isClassic ? "text-amber-200" : "text-amber-300") : isClassic ? "text-amber-200/50" : "text-slate-400"
          }`}
        >
          {subLabel || " "}
        </span>
      </div>
    </div>
  );
}

function HorizontalAnswerBar({
  enabled,
  emit,
  event = "answer",
  placeholder,
  resetKey,
  serverSubmittedText,
  isClassic,
  isSandbox,
}: {
  enabled: boolean;
  emit: Emit;
  event?: string;
  placeholder?: string;
  resetKey?: string | number;
  serverSubmittedText?: string;
  isClassic?: boolean;
  isSandbox?: boolean;
}) {
  const [text, setText] = useState("");
  const [lastSubmitted, setLastSubmitted] = useState<string | null>(null);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    setText("");
    setLastSubmitted(null);
    setMsg("");
  }, [resetKey]);

  const send = async () => {
    if (!enabled || !text.trim()) return;
    const submittedText = text.trim();
    setText("");
    const r = await emit(event, { text: submittedText });
    if (r.ok) {
      setLastSubmitted(submittedText);
      setMsg("✔ Đã ghi nhận");
    } else {
      setText(submittedText);
      setMsg(r.error || "Lỗi khi gửi");
    }
  };

  const displaySubmitted = serverSubmittedText || lastSubmitted;

  return (
    <div className={`w-full ${isSandbox ? "space-y-1" : "space-y-2"} select-text`}>
      <div className={`flex items-stretch ${isSandbox ? "gap-1.5 h-8 sm:h-8.5" : "gap-2 h-12 sm:h-14"} w-full`}>
        <input
          type="text"
          value={text}
          disabled={!enabled}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.repeat && enabled) {
              e.preventDefault();
              send();
            }
          }}
          placeholder={placeholder ?? "Nhập đáp án…"}
          className={`flex-1 min-w-0 ${isSandbox ? "rounded-lg px-2.5 text-xs sm:text-sm" : "rounded-xl px-4 text-base sm:text-xl"} font-bold text-white outline-none disabled:opacity-50 select-text transition-all ${
            isClassic
              ? "bg-[#121418] border-2 border-[#d4af37]/60 placeholder:text-amber-200/40 focus:border-[#d4af37] focus:ring-2 focus:ring-[#d4af37]/40 shadow-inner"
              : "bg-slate-900 border-2 border-white/25 placeholder:text-slate-500 focus:border-cyan-400"
          }`}
          autoComplete="off"
          spellCheck="false"
        />
        <button
          type="button"
          disabled={!enabled || !text.trim()}
          onClick={send}
          className={`${
            isSandbox ? "px-3 rounded-lg text-xs" : "px-5 sm:px-7 rounded-xl text-sm sm:text-base"
          } active:scale-95 transition text-white font-black uppercase tracking-wider disabled:opacity-40 cursor-pointer shrink-0 shadow-lg ${
            isClassic
              ? "bg-gradient-to-b from-[#d97706] via-[#b45309] to-[#78350f] border border-[#fef08a] hover:brightness-110"
              : "bg-gradient-to-r from-red-600 to-amber-500 hover:from-red-500 hover:to-amber-400"
          }`}
        >
          GỬI
        </button>
      </div>

      <div className={`flex items-center justify-between gap-1.5 ${isSandbox ? "text-[10px] min-h-[16px]" : "text-xs sm:text-sm min-h-[24px]"}`}>
        {displaySubmitted ? (
          <div
            className={`font-bold rounded-lg ${isSandbox ? "py-0.2 px-1.5 text-[9.5px]" : "py-1 px-3"} truncate ${
              isClassic
                ? "text-amber-200 bg-[#1e2025] border border-[#d4af37]/60 shadow"
                : "text-emerald-300 bg-emerald-950/50 border border-emerald-500/40"
            }`}
          >
            Đáp án đã gửi: <span className="text-white font-black uppercase">{displaySubmitted}</span>
          </div>
        ) : (
          <div className={isClassic ? "text-amber-200/40 text-xs" : "text-slate-500 text-xs"}>
            Chưa gửi đáp án ở lượt này
          </div>
        )}
        {msg && <span className={isClassic ? "text-[#fbbf24] font-bold shrink-0" : "text-amber-300 font-bold shrink-0"}>{msg}</span>}
      </div>
    </div>
  );
}

function PackagePicker({
  options,
  count,
  selectionMode,
  presetPackages,
  emit,
  isClassic,
  isSandbox,
}: {
  options: number[];
  count: number;
  selectionMode?: "presetPackages" | "customPoints";
  presetPackages?: Record<string, number[]>;
  emit: Emit;
  isClassic?: boolean;
  isSandbox?: boolean;
}) {
  const [pts, setPts] = useState<number[]>(Array(count).fill(options[0] ?? 20));
  const [msg, setMsg] = useState("");

  useEffect(() => {
    setPts(Array(count).fill(options[0] ?? 20));
  }, [count, options]);

  if (selectionMode === "presetPackages" && presetPackages) {
    return (
      <div
        className={`${isSandbox ? "space-y-1.5 p-2" : "space-y-3 p-3"} rounded-xl max-w-md w-full transition-all ${
          isClassic
            ? "bg-gradient-to-b from-[#24272c] to-[#181a1d] border-2 border-[#d4af37]/60 shadow-xl"
            : "bg-white/5"
        }`}
      >
        <div className={`text-center font-bold ${isSandbox ? "text-xs" : "text-sm"} ${isClassic ? "text-[#fbbf24]" : "text-amber-300"}`}>
          Chọn gói câu hỏi cố định ({count} câu)
        </div>
        <div className="grid grid-cols-3 gap-2">
          {Object.entries(presetPackages).map(([pkgKey, pkgPoints]) => (
            <button
              key={pkgKey}
              type="button"
              className={`rounded-xl font-black ${
                isSandbox ? "text-xs py-1 px-1" : "text-base py-2.5 px-2"
              } cursor-pointer transition active:scale-95 ${
                isClassic
                  ? "bg-gradient-to-b from-[#d97706] via-[#b45309] to-[#78350f] border border-[#fef08a] text-white hover:brightness-110 shadow"
                  : "bg-emerald-500 hover:bg-emerald-400 text-slate-950"
              }`}
              onClick={async () => {
                const r = await emit("pick", { points: pkgPoints });
                setMsg(r.ok ? `Đã chọn Gói ${pkgKey}đ` : r.error || "Lỗi");
              }}
            >
              Gói {pkgKey}đ
              <div className="text-[10px] font-semibold opacity-80">({pkgPoints.join("-")})</div>
            </button>
          ))}
        </div>
        {msg && <div className={`text-center text-xs font-bold ${isClassic ? "text-amber-200" : "text-emerald-300"}`}>{msg}</div>}
      </div>
    );
  }

  return (
    <div
      className={`${isSandbox ? "space-y-1.5 p-2" : "space-y-2.5 p-3"} rounded-xl max-w-md w-full transition-all ${
        isClassic
          ? "bg-gradient-to-b from-[#24272c] to-[#181a1d] border-2 border-[#d4af37]/60 shadow-xl"
          : "bg-white/5 border border-white/10"
      }`}
    >
      <div className={`text-center ${isSandbox ? "text-xs" : "text-sm"} font-bold ${isClassic ? "text-amber-200" : "text-amber-300"}`}>
        Chọn mức điểm cho {count} câu hỏi Về Đích ({options.map((o) => `${o}đ`).join(" / ")})
      </div>
      <div className="flex justify-center gap-2">
        {pts.map((p, i) => (
          <select
            key={i}
            value={p}
            className={`rounded-lg ${
              isSandbox ? "px-2 py-1 text-sm font-black" : "px-3 py-2 text-lg font-black"
            } ${
              isClassic
                ? "bg-[#121418] border-2 border-[#d4af37]/70 text-amber-300 focus:outline-none focus:ring-2 focus:ring-[#d4af37]/40"
                : "bg-slate-900 border border-white/25 text-amber-300"
            }`}
            onChange={(e) => setPts(pts.map((x, j) => (j === i ? Number(e.target.value) : x)))}
          >
            {options.map((o) => (
              <option key={o} value={o}>
                Câu {i + 1}: {o}đ
              </option>
            ))}
          </select>
        ))}
      </div>
      <button
        type="button"
        className={`w-full rounded-xl font-black ${
          isSandbox ? "text-xs py-1.5" : "text-base py-2.5"
        } cursor-pointer transition active:scale-95 ${
          isClassic
            ? "bg-gradient-to-b from-[#d97706] via-[#b45309] to-[#78350f] border border-[#fef08a] text-white hover:brightness-110 shadow-lg"
            : "bg-emerald-500 hover:bg-emerald-400 text-slate-950"
        }`}
        onClick={async () => {
          const r = await emit("pick", { points: pts });
          setMsg(r.ok ? "✔ Đã xác nhận gói câu hỏi" : r.error || "Lỗi");
        }}
      >
        ✔ XÁC NHẬN GÓI ({pts.reduce((a, b) => a + b, 0)}Đ)
      </button>
      {msg && <div className={`text-center text-xs font-bold ${isClassic ? "text-amber-200" : "text-emerald-300"}`}>{msg}</div>}
    </div>
  );
}
