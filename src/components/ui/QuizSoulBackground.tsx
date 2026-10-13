"use client";

import React from "react";

/**
 * QuizSoulBackground - Biểu tượng linh hồn đấu trường Quizorra bao trùm toàn bộ nền
 * Thần linh tri thức: Vầng hào quang Q-Aura kết hợp quỹ đạo thiên hà và tia lửa tinh anh.
 * Hiển thị mờ ảo (4% - 6% opacity) với nhịp thở nhẹ nhàng ambientSoulBreathe, tạo chiều sâu điện ảnh.
 */
export default function QuizSoulBackground() {
  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 pointer-events-none z-0 overflow-hidden flex items-center justify-center select-none"
    >
      {/* 1. Sàn đấu lưới không gian 3D viễn tưởng (3D Perspective Cyber Floor) */}
      <div className="cyber-arena-grid" />

      {/* 2. Các hạt bụi tinh tú lượng tử vũ trụ bay lơ lửng (Stardust Motes) */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="stardust-mote absolute top-[18%] left-[12%] w-2 h-2 rounded-full bg-cyan-400/80 shadow-[0_0_12px_#22d3ee]" style={{ animationDelay: "0s", animationDuration: "8s" }} />
        <div className="stardust-mote absolute top-[35%] right-[15%] w-2.5 h-2.5 rounded-full bg-purple-400/80 shadow-[0_0_14px_#c084fc]" style={{ animationDelay: "2.5s", animationDuration: "10s" }} />
        <div className="stardust-mote absolute bottom-[28%] left-[22%] w-1.5 h-1.5 rounded-full bg-cyan-300/70 shadow-[0_0_10px_#67e8f9]" style={{ animationDelay: "5s", animationDuration: "7.5s" }} />
        <div className="stardust-mote absolute bottom-[22%] right-[25%] w-2 h-2 rounded-full bg-fuchsia-400/80 shadow-[0_0_12px_#e879f9]" style={{ animationDelay: "1.2s", animationDuration: "9.5s" }} />
        <div className="stardust-mote absolute top-[60%] left-[8%] w-1.5 h-1.5 rounded-full bg-purple-300/70 shadow-[0_0_8px_#d8b4fe]" style={{ animationDelay: "3.8s", animationDuration: "11s" }} />
        <div className="stardust-mote absolute top-[75%] right-[10%] w-2 h-2 rounded-full bg-cyan-400/75 shadow-[0_0_12px_#22d3ee]" style={{ animationDelay: "6.2s", animationDuration: "8.5s" }} />
      </div>

      {/* 3. Vầng sáng tâm vũ trụ huyền bí đa tầng phát quang rực rỡ */}
      <div className="absolute w-[980px] h-[980px] rounded-full bg-gradient-to-tr from-purple-600/35 via-indigo-600/30 to-cyan-400/35 blur-[120px] animate-pulse" />
      <div className="absolute w-[600px] h-[600px] rounded-full bg-gradient-to-br from-cyan-400/30 via-fuchsia-600/30 to-purple-800/20 blur-[85px] animate-spin" style={{ animationDuration: "35s" }} />

      {/* 4. Vector Linh hồn Thần Linh Tri Thức bao trùm với độ sáng rõ nét cao (Nổi bật rực rỡ) */}
      <svg
        viewBox="0 0 1000 1000"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-[125vw] max-w-[1400px] h-auto text-purple-400 transition-opacity duration-1000 soul-breathe drop-shadow-[0_0_55px_rgba(168,85,247,0.65)]"
      >
        <defs>
          {/* Radial Aura Gradient - Sắc nét và lan tỏa mạnh mẽ */}
          <radialGradient id="soulAura" cx="500" cy="500" r="450" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#a855f7" stopOpacity="0.65" />
            <stop offset="35%" stopColor="#6366f1" stopOpacity="0.45" />
            <stop offset="65%" stopColor="#06b6d4" stopOpacity="0.30" />
            <stop offset="100%" stopColor="#090a12" stopOpacity="0" />
          </radialGradient>

          {/* Core Halo Gradient - Rực rỡ năng lượng */}
          <linearGradient id="soulRingGrad" x1="220" y1="160" x2="780" y2="720" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#e9d5ff" stopOpacity="0.95" />
            <stop offset="25%" stopColor="#c084fc" stopOpacity="0.88" />
            <stop offset="60%" stopColor="#818cf8" stopOpacity="0.75" />
            <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.9" />
          </linearGradient>

          {/* Tail Comet Gradient */}
          <linearGradient id="soulCometGrad" x1="500" y1="460" x2="810" y2="750" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.95" />
            <stop offset="50%" stopColor="#06b6d4" stopOpacity="0.75" />
            <stop offset="100%" stopColor="#0284c7" stopOpacity="0.1" />
          </linearGradient>
        </defs>

        {/* 1. Lớp hào quang bao bọc linh hồn */}
        <circle cx="500" cy="500" r="440" fill="url(#soulAura)" />

        {/* 2. Quỹ đạo thiên hà bao quanh (Outer Celestial Ring) */}
        <ellipse
          cx="500"
          cy="500"
          rx="430"
          ry="320"
          transform="rotate(-25 500 500)"
          stroke="#a855f7"
          strokeWidth="3"
          strokeDasharray="12 16"
          strokeOpacity="0.85"
        />

        <ellipse
          cx="500"
          cy="500"
          rx="460"
          ry="300"
          transform="rotate(35 500 500)"
          stroke="#38bdf8"
          strokeWidth="2.5"
          strokeDasharray="8 20"
          strokeOpacity="0.75"
        />

        {/* 3. Vòng khuyên Q-Aura vĩ đại của Thần Linh Tri Thức */}
        <g id="soul-core-emblem">
          {/* Vòng ngoài */}
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M 500 160 C 312.2 160 160 312.2 160 500 C 160 687.8 312.2 840 500 840 C 687.8 840 840 687.8 840 500 C 840 312.2 687.8 160 500 160 Z M 500 290 C 616 290 710 384 710 500 C 710 616 616 710 500 710 C 384 710 290 616 290 500 C 290 384 384 290 500 290 Z"
            fill="url(#soulRingGrad)"
          />

          {/* Đuôi sao chổi thiên đỉnh (Comet Tail of Knowledge) */}
          <path
            d="M 540 520 C 620 540 760 660 830 760 C 810 770 770 760 690 700 C 630 650 560 580 540 520 Z"
            fill="url(#soulCometGrad)"
          />

          {/* Vòm cung năng lượng bảo vệ bên dưới */}
          <path
            d="M 120 860 Q 500 770 880 860 Q 500 800 120 860 Z"
            fill="url(#soulRingGrad)"
            opacity="0.8"
          />

          {/* 4. Các điểm tinh tú tri thức đối xứng phát quang */}
          <circle cx="500" cy="110" r="8" fill="#ffffff" filter="drop-shadow(0 0 14px #c084fc)" />
          <circle cx="500" cy="890" r="7" fill="#e0f2fe" filter="drop-shadow(0 0 14px #38bdf8)" />
          <circle cx="110" cy="500" r="7" fill="#f5d0fe" filter="drop-shadow(0 0 14px #a855f7)" />
          <circle cx="890" cy="500" r="7" fill="#bae6fd" filter="drop-shadow(0 0 14px #06b6d4)" />
        </g>
      </svg>
    </div>
  );
}
