"use client";

import { useEffect, useState } from "react";
import { RULESETS } from "@/lib/olympia/rulesets";
import { ROUND_LABELS, type OlympiaState } from "@/lib/olympia/types";
import { useCountdown, useOlympiaSocket, useStableToken } from "./hooks";
import { Timer, SEAT_COLORS, seatName } from "./ui";

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
    setName(sessionStorage.getItem("playerName") || localStorage.getItem("playerName") || "");
  }, [initialName, initialSeat]);

  const [inputName, setInputName] = useState("");
  const { state, join, connected, emit, serverNow, kickedMessage } = useOlympiaSocket({
    code,
    role: "player",
    name: name ?? "",
    token,
    enabled: name !== null && !!token,
  });
  const introRem = useCountdown(state?.introTimer, serverNow); void introRem; // kept for type compat

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
                localStorage.setItem("playerName", trimmed);
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
  return (
    <div className="fixed inset-0 w-full h-full min-h-screen overflow-hidden bg-gradient-to-b from-[#080d24] via-[#0e173b] to-[#040714] text-white p-2 sm:p-3 flex flex-col justify-between gap-2">
      {/* Sleek compact single-line top bar */}
      <div
        className="flex items-center justify-between rounded-xl bg-black/40 border border-white/10 px-3 py-1.5 shrink-0 gap-2"
        style={{ borderLeft: `5px solid ${SEAT_COLORS[me.id]}` }}
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: SEAT_COLORS[me.id] }} />
          <span className="text-xs sm:text-sm font-black truncate text-white">{me.name}</span>
          <span className="text-[10px] text-slate-400 shrink-0 font-medium hidden xs:inline">
            · Ghế {me.id + 1} {connected ? "🟢" : "🔴"}
          </span>
        </div>
        <div className="flex items-center gap-2.5 shrink-0">
          <span className="text-[10px] sm:text-xs font-bold text-sky-300 uppercase tracking-wider bg-sky-500/10 px-2 py-0.5 rounded border border-sky-400/20">
            {state.currentRound ? ROUND_LABELS[state.currentRound] : state.stage === "lobby" ? "Sảnh" : ""}
          </span>
          <span
            className="text-lg sm:text-2xl font-black tabular-nums"
            style={{ color: SEAT_COLORS[me.id] }}
          >
            {me.score}
          </span>
        </div>
      </div>

      <div className="flex-1 min-h-0 flex flex-col justify-center items-center gap-2 overflow-hidden">
        {state.stage === "lobby" && <Center>Đã vào phòng. Chờ quản trò bắt đầu trận…</Center>}
        {state.stage === "finished" && <Center>Trận đấu kết thúc. Điểm của bạn: <b>{me.score}</b></Center>}
        {state.stage === "playing" && state.introTimer && (
          <div className="text-center space-y-3 px-4">
            <div
              className="text-2xl sm:text-3xl font-black tracking-widest uppercase animate-pulse"
              style={{
                background: "linear-gradient(135deg, #00bfff, #ffffff 50%, #1e90ff)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              SẴN SÀNG THI ĐẤU
            </div>
            <div className="text-slate-400 text-sm">Chờ MC bắt đầu trận đấu…</div>
          </div>
        )}
        {state.stage === "playing" && !state.introTimer && state.banner && <Center>{state.banner}</Center>}
        {state.stage === "playing" && !state.introTimer && !state.banner && (
          <Round state={state} seatId={me.id} emit={emit} serverNow={serverNow} />
        )}
      </div>
    </div>
  );
}

function Center({ children }: { children: React.ReactNode }) {
  return <div className="text-center text-xl text-slate-200 px-4">{children}</div>;
}

type Emit = (e: string, p?: unknown) => Promise<{ ok: boolean; error?: string }>;

function BuzzButton({ enabled, onPress, label = "BẤM CHUÔNG" }: { enabled: boolean; onPress: () => void; label?: string }) {
  return (
    <button
      disabled={!enabled}
      onClick={onPress}
      className={`mx-auto w-36 h-36 sm:w-44 sm:h-44 rounded-full text-base sm:text-xl font-black border-4 sm:border-6 transition active:scale-95 flex flex-col items-center justify-center cursor-pointer shadow-lg ${
        enabled
          ? "bg-gradient-to-b from-red-500 to-rose-600 border-red-300 text-white shadow-[0_0_36px_rgba(239,68,68,0.7)] animate-pulse"
          : "bg-slate-800 border-slate-700 text-slate-500 cursor-not-allowed opacity-60"
      }`}
    >
      <span className="text-2xl sm:text-3xl mb-0.5">🔔</span>
      <span>{label}</span>
    </button>
  );
}

