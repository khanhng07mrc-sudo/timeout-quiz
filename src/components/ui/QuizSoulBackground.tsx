"use client";

import React from "react";

/**
 * QuizSoulBackground - Nền Dark Cyber Esports tối giản & dịu mắt (Zero-Lag, Eye-Friendly)
 * - Tối ưu 100% cho GPU điện thoại & trình duyệt: 0% CPU, không spin, không pulse, không drop-shadow nặng
 * - Không gây mỏi mắt hay giật hình khi thi đấu thời gian dài
 */
export default function QuizSoulBackground() {
  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 pointer-events-none z-0 overflow-hidden flex items-center justify-center select-none"
    >
      {/* 1. Lớp Vignette chiều sâu tĩnh, dịu mắt, chuyển tông đen mượt mà */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(circle at 50% 40%, rgba(88, 28, 135, 0.08) 0%, rgba(15, 23, 42, 0.4) 45%, #090a12 90%)",
        }}
      />

      {/* 2. Biểu tượng Linh hồn tri thức Q-Emblem mờ ảo tĩnh (Static Subtle Emblem, 0% GPU Repaint) */}
      <svg
        viewBox="0 0 1000 1000"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-[110vw] max-w-[1100px] h-auto text-purple-400 opacity-[0.04] pointer-events-none"
      >
        <defs>
          <linearGradient id="soulRingGradStatic" x1="220" y1="160" x2="780" y2="720" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#c084fc" />
            <stop offset="50%" stopColor="#818cf8" />
            <stop offset="100%" stopColor="#38bdf8" />
          </linearGradient>
          <linearGradient id="soulCometGradStatic" x1="500" y1="460" x2="810" y2="750" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#38bdf8" />
            <stop offset="100%" stopColor="#0284c7" />
          </linearGradient>
        </defs>

        {/* Quỹ đạo thiên hà bao quanh */}
        <ellipse
          cx="500"
          cy="500"
          rx="430"
          ry="320"
          transform="rotate(-25 500 500)"
          stroke="#a855f7"
          strokeWidth="1.5"
          strokeDasharray="12 16"
        />
        <ellipse
          cx="500"
          cy="500"
          rx="460"
          ry="300"
          transform="rotate(35 500 500)"
          stroke="#38bdf8"
          strokeWidth="1.5"
          strokeDasharray="8 20"
        />

        {/* Vòng khuyên Q-Aura vĩ đại của Thần Linh Tri Thức */}
        <g id="soul-core-emblem-static">
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M 500 160 C 312.2 160 160 312.2 160 500 C 160 687.8 312.2 840 500 840 C 687.8 840 840 687.8 840 500 C 840 312.2 687.8 160 500 160 Z M 500 290 C 616 290 710 384 710 500 C 710 616 616 710 500 710 C 384 710 290 616 290 500 C 290 384 384 290 500 290 Z"
            fill="url(#soulRingGradStatic)"
          />
          <path
            d="M 540 520 C 620 540 760 660 830 760 C 810 770 770 760 690 700 C 630 650 560 580 540 520 Z"
            fill="url(#soulCometGradStatic)"
          />
          <path
            d="M 120 860 Q 500 770 880 860 Q 500 800 120 860 Z"
            fill="url(#soulRingGradStatic)"
            opacity="0.6"
          />
        </g>
      </svg>
    </div>
  );
}
