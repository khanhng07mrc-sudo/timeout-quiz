"use client";

import React, { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { GameMode } from "@/types";
import GameModeHologramIcon from "@/components/ui/GameModeHologramIcon";

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
  const [phase, setPhase] = useState<"idle" | "loading" | "swoosh" | "fadeout">("idle");
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const openTimestampRef = useRef<number>(0);
  const timerSwooshRef = useRef<NodeJS.Timeout | null>(null);
  const timerFadeoutRef = useRef<NodeJS.Timeout | null>(null);
  const timerDoneRef = useRef<NodeJS.Timeout | null>(null);
  const timerFallbackRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Quản lý khi mở transition (bắt đầu từ trạng thái loading)
  useEffect(() => {
    if (!isOpen) {
      if (timerSwooshRef.current) clearTimeout(timerSwooshRef.current);
      if (timerFadeoutRef.current) clearTimeout(timerFadeoutRef.current);
      if (timerDoneRef.current) clearTimeout(timerDoneRef.current);
      if (timerFallbackRef.current) clearTimeout(timerFallbackRef.current);
      setPhase("idle");
      return;
    }

    openTimestampRef.current = Date.now();
    setPhase("loading");

    // Fallback cứu hộ: Nếu sau 9 giây mạng bị lag hay không nhận được isReady, tự động giải phóng
    timerFallbackRef.current = setTimeout(() => {
      setPhase("fadeout");
      setTimeout(() => {
        setPhase("idle");
        if (onCompleteRef.current) onCompleteRef.current();
      }, 400);
    }, 9000);

    return () => {
      if (timerFallbackRef.current) clearTimeout(timerFallbackRef.current);
    };
  }, [isOpen]);

  // Quản lý khi bàn đấu bên dưới đã nạp ngầm hoàn tất (isReady = true)
  useEffect(() => {
    if (!isOpen || !isReady || phase === "swoosh" || phase === "fadeout") return;

    // Đảm bảo pha loading hiển thị tối thiểu 350ms để người dùng thấy logo 3D kính xuất hiện mượt mà
    const elapsed = Date.now() - openTimestampRef.current;
    const waitBeforeSwoosh = Math.max(0, 350 - elapsed);

    timerSwooshRef.current = setTimeout(() => {
      // Giai đoạn 2: Bàn đấu đã nằm ngầm bên dưới, Logo 110vh khổng lồ quét ngang toàn màn hình (450ms)
      setPhase("swoosh");

      timerFadeoutRef.current = setTimeout(() => {
        // Giai đoạn 3: Vén màn mượt mà để lộ bàn đấu đã nạp sẵn 100% (400ms)
        setPhase("fadeout");

        timerDoneRef.current = setTimeout(() => {
          // Giai đoạn 4: Kết thúc chuyển cảnh (Cinematic hoàn tất)
          setPhase("idle");
          if (onCompleteRef.current) {
            onCompleteRef.current();
          }
        }, 400);
      }, 450);
    }, waitBeforeSwoosh);

    return () => {
      if (timerSwooshRef.current) clearTimeout(timerSwooshRef.current);
      if (timerFadeoutRef.current) clearTimeout(timerFadeoutRef.current);
      if (timerDoneRef.current) clearTimeout(timerDoneRef.current);
    };
  }, [isOpen, isReady, phase]);

  if (!isOpen && phase === "idle") return null;
  if (!mounted || typeof document === "undefined") return null;

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
      }}
      className={`pointer-events-none overflow-hidden flex items-center justify-center transition-opacity duration-400 select-none ${
        phase === "fadeout" ? "opacity-0" : "opacity-100"
      }`}
    >
      {/* ── 1. Màn Che Lượng Tử Không Gian (Backdrop Phủ Kín 100% Bên Trên Bàn Đấu) ── */}
      <div
        className={`absolute inset-0 bg-[#070814]/96 transition-opacity duration-400 ${
          phase === "loading"
            ? "opacity-95"
            : phase === "swoosh"
            ? "opacity-95"
            : "opacity-0"
        }`}
      />

      {/* ── 2. Dải Sóng Năng Lượng Quét Ngang Toàn Màn Hình (Quantum Swoosh Wave) ── */}
      <div
        className={`absolute inset-0 pointer-events-none transition-transform duration-650 ease-out will-change-transform ${
          phase === "swoosh"
            ? "translate-x-[-120%] opacity-100"
            : "translate-x-[120%] opacity-0"
        }`}
        style={{
          background:
            "linear-gradient(90deg, transparent 0%, rgba(168, 85, 247, 0.25) 35%, rgba(6, 182, 212, 0.5) 50%, rgba(255, 255, 255, 0.8) 52%, rgba(6, 182, 212, 0.5) 54%, transparent 100%)",
        }}
      />

      {/* ── 3. LOGO 3D KÍNH KHỔNG LỒ 110% CHIỀU CAO MÀN HÌNH QUÉT QUA & QUAY (TỐI ƯU 60 FPS) ── */}
      <div
        className="absolute pointer-events-none flex items-center justify-center transition-all duration-600 ease-out will-change-transform"
        style={{
          width: "110vh",
          height: "110vh",
          maxWidth: "110vh",
          maxHeight: "110vh",
          transform:
            phase === "loading"
              ? `translate3d(0, 0, 0) scale(0.68) rotate(0deg)`
              : phase === "swoosh"
              ? `translate3d(-25vw, 0, 0) scale(1.05) rotate(-22deg)`
              : `translate3d(-105vw, 0, 0) scale(1.18) rotate(-40deg)`,
          opacity: phase === "loading" ? 0.75 : phase === "swoosh" ? 0.75 : 0,
        }}
      >
        <GameModeHologramIcon
          mode={mode}
          size="110vh"
          isSpinning={true}
          isGiantWatermark={true}
          className="w-full h-full"
        />
      </div>

      {/* ── 4. LOGO 3D KÍNH TRUNG TÂM & THÔNG BÁO TIẾN TRÌNH KHỞI TẠO ĐẤU TRƯỜNG ── */}
      <div
        className="relative z-10 flex flex-col items-center justify-center text-center transition-all duration-450 ease-out"
        style={{
          transform:
            phase === "loading"
              ? "scale(1.15) translateY(0)"
              : phase === "swoosh"
              ? "scale(1.35) translateY(-8px)"
              : "scale(0.85) translateY(16px)",
          opacity: phase === "fadeout" ? 0 : 1,
        }}
      >
        {/* Khối Logo 3D Kính Quay Quay */}
        <div className="relative flex items-center justify-center">
          <GameModeHologramIcon
            mode={mode}
            size={180}
            isSpinning={true}
            className="drop-shadow-[0_15px_45px_rgba(6,182,212,0.9)]"
          />
        </div>

        {/* Tiêu đề & Thông báo Chuyển cảnh */}
        <div className="mt-8 space-y-2">
          <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-cyan-500/20 border border-cyan-400/40 text-cyan-300 font-mono text-xs font-black tracking-widest uppercase shadow-[0_0_15px_rgba(6,182,212,0.4)]">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            {isReady ? "KÍCH HOẠT ĐẤU TRƯỜNG" : "KHỞI ĐỘNG ĐẤU TRƯỜNG ARENA"}
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-cyan-200 to-purple-300 tracking-tight drop-shadow-md">
            {modeName || mode}
          </h2>
          <p className="text-xs text-slate-400 max-w-sm mx-auto font-medium">
            {isReady
              ? "Đấu trường đã sẵn sàng · Đang hé lộ giao diện thi đấu..."
              : "Đang kết nối hệ thống · Chuẩn bị giao diện màn chiếu & thiết bị..."}
          </p>
        </div>

        {/* Thanh tiến trình lượng tử */}
        <div className="mt-6 w-56 h-1.5 bg-white/10 rounded-full overflow-hidden border border-white/20 p-0.5 relative shadow-inner">
          <div
            className="h-full bg-gradient-to-r from-purple-500 via-cyan-400 to-emerald-400 rounded-full animate-shimmer-sweep"
            style={{ width: "100%" }}
          />
        </div>
      </div>
    </div>,
    document.body
  );
}
