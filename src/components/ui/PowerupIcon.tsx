import React from "react";
import { CardType } from "@/types";

interface Props {
  type: CardType | string;
  className?: string;
  size?: number;
}

export default function PowerupIcon({ type, className = "w-8 h-8", size }: Props) {
  const sizeStyle = size ? { width: size, height: size } : undefined;

  switch (type) {
    case "FIFTY_FIFTY":
      return (
        <svg
          viewBox="0 0 64 64"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={className}
          style={sizeStyle}
        >
          <defs>
            <linearGradient id="ff_grad" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#1d4ed8" />
            </linearGradient>
            <filter id="ff_glow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#3b82f6" floodOpacity="0.5" />
            </filter>
          </defs>
          <rect x="6" y="8" width="52" height="48" rx="12" fill="url(#ff_grad)" filter="url(#ff_glow)" />
          <path d="M14 48L50 16" stroke="#ffffff" strokeWidth="3.5" strokeLinecap="round" strokeDasharray="3 3" />
          <text x="18" y="32" fill="#ffffff" fontSize="16" fontWeight="900" fontFamily="sans-serif">50</text>
          <text x="32" y="48" fill="#bfdbfe" fontSize="16" fontWeight="900" fontFamily="sans-serif">50</text>
          <circle cx="48" cy="18" r="3.5" fill="#60a5fa" stroke="#ffffff" strokeWidth="1.5" />
        </svg>
      );

    case "DOUBLE":
      return (
        <svg
          viewBox="0 0 64 64"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={className}
          style={sizeStyle}
        >
          <defs>
            <linearGradient id="db_grad" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#b45309" />
            </linearGradient>
            <filter id="db_glow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#f59e0b" floodOpacity="0.6" />
            </filter>
          </defs>
          <rect x="6" y="8" width="52" height="48" rx="12" fill="url(#db_grad)" filter="url(#db_glow)" />
          <path d="M16 20L28 34M28 20L16 34" stroke="#ffffff" strokeWidth="4.5" strokeLinecap="round" />
          <path d="M34 21C34 18 36.5 16 40.5 16C44.5 16 47 18.5 47 21.5C47 26 40 31.5 34 38H48" stroke="#ffffff" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M16 46L24 42L22 50L30 46" stroke="#fef08a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );

    case "SCORE_X2":
      return (
        <svg
          viewBox="0 0 64 64"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={className}
          style={sizeStyle}
        >
          <defs>
            <linearGradient id="sx_grad" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#10b981" />
              <stop offset="100%" stopColor="#047857" />
            </linearGradient>
            <filter id="sx_glow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#10b981" floodOpacity="0.6" />
            </filter>
          </defs>
          <rect x="6" y="8" width="52" height="48" rx="12" fill="url(#sx_grad)" filter="url(#sx_glow)" />
          <polygon
            points="32,15 36.5,24.5 47,26 39.5,33.5 41.5,44 32,39 22.5,44 24.5,33.5 17,26 27.5,24.5"
            fill="#fef08a"
            stroke="#ffffff"
            strokeWidth="2"
          />
          <text x="32" y="53" fill="#ffffff" fontSize="11" fontWeight="900" fontFamily="sans-serif" textAnchor="middle">
            x1.5
          </text>
        </svg>
      );

    case "SHIELD":
      return (
        <svg
          viewBox="0 0 64 64"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={className}
          style={sizeStyle}
        >
          <defs>
            <linearGradient id="sh_grad" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#06b6d4" />
              <stop offset="100%" stopColor="#0e7490" />
            </linearGradient>
            <filter id="sh_glow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#06b6d4" floodOpacity="0.6" />
            </filter>
          </defs>
          <rect x="6" y="8" width="52" height="48" rx="12" fill="url(#sh_grad)" filter="url(#sh_glow)" />
          <path
            d="M32 15C22 18 18 20 18 30C18 42 24 49 32 52C40 49 46 42 46 30C46 20 42 18 32 15Z"
            fill="#164e63"
            stroke="#ffffff"
            strokeWidth="3"
            strokeLinejoin="round"
          />
          <path d="M32 21V46M23 32H41" stroke="#a5f3fc" strokeWidth="3.5" strokeLinecap="round" />
          <circle cx="32" cy="32" r="3.5" fill="#ffffff" />
        </svg>
      );

    case "FREEZE":
      return (
        <svg
          viewBox="0 0 64 64"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={className}
          style={sizeStyle}
        >
          <defs>
            <linearGradient id="fz_grad" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#38bdf8" />
              <stop offset="100%" stopColor="#0284c7" />
            </linearGradient>
            <filter id="fz_glow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#38bdf8" floodOpacity="0.6" />
            </filter>
          </defs>
          <rect x="6" y="8" width="52" height="48" rx="12" fill="url(#fz_grad)" filter="url(#fz_glow)" />
          <path d="M32 15V49M15 32H49M20 20L44 44M20 44L44 20" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" />
          <path d="M28 18L32 15L36 18M28 46L32 49L36 46M18 28L15 32L18 36M46 28L49 32L46 36" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="32" cy="32" r="5" fill="#e0f2fe" stroke="#0284c7" strokeWidth="2" />
        </svg>
      );

    case "ATTACK":
      return (
        <svg
          viewBox="0 0 64 64"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={className}
          style={sizeStyle}
        >
          <defs>
            <linearGradient id="at_grad" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#ef4444" />
              <stop offset="100%" stopColor="#b91c1c" />
            </linearGradient>
            <filter id="at_glow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#ef4444" floodOpacity="0.6" />
            </filter>
          </defs>
          <rect x="6" y="8" width="52" height="48" rx="12" fill="url(#at_grad)" filter="url(#at_glow)" />
          <path d="M16 16L40 40M40 40L48 48M40 40L44 36M40 40L36 44" stroke="#ffffff" strokeWidth="3.5" strokeLinecap="round" />
          <path d="M48 16L24 40M24 40L16 48M24 40L20 36M24 40L28 44" stroke="#ffffff" strokeWidth="3.5" strokeLinecap="round" />
          <path d="M15 15L23 18L18 23Z" fill="#fecaca" />
          <path d="M49 15L41 18L46 23Z" fill="#fecaca" />
          <circle cx="32" cy="28" r="4" fill="#fbbf24" stroke="#ffffff" strokeWidth="1.5" />
        </svg>
      );

    case "SKIP":
      return (
        <svg
          viewBox="0 0 64 64"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={className}
          style={sizeStyle}
        >
          <defs>
            <linearGradient id="sk_grad" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#8b5cf6" />
              <stop offset="100%" stopColor="#5b21b6" />
            </linearGradient>
            <filter id="sk_glow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#8b5cf6" floodOpacity="0.6" />
            </filter>
          </defs>
          <rect x="6" y="8" width="52" height="48" rx="12" fill="url(#sk_grad)" filter="url(#sk_glow)" />
          <path d="M42 22C39.5 19 35.8 17 31.5 17C23.5 17 17 23.5 17 31.5M22 42C24.5 45 28.2 47 32.5 47C40.5 47 47 40.5 47 32.5" stroke="#ffffff" strokeWidth="4" strokeLinecap="round" />
          <polyline points="46,17 43,23 37,20" fill="#ffffff" stroke="#ffffff" strokeWidth="2" strokeLinejoin="round" />
          <polyline points="18,47 21,41 27,44" fill="#ffffff" stroke="#ffffff" strokeWidth="2" strokeLinejoin="round" />
          <text x="32" y="37" fill="#f5d0fe" fontSize="15" fontWeight="900" fontFamily="sans-serif" textAnchor="middle">?</text>
        </svg>
      );

    case "TIME_PLUS":
      return (
        <svg
          viewBox="0 0 64 64"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={className}
          style={sizeStyle}
        >
          <defs>
            <linearGradient id="tp_grad" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#ec4899" />
              <stop offset="100%" stopColor="#9d174d" />
            </linearGradient>
            <filter id="tp_glow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#ec4899" floodOpacity="0.6" />
            </filter>
          </defs>
          <rect x="6" y="8" width="52" height="48" rx="12" fill="url(#tp_grad)" filter="url(#tp_glow)" />
          <circle cx="32" cy="33" r="16" stroke="#ffffff" strokeWidth="3.5" />
          <path d="M29 13H35M32 13V17" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" />
          <path d="M32 25V33L37 36" stroke="#fbcfe8" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M44 19L47 16" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" />
          <text x="32" y="53" fill="#fdf2f8" fontSize="10" fontWeight="900" fontFamily="sans-serif" textAnchor="middle">+15s</text>
        </svg>
      );

    case "STEAL":
      return (
        <svg
          viewBox="0 0 64 64"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={className}
          style={sizeStyle}
        >
          <defs>
            <linearGradient id="st_grad" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#eab308" />
              <stop offset="100%" stopColor="#854d0e" />
            </linearGradient>
            <filter id="st_glow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#eab308" floodOpacity="0.6" />
            </filter>
          </defs>
          <rect x="6" y="8" width="52" height="48" rx="12" fill="url(#st_grad)" filter="url(#st_glow)" />
          <circle cx="28" cy="27" r="12" fill="#fef08a" stroke="#ffffff" strokeWidth="2.5" />
          <text x="28" y="33" fill="#854d0e" fontSize="15" fontWeight="900" fontFamily="sans-serif" textAnchor="middle">$</text>
          <path d="M44 48C41 43 38 41 33 40C29 39 25 41 23 44L28 47L35 45L40 51L44 48Z" fill="#1f2937" stroke="#ffffff" strokeWidth="1.5" />
          <path d="M34 21L46 17M38 26L48 23M38 33L49 31" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );

    case "PENALTY":
      return (
        <svg
          viewBox="0 0 64 64"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={className}
          style={sizeStyle}
        >
          <defs>
            <linearGradient id="pn_grad" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#dc2626" />
              <stop offset="100%" stopColor="#7f1d1d" />
            </linearGradient>
            <filter id="pn_glow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#dc2626" floodOpacity="0.6" />
            </filter>
          </defs>
          <rect x="6" y="8" width="52" height="48" rx="12" fill="url(#pn_grad)" filter="url(#pn_glow)" />
          <polygon
            points="32,15 35,24 44,19 41,28 50,29 42,35 48,42 39,41 38,50 32,43 26,50 25,41 16,42 22,35 14,29 23,28 20,19 29,24"
            fill="#fef08a"
            stroke="#ffffff"
            strokeWidth="2"
          />
          <path d="M26 29L38 41M38 29L26 41" stroke="#dc2626" strokeWidth="3.5" strokeLinecap="round" />
        </svg>
      );

    default:
      return (
        <svg
          viewBox="0 0 64 64"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={className}
          style={sizeStyle}
        >
          <rect x="6" y="8" width="52" height="48" rx="12" fill="#6366f1" />
          <text x="32" y="38" fill="#ffffff" fontSize="20" fontWeight="900" fontFamily="sans-serif" textAnchor="middle">⚡</text>
        </svg>
      );
  }
}
