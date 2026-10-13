"use client";

import React from "react";

interface Props {
  size?: "sm" | "md" | "lg" | "xl";
  isWarping?: boolean;
  className?: string;
}

export default function Logo3DGyroscope({
  size = "md",
  isWarping = false,
  className = "",
}: Props) {
  const sizeMap = {
    sm: "w-8 h-8",
    md: "w-12 h-12",
    lg: "w-16 h-16",
    xl: "w-24 h-24 sm:w-28 sm:h-28",
  };

  return (
    <div
      className={`relative inline-flex items-center justify-center select-none ${sizeMap[size]} ${
        isWarping ? "animate-gyro-warp" : ""
      } ${className}`}
      style={{ perspective: "800px", transformStyle: "preserve-3d" }}
    >
      {/* 1. VÒNG QUỸ ĐẠO THIÊN HÀ NGOÀI (Outer Orbit Ring) */}
      <div
        className="absolute inset-0 rounded-full border-[1.5px] border-cyan-400/60 shadow-[0_0_12px_rgba(6,182,212,0.6)] animate-gyro-outer pointer-events-none"
        style={{
          borderTopColor: "rgba(168, 85, 247, 0.9)",
          borderBottomColor: "rgba(6, 182, 212, 0.9)",
        }}
      >
        {/* Tinh tú trên vòng ngoài */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-cyan-200 shadow-[0_0_8px_#38bdf8]" />
      </div>

      {/* 2. VÒNG QUỸ ĐẠO THIÊN HÀ TRONG (Inner Orbit Ring) */}
      <div
        className="absolute inset-1.5 rounded-full border-[1.5px] border-purple-400/60 shadow-[0_0_12px_rgba(168,85,247,0.6)] animate-gyro-inner pointer-events-none"
        style={{
          borderLeftColor: "rgba(192, 132, 252, 0.9)",
          borderRightColor: "rgba(56, 189, 248, 0.9)",
        }}
      >
        {/* Tinh tú trên vòng trong */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-1.5 h-1.5 rounded-full bg-purple-200 shadow-[0_0_8px_#c084fc]" />
      </div>

      {/* 3. LÕI CHỮ Q 3D ĐẤU TRƯỜNG (3D Core Hologram) */}
      <div
        className="relative z-10 w-3/4 h-3/4 flex items-center justify-center animate-gyro-core"
        style={{ transformStyle: "preserve-3d" }}
      >
        <svg
          viewBox="0 0 200 200"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full drop-shadow-[0_0_15px_rgba(168,85,247,0.7)]"
        >
          <defs>
            <linearGradient id="gyroQGrad" x1="40" y1="30" x2="160" y2="150" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#e9d5ff" />
              <stop offset="25%" stopColor="#c084fc" />
              <stop offset="60%" stopColor="#38bdf8" />
              <stop offset="100%" stopColor="#00f2fe" />
            </linearGradient>
            <linearGradient id="gyroTailGrad" x1="100" y1="90" x2="160" y2="150" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#38bdf8" />
              <stop offset="60%" stopColor="#06b6d4" />
              <stop offset="100%" stopColor="#0284c7" />
            </linearGradient>
          </defs>

          {/* Khối 3D Đáy tối */}
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M 100 32 C 69.07 32 44 57.07 44 88 C 44 118.93 69.07 144 100 144 C 130.93 144 156 118.93 156 88 C 156 57.07 130.93 32 100 32 Z M 100 58 C 116.57 58 130 71.43 130 88 C 130 104.57 116.57 118 100 118 C 83.43 118 70 104.57 70 88 C 70 71.43 83.43 58 100 58 Z"
            transform="translate(0, 4)"
            fill="#1e103d"
          />

          {/* Vành Q 3D Hologram sáng */}
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M 100 32 C 69.07 32 44 57.07 44 88 C 44 118.93 69.07 144 100 144 C 130.93 144 156 118.93 156 88 C 156 57.07 130.93 32 100 32 Z M 100 58 C 116.57 58 130 71.43 130 88 C 130 104.57 116.57 118 100 118 C 83.43 118 70 104.57 70 88 C 70 71.43 83.43 58 100 58 Z"
            fill="url(#gyroQGrad)"
          />

          {/* Đuôi sao chổi 3D */}
          <path
            d="M 116.32 87.24 A 13 13 0 0 0 98.68 105.76 L 138.61 146.93 A 15 15 0 0 0 159.39 125.07 Z"
            transform="translate(0, 4)"
            fill="#09223d"
          />
          <path
            d="M 116.32 87.24 A 13 13 0 0 0 98.68 105.76 L 138.61 146.93 A 15 15 0 0 0 159.39 125.07 Z"
            fill="url(#gyroTailGrad)"
          />
        </svg>
      </div>
    </div>
  );
}
