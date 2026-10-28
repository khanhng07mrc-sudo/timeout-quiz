import * as XLSX from "xlsx";
import type { OlympiaState, OlympiaTranscriptEntry, QA, QuestionSet, VeDichQuestion } from "./types";
import { SAMPLE_QUESTION_SET } from "./sample-questions";
import { autoTagEntireOlympiaSet, KD_ZONES, VD_ZONES } from "./ai-classifier";
import { exportOlympiaSetToSheets } from "./excel-import";

export interface OlympiaBankItem {
  id: string;
  name: string;
  description: string;
  seasonHint: string;
  createdAt: string;
  updatedAt: string;
  isPreset?: boolean;
  set: QuestionSet;
}

const STORAGE_KEY = "timeout_quiz_olympia_banks_v1";

function cloneSet(set: QuestionSet): QuestionSet {
  return JSON.parse(JSON.stringify(set));
}

export function getPresetOlympiaBanks(): OlympiaBankItem[] {
  const taggedSample = autoTagEntireOlympiaSet(cloneSet(SAMPLE_QUESTION_SET), false);
  return [
    {
      id: "olympia_preset_o25_o26_full",
      name: "Đề Thi Olympia 25–26 Toàn Tập (96 Câu Khởi Động · 27 Câu Về Đích)",
      description:
        "Kho đề Olympia chuẩn đa lĩnh vực (tham khảo Form test Olympia 25 & O22–O26): 96 câu Khởi động chia đều 6 phân vùng, VCNV 5 mảnh ghép (Từ khóa: TIÊU LỆNH CHỮA CHÁY), 4 câu Tăng Tốc kèm 4 mốc ảnh gợi ý, 27 câu Về Đích (10/20/30đ cân bằng KHTN - KHXH - Hiểu biết chung) và 6 Câu hỏi phụ.",
      seasonHint: "O13 – O26 (2–8 thí sinh)",
      createdAt: "2026-10-28T00:00:00.000Z",
      updatedAt: "2026-10-28T00:00:00.000Z",
      isPreset: true,
      set: taggedSample,
    },
  ];
}

export function getOlympiaBanks(): OlympiaBankItem[] {
  const presets = getPresetOlympiaBanks();
  if (typeof window === "undefined") return presets;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(presets));
      return presets;
    }
    const parsed = JSON.parse(raw) as OlympiaBankItem[];
    if (!Array.isArray(parsed) || parsed.length === 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(presets));
      return presets;
    }
    const hasPreset = parsed.some((b) => b.id === "olympia_preset_o25_o26_full");
    if (!hasPreset) {
      const merged = [...presets, ...parsed];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
      return merged;
    }
    return parsed;
  } catch {
    return presets;
  }
}

export function getOlympiaBankById(id: string): OlympiaBankItem | null {
  const all = getOlympiaBanks();
  return all.find((b) => b.id === id) ?? null;
}

export function saveOlympiaBank(item: Omit<OlympiaBankItem, "updatedAt"> & { updatedAt?: string }): OlympiaBankItem {
  const all = getOlympiaBanks();
  const now = new Date().toISOString();
  const taggedSet = autoTagEntireOlympiaSet(cloneSet(item.set), false);
  const full: OlympiaBankItem = {
    ...item,
    set: taggedSet,
    updatedAt: item.updatedAt ?? now,
    createdAt: item.createdAt || now,
  };
  const idx = all.findIndex((b) => b.id === full.id);
  if (idx >= 0) all[idx] = full;
  else all.unshift(full);
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
    } catch {
      // ignore quota errors
    }
  }
  return full;
}

