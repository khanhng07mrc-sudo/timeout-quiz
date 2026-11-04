"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { RULESETS } from "@/lib/olympia/rulesets";
import { ROUND_LABELS, type OlympiaState } from "@/lib/olympia/types";
import { useCountdown, useOlympiaSocket, useStableToken } from "./hooks";
import { Timer, MediaView, SEAT_COLORS, seatName, activeSeats } from "./ui";

type Emit = (e: string, p?: unknown) => Promise<{ ok: boolean; error?: string }>;

export default function PlayerPad({
  code,
  initialSeat,
  initialName,
}: {
  code: string;
  initialSeat?: number;
  initialName?: string;
}) {
  const defaultToken = useStableToken();
  const token = initialSeat !== undefined ? `sandbox_${code}_seat_${initialSeat}` : defaultToken;
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
    enabled: name !== null && !!token,
  });
  const introRem = useCountdown(state?.introTimer, serverNow);
  void introRem;

  // Tick local clock every 40ms when Khởi Động buzzUnlockAt is active so 2s/5s unlock is instantaneous
  const [, setUnlockTick] = useState(0);
  useEffect(() => {
    const unlockAt = state?.khoiDong?.buzzUnlockAt;
    if (!unlockAt) return;
    const id = setInterval(() => {
      setUnlockTick((t) => t + 1);
      if (serverNow() >= unlockAt) clearInterval(id);
    }, 40);
    return () => clearInterval(id);
  }, [state?.khoiDong?.buzzUnlockAt, serverNow]);

  const triggerBuzz = useCallback(async () => {
    const res = await emit("buzz");
    if (!res.ok && res.error?.includes("Chuông chưa mở")) {
      setTimeout(() => {
        emit("buzz").catch(() => {});
      }, 120);
    }
  }, [emit]);

  const [vcnvTab, setVcnvTab] = useState<"question" | "pieces">("question");
  useEffect(() => {
    if (state?.vcnv?.phase === "question") {
      setVcnvTab("question");
    } else if (state?.vcnv?.phase === "grid" || state?.vcnv?.phase === "done") {
      setVcnvTab("pieces");
    }
  }, [state?.vcnv?.phase]);

  const seatId = join?.seatId ?? -1;

  // Compute buzzer availability for keyboard Space shortcut (with !e.repeat anti-spam)
  const canPressMainBuzz = useCallback((): boolean => {
    if (!state || seatId < 0) return false;
    if (state.bellTestMode) return true;
    if (state.stage !== "playing" || state.introTimer || state.banner) return false;
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
    return (
      <div className="fixed inset-0 w-full h-full min-h-screen bg-gradient-to-b from-[#080d24] via-[#0e173b] to-[#040714] text-white p-6 flex flex-col items-center justify-center select-none">
        <div className="w-full max-w-sm rounded-3xl bg-slate-900/95 border border-cyan-500/40 p-6 sm:p-8 space-y-5 shadow-2xl backdrop-blur-xl text-center">
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
                placeholder="Nhập tên của bạn..."
                className="w-full px-4 py-3 rounded-xl bg-black/60 border border-white/20 text-white font-bold placeholder:text-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 text-sm"
              />
            </div>
            <button
              type="submit"
              disabled={!inputName.trim()}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 via-red-500 to-violet-600 hover:from-amber-400 hover:to-violet-500 text-white font-black text-sm shadow-lg shadow-amber-500/30 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition transform active:scale-95"
            >
              🚀 VÀO PHÒNG THI
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (join && !join.ok) {
    return (
      <div className="fixed inset-0 w-full h-full min-h-screen bg-gradient-to-b from-[#080d24] via-[#0e173b] to-[#040714] text-white p-6 flex flex-col items-center justify-center gap-4">
        <div className="text-rose-300 text-lg text-center">{join.error}</div>
        <a href="/play" className="underline text-sky-300">
          ← Quay lại
        </a>
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

  const me = state.seats[join.seatId];
  const seats = activeSeats(state);
  const myTestLog = state.bellTestLogs?.find((b) => b.seat === me.id);

  // Determine active timer for the top display box
  const activeTimer =
    state.currentRound === "khoiDong"
      ? state.khoiDong?.timer
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

  return (
    <div className="fixed inset-0 w-full h-full min-h-screen overflow-hidden bg-gradient-to-b from-[#070b1e] via-[#0c1433] to-[#040611] text-white p-2 sm:p-3 flex flex-col justify-between gap-2 select-none">
      {/* ═══════════════════════════════════════════════════════════════════════
          TOP 70% DISPLAY AREA (Header + 4-Contestant Score Cards + Question Box)
         ═══════════════════════════════════════════════════════════════════════ */}
      <div className="flex-[7] min-h-0 flex flex-col gap-2 overflow-hidden">
        {/* 1. Round Header + Sub-status + Bell Test Mode Indicator */}
        <div className="shrink-0 flex items-center justify-between gap-2 rounded-xl bg-slate-950/85 border border-white/15 px-3 py-1.5">
          <div className="flex items-center gap-2 min-w-0">
            <span
              className="px-2.5 py-0.5 rounded-lg text-xs sm:text-sm font-black uppercase tracking-wider shrink-0"
              style={{
                background: "linear-gradient(135deg, #c62828 0%, #8e0000 100%)",
                border: "1px solid rgba(255,255,255,0.25)",
              }}
            >
              {state.currentRound ? ROUND_LABELS[state.currentRound] : state.stage === "lobby" ? "PHÒNG CHỜ" : "KẾT THÚC"}
            </span>
            <span className="text-xs sm:text-sm font-bold text-slate-300 truncate">
              {getSubRoundLabel(state)}
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {state.bellTestMode && (
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500/25 border border-amber-400 text-amber-300 text-[11px] sm:text-xs font-black animate-pulse">
                🔔 CHẾ ĐỘ THỬ CHUÔNG {myTestLog ? `(Hạng #${myTestLog.order})` : ""}
              </span>
            )}
            <span className="text-[11px] sm:text-xs font-bold text-slate-400">
              Ghế {me.id + 1} {connected ? "🟢" : "🔴"}
            </span>
          </div>
        </div>

        {/* 2. Fixed 4-Contestant Live Score Cards Bar (matching D:\Olympia 26\public\contestant) */}
        <div
          className={`shrink-0 grid gap-1.5 sm:gap-2.5 ${
            seats.length <= 4 ? "grid-cols-4" : "grid-cols-4 sm:grid-cols-6"
          }`}
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

            return (
              <div
                key={s.id}
                className={`h-14 sm:h-16 rounded-xl px-2.5 py-1.5 flex flex-col justify-between transition-all relative overflow-hidden ${
                  isMe
                    ? "border-2 border-red-500 bg-gradient-to-b from-red-950/75 via-slate-900/95 to-slate-950 shadow-[0_0_16px_rgba(239,68,68,0.45)]"
                    : isBuzzed
                    ? "border-2 border-amber-400 bg-amber-950/50 shadow-[0_0_14px_rgba(245,158,11,0.4)]"
                    : "border border-white/15 bg-slate-900/80"
                }`}
                style={{
                  borderLeftWidth: "4px",
                  borderLeftColor: isMe ? "#ef4444" : SEAT_COLORS[s.id] || "#38bdf8",
                }}
              >
                <div className="flex items-center justify-between gap-1 min-w-0">
                  <span
                    className={`text-[11px] sm:text-xs font-extrabold uppercase truncate ${
                      isMe ? "text-amber-300" : "text-slate-300"
                    }`}
                  >
                    {s.name || `TS ${s.id + 1}`}
                  </span>
                  <div className="flex items-center gap-0.5 shrink-0">
                    {isMe && (
                      <span className="px-1 py-0.2 rounded bg-red-600 text-[9px] font-black text-white uppercase">
                        BẠN
                      </span>
                    )}
                    {isBuzzed && <span className="text-xs animate-bounce">🔔</span>}
                    {isLocked && <span className="text-xs text-rose-400">🔒</span>}
                  </div>
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="text-[10px] text-slate-400 font-semibold">#{s.id + 1}</span>
                  <span
                    className={`text-lg sm:text-2xl font-black tabular-nums leading-none ${
                      isMe ? "text-white" : "text-amber-300"
                    }`}
                  >
                    {s.score}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* 3. Fixed Question & Media Box */}
        <div className="flex-1 min-h-0 rounded-2xl bg-slate-950/85 border-2 border-white/15 p-3 sm:p-5 flex flex-col justify-between relative overflow-hidden shadow-inner">
          {/* VCNV sub-tabs inside Question Box so bottom 30% never shifts */}
          {state.stage === "playing" && state.currentRound === "vcnv" && state.vcnv && (
            <div className="shrink-0 flex items-center justify-between gap-2 mb-2 pb-2 border-b border-white/10">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setVcnvTab("question")}
                  className={`px-3 py-1 rounded-lg font-black text-xs border transition cursor-pointer ${
                    vcnvTab === "question"
                      ? "bg-red-600 text-white border-red-400 shadow"
                      : "bg-white/5 text-slate-300 border-white/10 hover:bg-white/10"
                  }`}
                >
                  ❓ Câu hỏi hàng ngang
                </button>
                <button
                  type="button"
                  onClick={() => setVcnvTab("pieces")}
                  className={`px-3 py-1 rounded-lg font-black text-xs border transition cursor-pointer ${
                    vcnvTab === "pieces"
                      ? "bg-amber-400 text-slate-950 border-amber-300 shadow"
                      : "bg-white/5 text-slate-300 border-white/10 hover:bg-white/10"
                  }`}
                >
                  🧩 4 Miếng ghép & CNV ({state.vcnv.keywordLength ?? (state.vcnv.keyword ? state.vcnv.keyword.replace(/\s+/g, "").length : "?")} chữ cái)
                </button>
              </div>
              {state.vcnv.eliminatedSeats.includes(me.id) && (
                <span className="text-xs font-black text-rose-400 bg-rose-950/60 border border-rose-500/40 px-2.5 py-0.5 rounded-lg">
                  🔒 Đã dừng quyền chơi VCNV
                </span>
              )}
            </div>
          )}

          {/* Main Question / Content Area */}
          <div className="flex-1 min-h-0 flex flex-col items-center justify-center text-center overflow-y-auto no-scrollbar px-2">
            <QuestionBoxContent
              state={state}
              seatId={me.id}
              emit={emit}
              vcnvTab={vcnvTab}
            />
          </div>

          {/* Bottom Timer Bar inside Question Box */}
          <div className="shrink-0 pt-2">
            {activeTimer && <Timer timer={activeTimer} serverNow={serverNow} />}
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          BOTTOM 30% FIXED INTERACTION AREA (Buzzer / Answer Input / CNV Bell)
         ═══════════════════════════════════════════════════════════════════════ */}
      <div className="h-[30%] min-h-[160px] max-h-[225px] shrink-0 rounded-2xl bg-slate-950/95 border-2 border-white/15 px-3 sm:px-6 py-2.5 flex items-center justify-center relative overflow-hidden shadow-2xl">
        <InteractionZone
          state={state}
          seatId={me.id}
          emit={emit}
          triggerBuzz={triggerBuzz}
          serverNow={serverNow}
        />
      </div>
    </div>
  );
}

function getSubRoundLabel(state: OlympiaState): string {
  if (state.stage === "lobby") return "Đang chờ quản trò bắt đầu trận đấu";
  if (state.stage === "finished") return "Trận đấu đã kết thúc";
  if (state.introTimer) return "Giới thiệu trận đấu";
  if (state.banner) return state.banner;

  switch (state.currentRound) {
    case "khoiDong": {
      const kd = state.khoiDong;
      if (!kd) return "";
      const seg = kd.segments[kd.segIdx];
      const qNum = kd.qIdx >= 0 ? ` · Câu ${kd.qIdx + 1}${seg.questions < 100 ? `/${seg.questions}` : ""}` : "";
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
        return `Hàng ngang số ${v.currentRow + 1} (${lc} chữ cái) · CNV: ${kwLen} chữ cái`;
      }
      if (v.currentRow === 4) {
        return `Ô trung tâm · CNV: ${kwLen} chữ cái`;
      }
      return `Chướng ngại vật gồm ${kwLen} chữ cái`;
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
      return `Câu hỏi phụ ${cp.qIdx >= 0 ? `#${cp.qIdx + 1}` : ""}`;
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
}: {
  state: OlympiaState;
  seatId: number;
  emit: Emit;
  vcnvTab: "question" | "pieces";
}) {
  if (state.stage === "lobby") {
    return (
      <div className="text-slate-300 text-lg sm:text-xl font-bold">
        Đã kết nối máy thí sinh. Chờ MC bắt đầu trận đấu…
      </div>
    );
  }
  if (state.stage === "finished") {
    const myScore = state.seats[seatId]?.score ?? 0;
    return (
      <div className="space-y-2">
        <div className="text-2xl sm:text-3xl font-black text-amber-300">TRẬN ĐẤU KẾT THÚC</div>
        <div className="text-lg text-white">
          Điểm chung cuộc của bạn: <b className="text-amber-300 text-2xl">{myScore}</b>
        </div>
      </div>
    );
  }
  if (state.introTimer) {
    return (
      <div className="space-y-2">
        <div className="text-2xl sm:text-3xl font-black tracking-widest uppercase text-cyan-300 animate-pulse">
          SẴN SÀNG THI ĐẤU
        </div>
        <div className="text-slate-400 text-sm">Đang phát nhạc giới thiệu trận đấu…</div>
      </div>
    );
  }
  if (state.banner) {
    return (
      <div className="text-2xl sm:text-4xl font-black uppercase tracking-widest text-amber-300">
        {state.banner}
      </div>
    );
  }

  switch (state.currentRound) {
    case "khoiDong": {
      const kd = state.khoiDong;
      if (!kd || !kd.started || kd.phase === "segmentDone") {
        return <div className="text-slate-400 text-base sm:text-lg font-semibold">Đang đợi bắt đầu lượt Khởi động…</div>;
      }
      if (!kd.questionRevealed || !kd.current) {
        return <div className="text-sky-300 text-lg sm:text-xl font-black uppercase animate-pulse">Sẵn sàng thi đấu…</div>;
      }
      return (
        <div className="space-y-2 w-full max-w-3xl">
          <div className="text-white text-lg sm:text-xl md:text-2xl font-bold leading-relaxed select-text">
            {kd.current.q}
          </div>
          {kd.current.media && (
            <MediaView url={kd.current.media} type={kd.current.mediaType} className="max-h-28 sm:max-h-36 rounded-xl mx-auto" />
          )}
          {kd.phase === "result" && kd.current.a && (
            <div className="mt-2 inline-block px-4 py-1.5 rounded-xl bg-emerald-950/80 border border-emerald-400 text-emerald-300 font-black text-base sm:text-lg">
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
                  className={`rounded-xl p-2.5 border flex items-center justify-between gap-2 ${
                    isSolved
                      ? "bg-emerald-950/60 border-emerald-400/60 text-white"
                      : row?.opened
                      ? "bg-rose-950/40 border-rose-500/40 text-slate-300"
                      : "bg-slate-900/80 border-white/10 text-slate-300"
                  }`}
                >
                  <div className="min-w-0">
                    <div className="text-[11px] font-black uppercase text-amber-300">
                      Hàng ngang {rIdx + 1} ({lc} chữ cái)
                    </div>
                    <div className="text-xs sm:text-sm font-bold truncate mt-0.5">
                      {isSolved ? row?.answer || "Đã mở" : row?.opened ? "Đã mở (Không có ĐA đúng)" : "🔒 Chưa mở"}
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-blue-600 text-white font-black text-xs shrink-0">
                    {lc} ô
                  </span>
                </div>
              );
            })}
          </div>
        );
      }

      if (v.currentRow < 0) {
        return <div className="text-slate-400 text-base sm:text-lg font-semibold">Đang đợi MC chọn hàng ngang…</div>;
      }
      if (v.phase === "selecting") {
        const lc = v.currentRow < 4 ? v.rows[v.currentRow]?.letterCount || v.rows[v.currentRow]?.answer?.length || "?" : "";
        return (
          <div className="space-y-1">
            <div className="text-amber-300 text-lg sm:text-xl font-black uppercase">
              {v.currentRow < 4 ? `HÀNG NGANG SỐ ${v.currentRow + 1} (${lc} CHỮ CÁI)` : "⭐ Ô TRUNG TÂM"}
            </div>
            <div className="text-slate-400 text-sm">Đã chọn hàng ngang. Đang đợi mở câu hỏi…</div>
          </div>
        );
      }
      if (v.currentRow < 4) {
        const row = v.rows[v.currentRow];
        const lc = row?.letterCount || row?.answer?.length || "?";
        return (
          <div className="space-y-1.5 max-w-3xl">
            <div className="text-sky-300 text-xs sm:text-sm font-black uppercase tracking-wider">
              Hàng ngang số {v.currentRow + 1} ({lc} chữ cái)
            </div>
            <div className="text-white text-lg sm:text-xl md:text-2xl font-bold leading-relaxed select-text">
              {row?.hint || "Đang tải câu hỏi…"}
            </div>
          </div>
        );
      }
      return (
        <div className="space-y-1.5 max-w-3xl">
          <div className="text-amber-400 text-xs sm:text-sm font-black uppercase tracking-wider">⭐ CÂU HỎI Ô TRUNG TÂM</div>
          <div className="text-white text-lg sm:text-xl md:text-2xl font-bold leading-relaxed select-text">
            {v.centerQuestion?.q || "Đang tải câu hỏi trung tâm…"}
          </div>
        </div>
      );
    }

    case "tangToc": {
      const tt = state.tangToc;
      if (!tt || tt.qIdx < 0 || tt.phase === "idle") {
        return <div className="text-slate-400 text-base sm:text-lg font-semibold">Chuẩn bị mở câu hỏi Tăng Tốc…</div>;
      }
      const q = tt.questions[tt.qIdx];
      return (
        <div className="space-y-2 w-full max-w-3xl">
          <div className="text-white text-base sm:text-lg md:text-xl font-bold leading-relaxed select-text">
            {q?.q || "Quan sát dữ kiện trên màn hình chính"}
          </div>
          {q?.media && (
            <MediaView url={q.media} className="max-h-28 sm:max-h-36 rounded-xl mx-auto" />
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

      if (vd.phase === "choosing") {
        if (owner === seatId) {
          return (
            <PackagePicker
              options={allowedPointOptions}
              count={questionCount}
              selectionMode={rs.selectionMode}
              presetPackages={rs.presetPackages}
              emit={emit}
            />
          );
        }
        return (
          <div className="text-amber-300 text-lg sm:text-xl font-bold">
            {seatName(state, owner)} đang lựa chọn gói câu hỏi Về Đích…
          </div>
        );
      }

      if (!vd.current) {
        const pkg = vd.packages[owner];
        return (
          <div className="space-y-2">
            <div className="text-amber-300 text-sm sm:text-base font-bold uppercase">
              Gói câu hỏi của {seatName(state, owner)}
            </div>
            {pkg && (
              <div className="flex items-center justify-center gap-3">
                {pkg.map((p, i) => (
                  <div
                    key={i}
                    className="px-4 py-2 rounded-xl bg-red-600/80 border border-amber-300 text-white font-black text-xl"
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
        <div className="space-y-2 w-full max-w-3xl">
          <div className="flex items-center justify-center gap-2 text-xs sm:text-sm font-black text-amber-300 uppercase">
            <span>Câu {vd.qIdx + 1} · {vd.current.points} điểm</span>
            {vd.hopeStarActive && <span className="text-yellow-300">⭐ NGÔI SAO HY VỌNG</span>}
          </div>
          <div className="text-white text-lg sm:text-xl md:text-2xl font-bold leading-relaxed select-text">
            {vd.current.q.q}
          </div>
          {vd.current.q.media && (
            <MediaView url={vd.current.q.media} type={vd.current.q.mediaType} className="max-h-28 sm:max-h-36 rounded-xl mx-auto" />
          )}
          {vd.phase === "result" && vd.current.q.a && (
            <div className="mt-1 inline-block px-4 py-1 rounded-xl bg-emerald-950/80 border border-emerald-400 text-emerald-300 font-black text-sm sm:text-base">
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
        return <div className="text-slate-400 text-base sm:text-lg font-semibold">Chuẩn bị Câu hỏi phụ…</div>;
      }
      return (
        <div className="space-y-2 max-w-3xl">
          <div className="text-white text-lg sm:text-xl md:text-2xl font-bold leading-relaxed select-text">
            {q.q}
          </div>
          {cp.phase === "result" && q.a && (
            <div className="text-emerald-300 font-black text-lg">✔ Đáp án: {q.a}</div>
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
}: {
  state: OlympiaState;
  seatId: number;
  emit: Emit;
  triggerBuzz: () => void;
  serverNow: () => number;
}) {
  // 1. Bell Test Mode overrides the bottom 30% zone so contestants can test their buzzer anytime
  if (state.bellTestMode) {
    const myLog = state.bellTestLogs?.find((b) => b.seat === seatId);
    return (
      <div className="w-full h-full flex items-center justify-center gap-6">
        <CircularBuzzer3D
          enabled={!myLog}
          onPress={triggerBuzz}
          label={myLog ? `ĐÃ THỬ (#${myLog.order})` : "THỬ CHUÔNG"}
          subLabel={myLog ? "Tín hiệu chuông tốt" : "Nhấn hoặc phím Space"}
        />
        <div className="hidden sm:flex flex-col gap-1 text-left max-w-xs">
          <div className="text-amber-300 font-black text-sm uppercase">🔔 Chế độ kiểm tra chuông</div>
          <div className="text-xs text-slate-300">
            Bấm thử chuông để kiểm tra độ nhạy bàn phím (Space) hoặc chuột trước khi vào phần thi chính thức.
          </div>
          {myLog && (
            <div className="text-emerald-400 text-xs font-bold mt-1">
              ✔ Máy chủ đã ghi nhận tín hiệu chuông của bạn (Thứ tự #{myLog.order}).
            </div>
          )}
        </div>
      </div>
    );
  }

  if (state.stage !== "playing" || state.introTimer || state.banner) {
    return (
      <div className="text-slate-500 text-sm font-bold uppercase tracking-wider">
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
          <div className="text-center space-y-1">
            <div className={`text-base sm:text-lg font-black uppercase ${isMyTurn ? "text-amber-300" : "text-slate-400"}`}>
              {isMyTurn ? "🎙️ Phần thi Khởi động riêng — Trả lời trực tiếp với MC" : `Đang là lượt Khởi động riêng của ${seatName(state, seg.seat)}`}
            </div>
            <div className="text-xs text-slate-500">Phần Khởi động riêng không sử dụng chuông bấm</div>
          </div>
        );
      }

      const locked = kd.lockedSeats.includes(seatId);
      const unlockRemainingMs = kd.buzzUnlockAt ? Math.max(0, kd.buzzUnlockAt - now) : 0;
      const isCountingDownUnlock = kd.phase === "question" && unlockRemainingMs > 0;
      const canBuzz =
        kd.phase === "question" &&
        !locked &&
        kd.buzzedSeat == null &&
        !isCountingDownUnlock &&
        (kd.buzzOpen || Boolean(kd.buzzUnlockAt && now >= kd.buzzUnlockAt));

      const label =
        kd.buzzedSeat === seatId
          ? "ĐÃ BẤM CHUÔNG"
          : locked
          ? "ĐÃ KHÓA CÂU NÀY"
          : isCountingDownUnlock
          ? `MỞ SAU ${(unlockRemainingMs / 1000).toFixed(1)}s`
          : "BẤM CHUÔNG";

      const subLabel =
        kd.buzzedSeat != null
          ? `🔔 ${seatName(state, kd.buzzedSeat)} giành quyền`
          : isCountingDownUnlock
          ? state.rulesetId === "O22"
            ? "Luật O22: Mở chuông sau 2s"
            : "Luật O23-O26: Mở chuông sau 5s"
          : canBuzz
          ? "Nhấn hoặc phím Space"
          : "Chờ mở chuông";

      return (
        <CircularBuzzer3D
          enabled={canBuzz}
          onPress={triggerBuzz}
          label={label}
          subLabel={subLabel}
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
        <div className="w-full h-full flex items-center justify-between gap-3 sm:gap-5">
          {/* Left / Center: Fixed Horizontal Answer Input Bar */}
          <div className="flex-1 min-w-0 flex flex-col justify-center gap-2">
            <HorizontalAnswerBar
              enabled={canAnswerRow}
              emit={emit}
              placeholder={
                out || hasBuzzed
                  ? "Đã dừng quyền nhập đáp án hàng ngang"
                  : "Nhập đáp án hàng ngang rồi nhấn Enter hoặc GỬI…"
              }
              resetKey={`vcnv_${v.currentRow}`}
              serverSubmittedText={submittedText}
            />
            {(hasBuzzed || out) && (
              <div className="text-xs sm:text-sm font-extrabold text-amber-300 flex items-center gap-1.5">
                <span>🔔</span>
                <span>
                  {hasBuzzed
                    ? "Bạn đã bấm chuông CNV — Hệ thống đã dừng phần chơi VCNV để chờ MC chấm."
                    : "Quyền chơi VCNV đang khóa (MC có thể mở lại nếu bấm nhầm)."}
                </span>
              </div>
            )}
          </div>

          {/* Fixed Bottom-Right: CNV Buzzer Button */}
          <div className="shrink-0 flex flex-col items-center justify-center">
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
              className={`w-28 h-28 sm:w-32 sm:h-32 rounded-2xl font-black text-xs sm:text-sm uppercase tracking-wider border-4 flex flex-col items-center justify-center gap-1 transition active:scale-95 cursor-pointer shadow-xl ${
                canBuzzCnv
                  ? "bg-gradient-to-b from-amber-500 via-red-600 to-rose-700 border-amber-300 text-white shadow-[0_0_25px_rgba(239,68,68,0.65)]"
                  : "bg-slate-800 border-slate-700 text-slate-500 cursor-not-allowed opacity-60"
              }`}
            >
              <span className="text-2xl sm:text-3xl">🔔</span>
              <span className="text-center leading-tight px-1">
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
            placeholder="Nhập đáp án Tăng Tốc rồi nhấn Enter hoặc GỬI…"
            resetKey={`tt_${tt.qIdx}`}
            serverSubmittedText={sub ? `${sub.answer} (${(sub.ms / 1000).toFixed(2)}s)` : undefined}
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
          ? "Nhấn hoặc phím Space ngay!"
          : "Chuông chỉ mở khi thí sinh trả lời sai";

      return (
        <CircularBuzzer3D
          enabled={canSteal}
          onPress={triggerBuzz}
          label={label}
          subLabel={subLabel}
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
              ? "Nhấn hoặc phím Space"
              : "Chờ mở chuông"
          }
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
}: {
  enabled: boolean;
  onPress: () => void;
  label: string;
  subLabel?: string;
}) {
  const lastFiredRef = useRef<number>(0);
  const fireOnce = () => {
    if (!enabled) return;
    const now = Date.now();
    if (now - lastFiredRef.current < 300) return;
    lastFiredRef.current = now;
    onPress();
  };

  return (
    <div className="flex items-center justify-center gap-4 sm:gap-6">
      <button
        type="button"
        disabled={!enabled}
        onPointerDown={(e) => {
          if (!enabled) return;
          e.preventDefault();
          fireOnce();
        }}
        onClick={fireOnce}
        className={`w-32 h-32 sm:w-36 sm:h-36 rounded-full font-black text-xs sm:text-sm uppercase tracking-wider border-4 sm:border-[6px] flex flex-col items-center justify-center gap-1 transition transform active:scale-95 cursor-pointer shrink-0 ${
          enabled
            ? "bg-gradient-to-b from-red-500 via-red-600 to-rose-800 border-amber-300 text-white shadow-[0_0_35px_rgba(239,68,68,0.8),inset_0_4px_12px_rgba(255,255,255,0.4)] animate-pulse"
            : "bg-slate-800/90 border-slate-700 text-slate-400 cursor-not-allowed opacity-70 shadow-inner"
        }`}
      >
        <span className="text-2xl sm:text-3xl">🔔</span>
        <span className="px-2 text-center leading-tight">{label}</span>
      </button>
      {subLabel && (
        <div className="text-left max-w-[200px] sm:max-w-xs">
          <div className={`text-xs sm:text-sm font-black uppercase ${enabled ? "text-amber-300" : "text-slate-400"}`}>
            {label}
          </div>
          <div className="text-[11px] sm:text-xs text-slate-300 mt-0.5">{subLabel}</div>
        </div>
      )}
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
}: {
  enabled: boolean;
  emit: Emit;
  event?: string;
  placeholder?: string;
  resetKey?: string | number;
  serverSubmittedText?: string;
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
    setLastSubmitted(submittedText);
    const r = await emit(event, { text: submittedText });
    setMsg(r.ok ? "✔ Đã ghi nhận" : r.error || "Lỗi khi gửi");
  };

  const displaySubmitted = serverSubmittedText || lastSubmitted;

  return (
    <div className="w-full space-y-2 select-text">
      <div className="flex items-stretch gap-2 w-full h-12 sm:h-14">
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
          className="flex-1 min-w-0 rounded-xl bg-slate-900 border-2 border-white/25 px-4 text-base sm:text-xl font-bold text-white outline-none focus:border-cyan-400 disabled:opacity-50 select-text"
          autoComplete="off"
          spellCheck="false"
        />
        <button
          type="button"
          disabled={!enabled || !text.trim()}
          onClick={send}
          className="px-5 sm:px-7 rounded-xl bg-gradient-to-r from-red-600 to-amber-500 hover:from-red-500 hover:to-amber-400 active:scale-95 transition text-white font-black text-sm sm:text-base uppercase tracking-wider disabled:opacity-40 cursor-pointer shrink-0 shadow-lg"
        >
          GỬI
        </button>
      </div>

      <div className="flex items-center justify-between gap-2 text-xs sm:text-sm min-h-[24px]">
        {displaySubmitted ? (
          <div className="font-bold text-emerald-300 bg-emerald-950/50 border border-emerald-500/40 rounded-lg py-1 px-3 truncate">
            Đáp án đã gửi: <span className="text-white font-black uppercase">{displaySubmitted}</span>
          </div>
        ) : (
          <div className="text-slate-500 text-xs">Chưa gửi đáp án ở lượt này</div>
        )}
        {msg && <span className="text-amber-300 font-bold shrink-0">{msg}</span>}
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
}: {
  options: number[];
  count: number;
  selectionMode?: "presetPackages" | "customPoints";
  presetPackages?: Record<string, number[]>;
  emit: Emit;
}) {
  const [pts, setPts] = useState<number[]>(Array(count).fill(options[0] ?? 20));
  const [msg, setMsg] = useState("");

  useEffect(() => {
    setPts(Array(count).fill(options[0] ?? 20));
  }, [count, options]);

  if (selectionMode === "presetPackages" && presetPackages) {
    return (
      <div className="space-y-3 rounded-xl bg-white/5 p-3 max-w-md w-full">
        <div className="text-center font-bold text-amber-300">Chọn gói câu hỏi cố định ({count} câu)</div>
        <div className="grid grid-cols-3 gap-2">
          {Object.entries(presetPackages).map(([pkgKey, pkgPoints]) => (
            <button
              key={pkgKey}
              type="button"
              className="rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-base py-2.5 px-2 cursor-pointer"
              onClick={async () => {
                const r = await emit("pick", { points: pkgPoints });
                setMsg(r.ok ? `Đã chọn Gói ${pkgKey}đ` : r.error || "Lỗi");
              }}
            >
              Gói {pkgKey}đ
              <div className="text-xs font-semibold opacity-80">({pkgPoints.join("-")})</div>
            </button>
          ))}
        </div>
        {msg && <div className="text-center text-sm text-emerald-300 font-bold">{msg}</div>}
      </div>
    );
  }
  return (
    <div className="space-y-2.5 rounded-xl bg-white/5 border border-white/10 p-3 max-w-md w-full">
      <div className="text-center text-sm font-bold text-amber-300">
        Chọn mức điểm cho {count} câu hỏi Về Đích ({options.map((o) => `${o}đ`).join(" / ")})
      </div>
      <div className="flex justify-center gap-2">
        {pts.map((p, i) => (
          <select
            key={i}
            value={p}
            className="bg-slate-900 border border-white/25 rounded-lg px-3 py-2 text-lg font-black text-amber-300"
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
        className="w-full rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-base py-2.5 cursor-pointer"
        onClick={async () => {
          const r = await emit("pick", { points: pts });
          setMsg(r.ok ? "✔ Đã xác nhận gói câu hỏi" : r.error || "Lỗi");
        }}
      >
        ✔ XÁC NHẬN GÓI ({pts.reduce((a, b) => a + b, 0)}Đ)
      </button>
      {msg && <div className="text-center text-xs text-emerald-300 font-bold">{msg}</div>}
    </div>
  );
}
