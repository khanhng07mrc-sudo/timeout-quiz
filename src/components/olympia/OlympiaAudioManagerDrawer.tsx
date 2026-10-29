"use client";

import React, { useState, useRef, useEffect } from "react";
import type { AudioSeason } from "@/lib/olympia/types";

interface SoundItem {
  id: string; // e.g. "1_KhoiDong/start_round"
  name: string;
}

interface SoundGroup {
  group: string;
  items: SoundItem[];
}

const GROUPS_O26: SoundGroup[] = [
  {
    group: "ÂM THANH KHÁC",
    items: [
      { id: "6_NhacKhac/show_intro", name: "Mở đầu cuộc thi" },
      { id: "6_NhacKhac/summary", name: "Tổng kết điểm (Summary)" },
      { id: "6_NhacKhac/prize_award", name: "Trao giải thưởng" },
      { id: "6_NhacKhac/ending_music", name: "Kết thúc chương trình" },
      { id: "6_NhacKhac/adviser_1", name: "Giới thiệu cố vấn 1" },
      { id: "6_NhacKhac/adviser_2", name: "Giới thiệu cố vấn 2" },
      { id: "6_NhacKhac/adviser_3", name: "Giới thiệu cố vấn 3" },
      { id: "6_NhacKhac/adviser_4", name: "Giới thiệu cố vấn 4" },
      { id: "6_NhacKhac/adviser_5", name: "Giới thiệu cố vấn 5" },
      { id: "6_NhacKhac/blank_space", name: "Ô trống / Tĩnh lặng" },
    ],
  },
  {
    group: "1. KHỞI ĐỘNG",
    items: [
      { id: "1_KhoiDong/start_round", name: "Nhạc bắt đầu vòng thi" },
      { id: "1_KhoiDong/ready", name: "Nhạc sẵn sàng" },
      { id: "1_KhoiDong/open_question", name: "Mở câu hỏi" },
      { id: "1_KhoiDong/kd_bgm_1", name: "Nhạc nền (Mốc 1)" },
      { id: "1_KhoiDong/kd_bgm_2", name: "Nhạc nền (Mốc 2)" },
      { id: "1_KhoiDong/kd_bgm_3", name: "Nhạc nền (Mốc 3)" },
      { id: "1_KhoiDong/correct", name: "Trả lời đúng" },
      { id: "1_KhoiDong/wrong", name: "Trả lời sai" },
      { id: "1_KhoiDong/finish_turn", name: "Kết thúc lượt thi" },
      { id: "1_KhoiDong/bell_ring", name: "Chuông giành quyền trả lời" },
    ],
  },
  {
    group: "2. VƯỢT CHƯỚNG NGẠI VẬT",
    items: [
      { id: "2_VuotChuongNgaiVat/start_round", name: "Nhạc bắt đầu vòng thi" },
      { id: "2_VuotChuongNgaiVat/show_row", name: "Hiển thị hàng ngang" },
      { id: "2_VuotChuongNgaiVat/choose_row", name: "Chọn hàng ngang" },
      { id: "2_VuotChuongNgaiVat/open_question", name: "Mở câu hỏi" },
      { id: "2_VuotChuongNgaiVat/15s_tick", name: "Nhạc nền 15s suy nghĩ" },
      { id: "2_VuotChuongNgaiVat/correct", name: "Trả lời đúng hàng ngang" },
      { id: "2_VuotChuongNgaiVat/wrong", name: "Trả lời sai hàng ngang" },
      { id: "2_VuotChuongNgaiVat/bell_ring", name: "Chuông đoán chướng ngại vật" },
      { id: "2_VuotChuongNgaiVat/reveal_answers", name: "Hiện đáp án các thí sinh" },
      { id: "2_VuotChuongNgaiVat/reveal_puzzle_piece", name: "Mở mảnh ghép trung tâm" },
      { id: "2_VuotChuongNgaiVat/cnv_correct", name: "Đoán ĐÚNG Chướng ngại vật" },
      { id: "2_VuotChuongNgaiVat/cnv_wrong", name: "Đoán SAI Chướng ngại vật" },
    ],
  },
  {
    group: "3. TĂNG TỐC",
    items: [
      { id: "3_TangToc/start_round", name: "Nhạc bắt đầu vòng thi" },
      { id: "3_TangToc/show_question", name: "Hiện câu hỏi" },
      { id: "3_TangToc/tick_20s", name: "Nhạc nền 20s" },
      { id: "3_TangToc/tick_30s", name: "Nhạc nền 30s" },
      { id: "3_TangToc/show_answer", name: "Mở đáp án các thí sinh" },
      { id: "3_TangToc/correct", name: "Tính điểm đúng" },
      { id: "3_TangToc/wrong", name: "Trả lời sai" },
    ],
  },
  {
    group: "4. VỀ ĐÍCH",
    items: [
      { id: "4_VeDich/start_round", name: "Nhạc bắt đầu vòng thi" },
      { id: "4_VeDich/on_stage", name: "Thí sinh bước lên bục" },
      { id: "4_VeDich/choose_package", name: "Chọn gói câu hỏi" },
      { id: "4_VeDich/open_question", name: "Mở câu hỏi" },
      { id: "4_VeDich/10s_tick", name: "Nhạc nền suy nghĩ 10s" },
      { id: "4_VeDich/15s_tick", name: "Nhạc nền suy nghĩ 15s" },
      { id: "4_VeDich/20s_tick", name: "Nhạc nền suy nghĩ 20s" },
      { id: "4_VeDich/20s_practice", name: "Nhạc nền thực hành 20s" },
      { id: "4_VeDich/30s_practice", name: "Nhạc nền thực hành 30s" },
      { id: "4_VeDich/40s_practice", name: "Nhạc nền thực hành 40s" },
      { id: "4_VeDich/60s_practice", name: "Nhạc nền thực hành 60s" },
      { id: "4_VeDich/5s_steal", name: "Mở cướp điểm 5s" },
      { id: "4_VeDich/bell_ring", name: "Chuông bấm cướp điểm" },
      { id: "4_VeDich/star_of_hope", name: "Ngôi sao hy vọng" },
      { id: "4_VeDich/correct", name: "Trả lời đúng (+Điểm)" },
      { id: "4_VeDich/wrong", name: "Trả lời sai" },
      { id: "4_VeDich/finish_turn", name: "Kết thúc lượt thi" },
    ],
  },
  {
    group: "5. CÂU HỎI PHỤ",
    items: [
      { id: "5_CauHoiPhu/open_question", name: "Mở câu hỏi phụ" },
      { id: "5_CauHoiPhu/15s_tick", name: "Nhạc nền 15s" },
      { id: "5_CauHoiPhu/bell_ring", name: "Chuông giành quyền" },
      { id: "5_CauHoiPhu/correct", name: "Trả lời đúng (Thắng cuộc)" },
      { id: "5_CauHoiPhu/wrong", name: "Trả lời sai" },
    ],
  },
];