export function duplicateOlympiaBank(id: string, customName?: string): OlympiaBankItem | null {
  const src = getOlympiaBankById(id);
  if (!src) return null;
  const now = new Date().toISOString();
  const copy: OlympiaBankItem = {
    id: `olympia_bank_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    name: customName || `${src.name} (Bản sao)`,
    description: src.description,
    seasonHint: src.seasonHint,
    createdAt: now,
    updatedAt: now,
    isPreset: false,
    set: cloneSet(src.set),
  };
  return saveOlympiaBank(copy);
}

export function deleteOlympiaBank(id: string): boolean {
  const all = getOlympiaBanks();
  const next = all.filter((b) => b.id !== id);
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {}
  }
  return next.length !== all.length;
}

function normKey(text: string): string {
  return String(text || "").trim().toLowerCase();
}

export function markQuestionsUsedInSet(set: QuestionSet, questionTexts: string[], usedState = true): QuestionSet {
  const next = cloneSet(set);
  const keys = new Set(questionTexts.map(normKey).filter(Boolean));
  if (keys.size === 0) return next;

  const updateQA = (q: QA) => {
    if (keys.has(normKey(q.q))) q.used = usedState;
  };
  Object.values(next.khoiDong.solo).forEach((arr) => arr.forEach(updateQA));
  next.khoiDong.shared.forEach(updateQA);
  Object.values(next.veDich).forEach((arr) => arr.forEach(updateQA));
  next.cauHoiPhu.forEach(updateQA);
  return next;
}

export function resetAllUsedInSet(set: QuestionSet): QuestionSet {
  const next = cloneSet(set);
  const clear = (q: QA) => {
    q.used = false;
  };
  Object.values(next.khoiDong.solo).forEach((arr) => arr.forEach(clear));
  next.khoiDong.shared.forEach(clear);
  Object.values(next.veDich).forEach((arr) => arr.forEach(clear));
  next.cauHoiPhu.forEach(clear);
  return next;
}

export function syncMatchUsedQuestionsToBank(bankId: string, questionTexts: string[], markAsUsed = true): OlympiaBankItem | null {
  const bank = getOlympiaBankById(bankId);
  if (!bank) return null;
  const updatedSet = markQuestionsUsedInSet(bank.set, questionTexts, markAsUsed);
  return saveOlympiaBank({
    ...bank,
    set: updatedSet,
  });
}

export function autoFillOlympiaSetFromSample(target: QuestionSet): QuestionSet {
  const next = autoTagEntireOlympiaSet(cloneSet(target), false);
  const sample = autoTagEntireOlympiaSet(cloneSet(SAMPLE_QUESTION_SET), false);

  const existingKd = new Set<string>();
  Object.values(next.khoiDong.solo).forEach((arr) => arr.forEach((q) => existingKd.add(normKey(q.q))));
  next.khoiDong.shared.forEach((q) => existingKd.add(normKey(q.q)));

  for (let s = 1; s <= 8; s++) {
    const key = String(s);
    if (!next.khoiDong.solo[key]) next.khoiDong.solo[key] = [];
    const sampleSolo = sample.khoiDong.solo[key] ?? [];
    for (const q of sampleSolo) {
      if (next.khoiDong.solo[key].length >= 10) break;
      if (!existingKd.has(normKey(q.q))) {
        next.khoiDong.solo[key].push({ ...q, used: false });
        existingKd.add(normKey(q.q));
      }
    }
  }

  for (const q of sample.khoiDong.shared) {
    if (!existingKd.has(normKey(q.q))) {
      next.khoiDong.shared.push({ ...q, used: false });
      existingKd.add(normKey(q.q));
    }
  }

  if (!next.vcnv.answer) next.vcnv = cloneSet(sample).vcnv;
  if (next.tangToc.length < 4) {
    for (let i = next.tangToc.length; i < 4; i++) {
      if (sample.tangToc[i]) next.tangToc.push({ ...sample.tangToc[i] });
    }
  }

  for (const tier of ["10", "20", "30", "40"]) {
    if (!next.veDich[tier]) next.veDich[tier] = [];
    const existingVd = new Set(next.veDich[tier].map((q) => normKey(q.q)));
    for (const q of sample.veDich[tier] ?? []) {
      if (!existingVd.has(normKey(q.q))) {
        next.veDich[tier].push({ ...q, used: false });
        existingVd.add(normKey(q.q));
      }
    }
  }

  const existingChp = new Set(next.cauHoiPhu.map((q) => normKey(q.q)));
  for (const q of sample.cauHoiPhu) {
    if (!existingChp.has(normKey(q.q))) {
      next.cauHoiPhu.push({ ...q, used: false });
      existingChp.add(normKey(q.q));
    }
  }

  return autoTagEntireOlympiaSet(next, false);
}

export function mergeOlympiaSets(base: QuestionSet, extra: QuestionSet): QuestionSet {
  const next = autoTagEntireOlympiaSet(cloneSet(base), false);
  const src = autoTagEntireOlympiaSet(cloneSet(extra), false);

  const existingKd = new Set<string>();
  Object.values(next.khoiDong.solo).forEach((arr) => arr.forEach((q) => existingKd.add(normKey(q.q))));
  next.khoiDong.shared.forEach((q) => existingKd.add(normKey(q.q)));

  for (const [k, arr] of Object.entries(src.khoiDong.solo)) {
    if (!next.khoiDong.solo[k]) next.khoiDong.solo[k] = [];
    for (const q of arr) {
      if (!existingKd.has(normKey(q.q))) {
        next.khoiDong.solo[k].push({ ...q });
        existingKd.add(normKey(q.q));
      }
    }
  }
  for (const q of src.khoiDong.shared) {
    if (!existingKd.has(normKey(q.q))) {
      next.khoiDong.shared.push({ ...q });
      existingKd.add(normKey(q.q));
    }
  }

  for (const [tier, arr] of Object.entries(src.veDich)) {
    if (!next.veDich[tier]) next.veDich[tier] = [];
    const existingVd = new Set((next.veDich[tier] ?? []).map((q: VeDichQuestion) => normKey(q.q)));
    for (const q of arr) {
      if (!existingVd.has(normKey(q.q))) {
        next.veDich[tier].push({ ...q });
        existingVd.add(normKey(q.q));
      }
    }
  }

  const existingChp = new Set(next.cauHoiPhu.map((q) => normKey(q.q)));
  for (const q of src.cauHoiPhu) {
    if (!existingChp.has(normKey(q.q))) {
      next.cauHoiPhu.push({ ...q });
      existingChp.add(normKey(q.q));
    }
  }

  return autoTagEntireOlympiaSet(next, false);
}

export function downloadOlympiaSetExcel(set: QuestionSet, filename = "KhoDe_Olympia.xlsx"): void {
  if (typeof window === "undefined") return;
  const sheets = exportOlympiaSetToSheets(set);
  const wb = XLSX.utils.book_new();
  for (const [sheetName, rows] of Object.entries(sheets)) {
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31));
  }
  XLSX.writeFile(wb, filename.endsWith(".xlsx") ? filename : `${filename}.xlsx`);
}

export function downloadOlympiaSetJson(set: QuestionSet, filename = "KhoDe_Olympia.json"): void {
  if (typeof window === "undefined") return;
  const blob = new Blob([JSON.stringify(set, null, 2)], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".json") ? filename : `${filename}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function zoneLabelOf(entry: OlympiaTranscriptEntry): string {
  const parts: string[] = [];
  if (entry.subject) parts.push(entry.subject);
  if (entry.kdZone) {
    const z = KD_ZONES.find((k) => k.id === entry.kdZone);
    if (z) parts.push(z.shortLabel);
  }
  if (entry.vdZone) {
    const z = VD_ZONES.find((v) => v.id === entry.vdZone);
    if (z) parts.push(z.shortLabel);
  }
  return parts.join(" · ") || "—";
}

function verdictLabelOf(verdict?: OlympiaTranscriptEntry["verdict"]): string {
  switch (verdict) {
    case "correct":
      return "Đúng";
    case "wrong":
      return "Sai";
    case "skip":
      return "Bỏ qua / Không ai trả lời";
    case "steal_correct":
      return "Cướp điểm Đúng";
    case "steal_wrong":
      return "Cướp điểm Sai";
    default:
      return "Thông tin";
  }
}

export function exportMatchTranscriptExcel(
  state: OlympiaState,
  mode: "rut_gon" | "chi_tiet" | "tron_bo",
  filename?: string
): void {
  if (typeof window === "undefined") return;
  const wb = XLSX.utils.book_new();
  const entries = state.transcript ?? [];
  const activeSeats = state.seats.filter((s) => Boolean(s.name));

  // Sheet 1: TongQuan
  const overviewRows: (string | number)[][] = [
    ["BIÊN BẢN TRẬN ĐẤU ĐƯỜNG LÊN ĐỈNH OLYMPIA"],
    ["Tên trận đấu", state.name || state.code],
    ["Mã phòng", state.code],
    ["Bộ luật mùa thi", state.rulesetId],
    ["Số thí sinh", activeSeats.length],
    ["Chế độ xuất biên bản", mode === "rut_gon" ? "Biên bản Rút gọn" : mode === "chi_tiet" ? "Biên bản Chi tiết" : "Trọn bộ (Rút gọn + Chi tiết)"],
    ["Thời gian xuất", new Date().toLocaleString("vi-VN")],
    [],
    ["Vị trí ghế", "Họ tên thí sinh", "Điểm chung cuộc"],
    ...activeSeats.map((s) => [`Vị trí ${s.id + 1}`, s.name, s.score]),
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(overviewRows), "TongQuan");

  // Sheet Rút gọn
  if (mode === "rut_gon" || mode === "tron_bo") {
    const rutGonEntries = entries.filter((e) => e.entryKind !== "score_adjust");
    const rows: (string | number)[][] = [
      [
        "STT",
        "Vòng thi",
        "Lượt / Phần thi",
        "Câu hỏi đã dùng",
        "Đáp án chuẩn",
        "Lĩnh vực / Phân vùng",
        "Gói điểm / Mức điểm",
        "Ngôi sao hy vọng",
        "Thí sinh chính / Bấm chuông",
        "Trạng thái Đúng/Sai",
        "2 Đáp án cuối & Thứ tự trả lời (VCNV / Tăng Tốc)",
        "Biến động điểm",
        "Điểm các thí sinh sau câu",
      ],
    ];
    rutGonEntries.forEach((e, idx) => {
      const subSummary =
        e.submissions && e.submissions.length > 0
          ? e.submissions
              .map((s) => {
                const rankStr = s.rank > 0 ? `#${s.rank}` : "Không nộp";
                const prevStr = s.previousAnswer ? ` (Trước đó: "${s.previousAnswer}" @ ${( (s.previousMs ?? 0) / 1000 ).toFixed(2)}s)` : "";
                const timeStr = s.finalMs != null ? ` [${(s.finalMs / 1000).toFixed(2)}s]` : "";
                const resStr = s.noAnswer ? "—" : s.correct ?? s.isCorrect ? `✓ Đúng (+${s.pointsAwarded}đ)` : "✘ Sai";
                return `${rankStr} ${s.name}: Chốt "${s.finalAnswer || "—"}"${timeStr}${prevStr} -> ${resStr}`;
              })
              .join(" | ")
          : "—";
      const deltaSummary = Object.entries(e.scoreChanges ?? {})
        .map(([seatId, d]) => {
          const sName = state.seats[Number(seatId)]?.name || `TS ${Number(seatId) + 1}`;
          return `${sName}: ${d >= 0 ? "+" : ""}${d}`;
        })
        .join(", ");
      const snapshotSummary = activeSeats
        .map((s) => `${s.name}: ${(e.scoresSnapshot ?? e.scoresAfter ?? {})[s.id] ?? 0}`)
        .join(" | ");
      const actorStr = e.buzzedName
        ? `${e.buzzedName} (Bấm chuông)`
        : e.actorName || "Tất cả thí sinh";
      const pkgStr = e.packageLabel
        ? `${e.packageLabel}${e.questionPoints ? ` · Câu ${e.questionPoints}đ` : ""}`
        : e.questionPoints
        ? `${e.questionPoints}đ`
        : "—";

      rows.push([
        idx + 1,
        e.roundLabel,
        e.segmentLabel,
        e.questionText || e.note || "—",
        e.correctAnswer || "—",
        zoneLabelOf(e),
        pkgStr,
        e.hopeStar ? "Có (x2)" : "—",
        actorStr,
        verdictLabelOf(e.verdict),
        subSummary,
        deltaSummary || "0",
        snapshotSummary,
      ]);
    });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), "BienBan_RutGon");
  }

  // Sheet Chi tiết
  if (mode === "chi_tiet" || mode === "tron_bo") {
    const rows: (string | number)[][] = [
      [
        "STT",
        "Thời gian",
        "Vòng thi",
        "Lượt / Phần thi",
        "Loại sự kiện",
        "Câu hỏi đã dùng",
        "Đáp án chuẩn",
        "Lĩnh vực / Phân vùng",
        "Gói câu hỏi / Mức điểm",
        "Ngôi sao hy vọng",
        "Thí sinh thực hiện / Bấm chuông",
        "Chuỗi bấm chuông chi tiết",
        "Trạng thái Đúng/Sai",
        "2 Đáp án cuối (Chốt cuối & Áp chót)",
        "Toàn bộ lịch sử các lần nhập đáp án (VCNV / Tăng Tốc — Tính cả câu trả lời không cuối)",
        "Biến động điểm",
        "Điểm sau sự kiện",
        "Ghi chú",
      ],
    ];
    entries.forEach((e, idx) => {
      const lastTwoStr =
        e.submissions && e.submissions.length > 0
          ? e.submissions
              .map((s) => {
                const rankStr = s.rank > 0 ? `#${s.rank}` : "Không nộp";
                const prevStr = s.previousAnswer ? ` | Áp chót: "${s.previousAnswer}" (${((s.previousMs ?? 0) / 1000).toFixed(2)}s)` : " | Áp chót: (Không có)";
                return `${rankStr} ${s.name}: Cuối "${s.finalAnswer || "—"}" (${((s.finalMs ?? 0) / 1000).toFixed(2)}s)${prevStr}`;
              })
              .join(" ;; ")
          : "—";
      const allAttemptsStr =
        e.submissions && e.submissions.length > 0
          ? e.submissions
              .map((s) => {
                if (!s.allAttempts || s.allAttempts.length === 0) return `${s.name}: (Không nhập)`;
                const list = s.allAttempts
                  .map((att, aIdx) => `Lần ${aIdx + 1} [${(att.ms / 1000).toFixed(2)}s]: "${att.answer ?? att.text}"`)
                  .join(" -> ");
                return `${s.name} (${s.allAttempts.length} lần): ${list}`;
              })
              .join(" ;; ")
          : "—";
      const buzzerStr =
        e.buzzerEvents && e.buzzerEvents.length > 0
          ? e.buzzerEvents
              .map(
                (b) =>
                  `#${b.order} ${b.name}${b.beforeReveal ? " (Trước lật hàng)" : ""} [${b.verdict === "correct" ? "Đúng" : b.verdict === "wrong" ? "Sai" : "Chờ"}]`
              )
              .join(" -> ")
          : e.buzzedName || "—";
      const deltaSummary = Object.entries(e.scoreChanges ?? {})
        .map(([seatId, d]) => {
          const sName = state.seats[Number(seatId)]?.name || `TS ${Number(seatId) + 1}`;
          return `${sName}: ${d >= 0 ? "+" : ""}${d}`;
        })
        .join(", ");
      const snapshotSummary = activeSeats
        .map((s) => `${s.name}: ${(e.scoresSnapshot ?? e.scoresAfter ?? {})[s.id] ?? 0}`)
        .join(" | ");
      const pkgStr = e.packageLabel
        ? `${e.packageLabel}${e.questionPoints ? ` · Câu ${e.questionPoints}đ` : ""}`
        : e.questionPoints
        ? `${e.questionPoints}đ`
        : "—";

      rows.push([
        idx + 1,
        new Date(e.at).toLocaleTimeString("vi-VN"),
        e.roundLabel,
        e.segmentLabel,
        e.entryKind,
        e.questionText || "—",
        e.correctAnswer || "—",
        zoneLabelOf(e),
        pkgStr,
        e.hopeStar ? "Có (x2)" : "—",
        e.actorName || e.buzzedName || "—",
        buzzerStr,
        verdictLabelOf(e.verdict),
        lastTwoStr,
        allAttemptsStr,
        deltaSummary || "0",
        snapshotSummary,
        e.note || "",
      ]);
    });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), "BienBan_ChiTiet");
  }

  // Sheet CauHoiDaDung
  const usedRows: (string | number)[][] = [
    ["STT", "Vòng thi", "Lượt thi", "Nội dung câu hỏi đã mở", "Đáp án chuẩn", "Môn / Phân vùng", "Kết quả"],
  ];
  entries
    .filter((e) => e.questionText)
    .forEach((e, i) => {
      usedRows.push([
        i + 1,
        e.roundLabel,
        e.segmentLabel,
        e.questionText || "",
        e.correctAnswer || "",
        zoneLabelOf(e),
        verdictLabelOf(e.verdict),
      ]);
    });
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(usedRows), "CauHoi_DaDung");

  const defaultName = `BienBan_Olympia_${state.code}_${mode === "rut_gon" ? "RutGon" : mode === "chi_tiet" ? "ChiTiet" : "TronBo"}.xlsx`;
  XLSX.writeFile(wb, filename || defaultName);
}

