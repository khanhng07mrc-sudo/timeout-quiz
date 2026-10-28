"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import { OlympiaGame } from "@/lib/olympia/engine";
import { RULESETS, RULESET_LIST, RULESET_YEAR_BUTTONS, cnvPointsFor } from "@/lib/olympia/rulesets";
import { SAMPLE_QUESTION_SET } from "@/lib/olympia/sample-questions";
import { parseJsonSet, parseSheets } from "@/lib/olympia/excel-import";
import {
  ROUND_LABELS,
  ROUND_ORDER,
  type OlympiaQuestionSet,
  type OlympiaState,
  type RoundId,
  type RulesetId,
} from "@/lib/olympia/types";
import { getOlympiaBanks, getOlympiaBankById, type OlympiaBankItem } from "@/lib/olympia/olympia-storage";
import { useOlympiaAudio } from "./hooks";
import OlympiaQuestionStudioModal from "./OlympiaQuestionStudioModal";
import OlympiaTranscriptModal from "./OlympiaTranscriptModal";
import {
  MediaView,
  Panel,
  ScoreStrip,
  SEAT_COLORS,
  Timer,
  activeSeats,
  btn,
  btnBad,
  btnOk,
  btnPrimary,
  seatName,
} from "./ui";

const SELECTABLE_ROUNDS: RoundId[] = ROUND_ORDER.filter((r) => r !== "cauHoiPhu");
const DEFAULT_NAMES = [
  "Thí sinh 1",
  "Thí sinh 2",
  "Thí sinh 3",
  "Thí sinh 4",
  "Thí sinh 5",
  "Thí sinh 6",
  "Thí sinh 7",
  "Thí sinh 8",
];

