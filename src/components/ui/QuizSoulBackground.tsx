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

      {/* 2. Tia laser quét quang học nhịp nhàng */}
      <div className="cyber-scanline" />

      {/* 3. Vầng sáng tâm vũ trụ huyền bí đa tầng phát quang */}
      <div className="absolute w-[950px] h-[950px] rounded-full bg-gradient-to-tr from-purple-700/25 via-indigo-600/20 to-cyan-500/25 blur-[140px] animate-pulse" />
      <div className="absolute w-[520px] h-[520px] rounded-full bg-gradient-to-br from-cyan-400/20 via-fuchsia-600/20 to-transparent blur-[95px] animate-spin" style={{ animationDuration: "35s" }} />

      {/* 4. Vector Linh hồn Thần Linh Tri Thức bao trùm với độ sáng rõ nét cao (75-80%) */}
      <svg
        viewBox="0 0 1000 1000"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-[125vw] max-w-[1400px] h-auto text-purple-400 transition-opacity duration-1000 soul-breathe drop-shadow-[0_0_35px_rgba(168,85,247,0.35)]"
      >
        <defs>
          {/* Radial Aura Gradient - Sắc nét và lan tỏa */}
          <radialGradient id="soulAura" cx="500" cy="500" r="450" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#a855f7" stopOpacity="0.45" />
            <stop offset="35%" stopColor="#6366f1" stopOpacity="0.30" />
            <stop offset="65%" stopColor="#06b6d4" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#090a12" stopOpacity="0" />
          </radialGradient>

          {/* Core Halo Gradient - Rực rỡ năng lượng */}
          <linearGradient id="soulRingGrad" x1="220" y1="160" x2="780" y2="720" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#c084fc" stopOpacity="0.75" />
            <stop offset="45%" stopColor="#818cf8" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.70" />
          </linearGradient>

          {/* Tail Comet Gradient */}
          <linearGradient id="soulCometGrad" x1="500" y1="460" x2="810" y2="750" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.85" />
            <stop offset="50%" stopColor="#06b6d4" stopOpacity="0.50" />
            <stop offset="100%" stopColor="#0284c7" stopOpacity="0.05" />
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
          stroke="#818cf8"
          strokeWidth="2.5"
          strokeDasharray="10 16"
          strokeOpacity="0.65"
        />

        <ellipse
          cx="500"
          cy="500"
          rx="460"
          ry="300"
          transform="rotate(35 500 500)"
          stroke="#38bdf8"
          strokeWidth="2"
          strokeDasharray="6 22"
          strokeOpacity="0.55"
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
            opacity="0.65"
          />

          {/* 4. Các điểm tinh tú tri thức đối xứng phát quang */}
          <circle cx="500" cy="110" r="7" fill="#e9d5ff" filter="drop-shadow(0 0 8px #c084fc)" />
          <circle cx="500" cy="890" r="6" fill="#bae6fd" filter="drop-shadow(0 0 8px #38bdf8)" />
          <circle cx="110" cy="500" r="6" fill="#f0abfc" filter="drop-shadow(0 0 8px #a855f7)" />
          <circle cx="890" cy="500" r="6" fill="#a5f3fc" filter="drop-shadow(0 0 8px #06b6d4)" />
        </g>
      </svg>
    </div>
  );
}
