// Import & Export of Olympia question sets from/to Excel (.xlsx) and JSON formats.
// Supports 8 contestants, 11 subjects, 6 KD zones, 3 VD macro-zones, "used" tracking, and multi-clue Tăng Tốc.
import type {
  KdZoneId,
  OlympiaQuestionSet,
  QA,
  TangTocClueImage,
  TangTocQuestion,
  VcnvRowDef,
  VdZoneId,
  VeDichQuestion,
} from "./types";
import { autoTagOlympiaSet, tagQAWithAI } from "./ai-classifier";

type Row = Record<string, unknown>;

const strip = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/gi, "d")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

const str = (v: unknown) => (v == null ? "" : String(v).trim());

const boolVal = (v: unknown): boolean => {
  if (typeof v === "boolean") return v;
  const s = str(v).toLowerCase();
  return s === "1" || s === "true" || s === "yes" || s === "x" || s === "dadung" || s === "đã dùng" || s === "used";
};

/** Normalise row keys: "Câu Hỏi" -> "cauhoi" */
function norm(rows: Row[]): Row[] {
  return rows.map((r) => {
    const o: Row = {};
    for (const [k, v] of Object.entries(r)) o[strip(k)] = v;
    return o;
  });
}

const VIDEO_RE = /\.(mp4|webm|mov|m4v|ogv|mpeg)$/i;
const AUDIO_RE = /\.(mp3|wav|ogg|m4a|aac|flac)$/i;
export const detectMediaType = (url: string): "image" | "video" | "audio" =>
  VIDEO_RE.test(url) ? "video" : AUDIO_RE.test(url) ? "audio" : "image";

function qa(r: Row): QA | null {
  const q = str(r.cauhoi ?? r.question ?? r.q);
  const a = str(r.dapan ?? r.answer ?? r.a);
  if (!q && !a) return null;
  const media = str(r.media ?? r.file ?? r.link);
  const subject = str(r.linhvuc ?? r.mon ?? r.subject ?? r.chude);
  const kdZone = str(r.phanvungkd ?? r.kdzone) as KdZoneId | "";
  const vdZone = str(r.phanvungvd ?? r.vdzone) as VdZoneId | "";
  const used = boolVal(r.dadung ?? r.used ?? r.trangthai);
  return tagQAWithAI(
    {
      q,
      a,
      ...(subject ? { subject } : {}),
      ...(kdZone ? { kdZone: kdZone as KdZoneId } : {}),
      ...(vdZone ? { vdZone: vdZone as VdZoneId } : {}),
      ...(used ? { used: true } : {}),
      ...(media ? { media, mediaType: detectMediaType(media) } : {}),
    },
    false
  );
}

export interface ImportResult {
  set: OlympiaQuestionSet;
  warnings: string[];
}

export function emptyQuestionSet(name = "Bộ đề mới"): OlympiaQuestionSet {
  return {
    name,
    balancedRandom: true,
    khoiDong: {
      solo: { "1": [], "2": [], "3": [], "4": [], "5": [], "6": [], "7": [], "8": [] },
      shared: [],
    },
    vcnv: { answer: "", rows: [] },
    tangToc: [],
    veDich: { "10": [], "20": [], "30": [], "40": [] },
    cauHoiPhu: [],
  };
}

function parseClueImagesString(raw: string): TangTocClueImage[] | undefined {
  if (!raw.trim()) return undefined;
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed
        .filter((x) => x && typeof x.url === "string" && x.url.trim())
        .map((x, idx) => ({
          url: String(x.url).trim(),
          atSecond: Number.isFinite(Number(x.atSecond)) ? Number(x.atSecond) : idx * 5,
          ...(x.label ? { label: String(x.label) } : {}),
        }));
    }
  } catch {
    // Fallback: semicolon or pipe separated "0:url1 | 5:url2"
    const parts = raw
      .split(/[;|]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    const items: TangTocClueImage[] = [];
    parts.forEach((p, idx) => {
      const m = p.match(/^(\d+)s?:\s*(.+)$/i);
      if (m) {
        items.push({ atSecond: Number(m[1]), url: m[2].trim() });
      } else {
        items.push({ atSecond: idx * 5, url: p });
      }
    });
    if (items.length > 0) return items;
  }
  return undefined;
}

