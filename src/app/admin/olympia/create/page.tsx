"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import * as XLSX from "xlsx";
import { RULESETS, RULESET_LIST, RULESET_YEAR_BUTTONS } from "@/lib/olympia/rulesets";
import { SAMPLE_QUESTION_SET } from "@/lib/olympia/sample-questions";
import { analyzeSetInventoryAndThresholds } from "@/lib/olympia/ai-classifier";
import { getOlympiaBanks, type OlympiaBankItem } from "@/lib/olympia/olympia-storage";
import OlympiaQuestionStudioModal from "@/components/olympia/OlympiaQuestionStudioModal";
import {
  applyMediaMap,
  baseName,
  localMediaRefs,
  parseJsonSet,
  parseSheets,
  statsOf,
} from "@/lib/olympia/excel-import";
import {
  ROUND_LABELS,
  ROUND_ORDER,
  type OlympiaQuestionSet,
  type RoundId,
  type RulesetId,
  type O22Quarter,
} from "@/lib/olympia/types";

const SELECTABLE_ROUNDS: RoundId[] = ROUND_ORDER.filter((r) => r !== "cauHoiPhu");

export default function CreateOlympiaPage() {
  const router = useRouter();
  const [roomName, setRoomName] = useState("Trận đấu Olympia");
  const [rulesetId, setRulesetId] = useState<RulesetId>("O26");
  const [o22Quarter, setO22Quarter] = useState<O22Quarter>(1);
  const [rounds, setRounds] = useState<RoundId[]>([...SELECTABLE_ROUNDS]);
  const [questionSet, setQuestionSet] = useState<OlympiaQuestionSet>(SAMPLE_QUESTION_SET);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [mediaMap, setMediaMap] = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [err, setErr] = useState("");
  const [showRulesInfo, setShowRulesInfo] = useState(false);
  const [showStudio, setShowStudio] = useState(false);
  const [banks, setBanks] = useState<OlympiaBankItem[]>([]);
  const [selectedBankId, setSelectedBankId] = useState<string>("olympia_preset_o25_o26_full");
  const [targetContestantCount, setTargetContestantCount] = useState<number>(4);
  const [playIntroOnCreate, setPlayIntroOnCreate] = useState<boolean>(true);

  useEffect(() => {
    const loaded = getOlympiaBanks();
    setBanks(loaded);
    if (loaded.length > 0) {
      setSelectedBankId(loaded[0].id);
      setQuestionSet(loaded[0].set);
    }
  }, []);

  const authHeader = (): Record<string, string> => {
    const token =
      (typeof window !== "undefined" &&
        (localStorage.getItem("admin_token") || sessionStorage.getItem("admin_token"))) ||
      "";
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const toggleRound = (r: RoundId) => {
    setRounds((prev) =>
      prev.includes(r) ? prev.filter((x) => x !== r) : SELECTABLE_ROUNDS.filter((x) => prev.includes(x) || x === r)
    );
  };

  const onFileImport = async (file: File) => {
    setErr("");
    try {
      if (file.name.toLowerCase().endsWith(".json")) {
        const text = await file.text();
        const res = parseJsonSet(JSON.parse(text));
        setQuestionSet(res.set);
        setWarnings(res.warnings);
      } else {
        const buf = await file.arrayBuffer();
        const wb = XLSX.read(buf, { type: "array" });
        const sheets: Record<string, Record<string, unknown>[]> = {};
        for (const n of wb.SheetNames) {
          sheets[n] = XLSX.utils.sheet_to_json(wb.Sheets[n], { defval: "" });
        }
        const res = parseSheets(sheets, file.name.replace(/\.[^.]+$/, ""));
        setQuestionSet(res.set);
        setWarnings(res.warnings);
      }
      setMediaMap({});
    } catch (e) {
      setErr("Không đọc được file: " + (e as Error).message);
    }
  };

  const onMediaUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    setErr("");
    const next: Record<string, string> = { ...mediaMap };
    try {
      for (const f of Array.from(files)) {
        const fd = new FormData();
        fd.append("file", f);
        const res = await fetch("/api/upload", { method: "POST", headers: authHeader(), body: fd });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Upload thất bại");
        next[baseName(f.name)] = data.url;
      }
      setMediaMap(next);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setUploading(false);
    }
  };

  const downloadSampleJson = () => {
    const blob = new Blob([JSON.stringify(SAMPLE_QUESTION_SET, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "olympia-sample.json";
    a.click();
  };

  const downloadSampleExcel = () => {
    const wb = XLSX.utils.book_new();
    const soloRows: Record<string, unknown>[] = [];
    for (const [seat, list] of Object.entries(SAMPLE_QUESTION_SET.khoiDong.solo)) {
      for (const q of list) soloRows.push({ ThiSinh: Number(seat), CauHoi: q.q, DapAn: q.a, Media: q.media ?? "" });
    }
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(soloRows), "KhoiDong Rieng");
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(
        SAMPLE_QUESTION_SET.khoiDong.shared.map((q) => ({ CauHoi: q.q, DapAn: q.a, Media: q.media ?? "" }))
      ),
      "KhoiDong Chung"
    );
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(
        SAMPLE_QUESTION_SET.vcnv.rows.map((r, i) => ({
          Hang: i + 1,
          GoiY: r.hint,
          DapAn: r.answer,
          Media: r.media ?? "",
          DapAnCNV: i === 0 ? SAMPLE_QUESTION_SET.vcnv.answer : "",
          CauHoiTrungTam: i === 0 ? SAMPLE_QUESTION_SET.vcnv.centerQuestion?.q ?? "" : "",
          DapAnTrungTam: i === 0 ? SAMPLE_QUESTION_SET.vcnv.centerQuestion?.a ?? "" : "",
          MediaTrungTam: i === 0 ? SAMPLE_QUESTION_SET.vcnv.mysteryImage ?? "" : "",
        }))
      ),
      "VCNV"
    );
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(
        SAMPLE_QUESTION_SET.tangToc.map((t) => ({
          CauHoi: t.q ?? "",
          File: t.media ?? "",
          ThoiGian: t.duration ?? 20,
          DapAn: t.answer,
        }))
      ),
      "TangToc"
    );
    const vdRows: Record<string, unknown>[] = [];
    for (const [pts, list] of Object.entries(SAMPLE_QUESTION_SET.veDich)) {
      for (const q of list) {
        vdRows.push({
          MucDiem: Number(pts),
          LoaiCauHoi: q.type === "practice" ? "Thực hành" : "Lý thuyết",
          CauHoi: q.q,
          DapAn: q.a,
          Media: q.media ?? "",
        });
      }
    }
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(vdRows), "VeDich");
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(
        SAMPLE_QUESTION_SET.cauHoiPhu.map((q) => ({ CauHoi: q.q, DapAn: q.a, Media: q.media ?? "" }))
      ),
      "CauPhu"
    );
    XLSX.writeFile(wb, "CauHoi_Olympia_Mau.xlsx");
  };

  const finalSet = applyMediaMap(questionSet, mediaMap);
  const missingMedia = localMediaRefs(finalSet);
  const stats = statsOf(finalSet);
  const inventory = useMemo(() => analyzeSetInventoryAndThresholds(finalSet, 4), [finalSet]);
  const rs = RULESETS[rulesetId];

  const onCreate = async () => {
    if (!roomName.trim()) return setErr("Vui lòng nhập tên phòng");
    if (rounds.length === 0) return setErr("Chọn ít nhất 1 vòng thi");
    setCreating(true);
    setErr("");
    try {
      const res = await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader() },
        body: JSON.stringify({
          name: roomName.trim(),
          mode: "OLYMPIA",
          teamMode: "INDIVIDUAL",
          hostId: "demo-host-id",
          teams: [],
          config: {
            powerupEnabled: false,
            allowedPowerups: [],
            olympia: {
              rulesetId,
              o22Quarter: rulesetId === "O22" ? o22Quarter : undefined,
              rounds,
              questionSet: finalSet,
              seatCount: targetContestantCount,
              playIntroOnCreate,
            },
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Không tạo được phòng");
      const code = data.room.code;
      const key = data.hostKey || "";
      if (key) localStorage.setItem(`host_key_${code}`, key);
      router.push(`/olympia/host/${code}${key ? `?key=${key}` : ""}`);
    } catch (e) {
      setErr((e as Error).message);
      setCreating(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 text-white space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-black text-sky-300">🏔️ Tạo phòng Đường Lên Đỉnh Olympia</h1>
          <p className="text-sm text-slate-300">
            Hỗ trợ tối đa 8 thí sinh · Host điều khiển thủ công · Chọn riêng các vòng muốn chơi
          </p>
        </div>
        <a href="/admin/rooms/create" className="text-sm text-sky-300 underline">
          ← Quay lại tạo phòng thường
        </a>
      </div>

      {err && <div className="rounded-xl bg-rose-500/20 border border-rose-400 p-3 text-rose-100">⚠ {err}</div>}

      <section className="rounded-2xl border border-white/15 bg-slate-900/70 p-4 space-y-3">
        <label className="block text-sm font-bold text-sky-300">1. Tên phòng thi</label>
        <input
          value={roomName}
          onChange={(e) => setRoomName(e.target.value)}
          className="w-full rounded-xl bg-slate-800 border border-white/20 px-3 py-2"
        />
      </section>

      <section className="rounded-2xl border border-white/15 bg-slate-900/70 p-4 space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <label className="text-sm font-bold text-sky-300">Số đội / Số thí sinh: ({targetContestantCount} thí sinh)</label>
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-semibold text-slate-400 mr-1">Số đội:</span>
            {[2, 3, 4, 5, 6, 7, 8].map((cnt) => (
              <button
                key={cnt}
                type="button"
                onClick={() => setTargetContestantCount(cnt)}
                className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg text-xs font-black border transition flex items-center justify-center cursor-pointer ${
                  targetContestantCount === cnt
                    ? "bg-sky-500/30 border-sky-400 text-sky-200 ring-2 ring-sky-400/50 shadow-md"
                    : "glass border-white/10 text-slate-400 hover:text-white hover:bg-white/10"
                }`}
              >
                {cnt}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-white/15 bg-slate-900/70 p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="text-sm font-bold text-sky-300">2. Chọn bộ luật: Olympia năm thứ</div>
          <button
            type="button"
            onClick={() => setShowRulesInfo((v) => !v)}
            title="Xem chi tiết định nghĩa bộ luật các mùa Olympia"
            className={`w-7 h-7 rounded-full border flex items-center justify-center text-xs font-black transition ${
              showRulesInfo
                ? "border-yellow-300 bg-yellow-300 text-slate-950"
                : "border-sky-400/50 bg-sky-500/15 text-sky-300 hover:bg-sky-500/30"
            }`}
          >
            i
          </button>
        </div>
        <div className="grid grid-cols-5 sm:grid-cols-9 gap-2">
          {RULESET_YEAR_BUTTONS.map((btnItem) => {
            const active = rulesetId === btnItem.id;
            return (
              <button
                key={btnItem.id}
                type="button"
                title={btnItem.fullTitle}
                onClick={() => setRulesetId(btnItem.id)}
                className={`rounded-xl py-2.5 px-2 border text-center font-black text-base transition ${
                  active
                    ? "border-yellow-300 bg-yellow-300/20 text-yellow-300 shadow-md"
                    : "border-white/15 bg-white/5 text-slate-200 hover:bg-white/10"
                }`}
              >
                {btnItem.numberLabel}
              </button>
            );
          })}
        </div>

        {rulesetId === "O22" && (
          <div className="rounded-xl border border-amber-500/40 bg-amber-950/30 p-3 space-y-2 animate-fade-in">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                ⚡ Chọn giai đoạn Quý Olympia 22:
              </span>
              <span className="text-[11px] text-amber-400 font-medium">
                {o22Quarter === 1
                  ? "Khởi động 30s/60s/90s · Sai mất lượt · Về đích gói 2 câu (20-40đ)"
                  : o22Quarter === 2
                  ? "Khởi động 60s/60s/90s · Sai mất lượt · Về đích gói 3 câu (20-30đ)"
                  : "Khởi động 60s/60s/90s · Sai trừ 5đ không mất lượt · Về đích gói 3 câu (20-30đ)"}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setO22Quarter(1)}
                className={`py-2 px-3 rounded-lg border text-xs font-black transition text-center ${
                  o22Quarter === 1
                    ? "bg-amber-500 text-slate-950 border-amber-300 shadow-md shadow-amber-500/20"
                    : "bg-white/5 text-slate-300 border-white/10 hover:bg-white/10"
                }`}
              >
                ⚡ Quý 1 (30s · 20/40đ)
              </button>
              <button
                type="button"
                onClick={() => setO22Quarter(2)}
                className={`py-2 px-3 rounded-lg border text-xs font-black transition text-center ${
                  o22Quarter === 2
                    ? "bg-amber-500 text-slate-950 border-amber-300 shadow-md shadow-amber-500/20"
                    : "bg-white/5 text-slate-300 border-white/10 hover:bg-white/10"
                }`}
              >
                ⏱️ Quý 2 (60s · 20/30đ)
              </button>
              <button
                type="button"
                onClick={() => setO22Quarter(3)}
                className={`py-2 px-3 rounded-lg border text-xs font-black transition text-center ${
                  o22Quarter === 3
                    ? "bg-amber-500 text-slate-950 border-amber-300 shadow-md shadow-amber-500/20"
                    : "bg-white/5 text-slate-300 border-white/10 hover:bg-white/10"
                }`}
              >
                🎯 Quý 3 - CKN (Trừ 5đ)
              </button>
            </div>
          </div>
        )}

        {showRulesInfo && (
          <div className="rounded-xl border border-sky-400/30 bg-slate-950/90 p-3.5 space-y-2.5 text-xs animate-fade-in">
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <span className="font-bold text-yellow-300">
                ℹ️ Chi tiết bộ luật đang chọn: {rs.label} (Âm thanh: {rs.audioSeason})
              </span>
              <button
                type="button"
                onClick={() => setShowRulesInfo(false)}
                className="text-slate-400 hover:text-white font-bold"
              >
                Đóng ✕
              </button>
            </div>
            <p className="text-slate-200 leading-relaxed">{rs.note}</p>
            <div className="text-slate-400">
              Điểm giải CNV: <b className="text-slate-200">{rs.vcnv.cnvPoints.join(" / ")}đ</b> · Mức điểm Về Đích:{" "}
              <b className="text-slate-200">{rs.veDich.pointOptions.join(" / ")}đ</b>
            </div>
            <details className="pt-1 border-t border-white/10">
              <summary className="cursor-pointer text-sky-300 font-semibold">
                Xem bảng tra cứu toàn bộ các mùa Olympia (13 → 26)
              </summary>
              <div className="mt-2 space-y-1.5 text-slate-300">
                {RULESET_LIST.map((item) => (
                  <div key={item.id} className="p-2 rounded bg-white/5 border border-white/5">
                    <b className="text-yellow-300">{item.label}:</b> {item.note}
                  </div>
                ))}
              </div>
            </details>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-cyan-500/30 bg-cyan-950/20 p-3.5 flex items-center justify-between gap-3">
        <div className="text-xs text-cyan-100">
          <b className="text-cyan-300">🎙 Phương thức điều khiển & Chấm điểm:</b> Mặc định MC/Admin điều khiển & chấm điểm toàn quyền (Ở VCNV & Tăng Tốc thí sinh nhập đáp án trực tiếp về máy MC, máy không tự chấm Đúng/Sai).
        </div>
        <span className="px-2.5 py-1 rounded-lg bg-cyan-500/20 border border-cyan-400/40 text-cyan-200 text-xs font-black shrink-0">
          Mặc định qua MC/Admin
        </span>
      </section>

      <section className="rounded-2xl border border-white/15 bg-slate-900/70 p-4 space-y-3">
        <div className="text-sm font-bold text-sky-300">3. Chọn các vòng thi</div>
        <div className="grid sm:grid-cols-2 gap-2">
          {SELECTABLE_ROUNDS.map((r) => {
            const on = rounds.includes(r);
            return (
              <label
                key={r}
                className={`flex items-center gap-2 rounded-xl p-3 border cursor-pointer ${on ? "border-sky-400 bg-sky-500/15" : "border-white/15 bg-white/5"}`}
              >
                <input type="checkbox" checked={on} onChange={() => toggleRound(r)} />
                <span className="font-bold">{ROUND_LABELS[r]}</span>
              </label>
            );
          })}
          <label className="flex items-center gap-2 rounded-xl p-3 border border-amber-400/40 bg-amber-500/10 opacity-80">
            <input type="checkbox" checked disabled />
            <span className="font-bold">{ROUND_LABELS.cauHoiPhu}</span>
            <span className="text-xs text-amber-200">(mặc định — tự kích hoạt khi đồng hạng nhất)</span>
          </label>
        </div>
      </section>

      <section className="rounded-2xl border border-white/15 bg-slate-900/70 p-4 space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="text-sm font-bold text-sky-300">4. Kho câu hỏi Olympia & Media</div>
          <div className="flex flex-wrap gap-2 text-xs">
            <button
              type="button"
              onClick={() => setShowStudio(true)}
              className="px-3 py-1.5 rounded-lg bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-black"
            >
              🛠 Mở Studio Kho Đề Olympia & Quản Lý Câu Đã Dùng
            </button>
            <button type="button" onClick={downloadSampleExcel} className="px-2 py-1 rounded border border-white/20 bg-white/10">
              ⬇ Tải mẫu Excel (.xlsx)
            </button>
            <button type="button" onClick={downloadSampleJson} className="px-2 py-1 rounded border border-white/20 bg-white/10">
              ⬇ Tải mẫu JSON
            </button>
          </div>
        </div>

        {/* Select from saved Olympia Banks */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-slate-300 font-semibold">Chọn từ Kho đề Olympia đã lưu:</span>
          <select
            value={selectedBankId}
            onChange={(e) => {
              const id = e.target.value;
              setSelectedBankId(id);
              const found = banks.find((b) => b.id === id);
              if (found) setQuestionSet(found.set);
            }}
            className="flex-1 bg-slate-950 border border-white/20 rounded-lg px-3 py-1.5 text-xs font-bold text-yellow-300"
          >
            {banks.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-wrap gap-3 items-center text-sm">
          <label className="px-3 py-2 rounded-lg bg-sky-500 text-slate-950 font-bold cursor-pointer">
            📂 Nhập Excel (.xlsx) hoặc JSON
            <input
              type="file"
              accept=".xlsx,.xls,.json"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && onFileImport(e.target.files[0])}
            />
          </label>
          <span className="text-slate-300">
            Đang chọn: <b>{finalSet.name}</b>
          </span>
        </div>

        <div className="grid sm:grid-cols-3 gap-2 text-xs text-slate-300 bg-white/5 rounded-xl p-3">
          <div>
            Khởi động: Tổng <b>{inventory.kdTotal.total}</b> · Đã dùng{" "}
            <b className="text-amber-300">{inventory.kdTotal.used}</b> · Còn lại{" "}
            <b className="text-emerald-300">{inventory.kdTotal.remaining}</b> câu
          </div>
          <div>
            VCNV: {stats.vcnvRows}/4 hàng · Từ khóa: <b>{finalSet.vcnv.answer || "—"}</b>
          </div>
          <div>Tăng Tốc: {stats.tangToc}/4 câu</div>
          <div>
            Về Đích: Tổng <b>{inventory.vdTotal.total}</b> · Đã dùng{" "}
            <b className="text-amber-300">{inventory.vdTotal.used}</b> · Còn lại{" "}
            <b className="text-emerald-300">{inventory.vdTotal.remaining}</b> câu
          </div>
          <div>
            Chi tiết VĐ:{" "}
            {Object.entries(stats.veDich)
              .map(([k, v]) => `${k}đ:${v}`)
              .join(" · ")}
          </div>
          <div>
            Câu hỏi phụ: Tổng <b>{inventory.chpTotal.total}</b> (Còn {inventory.chpTotal.remaining})
          </div>
        </div>

        {warnings.length > 0 && (
          <div className="text-xs text-amber-300 space-y-0.5">
            {warnings.map((w, i) => (
              <div key={i}>• {w}</div>
            ))}
          </div>
        )}

        <div className="border-t border-white/10 pt-3 space-y-2">
          <div className="text-xs text-slate-300">
            Nếu file Excel tham chiếu tên ảnh/video trên máy (ví dụ <code>cau1.jpg</code>, <code>cau4.mp4</code>), hãy tải các
            tệp đó lên đây — hệ thống tự khớp theo tên file. Bạn cũng có thể chọn ảnh bí ẩn VCNV riêng.
          </div>
          <div className="flex flex-wrap gap-2 items-center text-xs">
            <label className="px-3 py-1.5 rounded bg-white/10 border border-white/20 cursor-pointer font-semibold">
              {uploading ? "Đang tải…" : "🖼 Tải lên ảnh / video câu hỏi"}
              <input type="file" multiple accept="image/*,video/*" className="hidden" onChange={(e) => onMediaUpload(e.target.files)} />
            </label>
            <label className="px-3 py-1.5 rounded bg-white/10 border border-white/20 cursor-pointer">
              🧩 Ảnh bí ẩn VCNV
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  const fd = new FormData();
                  fd.append("file", f);
                  const r = await fetch("/api/upload", { method: "POST", headers: authHeader(), body: fd });
                  const d = await r.json();
                  if (r.ok) setQuestionSet((q) => ({ ...q, vcnv: { ...q.vcnv, mysteryImage: d.url } }));
                }}
              />
            </label>
            {Object.keys(mediaMap).length > 0 && <span className="text-emerald-300">Đã khớp {Object.keys(mediaMap).length} file</span>}
          </div>
          {missingMedia.length > 0 && (
            <div className="text-xs text-amber-300">Chưa tải lên: {missingMedia.join(", ")}</div>
          )}
        </div>
      </section>

      <button
        type="button"
        disabled={creating}
        onClick={onCreate}
        className="w-full py-3 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-black text-lg disabled:opacity-50"
      >
        {creating ? "Đang tạo phòng…" : "🚀 Tạo phòng & Mở bàn điều khiển"}
      </button>

      {showStudio && (
        <OlympiaQuestionStudioModal
          open={showStudio}
          onClose={() => setShowStudio(false)}
          initialSet={finalSet}
          bankId={selectedBankId}
          bankName={finalSet.name}
          onApply={(updatedSet, savedId) => {
            setQuestionSet(updatedSet);
            const refreshed = getOlympiaBanks();
            setBanks(refreshed);
            if (savedId) setSelectedBankId(savedId);
            setShowStudio(false);
          }}
        />
      )}
    </div>
  );
}
