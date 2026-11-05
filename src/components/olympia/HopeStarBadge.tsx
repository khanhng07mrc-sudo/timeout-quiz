"use client";

import React from "react";

export interface HopeStarBadgeProps {
  /** Size in pixels (width and height). Default is 76. */
  size?: number;
  /** Custom CSS classes for container. */
  className?: string;
  /** If true, forces rendering image tag instead of video. Default false. */
  useGif?: boolean;
  /** Whether the star is active and animating. Default true. */
  active?: boolean;
}

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * HOPE STAR BADGE (NGÔI SAO HY VỌNG) - BROADCAST TRANSPARENT WEBM / WEBP
 * ─────────────────────────────────────────────────────────────────────────────
 * Olympia 26 Về Đích Golden Hope Star with:
 * 1. Broadcast-grade 480x480 transparent VP9 WebM video (30fps, 100% alpha transparency).
 * 2. 3D metallic golden 5-point star at center with specular highlights & diamond flare.
 * 3. 14 golden circular particles radiating outward.
 * 4. 1.5s repeating wave: Star border scales 1.0x -> 2.0x, passing through an
 *    edge-blurred feathered mask where it smoothly dissipates and vanishes.
 * 5. Fallback to lossless 32-bit animated WebP for universal browser compatibility.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export function HopeStarBadge({
  size = 76,
  className = "",
  useGif = false,
  active = true,
}: HopeStarBadgeProps) {
  if (!active) return null;

  if (useGif) {
    return (
      <div
        className={`relative inline-flex items-center justify-center select-none pointer-events-none ${className}`}
        style={{
          width: size,
          height: size,
          filter: "drop-shadow(0 0 12px rgba(253, 224, 71, 0.6)) drop-shadow(0 4px 10px rgba(0,0,0,0.7))",
        }}
        title="Ngôi sao hy vọng"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/olympia/v3_assets/hope_star.webp"
          alt="Ngôi sao hy vọng"
          width={size}
          height={size}
          className="w-full h-full object-contain pointer-events-none select-none"
        />
      </div>
    );
  }

  return (
    <div
      className={`relative inline-flex items-center justify-center select-none pointer-events-none transition-transform duration-300 animate-fade-in ${className}`}
      style={{
        width: size,
        height: size,
        filter: "drop-shadow(0 0 12px rgba(253, 224, 71, 0.6)) drop-shadow(0 4px 10px rgba(0,0,0,0.7))",
      }}
      title="Ngôi sao hy vọng"
    >
      <video
        autoPlay
        loop
        muted
        playsInline
        className="w-full h-full object-contain pointer-events-none select-none"
      >
        <source src="/olympia/v3_assets/hope_star.webm" type="video/webm" />
        {/* Fallback to Lossless 32-bit Animated WebP */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/olympia/v3_assets/hope_star.webp"
          alt="Ngôi sao hy vọng"
          width={size}
          height={size}
          className="w-full h-full object-contain pointer-events-none select-none"
        />
      </video>
    </div>
  );
}