/** `sheets` maps sheet name -> rows (as produced by XLSX.utils.sheet_to_json). */
export function parseSheets(sheets: Record<string, Row[]>, name = "Bộ đề Excel"): ImportResult {
  const set = emptyQuestionSet(name);
  const warnings: string[] = [];
  const byKey: Record<string, Row[]> = {};
  for (const [n, rows] of Object.entries(sheets)) byKey[strip(n)] = norm(rows);

  const find = (...keys: string[]) => {
    for (const k of keys) if (byKey[k]) return byKey[k];
    return undefined;
  };

  const solo = find("khoidongrieng", "khoidongsolo", "khoidong");
  if (solo) {
    for (const r of solo) {
      const seatNum = Number(r.thisinh ?? r.ghe ?? r.seat);
      const item = qa(r);
      if (!item) continue;
      if (seatNum >= 1 && seatNum <= 8) {
        const seat = String(seatNum);
        (set.khoiDong.solo[seat] ??= []).push(item);
      } else {
        set.khoiDong.shared.push(item);
      }
    }
  } else warnings.push("Thiếu sheet “KhoiDong Rieng”.");

  const shared = find("khoidongchung", "khoidongshared");
  if (shared) {
    shared.forEach((r) => {
      const i = qa(r);
      if (i) set.khoiDong.shared.push(i);
    });
  } else warnings.push("Thiếu sheet “KhoiDong Chung” (O24+ dùng cho lượt chung).");

  // O22 / O23 style turn sheets ("Luot 1..3") feed the shared pool as well
  for (const key of Object.keys(byKey)
    .filter((k) => /^luot\d+$/.test(k))
    .sort()) {
    byKey[key].forEach((r) => {
      const i = qa(r);
      if (i) set.khoiDong.shared.push(i);
    });
  }

  const vcnv = find("vcnv", "vuotchuongngaivat");
  if (vcnv) {
    const rows: VcnvRowDef[] = [];
    for (const r of vcnv) {
      const hangStr = strip(str(r.hang));
      if (hangStr === "dapancnv" || hangStr === "chuongngaivat") {
        if (str(r.dapan) && !set.vcnv.answer) set.vcnv.answer = str(r.dapan);
        if (str(r.media) && !set.vcnv.mysteryImage) set.vcnv.mysteryImage = str(r.media);
        continue;
      }
      if (hangStr === "5" || hangStr === "otrungtam" || hangStr === "trungtam") {
        const m = str(r.media ?? r.mediatrungtam);
        set.vcnv.centerQuestion = {
          q: str(r.goiy ?? r.cauhoi ?? r.cauhoitrungtam),
          a: str(r.dapan ?? r.dapantrungtam),
          ...(m ? { media: m, mediaType: detectMediaType(m) } : {}),
        };
        continue;
      }
      if (str(r.goiy) || str(r.dapan)) {
        const media = str(r.media);
        rows.push({
          hint: str(r.goiy),
          answer: str(r.dapan),
          used: boolVal(r.dadung ?? r.used),
          ...(media ? { media, mediaType: detectMediaType(media) } : {}),
        });
      }
      if (str(r.dapancnv) && !set.vcnv.answer) set.vcnv.answer = str(r.dapancnv);
      if (str(r.cauhoitrungtam) && !set.vcnv.centerQuestion) {
        const m = str(r.mediatrungtam);
        set.vcnv.centerQuestion = {
          q: str(r.cauhoitrungtam),
          a: str(r.dapantrungtam),
          ...(m ? { media: m, mediaType: detectMediaType(m) } : {}),
        };
      }
      if (str(r.mediatrungtam) && !set.vcnv.mysteryImage) set.vcnv.mysteryImage = str(r.mediatrungtam);
    }
    set.vcnv.rows = rows.slice(0, 4);
    if (!set.vcnv.answer) {
      warnings.push("VCNV: thiếu cột DapAnCNV (từ khóa chướng ngại vật).");
    }
    if (set.vcnv.rows.length < 4) warnings.push(`VCNV: chỉ có ${set.vcnv.rows.length}/4 hàng ngang.`);
  } else warnings.push("Thiếu sheet “VCNV”.");

  const tt = find("tangtoc");
  if (tt) {
    for (const r of tt) {
      const media = str(r.file) || str(r.media);
      const answer = str(r.dapan);
      if (!media && !answer && !str(r.cauhoi)) continue;
      const catRaw = strip(str(r.loaicauhoi ?? r.category ?? r.phanloai));
      const category: "iq" | "data" | "arrange" | undefined =
        catRaw.includes("sapxep") || catRaw === "arrange"
          ? "arrange"
          : catRaw.includes("dukien") || catRaw === "data"
            ? "data"
            : catRaw.includes("iq")
              ? "iq"
              : undefined;
      const clueImages = parseClueImagesString(str(r.anhgoiy ?? r.clueimages));
      const item: TangTocQuestion = {
        answer,
        duration: Number(r.thoigian) || undefined,
        ...(str(r.cauhoi) ? { q: str(r.cauhoi) } : {}),
        ...(category ? { category } : {}),
        ...(clueImages ? { clueImages } : {}),
        ...(boolVal(r.dadung ?? r.used) ? { used: true } : {}),
        ...(media ? { media, type: detectMediaType(media) } : {}),
      };
      set.tangToc.push(item);
    }
    if (set.tangToc.length !== 4) warnings.push(`Tăng Tốc: có ${set.tangToc.length} câu (chuẩn là 4).`);
  } else warnings.push("Thiếu sheet “TangToc”.");

  const vd = find("vedich");
  if (vd) {
    for (const r of vd) {
      const ptsNum = Number(r.mucdiem ?? r.diem ?? r.points) || 20;
      const pts = String([10, 20, 30, 40].includes(ptsNum) ? ptsNum : 20);
      const item = qa(r);
      if (!item) continue;
      const kind = strip(str(r.loaicauhoi ?? r.type));
      const q: VeDichQuestion = {
        ...item,
        type: kind.startsWith("thuc") || kind === "practice" ? "practice" : "theory",
      };
      (set.veDich[pts] ??= []).push(q);
    }
  } else warnings.push("Thiếu sheet “VeDich”.");

  const chp = find("cauphu", "cauhoiphu");
  if (chp) {
    chp.forEach((r) => {
      const i = qa(r);
      if (i) set.cauHoiPhu.push(i);
    });
  } else warnings.push("Thiếu sheet “CauPhu”.");

  // Also support unified single-sheet tables (e.g. Form test Olympia 25 / Sheet1 with "Vòng thi", "Phân loại", "Câu hỏi", "Đáp án")
  for (const [, rows] of Object.entries(byKey)) {
    for (const r of rows) {
      const vong = strip(str(r.vongthi ?? r.round));
      if (!vong) continue;
      if (vong.includes("khoidong")) {
        const item = qa(r);
        if (item) set.khoiDong.shared.push(item);
      } else if (vong.includes("vedich")) {
        const item = qa(r);
        if (item) {
          const ptsNum = Number(r.mucdiem ?? r.phanloai) || 20;
          const pts = String([10, 20, 30, 40].includes(ptsNum) ? ptsNum : 20);
          (set.veDich[pts] ??= []).push({ ...item, type: "theory" });
        }
      } else if (vong.includes("cauphu") || vong.includes("cauhoiphu")) {
        const item = qa(r);
        if (item) set.cauHoiPhu.push(item);
      }
    }
  }

  return { set: autoTagOlympiaSet(set, false), warnings };
}

