"use client";

import React, { useMemo } from "react";
import * as XLSX from "xlsx";
import type { OlympiaState } from "@/lib/olympia/types";
import { RULESETS } from "@/lib/olympia/rulesets";

export default function OlympiaMatchReportModal({
  open,
  onClose,
  state,
}: {
  open: boolean;
  onClose: () => void;
  state: OlympiaState;
}) {
  const rs = RULESETS[state.rulesetId] || RULESETS["O26"];

  const contestants = useMemo(() => {
    return state.seats
      .filter((s) => !!s.name)
      .map((s) => ({
        id: s.id,
        name: s.name,
        score: s.score,
      }))
      .sort((a, b) => b.score - a.score);
  }, [state.seats]);

  const transcript = state.transcript || [];

  const handleExportExcel = () => {
    const wb = XLSX.utils.book_new();

    // Sheet 1: Bảng Điểm Tổng Kết
    const summaryData = contestants.map((c, idx) => ({
      "Hạng": idx === 0 ? "Quán Quân 🥇" : idx === 1 ? "Á Quân 🥈" : `Hạng ${idx + 1} 🥉`,
      "Thí Sinh": c.name,
      "Điểm Chung Cuộc": c.score,
    }));
    const summarySheet = XLSX.utils.json_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, summarySheet, "TongKetDiem");

    // Sheet 2: Chi Tiết Từng Câu Hỏi & Lượt Thi
    const transcriptData = transcript.map((t, idx) => ({
      "STT": idx + 1,
      "Thời Gian": new Date(t.at).toLocaleTimeString("vi-VN"),
      "Vòng Thi": t.roundLabel,
      "Phân Đoạn": t.segmentLabel || "",
      "Nội Dung Câu Hỏi": t.questionText || "",
      "Đáp Án Chuẩn": t.correctAnswer || "",
      "Thí Sinh": t.actorName || "",
      "Đáp Án Của Thí Sinh":
        t.submissions && t.submissions.length > 0
          ? t.submissions.map((s) => `${s.name}: ${s.finalAnswer}`).join("; ")
          : t.note || "",
      "Kết Quả":
        t.verdict === "correct"
          ? "Đúng"
          : t.verdict === "wrong"
          ? "Sai"
          : t.verdict === "skipped"
          ? "Bỏ qua"
          : t.verdict || "",
      "Điểm Thay Đổi": t.scoreChanges
        ? Object.entries(t.scoreChanges)
            .map(([sId, delta]) => `TS ${Number(sId) + 1}: ${delta > 0 ? `+${delta}` : delta}`)
            .join("; ")
        : "",
    }));
    const transcriptSheet = XLSX.utils.json_to_sheet(transcriptData);
    XLSX.utils.book_append_sheet(wb, transcriptSheet, "NhatKyDienBien");

    // Tải file về máy
    const dateStr = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `BaoCao_Olympia_${state.rulesetId}_${dateStr}.xlsx`);
  };

  const handleExportJson = () => {
    const payload = {
      rulesetId: state.rulesetId,
      rulesetLabel: rs.label,
      exportedAt: new Date().toISOString(),
      contestants,
      transcript,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `BaoCao_Olympia_${state.rulesetId}_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[160] flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-4xl max-h-[90vh] bg-[#0c1222] border border-emerald-500/30 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-white animate-scaleUp">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-white/10 bg-gradient-to-r from-emerald-950/80 to-teal-950/80 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">📊</span>
            <div>
              <h2 className="text-lg font-black text-emerald-300">Báo Cáo Kết Quả & Diễn Biến Trận Đấu</h2>
              <p className="text-xs text-slate-300">
                Luật {rs.label} · Tổng số {contestants.length} thí sinh · {transcript.length} lượt tương tác
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition"
          >
            ✕
          </button>
        </div>

        {/* Action Bar */}
        <div className="p-3 bg-black/30 border-b border-white/10 flex items-center justify-between flex-wrap gap-2 text-xs font-bold">
          <span className="text-slate-300">Tải xuống báo cáo chính thức:</span>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportExcel}
              className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1.5 shadow transition active:scale-95 cursor-pointer"
            >
              <span>📊 Xuất File Excel (.xlsx)</span>
            </button>
            <button
              onClick={handleExportJson}
              className="px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white flex items-center gap-1.5 shadow transition active:scale-95 cursor-pointer"
            >
              <span>📄 Xuất File JSON</span>
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 text-xs sm:text-sm">
          {/* Contestants Leaderboard Card */}
          <div className="space-y-2">
            <h3 className="font-black text-amber-300 uppercase tracking-wider text-xs">
              🏆 Bảng Xếp Hạng Chung Cuộc
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
              {contestants.map((c, idx) => (
                <div
                  key={c.id}
                  className={`p-3 rounded-xl border flex flex-col justify-between ${
                    idx === 0
                      ? "bg-amber-500/15 border-amber-400/50 text-amber-100 shadow-lg shadow-amber-500/10"
                      : "bg-white/[0.04] border-white/10 text-slate-200"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-400">
                      {idx === 0 ? "Quán Quân 🥇" : idx === 1 ? "Á Quân 🥈" : `Hạng ${idx + 1}`}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 font-mono">
                      Vị trí {c.id + 1}
                    </span>
                  </div>
                  <div className="font-black text-base truncate mt-1">{c.name}</div>
                  <div className="text-2xl font-black text-right mt-2 text-sky-300 font-mono">
                    {c.score} <span className="text-xs font-normal text-slate-400">điểm</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Transcript Timeline */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-sky-300 uppercase tracking-wider text-xs">
                📜 Nhật Ký Chi Tiết Trận Đấu ({transcript.length} bản ghi)
              </h3>
            </div>
            <div className="border border-white/10 rounded-xl overflow-hidden bg-white/[0.02] max-h-72 overflow-y-auto">
              <table className="w-full text-left border-collapse text-[11px]">
                <thead className="bg-white/5 sticky top-0 text-slate-300 font-bold border-b border-white/10">
                  <tr>
                    <th className="p-2">#</th>
                    <th className="p-2">Vòng</th>
                    <th className="p-2">Câu hỏi & Đáp án</th>
                    <th className="p-2">Thí sinh</th>
                    <th className="p-2">Kết quả</th>
                    <th className="p-2">Điểm số</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-slate-300">
                  {transcript.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-4 text-center text-slate-500 italic">
                        Chưa có lượt thi đấu nào được ghi lại.
                      </td>
                    </tr>
                  ) : (
                    transcript.map((t, idx) => (
                      <tr key={idx} className="hover:bg-white/[0.03]">
                        <td className="p-2 font-mono text-slate-400">{idx + 1}</td>
                        <td className="p-2 font-medium text-sky-300 whitespace-nowrap">
                          {t.roundLabel}
                          {t.segmentLabel && <div className="text-[10px] text-slate-400">{t.segmentLabel}</div>}
                        </td>
                        <td className="p-2 max-w-xs">
                          <div className="font-semibold text-white line-clamp-2">{t.questionText || "--"}</div>
                          {t.correctAnswer && (
                            <div className="text-[10px] text-emerald-400 mt-0.5 truncate">
                              ĐA: {t.correctAnswer}
                            </div>
                          )}
                        </td>
                        <td className="p-2 whitespace-nowrap font-medium text-slate-200">
                          {t.actorName || "--"}
                        </td>
                        <td className="p-2 whitespace-nowrap">
                          {t.verdict === "correct" ? (
                            <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold">
                              ✔ Đúng
                            </span>
                          ) : t.verdict === "wrong" ? (
                            <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 font-bold">
                              ✘ Sai
                            </span>
                          ) : t.verdict === "skipped" ? (
                            <span className="px-2 py-0.5 rounded bg-slate-500/20 text-slate-300 font-bold">
                              Bỏ qua
                            </span>
                          ) : (
                            <span className="text-slate-400">{t.verdict || "--"}</span>
                          )}
                        </td>
                        <td className="p-2 whitespace-nowrap font-mono text-amber-300">
                          {t.scoreChanges
                            ? Object.entries(t.scoreChanges)
                                .map(([sId, delta]) => `TS ${Number(sId) + 1}: ${delta > 0 ? `+${delta}` : delta}`)
                                .join("; ")
                            : "--"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3.5 border-t border-white/10 bg-black/40 flex items-center justify-end gap-2 text-xs">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold transition"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
