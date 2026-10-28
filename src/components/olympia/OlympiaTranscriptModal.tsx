"use client";

import { useMemo, useState } from "react";
import type { OlympiaState, OlympiaTranscriptEntry, RoundId } from "@/lib/olympia/types";
import { KD_ZONES, VD_ZONES } from "@/lib/olympia/ai-classifier";
import { SEAT_COLORS } from "./ui";
import {
  exportMatchTranscriptExcel,
  exportMatchTranscriptJson,
  getOlympiaBanks,
  syncMatchUsedQuestionsToBank,
} from "@/lib/olympia/olympia-storage";

interface Props {
  open: boolean;
  onClose: () => void;
  state: OlympiaState;
  defaultBankId?: string;
}

export default function OlympiaTranscriptModal({ open, onClose, state, defaultBankId }: Props) {
  const [viewMode, setViewMode] = useState<"rut_gon" | "chi_tiet">("rut_gon");
  const [roundFilter, setRoundFilter] = useState<"ALL" | RoundId | "system">("ALL");
  const [search, setSearch] = useState("");
  const [selectedBankId, setSelectedBankId] = useState<string>(
    defaultBankId || "olympia_preset_o25_o26_full"
  );
  const [syncNotice, setSyncNotice] = useState<string | null>(null);

  const banks = useMemo(() => (open ? getOlympiaBanks() : []), [open]);
  const activeSeats = useMemo(() => state.seats.filter((s) => Boolean(s.name)), [state.seats]);
  const allEntries = state.transcript ?? [];
  const openedKeys = state.openedQuestionKeys ?? [];

  const filteredEntries = useMemo(() => {
    return allEntries.filter((e) => {
      if (viewMode === "rut_gon" && e.entryKind === "score_adjust") return false;
      if (roundFilter !== "ALL" && e.round !== roundFilter) return false;
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const hay = `${e.questionText || ""} ${e.correctAnswer || ""} ${e.actorName || ""} ${e.buzzedName || ""} ${e.subject || ""} ${e.segmentLabel || ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [allEntries, viewMode, roundFilter, search]);

  if (!open) return null;

  const handleSyncUsedToBank = (markUsed: boolean) => {
    if (!selectedBankId) return;
    const texts = Array.from(
      new Set(
        allEntries
          .map((e) => e.questionText)
          .filter((t): t is string => Boolean(t && t.trim()))
      )
    );
    if (texts.length === 0) {
      setSyncNotice("Chưa có câu hỏi nào được mở trong trận đấu này để đồng bộ.");
      return;
    }
    const updated = syncMatchUsedQuestionsToBank(selectedBankId, texts, markUsed);
    if (updated) {
      setSyncNotice(
        markUsed
          ? `✅ Đã đánh dấu ${texts.length} câu hỏi trong trận này là "Đã dùng" vào kho "${updated.name}".`
          : `↩️ Đã hoàn tác trạng thái "Chưa dùng" cho ${texts.length} câu hỏi của trận này trong kho "${updated.name}".`
      );
    }
  };

  const renderVerdictBadge = (verdict?: OlympiaTranscriptEntry["verdict"]) => {
    switch (verdict) {
      case "correct":
        return (
          <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
            ✔ Đúng
          </span>
        );
      case "wrong":
        return (
          <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">
            ✘ Sai
          </span>
        );
      case "steal_correct":
        return (
          <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/25 text-amber-200 border border-amber-400/50">
            ⚡ Cướp điểm Đúng
          </span>
        );
      case "steal_wrong":
        return (
          <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-orange-500/20 text-orange-300 border border-orange-500/40">
            ⚡ Cướp điểm Sai
          </span>
        );
      case "skip":
        return (
          <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-500/20 text-slate-300 border border-slate-500/30">
            ⏭ Bỏ qua / Không trả lời
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
            ℹ️ Sự kiện
          </span>
        );
    }
  };

  const renderZoneBadges = (e: OlympiaTranscriptEntry) => {
    const kdZ = e.kdZone ? KD_ZONES.find((z) => z.id === e.kdZone) : null;
    const vdZ = e.vdZone ? VD_ZONES.find((z) => z.id === e.vdZone) : null;
    return (
      <div className="flex flex-wrap items-center gap-1 mt-1">
        {e.subject && (
          <span className="px-1.5 py-0.5 rounded bg-indigo-500/20 border border-indigo-400/30 text-indigo-200 text-[10px] font-semibold">
            📚 {e.subject}
          </span>
        )}
        {kdZ && (
          <span className="px-1.5 py-0.5 rounded bg-purple-500/20 border border-purple-400/30 text-purple-200 text-[10px]">
            {kdZ.icon} {kdZ.shortLabel}
          </span>
        )}
        {vdZ && (
          <span className="px-1.5 py-0.5 rounded bg-cyan-500/20 border border-cyan-400/30 text-cyan-200 text-[10px]">
            {vdZ.icon} {vdZ.shortLabel}
          </span>
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-slate-950 border border-white/15 rounded-2xl w-full max-w-6xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden text-white">
        {/* Header */}
        <div className="px-5 py-4 border-b border-white/10 bg-gradient-to-r from-indigo-950/80 via-slate-900 to-slate-950 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="text-2xl">📋</span>
              <h2 className="text-lg sm:text-xl font-black tracking-tight">
                Biên Bản Trận Đấu Olympia — {state.name}
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-yellow-400/20 text-yellow-300 border border-yellow-400/40">
                Mùa {state.rulesetId} · Mã {state.code}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Đã ghi nhận <b>{allEntries.length}</b> diễn biến · Đã mở <b>{openedKeys.length}</b> câu hỏi trong trận hiện tại
            </p>
          </div>

          {/* Segmented Mode Switcher: Rút gọn vs Chi tiết */}
          <div className="flex items-center gap-2">
            <div className="flex items-center p-1 rounded-xl bg-slate-900 border border-white/15">
              <button
                type="button"
                onClick={() => setViewMode("rut_gon")}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  viewMode === "rut_gon"
                    ? "bg-amber-400 text-slate-950 shadow"
                    : "text-slate-300 hover:text-white"
                }`}
              >
                📄 Rút gọn
              </button>
              <button
                type="button"
                onClick={() => setViewMode("chi_tiet")}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  viewMode === "chi_tiet"
                    ? "bg-cyan-400 text-slate-950 shadow"
                    : "text-slate-300 hover:text-white"
                }`}
              >
                🔍 Chi tiết
              </button>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-sm font-bold"
            >
              Đóng ✕
            </button>
          </div>
        </div>

        {/* Toolbar: Scoreboard, Bank Sync & Exports */}
        <div className="px-5 py-3 border-b border-white/10 bg-slate-900/70 space-y-3">
          {/* Contestant scores + Sync to Bank */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              {activeSeats.map((s) => (
                <div
                  key={s.id}
                  className="px-3 py-1 rounded-lg bg-white/5 border border-white/10 flex items-center gap-2 text-xs"
                >
                  <span className="font-bold" style={{ color: SEAT_COLORS[s.id] }}>
                    #{s.id + 1} {s.name}
                  </span>
                  <span className="font-black text-yellow-300 text-sm">{s.score}đ</span>
                </div>
              ))}
            </div>

            {/* Export buttons */}
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => exportMatchTranscriptExcel(state, "rut_gon")}
                className="px-2.5 py-1.5 rounded-lg bg-emerald-600/80 hover:bg-emerald-500 text-xs font-bold"
              >
                📥 Excel Rút gọn
              </button>
              <button
                type="button"
                onClick={() => exportMatchTranscriptExcel(state, "chi_tiet")}
                className="px-2.5 py-1.5 rounded-lg bg-cyan-600/80 hover:bg-cyan-500 text-xs font-bold"
              >
                📥 Excel Chi tiết
              </button>
              <button
                type="button"
                onClick={() => exportMatchTranscriptExcel(state, "tron_bo")}
                className="px-2.5 py-1.5 rounded-lg bg-indigo-600/80 hover:bg-indigo-500 text-xs font-bold"
              >
                📦 Excel Trọn bộ
              </button>
              <button
                type="button"
                onClick={() => exportMatchTranscriptJson(state, viewMode)}
                className="px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-semibold"
              >
                {`{ } JSON (${viewMode === "rut_gon" ? "Rút gọn" : "Chi tiết"})`}
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-semibold"
              >
                🖨 In
              </button>
            </div>
          </div>

          {/* Sync Used Questions to Olympia Bank */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-white/10 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-slate-300 font-semibold">Đồng bộ câu hỏi đã dùng vào Kho đề:</span>
              <select
                value={selectedBankId}
                onChange={(e) => setSelectedBankId(e.target.value)}
                className="bg-slate-950 border border-white/15 rounded-lg px-2.5 py-1 text-xs text-white"
              >
                {banks.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => handleSyncUsedToBank(true)}
                className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/40 text-amber-200 font-bold"
              >
                ✓ Đánh dấu Đã dùng vào Kho
              </button>
              <button
                type="button"
                onClick={() => handleSyncUsedToBank(false)}
                className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/15 text-slate-300"
              >
                ↩ Hoàn tác Đã dùng trận này
              </button>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-1.5">
              {(
                [
                  ["ALL", "Tất cả"],
                  ["khoiDong", "Khởi Động"],
                  ["vcnv", "VCNV"],
                  ["tangToc", "Tăng Tốc"],
                  ["veDich", "Về Đích"],
                  ["cauHoiPhu", "Câu Hỏi Phụ"],
                ] as const
              ).map(([rId, label]) => (
                <button
                  key={rId}
                  type="button"
                  onClick={() => setRoundFilter(rId)}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition ${
                    roundFilter === rId
                      ? "bg-indigo-600 text-white"
                      : "bg-white/5 text-slate-400 hover:text-white"
                  }`}
                >
                  {label}
                </button>
              ))}
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm câu hỏi, thí sinh..."
                className="bg-slate-950 border border-white/15 rounded-lg px-2.5 py-1 text-xs w-44"
              />
            </div>
          </div>

          {syncNotice && (
            <div className="px-3 py-1.5 rounded-lg bg-emerald-500/15 border border-emerald-400/30 text-emerald-200 text-xs">
              {syncNotice}
            </div>
          )}
        </div>

        {/* Mode explanation banner */}
        <div className="px-5 py-2 bg-indigo-950/40 border-b border-white/10 text-xs text-slate-300 flex items-center justify-between">
          <span>
            Đang xem chế độ:{" "}
            <b className={viewMode === "rut_gon" ? "text-amber-300" : "text-cyan-300"}>
              {viewMode === "rut_gon" ? "Biên bản Rút gọn" : "Biên bản Chi tiết"}
            </b>{" "}
            —{" "}
            {viewMode === "rut_gon"
              ? "Hiển thị câu hỏi đã dùng, thí sinh bấm chuông, Đúng/Sai, gói điểm Về Đích, thứ tự trả lời và 2 mục đáp án cuối cùng ở VCNV & Tăng Tốc."
              : "Bao gồm toàn bộ nội dung Rút gọn CỘNG THÊM toàn bộ lịch sử các câu trả lời đã nhập (Lần 1 → Lần N, kể cả câu trả lời không cuối) ở VCNV & Tăng Tốc, chuỗi chuông nối tiếp và lịch sử chỉnh điểm."}
          </span>
          <span className="text-slate-400">{filteredEntries.length} mục</span>
        </div>

        {/* Content list */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3">
          {filteredEntries.length === 0 ? (
            <div className="text-center py-12 text-slate-400 space-y-2">
              <div className="text-4xl">📭</div>
              <div className="font-bold text-slate-200">Chưa có dữ liệu biên bản cho bộ lọc này</div>
              <div className="text-xs">
                Khi trận đấu diễn ra qua các vòng Khởi Động, VCNV, Tăng Tốc, Về Đích, Câu Hỏi Phụ, mọi câu hỏi đã mở và đáp án của các thí sinh sẽ tự động lưu tại đây.
              </div>
            </div>
          ) : (
            filteredEntries.map((e, idx) => (
              <div
                key={e.seq}
                className="rounded-xl border border-white/10 bg-slate-900/80 p-3.5 space-y-2.5 hover:border-white/20 transition"
              >
                {/* Row top header */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-white/10 text-xs font-mono text-slate-300">
                      #{idx + 1}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-lg bg-indigo-500/20 border border-indigo-400/30 text-indigo-200 text-xs font-bold">
                      {e.roundLabel}
                    </span>
                    <span className="text-xs font-semibold text-slate-300">{e.segmentLabel}</span>
                    {e.packageLabel && (
                      <span className="px-2 py-0.5 rounded bg-purple-500/20 border border-purple-400/40 text-purple-200 text-xs font-bold">
                        📦 {e.packageLabel}
                        {e.questionPoints ? ` · Câu ${e.questionPoints}đ` : ""}
                      </span>
                    )}
                    {e.hopeStar && (
                      <span className="px-2 py-0.5 rounded bg-yellow-400/20 border border-yellow-400/40 text-yellow-300 text-xs font-bold">
                        ⭐ Ngôi sao hy vọng (x2)
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {viewMode === "chi_tiet" && (
                      <span className="text-[11px] text-slate-400 font-mono">
                        {new Date(e.at).toLocaleTimeString("vi-VN")}
                      </span>
                    )}
                    {renderVerdictBadge(e.verdict)}
                  </div>
                </div>

                {/* Question & Answer */}
                {(e.questionText || e.note) && (
                  <div className="grid md:grid-cols-3 gap-3 bg-slate-950/70 rounded-xl p-3 border border-white/5">
                    <div className="md:col-span-2">
                      <div className="text-xs text-slate-400 mb-0.5">Câu hỏi / Nội dung sự kiện:</div>
                      <div className="text-sm font-medium text-white">
                        {e.questionText || e.note}
                      </div>
                      {renderZoneBadges(e)}
                    </div>
                    <div>
                      <div className="text-xs text-slate-400 mb-0.5">Đáp án chuẩn:</div>
                      <div className="text-sm font-bold text-emerald-300">
                        {e.correctAnswer || "—"}
                      </div>
                      {(e.actorName || e.buzzedName) && (
                        <div className="text-xs text-slate-300 mt-1.5">
                          {e.buzzedName ? (
                            <>
                              🔔 Người bấm chuông: <b className="text-yellow-300">{e.buzzedName}</b>
                              {e.actorName && e.actorName !== e.buzzedName ? ` (Lượt của ${e.actorName})` : ""}
                            </>
                          ) : (
                            <>
                              👤 Thí sinh: <b className="text-cyan-300">{e.actorName}</b>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Detailed Buzzer Sequence (in Chi tiết mode or when multiple buzzes) */}
                {e.buzzerEvents && e.buzzerEvents.length > 0 && (viewMode === "chi_tiet" || e.buzzerEvents.length > 1) && (
                  <div className="text-xs bg-amber-500/10 border border-amber-400/25 rounded-lg px-3 py-2 flex flex-wrap items-center gap-2">
                    <span className="font-bold text-amber-300">🔔 Thứ tự bấm chuông:</span>
                    {e.buzzerEvents.map((b) => (
                      <span
                        key={`${b.order}-${b.seat}`}
                        className="px-2 py-0.5 rounded bg-black/40 border border-white/10 text-slate-200"
                      >
                        #{b.order} <b style={{ color: SEAT_COLORS[b.seat] }}>{b.name}</b>
                        {b.beforeReveal ? " (Trước khi lật đáp án hàng)" : ""}
                        {b.verdict === "correct" ? " · ✔ Đúng" : b.verdict === "wrong" ? " · ✘ Sai" : ""}
                      </span>
                    ))}
                  </div>
                )}

                {/* VCNV & Tăng Tốc Ranked Submissions Table */}
                {e.submissions && e.submissions.length > 0 && (
                  <div className="overflow-x-auto rounded-xl border border-white/10 bg-slate-950/80">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-white/5 text-slate-300 border-b border-white/10">
                        <tr>
                          <th className="px-3 py-2">Thứ tự</th>
                          <th className="px-3 py-2">Thí sinh</th>
                          <th className="px-3 py-2">Mục 1: Đáp án chốt cuối</th>
                          <th className="px-3 py-2">Mục 2: Đáp án áp chót trước đó</th>
                          {viewMode === "chi_tiet" && (
                            <th className="px-3 py-2 text-cyan-300">
                              Toàn bộ các câu trả lời đã nhập (Tính cả câu trả lời không cuối)
                            </th>
                          )}
                          <th className="px-3 py-2 text-right">Kết quả</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {e.submissions.map((sub) => (
                          <tr key={sub.seat} className={sub.noAnswer ? "opacity-50" : ""}>
                            <td className="px-3 py-2 font-mono font-bold text-yellow-300">
                              {sub.rank > 0 ? `#${sub.rank}` : "—"}
                            </td>
                            <td className="px-3 py-2 font-bold" style={{ color: SEAT_COLORS[sub.seat] }}>
                              {sub.name}
                            </td>
                            <td className="px-3 py-2">
                              {sub.noAnswer ? (
                                <span className="italic text-slate-500">Không nộp</span>
                              ) : (
                                <div>
                                  <span className="font-bold text-white">{sub.finalAnswer}</span>
                                  {sub.finalMs != null && (
                                    <span className="ml-1.5 font-mono text-[11px] text-cyan-300">
                                      ({(sub.finalMs / 1000).toFixed(2)}s)
                                    </span>
                                  )}
                                </div>
                              )}
                            </td>
                            <td className="px-3 py-2">
                              {sub.previousAnswer ? (
                                <div>
                                  <span className="text-amber-200 font-medium">{sub.previousAnswer}</span>
                                  {sub.previousMs != null && (
                                    <span className="ml-1.5 font-mono text-[11px] text-slate-400">
                                      ({(sub.previousMs / 1000).toFixed(2)}s)
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-slate-500">— (Chỉ nhập 1 lần)</span>
                              )}
                            </td>
                            {viewMode === "chi_tiet" && (
                              <td className="px-3 py-2">
                                {!sub.allAttempts || sub.allAttempts.length === 0 ? (
                                  <span className="text-slate-500">—</span>
                                ) : (
                                  <div className="flex flex-wrap items-center gap-1">
                                    {sub.allAttempts.map((att, aIdx) => {
                                      const isLast = aIdx === sub.allAttempts.length - 1;
                                      return (
                                        <span
                                          key={aIdx}
                                          className={`px-2 py-0.5 rounded border text-[11px] ${
                                            isLast
                                              ? "bg-cyan-500/20 border-cyan-400/40 text-cyan-200 font-bold"
                                              : "bg-white/5 border-white/10 text-slate-300"
                                          }`}
                                        >
                                          Lần {aIdx + 1} [{(att.ms / 1000).toFixed(2)}s]: &ldquo;{att.answer ?? att.text}&rdquo;
                                        </span>
                                      );
                                    })}
                                  </div>
                                )}
                              </td>
                            )}
                            <td className="px-3 py-2 text-right font-bold">
                              {sub.noAnswer ? (
                                <span className="text-slate-500">0đ</span>
                              ) : sub.correct ?? sub.isCorrect ? (
                                <span className="text-emerald-300">✔ Đúng (+{sub.pointsAwarded}đ)</span>
                              ) : (
                                <span className="text-rose-300">✘ Sai (0đ)</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Score changes & Score snapshot footer */}
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs pt-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-slate-400">Biến động điểm:</span>
                    {Object.keys(e.scoreChanges ?? {}).length === 0 ? (
                      <span className="text-slate-500">Không đổi (0đ)</span>
                    ) : (
                      Object.entries(e.scoreChanges ?? {}).map(([seatId, delta]) => {
                        const sId = Number(seatId);
                        return (
                          <span
                            key={sId}
                            className={`px-2 py-0.5 rounded font-bold ${
                              delta > 0
                                ? "bg-emerald-500/20 text-emerald-300"
                                : delta < 0
                                ? "bg-rose-500/20 text-rose-300"
                                : "bg-white/10 text-slate-300"
                            }`}
                          >
                            {state.seats[sId]?.name || `TS ${sId + 1}`}: {delta > 0 ? `+${delta}` : delta}đ
                          </span>
                        );
                      })
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-slate-400">
                    <span>Điểm sau lượt:</span>
                    {activeSeats.map((s) => (
                      <span key={s.id} className="text-slate-200">
                        <b style={{ color: SEAT_COLORS[s.id] }}>{s.name}</b>: {(e.scoresSnapshot ?? e.scoresAfter ?? {})[s.id] ?? 0}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