/** Validate and normalise JSON question set (supports single set or bank wrapper). */
export function parseJsonSet(raw: unknown): ImportResult {
  const warnings: string[] = [];
  const rawObj = (raw ?? {}) as Record<string, any>;
  const j = (rawObj.questionSet && typeof rawObj.questionSet === "object" ? rawObj.questionSet : rawObj) as Record<string, any>;
  const set = emptyQuestionSet(str(j.name ?? rawObj.title) || "Bộ đề JSON");
  if (j.id) set.id = str(j.id);
  if (j.description ?? rawObj.description) set.description = str(j.description ?? rawObj.description);
  if (typeof j.balancedRandom === "boolean") set.balancedRandom = j.balancedRandom;

  const toQA = (x: any): QA => {
    const media = str(x?.media);
    return tagQAWithAI(
      {
        q: str(x?.q ?? x?.cauHoi),
        a: str(x?.a ?? x?.dapAn),
        ...(x?.subject ? { subject: str(x.subject) } : {}),
        ...(x?.kdZone ? { kdZone: x.kdZone as KdZoneId } : {}),
        ...(x?.vdZone ? { vdZone: x.vdZone as VdZoneId } : {}),
        ...(x?.used ? { used: Boolean(x.used) } : {}),
        ...(media ? { media, mediaType: detectMediaType(media) } : {}),
      },
      false
    );
  };
  if (j.khoiDong?.solo) {
    for (const [k, v] of Object.entries<any>(j.khoiDong.solo)) {
      set.khoiDong.solo[k] = (v ?? []).map(toQA);
    }
  }
  if (j.khoiDong?.shared) set.khoiDong.shared = j.khoiDong.shared.map(toQA);
  if (j.vcnv) {
    set.vcnv.answer = str(j.vcnv.answer);
    set.vcnv.mysteryImage = str(j.vcnv.mysteryImage) || undefined;
    set.vcnv.rows = (j.vcnv.rows ?? []).slice(0, 4).map((r: any) => {
      const m = str(r.media);
      return {
        hint: str(r.hint),
        answer: str(r.answer),
        ...(r.used ? { used: Boolean(r.used) } : {}),
        ...(m ? { media: m, mediaType: detectMediaType(m) } : {}),
      };
    });
    if (j.vcnv.centerQuestion) set.vcnv.centerQuestion = toQA(j.vcnv.centerQuestion);
  }
  if (Array.isArray(j.tangToc)) {
    set.tangToc = j.tangToc.map((t: any) => {
      const media = str(t.media);
      return {
        answer: str(t.answer),
        duration: Number(t.duration) || undefined,
        ...(t.q ? { q: str(t.q) } : {}),
        ...(t.category ? { category: t.category } : {}),
        ...(Array.isArray(t.clueImages) ? { clueImages: t.clueImages } : {}),
        ...(t.used ? { used: Boolean(t.used) } : {}),
        ...(media ? { media, type: t.type === "video" ? "video" : detectMediaType(media) } : {}),
      };
    });
  }
  if (j.veDich) {
    for (const [k, v] of Object.entries<any>(j.veDich)) {
      set.veDich[k] = (v ?? []).map((x: any) => ({
        ...toQA(x),
        type: x.type === "practice" ? "practice" : "theory",
      }));
    }
  }
  if (Array.isArray(j.cauHoiPhu)) set.cauHoiPhu = j.cauHoiPhu.map(toQA);
  if (!set.vcnv.answer || set.vcnv.rows.length === 0) warnings.push("JSON thiếu dữ liệu VCNV.");
  return { set: autoTagOlympiaSet(set, false), warnings };
}

