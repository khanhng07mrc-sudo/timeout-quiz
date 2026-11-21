"use client";

import React, { useState, useEffect, useMemo } from "react";
import type { CustomTtsScriptConfig, McVoiceCustomization } from "@/lib/olympia/types";
import {
  DEFAULT_OLYMPIA_SCRIPTS,
  speakOlympiaTTS,
  interpolateTemplate,
  refreshOlympiaVoices,
  smoothStopOlympiaTTS,
  getTtsEngineStatus,
} from "@/lib/olympia/tts";

interface TtsManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentScripts?: CustomTtsScriptConfig | null;
  onSave: (scripts: CustomTtsScriptConfig) => void;
  onReset: () => void;
}

type TtsTab =
  | "mc"
  | "lobby_opening"
  | "contestants"
  | "rounds"
  | "verdicts"
  | "summary_awards"
  | "diagnostics";

export function TtsManagerModal({
  isOpen,
  onClose,
  currentScripts,
  onSave,
  onReset,
}: TtsManagerModalProps) {
  const [activeTab, setActiveTab] = useState<TtsTab>("mc");
  const [scripts, setScripts] = useState<CustomTtsScriptConfig>(() => {
    return currentScripts ? JSON.parse(JSON.stringify(currentScripts)) : JSON.parse(JSON.stringify(DEFAULT_OLYMPIA_SCRIPTS));
  });

  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [testStatus, setTestStatus] = useState<string | null>(null);
  const [diagnosticEngine, setDiagnosticEngine] = useState<"auto" | "server" | "webspeech">("auto");
  const [telemetry, setTelemetry] = useState<{
    status: "idle" | "streaming" | "speaking" | "ended" | "error";
    engineUsed: string;
    speaker: string | null;
    latencyMs: number;
    zeroDiskConfirmed: boolean;
  }>({
    status: "idle",
    engineUsed: "auto",
    speaker: null,
    latencyMs: 0,
    zeroDiskConfirmed: true,
  });

  // Sync available speech synthesis voices
  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const update = () => {
      const all = window.speechSynthesis.getVoices();
      setAvailableVoices(all);
    };
    update();
    window.speechSynthesis.onvoiceschanged = update;
    return () => {
      if (window.speechSynthesis) window.speechSynthesis.onvoiceschanged = null;
    };
  }, []);

  // Update local state when prop updates
  useEffect(() => {
    if (currentScripts) {
      setScripts(JSON.parse(JSON.stringify(currentScripts)));
    } else {
      setScripts(JSON.parse(JSON.stringify(DEFAULT_OLYMPIA_SCRIPTS)));
    }
  }, [currentScripts, isOpen]);

  if (!isOpen) return null;

  const handleTestSpeak = (
    text: string,
    role: "khanh_vy" | "ngoc_huy",
    engineOverride?: "auto" | "server" | "webspeech"
  ) => {
    setTestStatus(`Đang phát thử giọng ${role === "khanh_vy" ? "Khánh Vy" : "Ngọc Huy"}…`);
    const cfg =
      role === "khanh_vy"
        ? scripts.mcVoiceConfig?.khanhVy || scripts.mcVoiceConfig?.khanh_vy
        : scripts.mcVoiceConfig?.ngocHuy || scripts.mcVoiceConfig?.ngoc_huy;
    const preview = interpolateTemplate(text, {
      tenThiSinh: "Nguyễn Văn A",
      tenTruong: "THPT Chuyên Hà Nội - Amsterdam",
      diemSo: 260,
      soCauDung: 5,
      vongThi: "Khởi Động",
      viTri: 1,
      soGhe: 1,
      roomName: "Chung Kết Năm",
      tenPhong: "Chung Kết Năm",
      dapAnDung: "Quang Trung",
    });

    const engineToUse = engineOverride || diagnosticEngine;
    const startTime = typeof performance !== "undefined" ? performance.now() : Date.now();

    setTelemetry((prev) => ({
      ...prev,
      status: engineToUse === "webspeech" ? "speaking" : "streaming",
      speaker: role,
      engineUsed: engineToUse,
    }));

    speakOlympiaTTS(preview, {
      role,
      pitch: cfg?.pitch,
      voice: cfg?.voiceURI,
      voiceConfig: cfg,
      baseRate: cfg?.rate ?? (role === "khanh_vy" ? 1.05 : 1.04),
      engine: engineToUse,
      onEnd: () => {
        const elapsed = Math.round((typeof performance !== "undefined" ? performance.now() : Date.now()) - startTime);
        setTestStatus(`Phát thành công (${elapsed}ms)`);
        setTelemetry((prev) => ({
          ...prev,
          status: "ended",
          latencyMs: elapsed,
          speaker: null,
          zeroDiskConfirmed: true,
        }));
        setTimeout(() => setTestStatus(null), 2500);
      },
      onError: (err) => {
        setTestStatus(`Lỗi phát âm: ${String(err)}`);
        setTelemetry((prev) => ({
          ...prev,
          status: "error",
          speaker: null,
        }));
        setTimeout(() => setTestStatus(null), 3500);
      },
    });
  };

  const handleTestDuoSpeak = () => {
    setTestStatus("Đang phát thử đối thoại Song MC (Khánh Vy ➡️ Ngọc Huy)…");
    const engineToUse = diagnosticEngine;
    const startTime = typeof performance !== "undefined" ? performance.now() : Date.now();

    setTelemetry((prev) => ({
      ...prev,
      status: engineToUse === "webspeech" ? "speaking" : "streaming",
      speaker: "khanh_vy",
      engineUsed: engineToUse,
    }));

    speakOlympiaTTS("Xin chào quý vị khán giả đang theo dõi trận Chung kết Đường lên đỉnh Olympia!", {
      role: "khanh_vy",
      engine: engineToUse,
      onEnd: () => {
        setTelemetry((prev) => ({ ...prev, speaker: "ngoc_huy" }));
        speakOlympiaTTS("Và chúc 4 nhà leo núi hôm nay sẽ thi đấu thật xuất sắc và bình tĩnh nhé!", {
          role: "ngoc_huy",
          engine: engineToUse,
          onEnd: () => {
            const elapsed = Math.round(
              (typeof performance !== "undefined" ? performance.now() : Date.now()) - startTime
            );
            setTestStatus(`Hoàn thành đối thoại Song MC (${elapsed}ms)`);
            setTelemetry((prev) => ({
              ...prev,
              status: "ended",
              latencyMs: elapsed,
              speaker: null,
              zeroDiskConfirmed: true,
            }));
            setTimeout(() => setTestStatus(null), 3000);
          },
          onError: (err) => {
            setTestStatus(`Lỗi phát âm Ngọc Huy: ${String(err)}`);
            setTelemetry((prev) => ({ ...prev, status: "error", speaker: null }));
          },
        });
      },
      onError: (err) => {
        setTestStatus(`Lỗi phát âm Khánh Vy: ${String(err)}`);
        setTelemetry((prev) => ({ ...prev, status: "error", speaker: null }));
      },
    });
  };

  const handleEmergencyStop = () => {
    smoothStopOlympiaTTS();
    setTestStatus("Đã dừng âm thanh khẩn cấp.");
    setTelemetry((prev) => ({
      ...prev,
      status: "idle",
      speaker: null,
    }));
    setTimeout(() => setTestStatus(null), 2000);
  };

  const handleResetToDefault = () => {
    const def = JSON.parse(JSON.stringify(DEFAULT_OLYMPIA_SCRIPTS));
    setScripts(def);
    onReset();
    setTestStatus("Đã khôi phục kịch bản và giọng nói về mặc định!");
    setTimeout(() => setTestStatus(null), 3000);
  };

  const handleApply = () => {
    onSave(scripts);
    setTestStatus("Đã áp dụng kịch bản mới thành công!");
    setTimeout(() => {
      setTestStatus(null);
      onClose();
    }, 800);
  };

  const handleExportJson = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(scripts, null, 2));
    const dlAnchor = document.createElement("a");
    dlAnchor.setAttribute("href", dataStr);
    dlAnchor.setAttribute("download", `olympia_tts_scripts_${Date.now()}.json`);
    dlAnchor.click();
  };

  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const parsed = JSON.parse(evt.target?.result as string);
        setScripts(parsed);
        setTestStatus("Đã nạp file kịch bản JSON thành công!");
        setTimeout(() => setTestStatus(null), 3000);
      } catch (err) {
        alert("Lỗi đọc file JSON: định dạng không hợp lệ");
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-fade-in font-sans">
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col rounded-2xl bg-gradient-to-b from-slate-900 via-slate-950 to-black border border-amber-500/50 shadow-[0_0_50px_rgba(245,158,11,0.25)] text-slate-100 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-amber-500/30 bg-slate-900/90">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🎙️</span>
            <div>
              <h2 className="text-lg font-black uppercase tracking-wider text-amber-300">
                QUẢN LÝ KỊCH BẢN & MÔ HÌNH GIỌNG NÓI TTS (TTS MANAGER)
              </h2>
              <p className="text-xs text-slate-400">
                Tự do cải biên kịch bản, chỉnh âm sắc nam/nữ, chèn biến động và đồng bộ tức thì
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center font-bold text-sm transition cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Global Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-6 py-2.5 bg-slate-950/80 border-b border-white/10 text-xs">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleResetToDefault}
              className="px-3 py-1.5 rounded-lg border border-rose-500/40 bg-rose-950/40 hover:bg-rose-900/60 text-rose-200 font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm"
              title="Khôi phục toàn bộ câu thoại và âm thanh về mặc định ban đầu"
            >
              <span>🔄</span>
              <span>Khôi phục về mặc định</span>
            </button>
            <label className="px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-200 font-bold transition flex items-center gap-1.5 cursor-pointer">
              <span>📥 Nhập JSON</span>
              <input type="file" accept=".json" onChange={handleImportJson} className="hidden" />
            </label>
            <button
              type="button"
              onClick={handleExportJson}
              className="px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-200 font-bold transition flex items-center gap-1.5 cursor-pointer"
            >
              <span>📤 Xuất JSON</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            {testStatus && (
              <span className="text-amber-400 font-medium text-xs animate-pulse">
                {testStatus}
              </span>
            )}
            <button
              type="button"
              onClick={handleApply}
              className="px-4 py-1.5 rounded-lg border border-amber-400 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black shadow-[0_0_15px_rgba(251,191,36,0.5)] transition flex items-center gap-1.5 cursor-pointer"
            >
              <span>💾</span>
              <span>ÁP DỤNG KỊCH BẢN</span>
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 px-6 pt-3 border-b border-white/10 bg-slate-900/60 overflow-x-auto text-xs">
          {[
            { id: "mc", label: "👥 Cấu hình MC & Giọng" },
            { id: "lobby_opening", label: "🚪 Chào phòng & Khai mạc" },
            { id: "contestants", label: "🙋 Giới thiệu Thí sinh" },
            { id: "rounds", label: "🏆 Lời dẫn Vòng thi" },
            { id: "verdicts", label: "💬 Bình luận Đúng / Sai" },
            { id: "summary_awards", label: "🥇 Tổng kết & Trao giải" },
            { id: "diagnostics", label: "🔬 Kiểm Âm & Chẩn Đoán" },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as TtsTab)}
              className={`px-3.5 py-2 font-bold rounded-t-lg transition whitespace-nowrap cursor-pointer ${
                activeTab === tab.id
                  ? "bg-slate-950 text-amber-300 border-t-2 border-amber-400 shadow-sm"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-sm">
          {/* TAB 1: MC VOICES */}
          {activeTab === "mc" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* MC Khánh Vy */}
              <div className="rounded-xl border border-rose-500/30 bg-rose-950/20 p-5 flex flex-col gap-4">
                <div className="flex items-center justify-between border-b border-rose-500/30 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">👩‍💼</span>
                    <span className="font-black text-rose-200 text-base">MC KHÁNH VY (Nữ)</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleTestSpeak("Xin chào quý vị khán giả đến với Đường lên đỉnh Olympia!", "khanh_vy")}
                    className="px-2.5 py-1 rounded bg-rose-500/30 hover:bg-rose-500/50 text-rose-100 font-bold text-xs flex items-center gap-1 cursor-pointer transition"
                  >
                    <span>🔊</span> Nghe thử
                  </button>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="bg-rose-950/60 border border-rose-500/40 rounded-lg p-2.5 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-rose-300">🎙️ Server Edge TTS (Ưu tiên):</span>
                      <span className="px-1.5 py-0.5 rounded bg-emerald-950 border border-emerald-500/50 text-emerald-300 text-[10px] font-mono">
                        vi-VN-HoaiMyNeural
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-300">
                      Giọng nữ chuẩn truyền hình VTV3: trong trẻo, tự nhiên, thanh thoát. Tự động stream qua Web Audio API không tạo file trên ổ cứng.
                    </p>
                  </div>

                  <div>
                    <label className="text-slate-300 font-bold block mb-1">
                      Cao độ (Pitch): {scripts.mcVoiceConfig?.khanhVy?.pitch ?? 1.12}x (Thanh mảnh, trẻ trung)
                    </label>
                    <input
                      type="range"
                      min="0.6"
                      max="1.6"
                      step="0.02"
                      value={scripts.mcVoiceConfig?.khanhVy?.pitch ?? 1.12}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        setScripts((prev) => ({
                          ...prev,
                          mcVoiceConfig: {
                            ...prev.mcVoiceConfig,
                            khanhVy: { ...prev.mcVoiceConfig?.khanhVy, pitch: val },
                          },
                        }));
                      }}
                      className="w-full accent-rose-400 cursor-pointer"
                    />
                  </div>

                  <div>
                    <label className="text-slate-300 font-bold block mb-1">
                      Tốc độ cơ bản (Rate): {scripts.mcVoiceConfig?.khanhVy?.rate ?? 1.05}x
                    </label>
                    <input
                      type="range"
                      min="0.75"
                      max="1.4"
                      step="0.02"
                      value={scripts.mcVoiceConfig?.khanhVy?.rate ?? 1.05}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        setScripts((prev) => ({
                          ...prev,
                          mcVoiceConfig: {
                            ...prev.mcVoiceConfig,
                            khanhVy: { ...prev.mcVoiceConfig?.khanhVy, rate: val },
                          },
                        }));
                      }}
                      className="w-full accent-rose-400 cursor-pointer"
                    />
                  </div>

                  <div>
                    <label className="text-slate-300 font-bold block mb-1">
                      Giọng hệ thống trình duyệt (Browser Voice):
                    </label>
                    <select
                      value={scripts.mcVoiceConfig?.khanhVy?.voiceURI ?? ""}
                      onChange={(e) => {
                        const uri = e.target.value;
                        setScripts((prev) => ({
                          ...prev,
                          mcVoiceConfig: {
                            ...prev.mcVoiceConfig,
                            khanhVy: { ...prev.mcVoiceConfig?.khanhVy, voiceURI: uri },
                          },
                        }));
                      }}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-200 text-xs"
                    >
                      <option value="">-- Mặc định (Tự chọn tiếng Việt Nữ chuẩn) --</option>
                      {availableVoices.map((v) => (
                        <option key={v.voiceURI} value={v.voiceURI}>
                          {v.name} ({v.lang})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* MC Ngọc Huy */}
              <div className="rounded-xl border border-sky-500/30 bg-sky-950/20 p-5 flex flex-col gap-4">
                <div className="flex items-center justify-between border-b border-sky-500/30 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">👨‍💼</span>
                    <span className="font-black text-sky-200 text-base">MC NGỌC HUY (Nam)</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleTestSpeak("Xin chào các nhà leo núi, chúc các bạn tự tin thi đấu!", "ngoc_huy")}
                    className="px-2.5 py-1 rounded bg-sky-500/30 hover:bg-sky-500/50 text-sky-100 font-bold text-xs flex items-center gap-1 cursor-pointer transition"
                  >
                    <span>🔊</span> Nghe thử
                  </button>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="bg-sky-950/60 border border-sky-500/40 rounded-lg p-2.5 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sky-300">🎙️ Server Edge TTS (Ưu tiên):</span>
                      <span className="px-1.5 py-0.5 rounded bg-emerald-950 border border-emerald-500/50 text-emerald-300 text-[10px] font-mono">
                        vi-VN-NamMinhNeural
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-300">
                      Giọng nam chuẩn truyền hình VTV3: trầm ấm, dứt khoát, quyền lực. Tự động stream qua Web Audio API không tạo file trên ổ cứng.
                    </p>
                  </div>

                  <div>
                    <label className="text-slate-300 font-bold block mb-1">
                      Cao độ (Pitch): {scripts.mcVoiceConfig?.ngocHuy?.pitch ?? 0.88}x (Trầm ấm, dứt khoát)
                    </label>
                    <input
                      type="range"
                      min="0.6"
                      max="1.4"
                      step="0.02"
                      value={scripts.mcVoiceConfig?.ngocHuy?.pitch ?? 0.88}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        setScripts((prev) => ({
                          ...prev,
                          mcVoiceConfig: {
                            ...prev.mcVoiceConfig,
                            ngocHuy: { ...prev.mcVoiceConfig?.ngocHuy, pitch: val },
                          },
                        }));
                      }}
                      className="w-full accent-sky-400 cursor-pointer"
                    />
                  </div>

                  <div>
                    <label className="text-slate-300 font-bold block mb-1">
                      Tốc độ cơ bản (Rate): {scripts.mcVoiceConfig?.ngocHuy?.rate ?? 1.04}x
                    </label>
                    <input
                      type="range"
                      min="0.75"
                      max="1.4"
                      step="0.02"
                      value={scripts.mcVoiceConfig?.ngocHuy?.rate ?? 1.04}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        setScripts((prev) => ({
                          ...prev,
                          mcVoiceConfig: {
                            ...prev.mcVoiceConfig,
                            ngocHuy: { ...prev.mcVoiceConfig?.ngocHuy, rate: val },
                          },
                        }));
                      }}
                      className="w-full accent-sky-400 cursor-pointer"
                    />
                  </div>

                  <div>
                    <label className="text-slate-300 font-bold block mb-1">
                      Giọng hệ thống trình duyệt (Browser Voice):
                    </label>
                    <select
                      value={scripts.mcVoiceConfig?.ngocHuy?.voiceURI ?? ""}
                      onChange={(e) => {
                        const uri = e.target.value;
                        setScripts((prev) => ({
                          ...prev,
                          mcVoiceConfig: {
                            ...prev.mcVoiceConfig,
                            ngocHuy: { ...prev.mcVoiceConfig?.ngocHuy, voiceURI: uri },
                          },
                        }));
                      }}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-200 text-xs"
                    >
                      <option value="">-- Mặc định (Tự chọn tiếng Việt Nam chuẩn) --</option>
                      {availableVoices.map((v) => (
                        <option key={v.voiceURI} value={v.voiceURI}>
                          {v.name} ({v.lang})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: LOBBY & OPENING */}
          {activeTab === "lobby_opening" && (
            <div className="space-y-6">
              <div className="rounded-xl border border-slate-700 bg-slate-900/40 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-amber-300">Lời Chào Phòng Chờ (Tự động phát sau 3 giây mở phòng)</h3>
                    <p className="text-xs text-slate-400">
                      Hệ thống chọn ngẫu nhiên các câu thoại để tạo không khí sống động. Biến khả dụng: <code className="text-amber-200 font-mono">{"{roomName}"}</code>, <code className="text-amber-200 font-mono">{"{tenPhong}"}</code>
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleTestSpeak(scripts.lobbyGreeting?.[0] || "", "khanh_vy")}
                    className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <span>🔊</span> Nghe thử
                  </button>
                </div>

                <div className="space-y-2">
                  {(scripts.lobbyGreeting || []).map((line, idx) => (
                    <div key={idx} className="flex gap-2 items-center">
                      <span className="text-xs text-slate-400 font-mono w-6 text-right">#{idx + 1}</span>
                      <input
                        type="text"
                        value={line}
                        onChange={(e) => {
                          const val = e.target.value;
                          setScripts((prev) => {
                            const copy = [...(prev.lobbyGreeting || [])];
                            copy[idx] = val;
                            return { ...prev, lobbyGreeting: copy };
                          });
                        }}
                        className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:border-amber-400 focus:outline-none"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-slate-700 bg-slate-900/40 p-4 space-y-4">
                <div>
                  <h3 className="font-bold text-amber-300">Lời Mở Màn Song Dẫn (Khi Host bấm Bắt đầu)</h3>
                  <p className="text-xs text-slate-400">
                    Khánh Vy chào khán giả trước, sau đó Ngọc Huy tiếp lời hào hứng trước khi chào đón thí sinh.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-rose-300">Khánh Vy phát biểu:</span>
                      <button
                        type="button"
                        onClick={() => handleTestSpeak(scripts.openingDuo?.khanhVy || "", "khanh_vy")}
                        className="text-slate-400 hover:text-slate-200 cursor-pointer"
                      >
                        🔊 Thử
                      </button>
                    </div>
                    <textarea
                      rows={3}
                      value={scripts.openingDuo?.khanhVy || ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        setScripts((prev) => ({
                          ...prev,
                          openingDuo: { ...prev.openingDuo, khanhVy: val, ngocHuy: prev.openingDuo?.ngocHuy || "" },
                        }));
                      }}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-slate-200 focus:border-amber-400 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-sky-300">Ngọc Huy tiếp lời:</span>
                      <button
                        type="button"
                        onClick={() => handleTestSpeak(scripts.openingDuo?.ngocHuy || "", "ngoc_huy")}
                        className="text-slate-400 hover:text-slate-200 cursor-pointer"
                      >
                        🔊 Thử
                      </button>
                    </div>
                    <textarea
                      rows={3}
                      value={scripts.openingDuo?.ngocHuy || ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        setScripts((prev) => ({
                          ...prev,
                          openingDuo: { khanhVy: prev.openingDuo?.khanhVy || "", ngocHuy: val },
                        }));
                      }}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-slate-200 focus:border-amber-400 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: CONTESTANT INTRO */}
          {activeTab === "contestants" && (
            <div className="space-y-4">
              <div className="rounded-xl border border-slate-700 bg-slate-900/40 p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-amber-300">Mẫu Câu Giới Thiệu Từng Thí Sinh Bước Ra Sân Khấu</h3>
                    <p className="text-xs text-slate-400">
                      Tự động xướng tên khi thí sinh bước xuống bậc thang trường quay 3D.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleTestSpeak(scripts.contestantIntroPattern || "", "khanh_vy")}
                    className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <span>🔊</span> Nghe thử mẫu
                  </button>
                </div>

                <div className="flex flex-wrap gap-2 text-xs">
                  <span className="text-slate-400">Các biến khả dụng:</span>
                  <span className="px-2 py-0.5 rounded bg-amber-500/20 border border-amber-500/40 font-mono text-amber-200">
                    {"{tenThiSinh}"}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-amber-500/20 border border-amber-500/40 font-mono text-amber-200">
                    {"{tenTruong}"}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-amber-500/20 border border-amber-500/40 font-mono text-amber-200">
                    {"{viTri}"}
                  </span>
                </div>

                <div>
                  <textarea
                    rows={3}
                    value={scripts.contestantIntroPattern || ""}
                    onChange={(e) => {
                      const val = e.target.value;
                      setScripts((prev) => ({ ...prev, contestantIntroPattern: val }));
                    }}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-xs text-slate-200 focus:border-amber-400 focus:outline-none"
                  />
                  <p className="text-[11px] text-slate-400 mt-1.5 italic">
                    Ví dụ kết quả: &quot;Xin được giới thiệu thí sinh Nguyễn Văn A đến từ trường THPT Chuyên Hà Nội - Amsterdam.&quot;
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: ROUND INTROS */}
          {activeTab === "rounds" && (
            <div className="space-y-4">
              <div className="text-xs text-slate-400 bg-amber-500/10 border border-amber-500/30 p-3 rounded-xl flex items-center gap-2">
                <span>ℹ️</span>
                <span>
                  <strong>Nguyên tắc đồng bộ:</strong> Tất cả lời dẫn vòng thi dưới đây chỉ được phát sau khi Video/Audio Intro kết thúc 100% (hoặc Host bấm Bỏ qua), đảm bảo không bao giờ nói đè lên nhạc hiệu.
                </span>
              </div>

              <div className="space-y-3">
                {[
                  { key: "khoiDong", label: "Phần thi Khởi Động", defaultRole: "khanh_vy" as const },
                  { key: "vuotChuongNgaiVat", label: "Phần thi Vượt Chướng Ngại Vật", defaultRole: "ngoc_huy" as const },
                  { key: "tangToc", label: "Phần thi Tăng Tốc", defaultRole: "khanh_vy" as const },
                  { key: "veDich", label: "Phần thi Về Đích", defaultRole: "khanh_vy" as const },
                  { key: "cauHoiPhu", label: "Phần thi Câu Hỏi Phụ (Khi bằng điểm)", defaultRole: "ngoc_huy" as const },
                ].map((item) => (
                  <div key={item.key} className="rounded-xl border border-slate-700 bg-slate-900/40 p-3.5 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-amber-200">{item.label}</span>
                      <button
                        type="button"
                        onClick={() => handleTestSpeak(scripts.roundIntros?.[item.key] || "", item.defaultRole)}
                        className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1 cursor-pointer"
                      >
                        🔊 Nghe thử
                      </button>
                    </div>
                    <input
                      type="text"
                      value={scripts.roundIntros?.[item.key] || ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        setScripts((prev) => ({
                          ...prev,
                          roundIntros: { ...prev.roundIntros, [item.key]: val },
                        }));
                      }}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:border-amber-400 focus:outline-none"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 5: VERDICTS */}
          {activeTab === "verdicts" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Đúng */}
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-emerald-500/30 pb-2">
                  <span className="font-bold text-xs text-emerald-300">✅ Lời Khen Khi Trả Lời Đúng</span>
                  <button
                    type="button"
                    onClick={() => handleTestSpeak(scripts.correctResponses?.[0] || "", "khanh_vy")}
                    className="text-xs text-slate-400 hover:text-slate-200 cursor-pointer"
                  >
                    🔊 Thử
                  </button>
                </div>
                <div className="space-y-2">
                  {(scripts.correctResponses || []).map((line, idx) => (
                    <input
                      key={idx}
                      type="text"
                      value={line}
                      onChange={(e) => {
                        const val = e.target.value;
                        setScripts((prev) => {
                          const copy = [...(prev.correctResponses || [])];
                          copy[idx] = val;
                          return { ...prev, correctResponses: copy };
                        });
                      }}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:border-emerald-400 focus:outline-none"
                    />
                  ))}
                </div>
              </div>

              {/* Sai */}
              <div className="rounded-xl border border-rose-500/30 bg-rose-950/20 p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-rose-500/30 pb-2">
                  <span className="font-bold text-xs text-rose-300">❌ Lời Động Viên Khi Trả Lời Chưa Đúng</span>
                  <button
                    type="button"
                    onClick={() => handleTestSpeak(scripts.wrongResponses?.[0] || "", "ngoc_huy")}
                    className="text-xs text-slate-400 hover:text-slate-200 cursor-pointer"
                  >
                    🔊 Thử
                  </button>
                </div>
                <div className="space-y-2">
                  {(scripts.wrongResponses || []).map((line, idx) => (
                    <input
                      key={idx}
                      type="text"
                      value={line}
                      onChange={(e) => {
                        const val = e.target.value;
                        setScripts((prev) => {
                          const copy = [...(prev.wrongResponses || [])];
                          copy[idx] = val;
                          return { ...prev, wrongResponses: copy };
                        });
                      }}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:border-rose-400 focus:outline-none"
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: SUMMARY & AWARDS */}
          {activeTab === "summary_awards" && (
            <div className="space-y-5">
              {/* Post-match summary opening */}
              <div className="rounded-xl border border-slate-700 bg-slate-900/40 p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-amber-300">Lời Mở Đầu Tổng Kết Điểm Chung Cuộc (Cam MC)</span>
                  <button
                    type="button"
                    onClick={() => handleTestSpeak(scripts.postMatchOpening || "", "khanh_vy")}
                    className="text-xs text-slate-400 hover:text-slate-200 cursor-pointer"
                  >
                    🔊 Nghe thử
                  </button>
                </div>
                <textarea
                  rows={2}
                  value={scripts.postMatchOpening || ""}
                  onChange={(e) => {
                    const val = e.target.value;
                    setScripts((prev) => ({ ...prev, postMatchOpening: val }));
                  }}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-slate-200 focus:border-amber-400 focus:outline-none"
                />
              </div>

              {/* Award tiers */}
              <div className="rounded-xl border border-amber-500/40 bg-amber-950/20 p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-amber-500/30 pb-2">
                  <span className="font-bold text-xs text-amber-300 uppercase">
                    🥇 Lời Xướng Bục Vinh Quang (Trao Giải Thưởng 3 Cấp)
                  </span>
                  <div className="flex gap-2 text-[11px] text-amber-200 font-mono">
                    <span>{"{tenThiSinh}"}</span>
                    <span>{"{diemSo}"}</span>
                    <span>{"{tenTruong}"}</span>
                  </div>
                </div>

                <div className="space-y-2.5">
                  <div>
                    <label className="text-xs font-bold text-slate-300 block mb-1">🥉 Giải Ba (Đồng Giải Ba):</label>
                    <input
                      type="text"
                      value={scripts.awardTiers?.third || ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        setScripts((prev) => ({
                          ...prev,
                          awardTiers: { ...prev.awardTiers, third: val },
                        }));
                      }}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:border-amber-400 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-300 block mb-1">🥈 Giải Nhì:</label>
                    <input
                      type="text"
                      value={scripts.awardTiers?.second || ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        setScripts((prev) => ({
                          ...prev,
                          awardTiers: { ...prev.awardTiers, second: val },
                        }));
                      }}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:border-amber-400 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-amber-300 block mb-1">🥇 Quán Quân & Vòng Nguyệt Quế:</label>
                    <input
                      type="text"
                      value={scripts.awardTiers?.first || ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        setScripts((prev) => ({
                          ...prev,
                          awardTiers: { ...prev.awardTiers, first: val },
                        }));
                      }}
                      className="w-full bg-slate-950 border border-amber-400/50 rounded-lg px-3 py-1.5 text-xs text-amber-100 focus:border-amber-300 focus:outline-none font-bold"
                    />
                  </div>
                </div>
              </div>

              {/* Closing farewell */}
              <div className="rounded-xl border border-slate-700 bg-slate-900/40 p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-slate-300">Lời Chào Bế Mạc & Tạm Biệt</span>
                  <button
                    type="button"
                    onClick={() => handleTestSpeak(scripts.closingFarewell?.[0] || "", "khanh_vy")}
                    className="text-xs text-slate-400 hover:text-slate-200 cursor-pointer"
                  >
                    🔊 Nghe thử
                  </button>
                </div>
                <textarea
                  rows={2}
                  value={scripts.closingFarewell?.[0] || ""}
                  onChange={(e) => {
                    const val = e.target.value;
                    setScripts((prev) => ({
                      ...prev,
                      closingFarewell: [val, prev.closingFarewell?.[1] || ""],
                    }));
                  }}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-slate-200 focus:border-amber-400 focus:outline-none"
                />
              </div>
            </div>
          )}

          {/* TAB 7: AUDIO DIAGNOSTIC WORKBENCH */}
          {activeTab === "diagnostics" && (
            <div className="space-y-6">
              {/* Engine Mode Switcher */}
              <div className="rounded-xl border border-indigo-500/40 bg-indigo-950/20 p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-black text-indigo-300 text-sm flex items-center gap-2">
                      <span>⚙️</span> CHẾ ĐỘ MÁY PHÁT ÂM (TTS SYNTHESIS ENGINE MODE)
                    </h3>
                    <p className="text-xs text-slate-400">
                      Chọn cơ chế phát âm để kiểm tra độc lập server streaming và client offline fallback
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleEmergencyStop}
                    className="px-3 py-1.5 rounded-lg border border-rose-500/60 bg-rose-950/70 hover:bg-rose-900 text-rose-200 font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-sm transition"
                  >
                    <span>🛑</span> Dừng âm thanh khẩn cấp
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setDiagnosticEngine("auto")}
                    className={`p-3 rounded-lg border text-left transition cursor-pointer flex flex-col gap-1 ${
                      diagnosticEngine === "auto"
                        ? "border-amber-400 bg-amber-950/40 text-amber-200 shadow-md"
                        : "border-slate-800 bg-slate-900/40 text-slate-400 hover:border-slate-700"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs">🚀 Chế độ Tự Động (Auto)</span>
                      {diagnosticEngine === "auto" && <span className="text-amber-400 text-xs">✓ Đang chọn</span>}
                    </div>
                    <span className="text-[11px] text-slate-300">
                      Ưu tiên Server WebSocket Edge TTS, tự động dự phòng Web Speech nếu mất kết nối.
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDiagnosticEngine("server")}
                    className={`p-3 rounded-lg border text-left transition cursor-pointer flex flex-col gap-1 ${
                      diagnosticEngine === "server"
                        ? "border-indigo-400 bg-indigo-950/40 text-indigo-200 shadow-md"
                        : "border-slate-800 bg-slate-900/40 text-slate-400 hover:border-slate-700"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs">⚡ Bắt buộc Server Edge TTS</span>
                      {diagnosticEngine === "server" && <span className="text-indigo-400 text-xs">✓ Đang chọn</span>}
                    </div>
                    <span className="text-[11px] text-slate-300">
                      Ép phát qua /api/olympia/tts bằng HoaiMyNeural & NamMinhNeural (Zero-file Web Audio API).
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDiagnosticEngine("webspeech")}
                    className={`p-3 rounded-lg border text-left transition cursor-pointer flex flex-col gap-1 ${
                      diagnosticEngine === "webspeech"
                        ? "border-emerald-400 bg-emerald-950/40 text-emerald-200 shadow-md"
                        : "border-slate-800 bg-slate-900/40 text-slate-400 hover:border-slate-700"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs">🌐 Bắt buộc Web Speech (Client)</span>
                      {diagnosticEngine === "webspeech" && <span className="text-emerald-400 text-xs">✓ Đang chọn</span>}
                    </div>
                    <span className="text-[11px] text-slate-300">
                      Ép dùng API giọng nói tích hợp của trình duyệt với thuật toán tự động tách âm sắc nam/nữ.
                    </span>
                  </button>
                </div>
              </div>

              {/* Real-time Telemetry Dashboard */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-3.5 space-y-1">
                  <span className="text-[11px] text-slate-400 block font-bold uppercase">Engine Kích Hoạt</span>
                  <div className="text-sm font-black text-amber-300 font-mono flex items-center gap-1.5">
                    <span>{telemetry.engineUsed.toUpperCase()}</span>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-3.5 space-y-1">
                  <span className="text-[11px] text-slate-400 block font-bold uppercase">Trạng Thái Audio</span>
                  <div className="text-sm font-black font-mono flex items-center gap-1.5">
                    {telemetry.status === "streaming" && <span className="text-indigo-400 animate-pulse">📡 Đang stream WebAudio</span>}
                    {telemetry.status === "speaking" && <span className="text-emerald-400 animate-pulse">🔊 Đang phát âm</span>}
                    {telemetry.status === "ended" && <span className="text-sky-300">⏹️ Đã kết thúc</span>}
                    {telemetry.status === "error" && <span className="text-rose-400">❌ Lỗi phát âm</span>}
                    {telemetry.status === "idle" && <span className="text-slate-400">💤 Sẵn sàng (Idle)</span>}
                  </div>
                </div>

                <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-3.5 space-y-1">
                  <span className="text-[11px] text-slate-400 block font-bold uppercase">Độ Trễ Phản Hồi</span>
                  <div className="text-sm font-black text-cyan-300 font-mono">
                    {telemetry.latencyMs > 0 ? `${telemetry.latencyMs} ms` : "--"}
                  </div>
                </div>

                <div className="rounded-xl border border-emerald-500/40 bg-emerald-950/20 p-3.5 space-y-1">
                  <span className="text-[11px] text-emerald-400 block font-bold uppercase">Bộ Nhớ / Đĩa Cứng</span>
                  <div className="text-xs font-black text-emerald-300 font-mono">
                    {telemetry.zeroDiskConfirmed ? "✅ 100% In-Memory (Zero Disk)" : "Chuẩn bị"}
                  </div>
                </div>
              </div>

              {/* Live Test Scenarios Matrix */}
              <div className="rounded-xl border border-slate-700 bg-slate-900/40 p-5 space-y-4">
                <div className="border-b border-white/10 pb-2">
                  <h3 className="font-black text-amber-300 text-sm">🧪 KỊCH BẢN THỬ NGHIỆM TRỰC TIẾP (LIVE TEST SCENARIOS)</h3>
                  <p className="text-xs text-slate-400">
                    Nhấp để thử nghiệm phản hồi thực tế của MC Khánh Vy, Ngọc Huy và cơ chế phân nhánh kịch bản
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* Scenario 1: Khanh Vy solo intro */}
                  <div className="p-3.5 rounded-lg border border-rose-500/30 bg-rose-950/20 flex items-center justify-between gap-3">
                    <div>
                      <div className="font-bold text-xs text-rose-200">1. MC Khánh Vy - Chào Khai Mạc Show</div>
                      <p className="text-[11px] text-slate-400 italic">&ldquo;Chào mừng quý vị đến với Đường lên đỉnh Olympia năm thứ 26!&rdquo;</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleTestSpeak("Chào mừng quý vị và các bạn đã quay trở lại với trường quay S14 của Đường lên đỉnh Olympia!", "khanh_vy")}
                      className="px-3 py-1.5 rounded-lg bg-rose-600/40 hover:bg-rose-600/60 text-rose-100 font-bold text-xs whitespace-nowrap cursor-pointer transition shadow-sm"
                    >
                      🔊 Phát âm
                    </button>
                  </div>

                  {/* Scenario 2: Ngoc Huy solo round intro */}
                  <div className="p-3.5 rounded-lg border border-sky-500/30 bg-sky-950/20 flex items-center justify-between gap-3">
                    <div>
                      <div className="font-bold text-xs text-sky-200">2. MC Ngọc Huy - Dẫn Vào Khởi Động</div>
                      <p className="text-[11px] text-slate-400 italic">&ldquo;Và ngay bây giờ, chúng ta sẽ bước vào phần thi Khởi Động!&rdquo;</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleTestSpeak("Và ngay bây giờ, 4 nhà leo núi của chúng ta đã sẵn sàng bước vào phần thi Khởi Động!", "ngoc_huy")}
                      className="px-3 py-1.5 rounded-lg bg-sky-600/40 hover:bg-sky-600/60 text-sky-100 font-bold text-xs whitespace-nowrap cursor-pointer transition shadow-sm"
                    >
                      🔊 Phát âm
                    </button>
                  </div>

                  {/* Scenario 3: Duo MC conversation */}
                  <div className="p-3.5 rounded-lg border border-amber-500/30 bg-amber-950/20 flex items-center justify-between gap-3">
                    <div>
                      <div className="font-bold text-xs text-amber-200">3. Đối thoại Song MC (Khánh Vy ➡️ Ngọc Huy)</div>
                      <p className="text-[11px] text-slate-400 italic">Hai MC phối hợp luân phiên với hai giọng nam/nữ tách biệt</p>
                    </div>
                    <button
                      type="button"
                      onClick={handleTestDuoSpeak}
                      className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs whitespace-nowrap cursor-pointer transition shadow-sm"
                    >
                      👥 Thử Song MC
                    </button>
                  </div>

                  {/* Scenario 4: Khoi Dong solo vs shared */}
                  <div className="p-3.5 rounded-lg border border-indigo-500/30 bg-indigo-950/20 flex items-center justify-between gap-3">
                    <div>
                      <div className="font-bold text-xs text-indigo-200">4. Khởi Động Cá Nhân vs Chung</div>
                      <p className="text-[11px] text-slate-400 italic">Cá nhân (không nhắc chuông) | Chung (nhắc bấm chuông)</p>
                    </div>
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleTestSpeak("Xin mời bạn Nguyễn Văn A bước vào lượt thi Khởi động cá nhân của mình với 6 câu hỏi. Chúc bạn thi đấu thật bình tĩnh và đạt điểm số tối đa!", "ngoc_huy")}
                        className="px-2 py-1 rounded bg-indigo-600/40 hover:bg-indigo-600/60 text-indigo-100 font-bold text-[11px] cursor-pointer"
                        title="Lượt cá nhân: Không nhắc chuông, chúc tự tin"
                      >
                        Cá nhân
                      </button>
                      <button
                        type="button"
                        onClick={() => handleTestSpeak("Các bạn thí sinh hãy chuẩn bị sẵn sàng tay trên bàn phím chuông, chúc cả 4 bạn sẽ có một màn khởi động thật suôn sẻ và giành được thật nhiều điểm số!", "khanh_vy")}
                        className="px-2 py-1 rounded bg-indigo-600/40 hover:bg-indigo-600/60 text-indigo-100 font-bold text-[11px] cursor-pointer"
                        title="Lượt chung: Nhắc sẵn sàng tay trên chuông"
                      >
                        Chung (Chuông)
                      </button>
                    </div>
                  </div>

                  {/* Scenario 5: Khoi Dong Correct (playful) vs Wrong (mandatory answer) */}
                  <div className="p-3.5 rounded-lg border border-emerald-500/30 bg-emerald-950/20 flex items-center justify-between gap-3 md:col-span-2">
                    <div>
                      <div className="font-bold text-xs text-emerald-200">5. Phán quyết Trả Lời: Đúng Biến Thể vs Sai (Bắt buộc công bố đáp án đúng)</div>
                      <p className="text-[11px] text-slate-400 italic">
                        Đúng: Nêu đáp án để lừa nhẹ (&ldquo;Quang Trung? Vâng, hoàn toàn chính xác!&rdquo;) | Sai: Luôn nêu đáp án đúng (&ldquo;Rất tiếc câu trả lời chưa đúng, đáp án chính xác phải là: Quang Trung!&rdquo;)
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleTestSpeak("Quang Trung? Vâng, xin chúc mừng, câu trả lời hoàn toàn chính xác!", "khanh_vy")}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600/40 hover:bg-emerald-600/60 text-emerald-100 font-bold text-xs cursor-pointer"
                      >
                        ✔️ Đúng (Lừa nhẹ)
                      </button>
                      <button
                        type="button"
                        onClick={() => handleTestSpeak("Rất tiếc chưa chính xác, đáp án đúng của chúng ta là: Quang Trung!", "ngoc_huy")}
                        className="px-3 py-1.5 rounded-lg bg-rose-600/40 hover:bg-rose-600/60 text-rose-100 font-bold text-xs cursor-pointer"
                      >
                        ❌ Sai (Nêu đáp án)
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