const GROUPS_O24_25: SoundGroup[] = GROUPS_O26.map((g) => {
  if (g.group === "3. TĂNG TỐC") {
    return {
      group: g.group,
      items: [
        { id: "3_TangToc/start_round", name: "Nhạc bắt đầu vòng thi" },
        { id: "3_TangToc/show_question", name: "Hiện câu hỏi" },
        { id: "3_TangToc/tick_10s", name: "Nhạc nền 10s" },
        { id: "3_TangToc/tick_20s", name: "Nhạc nền 20s" },
        { id: "3_TangToc/tick_30s", name: "Nhạc nền 30s" },
        { id: "3_TangToc/tick_40s", name: "Nhạc nền 40s" },
        { id: "3_TangToc/show_answer", name: "Mở đáp án" },
        { id: "3_TangToc/correct", name: "Trả lời đúng" },
        { id: "3_TangToc/wrong", name: "Trả lời sai" },
      ],
    };
  }
  return g;
});

const GROUPS_O22: SoundGroup[] = [
  GROUPS_O26[0],
  {
    group: "1. KHỞI ĐỘNG",
    items: [
      { id: "1_KhoiDong/start_round", name: "Nhạc bắt đầu vòng thi" },
      { id: "1_KhoiDong/ready", name: "Nhạc sẵn sàng" },
      { id: "1_KhoiDong/open_question", name: "Mở câu hỏi" },
      { id: "1_KhoiDong/30s", name: "Nhạc đếm giờ (30s)" },
      { id: "1_KhoiDong/60s", name: "Nhạc đếm giờ (60s)" },
      { id: "1_KhoiDong/90s", name: "Nhạc đếm giờ (90s)" },
      { id: "1_KhoiDong/correct", name: "Trả lời đúng" },
      { id: "1_KhoiDong/wrong", name: "Trả lời sai" },
      { id: "1_KhoiDong/finish_turn", name: "Kết thúc lượt thi" },
      { id: "1_KhoiDong/bell_ring", name: "Chuông giành quyền" },
    ],
  },
  GROUPS_O26[2],
  GROUPS_O24_25[3],
  GROUPS_O26[4],
  GROUPS_O26[5],
];

