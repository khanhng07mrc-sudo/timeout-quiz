"use client";

import React, { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import Logo3DGyroscope from "@/components/ui/Logo3DGyroscope";

export default function GlobalPageTransition() {
  const pathname = usePathname();
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [mounted, setMounted] = useState(false);
  const prevPathRef = useRef(pathname);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    // Chỉ kích hoạt hiệu ứng khi thực sự chuyển đổi route
    if (prevPathRef.current !== pathname) {
      prevPathRef.current = pathname;
      setIsTransitioning(true);
      setIsClosing(false);

      // 150ms: Bắt đầu fadeout êm dịu
      const fadeoutTimer = setTimeout(() => {
        setIsClosing(true);
      }, 150);

      // 250ms: Kết thúc hoàn toàn (nhanh, nhạy, 60 FPS)
      const doneTimer = setTimeout(() => {
        setIsTransitioning(false);
        setIsClosing(false);
      }, 250);

      return () => {
        clearTimeout(fadeoutTimer);
        clearTimeout(doneTimer);
      };
    }
  }, [pathname]);

  if (!isTransitioning || !mounted || typeof document === "undefined") return null;

  return createPortal(
    <div
      aria-hidden="true"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        zIndex: 9999,
        willChange: "opacity",
      }}
      className={`pointer-events-none flex flex-col items-center justify-center bg-[#070914]/92 transition-opacity duration-150 select-none ${
        isClosing ? "opacity-0" : "opacity-100"
      }`}
    >
      {/* 3D Holographic Gyroscope Logo quay bứt tốc 360° (GPU accelerated) */}
      <div
        className="relative flex flex-col items-center justify-center transition-transform duration-150"
        style={{
          transform: isClosing ? "scale(0.92)" : "scale(1)",
        }}
      >
        <Logo3DGyroscope size="lg" isWarping={true} className="drop-shadow-[0_0_20px_rgba(6,182,212,0.7)]" />

        {/* Thanh tiến trình lượng tử */}
        <div className="mt-4 flex flex-col items-center gap-1">
          <div className="w-28 h-1 rounded-full bg-purple-950/80 border border-purple-500/30 overflow-hidden relative shadow-inner">
            <div className="absolute inset-y-0 left-0 bg-gradient-to-r from-purple-500 via-cyan-400 to-purple-400 w-full animate-progress-indeterminate shadow-[0_0_8px_#22d3ee]" />
          </div>
          <span className="text-[9px] font-black tracking-widest text-cyan-300 uppercase opacity-90 font-mono">
            ARENA PORTAL
          </span>
        </div>
      </div>
    </div>,
    document.body
  );
}
