"use client";

import React, { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { GameMode } from "@/types";
import ArenaThreeScene from "@/components/ui/three/ArenaThreeScene";

interface Props {
  isOpen: boolean;
  isReady?: boolean; // Bật true khi bàn đấu Arena ngầm đã được mount và sẵn sàng 100%
  mode: GameMode | string;
  modeName?: string;
  sourceRect?: { top: number; left: number; width: number; height: number } | null;
  onComplete?: () => void;
}

export default function ArenaModeLaunchTransition({
  isOpen,
  isReady = false,
  mode,
  modeName,
  sourceRect,
  onComplete,
}: Props) {
  const [mounted, setMounted] = useState(false);
  const [phase, setPhase] = useState<"idle" | "loading" | "outro">("idle");
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const openTimestampRef = useRef<number>(0);
  const timerOutroRef = useRef<NodeJS.Timeout | null>(null);
  const timerDoneRef = useRef<NodeJS.Timeout | null>(null);
  const timerFallbackRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Quản lý khi mở transition (bắt đầu từ trạng thái loading)
  useEffect(() => {
    if (!isOpen) {
      if (timerOutroRef.current) clearTimeout(timerOutroRef.current);
      if (timerDoneRef.current) clearTimeout(timerDoneRef.current);
      if (timerFallbackRef.current) clearTimeout(timerFallbackRef.current);
      setPhase("idle");
      return;
    }

    openTimestampRef.current = Date.now();
    setPhase("loading");

    // Fallback an toàn: Nếu sau 8 giây mạng lỗi, tự động giải phóng
    timerFallbackRef.current = setTimeout(() => {
      setPhase("outro");
      setTimeout(() => {
        setPhase("idle");
        if (onCompleteRef.current) onCompleteRef.current();
      }, 550);
    }, 8000);

    return () => {
      if (timerFallbackRef.current) clearTimeout(timerFallbackRef.current);
    };
  }, [isOpen]);

  // Quản lý khi bàn đấu bên dưới đã nạp ngầm hoàn tất (isReady = true)
  useEffect(() => {
    if (!isOpen || !isReady || phase === "outro") return;

    // Đảm bảo pha loading hiển thị tối thiểu 360ms để người dùng kịp chiêm ngưỡng quỹ đạo bay 3D từ card mode ra tâm
    const elapsed = Date.now() - openTimestampRef.current;
    const waitBeforeOutro = Math.max(0, 360 - elapsed);

    timerOutroRef.current = setTimeout(() => {
      // Pha Outro: Kích hoạt hoạt cảnh bung mở đặc trưng theo từng mode (550ms)
      setPhase("outro");

      timerDoneRef.current = setTimeout(() => {
        // Kết thúc chuyển cảnh sau đúng nhịp 900ms tổng thể
        setPhase("idle");
        if (onCompleteRef.current) {
          onCompleteRef.current();
        }
      }, 550);
    }, waitBeforeOutro);

    return () => {
      if (timerOutroRef.current) clearTimeout(timerOutroRef.current);
      if (timerDoneRef.current) clearTimeout(timerDoneRef.current);
    };
  }, [isOpen, isReady, phase]);

  if (!isOpen && phase === "idle") return null;
  if (!mounted || typeof document === "undefined") return null;

  const currentMode = String(mode || "CLASSIC").toUpperCase();
  const isOutro = phase === "outro";

  return createPortal(
    <div
      aria-hidden="true"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        zIndex: 99999,
        willChange: "opacity",
      }}
      className={`pointer-events-none overflow-hidden flex items-center justify-center select-none transition-opacity duration-350 ${
        isOutro ? "opacity-0" : "opacity-100"
      }`}
    >
      {/* ── 1. MÀN CHE LƯỢNG TỬ KHÔNG GIAN (Tối ưu 100% GPU, không dùng Blur nặng) ── */}
      <div
        className={`absolute inset-0 bg-[#070814]/96 transition-transform duration-500 ease-out will-change-transform ${
          isOutro ? "scale-105 opacity-0" : "scale-100 opacity-100"
        }`}
      />

      {/* ── 2. THREE.JS REAL 3D WEBGL ENGINE (Kim Loại Vàng PBR & Kính Cyberpunk) ── */}
      {/* Vật thể 3D xuất phát từ toạ độ sourceRect của card mode và bay lướt ra giữa màn hình */}
      <ArenaThreeScene mode={currentMode} isOutro={isOutro} sourceRect={sourceRect} />

      {/* ── 3. HIỆU ỨNG OUTRO IRIS / SHOCKWAVE MỞ BUNG CỰC ĐẠI (300% SCREEN REVEAL) ── */}
      <div
        className={`absolute rounded-full pointer-events-none transition-all duration-550 ease-out will-change-transform ${
          isOutro
            ? "w-[240vmax] h-[240vmax] opacity-0 scale-100 border-[16px] border-cyan-400/80 shadow-[0_0_120px_#22d3ee]"
            : "w-0 h-0 opacity-100 scale-0 border-[0px] border-transparent"
        }`}
        style={{
          background: isOutro
            ? "radial-gradient(circle, transparent 40%, rgba(6,182,212,0.15) 60%, rgba(168,85,247,0.3) 85%, transparent 100%)"
            : "none",
        }}
      />

      {/* ── 4. THÔNG TIN TIÊU ĐỀ & TIẾN TRÌNH KHỞI TẠO ĐẤU TRƯỜNG ── */}
      <div
        className="absolute bottom-16 sm:bottom-20 z-20 flex flex-col items-center justify-center text-center transition-all duration-400 ease-out will-change-transform pointer-events-none max-w-md mx-auto px-4"
        style={{
          transform: isOutro ? "scale(0.9) translateY(16px)" : "scale(1) translateY(0)",
          opacity: isOutro ? 0 : 1,
        }}
      >
        <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-cyan-500/20 border border-cyan-400/40 text-cyan-300 font-mono text-xs font-black tracking-widest uppercase shadow-[0_0_15px_rgba(6,182,212,0.4)]">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
          {isOutro ? "MỞ CỔNG ĐẤU TRƯỜNG" : "KHỞI ĐỘNG ĐẤU TRƯỜNG ARENA"}
        </div>
        <h2 className="mt-2 text-3xl sm:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-cyan-200 to-purple-300 tracking-tight drop-shadow-md">
          {modeName || currentMode}
        </h2>
        <p className="mt-1 text-xs text-slate-300 font-medium">
          {isOutro
            ? "Bàn đấu đã sẵn sàng · Đang mở màn hé lộ giao diện thi đấu..."
            : "Đang kết nối hệ thống · Chuẩn bị màn chiếu & thiết bị thí sinh..."}
        </p>

        {/* Thanh tiến trình lượng tử */}
        <div className="mt-4 w-52 h-1.5 bg-white/10 rounded-full overflow-hidden border border-white/20 p-0.5 relative shadow-inner">
          <div
            className={`h-full bg-gradient-to-r from-purple-500 via-cyan-400 to-emerald-400 rounded-full transition-all ${
              isOutro ? "w-full duration-200" : "w-3/4 animate-pulse duration-500"
            }`}
          />
        </div>
      </div>
    </div>,
    document.body
  );
}
