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
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`${iconSizes[size]} shrink-0 drop-shadow`}
    >
      <defs>
        {/* Q Ring Gradient: Neon Violet to Electric Cyan */}
        <linearGradient id="qz_ui_qgrad" x1="12" y1="8" x2="48" y2="44" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#c084fc" />
          <stop offset="35%" stopColor="#8b5cf6" />
          <stop offset="70%" stopColor="#38bdf8" />
          <stop offset="100%" stopColor="#06b6d4" />
        </linearGradient>

        {/* Swoosh Gradient */}
        <linearGradient id="qz_ui_swoosh" x1="6" y1="54" x2="54" y2="54" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#a855f7" />
          <stop offset="50%" stopColor="#38bdf8" />
          <stop offset="100%" stopColor="#06b6d4" />
        </linearGradient>

        {/* Soft Neon Bloom Filter */}
        <filter id="qz_ui_glow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        {/* Ambient Halo Behind */}
        <filter id="qz_ui_halo" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="4" result="halo" />
        </filter>
      </defs>

      {/* Ambient background bloom */}
      <circle cx="30" cy="25" r="16" fill="url(#qz_ui_qgrad)" opacity="0.22" filter="url(#qz_ui_halo)" />

      {/* Neon Q Letterform */}
      <g filter="url(#qz_ui_glow)">
        {/* Main Ring */}
        <circle
          cx="30"
          cy="25"
          r="14"
          stroke="url(#qz_ui_qgrad)"
          strokeWidth="6.8"
          strokeLinecap="round"
        />

        {/* Q Tail: Curves from inside the hole out to bottom-right */}
        <path
          d="M 31 27 Q 35 34 47 42"
          stroke="url(#qz_ui_qgrad)"
          strokeWidth="6.8"
          strokeLinecap="round"
        />
      </g>

      {/* Arched Swoosh Curve Underneath Q */}
      <path
        d="M 6 55 Q 30 47 54 55"
        stroke="url(#qz_ui_swoosh)"
        strokeWidth="2.6"
        strokeLinecap="round"
        opacity="0.95"
      />
      <path
        d="M 10 56.5 Q 30 50 50 56.5"
        stroke="url(#qz_ui_swoosh)"
        strokeWidth="1.2"
        strokeLinecap="round"
        opacity="0.45"
      />
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
            INTELLECTUAL ARENA
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
