"use client";

import React, { useEffect, useState, useRef } from "react";
import { usePathname } from "next/navigation";
import Logo3DGyroscope from "@/components/ui/Logo3DGyroscope";

export default function GlobalPageTransition() {
  const pathname = usePathname();
  const [isTransitioning, setIsTransitioning] = useState(false);
  const prevPathRef = useRef(pathname);

  useEffect(() => {
    // Chỉ kích hoạt hiệu ứng khi thực sự chuyển đổi route
    if (prevPathRef.current !== pathname) {
      prevPathRef.current = pathname;
      setIsTransitioning(true);

      const timer = setTimeout(() => {
        setIsTransitioning(false);
      }, 420);

      return () => clearTimeout(timer);
    }
  }, [pathname]);

  if (!isTransitioning) return null;

  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 z-50 pointer-events-none flex flex-col items-center justify-center bg-[#090b16]/75 backdrop-blur-md transition-opacity duration-300 animate-fade-in select-none"
    >
      {/* 3D Holographic Gyroscope Logo quay bứt tốc 360° */}
      <div className="relative flex flex-col items-center justify-center">
        {/* Vầng hào quang quang học mở rộng */}
        <div className="absolute w-40 h-40 rounded-full bg-gradient-to-tr from-purple-600/35 via-cyan-500/30 to-transparent blur-2xl animate-pulse" />

        <Logo3DGyroscope size="xl" isWarping={true} className="drop-shadow-[0_0_30px_rgba(6,182,212,0.8)]" />

        {/* Thanh tiến trình lượng tử */}
        <div className="mt-6 flex flex-col items-center gap-1.5">
          <div className="w-36 h-1 rounded-full bg-purple-950/80 border border-purple-500/30 overflow-hidden relative shadow-inner">
            <div className="absolute inset-y-0 left-0 bg-gradient-to-r from-purple-500 via-cyan-400 to-purple-400 w-full animate-progress-indeterminate shadow-[0_0_8px_#22d3ee]" />
          </div>
          <span className="text-[10px] font-black tracking-widest text-cyan-300 uppercase opacity-90 font-mono">
            ARENA PORTAL WARP
          </span>
        </div>
      </div>
    </div>
  );
}
