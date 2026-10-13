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
      {/* Vầng sáng tâm vũ trụ huyền bí */}
      <div className="absolute w-[800px] h-[800px] rounded-full bg-gradient-to-tr from-purple-900/10 via-indigo-950/5 to-cyan-950/10 blur-[140px] animate-pulse" />

      {/* Vector Linh hồn Thần Linh Tri Thức bao trùm */}
      <svg
        viewBox="0 0 1000 1000"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-[120vw] max-w-[1300px] h-auto text-purple-400/20 opacity-40 transition-opacity duration-1000 soul-breathe"
      >
        <defs>
          {/* Radial Aura Gradient */}
          <radialGradient id="soulAura" cx="500" cy="500" r="450" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#a855f7" stopOpacity="0.25" />
            <stop offset="40%" stopColor="#6366f1" stopOpacity="0.12" />
            <stop offset="70%" stopColor="#06b6d4" stopOpacity="0.05" />
            <stop offset="100%" stopColor="#090a12" stopOpacity="0" />
          </radialGradient>

          {/* Core Halo Gradient */}
          <linearGradient id="soulRingGrad" x1="220" y1="160" x2="780" y2="720" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#c084fc" stopOpacity="0.35" />
            <stop offset="50%" stopColor="#818cf8" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.3" />
          </linearGradient>

          {/* Tail Comet Gradient */}
          <linearGradient id="soulCometGrad" x1="500" y1="460" x2="810" y2="750" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.35" />
            <stop offset="60%" stopColor="#06b6d4" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#0284c7" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* 1. Lớp hào quang bao bọc linh hồn */}
        <circle cx="500" cy="500" r="440" fill="url(#soulAura)" />

        {/* 2. Quỹ đạo thiên hà bao quanh (Outer Celestial Ring) */}
        <ellipse
          cx="500"
          cy="500"
          rx="420"
          ry="320"
          transform="rotate(-25 500 500)"
          stroke="#818cf8"
          strokeWidth="1.5"
          strokeDasharray="8 14"
          strokeOpacity="0.25"
        />

        <ellipse
          cx="500"
          cy="500"
          rx="450"
          ry="300"
          transform="rotate(35 500 500)"
          stroke="#38bdf8"
          strokeWidth="1"
          strokeDasharray="4 20"
          strokeOpacity="0.2"
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
            opacity="0.4"
          />

          {/* 4. Các điểm tinh tú tri thức đối xứng */}
          <circle cx="500" cy="110" r="5" fill="#c084fc" opacity="0.6" />
          <circle cx="500" cy="890" r="4" fill="#38bdf8" opacity="0.5" />
          <circle cx="110" cy="500" r="4" fill="#a855f7" opacity="0.5" />
          <circle cx="890" cy="500" r="4" fill="#06b6d4" opacity="0.5" />
        </g>
      </svg>
    </div>
  );
}