export default function OlympiaSandboxStudio({
  onExit,
  selectedBankId,
}: {
  onExit: () => void;
  selectedBankId?: string;
}) {
  const [banks, setBanks] = useState<OlympiaBankItem[]>([]);
  const [activeBankId, setActiveBankId] = useState<string>(selectedBankId || "");
  const [rulesetId, setRulesetId] = useState<RulesetId>("O26");
  const [rounds, setRounds] = useState<RoundId[]>([...SELECTABLE_ROUNDS]);
  const [playerCount, setPlayerCount] = useState<number>(4);
  const [questionSet, setQuestionSet] = useState<OlympiaQuestionSet>(() => {
    if (selectedBankId) {
      const b = getOlympiaBankById(selectedBankId);
      if (b?.set) return b.set;
    }
    const all = getOlympiaBanks();
    return all[0]?.set || SAMPLE_QUESTION_SET;
  });
  const [audioOn, setAudioOn] = useState(true);
  const [err, setErr] = useState("");
  const [tickVer, setTickVer] = useState(0);
  const [checkedVcnv, setCheckedVcnv] = useState<number[]>([]);
  const [checkedTt, setCheckedTt] = useState<number[]>([]);
  const [vdPkgDraft, setVdPkgDraft] = useState<number[]>([20, 20, 20]);
  const [answersDraft, setAnswersDraft] = useState<Record<number, string>>({});
  const [showRulesInfo, setShowRulesInfo] = useState(false);
  const [showStudio, setShowStudio] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);

  const buildGame = useCallback(
    (rsId: RulesetId, rds: RoundId[], count: number, qSet: OlympiaQuestionSet) => {
      const g = new OlympiaGame("SANDBOX", { rulesetId: rsId, rounds: rds, questionSet: qSet });
      for (let i = 0; i < count; i++) {
        g.joinSeat(DEFAULT_NAMES[i] || `Thí sinh ${i + 1}`, `sb_${i}`);
      }
      return g;
    },
    []
  );

  const gameRef = useRef<OlympiaGame | null>(null);
  if (!gameRef.current) {
    gameRef.current = buildGame(rulesetId, rounds, playerCount, questionSet);
  }

  const refresh = useCallback(() => setTickVer((v) => v + 1), []);

  useEffect(() => {
    const loaded = getOlympiaBanks();
    setBanks(loaded);
    const targetId = selectedBankId || activeBankId || loaded[0]?.id;
    if (targetId) {
      setActiveBankId(targetId);
      const b = loaded.find((item) => item.id === targetId) || getOlympiaBankById(targetId);
      if (b?.set) {
        setQuestionSet(b.set);
        if (gameRef.current) {
          gameRef.current = buildGame(rulesetId, rounds, playerCount, b.set);
          refresh();
        }
      }
    }
  }, [selectedBankId]);

  const handleSwitchBank = (bankId: string) => {
    setActiveBankId(bankId);
    const b = banks.find((item) => item.id === bankId) || getOlympiaBankById(bankId);
    if (b?.set) {
      setQuestionSet(b.set);
      recreateGame(rulesetId, rounds, playerCount, b.set);
    }
  };

  // Re-initialize when lobby config changes
  const recreateGame = useCallback(
    (nextRs = rulesetId, nextRounds = rounds, nextCount = playerCount, nextSet = questionSet) => {
      gameRef.current = buildGame(nextRs, nextRounds, nextCount, nextSet);
      setCheckedVcnv([]);
      setCheckedTt([]);
      setErr("");
      const opts = RULESETS[nextRs].veDich.pointOptions;
      setVdPkgDraft(Array(RULESETS[nextRs].veDich.questionsPerSeat).fill(opts[0] ?? 20));
      refresh();
    },
    [buildGame, playerCount, questionSet, refresh, rounds, rulesetId]
  );

  useEffect(() => {
    const id = setInterval(() => {
      if (gameRef.current?.tick(Date.now())) refresh();
    }, 150);
    return () => clearInterval(id);
  }, [refresh]);

  const state: OlympiaState = useMemo(() => {
    void tickVer;
    return JSON.parse(JSON.stringify(gameRef.current!.state));
  }, [tickVer]);

  const rs = RULESETS[state.rulesetId];
  useOlympiaAudio(state, rs.audioSeason, audioOn);

  const act = (type: string, extra: Record<string, unknown> = {}) => {
    const r = gameRef.current!.hostAction({ type, ...extra }, Date.now());
    setErr(r.ok ? "" : r.error);
    refresh();
  };

  const simBuzz = (seatId: number) => {
    const r = gameRef.current!.playerBuzz(seatId, Date.now());
    setErr(r.ok ? "" : r.error);
    refresh();
  };

  const simAnswer = (seatId: number, text: string) => {
    const r = gameRef.current!.playerAnswer(seatId, text, Date.now());
    setErr(r.ok ? "" : r.error);
    refresh();
  };

  const simPick = (seatId: number, points: number[]) => {
    const r = gameRef.current!.playerPickPackage(seatId, points, Date.now());
    setErr(r.ok ? "" : r.error);
    refresh();
  };

  const onImportFile = async (file: File) => {
    try {
      if (file.name.toLowerCase().endsWith(".json")) {
        const res = parseJsonSet(JSON.parse(await file.text()));
        setQuestionSet(res.set);
        recreateGame(rulesetId, rounds, playerCount, res.set);
      } else {
        const buf = await file.arrayBuffer();
        const wb = XLSX.read(buf, { type: "array" });
        const sheets: Record<string, Record<string, unknown>[]> = {};
        for (const n of wb.SheetNames) sheets[n] = XLSX.utils.sheet_to_json(wb.Sheets[n], { defval: "" });
        const res = parseSheets(sheets, file.name.replace(/\.[^.]+$/, ""));
        setQuestionSet(res.set);
        recreateGame(rulesetId, rounds, playerCount, res.set);
      }
    } catch (e) {
      setErr("Lỗi đọc đề: " + (e as Error).message);
    }
  };

  const serverNow = useCallback(() => Date.now(), []);
  const seats = activeSeats(state);

  return (
    <div className="flex-1 min-h-0 overflow-y-auto rounded-2xl border border-white/15 bg-gradient-to-b from-slate-950 via-blue-950 to-slate-950 text-white p-3 sm:p-4 space-y-3">
      {/* Top configuration & toolbar */}
      <div className="rounded-xl bg-slate-900/90 border border-sky-500/30 px-3 py-2.5 space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-base font-black text-sky-300">🏔️ Olympia Sandbox All-in-One</span>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-cyan-500/20 border border-cyan-400/40 text-cyan-200">
              🎙 Mặc định: MC/Admin điều khiển & chấm điểm toàn quyền
            </span>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => setShowStudio(true)}
              className="px-2.5 py-1 rounded-lg bg-yellow-400 hover:bg-yellow-300 text-slate-950 text-xs font-black"
            >
              🛠 Kho đề Olympia
            </button>
            <button
              type="button"
              onClick={() => setShowTranscript(true)}
              className="px-2.5 py-1 rounded-lg bg-amber-500/25 hover:bg-amber-500/35 border border-amber-400/50 text-amber-200 text-xs font-bold"
            >
              📋 Biên bản ({(state.transcript ?? []).length})
            </button>
            <label className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 border border-white/20 text-xs font-bold cursor-pointer">
              📂 Đề Excel/JSON
              <input
                type="file"
                accept=".xlsx,.xls,.json"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && onImportFile(e.target.files[0])}
              />
            </label>
            <button type="button" className={btn} onClick={() => setAudioOn((v) => !v)}>
              {audioOn ? "🔊 Âm thanh" : "🔈 Tắt tiếng"}
            </button>
            <button type="button" className={btn} onClick={() => recreateGame()}>
              ↺ Reset trận
            </button>
            <button type="button" className={btnBad} onClick={onExit}>
              ✕ Đổi chế độ khác
            </button>
          </div>
        </div>

        {/* Compact Ruleset Selector + Rounds */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1.5 border-t border-white/10 text-xs">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="font-bold text-sky-300">Chọn bộ luật: Olympia năm thứ</span>
            <div className="flex flex-wrap items-center gap-1">
              {RULESET_YEAR_BUTTONS.map((btnItem) => {
                const active = rulesetId === btnItem.id;
                return (
                  <button
                    key={btnItem.id}
                    type="button"
                    title={btnItem.fullTitle}
                    onClick={() => {
                      setRulesetId(btnItem.id);
                      recreateGame(btnItem.id, rounds, playerCount, questionSet);
                    }}
                    className={`px-2.5 py-1 rounded-lg border font-black text-xs transition ${
                      active
                        ? "border-yellow-300 bg-yellow-300 text-slate-950"
                        : "border-white/15 bg-white/5 text-slate-200 hover:bg-white/10"
                    }`}
                  >
                    {btnItem.numberLabel}
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => setShowRulesInfo((v) => !v)}
                title="Xem chi tiết định nghĩa bộ luật"
                className={`w-6 h-6 rounded-full border flex items-center justify-center text-[11px] font-black transition ${
                  showRulesInfo
                    ? "border-yellow-300 bg-yellow-300 text-slate-950"
                    : "border-sky-400/50 bg-sky-500/15 text-sky-300"
                }`}
              >
                i
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <select
              value={playerCount}
              onChange={(e) => {
                const n = Number(e.target.value);
                setPlayerCount(n);
                recreateGame(rulesetId, rounds, n, questionSet);
              }}
              className="bg-slate-800 border border-white/20 rounded-lg px-2 py-1 text-xs font-bold"
            >
              {[2, 3, 4, 5, 6, 7, 8].map((n) => (
                <option key={n} value={n}>
                  👥 {n} thí sinh
                </option>
              ))}
            </select>
            {SELECTABLE_ROUNDS.map((r) => {
              const on = rounds.includes(r);
              return (
                <button
                  key={r}
                  type="button"
                  onClick={() => {
                    const next = on
                      ? rounds.filter((x) => x !== r)
                      : SELECTABLE_ROUNDS.filter((x) => rounds.includes(x) || x === r);
                    if (next.length === 0) return;
                    setRounds(next);
                    recreateGame(rulesetId, next, playerCount, questionSet);
                  }}
                  className={`px-2 py-1 rounded border font-bold ${on ? "bg-sky-500/30 border-sky-400 text-sky-200" : "bg-white/5 border-white/15 text-slate-400"}`}
                >
                  {ROUND_LABELS[r]}
                </button>
              );
            })}
            <span className="px-2 py-1 rounded border border-amber-400/40 bg-amber-500/15 text-amber-200 font-bold" title="Vòng Câu hỏi phụ luôn được chọn mặc định">
              +CHP
            </span>
          </div>
        </div>

        {showRulesInfo && (
          <div className="rounded-xl border border-sky-400/30 bg-slate-950/90 p-3 text-xs space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-yellow-300">
                ℹ️ Chi tiết luật {rs.label} (Âm thanh: {rs.audioSeason}):
              </span>
              <button type="button" onClick={() => setShowRulesInfo(false)} className="text-slate-400 hover:text-white">
                ✕
              </button>
            </div>
            <p className="text-slate-200">{rs.note}</p>
            <div className="text-slate-400">
              Điểm CNV: <b>{rs.vcnv.cnvPoints.join(" / ")}đ</b> · Gói Về Đích: <b>{rs.veDich.pointOptions.join(" / ")}đ</b>
            </div>
          </div>
        )}
      </div>

      {err && (
        <div className="rounded-lg bg-rose-500/20 border border-rose-400 px-3 py-1.5 text-xs text-rose-100">
          ⚠ {err}
        </div>
      )}

      {/* Scoreboard strip */}
      <ScoreStrip state={state} />

      {/* Main 2-column workspace: Left = Live Display + Host Console | Right = 2..8 Simulated Contestants */}
      <div className="grid lg:grid-cols-12 gap-3">
        <div className="lg:col-span-7 space-y-3">
          {/* Live Display Preview */}
          <Panel title={`📺 Màn hình chiếu — ${state.currentRound ? ROUND_LABELS[state.currentRound] : state.stage === "lobby" ? "Sảnh chờ" : "Kết thúc"}`}>
            {state.stage === "lobby" && (
              <div className="text-center py-6 space-y-3">
                <div className="text-sm text-slate-300">
                  Bộ đề: <b>{questionSet.name}</b> · Luật <b>{rs.label}</b> · {seats.length} thí sinh sẵn sàng
                </div>
                <button className={btnPrimary} onClick={() => act("game:start")}>
                  ▶ BẮT ĐẦU TRẬN ĐẤU TRONG SANDBOX
                </button>
              </div>
            )}

            {state.stage === "finished" && (
              <div className="text-center py-4 space-y-2">
                <div className="text-2xl font-black text-yellow-300">🏆 KẾT QUẢ CHUNG CUỘC</div>
                {[...seats]
                  .sort((a, b) => b.score - a.score)
                  .map((s, i) => (
                    <div key={s.id} className="text-lg">
                      {["🥇", "🥈", "🥉"][i] ?? `${i + 1}.`} <b>{s.name}</b> — {s.score} điểm
                    </div>
                  ))}
              </div>
            )}

            {state.stage === "playing" && (
              <div className="space-y-2">
                <div className="flex flex-wrap gap-1.5 items-center text-xs">
                  {state.roundsPlan.map((r) => (
                    <span
                      key={r}
                      className={`px-2 py-0.5 rounded-full border ${
                        state.currentRound === r
                          ? "bg-yellow-300 text-slate-950 font-black border-yellow-200"
                          : state.roundStatus[r] === "done"
                            ? "bg-emerald-500/20 border-emerald-400/40"
                            : "bg-white/5 border-white/15"
                      }`}
                    >
                      {ROUND_LABELS[r]}
                    </span>
                  ))}
                  <span className="flex-1" />
                  <button className={btn} onClick={() => act("round:next")}>
                    Sang vòng kế ⏭
                  </button>
                  <button className={btn} onClick={() => act("round:force", { round: "cauHoiPhu" })}>
                    Mở Câu hỏi phụ
                  </button>
                </div>

                {/* Round-specific display & host controls */}
                {state.currentRound === "khoiDong" && state.khoiDong && (
                  <SandboxKhoiDong state={state} act={act} serverNow={serverNow} />
                )}
                {state.currentRound === "vcnv" && state.vcnv && (
                  <SandboxVcnv
                    state={state}
                    act={act}
                    serverNow={serverNow}
                    checked={checkedVcnv}
                    setChecked={setCheckedVcnv}
                  />
                )}
                {state.currentRound === "tangToc" && state.tangToc && (
                  <SandboxTangToc
                    state={state}
                    act={act}
                    serverNow={serverNow}
                    checked={checkedTt}
                    setChecked={setCheckedTt}
                  />
                )}
                {state.currentRound === "veDich" && state.veDich && (
                  <SandboxVeDich
                    state={state}
                    act={act}
                    serverNow={serverNow}
                    pts={vdPkgDraft}
                    setPts={setVdPkgDraft}
                  />
                )}
                {state.currentRound === "cauHoiPhu" && state.cauHoiPhu && (
                  <SandboxChp state={state} act={act} serverNow={serverNow} />
                )}
              </div>
            )}
          </Panel>

          {/* Manual Score Adjust */}
          <Panel title="Chỉnh điểm nhanh & Nhật ký">
            <div className="flex flex-wrap gap-2 mb-2">
              {seats.map((s) => (
                <div key={s.id} className="flex items-center gap-1 text-xs bg-white/5 px-2 py-1 rounded-lg">
                  <span style={{ color: SEAT_COLORS[s.id] }} className="font-bold">
                    {s.name}
                  </span>
                  <button className="px-1.5 py-0.5 rounded bg-rose-500/30" onClick={() => act("score:adjust", { seat: s.id, delta: -10 })}>
                    -10
                  </button>
                  <button className="px-1.5 py-0.5 rounded bg-emerald-500/30" onClick={() => act("score:adjust", { seat: s.id, delta: 10 })}>
                    +10
                  </button>
                </div>
              ))}
            </div>
            <div className="text-xs text-slate-300 max-h-20 overflow-auto space-y-0.5">
              {[...state.log].reverse().map((l, i) => (
                <div key={i}>• {l}</div>
              ))}
            </div>
          </Panel>
        </div>

        {/* Right column: Simulated Contestant Pads (2..8 players) */}
        <div className="lg:col-span-5">
          <Panel title={`📱 Thiết bị thí sinh giả lập (${seats.length} người)`}>
            <div className="grid sm:grid-cols-2 gap-2 max-h-[68vh] overflow-y-auto pr-1">
              {seats.map((s) => {
                const draft = answersDraft[s.id] ?? "";
                const curVcnvAns =
                  state.vcnv && state.vcnv.currentRow >= 0 && state.vcnv.currentRow < 4
                    ? state.vcnv.rows[state.vcnv.currentRow]?.answer || ""
                    : state.vcnv && state.vcnv.currentRow === 4
                      ? state.vcnv.centerQuestion?.a || state.vcnv.keyword || ""
                      : "";
                const curTtAns =
                  state.tangToc && state.tangToc.qIdx >= 0
                    ? state.tangToc.questions[state.tangToc.qIdx]?.answer || ""
                    : "";
                const quickRightAns = state.currentRound === "vcnv" ? curVcnvAns : curTtAns;
                const isVdOwner =
                  state.currentRound === "veDich" &&
                  state.veDich &&
                  state.veDich.order[state.veDich.turnIdx] === s.id;

                return (
                  <div
                    key={s.id}
                    className="rounded-xl border border-white/15 bg-white/5 p-2.5 space-y-2"
                    style={{ borderLeft: `5px solid ${SEAT_COLORS[s.id]}` }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm truncate" style={{ color: SEAT_COLORS[s.id] }}>
                        {s.name}
                      </span>
                      <span className="font-black text-lg tabular-nums">{s.score}đ</span>
                    </div>

                    <div className="flex flex-wrap gap-1">
                      <button
                        type="button"
                        onClick={() => simBuzz(s.id)}
                        className="flex-1 py-1.5 rounded-lg bg-red-500 hover:bg-red-400 text-white font-black text-xs active:scale-95 transition"
                      >
                        🔔 Bấm chuông
                      </button>
                      {(state.currentRound === "vcnv" || state.currentRound === "tangToc") && (
                        <>
                          <button
                            type="button"
                            onClick={() => simAnswer(s.id, quickRightAns || "Đáp án đúng")}
                            className="px-2 py-1.5 rounded-lg bg-emerald-500/30 border border-emerald-400/50 text-emerald-200 font-bold text-xs"
                            title="Gửi nhanh đáp án đúng của câu hiện tại"
                          >
                            ⚡ Gửi Đúng
                          </button>
                          <button
                            type="button"
                            onClick={() => simAnswer(s.id, "Đáp án sai")}
                            className="px-2 py-1.5 rounded-lg bg-rose-500/30 border border-rose-400/50 text-rose-200 font-bold text-xs"
                            title="Gửi nhanh đáp án sai"
                          >
                            ✗ Sai
                          </button>
                        </>
                      )}
                    </div>

                    {(state.currentRound === "vcnv" || state.currentRound === "tangToc") && (
                      <div className="flex gap-1">
                        <input
                          value={draft}
                          onChange={(e) => setAnswersDraft((p) => ({ ...p, [s.id]: e.target.value }))}
                          placeholder="Nhập đáp án..."
                          className="flex-1 rounded bg-slate-800 border border-white/15 px-2 py-1 text-xs"
                        />
                        <button
                          type="button"
                          onClick={() => simAnswer(s.id, draft)}
                          className="px-2 py-1 rounded bg-sky-500 text-slate-950 font-bold text-xs"
                        >
                          Gửi
                        </button>
                      </div>
                    )}

                    {isVdOwner && state.veDich?.phase === "choosing" && (
                      rs.veDich.selectionMode === "presetPackages" && rs.veDich.presetPackages ? (
                        <div className="grid grid-cols-3 gap-1">
                          {Object.entries(rs.veDich.presetPackages).map(([pkgKey, pkgPoints]) => (
                            <button
                              key={pkgKey}
                              type="button"
                              onClick={() => simPick(s.id, pkgPoints)}
                              className="py-1 rounded bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-[11px]"
                            >
                              Gói {pkgKey}đ
                            </button>
                          ))}
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => simPick(s.id, vdPkgDraft)}
                          className="w-full py-1 rounded bg-amber-400 text-slate-950 font-black text-xs"
                        >
                          📦 Chốt gói ({vdPkgDraft.join("-")})
                        </button>
                      )
                    )}
                  </div>
                );
              })}
            </div>
          </Panel>
        </div>
      </div>
      {showStudio && (
        <OlympiaQuestionStudioModal
          open={showStudio}
          onClose={() => setShowStudio(false)}
          initialSet={questionSet}
          playerCount={playerCount}
          onApply={(updatedSet) => {
            setQuestionSet(updatedSet);
            recreateGame(rulesetId, rounds, playerCount, updatedSet);
            setShowStudio(false);
          }}
        />
      )}

      <OlympiaTranscriptModal
        open={showTranscript}
        onClose={() => setShowTranscript(false)}
        state={state}
      />
    </div>
  );
}

type Act = (type: string, extra?: Record<string, unknown>) => void;
type SN = () => number;

function SandboxKhoiDong({ state, act, serverNow }: { state: OlympiaState; act: Act; serverNow: SN }) {
  const kd = state.khoiDong!;
  const seg = kd.segments[kd.segIdx];
  return (
    <div className="space-y-2 rounded-xl bg-white/5 p-3">
      <div className="flex items-center justify-between text-xs text-sky-300 flex-wrap gap-2">
        <span>
          <b>{seg.label}</b> · Câu {Math.max(0, kd.qIdx + 1)}/{seg.questions > 100 ? "∞" : seg.questions}
        </span>
        {kd.current?.subject && (
          <span className="px-2 py-0.5 rounded-full bg-sky-500/20 border border-sky-400/40 text-sky-200 font-bold">
            📚 {kd.current.subject}
          </span>
        )}
        {kd.buzzedSeat != null && (
          <span className="px-2 py-0.5 rounded bg-yellow-300 text-slate-950 font-black">
            🔔 {seatName(state, kd.buzzedSeat)}
          </span>
        )}
      </div>
      {kd.current ? (
        <div>
          <div className="text-lg font-bold">{kd.current.q}</div>
          <div className="text-xs text-emerald-300">Đáp án: {kd.current.a}</div>
          <MediaView url={kd.current.media} type={kd.current.mediaType} className="max-h-36 rounded mt-1" />
        </div>
      ) : (
        <div className="text-xs text-slate-400 italic">Bấm “Câu tiếp” để mở câu hỏi.</div>
      )}
      <Timer timer={kd.globalTimer ?? kd.timer} serverNow={serverNow} />
      <div className="flex flex-wrap gap-1.5">
        <button className={btnPrimary} onClick={() => act("kd:next")}>
          {kd.phase === "segmentDone" ? "Phần tiếp ⏭" : "Câu tiếp ⏭"}
        </button>
        <button className={btn} onClick={() => act("kd:timer")}>
          ⏱ Giờ + Chuông
        </button>
        {seg.kind !== "solo" && (
          <button className={btn} onClick={() => act("kd:buzzer")}>
            🔔 Mở/Khóa chuông
          </button>
        )}
        <button className={btnOk} onClick={() => act("kd:correct")}>
          ✔ Đúng
        </button>
        <button className={btnBad} onClick={() => act("kd:wrong")}>
          ✘ Sai
        </button>
        <button className={btn} onClick={() => act("kd:skip")}>
          Bỏ qua
        </button>
      </div>
    </div>
  );
}

function SandboxVcnv({
  state,
  act,
  serverNow,
  checked,
  setChecked,
}: {
  state: OlympiaState;
  act: Act;
  serverNow: SN;
  checked: number[];
  setChecked: (v: number[]) => void;
}) {
  const v = state.vcnv!;
  const rs = RULESETS[state.rulesetId] ?? RULESETS.O26;
  const seats = activeSeats(state);
  const sel = checked;
  const cnvPts = cnvPointsFor(rs, v.openedCount, Boolean(v.centerOpened));

  return (
    <div className="space-y-2 rounded-xl bg-white/5 p-3">
      <div className="text-xs flex items-center justify-between flex-wrap gap-2">
        <span>
          Từ khóa CNV: <b className="text-yellow-300">{v.keyword}</b> · Đã mở {v.openedCount}/4 hàng
          {v.centerOpened ? " + Ô trung tâm" : ""}
        </span>
        <span className="px-2 py-0.5 rounded bg-amber-500/20 border border-amber-400/40 text-amber-300 font-bold">
          Giải CNV hiện tại: +{cnvPts}đ
        </span>
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        {v.rows.map((r, i) => (
          <button
            key={i}
            disabled={r.opened}
            onClick={() => {
              setChecked([]);
              act("vcnv:selectRow", { row: i });
            }}
            className={`text-left rounded-lg p-2 border text-xs ${
              v.currentRow === i ? "border-yellow-300 bg-yellow-300/15" : "border-white/15 bg-white/5"
            } ${r.opened ? "opacity-40" : ""}`}
          >
            <div className="font-bold">
              Hàng {i + 1} {r.opened ? "✓" : ""} — ĐA: <span className="text-emerald-300">{r.answer}</span>
            </div>
            <div className="text-slate-300 truncate">{r.hint}</div>
          </button>
        ))}
        <button
          disabled={Boolean(v.centerOpened)}
          onClick={() => {
            setChecked([]);
            act("vcnv:selectRow", { row: 4 });
          }}
          className={`col-span-2 text-left rounded-lg p-2 border text-xs ${
            v.currentRow === 4 ? "border-yellow-300 bg-yellow-300/15" : "border-amber-400/30 bg-amber-500/10"
          } ${v.centerOpened ? "opacity-40" : ""}`}
        >
          <div className="font-bold text-amber-300">
            ⭐ Câu hỏi số 5 — Ô Trung Tâm (+10đ) {v.centerOpened ? "✓" : ""} — ĐA:{" "}
            <span className="text-emerald-300">{v.centerQuestion?.a || v.keyword}</span>
          </div>
          <div className="text-slate-200 truncate">{v.centerQuestion?.q || "Câu hỏi gợi ý cuối cùng tại ô trung tâm"}</div>
        </button>
      </div>
      <Timer timer={v.timer} serverNow={serverNow} />
      <div className="flex flex-wrap gap-1.5">
        <button className={btn} onClick={() => act("vcnv:timer")}>
          ⏱ 15s
        </button>
        <button className={btn} onClick={() => act("vcnv:reveal")}>
          👁 Lật đáp án
        </button>
        <button className={btnOk} onClick={() => act("vcnv:correct", { seatIds: sel })}>
          ✔ Chấm đúng ({sel.length})
        </button>
        <button className={btnBad} onClick={() => act("vcnv:wrong")}>
          ✘ Cả hàng sai
        </button>
        <button className={btn} onClick={() => act("vcnv:revealTile")}>
          🧩 Lật mảnh
        </button>
        <button className={btn} onClick={() => act("vcnv:revealRowsOnly")}>
          🔤 Mở hết ô chữ
        </button>
        <button className={btn} onClick={() => act("vcnv:revealPiecesOnly")}>
          🧩 Mở hết mảnh ghép
        </button>
        <button className={btn} onClick={() => act("vcnv:revealAll")}>
          Mở tất cả
        </button>
      </div>
      {v.currentRow >= 0 && (
        <div className="space-y-1 text-xs bg-slate-950/60 p-2 rounded border border-white/10">
          <div className="text-slate-400">MC tự tích chọn thí sinh trả lời đúng:</div>
          {seats.map((s) => {
            const ans = v.answers[s.id];
            return (
              <label key={s.id} className="flex flex-wrap items-center gap-2">
                <input
                  type="checkbox"
                  checked={sel.includes(s.id)}
                  onChange={(e) => setChecked(e.target.checked ? [...sel, s.id] : sel.filter((x) => x !== s.id))}
                />
                <b style={{ color: SEAT_COLORS[s.id] }}>{s.name}:</b>
                <span>{ans?.text || "—"}</span>
                {ans?.previousText && (
                  <span className="text-amber-300 text-[11px]">(Áp chót: &ldquo;{ans.previousText}&rdquo;)</span>
                )}
              </label>
            );
          })}
        </div>
      )}
      {v.bells.length > 0 && (
        <div className="space-y-1 text-xs bg-slate-900/60 p-2 rounded">
          {v.bells.map((b) => (
            <div key={b.seat} className="flex items-center gap-2">
              🔔 <b>{seatName(state, b.seat)}</b>
              <button className={btnOk} onClick={() => act("vcnv:correctCNV", { seat: b.seat })}>
                CNV Đúng
              </button>
              <button className={btnBad} onClick={() => act("vcnv:wrongCNV", { seat: b.seat })}>
                CNV Sai
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SandboxTangToc({
  state,
  act,
  serverNow,
  checked,
  setChecked,
}: {
  state: OlympiaState;
  act: Act;
  serverNow: SN;
  checked: number[];
  setChecked: (v: number[]) => void;
}) {
  const tt = state.tangToc!;
  const q = tt.questions[tt.qIdx];
  const sel = checked;

  return (
    <div className="space-y-2 rounded-xl bg-white/5 p-3">
      <div className="text-xs text-sky-300">
        Câu {tt.qIdx + 1}/{tt.questions.length}
      </div>
      {q && (
        <div>
          {q.q && <div className="font-bold">{q.q}</div>}
          <MediaView url={q.media} type={q.type} className="max-h-36 rounded mt-1" />
          <div className="text-xs text-emerald-300">Đáp án: {q.answer}</div>
        </div>
      )}
      <Timer timer={tt.timer} serverNow={serverNow} />
      <div className="flex flex-wrap gap-1.5">
        <button
          className={btnPrimary}
          onClick={() => {
            setChecked([]);
            act("tt:next");
          }}
        >
          Câu tiếp ⏭
        </button>
        <button className={btn} onClick={() => act("tt:show")}>
          🖼 Hiện câu
        </button>
        <button className={btn} onClick={() => act("tt:timer")}>
          ⏱ Đếm giờ
        </button>
        <button className={btn} onClick={() => act("tt:reveal")}>
          👁 Lật xếp hạng
        </button>
        <button
          className={btnOk}
          disabled={tt.phase !== "ranking"}
          onClick={() => act("tt:grade", { correctSeats: sel })}
        >
          ✔ Chấm điểm ({sel.length})
        </button>
      </div>
      {tt.ranking.length > 0 && (
        <div className="space-y-1 text-xs">
          <div className="text-slate-400">MC tự tích chọn thí sinh trả lời đúng:</div>
          {tt.ranking.map((r, i) => (
            <label key={r.seat} className="flex flex-wrap items-center gap-2">
              <input
                type="checkbox"
                disabled={tt.phase === "graded" || r.noAnswer}
                checked={sel.includes(r.seat)}
                onChange={(e) => setChecked(e.target.checked ? [...sel, r.seat] : sel.filter((x) => x !== r.seat))}
              />
              <span>
                #{i + 1} <b>{seatName(state, r.seat)}</b>: {r.noAnswer ? "—" : `${r.answer} (${(r.ms / 1000).toFixed(2)}s)`}
                {r.previousAnswer && <span className="text-amber-300 ml-1">(Áp chót: &ldquo;{r.previousAnswer}&rdquo;)</span>}
                {r.points ? <b className="text-yellow-300"> +{r.points}đ</b> : ""}
              </span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

function SandboxVeDich({
  state,
  act,
  serverNow,
  pts,
  setPts,
}: {
  state: OlympiaState;
  act: Act;
  serverNow: SN;
  pts: number[];
  setPts: (v: number[]) => void;
}) {
  const vd = state.veDich!;
  const rs = RULESETS[state.rulesetId].veDich;
  const owner = vd.order[vd.turnIdx];
  const cur = vd.current;

  return (
    <div className="space-y-2 rounded-xl bg-white/5 p-3">
      <div className="flex flex-wrap gap-1 text-xs items-center">
        <span>Lượt:</span>
        {vd.order.map((id) => (
          <button
            key={id}
            onClick={() => act("vd:setSeat", { seat: id })}
            className={`px-2 py-0.5 rounded border ${
              id === owner ? "bg-yellow-300 text-slate-950 font-black" : "border-white/20 bg-white/5"
            }`}
          >
            {seatName(state, id)}
          </button>
        ))}
      </div>
      {vd.phase === "choosing" && (
        rs.selectionMode === "presetPackages" && rs.presetPackages ? (
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="text-slate-300">Chọn gói cố định ({rs.questionsPerSeat} câu):</span>
            {Object.entries(rs.presetPackages).map(([pkgKey, pkgPoints]) => (
              <button
                key={pkgKey}
                className={btnPrimary}
                onClick={() => act("vd:choosePackage", { points: pkgPoints })}
              >
                📦 Gói {pkgKey}đ ({pkgPoints.join("-")})
              </button>
            ))}
          </div>
        ) : (
          <div className="flex items-center gap-2 text-xs">
            {pts.map((p, i) => (
              <select
                key={i}
                value={p}
                onChange={(e) => setPts(pts.map((x, j) => (j === i ? Number(e.target.value) : x)))}
                className="bg-slate-800 border border-white/20 rounded px-2 py-1"
              >
                {rs.pointOptions.map((o) => (
                  <option key={o} value={o}>
                    {o}đ
                  </option>
                ))}
              </select>
            ))}
            <button className={btnPrimary} onClick={() => act("vd:choosePackage", { points: pts })}>
              Xác nhận gói
            </button>
          </div>
        )
      )}
      {cur && (
        <div>
          <div className="text-xs text-sky-300">
            {cur.points}đ {vd.hopeStarActive ? "⭐ Ngôi sao hy vọng" : ""}
          </div>
          <div className="font-bold">{cur.q.q}</div>
          <div className="text-xs text-emerald-300">Đáp án: {cur.q.a}</div>
        </div>
      )}
      <Timer timer={vd.steal && vd.phase === "stealing" ? vd.steal.timer : vd.timer} serverNow={serverNow} />
      <div className="flex flex-wrap gap-1.5">
        <button className={btnPrimary} onClick={() => act("vd:startQuestion")}>
          Câu tiếp ⏭
        </button>
        <button className={btn} onClick={() => act("vd:timer")}>
          ⏱ Giờ
        </button>
        <button className={btn} onClick={() => act("vd:hopeStar")}>
          ⭐ Ngôi sao
        </button>
        <button className={btnOk} onClick={() => act("vd:correct")}>
          ✔ Đúng
        </button>
        <button className={btnBad} onClick={() => act("vd:wrong")}>
          ✘ Sai
        </button>
        <button className={btn} onClick={() => act("vd:openSteal")}>
          🚨 Cướp 5s
        </button>
        <button className={btnOk} onClick={() => act("vd:correctSteal")}>
          Cướp Đúng
        </button>
        <button className={btnBad} onClick={() => act("vd:wrongSteal")}>
          Cướp Sai
        </button>
        <button className={btn} onClick={() => act("vd:nextSeat")}>
          Thí sinh kế ⏭
        </button>
      </div>
    </div>
  );
}

function SandboxChp({ state, act, serverNow }: { state: OlympiaState; act: Act; serverNow: SN }) {
  const cp = state.cauHoiPhu!;
  const q = cp.questions[cp.qIdx];
  return (
    <div className="space-y-2 rounded-xl bg-white/5 p-3">
      <div className="text-xs text-amber-300">
        Đồng hạng: {cp.tied.map((i) => seatName(state, i)).join(", ")}
      </div>
      {q && (
        <div>
          <div className="font-bold">{q.q}</div>
          <div className="text-xs text-emerald-300">Đáp án: {q.a}</div>
        </div>
      )}
      <Timer timer={cp.timer} serverNow={serverNow} />
      <div className="flex flex-wrap gap-1.5">
        <button className={btnPrimary} onClick={() => act("chp:next")}>
          Câu tiếp ⏭
        </button>
        <button className={btn} onClick={() => act("chp:show")}>
          Hiện câu
        </button>
        <button className={btn} onClick={() => act("chp:timer")}>
          ⏱ 15s + Mở chuông
        </button>
        <button className={btnOk} onClick={() => act("chp:correct")}>
          ✔ Đúng
        </button>
        <button className={btnBad} onClick={() => act("chp:wrong")}>
          ✘ Sai
        </button>
      </div>
    </div>
  );
}
