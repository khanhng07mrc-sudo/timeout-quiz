"use client";

import React, { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { GameMode } from "@/types";
import GameModeHologramIcon from "@/components/ui/GameModeHologramIcon";

interface Props {
  isOpen: boolean;
  mode: GameMode | string;
  modeName?: string;
  sourceRect?: { top: number; left: number; width: number; height: number } | null;
  onComplete?: () => void;
}

export default function ArenaModeLaunchTransition({
  isOpen,
  mode,
  modeName,
  sourceRect,
  onComplete,
}: Props) {
  const [mounted, setMounted] = useState(false);
  const [phase, setPhase] = useState<"idle" | "expand" | "swoosh" | "fadeout">("idle");
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      setPhase("idle");
      return;
    }

    // Giai đoạn 1: Bắt đầu từ toạ độ sourceRect (icon card), bay ra tâm & biến thành 3D kính (0 - 380ms)
    setPhase("expand");

    // Giai đoạn 2 (380ms): Biến thành Logo 3D kính khổng lồ 110% chiều cao màn hình, vừa quay vừa lướt qua (380 - 850ms)
    // Tại mốc 500-550ms: Giao diện bàn đấu bên dưới đã nạp ngầm hoàn tất
    const swooshTimer = setTimeout(() => {
      setPhase("swoosh");
    }, 380);

    // Giai đoạn 3 (850ms): Vén màn mượt mà để lộ bàn đấu ngầm đã sẵn sàng 100% bên dưới
    const fadeoutTimer = setTimeout(() => {
      setPhase("fadeout");
    }, 850);

    // Giai đoạn 4 (1200ms): Hoàn tất chuyển cảnh (Cinematic 1.2s)
    const doneTimer = setTimeout(() => {
      setPhase("idle");
      if (onCompleteRef.current) {
        onCompleteRef.current();
      }
    }, 1200);

    return () => {
      clearTimeout(swooshTimer);
      clearTimeout(fadeoutTimer);
      clearTimeout(doneTimer);
    };
  }, [isOpen]);

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
      className={`pointer-events-none overflow-hidden flex items-center justify-center transition-opacity duration-350 select-none ${
        phase === "fadeout" ? "opacity-0" : "opacity-100"
      }`}
    >
      {/* ── 1. Màn Che Lượng Tử Không Gian (Backdrop Không Dùng Blur Nặng) ── */}
      <div
        className={`absolute inset-0 bg-[#070814]/94 transition-opacity duration-400 ${
          phase === "expand"
            ? "opacity-90"
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
            "linear-gradient(90deg, transparent 0%, rgba(168, 85, 247, 0.2) 35%, rgba(6, 182, 212, 0.4) 50%, rgba(255, 255, 255, 0.7) 52%, rgba(6, 182, 212, 0.4) 54%, transparent 100%)",
        }}
      />

      {/* ── 3. LOGO 3D KÍNH KHỔNG LỒ 110% CHIỀU CAO MÀN HÌNH CHẠY QUA & QUAY (TỐI ƯU 60 FPS) ── */}
      {/* Kích thước 110vh, will-change: transform kích hoạt GPU độc lập, không dùng filter nặng */}
      <div
        className="absolute pointer-events-none flex items-center justify-center transition-all duration-600 ease-out will-change-transform"
        style={{
          width: "110vh",
          height: "110vh",
          maxWidth: "110vh",
          maxHeight: "110vh",
          transform:
            phase === "expand"
              ? `translate3d(0, 0, 0) scale(0.68) rotate(0deg)`
              : phase === "swoosh"
              ? `translate3d(-25vw, 0, 0) scale(1.05) rotate(-22deg)`
              : `translate3d(-105vw, 0, 0) scale(1.18) rotate(-40deg)`,
          opacity: phase === "expand" ? 0.85 : phase === "swoosh" ? 0.75 : 0,
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

      {/* ── 4. LOGO 3D KÍNH TRUNG TÂM PHÓNG TO TỪ VỊ TRÍ 2D CỦA CARD MODE ── */}
      <div
        className="relative z-10 flex flex-col items-center justify-center text-center transition-all duration-450 ease-out"
        style={{
          transform:
            phase === "expand"
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
            KHỞI ĐỘNG ĐẤU TRƯỜNG ARENA
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-cyan-200 to-purple-300 tracking-tight drop-shadow-md">
            {modeName || mode}
          </h2>
          <p className="text-xs text-slate-400 max-w-sm mx-auto font-medium">
            Đang kích hoạt môi trường thi đấu · Chuẩn bị giao diện màn chiếu & thiết bị
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
