"use client";

import React from "react";

export interface HopeStarBadgeProps {
  /** Size in pixels (width and height). Default is 76. */
  size?: number;
  /** Custom CSS classes for container. */
  className?: string;
  /** If true, renders the pre-rendered high-res GIF file instead of live SVG. Default false. */
  useGif?: boolean;
  /** Whether the star is active and animating. Default true. */
  active?: boolean;
}

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * HOPE STAR BADGE (NGÔI SAO HY VỌNG) - BROADCAST HD
 * ─────────────────────────────────────────────────────────────────────────────
 * Olympia 26 Về Đích 3D Metallic Golden Hope Star with:
 * 1. 3D broadcast metallic golden 5-point star at center with specular bevels & flare.
 * 2. 14 golden circular particles radiating outward.
 * 3. 1.5s repeating wave: Star border scales 1.0x -> 2.0x, passing through an
 *    edge-blurred feathered mask where it smoothly dissipates and vanishes.
 * 4. 100% transparent clean background (no orange circular blobs).
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
        className={`relative inline-flex items-center justify-center select-none pointer-events-none drop-shadow-[0_4px_16px_rgba(245,158,11,0.5)] ${className}`}
        style={{ width: size, height: size }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/olympia/v3_assets/hope_star.gif"
          alt="Ngôi sao hy vọng"
          width={size}
          height={size}
          className="w-full h-full object-contain filter drop-shadow(0 2px 8px rgba(0,0,0,0.5))"
        />
      </div>
    );
  }

  // 14 radial particles around 360 degrees
  const particles = [
    { angle: 0, delay: "0s", duration: "1.4s", dist: 40, r: 2.2 },
    { angle: 26, delay: "0.2s", duration: "1.5s", dist: 44, r: 1.8 },
    { angle: 52, delay: "0.45s", duration: "1.3s", dist: 38, r: 2.3 },
    { angle: 78, delay: "0.7s", duration: "1.6s", dist: 42, r: 1.9 },
    { angle: 104, delay: "0.15s", duration: "1.4s", dist: 45, r: 2.0 },
    { angle: 130, delay: "0.35s", duration: "1.7s", dist: 39, r: 1.7 },
    { angle: 156, delay: "0.6s", duration: "1.3s", dist: 43, r: 2.2 },
    { angle: 180, delay: "0.85s", duration: "1.5s", dist: 41, r: 1.8 },
    { angle: 206, delay: "0.1s", duration: "1.4s", dist: 44, r: 2.1 },
    { angle: 232, delay: "0.3s", duration: "1.6s", dist: 37, r: 1.9 },
    { angle: 258, delay: "0.55s", duration: "1.3s", dist: 42, r: 2.4 },
    { angle: 284, delay: "0.75s", duration: "1.5s", dist: 46, r: 1.8 },
    { angle: 310, delay: "0.25s", duration: "1.4s", dist: 40, r: 2.2 },
    { angle: 336, delay: "0.5s", duration: "1.6s", dist: 43, r: 1.7 },
  ];

  // 5-point star path matching the core 3D star: cx=50, cy=49.6, R=14.5, r=6.0
  const starPath =
    "M 50.0 35.1 L 53.6 44.8 L 63.8 45.4 L 55.7 51.7 L 58.6 61.4 L 50.0 55.6 L 41.4 61.4 L 44.3 51.7 L 36.2 45.4 L 46.4 44.8 Z";

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
      <svg
        viewBox="0 0 100 100"
        className="w-full h-full overflow-visible"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Feathered Edge Blur Mask: 100% visible inside 70%, feathers to 0% at 94% */}
          <radialGradient id="hopeStarEdgeFade" cx="50%" cy="49.6%" r="50%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
            <stop offset="68%" stopColor="#ffffff" stopOpacity="1" />
            <stop offset="84%" stopColor="#ffffff" stopOpacity="0.5" />
            <stop offset="96%" stopColor="#000000" stopOpacity="0" />
            <stop offset="100%" stopColor="#000000" stopOpacity="0" />
          </radialGradient>

          <mask id="hopeStarMask">
            <rect x="0" y="0" width="100" height="100" fill="url(#hopeStarEdgeFade)" />
          </mask>

          {/* Golden Pulse Border Gradient */}
          <linearGradient id="hopeStarPulseGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="35%" stopColor="#fef08a" />
            <stop offset="70%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#d97706" />
          </linearGradient>

          {/* Star Border Scaling Filter with Blur for feathered dissipation */}
          <filter id="hopeStarBorderFeather" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="0.6" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        <style>{`
          @keyframes hopeStarPulseWave {
            0% {
              transform: scale(1.0);
              opacity: 0.95;
              stroke-width: 1.8px;
            }
            60% {
              opacity: 0.7;
              stroke-width: 1.4px;
            }
            85% {
              opacity: 0.35;
              stroke-width: 1.0px;
            }
            100% {
              transform: scale(2.05);
              opacity: 0;
              stroke-width: 0.6px;
            }
          }

          @keyframes hopeStarParticleFly {
            0% {
              transform: translate(0px, 0px) scale(0.6);
              opacity: 0;
            }
            20% {
              opacity: 1;
            }
            75% {
              opacity: 0.8;
            }
            100% {
              transform: translate(var(--tx), var(--ty)) scale(0.2);
              opacity: 0;
            }
          }

          @keyframes hopeStarCoreShimmer {
            0%, 100% {
              transform: scale(1.0);
              filter: brightness(1.0);
            }
            50% {
              transform: scale(1.03);
              filter: brightness(1.12);
            }
          }

          .hope-star-pulse-ring {
            transform-origin: 50px 49.6px;
            animation: hopeStarPulseWave 1.5s cubic-bezier(0.16, 0.85, 0.45, 1) infinite;
          }

          .hope-star-pulse-ring-lag {
            transform-origin: 50px 49.6px;
            animation: hopeStarPulseWave 1.5s cubic-bezier(0.16, 0.85, 0.45, 1) infinite;
            animation-delay: 0.75s;
          }

          .hope-star-core-group {
            transform-origin: 50px 49.6px;
            animation: hopeStarCoreShimmer 1.8s ease-in-out infinite;
          }

          .hope-star-sparkle {
            animation: hopeStarParticleFly var(--p-dur) ease-out infinite;
            animation-delay: var(--p-delay);
          }
        `}</style>

        {/* 1. Expanding Border Wave (1.5s Loop, scales 1.0x -> 2.0x, masked by blurred edge fade) */}
        <g mask="url(#hopeStarMask)">
          <path
            d={starPath}
            fill="none"
            stroke="url(#hopeStarPulseGrad)"
            strokeLinejoin="round"
            className="hope-star-pulse-ring"
            filter="url(#hopeStarBorderFeather)"
          />
          <path
            d={starPath}
            fill="none"
            stroke="url(#hopeStarPulseGrad)"
            strokeLinejoin="round"
            className="hope-star-pulse-ring-lag"
            filter="url(#hopeStarBorderFeather)"
          />
        </g>

        {/* 2. Radial Particle Sparks System (Pure glowing beads on transparent background) */}
        <g className="hope-star-particles">
          {particles.map((p, idx) => {
            const rad = (p.angle * Math.PI) / 180;
            const tx = Math.cos(rad) * p.dist;
            const ty = Math.sin(rad) * p.dist;
            return (
              <g key={idx}>
                {/* Golden halo bead */}
                <circle
                  cx={50}
                  cy={49.6}
                  r={p.r}
                  fill="#fde047"
                  className="hope-star-sparkle"
                  style={
                    {
                      "--tx": `${tx.toFixed(1)}px`,
                      "--ty": `${ty.toFixed(1)}px`,
                      "--p-dur": p.duration,
                      "--p-delay": p.delay,
                      filter: "drop-shadow(0 0 2px #f59e0b)",
                    } as React.CSSProperties
                  }
                />
                {/* Inner white sparkle */}
                <circle
                  cx={50}
                  cy={49.6}
                  r={p.r * 0.6}
                  fill="#ffffff"
                  className="hope-star-sparkle"
                  style={
                    {
                      "--tx": `${tx.toFixed(1)}px`,
                      "--ty": `${ty.toFixed(1)}px`,
                      "--p-dur": p.duration,
                      "--p-delay": p.delay,
                    } as React.CSSProperties
                  }
                />
              </g>
            );
          })}
        </g>

        {/* 3. Central 4K Broadcast Metallic Golden 3D Star */}
        <g className="hope-star-core-group">
          <image
            href="/olympia/v3_assets/hope_star_core.png"
            x="28.5"
            y="28.1"
            width="43"
            height="43"
            preserveAspectRatio="xMidYMid meet"
          />
        </g>
      </svg>
    </div>
  );
}
