// Import of Olympia question sets from the original app's Excel / JSON formats.
import type { OlympiaQuestionSet, QA, TangTocQuestion, VcnvRowDef, VeDichQuestion } from "./types";

type Row = Record<string, unknown>;

const strip = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/gi, "d")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

const str = (v: unknown) => (v == null ? "" : String(v).trim());

/** Normalise row keys: "Câu Hỏi" -> "cauhoi" */
function norm(rows: Row[]): Row[] {
  return rows.map((r) => {
    const o: Row = {};
    for (const [k, v] of Object.entries(r)) o[strip(k)] = v;
    return o;
  });
}

const VIDEO_RE = /\.(mp4|webm|mov|m4v|ogv)$/i;
const mediaType = (url: string) => (VIDEO_RE.test(url) ? ("video" as const) : ("image" as const));

function qa(r: Row): QA | null {
  const q = str(r.cauhoi);
  const a = str(r.dapan);
  if (!q && !a) return null;
  const media = str(r.media);
  return { q, a, ...(media ? { media, mediaType: mediaType(media) } : {}) };
}

export interface ImportResult {
  set: OlympiaQuestionSet;
  warnings: string[];
}

export function emptyQuestionSet(name = "Bộ đề mới"): OlympiaQuestionSet {
  return {
    name,
    khoiDong: { solo: { "1": [], "2": [], "3": [], "4": [] }, shared: [] },
    vcnv: { answer: "", rows: [] },
    tangToc: [],
    veDich: { "10": [], "20": [], "30": [], "40": [] },
    cauHoiPhu: [],
  };
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

  const solo = find("khoidongrieng", "khoidongsolo");
  if (solo) {
    for (const r of solo) {
      const seat = String(Math.max(1, Math.min(8, Number(r.thisinh) || 1)));
      const item = qa(r);
      if (item) (set.khoiDong.solo[seat] ??= []).push(item);
    }
  } else warnings.push("Thiếu sheet “KhoiDong Rieng”.");

  const shared = find("khoidongchung", "khoidongshared");
  if (shared) shared.forEach((r) => { const i = qa(r); if (i) set.khoiDong.shared.push(i); });
  else warnings.push("Thiếu sheet “KhoiDong Chung” (O24+ dùng cho lượt chung).");

  // O22 / O23 style turn sheets ("Luot 1..3") feed the shared pool as well
  for (const key of Object.keys(byKey).filter((k) => /^luot\d+$/.test(k)).sort()) {
    byKey[key].forEach((r) => { const i = qa(r); if (i) set.khoiDong.shared.push(i); });
  }

  const vcnv = find("vcnv", "vuotchuongngaivat");
  if (vcnv) {
    const rows: VcnvRowDef[] = [];
    for (const r of vcnv) {
      if (str(r.goiy) || str(r.dapan)) {
        const media = str(r.media);
        rows.push({ hint: str(r.goiy), answer: str(r.dapan), ...(media ? { media, mediaType: mediaType(media) } : {}) });
      }
      if (str(r.dapancnv) && !set.vcnv.answer) set.vcnv.answer = str(r.dapancnv);
      if (str(r.cauhoitrungtam) && !set.vcnv.centerQuestion) {
        const m = str(r.mediatrungtam);
        set.vcnv.centerQuestion = { q: str(r.cauhoitrungtam), a: str(r.dapantrungtam), ...(m ? { media: m, mediaType: mediaType(m) } : {}) };
      }
      if (str(r.mediatrungtam) && !set.vcnv.mysteryImage) set.vcnv.mysteryImage = str(r.mediatrungtam);
    }
    set.vcnv.rows = rows.slice(0, 4);
    if (!set.vcnv.answer) {
      // fall back to joining first letters? Better to warn.
      warnings.push("VCNV: thiếu cột DapAnCNV (từ khóa chướng ngại vật).");
    }
    if (rows.length < 4) warnings.push(`VCNV: chỉ có ${rows.length}/4 hàng ngang.`);
  } else warnings.push("Thiếu sheet “VCNV”.");

  const tt = find("tangtoc");
  if (tt) {
    for (const r of tt) {
      const media = str(r.file) || str(r.media);
      const answer = str(r.dapan);
      if (!media && !answer && !str(r.cauhoi)) continue;
      const item: TangTocQuestion = {
        answer,
        duration: Number(r.thoigian) || undefined,
        ...(str(r.cauhoi) ? { q: str(r.cauhoi) } : {}),
        ...(media ? { media, type: mediaType(media) } : {}),
      };
      set.tangToc.push(item);
    }
    if (set.tangToc.length !== 4) warnings.push(`Tăng Tốc: có ${set.tangToc.length} câu (chuẩn là 4).`);
  } else warnings.push("Thiếu sheet “TangToc”.");

  const vd = find("vedich");
  if (vd) {
    for (const r of vd) {
      const pts = String(Number(r.mucdiem) || 0);
      const item = qa(r);
      if (!item || pts === "0") continue;
      const kind = strip(str(r.loaicauhoi));
      const q: VeDichQuestion = { ...item, type: kind.startsWith("thuc") || kind === "practice" ? "practice" : "theory" };
      (set.veDich[pts] ??= []).push(q);
    }
  } else warnings.push("Thiếu sheet “VeDich”.");

  const chp = find("cauphu", "cauhoiphu");
  if (chp) chp.forEach((r) => { const i = qa(r); if (i) set.cauHoiPhu.push(i); });
  else warnings.push("Thiếu sheet “CauPhu”.");

  return { set, warnings };
}

