"use client";

import { useEffect, useState } from "react";
import { RULESETS } from "@/lib/olympia/rulesets";
import { ROUND_LABELS, type OlympiaState } from "@/lib/olympia/types";
import { useCountdown, useOlympiaSocket, useStableToken } from "./hooks";
import { Timer, SEAT_COLORS, seatName } from "./ui";

export default function PlayerPad({ code }: { code: string }) {
  const token = useStableToken();
  const [name, setName] = useState<string | null>(null);
  useEffect(() => {
    setName(sessionStorage.getItem("playerName") || localStorage.getItem("playerName") || "");
  }, []);
  const { state, join, connected, emit, serverNow } = useOlympiaSocket({
    code,
    role: "player",
    name: name ?? "",
    token,
    enabled: name !== null && !!token,
  });

  if (name === null) return null;
  if (join && !join.ok) {
    return (
      <div className="min-h-screen bg-slate-950 text-white p-6 flex flex-col items-center justify-center gap-4">
        <div className="text-rose-300 text-lg text-center">{join.error}</div>
        <a href="/play" className="underline text-sky-300">
          ← Quay lại
        </a>
      </div>
    );
  }
  if (!state || join?.seatId == null) return <div className="min-h-screen bg-slate-950 text-sky-200 p-8">Đang kết nối…</div>;

  const me = state.seats[join.seatId];
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-950 to-slate-950 text-white p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between rounded-xl bg-white/5 border border-white/15 p-3" style={{ borderLeft: `6px solid ${SEAT_COLORS[me.id]}` }}>
        <div>
          <div className="text-xs text-slate-400">
            Ghế {me.id + 1} · {RULESETS[state.rulesetId].label} {connected ? "🟢" : "🔴"}
          </div>
          <div className="text-xl font-bold">{me.name}</div>
        </div>
        <div className="text-4xl font-black" style={{ color: SEAT_COLORS[me.id] }}>
          {me.score}
        </div>
      </div>

      <div className="text-center text-sky-300 font-semibold">{state.currentRound ? ROUND_LABELS[state.currentRound] : state.stage === "lobby" ? "Sảnh chờ" : ""}</div>

      <div className="flex-1 flex flex-col justify-center gap-4">
        {state.stage === "lobby" && <Center>Đã vào phòng. Chờ quản trò bắt đầu trận…</Center>}
        {state.stage === "finished" && <Center>Trận đấu kết thúc. Điểm của bạn: <b>{me.score}</b></Center>}
        {state.stage === "playing" && state.banner && <Center>{state.banner}</Center>}
        {state.stage === "playing" && !state.banner && (
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
      className={`mx-auto w-64 h-64 rounded-full text-3xl font-black border-8 transition active:scale-95 ${enabled ? "bg-red-500 border-red-300 shadow-[0_0_60px_rgba(239,68,68,0.8)]" : "bg-slate-700 border-slate-600 text-slate-400"}`}
    >
      🔔
      <br />
      {label}
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
        return (
          <Center>
            {seg.seat === seatId ? <b className="text-yellow-300">Đến lượt bạn trả lời!</b> : `Lượt thi của ${seatName(state, seg.seat)}`}
            {kd.current && <div className="mt-3 text-2xl font-semibold">{kd.current.q}</div>}
          </Center>
        );
      }
      const locked = kd.lockedSeats.includes(seatId);
      return (
        <>
          {kd.current && <div className="text-center text-2xl font-semibold">{kd.current.q}</div>}
          <BuzzButton enabled={kd.phase === "question" && kd.buzzOpen && !locked} onPress={() => emit("buzz")} />
          {locked && <Center>Bạn bị khóa chuông câu này</Center>}
          {kd.buzzedSeat != null && <Center>🔔 {seatName(state, kd.buzzedSeat)} đã bấm chuông</Center>}
        </>
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