function AnswerBox({
  enabled,
  emit,
  event = "answer",
  placeholder,
  resetKey,
}: {
  enabled: boolean;
  emit: Emit;
  event?: string;
  placeholder?: string;
  resetKey?: string | number;
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
    if (!text.trim()) return;
    const submittedText = text.trim();
    setText("");
    setLastSubmitted(submittedText);
    const r = await emit(event, { text: submittedText });
    setMsg(r.ok ? "✔ Đã gửi" : r.error || "Lỗi khi gửi");
  };

  return (
    <div className="w-full space-y-2 select-text">
      <input
        type="text"
        value={text}
        disabled={!enabled}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && enabled && send()}
        placeholder={placeholder ?? "Nhập đáp án…"}
        className="w-full rounded-xl bg-slate-800 border-2 border-white/20 px-4 py-3 sm:py-4 text-xl sm:text-2xl text-white outline-none focus:border-sky-400 disabled:opacity-50 select-text"
        autoComplete="off"
        spellCheck="false"
      />
      <button
        type="button"
        disabled={!enabled}
        onClick={send}
        className="w-full rounded-xl bg-sky-500 hover:bg-sky-400 active:scale-[0.99] transition text-slate-950 font-black text-lg sm:text-xl py-2.5 sm:py-3 disabled:opacity-40 cursor-pointer shadow-md"
      >
        GỬI
      </button>
      {lastSubmitted && (
        <div className="text-center text-sm sm:text-base font-bold text-emerald-300 bg-emerald-950/40 border border-emerald-500/30 rounded-lg py-1 px-2 select-text">
          Đáp án gần nhất: <span className="text-white font-extrabold underline">{lastSubmitted}</span>
        </div>
      )}
      {msg && <div className="text-center text-xs sm:text-sm text-slate-300">{msg}</div>}
    </div>
  );
}

