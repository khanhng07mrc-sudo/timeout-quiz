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
        <linearGradient id="bl_bg" x1="4" y1="4" x2="60" y2="60" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#1e1b4b" />
          <stop offset="50%" stopColor="#2e1065" />
          <stop offset="100%" stopColor="#0f172a" />
        </linearGradient>
        <linearGradient id="bl_rim" x1="6" y1="6" x2="58" y2="58" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#c084fc" />
          <stop offset="50%" stopColor="#818cf8" />
          <stop offset="100%" stopColor="#06b6d4" />
        </linearGradient>
        <linearGradient id="bl_bolt" x1="22" y1="14" x2="42" y2="50" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="35%" stopColor="#38bdf8" />
          <stop offset="70%" stopColor="#fbbf24" />
          <stop offset="100%" stopColor="#f59e0b" />
        </linearGradient>
        <filter id="bl_glow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#8b5cf6" floodOpacity="0.5" />
        </filter>
      </defs>

      {/* Squircle base & glow */}
      <rect x="4" y="4" width="56" height="56" rx="16" fill="url(#bl_bg)" filter="url(#bl_glow)" />
      <rect x="4" y="4" width="56" height="56" rx="16" stroke="url(#bl_rim)" strokeWidth="1.8" />

      {/* Stopwatch Winder Top */}
      <rect x="28" y="7" width="8" height="3.5" rx="1.5" fill="#facc15" stroke="#78350f" strokeWidth="0.8" />
      <path d="M26 10.5H38" stroke="#38bdf8" strokeWidth="1" strokeLinecap="round" />

      {/* Dial Ring */}
      <circle cx="32" cy="34" r="20" stroke="#06b6d4" strokeWidth="2.5" strokeOpacity="0.85" strokeDasharray="3 2" />
      <circle cx="32" cy="34" r="23" stroke="#818cf8" strokeOpacity="0.3" strokeWidth="1" />

      {/* Markers */}
      <line x1="32" y1="16" x2="32" y2="19" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />
      <line x1="50" y1="34" x2="47" y2="34" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" />
      <line x1="32" y1="52" x2="32" y2="49" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />
      <line x1="14" y1="34" x2="17" y2="34" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" />

      {/* Lightning Bolt */}
      <path
        d="M36 17L22 35H32L28 51L44 31H34L36 17Z"
        fill="url(#bl_bolt)"
        stroke="#0f172a"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      <circle cx="48" cy="18" r="1.5" fill="#ffffff" />
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
          <span className="text-white">Timeout</span>
          <span className="ml-1 bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
            Quiz
          </span>
        </div>
        {subText && (
          <span className="text-[10px] font-extrabold tracking-widest text-cyan-300 uppercase mt-0.5 opacity-90">
            {subText}
          </span>
        )}
        {variant === "full" && !subText && (
          <span className="text-[9px] font-extrabold tracking-wider text-purple-300 uppercase mt-0.5 opacity-80">
            Realtime Quiz Arena
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
