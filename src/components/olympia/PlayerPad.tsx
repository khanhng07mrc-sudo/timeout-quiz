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

  const { state, join, connected, emit, serverNow } = useOlympiaSocket({
    code,
    role: "player",
    name: name ?? "",
    token,
    enabled: name !== null && !!token,
  });
  const introRem = useCountdown(state?.introTimer, serverNow); void introRem; // kept for type compat

  if (name === null) return null;
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

function AnswerBox({ enabled, emit, event = "answer", placeholder }: { enabled: boolean; emit: Emit; event?: string; placeholder?: string }) {
  const [text, setText] = useState("");
  const [msg, setMsg] = useState("");
  const send = async () => {
    const r = await emit(event, { text });
    setMsg(r.ok ? "✔ Đã gửi" : r.error || "Lỗi");
  };
  return (
    <div className="space-y-2">
      <input
        value={text}
        disabled={!enabled}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && enabled && send()}
        placeholder={placeholder ?? "Nhập đáp án…"}
        className="w-full rounded-xl bg-slate-800 border border-white/20 px-4 py-4 text-2xl outline-none focus:border-sky-400 disabled:opacity-50"
      />
      <button disabled={!enabled} onClick={send} className="w-full rounded-xl bg-sky-500 text-slate-950 font-black text-xl py-3 disabled:opacity-40">
        GỬI
      </button>
      {msg && <div className="text-center text-sm text-slate-300">{msg}</div>}
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
      const v = state.vcnv!;
      const running = v.timer.startedAt != null;
      const out = v.eliminatedSeats.includes(seatId);
      return (
        <>
          {v.currentRow >= 0 && v.currentRow < 4 && <div className="text-center text-xl">Hàng {v.currentRow + 1}: {v.rows[v.currentRow].hint}</div>}
          {v.currentRow === 4 && v.centerQuestion && <div className="text-center text-xl text-amber-300">⭐ Ô Trung Tâm: {v.centerQuestion.q}</div>}
          <Timer timer={v.timer} serverNow={serverNow} />
          <AnswerBox enabled={running && !out && v.currentRow >= 0 && v.currentRow <= 4} emit={emit} />
          <BuzzButton enabled={!out && v.phase !== "done" && !v.bells.some((b) => b.seat === seatId)} onPress={() => emit("buzz")} label="CHƯỚNG NGẠI VẬT" />
          {out && <Center>Bạn đã bị loại khỏi lượt đoán chướng ngại vật</Center>}
        </>
      );
    }
    case "tangToc": {
      const tt = state.tangToc!;
      const q = tt.questions[tt.qIdx];
      return (
        <>
          {q?.q && tt.phase !== "idle" && <div className="text-center text-xl">{q.q}</div>}
          <Timer timer={tt.timer} serverNow={serverNow} />
          <AnswerBox enabled={tt.phase === "question" && tt.timer.startedAt != null} emit={emit} />
          <Center>Xem ảnh/video trên màn hình chiếu.</Center>
        </>
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
