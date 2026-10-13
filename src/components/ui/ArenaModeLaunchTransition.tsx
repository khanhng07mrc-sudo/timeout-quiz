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

    // Đảm bảo pha loading hiển thị 850ms để người dùng kịp chiêm ngưỡng kịch bản 3D đặc trưng bung nở
    const elapsed = Date.now() - openTimestampRef.current;
    const waitBeforeOutro = Math.max(0, 850 - elapsed);

    timerOutroRef.current = setTimeout(() => {
      // Pha Outro: Kích hoạt hoạt cảnh bung mở / camera xuyên tâm theo từng mode (550ms)
      setPhase("outro");

      timerDoneRef.current = setTimeout(() => {
        // Kết thúc chuyển cảnh sau đúng nhịp 1.4s tổng thể, hòa tan mượt mà vào bàn đấu
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

  // Tính toán độ lệch từ icon của card được click đến tâm màn hình
  let deltaX = 0;
  let deltaY = 0;
  if (sourceRect && typeof window !== "undefined") {
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;
    const srcX = sourceRect.left + sourceRect.width / 2;
    const srcY = sourceRect.top + sourceRect.height / 2;
    deltaX = srcX - centerX;
    deltaY = srcY - centerY;
  }

  const [isTakeoff, setIsTakeoff] = useState(false);
  useEffect(() => {
    if (isOpen) {
      setIsTakeoff(false);
      const raf = requestAnimationFrame(() => {
        setIsTakeoff(true);
      });
      return () => cancelAnimationFrame(raf);
    } else {
      setIsTakeoff(false);
    }
  }, [isOpen]);

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
      {/* ── 1. MÀN CHE ĐEN TUYỀN SOLID 100% (Khử sạch hoàn toàn chữ và thẻ bên dưới) ── */}
      <div
        className={`absolute inset-0 bg-[#04050d] transition-opacity duration-400 ease-out will-change-transform ${
          isOutro ? "opacity-0" : "opacity-100"
        }`}
      />

      {/* ── 2. CONCENTRIC GLOWING AURA RINGS (CSS GPU Layer 60 FPS, không dùng wire loops) ── */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
        {/* Vòng hào quang chính */}
        <div
          className={`w-72 h-72 sm:w-96 sm:h-96 rounded-full border border-cyan-400/40 shadow-[0_0_80px_rgba(6,182,212,0.3)] transition-all duration-700 ease-out will-change-transform ${
            isOutro ? "scale-150 opacity-0" : "scale-100 opacity-80"
          }`}
          style={{
            background: "radial-gradient(circle, rgba(6,182,212,0.14) 0%, rgba(168,85,247,0.06) 45%, transparent 70%)",
          }}
        />
        {/* Vòng quỹ đạo ánh sáng tím */}
        <div
          className={`absolute w-88 h-88 sm:w-[30rem] sm:h-[30rem] rounded-full border border-purple-500/25 shadow-[0_0_60px_rgba(168,85,247,0.2)] transition-all duration-700 ease-out will-change-transform ${
            isOutro ? "scale-130 opacity-0" : "scale-100 opacity-60"
          }`}
        />
      </div>

      {/* ── 3. THREE.JS REAL 3D ENGINE VỚI GPU COMPOSITOR TAKEOFF (60 FPS MƯỢT TUYỆT ĐỐI) ── */}
      <div
        className="absolute inset-0 pointer-events-none flex items-center justify-center will-change-transform"
        style={{
          transform: isTakeoff ? "translate3d(0, 0, 0) scale(1)" : `translate3d(${deltaX}px, ${deltaY}px, 0) scale(0.18)`,
          transition: "transform 420ms cubic-bezier(0.16, 1, 0.3, 1), opacity 350ms ease-out",
          opacity: isOutro ? 0 : 1,
        }}
      >
        <ArenaThreeScene mode={currentMode} isOutro={isOutro} />
      </div>

      {/* ── 4. CYAN WARP FLASH BURST (250ms hé lộ bàn đấu mượt mà, triệt tiêu giật hình) ── */}
      <div
        className={`absolute inset-0 pointer-events-none transition-opacity duration-300 ${
          isOutro ? "opacity-25 bg-cyan-300" : "opacity-0"
        }`}
      />

      {/* ── 5. HIỆU ỨNG OUTRO IRIS / SHOCKWAVE MỞ BUNG CỰC ĐẠI (300% SCREEN REVEAL) ── */}
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

      {/* ── 6. THÔNG TIN TIÊU ĐỀ & TIẾN TRÌNH KHỞI TẠO ĐẤU TRƯỜNG CHUẨN ESPORTS ── */}
      <div
        className="absolute bottom-16 sm:bottom-20 z-20 flex flex-col items-center justify-center text-center transition-all duration-400 ease-out will-change-transform pointer-events-none max-w-md mx-auto px-4"
        style={{
          transform: isOutro ? "scale(0.9) translateY(16px)" : "scale(1) translateY(0)",
          opacity: isOutro ? 0 : 1,
        }}
      >
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-cyan-500/15 border border-cyan-400/50 text-cyan-300 font-mono text-[11px] font-black tracking-widest uppercase shadow-[0_0_20px_rgba(6,182,212,0.35)] backdrop-blur-md">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
          {isOutro ? "MỞ CỔNG ĐẤU TRƯỜNG" : "KHỞI ĐỘNG ĐẤU TRƯỜNG ARENA"}
        </div>
        <h2 className="mt-2.5 text-3xl sm:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-cyan-100 to-purple-200 tracking-tight drop-shadow-[0_4px_24px_rgba(34,211,238,0.4)]">
          {modeName || currentMode}
        </h2>
        <p className="mt-1 text-xs text-slate-400 font-medium tracking-wide">
          {isOutro
            ? "Bàn đấu đã sẵn sàng · Đang mở màn hé lộ giao diện thi đấu..."
            : "Đang kết nối hệ thống · Chuẩn bị màn chiếu & thiết bị thí sinh..."}
        </p>

        {/* Thanh tiến trình lượng tử sắc nét */}
        <div className="mt-4 w-56 h-1.5 bg-white/10 rounded-full overflow-hidden border border-white/20 p-0.5 relative shadow-[0_0_15px_rgba(6,182,212,0.2)]">
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