/** Validate and normalise the original app's JSON (questions/sample.json). */
export function parseJsonSet(raw: unknown): ImportResult {
  const warnings: string[] = [];
  const j = (raw ?? {}) as Record<string, any>;
  const set = emptyQuestionSet(str(j.name) || "Bộ đề JSON");
  const toQA = (x: any): QA => {
    const media = str(x?.media);
    return { q: str(x?.q ?? x?.cauHoi), a: str(x?.a ?? x?.dapAn), ...(media ? { media, mediaType: mediaType(media) } : {}) };
  };
  if (j.khoiDong?.solo) for (const [k, v] of Object.entries<any>(j.khoiDong.solo)) set.khoiDong.solo[k] = (v ?? []).map(toQA);
  if (j.khoiDong?.shared) set.khoiDong.shared = j.khoiDong.shared.map(toQA);
  if (j.vcnv) {
    set.vcnv.answer = str(j.vcnv.answer);
    set.vcnv.mysteryImage = str(j.vcnv.mysteryImage) || undefined;
    set.vcnv.rows = (j.vcnv.rows ?? []).slice(0, 4).map((r: any) => ({ hint: str(r.hint), answer: str(r.answer) }));
    if (j.vcnv.centerQuestion) set.vcnv.centerQuestion = toQA(j.vcnv.centerQuestion);
  }
  if (Array.isArray(j.tangToc))
    set.tangToc = j.tangToc.map((t: any) => {
      const media = str(t.media);
      return { answer: str(t.answer), duration: Number(t.duration) || undefined, ...(t.q ? { q: str(t.q) } : {}), ...(media ? { media, type: t.type === "video" ? "video" : mediaType(media) } : {}) };
    });
  if (j.veDich) for (const [k, v] of Object.entries<any>(j.veDich)) set.veDich[k] = (v ?? []).map((x: any) => ({ ...toQA(x), type: x.type === "practice" ? "practice" : "theory" }));
  if (Array.isArray(j.cauHoiPhu)) set.cauHoiPhu = j.cauHoiPhu.map(toQA);
  if (!set.vcnv.answer || set.vcnv.rows.length === 0) warnings.push("JSON thiếu dữ liệu VCNV.");
  return { set, warnings };
}

// ── media handling ──
const isRemote = (u: string) => /^(https?:)?\/\//i.test(u) || u.startsWith("/uploads/") || u.startsWith("data:");
export const baseName = (p: string) => p.split(/[\\/]/).pop() ?? p;

function mapMedia(set: OlympiaQuestionSet, fn: (m: string | undefined) => string | undefined) {
  const touch = <T extends { media?: string; mediaType?: string }>(x: T) => {
    const next = fn(x.media);
    if (next !== x.media) {
      x.media = next;
      if (next && "mediaType" in x) (x as { mediaType?: string }).mediaType = mediaType(next);
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
      if (next) t.type = mediaType(next);
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
  shared: number;
  vcnvRows: number;
  tangToc: number;
  veDich: Record<string, number>;
  cauHoiPhu: number;
}

export function statsOf(set: OlympiaQuestionSet): SetStats {
  return {
    soloPerSeat: ["1", "2", "3", "4"].map((k) => set.khoiDong.solo[k]?.length ?? 0),
    shared: set.khoiDong.shared.length,
    vcnvRows: set.vcnv.rows.length,
    tangToc: set.tangToc.length,
    veDich: Object.fromEntries(Object.entries(set.veDich).map(([k, v]) => [k, v.length])),
    cauHoiPhu: set.cauHoiPhu.length,
  };
}