const GROUPS_O13_21: SoundGroup[] = [
  GROUPS_O26[0],
  {
    group: "1. KHỞI ĐỘNG",
    items: [
      { id: "1_KhoiDong/start_round", name: "Nhạc bắt đầu vòng thi" },
      { id: "1_KhoiDong/ready", name: "Nhạc sẵn sàng" },
      { id: "1_KhoiDong/open_question", name: "Mở câu hỏi" },
      { id: "1_KhoiDong/60s", name: "Nhạc đếm giờ 60 giây" },
      { id: "1_KhoiDong/correct", name: "Trả lời đúng" },
      { id: "1_KhoiDong/wrong", name: "Trả lời sai" },
      { id: "1_KhoiDong/finish_turn", name: "Hết 60s lượt thi" },
      { id: "1_KhoiDong/bell_ring", name: "Chuông báo" },
    ],
  },
  GROUPS_O26[2],
  {
    group: "3. TĂNG TỐC",
    items: [
      { id: "3_TangToc/start_round", name: "Nhạc bắt đầu vòng thi" },
      { id: "3_TangToc/show_question", name: "Hiện câu hỏi" },
      { id: "3_TangToc/tick_30s", name: "Nhạc đếm giờ 30s" },
      { id: "3_TangToc/show_answer", name: "Mở đáp án" },
      { id: "3_TangToc/correct", name: "Trả lời đúng" },
      { id: "3_TangToc/wrong", name: "Trả lời sai" },
    ],
  },
  GROUPS_O26[4],
  GROUPS_O26[5],
];

export interface OlympiaAudioManagerDrawerProps {
  open: boolean;
  onClose: () => void;
  audioSeason?: AudioSeason;
  autoAudioMode?: boolean;
  onToggleAutoAudioMode?: (autoMode: boolean) => void;
}

