"use client";

import React from "react";

export interface HopeStarBadgeProps {
  /** Size in pixels (width and height). Default is 68. */
  size?: number;
  /** Custom CSS classes for container. */
  className?: string;
  /** If true, renders the pre-rendered GIF file instead of live SVG. Default false. */
  useGif?: boolean;
  /** Whether the star is active and animating. Default true. */
  active?: boolean;
}

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * HOPE STAR BADGE (NGÔI SAO HY VỌNG)
 * ─────────────────────────────────────────────────────────────────────────────
 * Olympia 26 Về Đích Golden Hope Star with:
 * 1. Center 3D metallic golden 5-point star with radial core glow.
 * 2. 10 radial crystal gold particles orbiting and floating outward.
 * 3. 1.5s repeating wave: Star border scales 1x -> 2x, passing through an
 *    edge-blurred feathered mask where it dissolves and disappears.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export function HopeStarBadge({
  size = 68,
  className = "",
  useGif = false,
  active = true,
}: HopeStarBadgeProps) {
  if (!active) return null;

  if (useGif) {
    return (
      <div
        className={`relative inline-flex items-center justify-center select-none pointer-events-none drop-shadow-[0_4px_16px_rgba(245,158,11,0.6)] ${className}`}
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

  // 10 radial particles positioned at angles around 360 deg
  const particles = [
    { angle: 0, delay: "0s", duration: "1.4s", dist: 38, r: 2.2 },
    { angle: 36, delay: "0.25s", duration: "1.6s", dist: 42, r: 1.8 },
    { angle: 72, delay: "0.5s", duration: "1.3s", dist: 36, r: 2.4 },
    { angle: 108, delay: "0.75s", duration: "1.5s", dist: 44, r: 2.0 },
    { angle: 144, delay: "0.1s", duration: "1.7s", dist: 40, r: 1.6 },
    { angle: 180, delay: "0.35s", duration: "1.4s", dist: 39, r: 2.2 },
    { angle: 216, delay: "0.6s", duration: "1.5s", dist: 43, r: 1.9 },
    { angle: 252, delay: "0.85s", duration: "1.3s", dist: 37, r: 2.3 },
    { angle: 288, delay: "0.2s", duration: "1.6s", dist: 41, r: 1.7 },
    { angle: 324, delay: "0.45s", duration: "1.5s", dist: 45, r: 2.1 },
  ];

  // 5-point star base path centered at (50, 50), outer radius R=22, inner radius r=9.6
  // Points:
  // (50.00, 28.00), (55.64, 42.23), (70.92, 43.20), (59.20, 53.07), (62.94, 67.80)
  // (50.00, 59.60), (37.06, 67.80), (40.80, 53.07), (29.08, 43.20), (44.36, 42.23)
  const starPath =
    "M 50.00 28.00 L 55.64 42.23 L 70.92 43.20 L 59.20 53.07 L 62.94 67.80 L 50.00 59.60 L 37.06 67.80 L 40.80 53.07 L 29.08 43.20 L 44.36 42.23 Z";

  return (
    <div
      className={`relative inline-flex items-center justify-center select-none pointer-events-none transition-transform duration-300 animate-fade-in ${className}`}
      style={{
        width: size,
        height: size,
        filter: "drop-shadow(0 0 16px rgba(245, 158, 11, 0.75)) drop-shadow(0 4px 12px rgba(0,0,0,0.85))",
      }}
      title="Ngôi sao hy vọng"
    >
      <svg
        viewBox="0 0 100 100"
        className="w-full h-full overflow-visible"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Edge Blur Mask: Center is white (visible), edge feathers to black between radius 36 and 48 */}
          <radialGradient id="hopeStarEdgeFade" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
            <stop offset="70%" stopColor="#ffffff" stopOpacity="1" />
            <stop offset="88%" stopColor="#ffffff" stopOpacity="0.5" />
            <stop offset="98%" stopColor="#000000" stopOpacity="0" />
            <stop offset="100%" stopColor="#000000" stopOpacity="0" />
          </radialGradient>

          <mask id="hopeStarMask">
            <rect x="0" y="0" width="100" height="100" fill="url(#hopeStarEdgeFade)" />
          </mask>

          {/* Central 3D Golden Star Gradient */}
          <linearGradient id="hopeStarGoldGrad" x1="20%" y1="10%" x2="80%" y2="90%">
            <stop offset="0%" stopColor="#fffbeb" />
            <stop offset="25%" stopColor="#fef08a" />
            <stop offset="55%" stopColor="#f59e0b" />
            <stop offset="85%" stopColor="#d97706" />
            <stop offset="100%" stopColor="#92400e" />
          </linearGradient>

          {/* High-luster bevel highlight */}
          <linearGradient id="hopeStarHighlight" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
            <stop offset="40%" stopColor="#fef9c3" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
          </linearGradient>

          {/* Golden Pulse Border Gradient */}
          <linearGradient id="hopeStarPulseGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="50%" stopColor="#fde047" />
            <stop offset="100%" stopColor="#f59e0b" />
          </linearGradient>

          {/* Center ambient glow */}
          <radialGradient id="hopeStarAura" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#fde047" stopOpacity="0.8" />
            <stop offset="40%" stopColor="#f59e0b" stopOpacity="0.45" />
            <stop offset="80%" stopColor="#d97706" stopOpacity="0.1" />
            <stop offset="100%" stopColor="#b45309" stopOpacity="0" />
          </radialGradient>

          {/* Star Border Scaling Filter with Blur for feathered dissipation */}
          <filter id="hopeStarBorderFeather" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="0.8" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        <style>{`
          @keyframes hopeStarPulseWave {
            0% {
              transform: scale(1.0);
              opacity: 0.95;
              stroke-width: 2.2px;
            }
            65% {
              opacity: 0.7;
              stroke-width: 1.8px;
            }
            85% {
              opacity: 0.35;
              stroke-width: 1.3px;
            }
            100% {
              transform: scale(2.05);
              opacity: 0;
              stroke-width: 0.8px;
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
            80% {
              opacity: 0.8;
            }
            100% {
              transform: translate(var(--tx), var(--ty)) scale(0.2);
              opacity: 0;
            }
          }

          @keyframes hopeStarCoreShimmer {
            0%, 100% {
              filter: brightness(1.0) drop-shadow(0 0 8px rgba(253, 224, 71, 0.7));
            }
            50% {
              filter: brightness(1.18) drop-shadow(0 0 16px rgba(251, 191, 36, 0.95));
            }
          }

          .hope-star-pulse-ring {
            transform-origin: 50px 50px;
            animation: hopeStarPulseWave 1.5s cubic-bezier(0.16, 0.85, 0.45, 1) infinite;
          }

          .hope-star-pulse-ring-lag {
            transform-origin: 50px 50px;
            animation: hopeStarPulseWave 1.5s cubic-bezier(0.16, 0.85, 0.45, 1) infinite;
            animation-delay: 0.75s;
          }

          .hope-star-core-group {
            animation: hopeStarCoreShimmer 2s ease-in-out infinite;
          }

          .hope-star-sparkle {
            animation: hopeStarParticleFly var(--p-dur) ease-out infinite;
            animation-delay: var(--p-delay);
          }
        `}</style>

        {/* 1. Ambient Golden Aura Behind Star */}
        <circle cx="50" cy="50" r="42" fill="url(#hopeStarAura)" />

        {/* 2. Expanding Border Wave (1.5s Loop, scales 1x -> 2x, masked by blurred edge fade) */}
        <g mask="url(#hopeStarMask)">
          {/* Main 1.5s expanding wave */}
          <path
            d={starPath}
            fill="none"
            stroke="url(#hopeStarPulseGrad)"
            strokeLinejoin="round"
            className="hope-star-pulse-ring"
            filter="url(#hopeStarBorderFeather)"
          />
          {/* Staggered secondary pulse for rich broadcast layered depth */}
          <path
            d={starPath}
            fill="none"
            stroke="url(#hopeStarPulseGrad)"
            strokeLinejoin="round"
            className="hope-star-pulse-ring-lag"
            filter="url(#hopeStarBorderFeather)"
          />
        </g>

        {/* 3. Radial Particle Sparks System */}
        <g className="hope-star-particles">
          {particles.map((p, idx) => {
            const rad = (p.angle * Math.PI) / 180;
            const tx = Math.cos(rad) * p.dist;
            const ty = Math.sin(rad) * p.dist;
            return (
              <circle
                key={idx}
                cx={50}
                cy={50}
                r={p.r}
                fill="#fef08a"
                className="hope-star-sparkle"
                style={
                  {
                    "--tx": `${tx.toFixed(1)}px`,
                    "--ty": `${ty.toFixed(1)}px`,
                    "--p-dur": p.duration,
                    "--p-delay": p.delay,
                    filter: "drop-shadow(0 0 3px #f59e0b)",
                  } as React.CSSProperties
                }
              />
            );
          })}
        </g>

        {/* 4. Central 3D Golden Star (Solid core with bevel and highlights) */}
        <g className="hope-star-core-group" transform-origin="50px 50px">
          {/* Star drop shadow */}
          <path
            d={starPath}
            fill="#451a03"
            transform="translate(0, 1.8)"
            opacity="0.65"
          />

          {/* Main Star Body */}
          <path
            d={starPath}
            fill="url(#hopeStarGoldGrad)"
            stroke="#fef08a"
            strokeWidth="1.2"
            strokeLinejoin="round"
          />

          {/* Star Top-Half Gloss Highlight */}
          <path
            d="M 50.00 28.00 L 55.64 42.23 L 70.92 43.20 L 59.20 53.07 L 50.00 50.00 L 40.80 53.07 L 29.08 43.20 L 44.36 42.23 Z"
            fill="url(#hopeStarHighlight)"
            opacity="0.85"
          />

          {/* Center Jewel Core */}
          <circle
            cx="50"
            cy="49"
            r="3.5"
            fill="#ffffff"
            style={{
              filter: "drop-shadow(0 0 5px #fef08a)",
            }}
          />
        </g>
      </svg>
    </div>
  );
}
