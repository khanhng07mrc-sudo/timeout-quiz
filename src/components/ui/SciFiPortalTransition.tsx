"use client";

import React, { createContext, useContext, useState } from "react";
import { useRouter } from "next/navigation";
import Logo3DGyroscope from "@/components/ui/Logo3DGyroscope";
import { soundManager } from "@/lib/sound-manager";

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
  const [isExiting, setIsExiting] = useState(false);
  const [label, setLabel] = useState("");

  const navigateWithPortal = (targetUrl: string, portalName?: string) => {
    setLabel(portalName ? `Đang kết nối: ${portalName}` : "Đang mở cổng không gian Quizorra...");
    setIsExiting(false);
    setIsActive(true);

    // Play Warp sound on primary game portals (Display / Admin / Play)
    const isMainPortal = /display|admin|play/i.test(targetUrl);
    if (isMainPortal) {
      try {
        soundManager.playPowerup();
      } catch {}
    }

    // 750ms Cinematic Pacing:
    // Phase 1: 350ms of 3D Gyroscope acceleration & quantum iris energy expansion
    setTimeout(() => {
      router.push(targetUrl);
      setIsExiting(true);

      // Phase 2: 400ms smooth dissolve fade-out into destination screen
      setTimeout(() => {
        setIsActive(false);
        setIsExiting(false);
      }, 400);
    }, 350);
  };

  return (
    <PortalContext.Provider value={{ navigateWithPortal }}>
      {children}

      {/* ── QUANTUM IRIS WARP OVERLAY (Zero Door Slits, Pure 3D Q Energy Portal) ── */}
      {isActive && (
        <div
          className={`fixed inset-0 z-[9999] pointer-events-none flex flex-col items-center justify-center overflow-hidden transition-opacity duration-400 ${
            isExiting ? "animate-quantum-fade-out" : "animate-quantum-iris-in"
          }`}
          style={{
            background: "radial-gradient(circle at center, rgba(16, 18, 42, 0.94) 0%, rgba(9, 11, 25, 0.97) 50%, rgba(4, 6, 15, 0.99) 100%)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
          }}
        >
          {/* Concentric Quantum Energy Rings */}
          <div className="absolute w-[280px] h-[280px] sm:w-[360px] sm:h-[360px] rounded-full border border-cyan-400/40 shadow-[0_0_60px_rgba(6,182,212,0.4)] animate-quantum-aura pointer-events-none" />
          <div
            className="absolute w-[440px] h-[440px] sm:w-[540px] sm:h-[540px] rounded-full border border-purple-500/30 shadow-[0_0_80px_rgba(168,85,247,0.3)] animate-quantum-aura pointer-events-none"
            style={{ animationDelay: "0.2s" }}
          />

          {/* Central Volumetric Core Glow */}
          <div className="absolute w-[300px] h-[300px] bg-gradient-to-tr from-cyan-500/20 via-purple-600/25 to-pink-500/20 rounded-full blur-[80px] pointer-events-none animate-pulse" />

          {/* Authentic 3D Gyroscope Q Logo */}
          <div className="relative z-20 flex flex-col items-center justify-center scale-110 sm:scale-125">
            <Logo3DGyroscope size="xl" isWarping={true} />

            {/* Subtle Elegant Caption beneath the Logo */}
            <div className="mt-8 flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-900/60 border border-cyan-500/30 backdrop-blur-md shadow-lg shadow-cyan-950/40">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
              <p className="text-xs font-semibold text-cyan-200 tracking-wider">
                {label}
              </p>
            </div>
          </div>
        </div>
      )}
    </PortalContext.Provider>
  );
}
