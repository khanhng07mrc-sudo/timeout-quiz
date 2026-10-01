"use client";

import React from "react";
import { GameMode } from "@/types";

interface Props {
  mode: GameMode | string;
  className?: string;
  size?: number;
}

export default function GameModeIcon({ mode, className = "w-8 h-8", size }: Props) {
  const sizeStyle = size ? { width: size, height: size } : undefined;
  const upperMode = (mode || "CLASSIC").toUpperCase();

  switch (upperMode) {
    case "CLASSIC":
      return (
        <svg
          viewBox="0 0 64 64"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={className}
          style={sizeStyle}
        >
          <defs>
            <linearGradient id="gmi_classic_bg" x1="6" y1="6" x2="58" y2="58" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#8b5cf6" />
              <stop offset="100%" stopColor="#4f46e5" />
            </linearGradient>
            <linearGradient id="gmi_classic_accent" x1="18" y1="18" x2="46" y2="46" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#c084fc" />
              <stop offset="100%" stopColor="#818cf8" />
            </linearGradient>
            <filter id="gmi_classic_sh" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="#7c3aed" floodOpacity="0.45" />
            </filter>
          </defs>
          <rect x="4" y="4" width="56" height="56" rx="16" fill="url(#gmi_classic_bg)" filter="url(#gmi_classic_sh)" />
          <rect x="4" y="4" width="56" height="56" rx="16" stroke="#ffffff" strokeOpacity="0.2" strokeWidth="1.5" />
          <path d="M16 26C16 21 21 18 26 18H38C43 18 48 21 48 26V37C48 43 43 47 38 45L34 43.5H30L26 45C21 47 16 43 16 37V26Z" fill="#181935" stroke="url(#gmi_classic_accent)" strokeWidth="2" />
          <path d="M22 28V36M18 32H26" stroke="#e0e7ff" strokeWidth="2.8" strokeLinecap="round" />
          <circle cx="39" cy="28.5" r="2" fill="#38bdf8" />
          <circle cx="43.5" cy="32" r="2" fill="#facc15" />
          <circle cx="39" cy="35.5" r="2" fill="#4ade80" />
          <circle cx="34.5" cy="32" r="2" fill="#f87171" />
          <path d="M49 11L50.5 14.5L54 16L50.5 17.5L49 21L47.5 17.5L44 16L47.5 14.5L49 11Z" fill="#fef08a" />
        </svg>
      );

    case "BUZZ":
      return (
        <svg
          viewBox="0 0 64 64"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={className}
          style={sizeStyle}
        >
          <defs>
            <linearGradient id="gmi_buzz_bg" x1="6" y1="6" x2="58" y2="58" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#d97706" />
            </linearGradient>
            <linearGradient id="gmi_buzz_bolt" x1="24" y1="14" x2="40" y2="50" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="60%" stopColor="#fef08a" />
              <stop offset="100%" stopColor="#facc15" />
            </linearGradient>
            <filter id="gmi_buzz_sh" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="#f59e0b" floodOpacity="0.5" />
            </filter>
          </defs>
          <rect x="4" y="4" width="56" height="56" rx="16" fill="url(#gmi_buzz_bg)" filter="url(#gmi_buzz_sh)" />
          <rect x="4" y="4" width="56" height="56" rx="16" stroke="#ffffff" strokeOpacity="0.3" strokeWidth="1.5" />
          <circle cx="32" cy="32" r="22" fill="#78350f" fillOpacity="0.35" stroke="#fef08a" strokeOpacity="0.4" strokeWidth="2" />
          <circle cx="32" cy="32" r="17" fill="#b45309" />
          <path d="M12 24C10 28 10 36 12 40" stroke="#fef08a" strokeWidth="2" strokeLinecap="round" strokeDasharray="2 2" />
          <path d="M52 24C54 28 54 36 52 40" stroke="#fef08a" strokeWidth="2" strokeLinecap="round" strokeDasharray="2 2" />
          <path d="M35 15L23 33H33L29 49L43 29H33L35 15Z" fill="url(#gmi_buzz_bolt)" stroke="#78350f" strokeWidth="1.5" strokeLinejoin="round" />
          <circle cx="27" cy="20" r="2" fill="#ffffff" />
        </svg>
      );

    case "BOUNCEBACK":
      return (
        <svg
          viewBox="0 0 64 64"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={className}
          style={sizeStyle}
        >
          <defs>
            <linearGradient id="gmi_bounce_bg" x1="6" y1="6" x2="58" y2="58" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#06b6d4" />
              <stop offset="100%" stopColor="#0284c7" />
            </linearGradient>
            <linearGradient id="gmi_arrow_g1" x1="18" y1="18" x2="46" y2="30" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="100%" stopColor="#a5f3fc" />
            </linearGradient>
            <linearGradient id="gmi_arrow_g2" x1="46" y1="46" x2="18" y2="34" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="100%" stopColor="#67e8f9" />
            </linearGradient>
            <filter id="gmi_bounce_sh" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="#0891b2" floodOpacity="0.45" />
            </filter>
          </defs>
          <rect x="4" y="4" width="56" height="56" rx="16" fill="url(#gmi_bounce_bg)" filter="url(#gmi_bounce_sh)" />
          <rect x="4" y="4" width="56" height="56" rx="16" stroke="#ffffff" strokeOpacity="0.3" strokeWidth="1.5" />
          <circle cx="32" cy="32" r="7" fill="#0e7490" fillOpacity="0.5" stroke="#a5f3fc" strokeWidth="1.5" />
          <circle cx="32" cy="32" r="2.5" fill="#ffffff" />
          <path d="M21 27C23 20 30 16 38 17C43 18 47 21 49 26" stroke="url(#gmi_arrow_g1)" strokeWidth="4.5" strokeLinecap="round" />
          <path d="M50 18L51 27L42 26" fill="none" stroke="url(#gmi_arrow_g1)" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M43 37C41 44 34 48 26 47C21 46 17 43 15 38" stroke="url(#gmi_arrow_g2)" strokeWidth="4.5" strokeLinecap="round" />
          <path d="M14 46L13 37L22 38" fill="none" stroke="url(#gmi_arrow_g2)" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M32 14L33 11L34 14L37 15L34 16L33 19L32 16L29 15L32 14Z" fill="#fef08a" />
        </svg>
      );

    case "ELIMINATION":
      return (
        <svg
          viewBox="0 0 64 64"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={className}
          style={sizeStyle}
        >
          <defs>
            <linearGradient id="gmi_elim_bg" x1="6" y1="6" x2="58" y2="58" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#ef4444" />
              <stop offset="100%" stopColor="#991b1b" />
            </linearGradient>
            <linearGradient id="gmi_cross_g" x1="16" y1="16" x2="48" y2="48" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="100%" stopColor="#fecaca" />
            </linearGradient>
            <filter id="gmi_elim_sh" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="#dc2626" floodOpacity="0.5" />
            </filter>
          </defs>
          <rect x="4" y="4" width="56" height="56" rx="16" fill="url(#gmi_elim_bg)" filter="url(#gmi_elim_sh)" />
          <rect x="4" y="4" width="56" height="56" rx="16" stroke="#ffffff" strokeOpacity="0.3" strokeWidth="1.5" />
          <path d="M32 14L46 19V31C46 41 38 47 32 50C26 47 18 41 18 31V19L32 14Z" fill="#450a0a" fillOpacity="0.4" stroke="#fca5a5" strokeWidth="1.5" />
          <path d="M20 20L44 44" stroke="url(#gmi_cross_g)" strokeWidth="6.5" strokeLinecap="round" />
          <path d="M44 20L20 44" stroke="url(#gmi_cross_g)" strokeWidth="6.5" strokeLinecap="round" />
          <circle cx="32" cy="32" r="3" fill="#ef4444" stroke="#ffffff" strokeWidth="1" />
          <circle cx="48" cy="16" r="1.5" fill="#fef08a" />
          <circle cx="16" cy="46" r="1.5" fill="#fef08a" />
        </svg>
      );

    case "TOURNAMENT":
      return (
        <svg
          viewBox="0 0 64 64"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={className}
          style={sizeStyle}
        >
          <defs>
            <linearGradient id="gmi_tourn_bg" x1="6" y1="6" x2="58" y2="58" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#b45309" />
            </linearGradient>
            <linearGradient id="gmi_trophy_g" x1="20" y1="14" x2="44" y2="44" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="40%" stopColor="#fef08a" />
              <stop offset="100%" stopColor="#facc15" />
            </linearGradient>
            <filter id="gmi_tourn_sh" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="#f59e0b" floodOpacity="0.5" />
            </filter>
          </defs>
          <rect x="4" y="4" width="56" height="56" rx="16" fill="url(#gmi_tourn_bg)" filter="url(#gmi_tourn_sh)" />
          <rect x="4" y="4" width="56" height="56" rx="16" stroke="#ffffff" strokeOpacity="0.3" strokeWidth="1.5" />
          <path d="M22 17H42V29C42 35 37.5 39 32 39C26.5 39 22 35 22 29V17Z" fill="url(#gmi_trophy_g)" stroke="#78350f" strokeWidth="2" />
          <path d="M22 21H16C14 21 13 23 13 25C13 29 17 32 22 32" stroke="#fef08a" strokeWidth="2.5" strokeLinecap="round" fill="none" />
          <path d="M42 21H48C50 21 51 23 51 25C51 29 47 32 42 32" stroke="#fef08a" strokeWidth="2.5" strokeLinecap="round" fill="none" />
          <path d="M30 39H34V45H30V39Z" fill="#facc15" stroke="#78350f" strokeWidth="1.5" />
          <rect x="23" y="45" width="18" height="6" rx="2" fill="#78350f" stroke="#fef08a" strokeWidth="1.5" />
          <text x="32" y="28" fill="#78350f" fontSize="7" fontWeight="900" fontFamily="sans-serif" textAnchor="middle">1v1</text>
          <polygon points="32,10 34,14 38,14.5 35,17 36,21 32,19 28,21 29,17 26,14.5 30,14" fill="#ffffff" />
        </svg>
      );

    case "GRID_CARO":
      return (
        <svg
          viewBox="0 0 64 64"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={className}
          style={sizeStyle}
        >
          <defs>
            <linearGradient id="gmi_caro_bg" x1="6" y1="6" x2="58" y2="58" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#10b981" />
              <stop offset="100%" stopColor="#047857" />
            </linearGradient>
            <filter id="gmi_caro_sh" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="#10b981" floodOpacity="0.45" />
            </filter>
          </defs>
          <rect x="4" y="4" width="56" height="56" rx="16" fill="url(#gmi_caro_bg)" filter="url(#gmi_caro_sh)" />
          <rect x="4" y="4" width="56" height="56" rx="16" stroke="#ffffff" strokeOpacity="0.3" strokeWidth="1.5" />
          <rect x="15" y="15" width="34" height="34" rx="6" fill="#064e3b" fillOpacity="0.6" stroke="#a7f3d0" strokeWidth="2" />
          <line x1="26.3" y1="15" x2="26.3" y2="49" stroke="#6ee7b7" strokeWidth="1.8" strokeLinecap="round" />
          <line x1="37.6" y1="15" x2="37.6" y2="49" stroke="#6ee7b7" strokeWidth="1.8" strokeLinecap="round" />
          <line x1="15" y1="26.3" x2="49" y2="26.3" stroke="#6ee7b7" strokeWidth="1.8" strokeLinecap="round" />
          <line x1="15" y1="37.6" x2="49" y2="37.6" stroke="#6ee7b7" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M18 18L23 23M23 18L18 23" stroke="#38bdf8" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M29.5 29.5L34.5 34.5M34.5 29.5L29.5 34.5" stroke="#38bdf8" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M41 41L46 46M46 41L41 46" stroke="#38bdf8" strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="43.5" cy="20.5" r="3.2" stroke="#facc15" strokeWidth="2" fill="none" />
          <circle cx="20.5" cy="43.5" r="3.2" stroke="#facc15" strokeWidth="2" fill="none" />
          <line x1="16" y1="16" x2="48" y2="48" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeDasharray="3 2" />
        </svg>
      );

    case "DICE_RACE":
      return (
        <svg
          viewBox="0 0 64 64"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={className}
          style={sizeStyle}
        >
          <defs>
            <linearGradient id="gmi_dice_bg" x1="6" y1="6" x2="58" y2="58" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#6366f1" />
              <stop offset="100%" stopColor="#3730a3" />
            </linearGradient>
            <linearGradient id="gmi_die_t" x1="18" y1="14" x2="38" y2="28" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="100%" stopColor="#e0e7ff" />
            </linearGradient>
            <linearGradient id="gmi_die_l" x1="16" y1="28" x2="32" y2="48" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#c7d2fe" />
              <stop offset="100%" stopColor="#818cf8" />
            </linearGradient>
            <linearGradient id="gmi_die_r" x1="32" y1="28" x2="48" y2="48" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#a5b4fc" />
              <stop offset="100%" stopColor="#6366f1" />
            </linearGradient>
            <filter id="gmi_dice_sh" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="#4f46e5" floodOpacity="0.5" />
            </filter>
          </defs>
          <rect x="4" y="4" width="56" height="56" rx="16" fill="url(#gmi_dice_bg)" filter="url(#gmi_dice_sh)" />
          <rect x="4" y="4" width="56" height="56" rx="16" stroke="#ffffff" strokeOpacity="0.3" strokeWidth="1.5" />
          <path d="M10 20L18 20" stroke="#a5b4fc" strokeWidth="2" strokeLinecap="round" />
          <path d="M8 26L16 26" stroke="#c7d2fe" strokeWidth="2" strokeLinecap="round" />
          <path d="M11 32L17 32" stroke="#818cf8" strokeWidth="2" strokeLinecap="round" />
          <path d="M32 14L46 21L32 28L18 21L32 14Z" fill="url(#gmi_die_t)" stroke="#312e81" strokeWidth="1.2" strokeLinejoin="round" />
          <path d="M18 21L32 28V46L18 39V21Z" fill="url(#gmi_die_l)" stroke="#312e81" strokeWidth="1.2" strokeLinejoin="round" />
          <path d="M32 28L46 21V39L32 46V28Z" fill="url(#gmi_die_r)" stroke="#312e81" strokeWidth="1.2" strokeLinejoin="round" />
          <circle cx="32" cy="21" r="2.2" fill="#ef4444" />
          <circle cx="23" cy="28" r="1.8" fill="#1e1b4b" />
          <circle cx="25" cy="33.5" r="1.8" fill="#1e1b4b" />
          <circle cx="27" cy="39" r="1.8" fill="#1e1b4b" />
          <circle cx="37" cy="30" r="1.8" fill="#ffffff" />
          <circle cx="41" cy="28" r="1.8" fill="#ffffff" />
          <circle cx="37" cy="40" r="1.8" fill="#ffffff" />
          <circle cx="41" cy="38" r="1.8" fill="#ffffff" />
          <path d="M47 11V21M47 11H55L53 14L55 17H47" stroke="#facc15" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );

    case "WAGER":
      return (
        <svg
          viewBox="0 0 64 64"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={className}
          style={sizeStyle}
        >
          <defs>
            <linearGradient id="gmi_wager_bg" x1="6" y1="6" x2="58" y2="58" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#f97316" />
              <stop offset="100%" stopColor="#9a3412" />
            </linearGradient>
            <linearGradient id="gmi_pouch_g" x1="18" y1="20" x2="46" y2="50" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#fef08a" />
              <stop offset="40%" stopColor="#facc15" />
              <stop offset="100%" stopColor="#ca8a04" />
            </linearGradient>
            <filter id="gmi_wager_sh" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="#ea580c" floodOpacity="0.5" />
            </filter>
          </defs>
          <rect x="4" y="4" width="56" height="56" rx="16" fill="url(#gmi_wager_bg)" filter="url(#gmi_wager_sh)" />
          <rect x="4" y="4" width="56" height="56" rx="16" stroke="#ffffff" strokeOpacity="0.3" strokeWidth="1.5" />
          <path d="M26 18C28 15 36 15 38 18L35 22H29L26 18Z" fill="#78350f" stroke="#fef08a" strokeWidth="1.5" />
          <ellipse cx="32" cy="22" rx="6" ry="2" fill="#ca8a04" stroke="#fef08a" strokeWidth="1" />
          <path d="M29 22C24 23 16 28 17 38C18 47 24 50 32 50C40 50 46 47 47 38C48 28 40 23 35 22H29Z" fill="url(#gmi_pouch_g)" stroke="#78350f" strokeWidth="2" />
          <circle cx="32" cy="37" r="7" fill="#78350f" fillOpacity="0.3" stroke="#ffffff" strokeWidth="1.5" />
          <text x="32" y="41.5" fill="#ffffff" fontSize="12" fontWeight="900" fontFamily="sans-serif" textAnchor="middle">$</text>
          <ellipse cx="45" cy="45" rx="7" ry="3.5" fill="#38bdf8" stroke="#ffffff" strokeWidth="1" />
          <ellipse cx="45" cy="42" rx="7" ry="3.5" fill="#ef4444" stroke="#ffffff" strokeWidth="1" />
          <ellipse cx="45" cy="39" rx="7" ry="3.5" fill="#facc15" stroke="#ffffff" strokeWidth="1" />
          <path d="M15 15L16.5 19L20.5 20.5L16.5 22L15 26L13.5 22L9.5 20.5L13.5 19L15 15Z" fill="#ffffff" />
        </svg>
      );

    default:
      return (
        <div className={`rounded-xl bg-purple-600/30 border border-purple-400 flex items-center justify-center font-bold text-white ${className}`}>
          ⚡
        </div>
      );
  }
}
