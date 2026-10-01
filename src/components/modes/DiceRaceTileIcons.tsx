"use client";

import React from "react";

interface TileIconProps {
  type: string;
  className?: string;
  size?: number;
}

/**
 * Rich illustrated SVG icons for Board Game Dice Race tiles
 * Replaces plain emojis with vibrant, game-grade icons
 */
export default function DiceRaceTileIcon({ type, className = "", size = 28 }: TileIconProps) {
  switch (type) {
    case "BOOST": // 🚀 Tên lửa siêu tốc +2
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 48 48"
          fill="none"
          className={`overflow-visible filter drop-shadow-[0_2px_6px_rgba(6,182,212,0.6)] ${className}`}
        >
          {/* Flame exhaust trails */}
          <path
            d="M 12 36 C 8 42, 6 46, 10 46 C 14 46, 16 40, 18 34 Z"
            fill="url(#flame-grad-1)"
          />
          <path
            d="M 15 35 C 13 41, 14 44, 18 43 C 20 40, 21 36, 21 32 Z"
            fill="#fef08a"
          />
          {/* Rocket body */}
          <path
            d="M 38 10 C 26 12, 18 20, 16 32 L 26 36 C 36 30, 40 20, 38 10 Z"
            fill="url(#rocket-body)"
            stroke="#38bdf8"
            strokeWidth="1.5"
          />
          {/* Wings */}
          <path d="M 17 28 L 8 32 L 14 36 Z" fill="#0284c7" />
          <path d="M 28 17 L 32 8 L 36 14 Z" fill="#0284c7" />
          {/* Porthole */}
          <circle cx="28" cy="22" r="4" fill="#0f172a" stroke="#38bdf8" strokeWidth="1.5" />
          <circle cx="27" cy="21" r="1.5" fill="#ffffff" />
          <defs>
            <linearGradient id="rocket-body" x1="16" y1="12" x2="38" y2="36" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#38bdf8" />
              <stop offset="50%" stopColor="#0284c7" />
              <stop offset="100%" stopColor="#0369a1" />
            </linearGradient>
            <linearGradient id="flame-grad-1" x1="10" y1="34" x2="14" y2="46" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#ef4444" />
            </linearGradient>
          </defs>
        </svg>
      );

    case "TRAP": // 💥 Bẫy sụt hố / Bom chông -2
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 48 48"
          fill="none"
          className={`overflow-visible filter drop-shadow-[0_2px_6px_rgba(239,68,68,0.6)] ${className}`}
        >
          {/* Hazard spikes */}
          <path
            d="M 24 4 L 28 16 L 40 10 L 34 22 L 46 26 L 34 32 L 40 42 L 28 36 L 24 46 L 20 36 L 8 42 L 14 32 L 2 26 L 14 22 L 8 10 L 20 16 Z"
            fill="url(#trap-burst)"
            stroke="#fca5a5"
            strokeWidth="1"
          />
          {/* Danger core */}
          <circle cx="24" cy="26" r="11" fill="#7f1d1d" stroke="#f87171" strokeWidth="2" />
          {/* Skull / Danger Exclamation */}
          <path
            d="M 24 19 L 24 28 M 24 32 L 24 33.5"
            stroke="#ffffff"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <defs>
            <radialGradient id="trap-burst" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#f87171" />
              <stop offset="60%" stopColor="#dc2626" />
              <stop offset="100%" stopColor="#991b1b" />
            </radialGradient>
          </defs>
        </svg>
      );

    case "SHIELD": // 🛡️ Khiên hoàng kim
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 48 48"
          fill="none"
          className={`overflow-visible filter drop-shadow-[0_2px_6px_rgba(59,130,246,0.6)] ${className}`}
        >
          {/* Outer shield rim */}
          <path
            d="M 24 5 C 34 7, 40 10, 40 16 C 40 32, 32 40, 24 45 C 16 40, 8 32, 8 16 C 8 10, 14 7, 24 5 Z"
            fill="url(#shield-grad)"
            stroke="#93c5fd"
            strokeWidth="2"
          />
          {/* Inner embossed crest */}
          <path
            d="M 24 10 C 31 11, 35 14, 35 18 C 35 29, 29 35, 24 39 C 19 35, 13 29, 13 18 C 13 14, 17 11, 24 10 Z"
            fill="#1e3a8a"
            stroke="#60a5fa"
            strokeWidth="1.5"
          />
          {/* Centered star emblem */}
          <polygon
            points="24,15 26.5,21 33,21.5 28,26 29.5,32 24,28.5 18.5,32 20,26 15,21.5 21.5,21"
            fill="#facc15"
            stroke="#ca8a04"
            strokeWidth="1"
          />
          <defs>
            <linearGradient id="shield-grad" x1="8" y1="5" x2="40" y2="45" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#60a5fa" />
              <stop offset="50%" stopColor="#2563eb" />
              <stop offset="100%" stopColor="#1d4ed8" />
            </linearGradient>
          </defs>
        </svg>
      );

    case "SWAP": // 🔀 Cổng dịch chuyển thời không
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 48 48"
          fill="none"
          className={`overflow-visible filter drop-shadow-[0_2px_6px_rgba(168,85,247,0.6)] ${className}`}
        >
          {/* Spiral vortex rings */}
          <ellipse cx="24" cy="24" rx="18" ry="10" stroke="#c084fc" strokeWidth="2" transform="rotate(-30 24 24)" />
          <ellipse cx="24" cy="24" rx="13" ry="7" stroke="#a855f7" strokeWidth="2.5" transform="rotate(30 24 24)" />
          {/* Glowing portal center */}
          <circle cx="24" cy="24" r="6" fill="#f3e8ff" />
          {/* Arrows */}
          <path
            d="M 12 18 L 10 12 L 16 12 M 36 30 L 38 36 L 32 36"
            stroke="#e9d5ff"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );

    case "EXTRA_ROLL": // 🎲 x2 Cơ hội gieo xúc xắc
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 48 48"
          fill="none"
          className={`overflow-visible filter drop-shadow-[0_2px_6px_rgba(16,185,129,0.7)] ${className}`}
        >
          {/* Back Dice */}
          <rect
            x="18"
            y="6"
            width="22"
            height="22"
            rx="5"
            fill="#059669"
            stroke="#6ee7b7"
            strokeWidth="1.5"
            transform="rotate(12 29 17)"
          />
          {/* Front Dice */}
          <rect
            x="8"
            y="16"
            width="24"
            height="24"
            rx="5"
            fill="url(#dice-grad)"
            stroke="#a7f3d0"
            strokeWidth="2"
          />
          {/* Pips on front dice (number 5 pattern) */}
          <circle cx="14" cy="22" r="2.2" fill="#ffffff" />
          <circle cx="26" cy="22" r="2.2" fill="#ffffff" />
          <circle cx="20" cy="28" r="2.2" fill="#ffffff" />
          <circle cx="14" cy="34" r="2.2" fill="#ffffff" />
          <circle cx="26" cy="34" r="2.2" fill="#ffffff" />
          {/* Golden Badge x2 */}
          <rect x="24" y="2" width="22" height="13" rx="4" fill="#f59e0b" stroke="#fde047" strokeWidth="1" />
          <text x="35" y="11" textAnchor="middle" fill="#000000" fontSize="9" fontWeight="900" fontFamily="sans-serif">
            x2
          </text>
          <defs>
            <linearGradient id="dice-grad" x1="8" y1="16" x2="32" y2="40" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#10b981" />
              <stop offset="100%" stopColor="#047857" />
            </linearGradient>
          </defs>
        </svg>
      );

    case "FINISH": // 🏁 Cúp vàng vạch đích
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 48 48"
          fill="none"
          className={`overflow-visible filter drop-shadow-[0_2px_8px_rgba(234,179,8,0.8)] ${className}`}
        >
          {/* Trophy bowl */}
          <path
            d="M 14 10 L 34 10 C 34 23, 29 27, 24 28 C 19 27, 14 23, 14 10 Z"
            fill="url(#gold-grad)"
            stroke="#fef08a"
            strokeWidth="1.5"
          />
          {/* Handles */}
          <path
            d="M 14 13 C 8 13, 8 20, 15 22 M 34 13 C 40 13, 40 20, 33 22"
            stroke="#fde047"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          {/* Stem & base */}
          <path d="M 22 28 L 26 28 L 26 35 L 22 35 Z" fill="#ca8a04" />
          <rect x="16" y="35" width="16" height="6" rx="2" fill="#a16207" stroke="#fef08a" strokeWidth="1" />
          {/* Star on bowl */}
          <polygon
            points="24,14 25.5,18 29.5,18.5 26.5,21.5 27.5,25.5 24,23 20.5,25.5 21.5,21.5 18.5,18.5 22.5,18"
            fill="#ffffff"
          />
          <defs>
            <linearGradient id="gold-grad" x1="14" y1="10" x2="34" y2="28" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#fef08a" />
              <stop offset="40%" stopColor="#eab308" />
              <stop offset="100%" stopColor="#ca8a04" />
            </linearGradient>
          </defs>
        </svg>
      );

    default: // ⚪ Ô thường (Đá phiến tròn dập nổi 3D)
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 48 48"
          fill="none"
          className={`overflow-visible opacity-90 ${className}`}
        >
          {/* Outer stone stepping rim */}
          <ellipse cx="24" cy="24" rx="19" ry="16" fill="#1e2038" stroke="#475569" strokeWidth="1.5" />
          <ellipse cx="24" cy="22" rx="16" ry="13" fill="#282a47" />
          <ellipse cx="24" cy="20" rx="12" ry="9" stroke="#64748b" strokeWidth="1" strokeDasharray="3 3" opacity="0.6" />
          {/* Specular dot */}
          <circle cx="18" cy="17" r="1.5" fill="#94a3b8" opacity="0.8" />
        </svg>
      );
  }
}