export function exportMatchTranscriptJson(
  state: OlympiaState,
  mode: "rut_gon" | "chi_tiet",
  filename?: string
): void {
  if (typeof window === "undefined") return;
  const entries = (state.transcript ?? []).filter((e) => (mode === "rut_gon" ? e.entryKind !== "score_adjust" : true));
  const payload = {
    matchCode: state.code,
    matchName: state.name,
    rulesetId: state.rulesetId,
    mode: mode === "rut_gon" ? "Rút gọn" : "Chi tiết",
    exportedAt: new Date().toISOString(),
    contestants: state.seats.filter((s) => Boolean(s.name)),
    openedQuestionCount: (state.openedQuestionKeys ?? []).length,
    transcript: entries.map((e) => {
      if (mode === "rut_gon") {
        return {
          seq: e.seq,
          round: e.roundLabel,
          segment: e.segmentLabel,
          questionText: e.questionText,
          correctAnswer: e.correctAnswer,
          subject: e.subject,
          kdZone: e.kdZone,
          vdZone: e.vdZone,
          packageLabel: e.packageLabel,
          questionPoints: e.questionPoints,
          hopeStar: e.hopeStar,
          actorName: e.actorName,
          buzzedName: e.buzzedName,
          verdict: e.verdict,
          submissions: e.submissions?.map((s) => ({
            rank: s.rank,
            seat: s.seat,
            name: s.name,
            finalAnswer: s.finalAnswer,
            finalMs: s.finalMs,
            previousAnswer: s.previousAnswer,
            previousMs: s.previousMs,
            correct: s.correct,
            pointsAwarded: s.pointsAwarded,
          })),
          scoreChanges: e.scoreChanges,
          scoresSnapshot: e.scoresSnapshot,
        };
      }
      return e;
    }),
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename || `BienBan_Olympia_${state.code}_${mode === "rut_gon" ? "RutGon" : "ChiTiet"}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
