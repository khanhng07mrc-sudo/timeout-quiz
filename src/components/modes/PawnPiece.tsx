"use client";

import React from "react";

interface PawnPieceProps {
  color: string;
  name?: string;
  size?: "xs" | "sm" | "md" | "lg";
  hasShield?: boolean;
  isCurrentTurn?: boolean;
  isHopping?: boolean;
  className?: string;
  rank?: number;
}

/**
 * 3D Pawn Piece component modeled after classic board game pawns (Ludo / Cờ cá ngựa)
 * Features:
 * - Spherical head with radial highlight reflection
 * - Tapered neck collar
 * - Flared skirt/cone body with rich gradient shading
 * - Broad weighted pedestal base
 * - Soft elliptical cast shadow
 * - Optional shield badge, team initial, or rank medal
 */
export default function PawnPiece({
  color,
  name,
  size = "md",
  hasShield = false,
  isCurrentTurn = false,
  isHopping = false,
  className = "",
  rank,
}: PawnPieceProps) {
  // Dimensions per size variant
  const sizeConfig = {
    xs: { width: 14, height: 20, labelSize: "text-[6px]", shadowH: 2 },
    sm: { width: 18, height: 26, labelSize: "text-[7px]", shadowH: 3 },
    md: { width: 22, height: 32, labelSize: "text-[8px]", shadowH: 4 },
    lg: { width: 32, height: 46, labelSize: "text-xs", shadowH: 5 },
  }[size] || { width: 18, height: 26, labelSize: "text-[7px]", shadowH: 3 };

  const initial = name ? name.trim().charAt(0).toUpperCase() : "";

  // Unique SVG gradient ID based on color to prevent collision
  const safeId = color.replace(/[^a-zA-Z0-9]/g, "");
  const gradBodyId = `pawn-grad-body-${safeId}`;
  const gradHeadId = `pawn-grad-head-${safeId}`;
  const gradBaseId = `pawn-grad-base-${safeId}`;

  return (
    <div
      className={`relative inline-flex flex-col items-center justify-end select-none transition-transform duration-300 ${
        isHopping
          ? "animate-pawn-hop filter drop-shadow-[0_0_12px_rgba(250,204,21,0.9)]"
          : isCurrentTurn
          ? "animate-bounce filter drop-shadow-[0_0_8px_rgba(250,204,21,0.7)]"
          : ""
      } ${className}`}
      style={{
        width: `${sizeConfig.width}px`,
        height: `${sizeConfig.height + sizeConfig.shadowH}px`,
      }}
      title={`${name || "Quân cờ"}${hasShield ? " (🛡️ Đang có Khiên)" : ""}${rank ? ` - Hạng ${rank}` : ""}`}
    >
      {/* 3D SVG Pawn */}
      <svg
        viewBox="0 0 100 145"
        className="w-full h-auto overflow-visible"
        style={{ filter: "drop-shadow(0 4px 6px rgba(0,0,0,0.45))" }}
      >
        <defs>
          {/* Radial highlight for spherical head */}
          <radialGradient id={gradHeadId} cx="35%" cy="30%" r="65%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
            <stop offset="25%" stopColor={color} stopOpacity="0.9" />
            <stop offset="70%" stopColor={color} />
            <stop offset="100%" stopColor="#0a0a14" stopOpacity="0.85" />
          </radialGradient>

          {/* Linear gradient for tapered cone body */}
          <linearGradient id={gradBodyId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.6" />
            <stop offset="30%" stopColor={color} />
            <stop offset="85%" stopColor={color} />
            <stop offset="100%" stopColor="#000000" stopOpacity="0.75" />
          </linearGradient>

          {/* Linear gradient for base collar & ring */}
          <linearGradient id={gradBaseId} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.5" />
            <stop offset="40%" stopColor={color} />
            <stop offset="100%" stopColor="#050510" stopOpacity="0.9" />
          </linearGradient>

          {/* Cast shadow under base */}
          <radialGradient id={`shadow-${safeId}`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(0,0,0,0.6)" />
            <stop offset="60%" stopColor="rgba(0,0,0,0.3)" />
            <stop offset="100%" stopColor="rgba(0,0,0,0)" />
          </radialGradient>
        </defs>

        {/* Cast shadow ellipse on ground */}
        <ellipse cx="50" cy="140" rx="42" ry="8" fill={`url(#shadow-${safeId})`} />

        {/* 1. Base pedestal ring */}
        <ellipse cx="50" cy="132" rx="38" ry="10" fill={`url(#${gradBaseId})`} />
        <ellipse cx="50" cy="128" rx="36" ry="8" fill={`url(#${gradBodyId})`} />

        {/* 2. Intermediate stepped base collar */}
        <path
          d="M 22 128 C 22 122, 28 116, 32 114 L 68 114 C 72 116, 78 122, 78 128 Z"
          fill={`url(#${gradBaseId})`}
        />

        {/* 3. Flared Cone Body */}
        <path
          d="M 33 114 C 36 82, 38 68, 42 54 L 58 54 C 62 68, 64 82, 67 114 Z"
          fill={`url(#${gradBodyId})`}
        />

        {/* 3D Glossy Body Highlights */}
        <path
          d="M 44 56 C 42 70, 39 88, 37 110"
          stroke="#ffffff"
          strokeWidth="3"
          strokeLinecap="round"
          opacity="0.55"
        />

        {/* 4. Neck collar ring */}
        <ellipse cx="50" cy="53" rx="14" ry="4" fill={`url(#${gradBaseId})`} />
        <ellipse cx="50" cy="51" rx="13" ry="3.5" fill="#ffffff" opacity="0.4" />

        {/* 5. Spherical Head (Quả cầu đầu quân cờ) */}
        <circle cx="50" cy="30" r="24" fill={`url(#${gradHeadId})`} />

        {/* Spherical Specular Glint */}
        <ellipse cx="42" cy="22" rx="7" ry="5" transform="rotate(-30 42 22)" fill="#ffffff" opacity="0.85" />
        <circle cx="37" cy="18" r="2.5" fill="#ffffff" opacity="0.95" />

        {/* Initial letter of team on pawn chest */}
        {initial && (
          <text
            x="50"
            y="94"
            textAnchor="middle"
            fill="#ffffff"
            fontSize="22"
            fontWeight="900"
            fontFamily="system-ui, sans-serif"
            style={{
              textShadow: "0 2px 4px rgba(0,0,0,0.8), 0 0 2px rgba(0,0,0,0.9)",
              filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.9))",
            }}
          >
            {initial}
          </text>
        )}
      </svg>

      {/* Shield Badge */}
      {hasShield && (
        <div
          className="absolute -top-1 -right-1 z-20 flex items-center justify-center filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] animate-pulse"
          style={{ width: `${size === "xs" ? 11 : size === "sm" ? 14 : size === "md" ? 18 : 22}px` }}
        >
          <span className={size === "xs" ? "text-[8px]" : "text-xs"}>🛡️</span>
        </div>
      )}

      {/* Rank Medal if finished */}
      {rank && rank <= 3 && (
        <div className="absolute -top-2 left-1/2 -translate-x-1/2 z-20 filter drop-shadow">
          <span className={size === "xs" ? "text-[9px]" : "text-xs"}>
            {rank === 1 ? "🥇" : rank === 2 ? "🥈" : "🥉"}
          </span>
        </div>
      )}
    </div>
  );
}