function VcnvPlayerScreen({
  state,
  seatId,
  emit,
  serverNow,
}: {
  state: OlympiaState;
  seatId: number;
  emit: Emit;
  serverNow: () => number;
}) {
  const v = state.vcnv!;
  const running = v.timer.startedAt != null;
  const out = v.eliminatedSeats.includes(seatId);
  const [tab, setTab] = useState<"question" | "pieces">("question");

  useEffect(() => {
    if (v.phase === "question") {
      setTab("question");
    } else if (v.phase === "grid" || v.phase === "done") {
      setTab("pieces");
    }
  }, [v.phase]);

  const hasBuzzed = v.bells.some((b) => b.seat === seatId);

  return (
    <div className="w-full h-full flex flex-col justify-between max-w-lg mx-auto gap-2 py-1 select-none">
      {/* 2 Tabs Header */}
      <div className="grid grid-cols-2 gap-2 shrink-0">
        <button
          type="button"
          onClick={() => setTab("question")}
          className={`py-2 px-3 rounded-xl font-black text-xs sm:text-sm border transition flex items-center justify-center gap-1.5 cursor-pointer ${
            tab === "question"
              ? "bg-cyan-500 text-slate-950 border-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.5)]"
              : "bg-white/5 text-slate-300 border-white/10 hover:bg-white/10"
          }`}
        >
          <span>❓</span>
          <span className="truncate">Câu hỏi hàng ngang</span>
        </button>
        <button
          type="button"
          onClick={() => setTab("pieces")}
          className={`py-2 px-3 rounded-xl font-black text-xs sm:text-sm border transition flex items-center justify-center gap-1.5 cursor-pointer ${
            tab === "pieces"
              ? "bg-amber-400 text-slate-950 border-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.5)]"
              : "bg-white/5 text-slate-300 border-white/10 hover:bg-white/10"
          }`}
        >
          <span>🧩</span>
          <span className="truncate">Miếng ghép / CNV</span>
        </button>
      </div>

      {tab === "question" ? (
        <div className="flex-1 flex flex-col justify-between items-center gap-2 min-h-0 overflow-y-auto no-scrollbar w-full">
          {/* Question / Status Container */}
          <div className="w-full rounded-2xl bg-white/5 border border-white/10 p-3 sm:p-4 text-center shadow-inner flex flex-col items-center justify-center min-h-[90px] max-h-[160px] overflow-y-auto no-scrollbar">
            {v.currentRow < 0 ? (
              <div className="text-slate-400 text-sm font-semibold animate-pulse">
                Quản trò đang chuẩn bị chọn hàng ngang…
              </div>
            ) : v.phase === "selecting" ? (
              <div className="space-y-1">
                <div className="text-amber-300 text-base sm:text-lg font-black uppercase tracking-wider animate-pulse">
                  {v.currentRow < 4 ? `HÀNG NGANG SỐ ${v.currentRow + 1}` : "⭐ Ô TRUNG TÂM"}
                </div>
                <div className="text-slate-300 text-xs sm:text-sm">
                  Đã chọn. Đang đợi MC đọc và mở câu hỏi…
                </div>
              </div>
            ) : v.currentRow < 4 ? (
              <div className="space-y-1">
                <div className="text-sky-300 text-xs sm:text-sm font-black uppercase tracking-wider">
                  Hàng {v.currentRow + 1} ({v.rows[v.currentRow]?.letterCount || v.rows[v.currentRow]?.answer?.length || "?"} chữ cái)
                </div>
                <div className="text-white text-base sm:text-lg font-bold leading-relaxed select-text">
                  {v.rows[v.currentRow]?.hint || "Đang tải câu hỏi…"}
                </div>
              </div>
            ) : (
              <div className="space-y-1">
                <div className="text-amber-400 text-xs sm:text-sm font-black uppercase tracking-wider">
                  ⭐ Ô TRUNG TÂM
                </div>
                <div className="text-white text-base sm:text-lg font-bold leading-relaxed select-text">
                  {v.centerQuestion?.q || "Đang tải câu hỏi trung tâm…"}
                </div>
              </div>
            )}
          </div>

          <Timer timer={v.timer} serverNow={serverNow} />

          {/* Answer Box */}
          <div className="w-full">
            <AnswerBox
              enabled={running && !out && (v.phase === "question" || v.phase === "waitingAnswer") && v.currentRow >= 0 && v.currentRow <= 4}
              emit={emit}
              placeholder="Nhập đáp án hàng ngang…"
              resetKey={`${v.currentRow}`}
            />
          </div>

          {/* Buzz Button */}
          <div className="shrink-0 flex flex-col items-center gap-1">
            <BuzzButton
              enabled={!out && v.phase !== "done" && !hasBuzzed}
              onPress={() => emit("buzz")}
              label="CHƯỚNG NGẠI VẬT"
            />
            {hasBuzzed && (
              <div className="text-amber-300 text-xs sm:text-sm font-black animate-pulse">
                🔔 Bạn đã bấm chuông trả lời Chướng Ngại Vật!
              </div>
            )}
            {out && (
              <div className="text-rose-400 text-xs sm:text-sm font-bold text-center">
                Bạn đã bị loại khỏi lượt đoán Chướng ngại vật
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Tab 2: Pieces and CNV Overview */
        <div className="flex-1 flex flex-col justify-between items-center gap-2 min-h-0 overflow-y-auto no-scrollbar w-full">
          {/* Keyword Info Banner */}
          <div className="w-full rounded-2xl bg-gradient-to-r from-amber-950/40 via-purple-950/50 to-amber-950/40 border border-amber-500/30 p-2.5 sm:p-3 text-center shadow-md">
            <div className="text-[11px] font-black uppercase tracking-widest text-amber-300">
              TỪ KHÓA CHƯỚNG NGẠI VẬT
            </div>
            <div className="text-xl sm:text-2xl font-black font-mono tracking-widest text-white my-1 select-text">
              {v.keyword || "••••••••"}
            </div>
            <div className="text-xs text-amber-200/80 font-medium">
              Gồm {v.keyword.replace(/\s+/g, "").length} chữ cái
            </div>
          </div>

          {/* 4 Quadrants + Center Grid */}
          <div className="w-full max-w-sm aspect-video sm:aspect-[4/3] rounded-2xl bg-slate-900/90 border-2 border-white/20 p-2 relative grid grid-cols-2 grid-rows-2 gap-2 shadow-2xl overflow-hidden">
            {/* Quadrant 1: Row 1 */}
            <div
              className={`rounded-xl p-2 flex flex-col items-center justify-center text-center border transition ${
                v.piecesRevealed[0]
                  ? "bg-emerald-900/60 border-emerald-400 text-white shadow-inner"
                  : "bg-slate-800/80 border-slate-700 text-slate-400"
              }`}
            >
              <span className="text-xs font-black uppercase text-amber-300">Mảnh 1 (Hàng 1)</span>
              <span className="text-xs sm:text-sm font-bold mt-1 line-clamp-2">
                {v.rows[0]?.opened ? v.rows[0].answer : v.piecesRevealed[0] ? "ĐÃ MỞ" : "🔒 Khóa"}
              </span>
            </div>

            {/* Quadrant 2: Row 2 */}
            <div
              className={`rounded-xl p-2 flex flex-col items-center justify-center text-center border transition ${
                v.piecesRevealed[1]
                  ? "bg-emerald-900/60 border-emerald-400 text-white shadow-inner"
                  : "bg-slate-800/80 border-slate-700 text-slate-400"
              }`}
            >
              <span className="text-xs font-black uppercase text-amber-300">Mảnh 2 (Hàng 2)</span>
              <span className="text-xs sm:text-sm font-bold mt-1 line-clamp-2">
                {v.rows[1]?.opened ? v.rows[1].answer : v.piecesRevealed[1] ? "ĐÃ MỞ" : "🔒 Khóa"}
              </span>
            </div>

            {/* Quadrant 4: Row 4 (Bottom-Left) */}
            <div
              className={`rounded-xl p-2 flex flex-col items-center justify-center text-center border transition ${
                v.piecesRevealed[2]
                  ? "bg-emerald-900/60 border-emerald-400 text-white shadow-inner"
                  : "bg-slate-800/80 border-slate-700 text-slate-400"
              }`}
            >
              <span className="text-xs font-black uppercase text-amber-300">Mảnh 4 (Hàng 4)</span>
              <span className="text-xs sm:text-sm font-bold mt-1 line-clamp-2">
                {v.rows[3]?.opened ? v.rows[3].answer : v.piecesRevealed[2] ? "ĐÃ MỞ" : "🔒 Khóa"}
              </span>
            </div>

            {/* Quadrant 3: Row 3 (Bottom-Right) */}
            <div
              className={`rounded-xl p-2 flex flex-col items-center justify-center text-center border transition ${
                v.piecesRevealed[3]
                  ? "bg-emerald-900/60 border-emerald-400 text-white shadow-inner"
                  : "bg-slate-800/80 border-slate-700 text-slate-400"
              }`}
            >
              <span className="text-xs font-black uppercase text-amber-300">Mảnh 3 (Hàng 3)</span>
              <span className="text-xs sm:text-sm font-bold mt-1 line-clamp-2">
                {v.rows[2]?.opened ? v.rows[2].answer : v.piecesRevealed[3] ? "ĐÃ MỞ" : "🔒 Khóa"}
              </span>
            </div>

            {/* Center Piece 5 */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div
                className={`w-20 h-20 sm:w-24 sm:h-24 rounded-full flex flex-col items-center justify-center text-center border-2 shadow-2xl p-1 pointer-events-auto transition ${
                  v.piecesRevealed[4] || v.centerOpened
                    ? "bg-amber-600/90 border-amber-300 text-white"
                    : "bg-slate-950/90 border-violet-500/50 text-slate-400"
                }`}
              >
                <span className="text-[10px] font-black uppercase text-yellow-300">⭐ Ô 5</span>
                <span className="text-[11px] font-bold">
                  {v.centerOpened ? "ĐÃ MỞ" : v.piecesRevealed[4] ? "ĐÃ MỞ" : "Trung tâm"}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Buzzer in Tab 2 */}
          <div className="shrink-0 flex flex-col items-center gap-1">
            <BuzzButton
              enabled={!out && v.phase !== "done" && !hasBuzzed}
              onPress={() => emit("buzz")}
              label="BẤM CHUÔNG CNV"
            />
            {hasBuzzed && (
              <div className="text-amber-300 text-xs sm:text-sm font-black animate-pulse">
                🔔 Bạn đã bấm chuông trả lời Chướng Ngại Vật!
              </div>
            )}
            {out && (
              <div className="text-rose-400 text-xs sm:text-sm font-bold text-center">
                Bạn đã bị loại khỏi lượt đoán Chướng ngại vật
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Round({ state, seatId, emit, serverNow }: { state: OlympiaState; seatId: number; emit: Emit; serverNow: () => number }) {
  switch (state.currentRound) {
    case "khoiDong": {
      const kd = state.khoiDong!;
      const seg = kd.segments[kd.segIdx];
      if (seg.kind === "solo") {
        const isMyTurn = seg.seat === seatId;
        return (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2.5 max-w-lg mx-auto py-1">
            <div
              className={`px-3 py-1 rounded-full text-xs sm:text-sm font-black tracking-wide uppercase transition shrink-0 ${
                isMyTurn
                  ? "bg-amber-400/20 text-yellow-300 border border-amber-400/40 animate-pulse shadow-[0_0_12px_rgba(251,191,36,0.3)]"
                  : "bg-white/5 text-slate-400 border border-white/10"
              }`}
            >
              {isMyTurn ? "🎯 Đến lượt bạn trả lời!" : `Lượt thi của ${seatName(state, seg.seat)}`}
            </div>

            {/* Fixed question container */}
            <div className="w-full flex-1 min-h-[120px] max-h-[220px] rounded-2xl bg-white/5 border border-white/10 p-3 sm:p-4 flex flex-col items-center justify-center text-center shadow-inner overflow-y-auto no-scrollbar">
              {!kd.current ? (
                <div className="text-slate-400 text-sm sm:text-base font-medium animate-pulse">
                  Đang đợi câu hỏi…
                </div>
              ) : !kd.questionRevealed ? (
                <div className="text-sky-300 text-sm sm:text-base font-black animate-pulse uppercase tracking-wider">
                  Sẵn sàng thi đấu…
                </div>
              ) : (
                <div className="text-white text-base sm:text-lg md:text-xl font-bold leading-relaxed select-text">
                  {kd.current.q}
                </div>
              )}
            </div>
          </div>
        );
      }
      const locked = kd.lockedSeats.includes(seatId);
      return (
        <div className="w-full h-full flex flex-col items-center justify-between gap-2 max-w-lg mx-auto py-1">
          {/* Fixed question container */}
          <div className="w-full flex-1 min-h-[90px] max-h-[140px] rounded-2xl bg-white/5 border border-white/10 p-3 sm:p-4 flex flex-col items-center justify-center text-center shadow-inner overflow-y-auto no-scrollbar">
            {!kd.current ? (
              <div className="text-slate-400 text-sm sm:text-base font-medium animate-pulse">
                Đang đợi câu hỏi…
              </div>
            ) : !kd.questionRevealed ? (
              <div className="text-sky-300 text-sm sm:text-base font-black animate-pulse uppercase tracking-wider">
                Sẵn sàng thi đấu…
              </div>
            ) : (
              <div className="text-white text-base sm:text-lg font-bold leading-relaxed select-text">
                {kd.current.q}
              </div>
            )}
          </div>

          {/* Lock countdown or Buzzer button fixed */}
          <div className="shrink-0 flex flex-col items-center gap-1.5 py-1">
            {kd.buzzUnlockAt && kd.buzzUnlockAt > serverNow() && (
              <div className="text-center text-amber-300 font-black animate-pulse text-xs sm:text-sm">
                🔒 Chuông đang khóa: {Math.max(1, Math.ceil((kd.buzzUnlockAt - serverNow()) / 1000))}s
              </div>
            )}
            <BuzzButton
              enabled={kd.phase === "question" && kd.buzzOpen && !locked}
              onPress={() => emit("buzz")}
            />
            {locked && <div className="text-rose-400 text-xs font-bold">Bạn bị khóa chuông câu này</div>}
            {kd.buzzedSeat != null && (
              <div className="text-amber-300 text-xs sm:text-sm font-black">
                🔔 {seatName(state, kd.buzzedSeat)} đã bấm chuông
              </div>
            )}
          </div>
        </div>
      );
    }
    case "vcnv": {
      return <VcnvPlayerScreen state={state} seatId={seatId} emit={emit} serverNow={serverNow} />;
    }
    case "tangToc": {
      const tt = state.tangToc!;
      const q = tt.questions[tt.qIdx];
      return (
        <div className="w-full h-full flex flex-col items-center justify-between gap-2 max-w-lg mx-auto py-1">
          <div className="w-full flex-1 min-h-[70px] max-h-[120px] rounded-2xl bg-white/5 border border-white/10 p-3 flex flex-col items-center justify-center text-center shadow-inner overflow-y-auto no-scrollbar">
            {q?.q && tt.phase !== "idle" ? (
              <div className="text-white text-base sm:text-lg font-bold select-text">{q.q}</div>
            ) : (
              <div className="text-slate-400 text-sm animate-pulse">Theo dõi hình ảnh trên màn hình chiếu</div>
            )}
          </div>
          <Timer timer={tt.timer} serverNow={serverNow} />
          <AnswerBox
            enabled={tt.phase === "question" && tt.timer.startedAt != null}
            emit={emit}
            resetKey={tt.qIdx}
          />
          <div className="text-slate-400 text-xs text-center">Xem ảnh/video chi tiết trên màn hình chiếu</div>
        </div>
      );
    }
    case "veDich": {
      const vd = state.veDich!;
      const owner = vd.order[vd.turnIdx];
      const rs = RULESETS[state.rulesetId].veDich;
      return (
        <>
          <Center>
            Đang thi: <b style={{ color: SEAT_COLORS[owner] }}>{seatName(state, owner)}</b>
          </Center>
          {vd.phase === "choosing" && owner === seatId && (
            <PackagePicker
              options={rs.pointOptions}
              count={rs.questionsPerSeat}
              selectionMode={rs.selectionMode}
              presetPackages={rs.presetPackages}
              emit={emit}
            />
          )}
          {vd.current && <div className="text-center text-2xl font-semibold">{vd.current.q.q}</div>}
          {(vd.phase === "thinking" || vd.phase === "stealing") && <Timer timer={vd.phase === "stealing" && vd.steal ? vd.steal.timer : vd.timer} serverNow={serverNow} />}
          {vd.phase === "stealing" && owner !== seatId && (
            <BuzzButton enabled={!!vd.steal?.open && vd.steal.buzzedSeat == null} onPress={() => emit("buzz")} label="CƯỚP ĐIỂM" />
          )}
        </>
      );
    }
    case "cauHoiPhu": {
      const cp = state.cauHoiPhu!;
      const mine = cp.tied.includes(seatId);
      const q = cp.questions[cp.qIdx];
      return (
        <>
          {q && cp.phase !== "idle" && <div className="text-center text-2xl font-semibold">{q.q}</div>}
          {mine ? (
            <BuzzButton enabled={cp.phase === "question" && cp.buzzOpen && !cp.buzzedThisQuestion.includes(seatId)} onPress={() => emit("buzz")} />
          ) : (
            <Center>Bạn không thuộc nhóm đồng hạng — theo dõi trên màn hình.</Center>
          )}
          <PadTimer state={state} serverNow={serverNow} />
        </>
      );
    }
  }
  return null;
}

function PadTimer({ state, serverNow }: { state: OlympiaState; serverNow: () => number }) {
  const ms = useCountdown(state.cauHoiPhu?.timer, serverNow);
  return <div className="text-center text-3xl font-mono">{(ms / 1000).toFixed(1)}s</div>;
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
  const [pts, setPts] = useState<number[]>(Array(count).fill(options[0]));
  const [msg, setMsg] = useState("");
  if (selectionMode === "presetPackages" && presetPackages) {
    return (
      <div className="space-y-3 rounded-xl bg-white/5 p-3">
        <div className="text-center">Chọn gói câu hỏi cố định ({count} câu)</div>
        <div className="grid grid-cols-3 gap-2">
          {Object.entries(presetPackages).map(([pkgKey, pkgPoints]) => (
            <button
              key={pkgKey}
              className="rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-lg py-3 px-2"
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
        {msg && <div className="text-center text-sm">{msg}</div>}
      </div>
    );
  }
  return (
    <div className="space-y-3 rounded-xl bg-white/5 p-3">
      <div className="text-center">Chọn mức điểm cho {count} câu hỏi</div>
      <div className="flex justify-center gap-2">
        {pts.map((p, i) => (
          <select
            key={i}
            value={p}
            className="bg-slate-800 border border-white/20 rounded px-3 py-3 text-xl"
            onChange={(e) => setPts(pts.map((x, j) => (j === i ? Number(e.target.value) : x)))}
          >
            {options.map((o) => (
              <option key={o} value={o}>
                {o}đ
              </option>
            ))}
          </select>
        ))}
      </div>
      <button
        className="w-full rounded-xl bg-emerald-500 text-slate-950 font-black text-xl py-3"
        onClick={async () => {
          const r = await emit("pick", { points: pts });
          setMsg(r.ok ? "Đã chọn gói" : r.error || "Lỗi");
        }}
      >
        XÁC NHẬN GÓI
      </button>
      {msg && <div className="text-center text-sm">{msg}</div>}
    </div>
  );
}
