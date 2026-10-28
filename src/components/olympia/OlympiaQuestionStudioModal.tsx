"use client";

import { useMemo, useState } from "react";
import * as XLSX from "xlsx";
import type {
  KdZoneId,
  QA,
  QuestionSet,
  TangTocClueImage,
  TangTocQuestion,
  VcnvRowDef,
  VdZoneId,
  VeDichQuestion,
} from "@/lib/olympia/types";
import { KHOI_DONG_SUBJECTS } from "@/lib/olympia/types";
import {
  analyzeSetInventoryAndThresholds,
  autoTagEntireOlympiaSet,
  classifyQuestionWithAI,
  KD_ZONES,
  VD_ZONES,
  type InventorySlotStats,
} from "@/lib/olympia/ai-classifier";
import { parseJsonSet, parseSheets } from "@/lib/olympia/excel-import";
import {
  autoFillOlympiaSetFromSample,
  downloadOlympiaSetExcel,
  downloadOlympiaSetJson,
  duplicateOlympiaBank,
  getOlympiaBanks,
  mergeOlympiaSets,
  resetAllUsedInSet,
  saveOlympiaBank,
} from "@/lib/olympia/olympia-storage";

interface Props {
  open: boolean;
  onClose: () => void;
  initialSet: QuestionSet;
  bankId?: string;
  bankName?: string;
  bankDescription?: string;
  playerCount?: number;
  onApply: (set: QuestionSet, savedBankId?: string, savedBankName?: string) => void;
}

type StudioTab = "inventory" | "khoiDong" | "vcnv" | "tangToc" | "veDich" | "cauHoiPhu";

