"use client";

import React from "react";
import { GameMode } from "@/types";
import GameModeIcon from "@/components/ui/GameModeIcon";

interface Props {
  mode: GameMode | string;
  size?: number | string; // pixels hoặc css size (e.g. "110vh", 64, 120)
  isSpinning?: boolean;
  isGiantWatermark?: boolean; // Khi làm watermark 110% trong suốt
  className?: string;
  style?: React.CSSProperties;
}

const MODE_CONFIG: Record<
  string,
  {
    name: string;
    neonColor: string;
    auraGrad: string;
    ringColor: string;
    subGlow: string;
  }
> = {
  CLASSIC: {
    name: "Classic Đấu Trường",
    neonColor: "#a855f7",
    auraGrad: "from-purple-600/40 via-indigo-600/30 to-transparent",
    ringColor: "#c084fc",
    subGlow: "rgba(168, 85, 247, 0.7)",
  },
  BUZZ: {
    name: "Bấm Chuông Nhanh",
    neonColor: "#f59e0b",
    auraGrad: "from-amber-500/40 via-yellow-500/30 to-transparent",
    ringColor: "#fde047",
    subGlow: "rgba(245, 158, 11, 0.7)",
  },
  BOUNCEBACK: {
    name: "Cướp Điểm Luân Phiên",
    neonColor: "#06b6d4",
    auraGrad: "from-cyan-500/40 via-sky-500/30 to-transparent",
    ringColor: "#67e8f9",
    subGlow: "rgba(6, 182, 212, 0.7)",
  },
  ELIMINATION: {
    name: "Sinh Tồn Khắc Nghiệt",
    neonColor: "#ef4444",
    auraGrad: "from-rose-600/40 via-red-600/30 to-transparent",
    ringColor: "#fca5a5",
    subGlow: "rgba(239, 68, 68, 0.7)",
  },
  TOURNAMENT: {
    name: "Tournament 1v1",
    neonColor: "#eab308",
    auraGrad: "from-yellow-500/40 via-amber-600/30 to-transparent",
    ringColor: "#fef08a",
    subGlow: "rgba(234, 179, 8, 0.7)",
  },
  GRID_CARO: {
    name: "Lưới Chọn Ô & Caro",
    neonColor: "#10b981",
    auraGrad: "from-emerald-500/40 via-teal-600/30 to-transparent",
    ringColor: "#6ee7b7",
    subGlow: "rgba(16, 185, 129, 0.7)",
  },
  DICE_RACE: {
    name: "Đua Cờ Xí Ngầu",
    neonColor: "#6366f1",
    auraGrad: "from-indigo-500/40 via-purple-600/30 to-transparent",
    ringColor: "#a5b4fc",
    subGlow: "rgba(99, 102, 241, 0.7)",
  },
  WAGER: {
    name: "Cược Điểm Bí Mật",
    neonColor: "#f97316",
    auraGrad: "from-orange-500/40 via-amber-600/30 to-transparent",
    ringColor: "#fed7aa",
    subGlow: "rgba(249, 115, 22, 0.7)",
  },
  MYSTERY_QUEST: {
    name: "Hành Trình Bí Ẩn",
    neonColor: "#d946ef",
    auraGrad: "from-fuchsia-600/40 via-purple-600/30 to-transparent",
    ringColor: "#f5d0fe",
    subGlow: "rgba(217, 70, 239, 0.7)",
  },
};