export default function OlympiaAudioManagerDrawer({
  open,
  onClose,
  audioSeason = "O26",
  autoAudioMode = true,
  onToggleAutoAudioMode,
}: OlympiaAudioManagerDrawerProps) {
  const [activeTab, setActiveTab] = useState<"O26" | "O24-25" | "O22" | "O13-21">(() => {
    if (audioSeason === "O24-25") return "O24-25";
    if (audioSeason === "O22" || audioSeason === "O23") return "O22";
    if (audioSeason === "O13-21" || audioSeason === "O13-15" || audioSeason === "O16-21") return "O13-21";
    return "O26";
  });

  const [playingId, setPlayingId] = useState<string | null>(null);
  const [mutedMap, setMutedMap] = useState<Record<string, boolean>>({});
  const activeAudiosRef = useRef<Map<string, HTMLAudioElement>>(new Map());

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      activeAudiosRef.current.forEach((audio) => {
        try {
          audio.pause();
          audio.src = "";
        } catch {}
      });
      activeAudiosRef.current.clear();
    };
  }, []);

  if (!open) return null;

  const getGroups = (): SoundGroup[] => {
    switch (activeTab) {
      case "O24-25":
        return GROUPS_O24_25;
      case "O22":
        return GROUPS_O22;
      case "O13-21":
        return GROUPS_O13_21;
      case "O26":
      default:
        return GROUPS_O26;
    }
  };

  const playSound = (id: string) => {
    // Stop any existing instance of this specific sound
    stopSound(id);

    const folder = activeTab;
    const url = `/olympia-audio/${folder}/${id}.mp3`;
    const audio = new Audio(url);
    activeAudiosRef.current.set(id, audio);
    setPlayingId(id);

    audio.onended = () => {
      activeAudiosRef.current.delete(id);
      setPlayingId((curr) => (curr === id ? null : curr));
    };

    audio.onerror = () => {
      activeAudiosRef.current.delete(id);
      setPlayingId((curr) => (curr === id ? null : curr));
    };

    audio.play().catch(() => {
      activeAudiosRef.current.delete(id);
      setPlayingId((curr) => (curr === id ? null : curr));
    });
  };

  const stopSound = (id: string) => {
    const existing = activeAudiosRef.current.get(id);
    if (existing) {
      try {
        existing.pause();
        existing.currentTime = 0;
      } catch {}
      activeAudiosRef.current.delete(id);
    }
    setPlayingId((curr) => (curr === id ? null : curr));
  };

  const stopAllAudio = () => {
    activeAudiosRef.current.forEach((audio) => {
      try {
        audio.pause();
        audio.currentTime = 0;
      } catch {}
    });
    activeAudiosRef.current.clear();
    setPlayingId(null);

    // Also stop any global background sounds currently playing
    if (typeof window !== "undefined") {
      document.querySelectorAll("audio").forEach((a) => {
        try {
          a.pause();
          a.currentTime = 0;
        } catch {}
      });
    }
  };

  const toggleMute = (id: string) => {
    setMutedMap((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const groups = getGroups();

  return (
    <div className="fixed inset-0 z-[150] flex justify-end bg-black/60 backdrop-blur-sm animate-fadeIn">
      {/* Backdrop */}
      <div className="flex-1" onClick={onClose} />

      {/* Drawer */}
      <div className="w-full max-w-lg bg-[#0e1424] text-white border-l border-white/15 h-full flex flex-col shadow-2xl animate-pull-from-right">
        {/* Header */}
        <div className="p-4 border-b border-white/10 flex items-center justify-between bg-black/30">
          <div className="flex items-center gap-2">
            <span className="text-xl">🎵</span>
            <div>
              <h2 className="text-base font-black text-sky-300">Quản Lý Âm Thanh Trường Quay</h2>
              <p className="text-[11px] text-slate-400">Phát thử, dừng khẩn cấp & phân loại trọn bộ audio Olympia</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition"
          >
            ✕
          </button>
        </div>

        {/* Global Action Bar */}
        <div className="p-3 bg-red-950/20 border-b border-white/10 space-y-2.5">
          <button
            onClick={stopAllAudio}
            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-black text-xs shadow-lg shadow-red-900/30 active:scale-98 transition flex items-center justify-center gap-2"
          >
            <span className="text-base">🛑</span>
            <span>DỪNG TOÀN BỘ ÂM THANH CÁC NGUỒN</span>
          </button>

          {/* Auto vs Manual Switch */}
          <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs">
            <span className="font-bold text-slate-300">Chế độ phát âm thanh:</span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => onToggleAutoAudioMode?.(true)}
                className={`px-2.5 py-1 rounded-lg font-bold text-xs transition ${
                  autoAudioMode
                    ? "bg-emerald-500 text-slate-950 font-black shadow"
                    : "bg-white/5 text-slate-400 hover:bg-white/10"
                }`}
              >
                ⚡ Tự động
              </button>
              <button
                type="button"
                onClick={() => onToggleAutoAudioMode?.(false)}
                className={`px-2.5 py-1 rounded-lg font-bold text-xs transition ${
                  !autoAudioMode
                    ? "bg-amber-400 text-slate-950 font-black shadow"
                    : "bg-white/5 text-slate-400 hover:bg-white/10"
                }`}
              >
                🎙️ Thủ công
              </button>
            </div>
          </div>
        </div>

        {/* Season Tabs */}
        <div className="grid grid-cols-4 border-b border-white/10 bg-black/20 text-xs font-bold text-center">
          {[
            { id: "O26", label: "O26 (Mới nhất)" },
            { id: "O24-25", label: "O24–25" },
            { id: "O22", label: "O22" },
            { id: "O13-21", label: "O13–21" },
          ].map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-2.5 border-b-2 transition truncate px-1 ${
                  active
                    ? "border-sky-400 text-sky-300 bg-sky-500/10 font-black"
                    : "border-transparent text-slate-400 hover:text-white"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Sound List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-4 text-xs">
          {groups.map((grp) => (
            <div key={grp.group} className="space-y-1.5">
              <h3 className="font-black text-sky-400/90 text-[11px] tracking-wider uppercase px-1 border-b border-sky-400/20 pb-1">
                {grp.group}
              </h3>
              <div className="space-y-1">
                {grp.items.map((item) => {
                  const isPlaying = playingId === item.id;
                  const isMuted = !!mutedMap[item.id];
                  return (
                    <div
                      key={item.id}
                      className={`flex items-center justify-between p-2 rounded-lg border transition ${
                        isPlaying
                          ? "bg-sky-500/15 border-sky-400/50"
                          : "bg-white/[0.03] hover:bg-white/[0.06] border-white/5"
                      }`}
                    >
                      <span className="font-medium text-slate-200 truncate flex-1 pr-2" title={item.name}>
                        {item.name}
                      </span>
                      <div className="flex items-center gap-1 shrink-0">
                        {/* Play test */}
                        <button
                          type="button"
                          onClick={() => playSound(item.id)}
                          className={`px-2 py-1 rounded text-xs font-bold transition flex items-center gap-1 ${
                            isPlaying
                              ? "bg-sky-400 text-slate-950 animate-pulse"
                              : "bg-emerald-600/80 hover:bg-emerald-500 text-white"
                          }`}
                          title="Phát thử âm thanh này"
                        >
                          ▶
                        </button>
                        {/* Stop individual */}
                        <button
                          type="button"
                          onClick={() => stopSound(item.id)}
                          className="px-2 py-1 rounded bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-bold transition"
                          title="Dừng riêng bài này"
                        >
                          ⏹
                        </button>
                        {/* Mute toggle */}
                        <button
                          type="button"
                          onClick={() => toggleMute(item.id)}
                          className={`px-2 py-1 rounded text-xs font-bold transition ${
                            isMuted
                              ? "bg-rose-500/30 text-rose-300 border border-rose-400/50"
                              : "bg-white/10 text-slate-300 hover:bg-white/15"
                          }`}
                          title={isMuted ? "Đang khóa âm (Muted) - Bấm để bật" : "Bấm để khóa âm bài này"}
                        >
                          {isMuted ? "🔇" : "🔊"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Footer info */}
        <div className="p-3 border-t border-white/10 bg-black/30 text-[11px] text-slate-400 flex items-center justify-between">
          <span>💡 Bấm ▶ để phát ngay qua loa trường quay.</span>
          <button
            onClick={onClose}
            className="px-3 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white font-bold"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