/**
 * Convert an OlympiaQuestionSet into a map of 6 standard Excel sheets
 * preserving all 8 solo seats, subjects, AI zones (kdZone/vdZone), "used" state, and media links.
 */
export function exportOlympiaSetToSheets(set: OlympiaQuestionSet): Record<string, Record<string, unknown>[]> {
  const tagged = autoTagOlympiaSet(set, false);

  const soloRows: Record<string, unknown>[] = [];
  for (let s = 1; s <= 8; s++) {
    const list = tagged.khoiDong.solo[String(s)] ?? [];
    for (const q of list) {
      soloRows.push({
        ThiSinh: s,
        LinhVuc: q.subject ?? "",
        PhanVungKD: q.kdZone ?? "",
        CauHoi: q.q,
        DapAn: q.a,
        Media: q.media ?? "",
        DaDung: q.used ? "Đã dùng" : "",
      });
    }
  }

  const sharedRows = (tagged.khoiDong.shared ?? []).map((q) => ({
    LinhVuc: q.subject ?? "",
    PhanVungKD: q.kdZone ?? "",
    CauHoi: q.q,
    DapAn: q.a,
    Media: q.media ?? "",
    DaDung: q.used ? "Đã dùng" : "",
  }));

  const vcnvRows = Array.from({ length: 4 }, (_, i) => {
    const r = tagged.vcnv.rows[i];
    return {
      Hang: i + 1,
      GoiY: r?.hint ?? "",
      DapAn: r?.answer ?? "",
      Media: r?.media ?? "",
      DapAnCNV: i === 0 ? tagged.vcnv.answer : "",
      CauHoiTrungTam: i === 0 ? (tagged.vcnv.centerQuestion?.q ?? "") : "",
      DapAnTrungTam: i === 0 ? (tagged.vcnv.centerQuestion?.a ?? "") : "",
      MediaTrungTam: i === 0 ? (tagged.vcnv.mysteryImage ?? "") : "",
      DaDung: r?.used ? "Đã dùng" : "",
    };
  });

  const tangTocRows = (tagged.tangToc ?? []).map((t, i) => ({
    CauSo: i + 1,
    LoaiCauHoi: t.category ?? (i === 0 ? "iq" : i === 2 ? "arrange" : "data"),
    CauHoi: t.q ?? "",
    File: t.media ?? "",
    AnhGoiY: t.clueImages && t.clueImages.length > 0 ? JSON.stringify(t.clueImages) : "",
    ThoiGian: t.duration ?? 30,
    DapAn: t.answer,
    DaDung: t.used ? "Đã dùng" : "",
  }));

  const veDichRows: Record<string, unknown>[] = [];
  for (const pts of ["10", "20", "30", "40"]) {
    for (const q of tagged.veDich[pts] ?? []) {
      veDichRows.push({
        MucDiem: Number(pts),
        PhanVungVD: q.vdZone ?? "",
        LinhVuc: q.subject ?? "",
        LoaiCauHoi: q.type === "practice" ? "Thực hành" : "Lý thuyết",
        CauHoi: q.q,
        DapAn: q.a,
        Media: q.media ?? "",
        DaDung: q.used ? "Đã dùng" : "",
      });
    }
  }

  const chpRows = (tagged.cauHoiPhu ?? []).map((q) => ({
    LinhVuc: q.subject ?? "",
    PhanVungVD: q.vdZone ?? "",
    CauHoi: q.q,
    DapAn: q.a,
    Media: q.media ?? "",
    DaDung: q.used ? "Đã dùng" : "",
  }));

  return {
    "KhoiDong Rieng": soloRows,
    "KhoiDong Chung": sharedRows,
    VCNV: vcnvRows,
    TangToc: tangTocRows,
    VeDich: veDichRows,
    CauPhu: chpRows,
  };
}