export default function OlympiaQuestionStudioModal({
  open,
  onClose,
  initialSet,
  bankId,
  bankName: initialBankName,
  bankDescription: initialBankDesc,
  playerCount: initialPlayerCount = 4,
  onApply,
}: Props) {
  const [draft, setDraft] = useState<QuestionSet>(() =>
    autoTagEntireOlympiaSet(JSON.parse(JSON.stringify(initialSet)), false)
  );
  const [name, setName] = useState(
    initialBankName || "Kho đề Đường Lên Đỉnh Olympia (Tùy chỉnh)"
  );
  const [description, setDescription] = useState(
    initialBankDesc || "Bộ đề Olympia đa lĩnh vực hỗ trợ Khởi động, VCNV, Tăng tốc, Về đích & Câu hỏi phụ."
  );
  const [activeTab, setActiveTab] = useState<StudioTab>("inventory");
  const [simPlayers, setSimPlayers] = useState<number>(initialPlayerCount);
  const [notice, setNotice] = useState<string | null>(null);

  // Filters in Khởi Động
  const [kdPoolKey, setKdPoolKey] = useState<string>("shared");
  const [kdZoneFilter, setKdZoneFilter] = useState<string>("ALL");
  const [kdUsedFilter, setKdUsedFilter] = useState<"ALL" | "UNUSED" | "USED">("ALL");

  // Filters in Về Đích
  const [vdTier, setVdTier] = useState<"10" | "20" | "30" | "40">("20");
  const [vdZoneFilter, setVdZoneFilter] = useState<"ALL" | VdZoneId>("ALL");

  // VCNV preview controls
  const [previewRowsOpen, setPreviewRowsOpen] = useState<boolean[]>([false, false, false, false, false]);
  const [previewPiecesOpen, setPreviewPiecesOpen] = useState<boolean[]>([false, false, false, false, false]);

  // Mandatory Reset Confirmation Modal state
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [hasBackedUpBeforeReset, setHasBackedUpBeforeReset] = useState(false);

  // Merge bank selector
  const [mergeSourceBankId, setMergeSourceBankId] = useState<string>("");

  const report = useMemo(
    () => analyzeSetInventoryAndThresholds(draft, simPlayers),
    [draft, simPlayers]
  );

  const availableBanks = useMemo(() => (open ? getOlympiaBanks() : []), [open]);

  if (!open) return null;

  const updateDraft = (fn: (next: QuestionSet) => void) => {
    const next: QuestionSet = JSON.parse(JSON.stringify(draft));
    fn(next);
    setDraft(next);
  };

  const handleUploadMedia = async (file: File, onUrl: (url: string) => void) => {
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (data?.url) {
        onUrl(data.url);
        setNotice(`✅ Đã tải file media lên: ${data.url}`);
      } else {
        const localUrl = URL.createObjectURL(file);
        onUrl(localUrl);
        setNotice(`ℹ️ Đang dùng URL tạm cục bộ cho file ${file.name}`);
      }
    } catch {
      const localUrl = URL.createObjectURL(file);
      onUrl(localUrl);
      setNotice(`ℹ️ Đang dùng URL tạm cục bộ cho file ${file.name}`);
    }
  };

  const handleImportFile = async (file: File) => {
    try {
      if (file.name.endsWith(".json")) {
        const text = await file.text();
        const res = parseJsonSet(text);
        if (res.set) {
          setDraft(autoTagEntireOlympiaSet(res.set, false));
          setNotice(
            `✅ Đã nhập kho đề JSON thành công (${res.set.khoiDong.shared.length} câu KĐ chung, ${res.set.veDich["10"]?.length ?? 0}/${res.set.veDich["20"]?.length ?? 0}/${res.set.veDich["30"]?.length ?? 0} câu VĐ).`
          );
        } else {
          setNotice(`❌ Lỗi nhập JSON: ${res.warnings.join(", ")}`);
        }
        return;
      }
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const sheets: Record<string, Record<string, unknown>[]> = {};
      wb.SheetNames.forEach((sn) => {
        sheets[sn] = XLSX.utils.sheet_to_json(wb.Sheets[sn], { defval: "" });
      });
      const res = parseSheets(sheets);
      if (res.set) {
        setDraft(autoTagEntireOlympiaSet(res.set, false));
        setNotice(`✅ Đã nhập file Excel "${file.name}" và tự động gán nhãn AI cho các câu hỏi!`);
      } else {
        setNotice(`❌ Lỗi đọc Excel: ${res.warnings.join(", ")}`);
      }
    } catch (e) {
      setNotice(`❌ Không thể đọc file: ${(e as Error).message}`);
    }
  };

  const handleSaveToBank = (asNew = false) => {
    const targetId =
      !asNew && bankId && !bankId.startsWith("olympia_preset_")
        ? bankId
        : `olympia_bank_${Date.now()}`;
    const saved = saveOlympiaBank({
      id: targetId,
      name: asNew ? `${name} (Bản mới)` : name,
      description,
      seasonHint: "O13 – O26",
      createdAt: new Date().toISOString(),
      isPreset: false,
      set: draft,
    });
    setNotice(`💾 Đã lưu kho đề "${saved.name}" vào Kho đề Olympia!`);
    onApply(saved.set, saved.id, saved.name);
  };

  const renderStatusBadge = (slot: InventorySlotStats) => {
    if (slot.status === "ok") {
      return (
        <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
          🟢 Đủ chuẩn (≥ {slot.yellowThreshold})
        </span>
      );
    }
    if (slot.status === "yellow") {
      return (
        <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
          🟡 Sắp cạn (&lt; {slot.yellowThreshold})
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-500/25 text-rose-300 border border-rose-500/50">
        🔴 Báo động thiếu (&lt; {slot.redThreshold})
      </span>
    );
  };

  const currentKdList: QA[] =
    kdPoolKey === "shared"
      ? draft.khoiDong.shared
      : draft.khoiDong.solo[kdPoolKey] ?? [];

  const setKdList = (nextList: QA[]) => {
    updateDraft((d) => {
      if (kdPoolKey === "shared") d.khoiDong.shared = nextList;
      else d.khoiDong.solo[kdPoolKey] = nextList;
    });
  };

  const currentVdList: VeDichQuestion[] = draft.veDich[vdTier] ?? [];
  const setVdList = (nextList: VeDichQuestion[]) => {
    updateDraft((d) => {
      d.veDich[vdTier] = nextList;
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-slate-950 border border-white/15 rounded-2xl w-full max-w-7xl max-h-[94vh] flex flex-col shadow-2xl overflow-hidden text-white">
        {/* Top Header */}
        <div className="px-5 py-3.5 border-b border-white/10 bg-gradient-to-r from-amber-950/60 via-slate-900 to-indigo-950/60 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🏛️</span>
            <div>
              <h2 className="text-lg sm:text-xl font-black tracking-tight text-yellow-300">
                Studio Thiết Kế & Quản Lý Kho Đề Đường Lên Đỉnh Olympia
              </h2>
              <p className="text-xs text-slate-300">
                Quản lý 5 vòng thi · AI Tự động gán nhãn 6 phân vùng Khởi Động & 3 phân vùng Về Đích · Theo dõi câu Đã dùng / Còn lại
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <label className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold cursor-pointer">
              📂 Nhập Excel / JSON
              <input
                type="file"
                accept=".xlsx,.xls,.json"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void handleImportFile(f);
                  e.target.value = "";
                }}
              />
            </label>
            <button
              type="button"
              onClick={() => downloadOlympiaSetExcel(draft, `${name || "KhoDe_Olympia"}.xlsx`)}
              className="px-3 py-1.5 rounded-xl bg-emerald-600/80 hover:bg-emerald-500 text-xs font-bold"
            >
              📥 Lưu file Excel (.xlsx)
            </button>
            <button
              type="button"
              onClick={() => downloadOlympiaSetJson(draft, `${name || "KhoDe_Olympia"}.json`)}
              className="px-3 py-1.5 rounded-xl bg-cyan-600/80 hover:bg-cyan-500 text-xs font-bold"
            >
              {`{ } Lưu JSON`}
            </button>
            <button
              type="button"
              onClick={() => handleSaveToBank(false)}
              className="px-3.5 py-1.5 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-slate-950 text-xs font-black"
            >
              💾 Lưu vào Kho & Áp dụng
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold"
            >
              Đóng ✕
            </button>
          </div>
        </div>

        {/* Bank Metadata + AI & Used-Question Quick Toolbar */}
        <div className="px-5 py-3 border-b border-white/10 bg-slate-900/75 space-y-2.5">
          <div className="grid md:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] text-slate-400 mb-0.5">Tên Kho đề Olympia</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-slate-950 border border-white/15 rounded-lg px-3 py-1.5 text-xs font-bold"
              />
            </div>
            <div>
              <label className="block text-[11px] text-slate-400 mb-0.5">Mô tả bộ đề / Ghi chú nguồn</label>
              <input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-slate-950 border border-white/15 rounded-lg px-3 py-1.5 text-xs"
              />
            </div>
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <label className="block text-[11px] text-slate-400 mb-0.5">
                  Số thí sinh trận đấu (tính ngưỡng Đỏ)
                </label>
                <select
                  value={simPlayers}
                  onChange={(e) => setSimPlayers(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-white/15 rounded-lg px-2.5 py-1.5 text-xs font-bold text-yellow-300"
                >
                  {[2, 3, 4, 5, 6, 7, 8].map((n) => (
                    <option key={n} value={n}>
                      {n} thí sinh (Ngưỡng Đỏ KĐ: {n * 9} câu · VĐ: {n * 3} câu)
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                onClick={() => handleSaveToBank(true)}
                className="px-3 py-1.5 rounded-lg bg-indigo-600/80 hover:bg-indigo-500 text-xs font-bold shrink-0"
              >
                📑 Lưu thành Kho mới
              </button>
            </div>
          </div>

          {/* Action bar: AI Tag, Auto-fill, Merge, and Reset Used */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-white/10 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setDraft(autoTagEntireOlympiaSet(draft, true));
                  setNotice("🤖 AI đã phân tích từ khóa và tự động gán nhãn lại toàn bộ câu hỏi vào 6 phân vùng Khởi Động & 3 phân vùng Về Đích!");
                }}
                className="px-3 py-1.5 rounded-lg bg-purple-600/80 hover:bg-purple-500 font-bold"
              >
                🤖 AI Tự động gán nhãn Lĩnh vực
              </button>
              <button
                type="button"
                onClick={() => {
                  setDraft(autoFillOlympiaSetFromSample(draft));
                  setNotice("✨ Đã tự động bù đầy đủ các câu hỏi còn thiếu từ Kho đề Olympia 25–26 Chuẩn!");
                }}
                className="px-3 py-1.5 rounded-lg bg-emerald-600/80 hover:bg-emerald-500 font-bold"
              >
                ✨ Tự động bù câu thiếu từ Kho Mẫu
              </button>
              <div className="flex items-center gap-1">
                <select
                  value={mergeSourceBankId}
                  onChange={(e) => setMergeSourceBankId(e.target.value)}
                  className="bg-slate-950 border border-white/15 rounded-lg px-2 py-1 text-xs"
                >
                  <option value="">-- Chọn kho khác để trộn thêm --</option>
                  {availableBanks.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  disabled={!mergeSourceBankId}
                  onClick={() => {
                    const src = availableBanks.find((b) => b.id === mergeSourceBankId);
                    if (src) {
                      setDraft(mergeOlympiaSets(draft, src.set));
                      setNotice(`🔀 Đã gộp thêm câu hỏi không trùng lặp từ "${src.name}"!`);
                    }
                  }}
                  className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-40 font-semibold"
                >
                  🔀 Gộp thêm
                </button>
              </div>
            </div>

            {/* Reset Used Button -> Opens Mandatory Warning Modal */}
            <button
              type="button"
              onClick={() => {
                setHasBackedUpBeforeReset(false);
                setShowResetConfirm(true);
              }}
              className="px-3 py-1.5 rounded-lg bg-rose-600/80 hover:bg-rose-500 text-white font-bold flex items-center gap-1.5"
            >
              🔄 Reset trạng thái Đã dùng ({report.kdTotal.used + report.vdTotal.used + report.chpTotal.used} câu đã dùng)
            </button>
          </div>

          {notice && (
            <div className="px-3 py-1.5 rounded-lg bg-indigo-500/20 border border-indigo-400/40 text-indigo-200 text-xs flex items-center justify-between">
              <span>{notice}</span>
              <button type="button" onClick={() => setNotice(null)} className="text-slate-400 hover:text-white">
                ✕
              </button>
            </div>
          )}
        </div>

        {/* Navigation Tabs */}
        <div className="px-5 py-2 bg-slate-900 border-b border-white/10 flex flex-wrap gap-1.5">
          {(
            [
              [
                "inventory",
                `📊 Thống kê Kho & Cảnh báo (${report.kdTotal.remaining} KĐ · ${report.vdTotal.remaining} VĐ còn lại)`,
              ],
              ["khoiDong", `1. Khởi Động (${report.kdTotal.total} câu · Đã dùng ${report.kdTotal.used})`],
              ["vcnv", `2. Vượt Chướng Ngại Vật (5 mảnh ghép)`],
              ["tangToc", `3. Tăng Tốc (${draft.tangToc.length}/4 câu)`],
              ["veDich", `4. Về Đích (${report.vdTotal.total} câu · Đã dùng ${report.vdTotal.used})`],
              ["cauHoiPhu", `5. Câu Hỏi Phụ (${report.chpTotal.total} câu)`],
            ] as const
          ).map(([tabId, label]) => (
            <button
              key={tabId}
              type="button"
              onClick={() => setActiveTab(tabId)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
                activeTab === tabId
                  ? "bg-yellow-400 text-slate-950 shadow"
                  : "bg-white/5 text-slate-300 hover:bg-white/10"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Tab Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* ───────── TAB 0: INVENTORY & THRESHOLD DASHBOARD ───────── */}
          {activeTab === "inventory" && (
            <div className="space-y-5">
              {/* Alert Summary Banner */}
              <div
                className={`p-4 rounded-2xl border ${
                  report.overallStatus === "ok"
                    ? "bg-emerald-950/30 border-emerald-500/40 text-emerald-200"
                    : report.overallStatus === "yellow"
                    ? "bg-amber-950/30 border-amber-500/40 text-amber-200"
                    : "bg-rose-950/35 border-rose-500/50 text-rose-200"
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <div className="font-black text-base flex items-center gap-2">
                    <span>
                      {report.overallStatus === "ok"
                        ? "🟢 Kho đề Olympia Đạt Chuẩn Toàn Diện"
                        : report.overallStatus === "yellow"
                        ? "🟡 Cảnh Báo Vàng: Số câu hỏi chưa dùng ở một số mục thấp hơn mức khuyến nghị"
                        : "🔴 Báo Động Đỏ: Số câu hỏi chưa dùng không đủ chia đều cho trận đấu!"}
                    </span>
                  </div>
                  <label className="flex items-center gap-2 text-xs cursor-pointer">
                    <input
                      type="checkbox"
                      checked={draft.balancedRandom !== false}
                      onChange={(e) =>
                        updateDraft((d) => {
                          d.balancedRandom = e.target.checked;
                        })
                      }
                    />
                    <span className="font-bold">
                      Bật thuật toán Rút câu hỏi ngẫu nhiên cân bằng lĩnh vực & Ưu tiên câu Chưa dùng
                    </span>
                  </label>
                </div>

                {report.alerts.length === 0 ? (
                  <p className="text-xs text-emerald-300">
                    Tất cả 6 phân vùng Khởi Động ({report.kdTotal.remaining}/{report.kdTotal.total} câu chưa dùng) và 3 phân vùng × 3 mức điểm Về Đích ({report.vdTotal.remaining}/{report.vdTotal.total} câu chưa dùng) đều vượt ngưỡng an toàn cho {simPlayers} thí sinh.
                  </p>
                ) : (
                  <ul className="space-y-1 text-xs max-h-40 overflow-y-auto pr-2">
                    {report.alerts.map((al, i) => (
                      <li key={i} className="flex items-start gap-1.5">
                        <span>{al.level === "red" ? "🔴" : "🟡"}</span>
                        <span>
                          <b>[{al.round}]</b> {al.message}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Section 1: Khởi Động Inventory (Total + 6 Zones + 11 Subjects) */}
              <div className="grid lg:grid-cols-2 gap-4">
                <div className="rounded-xl border border-white/10 bg-slate-900/70 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-sm text-yellow-300">
                      1. Vòng Khởi Động — Tổng Kho & 6 Phân Vùng Chuẩn
                    </h3>
                    {renderStatusBadge(report.kdTotal)}
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-white/5 text-slate-400">
                        <tr>
                          <th className="px-2.5 py-2">Phân vùng Khởi Động</th>
                          <th className="px-2.5 py-2 text-center">Tổng số câu</th>
                          <th className="px-2.5 py-2 text-center">Đã dùng</th>
                          <th className="px-2.5 py-2 text-center">Còn lại</th>
                          <th className="px-2.5 py-2 text-right">Trạng thái</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        <tr className="bg-indigo-500/10 font-bold">
                          <td className="px-2.5 py-2 text-white">📦 Tổng cộng Kho Khởi Động</td>
                          <td className="px-2.5 py-2 text-center">{report.kdTotal.total}</td>
                          <td className="px-2.5 py-2 text-center text-amber-300">{report.kdTotal.used}</td>
                          <td className="px-2.5 py-2 text-center text-emerald-300">{report.kdTotal.remaining}</td>
                          <td className="px-2.5 py-2 text-right">{renderStatusBadge(report.kdTotal)}</td>
                        </tr>
                        {KD_ZONES.map((z) => {
                          const st = report.kdByZone[z.id];
                          return (
                            <tr key={z.id}>
                              <td className="px-2.5 py-2">
                                <span className="font-semibold text-slate-200">
                                  {z.icon} {z.shortLabel}
                                </span>
                                <div className="text-[10px] text-slate-400">{z.subjects.join(", ")}</div>
                              </td>
                              <td className="px-2.5 py-2 text-center font-mono">{st.total}</td>
                              <td className="px-2.5 py-2 text-center font-mono text-amber-300">{st.used}</td>
                              <td className="px-2.5 py-2 text-center font-mono font-bold text-emerald-300">
                                {st.remaining}
                              </td>
                              <td className="px-2.5 py-2 text-right">{renderStatusBadge(st)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* 11 Detailed Subjects */}
                <div className="rounded-xl border border-white/10 bg-slate-900/70 p-4 space-y-3">
                  <h3 className="font-bold text-sm text-cyan-300">
                    Chi Tiết 11 Lĩnh Vực Nhỏ Trong Kho Khởi Động (Chuẩn ≥ 5 câu/môn)
                  </h3>
                  <div className="overflow-x-auto max-h-80">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-white/5 text-slate-400">
                        <tr>
                          <th className="px-2.5 py-1.5">Môn / Lĩnh vực chi tiết</th>
                          <th className="px-2.5 py-1.5 text-center">Tổng</th>
                          <th className="px-2.5 py-1.5 text-center">Đã dùng</th>
                          <th className="px-2.5 py-1.5 text-center">Còn lại</th>
                          <th className="px-2.5 py-1.5 text-right">Ngưỡng</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {KHOI_DONG_SUBJECTS.map((subj) => {
                          const st = report.kdBySubject[subj];
                          if (!st) return null;
                          return (
                            <tr key={subj}>
                              <td className="px-2.5 py-1.5 font-medium text-slate-200">{subj}</td>
                              <td className="px-2.5 py-1.5 text-center font-mono">{st.total}</td>
                              <td className="px-2.5 py-1.5 text-center font-mono text-amber-300">{st.used}</td>
                              <td className="px-2.5 py-1.5 text-center font-mono font-bold text-emerald-300">
                                {st.remaining}
                              </td>
                              <td className="px-2.5 py-1.5 text-right">{renderStatusBadge(st)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Section 2: Về Đích Inventory (Total + 3 Point Tiers + 3 Macro Zones + 3×3 Matrix) */}
              <div className="rounded-xl border border-white/10 bg-slate-900/70 p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-bold text-sm text-purple-300">
                    2. Vòng Về Đích — Thống Kê Theo Mức Điểm (10đ / 20đ / 30đ) & 3 Phân Vùng Lớn (KHTN · KHXH · Hiểu Biết Chung)
                  </h3>
                  {renderStatusBadge(report.vdTotal)}
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-white/5 text-slate-400">
                        <tr>
                          <th className="px-2.5 py-2">Mức điểm / Phân vùng VĐ</th>
                          <th className="px-2.5 py-2 text-center">Tổng số câu</th>
                          <th className="px-2.5 py-2 text-center">Đã dùng</th>
                          <th className="px-2.5 py-2 text-center">Còn lại</th>
                          <th className="px-2.5 py-2 text-right">Trạng thái</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        <tr className="bg-purple-500/10 font-bold">
                          <td className="px-2.5 py-2">📦 Tổng cộng Kho Về Đích</td>
                          <td className="px-2.5 py-2 text-center">{report.vdTotal.total}</td>
                          <td className="px-2.5 py-2 text-center text-amber-300">{report.vdTotal.used}</td>
                          <td className="px-2.5 py-2 text-center text-emerald-300">{report.vdTotal.remaining}</td>
                          <td className="px-2.5 py-2 text-right">{renderStatusBadge(report.vdTotal)}</td>
                        </tr>
                        {(["10", "20", "30"] as const).map((tier) => {
                          const st = report.vdByTier[tier];
                          return (
                            <tr key={tier}>
                              <td className="px-2.5 py-2 font-semibold">Mức {tier} điểm</td>
                              <td className="px-2.5 py-2 text-center font-mono">{st.total}</td>
                              <td className="px-2.5 py-2 text-center font-mono text-amber-300">{st.used}</td>
                              <td className="px-2.5 py-2 text-center font-mono font-bold text-emerald-300">
                                {st.remaining}
                              </td>
                              <td className="px-2.5 py-2 text-right">{renderStatusBadge(st)}</td>
                            </tr>
                          );
                        })}
                        {VD_ZONES.map((vz) => {
                          const st = report.vdByZone[vz.id];
                          return (
                            <tr key={vz.id}>
                              <td className="px-2.5 py-2">
                                {vz.icon} {vz.label}
                              </td>
                              <td className="px-2.5 py-2 text-center font-mono">{st.total}</td>
                              <td className="px-2.5 py-2 text-center font-mono text-amber-300">{st.used}</td>
                              <td className="px-2.5 py-2 text-center font-mono font-bold text-emerald-300">
                                {st.remaining}
                              </td>
                              <td className="px-2.5 py-2 text-right">{renderStatusBadge(st)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* 3x3 Matrix + CHP */}
                  <div className="space-y-3">
                    <div className="text-xs font-bold text-slate-300">
                      Ma trận Mức điểm × Phân vùng Về Đích (Chuẩn ≥ 3 câu chưa dùng / ô):
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-left border border-white/10 rounded-lg">
                        <thead className="bg-white/5 text-slate-400">
                          <tr>
                            <th className="px-2.5 py-2">Mức điểm</th>
                            {VD_ZONES.map((vz) => (
                              <th key={vz.id} className="px-2.5 py-2 text-center">
                                {vz.icon} {vz.shortLabel}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {(["10", "20", "30"] as const).map((tier) => (
                            <tr key={tier}>
                              <td className="px-2.5 py-2 font-bold">{tier} điểm</td>
                              {VD_ZONES.map((vz) => {
                                const cell = report.vdMatrix[tier][vz.id];
                                return (
                                  <td key={vz.id} className="px-2.5 py-2 text-center">
                                    <span
                                      className={`px-2 py-0.5 rounded font-mono font-bold ${
                                        cell.status === "ok"
                                          ? "bg-emerald-500/20 text-emerald-300"
                                          : cell.status === "yellow"
                                          ? "bg-amber-500/20 text-amber-300"
                                          : "bg-rose-500/25 text-rose-300"
                                      }`}
                                    >
                                      Còn {cell.remaining}/{cell.total} (Đã dùng {cell.used})
                                    </span>
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="p-3 rounded-xl bg-white/5 border border-white/10 flex flex-wrap items-center justify-between gap-2 text-xs">
                      <div>
                        <b>5. Kho Câu Hỏi Phụ (Tie-breaker):</b> Tổng {report.chpTotal.total} câu · Đã dùng{" "}
                        <span className="text-amber-300 font-bold">{report.chpTotal.used}</span> · Còn lại{" "}
                        <span className="text-emerald-300 font-bold">{report.chpTotal.remaining}</span>
                      </div>
                      {renderStatusBadge(report.chpTotal)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ───────── TAB 1: KHỞI ĐỘNG ───────── */}
          {activeTab === "khoiDong" && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-900/90 p-3 rounded-xl border border-white/10">
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setKdPoolKey("shared")}
                    className={`px-3 py-1 rounded-lg text-xs font-bold ${
                      kdPoolKey === "shared" ? "bg-indigo-600 text-white" : "bg-white/5 text-slate-300"
                    }`}
                  >
                    Kho Chung ({draft.khoiDong.shared.length})
                  </button>
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setKdPoolKey(String(s))}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                        kdPoolKey === String(s) ? "bg-indigo-600 text-white" : "bg-white/5 text-slate-300"
                      }`}
                    >
                      Thí sinh {s} ({(draft.khoiDong.solo[String(s)] ?? []).length})
                    </button>
                  ))}
                </div>

                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <select
                    value={kdZoneFilter}
                    onChange={(e) => setKdZoneFilter(e.target.value)}
                    className="bg-slate-950 border border-white/15 rounded-lg px-2 py-1"
                  >
                    <option value="ALL">Tất cả 6 phân vùng</option>
                    {KD_ZONES.map((z) => (
                      <option key={z.id} value={z.id}>
                        {z.icon} {z.shortLabel}
                      </option>
                    ))}
                  </select>
                  <select
                    value={kdUsedFilter}
                    onChange={(e) => setKdUsedFilter(e.target.value as "ALL" | "UNUSED" | "USED")}
                    className="bg-slate-950 border border-white/15 rounded-lg px-2 py-1"
                  >
                    <option value="ALL">Tất cả trạng thái</option>
                    <option value="UNUSED">Chưa dùng</option>
                    <option value="USED">Đã dùng</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => {
                      const nextQ: QA = {
                        q: "Câu hỏi Khởi Động mới...",
                        a: "Đáp án",
                        subject: "Toán",
                        kdZone: "MATH_IT",
                        used: false,
                      };
                      setKdList([nextQ, ...currentKdList]);
                    }}
                    className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 font-bold"
                  >
                    + Thêm câu hỏi
                  </button>
                </div>
              </div>

              <div className="space-y-2.5">
                {currentKdList.map((item, idx) => {
                  if (kdZoneFilter !== "ALL" && item.kdZone !== kdZoneFilter) return null;
                  if (kdUsedFilter === "UNUSED" && item.used) return null;
                  if (kdUsedFilter === "USED" && !item.used) return null;
                  return (
                    <div
                      key={idx}
                      className={`p-3 rounded-xl border ${
                        item.used
                          ? "border-amber-500/30 bg-amber-950/15"
                          : "border-white/10 bg-slate-900/70"
                      } space-y-2`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono font-bold text-slate-400">#{idx + 1}</span>
                          <select
                            value={item.subject || "Lĩnh vực khác"}
                            onChange={(e) => {
                              const nextSubj = e.target.value;
                              const tagged = classifyQuestionWithAI(item.q, item.a, nextSubj);
                              const copy = [...currentKdList];
                              copy[idx] = {
                                ...item,
                                subject: nextSubj,
                                kdZone: tagged.kdZone,
                                vdZone: tagged.vdZone,
                              };
                              setKdList(copy);
                            }}
                            className="bg-slate-950 border border-white/15 rounded px-2 py-0.5 text-xs text-cyan-200 font-semibold"
                          >
                            {KHOI_DONG_SUBJECTS.map((subj) => (
                              <option key={subj} value={subj}>
                                {subj}
                              </option>
                            ))}
                          </select>
                          <select
                            value={item.kdZone || "GENERAL"}
                            onChange={(e) => {
                              const copy = [...currentKdList];
                              copy[idx] = { ...item, kdZone: e.target.value as KdZoneId };
                              setKdList(copy);
                            }}
                            className="bg-slate-950 border border-white/15 rounded px-2 py-0.5 text-xs text-purple-200"
                          >
                            {KD_ZONES.map((z) => (
                              <option key={z.id} value={z.id}>
                                {z.icon} {z.shortLabel}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="flex items-center gap-3">
                          <label className="flex items-center gap-1.5 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={Boolean(item.used)}
                              onChange={(e) => {
                                const copy = [...currentKdList];
                                copy[idx] = { ...item, used: e.target.checked };
                                setKdList(copy);
                              }}
                            />
                            <span className={item.used ? "text-amber-300 font-bold" : "text-slate-400"}>
                              {item.used ? "Đã dùng" : "Chưa dùng"}
                            </span>
                          </label>
                          <button
                            type="button"
                            onClick={() => setKdList(currentKdList.filter((_, i) => i !== idx))}
                            className="text-rose-400 hover:text-rose-300 font-bold"
                          >
                            Xóa
                          </button>
                        </div>
                      </div>

                      <div className="grid md:grid-cols-3 gap-2">
                        <input
                          value={item.q}
                          onChange={(e) => {
                            const copy = [...currentKdList];
                            const tagged = classifyQuestionWithAI(e.target.value, item.a);
                            copy[idx] = {
                              ...item,
                              q: e.target.value,
                              subject: tagged.subject,
                              kdZone: tagged.kdZone,
                              vdZone: tagged.vdZone,
                            };
                            setKdList(copy);
                          }}
                          placeholder="Nội dung câu hỏi..."
                          className="md:col-span-2 bg-slate-950 border border-white/10 rounded-lg px-3 py-1.5 text-xs"
                        />
                        <input
                          value={item.a}
                          onChange={(e) => {
                            const copy = [...currentKdList];
                            copy[idx] = { ...item, a: e.target.value };
                            setKdList(copy);
                          }}
                          placeholder="Đáp án chuẩn..."
                          className="bg-slate-950 border border-emerald-500/30 rounded-lg px-3 py-1.5 text-xs text-emerald-300 font-semibold"
                        />
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <input
                          value={item.media || ""}
                          onChange={(e) => {
                            const copy = [...currentKdList];
                            copy[idx] = { ...item, media: e.target.value || undefined };
                            setKdList(copy);
                          }}
                          placeholder="Link Ảnh / Video / Âm thanh (nếu có)..."
                          className="flex-1 bg-slate-950 border border-white/10 rounded-lg px-2.5 py-1 text-xs"
                        />
                        <label className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-xs cursor-pointer">
                          📎 Tải file
                          <input
                            type="file"
                            accept="image/*,video/*,audio/*"
                            className="hidden"
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              if (f) {
                                void handleUploadMedia(f, (url) => {
                                  const copy = [...currentKdList];
                                  copy[idx] = { ...item, media: url };
                                  setKdList(copy);
                                });
                              }
                            }}
                          />
                        </label>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ───────── TAB 2: VCNV (5 TILES + SEPARATE REVEAL BUTTONS) ───────── */}
          {activeTab === "vcnv" && (
            <div className="grid lg:grid-cols-3 gap-5">
              <div className="lg:col-span-2 space-y-4">
                <div className="rounded-xl border border-white/10 bg-slate-900/75 p-4 space-y-3">
                  <h3 className="font-bold text-sm text-yellow-300">
                    Từ khóa Chướng Ngại Vật & Hình ảnh ẩn (Chia 5 mảnh ghép: 4 góc + 1 ô trung tâm)
                  </h3>
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Từ khóa Chướng Ngại Vật (CNV)</label>
                      <input
                        value={draft.vcnv.answer}
                        onChange={(e) =>
                          updateDraft((d) => {
                            d.vcnv.answer = e.target.value.toUpperCase();
                          })
                        }
                        className="w-full bg-slate-950 border border-yellow-400/40 rounded-lg px-3 py-2 text-sm font-black text-yellow-300"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Link Hình ảnh Chướng Ngại Vật</label>
                      <div className="flex gap-2">
                        <input
                          value={draft.vcnv.mysteryImage || ""}
                          onChange={(e) =>
                            updateDraft((d) => {
                              d.vcnv.mysteryImage = e.target.value;
                            })
                          }
                          placeholder="URL ảnh bức tranh bí ẩn..."
                          className="flex-1 bg-slate-950 border border-white/15 rounded-lg px-3 py-2 text-xs"
                        />
                        <label className="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-bold cursor-pointer shrink-0">
                          📎 Tải ảnh
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              if (f) {
                                void handleUploadMedia(f, (url) =>
                                  updateDraft((d) => {
                                    d.vcnv.mysteryImage = url;
                                  })
                                );
                              }
                            }}
                          />
                        </label>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 4 Horizontal Rows */}
                <div className="space-y-2.5">
                  {draft.vcnv.rows.map((r, i) => (
                    <div key={i} className="rounded-xl border border-white/10 bg-slate-900/75 p-3 space-y-2">
                      <div className="text-xs font-bold text-cyan-300">
                        Hàng ngang số {i + 1} (Tương ứng mảnh ghép góc {i + 1}) — Số ký tự:{" "}
                        {r.answer.replace(/\s/g, "").length}
                      </div>
                      <div className="grid md:grid-cols-3 gap-2">
                        <input
                          value={r.hint}
                          onChange={(e) =>
                            updateDraft((d) => {
                              d.vcnv.rows[i].hint = e.target.value;
                            })
                          }
                          placeholder={`Câu hỏi gợi ý hàng ngang ${i + 1}...`}
                          className="md:col-span-2 bg-slate-950 border border-white/10 rounded-lg px-3 py-1.5 text-xs"
                        />
                        <input
                          value={r.answer}
                          onChange={(e) =>
                            updateDraft((d) => {
                              d.vcnv.rows[i].answer = e.target.value.toUpperCase();
                            })
                          }
                          placeholder="Đáp án hàng ngang..."
                          className="bg-slate-950 border border-emerald-500/30 rounded-lg px-3 py-1.5 text-xs font-bold text-emerald-300"
                        />
                      </div>
                    </div>
                  ))}

                  {/* Question #5: Center Question */}
                  <div className="rounded-xl border border-amber-400/40 bg-amber-950/20 p-3 space-y-2">
                    <div className="text-xs font-bold text-amber-300">
                      ⭐ Câu hỏi số 5 — Ô Trung Tâm (Mở mảnh ghép trung tâm số 5)
                    </div>
                    <div className="grid md:grid-cols-3 gap-2">
                      <input
                        value={draft.vcnv.centerQuestion?.q || ""}
                        onChange={(e) =>
                          updateDraft((d) => {
                            d.vcnv.centerQuestion = {
                              q: e.target.value,
                              a: d.vcnv.centerQuestion?.a || "",
                            };
                          })
                        }
                        placeholder="Câu hỏi gợi ý cuối cùng tại Ô Trung Tâm..."
                        className="md:col-span-2 bg-slate-950 border border-white/10 rounded-lg px-3 py-1.5 text-xs"
                      />
                      <input
                        value={draft.vcnv.centerQuestion?.a || ""}
                        onChange={(e) =>
                          updateDraft((d) => {
                            d.vcnv.centerQuestion = {
                              q: d.vcnv.centerQuestion?.q || "",
                              a: e.target.value.toUpperCase(),
                            };
                          })
                        }
                        placeholder="Đáp án Ô Trung Tâm..."
                        className="bg-slate-950 border border-amber-400/40 rounded-lg px-3 py-1.5 text-xs font-bold text-amber-300"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Interactive 5-Tile Preview with Separate Reveal Buttons */}
              <div className="rounded-xl border border-white/10 bg-slate-900/80 p-4 space-y-3">
                <div className="text-xs font-bold text-slate-200">
                  Xem trước Bảng Ô Chữ & 5 Mảnh Ghép VCNV
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => setPreviewRowsOpen([true, true, true, true, true])}
                    className="px-2.5 py-1 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-xs font-bold"
                  >
                    🔤 Mở hết ô chữ
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewPiecesOpen([true, true, true, true, true])}
                    className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold"
                  >
                    🧩 Mở hết mảnh ghép
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPreviewRowsOpen([false, false, false, false, false]);
                      setPreviewPiecesOpen([false, false, false, false, false]);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-xs"
                  >
                    Đóng lại
                  </button>
                </div>

                {/* 4 rows preview */}
                <div className="space-y-1.5">
                  {draft.vcnv.rows.map((r, i) => (
                    <div
                      key={i}
                      onClick={() => {
                        const next = [...previewRowsOpen];
                        next[i] = !next[i];
                        setPreviewRowsOpen(next);
                      }}
                      className="p-2 rounded-lg bg-slate-950 border border-white/10 flex items-center justify-between text-xs cursor-pointer"
                    >
                      <span className="text-slate-400">Hàng {i + 1}:</span>
                      <span className="font-mono font-bold text-emerald-300">
                        {previewRowsOpen[i] ? r.answer : r.answer.replace(/[^\s]/g, "●")}
                      </span>
                    </div>
                  ))}
                </div>

                {/* 5-Piece Mystery Image Preview */}
                <div className="relative aspect-video rounded-xl overflow-hidden border border-white/20 bg-slate-950">
                  {draft.vcnv.mysteryImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={draft.vcnv.mysteryImage}
                      alt="VCNV preview"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs text-slate-500">
                      Chưa có ảnh Chướng ngại vật
                    </div>
                  )}
                  <div className="absolute inset-0 grid grid-cols-2 grid-rows-2">
                    {[0, 1, 2, 3].map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => {
                          const next = [...previewPiecesOpen];
                          next[p] = !next[p];
                          setPreviewPiecesOpen(next);
                        }}
                        className={`border border-white/20 flex items-center justify-center font-black text-base transition ${
                          previewPiecesOpen[p]
                            ? "bg-transparent text-transparent"
                            : "bg-indigo-950/95 text-white hover:bg-indigo-900"
                        }`}
                      >
                        {!previewPiecesOpen[p] && `Mảnh ${p + 1}`}
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const next = [...previewPiecesOpen];
                      next[4] = !next[4];
                      setPreviewPiecesOpen(next);
                    }}
                    className={`absolute inset-1/4 border-2 border-amber-300/60 rounded-xl flex items-center justify-center font-black text-xs transition ${
                      previewPiecesOpen[4]
                        ? "bg-transparent text-transparent border-transparent"
                        : "bg-amber-900/95 text-amber-200 shadow-lg"
                    }`}
                  >
                    {!previewPiecesOpen[4] && "Ô Trung Tâm (5)"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ───────── TAB 3: TĂNG TỐC (WITH MULTI-CLUE IMAGES) ───────── */}
          {activeTab === "tangToc" && (
            <div className="space-y-4">
              {draft.tangToc.map((ttQ, idx) => (
                <div
                  key={idx}
                  className="rounded-xl border border-white/10 bg-slate-900/80 p-4 space-y-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm font-black text-yellow-300">
                      Câu Tăng Tốc số {idx + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        updateDraft((d) => {
                          const list = d.tangToc[idx].clueImages ?? [];
                          list.push({
                            url: d.tangToc[idx].media || "",
                            atSec: list.length * 5,
                            label: `Gợi ý ${list.length + 1}`,
                          });
                          d.tangToc[idx].clueImages = list;
                        })
                      }
                      className="px-2.5 py-1 rounded-lg bg-cyan-600/80 hover:bg-cyan-500 text-xs font-bold"
                    >
                      + Thêm mốc ảnh gợi ý theo giây (Clue Image)
                    </button>
                  </div>

                  <div className="grid md:grid-cols-3 gap-3">
                    <input
                      value={ttQ.q || ""}
                      onChange={(e) =>
                        updateDraft((d) => {
                          d.tangToc[idx].q = e.target.value;
                        })
                      }
                      placeholder="Nội dung câu hỏi Tăng Tốc..."
                      className="md:col-span-2 bg-slate-950 border border-white/10 rounded-lg px-3 py-1.5 text-xs"
                    />
                    <input
                      value={ttQ.answer}
                      onChange={(e) =>
                        updateDraft((d) => {
                          d.tangToc[idx].answer = e.target.value;
                        })
                      }
                      placeholder="Đáp án chuẩn..."
                      className="bg-slate-950 border border-emerald-500/30 rounded-lg px-3 py-1.5 text-xs font-bold text-emerald-300"
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      value={ttQ.media || ""}
                      onChange={(e) =>
                        updateDraft((d) => {
                          d.tangToc[idx].media = e.target.value;
                        })
                      }
                      placeholder="Link Ảnh / Video chính..."
                      className="flex-1 bg-slate-950 border border-white/10 rounded-lg px-3 py-1 text-xs"
                    />
                    <label className="px-3 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-xs cursor-pointer">
                      📎 Tải file
                      <input
                        type="file"
                        accept="image/*,video/*"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) {
                            void handleUploadMedia(f, (url) =>
                              updateDraft((d) => {
                                d.tangToc[idx].media = url;
                              })
                            );
                          }
                        }}
                      />
                    </label>
                  </div>

                  {ttQ.clueImages && ttQ.clueImages.length > 0 && (
                    <div className="space-y-1.5 pt-2 border-t border-white/10">
                      <div className="text-[11px] text-cyan-300 font-semibold">
                        Chuỗi ảnh gợi ý xuất hiện lần lượt theo đồng hồ đếm ngược:
                      </div>
                      {ttQ.clueImages.map((cl, cIdx) => (
                        <div key={cIdx} className="flex flex-wrap items-center gap-2 text-xs">
                          <span className="text-slate-400">Mốc giây:</span>
                          <input
                            type="number"
                            min={0}
                            max={40}
                            value={cl.atSec}
                            onChange={(e) =>
                              updateDraft((d) => {
                                d.tangToc[idx].clueImages![cIdx].atSec = Number(e.target.value) || 0;
                              })
                            }
                            className="w-16 bg-slate-950 border border-white/10 rounded px-2 py-1"
                          />
                          <input
                            value={cl.label || ""}
                            onChange={(e) =>
                              updateDraft((d) => {
                                d.tangToc[idx].clueImages![cIdx].label = e.target.value;
                              })
                            }
                            placeholder="Nhãn gợi ý..."
                            className="w-36 bg-slate-950 border border-white/10 rounded px-2 py-1"
                          />
                          <input
                            value={cl.url}
                            onChange={(e) =>
                              updateDraft((d) => {
                                d.tangToc[idx].clueImages![cIdx].url = e.target.value;
                              })
                            }
                            placeholder="URL ảnh gợi ý..."
                            className="flex-1 bg-slate-950 border border-white/10 rounded px-2 py-1"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              updateDraft((d) => {
                                d.tangToc[idx].clueImages = d.tangToc[idx].clueImages?.filter(
                                  (_, i) => i !== cIdx
                                );
                              })
                            }
                            className="text-rose-400 hover:text-rose-300"
                          >
                            Xóa
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* ───────── TAB 4: VỀ ĐÍCH ───────── */}
          {activeTab === "veDich" && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-900/90 p-3 rounded-xl border border-white/10">
                <div className="flex flex-wrap items-center gap-1.5">
                  {(["10", "20", "30", "40"] as const).map((tier) => (
                    <button
                      key={tier}
                      type="button"
                      onClick={() => setVdTier(tier)}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-bold ${
                        vdTier === tier ? "bg-purple-600 text-white" : "bg-white/5 text-slate-300"
                      }`}
                    >
                      Mức {tier} điểm ({(draft.veDich[tier] ?? []).length} câu)
                    </button>
                  ))}
                </div>

                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <select
                    value={vdZoneFilter}
                    onChange={(e) => setVdZoneFilter(e.target.value as "ALL" | VdZoneId)}
                    className="bg-slate-950 border border-white/15 rounded-lg px-2.5 py-1"
                  >
                    <option value="ALL">Tất cả 3 phân vùng (KHTN / KHXH / HBC)</option>
                    {VD_ZONES.map((vz) => (
                      <option key={vz.id} value={vz.id}>
                        {vz.icon} {vz.label}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => {
                      const nextQ: VeDichQuestion = {
                        q: `Câu hỏi Về Đích ${vdTier} điểm mới...`,
                        a: "Đáp án",
                        type: "theory",
                        subject: "Vật lý",
                        vdZone: "KHTN",
                        used: false,
                      };
                      setVdList([nextQ, ...currentVdList]);
                    }}
                    className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 font-bold"
                  >
                    + Thêm câu {vdTier}đ
                  </button>
                </div>
              </div>

              <div className="space-y-2.5">
                {currentVdList.map((item, idx) => {
                  if (vdZoneFilter !== "ALL" && item.vdZone !== vdZoneFilter) return null;
                  return (
                    <div
                      key={idx}
                      className={`p-3 rounded-xl border ${
                        item.used
                          ? "border-amber-500/30 bg-amber-950/15"
                          : "border-white/10 bg-slate-900/70"
                      } space-y-2`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono font-bold text-purple-300">
                            [{vdTier}đ · #{idx + 1}]
                          </span>
                          <select
                            value={item.vdZone || "HBC"}
                            onChange={(e) => {
                              const copy = [...currentVdList];
                              copy[idx] = { ...item, vdZone: e.target.value as VdZoneId };
                              setVdList(copy);
                            }}
                            className="bg-slate-950 border border-white/15 rounded px-2 py-0.5 text-xs text-cyan-200 font-bold"
                          >
                            {VD_ZONES.map((vz) => (
                              <option key={vz.id} value={vz.id}>
                                {vz.icon} {vz.label}
                              </option>
                            ))}
                          </select>
                          <select
                            value={item.subject || "Lĩnh vực khác"}
                            onChange={(e) => {
                              const copy = [...currentVdList];
                              copy[idx] = { ...item, subject: e.target.value };
                              setVdList(copy);
                            }}
                            className="bg-slate-950 border border-white/15 rounded px-2 py-0.5 text-xs text-slate-200"
                          >
                            {KHOI_DONG_SUBJECTS.map((subj) => (
                              <option key={subj} value={subj}>
                                {subj}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="flex items-center gap-3">
                          <label className="flex items-center gap-1.5 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={Boolean(item.used)}
                              onChange={(e) => {
                                const copy = [...currentVdList];
                                copy[idx] = { ...item, used: e.target.checked };
                                setVdList(copy);
                              }}
                            />
                            <span className={item.used ? "text-amber-300 font-bold" : "text-slate-400"}>
                              {item.used ? "Đã dùng" : "Chưa dùng"}
                            </span>
                          </label>
                          <button
                            type="button"
                            onClick={() => setVdList(currentVdList.filter((_, i) => i !== idx))}
                            className="text-rose-400 hover:text-rose-300 font-bold"
                          >
                            Xóa
                          </button>
                        </div>
                      </div>

                      <div className="grid md:grid-cols-3 gap-2">
                        <input
                          value={item.q}
                          onChange={(e) => {
                            const copy = [...currentVdList];
                            const tagged = classifyQuestionWithAI(e.target.value, item.a);
                            copy[idx] = {
                              ...item,
                              q: e.target.value,
                              subject: tagged.subject,
                              kdZone: tagged.kdZone,
                              vdZone: tagged.vdZone,
                            };
                            setVdList(copy);
                          }}
                          className="md:col-span-2 bg-slate-950 border border-white/10 rounded-lg px-3 py-1.5 text-xs"
                        />
                        <input
                          value={item.a}
                          onChange={(e) => {
                            const copy = [...currentVdList];
                            copy[idx] = { ...item, a: e.target.value };
                            setVdList(copy);
                          }}
                          className="bg-slate-950 border border-emerald-500/30 rounded-lg px-3 py-1.5 text-xs font-bold text-emerald-300"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ───────── TAB 5: CÂU HỎI PHỤ ───────── */}
          {activeTab === "cauHoiPhu" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-xs text-slate-300">
                  Kho Câu Hỏi Phụ (Phân định thắng thua khi đồng điểm cao nhất sau Về Đích — Chuẩn ≥ 5 câu)
                </div>
                <button
                  type="button"
                  onClick={() =>
                    updateDraft((d) => {
                      d.cauHoiPhu.unshift({
                        q: "Câu hỏi phụ mới...",
                        a: "Đáp án",
                        subject: "Lĩnh vực khác",
                        used: false,
                      });
                    })
                  }
                  className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-bold"
                >
                  + Thêm Câu hỏi phụ
                </button>
              </div>
              {draft.cauHoiPhu.map((item, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl border border-white/10 bg-slate-900/75 grid md:grid-cols-4 gap-2 items-center text-xs"
                >
                  <input
                    value={item.q}
                    onChange={(e) =>
                      updateDraft((d) => {
                        d.cauHoiPhu[idx].q = e.target.value;
                      })
                    }
                    className="md:col-span-2 bg-slate-950 border border-white/10 rounded-lg px-3 py-1.5"
                  />
                  <input
                    value={item.a}
                    onChange={(e) =>
                      updateDraft((d) => {
                        d.cauHoiPhu[idx].a = e.target.value;
                      })
                    }
                    className="bg-slate-950 border border-emerald-500/30 rounded-lg px-3 py-1.5 font-bold text-emerald-300"
                  />
                  <div className="flex items-center justify-end gap-3">
                    <label className="flex items-center gap-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={Boolean(item.used)}
                        onChange={(e) =>
                          updateDraft((d) => {
                            d.cauHoiPhu[idx].used = e.target.checked;
                          })
                        }
                      />
                      <span>{item.used ? "Đã dùng" : "Chưa dùng"}</span>
                    </label>
                    <button
                      type="button"
                      onClick={() =>
                        updateDraft((d) => {
                          d.cauHoiPhu = d.cauHoiPhu.filter((_, i) => i !== idx);
                        })
                      }
                      className="text-rose-400 hover:text-rose-300 font-bold"
                    >
                      Xóa
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ───────── MANDATORY WARNING MODAL BEFORE RESETTING "ĐÃ DÙNG" ───────── */}
        {showResetConfirm && (
          <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border-2 border-rose-500/60 rounded-2xl max-w-xl w-full p-6 space-y-4 shadow-2xl">
              <div className="flex items-start gap-3">
                <span className="text-3xl">⚠️</span>
                <div>
                  <h3 className="text-lg font-black text-rose-300">
                    Cảnh Báo Quan Trọng Trước Khi Reset Trạng Thái &ldquo;Đã Dùng&rdquo;
                  </h3>
                  <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                    Thao tác này sẽ xóa toàn bộ dấu <b>&ldquo;Đã dùng&rdquo;</b> của{" "}
                    <b className="text-amber-300">
                      {report.kdTotal.used + report.vdTotal.used + report.chpTotal.used} câu hỏi
                    </b>{" "}
                    trong kho đề hiện tại và đưa tất cả câu hỏi về trạng thái <b>&ldquo;Chưa dùng&rdquo;</b>.
                  </p>
                  <p className="text-xs text-amber-200 mt-1.5 font-semibold">
                    💡 Bạn có thể tải hoặc sao lưu kho đề hiện tại (kèm trạng thái Đã dùng) ra file hoặc sang kho đề khác trước khi thực hiện Reset:
                  </p>
                </div>
              </div>

              {/* Save / Download options BEFORE resetting */}
              <div className="p-3.5 rounded-xl bg-slate-950 border border-white/10 space-y-2">
                <div className="text-xs font-bold text-cyan-300">
                  Bước khuyến nghị — Lưu / Tải Kho đề ra chỗ khác trước khi Reset:
                </div>
                <div className="grid sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      downloadOlympiaSetExcel(draft, `${name || "KhoDe_Olympia"}_TruocKhiReset.xlsx`);
                      setHasBackedUpBeforeReset(true);
                    }}
                    className="px-3 py-2 rounded-xl bg-emerald-600/80 hover:bg-emerald-500 text-xs font-bold text-center"
                  >
                    📥 Tải file Excel (.xlsx)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      downloadOlympiaSetJson(draft, `${name || "KhoDe_Olympia"}_TruocKhiReset.json`);
                      setHasBackedUpBeforeReset(true);
                    }}
                    className="px-3 py-2 rounded-xl bg-cyan-600/80 hover:bg-cyan-500 text-xs font-bold text-center"
                  >
                    {`{ } Tải file JSON (.json)`}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (bankId) {
                        duplicateOlympiaBank(bankId, `${name} (Sao lưu trước Reset)`);
                      } else {
                        saveOlympiaBank({
                          id: `olympia_backup_${Date.now()}`,
                          name: `${name} (Sao lưu trước Reset)`,
                          description,
                          seasonHint: "O13 – O26",
                          createdAt: new Date().toISOString(),
                          set: draft,
                        });
                      }
                      setHasBackedUpBeforeReset(true);
                      setNotice("📑 Đã lưu một bản sao Kho đề (giữ nguyên trạng thái Đã dùng) vào Kho đề Olympia!");
                    }}
                    className="px-3 py-2 rounded-xl bg-indigo-600/80 hover:bg-indigo-500 text-xs font-bold text-center"
                  >
                    📑 Lưu bản sao vào Kho
                  </button>
                </div>
                {hasBackedUpBeforeReset && (
                  <div className="text-[11px] text-emerald-300 font-semibold pt-1">
                    ✓ Đã sao lưu kho đề thành công! Bây giờ bạn có thể yên tâm bấm Xác nhận Reset bên dưới.
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowResetConfirm(false)}
                  className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold"
                >
                  Hủy bỏ
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDraft(resetAllUsedInSet(draft));
                    setShowResetConfirm(false);
                    setNotice("🔄 Đã Reset toàn bộ trạng thái câu hỏi về 'Chưa dùng'!");
                  }}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-black"
                >
                  ⚠️ Xác nhận Reset toàn bộ về Chưa dùng
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
