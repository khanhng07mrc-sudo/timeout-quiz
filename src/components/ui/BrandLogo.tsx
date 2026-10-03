"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";

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

  const logoHeights = {
    sm: "h-7",
    md: "h-9",
    lg: "h-12",
    xl: "h-16 sm:h-20",
  };

  // Crisp Vector Icon (Zero Blur Filter, 100% Sharp Vectors)
  const iconElement = (
    <svg
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`${iconSizes[size]} shrink-0 drop-shadow`}
    >
      <defs>
        {/* Q Ring Gradient */}
        <linearGradient id="qz_ico_ring" x1="44" y1="32" x2="156" y2="144" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#d8b4fe" />
          <stop offset="16%" stopColor="#c084fc" />
          <stop offset="42%" stopColor="#a855f7" />
          <stop offset="68%" stopColor="#38bdf8" />
          <stop offset="88%" stopColor="#06b6d4" />
          <stop offset="100%" stopColor="#00f2fe" />
        </linearGradient>

        {/* Q Tail Gradient */}
        <linearGradient id="qz_ico_tail" x1="100" y1="92" x2="162" y2="150" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#7dd3fc" />
          <stop offset="30%" stopColor="#38bdf8" />
          <stop offset="70%" stopColor="#06b6d4" />
          <stop offset="100%" stopColor="#0284c7" />
        </linearGradient>

        {/* Q Tail Highlight */}
        <linearGradient id="qz_ico_hl" x1="108" y1="92" x2="148" y2="132" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
          <stop offset="45%" stopColor="#e0f2fe" stopOpacity="0.65" />
          <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.1" />
        </linearGradient>

        {/* Arch Ribbon Gradient */}
        <linearGradient id="qz_ico_arch" x1="24" y1="162" x2="176" y2="162" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#c084fc" />
          <stop offset="25%" stopColor="#a855f7" />
          <stop offset="65%" stopColor="#38bdf8" />
          <stop offset="100%" stopColor="#00f2fe" />
        </linearGradient>

        {/* Arch Core Gradient */}
        <linearGradient id="qz_ico_arch_core" x1="45" y1="162" x2="155" y2="162" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.2" />
          <stop offset="30%" stopColor="#ffffff" stopOpacity="0.95" />
          <stop offset="70%" stopColor="#ffffff" stopOpacity="0.95" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0.2" />
        </linearGradient>
      </defs>

      {/* Precision Arch Below Q */}
      <g id="sq-arch">
        <path d="M 24 172 Q 100 154 176 172 Q 100 160 24 172 Z" fill="url(#qz_ico_arch)" />
        <path d="M 45 171 Q 100 156 155 171 Q 100 158 45 171 Z" fill="url(#qz_ico_arch_core)" />
      </g>

      {/* Crisp Vector Q (No blur halo) */}
      <g id="sq-Q">
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M 100 32 C 69.07 32 44 57.07 44 88 C 44 118.93 69.07 144 100 144 C 130.93 144 156 118.93 156 88 C 156 57.07 130.93 32 100 32 Z M 100 58 C 116.57 58 130 71.43 130 88 C 130 104.57 116.57 118 100 118 C 83.43 118 70 104.57 70 88 C 70 71.43 83.43 58 100 58 Z"
          transform="translate(0, 3.5)"
          fill="#2e1065"
        />
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M 100 32 C 69.07 32 44 57.07 44 88 C 44 118.93 69.07 144 100 144 C 130.93 144 156 118.93 156 88 C 156 57.07 130.93 32 100 32 Z M 100 58 C 116.57 58 130 71.43 130 88 C 130 104.57 116.57 118 100 118 C 83.43 118 70 104.57 70 88 C 70 71.43 83.43 58 100 58 Z"
          fill="url(#qz_ico_ring)"
        />
        <path d="M 116.32 87.24 A 13 13 0 0 0 98.68 105.76 L 138.61 146.93 A 15 15 0 0 0 159.39 125.07 Z" transform="translate(0, 3.5)" fill="#0f172a" opacity="0.5" />
        <path d="M 116.32 87.24 A 13 13 0 0 0 98.68 105.76 L 138.61 146.93 A 15 15 0 0 0 159.39 125.07 Z" fill="url(#qz_ico_tail)" />
        <path d="M 114.5 90.5 A 5 5 0 0 0 106.5 98.5 L 141.0 134.0 A 6 6 0 0 0 150.5 124.5 Z" fill="url(#qz_ico_hl)" />
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

  // Official Crisp Horizontal Brand Logo Lockup
  const content = (
    <div className={`inline-flex flex-col items-center ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/brand/quizorra_logo.svg"
        alt="Quizorra Logo"
        className={`${logoHeights[size]} w-auto object-contain select-none`}
      />
      {subText && (
        <span className="text-[10px] sm:text-xs font-extrabold tracking-widest text-cyan-300 uppercase mt-1.5 opacity-90">
          {subText}
        </span>
      )}
      {variant === "full" && !subText && (
        <span className="text-[9px] sm:text-[10px] font-extrabold tracking-wider text-purple-300 uppercase mt-1 opacity-80">
          REALTIME MULTIPLAYER ARENA
        </span>
      )}
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