export default function GameModeHologramIcon({
  mode,
  size = 120,
  isSpinning = true,
  isGiantWatermark = false,
  className = "",
  style = {},
}: Props) {
  const upperMode = (mode || "CLASSIC").toUpperCase();
  const config = MODE_CONFIG[upperMode] || MODE_CONFIG.CLASSIC;

  // Tính toán kích thước
  const dimensionStyle =
    typeof size === "number"
      ? { width: `${size}px`, height: `${size}px` }
      : { width: size, height: size };

  return (
    <div
      className={`relative flex items-center justify-center select-none ${className}`}
      style={{
        ...dimensionStyle,
        ...style,
        perspective: "1200px",
      }}
    >
      {/* ── 1. Vầng Hào Quang Quang Học Đa Tầng (Holographic Ambient Aura) ── */}
      <div
        className={`absolute inset-[-15%] rounded-full bg-gradient-to-tr ${config.auraGrad} blur-3xl pointer-events-none ${
          isGiantWatermark ? "opacity-35" : "opacity-85 animate-pulse"
        }`}
      />

      {/* ── 2. Khung Quỹ Đạo Thiên Hà 3D Xoay Quanh Trục (3D Gyroscope Rings) ── */}
      <div
        className={`absolute inset-0 pointer-events-none flex items-center justify-center ${
          isSpinning ? "rotate-3d-glass" : ""
        }`}
        style={{ transformStyle: "preserve-3d" }}
      >
        {/* Vòng quỹ đạo thứ 1 (Nghiêng góc dương) */}
        <svg
          viewBox="0 0 200 200"
          className="absolute w-[118%] h-[118%] pointer-events-none"
          style={{
            transform: "rotateX(65deg) rotateY(18deg)",
            opacity: isGiantWatermark ? 0.35 : 0.85,
            filter: `drop-shadow(0 0 12px ${config.subGlow})`,
          }}
        >
          <ellipse
            cx="100"
            cy="100"
            rx="92"
            ry="92"
            fill="none"
            stroke={config.ringColor}
            strokeWidth={isGiantWatermark ? "3" : "2"}
            strokeDasharray="18 12 6 12"
          />
          {/* Hạt photon chạy trên quỹ đạo */}
          <circle cx="192" cy="100" r="3.5" fill="#ffffff" />
        </svg>

        {/* Vòng quỹ đạo thứ 2 (Nghiêng góc âm ngược pha) */}
        <svg
          viewBox="0 0 200 200"
          className="absolute w-[124%] h-[124%] pointer-events-none"
          style={{
            transform: "rotateX(-58deg) rotateY(-22deg)",
            opacity: isGiantWatermark ? 0.3 : 0.75,
            filter: `drop-shadow(0 0 14px ${config.subGlow})`,
          }}
        >
          <ellipse
            cx="100"
            cy="100"
            rx="96"
            ry="96"
            fill="none"
            stroke="#ffffff"
            strokeWidth="1.5"
            strokeDasharray="24 16"
          />
          <circle cx="8" cy="100" r="3" fill={config.neonColor} />
        </svg>
      </div>

      {/* ── 3. Lõi Biểu Tượng Kính 3D Đột Phá (Holographic 3D Glass Emblem) ── */}
      <div
        className={`relative flex items-center justify-center rounded-3xl transition-transform ${
          isSpinning ? "rotate-3d-glass-fast" : ""
        } ${
          isGiantWatermark
            ? "bg-transparent backdrop-blur-[2px] opacity-35"
            : "bg-[#111428]/60 backdrop-blur-md p-3.5 shadow-2xl border border-white/20"
        }`}
        style={{
          width: "78%",
          height: "78%",
          transformStyle: "preserve-3d",
          boxShadow: isGiantWatermark
            ? "none"
            : `0 15px 35px -5px ${config.subGlow}, inset 0 2px 4px rgba(255,255,255,0.4)`,
        }}
      >
        {/* Phản xạ kính quang học (Glass Specular Sheen) */}
        {!isGiantWatermark && (
          <div className="absolute inset-0 rounded-3xl bg-gradient-to-tr from-white/25 via-transparent to-transparent pointer-events-none" />
        )}

        {/* Vector SVG biểu tượng gốc của Mode */}
        <GameModeIcon
          mode={upperMode}
          className="w-full h-full drop-shadow-[0_8px_20px_rgba(0,0,0,0.85)]"
        />
      </div>
    </div>
  );
}