// ── media handling ──
const isRemote = (u: string) => /^(https?:)?\/\//i.test(u) || u.startsWith("/uploads/") || u.startsWith("data:");
export const baseName = (p: string) => p.split(/[\\/]/).pop() ?? p;

function mapMedia(set: OlympiaQuestionSet, fn: (m: string | undefined) => string | undefined) {
  const touch = <T extends { media?: string; mediaType?: string }>(x: T) => {
    const next = fn(x.media);
    if (next !== x.media) {
      x.media = next;
      if (next && "mediaType" in x) (x as { mediaType?: string }).mediaType = detectMediaType(next);
    }
  };
  Object.values(set.khoiDong.solo).forEach((l) => l.forEach(touch));
  set.khoiDong.shared.forEach(touch);
  set.vcnv.rows.forEach(touch);
  if (set.vcnv.centerQuestion) touch(set.vcnv.centerQuestion);
  const mi = fn(set.vcnv.mysteryImage);
  if (mi !== set.vcnv.mysteryImage) set.vcnv.mysteryImage = mi;
  set.tangToc.forEach((t) => {
    const next = fn(t.media);
    if (next !== t.media) {
      t.media = next;
      if (next) t.type = detectMediaType(next);
    }
    if (t.clueImages) {
      t.clueImages = t.clueImages.map((ci) => ({
        ...ci,
        url: fn(ci.url) ?? ci.url,
      }));
    }
  });
  Object.values(set.veDich).forEach((l) => l.forEach(touch));
  set.cauHoiPhu.forEach(touch);
}

