"use client";

import React, { createContext, useContext, useState } from "react";
import { useRouter } from "next/navigation";

interface PortalContextType {
  navigateWithPortal: (targetUrl: string, portalName?: string) => void;
}

const PortalContext = createContext<PortalContextType>({
  navigateWithPortal: () => {},
});

export function useSciFiPortal() {
  return useContext(PortalContext);
}

export function SciFiPortalProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [isActive, setIsActive] = useState(false);
  const [label, setLabel] = useState("");

  const navigateWithPortal = (targetUrl: string, portalName?: string) => {
    setLabel(portalName || "Đang mở cổng kết nối...");
    setIsActive(true);

    // After blast doors finish sliding open (600ms), perform router transition
    setTimeout(() => {
      router.push(targetUrl);
      setTimeout(() => {
        setIsActive(false);
      }, 400);
    }, 600);
  };

  return (
    <PortalContext.Provider value={{ navigateWithPortal }}>
      {children}

      {/* Sci-Fi Double Sliding Blast Doors Overlay */}
      {isActive && (
        <div className="fixed inset-0 z-[9999] pointer-events-none flex overflow-hidden">
          {/* Left Door */}
          <div className="w-1/2 h-full bg-gradient-to-r from-[#060814] via-[#0d1228] to-[#161c3c] border-r-2 border-cyan-400 shadow-[0_0_40px_rgba(6,182,212,0.6)] animate-portal-door-left flex flex-col items-end justify-center pr-6">
            <div className="w-12 h-1 bg-cyan-400 rounded-full mb-2 shadow-[0_0_10px_#22d3ee]" />
            <div className="w-20 h-0.5 bg-purple-400 rounded-full" />
          </div>

          {/* Right Door */}
          <div className="w-1/2 h-full bg-gradient-to-l from-[#060814] via-[#0d1228] to-[#161c3c] border-l-2 border-cyan-400 shadow-[0_0_40px_rgba(6,182,212,0.6)] animate-portal-door-right flex flex-col items-start justify-center pl-6">
            <div className="w-12 h-1 bg-cyan-400 rounded-full mb-2 shadow-[0_0_10px_#22d3ee]" />
            <div className="w-20 h-0.5 bg-purple-400 rounded-full" />
          </div>

          {/* Central Portal Flash */}
          <div className="absolute inset-0 flex items-center justify-center animate-portal-flash">
            <div className="w-1 h-full bg-cyan-300 shadow-[0_0_100px_30px_rgba(6,182,212,0.9)]" />
            <div className="absolute px-6 py-3 rounded-2xl bg-[#090c1a]/90 border border-cyan-400/80 text-cyan-200 text-sm font-black tracking-widest uppercase shadow-2xl backdrop-blur-xl">
              ⚡ {label}
            </div>
          </div>
        </div>
      )}
    </PortalContext.Provider>
  );
}
