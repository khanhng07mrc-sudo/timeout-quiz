"use client";

import React, { useId } from "react";

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
  const uid = useId().replace(/:/g, "_");

  const sizeMap = {
    sm: "w-8 h-8",
    md: "w-11 h-11",
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
        className="absolute inset-0 rounded-full border-[1.5px] border-cyan-400/70 shadow-[0_0_12px_rgba(6,182,212,0.6)] animate-gyro-outer pointer-events-none"
        style={{
          borderTopColor: "rgba(192, 132, 252, 0.95)",
          borderBottomColor: "rgba(6, 182, 212, 0.95)",
        }}
      >
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-cyan-100 shadow-[0_0_8px_#38bdf8]" />
      </div>

      {/* 2. VÒNG QUỸ ĐẠO THIÊN HÀ TRONG (Inner Orbit Ring) */}
      <div
        className="absolute inset-1 rounded-full border-[1.5px] border-purple-400/70 shadow-[0_0_12px_rgba(168,85,247,0.6)] animate-gyro-inner pointer-events-none"
        style={{
          borderLeftColor: "rgba(232, 121, 249, 0.95)",
          borderRightColor: "rgba(56, 189, 248, 0.95)",
        }}
      >
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-1.5 h-1.5 rounded-full bg-purple-100 shadow-[0_0_8px_#c084fc]" />
      </div>

      {/* 3. LÕI CHỮ Q 3D ĐẤU TRƯỜNG PHÁT SÁNG NỔI BẬT (3D Radiant Core) */}
      <div
        className="relative z-10 w-[78%] h-[78%] flex items-center justify-center animate-gyro-core"
        style={{ transformStyle: "preserve-3d" }}
      >
        <svg
          viewBox="0 0 200 200"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full drop-shadow-[0_0_12px_rgba(56,189,248,0.85)] filter drop-shadow-[0_0_20px_rgba(168,85,247,0.7)]"
        >
          <defs>
            <linearGradient id={`qGrad_${uid}`} x1="30" y1="20" x2="170" y2="160" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="20%" stopColor="#c084fc" />
              <stop offset="55%" stopColor="#38bdf8" />
              <stop offset="100%" stopColor="#00f2fe" />
            </linearGradient>
            <linearGradient id={`tailGrad_${uid}`} x1="90" y1="80" x2="170" y2="160" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#e0f2fe" />
              <stop offset="35%" stopColor="#38bdf8" />
              <stop offset="80%" stopColor="#06b6d4" />
              <stop offset="100%" stopColor="#0284c7" />
            </linearGradient>
            <linearGradient id={`strokeGrad_${uid}`} x1="30" y1="20" x2="170" y2="160" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#f5d0fe" />
              <stop offset="50%" stopColor="#38bdf8" />
              <stop offset="100%" stopColor="#00f2fe" />
            </linearGradient>
          </defs>

          {/* Vành Q 3D Phát quang nổi bật */}
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M 100 32 C 69.07 32 44 57.07 44 88 C 44 118.93 69.07 144 100 144 C 130.93 144 156 118.93 156 88 C 156 57.07 130.93 32 100 32 Z M 100 60 C 115.46 60 128 72.54 128 88 C 128 103.46 115.46 116 100 116 C 84.54 116 72 103.46 72 88 C 72 72.54 84.54 60 100 60 Z"
            fill={`url(#qGrad_${uid})`}
            stroke={`url(#strokeGrad_${uid})`}
            strokeWidth="3.5"
            strokeLinejoin="round"
          />

          {/* Đuôi sao chổi 3D góc vát sắc nét */}
          <path
            d="M 116 87 A 14 14 0 0 0 97 106 L 138 147 A 16 16 0 0 0 160 125 Z"
            fill={`url(#tailGrad_${uid})`}
            stroke="#e0f2fe"
            strokeWidth="2"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </div>
  );
}
