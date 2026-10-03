"use client";

import React from "react";
import Link from "next/link";

interface Props {
  variant?: "full" | "compact" | "icon";
  size?: "sm" | "md" | "lg" | "xl";
  subText?: string;
  className?: string;
  href?: string;
}

export default function BrandLogo({
  variant = "compact",
  size = "md",
  subText,
  className = "",
  href,
}: Props) {
  const iconSizes = {
    sm: "w-7 h-7",
    md: "w-9 h-9",
    lg: "w-12 h-12",
    xl: "w-16 h-16",
  };

  const textSizes = {
    sm: "text-base",
    md: "text-xl",
    lg: "text-2xl",
    xl: "text-4xl sm:text-5xl",
  };

  const iconElement = (
    <svg
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`${iconSizes[size]} shrink-0 drop-shadow`}
    >
      <defs>
        {/* Q Ring Gradient: Seamless Neon Purple to Electric Cyan */}
        <linearGradient id="qz_ico_ring" x1="44" y1="32" x2="156" y2="144" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#d8b4fe" />
          <stop offset="16%" stopColor="#c084fc" />
          <stop offset="42%" stopColor="#a855f7" />
          <stop offset="68%" stopColor="#38bdf8" />
          <stop offset="88%" stopColor="#06b6d4" />
          <stop offset="100%" stopColor="#00f2fe" />
        </linearGradient>

        {/* Q Tail Gradient: 3D Volumetric Cyan Depth */}
        <linearGradient id="qz_ico_tail" x1="100" y1="92" x2="160" y2="148" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#7dd3fc" />
          <stop offset="30%" stopColor="#38bdf8" />
          <stop offset="70%" stopColor="#06b6d4" />
          <stop offset="100%" stopColor="#0284c7" />
        </linearGradient>

        {/* Q Tail Highlight Gradient */}
        <linearGradient id="qz_ico_hl" x1="108" y1="92" x2="146" y2="126" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
          <stop offset="45%" stopColor="#e0f2fe" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.1" />
        </linearGradient>

        {/* Horizon Arch Gradient */}
        <linearGradient id="qz_ico_arch" x1="22" y1="162" x2="178" y2="162" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#c084fc" stopOpacity="0.95" />
          <stop offset="25%" stopColor="#a855f7" />
          <stop offset="65%" stopColor="#38bdf8" />
          <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.95" />
        </linearGradient>

        {/* Soft Neon Glow Filter */}
        <filter id="qz_ico_glow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="3" result="glow1" />
          <feGaussianBlur stdDeviation="6.5" result="glow2" />
          <feMerge>
            <feMergeNode in="glow2" />
            <feMergeNode in="glow1" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        {/* Ambient Bloom */}
        <filter id="qz_ico_bloom" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="15" result="bloom" />
        </filter>
      </defs>

      {/* Ambient Bloom */}
      <circle cx="100" cy="88" r="62" fill="url(#qz_ico_ring)" opacity="0.25" filter="url(#qz_ico_bloom)" />

      {/* Arched Horizon Below Q (100% Unclipped, Smooth Neon Arch) */}
      <g filter="url(#qz_ico_glow)">
        <path
          d="M 22 173 C 44 155, 72 149, 100 149 C 128 149, 156 155, 178 173 C 156 160, 128 155, 100 155 C 72 155, 44 160, 22 173 Z"
          fill="url(#qz_ico_arch)"
          opacity="0.95"
        />
        <path
          d="M 32 172 C 52 157, 74 152, 100 152 C 126 152, 148 157, 168 172"
          stroke="#ffffff"
          strokeWidth="1.5"
          strokeLinecap="round"
          opacity="0.75"
        />
      </g>

      {/* Q Ring + 3D Tail (360° Circular Donut, Zero Flat Cuts) */}
      <g filter="url(#qz_ico_glow)">
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M 100 32 C 69.07 32 44 57.07 44 88 C 44 118.93 69.07 144 100 144 C 130.93 144 156 118.93 156 88 C 156 57.07 130.93 32 100 32 Z M 100 58 C 116.57 58 130 71.43 130 88 C 130 104.57 116.57 118 100 118 C 83.43 118 70 104.57 70 88 C 70 71.43 83.43 58 100 58 Z"
          fill="url(#qz_ico_ring)"
        />
        {/* Translucent cyan sweep along bottom-left inside rim */}
        <path
          d="M 106 98 C 88 102, 72 109, 64 122 C 73 124, 89 120, 106 111 Z"
          fill="#38bdf8"
          opacity="0.65"
        />
        {/* 3D Capsule Tail */}
        <path
          d="M 114.46 88.13 A 13 13 0 0 0 97.54 107.87 L 137.91 145.77 A 15.5 15.5 0 0 0 158.09 122.23 Z"
          fill="url(#qz_ico_tail)"
        />
        {/* Volumetric Highlight */}
        <path
          d="M 113.0 91.5 A 5 5 0 0 0 106.0 99.5 L 139.0 128.5 A 6.5 6.5 0 0 0 147.0 119.5 Z"
          fill="url(#qz_ico_hl)"
        />
      </g>
    </svg>
  );

  if (variant === "icon") {
    if (href) {
      return (
        <Link href={href} className={`inline-flex items-center ${className}`}>
          {iconElement}
        </Link>
      );
    }
    return <div className={`inline-flex items-center ${className}`}>{iconElement}</div>;
  }

  const content = (
    <div className={`inline-flex items-center gap-2.5 ${className}`}>
      {iconElement}
      <div className="flex flex-col">
        <div className={`font-black tracking-tight flex items-center leading-none ${textSizes[size]}`}>
          <span className="text-white">Quiz</span>
          <span className="ml-0.5 bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent">
            orra
          </span>
        </div>
        {subText && (
          <span className="text-[10px] font-extrabold tracking-widest text-cyan-300 uppercase mt-0.5 opacity-90">
            {subText}
          </span>
        )}
        {variant === "full" && !subText && (
          <span className="text-[9px] font-extrabold tracking-wider text-purple-300 uppercase mt-0.5 opacity-80">
            REALTIME MULTIPLAYER ARENA
          </span>
        )}
      </div>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="hover:opacity-95 transition-opacity inline-flex">
        {content}
      </Link>
    );
  }

  return content;
}
