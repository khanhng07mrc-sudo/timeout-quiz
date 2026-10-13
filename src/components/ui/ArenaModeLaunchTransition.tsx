"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { GameMode } from "@/types";
import { transitionSoundEngine } from "@/lib/audio/transitionSoundEngine";

interface Props {
  isOpen: boolean;
  isReady?: boolean; // Bật true khi bàn đấu Arena ngầm đã được mount và sẵn sàng 100%
  mode: GameMode | string;
  modeName?: string;
  sourceRect?: { top: number; left: number; width: number; height: number } | null;
  onComplete?: () => void;
}

const getModeVideoPath = (m: string) => {
  const norm = (m || "CLASSIC").toUpperCase();
  if (norm.includes("CARO")) return "/transitions/grid_caro.webm";
  if (norm.includes("MYSTERY") || norm.includes("QUEST")) return "/transitions/mystery_quest.webm";
  if (norm.includes("BUZZ") || norm.includes("SPEED") || norm.includes("RACE")) return "/transitions/speed_race.webm";
  if (norm.includes("TOWER") || norm.includes("DEFENSE") || norm.includes("ELIMINATION")) return "/transitions/tower_defense.webm";
  if (norm.includes("BATTLE") || norm.includes("ROYALE") || norm.includes("TOURNAMENT")) return "/transitions/battle_royale.webm";
  if (norm.includes("BOSS") || norm.includes("RAID")) return "/transitions/boss_raid.webm";
  if (norm.includes("GOLD") || norm.includes("MINE") || norm.includes("WAGER")) return "/transitions/gold_mine.webm";
  if (norm.includes("AUCTION") || norm.includes("STEALTH") || norm.includes("DICE")) return "/transitions/auction_stealth.webm";
  return "/transitions/classic.webm";
};

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
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const openTimestampRef = useRef<number>(0);
  const timerOutroRef = useRef<NodeJS.Timeout | null>(null);
  const timerDoneRef = useRef<NodeJS.Timeout | null>(null);
  const timerFallbackRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const triggerOutro = useCallback(() => {
    if (phase === "outro") return;
    setPhase("outro");
    timerDoneRef.current = setTimeout(() => {
      setPhase("idle");
      if (onCompleteRef.current) {
        onCompleteRef.current();
      }
    }, 280);
  }, [phase]);

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

    // Phát âm thanh Web Audio API độc bản không cần tải file ngoài
    transitionSoundEngine.playTransitionSfx(String(mode));

    // Thử phát video ngay lập tức
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch(() => {});
    }

    // Tự động kết thúc sau 1.15s (đồng bộ hoàn hảo với độ dài video)
    timerOutroRef.current = setTimeout(() => {
      triggerOutro();
    }, 1150);

    // Fallback an toàn: Nếu có sự cố bất ngờ thì giải phóng sau 5s
    timerFallbackRef.current = setTimeout(() => {
      triggerOutro();
    }, 5000);

    return () => {
      if (timerOutroRef.current) clearTimeout(timerOutroRef.current);
      if (timerFallbackRef.current) clearTimeout(timerFallbackRef.current);
    };
  }, [isOpen, mode, triggerOutro]);

  if (!isOpen && phase === "idle") return null;
  if (!mounted || typeof document === "undefined") return null;

  const currentMode = String(mode || "CLASSIC").toUpperCase();
  const isOutro = phase === "outro";
  const videoSrc = getModeVideoPath(currentMode);

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

  const isTakeoff = phase === "loading" || phase === "outro";

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
      className={`pointer-events-none overflow-hidden flex items-center justify-center select-none transition-opacity duration-300 ${
        isOutro ? "opacity-0" : "opacity-100"
      }`}
    >
      {/* ── 1. MÀN CHE ĐEN TUYỀN SOLID 100% (Khử sạch hoàn toàn chữ và thẻ bên dưới) ── */}
      <div
        className={`absolute inset-0 bg-[#04050d] transition-opacity duration-300 ease-out will-change-transform ${
          isOutro ? "opacity-0" : "opacity-100"
        }`}
      />

      {/* ── 2. VẦNG HÀO QUANG RADIAL AURA TRUNG TÂM (Tôn vinh video 1080p điện ảnh) ── */}
      <div
        className={`absolute inset-0 pointer-events-none transition-opacity duration-400 ${
          isOutro ? "opacity-0" : "opacity-100"
        }`}
        style={{
          background:
            "radial-gradient(circle at 50% 48%, rgba(6,182,212,0.18) 0%, rgba(147,51,234,0.09) 35%, rgba(4,5,13,0.95) 70%, #04050d 100%)",
        }}
      />

      {/* ── 3. VIDEO WEBM 1080P GIẢI MÃ PHẦN CỨNG (0% WEBGPU OVERHEAD, 0% CRASH TAB) ── */}
      <div
        className="absolute inset-0 pointer-events-none flex items-center justify-center will-change-transform"
        style={{
          transform: isTakeoff
            ? "translate3d(0, 0, 0) scale(1)"
            : `translate3d(${deltaX}px, ${deltaY}px, 0) scale(0.18)`,
          transition: "transform 260ms cubic-bezier(0.16, 1, 0.3, 1), opacity 280ms ease-out",
          opacity: isOutro ? 0 : 1,
        }}
      >
        <video
          ref={videoRef}
          src={videoSrc}
          autoPlay
          muted
          playsInline
          preload="auto"
          onEnded={triggerOutro}
          className="w-full h-full object-cover pointer-events-none drop-shadow-[0_0_50px_rgba(6,182,212,0.4)]"
        />
      </div>

      {/* ── 4. CYAN WARP FLASH BURST (200ms hé lộ bàn đấu mượt mà, triệt tiêu giật hình) ── */}
      <div
        className={`absolute inset-0 pointer-events-none transition-opacity duration-250 ${
          isOutro ? "opacity-35 bg-cyan-300" : "opacity-0"
        }`}
      />

      {/* ── 5. THÔNG TIN TIÊU ĐỀ & TIẾN TRÌNH KHỞI TẠO ĐẤU TRƯỜNG CHUẨN ESPORTS ── */}
      <div
        className="absolute bottom-12 sm:bottom-16 z-20 flex flex-col items-center justify-center text-center transition-all duration-300 ease-out will-change-transform pointer-events-none max-w-md mx-auto px-4"
        style={{
          transform: isOutro ? "scale(0.9) translateY(12px)" : "scale(1) translateY(0)",
          opacity: isOutro ? 0 : 1,
        }}
      >
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-cyan-500/15 border border-cyan-400/50 text-cyan-300 font-mono text-[11px] font-black tracking-widest uppercase shadow-[0_0_20px_rgba(6,182,212,0.35)] backdrop-blur-md">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
          {isOutro ? "MỞ CỔNG ĐẤU TRƯỜNG" : "KHỞI ĐỘNG ĐẤU TRƯỜNG ARENA"}
        </div>
        <h2 className="mt-2 text-3xl sm:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-cyan-100 to-purple-200 tracking-tight drop-shadow-[0_4px_24px_rgba(34,211,238,0.4)]">
          {modeName || currentMode}
        </h2>
        <p className="mt-1 text-xs text-slate-400 font-medium tracking-wide">
          {isOutro
            ? "Bàn đấu đã sẵn sàng · Đang mở màn hé lộ giao diện thi đấu..."
            : "Đang kết nối hệ thống · Chuẩn bị màn chiếu & thiết bị thí sinh..."}
        </p>

        {/* Thanh tiến trình lượng tử sắc nét */}
        <div className="mt-3.5 w-56 h-1.5 bg-white/10 rounded-full overflow-hidden border border-white/20 p-0.5 relative shadow-[0_0_15px_rgba(6,182,212,0.2)]">
          <div
            className={`h-full bg-gradient-to-r from-purple-500 via-cyan-400 to-emerald-400 rounded-full transition-all ${
              isOutro ? "w-full duration-150" : "w-3/4 animate-pulse duration-500"
            }`}
          />
        </div>
      </div>
    </div>,
    document.body
  );
}