/** Local file references (e.g. "D:\\...\\cau1.webp") that still need uploading. */
export function localMediaRefs(set: OlympiaQuestionSet): string[] {
  const seen = new Set<string>();
  mapMedia(structuredClone(set), (m) => {
    if (m && !isRemote(m)) seen.add(baseName(m));
    return m;
  });
  return [...seen];
}

export function applyMediaMap(set: OlympiaQuestionSet, map: Record<string, string>): OlympiaQuestionSet {
  const copy = structuredClone(set);
  mapMedia(copy, (m) => (m && !isRemote(m) ? (map[baseName(m)] ?? m) : m));
  return copy;
}

export interface SetStats {
  soloPerSeat: number[];
  soloTotal: number;
  shared: number;
  khoiDongTotal: number;
  khoiDongUsed: number;
  khoiDongRemaining: number;
  vcnvRows: number;
  tangToc: number;
  veDich: Record<string, number>;
  veDichTotal: number;
  veDichUsed: number;
  veDichRemaining: number;
  cauHoiPhu: number;
  cauHoiPhuUsed: number;
  cauHoiPhuRemaining: number;
}

export function statsOf(set: OlympiaQuestionSet): SetStats {
  const soloPerSeat = ["1", "2", "3", "4", "5", "6", "7", "8"].map((k) => set.khoiDong.solo[k]?.length ?? 0);
  const allKd = [...Object.values(set.khoiDong.solo).flat(), ...(set.khoiDong.shared ?? [])];
  const kdUsed = allKd.filter((q) => q.used).length;
  const allVd = Object.values(set.veDich).flat();
  const vdUsed = allVd.filter((q) => q.used).length;
  const chpUsed = (set.cauHoiPhu ?? []).filter((q) => q.used).length;

  return {
    soloPerSeat,
    soloTotal: soloPerSeat.reduce((a, b) => a + b, 0),
    shared: set.khoiDong.shared.length,
    khoiDongTotal: allKd.length,
    khoiDongUsed: kdUsed,
    khoiDongRemaining: Math.max(0, allKd.length - kdUsed),
    vcnvRows: set.vcnv.rows.length,
    tangToc: set.tangToc.length,
    veDich: Object.fromEntries(Object.entries(set.veDich).map(([k, v]) => [k, v.length])),
    veDichTotal: allVd.length,
    veDichUsed: vdUsed,
    veDichRemaining: Math.max(0, allVd.length - vdUsed),
    cauHoiPhu: set.cauHoiPhu.length,
    cauHoiPhuUsed: chpUsed,
    cauHoiPhuRemaining: Math.max(0, set.cauHoiPhu.length - chpUsed),
  };
}
