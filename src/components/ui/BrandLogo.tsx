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
        <linearGradient id="bc_ui_bg" x1="6" y1="4" x2="58" y2="60" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#1e1b4b" stopOpacity="0.95" />
          <stop offset="50%" stopColor="#2e1065" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#0f172a" stopOpacity="0.95" />
        </linearGradient>
        <linearGradient id="bc_ui_rim" x1="4" y1="4" x2="60" y2="60" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#818cf8" />
          <stop offset="50%" stopColor="#a855f7" />
          <stop offset="100%" stopColor="#06b6d4" />
        </linearGradient>
        <linearGradient id="bc_ui_brain_left" x1="12" y1="16" x2="30" y2="44" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#c084fc" />
          <stop offset="100%" stopColor="#6366f1" />
        </linearGradient>
        <linearGradient id="bc_ui_brain_right" x1="34" y1="16" x2="52" y2="44" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#38bdf8" />
          <stop offset="100%" stopColor="#0891b2" />
        </linearGradient>
        <linearGradient id="bc_ui_bolt" x1="26" y1="12" x2="38" y2="52" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="45%" stopColor="#38bdf8" />
          <stop offset="100%" stopColor="#06b6d4" />
        </linearGradient>
      </defs>

      {/* Outer Shield Crest */}
      <path
        d="M32 4L57 14V36C57 48.5 46.5 57 32 61C17.5 57 7 48.5 7 36V14L32 4Z"
        fill="url(#bc_ui_bg)"
        stroke="url(#bc_ui_rim)"
        strokeWidth="2.2"
      />

      {/* Inner Inset Line */}
      <path
        d="M32 9L52 17V35C52 45 43.5 52 32 55.5C20.5 52 12 45 12 35V17L32 9Z"
        stroke="#4f46e5"
        strokeOpacity="0.4"
        strokeWidth="1"
      />

      {/* Brain Left Hemisphere */}
      <path
        d="M28 19C22 19 17 23 17 29C17 33.5 19.5 37 23 39L28 41V19Z"
        fill="url(#bc_ui_brain_left)"
        stroke="#1e1b4b"
        strokeWidth="0.8"
      />
      <path d="M23 23L28 28M19 31L26 34" stroke="#ffffff" strokeOpacity="0.35" strokeWidth="1" strokeLinecap="round" />

      {/* Brain Right Hemisphere */}
      <path
        d="M36 19C42 19 47 23 47 29C47 33.5 44.5 37 41 39L36 41V19Z"
        fill="url(#bc_ui_brain_right)"
        stroke="#1e1b4b"
        strokeWidth="0.8"
      />
      <path d="M41 23L36 28M45 31L38 34" stroke="#ffffff" strokeOpacity="0.35" strokeWidth="1" strokeLinecap="round" />

      {/* Central Lightning Clash Bolt */}
      <path
        d="M37 13L22 31H33L26 51L43 29H30L37 13Z"
        fill="url(#bc_ui_bolt)"
        stroke="#0f172a"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />

      <circle cx="32" cy="30" r="1.8" fill="#ffffff" />
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
          <span className="text-white">Brain</span>
          <span className="ml-0.5 bg-gradient-to-r from-cyan-400 to-teal-300 bg-clip-text text-transparent">
            Clash
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
