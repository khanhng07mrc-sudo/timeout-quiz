"use client";

import React, { useState, useEffect } from "react";
import { useTranslation, SUPPORTED_LANGUAGES, Language } from "@/lib/i18n";
import Link from "next/link";

interface GlobalSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function GlobalSettingsModal({ isOpen, onClose }: GlobalSettingsModalProps) {
  const { language, setLanguage } = useTranslation();
  const [bgmEnabled, setBgmEnabled] = useState(true);
  const [sfxEnabled, setSfxEnabled] = useState(true);
  const [gpuSaver, setGpuSaver] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    try {
      const savedBgm = localStorage.getItem("quizorra_bgm");
      if (savedBgm !== null) setBgmEnabled(savedBgm === "true");

      const savedSfx = localStorage.getItem("quizorra_sfx");
      if (savedSfx !== null) setSfxEnabled(savedSfx === "true");

      const savedGpu = localStorage.getItem("quizorra_gpu_saver");
      if (savedGpu !== null) setGpuSaver(savedGpu === "true");
    } catch (_) {}

    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFsChange);
    return () => document.removeEventListener("fullscreenchange", handleFsChange);
  }, []);

  const toggleBgm = () => {
    const next = !bgmEnabled;
    setBgmEnabled(next);
    try {
      localStorage.setItem("quizorra_bgm", String(next));
    } catch (_) {}
  };

  const toggleSfx = () => {
    const next = !sfxEnabled;
    setSfxEnabled(next);
    try {
      localStorage.setItem("quizorra_sfx", String(next));
    } catch (_) {}
  };

  const toggleGpuSaver = () => {
    const next = !gpuSaver;
    setGpuSaver(next);
    try {
      localStorage.setItem("quizorra_gpu_saver", String(next));
    } catch (_) {}
    if (next) {
      document.documentElement.classList.add("gpu-saver-mode");
    } else {
      document.documentElement.classList.remove("gpu-saver-mode");
    }
  };

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (e) {
      console.warn("Fullscreen toggle error:", e);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-[#0e1222] border border-cyan-500/30 rounded-3xl p-6 sm:p-7 shadow-2xl shadow-cyan-950/40 relative z-10 animate-scale-in space-y-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-300">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Cài đặt hệ thống</h3>
              <p className="text-xs text-slate-400">Tùy chỉnh trải nghiệm đấu trường Quizorra</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Setting Groups */}
        <div className="space-y-4 text-xs sm:text-sm text-slate-300">
          {/* 1. Âm thanh */}
          <div className="p-4 rounded-2xl bg-[#14182e] border border-slate-800 space-y-3">
            <h4 className="font-bold text-cyan-300 uppercase tracking-wider text-[11px]">
              Âm thanh &amp; Nhạc nền
            </h4>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-white">Nhạc nền trường quay (BGM)</p>
                <p className="text-[11px] text-slate-400">Âm thanh kịch tính trong phòng thi và màn chiếu</p>
              </div>
              <button
                type="button"
                onClick={toggleBgm}
                className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${
                  bgmEnabled ? "bg-cyan-500" : "bg-slate-700"
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-transform ${
                    bgmEnabled ? "left-6" : "left-1"
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-700/50">
              <div>
                <p className="font-semibold text-white">Hiệu ứng âm thanh (SFX)</p>
                <p className="text-[11px] text-slate-400">Tiếng bấm chuông, đúng/sai, tiếng thẻ bài</p>
              </div>
              <button
                type="button"
                onClick={toggleSfx}
                className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${
                  sfxEnabled ? "bg-cyan-500" : "bg-slate-700"
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-transform ${
                    sfxEnabled ? "left-6" : "left-1"
                  }`}
                />
              </button>
            </div>
          </div>

          {/* 2. Đồ họa & Hiệu năng */}
          <div className="p-4 rounded-2xl bg-[#14182e] border border-slate-800 space-y-3">
            <h4 className="font-bold text-purple-300 uppercase tracking-wider text-[11px]">
              Hiệu năng &amp; Đồ họa
            </h4>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-white">Chế độ tiết kiệm GPU (Mượt mà)</p>
                <p className="text-[11px] text-slate-400">Giảm bớt hiệu ứng 3D &amp; mờ nền khi máy yếu</p>
              </div>
              <button
                type="button"
                onClick={toggleGpuSaver}
                className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${
                  gpuSaver ? "bg-purple-500" : "bg-slate-700"
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-transform ${
                    gpuSaver ? "left-6" : "left-1"
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-700/50">
              <div>
                <p className="font-semibold text-white">Chế độ toàn màn hình (Fullscreen)</p>
                <p className="text-[11px] text-slate-400">Tối ưu máy chiếu hội trường hoặc phím tắt F11</p>
              </div>
              <button
                type="button"
                onClick={toggleFullscreen}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition cursor-pointer"
              >
                {isFullscreen ? "Thoát F11" : "Bật F11"}
              </button>
            </div>
          </div>

          {/* 3. Ngôn ngữ */}
          <div className="p-4 rounded-2xl bg-[#14182e] border border-slate-800 space-y-2">
            <h4 className="font-bold text-emerald-300 uppercase tracking-wider text-[11px]">
              Ngôn ngữ hiển thị
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
              {SUPPORTED_LANGUAGES.map((lang) => (
                <button
                  key={lang.code}
                  type="button"
                  onClick={() => setLanguage(lang.code)}
                  className={`py-2 px-2.5 rounded-xl border text-xs font-semibold flex items-center gap-2 transition cursor-pointer ${
                    language === lang.code
                      ? "border-cyan-400 bg-cyan-500/20 text-cyan-200"
                      : "border-slate-700 bg-slate-900/60 text-slate-300 hover:border-slate-500"
                  }`}
                >
                  <span className="text-base">{lang.flag}</span>
                  <span className="truncate">{lang.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-500">
          <span>Quizorra v2.4 (Studio Edition)</span>
          <div className="flex items-center gap-3">
            <Link href="/privacy" onClick={onClose} className="hover:text-cyan-300 transition">
              Bảo mật
            </Link>
            <span>•</span>
            <Link href="/terms" onClick={onClose} className="hover:text-cyan-300 transition">
              Điều khoản
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
